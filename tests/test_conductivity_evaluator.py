from __future__ import annotations

from dataclasses import replace
from typing import Any, cast

import pytest
from custom_components.smart_plants.conductivity_evaluator import (
    CONDUCTIVITY_ASCII_MICROSIEMENS_PER_CM,
    CONDUCTIVITY_GREEK_MU_MICROSIEMENS_PER_CM,
    CONDUCTIVITY_HIGH_CLEAR_MICROSIEMENS_PER_CM,
    CONDUCTIVITY_HIGH_THRESHOLD_MICROSIEMENS_PER_CM,
    CONDUCTIVITY_LOW_CLEAR_MICROSIEMENS_PER_CM,
    CONDUCTIVITY_LOW_THRESHOLD_MICROSIEMENS_PER_CM,
    CONDUCTIVITY_MICROSIEMENS_PER_CM,
    ConductivityReading,
    evaluate,
    parse_conductivity,
)
from custom_components.smart_plants.models import ConductivityConfig, SensorSource
from homeassistant.const import PERCENTAGE, UnitOfConductivity


def _config(**kwargs: object) -> ConductivityConfig:
    base = ConductivityConfig(
        sources=(SensorSource(entity_id="sensor.a"),),
        primary_entity_id="sensor.a",
    )
    return replace(base, **cast("dict[str, Any]", kwargs))


def _reading(
    value: object,
    unit: object = CONDUCTIVITY_MICROSIEMENS_PER_CM,
    now: float = 0.0,
) -> ConductivityReading:
    return ConductivityReading(
        entity_id="sensor.a",
        value=value,
        unit_of_measurement=unit,
        last_valid_at=now,
    )


@pytest.mark.parametrize(
    ("value", "unit", "expected"),
    [
        (0, CONDUCTIVITY_MICROSIEMENS_PER_CM, 0.0),
        (10_000, CONDUCTIVITY_MICROSIEMENS_PER_CM, 10_000.0),
        (123.44, CONDUCTIVITY_MICROSIEMENS_PER_CM, 123.4),
        (123.45, CONDUCTIVITY_MICROSIEMENS_PER_CM, 123.5),
        ("432.1", CONDUCTIVITY_ASCII_MICROSIEMENS_PER_CM, 432.1),
        (-0.1, CONDUCTIVITY_MICROSIEMENS_PER_CM, None),
        (10_000.1, CONDUCTIVITY_MICROSIEMENS_PER_CM, None),
        (750, PERCENTAGE, None),
        (750, "mS/cm", None),
        (750, None, None),
        (None, CONDUCTIVITY_MICROSIEMENS_PER_CM, None),
        ("unknown", CONDUCTIVITY_MICROSIEMENS_PER_CM, None),
        ("unavailable", CONDUCTIVITY_MICROSIEMENS_PER_CM, None),
        (True, CONDUCTIVITY_MICROSIEMENS_PER_CM, None),
        (float("nan"), CONDUCTIVITY_MICROSIEMENS_PER_CM, None),
        (float("inf"), CONDUCTIVITY_MICROSIEMENS_PER_CM, None),
    ],
)
def test_conductivity_normalization_boundaries(
    value: object, unit: object, expected: float | None
) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value, unit)}, now=0.0)
    assert result.computed_available is (expected is not None)
    assert result.computed_micro_siemens_per_cm == expected


def test_ha_conductivity_constant_uses_greek_mu() -> None:
    # Regression guard for the review finding: HA's canonical unit uses the
    # Greek small letter mu (U+03BC), not the micro sign (U+00B5).
    ha_unit: str = str(UnitOfConductivity.MICROSIEMENS_PER_CM)
    micro_sign: str = str(CONDUCTIVITY_MICROSIEMENS_PER_CM)
    greek_mu: str = str(CONDUCTIVITY_GREEK_MU_MICROSIEMENS_PER_CM)
    assert ha_unit == "μS/cm"
    assert greek_mu == ha_unit
    assert micro_sign == "µS/cm"
    assert micro_sign != ha_unit


@pytest.mark.parametrize(
    "unit",
    [
        CONDUCTIVITY_MICROSIEMENS_PER_CM,
        CONDUCTIVITY_GREEK_MU_MICROSIEMENS_PER_CM,
        CONDUCTIVITY_ASCII_MICROSIEMENS_PER_CM,
        UnitOfConductivity.MICROSIEMENS_PER_CM,
    ],
)
def test_all_microsiemens_spellings_accepted(unit: object) -> None:
    # Every accepted spelling — including the real HA constant a source sensor
    # with device_class=CONDUCTIVITY reports — must parse identically.
    assert parse_conductivity(750, unit) == 750.0
    result = evaluate(_config(), {"sensor.a": _reading(750, unit)}, now=0.0)
    assert result.computed_available is True
    assert result.computed_micro_siemens_per_cm == 750.0


def test_primary_default_does_not_fall_back() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    readings = {
        "sensor.a": ConductivityReading(
            "sensor.a", "bad", CONDUCTIVITY_MICROSIEMENS_PER_CM
        ),
        "sensor.b": ConductivityReading(
            "sensor.b", 900, CONDUCTIVITY_MICROSIEMENS_PER_CM, last_valid_at=0.0
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
        "sensor.a": ConductivityReading(
            "sensor.a", 800, CONDUCTIVITY_MICROSIEMENS_PER_CM, last_valid_at=0.0
        ),
        "sensor.b": ConductivityReading(
            "sensor.b", 1000, CONDUCTIVITY_MICROSIEMENS_PER_CM, last_valid_at=0.0
        ),
        "sensor.c": ConductivityReading("sensor.c", 600, None, last_valid_at=0.0),
    }
    assert (
        evaluate(
            _config(sources=sources, aggregation="average", primary_entity_id=None),
            readings,
            now=0.0,
        ).computed_micro_siemens_per_cm
        == 900.0
    )
    assert (
        evaluate(
            _config(sources=sources, aggregation="min", primary_entity_id=None),
            readings,
            now=0.0,
        ).computed_micro_siemens_per_cm
        == 800.0
    )
    assert (
        evaluate(
            _config(sources=sources, aggregation="max", primary_entity_id=None),
            readings,
            now=0.0,
        ).computed_micro_siemens_per_cm
        == 1000.0
    )


def test_missing_and_stale_sources_make_unavailable_when_none_valid() -> None:
    config = _config(stale_after_seconds=60)
    result = evaluate(config, {"sensor.a": _reading(500, now=0.0)}, now=60.0)
    assert result.sensor_stale is True
    assert result.computed_available is False


@pytest.mark.parametrize(
    ("value", "expected", "reason"),
    [
        (
            CONDUCTIVITY_LOW_THRESHOLD_MICROSIEMENS_PER_CM,
            True,
            "low_conductivity_stress",
        ),
        (
            CONDUCTIVITY_LOW_THRESHOLD_MICROSIEMENS_PER_CM + 0.1,
            False,
            "conductivity_ok",
        ),
        (
            CONDUCTIVITY_HIGH_THRESHOLD_MICROSIEMENS_PER_CM - 0.1,
            False,
            "conductivity_ok",
        ),
        (
            CONDUCTIVITY_HIGH_THRESHOLD_MICROSIEMENS_PER_CM,
            True,
            "high_conductivity_stress",
        ),
    ],
)
def test_conductivity_stress_thresholds(
    value: float, expected: object, reason: str
) -> None:
    result = evaluate(_config(), {"sensor.a": _reading(value)}, now=0.0)
    assert result.conductivity_stress.available is True
    assert result.conductivity_stress.conductivity_stress is expected
    assert result.conductivity_stress.confidence == "low"
    assert result.conductivity_stress.reason == reason
    assert (
        result.conductivity_stress.low_threshold_micro_siemens_per_cm
        == CONDUCTIVITY_LOW_THRESHOLD_MICROSIEMENS_PER_CM
    )
    assert (
        result.conductivity_stress.low_clear_micro_siemens_per_cm
        == CONDUCTIVITY_LOW_CLEAR_MICROSIEMENS_PER_CM
    )
    assert (
        result.conductivity_stress.high_threshold_micro_siemens_per_cm
        == CONDUCTIVITY_HIGH_THRESHOLD_MICROSIEMENS_PER_CM
    )
    assert (
        result.conductivity_stress.high_clear_micro_siemens_per_cm
        == CONDUCTIVITY_HIGH_CLEAR_MICROSIEMENS_PER_CM
    )


def test_conductivity_stress_hysteresis_clears_matching_side() -> None:
    low_still_on = evaluate(
        _config(),
        {"sensor.a": _reading(CONDUCTIVITY_LOW_CLEAR_MICROSIEMENS_PER_CM - 0.1)},
        now=0.0,
        previous_conductivity_stress="low",
    )
    assert low_still_on.conductivity_stress.conductivity_stress is True
    low_cleared = evaluate(
        _config(),
        {"sensor.a": _reading(CONDUCTIVITY_LOW_CLEAR_MICROSIEMENS_PER_CM)},
        now=0.0,
        previous_conductivity_stress="low",
    )
    assert low_cleared.conductivity_stress.conductivity_stress is False

    high_still_on = evaluate(
        _config(),
        {"sensor.a": _reading(CONDUCTIVITY_HIGH_CLEAR_MICROSIEMENS_PER_CM + 0.1)},
        now=0.0,
        previous_conductivity_stress="high",
    )
    assert high_still_on.conductivity_stress.conductivity_stress is True
    high_cleared = evaluate(
        _config(),
        {"sensor.a": _reading(CONDUCTIVITY_HIGH_CLEAR_MICROSIEMENS_PER_CM)},
        now=0.0,
        previous_conductivity_stress="high",
    )
    assert high_cleared.conductivity_stress.conductivity_stress is False


def test_conductivity_stress_unavailable_when_conductivity_unavailable() -> None:
    result = evaluate(_config(), {"sensor.a": _reading("unavailable")}, now=0.0)
    assert result.conductivity_stress.available is False
    assert result.conductivity_stress.conductivity_stress is False
    assert result.conductivity_stress.confidence == "none"
    assert result.conductivity_stress.reason == "conductivity_unavailable"


def test_conductivity_stress_unavailable_when_any_source_is_stale() -> None:
    sources = (
        SensorSource(entity_id="sensor.a"),
        SensorSource(entity_id="sensor.b"),
    )
    config = _config(
        sources=sources,
        aggregation="min",
        primary_entity_id=None,
        stale_after_seconds=60,
    )
    result = evaluate(
        config,
        {
            "sensor.a": ConductivityReading(
                "sensor.a", 800, CONDUCTIVITY_MICROSIEMENS_PER_CM, last_valid_at=100.0
            ),
            "sensor.b": ConductivityReading(
                "sensor.b", 850, CONDUCTIVITY_MICROSIEMENS_PER_CM, last_valid_at=0.0
            ),
        },
        now=100.0,
    )
    assert result.computed_available is True
    assert result.conductivity_stress.available is False
    assert result.conductivity_stress.reason == "conductivity_stale"
