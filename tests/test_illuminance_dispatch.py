"""Low light through real Home Assistant timers and identical sensor reports."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from custom_components.smart_plants import binary_sensor
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.illuminance_evaluator import LIGHT_LUX
from custom_components.smart_plants.manager import SmartPlantsManager
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

LUX = {"unit_of_measurement": LIGHT_LUX}


async def _setup(hass: HomeAssistant) -> SmartPlantsManager:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


async def _plant_with_light(manager: SmartPlantsManager) -> str:
    plant = await manager.async_create_plant(name="Aloe")
    assigned = await manager.async_set_role_sources(
        plant.id,
        role="illuminance",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_lux"}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="illuminance",
        expected_revision=assigned.revision,
        primary_entity_id="sensor.mock_lux",
    )
    return plant.id


async def _move_to(hass: HomeAssistant, freezer: Any, when: datetime) -> None:
    freezer.move_to(when)
    async_fire_time_changed(hass, when)
    await hass.async_block_till_done()


def _low_light_state(hass: HomeAssistant, plant_id: str) -> Any:
    entity_id = er.async_get(hass).async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant_id}:low_light"
    )
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    return state


async def test_day_and_night_edges_refresh_low_light_and_reschedule(
    hass: HomeAssistant, freezer: Any
) -> None:
    await hass.config.async_set_time_zone("UTC")
    start = datetime(2026, 6, 1, 7, 30, tzinfo=UTC)
    freezer.move_to(start)
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_lux", "100", LUX)
    plant_id = await _plant_with_light(manager)
    await hass.async_block_till_done()
    assert _low_light_state(hass, plant_id).attributes["reason"] == "nighttime"

    # The 08:00 timer alone, without a sensor update, leaves the night window.
    await _move_to(hass, freezer, datetime(2026, 6, 1, 8, 0, 1, tzinfo=UTC))
    state = _low_light_state(hass, plant_id)
    assert state.state == "unavailable"
    assert state.attributes.get("reason") != "nighttime"

    # Keep the source fresh, then let the 18:00 timer, which the 08:00 one
    # scheduled, return the plant to night.
    await _move_to(hass, freezer, datetime(2026, 6, 1, 17, 59, tzinfo=UTC))
    hass.states.async_set("sensor.mock_lux", "100", LUX)
    await hass.async_block_till_done()
    assert _low_light_state(hass, plant_id).attributes.get("reason") != "nighttime"
    await _move_to(hass, freezer, datetime(2026, 6, 1, 18, 0, 1, tzinfo=UTC))
    state = _low_light_state(hass, plant_id)
    assert state.state == "off"
    assert state.attributes["reason"] == "nighttime"


async def test_identical_daytime_reports_supply_low_light_samples(
    hass: HomeAssistant, freezer: Any
) -> None:
    await hass.config.async_set_time_zone("UTC")
    start = datetime(2026, 6, 1, 7, 50, tzinfo=UTC)
    freezer.move_to(start)
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_lux", "100", LUX)
    plant_id = await _plant_with_light(manager)
    await hass.async_block_till_done()

    # The sensor keeps reporting the same dim value every few minutes across
    # dawn. Home Assistant records these as reports, not state changes.
    now = start
    for _ in range(6):
        now += timedelta(minutes=5)
        await _move_to(hass, freezer, now)
        hass.states.async_set("sensor.mock_lux", "100", LUX)
        await hass.async_block_till_done()

    assert dt_util.utcnow().hour == 8
    state = _low_light_state(hass, plant_id)
    assert state.state == "on"
    assert state.attributes["reason"] == "low_light"
    controller = manager.get_role_controller(plant_id, "illuminance")
    assert controller is not None
    assert controller.current_evaluation.sensor_stale is False


async def test_frequent_reports_keep_a_bounded_sample_history(
    hass: HomeAssistant, freezer: Any
) -> None:
    await hass.config.async_set_time_zone("UTC")
    start = datetime(2026, 6, 1, 10, tzinfo=UTC)
    freezer.move_to(start)
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_lux", "100", LUX)
    plant_id = await _plant_with_light(manager)
    await hass.async_block_till_done()
    controller = manager.get_role_controller(plant_id, "illuminance")
    assert controller is not None

    # Ten minutes of a sensor that reports every five seconds, with a
    # brighter reading in the middle of one minute.
    now = start
    for step in range(120):
        now += timedelta(seconds=5)
        freezer.move_to(now)
        value = "900" if step == 30 else "100"
        hass.states.async_set("sensor.mock_lux", value, LUX)
        await hass.async_block_till_done()

    samples = controller._light_samples
    # One sample a minute, not one per report.
    assert 10 <= len(samples) <= 11
    # The brightest reading of a minute is kept, so a short bright spell is
    # not lost when later readings of the same minute are dimmer.
    assert max(sample.lux for sample in samples) == 900.0
    assert controller.current_evaluation.low_light.reason == "enough_light"


def test_low_light_sample_count_stays_out_of_the_recorder() -> None:
    unrecorded = binary_sensor._LowLightBinary._unrecorded_attributes
    assert "sample_count" in unrecorded
    assert {"snoozed", "snoozed_until"} <= unrecorded
