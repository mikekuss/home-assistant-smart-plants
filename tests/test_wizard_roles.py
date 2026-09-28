"""Wizard creation with several source roles in one operation."""

from __future__ import annotations

from typing import Any

import pytest
from custom_components.smart_plants.const import DOMAIN
from custom_components.smart_plants.models import (
    IlluminanceConfig,
    SensorSource,
    TemperatureConfig,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from .test_websocket_api import _setup
from .test_wizard import _credentials, _moisture


async def _create(
    hass: HomeAssistant, ws: WebSocketGenerator, **changes: Any
) -> tuple[Any, dict[str, Any]]:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    draft = manager.wizard_start()
    client = await ws(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/wizard/create",
            **_credentials(draft),
            "confirmed": True,
            "name": "Aloe",
            "moisture": _moisture(),
            **changes,
        }
    )
    return entry, await client.receive_json()


def _assert_nothing_created(hass: HomeAssistant, entry: Any) -> None:
    manager = entry.runtime_data.manager
    assert not manager.list_plants()
    assert not manager.snapshot.pending_operations
    assert not dr.async_entries_for_config_entry(dr.async_get(hass), entry.entry_id)


async def test_create_with_two_roles_in_one_revision(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    registry = er.async_get(hass)
    lamp = registry.async_get_or_create(
        "sensor", "example", "mock_light", suggested_object_id="mock_light"
    )
    entry, response = await _create(
        hass,
        hass_ws_client,
        roles={
            "temperature": {"sources": [{"entity_id": "sensor.mock_air"}]},
            "illuminance": {
                "sources": [{"entity_id": lamp.entity_id}],
                "primary_entity_id": lamp.entity_id,
                "aggregation": "max",
                "stale_after_seconds": 7200,
            },
        },
    )
    assert response["success"], response
    view = response["result"]["plant"]
    assert view["revision"] == 1
    manager = entry.runtime_data.manager
    plant = manager.get_plant(view["id"])
    assert plant.revision == 1
    temperature = plant.role_config("temperature")
    assert isinstance(temperature, TemperatureConfig)
    assert temperature.sources == (SensorSource("sensor.mock_air"),)
    assert temperature.aggregation == TemperatureConfig().aggregation
    illuminance = plant.role_config("illuminance")
    assert isinstance(illuminance, IlluminanceConfig)
    # Registry-backed sources are canonicalized exactly as roles/set_sources does.
    assert illuminance.sources == (SensorSource(lamp.entity_id, lamp.id),)
    assert illuminance.primary_entity_id == lamp.entity_id
    assert illuminance.aggregation == "max"
    assert illuminance.stale_after_seconds == 7200
    assert view["roles"]["temperature"]["sources"] == [
        {"entity_id": "sensor.mock_air", "registry_id": None}
    ]

    await hass.async_block_till_done()
    for platform, role in (
        ("sensor", "temperature"),
        ("sensor", "illuminance"),
        ("binary_sensor", "low_light"),
    ):
        assert registry.async_get_entity_id(
            platform, DOMAIN, f"{DOMAIN}:{plant.id}:{role}"
        )
    # Roles without sources stay lazy.
    assert (
        registry.async_get_entity_id("sensor", DOMAIN, f"{DOMAIN}:{plant.id}:co2")
        is None
    )


@pytest.mark.parametrize(
    "roles",
    [
        pytest.param({"future_role": {"sources": []}}, id="unknown-role"),
        pytest.param(
            {"moisture": {"sources": [{"entity_id": "sensor.mock_soil"}]}},
            id="moisture-inside-roles",
        ),
        pytest.param(
            {"temperature": {"sources": [{"entity_id": "light.mock_lamp"}]}},
            id="wrong-domain",
        ),
        pytest.param(
            {
                "temperature": {
                    "sources": [
                        {"entity_id": "sensor.mock_air"},
                        {"entity_id": "sensor.mock_air"},
                    ]
                }
            },
            id="duplicate-source",
        ),
        pytest.param(
            {
                "temperature": {
                    "sources": [{"entity_id": "sensor.mock_air"}],
                    "primary_entity_id": "sensor.mock_other",
                }
            },
            id="primary-not-assigned",
        ),
        pytest.param(
            {
                "temperature": {
                    "sources": [{"entity_id": "sensor.mock_air"}],
                    "stale_after_seconds": 1,
                }
            },
            id="stale-after-out-of-range",
        ),
        pytest.param(
            {
                "temperature": {
                    "sources": [
                        {"entity_id": "sensor.mock_air", "registry_id": "missing"}
                    ]
                }
            },
            id="unknown-registry-id",
        ),
        pytest.param({"temperature": {}}, id="missing-sources"),
        pytest.param(
            {"temperature": {"sources": [], "extra": True}}, id="unknown-field"
        ),
        pytest.param(
            {
                "humidity": {"sources": [{"entity_id": "sensor.mock_humidity"}]},
                "co2": {"sources": [{"entity_id": "switch.mock_fan"}]},
            },
            id="second-role-invalid",
        ),
    ],
)
async def test_invalid_roles_create_nothing(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    roles: dict[str, Any],
) -> None:
    entry, response = await _create(hass, hass_ws_client, roles=roles)
    assert response["success"] is False, response
    assert response["error"]["code"] == "invalid_format"
    _assert_nothing_created(hass, entry)


async def test_moisture_inside_roles_names_the_moisture_field(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry, response = await _create(
        hass, hass_ws_client, roles={"moisture": {"sources": []}}
    )
    assert response["error"]["code"] == "invalid_format"
    assert "moisture field" in response["error"]["message"]
    _assert_nothing_created(hass, entry)


async def test_callers_without_roles_are_unchanged(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry, response = await _create(hass, hass_ws_client)
    assert response["success"], response
    plant = entry.runtime_data.manager.get_plant(response["result"]["plant"]["id"])
    assert plant.revision == 1
    assert dict(plant.extra_roles) == {}


async def test_empty_roles_object_is_accepted(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry, response = await _create(hass, hass_ws_client, roles={})
    assert response["success"], response
    plant = entry.runtime_data.manager.get_plant(response["result"]["plant"]["id"])
    assert dict(plant.extra_roles) == {}
