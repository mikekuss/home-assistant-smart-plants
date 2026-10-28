"""
A reading with one sensor uses it as its main sensor.

"Main sensor only" is the default way to combine readings for soil moisture,
light, conductivity and soil temperature, and it gives no value while no main
sensor is chosen. Every change that leaves a role with exactly one sensor and
no main sensor therefore makes that sensor the main sensor. With several
sensors the main sensor is never chosen or replaced automatically.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import pytest
from custom_components.smart_plants.const import (
    DOMAIN,
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.illuminance_evaluator import LIGHT_LUX
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import (
    IlluminanceConfig,
    MoistureConfig,
    PlantRecord,
    SensorSource,
    TemperatureConfig,
)
from custom_components.smart_plants.repairs import _issue_id
from custom_components.smart_plants.roles import require_role
from homeassistant.components.repairs import repairs_flow_manager
from homeassistant.const import PERCENTAGE
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from .test_plants_overview import _plants
from .test_websocket_api import _setup
from .test_wizard import _credentials, _moisture

SOURCE_ROLES = (
    "moisture",
    "temperature",
    "humidity",
    "illuminance",
    "battery",
    "conductivity",
    "soil_temperature",
    "co2",
)
_PERCENT = {"unit_of_measurement": PERCENTAGE}


@pytest.fixture
async def manager(hass: HomeAssistant) -> AsyncIterator[SmartPlantsManager]:
    loaded = SmartPlantsManager(hass)
    await loaded.async_load()
    yield loaded
    await loaded.async_unload()


def _main_sensor(manager: SmartPlantsManager, plant_id: str, role: str) -> Any:
    config = require_role(role).config_for(manager.get_plant(plant_id))
    assert config is not None
    return config.primary_entity_id


async def _set_sources(
    manager: SmartPlantsManager, plant_id: str, role: str, *entity_ids: str
) -> None:
    await manager.async_set_role_sources(
        plant_id,
        role=role,
        expected_revision=manager.get_plant(plant_id).revision,
        sources=[{"entity_id": entity_id} for entity_id in entity_ids],
    )


async def _set_main_sensor(
    manager: SmartPlantsManager, plant_id: str, role: str, entity_id: str | None
) -> None:
    await manager.async_set_role_primary(
        plant_id,
        role=role,
        expected_revision=manager.get_plant(plant_id).revision,
        primary_entity_id=entity_id,
    )


@pytest.mark.parametrize("role", SOURCE_ROLES)
async def test_first_sensor_becomes_main_sensor(
    manager: SmartPlantsManager, role: str
) -> None:
    plant = await manager.async_create_plant(name="Aloe")
    await _set_sources(manager, plant.id, role, "sensor.mock_a")
    assert _main_sensor(manager, plant.id, role) == "sensor.mock_a"


@pytest.mark.parametrize("role", SOURCE_ROLES)
async def test_replacing_the_only_sensor_makes_the_new_one_main(
    manager: SmartPlantsManager, role: str
) -> None:
    plant = await manager.async_create_plant(name="Aloe")
    await _set_sources(manager, plant.id, role, "sensor.mock_a")
    await _set_sources(manager, plant.id, role, "sensor.mock_b")
    assert _main_sensor(manager, plant.id, role) == "sensor.mock_b"


@pytest.mark.parametrize("role", SOURCE_ROLES)
async def test_sensor_left_alone_becomes_main_sensor(
    manager: SmartPlantsManager, role: str
) -> None:
    plant = await manager.async_create_plant(name="Aloe")
    await _set_sources(manager, plant.id, role, "sensor.mock_a", "sensor.mock_b")
    await _set_main_sensor(manager, plant.id, role, "sensor.mock_a")
    await _set_sources(manager, plant.id, role, "sensor.mock_b")
    assert _main_sensor(manager, plant.id, role) == "sensor.mock_b"


async def test_several_sensors_never_get_a_main_sensor_automatically(
    manager: SmartPlantsManager,
) -> None:
    plant = await manager.async_create_plant(name="Aloe")
    await _set_sources(manager, plant.id, "moisture", "sensor.mock_a", "sensor.mock_b")
    assert _main_sensor(manager, plant.id, "moisture") is None

    await _set_sources(manager, plant.id, "moisture", "sensor.mock_a")
    await _set_sources(manager, plant.id, "moisture", "sensor.mock_a", "sensor.mock_b")
    # Adding a second sensor keeps the first one as the main sensor.
    assert _main_sensor(manager, plant.id, "moisture") == "sensor.mock_a"

    await _set_sources(
        manager, plant.id, "moisture", "sensor.mock_a", "sensor.mock_b", "sensor.mock_c"
    )
    await _set_sources(manager, plant.id, "moisture", "sensor.mock_b", "sensor.mock_c")
    # Removing the main sensor of three never picks one of the other two.
    assert _main_sensor(manager, plant.id, "moisture") is None


async def test_clearing_the_main_sensor_of_a_single_sensor_keeps_it(
    manager: SmartPlantsManager,
) -> None:
    plant = await manager.async_create_plant(name="Aloe")
    await _set_sources(manager, plant.id, "illuminance", "sensor.mock_a")
    revision = manager.get_plant(plant.id).revision
    await _set_main_sensor(manager, plant.id, "illuminance", None)
    assert _main_sensor(manager, plant.id, "illuminance") == "sensor.mock_a"
    assert manager.get_plant(plant.id).revision == revision


async def test_moisture_configuration_with_one_sensor_gets_a_main_sensor(
    manager: SmartPlantsManager,
) -> None:
    plant = await manager.async_create_plant(name="Aloe")
    updated = await manager.async_configure_moisture(
        plant.id,
        expected_revision=plant.revision,
        moisture=_moisture(sources=[{"entity_id": "sensor.mock_a"}]),
    )
    assert updated.moisture.primary_entity_id == "sensor.mock_a"

    updated = await manager.async_configure_moisture(
        plant.id,
        expected_revision=updated.revision,
        moisture=_moisture(
            sources=[{"entity_id": "sensor.mock_a"}, {"entity_id": "sensor.mock_b"}],
            primary_entity_id=None,
        ),
    )
    assert updated.moisture.primary_entity_id is None


async def test_wizard_role_with_one_sensor_gets_a_main_sensor(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    draft = manager.wizard_start()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/wizard/create",
            **_credentials(draft),
            "confirmed": True,
            "name": "Aloe",
            "moisture": _moisture(sources=[{"entity_id": "sensor.mock_soil"}]),
            "roles": {
                "illuminance": {"sources": [{"entity_id": "sensor.mock_light"}]},
                "temperature": {
                    "sources": [
                        {"entity_id": "sensor.mock_air"},
                        {"entity_id": "sensor.mock_window"},
                    ]
                },
            },
        }
    )
    response = await client.receive_json()
    assert response["success"], response
    plant_id = response["result"]["plant"]["id"]
    assert _main_sensor(manager, plant_id, "moisture") == "sensor.mock_soil"
    assert _main_sensor(manager, plant_id, "illuminance") == "sensor.mock_light"
    assert _main_sensor(manager, plant_id, "temperature") is None


async def test_repair_that_leaves_one_sensor_makes_it_main(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    missing = registry.async_get_or_create(
        "sensor", "example", "missing", suggested_object_id="mock_missing"
    )
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    plant = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[
            {"entity_id": missing.entity_id, "registry_id": missing.id},
            {"entity_id": "sensor.mock_soil"},
        ],
    )
    await _set_main_sensor(manager, plant.id, "moisture", missing.entity_id)
    registry.async_remove(missing.entity_id)
    await hass.async_block_till_done()

    flow_manager = repairs_flow_manager(hass)
    assert flow_manager is not None
    form = await flow_manager.async_init(
        DOMAIN, data={"issue_id": _issue_id(plant.id, missing.entity_id)}
    )
    # Submitting without a replacement removes the missing sensor.
    result = await flow_manager.async_configure(form["flow_id"], {})
    assert result["type"] == "create_entry"
    assert _main_sensor(manager, plant.id, "moisture") == "sensor.mock_soil"


async def test_startup_repairs_a_stored_single_sensor_without_main_sensor(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    plant = PlantRecord(
        id="p",
        revision=4,
        name="Aloe",
        created_at="2026-01-01T00:00:00Z",
        moisture=MoistureConfig(sources=(SensorSource("sensor.mock_soil"),)),
    )
    plant = plant.with_role_config(
        "illuminance", IlluminanceConfig(sources=(SensorSource("sensor.mock_light"),))
    ).with_role_config(
        "temperature",
        TemperatureConfig(
            sources=(
                SensorSource("sensor.mock_air"),
                SensorSource("sensor.mock_window"),
            )
        ),
    )
    hass_storage[STORAGE_KEY] = {
        "key": STORAGE_KEY,
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": STORAGE_MINOR_VERSION,
        "data": {
            "revision": 1,
            "plants": [plant.as_storage()],
            "pending_operations": [],
            "tombstones": [],
        },
    }
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    try:
        assert _main_sensor(manager, "p", "moisture") == "sensor.mock_soil"
        assert _main_sensor(manager, "p", "illuminance") == "sensor.mock_light"
        # Several sensors keep their missing main sensor.
        assert _main_sensor(manager, "p", "temperature") is None
        assert manager.get_plant("p").revision == 5
        stored = hass_storage[STORAGE_KEY]["data"]["plants"][0]
        assert stored["roles"]["moisture"]["primary_entity_id"] == "sensor.mock_soil"
        assert stored["roles"]["illuminance"]["primary_entity_id"] == (
            "sensor.mock_light"
        )
    finally:
        await manager.async_unload()

    restarted = SmartPlantsManager(hass)
    await restarted.async_load()
    try:
        # A repaired store is left alone on the next start.
        assert restarted.get_plant("p").revision == 5
    finally:
        await restarted.async_unload()


async def test_first_light_sensor_reports_its_value(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    hass.states.async_set(
        "sensor.mock_light", "1121", {"unit_of_measurement": LIGHT_LUX}
    )
    plant = await manager.async_create_plant(name="Office Aloe")
    await _set_sources(manager, plant.id, "illuminance", "sensor.mock_light")
    await hass.async_block_till_done()

    light = (await _plants(hass, hass_ws_client))[plant.id]["roles"]["illuminance"]
    assert light["value"] == 1121
    assert light["state"] == "ok"


async def test_overview_names_a_missing_main_sensor(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    hass.states.async_set("sensor.mock_a", "40", _PERCENT)
    hass.states.async_set("sensor.mock_b", "42", _PERCENT)
    plant = await manager.async_create_plant(name="Office Aloe")
    await _set_sources(manager, plant.id, "moisture", "sensor.mock_a", "sensor.mock_b")
    await hass.async_block_till_done()

    overview = (await _plants(hass, hass_ws_client))[plant.id]
    # Both sensors report; the reading only lacks its main sensor.
    assert overview["status"] == "stale"
    assert overview["problems"] == [{"role": "moisture", "kind": "no_main_sensor"}]
    assert overview["roles"]["moisture"]["state"] == "unavailable"


async def test_replacing_the_only_moisture_sensor_keeps_a_value(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    hass.states.async_set("sensor.mock_old_soil", "40", _PERCENT)
    hass.states.async_set("sensor.mock_new_soil", "30", _PERCENT)
    plant = await manager.async_create_plant(name="Office Aloe")
    plant = await manager.async_configure_moisture(
        plant.id,
        expected_revision=plant.revision,
        moisture=_moisture(
            sources=[{"entity_id": "sensor.mock_old_soil"}],
            primary_entity_id="sensor.mock_old_soil",
        ),
    )
    # The panel's soil moisture editor sends the whole configuration: the old
    # sensor removed (which clears the main sensor) and the new one added.
    plant = await manager.async_configure_moisture(
        plant.id,
        expected_revision=plant.revision,
        moisture=_moisture(
            sources=[{"entity_id": "sensor.mock_new_soil"}], primary_entity_id=None
        ),
    )
    assert plant.moisture.primary_entity_id == "sensor.mock_new_soil"
    await hass.async_block_till_done()

    overview = (await _plants(hass, hass_ws_client))[plant.id]
    assert overview["status"] == "healthy"
    assert overview["roles"]["moisture"]["value"] == 30
