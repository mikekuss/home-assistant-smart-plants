"""
Pure schedule engine for plant care tasks.

Computes whether a care task is scheduled, due, overdue, resting, done,
skipped, or missed on a given day. The module performs no I/O and holds no
state: callers pass the task attributes and today's date, and every date is
a calendar date in the Home Assistant time zone.

Three schedule kinds exist, read by attribute name:

* ``interval`` -- repeats ``every`` ``unit`` (days, weeks, months, years)
  after the latest Done, Skip, or baseline date. Without any of those the
  task is due on the day it was created. With ``growing_season_only`` and a
  rest period, the task rests during the rest period and is due again on
  the first growing day.
* ``yearly`` -- due once a year inside a window from the first day of
  ``start_month`` to the last day of ``end_month``. The window may wrap
  across New Year (for example November to February). A Done or Skip from
  up to 60 days before the window opens counts for that window. Yearly
  tasks are never overdue: a window that closes without a Done or Skip is
  ``missed`` until the next window opens.

* ``reading`` -- due because of a sensor reading rather than a date; see
  :func:`reading_task_state`. Reading tasks do not use calendar dates, so
  :func:`compute_task_state` rejects them.

A rest period is any object with ``start_month`` and ``end_month``
(inclusive, wrapping allowed). It only affects interval tasks that opt in
with ``growing_season_only``.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta, tzinfo
from typing import Any, Final, Literal

TaskStatus = Literal[
    "scheduled",
    "due",
    "overdue",
    "resting",
    "done",
    "skipped",
    "missed",
    "watching",
    "waiting",
    "no_reading",
]

SCHEDULE_INTERVAL: Final = "interval"
SCHEDULE_YEARLY: Final = "yearly"
SCHEDULE_READING: Final = "reading"

# How long before a yearly window opens a Done or Skip still counts for it,
# so a task finished a little early is not reported as missing.
YEARLY_LEAD_DAYS: Final = 60

_ONE_DAY: Final = timedelta(days=1)


@dataclass(frozen=True)
class TaskState:
    """
    The state of one care task on one day.

    ``days`` is the number of days until ``next_due`` for ``scheduled``, the
    number of days overdue for ``overdue``, and ``None`` otherwise.
    ``window_end`` is set for yearly tasks only and is the last day of the
    current window, or of the next one when no window is open.
    ``resume_on`` is set for ``resting`` only and is the first growing day.
    """

    status: TaskStatus
    is_due: bool
    next_due: date | None
    days: int | None
    window_end: date | None = None
    resume_on: date | None = None


def add_months(value: date, months: int) -> date:
    """Add calendar months, clamping to the last day of the target month."""
    index = value.year * 12 + value.month - 1 + months
    year, month = divmod(index, 12)
    month += 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def add_interval(value: date, every: int, unit: str) -> date:
    """Add ``every`` ``unit`` to ``value``; weeks are 7 days, years 12 months."""
    if unit == "days":
        return value + timedelta(days=every)
    if unit == "weeks":
        return value + timedelta(weeks=every)
    if unit == "months":
        return add_months(value, every)
    if unit == "years":
        return add_months(value, 12 * every)
    raise ValueError(f"Unknown interval unit: {unit!r}")


def _month_window(start_month: int, end_month: int, year: int) -> tuple[date, date]:
    """Return the month window instance that starts in ``year``."""
    end_year = year if end_month >= start_month else year + 1
    last_day = calendar.monthrange(end_year, end_month)[1]
    return date(year, start_month, 1), date(end_year, end_month, last_day)


def _current_or_next_window(
    start_month: int, end_month: int, today: date
) -> tuple[date, date]:
    """Return the window instance containing ``today``, else the next one."""
    for year in (today.year - 1, today.year):
        start, end = _month_window(start_month, end_month, year)
        if end >= today:
            return start, end
    return _month_window(start_month, end_month, today.year + 1)


def _previous_window(
    start_month: int, end_month: int, current_start: date
) -> tuple[date, date]:
    """
    Return the instance before the one starting on ``current_start``.

    When ``current_start`` belongs to the window containing today or the
    next one to open, this instance has always ended before today.
    """
    return _month_window(start_month, end_month, current_start.year - 1)


def rest_period_bounds(rest_period: Any, today: date) -> tuple[date, date] | None:
    """Return the rest period instance containing ``today``, else the next one."""
    if rest_period is None:
        return None
    return _current_or_next_window(
        rest_period.start_month, rest_period.end_month, today
    )


def is_resting(rest_period: Any, today: date) -> bool:
    """Return whether ``today`` lies inside the rest period."""
    bounds = rest_period_bounds(rest_period, today)
    return bounds is not None and bounds[0] <= today


def _latest(*values: date | None) -> date | None:
    present = [value for value in values if value is not None]
    return max(present) if present else None


def _interval_state(
    schedule: Any,
    anchor: date | None,
    created_on: date,
    rest_period: Any,
    today: date,
) -> TaskState:
    if anchor is None:
        next_due = created_on
    else:
        next_due = add_interval(anchor, schedule.every, schedule.unit)

    if schedule.growing_season_only and rest_period is not None:
        start_month = rest_period.start_month
        end_month = rest_period.end_month
        current_start, current_end = _current_or_next_window(
            start_month, end_month, today
        )
        if current_start <= today:
            resume_on = current_end + _ONE_DAY
            return TaskState(
                status="resting",
                is_due=False,
                next_due=resume_on,
                days=None,
                resume_on=resume_on,
            )
        # A due date that fell inside the last rest period, or an overdue
        # task that went through it, restarts on the first growing day.
        _, previous_end = _previous_window(start_month, end_month, current_start)
        if next_due <= previous_end:
            next_due = previous_end + _ONE_DAY
        else:
            # A due date inside a later rest period moves to the first
            # growing day after it.
            rest_start, rest_end = _current_or_next_window(
                start_month, end_month, next_due
            )
            if rest_start <= next_due:
                next_due = rest_end + _ONE_DAY

    if today < next_due:
        return TaskState(
            status="scheduled",
            is_due=False,
            next_due=next_due,
            days=(next_due - today).days,
        )
    if today == next_due:
        return TaskState(status="due", is_due=True, next_due=next_due, days=None)
    return TaskState(
        status="overdue",
        is_due=True,
        next_due=next_due,
        days=(today - next_due).days,
    )


def _counting_status(
    window: tuple[date, date],
    done_on: date | None,
    skipped_on: date | None,
) -> Literal["done", "skipped"] | None:
    """Return how a yearly window instance was handled, if at all."""
    start, end = window
    earliest = start - timedelta(days=YEARLY_LEAD_DAYS)
    candidates: tuple[tuple[date | None, Literal["done", "skipped"]], ...] = (
        (done_on, "done"),
        (skipped_on, "skipped"),
    )
    counted = [
        (value, status)
        for value, status in candidates
        if value is not None and earliest <= value <= end
    ]
    if not counted:
        return None
    # The latest counting date wins; on the same day a Done beats a Skip
    # because max() keeps the first maximal item.
    return max(counted, key=lambda item: item[0])[1]


def _yearly_state(
    schedule: Any,
    done_on: date | None,
    skipped_on: date | None,
    created_on: date,
    today: date,
) -> TaskState:
    start_month = schedule.start_month
    end_month = schedule.end_month
    start, end = _current_or_next_window(start_month, end_month, today)

    if start <= today:
        handled = _counting_status((start, end), done_on, skipped_on)
        if handled is None:
            return TaskState(
                status="due", is_due=True, next_due=start, days=None, window_end=end
            )
        next_start, _ = _month_window(start_month, end_month, start.year + 1)
        return TaskState(
            status=handled,
            is_due=False,
            next_due=next_start,
            days=None,
            window_end=end,
        )

    # A Done or Skip shortly before the window opens already handles it.
    upcoming = _counting_status((start, end), done_on, skipped_on)
    if upcoming is not None:
        next_start, _ = _month_window(start_month, end_month, start.year + 1)
        return TaskState(
            status=upcoming,
            is_due=False,
            next_due=next_start,
            days=None,
            window_end=end,
        )

    previous = _previous_window(start_month, end_month, start)
    if (
        created_on <= previous[1]
        and _counting_status(previous, done_on, skipped_on) is None
    ):
        return TaskState(
            status="missed", is_due=False, next_due=start, days=None, window_end=end
        )
    return TaskState(
        status="scheduled",
        is_due=False,
        next_due=start,
        days=(start - today).days,
        window_end=end,
    )


def compute_task_state(  # noqa: PLR0913
    *,
    schedule: Any,
    last_done_on: date | None,
    last_skipped_on: date | None,
    baseline_done_on: date | None,
    created_on: date,
    rest_period: Any,
    today: date,
) -> TaskState:
    """
    Compute a care task's state on ``today``.

    ``baseline_done_on`` counts like a Done. The rest period only affects
    interval tasks with ``growing_season_only`` set.
    """
    done_on = _latest(last_done_on, baseline_done_on)
    if schedule.kind == SCHEDULE_INTERVAL:
        return _interval_state(
            schedule,
            _latest(done_on, last_skipped_on),
            created_on,
            rest_period,
            today,
        )
    if schedule.kind == SCHEDULE_YEARLY:
        return _yearly_state(schedule, done_on, last_skipped_on, created_on, today)
    raise ValueError(f"Unknown schedule kind: {schedule.kind!r}")


def _local_date(timestamp: str, tz: tzinfo) -> date:
    """Convert an ISO timestamp to a calendar date in ``tz``; naive means UTC."""
    moment = datetime.fromisoformat(timestamp)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    return moment.astimezone(tz).date()


def _optional_date(value: str | None) -> date | None:
    return None if value is None else date.fromisoformat(value)


def task_state(task: Any, rest_period: Any, *, tz: tzinfo, today: date) -> TaskState:
    """
    Compute the state of a stored care task.

    Converts the task's ``last_done_at`` timestamp to a local date in ``tz``
    (the Home Assistant time zone) and parses its ISO date attributes before
    calling :func:`compute_task_state`.
    """
    last_done_at = task.last_done_at
    return compute_task_state(
        schedule=task.schedule,
        last_done_on=None if last_done_at is None else _local_date(last_done_at, tz),
        last_skipped_on=_optional_date(task.last_skipped_on),
        baseline_done_on=_optional_date(task.baseline_done_on),
        created_on=date.fromisoformat(task.created_on),
        rest_period=rest_period,
        today=today,
    )


@dataclass(frozen=True)
class ReadingState:
    """
    The state of one reading care task at one moment.

    ``triggered_at`` and ``rearmed_at`` are the values to persist.
    ``breach_since`` is when the reading last moved to the due side while the
    task was armed; it is runtime only. ``due_at`` is set while ``watching``
    with a running "only after" timer and is when the task becomes due if the
    reading stays on the due side.
    """

    status: TaskStatus
    is_due: bool
    triggered_at: datetime | None
    rearmed_at: datetime | None
    breach_since: datetime | None
    due_at: datetime | None


def is_waiting(last_done_at: datetime | None, rearmed_at: datetime | None) -> bool:
    """Return whether a Done is newer than the latest re-arm."""
    if last_done_at is None:
        return False
    return rearmed_at is None or last_done_at > rearmed_at


def _on_due_side(condition: str, reading: float, threshold: float) -> bool:
    if condition == "below":
        return reading < threshold
    return reading > threshold


def reading_task_state(  # noqa: PLR0911, PLR0913
    *,
    schedule: Any,
    reading: float | None,
    now: datetime,
    triggered_at: datetime | None,
    rearmed_at: datetime | None,
    last_done_at: datetime | None,
    breach_since: datetime | None,
) -> ReadingState:
    """
    Compute a reading care task's state for the current ``reading``.

    ``schedule`` needs ``condition`` (``below`` or ``above``), ``value``,
    ``reset_value`` (``None`` means ``value``) and ``for_minutes``.
    ``reading`` is the current value in the schedule's unit, or ``None``
    when there is no usable reading.

    * Armed, and the reading strictly on the due side of ``value`` for
      ``for_minutes`` (counted from ``breach_since``): due, ``triggered_at``
      is set. Until then the status is ``watching`` with ``due_at``. A
      reading that is not on the due side restarts the count.
    * Due, and the reading reaches ``reset_value``: no longer due and
      ``triggered_at`` is cleared. Between ``value`` and ``reset_value`` the
      task stays due.
    * A Done newer than ``rearmed_at`` makes the task ``waiting`` (not due)
      until the reading reaches ``reset_value``; then ``rearmed_at`` is set
      and the task watches again.
    * Without a reading nothing changes: a due task stays due, a waiting task
      stays waiting, the count stops, and the status is ``no_reading``.
    """
    waiting = is_waiting(last_done_at, rearmed_at)
    if reading is None:
        return ReadingState(
            status="no_reading",
            is_due=triggered_at is not None and not waiting,
            triggered_at=triggered_at,
            rearmed_at=rearmed_at,
            breach_since=None,
            due_at=None,
        )

    condition = schedule.condition
    reset_value = (
        schedule.value if schedule.reset_value is None else schedule.reset_value
    )
    if not _on_due_side(condition, reading, reset_value):
        # The reading reached the reset value: whatever was due is over, and
        # a Done since the last re-arm has been answered.
        return ReadingState(
            status="watching",
            is_due=False,
            triggered_at=None,
            rearmed_at=now if waiting else rearmed_at,
            breach_since=None,
            due_at=None,
        )
    if waiting:
        return ReadingState(
            status="waiting",
            is_due=False,
            triggered_at=triggered_at,
            rearmed_at=rearmed_at,
            breach_since=None,
            due_at=None,
        )
    if triggered_at is not None:
        return ReadingState(
            status="due",
            is_due=True,
            triggered_at=triggered_at,
            rearmed_at=rearmed_at,
            breach_since=None,
            due_at=None,
        )
    if not _on_due_side(condition, reading, schedule.value):
        # Between the value and the reset value while armed: not on the due
        # side, so any running count starts over.
        return ReadingState(
            status="watching",
            is_due=False,
            triggered_at=None,
            rearmed_at=rearmed_at,
            breach_since=None,
            due_at=None,
        )
    since = now if breach_since is None else breach_since
    due_at = since + timedelta(minutes=schedule.for_minutes)
    if now >= due_at:
        return ReadingState(
            status="due",
            is_due=True,
            triggered_at=now,
            rearmed_at=rearmed_at,
            breach_since=None,
            due_at=None,
        )
    return ReadingState(
        status="watching",
        is_due=False,
        triggered_at=None,
        rearmed_at=rearmed_at,
        breach_since=since,
        due_at=due_at,
    )
