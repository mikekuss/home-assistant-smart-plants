"""
Default "Not updating after" windows and the migration of the old default.

MQTT and Zigbee2MQTT sensors send nothing to Home Assistant while their value
stays the same, so a steady reading gets no state report. The defaults must
leave room for that: 24 hours for every reading and 7 days for the battery.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any, cast

import pytest
from custom_components.smart_plants.const import (
    DOMAIN,
    SINGLETON_UNIQUE_ID,
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import (
    DEFAULT_BATTERY_STALE_AFTER_SECONDS,
    DEFAULT_STALE_AFTER_SECONDS,
    MAX_STALE_AFTER_SECONDS,
    BatteryConfig,
    MoistureConfig,
    PlantRecord,
)
from custom_components.smart_plants.roles import role_definitions
from custom_components.smart_plants.storage import (
    SmartPlantsStore,
    SmartPlantsUnsupportedStorageError,
)
from homeassistant.const import PERCENTAGE, STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from .test_wizard import _credentials, _moisture

HOUR = 3600
DAY = 24 * HOUR
OLD_DEFAULT = 6 * HOUR
MOISTURE = {"unit_of_measurement": "%", "device_class": "moisture"}
BATTERY = {"unit_of_measurement": PERCENTAGE, "device_class": "battery"}


def _stale_roles() -> list[str]:
    return [d.key for d in role_definitions() if d.replace_stale_after is not None]


def _expected_default(role: str) -> int:
    return 7 * DAY if role == "battery" else DAY


# --- Defaults ---------------------------------------------------------------


def test_default_windows() -> None:
    assert DEFAULT_STALE_AFTER_SECONDS == 86_400
    assert DEFAULT_BATTERY_STALE_AFTER_SECONDS == 604_800
    # The battery default is the longest window a user can set.
    assert DEFAULT_BATTERY_STALE_AFTER_SECONDS == MAX_STALE_AFTER_SECONDS


@pytest.mark.parametrize("role", _stale_roles())
def test_each_role_defaults_to_its_window(role: str) -> None:
    definition = next(d for d in role_definitions() if d.key == role)
    config = definition.default_config()
    assert config.stale_after_seconds == _expected_default(role)
    # A stored config without the field falls back to the same default.
    assert definition.parse_config is not None
    assert definition.serialize_config is not None
    stored = dict(cast("dict[str, Any]", definition.serialize_config(config)))
    del stored["stale_after_seconds"]
    parsed = definition.parse_config(stored)
    assert parsed.stale_after_seconds == _expected_default(role)


def test_battery_keeps_the_shared_range() -> None:
    definition = next(d for d in role_definitions() if d.key == "battery")
    others = {
        d.stale_after_range
        for d in role_definitions()
        if d.replace_stale_after is not None and d.key != "battery"
    }
    assert others == {definition.stale_after_range}
    with pytest.raises(ValueError, match="stale_after"):
        BatteryConfig.from_storage(
            {**BatteryConfig().as_storage(), "stale_after_seconds": 604_801}
        )


# --- Migration ---------------------------------------------------------------


def _stored(minor: int, plants: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "key": STORAGE_KEY,
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": minor,
        "data": {
            "revision": 1,
            "plants": plants,
            "pending_operations": [],
            "tombstones": [],
            "archived_plants": [],
        },
    }


def _plant(plant_id: str, stale_after: dict[str, int]) -> dict[str, Any]:
    """Build a stored plant whose roles carry the given windows."""
    plant = PlantRecord(
        id=plant_id, revision=1, name="Aloe", created_at="2026-01-01T00:00:00Z"
    ).as_storage()
    for definition in role_definitions():
        if definition.key not in stale_after:
            continue
        if definition.key == "moisture":
            config = MoistureConfig().as_storage()
        else:
            assert definition.serialize_config is not None
            config = dict(
                cast(
                    "dict[str, Any]",
                    definition.serialize_config(definition.default_config()),
                )
            )
        config["stale_after_seconds"] = stale_after[definition.key]
        plant["roles"][definition.key] = config
    return plant


def _window(plant: PlantRecord, role: str) -> int:
    config = plant.role_config(role)
    assert config is not None
    return cast("int", config.stale_after_seconds)


def _persisted_windows(hass_storage: dict[str, Any], index: int = 0) -> dict[str, int]:
    roles = hass_storage[STORAGE_KEY]["data"]["plants"][index]["roles"]
    return {role: config["stale_after_seconds"] for role, config in roles.items()}


async def test_old_default_moves_to_the_new_default_per_role(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    roles = _stale_roles()
    hass_storage[STORAGE_KEY] = _stored(
        18, [_plant("p", dict.fromkeys(roles, OLD_DEFAULT))]
    )

    snapshot = await SmartPlantsStore(hass).async_load()

    plant = snapshot.plants["p"]
    for role in roles:
        assert _window(plant, role) == _expected_default(role)
    assert _persisted_windows(hass_storage) == {
        role: _expected_default(role) for role in roles
    }
    assert hass_storage[STORAGE_KEY]["minor_version"] == STORAGE_MINOR_VERSION


async def test_custom_windows_stay(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    custom = {
        "moisture": OLD_DEFAULT + 60,
        "temperature": 3 * HOUR,
        "humidity": OLD_DEFAULT - 1,
        "battery": 2 * DAY,
        "illuminance": DAY,
        "co2": 60,
    }
    mixed = {"moisture": OLD_DEFAULT, "battery": 5 * DAY, "temperature": OLD_DEFAULT}
    hass_storage[STORAGE_KEY] = _stored(18, [_plant("a", custom), _plant("b", mixed)])

    snapshot = await SmartPlantsStore(hass).async_load()

    assert _persisted_windows(hass_storage, 0) == custom
    assert _persisted_windows(hass_storage, 1) == {
        "moisture": DAY,
        "battery": 5 * DAY,
        "temperature": DAY,
    }
    assert _window(snapshot.plants["b"], "battery") == 5 * DAY


async def test_older_minors_also_move_the_old_default(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # Minor 17 storage passes through the newer steps first.
    hass_storage[STORAGE_KEY] = _stored(
        17, [_plant("p", {"moisture": OLD_DEFAULT, "battery": OLD_DEFAULT})]
    )
    del hass_storage[STORAGE_KEY]["data"]["archived_plants"]

    await SmartPlantsStore(hass).async_load()

    assert _persisted_windows(hass_storage) == {"moisture": DAY, "battery": 7 * DAY}


async def test_migration_runs_once(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[STORAGE_KEY] = _stored(
        18, [_plant("p", {"moisture": OLD_DEFAULT, "battery": OLD_DEFAULT})]
    )
    await SmartPlantsStore(hass).async_load()
    migrated = _persisted_windows(hass_storage)

    # Loading the migrated store again changes nothing.
    await SmartPlantsStore(hass).async_load()
    assert _persisted_windows(hass_storage) == migrated

    # Six hours chosen after the update is the user's value and stays.
    hass_storage[STORAGE_KEY] = _stored(
        STORAGE_MINOR_VERSION,
        [_plant("p", {"moisture": OLD_DEFAULT, "battery": OLD_DEFAULT})],
    )
    snapshot = await SmartPlantsStore(hass).async_load()
    assert snapshot.plants["p"].moisture.stale_after_seconds == OLD_DEFAULT
    assert _window(snapshot.plants["p"], "battery") == OLD_DEFAULT


async def test_newer_store_is_still_refused(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[STORAGE_KEY] = _stored(
        STORAGE_MINOR_VERSION + 1, [_plant("p", {"moisture": OLD_DEFAULT})]
    )
    with pytest.raises(SmartPlantsUnsupportedStorageError):
        await SmartPlantsStore(hass).async_load()
    assert hass_storage[STORAGE_KEY]["minor_version"] == STORAGE_MINOR_VERSION + 1


# --- Behavior with a steady sensor -------------------------------------------


async def _setup(hass: HomeAssistant) -> SmartPlantsManager:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


async def _advance(hass: HomeAssistant, freezer: Any, seconds: int) -> None:
    now = dt_util.utcnow() + timedelta(seconds=seconds)
    freezer.move_to(now)
    async_fire_time_changed(hass, now)
    await hass.async_block_till_done()


async def test_steady_moisture_sensor_stays_current_for_a_day(
    hass: HomeAssistant, freezer: Any
) -> None:
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_moisture", "42", MOISTURE)
    plant = await manager.async_create_plant(name="Aloe")
    assigned = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_moisture"}],
    )
    assert assigned.moisture.stale_after_seconds == DEFAULT_STALE_AFTER_SECONDS
    await hass.async_block_till_done()
    controller = manager.get_moisture_controller(plant.id)
    assert controller is not None

    # The value does not change for 8 hours and, like an MQTT sensor without
    # force_update, the source sends no report in that time.
    for _ in range(8):
        await _advance(hass, freezer, HOUR)
    evaluation = controller.current_evaluation
    assert evaluation.sensor_stale is False
    assert evaluation.computed_available is True

    await _advance(hass, freezer, 16 * HOUR + 60)
    assert controller.current_evaluation.sensor_stale is True


async def test_steady_battery_stays_valid_for_seven_days(
    hass: HomeAssistant, freezer: Any
) -> None:
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_battery", "100", BATTERY)
    plant = await manager.async_create_plant(name="Aloe")
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="battery",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_battery"}],
    )
    assert _window(assigned, "battery") == DEFAULT_BATTERY_STALE_AFTER_SECONDS
    await hass.async_block_till_done()
    controller = manager.get_role_controller(plant.id, "battery")
    assert controller is not None
    entity = manager.get_entity("sensor", plant.id, "battery")
    assert entity is not None
    entity_id = entity.entity_id
    assert entity_id is not None

    for _ in range(6):
        await _advance(hass, freezer, DAY)
    valid = controller.current_evaluation
    assert valid.sensor_stale is False
    current = hass.states.get(entity_id)
    assert current is not None
    assert current.state == "100"

    await _advance(hass, freezer, DAY + 60)
    stale = controller.current_evaluation
    assert stale.sensor_stale is True
    expired = hass.states.get(entity_id)
    assert expired is not None
    assert expired.state == STATE_UNAVAILABLE


# --- Other ways a reading gets its window --------------------------------------


async def test_wizard_roles_get_their_default_window(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    # The panel's wizard sends extra readings without a window, so the
    # backend default applies.
    manager = await _setup(hass)
    draft = manager.wizard_start()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/wizard/create",
            **_credentials(draft),
            "confirmed": True,
            "name": "Aloe",
            "moisture": _moisture(),
            "roles": {
                "battery": {"sources": [{"entity_id": "sensor.mock_battery"}]},
                "temperature": {"sources": [{"entity_id": "sensor.mock_air"}]},
            },
        }
    )
    response = await client.receive_json()
    assert response["success"], response
    plant = manager.get_plant(response["result"]["plant"]["id"])
    assert _window(plant, "battery") == DEFAULT_BATTERY_STALE_AFTER_SECONDS
    assert _window(plant, "temperature") == DEFAULT_STALE_AFTER_SECONDS
    roles = response["result"]["plant"]["roles"]
    assert roles["battery"]["stale_after_seconds"] == 604_800
    assert roles["temperature"]["stale_after_seconds"] == 86_400


async def test_restored_plant_gets_the_default_windows(hass: HomeAssistant) -> None:
    # The archive keeps only the sources, so a restored plant starts from the
    # defaults even when its windows were changed before it was retired.
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_battery", "90", BATTERY)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await manager.async_set_role_sources(
        plant.id,
        role="battery",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_battery"}],
    )
    plant = await manager.async_set_role_stale_after(
        plant.id,
        role="battery",
        expected_revision=plant.revision,
        stale_after_seconds=HOUR,
    )
    plant = await manager.async_set_stale_after(
        plant.id, expected_revision=plant.revision, stale_after_seconds=HOUR
    )
    await hass.async_block_till_done()
    record = await manager.async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    await hass.async_block_till_done()

    restored = await manager.async_restore_plant(
        plant.id,
        expected_revision=record.revision,
        name="Aloe",
        include_sources_in_use=False,
        expected_name_taken=False,
        expected_sources_in_use=[],
    )

    assert _window(restored, "battery") == DEFAULT_BATTERY_STALE_AFTER_SECONDS
    assert restored.moisture.stale_after_seconds == DEFAULT_STALE_AFTER_SECONDS
