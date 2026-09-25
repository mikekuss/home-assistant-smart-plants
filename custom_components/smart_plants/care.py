"""Version 1 manual care records and deterministic history summaries."""

from __future__ import annotations

import math
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from types import MappingProxyType
from typing import Any, Final, Self
from uuid import UUID

MAX_CARE_EVENTS: Final = 256
_MAX_TIMESTAMP_LENGTH: Final = 64
_MAX_NOTE_LENGTH: Final = 500
_MAX_FERTILIZER_AMOUNT: Final = 100_000
_UUID_VERSION: Final = 4
_OFFSET_TIME = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$"
)
_UTC_TIME = re.compile(r"^\d{4}-\d{2}-\d{2}T.*Z$")


def parse_occurred_at(value: object) -> datetime:
    if (
        not isinstance(value, str)
        or len(value) > _MAX_TIMESTAMP_LENGTH
        or not _OFFSET_TIME.fullmatch(value)
    ):
        raise ValueError(
            "occurred_at requires an ISO timestamp with an explicit offset"
        )
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as err:
        raise ValueError("occurred_at is invalid") from err
    if parsed.utcoffset() is None:
        raise ValueError("occurred_at requires an offset")
    return parsed


def _server_time(value: object, label: str) -> datetime:
    if (
        not isinstance(value, str)
        or len(value) > _MAX_TIMESTAMP_LENGTH
        or not _UTC_TIME.fullmatch(value)
    ):
        raise ValueError(f"{label} must be a UTC timestamp")
    parsed = parse_occurred_at(value)
    if parsed.utcoffset() != UTC.utcoffset(None):
        raise ValueError(f"{label} must be UTC")
    return parsed


def clean_note(value: object) -> str | None:
    if value is None:
        return None
    if (
        not isinstance(value, str)
        or not value.strip()
        or value != value.strip()
        or len(value) > _MAX_NOTE_LENGTH
    ):
        raise ValueError("note must be null or trimmed text of at most 500 characters")
    return value


@dataclass(frozen=True, slots=True)
class CareEvent:
    id: str
    occurred_at: str
    local_date: str
    created_at: str
    updated_at: str
    payload: Mapping[str, Any] = field(default_factory=dict)
    kind: str = "watering"
    provenance: str = "manual"
    schema_version: int = 1

    def __post_init__(self) -> None:
        object.__setattr__(self, "payload", MappingProxyType(dict(self.payload)))

    @classmethod
    def from_storage(cls, data: object) -> Self:
        if not isinstance(data, dict) or set(data) != {
            "id",
            "occurred_at",
            "local_date",
            "created_at",
            "updated_at",
            "kind",
            "provenance",
            "schema_version",
            "payload",
        }:
            raise ValueError("care event has invalid fields")
        identifier = data["id"]
        if not isinstance(identifier, str):
            raise ValueError("care event id must be a UUID4")
        try:
            parsed_id = UUID(identifier)
        except ValueError as err:
            raise ValueError("care event id must be a UUID4") from err
        if parsed_id.version != _UUID_VERSION or str(parsed_id) != identifier:
            raise ValueError("care event id must be a UUID4")
        occurred = parse_occurred_at(data["occurred_at"])
        created = _server_time(data["created_at"], "created_at")
        updated = _server_time(data["updated_at"], "updated_at")
        if data["local_date"] != occurred.date().isoformat() or updated < created:
            raise ValueError("care event time or local date is inconsistent")
        if data["schema_version"] != 1 or type(data["schema_version"]) is not int:
            raise ValueError("unsupported care event schema")
        kind = data["kind"]
        if (
            kind not in ("watering", "fertilizing", "pruning", "repotting", "note")
            or data["provenance"] != "manual"
        ):
            raise ValueError("unsupported care event kind or provenance")
        payload = data["payload"]
        validate_payload(kind, payload)
        return cls(
            id=identifier,
            occurred_at=data["occurred_at"],
            local_date=data["local_date"],
            created_at=data["created_at"],
            updated_at=data["updated_at"],
            payload=dict(payload),
            kind=kind,
            provenance="manual",
            schema_version=1,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "id": self.id,
            "kind": self.kind,
            "provenance": self.provenance,
            "occurred_at": self.occurred_at,
            "local_date": self.local_date,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "payload": dict(self.payload),
        }

    @property
    def note(self) -> str | None:
        """Compatibility accessor for the watering-grace-era event shape."""
        value = self.payload.get("note")
        return value if isinstance(value, str) else None


def _text(
    value: object, label: str, maximum: int, *, required: bool = False
) -> str | None:
    if value is None and not required:
        return None
    if (
        not isinstance(value, str)
        or value != value.strip()
        or not value
        or len(value) > maximum
    ):
        raise ValueError(
            f"{label} must be trimmed text of at most {maximum} characters"
        )
    return value


def validate_payload(kind: object, payload: object) -> None:
    if not isinstance(payload, dict):
        raise ValueError("care event payload must be an object")
    schemas: dict[str, set[str]] = {
        "watering": {"note"},
        "fertilizing": {"product", "amount", "unit", "note"},
        "pruning": {"part", "note"},
        "repotting": {"container", "medium", "note"},
        "note": {"text"},
    }
    if not isinstance(kind, str) or kind not in schemas:
        raise ValueError("unsupported care event kind")
    if set(payload) != schemas[kind]:
        raise ValueError("care event payload has invalid fields")
    if kind == "watering":
        clean_note(payload["note"])
    elif kind == "fertilizing":
        _text(payload["product"], "product", 120)
        amount, unit = payload["amount"], payload["unit"]
        if amount is not None and (
            isinstance(amount, bool)
            or not isinstance(amount, (int, float))
            or not math.isfinite(amount)
            or not 0 < amount <= _MAX_FERTILIZER_AMOUNT
        ):
            raise ValueError("amount must be finite, positive, and at most 100000")
        if (amount is None) != (unit is None) or (
            unit is not None and unit not in ("g", "mL")
        ):
            raise ValueError("unit must be g or mL exactly when amount is present")
        clean_note(payload["note"])
    elif kind == "pruning":
        _text(payload["part"], "part", 120)
        clean_note(payload["note"])
    elif kind == "repotting":
        _text(payload["container"], "container", 120)
        _text(payload["medium"], "medium", 120)
        clean_note(payload["note"])
    else:
        _text(payload["text"], "text", 1000, required=True)


def ordered_events(events: tuple[CareEvent, ...]) -> list[CareEvent]:
    ordered = sorted(events, key=lambda event: event.id)
    ordered.sort(
        key=lambda event: parse_occurred_at(event.occurred_at).astimezone(UTC),
        reverse=True,
    )
    return ordered


def care_summary(events: tuple[CareEvent, ...]) -> dict[str, Any]:
    ordered = [event for event in ordered_events(events) if event.kind == "watering"]
    latest = ordered[0] if ordered else None
    return {
        "watering_count": sum(event.kind == "watering" for event in events),
        "last_watered_at": latest.occurred_at if latest else None,
        "last_watered_local_date": latest.local_date if latest else None,
    }
