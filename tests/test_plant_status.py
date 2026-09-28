"""Unit tests for the pure overview status derivation."""

from __future__ import annotations

from typing import Any

import pytest
from custom_components.smart_plants.battery_evaluator import (
    BatteryEvaluation,
    LowBatteryEvaluation,
)
from custom_components.smart_plants.co2_evaluator import (
    Co2Evaluation,
    Co2StressEvaluation,
)
from custom_components.smart_plants.conductivity_evaluator import (
    ConductivityEvaluation,
    ConductivityStressEvaluation,
)
from custom_components.smart_plants.humidity_evaluator import (
    HumidityEvaluation,
    HumidityStressEvaluation,
)
from custom_components.smart_plants.illuminance_evaluator import (
    IlluminanceEvaluation,
    LowLightEvaluation,
)
from custom_components.smart_plants.moisture_evaluator import MoistureEvaluation
from custom_components.smart_plants.plant_status import (
    GENERIC_STRESS_KIND,
    STRESS_ROLE_ORDER,
    RoleProblem,
    evaluate_plant_status,
    role_state,
    stress_kind,
)
from custom_components.smart_plants.soil_temperature_evaluator import (
    SoilTemperatureEvaluation,
    SoilTemperatureStressEvaluation,
)
from custom_components.smart_plants.temperature_evaluator import (
    TemperatureEvaluation,
    TemperatureStressEvaluation,
)


def _moisture(
    *,
    percent: float | None = 45.0,
    needs_water: bool = False,
    too_wet: bool = False,
    stale: bool = False,
    reasons: tuple[str, ...] = (),
) -> MoistureEvaluation:
    return MoistureEvaluation(
        computed_percent=percent,
        health_score=None if percent is None else 90,
        needs_water=needs_water,
        too_wet=too_wet,
        sensor_stale=stale,
        computed_available=percent is not None,
        reasons=reasons,
    )


def _no_moisture_sources() -> MoistureEvaluation:
    return _moisture(percent=None, reasons=("no_sources",))


def _temperature(reason: str = "temperature_ok", *, stale: bool = False) -> Any:
    stress = reason in ("cold_stress", "hot_stress")
    return TemperatureEvaluation(
        computed_celsius=None if stale else 20.0,
        sensor_stale=stale,
        computed_available=not stale,
        temperature_stress=TemperatureStressEvaluation(
            temperature_stress=stress,
            available=not stale,
            confidence="low",
            reason="temperature_stale" if stale else reason,
        ),
    )


def _soil_temperature(reason: str) -> Any:
    return SoilTemperatureEvaluation(
        computed_celsius=20.0,
        sensor_stale=False,
        computed_available=True,
        soil_temperature_stress=SoilTemperatureStressEvaluation(
            soil_temperature_stress=reason in ("cold_stress", "hot_stress"),
            available=True,
            confidence="low",
            reason=reason,
        ),
    )


def _humidity(reason: str) -> Any:
    return HumidityEvaluation(
        computed_percent=50.0,
        sensor_stale=False,
        computed_available=True,
        humidity_stress=HumidityStressEvaluation(
            humidity_stress=reason in ("dry_stress", "damp_stress"),
            available=True,
            confidence="low",
            reason=reason,
        ),
    )


def _illuminance(*, low_light: bool) -> Any:
    return IlluminanceEvaluation(
        computed_lux=100.0,
        sensor_stale=False,
        computed_available=True,
        low_light=LowLightEvaluation(
            low_light=low_light,
            available=True,
            confidence="low",
            reason="low_light" if low_light else "enough_light",
            sample_count=3,
        ),
    )


def _conductivity(reason: str) -> Any:
    return ConductivityEvaluation(
        computed_micro_siemens_per_cm=500.0,
        sensor_stale=False,
        computed_available=True,
        conductivity_stress=ConductivityStressEvaluation(
            conductivity_stress=reason != "conductivity_ok",
            available=True,
            confidence="low",
            reason=reason,
        ),
    )


def _co2(*, stress: bool) -> Any:
    return Co2Evaluation(
        computed_ppm=2000 if stress else 600,
        sensor_stale=False,
        computed_available=True,
        co2_stress=Co2StressEvaluation(
            co2_stress=stress,
            available=True,
            confidence="low",
            reason="co2_stress" if stress else "co2_ok",
        ),
    )


def _battery(*, low: bool) -> Any:
    return BatteryEvaluation(
        computed_percent=5 if low else 80,
        sensor_stale=False,
        computed_available=True,
        low_battery=LowBatteryEvaluation(
            low_battery=low,
            available=True,
            confidence="low",
            reason="low_battery" if low else "battery_ok",
        ),
    )


_STRESSED: dict[str, tuple[Any, str]] = {
    "temperature": (_temperature("cold_stress"), "too_cold"),
    "humidity": (_humidity("dry_stress"), "too_dry"),
    "illuminance": (_illuminance(low_light=True), "low_light"),
    "conductivity": (_conductivity("high_conductivity_stress"), "high_conductivity"),
    "soil_temperature": (_soil_temperature("hot_stress"), "too_hot"),
    "co2": (_co2(stress=True), "high_co2"),
    "battery": (_battery(low=True), "battery_low"),
}


def _status(**evaluations: Any) -> tuple[str, list[tuple[str, str]]]:
    disabled = evaluations.pop("disabled", False)
    result = evaluate_plant_status(disabled=disabled, evaluations=evaluations)
    return result.status, [(p.role, p.kind) for p in result.problems]


def test_healthy_when_moisture_is_in_range_and_nothing_else_is_wrong() -> None:
    assert _status(moisture=_moisture()) == ("healthy", [])


def test_healthy_with_unstressed_secondary_roles() -> None:
    assert _status(
        moisture=_moisture(),
        temperature=_temperature(),
        humidity=_humidity("humidity_ok"),
        illuminance=_illuminance(low_light=False),
        conductivity=_conductivity("conductivity_ok"),
        soil_temperature=_soil_temperature("soil_temperature_ok"),
        co2=_co2(stress=False),
        battery=_battery(low=False),
    ) == ("healthy", [])


def test_paused_overrides_every_problem() -> None:
    assert _status(
        disabled=True,
        moisture=_moisture(needs_water=True, stale=True),
        temperature=_temperature("hot_stress"),
    ) == ("paused", [])


def test_paused_without_any_evaluation() -> None:
    assert _status(disabled=True) == ("paused", [])


def test_needs_water() -> None:
    assert _status(moisture=_moisture(percent=10, needs_water=True)) == (
        "needs_water",
        [("moisture", "needs_water")],
    )


def test_too_wet() -> None:
    assert _status(moisture=_moisture(percent=95, too_wet=True)) == (
        "too_wet",
        [("moisture", "too_wet")],
    )


def test_needs_water_outranks_other_stress_and_stale() -> None:
    status, problems = _status(
        moisture=_moisture(percent=10, needs_water=True, stale=True),
        temperature=_temperature("cold_stress"),
    )
    assert status == "needs_water"
    assert problems == [
        ("moisture", "needs_water"),
        ("temperature", "too_cold"),
        ("moisture", "stale"),
    ]


def test_too_wet_outranks_other_stress() -> None:
    status, problems = _status(
        moisture=_moisture(percent=95, too_wet=True),
        battery=_battery(low=True),
    )
    assert status == "too_wet"
    assert problems == [("moisture", "too_wet"), ("battery", "battery_low")]


@pytest.mark.parametrize("role", list(_STRESSED))
def test_each_role_stress_is_a_problem(role: str) -> None:
    evaluation, kind = _STRESSED[role]
    assert _status(moisture=_moisture(), **{role: evaluation}) == (
        "problem",
        [(role, kind)],
    )


@pytest.mark.parametrize(
    ("evaluation", "kind"),
    [
        (_temperature("hot_stress"), "too_hot"),
        (_humidity("damp_stress"), "too_humid"),
        (_conductivity("low_conductivity_stress"), "low_conductivity"),
        (_soil_temperature("cold_stress"), "too_cold"),
    ],
)
def test_opposite_directions_are_distinguished(evaluation: Any, kind: str) -> None:
    role = {
        TemperatureEvaluation: "temperature",
        HumidityEvaluation: "humidity",
        ConductivityEvaluation: "conductivity",
        SoilTemperatureEvaluation: "soil_temperature",
    }[type(evaluation)]
    assert stress_kind(role, evaluation) == kind


def test_several_problems_follow_priority_order() -> None:
    evaluations = {role: evaluation for role, (evaluation, _) in _STRESSED.items()}
    status, problems = _status(moisture=_moisture(stale=True), **evaluations)
    assert status == "problem"
    assert problems == [
        *((role, _STRESSED[role][1]) for role in STRESS_ROLE_ORDER),
        ("moisture", "stale"),
    ]


def test_problem_outranks_stale_moisture() -> None:
    assert _status(moisture=_moisture(stale=True), co2=_co2(stress=True)) == (
        "problem",
        [("co2", "high_co2"), ("moisture", "stale")],
    )


def test_problem_outranks_missing_moisture_sources() -> None:
    assert _status(
        moisture=_no_moisture_sources(), temperature=_temperature("hot_stress")
    ) == ("problem", [("temperature", "too_hot"), ("moisture", "no_sensors")])


def test_stale_moisture_with_a_usable_value() -> None:
    assert _status(moisture=_moisture(stale=True)) == (
        "stale",
        [("moisture", "stale")],
    )


def test_stale_moisture_without_a_value() -> None:
    assert _status(
        moisture=_moisture(percent=None, stale=True, reasons=("stale:sensor.mock",))
    ) == ("stale", [("moisture", "stale")])


def test_unavailable_moisture_reads_as_stale_status() -> None:
    assert _status(
        moisture=_moisture(percent=None, reasons=("invalid:sensor.mock_soil",))
    ) == ("stale", [("moisture", "unavailable")])


def test_no_sensors() -> None:
    assert _status(moisture=_no_moisture_sources()) == (
        "no_sensors",
        [("moisture", "no_sensors")],
    )


def test_missing_moisture_evaluation_counts_as_no_sensors() -> None:
    assert _status() == ("no_sensors", [("moisture", "no_sensors")])


def test_stale_secondary_role_is_not_a_problem() -> None:
    assert _status(moisture=_moisture(), temperature=_temperature(stale=True)) == (
        "healthy",
        [],
    )


def test_unknown_stress_reason_uses_generic_kind() -> None:
    evaluation = _temperature("cold_stress")
    odd = TemperatureEvaluation(
        computed_celsius=evaluation.computed_celsius,
        sensor_stale=False,
        computed_available=True,
        temperature_stress=TemperatureStressEvaluation(
            temperature_stress=True,
            available=True,
            confidence="low",
            reason="future_reason",
        ),
    )
    assert stress_kind("temperature", odd) == GENERIC_STRESS_KIND
    assert role_state("temperature", odd) == "high"


def test_role_problem_serializes() -> None:
    assert RoleProblem("moisture", "stale").as_dict() == {
        "role": "moisture",
        "kind": "stale",
    }


@pytest.mark.parametrize(
    ("role", "evaluation", "state"),
    [
        ("moisture", _moisture(), "ok"),
        ("moisture", _moisture(percent=10, needs_water=True), "low"),
        ("moisture", _moisture(percent=95, too_wet=True), "high"),
        ("moisture", _moisture(stale=True), "stale"),
        ("moisture", _moisture(percent=None, reasons=("invalid:x",)), "unavailable"),
        ("moisture", None, "unavailable"),
        ("temperature", _temperature(), "ok"),
        ("temperature", _temperature("cold_stress"), "low"),
        ("temperature", _temperature("hot_stress"), "high"),
        ("temperature", _temperature(stale=True), "stale"),
        ("humidity", _humidity("dry_stress"), "low"),
        ("humidity", _humidity("damp_stress"), "high"),
        ("illuminance", _illuminance(low_light=True), "low"),
        ("illuminance", _illuminance(low_light=False), "ok"),
        ("conductivity", _conductivity("low_conductivity_stress"), "low"),
        ("conductivity", _conductivity("high_conductivity_stress"), "high"),
        ("soil_temperature", _soil_temperature("cold_stress"), "low"),
        ("soil_temperature", _soil_temperature("hot_stress"), "high"),
        ("co2", _co2(stress=True), "high"),
        ("co2", _co2(stress=False), "ok"),
        ("battery", _battery(low=True), "low"),
        ("battery", _battery(low=False), "ok"),
    ],
)
def test_role_state(role: str, evaluation: Any, state: str) -> None:
    assert role_state(role, evaluation) == state
