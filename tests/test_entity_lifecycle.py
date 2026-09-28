"""
Shared entity/platform lifecycle machinery.

Uses synthetic test-only entities to exercise the machinery in
``entity.py`` without relying on production role factories.
"""

from __future__ import annotations

from typing import Any

import pytest
from custom_components.smart_plants import PLATFORMS, SmartPlantsRuntimeData
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.entity import (
    SmartPlantsEntity,
    SmartPlantsPlatformLifecycle,
)
from custom_components.smart_plants.events import (
    PlantAddedEvent,
    PlantDeletedEvent,
    PlantEvent,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantRecord
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import async_get_platforms
from pytest_homeassistant_custom_component.common import MockConfigEntry


class _SyntheticSensor(SmartPlantsEntity):
    """Concrete SmartPlantsEntity used only by lifecycle tests."""

    PLATFORM = "sensor"


def _factory(manager: SmartPlantsManager, plant: PlantRecord) -> SmartPlantsEntity:
    return _SyntheticSensor(manager, plant.id, "test_role", "test_role")


async def _loaded_manager(hass: HomeAssistant) -> SmartPlantsManager:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    return manager


async def test_entity_index_register_and_unregister(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")

    entity = object()
    manager.register_entity("sensor", plant.id, "moisture", entity)
    assert manager.get_entity("sensor", plant.id, "moisture") is not None
    assert len(manager.entities_for_plant(plant.id)) == 1

    manager.unregister_entity("sensor", plant.id, "moisture", entity)
    assert manager.get_entity("sensor", plant.id, "moisture") is None
    assert manager.entities_for_plant(plant.id) == ()


async def test_entity_index_supports_multiple_platforms_and_roles(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")

    manager.register_entity("sensor", plant.id, "moisture", "m")
    manager.register_entity("sensor", plant.id, "health", "h")
    manager.register_entity("binary_sensor", plant.id, "needs_water", "n")

    assert {*manager.entities_for_plant(plant.id)} == {"m", "h", "n"}
    assert manager.get_entity("binary_sensor", plant.id, "needs_water") == "n"


async def test_duplicate_register_replaces_previous_entry(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")

    manager.register_entity("sensor", plant.id, "moisture", "old")
    manager.register_entity("sensor", plant.id, "moisture", "new")

    assert manager.get_entity("sensor", plant.id, "moisture") == "new"

    manager.unregister_entity("sensor", plant.id, "moisture", "old")
    assert manager.get_entity("sensor", plant.id, "moisture") == "new"
    manager.unregister_entity("sensor", plant.id, "moisture", "new")
    assert manager.get_entity("sensor", plant.id, "moisture") is None


async def test_platform_lifecycle_adds_for_existing_plants(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant_a = await manager.async_create_plant(name="A")
    plant_b = await manager.async_create_plant(name="B")

    added: list[SmartPlantsEntity] = []

    def _add(new_entities: Any, update_before_add: bool = False) -> None:  # noqa: FBT001, FBT002
        added.extend(new_entities)

    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.runtime_data = SmartPlantsRuntimeData(manager=manager)
    lifecycle = SmartPlantsPlatformLifecycle(
        hass, entry, manager, "sensor", {"test_role": _factory}, _add
    )
    await lifecycle.async_setup()

    assert {e.plant_id for e in added} == {plant_a.id, plant_b.id}


async def test_platform_lifecycle_dynamic_add_exactly_once(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)

    added: list[SmartPlantsEntity] = []

    def _add(new_entities: Any, update_before_add: bool = False) -> None:  # noqa: FBT001, FBT002
        added.extend(new_entities)

    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.runtime_data = SmartPlantsRuntimeData(manager=manager)
    lifecycle = SmartPlantsPlatformLifecycle(
        hass, entry, manager, "sensor", {"test_role": _factory}, _add
    )
    await lifecycle.async_setup()

    assert added == []

    plant = await manager.async_create_plant(name="Aloe")
    assert len(added) == 1
    assert added[0].plant_id == plant.id

    # A duplicate PlantAddedEvent (as would occur under a buggy replay or
    # a test that re-emits) must not double-add.
    await manager._dispatch_event(PlantAddedEvent(kind="plant_added", plant=plant))
    assert len(added) == 1


async def test_platform_lifecycle_unload_stops_add_on_events(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)

    added: list[SmartPlantsEntity] = []

    def _add(new_entities: Any, update_before_add: bool = False) -> None:  # noqa: FBT001, FBT002
        added.extend(new_entities)

    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.runtime_data = SmartPlantsRuntimeData(manager=manager)
    lifecycle = SmartPlantsPlatformLifecycle(
        hass, entry, manager, "sensor", {"test_role": _factory}, _add
    )
    await lifecycle.async_setup()
    await lifecycle.async_unload()

    await manager.async_create_plant(name="Aloe")
    assert added == []


async def test_platform_lifecycle_forget_plant_allows_readd_on_recreate(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)

    added: list[SmartPlantsEntity] = []

    def _add(new_entities: Any, update_before_add: bool = False) -> None:  # noqa: FBT001, FBT002
        added.extend(new_entities)

    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.runtime_data = SmartPlantsRuntimeData(manager=manager)
    lifecycle = SmartPlantsPlatformLifecycle(
        hass, entry, manager, "sensor", {"test_role": _factory}, _add
    )
    await lifecycle.async_setup()

    plant = await manager.async_create_plant(name="Aloe")
    assert len(added) == 1

    # Deletion forgets the plant. A brand-new plant with a fresh id
    # then gets its own entity as intended.
    await manager.async_delete_plant(plant.id, expected_revision=1)
    new_plant = await manager.async_create_plant(name="Aloe 2")
    assert added[-1].plant_id == new_plant.id
    assert len(added) == 2


async def test_setup_forwards_platforms_after_replay(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.LOADED
    # Every declared platform must be represented in the process-wide
    # entity_platform registry; a missing forward would leave one of
    # the entries unaccounted for and prevent dynamic-add from working.
    forwarded_domains = {p.domain for p in async_get_platforms(hass, DOMAIN)}
    assert forwarded_domains >= {str(p) for p in PLATFORMS}


async def test_platforms_unload_before_manager(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.NOT_LOADED
    # Manager reference was popped from hass.data; ensuring no residue.
    assert DOMAIN not in hass.data


def test_helper_available() -> None:
    """Guard: PlantEvent / PlantDeletedEvent surfaces stay importable."""
    assert PlantEvent is not None
    assert PlantDeletedEvent is not None


@pytest.mark.parametrize(
    "platform_name",
    ["sensor", "binary_sensor", "number"],
)
def test_role_factories_have_registered_entities(platform_name: str) -> None:
    """Production platform factories match the registered role metadata."""
    module = __import__(
        f"custom_components.smart_plants.{platform_name}",
        fromlist=["ROLE_FACTORIES"],
    )
    expected = {
        "sensor": {
            "moisture",
            "health_score",
            "temperature",
            "humidity",
            "illuminance",
            "battery",
            "conductivity",
            "soil_temperature",
            "co2",
        },
        "binary_sensor": {
            "needs_water",
            "too_wet",
            "sensor_stale",
            "low_light",
            "low_battery",
            "temperature_stress",
            "humidity_stress",
            "soil_temperature_stress",
            "co2_stress",
            "conductivity_stress",
        },
        "number": {"moisture_min", "moisture_target", "moisture_max"},
    }
    assert set(module.ROLE_FACTORIES) == expected[platform_name]
