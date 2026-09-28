"""End-to-end tests for editing humidity_stress thresholds over the WebSocket API."""

from __future__ import annotations

from typing import Any

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.models import (
    HUMIDITY_STRESS_BUILTIN_DEFAULTS,
    HumidityConfig,
)
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
    hass.states.async_set("sensor.humidity", "50", {"unit_of_measurement": "%"})
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="humidity",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.humidity"}],
    )
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    payload: dict[str, Any] = {
        "id": 1,
        "type": "smart_plants/roles/set_threshold_overrides",
        "plant_id": plant.id,
        "expected_revision": assigned.revision,
        "role": "humidity",
        "values": {
            "dry_threshold_percent": 15.0,
            "dry_clear_percent": 20.0,
            "damp_threshold_percent": None,
            "damp_clear_percent": None,
        },
    }
    await client.send_json(payload)
    response = await client.receive_json()
    assert response["success"], response
    returned = response["result"]["plant"]
    assert returned["id"] == plant.id
    assert returned["revision"] == assigned.revision + 1

    persisted = manager.snapshot.plants[plant.id].role_config("humidity")
    assert isinstance(persisted, HumidityConfig)
    assert persisted.stress_threshold_overrides["dry_threshold_percent"] == 15.0
    assert persisted.stress_threshold_overrides["dry_clear_percent"] == 20.0
    assert persisted.stress_threshold_overrides["damp_threshold_percent"] is None
    assert persisted.stress_threshold_overrides["damp_clear_percent"] is None
    assert (
        persisted.effective_stress_threshold("damp_threshold_percent")
        == HUMIDITY_STRESS_BUILTIN_DEFAULTS["damp_threshold_percent"]
    )

    await hass.async_block_till_done()
    entity_id = "binary_sensor.fern_humidity_stress"
    state = hass.states.get(entity_id)
    assert state is not None, hass.states.async_entity_ids()
    # Overridden dry side.
    assert state.attributes["dry_threshold_percent"] == 15.0
    assert state.attributes["dry_clear_percent"] == 20.0
    # Inherited damp side still uses built-in defaults.
    assert (
        state.attributes["damp_threshold_percent"]
        == HUMIDITY_STRESS_BUILTIN_DEFAULTS["damp_threshold_percent"]
    )
    assert (
        state.attributes["damp_clear_percent"]
        == HUMIDITY_STRESS_BUILTIN_DEFAULTS["damp_clear_percent"]
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
            "role": "humidity",
            "values": {
                "dry_threshold_percent": 50.0,
                "dry_clear_percent": 40.0,
                "damp_threshold_percent": None,
                "damp_clear_percent": None,
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
            "role": "humidity",
            "values": {
                "dry_threshold_percent": None,
                "dry_clear_percent": None,
                "damp_threshold_percent": None,
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
            "role": "humidity",
            "values": {
                "dry_threshold_percent": None,
                "dry_clear_percent": None,
                "damp_threshold_percent": None,
                "damp_clear_percent": None,
            },
        }
    )
    response = await client.receive_json()
    assert response["success"] is False, response
    assert response["error"]["code"] == expected_code
