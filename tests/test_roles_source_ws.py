"""
WebSocket coverage for the generic smart_plants/roles/* source commands.

These commands let a user configure sources for every role, not just
moisture. They delegate to the same manager methods as the moisture-scoped
aliases, so error mapping, revision checks, and retained-missing semantics
must be identical.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, cast

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantRecord, SensorSource
from custom_components.smart_plants.roles import require_role
from custom_components.smart_plants.websocket_api import (
    ERR_INVALID_FORMAT,
    ERR_NOT_FOUND,
    ERR_REVISION_CONFLICT,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

NON_MOISTURE_ROLES = (
    "temperature",
    "humidity",
    "illuminance",
    "battery",
    "conductivity",
    "soil_temperature",
    "co2",
)
SOURCE_ROLES = ("moisture", *NON_MOISTURE_ROLES)
# Backend-owned PlantView defaults, shared with the frontend unit tests and the
# e2e harness so their unconfigured-role data cannot drift from the backend.
ROLE_VIEW_DEFAULTS_FIXTURE = (
    Path(__file__).parent / "fixtures" / "plant_view_role_defaults.json"
)


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    assert await async_setup_component(hass, DOMAIN, {})
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _set_sources(
    client: Any,
    plant: PlantRecord,
    role: str,
    sources: list[dict[str, str]],
    *,
    alias: bool = False,
) -> dict[str, Any]:
    payload = {
        "type": (
            "smart_plants/moisture/set_sources"
            if alias
            else "smart_plants/roles/set_sources"
        ),
        "plant_id": plant.id,
        "expected_revision": plant.revision,
        "sources": sources,
    }
    if not alias:
        payload["role"] = role
    await client.send_json_auto_id(payload)
    return cast("dict[str, Any]", await client.receive_json())


@pytest.mark.parametrize(
    ("role", "command"),
    [
        *((role, "smart_plants/roles/set_sources") for role in SOURCE_ROLES),
        ("moisture", "smart_plants/moisture/set_sources"),
    ],
    ids=[*SOURCE_ROLES, "moisture_alias"],
)
async def test_missing_registry_source_retained_and_rejected_substitutions(  # noqa: PLR0915
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    role: str,
    command: str,
) -> None:
    alias = command == "smart_plants/moisture/set_sources"
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    registry = er.async_get(hass)
    source = registry.async_get_or_create(
        "sensor", "example", f"missing-{role}", suggested_object_id=f"missing_{role}"
    )
    pair = {"entity_id": source.entity_id, "registry_id": source.id}
    plant = await manager.async_create_plant(name="Aloe")
    other = await manager.async_create_plant(name="Fern")
    client = await hass_ws_client(hass)

    response = await _set_sources(client, plant, role, [pair], alias=alias)
    assert response["success"] is True
    plant = manager.get_plant(plant.id)
    registry.async_remove(source.entity_id)
    await hass.async_block_till_done()

    # Another plant cannot introduce the missing UUID as a new assignment.
    response = await _set_sources(client, other, role, [pair], alias=alias)
    assert response["error"]["code"] == ERR_INVALID_FORMAT
    assert manager.get_plant(other.id).revision == other.revision

    replacement = registry.async_get_or_create(
        "sensor",
        "example",
        f"replacement-{role}",
        suggested_object_id=source.entity_id.removeprefix("sensor."),
    )
    assert replacement.entity_id == source.entity_id
    for attempted in (
        {"entity_id": source.entity_id},
        {"entity_id": source.entity_id, "registry_id": replacement.id},
        {"entity_id": "sensor.forged", "registry_id": source.id},
        {"entity_id": source.entity_id, "registry_id": "forged-uuid"},
    ):
        response = await _set_sources(client, plant, role, [attempted], alias=alias)
        assert response["success"] is False
        assert response["error"]["code"] == ERR_INVALID_FORMAT
        assert manager.get_plant(plant.id).revision == plant.revision

    response = await _set_sources(client, plant, role, [pair], alias=alias)
    assert response["success"] is True
    assert manager.get_plant(plant.id).revision == plant.revision

    # An unrelated source can be added while keeping the missing pair intact.
    stale = plant
    response = await _set_sources(
        client, plant, role, [pair, {"entity_id": "sensor.extra"}], alias=alias
    )
    assert response["success"] is True
    plant = manager.get_plant(plant.id)
    config = require_role(role).config_for(plant)
    assert config is not None
    assert config.sources == (
        SensorSource(source.entity_id, source.id),
        SensorSource("sensor.extra", None),
    )
    response = await _set_sources(client, stale, role, [pair], alias=alias)
    assert response["success"] is False
    assert response["error"]["code"] == ERR_REVISION_CONFLICT
    assert manager.get_plant(plant.id).revision == plant.revision

    response = await _set_sources(client, plant, role, [pair], alias=alias)
    assert response["success"] is True
    plant = manager.get_plant(plant.id)
    config = require_role(role).config_for(plant)
    assert config is not None
    assert config.sources == (SensorSource(source.entity_id, source.id),)

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    manager = entry.runtime_data.manager
    persisted = manager.get_plant(plant.id)
    config = require_role(role).config_for(persisted)
    assert config is not None
    assert config.sources == (SensorSource(source.entity_id, source.id),)
    response = await _set_sources(client, persisted, role, [pair], alias=alias)
    assert response["success"] is True
    assert manager.get_plant(plant.id).revision == persisted.revision

    # Once removed from this plant, the missing UUID cannot be reintroduced.
    response = await _set_sources(client, persisted, role, [], alias=alias)
    assert response["success"] is True
    cleared = manager.get_plant(plant.id)
    response = await _set_sources(client, cleared, role, [pair], alias=alias)
    assert response["success"] is False
    assert response["error"]["code"] == ERR_INVALID_FORMAT
    assert manager.get_plant(plant.id).revision == cleared.revision


@pytest.mark.parametrize("role", NON_MOISTURE_ROLES)
async def test_role_source_commands_round_trip(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, role: str
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)

    # set_sources
    await client.send_json_auto_id(
        {
            "type": "smart_plants/roles/set_sources",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "role": role,
            "sources": [{"entity_id": "sensor.a"}, {"entity_id": "sensor.b"}],
        }
    )
    response = await client.receive_json()
    assert response["success"] is True
    revision = response["result"]["plant"]["revision"]

    # set_primary
    await client.send_json_auto_id(
        {
            "type": "smart_plants/roles/set_primary",
            "plant_id": plant.id,
            "expected_revision": revision,
            "role": role,
            "primary_entity_id": "sensor.a",
        }
    )
    response = await client.receive_json()
    assert response["success"] is True
    revision = response["result"]["plant"]["revision"]

    # set_aggregation
    await client.send_json_auto_id(
        {
            "type": "smart_plants/roles/set_aggregation",
            "plant_id": plant.id,
            "expected_revision": revision,
            "role": role,
            "aggregation": "average",
        }
    )
    response = await client.receive_json()
    assert response["success"] is True
    revision = response["result"]["plant"]["revision"]

    # set_stale_after
    await client.send_json_auto_id(
        {
            "type": "smart_plants/roles/set_stale_after",
            "plant_id": plant.id,
            "expected_revision": revision,
            "role": role,
            "stale_after_seconds": 1800,
        }
    )
    response = await client.receive_json()
    assert response["success"] is True

    # The manager reflects the configured sources for this role.
    current = manager.get_plant(plant.id)
    assert current is not None
    from custom_components.smart_plants.roles import require_role  # noqa: PLC0415

    config = require_role(role).config_for(current)
    assert config is not None
    assert [source.entity_id for source in config.sources] == [
        "sensor.a",
        "sensor.b",
    ]
    assert config.primary_entity_id == "sensor.a"
    assert config.aggregation == "average"
    assert config.stale_after_seconds == 1800


@pytest.mark.parametrize(
    "command",
    [
        "smart_plants/roles/set_sources",
        "smart_plants/roles/set_primary",
        "smart_plants/roles/set_aggregation",
        "smart_plants/roles/set_stale_after",
    ],
)
async def test_role_source_commands_reject_unknown_role(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, command: str
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)
    payload: dict[str, object] = {
        "type": command,
        "plant_id": plant.id,
        "expected_revision": plant.revision,
        "role": "future_role",
    }
    if command.endswith("set_sources"):
        payload["sources"] = []
    elif command.endswith("set_primary"):
        payload["primary_entity_id"] = None
    elif command.endswith("set_aggregation"):
        payload["aggregation"] = "average"
    else:
        payload["stale_after_seconds"] = 900
    await client.send_json_auto_id(payload)
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_INVALID_FORMAT


async def test_role_set_sources_revision_conflict(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/roles/set_sources",
            "plant_id": plant.id,
            "expected_revision": 999,
            "role": "temperature",
            "sources": [{"entity_id": "sensor.a"}],
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_REVISION_CONFLICT


async def test_role_set_sources_not_found(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/roles/set_sources",
            "plant_id": "does-not-exist",
            "expected_revision": 1,
            "role": "temperature",
            "sources": [{"entity_id": "sensor.a"}],
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_NOT_FOUND


@pytest.mark.parametrize(
    "command",
    [
        "smart_plants/roles/set_sources",
        "smart_plants/roles/set_primary",
        "smart_plants/roles/set_aggregation",
        "smart_plants/roles/set_stale_after",
    ],
)
async def test_role_source_commands_require_admin(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
    command: str,
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    payload: dict[str, object] = {
        "type": command,
        "plant_id": plant.id,
        "expected_revision": plant.revision,
        "role": "temperature",
    }
    if command.endswith("set_sources"):
        payload["sources"] = []
    elif command.endswith("set_primary"):
        payload["primary_entity_id"] = None
    elif command.endswith("set_aggregation"):
        payload["aggregation"] = "average"
    else:
        payload["stale_after_seconds"] = 900
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await client.send_json_auto_id(payload)
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "unauthorized"


async def test_moisture_aliases_still_work(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    # The moisture-scoped commands must keep working unchanged alongside the
    # new generic role commands.
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/moisture/set_sources",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "sources": [{"entity_id": "sensor.soil"}],
        }
    )
    response = await client.receive_json()
    assert response["success"] is True
    current = manager.get_plant(plant.id)
    assert current is not None
    assert [s.entity_id for s in current.moisture.sources] == ["sensor.soil"]


async def test_new_plant_view_includes_default_for_every_source_role(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    # Regression: a freshly created plant persists only roles.moisture, but
    # the panel needs every source-accepting role's config to open its
    # sources editor. The WS view fills registered defaults without storing
    # them, so the create/list payloads expose each registered role and
    # storage stays moisture-only until a role is configured.
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "smart_plants/plants/create", "name": "Aloe"}
    )
    created = await client.receive_json()
    assert created["success"] is True
    await client.send_json_auto_id({"type": "smart_plants/plants/list"})
    listed = await client.receive_json()
    assert listed["success"] is True

    for view in (created["result"]["plant"], listed["result"]["plants"][0]):
        assert set(view["roles"]) == set(SOURCE_ROLES)
        for role in NON_MOISTURE_ROLES:
            definition = require_role(role)
            assert definition.serialize_config is not None
            assert view["roles"][role] == definition.serialize_config(
                definition.default_config()
            )

    fixture = json.loads(ROLE_VIEW_DEFAULTS_FIXTURE.read_text(encoding="utf-8"))
    assert fixture == {
        role: created["result"]["plant"]["roles"][role] for role in NON_MOISTURE_ROLES
    }

    stored = manager.get_plant(created["result"]["plant"]["id"])
    assert stored is not None
    assert set(stored.extra_roles) == set()
    assert set(stored.as_storage()["roles"]) == {"moisture"}


async def test_role_set_sources_from_default_view_on_new_plant(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    # The panel seeds its editor from the default view and saves; the backend
    # must accept it for a role that was never stored, and the persisted
    # record then carries only the configured role.
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)
    response = await _set_sources(
        client, plant, "temperature", [{"entity_id": "sensor.air"}]
    )
    assert response["success"] is True
    view = response["result"]["plant"]
    assert [s["entity_id"] for s in view["roles"]["temperature"]["sources"]] == [
        "sensor.air"
    ]
    assert set(view["roles"]) == set(SOURCE_ROLES)
    stored = manager.get_plant(plant.id)
    assert stored is not None
    assert set(stored.as_storage()["roles"]) == {"moisture", "temperature"}
