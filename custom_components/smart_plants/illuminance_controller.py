"""Per-plant illuminance evaluation driven by tracked source state."""

from __future__ import annotations

import contextlib
import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from homeassistant.core import callback
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.util import dt as dt_util

from . import illuminance_evaluator
from .illuminance_evaluator import LOW_LIGHT_DAY_END_HOUR, LOW_LIGHT_DAY_START_HOUR
from .source_tracker import SourceTracker

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .models import IlluminanceConfig
    from .roles import MeasurementAdapter

_LOGGER = logging.getLogger(__name__)

# Light samples are kept per minute, holding the brightest reading of that
# minute. A sensor that reports every second then keeps at most one sample a
# minute for the low-light window instead of one per report.
LIGHT_SAMPLE_BUCKET_SECONDS = 60


def next_daytime_edge(now_local: datetime) -> datetime:
    """
    Return the next local 08:00 or 18:00 wall-clock boundary strictly after now.

    Computed from wall-clock dates so it stays correct across DST transitions:
    the returned datetime carries the local offset in effect on that date, so
    the low_light window re-evaluates exactly at the day/night edge even when no
    source state change occurs.
    """
    candidates: list[datetime] = []
    for day_offset in (0, 1):
        day = now_local + timedelta(days=day_offset)
        for hour in (LOW_LIGHT_DAY_START_HOUR, LOW_LIGHT_DAY_END_HOUR):
            edge = day.replace(hour=hour, minute=0, second=0, microsecond=0)
            if edge > now_local:
                candidates.append(edge)
    return min(candidates)


class IlluminancePlantController:
    """One stateful illuminance controller per plant."""

    def __init__(
        self,
        hass: HomeAssistant,
        plant_id: str,
        config: IlluminanceConfig,
        *,
        adapter: MeasurementAdapter,
    ) -> None:
        self._hass = hass
        self._plant_id = plant_id
        self._config = config
        self._listeners: list[Callable[[], None]] = []
        self._active = False
        self._unsub_edge: Callable[[], None] | None = None
        self._tracker = SourceTracker(
            hass,
            is_valid=adapter.is_valid,
            on_change=self._recompute_and_notify,
            on_report=self._on_report,
        )
        self._tracker.configure(
            config.sources, stale_after=timedelta(seconds=config.stale_after_seconds)
        )
        self._evaluation_now = dt_util.utcnow()
        self._light_samples: list[illuminance_evaluator.LightSample] = []
        self._previous_low_light = False
        self._evaluation = self._evaluate_now()

    @property
    def current_evaluation(self) -> illuminance_evaluator.IlluminanceEvaluation:
        return self._evaluation

    @property
    def last_valid_at(self) -> datetime | None:
        """Most recent valid reading across this role's sources, if any."""
        return self._tracker.last_valid_at

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
        self._schedule_next_edge()
        self._recompute_and_notify(dt_util.utcnow())

    def stop(self) -> None:
        self._active = False
        self._cancel_edge()
        self._tracker.stop()

    def close(self) -> None:
        self._active = False
        self._cancel_edge()
        self._tracker.close()

    def _cancel_edge(self) -> None:
        if self._unsub_edge is not None:
            self._unsub_edge()
            self._unsub_edge = None

    def _schedule_next_edge(self) -> None:
        # Wake at the next 08:00/18:00 local edge so low_light re-evaluates the
        # daytime window without waiting for a source state change. Only roles
        # with sources need this; an unconfigured role is unavailable regardless
        # of day or night, so it schedules no timer.
        self._cancel_edge()
        if not self._active or not self._config.sources:
            return
        when = next_daytime_edge(dt_util.now())
        self._unsub_edge = async_track_point_in_time(self._hass, self._on_edge, when)

    @callback
    def _on_edge(self, _now: datetime) -> None:
        # Fired by async_track_point_in_time at the day/night edge. Recompute
        # against the current time and schedule the following edge.
        self._recompute_and_notify(dt_util.utcnow())
        self._schedule_next_edge()

    def reconfigure(self, config: IlluminanceConfig) -> None:
        self._config = config
        self._tracker.configure(
            config.sources, stale_after=timedelta(seconds=config.stale_after_seconds)
        )
        # Adding the first source starts the edge timer; removing all sources
        # cancels it.
        self._schedule_next_edge()
        self._recompute_and_notify(dt_util.utcnow())

    def _evaluate_now(self) -> illuminance_evaluator.IlluminanceEvaluation:
        readings: dict[str, illuminance_evaluator.IlluminanceReading] = {}
        observed_at: list[float] = []
        for key, tracked in self._tracker.snapshots.items():
            state = tracked.state
            readings[key] = illuminance_evaluator.IlluminanceReading(
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
            if (
                tracked.last_valid_at is not None
                and state is not None
                and (
                    self._config.aggregation != "primary"
                    or tracked.entity_id == self._config.primary_entity_id
                )
                and illuminance_evaluator.parse_illuminance(
                    state.state, state.attributes.get("unit_of_measurement")
                )
                is not None
            ):
                observed_at.append(tracked.last_valid_at.timestamp())
        timestamp = self._evaluation_now.timestamp()
        now_local = dt_util.as_local(self._evaluation_now)
        preliminary = illuminance_evaluator.evaluate(
            self._config,
            readings,
            now=timestamp,
            now_datetime=now_local,
            light_samples=tuple(self._light_samples),
            previous_low_light=self._previous_low_light,
        )
        latest = max(observed_at, default=None)
        last_sample = self._light_samples[-1] if self._light_samples else None
        if (
            preliminary.computed_available
            and not preliminary.sensor_stale
            and preliminary.computed_lux is not None
            and latest is not None
            and latest <= timestamp
            and illuminance_evaluator.is_daytime(
                dt_util.as_local(datetime.fromtimestamp(latest, tz=UTC))
            )
            and all(sample.observed_at != latest for sample in self._light_samples)
        ):
            sample = illuminance_evaluator.LightSample(latest, preliminary.computed_lux)
            if last_sample is not None and int(
                last_sample.observed_at // LIGHT_SAMPLE_BUCKET_SECONDS
            ) == int(latest // LIGHT_SAMPLE_BUCKET_SECONDS):
                self._light_samples[-1] = illuminance_evaluator.LightSample(
                    latest, max(last_sample.lux, sample.lux)
                )
            else:
                self._light_samples.append(sample)
        cutoff = timestamp - illuminance_evaluator.LOW_LIGHT_WINDOW_SECONDS
        self._light_samples = [
            sample for sample in self._light_samples if sample.observed_at >= cutoff
        ]
        evaluation = illuminance_evaluator.evaluate(
            self._config,
            readings,
            now=timestamp,
            now_datetime=now_local,
            light_samples=tuple(self._light_samples),
            previous_low_light=self._previous_low_light,
        )
        if evaluation.low_light.available:
            self._previous_low_light = evaluation.low_light.low_light
        return evaluation

    @callback
    def _on_report(self, now: datetime) -> None:
        # An identical re-report is a new light observation for the daytime
        # window. Listeners only hear about it when the result changes.
        previous = self._evaluation
        self._evaluation_now = now
        self._evaluation = self._evaluate_now()
        if self._evaluation != previous:
            self._notify()

    def _recompute_and_notify(self, now: datetime) -> None:
        self._evaluation_now = now
        self._evaluation = self._evaluate_now()
        self._notify()

    def _notify(self) -> None:
        for listener in list(self._listeners):
            try:
                listener()
            except Exception:
                _LOGGER.exception("illuminance controller listener raised; continuing")
