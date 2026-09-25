"""End-to-end contract test for the co2_stress threshold-editing slice."""

from __future__ import annotations

from typing import Any

import pytest
from custom_components.smart_plants.co2_evaluator import CO2_PARTS_PER_MILLION
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.models import (
    CO2_STRESS_BUILTIN_DEFAULTS,
    Co2Config,
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
    hass.states.async_set(
        "sensor.co2",
        "800",
        {"unit_of_measurement": CO2_PARTS_PER_MILLION},
    )
    sourced = await manager.async_set_role_sources(
        plant.id,
        role="co2",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.co2"}],
    )
    assigned = await manager.async_set_role_primary(
        plant.id,
        role="co2",
        expected_revision=sourced.revision,
        primary_entity_id="sensor.co2",
    )
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    payload: dict[str, Any] = {
        "id": 1,
        "type": "smart_plants/roles/set_threshold_overrides",
        "plant_id": plant.id,
        "expected_revision": assigned.revision,
        "role": "co2",
        "values": {
            "threshold_ppm": 6000,
            "clear_ppm": None,
        },
    }
    await client.send_json(payload)
    response = await client.receive_json()
    assert response["success"], response
    returned = response["result"]["plant"]
    assert returned["id"] == plant.id
    assert returned["revision"] == assigned.revision + 1

    persisted = manager.snapshot.plants[plant.id].role_config("co2")
    assert isinstance(persisted, Co2Config)
    assert persisted.stress_threshold_overrides["threshold_ppm"] == 6000
    assert persisted.stress_threshold_overrides["clear_ppm"] is None
    assert (
        persisted.effective_stress_threshold("clear_ppm")
        == CO2_STRESS_BUILTIN_DEFAULTS["clear_ppm"]
    )
    assert persisted.effective_stress_threshold("threshold_ppm") == 6000

    await hass.async_block_till_done()
    entity_id = "binary_sensor.fern_co2_stress"
    state = hass.states.get(entity_id)
    assert state is not None, hass.states.async_entity_ids()
    # Overridden threshold, inherited clear.
    assert state.attributes["threshold_ppm"] == 6000
    assert state.attributes["clear_ppm"] == CO2_STRESS_BUILTIN_DEFAULTS["clear_ppm"]


async def test_websocket_rejects_invalid_effective_ordering(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Fern")
    client = await hass_ws_client(hass)
    # clear_ppm >= threshold_ppm violates ordering.
    await client.send_json(
        {
            "id": 1,
            "type": "smart_plants/roles/set_threshold_overrides",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "role": "co2",
            "values": {
                "threshold_ppm": 3000,
                "clear_ppm": 4000,
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
            "role": "co2",
            "values": {
                "threshold_ppm": None,
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
            "role": "co2",
            "values": {
                "threshold_ppm": None,
                "clear_ppm": None,
            },
        }
    )
    response = await client.receive_json()
    assert response["success"] is False, response
    assert response["error"]["code"] == expected_code
