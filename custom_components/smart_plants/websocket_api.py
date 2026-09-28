"""
Admin-only WebSocket API for Smart Plants.

Command and response shapes (clients depend on these; change them only
compatibly):

Commands (all admin-only):

* ``smart_plants/plants/list`` -> ``{"plants": [PlantView, ...]}``
* ``smart_plants/plants/create`` -> ``{"plant": PlantView}``
* ``smart_plants/plants/update`` -> ``{"plant": PlantView}``
* ``smart_plants/plants/disable`` -> ``{"plant": PlantView}``
* ``smart_plants/plants/reenable`` -> ``{"plant": PlantView}``
* ``smart_plants/plants/set_area`` -> ``{"plant": PlantView}``
* ``smart_plants/plants/delete`` -> ``{}``
* ``smart_plants/roles/set_sources`` -> ``{"plant": PlantView}``
* ``smart_plants/roles/set_primary`` -> ``{"plant": PlantView}``
* ``smart_plants/roles/set_aggregation`` -> ``{"plant": PlantView}``
* ``smart_plants/roles/set_stale_after`` -> ``{"plant": PlantView}``

The generic ``smart_plants/roles/*`` source commands take an additional
``role`` field and delegate to the same manager methods as the
``smart_plants/moisture/*`` commands (which remain as moisture-scoped
aliases). Error mapping, revision checks, and retained-missing source
semantics are identical across every role.

``PlantView`` is the storage shape plus a registered default config for every
source-accepting role the plant has not configured yet (``PlantRecord.as_view``).
The defaults are view-only; storage keeps only configured roles.

Error codes:

* ``integration_not_loaded`` -- the singleton entry is missing or unloaded.
* ``not_found`` -- the target ``plant_id`` does not exist.
* ``revision_conflict`` -- ``expected_revision`` did not match the current
  record.
* ``invalid_format`` -- a client-supplied field failed server validation
  (``SmartPlantsValidationError``).
* ``unknown_error`` -- an unhandled error surfaced from the manager;
  full detail is logged, only the message is returned.

``expected_revision`` is required on every mutation of an existing plant
(update, disable, reenable, delete) and is compared against
``PlantRecord.revision``. Handlers never trust client-supplied ids.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.components.websocket_api import async_register_command
from homeassistant.components.websocket_api.connection import ActiveConnection
from homeassistant.components.websocket_api.decorators import (
    async_response,
    require_admin,
    websocket_command,
)
from homeassistant.config_entries import ConfigEntryState

from .care import care_summary
from .const import DOMAIN
from .manager import (
    SmartPlantsManager,
    SmartPlantsManagerUnavailableError,
    SmartPlantsPlantNotFoundError,
    SmartPlantsRevisionConflictError,
    SmartPlantsValidationError,
)
from .models import PlantPlacement, PlantRecord, PlantSpecies
from .provider import (
    ProviderAuthenticationError,
    ProviderDisabledError,
    ProviderError,
    ProviderMalformedResponseError,
    ProviderNotFoundError,
    ProviderOutageError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    SpeciesPreview,
    SpeciesProviderService,
    validate_operation,
)
from .roles import role_definitions

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

ERR_INTEGRATION_NOT_LOADED = "integration_not_loaded"
ERR_NOT_FOUND = "not_found"
ERR_REVISION_CONFLICT = "revision_conflict"
ERR_INVALID_FORMAT = "invalid_format"
ERR_UNKNOWN = "unknown_error"
ERR_PROVIDER_DISABLED = "provider_disabled"
ERR_PROVIDER_AUTH = "provider_authentication"
ERR_PROVIDER_RATE_LIMIT = "provider_rate_limit"
ERR_PROVIDER_TIMEOUT = "provider_timeout"
ERR_PROVIDER_OUTAGE = "provider_outage"
ERR_PROVIDER_MALFORMED = "provider_malformed_response"

_UNKNOWN_ERROR_MESSAGE = "internal error"
_PLANT_ID_MAX_LEN = 200
_SHORT_TEXT_MAX_LEN = 500
_PROVIDER_KEY_MAX_LEN = 60
_WS_LIST_MAX_COUNT = 50


def _positive_int(value: Any) -> int:
    """
    Accept only strictly-positive integers.

    ``bool`` is a subclass of ``int`` in Python, so a naive ``int`` schema
    would accept ``True``/``False`` and coerce them to 1/0. Zero and
    negative revisions are never valid: ``PlantRecord.revision`` starts at
    1 and is monotonically increasing, so any non-positive
    ``expected_revision`` is a client bug that must be refused with
    ``invalid_format`` before it reaches the manager.
    """
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise vol.Invalid("must be a positive integer")
    return int(value)


def _plant_id(value: Any) -> str:
    if not isinstance(value, str):
        raise vol.Invalid("plant_id must be a string")
    stripped = value.strip()
    if not stripped:
        raise vol.Invalid("plant_id must not be empty")
    if len(stripped) > _PLANT_ID_MAX_LEN:
        raise vol.Invalid(f"plant_id must be at most {_PLANT_ID_MAX_LEN} characters")
    if stripped != value:
        raise vol.Invalid("plant_id must not contain surrounding whitespace")
    return value


# --- Voluptuous fragments -------------------------------------------------


_SPECIES_SCHEMA = vol.Schema(
    {
        vol.Required("provider"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required("snapshot"): dict,
    }
)

_PLACEMENT_SCHEMA = vol.Schema(
    {
        vol.Required("mode"): str,
        vol.Optional("exposure"): vol.Any(str, None),
        vol.Optional("rain_exposure"): vol.Any(str, None),
        vol.Optional("container"): vol.Any(bool, None),
    }
)


def _plant_view(plant: PlantRecord) -> dict[str, Any]:
    """Serialize a PlantRecord into the PlantView the panel consumes."""
    return plant.as_view()


def _current_manager(hass: HomeAssistant) -> SmartPlantsManager | None:
    """
    Resolve the currently loaded Smart Plants manager, if any.

    Handlers must call this per request rather than caching a reference:
    an unload between registration and the request must surface as
    ``integration_not_loaded``, never as a write to a stale manager.
    """
    entries = hass.config_entries.async_entries(DOMAIN)
    for entry in entries:
        if entry.state is ConfigEntryState.LOADED and entry.runtime_data is not None:
            manager: SmartPlantsManager = entry.runtime_data.manager
            if manager.available:
                return manager
    return None


def _current_provider_service(hass: HomeAssistant) -> SpeciesProviderService | None:
    entries = hass.config_entries.async_entries(DOMAIN)
    for entry in entries:
        if entry.state is ConfigEntryState.LOADED and entry.runtime_data is not None:
            service: SpeciesProviderService | None = entry.runtime_data.provider_service
            if service is not None and entry.runtime_data.manager.available:
                return service
    return None


def _reply_not_loaded(connection: ActiveConnection, msg_id: int) -> None:
    connection.send_error(
        msg_id,
        ERR_INTEGRATION_NOT_LOADED,
        "Smart Plants is not loaded",
    )


def _species_from_msg(value: Any) -> PlantSpecies | None:
    """Convert an inbound species payload, mapping ValueError to invalid_format."""
    if value is None:
        return None
    try:
        species = PlantSpecies.from_storage(value)
    except ValueError as err:
        raise SmartPlantsValidationError(str(err)) from err
    if species.snapshot.source_status == "provider":
        raise SmartPlantsValidationError(
            "provider species require preview and explicit apply"
        )
    return species


def _require_refreshable_species(plant: PlantRecord) -> tuple[PlantSpecies, str]:
    species = plant.species
    if species is None or species.snapshot.provider_ref is None:
        raise SmartPlantsValidationError("plant has no refreshable provider species")
    return species, species.snapshot.provider_ref


def _preview_view(preview: SpeciesPreview) -> dict[str, Any]:
    return {
        "preview_token": preview.token,
        "provider": preview.provider,
        "operation": preview.operation,
        "snapshot": preview.profile.snapshot.as_storage(),
        "diff": {key: dict(value) for key, value in preview.diff.items()},
    }


def _provider_error(connection: ActiveConnection, msg_id: int, err: Exception) -> None:
    if isinstance(err, ProviderDisabledError):
        code, message = ERR_PROVIDER_DISABLED, "provider is not configured"
    elif isinstance(err, ProviderAuthenticationError):
        code, message = ERR_PROVIDER_AUTH, "provider authentication failed"
    elif isinstance(err, ProviderRateLimitError):
        code, message = ERR_PROVIDER_RATE_LIMIT, "provider rate limit exceeded"
    elif isinstance(err, ProviderTimeoutError):
        code, message = ERR_PROVIDER_TIMEOUT, "provider request timed out"
    elif isinstance(err, ProviderOutageError):
        code, message = ERR_PROVIDER_OUTAGE, "provider is unavailable"
    elif isinstance(err, ProviderMalformedResponseError):
        code, message = ERR_PROVIDER_MALFORMED, "provider response was malformed"
    elif isinstance(err, ProviderNotFoundError):
        code, message = ERR_NOT_FOUND, "species not found"
    else:
        code, message = ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE
    if isinstance(err, ProviderRateLimitError) and err.retry_after is not None:
        message = f"{message}; retry_after={err.retry_after}"
    connection.send_error(msg_id, code, message)


def _placement_from_msg(value: Any) -> PlantPlacement | None:
    """Convert an inbound placement payload, mapping ValueError to invalid_format."""
    if value is None:
        return None
    try:
        return PlantPlacement.from_storage(value)
    except ValueError as err:
        raise SmartPlantsValidationError(str(err)) from err


# --- Command handlers -----------------------------------------------------


@websocket_command(
    {
        vol.Required("type"): "smart_plants/plants/list",
    }
)
@require_admin
@async_response
async def _handle_list(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    connection.send_result(
        msg["id"],
        {"plants": [_plant_view(plant) for plant in manager.list_plants()]},
    )


_CREATE_FIELDS: dict[vol.Marker | str, Any] = {
    vol.Required("name"): str,
    vol.Optional("acquired_at"): vol.Any(str, None),
    vol.Optional("species"): vol.Any(_SPECIES_SCHEMA, None),
    vol.Optional("placement"): vol.Any(_PLACEMENT_SCHEMA, None),
    vol.Optional("tags"): vol.All(
        [vol.All(str, vol.Length(min=1, max=60))], vol.Length(max=32)
    ),
    vol.Optional("category"): vol.Any(str, None),
    vol.Optional("area_id"): vol.Any(str, None),
    # ``image`` is intentionally NOT accepted here: image ids and
    # metadata are server-authored through the dedicated HTTP endpoints
    # (POST/DELETE /api/smart_plants/plants/{id}/image) so the client
    # cannot forge or reuse another plant's image record via plant CRUD.
}


@websocket_command(
    {
        vol.Required("type"): "smart_plants/plants/create",
        **_CREATE_FIELDS,
    }
)
@require_admin
@async_response
async def _handle_create(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_create_plant(
            name=msg["name"],
            acquired_at=msg.get("acquired_at"),
            species=_species_from_msg(msg.get("species")),
            placement=_placement_from_msg(msg.get("placement")),
            tags=msg.get("tags", ()),
            category=msg.get("category"),
            area_id=msg.get("area_id"),
        )
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/plants/create")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


_UPDATE_FIELDS: dict[vol.Marker | str, Any] = {
    vol.Required("plant_id"): _plant_id,
    vol.Required("expected_revision"): _positive_int,
    vol.Optional("name"): str,
    vol.Optional("acquired_at"): vol.Any(str, None),
    vol.Optional("species"): vol.Any(_SPECIES_SCHEMA, None),
    vol.Optional("placement"): vol.Any(_PLACEMENT_SCHEMA, None),
    vol.Optional("tags"): vol.All(
        [vol.All(str, vol.Length(min=1, max=60))], vol.Length(max=32)
    ),
    vol.Optional("category"): vol.Any(str, None),
    # ``area_id`` is intentionally NOT accepted here; use
    # ``smart_plants/plants/set_area`` to change or clear the device area
    # so the intent is durable and idempotent across restarts.
    # ``image`` is intentionally NOT accepted here; use the dedicated
    # image HTTP endpoints so the id/metadata stays server-authored.
}


# Sentinel object so we can distinguish "field omitted" from "field is None"
# when forwarding to the manager, which uses its own private _UNSET sentinel.
_ABSENT = object()


@websocket_command(
    {
        vol.Required("type"): "smart_plants/plants/update",
        **_UPDATE_FIELDS,
    }
)
@require_admin
@async_response
async def _handle_update(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return

    kwargs: dict[str, Any] = {"expected_revision": msg["expected_revision"]}
    for key in (
        "name",
        "acquired_at",
        "tags",
        "category",
    ):
        if key in msg:
            kwargs[key] = msg[key]
    try:
        if "species" in msg:
            kwargs["species"] = _species_from_msg(msg["species"])
        if "placement" in msg:
            kwargs["placement"] = _placement_from_msg(msg["placement"])
        plant = await manager.async_update_plant(msg["plant_id"], **kwargs)
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/plants/update")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


def _make_lifecycle_handler(
    command_type: str,
    method_name: str,
) -> Any:
    @websocket_command(
        {
            vol.Required("type"): command_type,
            vol.Required("plant_id"): _plant_id,
            vol.Required("expected_revision"): _positive_int,
        }
    )
    @require_admin
    @async_response
    async def _handler(
        hass: HomeAssistant,
        connection: ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        manager = _current_manager(hass)
        if manager is None:
            _reply_not_loaded(connection, msg["id"])
            return
        method = getattr(manager, method_name)
        try:
            plant = await method(
                msg["plant_id"], expected_revision=msg["expected_revision"]
            )
        except SmartPlantsPlantNotFoundError:
            connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
            return
        except SmartPlantsRevisionConflictError as err:
            connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
            return
        except SmartPlantsManagerUnavailableError:
            _reply_not_loaded(connection, msg["id"])
            return
        except Exception:
            _LOGGER.exception("Unhandled error in %s", command_type)
            connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
            return
        connection.send_result(msg["id"], {"plant": _plant_view(plant)})

    return _handler


_handle_disable = _make_lifecycle_handler(
    "smart_plants/plants/disable", "async_disable_plant"
)
_handle_reenable = _make_lifecycle_handler(
    "smart_plants/plants/reenable", "async_reenable_plant"
)


@websocket_command(
    {
        vol.Required("type"): "smart_plants/care/list",
        vol.Required("plant_id"): _plant_id,
    }
)
@require_admin
@async_response
async def _handle_care_list(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        result = manager.care_history(msg["plant_id"])
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    connection.send_result(msg["id"], result)


@websocket_command(
    {
        vol.Required("type"): "smart_plants/care/add_watering",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("occurred_at"): vol.All(str, vol.Length(min=20, max=64)),
        vol.Required("note"): vol.Any(vol.All(str, vol.Length(min=1, max=500)), None),
    }
)
@require_admin
@async_response
async def _handle_care_add_watering(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant, event = await manager.async_add_watering(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            occurred_at=msg["occurred_at"],
            note=msg["note"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/care/add_watering")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
    else:
        connection.send_result(
            msg["id"],
            {
                "plant": _plant_view(plant),
                "event": event.as_storage(),
                "summary": care_summary(plant.care_events),
            },
        )


@websocket_command(
    {
        vol.Required("type"): "smart_plants/care/add",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("kind"): vol.In(
            ("watering", "fertilizing", "pruning", "repotting", "note")
        ),
        vol.Required("occurred_at"): vol.All(str, vol.Length(min=20, max=64)),
        vol.Required("payload"): dict,
    }
)
@require_admin
@async_response
async def _handle_care_add(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant, event = await manager.async_add_care_event(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            kind=msg["kind"],
            occurred_at=msg["occurred_at"],
            payload=msg["payload"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/care/add")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
    else:
        connection.send_result(
            msg["id"],
            {
                "plant": _plant_view(plant),
                "event": event.as_storage(),
                "summary": care_summary(plant.care_events),
            },
        )


@websocket_command(
    {
        vol.Required("type"): "smart_plants/care/edit",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("event_id"): vol.All(str, vol.Length(min=36, max=36)),
        vol.Required("kind"): vol.In(
            ("watering", "fertilizing", "pruning", "repotting", "note")
        ),
        vol.Required("occurred_at"): vol.All(str, vol.Length(min=20, max=64)),
        vol.Required("payload"): dict,
    }
)
@require_admin
@async_response
async def _handle_care_edit(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant, event = await manager.async_edit_care_event(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            event_id=msg["event_id"],
            kind=msg["kind"],
            occurred_at=msg["occurred_at"],
            payload=msg["payload"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/care/edit")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
    else:
        connection.send_result(
            msg["id"],
            {
                "plant": _plant_view(plant),
                "event": event.as_storage(),
                "summary": care_summary(plant.care_events),
            },
        )


@websocket_command(
    {
        vol.Required("type"): "smart_plants/care/delete",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("event_id"): vol.All(str, vol.Length(min=36, max=36)),
    }
)
@require_admin
@async_response
async def _handle_care_delete(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_delete_care_event(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            event_id=msg["event_id"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/care/delete")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
    else:
        connection.send_result(
            msg["id"],
            {"plant": _plant_view(plant), "summary": care_summary(plant.care_events)},
        )


@websocket_command(
    {
        vol.Required("type"): "smart_plants/plants/set_area",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        # ``area_id`` may be a non-empty string (set the area) or null
        # (clear the area). The manager rejects the empty string.
        vol.Required("area_id"): vol.Any(str, None),
    }
)
@require_admin
@async_response
async def _handle_set_area(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_set_plant_area(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            area_id=msg["area_id"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/plants/set_area")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


_MOISTURE_SOURCE_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): str,
        vol.Optional("registry_id"): vol.Any(str, None),
    }
)


@websocket_command(
    {
        vol.Required("type"): "smart_plants/moisture/set_sources",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("sources"): vol.All([_MOISTURE_SOURCE_SCHEMA], vol.Length(max=32)),
    }
)
@require_admin
@async_response
async def _handle_moisture_set_sources(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_set_moisture_sources(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            sources=msg["sources"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/moisture/set_sources")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


@websocket_command(
    {
        vol.Required("type"): "smart_plants/moisture/set_primary",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("primary_entity_id"): vol.Any(str, None),
    }
)
@require_admin
@async_response
async def _handle_moisture_set_primary(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_set_moisture_primary(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            primary_entity_id=msg["primary_entity_id"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/moisture/set_primary")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


@websocket_command(
    {
        vol.Required("type"): "smart_plants/moisture/set_aggregation",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("aggregation"): vol.In(("primary", "average", "min", "max")),
    }
)
@require_admin
@async_response
async def _handle_moisture_set_aggregation(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_set_moisture_aggregation(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            aggregation=msg["aggregation"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/moisture/set_aggregation")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


@websocket_command(
    {
        vol.Required("type"): "smart_plants/moisture/set_stale_after",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("stale_after_seconds"): _positive_int,
    }
)
@require_admin
@async_response
async def _handle_moisture_set_stale_after(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_set_stale_after(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            stale_after_seconds=msg["stale_after_seconds"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/moisture/set_stale_after")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


@websocket_command(
    {
        vol.Required("type"): "smart_plants/moisture/set_thresholds",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("moisture_min"): vol.Any(_positive_int, None),
        vol.Required("moisture_target"): vol.Any(_positive_int, None),
        vol.Required("moisture_max"): vol.Any(_positive_int, None),
    }
)
@require_admin
@async_response
async def _handle_moisture_set_thresholds(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_set_moisture_thresholds(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            moisture_min=msg["moisture_min"],
            moisture_target=msg["moisture_target"],
            moisture_max=msg["moisture_max"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/moisture/set_thresholds")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


@websocket_command(
    {
        vol.Required("type"): "smart_plants/roles/list",
    }
)
@require_admin
@async_response
async def _handle_roles_list(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    if _current_manager(hass) is None:
        _reply_not_loaded(connection, msg["id"])
        return
    connection.send_result(
        msg["id"],
        {
            "roles": [
                {
                    "role": definition.key,
                    "source_domain": definition.source_domain,
                    "aggregations": sorted(definition.aggregations),
                    "thresholds": [
                        {
                            "key": threshold.key,
                            "entity_role": threshold.entity_role,
                            "translation_key": threshold.translation_key,
                        }
                        for threshold in definition.thresholds
                    ],
                    "entities": [
                        {
                            "role": entity.role,
                            "platform": entity.platform,
                            "translation_key": entity.translation_key,
                        }
                        for entity in definition.entities
                    ],
                }
                for definition in role_definitions()
            ]
        },
    )


@websocket_command(
    {
        vol.Required("type"): "smart_plants/roles/set_threshold_overrides",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("role"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required("values"): vol.All(dict, vol.Length(max=32)),
    }
)
@require_admin
@async_response
async def _handle_role_set_threshold_overrides(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_set_role_threshold_overrides(
            msg["plant_id"],
            role=msg["role"],
            expected_revision=msg["expected_revision"],
            values=msg["values"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception(
            "Unhandled error in smart_plants/roles/set_threshold_overrides"
        )
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


@websocket_command(
    {
        vol.Required("type"): "smart_plants/roles/set_sources",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("role"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required("sources"): vol.All([_MOISTURE_SOURCE_SCHEMA], vol.Length(max=32)),
    }
)
@require_admin
@async_response
async def _handle_role_set_sources(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_set_role_sources(
            msg["plant_id"],
            role=msg["role"],
            expected_revision=msg["expected_revision"],
            sources=msg["sources"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/roles/set_sources")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


@websocket_command(
    {
        vol.Required("type"): "smart_plants/roles/set_primary",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("role"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required("primary_entity_id"): vol.Any(str, None),
    }
)
@require_admin
@async_response
async def _handle_role_set_primary(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_set_role_primary(
            msg["plant_id"],
            role=msg["role"],
            expected_revision=msg["expected_revision"],
            primary_entity_id=msg["primary_entity_id"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/roles/set_primary")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


@websocket_command(
    {
        vol.Required("type"): "smart_plants/roles/set_aggregation",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("role"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required("aggregation"): vol.In(("primary", "average", "min", "max")),
    }
)
@require_admin
@async_response
async def _handle_role_set_aggregation(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_set_role_aggregation(
            msg["plant_id"],
            role=msg["role"],
            expected_revision=msg["expected_revision"],
            aggregation=msg["aggregation"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/roles/set_aggregation")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


@websocket_command(
    {
        vol.Required("type"): "smart_plants/roles/set_stale_after",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("role"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required("stale_after_seconds"): _positive_int,
    }
)
@require_admin
@async_response
async def _handle_role_set_stale_after(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await manager.async_set_role_stale_after(
            msg["plant_id"],
            role=msg["role"],
            expected_revision=msg["expected_revision"],
            stale_after_seconds=msg["stale_after_seconds"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/roles/set_stale_after")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


@websocket_command(
    {
        vol.Required("type"): "smart_plants/moisture/evaluation",
        vol.Required("plant_id"): _plant_id,
    }
)
@require_admin
@async_response
async def _handle_moisture_evaluation(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    controller = manager.get_moisture_controller(msg["plant_id"])
    if controller is None:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    result = controller.current_evaluation
    connection.send_result(
        msg["id"],
        {
            "evaluation": {
                "computed_percent": result.computed_percent,
                "health_score": result.health_score,
                "needs_water": result.needs_water,
                "too_wet": result.too_wet,
                "sensor_stale": result.sensor_stale,
                "computed_available": result.computed_available,
                "reasons": list(result.reasons),
            }
        },
    )


@websocket_command(
    {
        vol.Required("type"): "smart_plants/plants/health",
        vol.Required("plant_id"): _plant_id,
    }
)
@require_admin
@async_response
async def _handle_plant_health(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    from .health_evaluator import (  # noqa: PLC0415
        CONTRIBUTOR_ORDER,
        HealthInputs,
        evaluate,
    )

    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = manager.get_plant(msg["plant_id"])
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    snapshots: dict[str, Any] = {}
    for role_key in CONTRIBUTOR_ORDER:
        controller = manager.get_role_controller(plant.id, role_key)
        snapshots[role_key] = (
            controller.current_evaluation if controller is not None else None
        )
    result = evaluate(
        HealthInputs(
            plant=plant,
            moisture=snapshots["moisture"],
            temperature=snapshots["temperature"],
            humidity=snapshots["humidity"],
            illuminance=snapshots["illuminance"],
            conductivity=snapshots["conductivity"],
            soil_temperature=snapshots["soil_temperature"],
            co2=snapshots["co2"],
        )
    )
    connection.send_result(
        msg["id"],
        {
            "evaluation": {
                "health_score": result.health_score,
                "available": result.available,
                "confidence": result.confidence,
                "confidence_label": result.confidence_label,
                "contributors": list(result.contributors),
                "configured": list(result.configured),
                "reasons": list(result.reasons),
            }
        },
    )


@websocket_command(
    {
        vol.Required("type"): "smart_plants/plants/delete",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
    }
)
@require_admin
@async_response
async def _handle_delete(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    if manager is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        await manager.async_delete_plant(
            msg["plant_id"], expected_revision=msg["expected_revision"]
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/plants/delete")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {})


@websocket_command(
    {
        vol.Required("type"): "smart_plants/species/search",
        vol.Required("provider"): vol.All(
            str, vol.Length(min=1, max=_PROVIDER_KEY_MAX_LEN)
        ),
        vol.Required("query"): vol.All(str, vol.Length(min=3, max=100)),
        vol.Required("locale"): vol.All(str, vol.Length(min=2, max=5)),
        vol.Optional("limit", default=20): int,
    }
)
@require_admin
@async_response
async def _handle_species_search(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    service = _current_provider_service(hass)
    if service is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        results = await service.async_search(
            msg["provider"], msg["query"], msg["locale"], msg["limit"]
        )
    except ValueError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except (
        ProviderDisabledError,
        ProviderAuthenticationError,
        ProviderRateLimitError,
        ProviderTimeoutError,
        ProviderOutageError,
        ProviderMalformedResponseError,
        ProviderNotFoundError,
    ) as err:
        _provider_error(connection, msg["id"], err)
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/species/search")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(
        msg["id"],
        {
            "results": [
                {
                    "provider": result.provider,
                    "provider_ref": result.provider_ref,
                    "common_name": result.common_name,
                    "latin_name": result.latin_name,
                    "category": result.category,
                    "attribution": result.attribution,
                }
                for result in results
            ]
        },
    )


@websocket_command(
    {
        vol.Required("type"): "smart_plants/species/preview",
        vol.Required("provider"): vol.All(
            str, vol.Length(min=1, max=_PROVIDER_KEY_MAX_LEN)
        ),
        vol.Required("provider_ref"): vol.All(str, vol.Length(min=1, max=100)),
        vol.Required("locale"): vol.All(str, vol.Length(min=2, max=5)),
        vol.Required("plant_id"): _plant_id,
    }
)
@require_admin
@async_response
async def _handle_species_preview(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    service = _current_provider_service(hass)
    if service is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        preview = await service.async_preview(
            msg["provider"],
            msg["provider_ref"],
            msg["locale"],
            plant_id=msg["plant_id"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except ValueError as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except (
        ProviderDisabledError,
        ProviderAuthenticationError,
        ProviderRateLimitError,
        ProviderTimeoutError,
        ProviderOutageError,
        ProviderMalformedResponseError,
        ProviderNotFoundError,
    ) as err:
        _provider_error(connection, msg["id"], err)
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/species/preview")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], _preview_view(preview))


@websocket_command(
    {
        vol.Required("type"): "smart_plants/species/refresh_preview",
        vol.Required("plant_id"): _plant_id,
        vol.Required("locale"): vol.All(str, vol.Length(min=2, max=5)),
    }
)
@require_admin
@async_response
async def _handle_species_refresh_preview(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    manager = _current_manager(hass)
    service = _current_provider_service(hass)
    if manager is None or service is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        species, provider_ref = _require_refreshable_species(
            manager.get_plant(msg["plant_id"])
        )
        preview = await service.async_preview(
            species.provider,
            provider_ref,
            msg["locale"],
            plant_id=msg["plant_id"],
            force_refresh=True,
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except (SmartPlantsValidationError, ValueError) as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except (
        ProviderDisabledError,
        ProviderAuthenticationError,
        ProviderRateLimitError,
        ProviderTimeoutError,
        ProviderOutageError,
        ProviderMalformedResponseError,
        ProviderNotFoundError,
    ) as err:
        _provider_error(connection, msg["id"], err)
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/species/refresh_preview")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], _preview_view(preview))


@websocket_command(
    {
        vol.Required("type"): "smart_plants/species/apply",
        vol.Required("plant_id"): _plant_id,
        vol.Required("expected_revision"): _positive_int,
        vol.Required("preview_token"): vol.All(str, vol.Length(min=32, max=128)),
        vol.Required("provider"): vol.All(
            str, vol.Length(min=1, max=_PROVIDER_KEY_MAX_LEN)
        ),
        vol.Required("operation"): validate_operation,
        vol.Required("confirmed"): bool,
    }
)
@require_admin
@async_response
async def _handle_species_apply(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    service = _current_provider_service(hass)
    if service is None:
        _reply_not_loaded(connection, msg["id"])
        return
    try:
        plant = await service.async_apply(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            preview_token=msg["preview_token"],
            provider=msg["provider"],
            operation=msg["operation"],
            confirmed=msg["confirmed"],
        )
    except SmartPlantsPlantNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        return
    except SmartPlantsRevisionConflictError as err:
        connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        return
    except (SmartPlantsValidationError, ValueError) as err:
        connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        return
    except SmartPlantsManagerUnavailableError:
        _reply_not_loaded(connection, msg["id"])
        return
    except Exception:
        _LOGGER.exception("Unhandled error in smart_plants/species/apply")
        connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        return
    connection.send_result(msg["id"], {"plant": _plant_view(plant)})


_REGISTRATION_FLAG = f"{DOMAIN}_websocket_registered"


def _zero_revision(value: Any) -> int:
    if type(value) is not int or value != 0:
        raise vol.Invalid("draft expected_revision must be zero")
    return 0


_DRAFT_FIELDS: dict[vol.Marker | str, Any] = {
    vol.Required("draft_id"): vol.All(str, vol.Length(min=36, max=36)),
    vol.Required("draft_token"): vol.All(str, vol.Length(min=43, max=43)),
    vol.Required("expected_revision"): _zero_revision,
}
_MOISTURE_CONFIG_SCHEMA = vol.Schema(
    {
        vol.Required("sources"): vol.All([_MOISTURE_SOURCE_SCHEMA], vol.Length(max=32)),
        vol.Required("primary_entity_id"): vol.Any(_plant_id, None),
        vol.Required("aggregation"): vol.In(("primary", "average", "min", "max")),
        vol.Required("stale_after_seconds"): _positive_int,
        vol.Required("threshold_overrides"): {
            vol.Required("min"): vol.Any(_positive_int, None),
            vol.Required("target"): vol.Any(_positive_int, None),
            vol.Required("max"): vol.Any(_positive_int, None),
        },
    }
)
_ACCEPTED_PREVIEW_SCHEMA = vol.Schema(
    {
        vol.Required("preview_token"): vol.All(str, vol.Length(min=32, max=128)),
        vol.Required("provider"): vol.All(str, vol.Length(min=1, max=60)),
        vol.Required("operation"): "select",
    }
)


async def _execute_panel_command(
    hass: HomeAssistant, msg: dict[str, Any]
) -> dict[str, Any]:
    manager = _current_manager(hass)
    if manager is None:
        raise SmartPlantsManagerUnavailableError
    command = msg["type"]
    if command == "smart_plants/wizard/start":
        return manager.wizard_start()
    if command == "smart_plants/moisture/configure":
        plant = await manager.async_configure_moisture(
            msg["plant_id"],
            expected_revision=msg["expected_revision"],
            moisture=msg["moisture"],
        )
        return {"plant": _plant_view(plant)}
    service = _current_provider_service(hass)
    if service is None:
        raise SmartPlantsManagerUnavailableError
    if command == "smart_plants/panel/info":
        return service.panel_info()
    if command == "smart_plants/wizard/preview":
        preview = await service.async_wizard_preview(
            msg["draft_id"],
            msg["draft_token"],
            expected_revision=msg["expected_revision"],
            provider=msg["provider"],
            provider_ref=msg["provider_ref"],
            locale=msg["locale"],
        )
        if not manager.available:
            raise SmartPlantsManagerUnavailableError
        return {**_preview_view(preview), "draft_id": msg["draft_id"], "revision": 0}
    fields = {
        key: msg[key]
        for key in ("name", "acquired_at", "tags", "category", "area_id")
        if key in msg
    }
    fields["species"] = _species_from_msg(msg.get("species"))
    fields["placement"] = _placement_from_msg(msg.get("placement"))
    plant = await service.async_wizard_create(
        msg["draft_id"],
        msg["draft_token"],
        expected_revision=msg["expected_revision"],
        confirmed=msg["confirmed"],
        moisture=msg["moisture"],
        accepted_preview=msg.get("accepted_preview"),
        **fields,
    )
    return {"plant": _plant_view(plant)}


def _panel_handler(command: str, fields: dict[vol.Marker | str, Any]) -> Any:
    @websocket_command({vol.Required("type"): command, **fields})
    @require_admin
    @async_response
    async def handler(
        hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
    ) -> None:
        try:
            result = await _execute_panel_command(hass, msg)
        except SmartPlantsManagerUnavailableError:
            _reply_not_loaded(connection, msg["id"])
        except SmartPlantsPlantNotFoundError:
            connection.send_error(msg["id"], ERR_NOT_FOUND, "plant not found")
        except SmartPlantsRevisionConflictError as err:
            connection.send_error(msg["id"], ERR_REVISION_CONFLICT, str(err))
        except ValueError as err:
            connection.send_error(msg["id"], ERR_INVALID_FORMAT, str(err))
        except ProviderError as err:
            if _current_manager(hass) is None:
                _reply_not_loaded(connection, msg["id"])
            else:
                _provider_error(connection, msg["id"], err)
        except Exception:  # noqa: BLE001
            # Do not log request fields, capabilities, or provider exception bodies.
            _LOGGER.error("Unhandled error in %s", command)  # noqa: TRY400
            connection.send_error(msg["id"], ERR_UNKNOWN, _UNKNOWN_ERROR_MESSAGE)
        else:
            connection.send_result(msg["id"], result)

    return handler


_PANEL_HANDLERS = (
    _panel_handler("smart_plants/panel/info", {}),
    _panel_handler("smart_plants/wizard/start", {}),
    _panel_handler(
        "smart_plants/wizard/preview",
        {
            **_DRAFT_FIELDS,
            vol.Required("provider"): vol.All(str, vol.Length(min=1, max=60)),
            vol.Required("provider_ref"): vol.All(str, vol.Length(min=1, max=100)),
            vol.Required("locale"): vol.All(str, vol.Length(min=2, max=5)),
        },
    ),
    _panel_handler(
        "smart_plants/wizard/create",
        {
            **_CREATE_FIELDS,
            **_DRAFT_FIELDS,
            vol.Required("name"): vol.All(str, vol.Length(min=1, max=200)),
            vol.Required("confirmed"): bool,
            vol.Required("moisture"): _MOISTURE_CONFIG_SCHEMA,
            vol.Optional("accepted_preview"): _ACCEPTED_PREVIEW_SCHEMA,
        },
    ),
    _panel_handler(
        "smart_plants/moisture/configure",
        {
            vol.Required("plant_id"): _plant_id,
            vol.Required("expected_revision"): _positive_int,
            vol.Required("moisture"): _MOISTURE_CONFIG_SCHEMA,
        },
    ),
)


def async_register(hass: HomeAssistant) -> None:
    """
    Register every Smart Plants WebSocket command exactly once per process.

    Called from ``async_setup``. Safe to call again after an entry unload;
    the flag on ``hass.data`` keeps HA's registry idempotent.
    """
    if hass.data.get(_REGISTRATION_FLAG):
        return
    async_register_command(hass, _handle_list)
    async_register_command(hass, _handle_care_list)
    async_register_command(hass, _handle_care_add_watering)
    async_register_command(hass, _handle_care_add)
    async_register_command(hass, _handle_care_edit)
    async_register_command(hass, _handle_care_delete)
    async_register_command(hass, _handle_create)
    async_register_command(hass, _handle_update)
    async_register_command(hass, _handle_disable)
    async_register_command(hass, _handle_reenable)
    async_register_command(hass, _handle_set_area)
    async_register_command(hass, _handle_delete)
    async_register_command(hass, _handle_moisture_set_sources)
    async_register_command(hass, _handle_moisture_set_primary)
    async_register_command(hass, _handle_moisture_set_aggregation)
    async_register_command(hass, _handle_moisture_set_stale_after)
    async_register_command(hass, _handle_moisture_set_thresholds)
    async_register_command(hass, _handle_moisture_evaluation)
    async_register_command(hass, _handle_plant_health)
    async_register_command(hass, _handle_roles_list)
    async_register_command(hass, _handle_role_set_sources)
    async_register_command(hass, _handle_role_set_primary)
    async_register_command(hass, _handle_role_set_aggregation)
    async_register_command(hass, _handle_role_set_stale_after)
    async_register_command(hass, _handle_role_set_threshold_overrides)
    async_register_command(hass, _handle_species_search)
    async_register_command(hass, _handle_species_preview)
    async_register_command(hass, _handle_species_refresh_preview)
    async_register_command(hass, _handle_species_apply)
    for handler in _PANEL_HANDLERS:
        async_register_command(hass, handler)
    hass.data[_REGISTRATION_FLAG] = True
