from __future__ import annotations

from dataclasses import replace
from typing import Any, cast

import pytest
from custom_components.smart_plants.models import SensorSource, SoilTemperatureConfig
from custom_components.smart_plants.soil_temperature_evaluator import (
    SoilTemperatureReading,
    evaluate,
)
from homeassistant.const import UnitOfTemperature


def _config(**kwargs: object) -> SoilTemperatureConfig:
    base = SoilTemperatureConfig(
        sources=(SensorSource(entity_id="sensor.a"),),
        primary_entity_id="sensor.a",
    )
    return replace(base, **cast("dict[str, Any]", kwargs))


def _reading(
    value: object,
    unit: object = UnitOfTemperature.CELSIUS,
    now: float = 0.0,
) -> SoilTemperatureReading:
    return SoilTemperatureReading(
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
        (-20, UnitOfTemperature.CELSIUS, -20.0),
        (60, UnitOfTemperature.CELSIUS, 60.0),
        ("20.04", UnitOfTemperature.CELSIUS, 20.0),
        ("20.05", UnitOfTemperature.CELSIUS, 20.1),
        (-20.1, UnitOfTemperature.CELSIUS, None),
        (60.1, UnitOfTemperature.CELSIUS, None),
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
def test_soil_temperature_normalization_boundaries(
    value: object, unit: object, expected: float | None
) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value, unit)}, now=0.0)
    assert result.computed_available is (expected is not None)
    assert result.computed_celsius == expected


def test_primary_default_does_not_fall_back() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    readings = {
        "sensor.a": SoilTemperatureReading(
            "sensor.a", "bad", UnitOfTemperature.CELSIUS
        ),
        "sensor.b": SoilTemperatureReading(
            "sensor.b", 21, UnitOfTemperature.CELSIUS, last_valid_at=0.0
        ),
    }
    result = evaluate(_config(sources=sources), readings, now=0.0)
    assert result.computed_available is False
    assert "primary_invalid:sensor.a" in result.reasons


def test_average_min_and_max_exclude_invalid_and_stale_members() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
        SensorSource(entity_id="sensor.c"),
    )
    readings = {
        "sensor.a": SoilTemperatureReading(
            "sensor.a", 18, UnitOfTemperature.CELSIUS, last_valid_at=0.0
        ),
        "sensor.b": SoilTemperatureReading(
            "sensor.b", 22, UnitOfTemperature.CELSIUS, last_valid_at=0.0
        ),
        "sensor.c": SoilTemperatureReading(
            "sensor.c", 40, UnitOfTemperature.CELSIUS, last_valid_at=-60.0
        ),
    }
    assert (
        evaluate(
            _config(
                sources=sources,
                aggregation="average",
                primary_entity_id=None,
                stale_after_seconds=30,
            ),
            readings,
            now=0.0,
        ).computed_celsius
        == 20.0
    )
    assert (
        evaluate(
            _config(
                sources=sources,
                aggregation="min",
                primary_entity_id=None,
                stale_after_seconds=30,
            ),
            readings,
            now=0.0,
        ).computed_celsius
        == 18.0
    )
    assert (
        evaluate(
            _config(
                sources=sources,
                aggregation="max",
                primary_entity_id=None,
                stale_after_seconds=30,
            ),
            readings,
            now=0.0,
        ).computed_celsius
        == 22.0
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
        (10.1, False, "soil_temperature_ok"),
        (34.9, False, "soil_temperature_ok"),
        (35.0, True, "hot_stress"),
    ],
)
def test_soil_temperature_stress_thresholds(
    value: float, expected: object, reason: str
) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value)}, now=0.0)
    assert result.soil_temperature_stress.available is True
    assert result.soil_temperature_stress.soil_temperature_stress is expected
    assert result.soil_temperature_stress.confidence == "low"
    assert result.soil_temperature_stress.reason == reason


def test_soil_temperature_stress_hysteresis_clears_matching_side() -> None:
    cold_still_on = evaluate(
        _config(),
        {"sensor.a": _reading(11.9)},
        now=0.0,
        previous_soil_temperature_stress="cold",
    )
    assert cold_still_on.soil_temperature_stress.soil_temperature_stress is True
    cold_cleared = evaluate(
        _config(),
        {"sensor.a": _reading(12.0)},
        now=0.0,
        previous_soil_temperature_stress="cold",
    )
    assert cold_cleared.soil_temperature_stress.soil_temperature_stress is False

    hot_still_on = evaluate(
        _config(),
        {"sensor.a": _reading(32.1)},
        now=0.0,
        previous_soil_temperature_stress="hot",
    )
    assert hot_still_on.soil_temperature_stress.soil_temperature_stress is True
    hot_cleared = evaluate(
        _config(),
        {"sensor.a": _reading(32.0)},
        now=0.0,
        previous_soil_temperature_stress="hot",
    )
    assert hot_cleared.soil_temperature_stress.soil_temperature_stress is False


def test_soil_temperature_stress_unavailable_when_temperature_unavailable() -> None:
    result = evaluate(_config(), {"sensor.a": _reading("unavailable")}, now=0.0)
    assert result.soil_temperature_stress.available is False
    assert result.soil_temperature_stress.soil_temperature_stress is False
    assert result.soil_temperature_stress.confidence == "none"
    assert result.soil_temperature_stress.reason == "soil_temperature_unavailable"


def test_soil_temperature_stress_unavailable_when_any_source_is_stale() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(sources=sources, aggregation="min", stale_after_seconds=60)
    result = evaluate(
        config,
        {
            "sensor.a": SoilTemperatureReading(
                "sensor.a", 20, UnitOfTemperature.CELSIUS, last_valid_at=100.0
            ),
            "sensor.b": SoilTemperatureReading(
                "sensor.b", 21, UnitOfTemperature.CELSIUS, last_valid_at=0.0
            ),
        },
        now=100.0,
    )
    assert result.computed_available is True
    assert result.soil_temperature_stress.available is False
    assert result.soil_temperature_stress.reason == "soil_temperature_stale"
