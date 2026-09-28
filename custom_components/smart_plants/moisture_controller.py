"""Per-plant moisture evaluation driven by tracked source deadlines."""

from __future__ import annotations

import contextlib
import logging
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.util import dt as dt_util

from .moisture_evaluator import (
    MoistureEvaluation,
    SourceReading,
    evaluate,
)
from .source_tracker import SourceTracker

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .care import CareEvent
    from .models import MoistureConfig
    from .roles import MeasurementAdapter

from homeassistant.core import callback

_LOGGER = logging.getLogger(__name__)


class MoisturePlantController:
    """
    One stateful moisture controller per plant, including while disabled.

    Hysteresis latches initialize to ``False`` after process startup. The first
    available aggregate initializes them through the normal threshold rules;
    temporary unavailability never changes them. Stopping and re-enabling the
    same controller therefore preserves both latches and source timestamps.
    """

    def __init__(
        self,
        hass: HomeAssistant,
        plant_id: str,
        config: MoistureConfig,
        *,
        adapter: MeasurementAdapter,
    ) -> None:
        self._plant_id = plant_id
        self._hass = hass
        self._config = config
        self._previous_needs_water = False
        self._previous_too_wet = False
        self._listeners: list[Callable[[], None]] = []
        self._active = False
        self._care_events: tuple[CareEvent, ...] = ()
        self._unsub_watering_deadline: Callable[[], None] | None = None
        self._tracker = SourceTracker(
            hass,
            is_valid=adapter.is_valid,
            on_change=self._recompute_and_notify,
        )
        self._tracker.configure(
            config.sources, stale_after=timedelta(seconds=config.stale_after_seconds)
        )
        self._evaluation_now = dt_util.utcnow()
        self._evaluation = self._evaluate_now()

    @property
    def plant_id(self) -> str:
        return self._plant_id

    @property
    def current_evaluation(self) -> MoistureEvaluation:
        return self._evaluation

    @property
    def last_valid_at(self) -> datetime | None:
        """Most recent valid reading across this role's sources, if any."""
        return self._tracker.last_valid_at

    @property
    def config(self) -> MoistureConfig:
        return self._config

    def add_listener(self, callback_fn: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(callback_fn)

        def _unsubscribe() -> None:
            with contextlib.suppress(ValueError):
                self._listeners.remove(callback_fn)

        return _unsubscribe

    def start(self) -> None:
        if self._active:
            return
        self._active = True
        self._tracker.start()
        self._recompute_and_notify(dt_util.utcnow())

    def stop(self) -> None:
        self._active = False
        self._cancel_watering_deadline()
        self._tracker.stop()

    def close(self) -> None:
        """Permanently release tracker resources."""
        self._active = False
        self._cancel_watering_deadline()
        self._tracker.close()

    def set_care_events(self, events: tuple[CareEvent, ...]) -> None:
        self._care_events = events
        if self._active:
            self._recompute_and_notify(dt_util.utcnow())

    def reconfigure(self, config: MoistureConfig) -> None:
        self._config = config
        self._tracker.configure(
            config.sources, stale_after=timedelta(seconds=config.stale_after_seconds)
        )
        self._recompute_and_notify(dt_util.utcnow())

    def _evaluate_now(self) -> MoistureEvaluation:
        readings: dict[str, SourceReading] = {}
        for key, tracked in self._tracker.snapshots.items():
            state = tracked.state
            readings[key] = SourceReading(
                entity_id=tracked.entity_id,
                source_key=key,
                value=state.state if state is not None else None,
                unit_of_measurement=(
                    state.attributes.get("unit_of_measurement")
                    if state is not None
                    else None
                ),
                last_valid_at=(
                    tracked.last_valid_at.timestamp()
                    if tracked.last_valid_at is not None
                    else None
                ),
                grace_until=(
                    tracked.grace_until.timestamp()
                    if tracked.grace_until is not None
                    else None
                ),
            )
        return evaluate(
            self._config,
            readings,
            now=self._evaluation_now.timestamp(),
            previous_needs_water=self._previous_needs_water,
            previous_too_wet=self._previous_too_wet,
            watering_grace=self._watering_grace_active(self._evaluation_now),
        )

    def _watering_grace_deadline(self) -> datetime | None:
        now = self._evaluation_now
        deadlines = [
            deadline
            for event in self._care_events
            if event.kind == "watering"
            and event.provenance == "manual"
            and (occurred := dt_util.parse_datetime(event.occurred_at)) is not None
            and occurred <= now
            and (deadline := occurred + timedelta(hours=24)) > now
        ]
        return max(deadlines) if deadlines else None

    def _watering_grace_active(self, _now: datetime) -> bool:
        return self._watering_grace_deadline() is not None

    def _cancel_watering_deadline(self) -> None:
        if self._unsub_watering_deadline is not None:
            self._unsub_watering_deadline()
            self._unsub_watering_deadline = None

    def _recompute_and_notify(self, now: datetime) -> None:
        self._cancel_watering_deadline()
        self._evaluation_now = now
        result = self._evaluate_now()
        # Unavailability is observational, not a healthy sample. Keep latches
        # until a future valid aggregate crosses an explicit off boundary.
        if result.computed_available:
            self._previous_needs_water = result.needs_water
            self._previous_too_wet = result.too_wet
        self._evaluation = result
        deadline = self._watering_grace_deadline()
        if self._active and deadline is not None:
            self._unsub_watering_deadline = async_track_point_in_time(
                self._hass, self._handle_watering_deadline, deadline
            )
        for listener in list(self._listeners):
            try:
                listener()
            except Exception:
                _LOGGER.exception("moisture controller listener raised; continuing")

    @callback
    def _handle_watering_deadline(self, _now: datetime) -> None:
        self._unsub_watering_deadline = None
        self._recompute_and_notify(dt_util.utcnow())
