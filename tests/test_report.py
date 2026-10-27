"""The plant report: the pure builder and the ``smart_plants.get_report`` action."""

from __future__ import annotations

import json
import re
from datetime import timedelta
from pathlib import Path
from typing import Any

import pytest
from custom_components.smart_plants.const import DOMAIN
from custom_components.smart_plants.report import (
    TEXT_KEYS,
    PlantFacts,
    ReportProblem,
    ReportTask,
    build_report,
    report_language,
)
from homeassistant.const import STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import label_registry as lr
from homeassistant.util import dt as dt_util

from .test_triggers import (
    EVERY_TWO_DAYS,
    change,
    entity_of,
    manager_of,
    mock_entry,
    mock_plant,
    set_soil,
    setup_integration,
    watered_plant,
)

INTEGRATION = Path(__file__).parents[1] / "custom_components" / DOMAIN


def texts(language: str) -> dict[str, str]:
    name = "strings.json" if language == "en" else f"translations/{language}.json"
    common: dict[str, str] = json.loads(
        (INTEGRATION / name).read_text(encoding="utf-8")
    )["common"]
    return common


def water(name: str = "Needs water") -> ReportProblem:
    return ReportProblem(
        key="needs_water", name=name, entity_id="binary_sensor.aloe_needs_water"
    )


def problem(key: str, name: str) -> ReportProblem:
    return ReportProblem(key=key, name=name, entity_id=f"binary_sensor.x_{key}")


def task(name: str, task_type: str = "fertilize", status: str = "due") -> ReportTask:
    return ReportTask(
        name=name,
        task_type=task_type,
        status=status,
        entity_id=f"binary_sensor.x_{name.lower()}",
    )


def facts(  # noqa: PLR0913
    plant: str,
    *,
    area: str | None = None,
    needs_water: bool | str = False,
    problems: tuple[ReportProblem, ...] = (),
    care_tasks: tuple[ReportTask, ...] = (),
    snoozed: bool = False,
    paused: bool = False,
) -> PlantFacts:
    return PlantFacts(
        plant=plant,
        device_id=f"device-{plant.lower().replace(' ', '-')}",
        area=area,
        paused=paused,
        snoozed=snoozed,
        needs_water=(
            water(needs_water)
            if isinstance(needs_water, str)
            else water()
            if needs_water
            else None
        ),
        problems=problems,
        care_tasks=care_tasks,
    )


def report(plants: list[PlantFacts], language: str = "en", **kwargs: Any) -> Any:
    return build_report(plants, texts=texts(language), language=language, **kwargs)


# --- Pure builder -----------------------------------------------------------


def test_report_lines_titles_and_shape() -> None:
    result = report(
        [
            facts(
                "Office Aloe",
                problems=(problem("low_light", "Low light"),),
            ),
            facts(
                "Aloe",
                area="Kitchen",
                needs_water=True,
                problems=(problem("too_wet", "Too wet"),),
                care_tasks=(task("Fertilize"),),
            ),
            facts("Fern", snoozed=True, needs_water=True),
            facts("Cactus"),
        ]
    )
    assert result["title"] == "2 plants need attention"
    assert result["message"] == (
        "• Aloe (Kitchen): Needs water, Too wet. Due: Fertilize\n"
        "• Office Aloe: Low light\n"
        "1 snoozed plant not included."
    )
    assert result["has_items"] is True
    assert result["count"] == 2
    assert result["snoozed"] == 1
    assert result["paused"] == 0
    assert result["language"] == "en"
    assert result["plants"][0] == {
        "plant": "Aloe",
        "device_id": "device-aloe",
        "area": "Kitchen",
        "needs_water": True,
        "snoozed": False,
        "problems": [
            {
                "key": "too_wet",
                "name": "Too wet",
                "entity_id": "binary_sensor.x_too_wet",
            }
        ],
        "care_tasks": [
            {
                "name": "Fertilize",
                "task_type": "fertilize",
                "status": "due",
                "entity_id": "binary_sensor.x_fertilize",
            }
        ],
    }
    assert result["plants"][1]["area"] is None


def test_report_tasks_only_has_no_leading_period() -> None:
    result = report([facts("Aloe", care_tasks=(task("Fertilize"), task("Repot")))])
    assert result["message"] == "• Aloe: Due: Fertilize, Repot"
    assert result["title"] == "1 plant needs attention"


def test_report_sorts_plants_case_insensitively() -> None:
    result = report(
        [
            facts("aloe b", needs_water=True),
            facts("Zebra", needs_water=True),
            facts("Aloe a", needs_water=True),
        ]
    )
    assert [plant["plant"] for plant in result["plants"]] == [
        "Aloe a",
        "aloe b",
        "Zebra",
    ]


def test_report_empty() -> None:
    result = report([facts("Aloe"), facts("Fern", paused=True, needs_water=True)])
    assert result == {
        "title": "All plants are fine",
        "message": "Nothing needs attention right now.",
        "has_items": False,
        "count": 0,
        "snoozed": 0,
        "paused": 1,
        "language": "en",
        "plants": [],
    }


def test_report_empty_with_snoozed_plants_left_out() -> None:
    result = report(
        [
            facts("Aloe", snoozed=True, needs_water=True),
            facts("Fern", snoozed=True, needs_water=True),
        ]
    )
    assert result["title"] == "All plants are fine"
    assert result["message"] == (
        "Nothing needs attention right now.\n2 snoozed plants not included."
    )


def test_report_include_snoozed_marks_the_plant() -> None:
    result = report(
        [facts("Aloe", area="Kitchen", snoozed=True, needs_water=True)],
        include_snoozed=True,
    )
    assert result["message"] == "• Aloe (snoozed) (Kitchen): Needs water"
    assert result["snoozed"] == 0
    assert result["plants"][0]["snoozed"] is True


def test_report_include_subsets() -> None:
    plant = facts(
        "Aloe",
        needs_water=True,
        problems=(problem("too_wet", "Too wet"),),
        care_tasks=(task("Fertilize"),),
    )
    water_only = report([plant], include=["needs_water"])
    assert water_only["message"] == "• Aloe: Needs water"
    assert water_only["plants"][0]["problems"] == []
    assert water_only["plants"][0]["care_tasks"] == []
    tasks_only = report([plant], include=["care_tasks"])
    assert tasks_only["message"] == "• Aloe: Due: Fertilize"
    assert tasks_only["plants"][0]["needs_water"] is False
    assert (
        report([facts("Fern", needs_water=True)], include=["problems"])["has_items"]
        is False
    )


def test_report_caps_the_lines() -> None:
    plants = [facts(f"Plant {index:02}", needs_water=True) for index in range(25)]
    result = report(plants)
    lines = result["message"].split("\n")
    assert len(lines) == 21
    assert lines[-1] == "…and 5 more plants."
    assert result["count"] == 25
    assert len(result["plants"]) == 25
    assert report(plants[:21])["message"].endswith("…and 1 more plant.")


def test_report_german() -> None:
    result = report(
        [
            facts(
                "Aloe",
                area="Küche",
                snoozed=True,
                needs_water="Braucht Wasser",
                care_tasks=(task("Düngen"),),
            ),
            facts("Farn", problems=(problem("too_wet", "Zu nass"),)),
        ],
        "de",
        include_snoozed=True,
    )
    assert result["title"] == "2 Pflanzen brauchen Aufmerksamkeit"
    assert result["message"] == (
        "• Aloe (stummgeschaltet) (Küche): Braucht Wasser. Fällig: Düngen\n"
        "• Farn: Zu nass"
    )
    assert report([facts("Aloe", needs_water=True)], "de")["title"] == (
        "1 Pflanze braucht Aufmerksamkeit"
    )
    empty = report([facts("Aloe", snoozed=True, needs_water=True)], "de")
    assert empty["title"] == "Alle Pflanzen sind in Ordnung"
    assert empty["message"] == (
        "Gerade braucht nichts Aufmerksamkeit.\n"
        "1 stummgeschaltete Pflanze nicht enthalten."
    )


@pytest.mark.parametrize(
    ("language", "expected"),
    [
        ("de", "de"),
        ("de-CH", "de"),
        ("en", "en"),
        ("en-GB", "en"),
        ("fr", "en"),
        (None, "en"),
    ],
)
def test_report_language(language: str | None, expected: str) -> None:
    assert report_language(language) == expected


def test_names_are_inserted_verbatim() -> None:
    result = report([facts("my_plant *1*", area="[Lab]", care_tasks=(task("`mist`"),))])
    assert result["message"] == "• my_plant *1* ([Lab]): Due: `mist`"


@pytest.mark.parametrize("language", ["en", "de"])
def test_fixed_text_is_plain(language: str) -> None:
    common = texts(language)
    assert set(common) == set(TEXT_KEYS)
    for value in common.values():
        assert not re.search(r"[_*\[\]`]", value), value


# --- The action -------------------------------------------------------------


async def get_report(hass: HomeAssistant, **data: Any) -> dict[str, Any]:
    response = await hass.services.async_call(
        DOMAIN, "get_report", data, blocking=True, return_response=True
    )
    assert isinstance(response, dict)
    return response


async def test_action_requires_a_response(hass: HomeAssistant) -> None:
    await setup_integration(hass)
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(DOMAIN, "get_report", {}, blocking=True)


async def test_action_fails_while_not_loaded(hass: HomeAssistant) -> None:
    entry = await setup_integration(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    with pytest.raises(ServiceValidationError) as err:
        await get_report(hass)
    assert err.value.translation_key == "integration_not_loaded"


async def test_action_rejects_unknown_include(hass: HomeAssistant) -> None:
    await setup_integration(hass)
    with pytest.raises(Exception, match="include"):
        await get_report(hass, include=["water"])


async def test_action_reports_real_plants(hass: HomeAssistant) -> None:
    kitchen = ar.async_get(hass).async_create("Kitchen")
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    aloe_id = await watered_plant(hass, manager, "Aloe", area_id=kitchen.id)
    office_id = await watered_plant(
        hass, manager, "Office Aloe", soil="sensor.mock_soil_office"
    )
    fern_id = await watered_plant(hass, manager, "Fern", soil="sensor.mock_soil_fern")
    await set_soil(hass, "10")
    await set_soil(hass, "95", "sensor.mock_soil_office")
    await set_soil(hass, "10", "sensor.mock_soil_fern")
    fern = manager.get_plant(fern_id)
    await manager.async_disable_plant(fern_id, expected_revision=fern.revision)
    await hass.async_block_till_done()

    result = await get_report(hass)
    assert result["title"] == "2 plants need attention"
    assert result["message"] == (
        "• Aloe (Kitchen): Needs water\n• Office Aloe: Too wet"
    )
    assert result["paused"] == 1
    aloe = result["plants"][0]
    assert aloe["needs_water"] is True
    assert aloe["area"] == "Kitchen"
    office = result["plants"][1]
    assert office["problems"] == [
        {
            "key": "too_wet",
            "name": "Too wet",
            "entity_id": entity_of(hass, office_id, "too_wet"),
        }
    ]
    assert aloe["device_id"] != office["device_id"]

    by_area = await get_report(hass, area_id=kitchen.id)
    assert [plant["plant"] for plant in by_area["plants"]] == ["Aloe"]
    by_entity = await get_report(
        hass, entity_id=entity_of(hass, office_id, "sensor_stale")
    )
    assert [plant["plant"] for plant in by_entity["plants"]] == ["Office Aloe"]
    nothing = await get_report(hass, entity_id="none")
    assert nothing["count"] == 0
    assert nothing["paused"] == 0
    assert (await get_report(hass, entity_id="all"))["count"] == 2
    device = dr.async_get(hass).async_get_device(identifiers={(DOMAIN, aloe_id)})
    assert device is not None
    assert aloe["device_id"] == device.id


async def test_action_label_target_and_snooze(hass: HomeAssistant) -> None:
    label = lr.async_get(hass).async_create("Balcony")
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    aloe_id = await watered_plant(hass, manager, "Aloe")
    await watered_plant(hass, manager, "Fern", soil="sensor.mock_soil_fern")
    await set_soil(hass, "10")
    await set_soil(hass, "10", "sensor.mock_soil_fern")
    device = dr.async_get(hass).async_get_device(identifiers={(DOMAIN, aloe_id)})
    assert device is not None
    dr.async_get(hass).async_update_device(device.id, labels={label.label_id})

    labelled = await get_report(hass, label_id=label.label_id)
    assert [plant["plant"] for plant in labelled["plants"]] == ["Aloe"]

    aloe = manager.get_plant(aloe_id)
    await manager.async_snooze_plant(
        aloe_id,
        expected_revision=aloe.revision,
        until=dt_util.now() + timedelta(days=1),
    )
    await hass.async_block_till_done()
    result = await get_report(hass)
    assert [plant["plant"] for plant in result["plants"]] == ["Fern"]
    assert result["snoozed"] == 1
    assert result["message"].endswith("1 snoozed plant not included.")
    included = await get_report(hass, include_snoozed=True)
    assert included["message"] == ("• Aloe (snoozed): Needs water\n• Fern: Needs water")


async def test_action_names_tasks_and_follows_the_language(
    hass: HomeAssistant,
) -> None:
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    plant = await manager.async_create_plant(name="Aloe")
    plant, _fertilize = await manager.async_create_care_task(
        plant.id,
        expected_revision=plant.revision,
        task_type="fertilize",
        name=None,
        schedule=EVERY_TWO_DAYS,
        instructions=None,
        baseline_done_on=None,
    )
    plant, _mist = await manager.async_create_care_task(
        plant.id,
        expected_revision=plant.revision,
        task_type="custom",
        name="Mist leaves",
        schedule=EVERY_TWO_DAYS,
        instructions=None,
        baseline_done_on=None,
    )
    await hass.async_block_till_done()

    result = await get_report(hass)
    assert result["message"] == "• Aloe: Due: Fertilize, Mist leaves"
    assert [task["task_type"] for task in result["plants"][0]["care_tasks"]] == [
        "fertilize",
        "custom",
    ]
    assert {task["status"] for task in result["plants"][0]["care_tasks"]} == {"due"}

    hass.config.language = "de"
    german = await get_report(hass)
    assert german["language"] == "de"
    assert german["title"] == "1 Pflanze braucht Aufmerksamkeit"
    assert german["message"] == "• Aloe: Fällig: Düngen, Mist leaves"

    hass.config.language = "fr"
    assert (await get_report(hass))["language"] == "en"


async def test_report_without_the_integration_reads_synthetic_states(
    hass: HomeAssistant,
) -> None:
    # The collector reads only registries and states.
    from custom_components.smart_plants.report import collect_plants  # noqa: PLC0415

    entry = mock_entry(hass)
    aloe = mock_plant(hass, entry, "Aloe", tasks={"fertilize": "fertilize"})
    await change(hass, aloe["needs_water"], STATE_ON)
    await change(hass, aloe["fertilize"], STATE_ON, status="due")
    [plant] = collect_plants(hass, None)
    assert plant.needs_water is not None
    assert [task.name for task in plant.care_tasks] == ["Fertilize"]
