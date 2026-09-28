from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Final

from homeassistant.core import CoreState, HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import STORAGE_KEY, STORAGE_MAJOR_VERSION, STORAGE_MINOR_VERSION
from .models import (
    COLLECTION_MAX_COUNT,
    PENDING_OPERATION_SCHEMA_VERSION,
    TOMBSTONE_SCHEMA_VERSION,
    BatteryConfig,
    Co2Config,
    ConductivityConfig,
    HumidityConfig,
    IlluminanceConfig,
    InventorySnapshot,
    MoistureConfig,
    PendingOperation,
    PlantRecord,
    SoilTemperatureConfig,
    TemperatureConfig,
    Tombstone,
    _is_pure_int,
)

STORE_VERSION: Final = STORAGE_MAJOR_VERSION
STORE_MINOR_VERSION: Final = STORAGE_MINOR_VERSION

# Named boundaries for the per-minor migration branches. Kept as module-level
# constants so PLR2004 doesn't fire on the migration comparisons and each
# branch's meaning is legible without cross-referencing const.py.
_MINOR_OPERATION_COLLECTIONS_ADDED: Final = 1
_MINOR_TYPED_RECORDS: Final = 2
_MINOR_STRICT_RECOVERY_SCHEMAS: Final = 3
_MINOR_MOISTURE_ASSIGNMENTS: Final = 4
_MINOR_DURABLE_REGISTRY_CLEANUP: Final = 5
_MINOR_ROLE_CONTRACTS: Final = 6
_MINOR_SPECIES_SNAPSHOTS: Final = 7
_MINOR_TEMPERATURE_STRESS_OVERRIDES: Final = 8
_MINOR_STRESS_THRESHOLD_OVERRIDES: Final = 9
_MINOR_CARE_EVENTS: Final = 11
_LEGACY_SPECIES_TEXT_MAX: Final = 500
_INVENTORY_MAX_BYTES: Final = 8 * 1024 * 1024


class SmartPlantsStorageError(Exception):
    pass


class SmartPlantsInvalidStorageError(SmartPlantsStorageError):
    pass


class SmartPlantsUnsupportedStorageError(SmartPlantsStorageError):
    pass


class _SmartPlantsHAStore(Store[dict[str, Any]]):
    """HA Store subclass that owns migration and rejects unsupported versions."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        # HA Store's ``_async_handle_write_data`` catches
        # ``SerializationError`` and ``WriteError`` and only logs them, so a
        # bare ``async_save`` can return "success" even when nothing was
        # written. We shadow
        # ``_async_write_data`` below and record the outcome here so
        # ``SmartPlantsStore.async_save`` can surface swallowed failures
        # to the manager before it advances the in-memory snapshot.
        self._last_write_error: BaseException | None = None

    async def _async_write_data(self, data: dict[str, Any]) -> None:
        try:
            await super()._async_write_data(data)
        except Exception as err:
            self._last_write_error = err
            raise
        self._last_write_error = None

    async def _async_migrate_func(  # noqa: PLR0912, PLR0915
        self,
        old_major_version: int,
        old_minor_version: int,
        old_data: dict[str, Any],
    ) -> dict[str, Any]:
        if old_major_version > STORE_VERSION or (
            old_major_version == STORE_VERSION
            and old_minor_version > STORE_MINOR_VERSION
        ):
            raise SmartPlantsUnsupportedStorageError(
                "Smart Plants storage was created by a newer integration version"
            )

        data = _strip_legacy_envelope(old_data)

        if old_major_version < 1:
            raise SmartPlantsUnsupportedStorageError(
                "Smart Plants storage major version is not supported"
            )

        # Migrations must recognize the previous format's minimum shape
        # before transforming it. Otherwise a payload that happens
        # to be missing ``plants`` gets a synthesized empty list and passes
        # downstream validation as a valid empty inventory. The pre-2 shape
        # always carried ``revision`` (int) and ``plants`` (list); anything
        # else is unrecognized garbage that migration must not repair into
        # a "valid" empty inventory.
        if not _is_pure_int(data.get("revision")) or not isinstance(
            data.get("plants"), list
        ):
            raise SmartPlantsInvalidStorageError(
                "Smart Plants migration source is missing the previous format's "
                "'revision' or 'plants' field; refusing to synthesize an empty "
                "inventory from unrecognized data"
            )

        if (
            old_major_version == 1
            and old_minor_version < _MINOR_OPERATION_COLLECTIONS_ADDED
        ):
            data.setdefault("pending_operations", [])
            data.setdefault("tombstones", [])

        if old_major_version == 1 and old_minor_version < _MINOR_TYPED_RECORDS:
            # Minor 2 adds timestamps, species, placement, tags,
            # category, and image metadata to PlantRecord, and switches the
            # operation collections from opaque dicts to typed records. Pre-2
            # storage never carried real pending operations or tombstones
            # (the fields were structural only), so the safe migration is:
            #   - fill missing plant fields with typed-shape defaults, using
            #     the migration time as the created_at fallback so records
            #     stay chronologically monotonic under a fresh install;
            #   - discard any legacy operation entries, which by construction
            #     were only ever the empty list.
            fallback_created_at = _utcnow_iso()
            migrated_plants: list[dict[str, Any]] = []
            for plant in data.get("plants", []):
                if not isinstance(plant, dict):
                    # Let _snapshot_from_payload raise the structured error
                    # after migration; keep migration side-effect-free on
                    # obviously invalid rows.
                    migrated_plants.append(plant)
                    continue
                plant.setdefault("created_at", fallback_created_at)
                plant.setdefault("acquired_at", None)
                plant.setdefault("species", None)
                plant.setdefault("placement", None)
                plant.setdefault("tags", [])
                plant.setdefault("category", None)
                plant.setdefault("image", None)
                migrated_plants.append(plant)
            data["plants"] = migrated_plants
            data["pending_operations"] = []
            data["tombstones"] = []

        if (
            old_major_version == 1
            and old_minor_version < _MINOR_STRICT_RECOVERY_SCHEMAS
        ):
            migrated_operations: list[Any] = []
            for raw_op in data.get("pending_operations", []):
                if not isinstance(raw_op, dict):
                    migrated_operations.append(raw_op)
                    continue
                operation = dict(raw_op)
                payload = operation.get("payload")
                if operation.get("kind") == "update_plant" and isinstance(
                    payload, dict
                ):
                    area_id = payload.get("area_id")
                    if area_id is not None:
                        operation["kind"] = "update_area"
                        operation["payload"] = {"target_area_id": area_id}
                    else:
                        operation["payload"] = {}
                operation["schema_version"] = PENDING_OPERATION_SCHEMA_VERSION
                migrated_operations.append(operation)
            data["pending_operations"] = migrated_operations

            migrated_tombstones: list[Any] = []
            for raw_tombstone in data.get("tombstones", []):
                if not isinstance(raw_tombstone, dict):
                    migrated_tombstones.append(raw_tombstone)
                    continue
                tombstone = dict(raw_tombstone)
                tombstone["schema_version"] = TOMBSTONE_SCHEMA_VERSION
                migrated_tombstones.append(tombstone)
            data["tombstones"] = migrated_tombstones

        if old_major_version == 1 and old_minor_version < _MINOR_MOISTURE_ASSIGNMENTS:
            # Minor 4 adds a moisture config to every plant. Existing
            # plants get the documented defaults: no assigned sources, primary
            # aggregation, six-hour staleness, and the 15/35/55 threshold
            # anchors. from_storage still accepts a missing 'moisture' key
            # for forward-compat with tests that seed pre-migration payloads,
            # but a migrated payload always carries the explicit shape.
            default_moisture = MoistureConfig().as_storage()
            migrated_moisture: list[dict[str, Any]] = []
            for plant in data.get("plants", []):
                if not isinstance(plant, dict):
                    migrated_moisture.append(plant)
                    continue
                plant.setdefault("moisture", dict(default_moisture))
                migrated_moisture.append(plant)
            data["plants"] = migrated_moisture

        if (
            old_major_version == 1
            and old_minor_version < _MINOR_DURABLE_REGISTRY_CLEANUP
        ):
            migrated_tombstones = []
            for raw_tombstone in data.get("tombstones", []):
                if not isinstance(raw_tombstone, dict):
                    migrated_tombstones.append(raw_tombstone)
                    continue
                tombstone = dict(raw_tombstone)
                payload = tombstone.get("payload")
                if isinstance(payload, dict):
                    payload = dict(payload)
                    payload.setdefault("cleanup_phase", "pending")
                    tombstone["payload"] = payload
                tombstone["schema_version"] = TOMBSTONE_SCHEMA_VERSION
                migrated_tombstones.append(tombstone)
            data["tombstones"] = migrated_tombstones

        if old_major_version == 1 and old_minor_version < _MINOR_ROLE_CONTRACTS:
            migrated_roles: list[Any] = []
            for raw_plant in data.get("plants", []):
                if not isinstance(raw_plant, dict):
                    migrated_roles.append(raw_plant)
                    continue
                plant = dict(raw_plant)
                moisture = plant.pop("moisture", MoistureConfig().as_storage())
                if isinstance(moisture, dict):
                    # Parse and serialize to make nullable overrides and default
                    # attribution explicit in the first v6 write.
                    moisture = MoistureConfig.from_storage(moisture).as_storage()
                roles = plant.get("roles")
                roles = dict(roles) if isinstance(roles, dict) else {}
                roles["moisture"] = moisture
                plant["roles"] = roles
                migrated_roles.append(plant)
            data["plants"] = migrated_roles

        if old_major_version == 1 and old_minor_version < _MINOR_SPECIES_SNAPSHOTS:
            migrated_species: list[Any] = []
            for raw_plant in data.get("plants", []):
                if not isinstance(raw_plant, dict):
                    migrated_species.append(raw_plant)
                    continue
                plant = dict(raw_plant)
                species = plant.get("species")
                if species is not None:
                    if not _is_valid_minor_six_manual_species(species):
                        raise SmartPlantsInvalidStorageError(
                            "minor-6 species payload is malformed or unsupported"
                        )
                    old_snapshot = species.get("snapshot")
                    if not isinstance(old_snapshot, dict):
                        raise SmartPlantsInvalidStorageError(
                            "minor-6 species snapshot is malformed"
                        )
                    attribution = "User supplied"
                    fields = {
                        key: attribution
                        for key in ("common_name", "latin_name", "category")
                        if isinstance(old_snapshot.get(key), str)
                    }
                    species = {
                        "provider": "manual",
                        "snapshot": {
                            "provider": "manual",
                            "provider_id": None,
                            "provider_ref": None,
                            "fetched_at": plant.get("created_at", _utcnow_iso()),
                            "locale": "und",
                            "source_status": "manual",
                            "attribution": attribution,
                            "common_name": old_snapshot.get("common_name"),
                            "latin_name": old_snapshot.get("latin_name"),
                            "category": old_snapshot.get("category"),
                            "confidence": None,
                            "care_text": {},
                            "field_sources": fields,
                            "threshold_defaults": {},
                        },
                    }
                    plant["species"] = species
                migrated_species.append(plant)
            data["plants"] = migrated_species

        if (
            old_major_version == 1
            and old_minor_version < _MINOR_TEMPERATURE_STRESS_OVERRIDES
        ):
            # Minor 8 adds a per-plant temperature stress override map. Every
            # persisted temperature role config is re-round-tripped so it
            # carries the explicit all-``null`` override map; effective
            # threshold values are unchanged.
            migrated_temperature: list[Any] = []
            for raw_plant in data.get("plants", []):
                if not isinstance(raw_plant, dict):
                    migrated_temperature.append(raw_plant)
                    continue
                plant = dict(raw_plant)
                roles = plant.get("roles")
                if isinstance(roles, dict) and "temperature" in roles:
                    temperature_raw = roles["temperature"]
                    if isinstance(temperature_raw, dict):
                        temperature = TemperatureConfig.from_storage(
                            temperature_raw
                        ).as_storage()
                        roles = dict(roles)
                        roles["temperature"] = temperature
                        plant["roles"] = roles
                migrated_temperature.append(plant)
            data["plants"] = migrated_temperature

        if (
            old_major_version == 1
            and old_minor_version < _MINOR_STRESS_THRESHOLD_OVERRIDES
        ):
            # Minor 9 adds a per-plant stress override map for the six
            # remaining non-moisture stress binaries. Every persisted role config
            # for humidity, illuminance, battery, conductivity,
            # soil_temperature, and co2 is re-round-tripped so it carries
            # the explicit all-``null`` override map; effective threshold
            # values are unchanged.
            role_migrators: tuple[tuple[str, Any], ...] = (
                ("humidity", HumidityConfig),
                ("illuminance", IlluminanceConfig),
                ("battery", BatteryConfig),
                ("conductivity", ConductivityConfig),
                ("soil_temperature", SoilTemperatureConfig),
                ("co2", Co2Config),
            )
            migrated_stress: list[Any] = []
            for raw_plant in data.get("plants", []):
                if not isinstance(raw_plant, dict):
                    migrated_stress.append(raw_plant)
                    continue
                plant = dict(raw_plant)
                roles = plant.get("roles")
                if isinstance(roles, dict):
                    roles = dict(roles)
                    changed = False
                    for role_key, config_cls in role_migrators:
                        role_raw = roles.get(role_key)
                        if isinstance(role_raw, dict):
                            roles[role_key] = config_cls.from_storage(
                                role_raw
                            ).as_storage()
                            changed = True
                    if changed:
                        plant["roles"] = roles
                migrated_stress.append(plant)
            data["plants"] = migrated_stress

        # Minor 10 changes creation gating but adds no historical assignment
        # field. An empty source list in an older minor may belong to a role
        # assigned and cleared before upgrade. Registry entries remain intact.

        if old_major_version == 1 and old_minor_version < _MINOR_CARE_EVENTS:
            for plant in data["plants"]:
                if isinstance(plant, dict):
                    if "care_events" in plant:
                        raise SmartPlantsInvalidStorageError(
                            "older storage cannot contain care events"
                        )
                    plant["care_events"] = []

        return data


def _is_valid_minor_six_manual_species(value: object) -> bool:
    """Recognize only the documented minor-6 manual species shape."""
    if not isinstance(value, dict) or set(value) != {"provider", "snapshot"}:
        return False
    snapshot = value.get("snapshot")
    if value.get("provider") != "manual" or not isinstance(snapshot, dict):
        return False
    if not set(snapshot) <= {"common_name", "latin_name", "category"}:
        return False
    return all(
        item is None
        or (
            isinstance(item, str)
            and bool(item)
            and len(item) <= _LEGACY_SPECIES_TEXT_MAX
        )
        for item in snapshot.values()
    )


class SmartPlantsStore:
    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store = _SmartPlantsHAStore(
            hass,
            STORE_VERSION,
            STORAGE_KEY,
            atomic_writes=True,
            minor_version=STORE_MINOR_VERSION,
        )

    @property
    def path(self) -> str:
        return str(self._store.path)

    async def async_load(self) -> InventorySnapshot:
        path = self._store.path
        had_file = await self._hass.async_add_executor_job(os.path.isfile, path)
        self._store._last_write_error = None  # noqa: SLF001
        try:
            stored = await self._store.async_load()
        except HomeAssistantError as err:
            # HA raises UnsupportedStorageVersionError before our Store
            # subclass migrate hook runs when the on-disk major version is
            # newer than what we support. Translate to the integration's own
            # exception hierarchy so callers only need to handle one kind.
            raise SmartPlantsUnsupportedStorageError(str(err)) from err
        migration_write_error: BaseException | None = self._store._last_write_error  # noqa: SLF001
        if migration_write_error is not None:
            self._store._last_write_error = None  # noqa: SLF001
            raise SmartPlantsStorageError(
                f"Smart Plants failed to persist migrated storage: "
                f"{migration_write_error}"
            ) from migration_write_error
        if stored is None:
            if had_file:
                # HA quarantined a malformed file and returned None. Never
                # authorize an empty snapshot on top of that: fail loudly.
                raise SmartPlantsInvalidStorageError(
                    "Smart Plants storage file was quarantined as corrupt; "
                    "refusing to fall back to an empty inventory"
                )
            try:
                corrupt_marker = await self._hass.async_add_executor_job(
                    _has_corrupt_sibling, path
                )
            except OSError as err:
                raise SmartPlantsStorageError(
                    "Smart Plants could not inspect storage corruption markers"
                ) from err
            if corrupt_marker:
                raise SmartPlantsInvalidStorageError(
                    "Smart Plants storage file was previously quarantined as corrupt"
                )
            return InventorySnapshot.empty()
        return _snapshot_from_payload(stored, require_roles=True)

    async def async_save(self, snapshot: InventorySnapshot) -> None:
        # HA's Store swallows WriteError/SerializationError inside
        # _async_handle_write_data. Our subclass captures the exception on
        # _last_write_error; reset it before the save and re-raise it as
        # our own error if the write failed, so the manager never publishes
        # a snapshot that is not durable on disk.
        if self._hass.state is CoreState.stopping:
            raise SmartPlantsStorageError(
                "Smart Plants cannot persist mutations while Home Assistant is stopping"
            )
        self._store._last_write_error = None  # noqa: SLF001
        await self._store.async_save(snapshot.as_storage())
        # Read through a fresh reference so mypy does not treat the attribute
        # as still-narrowed to None from the assignment above; the executor
        # thread may mutate it while ``async_save`` is awaited.
        write_error: BaseException | None = self._store._last_write_error  # noqa: SLF001
        if write_error is not None:
            self._store._last_write_error = None  # noqa: SLF001
            raise SmartPlantsStorageError(
                f"Smart Plants failed to persist snapshot: {write_error}"
            ) from write_error

    async def async_remove(self) -> None:
        await self._store.async_remove()


async def async_remove_storage(hass: HomeAssistant) -> None:
    """
    Remove the persisted Smart Plants inventory file, if any.

    Uses a fresh HA Store instance instead of a full manager so removal
    cannot be raced by an old, still-referenced manager finishing a
    pending write and recreating the file.
    """
    await Store(hass, STORE_VERSION, STORAGE_KEY).async_remove()


def _strip_legacy_envelope(data: object) -> dict[str, Any]:
    # Legacy dev payloads wrapped the inventory in
    # ``{"store_version": ..., "inventory": ...}``. Current payloads are the
    # flat inventory dict, and HA Store metadata is the single source of
    # version truth.
    if not isinstance(data, dict):
        raise SmartPlantsInvalidStorageError("Smart Plants storage root is invalid")

    inner = data.get("inventory")
    if isinstance(inner, dict) and "store_version" in data:
        return dict(inner)
    return dict(data)


def _snapshot_from_payload(  # noqa: PLR0912
    data: object, *, require_roles: bool = False
) -> InventorySnapshot:
    inventory = _strip_legacy_envelope(data)
    try:
        encoded_size = len(
            json.dumps(inventory, ensure_ascii=False, separators=(",", ":")).encode()
        )
    except (RecursionError, TypeError, ValueError) as err:
        raise SmartPlantsInvalidStorageError(
            "Smart Plants storage must be JSON serializable"
        ) from err
    if encoded_size > _INVENTORY_MAX_BYTES:
        raise SmartPlantsInvalidStorageError(
            "Smart Plants storage exceeds its size limit"
        )

    revision = inventory.get("revision")
    plants = inventory.get("plants")
    pending_operations = inventory.get("pending_operations")
    tombstones = inventory.get("tombstones")

    if not _is_pure_int(revision) or revision < 0:
        raise SmartPlantsInvalidStorageError("Smart Plants revision is invalid")
    if not isinstance(plants, list):
        raise SmartPlantsInvalidStorageError(
            "Smart Plants plants collection is invalid"
        )
    if not isinstance(pending_operations, list):
        raise SmartPlantsInvalidStorageError(
            "Smart Plants pending operations are invalid"
        )
    if not isinstance(tombstones, list):
        raise SmartPlantsInvalidStorageError("Smart Plants tombstones are invalid")
    if any(
        len(collection) > COLLECTION_MAX_COUNT
        for collection in (plants, pending_operations, tombstones)
    ):
        raise SmartPlantsInvalidStorageError(
            "Smart Plants collection size limit exceeded"
        )

    plant_records: dict[str, PlantRecord] = {}
    for plant_data in plants:
        try:
            plant = PlantRecord.from_storage(plant_data, require_roles=require_roles)
        except ValueError as err:
            raise SmartPlantsInvalidStorageError(str(err)) from err
        if plant.id in plant_records:
            raise SmartPlantsInvalidStorageError("duplicate Smart Plants plant id")
        plant_records[plant.id] = plant

    pending_records: list[PendingOperation] = []
    for op in pending_operations:
        try:
            pending_records.append(PendingOperation.from_storage(op))
        except ValueError as err:
            raise SmartPlantsInvalidStorageError(str(err)) from err

    tombstone_records: list[Tombstone] = []
    for entry in tombstones:
        try:
            tombstone_records.append(Tombstone.from_storage(entry))
        except ValueError as err:
            raise SmartPlantsInvalidStorageError(str(err)) from err

    live_ids = set(plant_records)
    conflicting_tombstone = next(
        (entry.plant_id for entry in tombstone_records if entry.plant_id in live_ids),
        None,
    )
    if conflicting_tombstone is not None:
        raise SmartPlantsInvalidStorageError(
            f"plant {conflicting_tombstone!r} cannot also have a tombstone"
        )

    return InventorySnapshot(
        revision=revision,
        plants=plant_records,
        pending_operations=tuple(pending_records),
        tombstones=tuple(tombstone_records),
    )


def _has_corrupt_sibling(path: str) -> bool:
    """
    Return True if HA has quarantined an earlier copy of ``path``.

    HA names the quarantined file ``<path>.corrupt.<isoformat>`` (see
    ``homeassistant.helpers.storage.Store._async_load_data``), not the bare
    ``<path>.corrupt`` the older HA versions used. Checking for the bare
    name missed every real quarantine and let the loader fall back to an
    empty inventory on a later setup attempt. Match anything that starts
    with the ``<name>.corrupt`` prefix so both the bare form and the
    timestamped form are caught.
    """
    directory = Path(path).parent
    prefix = Path(path).name + ".corrupt"
    try:
        entries = list(directory.iterdir())
    except FileNotFoundError:
        return False
    return any(
        entry.name == prefix or entry.name.startswith(prefix + ".") for entry in entries
    )


def _utcnow_iso() -> str:
    """
    Return the current UTC time in ISO 8601 with a Z suffix.

    Kept module-private so migration and the manager share one canonical
    timestamp shape; tests can freeze time via HA's dt_util patch helpers.
    """
    return dt_util.utcnow().isoformat().replace("+00:00", "Z")
