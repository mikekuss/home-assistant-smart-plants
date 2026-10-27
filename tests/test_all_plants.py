"""The All plants entity and its use as the target for all plants."""

from __future__ import annotations

from typing import Any

from custom_components.smart_plants.const import DOMAIN
from homeassistant.components.automation.config import async_validate_config_item
from homeassistant.components.binary_sensor import BinarySensorDeviceClass
from homeassistant.const import (
    ATTR_DEVICE_CLASS,
    ATTR_FRIENDLY_NAME,
    STATE_OFF,
    STATE_ON,
    STATE_UNAVAILABLE,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from .test_conditions import check, get_report
from .test_triggers import (
    change,
    fired,
    mock_entry,
    mock_plant,
    set_entity,
    setup_automation,
    setup_integration,
    state_of,
)

ALL_PLANTS = "binary_sensor.smart_plants_all_plants"
UNIQUE_ID = f"{DOMAIN}:all_plants"


def mock_all_plants(hass: HomeAssistant, entry: MockConfigEntry) -> str:
    """Register the All plants entity without loading the integration."""
    registry_entry = er.async_get(hass).async_get_or_create(
        "binary_sensor",
        DOMAIN,
        UNIQUE_ID,
        config_entry=entry,
        suggested_object_id="smart_plants_all_plants",
    )
    hass.states.async_set(registry_entry.entity_id, STATE_OFF)
    return registry_entry.entity_id


def all_plants_target(entity_id: str = ALL_PLANTS, **other: Any) -> dict[str, Any]:
    return {"entity_id": [entity_id], **other}


# --- The entity -------------------------------------------------------------


async def test_entity_registration_and_attributes(hass: HomeAssistant) -> None:
    await setup_integration(hass)
    registry_entry = er.async_get(hass).async_get(ALL_PLANTS)
    assert registry_entry is not None
    assert registry_entry.unique_id == UNIQUE_ID
    assert registry_entry.device_id is None
    assert registry_entry.disabled_by is None
    state = hass.states.get(ALL_PLANTS)
    assert state is not None
    assert state.state == STATE_OFF
    assert dict(state.attributes) == {
        ATTR_DEVICE_CLASS: BinarySensorDeviceClass.PROBLEM,
        ATTR_FRIENDLY_NAME: "All plants",
    }


async def test_entity_is_on_for_water_problem_and_care_due(
    hass: HomeAssistant,
) -> None:
    entry = await setup_integration(hass)
    aloe = mock_plant(hass, entry, "Aloe", tasks={"fertilize": "fertilize"})
    await hass.async_block_till_done()
    assert state_of(hass, ALL_PLANTS) == STATE_OFF

    for key in ("needs_water", "too_wet", "low_battery", "fertilize"):
        await change(hass, aloe[key], STATE_ON)
        assert state_of(hass, ALL_PLANTS) == STATE_ON, key
        await change(hass, aloe[key], STATE_OFF)
        assert state_of(hass, ALL_PLANTS) == STATE_OFF, key


async def test_entity_leaves_out_snoozed_and_paused_plants(
    hass: HomeAssistant,
) -> None:
    entry = await setup_integration(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")

    await change(hass, aloe["needs_water"], STATE_ON, snoozed=True)
    assert state_of(hass, ALL_PLANTS) == STATE_OFF
    await change(hass, aloe["needs_water"], STATE_ON, snoozed=False)
    assert state_of(hass, ALL_PLANTS) == STATE_ON

    # A paused plant's sensors are all unavailable.
    for entity_id in aloe.entities.values():
        set_entity(hass, entity_id, STATE_UNAVAILABLE)
    await hass.async_block_till_done()
    assert state_of(hass, ALL_PLANTS) == STATE_OFF

    await change(hass, office["co2_stress"], STATE_ON)
    assert state_of(hass, ALL_PLANTS) == STATE_ON


async def test_entity_turns_off_when_the_last_plant_goes(hass: HomeAssistant) -> None:
    entry = await setup_integration(hass)
    aloe = mock_plant(hass, entry, "Aloe", state=STATE_ON)
    await change(hass, aloe["needs_water"], STATE_ON)
    assert state_of(hass, ALL_PLANTS) == STATE_ON

    registry = er.async_get(hass)
    for entity_id in aloe.entities.values():
        registry.async_remove(entity_id)
        hass.states.async_remove(entity_id)
    await hass.async_block_till_done()
    assert state_of(hass, ALL_PLANTS) == STATE_OFF


# --- Triggers ---------------------------------------------------------------


async def test_trigger_with_the_entity_watches_all_plants(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    all_plants = mock_all_plants(hass, entry)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {"trigger": "smart_plants.needs_water", "target": all_plants_target()},
    )

    office = mock_plant(hass, entry, "Office Aloe")
    await hass.async_block_till_done()
    await change(hass, aloe["needs_water"], STATE_ON)
    await change(hass, office["needs_water"], STATE_ON)
    # The entity's own state change is not a plant's.
    await change(hass, all_plants, STATE_ON)
    assert fired(calls) == [aloe["needs_water"], office["needs_water"]]


async def test_trigger_finds_the_entity_after_a_rename(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    mock_all_plants(hass, entry)
    er.async_get(hass).async_update_entity(
        ALL_PLANTS, new_entity_id="binary_sensor.every_plant"
    )
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.problem_started",
            "target": all_plants_target("binary_sensor.every_plant"),
        },
    )

    await change(hass, aloe["too_wet"], STATE_ON)
    assert fired(calls) == [aloe["too_wet"]]


async def test_trigger_with_a_mixed_target_watches_all_plants(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    mock_all_plants(hass, entry)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")
    calls = await setup_automation(
        hass,
        {
            "trigger": "smart_plants.needs_water",
            "target": all_plants_target(device_id=[aloe.device_id]),
        },
    )

    await change(hass, office["needs_water"], STATE_ON)
    assert fired(calls) == [office["needs_water"]]


async def test_trigger_with_a_deleted_entity_matches_nothing(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(
        hass,
        {"trigger": "smart_plants.needs_water", "target": all_plants_target()},
    )

    await change(hass, aloe["needs_water"], STATE_ON)
    assert fired(calls) == []


async def test_empty_target_still_watches_all_plants(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    mock_all_plants(hass, entry)
    aloe = mock_plant(hass, entry, "Aloe")
    calls = await setup_automation(hass, {"trigger": "smart_plants.needs_water"})

    await change(hass, aloe["needs_water"], STATE_ON)
    assert fired(calls) == [aloe["needs_water"]]


# --- Conditions -------------------------------------------------------------


async def test_conditions_with_the_entity_check_all_plants(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    mock_all_plants(hass, entry)
    er.async_get(hass).async_update_entity(
        ALL_PLANTS, new_entity_id="binary_sensor.every_plant"
    )
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")
    target = all_plants_target("binary_sensor.every_plant")

    def condition(name: str, **options: Any) -> dict[str, Any]:
        return {
            "condition": f"smart_plants.{name}",
            "target": target,
            "options": options,
        }

    assert await check(hass, condition("needs_water")) is False
    assert await check(hass, condition("needs_attention")) is False
    await change(hass, office["needs_water"], STATE_ON)
    assert await check(hass, condition("needs_water")) is True
    assert await check(hass, condition("needs_water", behavior="all")) is False
    assert await check(hass, condition("needs_attention")) is True

    # Snoozed plants are left out.
    await change(hass, aloe["needs_water"], STATE_OFF, snoozed=True)
    await change(hass, office["needs_water"], STATE_ON, snoozed=True)
    assert await check(hass, condition("is_not_snoozed")) is False
    assert await check(hass, condition("needs_attention")) is False


async def test_condition_with_a_mixed_target_checks_all_plants(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    mock_all_plants(hass, entry)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")
    await change(hass, office["needs_water"], STATE_ON)

    config = {
        "condition": "smart_plants.needs_water",
        "target": all_plants_target(device_id=[aloe.device_id]),
    }
    assert await check(hass, config) is True


# --- The report -------------------------------------------------------------


async def test_report_with_the_entity_lists_all_plants(hass: HomeAssistant) -> None:
    entry = await setup_integration(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")
    await change(hass, aloe["needs_water"], STATE_ON)
    await change(hass, office["too_wet"], STATE_ON)

    everything = await get_report(hass)
    assert everything["count"] == 2
    assert await get_report(hass, entity_id=ALL_PLANTS) == everything
    assert (
        await get_report(hass, entity_id=[ALL_PLANTS], device_id=[aloe.device_id])
        == everything
    )
    only_aloe = await get_report(hass, device_id=[aloe.device_id])
    assert only_aloe["count"] == 1

    er.async_get(hass).async_update_entity(
        ALL_PLANTS, new_entity_id="binary_sensor.every_plant"
    )
    assert await get_report(hass, entity_id="binary_sensor.every_plant") == everything


# --- Automation configs -----------------------------------------------------


async def test_automation_with_the_entity_everywhere_validates(
    hass: HomeAssistant,
) -> None:
    await setup_integration(hass)
    target = all_plants_target()
    config = {
        "alias": "All plants",
        "triggers": [
            {"trigger": "smart_plants.needs_water", "target": target},
            {"trigger": "smart_plants.care_task_due", "target": target},
        ],
        "conditions": [
            {"condition": "smart_plants.needs_attention", "target": target},
            {"condition": "smart_plants.is_not_snoozed", "target": target},
        ],
        "actions": [
            {
                "action": "smart_plants.get_report",
                "target": target,
                "response_variable": "report",
            }
        ],
    }
    validated = await async_validate_config_item(hass, "all_plants", config)
    assert validated is not None
    assert validated.validation_error is None
