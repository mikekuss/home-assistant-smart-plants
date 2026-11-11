"""Low light through real Home Assistant timers and identical sensor reports."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
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


def _input_problems(hass: HomeAssistant, plant_id: str) -> Any:
    entity_id = er.async_get(hass).async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant_id}:sensor_stale"
    )
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    return state.attributes["input_problems"]


async def test_light_sensor_quiet_overnight_counts_only_after_its_stale_time(
    hass: HomeAssistant, freezer: Any
) -> None:
    # A sensor that reports only on change sits at 0 lx all night and goes
    # stale before dawn. The plant keeps no problem at 08:00 and only counts
    # the sensor once it has stayed quiet for the stale time of daylight.
    await hass.config.async_set_time_zone("UTC")
    start = datetime(2026, 12, 1, 20, tzinfo=UTC)
    freezer.move_to(start)
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_lux", "0", LUX)
    plant_id = await _plant_with_light(manager)
    await hass.async_block_till_done()
    controller = manager.get_role_controller(plant_id, "illuminance")
    assert controller is not None
    stale_after = timedelta(seconds=controller._config.stale_after_seconds)
    assert stale_after < timedelta(hours=10)

    await _move_to(hass, freezer, datetime(2026, 12, 2, 8, 0, 1, tzinfo=UTC))
    assert controller.current_evaluation.sensor_stale is True
    assert _input_problems(hass, plant_id) == {}

    # No report arrives; the timer at 08:00 plus the stale time counts it.
    grace_end = datetime(2026, 12, 2, 8, tzinfo=UTC) + stale_after
    await _move_to(hass, freezer, grace_end + timedelta(seconds=1))
    assert _input_problems(hass, plant_id) == {"illuminance": "stale"}

    # A new reading clears it.
    hass.states.async_set("sensor.mock_lux", "300", LUX)
    await hass.async_block_till_done()
    assert _input_problems(hass, plant_id) == {}


def test_low_light_sample_count_stays_out_of_the_recorder() -> None:
    unrecorded = binary_sensor._LowLightBinary._unrecorded_attributes
    assert "sample_count" in unrecorded
    assert {"snoozed", "snoozed_until"} <= unrecorded


async def test_low_light_turns_on_when_a_bright_sample_leaves_the_window(
    hass: HomeAssistant, freezer: Any
) -> None:
    # A bright morning reading, then two dim ones and silence. Without a new
    # report, Low light must still turn on once the bright reading is older
    # than the two-hour window, and turn unavailable once too few remain.
    await hass.config.async_set_time_zone("UTC")
    freezer.move_to(datetime(2026, 6, 1, 9, tzinfo=UTC))
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_lux", "1000", LUX)
    plant_id = await _plant_with_light(manager)
    await hass.async_block_till_done()

    await _move_to(hass, freezer, datetime(2026, 6, 1, 10, tzinfo=UTC))
    hass.states.async_set("sensor.mock_lux", "100", LUX)
    await _move_to(hass, freezer, datetime(2026, 6, 1, 10, 30, tzinfo=UTC))
    hass.states.async_set("sensor.mock_lux", "101", LUX)
    await hass.async_block_till_done()
    state = _low_light_state(hass, plant_id)
    assert state.state == "off"
    assert state.attributes["reason"] == "enough_light"

    # The window includes its start: at exactly 11:00 the 09:00 reading counts.
    await _move_to(hass, freezer, datetime(2026, 6, 1, 11, tzinfo=UTC))
    assert _low_light_state(hass, plant_id).state == "off"

    await _move_to(hass, freezer, datetime(2026, 6, 1, 11, 0, 1, tzinfo=UTC))
    state = _low_light_state(hass, plant_id)
    assert state.state == "on"
    assert state.attributes["reason"] == "low_light"

    # At 12:00 the 10:00 reading leaves too; one reading is not enough.
    await _move_to(hass, freezer, datetime(2026, 6, 1, 12, 0, 1, tzinfo=UTC))
    assert _low_light_state(hass, plant_id).state == "unavailable"
    controller = manager.get_role_controller(plant_id, "illuminance")
    assert controller is not None
    low_light = controller.current_evaluation.low_light
    assert low_light.reason == "insufficient_daytime_samples"
    assert low_light.sample_count == 1


async def test_unloading_cancels_a_pending_sample_expiry(
    hass: HomeAssistant, freezer: Any
) -> None:
    await hass.config.async_set_time_zone("UTC")
    freezer.move_to(datetime(2026, 6, 1, 9, tzinfo=UTC))
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_lux", "1000", LUX)
    plant_id = await _plant_with_light(manager)
    await hass.async_block_till_done()
    controller = manager.get_role_controller(plant_id, "illuminance")
    assert controller is not None
    assert controller._wake_at == datetime(2026, 6, 1, 11, 0, 1, tzinfo=UTC)

    entry = hass.config_entries.async_entries(DOMAIN)[0]
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert controller._unsub_edge is None
    await _move_to(hass, freezer, datetime(2026, 6, 1, 11, 0, 1, tzinfo=UTC))


_DAY = datetime(2026, 12, 1, 10, tzinfo=UTC)


@pytest.mark.parametrize(
    ("stale_hours", "checks"),
    [
        # Below ten hours, every morning still hides a quiet sensor until
        # 08:00 plus the window, as before.
        (
            6,
            [
                (_DAY.replace(hour=16, second=1), "stale"),
                (_DAY + timedelta(days=1, hours=-1), None),
                (_DAY + timedelta(days=1, hours=4, seconds=1), "stale"),
                (_DAY + timedelta(days=2, hours=-1), None),
                (_DAY + timedelta(days=2, hours=4, seconds=1), "stale"),
            ],
        ),
        # From ten hours, the morning after the last report hides the whole
        # day, but the morning after a silent day no longer does.
        (
            10,
            [
                (_DAY.replace(hour=17), None),
                (_DAY + timedelta(days=1, hours=2), None),
                (_DAY + timedelta(days=1, hours=7, minutes=59), None),
                (_DAY + timedelta(days=2, hours=-2, seconds=1), "stale"),
            ],
        ),
        (
            12,
            [
                (_DAY + timedelta(days=1, hours=2), None),
                (_DAY + timedelta(days=1, hours=7, minutes=59), None),
                (_DAY + timedelta(days=2, hours=-2, seconds=1), "stale"),
            ],
        ),
        (
            72,
            [
                (_DAY + timedelta(days=1, hours=2), None),
                (_DAY + timedelta(days=2, hours=2), None),
                (_DAY + timedelta(days=3, seconds=1), "stale"),
                (_DAY + timedelta(days=3, hours=8, seconds=1), None),
                (_DAY + timedelta(days=4, hours=-2, seconds=1), "stale"),
            ],
        ),
    ],
)
async def test_failed_light_sensor_counts_with_long_windows(
    hass: HomeAssistant,
    freezer: Any,
    stale_hours: int,
    checks: list[tuple[datetime, str | None]],
) -> None:
    # The sensor reports once at 10:00 and then never again.
    await hass.config.async_set_time_zone("UTC")
    freezer.move_to(_DAY)
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_lux", "300", LUX)
    plant_id = await _plant_with_light(manager)
    plant = manager.get_plant(plant_id)
    await manager.async_set_role_stale_after(
        plant_id,
        role="illuminance",
        expected_revision=plant.revision,
        stale_after_seconds=stale_hours * 3600,
    )
    await hass.async_block_till_done()
    assert _input_problems(hass, plant_id) == {}

    for when, expected in checks:
        await _move_to(hass, freezer, when)
        problems = _input_problems(hass, plant_id)
        assert problems == ({"illuminance": expected} if expected else {}), when


async def test_sample_expiry_wake_up_follows_reports_and_reconfiguration(
    hass: HomeAssistant, freezer: Any
) -> None:
    await hass.config.async_set_time_zone("UTC")
    freezer.move_to(datetime(2026, 6, 1, 9, tzinfo=UTC))
    manager = await _setup(hass)
    hass.states.async_set("sensor.mock_lux", "1000", LUX)
    plant_id = await _plant_with_light(manager)
    await hass.async_block_till_done()
    controller = manager.get_role_controller(plant_id, "illuminance")
    assert controller is not None
    first_expiry = datetime(2026, 6, 1, 11, 0, 1, tzinfo=UTC)
    assert controller._wake_at == first_expiry

    # More reports in later minutes keep the wake-up of the oldest sample and
    # its timer.
    timer = controller._unsub_edge
    for minute in (5, 10):
        await _move_to(hass, freezer, datetime(2026, 6, 1, 9, minute, tzinfo=UTC))
        hass.states.async_set("sensor.mock_lux", "1000", LUX)
        await hass.async_block_till_done()
    assert controller._wake_at == first_expiry
    assert controller._unsub_edge is timer

    # A new stale window keeps the samples and their wake-up.
    plant = manager.get_plant(plant_id)
    await manager.async_set_role_stale_after(
        plant_id,
        role="illuminance",
        expected_revision=plant.revision,
        stale_after_seconds=3600,
    )
    await hass.async_block_till_done()
    assert controller._wake_at == first_expiry

    # After the wake-up, the next oldest sample sets the next one.
    await _move_to(hass, freezer, first_expiry)
    assert controller._wake_at == datetime(2026, 6, 1, 11, 5, 1, tzinfo=UTC)

    # Removing the sensor cancels the timer.
    plant = manager.get_plant(plant_id)
    await manager.async_set_role_sources(
        plant_id, role="illuminance", expected_revision=plant.revision, sources=[]
    )
    await hass.async_block_till_done()
    assert controller._unsub_edge is None
    assert controller._wake_at is None
