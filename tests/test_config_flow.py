from __future__ import annotations

from unittest.mock import patch

import voluptuous as vol
from custom_components.smart_plants.const import (
    CONF_OPENPLANTBOOK_CLIENT_ID,
    CONF_OPENPLANTBOOK_CLIENT_SECRET,
    CONF_OPENPLANTBOOK_ENABLED,
    CONF_PRESERVE_INVENTORY_ON_REMOVAL,
    DEFAULT_PRESERVE_INVENTORY_ON_REMOVAL,
    DOMAIN,
    SINGLETON_UNIQUE_ID,
)
from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def test_first_config_flow(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": config_entries.SOURCE_USER},
    )
    assert result["type"] == "form"

    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] == "create_entry"
    assert result["title"] == "Smart Plants"


async def test_second_config_flow_aborts(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Smart Plants",
        data={},
        options={},
        unique_id=SINGLETON_UNIQUE_ID,
    )
    entry.add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": config_entries.SOURCE_USER},
    )
    assert result["type"] == "abort"
    # single_config_entry: true in the manifest makes HA abort user-initiated
    # flows with single_instance_allowed before the config flow's own
    # already_configured branch can run.
    assert result["reason"] in {"single_instance_allowed", "already_configured"}


async def test_options_flow_default_matches_constant(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN, data={}, options={}, unique_id=SINGLETON_UNIQUE_ID
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] == "form"
    assert result["data_schema"] is not None
    schema = result["data_schema"].schema
    preserve_key = next(
        key for key in schema if key.schema == CONF_PRESERVE_INVENTORY_ON_REMOVAL
    )
    assert preserve_key.default() == DEFAULT_PRESERVE_INVENTORY_ON_REMOVAL


async def test_options_flow_update_saves_and_reloads(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN, data={}, options={}, unique_id=SINGLETON_UNIQUE_ID
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {CONF_PRESERVE_INVENTORY_ON_REMOVAL: True},
    )
    await hass.async_block_till_done()
    assert result["type"] == "create_entry"
    assert entry.options[CONF_PRESERVE_INVENTORY_ON_REMOVAL] is True

    # The integration must still be loaded after the options save.
    assert entry.state is config_entries.ConfigEntryState.LOADED

    # Second visit reflects the saved value as the new default.
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["data_schema"] is not None
    schema = result["data_schema"].schema
    preserve_key = next(
        key for key in schema if key.schema == CONF_PRESERVE_INVENTORY_ON_REMOVAL
    )
    assert preserve_key.default() is True


async def test_provider_credentials_are_optional(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            CONF_OPENPLANTBOOK_ENABLED: False,
            CONF_OPENPLANTBOOK_CLIENT_ID: "",
            CONF_OPENPLANTBOOK_CLIENT_SECRET: "",
        },
    )
    assert result["type"] == "create_entry"


async def test_invalid_provider_credentials_are_safe(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    with patch(
        "custom_components.smart_plants.config_flow._async_validate_provider",
        return_value="invalid_auth",
    ):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {
                CONF_OPENPLANTBOOK_ENABLED: True,
                CONF_OPENPLANTBOOK_CLIENT_ID: "client",
                CONF_OPENPLANTBOOK_CLIENT_SECRET: "secret-value",
            },
        )
    assert result["type"] == "form"
    assert result["errors"] == {"base": "invalid_auth"}
    assert "secret-value" not in repr(result)


async def test_reauthentication_updates_credentials(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Smart Plants",
        data={
            CONF_OPENPLANTBOOK_ENABLED: True,
            CONF_OPENPLANTBOOK_CLIENT_ID: "old-client",
            CONF_OPENPLANTBOOK_CLIENT_SECRET: "old-secret",
        },
        unique_id=SINGLETON_UNIQUE_ID,
    )
    entry.add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={
            "source": config_entries.SOURCE_REAUTH,
            "entry_id": entry.entry_id,
        },
        data=dict(entry.data),
    )
    with patch(
        "custom_components.smart_plants.config_flow._async_validate_provider",
        return_value=None,
    ):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {
                CONF_OPENPLANTBOOK_ENABLED: True,
                CONF_OPENPLANTBOOK_CLIENT_ID: "new-client",
                CONF_OPENPLANTBOOK_CLIENT_SECRET: "new-secret",
            },
        )
    assert result["type"] == "abort"
    assert result["reason"] == "reauth_successful"
    assert entry.data[CONF_OPENPLANTBOOK_CLIENT_ID] == "new-client"


async def test_password_selector_never_prefills_existing_secret(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={
            CONF_OPENPLANTBOOK_ENABLED: True,
            CONF_OPENPLANTBOOK_CLIENT_ID: "client",
            CONF_OPENPLANTBOOK_CLIENT_SECRET: "do-not-echo",
        },
        options={},
        unique_id=SINGLETON_UNIQUE_ID,
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] == "form"
    assert "do-not-echo" not in repr(result)
    data_schema = result["data_schema"]
    assert data_schema is not None
    schema = data_schema.schema
    secret_key = next(
        key for key in schema if key.schema == CONF_OPENPLANTBOOK_CLIENT_SECRET
    )
    assert secret_key.default is vol.UNDEFINED
    assert schema[secret_key].config["type"] == "password"


async def test_provider_config_is_normalized_before_validation_and_persistence(
    hass: HomeAssistant,
) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    with patch(
        "custom_components.smart_plants.config_flow._async_validate_provider",
        return_value=None,
    ) as validate:
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {
                CONF_OPENPLANTBOOK_ENABLED: True,
                CONF_OPENPLANTBOOK_CLIENT_ID: "  client  ",
                CONF_OPENPLANTBOOK_CLIENT_SECRET: "  secret  ",
            },
        )
    expected = {
        CONF_OPENPLANTBOOK_ENABLED: True,
        CONF_OPENPLANTBOOK_CLIENT_ID: "client",
        CONF_OPENPLANTBOOK_CLIENT_SECRET: "secret",
    }
    assert validate.await_args is not None
    assert validate.await_args.args[1] == expected
    assert result["data"] == expected


async def test_provider_only_options_change_persists_secret_and_reloads(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={
            CONF_OPENPLANTBOOK_ENABLED: True,
            CONF_OPENPLANTBOOK_CLIENT_ID: "old-client",
            CONF_OPENPLANTBOOK_CLIENT_SECRET: "existing-secret",
        },
        options={CONF_PRESERVE_INVENTORY_ON_REMOVAL: False},
        unique_id=SINGLETON_UNIQUE_ID,
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    result = await hass.config_entries.options.async_init(entry.entry_id)
    with patch(
        "custom_components.smart_plants.config_flow._async_validate_provider",
        return_value=None,
    ):
        result = await hass.config_entries.options.async_configure(
            result["flow_id"],
            {
                CONF_PRESERVE_INVENTORY_ON_REMOVAL: False,
                CONF_OPENPLANTBOOK_ENABLED: True,
                CONF_OPENPLANTBOOK_CLIENT_ID: " new-client ",
            },
        )
    await hass.async_block_till_done()
    assert result["type"] == "create_entry"
    assert entry.data[CONF_OPENPLANTBOOK_CLIENT_ID] == "new-client"
    assert entry.data[CONF_OPENPLANTBOOK_CLIENT_SECRET] == "existing-secret"
    assert entry.state is config_entries.ConfigEntryState.LOADED
