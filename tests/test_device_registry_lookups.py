"""
Plant lookups only use device registry calls that Home Assistant keeps.

Home Assistant 2026.11 deprecates three calls this integration used:

- ``DeviceRegistry.async_get_device`` with identifiers, removed in 2027.8.
- ``DeviceRegistry.devices`` used as a mapping, removed in 2027.9.
- ``DeviceEntry.config_entries``, removed in 2027.10.

For a custom integration they only log a warning, and the minimum supported
version, 2026.8, doesn't report them at all. These tests make any call from
the integration fail instead, so a later change can't bring one back: on
versions that report a deprecated call, the report fails the test; on 2026.8
the three calls are guarded directly. Which calls each version still has as
real methods differs, so each guard only applies where its target exists.
"""

from __future__ import annotations

import sys
from collections.abc import Callable
from types import FrameType
from typing import Any

import pytest
from custom_components.smart_plants.const import DOMAIN
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr

from .test_conditions import get_report
from .test_triggers import manager_of, set_soil, setup_integration, watered_plant

PACKAGE = "custom_components.smart_plants"


def _from_integration(frame: FrameType | None) -> bool:
    while frame is not None:
        if frame.f_globals.get("__name__", "").startswith(PACKAGE):
            return True
        frame = frame.f_back
    return False


def _guarded(name: str, original: Callable[..., Any]) -> Callable[..., Any]:
    def guard(*args: Any, **kwargs: Any) -> Any:
        caller = sys._getframe(1).f_globals.get("__name__", "")
        assert not caller.startswith(PACKAGE), f"{caller} calls {name}"
        return original(*args, **kwargs)

    return guard


@pytest.fixture
def deprecated_lookups_fail(
    hass: HomeAssistant, monkeypatch: pytest.MonkeyPatch
) -> None:
    report_usage = getattr(dr, "report_usage", None)
    if report_usage is not None:

        def fail_on_report(what: str, *args: Any, **kwargs: Any) -> None:
            assert not _from_integration(sys._getframe(1)), f"Smart Plants {what}"
            report_usage(what, *args, **kwargs)

        monkeypatch.setattr(dr, "report_usage", fail_on_report)
    monkeypatch.setattr(
        dr.DeviceRegistry,
        "async_get_device",
        _guarded("async_get_device", dr.DeviceRegistry.async_get_device),
    )
    config_entries: Any = vars(dr.DeviceEntry).get("config_entries")
    if isinstance(config_entries, property) and config_entries.fget is not None:
        monkeypatch.setattr(
            dr.DeviceEntry,
            "config_entries",
            property(_guarded("DeviceEntry.config_entries", config_entries.fget)),
        )
    items = type(dr.async_get(hass).devices)
    values = getattr(items, "values", None)
    if values is not None:
        monkeypatch.setattr(
            items, "values", _guarded("DeviceRegistry.devices.values", values)
        )


@pytest.mark.usefixtures("deprecated_lookups_fail")
async def test_report_for_all_plants(hass: HomeAssistant) -> None:
    entry = await setup_integration(hass)
    await watered_plant(hass, manager_of(entry), "Aloe")
    await set_soil(hass, "10")

    report = await get_report(hass, entity_id="all")

    assert report["count"] == 1


@pytest.mark.usefixtures("deprecated_lookups_fail")
async def test_log_care_on_the_plant_device(hass: HomeAssistant) -> None:
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    plant_id = await watered_plant(hass, manager, "Aloe")
    device = dr.async_get(hass).async_get_device_by_identifier(
        (DOMAIN, plant_id), entry.entry_id
    )
    assert device is not None

    await hass.services.async_call(
        DOMAIN,
        "log_care",
        {"device_id": device.id, "kind": "fertilizing"},
        blocking=True,
    )

    plant = manager.get_plant(plant_id)
    assert plant is not None
    assert [event.kind for event in plant.care_events][-1] == "fertilizing"


@pytest.mark.usefixtures("deprecated_lookups_fail")
async def test_archive_keeps_the_device_and_area(hass: HomeAssistant) -> None:
    entry = await setup_integration(hass)
    manager = manager_of(entry)
    kitchen = ar.async_get(hass).async_create("Kitchen")
    plant_id = await watered_plant(hass, manager, "Aloe", area_id=kitchen.id)
    device = dr.async_get(hass).async_get_device_by_identifier(
        (DOMAIN, plant_id), entry.entry_id
    )
    assert device is not None
    plant = manager.get_plant(plant_id)
    assert plant is not None

    record = await manager.async_archive_plant(
        plant_id, expected_revision=plant.revision
    )

    assert record.device_id == device.id
    assert record.area_id == kitchen.id
    assert record.area_name == "Kitchen"
