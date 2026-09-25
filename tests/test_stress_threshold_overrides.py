"""Tests for the shared per-role stress threshold overrides slice."""

from __future__ import annotations

from typing import Any

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import (
    CO2_STRESS_BUILTIN_DEFAULTS,
    CO2_STRESS_OVERRIDE_KEYS,
    CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS,
    CONDUCTIVITY_STRESS_OVERRIDE_KEYS,
    HUMIDITY_STRESS_BUILTIN_DEFAULTS,
    HUMIDITY_STRESS_OVERRIDE_KEYS,
    LOW_BATTERY_BUILTIN_DEFAULTS,
    LOW_BATTERY_OVERRIDE_KEYS,
    LOW_LIGHT_BUILTIN_DEFAULTS,
    LOW_LIGHT_OVERRIDE_KEYS,
    SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
    SOIL_TEMPERATURE_STRESS_OVERRIDE_KEYS,
    BatteryConfig,
    Co2Config,
    ConductivityConfig,
    HumidityConfig,
    IlluminanceConfig,
    SoilTemperatureConfig,
)
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

_ROLE_MATRIX = [
    (
        "humidity",
        HumidityConfig,
        HUMIDITY_STRESS_OVERRIDE_KEYS,
        HUMIDITY_STRESS_BUILTIN_DEFAULTS,
    ),
    (
        "illuminance",
        IlluminanceConfig,
        LOW_LIGHT_OVERRIDE_KEYS,
        LOW_LIGHT_BUILTIN_DEFAULTS,
    ),
    ("battery", BatteryConfig, LOW_BATTERY_OVERRIDE_KEYS, LOW_BATTERY_BUILTIN_DEFAULTS),
    (
        "conductivity",
        ConductivityConfig,
        CONDUCTIVITY_STRESS_OVERRIDE_KEYS,
        CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS,
    ),
    (
        "soil_temperature",
        SoilTemperatureConfig,
        SOIL_TEMPERATURE_STRESS_OVERRIDE_KEYS,
        SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
    ),
    ("co2", Co2Config, CO2_STRESS_OVERRIDE_KEYS, CO2_STRESS_BUILTIN_DEFAULTS),
]


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


@pytest.mark.parametrize(("_role", "cls", "keys", "builtins"), _ROLE_MATRIX)
def test_defaults_all_null_overrides(
    _role: str, cls: type[Any], keys: tuple[str, ...], builtins: dict[str, Any]
) -> None:
    config = cls()
    assert set(config.stress_threshold_overrides) == set(keys)
    assert all(value is None for value in config.stress_threshold_overrides.values())
    for key, expected in builtins.items():
        assert config.effective_stress_threshold(key) == expected


@pytest.mark.parametrize(("_role", "cls", "keys", "_builtins"), _ROLE_MATRIX)
def test_from_storage_missing_field_treated_as_all_null(
    _role: str, cls: type[Any], keys: tuple[str, ...], _builtins: dict[str, Any]
) -> None:
    raw: dict[str, object] = cls().as_storage()
    raw.pop("stress_threshold_overrides")
    reloaded = cls.from_storage(raw)
    assert all(v is None for v in reloaded.stress_threshold_overrides.values())
    stored = reloaded.as_storage()
    assert stored["stress_threshold_overrides"] == dict.fromkeys(keys, None)


@pytest.mark.parametrize(("_role", "cls", "keys", "_builtins"), _ROLE_MATRIX)
def test_from_storage_rejects_wrong_key_set(
    _role: str, cls: type[Any], keys: tuple[str, ...], _builtins: dict[str, Any]
) -> None:
    raw: dict[str, object] = cls().as_storage()
    partial = dict.fromkeys(keys[:-1], None)  # drop last key
    raw["stress_threshold_overrides"] = partial
    with pytest.raises(ValueError, match="must contain"):
        cls.from_storage(raw)


# ---------------------------------------------------------------------------
# Per-role bit-identical / effective-override behaviour
# ---------------------------------------------------------------------------


def test_humidity_effective_override_and_null_bit_identical() -> None:
    default = HumidityConfig()
    for key, expected in HUMIDITY_STRESS_BUILTIN_DEFAULTS.items():
        assert default.effective_stress_threshold(key) == expected

    overridden = HumidityConfig(
        stress_threshold_overrides={
            "dry_threshold_percent": 15.0,
            "dry_clear_percent": None,
            "damp_threshold_percent": None,
            "damp_clear_percent": None,
        }
    )
    assert overridden.effective_stress_threshold("dry_threshold_percent") == 15.0
    assert overridden.effective_stress_threshold("dry_clear_percent") == 30.0


# ---------------------------------------------------------------------------
# Manager / WebSocket surface tests
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(("role", "cls", "keys", "_builtins"), _ROLE_MATRIX)
async def test_null_overrides_leave_evaluation_bit_identical(
    hass: HomeAssistant,
    role: str,
    cls: type[Any],
    keys: tuple[str, ...],
    _builtins: dict[str, Any],
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    unchanged = await manager.async_set_role_threshold_overrides(
        plant.id,
        role=role,
        expected_revision=plant.revision,
        values=dict.fromkeys(keys, None),
    )
    # Setting all-null when config was default is a no-op: revision unchanged.
    assert unchanged.revision == plant.revision
    persisted: Any = unchanged.role_config(role)
    if persisted is not None:
        assert isinstance(persisted, cls)
        assert all(persisted.stress_threshold_overrides[k] is None for k in keys)


@pytest.mark.parametrize(
    ("role", "values", "message_substring"),
    [
        (
            "humidity",
            {
                "dry_threshold_percent": 50.0,
                "dry_clear_percent": 40.0,
                "damp_threshold_percent": None,
                "damp_clear_percent": None,
            },
            "dry_threshold_percent < dry_clear_percent",
        ),
        (
            "illuminance",
            {"target_lux": 800.0, "clear_lux": 700.0},
            "target_lux < clear_lux",
        ),
        (
            "battery",
            {"threshold_percent": 30, "clear_percent": 20},
            "threshold_percent < clear_percent",
        ),
        (
            "conductivity",
            {
                "low_threshold_micro_siemens_per_cm": 2500.0,
                "low_clear_micro_siemens_per_cm": None,
                "high_threshold_micro_siemens_per_cm": None,
                "high_clear_micro_siemens_per_cm": None,
            },
            "low_threshold_micro_siemens_per_cm <",
        ),
        (
            "soil_temperature",
            {
                "cold_threshold_celsius": 40.0,
                "cold_clear_celsius": None,
                "hot_threshold_celsius": None,
                "hot_clear_celsius": None,
            },
            "cold_threshold_celsius < cold_clear_celsius",
        ),
        (
            "co2",
            {"threshold_ppm": 3000, "clear_ppm": 4000},
            "clear_ppm < threshold_ppm",
        ),
    ],
)
async def test_manager_rejects_invalid_override_ordering(
    hass: HomeAssistant,
    role: str,
    values: dict[str, Any],
    message_substring: str,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError) as excinfo:
        await manager.async_set_role_threshold_overrides(
            plant.id,
            role=role,
            expected_revision=plant.revision,
            values=values,
        )
    assert message_substring in str(excinfo.value)


@pytest.mark.parametrize(
    ("role", "keys"),
    [
        ("humidity", HUMIDITY_STRESS_OVERRIDE_KEYS),
        ("illuminance", LOW_LIGHT_OVERRIDE_KEYS),
        ("battery", LOW_BATTERY_OVERRIDE_KEYS),
        ("conductivity", CONDUCTIVITY_STRESS_OVERRIDE_KEYS),
        ("soil_temperature", SOIL_TEMPERATURE_STRESS_OVERRIDE_KEYS),
        ("co2", CO2_STRESS_OVERRIDE_KEYS),
    ],
)
async def test_manager_rejects_missing_override_key(
    hass: HomeAssistant, role: str, keys: tuple[str, ...]
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    partial = dict.fromkeys(keys[:-1], None)
    with pytest.raises(SmartPlantsValidationError):
        await manager.async_set_role_threshold_overrides(
            plant.id,
            role=role,
            expected_revision=plant.revision,
            values=partial,
        )


async def test_humidity_overrides_persist_across_reload(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_set_role_sources(
        plant.id,
        role="humidity",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.h"}],
    )
    await manager.async_set_role_threshold_overrides(
        plant.id,
        role="humidity",
        expected_revision=updated.revision,
        values={
            "dry_threshold_percent": 15.0,
            "dry_clear_percent": 20.0,
            "damp_threshold_percent": None,
            "damp_clear_percent": None,
        },
    )
    reloaded = await _loaded_manager(hass)
    persisted = reloaded.snapshot.plants[plant.id].role_config("humidity")
    assert isinstance(persisted, HumidityConfig)
    assert persisted.stress_threshold_overrides["dry_threshold_percent"] == 15.0
    assert persisted.stress_threshold_overrides["dry_clear_percent"] == 20.0
    assert persisted.stress_threshold_overrides["damp_threshold_percent"] is None
    assert persisted.stress_threshold_overrides["damp_clear_percent"] is None


async def test_co2_manager_persists_and_reconfigures(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    hass.states.async_set("sensor.co2", "4500", {"unit_of_measurement": "ppm"})
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="co2",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.co2"}],
    )
    await manager.async_set_role_aggregation(
        plant.id,
        role="co2",
        expected_revision=assigned.revision,
        aggregation="average",
    )
    controller = manager.get_role_controller(plant.id, "co2")
    assert controller is not None
    baseline = controller.current_evaluation.co2_stress
    # 4500 ppm is below default 5000 threshold — no stress
    assert baseline.co2_stress is False

    current = manager.snapshot.plants[plant.id]
    await manager.async_set_role_threshold_overrides(
        plant.id,
        role="co2",
        expected_revision=current.revision,
        values={"threshold_ppm": 4000, "clear_ppm": 3500},
    )
    await hass.async_block_till_done()
    after = controller.current_evaluation.co2_stress
    assert after.co2_stress is True
    assert after.threshold_ppm == 4000
    assert after.clear_ppm == 3500
