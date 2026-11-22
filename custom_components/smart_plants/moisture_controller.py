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
from .watering_detector import WateringDetector

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
        self._watering_detector = WateringDetector()
        self._on_watering_detected: Callable[[str, datetime], None] | None = None
        # The sources behind the value the detector saw last; when they
        # change, the value can jump without any water.
        self._detector_members: tuple[str, ...] | None = None
        self._tracker = SourceTracker(
            hass,
            is_valid=adapter.is_valid,
            on_change=self._recompute_and_notify,
        )
        self._tracker.configure(
            config.sources, stale_after=timedelta(seconds=config.stale_after_seconds)
        )
        self._evaluation_now = dt_util.utcnow()
        self._evaluation = self._evaluate_now(self._watering_grace_deadline())

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

    def set_watering_detection(
        self, on_detected: Callable[[str, datetime], None] | None
    ) -> None:
        """Call ``on_detected(plant_id, when)`` for a sudden rise, or stop."""
        self._on_watering_detected = on_detected
        self._reset_watering_detector()

    def _reset_watering_detector(self) -> None:
        self._watering_detector.reset()
        self._detector_members = None

    def reconfigure(self, config: MoistureConfig) -> None:
        self._config = config
        # New sources, aggregation or main sensor change the value by themselves.
        self._reset_watering_detector()
        self._tracker.configure(
            config.sources, stale_after=timedelta(seconds=config.stale_after_seconds)
        )
        self._recompute_and_notify(dt_util.utcnow())

    def _evaluate_now(self, grace_deadline: datetime | None) -> MoistureEvaluation:
        """Evaluate at ``_evaluation_now``; ``grace_deadline`` as computed for it."""
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
            watering_grace=grace_deadline is not None,
        )

    def _watering_grace_deadline(self) -> datetime | None:
        # Every logged watering counts, whatever logged it: the panel, an
        # action call after an irrigation valve ran, or an automation.
        now = self._evaluation_now
        deadlines = [
            deadline
            for event in self._care_events
            if event.kind == "watering"
            and (occurred := dt_util.parse_datetime(event.occurred_at)) is not None
            and occurred <= now
            and (deadline := occurred + timedelta(hours=24)) > now
        ]
        return max(deadlines) if deadlines else None

    def _cancel_watering_deadline(self) -> None:
        if self._unsub_watering_deadline is not None:
            self._unsub_watering_deadline()
            self._unsub_watering_deadline = None

    def _recompute_and_notify(self, now: datetime) -> None:
        self._cancel_watering_deadline()
        self._evaluation_now = now
        # One pass over the care history gives both the grace verdict and the
        # deadline at which it ends.
        deadline = self._watering_grace_deadline()
        result = self._evaluate_now(deadline)
        # Unavailability is observational, not a healthy sample. Keep latches
        # until a future valid aggregate crosses an explicit off boundary.
        if result.computed_available:
            self._previous_needs_water = result.needs_water
            self._previous_too_wet = result.too_wet
        self._evaluation = result
        self._detect_watering(now, result)
        if self._active and deadline is not None:
            self._unsub_watering_deadline = async_track_point_in_time(
                self._hass, self._handle_watering_deadline, deadline
            )
        for listener in list(self._listeners):
            try:
                listener()
            except Exception:
                _LOGGER.exception("moisture controller listener raised; continuing")

    def _detect_watering(self, now: datetime, result: MoistureEvaluation) -> None:
        if not self._active or self._on_watering_detected is None:
            return
        if not result.computed_available or result.computed_percent is None:
            # Without a value the sources come back one by one; start afresh.
            self._reset_watering_detector()
            return
        if result.members != self._detector_members:
            self._watering_detector.reset()
            self._detector_members = result.members
        if self._watering_detector.observe(
            now, float(result.computed_percent), self._care_events
        ):
            self._on_watering_detected(self._plant_id, now)

    @callback
    def _handle_watering_deadline(self, _now: datetime) -> None:
        self._unsub_watering_deadline = None
        self._recompute_and_notify(dt_util.utcnow())
