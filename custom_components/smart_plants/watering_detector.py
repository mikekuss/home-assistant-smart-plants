"""Recognize a watering from a sudden rise of a plant's soil moisture."""

from __future__ import annotations

from collections import deque
from collections.abc import Iterable
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Final

from homeassistant.util import dt as dt_util

if TYPE_CHECKING:
    from .care import CareEvent

# Water reaching a soil sensor raises its reading by tens of points within
# minutes, while soil only dries by a few points a day. A rise of this many
# points within the window is a watering, not drift or noise.
DETECTION_RISE_POINTS: Final = 15.0
DETECTION_WINDOW: Final = timedelta(hours=1)
# Many sensors only send a reading when the value changes, or repeat the same
# whole percent for hours. The last reading before the window still held when
# the window began, so it counts as the soil's value then, for up to this long.
# This matches the default time after which a silent sensor counts as stale.
DETECTION_BASELINE_MAX_AGE: Final = timedelta(hours=24)
# A watering logged by hand shortly before or after the water reaches the
# sensor is the same watering, and the soil keeps rising for a while after
# one; within this time no second watering is logged.
DETECTION_QUIET: Final = timedelta(hours=6)


class WateringDetector:
    """
    Watch the plant's soil moisture for the jump a watering causes.

    The detector keeps the readings of the last hour, and the last reading
    before them for up to 24 hours, in memory only. After a restart it starts
    from the first reading it gets, so a watering during the restart is only
    recognized when that reading still shows the soil from before.
    """

    def __init__(self) -> None:
        self._samples: deque[tuple[datetime, float]] = deque()
        self._last_detected: datetime | None = None

    def reset(self) -> None:
        """
        Forget the readings, for example when the sensors behind them change.

        A sensor that drops out of an average, comes back after a restart, or
        is added or swapped moves the value at once without any water. The
        time of the last detected watering stays, so its quiet time still
        counts.
        """
        self._samples.clear()

    def observe(
        self, now: datetime, value: float, care_events: Iterable[CareEvent]
    ) -> bool:
        """Record ``value`` at ``now``; return True when it is a new watering."""
        self._forget_old(now)
        lowest = min((sample for _, sample in self._samples), default=value)
        self._record(now, value)
        if value - lowest < DETECTION_RISE_POINTS:
            return False
        # The rise is used up either way, so it can't count twice.
        self._samples.clear()
        self._samples.append((now, value))
        if self._recently_watered(now, care_events):
            return False
        self._last_detected = now
        return True

    def still_reads(self, now: datetime) -> None:
        """
        Note that the value seen last was reported again, unchanged, at ``now``.

        A sensor that repeats its value shows the soil hasn't changed, so that
        value stays the baseline for a watering for longer.
        """
        if not self._samples:
            return
        value = self._samples[-1][1]
        self._forget_old(now)
        self._record(now, value)

    def _forget_old(self, now: datetime) -> None:
        # Keep the newest reading from before the window: it held until the
        # next one, so it was still the value when the window began.
        while len(self._samples) > 1 and now - self._samples[1][0] > DETECTION_WINDOW:
            self._samples.popleft()
        if self._samples and now - self._samples[0][0] > DETECTION_BASELINE_MAX_AGE:
            self._samples.popleft()

    def _record(self, now: datetime, value: float) -> None:
        # A run of the same value keeps only its first and its latest reading:
        # the first says when the value before it ended, the latest how long
        # it held. A sensor that repeats its value often can't fill the memory.
        if (
            len(self._samples) > 1
            and self._samples[-1][1] == value
            and self._samples[-2][1] == value
        ):
            self._samples.pop()
        self._samples.append((now, value))

    def _recently_watered(
        self, now: datetime, care_events: Iterable[CareEvent]
    ) -> bool:
        if (
            self._last_detected is not None
            and now - self._last_detected < DETECTION_QUIET
        ):
            return True
        for event in care_events:
            if event.kind != "watering":
                continue
            occurred = dt_util.parse_datetime(event.occurred_at)
            if occurred is not None and abs(now - occurred) < DETECTION_QUIET:
                return True
        return False
