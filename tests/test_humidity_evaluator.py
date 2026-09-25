from __future__ import annotations

from dataclasses import replace
from typing import Any, cast

import pytest
from custom_components.smart_plants.humidity_evaluator import HumidityReading, evaluate
from custom_components.smart_plants.models import HumidityConfig, SensorSource
from homeassistant.const import PERCENTAGE, UnitOfTemperature


def _config(**kwargs: object) -> HumidityConfig:
    base = HumidityConfig(
        sources=(SensorSource(entity_id="sensor.a"),),
        primary_entity_id="sensor.a",
        aggregation="primary",
    )
    return replace(base, **cast("dict[str, Any]", kwargs))


def _reading(
    value: object,
    unit: object = PERCENTAGE,
    now: float = 0.0,
) -> HumidityReading:
    return HumidityReading(
        entity_id="sensor.a",
        value=value,
        unit_of_measurement=unit,
        last_valid_at=now,
    )


@pytest.mark.parametrize(
    ("value", "unit", "expected"),
    [
        (0, PERCENTAGE, 0.0),
        (100, PERCENTAGE, 100.0),
        (55.04, PERCENTAGE, 55.0),
        (55.05, PERCENTAGE, 55.0),
        (55.15, PERCENTAGE, 55.1),
        ("55.16", PERCENTAGE, 55.2),
        (-0.1, PERCENTAGE, None),
        (100.1, PERCENTAGE, None),
        (55, UnitOfTemperature.CELSIUS, None),
        (55, None, None),
        (None, PERCENTAGE, None),
        ("unknown", PERCENTAGE, None),
        ("unavailable", PERCENTAGE, None),
        (True, PERCENTAGE, None),
        (float("nan"), PERCENTAGE, None),
        (float("inf"), PERCENTAGE, None),
    ],
)
def test_humidity_normalization_boundaries(
    value: object, unit: object, expected: float | None
) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value, unit)}, now=0.0)
    assert result.computed_available is (expected is not None)
    assert result.computed_percent == expected


def test_average_excludes_invalid_and_stale_members() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
        SensorSource(entity_id="sensor.c"),
    )
    config = _config(sources=sources, aggregation="average", primary_entity_id=None)
    readings = {
        "sensor.a": HumidityReading("sensor.a", 40, PERCENTAGE, last_valid_at=0.0),
        "sensor.b": HumidityReading("sensor.b", 60, PERCENTAGE, last_valid_at=0.0),
        "sensor.c": HumidityReading("sensor.c", 20, None, last_valid_at=0.0),
    }
    result = evaluate(config, readings, now=0.0)
    assert result.computed_percent == 50.0


def test_primary_does_not_fall_back() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(sources=sources, primary_entity_id="sensor.a")
    readings = {
        "sensor.a": HumidityReading("sensor.a", "bad", PERCENTAGE),
        "sensor.b": HumidityReading("sensor.b", 55, PERCENTAGE, last_valid_at=0.0),
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
        "sensor.a": HumidityReading("sensor.a", 40, PERCENTAGE, last_valid_at=0.0),
        "sensor.b": HumidityReading("sensor.b", 60, PERCENTAGE, last_valid_at=0.0),
    }
    assert (
        evaluate(
            _config(sources=sources, aggregation="min", primary_entity_id=None),
            readings,
            now=0.0,
        ).computed_percent
        == 40.0
    )
    assert (
        evaluate(
            _config(sources=sources, aggregation="max", primary_entity_id=None),
            readings,
            now=0.0,
        ).computed_percent
        == 60.0
    )


def test_missing_and_stale_sources_make_unavailable_when_none_valid() -> None:
    config = _config(stale_after_seconds=60)
    result = evaluate(config, {"sensor.a": _reading(55, now=0.0)}, now=60.0)
    assert result.sensor_stale is True
    assert result.computed_available is False


@pytest.mark.parametrize(
    ("value", "expected", "reason"),
    [
        (25.0, True, "dry_stress"),
        (25.1, False, "humidity_ok"),
        (84.9, False, "humidity_ok"),
        (85.0, True, "damp_stress"),
    ],
)
def test_humidity_stress_thresholds(
    value: float, expected: object, reason: str
) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value)}, now=0.0)
    assert result.humidity_stress.available is True
    assert result.humidity_stress.humidity_stress is expected
    assert result.humidity_stress.confidence == "low"
    assert result.humidity_stress.reason == reason
    assert result.humidity_stress.dry_threshold_percent == 25.0
    assert result.humidity_stress.dry_clear_percent == 30.0
    assert result.humidity_stress.damp_threshold_percent == 85.0
    assert result.humidity_stress.damp_clear_percent == 80.0


def test_humidity_stress_hysteresis_clears_matching_side() -> None:
    dry_still_on = evaluate(
        _config(),
        {"sensor.a": _reading(29.9)},
        now=0.0,
        previous_humidity_stress="dry",
    )
    assert dry_still_on.humidity_stress.humidity_stress is True
    dry_cleared = evaluate(
        _config(),
        {"sensor.a": _reading(30.0)},
        now=0.0,
        previous_humidity_stress="dry",
    )
    assert dry_cleared.humidity_stress.humidity_stress is False

    damp_still_on = evaluate(
        _config(),
        {"sensor.a": _reading(80.1)},
        now=0.0,
        previous_humidity_stress="damp",
    )
    assert damp_still_on.humidity_stress.humidity_stress is True
    damp_cleared = evaluate(
        _config(),
        {"sensor.a": _reading(80.0)},
        now=0.0,
        previous_humidity_stress="damp",
    )
    assert damp_cleared.humidity_stress.humidity_stress is False


def test_humidity_stress_unavailable_when_humidity_unavailable() -> None:
    result = evaluate(_config(), {"sensor.a": _reading("unavailable")}, now=0.0)
    assert result.humidity_stress.available is False
    assert result.humidity_stress.humidity_stress is False
    assert result.humidity_stress.confidence == "none"
    assert result.humidity_stress.reason == "humidity_unavailable"


def test_humidity_stress_unavailable_when_any_source_is_stale() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(sources=sources, aggregation="min", stale_after_seconds=60)
    result = evaluate(
        config,
        {
            "sensor.a": HumidityReading(
                "sensor.a", 40, PERCENTAGE, last_valid_at=100.0
            ),
            "sensor.b": HumidityReading("sensor.b", 42, PERCENTAGE, last_valid_at=0.0),
        },
        now=100.0,
    )
    assert result.computed_available is True
    assert result.humidity_stress.available is False
    assert result.humidity_stress.reason == "humidity_stale"
