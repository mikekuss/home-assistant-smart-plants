from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.illuminance_evaluator import LIGHT_LUX
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import IlluminanceConfig
from custom_components.smart_plants.repairs import _issue_id
from freezegun.api import FrozenDateTimeFactory
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


async def test_new_plant_has_default_illuminance_runtime_config(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    controller = manager.get_role_controller(plant.id, "illuminance")
    assert controller is not None
    assert controller.current_evaluation.computed_available is False
    assert plant.role_config("illuminance") is None


async def test_illuminance_sources_round_trip_in_roles(
    hass: HomeAssistant,
) -> None:
    registry_entry = er.async_get(hass).async_get_or_create(
        "sensor", "example", "illuminance", suggested_object_id="illuminance"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="illuminance",
        expected_revision=plant.revision,
        sources=[
            {"entity_id": registry_entry.entity_id, "registry_id": registry_entry.id}
        ],
    )
    config = updated.role_config("illuminance")
    assert isinstance(config, IlluminanceConfig)
    assert config.sources[0].registry_id == registry_entry.id
    assert config.aggregation == "primary"

    reloaded = await _loaded_manager(hass)
    persisted = reloaded.snapshot.plants[plant.id].role_config("illuminance")
    assert persisted == config
    await manager.async_unload()
    await reloaded.async_unload()


async def test_illuminance_entity_metadata_and_state(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    # Lazy entity creation: no computed entity until the role has a source.
    assert (
        registry.async_get_entity_id(
            "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:illuminance"
        )
        is None
    )

    hass.states.async_set(
        "sensor.plant_lux", "123.16", {"unit_of_measurement": LIGHT_LUX}
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="illuminance",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.plant_lux"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="illuminance",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.plant_lux",
    )
    await hass.async_block_till_done()
    entity_id = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:illuminance"
    )
    assert entity_id is not None
    entity = manager.get_entity("sensor", plant.id, "illuminance")
    assert entity.device_class == "illuminance"
    assert entity.native_unit_of_measurement == LIGHT_LUX
    assert entity.state_class == "measurement"
    assert entity.entity_category is not EntityCategory.CONFIG
    state = hass.states.get(entity_id)
    assert state is not None
    assert float(state.state) == pytest.approx(123.2)


async def test_low_light_entity_metadata_and_daytime_state(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    # Freeze the clock instead of patching dt_util.utcnow: Home Assistant
    # schedules timers from time.time(), so a patched utcnow would put the
    # source's stale deadline in the past and let it fire before the asserts.
    await hass.config.async_set_time_zone("UTC")
    now = datetime(2026, 1, 1, 12, tzinfo=UTC)
    freezer.move_to(now)
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    controller = manager.get_role_controller(plant.id, "illuminance")
    assert not controller._light_samples

    registry = er.async_get(hass)
    # Lazy entity creation: no problem binary until the role has a source.
    assert (
        registry.async_get_entity_id(
            "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:low_light"
        )
        is None
    )

    hass.states.async_set(
        "sensor.plant_lux",
        "100",
        {"unit_of_measurement": LIGHT_LUX},
        timestamp=now.timestamp(),
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="illuminance",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.plant_lux"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="illuminance",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.plant_lux",
    )
    await hass.async_block_till_done()
    assert len(controller._light_samples) == 1
    # A second source observation, one minute later, supplies the second
    # daytime sample. Configuration recomputation is not another sample.
    freezer.move_to(now + timedelta(minutes=1))
    hass.states.async_set(
        "sensor.plant_lux",
        "120",
        {"unit_of_measurement": LIGHT_LUX},
        timestamp=(now + timedelta(minutes=1)).timestamp(),
    )
    await hass.async_block_till_done()
    assert len(controller._light_samples) == 2
    entity_id = registry.async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:low_light"
    )
    assert entity_id is not None
    entity = manager.get_entity("binary_sensor", plant.id, "low_light")
    assert entity.device_class == "problem"
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "on"
    assert state.attributes["confidence"] == "low"
    assert state.attributes["target_lux"] == 500.0


async def test_low_light_does_not_change_moisture_health(
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

    hass.states.async_set("sensor.lux", "100", {"unit_of_measurement": LIGHT_LUX})
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="illuminance",
        expected_revision=moisture_sources.revision + 1,
        sources=[{"entity_id": "sensor.lux"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="illuminance",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.lux",
    )
    assert moisture_controller.current_evaluation.health_score == before
    await manager.async_unload()


async def test_illuminance_registry_rename_updates_source(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        "sensor", "example", "rename-illuminance", suggested_object_id="old_lux"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="illuminance",
        expected_revision=plant.revision,
        sources=[{"entity_id": entry.entity_id, "registry_id": entry.id}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="illuminance",
        expected_revision=updated.revision,
        primary_entity_id=entry.entity_id,
    )
    registry.async_update_entity(entry.entity_id, new_entity_id="sensor.new_lux")
    await hass.async_block_till_done()
    await hass.async_block_till_done()
    config = manager.get_plant(plant.id).role_config("illuminance")
    assert isinstance(config, IlluminanceConfig)
    assert config.sources[0].entity_id == "sensor.new_lux"
    assert config.primary_entity_id == "sensor.new_lux"
    await manager.async_unload()


async def test_illuminance_missing_registered_source_raises_role_repair(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    source = registry.async_get_or_create(
        "sensor", "example", "lux-missing", suggested_object_id="lux_missing"
    )
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_role_sources(
        plant.id,
        role="illuminance",
        expected_revision=plant.revision,
        sources=[{"entity_id": source.entity_id, "registry_id": source.id}],
    )
    registry.async_remove(source.entity_id)
    await hass.async_block_till_done()
    issue = ir.async_get(hass).async_get_issue(
        DOMAIN, _issue_id(plant.id, source.entity_id, "illuminance")
    )
    assert issue is not None
    assert issue.data == {
        "plant_id": plant.id,
        "role": "illuminance",
        "entity_id": source.entity_id,
        "registry_id": source.id,
    }


async def test_illuminance_does_not_change_moisture_outputs(
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

    hass.states.async_set("sensor.lux", "123", {"unit_of_measurement": LIGHT_LUX})
    await manager.async_set_role_sources(
        plant.id,
        role="illuminance",
        expected_revision=moisture_primary.revision,
        sources=[{"entity_id": "sensor.lux"}],
    )
    after = moisture_controller.current_evaluation
    assert after == before
    await manager.async_unload()


def test_illuminance_config_rejects_bad_storage() -> None:
    with pytest.raises(ValueError, match="aggregation"):
        IlluminanceConfig.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "median",
                "stale_after_seconds": 21600,
            }
        )
    with pytest.raises(ValueError, match="stale_after"):
        IlluminanceConfig.from_storage(
            {
                "sources": [],
                "primary_entity_id": None,
                "aggregation": "primary",
                "stale_after_seconds": 30,
            }
        )
