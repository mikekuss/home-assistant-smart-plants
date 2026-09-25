"""Pure tests for the multi-role health composite evaluator."""

from __future__ import annotations

from custom_components.smart_plants.co2_evaluator import (
    Co2Evaluation,
    Co2StressEvaluation,
)
from custom_components.smart_plants.conductivity_evaluator import (
    ConductivityEvaluation,
    ConductivityStressEvaluation,
)
from custom_components.smart_plants.health_evaluator import (
    CONTRIBUTOR_ORDER,
    HealthInputs,
    evaluate,
)
from custom_components.smart_plants.humidity_evaluator import (
    HumidityEvaluation,
    HumidityStressEvaluation,
)
from custom_components.smart_plants.illuminance_evaluator import (
    IlluminanceEvaluation,
    LowLightEvaluation,
)
from custom_components.smart_plants.models import (
    BatteryConfig,
    Co2Config,
    ConductivityConfig,
    HumidityConfig,
    IlluminanceConfig,
    MoistureConfig,
    PlantRecord,
    SensorSource,
    SoilTemperatureConfig,
    TemperatureConfig,
)
from custom_components.smart_plants.moisture_evaluator import MoistureEvaluation
from custom_components.smart_plants.soil_temperature_evaluator import (
    SoilTemperatureEvaluation,
    SoilTemperatureStressEvaluation,
)
from custom_components.smart_plants.temperature_evaluator import (
    TemperatureEvaluation,
    TemperatureStressEvaluation,
)


def _source(entity_id: str = "sensor.a") -> SensorSource:
    return SensorSource(entity_id=entity_id)


def _plant(**role_configs: object) -> PlantRecord:
    moisture = role_configs.pop("moisture", MoistureConfig())
    extra: dict[str, object] = dict(role_configs)
    return PlantRecord(
        id="p1",
        revision=1,
        name="Aloe",
        created_at="2026-01-01T00:00:00+00:00",
        moisture=moisture,  # type: ignore[arg-type]
        extra_roles=extra,
    )


def _moisture(*, health: int | None, available: bool = True) -> MoistureEvaluation:
    return MoistureEvaluation(
        computed_percent=42.0 if available else None,
        health_score=health,
        needs_water=False,
        too_wet=False,
        sensor_stale=False,
        computed_available=available,
    )


def _temperature(*, stress: bool, available: bool = True) -> TemperatureEvaluation:
    return TemperatureEvaluation(
        computed_celsius=22.0 if available else None,
        sensor_stale=False,
        computed_available=available,
        temperature_stress=TemperatureStressEvaluation(
            temperature_stress=stress,
            available=available,
            confidence="high",
            reason="ok" if not stress else "hot_stress",
        ),
    )


def _humidity(*, stress: bool, available: bool = True) -> HumidityEvaluation:
    return HumidityEvaluation(
        computed_percent=55.0 if available else None,
        sensor_stale=False,
        computed_available=available,
        humidity_stress=HumidityStressEvaluation(
            humidity_stress=stress,
            available=available,
            confidence="high",
            reason="ok" if not stress else "dry_stress",
        ),
    )


def _illuminance(*, low: bool, available: bool = True) -> IlluminanceEvaluation:
    return IlluminanceEvaluation(
        computed_lux=1200.0 if available else None,
        sensor_stale=False,
        computed_available=available,
        low_light=LowLightEvaluation(
            low_light=low,
            available=available,
            confidence="high",
            reason="ok" if not low else "below_target",
            sample_count=4,
        ),
    )


def _conductivity(*, stress: bool, available: bool = True) -> ConductivityEvaluation:
    return ConductivityEvaluation(
        computed_micro_siemens_per_cm=800.0 if available else None,
        sensor_stale=False,
        computed_available=available,
        conductivity_stress=ConductivityStressEvaluation(
            conductivity_stress=stress,
            available=available,
            confidence="high",
            reason="ok" if not stress else "high_stress",
        ),
    )


def _soil_temperature(
    *, stress: bool, available: bool = True
) -> SoilTemperatureEvaluation:
    return SoilTemperatureEvaluation(
        computed_celsius=20.0 if available else None,
        sensor_stale=False,
        computed_available=available,
        soil_temperature_stress=SoilTemperatureStressEvaluation(
            soil_temperature_stress=stress,
            available=available,
            confidence="high",
            reason="ok" if not stress else "cold_stress",
        ),
    )


def _co2(*, stress: bool, available: bool = True) -> Co2Evaluation:
    return Co2Evaluation(
        computed_ppm=1000 if available else None,
        sensor_stale=False,
        computed_available=available,
        co2_stress=Co2StressEvaluation(
            co2_stress=stress,
            available=available,
            confidence="high",
            reason="ok" if not stress else "above_threshold",
        ),
    )


def _empty_inputs(plant: PlantRecord) -> HealthInputs:
    return HealthInputs(
        plant=plant,
        moisture=None,
        temperature=None,
        humidity=None,
        illuminance=None,
        conductivity=None,
        soil_temperature=None,
        co2=None,
    )


# ---------------------------------------------------------------------------
# No roles configured
# ---------------------------------------------------------------------------


def test_no_roles_configured_returns_unavailable() -> None:
    plant = _plant()  # default moisture with no sources → not configured
    result = evaluate(_empty_inputs(plant))
    assert result.available is False
    assert result.health_score is None
    assert result.confidence == 0.0
    assert result.confidence_label == "unknown"
    assert result.contributors == ()
    assert result.configured == ()
    assert "no_roles_configured" in result.reasons


# ---------------------------------------------------------------------------
# Moisture-only bit-identical equivalence
# ---------------------------------------------------------------------------


def test_moisture_only_bit_identical_at_anchors() -> None:
    moisture_cfg = MoistureConfig(sources=(_source(),), primary_entity_id="sensor.a")
    plant = _plant(moisture=moisture_cfg)
    for score in (0, 25, 50, 73, 100):
        inputs = HealthInputs(
            plant=plant,
            moisture=_moisture(health=score),
            temperature=None,
            humidity=None,
            illuminance=None,
            conductivity=None,
            soil_temperature=None,
            co2=None,
        )
        result = evaluate(inputs)
        assert result.health_score == score
        assert result.available is True
        assert result.confidence == 1.0
        assert result.confidence_label == "high"
        assert result.contributors == ("moisture",)
        assert result.configured == ("moisture",)


def test_moisture_configured_but_unavailable_is_excluded() -> None:
    moisture_cfg = MoistureConfig(sources=(_source(),), primary_entity_id="sensor.a")
    plant = _plant(moisture=moisture_cfg)
    inputs = HealthInputs(
        plant=plant,
        moisture=_moisture(health=None, available=False),
        temperature=None,
        humidity=None,
        illuminance=None,
        conductivity=None,
        soil_temperature=None,
        co2=None,
    )
    result = evaluate(inputs)
    assert result.available is False
    assert result.health_score is None
    assert result.confidence == 0.0
    assert result.confidence_label == "low"  # 0 included / 1 configured
    assert result.contributors == ()
    assert result.configured == ("moisture",)


# ---------------------------------------------------------------------------
# Stress binaries contribute 100 or 0
# ---------------------------------------------------------------------------


def test_temperature_stress_on_contributes_zero() -> None:
    moisture_cfg = MoistureConfig(sources=(_source(),), primary_entity_id="sensor.a")
    temperature_cfg = TemperatureConfig(
        sources=(_source("sensor.t"),), primary_entity_id="sensor.t"
    )
    plant = _plant(moisture=moisture_cfg, temperature=temperature_cfg)
    inputs = HealthInputs(
        plant=plant,
        moisture=_moisture(health=100),
        temperature=_temperature(stress=True),
        humidity=None,
        illuminance=None,
        conductivity=None,
        soil_temperature=None,
        co2=None,
    )
    result = evaluate(inputs)
    # Weighted: 3*100 + 2*0 over weight 5 = 60.
    assert result.health_score == 60
    assert result.contributors == ("moisture", "temperature")
    assert result.confidence == 1.0
    assert result.confidence_label == "high"


def test_temperature_stress_off_matches_moisture() -> None:
    moisture_cfg = MoistureConfig(sources=(_source(),), primary_entity_id="sensor.a")
    temperature_cfg = TemperatureConfig(
        sources=(_source("sensor.t"),), primary_entity_id="sensor.t"
    )
    plant = _plant(moisture=moisture_cfg, temperature=temperature_cfg)
    inputs = HealthInputs(
        plant=plant,
        moisture=_moisture(health=80),
        temperature=_temperature(stress=False),
        humidity=None,
        illuminance=None,
        conductivity=None,
        soil_temperature=None,
        co2=None,
    )
    result = evaluate(inputs)
    # (3*80 + 2*100) / 5 = 440/5 = 88
    assert result.health_score == 88


def test_all_roles_available_and_healthy() -> None:
    plant = _plant(
        moisture=MoistureConfig(sources=(_source(),), primary_entity_id="sensor.a"),
        temperature=TemperatureConfig(
            sources=(_source("sensor.t"),), primary_entity_id="sensor.t"
        ),
        humidity=HumidityConfig(
            sources=(_source("sensor.h"),), primary_entity_id="sensor.h"
        ),
        illuminance=IlluminanceConfig(
            sources=(_source("sensor.l"),), primary_entity_id="sensor.l"
        ),
        battery=BatteryConfig(
            sources=(_source("sensor.b"),), primary_entity_id="sensor.b"
        ),
        conductivity=ConductivityConfig(
            sources=(_source("sensor.c"),), primary_entity_id="sensor.c"
        ),
        soil_temperature=SoilTemperatureConfig(
            sources=(_source("sensor.st"),), primary_entity_id="sensor.st"
        ),
        co2=Co2Config(sources=(_source("sensor.co2"),), primary_entity_id="sensor.co2"),
    )
    inputs = HealthInputs(
        plant=plant,
        moisture=_moisture(health=100),
        temperature=_temperature(stress=False),
        humidity=_humidity(stress=False),
        illuminance=_illuminance(low=False),
        conductivity=_conductivity(stress=False),
        soil_temperature=_soil_temperature(stress=False),
        co2=_co2(stress=False),
    )
    result = evaluate(inputs)
    # every contributor at 100, weight sum 10
    assert result.health_score == 100
    assert result.contributors == CONTRIBUTOR_ORDER
    assert result.configured == CONTRIBUTOR_ORDER
    assert result.confidence == 1.0
    assert result.confidence_label == "high"


def test_configured_but_unavailable_role_excluded_from_denominator() -> None:
    plant = _plant(
        moisture=MoistureConfig(sources=(_source(),), primary_entity_id="sensor.a"),
        temperature=TemperatureConfig(
            sources=(_source("sensor.t"),), primary_entity_id="sensor.t"
        ),
        humidity=HumidityConfig(
            sources=(_source("sensor.h"),), primary_entity_id="sensor.h"
        ),
    )
    inputs = HealthInputs(
        plant=plant,
        moisture=_moisture(health=80),
        temperature=_temperature(stress=False),
        humidity=_humidity(stress=False, available=False),
        illuminance=None,
        conductivity=None,
        soil_temperature=None,
        co2=None,
    )
    result = evaluate(inputs)
    # humidity is configured but unavailable → excluded from both sides
    # (3*80 + 2*100)/5 = 88
    assert result.health_score == 88
    assert result.contributors == ("moisture", "temperature")
    assert result.configured == ("moisture", "temperature", "humidity")
    # 2 included / 3 configured → medium
    assert result.confidence_label == "medium"
    assert result.confidence == 2 / 3


def test_half_up_rounding_tie_break() -> None:
    # Craft weighted mean of exactly 0.5 tail: moisture=50, temp stress off (100)
    # (3*50 + 2*100) / 5 = 350/5 = 70 (no fractional). Use humidity to force .5.
    plant = _plant(
        moisture=MoistureConfig(sources=(_source(),), primary_entity_id="sensor.a"),
        humidity=HumidityConfig(
            sources=(_source("sensor.h"),), primary_entity_id="sensor.h"
        ),
    )
    # 3*50 + 1*x, weight 4. Want (150 + x)/4 to end in .5 → e.g. x=100 → 62.5.
    inputs = HealthInputs(
        plant=plant,
        moisture=_moisture(health=50),
        temperature=None,
        humidity=_humidity(stress=False),
        illuminance=None,
        conductivity=None,
        soil_temperature=None,
        co2=None,
    )
    result = evaluate(inputs)
    # (3*50 + 1*100)/4 = 250/4 = 62.5 → 63 (half-up)
    assert result.health_score == 63


def test_missing_role_never_treated_as_healthy() -> None:
    # Only moisture configured; temperature+humidity not configured; result
    # depends solely on moisture, not padded with implicit 100s.
    plant = _plant(
        moisture=MoistureConfig(sources=(_source(),), primary_entity_id="sensor.a"),
    )
    inputs = HealthInputs(
        plant=plant,
        moisture=_moisture(health=40),
        temperature=None,
        humidity=None,
        illuminance=None,
        conductivity=None,
        soil_temperature=None,
        co2=None,
    )
    result = evaluate(inputs)
    assert result.health_score == 40


def _illuminance_nighttime() -> IlluminanceEvaluation:
    return IlluminanceEvaluation(
        computed_lux=0.0,
        sensor_stale=False,
        computed_available=True,
        low_light=LowLightEvaluation(
            low_light=False,
            available=True,
            confidence="none",
            reason="nighttime",
            sample_count=0,
        ),
    )


def test_nighttime_illuminance_excluded_from_composite() -> None:
    # At night the low_light binary is available/off, but the health composite
    # must exclude illuminance rather than count a nighttime off as healthy.
    plant = _plant(
        moisture=MoistureConfig(sources=(_source(),), primary_entity_id="sensor.a"),
        illuminance=IlluminanceConfig(
            sources=(_source("sensor.l"),), primary_entity_id="sensor.l"
        ),
    )
    inputs = HealthInputs(
        plant=plant,
        moisture=_moisture(health=40),
        temperature=None,
        humidity=None,
        illuminance=_illuminance_nighttime(),
        conductivity=None,
        soil_temperature=None,
        co2=None,
    )
    result = evaluate(inputs)
    # Only moisture contributes; illuminance is configured but excluded.
    assert result.health_score == 40
    assert result.contributors == ("moisture",)
    assert result.configured == ("moisture", "illuminance")


def test_confidence_label_low_when_less_than_half() -> None:
    plant = _plant(
        moisture=MoistureConfig(sources=(_source(),), primary_entity_id="sensor.a"),
        temperature=TemperatureConfig(
            sources=(_source("sensor.t"),), primary_entity_id="sensor.t"
        ),
        humidity=HumidityConfig(
            sources=(_source("sensor.h"),), primary_entity_id="sensor.h"
        ),
        illuminance=IlluminanceConfig(
            sources=(_source("sensor.l"),), primary_entity_id="sensor.l"
        ),
        battery=BatteryConfig(
            sources=(_source("sensor.b"),), primary_entity_id="sensor.b"
        ),
    )
    # battery is configured on the plant but excluded from the composite, so 4
    # roles count. 1 of 4 configured available → below ceil(4/2)=2 → "low"
    inputs = HealthInputs(
        plant=plant,
        moisture=_moisture(health=50),
        temperature=_temperature(stress=False, available=False),
        humidity=_humidity(stress=False, available=False),
        illuminance=_illuminance(low=False, available=False),
        conductivity=None,
        soil_temperature=None,
        co2=None,
    )
    result = evaluate(inputs)
    assert result.confidence_label == "low"
    assert result.contributors == ("moisture",)
    assert result.configured == (
        "moisture",
        "temperature",
        "humidity",
        "illuminance",
    )


def test_stress_binaries_only_when_moisture_not_configured() -> None:
    plant = _plant(
        temperature=TemperatureConfig(
            sources=(_source("sensor.t"),), primary_entity_id="sensor.t"
        ),
        humidity=HumidityConfig(
            sources=(_source("sensor.h"),), primary_entity_id="sensor.h"
        ),
    )
    inputs = HealthInputs(
        plant=plant,
        moisture=None,
        temperature=_temperature(stress=True),
        humidity=_humidity(stress=False),
        illuminance=None,
        conductivity=None,
        soil_temperature=None,
        co2=None,
    )
    result = evaluate(inputs)
    # (2*0 + 1*100)/3 = 33.33 → 33
    assert result.health_score == 33
    assert result.contributors == ("temperature", "humidity")
    assert "moisture" not in result.configured
