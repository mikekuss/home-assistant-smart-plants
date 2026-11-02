"""
A failed photo operation followed by a successful one.

When the final save of a photo upload or removal fails, its pending
operation stays in storage. A later successful photo change for the same
plant must settle that operation, and replay after a restart must never
put the older photo back.
"""

from __future__ import annotations

import io
import os
import time
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants.const import (
    DOMAIN,
    IMAGE_ORPHAN_GRACE_SECONDS,
    IMAGE_STORAGE_DIRNAME,
    SINGLETON_UNIQUE_ID,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantRecord
from custom_components.smart_plants.storage import SmartPlantsStorageError
from homeassistant.core import HomeAssistant
from PIL import Image
from pytest_homeassistant_custom_component.common import MockConfigEntry

OLD_IMAGE_ID = "22222222222222222222222222222222"
NEW_IMAGE_ID = "11111111111111111111111111111111"
LATER_IMAGE_ID = "33333333333333333333333333333333"


def _image_dict(image_id: str) -> dict[str, Any]:
    return {
        "id": image_id,
        "content_type": "image/webp",
        "width": 100,
        "height": 80,
        "created_at": "2026-09-05T00:00:00Z",
    }


def _jpeg(color: tuple[int, int, int]) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 48), color).save(buf, format="JPEG")
    return buf.getvalue()


def _webp() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (100, 80), (10, 20, 30)).save(buf, format="WEBP")
    return buf.getvalue()


def _images_dir(hass: HomeAssistant) -> Path:
    return Path(hass.config.path(IMAGE_STORAGE_DIRNAME))


def _image_files(hass: HomeAssistant) -> set[str]:
    return {path.stem for path in _images_dir(hass).iterdir()}


async def _setup_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _restart(hass: HomeAssistant, entry: MockConfigEntry) -> SmartPlantsManager:
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


def _age_all_images(hass: HomeAssistant) -> None:
    """Push every photo file past the orphan grace period."""
    old = time.time() - IMAGE_ORPHAN_GRACE_SECONDS - 3600
    for path in _images_dir(hass).iterdir():
        os.utime(path, (old, old))


def _fail_target_save(manager: SmartPlantsManager) -> Any:
    """Let the next intent save pass and fail the target save after it."""
    real_save = manager._store.async_save
    calls = 0

    async def save(snapshot: Any) -> None:
        nonlocal calls
        calls += 1
        if calls == 2:  # the target save follows the intent
            raise SmartPlantsStorageError("simulated target save failure")
        await real_save(snapshot)

    return patch.object(manager._store, "async_save", side_effect=save)


async def _upload(
    manager: SmartPlantsManager, plant_id: str, color: tuple[int, int, int]
) -> PlantRecord:
    plant = manager.get_plant(plant_id)
    return await manager.async_upsert_image(
        plant_id,
        expected_revision=plant.revision,
        raw_bytes=_jpeg(color),
        declared_content_type="image/jpeg",
    )


async def _plant_with_photo(
    hass: HomeAssistant,
) -> tuple[MockConfigEntry, SmartPlantsManager, str]:
    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    original = await _upload(manager, plant.id, (10, 200, 10))
    assert original.image is not None
    return entry, manager, plant.id


async def test_failed_upload_then_successful_upload_keeps_newer_photo(
    hass: HomeAssistant,
) -> None:
    entry, manager, plant_id = await _plant_with_photo(hass)
    with _fail_target_save(manager), pytest.raises(SmartPlantsStorageError):
        await _upload(manager, plant_id, (200, 10, 10))
    newer = await _upload(manager, plant_id, (10, 10, 200))
    assert newer.image is not None
    assert manager.snapshot.pending_operations == ()

    manager = await _restart(hass, entry)
    assert manager.get_plant(plant_id).image == newer.image

    _age_all_images(hass)
    manager = await _restart(hass, entry)
    assert manager.get_plant(plant_id).image == newer.image
    assert _image_files(hass) == {newer.image.id}


async def test_failed_delete_then_successful_upload_keeps_newer_photo(
    hass: HomeAssistant,
) -> None:
    entry, manager, plant_id = await _plant_with_photo(hass)
    plant = manager.get_plant(plant_id)
    with _fail_target_save(manager), pytest.raises(SmartPlantsStorageError):
        await manager.async_delete_image(plant_id, expected_revision=plant.revision)
    newer = await _upload(manager, plant_id, (10, 10, 200))
    assert newer.image is not None
    assert manager.snapshot.pending_operations == ()

    _age_all_images(hass)
    manager = await _restart(hass, entry)
    assert manager.get_plant(plant_id).image == newer.image
    assert _image_files(hass) == {newer.image.id}


async def test_failed_upload_then_successful_delete_keeps_no_photo(
    hass: HomeAssistant,
) -> None:
    entry, manager, plant_id = await _plant_with_photo(hass)
    with _fail_target_save(manager), pytest.raises(SmartPlantsStorageError):
        await _upload(manager, plant_id, (200, 10, 10))
    plant = manager.get_plant(plant_id)
    deleted = await manager.async_delete_image(
        plant_id, expected_revision=plant.revision
    )
    assert deleted.image is None
    assert manager.snapshot.pending_operations == ()

    _age_all_images(hass)
    manager = await _restart(hass, entry)
    assert manager.get_plant(plant_id).image is None
    assert _image_files(hass) == set()


# --- Storage that already holds a superseded operation ----------------------


def _plant_dict(image_id: str | None, *, revision: int = 2) -> dict[str, Any]:
    return {
        "id": "plt-1",
        "revision": revision,
        "name": "Aloe",
        "created_at": "2026-09-05T00:00:00Z",
        "lifecycle_state": "active",
        "acquired_at": None,
        "species": None,
        "placement": None,
        "tags": [],
        "category": None,
        "image": _image_dict(image_id) if image_id else None,
    }


def _upload_op(
    op_id: str, new_image_id: str, previous_image_id: str | None
) -> dict[str, Any]:
    return {
        "op_id": op_id,
        "kind": "replace_image" if previous_image_id else "create_image",
        "plant_id": "plt-1",
        "requested_at": "2026-09-05T00:00:00Z",
        "expected_revision": 1,
        "payload": {
            "new_image": _image_dict(new_image_id),
            "previous_image_id": previous_image_id,
        },
        "schema_version": 1,
    }


def _delete_op(op_id: str, previous_image_id: str) -> dict[str, Any]:
    return {
        "op_id": op_id,
        "kind": "delete_image",
        "plant_id": "plt-1",
        "requested_at": "2026-09-05T00:00:00Z",
        "expected_revision": 1,
        "payload": {"previous_image_id": previous_image_id},
        "schema_version": 1,
    }


def _seed(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    *,
    plant: dict[str, Any],
    operations: list[dict[str, Any]],
    files: tuple[str, ...],
) -> None:
    hass_storage["smart_plants.inventory"] = {
        "version": 1,
        "minor_version": 2,
        "key": "smart_plants.inventory",
        "data": {
            "revision": 4,
            "plants": [plant],
            "pending_operations": operations,
            "tombstones": [],
        },
    }
    images_dir = _images_dir(hass)
    images_dir.mkdir(parents=True, exist_ok=True)
    for image_id in files:
        (images_dir / f"{image_id}.webp").write_bytes(_webp())


@pytest.mark.parametrize("previous_image_id", [None, OLD_IMAGE_ID])
async def test_replay_skips_upload_superseded_by_a_later_photo(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    previous_image_id: str | None,
) -> None:
    _seed(
        hass,
        hass_storage,
        plant=_plant_dict(LATER_IMAGE_ID),
        operations=[_upload_op("op-stale", NEW_IMAGE_ID, previous_image_id)],
        files=(NEW_IMAGE_ID, LATER_IMAGE_ID),
    )

    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    image = manager.get_plant("plt-1").image
    assert image is not None
    assert image.id == LATER_IMAGE_ID
    assert manager.snapshot.pending_operations == ()
    assert _image_files(hass) == {LATER_IMAGE_ID}


async def test_replay_skips_delete_superseded_by_a_later_photo(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    _seed(
        hass,
        hass_storage,
        plant=_plant_dict(LATER_IMAGE_ID),
        operations=[_delete_op("op-stale-delete", OLD_IMAGE_ID)],
        files=(LATER_IMAGE_ID,),
    )

    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    image = manager.get_plant("plt-1").image
    assert image is not None
    assert image.id == LATER_IMAGE_ID
    assert manager.snapshot.pending_operations == ()
    assert _image_files(hass) == {LATER_IMAGE_ID}


async def test_replay_finishes_only_the_latest_of_two_pending_uploads(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    # Both target saves failed; the later request is the one to finish.
    _seed(
        hass,
        hass_storage,
        plant=_plant_dict(OLD_IMAGE_ID, revision=1),
        operations=[
            _upload_op("op-earlier", NEW_IMAGE_ID, OLD_IMAGE_ID),
            _upload_op("op-later", LATER_IMAGE_ID, OLD_IMAGE_ID),
        ],
        files=(OLD_IMAGE_ID, NEW_IMAGE_ID, LATER_IMAGE_ID),
    )

    entry = await _setup_entry(hass)
    manager: SmartPlantsManager = entry.runtime_data.manager

    image = manager.get_plant("plt-1").image
    assert image is not None
    assert image.id == LATER_IMAGE_ID
    assert manager.snapshot.pending_operations == ()
    assert _image_files(hass) == {LATER_IMAGE_ID}
