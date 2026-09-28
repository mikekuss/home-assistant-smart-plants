"""
Image ownership and cleanup coverage.

These tests prove:

* The public plant create/update WebSocket schemas refuse a client-
  supplied image record; image ids and metadata are server-authored
  through the dedicated image endpoints only.
* ``async_delete_plant`` unlinks the plant's WebP file BEFORE the
  tombstone is cleared, so a shared/reused id can never be reaped
  and a solo id is never left as an orphan waiting for grace.
* Default config-entry removal deletes the entire image data
  directory alongside the inventory file.
* Opt-in ``preserve_inventory_on_removal`` keeps both the inventory
  and every image file so a reinstall picks the plants back up.
* Interrupted ``.<id>.webp.tmp`` files are conservatively cleaned up
  by startup reconciliation: only files older than the orphan grace
  period are removed; younger ones survive so a concurrent still-
  running upload is not raced.
"""

from __future__ import annotations

import io
import os
import shutil
import time
from pathlib import Path
from typing import Any

import pytest
from custom_components.smart_plants.const import (
    CONF_PRESERVE_INVENTORY_ON_REMOVAL,
    DOMAIN,
    IMAGE_ORPHAN_GRACE_SECONDS,
    IMAGE_STORAGE_DIRNAME,
    SINGLETON_UNIQUE_ID,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantImage
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from PIL import Image
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import (
    ClientSessionGenerator,
    WebSocketGenerator,
)


def _jpeg(width: int = 200, height: int = 150) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), (100, 150, 200)).save(
        buf, format="JPEG", quality=90
    )
    return buf.getvalue()


def _images_dir(hass: HomeAssistant) -> Path:
    return Path(hass.config.path(IMAGE_STORAGE_DIRNAME))


def test_hacs_style_integration_replacement_preserves_mutable_images(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    integration_dir = Path(hass.config.path("custom_components", DOMAIN))
    images_dir = _images_dir(hass)
    integration_dir.mkdir(parents=True)
    images_dir.mkdir(parents=True)
    (integration_dir / "old-release.py").write_text("old", encoding="utf-8")
    image = images_dir / "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp"
    image.write_bytes(b"user-owned-image")

    replacement = tmp_path / "replacement" / DOMAIN
    replacement.mkdir(parents=True)
    (replacement / "new-release.py").write_text("new", encoding="utf-8")

    # HACS replaces only the integration directory under custom_components.
    shutil.rmtree(integration_dir)
    shutil.copytree(replacement, integration_dir)

    assert (integration_dir / "new-release.py").is_file()
    assert not (integration_dir / "old-release.py").exists()
    assert image.read_bytes() == b"user-owned-image"
    assert integration_dir not in images_dir.parents


async def _setup(hass: HomeAssistant, *, preserve: bool = False) -> MockConfigEntry:
    assert await async_setup_component(hass, DOMAIN, {})
    options: dict[str, Any] = {}
    if preserve:
        options[CONF_PRESERVE_INVENTORY_ON_REMOVAL] = True
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        options=options,
        unique_id=SINGLETON_UNIQUE_ID,
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


# --- WebSocket schema strictness ------------------------------------------


async def test_create_ignores_client_supplied_image(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    # ``image`` is no longer part of the create schema. Whether HA's
    # voluptuous layer silently drops the unknown key or the schema
    # actively rejects it, the invariant we care about holds: the
    # persisted plant carries no client-supplied image record.
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/create",
            "name": "Aloe",
            "image": {
                "id": "deadbeefdeadbeefdeadbeefdeadbeef",
                "content_type": "image/webp",
                "width": 10,
                "height": 10,
                "created_at": "2026-09-05T00:00:00Z",
            },
        }
    )
    response = await client.receive_json()
    if response["success"]:
        assert response["result"]["plant"]["image"] is None
    else:
        assert response["error"]["code"] == "invalid_format"


async def test_update_ignores_client_supplied_image(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")

    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/plants/update",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
            "name": "Aloe Vera",
            "image": {
                "id": "cafebabecafebabecafebabecafebabe",
                "content_type": "image/webp",
                "width": 10,
                "height": 10,
                "created_at": "2026-09-05T00:00:00Z",
            },
        }
    )
    response = await client.receive_json()
    if response["success"]:
        assert response["result"]["plant"]["image"] is None
    else:
        assert response["error"]["code"] == "invalid_format"


# --- Plant delete: file cleanup completes before tombstone clears ---------


async def test_delete_plant_removes_image_file_before_clearing_tombstone(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_client()

    resp = await client.post(
        f"/api/smart_plants/plants/{plant.id}/image?expected_revision={plant.revision}",
        data=_jpeg(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 200
    uploaded = (await resp.json())["plant"]
    image_id = uploaded["image"]["id"]
    file_path = _images_dir(hass) / f"{image_id}.webp"
    assert file_path.is_file()

    await manager.async_delete_plant(plant.id, expected_revision=uploaded["revision"])

    # File is gone AND the tombstone was cleared as part of the same
    # delete path — the manager must not clear the tombstone until the
    # cross-record-safe unlink is complete.
    assert not file_path.is_file()
    assert manager.snapshot.tombstones == ()


async def test_delete_plant_preserves_shared_image_id(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    kept = await manager.async_create_plant(name="Aloe A")
    doomed = await manager.async_create_plant(name="Aloe B")

    # Point both records at the same server-authored image id (simulating
    # a live plant already holding an id another record's stale
    # tombstone would name). Use the manager's private mutate helper so
    # the setup does not depend on any public write path accepting an
    # image; that public path is exactly what #4 forbids.
    shared_id = "abcdef0123456789abcdef0123456789"

    def _seed(snapshot: Any) -> Any:
        plants = dict(snapshot.plants)
        image = PlantImage(
            id=shared_id,
            content_type="image/webp",
            width=10,
            height=10,
            created_at="2026-09-05T00:00:00Z",
        )
        plants[kept.id] = kept.with_next_revision(image=image)
        plants[doomed.id] = doomed.with_next_revision(image=image)
        return type(snapshot)(
            revision=snapshot.revision + 1,
            plants=plants,
            pending_operations=snapshot.pending_operations,
            tombstones=snapshot.tombstones,
        )

    await manager.async_mutate_for_test(_seed)
    images_dir = _images_dir(hass)
    images_dir.mkdir(parents=True, exist_ok=True)
    file_path = images_dir / f"{shared_id}.webp"
    file_path.write_bytes(b"webp")

    doomed_current = manager.get_plant(doomed.id)
    await manager.async_delete_plant(
        doomed.id, expected_revision=doomed_current.revision
    )

    # Shared image id is still referenced by the surviving record, so
    # the unlink must not happen and the tombstone still clears.
    assert file_path.is_file()
    assert manager.snapshot.tombstones == ()
    kept_current = manager.get_plant(kept.id)
    assert kept_current.image is not None
    assert kept_current.image.id == shared_id


@pytest.mark.parametrize("operation", ["delete", "replace"])
async def test_image_mutation_preserves_file_shared_by_another_plant(
    hass: HomeAssistant, operation: str
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    kept = await manager.async_create_plant(name="Aloe A")
    changed = await manager.async_create_plant(name="Aloe B")
    shared_id = "abcdef0123456789abcdef0123456789"
    image = PlantImage(
        id=shared_id,
        content_type="image/webp",
        width=10,
        height=10,
        created_at="2026-09-05T00:00:00Z",
    )

    def _seed(snapshot: Any) -> Any:
        plants = dict(snapshot.plants)
        plants[kept.id] = kept.with_next_revision(image=image)
        plants[changed.id] = changed.with_next_revision(image=image)
        return type(snapshot)(
            revision=snapshot.revision + 1,
            plants=plants,
            pending_operations=snapshot.pending_operations,
            tombstones=snapshot.tombstones,
        )

    await manager.async_mutate_for_test(_seed)
    images_dir = _images_dir(hass)
    images_dir.mkdir(parents=True, exist_ok=True)
    shared_path = images_dir / f"{shared_id}.webp"
    shared_path.write_bytes(b"webp")
    current = manager.get_plant(changed.id)

    if operation == "delete":
        await manager.async_delete_image(changed.id, expected_revision=current.revision)
    else:
        await manager.async_upsert_image(
            changed.id,
            expected_revision=current.revision,
            raw_bytes=_jpeg(),
            declared_content_type="image/jpeg",
        )

    assert shared_path.is_file()
    kept_current = manager.get_plant(kept.id)
    assert kept_current.image is not None
    assert kept_current.image.id == shared_id


# --- Config-entry removal cleans up images by default ---------------------


async def test_default_removal_deletes_images_directory(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    entry = await _setup(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_client()
    resp = await client.post(
        f"/api/smart_plants/plants/{plant.id}/image?expected_revision={plant.revision}",
        data=_jpeg(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 200
    images_dir = _images_dir(hass)
    assert images_dir.is_dir()
    assert any(images_dir.iterdir())

    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()

    assert not images_dir.exists()


async def test_preserve_option_keeps_image_files(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    entry = await _setup(hass, preserve=True)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    client = await hass_client()
    resp = await client.post(
        f"/api/smart_plants/plants/{plant.id}/image?expected_revision={plant.revision}",
        data=_jpeg(),
        headers={"Content-Type": "image/jpeg"},
    )
    assert resp.status == 200
    uploaded = (await resp.json())["plant"]
    image_id = uploaded["image"]["id"]
    file_path = _images_dir(hass) / f"{image_id}.webp"
    assert file_path.is_file()

    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()

    # Preservation is a reinstall aid: the entire directory and every
    # referenced file survive so the next config entry finds them.
    assert file_path.is_file()


# --- Interrupted temp file cleanup ---------------------------------------


async def test_startup_cleans_stale_tmp_files_conservatively(
    hass: HomeAssistant,
) -> None:
    images_dir = _images_dir(hass)
    images_dir.mkdir(parents=True, exist_ok=True)
    stale_id = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    fresh_id = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    unrelated = images_dir / ".not-a-valid-name.tmp"
    stale = images_dir / f".{stale_id}.webp.tmp"
    fresh = images_dir / f".{fresh_id}.webp.tmp"
    stale.write_bytes(b"partial")
    fresh.write_bytes(b"partial")
    unrelated.write_bytes(b"partial")
    old_mtime = time.time() - IMAGE_ORPHAN_GRACE_SECONDS - 3600
    os.utime(stale, (old_mtime, old_mtime))
    os.utime(unrelated, (old_mtime, old_mtime))

    await _setup(hass)

    assert not stale.is_file(), "stale temp file must be reaped"
    assert fresh.is_file(), "fresh temp file must survive (may be in flight)"
    assert unrelated.is_file(), (
        "unrelated dotfile without a valid id/suffix must be left alone"
    )
