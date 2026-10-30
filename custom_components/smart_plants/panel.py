"""
Admin-only Lovelace panel and dashboard card script for Smart Plants.

The static bundle is served from ``custom_components/smart_plants/frontend/``
via a single process-lifetime static route (registered from
``async_setup``). The panel itself is entry-lifetime: registered from
``async_setup_entry`` and removed from ``async_unload_entry`` so the
sidebar entry disappears alongside the integration.

The frontend directory ships an empty ``smart-plants-panel.js`` in tree so
this integration boots even before the Vite build has run; CI's
artifact-layout check fails the build when the file is missing.
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
from typing import TYPE_CHECKING
from urllib.parse import quote

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http.server import StaticPathConfig
from homeassistant.exceptions import HomeAssistantError

from .const import DOMAIN

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

PANEL_URL_PATH = "smart-plants"
PANEL_TITLE = "Smart Plants"
PANEL_ICON = "mdi:sprout"
PANEL_WEBCOMPONENT = "smart-plants-panel"

_STATIC_URL_PREFIX = "/smart_plants_static"
_FRONTEND_DIR = Path(__file__).parent / "frontend"
_MANIFEST_PATH = Path(__file__).parent / "manifest.json"
_MANIFEST_VERSION = str(
    json.loads(_MANIFEST_PATH.read_text(encoding="utf-8"))["version"]
)
_BUNDLE_HASH = hashlib.sha256(
    (_FRONTEND_DIR / "smart-plants-panel.js").read_bytes()
).hexdigest()[:16]
# Identifies the bundle this process serves. It is the ``v`` query value of the
# module URL, so a panel that is still running an older bundle (the browser
# keeps a custom element definition until the page reloads) can compare its own
# URL with this value and ask the user to reload.
PANEL_BUNDLE_VERSION = f"{_MANIFEST_VERSION}-{_BUNDLE_HASH}"
_MODULE_URL = (
    f"{_STATIC_URL_PREFIX}/smart-plants-panel.js?v="
    f"{quote(PANEL_BUNDLE_VERSION, safe='')}"
)

# The dashboard card is a small loader that every frontend session loads, plus
# the card content the loader imports only once a card is on screen. The loader
# URL carries a version over both files, and the loader passes its own query on
# to the content, so browsers fetch both again after an update instead of
# running cached copies.
CARD_BUNDLE = "smart-plants-card.js"
CARD_CONTENT_BUNDLE = "smart-plants-card-full.js"
_CARD_HASH = hashlib.sha256(
    b"".join(
        (_FRONTEND_DIR / name).read_bytes()
        for name in (CARD_BUNDLE, CARD_CONTENT_BUNDLE)
    )
).hexdigest()[:16]
CARD_BUNDLE_VERSION = f"{_MANIFEST_VERSION}-{_CARD_HASH}"
CARD_MODULE_URL = (
    f"{_STATIC_URL_PREFIX}/{CARD_BUNDLE}?v={quote(CARD_BUNDLE_VERSION, safe='')}"
)

_STATIC_REGISTRATION_FLAG = f"{DOMAIN}_static_registered"
_PANEL_OWNER_KEY = f"{DOMAIN}_panel_owner"


class SmartPlantsPanelRegistrationError(HomeAssistantError):
    """The Smart Plants panel URL is already owned by another panel."""


async def async_register_static(hass: HomeAssistant) -> None:
    """
    Register the bundles' static route and the card script once per process.

    Called from ``async_setup``. HA rejects duplicate paths, so guard on a
    flag stored in ``hass.data``. The card script loads in every frontend
    session, so the card is available on any dashboard and in the card
    picker; it defines the card and changes nothing else.
    """
    if hass.data.get(_STATIC_REGISTRATION_FLAG):
        return
    if not _FRONTEND_DIR.is_dir():
        _LOGGER.warning(
            "Smart Plants frontend directory %s is missing; "
            "the panel will 404 until the Vite build runs",
            _FRONTEND_DIR,
        )
        return
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                url_path=_STATIC_URL_PREFIX,
                path=str(_FRONTEND_DIR),
                cache_headers=True,
            )
        ]
    )
    frontend.add_extra_js_url(hass, CARD_MODULE_URL)
    hass.data[_STATIC_REGISTRATION_FLAG] = True


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the sidebar panel for a loaded entry."""
    panels = hass.data.get("frontend_panels", {})
    if PANEL_URL_PATH in panels:
        if panels[PANEL_URL_PATH] is hass.data.get(_PANEL_OWNER_KEY):
            return
        raise SmartPlantsPanelRegistrationError(
            f"Panel path {PANEL_URL_PATH!r} is already registered by another owner"
        )

    try:
        await panel_custom.async_register_panel(
            hass=hass,
            webcomponent_name=PANEL_WEBCOMPONENT,
            frontend_url_path=PANEL_URL_PATH,
            module_url=_MODULE_URL,
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            require_admin=True,
            embed_iframe=False,
        )
    except BaseException:
        # If HA registered before raising, claim only that newly-created object
        # so setup rollback can remove it without touching a pre-existing panel.
        panels = hass.data.get("frontend_panels", {})
        if PANEL_URL_PATH in panels:
            hass.data[_PANEL_OWNER_KEY] = panels[PANEL_URL_PATH]
        raise

    panels = hass.data.get("frontend_panels", {})
    if PANEL_URL_PATH not in panels:
        raise SmartPlantsPanelRegistrationError(
            "Home Assistant did not publish the registered Smart Plants panel"
        )
    hass.data[_PANEL_OWNER_KEY] = panels[PANEL_URL_PATH]


def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the panel on entry unload."""
    owner = hass.data.pop(_PANEL_OWNER_KEY, None)
    panels = hass.data.get("frontend_panels", {})
    if owner is not None and panels.get(PANEL_URL_PATH) is owner:
        frontend.async_remove_panel(hass, PANEL_URL_PATH)
