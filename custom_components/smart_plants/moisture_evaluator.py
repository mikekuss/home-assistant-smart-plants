"""
Phase 4 Cut 2: pure moisture evaluation.

This module owns the *logic* of turning a plant's moisture config plus a
snapshot of source-state readings into a typed evaluation. It performs
no I/O and holds no state beyond what the caller passes in. Availability
reasons are surfaced explicitly so the entities in Cut 3 can go
unavailable rather than emit synthetic healthy/off values.

Design contract:

* Normalization: only accept numeric percent values in 0..100 with a
    unit of ``%``. Unitless, ``STATE_UNAVAILABLE``, ``STATE_UNKNOWN``, non-numeric,
  out-of-range, and incompatible-unit samples are ``invalid`` inputs.
* Aggregation: ``primary`` never silently falls back. ``average``,
  ``min``, ``max`` exclude ``invalid`` or stale members and return
  unavailable when none remain.
* Staleness: caller supplies ``now`` and ``last_valid_at`` for each
  source; no wall-clock reads happen inside the evaluator. A missing
  ``last_valid_at`` is treated as fresh (the ``async_setup_entry`` grace
  window is enforced by the caller).
* Score: piecewise linear anchors 0/50/100/50/0 at 0/min/target/max/100
  with ``floor(score + 0.5)`` rounding.
* Hysteresis: ``needs_water`` on when computed_percent < min, and off
  when it reaches min+2 (previously on). ``too_wet`` on when
  computed_percent > max, off at max-2. Exact boundary equality is
  documented in the return contract's unit tests.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

if TYPE_CHECKING:
    from .models import MoistureConfig, SensorSource

STATE_UNAVAILABLE: Final = "unavailable"
STATE_UNKNOWN: Final = "unknown"
_PERCENT_LOWER: Final = 0
_PERCENT_UPPER: Final = 100
HYSTERESIS_OFFSET: Final = 2


@dataclass(frozen=True, slots=True)
class SourceReading:
    """
    A single source-state snapshot handed to the evaluator.

    ``value`` and ``unit_of_measurement`` come from HA's state object.
    ``last_valid_at`` is the wall-clock time when this source most
    recently produced a *valid* reading; ``None`` means "never observed
    valid" and, combined with the assignment/restart grace applied by
    the caller, defers staleness rather than immediately flagging it.
    """

    entity_id: str
    value: object
    unit_of_measurement: object = None
    last_valid_at: float | None = None
    grace_until: float | None = None
    source_key: str | None = None


@dataclass(frozen=True, slots=True)
class MoistureEvaluation:
    """
    Result of evaluating a plant's moisture config.

    ``computed_percent`` is the aggregated moisture value; ``None`` when
    no valid input remains. ``health_score`` is the piecewise-linear
    moisture-only score anchored on the plant's thresholds. Boolean
    problem states default to their idle values when the aggregate is
    unavailable — callers use ``computed_available`` to flip the paired
    binary_sensors to ``unavailable`` rather than false-negative off.
    """

    computed_percent: float | None
    health_score: int | None
    needs_water: bool
    too_wet: bool
    sensor_stale: bool
    computed_available: bool
    reasons: tuple[str, ...] = ()


def parse_measurement(value: object, unit: object) -> float | None:  # noqa: PLR0911
    """Return a validated percent value or None for any invalid input."""
    if isinstance(value, bool):
        return None
    if value in (None, STATE_UNAVAILABLE, STATE_UNKNOWN, ""):
        return None
    if not isinstance(unit, str) or unit.strip() != "%":
        return None
    if isinstance(value, (int, float)):
        numeric: float = float(value)
    elif isinstance(value, str):
        try:
            numeric = float(value)
        except ValueError:
            return None
    else:
        return None
    if math.isnan(numeric) or math.isinf(numeric):
        return None
    if not (_PERCENT_LOWER <= numeric <= _PERCENT_UPPER):
        return None
    return numeric


def _is_stale(
    reading: SourceReading,
    *,
    now: float,
    stale_after_seconds: int,
    grace_until: float | None,
) -> bool:
    effective_grace = reading.grace_until
    if effective_grace is None:
        effective_grace = grace_until
    if effective_grace is not None and now < effective_grace:
        return False
    if reading.last_valid_at is None:
        # No valid reading observed yet: caller's grace decides whether
        # this counts as stale; without grace we treat it as stale so a
        # persistently-broken source lights up the stale binary sensor.
        return effective_grace is None or now >= effective_grace
    return (now - reading.last_valid_at) >= stale_after_seconds


def _score(percent: float, config: MoistureConfig) -> int:
    """Piecewise-linear moisture-only health score."""
    mn = config.moisture_min
    tg = config.moisture_target
    mx = config.moisture_max
    if percent <= 0:
        raw = 0.0
    elif percent < mn:
        raw = (percent / mn) * 50.0
    elif percent < tg:
        raw = 50.0 + ((percent - mn) / (tg - mn)) * 50.0
    elif percent == tg:
        raw = 100.0
    elif percent <= mx:
        raw = 100.0 - ((percent - tg) / (mx - tg)) * 50.0
    elif percent < _PERCENT_UPPER:
        raw = 50.0 - ((percent - mx) / (_PERCENT_UPPER - mx)) * 50.0
    else:
        raw = 0.0
    # floor(score + 0.5): documented tie-break that rounds .5 up for
    # non-negative values.
    return math.floor(raw + 0.5)


def evaluate(  # noqa: PLR0913, PLR0912, PLR0915
    config: MoistureConfig,
    readings: dict[str, SourceReading],
    *,
    now: float,
    grace_until: float | None = None,
    previous_needs_water: bool = False,
    previous_too_wet: bool = False,
    watering_grace: bool = False,
) -> MoistureEvaluation:
    """
    Evaluate ``config`` against a dict of ``entity_id -> SourceReading``.

    ``previous_needs_water`` / ``previous_too_wet`` supply the hysteresis
    history from the caller. ``grace_until`` is a caller-supplied
    absolute time; below it, sources with no valid reading yet are not
    considered stale — this implements the assignment/restart grace.
    """
    reasons: list[str] = []
    sources: tuple[SensorSource, ...] = config.sources

    if not sources:
        # No assignments: the stale binary sensor stays off and every
        # computed entity is unavailable.
        reasons.append("no_sources")
        return MoistureEvaluation(
            computed_percent=None,
            health_score=None,
            needs_water=False,
            too_wet=False,
            sensor_stale=False,
            computed_available=False,
            reasons=tuple(reasons),
        )

    stale_any = False
    valid_values: list[tuple[str, float]] = []
    for src in sources:
        stable_key = src.registry_id or src.entity_id
        reading = readings.get(stable_key)
        if reading is None:
            # Registered source missing from HA (never returned a state
            # snapshot); the phase spec flags this as stale immediately.
            stale_any = True
            reasons.append(f"missing:{src.entity_id}")
            continue
        percent = parse_measurement(reading.value, reading.unit_of_measurement)
        stale = _is_stale(
            reading,
            now=now,
            stale_after_seconds=config.stale_after_seconds,
            grace_until=grace_until,
        )
        if stale:
            stale_any = True
            reasons.append(f"stale:{src.entity_id}")
        if percent is None:
            reasons.append(f"invalid:{src.entity_id}")
            continue
        if stale:
            # Stale sources are excluded from non-primary aggregations
            # AND invalidate primary when the primary source is stale.
            continue
        valid_values.append((stable_key, percent))

    computed: float | None = None
    if config.aggregation == "primary":
        primary = next(
            (src for src in sources if src.entity_id == config.primary_entity_id), None
        )
        if primary is None:
            reasons.append("no_primary")
        else:
            primary_key = primary.registry_id or primary.entity_id
            match = next((v for key, v in valid_values if key == primary_key), None)
            if match is None:
                reasons.append(f"primary_invalid:{primary.entity_id}")
            else:
                computed = match
    else:
        values = [v for _eid, v in valid_values]
        if not values:
            reasons.append("no_valid_members")
        elif config.aggregation == "average":
            computed = sum(values) / len(values)
        elif config.aggregation == "min":
            computed = min(values)
        elif config.aggregation == "max":
            computed = max(values)

    if computed is None:
        return MoistureEvaluation(
            computed_percent=None,
            health_score=None,
            needs_water=False,
            too_wet=False,
            sensor_stale=stale_any,
            computed_available=False,
            reasons=tuple(reasons),
        )

    health = _score(computed, config)
    needs_water = _apply_hysteresis(
        computed,
        threshold=config.moisture_min,
        off_boundary=config.moisture_min + HYSTERESIS_OFFSET,
        direction="below",
        previous=previous_needs_water,
    )
    if watering_grace:
        needs_water = False
    too_wet = _apply_hysteresis(
        computed,
        threshold=config.moisture_max,
        off_boundary=config.moisture_max - HYSTERESIS_OFFSET,
        direction="above",
        previous=previous_too_wet,
    )
    return MoistureEvaluation(
        computed_percent=computed,
        health_score=health,
        needs_water=needs_water,
        too_wet=too_wet,
        sensor_stale=stale_any,
        computed_available=True,
        reasons=tuple(reasons),
    )


def _apply_hysteresis(
    value: float,
    *,
    threshold: float,
    off_boundary: float,
    direction: str,
    previous: bool,
) -> bool:
    """Two-point hysteresis: on when past ``threshold``, off at ``off_boundary``."""
    if direction == "below":
        if value < threshold:
            return True
        # Once on, stay on until the aggregate reaches min+2.
        return bool(previous and value < off_boundary)
    if value > threshold:
        return True
    return bool(previous and value > off_boundary)
