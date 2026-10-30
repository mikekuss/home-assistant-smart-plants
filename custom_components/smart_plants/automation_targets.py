"""
Target resolution shared by the automation triggers, conditions and the report.

Everything here reads only the state machine and the registries, never the
manager, so triggers and conditions validate and attach before the config
entry loads and keep working across reloads.

A plant is its device: every Smart Plants plant device has the identifier
``(smart_plants, <plant_id>)``. Plant entities are recognized by their entity
registry platform and unique ID, so a user's entity renames never change what
a trigger watches.

The integration-wide *All plants* binary sensor stands for every plant. A
target that names it, or no target at all, means all plants, including plants
added later.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass
from typing import Any, Final

import voluptuous as vol
from homeassistant.const import (
    ATTR_ENTITY_ID,
    CONF_OPTIONS,
    CONF_TARGET,
    STATE_ON,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import HomeAssistant, State
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.target import (
    TargetSelection,
    async_extract_referenced_entity_ids,
)

from .const import DOMAIN

BINARY_SENSOR: Final = "binary_sensor"

ALL_PLANTS_UNIQUE_ID: Final = f"{DOMAIN}:all_plants"
ALL_PLANTS_SUGGESTED_ENTITY_ID: Final = f"{BINARY_SENSOR}.{DOMAIN}_all_plants"

ROLE_NEEDS_WATER: Final = "needs_water"
# Every problem-class binary sensor, in the order reports list them.
PROBLEM_ROLES: Final[tuple[str, ...]] = (
    ROLE_NEEDS_WATER,
    "too_wet",
    "sensor_stale",
    "temperature_stress",
    "humidity_stress",
    "soil_temperature_stress",
    "conductivity_stress",
    "co2_stress",
    "low_light",
    "low_battery",
)
TASK_TYPES: Final[tuple[str, ...]] = (
    "fertilize",
    "prune",
    "repot",
    "pests",
    "winter_protection",
    "custom",
)

ATTR_SNOOZED: Final = "snoozed"
ATTR_TASK_TYPE: Final = "task_type"

DUE_UNIQUE_ID: Final = re.compile(
    rf"^{DOMAIN}:(?P<plant_id>.+):care_task:(?P<task_id>[0-9a-f]{{32}}):due$"
)
_ROLE_UNIQUE_ID: Final = re.compile(
    rf"^{DOMAIN}:(?P<plant_id>.+):(?P<role>[a-z0-9_]+)$"
)

_EXCLUDED_STATES: Final = frozenset({STATE_UNAVAILABLE, STATE_UNKNOWN})

EntryFilter = Callable[[er.RegistryEntry], bool]


def multi_select(options: tuple[str, ...]) -> vol.All:
    """Validate a non-empty multi-select of ``options``; duplicates collapse."""
    return vol.All(
        cv.ensure_list,
        vol.Length(min=1),
        [vol.In(options)],
        lambda values: list(dict.fromkeys(values)),
    )


def options_schema(options: dict[Any, Any]) -> vol.Schema:
    """
    Return a trigger or condition schema with an optional target.

    Unknown options are rejected. No target means all plants.
    """
    return vol.Schema(
        {
            vol.Optional(CONF_TARGET): cv.TARGET_FIELDS,
            vol.Required(CONF_OPTIONS, default={}): vol.Schema(options),
        }
    )


def _is_plant_binary_sensor(entry: er.RegistryEntry) -> bool:
    return (
        entry.platform == DOMAIN
        and entry.domain == BINARY_SENSOR
        and entry.unique_id != ALL_PLANTS_UNIQUE_ID
    )


def problem_role(entry: er.RegistryEntry) -> str | None:
    """Return the problem role of a plant binary sensor, if it is one."""
    if not _is_plant_binary_sensor(entry) or DUE_UNIQUE_ID.match(entry.unique_id):
        return None
    match = _ROLE_UNIQUE_ID.fullmatch(entry.unique_id)
    if match is None or match["role"] not in PROBLEM_ROLES:
        return None
    return match["role"]


def is_task_due_entry(entry: er.RegistryEntry) -> bool:
    """Return whether the entry is the due sensor of a care task."""
    return (
        _is_plant_binary_sensor(entry)
        and DUE_UNIQUE_ID.fullmatch(entry.unique_id) is not None
    )


def problem_filter(roles: Iterable[str]) -> EntryFilter:
    """Return a filter for the problem sensors of the given roles."""
    wanted = frozenset(roles)
    return lambda entry: problem_role(entry) in wanted


def plant_binary_sensor_filter(entry: er.RegistryEntry) -> bool:
    """Match every Smart Plants binary sensor; all of them carry the snooze."""
    return _is_plant_binary_sensor(entry)


def filter_entities(
    hass: HomeAssistant, entity_ids: Iterable[str], entry_filter: EntryFilter
) -> set[str]:
    """Return the entity IDs whose registry entry passes ``entry_filter``."""
    registry = er.async_get(hass)
    return {
        entity_id
        for entity_id in entity_ids
        if (entry := registry.async_get(entity_id)) is not None and entry_filter(entry)
    }


def all_plant_entities(hass: HomeAssistant, entry_filter: EntryFilter) -> set[str]:
    """
    Return every matching plant entity, for a target that means all plants.

    Disabled and hidden entities are left out, as Home Assistant leaves them
    out when it expands a device or area target.
    """
    return {
        entry.entity_id
        for entry in er.async_get(hass).entities.values()
        if entry.disabled_by is None and entry.hidden_by is None and entry_filter(entry)
    }


def has_target(target: Mapping[str, Any] | None) -> bool:
    """Return whether a target names anything; no target means all plants."""
    return bool(target) and TargetSelection(dict(target or {})).has_any_target


def all_plants_entity_id(hass: HomeAssistant) -> str | None:
    """Return the current entity ID of the All plants entity, if it exists."""
    return er.async_get(hass).async_get_entity_id(
        BINARY_SENSOR, DOMAIN, ALL_PLANTS_UNIQUE_ID
    )


def targets_all_plants(hass: HomeAssistant, target: Mapping[str, Any] | None) -> bool:
    """
    Return whether a target means all plants.

    That is a target without anything in it, or one that names the All plants
    entity. Mixed with other targets, all plants wins. Only a direct entity
    reference counts: an area or label holding the entity selects as usual.
    """
    if not has_target(target):
        return True
    entity_id = all_plants_entity_id(hass)
    return entity_id is not None and entity_id in cv.ensure_list(
        (target or {}).get(ATTR_ENTITY_ID)
    )


def resolve_entities(
    hass: HomeAssistant,
    target: Mapping[str, Any] | None,
    entry_filter: EntryFilter,
) -> set[str]:
    """Return the matching plant entities of a target, or of all plants."""
    if targets_all_plants(hass, target):
        return all_plant_entities(hass, entry_filter)
    selected = async_extract_referenced_entity_ids(
        hass,
        TargetSelection(dict(target or {})),
        expand_group=False,
        # Low battery is a diagnostic entity and must be found through its
        # plant device.
        primary_entities_only=False,
    )
    return filter_entities(
        hass, selected.referenced | selected.indirectly_referenced, entry_filter
    )


def plant_id_of_device(device: dr.DeviceEntry) -> str | None:
    # Other integrations may register identifiers with more than two parts
    # (HomeKit Bridge uses domain, entry ID and accessory ID), so read them by
    # index instead of unpacking pairs.
    return next(
        (
            identifier[1]
            for identifier in device.identifiers
            if len(identifier) > 1 and identifier[0] == DOMAIN
        ),
        None,
    )


def device_name(device: dr.DeviceEntry) -> str:
    return device.name_by_user or device.name or device.id


@dataclass(frozen=True, slots=True)
class PlantRef:
    """The plant device an entity belongs to."""

    device_id: str
    name: str


def plant_of(hass: HomeAssistant, entity_id: str) -> PlantRef | None:
    """Return the plant device of a Smart Plants entity."""
    entry = er.async_get(hass).async_get(entity_id)
    if entry is None or entry.platform != DOMAIN or entry.device_id is None:
        return None
    device = dr.async_get(hass).async_get(entry.device_id)
    if device is None or plant_id_of_device(device) is None:
        return None
    return PlantRef(device_id=device.id, name=device_name(device))


def entity_display_name(state: State, plant_name: str) -> str:
    """
    Return the entity's own name, without the plant name in front.

    Home Assistant builds a plant entity's friendly name from the device name
    and the entity name, in the system language.
    """
    friendly = str(state.attributes.get("friendly_name") or state.entity_id)
    prefix = f"{plant_name} "
    if friendly.startswith(prefix) and len(friendly) > len(prefix):
        return friendly[len(prefix) :]
    return friendly


def is_available(state: State | None) -> bool:
    return state is not None and state.state not in _EXCLUDED_STATES


def is_snoozed(state: State) -> bool:
    return state.attributes.get(ATTR_SNOOZED) is True


def is_alerting(state: State, *, include_snoozed: bool = False) -> bool:
    """Return whether an alert sensor is on and, unless included, not snoozed."""
    return state.state == STATE_ON and (include_snoozed or not is_snoozed(state))


def group_by_plant(
    hass: HomeAssistant, entity_ids: Iterable[str]
) -> dict[str, list[str]]:
    """Group plant entity IDs by their plant device ID."""
    registry = er.async_get(hass)
    groups: dict[str, list[str]] = {}
    for entity_id in sorted(entity_ids):
        entry = registry.async_get(entity_id)
        if entry is not None and entry.device_id is not None:
            groups.setdefault(entry.device_id, []).append(entity_id)
    return groups


def plant_snoozed(states: Iterable[State | None]) -> bool | None:
    """
    Return the snooze of one plant from its binary sensors' states.

    All of a plant's binary sensors carry the same snooze value. The plant is
    snoozed when any available one says so, and not snoozed when at least one
    is available and none does. ``None`` means no sensor is available, for
    example while the plant is paused.
    """
    available = [state for state in states if is_available(state)]
    if not available:
        return None
    return any(is_snoozed(state) for state in available if state is not None)


def resolve_plant_devices(
    hass: HomeAssistant, target: Mapping[str, Any] | None
) -> list[dr.DeviceEntry]:
    """
    Return the plant devices of a target, or every plant for all plants.

    Devices, areas, floors and labels resolve to the plants among them; a
    Smart Plants entity resolves to its plant.
    """
    devices = dr.async_get(hass)
    if targets_all_plants(hass, target):
        return [
            device
            for device in devices.devices.values()
            if plant_id_of_device(device) is not None
        ]
    selected = async_extract_referenced_entity_ids(
        hass,
        TargetSelection(dict(target or {})),
        expand_group=False,
        primary_entities_only=False,
    )
    device_ids = set(selected.referenced_devices)
    registry = er.async_get(hass)
    for entity_id in selected.referenced | selected.indirectly_referenced:
        entry = registry.async_get(entity_id)
        if entry is not None and entry.platform == DOMAIN and entry.device_id:
            device_ids.add(entry.device_id)
    return [
        device
        for device_id in device_ids
        if (device := devices.async_get(device_id)) is not None
        and plant_id_of_device(device) is not None
    ]


def area_name(hass: HomeAssistant, device: dr.DeviceEntry) -> str | None:
    if device.area_id is None:
        return None
    area = ar.async_get(hass).async_get_area(device.area_id)
    return None if area is None else area.name


def plant_binary_sensors(hass: HomeAssistant, device_id: str) -> list[er.RegistryEntry]:
    """Return the enabled binary sensor entries of one plant device."""
    return [
        entry
        for entry in er.async_entries_for_device(er.async_get(hass), device_id)
        if _is_plant_binary_sensor(entry)
    ]
