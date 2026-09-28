"""
Home Assistant device registry reconciliation for Smart Plants.

Cut 2 owns exactly one HA device per plant, keyed by the immutable
``(DOMAIN, plant_id)`` identifier tuple. The integration is the source
of truth only for the fields it wrote: identifiers, model
(the species name, or "Plant"), manufacturer, entry type, and the
plant's canonical ``name``.

Everything a user can edit natively on the device page — ``name_by_user``,
labels, area, disabled state — is treated as authoritative and is never
overwritten by us. In particular, the requested area is honoured only
on first device creation; after that HA's ``area_id`` wins for the
lifetime of the plant, matching the phase spec's "authoritative area"
rule.

Reconciliation goes through a two-phase flow driven by the manager:

1. The manager appends a typed ``PendingOperation`` and publishes the
   new snapshot to storage.
2. The reconciler runs the side effect (create / update / delete on the
   device registry).
3. On success the manager publishes a snapshot with the pending op
   removed.

Step 2 is idempotent, so restart-time reconciliation can replay any op
that survives a crash between steps 1 and 3.
"""

from __future__ import annotations

import time
from collections.abc import Iterable, Mapping
from typing import TYPE_CHECKING, Any

from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN, IMAGE_ORPHAN_GRACE_SECONDS
from .images import (
    delete_image_file,
    delete_stale_tmp_files,
    get_images_dir,
    list_image_files,
)
from .roles import entity_roles


def _unique_id_belongs_to_plant(
    unique_id: str,
    plant_id: str,
    known_plant_ids: set[str],
    *,
    device_id: str | None,
    entry_device_id: str | None,
) -> bool:
    """Match legacy IDs exactly and reject ambiguous delimiter prefixes."""
    if device_id is not None and entry_device_id == device_id:
        return True
    if any(
        unique_id == f"{DOMAIN}:{plant_id}:{entity.role}"
        for platform in ("sensor", "binary_sensor", "number")
        for _definition, entity in entity_roles(platform)
    ):
        return True
    prefix = f"{DOMAIN}:{plant_id}:"
    if not unique_id.startswith(prefix):
        return False
    return not any(
        other != plant_id and unique_id.startswith(f"{DOMAIN}:{other}:")
        for other in known_plant_ids
    )


if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .models import PendingOperation, PlantRecord, Tombstone


_MANUFACTURER = "Smart Plants"
_MODEL_DEFAULT = "Plant"


def device_model(plant: PlantRecord) -> str:
    """Return the device model: the species name when known, else "Plant"."""
    if plant.species is not None:
        snapshot = plant.species.snapshot
        for candidate in (snapshot.common_name, snapshot.latin_name):
            if candidate and candidate.strip():
                return candidate.strip()
    return _MODEL_DEFAULT


class SmartPlantsDeviceReconciler:
    """
    Applies plant-level state changes to the HA device registry.

    The reconciler never stores mutable state of its own — every call
    reads the current device registry, compares it to the target, and
    applies the minimum diff. That is what lets startup replay work
    even when nothing crashed.
    """

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self._hass = hass
        self._entry_id = entry_id

    def _registry(self) -> dr.DeviceRegistry:
        return dr.async_get(self._hass)

    def _identifier(self, plant_id: str) -> set[tuple[str, str]]:
        return {(DOMAIN, plant_id)}

    def _find_device(
        self, registry: dr.DeviceRegistry, plant_id: str
    ) -> dr.DeviceEntry | None:
        # Device identifiers are only unique within a config entry, so the
        # lookup is scoped to the entry that owns the plant.
        return registry.async_get_device_by_identifier(
            (DOMAIN, plant_id), self._entry_id
        )

    async def async_reconcile_present(
        self,
        plant: PlantRecord,
        *,
        requested_area_id: str | None = None,
    ) -> None:
        """
        Ensure the device for ``plant`` exists and matches our authored fields.

        ``requested_area_id`` is applied only when the device is being
        created for the first time. On any subsequent call we never
        touch ``area_id``: HA's registry value wins.
        """
        registry = self._registry()
        existing = self._find_device(registry, plant.id)

        if existing is None:
            device = registry.async_get_or_create(
                config_entry_id=self._entry_id,
                identifiers=self._identifier(plant.id),
                manufacturer=_MANUFACTURER,
                model=device_model(plant),
                name=plant.name,
                entry_type=dr.DeviceEntryType.SERVICE,
            )
            # ``suggested_area`` takes an area *name* and creates a new area
            # when none matches, so an area ID such as "living_room" would
            # spawn a duplicate area. Assign the ID directly, and only if the
            # area still exists.
            if (
                requested_area_id
                and ar.async_get(self._hass).async_get_area(requested_area_id)
                is not None
            ):
                registry.async_update_device(device.id, area_id=requested_area_id)
            return

        # We only ever change the canonical ``name`` and ``model`` we
        # authored. The user's ``name_by_user`` overrides the display
        # everywhere, so updating our field never affects what the user
        # sees when they've customised it. Labels, area, and disabled_by
        # are authoritative on the registry.
        changes: dict[str, Any] = {}
        if existing.name != plant.name:
            changes["name"] = plant.name
        model = device_model(plant)
        if existing.model != model:
            changes["model"] = model
        if changes:
            registry.async_update_device(existing.id, **changes)

    async def async_apply_area(self, plant_id: str, area_id: str | None) -> bool:
        """
        Apply an explicit area intent to the plant's device exactly once.

        Called by the manager for ``async_set_plant_area`` and by replay
        for a stalled ``update_area`` operation. Idempotent: if the
        device already carries the target area, no write is issued.

        Returns True when the target condition is confirmed (device
        matches target, or was just written), and False when the device
        does not exist yet so replay can leave the op in place for a
        later pass.
        """
        registry = self._registry()
        existing = self._find_device(registry, plant_id)
        if existing is None:
            return False
        if existing.area_id == area_id:
            return True
        registry.async_update_device(existing.id, area_id=area_id)
        return True

    async def async_reconcile_absent(
        self, plant_id: str, *, known_plant_ids: Iterable[str] = ()
    ) -> None:
        """
        Drive the durable deletion protocol for ``plant_id``.

        Order matters, and every step is idempotent so an interrupted
        deletion resumes correctly on the next startup:

        1. Remove every entity_registry entry attached to the plant's
           device, INCLUDING user-disabled entries. A tombstone means
           the user asked for the plant to be gone; a Smart Plants
           entity attached to a plant that no longer exists has no
           legitimate reason to survive in the registry.
        2. Remove the device itself.

        Cut 3 keeps runtime entity teardown ahead of this call (driven
        by the ``PlantDeletedEvent`` handler in
        ``SmartPlantsPlatformLifecycle``) so the entity_registry rows
        are handled without a live entity trying to write state through
        a torn-down subscription.
        """
        registry = self._registry()
        existing = self._find_device(registry, plant_id)
        # ``include_disabled_entities=True`` matters: a user who
        # disabled the entity_registry entry still expects a plant
        # deletion to wipe it, not to strand the entry.
        entity_reg = er.async_get(self._hass)
        # Device attachment alone is not ownership: another integration may
        # legitimately attach an entity to this device. The namespaced unique
        # id and our platform remain durable even when old entry/device links
        # are null.
        known_ids = {*known_plant_ids, plant_id}
        namespaced = tuple(
            entry
            for entry in entity_reg.entities.values()
            if entry.platform == DOMAIN
            and _unique_id_belongs_to_plant(
                entry.unique_id,
                plant_id,
                known_ids,
                device_id=existing.id if existing is not None else None,
                entry_device_id=entry.device_id,
            )
        )
        for entry in namespaced:
            entity_reg.async_remove(entry.entity_id)
        if existing is not None:
            registry.async_remove_device(existing.id)
        await _async_flush_registry_store(entity_reg)
        await _async_flush_registry_store(registry)

    def cleanup_complete(
        self, plant_id: str, *, known_plant_ids: Iterable[str] = ()
    ) -> bool:
        """Return whether no device or namespaced registry row remains."""
        registry = self._registry()
        entity_reg = er.async_get(self._hass)
        known_ids = {*known_plant_ids, plant_id}
        existing = self._find_device(registry, plant_id)
        return existing is None and not any(
            entry.platform == DOMAIN
            and _unique_id_belongs_to_plant(
                entry.unique_id,
                plant_id,
                known_ids,
                device_id=None,
                entry_device_id=entry.device_id,
            )
            for entry in entity_reg.entities.values()
        )

    async def async_replay(  # noqa: PLR0912, PLR0915
        self,
        *,
        plants: dict[str, PlantRecord],
        pending_operations: tuple[PendingOperation, ...],
        tombstones: tuple[Tombstone, ...],
    ) -> tuple[
        frozenset[str],
        frozenset[str],
        dict[str, PlantRecord],
    ]:
        """
        Idempotently replay outstanding pending operations and tombstones.

        Returns ``(completed_op_ids, completed_tombstone_plant_ids,
        plant_updates)``. ``plant_updates`` carries any PlantRecord that
        image reconciliation advanced (attach/detach image) so the
        manager can apply the change in a single published snapshot.
        Nothing is written to storage from here — the manager still
        owns durability.
        """
        completed_ops: set[str] = set()
        completed_tombstones: set[str] = set()
        plant_updates: dict[str, PlantRecord] = {}
        images_dir = get_images_dir(self._hass)
        known_plant_ids = {
            *plants,
            *(tombstone.plant_id for tombstone in tombstones),
        }

        def _current(plant_id: str) -> PlantRecord | None:
            # Read-through the in-flight updates so two ops touching the
            # same plant compose correctly during a single replay pass.
            if plant_id in plant_updates:
                return plant_updates[plant_id]
            return plants.get(plant_id)

        for op in pending_operations:
            if op.kind in ("create_plant", "update_plant"):
                plant = _current(op.plant_id)
                if plant is None:
                    # The plant no longer exists (a later delete superseded
                    # this op); the target condition — device absent — is
                    # what the tombstone loop will confirm. Drop the op.
                    completed_ops.add(op.op_id)
                    continue
                requested_area = op.payload.get("area_id") if op.payload else None
                await self.async_reconcile_present(
                    plant,
                    requested_area_id=requested_area,
                )
                # Reconciler is idempotent; if it returned without raising,
                # the device now matches the target and we can clear the op.
                completed_ops.add(op.op_id)
            elif op.kind == "delete_plant":
                await self.async_reconcile_absent(
                    op.plant_id, known_plant_ids=known_plant_ids
                )
                completed_ops.add(op.op_id)
            elif op.kind == "update_area":
                # Explicit area intent from ``async_set_plant_area``.
                # Payload was strictly validated at load time, so we can
                # trust ``target_area_id`` (string or null).
                plant = _current(op.plant_id)
                if plant is None:
                    completed_ops.add(op.op_id)
                    continue
                target = op.payload.get("target_area_id") if op.payload else None
                if await self.async_apply_area(op.plant_id, target):
                    completed_ops.add(op.op_id)
                else:
                    await self.async_reconcile_present(plant)
                    if await self.async_apply_area(op.plant_id, target):
                        completed_ops.add(op.op_id)
            elif op.kind in ("create_image", "replace_image"):
                if await self._replay_image_upsert(
                    op,
                    plant=_current(op.plant_id),
                    plants=plants,
                    plant_updates=plant_updates,
                    pending_operations=pending_operations,
                    completed_ops=completed_ops,
                    images_dir=images_dir,
                ):
                    completed_ops.add(op.op_id)
            elif op.kind == "delete_image":
                if await self._replay_image_delete(
                    op,
                    plant=_current(op.plant_id),
                    plants=plants,
                    plant_updates=plant_updates,
                    pending_operations=pending_operations,
                    completed_ops=completed_ops,
                    images_dir=images_dir,
                ):
                    completed_ops.add(op.op_id)
            # disable_plant / reenable_plant have no Cut 2 side effect
            # (no entities yet); drop the op to keep the queue clean.
            else:
                completed_ops.add(op.op_id)

        # Full-inventory reconciliation: guarantee exactly one device per
        # validated live plant on startup, even when no pending operation
        # is queued. Runs AFTER pending-op replay so any op that already
        # created/renamed a device is honored first (including its
        # ``requested_area_id`` on first creation).
        #
        # ``async_reconcile_present`` is idempotent and never touches
        # ``area_id``, ``name_by_user``, labels, or ``disabled_by`` when
        # the device already exists, so calling it on every plant is safe
        # even when the user has customised the registry entry natively.
        # A missing device is created without a requested area (there is
        # no explicit intent to record at this point); an explicit area
        # write must go through ``async_set_plant_area``.
        for plant_id, plant in plants.items():
            current = plant_updates.get(plant_id, plant)
            await self.async_reconcile_present(current)

        # Cross-record validation before any tombstone-driven filesystem
        # deletion: an image id referenced by another live plant or by an
        # in-flight pending op must never be unlinked, even if a stray
        # tombstone names it.
        for tombstone in tombstones:
            await self.async_reconcile_absent(
                tombstone.plant_id, known_plant_ids=known_plant_ids
            )
            cleanup_complete = self.cleanup_complete(
                tombstone.plant_id, known_plant_ids=known_plant_ids
            )
            payload = tombstone.payload or {}
            payload_image = payload.get("image_id")
            if isinstance(payload_image, str) and _is_image_safely_deletable(
                payload_image,
                tombstone_plant_id=tombstone.plant_id,
                plants=plants,
                plant_updates=plant_updates,
                pending_operations=pending_operations,
                completed_ops=completed_ops,
            ):
                await self._hass.async_add_executor_job(
                    delete_image_file, images_dir, payload_image
                )
            if (
                cleanup_complete
                and tombstone.payload.get("cleanup_phase") == "registry_persisted"
            ):
                completed_tombstones.add(tombstone.plant_id)

        # Orphan cleanup: purge WebP files older than the grace period
        # that no live plant references. Anything younger is kept so a
        # crash between "write file" and "publish target" has time to be
        # completed by a follow-up call, and so operators can recover a
        # file that was unlinked in error.
        # Never delete files from a snapshot that only exists in memory.
        # The manager persists plant_updates and replays once more before
        # this cleanup path runs.
        if not plant_updates:
            referenced_ids = _referenced_image_ids(
                plants, plant_updates, pending_operations, completed_ops
            )

            files = await self._hass.async_add_executor_job(
                list_image_files, images_dir
            )
            cutoff = time.time() - IMAGE_ORPHAN_GRACE_SECONDS
            for image_id, mtime in files:
                if image_id in referenced_ids:
                    continue
                if mtime >= cutoff:
                    continue
                await self._hass.async_add_executor_job(
                    delete_image_file, images_dir, image_id
                )

            # Interrupted write_image_file leaves a ``.<id>.webp.tmp`` file
            # behind. Only reap ones older than the grace period so a
            # concurrent, still-running upload is not raced.
            await self._hass.async_add_executor_job(
                _delete_stale_tmp,
                images_dir,
                IMAGE_ORPHAN_GRACE_SECONDS,
            )

        return (
            frozenset(completed_ops),
            frozenset(completed_tombstones),
            plant_updates,
        )

    async def _replay_image_upsert(  # noqa: PLR0913
        self,
        op: PendingOperation,
        *,
        plant: PlantRecord | None,
        plants: dict[str, PlantRecord],
        plant_updates: dict[str, PlantRecord],
        pending_operations: tuple[PendingOperation, ...],
        completed_ops: set[str],
        images_dir: Any,
    ) -> bool:
        """
        Complete a stalled create_image / replace_image.

        Returns True only when the target condition is confirmed and the
        pending op is safe to clear. When the outcome is ambiguous (for
        example, the file write did not land AND the plant record still
        references the previous image), we leave the op in place so the
        next startup pass retries instead of silently forgetting the
        intent.

        Op payload is guaranteed to be schema-validated at load time
        (see ``PendingOperation.from_storage``); the defensive parse here
        catches only the "the shape drifted since load" case, which is
        impossible in normal flow but keeps replay hermetic.
        """
        from .models import PlantImage  # noqa: PLC0415

        payload_image = op.payload.get("new_image") if op.payload else None
        previous_image_id = op.payload.get("previous_image_id") if op.payload else None
        if not isinstance(payload_image, Mapping):
            # Payload shape drifted (should not happen post strict-load,
            # but keep an op we cannot interpret in place rather than
            # forgetting the intent).
            return False
        try:
            new_image = PlantImage.from_storage(dict(payload_image))
        except ValueError:
            return False

        file_present = await self._hass.async_add_executor_job(
            _image_file_present, images_dir, new_image.id
        )

        if plant is None:
            # Plant was deleted after intent was recorded; orphan-delete
            # the new file (its id is not referenced by anything live).
            if file_present and _is_image_safely_deletable(
                new_image.id,
                tombstone_plant_id=op.plant_id,
                plants=plants,
                plant_updates=plant_updates,
                pending_operations=pending_operations,
                completed_ops={*completed_ops, op.op_id},
            ):
                await self._hass.async_add_executor_job(
                    delete_image_file, images_dir, new_image.id
                )
            return True

        if not file_present:
            # Crashed before the file write completed; the record was
            # never advanced. Rolling back is safe and confirmed.
            return True

        if plant.image is not None and plant.image.id == new_image.id:
            # Record already advanced before the crash. Only bookkeeping
            # left: unlink the previous file if any.
            if (
                isinstance(previous_image_id, str)
                and previous_image_id != new_image.id
                and _is_image_safely_deletable(
                    previous_image_id,
                    tombstone_plant_id=plant.id,
                    plants=plants,
                    plant_updates=plant_updates,
                    pending_operations=pending_operations,
                    completed_ops=completed_ops,
                )
            ):
                await self._hass.async_add_executor_job(
                    delete_image_file, images_dir, previous_image_id
                )
            return True

        # Persist the advanced record before deleting anything it replaces.
        updated = plant.with_next_revision(image=new_image)
        plant_updates[plant.id] = updated
        return False

    async def _replay_image_delete(  # noqa: PLR0913
        self,
        op: PendingOperation,
        *,
        plant: PlantRecord | None,
        plants: dict[str, PlantRecord],
        plant_updates: dict[str, PlantRecord],
        pending_operations: tuple[PendingOperation, ...],
        completed_ops: set[str],
        images_dir: Any,
    ) -> bool:
        """
        Complete a stalled delete_image.

        Returns True when either the plant is gone or the record's image
        has been cleared and the previous file removed; otherwise leaves
        the op in place for the next replay pass.
        """
        previous_image_id = op.payload.get("previous_image_id") if op.payload else None
        if not isinstance(previous_image_id, str) or not previous_image_id:
            # Same defensive-parse guard as _replay_image_upsert: strict
            # load should have rejected this, but keep the op if the
            # payload cannot be interpreted rather than losing intent.
            return False
        if plant is not None and plant.image is not None:
            updated = plant.with_next_revision(image=None)
            plant_updates[plant.id] = updated
            return False
        if _is_image_safely_deletable(
            previous_image_id,
            tombstone_plant_id=op.plant_id,
            plants=plants,
            plant_updates=plant_updates,
            pending_operations=pending_operations,
            completed_ops=completed_ops,
        ):
            await self._hass.async_add_executor_job(
                delete_image_file, images_dir, previous_image_id
            )
        return True


def _delete_stale_tmp(images_dir: Any, older_than_seconds: float) -> int:
    return delete_stale_tmp_files(images_dir, older_than_seconds=older_than_seconds)


async def _async_flush_registry_store(registry: Any) -> None:
    """Persist a registry now and propagate HA Store's normally-swallowed errors."""
    store = registry._store  # noqa: SLF001
    data = {
        "version": store.version,
        "minor_version": store.minor_version,
        "key": store.key,
        "data": registry._data_to_save(),  # noqa: SLF001
    }
    async with store._write_lock:  # noqa: SLF001
        await store._async_write_data(data)  # noqa: SLF001


def _image_file_present(images_dir: Any, image_id: str) -> bool:
    from .images import _is_safe_image_id  # noqa: PLC0415

    if not _is_safe_image_id(image_id):
        return False
    return bool((images_dir / f"{image_id}.webp").is_file())


def _is_image_safely_deletable(  # noqa: PLR0913
    image_id: str,
    *,
    tombstone_plant_id: str,
    plants: dict[str, PlantRecord],
    plant_updates: dict[str, PlantRecord],
    pending_operations: tuple[PendingOperation, ...],
    completed_ops: set[str],
) -> bool:
    """
    Return True only when ``image_id`` is safe to unlink for a deletion.

    A tombstone-driven file removal must never destroy an image id that
    is still referenced by a live plant or by an in-flight pending op
    (which could otherwise resurface a "missing" image on the next
    startup pass). Cross-record validation catches a stale tombstone
    that names a shared or reused image id, and refuses to delete.
    """
    for plant_id, plant in plants.items():
        if plant_id == tombstone_plant_id:
            continue
        candidate = plant_updates.get(plant_id, plant)
        if candidate.image is not None and candidate.image.id == image_id:
            return False
    for plant_id, plant in plant_updates.items():
        if plant_id == tombstone_plant_id:
            continue
        if plant.image is not None and plant.image.id == image_id:
            return False
    for op in pending_operations:
        if op.op_id in completed_ops:
            continue
        if op.kind not in ("create_image", "replace_image"):
            continue
        payload = op.payload or {}
        new_image = payload.get("new_image")
        if isinstance(new_image, Mapping):
            candidate_id = new_image.get("id")
            if isinstance(candidate_id, str) and candidate_id == image_id:
                return False
    return True


def _referenced_image_ids(
    plants: dict[str, PlantRecord],
    plant_updates: dict[str, PlantRecord],
    pending_operations: tuple[PendingOperation, ...],
    completed_ops: set[str],
) -> set[str]:
    """
    Union of image ids that are still live and must not be reaped.

    Includes ids referenced by the pre-replay snapshot (with in-flight
    ``plant_updates`` overlaid), plus any new_image_id from a pending
    create/replace op that this replay pass did NOT complete — so an
    upload still in flight from another process is left alone.
    """
    referenced: set[str] = set()
    for plant_id, plant in plants.items():
        candidate = plant_updates.get(plant_id, plant)
        if candidate.image is not None:
            referenced.add(candidate.image.id)
    for plant in plant_updates.values():
        if plant.image is not None:
            referenced.add(plant.image.id)
    for op in pending_operations:
        if op.op_id in completed_ops:
            continue
        if op.kind not in ("create_image", "replace_image"):
            continue
        payload = op.payload or {}
        new_image = payload.get("new_image")
        if not isinstance(new_image, Mapping):
            continue
        new_id = new_image.get("id")
        if isinstance(new_id, str):
            referenced.add(new_id)
    return referenced
