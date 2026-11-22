"""
Winter values: thresholds that replace a plant's normal ones in winter.

Winter applies during the plant's rest period or while its placement is
dormant storage. A plant without winter values behaves exactly as before.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

import pytest
from custom_components.smart_plants.const import (
    DOMAIN,
    SINGLETON_UNIQUE_ID,
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import (
    PlantPlacement,
    PlantRecord,
    RestPeriod,
    parse_winter_thresholds,
)
from custom_components.smart_plants.roles import require_role
from custom_components.smart_plants.storage import (
    SmartPlantsInvalidStorageError,
    SmartPlantsStore,
)
from custom_components.smart_plants.winter import (
    winter_config,
    winter_reason,
    winter_view,
)
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

TEMPERATURE_SENSOR = "sensor.mock_garage_temperature"
WINTER_TEMPERATURE = {
    "cold_threshold_celsius": 0.0,
    "cold_clear_celsius": 2.0,
    "hot_threshold_celsius": 35.0,
    "hot_clear_celsius": 32.0,
}
WINTER_MOISTURE = {"min": 10, "target": 25, "max": 55}
WINTER_LIGHT = {"target_lux": 0.0, "clear_lux": 200.0}
# Midday UTC, so the local date is the same in every test time zone.
JANUARY = datetime(2027, 1, 15, 12, 0, tzinfo=UTC)
JUNE = datetime(2026, 6, 15, 12, 0, tzinfo=UTC)


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    assert await async_setup_component(hass, DOMAIN, {})
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _manager(entry: MockConfigEntry) -> SmartPlantsManager:
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


def _seed(hass_storage: dict[str, Any], *, minor: int, plants: list[Any]) -> None:
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": minor,
        "key": STORAGE_KEY,
        "data": {
            "revision": 1,
            "plants": plants,
            "pending_operations": [],
            "tombstones": [],
            "archived_plants": [],
        },
    }


def _plant_row(**changes: Any) -> dict[str, Any]:
    row = PlantRecord(
        id="plant-1", revision=3, name="Oleander", created_at="2026-01-01T00:00:00Z"
    ).as_storage()
    row.update(changes)
    return row


async def _garage_oleander(
    hass: HomeAssistant, manager: SmartPlantsManager, *, winter: bool = True
) -> PlantRecord:
    """Oleander with a temperature sensor at 5 °C and a Dec-Feb rest period."""
    hass.states.async_set(TEMPERATURE_SENSOR, "5", {"unit_of_measurement": "°C"})
    plant = await manager.async_create_plant(name="Oleander")
    plant = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": TEMPERATURE_SENSOR}],
    )
    plant = await manager.async_set_rest_period(
        plant.id,
        expected_revision=plant.revision,
        rest_period={"start_month": 12, "end_month": 2},
    )
    if winter:
        plant = await manager.async_set_winter_thresholds(
            plant.id,
            expected_revision=plant.revision,
            winter_thresholds={"temperature": WINTER_TEMPERATURE},
        )
    await hass.async_block_till_done()
    return plant


def _temperature_stress(manager: SmartPlantsManager, plant_id: str) -> str:
    controller = manager.get_role_controller(plant_id, "temperature")
    assert controller is not None
    return str(controller.current_evaluation.temperature_stress.reason)


def _winter_check_armed(manager: SmartPlantsManager) -> bool:
    return manager._unsub_winter_check is not None


def _binary_attributes(
    hass: HomeAssistant, manager: SmartPlantsManager, plant_id: str, role: str
) -> dict[str, Any]:
    entity = manager.get_entity("binary_sensor", plant_id, role)
    assert entity is not None, role
    state = hass.states.get(entity.entity_id)
    assert state is not None
    return dict(state.attributes)


# --- Storage ----------------------------------------------------------------


async def test_minor_twenty_one_migrates_without_winter_values(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    row = _plant_row()
    del row["winter_thresholds"]
    _seed(hass_storage, minor=21, plants=[row])

    snapshot = await SmartPlantsStore(hass).async_load()

    assert snapshot.plants["plant-1"].winter_thresholds is None


async def test_older_minor_with_winter_values_fails_closed(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    row = _plant_row(winter_thresholds={"temperature": WINTER_TEMPERATURE})
    _seed(hass_storage, minor=21, plants=[row])

    with pytest.raises(SmartPlantsInvalidStorageError):
        await SmartPlantsStore(hass).async_load()


async def test_current_minor_round_trips_winter_values(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    row = _plant_row(
        winter_thresholds={
            "temperature": WINTER_TEMPERATURE,
            "moisture": WINTER_MOISTURE,
        }
    )
    _seed(hass_storage, minor=STORAGE_MINOR_VERSION, plants=[row])

    plant = (await SmartPlantsStore(hass).async_load()).plants["plant-1"]

    assert plant.as_storage()["winter_thresholds"] == {
        "temperature": WINTER_TEMPERATURE,
        "moisture": WINTER_MOISTURE,
    }


async def test_current_minor_requires_the_winter_field(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    row = _plant_row()
    del row["winter_thresholds"]
    _seed(hass_storage, minor=STORAGE_MINOR_VERSION, plants=[row])

    with pytest.raises(SmartPlantsInvalidStorageError):
        await SmartPlantsStore(hass).async_load()


@pytest.mark.parametrize(
    "value",
    [
        {},
        {"battery": {"threshold_percent": 10, "clear_percent": 15}},
        {"temperature": {**WINTER_TEMPERATURE, "cold_clear_celsius": None}},
        {"temperature": {"cold_threshold_celsius": 0.0}},
        {"temperature": {**WINTER_TEMPERATURE, "cold_clear_celsius": -1.0}},
        {"moisture": {"min": 30, "target": 20, "max": 55}},
        {"illuminance": {"target_lux": 0.0, "clear_lux": 5.0}},
        {"humidity": "dry"},
        ["temperature"],
    ],
)
def test_invalid_winter_values_are_rejected(value: object) -> None:
    with pytest.raises(ValueError, match=r"\S"):
        parse_winter_thresholds(value)


def test_winter_values_are_normalized() -> None:
    parsed = parse_winter_thresholds(
        {"temperature": {**WINTER_TEMPERATURE, "cold_threshold_celsius": 0.04}}
    )

    assert parsed == {
        "temperature": {**WINTER_TEMPERATURE, "cold_threshold_celsius": 0.0}
    }


# --- When winter applies ----------------------------------------------------


@pytest.mark.parametrize(
    ("placement", "rest", "today", "expected"),
    [
        (None, None, date(2027, 1, 15), None),
        (None, (12, 2), date(2027, 1, 15), "rest_period"),
        (None, (12, 2), date(2026, 6, 15), None),
        ("dormant_storage", None, date(2026, 6, 15), "dormant_storage"),
        ("dormant_storage", (12, 2), date(2027, 1, 15), "dormant_storage"),
        ("indoor", (12, 2), date(2026, 6, 15), None),
    ],
)
def test_winter_reason(
    placement: str | None,
    rest: tuple[int, int] | None,
    today: date,
    expected: str | None,
) -> None:
    plant = PlantRecord(
        id="plant-1",
        revision=1,
        name="Oleander",
        created_at="2026-01-01T00:00:00Z",
        placement=PlantPlacement(mode=placement) if placement else None,
        rest_period=RestPeriod(start_month=rest[0], end_month=rest[1])
        if rest
        else None,
    )

    assert winter_reason(plant, today) == expected


def test_winter_view_names_the_end_of_the_rest_period() -> None:
    plant = PlantRecord(
        id="plant-1",
        revision=1,
        name="Oleander",
        created_at="2026-01-01T00:00:00Z",
        rest_period=RestPeriod(start_month=12, end_month=2),
        winter_thresholds={"temperature": WINTER_TEMPERATURE},
    )

    assert winter_view(plant, date(2027, 1, 15)) == {
        "active": True,
        "reason": "rest_period",
        "until": "2027-02-28",
        "roles": ["temperature"],
    }
    assert winter_view(plant, date(2026, 6, 15)) == {
        "active": False,
        "reason": None,
        "until": None,
        "roles": ["temperature"],
    }
    without = PlantRecord(
        id="plant-2", revision=1, name="Aloe", created_at="2026-01-01T00:00:00Z"
    )
    assert winter_view(without, date(2027, 1, 15)) is None


def test_roles_without_winter_values_keep_their_config() -> None:
    plant = PlantRecord(
        id="plant-1",
        revision=1,
        name="Oleander",
        created_at="2026-01-01T00:00:00Z",
        placement=PlantPlacement(mode="dormant_storage"),
        winter_thresholds={"temperature": WINTER_TEMPERATURE},
    )
    moisture = require_role("moisture")

    assert winter_config(moisture, plant, date(2026, 6, 15)) == plant.moisture


# --- Manager ----------------------------------------------------------------


async def test_set_and_remove_winter_values(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(JUNE)
    manager = _manager(await _setup(hass))
    plant = await manager.async_create_plant(name="Oleander")

    updated = await manager.async_set_winter_thresholds(
        plant.id,
        expected_revision=plant.revision,
        winter_thresholds={"moisture": WINTER_MOISTURE},
    )
    assert updated.revision == plant.revision + 1
    assert updated.as_view()["winter_thresholds"] == {"moisture": WINTER_MOISTURE}

    with pytest.raises(SmartPlantsValidationError):
        await manager.async_set_winter_thresholds(
            plant.id,
            expected_revision=updated.revision,
            winter_thresholds={"moisture": {"min": 40, "target": 25, "max": 55}},
        )

    removed = await manager.async_set_winter_thresholds(
        plant.id, expected_revision=updated.revision, winter_thresholds=None
    )
    assert removed.winter_thresholds is None
    assert removed.as_view()["winter_thresholds"] is None


async def test_winter_values_apply_during_the_rest_period(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(JANUARY)
    manager = _manager(await _setup(hass))
    plant = await _garage_oleander(hass, manager)

    assert _temperature_stress(manager, plant.id) == "temperature_ok"

    removed = await manager.async_set_winter_thresholds(
        plant.id, expected_revision=plant.revision, winter_thresholds=None
    )
    await hass.async_block_till_done()
    assert removed.winter_thresholds is None
    assert _temperature_stress(manager, plant.id) == "cold_stress"


async def test_winter_values_wait_outside_winter(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(JUNE)
    manager = _manager(await _setup(hass))
    plant = await _garage_oleander(hass, manager)

    assert _temperature_stress(manager, plant.id) == "cold_stress"

    stored = await manager.async_update_plant(
        plant.id,
        expected_revision=plant.revision,
        placement=PlantPlacement(mode="dormant_storage"),
    )
    await hass.async_block_till_done()
    assert _temperature_stress(manager, plant.id) == "temperature_ok"

    await manager.async_update_plant(
        plant.id,
        expected_revision=stored.revision,
        placement=PlantPlacement(mode="indoor"),
    )
    await hass.async_block_till_done()
    assert _temperature_stress(manager, plant.id) == "cold_stress"


async def test_winter_ends_with_the_rest_period_at_midnight(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    await hass.config.async_set_time_zone("UTC")
    freezer.move_to(datetime(2027, 2, 28, 23, 59, 0, tzinfo=UTC))
    manager = _manager(await _setup(hass))
    plant = await _garage_oleander(hass, manager)
    assert _temperature_stress(manager, plant.id) == "temperature_ok"
    attributes = _binary_attributes(hass, manager, plant.id, "temperature_stress")
    assert attributes["winter_values"] is True
    assert attributes["winter_reason"] == "rest_period"

    next_day = datetime(2027, 3, 1, 0, 0, 10, tzinfo=UTC)
    freezer.move_to(next_day)
    async_fire_time_changed(hass, next_day)
    await hass.async_block_till_done()

    assert _temperature_stress(manager, plant.id) == "cold_stress"
    # Roles without winter values report the new state too.
    stale = _binary_attributes(hass, manager, plant.id, "sensor_stale")
    assert stale["winter_values"] is False
    assert stale["winter_reason"] is None


async def test_plants_without_winter_values_have_no_winter_attributes(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(JANUARY)
    manager = _manager(await _setup(hass))
    plant = await _garage_oleander(hass, manager, winter=False)

    attributes = _binary_attributes(hass, manager, plant.id, "temperature_stress")

    assert "winter_values" not in attributes
    assert "winter_reason" not in attributes
    assert _temperature_stress(manager, plant.id) == "cold_stress"


async def test_winter_check_runs_only_with_winter_values(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(JUNE)
    manager = _manager(await _setup(hass))
    plant = await manager.async_create_plant(name="Oleander")
    assert not _winter_check_armed(manager)

    plant = await manager.async_set_winter_thresholds(
        plant.id,
        expected_revision=plant.revision,
        winter_thresholds={"moisture": WINTER_MOISTURE},
    )
    assert _winter_check_armed(manager)

    await manager.async_set_winter_thresholds(
        plant.id, expected_revision=plant.revision, winter_thresholds=None
    )
    assert not _winter_check_armed(manager)


async def test_moisture_attributes_show_the_winter_thresholds(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(JUNE)
    manager = _manager(await _setup(hass))
    hass.states.async_set(
        "sensor.mock_pot_moisture", "18", {"unit_of_measurement": "%"}
    )
    plant = await manager.async_create_plant(name="Oleander")
    plant = await manager.async_set_role_sources(
        plant.id,
        role="moisture",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_pot_moisture"}],
    )
    plant = await manager.async_update_plant(
        plant.id,
        expected_revision=plant.revision,
        placement=PlantPlacement(mode="dormant_storage"),
    )
    await manager.async_set_winter_thresholds(
        plant.id,
        expected_revision=plant.revision,
        winter_thresholds={"moisture": WINTER_MOISTURE},
    )
    await hass.async_block_till_done()

    entity = manager.get_entity("sensor", plant.id, "moisture")
    assert entity is not None
    state = hass.states.get(entity.entity_id)
    assert state is not None
    assert state.attributes["min_threshold_percent"] == 10
    assert state.attributes["target_threshold_percent"] == 25
    assert state.attributes["max_threshold_percent"] == 55


# --- Overview, WebSocket, diagnostics, archive -------------------------------


async def _send(client: Any, msg: dict[str, Any]) -> dict[str, Any]:
    await client.send_json_auto_id(msg)
    response: dict[str, Any] = await client.receive_json()
    return response


async def test_websocket_sets_winter_values_and_overview_shows_them(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    entry = await _setup(hass)
    client = await hass_ws_client(hass)
    freezer.move_to(JANUARY)
    manager = _manager(entry)
    plant = await _garage_oleander(hass, manager, winter=False)

    rejected = await _send(
        client,
        {
            "type": "smart_plants/plants/set_winter_thresholds",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "winter_thresholds": {"battery": {"threshold_percent": 10}},
        },
    )
    assert not rejected["success"]

    response = await _send(
        client,
        {
            "type": "smart_plants/plants/set_winter_thresholds",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "winter_thresholds": {"temperature": WINTER_TEMPERATURE},
        },
    )
    assert response["success"], response
    assert response["result"]["plant"]["winter_thresholds"] == {
        "temperature": WINTER_TEMPERATURE
    }
    await hass.async_block_till_done()

    overview = await _send(client, {"type": "smart_plants/plants/overview"})
    (summary,) = overview["result"]["plants"]
    assert summary["winter"] == {
        "active": True,
        "reason": "rest_period",
        "until": "2027-02-28",
        "roles": ["temperature"],
    }
    temperature = summary["roles"]["temperature"]
    assert temperature["range"]["min"] == 0.0
    assert temperature["normal_range"]["min"] == 10.0
    assert summary["status"] != "problem"


async def test_overview_without_winter_values_is_unchanged(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    entry = await _setup(hass)
    client = await hass_ws_client(hass)
    freezer.move_to(JANUARY)
    await _garage_oleander(hass, _manager(entry), winter=False)

    overview = await _send(client, {"type": "smart_plants/plants/overview"})
    (summary,) = overview["result"]["plants"]

    assert summary["winter"] is None
    assert summary["roles"]["temperature"]["normal_range"] is None
    assert summary["roles"]["temperature"]["range"]["min"] == 10.0


async def test_diagnostics_count_winter_values(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(JANUARY)
    entry = await _setup(hass)
    await _garage_oleander(hass, _manager(entry))

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    inventory = diagnostics["inventory"]

    assert inventory["winter_values_count"] == 1
    assert inventory["winter_values_active_count"] == 1
    assert inventory["winter_values_role_counts"] == {"temperature": 1}


async def test_retiring_a_plant_drops_its_winter_values(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(JANUARY)
    manager = _manager(await _setup(hass))
    plant = await _garage_oleander(hass, manager)

    archived = await manager.async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    restored = await manager.async_restore_plant(
        plant.id,
        expected_revision=archived.revision,
        name=archived.name,
        include_sources_in_use=True,
        expected_name_taken=False,
        expected_sources_in_use=(),
    )

    assert restored.winter_thresholds is None
    assert not _winter_check_armed(manager)
