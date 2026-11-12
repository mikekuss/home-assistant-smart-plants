"""
Error codes that the WebSocket and HTTP APIs share for failed saves.

A full inventory, a full queue of unfinished changes and a failed save each
need a different action from the user, so both APIs report them with their
own code. The messages are fixed: the panel shows its own text for each
code, and the exception text may name sizes or file details.
"""

from __future__ import annotations

from typing import Final

from .storage import (
    SmartPlantsPendingOperationsFullError,
    SmartPlantsStorageError,
    SmartPlantsStorageFullError,
)

ERR_STORAGE_FULL: Final = "storage_full"
ERR_PENDING_OPERATIONS_FULL: Final = "pending_operations_full"
ERR_STORAGE_FAILED: Final = "storage_failed"


def storage_error_reply(err: BaseException) -> tuple[str, str] | None:
    """Return the error code and message for a failed save, else ``None``."""
    # The pending-operation error is also a storage error; check it first.
    if isinstance(err, SmartPlantsPendingOperationsFullError):
        return ERR_PENDING_OPERATIONS_FULL, "too many unfinished changes"
    if isinstance(err, SmartPlantsStorageFullError):
        return ERR_STORAGE_FULL, "storage is full"
    if isinstance(err, SmartPlantsStorageError):
        return ERR_STORAGE_FAILED, "the change could not be saved"
    return None
