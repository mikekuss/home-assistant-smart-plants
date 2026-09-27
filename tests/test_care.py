"""Durable manual watering and fail-closed care migration."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta, timezone
from typing import Any
from unittest.mock import patch
from uuid import uuid4

import pytest
from custom_components.smart_plants.care import (
    MAX_CARE_EVENTS,
    CareEvent,
    care_summary,
    ordered_events,
    parse_occurred_at,
)
from custom_components.smart_plants.const import STORAGE_KEY, STORAGE_MINOR_VERSION
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsRevisionConflictError,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import InventorySnapshot, PlantRecord
from custom_components.smart_plants.storage import (
    SmartPlantsInvalidStorageError,
    SmartPlantsStorageError,
    SmartPlantsStore,
    _snapshot_from_payload,
)
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from .test_websocket_api import _setup


def _event(occurred: str = "2026-01-01T00:30:00+02:00") -> dict[str, Any]:
    return {
        "schema_version": 1,
        "id": "e6e6553a-f34c-4d88-864c-c94a74f97dfa",
        "kind": "watering",
        "provenance": "manual",
        "occurred_at": occurred,
        "local_date": occurred[:10],
        "created_at": "2026-01-03T00:00:00Z",
        "updated_at": "2026-01-03T00:00:00Z",
        "payload": {"note": None},
    }


def test_local_date_and_corrupt_events_fail_closed() -> None:
    row = _event()
    event = CareEvent.from_storage(row)
    assert event.local_date == "2026-01-01"
    assert (
        parse_occurred_at(event.occurred_at).astimezone(UTC).date().isoformat()
        == "2025-12-31"
    )
    assert care_summary((event,)) == {
        "watering_count": 1,
        "last_watered_at": event.occurred_at,
        "last_watered_local_date": "2026-01-01",
    }
    for alteration in (
        {"local_date": "2025-12-31"},
        {"schema_version": 2},
        {"kind": "fertilizing"},
        {"provenance": "provider"},
        {"occurred_at": "2026-01-01T00:30:00"},
        {"payload": {"note": None, "amount": 10}},
    ):
        with pytest.raises(
            ValueError, match=r"care event|occurred_at|unsupported|payload"
        ):
            CareEvent.from_storage({**row, **alteration})
    with pytest.raises(ValueError, match="note"):
        CareEvent.from_storage({**row, "payload": {"note": " "}})


def test_missing_duplicate_and_oversized_history_refused() -> None:
    plant = PlantRecord(
        id="p", revision=1, name="Aloe", created_at="2026-01-01T00:00:00Z"
    ).as_storage()
    inventory = (
        InventorySnapshot(revision=1)
        .with_plant(PlantRecord.from_storage(plant))
        .as_storage()
    )
    del inventory["plants"][0]["care_events"]
    with pytest.raises(SmartPlantsInvalidStorageError, match="care_events"):
        _snapshot_from_payload(inventory, require_roles=True)
    inventory["plants"][0]["care_events"] = [_event(), _event()]
    with pytest.raises(SmartPlantsInvalidStorageError, match="duplicate"):
        _snapshot_from_payload(inventory, require_roles=True)
    inventory["plants"][0]["care_events"] = [_event()] * (MAX_CARE_EVENTS + 1)
    with pytest.raises(SmartPlantsInvalidStorageError, match="limit"):
        _snapshot_from_payload(inventory, require_roles=True)


def test_summary_orders_by_instant_not_local_calendar_date() -> None:
    first = CareEvent.from_storage(_event("2026-01-01T00:30:00+02:00"))
    second_row = _event("2025-12-31T23:45:00Z")
    second_row["id"] = "d4dab649-96a8-4daa-baa1-0a5b310cbfd7"
    second = CareEvent.from_storage(second_row)
    assert ordered_events((first, second)) == [second, first]
    assert care_summary((first, second))["last_watered_local_date"] == "2025-12-31"


def test_equal_instant_order_uses_ascending_event_id() -> None:
    lower_id = _event("2026-01-01T00:30:00+02:00")
    lower_id["id"] = "11111111-1111-4111-8111-111111111111"
    higher_id = _event("2025-12-31T22:30:00Z")
    higher_id["id"] = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
    events = (
        CareEvent.from_storage(higher_id),
        CareEvent.from_storage(lower_id),
    )
    assert [event.id for event in ordered_events(events)] == [
        lower_id["id"],
        higher_id["id"],
    ]
    assert care_summary(events)["last_watered_local_date"] == "2026-01-01"


def test_non_watering_payloads_are_strict_and_validated() -> None:
    base = _event()
    cases: tuple[tuple[str, dict[str, Any]], ...] = (
        ("fertilizing", {"product": "Feed", "amount": 2.5, "unit": "mL", "note": None}),
        ("pruning", {"part": "dead leaves", "note": None}),
        ("repotting", {"container": "pot", "medium": "soil", "note": None}),
        ("note", {"text": "Observed new growth"}),
    )
    for kind, payload in cases:
        event = CareEvent.from_storage({**base, "kind": kind, "payload": payload})
        assert event.kind == kind
        assert event.as_storage()["payload"] == payload
    for kind, payload in (
        ("fertilizing", {"product": None, "amount": True, "unit": "g", "note": None}),
        ("fertilizing", {"product": None, "amount": 1, "unit": None, "note": None}),
        ("pruning", {"part": " leaves ", "note": None}),
        ("note", {"text": " "}),
    ):
        with pytest.raises(ValueError, match=r"care event|amount|unit|text|part"):
            CareEvent.from_storage({**base, "kind": kind, "payload": payload})
    invalid_payloads = (
        (
            "fertilizing",
            {"product": "x" * 121, "amount": None, "unit": None, "note": None},
        ),
        ("fertilizing", {"product": None, "amount": 100001, "unit": "g", "note": None}),
        (
            "fertilizing",
            {"product": None, "amount": float("inf"), "unit": "g", "note": None},
        ),
        ("fertilizing", {"product": None, "amount": 1, "unit": "oz", "note": None}),
        (
            "fertilizing",
            {"product": None, "amount": None, "unit": None, "note": "x" * 501},
        ),
        ("pruning", {"part": "x" * 121, "note": None}),
        ("repotting", {"container": "pot", "medium": "x" * 121, "note": None}),
        ("note", {"text": "x" * 1001}),
    )
    for kind, payload in invalid_payloads:
        with pytest.raises(ValueError, match=r"."):
            CareEvent.from_storage({**base, "kind": kind, "payload": payload})


async def test_minor_ten_migration_adds_empty_history(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    plant = PlantRecord(
        id="p", revision=1, name="Aloe", created_at="2026-01-01T00:00:00Z"
    ).as_storage()
    del plant["care_events"]
    hass_storage[STORAGE_KEY] = {
        "key": STORAGE_KEY,
        "version": 1,
        "minor_version": 10,
        "data": {
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
        },
    }
    loaded = await SmartPlantsStore(hass).async_load()
    assert STORAGE_MINOR_VERSION == 11
    assert loaded.plants["p"].care_events == ()
    assert hass_storage[STORAGE_KEY]["data"]["plants"][0]["care_events"] == []


async def test_current_minor_corrupt_history_refuses_setup(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    plant = PlantRecord(
        id="p", revision=1, name="Aloe", created_at="2026-01-01T00:00:00Z"
    ).as_storage()
    plant["care_events"] = [{**_event(), "kind": "note"}]
    hass_storage[STORAGE_KEY] = {
        "key": STORAGE_KEY,
        "version": 1,
        "minor_version": STORAGE_MINOR_VERSION,
        "data": {
            "revision": 1,
            "plants": [plant],
            "pending_operations": [],
            "tombstones": [],
        },
    }
    with pytest.raises(SmartPlantsInvalidStorageError, match="payload"):
        await SmartPlantsManager(hass).async_load()


async def test_watering_persistence_revision_and_failure(hass: HomeAssistant) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_plant(name="Aloe")
    instant = (datetime.now(UTC) - timedelta(days=1)).replace(microsecond=0)
    occurred = instant.astimezone(timezone(timedelta(hours=2))).isoformat()
    updated, event = await manager.async_add_watering(
        plant.id,
        expected_revision=plant.revision,
        occurred_at=occurred,
        note="Checked soil",
    )
    assert updated.revision == plant.revision + 1
    assert updated.care_events == (event,)
    assert (
        manager.care_history(plant.id)["summary"]["last_watered_local_date"]
        == occurred[:10]
    )
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_add_watering(
            plant.id, expected_revision=plant.revision, occurred_at=occurred, note=None
        )
    with pytest.raises(SmartPlantsValidationError):
        await manager.async_add_watering(
            plant.id,
            expected_revision=updated.revision,
            occurred_at="2026-01-01T12:00:00",
            note=None,
        )
    with (
        patch.object(
            manager._store, "async_save", side_effect=SmartPlantsStorageError("failed")
        ),
        pytest.raises(SmartPlantsStorageError),
    ):
        await manager.async_add_watering(
            plant.id,
            expected_revision=updated.revision,
            occurred_at=occurred,
            note=None,
        )
    assert manager.care_history(plant.id)["summary"]["watering_count"] == 1
    await manager.async_unload()
    restored = SmartPlantsManager(hass)
    await restored.async_load()
    assert restored.care_history(plant.id)["events"] == [event.as_storage()]
    await restored.async_unload()


async def test_care_event_edit_delete_preserve_identity_and_revision(
    hass: HomeAssistant,
) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_plant(name="Aloe")
    occurred = (
        (datetime.now(UTC) - timedelta(hours=1)).replace(microsecond=0).isoformat()
    )
    created, event = await manager.async_add_care_event(
        plant.id,
        expected_revision=plant.revision,
        kind="note",
        occurred_at=occurred,
        payload={"text": "New growth"},
    )
    edited, replacement = await manager.async_edit_care_event(
        plant.id,
        expected_revision=created.revision,
        event_id=event.id,
        kind="pruning",
        occurred_at=occurred,
        payload={"part": "tip", "note": None},
    )
    assert replacement.id == event.id
    assert replacement.created_at == event.created_at
    assert replacement.provenance == event.provenance
    assert replacement.updated_at >= event.updated_at
    assert edited.revision == created.revision + 1
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_delete_care_event(
            plant.id, expected_revision=created.revision, event_id=event.id
        )
    deleted = await manager.async_delete_care_event(
        plant.id, expected_revision=edited.revision, event_id=event.id
    )
    assert deleted.revision == edited.revision + 1
    assert deleted.care_events == ()
    await manager.async_unload()


async def test_edit_can_move_occurrence_after_original_creation_time(
    hass: HomeAssistant,
) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_plant(name="Aloe")
    created, event = await manager.async_add_care_event(
        plant.id,
        expected_revision=plant.revision,
        kind="note",
        occurred_at=(datetime.now(UTC) - timedelta(days=2)).isoformat(),
        payload={"text": "Observed growth"},
    )
    later = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    edited, replacement = await manager.async_edit_care_event(
        plant.id,
        expected_revision=created.revision,
        event_id=event.id,
        kind="note",
        occurred_at=later,
        payload={"text": "Growth continued"},
    )
    assert replacement.occurred_at == later
    assert replacement.created_at == event.created_at
    assert edited.revision == created.revision + 1
    await manager.async_unload()


async def test_generic_watering_payload_rejects_unknown_fields(
    hass: HomeAssistant,
) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_plant(name="Aloe")
    with pytest.raises(SmartPlantsValidationError):
        await manager.async_add_care_event(
            plant.id,
            expected_revision=plant.revision,
            kind="watering",
            occurred_at=(datetime.now(UTC) - timedelta(hours=1)).isoformat(),
            payload={"note": None, "amount": 10},
        )
    assert manager.get_plant(plant.id) == plant
    await manager.async_unload()


async def test_edit_and_delete_storage_failures_publish_nothing(
    hass: HomeAssistant,
) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_plant(name="Aloe")
    created, event = await manager.async_add_care_event(
        plant.id,
        expected_revision=plant.revision,
        kind="watering",
        occurred_at=(datetime.now(UTC) - timedelta(hours=1))
        .replace(microsecond=0)
        .isoformat(),
        payload={"note": None},
    )
    with (
        patch.object(
            manager._store,
            "async_save",
            side_effect=SmartPlantsStorageError("failed"),
        ),
        pytest.raises(SmartPlantsStorageError),
    ):
        await manager.async_edit_care_event(
            plant.id,
            expected_revision=created.revision,
            event_id=event.id,
            kind="note",
            occurred_at=event.occurred_at,
            payload={"text": "edited"},
        )
    assert manager.get_plant(plant.id) == created
    with (
        patch.object(
            manager._store,
            "async_save",
            side_effect=SmartPlantsStorageError("failed"),
        ),
        pytest.raises(SmartPlantsStorageError),
    ):
        await manager.async_delete_care_event(
            plant.id, expected_revision=created.revision, event_id=event.id
        )
    assert manager.get_plant(plant.id) == created
    assert manager.care_history(plant.id)["summary"]["watering_count"] == 1
    await manager.async_unload()


async def test_full_history_and_future_date_reject_without_write(
    hass: HomeAssistant,
) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_plant(name="Aloe")
    future = (datetime.now(UTC) + timedelta(days=1)).replace(microsecond=0).isoformat()
    with pytest.raises(SmartPlantsValidationError, match="future"):
        await manager.async_add_watering(
            plant.id, expected_revision=plant.revision, occurred_at=future, note=None
        )
    sample = CareEvent.from_storage(_event())
    full = replace(
        plant,
        care_events=tuple(
            replace(sample, id=str(uuid4())) for _ in range(MAX_CARE_EVENTS)
        ),
    )
    manager._snapshot = manager.snapshot.with_plant(full)
    with pytest.raises(SmartPlantsValidationError, match="full"):
        await manager.async_add_watering(
            plant.id,
            expected_revision=plant.revision,
            occurred_at="2026-01-01T00:00:00Z",
            note=None,
        )
    assert manager.snapshot.plants[plant.id] is full
    await manager.async_unload()


async def test_care_websocket_admin_revision_and_summary(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    entry = await _setup(hass)
    plant = await entry.runtime_data.manager.async_create_plant(name="Aloe")
    regular = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await regular.send_json_auto_id(
        {"type": "smart_plants/care/list", "plant_id": plant.id}
    )
    assert (await regular.receive_json())["error"]["code"] == "unauthorized"
    await regular.send_json_auto_id(
        {
            "type": "smart_plants/care/add_watering",
            "plant_id": plant.id,
            "expected_revision": 1,
            "occurred_at": "2026-01-01T00:00:00Z",
            "note": None,
        }
    )
    assert (await regular.receive_json())["error"]["code"] == "unauthorized"
    admin = await hass_ws_client(hass)
    request = {
        "type": "smart_plants/care/add_watering",
        "plant_id": plant.id,
        "expected_revision": 1,
        "occurred_at": "2026-01-01T00:30:00+02:00",
        "note": None,
    }
    await admin.send_json_auto_id(request)
    result = await admin.receive_json()
    assert result["success"], result
    assert result["result"]["summary"]["last_watered_local_date"] == "2026-01-01"
    await admin.send_json_auto_id(request)
    assert (await admin.receive_json())["error"]["code"] == "revision_conflict"
    await admin.send_json_auto_id(
        {"type": "smart_plants/care/list", "plant_id": plant.id}
    )
    history = (await admin.receive_json())["result"]
    assert history["summary"]["watering_count"] == 1
    assert history["events"][0]["id"] == result["result"]["event"]["id"]

    payloads = (
        ("fertilizing", {"product": "Feed", "amount": 2.5, "unit": "mL", "note": None}),
        ("pruning", {"part": "dead leaves", "note": None}),
        ("repotting", {"container": "clay pot", "medium": "bark", "note": None}),
        ("note", {"text": "New growth"}),
    )
    revision = history["revision"]
    created_events: list[dict[str, Any]] = []
    for index, (kind, payload) in enumerate(payloads, start=2):
        await admin.send_json_auto_id(
            {
                "type": "smart_plants/care/add",
                "plant_id": plant.id,
                "expected_revision": revision,
                "kind": kind,
                "occurred_at": f"2026-01-0{index}T12:00:00Z",
                "payload": payload,
            }
        )
        response = await admin.receive_json()
        assert response["success"], response
        revision = response["result"]["plant"]["revision"]
        created_events.append(response["result"]["event"])
        assert response["result"]["event"]["kind"] == kind

    original = created_events[0]
    await admin.send_json_auto_id(
        {
            "type": "smart_plants/care/edit",
            "plant_id": plant.id,
            "expected_revision": revision,
            "event_id": original["id"],
            "kind": "fertilizing",
            "occurred_at": "2026-01-02T13:00:00-05:00",
            "payload": {"product": "New feed", "amount": 3, "unit": "g", "note": None},
        }
    )
    edited_response = await admin.receive_json()
    assert edited_response["success"], edited_response
    edited = edited_response["result"]["event"]
    assert edited["id"] == original["id"]
    assert edited["created_at"] == original["created_at"]
    assert edited["provenance"] == original["provenance"]
    assert edited["local_date"] == "2026-01-02"
    revision = edited_response["result"]["plant"]["revision"]
    await admin.send_json_auto_id(
        {
            "type": "smart_plants/care/delete",
            "plant_id": plant.id,
            "expected_revision": revision,
            "event_id": created_events[-1]["id"],
        }
    )
    deleted_response = await admin.receive_json()
    assert deleted_response["success"], deleted_response
    assert deleted_response["result"]["summary"]["watering_count"] == 1
    await admin.send_json_auto_id(
        {"type": "smart_plants/care/list", "plant_id": plant.id}
    )
    final = (await admin.receive_json())["result"]
    assert final["summary"]["watering_count"] == 1
    assert [row["kind"] for row in final["events"]] == [
        "repotting",
        "pruning",
        "fertilizing",
        "watering",
    ]
