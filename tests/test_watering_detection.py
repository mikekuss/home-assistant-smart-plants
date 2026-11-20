"""
Waterings recognized from a sudden rise of the soil moisture.

With the option on, a rise of 15 points or more within an hour logs a watering
with the provenance "sensor", unless a watering was logged in the 6 hours
before. With the option off, which is the default, nothing is logged.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from custom_components.smart_plants.care import CareEvent
from custom_components.smart_plants.const import (
    CONF_DETECT_WATERING,
    DOMAIN,
    SINGLETON_UNIQUE_ID,
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantRecord
from custom_components.smart_plants.storage import (
    SmartPlantsInvalidStorageError,
    SmartPlantsStore,
)
from custom_components.smart_plants.watering_detector import WateringDetector
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry

SOIL = "sensor.mock_soil"
PERCENT = {"unit_of_measurement": "%"}
T0 = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)


def _watering(when: datetime) -> CareEvent:
    return CareEvent.from_storage(
        {
            "schema_version": 2,
            "id": "6f1d6c1e-3b8a-4c1f-9d3e-2a7b5c4d8e9f",
            "kind": "watering",
            "provenance": "manual",
            "task_id": None,
            "occurred_at": when.isoformat(),
            "local_date": when.date().isoformat(),
            "created_at": when.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "updated_at": when.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "payload": {"note": None},
        }
    )


# --- Detector -----------------------------------------------------------------


def test_a_quick_rise_is_a_watering() -> None:
    detector = WateringDetector()
    assert detector.observe(T0, 14, ()) is False
    assert detector.observe(T0 + timedelta(minutes=1), 95, ()) is True
    # The soil keeps settling afterwards: not another watering.
    assert detector.observe(T0 + timedelta(minutes=30), 70, ()) is False
    assert detector.observe(T0 + timedelta(hours=2), 90, ()) is False


def test_a_slow_rise_or_a_small_one_is_not() -> None:
    detector = WateringDetector()
    # Sensor contact settling: a few points over many hours.
    for hour in range(24):
        assert detector.observe(T0 + timedelta(hours=hour), 6 + hour * 0.5, ()) is False
    small = WateringDetector()
    assert small.observe(T0, 20, ()) is False
    assert small.observe(T0 + timedelta(minutes=5), 34, ()) is False


def test_the_rise_must_happen_within_the_hour() -> None:
    detector = WateringDetector()
    assert detector.observe(T0, 10, ()) is False
    assert detector.observe(T0 + timedelta(minutes=70), 30, ()) is False


def test_a_logged_watering_wins() -> None:
    detector = WateringDetector()
    logged = (_watering(T0 - timedelta(hours=2)),)
    assert detector.observe(T0, 14, logged) is False
    assert detector.observe(T0 + timedelta(minutes=2), 95, logged) is False
    older = (_watering(T0 - timedelta(hours=7)),)
    later = WateringDetector()
    assert later.observe(T0, 14, older) is False
    assert later.observe(T0 + timedelta(minutes=2), 95, older) is True


def test_a_new_watering_counts_after_the_quiet_time() -> None:
    detector = WateringDetector()
    assert detector.observe(T0, 10, ()) is False
    assert detector.observe(T0 + timedelta(minutes=1), 90, ()) is True
    assert detector.observe(T0 + timedelta(hours=5), 20, ()) is False
    assert detector.observe(T0 + timedelta(hours=5, minutes=5), 80, ()) is False
    assert detector.observe(T0 + timedelta(hours=7), 20, ()) is False
    assert detector.observe(T0 + timedelta(hours=7, minutes=5), 80, ()) is True


# --- Integration --------------------------------------------------------------


async def _setup(hass: HomeAssistant, *, detect: bool) -> SmartPlantsManager:
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=SINGLETON_UNIQUE_ID,
        options={CONF_DETECT_WATERING: detect},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


async def _plant(manager: SmartPlantsManager, hass: HomeAssistant) -> PlantRecord:
    hass.states.async_set(SOIL, "14", PERCENT)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await manager.async_set_moisture_sources(
        plant.id, expected_revision=plant.revision, sources=[{"entity_id": SOIL}]
    )
    await hass.async_block_till_done()
    return plant


def _waterings(manager: SmartPlantsManager, plant_id: str) -> list[CareEvent]:
    current = manager.get_plant(plant_id)
    assert current is not None
    return [event for event in current.care_events if event.kind == "watering"]


async def test_option_on_logs_the_watering(hass: HomeAssistant, freezer: Any) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass, detect=True)
    plant = await _plant(manager, hass)

    freezer.move_to(T0 + timedelta(minutes=1))
    hass.states.async_set(SOIL, "95", PERCENT)
    await hass.async_block_till_done()

    (event,) = _waterings(manager, plant.id)
    assert event.provenance == "sensor"
    assert dt_util.parse_datetime(event.occurred_at) == T0 + timedelta(minutes=1)
    # The logged watering starts the usual grace.
    controller = manager.get_moisture_controller(plant.id)
    assert controller is not None
    assert controller.current_evaluation.needs_water is False

    # Draining and settling don't log more waterings.
    for minutes, value in ((5, "80"), (20, "60"), (40, "92")):
        freezer.move_to(T0 + timedelta(minutes=minutes))
        hass.states.async_set(SOIL, value, PERCENT)
        await hass.async_block_till_done()
    assert len(_waterings(manager, plant.id)) == 1


async def test_option_off_logs_nothing(hass: HomeAssistant, freezer: Any) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass, detect=False)
    plant = await _plant(manager, hass)

    freezer.move_to(T0 + timedelta(minutes=1))
    hass.states.async_set(SOIL, "95", PERCENT)
    await hass.async_block_till_done()

    assert _waterings(manager, plant.id) == []


async def test_a_watering_logged_by_hand_is_not_doubled(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass, detect=True)
    plant = await _plant(manager, hass)
    await manager.async_add_watering(
        plant.id, expected_revision=None, occurred_at=T0.isoformat(), note=None
    )

    freezer.move_to(T0 + timedelta(minutes=2))
    hass.states.async_set(SOIL, "95", PERCENT)
    await hass.async_block_till_done()

    (event,) = _waterings(manager, plant.id)
    assert event.provenance == "manual"


async def test_older_storage_cannot_hold_a_detected_watering(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    plant = PlantRecord(
        id="p", revision=1, name="Aloe", created_at="2026-01-01T00:00:00Z"
    ).as_storage()
    event = _watering(T0).as_storage()
    plant["care_events"] = [{**event, "provenance": "sensor"}]
    hass_storage[STORAGE_KEY] = {
        "key": STORAGE_KEY,
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": 19,
        "data": {
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
            "archived_plants": [],
        },
    }
    with pytest.raises(SmartPlantsInvalidStorageError, match="detected waterings"):
        await SmartPlantsStore(hass).async_load()
