"""
Shared Smart Plants entity infrastructure (Phase 3).

This module owns the pieces every Smart Plants platform (sensor,
binary_sensor, number) needs so the platform files stay tiny and
lifecycle rules do not drift between them:

- ``SmartPlantsEntity``: base ``Entity`` that carries a stable
  unique id, translated name, plant-scoped ``DeviceInfo``, and
  availability tied to ``PlantRecord.lifecycle_state``. Registers
  itself in the manager's entity index while attached, subscribes
  to manager events so re-renders happen without polling, and
  detaches cleanly on removal.

- ``SmartPlantsPlatformLifecycle``: shared setup helper each platform
  drives. It adds entities for plants that already exist at setup
  time, subscribes to ``PlantAddedEvent`` so future plants get their
  entities exactly once, and tears down its subscription on entry
  unload. Cut 1 ships with empty factory tables so no meaningless
  production entities land on users; tests and future cuts add real
  factories.
"""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import Callable, Iterable
from typing import TYPE_CHECKING

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from .const import DOMAIN
from .events import (
    PlantDeletedEvent,
    PlantEvent,
    PlantLifecycleChangedEvent,
    PlantUpdatedEvent,
)
from .roles import entity_gating

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import (
        AddEntitiesCallback,
        EntityPlatform,
    )

    from .manager import SmartPlantsManager
    from .models import PlantRecord


# A factory receives (manager, plant) and returns a fully-constructed
# entity ready to be handed to ``async_add_entities``. Factories must
# not perform I/O; they are called synchronously during platform setup
# and event dispatch.
EntityFactory = Callable[["SmartPlantsManager", "PlantRecord"], "SmartPlantsEntity"]


class SmartPlantsEntity(Entity):
    """
    Base class for every Smart Plants platform entity.

    Subclasses only need to supply a translation key and, later, the
    role-specific state properties (``native_value``, ``is_on``, …).
    All lifecycle plumbing — registry unique id, device linkage,
    availability, event handling, index membership — is owned here so
    each platform file stays a small factory table plus a tiny
    ``async_setup_entry``.
    """

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(
        self,
        manager: SmartPlantsManager,
        plant_id: str,
        role: str,
        translation_key: str,
    ) -> None:
        self._manager = manager
        self._plant_id = plant_id
        self._role = role
        # Unique ids are keyed on the immutable plant id, not the
        # user-visible name, so history linkage survives every rename.
        # The ``smart_plants:`` prefix keeps the id namespace legible in
        # the entity registry and reserved for us.
        self._attr_unique_id = f"{DOMAIN}:{plant_id}:{role}"
        self._attr_translation_key = translation_key
        self._unsub_manager: Callable[[], None] | None = None
        # Platform key used for index registration. Set in
        # ``async_added_to_hass`` from the platform HA gives us so we
        # do not fight the parent Entity attribute mangling.
        self._registered_platform: str | None = None

    @property
    def plant_id(self) -> str:
        return self._plant_id

    @property
    def role(self) -> str:
        return self._role

    @property
    def device_info(self) -> DeviceInfo:
        # The device_registry entry is owned by
        # ``SmartPlantsDeviceReconciler``; here we only advertise the
        # matching identifier so HA links the entity to the same device.
        # We deliberately do NOT set ``name``, ``manufacturer``, ``model``
        # or ``entry_type`` — the reconciler wrote them once and any
        # subsequent user edit on the device page must not be
        # overwritten as a side effect of re-adding an entity.
        return DeviceInfo(identifiers={(DOMAIN, self._plant_id)})

    @property
    def available(self) -> bool:
        # Availability follows two things: the manager must still hold
        # the plant, and the plant must be ``active``. A disabled plant
        # keeps its registry entries but its entities read unavailable,
        # matching the Phase 3 lifecycle rules.
        plant = self._manager.snapshot.plants.get(self._plant_id)
        if plant is None:
            return False
        return plant.lifecycle_state == "active"

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        # ``self.platform`` is set by HA before ``async_added_to_hass``
        # runs, so it is safe to key the index on its domain here.
        # Falling back to the class-supplied ``_role`` platform hint
        # only fires in test setups that bypass EntityPlatform.
        platform_domain = self._platform_domain()
        self._registered_platform = platform_domain
        self._manager.register_entity(platform_domain, self._plant_id, self._role, self)
        self._unsub_manager = self._manager.subscribe_required(
            self._handle_manager_event
        )

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub_manager is not None:
            self._unsub_manager()
            self._unsub_manager = None
        if self._registered_platform is not None:
            self._manager.unregister_entity(
                self._registered_platform, self._plant_id, self._role, self
            )
            self._registered_platform = None
        await super().async_will_remove_from_hass()

    def _platform_domain(self) -> str:
        platform = getattr(self, "platform", None)
        if platform is not None:
            domain = getattr(platform, "domain", None)
            if isinstance(domain, str) and domain:
                return domain
        # ``PLATFORM`` is set on each platform's base subclass so tests
        # that construct entities without a live EntityPlatform still
        # land in the correct index bucket.
        fallback = getattr(self, "PLATFORM", None)
        if isinstance(fallback, str) and fallback:
            return fallback
        # Last-resort fallback: use ``smart_plants`` so a mis-configured
        # entity is at least indexed under a stable well-known key.
        return DOMAIN

    def _handle_manager_event(self, event: PlantEvent) -> None:
        # Only react to events for our own plant. Availability may
        # change after a lifecycle event; user-visible state may change
        # after an update. A deletion tears the entity down via the
        # platform lifecycle helper, so we do not fabricate a state
        # write here for a plant that is already gone.
        if isinstance(event, PlantDeletedEvent):
            return
        if event.plant.id != self._plant_id:
            return
        if isinstance(event, PlantLifecycleChangedEvent):
            # Give subclasses a hook to pause/resume Phase 4 source
            # subscriptions in lockstep with availability. The base
            # implementations are no-ops so a plain Cut 1 entity still
            # works.
            if event.plant.lifecycle_state == "disabled":
                self._on_plant_disabled()
            elif event.plant.lifecycle_state == "active":
                self._on_plant_reenabled()
        if isinstance(event, (PlantUpdatedEvent, PlantLifecycleChangedEvent)):
            # ``async_write_ha_state`` is a no-op before
            # ``async_added_to_hass`` completes; the HA runtime guards
            # that internally, so a stray subscription callback that
            # fires during teardown does not raise.
            self.async_write_ha_state()

    def _on_plant_disabled(self) -> None:
        """
        Pause source subscriptions in subclasses.

        Default implementation is a no-op. Phase 4 entities that hold
        source-state or interval subscriptions override this to detach
        without deleting their registry entry.
        """

    def _on_plant_reenabled(self) -> None:
        """
        Resume source subscriptions in subclasses.

        Default implementation is a no-op. Phase 4 entities re-attach
        their source-state listeners here so a re-enable does not
        create duplicate subscriptions.
        """


class SmartPlantsPlatformLifecycle:
    """
    Shared lifecycle machinery for a single Smart Plants platform.

    A platform ``async_setup_entry`` builds one of these, passing the
    role → factory table it owns. Cut 1 platform tables are empty by
    design (no meaningful production entities yet); Cut 2 wires the
    dynamic-add hook so plants created after setup receive their
    entities exactly once, and Cut 3 handles deletion cleanup.
    """

    def __init__(  # noqa: PLR0913 — every field is a distinct HA dependency
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        manager: SmartPlantsManager,
        platform: str,
        factories: dict[str, EntityFactory],
        async_add_entities: AddEntitiesCallback,
    ) -> None:
        self._hass = hass
        self._entry = entry
        self._manager = manager
        self._platform = platform
        self._factories = factories
        # entity_role -> (config_role_key, always_present) for the lifecycle gate.
        self._gating = entity_gating(platform)
        self._async_add_entities = async_add_entities
        # Track which (plant_id, role) pairs we have handed to HA so a
        # duplicate ``PlantAddedEvent`` (from a replay or a test that
        # emits the event twice) does not add a second copy.
        self._added: set[tuple[str, str]] = set()
        self._unsub_manager: Callable[[], None] | None = None
        self._owner: EntityPlatform | None = None
        self._operation_lock = asyncio.Lock()
        self._closing = False

    @property
    def platform(self) -> str:
        return self._platform

    @property
    def is_attached(self) -> bool:
        """Return whether HA still owns this exact entity platform instance."""
        if self._owner is None:
            return False
        from homeassistant.helpers.entity_platform import (  # noqa: PLC0415
            async_get_platforms,
        )

        return self._owner in async_get_platforms(self._hass, DOMAIN)

    async def async_setup(self) -> None:
        from homeassistant.helpers.entity_platform import (  # noqa: PLC0415
            async_get_current_platform,
        )

        with contextlib.suppress(RuntimeError):
            self._owner = async_get_current_platform()
        # Add entities for every plant that exists at setup time.
        initial = list(self._manager.snapshot.plants.values())
        entities = self._build_new_entities_for_plants(initial)
        if entities:
            await self._async_add(entities)
        self._unsub_manager = self._manager.subscribe_required(
            self._handle_manager_event
        )

    async def async_unload(self) -> None:
        self._closing = True
        if self._unsub_manager is not None:
            self._unsub_manager()
            self._unsub_manager = None
        # The entities themselves are unregistered by HA via
        # ``async_will_remove_from_hass``; clear the local dedupe set
        # so a subsequent reload starts fresh without leaking a stale
        # "already added" claim.
        async with self._operation_lock:
            self._added.clear()
            self._owner = None

    async def _handle_manager_event(self, event: PlantEvent) -> None:
        async with self._operation_lock:
            if self._closing:
                return
            if isinstance(event, PlantDeletedEvent):
                # Runtime removal must finish before registry cleanup starts.
                await self._async_remove_plant_entities(event.plant_id)
                self._forget_plant(event.plant_id)
                return
            # Every non-delete event is also a deterministic resync point. If
            # an earlier platform callback failed, its dedupe claims were
            # rolled back and the missing entities are retried here.
            entities = self._build_new_entities_for_plants(
                self._manager.snapshot.plants.values()
            )
            if entities:
                try:
                    await self._async_add(entities)
                except Exception:
                    for entity in entities:
                        self._added.discard((entity.plant_id, entity.role))
                    raise

    async def _async_add(self, entities: list[SmartPlantsEntity]) -> None:
        if self._closing:
            return
        if self._owner is not None:
            await self._owner.async_add_entities(entities)
            return
        self._async_add_entities(entities)

    async def _async_remove_plant_entities(self, plant_id: str) -> None:
        # Ask the manager for the entities it currently indexes under
        # our platform; the index is only populated while an entity is
        # attached to HA, so this is exactly the set to detach.
        entities = self._manager.entities_for_plant_on_platform(
            self._platform, plant_id
        )
        for entity in entities:
            remove = getattr(entity, "async_remove", None)
            if remove is None:
                continue
            await remove()

    def _build_new_entities_for_plants(
        self, plants: Iterable[PlantRecord]
    ) -> list[SmartPlantsEntity]:
        built: list[SmartPlantsEntity] = []
        for plant in plants:
            for role, factory in self._factories.items():
                key = (plant.id, role)
                if key in self._added:
                    continue
                if not self._should_create(plant, role):
                    continue
                entity = factory(self._manager, plant)
                self._added.add(key)
                built.append(entity)
        return built

    def _should_create(self, plant: PlantRecord, entity_role: str) -> bool:
        """
        Decide whether ``plant``'s ``entity_role`` entity should exist now.

        Moisture (always_present) entities are always created. A Phase 7 role's
        entities are created once the role has had a source; they are kept after
        sources are removed because the registry entry (and thus history and
        customizations) already exists.
        """
        config_role, always_present = self._gating.get(entity_role, (entity_role, True))
        if always_present:
            return True
        config = self._manager.snapshot.plants.get(plant.id)
        if config is not None and self._role_has_sources(config, config_role):
            return True
        # Keep-after-removal: recreate an entity that already exists in the
        # registry even if its role currently has no sources.
        from homeassistant.helpers import entity_registry as er  # noqa: PLC0415

        registry = er.async_get(self._hass)
        unique_id = f"{DOMAIN}:{plant.id}:{entity_role}"
        existing = registry.async_get_entity_id(self._platform, DOMAIN, unique_id)
        return existing is not None

    @staticmethod
    def _role_has_sources(plant: PlantRecord, config_role: str) -> bool:
        from .roles import require_role  # noqa: PLC0415

        try:
            definition = require_role(config_role)
        except ValueError:
            return False
        config = definition.config_for(plant)
        return bool(getattr(config, "sources", ()))

    def _forget_plant(self, plant_id: str) -> None:
        for key in [k for k in self._added if k[0] == plant_id]:
            self._added.discard(key)


async def async_setup_platform_lifecycle(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
    platform: str,
    factories: dict[str, EntityFactory],
) -> SmartPlantsPlatformLifecycle:
    """
    Wire ``platform``'s lifecycle helper into ``entry``.

    Called from every platform's ``async_setup_entry``. Returns the
    lifecycle helper so callers (and tests) can inspect it if they
    need to. Registers the ``async_unload`` callback on the config
    entry so a normal reload tears down subscriptions without leaving
    entity indexes in a stale state.
    """
    runtime_data = entry.runtime_data
    manager: SmartPlantsManager = runtime_data.manager
    lifecycle = SmartPlantsPlatformLifecycle(
        hass, entry, manager, platform, factories, async_add_entities
    )
    await lifecycle.async_setup()
    previous = runtime_data.platform_lifecycles.get(platform)
    if previous is not None:
        await lifecycle.async_unload()
        raise RuntimeError(f"Smart Plants {platform} lifecycle already exists")
    runtime_data.platform_lifecycles[platform] = lifecycle
    return lifecycle
