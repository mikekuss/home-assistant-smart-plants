"""Behaviour kept while the runtime work stops growing with the plant count."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import patch

from custom_components.smart_plants.care import care_summary
from custom_components.smart_plants.const import DOMAIN
from custom_components.smart_plants.manager import SmartPlantsManager, snooze_change
from custom_components.smart_plants.reading_tracker import ReadingTracker
from custom_components.smart_plants.source_tracker import SourceTracker
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from .test_websocket_api import _setup

PERCENT = {"unit_of_measurement": "%"}
CELSIUS = {"unit_of_measurement": "°C"}
READING = {
    "kind": "reading",
    "source": {"role": "temperature"},
    "condition": "below",
    "value": 5.0,
    "unit": "°C",
    "for_minutes": 0,
    "reset_value": None,
}


async def _plant_with_task(
    hass: HomeAssistant, manager: SmartPlantsManager, name: str, temperature: str
) -> tuple[str, str]:
    hass.states.async_set(temperature, "18", CELSIUS)
    plant = await manager.async_create_plant(name=name)
    plant = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": temperature}],
    )
    plant, task = await manager.async_create_care_task(
        plant.id,
        expected_revision=plant.revision,
        task_type="winter_protection",
        name=None,
        schedule=READING,
        instructions=None,
        baseline_done_on=None,
    )
    await hass.async_block_till_done()
    return plant.id, task.id


def _due(hass: HomeAssistant, plant_id: str, task_id: str) -> str:
    entity_id = er.async_get(hass).async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant_id}:care_task:{task_id}:due"
    )
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    return state.state


def _registry_listeners(hass: HomeAssistant) -> int:
    return hass.bus.async_listeners().get(er.EVENT_ENTITY_REGISTRY_UPDATED, 0)


async def test_plant_change_evaluates_only_that_plants_reading_tasks(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    first, first_task = await _plant_with_task(
        hass, manager, "Aloe", "sensor.mock_temperature_1"
    )
    second, second_task = await _plant_with_task(
        hass, manager, "Office Aloe", "sensor.mock_temperature_2"
    )

    evaluate = ReadingTracker._evaluate
    evaluated: list[str] = []

    def _counting(self: ReadingTracker, task_id: str, now: datetime) -> bool:
        evaluated.append(task_id)
        return evaluate(self, task_id, now)

    until = datetime.now(UTC) + timedelta(days=1)
    with patch.object(ReadingTracker, "_evaluate", _counting):
        await manager.async_apply_plant_changes([(first, snooze_change(until))])
        await hass.async_block_till_done()
    assert evaluated == [first_task]

    # Each plant's task still follows its own sensor.
    hass.states.async_set("sensor.mock_temperature_2", "2", CELSIUS)
    await hass.async_block_till_done()
    assert _due(hass, first, first_task) == "off"
    assert _due(hass, second, second_task) == "on"


async def test_deleted_plant_leaves_no_reading_subscription(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant_id, _task_id = await _plant_with_task(
        hass, manager, "Aloe", "sensor.mock_temperature_1"
    )
    tracker = manager.reading_tracker
    assert tracker is not None
    assert plant_id in tracker._role_subscriptions
    plant = manager.get_plant(plant_id)
    await manager.async_delete_plant(plant_id, expected_revision=plant.revision)
    await hass.async_block_till_done()
    assert tracker._role_subscriptions == {}
    assert tracker._tracked == {}
    assert plant_id not in tracker._plant_tasks


async def test_only_configured_roles_get_a_controller(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    assert set(manager._controllers[plant.id]) == {"moisture"}
    assert manager.get_role_controller(plant.id, "temperature") is None

    hass.states.async_set("sensor.mock_temperature", "18", CELSIUS)
    await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_temperature"}],
    )
    await hass.async_block_till_done()
    controller = manager.get_role_controller(plant.id, "temperature")
    assert controller is not None
    assert controller.current_evaluation.computed_available is True

    # The plant problem sensor listens to the new controller: a temperature
    # sensor that stops reporting shows up in its input problems.
    stale_id = er.async_get(hass).async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:sensor_stale"
    )
    assert stale_id is not None
    hass.states.async_set("sensor.mock_temperature", "unavailable", CELSIUS)
    await hass.async_block_till_done()
    state = hass.states.get(stale_id)
    assert state is not None
    assert state.attributes["input_problems"] == {"temperature": "unavailable"}


async def test_role_configured_while_paused_starts_with_the_plant(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    plant = await manager.async_disable_plant(
        plant.id, expected_revision=plant.revision
    )
    hass.states.async_set("sensor.mock_temperature", "18", CELSIUS)
    plant = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_temperature"}],
    )
    await hass.async_block_till_done()
    await manager.async_reenable_plant(plant.id, expected_revision=plant.revision)
    await hass.async_block_till_done()
    controller = manager.get_role_controller(plant.id, "temperature")
    assert controller is not None
    hass.states.async_set("sensor.mock_temperature", "2", CELSIUS)
    await hass.async_block_till_done()
    assert controller.current_evaluation.temperature_stress.temperature_stress


async def test_source_trackers_share_one_registry_listener(
    hass: HomeAssistant,
) -> None:
    baseline = _registry_listeners(hass)
    changes: list[str] = []

    def _on_change(index: int) -> Callable[[datetime], None]:
        return lambda _now: changes.append(f"tracker {index}")

    trackers = [
        SourceTracker(hass, is_valid=lambda _state: True, on_change=_on_change(index))
        for index in range(3)
    ]
    assert _registry_listeners(hass) == baseline + 1

    registry = er.async_get(hass)
    entry = registry.async_get_or_create("sensor", "test", "moisture_1")
    hass.states.async_set(entry.entity_id, "40", PERCENT)
    source = type(
        "Source", (), {"entity_id": entry.entity_id, "registry_id": entry.id}
    )()
    for tracker in trackers:
        tracker.configure([source], stale_after=timedelta(hours=1))
        tracker.start()

    # A rename reaches every tracker, in creation order, through the shared
    # listener.
    registry.async_update_entity(entry.entity_id, new_entity_id="sensor.mock_renamed")
    await hass.async_block_till_done()
    assert changes == ["tracker 0", "tracker 1", "tracker 2"]
    assert all(
        snapshot.entity_id == "sensor.mock_renamed"
        for tracker in trackers
        for snapshot in tracker.snapshots.values()
    )

    for tracker in trackers:
        tracker.close()
    tracker.close()
    assert _registry_listeners(hass) == baseline

    # A new tracker after all were closed listens again.
    later = SourceTracker(hass, is_valid=lambda _state: True, on_change=lambda _: None)
    assert _registry_listeners(hass) == baseline + 1
    later.close()
    assert _registry_listeners(hass) == baseline


async def test_failing_tracker_does_not_stop_the_others(hass: HomeAssistant) -> None:
    seen: list[int] = []
    first = SourceTracker(hass, is_valid=lambda _s: True, on_change=lambda _: None)
    second = SourceTracker(hass, is_valid=lambda _s: True, on_change=lambda _: None)

    def _raise(_event: Any) -> None:
        raise RuntimeError("boom")

    first.handle_registry = _raise  # type: ignore[method-assign]
    second.handle_registry = lambda _event: seen.append(2)  # type: ignore[method-assign]
    er.async_get(hass).async_get_or_create("sensor", "test", "moisture_2")
    await hass.async_block_till_done()
    assert seen == [2]
    first.close()
    second.close()


async def test_care_summary_is_derived_once_per_record(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    for day in (3, 1, 2):
        plant, _event = await manager.async_add_watering(
            plant.id,
            expected_revision=None,
            occurred_at=f"2026-01-0{day}T08:00:00+00:00",
            note=None,
        )
    expected = care_summary(plant.care_events)
    assert expected["last_watered_at"] == "2026-01-03T08:00:00+00:00"

    with patch(
        "custom_components.smart_plants.models.care_summary", wraps=care_summary
    ) as derive:
        assert plant.care_summary() == expected
        assert plant.care_summary() == expected
        assert derive.call_count == 1
        # A newer record of the plant derives its own summary.
        newer = replace(plant, care_events=plant.care_events[:1])
        assert newer.care_summary() == care_summary(plant.care_events[:1])
        assert derive.call_count == 2
    # The cache is not part of the record's identity or equality.
    assert replace(plant) == plant
    summary = plant.care_summary()
    summary["watering_count"] = 0
    assert plant.care_summary() == expected


async def test_plant_list_leaves_the_care_history_to_the_plant_page(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    plant, event = await manager.async_add_watering(
        plant.id,
        expected_revision=None,
        occurred_at="2026-01-02T08:00:00+00:00",
        note=None,
    )
    client = await hass_ws_client(hass)

    await client.send_json_auto_id({"type": "smart_plants/plants/list"})
    listed = (await client.receive_json())["result"]["plants"]
    expected = plant.as_view()
    del expected["care_events"]
    assert listed == [expected]

    await client.send_json_auto_id({"type": "smart_plants/plants/overview"})
    (overview,) = (await client.receive_json())["result"]["plants"]
    assert overview["last_watered_at"] == event.occurred_at

    await client.send_json_auto_id(
        {"type": "smart_plants/care/list", "plant_id": plant.id}
    )
    history = (await client.receive_json())["result"]
    assert [row["id"] for row in history["events"]] == [event.id]
    assert history["summary"]["last_watered_at"] == event.occurred_at


async def test_health_score_follows_a_role_configured_later(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    hass.states.async_set("sensor.mock_moisture", "40", PERCENT)
    hass.states.async_set("sensor.mock_temperature", "20", CELSIUS)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await manager.async_set_role_sources(
        plant.id,
        role="moisture",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_moisture"}],
    )
    await hass.async_block_till_done()
    entity_id = er.async_get(hass).async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:health_score"
    )
    assert entity_id is not None
    await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_temperature"}],
    )
    await hass.async_block_till_done()
    comfortable = hass.states.get(entity_id)
    assert comfortable is not None

    # A temperature far out of range lowers the score at once.
    hass.states.async_set("sensor.mock_temperature", "60", CELSIUS)
    await hass.async_block_till_done()
    hot = hass.states.get(entity_id)
    assert hot is not None
    (health,) = [
        entity
        for entity in manager.entities_for_plant_on_platform("sensor", plant.id)
        if entity.entity_id == entity_id
    ]
    assert hot.state == str(health.native_value)
    assert float(hot.state) < float(comfortable.state)


async def test_kept_role_entity_attaches_to_a_controller_created_later(
    hass: HomeAssistant,
) -> None:
    # An entity whose registry entry exists is created even before its role
    # has a configuration, so it has no controller yet. It follows the
    # controller created when the role is configured.
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    registry = er.async_get(hass)
    stress = registry.async_get_or_create(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:temperature_stress"
    )
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    manager = entry.runtime_data.manager
    plant = manager.get_plant(plant.id)
    assert manager.get_role_controller(plant.id, "temperature") is None
    assert hass.states.get(stress.entity_id) is not None

    hass.states.async_set("sensor.mock_temperature", "20", CELSIUS)
    await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_temperature"}],
    )
    await hass.async_block_till_done()
    state = hass.states.get(stress.entity_id)
    assert state is not None
    assert state.state == "off"
    hass.states.async_set("sensor.mock_temperature", "60", CELSIUS)
    await hass.async_block_till_done()
    state = hass.states.get(stress.entity_id)
    assert state is not None
    assert state.state == "on"
