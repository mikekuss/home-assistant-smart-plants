"""
Admin-only HTTP endpoints for the Smart Plants image lifecycle.

Three routes, all under ``/api/smart_plants/plants/{plant_id}/image``:

* ``GET``    → returns the plant's current WebP bytes.
* ``POST``   → validates the upload, re-encodes to WebP, and attaches
  it to the plant. ``expected_revision`` is required as a query param.
* ``DELETE`` → detaches and removes the image file. ``expected_revision``
  is required as a query param.

Every handler is admin-gated (``request['hass_user'].is_admin``) and
resolves the loaded manager per request via the singleton entry lookup,
returning ``integration_not_loaded`` while unloaded — matching the
WebSocket API's error codes.
"""

from __future__ import annotations

import logging
import re
from http import HTTPStatus
from typing import TYPE_CHECKING, Any

from aiohttp import web
from homeassistant.config_entries import ConfigEntryState
from homeassistant.helpers.http import HomeAssistantView

from .const import DOMAIN, IMAGE_MAX_UPLOAD_BYTES, IMAGE_OUTPUT_CONTENT_TYPE
from .images import (
    ImageNotFoundError,
    ImageValidationError,
    get_images_dir,
    read_image_file,
)
from .manager import (
    SmartPlantsManager,
    SmartPlantsManagerUnavailableError,
    SmartPlantsPlantNotFoundError,
    SmartPlantsRevisionConflictError,
    SmartPlantsValidationError,
)

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

_REGISTRATION_FLAG = f"{DOMAIN}_http_registered"

ERR_INTEGRATION_NOT_LOADED = "integration_not_loaded"
ERR_NOT_FOUND = "not_found"
ERR_REVISION_CONFLICT = "revision_conflict"
ERR_INVALID_FORMAT = "invalid_format"
ERR_UNAUTHORIZED = "unauthorized"
ERR_UNKNOWN = "unknown_error"

_UNKNOWN_ERROR_MESSAGE = "internal error"


def _not_loaded_response() -> web.Response:
    return _error_response(
        HTTPStatus.SERVICE_UNAVAILABLE,
        ERR_INTEGRATION_NOT_LOADED,
        "Smart Plants is not loaded",
    )


def _current_manager(hass: HomeAssistant) -> SmartPlantsManager | None:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED and entry.runtime_data is not None:
            manager: SmartPlantsManager = entry.runtime_data.manager
            if manager.available:
                return manager
    return None


def _error_response(status: HTTPStatus, code: str, message: str) -> web.Response:
    return web.json_response(
        {"error": {"code": code, "message": message}},
        status=status,
    )


def _require_admin(request: web.Request) -> web.Response | None:
    user = request.get("hass_user")
    if user is None or not user.is_admin:
        return _error_response(
            HTTPStatus.UNAUTHORIZED, ERR_UNAUTHORIZED, "admin access required"
        )
    return None


_STREAM_CHUNK_SIZE = 64 * 1024


class _UploadTooLargeError(Exception):
    """The streamed request body exceeded the integration upload cap."""


async def _read_bounded_body(request: web.Request, limit: int) -> bytes:
    """
    Read the request body into memory with a hard byte cap.

    ``request.read()`` only enforces aiohttp's global ``client_max_size``,
    which HA sets much larger than our per-integration cap. Chunked
    transfers omit ``Content-Length``, so a client could stream more
    than ``IMAGE_MAX_UPLOAD_BYTES`` and only be refused once the whole
    body was in memory. Streaming lets us abort the transfer as soon as
    the running total exceeds the cap, whether ``Content-Length`` was
    set or not.
    """
    body = bytearray()
    async for chunk in request.content.iter_chunked(_STREAM_CHUNK_SIZE):
        if len(body) + len(chunk) > limit:
            raise _UploadTooLargeError
        body.extend(chunk)
    return bytes(body)


_EXPECTED_REVISION_RE = re.compile(r"^[1-9][0-9]*$")


def _parse_expected_revision(request: web.Request) -> int:
    """
    Parse and validate the ``expected_revision`` query parameter.

    Only accepts a strict decimal representation of a positive integer:
    no leading zeros, no ``+``/``-`` sign, no surrounding whitespace, no
    hex/bin/oct prefixes. ``PlantRecord.revision`` starts at 1 and is
    monotonically increasing, so zero and negative values are always a
    client bug and are rejected with ``invalid_format`` before reaching
    the manager.
    """
    raw = request.query.get("expected_revision")
    if raw is None:
        raise SmartPlantsValidationError(
            "expected_revision query parameter is required"
        )
    if not _EXPECTED_REVISION_RE.fullmatch(raw):
        raise SmartPlantsValidationError(
            "expected_revision must be a positive base-10 integer"
        )
    return int(raw)


def _plant_view(manager: SmartPlantsManager, plant_id: str) -> dict[str, Any]:
    return manager.get_plant(plant_id).as_view()


class SmartPlantsImageView(HomeAssistantView):
    """GET / POST / DELETE the single image attached to a plant."""

    url = "/api/smart_plants/plants/{plant_id}/image"
    name = "api:smart_plants:plant_image"
    # HomeAssistantView.requires_auth defaults to True; we still enforce
    # admin explicitly per handler since ``requires_auth`` only proves a
    # valid HA user, not an admin.
    requires_auth = True

    async def get(  # noqa: PLR0911
        self, request: web.Request, plant_id: str
    ) -> web.Response:
        auth_error = _require_admin(request)
        if auth_error is not None:
            return auth_error
        hass: HomeAssistant = request.app["hass"]
        manager = _current_manager(hass)
        if manager is None:
            return _error_response(
                HTTPStatus.SERVICE_UNAVAILABLE,
                ERR_INTEGRATION_NOT_LOADED,
                "Smart Plants is not loaded",
            )
        try:
            plant = manager.get_plant(plant_id)
            if plant.image is None:
                return _error_response(
                    HTTPStatus.NOT_FOUND, ERR_NOT_FOUND, "plant has no image"
                )
            images_dir = get_images_dir(hass)
            data = await hass.async_add_executor_job(
                read_image_file, images_dir, plant.image.id
            )
        except SmartPlantsPlantNotFoundError:
            return _error_response(
                HTTPStatus.NOT_FOUND, ERR_NOT_FOUND, "plant not found"
            )
        except SmartPlantsValidationError as err:
            return _error_response(HTTPStatus.BAD_REQUEST, ERR_INVALID_FORMAT, str(err))
        except ImageNotFoundError:
            return _error_response(
                HTTPStatus.NOT_FOUND, ERR_NOT_FOUND, "image file missing"
            )
        except Exception:
            _LOGGER.exception("Unhandled error reading plant image")
            return _error_response(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                ERR_UNKNOWN,
                _UNKNOWN_ERROR_MESSAGE,
            )
        return web.Response(
            body=data,
            content_type=plant.image.content_type or IMAGE_OUTPUT_CONTENT_TYPE,
            headers={
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        )

    async def post(  # noqa: PLR0911, PLR0912
        self, request: web.Request, plant_id: str
    ) -> web.Response:
        auth_error = _require_admin(request)
        if auth_error is not None:
            return auth_error
        hass: HomeAssistant = request.app["hass"]
        manager = _current_manager(hass)
        if manager is None:
            return _error_response(
                HTTPStatus.SERVICE_UNAVAILABLE,
                ERR_INTEGRATION_NOT_LOADED,
                "Smart Plants is not loaded",
            )

        # Reject early on obvious size lies before we buffer the whole
        # body into memory. ``Content-Length`` is advisory (chunked
        # transfers omit it) so we re-check the actual byte count below.
        declared_length = request.content_length
        if declared_length is not None and declared_length > IMAGE_MAX_UPLOAD_BYTES:
            return _error_response(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                ERR_INVALID_FORMAT,
                f"upload exceeds {IMAGE_MAX_UPLOAD_BYTES} bytes",
            )

        try:
            expected_revision = _parse_expected_revision(request)
        except SmartPlantsValidationError as err:
            return _error_response(HTTPStatus.BAD_REQUEST, ERR_INVALID_FORMAT, str(err))

        content_type = request.content_type or ""
        try:
            raw = await _read_bounded_body(request, IMAGE_MAX_UPLOAD_BYTES)
        except _UploadTooLargeError:
            return _error_response(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                ERR_INVALID_FORMAT,
                f"upload exceeds {IMAGE_MAX_UPLOAD_BYTES} bytes",
            )
        except web.HTTPRequestEntityTooLarge:
            return _error_response(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                ERR_INVALID_FORMAT,
                f"upload exceeds {IMAGE_MAX_UPLOAD_BYTES} bytes",
            )
        except Exception:
            _LOGGER.exception("Unhandled error reading image upload body")
            return _error_response(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                ERR_UNKNOWN,
                _UNKNOWN_ERROR_MESSAGE,
            )

        try:
            plant = await manager.async_upsert_image(
                plant_id,
                expected_revision=expected_revision,
                raw_bytes=raw,
                declared_content_type=content_type,
            )
        except SmartPlantsPlantNotFoundError:
            return _error_response(
                HTTPStatus.NOT_FOUND, ERR_NOT_FOUND, "plant not found"
            )
        except SmartPlantsRevisionConflictError as err:
            return _error_response(HTTPStatus.CONFLICT, ERR_REVISION_CONFLICT, str(err))
        except ImageValidationError as err:
            return _error_response(HTTPStatus.BAD_REQUEST, ERR_INVALID_FORMAT, str(err))
        except SmartPlantsValidationError as err:
            return _error_response(HTTPStatus.BAD_REQUEST, ERR_INVALID_FORMAT, str(err))
        except SmartPlantsManagerUnavailableError:
            return _not_loaded_response()
        except Exception:
            _LOGGER.exception("Unhandled error in image upload")
            return _error_response(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                ERR_UNKNOWN,
                _UNKNOWN_ERROR_MESSAGE,
            )
        return web.json_response({"plant": plant.as_view()})

    async def delete(  # noqa: PLR0911
        self, request: web.Request, plant_id: str
    ) -> web.Response:
        auth_error = _require_admin(request)
        if auth_error is not None:
            return auth_error
        hass: HomeAssistant = request.app["hass"]
        manager = _current_manager(hass)
        if manager is None:
            return _error_response(
                HTTPStatus.SERVICE_UNAVAILABLE,
                ERR_INTEGRATION_NOT_LOADED,
                "Smart Plants is not loaded",
            )
        try:
            expected_revision = _parse_expected_revision(request)
        except SmartPlantsValidationError as err:
            return _error_response(HTTPStatus.BAD_REQUEST, ERR_INVALID_FORMAT, str(err))
        try:
            plant = await manager.async_delete_image(
                plant_id, expected_revision=expected_revision
            )
        except SmartPlantsPlantNotFoundError:
            return _error_response(
                HTTPStatus.NOT_FOUND, ERR_NOT_FOUND, "plant not found"
            )
        except SmartPlantsRevisionConflictError as err:
            return _error_response(HTTPStatus.CONFLICT, ERR_REVISION_CONFLICT, str(err))
        except SmartPlantsValidationError as err:
            return _error_response(HTTPStatus.BAD_REQUEST, ERR_INVALID_FORMAT, str(err))
        except SmartPlantsManagerUnavailableError:
            return _not_loaded_response()
        except Exception:
            _LOGGER.exception("Unhandled error in image delete")
            return _error_response(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                ERR_UNKNOWN,
                _UNKNOWN_ERROR_MESSAGE,
            )
        return web.json_response({"plant": plant.as_view()})


def async_register(hass: HomeAssistant) -> None:
    """Register the image HTTP view exactly once per process."""
    if hass.data.get(_REGISTRATION_FLAG):
        return
    hass.http.register_view(SmartPlantsImageView())
    hass.data[_REGISTRATION_FLAG] = True
