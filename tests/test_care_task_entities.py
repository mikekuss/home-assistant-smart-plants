"""Care task entities: creation, removal, naming, daily refresh, and unload."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from custom_components.smart_plants import sensor as sensor_module
from custom_components.smart_plants.care_entities import CareEntityLifecycle
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import CoreState, HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

WEEKLY = {"kind": "interval", "every": 1, "unit": "weeks", "growing_season_only": False}
EVERY_TWO_DAYS = {
    "kind": "interval",
    "every": 2,
    "unit": "days",
    "growing_season_only": False,
}


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _create_task(  # noqa: PLR0913
    hass: HomeAssistant,
    manager: SmartPlantsManager,
    plant_id: str,
    *,
    task_type: str = "fertilize",
    name: str | None = None,
    schedule: dict[str, Any] | None = None,
    baseline_done_on: str | None = None,
) -> str:
    plant = manager.get_plant(plant_id)
    _updated, task = await manager.async_create_care_task(
        plant_id,
        expected_revision=plant.revision,
        task_type=task_type,
        name=name,
        schedule=schedule or WEEKLY,
        instructions=None,
        baseline_done_on=baseline_done_on,
    )
    await hass.async_block_till_done()
    return task.id


def _entity_id(hass: HomeAssistant, platform: str, unique_id: str) -> str | None:
    return er.async_get(hass).async_get_entity_id(platform, DOMAIN, unique_id)


def _due_id(hass: HomeAssistant, plant_id: str, task_id: str) -> str | None:
    return _entity_id(
        hass, "binary_sensor", f"{DOMAIN}:{plant_id}:care_task:{task_id}:due"
    )


def _next_id(hass: HomeAssistant, plant_id: str, task_id: str) -> str | None:
    return _entity_id(hass, "sensor", f"{DOMAIN}:{plant_id}:care_task:{task_id}:next")


def _care_due_id(hass: HomeAssistant, plant_id: str) -> str | None:
    return _entity_id(hass, "binary_sensor", f"{DOMAIN}:{plant_id}:care_due")


@pytest.fixture
def enable_next_due() -> Any:
    with patch.object(
        sensor_module._CareTaskNextDueSensor,
        "_attr_entity_registry_enabled_default",
        new=True,
    ):
        yield


async def test_no_care_entities_without_tasks(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    plant = await entry.runtime_data.manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    assert _care_due_id(hass, plant.id) is None


async def test_task_creates_entities(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(hass, manager, plant.id)

    due_id = _due_id(hass, plant.id, task_id)
    assert due_id == "binary_sensor.aloe_fertilize"
    state = hass.states.get(due_id)
    assert state is not None
    # A new task without any history is due on the day it was created.
    assert state.state == "on"
    assert "device_class" not in state.attributes
    assert state.attributes["friendly_name"] == "Aloe Fertilize"
    assert state.attributes["status"] == "due"
    assert state.attributes["next_due"] == dt_util.now().date().isoformat()
    assert state.attributes["last_done"] is None
    assert state.attributes["task_type"] == "fertilize"

    care_due_id = _care_due_id(hass, plant.id)
    assert care_due_id == "binary_sensor.aloe_care_due"
    care_due = hass.states.get(care_due_id)
    assert care_due is not None
    assert care_due.state == "on"
    assert "device_class" not in care_due.attributes
    assert care_due.attributes["due_tasks"] == ["Fertilize"]
    assert care_due.attributes["resting"] is False


async def test_next_due_sensor_is_disabled_by_default(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(hass, manager, plant.id)

    next_id = _next_id(hass, plant.id, task_id)
    assert next_id is not None
    registry_entry = er.async_get(hass).async_get(next_id)
    assert registry_entry is not None
    assert registry_entry.disabled_by is er.RegistryEntryDisabler.INTEGRATION
    assert hass.states.get(next_id) is None


@pytest.mark.usefixtures("enable_next_due")
async def test_next_due_sensor_reports_local_midnight(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to("2026-06-14T12:00:00-07:00")
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(
        hass, manager, plant.id, schedule=EVERY_TWO_DAYS, baseline_done_on="2026-06-13"
    )

    next_id = _next_id(hass, plant.id, task_id)
    assert next_id == "sensor.aloe_fertilize_next_due"
    state = hass.states.get(next_id)
    assert state is not None
    assert state.attributes["device_class"] == "timestamp"
    # Midnight of 2026-06-15 in the test time zone (US/Pacific, UTC-7).
    assert state.state == "2026-06-15T07:00:00+00:00"


async def test_custom_name_and_rename_keep_unique_ids(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(
        hass, manager, plant.id, task_type="custom", name="Mist leaves"
    )

    due_id = _due_id(hass, plant.id, task_id)
    next_id = _next_id(hass, plant.id, task_id)
    assert due_id == "binary_sensor.aloe_mist_leaves"
    assert next_id == "sensor.aloe_mist_leaves_next_due"
    state = hass.states.get(due_id)
    assert state is not None
    assert state.attributes["friendly_name"] == "Aloe Mist leaves"
    assert state.attributes["task_type"] == "custom"

    plant = manager.get_plant(plant.id)
    await manager.async_update_care_task(
        plant.id,
        task_id,
        expected_revision=plant.revision,
        name="Wipe leaves",
        schedule=EVERY_TWO_DAYS,
    )
    await hass.async_block_till_done()

    assert _due_id(hass, plant.id, task_id) == due_id
    assert _next_id(hass, plant.id, task_id) == next_id
    state = hass.states.get(due_id)
    assert state is not None
    assert state.attributes["friendly_name"] == "Aloe Wipe leaves"
    care_due = hass.states.get(_care_due_id(hass, plant.id) or "")
    assert care_due is not None
    assert care_due.attributes["due_tasks"] == ["Wipe leaves"]


async def test_clearing_a_name_restores_the_type_name(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(hass, manager, plant.id, task_type="prune")
    due_id = _due_id(hass, plant.id, task_id)
    assert due_id == "binary_sensor.aloe_prune"

    for name, expected in (("Trim tips", "Aloe Trim tips"), (None, "Aloe Prune")):
        plant = manager.get_plant(plant.id)
        await manager.async_update_care_task(
            plant.id, task_id, expected_revision=plant.revision, name=name
        )
        await hass.async_block_till_done()
        state = hass.states.get(due_id)
        assert state is not None
        assert state.attributes["friendly_name"] == expected
    assert _due_id(hass, plant.id, task_id) == due_id


async def test_states_change_at_local_midnight(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to("2026-06-14T23:59:00-07:00")
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(
        hass, manager, plant.id, schedule=EVERY_TWO_DAYS, baseline_done_on="2026-06-13"
    )
    due_id = _due_id(hass, plant.id, task_id) or ""
    care_due_id = _care_due_id(hass, plant.id) or ""

    state = hass.states.get(due_id)
    assert state is not None
    assert state.state == "off"
    assert state.attributes["status"] == "scheduled"
    assert state.attributes["next_due"] == "2026-06-15"
    care_due = hass.states.get(care_due_id)
    assert care_due is not None
    assert care_due.state == "off"
    assert care_due.attributes["due_tasks"] == []

    freezer.move_to("2026-06-15T00:00:01-07:00")
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    state = hass.states.get(due_id)
    assert state is not None
    assert state.state == "on"
    assert state.attributes["status"] == "due"
    care_due = hass.states.get(care_due_id)
    assert care_due is not None
    assert care_due.state == "on"
    assert care_due.attributes["due_tasks"] == ["Fertilize"]

    # A day later the task is overdue and still due.
    freezer.move_to("2026-06-16T00:00:01-07:00")
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    state = hass.states.get(due_id)
    assert state is not None
    assert state.state == "on"
    assert state.attributes["status"] == "overdue"


async def test_time_zone_change_recomputes_states(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    # 23:30 on 2026-06-14 in US/Pacific is already 2026-06-15 in Berlin.
    freezer.move_to("2026-06-15T06:30:00+00:00")
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(
        hass, manager, plant.id, schedule=EVERY_TWO_DAYS, baseline_done_on="2026-06-13"
    )
    due_id = _due_id(hass, plant.id, task_id) or ""
    state = hass.states.get(due_id)
    assert state is not None
    assert state.state == "off"

    await hass.config.async_update(time_zone="Europe/Berlin")
    await hass.async_block_till_done()

    state = hass.states.get(due_id)
    assert state is not None
    assert state.state == "on"


async def test_completing_a_task_updates_states(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(hass, manager, plant.id)
    due_id = _due_id(hass, plant.id, task_id) or ""

    await manager.async_complete_care_task(plant.id, task_id, expected_revision=None)
    await hass.async_block_till_done()

    state = hass.states.get(due_id)
    assert state is not None
    assert state.state == "off"
    assert state.attributes["status"] == "scheduled"
    assert state.attributes["last_done"] == dt_util.now().date().isoformat()
    care_due = hass.states.get(_care_due_id(hass, plant.id) or "")
    assert care_due is not None
    assert care_due.state == "off"


async def test_rest_period_rests_growing_season_tasks(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to("2026-12-10T12:00:00-08:00")
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(
        hass,
        manager,
        plant.id,
        schedule={**WEEKLY, "growing_season_only": True},
    )
    due_id = _due_id(hass, plant.id, task_id) or ""
    care_due_id = _care_due_id(hass, plant.id) or ""
    state = hass.states.get(due_id)
    assert state is not None
    assert state.state == "on"

    plant = manager.get_plant(plant.id)
    await manager.async_set_rest_period(
        plant.id,
        expected_revision=plant.revision,
        rest_period={"start_month": 11, "end_month": 2},
    )
    await hass.async_block_till_done()

    state = hass.states.get(due_id)
    assert state is not None
    assert state.state == "off"
    assert state.attributes["status"] == "resting"
    assert state.attributes["next_due"] == "2027-03-01"
    care_due = hass.states.get(care_due_id)
    assert care_due is not None
    assert care_due.state == "off"
    assert care_due.attributes["resting"] is True


async def test_deleting_tasks_removes_their_entities(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    first = await _create_task(hass, manager, plant.id)
    second = await _create_task(hass, manager, plant.id, task_type="repot")
    first_due = _due_id(hass, plant.id, first)
    first_next = _next_id(hass, plant.id, first)
    assert first_due is not None
    assert first_next is not None
    care_due_id = _care_due_id(hass, plant.id)
    assert care_due_id is not None

    plant = manager.get_plant(plant.id)
    await manager.async_delete_care_task(
        plant.id, first, expected_revision=plant.revision
    )
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    assert registry.async_get(first_due) is None
    assert registry.async_get(first_next) is None
    assert hass.states.get(first_due) is None
    assert manager.get_entity("binary_sensor", plant.id, f"care_task:{first}:due") is (
        None
    )
    # The plant still has a task, so its "care due" sensor stays.
    assert _care_due_id(hass, plant.id) == care_due_id
    care_due = hass.states.get(care_due_id)
    assert care_due is not None
    assert care_due.attributes["due_tasks"] == ["Repot"]

    plant = manager.get_plant(plant.id)
    await manager.async_delete_care_task(
        plant.id, second, expected_revision=plant.revision
    )
    await hass.async_block_till_done()

    assert _due_id(hass, plant.id, second) is None
    assert _next_id(hass, plant.id, second) is None
    assert _care_due_id(hass, plant.id) is None
    assert hass.states.get(care_due_id) is None


async def test_deleting_the_plant_removes_care_entities(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(hass, manager, plant.id)
    due_id = _due_id(hass, plant.id, task_id) or ""

    plant = manager.get_plant(plant.id)
    await manager.async_delete_plant(plant.id, expected_revision=plant.revision)
    await hass.async_block_till_done()

    assert _due_id(hass, plant.id, task_id) is None
    assert _next_id(hass, plant.id, task_id) is None
    assert _care_due_id(hass, plant.id) is None
    assert hass.states.get(due_id) is None


async def test_disabled_plant_makes_care_entities_unavailable(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(hass, manager, plant.id)
    due_id = _due_id(hass, plant.id, task_id) or ""
    care_due_id = _care_due_id(hass, plant.id) or ""

    plant = manager.get_plant(plant.id)
    await manager.async_disable_plant(plant.id, expected_revision=plant.revision)
    await hass.async_block_till_done()
    for entity_id in (due_id, care_due_id):
        state = hass.states.get(entity_id)
        assert state is not None
        assert state.state == STATE_UNAVAILABLE

    plant = manager.get_plant(plant.id)
    await manager.async_reenable_plant(plant.id, expected_revision=plant.revision)
    await hass.async_block_till_done()
    for entity_id in (due_id, care_due_id):
        state = hass.states.get(entity_id)
        assert state is not None
        assert state.state == "on"


@pytest.mark.usefixtures("enable_next_due")
async def test_reload_keeps_entities_and_unload_stops_refresh(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to("2026-06-14T12:00:00-07:00")
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(hass, manager, plant.id, task_type="pests")
    due_id = _due_id(hass, plant.id, task_id)
    next_id = _next_id(hass, plant.id, task_id)
    assert due_id == "binary_sensor.aloe_check_for_pests"

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert _due_id(hass, plant.id, task_id) == due_id
    assert _next_id(hass, plant.id, task_id) == next_id
    state = hass.states.get(due_id or "")
    assert state is not None
    assert state.state == "on"

    lifecycles = entry.runtime_data.platform_lifecycles
    assert set(lifecycles) == {"sensor", "binary_sensor", "number"}
    subscribers = entry.runtime_data.manager._subscribers
    assert subscribers

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.NOT_LOADED
    state = hass.states.get(due_id or "")
    assert state is not None
    assert state.state == STATE_UNAVAILABLE

    # No refresh runs after unload, so the restored state stays unavailable.
    freezer.move_to("2026-06-15T00:00:01-07:00")
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    state = hass.states.get(due_id or "")
    assert state is not None
    assert state.state == STATE_UNAVAILABLE


async def test_setup_during_shutdown_starts_no_midnight_timer(
    hass: HomeAssistant,
) -> None:
    # A reload that finishes after the stop event must not leave a timer
    # that nothing cancels.
    entry = await _setup(hass)
    lifecycle = CareEntityLifecycle(
        hass, entry.runtime_data.manager, "binary_sensor", {}, {}, MagicMock()
    )
    hass.set_state(CoreState.stopping)
    try:
        await lifecycle.async_setup()
        assert lifecycle._unsub_midnight is None
    finally:
        hass.set_state(CoreState.running)
        await lifecycle.async_unload()


async def test_registry_entries_of_tasks_deleted_while_unloaded_are_removed(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(hass, manager, plant.id)
    registry = er.async_get(hass)
    stale = registry.async_get_or_create(
        "binary_sensor",
        DOMAIN,
        f"{DOMAIN}:{plant.id}:care_task:0123456789abcdef0123456789abcdef:due",
        config_entry=entry,
    )
    unrelated = registry.async_get_or_create(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:needs_water_extra"
    )

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    assert registry.async_get(stale.entity_id) is None
    assert registry.async_get(unrelated.entity_id) is not None
    assert _due_id(hass, plant.id, task_id) is not None


async def test_next_due_sensor_without_task_reads_unavailable(
    hass: HomeAssistant,
) -> None:
    # An entity that outlives its task, until the lifecycle removes it, must
    # read unavailable instead of raising.
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    task_id = await _create_task(hass, manager, plant.id)
    task = manager.get_plant(plant.id).care_task(task_id)
    assert task is not None
    entity = sensor_module._CareTaskNextDueSensor(manager, plant.id, task)
    before = entity.native_value
    assert before is not None

    plant = manager.get_plant(plant.id)
    await manager.async_delete_care_task(
        plant.id, task_id, expected_revision=plant.revision
    )
    await hass.async_block_till_done()
    after = entity.native_value
    assert after is None
    assert not entity.available


def test_icons_and_translations_cover_care_entities() -> None:
    root = Path(__file__).parent.parent / "custom_components" / "smart_plants"
    icons = json.loads((root / "icons.json").read_text(encoding="utf-8"))
    for language_file in (
        "strings.json",
        "translations/en.json",
        "translations/de.json",
    ):
        strings = json.loads((root / language_file).read_text(encoding="utf-8"))
        entity = strings["entity"]
        for platform, keys in icons["entity"].items():
            assert set(keys) <= set(entity[platform]), language_file
        for task_type in ("fertilize", "prune", "repot", "pests", "custom"):
            key = f"care_task_{task_type}"
            assert set(entity["binary_sensor"][key]["state"]) == {"on", "off"}
            assert f"{key}_next" in entity["sensor"]
        assert set(entity["binary_sensor"]["care_due"]["state"]) == {"on", "off"}
        assert "{task_name}" in entity["sensor"]["care_task_named_next"]["name"]
