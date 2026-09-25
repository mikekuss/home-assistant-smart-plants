from __future__ import annotations

import pytest
from custom_components.smart_plants.co2_evaluator import CO2_PARTS_PER_MILLION
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import Co2Config
from custom_components.smart_plants.repairs import _issue_id
from homeassistant.const import PERCENTAGE
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


async def test_new_plant_has_default_co2_runtime_config(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    controller = manager.get_role_controller(plant.id, "co2")
    assert controller is not None
    assert controller.current_evaluation.computed_available is False
    assert plant.role_config("co2") is None


async def test_co2_sources_round_trip_in_roles(hass: HomeAssistant) -> None:
    registry_entry = er.async_get(hass).async_get_or_create(
        "sensor", "example", "co2", suggested_object_id="co2"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="co2",
        expected_revision=plant.revision,
        sources=[
            {"entity_id": registry_entry.entity_id, "registry_id": registry_entry.id}
        ],
    )
    config = updated.role_config("co2")
    assert isinstance(config, Co2Config)
    assert config.sources[0].registry_id == registry_entry.id
    assert config.aggregation == "average"

    reloaded = await _loaded_manager(hass)
    persisted = reloaded.snapshot.plants[plant.id].role_config("co2")
    assert persisted == config


async def test_co2_entity_metadata_and_state(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    assert (
        registry.async_get_entity_id("sensor", DOMAIN, f"{DOMAIN}:{plant.id}:co2")
        is None
    )

    hass.states.async_set(
        "sensor.room_co2", "420.5", {"unit_of_measurement": CO2_PARTS_PER_MILLION}
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="co2",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.room_co2"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="co2",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.room_co2",
    )
    await manager.async_set_role_aggregation(
        plant.id,
        role="co2",
        expected_revision=assigned.revision + 1,
        aggregation="primary",
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:co2"
    )
    assert entity_id is not None
    entity = manager.get_entity("sensor", plant.id, "co2")
    assert entity.device_class == "carbon_dioxide"
    assert entity.native_unit_of_measurement == CO2_PARTS_PER_MILLION
    assert entity.state_class == "measurement"
    state = hass.states.get(entity_id)
    assert state is not None
    assert int(state.state) == 421


async def test_co2_stress_entity_metadata_and_state(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    assert (
        registry.async_get_entity_id(
            "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:co2_stress"
        )
        is None
    )

    hass.states.async_set(
        "sensor.room_co2", "5000", {"unit_of_measurement": CO2_PARTS_PER_MILLION}
    )
    await manager.async_set_role_sources(
        plant.id,
        role="co2",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.room_co2"}],
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:co2_stress"
    )
    assert entity_id is not None
    entity = manager.get_entity("binary_sensor", plant.id, "co2_stress")
    assert entity.device_class == "problem"
    assert entity.entity_category is None
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "on"
    assert state.attributes["confidence"] == "low"
    assert state.attributes["reason"] == "co2_stress"
    assert state.attributes["threshold_ppm"] == 5000
    assert state.attributes["clear_ppm"] == 4000


async def test_co2_stress_does_not_change_moisture_health(
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

    hass.states.async_set(
        "sensor.room_co2", "5000", {"unit_of_measurement": CO2_PARTS_PER_MILLION}
    )
    await manager.async_set_role_sources(
        plant.id,
        role="co2",
        expected_revision=moisture_sources.revision + 1,
        sources=[{"entity_id": "sensor.room_co2"}],
    )
    assert moisture_controller.current_evaluation.health_score == before


async def test_co2_registry_rename_updates_source(hass: HomeAssistant) -> None:
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        "sensor", "example", "rename-co2", suggested_object_id="old_co2"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="co2",
        expected_revision=plant.revision,
        sources=[{"entity_id": entry.entity_id, "registry_id": entry.id}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="co2",
        expected_revision=updated.revision,
        primary_entity_id=entry.entity_id,
    )
    registry.async_update_entity(entry.entity_id, new_entity_id="sensor.new_co2")
    await hass.async_block_till_done()
    await hass.async_block_till_done()
    config = manager.get_plant(plant.id).role_config("co2")
    assert isinstance(config, Co2Config)
    assert config.sources[0].entity_id == "sensor.new_co2"
    assert config.primary_entity_id == "sensor.new_co2"


async def test_co2_missing_registered_source_raises_role_repair(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    source = registry.async_get_or_create(
        "sensor", "example", "co2-missing", suggested_object_id="co2_missing"
    )
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_role_sources(
        plant.id,
        role="co2",
        expected_revision=plant.revision,
        sources=[{"entity_id": source.entity_id, "registry_id": source.id}],
    )
    registry.async_remove(source.entity_id)
    await hass.async_block_till_done()
    issue = ir.async_get(hass).async_get_issue(
        DOMAIN, _issue_id(plant.id, source.entity_id, "co2")
    )
    assert issue is not None
    assert issue.data == {
        "plant_id": plant.id,
        "role": "co2",
        "entity_id": source.entity_id,
        "registry_id": source.id,
    }


async def test_co2_does_not_change_moisture_outputs(hass: HomeAssistant) -> None:
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

    hass.states.async_set(
        "sensor.co2", "420", {"unit_of_measurement": CO2_PARTS_PER_MILLION}
    )
    await manager.async_set_role_sources(
        plant.id,
        role="co2",
        expected_revision=moisture_primary.revision,
        sources=[{"entity_id": "sensor.co2"}],
    )
    after = moisture_controller.current_evaluation
    assert after == before


def test_co2_config_rejects_bad_storage() -> None:
    with pytest.raises(ValueError, match="aggregation"):
        Co2Config.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "median",
                "stale_after_seconds": 21600,
            }
        )
    with pytest.raises(ValueError, match="stale_after"):
        Co2Config.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "average",
                "stale_after_seconds": 30,
            }
        )
