"""End-to-end tests for editing low_light thresholds over the WebSocket API."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import pytest
from custom_components.smart_plants import illuminance_evaluator
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.models import (
    LOW_LIGHT_BUILTIN_DEFAULTS,
    IlluminanceConfig,
)
from homeassistant.const import LIGHT_LUX
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
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
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Low-light attributes are published with the binary's state. Provide the
    # two distinct daytime observations required for an available evaluation;
    # otherwise HA correctly suppresses attributes for an unavailable entity.
    monkeypatch.setattr(illuminance_evaluator, "is_daytime", lambda _value: True)
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Fern")
    hass.states.async_set(
        "sensor.light",
        "1200",
        {"unit_of_measurement": LIGHT_LUX},
    )
    sourced = await manager.async_set_role_sources(
        plant.id,
        role="illuminance",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.light"}],
    )
    assigned = await manager.async_set_role_primary(
        plant.id,
        role="illuminance",
        expected_revision=sourced.revision,
        primary_entity_id="sensor.light",
    )
    await hass.async_block_till_done()
    controller = manager.get_role_controller(plant.id, "illuminance")
    assert controller is not None
    # Model two distinct, recent sensor observations with synthetic timestamps.
    now = dt_util.utcnow()
    controller._evaluation_now = now
    controller._light_samples = [
        illuminance_evaluator.LightSample(
            (now - timedelta(minutes=1)).timestamp(), 1200.0
        ),
        illuminance_evaluator.LightSample(now.timestamp(), 1200.0),
    ]
    controller._recompute_and_notify(now)
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    payload: dict[str, Any] = {
        "id": 1,
        "type": "smart_plants/roles/set_threshold_overrides",
        "plant_id": plant.id,
        "expected_revision": assigned.revision,
        "role": "illuminance",
        "values": {
            "target_lux": 600.0,
            "clear_lux": None,
        },
    }
    await client.send_json(payload)
    response = await client.receive_json()
    assert response["success"], response
    returned = response["result"]["plant"]
    assert returned["id"] == plant.id
    assert returned["revision"] == assigned.revision + 1

    persisted = manager.snapshot.plants[plant.id].role_config("illuminance")
    assert isinstance(persisted, IlluminanceConfig)
    assert persisted.stress_threshold_overrides["target_lux"] == 600.0
    assert persisted.stress_threshold_overrides["clear_lux"] is None
    assert (
        persisted.effective_stress_threshold("clear_lux")
        == LOW_LIGHT_BUILTIN_DEFAULTS["clear_lux"]
    )
    assert persisted.effective_stress_threshold("target_lux") == 600.0

    await hass.async_block_till_done()
    entity_id = "binary_sensor.fern_low_light"
    state = hass.states.get(entity_id)
    assert state is not None, hass.states.async_entity_ids()
    # Overridden target, inherited clear.
    assert state.attributes["target_lux"] == 600.0
    assert state.attributes["clear_lux"] == LOW_LIGHT_BUILTIN_DEFAULTS["clear_lux"]


async def test_websocket_rejects_invalid_effective_ordering(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Fern")
    client = await hass_ws_client(hass)
    # target_lux >= clear_lux violates ordering.
    await client.send_json(
        {
            "id": 1,
            "type": "smart_plants/roles/set_threshold_overrides",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "role": "illuminance",
            "values": {
                "target_lux": 800.0,
                "clear_lux": 700.0,
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
            "role": "illuminance",
            "values": {
                "target_lux": None,
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
            "role": "illuminance",
            "values": {
                "target_lux": None,
                "clear_lux": None,
            },
        }
    )
    response = await client.receive_json()
    assert response["success"] is False, response
    assert response["error"]["code"] == expected_code
