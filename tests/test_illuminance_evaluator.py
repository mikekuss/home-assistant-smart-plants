from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import Any, cast
from zoneinfo import ZoneInfo

import pytest
from custom_components.smart_plants.illuminance_evaluator import (
    LIGHT_LUX,
    IlluminanceReading,
    LightSample,
    evaluate,
)
from custom_components.smart_plants.models import IlluminanceConfig, SensorSource
from homeassistant.const import PERCENTAGE


def _config(**kwargs: object) -> IlluminanceConfig:
    base = IlluminanceConfig(
        sources=(SensorSource(entity_id="sensor.a"),),
        primary_entity_id="sensor.a",
        aggregation="primary",
    )
    return replace(base, **cast("dict[str, Any]", kwargs))


def _reading(
    value: object,
    unit: object = LIGHT_LUX,
    now: float = 0.0,
) -> IlluminanceReading:
    return IlluminanceReading(
        entity_id="sensor.a",
        value=value,
        unit_of_measurement=unit,
        last_valid_at=now,
    )


@pytest.mark.parametrize(
    ("value", "unit", "expected"),
    [
        (0, LIGHT_LUX, 0.0),
        (200_000, LIGHT_LUX, 200_000.0),
        (123.04, LIGHT_LUX, 123.0),
        (123.05, LIGHT_LUX, 123.0),
        (123.15, LIGHT_LUX, 123.2),
        ("123.16", LIGHT_LUX, 123.2),
        (-0.1, LIGHT_LUX, None),
        (200_000.1, LIGHT_LUX, None),
        (55, PERCENTAGE, None),
        (55, None, None),
        (None, LIGHT_LUX, None),
        ("unknown", LIGHT_LUX, None),
        ("unavailable", LIGHT_LUX, None),
        (True, LIGHT_LUX, None),
        (float("nan"), LIGHT_LUX, None),
        (float("inf"), LIGHT_LUX, None),
    ],
)
def test_illuminance_normalization_boundaries(
    value: object, unit: object, expected: float | None
) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value, unit)}, now=0.0)
    assert result.computed_available is (expected is not None)
    assert result.computed_lux == expected


def test_average_excludes_invalid_and_stale_members() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
        SensorSource(entity_id="sensor.c"),
    )
    config = _config(sources=sources, aggregation="average", primary_entity_id=None)
    readings = {
        "sensor.a": IlluminanceReading("sensor.a", 100, LIGHT_LUX, last_valid_at=0.0),
        "sensor.b": IlluminanceReading("sensor.b", 300, LIGHT_LUX, last_valid_at=0.0),
        "sensor.c": IlluminanceReading("sensor.c", 20, None, last_valid_at=0.0),
    }
    result = evaluate(config, readings, now=0.0)
    assert result.computed_lux == 200.0


def test_primary_does_not_fall_back() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(sources=sources, primary_entity_id="sensor.a")
    readings = {
        "sensor.a": IlluminanceReading("sensor.a", "bad", LIGHT_LUX),
        "sensor.b": IlluminanceReading("sensor.b", 300, LIGHT_LUX, last_valid_at=0.0),
    }
    result = evaluate(config, readings, now=0.0)
    assert result.computed_available is False
    assert "primary_invalid:sensor.a" in result.reasons


def test_min_max_aggregations() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    readings = {
        "sensor.a": IlluminanceReading("sensor.a", 100, LIGHT_LUX, last_valid_at=0.0),
        "sensor.b": IlluminanceReading("sensor.b", 300, LIGHT_LUX, last_valid_at=0.0),
    }
    assert (
        evaluate(
            _config(sources=sources, aggregation="min", primary_entity_id=None),
            readings,
            now=0.0,
        ).computed_lux
        == 100.0
    )
    assert (
        evaluate(
            _config(sources=sources, aggregation="max", primary_entity_id=None),
            readings,
            now=0.0,
        ).computed_lux
        == 300.0
    )


def test_missing_and_stale_sources_make_unavailable_when_none_valid() -> None:
    config = _config(stale_after_seconds=60)
    result = evaluate(config, {"sensor.a": _reading(100, now=0.0)}, now=60.0)
    assert result.sensor_stale is True
    assert result.computed_available is False


def test_low_light_uses_daytime_window_and_minimum_samples() -> None:
    now = datetime(2026, 1, 1, 12, tzinfo=UTC).timestamp()
    result = evaluate(
        _config(),
        {"sensor.a": _reading(100, now=now)},
        now=now,
        now_datetime=datetime(2026, 1, 1, 12, tzinfo=UTC),
        light_samples=(
            LightSample(now - 3_600, 100.0),
            LightSample(now, 120.0),
        ),
    )
    assert result.low_light.available is True
    assert result.low_light.low_light is True
    assert result.low_light.confidence == "low"
    assert result.low_light.sample_count == 2


def test_low_light_excludes_nighttime() -> None:
    result = evaluate(
        _config(),
        {"sensor.a": _reading(0, now=0.0)},
        now=0.0,
        now_datetime=datetime(2026, 1, 1, 22, tzinfo=UTC),
        light_samples=(
            LightSample(0.0, 0.0),
            LightSample(1.0, 0.0),
        ),
    )
    assert result.low_light.available is True
    assert result.low_light.low_light is False
    assert result.low_light.reason == "nighttime"


def test_low_light_requires_enough_daytime_evidence() -> None:
    now = datetime(2026, 1, 1, 12, tzinfo=UTC).timestamp()
    result = evaluate(
        _config(),
        {"sensor.a": _reading(100, now=now)},
        now=now,
        now_datetime=datetime(2026, 1, 1, 12, tzinfo=UTC),
        light_samples=(LightSample(now, 100.0),),
    )
    assert result.low_light.available is False
    assert result.low_light.reason == "insufficient_daytime_samples"
    assert result.low_light.sample_count == 1


@pytest.mark.parametrize("day", [(2026, 3, 29), (2026, 10, 25)])
def test_dawn_excludes_0759_and_accepts_distinct_0800_after_dst(
    day: tuple[int, int, int],
) -> None:
    berlin = ZoneInfo("Europe/Berlin")
    dawn = datetime(*day, 8, tzinfo=berlin)
    before = datetime(*day, 7, 59, tzinfo=berlin)
    later = dawn + timedelta(minutes=1)

    def check(when: datetime, samples: tuple[LightSample, ...]) -> tuple[str, int]:
        now = when.timestamp()
        result = evaluate(
            _config(),
            {"sensor.a": _reading(100, now=now)},
            now=now,
            now_datetime=when,
            light_samples=samples,
        )
        return result.low_light.reason, result.low_light.sample_count

    pre_dawn = LightSample(before.timestamp(), 1_000.0)
    at_dawn = LightSample(dawn.timestamp(), 100.0)
    assert check(before, (pre_dawn,)) == ("nighttime", 0)
    assert check(dawn, (pre_dawn, at_dawn)) == (
        "insufficient_daytime_samples",
        1,
    )
    assert check(later, (pre_dawn, at_dawn, at_dawn)) == (
        "insufficient_daytime_samples",
        1,
    )
    assert check(later, (pre_dawn, at_dawn, LightSample(later.timestamp(), 100.0))) == (
        "low_light",
        2,
    )


def test_low_light_hysteresis_clears_at_clear_target() -> None:
    now = datetime(2026, 1, 1, 12, tzinfo=UTC).timestamp()
    still_low = evaluate(
        _config(),
        {"sensor.a": _reading(650, now=now)},
        now=now,
        now_datetime=datetime(2026, 1, 1, 12, tzinfo=UTC),
        light_samples=(
            LightSample(now - 1, 100.0),
            LightSample(now, 650.0),
        ),
        previous_low_light=True,
    )
    assert still_low.low_light.low_light is True
    cleared = evaluate(
        _config(),
        {"sensor.a": _reading(700, now=now)},
        now=now,
        now_datetime=datetime(2026, 1, 1, 12, tzinfo=UTC),
        light_samples=(
            LightSample(now - 1, 100.0),
            LightSample(now, 700.0),
        ),
        previous_low_light=True,
    )
    assert cleared.low_light.low_light is False


def test_low_light_unavailable_when_illuminance_unavailable() -> None:
    result = evaluate(
        _config(),
        {"sensor.a": IlluminanceReading("sensor.a", "unavailable", LIGHT_LUX)},
        now=0.0,
        now_datetime=datetime(2026, 1, 1, 12, tzinfo=UTC),
    )
    assert result.low_light.available is False
    assert result.low_light.reason == "illuminance_unavailable"


def test_dead_light_sensor_at_night_is_unavailable_not_nighttime() -> None:
    # Regression: a dead sensor must report unavailable even at night, so the
    # health composite excludes it rather than counting a nighttime "off" as
    # healthy. Unavailability is checked before the nighttime window.
    result = evaluate(
        _config(),
        {"sensor.a": IlluminanceReading("sensor.a", "unavailable", LIGHT_LUX)},
        now=0.0,
        now_datetime=datetime(2026, 1, 1, 22, tzinfo=UTC),
    )
    assert result.low_light.available is False
    assert result.low_light.reason == "illuminance_unavailable"


def test_stale_light_sensor_at_night_is_unavailable_not_nighttime() -> None:
    result = evaluate(
        _config(stale_after_seconds=60),
        {"sensor.a": IlluminanceReading("sensor.a", 100, LIGHT_LUX, last_valid_at=0.0)},
        now=1_000.0,
        now_datetime=datetime(2026, 1, 1, 22, tzinfo=UTC),
    )
    # A stale sensor at night must never report the healthy "nighttime" state.
    assert result.low_light.available is False
    assert result.low_light.reason != "nighttime"
