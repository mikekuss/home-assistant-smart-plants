from __future__ import annotations

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import BatteryConfig
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


async def test_new_plant_has_default_battery_runtime_config(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    controller = manager.get_role_controller(plant.id, "battery")
    assert controller is not None
    assert controller.current_evaluation.computed_available is False
    assert plant.role_config("battery") is None


async def test_battery_sources_round_trip_in_roles(
    hass: HomeAssistant,
) -> None:
    registry_entry = er.async_get(hass).async_get_or_create(
        "sensor", "example", "battery", suggested_object_id="battery"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="battery",
        expected_revision=plant.revision,
        sources=[
            {"entity_id": registry_entry.entity_id, "registry_id": registry_entry.id}
        ],
    )
    config = updated.role_config("battery")
    assert isinstance(config, BatteryConfig)
    assert config.sources[0].registry_id == registry_entry.id
    assert config.aggregation == "min"

    reloaded = await _loaded_manager(hass)
    persisted = reloaded.snapshot.plants[plant.id].role_config("battery")
    assert persisted == config


async def test_battery_entity_metadata_and_state(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    # Entity-lifecycle contract: the role's entity is not created until the role
    # has had at least one source.
    assert (
        registry.async_get_entity_id("sensor", DOMAIN, f"{DOMAIN}:{plant.id}:battery")
        is None
    )

    hass.states.async_set(
        "sensor.plant_battery", "87.5", {"unit_of_measurement": PERCENTAGE}
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="battery",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.plant_battery"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="battery",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.plant_battery",
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:battery"
    )
    assert entity_id is not None
    entity = manager.get_entity("sensor", plant.id, "battery")
    assert entity.device_class == "battery"
    assert entity.native_unit_of_measurement == PERCENTAGE
    assert entity.state_class == "measurement"
    assert entity.entity_category is EntityCategory.DIAGNOSTIC
    state = hass.states.get(entity_id)
    assert state is not None
    assert int(state.state) == 88


async def test_low_battery_entity_metadata_and_state(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    # Entity-lifecycle contract: no problem binary until the role has a source.
    assert (
        registry.async_get_entity_id(
            "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:low_battery"
        )
        is None
    )

    hass.states.async_set(
        "sensor.plant_battery", "20", {"unit_of_measurement": PERCENTAGE}
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="battery",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.plant_battery"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="battery",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.plant_battery",
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:low_battery"
    )
    assert entity_id is not None
    entity = manager.get_entity("binary_sensor", plant.id, "low_battery")
    assert entity.device_class == "problem"
    assert entity.entity_category is EntityCategory.DIAGNOSTIC
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "on"
    assert state.attributes["confidence"] == "low"
    assert state.attributes["threshold_percent"] == 20
    assert state.attributes["clear_percent"] == 25


async def test_low_battery_does_not_change_moisture_health(
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

    hass.states.async_set("sensor.battery", "10", {"unit_of_measurement": PERCENTAGE})
    await manager.async_set_role_sources(
        plant.id,
        role="battery",
        expected_revision=moisture_sources.revision + 1,
        sources=[{"entity_id": "sensor.battery"}],
    )
    assert moisture_controller.current_evaluation.health_score == before


async def test_battery_registry_rename_updates_source(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        "sensor", "example", "rename-battery", suggested_object_id="old_battery"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="battery",
        expected_revision=plant.revision,
        sources=[{"entity_id": entry.entity_id, "registry_id": entry.id}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="battery",
        expected_revision=updated.revision,
        primary_entity_id=entry.entity_id,
    )
    registry.async_update_entity(entry.entity_id, new_entity_id="sensor.new_battery")
    await hass.async_block_till_done()
    await hass.async_block_till_done()
    config = manager.get_plant(plant.id).role_config("battery")
    assert isinstance(config, BatteryConfig)
    assert config.sources[0].entity_id == "sensor.new_battery"
    assert config.primary_entity_id == "sensor.new_battery"


async def test_battery_missing_registered_source_raises_role_repair(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    source = registry.async_get_or_create(
        "sensor", "example", "battery-missing", suggested_object_id="battery_missing"
    )
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_role_sources(
        plant.id,
        role="battery",
        expected_revision=plant.revision,
        sources=[{"entity_id": source.entity_id, "registry_id": source.id}],
    )
    registry.async_remove(source.entity_id)
    await hass.async_block_till_done()
    issue = ir.async_get(hass).async_get_issue(
        DOMAIN, _issue_id(plant.id, source.entity_id, "battery")
    )
    assert issue is not None
    assert issue.data == {
        "plant_id": plant.id,
        "role": "battery",
        "entity_id": source.entity_id,
        "registry_id": source.id,
    }


async def test_battery_does_not_change_moisture_outputs(
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

    hass.states.async_set("sensor.battery", "88", {"unit_of_measurement": PERCENTAGE})
    await manager.async_set_role_sources(
        plant.id,
        role="battery",
        expected_revision=moisture_primary.revision,
        sources=[{"entity_id": "sensor.battery"}],
    )
    after = moisture_controller.current_evaluation
    assert after == before


def test_battery_config_rejects_bad_storage() -> None:
    with pytest.raises(ValueError, match="aggregation"):
        BatteryConfig.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "median",
                "stale_after_seconds": 21600,
            }
        )
    with pytest.raises(ValueError, match="stale_after"):
        BatteryConfig.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "min",
                "stale_after_seconds": 30,
            }
        )
