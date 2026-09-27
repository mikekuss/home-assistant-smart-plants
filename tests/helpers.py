"""Shared helpers for Smart Plants tests."""

from __future__ import annotations

from custom_components.smart_plants.const import DOMAIN
from homeassistant.helpers import device_registry as dr


def plant_device(registry: dr.DeviceRegistry, plant_id: str) -> dr.DeviceEntry | None:
    """Return the single device registered for ``plant_id``, if any."""
    devices = registry.async_get_devices(identifiers={(DOMAIN, plant_id)})
    assert len(devices) <= 1, devices
    return devices[0] if devices else None
