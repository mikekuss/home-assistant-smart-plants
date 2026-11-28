from __future__ import annotations

import json
from http import HTTPStatus
from pathlib import Path
from unittest.mock import patch

from custom_components.smart_plants.const import (
    CONF_OPENPLANTBOOK_CLIENT_ID,
    CONF_OPENPLANTBOOK_CLIENT_SECRET,
    CONF_OPENPLANTBOOK_ENABLED,
    DOMAIN,
    SINGLETON_UNIQUE_ID,
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.storage import SmartPlantsStorageError
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator


async def test_diagnostics_download_after_failed_setup(
    hass: HomeAssistant, hass_client: ClientSessionGenerator, tmp_path: Path
) -> None:
    assert await async_setup_component(hass, "diagnostics", {})
    # A storage file from a newer release: only the version numbers may be
    # read from it, never the stored plants.
    hass.config.config_dir = str(tmp_path)
    storage = tmp_path / ".storage"
    storage.mkdir()
    (storage / STORAGE_KEY).write_text(
        json.dumps(
            {
                "version": 1,
                "minor_version": 99,
                "key": STORAGE_KEY,
                "data": {"plants": {"p1": {"name": "private-plant-name"}}},
            },
            indent=4,
        ),
        encoding="utf-8",
    )
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
    with patch.object(
        SmartPlantsManager,
        "async_load",
        side_effect=SmartPlantsStorageError("private-error-text"),
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.SETUP_ERROR

    client = await hass_client()
    response = await client.get(f"/api/diagnostics/config_entry/{entry.entry_id}")
    assert response.status == HTTPStatus.OK
    body = await response.text()
    for private_value in (
        "sensitive-client",
        "sensitive-secret",
        "private-error-text",
        "private-plant-name",
    ):
        assert private_value not in body
    payload = await response.json()
    # Home Assistant adds its own and the integration's version to the file.
    assert payload["home_assistant"]["version"]
    assert payload["integration_manifest"]["version"]
    data = payload["data"]
    assert data["setup"]["state"] == ConfigEntryState.SETUP_ERROR.value
    assert data["setup"]["error_key"] == "storage_load_failed"
    assert data["setup"]["stored_inventory_version"] == {
        "version": 1,
        "minor_version": 99,
    }
    assert data["setup"]["supported_inventory_version"] == {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": STORAGE_MINOR_VERSION,
    }
    assert data["entry"]["data"]["credentials_configured"] is True
    assert "inventory" not in data


async def test_failed_setup_diagnostics_without_readable_storage(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    hass.config.config_dir = str(tmp_path)
    entry = MockConfigEntry(domain=DOMAIN, unique_id=SINGLETON_UNIQUE_ID, data={})
    entry.add_to_hass(hass)
    with patch.object(
        SmartPlantsManager,
        "async_load",
        side_effect=SmartPlantsStorageError("boom"),
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    assert diagnostics["setup"]["stored_inventory_version"] is None

    storage = tmp_path / ".storage"
    storage.mkdir()
    (storage / STORAGE_KEY).write_text("not json", encoding="utf-8")
    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    assert diagnostics["setup"]["stored_inventory_version"] is None


async def test_loaded_entry_diagnostics_report_setup_state(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, unique_id=SINGLETON_UNIQUE_ID, data={})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    assert diagnostics["setup"] == {
        "state": ConfigEntryState.LOADED.value,
        "error_key": None,
    }
    assert "inventory" in diagnostics
