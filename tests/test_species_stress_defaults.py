"""
Temperature and air humidity thresholds that come from the species.

A species from a provider can supply the range a plant likes. Its edges become
the thresholds where the temperature and humidity problem sensors turn on; the
values where they clear keep the built-in gap. The plant's own overrides always
win, and a species never makes an apply fail because of these thresholds.
"""

from __future__ import annotations

from typing import Any, cast

import pytest
from custom_components.smart_plants.const import (
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import (
    HUMIDITY_STRESS_BUILTIN_DEFAULTS,
    TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
    HumidityConfig,
    PlantRecord,
    PlantSpecies,
    TemperatureConfig,
)
from custom_components.smart_plants.provider import (
    ManualSpeciesProvider,
    ProviderRegistry,
    SpeciesProviderService,
)
from custom_components.smart_plants.providers.openplantbook import ATTRIBUTION
from custom_components.smart_plants.roles import require_role
from custom_components.smart_plants.storage import SmartPlantsStore
from homeassistant.core import HomeAssistant

from .test_provider import FakeResponse, _client, _detail, _token

TEMPERATURE_SENSOR = "sensor.mock_temperature"
HUMIDITY_SENSOR = "sensor.mock_humidity"
RANGES: dict[str, Any] = {
    "min_temp": 8,
    "max_temp": 32,
    "min_env_humid": 40,
    "max_env_humid": 80,
}
SPECIES_TEMPERATURE = {
    "cold_threshold_celsius": 8.0,
    "cold_clear_celsius": 10.0,
    "hot_clear_celsius": 29.0,
    "hot_threshold_celsius": 32.0,
}
SPECIES_HUMIDITY = {
    "dry_threshold_percent": 40.0,
    "dry_clear_percent": 45.0,
    "damp_clear_percent": 75.0,
    "damp_threshold_percent": 80.0,
}


async def _manager(hass: HomeAssistant) -> SmartPlantsManager:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    return manager


async def _with_sensors(
    manager: SmartPlantsManager, plant: PlantRecord, *roles: str
) -> PlantRecord:
    entities = {"temperature": TEMPERATURE_SENSOR, "humidity": HUMIDITY_SENSOR}
    for role in roles:
        plant = await manager.async_set_role_sources(
            plant.id,
            role=role,
            expected_revision=plant.revision,
            sources=[{"entity_id": entities[role]}],
        )
    return plant


async def _apply(
    manager: SmartPlantsManager, plant: PlantRecord, **detail: Any
) -> PlantRecord:
    client, _session = _client([_token(), FakeResponse(200, _detail(**detail))])
    registry = ProviderRegistry()
    registry.register(ManualSpeciesProvider())
    registry.register(client)
    service = SpeciesProviderService(registry, manager)
    current = manager.get_plant(plant.id)
    assert current is not None
    preview = await service.async_preview(
        "openplantbook", "aloe vera", "en", plant_id=plant.id
    )
    applied = await service.async_apply(
        plant.id,
        expected_revision=current.revision,
        preview_token=preview.token,
        provider=preview.provider,
        operation=preview.operation,
        confirmed=True,
    )
    assert isinstance(applied, PlantRecord)
    return applied


def _temperature(plant: PlantRecord) -> TemperatureConfig:
    config = plant.role_config("temperature")
    assert isinstance(config, TemperatureConfig)
    return config


def _humidity(plant: PlantRecord) -> HumidityConfig:
    config = plant.role_config("humidity")
    assert isinstance(config, HumidityConfig)
    return config


def _effective(config: TemperatureConfig | HumidityConfig) -> dict[str, float]:
    return {
        key: config.effective_stress_threshold(key)
        for key in config.stress_threshold_overrides
    }


# --- Provider ----------------------------------------------------------------


async def test_air_humidity_range_is_kept() -> None:
    client, _session = _client([_token(), FakeResponse(200, _detail(**RANGES))])
    snapshot = (await client.async_get_species("aloe vera", "en")).snapshot
    assert snapshot.threshold_defaults["humidity"] == {"min": 40, "max": 80}
    assert snapshot.field_sources["humidity_min"] == ATTRIBUTION
    assert snapshot.field_sources["humidity_max"] == ATTRIBUTION


@pytest.mark.parametrize(
    ("low", "high", "expected"),
    [
        ("40", 80, {"max": 80}),
        (True, 80.5, {}),
        (0, 100, {}),
        (None, 70, {"max": 70}),
        (80, 40, {}),
        (60, 60, {}),
    ],
)
async def test_implausible_air_humidity_is_left_out(
    low: object, high: object, expected: dict[str, int]
) -> None:
    # Crowd-sourced data: a bad value is dropped, the species still loads.
    client, _session = _client(
        [
            _token(),
            FakeResponse(200, _detail(min_env_humid=low, max_env_humid=high)),
        ]
    )
    snapshot = (await client.async_get_species("aloe vera", "en")).snapshot
    assert snapshot.threshold_defaults.get("humidity", {}) == expected
    assert snapshot.threshold_defaults["moisture"] == {"min": 15, "max": 55}


# --- Applying a species -------------------------------------------------------


async def test_species_supplies_thresholds_of_configured_roles(
    hass: HomeAssistant,
) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await _with_sensors(manager, plant, "temperature", "humidity")

    applied = await _apply(manager, plant, **RANGES)

    assert _effective(_temperature(applied)) == SPECIES_TEMPERATURE
    assert _effective(_humidity(applied)) == SPECIES_HUMIDITY
    species = _temperature(applied).species_defaults["cold_threshold_celsius"]
    assert species.provider == "openplantbook"
    assert species.provider_ref == "aloe vera"

    # The values survive a reload.
    reloaded = (await _manager(hass)).get_plant(plant.id)
    assert reloaded is not None
    assert _temperature(reloaded) == _temperature(applied)
    assert _humidity(reloaded) == _humidity(applied)


async def test_species_does_not_configure_roles_without_sensors(
    hass: HomeAssistant,
) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")

    applied = await _apply(manager, plant, **RANGES)

    # No sensor, no entities: the roles stay unconfigured.
    assert applied.role_config("temperature") is None
    assert applied.role_config("humidity") is None


async def test_role_added_later_follows_the_species(hass: HomeAssistant) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await _apply(manager, plant, **RANGES)

    plant = await _with_sensors(manager, plant, "temperature", "humidity")

    assert _effective(_temperature(plant)) == SPECIES_TEMPERATURE
    assert _effective(_humidity(plant)) == SPECIES_HUMIDITY


async def test_one_sided_range_keeps_the_other_side_built_in(
    hass: HomeAssistant,
) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await _with_sensors(manager, plant, "temperature", "humidity")

    applied = await _apply(manager, plant, min_temp=15, max_env_humid=70)

    assert _effective(_temperature(applied)) == {
        **TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
        "cold_threshold_celsius": 15.0,
        "cold_clear_celsius": 17.0,
    }
    assert _effective(_humidity(applied)) == {
        **HUMIDITY_STRESS_BUILTIN_DEFAULTS,
        "damp_threshold_percent": 70.0,
        "damp_clear_percent": 65.0,
    }


async def test_overrides_stay_and_win(hass: HomeAssistant) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await _with_sensors(manager, plant, "temperature")
    plant = await manager.async_set_role_threshold_overrides(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        values={
            "cold_threshold_celsius": 5.0,
            "cold_clear_celsius": None,
            "hot_threshold_celsius": None,
            "hot_clear_celsius": None,
        },
    )

    applied = await _apply(manager, plant, **RANGES)

    config = _temperature(applied)
    assert config.stress_threshold_overrides["cold_threshold_celsius"] == 5.0
    assert _effective(config) == {**SPECIES_TEMPERATURE, "cold_threshold_celsius": 5.0}


async def test_species_that_conflicts_with_an_override_keeps_built_ins(
    hass: HomeAssistant,
) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await _with_sensors(manager, plant, "temperature")
    # An own cold clear value of 11 °C fits the built-in 10 °C but not a
    # species that starts the cold problem at 18 °C.
    plant = await manager.async_set_role_threshold_overrides(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        values={
            "cold_threshold_celsius": None,
            "cold_clear_celsius": 11.0,
            "hot_threshold_celsius": None,
            "hot_clear_celsius": None,
        },
    )

    applied = await _apply(manager, plant, min_temp=18, max_temp=30)

    # The species is accepted; the role keeps the built-in values.
    assert applied.species is not None
    config = _temperature(applied)
    assert config.species_defaults == {}
    assert config.stress_threshold_overrides["cold_clear_celsius"] == 11.0
    assert _effective(config) == {
        **TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
        "cold_clear_celsius": 11.0,
    }


async def test_too_narrow_species_range_keeps_built_ins(hass: HomeAssistant) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await _with_sensors(manager, plant, "temperature")

    applied = await _apply(manager, plant, min_temp=20, max_temp=21)

    assert _temperature(applied).species_defaults == {}
    assert _effective(_temperature(applied)) == TEMPERATURE_STRESS_BUILTIN_DEFAULTS


async def test_species_without_ranges_returns_to_built_ins(
    hass: HomeAssistant,
) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await _with_sensors(manager, plant, "temperature", "humidity")
    plant = await _apply(manager, plant, **RANGES)

    refreshed = await _apply(manager, plant)

    assert _temperature(refreshed).species_defaults == {}
    assert _humidity(refreshed).species_defaults == {}
    assert _effective(_temperature(refreshed)) == TEMPERATURE_STRESS_BUILTIN_DEFAULTS
    assert _effective(_humidity(refreshed)) == HUMIDITY_STRESS_BUILTIN_DEFAULTS


async def test_manual_species_supplies_nothing(hass: HomeAssistant) -> None:
    manager = await _manager(hass)
    profile = ManualSpeciesProvider.profile(
        common_name="Aloe", latin_name="Aloe vera", category=None
    )
    species = PlantSpecies(provider="manual", snapshot=profile.snapshot)
    plant = await manager.async_create_plant(name="Aloe", species=species)

    plant = await _with_sensors(manager, plant, "temperature")

    assert _temperature(plant).species_defaults == {}


async def test_changing_the_species_keeps_its_values_as_the_plants_own(
    hass: HomeAssistant,
) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await _with_sensors(manager, plant, "temperature", "humidity")
    plant = await manager.async_set_role_threshold_overrides(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        values={
            "cold_threshold_celsius": 5.0,
            "cold_clear_celsius": None,
            "hot_threshold_celsius": None,
            "hot_clear_celsius": None,
        },
    )
    applied = await _apply(manager, plant, **RANGES)
    profile = ManualSpeciesProvider.profile(
        common_name="Aloe", latin_name="Aloe vera", category=None
    )

    changed = await manager.async_update_plant(
        plant.id,
        expected_revision=applied.revision,
        species=PlantSpecies(provider="manual", snapshot=profile.snapshot),
    )

    temperature, humidity = _temperature(changed), _humidity(changed)
    # Nothing claims to come from the old species any more ...
    assert temperature.species_defaults == {}
    assert humidity.species_defaults == {}
    # ... but every threshold keeps its value, now as the plant's own, and
    # the value the user set stays.
    assert _effective(temperature) == {
        **SPECIES_TEMPERATURE,
        "cold_threshold_celsius": 5.0,
    }
    assert _effective(humidity) == SPECIES_HUMIDITY
    assert dict(temperature.stress_threshold_overrides) == {
        **SPECIES_TEMPERATURE,
        "cold_threshold_celsius": 5.0,
    }
    assert dict(humidity.stress_threshold_overrides) == SPECIES_HUMIDITY


async def test_other_changes_keep_the_species_values(hass: HomeAssistant) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await _with_sensors(manager, plant, "temperature")
    applied = await _apply(manager, plant, **RANGES)

    renamed = await manager.async_update_plant(
        plant.id, expected_revision=applied.revision, name="Aloe vera"
    )

    assert (
        _temperature(renamed).species_defaults == _temperature(applied).species_defaults
    )


# --- Stored data ---------------------------------------------------------------


def test_species_defaults_need_attribution_and_known_keys() -> None:
    stored = TemperatureConfig().as_storage()
    assert stored["species_defaults"] == {}
    entry = {"value": 8.0, "provider": "openplantbook", "provider_ref": "aloe vera"}
    parsed = TemperatureConfig.from_storage(
        {**stored, "species_defaults": {"cold_threshold_celsius": entry}}
    )
    assert parsed.inherited_stress_threshold("cold_threshold_celsius") == 8.0
    with pytest.raises(ValueError, match="unknown"):
        TemperatureConfig.from_storage({**stored, "species_defaults": {"cold": entry}})
    with pytest.raises(ValueError, match="provider"):
        TemperatureConfig.from_storage(
            {
                **stored,
                "species_defaults": {
                    "cold_threshold_celsius": {"value": 8.0, "provider_ref": "x"}
                },
            }
        )
    # The species values must make a valid range with the plant's overrides.
    with pytest.raises(ValueError, match="cold_threshold_celsius"):
        TemperatureConfig.from_storage(
            {
                **stored,
                "species_defaults": {"cold_threshold_celsius": {**entry, "value": 13}},
            }
        )


def _stored(minor: int, plant: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": STORAGE_KEY,
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": minor,
        "data": {
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
            "archived_plants": [],
        },
    }


async def test_migration_keeps_built_in_thresholds(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    plant = PlantRecord(
        id="p", revision=1, name="Aloe", created_at="2026-01-01T00:00:00Z"
    ).as_storage()
    for role in ("temperature", "humidity"):
        definition = require_role(role)
        assert definition.serialize_config is not None
        config = dict(
            cast(
                "dict[str, Any]",
                definition.serialize_config(definition.default_config()),
            )
        )
        del config["species_defaults"]
        plant["roles"][role] = config
    hass_storage[STORAGE_KEY] = _stored(19, plant)

    snapshot = await SmartPlantsStore(hass).async_load()

    loaded = snapshot.plants["p"]
    assert _temperature(loaded).species_defaults == {}
    assert _humidity(loaded).species_defaults == {}
    roles = hass_storage[STORAGE_KEY]["data"]["plants"][0]["roles"]
    assert roles["temperature"]["species_defaults"] == {}
    assert roles["humidity"]["species_defaults"] == {}
    assert hass_storage[STORAGE_KEY]["minor_version"] == STORAGE_MINOR_VERSION
