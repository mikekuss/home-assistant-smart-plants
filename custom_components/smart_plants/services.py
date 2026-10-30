"""
Home Assistant actions for plant care, care tasks, and alert snoozes.

Actions are registered once per Home Assistant run from ``async_setup`` and
survive config entry reloads. Each call resolves the currently loaded
manager, so a call while the integration is unloaded fails with a clear
error instead of writing to a stale manager.

Actions cannot know a plant's revision, so every write skips the revision
check; care is stored with the ``action`` provenance.

Home Assistant doesn't check permissions for integration actions, so the
actions that change plants require a caller who may control at least one
Smart Plants entity. Calls without a user, such as automations, are allowed.
``snooze`` and ``unsnooze`` also accept the All plants entity as a target,
meaning every active plant.
``get_report`` only returns what the plant entities already show and stays
open to every user.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any, Final

import voluptuous as vol
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import (
    ATTR_AREA_ID,
    ATTR_DEVICE_ID,
    ATTR_ENTITY_ID,
    ATTR_FLOOR_ID,
    ATTR_LABEL_ID,
    ENTITY_MATCH_ALL,
    ENTITY_MATCH_NONE,
)
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.service import verify_domain_control
from homeassistant.helpers.translation import async_get_translations
from homeassistant.util import dt as dt_util

from .automation_targets import (
    DUE_UNIQUE_ID,
    all_plants_entity_id,
    plant_id_of_device,
)
from .care import CARE_EVENT_KINDS, kind_for_task_type, minimal_care_payload
from .care_entities import translated_task_name
from .const import DOMAIN
from .manager import (
    CARE_CLOCK_SKEW,
    SNOOZE_MAX_AHEAD,
    PlantChange,
    SmartPlantsManager,
    SmartPlantsManagerUnavailableError,
    SmartPlantsPlantNotFoundError,
    SmartPlantsValidationError,
    care_event_change,
    complete_task_change,
    skip_task_change,
    snooze_change,
    watering_change,
)
from .models import ReadingSchedule
from .report import (
    INCLUDE_OPTIONS,
    TEXT_KEYS,
    PlantFacts,
    build_report,
    collect_plants,
    report_language,
)
from .storage import SmartPlantsStorageFullError

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry

    from .models import CareTask, PlantRecord

_LOGGER = logging.getLogger(__name__)

SERVICE_LOG_CARE: Final = "log_care"
SERVICE_SKIP_CARE_TASK: Final = "skip_care_task"
SERVICE_SNOOZE: Final = "snooze"
SERVICE_UNSNOOZE: Final = "unsnooze"
SERVICE_GET_REPORT: Final = "get_report"

ATTR_KIND: Final = "kind"
ATTR_OCCURRED_AT: Final = "occurred_at"
ATTR_NOTE: Final = "note"
ATTR_DURATION: Final = "duration"
ATTR_UNTIL: Final = "until"
ATTR_INCLUDE: Final = "include"
ATTR_INCLUDE_SNOOZED: Final = "include_snoozed"
ATTR_LANGUAGE: Final = "language"

ACTION_PROVENANCE: Final = "action"
NOTE_MAX_LENGTH: Final = 500

_UNSUPPORTED_TARGET_KEYS = (ATTR_AREA_ID, ATTR_FLOOR_ID, ATTR_LABEL_ID)

LOG_CARE_SCHEMA = vol.Schema(
    {
        **cv.TARGET_SERVICE_FIELDS,
        vol.Optional(ATTR_KIND): vol.In(CARE_EVENT_KINDS),
        vol.Optional(ATTR_OCCURRED_AT): cv.datetime,
        vol.Optional(ATTR_NOTE): vol.All(
            cv.string, vol.Strip, vol.Length(max=NOTE_MAX_LENGTH)
        ),
    }
)
SKIP_CARE_TASK_SCHEMA = vol.Schema(cv.TARGET_SERVICE_FIELDS)
SNOOZE_SCHEMA = vol.Schema(
    {
        **cv.TARGET_SERVICE_FIELDS,
        vol.Optional(ATTR_DURATION): cv.positive_time_period,
        vol.Optional(ATTR_UNTIL): cv.datetime,
    }
)
UNSNOOZE_SCHEMA = vol.Schema(cv.TARGET_SERVICE_FIELDS)
GET_REPORT_SCHEMA = vol.Schema(
    {
        **cv.TARGET_SERVICE_FIELDS,
        vol.Optional(ATTR_INCLUDE, default=list(INCLUDE_OPTIONS)): vol.All(
            cv.ensure_list, [vol.In(INCLUDE_OPTIONS)]
        ),
        vol.Optional(ATTR_INCLUDE_SNOOZED, default=False): cv.boolean,
        vol.Optional(ATTR_LANGUAGE): cv.string,
    }
)


@dataclass(frozen=True, slots=True)
class _TaskTarget:
    entity_id: str
    plant: PlantRecord
    task: CareTask


def _error(key: str, **placeholders: str) -> ServiceValidationError:
    return ServiceValidationError(
        translation_domain=DOMAIN,
        translation_key=key,
        translation_placeholders=placeholders or None,
    )


def _loaded_runtime(hass: HomeAssistant) -> tuple[ConfigEntry, SmartPlantsManager]:
    for entry in hass.config_entries.async_entries(DOMAIN):
        runtime_data = getattr(entry, "runtime_data", None)
        if (
            entry.state is ConfigEntryState.LOADED
            and runtime_data is not None
            and runtime_data.manager.available
        ):
            return entry, runtime_data.manager
    raise _error("integration_not_loaded")


def _target_list(value: Any) -> list[str]:
    if value is None or value == ENTITY_MATCH_NONE:
        return []
    if value == ENTITY_MATCH_ALL:
        raise _error("unsupported_target")
    return list(dict.fromkeys(cv.ensure_list(value)))


def _targets(call: ServiceCall) -> tuple[list[str], list[str]]:
    """Return the targeted device IDs and entity IDs (or registry UUIDs)."""
    if any(_target_list(call.data.get(key)) for key in _UNSUPPORTED_TARGET_KEYS):
        raise _error("unsupported_target")
    return (
        _target_list(call.data.get(ATTR_DEVICE_ID)),
        _target_list(call.data.get(ATTR_ENTITY_ID)),
    )


def _plant_for_target(
    manager: SmartPlantsManager,
    plant_id: str,
    target: str,
    disabled_key: str | None = "plant_disabled",
) -> PlantRecord:
    """Return the target's plant; a disabled one raises ``disabled_key``."""
    try:
        plant = manager.get_plant(plant_id)
    except SmartPlantsPlantNotFoundError, SmartPlantsValidationError:
        raise _error("unknown_target", target=target) from None
    if plant.lifecycle_state == "disabled" and disabled_key is not None:
        raise _error(disabled_key, plant=plant.name)
    return plant


def _resolve_plant_device(
    hass: HomeAssistant,
    entry: ConfigEntry,
    manager: SmartPlantsManager,
    device_id: str,
    disabled_key: str | None = "plant_disabled",
) -> PlantRecord:
    device = dr.async_get(hass).async_get(device_id)
    if device is None:
        raise _error("unknown_target", target=device_id)
    label = device.name_by_user or device.name or device_id
    plant_id = plant_id_of_device(device)
    if entry.entry_id not in device.config_entries or plant_id is None:
        raise _error("invalid_target", target=label)
    return _plant_for_target(manager, plant_id, label, disabled_key)


def _unregistered_entity_error(
    hass: HomeAssistant, entity_ref: str
) -> ServiceValidationError:
    """Return the error for an entity target missing from the entity registry."""
    # Smart Plants entities are always registered, so an entity that only
    # exists in the state machine (one without a unique ID) is the wrong kind
    # of target, not a missing one.
    if hass.states.get(entity_ref) is not None:
        return _error("invalid_target", target=entity_ref)
    return _error("unknown_target", target=entity_ref)


def _resolve_task_entity(
    hass: HomeAssistant,
    entry: ConfigEntry,
    manager: SmartPlantsManager,
    entity_ref: str,
) -> _TaskTarget:
    registry = er.async_get(hass)
    entity_id = er.async_resolve_entity_id(registry, entity_ref)
    registry_entry = registry.async_get(entity_id) if entity_id else None
    if entity_id is None or registry_entry is None:
        raise _unregistered_entity_error(hass, entity_ref)
    match = DUE_UNIQUE_ID.fullmatch(registry_entry.unique_id)
    if (
        registry_entry.platform != DOMAIN
        or registry_entry.domain != "binary_sensor"
        or registry_entry.config_entry_id != entry.entry_id
        or match is None
    ):
        raise _error("invalid_target", target=entity_id)
    plant = _plant_for_target(manager, match["plant_id"], entity_id)
    task = plant.care_task(match["task_id"])
    if task is None:
        raise _error("care_task_not_found", target=entity_id)
    return _TaskTarget(entity_id=entity_id, plant=plant, task=task)


def _resolve_tasks(
    hass: HomeAssistant,
    entry: ConfigEntry,
    manager: SmartPlantsManager,
    entity_refs: list[str],
) -> list[_TaskTarget]:
    targets: dict[tuple[str, str], _TaskTarget] = {}
    for ref in entity_refs:
        target = _resolve_task_entity(hass, entry, manager, ref)
        targets.setdefault((target.plant.id, target.task.id), target)
    return list(targets.values())


def _occurred_at(call: ServiceCall) -> str:
    """Return the call's care time as a local ISO timestamp with an offset."""
    value: datetime | None = call.data.get(ATTR_OCCURRED_AT)
    # A time without a zone (the action editor's date and time picker) is
    # Home Assistant local time.
    occurred = dt_util.now() if value is None else dt_util.as_local(value)
    # A time slightly ahead passes through; the manager stores it as now.
    if occurred > dt_util.now() + CARE_CLOCK_SKEW:
        raise _error("future_time")
    return occurred.replace(microsecond=0).isoformat()


@contextmanager
def _manager_errors(target: str, rejected_key: str = "care_rejected") -> Iterator[None]:
    """Translate manager errors raised for one target into action errors."""
    try:
        yield
    except SmartPlantsManagerUnavailableError as err:
        raise _error("integration_not_loaded") from err
    except SmartPlantsPlantNotFoundError as err:
        raise _error("unknown_target", target=target) from err
    except SmartPlantsValidationError as err:
        raise _error(rejected_key, target=target, reason=str(err)) from err


async def _async_apply(
    manager: SmartPlantsManager,
    changes: list[tuple[str, str, PlantChange]],
    rejected_key: str = "care_rejected",
) -> None:
    """
    Apply the changes of all targets with one save.

    Each change is ``(plant_id, target, change)``; ``target`` names the
    target in error messages. A failed action changes nothing, so a retry
    does not repeat the targets that would otherwise have been saved.
    """

    def labelled(target: str, change: PlantChange) -> PlantChange:
        def apply(current: PlantRecord) -> PlantRecord:
            with _manager_errors(target, rejected_key):
                return change(current)

        return apply

    targets = {plant_id: target for plant_id, target, _change in changes}
    try:
        await manager.async_apply_plant_changes(
            [
                (plant_id, labelled(target, change))
                for plant_id, target, change in changes
            ]
        )
    except SmartPlantsPlantNotFoundError as err:
        plant_id = str(err.args[0]) if err.args else ""
        raise _error("unknown_target", target=targets.get(plant_id, plant_id)) from err
    except SmartPlantsManagerUnavailableError as err:
        raise _error("integration_not_loaded") from err
    except SmartPlantsStorageFullError as err:
        raise HomeAssistantError(
            translation_domain=DOMAIN, translation_key="storage_full"
        ) from err


def _unique_plants(plants: Iterable[PlantRecord]) -> list[PlantRecord]:
    return list({plant.id: plant for plant in plants}.values())


def _device_kind(kind: str | None, note: str | None) -> str:
    """Return the care kind for a plant device target, which must name one."""
    if kind is None:
        raise _error("kind_required")
    if kind == "note" and note is None:
        raise _error("note_required")
    return kind


@verify_domain_control(DOMAIN)
async def _async_log_care(call: ServiceCall) -> None:
    hass = call.hass
    entry, manager = _loaded_runtime(hass)
    device_ids, entity_refs = _targets(call)
    if not device_ids and not entity_refs:
        raise _error("no_target")
    plants = _unique_plants(
        _resolve_plant_device(hass, entry, manager, device_id)
        for device_id in device_ids
    )
    tasks = _resolve_tasks(hass, entry, manager, entity_refs)
    kind: str | None = call.data.get(ATTR_KIND)
    note: str | None = call.data.get(ATTR_NOTE) or None
    occurred_at = _occurred_at(call)

    # Validate every target before the first write so a bad target in a
    # multi-target call does not leave the other targets half updated.
    for target in tasks:
        task_kind = kind_for_task_type(target.task.type)
        if kind is not None and kind != task_kind:
            raise _error(
                "kind_mismatch", target=target.entity_id, kind=kind, task_kind=task_kind
            )
    plant_writes = [(plant, _device_kind(kind, note)) for plant in plants]

    changes: list[tuple[str, str, PlantChange]] = []
    for plant, plant_kind in plant_writes:
        if plant_kind == "watering":
            change = watering_change(
                occurred_at=occurred_at, note=note, provenance=ACTION_PROVENANCE
            )
        else:
            change = care_event_change(
                kind=plant_kind,
                occurred_at=occurred_at,
                payload=(
                    {"text": note}
                    if plant_kind == "note"
                    else minimal_care_payload(plant_kind, note)
                ),
                provenance=ACTION_PROVENANCE,
            )
        changes.append((plant.id, plant.name, change))
    changes.extend(
        (
            target.plant.id,
            target.entity_id,
            complete_task_change(
                target.task.id,
                occurred_at=occurred_at,
                note=note,
                provenance=ACTION_PROVENANCE,
            ),
        )
        for target in tasks
    )
    await _async_apply(manager, changes)

    for plant, plant_kind in plant_writes:
        _LOGGER.debug(
            "Logged %s care for plant %s from an action", plant_kind, plant.id
        )
    for target in tasks:
        _LOGGER.debug(
            "Completed care task %s of plant %s from an action",
            target.task.id,
            target.plant.id,
        )


@verify_domain_control(DOMAIN)
async def _async_skip_care_task(call: ServiceCall) -> None:
    hass = call.hass
    entry, manager = _loaded_runtime(hass)
    device_ids, entity_refs = _targets(call)
    if device_ids:
        raise _error("task_target_required")
    if not entity_refs:
        raise _error("no_target")
    targets = _resolve_tasks(hass, entry, manager, entity_refs)
    # Reject reading tasks before the first write, like other target errors.
    for target in targets:
        if isinstance(target.task.schedule, ReadingSchedule):
            raise _error("reading_task_skip", target=target.entity_id)
    await _async_apply(
        manager,
        [
            (target.plant.id, target.entity_id, skip_task_change(target.task.id))
            for target in targets
        ],
    )
    for target in targets:
        _LOGGER.debug(
            "Skipped care task %s of plant %s from an action",
            target.task.id,
            target.plant.id,
        )


def _resolve_plant_entity(
    hass: HomeAssistant,
    entry: ConfigEntry,
    manager: SmartPlantsManager,
    entity_ref: str,
    disabled_key: str | None,
) -> PlantRecord:
    """Return the plant whose device owns a Smart Plants entity."""
    registry = er.async_get(hass)
    entity_id = er.async_resolve_entity_id(registry, entity_ref)
    registry_entry = registry.async_get(entity_id) if entity_id else None
    if entity_id is None or registry_entry is None:
        raise _unregistered_entity_error(hass, entity_ref)
    if (
        registry_entry.platform != DOMAIN
        or registry_entry.config_entry_id != entry.entry_id
        or registry_entry.device_id is None
    ):
        raise _error("invalid_target", target=entity_id)
    return _resolve_plant_device(
        hass, entry, manager, registry_entry.device_id, disabled_key
    )


def _targets_all_plants(hass: HomeAssistant, entity_refs: list[str]) -> bool:
    """Return whether the entity targets name the All plants entity."""
    all_plants = all_plants_entity_id(hass)
    if all_plants is None:
        return False
    registry = er.async_get(hass)
    return any(
        er.async_resolve_entity_id(registry, ref) == all_plants for ref in entity_refs
    )


def _snooze_plants(
    call: ServiceCall,
    entry: ConfigEntry,
    manager: SmartPlantsManager,
    disabled_key: str | None,
) -> tuple[list[PlantRecord], bool]:
    """
    Resolve the plants of a snooze action from plant devices and entities.

    Also return whether the call targets all plants: the All plants entity
    stands for every active plant, and mixed with other targets it wins, as
    in the triggers and conditions.
    """
    device_ids, entity_refs = _targets(call)
    if not device_ids and not entity_refs:
        raise _error("no_plant_target")
    hass = call.hass
    if _targets_all_plants(hass, entity_refs):
        active = [
            plant
            for plant in manager.snapshot.plants.values()
            if plant.lifecycle_state == "active"
        ]
        return active, True
    return _unique_plants(
        [
            *(
                _resolve_plant_device(hass, entry, manager, device_id, disabled_key)
                for device_id in device_ids
            ),
            *(
                _resolve_plant_entity(hass, entry, manager, ref, disabled_key)
                for ref in entity_refs
            ),
        ]
    ), False


def _snooze_end(call: ServiceCall) -> datetime:
    """Return when a snooze action's snooze ends, as an aware local time."""
    duration: timedelta | None = call.data.get(ATTR_DURATION)
    until: datetime | None = call.data.get(ATTR_UNTIL)
    now = dt_util.now()
    if duration is not None and until is None:
        end = now + duration
    elif until is not None and duration is None:
        # A time without a zone (the action editor's date and time picker)
        # is Home Assistant local time.
        end = dt_util.as_local(until)
    elif duration is None:
        raise _error("snooze_period_required")
    else:
        raise _error("snooze_period_conflict")
    if end <= now:
        raise _error("snooze_in_past")
    if end > now + SNOOZE_MAX_AHEAD:
        raise _error("snooze_too_long")
    return end


@verify_domain_control(DOMAIN)
async def _async_snooze(call: ServiceCall) -> None:
    entry, manager = _loaded_runtime(call.hass)
    plants, all_plants = _snooze_plants(call, entry, manager, "plant_disabled_snooze")
    end = _snooze_end(call)
    # Snoozing all plants keeps a longer snooze someone set for one plant.
    await _async_apply(
        manager,
        [
            (plant.id, plant.name, snooze_change(end, keep_later=all_plants))
            for plant in plants
        ],
        "snooze_rejected",
    )
    for plant in plants:
        _LOGGER.debug("Snoozed plant %s from an action", plant.id)


@verify_domain_control(DOMAIN)
async def _async_unsnooze(call: ServiceCall) -> None:
    entry, manager = _loaded_runtime(call.hass)
    # A disabled plant is never snoozed, so ending its snooze is a no-op.
    plants, _all_plants = _snooze_plants(call, entry, manager, None)
    await _async_apply(
        manager,
        [(plant.id, plant.name, snooze_change(None)) for plant in plants],
        "snooze_rejected",
    )
    for plant in plants:
        _LOGGER.debug("Ended the snooze of plant %s from an action", plant.id)


_TARGET_KEYS = (
    ATTR_DEVICE_ID,
    ATTR_ENTITY_ID,
    ATTR_AREA_ID,
    ATTR_FLOOR_ID,
    ATTR_LABEL_ID,
)


def _report_target(call: ServiceCall) -> dict[str, Any] | None:
    """
    Return the call's target; an empty one means all plants.

    ``None`` means the call targeted nothing on purpose (``none``).
    """
    target: dict[str, Any] = {}
    for key in _TARGET_KEYS:
        value = call.data.get(key)
        if value == ENTITY_MATCH_ALL:
            return {}
        if value is not None and value != ENTITY_MATCH_NONE:
            target[key] = list(dict.fromkeys(cv.ensure_list(value)))
    if not target and any(
        call.data.get(key) == ENTITY_MATCH_NONE for key in _TARGET_KEYS
    ):
        return None
    return target


async def _async_get_report(call: ServiceCall) -> ServiceResponse:
    hass = call.hass
    _entry, manager = _loaded_runtime(hass)
    # An automation can ask for its own language; without one (or with an
    # empty one) the report follows the system language.
    language = report_language(call.data.get(ATTR_LANGUAGE) or hass.config.language)
    entity_names = await async_get_translations(hass, language, "entity", [DOMAIN])
    common = await async_get_translations(hass, language, "common", [DOMAIN])
    prefix = f"component.{DOMAIN}.common."
    texts = {key: common.get(f"{prefix}{key}", key) for key in TEXT_KEYS}

    def problem_name(role: str, _state: Any, _plant: str) -> str:
        key = f"component.{DOMAIN}.entity.binary_sensor.{role}.name"
        return entity_names.get(key, role)

    def task_name(entry: er.RegistryEntry, state: Any, _plant: str) -> str:
        match = DUE_UNIQUE_ID.fullmatch(entry.unique_id)
        plant = (
            None if match is None else manager.snapshot.plants.get(match["plant_id"])
        )
        task = (
            None
            if plant is None or match is None
            else plant.care_task(match["task_id"])
        )
        if task is None:
            return str(state.attributes.get("friendly_name") or entry.entity_id)
        return translated_task_name(task, entity_names)

    target = _report_target(call)
    facts = (
        []
        if target is None
        else collect_plants(
            hass, target, problem_name=problem_name, task_name=task_name
        )
    )
    response = build_report(
        [_with_manager_state(manager, hass, plant) for plant in facts],
        include=call.data[ATTR_INCLUDE],
        include_snoozed=call.data[ATTR_INCLUDE_SNOOZED],
        texts=texts,
        language=language,
    )
    _LOGGER.debug("Built a plant report with %s plants", response["count"])
    return response


def _with_manager_state(
    manager: SmartPlantsManager, hass: HomeAssistant, plant: PlantFacts
) -> PlantFacts:
    """Take the pause and the snooze of a plant from the manager snapshot."""
    device = dr.async_get(hass).async_get(plant.device_id)
    plant_id = None if device is None else plant_id_of_device(device)
    record = None if plant_id is None else manager.snapshot.plants.get(plant_id)
    if record is None:
        return plant
    return replace(
        plant,
        paused=record.lifecycle_state == "disabled",
        snoozed=record.snoozed_until is not None,
    )


@callback
def async_setup_services(hass: HomeAssistant) -> None:
    """Register the Smart Plants actions."""
    hass.services.async_register(
        DOMAIN, SERVICE_LOG_CARE, _async_log_care, schema=LOG_CARE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SKIP_CARE_TASK,
        _async_skip_care_task,
        schema=SKIP_CARE_TASK_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SNOOZE, _async_snooze, schema=SNOOZE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_UNSNOOZE, _async_unsnooze, schema=UNSNOOZE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_REPORT,
        _async_get_report,
        schema=GET_REPORT_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
