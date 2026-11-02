"""A copy of the inventory is kept before every storage migration."""

from __future__ import annotations

import copy
from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants.const import (
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.models import InventorySnapshot, PlantRecord
from custom_components.smart_plants.storage import (
    STORAGE_BACKUP_KEY,
    SmartPlantsStorageError,
    SmartPlantsStore,
    async_remove_storage,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.util.file import WriteError

OLDER_MINOR = STORAGE_MINOR_VERSION - 1


def _older_inventory() -> dict[str, Any]:
    plant = PlantRecord(
        id="plant-1", revision=1, name="Aloe", created_at="2026-09-05T00:00:00Z"
    )
    return InventorySnapshot(revision=1, plants={plant.id: plant}).as_storage()


def _seed(hass_storage: dict[str, Any], minor: int, data: dict[str, Any]) -> None:
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": minor,
        "key": STORAGE_KEY,
        "data": data,
    }


async def test_migration_keeps_the_previous_version_as_backup(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    original = _older_inventory()
    _seed(hass_storage, OLDER_MINOR, copy.deepcopy(original))

    snapshot = await SmartPlantsStore(hass).async_load()

    assert "plant-1" in snapshot.plants
    assert hass_storage[STORAGE_KEY]["minor_version"] == STORAGE_MINOR_VERSION
    backup = hass_storage[STORAGE_BACKUP_KEY]
    assert backup["version"] == STORAGE_MAJOR_VERSION
    assert backup["minor_version"] == OLDER_MINOR
    assert backup["data"] == original


async def test_current_storage_writes_no_backup(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    store = SmartPlantsStore(hass)
    _seed(hass_storage, OLDER_MINOR, _older_inventory())
    await store.async_load()
    hass_storage.pop(STORAGE_BACKUP_KEY)

    await SmartPlantsStore(hass).async_load()

    assert STORAGE_BACKUP_KEY not in hass_storage


async def test_failed_backup_stops_the_migration(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(hass_storage, OLDER_MINOR, _older_inventory())
    stored = copy.deepcopy(hass_storage[STORAGE_KEY])
    real_write = Store._async_write_data

    async def write(self: Store[Any], data: Any) -> None:
        if self.key == STORAGE_BACKUP_KEY:
            raise WriteError("simulated backup write failure")
        await real_write(self, data)

    with (
        patch.object(Store, "_async_write_data", new=write),
        pytest.raises(SmartPlantsStorageError),
    ):
        await SmartPlantsStore(hass).async_load()

    assert hass_storage[STORAGE_KEY] == stored


async def test_removing_storage_removes_the_backup(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(hass_storage, OLDER_MINOR, _older_inventory())
    await SmartPlantsStore(hass).async_load()
    assert STORAGE_BACKUP_KEY in hass_storage

    await async_remove_storage(hass)

    assert STORAGE_KEY not in hass_storage
    assert STORAGE_BACKUP_KEY not in hass_storage
