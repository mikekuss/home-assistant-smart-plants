from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, patch

import custom_components.smart_plants as integration
import pytest
from custom_components.smart_plants import SmartPlantsRuntimeData
from custom_components.smart_plants.const import (
    CONF_PRESERVE_INVENTORY_ON_REMOVAL,
    DOMAIN,
    SINGLETON_UNIQUE_ID,
)
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsManagerUnavailableError,
)
from custom_components.smart_plants.panel import PANEL_URL_PATH
from custom_components.smart_plants.storage import SmartPlantsStorageError
from homeassistant.config_entries import ConfigEntryState, OperationNotAllowed
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def test_setup_stores_runtime_manager_and_unload(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Smart Plants",
        data={},
        unique_id=SINGLETON_UNIQUE_ID,
    )
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.LOADED
    assert isinstance(entry.runtime_data, SmartPlantsRuntimeData)
    assert isinstance(entry.runtime_data.manager, SmartPlantsManager)

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert DOMAIN not in hass.data


async def test_duplicate_setup_rejected(hass: HomeAssistant) -> None:
    # single_config_entry: true in the manifest makes HA reject a second
    # entry outright with OperationNotAllowed. The runtime singleton slot in
    # hass.data is defence-in-depth for the residual race window inside a
    # single setup call. We verify both here: exactly one entry is ever
    # loaded, and hass.data points at it.
    first = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    second = MockConfigEntry(domain=DOMAIN, data={}, unique_id="other")
    first.add_to_hass(hass)
    second.add_to_hass(hass)

    assert await hass.config_entries.async_setup(first.entry_id)
    await hass.async_block_till_done()
    assert first.state is ConfigEntryState.LOADED

    # HA's single_config_entry manifest flag makes setting up a second entry
    # raise OperationNotAllowed. Even if HA ever loosens that, our runtime
    # singleton in hass.data must still keep exactly one entry loaded.
    with pytest.raises(OperationNotAllowed):
        await hass.config_entries.async_setup(second.entry_id)
    await hass.async_block_till_done()

    assert second.state is not ConfigEntryState.LOADED
    assert hass.data[DOMAIN] == first.entry_id


async def test_setup_failure_releases_singleton_slot(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)

    with patch.object(
        SmartPlantsManager,
        "async_load",
        side_effect=SmartPlantsStorageError("boom"),
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.SETUP_ERROR
    assert DOMAIN not in hass.data

    # A reload after the underlying problem is resolved must succeed and
    # re-claim the singleton slot. Re-fetch entry state via config_entries
    # so mypy doesn't hold on to the narrowed SETUP_ERROR literal.
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded_entry = hass.config_entries.async_get_entry(entry.entry_id)
    assert reloaded_entry is not None
    assert reloaded_entry.state is ConfigEntryState.LOADED
    assert hass.data[DOMAIN] == entry.entry_id


async def test_setup_rolls_back_when_replay_fails(hass: HomeAssistant) -> None:
    """
    Reconciliation replay failure rolls back the whole setup transaction.

    No runtime manager published on the entry, no lingering singleton slot,
    and the manager left in the unavailable state so a stale reference
    cannot write behind a subsequent successful reload.
    """
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)

    with patch.object(
        SmartPlantsManager,
        "async_replay_pending",
        side_effect=RuntimeError("replay boom"),
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.SETUP_ERROR
    assert DOMAIN not in hass.data

    # Reload with the fault removed must succeed and re-claim the slot.
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded_entry = hass.config_entries.async_get_entry(entry.entry_id)
    assert reloaded_entry is not None
    assert reloaded_entry.state is ConfigEntryState.LOADED
    assert hass.data[DOMAIN] == entry.entry_id


async def test_setup_rolls_back_when_panel_registration_fails(
    hass: HomeAssistant,
) -> None:
    """
    Panel registration failure rolls back the whole setup transaction.

    Panel registration is the last step; if it raises, the manager must be
    unloaded, runtime_data cleared, the singleton slot released, and any
    partial lifecycle registration removed so a later reload starts from a
    clean state.
    """
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)

    with patch(
        "custom_components.smart_plants.async_register_panel",
        side_effect=RuntimeError("panel boom"),
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.SETUP_ERROR
    assert DOMAIN not in hass.data
    # The panel must not be left registered in the sidebar after the
    # failed transaction rolls back.
    assert PANEL_URL_PATH not in hass.data.get("frontend_panels", {})

    # A reload without the injected failure must fully succeed: manager
    # published, panel registered, singleton slot re-claimed.
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded_entry = hass.config_entries.async_get_entry(entry.entry_id)
    assert reloaded_entry is not None
    assert reloaded_entry.state is ConfigEntryState.LOADED
    assert hass.data[DOMAIN] == entry.entry_id
    assert PANEL_URL_PATH in hass.data.get("frontend_panels", {})


async def test_setup_rolls_back_partially_registered_panel_and_manager(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    managers: list[SmartPlantsManager] = []
    original_load = SmartPlantsManager.async_load

    async def capture_load(manager: SmartPlantsManager) -> None:
        managers.append(manager)
        await original_load(manager)

    async def partial_registration(hass: HomeAssistant) -> None:
        hass.data.setdefault("frontend_panels", {})[PANEL_URL_PATH] = object()
        raise RuntimeError("panel failed after registration")

    with (
        patch.object(SmartPlantsManager, "async_load", new=capture_load),
        patch(
            "custom_components.smart_plants.async_register_panel",
            side_effect=partial_registration,
        ),
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert DOMAIN not in hass.data
    # The mocked registration inserted a panel without Smart Plants' ownership
    # marker. Rollback must preserve it rather than deleting an unknown owner.
    assert PANEL_URL_PATH in hass.data.get("frontend_panels", {})
    assert len(managers) == 1
    assert not managers[0].available
    with pytest.raises(SmartPlantsManagerUnavailableError):
        await managers[0].async_create_plant(name="stale")


async def test_setup_abort_retries_partial_platform_cleanup_and_closes_manager(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    managers: list[SmartPlantsManager] = []
    original_load = SmartPlantsManager.async_load

    async def capture_load(manager: SmartPlantsManager) -> None:
        managers.append(manager)
        await original_load(manager)

    unload = AsyncMock(side_effect=[False, True])
    with (
        patch.object(SmartPlantsManager, "async_load", new=capture_load),
        patch.object(
            hass.config_entries,
            "async_forward_entry_setups",
            side_effect=RuntimeError("partial forward"),
        ),
        patch.object(hass.config_entries, "async_unload_platforms", unload),
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)

    assert unload.await_count == 1
    assert DOMAIN not in hass.data
    assert len(managers) == 1
    assert not managers[0].available


async def test_setup_rollback_retains_owner_when_platforms_cannot_unload(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)

    async def partial_forward(*_args: Any) -> None:
        lifecycle = AsyncMock()
        lifecycle.is_attached = True
        entry.runtime_data.platform_lifecycles = {
            str(platform): lifecycle for platform in integration.PLATFORMS
        }
        raise RuntimeError("partial forward")

    with (
        patch.object(
            hass.config_entries,
            "async_forward_entry_setups",
            side_effect=partial_forward,
        ),
        patch.object(
            hass.config_entries,
            "async_unload_platforms",
            new=AsyncMock(return_value=False),
        ),
        pytest.raises(RuntimeError, match="rollback remained incomplete"),
    ):
        await integration.async_setup_entry(hass, entry)

    assert hass.data[DOMAIN] == entry.entry_id
    assert entry.runtime_data.manager.available


async def test_repair_monitor_start_failure_cleans_runtime_and_subscriptions(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    managers: list[SmartPlantsManager] = []
    original_load = SmartPlantsManager.async_load

    async def capture_load(manager: SmartPlantsManager) -> None:
        managers.append(manager)
        await original_load(manager)

    with (
        patch.object(SmartPlantsManager, "async_load", new=capture_load),
        patch(
            "custom_components.smart_plants.MissingSourceRepairMonitor.start",
            side_effect=RuntimeError("monitor start failed"),
        ),
        pytest.raises(RuntimeError, match="monitor start failed"),
    ):
        await integration.async_setup_entry(hass, entry)

    assert DOMAIN not in hass.data
    assert len(managers) == 1
    assert not managers[0].available
    assert managers[0]._subscribers == []
    assert managers[0]._registry_subscribers == []


async def test_partial_unload_restores_platforms_and_keeps_runtime_live(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager = entry.runtime_data.manager

    original_unload = hass.config_entries.async_unload_platforms
    initial_lifecycles = dict(entry.runtime_data.platform_lifecycles)
    subscriber_count = len(manager._subscribers)
    attempts = 0

    async def partial_unload(_entry: Any, _platforms: Any) -> bool:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            assert await original_unload(_entry, [Platform.SENSOR])
        return False

    for _attempt in range(2):
        with patch.object(
            hass.config_entries,
            "async_unload_platforms",
            side_effect=partial_unload,
        ):
            assert not await integration.async_unload_entry(hass, entry)
        await hass.async_block_till_done()
        assert manager.available
        assert hass.data[DOMAIN] == entry.entry_id
        assert len(manager._subscribers) == subscriber_count
        assert set(entry.runtime_data.platform_lifecycles) == {
            "sensor",
            "binary_sensor",
            "number",
        }
        assert (
            entry.runtime_data.platform_lifecycles["binary_sensor"]
            is initial_lifecycles["binary_sensor"]
        )
        assert (
            entry.runtime_data.platform_lifecycles["number"]
            is initial_lifecycles["number"]
        )

    assert attempts == 2


async def test_default_removal_deletes_storage(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    manager = entry.runtime_data.manager
    await manager.async_create_internal_record("Aloe")

    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()

    reloaded = SmartPlantsManager(hass)
    await reloaded.async_load()
    assert reloaded.snapshot.revision == 0
    assert reloaded.snapshot.plants == {}


async def test_preserve_option_keeps_storage(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        options={CONF_PRESERVE_INVENTORY_ON_REMOVAL: True},
        unique_id=SINGLETON_UNIQUE_ID,
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    manager = entry.runtime_data.manager
    plant = await manager.async_create_internal_record("Aloe")

    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()

    reloaded = SmartPlantsManager(hass)
    await reloaded.async_load()
    assert plant.id in reloaded.snapshot.plants


async def test_mutation_after_unload_is_rejected(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager = entry.runtime_data.manager

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    assert not manager.available
    assert not manager.mutation_lock.locked()

    with pytest.raises(SmartPlantsManagerUnavailableError):
        await manager.async_create_internal_record("Should not appear")


async def test_unload_drains_in_flight_mutation(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager = entry.runtime_data.manager

    release = asyncio.Event()
    original_save = manager._store.async_save

    async def slow_save(snapshot: Any) -> None:
        await release.wait()
        await original_save(snapshot)

    with patch.object(manager._store, "async_save", side_effect=slow_save):
        mutation = asyncio.create_task(manager.async_create_internal_record("Slow"))
        # Give the mutation a chance to grab the lock and enter the save.
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        unload_task = asyncio.create_task(manager.async_unload())
        await asyncio.sleep(0)
        assert not unload_task.done()
        for _ in range(20):
            if not manager.available:
                break
            await asyncio.sleep(0)
        assert not manager.available
        release.set()
        await mutation
        await unload_task

    assert not manager.available
    # Work admitted before closing is durable and published consistently.
    assert manager.snapshot.revision == 1
    assert manager._controllers == {}


async def test_unload_drains_in_flight_reenable_without_listener_leak(
    hass: HomeAssistant,
) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_plant(name="Aloe")
    disabled = await manager.async_disable_plant(plant.id, expected_revision=1)
    release = asyncio.Event()
    original_save = manager._store.async_save

    async def slow_save(snapshot: Any) -> None:
        await release.wait()
        await original_save(snapshot)

    with patch.object(manager._store, "async_save", side_effect=slow_save):
        mutation = asyncio.create_task(
            manager.async_reenable_plant(plant.id, expected_revision=disabled.revision)
        )
        await asyncio.sleep(0)
        unload = asyncio.create_task(manager.async_unload())
        await asyncio.sleep(0)
        release.set()
        await mutation
        await unload

    assert manager._controllers == {}
    assert manager._subscribers == []


async def test_mutation_queued_before_unload_is_rejected(hass: HomeAssistant) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()

    await manager.mutation_lock.acquire()
    mutation = asyncio.create_task(manager.async_create_internal_record("Queued"))
    await asyncio.sleep(0)
    unload_task = asyncio.create_task(manager.async_unload())
    await asyncio.sleep(0)
    manager.mutation_lock.release()

    with pytest.raises(SmartPlantsManagerUnavailableError):
        await mutation
    await unload_task
    assert manager.snapshot.revision == 0


async def test_persistence_failure_does_not_publish_snapshot(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager = entry.runtime_data.manager

    with (
        patch.object(
            manager._store,
            "async_save",
            side_effect=OSError("disk full"),
        ),
        pytest.raises(SmartPlantsStorageError),
    ):
        await manager.async_create_internal_record("Should not persist")

    assert manager.snapshot.revision == 0
    assert manager.snapshot.plants == {}

    # A subsequent successful mutation still works.
    plant = await manager.async_create_internal_record("Now works")
    assert manager.snapshot.revision == 1
    assert plant.id in manager.snapshot.plants


async def test_stale_manager_reference_after_reload_is_rejected(
    hass: HomeAssistant,
) -> None:
    """
    Stale manager reference must reject mutations after a reload.

    F4: A caller that kept a reference to the old manager across an unload
    plus reload cycle would otherwise be able to write behind the fresh
    manager's back into a store the new manager now owns.
    """
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    old_manager = entry.runtime_data.manager

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded = hass.config_entries.async_get_entry(entry.entry_id)
    assert reloaded is not None
    new_manager = reloaded.runtime_data.manager
    assert new_manager is not old_manager

    # The old reference is unloaded; every mutation path must refuse rather
    # than write behind the new manager's back.
    with pytest.raises(SmartPlantsManagerUnavailableError):
        await old_manager.async_create_internal_record("Stale write")
    assert new_manager.snapshot.revision == 0
    assert new_manager.snapshot.plants == {}


async def test_removal_after_unload_does_not_resurrect_from_stale_manager(
    hass: HomeAssistant,
) -> None:
    """
    Removal after unload must not be resurrected by a stale reference.

    F4: If async_unload correctly marks the manager unavailable, a stale
    reference that later tries to mutate cannot race the removal path
    into recreating the deleted storage.
    """
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    stale_manager = entry.runtime_data.manager
    await stale_manager.async_create_internal_record("Doomed")

    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()

    # The stale reference is unavailable; the write it attempts must be
    # rejected before it can reach the store, so no ghost snapshot lands
    # on disk after removal.
    with pytest.raises(SmartPlantsManagerUnavailableError):
        await stale_manager.async_create_internal_record("Ghost")

    # And storage is truly gone: a fresh manager finds an empty inventory.
    fresh = SmartPlantsManager(hass)
    await fresh.async_load()
    assert fresh.snapshot.revision == 0
    assert fresh.snapshot.plants == {}


async def test_removal_waits_for_in_flight_write_then_deletes_storage(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager = entry.runtime_data.manager

    release = asyncio.Event()
    original_save = manager._store.async_save

    async def slow_save(snapshot: Any) -> None:
        await release.wait()
        await original_save(snapshot)

    with patch.object(manager._store, "async_save", side_effect=slow_save):
        mutation = asyncio.create_task(
            manager.async_create_internal_record("In flight")
        )
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        removal = asyncio.create_task(hass.config_entries.async_remove(entry.entry_id))
        await asyncio.sleep(0)
        assert not removal.done()
        assert not manager.available
        release.set()
        await mutation
        await removal
        await hass.async_block_till_done()

    fresh = SmartPlantsManager(hass)
    await fresh.async_load()
    assert fresh.snapshot.revision == 0
    assert fresh.snapshot.plants == {}
