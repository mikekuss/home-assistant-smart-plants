from __future__ import annotations

from dataclasses import replace
from typing import Any, cast

import pytest
from custom_components.smart_plants.co2_evaluator import (
    CO2_PARTS_PER_MILLION,
    Co2Reading,
    evaluate,
)
from custom_components.smart_plants.models import Co2Config, SensorSource


def _config(**kwargs: object) -> Co2Config:
    base = Co2Config(
        sources=(SensorSource(entity_id="sensor.a"),),
        primary_entity_id="sensor.a",
        aggregation="primary",
    )
    return replace(base, **cast("dict[str, Any]", kwargs))


def _reading(
    value: object,
    unit: object = CO2_PARTS_PER_MILLION,
    now: float = 0.0,
) -> Co2Reading:
    return Co2Reading(
        entity_id="sensor.a",
        value=value,
        unit_of_measurement=unit,
        last_valid_at=now,
    )


@pytest.mark.parametrize(
    ("value", "unit", "expected"),
    [
        (0, CO2_PARTS_PER_MILLION, 0),
        (420, CO2_PARTS_PER_MILLION, 420),
        (10000, CO2_PARTS_PER_MILLION, 10000),
        (420.4, CO2_PARTS_PER_MILLION, 420),
        (420.5, CO2_PARTS_PER_MILLION, 421),
        ("420.5", CO2_PARTS_PER_MILLION, 421),
        (-0.1, CO2_PARTS_PER_MILLION, None),
        (10000.1, CO2_PARTS_PER_MILLION, None),
        (420, "%", None),
        (420, "ppb", None),
        (420, None, None),
        (None, CO2_PARTS_PER_MILLION, None),
        ("unknown", CO2_PARTS_PER_MILLION, None),
        ("unavailable", CO2_PARTS_PER_MILLION, None),
        (True, CO2_PARTS_PER_MILLION, None),
        (float("nan"), CO2_PARTS_PER_MILLION, None),
        (float("inf"), CO2_PARTS_PER_MILLION, None),
    ],
)
def test_co2_normalization_boundaries(
    value: object, unit: object, expected: int | None
) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value, unit)}, now=0.0)
    assert result.computed_available is (expected is not None)
    assert result.computed_ppm == expected


def test_default_average_excludes_invalid_and_stale_members() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
        SensorSource(entity_id="sensor.c"),
        SensorSource(entity_id="sensor.d"),
    )
    readings = {
        "sensor.a": Co2Reading(
            "sensor.a", 400, CO2_PARTS_PER_MILLION, last_valid_at=0.0
        ),
        "sensor.b": Co2Reading(
            "sensor.b", 801, CO2_PARTS_PER_MILLION, last_valid_at=0.0
        ),
        "sensor.c": Co2Reading(
            "sensor.c", "bad", CO2_PARTS_PER_MILLION, last_valid_at=0.0
        ),
        "sensor.d": Co2Reading(
            "sensor.d", 2000, CO2_PARTS_PER_MILLION, last_valid_at=-60.0
        ),
    }
    result = evaluate(
        Co2Config(sources=sources, stale_after_seconds=30), readings, now=0.0
    )
    assert result.computed_ppm == 601
    assert result.sensor_stale is True


def test_primary_does_not_fall_back() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    readings = {
        "sensor.a": Co2Reading("sensor.a", "bad", CO2_PARTS_PER_MILLION),
        "sensor.b": Co2Reading(
            "sensor.b", 500, CO2_PARTS_PER_MILLION, last_valid_at=0.0
        ),
    }
    result = evaluate(
        _config(sources=sources, aggregation="primary"), readings, now=0.0
    )
    assert result.computed_available is False
    assert "primary_invalid:sensor.a" in result.reasons


def test_min_and_max_exclude_invalid_and_stale_members() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
        SensorSource(entity_id="sensor.c"),
    )
    readings = {
        "sensor.a": Co2Reading(
            "sensor.a", 600, CO2_PARTS_PER_MILLION, last_valid_at=0.0
        ),
        "sensor.b": Co2Reading(
            "sensor.b", 420, CO2_PARTS_PER_MILLION, last_valid_at=0.0
        ),
        "sensor.c": Co2Reading(
            "sensor.c", 3000, CO2_PARTS_PER_MILLION, last_valid_at=-60.0
        ),
    }
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
        ).computed_ppm
        == 420
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
        ).computed_ppm
        == 600
    )


def test_missing_and_stale_sources_make_unavailable_when_none_valid() -> None:
    config = _config(stale_after_seconds=60)
    result = evaluate(config, {"sensor.a": _reading(420, now=0.0)}, now=60.0)
    assert result.sensor_stale is True
    assert result.computed_available is False


@pytest.mark.parametrize(
    ("value", "expected", "reason"),
    [
        (4999, False, "co2_ok"),
        (5000, True, "co2_stress"),
        (10000, True, "co2_stress"),
    ],
)
def test_co2_stress_threshold(value: int, expected: object, reason: str) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value)}, now=0.0)
    assert result.co2_stress.available is True
    assert result.co2_stress.co2_stress is expected
    assert result.co2_stress.confidence == "low"
    assert result.co2_stress.reason == reason
    assert result.co2_stress.threshold_ppm == 5000
    assert result.co2_stress.clear_ppm == 4000


def test_co2_stress_hysteresis() -> None:
    still_on = evaluate(
        _config(),
        {"sensor.a": _reading(4001)},
        now=0.0,
        previous_co2_stress=True,
    )
    assert still_on.co2_stress.co2_stress is True

    cleared = evaluate(
        _config(),
        {"sensor.a": _reading(4000)},
        now=0.0,
        previous_co2_stress=True,
    )
    assert cleared.co2_stress.co2_stress is False
    assert cleared.co2_stress.reason == "co2_ok"


def test_co2_stress_unavailable_when_co2_unavailable() -> None:
    result = evaluate(_config(), {"sensor.a": _reading("unavailable")}, now=0.0)
    assert result.co2_stress.available is False
    assert result.co2_stress.co2_stress is False
    assert result.co2_stress.confidence == "none"
    assert result.co2_stress.reason == "co2_unavailable"


def test_co2_stress_unavailable_when_any_source_is_stale() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(sources=sources, aggregation="average", stale_after_seconds=60)
    result = evaluate(
        config,
        {
            "sensor.a": Co2Reading(
                "sensor.a", 900, CO2_PARTS_PER_MILLION, last_valid_at=100.0
            ),
            "sensor.b": Co2Reading(
                "sensor.b", 800, CO2_PARTS_PER_MILLION, last_valid_at=0.0
            ),
        },
        now=100.0,
    )
    assert result.computed_available is True
    assert result.co2_stress.available is False
    assert result.co2_stress.reason == "co2_stale"
