"""
Typed manager events for Phase 3 entity lifecycle.

Events are dispatched only after a snapshot is durably published (a
successful ``async_save`` on the underlying Home Assistant Store), and,
for reconciled operations, only after the non-transactional side effect
has completed and the pending-operation record has been cleared.

Payloads are frozen dataclasses referencing frozen ``PlantRecord``
instances so subscribers cannot mutate the manager's snapshot through
an event object they hold on to.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from .models import PlantLifecycleState, PlantRecord


@dataclass(frozen=True, slots=True)
class PlantAddedEvent:
    """A new plant has been created and its snapshot is durable."""

    kind: Literal["plant_added"]
    plant: PlantRecord


@dataclass(frozen=True, slots=True)
class PlantUpdatedEvent:
    """A plant field other than ``lifecycle_state`` has changed."""

    kind: Literal["plant_updated"]
    plant: PlantRecord
    previous: PlantRecord


@dataclass(frozen=True, slots=True)
class PlantLifecycleChangedEvent:
    """A plant's lifecycle_state moved between ``active`` and ``disabled``."""

    kind: Literal["plant_lifecycle_changed"]
    plant: PlantRecord
    previous_state: PlantLifecycleState


@dataclass(frozen=True, slots=True)
class PlantDeletedEvent:
    """A plant has been permanently removed from the inventory."""

    kind: Literal["plant_deleted"]
    plant_id: str
    previous: PlantRecord


PlantEvent = (
    PlantAddedEvent | PlantUpdatedEvent | PlantLifecycleChangedEvent | PlantDeletedEvent
)


# A subscriber may be sync or async. The manager awaits awaitables in
# subscription order so a subscriber can safely rely on prior
# subscribers having completed before it runs.
EventCallback = Callable[[PlantEvent], "None | Awaitable[None]"]
Unsubscribe = Callable[[], None]
