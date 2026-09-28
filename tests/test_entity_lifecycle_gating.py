"""
Entity-lifecycle gating for non-moisture roles (storage minor 10).

A non-moisture role's computed sensor and problem binary are created only once the
role has had a source; they are kept after sources are removed (going
unavailable), which preserves history and customizations. Old storage does not
track past assignments, so migration retains existing registry entries even
for roles without current sources. Moisture entities are always present.
"""

from __future__ import annotations

from typing import Any

from custom_components.smart_plants.const import (
    DOMAIN,
    SINGLETON_UNIQUE_ID,
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry


def _moisture_storage() -> dict[str, Any]:
    default = {
        "value": None,
        "source": "builtin",
        "provider": None,
        "provider_ref": None,
    }
    return {
        "sources": [],
        "primary_entity_id": None,
        "aggregation": "primary",
        "stale_after_seconds": 21600,
        "threshold_defaults": {
            "min": {**default, "value": 15},
            "target": {**default, "value": 35},
            "max": {**default, "value": 55},
        },
        "threshold_overrides": {"min": None, "target": None, "max": None},
    }


async def _setup_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _entity_id(hass: HomeAssistant, plant_id: str, platform: str, role: str) -> Any:
    return er.async_get(hass).async_get_entity_id(
        platform, DOMAIN, f"{DOMAIN}:{plant_id}:{role}"
    )


async def test_role_entities_created_on_first_source_and_kept_after_removal(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    # No temperature entities before a source.
    assert _entity_id(hass, plant.id, "sensor", "temperature") is None
    assert _entity_id(hass, plant.id, "binary_sensor", "temperature_stress") is None

    assigned = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.room_temp"}],
    )
    await hass.async_block_till_done()

    # Both the computed sensor and the problem binary now exist.
    sensor_id = _entity_id(hass, plant.id, "sensor", "temperature")
    binary_id = _entity_id(hass, plant.id, "binary_sensor", "temperature_stress")
    assert sensor_id is not None
    assert binary_id is not None

    # Removing every source keeps the entities (keep-after-removal).
    await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=assigned.revision,
        sources=[],
    )
    await hass.async_block_till_done()
    assert _entity_id(hass, plant.id, "sensor", "temperature") == sensor_id
    assert (
        _entity_id(hass, plant.id, "binary_sensor", "temperature_stress") == binary_id
    )

    # A reload also keeps them, because the registry entry already exists.
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert _entity_id(hass, plant.id, "sensor", "temperature") == sensor_id
    assert (
        _entity_id(hass, plant.id, "binary_sensor", "temperature_stress") == binary_id
    )


async def test_unconfigured_roles_never_create_entities(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    # Configure only humidity; the other six non-moisture roles stay entity-less.
    await manager.async_set_role_sources(
        plant.id,
        role="humidity",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.humidity"}],
    )
    await hass.async_block_till_done()

    assert _entity_id(hass, plant.id, "sensor", "humidity") is not None
    for role, platform in (
        ("temperature", "sensor"),
        ("illuminance", "sensor"),
        ("battery", "sensor"),
        ("conductivity", "sensor"),
        ("soil_temperature", "sensor"),
        ("co2", "sensor"),
    ):
        assert _entity_id(hass, plant.id, platform, role) is None

    # Moisture (always-present) entities exist regardless of sources.
    assert _entity_id(hass, plant.id, "sensor", "moisture") is not None
    assert _entity_id(hass, plant.id, "binary_sensor", "needs_water") is not None


async def test_minor_10_migration_keeps_uncertain_role_entities(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # Old storage cannot distinguish never-assigned from assigned-then-cleared.
    plant_id = "plant-1"
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": 9,
        "key": STORAGE_KEY,
        "data": {
            "revision": 1,
            "plants": [
                {
                    "id": plant_id,
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
                    "roles": {"moisture": _moisture_storage()},
                }
            ],
            "pending_operations": [],
            "tombstones": [],
        },
    }
    # The old code created these entries even without an assigned source.
    registry = er.async_get(hass)
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    uncertain = registry.async_get_or_create(
        "sensor", DOMAIN, f"{DOMAIN}:{plant_id}:temperature", config_entry=entry
    )
    uncertain_binary = registry.async_get_or_create(
        "binary_sensor",
        DOMAIN,
        f"{DOMAIN}:{plant_id}:temperature_stress",
        config_entry=entry,
    )
    kept_moisture = registry.async_get_or_create(
        "sensor", DOMAIN, f"{DOMAIN}:{plant_id}:moisture", config_entry=entry
    )

    manager = SmartPlantsManager(hass)
    await manager.async_load()

    # Without assignment history, neither registry entry is safe to delete.
    assert registry.async_get(uncertain.entity_id) is not None
    assert registry.async_get(uncertain_binary.entity_id) is not None
    assert registry.async_get(kept_moisture.entity_id) is not None


async def test_minor_10_upgrade_keeps_role_cleared_before_upgrade(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    plant_id = "plant-cleared"
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": 9,
        "key": STORAGE_KEY,
        "data": {
            "revision": 3,
            "plants": [
                {
                    "id": plant_id,
                    "revision": 3,
                    "name": "Aloe",
                    "created_at": "2026-09-05T00:00:00Z",
                    "lifecycle_state": "active",
                    "acquired_at": None,
                    "species": None,
                    "placement": None,
                    "tags": [],
                    "category": None,
                    "image": None,
                    "roles": {
                        "moisture": _moisture_storage(),
                        "temperature": {
                            "sources": [
                                {"entity_id": "sensor.room_temp", "registry_id": None}
                            ],
                            "primary_entity_id": "sensor.room_temp",
                            "aggregation": "primary",
                            "stale_after_seconds": 21600,
                            "stress_threshold_overrides": {
                                "cold_threshold_celsius": None,
                                "cold_clear_celsius": None,
                                "hot_threshold_celsius": None,
                                "hot_clear_celsius": None,
                            },
                        },
                    },
                }
            ],
            "pending_operations": [],
            "tombstones": [],
        },
    }
    registry = er.async_get(hass)
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    sensor = registry.async_get_or_create(
        "sensor", DOMAIN, f"{DOMAIN}:{plant_id}:temperature", config_entry=entry
    )
    binary = registry.async_get_or_create(
        "binary_sensor",
        DOMAIN,
        f"{DOMAIN}:{plant_id}:temperature_stress",
        config_entry=entry,
    )

    # Simulate the minor-9 removal write. The old store retained no evidence
    # of the earlier source assignment beyond the entity registry entries.
    old_role = hass_storage[STORAGE_KEY]["data"]["plants"][0]["roles"]["temperature"]
    old_role["sources"] = []
    old_role["primary_entity_id"] = None

    manager = SmartPlantsManager(hass)
    await manager.async_load()
    config = manager.snapshot.plants[plant_id].role_config("temperature")
    assert config is not None
    assert config.sources == ()
    assert registry.async_get(sensor.entity_id) is not None
    assert registry.async_get(binary.entity_id) is not None

    reloaded = SmartPlantsManager(hass)
    await reloaded.async_load()
    assert registry.async_get(sensor.entity_id) is not None
    assert registry.async_get(binary.entity_id) is not None


async def test_minor_10_migration_keeps_configured_role_entities(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # A plant that already had a temperature source keeps its entities.
    plant_id = "plant-1"
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": 9,
        "key": STORAGE_KEY,
        "data": {
            "revision": 1,
            "plants": [
                {
                    "id": plant_id,
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
                    "roles": {
                        "moisture": _moisture_storage(),
                        "temperature": {
                            "sources": [
                                {"entity_id": "sensor.room_temp", "registry_id": None}
                            ],
                            "primary_entity_id": "sensor.room_temp",
                            "aggregation": "primary",
                            "stale_after_seconds": 21600,
                            "stress_threshold_overrides": {
                                "cold_threshold_celsius": None,
                                "cold_clear_celsius": None,
                                "hot_clear_celsius": None,
                                "hot_threshold_celsius": None,
                            },
                        },
                    },
                }
            ],
            "pending_operations": [],
            "tombstones": [],
        },
    }
    registry = er.async_get(hass)
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    kept = registry.async_get_or_create(
        "sensor", DOMAIN, f"{DOMAIN}:{plant_id}:temperature", config_entry=entry
    )

    manager = SmartPlantsManager(hass)
    await manager.async_load()

    assert registry.async_get(kept.entity_id) is not None
