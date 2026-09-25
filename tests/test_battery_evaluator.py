from __future__ import annotations

from dataclasses import replace
from typing import Any, cast

import pytest
from custom_components.smart_plants.battery_evaluator import BatteryReading, evaluate
from custom_components.smart_plants.models import BatteryConfig, SensorSource
from homeassistant.const import PERCENTAGE, UnitOfElectricPotential


def _config(**kwargs: object) -> BatteryConfig:
    base = BatteryConfig(
        sources=(SensorSource(entity_id="sensor.a"),),
        primary_entity_id="sensor.a",
    )
    return replace(base, **cast("dict[str, Any]", kwargs))


def _reading(
    value: object,
    unit: object = PERCENTAGE,
    now: float = 0.0,
) -> BatteryReading:
    return BatteryReading(
        entity_id="sensor.a",
        value=value,
        unit_of_measurement=unit,
        last_valid_at=now,
    )


@pytest.mark.parametrize(
    ("value", "unit", "expected"),
    [
        (0, PERCENTAGE, 0),
        (100, PERCENTAGE, 100),
        (12.4, PERCENTAGE, 12),
        (12.5, PERCENTAGE, 13),
        (12.6, PERCENTAGE, 13),
        ("12.5", PERCENTAGE, 13),
        (-0.1, PERCENTAGE, None),
        (100.1, PERCENTAGE, None),
        (55, UnitOfElectricPotential.VOLT, None),
        (55, None, None),
        (None, PERCENTAGE, None),
        ("unknown", PERCENTAGE, None),
        ("unavailable", PERCENTAGE, None),
        (True, PERCENTAGE, None),
        (float("nan"), PERCENTAGE, None),
        (float("inf"), PERCENTAGE, None),
    ],
)
def test_battery_normalization_boundaries(
    value: object, unit: object, expected: int | None
) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value, unit)}, now=0.0)
    assert result.computed_available is (expected is not None)
    assert result.computed_percent == expected


def test_min_default_excludes_invalid_and_stale_members() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
        SensorSource(entity_id="sensor.c"),
    )
    config = _config(sources=sources, primary_entity_id=None)
    readings = {
        "sensor.a": BatteryReading("sensor.a", 80, PERCENTAGE, last_valid_at=0.0),
        "sensor.b": BatteryReading("sensor.b", 21, PERCENTAGE, last_valid_at=0.0),
        "sensor.c": BatteryReading("sensor.c", 7, None, last_valid_at=0.0),
    }
    result = evaluate(config, readings, now=0.0)
    assert result.computed_percent == 21


def test_primary_does_not_fall_back() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(
        sources=sources, primary_entity_id="sensor.a", aggregation="primary"
    )
    readings = {
        "sensor.a": BatteryReading("sensor.a", "bad", PERCENTAGE),
        "sensor.b": BatteryReading("sensor.b", 30, PERCENTAGE, last_valid_at=0.0),
    }
    result = evaluate(config, readings, now=0.0)
    assert result.computed_available is False
    assert "primary_invalid:sensor.a" in result.reasons


def test_average_and_max_aggregations() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    readings = {
        "sensor.a": BatteryReading("sensor.a", 20, PERCENTAGE, last_valid_at=0.0),
        "sensor.b": BatteryReading("sensor.b", 90, PERCENTAGE, last_valid_at=0.0),
    }
    assert (
        evaluate(
            _config(sources=sources, aggregation="average", primary_entity_id=None),
            readings,
            now=0.0,
        ).computed_percent
        == 55
    )
    assert (
        evaluate(
            _config(sources=sources, aggregation="max", primary_entity_id=None),
            readings,
            now=0.0,
        ).computed_percent
        == 90
    )


def test_missing_and_stale_sources_make_unavailable_when_none_valid() -> None:
    config = _config(stale_after_seconds=60)
    result = evaluate(config, {"sensor.a": _reading(50, now=0.0)}, now=60.0)
    assert result.sensor_stale is True
    assert result.computed_available is False


@pytest.mark.parametrize(
    ("value", "expected"),
    [(20, True), (21, False), (0, True), (25, False)],
)
def test_low_battery_threshold(value: int, expected: object) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value)}, now=0.0)
    assert result.low_battery.available is True
    assert result.low_battery.low_battery is expected
    assert result.low_battery.confidence == "low"


def test_low_battery_hysteresis_clears_at_clear_threshold() -> None:
    still_low = evaluate(
        _config(),
        {"sensor.a": _reading(24)},
        now=0.0,
        previous_low_battery=True,
    )
    assert still_low.low_battery.low_battery is True
    cleared = evaluate(
        _config(),
        {"sensor.a": _reading(25)},
        now=0.0,
        previous_low_battery=True,
    )
    assert cleared.low_battery.low_battery is False


def test_low_battery_unavailable_when_battery_unavailable() -> None:
    result = evaluate(_config(), {"sensor.a": _reading("unavailable")}, now=0.0)
    assert result.low_battery.available is False
    assert result.low_battery.low_battery is False
    assert result.low_battery.confidence == "none"
    assert result.low_battery.reason == "battery_unavailable"


def test_low_battery_unavailable_when_any_source_is_stale() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(sources=sources, aggregation="min", stale_after_seconds=60)
    result = evaluate(
        config,
        {
            "sensor.a": BatteryReading("sensor.a", 10, PERCENTAGE, last_valid_at=100.0),
            "sensor.b": BatteryReading("sensor.b", 90, PERCENTAGE, last_valid_at=0.0),
        },
        now=100.0,
    )
    assert result.computed_available is True
    assert result.low_battery.available is False
    assert result.low_battery.reason == "battery_stale"
