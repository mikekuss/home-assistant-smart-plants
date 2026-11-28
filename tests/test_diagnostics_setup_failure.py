from __future__ import annotations

import logging
from http import HTTPStatus
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
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
from custom_components.smart_plants.storage import (
    SmartPlantsStorageError,
    stored_inventory_version,
)
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator

# Captured at import, before the test harness replaces Store writes with an
# in-memory copy, so a test can write a real file the way Home Assistant does.
_REAL_ASYNC_WRITE_DATA = Store._async_write_data

_NEWER_MINOR = 99
_PRIVATE_PLANTS = {"plants": {"p1": {"name": "private-plant-name"}}}


async def _write_inventory_file(
    hass: HomeAssistant, tmp_path: Path, minor_version: int
) -> None:
    """Write the inventory file with Home Assistant's own Store."""
    hass.config.config_dir = str(tmp_path)
    store: Store[dict[str, Any]] = Store(
        hass, STORAGE_MAJOR_VERSION, STORAGE_KEY, minor_version=minor_version
    )
    with patch.object(Store, "_async_write_data", _REAL_ASYNC_WRITE_DATA):
        await store.async_save(_PRIVATE_PLANTS)
    assert (tmp_path / ".storage" / STORAGE_KEY).is_file()


async def test_stored_inventory_version_reads_a_store_written_file(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    await _write_inventory_file(hass, tmp_path, _NEWER_MINOR)
    version = await hass.async_add_executor_job(stored_inventory_version, hass)
    assert version == {"version": STORAGE_MAJOR_VERSION, "minor_version": 99}


async def test_diagnostics_download_after_failed_setup(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    hass_storage: dict[str, Any],
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
) -> None:
    assert await async_setup_component(hass, "diagnostics", {})
    # Storage from a newer release: setup refuses it, and only the version
    # numbers may be read from the file, never the stored plants.
    await _write_inventory_file(hass, tmp_path, _NEWER_MINOR)
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": _NEWER_MINOR,
        "key": STORAGE_KEY,
        "data": _PRIVATE_PLANTS,
    }
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
    with caplog.at_level(logging.ERROR):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.SETUP_ERROR
    assert entry.error_reason_translation_key == "storage_load_failed"

    # Home Assistant offers no download for a failed entry, so the log names
    # both versions once.
    version_lines = [
        record.getMessage()
        for record in caplog.records
        if record.name.startswith("custom_components.smart_plants")
        and "stored version" in record.getMessage()
    ]
    assert version_lines == [
        (
            "Smart Plants storage could not be loaded; stored version "
            f"{STORAGE_MAJOR_VERSION}.{_NEWER_MINOR}, supported version "
            f"{STORAGE_MAJOR_VERSION}.{STORAGE_MINOR_VERSION}"
        )
    ]
    assert "private-plant-name" not in caplog.text

    client = await hass_client()
    response = await client.get(f"/api/diagnostics/config_entry/{entry.entry_id}")
    assert response.status == HTTPStatus.OK
    body = await response.text()
    for private_value in (
        "sensitive-client",
        "sensitive-secret",
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
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": _NEWER_MINOR,
    }
    assert data["setup"]["supported_inventory_version"] == {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": STORAGE_MINOR_VERSION,
    }
    assert data["entry"]["data"]["credentials_configured"] is True
    assert "inventory" not in data


async def test_failed_setup_diagnostics_without_readable_storage(
    hass: HomeAssistant, tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    hass.config.config_dir = str(tmp_path)
    entry = MockConfigEntry(domain=DOMAIN, unique_id=SINGLETON_UNIQUE_ID, data={})
    entry.add_to_hass(hass)
    with patch.object(
        SmartPlantsManager,
        "async_load",
        side_effect=SmartPlantsStorageError("private-error-text"),
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
    assert "stored version unknown" in caplog.text

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    assert diagnostics["setup"]["stored_inventory_version"] is None
    assert "private-error-text" not in repr(diagnostics)

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
