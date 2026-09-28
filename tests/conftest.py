from __future__ import annotations

import pytest
from _pytest.fixtures import FixtureLookupError


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(request: pytest.FixtureRequest) -> None:
    try:
        request.getfixturevalue("enable_custom_integrations")
    except FixtureLookupError:
        return


@pytest.fixture
def hass_config_dir(hass_tmp_config_dir: str) -> str:
    """
    Give every test an isolated HA config directory.

    Image uploads write real files under ``<config>/smart_plants/images/``.
    pytest-homeassistant-custom-component defaults to a shared
    ``testing_config/`` inside its own package, which would let one
    test's WebP files leak into the next test's reconciler. Rebind
    to the per-test ``tmp_path`` fixture instead.
    """
    return hass_tmp_config_dir
