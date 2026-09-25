from __future__ import annotations

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import TemperatureConfig
from homeassistant.const import EntityCategory, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def _loaded_manager(hass: HomeAssistant) -> SmartPlantsManager:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    return manager


async def _setup_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_new_plant_has_default_temperature_runtime_config(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    controller = manager.get_role_controller(plant.id, "temperature")
    assert controller is not None
    assert controller.current_evaluation.computed_available is False
    assert plant.role_config("temperature") is None


async def test_temperature_sources_round_trip_in_roles(
    hass: HomeAssistant,
) -> None:
    registry_entry = er.async_get(hass).async_get_or_create(
        "sensor", "example", "temperature", suggested_object_id="temperature"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[
            {"entity_id": registry_entry.entity_id, "registry_id": registry_entry.id}
        ],
    )
    config = updated.role_config("temperature")
    assert isinstance(config, TemperatureConfig)
    assert config.sources[0].registry_id == registry_entry.id

    reloaded = await _loaded_manager(hass)
    persisted = reloaded.snapshot.plants[plant.id].role_config("temperature")
    assert persisted == config


async def test_temperature_entity_metadata_and_state(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    # Entity-lifecycle contract: no computed entity until the role has a source.
    assert (
        registry.async_get_entity_id(
            "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:temperature"
        )
        is None
    )

    hass.states.async_set(
        "sensor.room_temp", "68", {"unit_of_measurement": UnitOfTemperature.FAHRENHEIT}
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.room_temp"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="temperature",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.room_temp",
    )
    await manager.async_set_role_aggregation(
        plant.id,
        role="temperature",
        expected_revision=assigned.revision + 1,
        aggregation="primary",
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:temperature"
    )
    assert entity_id is not None
    entity = manager.get_entity("sensor", plant.id, "temperature")
    assert entity.device_class == "temperature"
    assert entity.native_unit_of_measurement == UnitOfTemperature.CELSIUS
    assert entity.state_class == "measurement"
    assert entity.entity_category is not EntityCategory.CONFIG
    state = hass.states.get(entity_id)
    assert state is not None
    assert float(state.state) == pytest.approx(20.0)


async def test_temperature_stress_entity_metadata_and_state(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    # Entity-lifecycle contract: no problem binary until the role has a source.
    assert (
        registry.async_get_entity_id(
            "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:temperature_stress"
        )
        is None
    )

    hass.states.async_set(
        "sensor.room_temp", "95", {"unit_of_measurement": UnitOfTemperature.FAHRENHEIT}
    )
    await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.room_temp"}],
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:temperature_stress"
    )
    assert entity_id is not None
    entity = manager.get_entity("binary_sensor", plant.id, "temperature_stress")
    assert entity.device_class == "problem"
    assert entity.entity_category is None
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "on"
    assert state.attributes["confidence"] == "low"
    assert state.attributes["reason"] == "hot_stress"
    assert state.attributes["cold_threshold_celsius"] == 10.0
    assert state.attributes["cold_clear_celsius"] == 12.0
    assert state.attributes["hot_threshold_celsius"] == 35.0
    assert state.attributes["hot_clear_celsius"] == 32.0


async def test_temperature_stress_does_not_change_moisture_health(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    hass.states.async_set("sensor.soil", "40", {"unit_of_measurement": "%"})
    moisture_sources = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.soil"}],
    )
    await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=moisture_sources.revision,
        primary_entity_id="sensor.soil",
    )
    moisture_controller = manager.get_moisture_controller(plant.id)
    assert moisture_controller is not None
    before = moisture_controller.current_evaluation.health_score

    hass.states.async_set(
        "sensor.temp", "35", {"unit_of_measurement": UnitOfTemperature.CELSIUS}
    )
    await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=moisture_sources.revision + 1,
        sources=[{"entity_id": "sensor.temp"}],
    )
    assert moisture_controller.current_evaluation.health_score == before


async def test_temperature_registry_rename_updates_source(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        "sensor", "example", "rename-temp", suggested_object_id="old_temp"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": entry.entity_id, "registry_id": entry.id}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="temperature",
        expected_revision=updated.revision,
        primary_entity_id=entry.entity_id,
    )
    registry.async_update_entity(entry.entity_id, new_entity_id="sensor.new_temp")
    await hass.async_block_till_done()
    await hass.async_block_till_done()
    config = manager.get_plant(plant.id).role_config("temperature")
    assert isinstance(config, TemperatureConfig)
    assert config.sources[0].entity_id == "sensor.new_temp"
    assert config.primary_entity_id == "sensor.new_temp"


async def test_temperature_does_not_change_moisture_outputs(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    hass.states.async_set("sensor.soil", "40", {"unit_of_measurement": "%"})
    moisture_sources = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.soil"}],
    )
    moisture_primary = await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=moisture_sources.revision,
        primary_entity_id="sensor.soil",
    )
    moisture_controller = manager.get_moisture_controller(plant.id)
    assert moisture_controller is not None
    before = moisture_controller.current_evaluation

    hass.states.async_set(
        "sensor.temp", "20", {"unit_of_measurement": UnitOfTemperature.CELSIUS}
    )
    await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=moisture_primary.revision,
        sources=[{"entity_id": "sensor.temp"}],
    )
    after = moisture_controller.current_evaluation
    assert after == before


def test_temperature_config_rejects_bad_storage() -> None:
    with pytest.raises(ValueError, match="aggregation"):
        TemperatureConfig.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "median",
                "stale_after_seconds": 21600,
            }
        )
    with pytest.raises(ValueError, match="stale_after"):
        TemperatureConfig.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "average",
                "stale_after_seconds": 30,
            }
        )
