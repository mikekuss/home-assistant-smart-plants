"""End-to-end contract test for the low_battery threshold-editing slice."""

from __future__ import annotations

from typing import Any

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.models import (
    LOW_BATTERY_BUILTIN_DEFAULTS,
    BatteryConfig,
)
from homeassistant.const import PERCENTAGE
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
        "sensor.battery",
        "80",
        {"unit_of_measurement": PERCENTAGE},
    )
    sourced = await manager.async_set_role_sources(
        plant.id,
        role="battery",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.battery"}],
    )
    assigned = await manager.async_set_role_primary(
        plant.id,
        role="battery",
        expected_revision=sourced.revision,
        primary_entity_id="sensor.battery",
    )
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    payload: dict[str, Any] = {
        "id": 1,
        "type": "smart_plants/roles/set_threshold_overrides",
        "plant_id": plant.id,
        "expected_revision": assigned.revision,
        "role": "battery",
        "values": {
            "threshold_percent": 15,
            "clear_percent": None,
        },
    }
    await client.send_json(payload)
    response = await client.receive_json()
    assert response["success"], response
    returned = response["result"]["plant"]
    assert returned["id"] == plant.id
    assert returned["revision"] == assigned.revision + 1

    persisted = manager.snapshot.plants[plant.id].role_config("battery")
    assert isinstance(persisted, BatteryConfig)
    assert persisted.stress_threshold_overrides["threshold_percent"] == 15
    assert persisted.stress_threshold_overrides["clear_percent"] is None
    assert (
        persisted.effective_stress_threshold("clear_percent")
        == LOW_BATTERY_BUILTIN_DEFAULTS["clear_percent"]
    )
    assert persisted.effective_stress_threshold("threshold_percent") == 15

    await hass.async_block_till_done()
    entity_id = "binary_sensor.fern_low_battery"
    state = hass.states.get(entity_id)
    assert state is not None, hass.states.async_entity_ids()
    # Overridden threshold, inherited clear.
    assert state.attributes["threshold_percent"] == 15
    assert (
        state.attributes["clear_percent"]
        == LOW_BATTERY_BUILTIN_DEFAULTS["clear_percent"]
    )


async def test_websocket_rejects_invalid_effective_ordering(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Fern")
    client = await hass_ws_client(hass)
    # threshold_percent >= clear_percent violates ordering.
    await client.send_json(
        {
            "id": 1,
            "type": "smart_plants/roles/set_threshold_overrides",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "role": "battery",
            "values": {
                "threshold_percent": 30,
                "clear_percent": 25,
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
            "role": "battery",
            "values": {
                "threshold_percent": None,
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
            "role": "battery",
            "values": {
                "threshold_percent": None,
                "clear_percent": None,
            },
        }
    )
    response = await client.receive_json()
    assert response["success"] is False, response
    assert response["error"]["code"] == expected_code
