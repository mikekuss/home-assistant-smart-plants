"""Privacy-safe diagnostics for Smart Plants."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from .const import (
    CONF_OPENPLANTBOOK_CLIENT_ID,
    CONF_OPENPLANTBOOK_CLIENT_SECRET,
    CONF_OPENPLANTBOOK_ENABLED,
    CONF_PRESERVE_INVENTORY_ON_REMOVAL,
)

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
    source_count = 0
    image_count = 0
    for plant in snapshot.plants.values():
        lifecycle[plant.lifecycle_state] = lifecycle.get(plant.lifecycle_state, 0) + 1
        if plant.species is not None:
            key = plant.species.provider
            species_providers[key] = species_providers.get(key, 0) + 1
        source_count += len(plant.moisture.sources)
        image_count += plant.image is not None
    return {
        "schema_revision": snapshot.revision,
        "plant_count": len(snapshot.plants),
        "lifecycle_counts": lifecycle,
        "species_provider_counts": species_providers,
        "assigned_source_count": source_count,
        "image_count": image_count,
        "pending_operation_count": len(snapshot.pending_operations),
        "tombstone_count": len(snapshot.tombstones),
    }
