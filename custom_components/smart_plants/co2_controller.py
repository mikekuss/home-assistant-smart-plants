"""Per-plant CO2 evaluation driven by tracked source state."""

from __future__ import annotations

import contextlib
import logging
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from homeassistant.util import dt as dt_util

from .co2_evaluator import Co2Evaluation, Co2Reading, evaluate
from .source_tracker import SourceTracker

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .models import Co2Config
    from .roles import MeasurementAdapter

_LOGGER = logging.getLogger(__name__)


class Co2PlantController:
    """One stateful CO2 controller per plant."""

    def __init__(
        self,
        hass: HomeAssistant,
        plant_id: str,
        config: Co2Config,
        *,
        adapter: MeasurementAdapter,
    ) -> None:
        self._plant_id = plant_id
        self._config = config
        self._listeners: list[Callable[[], None]] = []
        self._active = False
        self._tracker = SourceTracker(
            hass,
            is_valid=adapter.is_valid,
            on_change=self._recompute_and_notify,
        )
        self._tracker.configure(
            config.sources, stale_after=timedelta(seconds=config.stale_after_seconds)
        )
        self._evaluation_now = dt_util.utcnow()
        self._previous_co2_stress = False
        self._evaluation = self._evaluate_now()

    @property
    def current_evaluation(self) -> Co2Evaluation:
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
        self._recompute_and_notify(dt_util.utcnow())

    def stop(self) -> None:
        self._active = False
        self._tracker.stop()

    def close(self) -> None:
        self._active = False
        self._tracker.close()

    def reconfigure(self, config: Co2Config) -> None:
        self._config = config
        self._tracker.configure(
            config.sources, stale_after=timedelta(seconds=config.stale_after_seconds)
        )
        self._recompute_and_notify(dt_util.utcnow())

    def _evaluate_now(self) -> Co2Evaluation:
        readings: dict[str, Co2Reading] = {}
        for key, tracked in self._tracker.snapshots.items():
            state = tracked.state
            readings[key] = Co2Reading(
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
        evaluation = evaluate(
            self._config,
            readings,
            now=self._evaluation_now.timestamp(),
            previous_co2_stress=self._previous_co2_stress,
        )
        if evaluation.co2_stress.available:
            self._previous_co2_stress = evaluation.co2_stress.co2_stress
        return evaluation

    def _recompute_and_notify(self, now: datetime) -> None:
        self._evaluation_now = now
        self._evaluation = self._evaluate_now()
        for listener in list(self._listeners):
            try:
                listener()
            except Exception:
                _LOGGER.exception("CO2 controller listener raised; continuing")
