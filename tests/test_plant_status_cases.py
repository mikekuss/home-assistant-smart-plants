"""
Shared status cases for the plant status and the dashboard card.

The card cannot call the admin-only overview command, so it rebuilds the
status from entity states. ``tests/fixtures/plant_status_cases.json`` holds,
for each case, the role evaluations, the entity states and the status. This
test checks that ``evaluate_plant_status`` returns that status for the
evaluations, and that the real entity classes show those entity states. The
frontend test ``src/card/plant-state.test.ts`` derives the status from the same
entity states.
"""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from custom_components.smart_plants.binary_sensor import (
    _Co2StressBinary,
    _ConductivityStressBinary,
    _HumidityStressBinary,
    _LowBatteryBinary,
    _LowLightBinary,
    _NeedsWaterBinary,
    _SensorStaleBinary,
    _SoilTemperatureStressBinary,
    _TemperatureStressBinary,
    _TooWetBinary,
)
from custom_components.smart_plants.moisture_evaluator import MoistureEvaluation
from custom_components.smart_plants.plant_status import evaluate_plant_status
from custom_components.smart_plants.sensor import (
    _BatterySensor,
    _Co2Sensor,
    _ConductivitySensor,
    _HumiditySensor,
    _IlluminanceSensor,
    _MoistureSensor,
    _SoilTemperatureSensor,
    _TemperatureSensor,
)

_CASES = json.loads(
    (Path(__file__).parent / "fixtures" / "plant_status_cases.json").read_text(
        encoding="utf-8"
    )
)["cases"]
_PLANT_ID = "0123456789abcdef0123456789abcdef"

# Role -> (stress attribute on the evaluation, its flag, the binary sensor).
_STRESS: dict[str, tuple[str, str, type]] = {
    "temperature": (
        "temperature_stress",
        "temperature_stress",
        _TemperatureStressBinary,
    ),
    "humidity": ("humidity_stress", "humidity_stress", _HumidityStressBinary),
    "illuminance": ("low_light", "low_light", _LowLightBinary),
    "conductivity": (
        "conductivity_stress",
        "conductivity_stress",
        _ConductivityStressBinary,
    ),
    "soil_temperature": (
        "soil_temperature_stress",
        "soil_temperature_stress",
        _SoilTemperatureStressBinary,
    ),
    "co2": ("co2_stress", "co2_stress", _Co2StressBinary),
    "battery": ("low_battery", "low_battery", _LowBatteryBinary),
}


# Role -> (value attribute on the evaluation, the reading sensor).
_READING: dict[str, tuple[str, type]] = {
    "temperature": ("computed_celsius", _TemperatureSensor),
    "humidity": ("computed_percent", _HumiditySensor),
    "illuminance": ("computed_lux", _IlluminanceSensor),
    "conductivity": ("computed_micro_siemens_per_cm", _ConductivitySensor),
    "soil_temperature": ("computed_celsius", _SoilTemperatureSensor),
    "co2": ("computed_ppm", _Co2Sensor),
    "battery": ("computed_percent", _BatterySensor),
}
# The reading a case's role shows unless it sets ``reading``.
_DEFAULT_READING = 20.0


class _Fields(SimpleNamespace):
    """A stress result; attributes the case does not set read as ``None``."""

    def __getattr__(self, name: str) -> Any:
        return None


def _moisture(data: dict[str, Any]) -> MoistureEvaluation:
    percent = data["percent"]
    return MoistureEvaluation(
        computed_percent=percent,
        health_score=None if percent is None else 50,
        needs_water=data["needs_water"],
        too_wet=data["too_wet"],
        sensor_stale=data["stale"],
        computed_available=percent is not None,
        reasons=tuple(data["reasons"]),
    )


def _stress(role: str, data: dict[str, Any]) -> SimpleNamespace:
    attribute, flag, _ = _STRESS[role]
    result = _Fields(
        available=data["available"], reason=data["reason"], **{flag: data["on"]}
    )
    value = data.get("reading", _DEFAULT_READING)
    return SimpleNamespace(
        computed_available=value is not None,
        sensor_stale=data.get("stale", False),
        nighttime=data.get("nighttime", False),
        reasons=tuple(data.get("reasons", ())),
        **{_READING[role][0]: value, attribute: result},
    )


def _evaluations(case: dict[str, Any]) -> dict[str, Any]:
    evaluations: dict[str, Any] = {"moisture": _moisture(case["moisture"])}
    for role, data in case["stress"].items():
        evaluations[role] = _stress(role, data)
    return evaluations


def _manager(case: dict[str, Any], evaluations: dict[str, Any]) -> SimpleNamespace:
    plant = SimpleNamespace(
        lifecycle_state="disabled" if case["disabled"] else "active",
        moisture=SimpleNamespace(
            moisture_min=20,
            moisture_target=40,
            moisture_max=60,
            sources=tuple(range(case["moisture"]["sources"])),
        ),
        care_events=(),
        snoozed_until=None,
        image=None,
    )

    def controller(role: str) -> SimpleNamespace | None:
        evaluation = evaluations.get(role)
        if evaluation is None:
            return None
        return SimpleNamespace(current_evaluation=evaluation)

    return SimpleNamespace(
        snapshot=SimpleNamespace(plants={_PLANT_ID: plant}),
        get_moisture_controller=lambda _plant_id: controller("moisture"),
        get_role_controller=lambda _plant_id, role: controller(role),
    )


def _binary_state(entity: Any) -> str:
    if not entity.available:
        return "unavailable"
    if entity.is_on is None:
        return "unknown"
    return "on" if entity.is_on else "off"


def _entity_states(manager: Any, case: dict[str, Any]) -> dict[str, Any]:
    moisture = _MoistureSensor(manager, _PLANT_ID)
    binaries = {
        key: cls(manager, _PLANT_ID)
        for key, cls in (
            ("needs_water", _NeedsWaterBinary),
            ("too_wet", _TooWetBinary),
            ("sensor_stale", _SensorStaleBinary),
        )
    }
    stress = {role: _STRESS[role][2](manager, _PLANT_ID) for role in case["stress"]}
    readings = {role: _READING[role][1](manager, _PLANT_ID) for role in case["stress"]}
    moisture_state = str(moisture.native_value) if moisture.available else "unavailable"
    states: dict[str, Any] = {
        "moisture": moisture_state,
        **{key: _binary_state(entity) for key, entity in binaries.items()},
        "stress": {
            role: {
                "state": _binary_state(entity),
                "reason": (
                    entity.extra_state_attributes.get("reason")
                    if entity.available
                    else None
                ),
            }
            for role, entity in stress.items()
        },
        "readings": {
            role: str(entity.native_value) if entity.available else "unavailable"
            for role, entity in readings.items()
        },
        # Not an entity state: the card reads the time of day from the clock.
        "night": any(data.get("nighttime", False) for data in case["stress"].values()),
    }
    stale = binaries["sensor_stale"]
    states["sources"] = (
        stale.extra_state_attributes.get("sources") if stale.available else None
    )
    every = [states["moisture"], *(states[key] for key in binaries)]
    every += [item["state"] for item in states["stress"].values()]
    every += list(states["readings"].values())
    states["allUnavailable"] = all(state == "unavailable" for state in every)
    return states


@pytest.mark.parametrize("case", _CASES, ids=[case["name"] for case in _CASES])
def test_status_matches_fixture(case: dict[str, Any]) -> None:
    result = evaluate_plant_status(
        disabled=case["disabled"], evaluations=_evaluations(case)
    )
    assert result.status == case["status"]
    assert [problem.as_dict() for problem in result.problems] == case["problems"]


@pytest.mark.parametrize("case", _CASES, ids=[case["name"] for case in _CASES])
def test_entities_show_fixture_states(case: dict[str, Any]) -> None:
    evaluations = _evaluations(case)
    assert _entity_states(_manager(case, evaluations), case) == case["entities"]


def test_card_differs_only_in_why_a_sensor_gives_no_value() -> None:
    # The entities don't say that several moisture sensors wait for a main
    # sensor, or whether a reading without a value went stale. The card
    # reports both as not reporting, with the same status.
    differences = [case for case in _CASES if "card" in case]
    assert differences
    for case in differences:
        assert case["card"]["status"] == case["status"]
        pairs = zip(case["card"]["problems"], case["problems"], strict=True)
        for card, backend in pairs:
            assert card["role"] == backend["role"]
            if card != backend:
                assert backend["kind"] in ("no_main_sensor", "stale")
                assert card["kind"] == "unavailable"
