from __future__ import annotations

from dataclasses import replace
from typing import Any, cast

import pytest
from custom_components.smart_plants.models import SensorSource, TemperatureConfig
from custom_components.smart_plants.temperature_evaluator import (
    TemperatureReading,
    evaluate,
)
from homeassistant.const import UnitOfTemperature


def _config(**kwargs: object) -> TemperatureConfig:
    base = TemperatureConfig(
        sources=(SensorSource(entity_id="sensor.a"),),
        primary_entity_id="sensor.a",
        aggregation="primary",
    )
    return replace(base, **cast("dict[str, Any]", kwargs))


def _reading(
    value: object,
    unit: object = UnitOfTemperature.CELSIUS,
    now: float = 0.0,
) -> TemperatureReading:
    return TemperatureReading(
        entity_id="sensor.a",
        value=value,
        unit_of_measurement=unit,
        last_valid_at=now,
    )


@pytest.mark.parametrize(
    ("value", "unit", "expected"),
    [
        (20, UnitOfTemperature.CELSIUS, 20.0),
        (68, UnitOfTemperature.FAHRENHEIT, 20.0),
        (293.15, UnitOfTemperature.KELVIN, 20.0),
        (-40, UnitOfTemperature.CELSIUS, -40.0),
        (80, UnitOfTemperature.CELSIUS, 80.0),
        ("20.04", UnitOfTemperature.CELSIUS, 20.0),
        ("20.05", UnitOfTemperature.CELSIUS, 20.1),
        (-40.1, UnitOfTemperature.CELSIUS, None),
        (80.1, UnitOfTemperature.CELSIUS, None),
        (20, "%", None),
        (20, None, None),
        (None, UnitOfTemperature.CELSIUS, None),
        ("unknown", UnitOfTemperature.CELSIUS, None),
        ("unavailable", UnitOfTemperature.CELSIUS, None),
        (True, UnitOfTemperature.CELSIUS, None),
        (float("nan"), UnitOfTemperature.CELSIUS, None),
        (float("inf"), UnitOfTemperature.CELSIUS, None),
    ],
)
def test_temperature_normalization_boundaries(
    value: object, unit: object, expected: float | None
) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value, unit)}, now=0.0)
    assert result.computed_available is (expected is not None)
    assert result.computed_celsius == expected


def test_average_excludes_invalid_and_stale_members() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
        SensorSource(entity_id="sensor.c"),
    )
    config = _config(sources=sources, aggregation="average", primary_entity_id=None)
    readings = {
        "sensor.a": TemperatureReading(
            "sensor.a", 20, UnitOfTemperature.CELSIUS, last_valid_at=0.0
        ),
        "sensor.b": TemperatureReading(
            "sensor.b", 68, UnitOfTemperature.FAHRENHEIT, last_valid_at=0.0
        ),
        "sensor.c": TemperatureReading("sensor.c", 100, "%", last_valid_at=0.0),
    }
    result = evaluate(config, readings, now=0.0)
    assert result.computed_celsius == 20.0


def test_primary_does_not_fall_back() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(sources=sources, primary_entity_id="sensor.a")
    readings = {
        "sensor.a": TemperatureReading("sensor.a", "bad", UnitOfTemperature.CELSIUS),
        "sensor.b": TemperatureReading(
            "sensor.b", 21, UnitOfTemperature.CELSIUS, last_valid_at=0.0
        ),
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
        "sensor.a": TemperatureReading(
            "sensor.a", 19, UnitOfTemperature.CELSIUS, last_valid_at=0.0
        ),
        "sensor.b": TemperatureReading(
            "sensor.b", 24, UnitOfTemperature.CELSIUS, last_valid_at=0.0
        ),
    }
    assert (
        evaluate(
            _config(sources=sources, aggregation="min", primary_entity_id=None),
            readings,
            now=0.0,
        ).computed_celsius
        == 19.0
    )
    assert (
        evaluate(
            _config(sources=sources, aggregation="max", primary_entity_id=None),
            readings,
            now=0.0,
        ).computed_celsius
        == 24.0
    )


def test_missing_and_stale_sources_make_unavailable_when_none_valid() -> None:
    config = _config(stale_after_seconds=60)
    result = evaluate(config, {"sensor.a": _reading(20, now=0.0)}, now=60.0)
    assert result.sensor_stale is True
    assert result.computed_available is False


@pytest.mark.parametrize(
    ("value", "expected", "reason"),
    [
        (10.0, True, "cold_stress"),
        (10.1, False, "temperature_ok"),
        (34.9, False, "temperature_ok"),
        (35.0, True, "hot_stress"),
    ],
)
def test_temperature_stress_thresholds(
    value: float, expected: object, reason: str
) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value)}, now=0.0)
    assert result.temperature_stress.available is True
    assert result.temperature_stress.temperature_stress is expected
    assert result.temperature_stress.confidence == "low"
    assert result.temperature_stress.reason == reason
    assert result.temperature_stress.cold_threshold_celsius == 10.0
    assert result.temperature_stress.cold_clear_celsius == 12.0
    assert result.temperature_stress.hot_threshold_celsius == 35.0
    assert result.temperature_stress.hot_clear_celsius == 32.0


def test_temperature_stress_hysteresis_clears_matching_side() -> None:
    cold_still_on = evaluate(
        _config(),
        {"sensor.a": _reading(11.9)},
        now=0.0,
        previous_temperature_stress="cold",
    )
    assert cold_still_on.temperature_stress.temperature_stress is True
    cold_cleared = evaluate(
        _config(),
        {"sensor.a": _reading(12.0)},
        now=0.0,
        previous_temperature_stress="cold",
    )
    assert cold_cleared.temperature_stress.temperature_stress is False

    hot_still_on = evaluate(
        _config(),
        {"sensor.a": _reading(32.1)},
        now=0.0,
        previous_temperature_stress="hot",
    )
    assert hot_still_on.temperature_stress.temperature_stress is True
    hot_cleared = evaluate(
        _config(),
        {"sensor.a": _reading(32.0)},
        now=0.0,
        previous_temperature_stress="hot",
    )
    assert hot_cleared.temperature_stress.temperature_stress is False


def test_temperature_stress_unavailable_when_temperature_unavailable() -> None:
    result = evaluate(_config(), {"sensor.a": _reading("unavailable")}, now=0.0)
    assert result.temperature_stress.available is False
    assert result.temperature_stress.temperature_stress is False
    assert result.temperature_stress.confidence == "none"
    assert result.temperature_stress.reason == "temperature_unavailable"


def test_temperature_stress_unavailable_when_any_source_is_stale() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(sources=sources, aggregation="min", stale_after_seconds=60)
    result = evaluate(
        config,
        {
            "sensor.a": TemperatureReading(
                "sensor.a", 20, UnitOfTemperature.CELSIUS, last_valid_at=100.0
            ),
            "sensor.b": TemperatureReading(
                "sensor.b", 21, UnitOfTemperature.CELSIUS, last_valid_at=0.0
            ),
        },
        now=100.0,
    )
    assert result.computed_available is True
    assert result.temperature_stress.available is False
    assert result.temperature_stress.reason == "temperature_stale"
