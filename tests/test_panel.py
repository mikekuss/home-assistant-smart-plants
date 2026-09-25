from __future__ import annotations

import hashlib
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from custom_components.smart_plants import panel as panel_module
from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.panel import (
    PANEL_URL_PATH,
    SmartPlantsPanelRegistrationError,
    async_register_panel,
    async_register_static,
    async_unregister_panel,
)
from homeassistant.components.frontend import Panel
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry


def _panels(hass: HomeAssistant) -> dict[str, Panel]:
    panels: dict[str, Panel] = hass.data.get("frontend_panels", {})
    return panels


async def _setup_entry(hass: HomeAssistant) -> MockConfigEntry:
    assert await async_setup_component(hass, DOMAIN, {})
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_panel_registered_on_load_and_removed_on_unload(
    hass: HomeAssistant,
) -> None:
    entry = await _setup_entry(hass)
    assert PANEL_URL_PATH in _panels(hass)

    panel = _panels(hass)[PANEL_URL_PATH]
    assert getattr(panel, "require_admin", False) is True
    assert panel.config is not None
    manifest_path = Path(panel_module.__file__).parent / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    bundle_hash = hashlib.sha256(
        (manifest_path.parent / "frontend" / "smart-plants-panel.js").read_bytes()
    ).hexdigest()[:16]
    assert panel.config["_panel_custom"]["module_url"].endswith(
        f"/smart-plants-panel.js?v={manifest['version']}-{bundle_hash}"
    )

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert PANEL_URL_PATH not in _panels(hass)


async def test_panel_reregistration_idempotent(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    # Manually invoke the panel registration a second time; must be a no-op
    # rather than raise ValueError from the frontend registry.
    await async_register_panel(hass)
    assert PANEL_URL_PATH in _panels(hass)

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def test_static_route_survives_entry_unload(hass: HomeAssistant) -> None:
    entry = await _setup_entry(hass)
    assert hass.data.get(f"{DOMAIN}_static_registered") is True
    assert hass.data.get(f"{DOMAIN}_websocket_registered") is True

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    # Process-lifetime registrations survive entry unload.
    assert hass.data.get(f"{DOMAIN}_static_registered") is True
    assert hass.data.get(f"{DOMAIN}_websocket_registered") is True


async def test_static_route_uses_production_cache_headers(
    hass: HomeAssistant,
) -> None:
    assert await async_setup_component(hass, "http", {})
    assert hass.http is not None
    register = AsyncMock()
    with patch.object(hass.http, "async_register_static_paths", register):
        await async_register_static(hass)

    assert register.await_args is not None
    paths = register.await_args.args[0]
    assert len(paths) == 1
    assert paths[0].cache_headers is True


async def test_unrelated_panel_path_fails_and_is_never_removed(
    hass: HomeAssistant,
) -> None:
    unrelated = object()
    hass.data.setdefault("frontend_panels", {})[PANEL_URL_PATH] = unrelated

    with pytest.raises(SmartPlantsPanelRegistrationError, match="another owner"):
        await async_register_panel(hass)

    async_unregister_panel(hass)
    assert _panels(hass)[PANEL_URL_PATH] is unrelated
