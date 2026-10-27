"""
The plant report behind ``smart_plants.get_report`` and ``needs_attention``.

The report has two halves. ``collect_plants`` reads plant facts from the
entity states and registries, the same states the user sees. The pure
functions ``select_plants`` and ``build_report`` turn those facts into the
response, with a plain-text title and message that are safe for phone
notifications and for Telegram's default Markdown mode: the fixed text never
uses ``_ * [ ]`` or backticks. Plant, area and task names are inserted as they
are.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, replace
from typing import TYPE_CHECKING, Any, Final

from homeassistant.const import STATE_ON

from .automation_targets import (
    ATTR_TASK_TYPE,
    PROBLEM_ROLES,
    ROLE_NEEDS_WATER,
    area_name,
    device_name,
    entity_display_name,
    is_available,
    is_task_due_entry,
    plant_binary_sensors,
    plant_snoozed,
    problem_role,
    resolve_plant_devices,
)

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant, State
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er

INCLUDE_NEEDS_WATER: Final = "needs_water"
INCLUDE_PROBLEMS: Final = "problems"
INCLUDE_CARE_TASKS: Final = "care_tasks"
INCLUDE_OPTIONS: Final[tuple[str, ...]] = (
    INCLUDE_NEEDS_WATER,
    INCLUDE_PROBLEMS,
    INCLUDE_CARE_TASKS,
)

MAX_PLANT_LINES: Final = 20
BULLET: Final = "•"

# The ``common`` translation keys the message uses.
TEXT_KEYS: Final[tuple[str, ...]] = (
    "report_title_one",
    "report_title_other",
    "report_title_empty",
    "report_message_empty",
    "report_due",
    "report_snoozed_marker",
    "report_more_one",
    "report_more_other",
    "report_snoozed_left_out_one",
    "report_snoozed_left_out_other",
)


def report_language(language: str | None) -> str:
    """Return the report language: German for ``de*``, English otherwise."""
    return "de" if (language or "").lower().startswith("de") else "en"


@dataclass(frozen=True, slots=True)
class ReportProblem:
    key: str
    name: str
    entity_id: str


@dataclass(frozen=True, slots=True)
class ReportTask:
    name: str
    task_type: str | None
    status: str | None
    entity_id: str


@dataclass(frozen=True, slots=True)
class PlantFacts:
    """What one plant's entities say, before the report options apply."""

    plant: str
    device_id: str
    area: str | None
    paused: bool
    snoozed: bool
    needs_water: ReportProblem | None
    problems: tuple[ReportProblem, ...] = ()
    care_tasks: tuple[ReportTask, ...] = ()


@dataclass(frozen=True, slots=True)
class Selection:
    """The plants a report lists, and the plants it left out."""

    plants: tuple[PlantFacts, ...]
    snoozed: int
    paused: int


def _trimmed(plant: PlantFacts, include: frozenset[str]) -> PlantFacts:
    return replace(
        plant,
        needs_water=plant.needs_water if INCLUDE_NEEDS_WATER in include else None,
        problems=plant.problems if INCLUDE_PROBLEMS in include else (),
        care_tasks=plant.care_tasks if INCLUDE_CARE_TASKS in include else (),
    )


def _has_items(plant: PlantFacts) -> bool:
    return bool(plant.needs_water or plant.problems or plant.care_tasks)


def select_plants(
    plants: Iterable[PlantFacts],
    *,
    include: Iterable[str] = INCLUDE_OPTIONS,
    include_snoozed: bool = False,
) -> Selection:
    """
    Return the plants with something to report, sorted by name.

    Paused plants are left out and counted. Snoozed plants are left out and
    counted only when they had something to report, unless
    ``include_snoozed`` lists them.
    """
    wanted = frozenset(include)
    listed: list[PlantFacts] = []
    snoozed = paused = 0
    for plant in plants:
        if plant.paused:
            paused += 1
            continue
        trimmed = _trimmed(plant, wanted)
        if not _has_items(trimmed):
            continue
        if plant.snoozed and not include_snoozed:
            snoozed += 1
            continue
        listed.append(trimmed)
    listed.sort(key=lambda plant: (plant.plant.casefold(), plant.device_id))
    return Selection(plants=tuple(listed), snoozed=snoozed, paused=paused)


def _count_text(texts: Mapping[str, str], key: str, count: int) -> str:
    template = texts[f"{key}_one" if count == 1 else f"{key}_other"]
    return template.replace("{count}", str(count))


def _plant_line(plant: PlantFacts, texts: Mapping[str, str]) -> str:
    head = plant.plant
    if plant.snoozed:
        head += f" ({texts['report_snoozed_marker']})"
    if plant.area:
        head += f" ({plant.area})"
    names = [plant.needs_water.name] if plant.needs_water else []
    names.extend(problem.name for problem in plant.problems)
    items = ", ".join(names)
    if plant.care_tasks:
        due = texts["report_due"].replace(
            "{tasks}", ", ".join(task.name for task in plant.care_tasks)
        )
        items = f"{items}. {due}" if items else due
    return f"{BULLET} {head}: {items}"


def _plant_entry(plant: PlantFacts) -> dict[str, Any]:
    return {
        "plant": plant.plant,
        "device_id": plant.device_id,
        "area": plant.area,
        "needs_water": plant.needs_water is not None,
        "snoozed": plant.snoozed,
        "problems": [
            {"key": problem.key, "name": problem.name, "entity_id": problem.entity_id}
            for problem in plant.problems
        ],
        "care_tasks": [
            {
                "name": task.name,
                "task_type": task.task_type,
                "status": task.status,
                "entity_id": task.entity_id,
            }
            for task in plant.care_tasks
        ],
    }


def build_report(
    plants: Iterable[PlantFacts],
    *,
    include: Iterable[str] = INCLUDE_OPTIONS,
    include_snoozed: bool = False,
    texts: Mapping[str, str],
    language: str,
) -> dict[str, Any]:
    """Return the ``get_report`` response for the given plant facts."""
    selection = select_plants(plants, include=include, include_snoozed=include_snoozed)
    count = len(selection.plants)
    lines = [_plant_line(plant, texts) for plant in selection.plants[:MAX_PLANT_LINES]]
    if count > MAX_PLANT_LINES:
        lines.append(_count_text(texts, "report_more", count - MAX_PLANT_LINES))
    if count:
        title = _count_text(texts, "report_title", count)
    else:
        title = texts["report_title_empty"]
        lines.append(texts["report_message_empty"])
    if selection.snoozed:
        lines.append(_count_text(texts, "report_snoozed_left_out", selection.snoozed))
    return {
        "title": title,
        "message": "\n".join(lines),
        "has_items": count > 0,
        "count": count,
        "snoozed": selection.snoozed,
        "paused": selection.paused,
        "language": language,
        "plants": [_plant_entry(plant) for plant in selection.plants],
    }


# --- Collecting facts from Home Assistant ------------------------------------

ProblemNamer = Callable[[str, "State", str], str]
TaskNamer = Callable[["er.RegistryEntry", "State", str], str]


def _default_problem_name(_role: str, state: State, plant_name: str) -> str:
    return entity_display_name(state, plant_name)


def _default_task_name(_entry: er.RegistryEntry, state: State, plant_name: str) -> str:
    return entity_display_name(state, plant_name)


def _plant_facts(
    hass: HomeAssistant,
    device: dr.DeviceEntry,
    problem_name: ProblemNamer,
    task_name: TaskNamer,
) -> PlantFacts:
    name = device_name(device)
    needs_water: ReportProblem | None = None
    problems: dict[str, ReportProblem] = {}
    tasks: list[ReportTask] = []
    states: list[State | None] = []
    for entry in plant_binary_sensors(hass, device.id):
        state = hass.states.get(entry.entity_id)
        states.append(state)
        if state is None or not is_available(state) or state.state != STATE_ON:
            continue
        if (role := problem_role(entry)) is not None:
            problem = ReportProblem(
                key=role,
                name=problem_name(role, state, name),
                entity_id=entry.entity_id,
            )
            if role == ROLE_NEEDS_WATER:
                needs_water = problem
            else:
                problems.setdefault(role, problem)
        elif is_task_due_entry(entry):
            task_type = state.attributes.get(ATTR_TASK_TYPE)
            status = state.attributes.get("status")
            tasks.append(
                ReportTask(
                    name=task_name(entry, state, name),
                    task_type=task_type if isinstance(task_type, str) else None,
                    status=status if isinstance(status, str) else None,
                    entity_id=entry.entity_id,
                )
            )
    snoozed = plant_snoozed(states)
    tasks.sort(key=lambda task: (task.name.casefold(), task.entity_id))
    return PlantFacts(
        plant=name,
        device_id=device.id,
        area=area_name(hass, device),
        # A plant without one available binary sensor is paused (or has
        # every sensor disabled); either way it has nothing to report.
        paused=snoozed is None,
        snoozed=bool(snoozed),
        needs_water=needs_water,
        problems=tuple(problems[role] for role in PROBLEM_ROLES if role in problems),
        care_tasks=tuple(tasks),
    )


def collect_plants(
    hass: HomeAssistant,
    target: Mapping[str, Any] | None,
    *,
    problem_name: ProblemNamer = _default_problem_name,
    task_name: TaskNamer = _default_task_name,
) -> list[PlantFacts]:
    """Return the facts of every plant in the target, or of all plants."""
    return [
        _plant_facts(hass, device, problem_name, task_name)
        for device in resolve_plant_devices(hass, target)
    ]
