"""Staleness follows when a source last reported, not when its value last changed."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantRecord
from homeassistant.const import STATE_UNAVAILABLE, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

STALE_AFTER = 60
MOISTURE = {"unit_of_measurement": "%", "device_class": "moisture"}


async def _setup(hass: HomeAssistant) -> SmartPlantsManager:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


async def _plant_with_moisture(manager: SmartPlantsManager, entity_id: str) -> str:
    plant = await manager.async_create_plant(name="Aloe")
    assigned = await manager.async_set_moisture_sources(
        plant.id, expected_revision=plant.revision, sources=[{"entity_id": entity_id}]
    )
    selected = await manager.async_set_moisture_primary(
        plant.id, expected_revision=assigned.revision, primary_entity_id=entity_id
    )
    await manager.async_set_stale_after(
        plant.id, expected_revision=selected.revision, stale_after_seconds=STALE_AFTER
    )
    return plant.id


async def _advance(hass: HomeAssistant, freezer: Any, seconds: int) -> None:
    now = dt_util.utcnow() + timedelta(seconds=seconds)
    freezer.move_to(now)
    async_fire_time_changed(hass, now)
    await hass.async_block_till_done()


async def test_repeated_identical_reports_keep_a_source_fresh(
    hass: HomeAssistant, freezer: Any
) -> None:
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_moisture", "42", MOISTURE)
    plant_id = await _plant_with_moisture(manager, "sensor.mock_moisture")
    await hass.async_block_till_done()
    controller = manager.get_moisture_controller(plant_id)
    assert controller is not None

    # The sensor keeps reporting the same value, which Home Assistant records as
    # a report without a state change.
    for _ in range(4):
        await _advance(hass, freezer, 40)
        hass.states.async_set("sensor.mock_moisture", "42", MOISTURE)
        await hass.async_block_till_done()

    await _advance(hass, freezer, 40)
    evaluation = controller.current_evaluation
    assert evaluation.sensor_stale is False
    assert evaluation.computed_available is True


async def test_silent_source_still_becomes_stale(
    hass: HomeAssistant, freezer: Any
) -> None:
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_moisture", "42", MOISTURE)
    plant_id = await _plant_with_moisture(manager, "sensor.mock_moisture")
    await hass.async_block_till_done()
    controller = manager.get_moisture_controller(plant_id)
    assert controller is not None

    await _advance(hass, freezer, STALE_AFTER + 10)
    assert controller.current_evaluation.sensor_stale is True


async def test_identical_report_clears_staleness_immediately(
    hass: HomeAssistant, freezer: Any
) -> None:
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_moisture", "42", MOISTURE)
    plant_id = await _plant_with_moisture(manager, "sensor.mock_moisture")
    await hass.async_block_till_done()
    controller = manager.get_moisture_controller(plant_id)
    assert controller is not None
    await _advance(hass, freezer, STALE_AFTER + 10)
    assert controller.current_evaluation.sensor_stale is True

    hass.states.async_set("sensor.mock_moisture", "42", MOISTURE)
    await hass.async_block_till_done()

    evaluation = controller.current_evaluation
    assert evaluation.sensor_stale is False
    assert evaluation.computed_available is True


async def test_repeated_unavailable_reports_do_not_count_as_fresh(
    hass: HomeAssistant, freezer: Any
) -> None:
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_moisture", "42", MOISTURE)
    plant_id = await _plant_with_moisture(manager, "sensor.mock_moisture")
    await hass.async_block_till_done()
    controller = manager.get_moisture_controller(plant_id)
    assert controller is not None

    await _advance(hass, freezer, 10)
    hass.states.async_set("sensor.mock_moisture", STATE_UNAVAILABLE, MOISTURE)
    await hass.async_block_till_done()
    for _ in range(3):
        await _advance(hass, freezer, 30)
        hass.states.async_set("sensor.mock_moisture", STATE_UNAVAILABLE, MOISTURE)
        await hass.async_block_till_done()

    await _advance(hass, freezer, 10)
    assert controller.current_evaluation.sensor_stale is True


async def test_other_roles_use_reports_for_staleness(
    hass: HomeAssistant, freezer: Any
) -> None:
    manager = await _setup(hass)
    attributes = {
        "unit_of_measurement": UnitOfTemperature.CELSIUS,
        "device_class": "temperature",
    }
    hass.states.async_set("sensor.mock_temperature", "21", attributes)
    plant: PlantRecord = await manager.async_create_plant(name="Aloe")
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_temperature"}],
    )
    selected = await manager.async_set_role_primary(
        plant.id,
        role="temperature",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.mock_temperature",
    )
    await manager.async_set_role_stale_after(
        plant.id,
        role="temperature",
        expected_revision=selected.revision,
        stale_after_seconds=STALE_AFTER,
    )
    await hass.async_block_till_done()
    controller = manager.get_role_controller(plant.id, "temperature")
    assert controller is not None

    for _ in range(4):
        await _advance(hass, freezer, 40)
        hass.states.async_set("sensor.mock_temperature", "21", attributes)
        await hass.async_block_till_done()

    await _advance(hass, freezer, 40)
    assert controller.current_evaluation.sensor_stale is False
