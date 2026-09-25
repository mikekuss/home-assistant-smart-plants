"""Day/night edge scheduling for the illuminance controller (Phase 7 step 4b)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch
from zoneinfo import ZoneInfo

from custom_components.smart_plants.illuminance_controller import (
    IlluminancePlantController,
    next_daytime_edge,
)
from custom_components.smart_plants.models import IlluminanceConfig, SensorSource

BERLIN = ZoneInfo("Europe/Berlin")


def test_next_edge_picks_soonest_08_or_18() -> None:
    now = datetime(2026, 6, 1, 6, 30, tzinfo=BERLIN)
    assert next_daytime_edge(now) == datetime(2026, 6, 1, 8, 0, tzinfo=BERLIN)
    now = datetime(2026, 6, 1, 12, 0, tzinfo=BERLIN)
    assert next_daytime_edge(now) == datetime(2026, 6, 1, 18, 0, tzinfo=BERLIN)
    now = datetime(2026, 6, 1, 20, 0, tzinfo=BERLIN)
    assert next_daytime_edge(now) == datetime(2026, 6, 2, 8, 0, tzinfo=BERLIN)
    assert next_daytime_edge(datetime(2026, 6, 1, 8, tzinfo=BERLIN)) == datetime(
        2026, 6, 1, 18, tzinfo=BERLIN
    )
    assert next_daytime_edge(datetime(2026, 6, 1, 18, tzinfo=BERLIN)) == datetime(
        2026, 6, 2, 8, tzinfo=BERLIN
    )


def test_next_edge_across_spring_forward_uses_post_transition_offset() -> None:
    # Europe/Berlin springs forward 2026-03-29 02:00 CET -> 03:00 CEST.
    # An edge computed the evening before must land at 08:00 CEST (+02:00),
    # not a naive +24h that would drift the wall-clock hour.
    now = datetime(2026, 3, 28, 18, 30, tzinfo=BERLIN)
    edge = next_daytime_edge(now)
    assert (edge.year, edge.month, edge.day) == (2026, 3, 29)
    assert edge.hour == 8
    assert edge.utcoffset() == timedelta(hours=2)


def test_next_edge_across_fall_back_uses_post_transition_offset() -> None:
    # Europe/Berlin falls back 2026-10-25 03:00 CEST -> 02:00 CET.
    now = datetime(2026, 10, 24, 18, 30, tzinfo=BERLIN)
    edge = next_daytime_edge(now)
    assert edge.hour == 8
    assert edge.utcoffset() == timedelta(hours=1)


def test_controller_only_records_distinct_daytime_observations_at_dawn() -> None:
    controller = object.__new__(IlluminancePlantController)
    controller._config = IlluminanceConfig(
        sources=(SensorSource(entity_id="sensor.light"),),
        primary_entity_id="sensor.light",
        aggregation="primary",
    )
    controller._light_samples = []
    controller._previous_low_light = False
    tracker = SimpleNamespace(snapshots={})
    controller._tracker = tracker  # type: ignore[assignment]

    def observe(when: datetime, value: int = 100) -> None:
        utc = when.astimezone(UTC)
        tracker.snapshots = {
            "sensor.light": SimpleNamespace(
                entity_id="sensor.light",
                state=SimpleNamespace(
                    state=str(value), attributes={"unit_of_measurement": "lx"}
                ),
                last_valid_at=utc,
                grace_until=None,
            )
        }
        controller._evaluation_now = utc

    with patch(
        "custom_components.smart_plants.illuminance_controller.dt_util.as_local",
        side_effect=lambda value: value.astimezone(BERLIN),
    ):
        observe(datetime(2026, 3, 29, 7, 59, tzinfo=BERLIN))
        assert controller._evaluate_now().low_light.reason == "nighttime"
        assert controller._light_samples == []

        # The 08:00 edge with the old reading is not another observation.
        controller._evaluation_now = datetime(2026, 3, 29, 8, tzinfo=BERLIN)
        result = controller._evaluate_now()
        assert result.low_light.reason == "insufficient_daytime_samples"
        assert result.low_light.sample_count == 0

        observe(datetime(2026, 3, 29, 8, tzinfo=BERLIN))
        assert controller._evaluate_now().low_light.sample_count == 1
        controller._evaluation_now += timedelta(seconds=30)
        assert controller._evaluate_now().low_light.sample_count == 1

        observe(datetime(2026, 3, 29, 8, 1, tzinfo=BERLIN))
        result = controller._evaluate_now()
        assert result.low_light.reason == "low_light"
        assert result.low_light.sample_count == 2
