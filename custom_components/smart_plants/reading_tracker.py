"""
Runtime tracking of reading care tasks.

A reading care task becomes due because of a sensor value (see
``care_schedule.reading_task_state``). This module feeds the pure engine:

- it reads the task's source, either the plant's aggregated role value
  (through the role controller) or one sensor entity's state, converted into
  the unit the task's value was given in;
- it re-evaluates a task whenever its source changes, when the plant record
  changes (Done, Undo Done, schedule edits), and when an "only after" timer
  runs out;
- it keeps ``triggered_at`` and ``rearmed_at`` per task in a separate store
  (``ReadingStateStore``), so sensor-driven changes never write the inventory
  or bump a plant revision;
- it tells listeners which plant changed so the care entities refresh.

The start of an "only after" count is runtime state only: after a restart it
starts again from the first reading on the due side.

Plants that are disabled are not tracked. Their reading tasks keep the stored
state and report ``no_reading`` until the plant is enabled again, like the
role sensors whose controllers stop while a plant is disabled.
"""

from __future__ import annotations

import contextlib
import functools
import logging
import math
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Any, Final

from homeassistant.components.sensor.const import UNIT_CONVERTERS
from homeassistant.const import (
    ATTR_DEVICE_CLASS,
    ATTR_UNIT_OF_MEASUREMENT,
    EVENT_HOMEASSISTANT_STOP,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import Event, EventStateChangedData, callback
from homeassistant.helpers.event import (
    async_track_point_in_utc_time,
    async_track_state_change_event,
)
from homeassistant.util import dt as dt_util

from .care import parse_utc_timestamp, utc_timestamp
from .care_schedule import ReadingState, reading_task_state
from .events import PlantDeletedEvent, PlantEvent
from .models import ReadingSchedule
from .overview import role_reading
from .storage import ReadingStateStore, ReadingTimestamps

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .manager import SmartPlantsManager
    from .models import CareTask, PlantRecord

_LOGGER = logging.getLogger(__name__)

ReadingListener = Callable[[str], None]
# Readings converted between units can have long fractions (33.1 °F is
# 0.6111... °C); two decimals are enough for every supported role.
_SHOWN_DECIMALS: Final = 2


@dataclass(frozen=True, slots=True)
class ReadingTaskInfo:
    """What the entities and the panel show for one reading care task."""

    state: ReadingState
    reading: float | None

    @property
    def shown_reading(self) -> float | None:
        """Return the reading rounded for display; comparisons use ``reading``."""
        return None if self.reading is None else round(self.reading, _SHOWN_DECIMALS)

    @property
    def due_since(self) -> datetime | None:
        """
        Return when the task became due, while it is due.

        A Done keeps ``triggered_at`` stored so Undo Done can make the task due
        again at once, but a waiting task is not due and shows no due time.
        """
        return self.state.triggered_at if self.state.is_due else None


@dataclass(slots=True)
class _TrackedTask:
    plant_id: str
    schedule: ReadingSchedule
    reading: float | None = None
    breach_since: datetime | None = None
    state: ReadingState | None = None
    timer_at: datetime | None = None
    unsub_timer: Callable[[], None] | None = None

    def cancel_timer(self) -> None:
        if self.unsub_timer is not None:
            self.unsub_timer()
        self.unsub_timer = None
        self.timer_at = None


def _parse_timestamp(value: str | None) -> datetime | None:
    return None if value is None else parse_utc_timestamp(value, "timestamp")


def _format_timestamp(value: datetime | None) -> str | None:
    return None if value is None else utc_timestamp(value)


def reading_tasks(plant: PlantRecord) -> list[tuple[CareTask, ReadingSchedule]]:
    """Return the plant's care tasks that use a reading schedule."""
    return [
        (task, task.schedule)
        for task in plant.care_tasks
        if isinstance(task.schedule, ReadingSchedule)
    ]


class ReadingTracker:
    """Track every reading care task of a loaded manager."""

    def __init__(self, hass: HomeAssistant, manager: SmartPlantsManager) -> None:
        self._hass = hass
        self._manager = manager
        self._store = ReadingStateStore(hass)
        self._persisted: dict[str, ReadingTimestamps] = {}
        # Last seen schedule of every reading task, including tasks of
        # disabled plants, so a schedule edit can be told apart from a reload.
        self._schedules: dict[str, ReadingSchedule] = {}
        self._tracked: dict[str, _TrackedTask] = {}
        self._role_subscriptions: dict[
            tuple[str, str], tuple[Any, Callable[[], None]]
        ] = {}
        self._entity_ids: frozenset[str] = frozenset()
        self._unsub_entities: Callable[[], None] | None = None
        self._listeners: list[ReadingListener] = []
        self._dirty = False
        self._closed = False
        self._stopping = False
        self._unsub_stop: Callable[[], None] | None = None

    # --- Lifecycle ---------------------------------------------------------

    async def async_load(self) -> None:
        """Load the stored state; drop entries of tasks that no longer exist."""
        self._persisted = await self._store.async_load()
        for plant in self._manager.snapshot.plants.values():
            for task, schedule in reading_tasks(plant):
                self._schedules[task.id] = schedule
        unknown = set(self._persisted) - set(self._schedules)
        for task_id in unknown:
            del self._persisted[task_id]
        if unknown:
            self._schedule_save()

    def start(self) -> None:
        """Subscribe to every tracked source and evaluate every task."""
        self._unsub_stop = self._hass.bus.async_listen_once(
            EVENT_HOMEASSISTANT_STOP, self._handle_homeassistant_stop
        )
        self._sync()

    @callback
    def _handle_homeassistant_stop(self, _event: Event[Any]) -> None:
        # A pending "only after" timer must not outlive Home Assistant, even
        # when the entry is not unloaded first.
        self._unsub_stop = None
        self._stopping = True
        for tracked in self._tracked.values():
            tracked.cancel_timer()

    async def async_close(self) -> None:
        self._closed = True
        if self._unsub_stop is not None:
            self._unsub_stop()
            self._unsub_stop = None
        for tracked in self._tracked.values():
            tracked.cancel_timer()
        self._tracked.clear()
        for _controller, unsub in self._role_subscriptions.values():
            unsub()
        self._role_subscriptions.clear()
        if self._unsub_entities is not None:
            self._unsub_entities()
            self._unsub_entities = None
        self._listeners.clear()
        if self._dirty:
            self._dirty = False
            try:
                await self._store.async_save_now(self._persisted)
            except Exception:
                _LOGGER.exception("Smart Plants could not save reading task state")

    def add_listener(self, listener: ReadingListener) -> Callable[[], None]:
        """Call ``listener(plant_id)`` when a plant's reading tasks change."""
        self._listeners.append(listener)

        def _remove() -> None:
            with contextlib.suppress(ValueError):
                self._listeners.remove(listener)

        return _remove

    @callback
    def handle_event(self, event: PlantEvent) -> None:
        """Bring tracking in line with a plant change before entities render."""
        if self._closed:
            return
        if isinstance(event, PlantDeletedEvent):
            self._forget_tasks(
                task.id for task, _schedule in reading_tasks(event.previous)
            )
        self._sync()

    # --- Queries -----------------------------------------------------------

    def task_info(self, task: CareTask) -> ReadingTaskInfo:
        """Return the current state of one reading task."""
        tracked = self._tracked.get(task.id)
        if tracked is not None and tracked.state is not None:
            return ReadingTaskInfo(state=tracked.state, reading=tracked.reading)
        # Untracked (disabled plant, or not loaded yet): no reading, no
        # transition, only the stored state.
        return ReadingTaskInfo(
            state=self._evaluate_state(task, None, None, dt_util.utcnow()),
            reading=None,
        )

    # --- Synchronization ---------------------------------------------------

    def _forget_tasks(self, task_ids: Any) -> None:
        for task_id in task_ids:
            tracked = self._tracked.pop(task_id, None)
            if tracked is not None:
                tracked.cancel_timer()
            self._schedules.pop(task_id, None)
            if self._persisted.pop(task_id, None) is not None:
                self._schedule_save()

    def _sync(self) -> None:
        plants = self._manager.snapshot.plants
        current: dict[str, tuple[PlantRecord, CareTask, ReadingSchedule]] = {}
        for plant in plants.values():
            for task, schedule in reading_tasks(plant):
                current[task.id] = (plant, task, schedule)

        # Tasks that were deleted or left the reading kind lose their state.
        self._forget_tasks(
            [task_id for task_id in self._schedules if task_id not in current]
        )

        for task_id, (plant, _task, schedule) in current.items():
            previous = self._schedules.get(task_id)
            self._schedules[task_id] = schedule
            if previous is not None and previous != schedule:
                # A changed schedule starts over: armed and not due.
                if self._persisted.pop(task_id, None) is not None:
                    self._schedule_save()
                tracked = self._tracked.pop(task_id, None)
                if tracked is not None:
                    tracked.cancel_timer()
            if plant.lifecycle_state != "active":
                tracked = self._tracked.pop(task_id, None)
                if tracked is not None:
                    tracked.cancel_timer()
                continue
            if task_id not in self._tracked:
                self._tracked[task_id] = _TrackedTask(
                    plant_id=plant.id, schedule=schedule
                )

        self._sync_subscriptions()
        now = dt_util.utcnow()
        for task_id in list(self._tracked):
            self._evaluate(task_id, now)

    def _sync_subscriptions(self) -> None:
        roles: set[tuple[str, str]] = set()
        entity_ids: set[str] = set()
        for tracked in self._tracked.values():
            source = tracked.schedule.source
            if source.role is not None:
                roles.add((tracked.plant_id, source.role))
            elif source.entity_id is not None:
                entity_ids.add(source.entity_id)

        for key in list(self._role_subscriptions):
            controller, unsub = self._role_subscriptions[key]
            plant_id, role = key
            if (
                key not in roles
                or self._manager.get_role_controller(plant_id, role) is not controller
            ):
                unsub()
                del self._role_subscriptions[key]
        for key in roles - set(self._role_subscriptions):
            plant_id, role = key
            controller = self._manager.get_role_controller(plant_id, role)
            if controller is None:
                continue
            unsub = controller.add_listener(
                lambda plant_id=plant_id, role=role: self._handle_role_change(
                    plant_id, role
                )
            )
            self._role_subscriptions[key] = (controller, unsub)

        wanted = frozenset(entity_ids)
        if wanted != self._entity_ids:
            if self._unsub_entities is not None:
                self._unsub_entities()
                self._unsub_entities = None
            self._entity_ids = wanted
            if wanted:
                self._unsub_entities = async_track_state_change_event(
                    self._hass, sorted(wanted), self._handle_entity_change
                )

    # --- Source changes ----------------------------------------------------

    def _handle_role_change(self, plant_id: str, role: str) -> None:
        if self._closed:
            return
        now = dt_util.utcnow()
        changed = False
        for task_id, tracked in list(self._tracked.items()):
            if tracked.plant_id == plant_id and tracked.schedule.source.role == role:
                changed |= self._evaluate(task_id, now)
        if changed:
            self._notify(plant_id)

    @callback
    def _handle_entity_change(self, event: Event[EventStateChangedData]) -> None:
        if self._closed:
            return
        entity_id = event.data["entity_id"]
        now = dt_util.utcnow()
        changed_plants: set[str] = set()
        for task_id, tracked in list(self._tracked.items()):
            if tracked.schedule.source.entity_id == entity_id and self._evaluate(
                task_id, now
            ):
                changed_plants.add(tracked.plant_id)
        for plant_id in sorted(changed_plants):
            self._notify(plant_id)

    @callback
    def _handle_timer(self, task_id: str, fired_at: datetime) -> None:
        tracked = self._tracked.get(task_id)
        if self._closed or tracked is None:
            return
        tracked.unsub_timer = None
        tracked.timer_at = None
        now = max(dt_util.utcnow(), fired_at)
        if self._evaluate(task_id, now):
            self._notify(tracked.plant_id)

    def _notify(self, plant_id: str) -> None:
        for listener in list(self._listeners):
            try:
                listener(plant_id)
            except Exception:
                _LOGGER.exception("Smart Plants reading task listener raised")

    # --- Evaluation --------------------------------------------------------

    def _read(self, plant: PlantRecord, schedule: ReadingSchedule) -> float | None:
        source = schedule.source
        if source.role is not None:
            controller = self._manager.get_role_controller(plant.id, source.role)
            if controller is None:
                return None
            return role_reading(source.role, controller.current_evaluation)
        if source.entity_id is None:
            return None
        return self._read_entity(source.entity_id, schedule.unit)

    def _read_entity(self, entity_id: str, unit: str | None) -> float | None:
        state = self._hass.states.get(entity_id)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        try:
            value = float(state.state)
        except ValueError:
            return None
        if not math.isfinite(value):
            return None
        live_unit = state.attributes.get(ATTR_UNIT_OF_MEASUREMENT)
        if live_unit == unit:
            return value
        converter = UNIT_CONVERTERS.get(state.attributes.get(ATTR_DEVICE_CLASS))
        if (
            converter is None
            or live_unit not in converter.VALID_UNITS
            or unit not in converter.VALID_UNITS
        ):
            _LOGGER.debug(
                "Reading care task source %s reports a unit that cannot be "
                "converted to the task's unit",
                entity_id,
            )
            return None
        converted = converter.convert(value, live_unit, unit)
        return converted if math.isfinite(converted) else None

    def _evaluate_state(
        self,
        task: CareTask,
        reading: float | None,
        breach_since: datetime | None,
        now: datetime,
    ) -> ReadingState:
        stored = self._persisted.get(task.id, ReadingTimestamps())
        return reading_task_state(
            schedule=task.schedule,
            reading=reading,
            now=now,
            triggered_at=_parse_timestamp(stored.triggered_at),
            rearmed_at=_parse_timestamp(stored.rearmed_at),
            last_done_at=_parse_timestamp(task.last_done_at),
            breach_since=breach_since,
        )

    def _evaluate(self, task_id: str, now: datetime) -> bool:
        """Re-evaluate one tracked task; return whether anything visible changed."""
        tracked = self._tracked.get(task_id)
        plant = (
            None
            if tracked is None
            else self._manager.snapshot.plants.get(tracked.plant_id)
        )
        task = None if plant is None else plant.care_task(task_id)
        if tracked is None or plant is None or task is None:
            return False
        reading = self._read(plant, tracked.schedule)
        state = self._evaluate_state(task, reading, tracked.breach_since, now)
        tracked.breach_since = state.breach_since

        timestamps = ReadingTimestamps(
            triggered_at=_format_timestamp(state.triggered_at),
            rearmed_at=_format_timestamp(state.rearmed_at),
        )
        if timestamps != self._persisted.get(task_id, ReadingTimestamps()):
            if timestamps.empty:
                self._persisted.pop(task_id, None)
            else:
                self._persisted[task_id] = timestamps
            self._schedule_save()

        if state.due_at is None or self._stopping:
            tracked.cancel_timer()
        elif tracked.timer_at != state.due_at:
            tracked.cancel_timer()
            tracked.timer_at = state.due_at
            tracked.unsub_timer = async_track_point_in_utc_time(
                self._hass,
                functools.partial(self._handle_timer, task_id),
                state.due_at,
            )

        changed = state != tracked.state or reading != tracked.reading
        tracked.state = state
        tracked.reading = reading
        return changed

    def _schedule_save(self) -> None:
        if self._closed:
            return
        self._dirty = True
        self._store.async_schedule_save(self._persisted)
