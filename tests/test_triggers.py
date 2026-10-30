"""Plant automation triggers: validation, targets, snooze, variables, lifecycle."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any

import pytest
from custom_components.smart_plants.automation_targets import PROBLEM_ROLES
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.schema_library import vol
from freezegun.api import FrozenDateTimeFactory
from homeassistant.const import (
    ATTR_ENTITY_ID,
    SERVICE_TURN_OFF,
    STATE_OFF,
    STATE_ON,
    STATE_UNAVAILABLE,
    EntityCategory,
)
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr
from homeassistant.helpers.trigger import async_validate_trigger_config
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
    async_mock_service,
)

AUTOMATION = "automation"
ROLE_NAMES = {
    "needs_water": "Needs water",
    "too_wet": "Too wet",
    "sensor_stale": "Sensor stale",
    "temperature_stress": "Temperature stress",
    "humidity_stress": "Humidity stress",
    "soil_temperature_stress": "Soil temperature stress",
    "conductivity_stress": "Conductivity stress",
    "co2_stress": "CO2 stress",
    "low_light": "Low light",
    "low_battery": "Low battery",
}
TASK_NAMES = {
    "fertilize": "Fertilize",
    "prune": "Prune",
    "repot": "Repot",
    "pests": "Check for pests",
    "winter_protection": "Winter protection",
}
RECORD = {
    "entity_id": "{{ trigger.entity_id }}",
    "plant": "{{ trigger.plant }}",
    "device_id": "{{ trigger.device_id }}",
    "problem": "{{ trigger.problem }}",
    "problem_name": "{{ trigger.problem_name }}",
    "task": "{{ trigger.task }}",
    "task_type": "{{ trigger.task_type }}",
}


# --- Synthetic plants -------------------------------------------------------
#
# Triggers and conditions read only the registries and the state machine, so
# most tests register plant devices and entities directly, without loading
# the integration, and drive the states by hand.


@dataclass
class MockPlant:
    name: str
    plant_id: str
    device_id: str
    entities: dict[str, str] = field(default_factory=dict)

    def __getitem__(self, key: str) -> str:
        return self.entities[key]


def mock_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    return entry


def task_id(name: str, key: str) -> str:
    return hashlib.md5(f"{name}:{key}".encode()).hexdigest()  # noqa: S324


def set_entity(
    hass: HomeAssistant,
    entity_id: str,
    state: str,
    *,
    snoozed: bool | None = None,
    **attributes: Any,
) -> None:
    """Set a plant entity's state, keeping its other attributes."""
    current = hass.states.get(entity_id)
    merged = dict(current.attributes) if current is not None else {}
    if state == STATE_UNAVAILABLE:
        # Unavailable entities carry only their name.
        merged = {"friendly_name": merged.get("friendly_name")}
    else:
        merged.setdefault("snoozed", False)
    if snoozed is not None:
        merged["snoozed"] = snoozed
        merged["snoozed_until"] = "2026-06-20T10:00:00+00:00" if snoozed else None
    merged.update(attributes)
    hass.states.async_set(entity_id, state, merged)


def mock_plant(  # noqa: PLR0913
    hass: HomeAssistant,
    entry: MockConfigEntry,
    name: str,
    *,
    area_id: str | None = None,
    roles: tuple[str, ...] = PROBLEM_ROLES,
    tasks: dict[str, str] | None = None,
    state: str = STATE_OFF,
    snoozed: bool = False,
) -> MockPlant:
    """
    Register a plant device with problem sensors and care task sensors.

    ``tasks`` maps a key to a task type; a ``custom`` task's key is its name.
    """
    slug = name.lower().replace(" ", "_")
    plant_id = f"plant-{slug}"
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={(DOMAIN, plant_id)}, name=name
    )
    if area_id is not None:
        dr.async_get(hass).async_update_device(device.id, area_id=area_id)
    plant = MockPlant(name=name, plant_id=plant_id, device_id=device.id)
    registry = er.async_get(hass)
    for role in roles:
        registry_entry = registry.async_get_or_create(
            "binary_sensor",
            DOMAIN,
            f"{DOMAIN}:{plant_id}:{role}",
            config_entry=entry,
            device_id=device.id,
            suggested_object_id=f"{slug}_{role}",
            entity_category=(
                EntityCategory.DIAGNOSTIC if role == "low_battery" else None
            ),
        )
        plant.entities[role] = registry_entry.entity_id
        set_entity(
            hass,
            registry_entry.entity_id,
            state,
            snoozed=snoozed,
            friendly_name=f"{name} {ROLE_NAMES[role]}",
        )
    for key, task_type in (tasks or {}).items():
        registry_entry = registry.async_get_or_create(
            "binary_sensor",
            DOMAIN,
            f"{DOMAIN}:{plant_id}:care_task:{task_id(name, key)}:due",
            config_entry=entry,
            device_id=device.id,
            suggested_object_id=f"{slug}_{key}",
        )
        plant.entities[key] = registry_entry.entity_id
        set_entity(
            hass,
            registry_entry.entity_id,
            STATE_OFF,
            snoozed=snoozed,
            friendly_name=f"{name} {TASK_NAMES.get(task_type, key)}",
            task_type=task_type,
            status="scheduled",
        )
    return plant


async def setup_automation(
    hass: HomeAssistant,
    trigger: dict[str, Any],
    *,
    conditions: list[dict[str, Any]] | None = None,
) -> list[ServiceCall]:
    calls = async_mock_service(hass, "test", "record")
    assert await async_setup_component(
        hass,
        AUTOMATION,
        {
            AUTOMATION: {
                "alias": "plant test",
                "triggers": [trigger],
                "conditions": conditions or [],
                "actions": [{"action": "test.record", "data": RECORD}],
            }
        },
    )
    await hass.async_block_till_done()
    return list_of_calls(calls)


def list_of_calls(calls: Any) -> list[ServiceCall]:
    result: list[ServiceCall] = calls
    return result


def state_of(hass: HomeAssistant, entity_id: str) -> str:
    state = hass.states.get(entity_id)
    assert state is not None, entity_id
    return state.state


async def change(
    hass: HomeAssistant, entity_id: str, state: str, **kwargs: Any
) -> None:
    set_entity(hass, entity_id, state, **kwargs)
    await hass.async_block_till_done()


def fired(calls: list[ServiceCall]) -> list[str]:
    return [call.data["entity_id"] for call in calls]


async def advance(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, delta: timedelta
) -> None:
    freezer.tick(delta)
    async_fire_time_changed(hass)
    await hass.async_block_till_done()


# --- Validation -------------------------------------------------------------


async def validate(hass: HomeAssistant, configs: list[Any]) -> list[dict[str, Any]]:
    """Validate trigger configs the way an automation does."""
    return await async_validate_trigger_config(hass, cv.TRIGGER_SCHEMA(configs))


@pytest.mark.parametrize(
    "config",
    [
        {"trigger": "smart_plants.needs_water"},
        {
            "trigger": "smart_plants.needs_water",
            "target": {"area_id": "kitchen"},
            "options": {"behavior": "first", "for": {"minutes": 30}},
        },
        {
            "trigger": "smart_plants.problem_started",
            "options": {"problems": ["too_wet", "low_light"], "include_snoozed": True},
        },
        {"trigger": "smart_plants.problem_cleared", "options": {"for": "00:05:00"}},
        {
            "trigger": "smart_plants.care_task_due",
            "target": {"label_id": "balcony"},
            "options": {"task_types": ["winter_protection"]},
        },
    ],
)
async def test_valid_trigger_configs(
    hass: HomeAssistant, config: dict[str, Any]
) -> None:
    [validated] = await validate(hass, [config])
    assert validated["platform"] == config["trigger"]


async def test_trigger_defaults(hass: HomeAssistant) -> None:
    [needs_water, problem, task] = await validate(
        hass,
        [
            {"trigger": "smart_plants.needs_water"},
            {"trigger": "smart_plants.problem_started"},
            {"trigger": "smart_plants.care_task_due"},
        ],
    )
    assert needs_water["options"] == {"behavior": "each", "include_snoozed": False}
    assert problem["options"]["problems"] == list(PROBLEM_ROLES)
    assert task["options"]["task_types"] == [
        "fertilize",
        "prune",
        "repot",
        "pests",
        "winter_protection",
        "custom",
    ]


@pytest.mark.parametrize(
    "config",
    [
        pytest.param(
            {"trigger": "smart_plants.needs_water", "options": {"behavior": "any"}},
            id="condition behavior on a trigger",
        ),
        pytest.param(
            {
                "trigger": "smart_plants.needs_water",
                "options": {"problems": ["too_wet"]},
            },
            id="unknown option",
        ),
        pytest.param(
            {"trigger": "smart_plants.problem_started", "options": {"problems": []}},
            id="empty problems",
        ),
        pytest.param(
            {
                "trigger": "smart_plants.problem_started",
                "options": {"problems": ["dry"]},
            },
            id="unknown problem",
        ),
        pytest.param(
            {
                "trigger": "smart_plants.problem_started",
                "options": {"behavior": "each"},
            },
            id="behavior on a problem trigger",
        ),
        pytest.param(
            {
                "trigger": "smart_plants.problem_cleared",
                "options": {"include_snoozed": True},
            },
            id="snooze option on problem cleared",
        ),
        pytest.param(
            {
                "trigger": "smart_plants.care_task_due",
                "options": {"task_types": ["water"]},
            },
            id="unknown task type",
        ),
        pytest.param({"trigger": "smart_plants.watered"}, id="unknown trigger"),
    ],
)
async def test_invalid_trigger_configs(
    hass: HomeAssistant, config: dict[str, Any]
) -> None:
    with pytest.raises(vol.Invalid):
        await validate(hass, [config])


# --- needs_water ------------------------------------------------------------


async def test_needs_water_fires_on_off_to_on_with_variables(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"device_id": aloe.device_id},
        },
    )

    await change(hass, aloe["needs_water"], STATE_ON)

    assert len(calls) == 1
    assert calls[0].data == {
        "entity_id": aloe["needs_water"],
        "plant": "Aloe",
        "device_id": aloe.device_id,
        "problem": "needs_water",
        "problem_name": "Needs water",
        "task": "",
        "task_type": "",
    }
    # Staying on, or changing attributes only, does not fire again.
    await change(hass, aloe["needs_water"], STATE_ON, moisture=12)
    assert len(calls) == 1


async def test_needs_water_never_fires_from_unavailable(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe", state=STATE_UNAVAILABLE)
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"device_id": aloe.device_id},
        },
    )

    await change(hass, aloe["needs_water"], STATE_ON)
    assert calls == []
    await change(hass, aloe["needs_water"], STATE_OFF)
    await change(hass, aloe["needs_water"], STATE_ON)
    assert len(calls) == 1


async def test_needs_water_ignores_other_sensors(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"device_id": aloe.device_id},
        },
    )
    for role in PROBLEM_ROLES[1:]:
        await change(hass, aloe[role], STATE_ON)
    assert calls == []


async def test_needs_water_for_fires_after_the_delay(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"device_id": aloe.device_id},
            "options": {"for": {"minutes": 30}},
        },
    )

    await change(hass, aloe["needs_water"], STATE_ON)
    await advance(hass, freezer, timedelta(minutes=29))
    assert calls == []
    await advance(hass, freezer, timedelta(minutes=2))
    assert fired(calls) == [aloe["needs_water"]]


@pytest.mark.parametrize("interruption", [STATE_OFF, STATE_UNAVAILABLE])
async def test_needs_water_for_is_cancelled(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, interruption: str
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"device_id": aloe.device_id},
            "options": {"for": {"minutes": 30}},
        },
    )

    await change(hass, aloe["needs_water"], STATE_ON)
    await advance(hass, freezer, timedelta(minutes=10))
    await change(hass, aloe["needs_water"], interruption)
    await advance(hass, freezer, timedelta(minutes=30))
    assert calls == []


async def test_needs_water_behavior_first_and_all(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")
    target = {"device_id": [aloe.device_id, office.device_id]}
    first = async_mock_service(hass, "test", "first")
    every = async_mock_service(hass, "test", "all")
    assert await async_setup_component(
        hass,
        AUTOMATION,
        {
            AUTOMATION: [
                {
                    "triggers": [
                        {
                            "trigger": "smart_plants.needs_water",
                            "target": target,
                            "options": {"behavior": behavior},
                        }
                    ],
                    "actions": [{"action": f"test.{behavior}"}],
                }
                for behavior in ("first", "all")
            ]
        },
    )
    await hass.async_block_till_done()

    await change(hass, aloe["needs_water"], STATE_ON)
    assert (len(first), len(every)) == (1, 0)
    await change(hass, office["needs_water"], STATE_ON)
    assert (len(first), len(every)) == (1, 1)


# --- Snooze -----------------------------------------------------------------


async def test_snoozed_plant_does_not_fire_and_reminds_once_at_the_end(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe", snoozed=True)
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"device_id": aloe.device_id},
        },
    )

    await change(hass, aloe["needs_water"], STATE_ON)
    assert calls == []
    # Snoozing again only moves the end.
    await change(hass, aloe["needs_water"], STATE_ON, snoozed=True, snoozed_until="x")
    assert calls == []
    await change(hass, aloe["needs_water"], STATE_ON, snoozed=False)
    assert fired(calls) == [aloe["needs_water"]]


async def test_snooze_end_with_the_state_off_does_not_fire(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe", snoozed=True)
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"device_id": aloe.device_id},
        },
    )
    await change(hass, aloe["needs_water"], STATE_OFF, snoozed=False)
    assert calls == []


async def test_snooze_during_the_delay_cancels_it(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"device_id": aloe.device_id},
            "options": {"for": {"minutes": 30}},
        },
    )
    await change(hass, aloe["needs_water"], STATE_ON)
    await change(hass, aloe["needs_water"], STATE_ON, snoozed=True)
    await advance(hass, freezer, timedelta(minutes=31))
    assert calls == []


async def test_include_snoozed_fires_during_the_snooze_only(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe", snoozed=True)
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"device_id": aloe.device_id},
            "options": {"include_snoozed": True},
        },
    )
    await change(hass, aloe["needs_water"], STATE_ON)
    assert len(calls) == 1
    await change(hass, aloe["needs_water"], STATE_ON, snoozed=False)
    assert len(calls) == 1


async def test_snooze_end_while_unavailable_does_not_fire(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe", snoozed=True)
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"device_id": aloe.device_id},
        },
    )
    await change(hass, aloe["needs_water"], STATE_UNAVAILABLE)
    await change(hass, aloe["needs_water"], STATE_ON, snoozed=False)
    assert calls == []


# --- Targets ----------------------------------------------------------------


async def test_area_target_watches_plants_in_the_area_only(
    hass: HomeAssistant,
) -> None:
    kitchen = ar.async_get(hass).async_create("Kitchen")
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe", area_id=kitchen.id)
    office = mock_plant(hass, entry, "Office Aloe")
    # Another integration's moisture sensor in the same area.
    other = er.async_get(hass).async_get_or_create(
        "binary_sensor", "mock", "kitchen_leak", suggested_object_id="kitchen_leak"
    )
    er.async_get(hass).async_update_entity(other.entity_id, area_id=kitchen.id)
    hass.states.async_set(other.entity_id, STATE_OFF)
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.problem_started",
            "target": {"area_id": kitchen.id},
        },
    )

    await change(hass, other.entity_id, STATE_ON)
    await change(hass, office["too_wet"], STATE_ON)
    await change(hass, aloe["too_wet"], STATE_ON)
    assert fired(calls) == [aloe["too_wet"]]


async def test_label_target(hass: HomeAssistant) -> None:
    label = lr.async_get(hass).async_create("Balcony")
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")
    dr.async_get(hass).async_update_device(aloe.device_id, labels={label.label_id})
    calls = await setup_automation(
        hass,
        {"trigger": "smart_plants.needs_water", "target": {"label_id": label.label_id}},
    )
    await change(hass, office["needs_water"], STATE_ON)
    await change(hass, aloe["needs_water"], STATE_ON)
    assert fired(calls) == [aloe["needs_water"]]


async def test_entity_target_of_the_wrong_kind_matches_nothing(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"entity_id": aloe["too_wet"]},
        },
    )
    await change(hass, aloe["too_wet"], STATE_ON)
    await change(hass, aloe["needs_water"], STATE_ON)
    assert calls == []


async def test_entity_target_of_the_right_kind(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": {"entity_id": aloe["needs_water"]},
        },
    )
    await change(hass, aloe["needs_water"], STATE_ON)
    assert fired(calls) == [aloe["needs_water"]]


async def test_low_battery_is_found_through_its_plant(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.problem_started",
            "target": {"device_id": aloe.device_id},
            "options": {"problems": ["low_battery"]},
        },
    )
    await change(hass, aloe["too_wet"], STATE_ON)
    await change(hass, aloe["low_battery"], STATE_ON)
    assert fired(calls) == [aloe["low_battery"]]
    assert calls[0].data["problem"] == "low_battery"
    assert calls[0].data["problem_name"] == "Low battery"


async def test_no_target_watches_all_plants_and_plants_added_later(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {"trigger": "smart_plants.needs_water", "options": {"for": {"minutes": 30}}},
    )

    await change(hass, aloe["needs_water"], STATE_ON)
    await advance(hass, freezer, timedelta(minutes=10))
    # A new plant is tracked without firing, and the other plant's pending
    # delay keeps running.
    office = mock_plant(hass, entry, "Office Aloe", state=STATE_ON)
    await hass.async_block_till_done()
    await advance(hass, freezer, timedelta(minutes=21))
    assert fired(calls) == [aloe["needs_water"]]

    await change(hass, office["needs_water"], STATE_OFF)
    await change(hass, office["needs_water"], STATE_ON)
    await advance(hass, freezer, timedelta(minutes=31))
    assert fired(calls) == [aloe["needs_water"], office["needs_water"]]


async def test_no_target_skips_hidden_entities_and_other_integrations(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")
    er.async_get(hass).async_update_entity(
        office["needs_water"], hidden_by=er.RegistryEntryHider.USER
    )
    other = er.async_get(hass).async_get_or_create(
        "binary_sensor", "mock", "needs_water", suggested_object_id="mock_needs_water"
    )
    hass.states.async_set(other.entity_id, STATE_OFF)
    calls = await setup_automation(hass, {"trigger": "smart_plants.needs_water"})

    await change(hass, other.entity_id, STATE_ON)
    await change(hass, office["needs_water"], STATE_ON)
    await change(hass, aloe["needs_water"], STATE_ON)
    assert fired(calls) == [aloe["needs_water"]]


async def test_removed_entity_cancels_its_pending_delay(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {"trigger": "smart_plants.needs_water", "options": {"for": {"minutes": 30}}},
    )
    await change(hass, aloe["needs_water"], STATE_ON)
    er.async_get(hass).async_remove(aloe["needs_water"])
    hass.states.async_remove(aloe["needs_water"])
    await hass.async_block_till_done()
    await advance(hass, freezer, timedelta(minutes=31))
    assert calls == []


# --- Problem triggers -------------------------------------------------------


async def test_problem_started_filter_and_variables(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.problem_started",
            "options": {"problems": ["too_wet", "sensor_stale"]},
        },
    )
    await change(hass, aloe["needs_water"], STATE_ON)
    await change(hass, aloe["low_light"], STATE_ON)
    await change(hass, aloe["sensor_stale"], STATE_ON)
    assert fired(calls) == [aloe["sensor_stale"]]
    assert calls[0].data["problem"] == "sensor_stale"
    assert calls[0].data["problem_name"] == "Sensor stale"
    assert calls[0].data["plant"] == "Aloe"
    assert calls[0].data["device_id"] == aloe.device_id


async def test_problem_started_skips_snoozed_plants(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe", snoozed=True)
    calls = await setup_automation(hass, {"trigger": "smart_plants.problem_started"})
    await change(hass, aloe["too_wet"], STATE_ON)
    assert calls == []
    await change(hass, aloe["too_wet"], STATE_ON, snoozed=False)
    assert fired(calls) == [aloe["too_wet"]]


async def test_problem_variables_use_the_renamed_plant(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    dr.async_get(hass).async_update_device(aloe.device_id, name_by_user="Big Aloe")
    calls = await setup_automation(hass, {"trigger": "smart_plants.problem_started"})
    await change(hass, aloe["too_wet"], STATE_ON, friendly_name="Big Aloe Too wet")
    assert calls[0].data["plant"] == "Big Aloe"
    assert calls[0].data["problem_name"] == "Too wet"


async def test_problem_cleared_ignores_snooze_and_unavailable(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe", state=STATE_ON, snoozed=True)
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.problem_cleared",
            "options": {"problems": ["too_wet"]},
        },
    )
    await change(hass, aloe["needs_water"], STATE_OFF)
    await change(hass, aloe["too_wet"], STATE_OFF)
    assert fired(calls) == [aloe["too_wet"]]
    assert calls[0].data["problem"] == "too_wet"

    await change(hass, aloe["too_wet"], STATE_UNAVAILABLE)
    await change(hass, aloe["too_wet"], STATE_OFF)
    assert len(calls) == 1


# --- Care task triggers -----------------------------------------------------


async def test_care_task_due_filter_and_variables(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(
        hass,
        entry,
        "Aloe",
        tasks={
            "fertilize": "fertilize",
            "frost": "winter_protection",
            "Mist": "custom",
        },
    )
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.care_task_due",
            "options": {"task_types": ["winter_protection", "custom"]},
        },
    )
    await change(hass, aloe["fertilize"], STATE_ON, status="due")
    await change(hass, aloe["needs_water"], STATE_ON)
    await change(hass, aloe["frost"], STATE_ON, status="due")
    await change(hass, aloe["Mist"], STATE_ON, status="overdue")
    assert fired(calls) == [aloe["frost"], aloe["Mist"]]
    assert calls[0].data["task"] == "Winter protection"
    assert calls[0].data["task_type"] == "winter_protection"
    assert calls[1].data["task"] == "Mist"
    assert calls[1].data["task_type"] == "custom"
    assert calls[0].data["plant"] == "Aloe"


async def test_care_task_due_skips_snoozed_plants(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(
        hass, entry, "Aloe", tasks={"fertilize": "fertilize"}, snoozed=True
    )
    calls = await setup_automation(hass, {"trigger": "smart_plants.care_task_due"})
    await change(hass, aloe["fertilize"], STATE_ON)
    assert calls == []
    await change(hass, aloe["fertilize"], STATE_ON, snoozed=False)
    assert fired(calls) == [aloe["fertilize"]]


# --- With the integration loaded --------------------------------------------

SOIL = "sensor.mock_soil"
PERCENT = {"unit_of_measurement": "%"}
EVERY_TWO_DAYS = {
    "kind": "interval",
    "every": 2,
    "unit": "days",
    "growing_season_only": False,
}


async def setup_integration(hass: HomeAssistant) -> MockConfigEntry:
    assert await async_setup_component(hass, DOMAIN, {})
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def manager_of(entry: MockConfigEntry) -> SmartPlantsManager:
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


async def watered_plant(  # noqa: PLR0913
    hass: HomeAssistant,
    manager: SmartPlantsManager,
    name: str = "Aloe",
    *,
    soil: str = SOIL,
    moisture: str = "45",
    area_id: str | None = None,
) -> str:
    """Create a plant with a moisture sensor; return its plant ID."""
    hass.states.async_set(soil, moisture, PERCENT)
    plant = await manager.async_create_plant(name=name, area_id=area_id)
    plant = await manager.async_set_role_sources(
        plant.id,
        role="moisture",
        expected_revision=plant.revision,
        sources=[{"entity_id": soil}],
    )
    await manager.async_set_role_primary(
        plant.id,
        role="moisture",
        expected_revision=plant.revision,
        primary_entity_id=soil,
    )
    await hass.async_block_till_done()
    return plant.id


def entity_of(hass: HomeAssistant, plant_id: str, role: str) -> str:
    entity_id = er.async_get(hass).async_get_entity_id(
        "binary_sensor", DOMAIN, f"{DOMAIN}:{plant_id}:{role}"
    )
    assert entity_id is not None
    return entity_id


async def set_soil(hass: HomeAssistant, value: str, soil: str = SOIL) -> None:
    hass.states.async_set(soil, value, PERCENT)
    await hass.async_block_till_done()


async def test_real_plant_needs_water_snooze_and_catch_up(
    hass: HomeAssistant,
) -> None:
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    plant_id = await watered_plant(hass, manager)
    calls = await setup_automation(hass, {"trigger": "smart_plants.needs_water"})

    plant = manager.get_plant(plant_id)
    await manager.async_snooze_plant(
        plant_id,
        expected_revision=plant.revision,
        until=dt_util.now() + timedelta(days=3),
    )
    await set_soil(hass, "10")
    assert state_of(hass, entity_of(hass, plant_id, "needs_water")) == STATE_ON
    assert calls == []

    await manager.async_unsnooze_plant(
        plant_id, expected_revision=manager.get_plant(plant_id).revision
    )
    await hass.async_block_till_done()
    assert len(calls) == 1
    assert calls[0].data["plant"] == "Aloe"
    assert calls[0].data["problem_name"] == "Needs water"


async def test_real_plant_added_to_a_targeted_area_is_tracked_without_firing(
    hass: HomeAssistant,
) -> None:
    kitchen = ar.async_get(hass).async_create("Kitchen")
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    calls = await setup_automation(
        hass,
        {"trigger": "smart_plants.needs_water", "target": {"area_id": kitchen.id}},
    )
    await watered_plant(hass, manager, moisture="10", area_id=kitchen.id)
    assert calls == []

    await set_soil(hass, "45")
    await set_soil(hass, "10")
    assert len(calls) == 1


async def test_pause_and_resume_never_fire(hass: HomeAssistant) -> None:
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    plant_id = await watered_plant(hass, manager, moisture="10")
    calls = await setup_automation(hass, {"trigger": "smart_plants.needs_water"})

    await manager.async_disable_plant(
        plant_id, expected_revision=manager.get_plant(plant_id).revision
    )
    await hass.async_block_till_done()
    assert state_of(hass, entity_of(hass, plant_id, "needs_water")) == STATE_UNAVAILABLE
    await manager.async_reenable_plant(
        plant_id, expected_revision=manager.get_plant(plant_id).revision
    )
    await hass.async_block_till_done()
    assert state_of(hass, entity_of(hass, plant_id, "needs_water")) == STATE_ON
    assert calls == []


async def test_deleted_plant_cancels_its_pending_delay(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    plant_id = await watered_plant(hass, manager)
    calls = await setup_automation(
        hass,
        {"trigger": "smart_plants.needs_water", "options": {"for": {"minutes": 30}}},
    )
    await set_soil(hass, "10")
    await manager.async_delete_plant(
        plant_id, expected_revision=manager.get_plant(plant_id).revision
    )
    await hass.async_block_till_done()
    await advance(hass, freezer, timedelta(minutes=31))
    assert calls == []


async def test_entry_reload_keeps_automations_working(hass: HomeAssistant) -> None:
    entry = await setup_integration(hass)
    plant_id = await watered_plant(hass, manager_of(entry))
    calls = await setup_automation(hass, {"trigger": "smart_plants.needs_water"})

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert calls == []
    await set_soil(hass, "10")
    assert len(calls) == 1
    assert calls[0].data["entity_id"] == entity_of(hass, plant_id, "needs_water")


async def test_unloaded_entry_validates_and_fires_nothing(hass: HomeAssistant) -> None:
    entry = await setup_integration(hass)
    await watered_plant(hass, manager_of(entry))
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    calls = await setup_automation(hass, {"trigger": "smart_plants.needs_water"})
    assert hass.states.get("automation.plant_test") is not None
    assert state_of(hass, "automation.plant_test") == STATE_ON
    await set_soil(hass, "10")
    assert calls == []


async def test_care_task_due_at_the_midnight_recompute(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to("2026-06-14T23:59:00-07:00")
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    plant = await manager.async_create_plant(name="Aloe")
    _updated, task = await manager.async_create_care_task(
        plant.id,
        expected_revision=plant.revision,
        task_type="fertilize",
        name=None,
        schedule=EVERY_TWO_DAYS,
        instructions=None,
        baseline_done_on="2026-06-13",
    )
    await hass.async_block_till_done()
    calls = await setup_automation(hass, {"trigger": "smart_plants.care_task_due"})

    freezer.move_to("2026-06-15T00:00:01-07:00")
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    assert len(calls) == 1
    assert calls[0].data["task"] == "Fertilize"
    assert calls[0].data["task_type"] == "fertilize"
    assert calls[0].data["plant"] == "Aloe"
    assert calls[0].data["entity_id"] == entity_of(
        hass, plant.id, f"care_task:{task.id}:due"
    )

    # Overdue the next day is not a new start.
    freezer.move_to("2026-06-16T00:00:01-07:00")
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(calls) == 1


async def test_reading_task_crossing_and_task_deleted(hass: HomeAssistant) -> None:
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    temperature = "sensor.mock_temperature"
    hass.states.async_set(temperature, "12", {"unit_of_measurement": "°C"})
    plant = await manager.async_create_plant(name="Aloe")
    plant = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": temperature}],
    )
    _updated, task = await manager.async_create_care_task(
        plant.id,
        expected_revision=plant.revision,
        task_type="winter_protection",
        name=None,
        schedule={
            "kind": "reading",
            "source": {"role": "temperature"},
            "condition": "below",
            "value": 5.0,
            "unit": "°C",
            "for_minutes": 0,
            "reset_value": None,
        },
        instructions=None,
        baseline_done_on=None,
    )
    await hass.async_block_till_done()
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.care_task_due",
            "options": {"task_types": ["winter_protection"]},
        },
    )

    hass.states.async_set(temperature, "2", {"unit_of_measurement": "°C"})
    await hass.async_block_till_done()
    assert len(calls) == 1
    assert calls[0].data["task"] == "Winter protection"

    # Deleting the task removes its entity; nothing fires.
    await manager.async_delete_care_task(
        plant.id,
        task.id,
        expected_revision=manager.get_plant(plant.id).revision,
    )
    await hass.async_block_till_done()
    assert (
        er.async_get(hass).async_get_entity_id(
            "binary_sensor", DOMAIN, f"{DOMAIN}:{plant.id}:care_task:{task.id}:due"
        )
        is None
    )
    assert len(calls) == 1


async def test_automation_turned_off_detaches(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(hass, {"trigger": "smart_plants.needs_water"})
    await hass.services.async_call(
        AUTOMATION,
        SERVICE_TURN_OFF,
        {ATTR_ENTITY_ID: "automation.plant_test"},
        blocking=True,
    )
    await change(hass, aloe["needs_water"], STATE_ON)
    assert calls == []
