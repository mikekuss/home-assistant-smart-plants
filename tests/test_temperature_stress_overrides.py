"""Tests for the temperature_stress per-plant threshold overrides slice."""

from __future__ import annotations

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import (
    TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
    TEMPERATURE_STRESS_OVERRIDE_KEYS,
    SensorSource,
    TemperatureConfig,
)
from custom_components.smart_plants.temperature_evaluator import (
    TemperatureReading,
    evaluate,
)
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def _loaded_manager(hass: HomeAssistant) -> SmartPlantsManager:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    return manager


async def _setup_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


# ---------------------------------------------------------------------------
# Pure model + storage tests
# ---------------------------------------------------------------------------


def test_default_temperature_config_has_all_null_overrides() -> None:
    config = TemperatureConfig()
    assert set(config.stress_threshold_overrides) == set(
        TEMPERATURE_STRESS_OVERRIDE_KEYS
    )
    assert all(value is None for value in config.stress_threshold_overrides.values())
    for key, expected in TEMPERATURE_STRESS_BUILTIN_DEFAULTS.items():
        assert config.effective_stress_threshold(key) == expected


def test_config_roundtrips_all_null_overrides_from_missing_key() -> None:
    raw: dict[str, object] = TemperatureConfig().as_storage()
    raw.pop("stress_threshold_overrides")
    reloaded = TemperatureConfig.from_storage(raw)
    for value in reloaded.stress_threshold_overrides.values():
        assert value is None
    stored = reloaded.as_storage()
    assert stored["stress_threshold_overrides"] == dict.fromkeys(
        TEMPERATURE_STRESS_OVERRIDE_KEYS, None
    )


def test_config_accepts_explicit_overrides_and_rounds_half_up() -> None:
    raw: dict[str, object] = {
        "sources": [],
        "primary_entity_id": None,
        "aggregation": "average",
        "stale_after_seconds": 21_600,
        "stress_threshold_overrides": {
            "cold_threshold_celsius": 5.04,
            "cold_clear_celsius": 8.05,
            "hot_threshold_celsius": 40,
            "hot_clear_celsius": None,
        },
    }
    config = TemperatureConfig.from_storage(raw)
    assert config.stress_threshold_overrides["cold_threshold_celsius"] == 5.0
    assert config.stress_threshold_overrides["cold_clear_celsius"] == 8.1
    assert config.stress_threshold_overrides["hot_threshold_celsius"] == 40.0
    assert config.stress_threshold_overrides["hot_clear_celsius"] is None
    assert config.effective_stress_threshold("hot_clear_celsius") == 32.0


@pytest.mark.parametrize(
    ("overrides", "message_substring"),
    [
        (
            {
                "cold_threshold_celsius": 20.0,
                "cold_clear_celsius": 15.0,
                "hot_threshold_celsius": None,
                "hot_clear_celsius": None,
            },
            "cold_threshold_celsius < cold_clear_celsius",
        ),
        (
            {
                "cold_threshold_celsius": 10.0,
                "cold_clear_celsius": 10.2,
                "hot_threshold_celsius": None,
                "hot_clear_celsius": None,
            },
            "cold_clear_celsius must exceed cold_threshold_celsius",
        ),
        (
            {
                "cold_threshold_celsius": None,
                "cold_clear_celsius": None,
                "hot_threshold_celsius": 32.3,
                "hot_clear_celsius": None,
            },
            "hot_threshold_celsius must exceed hot_clear_celsius",
        ),
        (
            {
                "cold_threshold_celsius": None,
                "cold_clear_celsius": 20.0,
                "hot_threshold_celsius": None,
                "hot_clear_celsius": 20.5,
            },
            "stable band",
        ),
        (
            {
                "cold_threshold_celsius": -40.5,
                "cold_clear_celsius": None,
                "hot_threshold_celsius": None,
                "hot_clear_celsius": None,
            },
            "value <= 80.0",
        ),
        (
            {
                "cold_threshold_celsius": None,
                "cold_clear_celsius": None,
                "hot_threshold_celsius": 80.5,
                "hot_clear_celsius": None,
            },
            "value <= 80.0",
        ),
        (
            {
                "cold_threshold_celsius": True,
                "cold_clear_celsius": None,
                "hot_threshold_celsius": None,
                "hot_clear_celsius": None,
            },
            "must be a number",
        ),
        (
            {
                "cold_threshold_celsius": float("nan"),
                "cold_clear_celsius": None,
                "hot_threshold_celsius": None,
                "hot_clear_celsius": None,
            },
            "must be a finite number",
        ),
    ],
)
def test_config_from_storage_rejects_invalid_override_maps(
    overrides: dict[str, object], message_substring: str
) -> None:
    raw: dict[str, object] = {
        "sources": [],
        "primary_entity_id": None,
        "aggregation": "average",
        "stale_after_seconds": 21_600,
        "stress_threshold_overrides": overrides,
    }
    with pytest.raises(ValueError, match=r".*") as excinfo:
        TemperatureConfig.from_storage(raw)
    assert message_substring in str(excinfo.value)


def test_config_from_storage_rejects_wrong_key_set() -> None:
    raw: dict[str, object] = {
        "sources": [],
        "primary_entity_id": None,
        "aggregation": "average",
        "stale_after_seconds": 21_600,
        "stress_threshold_overrides": {
            "cold_threshold_celsius": None,
            "cold_clear_celsius": None,
            "hot_threshold_celsius": None,
        },
    }
    with pytest.raises(ValueError, match="must contain"):
        TemperatureConfig.from_storage(raw)


# ---------------------------------------------------------------------------
# Evaluator behavioural tests
# ---------------------------------------------------------------------------


def _reading(value: object) -> TemperatureReading:
    return TemperatureReading(
        entity_id="sensor.a",
        value=value,
        unit_of_measurement=UnitOfTemperature.CELSIUS,
        last_valid_at=0.0,
    )


def test_evaluator_defaults_bit_identical_to_prior_thresholds() -> None:
    config = TemperatureConfig(
        sources=(SensorSource(entity_id="sensor.a"),),
        primary_entity_id="sensor.a",
        aggregation="primary",
    )
    hot = evaluate(config, {"sensor.a": _reading(36.0)}, now=1.0).temperature_stress
    assert hot.temperature_stress is True
    assert hot.reason == "hot_stress"
    assert hot.hot_threshold_celsius == 35.0

    cold = evaluate(config, {"sensor.a": _reading(9.9)}, now=1.0).temperature_stress
    assert cold.temperature_stress is True
    assert cold.reason == "cold_stress"

    ok = evaluate(config, {"sensor.a": _reading(20.0)}, now=1.0).temperature_stress
    assert ok.temperature_stress is False
    assert ok.reason == "temperature_ok"


def test_evaluator_uses_effective_overrides() -> None:
    config = TemperatureConfig(
        sources=(SensorSource(entity_id="sensor.a"),),
        primary_entity_id="sensor.a",
        aggregation="primary",
        stress_threshold_overrides={
            "cold_threshold_celsius": 5.0,
            "cold_clear_celsius": 7.0,
            "hot_threshold_celsius": 40.0,
            "hot_clear_celsius": 38.0,
        },
    )
    # 36 °C would have triggered hot with defaults but is fine with the override.
    result = evaluate(config, {"sensor.a": _reading(36.0)}, now=1.0).temperature_stress
    assert result.temperature_stress is False
    assert result.hot_threshold_celsius == 40.0
    assert result.hot_clear_celsius == 38.0
    assert result.cold_threshold_celsius == 5.0
    assert result.cold_clear_celsius == 7.0

    triggered = evaluate(
        config, {"sensor.a": _reading(40.0)}, now=1.0
    ).temperature_stress
    assert triggered.temperature_stress is True
    assert triggered.reason == "hot_stress"


def test_evaluator_hysteresis_uses_overridden_clear() -> None:
    config = TemperatureConfig(
        sources=(SensorSource(entity_id="sensor.a"),),
        primary_entity_id="sensor.a",
        aggregation="primary",
        stress_threshold_overrides={
            "cold_threshold_celsius": None,
            "cold_clear_celsius": None,
            "hot_threshold_celsius": 40.0,
            "hot_clear_celsius": 38.0,
        },
    )
    latched = evaluate(
        config,
        {"sensor.a": _reading(39.0)},
        now=1.0,
        previous_temperature_stress="hot",
    ).temperature_stress
    assert latched.temperature_stress is True

    cleared = evaluate(
        config,
        {"sensor.a": _reading(37.5)},
        now=1.0,
        previous_temperature_stress="hot",
    ).temperature_stress
    assert cleared.temperature_stress is False


# ---------------------------------------------------------------------------
# Manager + WebSocket surface tests
# ---------------------------------------------------------------------------


async def test_manager_persists_overrides_and_reconfigures_controller(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    hass.states.async_set(
        "sensor.temp", "36", {"unit_of_measurement": UnitOfTemperature.CELSIUS}
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.temp"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="temperature",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.temp",
    )
    controller = manager.get_role_controller(plant.id, "temperature")
    assert controller is not None
    before = controller.current_evaluation.temperature_stress
    assert before.temperature_stress is True

    current = manager.snapshot.plants[plant.id]
    updated = await manager.async_set_role_threshold_overrides(
        plant.id,
        role="temperature",
        expected_revision=current.revision,
        values={
            "cold_threshold_celsius": None,
            "cold_clear_celsius": None,
            "hot_threshold_celsius": 40.0,
            "hot_clear_celsius": 38.0,
        },
    )
    persisted = updated.role_config("temperature")
    assert isinstance(persisted, TemperatureConfig)
    assert persisted.stress_threshold_overrides["hot_threshold_celsius"] == 40.0
    assert persisted.stress_threshold_overrides["hot_clear_celsius"] == 38.0

    await hass.async_block_till_done()
    after = controller.current_evaluation.temperature_stress
    assert after.temperature_stress is False
    assert after.hot_threshold_celsius == 40.0
    assert after.hot_clear_celsius == 38.0


async def test_manager_rejects_invalid_override_ordering(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError):
        await manager.async_set_role_threshold_overrides(
            plant.id,
            role="temperature",
            expected_revision=plant.revision,
            values={
                "cold_threshold_celsius": 30.0,
                "cold_clear_celsius": None,
                "hot_threshold_celsius": None,
                "hot_clear_celsius": None,
            },
        )


async def test_manager_rejects_missing_override_key(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError):
        await manager.async_set_role_threshold_overrides(
            plant.id,
            role="temperature",
            expected_revision=plant.revision,
            values={
                "cold_threshold_celsius": None,
                "cold_clear_celsius": None,
                "hot_threshold_celsius": None,
            },
        )


async def test_manager_rejects_out_of_range_override(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError):
        await manager.async_set_role_threshold_overrides(
            plant.id,
            role="temperature",
            expected_revision=plant.revision,
            values={
                "cold_threshold_celsius": -50.0,
                "cold_clear_celsius": None,
                "hot_threshold_celsius": None,
                "hot_clear_celsius": None,
            },
        )


async def test_null_overrides_leave_evaluation_bit_identical(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    hass.states.async_set(
        "sensor.temp", "20", {"unit_of_measurement": UnitOfTemperature.CELSIUS}
    )
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.temp"}],
    )
    controller = manager.get_role_controller(plant.id, "temperature")
    assert controller is not None
    baseline = controller.current_evaluation.temperature_stress

    # Setting all-null overrides is a no-op: the config is unchanged.
    unchanged = await manager.async_set_role_threshold_overrides(
        plant.id,
        role="temperature",
        expected_revision=assigned.revision,
        values=dict.fromkeys(TEMPERATURE_STRESS_OVERRIDE_KEYS, None),
    )
    assert unchanged.revision == assigned.revision
    after = controller.current_evaluation.temperature_stress
    assert after == baseline


async def test_overrides_persist_across_reload(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    # Assign a temperature source so the temperature role config gets stored.
    updated = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.temp"}],
    )
    await manager.async_set_role_threshold_overrides(
        plant.id,
        role="temperature",
        expected_revision=updated.revision,
        values={
            "cold_threshold_celsius": 5.0,
            "cold_clear_celsius": 7.0,
            "hot_threshold_celsius": None,
            "hot_clear_celsius": None,
        },
    )
    reloaded = await _loaded_manager(hass)
    persisted = reloaded.snapshot.plants[plant.id].role_config("temperature")
    assert isinstance(persisted, TemperatureConfig)
    assert persisted.stress_threshold_overrides["cold_threshold_celsius"] == 5.0
    assert persisted.stress_threshold_overrides["cold_clear_celsius"] == 7.0
    assert persisted.stress_threshold_overrides["hot_threshold_celsius"] is None
    assert persisted.stress_threshold_overrides["hot_clear_celsius"] is None
