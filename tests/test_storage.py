from __future__ import annotations

import asyncio
from pathlib import Path
from types import MappingProxyType
from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants import storage as storage_module
from custom_components.smart_plants.const import (
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import (
    TOMBSTONE_SCHEMA_VERSION,
    InventorySnapshot,
    MoistureConfig,
    PendingOperation,
    PlantRecord,
)
from custom_components.smart_plants.storage import (
    SmartPlantsInvalidStorageError,
    SmartPlantsStorageError,
    SmartPlantsStore,
    SmartPlantsUnsupportedStorageError,
    _snapshot_from_payload,
)
from homeassistant.core import CoreState, HomeAssistant
from homeassistant.util.file import WriteError


def _seed(
    hass_storage: dict[str, Any],
    *,
    major: int,
    minor: int,
    data: object,
) -> None:
    hass_storage[STORAGE_KEY] = {
        "version": major,
        "minor_version": minor,
        "key": STORAGE_KEY,
        "data": data,
    }


async def test_missing_file_returns_empty(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # No seed and no file on disk means the manager should get an empty inventory.
    assert STORAGE_KEY not in hass_storage
    store = SmartPlantsStore(hass)
    snapshot = await store.async_load()
    assert snapshot == InventorySnapshot.empty()


async def test_quarantined_file_refuses_empty_fallback(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # Simulate HA quarantining a malformed file: Store.async_load returns None
    # (nothing seeded) but a real file existed on disk before HA renamed it.
    with (
        patch(
            "custom_components.smart_plants.storage.os.path.isfile",
            return_value=True,
        ),
        pytest.raises(SmartPlantsInvalidStorageError),
    ):
        await SmartPlantsStore(hass).async_load()


async def test_current_version_round_trip(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=STORAGE_MINOR_VERSION,
        data={
            "revision": 3,
            "plants": [
                {
                    "id": "plant-1",
                    "revision": 2,
                    "name": "Aloe",
                    "created_at": "2026-09-05T00:00:00Z",
                    "lifecycle_state": "active",
                    "acquired_at": None,
                    "species": None,
                    "placement": None,
                    "tags": ["houseplant"],
                    "category": "houseplant",
                    "image": None,
                    "roles": {"moisture": MoistureConfig().as_storage()},
                    "care_events": [],
                }
            ],
            "pending_operations": [],
            "tombstones": [],
        },
    )

    snapshot = await SmartPlantsStore(hass).async_load()
    assert snapshot.revision == 3
    plant = snapshot.plants["plant-1"]
    assert plant.name == "Aloe"
    assert plant.tags == ("houseplant",)
    assert plant.category == "houseplant"
    assert plant.created_at == "2026-09-05T00:00:00Z"


@pytest.mark.parametrize("minor", [3, 4, 5])
async def test_direct_role_migrations_supply_current_schema(
    hass: HomeAssistant, hass_storage: dict[str, Any], minor: int
) -> None:
    plant = {
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
    if minor >= 4:
        plant["moisture"] = {
            "sources": [],
            "primary_entity_id": None,
            "aggregation": "primary",
            "stale_after_seconds": 21_600,
            "moisture_min": 15,
            "moisture_target": 35,
            "moisture_max": 55,
        }
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=minor,
        data={
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
        },
    )

    snapshot = await SmartPlantsStore(hass).async_load()
    moisture = snapshot.plants["plant-1"].moisture
    assert (
        moisture.moisture_min,
        moisture.moisture_target,
        moisture.moisture_max,
    ) == (15, 35, 55)
    persisted = hass_storage[STORAGE_KEY]["data"]["plants"][0]
    assert "moisture" not in persisted
    assert "moisture" in persisted["roles"]


async def test_minor_six_migrates_manual_species_to_strict_snapshot(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=6,
        data={
            "revision": 1,
            "plants": [
                {
                    "id": "plant-1",
                    "revision": 1,
                    "name": "Aloe",
                    "created_at": "2026-09-05T00:00:00Z",
                    "lifecycle_state": "active",
                    "acquired_at": None,
                    "species": {
                        "provider": "manual",
                        "snapshot": {
                            "common_name": "Aloe",
                            "latin_name": "Aloe vera",
                        },
                    },
                    "placement": None,
                    "tags": [],
                    "category": None,
                    "image": None,
                    "roles": {"moisture": MoistureConfig().as_storage()},
                }
            ],
            "pending_operations": [],
            "tombstones": [],
        },
    )
    snapshot = await SmartPlantsStore(hass).async_load()
    species = snapshot.plants["plant-1"].species
    assert species is not None
    assert species.snapshot.source_status == "manual"
    assert species.snapshot.locale == "und"
    assert species.snapshot.common_name == "Aloe"
    persisted = hass_storage[STORAGE_KEY]["data"]["plants"][0]["species"]
    assert persisted["snapshot"]["attribution"] == "User supplied"


@pytest.mark.parametrize(
    "species",
    [
        {"provider": "openplantbook", "snapshot": {"latin_name": "Aloe vera"}},
        {"provider": "manual", "snapshot": {"unsupported": "Aloe"}},
        {"provider": "manual", "snapshot": {"common_name": ""}},
        {"provider": "manual", "snapshot": {"common_name": 42}},
        {"provider": "manual", "snapshot": {"common_name": "x" * 501}},
    ],
)
async def test_minor_six_species_migration_fails_closed(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    species: object,
) -> None:
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=6,
        data={
            "revision": 1,
            "plants": [
                {
                    "id": "plant-1",
                    "revision": 1,
                    "name": "Aloe",
                    "created_at": "2026-09-05T00:00:00Z",
                    "lifecycle_state": "active",
                    "acquired_at": None,
                    "species": species,
                    "placement": None,
                    "tags": [],
                    "category": None,
                    "image": None,
                    "roles": {"moisture": MoistureConfig().as_storage()},
                }
            ],
            "pending_operations": [],
            "tombstones": [],
        },
    )
    with pytest.raises(SmartPlantsInvalidStorageError, match="minor-6 species"):
        await SmartPlantsStore(hass).async_load()


@pytest.mark.parametrize(
    "roles",
    [None, {}, {"moisture": None}, {"moisture": "bad"}],
)
async def test_current_storage_requires_well_formed_moisture_role(
    hass: HomeAssistant, hass_storage: dict[str, Any], roles: object
) -> None:
    plant = {
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
    if roles is not None:
        plant["roles"] = roles
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=STORAGE_MINOR_VERSION,
        data={
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
        },
    )
    with pytest.raises(SmartPlantsInvalidStorageError):
        await SmartPlantsStore(hass).async_load()


def _plant_base() -> dict[str, Any]:
    return {
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


@pytest.mark.parametrize("minor", [6, 7, 8, 9])
async def test_migration_from_supported_minors_loads_with_moisture(
    hass: HomeAssistant, hass_storage: dict[str, Any], minor: int
) -> None:
    # Minors 6+ store moisture under roles.moisture; migration must carry every
    # supported older minor up to the current strict schema without failing.
    plant = _plant_base()
    plant["roles"] = {"moisture": MoistureConfig().as_storage()}
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=minor,
        data={
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
        },
    )
    snapshot = await SmartPlantsStore(hass).async_load()
    assert "plant-1" in snapshot.plants
    assert hass_storage[STORAGE_KEY]["minor_version"] == STORAGE_MINOR_VERSION


async def test_migration_adds_stress_overrides_to_pre_minor_8_temperature(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # A minor-6 temperature role predates the stress override map (added minor
    # 8). Migration must re-round-trip it to supply the explicit all-null map so
    # the current strict load does not fail closed.
    plant = _plant_base()
    plant["roles"] = {
        "moisture": MoistureConfig().as_storage(),
        "temperature": {
            "sources": [],
            "primary_entity_id": None,
            "aggregation": "primary",
            "stale_after_seconds": 21_600,
        },
    }
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=6,
        data={
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
        },
    )
    await SmartPlantsStore(hass).async_load()
    persisted = hass_storage[STORAGE_KEY]["data"]["plants"][0]["roles"]["temperature"]
    assert persisted["stress_threshold_overrides"] == {
        "cold_threshold_celsius": None,
        "cold_clear_celsius": None,
        "hot_threshold_celsius": None,
        "hot_clear_celsius": None,
    }


async def test_current_minor_rejects_role_config_missing_stress_overrides(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # Fail-closed: at the current minor a stored non-moisture role config missing its
    # stress_threshold_overrides map is corrupt, not a legacy shape.
    plant = _plant_base()
    plant["roles"] = {
        "moisture": MoistureConfig().as_storage(),
        "temperature": {
            "sources": [],
            "primary_entity_id": None,
            "aggregation": "primary",
            "stale_after_seconds": 21_600,
            # stress_threshold_overrides intentionally omitted
        },
    }
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=STORAGE_MINOR_VERSION,
        data={
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
        },
    )
    with pytest.raises(SmartPlantsInvalidStorageError):
        await SmartPlantsStore(hass).async_load()


async def test_current_storage_rejects_legacy_top_level_moisture(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    plant = {
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
        "moisture": MoistureConfig().as_storage(),
        "roles": {"moisture": MoistureConfig().as_storage()},
    }
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=STORAGE_MINOR_VERSION,
        data={
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
        },
    )
    with pytest.raises(SmartPlantsInvalidStorageError):
        await SmartPlantsStore(hass).async_load()


async def test_minor_migration_is_persisted(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=0,
        data={
            "revision": 1,
            "plants": [
                {
                    "id": "plant-1",
                    "revision": 1,
                    "name": "Fern",
                    "lifecycle_state": "active",
                }
            ],
        },
    )

    store = SmartPlantsStore(hass)
    snapshot = await store.async_load()
    plant = snapshot.plants["plant-1"]
    assert plant.name == "Fern"
    # The minor-2 migration must fill in the new field slots with typed defaults
    # rather than leaving them missing on old records.
    assert plant.tags == ()
    assert plant.category is None
    assert plant.species is None
    assert plant.placement is None
    assert plant.image is None
    assert plant.acquired_at is None
    assert plant.created_at  # migration stamped a fallback timestamp
    assert snapshot.pending_operations == ()
    assert snapshot.tombstones == ()

    # HA's migration path must rewrite the envelope automatically.
    envelope = hass_storage[STORAGE_KEY]
    assert envelope["version"] == STORAGE_MAJOR_VERSION
    assert envelope["minor_version"] == STORAGE_MINOR_VERSION
    assert envelope["data"]["pending_operations"] == []
    assert envelope["data"]["tombstones"] == []
    # Round-tripped plant carries the new field slots explicitly, so a
    # subsequent load through strict from_storage keeps working.
    persisted_plant = envelope["data"]["plants"][0]
    for expected_key in (
        "created_at",
        "acquired_at",
        "species",
        "placement",
        "tags",
        "category",
        "image",
    ):
        assert expected_key in persisted_plant


async def test_future_major_version_rejected(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION + 1,
        minor=0,
        data={"revision": 0, "plants": [], "pending_operations": [], "tombstones": []},
    )
    with pytest.raises(SmartPlantsUnsupportedStorageError):
        await SmartPlantsStore(hass).async_load()


async def test_future_minor_version_rejected(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=STORAGE_MINOR_VERSION + 1,
        data={"revision": 0, "plants": [], "pending_operations": [], "tombstones": []},
    )
    with pytest.raises(SmartPlantsUnsupportedStorageError):
        await SmartPlantsStore(hass).async_load()


async def test_zero_major_version_rejected(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(
        hass_storage,
        major=0,
        minor=1,
        data={"revision": 0, "plants": []},
    )
    with pytest.raises(SmartPlantsUnsupportedStorageError):
        await SmartPlantsStore(hass).async_load()


_VALID_PLANT_FIELDS: dict[str, Any] = {
    "created_at": "2026-09-05T00:00:00Z",
    "acquired_at": None,
    "species": None,
    "placement": None,
    "tags": [],
    "category": None,
    "image": None,
}


@pytest.mark.parametrize(
    "payload",
    [
        None,
        [],
        {
            "revision": True,
            "plants": [],
            "pending_operations": [],
            "tombstones": [],
        },
        {
            "revision": 0,
            "plants": [
                {"id": "x", "revision": True, "name": "Bad", **_VALID_PLANT_FIELDS}
            ],
            "pending_operations": [],
            "tombstones": [],
        },
        {
            "revision": 0,
            "plants": [
                {"id": "dup", "revision": 1, "name": "A", **_VALID_PLANT_FIELDS},
                {"id": "dup", "revision": 1, "name": "B", **_VALID_PLANT_FIELDS},
            ],
            "pending_operations": [],
            "tombstones": [],
        },
        {
            "revision": 0,
            "plants": [
                {"id": "", "revision": 1, "name": "Empty id", **_VALID_PLANT_FIELDS}
            ],
            "pending_operations": [],
            "tombstones": [],
        },
        {
            "revision": 0,
            "plants": [],
            "pending_operations": ["not-a-dict"],
            "tombstones": [],
        },
        {
            # A pending_operations entry with an unsupported kind must be
            # rejected by the typed-op parser rather than silently passing
            # through as an opaque dict.
            "revision": 0,
            "plants": [],
            "pending_operations": [
                {
                    "op_id": "op-1",
                    "kind": "unsupported_kind",
                    "plant_id": "plant-1",
                    "requested_at": "2026-09-05T00:00:00Z",
                    "payload": {},
                    "schema_version": 1,
                }
            ],
            "tombstones": [],
        },
    ],
)
def test_invalid_payload_rejected(payload: object) -> None:
    with pytest.raises(SmartPlantsInvalidStorageError):
        _snapshot_from_payload(payload)


async def test_manager_save_reload_round_trip(hass: HomeAssistant) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_internal_record("Aloe")

    reloaded = SmartPlantsManager(hass)
    await reloaded.async_load()
    assert reloaded.snapshot.revision == 1
    assert reloaded.snapshot.plants[plant.id] == plant


async def test_manager_revisions_are_monotonic(hass: HomeAssistant) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_internal_record("Aloe")

    assert manager.snapshot.revision == 1
    assert plant.revision == 1

    updated = plant.with_next_revision(name="Aloe Vera")
    await manager.async_mutate_for_test(lambda snapshot: snapshot.with_plant(updated))
    assert manager.snapshot.revision == 2
    assert manager.snapshot.plants[plant.id].revision == 2


async def test_manager_concurrent_mutations_are_serialized(
    hass: HomeAssistant,
) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()

    async def add(index: int) -> str:
        plant = await manager.async_create_internal_record(f"Plant {index}")
        return plant.id

    plant_ids = await asyncio.gather(*(add(index) for index in range(10)))
    assert len(set(plant_ids)) == 10
    assert manager.snapshot.revision == 10
    assert len(manager.snapshot.plants) == 10


def test_snapshot_serialization_does_not_alias_state() -> None:
    plant = PlantRecord(
        id="plant-1", revision=1, name="Aloe", created_at="2026-09-05T00:00:00Z"
    )
    snapshot = InventorySnapshot(revision=1, plants={plant.id: plant})
    serialized = snapshot.as_storage()

    next_snapshot = snapshot.with_plant(plant.with_next_revision(name="Changed"))

    assert serialized["plants"][0]["name"] == "Aloe"
    assert snapshot.plants[plant.id].name == "Aloe"
    assert next_snapshot.plants[plant.id].name == "Changed"

    with pytest.raises(TypeError):
        snapshot.plants["other"] = plant  # type: ignore[index]


def test_pending_operation_payloads_are_deeply_frozen() -> None:
    op = PendingOperation(
        op_id="op-1",
        kind="update_plant",
        plant_id="plant-1",
        requested_at="2026-09-05T00:00:00Z",
        expected_revision=1,
        payload={"changes": {"role": "moisture", "targets": [1, 2]}},
    )
    snapshot = InventorySnapshot(revision=0, pending_operations=(op,))

    frozen_op = snapshot.pending_operations[0]
    assert isinstance(frozen_op.payload, MappingProxyType)
    assert isinstance(frozen_op.payload["changes"], MappingProxyType)
    assert isinstance(frozen_op.payload["changes"]["targets"], tuple)

    with pytest.raises(TypeError):
        frozen_op.payload["changes"] = "mutated"  # type: ignore[index]
    with pytest.raises(TypeError):
        frozen_op.payload["changes"]["role"] = "mutated"  # type: ignore[index]

    serialized = snapshot.as_storage()
    assert serialized["pending_operations"][0]["payload"]["changes"]["targets"] == [
        1,
        2,
    ]
    assert serialized["pending_operations"][0]["kind"] == "update_plant"


# --- Store write-failure and quarantine regressions ----------------------


async def test_write_failure_swallowed_by_ha_still_raises(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    """HA Store swallows WriteError; SmartPlantsStore must still surface it."""
    # HA's ``Store._async_handle_write_data`` catches WriteError and
    # SerializationError and only logs them. Our subclass captures the
    # exception on ``_last_write_error`` before HA's swallow catches it, so
    # ``SmartPlantsStore.async_save`` must still raise
    # ``SmartPlantsStorageError`` even when the HA path returns cleanly.
    store = SmartPlantsStore(hass)
    snapshot = InventorySnapshot.empty()

    async def failing_write(self: Any, data: Any) -> None:
        raise WriteError("simulated disk failure")

    with (
        patch(
            "homeassistant.helpers.storage.Store._async_write_data",
            new=failing_write,
        ),
        pytest.raises(SmartPlantsStorageError),
    ):
        await store.async_save(snapshot)


async def test_manager_write_failure_swallowed_by_ha_does_not_publish(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    """Through the manager, a swallowed HA write must not advance snapshot."""
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    assert manager.snapshot.revision == 0

    async def failing_write(self: Any, data: Any) -> None:
        raise WriteError("simulated disk failure")

    with (
        patch(
            "homeassistant.helpers.storage.Store._async_write_data",
            new=failing_write,
        ),
        pytest.raises(SmartPlantsStorageError),
    ):
        await manager.async_create_internal_record("Should not persist")

    assert manager.snapshot.revision == 0
    assert manager.snapshot.plants == {}


async def test_save_while_ha_is_stopping_is_rejected(hass: HomeAssistant) -> None:
    store = SmartPlantsStore(hass)
    hass.set_state(CoreState.stopping)

    with pytest.raises(SmartPlantsStorageError):
        await store.async_save(InventorySnapshot.empty())


async def test_failed_automatic_migration_save_rejects_load(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=1,
        data={"revision": 0, "plants": [], "pending_operations": [], "tombstones": []},
    )

    async def failing_write(self: Any, data: Any) -> None:
        raise WriteError("simulated migration write failure")

    with (
        patch(
            "homeassistant.helpers.storage.Store._async_write_data",
            new=failing_write,
        ),
        pytest.raises(SmartPlantsStorageError),
    ):
        await SmartPlantsStore(hass).async_load()


async def test_timestamped_corrupt_marker_refuses_empty_fallback(
    hass: HomeAssistant,
) -> None:
    """HA quarantines as ``<key>.corrupt.<iso>``; that must still be seen."""
    store = SmartPlantsStore(hass)
    store_path = Path(store.path)
    store_path.parent.mkdir(parents=True, exist_ok=True)
    marker = store_path.parent / f"{store_path.name}.corrupt.2026-09-06T12:34:56Z"
    marker.write_text("junk", encoding="utf-8")

    with pytest.raises(SmartPlantsInvalidStorageError):
        await store.async_load()

    assert storage_module._has_corrupt_sibling(str(store_path)) is True
    marker.unlink()
    assert storage_module._has_corrupt_sibling(str(store_path)) is False


async def test_corrupt_marker_scan_error_fails_closed(hass: HomeAssistant) -> None:
    with (
        patch.object(Path, "iterdir", side_effect=OSError("permission denied")),
        pytest.raises(SmartPlantsStorageError),
    ):
        await SmartPlantsStore(hass).async_load()


async def test_migration_rejects_payload_without_previous_shape(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    """Migration must not synthesize a valid empty inventory from garbage."""
    # Seeded payload matches an older minor but lacks the ``plants`` list
    # that every previous format carried. Migration must refuse rather
    # than invent an empty inventory that then passes downstream
    # validation.
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=0,
        data={"revision": 0},
    )
    with pytest.raises(SmartPlantsInvalidStorageError):
        await SmartPlantsStore(hass).async_load()


async def test_migration_rejects_payload_without_revision(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    """A missing revision on the source is also unrecognized."""
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=0,
        data={"plants": []},
    )
    with pytest.raises(SmartPlantsInvalidStorageError):
        await SmartPlantsStore(hass).async_load()


# --- Recovery-schema validation -----------------------------------------
#
# Strict kind-specific payload validation and exact schema-version
# enforcement guard the reconciler from acting on records whose shape
# does not match its expectations. Each parametrized case seeds one
# malformed pending operation or tombstone and asserts the loader
# fails-closed rather than passing it through.


_VALID_IMAGE_DICT: dict[str, Any] = {
    "id": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "content_type": "image/webp",
    "width": 100,
    "height": 80,
    "created_at": "2026-09-05T00:00:00Z",
}


def _op_envelope(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "op_id": "op-1",
        "kind": "create_plant",
        "plant_id": "plant-1",
        "requested_at": "2026-09-05T00:00:00Z",
        "expected_revision": None,
        "payload": {},
        "schema_version": 2,
    }
    base.update(overrides)
    return base


def _snapshot_with_op(op: dict[str, Any]) -> dict[str, Any]:
    return {
        "revision": 0,
        "plants": [],
        "pending_operations": [op],
        "tombstones": [],
    }


def _snapshot_with_tombstone(tombstone: dict[str, Any]) -> dict[str, Any]:
    return {
        "revision": 0,
        "plants": [],
        "pending_operations": [],
        "tombstones": [tombstone],
    }


@pytest.mark.parametrize(
    "op",
    [
        # Schema version below the current one (a past minor's record
        # that survived migration): rejected because payload shape may
        # have changed.
        _op_envelope(schema_version=0),
        # Future schema version: rejected because we cannot reason about
        # a payload shape written by a newer integration release.
        _op_envelope(schema_version=3),
        # Non-integer schema version.
        _op_envelope(schema_version="1"),
        # create_plant with an unsupported payload key.
        _op_envelope(payload={"area_id": "living_room", "extra": "no"}),
        # create_plant with area_id of the wrong shape.
        _op_envelope(payload={"area_id": ""}),
        _op_envelope(payload={"area_id": 42}),
        # disable_plant / reenable_plant / delete_plant must have empty
        # payloads; a stray key is unsupported.
        _op_envelope(kind="disable_plant", payload={"area_id": "x"}),
        _op_envelope(kind="reenable_plant", payload={"anything": 1}),
        _op_envelope(kind="delete_plant", payload={"anything": 1}),
        _op_envelope(kind="update_plant", payload={"area_id": "living_room"}),
        # create_image / replace_image without the required new_image.
        _op_envelope(kind="create_image", payload={"previous_image_id": None}),
        # replace_image with a malformed new_image (missing dimensions).
        _op_envelope(
            kind="replace_image",
            payload={
                "new_image": {
                    "id": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                    "content_type": "image/webp",
                    "created_at": "2026-09-05T00:00:00Z",
                },
                "previous_image_id": None,
            },
        ),
        # create_image with an unsupported extra key in payload.
        _op_envelope(
            kind="create_image",
            payload={
                "new_image": _VALID_IMAGE_DICT,
                "previous_image_id": None,
                "trace_id": "not-supported",
            },
        ),
        # delete_image without previous_image_id (empty string is
        # equivalent to missing for this validator).
        _op_envelope(kind="delete_image", payload={"previous_image_id": ""}),
        _op_envelope(kind="delete_image", payload={}),
        # delete_image with the wrong type.
        _op_envelope(kind="delete_image", payload={"previous_image_id": 12345}),
        # update_area: payload must carry ``target_area_id`` and nothing
        # else; empty string is not a valid "clear" (use null instead).
        _op_envelope(kind="update_area", payload={}),
        _op_envelope(kind="update_area", payload={"target_area_id": ""}),
        _op_envelope(kind="update_area", payload={"target_area_id": 42}),
        _op_envelope(
            kind="update_area",
            payload={"target_area_id": "kitchen", "extra": "no"},
        ),
    ],
)
def test_pending_operation_strict_validation_rejects(op: dict[str, Any]) -> None:
    with pytest.raises(SmartPlantsInvalidStorageError):
        _snapshot_from_payload(_snapshot_with_op(op))


@pytest.mark.parametrize(
    "op",
    [
        _op_envelope(payload={}),
        _op_envelope(payload={"area_id": None}),
        _op_envelope(kind="disable_plant", payload={}),
        _op_envelope(kind="delete_plant", payload={}),
        _op_envelope(
            kind="create_image",
            payload={
                "new_image": _VALID_IMAGE_DICT,
                "previous_image_id": None,
            },
        ),
        _op_envelope(
            kind="replace_image",
            payload={
                "new_image": _VALID_IMAGE_DICT,
                "previous_image_id": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            },
        ),
        _op_envelope(
            kind="delete_image",
            payload={"previous_image_id": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},
        ),
        # update_area: explicit intent to clear (null) and to set.
        _op_envelope(kind="update_area", payload={"target_area_id": None}),
        _op_envelope(kind="update_area", payload={"target_area_id": "living_room"}),
    ],
)
def test_pending_operation_strict_validation_accepts(op: dict[str, Any]) -> None:
    snapshot = _snapshot_from_payload(_snapshot_with_op(op))
    assert snapshot.pending_operations[0].kind == op["kind"]


@pytest.mark.parametrize(
    "tombstone",
    [
        # Wrong schema version (past minor).
        {
            "plant_id": "plt-1",
            "deleted_at": "2026-09-05T00:00:00Z",
            "payload": {"image_id": None},
            "schema_version": 0,
        },
        # Future schema version.
        {
            "plant_id": "plt-1",
            "deleted_at": "2026-09-05T00:00:00Z",
            "payload": {"image_id": None},
            "schema_version": TOMBSTONE_SCHEMA_VERSION + 1,
        },
        # Extra key in tombstone payload.
        {
            "plant_id": "plt-1",
            "deleted_at": "2026-09-05T00:00:00Z",
            "payload": {"image_id": None, "reason": "manual"},
            "schema_version": TOMBSTONE_SCHEMA_VERSION,
        },
        # image_id of the wrong type.
        {
            "plant_id": "plt-1",
            "deleted_at": "2026-09-05T00:00:00Z",
            "payload": {"image_id": 42},
            "schema_version": TOMBSTONE_SCHEMA_VERSION,
        },
        # Empty image_id string (would look like a valid id at reconcile
        # time and let a caller slip a "delete everything" through).
        {
            "plant_id": "plt-1",
            "deleted_at": "2026-09-05T00:00:00Z",
            "payload": {"image_id": ""},
            "schema_version": TOMBSTONE_SCHEMA_VERSION,
        },
    ],
)
def test_tombstone_strict_validation_rejects(tombstone: dict[str, Any]) -> None:
    with pytest.raises(SmartPlantsInvalidStorageError):
        _snapshot_from_payload(_snapshot_with_tombstone(tombstone))


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("created_at", "not-a-date"),
        ("acquired_at", "not-a-date"),
        ("id", " padded "),
        ("id", "x" * 201),
        ("name", ""),
    ],
)
def test_plant_record_strict_identity_and_timestamp_validation(
    field: str, value: object
) -> None:
    plant = {
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
    plant[field] = value
    payload = {
        "revision": 1,
        "plants": [plant],
        "pending_operations": [],
        "tombstones": [],
    }
    with pytest.raises(SmartPlantsInvalidStorageError):
        _snapshot_from_payload(payload)


def test_live_plant_cannot_also_have_tombstone() -> None:
    payload = {
        "revision": 2,
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
        "tombstones": [
            {
                "plant_id": "plant-1",
                "deleted_at": "2026-09-05T00:00:00Z",
                "payload": {"image_id": None},
                "schema_version": TOMBSTONE_SCHEMA_VERSION,
            }
        ],
    }
    with pytest.raises(SmartPlantsInvalidStorageError, match="also have a tombstone"):
        _snapshot_from_payload(payload)


async def test_minor_three_migrates_recovery_schema(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(
        hass_storage,
        major=STORAGE_MAJOR_VERSION,
        minor=2,
        data={
            "revision": 1,
            "plants": [],
            "pending_operations": [
                {
                    "op_id": "op-1",
                    "kind": "update_plant",
                    "plant_id": "plant-1",
                    "requested_at": "2026-09-05T00:00:00Z",
                    "expected_revision": 1,
                    "payload": {"area_id": "kitchen"},
                    "schema_version": 1,
                }
            ],
            "tombstones": [],
        },
    )
    snapshot = await SmartPlantsStore(hass).async_load()
    operation = snapshot.pending_operations[0]
    assert operation.kind == "update_area"
    assert operation.schema_version == 2
    assert operation.payload["target_area_id"] == "kitchen"
    assert hass_storage[STORAGE_KEY]["minor_version"] == STORAGE_MINOR_VERSION
