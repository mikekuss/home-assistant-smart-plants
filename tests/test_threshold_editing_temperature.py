"""End-to-end tests for editing temperature_stress thresholds over the WebSocket API."""

from __future__ import annotations

from typing import Any

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.models import (
    TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
    TemperatureConfig,
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
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    payload: dict[str, Any] = {
        "id": 1,
        "type": "smart_plants/roles/set_threshold_overrides",
        "plant_id": plant.id,
        "expected_revision": assigned.revision,
        "role": "temperature",
        "values": {
            "cold_threshold_celsius": 5.0,
            "cold_clear_celsius": 7.0,
            "hot_threshold_celsius": None,
            "hot_clear_celsius": None,
        },
    }
    await client.send_json(payload)
    response = await client.receive_json()
    assert response["success"], response
    returned = response["result"]["plant"]
    assert returned["id"] == plant.id
    assert returned["revision"] == assigned.revision + 1

    persisted = manager.snapshot.plants[plant.id].role_config("temperature")
    assert isinstance(persisted, TemperatureConfig)
    assert persisted.stress_threshold_overrides["cold_threshold_celsius"] == 5.0
    assert persisted.stress_threshold_overrides["cold_clear_celsius"] == 7.0
    assert persisted.stress_threshold_overrides["hot_threshold_celsius"] is None
    assert persisted.stress_threshold_overrides["hot_clear_celsius"] is None
    assert (
        persisted.effective_stress_threshold("hot_threshold_celsius")
        == TEMPERATURE_STRESS_BUILTIN_DEFAULTS["hot_threshold_celsius"]
    )

    await hass.async_block_till_done()
    entity_id = "binary_sensor.aloe_temperature_stress"
    state = hass.states.get(entity_id)
    assert state is not None, hass.states.async_entity_ids()
    # The evaluator now uses the overridden cold thresholds.
    assert state.attributes["cold_threshold_celsius"] == 5.0
    assert state.attributes["cold_clear_celsius"] == 7.0
    # Un-overridden keys keep the built-in default effective value.
    assert (
        state.attributes["hot_threshold_celsius"]
        == TEMPERATURE_STRESS_BUILTIN_DEFAULTS["hot_threshold_celsius"]
    )
    assert (
        state.attributes["hot_clear_celsius"]
        == TEMPERATURE_STRESS_BUILTIN_DEFAULTS["hot_clear_celsius"]
    )


async def test_websocket_rejects_invalid_effective_ordering(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "smart_plants/roles/set_threshold_overrides",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "role": "temperature",
            "values": {
                "cold_threshold_celsius": 30.0,
                "cold_clear_celsius": None,
                "hot_threshold_celsius": None,
                "hot_clear_celsius": None,
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
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "smart_plants/roles/set_threshold_overrides",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "role": "temperature",
            "values": {
                "cold_threshold_celsius": None,
                "cold_clear_celsius": None,
                "hot_threshold_celsius": None,
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
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "smart_plants/roles/set_threshold_overrides",
            "plant_id": plant.id,
            "expected_revision": bad_revision,
            "role": "temperature",
            "values": {
                "cold_threshold_celsius": None,
                "cold_clear_celsius": None,
                "hot_threshold_celsius": None,
                "hot_clear_celsius": None,
            },
        }
    )
    response = await client.receive_json()
    assert response["success"] is False, response
    assert response["error"]["code"] == expected_code
