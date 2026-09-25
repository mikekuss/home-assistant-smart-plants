"""
Phase 4 Cut 2: pure moisture-evaluator behavior.

The evaluator holds no state, does no I/O, and is fully deterministic
given (config, readings, now, grace_until, previous_needs_water,
previous_too_wet). These tests pin the phase spec's numeric contract.
"""

from __future__ import annotations

from dataclasses import replace
from typing import Any, cast

import pytest
from custom_components.smart_plants.models import (
    DEFAULT_STALE_AFTER_SECONDS,
    MoistureConfig,
    SensorSource,
)
from custom_components.smart_plants.moisture_evaluator import (
    SourceReading,
    evaluate,
)


def _config(**kwargs: object) -> MoistureConfig:
    base = MoistureConfig(
        sources=(SensorSource(entity_id="sensor.a"),),
        primary_entity_id="sensor.a",
        aggregation="primary",
    )
    fields = dict(kwargs)
    overrides = cast(
        "dict[str, int | None]",
        {key: fields.pop(f"moisture_{key}", None) for key in ("min", "target", "max")},
    )
    return replace(
        base,
        threshold_overrides=overrides,
        **cast("dict[str, Any]", fields),
    )


def _reading(value: object, unit: object = "%", now: float = 0.0) -> SourceReading:
    return SourceReading(
        entity_id="sensor.a",
        value=value,
        unit_of_measurement=unit,
        last_valid_at=now,
    )


# --- Normalization boundaries --------------------------------------------


@pytest.mark.parametrize(
    ("value", "unit", "expected_available"),
    [
        (35, "%", True),
        (35.0, "%", True),
        (0, "%", True),
        (100, "%", True),
        ("35", "%", True),
        (-0.1, "%", False),
        (100.01, "%", False),
        (None, "%", False),
        ("unavailable", "%", False),
        ("unknown", "%", False),
        ("not-a-number", "%", False),
        (35, "kg", False),
        (35, None, False),
        (True, "%", False),
        (float("nan"), "%", False),
        (float("inf"), "%", False),
    ],
)
def test_normalization_boundaries(
    value: object,
    unit: object,
    expected_available: bool,  # noqa: FBT001
) -> None:
    config = _config()
    readings = {"sensor.a": _reading(value, unit)}
    result = evaluate(config, readings, now=0.0)
    assert result.computed_available == expected_available


# --- Aggregations --------------------------------------------------------


def test_average_excludes_invalid_and_stale() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
        SensorSource(entity_id="sensor.c"),
    )
    config = _config(sources=sources, aggregation="average", primary_entity_id=None)
    readings = {
        "sensor.a": SourceReading("sensor.a", 20, "%", last_valid_at=0.0),
        "sensor.b": SourceReading("sensor.b", 40, "%", last_valid_at=0.0),
        # sensor.c is invalid (wrong unit) and is excluded.
        "sensor.c": SourceReading("sensor.c", 40, "kg", last_valid_at=0.0),
    }
    result = evaluate(config, readings, now=0.0)
    assert result.computed_percent == pytest.approx(30.0)


def test_min_max_aggregations() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    readings = {
        "sensor.a": SourceReading("sensor.a", 10, "%", last_valid_at=0.0),
        "sensor.b": SourceReading("sensor.b", 90, "%", last_valid_at=0.0),
    }
    result_min = evaluate(
        _config(sources=sources, aggregation="min", primary_entity_id=None),
        readings,
        now=0.0,
    )
    result_max = evaluate(
        _config(sources=sources, aggregation="max", primary_entity_id=None),
        readings,
        now=0.0,
    )
    assert result_min.computed_percent == pytest.approx(10.0)
    assert result_max.computed_percent == pytest.approx(90.0)


def test_average_unavailable_when_all_invalid() -> None:
    sources = (SensorSource(entity_id="sensor.a"),)
    config = _config(sources=sources, aggregation="average", primary_entity_id=None)
    readings = {"sensor.a": _reading("unavailable")}
    result = evaluate(config, readings, now=0.0)
    assert result.computed_available is False


def test_primary_never_falls_back() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(sources=sources, primary_entity_id="sensor.a")
    readings = {
        "sensor.a": _reading("unavailable"),
        "sensor.b": SourceReading("sensor.b", 40, "%", last_valid_at=0.0),
    }
    result = evaluate(config, readings, now=0.0)
    assert result.computed_available is False


def test_stale_primary_invalidates_primary() -> None:
    config = _config(stale_after_seconds=60)
    readings = {
        "sensor.a": SourceReading("sensor.a", 40, "%", last_valid_at=0.0),
    }
    # now is far past stale_after_seconds and no grace applies.
    result = evaluate(config, readings, now=10_000.0)
    assert result.computed_available is False
    assert result.sensor_stale is True


def test_stale_non_primary_excluded_from_average() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(
        sources=sources,
        aggregation="average",
        primary_entity_id=None,
        stale_after_seconds=60,
    )
    readings = {
        "sensor.a": SourceReading("sensor.a", 40, "%", last_valid_at=10_000.0),
        "sensor.b": SourceReading("sensor.b", 80, "%", last_valid_at=0.0),
    }
    result = evaluate(config, readings, now=10_000.0)
    # sensor.b is stale so only sensor.a's value drives the average.
    assert result.computed_percent == pytest.approx(40.0)
    assert result.sensor_stale is True


def test_missing_registered_source_marks_stale() -> None:
    sources = (SensorSource(entity_id="sensor.a", registry_id="reg-a"),)
    config = _config(sources=sources, primary_entity_id="sensor.a")
    result = evaluate(config, {}, now=0.0)
    assert result.sensor_stale is True
    assert result.computed_available is False


def test_no_sources_state() -> None:
    config = _config(sources=(), primary_entity_id=None)
    result = evaluate(config, {}, now=0.0)
    assert result.sensor_stale is False
    assert result.computed_available is False
    assert result.needs_water is False
    assert result.too_wet is False


# --- Score anchors and rounding -----------------------------------------


def test_score_anchors() -> None:
    config = _config(moisture_min=20, moisture_target=40, moisture_max=60)

    def _score(v: float) -> int | None:
        result = evaluate(
            config,
            {"sensor.a": SourceReading("sensor.a", v, "%", last_valid_at=0.0)},
            now=0.0,
        )
        return result.health_score

    assert _score(0) == 0
    assert _score(20) == 50
    assert _score(40) == 100
    assert _score(60) == 50
    assert _score(100) == 0


def test_score_interpolation_and_half_rounding() -> None:
    # min=10, target=20, max=30 → between min and target, each 1% is +5.
    config = _config(moisture_min=10, moisture_target=20, moisture_max=30)

    def _score(v: float) -> int | None:
        result = evaluate(
            config,
            {"sensor.a": SourceReading("sensor.a", v, "%", last_valid_at=0.0)},
            now=0.0,
        )
        return result.health_score

    assert _score(15) == 75
    # Score of 55.0 from (11.0) → 50 + (1/10)*50 = 55; unchanged.
    # For a .5 tie: pick a percent that yields exactly .5 in the raw
    # score. min=10, target=20 → step=5/1. Choose v=10.1 → 50 + 0.5 = 50.5.
    assert _score(10.1) == 51


# --- Hysteresis boundaries ----------------------------------------------


def test_needs_water_hysteresis_boundaries() -> None:
    config = _config(moisture_min=20)

    def _needs(value: float, *, prev: bool) -> bool:
        return evaluate(
            config,
            {"sensor.a": SourceReading("sensor.a", value, "%", last_valid_at=0.0)},
            now=0.0,
            previous_needs_water=prev,
        ).needs_water

    # Below min: on.
    assert _needs(19.9, prev=False) is True
    # Exactly at min: not below, off (only strictly < triggers).
    assert _needs(20.0, prev=False) is False
    # Once on, stays on until value >= min+2.
    assert _needs(21.9, prev=True) is True
    # At min+2 exactly: off.
    assert _needs(22.0, prev=True) is False


def test_too_wet_hysteresis_boundaries() -> None:
    config = _config(moisture_max=60)

    def _too(value: float, *, prev: bool) -> bool:
        return evaluate(
            config,
            {"sensor.a": SourceReading("sensor.a", value, "%", last_valid_at=0.0)},
            now=0.0,
            previous_too_wet=prev,
        ).too_wet

    assert _too(60.0, prev=False) is False
    assert _too(60.1, prev=False) is True
    assert _too(58.1, prev=True) is True
    assert _too(58.0, prev=True) is False


# --- Staleness with controllable clock ----------------------------------


def test_grace_defers_missing_last_valid() -> None:
    sources = (SensorSource(entity_id="sensor.a"),)
    config = _config(sources=sources, stale_after_seconds=60)
    readings = {
        "sensor.a": SourceReading("sensor.a", 40, "%", last_valid_at=None),
    }
    # During grace: not stale.
    result = evaluate(config, readings, now=10.0, grace_until=100.0)
    assert result.sensor_stale is False


def test_default_stale_after_is_six_hours() -> None:
    assert DEFAULT_STALE_AFTER_SECONDS == 21_600


def test_watering_grace_suppresses_only_needs_water_and_preserves_score() -> None:
    config = _config()
    readings = {"sensor.a": _reading(10, now=0)}
    ordinary = evaluate(config, readings, now=0)
    grace = evaluate(
        config,
        readings,
        now=0,
        previous_needs_water=True,
        previous_too_wet=False,
        watering_grace=True,
    )
    assert ordinary.needs_water is True
    assert grace.needs_water is False
    assert grace.health_score == ordinary.health_score
    assert grace.computed_percent == ordinary.computed_percent
    assert grace.too_wet == ordinary.too_wet
    assert grace.sensor_stale == ordinary.sensor_stale


def test_watering_grace_does_not_make_unavailable_moisture_available() -> None:
    result = evaluate(
        _config(),
        {"sensor.a": _reading("unavailable")},
        now=0,
        watering_grace=True,
    )
    assert result.computed_available is False
    assert result.health_score is None
