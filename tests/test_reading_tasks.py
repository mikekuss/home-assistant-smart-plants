"""Reading care tasks at runtime: tracker, entities, actions, and WebSocket."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import pytest
from custom_components.smart_plants import sensor as sensor_module
from custom_components.smart_plants.const import DOMAIN, READING_STATE_STORAGE_KEY
from custom_components.smart_plants.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsValidationError,
)
from freezegun.api import FrozenDateTimeFactory
from homeassistant.const import STATE_UNAVAILABLE, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from .test_websocket_api import _setup

TEMPERATURE = "sensor.mock_temperature"
FROST = "sensor.mock_frost"
CELSIUS = {"unit_of_measurement": UnitOfTemperature.CELSIUS}
WEEKLY = {"kind": "interval", "every": 1, "unit": "weeks", "growing_season_only": False}


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


def _set_temperature(hass: HomeAssistant, value: float | str) -> None:
    hass.states.async_set(TEMPERATURE, str(value), CELSIUS)


async def _plant(
    hass: HomeAssistant, *, temperature: float | str = 12
) -> tuple[MockConfigEntry, SmartPlantsManager, str]:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    _set_temperature(hass, temperature)
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": TEMPERATURE}],
    )
    await hass.async_block_till_done()
    return entry, manager, plant.id


async def _create(
    hass: HomeAssistant,
    manager: SmartPlantsManager,
    plant_id: str,
    *,
    schedule: dict[str, Any] | None = None,
    task_type: str = "winter_protection",
) -> str:
    plant = manager.get_plant(plant_id)
    _updated, task = await manager.async_create_care_task(
        plant_id,
        expected_revision=plant.revision,
        task_type=task_type,
        name=f"Task {len(plant.care_tasks) + 1}" if task_type == "custom" else None,
        schedule=schedule or _reading(),
        instructions=None,
        baseline_done_on=None,
    )
    await hass.async_block_till_done()
    return task.id


def _entity_id(hass: HomeAssistant, platform: str, unique_id: str) -> str | None:
    return er.async_get(hass).async_get_entity_id(platform, DOMAIN, unique_id)


def _due_state(hass: HomeAssistant, plant_id: str, task_id: str) -> Any:
    entity_id = _entity_id(
        hass, "binary_sensor", f"{DOMAIN}:{plant_id}:care_task:{task_id}:due"
    )
    assert entity_id is not None
    return hass.states.get(entity_id)


def _next_id(hass: HomeAssistant, plant_id: str, task_id: str) -> str | None:
    return _entity_id(hass, "sensor", f"{DOMAIN}:{plant_id}:care_task:{task_id}:next")


def _care_due(hass: HomeAssistant, plant_id: str) -> Any:
    entity_id = _entity_id(hass, "binary_sensor", f"{DOMAIN}:{plant_id}:care_due")
    assert entity_id is not None
    return hass.states.get(entity_id)


async def _change(hass: HomeAssistant, value: float | str) -> None:
    _set_temperature(hass, value)
    await hass.async_block_till_done()


async def _unload(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def test_role_reading_task_becomes_due_and_recovers(
    hass: HomeAssistant,
) -> None:
    entry, manager, plant_id = await _plant(hass)
    task_id = await _create(hass, manager, plant_id)

    state = _due_state(hass, plant_id, task_id)
    assert state.state == "off"
    assert state.name == "Aloe Winter protection"
    assert {
        key: state.attributes[key]
        for key in (
            "status",
            "next_due",
            "last_done",
            "task_type",
            "reading",
            "unit",
            "condition",
            "value",
            "reset_value",
            "source",
            "due_since",
            "due_at",
        )
    } == {
        "status": "watching",
        "next_due": None,
        "last_done": None,
        "task_type": "winter_protection",
        "reading": 12.0,
        "unit": "°C",
        "condition": "below",
        "value": 5.0,
        "reset_value": 5.0,
        "source": "temperature",
        "due_since": None,
        "due_at": None,
    }
    # Reading tasks have no date, so they get no "next due" sensor.
    assert _next_id(hass, plant_id, task_id) is None
    revision = manager.get_plant(plant_id).revision

    await _change(hass, 3)
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "on"
    assert state.attributes["status"] == "due"
    assert state.attributes["reading"] == 3.0
    assert state.attributes["due_since"] is not None
    care_due = _care_due(hass, plant_id)
    assert care_due.state == "on"
    assert care_due.attributes["due_tasks"] == ["Winter protection"]
    # Sensor-driven changes never touch the plant record.
    assert manager.get_plant(plant_id).revision == revision

    await _change(hass, 5)
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "off"
    assert state.attributes["status"] == "watching"
    assert state.attributes["due_since"] is None
    assert _care_due(hass, plant_id).state == "off"
    assert manager.get_plant(plant_id).revision == revision
    await _unload(hass, entry)


async def test_reset_value_keeps_the_task_due_until_reached(
    hass: HomeAssistant,
) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    task_id = await _create(hass, manager, plant_id, schedule=_reading(reset_value=8))
    assert _due_state(hass, plant_id, task_id).state == "on"

    await _change(hass, 7.5)
    assert _due_state(hass, plant_id, task_id).state == "on"
    await _change(hass, 8)
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "off"
    assert state.attributes["reset_value"] == 8.0
    # Between value and reset, an armed task does not become due again.
    await _change(hass, 6)
    assert _due_state(hass, plant_id, task_id).state == "off"
    await _unload(hass, entry)


async def test_done_waits_for_the_reading_to_recover(hass: HomeAssistant) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    task_id = await _create(hass, manager, plant_id)
    assert _due_state(hass, plant_id, task_id).state == "on"

    _updated, event = await manager.async_complete_care_task(
        plant_id, task_id, expected_revision=None
    )
    await hass.async_block_till_done()
    assert event.kind == "task"
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "off"
    assert state.attributes["status"] == "waiting"
    assert state.attributes["last_done"] is not None
    # A waiting task is not due, so it shows no due time.
    assert state.attributes["due_since"] is None

    await _change(hass, 2)
    assert _due_state(hass, plant_id, task_id).attributes["status"] == "waiting"
    await _change(hass, 6)
    assert _due_state(hass, plant_id, task_id).attributes["status"] == "watching"
    await _change(hass, 4)
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "on"
    assert state.attributes["status"] == "due"
    await _unload(hass, entry)


async def test_done_on_the_safe_side_rearms(hass: HomeAssistant) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=12)
    task_id = await _create(hass, manager, plant_id)
    await manager.async_complete_care_task(plant_id, task_id, expected_revision=None)
    await hass.async_block_till_done()
    assert _due_state(hass, plant_id, task_id).attributes["status"] == "watching"

    await _change(hass, 3)
    assert _due_state(hass, plant_id, task_id).state == "on"
    await _unload(hass, entry)


async def test_undo_done_rearms_and_is_due_again(hass: HomeAssistant) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    task_id = await _create(hass, manager, plant_id)
    due_since = _due_state(hass, plant_id, task_id).attributes["due_since"]
    updated, event = await manager.async_complete_care_task(
        plant_id, task_id, expected_revision=None
    )
    await hass.async_block_till_done()
    assert _due_state(hass, plant_id, task_id).attributes["status"] == "waiting"

    await manager.async_delete_care_event(
        plant_id, expected_revision=updated.revision, event_id=event.id
    )
    await hass.async_block_till_done()
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "on"
    assert state.attributes["status"] == "due"
    assert state.attributes["last_done"] is None
    assert state.attributes["due_since"] == due_since
    await _unload(hass, entry)


async def test_log_care_action_completes_a_reading_task(hass: HomeAssistant) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    task_id = await _create(hass, manager, plant_id)
    entity_id = _due_state(hass, plant_id, task_id).entity_id

    await hass.services.async_call(
        DOMAIN, "log_care", {"entity_id": entity_id}, blocking=True
    )
    await hass.async_block_till_done()

    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "off"
    assert state.attributes["status"] == "waiting"
    events = manager.get_plant(plant_id).care_events
    assert [(event.kind, event.task_id) for event in events] == [("task", task_id)]
    await _unload(hass, entry)


async def test_reading_tasks_cannot_be_skipped(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    task_id = await _create(hass, manager, plant_id)
    entity_id = _due_state(hass, plant_id, task_id).entity_id
    revision = manager.get_plant(plant_id).revision

    with pytest.raises(ServiceValidationError) as err:
        await hass.services.async_call(
            DOMAIN, "skip_care_task", {"entity_id": entity_id}, blocking=True
        )
    assert err.value.translation_key == "reading_task_skip"
    with pytest.raises(SmartPlantsValidationError, match="cannot be skipped"):
        await manager.async_skip_care_task(plant_id, task_id, expected_revision=None)

    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/care_tasks/skip",
            "plant_id": plant_id,
            "task_id": task_id,
            "expected_revision": revision,
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "invalid_format"
    assert "cannot be skipped" in response["error"]["message"]
    plant = manager.get_plant(plant_id)
    assert plant.revision == revision
    assert plant.care_task(task_id).last_skipped_on is None  # type: ignore[union-attr]
    await _unload(hass, entry)


async def test_only_after_timer(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    entry, manager, plant_id = await _plant(hass)
    task_id = await _create(hass, manager, plant_id, schedule=_reading(for_minutes=30))

    start = dt_util.utcnow()
    await _change(hass, 3)
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "off"
    assert state.attributes["status"] == "watching"
    assert state.attributes["due_at"] == (start + timedelta(minutes=30)).isoformat()

    freezer.tick(timedelta(minutes=20))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert _due_state(hass, plant_id, task_id).state == "off"

    # A reading on the safe side restarts the count.
    await _change(hass, 6)
    assert _due_state(hass, plant_id, task_id).attributes["due_at"] is None
    restart = dt_util.utcnow()
    await _change(hass, 2)
    assert (
        _due_state(hass, plant_id, task_id).attributes["due_at"]
        == (restart + timedelta(minutes=30)).isoformat()
    )
    freezer.tick(timedelta(minutes=29))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert _due_state(hass, plant_id, task_id).state == "off"

    freezer.tick(timedelta(minutes=1, seconds=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "on"
    assert state.attributes["status"] == "due"
    assert state.attributes["due_at"] is None
    await _unload(hass, entry)


async def test_only_after_restarts_counting_after_a_reload(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    entry, manager, plant_id = await _plant(hass)
    task_id = await _create(hass, manager, plant_id, schedule=_reading(for_minutes=30))
    await _change(hass, 3)
    freezer.tick(timedelta(minutes=20))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded = dt_util.utcnow()
    state = _due_state(hass, plant_id, task_id)
    assert state.attributes["status"] == "watching"
    assert state.attributes["due_at"] == (reloaded + timedelta(minutes=30)).isoformat()

    freezer.tick(timedelta(minutes=15))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert _due_state(hass, plant_id, task_id).state == "off"
    freezer.tick(timedelta(minutes=16))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert _due_state(hass, plant_id, task_id).state == "on"
    await _unload(hass, entry)


async def test_due_state_survives_a_reload(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    task_id = await _create(hass, manager, plant_id)
    due_since = _due_state(hass, plant_id, task_id).attributes["due_since"]
    assert due_since is not None

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    stored = hass_storage[READING_STATE_STORAGE_KEY]["data"]["tasks"]
    assert set(stored) == {task_id}
    assert stored[task_id]["triggered_at"] is not None
    assert stored[task_id]["rearmed_at"] is None

    state = _due_state(hass, plant_id, task_id)
    assert state.state == "on"
    assert state.attributes["due_since"] == due_since
    await _unload(hass, entry)


async def test_entity_source_converts_units(hass: HomeAssistant) -> None:
    entry, manager, plant_id = await _plant(hass)
    hass.states.async_set(
        FROST,
        "50",
        {
            "unit_of_measurement": UnitOfTemperature.FAHRENHEIT,
            "device_class": "temperature",
        },
    )
    task_id = await _create(
        hass,
        manager,
        plant_id,
        schedule=_reading(source={"entity_id": FROST}, unit="°C"),
    )
    state = _due_state(hass, plant_id, task_id)
    assert state.attributes["source"] == FROST
    assert state.attributes["reading"] == pytest.approx(10.0)
    assert state.attributes["status"] == "watching"

    hass.states.async_set(
        FROST,
        "39.2",
        {
            "unit_of_measurement": UnitOfTemperature.FAHRENHEIT,
            "device_class": "temperature",
        },
    )
    await hass.async_block_till_done()
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "on"
    assert state.attributes["reading"] == pytest.approx(4.0)

    # Converted readings are shown with two decimals: 33.1 °F is 0.6111 °C.
    hass.states.async_set(
        FROST,
        "33.1",
        {
            "unit_of_measurement": UnitOfTemperature.FAHRENHEIT,
            "device_class": "temperature",
        },
    )
    await hass.async_block_till_done()
    assert _due_state(hass, plant_id, task_id).attributes["reading"] == 0.61

    # Unavailable or unconvertible readings change nothing but the status.
    hass.states.async_set(FROST, STATE_UNAVAILABLE)
    await hass.async_block_till_done()
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "on"
    assert state.attributes["status"] == "no_reading"
    assert state.attributes["reading"] is None
    hass.states.async_set(FROST, "60", {"unit_of_measurement": "lx"})
    await hass.async_block_till_done()
    assert _due_state(hass, plant_id, task_id).attributes["status"] == "no_reading"
    hass.states.async_set(FROST, "warm", CELSIUS)
    await hass.async_block_till_done()
    assert _due_state(hass, plant_id, task_id).attributes["status"] == "no_reading"
    hass.states.async_set(FROST, "6", CELSIUS)
    await hass.async_block_till_done()
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "off"
    assert state.attributes["status"] == "watching"
    await _unload(hass, entry)


async def test_role_without_a_valid_value_has_no_reading(hass: HomeAssistant) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    task_id = await _create(hass, manager, plant_id)
    assert _due_state(hass, plant_id, task_id).state == "on"

    await _change(hass, STATE_UNAVAILABLE)
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "on"
    assert state.attributes["status"] == "no_reading"
    assert state.attributes["reading"] is None

    humid = await _create(
        hass,
        manager,
        plant_id,
        task_type="custom",
        schedule=_reading(source={"role": "humidity"}, unit="%", value=40),
    )
    assert _due_state(hass, plant_id, humid).attributes["status"] == "no_reading"
    await _unload(hass, entry)


async def test_schedule_edits_start_over_and_text_edits_keep_state(
    hass: HomeAssistant,
) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    task_id = await _create(hass, manager, plant_id)
    due_since = _due_state(hass, plant_id, task_id).attributes["due_since"]

    plant = manager.get_plant(plant_id)
    await manager.async_update_care_task(
        plant_id, task_id, expected_revision=plant.revision, name="Fleece"
    )
    await hass.async_block_till_done()
    assert _due_state(hass, plant_id, task_id).attributes["due_since"] == due_since

    plant = manager.get_plant(plant_id)
    await manager.async_update_care_task(
        plant_id,
        task_id,
        expected_revision=plant.revision,
        schedule=_reading(value=2),
    )
    await hass.async_block_till_done()
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "off"
    assert state.attributes["due_since"] is None
    assert state.attributes["value"] == 2.0

    plant = manager.get_plant(plant_id)
    await manager.async_update_care_task(
        plant_id,
        task_id,
        expected_revision=plant.revision,
        schedule=_reading(value=4),
    )
    await hass.async_block_till_done()
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "on"
    assert state.attributes["due_since"] != due_since
    await _unload(hass, entry)


async def test_switching_kinds_removes_and_recreates_the_next_sensor(
    hass: HomeAssistant,
) -> None:
    entry, manager, plant_id = await _plant(hass)
    task_id = await _create(hass, manager, plant_id, schedule=WEEKLY)
    next_id = _next_id(hass, plant_id, task_id)
    assert next_id is not None

    plant = manager.get_plant(plant_id)
    await manager.async_update_care_task(
        plant_id, task_id, expected_revision=plant.revision, schedule=_reading()
    )
    await hass.async_block_till_done()
    assert _next_id(hass, plant_id, task_id) is None
    assert _due_state(hass, plant_id, task_id).attributes["status"] == "watching"

    plant = manager.get_plant(plant_id)
    await manager.async_update_care_task(
        plant_id, task_id, expected_revision=plant.revision, schedule=WEEKLY
    )
    await hass.async_block_till_done()
    recreated = _next_id(hass, plant_id, task_id)
    assert recreated is not None
    entry_row = er.async_get(hass).async_get(recreated)
    assert entry_row is not None
    assert entry_row.disabled_by is er.RegistryEntryDisabler.INTEGRATION
    state = _due_state(hass, plant_id, task_id)
    assert state.attributes["status"] == "due"
    assert "reading" not in state.attributes
    await _unload(hass, entry)


async def test_next_sensor_entries_of_reading_tasks_are_removed_on_setup(
    hass: HomeAssistant,
) -> None:
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(
            sensor_module._CareTaskNextDueSensor,
            "_attr_entity_registry_enabled_default",
            True,
        )
        entry, manager, plant_id = await _plant(hass)
        task_id = await _create(hass, manager, plant_id, schedule=WEEKLY)
        assert _next_id(hass, plant_id, task_id) is not None
        await _unload(hass, entry)
        del manager
        # Change the stored schedule while the entry is unloaded.
        offline = SmartPlantsManager(hass)
        await offline.async_load()
        plant = offline.get_plant(plant_id)
        await offline.async_update_care_task(
            plant_id, task_id, expected_revision=plant.revision, schedule=_reading()
        )
        await offline.async_unload()

        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        assert _next_id(hass, plant_id, task_id) is None
        await _unload(hass, entry)


async def test_deleting_tasks_and_plants_drops_their_state(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    first = await _create(hass, manager, plant_id)
    second = await _create(hass, manager, plant_id, task_type="custom")
    other = await manager.async_create_plant(name="Office Aloe")
    await manager.async_set_role_sources(
        other.id,
        role="temperature",
        expected_revision=other.revision,
        sources=[{"entity_id": TEMPERATURE}],
    )
    third = await _create(hass, manager, other.id)
    await _unload(hass, entry)
    assert set(hass_storage[READING_STATE_STORAGE_KEY]["data"]["tasks"]) == {
        first,
        second,
        third,
    }

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager = entry.runtime_data.manager
    plant = manager.get_plant(plant_id)
    await manager.async_delete_care_task(
        plant_id, first, expected_revision=plant.revision
    )
    plant = manager.get_plant(plant_id)
    # Leaving the reading kind drops the state as well.
    await manager.async_update_care_task(
        plant_id, second, expected_revision=plant.revision, schedule=WEEKLY
    )
    other_plant = manager.get_plant(other.id)
    await manager.async_delete_plant(other.id, expected_revision=other_plant.revision)
    await hass.async_block_till_done()
    await _unload(hass, entry)
    assert hass_storage[READING_STATE_STORAGE_KEY]["data"]["tasks"] == {}


async def test_unknown_state_entries_are_dropped_at_load(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[READING_STATE_STORAGE_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": READING_STATE_STORAGE_KEY,
        "data": {
            "tasks": {
                "7c9e6679742540de944be07fc1f90ae7": {
                    "triggered_at": "2026-01-01T00:00:00Z",
                    "rearmed_at": None,
                }
            }
        },
    }
    entry, manager, plant_id = await _plant(hass)
    task_id = await _create(hass, manager, plant_id)
    await _change(hass, 3)
    await _unload(hass, entry)
    assert set(hass_storage[READING_STATE_STORAGE_KEY]["data"]["tasks"]) == {task_id}


async def test_disabled_plant_stops_tracking(hass: HomeAssistant) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    task_id = await _create(hass, manager, plant_id)
    entity_id = _due_state(hass, plant_id, task_id).entity_id

    plant = manager.get_plant(plant_id)
    await manager.async_disable_plant(plant_id, expected_revision=plant.revision)
    await hass.async_block_till_done()
    assert hass.states.get(entity_id).state == STATE_UNAVAILABLE  # type: ignore[union-attr]
    await _change(hass, 12)

    plant = manager.get_plant(plant_id)
    await manager.async_reenable_plant(plant_id, expected_revision=plant.revision)
    await hass.async_block_till_done()
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "off"
    assert state.attributes["status"] == "watching"
    await _unload(hass, entry)


async def test_websocket_create_update_and_overview(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    interval_id = await _create(
        hass, manager, plant_id, task_type="fertilize", schedule=WEEKLY
    )
    client = await hass_ws_client(hass)

    plant = manager.get_plant(plant_id)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/care_tasks/create",
            "plant_id": plant_id,
            "expected_revision": plant.revision,
            "task_type": "winter_protection",
            "name": None,
            "schedule": _reading(reset_value=7),
            "instructions": None,
            "baseline_done_on": None,
        }
    )
    response = await client.receive_json()
    assert response["success"], response
    task_id = response["result"]["task_id"]
    view = response["result"]["plant"]
    assert view["care_tasks"][-1]["schedule"] == _reading(reset_value=7.0)

    await client.send_json_auto_id(
        {
            "type": "smart_plants/care_tasks/update",
            "plant_id": plant_id,
            "task_id": task_id,
            "expected_revision": view["revision"],
            "schedule": _reading(reset_value=1),
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "invalid_format"

    await client.send_json_auto_id(
        {
            "type": "smart_plants/care_tasks/update",
            "plant_id": plant_id,
            "task_id": task_id,
            "expected_revision": view["revision"],
            "schedule": {**_reading(), "extra": 1},
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "invalid_format"

    await client.send_json_auto_id({"type": "smart_plants/plants/overview"})
    response = await client.receive_json()
    assert response["success"], response
    care = response["result"]["plants"][0]["care"]
    by_id = {item["task_id"]: item for item in care}
    reading_view = by_id[task_id]
    assert reading_view["status"] == "due"
    assert reading_view["is_due"] is True
    assert reading_view["reading"] == 3.0
    assert reading_view["unit"] == "°C"
    assert reading_view["due_since"] is not None
    assert reading_view["due_at"] is None
    assert reading_view["next_due"] is None
    assert reading_view["days"] is None
    assert reading_view["window_end"] is None
    assert reading_view["resume_on"] is None
    assert "reading" not in by_id[interval_id]
    await _unload(hass, entry)


async def test_overview_sorts_reading_tasks(hass: HomeAssistant) -> None:
    from custom_components.smart_plants.overview import plant_overview  # noqa: PLC0415

    entry, manager, plant_id = await _plant(hass, temperature=3)
    dated = await _create(
        hass,
        manager,
        plant_id,
        task_type="repot",
        schedule={"kind": "yearly", "start_month": 1, "end_month": 1},
    )
    watching = await _create(
        hass,
        manager,
        plant_id,
        task_type="custom",
        schedule=_reading(condition="above", value=30, reset_value=None),
    )
    waiting = await _create(hass, manager, plant_id, task_type="custom")
    due = await _create(hass, manager, plant_id)
    no_reading = await _create(
        hass,
        manager,
        plant_id,
        task_type="custom",
        schedule=_reading(source={"role": "humidity"}, unit="%", value=40),
    )
    await manager.async_complete_care_task(plant_id, waiting, expected_revision=None)
    await hass.async_block_till_done()

    order = [
        item["task_id"]
        for item in plant_overview(manager, manager.get_plant(plant_id))["care"]
    ]
    assert order.index(due) < order.index(waiting)
    assert order.index(waiting) < order.index(watching)
    assert order.index(waiting) < order.index(no_reading)
    assert order.index(watching) < order.index(dated)
    assert order.index(no_reading) < order.index(dated)
    await _unload(hass, entry)


async def test_diagnostics_describe_reading_tasks_without_details(
    hass: HomeAssistant,
) -> None:
    entry, manager, plant_id = await _plant(hass, temperature=3)
    await _create(hass, manager, plant_id)
    hass.states.async_set(FROST, "50", CELSIUS)
    await _create(
        hass,
        manager,
        plant_id,
        task_type="custom",
        schedule=_reading(source={"entity_id": FROST}, condition="above", value=40),
    )

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)

    assert diagnostics["inventory"]["care_task_schedule_counts"] == {"reading": 2}
    assert diagnostics["reading_care_tasks"] == [
        {
            "kind": "reading",
            "condition": "below",
            "role_source": True,
            "entity_source": False,
            "status": "due",
        },
        {
            "kind": "reading",
            "condition": "above",
            "role_source": False,
            "entity_source": True,
            "status": "due",
        },
    ]
    assert FROST not in str(diagnostics)
    assert "Winter protection" not in str(diagnostics)
    await _unload(hass, entry)
