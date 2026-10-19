"""Unit tests for the pure care task schedule engine."""

from __future__ import annotations

from datetime import date
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest
from custom_components.smart_plants.care_schedule import (
    TaskState,
    add_interval,
    add_months,
    compute_task_state,
    is_resting,
    rest_period_bounds,
    task_state,
)

D = date.fromisoformat


def interval(
    every: int, unit: str, *, growing_season_only: bool = False
) -> SimpleNamespace:
    return SimpleNamespace(
        kind="interval",
        every=every,
        unit=unit,
        growing_season_only=growing_season_only,
    )


def yearly(start_month: int, end_month: int) -> SimpleNamespace:
    return SimpleNamespace(kind="yearly", start_month=start_month, end_month=end_month)


def rest(start_month: int, end_month: int) -> SimpleNamespace:
    return SimpleNamespace(start_month=start_month, end_month=end_month)


def scheduled(next_due: str, days: int, window_end: str | None = None) -> TaskState:
    return TaskState(
        "scheduled",
        is_due=False,
        next_due=D(next_due),
        days=days,
        window_end=None if window_end is None else D(window_end),
    )


def due(next_due: str, window_end: str | None = None) -> TaskState:
    return TaskState(
        "due",
        is_due=True,
        next_due=D(next_due),
        days=None,
        window_end=None if window_end is None else D(window_end),
    )


def overdue(next_due: str, days: int) -> TaskState:
    return TaskState("overdue", is_due=True, next_due=D(next_due), days=days)


def resting(resume_on: str) -> TaskState:
    return TaskState(
        "resting",
        is_due=False,
        next_due=D(resume_on),
        days=None,
        resume_on=D(resume_on),
    )


def yearly_result(status: str, next_due: str, window_end: str) -> TaskState:
    return TaskState(
        status,  # type: ignore[arg-type]
        is_due=False,
        next_due=D(next_due),
        days=None,
        window_end=D(window_end),
    )


def run(  # noqa: PLR0913
    schedule: SimpleNamespace,
    today: str,
    *,
    done: str | None = None,
    skipped: str | None = None,
    baseline: str | None = None,
    created: str = "2020-01-01",
    rest_period: SimpleNamespace | None = None,
) -> TaskState:
    return compute_task_state(
        schedule=schedule,
        last_done_on=None if done is None else D(done),
        last_skipped_on=None if skipped is None else D(skipped),
        baseline_done_on=None if baseline is None else D(baseline),
        created_on=D(created),
        rest_period=rest_period,
        today=D(today),
    )


WINTER = rest(11, 2)  # November through February, across New Year
SUMMER = rest(6, 8)  # June through August
WEEKLY_GROWING = interval(7, "days", growing_season_only=True)
MONTHLY_GROWING = interval(1, "months", growing_season_only=True)


INTERVAL_CASES = [
    # No anchor: due on the day the task was created.
    (
        "new task is due on creation",
        interval(7, "days"),
        "2026-04-01",
        {"created": "2026-04-01"},
        due("2026-04-01"),
    ),
    (
        "new task created in the future",
        interval(7, "days"),
        "2026-04-01",
        {"created": "2026-04-03"},
        scheduled("2026-04-03", 2),
    ),
    (
        "new task left undone",
        interval(7, "days"),
        "2026-04-04",
        {"created": "2026-04-01"},
        overdue("2026-04-01", 3),
    ),
    # Day, week, month, and year arithmetic.
    (
        "days scheduled",
        interval(7, "days"),
        "2026-03-05",
        {"done": "2026-03-01"},
        scheduled("2026-03-08", 3),
    ),
    (
        "days due",
        interval(7, "days"),
        "2026-03-08",
        {"done": "2026-03-01"},
        due("2026-03-08"),
    ),
    (
        "days overdue",
        interval(7, "days"),
        "2026-03-10",
        {"done": "2026-03-01"},
        overdue("2026-03-08", 2),
    ),
    (
        "weeks are seven days",
        interval(2, "weeks"),
        "2026-03-01",
        {"done": "2026-03-01"},
        scheduled("2026-03-15", 14),
    ),
    (
        "months add calendar months",
        interval(3, "months"),
        "2026-03-15",
        {"done": "2026-03-15"},
        scheduled("2026-06-15", 92),
    ),
    (
        "month end clamps to February",
        interval(1, "months"),
        "2026-02-01",
        {"done": "2026-01-31"},
        scheduled("2026-02-28", 27),
    ),
    (
        "month end clamps to leap day",
        interval(1, "months"),
        "2028-02-29",
        {"done": "2028-01-31"},
        due("2028-02-29"),
    ),
    (
        "month end clamps to 30 days",
        interval(1, "months"),
        "2026-04-30",
        {"done": "2026-03-31"},
        due("2026-04-30"),
    ),
    (
        "months cross New Year",
        interval(2, "months"),
        "2026-12-01",
        {"done": "2026-11-30"},
        scheduled("2027-01-30", 60),
    ),
    (
        "years are twelve months",
        interval(1, "years"),
        "2026-06-01",
        {"done": "2026-06-01"},
        scheduled("2027-06-01", 365),
    ),
    (
        "leap day plus a year clamps",
        interval(1, "years"),
        "2029-02-28",
        {"done": "2028-02-29"},
        due("2029-02-28"),
    ),
    (
        "leap day plus four years",
        interval(4, "years"),
        "2032-02-29",
        {"done": "2028-02-29"},
        due("2032-02-29"),
    ),
    (
        "maximum interval",
        interval(999, "days"),
        "2026-01-01",
        {"done": "2026-01-01"},
        scheduled("2028-09-26", 999),
    ),
    # The anchor is the latest of Done, Skip, and baseline.
    (
        "skip after done is the anchor",
        interval(7, "days"),
        "2026-03-12",
        {"done": "2026-03-01", "skipped": "2026-03-05"},
        due("2026-03-12"),
    ),
    (
        "done after skip is the anchor",
        interval(7, "days"),
        "2026-03-12",
        {"done": "2026-03-05", "skipped": "2026-03-01"},
        due("2026-03-12"),
    ),
    (
        "baseline counts like a done",
        interval(7, "days"),
        "2026-03-12",
        {"baseline": "2026-03-05"},
        due("2026-03-12"),
    ),
    (
        "baseline older than done",
        interval(7, "days"),
        "2026-03-12",
        {"done": "2026-03-05", "baseline": "2026-02-01"},
        due("2026-03-12"),
    ),
    (
        "baseline newer than done",
        interval(7, "days"),
        "2026-03-12",
        {"done": "2026-02-01", "baseline": "2026-03-05"},
        due("2026-03-12"),
    ),
    (
        "anchor ignores created on",
        interval(7, "days"),
        "2026-03-12",
        {"done": "2026-03-05", "created": "2026-03-10"},
        due("2026-03-12"),
    ),
    # Done counts from the actual day, early or late.
    (
        "early done restarts from that day",
        interval(7, "days"),
        "2026-03-04",
        {"done": "2026-03-04"},
        scheduled("2026-03-11", 7),
    ),
    (
        "late done restarts from that day",
        interval(7, "days"),
        "2026-03-11",
        {"done": "2026-03-11"},
        scheduled("2026-03-18", 7),
    ),
    (
        "late skip restarts from that day",
        interval(7, "days"),
        "2026-03-11",
        {"done": "2026-03-01", "skipped": "2026-03-11"},
        scheduled("2026-03-18", 7),
    ),
    # Daylight saving changes do not shift calendar dates.
    (
        "spring DST day is due",
        interval(1, "days"),
        "2026-03-29",
        {"done": "2026-03-28"},
        due("2026-03-29"),
    ),
    (
        "week across autumn DST",
        interval(1, "weeks"),
        "2026-10-25",
        {"done": "2026-10-22"},
        scheduled("2026-10-29", 4),
    ),
    (
        "US spring DST day",
        interval(1, "days"),
        "2026-03-08",
        {"done": "2026-03-07"},
        due("2026-03-08"),
    ),
    # The rest period is ignored without growing_season_only or a rest period.
    (
        "rest ignored without growing season flag",
        interval(7, "days"),
        "2026-12-10",
        {"done": "2026-12-01", "rest_period": WINTER},
        overdue("2026-12-08", 2),
    ),
    (
        "growing season flag without rest period",
        WEEKLY_GROWING,
        "2026-12-10",
        {"done": "2026-12-01"},
        overdue("2026-12-08", 2),
    ),
    # Growing season only, rest period across New Year.
    (
        "resting in December",
        WEEKLY_GROWING,
        "2026-12-15",
        {"done": "2026-10-01", "rest_period": WINTER},
        resting("2027-03-01"),
    ),
    (
        "resting in January",
        WEEKLY_GROWING,
        "2027-01-10",
        {"done": "2026-12-30", "rest_period": WINTER},
        resting("2027-03-01"),
    ),
    (
        "resting on last rest day",
        WEEKLY_GROWING,
        "2027-02-28",
        {"done": "2026-10-01", "rest_period": WINTER},
        resting("2027-03-01"),
    ),
    (
        "resting in a leap February",
        WEEKLY_GROWING,
        "2028-02-29",
        {"done": "2027-10-01", "rest_period": WINTER},
        resting("2028-03-01"),
    ),
    (
        "resting on first rest day",
        WEEKLY_GROWING,
        "2026-11-01",
        {"done": "2026-10-28", "rest_period": WINTER},
        resting("2027-03-01"),
    ),
    (
        "resting new task",
        WEEKLY_GROWING,
        "2026-12-01",
        {"created": "2026-12-01", "rest_period": WINTER},
        resting("2027-03-01"),
    ),
    (
        "next due inside rest moves to its end",
        MONTHLY_GROWING,
        "2026-10-25",
        {"done": "2026-10-20", "rest_period": WINTER},
        scheduled("2027-03-01", 127),
    ),
    (
        "next due inside a later rest moves to its end",
        interval(25, "months", growing_season_only=True),
        "2026-10-25",
        {"done": "2026-10-15", "rest_period": WINTER},
        scheduled("2029-03-01", 858),
    ),
    (
        "next due two rests ahead moves to its end",
        interval(2, "years", growing_season_only=True),
        "2027-03-05",
        {"done": "2026-12-10", "rest_period": WINTER},
        scheduled("2029-03-01", 727),
    ),
    (
        "next due before rest is unchanged",
        WEEKLY_GROWING,
        "2026-10-20",
        {"done": "2026-10-20", "rest_period": WINTER},
        scheduled("2026-10-27", 7),
    ),
    (
        "next due after rest is unchanged",
        interval(5, "months", growing_season_only=True),
        "2026-10-20",
        {"done": "2026-10-20", "rest_period": WINTER},
        scheduled("2027-03-20", 151),
    ),
    (
        "next due past whole rest period",
        interval(1, "years", growing_season_only=True),
        "2026-10-20",
        {"done": "2026-10-20", "rest_period": WINTER},
        scheduled("2027-10-20", 365),
    ),
    (
        "overdue before the rest period",
        MONTHLY_GROWING,
        "2026-10-10",
        {"done": "2026-09-01", "rest_period": WINTER},
        overdue("2026-10-01", 9),
    ),
    (
        "overdue task enters rest",
        MONTHLY_GROWING,
        "2026-11-01",
        {"done": "2026-09-01", "rest_period": WINTER},
        resting("2027-03-01"),
    ),
    (
        "overdue cleared on first growing day",
        MONTHLY_GROWING,
        "2027-03-01",
        {"done": "2026-09-01", "rest_period": WINTER},
        due("2027-03-01"),
    ),
    (
        "overdue again after first growing day",
        MONTHLY_GROWING,
        "2027-03-03",
        {"done": "2026-09-01", "rest_period": WINTER},
        overdue("2027-03-01", 2),
    ),
    (
        "due date inside rest is due afterwards",
        MONTHLY_GROWING,
        "2027-03-01",
        {"done": "2026-10-20", "rest_period": WINTER},
        due("2027-03-01"),
    ),
    (
        "task created during rest",
        WEEKLY_GROWING,
        "2027-03-05",
        {"created": "2027-01-10", "rest_period": WINTER},
        overdue("2027-03-01", 4),
    ),
    (
        "done after rest counts normally",
        WEEKLY_GROWING,
        "2027-03-05",
        {"done": "2027-03-02", "rest_period": WINTER},
        scheduled("2027-03-09", 4),
    ),
    (
        "long overdue clears to last rest end",
        MONTHLY_GROWING,
        "2027-03-02",
        {"done": "2025-01-01", "rest_period": WINTER},
        overdue("2027-03-01", 1),
    ),
    (
        "anchor stays when rest is long past",
        WEEKLY_GROWING,
        "2027-10-10",
        {"done": "2027-10-01", "rest_period": WINTER},
        overdue("2027-10-08", 2),
    ),
    # Growing season only, rest period within one year.
    (
        "resting in summer",
        WEEKLY_GROWING,
        "2026-07-15",
        {"done": "2026-05-01", "rest_period": SUMMER},
        resting("2026-09-01"),
    ),
    (
        "summer rest pushes next due",
        WEEKLY_GROWING,
        "2026-05-28",
        {"done": "2026-05-28", "rest_period": SUMMER},
        scheduled("2026-09-01", 96),
    ),
    (
        "due after summer rest",
        WEEKLY_GROWING,
        "2026-09-01",
        {"done": "2026-05-01", "rest_period": SUMMER},
        due("2026-09-01"),
    ),
    (
        "winter after summer rest",
        WEEKLY_GROWING,
        "2027-01-20",
        {"done": "2027-01-10", "rest_period": SUMMER},
        overdue("2027-01-17", 3),
    ),
    (
        "single month rest",
        WEEKLY_GROWING,
        "2026-02-27",
        {"done": "2026-01-29", "rest_period": rest(2, 2)},
        resting("2026-03-01"),
    ),
]


@pytest.mark.parametrize(
    ("schedule", "today", "kwargs", "expected"),
    [pytest.param(*case[1:], id=case[0]) for case in INTERVAL_CASES],
)
def test_interval_schedule(
    schedule: SimpleNamespace,
    today: str,
    kwargs: dict[str, object],
    expected: TaskState,
) -> None:
    assert run(schedule, today, **kwargs) == expected  # type: ignore[arg-type]


SPRING = yearly(3, 5)  # March through May
WINTER_WINDOW = yearly(11, 2)  # November through February, across New Year


YEARLY_CASES = [
    # Before the window.
    (
        "before window, new task",
        SPRING,
        "2026-02-01",
        {"created": "2026-01-15"},
        scheduled("2026-03-01", 28, "2026-05-31"),
    ),
    (
        "before window, last window done",
        SPRING,
        "2026-02-01",
        {"done": "2025-04-10"},
        scheduled("2026-03-01", 28, "2026-05-31"),
    ),
    (
        "before window, last window skipped",
        SPRING,
        "2026-02-01",
        {"skipped": "2025-04-10"},
        scheduled("2026-03-01", 28, "2026-05-31"),
    ),
    (
        "before window, last window baseline",
        SPRING,
        "2026-02-01",
        {"baseline": "2025-04-10"},
        scheduled("2026-03-01", 28, "2026-05-31"),
    ),
    (
        "before window, done early for it",
        SPRING,
        "2026-02-01",
        {"done": "2026-01-20", "created": "2025-12-01"},
        scheduled("2026-03-01", 28, "2026-05-31"),
    ),
    (
        "before window, created after last window",
        SPRING,
        "2025-12-01",
        {"created": "2025-06-01"},
        scheduled("2026-03-01", 90, "2026-05-31"),
    ),
    (
        "before window, created on last window end",
        SPRING,
        "2026-02-01",
        {"created": "2025-05-31"},
        yearly_result("missed", "2026-03-01", "2026-05-31"),
    ),
    # Inside the window.
    ("first day of window", SPRING, "2026-03-01", {}, due("2026-03-01", "2026-05-31")),
    (
        "inside window, not done",
        SPRING,
        "2026-04-15",
        {"done": "2025-04-01"},
        due("2026-03-01", "2026-05-31"),
    ),
    ("last day of window", SPRING, "2026-05-31", {}, due("2026-03-01", "2026-05-31")),
    (
        "inside window, done",
        SPRING,
        "2026-04-15",
        {"done": "2026-04-02"},
        yearly_result("done", "2027-03-01", "2026-05-31"),
    ),
    (
        "inside window, done today",
        SPRING,
        "2026-04-15",
        {"done": "2026-04-15"},
        yearly_result("done", "2027-03-01", "2026-05-31"),
    ),
    (
        "inside window, skipped",
        SPRING,
        "2026-04-15",
        {"skipped": "2026-04-02"},
        yearly_result("skipped", "2027-03-01", "2026-05-31"),
    ),
    (
        "inside window, baseline",
        SPRING,
        "2026-04-15",
        {"baseline": "2026-03-20"},
        yearly_result("done", "2027-03-01", "2026-05-31"),
    ),
    (
        "skip after done wins",
        SPRING,
        "2026-04-15",
        {"done": "2026-03-10", "skipped": "2026-04-02"},
        yearly_result("skipped", "2027-03-01", "2026-05-31"),
    ),
    (
        "done after skip wins",
        SPRING,
        "2026-04-15",
        {"done": "2026-04-02", "skipped": "2026-03-10"},
        yearly_result("done", "2027-03-01", "2026-05-31"),
    ),
    (
        "done and skip on the same day",
        SPRING,
        "2026-04-15",
        {"done": "2026-04-02", "skipped": "2026-04-02"},
        yearly_result("done", "2027-03-01", "2026-05-31"),
    ),
    (
        "old skip does not hide done",
        SPRING,
        "2026-04-15",
        {"done": "2026-04-02", "skipped": "2025-04-02"},
        yearly_result("done", "2027-03-01", "2026-05-31"),
    ),
    (
        "old done does not hide skip",
        SPRING,
        "2026-04-15",
        {"done": "2025-04-02", "skipped": "2026-04-02"},
        yearly_result("skipped", "2027-03-01", "2026-05-31"),
    ),
    # A Done or Skip up to 60 days before the window opens counts for it.
    (
        "done 60 days early counts",
        SPRING,
        "2026-03-10",
        {"done": "2025-12-31"},
        yearly_result("done", "2027-03-01", "2026-05-31"),
    ),
    (
        "done 61 days early does not count",
        SPRING,
        "2026-03-10",
        {"done": "2025-12-30"},
        due("2026-03-01", "2026-05-31"),
    ),
    (
        "skip early counts",
        SPRING,
        "2026-03-10",
        {"skipped": "2026-02-15"},
        yearly_result("skipped", "2027-03-01", "2026-05-31"),
    ),
    (
        "leap year lead window",
        SPRING,
        "2028-03-10",
        {"done": "2027-12-31"},
        due("2028-03-01", "2028-05-31"),
    ),
    (
        "leap year lead window boundary",
        SPRING,
        "2028-03-10",
        {"done": "2028-01-01"},
        yearly_result("done", "2029-03-01", "2028-05-31"),
    ),
    # After the window closed.
    (
        "day after window, not done",
        SPRING,
        "2026-06-01",
        {},
        yearly_result("missed", "2027-03-01", "2027-05-31"),
    ),
    (
        "after window, not done",
        SPRING,
        "2026-09-15",
        {"done": "2025-04-01"},
        yearly_result("missed", "2027-03-01", "2027-05-31"),
    ),
    (
        "missed until next window opens",
        SPRING,
        "2027-02-28",
        {"done": "2025-04-01"},
        yearly_result("missed", "2027-03-01", "2027-05-31"),
    ),
    (
        "next window after missed is due",
        SPRING,
        "2027-03-01",
        {"done": "2025-04-01"},
        due("2027-03-01", "2027-05-31"),
    ),
    (
        "after window, done",
        SPRING,
        "2026-09-15",
        {"done": "2026-04-02"},
        scheduled("2027-03-01", 167, "2027-05-31"),
    ),
    (
        "after window, skipped",
        SPRING,
        "2026-09-15",
        {"skipped": "2026-05-31"},
        scheduled("2027-03-01", 167, "2027-05-31"),
    ),
    (
        "after window, done late does not count",
        SPRING,
        "2026-09-15",
        {"done": "2026-06-01"},
        yearly_result("missed", "2027-03-01", "2027-05-31"),
    ),
    (
        "after window, created inside it",
        SPRING,
        "2026-09-15",
        {"created": "2026-05-01"},
        yearly_result("missed", "2027-03-01", "2027-05-31"),
    ),
    (
        "after window, created after it",
        SPRING,
        "2026-09-15",
        {"created": "2026-06-01"},
        scheduled("2027-03-01", 167, "2027-05-31"),
    ),
    # Wrapping window across New Year.
    (
        "wrap: before window",
        WINTER_WINDOW,
        "2026-10-01",
        {"done": "2025-12-01"},
        scheduled("2026-11-01", 31, "2027-02-28"),
    ),
    (
        "wrap: due in November",
        WINTER_WINDOW,
        "2026-11-15",
        {"done": "2025-12-01"},
        due("2026-11-01", "2027-02-28"),
    ),
    (
        "wrap: due in January",
        WINTER_WINDOW,
        "2027-01-10",
        {"done": "2025-12-01"},
        due("2026-11-01", "2027-02-28"),
    ),
    (
        "wrap: done in December",
        WINTER_WINDOW,
        "2027-01-10",
        {"done": "2026-12-05"},
        yearly_result("done", "2027-11-01", "2027-02-28"),
    ),
    (
        "wrap: done in January",
        WINTER_WINDOW,
        "2027-02-10",
        {"done": "2027-01-05"},
        yearly_result("done", "2027-11-01", "2027-02-28"),
    ),
    (
        "wrap: done early in September",
        WINTER_WINDOW,
        "2026-12-01",
        {"done": "2026-09-02"},
        yearly_result("done", "2027-11-01", "2027-02-28"),
    ),
    (
        "wrap: too early in September",
        WINTER_WINDOW,
        "2026-12-01",
        {"done": "2026-09-01"},
        due("2026-11-01", "2027-02-28"),
    ),
    (
        "wrap: leap February is inside",
        WINTER_WINDOW,
        "2028-02-29",
        {"done": "2026-12-01"},
        due("2027-11-01", "2028-02-29"),
    ),
    (
        "wrap: missed after window",
        WINTER_WINDOW,
        "2027-03-05",
        {"done": "2025-12-01"},
        yearly_result("missed", "2027-11-01", "2028-02-29"),
    ),
    (
        "wrap: done previous window",
        WINTER_WINDOW,
        "2027-03-05",
        {"done": "2027-01-20"},
        scheduled("2027-11-01", 241, "2028-02-29"),
    ),
    (
        "wrap: new task before window",
        WINTER_WINDOW,
        "2026-10-01",
        {"created": "2026-09-01"},
        scheduled("2026-11-01", 31, "2027-02-28"),
    ),
    (
        "single month window",
        yearly(4, 4),
        "2026-04-30",
        {},
        due("2026-04-01", "2026-04-30"),
    ),
    (
        "full year window",
        yearly(1, 12),
        "2026-07-01",
        {"done": "2025-07-01"},
        due("2026-01-01", "2026-12-31"),
    ),
    (
        "full year window done",
        yearly(1, 12),
        "2026-07-01",
        {"done": "2026-02-01"},
        yearly_result("done", "2027-01-01", "2026-12-31"),
    ),
    # Daylight saving changes do not shift calendar dates.
    (
        "window opens on DST change",
        yearly(10, 10),
        "2026-10-25",
        {"done": "2025-10-25"},
        due("2026-10-01", "2026-10-31"),
    ),
    # The rest period never affects yearly tasks.
    (
        "rest period ignored",
        WINTER_WINDOW,
        "2026-12-01",
        {"rest_period": WINTER},
        due("2026-11-01", "2027-02-28"),
    ),
    (
        "rest period ignored after window",
        SPRING,
        "2026-07-01",
        {"rest_period": SUMMER},
        yearly_result("missed", "2027-03-01", "2027-05-31"),
    ),
]


@pytest.mark.parametrize(
    ("schedule", "today", "kwargs", "expected"),
    [pytest.param(*case[1:], id=case[0]) for case in YEARLY_CASES],
)
def test_yearly_schedule(
    schedule: SimpleNamespace,
    today: str,
    kwargs: dict[str, object],
    expected: TaskState,
) -> None:
    assert run(schedule, today, **kwargs) == expected  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("value", "months", "expected"),
    [
        ("2026-01-31", 1, "2026-02-28"),
        ("2028-01-31", 1, "2028-02-29"),
        ("2026-03-31", 1, "2026-04-30"),
        ("2026-12-15", 1, "2027-01-15"),
        ("2026-11-30", 3, "2027-02-28"),
        ("2028-02-29", 12, "2029-02-28"),
        ("2026-05-31", 0, "2026-05-31"),
        ("2026-01-15", 24, "2028-01-15"),
    ],
)
def test_add_months(value: str, months: int, expected: str) -> None:
    assert add_months(D(value), months) == D(expected)


def test_add_interval_rejects_unknown_unit() -> None:
    with pytest.raises(ValueError, match="hours"):
        add_interval(D("2026-01-01"), 1, "hours")


def test_compute_task_state_rejects_unknown_kind() -> None:
    with pytest.raises(ValueError, match="weekly"):
        run(SimpleNamespace(kind="weekly"), "2026-01-01")


@pytest.mark.parametrize(
    ("rest_period", "today", "bounds", "inside"),
    [
        pytest.param(None, "2026-12-01", None, False, id="no rest period"),
        pytest.param(
            WINTER,
            "2026-10-31",
            ("2026-11-01", "2027-02-28"),
            False,
            id="winter: before",
        ),
        pytest.param(
            WINTER,
            "2026-11-01",
            ("2026-11-01", "2027-02-28"),
            True,
            id="winter: first day",
        ),
        pytest.param(
            WINTER,
            "2026-12-31",
            ("2026-11-01", "2027-02-28"),
            True,
            id="winter: New Year's Eve",
        ),
        pytest.param(
            WINTER,
            "2027-01-01",
            ("2026-11-01", "2027-02-28"),
            True,
            id="winter: New Year's Day",
        ),
        pytest.param(
            WINTER,
            "2028-02-29",
            ("2027-11-01", "2028-02-29"),
            True,
            id="winter: leap day",
        ),
        pytest.param(
            WINTER,
            "2027-03-01",
            ("2027-11-01", "2028-02-29"),
            False,
            id="winter: after",
        ),
        pytest.param(
            SUMMER,
            "2026-05-31",
            ("2026-06-01", "2026-08-31"),
            False,
            id="summer: before",
        ),
        pytest.param(
            SUMMER,
            "2026-08-31",
            ("2026-06-01", "2026-08-31"),
            True,
            id="summer: last day",
        ),
        pytest.param(
            SUMMER,
            "2026-09-01",
            ("2027-06-01", "2027-08-31"),
            False,
            id="summer: after",
        ),
        pytest.param(
            rest(3, 2),
            "2026-02-15",
            ("2025-03-01", "2026-02-28"),
            True,
            id="eleven-month wrap",
        ),
    ],
)
def test_rest_period_helpers(
    rest_period: SimpleNamespace | None,
    today: str,
    bounds: tuple[str, str] | None,
    inside: bool,  # noqa: FBT001
) -> None:
    expected = None if bounds is None else (D(bounds[0]), D(bounds[1]))
    assert rest_period_bounds(rest_period, D(today)) == expected
    assert is_resting(rest_period, D(today)) is inside


def stored_task(
    schedule: SimpleNamespace,
    *,
    last_done_at: str | None = None,
    last_skipped_on: str | None = None,
    baseline_done_on: str | None = None,
    created_on: str = "2026-01-01",
) -> SimpleNamespace:
    return SimpleNamespace(
        schedule=schedule,
        last_done_at=last_done_at,
        last_skipped_on=last_skipped_on,
        baseline_done_on=baseline_done_on,
        created_on=created_on,
    )


@pytest.mark.parametrize(
    ("last_done_at", "tz", "expected_next_due"),
    [
        # 20:30 UTC is 09:30 the next morning in Auckland (UTC+13 in October).
        pytest.param(
            "2026-10-19T20:30:00+00:00",
            "Pacific/Auckland",
            "2026-10-21",
            id="positive offset next day",
        ),
        pytest.param(
            "2026-10-19T20:30:00Z", "Pacific/Auckland", "2026-10-21", id="Z suffix"
        ),
        pytest.param(
            "2026-10-19T20:30:00",
            "Pacific/Auckland",
            "2026-10-21",
            id="naive means UTC",
        ),
        pytest.param(
            "2026-10-19T20:30:00+00:00", "UTC", "2026-10-20", id="UTC same day"
        ),
        # 03:00 UTC is still the previous evening in New York.
        pytest.param(
            "2026-10-20T03:00:00+00:00",
            "America/New_York",
            "2026-10-20",
            id="negative offset previous day",
        ),
        # Berlin moves from UTC+2 to UTC+1 on 2026-10-25.
        pytest.param(
            "2026-10-24T22:30:00+00:00",
            "Europe/Berlin",
            "2026-10-26",
            id="before autumn DST change",
        ),
        pytest.param(
            "2026-10-25T22:30:00+00:00",
            "Europe/Berlin",
            "2026-10-26",
            id="after autumn DST change",
        ),
        pytest.param(
            "2026-03-28T23:30:00+00:00",
            "Europe/Berlin",
            "2026-03-30",
            id="spring DST change",
        ),
    ],
)
def test_task_state_converts_done_timestamp_to_local_date(
    last_done_at: str, tz: str, expected_next_due: str
) -> None:
    state = task_state(
        stored_task(interval(1, "days"), last_done_at=last_done_at),
        None,
        tz=ZoneInfo(tz),
        today=D("2026-01-01"),
    )
    assert state.next_due == D(expected_next_due)


def test_task_state_parses_iso_dates() -> None:
    task = stored_task(
        interval(7, "days", growing_season_only=True),
        last_skipped_on="2026-10-20",
        baseline_done_on="2026-10-10",
        created_on="2026-09-01",
    )
    tz = ZoneInfo("Pacific/Auckland")
    assert task_state(task, None, tz=tz, today=D("2026-10-25")) == scheduled(
        "2026-10-27", 2
    )
    assert task_state(task, WINTER, tz=tz, today=D("2026-12-01")) == resting(
        "2027-03-01"
    )


def test_task_state_without_any_dates_uses_created_on() -> None:
    task = stored_task(yearly(3, 5), created_on="2026-06-01")
    state = task_state(task, None, tz=ZoneInfo("UTC"), today=D("2026-09-01"))
    assert state == scheduled("2027-03-01", 181, "2027-05-31")
