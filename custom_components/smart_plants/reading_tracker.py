"""
Runtime tracking of reading care tasks.

A reading care task becomes due because of a sensor value (see
``care_schedule.reading_task_state``). This module feeds the pure engine:

- it reads the task's source, either the plant's aggregated role value
  (through the role controller), one sensor entity's state, or a weather
  entity's forecast low or high (through ``ForecastReader``), converted into
  the unit the task's value was given in;
- it re-evaluates a task whenever its source changes (for a forecast, after
  each fetch), when the plant record changes (Done, Undo Done, schedule
  edits), and when an "only after" timer runs out;
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
from datetime import datetime, timedelta
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
from .forecast_reader import REFRESH_INTERVAL, ForecastReader
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
    # For a forecast task: how far the forecast covers the look-ahead window.
    forecast_until: datetime | None = None

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
    forecast_until: datetime | None = None
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

    def __init__(
        self,
        hass: HomeAssistant,
        manager: SmartPlantsManager,
        *,
        forecast_refresh_interval: timedelta = REFRESH_INTERVAL,
    ) -> None:
        self._hass = hass
        self._manager = manager
        self._store = ReadingStateStore(hass)
        self._persisted: dict[str, ReadingTimestamps] = {}
        # Last seen schedule of every reading task, including tasks of
        # disabled plants, so a schedule edit can be told apart from a reload.
        self._schedules: dict[str, ReadingSchedule] = {}
        self._tracked: dict[str, _TrackedTask] = {}
        # plant_id -> its reading task ids in plant order, and task_id ->
        # plant_id, also for disabled plants. A plant change then only
        # touches that plant's tasks instead of every task of the inventory.
        self._plant_tasks: dict[str, tuple[str, ...]] = {}
        self._task_plants: dict[str, str] = {}
        # plant_id -> role -> (controller, unsubscribe) for role sources.
        self._role_subscriptions: dict[
            str, dict[str, tuple[Any, Callable[[], None]]]
        ] = {}
        # plant_id -> the sensor entities and forecast windows its tracked
        # tasks read; the union decides the shared subscriptions.
        self._plant_sources: dict[
            str, tuple[frozenset[str], frozenset[tuple[str, int]]]
        ] = {}
        self._entity_ids: frozenset[str] = frozenset()
        self._unsub_entities: Callable[[], None] | None = None
        self._forecasts = ForecastReader(
            hass, self._handle_forecast, refresh_interval=forecast_refresh_interval
        )
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
            tasks = reading_tasks(plant)
            for task, schedule in tasks:
                self._schedules[task.id] = schedule
                self._task_plants[task.id] = plant.id
            self._plant_tasks[plant.id] = tuple(task.id for task, _ in tasks)
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
        self._forecasts.close()
        for tracked in self._tracked.values():
            tracked.cancel_timer()

    async def async_close(self) -> None:
        self._closed = True
        if self._unsub_stop is not None:
            self._unsub_stop()
            self._unsub_stop = None
        self._forecasts.close()
        for tracked in self._tracked.values():
            tracked.cancel_timer()
        self._tracked.clear()
        for by_role in self._role_subscriptions.values():
            for _controller, unsub in by_role.values():
                unsub()
        self._role_subscriptions.clear()
        self._plant_sources.clear()
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
        """
        Bring tracking in line with a plant change before entities render.

        Only the changed plant's tasks are synced and evaluated: a write that
        changes many plants delivers one event per plant, and the other
        plants' tasks did not change.
        """
        if self._closed:
            return
        if isinstance(event, PlantDeletedEvent):
            self._forget_tasks(
                task.id for task, _schedule in reading_tasks(event.previous)
            )
            self._sync_plant(event.plant_id)
        else:
            self._sync_plant(event.plant.id)

    # --- Queries -----------------------------------------------------------

    def task_info(self, task: CareTask) -> ReadingTaskInfo:
        """Return the current state of one reading task."""
        tracked = self._tracked.get(task.id)
        if tracked is not None and tracked.state is not None:
            return ReadingTaskInfo(
                state=tracked.state,
                reading=tracked.reading,
                forecast_until=tracked.forecast_until,
            )
        # Untracked (disabled plant, or not loaded yet): no reading, no
        # transition, only the stored state.
        return ReadingTaskInfo(
            state=self._evaluate_state(task, None, None, dt_util.utcnow()),
            reading=None,
        )

    def forecast_had_value(self, entity_id: str) -> bool | None:
        """Return whether the weather entity's last fetch gave a value."""
        return self._forecasts.last_fetch_had_value(entity_id)

    # --- Synchronization ---------------------------------------------------

    def _forget_tasks(self, task_ids: Any) -> None:
        for task_id in task_ids:
            tracked = self._tracked.pop(task_id, None)
            if tracked is not None:
                tracked.cancel_timer()
            self._schedules.pop(task_id, None)
            plant_id = self._task_plants.pop(task_id, None)
            if plant_id is not None and plant_id in self._plant_tasks:
                self._plant_tasks[plant_id] = tuple(
                    known for known in self._plant_tasks[plant_id] if known != task_id
                )
            if self._persisted.pop(task_id, None) is not None:
                self._schedule_save()

    def _sync(self) -> None:
        """Sync and evaluate every plant's tasks; used when tracking starts."""
        plants = self._manager.snapshot.plants
        current = {
            task.id for plant in plants.values() for task, _ in reading_tasks(plant)
        }
        # Tasks that were deleted or left the reading kind lose their state.
        self._forget_tasks(
            [task_id for task_id in self._schedules if task_id not in current]
        )
        for plant_id in [known for known in self._plant_tasks if known not in plants]:
            self._update_plant(plant_id, None)
        for plant_id, plant in plants.items():
            self._update_plant(plant_id, plant)
        self._apply_sources()
        for plant_id in plants:
            self._sync_role_subscriptions(plant_id)
        now = dt_util.utcnow()
        for task_id in list(self._tracked):
            self._evaluate(task_id, now)

    def _sync_plant(self, plant_id: str) -> None:
        """Sync and evaluate one plant's tasks after that plant changed."""
        plant = self._manager.snapshot.plants.get(plant_id)
        current = (
            set() if plant is None else {task.id for task, _ in reading_tasks(plant)}
        )
        # Tasks that were deleted or left the reading kind lose their state.
        self._forget_tasks(
            [
                task_id
                for task_id in self._plant_tasks.get(plant_id, ())
                if task_id not in current and self._task_plants.get(task_id) == plant_id
            ]
        )
        if self._update_plant(plant_id, plant):
            self._apply_sources()
        self._sync_role_subscriptions(plant_id)
        now = dt_util.utcnow()
        for task_id in self._plant_tasks.get(plant_id, ()):
            if task_id in self._tracked:
                self._evaluate(task_id, now)

    def _update_plant(self, plant_id: str, plant: PlantRecord | None) -> bool:
        """
        Track the plant's current reading tasks; drop a removed plant.

        Return whether the sensors or forecasts the plant's tasks read changed.
        """
        if plant is None:
            for task_id in self._plant_tasks.pop(plant_id, ()):
                tracked = self._tracked.pop(task_id, None)
                if tracked is not None:
                    tracked.cancel_timer()
            return self._plant_sources.pop(plant_id, None) is not None

        task_ids: list[str] = []
        for task, schedule in reading_tasks(plant):
            task_id = task.id
            task_ids.append(task_id)
            self._task_plants[task_id] = plant_id
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
                    plant_id=plant_id, schedule=schedule
                )
        self._plant_tasks[plant_id] = tuple(task_ids)
        return self._update_plant_sources(plant_id)

    def _update_plant_sources(self, plant_id: str) -> bool:
        """Record what the plant's tracked tasks read; return whether it changed."""
        entity_ids: set[str] = set()
        forecasts: set[tuple[str, int]] = set()
        for tracked in self._plant_tracked(plant_id):
            source = tracked.schedule.source
            if source.role is not None:
                continue
            if source.entity_id is not None:
                entity_ids.add(source.entity_id)
            elif source.forecast is not None:
                forecasts.add((source.forecast.entity_id, source.forecast.hours))
        if not entity_ids and not forecasts:
            return self._plant_sources.pop(plant_id, None) is not None
        sources = (frozenset(entity_ids), frozenset(forecasts))
        if self._plant_sources.get(plant_id) == sources:
            return False
        self._plant_sources[plant_id] = sources
        return True

    def _plant_tracked(self, plant_id: str) -> list[_TrackedTask]:
        return [
            tracked
            for task_id in self._plant_tasks.get(plant_id, ())
            if (tracked := self._tracked.get(task_id)) is not None
        ]

    def _apply_sources(self) -> None:
        """Subscribe to the union of every plant's sensors and forecasts."""
        entity_ids: set[str] = set()
        forecasts: dict[str, set[int]] = {}
        for plant_entities, plant_forecasts in self._plant_sources.values():
            entity_ids.update(plant_entities)
            for entity_id, hours in plant_forecasts:
                forecasts.setdefault(entity_id, set()).add(hours)
        # A closed reader (after Home Assistant stops) ignores this.
        self._forecasts.watch(forecasts)

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

    def _sync_role_subscriptions(self, plant_id: str) -> None:
        roles = {
            role
            for tracked in self._plant_tracked(plant_id)
            if (role := tracked.schedule.source.role) is not None
        }
        subscriptions = self._role_subscriptions.get(plant_id, {})
        for role in list(subscriptions):
            controller, unsub = subscriptions[role]
            if (
                role not in roles
                or self._manager.get_role_controller(plant_id, role) is not controller
            ):
                unsub()
                del subscriptions[role]
        for role in roles - set(subscriptions):
            controller = self._manager.get_role_controller(plant_id, role)
            if controller is None:
                continue
            unsub = controller.add_listener(
                lambda plant_id=plant_id, role=role: self._handle_role_change(
                    plant_id, role
                )
            )
            subscriptions[role] = (controller, unsub)
        if subscriptions:
            self._role_subscriptions[plant_id] = subscriptions
        else:
            self._role_subscriptions.pop(plant_id, None)

    # --- Source changes ----------------------------------------------------

    def _handle_role_change(self, plant_id: str, role: str) -> None:
        if self._closed:
            return
        now = dt_util.utcnow()
        changed = False
        for task_id in self._plant_tasks.get(plant_id, ()):
            tracked = self._tracked.get(task_id)
            if tracked is not None and tracked.schedule.source.role == role:
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
    def _handle_forecast(self, entity_id: str) -> None:
        if self._closed:
            return
        now = dt_util.utcnow()
        changed_plants: set[str] = set()
        for task_id, tracked in list(self._tracked.items()):
            forecast = tracked.schedule.source.forecast
            if (
                forecast is not None
                and forecast.entity_id == entity_id
                and self._evaluate(task_id, now)
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

    def _read(
        self, plant: PlantRecord, schedule: ReadingSchedule
    ) -> tuple[float | None, datetime | None]:
        """Return the task's reading and, for a forecast, how far it covers."""
        source = schedule.source
        if source.role is not None:
            controller = self._manager.get_role_controller(plant.id, source.role)
            if controller is None:
                return None, None
            return role_reading(source.role, controller.current_evaluation), None
        if source.forecast is not None:
            forecast = source.forecast
            window = self._forecasts.window(forecast.entity_id, forecast.hours)
            if window is None:
                return None, None
            reading = window.reading(forecast.reading, schedule.unit)
            return reading, None if reading is None else window.until
        if source.entity_id is None:
            return None, None
        return self._read_entity(source.entity_id, schedule.unit), None

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
        reading, forecast_until = self._read(plant, tracked.schedule)
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

        changed = (
            state != tracked.state
            or reading != tracked.reading
            or forecast_until != tracked.forecast_until
        )
        tracked.state = state
        tracked.reading = reading
        tracked.forecast_until = forecast_until
        return changed

    def _schedule_save(self) -> None:
        if self._closed:
            return
        self._dirty = True
        self._store.async_schedule_save(self._persisted)
