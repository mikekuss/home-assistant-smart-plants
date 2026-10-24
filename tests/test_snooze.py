"""Alert snooze: storage, manager, entity attributes, actions, WebSocket."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from custom_components.smart_plants.const import (
    DOMAIN,
    SINGLETON_UNIQUE_ID,
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsRevisionConflictError,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import PlantRecord
from custom_components.smart_plants.services import SERVICE_SNOOZE, SERVICE_UNSNOOZE
from custom_components.smart_plants.storage import (
    SmartPlantsInvalidStorageError,
    SmartPlantsStore,
)
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant, State
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)
from pytest_homeassistant_custom_component.typing import (
    MockHAClientWebSocket,
    WebSocketGenerator,
)

from tests.helpers import plant_device

NOW = datetime(2026, 6, 15, 10, 0, tzinfo=UTC)
_MISSING = object()
INTERVAL = {
    "kind": "interval",
    "every": 2,
    "unit": "weeks",
    "growing_season_only": False,
}


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    # async_setup_component runs async_setup, which registers the actions and
    # the WebSocket commands.
    assert await async_setup_component(hass, DOMAIN, {})
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _manager(entry: MockConfigEntry) -> SmartPlantsManager:
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


async def _plant(entry: MockConfigEntry, name: str = "Aloe") -> PlantRecord:
    return await _manager(entry).async_create_plant(name=name)


def _iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _plant_row(**changes: Any) -> dict[str, Any]:
    row = PlantRecord(
        id="plant-1", revision=3, name="Aloe", created_at="2026-01-01T00:00:00Z"
    ).as_storage()
    row.update(changes)
    return row


def _seed(hass_storage: dict[str, Any], *, minor: int, plants: list[Any]) -> None:
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": minor,
        "key": STORAGE_KEY,
        "data": {
            "revision": 1,
            "plants": plants,
            "pending_operations": [],
            "tombstones": [],
        },
    }


def _state(
    hass: HomeAssistant, manager: SmartPlantsManager, plant_id: str, role: str
) -> State:
    entity = manager.get_entity("binary_sensor", plant_id, role)
    assert entity is not None, role
    state = hass.states.get(entity.entity_id)
    assert state is not None
    return state


def _state_attributes(
    hass: HomeAssistant, manager: SmartPlantsManager, plant_id: str, role: str
) -> dict[str, Any]:
    return dict(_state(hass, manager, plant_id, role).attributes)


# --- Storage ----------------------------------------------------------------


async def test_minor_fourteen_migrates_without_snooze(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    assert STORAGE_MINOR_VERSION == 15
    row = _plant_row()
    del row["snoozed_until"]
    _seed(hass_storage, minor=14, plants=[row])

    snapshot = await SmartPlantsStore(hass).async_load()

    assert snapshot.plants["plant-1"].snoozed_until is None
    assert snapshot.plants["plant-1"].revision == 3
    stored = hass_storage[STORAGE_KEY]
    assert stored["minor_version"] == STORAGE_MINOR_VERSION
    assert stored["data"]["plants"][0]["snoozed_until"] is None


async def test_older_minor_with_snooze_fails_closed(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(
        hass_storage,
        minor=14,
        plants=[_plant_row(snoozed_until="2026-06-20T10:00:00Z")],
    )
    with pytest.raises(SmartPlantsInvalidStorageError, match="alert snooze"):
        await SmartPlantsStore(hass).async_load()


async def test_current_minor_round_trips_snooze(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    row = _plant_row(snoozed_until="2026-06-20T10:00:00Z")
    _seed(hass_storage, minor=STORAGE_MINOR_VERSION, plants=[row])

    snapshot = await SmartPlantsStore(hass).async_load()

    assert snapshot.plants["plant-1"].snoozed_until == "2026-06-20T10:00:00Z"
    assert snapshot.plants["plant-1"].as_storage() == row


@pytest.mark.parametrize(
    "value",
    [
        pytest.param(_MISSING, id="missing"),
        pytest.param("2026-06-20T12:00:00+02:00", id="not utc"),
        pytest.param("2026-06-20T10:00:00", id="naive"),
        pytest.param("soon", id="garbage"),
        pytest.param(1781949600, id="number"),
    ],
)
async def test_current_minor_rejects_invalid_snooze(
    hass: HomeAssistant, hass_storage: dict[str, Any], value: object
) -> None:
    row = _plant_row()
    if value is _MISSING:
        del row["snoozed_until"]
    else:
        row["snoozed_until"] = value
    _seed(hass_storage, minor=STORAGE_MINOR_VERSION, plants=[row])
    with pytest.raises(SmartPlantsInvalidStorageError):
        await SmartPlantsStore(hass).async_load()


# --- Manager ----------------------------------------------------------------


async def test_snooze_stores_utc_end_and_bumps_revision(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    plant = await _plant(entry)
    manager = _manager(entry)

    updated = await manager.async_snooze_plant(
        plant.id,
        expected_revision=plant.revision,
        until="2026-06-20T23:59:59.500+02:00",
    )

    assert updated.snoozed_until == "2026-06-20T21:59:59Z"
    assert updated.revision == plant.revision + 1
    assert manager.get_plant(plant.id) == updated

    # Snoozing to the same end changes nothing.
    again = await manager.async_snooze_plant(
        plant.id,
        expected_revision=None,
        until=datetime(2026, 6, 20, 21, 59, 59, tzinfo=UTC),
    )
    assert again.revision == updated.revision

    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_snooze_plant(
            plant.id, expected_revision=plant.revision, until=None
        )

    resumed = await manager.async_unsnooze_plant(
        plant.id, expected_revision=updated.revision
    )
    assert resumed.snoozed_until is None
    assert resumed.revision == updated.revision + 1
    # Ending a snooze that is not set changes nothing.
    assert (
        await manager.async_unsnooze_plant(plant.id, expected_revision=None)
    ).revision == resumed.revision


@pytest.mark.parametrize(
    ("until", "message"),
    [
        pytest.param("2026-06-15T09:59:59Z", "in the future", id="past"),
        pytest.param(NOW, "in the future", id="now"),
        pytest.param(NOW + timedelta(days=366, seconds=1), "366 days", id="too long"),
        pytest.param("2026-06-20T10:00:00", "time zone", id="naive"),
        pytest.param("2026-06-20", "time zone", id="date only"),
        pytest.param("next week", "ISO timestamp", id="garbage"),
        pytest.param(" 2026-06-20T10:00:00Z", "ISO timestamp", id="padded"),
        pytest.param(12, "ISO timestamp", id="number"),
    ],
)
async def test_snooze_rejects_invalid_end(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, until: object, message: str
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    plant = await _plant(entry)

    with pytest.raises(SmartPlantsValidationError, match=message):
        await _manager(entry).async_snooze_plant(
            plant.id,
            expected_revision=plant.revision,
            until=until,  # type: ignore[arg-type]
        )
    assert _manager(entry).get_plant(plant.id) == plant


async def test_snooze_accepts_exactly_366_days(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    plant = await _plant(entry)
    updated = await _manager(entry).async_snooze_plant(
        plant.id, expected_revision=None, until=NOW + timedelta(days=366)
    )
    assert updated.snoozed_until == "2027-06-16T10:00:00Z"


async def test_pausing_a_plant_ends_its_snooze(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(entry)
    plant = await manager.async_snooze_plant(
        plant.id, expected_revision=None, until=NOW + timedelta(days=3)
    )

    disabled = await manager.async_disable_plant(
        plant.id, expected_revision=plant.revision
    )

    assert disabled.snoozed_until is None
    with pytest.raises(SmartPlantsValidationError, match="disabled"):
        await manager.async_snooze_plant(
            plant.id, expected_revision=None, until=NOW + timedelta(days=3)
        )
    reenabled = await manager.async_reenable_plant(
        plant.id, expected_revision=disabled.revision
    )
    assert reenabled.snoozed_until is None


async def test_care_does_not_end_a_snooze(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(entry)
    plant, task = await manager.async_create_care_task(
        plant.id,
        expected_revision=plant.revision,
        task_type="fertilize",
        name=None,
        schedule=INTERVAL,
        instructions=None,
        baseline_done_on=None,
    )
    end = _iso(NOW + timedelta(days=7))
    await manager.async_snooze_plant(plant.id, expected_revision=None, until=end)

    await manager.async_add_watering(
        plant.id, expected_revision=None, occurred_at=NOW.isoformat(), note=None
    )
    await manager.async_skip_care_task(plant.id, task.id, expected_revision=None)
    await manager.async_complete_care_task(
        plant.id,
        task.id,
        expected_revision=None,
        occurred_at=NOW.isoformat(),
        note=None,
    )

    assert manager.get_plant(plant.id).snoozed_until == end


# --- Expiry -----------------------------------------------------------------


async def test_snooze_ends_by_itself(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(entry)
    snoozed = await manager.async_snooze_plant(
        plant.id, expected_revision=None, until=NOW + timedelta(hours=1)
    )

    freezer.tick(timedelta(minutes=59))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert manager.get_plant(plant.id).snoozed_until is not None

    freezer.tick(timedelta(minutes=1, seconds=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    ended = manager.get_plant(plant.id)
    assert ended.snoozed_until is None
    assert ended.revision == snoozed.revision + 1
    attributes = _state_attributes(hass, manager, plant.id, "sensor_stale")
    assert attributes["snoozed"] is False


async def test_snoozing_again_replaces_the_end(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(entry)
    await manager.async_snooze_plant(
        plant.id, expected_revision=None, until=NOW + timedelta(hours=1)
    )
    later = _iso(NOW + timedelta(hours=2))
    await manager.async_snooze_plant(plant.id, expected_revision=None, until=later)

    freezer.tick(timedelta(hours=1, seconds=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert manager.get_plant(plant.id).snoozed_until == later

    freezer.tick(timedelta(hours=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert manager.get_plant(plant.id).snoozed_until is None


async def test_ended_snooze_does_not_fire_after_resume(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(entry)
    await manager.async_snooze_plant(
        plant.id, expected_revision=None, until=NOW + timedelta(hours=1)
    )
    resumed = await manager.async_unsnooze_plant(plant.id, expected_revision=None)

    freezer.tick(timedelta(hours=2))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert manager.get_plant(plant.id).revision == resumed.revision


async def test_snooze_timer_is_armed_again_at_startup(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to(NOW)
    end = _iso(NOW + timedelta(days=2))
    _seed(
        hass_storage,
        minor=STORAGE_MINOR_VERSION,
        plants=[_plant_row(snoozed_until=end)],
    )
    entry = await _setup(hass)
    manager = _manager(entry)
    assert manager.get_plant("plant-1").snoozed_until == end

    freezer.tick(timedelta(days=2, seconds=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    assert manager.get_plant("plant-1").snoozed_until is None
    assert hass_storage[STORAGE_KEY]["data"]["plants"][0]["snoozed_until"] is None


async def test_snooze_that_ended_while_stopped_is_cleared_on_load(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to(NOW)
    _seed(
        hass_storage,
        minor=STORAGE_MINOR_VERSION,
        plants=[_plant_row(snoozed_until="2026-06-14T10:00:00Z")],
    )
    entry = await _setup(hass)

    plant = _manager(entry).get_plant("plant-1")
    assert plant.snoozed_until is None
    assert plant.revision == 4
    stored = hass_storage[STORAGE_KEY]["data"]["plants"][0]
    assert stored["snoozed_until"] is None


async def test_unload_cancels_snooze_timers(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(entry)
    snoozed = await manager.async_snooze_plant(
        plant.id, expected_revision=None, until=NOW + timedelta(hours=1)
    )
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    freezer.tick(timedelta(hours=2))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert manager.snapshot.plants[plant.id] == snoozed


# --- Entity attributes ------------------------------------------------------


async def test_binary_sensors_report_snooze_and_keep_their_state(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(entry)
    plant, task = await manager.async_create_care_task(
        plant.id,
        expected_revision=plant.revision,
        task_type="fertilize",
        name=None,
        schedule=INTERVAL,
        instructions=None,
        baseline_done_on=None,
    )
    await hass.async_block_till_done()
    roles = ("sensor_stale", "care_due", f"care_task:{task.id}:due")
    before = {role: _state(hass, manager, plant.id, role).state for role in roles}
    for role in roles:
        attributes = _state_attributes(hass, manager, plant.id, role)
        assert attributes["snoozed"] is False
        assert attributes["snoozed_until"] is None

    end = _iso(NOW + timedelta(days=3))
    await manager.async_snooze_plant(plant.id, expected_revision=None, until=end)
    await hass.async_block_till_done()

    for role in roles:
        state = _state(hass, manager, plant.id, role)
        assert state.state == before[role]
        assert state.attributes["snoozed"] is True
        assert state.attributes["snoozed_until"] == end
    # The sensor's own attributes stay next to the snooze ones.
    task_attributes = _state_attributes(
        hass, manager, plant.id, f"care_task:{task.id}:due"
    )
    assert task_attributes["task_type"] == "fertilize"

    for state in hass.states.async_all("sensor"):
        assert "snoozed" not in state.attributes
        assert "snoozed_until" not in state.attributes


def test_every_binary_sensor_class_reports_snooze() -> None:
    from custom_components.smart_plants import binary_sensor  # noqa: PLC0415

    classes = [
        value
        for value in vars(binary_sensor).values()
        if isinstance(value, type)
        and issubclass(value, binary_sensor.SmartPlantsBinarySensorEntity)
    ]
    assert len(classes) > 10
    for cls in classes:
        # Subclasses add their own attributes through ``_alert_attributes`` so
        # the snooze attributes are never dropped.
        assert (
            cls.extra_state_attributes
            is binary_sensor.SmartPlantsBinarySensorEntity.extra_state_attributes
        ), cls


# --- Actions ----------------------------------------------------------------


def _device_id(hass: HomeAssistant, plant_id: str) -> str:
    device = plant_device(dr.async_get(hass), plant_id)
    assert device is not None
    return device.id


async def _call(hass: HomeAssistant, service: str, data: dict[str, Any]) -> None:
    await hass.services.async_call(DOMAIN, service, data, blocking=True)


async def _expect_error(
    hass: HomeAssistant, service: str, data: dict[str, Any], key: str
) -> None:
    with pytest.raises(ServiceValidationError) as info:
        await _call(hass, service, data)
    assert info.value.translation_domain == DOMAIN
    assert info.value.translation_key == key


async def test_snooze_action_with_duration_targets_several_plants(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    first = await _plant(entry)
    second = await _plant(entry, "Office Aloe")

    await _call(
        hass,
        SERVICE_SNOOZE,
        {
            "device_id": [_device_id(hass, first.id), _device_id(hass, second.id)],
            "duration": {"days": 7},
        },
    )

    manager = _manager(entry)
    for plant in (first, second):
        assert manager.get_plant(plant.id).snoozed_until == "2026-06-22T10:00:00Z"

    await _call(
        hass,
        SERVICE_UNSNOOZE,
        {"device_id": [_device_id(hass, first.id), _device_id(hass, second.id)]},
    )
    for plant in (first, second):
        assert manager.get_plant(plant.id).snoozed_until is None


async def test_snooze_action_until_without_zone_is_local_time(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    await hass.config.async_set_time_zone("Europe/Berlin")
    freezer.move_to(NOW)
    entry = await _setup(hass)
    plant = await _plant(entry)

    await _call(
        hass,
        SERVICE_SNOOZE,
        {"device_id": _device_id(hass, plant.id), "until": "2026-06-20 23:59:59"},
    )

    assert _manager(entry).get_plant(plant.id).snoozed_until == "2026-06-20T21:59:59Z"


@pytest.mark.parametrize(
    ("data", "key"),
    [
        pytest.param({}, "snooze_period_required", id="neither"),
        pytest.param(
            {"duration": {"days": 1}, "until": "2026-06-20T10:00:00+00:00"},
            "snooze_period_conflict",
            id="both",
        ),
        pytest.param({"duration": {"days": 367}}, "snooze_too_long", id="too long"),
        pytest.param(
            {"until": "2027-06-16T10:00:01+00:00"}, "snooze_too_long", id="too late"
        ),
        pytest.param({"duration": {"seconds": 0}}, "snooze_in_past", id="zero"),
        pytest.param(
            {"until": "2026-06-15T09:00:00+00:00"}, "snooze_in_past", id="past"
        ),
    ],
)
async def test_snooze_action_rejects_invalid_period(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    data: dict[str, Any],
    key: str,
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    plant = await _plant(entry)

    await _expect_error(
        hass, SERVICE_SNOOZE, {"device_id": _device_id(hass, plant.id), **data}, key
    )
    assert _manager(entry).get_plant(plant.id) == plant


@pytest.mark.parametrize("service", [SERVICE_SNOOZE, SERVICE_UNSNOOZE])
async def test_snooze_actions_need_plant_devices(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, service: str
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    plant = await _plant(entry)
    await hass.async_block_till_done()
    duration = {"duration": {"days": 1}} if service == SERVICE_SNOOZE else {}

    await _expect_error(hass, service, duration, "no_plant_target")
    await _expect_error(
        hass, service, {"area_id": "kitchen", **duration}, "unsupported_target"
    )
    other = MockConfigEntry(domain="other")
    other.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=other.entry_id, identifiers={("other", "x")}, name="Lamp"
    )
    await _expect_error(
        hass, service, {"device_id": device.id, **duration}, "invalid_target"
    )
    await _expect_error(
        hass, service, {"device_id": "missing", **duration}, "unknown_target"
    )
    foreign = er.async_get(hass).async_get_or_create(
        "binary_sensor", "other", "lamp-problem", config_entry=other
    )
    await _expect_error(
        hass, service, {"entity_id": foreign.entity_id, **duration}, "invalid_target"
    )
    await _expect_error(
        hass,
        service,
        {"entity_id": "binary_sensor.missing", **duration},
        "unknown_target",
    )
    # A state without a registry entry is a wrong target, not a missing one.
    hass.states.async_set("sun.mock_sun", "above_horizon")
    await _expect_error(
        hass, service, {"entity_id": "sun.mock_sun", **duration}, "invalid_target"
    )
    # Nothing was written by any rejected call.
    assert _manager(entry).get_plant(plant.id) == plant


async def test_snooze_actions_accept_entity_targets(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    manager = _manager(entry)
    first = await _plant(entry)
    second = await _plant(entry, "Office Aloe")
    await hass.async_block_till_done()
    stale = manager.get_entity("binary_sensor", first.id, "sensor_stale")
    other_stale = manager.get_entity("binary_sensor", second.id, "sensor_stale")
    assert stale is not None
    assert other_stale is not None

    # An entity and the device of the same plant snooze that plant once.
    await _call(
        hass,
        SERVICE_SNOOZE,
        {
            "device_id": _device_id(hass, first.id),
            "entity_id": [stale.entity_id, other_stale.entity_id],
            "duration": {"days": 2},
        },
    )

    for plant in (first, second):
        snoozed = manager.get_plant(plant.id)
        assert snoozed.snoozed_until == "2026-06-17T10:00:00Z"
        assert snoozed.revision == plant.revision + 1

    await _call(hass, SERVICE_UNSNOOZE, {"entity_id": stale.entity_id})
    assert manager.get_plant(first.id).snoozed_until is None
    assert manager.get_plant(second.id).snoozed_until == "2026-06-17T10:00:00Z"


async def test_snooze_action_rejects_paused_plants(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    manager = _manager(entry)
    active = await _plant(entry)
    paused = await _plant(entry, "Office Aloe")
    paused = await manager.async_disable_plant(
        paused.id, expected_revision=paused.revision
    )

    await _expect_error(
        hass,
        SERVICE_SNOOZE,
        {
            "device_id": [_device_id(hass, active.id), _device_id(hass, paused.id)],
            "duration": {"days": 1},
        },
        "plant_disabled_snooze",
    )
    # Every target is checked before the first write.
    assert manager.get_plant(active.id).snoozed_until is None

    # Ending the snooze of a paused plant has nothing to do and succeeds.
    await _call(hass, SERVICE_UNSNOOZE, {"device_id": _device_id(hass, paused.id)})
    assert manager.get_plant(paused.id) == paused


# --- WebSocket --------------------------------------------------------------


async def _send(client: MockHAClientWebSocket, msg: dict[str, Any]) -> dict[str, Any]:
    await client.send_json_auto_id(msg)
    response: dict[str, Any] = await client.receive_json()
    return response


async def test_websocket_snooze(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, freezer: Any
) -> None:
    entry = await _setup(hass)
    # Connect before moving the clock: the access token is issued at the real
    # time and would not be valid at a frozen date.
    client = await hass_ws_client(hass)
    freezer.move_to(NOW)
    plant = await _plant(entry)

    response = await _send(
        client,
        {
            "type": "smart_plants/plants/snooze",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "until": "2026-06-20T23:59:59+02:00",
        },
    )
    assert response["success"], response
    view = response["result"]["plant"]
    assert view["snoozed_until"] == "2026-06-20T21:59:59Z"
    assert view["revision"] == plant.revision + 1

    listed = await _send(client, {"type": "smart_plants/plants/list"})
    assert listed["result"]["plants"][0]["snoozed_until"] == "2026-06-20T21:59:59Z"
    overview = await _send(client, {"type": "smart_plants/plants/overview"})
    (summary,) = overview["result"]["plants"]
    assert summary["snoozed_until"] == "2026-06-20T21:59:59Z"
    assert summary["status"] == "no_sensors"

    stale = await _send(
        client,
        {
            "type": "smart_plants/plants/snooze",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "until": None,
        },
    )
    assert stale["error"]["code"] == "revision_conflict"

    invalid = await _send(
        client,
        {
            "type": "smart_plants/plants/snooze",
            "plant_id": plant.id,
            "expected_revision": view["revision"],
            "until": "2028-01-01T00:00:00Z",
        },
    )
    assert invalid["error"]["code"] == "invalid_format"

    missing = await _send(
        client,
        {
            "type": "smart_plants/plants/snooze",
            "plant_id": "missing-plant",
            "expected_revision": 1,
            "until": None,
        },
    )
    assert missing["error"]["code"] == "not_found"

    resumed = await _send(
        client,
        {
            "type": "smart_plants/plants/snooze",
            "plant_id": plant.id,
            "expected_revision": view["revision"],
            "until": None,
        },
    )
    assert resumed["success"], resumed
    assert resumed["result"]["plant"]["snoozed_until"] is None


async def test_websocket_snooze_requires_until_and_revision(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    client = await hass_ws_client(hass)
    plant = await _plant(entry)
    for msg in (
        {"plant_id": plant.id, "expected_revision": plant.revision},
        {"plant_id": plant.id, "until": None},
    ):
        response = await _send(client, {"type": "smart_plants/plants/snooze", **msg})
        assert response["success"] is False
        assert response["error"]["code"] == "invalid_format"


# --- Diagnostics ------------------------------------------------------------


async def test_diagnostics_include_snooze_ends(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(NOW)
    entry = await _setup(hass)
    manager = _manager(entry)
    first = await _plant(entry)
    await _plant(entry, "Office Aloe")
    await manager.async_snooze_plant(
        first.id, expected_revision=None, until=NOW + timedelta(days=1)
    )

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)

    assert diagnostics["inventory"]["snoozed_until"] == ["2026-06-16T10:00:00Z"]
    assert first.id not in repr(diagnostics)
    assert first.name not in repr(diagnostics)


async def test_snooze_survives_entity_registry_lookups(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The snooze is plant data; it does not add or remove any entity."""
    freezer.move_to(NOW)
    entry = await _setup(hass)
    plant = await _plant(entry)
    await hass.async_block_till_done()
    registry = er.async_get(hass)
    before = {
        e.entity_id for e in er.async_entries_for_config_entry(registry, entry.entry_id)
    }

    await _manager(entry).async_snooze_plant(
        plant.id, expected_revision=None, until=dt_util.utcnow() + timedelta(days=1)
    )
    await hass.async_block_till_done()

    after = {
        e.entity_id for e in er.async_entries_for_config_entry(registry, entry.entry_id)
    }
    assert after == before
