"""
Startup-replay and orphan-cleanup coverage for the image lifecycle.

These tests seed ``hass_storage`` and (where relevant) the on-disk
images directory to simulate a crash between the intent publish and
the follow-up side effect, then boot the integration and check that
the reconciler puts the world back into a consistent state.
"""

from __future__ import annotations

import io
import os
import time
from pathlib import Path
from typing import Any

import pytest
from custom_components.smart_plants.const import (
    DOMAIN,
    IMAGE_ORPHAN_GRACE_SECONDS,
    IMAGE_STORAGE_DIRNAME,
    SINGLETON_UNIQUE_ID,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from homeassistant.core import HomeAssistant
from PIL import Image
from pytest_homeassistant_custom_component.common import MockConfigEntry


def _webp_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (100, 80), (10, 20, 30)).save(buf, format="WEBP")
    return buf.getvalue()


async def _setup_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _images_dir(hass: HomeAssistant) -> Path:
    return Path(hass.config.path(IMAGE_STORAGE_DIRNAME))


def _plant_dict(
    plant_id: str,
    *,
    image: dict[str, Any] | None,
    revision: int = 1,
) -> dict[str, Any]:
    return {
        "id": plant_id,
        "revision": revision,
        "name": "Aloe",
        "created_at": "2026-09-05T00:00:00Z",
        "lifecycle_state": "active",
        "acquired_at": None,
        "species": None,
        "placement": None,
        "tags": [],
        "category": None,
        "image": image,
    }


def _seed_storage(hass_storage: dict[str, Any], data: dict[str, Any]) -> None:
    hass_storage["smart_plants.inventory"] = {
        "version": 1,
        "minor_version": 2,
        "key": "smart_plants.inventory",
        "data": data,
    }


NEW_IMAGE_ID = "11111111111111111111111111111111"
OLD_IMAGE_ID = "22222222222222222222222222222222"
NEW_IMAGE_DICT: dict[str, Any] = {
    "id": NEW_IMAGE_ID,
    "content_type": "image/webp",
    "width": 100,
    "height": 80,
    "created_at": "2026-09-05T00:00:00Z",
}
OLD_IMAGE_DICT: dict[str, Any] = {
    "id": OLD_IMAGE_ID,
    "content_type": "image/webp",
    "width": 50,
    "height": 40,
    "created_at": "2026-09-04T00:00:00Z",
}


async def test_replay_completes_upload_when_file_present(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # State: plant record was NOT yet advanced, but the new file made
    # it to disk. Replay must attach the record and drop the op.
    _seed_storage(
        hass_storage,
        {
            "revision": 2,
            "plants": [_plant_dict("plt-1", image=None)],
            "pending_operations": [
                {
                    "op_id": "op-create",
                    "kind": "create_image",
                    "plant_id": "plt-1",
                    "requested_at": "2026-09-05T00:00:00Z",
                    "expected_revision": 1,
                    "payload": {
                        "new_image": NEW_IMAGE_DICT,
                        "previous_image_id": None,
                    },
                    "schema_version": 1,
                }
            ],
            "tombstones": [],
        },
    )
    images_dir = _images_dir(hass)
    images_dir.mkdir(parents=True, exist_ok=True)
    (images_dir / f"{NEW_IMAGE_ID}.webp").write_bytes(_webp_bytes())

    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    plant = manager.get_plant("plt-1")
    assert plant.image is not None
    assert plant.image.id == NEW_IMAGE_ID
    assert manager.snapshot.pending_operations == ()


async def test_replay_drops_upload_op_when_file_missing(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # State: intent published, but the file write never landed. Replay
    # rolls back by dropping the op; the record was never advanced.
    _seed_storage(
        hass_storage,
        {
            "revision": 2,
            "plants": [_plant_dict("plt-1", image=None)],
            "pending_operations": [
                {
                    "op_id": "op-create",
                    "kind": "create_image",
                    "plant_id": "plt-1",
                    "requested_at": "2026-09-05T00:00:00Z",
                    "expected_revision": 1,
                    "payload": {
                        "new_image": NEW_IMAGE_DICT,
                        "previous_image_id": None,
                    },
                    "schema_version": 1,
                }
            ],
            "tombstones": [],
        },
    )

    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    plant = manager.get_plant("plt-1")
    assert plant.image is None
    assert manager.snapshot.pending_operations == ()


async def test_replay_replace_cleans_up_previous_file(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # State: new file present, record still points at previous image.
    # Replay must attach new image and delete previous file.
    _seed_storage(
        hass_storage,
        {
            "revision": 2,
            "plants": [_plant_dict("plt-1", image=OLD_IMAGE_DICT)],
            "pending_operations": [
                {
                    "op_id": "op-replace",
                    "kind": "replace_image",
                    "plant_id": "plt-1",
                    "requested_at": "2026-09-05T00:00:00Z",
                    "expected_revision": 1,
                    "payload": {
                        "new_image": NEW_IMAGE_DICT,
                        "previous_image_id": OLD_IMAGE_ID,
                    },
                    "schema_version": 1,
                }
            ],
            "tombstones": [],
        },
    )
    images_dir = _images_dir(hass)
    images_dir.mkdir(parents=True, exist_ok=True)
    (images_dir / f"{NEW_IMAGE_ID}.webp").write_bytes(_webp_bytes())
    (images_dir / f"{OLD_IMAGE_ID}.webp").write_bytes(_webp_bytes())

    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    plant = manager.get_plant("plt-1")
    assert plant.image is not None
    assert plant.image.id == NEW_IMAGE_ID
    assert manager.snapshot.pending_operations == ()
    assert (images_dir / f"{NEW_IMAGE_ID}.webp").is_file()
    assert not (images_dir / f"{OLD_IMAGE_ID}.webp").is_file()


async def test_replay_delete_image_removes_file_and_advances_record(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # State: intent published for delete_image, target not yet published.
    # Record still holds the image; the file is still on disk.
    _seed_storage(
        hass_storage,
        {
            "revision": 2,
            "plants": [_plant_dict("plt-1", image=OLD_IMAGE_DICT)],
            "pending_operations": [
                {
                    "op_id": "op-del",
                    "kind": "delete_image",
                    "plant_id": "plt-1",
                    "requested_at": "2026-09-05T00:00:00Z",
                    "expected_revision": 1,
                    "payload": {"previous_image_id": OLD_IMAGE_ID},
                    "schema_version": 1,
                }
            ],
            "tombstones": [],
        },
    )
    images_dir = _images_dir(hass)
    images_dir.mkdir(parents=True, exist_ok=True)
    (images_dir / f"{OLD_IMAGE_ID}.webp").write_bytes(_webp_bytes())

    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    plant = manager.get_plant("plt-1")
    assert plant.image is None
    assert manager.snapshot.pending_operations == ()
    assert not (images_dir / f"{OLD_IMAGE_ID}.webp").is_file()


async def test_orphan_cleanup_respects_grace_period(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # A file unreferenced by any plant. If it is younger than the
    # grace period, it must survive; if older, it must be removed.
    _seed_storage(
        hass_storage,
        {
            "revision": 1,
            "plants": [_plant_dict("plt-1", image=None)],
            "pending_operations": [],
            "tombstones": [],
        },
    )
    images_dir = _images_dir(hass)
    images_dir.mkdir(parents=True, exist_ok=True)
    fresh_id = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    stale_id = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    fresh = images_dir / f"{fresh_id}.webp"
    stale = images_dir / f"{stale_id}.webp"
    fresh.write_bytes(_webp_bytes())
    stale.write_bytes(_webp_bytes())
    now = time.time()
    old_mtime = now - IMAGE_ORPHAN_GRACE_SECONDS - 3600
    os.utime(stale, (old_mtime, old_mtime))

    await _setup_entry(hass)

    assert fresh.is_file()  # still within grace
    assert not stale.is_file()  # reaped


async def test_tombstone_never_deletes_image_still_referenced(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # A tombstone that names an image id which is still referenced by
    # another live plant record must NOT unlink the shared file. This is
    # the cross-record validation that stops one plant's stale
    # deletion from destroying a reused id.
    shared_id = OLD_IMAGE_ID
    _seed_storage(
        hass_storage,
        {
            "revision": 3,
            "plants": [
                _plant_dict("plt-live", image=OLD_IMAGE_DICT, revision=1),
            ],
            "pending_operations": [],
            "tombstones": [
                {
                    "plant_id": "plt-deleted",
                    "deleted_at": "2026-09-05T00:00:00Z",
                    "payload": {"image_id": shared_id},
                    "schema_version": 1,
                }
            ],
        },
    )
    images_dir = _images_dir(hass)
    images_dir.mkdir(parents=True, exist_ok=True)
    (images_dir / f"{shared_id}.webp").write_bytes(_webp_bytes())

    await _setup_entry(hass)

    # File survives because the live plant still references it.
    assert (images_dir / f"{shared_id}.webp").is_file()


async def test_orphaned_upsert_never_deletes_image_still_referenced(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed_storage(
        hass_storage,
        {
            "revision": 3,
            "plants": [_plant_dict("plt-live", image=NEW_IMAGE_DICT)],
            "pending_operations": [
                {
                    "op_id": "op-deleted-owner",
                    "kind": "create_image",
                    "plant_id": "plt-deleted",
                    "requested_at": "2026-09-05T00:00:00Z",
                    "expected_revision": 1,
                    "payload": {
                        "new_image": NEW_IMAGE_DICT,
                        "previous_image_id": None,
                    },
                    "schema_version": 1,
                }
            ],
            "tombstones": [],
        },
    )
    images_dir = _images_dir(hass)
    images_dir.mkdir(parents=True, exist_ok=True)
    shared = images_dir / f"{NEW_IMAGE_ID}.webp"
    shared.write_bytes(_webp_bytes())

    entry = await _setup_entry(hass)

    assert shared.is_file()
    assert entry.runtime_data.manager.snapshot.pending_operations == ()


@pytest.mark.parametrize("preexisting", [True, False])
async def test_images_directory_is_outside_custom_components(
    hass: HomeAssistant,
    *,
    preexisting: bool,
) -> None:
    # HACS-layout smoke test: creating and using the images dir must
    # never require anything inside custom_components/, so an update
    # that replaces the integration directory leaves the store alone.
    if preexisting:
        (Path(hass.config.path(IMAGE_STORAGE_DIRNAME))).mkdir(
            parents=True, exist_ok=True
        )

    await _setup_entry(hass)
    images_dir = _images_dir(hass)
    assert images_dir.is_dir()

    resolved = images_dir.resolve()
    # The path must live under the HA config directory and NOT under
    # any custom_components subtree.
    assert "custom_components" not in resolved.parts
    assert str(resolved).startswith(str(Path(hass.config.config_dir).resolve()))
