from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsManagerUnavailableError,
    SmartPlantsPlantNotFoundError,
    SmartPlantsRevisionConflictError,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.provider import ProviderOutageError
from custom_components.smart_plants.websocket_api import (
    ERR_INTEGRATION_NOT_LOADED,
    ERR_INVALID_FORMAT,
    ERR_NOT_FOUND,
    ERR_PROVIDER_MALFORMED,
    ERR_PROVIDER_OUTAGE,
    ERR_REVISION_CONFLICT,
    ERR_UNKNOWN,
)
from homeassistant.auth.const import GROUP_ID_READ_ONLY, GROUP_ID_USER
from homeassistant.components.websocket_api import DOMAIN as WEBSOCKET_DOMAIN
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import Unauthorized
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry, MockUser
from pytest_homeassistant_custom_component.typing import (
    MockHAClientWebSocket,
    WebSocketGenerator,
)

from .test_provider import MalformedSearchProvider, SyntheticProvider


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    # async_setup_component is required so the integration's async_setup runs
    # and registers the process-lifetime WebSocket commands.
    assert await async_setup_component(hass, DOMAIN, {})
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _connect(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> MockHAClientWebSocket:
    """
    Connect a WebSocket client before the config entry is set up.

    Creating the client starts the HTTP server, and aiohttp freezes the
    router when a server starts. Depending on plugin load order, the
    ``aiohttp_client`` fixture comes either from
    pytest-homeassistant-custom-component, which keeps the router open, or
    from pytest-aiohttp, which does not. Setting the integration up first
    registers every route it and its ``frontend`` and ``panel_custom``
    dependencies need while the router still accepts them. The config entry
    can then be set up after connecting, for example once a test has moved
    the clock, since the client's access token is only valid at the real time.
    """
    assert await async_setup_component(hass, DOMAIN, {})
    return await hass_ws_client(hass)


async def test_list_empty(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "smart_plants/plants/list"})
    response = await client.receive_json()
    assert response["success"] is True
    assert response["result"] == {"plants": [], "archived_count": 0}


async def test_role_api_rejects_unknown_role(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/create",
            "name": "Aloe",
        }
    )
    created = await client.receive_json()
    plant = created["result"]["plant"]
    await client.send_json_auto_id(
        {
            "type": "smart_plants/roles/set_threshold_overrides",
            "plant_id": plant["id"],
            "expected_revision": plant["revision"],
            "role": "future_role",
            "values": {},
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_INVALID_FORMAT


async def test_role_api_sanitizes_unexpected_error(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    plant = await entry.runtime_data.manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)
    with patch.object(
        entry.runtime_data.manager,
        "async_set_role_threshold_overrides",
        side_effect=RuntimeError("secret detail"),
    ):
        await client.send_json_auto_id(
            {
                "type": "smart_plants/roles/set_threshold_overrides",
                "plant_id": plant.id,
                "expected_revision": plant.revision,
                "role": "moisture",
                "values": {"min": 20, "target": 40, "max": 60},
            }
        )
        response = await client.receive_json()
    assert response["error"] == {"code": ERR_UNKNOWN, "message": "internal error"}


async def test_list_requires_admin(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await client.send_json_auto_id({"type": "smart_plants/plants/list"})
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "unauthorized"


# Read-only commands a dashboard card needs for every signed-in user.
_ANY_USER_COMMANDS = frozenset({"smart_plants/archive/card_info"})


@pytest.mark.parametrize("group", [GROUP_ID_USER, GROUP_ID_READ_ONLY])
async def test_every_command_refuses_users_who_are_not_admins(
    hass: HomeAssistant, group: str
) -> None:
    # Home Assistant validates a message against the command's schema before
    # the handler runs, so calling each registered handler directly checks
    # that the admin gate holds whatever the payload is.
    await _setup(hass)
    auth_group = await hass.auth.async_get_group(group)
    assert auth_group is not None
    user = MockUser(groups=[auth_group]).add_to_hass(hass)
    assert not user.is_admin
    handlers = {
        command: handler
        for command, (handler, _schema) in hass.data[WEBSOCKET_DOMAIN].items()
        if command.startswith(f"{DOMAIN}/") and command not in _ANY_USER_COMMANDS
    }
    assert "smart_plants/plants/list" in handlers
    assert "smart_plants/wizard/start" in handlers
    assert len(handlers) >= 40
    for command, handler in sorted(handlers.items()):
        connection = MagicMock(user=user)
        with pytest.raises(Unauthorized):
            handler(hass, connection, {"id": 1, "type": command})
        connection.send_result.assert_not_called()
        connection.send_error.assert_not_called()


async def test_create_list_update_delete_roundtrip(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/create",
            "name": "Aloe",
            "tags": ["kitchen", "succulent"],
        }
    )
    created = await client.receive_json()
    assert created["success"], created
    plant = created["result"]["plant"]
    assert plant["name"] == "Aloe"
    assert plant["revision"] == 1
    assert plant["tags"] == ["kitchen", "succulent"]

    await client.send_json_auto_id({"type": "smart_plants/plants/list"})
    listed = await client.receive_json()
    assert listed["success"], listed
    assert [p["id"] for p in listed["result"]["plants"]] == [plant["id"]]

    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/update",
            "plant_id": plant["id"],
            "expected_revision": plant["revision"],
            "name": "Aloe Vera",
        }
    )
    updated = await client.receive_json()
    assert updated["success"], updated
    assert updated["result"]["plant"]["name"] == "Aloe Vera"
    assert updated["result"]["plant"]["revision"] == 2

    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/disable",
            "plant_id": plant["id"],
            "expected_revision": 2,
        }
    )
    disabled = await client.receive_json()
    assert disabled["success"], disabled
    assert disabled["result"]["plant"]["lifecycle_state"] == "disabled"

    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/reenable",
            "plant_id": plant["id"],
            "expected_revision": disabled["result"]["plant"]["revision"],
        }
    )
    reenabled = await client.receive_json()
    assert reenabled["success"], reenabled
    assert reenabled["result"]["plant"]["lifecycle_state"] == "active"

    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/delete",
            "plant_id": plant["id"],
            "expected_revision": reenabled["result"]["plant"]["revision"],
        }
    )
    deleted = await client.receive_json()
    assert deleted["success"], deleted
    assert deleted["result"] == {}


async def test_update_returns_not_found(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/update",
            "plant_id": "does-not-exist",
            "expected_revision": 1,
            "name": "Ghost",
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_NOT_FOUND


async def test_update_returns_revision_conflict(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")

    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/update",
            "plant_id": plant.id,
            "expected_revision": plant.revision + 5,
            "name": "Nope",
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_REVISION_CONFLICT


async def test_create_returns_invalid_format(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "smart_plants/plants/create", "name": "   "}
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_INVALID_FORMAT


async def test_returns_integration_not_loaded_when_unloaded(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "smart_plants/plants/list"})
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_INTEGRATION_NOT_LOADED


async def test_returns_integration_not_loaded_without_entry(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    # Register process-lifetime commands without ever creating a config entry.
    assert await async_setup_component(hass, DOMAIN, {})
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "smart_plants/plants/create", "name": "X"})
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_INTEGRATION_NOT_LOADED


@pytest.mark.parametrize(
    "field",
    ["update", "disable", "reenable", "delete"],
)
async def test_lifecycle_commands_require_admin(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
    field: str,
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")

    payload: dict[str, object] = {
        "type": f"smart_plants/plants/{field}",
        "plant_id": plant.id,
        "expected_revision": plant.revision,
    }
    if field == "update":
        payload["name"] = "Renamed"

    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await client.send_json_auto_id(payload)
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "unauthorized"


@pytest.mark.parametrize("bad_revision", [True, False, 0, -1, 1.0, "1"])
async def test_update_rejects_invalid_revision_shape(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    bad_revision: object,
) -> None:
    entry = await _setup(hass)
    plant = await entry.runtime_data.manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/update",
            "plant_id": plant.id,
            "expected_revision": bad_revision,
            "name": "Changed",
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_INVALID_FORMAT


async def test_update_maps_unload_race_to_not_loaded(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)
    with patch.object(
        manager,
        "async_update_plant",
        side_effect=SmartPlantsManagerUnavailableError("closing"),
    ):
        await client.send_json_auto_id(
            {
                "type": "smart_plants/plants/update",
                "plant_id": plant.id,
                "expected_revision": plant.revision,
                "name": "Changed",
            }
        )
        response = await client.receive_json()
    assert response["error"]["code"] == ERR_INTEGRATION_NOT_LOADED


async def test_update_hides_internal_error_details(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_ws_client(hass)
    with patch.object(
        manager,
        "async_update_plant",
        side_effect=RuntimeError("secret filesystem path"),
    ):
        await client.send_json_auto_id(
            {
                "type": "smart_plants/plants/update",
                "plant_id": plant.id,
                "expected_revision": plant.revision,
                "name": "Changed",
            }
        )
        response = await client.receive_json()
    assert response["error"]["code"] == ERR_UNKNOWN
    assert response["error"]["message"] == "internal error"
    assert "secret" not in response["error"]["message"]


async def test_create_rejects_non_manual_species(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/create",
            "name": "Aloe",
            "species": {"provider": "remote", "snapshot": {}},
        }
    )
    response = await client.receive_json()
    assert response["error"]["code"] == ERR_INVALID_FORMAT


async def test_species_search_is_admin_only_and_bounded(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/species/search",
            "provider": "manual",
            "query": "Aloe",
            "locale": "en",
            "limit": 20,
        }
    )
    response = await client.receive_json()
    assert response["error"]["code"] == "unauthorized"

    admin = await hass_ws_client(hass)
    await admin.send_json_auto_id(
        {
            "type": "smart_plants/species/search",
            "provider": "manual",
            "query": "Aloe",
            "locale": "invalid-locale-value",
            "limit": 51,
        }
    )
    response = await admin.receive_json()
    assert response["error"]["code"] == ERR_INVALID_FORMAT


async def test_species_api_maps_provider_error_without_details(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    service = entry.runtime_data.provider_service
    assert service is not None
    client = await hass_ws_client(hass)
    with patch.object(
        service,
        "async_search",
        side_effect=ProviderOutageError("credential=must-not-leak"),
    ):
        await client.send_json_auto_id(
            {
                "type": "smart_plants/species/search",
                "provider": "manual",
                "query": "Aloe",
                "locale": "en",
                "limit": 20,
            }
        )
        response = await client.receive_json()
    assert response["error"] == {
        "code": ERR_PROVIDER_OUTAGE,
        "message": "provider is unavailable",
    }


async def test_species_search_maps_malformed_provider_field(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    service = entry.runtime_data.provider_service
    assert service is not None
    service._registry.register(MalformedSearchProvider("latin_name", 42))
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {
            "type": "smart_plants/species/search",
            "provider": "synthetic",
            "query": "Plant",
            "locale": "en",
            "limit": 5,
        }
    )
    response = await client.receive_json()

    assert response["error"] == {
        "code": ERR_PROVIDER_MALFORMED,
        "message": "provider response was malformed",
    }


async def test_synthetic_provider_websocket_search_preview_apply_flow(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    service = entry.runtime_data.provider_service
    assert service is not None
    service._registry.register(SyntheticProvider())
    plant = await entry.runtime_data.manager.async_create_plant(name="Synthetic")
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/species/search",
            "provider": "synthetic",
            "query": "Plant",
            "locale": "en",
            "limit": 5,
        }
    )
    search = await client.receive_json()
    provider_ref = search["result"]["results"][0]["provider_ref"]
    await client.send_json_auto_id(
        {
            "type": "smart_plants/species/preview",
            "provider": "synthetic",
            "provider_ref": provider_ref,
            "locale": "en",
            "plant_id": plant.id,
        }
    )
    preview = (await client.receive_json())["result"]
    await client.send_json_auto_id(
        {
            "type": "smart_plants/species/apply",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "preview_token": preview["preview_token"],
            "provider": preview["provider"],
            "operation": preview["operation"],
            "confirmed": True,
        }
    )
    applied = await client.receive_json()
    assert applied["result"]["plant"]["species"]["provider"] == "synthetic"


_PLANT = "0123456789abcdef0123456789abcdef"
_TASK = "fedcba9876543210fedcba9876543210"
_EVENT = "00000000-0000-4000-8000-000000000001"
_AT = "2026-09-11T12:00:00+00:00"
_WRITES: tuple[tuple[str, str, dict[str, object]], ...] = (
    ("plants/update", "async_update_plant", {"name": "Aloe"}),
    ("plants/set_area", "async_set_plant_area", {"area_id": None}),
    ("plants/set_rest_period", "async_set_rest_period", {"rest_period": None}),
    ("plants/snooze", "async_snooze_plant", {"until": None}),
    (
        "care/add_watering",
        "async_add_watering",
        {"occurred_at": _AT, "note": None},
    ),
    (
        "care/add",
        "async_add_care_event",
        {"kind": "fertilizing", "occurred_at": _AT, "payload": {}},
    ),
    (
        "care/edit",
        "async_edit_care_event",
        {"event_id": _EVENT, "kind": "watering", "occurred_at": _AT, "payload": {}},
    ),
    ("care/delete", "async_delete_care_event", {"event_id": _EVENT}),
    (
        "care_tasks/create",
        "async_create_care_task",
        {
            "task_type": "fertilize",
            "name": None,
            "schedule": {},
            "instructions": None,
            "baseline_done_on": None,
        },
    ),
    ("care_tasks/update", "async_update_care_task", {"task_id": _TASK}),
    ("care_tasks/delete", "async_delete_care_task", {"task_id": _TASK}),
    ("care_tasks/complete", "async_complete_care_task", {"task_id": _TASK}),
    ("care_tasks/skip", "async_skip_care_task", {"task_id": _TASK}),
    (
        "care_tasks/undo_skip",
        "async_undo_skip_care_task",
        {"task_id": _TASK, "previous_skipped_on": None},
    ),
    (
        "roles/set_sources",
        "async_set_role_sources",
        {"role": "temperature", "sources": []},
    ),
    (
        "roles/set_primary",
        "async_set_role_primary",
        {"role": "temperature", "primary_entity_id": None},
    ),
    (
        "roles/set_aggregation",
        "async_set_role_aggregation",
        {"role": "temperature", "aggregation": "average"},
    ),
    (
        "roles/set_stale_after",
        "async_set_role_stale_after",
        {"role": "temperature", "stale_after_seconds": 3600},
    ),
)


@pytest.mark.parametrize(
    ("command", "method", "fields"),
    _WRITES,
    ids=[command for command, _method, _fields in _WRITES],
)
async def test_plant_write_commands_map_manager_errors(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    command: str,
    method: str,
    fields: dict[str, object],
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    client = await hass_ws_client(hass)
    errors: tuple[tuple[Exception, str], ...] = (
        (SmartPlantsPlantNotFoundError(_PLANT), ERR_NOT_FOUND),
        (SmartPlantsRevisionConflictError(_PLANT, 1, 2), ERR_REVISION_CONFLICT),
        (SmartPlantsValidationError("bad value"), ERR_INVALID_FORMAT),
        (SmartPlantsManagerUnavailableError(), ERR_INTEGRATION_NOT_LOADED),
        (RuntimeError("secret detail"), ERR_UNKNOWN),
    )
    for error, code in errors:
        with patch.object(manager, method, side_effect=error):
            await client.send_json_auto_id(
                {
                    "type": f"{DOMAIN}/{command}",
                    "plant_id": _PLANT,
                    "expected_revision": 1,
                    **fields,
                }
            )
            response = await client.receive_json()
        assert response["success"] is False, (command, code)
        assert response["error"]["code"] == code, (command, error)
        assert "secret detail" not in response["error"]["message"]
