"""End-to-end tests for editing soil_temperature_stress thresholds via WebSocket."""

from __future__ import annotations

from typing import Any

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.models import (
    SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
    SoilTemperatureConfig,
)
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_websocket_override_persists_and_updates_binary_sensor_attributes(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Fern")
    hass.states.async_set(
        "sensor.soil_temperature",
        "22",
        {"unit_of_measurement": UnitOfTemperature.CELSIUS},
    )
    sourced = await manager.async_set_role_sources(
        plant.id,
        role="soil_temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.soil_temperature"}],
    )
    assigned = await manager.async_set_role_primary(
        plant.id,
        role="soil_temperature",
        expected_revision=sourced.revision,
        primary_entity_id="sensor.soil_temperature",
    )
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    payload: dict[str, Any] = {
        "id": 1,
        "type": "smart_plants/roles/set_threshold_overrides",
        "plant_id": plant.id,
        "expected_revision": assigned.revision,
        "role": "soil_temperature",
        "values": {
            "cold_threshold_celsius": 8.0,
            "cold_clear_celsius": 11.0,
            "hot_clear_celsius": None,
            "hot_threshold_celsius": None,
        },
    }
    await client.send_json(payload)
    response = await client.receive_json()
    assert response["success"], response
    returned = response["result"]["plant"]
    assert returned["id"] == plant.id
    assert returned["revision"] == assigned.revision + 1

    persisted = manager.snapshot.plants[plant.id].role_config("soil_temperature")
    assert isinstance(persisted, SoilTemperatureConfig)
    assert persisted.stress_threshold_overrides["cold_threshold_celsius"] == 8.0
    assert persisted.stress_threshold_overrides["cold_clear_celsius"] == 11.0
    assert persisted.stress_threshold_overrides["hot_clear_celsius"] is None
    assert persisted.stress_threshold_overrides["hot_threshold_celsius"] is None
    assert (
        persisted.effective_stress_threshold("hot_threshold_celsius")
        == SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS["hot_threshold_celsius"]
    )
    assert persisted.effective_stress_threshold("cold_threshold_celsius") == 8.0

    await hass.async_block_till_done()
    entity_id = "binary_sensor.fern_soil_temperature_stress"
    state = hass.states.get(entity_id)
    assert state is not None, hass.states.async_entity_ids()
    assert state.attributes["cold_threshold_celsius"] == 8.0
    assert state.attributes["cold_clear_celsius"] == 11.0
    assert (
        state.attributes["hot_clear_celsius"]
        == SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS["hot_clear_celsius"]
    )
    assert (
        state.attributes["hot_threshold_celsius"]
        == SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS["hot_threshold_celsius"]
    )


async def test_websocket_rejects_invalid_effective_ordering(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Fern")
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "smart_plants/roles/set_threshold_overrides",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "role": "soil_temperature",
            "values": {
                "cold_threshold_celsius": 20.0,
                "cold_clear_celsius": 18.0,
                "hot_clear_celsius": None,
                "hot_threshold_celsius": None,
            },
        }
    )
    response = await client.receive_json()
    assert response["success"] is False, response
    assert response["error"]["code"] == "invalid_format"


async def test_websocket_rejects_missing_key(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Fern")
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "smart_plants/roles/set_threshold_overrides",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "role": "soil_temperature",
            "values": {
                "cold_threshold_celsius": None,
                "cold_clear_celsius": None,
                "hot_clear_celsius": None,
            },
        }
    )
    response = await client.receive_json()
    assert response["success"] is False, response
    assert response["error"]["code"] == "invalid_format"


@pytest.mark.parametrize(
    ("bad_revision", "expected_code"),
    [
        (9999, "revision_conflict"),
    ],
)
async def test_websocket_revision_conflict(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    bad_revision: int,
    expected_code: str,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Fern")
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "smart_plants/roles/set_threshold_overrides",
            "plant_id": plant.id,
            "expected_revision": bad_revision,
            "role": "soil_temperature",
            "values": {
                "cold_threshold_celsius": None,
                "cold_clear_celsius": None,
                "hot_clear_celsius": None,
                "hot_threshold_celsius": None,
            },
        }
    )
    response = await client.receive_json()
    assert response["success"] is False, response
    assert response["error"]["code"] == expected_code
