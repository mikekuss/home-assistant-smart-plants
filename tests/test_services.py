"""Smart Plants actions: log_care and skip_care_task."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any
from unittest.mock import patch

import pytest
import voluptuous as vol
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantRecord
from custom_components.smart_plants.services import (
    SERVICE_GET_REPORT,
    SERVICE_LOG_CARE,
    SERVICE_SKIP_CARE_TASK,
    SERVICE_SNOOZE,
    SERVICE_UNSNOOZE,
    async_setup_services,
)
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry

from tests.helpers import plant_device

INTERVAL = {
    "kind": "interval",
    "every": 4,
    "unit": "weeks",
    "growing_season_only": False,
}


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _manager(entry: MockConfigEntry) -> SmartPlantsManager:
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


async def _plant(hass: HomeAssistant, entry: MockConfigEntry, name: str) -> str:
    plant = await _manager(entry).async_create_plant(name=name)
    await hass.async_block_till_done()
    return plant.id


def _device_id(hass: HomeAssistant, plant_id: str) -> str:
    device = plant_device(dr.async_get(hass), plant_id)
    assert device is not None
    return device.id


async def _task(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    plant_id: str,
    task_type: str = "fertilize",
) -> tuple[str, str]:
    """Create a care task and its due entity; return (task_id, entity_id)."""
    manager = _manager(entry)
    plant = manager.get_plant(plant_id)
    _updated, task = await manager.async_create_care_task(
        plant_id,
        expected_revision=plant.revision,
        task_type=task_type,
        name="Mist leaves" if task_type == "custom" else None,
        schedule=INTERVAL,
        instructions=None,
        baseline_done_on=None,
    )
    registry_entry = er.async_get(hass).async_get_or_create(
        "binary_sensor",
        DOMAIN,
        f"{DOMAIN}:{plant_id}:care_task:{task.id}:due",
        config_entry=entry,
        suggested_object_id=f"{plant.name}_{task_type}_due",
    )
    return task.id, registry_entry.entity_id


def _plant_record(entry: MockConfigEntry, plant_id: str) -> PlantRecord:
    return _manager(entry).get_plant(plant_id)


async def _call(hass: HomeAssistant, service: str, data: dict[str, Any]) -> None:
    await hass.services.async_call(DOMAIN, service, data, blocking=True)


async def _expect_error(
    hass: HomeAssistant, service: str, data: dict[str, Any], key: str
) -> ServiceValidationError:
    with pytest.raises(ServiceValidationError) as info:
        await _call(hass, service, data)
    assert info.value.translation_domain == DOMAIN
    assert info.value.translation_key == key
    return info.value


# --- Registration -----------------------------------------------------------


async def test_actions_are_registered_once_and_survive_reload(
    hass: HomeAssistant,
) -> None:
    with patch(
        "custom_components.smart_plants.async_setup_services",
        wraps=async_setup_services,
    ) as setup_services:
        entry = await _setup(hass)
        assert await hass.config_entries.async_reload(entry.entry_id)
        await hass.async_block_till_done()

    assert setup_services.call_count == 1
    assert set(hass.services.async_services_for_domain(DOMAIN)) == {
        SERVICE_LOG_CARE,
        SERVICE_SKIP_CARE_TASK,
        SERVICE_SNOOZE,
        SERVICE_UNSNOOZE,
        SERVICE_GET_REPORT,
    }

    plant_id = await _plant(hass, entry, "Aloe")
    await _call(
        hass,
        SERVICE_LOG_CARE,
        {"device_id": _device_id(hass, plant_id), "kind": "watering"},
    )
    assert len(_plant_record(entry, plant_id).care_events) == 1


async def test_actions_stay_registered_after_unload_and_report_not_loaded(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    _task_id, entity_id = await _task(hass, entry, plant_id)
    device_id = _device_id(hass, plant_id)
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    assert hass.services.has_service(DOMAIN, SERVICE_LOG_CARE)
    assert hass.services.has_service(DOMAIN, SERVICE_SKIP_CARE_TASK)
    await _expect_error(
        hass,
        SERVICE_LOG_CARE,
        {"device_id": device_id, "kind": "watering"},
        "integration_not_loaded",
    )
    await _expect_error(
        hass,
        SERVICE_SKIP_CARE_TASK,
        {"entity_id": entity_id},
        "integration_not_loaded",
    )


# --- log_care with plant devices -------------------------------------------


async def test_log_watering_for_device_uses_action_provenance_without_revision(
    hass: HomeAssistant, freezer: Any
) -> None:
    now = dt_util.utcnow().replace(microsecond=0)
    freezer.move_to(now)
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    before = _plant_record(entry, plant_id)

    await _call(
        hass,
        SERVICE_LOG_CARE,
        {"device_id": _device_id(hass, plant_id), "kind": "watering"},
    )

    after = _plant_record(entry, plant_id)
    assert after.revision == before.revision + 1
    (event,) = after.care_events
    assert event.kind == "watering"
    assert event.provenance == "action"
    assert event.task_id is None
    assert event.payload == {"note": None}
    assert dt_util.parse_datetime(event.occurred_at) == now


async def test_logged_watering_pauses_needs_water(
    hass: HomeAssistant, freezer: Any
) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await manager.async_create_plant(name="Aloe")
    hass.states.async_set("sensor.mock_moisture", "10", {"unit_of_measurement": "%"})
    assigned = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.mock_moisture"}],
    )
    await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=assigned.revision,
        primary_entity_id="sensor.mock_moisture",
    )
    await hass.async_block_till_done()
    controller = manager.get_moisture_controller(plant.id)
    assert controller is not None
    assert controller.current_evaluation.needs_water is True

    now = dt_util.utcnow().replace(microsecond=0)
    freezer.move_to(now)
    await _call(
        hass,
        SERVICE_LOG_CARE,
        {"device_id": _device_id(hass, plant.id), "kind": "watering"},
    )
    await hass.async_block_till_done()

    evaluation = controller.current_evaluation
    assert evaluation.needs_water is False
    assert controller._watering_grace_deadline() == now + timedelta(hours=24)


@pytest.mark.parametrize(
    ("kind", "payload"),
    [
        (
            "fertilizing",
            {"product": None, "amount": None, "unit": None, "note": "Half dose"},
        ),
        ("pruning", {"part": None, "note": "Half dose"}),
        ("repotting", {"container": None, "medium": None, "note": "Half dose"}),
        ("task", {"note": "Half dose"}),
        ("note", {"text": "Half dose"}),
    ],
)
async def test_log_other_kinds_for_device(
    hass: HomeAssistant, kind: str, payload: dict[str, Any]
) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    occurred = dt_util.now().replace(microsecond=0) - timedelta(days=2)

    await _call(
        hass,
        SERVICE_LOG_CARE,
        {
            "device_id": _device_id(hass, plant_id),
            "kind": kind,
            "occurred_at": occurred.isoformat(),
            "note": "  Half dose  ",
        },
    )

    (event,) = _plant_record(entry, plant_id).care_events
    assert event.kind == kind
    assert event.provenance == "action"
    assert dict(event.payload) == payload
    assert dt_util.parse_datetime(event.occurred_at) == occurred


async def test_occurred_at_without_zone_is_local_time(
    hass: HomeAssistant,
) -> None:
    await hass.config.async_set_time_zone("Europe/Berlin")
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")

    await _call(
        hass,
        SERVICE_LOG_CARE,
        {
            "device_id": _device_id(hass, plant_id),
            "kind": "watering",
            "occurred_at": "2026-01-10 08:30:00",
        },
    )

    (event,) = _plant_record(entry, plant_id).care_events
    assert event.occurred_at == "2026-01-10T08:30:00+01:00"
    assert event.local_date == "2026-01-10"


async def test_log_care_for_multiple_devices(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    first = await _plant(hass, entry, "Aloe")
    second = await _plant(hass, entry, "Office Aloe")
    first_device = _device_id(hass, first)

    await _call(
        hass,
        SERVICE_LOG_CARE,
        {
            "device_id": [first_device, _device_id(hass, second), first_device],
            "kind": "watering",
        },
    )

    for plant_id in (first, second):
        (event,) = _plant_record(entry, plant_id).care_events
        assert event.provenance == "action"


async def test_log_care_device_requires_kind(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    await _expect_error(
        hass,
        SERVICE_LOG_CARE,
        {"device_id": _device_id(hass, plant_id)},
        "kind_required",
    )
    await _expect_error(
        hass,
        SERVICE_LOG_CARE,
        {"device_id": _device_id(hass, plant_id), "kind": "note", "note": "   "},
        "note_required",
    )
    assert _plant_record(entry, plant_id).care_events == ()


async def test_log_care_rejects_unknown_kind(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    with pytest.raises(vol.Invalid):
        await _call(
            hass,
            SERVICE_LOG_CARE,
            {"device_id": _device_id(hass, plant_id), "kind": "misting"},
        )
    with pytest.raises(vol.Invalid):
        await _call(
            hass,
            SERVICE_LOG_CARE,
            {
                "device_id": _device_id(hass, plant_id),
                "kind": "watering",
                "note": "x" * 501,
            },
        )
    assert _plant_record(entry, plant_id).care_events == ()


async def test_log_care_rejects_future_time(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    future = dt_util.now() + timedelta(hours=1)
    await _expect_error(
        hass,
        SERVICE_LOG_CARE,
        {
            "device_id": _device_id(hass, plant_id),
            "kind": "watering",
            "occurred_at": future.isoformat(),
        },
        "future_time",
    )
    assert _plant_record(entry, plant_id).care_events == ()


async def test_log_care_stores_a_slightly_future_time_as_now(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    ahead = dt_util.now() + timedelta(minutes=2)
    await _call(
        hass,
        SERVICE_LOG_CARE,
        {
            "device_id": _device_id(hass, plant_id),
            "kind": "watering",
            "occurred_at": ahead.isoformat(),
        },
    )
    (event,) = _plant_record(entry, plant_id).care_events
    stored = dt_util.parse_datetime(event.occurred_at)
    assert stored is not None
    assert stored <= dt_util.now()
    assert stored > dt_util.now() - timedelta(minutes=1)


async def test_log_care_rejects_disabled_plant(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    device_id = _device_id(hass, plant_id)
    plant = _plant_record(entry, plant_id)
    await _manager(entry).async_disable_plant(
        plant_id, expected_revision=plant.revision
    )
    await hass.async_block_till_done()

    error = await _expect_error(
        hass,
        SERVICE_LOG_CARE,
        {"device_id": device_id, "kind": "watering"},
        "plant_disabled",
    )
    assert error.translation_placeholders == {"plant": "Aloe"}
    assert _plant_record(entry, plant_id).care_events == ()


async def test_log_care_rejects_unknown_and_foreign_devices(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    other_entry = MockConfigEntry(domain="mock_other")
    other_entry.add_to_hass(hass)
    foreign = dr.async_get(hass).async_get_or_create(
        config_entry_id=other_entry.entry_id,
        identifiers={("mock_other", "lamp")},
        name="Kitchen Lamp",
    )

    await _expect_error(
        hass,
        SERVICE_LOG_CARE,
        {"device_id": "not-a-device", "kind": "watering"},
        "unknown_target",
    )
    error = await _expect_error(
        hass,
        SERVICE_LOG_CARE,
        {"device_id": foreign.id, "kind": "watering"},
        "invalid_target",
    )
    assert error.translation_placeholders == {"target": "Kitchen Lamp"}
    # One bad target rejects the whole call before anything is written.
    await _expect_error(
        hass,
        SERVICE_LOG_CARE,
        {"device_id": [_device_id(hass, plant_id), foreign.id], "kind": "watering"},
        "invalid_target",
    )
    assert _plant_record(entry, plant_id).care_events == ()


async def test_log_care_requires_a_supported_target(hass: HomeAssistant) -> None:
    await _setup(hass)
    await _expect_error(hass, SERVICE_LOG_CARE, {"kind": "watering"}, "no_target")
    await _expect_error(
        hass,
        SERVICE_LOG_CARE,
        {"area_id": "kitchen", "kind": "watering"},
        "unsupported_target",
    )
    await _expect_error(
        hass,
        SERVICE_LOG_CARE,
        {"entity_id": "all", "kind": "watering"},
        "unsupported_target",
    )


async def test_log_care_does_not_log_note_text(
    hass: HomeAssistant, caplog: pytest.LogCaptureFixture
) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    task_id, entity_id = await _task(hass, entry, plant_id)
    caplog.set_level(logging.DEBUG)

    await _call(
        hass,
        SERVICE_LOG_CARE,
        {
            "device_id": _device_id(hass, plant_id),
            "entity_id": entity_id,
            "note": "Private note text",
            "kind": "fertilizing",
        },
    )

    # Only the integration's own log lines matter here; the test harness
    # dumps the mocked storage contents on its own logger.
    messages = [
        record.getMessage()
        for record in caplog.records
        if record.name.startswith("custom_components.smart_plants")
    ]
    assert any(task_id in message for message in messages)
    assert not any("Private note text" in message for message in messages)


# --- log_care with care task entities --------------------------------------


async def test_log_care_for_task_entity_completes_task(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    task_id, entity_id = await _task(hass, entry, plant_id)

    await _call(hass, SERVICE_LOG_CARE, {"entity_id": entity_id, "note": "Spring"})

    plant = _plant_record(entry, plant_id)
    (event,) = plant.care_events
    assert event.kind == "fertilizing"
    assert event.task_id == task_id
    assert event.provenance == "action"
    assert event.payload["note"] == "Spring"
    task = plant.care_task(task_id)
    assert task is not None
    assert task.last_done_at is not None


async def test_log_care_for_task_entity_by_registry_id_and_matching_kind(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    task_id, entity_id = await _task(hass, entry, plant_id, "custom")
    registry_entry = er.async_get(hass).async_get(entity_id)
    assert registry_entry is not None

    await _call(
        hass,
        SERVICE_LOG_CARE,
        {"entity_id": [registry_entry.id, entity_id], "kind": "task"},
    )

    (event,) = _plant_record(entry, plant_id).care_events
    assert event.kind == "task"
    assert event.task_id == task_id


async def test_log_care_rejects_kind_that_does_not_match_task(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    _task_id, entity_id = await _task(hass, entry, plant_id)

    error = await _expect_error(
        hass,
        SERVICE_LOG_CARE,
        {"entity_id": entity_id, "kind": "watering"},
        "kind_mismatch",
    )
    assert error.translation_placeholders == {
        "target": entity_id,
        "kind": "watering",
        "task_kind": "fertilizing",
    }
    assert _plant_record(entry, plant_id).care_events == ()


async def test_log_care_for_tasks_of_several_plants_and_a_device(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    first = await _plant(hass, entry, "Aloe")
    second = await _plant(hass, entry, "Office Aloe")
    _first_task, first_entity = await _task(hass, entry, first)
    second_task, second_entity = await _task(hass, entry, second)

    await _call(
        hass,
        SERVICE_LOG_CARE,
        {
            "entity_id": [first_entity, second_entity],
            "device_id": _device_id(hass, second),
            "kind": "fertilizing",
        },
    )

    assert len(_plant_record(entry, first).care_events) == 1
    second_events = _plant_record(entry, second).care_events
    assert sorted(str(event.task_id) for event in second_events) == sorted(
        ["None", second_task]
    )
    assert {event.provenance for event in second_events} == {"action"}


async def test_task_entity_errors(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    task_id, entity_id = await _task(hass, entry, plant_id)
    registry = er.async_get(hass)
    plant_entity = registry.async_get_or_create(
        "binary_sensor",
        DOMAIN,
        f"{DOMAIN}:{plant_id}:needs_water",
        config_entry=entry,
    )
    other_entity = registry.async_get_or_create(
        "binary_sensor", "mock_other", f"{DOMAIN}:{plant_id}:care_task:{task_id}:due"
    )

    # A state without a registry entry is a wrong target, not a missing one.
    hass.states.async_set("sun.mock_sun", "above_horizon")
    for service in (SERVICE_LOG_CARE, SERVICE_SKIP_CARE_TASK):
        await _expect_error(
            hass,
            service,
            {"entity_id": "binary_sensor.mock_missing"},
            "unknown_target",
        )
        await _expect_error(
            hass, service, {"entity_id": plant_entity.entity_id}, "invalid_target"
        )
        await _expect_error(
            hass, service, {"entity_id": other_entity.entity_id}, "invalid_target"
        )
        await _expect_error(
            hass, service, {"entity_id": "sun.mock_sun"}, "invalid_target"
        )

    plant = _plant_record(entry, plant_id)
    await _manager(entry).async_delete_care_task(
        plant_id, task_id, expected_revision=plant.revision
    )
    await hass.async_block_till_done()
    # Deleting the task removes its entities from the registry.
    assert registry.async_get(entity_id) is None
    for service in (SERVICE_LOG_CARE, SERVICE_SKIP_CARE_TASK):
        await _expect_error(hass, service, {"entity_id": entity_id}, "unknown_target")

    # A registry entry that outlives its task names the missing task.
    stale = registry.async_get_or_create(
        "binary_sensor",
        DOMAIN,
        f"{DOMAIN}:{plant_id}:care_task:{task_id}:due",
        config_entry=entry,
    )
    for service in (SERVICE_LOG_CARE, SERVICE_SKIP_CARE_TASK):
        await _expect_error(
            hass, service, {"entity_id": stale.entity_id}, "care_task_not_found"
        )

    orphan = registry.async_get_or_create(
        "binary_sensor",
        DOMAIN,
        f"{DOMAIN}:mock_missing_plant:care_task:{task_id}:due",
        config_entry=entry,
    )
    await _expect_error(
        hass, SERVICE_LOG_CARE, {"entity_id": orphan.entity_id}, "unknown_target"
    )


async def test_task_entity_of_disabled_plant_is_rejected(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    _task_id, entity_id = await _task(hass, entry, plant_id)
    plant = _plant_record(entry, plant_id)
    await _manager(entry).async_disable_plant(
        plant_id, expected_revision=plant.revision
    )

    for service in (SERVICE_LOG_CARE, SERVICE_SKIP_CARE_TASK):
        await _expect_error(hass, service, {"entity_id": entity_id}, "plant_disabled")


# --- skip_care_task ---------------------------------------------------------


async def test_skip_care_task(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    first = await _plant(hass, entry, "Aloe")
    second = await _plant(hass, entry, "Office Aloe")
    first_task, first_entity = await _task(hass, entry, first)
    second_task, second_entity = await _task(hass, entry, second, "prune")
    before = _plant_record(entry, first).revision

    await _call(
        hass, SERVICE_SKIP_CARE_TASK, {"entity_id": [first_entity, second_entity]}
    )

    today = dt_util.now().date().isoformat()
    for plant_id, task_id in ((first, first_task), (second, second_task)):
        task = _plant_record(entry, plant_id).care_task(task_id)
        assert task is not None
        assert task.last_skipped_on == today
        assert _plant_record(entry, plant_id).care_events == ()
    assert _plant_record(entry, first).revision == before + 1


async def test_skip_care_task_requires_task_entities(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    plant_id = await _plant(hass, entry, "Aloe")
    await _expect_error(hass, SERVICE_SKIP_CARE_TASK, {}, "no_target")
    await _expect_error(
        hass,
        SERVICE_SKIP_CARE_TASK,
        {"device_id": _device_id(hass, plant_id)},
        "task_target_required",
    )
    await _expect_error(
        hass,
        SERVICE_SKIP_CARE_TASK,
        {"label_id": "plants"},
        "unsupported_target",
    )
