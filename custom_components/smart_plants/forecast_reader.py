"""
Weather forecasts for reading care tasks.

A reading care task can watch the lowest or highest forecast temperature of a
weather entity over the next 24, 48 or 72 hours. This module fetches those
forecasts and reduces them to one value per weather entity and window:

- one ``weather.get_forecasts`` fetch per weather entity, shared by every
  task that uses it;
- the finest forecast type the entity supports whose entries reach the end of
  the window (hourly, then twice daily, then daily); when none does, the
  finest supported type with the part of the window it covers;
- a type whose fetch fails (the service raises, or the response is missing
  or malformed) is skipped and the next coarser type is tried;
- hourly entries give ``temperature``; twice daily and daily entries cover
  12 or 24 hours and give ``templow`` for the low when present;
- a fetch when an entity starts being watched, every 30 minutes, and when the
  weather entity changes, at most once per 5 minutes;
- nothing at all for a weather entity no active task uses.

Any other problem (a missing or unavailable entity, no forecast type, every
type failing, or no entry in the window) leaves the window without a value, so
the task reports ``no_reading``. Debug logs name the entity and the reason
only, never forecast values.
"""

from __future__ import annotations

import asyncio
import functools
import logging
import math
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any, Final, Literal

from homeassistant.components.weather.const import WeatherEntityFeature
from homeassistant.const import ATTR_SUPPORTED_FEATURES, STATE_UNAVAILABLE
from homeassistant.core import Event, EventStateChangedData, callback
from homeassistant.helpers.event import (
    async_track_point_in_utc_time,
    async_track_state_change_event,
    async_track_time_interval,
)
from homeassistant.util import dt as dt_util
from homeassistant.util.unit_conversion import TemperatureConverter

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

REFRESH_INTERVAL: Final = timedelta(minutes=30)
STATE_CHANGE_COOLDOWN: Final = timedelta(minutes=5)

_WEATHER_DOMAIN: Final = "weather"
_SERVICE_GET_FORECASTS: Final = "get_forecasts"
_ATTR_TEMPERATURE_UNIT: Final = "temperature_unit"

# Forecast types from finest to coarsest, with the period one entry covers.
FORECAST_TYPES: Final[tuple[tuple[str, WeatherEntityFeature, timedelta], ...]] = (
    ("hourly", WeatherEntityFeature.FORECAST_HOURLY, timedelta(hours=1)),
    ("twice_daily", WeatherEntityFeature.FORECAST_TWICE_DAILY, timedelta(hours=12)),
    ("daily", WeatherEntityFeature.FORECAST_DAILY, timedelta(hours=24)),
)

ForecastListener = Callable[[str], None]


@dataclass(frozen=True, slots=True)
class ForecastEntry:
    """One forecast entry: the period it covers and its temperatures."""

    start: datetime
    end: datetime
    temperature: float | None
    templow: float | None


@dataclass(frozen=True, slots=True)
class ForecastWindow:
    """
    The lowest and highest forecast temperature of one look-ahead window.

    Either is ``None`` when no entry in the window gives it.
    """

    low: float | None
    high: float | None
    unit: str
    # The end of the covered part of the window; earlier than the window's
    # end when the forecast does not reach that far.
    until: datetime

    def reading(
        self, reading: Literal["low", "high"], unit: str | None
    ) -> float | None:
        """Return the low or high converted into ``unit``, if it can be."""
        value = self.low if reading == "low" else self.high
        if value is None or unit == self.unit:
            return value
        valid = TemperatureConverter.VALID_UNITS
        if unit not in valid or self.unit not in valid:
            return None
        converted = TemperatureConverter.convert(value, self.unit, unit)
        return converted if math.isfinite(converted) else None


def _number(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value) if math.isfinite(value) else None


def parse_forecast(response: object, period: timedelta) -> list[ForecastEntry] | None:
    """
    Parse the entries of one ``weather.get_forecasts`` response.

    Entries without a valid aware ``datetime`` or any temperature are left
    out. Return ``None`` when the response is not a list of entries at all.
    """
    forecast = response.get("forecast") if isinstance(response, Mapping) else None
    if not isinstance(forecast, list):
        return None
    entries: list[ForecastEntry] = []
    for item in forecast:
        if not isinstance(item, Mapping) or not isinstance(item.get("datetime"), str):
            continue
        start = dt_util.parse_datetime(item["datetime"])
        if start is None or start.tzinfo is None:
            continue
        temperature = _number(item.get("temperature"))
        templow = _number(item.get("templow"))
        if temperature is None and templow is None:
            continue
        start = dt_util.as_utc(start)
        entries.append(
            ForecastEntry(
                start=start,
                end=start + period,
                temperature=temperature,
                templow=templow,
            )
        )
    entries.sort(key=lambda entry: entry.start)
    return entries


def reaches(entries: Iterable[ForecastEntry], end: datetime) -> bool:
    """Return whether the entries cover the time up to ``end``."""
    return any(entry.end >= end for entry in entries)


def window_values(
    forecast_type: str,
    entries: Iterable[ForecastEntry],
    *,
    now: datetime,
    hours: int,
    unit: str,
) -> ForecastWindow | None:
    """
    Reduce one forecast to the low and high of the window ``now`` + ``hours``.

    An entry counts when the period it covers overlaps the window. Hourly
    entries give ``temperature``; twice daily and daily entries give
    ``templow`` for the low when present, otherwise ``temperature``.
    """
    window_end = now + timedelta(hours=hours)
    lows: list[float] = []
    highs: list[float] = []
    until: datetime | None = None
    for entry in entries:
        if entry.end <= now or entry.start >= window_end:
            continue
        low = entry.temperature
        if forecast_type != "hourly" and entry.templow is not None:
            low = entry.templow
        if low is not None:
            lows.append(low)
        if entry.temperature is not None:
            highs.append(entry.temperature)
        if low is not None or entry.temperature is not None:
            until = entry.end if until is None else max(until, entry.end)
    if until is None:
        return None
    return ForecastWindow(
        low=min(lows, default=None),
        high=max(highs, default=None),
        unit=unit,
        until=min(until, window_end),
    )


def supported_types(features: object) -> list[tuple[str, timedelta]]:
    """Return the forecast types a ``supported_features`` value offers."""
    if isinstance(features, bool) or not isinstance(features, int):
        return []
    return [
        (name, period) for name, feature, period in FORECAST_TYPES if features & feature
    ]


@dataclass(slots=True)
class _WatchedEntity:
    entity_id: str
    hours: frozenset[int]
    windows: dict[int, ForecastWindow] = field(default_factory=dict)
    last_fetch_had_value: bool | None = None
    last_fetch_started: datetime | None = None
    fetching: asyncio.Task[None] | None = None
    fetch_again: bool = False
    unsub_interval: Callable[[], None] | None = None
    unsub_state: Callable[[], None] | None = None
    unsub_cooldown: Callable[[], None] | None = None

    def cancel(self) -> None:
        for unsub in (self.unsub_interval, self.unsub_state, self.unsub_cooldown):
            if unsub is not None:
                unsub()
        self.unsub_interval = self.unsub_state = self.unsub_cooldown = None
        if self.fetching is not None and not self.fetching.done():
            self.fetching.cancel()
        self.fetching = None


class ForecastReader:
    """Fetch and reduce the forecasts of the weather entities tasks watch."""

    def __init__(self, hass: HomeAssistant, listener: ForecastListener) -> None:
        self._hass = hass
        self._listener = listener
        self._watched: dict[str, _WatchedEntity] = {}
        self._closed = False

    # --- Queries -----------------------------------------------------------

    def window(self, entity_id: str, hours: int) -> ForecastWindow | None:
        """Return the values of the last fetch for one entity and window."""
        watched = self._watched.get(entity_id)
        return None if watched is None else watched.windows.get(hours)

    def last_fetch_had_value(self, entity_id: str) -> bool | None:
        """Return whether the last fetch gave a value; ``None`` before one."""
        watched = self._watched.get(entity_id)
        return None if watched is None else watched.last_fetch_had_value

    @property
    def watched_entity_ids(self) -> frozenset[str]:
        return frozenset(self._watched)

    # --- Lifecycle ---------------------------------------------------------

    @callback
    def watch(self, wanted: Mapping[str, Iterable[int]]) -> None:
        """
        Watch exactly the weather entities in ``wanted`` with their windows.

        A newly watched entity, or one that needs a new window, is fetched at
        once; an entity left out stops its timer and listener.
        """
        if self._closed:
            return
        wanted_hours = {
            entity_id: frozenset(hours) for entity_id, hours in wanted.items()
        }
        for entity_id in list(self._watched):
            if entity_id not in wanted_hours:
                self._watched.pop(entity_id).cancel()
        for entity_id, hours in wanted_hours.items():
            watched = self._watched.get(entity_id)
            if watched is None:
                watched = _WatchedEntity(entity_id=entity_id, hours=hours)
                self._watched[entity_id] = watched
                watched.unsub_interval = async_track_time_interval(
                    self._hass,
                    functools.partial(self._handle_interval, entity_id),
                    REFRESH_INTERVAL,
                )
                watched.unsub_state = async_track_state_change_event(
                    self._hass, [entity_id], self._handle_state_change
                )
                self._request_fetch(entity_id)
            elif not hours <= watched.hours:
                watched.hours = hours
                self._request_fetch(entity_id)
            else:
                watched.hours = hours

    @callback
    def stop(self) -> None:
        """Cancel every timer, listener and running fetch."""
        for watched in self._watched.values():
            watched.cancel()
        self._watched.clear()

    @callback
    def close(self) -> None:
        self._closed = True
        self.stop()

    # --- Fetching ----------------------------------------------------------

    @callback
    def _handle_interval(self, entity_id: str, _now: datetime) -> None:
        self._request_fetch(entity_id)

    @callback
    def _handle_state_change(self, event: Event[EventStateChangedData]) -> None:
        entity_id = event.data["entity_id"]
        watched = self._watched.get(entity_id)
        if self._closed or watched is None or watched.unsub_cooldown is not None:
            return
        started = watched.last_fetch_started
        now = dt_util.utcnow()
        if started is None or now - started >= STATE_CHANGE_COOLDOWN:
            self._request_fetch(entity_id)
            return

        @callback
        def _cooldown_over(_now: datetime) -> None:
            current = self._watched.get(entity_id)
            if current is None:
                return
            current.unsub_cooldown = None
            self._request_fetch(entity_id)

        watched.unsub_cooldown = async_track_point_in_utc_time(
            self._hass, _cooldown_over, started + STATE_CHANGE_COOLDOWN
        )

    @callback
    def _request_fetch(self, entity_id: str) -> None:
        watched = self._watched.get(entity_id)
        if self._closed or watched is None:
            return
        if watched.fetching is not None and not watched.fetching.done():
            # One fetch at a time; the newest request runs once it ends.
            watched.fetch_again = True
            return
        watched.last_fetch_started = dt_util.utcnow()
        watched.fetching = self._hass.async_create_background_task(
            self._async_fetch(watched),
            f"smart_plants forecast {entity_id}",
            eager_start=True,
        )

    async def _async_fetch(self, watched: _WatchedEntity) -> None:
        entity_id = watched.entity_id
        windows = await self._async_windows(entity_id, watched.hours)
        if self._watched.get(entity_id) is not watched:
            return
        watched.windows = windows
        watched.last_fetch_had_value = bool(windows)
        watched.fetching = None
        try:
            self._listener(entity_id)
        except Exception:
            _LOGGER.exception("Smart Plants forecast listener raised")
        if watched.fetch_again:
            watched.fetch_again = False
            self._request_fetch(entity_id)

    async def _async_windows(
        self, entity_id: str, hours: frozenset[int]
    ) -> dict[int, ForecastWindow]:
        state = self._hass.states.get(entity_id)
        if state is None or state.state == STATE_UNAVAILABLE:
            _LOGGER.debug("Forecast for %s skipped: entity is unavailable", entity_id)
            return {}
        unit = state.attributes.get(_ATTR_TEMPERATURE_UNIT)
        if not isinstance(unit, str) or unit not in TemperatureConverter.VALID_UNITS:
            _LOGGER.debug(
                "Forecast for %s skipped: no known temperature unit", entity_id
            )
            return {}
        types = supported_types(state.attributes.get(ATTR_SUPPORTED_FEATURES))
        if not types:
            _LOGGER.debug("Forecast for %s skipped: no forecast type", entity_id)
            return {}

        # Fetch from finest to coarsest until one type reaches the end of the
        # longest window, skipping types whose fetch fails; each window then
        # takes the finest type that reaches its own end, or the finest type
        # with any entry in it.
        now = dt_util.utcnow()
        longest = now + timedelta(hours=max(hours))
        fetched: list[tuple[str, list[ForecastEntry]]] = []
        for forecast_type, period in types:
            entries = await self._async_get_forecast(entity_id, forecast_type, period)
            if entries is None:
                continue
            fetched.append((forecast_type, entries))
            if reaches(entries, longest):
                break
        if not fetched:
            _LOGGER.debug("Forecast for %s failed for every type", entity_id)
            return {}

        windows: dict[int, ForecastWindow] = {}
        for window_hours in hours:
            end = now + timedelta(hours=window_hours)
            ordered = [item for item in fetched if reaches(item[1], end)] + fetched
            for forecast_type, entries in ordered:
                values = window_values(
                    forecast_type, entries, now=now, hours=window_hours, unit=unit
                )
                if values is not None:
                    windows[window_hours] = values
                    break
        if not windows:
            _LOGGER.debug("Forecast for %s has no entry in the window", entity_id)
        return windows

    async def _async_get_forecast(
        self, entity_id: str, forecast_type: str, period: timedelta
    ) -> list[ForecastEntry] | None:
        try:
            response: Any = await self._hass.services.async_call(
                _WEATHER_DOMAIN,
                _SERVICE_GET_FORECASTS,
                {"entity_id": entity_id, "type": forecast_type},
                blocking=True,
                return_response=True,
            )
        except asyncio.CancelledError:
            raise
        except Exception as err:  # noqa: BLE001 - any failure means no value
            _LOGGER.debug(
                "Forecast for %s (%s) failed: %s",
                entity_id,
                forecast_type,
                type(err).__name__,
            )
            return None
        entries = parse_forecast(
            response.get(entity_id) if isinstance(response, Mapping) else None,
            period,
        )
        if entries is None:
            _LOGGER.debug(
                "Forecast for %s (%s) failed: malformed response",
                entity_id,
                forecast_type,
            )
        return entries
