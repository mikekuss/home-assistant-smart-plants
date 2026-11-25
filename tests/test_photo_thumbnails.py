"""
Integration tests for photo placeholders and smaller photo copies.

Covers the ThumbHash stored on upload and reported by the list commands, the
``size`` query of the photo endpoint with its cache, the clean-up of cached
data when a photo goes, the background pass after setup, integration removal
and diagnostics.
"""

from __future__ import annotations

import asyncio
import io
import json
import threading
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants.const import (
    CONF_PRESERVE_INVENTORY_ON_REMOVAL,
    DOMAIN,
    IMAGE_STORAGE_DIRNAME,
    PHOTO_META_STORAGE_KEY,
    PHOTO_META_STORAGE_VERSION,
    SINGLETON_UNIQUE_ID,
)
from custom_components.smart_plants.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.smart_plants.images import make_variant, stored_image_thumbhash
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantRecord
from custom_components.smart_plants.photo_meta import (
    PhotoMetaStore,
    is_valid_thumbhash,
)
from homeassistant.core import HomeAssistant
from PIL import Image
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import (
    ClientSessionGenerator,
    WebSocketGenerator,
)

_STALE_ID = "0123456789abcdef0123456789abcdef"
_STALE_HASH = "3wcKNZqAh4eAiHeIeHiHiICACPh3"


async def _setup(
    hass: HomeAssistant, *, preserve: bool = False
) -> tuple[MockConfigEntry, SmartPlantsManager]:
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        options={CONF_PRESERVE_INVENTORY_ON_REMOVAL: True} if preserve else {},
        unique_id=SINGLETON_UNIQUE_ID,
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done(wait_background_tasks=True)
    return entry, entry.runtime_data.manager


def _jpeg(width: int = 1000, height: int = 800) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), (90, 160, 70)).save(buffer, format="JPEG")
    return buffer.getvalue()


async def _plant_with_photo(
    manager: SmartPlantsManager, name: str = "Aloe", **jpeg: int
) -> PlantRecord:
    plant = await manager.async_create_plant(name=name)
    return await manager.async_upsert_image(
        plant.id,
        expected_revision=plant.revision,
        raw_bytes=_jpeg(**jpeg),
        declared_content_type="image/jpeg",
    )


def _photo_id(plant: Any) -> str:
    assert plant.image is not None
    image_id: str = plant.image.id
    return image_id


def _variants_dir(hass: HomeAssistant) -> Path:
    return Path(hass.config.cache_path("smart_plants", "thumbs"))


def _variant_names(hass: HomeAssistant) -> set[str]:
    directory = _variants_dir(hass)
    return {path.name for path in directory.iterdir()} if directory.exists() else set()


def _url(plant_id: str, query: str = "") -> str:
    return f"/api/smart_plants/plants/{plant_id}/image{query}"


async def _get(client: Any, plant_id: str, query: str) -> tuple[Any, bytes]:
    response = await client.get(_url(plant_id, query))
    return response, await response.read()


def _dimensions(data: bytes) -> tuple[int, int]:
    with Image.open(io.BytesIO(data)) as decoded:
        assert decoded.format == "WEBP"
        return decoded.size


async def _ws(hass: HomeAssistant, hass_ws_client: WebSocketGenerator) -> Any:
    client = await hass_ws_client(hass)

    async def call(payload: dict[str, Any]) -> dict[str, Any]:
        await client.send_json_auto_id(payload)
        response: dict[str, Any] = await client.receive_json()
        assert response["success"], response
        result: dict[str, Any] = response["result"]
        return result

    return call


def _stored_meta(photos: Any) -> dict[str, Any]:
    return {
        "version": PHOTO_META_STORAGE_VERSION,
        "minor_version": 1,
        "key": PHOTO_META_STORAGE_KEY,
        "data": {"photos": photos},
    }


# --- Placeholders on upload and in list replies ------------------------------


async def test_upload_stores_the_thumbhash_and_lists_report_it(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    _entry, manager = await _setup(hass)
    call = await _ws(hass, hass_ws_client)
    await manager.async_create_plant(name="Office Aloe")
    plant = await _plant_with_photo(manager)
    image_id = _photo_id(plant)
    thumbhash = manager.photo_meta_for([image_id])[image_id]["thumbhash"]
    assert is_valid_thumbhash(thumbhash)

    listed = await call({"type": "smart_plants/plants/list"})
    assert listed["photo_meta"] == {image_id: {"thumbhash": thumbhash}}
    # The plant objects keep their shape.
    assert all("thumbhash" not in item for item in listed["plants"])
    assert (await call({"type": "smart_plants/archive/list"}))["photo_meta"] == {}

    await manager.async_archive_plant(
        plant.id, expected_revision=manager.get_plant(plant.id).revision
    )
    await hass.async_block_till_done()
    assert (await call({"type": "smart_plants/plants/list"}))["photo_meta"] == {}
    archived = await call({"type": "smart_plants/archive/list"})
    assert archived["photo_meta"] == {image_id: {"thumbhash": thumbhash}}
    # Retiring keeps the photo, so its placeholder stays.
    assert manager.photo_meta_count == 1


async def test_placeholders_persist_across_a_reload(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    image_id = _photo_id(plant)
    thumbhash = manager.photo_meta_for([image_id])[image_id]["thumbhash"]

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    stored = hass_storage[PHOTO_META_STORAGE_KEY]["data"]
    assert stored == {"photos": {image_id: {"thumbhash": thumbhash}}}

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done(wait_background_tasks=True)
    reloaded: SmartPlantsManager = entry.runtime_data.manager
    assert reloaded.photo_meta_for([image_id]) == {image_id: {"thumbhash": thumbhash}}


# --- Clean-up when a photo goes ------------------------------------------------


async def _make_variants(
    hass: HomeAssistant, hass_client: ClientSessionGenerator, plant_id: str
) -> None:
    client = await hass_client()
    for size in ("thumb", "thumb2x"):
        response, _ = await _get(client, plant_id, f"?size={size}")
        assert response.status == 200


async def test_replacing_a_photo_drops_the_old_cached_data(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    old_id = _photo_id(plant)
    await _make_variants(hass, hass_client, plant.id)
    assert _variant_names(hass) == {f"{old_id}-thumb.webp", f"{old_id}-thumb2x.webp"}

    replaced = await manager.async_upsert_image(
        plant.id,
        expected_revision=plant.revision,
        raw_bytes=_jpeg(300, 200),
        declared_content_type="image/jpeg",
    )
    new_id = _photo_id(replaced)
    assert manager.photo_meta_for([old_id]) == {}
    assert set(manager.photo_meta_for([new_id])) == {new_id}
    assert _variant_names(hass) == set()


async def test_deleting_a_photo_drops_its_cached_data(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    await _make_variants(hass, hass_client, plant.id)

    await manager.async_delete_image(plant.id, expected_revision=plant.revision)
    assert manager.photo_meta_count == 0
    assert _variant_names(hass) == set()


async def test_deleting_a_plant_drops_its_cached_data(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    other = await _plant_with_photo(manager, name="Office Aloe")
    await _make_variants(hass, hass_client, plant.id)
    await _make_variants(hass, hass_client, other.id)

    await manager.async_delete_plant(plant.id, expected_revision=plant.revision)
    await hass.async_block_till_done()
    other_id = _photo_id(other)
    assert manager.photo_meta_for([_photo_id(plant), other_id]).keys() == {other_id}
    assert _variant_names(hass) == {
        f"{other_id}-thumb.webp",
        f"{other_id}-thumb2x.webp",
    }


async def test_deleting_a_retired_plant_drops_its_cached_data(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    image_id = _photo_id(plant)
    record = await manager.async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    await hass.async_block_till_done()
    # A retired plant's photo can be read in smaller sizes too.
    await _make_variants(hass, hass_client, plant.id)
    assert len(_variant_names(hass)) == 2
    assert manager.photo_meta_count == 1

    await manager.async_delete_archived(plant.id, expected_revision=record.revision)
    await hass.async_block_till_done()
    assert manager.photo_meta_for([image_id]) == {}
    assert _variant_names(hass) == set()
    assert not (
        Path(hass.config.path(IMAGE_STORAGE_DIRNAME)) / f"{image_id}.webp"
    ).exists()


async def test_a_cache_clean_up_failure_never_fails_the_change(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    await _make_variants(hass, hass_client, plant.id)
    with patch(
        "custom_components.smart_plants.images.delete_variant_files",
        side_effect=OSError("read-only"),
    ):
        updated = await manager.async_delete_image(
            plant.id, expected_revision=plant.revision
        )
    assert updated.image is None
    assert manager.photo_meta_count == 0


# --- Smaller copies over HTTP ---------------------------------------------------


@pytest.mark.parametrize(
    ("size", "expected"), [("thumb", (320, 256)), ("thumb2x", (640, 512))]
)
async def test_get_size_makes_the_copy_once_then_serves_the_cache(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    size: str,
    expected: tuple[int, int],
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    image_id = _photo_id(plant)
    client = await hass_client()

    with patch(
        "custom_components.smart_plants.manager.make_variant", wraps=make_variant
    ) as generator:
        response, first = await _get(client, plant.id, f"?size={size}&v={image_id}")
        assert response.status == 200
        assert response.headers["Content-Type"].startswith("image/webp")
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert (
            response.headers["Cache-Control"] == "private, max-age=31536000, immutable"
        )
        assert _dimensions(first) == expected

        for query in (f"?size={size}", f"?size={size}&v=", f"?v=x&size={size}"):
            response, again = await _get(client, plant.id, query)
            assert response.status == 200
            assert response.headers["Cache-Control"] == "no-store"
            assert again == first
    assert generator.call_count == 1
    assert _variant_names(hass) == {f"{image_id}-{size}.webp"}

    # Without ``size`` the stored photo is served as before.
    response, full = await _get(client, plant.id, f"?v={image_id}")
    assert response.status == 200
    assert _dimensions(full) == (1000, 800)


async def test_concurrent_requests_share_one_copy(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    image_id = _photo_id(plant)
    client = await hass_client()
    entered = threading.Event()
    release = threading.Event()
    calls: list[int] = []

    def _slow_variant(data: bytes, longest: int) -> bytes:
        calls.append(longest)
        entered.set()
        assert release.wait(timeout=10)
        return make_variant(data, longest)

    # A plain function that blocks in the executor, so the other requests
    # arrive while the first copy is still being made. A mock would run
    # inline on the event loop and finish before they get there.
    with patch("custom_components.smart_plants.manager.make_variant", _slow_variant):
        requests = [
            asyncio.ensure_future(_get(client, plant.id, "?size=thumb"))
            for _ in range(3)
        ]
        assert await hass.async_add_executor_job(entered.wait, 10)
        for _ in range(500):
            if manager._variant_locks.get(image_id, (None, 0))[1] == 3:
                break
            await asyncio.sleep(0.01)
        assert manager._variant_locks[image_id][1] == 3
        release.set()
        results = await asyncio.gather(*requests)
    assert [response.status for response, _ in results] == [200, 200, 200]
    assert len({body for _, body in results}) == 1
    # The two requests that waited find the copy the first one made.
    assert calls == [320]
    # The per-photo locks are released once no request waits on them.
    assert manager._variant_locks == {}


async def test_get_size_serves_a_damaged_photo_as_stored(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    caplog: pytest.LogCaptureFixture,
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    image_id = _photo_id(plant)
    stored = Path(hass.config.path(IMAGE_STORAGE_DIRNAME)) / f"{image_id}.webp"
    damaged = b"RIFF\x10\x00\x00\x00WEBPVP8 not a picture"
    stored.write_bytes(damaged)
    client = await hass_client()

    with patch(
        "custom_components.smart_plants.manager.make_variant", wraps=make_variant
    ) as generator:
        for size in ("thumb", "thumb", "thumb2x"):
            response, data = await _get(client, plant.id, f"?size={size}")
            assert response.status == 200
            assert data == damaged
    # Decoded once; later requests serve the file without trying again.
    assert generator.call_count == 1
    assert _variant_names(hass) == set()
    warnings = [r for r in caplog.records if "smaller copy" in r.getMessage()]
    assert len(warnings) == 1
    assert warnings[0].levelname == "WARNING"
    assert "Traceback" not in caplog.text

    # A new photo is copied again.
    replaced = await manager.async_upsert_image(
        plant.id,
        expected_revision=manager.get_plant(plant.id).revision,
        raw_bytes=_jpeg(),
        declared_content_type="image/jpeg",
    )
    response, data = await _get(client, replaced.id, "?size=thumb")
    assert response.status == 200
    assert _dimensions(data) == (320, 256)
    assert manager._uncopyable_photos == set()


async def test_upload_is_saved_when_its_placeholder_cannot_be_stored(
    hass: HomeAssistant,
) -> None:
    _entry, manager = await _setup(hass)
    with patch.object(manager._photo_meta, "set", side_effect=ValueError("bad hash")):
        plant = await _plant_with_photo(manager)
    image_id = _photo_id(plant)
    assert manager.get_plant(plant.id).image == plant.image
    assert manager.photo_meta_for([image_id]) == {}


@pytest.mark.parametrize(
    "content",
    [b"", b"RIFF", b"\x89PNG\r\n\x1a\n0000", b"RIFF\x00\x00\x00\x00WEBX"],
)
async def test_get_size_makes_an_empty_or_foreign_cache_file_again(
    hass: HomeAssistant, hass_client: ClientSessionGenerator, content: bytes
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    image_id = _photo_id(plant)
    directory = _variants_dir(hass)
    directory.mkdir(parents=True, exist_ok=True)
    cached = directory / f"{image_id}-thumb.webp"
    cached.write_bytes(content)

    response, data = await _get(
        await hass_client(), plant.id, f"?size=thumb&v={image_id}"
    )
    assert response.status == 200
    assert _dimensions(data) == (320, 256)
    assert cached.read_bytes() == data


async def test_a_copy_made_while_its_photo_goes_is_not_kept(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    client = await hass_client()
    entered = threading.Event()
    release = threading.Event()

    def _slow_variant(data: bytes, longest: int) -> bytes:
        entered.set()
        assert release.wait(timeout=10)
        return make_variant(data, longest)

    # A plain function, not a mock: the test harness runs mocks inline on the
    # event loop instead of in the executor.
    with patch("custom_components.smart_plants.manager.make_variant", _slow_variant):
        request = asyncio.ensure_future(_get(client, plant.id, "?size=thumb"))
        assert await hass.async_add_executor_job(entered.wait, 10)
        await manager.async_delete_image(plant.id, expected_revision=plant.revision)
        release.set()
        response, data = await request
    # The request that was already running still gets its copy, but the
    # cache keeps nothing of a photo that is gone.
    assert response.status == 200
    assert _dimensions(data) == (320, 256)
    assert _variant_names(hass) == set()
    assert manager._variant_locks == {}


@pytest.mark.parametrize(
    "query", ["?size=", "?size=large", "?size=THUMB", "?size=thumb3x"]
)
async def test_get_rejects_an_unknown_size(
    hass: HomeAssistant, hass_client: ClientSessionGenerator, query: str
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    response = await (await hass_client()).get(_url(plant.id, query))
    assert response.status == 400
    assert (await response.json())["error"]["code"] == "invalid_format"
    assert _variant_names(hass) == set()


async def test_get_size_without_the_stored_photo_is_not_found(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    stored = Path(hass.config.path(IMAGE_STORAGE_DIRNAME)) / f"{_photo_id(plant)}.webp"
    stored.unlink()

    response = await (await hass_client()).get(_url(plant.id, "?size=thumb"))
    assert response.status == 404
    assert (await response.json())["error"]["code"] == "not_found"
    assert manager._variant_locks == {}

    bare = await manager.async_create_plant(name="Office Aloe")
    response = await (await hass_client()).get(_url(bare.id, "?size=thumb"))
    assert response.status == 404


async def test_get_size_serves_the_copy_when_the_cache_cannot_be_written(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    client = await hass_client()

    with patch(
        "custom_components.smart_plants.manager.write_variant_file",
        side_effect=OSError("No space left on device"),
    ):
        response, data = await _get(client, plant.id, "?size=thumb")
    assert response.status == 200
    assert _dimensions(data) == (320, 256)
    assert _variant_names(hass) == set()


async def test_get_size_regenerates_an_unreadable_cache_entry(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    _entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    client = await hass_client()
    with patch(
        "custom_components.smart_plants.manager.read_variant_file",
        side_effect=PermissionError("denied"),
    ):
        response, data = await _get(client, plant.id, "?size=thumb2x")
    assert response.status == 200
    assert _dimensions(data) == (640, 512)


# --- Background pass after setup -----------------------------------------------


async def test_setup_fills_in_missing_placeholders_and_prunes_stale_data(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    image_id = _photo_id(plant)
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    # The upload hashes the uploaded pixels; the background pass can only
    # hash the stored WebP file, whose pixels differ slightly.
    expected = await hass.async_add_executor_job(
        stored_image_thumbhash, Path(hass.config.path(IMAGE_STORAGE_DIRNAME)), image_id
    )

    # An older version stored no placeholders; a stale entry and stale copies
    # of a photo no plant has are left over.
    hass_storage[PHOTO_META_STORAGE_KEY] = _stored_meta(
        {_STALE_ID: {"thumbhash": _STALE_HASH}}
    )
    variants = _variants_dir(hass)
    variants.mkdir(parents=True)
    (variants / f"{_STALE_ID}-thumb.webp").write_bytes(b"stale")
    (variants / f".{_STALE_ID}-thumb2x.webp.tmp").write_bytes(b"stale")
    (variants / f"{image_id}-thumb.webp").write_bytes(b"current")

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done(wait_background_tasks=True)
    reloaded: SmartPlantsManager = entry.runtime_data.manager
    assert reloaded.photo_meta_for([image_id, _STALE_ID]) == {
        image_id: {"thumbhash": expected}
    }
    assert _variant_names(hass) == {f"{image_id}-thumb.webp"}
    assert hass_storage[PHOTO_META_STORAGE_KEY]["data"] == {
        "photos": {image_id: {"thumbhash": expected}}
    }


async def test_background_pass_skips_a_missing_or_broken_photo(
    hass: HomeAssistant,
) -> None:
    entry, manager = await _setup(hass)
    missing = await _plant_with_photo(manager)
    broken = await _plant_with_photo(manager, name="Office Aloe")
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    images = Path(hass.config.path(IMAGE_STORAGE_DIRNAME))
    (images / f"{_photo_id(missing)}.webp").unlink()
    (images / f"{_photo_id(broken)}.webp").write_bytes(b"not a photo")
    # Without stored placeholders, setup tries to compute both again.
    await PhotoMetaStore(hass).async_remove()

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done(wait_background_tasks=True)
    reloaded: SmartPlantsManager = entry.runtime_data.manager
    assert reloaded.photo_meta_count == 0
    assert reloaded.available


async def test_unload_cancels_the_background_pass(hass: HomeAssistant) -> None:
    started = asyncio.Event()
    cancelled = asyncio.Event()

    async def _never_finishes(_self: SmartPlantsManager) -> None:
        started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            raise

    with patch.object(
        SmartPlantsManager, "_async_backfill_placeholders", _never_finishes
    ):
        entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        await asyncio.wait_for(started.wait(), timeout=5)
        manager: SmartPlantsManager = entry.runtime_data.manager

        assert await hass.config_entries.async_unload(entry.entry_id)
        await hass.async_block_till_done()
    assert cancelled.is_set()
    assert manager._photo_task is None


# --- The store itself ------------------------------------------------------------


async def test_store_drops_malformed_entries(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    good = "fedcba9876543210fedcba9876543210"
    hass_storage[PHOTO_META_STORAGE_KEY] = _stored_meta(
        {
            good: {"thumbhash": _STALE_HASH},
            "not-an-id": {"thumbhash": _STALE_HASH},
            _STALE_ID.upper(): {"thumbhash": _STALE_HASH},
            "11111111111111111111111111111111": {"thumbhash": "%%%"},
            "22222222222222222222222222222222": {"thumbhash": "A" * 68},
            "33333333333333333333333333333333": {"thumbhash": "AAAA"},
            "44444444444444444444444444444444": "3wcKNZqAh4eAiHeIeHiHiICACPh3",
            "55555555555555555555555555555555": {"thumbhash": 5},
        }
    )
    store = PhotoMetaStore(hass)
    await store.async_load()
    assert len(store) == 1
    assert store.get(good) == _STALE_HASH


@pytest.mark.parametrize("data", [None, [], {"photos": []}, {"other": {}}, "text"])
async def test_store_with_a_malformed_root_starts_empty(
    hass: HomeAssistant, hass_storage: dict[str, Any], data: Any
) -> None:
    stored = _stored_meta({})
    stored["data"] = data
    hass_storage[PHOTO_META_STORAGE_KEY] = stored
    store = PhotoMetaStore(hass)
    await store.async_load()
    assert len(store) == 0


async def test_setup_survives_an_unreadable_store(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[PHOTO_META_STORAGE_KEY] = {"version": 99, "data": {}}
    _entry, manager = await _setup(hass)
    assert manager.available
    assert manager.photo_meta_count == 0


async def test_store_set_prune_and_flush(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    store = PhotoMetaStore(hass)
    await store.async_load()
    with pytest.raises(ValueError, match="malformed"):
        store.set("../etc", _STALE_HASH)
    with pytest.raises(ValueError, match="malformed"):
        store.set(_STALE_ID, "not base64!")
    store.set(_STALE_ID, _STALE_HASH)
    store.set("fedcba9876543210fedcba9876543210", _STALE_HASH)
    assert store.prune({_STALE_ID}) == 1
    await store.async_flush()
    assert hass_storage[PHOTO_META_STORAGE_KEY]["data"] == {
        "photos": {_STALE_ID: {"thumbhash": _STALE_HASH}}
    }
    store.discard(_STALE_ID)
    await store.async_close()
    assert hass_storage[PHOTO_META_STORAGE_KEY]["data"] == {"photos": {}}
    # A closed store writes nothing more.
    store.set(_STALE_ID, _STALE_HASH)
    await store.async_flush()
    assert hass_storage[PHOTO_META_STORAGE_KEY]["data"] == {"photos": {}}


async def test_a_failed_flush_is_written_on_close(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    store = PhotoMetaStore(hass)
    await store.async_load()
    store.set(_STALE_ID, _STALE_HASH)
    with (
        patch(
            "homeassistant.helpers.storage.Store.async_save",
            side_effect=OSError("No space left on device"),
        ),
        pytest.raises(OSError, match="No space"),
    ):
        await store.async_flush()
    assert PHOTO_META_STORAGE_KEY not in hass_storage

    await store.async_close()
    assert hass_storage[PHOTO_META_STORAGE_KEY]["data"] == {
        "photos": {_STALE_ID: {"thumbhash": _STALE_HASH}}
    }


# --- Integration removal ---------------------------------------------------------


async def _prepare_removal(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    hass_storage: dict[str, Any],
    *,
    preserve: bool,
) -> tuple[MockConfigEntry, str]:
    entry, manager = await _setup(hass, preserve=preserve)
    plant = await _plant_with_photo(manager)
    await _make_variants(hass, hass_client, plant.id)
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert PHOTO_META_STORAGE_KEY in hass_storage
    assert Path(hass.config.cache_path("smart_plants")).is_dir()
    return entry, _photo_id(plant)


async def test_default_removal_deletes_placeholders_and_cache(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    hass_storage: dict[str, Any],
) -> None:
    entry, _image_id = await _prepare_removal(
        hass, hass_client, hass_storage, preserve=False
    )
    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert PHOTO_META_STORAGE_KEY not in hass_storage
    assert not Path(hass.config.cache_path("smart_plants")).exists()


async def test_preserved_removal_keeps_placeholders(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    hass_storage: dict[str, Any],
) -> None:
    entry, image_id = await _prepare_removal(
        hass, hass_client, hass_storage, preserve=True
    )
    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    photos = hass_storage[PHOTO_META_STORAGE_KEY]["data"]["photos"]
    assert set(photos) == {image_id}
    # The copies are made again on demand after a reinstall.
    assert not Path(hass.config.cache_path("smart_plants")).exists()


# --- Diagnostics -----------------------------------------------------------------


async def test_diagnostics_count_placeholders_without_ids(hass: HomeAssistant) -> None:
    entry, manager = await _setup(hass)
    plant = await _plant_with_photo(manager)
    image_id = _photo_id(plant)
    thumbhash = manager.photo_meta_for([image_id])[image_id]["thumbhash"]

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    assert diagnostics["inventory"]["photo_meta_count"] == 1
    rendered = json.dumps(diagnostics)
    assert thumbhash not in rendered
    assert image_id not in rendered
