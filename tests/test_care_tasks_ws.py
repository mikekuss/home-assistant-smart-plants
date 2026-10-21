"""WebSocket tests for care task, rest period, and task care event commands."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import (
    CARE_TASK_INSTRUCTIONS_MAX_LEN,
    PlantRecord,
)
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import (
    MockHAClientWebSocket,
    WebSocketGenerator,
)

from .test_websocket_api import _setup

NOW = "2026-06-15T10:00:00+00:00"
MISSING_TASK_ID = "7c9e6679742540de944be07fc1f90ae7"
INTERVAL = {
    "kind": "interval",
    "every": 2,
    "unit": "weeks",
    "growing_season_only": False,
}


# Tests connect before moving the clock: the client's access token is issued
# at the real time and would not be valid at a frozen date.


async def _send(client: MockHAClientWebSocket, msg: dict[str, Any]) -> dict[str, Any]:
    await client.send_json_auto_id(msg)
    response: dict[str, Any] = await client.receive_json()
    return response


async def _result(client: MockHAClientWebSocket, msg: dict[str, Any]) -> dict[str, Any]:
    response = await _send(client, msg)
    assert response["success"], response
    result: dict[str, Any] = response["result"]
    return result


async def _error(client: MockHAClientWebSocket, msg: dict[str, Any]) -> str:
    response = await _send(client, msg)
    assert response["success"] is False, response
    code: str = response["error"]["code"]
    return code


async def _plant_with_task(
    hass: HomeAssistant, task_type: str = "fertilize"
) -> tuple[MockConfigEntry, SmartPlantsManager, PlantRecord, str]:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    plant, task = await manager.async_create_care_task(
        plant.id,
        expected_revision=plant.revision,
        task_type=task_type,
        name="Mist leaves" if task_type == "custom" else None,
        schedule=INTERVAL,
        instructions=None,
        baseline_done_on=None,
    )
    return entry, manager, plant, task.id


def _commands(plant_id: str, task_id: str, revision: int) -> list[dict[str, Any]]:
    """Return one valid message for every new mutation command."""
    base = {"plant_id": plant_id, "expected_revision": revision}
    task = {**base, "task_id": task_id}
    return [
        {
            "type": "smart_plants/care_tasks/create",
            **base,
            "task_type": "prune",
            "name": None,
            "schedule": INTERVAL,
            "instructions": None,
            "baseline_done_on": None,
        },
        {"type": "smart_plants/care_tasks/update", **task, "name": "Feed"},
        {"type": "smart_plants/care_tasks/delete", **task},
        {"type": "smart_plants/care_tasks/complete", **task},
        {"type": "smart_plants/care_tasks/skip", **task},
        {
            "type": "smart_plants/care_tasks/undo_skip",
            **task,
            "previous_skipped_on": None,
        },
        {
            "type": "smart_plants/plants/set_rest_period",
            **base,
            "rest_period": {"start_month": 11, "end_month": 2},
        },
    ]


_COMMAND_COUNT = 7


async def test_create_update_and_delete_task(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await hass_ws_client(hass)
    freezer.move_to(NOW)
    entry = await _setup(hass)
    plant = await entry.runtime_data.manager.async_create_plant(name="Aloe")
    created = await _result(
        client,
        {
            "type": "smart_plants/care_tasks/create",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "task_type": "custom",
            "name": "Mist leaves",
            "schedule": {"kind": "yearly", "start_month": 4, "end_month": 5},
            "instructions": "Use rain water.",
            "baseline_done_on": "2026-05-01",
        },
    )
    task_id = created["task_id"]
    view = created["plant"]
    assert view["revision"] == plant.revision + 1
    assert view["care_tasks"] == [
        {
            "id": task_id,
            "type": "custom",
            "name": "Mist leaves",
            "schedule": {"kind": "yearly", "start_month": 4, "end_month": 5},
            "instructions": "Use rain water.",
            "baseline_done_on": "2026-05-01",
            "last_done_at": None,
            "last_skipped_on": None,
            "created_on": "2026-06-15",
        }
    ]

    updated = await _result(
        client,
        {
            "type": "smart_plants/care_tasks/update",
            "plant_id": plant.id,
            "task_id": task_id,
            "expected_revision": view["revision"],
            "schedule": INTERVAL,
            "instructions": None,
        },
    )
    (task,) = updated["plant"]["care_tasks"]
    assert task["schedule"] == INTERVAL
    assert task["instructions"] is None
    # Fields the update omits keep their values.
    assert task["name"] == "Mist leaves"
    assert task["baseline_done_on"] == "2026-05-01"

    deleted = await _result(
        client,
        {
            "type": "smart_plants/care_tasks/delete",
            "plant_id": plant.id,
            "task_id": task_id,
            "expected_revision": updated["plant"]["revision"],
        },
    )
    assert deleted["plant"]["care_tasks"] == []
    assert deleted["plant"]["revision"] == updated["plant"]["revision"] + 1


async def test_create_and_update_reject_invalid_tasks(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await hass_ws_client(hass)
    freezer.move_to(NOW)
    _entry, manager, plant, task_id = await _plant_with_task(hass)
    create = {
        "type": "smart_plants/care_tasks/create",
        "plant_id": plant.id,
        "expected_revision": plant.revision,
        "task_type": "prune",
        "name": None,
        "schedule": INTERVAL,
        "instructions": None,
        "baseline_done_on": None,
    }
    invalid_creates: list[dict[str, Any]] = [
        {"task_type": "water"},
        {"task_type": "custom"},
        {"task_type": "fertilize"},
        {"name": "x" * 61},
        {"schedule": {"kind": "interval", "every": 0, "unit": "days"}},
        {"schedule": {**INTERVAL, "every": 1000}},
        {"schedule": "weekly"},
        {"instructions": "x" * (CARE_TASK_INSTRUCTIONS_MAX_LEN + 1)},
        {"baseline_done_on": "2026-06-16"},
        {"baseline_done_on": "15.06.2026"},
        {"expected_revision": 0},
        {"expected_revision": True},
    ]
    for changes in invalid_creates:
        assert await _error(client, {**create, **changes}) == "invalid_format", changes
    missing_name = {key: value for key, value in create.items() if key != "name"}
    assert await _error(client, missing_name) == "invalid_format"

    update = {
        "type": "smart_plants/care_tasks/update",
        "plant_id": plant.id,
        "task_id": task_id,
        "expected_revision": plant.revision,
    }
    invalid_updates: list[dict[str, Any]] = [
        {"task_id": MISSING_TASK_ID},
        {"task_id": "short"},
        {"schedule": {"kind": "yearly", "start_month": 13, "end_month": 1}},
        {"baseline_done_on": "2026-06-16"},
        {"instructions": "x" * (CARE_TASK_INSTRUCTIONS_MAX_LEN + 1)},
        {"unknown": 1},
    ]
    for changes in invalid_updates:
        assert await _error(client, {**update, **changes}) == "invalid_format", changes
    assert manager.get_plant(plant.id) == plant


async def test_create_and_update_accept_longest_instructions(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await hass_ws_client(hass)
    freezer.move_to(NOW)
    _entry, manager, plant, task_id = await _plant_with_task(hass)
    longest = "x" * CARE_TASK_INSTRUCTIONS_MAX_LEN
    assert CARE_TASK_INSTRUCTIONS_MAX_LEN == 4_000
    created = await _result(
        client,
        {
            "type": "smart_plants/care_tasks/create",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "task_type": "prune",
            "name": None,
            "schedule": INTERVAL,
            "instructions": longest,
            "baseline_done_on": None,
        },
    )
    by_id = {task["id"]: task for task in created["plant"]["care_tasks"]}
    assert by_id[created["task_id"]]["instructions"] == longest

    updated = await _result(
        client,
        {
            "type": "smart_plants/care_tasks/update",
            "plant_id": plant.id,
            "task_id": task_id,
            "expected_revision": created["plant"]["revision"],
            "instructions": longest,
        },
    )
    by_id = {task["id"]: task for task in updated["plant"]["care_tasks"]}
    assert by_id[task_id]["instructions"] == longest
    stored = manager.get_plant(plant.id).care_tasks
    assert all(task.instructions == longest for task in stored)


async def test_complete_returns_event_for_undo(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    client = await hass_ws_client(hass)
    _entry, _manager, plant, task_id = await _plant_with_task(hass)
    occurred = (
        (datetime.now(UTC) - timedelta(hours=2)).replace(microsecond=0).isoformat()
    )
    result = await _result(
        client,
        {
            "type": "smart_plants/care_tasks/complete",
            "plant_id": plant.id,
            "task_id": task_id,
            "expected_revision": plant.revision,
            "occurred_at": occurred,
            "note": "Half strength",
        },
    )
    view = result["plant"]
    (event,) = view["care_events"]
    assert event["id"] == result["event_id"]
    assert event["kind"] == "fertilizing"
    assert event["task_id"] == task_id
    assert event["occurred_at"] == occurred
    assert event["payload"]["note"] == "Half strength"
    assert view["care_tasks"][0]["last_done_at"] is not None

    undone = await _result(
        client,
        {
            "type": "smart_plants/care/delete",
            "plant_id": plant.id,
            "expected_revision": view["revision"],
            "event_id": result["event_id"],
        },
    )
    assert undone["plant"]["care_events"] == []
    assert undone["plant"]["care_tasks"][0]["last_done_at"] is None


async def test_complete_defaults_to_now_and_rejects_bad_times(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await hass_ws_client(hass)
    freezer.move_to(NOW)
    _entry, manager, plant, task_id = await _plant_with_task(hass, "pests")
    msg = {
        "type": "smart_plants/care_tasks/complete",
        "plant_id": plant.id,
        "task_id": task_id,
        "expected_revision": plant.revision,
    }
    for changes in (
        {"occurred_at": "2026-06-16T10:00:00+00:00"},
        {"occurred_at": "2026-06-15T09:00:00.000"},
        {"note": ""},
        {"note": "x" * 501},
        {"task_id": MISSING_TASK_ID},
    ):
        assert await _error(client, {**msg, **changes}) == "invalid_format", changes
    assert manager.get_plant(plant.id) == plant

    result = await _result(client, msg)
    (event,) = result["plant"]["care_events"]
    assert event["kind"] == "task"
    assert event["payload"] == {"note": None}
    assert datetime.fromisoformat(event["occurred_at"]) == datetime.fromisoformat(NOW)


async def test_skip_and_undo_skip(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await hass_ws_client(hass)
    freezer.move_to(NOW)
    await hass.config.async_set_time_zone("UTC")
    _entry, _manager, plant, task_id = await _plant_with_task(hass)
    msg = {
        "type": "smart_plants/care_tasks/skip",
        "plant_id": plant.id,
        "task_id": task_id,
    }
    first = await _result(client, {**msg, "expected_revision": plant.revision})
    assert first["previous_skipped_on"] is None
    assert first["plant"]["care_tasks"][0]["last_skipped_on"] == "2026-06-15"

    freezer.move_to("2026-06-20T10:00:00+00:00")
    second = await _result(
        client, {**msg, "expected_revision": first["plant"]["revision"]}
    )
    assert second["previous_skipped_on"] == "2026-06-15"
    assert second["plant"]["care_tasks"][0]["last_skipped_on"] == "2026-06-20"

    undo = {
        "type": "smart_plants/care_tasks/undo_skip",
        "plant_id": plant.id,
        "task_id": task_id,
        "expected_revision": second["plant"]["revision"],
    }
    for previous in ("2026/06/15", "2026-02-30", 20260615):
        assert (
            await _error(client, {**undo, "previous_skipped_on": previous})
            == "invalid_format"
        ), previous
    missing = {key: value for key, value in undo.items() if key != "expected_revision"}
    assert (
        await _error(client, {**missing, "previous_skipped_on": None})
        == "invalid_format"
    )
    restored = await _result(
        client,
        {**undo, "previous_skipped_on": second["previous_skipped_on"]},
    )
    assert restored["plant"]["care_tasks"][0]["last_skipped_on"] == "2026-06-15"
    cleared = await _result(
        client,
        {
            **undo,
            "expected_revision": restored["plant"]["revision"],
            "previous_skipped_on": None,
        },
    )
    assert cleared["plant"]["care_tasks"][0]["last_skipped_on"] is None


async def test_set_rest_period(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    client = await hass_ws_client(hass)
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    msg = {
        "type": "smart_plants/plants/set_rest_period",
        "plant_id": plant.id,
        "expected_revision": plant.revision,
    }
    result = await _result(
        client,
        {**msg, "rest_period": {"start_month": 11, "end_month": 2}},
    )
    assert result["plant"]["rest_period"] == {"start_month": 11, "end_month": 2}
    revision = result["plant"]["revision"]
    for invalid in (
        {"start_month": 1, "end_month": 12},
        {"start_month": 5, "end_month": 4},
        {"start_month": 0, "end_month": 2},
        {"start_month": 1, "end_month": 13},
        {"start_month": True, "end_month": 2},
        {"start_month": 1},
        {"start_month": 1, "end_month": 2, "kind": "yearly"},
        "winter",
    ):
        assert (
            await _error(
                client,
                {**msg, "expected_revision": revision, "rest_period": invalid},
            )
            == "invalid_format"
        ), invalid
    assert manager.get_plant(plant.id).revision == revision
    cleared = await _result(
        client,
        {**msg, "expected_revision": revision, "rest_period": None},
    )
    assert cleared["plant"]["rest_period"] is None


async def test_edit_task_care_event_keeps_task_link(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    client = await hass_ws_client(hass)
    _entry, manager, plant, task_id = await _plant_with_task(hass, "custom")
    first = (datetime.now(UTC) - timedelta(days=2)).replace(microsecond=0)
    plant, event = await manager.async_complete_care_task(
        plant.id,
        task_id,
        expected_revision=plant.revision,
        occurred_at=first.isoformat(),
    )
    edited_at = (first - timedelta(days=1)).isoformat()
    msg = {
        "type": "smart_plants/care/edit",
        "plant_id": plant.id,
        "expected_revision": plant.revision,
        "event_id": event.id,
        "kind": "task",
        "occurred_at": edited_at,
        "payload": {"note": "Used the spray bottle"},
    }
    result = await _result(client, msg)
    assert result["event"]["id"] == event.id
    assert result["event"]["kind"] == "task"
    assert result["event"]["task_id"] == task_id
    assert result["event"]["occurred_at"] == edited_at
    assert result["event"]["payload"] == {"note": "Used the spray bottle"}
    (task,) = result["plant"]["care_tasks"]
    assert datetime.fromisoformat(task["last_done_at"]) == datetime.fromisoformat(
        edited_at
    )

    revision = result["plant"]["revision"]
    for changes in (
        {"kind": "note", "payload": {"text": "Observed"}},
        {"kind": "watering", "payload": {"note": None}},
        {"payload": {"note": None, "extra": 1}},
    ):
        assert (
            await _error(
                client,
                {**msg, "expected_revision": revision, **changes},
            )
            == "invalid_format"
        ), changes


async def test_edit_cannot_turn_an_event_into_a_task_event(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    client = await hass_ws_client(hass)
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    occurred = (datetime.now(UTC) - timedelta(hours=1)).replace(microsecond=0)
    plant, event = await manager.async_add_watering(
        plant.id,
        expected_revision=plant.revision,
        occurred_at=occurred.isoformat(),
        note=None,
    )
    code = await _error(
        client,
        {
            "type": "smart_plants/care/edit",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "event_id": event.id,
            "kind": "task",
            "occurred_at": occurred.isoformat(),
            "payload": {"note": None},
        },
    )
    assert code == "invalid_format"


@pytest.mark.parametrize("index", range(_COMMAND_COUNT))
async def test_commands_report_revision_conflict(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, index: int
) -> None:
    client = await hass_ws_client(hass)
    _entry, manager, plant, task_id = await _plant_with_task(hass)
    msg = _commands(plant.id, task_id, plant.revision + 5)[index]
    assert await _error(client, msg) == "revision_conflict"
    assert manager.get_plant(plant.id) == plant


@pytest.mark.parametrize("index", range(_COMMAND_COUNT))
async def test_commands_report_unknown_plant(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, index: int
) -> None:
    client = await hass_ws_client(hass)
    _entry, _manager, plant, task_id = await _plant_with_task(hass)
    msg = _commands("missing", task_id, plant.revision)[index]
    assert await _error(client, msg) == "not_found"


@pytest.mark.parametrize("index", range(_COMMAND_COUNT))
async def test_commands_require_expected_revision(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, index: int
) -> None:
    client = await hass_ws_client(hass)
    _entry, manager, plant, task_id = await _plant_with_task(hass)
    msg = _commands(plant.id, task_id, plant.revision)[index]
    del msg["expected_revision"]
    assert await _error(client, msg) == "invalid_format"
    for bad in (0, -1, "1", True):
        msg["expected_revision"] = bad
        assert await _error(client, msg) == "invalid_format"
    assert manager.get_plant(plant.id) == plant


@pytest.mark.parametrize("index", range(_COMMAND_COUNT))
async def test_commands_report_not_loaded(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, index: int
) -> None:
    client = await hass_ws_client(hass)
    entry, _manager, plant, task_id = await _plant_with_task(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    msg = _commands(plant.id, task_id, plant.revision)[index]
    assert await _error(client, msg) == "integration_not_loaded"


@pytest.mark.parametrize("index", range(_COMMAND_COUNT))
async def test_commands_require_admin(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
    index: int,
) -> None:
    _entry, manager, plant, task_id = await _plant_with_task(hass)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await client.send_json_auto_id(_commands(plant.id, task_id, plant.revision)[index])
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "unauthorized"
    assert manager.get_plant(plant.id) == plant


@pytest.mark.parametrize("index", range(_COMMAND_COUNT))
async def test_commands_succeed_with_valid_messages(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, index: int
) -> None:
    client = await hass_ws_client(hass)
    _entry, manager, plant, task_id = await _plant_with_task(hass)
    result = await _result(client, _commands(plant.id, task_id, plant.revision)[index])
    assert result["plant"]["id"] == plant.id
    assert result["plant"]["revision"] == plant.revision + 1
    assert result["plant"] == manager.get_plant(plant.id).as_view()
