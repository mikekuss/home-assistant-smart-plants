"""Privacy-safe diagnostics for Smart Plants."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from .const import (
    CONF_OPENPLANTBOOK_CLIENT_ID,
    CONF_OPENPLANTBOOK_CLIENT_SECRET,
    CONF_OPENPLANTBOOK_ENABLED,
    CONF_PRESERVE_INVENTORY_ON_REMOVAL,
)
from .models import ReadingSchedule
from .roles import role_definitions

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from . import SmartPlantsConfigEntry

_REDACTED = "**REDACTED**"
_SENSITIVE_KEYS = frozenset(
    {CONF_OPENPLANTBOOK_CLIENT_ID, CONF_OPENPLANTBOOK_CLIENT_SECRET}
)


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: SmartPlantsConfigEntry
) -> dict[str, Any]:
    del hass
    runtime = entry.runtime_data
    provider = (
        dict(runtime.provider_service.diagnostics())
        if runtime.provider_service is not None
        else {"available": False}
    )
    return {
        "entry": {
            "data": {
                CONF_OPENPLANTBOOK_ENABLED: bool(
                    entry.data.get(CONF_OPENPLANTBOOK_ENABLED, False)
                ),
                "credentials_configured": bool(
                    entry.data.get(CONF_OPENPLANTBOOK_CLIENT_ID)
                    and entry.data.get(CONF_OPENPLANTBOOK_CLIENT_SECRET)
                ),
            },
            "options": {
                CONF_PRESERVE_INVENTORY_ON_REMOVAL: bool(
                    entry.options.get(CONF_PRESERVE_INVENTORY_ON_REMOVAL, False)
                )
            },
        },
        "provider": provider,
        "inventory": _inventory_summary(runtime.manager.snapshot),
        "reading_care_tasks": _reading_task_summary(runtime.manager),
    }


def _redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: _REDACTED if key in _SENSITIVE_KEYS else _redact(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact(item) for item in value]
    return value


def _inventory_summary(snapshot: Any) -> dict[str, Any]:
    lifecycle: dict[str, int] = {}
    species_providers: dict[str, int] = {}
    source_roles = tuple(
        definition.key
        for definition in role_definitions()
        if definition.replace_sources is not None
    )
    role_source_counts = dict.fromkeys(source_roles, 0)
    image_count = 0
    # Care tasks carry user-written names and instructions, so only their
    # types are counted; no task text reaches diagnostics.
    care_task_type_counts: dict[str, int] = {}
    care_task_schedule_counts: dict[str, int] = {}
    rest_period_count = 0
    # When each snooze ends; not sensitive, and sorted so no plant is named.
    snoozed_until: list[str] = []
    for plant in snapshot.plants.values():
        lifecycle[plant.lifecycle_state] = lifecycle.get(plant.lifecycle_state, 0) + 1
        if plant.species is not None:
            key = plant.species.provider
            species_providers[key] = species_providers.get(key, 0) + 1
        for role in source_roles:
            config = plant.role_config(role)
            if config is not None:
                role_source_counts[role] += len(config.sources)
        image_count += plant.image is not None
        for task in plant.care_tasks:
            care_task_type_counts[task.type] = (
                care_task_type_counts.get(task.type, 0) + 1
            )
            kind = task.schedule.kind
            care_task_schedule_counts[kind] = care_task_schedule_counts.get(kind, 0) + 1
        rest_period_count += plant.rest_period is not None
        if plant.snoozed_until is not None:
            snoozed_until.append(plant.snoozed_until)
    return {
        "schema_revision": snapshot.revision,
        "plant_count": len(snapshot.plants),
        "lifecycle_counts": lifecycle,
        "species_provider_counts": species_providers,
        "assigned_source_count": sum(role_source_counts.values()),
        "assigned_source_counts_by_role": role_source_counts,
        "image_count": image_count,
        "care_task_count": sum(care_task_type_counts.values()),
        "care_task_type_counts": care_task_type_counts,
        "care_task_schedule_counts": care_task_schedule_counts,
        "rest_period_count": rest_period_count,
        "snoozed_until": sorted(snoozed_until),
        "pending_operation_count": len(snapshot.pending_operations),
        "tombstone_count": len(snapshot.tombstones),
    }


def _reading_task_summary(manager: Any) -> list[dict[str, Any]]:
    """
    Describe each reading care task without names, values or sensor ids.

    Only the schedule kind, the condition, which kind of source is set and
    the current status are reported; a sensor entity id could identify a
    device, and readings and thresholds say nothing about a malfunction. A
    forecast source also reports its weather entity, its window and whether
    the last fetch gave a value, which tells a missing forecast apart from a
    task that is simply not due; the forecast itself is left out.
    """
    tracker = manager.reading_tracker
    summary: list[dict[str, Any]] = []
    for plant in manager.snapshot.plants.values():
        for task in plant.care_tasks:
            schedule = task.schedule
            if not isinstance(schedule, ReadingSchedule):
                continue
            entry: dict[str, Any] = {
                "kind": schedule.kind,
                "condition": schedule.condition,
                "role_source": schedule.source.role is not None,
                "entity_source": schedule.source.entity_id is not None,
                "status": (
                    tracker.task_info(task).state.status
                    if tracker is not None
                    else None
                ),
            }
            if (forecast := schedule.source.forecast) is not None:
                entry["forecast_source"] = {
                    "entity_id": forecast.entity_id,
                    "reading": forecast.reading,
                    "hours": forecast.hours,
                    "last_fetch_had_value": (
                        tracker.forecast_had_value(forecast.entity_id)
                        if tracker is not None
                        else None
                    ),
                }
            summary.append(entry)
    return summary
