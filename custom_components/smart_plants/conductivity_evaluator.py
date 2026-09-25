"""Pure conductivity normalization and aggregation."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

if TYPE_CHECKING:
    from .models import ConductivityConfig, SensorSource

STATE_UNAVAILABLE: Final = "unavailable"
STATE_UNKNOWN: Final = "unknown"
CONDUCTIVITY_MICROSIEMENS_PER_CM: Final = "\N{MICRO SIGN}S/cm"
CONDUCTIVITY_GREEK_MU_MICROSIEMENS_PER_CM: Final = "\N{GREEK SMALL LETTER MU}S/cm"
CONDUCTIVITY_ASCII_MICROSIEMENS_PER_CM: Final = "uS/cm"
# Home Assistant's UnitOfConductivity.MICROSIEMENS_PER_CM uses the Greek small
# letter mu (U+03BC), while some source sensors report the micro sign (U+00B5)
# or the ASCII "uS/cm". Accept all three spellings so a sensor is not rejected
# purely because of which micro glyph it emits.
ACCEPTED_MICROSIEMENS_PER_CM_UNITS: Final = frozenset(
    {
        CONDUCTIVITY_MICROSIEMENS_PER_CM,
        CONDUCTIVITY_GREEK_MU_MICROSIEMENS_PER_CM,
        CONDUCTIVITY_ASCII_MICROSIEMENS_PER_CM,
    }
)
_CONDUCTIVITY_LOWER: Final = 0.0
_CONDUCTIVITY_UPPER: Final = 10_000.0
CONDUCTIVITY_LOW_THRESHOLD_MICROSIEMENS_PER_CM: Final = 350.0
CONDUCTIVITY_LOW_CLEAR_MICROSIEMENS_PER_CM: Final = 500.0
CONDUCTIVITY_HIGH_THRESHOLD_MICROSIEMENS_PER_CM: Final = 2000.0
CONDUCTIVITY_HIGH_CLEAR_MICROSIEMENS_PER_CM: Final = 1800.0


@dataclass(frozen=True, slots=True)
class ConductivityStressEvaluation:
    conductivity_stress: bool
    available: bool
    confidence: str
    reason: str
    low_threshold_micro_siemens_per_cm: float = (
        CONDUCTIVITY_LOW_THRESHOLD_MICROSIEMENS_PER_CM
    )
    low_clear_micro_siemens_per_cm: float = CONDUCTIVITY_LOW_CLEAR_MICROSIEMENS_PER_CM
    high_threshold_micro_siemens_per_cm: float = (
        CONDUCTIVITY_HIGH_THRESHOLD_MICROSIEMENS_PER_CM
    )
    high_clear_micro_siemens_per_cm: float = CONDUCTIVITY_HIGH_CLEAR_MICROSIEMENS_PER_CM


@dataclass(frozen=True, slots=True)
class ConductivityReading:
    entity_id: str
    value: object
    unit_of_measurement: object = None
    last_valid_at: float | None = None
    grace_until: float | None = None
    source_key: str | None = None


@dataclass(frozen=True, slots=True)
class ConductivityEvaluation:
    computed_micro_siemens_per_cm: float | None
    sensor_stale: bool
    computed_available: bool
    conductivity_stress: ConductivityStressEvaluation
    reasons: tuple[str, ...] = ()


def parse_conductivity(value: object, unit: object) -> float | None:  # noqa: PLR0911
    """Return a validated conductivity value or None for invalid input."""
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
    if unit not in ACCEPTED_MICROSIEMENS_PER_CM_UNITS:
        return None
    if not (_CONDUCTIVITY_LOWER <= numeric <= _CONDUCTIVITY_UPPER):
        return None
    return numeric


def _is_stale(
    reading: ConductivityReading,
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
    config: ConductivityConfig,
    readings: dict[str, ConductivityReading],
    *,
    now: float,
    grace_until: float | None = None,
    previous_conductivity_stress: str | None = None,
) -> ConductivityEvaluation:
    reasons: list[str] = []
    sources: tuple[SensorSource, ...] = config.sources
    thresholds = _effective_thresholds(config)
    if not sources:
        return ConductivityEvaluation(
            computed_micro_siemens_per_cm=None,
            sensor_stale=False,
            computed_available=False,
            conductivity_stress=_evaluate_conductivity_stress(
                computed_micro_siemens_per_cm=None,
                computed_available=False,
                sensor_stale=False,
                previous_stress=previous_conductivity_stress,
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
        conductivity = parse_conductivity(reading.value, reading.unit_of_measurement)
        stale = _is_stale(
            reading,
            now=now,
            stale_after_seconds=config.stale_after_seconds,
            grace_until=grace_until,
        )
        if stale:
            stale_any = True
            reasons.append(f"stale:{source.entity_id}")
        if conductivity is None:
            reasons.append(f"invalid:{source.entity_id}")
            continue
        if not stale:
            valid_values.append((stable_key, conductivity))

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
        return ConductivityEvaluation(
            computed_micro_siemens_per_cm=None,
            sensor_stale=stale_any,
            computed_available=False,
            conductivity_stress=_evaluate_conductivity_stress(
                computed_micro_siemens_per_cm=None,
                computed_available=False,
                sensor_stale=stale_any,
                previous_stress=previous_conductivity_stress,
                thresholds=thresholds,
            ),
            reasons=tuple(reasons),
        )
    computed_value = round(computed, 1)
    return ConductivityEvaluation(
        computed_micro_siemens_per_cm=computed_value,
        sensor_stale=stale_any,
        computed_available=True,
        conductivity_stress=_evaluate_conductivity_stress(
            computed_micro_siemens_per_cm=computed_value,
            computed_available=True,
            sensor_stale=stale_any,
            previous_stress=previous_conductivity_stress,
            thresholds=thresholds,
        ),
        reasons=tuple(reasons),
    )


def _effective_thresholds(
    config: ConductivityConfig,
) -> tuple[float, float, float, float]:
    return (
        config.effective_stress_threshold("low_threshold_micro_siemens_per_cm"),
        config.effective_stress_threshold("low_clear_micro_siemens_per_cm"),
        config.effective_stress_threshold("high_threshold_micro_siemens_per_cm"),
        config.effective_stress_threshold("high_clear_micro_siemens_per_cm"),
    )


def _evaluate_conductivity_stress(  # noqa: PLR0911
    *,
    computed_micro_siemens_per_cm: float | None,
    computed_available: bool,
    sensor_stale: bool,
    previous_stress: str | None,
    thresholds: tuple[float, float, float, float],
) -> ConductivityStressEvaluation:
    low_threshold, low_clear, high_threshold, high_clear = thresholds
    if not computed_available or computed_micro_siemens_per_cm is None:
        return ConductivityStressEvaluation(
            conductivity_stress=False,
            available=False,
            confidence="none",
            reason="conductivity_unavailable",
            low_threshold_micro_siemens_per_cm=low_threshold,
            low_clear_micro_siemens_per_cm=low_clear,
            high_threshold_micro_siemens_per_cm=high_threshold,
            high_clear_micro_siemens_per_cm=high_clear,
        )
    if sensor_stale:
        return ConductivityStressEvaluation(
            conductivity_stress=False,
            available=False,
            confidence="none",
            reason="conductivity_stale",
            low_threshold_micro_siemens_per_cm=low_threshold,
            low_clear_micro_siemens_per_cm=low_clear,
            high_threshold_micro_siemens_per_cm=high_threshold,
            high_clear_micro_siemens_per_cm=high_clear,
        )
    if previous_stress == "low":
        stress = computed_micro_siemens_per_cm < low_clear
        return ConductivityStressEvaluation(
            conductivity_stress=stress,
            available=True,
            confidence="low",
            reason="low_conductivity_stress" if stress else "conductivity_ok",
            low_threshold_micro_siemens_per_cm=low_threshold,
            low_clear_micro_siemens_per_cm=low_clear,
            high_threshold_micro_siemens_per_cm=high_threshold,
            high_clear_micro_siemens_per_cm=high_clear,
        )
    if previous_stress == "high":
        stress = computed_micro_siemens_per_cm > high_clear
        return ConductivityStressEvaluation(
            conductivity_stress=stress,
            available=True,
            confidence="low",
            reason="high_conductivity_stress" if stress else "conductivity_ok",
            low_threshold_micro_siemens_per_cm=low_threshold,
            low_clear_micro_siemens_per_cm=low_clear,
            high_threshold_micro_siemens_per_cm=high_threshold,
            high_clear_micro_siemens_per_cm=high_clear,
        )
    if computed_micro_siemens_per_cm <= low_threshold:
        return ConductivityStressEvaluation(
            conductivity_stress=True,
            available=True,
            confidence="low",
            reason="low_conductivity_stress",
            low_threshold_micro_siemens_per_cm=low_threshold,
            low_clear_micro_siemens_per_cm=low_clear,
            high_threshold_micro_siemens_per_cm=high_threshold,
            high_clear_micro_siemens_per_cm=high_clear,
        )
    if computed_micro_siemens_per_cm >= high_threshold:
        return ConductivityStressEvaluation(
            conductivity_stress=True,
            available=True,
            confidence="low",
            reason="high_conductivity_stress",
            low_threshold_micro_siemens_per_cm=low_threshold,
            low_clear_micro_siemens_per_cm=low_clear,
            high_threshold_micro_siemens_per_cm=high_threshold,
            high_clear_micro_siemens_per_cm=high_clear,
        )
    return ConductivityStressEvaluation(
        conductivity_stress=False,
        available=True,
        confidence="low",
        reason="conductivity_ok",
        low_threshold_micro_siemens_per_cm=low_threshold,
        low_clear_micro_siemens_per_cm=low_clear,
        high_threshold_micro_siemens_per_cm=high_threshold,
        high_clear_micro_siemens_per_cm=high_clear,
    )
