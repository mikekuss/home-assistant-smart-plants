from __future__ import annotations

from collections.abc import Iterable
from typing import Any

import pytest
from custom_components.smart_plants.const import (
    DOMAIN,
    SINGLETON_UNIQUE_ID,
)
from custom_components.smart_plants.device import SmartPlantsDeviceReconciler
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsRevisionConflictError,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import (
    InventorySnapshot,
    PendingOperation,
    PlantRecord,
    Tombstone,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import MockConfigEntry


def _plant(
    plant_id: str = "plt-1",
    *,
    name: str = "Aloe",
    revision: int = 1,
    lifecycle_state: str = "active",
) -> PlantRecord:
    return PlantRecord(
        id=plant_id,
        revision=revision,
        name=name,
        created_at="2026-09-05T00:00:00Z",
        lifecycle_state=lifecycle_state,  # type: ignore[arg-type]
    )


async def _setup_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


# --- Reconciler unit tests -----------------------------------------------


async def test_reconciler_creates_a_single_device_for_a_plant(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    reconciler = SmartPlantsDeviceReconciler(hass, entry.entry_id)

    await reconciler.async_reconcile_present(_plant())
    await reconciler.async_reconcile_present(_plant())

    registry = dr.async_get(hass)
    matches = [
        device
        for device in registry.devices.values()
        if (DOMAIN, "plt-1") in device.identifiers
    ]
    assert len(matches) == 1
    device = matches[0]
    assert device.name == "Aloe"
    assert device.manufacturer == "Smart Plants"
    assert device.entry_type is dr.DeviceEntryType.SERVICE
    assert entry.entry_id in device.config_entries


async def test_rename_keeps_device_id_stable_and_updates_name(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    reconciler = SmartPlantsDeviceReconciler(hass, entry.entry_id)

    await reconciler.async_reconcile_present(_plant(name="Aloe"))
    registry = dr.async_get(hass)
    device_before = registry.async_get_device(identifiers={(DOMAIN, "plt-1")})
    assert device_before is not None

    await reconciler.async_reconcile_present(_plant(name="Aloe Vera", revision=2))
    device_after = registry.async_get_device(identifiers={(DOMAIN, "plt-1")})
    assert device_after is not None
    assert device_after.id == device_before.id
    assert device_after.name == "Aloe Vera"


async def test_rename_preserves_user_name_by_user(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    reconciler = SmartPlantsDeviceReconciler(hass, entry.entry_id)

    await reconciler.async_reconcile_present(_plant(name="Aloe"))
    registry = dr.async_get(hass)
    device = registry.async_get_device(identifiers={(DOMAIN, "plt-1")})
    assert device is not None
    registry.async_update_device(device.id, name_by_user="My Aloe")

    await reconciler.async_reconcile_present(_plant(name="Aloe Vera", revision=2))
    device = registry.async_get_device(identifiers={(DOMAIN, "plt-1")})
    assert device is not None
    # Our authored `name` still updates, but the user's display override wins.
    assert device.name == "Aloe Vera"
    assert device.name_by_user == "My Aloe"


async def test_area_is_seeded_on_create_only(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    reconciler = SmartPlantsDeviceReconciler(hass, entry.entry_id)

    area = ar.async_get(hass).async_create("Balcony")

    await reconciler.async_reconcile_present(_plant(), requested_area_id=area.id)
    registry = dr.async_get(hass)
    device = registry.async_get_device(identifiers={(DOMAIN, "plt-1")})
    assert device is not None
    assert device.area_id == area.id

    # User moves the device to a different area natively.
    other = ar.async_get(hass).async_create("Living Room")
    registry.async_update_device(device.id, area_id=other.id)

    # Subsequent reconciliation must NOT touch the area, even if a caller
    # accidentally passes a stale requested_area_id.
    await reconciler.async_reconcile_present(
        _plant(name="Renamed", revision=2), requested_area_id=area.id
    )
    device = registry.async_get_device(identifiers={(DOMAIN, "plt-1")})
    assert device is not None
    assert device.area_id == other.id


async def test_user_disabled_registry_state_preserved(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    reconciler = SmartPlantsDeviceReconciler(hass, entry.entry_id)

    await reconciler.async_reconcile_present(_plant())
    registry = dr.async_get(hass)
    device = registry.async_get_device(identifiers={(DOMAIN, "plt-1")})
    assert device is not None
    registry.async_update_device(device.id, disabled_by=dr.DeviceEntryDisabler.USER)

    await reconciler.async_reconcile_present(_plant(name="Renamed", revision=2))
    device = registry.async_get_device(identifiers={(DOMAIN, "plt-1")})
    assert device is not None
    assert device.disabled_by is dr.DeviceEntryDisabler.USER


async def test_reconcile_absent_removes_device(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    reconciler = SmartPlantsDeviceReconciler(hass, entry.entry_id)

    await reconciler.async_reconcile_present(_plant())
    await reconciler.async_reconcile_absent("plt-1")

    registry = dr.async_get(hass)
    assert registry.async_get_device(identifiers={(DOMAIN, "plt-1")}) is None
    # Idempotent: removing an already-absent device is a no-op.
    await reconciler.async_reconcile_absent("plt-1")


# --- Manager integration tests -------------------------------------------


async def test_manager_create_plant_creates_device_and_clears_pending_op(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    plant = await manager.async_create_plant(name="Aloe")

    registry = dr.async_get(hass)
    assert registry.async_get_device(identifiers={(DOMAIN, plant.id)}) is not None
    # The pending create_plant op is cleared once reconciliation succeeds.
    assert manager.snapshot.pending_operations == ()


async def test_manager_delete_plant_removes_device_and_clears_tombstone(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_delete_plant(plant.id, expected_revision=plant.revision)

    registry = dr.async_get(hass)
    assert registry.async_get_device(identifiers={(DOMAIN, plant.id)}) is None
    assert manager.snapshot.tombstones == ()


async def test_manager_update_plant_renames_device_after_next_reconcile(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")

    updated = await manager.async_update_plant(
        plant.id, expected_revision=plant.revision, name="Aloe Vera"
    )

    registry = dr.async_get(hass)
    device = registry.async_get_device(identifiers={(DOMAIN, updated.id)})
    assert device is not None
    assert device.name == "Aloe Vera"


# --- Startup replay ------------------------------------------------------


async def test_replay_creates_missing_device_for_leftover_pending_op(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # Seed storage with a plant whose device was never created (crash between
    # the intent publish and the side effect).
    hass_storage["smart_plants.inventory"] = {
        "version": 1,
        "minor_version": 2,
        "key": "smart_plants.inventory",
        "data": {
            "revision": 1,
            "plants": [
                {
                    "id": "plt-orphan",
                    "revision": 1,
                    "name": "Orphaned",
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
            "pending_operations": [
                {
                    "op_id": "op-orphan",
                    "kind": "create_plant",
                    "plant_id": "plt-orphan",
                    "requested_at": "2026-09-05T00:00:00Z",
                    "expected_revision": None,
                    "payload": {},
                    "schema_version": 1,
                }
            ],
            "tombstones": [],
        },
    }

    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    registry = dr.async_get(hass)
    assert registry.async_get_device(identifiers={(DOMAIN, "plt-orphan")}) is not None
    assert manager.snapshot.pending_operations == ()


async def test_replay_creates_missing_device_without_pending_op(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # Regression: a validated live plant whose device was destroyed out of
    # band (e.g. HA storage restored while custom_components/ was missing)
    # and which has NO pending operation must still be reconciled to
    # exactly one device on startup.
    hass_storage["smart_plants.inventory"] = {
        "version": 1,
        "minor_version": 2,
        "key": "smart_plants.inventory",
        "data": {
            "revision": 1,
            "plants": [
                {
                    "id": "plt-live",
                    "revision": 1,
                    "name": "Ficus",
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

    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    registry = dr.async_get(hass)
    device = registry.async_get_device(identifiers={(DOMAIN, "plt-live")})
    assert device is not None
    assert device.name == "Ficus"
    assert manager.snapshot.pending_operations == ()


async def test_replay_full_scan_preserves_native_area_and_name_by_user(
    hass: HomeAssistant,
) -> None:
    # A subsequent startup scan (no pending op) must not overwrite native
    # HA edits: name_by_user, area, or disabled_by all survive.
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    seed = ar.async_get(hass).async_create("Kitchen")
    plant = await manager.async_create_plant(name="Aloe", area_id=seed.id)

    registry = dr.async_get(hass)
    device = registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device is not None
    other = ar.async_get(hass).async_create("Living Room")
    registry.async_update_device(
        device.id,
        name_by_user="My Aloe",
        area_id=other.id,
        disabled_by=dr.DeviceEntryDisabler.USER,
    )

    # Replay again: no pending ops, plant is live. The full-inventory
    # pass must not stomp any of the native edits.
    await manager.async_replay_pending()

    device = registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device is not None
    assert device.name_by_user == "My Aloe"
    assert device.area_id == other.id
    assert device.disabled_by is dr.DeviceEntryDisabler.USER


async def test_replay_removes_leftover_device_for_tombstone(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # Seed a tombstone that survived the previous run and a matching device
    # that was never cleaned up.
    hass_storage["smart_plants.inventory"] = {
        "version": 1,
        "minor_version": 2,
        "key": "smart_plants.inventory",
        "data": {
            "revision": 2,
            "plants": [],
            "pending_operations": [],
            "tombstones": [
                {
                    "plant_id": "plt-gone",
                    "deleted_at": "2026-09-05T00:00:00Z",
                    "payload": {"image_id": None},
                    "schema_version": 1,
                }
            ],
        },
    }

    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    # Pre-create the leftover device so replay has something to remove.
    registry = dr.async_get(hass)
    registry.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(DOMAIN, "plt-gone")},
        name="Gone",
    )
    # Run the replay a second time (setup already ran once) to prove
    # idempotence — nothing should crash even though the tombstone is gone.
    await manager.async_replay_pending()

    assert manager.snapshot.tombstones == ()


async def test_reconciler_replay_drops_op_for_missing_plant() -> None:
    # Unit-test the replay: a stale pending op whose plant was later
    # deleted should be silently completed so the queue stays clean.
    #
    # We construct a bare reconciler with a fake entry id and no real hass
    # so we can exercise the pure logic without device-registry access.
    class _FakeConfig:
        def path(self, _sub: str) -> str:
            return "/tmp/smart-plants-fake-noexist"  # noqa: S108

    class _FakeHass:
        def __init__(self) -> None:
            self.config = _FakeConfig()

        async def async_add_executor_job(self, func: Any, *args: Any) -> Any:
            return func(*args)

    class _FakeReconciler(SmartPlantsDeviceReconciler):
        def __init__(self) -> None:
            self._entry_id = "entry"
            self._hass = _FakeHass()  # type: ignore[assignment]
            self.calls: list[tuple[str, str]] = []

        async def async_reconcile_present(
            self,
            plant: PlantRecord,
            *,
            requested_area_id: str | None = None,
        ) -> None:
            del requested_area_id
            self.calls.append(("present", plant.id))

        async def async_reconcile_absent(
            self, plant_id: str, *, known_plant_ids: Iterable[str] = ()
        ) -> None:
            del known_plant_ids
            self.calls.append(("absent", plant_id))

    reconciler = _FakeReconciler()
    op = PendingOperation(
        op_id="op-1",
        kind="update_plant",
        plant_id="plt-missing",
        requested_at="2026-09-05T00:00:00Z",
    )
    completed_ops, completed_tombstones, plant_updates = await reconciler.async_replay(
        plants={},
        pending_operations=(op,),
        tombstones=(),
    )
    assert completed_ops == frozenset({"op-1"})
    assert completed_tombstones == frozenset()
    assert plant_updates == {}
    # No side effect was invoked because the plant is gone.
    assert reconciler.calls == []


@pytest.mark.parametrize("area_id", ["", "   "])
async def test_manager_create_rejects_invalid_area_id(
    hass: HomeAssistant, area_id: str
) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    with pytest.raises(Exception):  # noqa: PT011, B017 - SmartPlantsValidationError
        await manager.async_create_plant(name="Aloe", area_id=area_id)


# --- Explicit area intent -------------------------------------------------


async def test_set_area_writes_device_area_and_bumps_revision(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")

    area = ar.async_get(hass).async_create("Kitchen")
    updated = await manager.async_set_plant_area(
        plant.id, expected_revision=plant.revision, area_id=area.id
    )

    assert updated.revision == plant.revision + 1
    registry = dr.async_get(hass)
    device = registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device is not None
    assert device.area_id == area.id
    assert manager.snapshot.pending_operations == ()


async def test_set_area_clears_device_area(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    area = ar.async_get(hass).async_create("Balcony")
    plant = await manager.async_create_plant(name="Aloe", area_id=area.id)

    registry = dr.async_get(hass)
    device = registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device is not None
    assert device.area_id == area.id

    cleared = await manager.async_set_plant_area(
        plant.id, expected_revision=plant.revision, area_id=None
    )
    assert cleared.revision == plant.revision + 1
    device = registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device is not None
    assert device.area_id is None


async def test_set_area_rejects_stale_revision(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    area = ar.async_get(hass).async_create("Kitchen")

    # First explicit intent bumps revision.
    await manager.async_set_plant_area(
        plant.id, expected_revision=plant.revision, area_id=area.id
    )
    # Second explicit intent with the stale revision must be rejected so
    # concurrent writers cannot both "win".
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_set_plant_area(
            plant.id, expected_revision=plant.revision, area_id=None
        )


async def test_set_area_rejects_empty_string(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError):
        await manager.async_set_plant_area(
            plant.id, expected_revision=plant.revision, area_id=""
        )


async def test_set_area_recreates_missing_device_before_clearing_intent(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    registry = dr.async_get(hass)
    device = registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device is not None
    registry.async_remove_device(device.id)
    area = ar.async_get(hass).async_create("Kitchen")

    updated = await manager.async_set_plant_area(
        plant.id, expected_revision=plant.revision, area_id=area.id
    )

    recreated = registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert recreated is not None
    assert recreated.area_id == area.id
    assert updated.revision == plant.revision + 1
    assert manager.snapshot.pending_operations == ()


async def test_routine_update_preserves_native_area_edit(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    seed = ar.async_get(hass).async_create("Kitchen")
    plant = await manager.async_create_plant(name="Aloe", area_id=seed.id)

    # User moves the device to a different area natively.
    other = ar.async_get(hass).async_create("Living Room")
    registry = dr.async_get(hass)
    device = registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device is not None
    registry.async_update_device(device.id, area_id=other.id)

    # A routine (non-area) update must not put the area back.
    await manager.async_update_plant(
        plant.id, expected_revision=plant.revision, name="Aloe Vera"
    )
    device = registry.async_get_device(identifiers={(DOMAIN, plant.id)})
    assert device is not None
    assert device.area_id == other.id


async def test_replay_completes_stalled_update_area_op(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # Seed a live plant with no device and an area intent. One startup must
    # create the device, apply the area, and clear the operation.
    hass_storage["smart_plants.inventory"] = {
        "version": 1,
        "minor_version": 2,
        "key": "smart_plants.inventory",
        "data": {
            "revision": 3,
            "plants": [
                {
                    "id": "plt-1",
                    "revision": 2,
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
            "pending_operations": [
                {
                    "op_id": "op-area",
                    "kind": "update_area",
                    "plant_id": "plt-1",
                    "requested_at": "2026-09-05T00:00:00Z",
                    "expected_revision": 2,
                    "payload": {"target_area_id": "target-area"},
                    "schema_version": 1,
                }
            ],
            "tombstones": [],
        },
    }

    registry = dr.async_get(hass)
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    # Seed the target area so the registry accepts it; capture its
    # generated id and rewrite the seeded payload to reference it.
    target_area = ar.async_get(hass).async_create("Target")
    hass_storage["smart_plants.inventory"]["data"]["pending_operations"][0]["payload"][
        "target_area_id"
    ] = target_area.id

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager: SmartPlantsManager = entry.runtime_data.manager

    device = registry.async_get_device(identifiers={(DOMAIN, "plt-1")})
    assert device is not None
    assert device.area_id == target_area.id
    assert manager.snapshot.pending_operations == ()


async def test_reconciler_apply_area_reports_missing_device() -> None:
    class _FakeRegistry:
        def __init__(self) -> None:
            self.updates: list[tuple[str, str | None]] = []

        def async_get_device(self, identifiers: set[tuple[str, str]]) -> None:
            del identifiers

        def async_update_device(
            self, device_id: str, **kwargs: Any
        ) -> None:  # pragma: no cover
            self.updates.append((device_id, kwargs.get("area_id")))

    reconciler = SmartPlantsDeviceReconciler.__new__(SmartPlantsDeviceReconciler)
    reconciler._entry_id = "entry"
    reconciler._hass = object()  # type: ignore[assignment]
    fake = _FakeRegistry()
    reconciler._registry = lambda: fake  # type: ignore[assignment,return-value,method-assign]

    # No device → cannot apply; return False so the op is left pending.
    assert await reconciler.async_apply_area("plt-x", "any") is False
    assert fake.updates == []


async def test_snapshot_helper_types(
    hass: HomeAssistant,
) -> None:
    # Sanity check that Tombstone / InventorySnapshot round-trip cleanly in
    # a manager built from scratch (guards against accidental import drift).
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_delete_plant(plant.id, expected_revision=plant.revision)
    assert isinstance(manager.snapshot, InventorySnapshot)
    assert all(isinstance(t, Tombstone) for t in manager.snapshot.tombstones)
