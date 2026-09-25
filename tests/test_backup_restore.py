from __future__ import annotations

import io
import shutil
from copy import deepcopy
from pathlib import Path
from typing import Any

from custom_components.smart_plants.const import (
    DOMAIN,
    IMAGE_STORAGE_DIRNAME,
    SINGLETON_UNIQUE_ID,
    STORAGE_KEY,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from homeassistant.core import HomeAssistant
from PIL import Image
from pytest_homeassistant_custom_component.common import MockConfigEntry


def _jpeg() -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (16, 12), (30, 120, 60)).save(output, format="JPEG")
    return output.getvalue()


async def test_documented_config_data_backup_restores_inventory_and_image(
    hass: HomeAssistant, hass_storage: dict[str, Any], tmp_path: Path
) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager: SmartPlantsManager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Backup Aloe", tags=["restore"])
    plant = await manager.async_upsert_image(
        plant.id,
        expected_revision=plant.revision,
        raw_bytes=_jpeg(),
        declared_content_type="image/jpeg",
    )
    assert plant.image is not None

    inventory_path = Path(manager._store.path)
    assert inventory_path == Path(hass.config.path(".storage", STORAGE_KEY))
    images_dir = Path(hass.config.path(IMAGE_STORAGE_DIRNAME))
    image_path = images_dir / f"{plant.image.id}.webp"
    expected_image = image_path.read_bytes()

    # A coherent backup is taken while the integration is unloaded, then only
    # the two documented config-relative data locations are restored.
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    backup = tmp_path / "backup"
    backup.mkdir()
    inventory_backup = deepcopy(hass_storage[STORAGE_KEY])
    shutil.copytree(images_dir, backup / "images")

    del hass_storage[STORAGE_KEY]
    shutil.rmtree(images_dir.parent)
    hass_storage[STORAGE_KEY] = inventory_backup
    images_dir.parent.mkdir(parents=True)
    shutil.copytree(backup / "images", images_dir)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    restored = entry.runtime_data.manager.get_plant(plant.id)
    assert restored.name == "Backup Aloe"
    assert restored.tags == ("restore",)
    assert restored.image == plant.image
    assert image_path.read_bytes() == expected_image
