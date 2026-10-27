"""Plant automation conditions, the golden notification configs, and strings."""

from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path
from typing import Any

import pytest
import voluptuous as vol
from custom_components.smart_plants.const import DOMAIN
from freezegun.api import FrozenDateTimeFactory
from homeassistant.components.automation.config import async_validate_config_item
from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import condition as condition_helper
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from homeassistant.util.yaml import parse_yaml
from pytest_homeassistant_custom_component.common import (
    async_fire_time_changed,
    async_mock_service,
)

from .test_triggers import (
    AUTOMATION,
    change,
    manager_of,
    mock_entry,
    mock_plant,
    set_soil,
    setup_integration,
    watered_plant,
)

INTEGRATION = Path(__file__).parents[1] / "custom_components" / DOMAIN
GOLDEN = Path(__file__).parent / "fixtures" / "notification_automations"


def load_yaml_dict(text: str) -> dict[str, Any]:
    data = parse_yaml(text)
    assert isinstance(data, dict)
    return data


async def check(hass: HomeAssistant, config: dict[str, Any]) -> bool | None:
    validated = await condition_helper.async_validate_condition_config(hass, config)
    checker = await condition_helper.async_from_config(hass, validated)
    try:
        return checker(hass, {})
    finally:
        checker.async_unload()


def needs_water(**options: Any) -> dict[str, Any]:
    return {"condition": "smart_plants.needs_water", "options": options}


# --- Validation -------------------------------------------------------------


@pytest.mark.parametrize(
    "config",
    [
        {"condition": "smart_plants.needs_water"},
        {
            "condition": "smart_plants.needs_water",
            "target": {"area_id": "kitchen"},
            "options": {"behavior": "all", "for": {"minutes": 10}},
        },
        {"condition": "smart_plants.has_problem", "options": {"problems": ["too_wet"]}},
        {
            "condition": "smart_plants.care_task_due",
            "options": {"task_types": ["repot"], "behavior": "all"},
        },
        {"condition": "smart_plants.is_not_snoozed", "target": {"label_id": "balcony"}},
        {
            "condition": "smart_plants.needs_attention",
            "options": {"include": ["needs_water"], "include_snoozed": True},
        },
    ],
)
async def test_valid_condition_configs(
    hass: HomeAssistant, config: dict[str, Any]
) -> None:
    await condition_helper.async_validate_condition_config(hass, config)


@pytest.mark.parametrize(
    "config",
    [
        {"condition": "smart_plants.needs_water", "options": {"behavior": "each"}},
        {"condition": "smart_plants.has_problem", "options": {"problems": []}},
        {"condition": "smart_plants.has_problem", "options": {"for": "00:01:00"}},
        {"condition": "smart_plants.care_task_due", "options": {"task_types": ["x"]}},
        {"condition": "smart_plants.is_not_snoozed", "options": {"include": []}},
        {"condition": "smart_plants.needs_attention", "options": {"include": ["all"]}},
        {"condition": "smart_plants.is_snoozed"},
    ],
)
async def test_invalid_condition_configs(
    hass: HomeAssistant, config: dict[str, Any]
) -> None:
    with pytest.raises(vol.Invalid):
        await condition_helper.async_validate_condition_config(hass, config)


# --- needs_water ------------------------------------------------------------


async def test_needs_water_any_all_and_no_available_plant(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")

    assert await check(hass, needs_water()) is False
    await change(hass, aloe["needs_water"], STATE_ON)
    assert await check(hass, needs_water()) is True
    assert await check(hass, needs_water(behavior="all")) is False
    # Unavailable plants are left out.
    await change(hass, office["needs_water"], STATE_UNAVAILABLE)
    assert await check(hass, needs_water(behavior="all")) is True
    # With no available plant even "all" fails.
    await change(hass, aloe["needs_water"], STATE_UNAVAILABLE)
    assert await check(hass, needs_water(behavior="all")) is False


async def test_needs_water_target_and_for(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")
    target = {"device_id": office.device_id}
    await change(hass, aloe["needs_water"], STATE_ON)
    assert await check(hass, {**needs_water(), "target": target}) is False

    await change(hass, office["needs_water"], STATE_ON)
    freezer.tick(timedelta(minutes=5))
    config = {**needs_water(**{"for": {"minutes": 10}}), "target": target}
    assert await check(hass, config) is False
    # A snooze changes attributes only; the time on keeps counting.
    await change(hass, office["needs_water"], STATE_ON, snoozed=True)
    freezer.tick(timedelta(minutes=6))
    assert await check(hass, config) is True


async def test_wrong_kind_entity_target_matches_nothing(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe", state=STATE_ON)
    config = {**needs_water(), "target": {"entity_id": aloe["too_wet"]}}
    assert await check(hass, config) is False


# --- Grouped conditions -----------------------------------------------------


async def test_has_problem_groups_by_plant(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")
    has_problem: dict[str, Any] = {"condition": "smart_plants.has_problem"}
    every = {**has_problem, "options": {"behavior": "all"}}

    assert await check(hass, has_problem) is False
    await change(hass, aloe["too_wet"], STATE_ON)
    assert await check(hass, has_problem) is True
    # One problem per plant is enough for "all"; other sensors stay off.
    assert await check(hass, every) is False
    await change(hass, office["low_battery"], STATE_ON)
    assert await check(hass, every) is True

    only_light = {**has_problem, "options": {"problems": ["low_light"]}}
    assert await check(hass, only_light) is False
    # The snooze does not change the real state.
    await change(hass, aloe["low_light"], STATE_ON, snoozed=True)
    assert await check(hass, only_light) is True


async def test_has_problem_area_target_ignores_other_integrations(
    hass: HomeAssistant,
) -> None:
    kitchen = ar.async_get(hass).async_create("Kitchen")
    entry = mock_entry(hass)
    mock_plant(hass, entry, "Aloe", area_id=kitchen.id)
    other = er.async_get(hass).async_get_or_create(
        "binary_sensor", "mock", "kitchen_leak", suggested_object_id="kitchen_leak"
    )
    er.async_get(hass).async_update_entity(other.entity_id, area_id=kitchen.id)
    hass.states.async_set(other.entity_id, STATE_ON)
    config = {
        "condition": "smart_plants.has_problem",
        "target": {"area_id": kitchen.id},
    }
    assert await check(hass, config) is False


async def test_care_task_due_by_type_and_plant(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(
        hass, entry, "Aloe", tasks={"fertilize": "fertilize", "repot": "repot"}
    )
    office = mock_plant(hass, entry, "Office Aloe", tasks={"prune": "prune"})
    due: dict[str, Any] = {"condition": "smart_plants.care_task_due"}

    assert await check(hass, due) is False
    await change(hass, aloe["fertilize"], STATE_ON, status="due")
    assert await check(hass, due) is True
    assert await check(hass, {**due, "options": {"behavior": "all"}}) is False
    # Office Aloe has no repot task, so it does not count for "all".
    repot_all = {**due, "options": {"task_types": ["repot"], "behavior": "all"}}
    assert await check(hass, repot_all) is False
    await change(hass, aloe["repot"], STATE_ON, status="overdue")
    assert await check(hass, repot_all) is True
    await change(hass, office["prune"], STATE_ON, status="due")
    assert await check(hass, {**due, "options": {"behavior": "all"}}) is True


async def test_is_not_snoozed_reads_any_available_sensor(
    hass: HomeAssistant,
) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe", snoozed=True)
    not_snoozed: dict[str, Any] = {"condition": "smart_plants.is_not_snoozed"}
    aloe_only = {**not_snoozed, "target": {"device_id": aloe.device_id}}
    office_only = {**not_snoozed, "target": {"device_id": office.device_id}}

    assert await check(hass, aloe_only) is True
    assert await check(hass, office_only) is False
    assert await check(hass, not_snoozed) is True
    assert await check(hass, {**not_snoozed, "options": {"behavior": "all"}}) is False

    # Sensor stale disabled or hidden: the other sensors still carry it.
    registry = er.async_get(hass)
    registry.async_update_entity(
        office["sensor_stale"], hidden_by=er.RegistryEntryHider.USER
    )
    registry.async_update_entity(
        office["too_wet"], disabled_by=er.RegistryEntryDisabler.USER
    )
    hass.states.async_remove(office["too_wet"])
    await hass.async_block_till_done()
    assert await check(hass, office_only) is False

    # Any snoozed sensor makes the plant snoozed.
    await change(hass, aloe["low_light"], STATE_OFF, snoozed=True)
    assert await check(hass, aloe_only) is False


async def test_is_not_snoozed_leaves_out_paused_plants(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe", snoozed=True)
    for entity_id in office.entities.values():
        await change(hass, entity_id, STATE_UNAVAILABLE)
    every = {"condition": "smart_plants.is_not_snoozed", "options": {"behavior": "all"}}
    assert await check(hass, every) is True
    for entity_id in aloe.entities.values():
        await change(hass, entity_id, STATE_UNAVAILABLE)
    assert await check(hass, every) is False


async def test_not_is_not_snoozed_means_snoozed(hass: HomeAssistant) -> None:
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe", snoozed=True)
    config = {
        "condition": "not",
        "conditions": [
            {
                "condition": "smart_plants.is_not_snoozed",
                "target": {"device_id": aloe.device_id},
            }
        ],
    }
    assert await check(hass, config) is True


# --- needs_attention --------------------------------------------------------


async def get_report(hass: HomeAssistant, **data: Any) -> dict[str, Any]:
    response = await hass.services.async_call(
        DOMAIN, "get_report", data, blocking=True, return_response=True
    )
    assert isinstance(response, dict)
    return response


@pytest.mark.parametrize(
    "options",
    [
        {},
        {"include": ["needs_water"]},
        {"include": ["problems"]},
        {"include": ["care_tasks"]},
        {"include_snoozed": True},
        {"include": ["problems"], "include_snoozed": True},
    ],
)
async def test_needs_attention_agrees_with_the_report(
    hass: HomeAssistant, options: dict[str, Any]
) -> None:
    kitchen = ar.async_get(hass).async_create("Kitchen")
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    aloe_id = await watered_plant(hass, manager, "Aloe", area_id=kitchen.id)
    await watered_plant(hass, manager, "Office Aloe", soil="sensor.mock_soil_office")
    await set_soil(hass, "95", "sensor.mock_soil_office")
    await set_soil(hass, "10")
    aloe = manager.get_plant(aloe_id)
    await manager.async_snooze_plant(
        aloe_id,
        expected_revision=aloe.revision,
        until=dt_util.now() + timedelta(days=1),
    )
    await hass.async_block_till_done()

    for target in ({}, {"area_id": kitchen.id}):
        condition = {
            "condition": "smart_plants.needs_attention",
            "options": options,
            **({"target": target} if target else {}),
        }
        report = await get_report(hass, **options, **target)
        assert await check(hass, condition) is report["has_items"], (options, target)


async def test_needs_attention_fails_without_plants(hass: HomeAssistant) -> None:
    assert await check(hass, {"condition": "smart_plants.needs_attention"}) is False


# --- Golden notification configs --------------------------------------------


def golden(name: str) -> dict[str, Any]:
    config: dict[str, Any] = load_yaml_dict(
        (GOLDEN / f"{name}.yaml").read_text(encoding="utf-8")
    )
    return config


async def test_golden_configs_validate_against_the_platforms(
    hass: HomeAssistant,
) -> None:
    await setup_integration(hass)
    for name in ("daily_report", "needs_water", "needs_water_all_plants"):
        validated = await async_validate_config_item(hass, name, golden(name))
        assert validated is not None
        assert validated.validation_error is None, (name, validated.validation_error)


async def test_golden_daily_report_runs(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to("2026-06-15T07:59:00-07:00")
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    await watered_plant(hass, manager, "Aloe")
    # The example asks for an English report, so a German system language
    # does not change the message.
    hass.config.language = "de"
    sent = async_mock_service(hass, "notify", "send_message")
    assert await async_setup_component(
        hass, AUTOMATION, {AUTOMATION: [golden("daily_report")]}
    )
    await hass.async_block_till_done()

    freezer.move_to("2026-06-15T08:00:00-07:00")
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert sent == []

    freezer.move_to("2026-06-16T07:59:00-07:00")
    await set_soil(hass, "10")
    freezer.move_to("2026-06-16T08:00:00-07:00")
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(sent) == 1
    assert sent[0].data == {
        "entity_id": ["notify.mock_chat"],
        "title": "1 plant needs attention",
        "message": "• Aloe: Needs water",
    }
    # Detach the time trigger so no timer outlives the test.
    await hass.services.async_call(
        AUTOMATION, "turn_off", {"entity_id": "all"}, blocking=True
    )


async def test_golden_needs_water_runs_outside_quiet_hours(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to("2026-06-15T12:00:00-07:00")
    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    office = mock_plant(hass, entry, "Office Aloe")
    sent = async_mock_service(hass, "notify", "mobile_app_mock_phone")
    config = golden("needs_water")
    # The fixture uses placeholder device IDs; run it against real ones.
    config["triggers"][0]["target"]["device_id"] = [aloe.device_id]
    assert await async_setup_component(hass, AUTOMATION, {AUTOMATION: [config]})
    await hass.async_block_till_done()

    await change(hass, office["needs_water"], STATE_ON)
    await change(hass, aloe["needs_water"], STATE_ON)
    freezer.tick(timedelta(minutes=31))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(sent) == 1
    assert sent[0].data == {
        "title": "Aloe needs water",
        "message": "Water it when you get a chance.",
    }

    # During quiet hours the message is dropped.
    freezer.move_to("2026-06-15T23:00:00-07:00")
    await change(hass, aloe["needs_water"], STATE_OFF)
    await change(hass, aloe["needs_water"], STATE_ON)
    freezer.tick(timedelta(minutes=31))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(sent) == 1


async def test_golden_needs_water_for_all_plants_runs(hass: HomeAssistant) -> None:
    entry = await setup_integration(hass)
    aloe = mock_plant(hass, entry, "Aloe")
    sent = async_mock_service(hass, "notify", "send_message")
    assert await async_setup_component(
        hass, AUTOMATION, {AUTOMATION: [golden("needs_water_all_plants")]}
    )
    await hass.async_block_till_done()

    office = mock_plant(hass, entry, "Office Aloe")
    await hass.async_block_till_done()
    await change(hass, office["needs_water"], STATE_ON)
    await change(hass, aloe["needs_water"], STATE_ON)
    assert [call.data["title"] for call in sent] == [
        "Office Aloe needs water",
        "Aloe needs water",
    ]


# --- Strings ----------------------------------------------------------------


def _description_keys(file_name: str) -> dict[str, set[str]]:
    data = load_yaml_dict((INTEGRATION / file_name).read_text(encoding="utf-8"))
    return {
        key: set((value or {}).get("fields", {}))
        for key, value in data.items()
        if not key.startswith(".")
    }


@pytest.mark.parametrize("language", ["en", "de"])
@pytest.mark.parametrize(
    ("file_name", "section"),
    [
        ("triggers.yaml", "triggers"),
        ("conditions.yaml", "conditions"),
        ("services.yaml", "services"),
    ],
)
def test_descriptions_are_translated(
    language: str, file_name: str, section: str
) -> None:
    strings = json.loads(
        (INTEGRATION / "translations" / f"{language}.json").read_text(encoding="utf-8")
    )
    icons = json.loads((INTEGRATION / "icons.json").read_text(encoding="utf-8"))
    for key, fields in _description_keys(file_name).items():
        entry = strings[section][key]
        assert entry["name"]
        assert entry["description"]
        assert set(entry.get("fields", {})) == fields, key
        for field in fields:
            assert entry["fields"][field]["name"], (key, field)
        assert key in icons[section], key


@pytest.mark.parametrize("language", ["en", "de"])
def test_selector_options_are_translated(language: str) -> None:
    strings = json.loads(
        (INTEGRATION / "translations" / f"{language}.json").read_text(encoding="utf-8")
    )
    for file_name in ("triggers.yaml", "conditions.yaml", "services.yaml"):
        data = load_yaml_dict((INTEGRATION / file_name).read_text(encoding="utf-8"))
        for key, value in data.items():
            if key.startswith(".") or not value:
                continue
            for field in value.get("fields", {}).values():
                select = field.get("selector", {}).get("select")
                if not select:
                    continue
                options = strings["selector"][select["translation_key"]]["options"]
                assert set(select["options"]) == set(options), (file_name, key)


def test_english_strings_match() -> None:
    assert json.loads(
        (INTEGRATION / "strings.json").read_text(encoding="utf-8")
    ) == json.loads(
        (INTEGRATION / "translations" / "en.json").read_text(encoding="utf-8")
    )
