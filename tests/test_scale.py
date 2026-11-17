"""
Scale workload: 200 synthetic plants.

Each plant has one moisture sensor, one temperature sensor, one reading care
task on its temperature and 20 logged waterings. The tests count what one
bulk write, one panel refresh and the loaded runtime cost, so a change that
brings back work per plant (or per plant squared) fails here.

Run ``pytest -s tests/test_scale.py`` to print the measured numbers.
"""

from __future__ import annotations

import copy
import json
import time
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import patch
from uuid import uuid4

from custom_components.smart_plants.const import (
    DOMAIN,
    SINGLETON_UNIQUE_ID,
    STORAGE_KEY,
)
from custom_components.smart_plants.manager import SmartPlantsManager, snooze_change
from custom_components.smart_plants.reading_tracker import ReadingTracker
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import (
    MockHAClientWebSocket,
    WebSocketGenerator,
)

from .test_websocket_api import _connect

PLANTS = 200
WATERINGS = 20
PERCENT = {"unit_of_measurement": "%"}
CELSIUS = {"unit_of_measurement": "°C"}
READING = {
    "kind": "reading",
    "source": {"role": "temperature"},
    "condition": "below",
    "value": 5.0,
    "unit": "°C",
    "for_minutes": 0,
    "reset_value": None,
}


def _moisture(index: int) -> str:
    return f"sensor.mock_moisture_{index:03d}"


def _temperature(index: int) -> str:
    return f"sensor.mock_temperature_{index:03d}"


def _clone(template: dict[str, Any], index: int) -> dict[str, Any]:
    """Return a copy of the stored template plant with its own identities."""
    plant = copy.deepcopy(template)
    plant["id"] = uuid4().hex
    plant["name"] = f"Plant {index:03d}"
    for event in plant["care_events"]:
        event["id"] = str(uuid4())
    for task in plant["care_tasks"]:
        task["id"] = uuid4().hex
    text = json.dumps(plant)
    text = text.replace(_moisture(0), _moisture(index)).replace(
        _temperature(0), _temperature(index)
    )
    cloned: dict[str, Any] = json.loads(text)
    return cloned


async def _load(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client: WebSocketGenerator,
) -> tuple[MockConfigEntry, MockHAClientWebSocket, int]:
    """
    Load the workload; return the entry, a client and the listener baseline.

    One plant is created through the manager; its stored record is copied for
    the others, so the whole inventory loads the way it would after a
    restart.
    """
    client = await _connect(hass, hass_ws_client)
    for index in range(PLANTS):
        hass.states.async_set(_moisture(index), "40", PERCENT)
        hass.states.async_set(_temperature(index), "18", CELSIUS)
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Plant 000")
    plant = await manager.async_set_role_sources(
        plant.id,
        role="moisture",
        expected_revision=plant.revision,
        sources=[{"entity_id": _moisture(0)}],
    )
    plant = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": _temperature(0)}],
    )
    plant, _task = await manager.async_create_care_task(
        plant.id,
        expected_revision=plant.revision,
        task_type="winter_protection",
        name=None,
        schedule=READING,
        instructions=None,
        baseline_done_on=None,
    )
    start = datetime(2026, 1, 1, 8, 0, tzinfo=UTC)
    for day in range(WATERINGS):
        await manager.async_add_watering(
            plant.id,
            expected_revision=None,
            occurred_at=(start + timedelta(days=day)).isoformat(),
            note=None,
        )
    await hass.async_block_till_done()
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    baseline = _registry_listeners(hass)

    stored = hass_storage[STORAGE_KEY]
    (template,) = stored["data"]["plants"]
    stored["data"]["plants"] = [template] + [
        _clone(template, index) for index in range(1, PLANTS)
    ]
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry, client, baseline


def _registry_listeners(hass: HomeAssistant) -> int:
    return hass.bus.async_listeners().get(er.EVENT_ENTITY_REGISTRY_UPDATED, 0)


def _controllers(manager: SmartPlantsManager) -> int:
    return sum(len(by_role) for by_role in manager._controllers.values())


async def _plants_reply(
    client: MockHAClientWebSocket, command: str
) -> tuple[list[dict[str, Any]], int, float]:
    """Return the reply's plants, their compact JSON size and the round trip."""
    started = time.perf_counter()
    await client.send_json_auto_id({"type": command})
    response = await client.receive_json()
    seconds = time.perf_counter() - started
    assert response["success"] is True
    plants: list[dict[str, Any]] = response["result"]["plants"]
    return plants, len(json.dumps(plants, separators=(",", ":"))), seconds


async def test_scale_workload(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    hass_ws_client: WebSocketGenerator,
) -> None:
    entry, client, baseline = await _load(hass, hass_storage, hass_ws_client)
    manager: SmartPlantsManager = entry.runtime_data.manager
    assert len(manager.snapshot.plants) == PLANTS

    listeners = _registry_listeners(hass) - baseline
    controllers = _controllers(manager)

    listed, list_bytes, list_seconds = await _plants_reply(
        client, "smart_plants/plants/list"
    )
    overview, overview_bytes, overview_seconds = await _plants_reply(
        client, "smart_plants/plants/overview"
    )

    evaluate = ReadingTracker._evaluate
    evaluations = 0

    def _counting(self: ReadingTracker, task_id: str, now: datetime) -> bool:
        nonlocal evaluations
        evaluations += 1
        return evaluate(self, task_id, now)

    until = datetime.now(UTC) + timedelta(days=7)
    change = snooze_change(until)
    with patch.object(ReadingTracker, "_evaluate", _counting):
        write_started = time.perf_counter()
        await manager.async_apply_plant_changes(
            [(plant_id, change) for plant_id in manager.snapshot.plants]
        )
        await hass.async_block_till_done()
        write_seconds = time.perf_counter() - write_started

    print(  # noqa: T201
        f"\nplants={PLANTS} registry_listeners={listeners} controllers={controllers}"
        f"\nlist_bytes={list_bytes} ({list_seconds * 1000:.0f} ms round trip)"
        f"\noverview_bytes={overview_bytes}"
        f" ({overview_seconds * 1000:.0f} ms round trip)"
        f"\nbulk_snooze_evaluations={evaluations} ({write_seconds * 1000:.0f} ms)"
    )

    # Every plant is snoozed with one save, and every snoozed plant's reading
    # task is evaluated once.
    assert all(plant.snoozed_until for plant in manager.snapshot.plants.values())
    assert evaluations == PLANTS
    # The registry listeners do not grow with the plants: all source trackers
    # share one, next to the integration's other three (the manager's rename
    # handling and the All plants sensor among them). There was one per
    # controller before.
    assert listeners == 4
    # Only the roles with a sensor have a controller.
    assert controllers == 2 * PLANTS
    # The list leaves the care history to the plant page (it was 1.75 MB);
    # the overview keeps the last watering.
    assert all("care_events" not in plant for plant in listed)
    assert list_bytes < 3_000 * PLANTS
    assert all(entry["last_watered_at"] for entry in overview)
    assert overview_bytes < 1_200 * PLANTS
