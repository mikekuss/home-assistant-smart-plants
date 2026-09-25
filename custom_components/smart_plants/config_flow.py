from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_OPENPLANTBOOK_ENABLED,
    CONF_PRESERVE_INVENTORY_ON_REMOVAL,
    DEFAULT_PRESERVE_INVENTORY_ON_REMOVAL,
    DOMAIN,
    NAME,
    SINGLETON_UNIQUE_ID,
)
from .providers import provider_descriptors

OPENPLANTBOOK_CREDENTIALS_URL = "https://open.plantbook.io/apikey/"


def _provider_description_placeholders() -> dict[str, str]:
    return {"openplantbook_credentials_url": OPENPLANTBOOK_CREDENTIALS_URL}


def _provider_schema(defaults: dict[str, Any]) -> vol.Schema:
    fields: dict[vol.Marker, Any] = {}
    for descriptor in provider_descriptors():
        for key in descriptor.config_keys:
            if key in descriptor.secret_keys:
                fields[vol.Optional(key)] = selector.TextSelector(
                    selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD)
                )
            elif key in descriptor.boolean_keys:
                fields[vol.Optional(key, default=bool(defaults.get(key, False)))] = bool
            else:
                fields[vol.Optional(key, default=defaults.get(key, ""))] = str
    return vol.Schema(fields)


async def _async_validate_provider(hass: Any, data: dict[str, Any]) -> str | None:
    for descriptor in provider_descriptors():
        if error := await descriptor.validate_config(hass, data):
            return error
    return None


def _normalize_provider_data(data: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for descriptor in provider_descriptors():
        normalized.update(descriptor.normalize_config(data))
    return normalized


def _safe_provider_defaults(data: dict[str, Any]) -> dict[str, Any]:
    """Return form defaults without ever reflecting a credential secret."""
    secrets = {
        key for descriptor in provider_descriptors() for key in descriptor.secret_keys
    }
    return {
        key: data[key]
        for descriptor in provider_descriptors()
        for key in descriptor.config_keys
        if key not in secrets and key in data
    }


def _provider_keys() -> tuple[str, ...]:
    return tuple(
        key for descriptor in provider_descriptors() for key in descriptor.config_keys
    )


def _secret_keys() -> frozenset[str]:
    return frozenset(
        key for descriptor in provider_descriptors() for key in descriptor.secret_keys
    )


class SmartPlantsConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        await self.async_set_unique_id(SINGLETON_UNIQUE_ID)
        self._abort_if_unique_id_configured()

        if self._async_current_entries():
            return self.async_abort(reason="already_configured")

        errors: dict[str, str] = {}
        if user_input is not None:
            provider_data = _normalize_provider_data(user_input)
            error = await _async_validate_provider(self.hass, provider_data)
            if error is None:
                return self.async_create_entry(title=NAME, data=provider_data)
            errors["base"] = error

        return self.async_show_form(
            step_id="user",
            data_schema=_provider_schema(_safe_provider_defaults(user_input or {})),
            errors=errors,
            description_placeholders=_provider_description_placeholders(),
        )

    async def async_step_reauth(
        self, entry_data: dict[str, Any]
    ) -> config_entries.ConfigFlowResult:
        del entry_data
        self._reauth_entry = self._get_reauth_entry()
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        errors: dict[str, str] = {}
        defaults = _safe_provider_defaults(dict(self._reauth_entry.data))
        defaults[CONF_OPENPLANTBOOK_ENABLED] = True
        if user_input is not None:
            submitted = {**user_input, CONF_OPENPLANTBOOK_ENABLED: True}
            provider_data = _normalize_provider_data(submitted)
            error = await _async_validate_provider(self.hass, provider_data)
            if error is None:
                return self.async_update_reload_and_abort(
                    self._reauth_entry,
                    data_updates=provider_data,
                    reason="reauth_successful",
                )
            errors["base"] = error
        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=_provider_schema(
                _safe_provider_defaults(user_input)
                if user_input is not None
                else defaults
            ),
            errors=errors,
            description_placeholders=_provider_description_placeholders(),
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> SmartPlantsOptionsFlow:
        return SmartPlantsOptionsFlow(config_entry)


class SmartPlantsOptionsFlow(config_entries.OptionsFlowWithReload):
    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        if user_input is not None:
            submitted = dict(user_input)
            provider_data = {}
            for key in _provider_keys():
                if key in submitted:
                    provider_data[key] = submitted.pop(key)
                elif key in _secret_keys():
                    provider_data[key] = self._config_entry.data.get(key, "")
            provider_data = _normalize_provider_data(provider_data)
            error = await _async_validate_provider(self.hass, provider_data)
            if error is not None:
                return self.async_show_form(
                    step_id="init",
                    data_schema=self._schema(
                        {
                            **submitted,
                            **_safe_provider_defaults(provider_data),
                        }
                    ),
                    errors={"base": error},
                    description_placeholders=_provider_description_placeholders(),
                )
            data_changed = dict(self._config_entry.data) != provider_data
            if data_changed:
                self.hass.config_entries.async_update_entry(
                    self._config_entry, data=provider_data
                )
                if dict(self._config_entry.options) == submitted:
                    self.hass.config_entries.async_schedule_reload(
                        self._config_entry.entry_id
                    )
            return self.async_create_entry(title="", data=submitted)

        preserve = self._config_entry.options.get(
            CONF_PRESERVE_INVENTORY_ON_REMOVAL,
            DEFAULT_PRESERVE_INVENTORY_ON_REMOVAL,
        )
        return self.async_show_form(
            step_id="init",
            data_schema=self._schema(
                {
                    **_safe_provider_defaults(dict(self._config_entry.data)),
                    CONF_PRESERVE_INVENTORY_ON_REMOVAL: preserve,
                }
            ),
            description_placeholders=_provider_description_placeholders(),
        )

    @staticmethod
    def _schema(defaults: dict[str, Any]) -> vol.Schema:
        return vol.Schema(
            {
                vol.Optional(
                    CONF_PRESERVE_INVENTORY_ON_REMOVAL,
                    default=defaults.get(
                        CONF_PRESERVE_INVENTORY_ON_REMOVAL,
                        DEFAULT_PRESERVE_INVENTORY_ON_REMOVAL,
                    ),
                ): bool,
                **_provider_schema(_safe_provider_defaults(defaults)).schema,
            }
        )
