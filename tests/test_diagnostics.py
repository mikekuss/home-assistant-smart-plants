from __future__ import annotations

from custom_components.smart_plants.const import (
    CONF_OPENPLANTBOOK_CLIENT_ID,
    CONF_OPENPLANTBOOK_CLIENT_SECRET,
    CONF_OPENPLANTBOOK_ENABLED,
    DOMAIN,
    SINGLETON_UNIQUE_ID,
)
from custom_components.smart_plants.diagnostics import (
    async_get_config_entry_diagnostics,
)
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def test_diagnostics_redact_all_credentials(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=SINGLETON_UNIQUE_ID,
        data={
            CONF_OPENPLANTBOOK_ENABLED: True,
            CONF_OPENPLANTBOOK_CLIENT_ID: "sensitive-client",
            CONF_OPENPLANTBOOK_CLIENT_SECRET: "sensitive-secret",
        },
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    rendered = repr(diagnostics)
    assert "sensitive-client" not in rendered
    assert "sensitive-secret" not in rendered
    assert diagnostics["entry"]["data"]["credentials_configured"] is True
    assert CONF_OPENPLANTBOOK_CLIENT_ID not in diagnostics["entry"]["data"]
    assert CONF_OPENPLANTBOOK_CLIENT_SECRET not in diagnostics["entry"]["data"]
    assert "access_token" not in rendered


async def test_diagnostics_aggregate_private_inventory_fields(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=SINGLETON_UNIQUE_ID,
        data={},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    plant = await entry.runtime_data.manager.async_create_plant(
        name="Private plant name",
        tags=("private-tag",),
        category="private-category",
    )
    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    rendered = repr(diagnostics)
    for private_value in (
        plant.id,
        plant.name,
        plant.created_at,
        "private-tag",
        "private-category",
    ):
        assert private_value not in rendered
    assert diagnostics["inventory"]["plant_count"] == 1
    assert "plants" not in diagnostics["inventory"]
