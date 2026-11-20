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
# A watering logged by hand shortly before or after the water reaches the
# sensor is the same watering, and the soil keeps rising for a while after
# one; within this time no second watering is logged.
DETECTION_QUIET: Final = timedelta(hours=6)


class WateringDetector:
    """
    Watch the plant's soil moisture for the jump a watering causes.

    The detector keeps the readings of the last hour in memory only. After a
    restart it needs new readings before it can recognize a watering, which
    only means a watering during the restart isn't logged.
    """

    def __init__(self) -> None:
        self._samples: deque[tuple[datetime, float]] = deque()
        self._last_detected: datetime | None = None

    def observe(
        self, now: datetime, value: float, care_events: Iterable[CareEvent]
    ) -> bool:
        """Record ``value`` at ``now``; return True when it is a new watering."""
        while self._samples and now - self._samples[0][0] > DETECTION_WINDOW:
            self._samples.popleft()
        lowest = min((sample for _, sample in self._samples), default=value)
        self._samples.append((now, value))
        if value - lowest < DETECTION_RISE_POINTS:
            return False
        # The rise is used up either way, so it can't count twice.
        self._samples.clear()
        self._samples.append((now, value))
        if self._recently_watered(now, care_events):
            return False
        self._last_detected = now
        return True

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
