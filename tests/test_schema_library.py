"""The schema library Smart Plants shares with Home Assistant core."""

from __future__ import annotations

from typing import Any

import pytest
from custom_components.smart_plants.schema_library import vol
from homeassistant.helpers import config_validation as cv

# Smart Plants' schemas wrap core's markers and validators, and core renders
# and runs them. That only works when both use the same library. CI runs these
# tests on the minimum supported Home Assistant, which uses voluptuous, and on
# the latest release, which uses probatio. The type checker always sees
# voluptuous, also where core's own types come from probatio, so core's objects
# are typed loosely here.


def test_vol_is_the_library_core_validates_with() -> None:
    core_schema: object = cv.PLATFORM_SCHEMA
    core_keys: list[object] = list(cv.TARGET_SERVICE_FIELDS)
    assert isinstance(core_schema, vol.Schema)
    assert all(isinstance(key, vol.Marker) for key in core_keys)
    with pytest.raises(vol.Invalid):
        cv.positive_time_period("soon")


def test_schema_around_core_markers_validates() -> None:
    fields: dict[Any, Any] = {
        **cv.TARGET_SERVICE_FIELDS,
        vol.Required("kind"): vol.In(["note"]),
    }
    schema = vol.Schema(fields)
    assert schema({"entity_id": "sensor.mock_moisture", "kind": "note"}) == {
        "entity_id": ["sensor.mock_moisture"],
        "kind": "note",
    }
    with pytest.raises(vol.Invalid):
        schema({"entity_id": "sensor.mock_moisture"})
