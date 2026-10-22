"""Reading care tasks: schedule validation, the pure engine, and storage."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from custom_components.smart_plants.care_schedule import (
    ReadingState,
    compute_task_state,
    is_waiting,
    reading_task_state,
)
from custom_components.smart_plants.const import (
    READING_STATE_STORAGE_KEY,
    READING_STATE_STORAGE_VERSION,
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.models import (
    READING_ROLE_UNITS,
    CareTask,
    MoistureConfig,
    ReadingSchedule,
    parse_care_schedule,
)
from custom_components.smart_plants.storage import (
    ReadingStateStore,
    ReadingTimestamps,
    SmartPlantsInvalidStorageError,
    SmartPlantsStore,
    SmartPlantsUnsupportedStorageError,
)
from homeassistant.core import HomeAssistant

TASK_ID = "0f8fad5bd9cb469fa16570867728950e"
OTHER_TASK_ID = "7c9e6679742540de944be07fc1f90ae7"
NOW = datetime(2026, 11, 2, 6, 0, tzinfo=UTC)
EARLIER = NOW - timedelta(hours=2)
LATER = NOW + timedelta(hours=2)


def _reading(**changes: Any) -> dict[str, Any]:
    return {
        "kind": "reading",
        "source": {"role": "temperature"},
        "condition": "below",
        "value": 5.0,
        "unit": "°C",
        "for_minutes": 0,
        "reset_value": None,
        **changes,
    }


# --- Schedule validation -------------------------------------------------


@pytest.mark.parametrize(
    "schedule",
    [
        _reading(),
        _reading(value=5, reset_value=8),
        _reading(condition="above", value=30.5, reset_value=28.0, for_minutes=4320),
        _reading(source={"role": "co2"}, condition="above", value=1500, unit="ppm"),
        _reading(source={"role": "moisture"}, unit="%"),
        _reading(source={"entity_id": "sensor.mock_frost"}, unit="°F", value=41),
        _reading(source={"entity_id": "sensor.mock_count"}, unit=None),
        _reading(reset_value=5.0),
    ],
)
def test_valid_reading_schedules_round_trip(schedule: dict[str, Any]) -> None:
    parsed = parse_care_schedule(schedule)
    assert isinstance(parsed, ReadingSchedule)
    stored = parsed.as_storage()
    assert parse_care_schedule(stored) == parsed
    assert isinstance(stored["value"], float)
    assert json.loads(json.dumps(stored)) == stored


def test_every_source_role_has_its_normalized_unit() -> None:
    assert dict(READING_ROLE_UNITS) == {
        "temperature": "°C",
        "humidity": "%",
        "moisture": "%",
        "illuminance": "lx",
        "conductivity": "μS/cm",
        "soil_temperature": "°C",
        "co2": "ppm",
    }
    for role, unit in READING_ROLE_UNITS.items():
        parse_care_schedule(_reading(source={"role": role}, unit=unit))


def _without(key: str) -> dict[str, Any]:
    schedule = _reading()
    del schedule[key]
    return schedule


@pytest.mark.parametrize(
    "schedule",
    [
        pytest.param(_without("source"), id="missing source"),
        pytest.param(_without("reset_value"), id="missing reset_value"),
        pytest.param(_without("unit"), id="missing unit"),
        pytest.param(_reading(extra=True), id="extra key"),
        pytest.param(_reading(kind="readings"), id="wrong kind"),
        pytest.param(_reading(condition="equal"), id="bad condition"),
        pytest.param(_reading(condition=None), id="no condition"),
        pytest.param(_reading(value=float("nan")), id="nan value"),
        pytest.param(_reading(value=float("inf")), id="inf value"),
        pytest.param(_reading(value=float("-inf")), id="negative inf value"),
        pytest.param(_reading(value=True), id="bool value"),
        pytest.param(_reading(value="5"), id="string value"),
        pytest.param(_reading(value=None), id="null value"),
        pytest.param(_reading(reset_value=4.0), id="reset below value for below"),
        pytest.param(
            _reading(condition="above", value=30, reset_value=31),
            id="reset above value for above",
        ),
        pytest.param(_reading(reset_value=float("nan")), id="nan reset"),
        pytest.param(_reading(reset_value=False), id="bool reset"),
        pytest.param(_reading(for_minutes=-1), id="negative for_minutes"),
        pytest.param(_reading(for_minutes=4321), id="for_minutes too long"),
        pytest.param(_reading(for_minutes=1.5), id="float for_minutes"),
        pytest.param(_reading(for_minutes=True), id="bool for_minutes"),
        pytest.param(_reading(source={"role": "battery"}, unit="%"), id="battery"),
        pytest.param(_reading(source={"role": "wind"}), id="unknown role"),
        pytest.param(_reading(source={"role": 1}), id="role not a string"),
        pytest.param(_reading(source={}), id="empty source"),
        pytest.param(
            _reading(source={"role": "temperature", "entity_id": "sensor.mock_t"}),
            id="both sources",
        ),
        pytest.param(_reading(source="temperature"), id="source not an object"),
        pytest.param(_reading(source={"device_id": "x"}), id="unknown source key"),
        pytest.param(
            _reading(source={"entity_id": "binary_sensor.mock_frost"}),
            id="non-sensor entity",
        ),
        pytest.param(_reading(source={"entity_id": "sensor"}), id="bad entity id"),
        pytest.param(
            _reading(source={"entity_id": "sensor.Mock Frost"}), id="invalid entity id"
        ),
        pytest.param(
            _reading(source={"entity_id": "sensor." + "x" * 255}),
            id="entity id too long",
        ),
        pytest.param(_reading(source={"entity_id": None}), id="null entity id"),
        pytest.param(_reading(unit="°F"), id="role unit mismatch"),
        pytest.param(_reading(unit=None), id="role without unit"),
        pytest.param(
            _reading(source={"entity_id": "sensor.mock_t"}, unit=""), id="empty unit"
        ),
        pytest.param(
            _reading(source={"entity_id": "sensor.mock_t"}, unit=" °C"),
            id="untrimmed unit",
        ),
        pytest.param(
            _reading(source={"entity_id": "sensor.mock_t"}, unit="u" * 33),
            id="unit too long",
        ),
        pytest.param(
            _reading(source={"entity_id": "sensor.mock_t"}, unit=5), id="unit number"
        ),
    ],
)
def test_invalid_reading_schedules_are_rejected(schedule: dict[str, Any]) -> None:
    with pytest.raises(ValueError, match=r"reading|schedule"):
        parse_care_schedule(schedule)


def test_date_engine_rejects_reading_schedules() -> None:
    task = CareTask.from_storage(
        {
            "id": TASK_ID,
            "type": "winter_protection",
            "name": None,
            "schedule": _reading(),
            "instructions": None,
            "baseline_done_on": None,
            "last_done_at": None,
            "last_skipped_on": None,
            "created_on": "2026-10-01",
        }
    )
    with pytest.raises(ValueError, match="schedule kind"):
        compute_task_state(
            schedule=task.schedule,
            last_done_on=None,
            last_skipped_on=None,
            baseline_done_on=None,
            created_on=NOW.date(),
            rest_period=None,
            today=NOW.date(),
        )


# --- Engine ----------------------------------------------------------------

BELOW = ReadingSchedule.from_storage(_reading())
BELOW_RESET = ReadingSchedule.from_storage(_reading(reset_value=8.0))
BELOW_DELAY = ReadingSchedule.from_storage(_reading(for_minutes=30))
ABOVE = ReadingSchedule.from_storage(
    _reading(source={"role": "co2"}, condition="above", value=1500, unit="ppm")
)


def _state(  # noqa: PLR0913
    schedule: ReadingSchedule,
    reading: float | None,
    *,
    triggered_at: datetime | None = None,
    rearmed_at: datetime | None = None,
    last_done_at: datetime | None = None,
    breach_since: datetime | None = None,
    now: datetime = NOW,
) -> ReadingState:
    return reading_task_state(
        schedule=schedule,
        reading=reading,
        now=now,
        triggered_at=triggered_at,
        rearmed_at=rearmed_at,
        last_done_at=last_done_at,
        breach_since=breach_since,
    )


def _expect(  # noqa: PLR0913
    status: str,
    *,
    is_due: bool = False,
    triggered_at: datetime | None = None,
    rearmed_at: datetime | None = None,
    breach_since: datetime | None = None,
    due_at: datetime | None = None,
) -> ReadingState:
    return ReadingState(
        status=status,  # type: ignore[arg-type]
        is_due=is_due,
        triggered_at=triggered_at,
        rearmed_at=rearmed_at,
        breach_since=breach_since,
        due_at=due_at,
    )


@pytest.mark.parametrize(
    ("actual", "expected"),
    [
        # Rule 1: armed and on the due side.
        pytest.param(
            _state(BELOW, 4.9),
            _expect("due", is_due=True, triggered_at=NOW),
            id="below at once",
        ),
        pytest.param(_state(BELOW, 5.0), _expect("watching"), id="equal is not below"),
        pytest.param(_state(BELOW, 12.0), _expect("watching"), id="safe side"),
        pytest.param(
            _state(ABOVE, 1501),
            _expect("due", is_due=True, triggered_at=NOW),
            id="above at once",
        ),
        pytest.param(_state(ABOVE, 1500), _expect("watching"), id="equal not above"),
        pytest.param(
            _state(BELOW_DELAY, 3.0),
            _expect("watching", breach_since=NOW, due_at=NOW + timedelta(minutes=30)),
            id="only after starts the timer",
        ),
        pytest.param(
            _state(BELOW_DELAY, 3.0, breach_since=NOW - timedelta(minutes=10)),
            _expect(
                "watching",
                breach_since=NOW - timedelta(minutes=10),
                due_at=NOW + timedelta(minutes=20),
            ),
            id="only after keeps counting",
        ),
        pytest.param(
            _state(BELOW_DELAY, 3.0, breach_since=NOW - timedelta(minutes=30)),
            _expect("due", is_due=True, triggered_at=NOW),
            id="only after elapsed",
        ),
        pytest.param(
            _state(BELOW_DELAY, 6.0, breach_since=NOW - timedelta(minutes=29)),
            _expect("watching"),
            id="safe reading restarts the timer",
        ),
        pytest.param(
            _state(BELOW_RESET, 6.0, breach_since=NOW - timedelta(minutes=29)),
            _expect("watching"),
            id="between value and reset is not the due side while armed",
        ),
        # Rule 2: due, and the reading recovers.
        pytest.param(
            _state(BELOW, 3.0, triggered_at=EARLIER),
            _expect("due", is_due=True, triggered_at=EARLIER),
            id="stays due",
        ),
        pytest.param(
            _state(BELOW, 5.0, triggered_at=EARLIER),
            _expect("watching"),
            id="reset at value clears due",
        ),
        pytest.param(
            _state(BELOW_RESET, 7.9, triggered_at=EARLIER),
            _expect("due", is_due=True, triggered_at=EARLIER),
            id="between value and reset stays due",
        ),
        pytest.param(
            _state(BELOW_RESET, 8.0, triggered_at=EARLIER),
            _expect("watching"),
            id="reaching reset clears due",
        ),
        pytest.param(
            _state(ABOVE, 1400, triggered_at=EARLIER),
            _expect("watching"),
            id="above recovers",
        ),
        # Rule 3: Done.
        pytest.param(
            _state(BELOW, 3.0, triggered_at=EARLIER, last_done_at=NOW),
            _expect("waiting", triggered_at=EARLIER),
            id="done while due waits",
        ),
        pytest.param(
            _state(BELOW_RESET, 7.0, triggered_at=EARLIER, last_done_at=NOW),
            _expect("waiting", triggered_at=EARLIER),
            id="waiting between value and reset",
        ),
        pytest.param(
            _state(BELOW_RESET, 8.5, triggered_at=EARLIER, last_done_at=EARLIER),
            _expect("watching", rearmed_at=NOW),
            id="recovery re-arms",
        ),
        pytest.param(
            _state(BELOW, 12.0, last_done_at=EARLIER),
            _expect("watching", rearmed_at=NOW),
            id="done on the safe side re-arms at the next reading",
        ),
        pytest.param(
            _state(BELOW, 3.0, rearmed_at=NOW, last_done_at=EARLIER),
            _expect("due", is_due=True, triggered_at=NOW, rearmed_at=NOW),
            id="re-armed task becomes due again",
        ),
        pytest.param(
            _state(BELOW, 3.0, last_done_at=EARLIER),
            _expect("waiting"),
            id="done without a re-arm waits",
        ),
        # Rule 4: Undo Done removes the Done newer than the re-arm.
        pytest.param(
            _state(BELOW, 3.0, triggered_at=EARLIER, rearmed_at=EARLIER - timedelta(1)),
            _expect(
                "due",
                is_due=True,
                triggered_at=EARLIER,
                rearmed_at=EARLIER - timedelta(1),
            ),
            id="undo done is due again at once",
        ),
        # Rule 7: no reading.
        pytest.param(
            _state(BELOW, None, triggered_at=EARLIER),
            _expect("no_reading", is_due=True, triggered_at=EARLIER),
            id="due stays due without a reading",
        ),
        pytest.param(
            _state(BELOW, None, triggered_at=EARLIER, last_done_at=NOW),
            _expect("no_reading", triggered_at=EARLIER),
            id="waiting stays waiting without a reading",
        ),
        pytest.param(
            _state(BELOW_DELAY, None, breach_since=EARLIER),
            _expect("no_reading"),
            id="no reading stops the timer",
        ),
        pytest.param(
            _state(BELOW, None, rearmed_at=EARLIER),
            _expect("no_reading", rearmed_at=EARLIER),
            id="armed without a reading",
        ),
    ],
)
def test_reading_engine(actual: ReadingState, expected: ReadingState) -> None:
    assert actual == expected


def test_waiting_is_derived_from_done_and_rearm() -> None:
    assert not is_waiting(None, None)
    assert not is_waiting(None, NOW)
    assert is_waiting(NOW, None)
    assert is_waiting(LATER, NOW)
    assert not is_waiting(NOW, NOW)
    assert not is_waiting(EARLIER, NOW)


# --- Main store migration ----------------------------------------------------


def _seed(hass_storage: dict[str, Any], *, minor: int, plants: list[Any]) -> None:
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": minor,
        "key": STORAGE_KEY,
        "data": {
            "revision": 1,
            "plants": plants,
            "pending_operations": [],
            "tombstones": [],
        },
    }


def _task_row(**changes: Any) -> dict[str, Any]:
    return {
        "id": TASK_ID,
        "type": "fertilize",
        "name": None,
        "schedule": {
            "kind": "interval",
            "every": 2,
            "unit": "weeks",
            "growing_season_only": False,
        },
        "instructions": None,
        "baseline_done_on": None,
        "last_done_at": None,
        "last_skipped_on": None,
        "created_on": "2026-01-01",
        **changes,
    }


def _plant(tasks: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "id": "plant-1",
        "revision": 1,
        "name": "Aloe",
        "created_at": "2026-01-01T00:00:00Z",
        "lifecycle_state": "active",
        "acquired_at": None,
        "species": None,
        "placement": None,
        "tags": [],
        "category": None,
        "image": None,
        "roles": {"moisture": MoistureConfig().as_storage()},
        "care_events": [],
        "care_tasks": tasks,
        "rest_period": None,
    }


async def test_minor_thirteen_loads_unchanged_and_saves_as_current(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    assert STORAGE_MINOR_VERSION == 14
    plant = _plant([_task_row()])
    _seed(hass_storage, minor=13, plants=[plant])

    snapshot = await SmartPlantsStore(hass).async_load()

    assert snapshot.plants["plant-1"].care_tasks[0].as_storage() == _task_row()
    assert hass_storage[STORAGE_KEY]["minor_version"] == STORAGE_MINOR_VERSION
    assert hass_storage[STORAGE_KEY]["data"]["plants"][0]["care_tasks"] == [_task_row()]


@pytest.mark.parametrize(
    "task",
    [
        pytest.param(_task_row(schedule=_reading()), id="reading schedule"),
        pytest.param(_task_row(type="winter_protection"), id="winter protection"),
    ],
)
async def test_minor_thirteen_with_reading_tasks_fails_closed(
    hass: HomeAssistant, hass_storage: dict[str, Any], task: dict[str, Any]
) -> None:
    _seed(hass_storage, minor=13, plants=[_plant([task])])
    with pytest.raises(SmartPlantsInvalidStorageError, match="reading care tasks"):
        await SmartPlantsStore(hass).async_load()


async def test_current_minor_keeps_reading_tasks(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    task = _task_row(type="winter_protection", schedule=_reading())
    _seed(hass_storage, minor=STORAGE_MINOR_VERSION, plants=[_plant([task])])

    snapshot = await SmartPlantsStore(hass).async_load()

    loaded = snapshot.plants["plant-1"].care_tasks[0]
    assert isinstance(loaded.schedule, ReadingSchedule)
    assert loaded.as_storage() == task


async def test_newer_minor_is_rejected(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(hass_storage, minor=STORAGE_MINOR_VERSION + 1, plants=[])
    with pytest.raises(SmartPlantsUnsupportedStorageError):
        await SmartPlantsStore(hass).async_load()


# --- Reading state store -----------------------------------------------------


def _seed_state(hass_storage: dict[str, Any], data: object) -> None:
    hass_storage[READING_STATE_STORAGE_KEY] = {
        "version": READING_STATE_STORAGE_VERSION,
        "minor_version": 1,
        "key": READING_STATE_STORAGE_KEY,
        "data": data,
    }


async def test_reading_state_store_round_trip(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    store = ReadingStateStore(hass)
    assert await store.async_load() == {}
    data = {
        TASK_ID: ReadingTimestamps(triggered_at="2026-11-02T06:00:00Z"),
        OTHER_TASK_ID: ReadingTimestamps(rearmed_at="2026-11-01T06:00:00Z"),
    }
    await store.async_save_now(data)

    assert hass_storage[READING_STATE_STORAGE_KEY]["data"] == {
        "tasks": {
            OTHER_TASK_ID: {"triggered_at": None, "rearmed_at": "2026-11-01T06:00:00Z"},
            TASK_ID: {"triggered_at": "2026-11-02T06:00:00Z", "rearmed_at": None},
        }
    }
    assert await ReadingStateStore(hass).async_load() == data


@pytest.mark.parametrize(
    "data",
    [
        pytest.param([], id="not an object"),
        pytest.param({}, id="no tasks"),
        pytest.param({"tasks": []}, id="tasks not an object"),
    ],
)
async def test_malformed_reading_state_is_treated_as_empty(
    hass: HomeAssistant, hass_storage: dict[str, Any], data: object
) -> None:
    _seed_state(hass_storage, data)
    assert await ReadingStateStore(hass).async_load() == {}


async def test_malformed_reading_state_entries_are_dropped(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    good = {"triggered_at": "2026-11-02T06:00:00Z", "rearmed_at": None}
    _seed_state(
        hass_storage,
        {
            "tasks": {
                TASK_ID: good,
                "not-a-task-id": good,
                OTHER_TASK_ID: {"triggered_at": "yesterday", "rearmed_at": None},
                "1b4e28ba2fa1411d9d4c2a4a5e8f7c12": {"triggered_at": None},
                "6fa459eab3a14b4fb0d2e2c2e4f5a6b7": {
                    "triggered_at": None,
                    "rearmed_at": None,
                },
            }
        },
    )
    assert await ReadingStateStore(hass).async_load() == {
        TASK_ID: ReadingTimestamps(triggered_at="2026-11-02T06:00:00Z")
    }


async def test_corrupt_reading_state_file_is_treated_as_empty(
    hass: HomeAssistant,
) -> None:
    store = ReadingStateStore(hass)
    path = store._store.path
    await hass.async_add_executor_job(_write_text, path, "{not json")

    assert await store.async_load() == {}


def _write_text(path: str, text: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")
