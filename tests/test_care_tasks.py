"""Care tasks, rest periods, care event links, history rotation, and migration."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import pytest
from custom_components.smart_plants.care import (
    CARE_TASK_TYPE_KINDS,
    MAX_CARE_EVENTS,
    CareEvent,
    kind_for_task_type,
    rotate_for_append,
    rotation_candidate,
    task_matches_event,
)
from custom_components.smart_plants.const import STORAGE_KEY, STORAGE_MINOR_VERSION
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsRevisionConflictError,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import (
    CARE_TASK_INSTRUCTIONS_MAX_LEN,
    CareTask,
    IntervalSchedule,
    PlantRecord,
    RestPeriod,
    YearlySchedule,
    parse_care_schedule,
)
from custom_components.smart_plants.providers.openplantbook import (
    API_CARE_TEXT_MAX,
)
from custom_components.smart_plants.storage import (
    SmartPlantsInvalidStorageError,
    SmartPlantsStore,
)
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

TASK_ID = "0f8fad5bd9cb469fa16570867728950e"
OTHER_TASK_ID = "7c9e6679742540de944be07fc1f90ae7"
INTERVAL = {
    "kind": "interval",
    "every": 4,
    "unit": "weeks",
    "growing_season_only": True,
}
YEARLY = {"kind": "yearly", "start_month": 3, "end_month": 4}
NOW = "2026-06-15T12:00:00Z"


def _task_row(**changes: Any) -> dict[str, Any]:
    return {
        "id": TASK_ID,
        "type": "fertilize",
        "name": None,
        "schedule": dict(INTERVAL),
        "instructions": None,
        "baseline_done_on": None,
        "last_done_at": None,
        "last_skipped_on": None,
        "created_on": "2026-01-01",
        **changes,
    }


def _event_row(**changes: Any) -> dict[str, Any]:
    kind = changes.get("kind", "watering")
    payloads: dict[str, dict[str, Any]] = {
        "watering": {"note": None},
        "fertilizing": {"product": None, "amount": None, "unit": None, "note": None},
        "pruning": {"part": None, "note": None},
        "repotting": {"container": None, "medium": None, "note": None},
        "note": {"text": "Observed"},
        "task": {"note": None},
    }
    occurred = changes.get("occurred_at", "2026-01-01T10:00:00Z")
    return {
        "schema_version": 2,
        "id": str(uuid4()),
        "kind": kind,
        "provenance": "manual",
        "task_id": None,
        "occurred_at": occurred,
        "local_date": occurred[:10],
        "created_at": "2026-02-01T00:00:00Z",
        "updated_at": "2026-02-01T00:00:00Z",
        "payload": payloads[kind],
        **changes,
    }


def _event(**changes: Any) -> CareEvent:
    return CareEvent.from_storage(_event_row(**changes))


def _task(**changes: Any) -> CareTask:
    return CareTask.from_storage(_task_row(**changes))


def _plant_row(**changes: Any) -> dict[str, Any]:
    row = PlantRecord(
        id="p", revision=1, name="Aloe", created_at="2026-01-01T00:00:00Z"
    ).as_storage()
    row.update(changes)
    return row


# --- Models ---------------------------------------------------------------


def test_rest_period_and_yearly_ranges_allow_wrap_and_single_month() -> None:
    for start, end in ((11, 2), (3, 3), (1, 12), (12, 1)):
        if (start, end) != (1, 12):
            period = RestPeriod.from_storage({"start_month": start, "end_month": end})
            assert period.as_storage() == {"start_month": start, "end_month": end}
        yearly = YearlySchedule.from_storage(
            {"kind": "yearly", "start_month": start, "end_month": end}
        )
        assert yearly.kind == "yearly"
        assert parse_care_schedule(yearly.as_storage()) == yearly
    for invalid in (
        {"start_month": 0, "end_month": 2},
        {"start_month": 1, "end_month": 13},
        {"start_month": True, "end_month": 2},
        {"start_month": 1.0, "end_month": 2},
        {"start_month": 1},
        {"start_month": 1, "end_month": 2, "extra": 1},
        [1, 2],
    ):
        with pytest.raises(ValueError, match="rest period"):
            RestPeriod.from_storage(invalid)
    with pytest.raises(ValueError, match="yearly"):
        YearlySchedule.from_storage({"start_month": 3, "end_month": 4})


def test_rest_period_cannot_cover_the_whole_year() -> None:
    for start, end in ((1, 12), (3, 2), (12, 11)):
        with pytest.raises(ValueError, match="all 12 months"):
            RestPeriod.from_storage({"start_month": start, "end_month": end})
    assert RestPeriod.from_storage({"start_month": 2, "end_month": 12}) == RestPeriod(
        2, 12
    )
    assert RestPeriod.from_storage({"start_month": 3, "end_month": 1}) == RestPeriod(
        3, 1
    )
    with pytest.raises(ValueError, match="kind"):
        YearlySchedule.from_storage({**YEARLY, "kind": "interval"})


def test_interval_schedule_round_trip_and_bounds() -> None:
    schedule = IntervalSchedule.from_storage(INTERVAL)
    assert schedule.kind == "interval"
    assert schedule.as_storage() == INTERVAL
    assert parse_care_schedule(INTERVAL) == schedule
    for unit in ("days", "weeks", "months", "years"):
        assert IntervalSchedule.from_storage({**INTERVAL, "unit": unit}).unit == unit
    assert IntervalSchedule.from_storage({**INTERVAL, "every": 999}).every == 999
    for alteration in (
        {"every": 0},
        {"every": 1000},
        {"every": True},
        {"every": 2.0},
        {"unit": "hours"},
        {"growing_season_only": 1},
        {"kind": "yearly"},
        {"extra": 1},
    ):
        with pytest.raises(ValueError, match="interval"):
            IntervalSchedule.from_storage({**INTERVAL, **alteration})
    with pytest.raises(ValueError, match="kind"):
        parse_care_schedule({"kind": "weekly"})
    with pytest.raises(ValueError, match="kind"):
        parse_care_schedule(None)


def test_care_task_storage_is_strict() -> None:
    task = _task(
        name="Feed",
        instructions="Half strength",
        baseline_done_on="2026-01-01",
        last_done_at="2026-01-02T03:04:05Z",
        last_skipped_on="2026-01-03",
    )
    assert CareTask.from_storage(task.as_storage()) == task
    assert task.as_storage()["schedule"] == INTERVAL
    assert _task(type="custom", name="Mist", schedule=dict(YEARLY)).type == "custom"
    for alteration in (
        {"id": "not-a-task-id"},
        {"id": TASK_ID.upper()},
        {"id": "0f8fad5bd9cb169fa16570867728950e"},
        {"type": "water"},
        {"type": "custom", "name": None},
        {"name": ""},
        {"name": " Feed"},
        {"name": "x" * 61},
        {"instructions": "x" * (CARE_TASK_INSTRUCTIONS_MAX_LEN + 1)},
        {"instructions": " padded "},
        {"baseline_done_on": "2026-13-01"},
        {"baseline_done_on": "2026-01-01T00:00:00Z"},
        {"last_done_at": "2026-01-02T03:04:05+01:00"},
        {"last_skipped_on": "yesterday"},
        {"created_on": None},
        {"schedule": {"kind": "interval"}},
    ):
        with pytest.raises(ValueError, match=r"."):
            _task(**alteration)
    with pytest.raises(ValueError, match="fields"):
        CareTask.from_storage({**_task_row(), "extra": 1})
    assert _task(name="x" * 60, instructions="x" * 500).name == "x" * 60
    longest = "x" * CARE_TASK_INSTRUCTIONS_MAX_LEN
    assert _task(instructions=longest).instructions == longest


def test_instructions_fit_a_full_provider_care_note() -> None:
    # A species care note can be copied into a task's instructions unchanged.
    assert CARE_TASK_INSTRUCTIONS_MAX_LEN == API_CARE_TEXT_MAX == 4_000


def test_plant_record_care_task_rules_and_view() -> None:
    fertilize = _task_row()
    custom_a = _task_row(id=OTHER_TASK_ID, type="custom", name="Mist")
    custom_b = _task_row(id=uuid4().hex, type="custom", name="Rotate")
    plant = PlantRecord.from_storage(
        _plant_row(
            care_tasks=[fertilize, custom_a, custom_b],
            rest_period={"start_month": 11, "end_month": 2},
        ),
        require_roles=True,
    )
    assert [task.type for task in plant.care_tasks] == ["fertilize", "custom", "custom"]
    assert plant.rest_period == RestPeriod(11, 2)
    assert plant.care_task(OTHER_TASK_ID) == plant.care_tasks[1]
    view = plant.as_view()
    assert view["care_tasks"] == [fertilize, custom_a, custom_b]
    assert view["rest_period"] == {"start_month": 11, "end_month": 2}
    assert PlantRecord.from_storage(plant.as_storage(), require_roles=True) == plant

    with pytest.raises(ValueError, match="one care task of each type"):
        PlantRecord.from_storage(
            _plant_row(care_tasks=[fertilize, {**fertilize, "id": OTHER_TASK_ID}])
        )
    with pytest.raises(ValueError, match="duplicate care task id"):
        PlantRecord.from_storage(
            _plant_row(care_tasks=[custom_a, {**custom_a, "name": "Other"}])
        )
    too_many = [
        _task_row(id=uuid4().hex, type="custom", name=f"Task {index}")
        for index in range(21)
    ]
    with pytest.raises(ValueError, match="care_tasks"):
        PlantRecord.from_storage(_plant_row(care_tasks=too_many))
    with pytest.raises(ValueError, match="care_tasks"):
        PlantRecord.from_storage(_plant_row(care_tasks={}))
    with pytest.raises(ValueError, match="rest period"):
        PlantRecord.from_storage(_plant_row(rest_period={"start_month": 1}))
    for key in ("care_tasks", "rest_period"):
        row = _plant_row()
        del row[key]
        assert PlantRecord.from_storage(row).care_tasks == ()
        with pytest.raises(ValueError, match="care_tasks and rest_period"):
            PlantRecord.from_storage(row, require_roles=True)


# --- Care events ----------------------------------------------------------


def test_care_event_schema_two_fields() -> None:
    linked = _event(kind="task", task_id=TASK_ID, payload={"note": "Sprayed"})
    assert linked.task_id == TASK_ID
    assert linked.as_storage()["task_id"] == TASK_ID
    assert linked.as_storage()["schema_version"] == 2
    assert CareEvent.from_storage(linked.as_storage()) == linked
    for provenance in ("manual", "action", "automation"):
        assert _event(provenance=provenance).provenance == provenance
    for alteration in (
        {"provenance": "provider"},
        {"schema_version": 1},
        {"task_id": "not-a-task"},
        {"task_id": str(uuid4())},
        {"kind": "task", "payload": {}},
        {"kind": "task", "payload": {"note": " x"}},
        {"kind": "task", "payload": {"text": "x"}},
    ):
        with pytest.raises(ValueError, match=r"."):
            _event(**alteration)
    row = _event_row()
    del row["task_id"]
    with pytest.raises(ValueError, match="fields"):
        CareEvent.from_storage(row)


def test_task_type_kind_mapping_and_matching() -> None:
    assert dict(CARE_TASK_TYPE_KINDS) == {
        "fertilize": "fertilizing",
        "prune": "pruning",
        "repot": "repotting",
        "pests": "task",
        "winter_protection": "task",
        "custom": "task",
    }
    assert kind_for_task_type("prune") == "pruning"
    with pytest.raises(ValueError, match="type"):
        kind_for_task_type("water")
    fertilize = _task()
    pests = _task(id=OTHER_TASK_ID, type="pests")
    assert task_matches_event(fertilize, _event(kind="fertilizing"))
    assert not task_matches_event(fertilize, _event(kind="pruning"))
    assert not task_matches_event(pests, _event(kind="task"))
    assert task_matches_event(pests, _event(kind="task", task_id=OTHER_TASK_ID))
    # A linked event counts only for its own task, whatever its kind.
    linked_elsewhere = _event(kind="fertilizing", task_id=OTHER_TASK_ID)
    assert not task_matches_event(fertilize, linked_elsewhere)
    assert task_matches_event(pests, linked_elsewhere)


# --- Rotation -------------------------------------------------------------


def _at(day: int, **changes: Any) -> CareEvent:
    return _event(occurred_at=f"2026-01-{day:02d}T10:00:00Z", **changes)


def test_rotation_prefers_old_watering_then_notes_then_older_duplicates() -> None:
    newest_watering = _at(9)
    old_watering = _at(2)
    note = _at(1, kind="note")
    pruning_old = _at(3, kind="pruning")
    pruning_new = _at(8, kind="pruning")
    events: tuple[CareEvent, ...] = (
        newest_watering,
        old_watering,
        note,
        pruning_old,
        pruning_new,
    )
    assert rotation_candidate(events) == old_watering
    events = (newest_watering, note, pruning_old, pruning_new)
    assert rotation_candidate(events) == note
    events = (newest_watering, pruning_old, pruning_new)
    assert rotation_candidate(events) == pruning_old

    # The newest event of a task is protected even when it is not the newest
    # event of its kind.
    task_old = _at(1, kind="fertilizing", task_id=TASK_ID)
    plain_mid = _at(4, kind="fertilizing")
    plain_new = _at(6, kind="fertilizing")
    events = (newest_watering, task_old, plain_mid, plain_new)
    assert rotation_candidate(events) == plain_mid
    # Everything protected: the oldest event goes so a new event still fits.
    events = (newest_watering, _at(1, kind="pruning"))
    assert rotation_candidate(events) == events[1]
    assert rotation_candidate(()) is None


def test_rotate_for_append_keeps_history_within_limit() -> None:
    events = tuple(
        _event(occurred_at=f"2026-01-01T10:{minute // 60:02d}:{minute % 60:02d}Z")
        for minute in range(MAX_CARE_EVENTS)
    )
    rotated = rotate_for_append(events)
    assert len(rotated) == MAX_CARE_EVENTS - 1
    assert events[0] not in rotated
    assert rotate_for_append(events[:10]) == events[:10]


# --- Manager --------------------------------------------------------------


async def _manager(hass: HomeAssistant) -> tuple[SmartPlantsManager, PlantRecord]:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_plant(name="Aloe")
    return manager, plant


async def _create(
    manager: SmartPlantsManager,
    plant: PlantRecord,
    task_type: str = "fertilize",
    **changes: Any,
) -> tuple[PlantRecord, CareTask]:
    arguments: dict[str, Any] = {
        "name": None,
        "schedule": INTERVAL,
        "instructions": None,
        "baseline_done_on": None,
        **changes,
    }
    return await manager.async_create_care_task(
        plant.id,
        expected_revision=plant.revision,
        task_type=task_type,
        **arguments,
    )


async def test_create_care_task(hass: HomeAssistant, freezer: Any) -> None:
    freezer.move_to(NOW)
    manager, plant = await _manager(hass)
    plant, _ = await manager.async_add_care_event(
        plant.id,
        expected_revision=plant.revision,
        kind="fertilizing",
        occurred_at="2026-06-01T08:00:00+02:00",
        payload={"product": None, "amount": None, "unit": None, "note": None},
    )
    updated, task = await _create(
        manager,
        plant,
        name="  Feed  ",
        instructions="  Half strength  ",
        baseline_done_on="2026-05-01",
    )
    assert updated.revision == plant.revision + 1
    assert updated.care_tasks == (task,)
    assert len(task.id) == 32
    assert task.name == "Feed"
    assert task.instructions == "Half strength"
    assert task.schedule == IntervalSchedule(4, "weeks", growing_season_only=True)
    assert task.created_on == dt_util.now().date().isoformat()
    assert task.last_done_at == "2026-06-01T06:00:00Z"
    assert task.last_skipped_on is None

    # Blank optional text is stored as "not set".
    updated, pests = await _create(
        manager, updated, "pests", name=" ", instructions="", schedule=YEARLY
    )
    assert pests.name is None
    assert pests.instructions is None
    assert pests.last_done_at is None
    assert pests.schedule == YearlySchedule(3, 4)

    failures: tuple[tuple[str, dict[str, Any]], ...] = (
        ("fertilize", {}),
        ("water", {}),
        ("custom", {"name": None}),
        ("custom", {"name": "x" * 61}),
        ("prune", {"instructions": "x" * (CARE_TASK_INSTRUCTIONS_MAX_LEN + 1)}),
        ("prune", {"schedule": {"kind": "interval", "every": 0}}),
        ("prune", {"schedule": "weekly"}),
        ("prune", {"baseline_done_on": "2026-06-16"}),
        ("prune", {"baseline_done_on": "June"}),
    )
    for task_type, changes in failures:
        with pytest.raises(SmartPlantsValidationError):
            await _create(manager, updated, task_type, **changes)
    assert manager.get_plant(plant.id) == updated
    with pytest.raises(SmartPlantsRevisionConflictError):
        await _create(manager, plant, "prune")
    await manager.async_unload()


async def test_create_care_task_limit(hass: HomeAssistant) -> None:
    manager, plant = await _manager(hass)
    for index in range(20):
        plant, _ = await _create(manager, plant, "custom", name=f"Task {index}")
    with pytest.raises(SmartPlantsValidationError, match="at most 20"):
        await _create(manager, plant, "custom", name="One more")
    await manager.async_unload()


async def test_update_and_delete_care_task(hass: HomeAssistant) -> None:
    manager, plant = await _manager(hass)
    plant, task = await _create(manager, plant, "custom", name="Mist")
    updated = await manager.async_update_care_task(
        plant.id,
        task.id,
        expected_revision=plant.revision,
        name="Mist leaves",
        schedule=YEARLY,
        instructions="Use rain water",
    )
    changed = updated.care_task(task.id)
    assert changed is not None
    assert changed.name == "Mist leaves"
    assert changed.schedule == YearlySchedule(3, 4)
    assert changed.instructions == "Use rain water"
    assert changed.baseline_done_on is None
    assert changed.type == "custom"
    assert updated.revision == plant.revision + 1

    updated = await manager.async_update_care_task(
        plant.id, task.id, expected_revision=updated.revision, instructions=None
    )
    changed = updated.care_task(task.id)
    assert changed is not None
    assert changed.instructions is None
    assert changed.name == "Mist leaves"
    with pytest.raises(SmartPlantsValidationError, match="name"):
        await manager.async_update_care_task(
            plant.id, task.id, expected_revision=updated.revision, name=None
        )
    with pytest.raises(SmartPlantsValidationError, match="not found"):
        await manager.async_update_care_task(
            plant.id, OTHER_TASK_ID, expected_revision=updated.revision, name="x"
        )
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_update_care_task(
            plant.id, task.id, expected_revision=plant.revision, name="x"
        )

    completed, event = await manager.async_complete_care_task(
        plant.id, task.id, expected_revision=updated.revision
    )
    deleted = await manager.async_delete_care_task(
        plant.id, task.id, expected_revision=completed.revision
    )
    assert deleted.care_tasks == ()
    assert deleted.care_events == (event,)
    assert deleted.care_events[0].task_id == task.id
    with pytest.raises(SmartPlantsValidationError, match="not found"):
        await manager.async_delete_care_task(
            plant.id, task.id, expected_revision=deleted.revision
        )
    await manager.async_unload()


@pytest.mark.parametrize(
    ("task_type", "kind", "payload"),
    [
        (
            "fertilize",
            "fertilizing",
            {"product": None, "amount": None, "unit": None, "note": "Done"},
        ),
        ("prune", "pruning", {"part": None, "note": "Done"}),
        ("repot", "repotting", {"container": None, "medium": None, "note": "Done"}),
        ("pests", "task", {"note": "Done"}),
        ("custom", "task", {"note": "Done"}),
    ],
)
async def test_complete_care_task_logs_mapped_kind(
    hass: HomeAssistant,
    freezer: Any,
    task_type: str,
    kind: str,
    payload: dict[str, Any],
) -> None:
    freezer.move_to(NOW)
    manager, plant = await _manager(hass)
    name = "Mist" if task_type == "custom" else None
    plant, task = await _create(manager, plant, task_type, name=name)
    # ``None`` skips the revision check for callers that cannot know it.
    updated, event = await manager.async_complete_care_task(
        plant.id, task.id, expected_revision=None, note="Done", provenance="action"
    )
    assert event.kind == kind
    assert dict(event.payload) == payload
    assert event.task_id == task.id
    assert event.provenance == "action"
    assert event.local_date == dt_util.now().date().isoformat()
    assert updated.revision == plant.revision + 1
    done = updated.care_task(task.id)
    assert done is not None
    assert done.last_done_at == "2026-06-15T12:00:00Z"
    await manager.async_unload()


async def test_complete_care_task_validation(hass: HomeAssistant) -> None:
    manager, plant = await _manager(hass)
    plant, task = await _create(manager, plant)
    with pytest.raises(SmartPlantsValidationError, match="provenance"):
        await manager.async_complete_care_task(
            plant.id, task.id, expected_revision=None, provenance="provider"
        )
    with pytest.raises(SmartPlantsValidationError, match="note"):
        await manager.async_complete_care_task(
            plant.id, task.id, expected_revision=None, note=" padded"
        )
    with pytest.raises(SmartPlantsValidationError, match="future"):
        await manager.async_complete_care_task(
            plant.id,
            task.id,
            expected_revision=None,
            occurred_at=(datetime.now(UTC) + timedelta(days=1)).isoformat(),
        )
    with pytest.raises(SmartPlantsValidationError, match="not found"):
        await manager.async_complete_care_task(
            plant.id, OTHER_TASK_ID, expected_revision=None
        )
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_complete_care_task(
            plant.id, task.id, expected_revision=plant.revision - 1
        )
    assert manager.get_plant(plant.id) == plant
    updated, event = await manager.async_complete_care_task(
        plant.id,
        task.id,
        expected_revision=plant.revision,
        occurred_at="2026-01-05T09:00:00+01:00",
    )
    assert event.occurred_at == "2026-01-05T09:00:00+01:00"
    assert event.provenance == "manual"
    assert updated.revision == plant.revision + 1
    await manager.async_unload()


async def test_skip_and_undo_skip(hass: HomeAssistant, freezer: Any) -> None:
    freezer.move_to(NOW)
    manager, plant = await _manager(hass)
    plant, task = await _create(manager, plant)
    skipped, previous = await manager.async_skip_care_task(
        plant.id, task.id, expected_revision=None
    )
    today = dt_util.now().date().isoformat()
    assert previous is None
    skipped_task = skipped.care_task(task.id)
    assert skipped_task is not None
    assert skipped_task.last_skipped_on == today
    again, previous = await manager.async_skip_care_task(
        plant.id, task.id, expected_revision=skipped.revision
    )
    assert previous == today
    undone = await manager.async_undo_skip_care_task(
        plant.id, task.id, expected_revision=again.revision, previous_skipped_on=None
    )
    undone_task = undone.care_task(task.id)
    assert undone_task is not None
    assert undone_task.last_skipped_on is None
    assert undone.revision == again.revision + 1
    restored = await manager.async_undo_skip_care_task(
        plant.id,
        task.id,
        expected_revision=undone.revision,
        previous_skipped_on="2026-05-01",
    )
    restored_task = restored.care_task(task.id)
    assert restored_task is not None
    assert restored_task.last_skipped_on == "2026-05-01"
    with pytest.raises(SmartPlantsValidationError, match="previous_skipped_on"):
        await manager.async_undo_skip_care_task(
            plant.id,
            task.id,
            expected_revision=restored.revision,
            previous_skipped_on="May",
        )
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_skip_care_task(
            plant.id, task.id, expected_revision=plant.revision
        )
    with pytest.raises(SmartPlantsValidationError, match="not found"):
        await manager.async_skip_care_task(
            plant.id, OTHER_TASK_ID, expected_revision=None
        )
    await manager.async_unload()


async def test_set_rest_period(hass: HomeAssistant) -> None:
    manager, plant = await _manager(hass)
    updated = await manager.async_set_rest_period(
        plant.id,
        expected_revision=plant.revision,
        rest_period={"start_month": 11, "end_month": 2},
    )
    assert updated.rest_period == RestPeriod(11, 2)
    assert updated.as_view()["rest_period"] == {"start_month": 11, "end_month": 2}
    invalid_periods: tuple[dict[str, int], ...] = (
        {"start_month": 0, "end_month": 2},
        {"start_month": 1},
        {"start_month": 1, "end_month": 2, "kind": 1},
    )
    with pytest.raises(SmartPlantsValidationError, match="all 12 months"):
        await manager.async_set_rest_period(
            plant.id,
            expected_revision=updated.revision,
            rest_period={"start_month": 4, "end_month": 3},
        )
    for invalid in invalid_periods:
        with pytest.raises(SmartPlantsValidationError, match="rest period"):
            await manager.async_set_rest_period(
                plant.id, expected_revision=updated.revision, rest_period=invalid
            )
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_set_rest_period(
            plant.id, expected_revision=plant.revision, rest_period=None
        )
    cleared = await manager.async_set_rest_period(
        plant.id, expected_revision=updated.revision, rest_period=None
    )
    assert cleared.rest_period is None
    await manager.async_unload()
    restored = SmartPlantsManager(hass)
    await restored.async_load()
    assert restored.get_plant(plant.id) == cleared
    await restored.async_unload()


async def test_add_care_event_with_task_link_and_provenance(
    hass: HomeAssistant,
) -> None:
    manager, plant = await _manager(hass)
    plant, task = await _create(manager, plant, "pests")
    updated, event = await manager.async_add_care_event(
        plant.id,
        expected_revision=None,
        kind="task",
        occurred_at="2026-01-05T09:00:00Z",
        payload={"note": "Sprayed"},
        provenance="automation",
        task_id=task.id,
    )
    assert event.task_id == task.id
    assert event.provenance == "automation"
    linked = updated.care_task(task.id)
    assert linked is not None
    assert linked.last_done_at == "2026-01-05T09:00:00Z"
    with pytest.raises(SmartPlantsValidationError, match="does not match"):
        await manager.async_add_care_event(
            plant.id,
            expected_revision=None,
            kind="pruning",
            occurred_at="2026-01-05T09:00:00Z",
            payload={"part": None, "note": None},
            task_id=task.id,
        )
    with pytest.raises(SmartPlantsValidationError, match="not found"):
        await manager.async_add_watering(
            plant.id,
            expected_revision=None,
            occurred_at="2026-01-05T09:00:00Z",
            note=None,
            task_id=OTHER_TASK_ID,
        )
    with pytest.raises(SmartPlantsValidationError, match="provenance"):
        await manager.async_add_watering(
            plant.id,
            expected_revision=None,
            occurred_at="2026-01-05T09:00:00Z",
            note=None,
            provenance="provider",
        )
    watered, watering = await manager.async_add_watering(
        plant.id,
        expected_revision=None,
        occurred_at="2026-01-05T09:00:00Z",
        note=None,
        provenance="action",
    )
    assert watering.provenance == "action"
    assert watered.revision == updated.revision + 1
    await manager.async_unload()


async def test_last_done_at_follows_add_edit_and_delete(hass: HomeAssistant) -> None:
    manager, plant = await _manager(hass)
    plant, task = await _create(manager, plant)
    plant, pests = await _create(manager, plant, "pests")
    feed = {"product": None, "amount": None, "unit": None, "note": None}

    def last_done(record: PlantRecord, task_id: str = task.id) -> str | None:
        current = record.care_task(task_id)
        assert current is not None
        return current.last_done_at

    plant, newer = await manager.async_add_care_event(
        plant.id,
        expected_revision=plant.revision,
        kind="fertilizing",
        occurred_at="2026-01-10T12:00:00+01:00",
        payload=feed,
    )
    assert last_done(plant) == "2026-01-10T11:00:00Z"
    assert last_done(plant, pests.id) is None
    # An older event does not move last_done_at back.
    plant, older = await manager.async_add_care_event(
        plant.id,
        expected_revision=plant.revision,
        kind="fertilizing",
        occurred_at="2026-01-05T12:00:00Z",
        payload=feed,
    )
    assert last_done(plant) == "2026-01-10T11:00:00Z"
    # Editing the newest event to an earlier time recomputes from history.
    plant, _edited = await manager.async_edit_care_event(
        plant.id,
        expected_revision=plant.revision,
        event_id=newer.id,
        kind="fertilizing",
        occurred_at="2026-01-01T12:00:00Z",
        payload=feed,
    )
    assert last_done(plant) == "2026-01-05T12:00:00Z"
    # Editing an event into another kind removes it from the task.
    plant, _edited = await manager.async_edit_care_event(
        plant.id,
        expected_revision=plant.revision,
        event_id=older.id,
        kind="note",
        occurred_at="2026-01-05T12:00:00Z",
        payload={"text": "Not fed after all"},
    )
    assert last_done(plant) == "2026-01-01T12:00:00Z"
    plant = await manager.async_delete_care_event(
        plant.id, expected_revision=plant.revision, event_id=newer.id
    )
    assert last_done(plant) is None
    await manager.async_unload()


async def test_rotation_never_moves_last_done_at_back(hass: HomeAssistant) -> None:
    manager, plant = await _manager(hass)
    plant, task = await _create(manager, plant, "prune")
    pruning = _event(kind="pruning", occurred_at="2026-01-03T10:00:00Z")
    old_pruning = _event(kind="pruning", occurred_at="2026-01-01T10:00:00Z")
    fillers = tuple(
        _event(
            kind="repotting",
            occurred_at=f"2026-01-02T{index // 60:02d}:{index % 60:02d}:00Z",
        )
        for index in range(MAX_CARE_EVENTS - 2)
    )
    task = replace(task, last_done_at="2026-01-03T10:00:00Z")
    full = replace(
        plant, care_events=(pruning, old_pruning, *fillers), care_tasks=(task,)
    )
    manager._snapshot = manager.snapshot.with_plant(full)
    # The oldest non-newest event of its kind goes first: the old pruning.
    updated, event = await manager.async_add_care_event(
        plant.id,
        expected_revision=None,
        kind="pruning",
        occurred_at="2026-01-02T12:00:00Z",
        payload={"part": None, "note": None},
    )
    assert len(updated.care_events) == MAX_CARE_EVENTS
    assert old_pruning not in updated.care_events
    assert event in updated.care_events
    kept = updated.care_task(task.id)
    assert kept is not None
    assert kept.last_done_at == "2026-01-03T10:00:00Z"

    # The newest matching event itself may rotate out; last_done_at stays.
    lone = replace(
        plant,
        care_events=(
            _event(kind="pruning", occurred_at="2026-01-01T10:00:00Z"),
            *(
                _event(kind="repotting", occurred_at="2026-01-02T10:00:00Z")
                for _ in range(MAX_CARE_EVENTS - 2)
            ),
            _event(kind="repotting", occurred_at="2026-01-03T10:00:00Z"),
        ),
        care_tasks=(replace(task, last_done_at="2026-01-01T10:00:00Z"),),
    )
    manager._snapshot = manager.snapshot.with_plant(lone)
    updated, _ = await manager.async_add_care_event(
        plant.id,
        expected_revision=None,
        kind="note",
        occurred_at="2026-01-04T10:00:00Z",
        payload={"text": "Checked"},
    )
    kept = updated.care_task(task.id)
    assert kept is not None
    assert kept.last_done_at == "2026-01-01T10:00:00Z"
    await manager.async_unload()


# --- Migration ------------------------------------------------------------


def _minor_eleven_event(
    kind: str, occurred: str, payload: dict[str, Any]
) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "id": str(uuid4()),
        "kind": kind,
        "provenance": "manual",
        "occurred_at": occurred,
        "local_date": occurred[:10],
        "created_at": "2026-02-01T00:00:00Z",
        "updated_at": "2026-02-01T00:00:00Z",
        "payload": payload,
    }


def _minor_eleven_plant(plant_id: str, events: list[dict[str, Any]]) -> dict[str, Any]:
    row = _plant_row(id=plant_id, care_events=events)
    del row["care_tasks"]
    del row["rest_period"]
    return row


async def test_minor_eleven_migration_keeps_every_care_event(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    events = [
        _minor_eleven_event("watering", "2026-01-01T08:00:00+02:00", {"note": None}),
        _minor_eleven_event(
            "fertilizing",
            "2026-01-02T08:00:00Z",
            {"product": "Feed", "amount": 2, "unit": "mL", "note": None},
        ),
        _minor_eleven_event(
            "pruning", "2026-01-03T08:00:00Z", {"part": None, "note": "Tips"}
        ),
        _minor_eleven_event(
            "repotting",
            "2026-01-04T08:00:00Z",
            {"container": "Clay", "medium": None, "note": None},
        ),
        _minor_eleven_event("note", "2026-01-05T08:00:00Z", {"text": "New leaf"}),
    ]
    hass_storage[STORAGE_KEY] = {
        "key": STORAGE_KEY,
        "version": 1,
        "minor_version": 11,
        "data": {
            "revision": 4,
            "plants": [
                _minor_eleven_plant("p", events),
                _minor_eleven_plant("q", []),
            ],
            "pending_operations": [],
            "tombstones": [],
        },
    }
    assert STORAGE_MINOR_VERSION == 15
    loaded = await SmartPlantsStore(hass).async_load()
    plant = loaded.plants["p"]
    assert plant.care_tasks == ()
    assert plant.rest_period is None
    assert loaded.plants["q"].care_events == ()
    assert len(plant.care_events) == len(events)
    for original, migrated in zip(events, plant.care_events, strict=True):
        expected = {**original, "schema_version": 2, "task_id": None}
        assert migrated.as_storage() == expected
    persisted = hass_storage[STORAGE_KEY]
    assert persisted["minor_version"] == STORAGE_MINOR_VERSION
    assert persisted["data"]["plants"][0]["care_tasks"] == []
    assert persisted["data"]["plants"][0]["rest_period"] is None
    assert all(
        row["schema_version"] == 2 and row["task_id"] is None
        for row in persisted["data"]["plants"][0]["care_events"]
    )

    # The migrated inventory round-trips through the current minor unchanged.
    reloaded = await SmartPlantsStore(hass).async_load()
    assert reloaded == loaded
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    _plant, task = await _create(manager, manager.get_plant("p"))
    assert task.last_done_at == "2026-01-02T08:00:00Z"
    await manager.async_unload()


async def test_minor_eleven_migration_fails_closed(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    plant = _minor_eleven_plant("p", [])
    plant["care_tasks"] = []
    hass_storage[STORAGE_KEY] = {
        "key": STORAGE_KEY,
        "version": 1,
        "minor_version": 11,
        "data": {
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
        },
    }
    with pytest.raises(SmartPlantsInvalidStorageError, match="care tasks"):
        await SmartPlantsStore(hass).async_load()

    event = _minor_eleven_event("watering", "2026-01-01T08:00:00Z", {"note": None})
    event["schema_version"] = 3
    hass_storage[STORAGE_KEY]["data"]["plants"] = [_minor_eleven_plant("p", [event])]
    with pytest.raises(SmartPlantsInvalidStorageError, match="care event"):
        await SmartPlantsStore(hass).async_load()


async def test_stored_task_with_short_instructions_still_loads(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # Tasks saved under the earlier 500-character limit stay valid.
    instructions = "x" * 500
    plant = _plant_row(id="p", care_tasks=[_task_row(instructions=instructions)])
    hass_storage[STORAGE_KEY] = {
        "key": STORAGE_KEY,
        "version": 1,
        "minor_version": STORAGE_MINOR_VERSION,
        "data": {
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
        },
    }
    loaded = await SmartPlantsStore(hass).async_load()
    (task,) = loaded.plants["p"].care_tasks
    assert task.instructions == instructions
