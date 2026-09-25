"""
End-to-end tests for the multi-role composite health score.

Covers ``sensor.<plant>_health_score`` and the sibling
``smart_plants/plants/health`` WebSocket command. Only synthetic HA state
is used; no real HA or provider access.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

if TYPE_CHECKING:
    from custom_components.smart_plants.manager import SmartPlantsManager


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _manager(entry: MockConfigEntry) -> SmartPlantsManager:
    return entry.runtime_data.manager  # type: ignore[no-any-return]


async def _health_state(hass: HomeAssistant, plant_id: str) -> str | None:
    registry = er.async_get(hass)
    entity_id = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant_id}:health_score"
    )
    assert entity_id is not None
    state = hass.states.get(entity_id)
    return state.state if state is not None else None


async def test_health_entity_unavailable_when_no_sources(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    assert await _health_state(hass, plant.id) == "unavailable"


async def test_moisture_only_state_matches_moisture_health(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    hass.states.async_set("sensor.soil", "40", {"unit_of_measurement": "%"})
    updated = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.soil"}],
    )
    await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=updated.revision,
        primary_entity_id="sensor.soil",
    )
    await hass.async_block_till_done()

    controller = manager.get_moisture_controller(plant.id)
    assert controller is not None
    moisture_health = controller.current_evaluation.health_score
    assert moisture_health is not None

    composite_state = await _health_state(hass, plant.id)
    assert composite_state == str(moisture_health)


async def test_temperature_stress_lowers_composite(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    hass.states.async_set("sensor.soil", "40", {"unit_of_measurement": "%"})
    updated = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.soil"}],
    )
    moisture_primary = await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=updated.revision,
        primary_entity_id="sensor.soil",
    )
    await hass.async_block_till_done()
    moisture_controller = manager.get_moisture_controller(plant.id)
    assert moisture_controller is not None
    moisture_before = moisture_controller.current_evaluation.health_score
    assert moisture_before is not None

    hass.states.async_set(
        "sensor.temp",
        "40",  # above 35 °C → hot stress
        {"unit_of_measurement": UnitOfTemperature.CELSIUS},
    )
    await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=moisture_primary.revision,
        sources=[{"entity_id": "sensor.temp"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="temperature",
        expected_revision=moisture_primary.revision + 1,
        primary_entity_id="sensor.temp",
    )
    await hass.async_block_till_done()

    # Weighted mean with temperature stress ON (value 0):
    # floor((3 * m + 2 * 0) / 5 + 0.5) == (3 * m + 2) // 5 for m >= 0.
    expected = (3 * moisture_before + 2) // 5
    composite_state = await _health_state(hass, plant.id)
    assert composite_state == str(expected)


async def test_websocket_plant_health_returns_evaluation(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    hass.states.async_set("sensor.soil", "40", {"unit_of_measurement": "%"})
    updated = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.soil"}],
    )
    await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=updated.revision,
        primary_entity_id="sensor.soil",
    )
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "smart_plants/plants/health", "plant_id": plant.id}
    )
    response = await client.receive_json()
    assert response["success"] is True
    evaluation = response["result"]["evaluation"]
    assert evaluation["available"] is True
    assert isinstance(evaluation["health_score"], int)
    assert evaluation["contributors"] == ["moisture"]
    assert evaluation["configured"] == ["moisture"]
    assert evaluation["confidence"] == 1.0
    assert evaluation["confidence_label"] == "high"


async def test_websocket_plant_health_unknown_plant(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/health",
            "plant_id": "does-not-exist",
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "not_found"


async def test_moisture_evaluation_health_score_stays_moisture_only(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    hass.states.async_set("sensor.soil", "40", {"unit_of_measurement": "%"})
    updated = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.soil"}],
    )
    moisture_primary = await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=updated.revision,
        primary_entity_id="sensor.soil",
    )
    await hass.async_block_till_done()
    controller = manager.get_moisture_controller(plant.id)
    assert controller is not None
    moisture_only = controller.current_evaluation.health_score

    hass.states.async_set(
        "sensor.temp",
        "40",
        {"unit_of_measurement": UnitOfTemperature.CELSIUS},
    )
    await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=moisture_primary.revision,
        sources=[{"entity_id": "sensor.temp"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="temperature",
        expected_revision=moisture_primary.revision + 1,
        primary_entity_id="sensor.temp",
    )
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/moisture/evaluation",
            "plant_id": plant.id,
        }
    )
    response = await client.receive_json()
    assert response["success"] is True
    assert response["result"]["evaluation"]["health_score"] == moisture_only


@pytest.mark.usefixtures("hass")
async def test_health_score_extra_state_attributes_expose_confidence(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    hass.states.async_set("sensor.soil", "40", {"unit_of_measurement": "%"})
    updated = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.soil"}],
    )
    await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=updated.revision,
        primary_entity_id="sensor.soil",
    )
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    entity_id = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:health_score"
    )
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.attributes["contributors"] == ["moisture"]
    assert state.attributes["configured"] == ["moisture"]
    assert state.attributes["confidence"] == 1.0
    assert state.attributes["confidence_label"] == "high"
