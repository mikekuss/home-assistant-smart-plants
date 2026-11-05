"""Care buttons and "last" sensors: creation, defaults, values, and presses."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from custom_components.smart_plants import button as button_module
from custom_components.smart_plants import sensor as sensor_module
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.storage import (
    SmartPlantsStorageError,
    SmartPlantsStorageFullError,
)
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry

WEEKLY = {"kind": "interval", "every": 1, "unit": "weeks", "growing_season_only": False}
READING = {
    "kind": "reading",
    "source": {"role": "temperature"},
    "condition": "below",
    "value": 5.0,
    "unit": "°C",
    "for_minutes": 0,
    "reset_value": None,
}


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _plant(hass: HomeAssistant) -> tuple[SmartPlantsManager, str]:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    return manager, plant.id


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


def _task_entity_id(
    hass: HomeAssistant, platform: str, plant_id: str, task_id: str, suffix: str
) -> str | None:
    return _entity_id(
        hass, platform, f"{DOMAIN}:{plant_id}:care_task:{task_id}:{suffix}"
    )


def _timestamp(hass: HomeAssistant, entity_id: str) -> datetime | None:
    state = hass.states.get(entity_id)
    assert state is not None
    if state.state == STATE_UNKNOWN:
        return None
    return dt_util.parse_datetime(state.state)


async def _press(hass: HomeAssistant, entity_id: str) -> None:
    await hass.services.async_call(
        "button", "press", {"entity_id": entity_id}, blocking=True
    )
    await hass.async_block_till_done()


@pytest.fixture
def enable_all() -> Any:
    with (
        patch.object(
            button_module.SmartPlantsButtonEntity,
            "_attr_entity_registry_enabled_default",
            new=True,
        ),
        patch.object(
            sensor_module._LastWateredSensor,
            "_attr_entity_registry_enabled_default",
            new=True,
        ),
        patch.object(
            sensor_module._CareTaskSensor,
            "_attr_entity_registry_enabled_default",
            new=True,
        ),
    ):
        yield


async def test_new_entities_are_disabled_by_default(hass: HomeAssistant) -> None:
    manager, plant_id = await _plant(hass)
    task_id = await _create_task(hass, manager, plant_id)
    registry = er.async_get(hass)

    entity_ids = [
        _entity_id(hass, "sensor", f"{DOMAIN}:{plant_id}:last_watered"),
        _entity_id(hass, "button", f"{DOMAIN}:{plant_id}:watered"),
        _task_entity_id(hass, "sensor", plant_id, task_id, "last"),
        _task_entity_id(hass, "button", plant_id, task_id, "done"),
    ]
    assert entity_ids == [
        "sensor.aloe_last_watered",
        "button.aloe_watered",
        "sensor.aloe_fertilize_last_done",
        "button.aloe_fertilize_done",
    ]
    for entity_id in entity_ids:
        entry = registry.async_get(entity_id or "")
        assert entry is not None
        assert entry.disabled_by is er.RegistryEntryDisabler.INTEGRATION
        assert hass.states.get(entity_id or "") is None


async def test_plant_without_tasks_has_no_task_entities(hass: HomeAssistant) -> None:
    _manager, plant_id = await _plant(hass)
    entries = er.async_entries_for_config_entry(
        er.async_get(hass), hass.config_entries.async_entries(DOMAIN)[0].entry_id
    )
    assert not [
        entry
        for entry in entries
        if entry.domain == "button" and ":care_task:" in entry.unique_id
    ]
    assert _entity_id(hass, "button", f"{DOMAIN}:{plant_id}:watered") is not None


@pytest.mark.usefixtures("enable_all")
async def test_last_watered_follows_the_care_log(hass: HomeAssistant) -> None:
    manager, plant_id = await _plant(hass)
    entity_id = _entity_id(hass, "sensor", f"{DOMAIN}:{plant_id}:last_watered") or ""
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == STATE_UNKNOWN
    assert state.attributes["device_class"] == "timestamp"
    assert state.attributes["friendly_name"] == "Aloe Last watered"

    await manager.async_add_care_event(
        plant_id,
        expected_revision=None,
        kind="watering",
        occurred_at="2026-01-02T08:30:00+01:00",
        payload={"note": None},
    )
    await hass.async_block_till_done()
    assert _timestamp(hass, entity_id) == datetime.fromisoformat(
        "2026-01-02T08:30:00+01:00"
    )


@pytest.mark.usefixtures("enable_all")
async def test_watered_button_logs_a_watering(hass: HomeAssistant) -> None:
    manager, plant_id = await _plant(hass)
    button_id = _entity_id(hass, "button", f"{DOMAIN}:{plant_id}:watered") or ""
    sensor_id = _entity_id(hass, "sensor", f"{DOMAIN}:{plant_id}:last_watered") or ""
    before = dt_util.now().replace(microsecond=0)

    await _press(hass, button_id)

    events = manager.get_plant(plant_id).care_events
    assert len(events) == 1
    assert events[0].kind == "watering"
    assert events[0].provenance == "action"
    assert events[0].task_id is None
    assert events[0].note is None
    last = _timestamp(hass, sensor_id)
    assert last is not None
    assert last >= before


@pytest.mark.usefixtures("enable_all")
async def test_done_button_marks_the_task_done(hass: HomeAssistant) -> None:
    manager, plant_id = await _plant(hass)
    task_id = await _create_task(hass, manager, plant_id)
    button_id = _task_entity_id(hass, "button", plant_id, task_id, "done") or ""
    due_id = _task_entity_id(hass, "binary_sensor", plant_id, task_id, "due") or ""
    last_id = _task_entity_id(hass, "sensor", plant_id, task_id, "last") or ""
    assert hass.states.get(due_id).state == "on"  # type: ignore[union-attr]
    assert _timestamp(hass, last_id) is None
    button = hass.states.get(button_id)
    assert button is not None
    assert button.attributes["friendly_name"] == "Aloe Fertilize done"

    await _press(hass, button_id)

    events = manager.get_plant(plant_id).care_events
    assert [(event.kind, event.task_id, event.provenance) for event in events] == [
        ("fertilizing", task_id, "action")
    ]
    assert hass.states.get(due_id).state == "off"  # type: ignore[union-attr]
    assert _timestamp(hass, last_id) == datetime.fromisoformat(events[0].occurred_at)


@pytest.mark.usefixtures("enable_all")
async def test_done_button_works_for_reading_tasks(hass: HomeAssistant) -> None:
    manager, plant_id = await _plant(hass)
    task_id = await _create_task(
        hass, manager, plant_id, task_type="winter_protection", schedule=READING
    )
    assert _task_entity_id(hass, "sensor", plant_id, task_id, "next") is None
    last_id = _task_entity_id(hass, "sensor", plant_id, task_id, "last") or ""
    button_id = _task_entity_id(hass, "button", plant_id, task_id, "done") or ""

    await _press(hass, button_id)

    events = manager.get_plant(plant_id).care_events
    assert [(event.kind, event.task_id) for event in events] == [("task", task_id)]
    assert _timestamp(hass, last_id) is not None


@pytest.mark.usefixtures("enable_all")
async def test_last_done_uses_the_entered_date_and_ignores_skips(
    hass: HomeAssistant,
) -> None:
    manager, plant_id = await _plant(hass)
    baseline = (dt_util.now().date().replace(day=1)).isoformat()
    task_id = await _create_task(
        hass, manager, plant_id, task_type="prune", baseline_done_on=baseline
    )
    last_id = _task_entity_id(hass, "sensor", plant_id, task_id, "last") or ""
    expected = dt_util.start_of_local_day(datetime.fromisoformat(baseline).date())
    assert _timestamp(hass, last_id) == expected

    await manager.async_skip_care_task(plant_id, task_id, expected_revision=None)
    await hass.async_block_till_done()
    assert _timestamp(hass, last_id) == expected

    _plant_record, event = await manager.async_complete_care_task(
        plant_id, task_id, expected_revision=None
    )
    await hass.async_block_till_done()
    assert _timestamp(hass, last_id) == datetime.fromisoformat(event.occurred_at)


@pytest.mark.usefixtures("enable_all")
async def test_named_tasks_name_their_entities(hass: HomeAssistant) -> None:
    manager, plant_id = await _plant(hass)
    task_id = await _create_task(
        hass, manager, plant_id, task_type="custom", name="Mist leaves"
    )
    assert _task_entity_id(hass, "button", plant_id, task_id, "done") == (
        "button.aloe_mist_leaves_done"
    )
    assert _task_entity_id(hass, "sensor", plant_id, task_id, "last") == (
        "sensor.aloe_mist_leaves_last_done"
    )
    state = hass.states.get("button.aloe_mist_leaves_done")
    assert state is not None
    assert state.attributes["friendly_name"] == "Aloe Mist leaves done"


@pytest.mark.usefixtures("enable_all")
async def test_deleting_a_task_removes_its_button_and_sensor(
    hass: HomeAssistant,
) -> None:
    manager, plant_id = await _plant(hass)
    task_id = await _create_task(hass, manager, plant_id)
    assert _task_entity_id(hass, "button", plant_id, task_id, "done") is not None

    plant = manager.get_plant(plant_id)
    await manager.async_delete_care_task(
        plant_id, task_id, expected_revision=plant.revision
    )
    await hass.async_block_till_done()

    assert _task_entity_id(hass, "button", plant_id, task_id, "done") is None
    assert _task_entity_id(hass, "sensor", plant_id, task_id, "last") is None
    assert _entity_id(hass, "button", f"{DOMAIN}:{plant_id}:watered") is not None


@pytest.mark.usefixtures("enable_all")
async def test_deleting_the_plant_removes_the_new_entities(
    hass: HomeAssistant,
) -> None:
    manager, plant_id = await _plant(hass)
    task_id = await _create_task(hass, manager, plant_id)
    plant = manager.get_plant(plant_id)

    await manager.async_delete_plant(plant_id, expected_revision=plant.revision)
    await hass.async_block_till_done()

    assert _entity_id(hass, "button", f"{DOMAIN}:{plant_id}:watered") is None
    assert _entity_id(hass, "sensor", f"{DOMAIN}:{plant_id}:last_watered") is None
    assert _task_entity_id(hass, "button", plant_id, task_id, "done") is None


@pytest.mark.usefixtures("enable_all")
async def test_paused_plant_buttons_are_unavailable(hass: HomeAssistant) -> None:
    manager, plant_id = await _plant(hass)
    task_id = await _create_task(hass, manager, plant_id)
    button_ids = [
        _entity_id(hass, "button", f"{DOMAIN}:{plant_id}:watered") or "",
        _task_entity_id(hass, "button", plant_id, task_id, "done") or "",
    ]
    plant = manager.get_plant(plant_id)
    await manager.async_disable_plant(plant_id, expected_revision=plant.revision)
    await hass.async_block_till_done()

    for entity_id in button_ids:
        state = hass.states.get(entity_id)
        assert state is not None
        assert state.state == STATE_UNAVAILABLE
    entity = manager.get_entity("button", plant_id, "watered")
    assert entity is not None
    with pytest.raises(HomeAssistantError) as raised:
        await entity.async_press()
    assert raised.value.translation_key == "plant_disabled"
    assert manager.get_plant(plant_id).care_events == ()


@pytest.mark.usefixtures("enable_all")
@pytest.mark.parametrize(
    ("error", "key"),
    [
        (SmartPlantsStorageFullError("full"), "storage_full"),
        (SmartPlantsStorageError("failed"), "storage_failed"),
    ],
)
async def test_press_reports_a_failed_save(
    hass: HomeAssistant, error: Exception, key: str
) -> None:
    manager, plant_id = await _plant(hass)
    button_id = _entity_id(hass, "button", f"{DOMAIN}:{plant_id}:watered") or ""

    with (
        patch.object(
            manager, "async_apply_plant_changes", AsyncMock(side_effect=error)
        ),
        pytest.raises(HomeAssistantError) as raised,
    ):
        await _press(hass, button_id)

    assert raised.value.translation_key == key
    assert manager.get_plant(plant_id).care_events == ()


def test_translations_and_icons_cover_the_new_entities() -> None:
    root = Path(__file__).parent.parent / "custom_components" / "smart_plants"
    icons = json.loads((root / "icons.json").read_text(encoding="utf-8"))["entity"]
    task_types = ("fertilize", "prune", "repot", "pests", "winter_protection", "custom")
    for language_file in (
        "strings.json",
        "translations/en.json",
        "translations/de.json",
    ):
        entity = json.loads((root / language_file).read_text(encoding="utf-8"))[
            "entity"
        ]
        assert "watered" in entity["button"]
        assert "last_watered" in entity["sensor"]
        for task_type in task_types:
            assert f"care_task_{task_type}_done" in entity["button"]
            assert f"care_task_{task_type}_last" in entity["sensor"]
            assert f"care_task_{task_type}_done" in icons["button"]
            assert f"care_task_{task_type}_last" in icons["sensor"]
        assert "{task_name}" in entity["button"]["care_task_named_done"]["name"]
        assert "{task_name}" in entity["sensor"]["care_task_named_last"]["name"]
