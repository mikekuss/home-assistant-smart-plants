"""Pure battery normalization and aggregation."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

from homeassistant.const import PERCENTAGE

if TYPE_CHECKING:
    from .models import BatteryConfig, SensorSource

STATE_UNAVAILABLE: Final = "unavailable"
STATE_UNKNOWN: Final = "unknown"
_BATTERY_LOWER: Final = 0.0
_BATTERY_UPPER: Final = 100.0
LOW_BATTERY_THRESHOLD_PERCENT: Final = 20
LOW_BATTERY_CLEAR_PERCENT: Final = 25


@dataclass(frozen=True, slots=True)
class BatteryReading:
    entity_id: str
    value: object
    unit_of_measurement: object = None
    last_valid_at: float | None = None
    grace_until: float | None = None
    source_key: str | None = None


@dataclass(frozen=True, slots=True)
class LowBatteryEvaluation:
    low_battery: bool
    available: bool
    confidence: str
    reason: str
    threshold_percent: int = LOW_BATTERY_THRESHOLD_PERCENT
    clear_percent: int = LOW_BATTERY_CLEAR_PERCENT


@dataclass(frozen=True, slots=True)
class BatteryEvaluation:
    computed_percent: int | None
    sensor_stale: bool
    computed_available: bool
    low_battery: LowBatteryEvaluation
    reasons: tuple[str, ...] = ()


def parse_battery(value: object, unit: object) -> float | None:  # noqa: PLR0911
    """Return a validated battery percent or None for invalid input."""
    if isinstance(value, bool):
        return None
    if value in (None, STATE_UNAVAILABLE, STATE_UNKNOWN, ""):
        return None
    if isinstance(value, (int, float)):
        numeric = float(value)
    elif isinstance(value, str):
        try:
            numeric = float(value)
        except ValueError:
            return None
    else:
        return None
    if math.isnan(numeric) or math.isinf(numeric):
        return None
    if unit != PERCENTAGE:
        return None
    if not (_BATTERY_LOWER <= numeric <= _BATTERY_UPPER):
        return None
    return numeric


def _round_percent(value: float) -> int:
    return math.floor(value + 0.5)


def _is_stale(
    reading: BatteryReading,
    *,
    now: float,
    stale_after_seconds: int,
    grace_until: float | None,
) -> bool:
    effective_grace = (
        reading.grace_until if reading.grace_until is not None else grace_until
    )
    if effective_grace is not None and now < effective_grace:
        return False
    if reading.last_valid_at is None:
        return effective_grace is None or now >= effective_grace
    return (now - reading.last_valid_at) >= stale_after_seconds


def evaluate(  # noqa: PLR0912
    config: BatteryConfig,
    readings: dict[str, BatteryReading],
    *,
    now: float,
    grace_until: float | None = None,
    previous_low_battery: bool = False,
) -> BatteryEvaluation:
    reasons: list[str] = []
    sources: tuple[SensorSource, ...] = config.sources
    thresholds = _effective_thresholds(config)
    if not sources:
        return BatteryEvaluation(
            computed_percent=None,
            sensor_stale=False,
            computed_available=False,
            low_battery=_evaluate_low_battery(
                computed_percent=None,
                computed_available=False,
                sensor_stale=False,
                previous_low_battery=previous_low_battery,
                thresholds=thresholds,
            ),
            reasons=("no_sources",),
        )

    stale_any = False
    valid_values: list[tuple[str, float]] = []
    for source in sources:
        stable_key = source.registry_id or source.entity_id
        reading = readings.get(stable_key)
        if reading is None:
            stale_any = True
            reasons.append(f"missing:{source.entity_id}")
            continue
        percent = parse_battery(reading.value, reading.unit_of_measurement)
        stale = _is_stale(
            reading,
            now=now,
            stale_after_seconds=config.stale_after_seconds,
            grace_until=grace_until,
        )
        if stale:
            stale_any = True
            reasons.append(f"stale:{source.entity_id}")
        if percent is None:
            reasons.append(f"invalid:{source.entity_id}")
            continue
        if not stale:
            valid_values.append((stable_key, percent))

    computed: float | None = None
    if config.aggregation == "primary":
        primary = next(
            (
                source
                for source in sources
                if source.entity_id == config.primary_entity_id
            ),
            None,
        )
        if primary is None:
            reasons.append("no_primary")
        else:
            primary_key = primary.registry_id or primary.entity_id
            computed = next(
                (value for key, value in valid_values if key == primary_key), None
            )
            if computed is None:
                reasons.append(f"primary_invalid:{primary.entity_id}")
    else:
        values = [value for _key, value in valid_values]
        if not values:
            reasons.append("no_valid_members")
        elif config.aggregation == "average":
            computed = sum(values) / len(values)
        elif config.aggregation == "min":
            computed = min(values)
        elif config.aggregation == "max":
            computed = max(values)

    if computed is None:
        return BatteryEvaluation(
            computed_percent=None,
            sensor_stale=stale_any,
            computed_available=False,
            low_battery=_evaluate_low_battery(
                computed_percent=None,
                computed_available=False,
                sensor_stale=stale_any,
                previous_low_battery=previous_low_battery,
                thresholds=thresholds,
            ),
            reasons=tuple(reasons),
        )
    computed_percent = _round_percent(computed)
    return BatteryEvaluation(
        computed_percent=computed_percent,
        sensor_stale=stale_any,
        computed_available=True,
        low_battery=_evaluate_low_battery(
            computed_percent=computed_percent,
            computed_available=True,
            sensor_stale=stale_any,
            previous_low_battery=previous_low_battery,
            thresholds=thresholds,
        ),
        reasons=tuple(reasons),
    )


def _effective_thresholds(config: BatteryConfig) -> tuple[int, int]:
    return (
        config.effective_stress_threshold("threshold_percent"),
        config.effective_stress_threshold("clear_percent"),
    )


def _evaluate_low_battery(
    *,
    computed_percent: int | None,
    computed_available: bool,
    sensor_stale: bool,
    previous_low_battery: bool,
    thresholds: tuple[int, int],
) -> LowBatteryEvaluation:
    threshold_percent, clear_percent = thresholds
    if not computed_available or computed_percent is None:
        return LowBatteryEvaluation(
            low_battery=False,
            available=False,
            confidence="none",
            reason="battery_unavailable",
            threshold_percent=threshold_percent,
            clear_percent=clear_percent,
        )
    if sensor_stale:
        return LowBatteryEvaluation(
            low_battery=False,
            available=False,
            confidence="none",
            reason="battery_stale",
            threshold_percent=threshold_percent,
            clear_percent=clear_percent,
        )
    if previous_low_battery:
        low_battery = computed_percent < clear_percent
    else:
        low_battery = computed_percent <= threshold_percent
    return LowBatteryEvaluation(
        low_battery=low_battery,
        available=True,
        confidence="low",
        reason="low_battery" if low_battery else "battery_ok",
        threshold_percent=threshold_percent,
        clear_percent=clear_percent,
    )
