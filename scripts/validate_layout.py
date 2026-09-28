"""
Static validation of the packaged custom_components/smart_plants layout.

Runs in CI before hassfest/HACS so contributors get a fast, human-readable
error if a required file is missing, mistyped, or drifts out of sync with
``strings.json``. Expands over time as new artefacts (frontend bundle,
static assets) are introduced.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
COMPONENT_ROOT = REPO_ROOT / "custom_components" / "smart_plants"

REQUIRED_FILES = [
    "__init__.py",
    "manifest.json",
    "config_flow.py",
    "const.py",
    "manager.py",
    "models.py",
    "roles.py",
    "storage.py",
    "provider.py",
    "providers/__init__.py",
    "providers/openplantbook.py",
    "diagnostics.py",
    "strings.json",
    "translations/en.json",
    # Frontend surface. The panel and WS API modules must ship
    # in-tree, and the shipped bundle (produced by frontend/) must exist
    # so a HACS install can serve the panel without a Node toolchain.
    "panel.py",
    "websocket_api.py",
    "frontend/smart-plants-panel.js",
    # The bundle includes BSD-3-Clause Lit, whose license text must ship with it.
    "frontend/THIRD_PARTY_LICENSES.txt",
    # Entity lifecycle: shared base + three forwarded platforms. Setup
    # forwards all three platforms, so a HACS install missing any of these
    # files would fail entry setup.
    "entity.py",
    "events.py",
    "sensor.py",
    "binary_sensor.py",
    "number.py",
    # Moisture role: evaluator, controller, source tracker and repair
    # monitor. All of them are required so a HACS install starts up with
    # every moisture-role dependency in place.
    "moisture_evaluator.py",
    "moisture_controller.py",
    "source_tracker.py",
    "repairs.py",
]

REQUIRED_MANIFEST_KEYS = {
    "domain",
    "name",
    "codeowners",
    "config_flow",
    "documentation",
    "integration_type",
    "iot_class",
    "issue_tracker",
    "version",
}

FORBIDDEN_MANIFEST_KEYS = {"homeassistant"}


def _fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def _check_required_files(errors: list[str]) -> None:
    for relative in REQUIRED_FILES:
        if not (COMPONENT_ROOT / relative).is_file():
            _fail(
                f"missing required file: custom_components/smart_plants/{relative}",
                errors,
            )


def _check_manifest(errors: list[str]) -> dict[str, object] | None:
    manifest_path = COMPONENT_ROOT / "manifest.json"
    if not manifest_path.is_file():
        return None
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        _fail(f"manifest.json is not valid JSON: {err}", errors)
        return None
    if not isinstance(manifest, dict):
        _fail("manifest.json root must be an object", errors)
        return None

    missing = REQUIRED_MANIFEST_KEYS - manifest.keys()
    if missing:
        _fail(f"manifest.json missing keys: {sorted(missing)}", errors)

    forbidden = FORBIDDEN_MANIFEST_KEYS & manifest.keys()
    if forbidden:
        _fail(
            f"manifest.json contains unsupported keys: {sorted(forbidden)}",
            errors,
        )

    if manifest.get("domain") != "smart_plants":
        _fail("manifest.json domain must equal 'smart_plants'", errors)

    codeowners = manifest.get("codeowners")
    if not (isinstance(codeowners, list) and codeowners):
        _fail("manifest.json codeowners must be a non-empty list", errors)

    for url_field in ("documentation", "issue_tracker"):
        value = manifest.get(url_field)
        if not (isinstance(value, str) and value.startswith("https://github.com/")):
            _fail(f"manifest.json {url_field} must be a real GitHub URL", errors)

    return manifest


def _check_translations_match_strings(errors: list[str]) -> None:
    strings_path = COMPONENT_ROOT / "strings.json"
    en_path = COMPONENT_ROOT / "translations" / "en.json"
    if not (strings_path.is_file() and en_path.is_file()):
        return
    try:
        strings = json.loads(strings_path.read_text(encoding="utf-8"))
        en = json.loads(en_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        _fail(f"translation file is not valid JSON: {err}", errors)
        return
    if _shape(strings) != _shape(en):
        _fail(
            "strings.json and translations/en.json have diverged; "
            "regenerate the English translation from strings.json",
            errors,
        )


def _shape(value: object) -> object:
    if isinstance(value, dict):
        return {key: _shape(item) for key, item in sorted(value.items())}
    if isinstance(value, list):
        return [_shape(item) for item in value]
    return type(value).__name__


def _check_brand_icons(errors: list[str]) -> None:
    for name in ("icon.png", "icon@2x.png"):
        path = COMPONENT_ROOT / "brand" / name
        if not path.is_file():
            _fail(
                f"missing brand icon: custom_components/smart_plants/brand/{name}",
                errors,
            )


def _check_frontend_artifact(errors: list[str]) -> None:
    bundle_path = COMPONENT_ROOT / "frontend" / "smart-plants-panel.js"
    if not bundle_path.is_file():
        return
    bundle = bundle_path.read_text(encoding="utf-8")
    if re.search(r"""(?:^|[;}]\s*)import\s*(?:[({'"]|[\w*])""", bundle, re.MULTILINE):
        _fail("frontend bundle contains an unresolved import", errors)
    if "customElements.define" not in bundle or "smart-plants-panel" not in bundle:
        _fail(
            "frontend bundle does not register the smart-plants-panel custom element",
            errors,
        )


def main() -> int:
    if not COMPONENT_ROOT.is_dir():
        print(f"missing package directory: {COMPONENT_ROOT}", file=sys.stderr)
        return 1

    errors: list[str] = []
    _check_required_files(errors)
    _check_manifest(errors)
    _check_translations_match_strings(errors)
    _check_brand_icons(errors)
    _check_frontend_artifact(errors)

    if errors:
        print("Smart Plants layout validation failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("Smart Plants layout validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
