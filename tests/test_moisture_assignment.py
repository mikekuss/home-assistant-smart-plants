"""
Phase 4 Cut 1: moisture sensor assignment model and manager mutations.

Exercises:
- New PlantRecord round-trips the moisture config.
- Storage migration from minor 3 fills defaults for existing plants.
- Manager mutations: sources, primary, aggregation, stale_after, thresholds.
- Revision-conflict rejection.
- Entity-registry rename tracking updates stored source entity_ids and
  preserves missing (removed) assignments.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants.const import (
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsRevisionConflictError,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import (
    DEFAULT_MOISTURE_MAX,
    DEFAULT_MOISTURE_MIN,
    DEFAULT_MOISTURE_TARGET,
    DEFAULT_STALE_AFTER_SECONDS,
    MoistureConfig,
    SensorSource,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_registry import EVENT_ENTITY_REGISTRY_UPDATED


async def _loaded_manager(hass: HomeAssistant) -> SmartPlantsManager:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    return manager


async def test_new_plant_has_default_moisture_config(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    assert plant.moisture == MoistureConfig()
    assert plant.moisture.stale_after_seconds == DEFAULT_STALE_AFTER_SECONDS
    assert plant.moisture.moisture_min == DEFAULT_MOISTURE_MIN
    assert plant.moisture.moisture_target == DEFAULT_MOISTURE_TARGET
    assert plant.moisture.moisture_max == DEFAULT_MOISTURE_MAX


async def test_moisture_config_round_trips_through_storage(
    hass: HomeAssistant,
) -> None:
    registry_entry = er.async_get(hass).async_get_or_create(
        "sensor", "example", "round-trip", suggested_object_id="a"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[
            {
                "entity_id": registry_entry.entity_id,
                "registry_id": registry_entry.id,
            },
            {"entity_id": "sensor.b"},
        ],
    )
    assert updated.moisture.sources == (
        SensorSource(entity_id=registry_entry.entity_id, registry_id=registry_entry.id),
        SensorSource(entity_id="sensor.b", registry_id=None),
    )
    reloaded = await _loaded_manager(hass)
    persisted = reloaded.snapshot.plants[plant.id]
    assert persisted.moisture == updated.moisture


async def test_set_sources_rejects_duplicate_entity_ids(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError, match="unique"):
        await manager.async_set_moisture_sources(
            plant.id,
            expected_revision=1,
            sources=[
                {"entity_id": "sensor.a"},
                {"entity_id": "sensor.a"},
            ],
        )


async def test_set_primary_requires_source_in_list(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": "sensor.a"}],
    )
    with pytest.raises(SmartPlantsValidationError, match="assigned source"):
        await manager.async_set_moisture_primary(
            plant.id, expected_revision=2, primary_entity_id="sensor.missing"
        )
    updated = await manager.async_set_moisture_primary(
        plant.id, expected_revision=2, primary_entity_id="sensor.a"
    )
    assert updated.moisture.primary_entity_id == "sensor.a"


async def test_removing_primary_from_sources_clears_primary(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": "sensor.a"}, {"entity_id": "sensor.b"}],
    )
    await manager.async_set_moisture_primary(
        plant.id, expected_revision=2, primary_entity_id="sensor.a"
    )
    updated = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=3,
        sources=[{"entity_id": "sensor.b"}],
    )
    assert updated.moisture.primary_entity_id is None


async def test_set_aggregation_rejects_unknown_mode(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError, match="aggregation"):
        await manager.async_set_moisture_aggregation(
            plant.id, expected_revision=1, aggregation="median"
        )
    for mode in ("primary", "average", "min", "max"):
        current = manager.get_plant(plant.id)
        result = await manager.async_set_moisture_aggregation(
            plant.id, expected_revision=current.revision, aggregation=mode
        )
        assert result.moisture.aggregation == mode


async def test_set_stale_after_bounds(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    bad_values: tuple[object, ...] = (0, -1, 30, 999_999_999, True)
    for bad in bad_values:
        with pytest.raises(SmartPlantsValidationError, match="stale_after"):
            await manager.async_set_stale_after(
                plant.id,
                expected_revision=1,
                stale_after_seconds=bad,  # type: ignore[arg-type]
            )
    updated = await manager.async_set_stale_after(
        plant.id, expected_revision=1, stale_after_seconds=3600
    )
    assert updated.moisture.stale_after_seconds == 3600


async def test_thresholds_enforce_ordering_and_span(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    bad_cases = [
        (0, 20, 40),  # min must be > 0
        (20, 20, 40),  # min < target
        (20, 40, 40),  # target < max
        (30, 32, 33),  # span < 4
        (5, 50, 100),  # max < 100
    ]
    for min_v, tgt, max_v in bad_cases:
        with pytest.raises(SmartPlantsValidationError):
            await manager.async_set_moisture_thresholds(
                plant.id,
                expected_revision=1,
                moisture_min=min_v,
                moisture_target=tgt,
                moisture_max=max_v,
            )
    updated = await manager.async_set_moisture_thresholds(
        plant.id,
        expected_revision=1,
        moisture_min=20,
        moisture_target=40,
        moisture_max=60,
    )
    assert (
        updated.moisture.moisture_min,
        updated.moisture.moisture_target,
        updated.moisture.moisture_max,
    ) == (20, 40, 60)


async def test_mutation_revision_conflict(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_set_moisture_sources(
            plant.id, expected_revision=999, sources=[]
        )


async def test_registered_source_rename_updates_entity_id(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        "sensor", "example", "abc123", suggested_object_id="soil"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": entry.entity_id, "registry_id": entry.id}],
    )

    renamed = registry.async_update_entity(
        entry.entity_id, new_entity_id="sensor.soil_renamed"
    )
    await hass.async_block_till_done()
    assert renamed.entity_id == "sensor.soil_renamed"
    current = manager.get_plant(plant.id)
    assert current.moisture.sources == (
        SensorSource(entity_id="sensor.soil_renamed", registry_id=entry.id),
    )


async def test_registered_source_removal_preserves_assignment(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        "sensor", "example", "abc123", suggested_object_id="soil"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": entry.entity_id, "registry_id": entry.id}],
    )

    registry.async_remove(entry.entity_id)
    await hass.async_block_till_done()

    current = manager.get_plant(plant.id)
    # Missing assignment preserved as-is; Cut 4 handles the repair issue.
    assert current.moisture.sources == (
        SensorSource(entity_id=entry.entity_id, registry_id=entry.id),
    )


async def test_startup_canonicalizes_offline_registry_rename(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        "sensor", "example", "offline", suggested_object_id="offline"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    assigned = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": entry.entity_id, "registry_id": entry.id}],
    )
    await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=assigned.revision,
        primary_entity_id=entry.entity_id,
    )
    await manager.async_unload()
    registry.async_update_entity(
        entry.entity_id, new_entity_id="sensor.offline_renamed"
    )
    await hass.async_block_till_done()

    reloaded = await _loaded_manager(hass)
    current = reloaded.get_plant(plant.id)
    assert current.moisture.sources[0].entity_id == "sensor.offline_renamed"
    assert current.moisture.primary_entity_id == "sensor.offline_renamed"


async def test_registry_rename_collision_preserves_valid_assignments(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        "sensor", "example", "collision", suggested_object_id="source"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": entry.entity_id}, {"entity_id": "sensor.target"}],
    )
    registry.async_update_entity(entry.entity_id, new_entity_id="sensor.target")
    await hass.async_block_till_done()
    assert manager.get_plant(plant.id).moisture.sources == (
        SensorSource("sensor.target", entry.id),
    )


async def test_manager_controller_startup_is_transactional(
    hass: HomeAssistant,
) -> None:
    seed = await _loaded_manager(hass)
    await seed.async_create_plant(name="Aloe")
    await seed.async_unload()
    manager = SmartPlantsManager(hass)
    with (
        patch(
            "custom_components.smart_plants.moisture_controller."
            "MoisturePlantController.start",
            side_effect=RuntimeError("start failed"),
        ),
        pytest.raises(RuntimeError, match="start failed"),
    ):
        await manager.async_load()
    assert manager.available is False
    assert manager._controllers == {}
    assert manager._unsub_registry is None


@pytest.mark.parametrize("entity_id", ["switch.pump", "not-an-entity", "sensor.Bad"])
async def test_sources_reject_non_sensor_or_invalid_ids(
    hass: HomeAssistant, entity_id: str
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError, match="valid sensor"):
        await manager.async_set_moisture_sources(
            plant.id, expected_revision=1, sources=[{"entity_id": entity_id}]
        )


async def test_sources_resolve_registry_uuid_and_reject_mismatch(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    source = registry.async_get_or_create(
        "sensor", "example", "source", suggested_object_id="source"
    )
    other = registry.async_get_or_create(
        "sensor", "example", "other", suggested_object_id="other"
    )
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError, match="do not match"):
        await manager.async_set_moisture_sources(
            plant.id,
            expected_revision=1,
            sources=[{"entity_id": source.entity_id, "registry_id": other.id}],
        )
    updated = await manager.async_set_moisture_sources(
        plant.id, expected_revision=1, sources=[{"entity_id": source.entity_id}]
    )
    assert updated.moisture.sources == (
        SensorSource(entity_id=source.entity_id, registry_id=source.id),
    )


async def test_migration_from_minor_3_fills_default_moisture(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": 3,
        "key": STORAGE_KEY,
        "data": {
            "revision": 1,
            "plants": [
                {
                    "id": "plant-1",
                    "revision": 1,
                    "name": "Aloe",
                    "created_at": "2026-09-05T00:00:00Z",
                    "lifecycle_state": "active",
                    "acquired_at": None,
                    "species": None,
                    "placement": None,
                    "tags": [],
                    "category": None,
                    "image": None,
                }
            ],
            "pending_operations": [],
            "tombstones": [],
        },
    }
    manager = await _loaded_manager(hass)
    plant = manager.snapshot.plants["plant-1"]
    assert plant.moisture == MoistureConfig()
    assert STORAGE_MINOR_VERSION == 11


async def test_unregistered_source_rename_updates_by_entity_id(
    hass: HomeAssistant,
) -> None:
    """
    Verify unregistered-source rename tracking.

    Documented weaker guarantee: an unregistered source (registry_id=None)
    is tracked only by entity_id. A rename originating from HA (with no
    registry_entry_id in the event) updates the stored entity_id.
    """
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": "sensor.legacy"}],
    )
    payload: dict[str, Any] = {
        "action": "update",
        "entity_id": "sensor.legacy_renamed",
        "changes": {"entity_id": "sensor.legacy"},
    }
    hass.bus.async_fire(EVENT_ENTITY_REGISTRY_UPDATED, payload)  # type: ignore[misc]
    await hass.async_block_till_done()
    current = manager.get_plant(plant.id)
    assert current.moisture.sources == (
        SensorSource(entity_id="sensor.legacy_renamed", registry_id=None),
    )
