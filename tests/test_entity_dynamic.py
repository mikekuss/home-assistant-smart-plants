"""
Dynamic entity lifecycle end-to-end (Phase 3 Cut 2).

Exercises the full Home Assistant flow: real config-entry setup,
real entity_platform forwarding, real entity_registry / device_registry
mutations, real reload. Uses a test-only role factory patched into
``sensor.ROLE_FACTORIES`` so no meaningless production entity is
introduced.
"""

from __future__ import annotations

import asyncio
from collections.abc import Iterator
from unittest.mock import patch

import pytest
from custom_components.smart_plants import sensor as sensor_module
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.entity import SmartPlantsEntity
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantRecord
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import (
    device_registry as dr,
)
from homeassistant.helpers import (
    entity_registry as er,
)
from homeassistant.helpers.entity_platform import async_get_platforms
from pytest_homeassistant_custom_component.common import MockConfigEntry

ROLE = "test_moisture"


def _synthetic_entity(manager: SmartPlantsManager, plant_id: str) -> _SyntheticSensor:
    entity = manager.get_entity("sensor", plant_id, ROLE)
    assert isinstance(entity, _SyntheticSensor)
    return entity


class _SyntheticSensor(sensor_module.SmartPlantsSensorEntity):
    """
    Test-only sensor exposing a constant value.

    Kept trivial: the goal is exercising the shared lifecycle, not
    validating any Phase 4 computation.
    """

    _attr_native_value = 42
    _attr_translation_key = ROLE

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE, ROLE)
        # Give the entity a stable name so ``entity_id`` is
        # deterministic across setup runs even though translations
        # are not loaded in these tests.
        self._attr_name = ROLE

        self.disabled_count = 0
        self.reenabled_count = 0

    def _on_plant_disabled(self) -> None:
        self.disabled_count += 1

    def _on_plant_reenabled(self) -> None:
        self.reenabled_count += 1


def _factory(manager: SmartPlantsManager, plant: PlantRecord) -> SmartPlantsEntity:
    return _SyntheticSensor(manager, plant.id)


@pytest.fixture
def _synthetic_sensor() -> Iterator[None]:
    """Inject the synthetic sensor factory for the duration of a test."""
    with patch.dict(
        sensor_module.ROLE_FACTORIES,
        {ROLE: _factory},
        clear=False,
    ):
        yield


async def _setup_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _configure_all_gated_sources(
    manager: SmartPlantsManager, plant_id: str
) -> None:
    """
    Give every Phase 7 role a source so all production entities are created.

    Under the entity-lifecycle contract a role's entities exist only once it has
    had a source, so these lifecycle-mechanics tests configure every role to
    exercise the full production entity set.
    """
    from custom_components.smart_plants.roles import (  # noqa: PLC0415
        source_accepting_roles,
    )

    current = manager.get_plant(plant_id)
    for role in source_accepting_roles():
        current = await manager.async_set_role_sources(
            plant_id,
            role=role,
            expected_revision=current.revision,
            sources=[{"entity_id": "sensor.generic_source"}],
        )


async def test_existing_plants_get_entities_at_setup(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    # Seed a plant BEFORE setup so it exists at platform forward time.
    seed = SmartPlantsManager(hass)
    await seed.async_load()
    seed_plant = await seed.async_create_plant(name="Aloe")
    await _configure_all_gated_sources(seed, seed_plant.id)
    await seed.async_unload()

    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager

    entities = manager.entities_for_plant_on_platform("sensor", seed_plant.id)
    assert len(entities) == len(sensor_module.ROLE_FACTORIES)
    # HA entity_registry has the plant-scoped entry.
    registry = er.async_get(hass)
    unique_id = f"{DOMAIN}:{seed_plant.id}:{ROLE}"
    assert registry.async_get_entity_id("sensor", DOMAIN, unique_id) is not None


async def test_plant_created_after_setup_creates_entity_exactly_once(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager

    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    await _configure_all_gated_sources(manager, plant.id)
    await hass.async_block_till_done()

    entities = manager.entities_for_plant_on_platform("sensor", plant.id)
    assert len(entities) == len(sensor_module.ROLE_FACTORIES)
    unique_id = f"{DOMAIN}:{plant.id}:{ROLE}"
    registry = er.async_get(hass)
    assert registry.async_get_entity_id("sensor", DOMAIN, unique_id) is not None


async def test_rename_preserves_unique_and_entity_id(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager

    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    unique_id = f"{DOMAIN}:{plant.id}:{ROLE}"
    original_entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert original_entity_id is not None

    await manager.async_update_plant(plant.id, expected_revision=1, name="Aloe Vera")
    await hass.async_block_till_done()

    # The unique_id (derived from immutable plant_id) is stable, and HA
    # keeps the same registry row → entity_id survives the rename.
    unchanged_entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert unchanged_entity_id == original_entity_id


async def test_device_identity_survives_rename(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager

    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    device_registry = dr.async_get(hass)
    device_before = device_registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device_before is not None

    await manager.async_update_plant(plant.id, expected_revision=1, name="Aloe Vera")
    await hass.async_block_till_done()

    device_after = device_registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device_after is not None
    assert device_after.id == device_before.id
    assert device_after.name == "Aloe Vera"


async def test_disable_marks_entity_unavailable_without_registry_delete(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager

    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    await _configure_all_gated_sources(manager, plant.id)
    await hass.async_block_till_done()
    unique_id = f"{DOMAIN}:{plant.id}:{ROLE}"
    registry = er.async_get(hass)
    entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id is not None

    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state != "unavailable"

    await manager.async_disable_plant(
        plant.id, expected_revision=manager.get_plant(plant.id).revision
    )
    await hass.async_block_till_done()

    # Registry entry survives; the state flips to unavailable.
    assert registry.async_get_entity_id("sensor", DOMAIN, unique_id) == entity_id
    disabled_state = hass.states.get(entity_id)
    assert disabled_state is not None
    assert disabled_state.state == "unavailable"

    # Subclass hook fired exactly once.
    entities = manager.entities_for_plant_on_platform("sensor", plant.id)
    assert len(entities) == len(sensor_module.ROLE_FACTORIES)
    assert _synthetic_entity(manager, plant.id).disabled_count == 1


async def test_reenable_restores_availability_without_duplicates(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager

    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    await _configure_all_gated_sources(manager, plant.id)
    await hass.async_block_till_done()
    disabled = await manager.async_disable_plant(
        plant.id, expected_revision=manager.get_plant(plant.id).revision
    )
    await hass.async_block_till_done()
    await manager.async_reenable_plant(plant.id, expected_revision=disabled.revision)
    await hass.async_block_till_done()

    # Exactly one entity, exactly one reenable hook fire.
    entities = manager.entities_for_plant_on_platform("sensor", plant.id)
    assert len(entities) == len(sensor_module.ROLE_FACTORIES)
    synthetic = _synthetic_entity(manager, plant.id)
    assert synthetic.disabled_count == 1
    assert synthetic.reenabled_count == 1

    unique_id = f"{DOMAIN}:{plant.id}:{ROLE}"
    registry = er.async_get(hass)
    entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state != "unavailable"


async def test_user_disabled_registry_entry_survives_plant_lifecycle(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager

    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    registry = er.async_get(hass)
    unique_id = f"{DOMAIN}:{plant.id}:{ROLE}"
    entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id is not None

    # User disables the entity through the entity registry UI.
    registry.async_update_entity(entity_id, disabled_by=er.RegistryEntryDisabler.USER)
    updated = registry.async_get(entity_id)
    assert updated is not None
    assert updated.disabled_by is er.RegistryEntryDisabler.USER

    # Plant lifecycle changes must not touch the user's disabled_by flag.
    await manager.async_disable_plant(plant.id, expected_revision=1)
    await manager.async_reenable_plant(plant.id, expected_revision=2)
    await hass.async_block_till_done()

    still = registry.async_get(entity_id)
    assert still is not None
    assert still.disabled_by is er.RegistryEntryDisabler.USER


async def test_reload_preserves_registry_and_no_duplicate_entities(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager

    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    await _configure_all_gated_sources(manager, plant.id)
    await hass.async_block_till_done()
    unique_id = f"{DOMAIN}:{plant.id}:{ROLE}"
    registry = er.async_get(hass)
    original_entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert original_entity_id is not None

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded_entry = hass.config_entries.async_get_entry(entry.entry_id)
    assert reloaded_entry is not None
    assert reloaded_entry.state is ConfigEntryState.LOADED
    new_manager = reloaded_entry.runtime_data.manager
    assert new_manager is not manager

    entities = new_manager.entities_for_plant_on_platform("sensor", plant.id)
    assert len(entities) == len(sensor_module.ROLE_FACTORIES)
    # Registry rows survive the reload with the same entity_id.
    same = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert same == original_entity_id


async def test_unload_preserves_registry_and_storage(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    unique_id = f"{DOMAIN}:{plant.id}:{ROLE}"
    registry = er.async_get(hass)
    entity_id_before = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id_before is not None

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    # Registry entry survives config-entry unload; storage keeps the plant.
    entity_id_after = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id_after == entity_id_before

    fresh = SmartPlantsManager(hass)
    await fresh.async_load()
    assert plant.id in fresh.snapshot.plants


async def test_delete_removes_runtime_entity_before_registry_cleanup(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    await manager.async_delete_plant(plant.id, expected_revision=1)
    await hass.async_block_till_done()

    # Runtime object is gone; registry state is Cut 3 territory and is
    # NOT verified here.
    assert manager.entities_for_plant_on_platform("sensor", plant.id) == ()


async def test_delete_waits_for_delayed_dynamic_add_and_cannot_recreate_entity(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    platform = next(
        item for item in async_get_platforms(hass, DOMAIN) if item.domain == "sensor"
    )
    original_add = platform.async_add_entities
    entered = asyncio.Event()
    release = asyncio.Event()

    async def delayed_add(*args: object, **kwargs: object) -> None:
        entered.set()
        await release.wait()
        await original_add(*args, **kwargs)  # type: ignore[arg-type]

    with patch.object(platform, "async_add_entities", side_effect=delayed_add):
        create = asyncio.create_task(manager.async_create_plant(name="Aloe"))
        await entered.wait()
        plant = next(iter(manager.snapshot.plants.values()))
        delete = asyncio.create_task(
            manager.async_delete_plant(plant.id, expected_revision=1)
        )
        await asyncio.sleep(0)
        assert not delete.done()
        release.set()
        await create
        await delete

    assert manager.entities_for_plant(plant.id) == ()
    registry = er.async_get(hass)
    assert (
        registry.async_get_entity_id("sensor", DOMAIN, f"{DOMAIN}:{plant.id}:{ROLE}")
        is None
    )
