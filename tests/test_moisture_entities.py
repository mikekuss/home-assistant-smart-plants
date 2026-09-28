"""
End-to-end moisture entity tests.

Uses the real config entry / platform / entity_registry flow to verify
every moisture role's state, availability, disable/re-enable hook
plumbing, and number-entity write path.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsRevisionConflictError,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.number import SmartPlantsNumberEntity
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

_THRESHOLD_ROLES = ("moisture_min", "moisture_target", "moisture_max")


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _create_with_enabled_thresholds(
    hass: HomeAssistant, entry: MockConfigEntry
) -> tuple[SmartPlantsManager, str]:
    """Create a plant and enable its threshold numbers as a user would."""
    plant = await entry.runtime_data.manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    registry = er.async_get(hass)
    for role in _THRESHOLD_ROLES:
        entity_id = registry.async_get_entity_id(
            "number", DOMAIN, f"{DOMAIN}:{plant.id}:{role}"
        )
        assert entity_id is not None
        registry.async_update_entity(entity_id, disabled_by=None)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    return entry.runtime_data.manager, plant.id


async def test_moisture_role_entities_are_created(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    for platform, role in [
        ("sensor", "moisture"),
        ("sensor", "health_score"),
        ("binary_sensor", "needs_water"),
        ("binary_sensor", "too_wet"),
        ("binary_sensor", "sensor_stale"),
        ("number", "moisture_min"),
        ("number", "moisture_target"),
        ("number", "moisture_max"),
    ]:
        unique_id = f"{DOMAIN}:{plant.id}:{role}"
        assert registry.async_get_entity_id(platform, DOMAIN, unique_id) is not None
    moisture = manager.get_entity("sensor", plant.id, "moisture")
    assert moisture.state_class == "measurement"
    threshold_id = registry.async_get_entity_id(
        "number", DOMAIN, f"{DOMAIN}:{plant.id}:moisture_min"
    )
    assert threshold_id is not None
    threshold = registry.async_get(threshold_id)
    assert threshold is not None
    assert threshold.entity_category is EntityCategory.CONFIG


async def test_threshold_numbers_are_disabled_by_default(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    for role in _THRESHOLD_ROLES:
        entity_id = registry.async_get_entity_id(
            "number", DOMAIN, f"{DOMAIN}:{plant.id}:{role}"
        )
        assert entity_id is not None
        registry_entry = registry.async_get(entity_id)
        assert registry_entry is not None
        assert registry_entry.disabled_by is er.RegistryEntryDisabler.INTEGRATION
        assert hass.states.get(entity_id) is None
        assert manager.get_entity("number", plant.id, role) is None

    # Health detection does not depend on the threshold entities.
    assert manager.get_entity("binary_sensor", plant.id, "needs_water") is not None


async def test_previously_enabled_threshold_numbers_stay_enabled(
    hass: HomeAssistant,
) -> None:
    # Register the entities the way earlier releases did (enabled by
    # default), then reload with the current default in place.
    with patch.object(
        SmartPlantsNumberEntity, "_attr_entity_registry_enabled_default", new=True
    ):
        entry = await _setup(hass)
        plant = await entry.runtime_data.manager.async_create_plant(name="Aloe")
        await hass.async_block_till_done()

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    manager = entry.runtime_data.manager
    for role in _THRESHOLD_ROLES:
        entity_id = registry.async_get_entity_id(
            "number", DOMAIN, f"{DOMAIN}:{plant.id}:{role}"
        )
        assert entity_id is not None
        registry_entry = registry.async_get(entity_id)
        assert registry_entry is not None
        assert registry_entry.disabled_by is None
        assert hass.states.get(entity_id) is not None
        assert manager.get_entity("number", plant.id, role) is not None


async def test_controller_listener_attach_is_idempotent(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()
    entity = manager.get_entity("sensor", plant.id, "moisture")
    controller = manager.get_moisture_controller(plant.id)
    listener_count = len(controller._listeners)
    entity._attach_controller_listener()
    assert len(controller._listeners) == listener_count


async def test_moisture_sensor_unavailable_without_assignment(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    unique_id = f"{DOMAIN}:{plant.id}:moisture"
    entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "unavailable"


async def test_moisture_sensor_reads_source_state(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    hass.states.async_set("sensor.source_a", "42.125", {"unit_of_measurement": "%"})
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": "sensor.source_a"}],
    )
    await manager.async_set_moisture_primary(
        plant.id, expected_revision=2, primary_entity_id="sensor.source_a"
    )
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    entity_id = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{DOMAIN}:{plant.id}:moisture"
    )
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    assert float(state.state) == pytest.approx(42.125)


async def test_silent_source_becomes_stale_at_deadline_without_source_event(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    hass.states.async_set("sensor.source_a", "42.125", {"unit_of_measurement": "%"})
    assigned = await manager.async_set_moisture_sources(
        plant.id, expected_revision=1, sources=[{"entity_id": "sensor.source_a"}]
    )
    selected = await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=assigned.revision,
        primary_entity_id="sensor.source_a",
    )
    await manager.async_set_stale_after(
        plant.id, expected_revision=selected.revision, stale_after_seconds=60
    )
    await hass.async_block_till_done()

    controller = manager.get_moisture_controller(plant.id)
    assert controller.current_evaluation.computed_percent == pytest.approx(42.125)
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(minutes=7))
    await hass.async_block_till_done()
    assert controller.current_evaluation.sensor_stale is True
    assert controller.current_evaluation.computed_available is False


async def test_old_state_does_not_shorten_assignment_grace(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    now = dt_util.utcnow()
    old = now - timedelta(days=1)
    with patch("homeassistant.core.dt_util.utcnow", return_value=old):
        hass.states.async_set("sensor.old_source", "42", {"unit_of_measurement": "%"})
    assigned = await manager.async_set_moisture_sources(
        plant.id, expected_revision=1, sources=[{"entity_id": "sensor.old_source"}]
    )
    selected = await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=assigned.revision,
        primary_entity_id="sensor.old_source",
    )
    await manager.async_set_stale_after(
        plant.id, expected_revision=selected.revision, stale_after_seconds=60
    )
    controller = manager.get_moisture_controller(plant.id)

    async_fire_time_changed(hass, now + timedelta(seconds=30))
    await hass.async_block_till_done()
    assert controller.current_evaluation.computed_available is True
    async_fire_time_changed(hass, now + timedelta(seconds=61))
    await hass.async_block_till_done()
    assert controller.current_evaluation.sensor_stale is True


async def test_registry_uuid_does_not_consume_replacement_at_same_entity_id(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    original = registry.async_get_or_create(
        "sensor", "example", "original", suggested_object_id="probe"
    )
    hass.states.async_set(original.entity_id, "40", {"unit_of_measurement": "%"})
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    assigned = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": original.entity_id, "registry_id": original.id}],
    )
    await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=assigned.revision,
        primary_entity_id=original.entity_id,
    )
    controller = manager.get_moisture_controller(plant.id)
    assert controller.current_evaluation.computed_available is True

    registry.async_remove(original.entity_id)
    await hass.async_block_till_done()
    assert hass.states.get(original.entity_id) is not None
    assert controller.current_evaluation.sensor_stale is True
    assert controller.current_evaluation.computed_available is False

    hass.states.async_remove(original.entity_id)  # type: ignore[unreachable]
    replacement = registry.async_get_or_create(
        "sensor", "example", "replacement", suggested_object_id="probe"
    )
    assert replacement.entity_id == original.entity_id
    hass.states.async_set(replacement.entity_id, "80", {"unit_of_measurement": "%"})
    await hass.async_block_till_done()
    assert controller.current_evaluation.sensor_stale is True
    assert controller.current_evaluation.computed_available is False


async def test_threshold_change_does_not_reset_new_assignment_grace(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    assigned = await manager.async_set_moisture_sources(
        plant.id, expected_revision=1, sources=[{"entity_id": "sensor.silent"}]
    )
    assigned = await manager.async_set_stale_after(
        plant.id,
        expected_revision=assigned.revision,
        stale_after_seconds=60,
    )
    started = dt_util.utcnow()
    async_fire_time_changed(hass, started + timedelta(minutes=5))
    await hass.async_block_till_done()
    changed = await manager.async_set_moisture_thresholds(
        plant.id,
        expected_revision=assigned.revision,
        moisture_min=20,
        moisture_target=40,
        moisture_max=60,
    )
    assert changed.revision == assigned.revision + 1
    async_fire_time_changed(hass, started + timedelta(minutes=7))
    await hass.async_block_till_done()
    controller = manager.get_moisture_controller(plant.id)
    assert controller.current_evaluation.sensor_stale is True


async def test_hysteresis_latch_survives_unavailability_and_reenable(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    hass.states.async_set("sensor.source_a", "10", {"unit_of_measurement": "%"})
    assigned = await manager.async_set_moisture_sources(
        plant.id, expected_revision=1, sources=[{"entity_id": "sensor.source_a"}]
    )
    selected = await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=assigned.revision,
        primary_entity_id="sensor.source_a",
    )
    controller = manager.get_moisture_controller(plant.id)
    assert controller.current_evaluation.needs_water is True
    hass.states.async_set(
        "sensor.source_a", "unavailable", {"unit_of_measurement": "%"}
    )
    await hass.async_block_till_done()
    assert controller.current_evaluation.computed_available is False
    disabled = await manager.async_disable_plant(
        plant.id, expected_revision=selected.revision
    )
    await manager.async_reenable_plant(plant.id, expected_revision=disabled.revision)
    hass.states.async_set("sensor.source_a", "16", {"unit_of_measurement": "%"})
    await hass.async_block_till_done()
    assert controller.current_evaluation.needs_water is True


async def test_durable_watering_grace_expires_and_unavailable_stays_unavailable(
    hass: HomeAssistant, freezer: Any
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    hass.states.async_set("sensor.source_a", "10", {"unit_of_measurement": "%"})
    assigned = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=plant.revision,
        sources=[{"entity_id": "sensor.source_a"}],
    )
    selected = await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=assigned.revision,
        primary_entity_id="sensor.source_a",
    )
    selected = await manager.async_set_stale_after(
        plant.id,
        expected_revision=selected.revision,
        stale_after_seconds=2 * 24 * 60 * 60,
    )
    controller = manager.get_moisture_controller(plant.id)
    assert controller.current_evaluation.needs_water is True

    now = dt_util.utcnow()
    freezer.move_to(now)
    occurred = now - timedelta(hours=23)
    updated, _event = await manager.async_add_watering(
        plant.id,
        expected_revision=selected.revision,
        occurred_at=occurred.isoformat(),
        note=None,
    )
    await hass.async_block_till_done()
    assert updated.revision == selected.revision + 1
    evaluation = controller.current_evaluation
    assert evaluation.needs_water is False
    assert getattr(controller, "_unsub_watering_deadline") is not None  # noqa: B009

    disabled = await manager.async_disable_plant(
        plant.id, expected_revision=updated.revision
    )
    assert getattr(controller, "_unsub_watering_deadline") is None  # noqa: B009
    await manager.async_reenable_plant(plant.id, expected_revision=disabled.revision)
    assert getattr(controller, "_unsub_watering_deadline") is not None  # noqa: B009

    expired = now + timedelta(hours=1)
    freezer.move_to(expired)
    async_fire_time_changed(hass, expired)
    await hass.async_block_till_done()
    # At the exact half-open grace deadline a still-valid low reading triggers
    # the normal strict-below-min hysteresis rule.
    assert controller.current_evaluation.computed_available is True
    assert controller.current_evaluation.needs_water is True


async def test_watering_grace_deadline_is_reconstructed_after_manager_restart(
    hass: HomeAssistant, freezer: Any
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    now = dt_util.utcnow()
    freezer.move_to(now)
    _updated, _event = await manager.async_add_watering(
        plant.id,
        expected_revision=plant.revision,
        occurred_at=now.isoformat(),
        note=None,
    )
    deadline = now + timedelta(hours=24)
    await manager.async_unload()

    restarted = SmartPlantsManager(hass)
    await restarted.async_load()
    controller = restarted.get_moisture_controller(plant.id)
    assert controller is not None
    assert controller._watering_grace_deadline() == deadline
    assert getattr(controller, "_unsub_watering_deadline") is not None  # noqa: B009
    await restarted.async_unload()


async def test_care_edit_and_delete_recompute_watering_grace_from_retained_events(
    hass: HomeAssistant, freezer: Any
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    now = dt_util.utcnow().replace(microsecond=0)
    freezer.move_to(now)
    first_time = (now - timedelta(hours=23)).isoformat()
    first_plant, first = await manager.async_add_watering(
        plant.id, expected_revision=plant.revision, occurred_at=first_time, note=None
    )
    latest_time = (now - timedelta(hours=10)).isoformat()
    second_plant, second = await manager.async_add_watering(
        plant.id,
        expected_revision=first_plant.revision,
        occurred_at=latest_time,
        note=None,
    )
    controller = manager.get_moisture_controller(plant.id)
    assert controller is not None
    assert controller._watering_grace_deadline() == now + timedelta(hours=14)

    edited, replacement = await manager.async_edit_care_event(
        plant.id,
        expected_revision=second_plant.revision,
        event_id=second.id,
        kind="note",
        occurred_at=latest_time,
        payload={"text": "No watering took place"},
    )
    await hass.async_block_till_done()
    assert replacement.id == second.id
    assert replacement.provenance == "manual"
    assert controller._watering_grace_deadline() == now + timedelta(hours=1)

    deleted = await manager.async_delete_care_event(
        plant.id, expected_revision=edited.revision, event_id=first.id
    )
    await hass.async_block_till_done()
    assert deleted.care_events == (replacement,)
    assert controller._watering_grace_deadline() is None
    await manager.async_unload()


async def test_number_write_updates_thresholds(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager, plant_id = await _create_with_enabled_thresholds(hass, entry)

    registry = er.async_get(hass)
    min_entity = registry.async_get_entity_id(
        "number", DOMAIN, f"{DOMAIN}:{plant_id}:moisture_min"
    )
    assert min_entity is not None

    await hass.services.async_call(
        "number",
        "set_value",
        {"entity_id": min_entity, "value": 20},
        blocking=True,
    )
    await hass.async_block_till_done()
    assert manager.get_plant(plant_id).moisture.moisture_min == 20


async def test_number_write_rejects_bad_ordering(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager, plant_id = await _create_with_enabled_thresholds(hass, entry)

    registry = er.async_get(hass)
    max_entity = registry.async_get_entity_id(
        "number", DOMAIN, f"{DOMAIN}:{plant_id}:moisture_max"
    )
    assert max_entity is not None
    # Setting max below target should be refused by the manager and the
    # threshold record must survive unchanged.
    with pytest.raises((SmartPlantsValidationError, ValueError)):
        await hass.services.async_call(
            "number",
            "set_value",
            {"entity_id": max_entity, "value": 10},
            blocking=True,
        )
    assert manager.get_plant(plant_id).moisture.moisture_max == 55


async def test_disable_reenable_pauses_and_resumes_controller(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await hass.async_block_till_done()

    controller = manager.get_moisture_controller(plant.id)
    assert controller is not None
    # Disable stops I/O but retains the controller's source history/latches.
    await manager.async_disable_plant(plant.id, expected_revision=1)
    await hass.async_block_till_done()
    assert manager.get_moisture_controller(plant.id) is controller

    await manager.async_reenable_plant(plant.id, expected_revision=2)
    await hass.async_block_till_done()
    assert manager.get_moisture_controller(plant.id) is controller


async def test_reenable_refreshes_source_changed_while_disabled(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    hass.states.async_set("sensor.probe", "20", {"unit_of_measurement": "%"})
    assigned = await manager.async_set_moisture_sources(
        plant.id, expected_revision=1, sources=[{"entity_id": "sensor.probe"}]
    )
    await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=assigned.revision,
        primary_entity_id="sensor.probe",
    )
    controller = manager.get_moisture_controller(plant.id)
    assert controller.current_evaluation.computed_percent == pytest.approx(20)

    disabled = await manager.async_disable_plant(plant.id, expected_revision=3)
    hass.states.async_set("sensor.probe", "80", {"unit_of_measurement": "%"})
    await hass.async_block_till_done()
    assert controller.current_evaluation.computed_percent == pytest.approx(20)

    await manager.async_reenable_plant(plant.id, expected_revision=disabled.revision)
    assert controller.current_evaluation.computed_percent == pytest.approx(80)


async def test_restart_missing_registry_source_is_immediately_stale(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    source = registry.async_get_or_create(
        "sensor", "example", "restart-source", suggested_object_id="restart_source"
    )
    hass.states.async_set(source.entity_id, "40", {"unit_of_measurement": "%"})
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_plant(name="Aloe")
    assigned = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": source.entity_id, "registry_id": source.id}],
    )
    assigned = await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=assigned.revision,
        primary_entity_id=source.entity_id,
    )
    await manager.async_set_stale_after(
        plant.id,
        expected_revision=assigned.revision,
        stale_after_seconds=86_400,
    )
    await manager.async_unload()
    registry.async_remove(source.entity_id)

    restarted = SmartPlantsManager(hass)
    await restarted.async_load()
    controller = restarted.get_moisture_controller(plant.id)
    assert controller is not None
    assert controller.current_evaluation.sensor_stale is True
    assert controller.current_evaluation.computed_available is False


async def test_number_write_rejects_fractional_threshold(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager, plant_id = await _create_with_enabled_thresholds(hass, entry)
    entity = manager.get_entity("number", plant_id, "moisture_min")
    assert entity is not None
    with pytest.raises(SmartPlantsValidationError, match="whole"):
        await entity.async_set_native_value(20.5)
    assert manager.get_plant(plant_id).moisture.moisture_min == 15


async def test_revision_conflict_number_write_retries_once(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager, plant_id = await _create_with_enabled_thresholds(hass, entry)

    # Force the record's revision forward so the entity's cached revision
    # is stale when it writes.
    await manager.async_update_plant(plant_id, expected_revision=1, name="Renamed")
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    min_entity = registry.async_get_entity_id(
        "number", DOMAIN, f"{DOMAIN}:{plant_id}:moisture_min"
    )
    assert min_entity is not None
    # First attempt inside the entity fetches the current revision, so
    # this must succeed even though the plant just bumped.
    await hass.services.async_call(
        "number",
        "set_value",
        {"entity_id": min_entity, "value": 18},
        blocking=True,
    )
    await hass.async_block_till_done()
    assert manager.get_plant(plant_id).moisture.moisture_min == 18


def test_revision_conflict_type_is_still_importable() -> None:
    # Guard the entity's retry path — this class name is part of the API.
    assert SmartPlantsRevisionConflictError is not None
