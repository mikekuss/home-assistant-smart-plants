"""Pure ambient-temperature normalization and aggregation."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

from homeassistant.const import UnitOfTemperature

if TYPE_CHECKING:
    from .models import SensorSource, TemperatureConfig

STATE_UNAVAILABLE: Final = "unavailable"
STATE_UNKNOWN: Final = "unknown"
_CELSIUS_LOWER: Final = -40.0
_CELSIUS_UPPER: Final = 80.0
TEMPERATURE_COLD_THRESHOLD_CELSIUS: Final = 10.0
TEMPERATURE_COLD_CLEAR_CELSIUS: Final = 12.0
TEMPERATURE_HOT_THRESHOLD_CELSIUS: Final = 35.0
TEMPERATURE_HOT_CLEAR_CELSIUS: Final = 32.0


@dataclass(frozen=True, slots=True)
class TemperatureStressEvaluation:
    temperature_stress: bool
    available: bool
    confidence: str
    reason: str
    cold_threshold_celsius: float = TEMPERATURE_COLD_THRESHOLD_CELSIUS
    cold_clear_celsius: float = TEMPERATURE_COLD_CLEAR_CELSIUS
    hot_threshold_celsius: float = TEMPERATURE_HOT_THRESHOLD_CELSIUS
    hot_clear_celsius: float = TEMPERATURE_HOT_CLEAR_CELSIUS


@dataclass(frozen=True, slots=True)
class TemperatureReading:
    entity_id: str
    value: object
    unit_of_measurement: object = None
    last_valid_at: float | None = None
    grace_until: float | None = None
    source_key: str | None = None


@dataclass(frozen=True, slots=True)
class TemperatureEvaluation:
    computed_celsius: float | None
    sensor_stale: bool
    computed_available: bool
    temperature_stress: TemperatureStressEvaluation
    reasons: tuple[str, ...] = ()


def parse_temperature(value: object, unit: object) -> float | None:  # noqa: PLR0911
    """Return a validated Celsius value or None for invalid input."""
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
    if unit == UnitOfTemperature.CELSIUS:
        celsius = numeric
    elif unit == UnitOfTemperature.FAHRENHEIT:
        celsius = (numeric - 32.0) * 5.0 / 9.0
    elif unit == UnitOfTemperature.KELVIN:
        celsius = numeric - 273.15
    else:
        return None
    if not (_CELSIUS_LOWER <= celsius <= _CELSIUS_UPPER):
        return None
    return celsius


def _is_stale(
    reading: TemperatureReading,
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
    config: TemperatureConfig,
    readings: dict[str, TemperatureReading],
    *,
    now: float,
    grace_until: float | None = None,
    previous_temperature_stress: str | None = None,
) -> TemperatureEvaluation:
    reasons: list[str] = []
    sources: tuple[SensorSource, ...] = config.sources
    thresholds = _effective_thresholds(config)
    if not sources:
        return TemperatureEvaluation(
            computed_celsius=None,
            sensor_stale=False,
            computed_available=False,
            temperature_stress=_evaluate_temperature_stress(
                computed_celsius=None,
                computed_available=False,
                sensor_stale=False,
                previous_stress=previous_temperature_stress,
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
        celsius = parse_temperature(reading.value, reading.unit_of_measurement)
        stale = _is_stale(
            reading,
            now=now,
            stale_after_seconds=config.stale_after_seconds,
            grace_until=grace_until,
        )
        if stale:
            stale_any = True
            reasons.append(f"stale:{source.entity_id}")
        if celsius is None:
            reasons.append(f"invalid:{source.entity_id}")
            continue
        if not stale:
            valid_values.append((stable_key, celsius))

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
        return TemperatureEvaluation(
            computed_celsius=None,
            sensor_stale=stale_any,
            computed_available=False,
            temperature_stress=_evaluate_temperature_stress(
                computed_celsius=None,
                computed_available=False,
                sensor_stale=stale_any,
                previous_stress=previous_temperature_stress,
                thresholds=thresholds,
            ),
            reasons=tuple(reasons),
        )
    computed_celsius = round(computed, 1)
    return TemperatureEvaluation(
        computed_celsius=computed_celsius,
        sensor_stale=stale_any,
        computed_available=True,
        temperature_stress=_evaluate_temperature_stress(
            computed_celsius=computed_celsius,
            computed_available=True,
            sensor_stale=stale_any,
            previous_stress=previous_temperature_stress,
            thresholds=thresholds,
        ),
        reasons=tuple(reasons),
    )


def _effective_thresholds(
    config: TemperatureConfig,
) -> tuple[float, float, float, float]:
    """Resolve (cold_threshold, cold_clear, hot_threshold, hot_clear) in °C."""
    return (
        config.effective_stress_threshold("cold_threshold_celsius"),
        config.effective_stress_threshold("cold_clear_celsius"),
        config.effective_stress_threshold("hot_threshold_celsius"),
        config.effective_stress_threshold("hot_clear_celsius"),
    )


def _evaluate_temperature_stress(  # noqa: PLR0911
    *,
    computed_celsius: float | None,
    computed_available: bool,
    sensor_stale: bool,
    previous_stress: str | None,
    thresholds: tuple[float, float, float, float],
) -> TemperatureStressEvaluation:
    cold_threshold, cold_clear, hot_threshold, hot_clear = thresholds
    if not computed_available or computed_celsius is None:
        return TemperatureStressEvaluation(
            temperature_stress=False,
            available=False,
            confidence="none",
            reason="temperature_unavailable",
            cold_threshold_celsius=cold_threshold,
            cold_clear_celsius=cold_clear,
            hot_threshold_celsius=hot_threshold,
            hot_clear_celsius=hot_clear,
        )
    if sensor_stale:
        return TemperatureStressEvaluation(
            temperature_stress=False,
            available=False,
            confidence="none",
            reason="temperature_stale",
            cold_threshold_celsius=cold_threshold,
            cold_clear_celsius=cold_clear,
            hot_threshold_celsius=hot_threshold,
            hot_clear_celsius=hot_clear,
        )
    if previous_stress == "cold":
        stress = computed_celsius < cold_clear
        return TemperatureStressEvaluation(
            temperature_stress=stress,
            available=True,
            confidence="low",
            reason="cold_stress" if stress else "temperature_ok",
            cold_threshold_celsius=cold_threshold,
            cold_clear_celsius=cold_clear,
            hot_threshold_celsius=hot_threshold,
            hot_clear_celsius=hot_clear,
        )
    if previous_stress == "hot":
        stress = computed_celsius > hot_clear
        return TemperatureStressEvaluation(
            temperature_stress=stress,
            available=True,
            confidence="low",
            reason="hot_stress" if stress else "temperature_ok",
            cold_threshold_celsius=cold_threshold,
            cold_clear_celsius=cold_clear,
            hot_threshold_celsius=hot_threshold,
            hot_clear_celsius=hot_clear,
        )
    if computed_celsius <= cold_threshold:
        return TemperatureStressEvaluation(
            temperature_stress=True,
            available=True,
            confidence="low",
            reason="cold_stress",
            cold_threshold_celsius=cold_threshold,
            cold_clear_celsius=cold_clear,
            hot_threshold_celsius=hot_threshold,
            hot_clear_celsius=hot_clear,
        )
    if computed_celsius >= hot_threshold:
        return TemperatureStressEvaluation(
            temperature_stress=True,
            available=True,
            confidence="low",
            reason="hot_stress",
            cold_threshold_celsius=cold_threshold,
            cold_clear_celsius=cold_clear,
            hot_threshold_celsius=hot_threshold,
            hot_clear_celsius=hot_clear,
        )
    return TemperatureStressEvaluation(
        temperature_stress=False,
        available=True,
        confidence="low",
        reason="temperature_ok",
        cold_threshold_celsius=cold_threshold,
        cold_clear_celsius=cold_clear,
        hot_threshold_celsius=hot_threshold,
        hot_clear_celsius=hot_clear,
    )
