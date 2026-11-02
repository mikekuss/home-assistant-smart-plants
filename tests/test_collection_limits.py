"""
Saves keep every collection within the limits the loader enforces.

The loader refuses storage with more than ``COLLECTION_MAX_COUNT`` plants,
pending operations or tombstones. A save that would cross a limit must be
refused, or setup would fail on the next start.
"""

from __future__ import annotations

import copy
from typing import Any

import pytest
from custom_components.smart_plants.const import STORAGE_KEY
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsPlantLimitError,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import (
    COLLECTION_MAX_COUNT,
    InventorySnapshot,
    PendingOperation,
    PlantRecord,
    Tombstone,
)
from custom_components.smart_plants.storage import (
    SmartPlantsStorageError,
    SmartPlantsStorageFullError,
    SmartPlantsStore,
)
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError


def _plants(count: int) -> dict[str, PlantRecord]:
    return {
        f"plant-{index}": PlantRecord(
            id=f"plant-{index}",
            revision=1,
            name="Aloe",
            created_at="2026-09-05T00:00:00Z",
        )
        for index in range(count)
    }


def _operations(count: int) -> tuple[PendingOperation, ...]:
    return tuple(
        PendingOperation(
            op_id=f"op-{index}",
            kind="update_plant",
            plant_id=f"plant-{index}",
            requested_at="2026-09-05T00:00:00Z",
            expected_revision=1,
            payload={},
        )
        for index in range(count)
    )


def _tombstones(count: int, *, phase: str = "pending") -> tuple[Tombstone, ...]:
    return tuple(
        Tombstone(
            plant_id=f"deleted-{index}",
            deleted_at="2026-09-05T00:00:00Z",
            payload={"image_id": None, "cleanup_phase": phase},
        )
        for index in range(count)
    )


def _snapshot(collection: str, count: int) -> InventorySnapshot:
    if collection == "plants":
        return InventorySnapshot(revision=1, plants=_plants(count))
    if collection == "pending_operations":
        return InventorySnapshot(revision=1, pending_operations=_operations(count))
    return InventorySnapshot(revision=1, tombstones=_tombstones(count))


COLLECTIONS = ("plants", "pending_operations", "tombstones")


@pytest.mark.parametrize("collection", COLLECTIONS)
async def test_save_at_the_collection_limit_saves_and_loads_back(
    hass: HomeAssistant, collection: str
) -> None:
    await SmartPlantsStore(hass).async_save(_snapshot(collection, COLLECTION_MAX_COUNT))

    loaded = await SmartPlantsStore(hass).async_load()
    assert len(getattr(loaded, collection)) == COLLECTION_MAX_COUNT


@pytest.mark.parametrize("collection", COLLECTIONS)
async def test_save_over_the_collection_limit_is_refused(
    hass: HomeAssistant, hass_storage: dict[str, Any], collection: str
) -> None:
    store = SmartPlantsStore(hass)
    await store.async_save(_snapshot(collection, COLLECTION_MAX_COUNT))
    stored = copy.deepcopy(hass_storage[STORAGE_KEY])

    with pytest.raises(SmartPlantsStorageFullError):
        await store.async_save(_snapshot(collection, COLLECTION_MAX_COUNT + 1))

    assert hass_storage[STORAGE_KEY] == stored
    assert len(getattr(await store.async_load(), collection)) == COLLECTION_MAX_COUNT


async def test_save_that_the_loader_would_reject_is_refused(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    store = SmartPlantsStore(hass)
    await store.async_save(InventorySnapshot.empty())
    stored = copy.deepcopy(hass_storage[STORAGE_KEY])
    # A live plant must never also have a tombstone.
    plants = _plants(1)
    invalid = InventorySnapshot(
        revision=1,
        plants=plants,
        tombstones=(
            Tombstone(
                plant_id="plant-0",
                deleted_at="2026-09-05T00:00:00Z",
                payload={"image_id": None, "cleanup_phase": "pending"},
            ),
        ),
    )

    with pytest.raises(SmartPlantsStorageError):
        await store.async_save(invalid)

    assert hass_storage[STORAGE_KEY] == stored


async def _manager_with(hass: HomeAssistant, snapshot: InventorySnapshot) -> Any:
    await SmartPlantsStore(hass).async_save(snapshot)
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    return manager


async def test_creating_the_last_allowed_plant_succeeds(hass: HomeAssistant) -> None:
    manager = await _manager_with(
        hass, InventorySnapshot(revision=1, plants=_plants(COLLECTION_MAX_COUNT - 1))
    )

    await manager.async_create_plant(name="Office Aloe")

    reloaded = await SmartPlantsStore(hass).async_load()
    assert len(reloaded.plants) == COLLECTION_MAX_COUNT


async def test_creating_a_plant_over_the_limit_is_refused(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    manager = await _manager_with(
        hass, InventorySnapshot(revision=1, plants=_plants(COLLECTION_MAX_COUNT))
    )
    before = manager.snapshot
    stored = copy.deepcopy(hass_storage[STORAGE_KEY])

    with pytest.raises(SmartPlantsPlantLimitError) as caught:
        await manager.async_create_plant(name="Office Aloe")

    err = caught.value
    # Callers that report validation errors and callers that show translated
    # Home Assistant errors both understand the refusal.
    assert isinstance(err, SmartPlantsValidationError)
    assert isinstance(err, HomeAssistantError)
    assert err.translation_key == "plant_limit"
    assert err.translation_placeholders == {"max": str(COLLECTION_MAX_COUNT)}
    assert manager.snapshot == before
    assert hass_storage[STORAGE_KEY] == stored


async def test_delete_at_the_tombstone_limit_drops_the_oldest_tombstone(
    hass: HomeAssistant,
) -> None:
    # Without a device reconciler the tombstone of a deleted plant stays,
    # as it does when registry cleanup keeps failing.
    manager = await _manager_with(
        hass,
        InventorySnapshot(
            revision=1,
            plants=_plants(1),
            tombstones=_tombstones(COLLECTION_MAX_COUNT),
        ),
    )

    await manager.async_delete_plant("plant-0", expected_revision=1)

    tombstones = manager.snapshot.tombstones
    assert len(tombstones) == COLLECTION_MAX_COUNT
    assert tombstones[0].plant_id == "deleted-1"
    assert tombstones[-1].plant_id == "plant-0"
    reloaded = await SmartPlantsStore(hass).async_load()
    assert reloaded.tombstones == tombstones


async def test_tombstone_pruning_prefers_finished_registry_cleanup(
    hass: HomeAssistant,
) -> None:
    tombstones = (
        *_tombstones(COLLECTION_MAX_COUNT - 1),
        Tombstone(
            plant_id="deleted-cleaned",
            deleted_at="2026-09-05T00:00:00Z",
            payload={"image_id": None, "cleanup_phase": "registry_persisted"},
        ),
    )
    manager = await _manager_with(
        hass, InventorySnapshot(revision=1, plants=_plants(1), tombstones=tombstones)
    )

    await manager.async_delete_plant("plant-0", expected_revision=1)

    ids = [tombstone.plant_id for tombstone in manager.snapshot.tombstones]
    assert len(ids) == COLLECTION_MAX_COUNT
    assert "deleted-cleaned" not in ids
    assert ids[0] == "deleted-0"


async def test_pending_operation_over_the_limit_is_refused(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    manager = await _manager_with(
        hass,
        InventorySnapshot(
            revision=1, pending_operations=_operations(COLLECTION_MAX_COUNT)
        ),
    )
    before = manager.snapshot
    stored = copy.deepcopy(hass_storage[STORAGE_KEY])

    with pytest.raises(SmartPlantsStorageFullError):
        await manager.async_record_pending_operation(_operations(1)[0])

    assert manager.snapshot == before
    assert hass_storage[STORAGE_KEY] == stored
