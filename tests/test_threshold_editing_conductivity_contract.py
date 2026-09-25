"""End-to-end contract test for the conductivity_stress threshold-editing slice."""

from __future__ import annotations

from typing import Any

import pytest
from custom_components.smart_plants.conductivity_evaluator import (
    CONDUCTIVITY_MICROSIEMENS_PER_CM,
)
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.models import (
    CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS,
    ConductivityConfig,
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
        "sensor.conductivity",
        "600",
        {"unit_of_measurement": CONDUCTIVITY_MICROSIEMENS_PER_CM},
    )
    sourced = await manager.async_set_role_sources(
        plant.id,
        role="conductivity",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.conductivity"}],
    )
    assigned = await manager.async_set_role_primary(
        plant.id,
        role="conductivity",
        expected_revision=sourced.revision,
        primary_entity_id="sensor.conductivity",
    )
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    payload: dict[str, Any] = {
        "id": 1,
        "type": "smart_plants/roles/set_threshold_overrides",
        "plant_id": plant.id,
        "expected_revision": assigned.revision,
        "role": "conductivity",
        "values": {
            "low_threshold_micro_siemens_per_cm": 400.0,
            "low_clear_micro_siemens_per_cm": 550.0,
            "high_clear_micro_siemens_per_cm": None,
            "high_threshold_micro_siemens_per_cm": None,
        },
    }
    await client.send_json(payload)
    response = await client.receive_json()
    assert response["success"], response
    returned = response["result"]["plant"]
    assert returned["id"] == plant.id
    assert returned["revision"] == assigned.revision + 1

    persisted = manager.snapshot.plants[plant.id].role_config("conductivity")
    assert isinstance(persisted, ConductivityConfig)
    assert (
        persisted.stress_threshold_overrides["low_threshold_micro_siemens_per_cm"]
        == 400.0
    )
    assert (
        persisted.stress_threshold_overrides["low_clear_micro_siemens_per_cm"] == 550.0
    )
    assert (
        persisted.stress_threshold_overrides["high_clear_micro_siemens_per_cm"] is None
    )
    assert (
        persisted.stress_threshold_overrides["high_threshold_micro_siemens_per_cm"]
        is None
    )
    assert (
        persisted.effective_stress_threshold("high_threshold_micro_siemens_per_cm")
        == CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS["high_threshold_micro_siemens_per_cm"]
    )

    await hass.async_block_till_done()
    entity_id = "binary_sensor.fern_conductivity_stress"
    state = hass.states.get(entity_id)
    assert state is not None, hass.states.async_entity_ids()
    # Overridden low side.
    assert state.attributes["low_threshold_micro_siemens_per_cm"] == 400.0
    assert state.attributes["low_clear_micro_siemens_per_cm"] == 550.0
    # Inherited high side still uses built-in defaults.
    assert (
        state.attributes["high_clear_micro_siemens_per_cm"]
        == CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS["high_clear_micro_siemens_per_cm"]
    )
    assert (
        state.attributes["high_threshold_micro_siemens_per_cm"]
        == CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS["high_threshold_micro_siemens_per_cm"]
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
            "role": "conductivity",
            "values": {
                "low_threshold_micro_siemens_per_cm": 600.0,
                "low_clear_micro_siemens_per_cm": 500.0,
                "high_clear_micro_siemens_per_cm": None,
                "high_threshold_micro_siemens_per_cm": None,
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
            "role": "conductivity",
            "values": {
                "low_threshold_micro_siemens_per_cm": None,
                "low_clear_micro_siemens_per_cm": None,
                "high_clear_micro_siemens_per_cm": None,
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
            "role": "conductivity",
            "values": {
                "low_threshold_micro_siemens_per_cm": None,
                "low_clear_micro_siemens_per_cm": None,
                "high_clear_micro_siemens_per_cm": None,
                "high_threshold_micro_siemens_per_cm": None,
            },
        }
    )
    response = await client.receive_json()
    assert response["success"] is False, response
    assert response["error"]["code"] == expected_code
