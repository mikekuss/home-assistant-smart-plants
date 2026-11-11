"""
Storage errors reach the panel as error codes it can explain.

A full inventory, a full queue of unfinished changes and a failed save each
need a different action from the user, so every write command reports them
with their own code instead of a generic internal error.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsManagerUnavailableError,
    SmartPlantsPlantNotFoundError,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import MoistureConfig, PlantRecord
from custom_components.smart_plants.storage import (
    SmartPlantsPendingOperationsFullError,
    SmartPlantsStorageError,
    SmartPlantsStorageFullError,
)
from custom_components.smart_plants.websocket_api import (
    ERR_INVALID_FORMAT,
    ERR_NOT_FOUND,
    ERR_PENDING_OPERATIONS_FULL,
    ERR_STORAGE_FAILED,
    ERR_STORAGE_FULL,
    ERR_UNKNOWN,
    _manager_error,
)
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from .test_websocket_api import _connect, _setup

_ERRORS: list[tuple[Callable[[], Exception], str]] = [
    (lambda: SmartPlantsStorageFullError("over the size limit"), ERR_STORAGE_FULL),
    (SmartPlantsPendingOperationsFullError, ERR_PENDING_OPERATIONS_FULL),
    (lambda: SmartPlantsStorageError("disk failure"), ERR_STORAGE_FAILED),
]
_ERROR_IDS = ["storage_full", "pending_operations_full", "storage_failed"]


def _moisture() -> dict[str, Any]:
    values = MoistureConfig().as_storage()
    values.pop("threshold_defaults")
    return {
        **values,
        "threshold_overrides": {"min": None, "target": 40, "max": None},
    }


def _commands(plant: PlantRecord) -> dict[str, dict[str, Any]]:
    """Every kind of write command, built for ``plant``."""
    target = {"plant_id": plant.id, "expected_revision": plant.revision}
    return {
        "create": {"type": "smart_plants/plants/create", "name": "Office Aloe"},
        "update": {"type": "smart_plants/plants/update", **target, "name": "Kitchen"},
        "disable": {"type": "smart_plants/plants/disable", **target},
        "set_area": {"type": "smart_plants/plants/set_area", **target, "area_id": None},
        "add_watering": {
            "type": "smart_plants/care/add_watering",
            **target,
            "occurred_at": "2026-09-05T08:00:00+00:00",
            "note": None,
        },
        "set_rest_period": {
            "type": "smart_plants/plants/set_rest_period",
            **target,
            "rest_period": {"start_month": 11, "end_month": 2},
        },
        "set_stale_after": {
            "type": "smart_plants/roles/set_stale_after",
            **target,
            "role": "moisture",
            "stale_after_seconds": 7200,
        },
        "moisture_configure": {
            "type": "smart_plants/moisture/configure",
            **target,
            "moisture": _moisture(),
        },
        "archive": {"type": "smart_plants/plants/archive", **target},
        "delete": {"type": "smart_plants/plants/delete", **target},
    }


_COMMAND_NAMES = list(
    _commands(PlantRecord(id="p", revision=1, name="p", created_at=""))
)


@pytest.mark.parametrize("command", _COMMAND_NAMES)
@pytest.mark.parametrize(("make_error", "code"), _ERRORS, ids=_ERROR_IDS)
async def test_write_commands_report_storage_errors(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    command: str,
    make_error: Callable[[], Exception],
    code: str,
) -> None:
    client = await _connect(hass, hass_ws_client)
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    revision = manager.snapshot.revision

    with patch.object(manager._store, "async_save", side_effect=make_error()):
        await client.send_json_auto_id(_commands(plant)[command])
        response = await client.receive_json()

    assert response["success"] is False, response
    assert response["error"]["code"] == code
    # The panel shows its own text; the reply never carries storage details.
    assert "limit" not in response["error"]["message"]
    assert "disk" not in response["error"]["message"]
    assert manager.snapshot.revision == revision


@pytest.mark.parametrize(
    ("error", "code"),
    [
        (SmartPlantsPlantNotFoundError("p"), ERR_NOT_FOUND),
        (SmartPlantsValidationError("bad"), ERR_INVALID_FORMAT),
        (SmartPlantsPendingOperationsFullError(), ERR_PENDING_OPERATIONS_FULL),
        (SmartPlantsStorageFullError("full"), ERR_STORAGE_FULL),
        (SmartPlantsStorageError("failed"), ERR_STORAGE_FAILED),
    ],
)
def test_manager_error_maps_typed_errors(error: Exception, code: str) -> None:
    mapped = _manager_error(error)
    assert mapped is not None
    assert mapped[0] == code


@pytest.mark.parametrize(
    "error", [RuntimeError("boom"), SmartPlantsManagerUnavailableError()]
)
def test_manager_error_leaves_other_errors_to_the_caller(error: Exception) -> None:
    assert _manager_error(error) is None


async def test_unexpected_error_is_still_an_internal_error(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    client = await _connect(hass, hass_ws_client)
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")

    with patch.object(
        manager, "async_update_plant", side_effect=RuntimeError("unexpected")
    ):
        await client.send_json_auto_id(_commands(plant)["update"])
        response = await client.receive_json()

    assert response["error"] == {"code": ERR_UNKNOWN, "message": "internal error"}
