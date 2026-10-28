"""Snoozing several plants at once: WebSocket commands and the All plants target."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from custom_components.smart_plants import storage as storage_module
from custom_components.smart_plants.const import DOMAIN
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantRecord
from custom_components.smart_plants.services import SERVICE_SNOOZE, SERVICE_UNSNOOZE
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import Context, HomeAssistant
from homeassistant.exceptions import Unauthorized
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry, MockUser
from pytest_homeassistant_custom_component.typing import (
    MockHAClientWebSocket,
    WebSocketGenerator,
)

from tests.helpers import plant_device

from .test_websocket_api import _connect, _setup

NOW = datetime(2026, 6, 15, 10, 0, tzinfo=UTC)
ALL_PLANTS = "binary_sensor.smart_plants_all_plants"
WEEK_END = "2026-06-22T10:00:00Z"


def _manager(entry: MockConfigEntry) -> SmartPlantsManager:
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


async def _plants(entry: MockConfigEntry, *names: str) -> list[PlantRecord]:
    manager = _manager(entry)
    return [await manager.async_create_plant(name=name) for name in names]


async def _paused(entry: MockConfigEntry, name: str) -> PlantRecord:
    manager = _manager(entry)
    plant = await manager.async_create_plant(name=name)
    return await manager.async_disable_plant(plant.id, expected_revision=plant.revision)


async def _snooze(entry: MockConfigEntry, plant: PlantRecord, until: datetime) -> None:
    await _manager(entry).async_snooze_plant(
        plant.id, expected_revision=None, until=until
    )


async def _send(client: MockHAClientWebSocket, msg: dict[str, Any]) -> dict[str, Any]:
    await client.send_json_auto_id(msg)
    response: dict[str, Any] = await client.receive_json()
    return response


async def _snooze_many(client: MockHAClientWebSocket, **fields: Any) -> dict[str, Any]:
    return await _send(client, {"type": "smart_plants/plants/snooze_many", **fields})


def _saves(manager: SmartPlantsManager) -> Any:
    """Count the inventory writes of ``manager`` while the context is open."""
    store = manager._store
    return patch.object(store, "async_save", new=AsyncMock(wraps=store.async_save))


def _ends(entry: MockConfigEntry) -> dict[str, str | None]:
    return {
        plant.name: plant.snoozed_until
        for plant in _manager(entry).snapshot.plants.values()
    }


# --- smart_plants/plants/snooze_many -----------------------------------------


async def test_snooze_many_snoozes_every_active_plant(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await _connect(hass, hass_ws_client)
    freezer.move_to(NOW)
    entry = await _setup(hass)
    aloe, office = await _plants(entry, "Aloe", "Office Aloe")
    paused = await _paused(entry, "Fern")
    manager = _manager(entry)

    with _saves(manager) as save:
        response = await _snooze_many(client, until="2026-06-22T12:00:00+02:00")

    assert response["success"], response
    result = response["result"]
    assert {view["id"] for view in result["plants"]} == {aloe.id, office.id}
    assert {view["snoozed_until"] for view in result["plants"]} == {WEEK_END}
    assert result["previous"] == {aloe.id: None, office.id: None}
    # One save for the whole call, one revision bump per changed plant.
    assert save.await_count == 1
    for plant in (aloe, office):
        assert manager.get_plant(plant.id).revision == plant.revision + 1
    # The paused plant is skipped silently.
    assert manager.get_plant(paused.id) == paused


async def test_snooze_many_keeps_a_later_end(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await _connect(hass, hass_ws_client)
    freezer.move_to(NOW)
    entry = await _setup(hass)
    aloe, office, fern = await _plants(entry, "Aloe", "Office Aloe", "Fern")
    await _snooze(entry, aloe, NOW + timedelta(days=30))
    await _snooze(entry, office, NOW + timedelta(days=2))
    aloe = _manager(entry).get_plant(aloe.id)

    response = await _snooze_many(client, until=WEEK_END)

    assert response["success"], response
    result = response["result"]
    assert {view["id"] for view in result["plants"]} == {office.id, fern.id}
    assert result["previous"] == {office.id: "2026-06-17T10:00:00Z", fern.id: None}
    assert _manager(entry).get_plant(aloe.id) == aloe
    assert _ends(entry) == {
        "Aloe": "2026-07-15T10:00:00Z",
        "Office Aloe": WEEK_END,
        "Fern": WEEK_END,
    }


async def test_snooze_many_without_keep_later_replaces_every_end(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await _connect(hass, hass_ws_client)
    freezer.move_to(NOW)
    entry = await _setup(hass)
    aloe, office = await _plants(entry, "Aloe", "Office Aloe")
    await _snooze(entry, aloe, NOW + timedelta(days=30))

    response = await _snooze_many(client, until=WEEK_END, keep_later=False)

    assert response["success"], response
    assert response["result"]["previous"] == {
        aloe.id: "2026-07-15T10:00:00Z",
        office.id: None,
    }
    assert _ends(entry) == {"Aloe": WEEK_END, "Office Aloe": WEEK_END}


async def test_snooze_many_with_null_ends_every_snooze(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await _connect(hass, hass_ws_client)
    freezer.move_to(NOW)
    entry = await _setup(hass)
    aloe, office, fern = await _plants(entry, "Aloe", "Office Aloe", "Fern")
    await _snooze(entry, aloe, NOW + timedelta(days=30))
    await _snooze(entry, office, NOW + timedelta(days=2))

    # keep_later has nothing to keep when every snooze ends.
    response = await _snooze_many(client, until=None, keep_later=True)

    assert response["success"], response
    result = response["result"]
    assert {view["id"] for view in result["plants"]} == {aloe.id, office.id}
    assert result["previous"] == {
        aloe.id: "2026-07-15T10:00:00Z",
        office.id: "2026-06-17T10:00:00Z",
    }
    assert set(_ends(entry).values()) == {None}
    assert _manager(entry).get_plant(fern.id) == fern


async def test_snooze_many_targets_the_given_plants(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await _connect(hass, hass_ws_client)
    freezer.move_to(NOW)
    entry = await _setup(hass)
    aloe, office = await _plants(entry, "Aloe", "Office Aloe")
    paused = await _paused(entry, "Fern")

    response = await _snooze_many(
        client, until=WEEK_END, plant_ids=[aloe.id, paused.id, aloe.id]
    )

    assert response["success"], response
    assert [view["id"] for view in response["result"]["plants"]] == [aloe.id]
    assert _ends(entry) == {"Aloe": WEEK_END, "Office Aloe": None, "Fern": None}
    assert _manager(entry).get_plant(office.id) == office


async def test_snooze_many_with_nothing_to_change(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await _connect(hass, hass_ws_client)
    freezer.move_to(NOW)
    entry = await _setup(hass)
    await _paused(entry, "Fern")
    revision = _manager(entry).snapshot.revision

    response = await _snooze_many(client, until=WEEK_END)

    assert response["success"], response
    assert response["result"] == {"plants": [], "previous": {}}
    assert _manager(entry).snapshot.revision == revision


@pytest.mark.parametrize(
    ("fields", "code"),
    [
        pytest.param({"until": "2028-01-01T00:00:00Z"}, "invalid_format", id="late"),
        pytest.param({"until": "2026-06-15T09:00:00Z"}, "invalid_format", id="past"),
        pytest.param({"until": "2026-06-20"}, "invalid_format", id="no zone"),
        pytest.param({}, "invalid_format", id="no until"),
        pytest.param(
            {"until": WEEK_END, "plant_ids": ["missing-plant"]},
            "not_found",
            id="unknown plant",
        ),
    ],
)
async def test_snooze_many_failure_changes_nothing(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    freezer: Any,
    fields: dict[str, Any],
    code: str,
) -> None:
    client = await _connect(hass, hass_ws_client)
    freezer.move_to(NOW)
    entry = await _setup(hass)
    aloe, office = await _plants(entry, "Aloe", "Office Aloe")
    if "plant_ids" in fields:
        fields = {**fields, "plant_ids": [aloe.id, *fields["plant_ids"]]}

    response = await _snooze_many(client, **fields)

    assert response["success"] is False
    assert response["error"]["code"] == code
    assert _manager(entry).get_plant(aloe.id) == aloe
    assert _manager(entry).get_plant(office.id) == office


def _inventory_size(manager: SmartPlantsManager) -> int:
    return len(
        json.dumps(
            manager.snapshot.as_storage(), ensure_ascii=False, separators=(",", ":")
        ).encode()
    )


async def test_snooze_many_refused_save_changes_nothing(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    freezer: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = await _connect(hass, hass_ws_client)
    freezer.move_to(NOW)
    entry = await _setup(hass)
    manager = _manager(entry)
    aloe, office = await _plants(entry, "Aloe", "Office Aloe")
    # The stored inventory just fits; two snooze ends do not.
    monkeypatch.setattr(
        storage_module, "_INVENTORY_MAX_BYTES", _inventory_size(manager) + 10
    )
    revision = manager.snapshot.revision

    response = await _snooze_many(client, until=WEEK_END)

    assert response["success"] is False
    assert response["error"]["code"] == "unknown_error"
    assert manager.snapshot.revision == revision
    assert manager.get_plant(aloe.id) == aloe
    assert manager.get_plant(office.id) == office


# --- smart_plants/plants/restore_snoozes -------------------------------------


async def test_restore_snoozes_undoes_snooze_many(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    freezer: FrozenDateTimeFactory,
) -> None:
    client = await _connect(hass, hass_ws_client)
    freezer.move_to(NOW)
    entry = await _setup(hass)
    aloe, office, fern = await _plants(entry, "Aloe", "Office Aloe", "Fern")
    await _snooze(entry, office, NOW + timedelta(days=2))
    await _snooze(entry, fern, NOW + timedelta(hours=1))
    snoozed = await _snooze_many(client, until=WEEK_END)
    previous = snoozed["result"]["previous"]
    assert previous == {
        aloe.id: None,
        office.id: "2026-06-17T10:00:00Z",
        fern.id: "2026-06-15T11:00:00Z",
    }
    # Fern's earlier end passes before the undo, so Fern ends its snooze.
    freezer.move_to(NOW + timedelta(hours=2))

    with _saves(_manager(entry)) as save:
        response = await _send(
            client,
            {"type": "smart_plants/plants/restore_snoozes", "snoozes": previous},
        )

    assert response["success"], response
    views = {view["id"]: view["snoozed_until"] for view in response["result"]["plants"]}
    assert views == {aloe.id: None, office.id: "2026-06-17T10:00:00Z", fern.id: None}
    assert save.await_count == 1
    assert _ends(entry) == {
        "Aloe": None,
        "Office Aloe": "2026-06-17T10:00:00Z",
        "Fern": None,
    }


async def test_restore_snoozes_skips_paused_plants_and_rejects_bad_ends(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await _connect(hass, hass_ws_client)
    freezer.move_to(NOW)
    entry = await _setup(hass)
    (aloe,) = await _plants(entry, "Aloe")
    paused = await _paused(entry, "Fern")

    response = await _send(
        client,
        {
            "type": "smart_plants/plants/restore_snoozes",
            "snoozes": {aloe.id: WEEK_END, paused.id: WEEK_END},
        },
    )
    assert response["success"], response
    assert [view["id"] for view in response["result"]["plants"]] == [aloe.id]
    assert _manager(entry).get_plant(paused.id) == paused

    aloe = _manager(entry).get_plant(aloe.id)
    invalid = await _send(
        client,
        {
            "type": "smart_plants/plants/restore_snoozes",
            "snoozes": {aloe.id: None, "missing-plant": None},
        },
    )
    assert invalid["error"]["code"] == "not_found"
    assert _manager(entry).get_plant(aloe.id) == aloe


@pytest.mark.parametrize(
    "msg",
    [
        pytest.param(
            {"type": "smart_plants/plants/snooze_many", "until": None}, id="snooze"
        ),
        pytest.param(
            {"type": "smart_plants/plants/restore_snoozes", "snoozes": {}},
            id="restore",
        ),
    ],
)
async def test_snooze_many_commands_are_admin_only(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
    msg: dict[str, Any],
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)

    response = await _send(client, msg)

    assert response["success"] is False
    assert response["error"]["code"] == "unauthorized"


# --- All plants target for the actions ---------------------------------------


async def _call(
    hass: HomeAssistant, service: str, data: dict[str, Any], **kwargs: Any
) -> None:
    await hass.services.async_call(DOMAIN, service, data, blocking=True, **kwargs)


def _device_id(hass: HomeAssistant, plant_id: str) -> str:
    device = plant_device(dr.async_get(hass), plant_id)
    assert device is not None
    return device.id


async def test_snooze_action_with_all_plants_keeps_a_later_end(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    aloe, office, _fern = await _plants(entry, "Aloe", "Office Aloe", "Fern")
    paused = await _paused(entry, "Palm")
    await _snooze(entry, aloe, NOW + timedelta(days=30))
    await hass.async_block_till_done()
    manager = _manager(entry)

    with _saves(manager) as save:
        await _call(
            hass, SERVICE_SNOOZE, {"entity_id": ALL_PLANTS, "duration": {"days": 7}}
        )

    assert _ends(entry) == {
        "Aloe": "2026-07-15T10:00:00Z",
        "Office Aloe": WEEK_END,
        "Fern": WEEK_END,
        "Palm": None,
    }
    assert save.await_count == 1
    assert manager.get_plant(office.id).revision == office.revision + 1
    assert manager.get_plant(paused.id) == paused


async def test_snooze_action_all_plants_wins_over_other_targets(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    aloe, _office = await _plants(entry, "Aloe", "Office Aloe")
    await hass.async_block_till_done()
    # The registry id of the All plants entity counts like its entity ID.
    registry = er.async_get(hass)
    all_plants = registry.async_get(ALL_PLANTS)
    assert all_plants is not None

    await _call(
        hass,
        SERVICE_SNOOZE,
        {
            "device_id": _device_id(hass, aloe.id),
            "entity_id": all_plants.id,
            "duration": {"days": 7},
        },
    )

    assert _ends(entry) == {"Aloe": WEEK_END, "Office Aloe": WEEK_END}


async def test_snooze_action_with_plant_targets_replaces_a_later_end(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    (aloe,) = await _plants(entry, "Aloe")
    await _snooze(entry, aloe, NOW + timedelta(days=30))

    await _call(
        hass,
        SERVICE_SNOOZE,
        {"device_id": _device_id(hass, aloe.id), "duration": {"days": 7}},
    )

    assert _ends(entry) == {"Aloe": WEEK_END}


async def test_unsnooze_action_with_all_plants_ends_every_snooze(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    aloe, office, fern = await _plants(entry, "Aloe", "Office Aloe", "Fern")
    paused = await _paused(entry, "Palm")
    await _snooze(entry, aloe, NOW + timedelta(days=30))
    await _snooze(entry, office, NOW + timedelta(days=2))
    await hass.async_block_till_done()
    manager = _manager(entry)

    with _saves(manager) as save:
        await _call(hass, SERVICE_UNSNOOZE, {"entity_id": ALL_PLANTS})

    assert set(_ends(entry).values()) == {None}
    assert save.await_count == 1
    assert manager.get_plant(fern.id) == fern
    assert manager.get_plant(paused.id) == paused


@pytest.mark.parametrize("service", [SERVICE_SNOOZE, SERVICE_UNSNOOZE])
async def test_read_only_user_cannot_target_all_plants(
    hass: HomeAssistant,
    hass_read_only_user: MockUser,
    freezer: FrozenDateTimeFactory,
    service: str,
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    (aloe,) = await _plants(entry, "Aloe")
    if service == SERVICE_UNSNOOZE:
        await _snooze(entry, aloe, NOW + timedelta(days=2))
    await hass.async_block_till_done()
    before = _manager(entry).get_plant(aloe.id)
    data: dict[str, Any] = {"entity_id": ALL_PLANTS}
    if service == SERVICE_SNOOZE:
        data["duration"] = {"days": 7}

    with pytest.raises(Unauthorized):
        await _call(
            hass, service, data, context=Context(user_id=hass_read_only_user.id)
        )

    assert _manager(entry).get_plant(aloe.id) == before
