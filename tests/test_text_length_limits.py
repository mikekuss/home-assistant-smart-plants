"""
Text limits count Unicode code points, on every path that writes or reads text.

``tests/fixtures/text_length_limits.json`` names each limit and a character
outside the Basic Multilingual Plane. The panel's tests read the same file, so
a value the backend accepts here is one the panel shows.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from custom_components.smart_plants.const import DOMAIN
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.schema_library import vol
from custom_components.smart_plants.services import SERVICE_LOG_CARE
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import (
    MockHAClientWebSocket,
    WebSocketGenerator,
)

from tests.helpers import plant_device

from .test_websocket_api import _connect, _setup

_FIXTURE = json.loads(
    (Path(__file__).parent / "fixtures" / "text_length_limits.json").read_text(
        encoding="utf-8"
    )
)
CHAR: str = _FIXTURE["character"]
LIMITS: dict[str, int] = _FIXTURE["limits"]
OCCURRED = "2026-06-01T08:00:00+00:00"
INTERVAL = {
    "kind": "interval",
    "every": 2,
    "unit": "weeks",
    "growing_season_only": False,
}


def _full(field: str, extra: int = 0) -> str:
    """Return the longest accepted value for ``field``, plus ``extra``."""
    return CHAR * (LIMITS[field] + extra)


def _manager(entry: MockConfigEntry) -> SmartPlantsManager:
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


async def _send(client: MockHAClientWebSocket, msg: dict[str, Any]) -> Any:
    await client.send_json_auto_id(msg)
    response: dict[str, Any] = await client.receive_json()
    assert response["success"], response
    return response["result"]


def test_fixture_character_is_outside_the_basic_plane() -> None:
    # JavaScript counts this character as two UTF-16 units.
    assert len(CHAR) == 1
    assert ord(CHAR) > 0xFFFF


async def test_text_at_every_limit_survives_save_load_and_listing(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    client = await _connect(hass, hass_ws_client)
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await manager.async_create_plant(
        name=_full("plant_name"), tags=[_full("tag")], category=_full("category")
    )
    plant, _ = await manager.async_add_care_event(
        plant.id,
        expected_revision=plant.revision,
        kind="watering",
        occurred_at=OCCURRED,
        payload={"note": _full("care_note")},
    )
    plant, _ = await manager.async_add_care_event(
        plant.id,
        expected_revision=plant.revision,
        kind="note",
        occurred_at=OCCURRED,
        payload={"text": _full("note_text")},
    )
    plant, _ = await manager.async_add_care_event(
        plant.id,
        expected_revision=plant.revision,
        kind="fertilizing",
        occurred_at=OCCURRED,
        payload={
            "product": _full("care_detail"),
            "amount": None,
            "unit": None,
            "note": None,
        },
    )
    plant, _ = await manager.async_create_care_task(
        plant.id,
        expected_revision=plant.revision,
        task_type="custom",
        name=_full("task_name"),
        schedule=INTERVAL,
        instructions=_full("task_instructions"),
        baseline_done_on=None,
    )

    # The stored inventory passes the load checks: the plant is still there
    # after a reload, unchanged.
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert _manager(entry).get_plant(plant.id) == plant

    listed = await _send(client, {"type": "smart_plants/plants/list"})
    (view,) = listed["plants"]
    assert view["name"] == _full("plant_name")
    assert view["tags"] == [_full("tag")]
    assert view["category"] == _full("category")
    (task,) = view["care_tasks"]
    assert task["name"] == _full("task_name")
    assert task["instructions"] == _full("task_instructions")
    history = await _send(
        client, {"type": "smart_plants/care/list", "plant_id": plant.id}
    )
    payloads = {event["kind"]: event["payload"] for event in history["events"]}
    assert payloads["watering"] == {"note": _full("care_note")}
    assert payloads["note"] == {"text": _full("note_text")}
    assert payloads["fertilizing"]["product"] == _full("care_detail")


async def test_retired_plant_keeps_a_name_at_the_limit(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    client = await _connect(hass, hass_ws_client)
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await manager.async_create_plant(name=_full("plant_name"))
    await manager.async_archive_plant(plant.id, expected_revision=plant.revision)

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    archived = await _send(client, {"type": "smart_plants/archive/list"})
    assert [item["name"] for item in archived["plants"]] == [_full("plant_name")]


async def test_one_character_over_the_limit_is_refused(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    with pytest.raises(SmartPlantsValidationError):
        await manager.async_create_plant(name=_full("plant_name", 1))
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError):
        await manager.async_add_care_event(
            plant.id,
            expected_revision=plant.revision,
            kind="watering",
            occurred_at=OCCURRED,
            payload={"note": _full("care_note", 1)},
        )
    with pytest.raises(SmartPlantsValidationError):
        await manager.async_create_care_task(
            plant.id,
            expected_revision=plant.revision,
            task_type="custom",
            name=_full("task_name", 1),
            schedule=INTERVAL,
            instructions=None,
            baseline_done_on=None,
        )
    assert _manager(entry).get_plant(plant.id) == plant


async def test_log_care_action_counts_characters(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    plant = await _manager(entry).async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    device = plant_device(dr.async_get(hass), plant.id)
    assert device is not None

    await hass.services.async_call(
        DOMAIN,
        SERVICE_LOG_CARE,
        {"device_id": device.id, "kind": "watering", "note": _full("care_note")},
        blocking=True,
    )
    with pytest.raises((HomeAssistantError, vol.Invalid)):
        await hass.services.async_call(
            DOMAIN,
            SERVICE_LOG_CARE,
            {
                "device_id": device.id,
                "kind": "watering",
                "note": _full("care_note", 1),
            },
            blocking=True,
        )

    events = _manager(entry).care_history(plant.id)["events"]
    assert [event["payload"]["note"] for event in events] == [_full("care_note")]
