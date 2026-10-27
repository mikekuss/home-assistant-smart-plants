"""Forecast readings: window logic, fetching, and forecast reading care tasks."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from custom_components.smart_plants.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.smart_plants.forecast_reader import (
    ForecastReader,
    ForecastWindow,
    parse_forecast,
    supported_types,
    window_values,
)
from freezegun.api import FrozenDateTimeFactory
from homeassistant.const import STATE_UNAVAILABLE, UnitOfTemperature
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from .test_reading_tasks import _create, _due_state, _plant, _reading, _unload
from .test_websocket_api import _connect

WEATHER = "weather.mock_home"
NOW = datetime(2026, 11, 2, 18, 20, tzinfo=UTC)
HOUR = timedelta(hours=1)
HOURLY = 2
TWICE_DAILY = 4
DAILY = 1


def _iso(value: datetime) -> str:
    return value.isoformat()


def _hourly(start: datetime, temperatures: list[float]) -> list[dict[str, Any]]:
    return [
        {"datetime": _iso(start + index * HOUR), "temperature": temperature}
        for index, temperature in enumerate(temperatures)
    ]


def _periods(
    start: datetime, period: timedelta, rows: list[tuple[float | None, float | None]]
) -> list[dict[str, Any]]:
    entries = []
    for index, (temperature, templow) in enumerate(rows):
        entry: dict[str, Any] = {"datetime": _iso(start + index * period)}
        if temperature is not None:
            entry["temperature"] = temperature
        if templow is not None:
            entry["templow"] = templow
        entries.append(entry)
    return entries


_HOUR_START = datetime(2026, 11, 2, 18, 0, tzinfo=UTC)
# 30 hourly entries; the coldest hour inside the next 24 hours is 1 °C, the
# warmest 9 °C. Later entries (-5 and 20) lie past the window's end.
_HOURLY_30 = _hourly(
    _HOUR_START, [8, 7, 5, 3, 1, 2, 4, *[6] * 15, 9, 8, 7, 6, -5, 20, 6, 6]
)
_HALF_DAY = timedelta(hours=12)
_TWICE_DAILY_START = datetime(2026, 11, 2, 12, 0, tzinfo=UTC)
_DAY = timedelta(hours=24)
_DAY_START = datetime(2026, 11, 2, 0, 0, tzinfo=UTC)


def _window(
    forecast_type: str, entries: list[dict[str, Any]], hours: int, unit: str = "°C"
) -> ForecastWindow | None:
    period = {"hourly": HOUR, "twice_daily": _HALF_DAY, "daily": _DAY}[forecast_type]
    parsed = parse_forecast({"forecast": entries}, period)
    assert parsed is not None
    return window_values(forecast_type, parsed, now=NOW, hours=hours, unit=unit)


# --- Window logic -------------------------------------------------------------


@pytest.mark.parametrize(
    ("forecast_type", "entries", "hours", "expected"),
    [
        pytest.param(
            "hourly",
            _HOURLY_30,
            24,
            (1.0, 9.0, NOW + 24 * HOUR),
            id="hourly: entries in the window, including the current hour",
        ),
        pytest.param(
            "hourly",
            [{**entry, "templow": -10} for entry in _HOURLY_30],
            24,
            (1.0, 9.0, NOW + 24 * HOUR),
            id="hourly ignores templow",
        ),
        pytest.param(
            "hourly",
            _HOURLY_30,
            48,
            (-5.0, 20.0, _HOUR_START + 30 * HOUR),
            id="hourly with partial coverage",
        ),
        pytest.param(
            "hourly",
            _hourly(NOW + 25 * HOUR, [0]),
            24,
            None,
            id="hourly with no entry in the window",
        ),
        pytest.param(
            "twice_daily",
            # 12:00-24:00 overlaps now; 24:00-12:00 and 12:00-24:00 the next
            # day too; the entry starting at 24:00 next day lies outside.
            _periods(
                _TWICE_DAILY_START,
                _HALF_DAY,
                [(10, 4), (6, 1), (14, None), (30, -8)],
            ),
            24,
            (1.0, 14.0, NOW + 24 * HOUR),
            id="twice daily: templow for low, temperature without it",
        ),
        pytest.param(
            "twice_daily",
            _periods(_TWICE_DAILY_START, _HALF_DAY, [(10, None), (3, None)]),
            24,
            (3.0, 10.0, _TWICE_DAILY_START + 2 * _HALF_DAY),
            id="twice daily without templow, partial",
        ),
        pytest.param(
            "daily",
            _periods(_DAY_START, _DAY, [(9, 2), (7, -1), (12, 5), (15, 8), (1, -9)]),
            72,
            (-1.0, 15.0, NOW + 72 * HOUR),
            id="daily over three days",
        ),
        pytest.param(
            "daily",
            _periods(_DAY_START, _DAY, [(9, 2)]),
            24,
            (2.0, 9.0, _DAY_START + _DAY),
            id="daily with partial coverage",
        ),
        pytest.param(
            "daily",
            _periods(_DAY_START, _DAY, [(None, 2)]),
            24,
            (2.0, None, _DAY_START + _DAY),
            id="daily with only templow has no high",
        ),
        pytest.param(
            "daily",
            _periods(_DAY_START - 2 * _DAY, _DAY, [(9, 2), (8, 1)]),
            24,
            None,
            id="daily entries in the past only",
        ),
    ],
)
def test_window_values(
    forecast_type: str,
    entries: list[dict[str, Any]],
    hours: int,
    expected: tuple[float, float | None, datetime] | None,
) -> None:
    window = _window(forecast_type, entries, hours)
    if expected is None:
        assert window is None
        return
    assert window is not None
    assert (window.low, window.high, window.until) == expected


@pytest.mark.parametrize(
    ("response", "count"),
    [
        pytest.param({"forecast": []}, 0, id="empty"),
        pytest.param(
            {
                "forecast": [
                    {"datetime": "2026-11-02T18:00:00+00:00", "temperature": 1},
                    {"datetime": "2026-11-02T19:00:00", "temperature": 1},
                    {"datetime": "not a date", "temperature": 1},
                    {"datetime": 5, "temperature": 1},
                    {"datetime": "2026-11-02T20:00:00+00:00"},
                    {"datetime": "2026-11-02T21:00:00+00:00", "temperature": "3"},
                    {"datetime": "2026-11-02T22:00:00+00:00", "temperature": True},
                    {"datetime": "2026-11-02T23:00:00+00:00", "temperature": None},
                    {"datetime": "2026-11-03T00:00:00+01:00", "temperature": 2.5},
                    "entry",
                ]
            },
            2,
            id="only valid aware entries with a temperature",
        ),
    ],
)
def test_parse_forecast_skips_bad_entries(response: object, count: int) -> None:
    entries = parse_forecast(response, HOUR)
    assert entries is not None
    assert len(entries) == count
    assert all(entry.start.tzinfo is not None for entry in entries)


@pytest.mark.parametrize(
    "response", [None, {}, {"forecast": None}, {"forecast": {}}, [], "forecast"]
)
def test_parse_forecast_rejects_malformed_responses(response: object) -> None:
    assert parse_forecast(response, HOUR) is None


@pytest.mark.parametrize(
    ("features", "expected"),
    [
        (HOURLY | DAILY | TWICE_DAILY, ["hourly", "twice_daily", "daily"]),
        (DAILY | TWICE_DAILY, ["twice_daily", "daily"]),
        (DAILY, ["daily"]),
        (0, []),
        (None, []),
        ("3", []),
        (True, []),
    ],
)
def test_supported_types_from_finest(features: object, expected: list[str]) -> None:
    assert [name for name, _period in supported_types(features)] == expected


def test_window_reading_converts_units() -> None:
    window = ForecastWindow(low=32.0, high=212.0, unit="°F", until=NOW)
    assert window.reading("low", "°C") == pytest.approx(0.0)
    assert window.reading("high", "°C") == pytest.approx(100.0)
    assert window.reading("low", "°F") == 32.0
    assert window.reading("low", "%") is None
    assert window.reading("low", None) is None
    assert (
        ForecastWindow(low=None, high=1, unit="°C", until=NOW).reading("low", "°C")
        is None
    )


# --- Fetching -----------------------------------------------------------------


class _WeatherService:
    """A fake ``weather.get_forecasts`` that answers from fixtures."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.calls: list[str] = []
        self.forecasts: dict[str, list[dict[str, Any]]] = {}
        self.error: Exception | None = None
        self.response: Callable[[str], Any] | None = None
        hass.services.async_register(
            "weather",
            "get_forecasts",
            self._handle,
            supports_response=SupportsResponse.ONLY,
        )

    async def _handle(self, call: ServiceCall) -> Any:
        entity_id = call.data["entity_id"]
        forecast_type = call.data["type"]
        self.calls.append(forecast_type)
        if self.error is not None:
            raise self.error
        if self.response is not None:
            return self.response(entity_id)
        return {entity_id: {"forecast": self.forecasts.get(forecast_type, [])}}


def _set_weather(
    hass: HomeAssistant,
    *,
    features: int = HOURLY | DAILY,
    unit: str = UnitOfTemperature.CELSIUS,
    state: str = "cloudy",
    **attributes: Any,
) -> None:
    hass.states.async_set(
        WEATHER,
        state,
        {"supported_features": features, "temperature_unit": unit, **attributes},
    )


class _Recorder:
    def __init__(self) -> None:
        self.updates: list[str] = []

    def __call__(self, entity_id: str) -> None:
        self.updates.append(entity_id)


async def _reader(
    hass: HomeAssistant, wanted: dict[str, set[int]]
) -> tuple[ForecastReader, _Recorder]:
    recorder = _Recorder()
    reader = ForecastReader(hass, recorder)
    reader.watch(wanted)
    await hass.async_block_till_done()
    return reader, recorder


async def test_fetches_the_finest_type_that_reaches_the_window(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.forecasts = {
        "hourly": _HOURLY_30,
        "daily": _periods(_DAY_START, _DAY, [(9, 2), (7, -1), (12, 5), (15, 8)]),
    }
    _set_weather(hass, features=HOURLY | TWICE_DAILY | DAILY)

    reader, recorder = await _reader(hass, {WEATHER: {24}})
    assert service.calls == ["hourly"]
    assert recorder.updates == [WEATHER]
    window = reader.window(WEATHER, 24)
    assert window is not None
    assert (window.low, window.high) == (1.0, 9.0)
    assert reader.last_fetch_had_value(WEATHER) is True

    # A longer window needs a new fetch; hourly does not reach 72 hours and
    # twice daily is empty, so daily serves it while 24 hours keeps hourly.
    service.calls.clear()
    reader.watch({WEATHER: {24, 72}})
    await hass.async_block_till_done()
    assert service.calls == ["hourly", "twice_daily", "daily"]
    assert reader.window(WEATHER, 24) == window
    long_window = reader.window(WEATHER, 72)
    assert long_window is not None
    assert (long_window.low, long_window.high) == (-1.0, 15.0)
    assert long_window.until == NOW + 72 * HOUR

    # Dropping a window needs no fetch.
    service.calls.clear()
    reader.watch({WEATHER: {24}})
    await hass.async_block_till_done()
    assert service.calls == []
    reader.close()


async def test_uses_the_finest_type_when_none_reaches_the_window(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.forecasts = {
        "hourly": _HOURLY_30,
        "daily": _periods(_DAY_START, _DAY, [(9, 2), (7, -3)]),
    }
    _set_weather(hass)

    reader, _recorder = await _reader(hass, {WEATHER: {72}})

    assert service.calls == ["hourly", "daily"]
    window = reader.window(WEATHER, 72)
    assert window is not None
    assert (window.low, window.high) == (-5.0, 20.0)
    assert window.until == _HOUR_START + 30 * HOUR
    reader.close()


async def test_converts_from_the_weather_unit(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.forecasts = {"hourly": _hourly(_HOUR_START, [41.0] * 25 + [23.0])}
    _set_weather(hass, features=HOURLY, unit=UnitOfTemperature.FAHRENHEIT)

    reader, _recorder = await _reader(hass, {WEATHER: {24}})

    window = reader.window(WEATHER, 24)
    assert window is not None
    assert window.unit == "°F"
    assert window.reading("low", "°C") == pytest.approx(5.0)
    reader.close()


def _no_entity(entity_id: str) -> Any:
    return {"weather.mock_other": {"forecast": []}, "entity": entity_id}


def _malformed(entity_id: str) -> Any:
    return {entity_id: {"forecast": "x"}}


@pytest.mark.parametrize(
    ("weather", "error", "response", "calls"),
    [
        pytest.param(None, None, None, [], id="missing entity"),
        pytest.param(
            {"state": STATE_UNAVAILABLE}, None, None, [], id="unavailable entity"
        ),
        pytest.param({"features": 0}, None, None, [], id="no forecast type"),
        pytest.param({"unit": "%"}, None, None, [], id="unknown unit"),
        pytest.param(
            {},
            HomeAssistantError("no forecast 1.5"),
            None,
            ["hourly"],
            id="service error",
        ),
        pytest.param({}, None, _no_entity, ["hourly"], id="response without entity"),
        pytest.param({}, None, _malformed, ["hourly"], id="malformed forecast"),
        pytest.param({}, None, None, ["hourly", "daily"], id="empty forecasts"),
    ],
)
async def test_errors_give_no_value(  # noqa: PLR0913, PLR0917
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    caplog: pytest.LogCaptureFixture,
    weather: dict[str, Any] | None,
    error: Exception | None,
    response: Callable[[str], Any] | None,
    calls: list[str],
) -> None:
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.error = error
    service.response = response
    if weather is not None:
        _set_weather(hass, **weather)
    caplog.set_level(logging.DEBUG, logger="custom_components.smart_plants")

    reader, recorder = await _reader(hass, {WEATHER: {24}})

    assert service.calls == calls
    assert reader.window(WEATHER, 24) is None
    assert reader.last_fetch_had_value(WEATHER) is False
    assert recorder.updates == [WEATHER]
    assert WEATHER in caplog.text
    assert "1.5" not in caplog.text
    reader.close()


async def test_logs_never_carry_forecast_values(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    caplog: pytest.LogCaptureFixture,
) -> None:
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.forecasts = {"hourly": _hourly(NOW + 30 * HOUR, [-17.25])}
    _set_weather(hass, features=HOURLY)
    caplog.set_level(logging.DEBUG, logger="custom_components.smart_plants")

    reader, _recorder = await _reader(hass, {WEATHER: {24}})

    assert reader.window(WEATHER, 24) is None
    assert "no entry in the window" in caplog.text
    assert "17.25" not in caplog.text
    reader.close()


async def test_refresh_timer_state_changes_and_stop(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.forecasts = {"hourly": _HOURLY_30}
    _set_weather(hass, features=HOURLY)
    reader, recorder = await _reader(hass, {WEATHER: {24}})
    assert service.calls == ["hourly"]

    # A state change soon after a fetch waits until 5 minutes have passed.
    freezer.tick(timedelta(minutes=1))
    _set_weather(hass, features=HOURLY, state="rainy")
    _set_weather(hass, features=HOURLY, state="snowy")
    await hass.async_block_till_done()
    assert service.calls == ["hourly"]
    freezer.tick(timedelta(minutes=4, seconds=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert service.calls == ["hourly"] * 2

    # Once 5 minutes have passed, a state change fetches at once.
    freezer.tick(timedelta(minutes=6))
    _set_weather(hass, features=HOURLY, state="sunny")
    await hass.async_block_till_done()
    assert service.calls == ["hourly"] * 3

    # The 30-minute refresh runs on its own.
    freezer.tick(timedelta(minutes=30))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(service.calls) == 4
    assert recorder.updates == [WEATHER] * 4

    # Without a task that uses the entity, nothing is fetched any more.
    reader.watch({})
    assert reader.watched_entity_ids == frozenset()
    _set_weather(hass, features=HOURLY, state="cloudy")
    freezer.tick(timedelta(hours=2))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(service.calls) == 4
    reader.close()


async def test_nothing_is_fetched_without_forecast_tasks(
    hass: HomeAssistant,
) -> None:
    service = _WeatherService(hass)
    _set_weather(hass)
    entry, manager, plant_id = await _plant(hass, temperature=3)
    await _create(hass, manager, plant_id)
    _set_weather(hass, state="rainy")
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(hours=1))
    await hass.async_block_till_done()

    assert service.calls == []
    state = _due_state(hass, plant_id, manager.get_plant(plant_id).care_tasks[0].id)
    assert "forecast" not in state.attributes
    assert "forecast_until" not in state.attributes
    await _unload(hass, entry)


# --- Forecast reading care tasks ------------------------------------------------


def _forecast_reading(**changes: Any) -> dict[str, Any]:
    forecast = {"entity_id": WEATHER, "reading": "low", "hours": 24}
    source = {"forecast": {**forecast, **changes.pop("forecast", {})}}
    return _reading(**{"source": source, "value": 2.0, **changes})


async def test_forecast_task_becomes_due_and_shows_its_attributes(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.forecasts = {"hourly": _HOURLY_30}
    _set_weather(hass, features=HOURLY)
    entry, manager, plant_id = await _plant(hass)

    task_id = await _create(hass, manager, plant_id, schedule=_forecast_reading())

    state = _due_state(hass, plant_id, task_id)
    assert state.state == "on"
    assert state.attributes["status"] == "due"
    assert state.attributes["reading"] == 1.0
    assert state.attributes["unit"] == "°C"
    assert state.attributes["source"] == WEATHER
    assert state.attributes["forecast"] == "low"
    assert state.attributes["forecast_until"] == (NOW + 24 * HOUR).isoformat()
    assert state.attributes["due_at"] is None

    # A warmer forecast on the next refresh ends the task.
    service.forecasts = {"hourly": _hourly(_HOUR_START, [6] * 30)}
    freezer.tick(timedelta(minutes=30))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    state = _due_state(hass, plant_id, task_id)
    assert state.state == "off"
    assert state.attributes["status"] == "watching"
    assert state.attributes["reading"] == 6.0

    # A failing fetch gives no reading and no transition.
    service.forecasts = {"hourly": _HOURLY_30}
    freezer.tick(timedelta(minutes=30))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert _due_state(hass, plant_id, task_id).state == "on"
    service.error = HomeAssistantError("down")
    freezer.tick(timedelta(minutes=30))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    state = _due_state(hass, plant_id, task_id)
    assert state.attributes["status"] == "no_reading"
    assert state.attributes["reading"] is None
    assert state.attributes["forecast_until"] is None
    # Without a reading, a due task stays due.
    assert state.state == "on"
    await _unload(hass, entry)


async def test_forecast_attributes_are_not_recorded(hass: HomeAssistant) -> None:
    from custom_components.smart_plants.binary_sensor import (  # noqa: PLC0415
        _CareTaskDueBinary,
    )

    assert {"reading", "forecast", "forecast_until"} <= (
        _CareTaskDueBinary._unrecorded_attributes
    )


async def test_forecast_task_converts_into_the_task_unit(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.forecasts = {"daily": _periods(_DAY_START, _DAY, [(50, 41), (59, 50)])}
    _set_weather(hass, features=DAILY, unit=UnitOfTemperature.FAHRENHEIT)
    entry, manager, plant_id = await _plant(hass)

    task_id = await _create(
        hass,
        manager,
        plant_id,
        task_type="custom",
        schedule=_forecast_reading(
            forecast={"reading": "high"}, condition="above", value=14
        ),
    )

    state = _due_state(hass, plant_id, task_id)
    assert state.attributes["reading"] == 15.0
    assert state.attributes["forecast"] == "high"
    assert state.state == "on"
    await _unload(hass, entry)


async def test_tasks_share_one_fetch_per_weather_entity(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.forecasts = {"hourly": _HOURLY_30}
    _set_weather(hass, features=HOURLY)
    entry, manager, plant_id = await _plant(hass)
    first = await _create(hass, manager, plant_id, schedule=_forecast_reading())
    second = await _create(
        hass,
        manager,
        plant_id,
        task_type="custom",
        schedule=_forecast_reading(
            forecast={"reading": "high"}, condition="above", value=30
        ),
    )
    service.calls.clear()

    freezer.tick(timedelta(minutes=30))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    assert service.calls == ["hourly"]
    assert _due_state(hass, plant_id, first).attributes["reading"] == 1.0
    assert _due_state(hass, plant_id, second).attributes["reading"] == 9.0

    # Deleting the last forecast task stops fetching.
    for task_id in (first, second):
        plant = manager.get_plant(plant_id)
        await manager.async_delete_care_task(
            plant_id, task_id, expected_revision=plant.revision
        )
    await hass.async_block_till_done()
    service.calls.clear()
    freezer.tick(timedelta(hours=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert service.calls == []
    await _unload(hass, entry)


async def test_unload_stops_fetching(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.forecasts = {"hourly": _HOURLY_30}
    _set_weather(hass, features=HOURLY)
    entry, manager, plant_id = await _plant(hass)
    await _create(hass, manager, plant_id, schedule=_forecast_reading())
    await _unload(hass, entry)
    service.calls.clear()

    _set_weather(hass, features=HOURLY, state="rainy")
    freezer.tick(timedelta(hours=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert service.calls == []


async def test_websocket_accepts_forecast_tasks_and_shows_them(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    freezer: FrozenDateTimeFactory,
) -> None:
    # The client signs in before the clock moves, while its token is valid.
    client = await _connect(hass, hass_ws_client)
    freezer.move_to(NOW)
    service = _WeatherService(hass)
    service.forecasts = {"hourly": _HOURLY_30}
    _set_weather(hass, features=HOURLY)
    entry, manager, plant_id = await _plant(hass, temperature=3)
    sensor_task = await _create(hass, manager, plant_id, task_type="custom")

    plant = manager.get_plant(plant_id)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/care_tasks/create",
            "plant_id": plant_id,
            "expected_revision": plant.revision,
            "task_type": "winter_protection",
            "name": None,
            "schedule": _forecast_reading(),
            "instructions": None,
            "baseline_done_on": None,
        }
    )
    response = await client.receive_json()
    assert response["success"], response
    task_id = response["result"]["task_id"]
    view = response["result"]["plant"]
    assert view["care_tasks"][-1]["schedule"] == _forecast_reading()

    for schedule in (
        _forecast_reading(for_minutes=30),
        _forecast_reading(forecast={"hours": 36}),
        _forecast_reading(forecast={"entity_id": "sensor.mock_home"}),
    ):
        await client.send_json_auto_id(
            {
                "type": "smart_plants/care_tasks/update",
                "plant_id": plant_id,
                "task_id": task_id,
                "expected_revision": view["revision"],
                "schedule": schedule,
            }
        )
        response = await client.receive_json()
        assert response["success"] is False
        assert response["error"]["code"] == "invalid_format"

    await client.send_json_auto_id(
        {
            "type": "smart_plants/care_tasks/update",
            "plant_id": plant_id,
            "task_id": task_id,
            "expected_revision": view["revision"],
            "schedule": _forecast_reading(forecast={"hours": 48}, value=0),
        }
    )
    response = await client.receive_json()
    assert response["success"], response
    await hass.async_block_till_done()

    await client.send_json_auto_id({"type": "smart_plants/plants/overview"})
    response = await client.receive_json()
    assert response["success"], response
    by_id = {item["task_id"]: item for item in response["result"]["plants"][0]["care"]}
    forecast_view = by_id[task_id]
    assert forecast_view["status"] == "due"
    assert forecast_view["reading"] == -5.0
    assert forecast_view["unit"] == "°C"
    assert forecast_view["forecast"] == "low"
    assert forecast_view["forecast_until"] == (_HOUR_START + 30 * HOUR).isoformat()
    assert by_id[sensor_task]["forecast"] is None
    assert by_id[sensor_task]["forecast_until"] is None

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    rows = diagnostics["reading_care_tasks"]
    assert "forecast_source" not in rows[0]
    assert rows[1]["forecast_source"] == {
        "entity_id": WEATHER,
        "reading": "low",
        "hours": 48,
        "last_fetch_had_value": True,
    }
    assert rows[1]["role_source"] is False
    assert rows[1]["entity_source"] is False
    text = str(diagnostics)
    assert "templow" not in text
    assert "-5.0" not in text
    await _unload(hass, entry)
