"""WebSocket tests for ``smart_plants/plants/overview``."""

from __future__ import annotations

import io
from datetime import UTC, datetime, timedelta
from typing import Any

from custom_components.smart_plants.const import DOMAIN
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import (
    DEFAULT_MOISTURE_MAX,
    DEFAULT_MOISTURE_MIN,
    DEFAULT_MOISTURE_TARGET,
    LOW_BATTERY_BUILTIN_DEFAULTS,
    TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
)
from homeassistant.const import PERCENTAGE, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from PIL import Image
from pytest_homeassistant_custom_component.typing import (
    MockHAClientWebSocket,
    WebSocketGenerator,
)

from .test_websocket_api import _connect, _setup
from .test_wizard import ThresholdProvider, _credentials, _moisture

_PERCENT = {"unit_of_measurement": PERCENTAGE}
_CELSIUS = {"unit_of_measurement": UnitOfTemperature.CELSIUS}


async def _overview(hass: HomeAssistant, ws: WebSocketGenerator) -> dict[str, Any]:
    client = await ws(hass)
    await client.send_json_auto_id({"type": "smart_plants/plants/overview"})
    response: dict[str, Any] = await client.receive_json()
    return response


async def _plants(hass: HomeAssistant, ws: WebSocketGenerator) -> dict[str, Any]:
    response = await _overview(hass, ws)
    assert response["success"], response
    return {plant["plant_id"]: plant for plant in response["result"]["plants"]}


async def _client_plants(client: MockHAClientWebSocket) -> dict[str, Any]:
    await client.send_json_auto_id({"type": "smart_plants/plants/overview"})
    response: dict[str, Any] = await client.receive_json()
    assert response["success"], response
    return {plant["plant_id"]: plant for plant in response["result"]["plants"]}


async def _assign(
    manager: SmartPlantsManager,
    plant_id: str,
    role: str,
    entity_id: str,
    *,
    primary: bool = False,
) -> None:
    plant = await manager.async_set_role_sources(
        plant_id,
        role=role,
        expected_revision=manager.get_plant(plant_id).revision,
        sources=[{"entity_id": entity_id}],
    )
    if primary:
        await manager.async_set_role_primary(
            plant_id,
            role=role,
            expected_revision=plant.revision,
            primary_entity_id=entity_id,
        )


def _binary_state(hass: HomeAssistant, plant_id: str, role: str) -> str:
    entity_id = er.async_get(hass).async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant_id}:{role}"
    )
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    return state.state


async def test_overview_requires_admin(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await client.send_json_auto_id({"type": "smart_plants/plants/overview"})
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "unauthorized"


async def test_overview_reports_not_loaded(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    response = await _overview(hass, hass_ws_client)
    assert response["success"] is False
    assert response["error"]["code"] == "integration_not_loaded"


async def test_overview_empty(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    await _setup(hass)
    response = await _overview(hass, hass_ws_client)
    assert response["result"] == {"plants": []}


async def test_overview_plant_without_sensors(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    plant = await entry.runtime_data.manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    assert await _plants(hass, hass_ws_client) == {
        plant.id: {
            "plant_id": plant.id,
            "revision": plant.revision,
            "lifecycle_state": "active",
            "status": "no_sensors",
            "problems": [{"role": "moisture", "kind": "no_sensors"}],
            "roles": {},
            "last_watered_at": None,
            "image": None,
            "care": [],
            "rest_period": None,
            "resting": False,
            "snoozed_until": None,
        }
    }


async def test_overview_plant_with_several_roles_matches_entities(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    hass.states.async_set("sensor.mock_soil", "45", _PERCENT)
    hass.states.async_set("sensor.mock_air", "5", _CELSIUS)
    hass.states.async_set("sensor.mock_battery", "3", _PERCENT)
    plant = await manager.async_create_plant(name="Office Aloe")
    await _assign(manager, plant.id, "moisture", "sensor.mock_soil", primary=True)
    await _assign(manager, plant.id, "temperature", "sensor.mock_air")
    await _assign(manager, plant.id, "battery", "sensor.mock_battery")
    await hass.async_block_till_done()

    overview = (await _plants(hass, hass_ws_client))[plant.id]
    assert overview["revision"] == manager.get_plant(plant.id).revision
    assert overview["status"] == "problem"
    assert overview["problems"] == [
        {"role": "temperature", "kind": "too_cold"},
        {"role": "battery", "kind": "battery_low"},
    ]
    assert set(overview["roles"]) == {"moisture", "temperature", "battery"}

    moisture = overview["roles"]["moisture"]
    assert moisture["value"] == 45.0
    assert moisture["unit"] == PERCENTAGE
    assert moisture["state"] == "ok"
    assert moisture["range"] == {
        "min": DEFAULT_MOISTURE_MIN,
        "target": DEFAULT_MOISTURE_TARGET,
        "max": DEFAULT_MOISTURE_MAX,
    }
    assert moisture["sources"] == ["sensor.mock_soil"]
    soil_state = hass.states.get("sensor.mock_soil")
    assert soil_state is not None
    assert datetime.fromisoformat(moisture["last_reported"]) == soil_state.last_reported

    temperature = overview["roles"]["temperature"]
    assert temperature["value"] == 5.0
    assert temperature["unit"] == UnitOfTemperature.CELSIUS
    assert temperature["state"] == "low"
    assert temperature["range"] == {
        "min": TEMPERATURE_STRESS_BUILTIN_DEFAULTS["cold_threshold_celsius"],
        "target": None,
        "max": TEMPERATURE_STRESS_BUILTIN_DEFAULTS["hot_threshold_celsius"],
    }
    assert temperature["sources"] == ["sensor.mock_air"]

    battery = overview["roles"]["battery"]
    assert battery["state"] == "low"
    assert battery["range"] == {
        "min": LOW_BATTERY_BUILTIN_DEFAULTS["threshold_percent"],
        "target": None,
        "max": None,
    }

    # The overview reads the same evaluations as the problem entities.
    assert _binary_state(hass, plant.id, "needs_water") == "off"
    assert _binary_state(hass, plant.id, "temperature_stress") == "on"
    assert _binary_state(hass, plant.id, "low_battery") == "on"


async def test_overview_needs_water_and_stale_follow_entities(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    hass.states.async_set("sensor.mock_soil", "10", _PERCENT)
    plant = await manager.async_create_plant(name="Aloe")
    await _assign(manager, plant.id, "moisture", "sensor.mock_soil", primary=True)
    await hass.async_block_till_done()
    overview = (await _plants(hass, hass_ws_client))[plant.id]
    assert overview["status"] == "needs_water"
    assert overview["problems"] == [{"role": "moisture", "kind": "needs_water"}]
    assert overview["roles"]["moisture"]["state"] == "low"
    assert _binary_state(hass, plant.id, "needs_water") == "on"

    hass.states.async_set("sensor.mock_soil", "unavailable", _PERCENT)
    await hass.async_block_till_done()
    overview = (await _plants(hass, hass_ws_client))[plant.id]
    assert overview["status"] == "stale"
    assert overview["problems"] == [{"role": "moisture", "kind": "unavailable"}]
    assert overview["roles"]["moisture"]["value"] is None
    assert overview["roles"]["moisture"]["state"] == "unavailable"
    assert _binary_state(hass, plant.id, "needs_water") == "unavailable"


async def test_overview_ranges_follow_species_values_and_overrides(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    service = entry.runtime_data.provider_service
    service._registry.register(ThresholdProvider())
    hass.states.async_set("sensor.mock_soil", "60", _PERCENT)
    hass.states.async_set("sensor.mock_air", "20", _CELSIUS)
    draft = manager.wizard_start()
    preview = await service.async_wizard_preview(
        **_credentials(draft), provider="synthetic", provider_ref="test", locale="en"
    )
    plant = await service.async_wizard_create(
        **_credentials(draft),
        confirmed=True,
        name="Aloe",
        moisture=_moisture(
            sources=[{"entity_id": "sensor.mock_soil"}],
            primary_entity_id="sensor.mock_soil",
            threshold_overrides={"min": None, "target": 60, "max": None},
        ),
        accepted_preview={
            "preview_token": preview.token,
            "provider": preview.provider,
            "operation": preview.operation,
        },
        roles={"temperature": {"sources": [{"entity_id": "sensor.mock_air"}]}},
    )
    await hass.async_block_till_done()
    overview = (await _plants(hass, hass_ws_client))[plant.id]
    # Species values replace the built-in min and max; target is overridden.
    assert overview["roles"]["moisture"]["range"] == {
        "min": 40,
        "target": 60,
        "max": 80,
    }

    plant = await manager.async_set_moisture_thresholds(
        plant.id,
        expected_revision=plant.revision,
        moisture_min=None,
        moisture_target=65,
        moisture_max=None,
    )
    plant = await manager.async_set_role_threshold_overrides(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        values={
            "cold_threshold_celsius": 5.0,
            "cold_clear_celsius": 7.0,
            "hot_threshold_celsius": None,
            "hot_clear_celsius": None,
        },
    )
    await hass.async_block_till_done()
    overview = (await _plants(hass, hass_ws_client))[plant.id]
    assert overview["revision"] == plant.revision
    assert overview["roles"]["moisture"]["range"] == {
        "min": 40,
        "target": 65,
        "max": 80,
    }
    assert overview["roles"]["temperature"]["range"] == {
        "min": 5.0,
        "target": None,
        "max": TEMPERATURE_STRESS_BUILTIN_DEFAULTS["hot_threshold_celsius"],
    }
    assert overview["status"] == "healthy"
    assert overview["problems"] == []


async def test_overview_last_watered_and_image(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    other = await manager.async_create_plant(name="Office Aloe")
    occurred = (
        (datetime.now(UTC) - timedelta(days=1)).replace(microsecond=0).isoformat()
    )
    plant, _event = await manager.async_add_watering(
        plant.id, expected_revision=plant.revision, occurred_at=occurred, note=None
    )
    buffer = io.BytesIO()
    Image.new("RGB", (16, 12), (30, 120, 60)).save(buffer, format="JPEG")
    plant = await manager.async_upsert_image(
        plant.id,
        expected_revision=plant.revision,
        raw_bytes=buffer.getvalue(),
        declared_content_type="image/jpeg",
    )
    assert plant.image is not None
    await hass.async_block_till_done()

    plants = await _plants(hass, hass_ws_client)
    assert plants[plant.id]["last_watered_at"] == occurred
    assert plants[plant.id]["image"] == {"id": plant.image.id}
    assert plants[other.id]["last_watered_at"] is None
    assert plants[other.id]["image"] is None


async def test_overview_paused_plant(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    hass.states.async_set("sensor.mock_soil", "10", _PERCENT)
    plant = await manager.async_create_plant(name="Aloe")
    await _assign(manager, plant.id, "moisture", "sensor.mock_soil", primary=True)
    plant = await manager.async_disable_plant(
        plant.id, expected_revision=manager.get_plant(plant.id).revision
    )
    await hass.async_block_till_done()
    overview = (await _plants(hass, hass_ws_client))[plant.id]
    assert overview["lifecycle_state"] == "disabled"
    assert overview["status"] == "paused"
    assert overview["problems"] == []
    moisture = overview["roles"]["moisture"]
    assert moisture["value"] is None
    assert moisture["state"] == "unavailable"
    assert moisture["sources"] == ["sensor.mock_soil"]
    assert _binary_state(hass, plant.id, "needs_water") == "unavailable"


async def test_overview_payload_has_no_provider_data(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    await entry.runtime_data.manager.async_create_plant(name="Aloe")
    response = await _overview(hass, hass_ws_client)
    (plant,) = response["result"]["plants"]
    assert set(plant) == {
        "plant_id",
        "revision",
        "lifecycle_state",
        "status",
        "problems",
        "roles",
        "last_watered_at",
        "image",
        "care",
        "rest_period",
        "resting",
        "snoozed_until",
    }


async def test_overview_care_order_and_statuses(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    # Connect before moving the clock: the client's access token is issued at
    # the real time and would not be valid at the frozen date.
    client = await _connect(hass, hass_ws_client)
    # 22:30 UTC on June 14 is already June 15 in Berlin; the overview must use
    # the Home Assistant time zone's date.
    await hass.config.async_set_time_zone("Europe/Berlin")
    freezer.move_to("2026-06-14T22:30:00+00:00")
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")

    async def create(
        task_type: str, schedule: dict[str, Any], baseline: str | None
    ) -> str:
        nonlocal plant
        plant, task = await manager.async_create_care_task(
            plant.id,
            expected_revision=plant.revision,
            task_type=task_type,
            name="Mist leaves" if task_type == "custom" else None,
            schedule=schedule,
            instructions=None,
            baseline_done_on=baseline,
        )
        return task.id

    def interval(every: int, unit: str, *, growing: bool = False) -> dict[str, Any]:
        return {
            "kind": "interval",
            "every": every,
            "unit": unit,
            "growing_season_only": growing,
        }

    # Created in an order different from the expected result.
    repot = await create(
        "repot", {"kind": "yearly", "start_month": 3, "end_month": 4}, None
    )
    pests = await create("pests", interval(1, "weeks", growing=True), "2026-06-01")
    prune = await create("prune", interval(1, "months"), "2026-06-10")
    mist = await create("custom", interval(2, "days"), "2026-06-13")
    feed = await create("fertilize", interval(1, "weeks"), "2026-06-01")
    plant = await manager.async_set_rest_period(
        plant.id,
        expected_revision=plant.revision,
        rest_period={"start_month": 6, "end_month": 8},
    )
    await hass.async_block_till_done()

    overview = (await _client_plants(client))[plant.id]
    assert overview["rest_period"] == {"start_month": 6, "end_month": 8}
    assert overview["resting"] is True
    assert overview["care"] == [
        {
            "task_id": feed,
            "type": "fertilize",
            "name": None,
            "status": "overdue",
            "is_due": True,
            "next_due": "2026-06-08",
            "days": 7,
            "window_end": None,
            "resume_on": None,
        },
        {
            "task_id": mist,
            "type": "custom",
            "name": "Mist leaves",
            "status": "due",
            "is_due": True,
            "next_due": "2026-06-15",
            "days": None,
            "window_end": None,
            "resume_on": None,
        },
        {
            "task_id": prune,
            "type": "prune",
            "name": None,
            "status": "scheduled",
            "is_due": False,
            "next_due": "2026-07-10",
            "days": 25,
            "window_end": None,
            "resume_on": None,
        },
        {
            "task_id": pests,
            "type": "pests",
            "name": None,
            "status": "resting",
            "is_due": False,
            "next_due": "2026-09-01",
            "days": None,
            "window_end": None,
            "resume_on": "2026-09-01",
        },
        {
            "task_id": repot,
            "type": "repot",
            "name": None,
            "status": "scheduled",
            "is_due": False,
            "next_due": "2027-03-01",
            "days": 259,
            "window_end": "2027-04-30",
            "resume_on": None,
        },
    ]

    # Completing the overdue task moves it behind the due one.
    plant, _event = await manager.async_complete_care_task(
        plant.id, feed, expected_revision=plant.revision
    )
    care = (await _client_plants(client))[plant.id]["care"]
    assert [item["task_id"] for item in care] == [mist, feed, prune, pests, repot]
    assert care[1]["status"] == "scheduled"
    assert care[1]["next_due"] == "2026-06-22"
    assert care[1]["days"] == 7


async def test_overview_without_rest_period_is_not_resting(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    client = await _connect(hass, hass_ws_client)
    await hass.config.async_set_time_zone("UTC")
    freezer.move_to("2026-01-15T12:00:00+00:00")
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    plant = await manager.async_set_rest_period(
        plant.id,
        expected_revision=plant.revision,
        rest_period={"start_month": 11, "end_month": 2},
    )
    overview = (await _client_plants(client))[plant.id]
    assert overview["resting"] is True
    freezer.move_to("2026-03-01T12:00:00+00:00")
    overview = (await _client_plants(client))[plant.id]
    assert overview["rest_period"] == {"start_month": 11, "end_month": 2}
    assert overview["resting"] is False
