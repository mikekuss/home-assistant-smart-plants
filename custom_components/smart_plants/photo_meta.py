"""
ThumbHash placeholders of the stored plant photos.

A ThumbHash describes a photo in a few bytes, from which a client can draw a
blurred placeholder while the photo loads. It is computed once per photo,
when it is uploaded or, for older photos, by a background pass after setup,
and kept in ``.storage/smart_plants.photo_meta`` as
``{"photos": {"<image id>": {"thumbhash": "<base64>"}}}``.

The file is a cache: every value can be computed again from the photo files.
Loading therefore never fails setup. A missing or unreadable file means no
placeholders yet, and a malformed entry is dropped.
"""

from __future__ import annotations

import base64
import binascii
import logging
import re
from typing import TYPE_CHECKING, Any, Final, TypeGuard

from homeassistant.helpers.storage import Store

from .const import PHOTO_META_STORAGE_KEY, PHOTO_META_STORAGE_VERSION
from .images import _is_safe_image_id

if TYPE_CHECKING:
    from collections.abc import Container, Iterable

    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

# New placeholders arrive one at a time during the background pass; batch
# their writes.
PHOTO_META_SAVE_DELAY: Final = 10

_BASE64_RE: Final = re.compile(r"^[A-Za-z0-9+/]+={0,2}$")
# An opaque ThumbHash is 5 header bytes plus up to 19 bytes of coefficients,
# 32 base64 characters. The bound leaves room for the variant with alpha.
_THUMBHASH_MAX_LENGTH: Final = 64
_THUMBHASH_MIN_BYTES: Final = 5


def is_valid_thumbhash(value: object) -> TypeGuard[str]:
    """Return whether ``value`` looks like a base64 ThumbHash."""
    if not isinstance(value, str) or not 0 < len(value) <= _THUMBHASH_MAX_LENGTH:
        return False
    if len(value) % 4 or not _BASE64_RE.fullmatch(value):
        return False
    try:
        decoded = base64.b64decode(value, validate=True)
    except binascii.Error:
        return False
    return len(decoded) >= _THUMBHASH_MIN_BYTES


class PhotoMetaStore:
    """Keep the ThumbHash of each stored photo, keyed by image id."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store[dict[str, Any]] = Store(
            hass,
            PHOTO_META_STORAGE_VERSION,
            PHOTO_META_STORAGE_KEY,
            atomic_writes=True,
        )
        self._photos: dict[str, str] = {}
        self._dirty = False
        self._closed = False

    def __len__(self) -> int:
        return len(self._photos)

    async def async_load(self) -> None:
        self._photos = {}
        try:
            stored = await self._store.async_load()
        except Exception:  # noqa: BLE001 - any failure falls back to empty
            _LOGGER.warning(
                "Smart Plants could not read its photo placeholders; "
                "they are computed again"
            )
            return
        if stored is None:
            return
        photos = stored.get("photos") if isinstance(stored, dict) else None
        if not isinstance(photos, dict):
            _LOGGER.warning(
                "Smart Plants photo placeholders are malformed; they are computed again"
            )
            return
        dropped = 0
        for image_id, entry in photos.items():
            thumbhash = entry.get("thumbhash") if isinstance(entry, dict) else None
            if (
                isinstance(image_id, str)
                and _is_safe_image_id(image_id)
                and is_valid_thumbhash(thumbhash)
            ):
                self._photos[image_id] = thumbhash
            else:
                dropped += 1
        if dropped:
            _LOGGER.warning(
                "Smart Plants dropped %d malformed photo placeholder entries", dropped
            )

    def get(self, image_id: str) -> str | None:
        return self._photos.get(image_id)

    def for_images(self, image_ids: Iterable[str]) -> dict[str, dict[str, str]]:
        """Return ``{image_id: {"thumbhash": ...}}`` for the known ids."""
        return {
            image_id: {"thumbhash": self._photos[image_id]}
            for image_id in image_ids
            if image_id in self._photos
        }

    def set(self, image_id: str, thumbhash: str) -> None:
        if not _is_safe_image_id(image_id) or not is_valid_thumbhash(thumbhash):
            raise ValueError("photo placeholder is malformed")
        if self._photos.get(image_id) == thumbhash:
            return
        self._photos[image_id] = thumbhash
        self._schedule_save()

    def discard(self, image_id: str) -> None:
        if self._photos.pop(image_id, None) is not None:
            self._schedule_save()

    def prune(self, keep: Container[str]) -> int:
        """Drop the entries of every id not in ``keep``; return how many."""
        gone = [image_id for image_id in self._photos if image_id not in keep]
        for image_id in gone:
            del self._photos[image_id]
        if gone:
            self._schedule_save()
        return len(gone)

    def _schedule_save(self) -> None:
        if self._closed:
            return
        self._dirty = True
        self._store.async_delay_save(self._payload, PHOTO_META_SAVE_DELAY)

    async def async_flush(self) -> None:
        """Write pending changes now instead of after the save delay."""
        if not self._dirty or self._closed:
            return
        self._dirty = False
        await self._store.async_save(self._payload())

    async def async_close(self) -> None:
        """Write pending changes and accept no further ones."""
        try:
            await self.async_flush()
        finally:
            self._closed = True

    async def async_remove(self) -> None:
        """Delete the file; used when the integration is removed."""
        self._closed = True
        self._dirty = False
        self._photos = {}
        await self._store.async_remove()

    def _payload(self) -> dict[str, Any]:
        self._dirty = False
        return {
            "photos": {
                image_id: {"thumbhash": thumbhash}
                for image_id, thumbhash in sorted(self._photos.items())
            }
        }
