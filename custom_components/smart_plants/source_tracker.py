"""Role-neutral tracking of assigned Home Assistant source entities."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Protocol

from homeassistant.const import EVENT_HOMEASSISTANT_STOP
from homeassistant.core import (
    Event,
    EventStateChangedData,
    EventStateReportedData,
    State,
    callback,
)
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import (
    async_track_point_in_utc_time,
    async_track_state_change_event,
    async_track_state_report_event,
)
from homeassistant.util import dt as dt_util

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant


class SourceDescriptor(Protocol):
    """Minimum assignment shape consumed by the tracker."""

    @property
    def entity_id(self) -> str: ...

    @property
    def registry_id(self) -> str | None: ...


@dataclass(frozen=True, slots=True)
class TrackedSource:
    """A source snapshot whose timestamps only move on source events."""

    key: str
    entity_id: str
    state: State | None
    last_changed_at: datetime | None
    last_valid_at: datetime | None
    grace_until: datetime | None


@dataclass(slots=True)
class _MutableTrackedSource:
    entity_id: str
    registry_id: str | None
    state: State | None
    last_changed_at: datetime | None
    last_valid_at: datetime | None
    grace_started_at: datetime | None
    grace_until: datetime | None


def source_key(source: SourceDescriptor) -> str:
    """Return the stable assignment identity, preferring registry UUID."""
    return source.registry_id or source.entity_id


class SourceTracker:
    """Track source changes and wake a consumer at grace/stale deadlines."""

    def __init__(
        self,
        hass: HomeAssistant,
        *,
        is_valid: Callable[[State], bool],
        on_change: Callable[[datetime], None],
    ) -> None:
        self._hass = hass
        self._is_valid = is_valid
        self._on_change = on_change
        self._sources: dict[str, _MutableTrackedSource] = {}
        self._unsub_states: Callable[[], None] | None = None
        self._unsub_reports: Callable[[], None] | None = None
        self._unsub_deadline: Callable[[], None] | None = None
        self._unsub_shutdown = self._hass.bus.async_listen_once(
            EVENT_HOMEASSISTANT_STOP, self._handle_shutdown
        )
        self._unsub_registry = self._hass.bus.async_listen(
            er.EVENT_ENTITY_REGISTRY_UPDATED,
            self._handle_registry,  # type: ignore[arg-type]
        )
        self._stale_after = timedelta(0)
        self._active = False

    @property
    def snapshots(self) -> dict[str, TrackedSource]:
        return {
            key: TrackedSource(
                key=key,
                entity_id=item.entity_id,
                state=item.state,
                last_changed_at=item.last_changed_at,
                last_valid_at=item.last_valid_at,
                grace_until=item.grace_until,
            )
            for key, item in self._sources.items()
        }

    @property
    def last_valid_at(self) -> datetime | None:
        """Return the newest valid-reading timestamp across tracked sources."""
        stamps = [
            item.last_valid_at
            for item in self._sources.values()
            if item.last_valid_at is not None
        ]
        return max(stamps) if stamps else None

    def configure(
        self,
        sources: Iterable[SourceDescriptor],
        *,
        stale_after: timedelta,
    ) -> None:
        """Adopt assignments, granting grace only to genuinely new keys."""
        now = dt_util.utcnow()
        previous = self._sources
        configured: dict[str, _MutableTrackedSource] = {}
        for source in sources:
            key = source_key(source)
            tracked = previous.get(key)
            entity_id, state, registry_present = self._resolve_source(source)
            if tracked is None:
                changed = state.last_changed if state is not None else None
                tracked = _MutableTrackedSource(
                    entity_id=entity_id,
                    registry_id=source.registry_id,
                    state=state,
                    last_changed_at=changed,
                    last_valid_at=(
                        state.last_reported
                        if state is not None and self._is_valid(state)
                        else None
                    ),
                    grace_started_at=now if registry_present else None,
                    grace_until=now + stale_after if registry_present else None,
                )
            else:
                # A registry-backed rename keeps all source history. Refresh the
                # state snapshot, but never manufacture a new timestamp.
                tracked.entity_id = entity_id
                tracked.registry_id = source.registry_id
                tracked.state = state
                if (
                    tracked.grace_started_at is not None
                    and stale_after != self._stale_after
                ):
                    tracked.grace_until = tracked.grace_started_at + stale_after
            configured[key] = tracked
        self._sources = configured
        self._stale_after = stale_after
        if self._active:
            self._attach_states()
            self._schedule_deadline()

    def start(self) -> None:
        if self._active:
            return
        self._active = True
        self._refresh_sources()
        self._attach_states()
        self._schedule_deadline()

    def stop(self) -> None:
        self._active = False
        self._detach_states()
        if self._unsub_deadline is not None:
            self._unsub_deadline()
            self._unsub_deadline = None

    def close(self) -> None:
        """Permanently detach the tracker."""
        self.stop()
        self._unsub_shutdown()
        self._unsub_registry()

    def _resolve_source(
        self, source: SourceDescriptor
    ) -> tuple[str, State | None, bool]:
        """Resolve UUID-backed sources without trusting a reused entity_id."""
        entity_id = source.entity_id
        if source.registry_id is not None:
            entry = er.async_get(self._hass).async_get(source.registry_id)
            if entry is None:
                return entity_id, None, False
            entity_id = entry.entity_id
        return entity_id, self._hass.states.get(entity_id), True

    def _refresh_sources(self) -> None:
        """Refresh state and UUID identity after a period without listeners."""
        registry = er.async_get(self._hass)
        for tracked in self._sources.values():
            entity_id = tracked.entity_id
            if tracked.registry_id is not None:
                entry = registry.async_get(tracked.registry_id)
                if entry is None:
                    tracked.state = None
                    tracked.last_changed_at = dt_util.utcnow()
                    tracked.last_valid_at = None
                    tracked.grace_started_at = None
                    tracked.grace_until = None
                    continue
                entity_id = entry.entity_id
            state = self._hass.states.get(entity_id)
            changed_while_stopped = (
                entity_id != tracked.entity_id or state is not tracked.state
            )
            tracked.entity_id = entity_id
            tracked.state = state
            if not changed_while_stopped:
                continue
            tracked.last_changed_at = state.last_changed if state is not None else None
            tracked.last_valid_at = (
                state.last_reported
                if state is not None and self._is_valid(state)
                else None
            )
            if tracked.last_valid_at is not None:
                tracked.grace_started_at = None
                tracked.grace_until = None

    @callback
    def _handle_shutdown(self, _event: Event) -> None:
        self.stop()

    def _detach_states(self) -> None:
        if self._unsub_states is not None:
            self._unsub_states()
            self._unsub_states = None
        if self._unsub_reports is not None:
            self._unsub_reports()
            self._unsub_reports = None

    def _attach_states(self) -> None:
        self._detach_states()
        entity_ids = [item.entity_id for item in self._sources.values()]
        if entity_ids:
            self._unsub_states = async_track_state_change_event(
                self._hass, entity_ids, self._handle_state
            )
            # A sensor that writes the same value again only produces a state
            # report, not a state change. Reports still prove the source is
            # alive, so they refresh its staleness clock.
            self._unsub_reports = async_track_state_report_event(
                self._hass, entity_ids, self._handle_report
            )

    @callback
    def _handle_state(self, event: Event[EventStateChangedData]) -> None:
        entity_id = event.data.get("entity_id")
        new_state = event.data.get("new_state")
        for tracked in self._sources.values():
            if tracked.entity_id != entity_id:
                continue
            if tracked.registry_id is not None:
                entry = er.async_get(self._hass).async_get(tracked.registry_id)
                if entry is None or entry.entity_id != entity_id:
                    continue
            tracked.state = new_state if isinstance(new_state, State) else None
            tracked.last_changed_at = (
                new_state.last_changed
                if isinstance(new_state, State)
                else dt_util.utcnow()
            )
            if isinstance(new_state, State) and self._is_valid(new_state):
                tracked.last_valid_at = new_state.last_reported
                tracked.grace_started_at = None
                tracked.grace_until = None
            break
        now = dt_util.utcnow()
        self._schedule_deadline(now)
        self._on_change(now)

    @callback
    def _handle_report(self, event: Event[EventStateReportedData]) -> None:
        """
        Refresh freshness on an identical re-report without recomputing.

        The reported value is unchanged, so outputs only change when the
        source was stale or still inside its assignment grace. A pending
        stale deadline that is now too early reschedules itself when it
        fires, so frequent reports stay cheap.
        """
        entity_id = event.data["entity_id"]
        new_state = event.data["new_state"]
        now = dt_util.utcnow()
        needs_update = False
        for tracked in self._sources.values():
            if tracked.entity_id != entity_id:
                continue
            if tracked.registry_id is not None:
                entry = er.async_get(self._hass).async_get(tracked.registry_id)
                if entry is None or entry.entity_id != entity_id:
                    continue
            tracked.state = new_state
            if not self._is_valid(new_state):
                break
            was_stale = (
                tracked.last_valid_at is None
                or now - tracked.last_valid_at >= self._stale_after
            )
            tracked.last_valid_at = event.data["last_reported"]
            if tracked.grace_until is not None:
                tracked.grace_started_at = None
                tracked.grace_until = None
                needs_update = True
            needs_update = needs_update or was_stale
            break
        if needs_update:
            self._schedule_deadline(now)
            self._on_change(now)

    @callback
    def _handle_registry(self, _event: Event) -> None:
        """Invalidate removals and rebind renames by immutable registry UUID."""
        registry = er.async_get(self._hass)
        changed = False
        for tracked in self._sources.values():
            if tracked.registry_id is None:
                continue
            entry = registry.async_get(tracked.registry_id)
            if entry is None:
                if tracked.state is not None or tracked.grace_until is not None:
                    tracked.state = None
                    tracked.last_changed_at = dt_util.utcnow()
                    tracked.last_valid_at = None
                    tracked.grace_started_at = None
                    tracked.grace_until = None
                    changed = True
                continue
            state = self._hass.states.get(entry.entity_id)
            if tracked.entity_id != entry.entity_id or tracked.state is not state:
                tracked.entity_id = entry.entity_id
                tracked.state = state
                tracked.last_changed_at = (
                    state.last_changed if state is not None else None
                )
                tracked.last_valid_at = (
                    state.last_reported
                    if state is not None and self._is_valid(state)
                    else None
                )
                changed = True
        if changed:
            if self._active:
                self._attach_states()
            now = dt_util.utcnow()
            self._schedule_deadline(now)
            self._on_change(now)

    def _schedule_deadline(self, now: datetime | None = None) -> None:
        if self._unsub_deadline is not None:
            self._unsub_deadline()
            self._unsub_deadline = None
        if not self._active:
            return
        now = now or dt_util.utcnow()
        deadlines: list[datetime] = []
        for tracked in self._sources.values():
            stale_at = (
                tracked.last_valid_at + self._stale_after
                if tracked.last_valid_at is not None
                else None
            )
            # A stale deadline inside assignment grace cannot change output;
            # wake at grace expiry instead, or at the later stale deadline.
            deadline = stale_at
            if tracked.grace_until is not None:
                deadline = max(
                    tracked.grace_until,
                    stale_at or tracked.grace_until,
                )
            if deadline is not None and deadline > now:
                deadlines.append(deadline)
        if deadlines:
            self._unsub_deadline = async_track_point_in_utc_time(
                self._hass, self._handle_deadline, min(deadlines)
            )

    @callback
    def _handle_deadline(self, _now: datetime) -> None:
        self._unsub_deadline = None
        self._schedule_deadline(_now)
        self._on_change(_now)
