from __future__ import annotations

import json
from importlib import metadata
from pathlib import Path

from packaging.requirements import Requirement
from packaging.utils import canonicalize_name

# Home Assistant installs integration requirements with its own package
# constraints. An exact pin on a package that core also ships (for example
# Pillow==12.2.0) cannot be installed once core moves to a newer version, and
# the integration then fails to set up. Requirements must therefore be
# packages core already provides, with a lower bound only.
MANIFEST_PATH = (
    Path(__file__).resolve().parent.parent
    / "custom_components"
    / "smart_plants"
    / "manifest.json"
)


def _manifest_requirements() -> list[Requirement]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return [Requirement(req) for req in manifest["requirements"]]


def _core_requirements() -> dict[str, Requirement]:
    core = [Requirement(req) for req in metadata.requires("homeassistant") or []]
    return {canonicalize_name(req.name): req for req in core if req.marker is None}


def test_requirements_use_lower_bounds_only() -> None:
    for req in _manifest_requirements():
        for spec in req.specifier:
            assert spec.operator == ">=", (
                f"{req} must use a lower bound (>=) so newer Home Assistant "
                "releases that ship a newer version can still load the integration"
            )


def test_requirements_are_provided_by_home_assistant_core() -> None:
    core = _core_requirements()
    for req in _manifest_requirements():
        name = canonicalize_name(req.name)
        assert name in core, f"{req.name} is not a Home Assistant core dependency"
        installed = metadata.version(req.name)
        assert req.specifier.contains(installed, prereleases=True), (
            f"{req} does not accept {installed} shipped with Home Assistant"
        )
