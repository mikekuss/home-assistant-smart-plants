"""Pure ambient-humidity normalization and aggregation."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

from homeassistant.const import PERCENTAGE

if TYPE_CHECKING:
    from .models import HumidityConfig, SensorSource

STATE_UNAVAILABLE: Final = "unavailable"
STATE_UNKNOWN: Final = "unknown"
_HUMIDITY_LOWER: Final = 0.0
_HUMIDITY_UPPER: Final = 100.0
HUMIDITY_DRY_THRESHOLD_PERCENT: Final = 25.0
HUMIDITY_DRY_CLEAR_PERCENT: Final = 30.0
HUMIDITY_DAMP_THRESHOLD_PERCENT: Final = 85.0
HUMIDITY_DAMP_CLEAR_PERCENT: Final = 80.0


@dataclass(frozen=True, slots=True)
class HumidityStressEvaluation:
    humidity_stress: bool
    available: bool
    confidence: str
    reason: str
    dry_threshold_percent: float = HUMIDITY_DRY_THRESHOLD_PERCENT
    dry_clear_percent: float = HUMIDITY_DRY_CLEAR_PERCENT
    damp_threshold_percent: float = HUMIDITY_DAMP_THRESHOLD_PERCENT
    damp_clear_percent: float = HUMIDITY_DAMP_CLEAR_PERCENT


@dataclass(frozen=True, slots=True)
class HumidityReading:
    entity_id: str
    value: object
    unit_of_measurement: object = None
    last_valid_at: float | None = None
    grace_until: float | None = None
    source_key: str | None = None


@dataclass(frozen=True, slots=True)
class HumidityEvaluation:
    computed_percent: float | None
    sensor_stale: bool
    computed_available: bool
    humidity_stress: HumidityStressEvaluation
    reasons: tuple[str, ...] = ()


def parse_humidity(value: object, unit: object) -> float | None:  # noqa: PLR0911
    """Return a validated relative-humidity percent value or None."""
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
    if not (_HUMIDITY_LOWER <= numeric <= _HUMIDITY_UPPER):
        return None
    return numeric


def _is_stale(
    reading: HumidityReading,
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
    config: HumidityConfig,
    readings: dict[str, HumidityReading],
    *,
    now: float,
    grace_until: float | None = None,
    previous_humidity_stress: str | None = None,
) -> HumidityEvaluation:
    reasons: list[str] = []
    sources: tuple[SensorSource, ...] = config.sources
    thresholds = _effective_thresholds(config)
    if not sources:
        return HumidityEvaluation(
            computed_percent=None,
            sensor_stale=False,
            computed_available=False,
            humidity_stress=_evaluate_humidity_stress(
                computed_percent=None,
                computed_available=False,
                sensor_stale=False,
                previous_stress=previous_humidity_stress,
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
        humidity = parse_humidity(reading.value, reading.unit_of_measurement)
        stale = _is_stale(
            reading,
            now=now,
            stale_after_seconds=config.stale_after_seconds,
            grace_until=grace_until,
        )
        if stale:
            stale_any = True
            reasons.append(f"stale:{source.entity_id}")
        if humidity is None:
            reasons.append(f"invalid:{source.entity_id}")
            continue
        if not stale:
            valid_values.append((stable_key, humidity))

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
        return HumidityEvaluation(
            computed_percent=None,
            sensor_stale=stale_any,
            computed_available=False,
            humidity_stress=_evaluate_humidity_stress(
                computed_percent=None,
                computed_available=False,
                sensor_stale=stale_any,
                previous_stress=previous_humidity_stress,
                thresholds=thresholds,
            ),
            reasons=tuple(reasons),
        )
    computed_percent = round(computed, 1)
    return HumidityEvaluation(
        computed_percent=computed_percent,
        sensor_stale=stale_any,
        computed_available=True,
        humidity_stress=_evaluate_humidity_stress(
            computed_percent=computed_percent,
            computed_available=True,
            sensor_stale=stale_any,
            previous_stress=previous_humidity_stress,
            thresholds=thresholds,
        ),
        reasons=tuple(reasons),
    )


def _effective_thresholds(config: HumidityConfig) -> tuple[float, float, float, float]:
    return (
        config.effective_stress_threshold("dry_threshold_percent"),
        config.effective_stress_threshold("dry_clear_percent"),
        config.effective_stress_threshold("damp_threshold_percent"),
        config.effective_stress_threshold("damp_clear_percent"),
    )


def _evaluate_humidity_stress(  # noqa: PLR0911
    *,
    computed_percent: float | None,
    computed_available: bool,
    sensor_stale: bool,
    previous_stress: str | None,
    thresholds: tuple[float, float, float, float],
) -> HumidityStressEvaluation:
    dry_threshold, dry_clear, damp_threshold, damp_clear = thresholds
    if not computed_available or computed_percent is None:
        return HumidityStressEvaluation(
            humidity_stress=False,
            available=False,
            confidence="none",
            reason="humidity_unavailable",
            dry_threshold_percent=dry_threshold,
            dry_clear_percent=dry_clear,
            damp_threshold_percent=damp_threshold,
            damp_clear_percent=damp_clear,
        )
    if sensor_stale:
        return HumidityStressEvaluation(
            humidity_stress=False,
            available=False,
            confidence="none",
            reason="humidity_stale",
            dry_threshold_percent=dry_threshold,
            dry_clear_percent=dry_clear,
            damp_threshold_percent=damp_threshold,
            damp_clear_percent=damp_clear,
        )
    if previous_stress == "dry":
        stress = computed_percent < dry_clear
        return HumidityStressEvaluation(
            humidity_stress=stress,
            available=True,
            confidence="low",
            reason="dry_stress" if stress else "humidity_ok",
            dry_threshold_percent=dry_threshold,
            dry_clear_percent=dry_clear,
            damp_threshold_percent=damp_threshold,
            damp_clear_percent=damp_clear,
        )
    if previous_stress == "damp":
        stress = computed_percent > damp_clear
        return HumidityStressEvaluation(
            humidity_stress=stress,
            available=True,
            confidence="low",
            reason="damp_stress" if stress else "humidity_ok",
            dry_threshold_percent=dry_threshold,
            dry_clear_percent=dry_clear,
            damp_threshold_percent=damp_threshold,
            damp_clear_percent=damp_clear,
        )
    if computed_percent <= dry_threshold:
        return HumidityStressEvaluation(
            humidity_stress=True,
            available=True,
            confidence="low",
            reason="dry_stress",
            dry_threshold_percent=dry_threshold,
            dry_clear_percent=dry_clear,
            damp_threshold_percent=damp_threshold,
            damp_clear_percent=damp_clear,
        )
    if computed_percent >= damp_threshold:
        return HumidityStressEvaluation(
            humidity_stress=True,
            available=True,
            confidence="low",
            reason="damp_stress",
            dry_threshold_percent=dry_threshold,
            dry_clear_percent=dry_clear,
            damp_threshold_percent=damp_threshold,
            damp_clear_percent=damp_clear,
        )
    return HumidityStressEvaluation(
        humidity_stress=False,
        available=True,
        confidence="low",
        reason="humidity_ok",
        dry_threshold_percent=dry_threshold,
        dry_clear_percent=dry_clear,
        damp_threshold_percent=damp_threshold,
        damp_clear_percent=damp_clear,
    )
