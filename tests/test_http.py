"""
Integration tests for the admin-only image HTTP endpoints.

Every endpoint is exercised against a real HA test client so the
authentication, error-code shape, and manager/reconciler wiring stay
consistent with the WebSocket API.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants.const import (
    DOMAIN,
    IMAGE_MAX_DIMENSION,
    IMAGE_MAX_UPLOAD_BYTES,
    IMAGE_STORAGE_DIRNAME,
    SINGLETON_UNIQUE_ID,
)
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsManagerUnavailableError,
)
from custom_components.smart_plants.roles import source_accepting_roles
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from PIL import Image
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    assert await async_setup_component(hass, DOMAIN, {})
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _jpeg(width: int = 200, height: int = 150) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), (100, 150, 200)).save(
        buf, format="JPEG", quality=90
    )
    return buf.getvalue()


def _url(plant_id: str) -> str:
    return f"/api/smart_plants/plants/{plant_id}/image"


async def _create_plant(hass: HomeAssistant) -> Any:
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    manager: SmartPlantsManager = entry.runtime_data.manager
    return await manager.async_create_plant(name="Aloe")


# --- Auth ---------------------------------------------------------------


async def test_upload_requires_auth(
    hass: HomeAssistant, hass_client_no_auth: ClientSessionGenerator
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client_no_auth()
    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=_jpeg(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 401


async def test_upload_requires_admin(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    hass_read_only_access_token: str,
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client(hass_read_only_access_token)
    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=_jpeg(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 401
    body = await resp.json()
    assert body["error"]["code"] == "unauthorized"


async def test_get_requires_admin(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    hass_read_only_access_token: str,
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client(hass_read_only_access_token)
    resp = await client.get(_url(plant.id))
    assert resp.status == 401


async def test_delete_requires_admin(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    hass_read_only_access_token: str,
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client(hass_read_only_access_token)
    resp = await client.delete(f"{_url(plant.id)}?expected_revision={plant.revision}")
    assert resp.status == 401


# --- Happy path ---------------------------------------------------------


async def test_upload_then_get_returns_webp(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()

    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=_jpeg(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 200, await resp.text()
    body = await resp.json()
    assert body["plant"]["image"] is not None
    assert body["plant"]["image"]["content_type"] == "image/webp"
    assert body["plant"]["revision"] == plant.revision + 1
    # Image responses use the same PlantView as the WS API, so the panel's
    # role editors stay seeded after an upload replaces its plant copy.
    assert set(body["plant"]["roles"]) == {"moisture", *source_accepting_roles()}

    resp = await client.get(_url(plant.id))
    assert resp.status == 200
    assert resp.headers["Content-Type"].startswith("image/webp")
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
    data = await resp.read()
    with Image.open(io.BytesIO(data)) as decoded:
        assert decoded.format == "WEBP"


async def test_upload_replace_deletes_previous_file(
    hass: HomeAssistant, hass_client: ClientSessionGenerator, tmp_path: Path
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    manager: SmartPlantsManager = entry.runtime_data.manager
    images_dir = Path(hass.config.path(IMAGE_STORAGE_DIRNAME))
    del tmp_path

    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=_jpeg(),
        headers={"Content-Type": "image/jpeg"},
    )
    first = (await resp.json())["plant"]
    first_id = first["image"]["id"]
    assert (images_dir / f"{first_id}.webp").is_file()

    # Replace with a different JPEG.
    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={first['revision']}",
        data=_jpeg(width=300, height=200),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 200, await resp.text()
    second = (await resp.json())["plant"]
    second_id = second["image"]["id"]
    assert second_id != first_id
    assert (images_dir / f"{second_id}.webp").is_file()
    # The previous file was removed as part of the replace side effect.
    assert not (images_dir / f"{first_id}.webp").is_file()
    # Record was atomically advanced.
    final_image = manager.get_plant(plant.id).image
    assert final_image is not None
    assert final_image.id == second_id


async def test_delete_image_removes_file_and_record(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    images_dir = Path(hass.config.path(IMAGE_STORAGE_DIRNAME))

    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=_jpeg(),
        headers={"Content-Type": "image/jpeg"},
    )
    uploaded = (await resp.json())["plant"]
    image_id = uploaded["image"]["id"]

    resp = await client.delete(
        f"{_url(plant.id)}?expected_revision={uploaded['revision']}"
    )
    assert resp.status == 200
    body = await resp.json()
    assert body["plant"]["image"] is None
    assert set(body["plant"]["roles"]) == {"moisture", *source_accepting_roles()}
    assert not (images_dir / f"{image_id}.webp").is_file()

    # Second GET must 404 with a clean error envelope.
    resp = await client.get(_url(plant.id))
    assert resp.status == 404


# --- Validation ---------------------------------------------------------


async def test_upload_rejects_bad_mime(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=_jpeg(),
        headers={"Content-Type": "image/gif"},
    )
    assert resp.status == 400
    assert (await resp.json())["error"]["code"] == "invalid_format"


async def test_upload_rejects_mime_content_mismatch(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    png_buf = io.BytesIO()
    Image.new("RGB", (10, 10)).save(png_buf, format="PNG")
    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=png_buf.getvalue(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 400
    assert (await resp.json())["error"]["code"] == "invalid_format"


async def test_upload_rejects_oversized_upload(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    # Just over the byte cap.
    payload = b"\x00" * (IMAGE_MAX_UPLOAD_BYTES + 1)
    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=payload,
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 413
    assert (await resp.json())["error"]["code"] == "invalid_format"


async def test_upload_rejects_oversized_chunked_upload(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    # A chunked (no ``Content-Length``) upload that streams more than
    # ``IMAGE_MAX_UPLOAD_BYTES`` must still be rejected — the bounded
    # streamed read enforces the cap even when the pre-flight
    # content-length check is unavailable.
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()

    async def _stream() -> Any:
        chunk = b"\x00" * (64 * 1024)
        # Push just past the cap in 64 KiB chunks.
        total_chunks = (IMAGE_MAX_UPLOAD_BYTES // len(chunk)) + 2
        for _ in range(total_chunks):
            yield chunk

    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=_stream(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 413
    assert (await resp.json())["error"]["code"] == "invalid_format"


async def test_upload_accepts_chunked_within_limit(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    # A chunked (streamed) upload that stays under the cap succeeds.
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()

    payload = _jpeg()

    async def _stream() -> Any:
        # Emit the JPEG in two chunks so the transport is chunked but
        # the running total never exceeds the cap.
        mid = len(payload) // 2
        yield payload[:mid]
        yield payload[mid:]

    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=_stream(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 200, await resp.text()


async def test_upload_rejects_oversized_dimensions(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=_jpeg(width=IMAGE_MAX_DIMENSION + 1, height=100),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 400
    assert (await resp.json())["error"]["code"] == "invalid_format"


async def test_upload_accepts_exact_cap_boundary(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=_jpeg(width=IMAGE_MAX_DIMENSION, height=IMAGE_MAX_DIMENSION),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 200, await resp.text()
    body = await resp.json()
    stored = body["plant"]["image"]
    assert stored["width"] == IMAGE_MAX_DIMENSION
    assert stored["height"] == IMAGE_MAX_DIMENSION


async def test_upload_rejects_malformed_bytes(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=b"not-an-image",
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 400
    assert (await resp.json())["error"]["code"] == "invalid_format"


async def test_upload_returns_revision_conflict(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    resp = await client.post(
        f"{_url(plant.id)}?expected_revision=999",
        data=_jpeg(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 409
    assert (await resp.json())["error"]["code"] == "revision_conflict"


async def test_upload_returns_not_found_for_missing_plant(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    client = await hass_client()
    resp = await client.post(
        "/api/smart_plants/plants/does-not-exist/image?expected_revision=1",
        data=_jpeg(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 404
    assert (await resp.json())["error"]["code"] == "not_found"


async def test_get_returns_not_found_when_no_image(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    resp = await client.get(_url(plant.id))
    assert resp.status == 404
    assert (await resp.json())["error"]["code"] == "not_found"


async def test_get_returns_integration_not_loaded_after_unload(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    entry = await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    # Upload succeeds while loaded.
    resp = await client.post(
        f"{_url(plant.id)}?expected_revision={plant.revision}",
        data=_jpeg(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 200

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    resp = await client.get(_url(plant.id))
    assert resp.status == 503
    assert (await resp.json())["error"]["code"] == "integration_not_loaded"


@pytest.mark.parametrize(
    "bad_id",
    [
        "../etc/passwd",
        "a" * 200,
        "aaaaaaaa/bbbbbbbb",
    ],
)
async def test_get_rejects_traversal_attempts(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    bad_id: str,
) -> None:
    await _setup(hass)
    client = await hass_client()
    # Aiohttp will URL-encode the segment; result is a 404 from the
    # router or from the not-found branch — either way we never leak
    # file contents from outside the images dir.
    resp = await client.get(f"/api/smart_plants/plants/{bad_id}/image")
    assert resp.status in (404, 400)


@pytest.mark.parametrize(
    "bad_revision", [None, "0", "-1", "+1", "01", "1.0", "text", " 1"]
)
@pytest.mark.parametrize("method", ["post", "delete"])
async def test_mutations_reject_invalid_revision_query(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    method: str,
    bad_revision: str | None,
) -> None:
    await _setup(hass)
    plant = await _create_plant(hass)
    client = await hass_client()
    suffix = "" if bad_revision is None else f"?expected_revision={bad_revision}"
    request = getattr(client, method)
    kwargs = (
        {"data": _jpeg(), "headers": {"Content-Type": "image/jpeg"}}
        if method == "post"
        else {}
    )
    resp = await request(f"{_url(plant.id)}{suffix}", **kwargs)
    assert resp.status == 400
    assert (await resp.json())["error"]["code"] == "invalid_format"


async def test_upload_maps_unload_race_to_not_loaded(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_client()
    with patch.object(
        manager,
        "async_upsert_image",
        side_effect=SmartPlantsManagerUnavailableError("closing"),
    ):
        resp = await client.post(
            f"{_url(plant.id)}?expected_revision={plant.revision}",
            data=_jpeg(),
            headers={"Content-Type": "image/jpeg"},
        )
    assert resp.status == 503
    assert (await resp.json())["error"]["code"] == "integration_not_loaded"


async def test_get_hides_internal_error_details(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_client()
    with patch.object(
        manager,
        "get_plant",
        side_effect=PermissionError("secret filesystem path"),
    ):
        resp = await client.get(_url(plant.id))
    assert resp.status == 500
    body = await resp.json()
    assert body["error"] == {"code": "unknown_error", "message": "internal error"}


async def test_delete_rejects_invalid_plant_id(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    await _setup(hass)
    client = await hass_client()
    resp = await client.delete(f"{_url('x' * 201)}?expected_revision=1")
    assert resp.status == 400
    assert (await resp.json())["error"]["code"] == "invalid_format"
