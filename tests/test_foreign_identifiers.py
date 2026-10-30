"""Devices of other integrations whose identifiers have more than two parts."""

from __future__ import annotations

import pytest
from custom_components.smart_plants.const import DOMAIN
from homeassistant.const import STATE_OFF, STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import MockConfigEntry

from .test_all_plants import ALL_PLANTS
from .test_conditions import check, get_report
from .test_triggers import (
    manager_of,
    set_soil,
    setup_integration,
    state_of,
    watered_plant,
)


def mock_bridge_device(hass: HomeAssistant, area_id: str | None = None) -> str:
    """Register a device with a three-part identifier, as HomeKit Bridge does."""
    bridge_entry = MockConfigEntry(domain="mock_bridge")
    bridge_entry.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=bridge_entry.entry_id,
        identifiers={("mock_bridge", "entry", "1")},  # type: ignore[arg-type]
        name="Bridge Accessory",
    )
    if area_id is not None:
        dr.async_get(hass).async_update_device(device.id, area_id=area_id)
    return device.id


async def test_report_and_condition_for_all_plants(hass: HomeAssistant) -> None:
    kitchen = ar.async_get(hass).async_create("Kitchen")
    mock_bridge_device(hass, area_id=kitchen.id)
    entry = await setup_integration(hass)
    await watered_plant(hass, manager_of(entry), "Aloe", area_id=kitchen.id)
    await set_soil(hass, "10")

    targets: list[dict[str, str]] = [
        {},
        {"entity_id": ALL_PLANTS},
        {"area_id": kitchen.id},
    ]
    assert (await get_report(hass, entity_id="all"))["count"] == 1
    for target in targets:
        report = await get_report(hass, **target)
        assert report["count"] == 1, target
        assert report["has_items"] is True, target
        condition = {
            "condition": "smart_plants.needs_attention",
            **({"target": target} if target else {}),
        }
        assert await check(hass, condition) is True, target


async def test_all_plants_entity_is_created(hass: HomeAssistant) -> None:
    mock_bridge_device(hass)
    entry = await setup_integration(hass)
    assert state_of(hass, ALL_PLANTS) == STATE_OFF

    await watered_plant(hass, manager_of(entry), "Aloe")
    await set_soil(hass, "10")
    assert state_of(hass, ALL_PLANTS) == STATE_ON


async def test_log_care_rejects_the_device(hass: HomeAssistant) -> None:
    await setup_integration(hass)
    device_id = mock_bridge_device(hass)
    with pytest.raises(ServiceValidationError) as info:
        await hass.services.async_call(
            DOMAIN,
            "log_care",
            {"device_id": device_id, "kind": "watering"},
            blocking=True,
        )
    assert info.value.translation_key == "invalid_target"
