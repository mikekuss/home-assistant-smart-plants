"""
Entity lifecycle and state helpers for plant care tasks.

Care task entities differ from the role entities in ``entity.py``: a plant
has a variable number of tasks, so its entities are keyed by task id rather
than by a fixed role table. Each platform that exposes care entities builds
one ``CareEntityLifecycle`` with:

- task factories, called once per care task (the per-task "due" binary
  sensor and the "next due" sensor);
- plant factories, called once per plant that has at least one task (the
  plant-wide "care due" binary sensor).

The lifecycle adds entities when tasks appear, removes the runtime entity
and its entity registry entry when a task (or the last task) is deleted, and
refreshes every care entity just after local midnight and whenever the Home
Assistant time zone changes, because "due" depends on today's date.

Unique ids use the task id, never its name or type, so renaming a task or
changing its schedule keeps the same entities and their history.
"""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import Callable, Iterable, Mapping
from datetime import date, tzinfo
from typing import TYPE_CHECKING, Any, Final

from homeassistant.const import EVENT_CORE_CONFIG_UPDATE, EVENT_HOMEASSISTANT_STOP
from homeassistant.core import Event, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from .care_schedule import TaskState, is_resting, task_state
from .const import DOMAIN
from .events import PlantDeletedEvent, PlantEvent

if TYPE_CHECKING:
    from datetime import datetime

    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import (
        AddEntitiesCallback,
        EntityPlatform,
    )

    from .entity import SmartPlantsEntity
    from .manager import SmartPlantsManager
    from .models import CareTask, PlantRecord


ROLE_CARE_DUE: Final = "care_due"
TASK_ROLE_PREFIX: Final = "care_task:"
TASK_SUFFIX_DUE: Final = "due"
TASK_SUFFIX_NEXT: Final = "next"

# English names used when the platform translations are not loaded yet, for
# example in attribute values computed before the entity joined a platform.
DEFAULT_TASK_NAMES: Final[Mapping[str, str]] = {
    "fertilize": "Fertilize",
    "prune": "Prune",
    "repot": "Repot",
    "pests": "Check for pests",
    "custom": "Care task",
}

TaskEntityFactory = Callable[
    ["SmartPlantsManager", "PlantRecord", "CareTask"], "SmartPlantsEntity"
]
PlantEntityFactory = Callable[
    ["SmartPlantsManager", "PlantRecord"], "SmartPlantsEntity"
]


def task_role(task_id: str, suffix: str) -> str:
    """Return the entity role of one care task entity."""
    return f"{TASK_ROLE_PREFIX}{task_id}:{suffix}"


def task_translation_key(task_type: str) -> str:
    return f"care_task_{task_type}"


def local_today() -> date:
    """Return today's date in the Home Assistant time zone."""
    return dt_util.now().date()


def local_time_zone() -> tzinfo:
    return dt_util.get_default_time_zone()


def compute_task_state(plant: PlantRecord, task: CareTask) -> TaskState:
    return task_state(
        task, plant.rest_period, tz=local_time_zone(), today=local_today()
    )


def is_resting_today(plant: PlantRecord) -> bool:
    return is_resting(plant.rest_period, local_today())


def last_done_date(task: CareTask) -> date | None:
    """Return the local calendar date of the task's latest Done, if any."""
    if task.last_done_at is None:
        return None
    moment = dt_util.parse_datetime(task.last_done_at)
    if moment is None:
        return None
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=dt_util.UTC)
    return dt_util.as_local(moment).date()


def next_due_timestamp(next_due: date | None) -> datetime | None:
    """Return local midnight of ``next_due`` in the Home Assistant time zone."""
    if next_due is None:
        return None
    return dt_util.start_of_local_day(next_due)


def translated_task_name(task: CareTask, translations: Mapping[str, str] | None) -> str:
    """Return the task's display name: its own name, else its type's name."""
    if task.name is not None:
        return task.name
    key = (
        f"component.{DOMAIN}.entity.binary_sensor."
        f"{task_translation_key(task.type)}.name"
    )
    if translations and (name := translations.get(key)):
        return name
    return DEFAULT_TASK_NAMES.get(task.type, task.type)


class CareEntityLifecycle:
    """
    Keep one platform's care entities in step with the plants' care tasks.

    Runs alongside ``SmartPlantsPlatformLifecycle`` on the same platform and
    shares the manager's entity index. Deleting a whole plant is handled by
    the platform lifecycle (runtime entities) and the device reconciler
    (registry entries); this class only forgets the plant.
    """

    def __init__(  # noqa: PLR0913, PLR0917 — each is a distinct dependency
        self,
        hass: HomeAssistant,
        manager: SmartPlantsManager,
        platform: str,
        task_factories: Mapping[str, TaskEntityFactory],
        plant_factories: Mapping[str, PlantEntityFactory],
        async_add_entities: AddEntitiesCallback,
    ) -> None:
        self._hass = hass
        self._manager = manager
        self._platform = platform
        self._task_factories = dict(task_factories)
        self._plant_factories = dict(plant_factories)
        self._async_add_entities = async_add_entities
        # (plant_id, role) pairs handed to Home Assistant, including entities
        # that are disabled in the registry and therefore never attached.
        self._added: set[tuple[str, str]] = set()
        self._owner: EntityPlatform | None = None
        self._operation_lock = asyncio.Lock()
        self._closing = False
        self._unsubs: list[Callable[[], None]] = []
        self._unsub_midnight: Callable[[], None] | None = None

    async def async_setup(self) -> None:
        from homeassistant.helpers.entity_platform import (  # noqa: PLC0415
            async_get_current_platform,
        )

        with contextlib.suppress(RuntimeError):
            self._owner = async_get_current_platform()
        self._remove_orphaned_registry_entries()
        entities = self._build_missing(self._manager.snapshot.plants.values())
        if entities:
            await self._async_add(entities)
        self._unsubs.append(self._manager.subscribe_required(self._handle_event))
        self._unsubs.append(
            self._hass.bus.async_listen(
                EVENT_CORE_CONFIG_UPDATE, self._handle_core_config_update
            )
        )
        self._unsubs.append(
            self._hass.bus.async_listen(
                EVENT_HOMEASSISTANT_STOP, self._handle_homeassistant_stop
            )
        )
        self._track_midnight()

    async def async_unload(self) -> None:
        self._closing = True
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        self._cancel_midnight()
        async with self._operation_lock:
            self._added.clear()
            self._owner = None

    # --- Refresh -----------------------------------------------------------

    def _cancel_midnight(self) -> None:
        if self._unsub_midnight is not None:
            self._unsub_midnight()
            self._unsub_midnight = None

    def _track_midnight(self) -> None:
        self._cancel_midnight()
        # A setup that finishes while Home Assistant is shutting down (for
        # example a reload scheduled just before) missed the stop event, so
        # nothing would cancel a timer started now.
        if self._hass.is_stopping:
            return
        # One second past midnight so the new local date is in effect when
        # the states are recomputed.
        self._unsub_midnight = async_track_time_change(
            self._hass, self._handle_midnight, hour=0, minute=0, second=1
        )

    @callback
    def _handle_midnight(self, _now: datetime) -> None:
        self.refresh()

    @callback
    def _handle_homeassistant_stop(self, _event: Event[Any]) -> None:
        # A pending timer must not outlive Home Assistant, even when the
        # entry is not unloaded first.
        self._cancel_midnight()

    @callback
    def _handle_core_config_update(self, _event: Event[Any]) -> None:
        if self._closing:
            return
        # The time listener computed its next run in the previous time zone.
        self._track_midnight()
        self.refresh()

    @callback
    def refresh(self) -> None:
        """Write the current state of every attached care entity."""
        if self._closing:
            return
        for plant_id, role in tuple(self._added):
            entity = self._manager.get_entity(self._platform, plant_id, role)
            if entity is not None:
                entity.async_write_ha_state()

    # --- Lifecycle -----------------------------------------------------------

    async def _handle_event(self, event: PlantEvent) -> None:
        async with self._operation_lock:
            if self._closing:
                return
            if isinstance(event, PlantDeletedEvent):
                self._forget_plant(event.plant_id)
                return
            plants = self._manager.snapshot.plants
            await self._async_remove_obsolete(plants)
            entities = self._build_missing(plants.values())
            if entities:
                try:
                    await self._async_add(entities)
                except Exception:
                    for entity in entities:
                        self._added.discard((entity.plant_id, entity.role))
                    raise

    def _desired_roles(self, plant: PlantRecord) -> set[str]:
        roles = {
            task_role(task.id, suffix)
            for task in plant.care_tasks
            for suffix in self._task_factories
        }
        if plant.care_tasks:
            roles.update(self._plant_factories)
        return roles

    def _build_missing(self, plants: Iterable[PlantRecord]) -> list[SmartPlantsEntity]:
        built: list[SmartPlantsEntity] = []
        for plant in plants:
            for task in plant.care_tasks:
                for suffix, task_factory in self._task_factories.items():
                    key = (plant.id, task_role(task.id, suffix))
                    if key in self._added:
                        continue
                    self._added.add(key)
                    built.append(task_factory(self._manager, plant, task))
            if not plant.care_tasks:
                continue
            for role, plant_factory in self._plant_factories.items():
                key = (plant.id, role)
                if key in self._added:
                    continue
                self._added.add(key)
                built.append(plant_factory(self._manager, plant))
        return built

    async def _async_remove_obsolete(self, plants: Mapping[str, PlantRecord]) -> None:
        for plant_id, role in sorted(self._added):
            plant = plants.get(plant_id)
            if plant is None or role in self._desired_roles(plant):
                continue
            self._added.discard((plant_id, role))
            entity = self._manager.get_entity(self._platform, plant_id, role)
            if entity is not None:
                await entity.async_remove()
            self._remove_registry_entry(plant_id, role)

    def _remove_registry_entry(self, plant_id: str, role: str) -> None:
        registry = er.async_get(self._hass)
        entity_id = registry.async_get_entity_id(
            self._platform, DOMAIN, f"{DOMAIN}:{plant_id}:{role}"
        )
        if entity_id is not None:
            registry.async_remove(entity_id)

    def _remove_orphaned_registry_entries(self) -> None:
        """Remove entries of tasks deleted while this platform was not loaded."""
        registry = er.async_get(self._hass)
        plants = self._manager.snapshot.plants
        for entry in list(registry.entities.values()):
            if entry.platform != DOMAIN or entry.domain != self._platform:
                continue
            owner = _care_entry_owner(entry.unique_id, plants)
            if owner is None:
                continue
            plant, role = owner
            if role not in self._desired_roles(plant):
                registry.async_remove(entry.entity_id)

    async def _async_add(self, entities: list[SmartPlantsEntity]) -> None:
        if self._closing:
            return
        if self._owner is not None:
            await self._owner.async_add_entities(entities)
            return
        self._async_add_entities(entities)

    def _forget_plant(self, plant_id: str) -> None:
        for key in [k for k in self._added if k[0] == plant_id]:
            self._added.discard(key)


def _care_entry_owner(
    unique_id: str, plants: Mapping[str, PlantRecord]
) -> tuple[PlantRecord, str] | None:
    """Return the plant and role of a care entity unique id, if it is one."""
    for plant in plants.values():
        prefix = f"{DOMAIN}:{plant.id}:"
        if not unique_id.startswith(prefix):
            continue
        role = unique_id.removeprefix(prefix)
        if role == ROLE_CARE_DUE or role.startswith(TASK_ROLE_PREFIX):
            return plant, role
    return None
