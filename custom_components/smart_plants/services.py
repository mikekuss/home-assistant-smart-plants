"""
Home Assistant actions for logging plant care and skipping care tasks.

Actions are registered once per Home Assistant run from ``async_setup`` and
survive config entry reloads. Each call resolves the currently loaded
manager, so a call while the integration is unloaded fails with a clear
error instead of writing to a stale manager.

Actions cannot know a plant's revision, so every write skips the revision
check and is stored with the ``action`` provenance.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Iterable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
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
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from .care import CARE_EVENT_KINDS, kind_for_task_type, minimal_care_payload
from .const import DOMAIN
from .manager import (
    CARE_CLOCK_SKEW,
    SmartPlantsManager,
    SmartPlantsManagerUnavailableError,
    SmartPlantsPlantNotFoundError,
    SmartPlantsValidationError,
)

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry

    from .models import CareTask, PlantRecord

_LOGGER = logging.getLogger(__name__)

SERVICE_LOG_CARE: Final = "log_care"
SERVICE_SKIP_CARE_TASK: Final = "skip_care_task"

ATTR_KIND: Final = "kind"
ATTR_OCCURRED_AT: Final = "occurred_at"
ATTR_NOTE: Final = "note"

ACTION_PROVENANCE: Final = "action"
NOTE_MAX_LENGTH: Final = 500

_DUE_UNIQUE_ID = re.compile(
    rf"^{DOMAIN}:(?P<plant_id>.+):care_task:(?P<task_id>[0-9a-f]{{32}}):due$"
)
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
    manager: SmartPlantsManager, plant_id: str, target: str
) -> PlantRecord:
    try:
        plant = manager.get_plant(plant_id)
    except SmartPlantsPlantNotFoundError, SmartPlantsValidationError:
        raise _error("unknown_target", target=target) from None
    if plant.lifecycle_state == "disabled":
        raise _error("plant_disabled", plant=plant.name)
    return plant


def _resolve_plant_device(
    hass: HomeAssistant,
    entry: ConfigEntry,
    manager: SmartPlantsManager,
    device_id: str,
) -> PlantRecord:
    device = dr.async_get(hass).async_get(device_id)
    if device is None:
        raise _error("unknown_target", target=device_id)
    label = device.name_by_user or device.name or device_id
    plant_id = next(
        (identifier for domain, identifier in device.identifiers if domain == DOMAIN),
        None,
    )
    if entry.entry_id not in device.config_entries or plant_id is None:
        raise _error("invalid_target", target=label)
    return _plant_for_target(manager, plant_id, label)


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
        raise _error("unknown_target", target=entity_ref)
    match = _DUE_UNIQUE_ID.fullmatch(registry_entry.unique_id)
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
def _manager_errors(target: str) -> Iterator[None]:
    """Translate manager errors raised for one target into action errors."""
    try:
        yield
    except SmartPlantsManagerUnavailableError as err:
        raise _error("integration_not_loaded") from err
    except SmartPlantsPlantNotFoundError as err:
        raise _error("unknown_target", target=target) from err
    except SmartPlantsValidationError as err:
        raise _error("care_rejected", target=target, reason=str(err)) from err


def _unique_plants(plants: Iterable[PlantRecord]) -> list[PlantRecord]:
    return list({plant.id: plant for plant in plants}.values())


def _device_kind(kind: str | None, note: str | None) -> str:
    """Return the care kind for a plant device target, which must name one."""
    if kind is None:
        raise _error("kind_required")
    if kind == "note" and note is None:
        raise _error("note_required")
    return kind


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

    for plant, plant_kind in plant_writes:
        with _manager_errors(plant.name):
            if plant_kind == "watering":
                await manager.async_add_watering(
                    plant.id,
                    expected_revision=None,
                    occurred_at=occurred_at,
                    note=note,
                    provenance=ACTION_PROVENANCE,
                )
            else:
                await manager.async_add_care_event(
                    plant.id,
                    expected_revision=None,
                    kind=plant_kind,
                    occurred_at=occurred_at,
                    payload=(
                        {"text": note}
                        if plant_kind == "note"
                        else minimal_care_payload(plant_kind, note)
                    ),
                    provenance=ACTION_PROVENANCE,
                )
        _LOGGER.debug(
            "Logged %s care for plant %s from an action", plant_kind, plant.id
        )
    for target in tasks:
        with _manager_errors(target.entity_id):
            await manager.async_complete_care_task(
                target.plant.id,
                target.task.id,
                expected_revision=None,
                occurred_at=occurred_at,
                note=note,
                provenance=ACTION_PROVENANCE,
            )
        _LOGGER.debug(
            "Completed care task %s of plant %s from an action",
            target.task.id,
            target.plant.id,
        )


async def _async_skip_care_task(call: ServiceCall) -> None:
    hass = call.hass
    entry, manager = _loaded_runtime(hass)
    device_ids, entity_refs = _targets(call)
    if device_ids:
        raise _error("task_target_required")
    if not entity_refs:
        raise _error("no_target")
    for target in _resolve_tasks(hass, entry, manager, entity_refs):
        with _manager_errors(target.entity_id):
            await manager.async_skip_care_task(
                target.plant.id, target.task.id, expected_revision=None
            )
        _LOGGER.debug(
            "Skipped care task %s of plant %s from an action",
            target.task.id,
            target.plant.id,
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
