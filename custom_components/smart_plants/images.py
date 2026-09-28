"""
Secure image validation, re-encoding, and on-disk storage.

The image lifecycle accepts a JPEG/PNG/WebP upload from the admin panel, decodes and
sanitizes it with Pillow, re-encodes to WebP, and writes it under
``<config>/smart_plants/images/`` with a server-generated opaque
identifier. The directory sits outside ``custom_components/`` so a
HACS-style integration replacement never touches user data.

Nothing here mutates the manager or its published snapshot; the manager
brackets the filesystem side effects with a typed ``PendingOperation``
following the same two-phase pattern as the device reconciler.
"""

from __future__ import annotations

import io
import logging
import os
import re
import shutil
import time
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any, Final
from uuid import uuid4

from PIL import Image, UnidentifiedImageError

from .const import (
    IMAGE_ALLOWED_INPUT_TYPES,
    IMAGE_MAX_DECODE_PIXELS,
    IMAGE_MAX_DIMENSION,
    IMAGE_MAX_UPLOAD_BYTES,
    IMAGE_OUTPUT_CONTENT_TYPE,
    IMAGE_OUTPUT_EXTENSION,
    IMAGE_STORAGE_DIRNAME,
)

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant


_LOGGER = logging.getLogger(__name__)

# Server-generated identifiers are hex uuids; anything that does not match
# this shape is refused as a lookup argument so a caller cannot escape the
# images directory via ``..``, ``/``, or NUL bytes.
_IMAGE_ID_RE: Final = re.compile(r"^[0-9a-f]{32}$")

# Map the Pillow format string back to the MIME type we advertise.
_INPUT_FORMAT_TO_MIME: Final[dict[str, str]] = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}

# Cap the amount of memory Pillow may allocate for a single decode, in
# pixels. Applied as a process-level import-time default (Pillow reads
# this on decode); rechecked per-image in ``_validate_dimensions``.
Image.MAX_IMAGE_PIXELS = IMAGE_MAX_DECODE_PIXELS


class ImageValidationError(ValueError):
    """The upload failed a static or decoded validation check."""


class ImageNotFoundError(LookupError):
    """A lookup was made for an image id with no file on disk."""


@dataclass(frozen=True, slots=True)
class ProcessedImage:
    """Result of ``validate_and_reencode`` — ready-to-write WebP bytes."""

    image_id: str
    content_type: str
    width: int
    height: int
    data: bytes


def get_images_dir(hass: HomeAssistant) -> Path:
    """
    Absolute path to the WebP store, ``<config>/smart_plants/images/``.

    Never returns a path inside ``custom_components/`` so a HACS-style
    integration replacement leaves user data alone.
    """
    return Path(hass.config.path(IMAGE_STORAGE_DIRNAME))


def ensure_images_dir(hass: HomeAssistant) -> Path:
    """Create the images directory tree if missing; return its path."""
    directory = get_images_dir(hass)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _is_safe_image_id(image_id: str) -> bool:
    return bool(_IMAGE_ID_RE.fullmatch(image_id))


def image_path(images_dir: Path, image_id: str) -> Path:
    """
    Resolve ``image_id`` to a file path under ``images_dir``.

    Raises ``ImageValidationError`` if the id is not a valid opaque token,
    which is what any path-traversal or NUL-injection attempt would look
    like. The lookup uses only the sanitized id, never a caller-supplied
    string, so a rejected id cannot reach the filesystem.
    """
    if not _is_safe_image_id(image_id):
        raise ImageValidationError("image id is malformed")
    return images_dir / f"{image_id}{IMAGE_OUTPUT_EXTENSION}"


_DIMENSION_ERROR = "image dimensions exceed the decode ceiling"


def _check_upload_envelope(raw: object, declared_content_type: str) -> bytes:
    if not isinstance(raw, (bytes, bytearray)):
        raise ImageValidationError("image payload must be bytes")
    if len(raw) == 0:
        raise ImageValidationError("image payload is empty")
    if len(raw) > IMAGE_MAX_UPLOAD_BYTES:
        raise ImageValidationError(
            f"image payload exceeds {IMAGE_MAX_UPLOAD_BYTES} bytes"
        )
    if declared_content_type not in IMAGE_ALLOWED_INPUT_TYPES:
        raise ImageValidationError(
            f"content type {declared_content_type!r} is not supported"
        )
    return bytes(raw)


_OVERSIZED_DIMENSION_ERROR = (
    f"image dimensions exceed {IMAGE_MAX_DIMENSION}x{IMAGE_MAX_DIMENSION}"
)


def _probe_header(raw: bytes, declared_content_type: str) -> None:
    """Header-only parse; catches format mismatches and bomb-sized headers."""
    try:
        with Image.open(io.BytesIO(raw)) as probe:
            fmt = probe.format or ""
            declared_from_format = _INPUT_FORMAT_TO_MIME.get(fmt.upper())
            if declared_from_format != declared_content_type:
                raise ImageValidationError(
                    "declared content type does not match image bytes"
                )
            # Decompression-bomb ceiling: refuse anything whose header
            # already advertises a pixel count Pillow would refuse to
            # decode.
            if probe.width * probe.height > IMAGE_MAX_DECODE_PIXELS:
                raise ImageValidationError(_DIMENSION_ERROR)
            # Upload-dimension cap: refuse oversized uploads outright
            # (do not silently resize) so what the user sent is what the
            # store keeps. The decode-side check below re-verifies this
            # against the truly decoded dimensions in case a crafted
            # header understates the payload.
            if probe.width > IMAGE_MAX_DIMENSION or probe.height > IMAGE_MAX_DIMENSION:
                raise ImageValidationError(_OVERSIZED_DIMENSION_ERROR)
    except UnidentifiedImageError as err:
        raise ImageValidationError("image bytes are not a recognized image") from err
    except Image.DecompressionBombError as err:
        raise ImageValidationError(_DIMENSION_ERROR) from err
    except OSError as err:
        raise ImageValidationError("image bytes could not be parsed") from err


def _decode_and_sanitize(raw: bytes) -> Any:
    """
    Fully decode ``raw`` and drop metadata.

    Returns a fresh Pillow ``Image`` object with no ``info`` block, so
    EXIF/ICC/XMP is dropped by construction. Oversized dimensions are
    rejected (never resized): the stored image is exactly what was
    uploaded, re-encoded, or nothing at all.
    """
    try:
        with Image.open(io.BytesIO(raw)) as decoded:
            decoded.load()
            if decoded.width * decoded.height > IMAGE_MAX_DECODE_PIXELS:
                raise ImageValidationError(
                    "image decoded pixel count exceeds the ceiling"
                )
            if (
                decoded.width > IMAGE_MAX_DIMENSION
                or decoded.height > IMAGE_MAX_DIMENSION
            ):
                raise ImageValidationError(_OVERSIZED_DIMENSION_ERROR)
            source = decoded.convert("RGB")
            sanitized = Image.new("RGB", source.size)
            sanitized.paste(source)
    except Image.DecompressionBombError as err:
        raise ImageValidationError(_DIMENSION_ERROR) from err
    except (OSError, ValueError) as err:
        raise ImageValidationError("image could not be decoded") from err
    return sanitized


def validate_and_reencode(raw: bytes, declared_content_type: str) -> ProcessedImage:
    """
    Validate an uploaded blob and return sanitized WebP bytes.

    Blocking (Pillow decode / encode). Callers must run this in an
    executor. Order of checks:

    1. Byte-length upper bound (``IMAGE_MAX_UPLOAD_BYTES``).
    2. Declared MIME must be one of the accepted input types.
    3. Header parse without decoding pixels; verify declared format
       matches declared MIME; reject if header-declared pixel count
       exceeds ``IMAGE_MAX_DECODE_PIXELS`` (bomb ceiling); reject if
       either header-declared dimension exceeds ``IMAGE_MAX_DIMENSION``.
    4. Full decode; drop metadata (EXIF, ICC, XMP) by writing a fresh
       image; re-check decoded dimensions against
       ``IMAGE_MAX_DIMENSION``. Oversized uploads are rejected — never
       silently resized — so what the user sent is what the store keeps.
    5. Re-encode to WebP and return the bytes plus final dimensions.
    """
    payload = _check_upload_envelope(raw, declared_content_type)
    _probe_header(payload, declared_content_type)
    sanitized = _decode_and_sanitize(payload)

    buffer = io.BytesIO()
    sanitized.save(buffer, format="WEBP", quality=85, method=6)
    encoded = buffer.getvalue()

    return ProcessedImage(
        image_id=uuid4().hex,
        content_type=IMAGE_OUTPUT_CONTENT_TYPE,
        width=sanitized.width,
        height=sanitized.height,
        data=encoded,
    )


def write_image_file(images_dir: Path, image_id: str, data: bytes) -> None:
    """
    Atomically write ``data`` to ``images_dir/<image_id>.webp``.

    Uses the standard write-temp-then-rename dance so a crash mid-write
    leaves either the previous file or no file — never a truncated one
    that would surface as a broken JPEG in the panel.
    """
    if not _is_safe_image_id(image_id):
        raise ImageValidationError("image id is malformed")
    images_dir.mkdir(parents=True, exist_ok=True)
    final = images_dir / f"{image_id}{IMAGE_OUTPUT_EXTENSION}"
    tmp = images_dir / _tmp_file_name(image_id)
    with tmp.open("wb") as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    tmp.replace(final)


def read_image_file(images_dir: Path, image_id: str) -> bytes:
    """Return the WebP bytes for ``image_id``. Raises ``ImageNotFoundError``."""
    path = image_path(images_dir, image_id)
    try:
        return path.read_bytes()
    except FileNotFoundError as err:
        raise ImageNotFoundError(image_id) from err


def delete_image_file(images_dir: Path, image_id: str) -> bool:
    """Remove the file for ``image_id``. Returns ``True`` if a file was removed."""
    try:
        path = image_path(images_dir, image_id)
    except ImageValidationError:
        return False
    try:
        path.unlink()
    except FileNotFoundError:
        return False
    return True


def _tmp_file_name(image_id: str) -> str:
    return f".{image_id}{IMAGE_OUTPUT_EXTENSION}.tmp"


def list_stale_tmp_files(images_dir: Path, *, older_than_seconds: float) -> list[Path]:
    """
    Return interrupted temp files older than ``older_than_seconds``.

    ``write_image_file`` writes to ``.{image_id}.webp.tmp`` and then
    renames onto the final path. A process crash between open and rename
    leaves the temp file behind. Only files matching that exact shape
    are considered so an unrelated dotfile the operator may have
    dropped in this directory is left alone. Younger temp files are
    also left alone in case another manager is still writing.
    """
    try:
        entries = list(images_dir.iterdir())
    except FileNotFoundError:
        return []
    cutoff_mtime = time.time() - older_than_seconds
    stale: list[Path] = []
    for entry in entries:
        if not entry.is_file():
            continue
        name = entry.name
        if not name.startswith(".") or not name.endswith(
            f"{IMAGE_OUTPUT_EXTENSION}.tmp"
        ):
            continue
        stem = name[1 : -len(f"{IMAGE_OUTPUT_EXTENSION}.tmp")]
        if not _is_safe_image_id(stem):
            continue
        try:
            mtime = entry.stat().st_mtime
        except OSError:
            continue
        if mtime >= cutoff_mtime:
            continue
        stale.append(entry)
    return stale


def delete_stale_tmp_files(images_dir: Path, *, older_than_seconds: float) -> int:
    """
    Unlink interrupted temp files. Returns the number removed.

    Silently ignores files that vanish between the listing and the
    unlink so a concurrent reconciler pass never turns a benign race
    into an error.
    """
    removed = 0
    for path in list_stale_tmp_files(images_dir, older_than_seconds=older_than_seconds):
        try:
            path.unlink()
        except FileNotFoundError:
            continue
        except OSError:
            _LOGGER.warning("Smart Plants could not remove stale temp file %s", path)
            continue
        removed += 1
    return removed


def remove_images_dir(hass: HomeAssistant) -> bool:
    """
    Delete the entire images directory tree.

    Called from ``async_remove_entry`` on default removal to complete
    image cleanup alongside the inventory file. Returns True when a
    cleanup completed. A missing directory is already clean.
    """
    directory = get_images_dir(hass)
    try:
        shutil.rmtree(directory)
    except FileNotFoundError:
        return True
    except OSError:
        _LOGGER.warning(
            "Smart Plants could not remove image data directory %s", directory
        )
        return False
    return True


def list_image_files(images_dir: Path) -> list[tuple[str, float]]:
    """
    List (image_id, mtime_seconds) for every WebP file in the store.

    Files whose names do not match the opaque-id shape are skipped;
    only the reconciler ever writes here, so any drift is external.
    """
    try:
        entries = list(images_dir.iterdir())
    except FileNotFoundError:
        return []
    results: list[tuple[str, float]] = []
    for entry in entries:
        if not entry.is_file():
            continue
        if entry.suffix != IMAGE_OUTPUT_EXTENSION:
            continue
        stem = entry.stem
        if not _is_safe_image_id(stem):
            continue
        try:
            mtime = entry.stat().st_mtime
        except OSError:
            continue
        results.append((stem, mtime))
    return results
