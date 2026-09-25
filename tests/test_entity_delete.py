"""
Permanent-deletion protocol and interrupted-cleanup recovery (Phase 3 Cut 3).

Every boundary in the durable deletion flow is asserted to be
restart-recoverable via an idempotent tombstone-driven replay. The
same tests confirm that ordinary unload/reload never touches the
entity_registry or the device.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants import sensor as sensor_module
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.device import SmartPlantsDeviceReconciler
from custom_components.smart_plants.entity import SmartPlantsEntity
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantRecord
from custom_components.smart_plants.roles import entity_roles
from custom_components.smart_plants.storage import SmartPlantsStorageError
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

ROLE = "test_moisture"


def _production_entity_role_count() -> int:
    return sum(
        len(entity_roles(platform))
        for platform in ("sensor", "binary_sensor", "number")
    )


async def _configure_all_role_sources(
    manager: SmartPlantsManager, plant_id: str
) -> Any:
    """
    Give every source-accepting Phase 7 role one source.

    Under the entity-lifecycle contract a role's entities exist only once it has
    had a source, so tests that need the full production entity set must first
    configure every role.
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
    return current


class _SyntheticSensor(sensor_module.SmartPlantsSensorEntity):
    _attr_native_value = 42
    _attr_translation_key = ROLE

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE, ROLE)
        self._attr_name = ROLE


def _factory(manager: SmartPlantsManager, plant: PlantRecord) -> SmartPlantsEntity:
    return _SyntheticSensor(manager, plant.id)


@pytest.fixture
def _synthetic_sensor() -> Iterator[None]:
    with patch.dict(
        sensor_module.ROLE_FACTORIES,
        {ROLE: _factory},
        clear=False,
    ):
        yield


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _reload(hass: HomeAssistant, entry_id: str) -> Any:
    assert await hass.config_entries.async_reload(entry_id)
    await hass.async_block_till_done()
    reloaded = hass.config_entries.async_get_entry(entry_id)
    assert reloaded is not None
    return reloaded


def _entity_registry_ids_for_plant(
    hass: HomeAssistant, plant_id: str
) -> tuple[str, ...]:
    device_registry = dr.async_get(hass)
    device = device_registry.async_get_device(identifiers={(DOMAIN, plant_id)})
    if device is None:
        return ()
    entity_reg = er.async_get(hass)
    return tuple(
        entry.entity_id
        for entry in er.async_entries_for_device(
            entity_reg, device.id, include_disabled_entities=True
        )
    )


def _device_exists(hass: HomeAssistant, plant_id: str) -> bool:
    device_registry = dr.async_get(hass)
    return (
        device_registry.async_get_device(identifiers={(DOMAIN, plant_id)}) is not None
    )


async def test_delete_removes_enabled_and_user_disabled_entities_then_device(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager

    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    configured = await _configure_all_role_sources(manager, plant.id)
    await hass.async_block_till_done()

    entity_ids = _entity_registry_ids_for_plant(hass, plant.id)
    assert len(entity_ids) == _production_entity_role_count() + 1
    entity_reg = er.async_get(hass)

    entity_reg.async_update_entity(
        entity_ids[0], disabled_by=er.RegistryEntryDisabler.USER
    )
    entry_after_disable = entity_reg.async_get(entity_ids[0])
    assert entry_after_disable is not None
    assert entry_after_disable.disabled_by is er.RegistryEntryDisabler.USER

    await manager.async_delete_plant(plant.id, expected_revision=configured.revision)
    await hass.async_block_till_done()

    assert _entity_registry_ids_for_plant(hass, plant.id) == ()
    assert not _device_exists(hass, plant.id)
    assert manager.snapshot.tombstones == ()


async def test_colon_legacy_plant_ids_never_cross_delete(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    reconciler = SmartPlantsDeviceReconciler(hass, entry.entry_id)
    manager = SmartPlantsManager(hass, reconciler=reconciler)
    await manager.async_load()
    plant_a = PlantRecord(
        id="a",
        revision=1,
        name="A",
        created_at="2026-09-05T00:00:00Z",
    )
    plant_ab = PlantRecord(
        id="a:b",
        revision=1,
        name="AB",
        created_at="2026-09-05T00:00:00Z",
    )
    await manager.async_mutate_for_test(
        lambda snapshot: snapshot.with_plant(plant_a).with_plant(plant_ab)
    )
    await reconciler.async_reconcile_present(plant_a)
    await reconciler.async_reconcile_present(plant_ab)
    device_registry = dr.async_get(hass)
    device_a = device_registry.async_get_device(identifiers={(DOMAIN, "a")})
    device_ab = device_registry.async_get_device(identifiers={(DOMAIN, "a:b")})
    assert device_a is not None
    assert device_ab is not None
    entity_registry = er.async_get(hass)
    entity_a = entity_registry.async_get_or_create(
        "sensor",
        DOMAIN,
        f"{DOMAIN}:a:moisture",
        config_entry=entry,
        device_id=device_a.id,
        suggested_object_id="a_moisture",
    )
    entity_ab = entity_registry.async_get_or_create(
        "sensor",
        DOMAIN,
        f"{DOMAIN}:a:b:moisture",
        config_entry=entry,
        device_id=device_ab.id,
        suggested_object_id="ab_moisture",
    )

    await manager.async_delete_plant("a", expected_revision=1)
    assert entity_registry.async_get(entity_a.entity_id) is None
    assert entity_registry.async_get(entity_ab.entity_id) is not None
    assert _device_exists(hass, "a:b")

    await manager.async_delete_plant("a:b", expected_revision=1)
    assert entity_registry.async_get(entity_ab.entity_id) is None
    assert not _device_exists(hass, "a:b")


async def test_reload_never_deletes_registry_entries(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    await _configure_all_role_sources(manager, plant.id)
    await hass.async_block_till_done()

    before = _entity_registry_ids_for_plant(hass, plant.id)
    assert len(before) == _production_entity_role_count() + 1

    reloaded = await _reload(hass, entry.entry_id)
    after = _entity_registry_ids_for_plant(hass, plant.id)
    assert after == before
    assert _device_exists(hass, plant.id)
    assert plant.id in reloaded.runtime_data.manager.snapshot.plants


async def test_restart_after_crash_before_runtime_removal_completes_delete(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    """Boundary 1: crash after tombstone publish, before entity teardown."""
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    with (
        patch.object(
            SmartPlantsManager,
            "_dispatch_event",
            side_effect=RuntimeError("crash before dispatch"),
        ),
        pytest.raises(RuntimeError),
    ):
        await manager.async_delete_plant(plant.id, expected_revision=1)

    assert any(t.plant_id == plant.id for t in manager.snapshot.tombstones)

    reloaded = await _reload(hass, entry.entry_id)
    assert _entity_registry_ids_for_plant(hass, plant.id) == ()
    assert not _device_exists(hass, plant.id)
    assert reloaded.runtime_data.manager.snapshot.tombstones == ()


async def test_restart_after_crash_during_entity_registry_cleanup(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    """Boundary 3: crash mid entity-registry removal."""
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    entity_reg = er.async_get(hass)
    original_remove = entity_reg.async_remove
    call_state = {"first": True}

    def _flaky_remove(entity_id: str) -> None:
        if call_state["first"]:
            call_state["first"] = False
            raise RuntimeError("crash mid entity cleanup")
        original_remove(entity_id)

    with (
        patch.object(entity_reg, "async_remove", side_effect=_flaky_remove),
        pytest.raises(RuntimeError),
    ):
        await manager.async_delete_plant(plant.id, expected_revision=1)

    assert any(t.plant_id == plant.id for t in manager.snapshot.tombstones)

    reloaded = await _reload(hass, entry.entry_id)
    assert _entity_registry_ids_for_plant(hass, plant.id) == ()
    assert not _device_exists(hass, plant.id)
    assert reloaded.runtime_data.manager.snapshot.tombstones == ()


async def test_restart_after_crash_between_registry_and_device_removal(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    """Boundary 4: entities removed, device not yet removed, then crash."""
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    device_registry = dr.async_get(hass)

    def _crash_before_device_remove(_device_id: str) -> None:
        raise RuntimeError("crash before device removal")

    with (
        patch.object(
            device_registry,
            "async_remove_device",
            side_effect=_crash_before_device_remove,
        ),
        pytest.raises(RuntimeError),
    ):
        await manager.async_delete_plant(plant.id, expected_revision=1)

    assert _entity_registry_ids_for_plant(hass, plant.id) == ()
    assert _device_exists(hass, plant.id)
    assert any(t.plant_id == plant.id for t in manager.snapshot.tombstones)

    reloaded = await _reload(hass, entry.entry_id)

    assert _entity_registry_ids_for_plant(hass, plant.id) == ()
    assert not _device_exists(hass, plant.id)
    assert reloaded.runtime_data.manager.snapshot.tombstones == ()


async def test_restart_after_crash_between_device_and_tombstone_clear(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    """Boundary 5: device removed, tombstone-clear publish crashes."""
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    original_save = manager._store.async_save
    save_calls: list[Any] = []

    async def _fail_last_save(snapshot: Any) -> None:
        save_calls.append(snapshot)
        has_our_tombstone = any(t.plant_id == plant.id for t in snapshot.tombstones)
        if len(save_calls) >= 2 and not has_our_tombstone:
            raise OSError("crash on tombstone clear")
        await original_save(snapshot)

    with (
        patch.object(manager._store, "async_save", side_effect=_fail_last_save),
        pytest.raises(SmartPlantsStorageError),
    ):
        await manager.async_delete_plant(plant.id, expected_revision=1)

    assert _entity_registry_ids_for_plant(hass, plant.id) == ()
    assert not _device_exists(hass, plant.id)
    assert any(t.plant_id == plant.id for t in manager.snapshot.tombstones)

    reloaded = await _reload(hass, entry.entry_id)
    assert reloaded.runtime_data.manager.snapshot.tombstones == ()


async def test_reconcile_absent_is_idempotent(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    reconciler = manager.reconciler
    assert reconciler is not None
    await reconciler.async_reconcile_absent(plant.id)
    await reconciler.async_reconcile_absent(plant.id)
    assert not _device_exists(hass, plant.id)
    assert _entity_registry_ids_for_plant(hass, plant.id) == ()


async def test_delete_removes_unknown_role_even_when_device_is_already_absent(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    device_registry = dr.async_get(hass)
    device = device_registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device is not None
    entity_reg = er.async_get(hass)
    unknown = entity_reg.async_get_or_create(
        domain="sensor",
        platform=DOMAIN,
        unique_id=f"{DOMAIN}:{plant.id}:future_role",
        config_entry=entry,
        device_id=device.id,
        suggested_object_id="future_role",
    )
    unknown = entity_reg.async_update_entity(
        unknown.entity_id, config_entry_id=None, device_id=None
    )
    reloaded = await _reload(hass, entry.entry_id)
    assert entity_reg.async_get(unknown.entity_id) is not None
    manager = reloaded.runtime_data.manager
    device = device_registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device is not None
    device_registry.async_remove_device(device.id)

    await manager.async_delete_plant(plant.id, expected_revision=1)

    assert entity_reg.async_get(unknown.entity_id) is None
    assert manager.snapshot.tombstones == ()


async def test_registry_flush_failure_keeps_pending_tombstone(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    entity_reg = er.async_get(hass)

    with (
        patch.object(
            entity_reg._store,
            "_async_write_data",
            side_effect=OSError("registry disk failure"),
        ),
        pytest.raises(OSError, match="registry disk failure"),
    ):
        await manager.async_delete_plant(plant.id, expected_revision=1)

    tombstone = next(t for t in manager.snapshot.tombstones if t.plant_id == plant.id)
    assert tombstone.payload["cleanup_phase"] == "pending"


async def test_device_registry_flush_failure_keeps_retryable_tombstone(
    hass: HomeAssistant,
    _synthetic_sensor: None,  # noqa: PT019
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    device_registry = dr.async_get(hass)

    with (
        patch.object(
            device_registry._store,
            "_async_write_data",
            side_effect=OSError("device registry disk failure"),
        ),
        pytest.raises(OSError, match="device registry disk failure"),
    ):
        await manager.async_delete_plant(plant.id, expected_revision=1)

    tombstone = next(t for t in manager.snapshot.tombstones if t.plant_id == plant.id)
    assert tombstone.payload["cleanup_phase"] == "pending"
