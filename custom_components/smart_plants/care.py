"""Care records, care task matching, and deterministic history summaries."""

from __future__ import annotations

import math
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from types import MappingProxyType
from typing import Any, Final, Protocol, Self
from uuid import UUID

MAX_CARE_EVENTS: Final = 256
CARE_EVENT_SCHEMA_VERSION: Final = 2
CARE_EVENT_KINDS: Final = (
    "watering",
    "fertilizing",
    "pruning",
    "repotting",
    "note",
    "task",
)
CARE_PROVENANCES: Final = ("manual", "action", "automation")
CARE_TASK_TYPES: Final = (
    "fertilize",
    "prune",
    "repot",
    "pests",
    "winter_protection",
    "custom",
)
# Care task types without a dedicated event kind log the generic ``task`` kind.
CARE_TASK_TYPE_KINDS: Final[Mapping[str, str]] = MappingProxyType(
    {
        "fertilize": "fertilizing",
        "prune": "pruning",
        "repot": "repotting",
        "pests": "task",
        "winter_protection": "task",
        "custom": "task",
    }
)
_MAX_TIMESTAMP_LENGTH: Final = 64
_MAX_NOTE_LENGTH: Final = 500
_MAX_FERTILIZER_AMOUNT: Final = 100_000
_UUID_VERSION: Final = 4
_OFFSET_TIME = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$"
)
_UTC_TIME = re.compile(r"^\d{4}-\d{2}-\d{2}T.*Z$")
_TASK_ID = re.compile(r"^[0-9a-f]{32}$")


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


def parse_utc_timestamp(value: object, label: str) -> datetime:
    """Parse a server-written UTC timestamp such as ``2026-01-03T00:00:00Z``."""
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


def utc_timestamp(value: datetime) -> str:
    """Format an aware datetime as a UTC ISO timestamp with a ``Z`` suffix."""
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def validate_task_id(value: object) -> str:
    """Return ``value`` if it is a care task id (``uuid4().hex``)."""
    if not isinstance(value, str) or not _TASK_ID.fullmatch(value):
        raise ValueError("care task id must be a UUID4 hex string")
    if UUID(hex=value).version != _UUID_VERSION:
        raise ValueError("care task id must be a UUID4 hex string")
    return value


def kind_for_task_type(task_type: str) -> str:
    """Return the care event kind that records completion of ``task_type``."""
    try:
        return CARE_TASK_TYPE_KINDS[task_type]
    except KeyError as err:
        raise ValueError("unsupported care task type") from err


def minimal_care_payload(kind: str, note: str | None) -> dict[str, Any]:
    """
    Return the smallest valid payload of ``kind`` that carries ``note``.

    Only kinds whose payload has a ``note`` field are supported; a ``note``
    event stores its text under ``text`` instead.
    """
    if kind == "fertilizing":
        return {"product": None, "amount": None, "unit": None, "note": note}
    if kind == "pruning":
        return {"part": None, "note": note}
    if kind == "repotting":
        return {"container": None, "medium": None, "note": note}
    return {"note": note}


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
    task_id: str | None = None
    schema_version: int = CARE_EVENT_SCHEMA_VERSION

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
            "task_id",
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
        created = parse_utc_timestamp(data["created_at"], "created_at")
        updated = parse_utc_timestamp(data["updated_at"], "updated_at")
        if data["local_date"] != occurred.date().isoformat() or updated < created:
            raise ValueError("care event time or local date is inconsistent")
        if (
            data["schema_version"] != CARE_EVENT_SCHEMA_VERSION
            or type(data["schema_version"]) is not int
        ):
            raise ValueError("unsupported care event schema")
        kind = data["kind"]
        provenance = data["provenance"]
        if kind not in CARE_EVENT_KINDS or provenance not in CARE_PROVENANCES:
            raise ValueError("unsupported care event kind or provenance")
        task_id = data["task_id"]
        if task_id is not None:
            validate_task_id(task_id)
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
            provenance=provenance,
            task_id=task_id,
            schema_version=CARE_EVENT_SCHEMA_VERSION,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "id": self.id,
            "kind": self.kind,
            "provenance": self.provenance,
            "task_id": self.task_id,
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
        "task": {"note"},
    }
    if not isinstance(kind, str) or kind not in schemas:
        raise ValueError("unsupported care event kind")
    if set(payload) != schemas[kind]:
        raise ValueError("care event payload has invalid fields")
    if kind in ("watering", "task"):
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


class CareTaskLike(Protocol):
    """The care task attributes event matching relies on."""

    @property
    def id(self) -> str: ...

    @property
    def type(self) -> str: ...


def task_matches_event(task: CareTaskLike, event: CareEvent) -> bool:
    """
    Return whether ``event`` records a completion of ``task``.

    An event linked to a task counts only for that task. An unlinked event
    counts for the task whose type maps to the event's kind, so care logged
    before a task existed (or logged without picking the task) still counts.
    The generic ``task`` kind is shared by several task types and therefore
    never matches without an explicit link.
    """
    if event.task_id is not None:
        return event.task_id == task.id
    return event.kind != "task" and CARE_TASK_TYPE_KINDS.get(task.type) == event.kind


def newest_matching_occurred_at(
    task: CareTaskLike, events: tuple[CareEvent, ...]
) -> str | None:
    """Return the newest matching ``occurred_at`` as a UTC timestamp, if any."""
    instants = [
        parse_occurred_at(event.occurred_at)
        for event in events
        if task_matches_event(task, event)
    ]
    return utc_timestamp(max(instants)) if instants else None


def rotation_candidate(events: tuple[CareEvent, ...]) -> CareEvent | None:
    """
    Pick the event to drop so one more event fits into a full history.

    Watering is logged most often and matters least once it is old, so the
    oldest watering goes first. Notes follow. After that, any event goes,
    oldest first, as long as it is not the newest event of its kind or of its
    care task, so the latest entry of each kind and task always survives.
    """
    if not events:
        return None
    oldest_first = list(reversed(ordered_events(events)))
    waterings = [event for event in oldest_first if event.kind == "watering"]
    if len(waterings) > 1:
        return waterings[0]
    notes = [event for event in oldest_first if event.kind == "note"]
    if notes:
        return notes[0]
    protected: set[str] = set()
    seen_kinds: set[str] = set()
    seen_tasks: set[str] = set()
    for event in reversed(oldest_first):
        if event.kind not in seen_kinds:
            seen_kinds.add(event.kind)
            protected.add(event.id)
        if event.task_id is not None and event.task_id not in seen_tasks:
            seen_tasks.add(event.task_id)
            protected.add(event.id)
    return next(
        (event for event in oldest_first if event.id not in protected),
        oldest_first[0],
    )


def rotate_for_append(events: tuple[CareEvent, ...]) -> tuple[CareEvent, ...]:
    """Drop events until one more fits within ``MAX_CARE_EVENTS``."""
    remaining = events
    while len(remaining) >= MAX_CARE_EVENTS:
        candidate = rotation_candidate(remaining)
        if candidate is None:
            break
        remaining = tuple(event for event in remaining if event.id != candidate.id)
    return remaining
