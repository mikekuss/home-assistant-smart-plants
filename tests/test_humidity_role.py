from __future__ import annotations

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import HumidityConfig
from custom_components.smart_plants.repairs import _issue_id
from homeassistant.const import PERCENTAGE, EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
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


async def test_new_plant_has_default_humidity_runtime_config(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    controller = manager.get_role_controller(plant.id, "humidity")
    assert controller is not None
    assert controller.current_evaluation.computed_available is False
    assert plant.role_config("humidity") is None


async def test_humidity_sources_round_trip_in_roles(
    hass: HomeAssistant,
) -> None:
    registry_entry = er.async_get(hass).async_get_or_create(
        "sensor", "example", "humidity", suggested_object_id="humidity"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="humidity",
        expected_revision=plant.revision,
        sources=[
            {"entity_id": registry_entry.entity_id, "registry_id": registry_entry.id}
        ],
    )
    config = updated.role_config("humidity")
    assert isinstance(config, HumidityConfig)
    assert config.sources[0].registry_id == registry_entry.id

    reloaded = await _loaded_manager(hass)
    persisted = reloaded.snapshot.plants[plant.id].role_config("humidity")
    assert persisted == config


async def test_humidity_entity_metadata_and_state(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    assert (
        registry.async_get_entity_id("sensor", DOMAIN, f"{DOMAIN}:{plant.id}:humidity")
        is None
    )

    hass.states.async_set(
        "sensor.room_humidity", "55.16", {"unit_of_measurement": PERCENTAGE}
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="humidity",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.room_humidity"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="humidity",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.room_humidity",
    )
    await manager.async_set_role_aggregation(
        plant.id,
        role="humidity",
        expected_revision=assigned.revision + 1,
        aggregation="primary",
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:humidity"
    )
    assert entity_id is not None
    entity = manager.get_entity("sensor", plant.id, "humidity")
    assert entity.device_class == "humidity"
    assert entity.native_unit_of_measurement == PERCENTAGE
    assert entity.state_class == "measurement"
    assert entity.entity_category is not EntityCategory.CONFIG
    state = hass.states.get(entity_id)
    assert state is not None
    assert float(state.state) == pytest.approx(55.2)


async def test_humidity_stress_entity_metadata_and_state(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    assert (
        registry.async_get_entity_id(
            "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:humidity_stress"
        )
        is None
    )

    hass.states.async_set(
        "sensor.room_humidity", "20", {"unit_of_measurement": PERCENTAGE}
    )
    await manager.async_set_role_sources(
        plant.id,
        role="humidity",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.room_humidity"}],
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:humidity_stress"
    )
    assert entity_id is not None
    entity = manager.get_entity("binary_sensor", plant.id, "humidity_stress")
    assert entity.device_class == "problem"
    assert entity.entity_category is None
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "on"
    assert state.attributes["confidence"] == "low"
    assert state.attributes["reason"] == "dry_stress"
    assert state.attributes["dry_threshold_percent"] == 25.0
    assert state.attributes["dry_clear_percent"] == 30.0
    assert state.attributes["damp_threshold_percent"] == 85.0
    assert state.attributes["damp_clear_percent"] == 80.0


async def test_humidity_stress_does_not_change_moisture_health(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    hass.states.async_set("sensor.soil", "40", {"unit_of_measurement": PERCENTAGE})
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

    hass.states.async_set("sensor.humidity", "90", {"unit_of_measurement": PERCENTAGE})
    await manager.async_set_role_sources(
        plant.id,
        role="humidity",
        expected_revision=moisture_sources.revision + 1,
        sources=[{"entity_id": "sensor.humidity"}],
    )
    assert moisture_controller.current_evaluation.health_score == before


async def test_humidity_registry_rename_updates_source(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        "sensor", "example", "rename-humidity", suggested_object_id="old_humidity"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="humidity",
        expected_revision=plant.revision,
        sources=[{"entity_id": entry.entity_id, "registry_id": entry.id}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="humidity",
        expected_revision=updated.revision,
        primary_entity_id=entry.entity_id,
    )
    registry.async_update_entity(entry.entity_id, new_entity_id="sensor.new_humidity")
    await hass.async_block_till_done()
    await hass.async_block_till_done()
    config = manager.get_plant(plant.id).role_config("humidity")
    assert isinstance(config, HumidityConfig)
    assert config.sources[0].entity_id == "sensor.new_humidity"
    assert config.primary_entity_id == "sensor.new_humidity"


async def test_humidity_missing_registered_source_raises_role_repair(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    source = registry.async_get_or_create(
        "sensor", "example", "humidity-missing", suggested_object_id="humidity_missing"
    )
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_role_sources(
        plant.id,
        role="humidity",
        expected_revision=plant.revision,
        sources=[{"entity_id": source.entity_id, "registry_id": source.id}],
    )
    registry.async_remove(source.entity_id)
    await hass.async_block_till_done()
    issue = ir.async_get(hass).async_get_issue(
        DOMAIN, _issue_id(plant.id, source.entity_id, "humidity")
    )
    assert issue is not None
    assert issue.data == {
        "plant_id": plant.id,
        "role": "humidity",
        "entity_id": source.entity_id,
        "registry_id": source.id,
    }


async def test_humidity_does_not_change_moisture_outputs(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    hass.states.async_set("sensor.soil", "40", {"unit_of_measurement": PERCENTAGE})
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

    hass.states.async_set("sensor.humidity", "55", {"unit_of_measurement": PERCENTAGE})
    await manager.async_set_role_sources(
        plant.id,
        role="humidity",
        expected_revision=moisture_primary.revision,
        sources=[{"entity_id": "sensor.humidity"}],
    )
    after = moisture_controller.current_evaluation
    assert after == before


def test_humidity_config_rejects_bad_storage() -> None:
    with pytest.raises(ValueError, match="aggregation"):
        HumidityConfig.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "median",
                "stale_after_seconds": 21600,
            }
        )
    with pytest.raises(ValueError, match="stale_after"):
        HumidityConfig.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "average",
                "stale_after_seconds": 30,
            }
        )
