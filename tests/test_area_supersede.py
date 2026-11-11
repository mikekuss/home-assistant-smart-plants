"""
A failed area change followed by a successful one.

When the save that clears an area intent fails, the intent stays in
storage. A later successful area change for the same plant must supersede
it, and replay after a restart must never move the device back to the
older area.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.storage import SmartPlantsStorageError
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import MockConfigEntry

from .helpers import plant_device


async def _setup_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _restart(hass: HomeAssistant, entry: MockConfigEntry) -> SmartPlantsManager:
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


def _fail_clearing_save(manager: SmartPlantsManager) -> Any:
    """Let the intent save pass and fail the save that clears it."""
    real_save = manager._store.async_save
    calls = 0

    async def save(snapshot: Any) -> None:
        nonlocal calls
        calls += 1
        if calls == 2:  # the clearing save follows the intent
            raise SmartPlantsStorageError("simulated clearing save failure")
        await real_save(snapshot)

    return patch.object(manager._store, "async_save", side_effect=save)


async def _set_area(
    manager: SmartPlantsManager, plant_id: str, area_id: str | None
) -> None:
    plant = manager.get_plant(plant_id)
    await manager.async_set_plant_area(
        plant_id, expected_revision=plant.revision, area_id=area_id
    )


def _device_area(hass: HomeAssistant, plant_id: str) -> str | None:
    device = plant_device(dr.async_get(hass), plant_id)
    assert device is not None
    return device.area_id


@pytest.mark.parametrize("newer", ["Office", None])
async def test_failed_area_change_then_successful_change_survives_restart(
    hass: HomeAssistant, newer: str | None
) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    areas = ar.async_get(hass)
    kitchen = areas.async_create("Kitchen")
    newer_id = None if newer is None else areas.async_create(newer).id
    plant = await manager.async_create_plant(name="Aloe")

    with _fail_clearing_save(manager), pytest.raises(SmartPlantsStorageError):
        await _set_area(manager, plant.id, kitchen.id)
    assert _device_area(hass, plant.id) == kitchen.id

    await _set_area(manager, plant.id, newer_id)
    assert _device_area(hass, plant.id) == newer_id
    assert manager.snapshot.pending_operations == ()

    manager = await _restart(hass, entry)
    assert _device_area(hass, plant.id) == newer_id
    assert manager.snapshot.pending_operations == ()


async def test_area_change_keeps_other_plants_pending_intents(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    areas = ar.async_get(hass)
    kitchen = areas.async_create("Kitchen")
    office = areas.async_create("Office")
    first = await manager.async_create_plant(name="Aloe")
    second = await manager.async_create_plant(name="Office Aloe")

    with _fail_clearing_save(manager), pytest.raises(SmartPlantsStorageError):
        await _set_area(manager, first.id, kitchen.id)
    await _set_area(manager, second.id, office.id)

    pending = manager.snapshot.pending_operations
    assert [(op.kind, op.plant_id) for op in pending] == [("update_area", first.id)]


# --- Storage that already holds superseded area intents ---------------------


def _plant_dict() -> dict[str, Any]:
    return {
        "id": "plt-1",
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
    }


def _area_op(op_id: str, revision: int, area_id: str | None) -> dict[str, Any]:
    return {
        "op_id": op_id,
        "kind": "update_area",
        "plant_id": "plt-1",
        "requested_at": "2026-09-05T00:00:00Z",
        "expected_revision": revision,
        "payload": {"target_area_id": area_id},
        "schema_version": 1,
    }


@pytest.mark.parametrize("newer", ["Office", None])
async def test_replay_applies_only_the_newest_pending_area_intent(
    hass: HomeAssistant, hass_storage: dict[str, Any], newer: str | None
) -> None:
    areas = ar.async_get(hass)
    kitchen = areas.async_create("Kitchen")
    newer_id = None if newer is None else areas.async_create(newer).id
    hass_storage["smart_plants.inventory"] = {
        "version": 1,
        "minor_version": 2,
        "key": "smart_plants.inventory",
        "data": {
            "revision": 4,
            "plants": [_plant_dict()],
            "pending_operations": [
                _area_op("op-old", 2, kitchen.id),
                _area_op("op-new", 3, newer_id),
            ],
            "tombstones": [],
        },
    }

    # Record every area the device passes through, so a brief move back to
    # the older area (which would fire area-targeted automations) shows up
    # even when the newer intent is applied right after it.
    registry = dr.async_get(hass)
    seen_areas: list[str | None] = []

    @callback
    def _record(event: Event[dr.EventDeviceRegistryUpdatedData]) -> None:
        device = registry.async_get(event.data["device_id"])
        if device is not None:
            seen_areas.append(device.area_id)

    unsubscribe = hass.bus.async_listen(dr.EVENT_DEVICE_REGISTRY_UPDATED, _record)
    entry = await _setup_entry(hass)
    unsubscribe()
    manager: SmartPlantsManager = entry.runtime_data.manager

    assert _device_area(hass, "plt-1") == newer_id
    assert kitchen.id not in seen_areas
    assert manager.snapshot.pending_operations == ()
