from __future__ import annotations

import pytest
from custom_components.smart_plants.conductivity_evaluator import (
    CONDUCTIVITY_MICROSIEMENS_PER_CM,
)
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import ConductivityConfig
from custom_components.smart_plants.repairs import _issue_id
from homeassistant.const import PERCENTAGE, UnitOfConductivity
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


async def test_new_plant_has_default_conductivity_runtime_config(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    controller = manager.get_role_controller(plant.id, "conductivity")
    assert controller is not None
    assert controller.current_evaluation.computed_available is False
    assert plant.role_config("conductivity") is None


async def test_conductivity_sources_round_trip_in_roles(
    hass: HomeAssistant,
) -> None:
    registry_entry = er.async_get(hass).async_get_or_create(
        "sensor", "example", "conductivity", suggested_object_id="conductivity"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="conductivity",
        expected_revision=plant.revision,
        sources=[
            {"entity_id": registry_entry.entity_id, "registry_id": registry_entry.id}
        ],
    )
    config = updated.role_config("conductivity")
    assert isinstance(config, ConductivityConfig)
    assert config.sources[0].registry_id == registry_entry.id
    assert config.aggregation == "primary"

    reloaded = await _loaded_manager(hass)
    persisted = reloaded.snapshot.plants[plant.id].role_config("conductivity")
    assert persisted == config


async def test_conductivity_entity_metadata_and_state(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    # Lazy entity creation: no computed entity until the role has a source.
    assert (
        registry.async_get_entity_id(
            "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:conductivity"
        )
        is None
    )

    hass.states.async_set(
        "sensor.soil_conductivity",
        "850.56",
        {"unit_of_measurement": CONDUCTIVITY_MICROSIEMENS_PER_CM},
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="conductivity",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.soil_conductivity"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="conductivity",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.soil_conductivity",
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:conductivity"
    )
    assert entity_id is not None
    entity = manager.get_entity("sensor", plant.id, "conductivity")
    assert entity.device_class == "conductivity"
    # The computed sensor must emit the canonical HA unit (Greek mu) so HA
    # accepts it for device_class=CONDUCTIVITY.
    assert entity.native_unit_of_measurement == UnitOfConductivity.MICROSIEMENS_PER_CM
    assert entity.state_class == "measurement"
    state = hass.states.get(entity_id)
    assert state is not None
    assert float(state.state) == 850.6


async def test_conductivity_source_with_ha_greek_mu_unit_is_accepted(
    hass: HomeAssistant,
) -> None:
    # Regression: a source sensor reporting the real HA unit constant (Greek
    # mu) must be accepted, not rejected as an unknown unit.
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)

    hass.states.async_set(
        "sensor.soil_conductivity",
        "850.56",
        {"unit_of_measurement": UnitOfConductivity.MICROSIEMENS_PER_CM},
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="conductivity",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.soil_conductivity"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="conductivity",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.soil_conductivity",
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:conductivity"
    )
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    assert float(state.state) == 850.6


async def test_conductivity_registry_rename_updates_source(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        "sensor",
        "example",
        "rename-conductivity",
        suggested_object_id="old_conductivity",
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="conductivity",
        expected_revision=plant.revision,
        sources=[{"entity_id": entry.entity_id, "registry_id": entry.id}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="conductivity",
        expected_revision=updated.revision,
        primary_entity_id=entry.entity_id,
    )
    registry.async_update_entity(
        entry.entity_id, new_entity_id="sensor.new_conductivity"
    )
    await hass.async_block_till_done()
    await hass.async_block_till_done()
    config = manager.get_plant(plant.id).role_config("conductivity")
    assert isinstance(config, ConductivityConfig)
    assert config.sources[0].entity_id == "sensor.new_conductivity"
    assert config.primary_entity_id == "sensor.new_conductivity"


async def test_conductivity_missing_registered_source_raises_role_repair(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    source = registry.async_get_or_create(
        "sensor",
        "example",
        "conductivity-missing",
        suggested_object_id="conductivity_missing",
    )
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_role_sources(
        plant.id,
        role="conductivity",
        expected_revision=plant.revision,
        sources=[{"entity_id": source.entity_id, "registry_id": source.id}],
    )
    registry.async_remove(source.entity_id)
    await hass.async_block_till_done()
    issue = ir.async_get(hass).async_get_issue(
        DOMAIN, _issue_id(plant.id, source.entity_id, "conductivity")
    )
    assert issue is not None
    assert issue.data == {
        "plant_id": plant.id,
        "role": "conductivity",
        "entity_id": source.entity_id,
        "registry_id": source.id,
    }


async def test_conductivity_does_not_change_moisture_outputs(
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

    hass.states.async_set(
        "sensor.conductivity",
        "880",
        {"unit_of_measurement": CONDUCTIVITY_MICROSIEMENS_PER_CM},
    )
    await manager.async_set_role_sources(
        plant.id,
        role="conductivity",
        expected_revision=moisture_primary.revision,
        sources=[{"entity_id": "sensor.conductivity"}],
    )
    after = moisture_controller.current_evaluation
    assert after == before


async def test_conductivity_stress_entity_metadata_and_state(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    # Lazy entity creation: no problem binary until the role has a source.
    assert (
        registry.async_get_entity_id(
            "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:conductivity_stress"
        )
        is None
    )

    hass.states.async_set(
        "sensor.soil_conductivity",
        "300",
        {"unit_of_measurement": CONDUCTIVITY_MICROSIEMENS_PER_CM},
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="conductivity",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.soil_conductivity"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="conductivity",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.soil_conductivity",
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:conductivity_stress"
    )
    assert entity_id is not None
    entity = manager.get_entity("binary_sensor", plant.id, "conductivity_stress")
    assert entity.device_class == "problem"
    assert entity.entity_category is None
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "on"
    assert state.attributes["confidence"] == "low"
    assert state.attributes["reason"] == "low_conductivity_stress"
    assert state.attributes["low_threshold_micro_siemens_per_cm"] == 350.0
    assert state.attributes["low_clear_micro_siemens_per_cm"] == 500.0
    assert state.attributes["high_threshold_micro_siemens_per_cm"] == 2000.0
    assert state.attributes["high_clear_micro_siemens_per_cm"] == 1800.0


async def test_conductivity_stress_does_not_change_moisture_health(
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
        "sensor.conductivity",
        "2500",
        {"unit_of_measurement": CONDUCTIVITY_MICROSIEMENS_PER_CM},
    )
    await manager.async_set_role_sources(
        plant.id,
        role="conductivity",
        expected_revision=moisture_sources.revision + 1,
        sources=[{"entity_id": "sensor.conductivity"}],
    )
    assert moisture_controller.current_evaluation.health_score == before


def test_conductivity_config_rejects_bad_storage() -> None:
    with pytest.raises(ValueError, match="aggregation"):
        ConductivityConfig.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "median",
                "stale_after_seconds": 21600,
            }
        )
    with pytest.raises(ValueError, match="stale_after"):
        ConductivityConfig.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "primary",
                "stale_after_seconds": 30,
            }
        )
