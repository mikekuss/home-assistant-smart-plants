from __future__ import annotations

import asyncio
import contextlib
import contextvars
import hashlib
import inspect
import logging
import secrets
import time
from collections import OrderedDict
from collections.abc import Callable, Iterable, Mapping
from dataclasses import replace
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from homeassistant.core import callback, valid_entity_id

from .care import (
    MAX_CARE_EVENTS,
    CareEvent,
    care_summary,
    clean_note,
    ordered_events,
    parse_occurred_at,
    validate_payload,
)
from .events import (
    EventCallback,
    PlantAddedEvent,
    PlantDeletedEvent,
    PlantEvent,
    PlantLifecycleChangedEvent,
    PlantUpdatedEvent,
    Unsubscribe,
)
from .images import (
    delete_image_file,
    ensure_images_dir,
    get_images_dir,
    validate_and_reencode,
    write_image_file,
)
from .models import (
    InventorySnapshot,
    MoistureConfig,
    PendingOperation,
    PlantImage,
    PlantOperationKind,
    PlantPlacement,
    PlantRecord,
    PlantSpecies,
    SensorSource,
    Tombstone,
)
from .roles import require_role, role_definitions
from .storage import SmartPlantsStorageError, SmartPlantsStore, _utcnow_iso

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .device import SmartPlantsDeviceReconciler


_LOGGER = logging.getLogger(__name__)


_UNSET: Any = object()
_IN_DISPATCH: contextvars.ContextVar[bool] = contextvars.ContextVar(
    "smart_plants_in_dispatch", default=False
)


class _Subscription:
    """
    Token wrapping an event callback for identity-based unsubscribe.

    Two subscribers may share the same underlying callable — identity is
    tracked on the token so the unsubscribe returned by ``subscribe``
    removes exactly the subscription it minted.
    """

    __slots__ = ("callback",)

    def __init__(self, callback: EventCallback) -> None:
        self.callback = callback


_TAG_MAX_LEN = 60
_NAME_MAX_LEN = 200
_CATEGORY_MAX_LEN = 60
_AREA_ID_MAX_LEN = 200
WIZARD_MAX_DRAFTS = 64
WIZARD_MAX_AGE = 600
WIZARD_ID_LENGTH = 36
WIZARD_TOKEN_LENGTH = 43


class SmartPlantsManagerUnavailableError(RuntimeError):
    """Raised when a mutation is attempted on an unloaded manager."""


class SmartPlantsValidationError(ValueError):
    """Raised when a caller-supplied field fails server validation."""


class SmartPlantsPlantNotFoundError(LookupError):
    """Raised when a targeted plant id is not present in the inventory."""


class SmartPlantsRevisionConflictError(RuntimeError):
    """
    Raised when a caller's ``expected_revision`` is stale.

    Callers should re-read the plant and retry with the new revision if the
    intended change is still meaningful.
    """

    def __init__(self, plant_id: str, expected: int, actual: int) -> None:
        super().__init__(
            f"revision conflict for {plant_id}: expected {expected}, actual {actual}"
        )
        self.plant_id = plant_id
        self.expected = expected
        self.actual = actual


class SmartPlantsManager:
    def __init__(
        self,
        hass: HomeAssistant,
        *,
        reconciler: SmartPlantsDeviceReconciler | None = None,
    ) -> None:
        self._hass = hass
        self._store = SmartPlantsStore(hass)
        self._mutation_lock = asyncio.Lock()
        self._snapshot = InventorySnapshot.empty()
        self._loaded = False
        self._closing = False
        self._unavailable = False
        # ``reconciler`` is optional so that pure-storage tests can construct
        # a manager without a running device registry. When set (from
        # async_setup_entry with the config entry id), every plant-level
        # mutation is followed by an idempotent device reconciliation
        # bracketed by a typed PendingOperation for crash recovery.
        self._reconciler = reconciler
        # Ordered list of live event subscribers. A callback added later
        # is fired later, so a consumer can rely on prior subscribers
        # having observed the event before it runs. Unsubscribe uses the
        # object identity of the token returned to the subscriber so
        # duplicate callables can be tracked independently.
        self._subscribers: list[_Subscription] = []
        self._event_tail: asyncio.Future[None] | None = None
        self._event_tickets: dict[
            int, tuple[asyncio.Future[None] | None, asyncio.Future[None] | None]
        ] = {}
        self._event_tasks: set[asyncio.Task[Any]] = set()
        # Platform → plant_id → role → entity. Populated by SmartPlantsEntity
        # on ``async_added_to_hass`` and cleared on removal so lookups
        # never return a detached HA entity handle.
        self._entity_index: dict[str, dict[str, dict[str, Any]]] = {}
        # Phase 4 Cut 1: entity_registry rename/remove tracking. Populated
        # in ``async_load`` from HA's bus listener. The unsubscribe callable
        # is called in ``async_unload`` so a config-entry reload never
        # leaks a stale listener into the next runtime.
        self._unsub_registry: Callable[[], None] | None = None
        self._registry_subscribers: list[Callable[[], None]] = []
        self._registry_tasks: set[asyncio.Task[Any]] = set()
        # plant_id -> registered role -> controller. Role metadata owns
        # construction and configuration; adding a role never adds a manager map.
        self._controllers: dict[str, dict[str, Any]] = {}
        self._wizard_drafts: OrderedDict[str, float] = OrderedDict()

    def wizard_start(self) -> dict[str, Any]:
        """Reserve a bounded capability without writing inventory or registries."""
        self._raise_if_unavailable()
        draft_id, token = str(uuid4()), secrets.token_urlsafe(32)
        identity = self.wizard_identity(draft_id, token)
        self._expire_wizard_drafts()
        self._wizard_drafts[identity] = time.monotonic()
        while len(self._wizard_drafts) > WIZARD_MAX_DRAFTS:
            self._wizard_drafts.popitem(last=False)
        return {
            "draft_id": draft_id,
            "draft_token": token,
            "revision": 0,
            "expires_in": WIZARD_MAX_AGE,
        }

    @staticmethod
    def wizard_identity(draft_id: str, draft_token: str) -> str:
        """One-way durable identity; knowing a plant ID cannot forge its draft."""
        if (
            not isinstance(draft_id, str)
            or not isinstance(draft_token, str)
            or len(draft_id) != WIZARD_ID_LENGTH
            or len(draft_token) != WIZARD_TOKEN_LENGTH
        ):
            raise SmartPlantsValidationError("invalid draft credentials")
        return hashlib.sha256(
            f"smart_plants:wizard:v1:{draft_id}:{draft_token}".encode()
        ).hexdigest()

    def require_wizard_draft(self, draft_id: str, draft_token: str) -> str:
        self._raise_if_unavailable()
        identity = self.wizard_identity(draft_id, draft_token)
        self._expire_wizard_drafts()
        if identity not in self._wizard_drafts:
            raise SmartPlantsValidationError("draft is missing or expired")
        return identity

    def _expire_wizard_drafts(self) -> None:
        cutoff = time.monotonic() - WIZARD_MAX_AGE
        while self._wizard_drafts:
            identity, created = next(iter(self._wizard_drafts.items()))
            if created > cutoff:
                break
            self._wizard_drafts.pop(identity)

    @property
    def reconciler(self) -> SmartPlantsDeviceReconciler | None:
        return self._reconciler

    @property
    def mutation_lock(self) -> asyncio.Lock:
        return self._mutation_lock

    @property
    def snapshot(self) -> InventorySnapshot:
        return self._snapshot

    @property
    def available(self) -> bool:
        return self._loaded and not self._closing and not self._unavailable

    # --- Event subscription (Phase 3 Cut 1) ------------------------------

    def subscribe(self, callback: EventCallback) -> Unsubscribe:
        """
        Register ``callback`` for typed plant lifecycle events.

        Callbacks may be sync or async. The manager awaits async
        callbacks in subscription order and catches per-subscriber
        exceptions so one failing subscriber never blocks another
        from observing the same event.

        The returned callable removes exactly the subscription created
        by this call, even if the same callable is subscribed more than
        once — identity is tracked by the ``_Subscription`` token, not
        the underlying callback object.
        """
        subscription = _Subscription(callback)
        self._subscribers.append(subscription)

        def _unsubscribe() -> None:
            # Removing an already-removed subscription is a no-op so a
            # late unsubscribe call after ``async_unload`` cannot raise.
            with contextlib.suppress(ValueError):
                self._subscribers.remove(subscription)

        return _unsubscribe

    async def _dispatch_event(self, event: PlantEvent) -> None:
        task = asyncio.current_task()
        if task is not None:
            self._event_tasks.add(task)
        completion: asyncio.Future[None] | None = None
        token: contextvars.Token[bool] | None = None
        try:
            previous, completion = self._event_tickets.pop(id(event), (None, None))
            if previous is not None:
                await previous
            if self._closing or self._unavailable:
                return
            # Apply the event only when its ordered ticket is current. Doing
            # this before waiting can let an older concurrent dispatch roll a
            # controller backward after a newer commit has already synced it.
            self._sync_controllers_for(event)
            token = _IN_DISPATCH.set(True)
            await self._async_notify_subscribers(event)
        finally:
            if completion is not None and not completion.done():
                completion.set_result(None)
            if token is not None:
                _IN_DISPATCH.reset(token)
            if task is not None:
                self._event_tasks.discard(task)

    async def _async_notify_subscribers(self, event: PlantEvent) -> None:
        # Snapshot the subscriber list before iterating so an
        # unsubscribe from within a callback does not shift the loop.
        # A subscriber added during dispatch is intentionally NOT
        # notified for this event: it observed a lifecycle change it
        # was not yet listening for. This matches HA's own dispatcher
        # semantics.
        if not self._subscribers:
            return
        for subscription in list(self._subscribers):
            try:
                result = subscription.callback(event)
                if inspect.isawaitable(result):
                    await result
            except Exception:
                _LOGGER.exception(
                    "Smart Plants event subscriber raised for %s", event.kind
                )

    def _queue_event(self, event: PlantEvent) -> None:
        """Reserve top-level callback order while allowing callback reentrancy."""
        if _IN_DISPATCH.get():
            self._event_tickets[id(event)] = (None, None)
            return
        completion = self._hass.loop.create_future()
        self._event_tickets[id(event)] = (self._event_tail, completion)
        self._event_tail = completion

    def _prepare_event(self, event: PlantEvent) -> None:
        self._queue_event(event)

    # --- Entity index (Phase 3 Cut 1) ------------------------------------

    def register_entity(
        self, platform: str, plant_id: str, role: str, entity: Any
    ) -> None:
        """
        Record a live entity keyed by ``(platform, plant_id, role)``.

        Called from ``SmartPlantsEntity.async_added_to_hass``. Duplicate
        registration of the same triple is a programmer error and
        replaces the previous entry so a late race cannot pin a stale
        HA entity handle indefinitely.
        """
        by_plant = self._entity_index.setdefault(platform, {})
        by_role = by_plant.setdefault(plant_id, {})
        by_role[role] = entity

    def unregister_entity(
        self, platform: str, plant_id: str, role: str, entity: Any
    ) -> None:
        """Remove an index entry only when ``entity`` still owns that slot."""
        by_plant = self._entity_index.get(platform)
        if by_plant is None:
            return
        by_role = by_plant.get(plant_id)
        if by_role is None:
            return
        if by_role.get(role) is not entity:
            return
        by_role.pop(role)
        if not by_role:
            by_plant.pop(plant_id, None)
        if not by_plant:
            self._entity_index.pop(platform, None)

    def get_entity(self, platform: str, plant_id: str, role: str) -> Any | None:
        return self._entity_index.get(platform, {}).get(plant_id, {}).get(role)

    def entities_for_plant(self, plant_id: str) -> tuple[Any, ...]:
        collected: list[Any] = []
        for by_plant in self._entity_index.values():
            collected.extend(by_plant.get(plant_id, {}).values())
        return tuple(collected)

    def entities_for_plant_on_platform(
        self, platform: str, plant_id: str
    ) -> tuple[Any, ...]:
        return tuple(self._entity_index.get(platform, {}).get(plant_id, {}).values())

    async def async_load(self) -> None:
        """Load and start all manager resources as one transaction."""
        try:
            self._snapshot = await self._store.async_load()
            await self._async_canonicalize_registered_sources()
            self._start_registry_tracking()
            for plant in self._snapshot.plants.values():
                self._create_controllers(plant, start=plant.lifecycle_state == "active")
            self._loaded = True
        except BaseException:
            if self._unsub_registry is not None:
                self._unsub_registry()
                self._unsub_registry = None
            self._close_all_controllers()
            self._loaded = False
            raise

    def get_role_controller(self, plant_id: str, role: str) -> Any | None:
        """Return a controller only for a registered role."""
        require_role(role)
        return self._controllers.get(plant_id, {}).get(role)

    def get_moisture_controller(self, plant_id: str) -> Any | None:
        """Compatibility accessor for the Phase 4 entity contract."""
        return self.get_role_controller(plant_id, "moisture")

    def _create_controllers(self, plant: PlantRecord, *, start: bool) -> None:
        by_role = self._controllers.setdefault(plant.id, {})
        for definition in role_definitions():
            config = definition.config_for(plant)
            if config is None or not isinstance(config, definition.config_type):
                continue
            controller = definition.controller_factory(
                self._hass,
                plant.id,
                config,
                definition.measurement_adapter,
            )
            if definition.key == "moisture":
                set_care_events = getattr(controller, "set_care_events", None)
                if callable(set_care_events):
                    set_care_events(plant.care_events)
            by_role[definition.key] = controller
            if start:
                controller.start()

    def _close_all_controllers(self) -> None:
        for by_role in self._controllers.values():
            for controller in by_role.values():
                controller.close()
        self._controllers.clear()

    def _sync_controllers_for(self, event: PlantEvent) -> None:  # noqa: PLR0912
        """
        Update controllers to reflect ``event``.

        Runs on the event-dispatch path so entity listeners see a
        controller state that matches the plant record they will read
        immediately afterwards.
        """
        if isinstance(event, PlantAddedEvent):
            if event.plant.lifecycle_state != "active":
                return
            if event.plant.id in self._controllers:
                return
            self._create_controllers(event.plant, start=True)
        elif isinstance(event, PlantDeletedEvent):
            deleted = self._controllers.pop(event.plant_id, {})
            for controller in deleted.values():
                controller.close()
        elif isinstance(event, PlantLifecycleChangedEvent):
            existing = self._controllers.get(event.plant.id)
            if event.plant.lifecycle_state == "disabled":
                for controller in (existing or {}).values():
                    controller.stop()
            elif event.plant.lifecycle_state == "active":
                if existing is None:
                    self._create_controllers(event.plant, start=True)
                else:
                    for controller in existing.values():
                        controller.start()
        elif isinstance(event, PlantUpdatedEvent):
            existing = self._controllers.get(event.plant.id, {})
            moisture_controller = existing.get("moisture")
            if moisture_controller is not None and (
                event.previous.care_events != event.plant.care_events
            ):
                moisture_controller.set_care_events(event.plant.care_events)
            for definition in role_definitions():
                controller = existing.get(definition.key)
                previous = definition.config_for(event.previous)
                current = definition.config_for(event.plant)
                if controller is not None and previous != current:
                    controller.reconfigure(current)

    async def async_unload(self) -> None:
        # Close admission before waiting so queued mutations cannot overtake
        # unload and write through a stale manager reference.
        self._closing = True
        self._wizard_drafts.clear()
        if self._unsub_registry is not None:
            try:
                self._unsub_registry()
            except Exception:
                _LOGGER.exception("Smart Plants registry unsubscribe failed")
            self._unsub_registry = None
        # Wait for the durable portion of every already-admitted mutation.
        # Such a mutation may create/restart a controller and reserve an event
        # before releasing this lock, so resource teardown must happen later.
        async with self._mutation_lock:
            self._unavailable = True
            self._loaded = False

        tasks = list(self._registry_tasks)
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._registry_tasks.clear()
        # A process interruption may occur after a mutation reserves ordering
        # but before dispatch starts. Those tickets are not owned by an event
        # task and must not leave unload waiting on an impossible completion.
        for _previous, completion in self._event_tickets.values():
            if completion is not None and not completion.done():
                completion.set_result(None)
        event_tail = self._event_tail
        if event_tail is not None and not event_tail.done():
            await event_tail
        event_tasks = [
            task for task in self._event_tasks if task is not asyncio.current_task()
        ]
        if event_tasks:
            await asyncio.gather(*event_tasks, return_exceptions=True)
        # Detach controllers so their source-state subscriptions do not
        # outlive the unload; entity teardown then runs against a manager
        # that is already quiescent.
        try:
            self._close_all_controllers()
        except Exception:
            _LOGGER.exception("Smart Plants role controller close failed")
        self._event_tickets.clear()
        self._subscribers.clear()
        self._registry_subscribers.clear()
        self._entity_index.clear()

    # --- Phase 4 Cut 1: entity_registry rename/remove tracking ---------

    def _start_registry_tracking(self) -> None:
        """
        Subscribe to HA's entity_registry updated event.

        The listener translates entity_id renames into moisture-source
        record updates so a stored ``(registry_id, entity_id)`` pair keeps
        the current entity_id after a native HA edit. Registry removals
        preserve the assignment as-is (Cut 4 raises a repair issue).
        """
        from homeassistant.helpers.entity_registry import (  # noqa: PLC0415
            EVENT_ENTITY_REGISTRY_UPDATED,
        )

        if self._unsub_registry is not None:
            return

        def _schedule(event: Any) -> None:
            self._hass.loop.call_soon_threadsafe(self._create_registry_task, event)

        self._unsub_registry = self._hass.bus.async_listen(
            EVENT_ENTITY_REGISTRY_UPDATED, _schedule
        )

    @callback
    def _create_registry_task(self, event: Any) -> None:
        if self._closing or self._unavailable:
            return
        task = self._hass.async_create_task(self._async_handle_registry_event(event))
        self._registry_tasks.add(task)
        task.add_done_callback(self._registry_tasks.discard)

    async def _async_handle_registry_event(self, event: Any) -> None:
        data = getattr(event, "data", None) or {}
        events: tuple[PlantUpdatedEvent, ...] = ()
        try:
            async with self._mutation_lock:
                if self._closing or self._unavailable or not self._loaded:
                    return
                if data.get("action") == "update":
                    changes = data.get("changes") or {}
                    old_entity_id = changes.get("entity_id")
                    new_entity_id = data.get("entity_id")
                    registry_id = data.get("registry_entry_id")
                    if isinstance(new_entity_id, str) and not isinstance(
                        registry_id, str
                    ):
                        from homeassistant.helpers import (  # noqa: PLC0415
                            entity_registry as er,
                        )

                        entry = er.async_get(self._hass).async_get(new_entity_id)
                        registry_id = entry.id if entry is not None else None
                    if (
                        isinstance(old_entity_id, str)
                        and isinstance(new_entity_id, str)
                        and (isinstance(registry_id, str) or registry_id is None)
                    ):
                        events = await self._async_apply_registry_rename_locked(
                            registry_id=registry_id,
                            old_entity_id=old_entity_id,
                            new_entity_id=new_entity_id,
                        )
            for plant_event in events:
                await self._dispatch_event(plant_event)
        except Exception:
            _LOGGER.exception("Smart Plants failed to process entity registry event")
        for subscriber in list(self._registry_subscribers):
            try:
                subscriber()
            except Exception:
                _LOGGER.exception("Smart Plants registry subscriber raised")

    def subscribe_registry(self, callback_fn: Callable[[], None]) -> Unsubscribe:
        """Notify a loop-local consumer after any registry mutation settles."""
        self._registry_subscribers.append(callback_fn)

        def _unsubscribe() -> None:
            with contextlib.suppress(ValueError):
                self._registry_subscribers.remove(callback_fn)

        return _unsubscribe

    def subscribe_required(self, callback: EventCallback) -> Unsubscribe:
        """
        Register lifecycle work before ordinary observers.

        Callback failures are isolated because the mutation is already durable.
        Platform consumers must make their event handling idempotent and resync
        from a later event instead of reporting a false mutation failure.
        """
        subscription = _Subscription(callback)
        self._subscribers.insert(0, subscription)

        def _unsubscribe() -> None:
            with contextlib.suppress(ValueError):
                self._subscribers.remove(subscription)

        return _unsubscribe

    async def _async_apply_registry_rename(
        self,
        *,
        registry_id: str | None,
        old_entity_id: str,
        new_entity_id: str,
    ) -> None:
        """
        Update every stored moisture source whose id matches the rename.

        Matches by ``registry_id`` first (strongest guarantee), falling
        back to the previous ``entity_id`` for unregistered assignments.
        Preserves ``primary_entity_id`` when it pointed at the renamed
        source. Runs under the mutation lock so a concurrent user write
        cannot observe a partially-renamed record.
        """
        try:
            events: tuple[PlantUpdatedEvent, ...]
            async with self._mutation_lock:
                if self._closing or self._unavailable or not self._loaded:
                    return
                events = await self._async_apply_registry_rename_locked(
                    registry_id=registry_id,
                    old_entity_id=old_entity_id,
                    new_entity_id=new_entity_id,
                )
            for event in events:
                await self._dispatch_event(event)
        except SmartPlantsStorageError:
            _LOGGER.exception("Smart Plants failed to persist entity rename update")
        except Exception:
            _LOGGER.exception("Smart Plants failed to apply entity_registry rename")

    async def _async_apply_registry_rename_locked(
        self,
        *,
        registry_id: str | None,
        old_entity_id: str,
        new_entity_id: str,
    ) -> tuple[PlantUpdatedEvent, ...]:
        touched: dict[str, tuple[PlantRecord, PlantRecord]] = {}
        for plant in self._snapshot.plants.values():
            updated = _apply_rename_to_plant(
                plant,
                registry_id=registry_id,
                old_entity_id=old_entity_id,
                new_entity_id=new_entity_id,
            )
            if updated is not None:
                touched[plant.id] = (plant, updated)
        if not touched:
            return ()
        snapshot = self._snapshot
        for _previous, plant in touched.values():
            snapshot = snapshot.with_plant(plant)
        await self._async_publish(snapshot)
        events = tuple(
            PlantUpdatedEvent(kind="plant_updated", plant=updated, previous=previous)
            for previous, updated in touched.values()
        )
        for event in events:
            self._prepare_event(event)
        return events

    async def _async_canonicalize_registered_sources(self) -> None:
        from homeassistant.helpers import entity_registry as er  # noqa: PLC0415

        registry = er.async_get(self._hass)
        snapshot = self._snapshot
        changed = False
        for plant in self._snapshot.plants.values():
            updated = _canonicalize_plant_sources(plant, registry)
            if updated is not None:
                snapshot = snapshot.with_plant(updated)
                changed = True
        if changed:
            await self._async_publish(snapshot)

    def list_plants(self) -> tuple[PlantRecord, ...]:
        return tuple(self._snapshot.plants.values())

    def get_plant(self, plant_id: str) -> PlantRecord:
        plant_id = _validate_plant_id(plant_id)
        try:
            return self._snapshot.plants[plant_id]
        except KeyError as err:
            raise SmartPlantsPlantNotFoundError(plant_id) from err

    def care_history(self, plant_id: str) -> dict[str, Any]:
        self._raise_if_unavailable()
        plant = self.get_plant(plant_id)
        return {
            "revision": plant.revision,
            "events": [
                event.as_storage() for event in ordered_events(plant.care_events)
            ],
            "summary": care_summary(plant.care_events),
        }

    async def async_add_watering(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        occurred_at: str,
        note: str | None,
    ) -> tuple[PlantRecord, CareEvent]:
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            try:
                occurred = parse_occurred_at(occurred_at)
                cleaned_note = clean_note(note)
            except ValueError as err:
                raise SmartPlantsValidationError(str(err)) from err
            now = _utcnow_iso()
            if occurred.astimezone(UTC) > datetime.fromisoformat(now):
                raise SmartPlantsValidationError("care event cannot be in the future")
            if len(current.care_events) >= MAX_CARE_EVENTS:
                raise SmartPlantsValidationError("care history is full")
            event = CareEvent(
                id=str(uuid4()),
                occurred_at=occurred_at,
                local_date=occurred.date().isoformat(),
                created_at=now,
                updated_at=now,
                payload={"note": cleaned_note},
            )
            updated = current.with_next_revision(
                care_events=(*current.care_events, event)
            )
            await self._async_publish(self._snapshot.with_plant(updated))
            change = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(change)
        await self._dispatch_event(change)
        return updated, event

    async def async_add_care_event(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        kind: str,
        occurred_at: str,
        payload: Mapping[str, Any],
    ) -> tuple[PlantRecord, CareEvent]:
        """Validate and durably append any supported manual care event."""
        if kind == "watering":
            try:
                validate_payload(kind, dict(payload))
            except ValueError as err:
                raise SmartPlantsValidationError(str(err)) from err
            note = payload["note"]
            return await self.async_add_watering(
                plant_id,
                expected_revision=expected_revision,
                occurred_at=occurred_at,
                note=note,
            )
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            if len(current.care_events) >= MAX_CARE_EVENTS:
                raise SmartPlantsValidationError("care history is full")
            try:
                occurred = parse_occurred_at(occurred_at)
                now = _utcnow_iso()
                event = CareEvent.from_storage(
                    {
                        "schema_version": 1,
                        "id": str(uuid4()),
                        "kind": kind,
                        "provenance": "manual",
                        "occurred_at": occurred_at,
                        "local_date": occurred.date().isoformat(),
                        "created_at": now,
                        "updated_at": now,
                        "payload": dict(payload),
                    }
                )
            except ValueError as err:
                raise SmartPlantsValidationError(str(err)) from err
            if occurred.astimezone(UTC) > datetime.fromisoformat(now):
                raise SmartPlantsValidationError("care event cannot be in the future")
            updated = current.with_next_revision(
                care_events=(*current.care_events, event)
            )
            await self._async_publish(self._snapshot.with_plant(updated))
            change = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(change)
        await self._dispatch_event(change)
        return updated, event

    async def async_edit_care_event(  # noqa: PLR0913
        self,
        plant_id: str,
        *,
        expected_revision: int,
        event_id: str,
        kind: str,
        occurred_at: str,
        payload: Mapping[str, Any],
    ) -> tuple[PlantRecord, CareEvent]:
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            existing = next(
                (event for event in current.care_events if event.id == event_id), None
            )
            if existing is None:
                raise SmartPlantsValidationError("care event not found")
            try:
                occurred = parse_occurred_at(occurred_at)
                now = _utcnow_iso()
                edited = CareEvent.from_storage(
                    {
                        "schema_version": 1,
                        "id": existing.id,
                        "kind": kind,
                        "provenance": existing.provenance,
                        "occurred_at": occurred_at,
                        "local_date": occurred.date().isoformat(),
                        "created_at": existing.created_at,
                        "updated_at": now,
                        "payload": dict(payload),
                    }
                )
            except ValueError as err:
                raise SmartPlantsValidationError(str(err)) from err
            if occurred.astimezone(UTC) > datetime.fromisoformat(now):
                raise SmartPlantsValidationError("care event cannot be in the future")
            updated = current.with_next_revision(
                care_events=tuple(
                    edited if event.id == event_id else event
                    for event in current.care_events
                )
            )
            await self._async_publish(self._snapshot.with_plant(updated))
            change = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(change)
        await self._dispatch_event(change)
        return updated, edited

    async def async_delete_care_event(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        event_id: str,
    ) -> PlantRecord:
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            if not any(event.id == event_id for event in current.care_events):
                raise SmartPlantsValidationError("care event not found")
            updated = current.with_next_revision(
                care_events=tuple(
                    event for event in current.care_events if event.id != event_id
                )
            )
            await self._async_publish(self._snapshot.with_plant(updated))
            change = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(change)
        await self._dispatch_event(change)
        return updated

    async def async_create_plant(  # noqa: PLR0913
        self,
        *,
        name: str,
        acquired_at: str | None = None,
        species: PlantSpecies | None = None,
        placement: PlantPlacement | None = None,
        tags: Iterable[str] = (),
        category: str | None = None,
        area_id: str | None = None,
        _wizard: tuple[str, str] | None = None,
        _moisture: Mapping[str, Any] | None = None,
        _accepted_provider: bool = False,
    ) -> PlantRecord:
        # ``image`` is deliberately absent: image ids and metadata are
        # server-authored through the dedicated image endpoints
        # (``async_upsert_image`` / ``async_delete_image``) so a client
        # cannot forge or reuse another plant's image id via generic
        # plant CRUD.
        cleaned_name = _validate_name(name)
        cleaned_tags = _validate_tags(tags)
        cleaned_category = _validate_optional_short_string(
            category, "category", _CATEGORY_MAX_LEN
        )
        cleaned_acquired_at = _validate_optional_iso_timestamp(
            acquired_at, "acquired_at"
        )
        cleaned_area_id = _validate_optional_area_id(area_id)
        cleaned_species = _validate_species(species, allow_provider=_accepted_provider)
        cleaned_placement = _validate_placement(placement)

        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            identity = str(uuid4())
            if _wizard is not None:
                identity = self.require_wizard_draft(*_wizard)
            now = _utcnow_iso()
            plant = PlantRecord(
                id=identity,
                revision=1,
                name=cleaned_name,
                created_at=now,
                acquired_at=cleaned_acquired_at,
                species=cleaned_species,
                placement=cleaned_placement,
                tags=cleaned_tags,
                category=cleaned_category,
            )
            if _moisture is not None:
                plant = replace(
                    plant,
                    moisture=self._configure_moisture(
                        plant.moisture, _moisture, species=cleaned_species
                    ),
                )
            # Validate the complete record before the first durable intent.
            if _wizard is not None:
                plant = PlantRecord.from_storage(plant.as_storage(), require_roles=True)
            try:
                await self._async_apply_with_reconciliation(
                    target_snapshot=self._snapshot.with_plant(plant),
                    kind="create_plant",
                    plant_id=plant.id,
                    requested_at=now,
                    expected_revision=None,
                    area_id=cleaned_area_id,
                    side_effect=self._make_present_side_effect(plant, cleaned_area_id),
                )
            finally:
                if _wizard is not None and plant.id in self._snapshot.plants:
                    self._wizard_drafts.pop(plant.id, None)
            event = PlantAddedEvent(kind="plant_added", plant=plant)
            self._prepare_event(event)
        await self._dispatch_event(event)
        return plant

    async def async_update_plant(  # noqa: PLR0913
        self,
        plant_id: str,
        *,
        expected_revision: int,
        name: str = _UNSET,
        acquired_at: str | None = _UNSET,
        species: PlantSpecies | None = _UNSET,
        placement: PlantPlacement | None = _UNSET,
        tags: Iterable[str] = _UNSET,
        category: str | None = _UNSET,
    ) -> PlantRecord:
        # ``area_id`` is deliberately absent here: the device area is
        # authoritative on HA's registry once the device exists, so any
        # explicit change goes through ``async_set_plant_area``. Routine
        # updates never touch the area, which is what makes them safe to
        # replay without stomping a later native HA edit.
        # ``image`` is also deliberately absent: image ids and metadata
        # flow only through ``async_upsert_image`` / ``async_delete_image``
        # so client-controlled plant CRUD cannot forge, share, or wipe
        # an image record.
        changes: dict[str, Any] = {}
        if name is not _UNSET:
            changes["name"] = _validate_name(name)
        if acquired_at is not _UNSET:
            changes["acquired_at"] = _validate_optional_iso_timestamp(
                acquired_at, "acquired_at"
            )
        if species is not _UNSET:
            changes["species"] = _validate_species(species)
        if placement is not _UNSET:
            changes["placement"] = _validate_placement(placement)
        if tags is not _UNSET:
            changes["tags"] = _validate_tags(tags)
        if category is not _UNSET:
            changes["category"] = _validate_optional_short_string(
                category, "category", _CATEGORY_MAX_LEN
            )

        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            if not changes:
                # Nothing to change; skip the revision bump and disk write.
                return current
            updated = current.with_next_revision(**changes)
            await self._async_apply_with_reconciliation(
                target_snapshot=self._snapshot.with_plant(updated),
                kind="update_plant",
                plant_id=plant_id,
                requested_at=_utcnow_iso(),
                expected_revision=updated.revision,
                area_id=None,
                side_effect=self._make_present_side_effect(updated, None),
            )
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_set_plant_area(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        area_id: str | None,
    ) -> PlantRecord:
        """
        Explicitly set or clear the device area for ``plant_id``.

        This is the only path that ever writes ``area_id`` back to the HA
        device registry after the initial device creation. Routine
        reconciliation of ``create_plant`` / ``update_plant`` operations
        never touches ``area_id``, so a native HA edit made after the
        last explicit intent is preserved across restarts and replays.

        Set ``area_id=None`` to clear the area. Advances the plant's
        revision so the caller sees a fresh optimistic-concurrency token,
        and enforces ``expected_revision`` against the current record.
        """
        cleaned_area_id = _validate_optional_area_id(area_id)

        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            updated = current.with_next_revision()
            pending_op = PendingOperation(
                op_id=str(uuid4()),
                kind="update_area",
                plant_id=plant_id,
                requested_at=_utcnow_iso(),
                expected_revision=updated.revision,
                payload={"target_area_id": cleaned_area_id},
            )
            intent_snapshot = replace(
                self._snapshot.with_plant(updated),
                pending_operations=(
                    *self._snapshot.pending_operations,
                    pending_op,
                ),
            )
            await self._async_publish(intent_snapshot)

            if self._reconciler is not None:
                applied = await self._reconciler.async_apply_area(
                    plant_id, cleaned_area_id
                )
                if not applied:
                    await self._reconciler.async_reconcile_present(current)
                    applied = await self._reconciler.async_apply_area(
                        plant_id, cleaned_area_id
                    )
                if not applied:
                    raise RuntimeError("plant device could not be reconciled")

            cleared = tuple(
                op
                for op in self._snapshot.pending_operations
                if op.op_id != pending_op.op_id
            )
            cleared_snapshot = replace(self._snapshot, pending_operations=cleared)
            await self._async_publish(cleared_snapshot)
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    # --- Phase 4 Cut 1: moisture assignment mutations ---------------------

    def _configure_moisture(
        self,
        current: MoistureConfig,
        values: Mapping[str, Any],
        *,
        species: PlantSpecies | None = None,
    ) -> MoistureConfig:
        """Validate the final combination, never invalid intermediate thresholds."""
        from homeassistant.helpers import entity_registry as er  # noqa: PLC0415

        expected = {
            "sources",
            "primary_entity_id",
            "aggregation",
            "stale_after_seconds",
            "threshold_overrides",
        }
        if not isinstance(values, Mapping) or set(values) != expected:
            raise SmartPlantsValidationError(
                "moisture requires all configuration fields"
            )
        if not isinstance(values["sources"], (list, tuple)):
            raise SmartPlantsValidationError("moisture sources must be a list")
        defaults = current.as_storage()["threshold_defaults"]
        if species is not None and species.snapshot.source_status == "provider":
            definition = require_role("moisture")
            for threshold in definition.thresholds:
                value = species.snapshot.threshold_defaults.get("moisture", {}).get(
                    threshold.key
                )
                if value is not None:
                    defaults[threshold.key] = {
                        "value": value,
                        "source": "provider",
                        "provider": species.provider,
                        "provider_ref": species.snapshot.provider_ref,
                    }
        try:
            candidate = MoistureConfig.from_storage(
                {**values, "threshold_defaults": defaults}
            )
        except ValueError as err:
            raise SmartPlantsValidationError(str(err)) from err
        registry = er.async_get(self._hass)
        sources: list[SensorSource] = []
        for source in candidate.sources:
            if not valid_entity_id(source.entity_id) or not source.entity_id.startswith(
                "sensor."
            ):
                raise SmartPlantsValidationError(
                    "moisture source must be a sensor entity"
                )
            registered = registry.async_get(source.registry_id or source.entity_id)
            # A removed registry entry remains an assigned, repairable source.
            # Only the exact stored pair may survive a missing UUID lookup;
            # never resolve its entity_id to a replacement with a different UUID.
            if (
                source.registry_id is not None
                and registered is None
                and source in current.sources
            ):
                sources.append(source)
                continue
            if source.registry_id is not None and (
                registered is None or registered.entity_id != source.entity_id
            ):
                raise SmartPlantsValidationError(
                    "source registry identity does not match"
                )
            sources.append(
                SensorSource(registered.entity_id, registered.id)
                if registered is not None
                else source
            )
        return replace(candidate, sources=tuple(sources))

    async def async_configure_moisture(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        moisture: Mapping[str, Any],
    ) -> PlantRecord:
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            candidate = self._configure_moisture(current.moisture, moisture)
            if candidate == current.moisture:
                return current
            updated = current.with_next_revision(moisture=candidate)
            await self._async_publish(self._snapshot.with_plant(updated))
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_wizard_result(
        self, draft_id: str, draft_token: str
    ) -> PlantRecord | None:
        """Recover an admitted create, completing only its pending reconciliation."""
        identity = self.wizard_identity(draft_id, draft_token)
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            plant = self._snapshot.plants.get(identity)
            if plant is None:
                return None
            pending = tuple(
                op
                for op in self._snapshot.pending_operations
                if op.plant_id == identity and op.kind == "create_plant"
            )
            if not pending:
                return plant
            for op in pending:
                effect = self._make_present_side_effect(
                    plant, op.payload.get("area_id")
                )
                if effect is not None:
                    await effect()
            await self._async_publish(
                replace(
                    self._snapshot,
                    pending_operations=tuple(
                        op
                        for op in self._snapshot.pending_operations
                        if op not in pending
                    ),
                )
            )
            event = PlantAddedEvent(kind="plant_added", plant=plant)
            self._prepare_event(event)
        await self._dispatch_event(event)
        return plant

    async def async_set_moisture_sources(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        sources: Iterable[Mapping[str, Any]],
    ) -> PlantRecord:
        return await self.async_set_role_sources(
            plant_id,
            role="moisture",
            expected_revision=expected_revision,
            sources=sources,
        )

    async def async_set_role_sources(  # noqa: PLR0912, PLR0915
        self,
        plant_id: str,
        *,
        role: str,
        expected_revision: int,
        sources: Iterable[Mapping[str, Any]],
    ) -> PlantRecord:
        """
        Replace the source list for ``role`` on ``plant_id``.

        ``sources`` is an iterable of {'entity_id', 'registry_id'?} dicts.
        Sources are validated for uniqueness by entity_id and for shape.
        If the current ``primary_entity_id`` is no longer among the
        supplied sources, it is cleared silently: callers must set the
        primary explicitly via ``async_set_moisture_primary`` afterwards.
        """
        from homeassistant.helpers import entity_registry as er  # noqa: PLC0415

        try:
            definition = require_role(role)
        except ValueError as err:
            raise SmartPlantsValidationError(str(err)) from err
        if definition.replace_sources is None:
            raise SmartPlantsValidationError(f"role {role!r} does not accept sources")

        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            config = definition.config_for(current)
            if config is None:
                raise SmartPlantsValidationError(f"role {role!r} is not configured")
            registry = er.async_get(self._hass)
            missing_by_entity = {
                source.entity_id: source
                for source in config.sources
                if source.registry_id is not None
                and registry.async_get(source.registry_id) is None
            }
            parsed: list[SensorSource] = []
            seen_entity_ids: set[str] = set()
            seen_keys: set[str] = set()
            for src in sources:
                if not isinstance(src, Mapping):
                    raise SmartPlantsValidationError(f"{role} source must be an object")
                try:
                    source = SensorSource.from_storage(dict(src))
                except ValueError as err:
                    raise SmartPlantsValidationError(str(err)) from err
                if not valid_entity_id(
                    source.entity_id
                ) or not source.entity_id.startswith(f"{definition.source_domain}."):
                    raise SmartPlantsValidationError(
                        f"{role} source entity_id must be a valid "
                        f"{definition.source_domain} entity id"
                    )
                missing = missing_by_entity.get(source.entity_id)
                if missing is not None and source != missing:
                    raise SmartPlantsValidationError(
                        f"{role} missing source requires its assigned registry identity"
                    )
                if source.registry_id is not None:
                    by_uuid = registry.async_get(source.registry_id)
                    if by_uuid is None:
                        if source != missing:
                            raise SmartPlantsValidationError(
                                f"{role} source registry_id does not exist"
                            )
                    elif by_uuid.entity_id != source.entity_id:
                        raise SmartPlantsValidationError(
                            f"{role} source entity_id and registry_id do not match"
                        )
                    else:
                        source = SensorSource(by_uuid.entity_id, by_uuid.id)
                else:
                    by_entity = registry.async_get(source.entity_id)
                    if by_entity is not None:
                        source = SensorSource(by_entity.entity_id, by_entity.id)
                key = source.registry_id or source.entity_id
                if source.entity_id in seen_entity_ids or key in seen_keys:
                    raise SmartPlantsValidationError(
                        f"{role} sources must be unique by entity and registry id"
                    )
                seen_entity_ids.add(source.entity_id)
                seen_keys.add(key)
                parsed.append(source)
            new_primary = getattr(config, "primary_entity_id", None)
            if new_primary is not None and new_primary not in seen_entity_ids:
                new_primary = None
            new_config = definition.replace_sources(
                config,
                tuple(parsed),
                new_primary,
            )
            if new_config == config:
                return current
            updated = current.with_role_config(role, new_config).with_next_revision()
            await self._async_publish(self._snapshot.with_plant(updated))
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_set_moisture_primary(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        primary_entity_id: str | None,
    ) -> PlantRecord:
        return await self.async_set_role_primary(
            plant_id,
            role="moisture",
            expected_revision=expected_revision,
            primary_entity_id=primary_entity_id,
        )

    async def async_set_role_primary(
        self,
        plant_id: str,
        *,
        role: str,
        expected_revision: int,
        primary_entity_id: str | None,
    ) -> PlantRecord:
        """
        Select or clear the primary moisture source.

        ``primary_entity_id`` must reference an entity_id currently in the
        plant's source list, or be ``None`` to clear the selection.
        """
        try:
            definition = require_role(role)
        except ValueError as err:
            raise SmartPlantsValidationError(str(err)) from err
        if definition.replace_sources is None:
            raise SmartPlantsValidationError(f"role {role!r} does not accept sources")
        if primary_entity_id is not None and (
            not isinstance(primary_entity_id, str) or not primary_entity_id
        ):
            raise SmartPlantsValidationError(
                "primary_entity_id must be a non-empty string or null"
            )

        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            if primary_entity_id is not None:
                config = definition.config_for(current)
                source_ids = {s.entity_id for s in getattr(config, "sources", ())}
                if primary_entity_id not in source_ids:
                    raise SmartPlantsValidationError(
                        "primary_entity_id must reference an assigned source"
                    )
            config = definition.config_for(current)
            if getattr(config, "primary_entity_id", None) == primary_entity_id:
                return current
            new_config = definition.replace_sources(
                config,
                tuple(getattr(config, "sources", ())),
                primary_entity_id,
            )
            updated = current.with_role_config(role, new_config).with_next_revision()
            await self._async_publish(self._snapshot.with_plant(updated))
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_set_moisture_aggregation(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        aggregation: str,
    ) -> PlantRecord:
        return await self.async_set_role_aggregation(
            plant_id,
            role="moisture",
            expected_revision=expected_revision,
            aggregation=aggregation,
        )

    async def async_set_role_aggregation(
        self,
        plant_id: str,
        *,
        role: str,
        expected_revision: int,
        aggregation: str,
    ) -> PlantRecord:
        try:
            definition = require_role(role)
        except ValueError as err:
            raise SmartPlantsValidationError(str(err)) from err
        if definition.replace_aggregation is None:
            raise SmartPlantsValidationError(
                f"role {role!r} does not accept aggregation"
            )
        if aggregation not in definition.aggregations:
            raise SmartPlantsValidationError(
                f"{role} aggregation {aggregation!r} is not supported"
            )
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            config = definition.config_for(current)
            if getattr(config, "aggregation", None) == aggregation:
                return current
            new_config = definition.replace_aggregation(config, aggregation)
            updated = current.with_role_config(role, new_config).with_next_revision()
            await self._async_publish(self._snapshot.with_plant(updated))
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_set_stale_after(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        stale_after_seconds: int,
    ) -> PlantRecord:
        return await self.async_set_role_stale_after(
            plant_id,
            role="moisture",
            expected_revision=expected_revision,
            stale_after_seconds=stale_after_seconds,
        )

    async def async_set_role_stale_after(
        self,
        plant_id: str,
        *,
        role: str,
        expected_revision: int,
        stale_after_seconds: int,
    ) -> PlantRecord:
        try:
            definition = require_role(role)
        except ValueError as err:
            raise SmartPlantsValidationError(str(err)) from err
        if definition.replace_stale_after is None:
            raise SmartPlantsValidationError(
                f"role {role!r} does not accept staleness configuration"
            )
        stale_range = definition.stale_after_range
        if stale_range is None:
            raise SmartPlantsValidationError(f"role {role!r} has no staleness range")
        if (
            isinstance(stale_after_seconds, bool)
            or not isinstance(stale_after_seconds, int)
            or stale_after_seconds < stale_range[0]
            or stale_after_seconds > stale_range[1]
        ):
            raise SmartPlantsValidationError(
                "stale_after_seconds must be an integer within "
                f"[{stale_range[0]}, {stale_range[1]}]"
            )
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            config = definition.config_for(current)
            if getattr(config, "stale_after_seconds", None) == stale_after_seconds:
                return current
            new_config = definition.replace_stale_after(config, stale_after_seconds)
            updated = current.with_role_config(role, new_config).with_next_revision()
            await self._async_publish(self._snapshot.with_plant(updated))
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_set_moisture_thresholds(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        moisture_min: int | None,
        moisture_target: int | None,
        moisture_max: int | None,
    ) -> PlantRecord:
        """
        Atomically set the moisture thresholds.

        All three fields are validated together against the phase's
        ordering rule (0 < min < target < max < 100 with ``max - min >=
        4``) so a partial write can never leave the record in an
        inconsistent state.
        """
        return await self.async_set_role_threshold_overrides(
            plant_id,
            role="moisture",
            expected_revision=expected_revision,
            values={
                "min": moisture_min,
                "target": moisture_target,
                "max": moisture_max,
            },
        )

    async def async_set_role_threshold_overrides(
        self,
        plant_id: str,
        *,
        role: str,
        expected_revision: int,
        values: Mapping[str, object],
    ) -> PlantRecord:
        try:
            definition = require_role(role)
        except ValueError as err:
            raise SmartPlantsValidationError(str(err)) from err
        apply = definition.apply_threshold_overrides
        if apply is None:
            raise SmartPlantsValidationError(f"role {role!r} has no thresholds")
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            config = definition.config_for(current)
            try:
                candidate = apply(config, values)
            except ValueError as err:
                raise SmartPlantsValidationError(str(err)) from err
            if candidate == config:
                return current
            updated = current.with_role_config(role, candidate).with_next_revision()
            await self._async_publish(self._snapshot.with_plant(updated))
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_reconcile_moisture_threshold_defaults(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        defaults: Mapping[str, Any],
    ) -> PlantRecord:
        """Replace inherited evidence while preserving every local override."""
        return await self.async_reconcile_role_threshold_defaults(
            plant_id,
            role="moisture",
            expected_revision=expected_revision,
            defaults=defaults,
        )

    async def async_reconcile_role_threshold_defaults(
        self,
        plant_id: str,
        *,
        role: str,
        expected_revision: int,
        defaults: Mapping[str, object],
    ) -> PlantRecord:
        try:
            definition = require_role(role)
        except ValueError as err:
            raise SmartPlantsValidationError(str(err)) from err
        apply = definition.apply_threshold_defaults
        if apply is None:
            raise SmartPlantsValidationError(f"role {role!r} has no thresholds")
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            config = definition.config_for(current)
            try:
                candidate = apply(config, defaults)
            except ValueError as err:
                raise SmartPlantsValidationError(str(err)) from err
            if candidate == config:
                return current
            updated = current.with_role_config(role, candidate).with_next_revision()
            await self._async_publish(self._snapshot.with_plant(updated))
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_apply_species_snapshot(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        species: PlantSpecies,
    ) -> PlantRecord:
        """Atomically accept species evidence and compatible role defaults."""
        cleaned_species = _validate_species(species, allow_provider=True)
        if cleaned_species is None:
            raise SmartPlantsValidationError("species snapshot is required")
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            updated = current
            for definition in role_definitions():
                apply = definition.apply_threshold_defaults
                if apply is None:
                    continue
                supplied = cleaned_species.snapshot.threshold_defaults.get(
                    definition.key, {}
                )
                config = definition.config_for(updated)
                defaults = {
                    key: value.as_storage()
                    for key, value in getattr(config, "threshold_defaults", {}).items()
                }
                builtin_defaults = getattr(
                    definition.default_config(), "threshold_defaults", {}
                )
                for key, value in tuple(defaults.items()):
                    if value.get("source") != "provider":
                        continue
                    if key not in builtin_defaults:
                        raise SmartPlantsValidationError(
                            "provider default has no registered built-in replacement"
                        )
                    defaults[key] = builtin_defaults[key].as_storage()
                for key, value in supplied.items():
                    if key in defaults:
                        defaults[key] = {
                            "value": value,
                            "source": "provider",
                            "provider": cleaned_species.provider,
                            "provider_ref": cleaned_species.snapshot.provider_ref,
                        }
                try:
                    candidate = apply(config, defaults)
                except ValueError as err:
                    raise SmartPlantsValidationError(
                        "provider defaults conflict with the preserved local overrides"
                    ) from err
                updated = updated.with_role_config(definition.key, candidate)
            updated = updated.with_next_revision(species=cleaned_species)
            await self._async_publish(self._snapshot.with_plant(updated))
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_disable_plant(
        self, plant_id: str, *, expected_revision: int
    ) -> PlantRecord:
        return await self._async_set_lifecycle_state(
            plant_id, expected_revision=expected_revision, lifecycle_state="disabled"
        )

    async def async_reenable_plant(
        self, plant_id: str, *, expected_revision: int
    ) -> PlantRecord:
        return await self._async_set_lifecycle_state(
            plant_id, expected_revision=expected_revision, lifecycle_state="active"
        )

    async def async_delete_plant(
        self, plant_id: str, *, expected_revision: int
    ) -> None:
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            tombstone = Tombstone(
                plant_id=plant_id,
                deleted_at=_utcnow_iso(),
                payload={
                    "image_id": current.image.id if current.image else None,
                    "cleanup_phase": "pending",
                },
            )
            snapshot = self._snapshot.without_plant(plant_id)
            snapshot = replace(
                snapshot,
                tombstones=(*snapshot.tombstones, tombstone),
            )
            await self._async_publish(snapshot)
            event = PlantDeletedEvent(
                kind="plant_deleted", plant_id=plant_id, previous=current
            )
            self._prepare_event(event)
            # Emit the deletion event as soon as the plant is durably
            # absent from the live snapshot, before non-transactional
            # side effects (device removal, image unlink) run. Entity
            # listeners use this signal to detach themselves ahead of
            # the device removal Cut 3 will drive.
        await self._dispatch_event(event)
        if self.entities_for_plant(plant_id):
            raise RuntimeError("plant entities remain attached after deletion dispatch")

        async with self._mutation_lock:
            if self._closing or self._unavailable:
                return
            # Phase 2 (side effect) + phase 3 (drop tombstone) run only when
            # a reconciler is attached; tests without one leave the tombstone
            # in place to exercise the persistence contract.
            if self._reconciler is not None:
                known_plant_ids = {
                    *self._snapshot.plants,
                    *(item.plant_id for item in self._snapshot.tombstones),
                }
                await self._reconciler.async_reconcile_absent(
                    plant_id, known_plant_ids=known_plant_ids
                )
                if not self._reconciler.cleanup_complete(
                    plant_id, known_plant_ids=known_plant_ids
                ):
                    return
                persisted_tombstone = replace(
                    tombstone,
                    payload={
                        **dict(tombstone.payload),
                        "cleanup_phase": "registry_persisted",
                    },
                )
                phase_snapshot = replace(
                    self._snapshot,
                    revision=self._snapshot.revision + 1,
                    tombstones=tuple(
                        persisted_tombstone if item.plant_id == plant_id else item
                        for item in self._snapshot.tombstones
                    ),
                )
                await self._async_publish(phase_snapshot)
                await self._reconciler.async_reconcile_absent(
                    plant_id, known_plant_ids=known_plant_ids
                )
                if not self._reconciler.cleanup_complete(
                    plant_id, known_plant_ids=known_plant_ids
                ):
                    return
                # Image file cleanup MUST complete before the tombstone is
                # dropped: the tombstone is the only durable record that
                # authorizes deleting a shared/reused image id after cross-
                # record validation, so clearing it before the unlink would
                # leak the file until orphan cleanup finally reaped it.
                previous_image_id = (
                    current.image.id if current.image is not None else None
                )
                if previous_image_id is not None:
                    images_dir = await self._hass.async_add_executor_job(
                        get_images_dir, self._hass
                    )
                    if _is_image_still_referenced(
                        previous_image_id, self._snapshot, exclude_plant_id=plant_id
                    ):
                        # Shared id — leave the file alone; the tombstone
                        # can be cleared safely because another plant is
                        # authoritative for the same image.
                        pass
                    else:
                        await self._hass.async_add_executor_job(
                            delete_image_file, images_dir, previous_image_id
                        )
                remaining = tuple(
                    t for t in self._snapshot.tombstones if t.plant_id != plant_id
                )
                cleared = replace(self._snapshot, tombstones=remaining)
                await self._async_publish(cleared)

    async def _async_set_lifecycle_state(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        lifecycle_state: str,
    ) -> PlantRecord:
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            if current.lifecycle_state == lifecycle_state:
                return current
            updated = current.with_next_revision(lifecycle_state=lifecycle_state)
            await self._async_publish(self._snapshot.with_plant(updated))
            event = PlantLifecycleChangedEvent(
                kind="plant_lifecycle_changed",
                plant=updated,
                previous_state=current.lifecycle_state,
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_record_pending_operation(
        self, operation: PendingOperation
    ) -> InventorySnapshot:
        """
        Append a typed pending-operation record without touching plant state.

        Cut 2 uses this to persist intent before non-transactional device or
        area side effects. Kept on the manager (not the store) so the write
        goes through the mutation lock and the published snapshot flow.
        """
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            snapshot = replace(
                self._snapshot,
                revision=self._snapshot.revision + 1,
                pending_operations=(*self._snapshot.pending_operations, operation),
            )
            await self._async_publish(snapshot)
            return snapshot

    async def async_clear_pending_operation(self, op_id: str) -> InventorySnapshot:
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            remaining = tuple(
                op for op in self._snapshot.pending_operations if op.op_id != op_id
            )
            if len(remaining) == len(self._snapshot.pending_operations):
                return self._snapshot
            snapshot = replace(
                self._snapshot,
                revision=self._snapshot.revision + 1,
                pending_operations=remaining,
            )
            await self._async_publish(snapshot)
            return snapshot

    async def async_replay_pending(self) -> None:
        """
        Replay any pending operations and tombstones on startup.

        Called from ``async_setup_entry`` after the manager has loaded so
        an interrupted create/update/delete resumes idempotently. No-op
        when no reconciler is attached (pure-storage tests).
        """
        if self._reconciler is None:
            return
        while True:
            (
                completed_ops,
                completed_tombstones,
                plant_updates,
            ) = await self._reconciler.async_replay(
                plants=dict(self._snapshot.plants),
                pending_operations=self._snapshot.pending_operations,
                tombstones=self._snapshot.tombstones,
            )
            if not completed_ops and not completed_tombstones and not plant_updates:
                pending_cleanup = tuple(
                    tombstone
                    for tombstone in self._snapshot.tombstones
                    if tombstone.payload.get("cleanup_phase") == "pending"
                )
                if not pending_cleanup:
                    return
            else:
                pending_cleanup = tuple(
                    tombstone
                    for tombstone in self._snapshot.tombstones
                    if tombstone.payload.get("cleanup_phase") == "pending"
                )
            async with self._mutation_lock:
                self._raise_if_unavailable()
                remaining_ops = tuple(
                    op
                    for op in self._snapshot.pending_operations
                    if op.op_id not in completed_ops
                )
                remaining_tombstones = tuple(
                    replace(
                        t,
                        payload={
                            **dict(t.payload),
                            "cleanup_phase": "registry_persisted",
                        },
                    )
                    if t in pending_cleanup
                    else t
                    for t in self._snapshot.tombstones
                    if t.plant_id not in completed_tombstones
                )
                merged_plants = dict(self._snapshot.plants)
                for plant_id, plant in plant_updates.items():
                    if plant_id in merged_plants:
                        merged_plants[plant_id] = plant
                progressed = InventorySnapshot(
                    revision=self._snapshot.revision + 1,
                    plants=merged_plants,
                    pending_operations=remaining_ops,
                    tombstones=remaining_tombstones,
                )
                await self._async_publish(progressed)
            if not plant_updates and not pending_cleanup:
                return

    # --- Image lifecycle (Cut 4) -----------------------------------------

    async def async_upsert_image(
        self,
        plant_id: str,
        *,
        expected_revision: int,
        raw_bytes: bytes,
        declared_content_type: str,
    ) -> PlantRecord:
        """
        Attach a new image to ``plant_id``, replacing any existing one.

        Two-phase publish:

        1. Validate + re-encode the upload (CPU work, off the event loop).
        2. Publish the intent snapshot: pending op appended, plant record
           unchanged so a crash before the file is on disk rolls back.
        3. Write the WebP file atomically.
        4. Publish the target snapshot: plant.image points at the new
           record, revision bumps, pending op is cleared.
        5. Delete the previous file (orphan cleanup on crash).
        """
        processed = await self._hass.async_add_executor_job(
            validate_and_reencode, raw_bytes, declared_content_type
        )

        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            previous_image_id = current.image.id if current.image is not None else None
            kind: PlantOperationKind = (
                "replace_image" if previous_image_id is not None else "create_image"
            )
            new_image = PlantImage(
                id=processed.image_id,
                content_type=processed.content_type,
                width=processed.width,
                height=processed.height,
                created_at=_utcnow_iso(),
            )
            pending_op = PendingOperation(
                op_id=str(uuid4()),
                kind=kind,
                plant_id=plant_id,
                requested_at=_utcnow_iso(),
                expected_revision=current.revision,
                payload={
                    "new_image": new_image.as_storage(),
                    "previous_image_id": previous_image_id,
                },
            )
            intent_snapshot = replace(
                self._snapshot,
                revision=self._snapshot.revision + 1,
                pending_operations=(*self._snapshot.pending_operations, pending_op),
            )
            await self._async_publish(intent_snapshot)

            images_dir = await self._hass.async_add_executor_job(
                ensure_images_dir, self._hass
            )
            await self._hass.async_add_executor_job(
                write_image_file, images_dir, processed.image_id, processed.data
            )

            updated = current.with_next_revision(image=new_image)
            cleared_ops = tuple(
                op
                for op in self._snapshot.pending_operations
                if op.op_id != pending_op.op_id
            )
            target_snapshot = replace(
                self._snapshot.with_plant(updated),
                pending_operations=cleared_ops,
            )
            await self._async_publish(target_snapshot)

            if previous_image_id is not None and not _is_image_still_referenced(
                previous_image_id,
                self._snapshot,
                exclude_plant_id=plant_id,
            ):
                await self._hass.async_add_executor_job(
                    delete_image_file, images_dir, previous_image_id
                )
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_delete_image(
        self, plant_id: str, *, expected_revision: int
    ) -> PlantRecord:
        """
        Detach the image from ``plant_id`` and remove the file.

        Two-phase publish: intent (pending op only, record unchanged) →
        target (record clears image, op removed) → filesystem delete.
        A crash between any two steps is idempotently resolved by
        ``async_replay_pending`` on the next startup.
        """
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            current = self._require_plant(plant_id)
            self._require_expected_revision(current, expected_revision)
            if current.image is None:
                # Nothing to delete; return the current record without
                # touching disk or storage.
                return current
            previous_image_id = current.image.id
            pending_op = PendingOperation(
                op_id=str(uuid4()),
                kind="delete_image",
                plant_id=plant_id,
                requested_at=_utcnow_iso(),
                expected_revision=current.revision,
                payload={"previous_image_id": previous_image_id},
            )
            intent_snapshot = replace(
                self._snapshot,
                revision=self._snapshot.revision + 1,
                pending_operations=(*self._snapshot.pending_operations, pending_op),
            )
            await self._async_publish(intent_snapshot)

            updated = current.with_next_revision(image=None)
            cleared_ops = tuple(
                op
                for op in self._snapshot.pending_operations
                if op.op_id != pending_op.op_id
            )
            target_snapshot = replace(
                self._snapshot.with_plant(updated),
                pending_operations=cleared_ops,
            )
            await self._async_publish(target_snapshot)

            images_dir = await self._hass.async_add_executor_job(
                get_images_dir, self._hass
            )
            if not _is_image_still_referenced(
                previous_image_id,
                self._snapshot,
                exclude_plant_id=plant_id,
            ):
                await self._hass.async_add_executor_job(
                    delete_image_file, images_dir, previous_image_id
                )
            event = PlantUpdatedEvent(
                kind="plant_updated", plant=updated, previous=current
            )
            self._prepare_event(event)
        await self._dispatch_event(event)
        return updated

    async def async_create_internal_record(self, name: str) -> PlantRecord:
        """Back-compat shim for Phase 1A callers; forwards to async_create_plant."""
        return await self.async_create_plant(name=name)

    async def async_mutate_for_test(
        self, mutate: Callable[[InventorySnapshot], InventorySnapshot]
    ) -> InventorySnapshot:
        self._raise_if_unavailable()
        async with self._mutation_lock:
            self._raise_if_unavailable()
            snapshot = mutate(self._snapshot)
            await self._async_publish(snapshot)
            return snapshot

    def _require_plant(self, plant_id: str) -> PlantRecord:
        plant_id = _validate_plant_id(plant_id)
        try:
            return self._snapshot.plants[plant_id]
        except KeyError as err:
            raise SmartPlantsPlantNotFoundError(plant_id) from err

    @staticmethod
    def _require_expected_revision(current: PlantRecord, expected: int) -> None:
        if isinstance(expected, bool) or not isinstance(expected, int) or expected < 1:
            raise SmartPlantsValidationError(
                "expected_revision must be a positive integer"
            )
        if current.revision != expected:
            raise SmartPlantsRevisionConflictError(
                current.id, expected, current.revision
            )

    def _raise_if_unavailable(self) -> None:
        if self._closing or self._unavailable:
            raise SmartPlantsManagerUnavailableError(
                "Smart Plants manager is unloaded; mutation rejected"
            )

    def _make_present_side_effect(
        self, plant: PlantRecord, area_id: str | None
    ) -> Callable[[], Any] | None:
        if self._reconciler is None:
            return None
        reconciler = self._reconciler

        async def run() -> None:
            await reconciler.async_reconcile_present(plant, requested_area_id=area_id)

        return run

    async def _async_apply_with_reconciliation(  # noqa: PLR0913
        self,
        *,
        target_snapshot: InventorySnapshot,
        kind: str,
        plant_id: str,
        requested_at: str,
        expected_revision: int | None,
        area_id: str | None,
        side_effect: Callable[[], Any] | None,
    ) -> None:
        """
        Publish, run the side effect, and publish again with the op cleared.

        The two-phase publish keeps the storage snapshot durable across a
        crash: on restart, ``async_replay_pending`` re-drives any
        pending op or tombstone the reconciler had not yet resolved.

        When no reconciler is attached (tests without device wiring) the
        side effect is skipped and we never append the pending op, so
        pure-storage tests keep the single-write behavior they had before.
        """
        if side_effect is None:
            await self._async_publish(target_snapshot)
            return

        pending_op = PendingOperation(
            op_id=str(uuid4()),
            kind=kind,  # type: ignore[arg-type]
            plant_id=plant_id,
            requested_at=requested_at,
            expected_revision=expected_revision,
            payload={"area_id": area_id} if area_id is not None else {},
        )
        intent_snapshot = replace(
            target_snapshot,
            pending_operations=(
                *target_snapshot.pending_operations,
                pending_op,
            ),
        )
        await self._async_publish(intent_snapshot)
        await side_effect()
        # Clearing a completed pending op is bookkeeping, not a
        # user-observable plant-state change; keep the same revision so
        # callers do not have to invent a second synthetic edit.
        cleared = tuple(
            op
            for op in self._snapshot.pending_operations
            if op.op_id != pending_op.op_id
        )
        cleared_snapshot = replace(
            self._snapshot,
            pending_operations=cleared,
        )
        await self._async_publish(cleared_snapshot)

    async def _async_publish(self, snapshot: InventorySnapshot) -> None:
        # Only mark the mutation durable if the underlying Store write
        # returned without raising. HA Store.async_save propagates write
        # failures; keeping the assignment on the happy path ensures the
        # in-memory snapshot never advances past what is on disk.
        try:
            await self._store.async_save(snapshot)
        except SmartPlantsStorageError:
            raise
        except Exception as err:
            raise SmartPlantsStorageError(
                "Smart Plants failed to persist snapshot"
            ) from err
        self._snapshot = snapshot


def _validate_name(name: object) -> str:
    if not isinstance(name, str):
        raise SmartPlantsValidationError("plant name must be a string")
    cleaned = name.strip()
    if not cleaned:
        raise SmartPlantsValidationError("plant name must not be empty")
    if len(cleaned) > _NAME_MAX_LEN:
        raise SmartPlantsValidationError(
            f"plant name must be at most {_NAME_MAX_LEN} characters"
        )
    return cleaned


def _validate_tags(tags: object) -> tuple[str, ...]:
    if isinstance(tags, str) or not isinstance(tags, Iterable):
        raise SmartPlantsValidationError("plant tags must be an iterable of strings")
    cleaned: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        if not isinstance(tag, str):
            raise SmartPlantsValidationError("plant tags must be strings")
        value = tag.strip()
        if not value:
            raise SmartPlantsValidationError("plant tags must not be empty")
        if len(value) > _TAG_MAX_LEN:
            raise SmartPlantsValidationError(
                f"plant tag {value!r} exceeds {_TAG_MAX_LEN} characters"
            )
        if value in seen:
            raise SmartPlantsValidationError(f"duplicate plant tag {value!r}")
        seen.add(value)
        cleaned.append(value)
    return tuple(cleaned)


def _validate_optional_short_string(
    value: object, field_name: str, max_len: int
) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise SmartPlantsValidationError(f"plant {field_name} must be a string")
    cleaned = value.strip()
    if not cleaned:
        raise SmartPlantsValidationError(f"plant {field_name} must not be empty")
    if len(cleaned) > max_len:
        raise SmartPlantsValidationError(
            f"plant {field_name} must be at most {max_len} characters"
        )
    return cleaned


def _validate_optional_area_id(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise SmartPlantsValidationError("plant area_id must be a string")
    cleaned = value.strip()
    if not cleaned:
        raise SmartPlantsValidationError("plant area_id must not be empty")
    if len(cleaned) > _AREA_ID_MAX_LEN:
        raise SmartPlantsValidationError(
            f"plant area_id must be at most {_AREA_ID_MAX_LEN} characters"
        )
    return cleaned


def _validate_plant_id(value: object) -> str:
    if not isinstance(value, str):
        raise SmartPlantsValidationError("plant_id must be a string")
    if value != value.strip() or not value:
        raise SmartPlantsValidationError(
            "plant_id must be non-empty without surrounding whitespace"
        )
    if len(value) > _NAME_MAX_LEN:
        raise SmartPlantsValidationError(
            f"plant_id must be at most {_NAME_MAX_LEN} characters"
        )
    return value


def _validate_species(
    value: object, *, allow_provider: bool = False
) -> PlantSpecies | None:
    if value is None:
        return None
    if not isinstance(value, PlantSpecies):
        raise SmartPlantsValidationError("plant species must be a PlantSpecies")
    if value.snapshot.source_status == "provider" and not allow_provider:
        raise SmartPlantsValidationError(
            "provider species must be accepted through the preview workflow"
        )
    try:
        return PlantSpecies.from_storage(value.as_storage())
    except ValueError as err:
        raise SmartPlantsValidationError(str(err)) from err


def _validate_placement(value: object) -> PlantPlacement | None:
    if value is None:
        return None
    if not isinstance(value, PlantPlacement):
        raise SmartPlantsValidationError("plant placement must be a PlantPlacement")
    try:
        return PlantPlacement.from_storage(value.as_storage())
    except ValueError as err:
        raise SmartPlantsValidationError(str(err)) from err


def _apply_rename_to_plant(
    plant: PlantRecord,
    *,
    registry_id: str | None,
    old_entity_id: str,
    new_entity_id: str,
) -> PlantRecord | None:
    """
    Return an updated PlantRecord if the rename touched any moisture source.

    A registered source matches by ``registry_id`` (strongest guarantee).
    An unregistered source (``registry_id is None`` on the stored record)
    matches only when ``old_entity_id`` matches the stored entity_id, per
    the documented weaker guarantee. Returns ``None`` when nothing on the
    plant needs to change so the manager can skip a wasted publish.
    """
    updated = plant
    changed_any = False
    for definition in role_definitions():
        config = definition.config_for(updated)
        sources = getattr(config, "sources", None)
        primary_entity_id = getattr(config, "primary_entity_id", None)
        if sources is None:
            continue
        primary_source = next(
            (source for source in sources if source.entity_id == primary_entity_id),
            None,
        )
        primary_key = (
            primary_source.registry_id or primary_source.entity_id
            if primary_source is not None
            else None
        )
        changed = False
        new_sources: list[SensorSource] = []
        matched_registry_id: str | None = None
        for source in sources:
            matches = (
                registry_id is not None and source.registry_id == registry_id
            ) or (
                source.registry_id is None
                and registry_id is None
                and source.entity_id == old_entity_id
            )
            if matches and source.entity_id != new_entity_id:
                new_sources.append(replace(source, entity_id=new_entity_id))
                matched_registry_id = source.registry_id
                changed = True
            else:
                new_sources.append(source)
        if not changed:
            continue
        if matched_registry_id is not None:
            # The registry UUID owns its canonical destination. A weaker
            # entity-id-only assignment at that destination is removed rather
            # than leaving duplicate IDs or following the renamed UUID at its
            # stale old ID.
            new_sources = [
                source
                for source in new_sources
                if source.entity_id != new_entity_id
                or source.registry_id == matched_registry_id
            ]
        if primary_key is not None:
            primary_entity_id = next(
                (
                    source.entity_id
                    for source in new_sources
                    if (source.registry_id or source.entity_id) == primary_key
                ),
                None,
            )
        updated = updated.with_role_config(
            definition.key,
            definition.replace_sources(config, tuple(new_sources), primary_entity_id)
            if definition.replace_sources is not None
            else config,
        )
        changed_any = True
    return updated.with_next_revision() if changed_any else None


def _canonicalize_plant_sources(
    plant: PlantRecord, registry: Any
) -> PlantRecord | None:
    """Canonicalize UUID-backed IDs without corrupting collision cases."""
    updated = plant
    changed_any = False
    for definition in role_definitions():
        config = definition.config_for(updated)
        configured_sources = getattr(config, "sources", None)
        if configured_sources is None:
            continue
        primary = next(
            (
                source
                for source in configured_sources
                if source.entity_id == getattr(config, "primary_entity_id", None)
            ),
            None,
        )
        primary_key = primary.registry_id or primary.entity_id if primary else None
        sources: list[SensorSource] = []
        resolved: list[bool] = []
        changed = False
        for source in configured_sources:
            entry = (
                registry.async_get(source.registry_id) if source.registry_id else None
            )
            canonical = (
                SensorSource(entity_id=entry.entity_id, registry_id=entry.id)
                if entry is not None
                else source
            )
            changed |= canonical != source
            sources.append(canonical)
            resolved.append(entry is not None)
        if not changed:
            continue
        deduplicated: list[SensorSource] = []
        deduplicated_resolved: list[bool] = []
        for source, is_resolved in zip(sources, resolved, strict=True):
            collision = next(
                (
                    index
                    for index, existing in enumerate(deduplicated)
                    if existing.entity_id == source.entity_id
                ),
                None,
            )
            if collision is None:
                deduplicated.append(source)
                deduplicated_resolved.append(is_resolved)
            elif is_resolved and not deduplicated_resolved[collision]:
                deduplicated[collision] = source
                deduplicated_resolved[collision] = True
        sources = deduplicated
        primary_entity_id = next(
            (
                source.entity_id
                for source in sources
                if (source.registry_id or source.entity_id) == primary_key
            ),
            None,
        )
        updated = updated.with_role_config(
            definition.key,
            definition.replace_sources(config, tuple(sources), primary_entity_id)
            if definition.replace_sources is not None
            else config,
        )
        changed_any = True
    return updated.with_next_revision() if changed_any else None


def _is_image_still_referenced(
    image_id: str,
    snapshot: InventorySnapshot,
    *,
    exclude_plant_id: str,
) -> bool:
    """
    Return True if a live plant other than ``exclude_plant_id`` still
    holds ``image_id`` on its record.

    Used at delete time so a shared/reused image id — which the
    reconciler's cross-record validation would also refuse to unlink —
    survives here on the happy path too.
    """  # noqa: D205
    for other_id, other in snapshot.plants.items():
        if other_id == exclude_plant_id:
            continue
        if other.image is not None and other.image.id == image_id:
            return True
    for operation in snapshot.pending_operations:
        if operation.plant_id == exclude_plant_id:
            continue
        if operation.kind not in ("create_image", "replace_image"):
            continue
        new_image = operation.payload.get("new_image")
        if isinstance(new_image, Mapping) and new_image.get("id") == image_id:
            return True
    return False


_TIMESTAMP_MAX_LEN = 64


def _validate_optional_iso_timestamp(value: object, field_name: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or not value:
        raise SmartPlantsValidationError(f"plant {field_name} must be a string")
    if len(value) > _TIMESTAMP_MAX_LEN:
        raise SmartPlantsValidationError(
            f"plant {field_name} must be at most {_TIMESTAMP_MAX_LEN} characters"
        )
    # Reject anything ``datetime.fromisoformat`` can't parse: this catches
    # arbitrary strings the frontend might send by mistake (localized
    # date-picker output, "today", numeric epoch strings) before the value
    # is persisted and read back by every consumer that assumes an ISO
    # 8601 shape. Python 3.11+ accepts the trailing ``Z`` designator
    # natively so no normalization is needed here.
    try:
        datetime.fromisoformat(value)
    except ValueError as err:
        raise SmartPlantsValidationError(
            f"plant {field_name} must be an ISO 8601 timestamp"
        ) from err
    return value
