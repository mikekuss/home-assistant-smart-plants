"""Pure illuminance normalization and aggregation."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Final

if TYPE_CHECKING:
    from .models import IlluminanceConfig, SensorSource

STATE_UNAVAILABLE: Final = "unavailable"
STATE_UNKNOWN: Final = "unknown"
LIGHT_LUX: Final = "lx"
_ILLUMINANCE_LOWER: Final = 0.0
_ILLUMINANCE_UPPER: Final = 200_000.0
LOW_LIGHT_TARGET_LUX: Final = 500.0
LOW_LIGHT_CLEAR_LUX: Final = 700.0
LOW_LIGHT_WINDOW_SECONDS: Final = 7_200
LOW_LIGHT_MIN_SAMPLES: Final = 2
LOW_LIGHT_DAY_START_HOUR: Final = 8
LOW_LIGHT_DAY_END_HOUR: Final = 18


@dataclass(frozen=True, slots=True)
class IlluminanceReading:
    entity_id: str
    value: object
    unit_of_measurement: object = None
    last_valid_at: float | None = None
    grace_until: float | None = None
    source_key: str | None = None


@dataclass(frozen=True, slots=True)
class LightSample:
    observed_at: float
    lux: float


@dataclass(frozen=True, slots=True)
class LowLightEvaluation:
    low_light: bool
    available: bool
    confidence: str
    reason: str
    sample_count: int
    target_lux: float = LOW_LIGHT_TARGET_LUX
    clear_lux: float = LOW_LIGHT_CLEAR_LUX


@dataclass(frozen=True, slots=True)
class IlluminanceEvaluation:
    computed_lux: float | None
    sensor_stale: bool
    computed_available: bool
    low_light: LowLightEvaluation
    reasons: tuple[str, ...] = ()


def parse_illuminance(value: object, unit: object) -> float | None:  # noqa: PLR0911
    """Return a validated lux value or None for invalid input."""
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
    if unit != LIGHT_LUX:
        return None
    if not (_ILLUMINANCE_LOWER <= numeric <= _ILLUMINANCE_UPPER):
        return None
    return numeric


def _is_stale(
    reading: IlluminanceReading,
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


def evaluate(  # noqa: PLR0912, PLR0913
    config: IlluminanceConfig,
    readings: dict[str, IlluminanceReading],
    *,
    now: float,
    grace_until: float | None = None,
    now_datetime: datetime | None = None,
    light_samples: tuple[LightSample, ...] = (),
    previous_low_light: bool = False,
) -> IlluminanceEvaluation:
    reasons: list[str] = []
    sources: tuple[SensorSource, ...] = config.sources
    thresholds = _effective_thresholds(config)
    if not sources:
        return IlluminanceEvaluation(
            computed_lux=None,
            sensor_stale=False,
            computed_available=False,
            low_light=_evaluate_low_light(
                now=now,
                now_datetime=now_datetime,
                computed_lux=None,
                computed_available=False,
                sensor_stale=False,
                samples=light_samples,
                previous_low_light=previous_low_light,
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
        lux = parse_illuminance(reading.value, reading.unit_of_measurement)
        stale = _is_stale(
            reading,
            now=now,
            stale_after_seconds=config.stale_after_seconds,
            grace_until=grace_until,
        )
        if stale:
            stale_any = True
            reasons.append(f"stale:{source.entity_id}")
        if lux is None:
            reasons.append(f"invalid:{source.entity_id}")
            continue
        if not stale:
            valid_values.append((stable_key, lux))

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
        return IlluminanceEvaluation(
            computed_lux=None,
            sensor_stale=stale_any,
            computed_available=False,
            low_light=_evaluate_low_light(
                now=now,
                now_datetime=now_datetime,
                computed_lux=None,
                computed_available=False,
                sensor_stale=stale_any,
                samples=light_samples,
                previous_low_light=previous_low_light,
                thresholds=thresholds,
            ),
            reasons=tuple(reasons),
        )
    computed_lux = round(computed, 1)
    return IlluminanceEvaluation(
        computed_lux=computed_lux,
        sensor_stale=stale_any,
        computed_available=True,
        low_light=_evaluate_low_light(
            now=now,
            now_datetime=now_datetime,
            computed_lux=computed_lux,
            computed_available=True,
            sensor_stale=stale_any,
            samples=light_samples,
            previous_low_light=previous_low_light,
            thresholds=thresholds,
        ),
        reasons=tuple(reasons),
    )


def _effective_thresholds(config: IlluminanceConfig) -> tuple[float, float]:
    return (
        config.effective_stress_threshold("target_lux"),
        config.effective_stress_threshold("clear_lux"),
    )


def _evaluate_low_light(  # noqa: PLR0913
    *,
    now: float,
    now_datetime: datetime | None,
    computed_lux: float | None,
    computed_available: bool,
    sensor_stale: bool,
    samples: tuple[LightSample, ...],
    previous_low_light: bool,
    thresholds: tuple[float, float],
) -> LowLightEvaluation:
    target_lux, clear_lux = thresholds
    # Unavailability is checked before nighttime: a dead or stale light sensor
    # must report available=False so the health composite excludes it, never
    # counting a nighttime "off" from a broken sensor as healthy.
    if not computed_available or computed_lux is None:
        return LowLightEvaluation(
            low_light=False,
            available=False,
            confidence="none",
            reason="illuminance_unavailable",
            sample_count=0,
            target_lux=target_lux,
            clear_lux=clear_lux,
        )
    if sensor_stale:
        return LowLightEvaluation(
            low_light=False,
            available=False,
            confidence="none",
            reason="illuminance_stale",
            sample_count=0,
            target_lux=target_lux,
            clear_lux=clear_lux,
        )
    if now_datetime is not None and not is_daytime(now_datetime):
        # Sensor is alive but it is night: the low_light binary stays off, and
        # the health composite excludes illuminance on the "nighttime" reason.
        return LowLightEvaluation(
            low_light=False,
            available=True,
            confidence="none",
            reason="nighttime",
            sample_count=0,
            target_lux=target_lux,
            clear_lux=clear_lux,
        )
    recent = tuple(
        sample
        for sample in samples
        if now - LOW_LIGHT_WINDOW_SECONDS <= sample.observed_at <= now
        and (
            now_datetime is None
            or is_daytime(
                datetime.fromtimestamp(sample.observed_at, tz=now_datetime.tzinfo)
            )
        )
    )
    # A repeated evaluation of the same observation is not new evidence.
    recent = tuple({sample.observed_at: sample for sample in recent}.values())
    if len(recent) < LOW_LIGHT_MIN_SAMPLES:
        return LowLightEvaluation(
            low_light=False,
            available=False,
            confidence="none",
            reason="insufficient_daytime_samples",
            sample_count=len(recent),
            target_lux=target_lux,
            clear_lux=clear_lux,
        )
    brightest = max(sample.lux for sample in recent)
    low_light = brightest < clear_lux if previous_low_light else brightest < target_lux
    return LowLightEvaluation(
        low_light=low_light,
        available=True,
        confidence="low",
        reason="low_light" if low_light else "enough_light",
        sample_count=len(recent),
        target_lux=target_lux,
        clear_lux=clear_lux,
    )


def is_daytime(value: datetime) -> bool:
    return LOW_LIGHT_DAY_START_HOUR <= value.hour < LOW_LIGHT_DAY_END_HOUR
