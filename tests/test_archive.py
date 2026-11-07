"""Retiring plants: storage, manager, devices and entities, photos, WebSocket."""

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
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.smart_plants.manager import (
    SmartPlantsArchiveBusyError,
    SmartPlantsArchiveFullError,
    SmartPlantsManager,
    SmartPlantsPlantNotFoundError,
    SmartPlantsRevisionConflictError,
)
from custom_components.smart_plants.models import (
    ArchivedPlant,
    PendingOperation,
    PlantRecord,
)
from custom_components.smart_plants.storage import (
    SmartPlantsInvalidStorageError,
    SmartPlantsStorageError,
    SmartPlantsStore,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from PIL import Image
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import (
    ClientSessionGenerator,
    WebSocketGenerator,
)

from tests.helpers import plant_device

MOISTURE = "sensor.mock_moisture"
TEMPERATURE = "sensor.mock_temperature"


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    assert await async_setup_component(hass, DOMAIN, {})
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _manager(entry: MockConfigEntry) -> SmartPlantsManager:
    manager: SmartPlantsManager = entry.runtime_data.manager
    return manager


def _sensors(hass: HomeAssistant) -> None:
    hass.states.async_set(MOISTURE, "30", {"unit_of_measurement": "%"})
    hass.states.async_set(TEMPERATURE, "21", {"unit_of_measurement": "°C"})


def _webp() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (64, 48), (10, 120, 30)).save(buffer, format="WEBP")
    return buffer.getvalue()


def _images_dir(hass: HomeAssistant) -> Path:
    return Path(hass.config.path(IMAGE_STORAGE_DIRNAME))


def _own_entities(hass: HomeAssistant, plant_id: str) -> list[er.RegistryEntry]:
    return [
        entry
        for entry in er.async_get(hass).entities.values()
        if entry.platform == DOMAIN
        and entry.unique_id.startswith(f"{DOMAIN}:{plant_id}:")
    ]


async def _plant(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    name: str = "Basil",
    *,
    area_id: str | None = None,
    photo: bool = False,
) -> PlantRecord:
    """Create a plant with a moisture and a temperature sensor."""
    _sensors(hass)
    manager = _manager(entry)
    plant = await manager.async_create_plant(name=name, area_id=area_id)
    plant = await manager.async_set_moisture_sources(
        plant.id, expected_revision=plant.revision, sources=[{"entity_id": MOISTURE}]
    )
    plant = await manager.async_set_role_sources(
        plant.id,
        role="temperature",
        expected_revision=plant.revision,
        sources=[{"entity_id": TEMPERATURE}],
    )
    if photo:
        plant = await manager.async_upsert_image(
            plant.id,
            expected_revision=plant.revision,
            raw_bytes=_webp(),
            declared_content_type="image/webp",
        )
    await hass.async_block_till_done()
    return plant


# --- Storage -----------------------------------------------------------------


def _stored(minor: int, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": STORAGE_KEY,
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": minor,
        "data": data,
    }


def _archived_dict(plant_id: str = "old") -> dict[str, Any]:
    return ArchivedPlant(
        id=plant_id,
        revision=3,
        name="Basil",
        created_at="2026-01-01T00:00:00Z",
        archived_at="2026-10-01T00:00:00Z",
    ).as_storage()


async def test_minor_seventeen_migrates_to_an_empty_archive(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    plant = PlantRecord(
        id="p", revision=1, name="Aloe", created_at="2026-01-01T00:00:00Z"
    ).as_storage()
    hass_storage[STORAGE_KEY] = _stored(
        17,
        {"revision": 1, "plants": [plant], "pending_operations": [], "tombstones": []},
    )
    snapshot = await SmartPlantsStore(hass).async_load()
    assert STORAGE_MINOR_VERSION == 18
    assert dict(snapshot.archived_plants) == {}
    assert set(snapshot.plants) == {"p"}
    assert hass_storage[STORAGE_KEY]["data"]["archived_plants"] == []


async def test_older_minor_with_retired_plants_fails_closed(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[STORAGE_KEY] = _stored(
        17,
        {
            "revision": 1,
            "plants": [],
            "pending_operations": [],
            "tombstones": [],
            "archived_plants": [_archived_dict()],
        },
    )
    with pytest.raises(SmartPlantsInvalidStorageError, match="retired"):
        await SmartPlantsStore(hass).async_load()


async def test_current_minor_requires_the_archive(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[STORAGE_KEY] = _stored(
        STORAGE_MINOR_VERSION,
        {"revision": 1, "plants": [], "pending_operations": [], "tombstones": []},
    )
    with pytest.raises(SmartPlantsInvalidStorageError, match="retired plants"):
        await SmartPlantsStore(hass).async_load()


async def test_current_minor_round_trips_a_retired_plant(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    record = _archived_dict()
    record["sources"] = {"moisture": [{"entity_id": MOISTURE, "registry_id": None}]}
    record["area_name"] = "Kitchen"
    hass_storage[STORAGE_KEY] = _stored(
        STORAGE_MINOR_VERSION,
        {
            "revision": 1,
            "plants": [],
            "pending_operations": [],
            "tombstones": [],
            "archived_plants": [record],
        },
    )
    snapshot = await SmartPlantsStore(hass).async_load()
    assert snapshot.archived_plants["old"].as_storage() == record


@pytest.mark.parametrize(
    ("change", "match"),
    [
        ({"sources": {"no_such_role": [{"entity_id": MOISTURE}]}}, "unknown role"),
        ({"sources": {"moisture": [{"entity_id": "light.mock"}]}}, "entity_id"),
        ({"sources": {"moisture": []}}, "non-empty"),
        ({"area_name": " Kitchen"}, "area_name"),
        ({"thresholds": {}}, "unsupported"),
    ],
)
async def test_invalid_retired_plants_fail_closed(
    hass: HomeAssistant,
    hass_storage: dict[str, Any],
    change: dict[str, Any],
    match: str,
) -> None:
    hass_storage[STORAGE_KEY] = _stored(
        STORAGE_MINOR_VERSION,
        {
            "revision": 1,
            "plants": [],
            "pending_operations": [],
            "tombstones": [],
            "archived_plants": [{**_archived_dict(), **change}],
        },
    )
    with pytest.raises(SmartPlantsInvalidStorageError, match=match):
        await SmartPlantsStore(hass).async_load()


async def test_a_plant_cannot_be_live_and_retired(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    plant = PlantRecord(
        id="old", revision=1, name="Basil", created_at="2026-01-01T00:00:00Z"
    ).as_storage()
    hass_storage[STORAGE_KEY] = _stored(
        STORAGE_MINOR_VERSION,
        {
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
            "archived_plants": [_archived_dict()],
        },
    )
    with pytest.raises(SmartPlantsInvalidStorageError, match="live and retired"):
        await SmartPlantsStore(hass).async_load()


# --- Retire ------------------------------------------------------------------


async def test_retire_removes_device_and_entities_and_keeps_the_record(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    area = ar.async_get(hass).async_create("Kitchen")
    plant = await _plant(hass, entry, area_id=area.id)
    device = plant_device(dr.async_get(hass), plant.id)
    assert device is not None
    assert _own_entities(hass, plant.id)

    record = await manager.async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    await hass.async_block_till_done()

    assert plant_device(dr.async_get(hass), plant.id) is None
    assert _own_entities(hass, plant.id) == []
    assert plant.id not in manager.snapshot.plants
    assert manager.snapshot.tombstones == ()
    assert manager.list_plants() == ()
    assert manager.get_archived(plant.id) == record
    assert record.name == "Basil"
    assert record.area_id == area.id
    assert record.area_name == "Kitchen"
    assert record.device_id == device.id
    assert {
        role: [s.entity_id for s in items] for role, items in record.sources.items()
    } == {
        "moisture": [MOISTURE],
        "temperature": [TEMPERATURE],
    }
    last = record.care_events[-1]
    assert last.kind == "note"
    assert last.payload["text"] == "Retired"
    assert manager.archived_by_device(device.id) == record


async def test_retire_writes_the_note_in_german(hass: HomeAssistant) -> None:
    hass.config.language = "de"
    entry = await _setup(hass)
    plant = await _plant(hass, entry)
    record = await _manager(entry).async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    assert record.care_events[-1].payload["text"] == "Archiviert"


async def test_a_new_plant_gets_the_clean_entity_ids_and_the_sensor(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(hass, entry)
    before = {item.entity_id for item in _own_entities(hass, plant.id)}
    await manager.async_archive_plant(plant.id, expected_revision=plant.revision)
    await hass.async_block_till_done()

    replacement = await _plant(hass, entry)
    after = {item.entity_id for item in _own_entities(hass, replacement.id)}
    assert after == before
    assert replacement.moisture.sources[0].entity_id == MOISTURE


async def test_retire_checks_the_revision(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    plant = await _plant(hass, entry)
    with pytest.raises(SmartPlantsRevisionConflictError):
        await _manager(entry).async_archive_plant(
            plant.id, expected_revision=plant.revision - 1
        )
    with pytest.raises(SmartPlantsPlantNotFoundError):
        await _manager(entry).async_archive_plant("missing", expected_revision=1)


async def test_retire_waits_for_an_unfinished_change(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(hass, entry)
    await manager.async_record_pending_operation(
        PendingOperation(
            op_id="op-1",
            kind="update_plant",
            plant_id=plant.id,
            requested_at="2026-10-01T00:00:00Z",
        )
    )
    with pytest.raises(SmartPlantsArchiveBusyError):
        await manager.async_archive_plant(plant.id, expected_revision=plant.revision)
    assert plant.id in manager.snapshot.plants


async def test_retire_refuses_a_full_archive(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    first = await _plant(hass, entry)
    second = await _plant(hass, entry, "Mint")
    await manager.async_archive_plant(first.id, expected_revision=first.revision)
    with (
        patch("custom_components.smart_plants.manager.COLLECTION_MAX_COUNT", 1),
        pytest.raises(SmartPlantsArchiveFullError),
    ):
        await manager.async_archive_plant(second.id, expected_revision=second.revision)
    assert second.id in manager.snapshot.plants


async def test_a_failed_save_leaves_the_plant_live(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(hass, entry)
    with (
        patch.object(
            SmartPlantsStore,
            "async_save",
            side_effect=SmartPlantsStorageError("disk full"),
        ),
        pytest.raises(SmartPlantsStorageError),
    ):
        await manager.async_archive_plant(plant.id, expected_revision=plant.revision)
    assert manager.get_plant(plant.id) == plant
    assert dict(manager.snapshot.archived_plants) == {}
    assert plant_device(dr.async_get(hass), plant.id) is not None


async def test_device_removal_resumes_after_a_restart(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(hass, entry, photo=True)
    with patch.object(SmartPlantsManager, "_async_finish_removal"):
        await manager.async_archive_plant(plant.id, expected_revision=plant.revision)
    assert [item.plant_id for item in manager.snapshot.tombstones] == [plant.id]

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    manager = _manager(entry)
    assert plant_device(dr.async_get(hass), plant.id) is None
    assert _own_entities(hass, plant.id) == []
    assert manager.snapshot.tombstones == ()
    record = manager.get_archived(plant.id)
    assert record.image is not None
    assert (_images_dir(hass) / f"{record.image.id}.webp").is_file()


async def test_orphan_cleanup_keeps_a_retired_photo(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(hass, entry, photo=True)
    assert plant.image is not None
    record = await manager.async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    assert record.image == plant.image
    path = _images_dir(hass) / f"{plant.image.id}.webp"
    old = time.time() - IMAGE_ORPHAN_GRACE_SECONDS - 3600
    os.utime(path, (old, old))

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    assert path.is_file()


async def test_retired_plants_leave_counts_and_diagnostics_stay_plain(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(hass, entry)
    await _plant(hass, entry, "Mint")
    await manager.async_archive_plant(plant.id, expected_revision=plant.revision)
    await hass.async_block_till_done()

    assert [item.name for item in manager.list_plants()] == ["Mint"]
    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    inventory = diagnostics["inventory"]
    assert inventory["plant_count"] == 1
    assert inventory["archived_count"] == 1
    text = str(diagnostics)
    assert "Basil" not in text
    assert "Retired" not in text


# --- Restore -----------------------------------------------------------------


async def test_restore_brings_the_plant_back_with_its_sensors(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    area = ar.async_get(hass).async_create("Kitchen")
    plant = await _plant(hass, entry, area_id=area.id, photo=True)
    entity_ids = {item.entity_id for item in _own_entities(hass, plant.id)}
    record = await manager.async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    await hass.async_block_till_done()

    check = manager.restore_check(plant.id)
    assert check == {
        "name_taken": False,
        "suggested_name": "Basil",
        "sources_in_use": [],
        "sources_missing": [],
        "area_missing": False,
        "blocked": None,
    }
    restored = await manager.async_restore_plant(
        plant.id,
        expected_revision=record.revision,
        name="Basil",
        include_sources_in_use=False,
    )
    await hass.async_block_till_done()

    assert restored.id == plant.id
    assert restored.image == plant.image
    assert restored.moisture.sources[0].entity_id == MOISTURE
    temperature = restored.role_config("temperature")
    assert temperature is not None
    assert temperature.sources[0].entity_id == TEMPERATURE
    assert [event.payload["text"] for event in restored.care_events[-2:]] == [
        "Retired",
        "Restored",
    ]
    assert restored.care_tasks == ()
    assert plant.id not in manager.snapshot.archived_plants
    device = plant_device(dr.async_get(hass), plant.id)
    assert device is not None
    assert device.area_id == area.id
    assert {item.entity_id for item in _own_entities(hass, plant.id)} == entity_ids
    assert manager.snapshot.pending_operations == ()


async def test_restore_check_reports_conflicts(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    area = ar.async_get(hass).async_create("Kitchen")
    plant = await _plant(hass, entry, area_id=area.id)
    await manager.async_archive_plant(plant.id, expected_revision=plant.revision)
    await hass.async_block_till_done()
    await _plant(hass, entry)  # the replacement takes both sensors and the name
    hass.states.async_remove(TEMPERATURE)
    ar.async_get(hass).async_delete(area.id)

    check = manager.restore_check(plant.id)
    assert check["name_taken"] is True
    assert check["suggested_name"] == "Basil 2"
    assert check["sources_in_use"] == [
        {"role": "moisture", "entity_id": MOISTURE, "plants": ["Basil"]}
    ]
    assert check["sources_missing"] == [
        {"role": "temperature", "entity_id": TEMPERATURE}
    ]
    assert check["area_missing"] is True
    assert check["blocked"] is None


@pytest.mark.parametrize("include", [False, True])
async def test_restore_leaves_sensors_in_use_unless_asked(
    hass: HomeAssistant, *, include: bool
) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(hass, entry)
    record = await manager.async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    await hass.async_block_till_done()
    await _plant(hass, entry)

    restored = await manager.async_restore_plant(
        plant.id,
        expected_revision=record.revision,
        name="Basil 2",
        include_sources_in_use=include,
    )
    assert restored.name == "Basil 2"
    assert bool(restored.moisture.sources) is include
    await hass.async_block_till_done()
    entity_ids = {item.entity_id for item in _own_entities(hass, plant.id)}
    assert "sensor.basil_2_soil_moisture" in entity_ids


async def test_restore_checks_revision_and_limits(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(hass, entry)
    record = await manager.async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_restore_plant(
            plant.id,
            expected_revision=record.revision + 1,
            name="Basil",
            include_sources_in_use=False,
        )
    await _plant(hass, entry, "Mint")
    with (
        patch("custom_components.smart_plants.manager.COLLECTION_MAX_COUNT", 1),
        pytest.raises(Exception, match="at most 1 plants"),
    ):
        await manager.async_restore_plant(
            plant.id,
            expected_revision=record.revision,
            name="Basil",
            include_sources_in_use=False,
        )
    assert plant.id in manager.snapshot.archived_plants


async def test_restore_waits_for_the_device_cleanup(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(hass, entry)
    with patch.object(SmartPlantsManager, "_async_finish_removal"):
        record = await manager.async_archive_plant(
            plant.id, expected_revision=plant.revision
        )
    assert manager.restore_check(plant.id)["blocked"] == "busy"
    with pytest.raises(SmartPlantsArchiveBusyError):
        await manager.async_restore_plant(
            plant.id,
            expected_revision=record.revision,
            name="Basil",
            include_sources_in_use=False,
        )
    with pytest.raises(SmartPlantsArchiveBusyError):
        await manager.async_delete_archived(plant.id, expected_revision=record.revision)


# --- Delete for good ---------------------------------------------------------


async def test_delete_for_good_removes_the_record_and_the_photo(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = _manager(entry)
    plant = await _plant(hass, entry, photo=True)
    assert plant.image is not None
    path = _images_dir(hass) / f"{plant.image.id}.webp"
    record = await manager.async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    assert path.is_file()
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_delete_archived(
            plant.id, expected_revision=record.revision + 1
        )

    await manager.async_delete_archived(plant.id, expected_revision=record.revision)

    assert dict(manager.snapshot.archived_plants) == {}
    assert manager.snapshot.tombstones == ()
    assert not path.is_file()


# --- WebSocket and HTTP ------------------------------------------------------


async def test_websocket_retire_list_get_restore_delete(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    entry = await _setup(hass)
    plant = await _plant(hass, entry)
    client = await hass_ws_client(hass)

    async def call(payload: dict[str, Any]) -> dict[str, Any]:
        await client.send_json_auto_id(payload)
        response: dict[str, Any] = await client.receive_json()
        return response

    response = await call(
        {
            "type": "smart_plants/plants/archive",
            "plant_id": plant.id,
            "expected_revision": plant.revision,
        }
    )
    assert response["success"], response
    summary = response["result"]["archived"]
    assert summary["name"] == "Basil"
    assert summary["event_count"] == 1

    listed = await call({"type": "smart_plants/plants/list"})
    assert listed["result"] == {"plants": [], "archived_count": 1}
    archive = await call({"type": "smart_plants/archive/list"})
    assert [item["id"] for item in archive["result"]["plants"]] == [plant.id]
    detail = await call({"type": "smart_plants/archive/get", "plant_id": plant.id})
    view = detail["result"]["plant"]
    assert view["sources"] == {"moisture": [MOISTURE], "temperature": [TEMPERATURE]}
    assert [event["kind"] for event in view["events"]] == ["note"]
    check = await call(
        {"type": "smart_plants/archive/restore_check", "plant_id": plant.id}
    )
    assert check["result"]["blocked"] is None

    restored = await call(
        {
            "type": "smart_plants/archive/restore",
            "plant_id": plant.id,
            "expected_revision": summary["revision"],
            "name": "Basil",
        }
    )
    assert restored["success"], restored
    current = restored["result"]["plant"]
    again = await call(
        {
            "type": "smart_plants/plants/archive",
            "plant_id": plant.id,
            "expected_revision": current["revision"],
        }
    )
    stale = await call(
        {
            "type": "smart_plants/archive/delete",
            "plant_id": plant.id,
            "expected_revision": 1,
        }
    )
    assert stale["error"]["code"] == "revision_conflict"
    deleted = await call(
        {
            "type": "smart_plants/archive/delete",
            "plant_id": plant.id,
            "expected_revision": again["result"]["archived"]["revision"],
        }
    )
    assert deleted["success"], deleted
    missing = await call({"type": "smart_plants/archive/get", "plant_id": plant.id})
    assert missing["error"]["code"] == "not_found"


async def test_card_info_is_open_to_every_signed_in_user(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    entry = await _setup(hass)
    plant = await _plant(hass, entry, photo=True)
    device = plant_device(dr.async_get(hass), plant.id)
    assert device is not None
    await _manager(entry).async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await client.send_json_auto_id(
        {"type": "smart_plants/archive/card_info", "device_id": device.id}
    )
    response = await client.receive_json()
    assert response["result"] == {
        "plant_id": plant.id,
        "name": "Basil",
        "image_id": plant.image.id if plant.image else None,
    }
    await client.send_json_auto_id(
        {"type": "smart_plants/archive/card_info", "device_id": "unknown"}
    )
    response = await client.receive_json()
    assert response["error"]["code"] == "not_found"


async def test_retired_photo_can_be_read_but_not_changed(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    entry = await _setup(hass)
    plant = await _plant(hass, entry, photo=True)
    await _manager(entry).async_archive_plant(
        plant.id, expected_revision=plant.revision
    )
    client = await hass_client()
    url = f"/api/smart_plants/plants/{plant.id}/image"

    response = await client.get(url)
    assert response.status == 200
    assert response.content_type == "image/webp"
    response = await client.post(
        f"{url}?expected_revision=1",
        data=_webp(),
        headers={"Content-Type": "image/webp"},
    )
    assert response.status == 404
    response = await client.delete(f"{url}?expected_revision=1")
    assert response.status == 404
