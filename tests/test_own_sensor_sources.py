"""
Smart Plants' own entities are never new sources.

A plant's sensors are computed from the sensors assigned to its readings. One
of them as a source would make a plant read its own output, or copy another
plant's computed value instead of using the sensor behind it. The manager
refuses them wherever a source is assigned: the source commands, plant
creation and the Repairs replacement. A source stored before keeps working
until the user replaces it, so saving other changes never fails because of it.
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
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import (
    IlluminanceConfig,
    MoistureConfig,
    PlantRecord,
    SensorSource,
)
from custom_components.smart_plants.repairs import _issue_id
from custom_components.smart_plants.roles import require_role
from custom_components.smart_plants.websocket_api import ERR_INVALID_FORMAT
from homeassistant.components.repairs import repairs_flow_manager
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import InvalidData
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from .test_main_sensor import SOURCE_ROLES
from .test_websocket_api import _setup
from .test_wizard import _credentials, _moisture

_REFUSED = "must not be a Smart Plants entity"


@pytest.fixture
async def manager(hass: HomeAssistant) -> AsyncIterator[SmartPlantsManager]:
    loaded = SmartPlantsManager(hass)
    await loaded.async_load()
    yield loaded
    await loaded.async_unload()


def _own_sensor(hass: HomeAssistant, role: str) -> er.RegistryEntry:
    """Register another plant's Smart Plants sensor for ``role``."""
    return er.async_get(hass).async_get_or_create(
        "sensor",
        DOMAIN,
        f"{DOMAIN}:other-plant:{role}",
        suggested_object_id=f"mock_office_aloe_{role}",
    )


def _plant_sensor(hass: HomeAssistant, plant_id: str, role: str) -> str:
    entity_id = er.async_get(hass).async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant_id}:{role}"
    )
    assert entity_id is not None
    return entity_id


def _entity_ids(manager: SmartPlantsManager, plant_id: str, role: str) -> list[str]:
    config = require_role(role).config_for(manager.get_plant(plant_id))
    assert config is not None
    return [source.entity_id for source in config.sources]


@pytest.mark.parametrize("role", SOURCE_ROLES)
async def test_own_sensor_is_refused_as_a_source(
    hass: HomeAssistant, manager: SmartPlantsManager, role: str
) -> None:
    own = _own_sensor(hass, role)
    plant = await manager.async_create_plant(name="Aloe")
    for source in (
        {"entity_id": own.entity_id},
        {"entity_id": own.entity_id, "registry_id": own.id},
    ):
        with pytest.raises(SmartPlantsValidationError, match=_REFUSED):
            await manager.async_set_role_sources(
                plant.id,
                role=role,
                expected_revision=plant.revision,
                sources=[{"entity_id": "sensor.mock_a"}, source],
            )
    assert manager.get_plant(plant.id) == plant


async def test_moisture_configuration_refuses_own_sensor(
    hass: HomeAssistant, manager: SmartPlantsManager
) -> None:
    own = _own_sensor(hass, "moisture")
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError, match=_REFUSED):
        await manager.async_configure_moisture(
            plant.id,
            expected_revision=plant.revision,
            moisture=_moisture(
                sources=[
                    {"entity_id": "sensor.mock_soil"},
                    {"entity_id": own.entity_id},
                ]
            ),
        )
    assert manager.get_plant(plant.id) == plant


async def test_plant_cannot_read_its_own_or_another_plants_sensor(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    aloe = await manager.async_create_plant(name="Aloe")
    office_aloe = await manager.async_create_plant(name="Office Aloe")
    await hass.async_block_till_done()
    own = _plant_sensor(hass, aloe.id, "moisture")

    client = await hass_ws_client(hass)
    for plant in (aloe, office_aloe):
        await client.send_json_auto_id(
            {
                "type": "smart_plants/roles/set_sources",
                "plant_id": plant.id,
                "expected_revision": plant.revision,
                "role": "moisture",
                "sources": [{"entity_id": own}],
            }
        )
        response = await client.receive_json()
        assert response["success"] is False
        assert response["error"]["code"] == ERR_INVALID_FORMAT
        assert manager.get_plant(plant.id).moisture.sources == ()


@pytest.mark.parametrize("field", ["moisture", "roles"])
async def test_new_plant_refuses_own_sensor(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, field: str
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    own = _own_sensor(hass, "moisture" if field == "moisture" else "illuminance")
    soil = own.entity_id if field == "moisture" else "sensor.mock_soil"
    light = own.entity_id if field == "roles" else "sensor.mock_light"
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/wizard/create",
            **_credentials(manager.wizard_start()),
            "confirmed": True,
            "name": "Aloe",
            "moisture": _moisture(sources=[{"entity_id": soil}]),
            "roles": {"illuminance": {"sources": [{"entity_id": light}]}},
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_INVALID_FORMAT
    assert not manager.snapshot.plants


async def test_stored_own_sensor_keeps_working_until_replaced(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    soil = _own_sensor(hass, "moisture")
    light = _own_sensor(hass, "illuminance")
    plant = PlantRecord(
        id="p",
        revision=1,
        name="Aloe",
        created_at="2026-01-01T00:00:00Z",
        moisture=MoistureConfig(
            sources=(SensorSource(soil.entity_id, soil.id),),
            primary_entity_id=soil.entity_id,
        ),
    ).with_role_config(
        "illuminance",
        IlluminanceConfig(
            sources=(SensorSource(light.entity_id, light.id),),
            primary_entity_id=light.entity_id,
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
        # Saving other changes sends the stored sensor back unchanged.
        updated = await manager.async_configure_moisture(
            "p",
            expected_revision=1,
            moisture=_moisture(
                sources=[{"entity_id": soil.entity_id, "registry_id": soil.id}],
                primary_entity_id=soil.entity_id,
                stale_after_seconds=7200,
            ),
        )
        assert updated.moisture.stale_after_seconds == 7200
        assert _entity_ids(manager, "p", "moisture") == [soil.entity_id]

        updated = await manager.async_set_role_sources(
            "p",
            role="illuminance",
            expected_revision=updated.revision,
            sources=[
                {"entity_id": light.entity_id, "registry_id": light.id},
                {"entity_id": "sensor.mock_light"},
            ],
        )
        assert _entity_ids(manager, "p", "illuminance") == [
            light.entity_id,
            "sensor.mock_light",
        ]

        # Once replaced, it can't be added again.
        updated = await manager.async_set_role_sources(
            "p",
            role="illuminance",
            expected_revision=updated.revision,
            sources=[{"entity_id": "sensor.mock_light"}],
        )
        with pytest.raises(SmartPlantsValidationError, match=_REFUSED):
            await manager.async_set_role_sources(
                "p",
                role="illuminance",
                expected_revision=updated.revision,
                sources=[
                    {"entity_id": "sensor.mock_light"},
                    {"entity_id": light.entity_id},
                ],
            )
    finally:
        await manager.async_unload()


async def test_repair_replacement_leaves_out_own_sensors(hass: HomeAssistant) -> None:
    registry = er.async_get(hass)
    missing = registry.async_get_or_create(
        "sensor", "example", "missing", suggested_object_id="mock_missing"
    )
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": missing.entity_id, "registry_id": missing.id}],
    )
    registry.async_remove(missing.entity_id)
    await hass.async_block_till_done()
    own = _plant_sensor(hass, plant.id, "moisture")

    flow_manager = repairs_flow_manager(hass)
    assert flow_manager is not None
    form = await flow_manager.async_init(
        DOMAIN, data={"issue_id": _issue_id(plant.id, missing.entity_id)}
    )
    schema = form["data_schema"]
    assert schema is not None
    (picker,) = schema.schema.values()
    assert own in picker.config["exclude_entities"]
    assert all(
        entity_id.startswith("sensor.")
        for entity_id in picker.config["exclude_entities"]
    )

    # Home Assistant refuses an excluded entity before the flow sees it.
    with pytest.raises(InvalidData):
        await flow_manager.async_configure(
            form["flow_id"], {"replacement_entity_id": own}
        )
    # One registered after the form opened reaches the manager, which refuses it.
    late = _own_sensor(hass, "moisture")
    result = await flow_manager.async_configure(
        form["flow_id"], {"replacement_entity_id": late.entity_id}
    )
    assert result["type"] == "form"
    assert result["errors"] == {"base": "invalid_source"}
    assert manager.get_plant(plant.id).moisture.sources[0].registry_id == missing.id
