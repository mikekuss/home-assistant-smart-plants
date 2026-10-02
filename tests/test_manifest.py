from __future__ import annotations

import json
from importlib import metadata
from pathlib import Path

from packaging.requirements import Requirement
from packaging.utils import canonicalize_name

# Home Assistant installs integration requirements with its own package
# constraints, and hassfest rejects a custom integration that lists a package
# Home Assistant core already depends on. Packages the integration imports
# from core's own dependency set (such as Pillow) must therefore stay out of
# the manifest; core guarantees they are installed.
MANIFEST_PATH = (
    Path(__file__).resolve().parent.parent
    / "custom_components"
    / "smart_plants"
    / "manifest.json"
)

# Third-party packages the integration imports at runtime without listing
# them in the manifest, because Home Assistant core ships them.
CORE_PROVIDED_PACKAGES = ("Pillow",)


def _manifest_requirements() -> list[Requirement]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return [Requirement(req) for req in manifest["requirements"]]


def _core_requirements() -> dict[str, Requirement]:
    core = [Requirement(req) for req in metadata.requires("homeassistant") or []]
    return {canonicalize_name(req.name): req for req in core if req.marker is None}


def test_requirements_do_not_repeat_home_assistant_core_dependencies() -> None:
    core = _core_requirements()
    for req in _manifest_requirements():
        assert canonicalize_name(req.name) not in core, (
            f"{req.name} is a dependency of Home Assistant itself and must not be "
            "listed in the manifest of a custom integration"
        )


def test_requirements_use_lower_bounds_only() -> None:
    for req in _manifest_requirements():
        for spec in req.specifier:
            assert spec.operator == ">=", (
                f"{req} must use a lower bound (>=) so newer Home Assistant "
                "releases that ship a newer version can still load the integration"
            )


def test_unlisted_runtime_packages_are_provided_by_home_assistant_core() -> None:
    core = _core_requirements()
    for name in CORE_PROVIDED_PACKAGES:
        assert canonicalize_name(name) in core, (
            f"{name} is no longer a Home Assistant core dependency; "
            "add it to the manifest requirements"
        )
