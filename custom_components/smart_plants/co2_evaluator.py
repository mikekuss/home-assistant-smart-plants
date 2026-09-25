"""Pure ambient-CO2 normalization and aggregation."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

if TYPE_CHECKING:
    from .models import Co2Config, SensorSource

CO2_PARTS_PER_MILLION: Final = "ppm"
STATE_UNAVAILABLE: Final = "unavailable"
STATE_UNKNOWN: Final = "unknown"
_CO2_LOWER: Final = 0.0
_CO2_UPPER: Final = 10000.0
CO2_STRESS_THRESHOLD_PPM: Final = 5000
CO2_STRESS_CLEAR_PPM: Final = 4000


@dataclass(frozen=True, slots=True)
class Co2StressEvaluation:
    co2_stress: bool
    available: bool
    confidence: str
    reason: str
    threshold_ppm: int = CO2_STRESS_THRESHOLD_PPM
    clear_ppm: int = CO2_STRESS_CLEAR_PPM


@dataclass(frozen=True, slots=True)
class Co2Reading:
    entity_id: str
    value: object
    unit_of_measurement: object = None
    last_valid_at: float | None = None
    grace_until: float | None = None
    source_key: str | None = None


@dataclass(frozen=True, slots=True)
class Co2Evaluation:
    computed_ppm: int | None
    sensor_stale: bool
    computed_available: bool
    co2_stress: Co2StressEvaluation
    reasons: tuple[str, ...] = ()


def parse_co2(value: object, unit: object) -> float | None:  # noqa: PLR0911
    """Return a validated CO2 ppm value or None for invalid input."""
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
    if unit != CO2_PARTS_PER_MILLION:
        return None
    if not (_CO2_LOWER <= numeric <= _CO2_UPPER):
        return None
    return numeric


def _round_ppm(value: float) -> int:
    return math.floor(value + 0.5)


def _is_stale(
    reading: Co2Reading,
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
    config: Co2Config,
    readings: dict[str, Co2Reading],
    *,
    now: float,
    grace_until: float | None = None,
    previous_co2_stress: bool = False,
) -> Co2Evaluation:
    reasons: list[str] = []
    sources: tuple[SensorSource, ...] = config.sources
    thresholds = _effective_thresholds(config)
    if not sources:
        return Co2Evaluation(
            computed_ppm=None,
            sensor_stale=False,
            computed_available=False,
            co2_stress=_evaluate_co2_stress(
                computed_ppm=None,
                computed_available=False,
                sensor_stale=False,
                previous_stress=previous_co2_stress,
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
        ppm = parse_co2(reading.value, reading.unit_of_measurement)
        stale = _is_stale(
            reading,
            now=now,
            stale_after_seconds=config.stale_after_seconds,
            grace_until=grace_until,
        )
        if stale:
            stale_any = True
            reasons.append(f"stale:{source.entity_id}")
        if ppm is None:
            reasons.append(f"invalid:{source.entity_id}")
            continue
        if not stale:
            valid_values.append((stable_key, ppm))

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
        return Co2Evaluation(
            computed_ppm=None,
            sensor_stale=stale_any,
            computed_available=False,
            co2_stress=_evaluate_co2_stress(
                computed_ppm=None,
                computed_available=False,
                sensor_stale=stale_any,
                previous_stress=previous_co2_stress,
                thresholds=thresholds,
            ),
            reasons=tuple(reasons),
        )
    computed_ppm = _round_ppm(computed)
    return Co2Evaluation(
        computed_ppm=computed_ppm,
        sensor_stale=stale_any,
        computed_available=True,
        co2_stress=_evaluate_co2_stress(
            computed_ppm=computed_ppm,
            computed_available=True,
            sensor_stale=stale_any,
            previous_stress=previous_co2_stress,
            thresholds=thresholds,
        ),
        reasons=tuple(reasons),
    )


def _effective_thresholds(config: Co2Config) -> tuple[int, int]:
    return (
        config.effective_stress_threshold("threshold_ppm"),
        config.effective_stress_threshold("clear_ppm"),
    )


def _evaluate_co2_stress(
    *,
    computed_ppm: int | None,
    computed_available: bool,
    sensor_stale: bool,
    previous_stress: bool,
    thresholds: tuple[int, int],
) -> Co2StressEvaluation:
    threshold_ppm, clear_ppm = thresholds
    if not computed_available or computed_ppm is None:
        return Co2StressEvaluation(
            co2_stress=False,
            available=False,
            confidence="none",
            reason="co2_unavailable",
            threshold_ppm=threshold_ppm,
            clear_ppm=clear_ppm,
        )
    if sensor_stale:
        return Co2StressEvaluation(
            co2_stress=False,
            available=False,
            confidence="none",
            reason="co2_stale",
            threshold_ppm=threshold_ppm,
            clear_ppm=clear_ppm,
        )
    if previous_stress:
        stress = computed_ppm > clear_ppm
        return Co2StressEvaluation(
            co2_stress=stress,
            available=True,
            confidence="low",
            reason="co2_stress" if stress else "co2_ok",
            threshold_ppm=threshold_ppm,
            clear_ppm=clear_ppm,
        )
    if computed_ppm >= threshold_ppm:
        return Co2StressEvaluation(
            co2_stress=True,
            available=True,
            confidence="low",
            reason="co2_stress",
            threshold_ppm=threshold_ppm,
            clear_ppm=clear_ppm,
        )
    return Co2StressEvaluation(
        co2_stress=False,
        available=True,
        confidence="low",
        reason="co2_ok",
        threshold_ppm=threshold_ppm,
        clear_ppm=clear_ppm,
    )
