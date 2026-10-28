"""The forecast refresh interval option."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import pytest
from custom_components.smart_plants.const import (
    CONF_FORECAST_REFRESH_MINUTES,
    DEFAULT_FORECAST_REFRESH_MINUTES,
    DOMAIN,
    SINGLETON_UNIQUE_ID,
)
from custom_components.smart_plants.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.smart_plants.forecast_reader import (
    ForecastReader,
    refresh_minutes,
)
from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import InvalidData
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from .test_forecast_reader import (
    _HOURLY_30,
    HOURLY,
    NOW,
    WEATHER,
    _forecast_reading,
    _Recorder,
    _set_weather,
    _WeatherService,
)
from .test_reading_tasks import _create, _due_state, _unload


async def _setup_with_task(
    hass: HomeAssistant, options: dict[str, Any] | None = None
) -> tuple[MockConfigEntry, _WeatherService, str, str]:
    """Set up the entry with ``options`` and one forecast reading task."""
    service = _WeatherService(hass)
    service.forecasts = {"hourly": _HOURLY_30}
    _set_weather(hass, features=HOURLY)
    assert await async_setup_component(hass, DOMAIN, {})
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        options=options or {},
        unique_id=SINGLETON_UNIQUE_ID,
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    task_id = await _create(hass, manager, plant.id, schedule=_forecast_reading())
    assert service.calls == ["hourly"]
    service.calls.clear()
    return entry, service, plant.id, task_id


async def _advance(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, minutes: float
) -> None:
    freezer.tick(timedelta(minutes=minutes))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()


async def _save_options(
    hass: HomeAssistant, entry: MockConfigEntry, minutes: Any
) -> None:
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_FORECAST_REFRESH_MINUTES: minutes}
    )
    await hass.async_block_till_done()
    assert result["type"] == "create_entry"


def _interval_key(result: Any) -> Any:
    schema = result["data_schema"].schema
    return next(key for key in schema if key.schema == CONF_FORECAST_REFRESH_MINUTES)


async def test_default_interval_is_30_minutes(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry, service, _plant_id, _task_id = await _setup_with_task(hass)

    await _advance(hass, freezer, 29)
    assert service.calls == []
    await _advance(hass, freezer, 1)
    assert service.calls == ["hourly"]

    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert _interval_key(result).default() == 30
    hass.config_entries.options.async_abort(result["flow_id"])
    await _unload(hass, entry)


async def test_custom_interval_from_the_options(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry, service, _plant_id, _task_id = await _setup_with_task(
        hass, {CONF_FORECAST_REFRESH_MINUTES: 60}
    )

    await _advance(hass, freezer, 30)
    assert service.calls == []
    await _advance(hass, freezer, 30)
    assert service.calls == ["hourly"]
    await _advance(hass, freezer, 60)
    assert service.calls == ["hourly"] * 2

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    assert diagnostics["entry"]["options"][CONF_FORECAST_REFRESH_MINUTES] == 60
    await _unload(hass, entry)


async def test_reader_uses_its_refresh_interval(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.forecasts = {"hourly": _HOURLY_30}
    _set_weather(hass, features=HOURLY)
    reader = ForecastReader(hass, _Recorder(), refresh_interval=timedelta(minutes=15))
    reader.watch({WEATHER: {24}})
    await hass.async_block_till_done()
    assert service.calls == ["hourly"]

    await _advance(hass, freezer, 15)
    assert service.calls == ["hourly"] * 2
    await _advance(hass, freezer, 15)
    assert service.calls == ["hourly"] * 3
    reader.close()


async def test_changing_the_option_reloads_with_the_new_interval(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry, service, plant_id, task_id = await _setup_with_task(hass)

    await _save_options(hass, entry, 120)
    assert entry.state is ConfigEntryState.LOADED
    assert entry.options[CONF_FORECAST_REFRESH_MINUTES] == 120
    assert isinstance(entry.options[CONF_FORECAST_REFRESH_MINUTES], int)
    # The reloaded entry fetches once when it starts watching again.
    assert service.calls == ["hourly"]
    assert _due_state(hass, plant_id, task_id).state == "on"
    service.calls.clear()

    for _ in range(3):
        await _advance(hass, freezer, 30)
    assert service.calls == []
    await _advance(hass, freezer, 30)
    assert service.calls == ["hourly"]

    # The 5-minute throttle on weather changes is unchanged.
    await _advance(hass, freezer, 5)
    _set_weather(hass, features=HOURLY, state="rainy")
    await hass.async_block_till_done()
    assert service.calls == ["hourly"] * 2

    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert _interval_key(result).default() == 120
    hass.config_entries.options.async_abort(result["flow_id"])
    await _unload(hass, entry)


@pytest.mark.parametrize("minutes", [0, 14, 181, 1440])
async def test_out_of_range_intervals_are_rejected(
    hass: HomeAssistant, minutes: int
) -> None:
    assert await async_setup_component(hass, DOMAIN, {})
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        options={CONF_FORECAST_REFRESH_MINUTES: 45},
        unique_id=SINGLETON_UNIQUE_ID,
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    result = await hass.config_entries.options.async_init(entry.entry_id)
    with pytest.raises(InvalidData):
        await hass.config_entries.options.async_configure(
            result["flow_id"], {CONF_FORECAST_REFRESH_MINUTES: minutes}
        )
    assert entry.options[CONF_FORECAST_REFRESH_MINUTES] == 45
    hass.config_entries.options.async_abort(result["flow_id"])
    await _unload(hass, entry)


@pytest.mark.parametrize(
    ("options", "expected"),
    [
        ({}, DEFAULT_FORECAST_REFRESH_MINUTES),
        ({CONF_FORECAST_REFRESH_MINUTES: 15}, 15),
        ({CONF_FORECAST_REFRESH_MINUTES: 180}, 180),
        ({CONF_FORECAST_REFRESH_MINUTES: 45.0}, 45),
        ({CONF_FORECAST_REFRESH_MINUTES: 5}, DEFAULT_FORECAST_REFRESH_MINUTES),
        ({CONF_FORECAST_REFRESH_MINUTES: 1000}, DEFAULT_FORECAST_REFRESH_MINUTES),
        ({CONF_FORECAST_REFRESH_MINUTES: "60"}, DEFAULT_FORECAST_REFRESH_MINUTES),
        ({CONF_FORECAST_REFRESH_MINUTES: True}, DEFAULT_FORECAST_REFRESH_MINUTES),
        ({CONF_FORECAST_REFRESH_MINUTES: None}, DEFAULT_FORECAST_REFRESH_MINUTES),
    ],
)
def test_stored_intervals_fall_back_to_the_default(
    options: dict[str, Any], expected: int
) -> None:
    assert refresh_minutes(options) == expected
