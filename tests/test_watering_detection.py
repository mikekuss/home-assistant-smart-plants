"""
Waterings recognized from a sudden rise of the soil moisture.

Where detection is on, a rise of 15 points or more within an hour logs a
watering with the provenance "sensor", unless a watering was logged in the 6
hours before. Each plant decides: by default it follows the placement (on
indoors and in a greenhouse, off elsewhere and without a placement), or it has
its own choice. Plants stored before detection existed have it off.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants import button as button_module
from custom_components.smart_plants.care import CareEvent, care_summary
from custom_components.smart_plants.const import (
    DOMAIN,
    SINGLETON_UNIQUE_ID,
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import (
    ArchivedPlant,
    PlantPlacement,
    PlantRecord,
)
from custom_components.smart_plants.storage import (
    SmartPlantsInvalidStorageError,
    SmartPlantsStore,
)
from custom_components.smart_plants.watering_detector import WateringDetector
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_mock_service,
)
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from tests.helpers import plant_device

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
    assert detector.observe(T0 + timedelta(minutes=30), 18, ()) is False
    # 10 ended at 30 minutes, over an hour before this reading: 18 counts.
    assert detector.observe(T0 + timedelta(minutes=95), 30, ()) is False


def test_the_last_reading_before_the_hour_is_the_baseline() -> None:
    # A sensor that only reports changes stays silent while the soil keeps
    # its value; that value held until the jump.
    detector = WateringDetector()
    assert detector.observe(T0, 40, ()) is False
    assert detector.observe(T0 + timedelta(hours=5), 85, ()) is True
    # Up to 24 hours.
    day = WateringDetector()
    assert day.observe(T0, 40, ()) is False
    assert day.observe(T0 + timedelta(hours=24), 85, ()) is True


def test_a_baseline_older_than_a_day_does_not_count() -> None:
    detector = WateringDetector()
    assert detector.observe(T0, 40, ()) is False
    assert detector.observe(T0 + timedelta(hours=24, minutes=1), 85, ()) is False
    # The new reading is the baseline from now on.
    assert detector.observe(T0 + timedelta(hours=25), 86, ()) is False


def test_a_repeated_value_keeps_the_baseline_fresh() -> None:
    detector = WateringDetector()
    assert detector.observe(T0, 40, ()) is False
    for hour in range(1, 31):
        detector.still_reads(T0 + timedelta(hours=hour))
    assert detector.observe(T0 + timedelta(hours=30, minutes=10), 85, ()) is True


def test_a_repeated_value_does_not_stretch_an_older_one() -> None:
    detector = WateringDetector()
    assert detector.observe(T0, 10, ()) is False
    assert detector.observe(T0 + timedelta(minutes=30), 20, ()) is False
    # 20 is repeated for hours, 10 ended at 30 minutes.
    for minutes in range(40, 200, 10):
        detector.still_reads(T0 + timedelta(minutes=minutes))
    assert detector.observe(T0 + timedelta(minutes=200), 34, ()) is False
    assert detector.observe(T0 + timedelta(minutes=201), 35, ()) is True


def test_a_repeated_value_before_any_reading_is_ignored() -> None:
    detector = WateringDetector()
    detector.still_reads(T0)
    assert detector.observe(T0 + timedelta(minutes=1), 40, ()) is False


def test_a_logged_watering_wins() -> None:
    detector = WateringDetector()
    logged = (_watering(T0 - timedelta(hours=2)),)
    assert detector.observe(T0, 14, logged) is False
    assert detector.observe(T0 + timedelta(minutes=2), 95, logged) is False
    older = (_watering(T0 - timedelta(hours=7)),)
    later = WateringDetector()
    assert later.observe(T0, 14, older) is False
    assert later.observe(T0 + timedelta(minutes=2), 95, older) is True


def test_reset_forgets_the_readings_but_not_the_quiet_time() -> None:
    detector = WateringDetector()
    assert detector.observe(T0, 10, ()) is False
    detector.reset()
    # 10 is forgotten: from 40 to 50 is no watering.
    assert detector.observe(T0 + timedelta(minutes=1), 40, ()) is False
    assert detector.observe(T0 + timedelta(minutes=2), 50, ()) is False
    assert detector.observe(T0 + timedelta(minutes=3), 90, ()) is True
    detector.reset()
    assert detector.observe(T0 + timedelta(minutes=4), 10, ()) is False
    # Still within the quiet time of the watering just detected.
    assert detector.observe(T0 + timedelta(minutes=5), 90, ()) is False


def test_a_new_watering_counts_after_the_quiet_time() -> None:
    detector = WateringDetector()
    assert detector.observe(T0, 10, ()) is False
    assert detector.observe(T0 + timedelta(minutes=1), 90, ()) is True
    assert detector.observe(T0 + timedelta(hours=5), 20, ()) is False
    assert detector.observe(T0 + timedelta(hours=5, minutes=5), 80, ()) is False
    assert detector.observe(T0 + timedelta(hours=7), 20, ()) is False
    assert detector.observe(T0 + timedelta(hours=7, minutes=5), 80, ()) is True


# --- Which plants detect waterings ----------------------------------------


def _record(placement: str | None, *, choice: bool | None = None) -> PlantRecord:
    return PlantRecord(
        id="p",
        revision=1,
        name="Aloe",
        created_at="2026-01-01T00:00:00Z",
        placement=PlantPlacement(mode=placement) if placement is not None else None,
        watering_detection=choice,
    )


@pytest.mark.parametrize(
    ("placement", "expected"),
    [
        ("indoor", True),
        ("greenhouse", True),
        ("outdoor", False),
        ("balcony", False),
        ("covered_outdoor", False),
        ("dormant_storage", False),
        (None, False),
    ],
)
def test_detection_follows_the_placement(
    placement: str | None,
    expected: bool,  # noqa: FBT001
) -> None:
    assert _record(placement).detects_waterings() is expected


def test_a_choice_for_the_plant_wins_over_the_placement() -> None:
    assert _record("outdoor", choice=True).detects_waterings() is True
    assert _record("indoor", choice=False).detects_waterings() is False


def test_the_choice_is_stored() -> None:
    for choice in (None, True, False):
        stored = _record("indoor", choice=choice).as_storage()
        assert stored["watering_detection"] is choice
        assert PlantRecord.from_storage(stored).watering_detection is choice
    with pytest.raises(ValueError, match="watering_detection"):
        PlantRecord.from_storage(
            {**_record("indoor").as_storage(), "watering_detection": "on"}
        )


# --- Integration --------------------------------------------------------------


async def _setup(hass: HomeAssistant) -> SmartPlantsManager:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


async def _plant(
    manager: SmartPlantsManager,
    hass: HomeAssistant,
    *,
    placement: str | None = "indoor",
) -> PlantRecord:
    hass.states.async_set(SOIL, "14", PERCENT)
    plant = await manager.async_create_plant(
        name="Aloe",
        placement=PlantPlacement(mode=placement) if placement is not None else None,
    )
    plant = await manager.async_set_moisture_sources(
        plant.id, expected_revision=plant.revision, sources=[{"entity_id": SOIL}]
    )
    await hass.async_block_till_done()
    return plant


def _waterings(manager: SmartPlantsManager, plant_id: str) -> list[CareEvent]:
    current = manager.get_plant(plant_id)
    assert current is not None
    return [event for event in current.care_events if event.kind == "watering"]


def _revision(manager: SmartPlantsManager, plant_id: str) -> int:
    current = manager.get_plant(plant_id)
    assert current is not None
    return current.revision


async def _water(hass: HomeAssistant, freezer: Any, at: datetime) -> None:
    freezer.move_to(at)
    hass.states.async_set(SOIL, "14", PERCENT)
    await hass.async_block_till_done()
    freezer.move_to(at + timedelta(minutes=1))
    hass.states.async_set(SOIL, "95", PERCENT)
    await hass.async_block_till_done()


async def test_an_indoor_plant_logs_the_watering(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant = await _plant(manager, hass)
    assert plant.watering_detection is None

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


@pytest.mark.parametrize("placement", ["outdoor", None])
async def test_an_outdoor_plant_or_one_without_placement_logs_nothing(
    hass: HomeAssistant, freezer: Any, placement: str | None
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant = await _plant(manager, hass, placement=placement)

    freezer.move_to(T0 + timedelta(minutes=1))
    hass.states.async_set(SOIL, "95", PERCENT)
    await hass.async_block_till_done()

    assert _waterings(manager, plant.id) == []


async def test_switching_takes_effect_without_a_reload(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant = await _plant(manager, hass)

    # Off for this plant, although it is indoors.
    plant = await manager.async_update_plant(
        plant.id,
        expected_revision=_revision(manager, plant.id),
        watering_detection=False,
    )
    await _water(hass, freezer, T0 + timedelta(minutes=10))
    assert _waterings(manager, plant.id) == []

    # Back to following the placement: indoors, so on.
    plant = await manager.async_update_plant(
        plant.id,
        expected_revision=_revision(manager, plant.id),
        watering_detection=None,
    )
    await _water(hass, freezer, T0 + timedelta(hours=1))
    assert len(_waterings(manager, plant.id)) == 1

    # Moved outdoors, still following the placement: off.
    plant = await manager.async_update_plant(
        plant.id,
        expected_revision=_revision(manager, plant.id),
        placement=PlantPlacement(mode="outdoor"),
    )
    await _water(hass, freezer, T0 + timedelta(hours=8))
    assert len(_waterings(manager, plant.id)) == 1

    # On for this plant, although it is outdoors.
    plant = await manager.async_update_plant(
        plant.id,
        expected_revision=_revision(manager, plant.id),
        watering_detection=True,
    )
    await _water(hass, freezer, T0 + timedelta(hours=16))
    assert len(_waterings(manager, plant.id)) == 2


SOIL_2 = "sensor.mock_soil_2"


async def _two_sensor_plant(
    manager: SmartPlantsManager, hass: HomeAssistant
) -> PlantRecord:
    """Create an indoor plant averaging two soil sensors at 20 % and 60 %."""
    hass.states.async_set(SOIL, "20", PERCENT)
    hass.states.async_set(SOIL_2, "60", PERCENT)
    plant = await manager.async_create_plant(
        name="Aloe", placement=PlantPlacement(mode="indoor")
    )
    plant = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": SOIL}, {"entity_id": SOIL_2}],
    )
    plant = await manager.async_set_moisture_aggregation(
        plant.id, expected_revision=plant.revision, aggregation="average"
    )
    await hass.async_block_till_done()
    return plant


async def _set(hass: HomeAssistant, freezer: Any, minutes: int, **states: str) -> None:
    freezer.move_to(T0 + timedelta(minutes=minutes))
    for entity_id, state in states.items():
        hass.states.async_set(entity_id, state, PERCENT)
    await hass.async_block_till_done()


async def test_a_sensor_dropping_out_or_coming_back_logs_nothing(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant = await _two_sensor_plant(manager, hass)
    await _set(hass, freezer, 1, **{SOIL: "20", SOIL_2: "60"})

    # The 20 % sensor drops out: the average jumps from 40 to 60.
    await _set(hass, freezer, 5, **{SOIL: "unavailable"})
    # It comes back: the average falls to 40 again.
    await _set(hass, freezer, 10, **{SOIL: "20"})
    # After a restart both return one at a time, the low one first.
    await _set(hass, freezer, 20, **{SOIL: "unavailable", SOIL_2: "unavailable"})
    await _set(hass, freezer, 21, **{SOIL: "20"})
    await _set(hass, freezer, 22, **{SOIL_2: "60"})

    assert _waterings(manager, plant.id) == []


async def test_adding_a_sensor_logs_nothing(hass: HomeAssistant, freezer: Any) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant = await _plant(manager, hass)
    hass.states.async_set(SOIL_2, "60", PERCENT)
    await _set(hass, freezer, 1, **{SOIL: "20"})

    plant = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=_revision(manager, plant.id),
        sources=[{"entity_id": SOIL}, {"entity_id": SOIL_2}],
    )
    plant = await manager.async_set_moisture_aggregation(
        plant.id, expected_revision=plant.revision, aggregation="average"
    )
    await _set(hass, freezer, 3, **{SOIL: "20", SOIL_2: "60"})

    assert _waterings(manager, plant.id) == []


async def test_a_watering_with_two_sensors_is_still_logged(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant = await _two_sensor_plant(manager, hass)
    await _set(hass, freezer, 1, **{SOIL: "20", SOIL_2: "60"})

    await _set(hass, freezer, 3, **{SOIL: "70", SOIL_2: "90"})

    (event,) = _waterings(manager, plant.id)
    assert event.provenance == "sensor"


async def test_a_watering_logged_by_hand_is_not_doubled(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant = await _plant(manager, hass)
    await manager.async_add_watering(
        plant.id, expected_revision=None, occurred_at=T0.isoformat(), note=None
    )

    freezer.move_to(T0 + timedelta(minutes=2))
    hass.states.async_set(SOIL, "95", PERCENT)
    await hass.async_block_till_done()

    (event,) = _waterings(manager, plant.id)
    assert event.provenance == "manual"


async def test_a_watering_logged_soon_after_replaces_the_detected_one(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant = await _plant(manager, hass)
    await _water(hass, freezer, T0)
    (detected,) = _waterings(manager, plant.id)
    assert detected.provenance == "sensor"

    # Watered pressed half an hour later: one watering, the one logged by hand.
    logged_at = T0 + timedelta(minutes=30)
    freezer.move_to(logged_at)
    await manager.async_add_watering(
        plant.id,
        expected_revision=None,
        occurred_at=logged_at.isoformat(),
        note="Rain water",
    )
    (event,) = _waterings(manager, plant.id)
    assert event.provenance == "manual"
    assert event.payload["note"] == "Rain water"

    # A detected watering more than 6 hours away stays.
    await _water(hass, freezer, T0 + timedelta(hours=8))
    later = T0 + timedelta(hours=15)
    freezer.move_to(later)
    await manager.async_add_watering(
        plant.id, expected_revision=None, occurred_at=later.isoformat(), note=None
    )
    assert [e.provenance for e in _waterings(manager, plant.id)] == [
        "manual",
        "sensor",
        "manual",
    ]


async def test_the_log_care_action_replaces_the_detected_watering(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant = await _plant(manager, hass)
    await _water(hass, freezer, T0)
    device = plant_device(dr.async_get(hass), plant.id)
    assert device is not None

    # The card's Watered and an automation both use the log_care action.
    freezer.move_to(T0 + timedelta(minutes=30))
    await hass.services.async_call(
        DOMAIN,
        "log_care",
        {"device_id": device.id, "kind": "watering", "note": "Rain water"},
        blocking=True,
    )
    await hass.async_block_till_done()

    (event,) = _waterings(manager, plant.id)
    assert event.provenance == "action"
    assert event.payload["note"] == "Rain water"


async def test_the_watered_button_replaces_the_detected_watering(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    with patch.object(
        button_module.SmartPlantsButtonEntity,
        "_attr_entity_registry_enabled_default",
        new=True,
    ):
        manager = await _setup(hass)
        plant = await _plant(manager, hass)
    await _water(hass, freezer, T0)
    button = er.async_get(hass).async_get_entity_id(
        "button", DOMAIN, f"{DOMAIN}:{plant.id}:watered"
    )
    assert button is not None

    freezer.move_to(T0 + timedelta(minutes=30))
    await hass.services.async_call(
        "button", "press", {"entity_id": button}, blocking=True
    )
    await hass.async_block_till_done()

    (event,) = _waterings(manager, plant.id)
    assert event.provenance == "action"
    assert dt_util.parse_datetime(event.occurred_at) == T0 + timedelta(minutes=30)


async def test_a_restored_plant_keeps_its_choice(hass: HomeAssistant) -> None:
    manager = await _setup(hass)
    plant = await _plant(manager, hass)
    plant = await manager.async_update_plant(
        plant.id, expected_revision=plant.revision, watering_detection=False
    )
    record = await manager.async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    assert record.watering_detection is False

    restored = await manager.async_restore_plant(
        plant.id,
        expected_revision=record.revision,
        name="Aloe",
        include_sources_in_use=False,
        expected_name_taken=False,
        expected_sources_in_use=[],
    )

    assert restored.watering_detection is False
    # Indoors, so it would follow the placement to on without the choice.
    assert restored.detects_waterings() is False


async def test_the_choice_is_set_over_the_websocket(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    manager = await _setup(hass)
    plant = await _plant(manager, hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/update",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "watering_detection": False,
        }
    )
    reply = await client.receive_json()
    assert reply["success"], reply
    assert reply["result"]["plant"]["watering_detection"] is False

    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/update",
            "plant_id": plant.id,
            "expected_revision": reply["result"]["plant"]["revision"],
            "watering_detection": "on",
        }
    )
    refused = await client.receive_json()
    assert refused["success"] is False


# --- Storage ------------------------------------------------------------------


def _older_storage(plant: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": STORAGE_KEY,
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": 20,
        "data": {
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
            "archived_plants": [],
        },
    }


def _older_plant() -> dict[str, Any]:
    plant = PlantRecord(
        id="p",
        revision=1,
        name="Aloe",
        created_at="2026-01-01T00:00:00Z",
        placement=PlantPlacement(mode="indoor"),
    ).as_storage()
    del plant["watering_detection"]
    return plant


async def test_existing_plants_get_detection_off(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[STORAGE_KEY] = _older_storage(_older_plant())

    snapshot = await SmartPlantsStore(hass).async_load()

    plant = snapshot.plants["p"]
    assert plant.watering_detection is False
    # Indoors, so it would follow the placement to on without the migration.
    assert plant.detects_waterings() is False


async def test_retired_plants_get_detection_off(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    archived = ArchivedPlant.from_plant(
        PlantRecord(
            id="r",
            revision=1,
            name="Fern",
            created_at="2026-01-01T00:00:00Z",
            placement=PlantPlacement(mode="indoor"),
        ),
        archived_at="2026-02-01T00:00:00Z",
        area_id=None,
        area_name=None,
        device_id=None,
    ).as_storage()
    del archived["watering_detection"]
    stored = _older_storage(_older_plant())
    stored["data"]["archived_plants"] = [archived]
    hass_storage[STORAGE_KEY] = stored

    snapshot = await SmartPlantsStore(hass).async_load()

    assert snapshot.archived_plants["r"].watering_detection is False


async def test_older_storage_cannot_hold_a_choice(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[STORAGE_KEY] = _older_storage(
        {**_older_plant(), "watering_detection": True}
    )
    with pytest.raises(SmartPlantsInvalidStorageError, match="watering detection"):
        await SmartPlantsStore(hass).async_load()


async def test_older_storage_cannot_hold_a_detected_watering(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    plant = _older_plant()
    event = _watering(T0).as_storage()
    plant["care_events"] = [{**event, "provenance": "sensor"}]
    hass_storage[STORAGE_KEY] = _older_storage(plant)
    with pytest.raises(SmartPlantsInvalidStorageError, match="detected waterings"):
        await SmartPlantsStore(hass).async_load()


def _state(hass: HomeAssistant, entity_id: str) -> str:
    state = hass.states.get(entity_id)
    assert state is not None
    return state.state


def _too_wet_entity(hass: HomeAssistant, plant_id: str) -> str:
    device = plant_device(dr.async_get(hass), plant_id)
    assert device is not None
    (entity_id,) = (
        entry.entity_id
        for entry in er.async_entries_for_device(er.async_get(hass), device.id)
        if entry.domain == "binary_sensor" and entry.entity_id.endswith("_too_wet")
    )
    return entity_id


async def _wet_plant(
    manager: SmartPlantsManager, hass: HomeAssistant
) -> tuple[PlantRecord, str, list[str | None]]:
    """Return an indoor plant at 40 % (max 55 %), its Too wet sensor and states."""
    hass.states.async_set(SOIL, "40", PERCENT)
    plant = await manager.async_create_plant(
        name="Aloe", placement=PlantPlacement(mode="indoor")
    )
    plant = await manager.async_set_moisture_thresholds(
        plant.id,
        expected_revision=plant.revision,
        moisture_min=20,
        moisture_target=40,
        moisture_max=55,
    )
    plant = await manager.async_set_moisture_sources(
        plant.id, expected_revision=plant.revision, sources=[{"entity_id": SOIL}]
    )
    await hass.async_block_till_done()
    assert _waterings(manager, plant.id) == []
    too_wet = _too_wet_entity(hass, plant.id)
    assert _state(hass, too_wet) == "off"
    states: list[str | None] = []

    @callback
    def _record(event: Event) -> None:
        if event.data["entity_id"] == too_wet:
            new_state = event.data["new_state"]
            states.append(new_state.state if new_state is not None else None)

    hass.bus.async_listen("state_changed", _record)
    return plant, too_wet, states


async def test_a_detected_watering_never_turns_too_wet_on(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant, too_wet, states = await _wet_plant(manager, hass)
    device = plant_device(dr.async_get(hass), plant.id)
    assert device is not None
    calls = async_mock_service(hass, "test", "record")
    assert await async_setup_component(
        hass,
        "automation",
        {
            "automation": {
                "alias": "too wet",
                "triggers": [
                    {
                        "trigger": "smart_plants.problem_started",
                        "target": {"device_id": device.id},
                        "options": {"problems": ["too_wet"]},
                    }
                ],
                "actions": [{"action": "test.record"}],
            }
        },
    )
    await hass.async_block_till_done()

    # The water reaches the sensor: far above the maximum within a minute.
    freezer.move_to(T0 + timedelta(minutes=1))
    hass.states.async_set(SOIL, "90", PERCENT)
    await hass.async_block_till_done()

    (event,) = _waterings(manager, plant.id)
    assert event.provenance == "sensor"
    assert "on" not in states
    assert _state(hass, too_wet) == "off"
    assert calls == []

    # The grace now comes from the logged watering and lasts its 24 hours.
    freezer.move_to(T0 + timedelta(hours=2))
    hass.states.async_set(SOIL, "88", PERCENT)
    await hass.async_block_till_done()
    assert "on" not in states
    assert calls == []

    # Without the logged watering, the soil is too wet and the automation runs.
    await manager.async_delete_care_event(
        plant.id, expected_revision=_revision(manager, plant.id), event_id=event.id
    )
    await hass.async_block_till_done()
    assert _state(hass, too_wet) == "on"
    assert len(calls) == 1


async def test_a_watering_after_a_silent_sensor_is_logged(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant, too_wet, states = await _wet_plant(manager, hass)

    # The sensor only reports changes: nothing for five hours, then the water.
    freezer.move_to(T0 + timedelta(hours=5))
    hass.states.async_set(SOIL, "85", PERCENT)
    await hass.async_block_till_done()

    (event,) = _waterings(manager, plant.id)
    assert event.provenance == "sensor"
    assert dt_util.parse_datetime(event.occurred_at) == T0 + timedelta(hours=5)
    assert "on" not in states
    assert _state(hass, too_wet) == "off"


async def test_a_watering_after_a_repeated_value_is_logged(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant, too_wet, states = await _wet_plant(manager, hass)
    controller = manager.get_moisture_controller(plant.id)
    assert controller is not None
    evaluation = controller.current_evaluation
    # The first repeat ends the grace a new sensor gets, which evaluates once.
    freezer.move_to(T0 + timedelta(minutes=30))
    hass.states.async_set(SOIL, "40", PERCENT)
    await hass.async_block_till_done()
    notified: list[None] = []
    controller.add_listener(lambda: notified.append(None))

    # The sensor repeats 40 every hour for longer than a day.
    for hour in range(1, 27):
        freezer.move_to(T0 + timedelta(hours=hour))
        hass.states.async_set(SOIL, "40", PERCENT)
        await hass.async_block_till_done()
    # A repeated value changes nothing the plant shows and evaluates nothing,
    # apart from the regular check for a sensor that stopped updating.
    assert controller.current_evaluation == evaluation
    assert len(notified) <= 1
    assert states == []

    freezer.move_to(T0 + timedelta(hours=26, minutes=10))
    hass.states.async_set(SOIL, "85", PERCENT)
    await hass.async_block_till_done()

    (event,) = _waterings(manager, plant.id)
    assert event.provenance == "sensor"
    assert "on" not in states
    assert _state(hass, too_wet) == "off"


async def test_readings_while_disabled_are_no_baseline(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant, _too_wet, _states = await _wet_plant(manager, hass)
    await manager.async_disable_plant(
        plant.id, expected_revision=_revision(manager, plant.id)
    )
    await hass.async_block_till_done()

    freezer.move_to(T0 + timedelta(hours=5))
    hass.states.async_set(SOIL, "85", PERCENT)
    await hass.async_block_till_done()
    freezer.move_to(T0 + timedelta(hours=10))
    await manager.async_reenable_plant(
        plant.id, expected_revision=_revision(manager, plant.id)
    )
    await hass.async_block_till_done()

    assert _waterings(manager, plant.id) == []


async def test_a_reading_after_a_day_of_silence_is_no_watering(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant, too_wet, _states = await _wet_plant(manager, hass)

    freezer.move_to(T0 + timedelta(hours=25))
    hass.states.async_set(SOIL, "85", PERCENT)
    await hass.async_block_till_done()

    assert _waterings(manager, plant.id) == []
    assert _state(hass, too_wet) == "on"


async def test_a_detected_watering_that_is_not_saved_gets_no_grace(
    hass: HomeAssistant, freezer: Any
) -> None:
    freezer.move_to(T0)
    manager = await _setup(hass)
    plant, too_wet, _states = await _wet_plant(manager, hass)

    freezer.move_to(T0 + timedelta(minutes=1))
    with patch.object(
        manager, "async_add_watering", side_effect=RuntimeError("storage full")
    ):
        hass.states.async_set(SOIL, "90", PERCENT)
        await hass.async_block_till_done()

    assert _waterings(manager, plant.id) == []
    assert _state(hass, too_wet) == "on"


async def test_a_detected_watering_gets_the_local_date(
    hass: HomeAssistant, freezer: Any
) -> None:
    await hass.config.async_set_time_zone("Europe/Berlin")
    # 00:30 on 23 November in Berlin is still the 22nd in UTC.
    start = datetime(2026, 11, 22, 23, 29, 5, 123456, tzinfo=UTC)
    freezer.move_to(start)
    manager = await _setup(hass)
    plant = await _plant(manager, hass)

    freezer.move_to(start + timedelta(minutes=1))
    hass.states.async_set(SOIL, "95", PERCENT)
    await hass.async_block_till_done()

    (event,) = _waterings(manager, plant.id)
    assert event.occurred_at == "2026-11-23T00:30:05+01:00"
    assert event.local_date == "2026-11-23"
    current = manager.get_plant(plant.id)
    assert current is not None
    assert care_summary(current.care_events)["last_watered_local_date"] == "2026-11-23"
