"""
Secure image validation, re-encoding, and on-disk storage.

The image lifecycle accepts a JPEG/PNG/WebP upload from the admin panel, decodes and
sanitizes it with Pillow, re-encodes to WebP, and writes it under
``<config>/smart_plants/images/`` with a server-generated opaque
identifier. The directory sits outside ``custom_components/`` so a
HACS-style integration replacement never touches user data.

Smaller copies of each photo (variants, see ``IMAGE_VARIANT_SIZES``) are
made on first request and kept under ``<config>/.cache/smart_plants/thumbs/``
as ``<image_id>-<size>.webp``. They can always be made again from the stored
photo, so losing them costs only the time to regenerate them.

Nothing here mutates the manager or its published snapshot; the manager
brackets the filesystem side effects with a typed ``PendingOperation``
following the same two-phase pattern as the device reconciler.
"""

from __future__ import annotations

import contextlib
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

from PIL import Image, ImageOps, UnidentifiedImageError

from .const import (
    IMAGE_ALLOWED_INPUT_TYPES,
    IMAGE_CACHE_DIRNAME,
    IMAGE_MAX_DECODE_PIXELS,
    IMAGE_MAX_DIMENSION,
    IMAGE_MAX_UPLOAD_BYTES,
    IMAGE_OUTPUT_CONTENT_TYPE,
    IMAGE_OUTPUT_EXTENSION,
    IMAGE_STORAGE_DIRNAME,
    IMAGE_VARIANT_DIRNAME,
    IMAGE_VARIANT_QUALITY,
    IMAGE_VARIANT_SIZES,
)
from .thumbhash import image_thumbhash

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant


_LOGGER = logging.getLogger(__name__)

# Server-generated identifiers are hex uuids; anything that does not match
# this shape is refused as a lookup argument so a caller cannot escape the
# images directory via ``..``, ``/``, or NUL bytes.
_IMAGE_ID_RE: Final = re.compile(r"^[0-9a-f]{32}$")

# Map the Pillow format string back to the MIME type we advertise. Pillow
# reports a JPEG with a Multi-Picture extension (some phones, 3D cameras and
# gain-map exports) as ``MPO``. Browsers send it as ``image/jpeg``, and only
# its first frame is decoded and re-encoded.
_INPUT_FORMAT_TO_MIME: Final[dict[str, str]] = {
    "JPEG": "image/jpeg",
    "MPO": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}

# Pillow's own ``Image.MAX_IMAGE_PIXELS`` is shared by every integration in
# the Home Assistant process, so it is left alone. Instead every open below
# compares the header-declared size against ``IMAGE_MAX_DECODE_PIXELS``
# before any pixel data is decoded, and maps Pillow's own decompression-bomb
# error (and its warning, when a host turns warnings into exceptions) to the
# same validation error.
_BOMB_ERRORS: Final = (Image.DecompressionBombError, Image.DecompressionBombWarning)


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
    # Base64 ThumbHash of the sanitized pixels, for a blurred placeholder.
    thumbhash: str


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
    except _BOMB_ERRORS as err:
        raise ImageValidationError(_DIMENSION_ERROR) from err
    except OSError as err:
        raise ImageValidationError("image bytes could not be parsed") from err


def _check_decoded_size(image: Any) -> None:
    if image.width * image.height > IMAGE_MAX_DECODE_PIXELS:
        raise ImageValidationError("image decoded pixel count exceeds the ceiling")
    if image.width > IMAGE_MAX_DIMENSION or image.height > IMAGE_MAX_DIMENSION:
        raise ImageValidationError(_OVERSIZED_DIMENSION_ERROR)


def _decode_and_sanitize(raw: bytes) -> Any:
    """
    Fully decode ``raw`` and drop metadata.

    Returns a fresh Pillow ``Image`` object with no ``info`` block, so
    EXIF/ICC/XMP is dropped by construction. The EXIF orientation is
    applied to the pixels first: phone cameras store portrait photos as
    landscape pixels plus an orientation tag, and dropping the tag alone
    would store them sideways. Oversized dimensions are rejected (never
    resized): the stored image is exactly what was uploaded, re-encoded,
    or nothing at all.
    """
    try:
        with Image.open(io.BytesIO(raw)) as decoded:
            # Check the declared size before ``load()`` allocates pixels:
            # this, not Pillow's process-wide limit, is the decode ceiling.
            _check_decoded_size(decoded)
            decoded.load()
            _check_decoded_size(decoded)
            source = ImageOps.exif_transpose(decoded).convert("RGB")
            sanitized = Image.new("RGB", source.size)
            sanitized.paste(source)
    except ImageValidationError:
        raise
    except _BOMB_ERRORS as err:
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

    thumbhash = image_thumbhash(sanitized)
    buffer = io.BytesIO()
    sanitized.save(buffer, format="WEBP", quality=85, method=6)
    encoded = buffer.getvalue()

    return ProcessedImage(
        image_id=uuid4().hex,
        content_type=IMAGE_OUTPUT_CONTENT_TYPE,
        width=sanitized.width,
        height=sanitized.height,
        data=encoded,
        thumbhash=thumbhash,
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


# --- Variants and ThumbHash of stored photos --------------------------------


def _check_stored_format(image: Any) -> None:
    if (image.format or "").upper() != "WEBP":
        raise ImageValidationError("stored image is not a WebP file")


def _decode_stored(webp_bytes: bytes) -> Any:
    """
    Decode a stored photo to RGB pixels.

    The file was written by ``write_image_file``, but anything with access to
    the config folder can replace it, so it gets the same decode ceiling as
    an upload: the declared size is checked before pixels are allocated.
    """
    try:
        with Image.open(io.BytesIO(webp_bytes)) as decoded:
            _check_stored_format(decoded)
            _check_decoded_size(decoded)
            decoded.load()
            _check_decoded_size(decoded)
            return decoded.convert("RGB")
    except ImageValidationError:
        raise
    except UnidentifiedImageError as err:
        raise ImageValidationError("stored image is not a recognized image") from err
    except _BOMB_ERRORS as err:
        raise ImageValidationError(_DIMENSION_ERROR) from err
    except (OSError, ValueError) as err:
        raise ImageValidationError("stored image could not be decoded") from err


def make_variant(webp_bytes: bytes, longest: int) -> bytes:
    """
    Return a WebP copy of a stored photo at most ``longest`` px on each side.

    Blocking (Pillow decode / encode); run it in an executor. The aspect
    ratio is kept, and a photo that is already small enough keeps its size
    because ``thumbnail`` never enlarges.
    """
    image = _decode_stored(webp_bytes)
    image.thumbnail((longest, longest), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=IMAGE_VARIANT_QUALITY, method=4)
    return buffer.getvalue()


def stored_image_thumbhash(images_dir: Path, image_id: str) -> str:
    """
    Return the ThumbHash of the stored photo ``image_id``.

    Blocking. Raises ``ImageNotFoundError`` for a missing file and
    ``ImageValidationError`` for one that cannot be decoded.
    """
    image = _decode_stored(read_image_file(images_dir, image_id))
    return image_thumbhash(image)


def get_cache_dir(hass: HomeAssistant) -> Path:
    """
    Absolute path to ``<config>/.cache/smart_plants/``.

    Home Assistant keeps data that can be regenerated under its cache path,
    and its backups leave that folder out.
    """
    return Path(hass.config.cache_path(IMAGE_CACHE_DIRNAME))


def get_variants_dir(hass: HomeAssistant) -> Path:
    """Absolute path to the variant cache under ``get_cache_dir``."""
    return Path(hass.config.cache_path(IMAGE_CACHE_DIRNAME, IMAGE_VARIANT_DIRNAME))


def _variant_file_name(image_id: str, size: str) -> str:
    # Only a server-generated id and a known size name ever reach the
    # filesystem, so a request cannot point outside the cache folder.
    if not _is_safe_image_id(image_id):
        raise ImageValidationError("image id is malformed")
    if size not in IMAGE_VARIANT_SIZES:
        raise ImageValidationError("image size is not supported")
    return f"{image_id}-{size}{IMAGE_OUTPUT_EXTENSION}"


def read_variant_file(variants_dir: Path, image_id: str, size: str) -> bytes | None:
    """Return a cached variant, or ``None`` when it was not made yet."""
    path = variants_dir / _variant_file_name(image_id, size)
    try:
        return path.read_bytes()
    except FileNotFoundError:
        return None


def write_variant_file(
    variants_dir: Path, image_id: str, size: str, data: bytes
) -> None:
    """
    Atomically write a variant to the cache.

    Written like ``write_image_file``: a crash mid-write must not leave a
    truncated file that browsers would keep showing as a broken picture.
    A failed write (a full disk) removes its temp file, so the partial copy
    does not take up space until the photo is removed.
    """
    name = _variant_file_name(image_id, size)
    variants_dir.mkdir(parents=True, exist_ok=True)
    tmp = variants_dir / f".{name}.tmp"
    try:
        with tmp.open("wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        tmp.replace(variants_dir / name)
    except BaseException:
        with contextlib.suppress(OSError):
            tmp.unlink(missing_ok=True)
        raise


def delete_variant_files(variants_dir: Path, image_id: str) -> int:
    """Remove every cached variant of ``image_id``; return how many went."""
    if not _is_safe_image_id(image_id):
        return 0
    removed = 0
    for size in IMAGE_VARIANT_SIZES:
        name = _variant_file_name(image_id, size)
        for path in (variants_dir / name, variants_dir / f".{name}.tmp"):
            try:
                path.unlink()
            except FileNotFoundError:
                continue
            removed += 1
    return removed


def list_variant_image_ids(variants_dir: Path) -> set[str]:
    """
    Return the image ids that have at least one cached variant.

    Unfinished temp files count too, so pruning an id removes them as well.
    Names of any other shape are skipped.
    """
    try:
        entries = list(variants_dir.iterdir())
    except FileNotFoundError:
        return set()
    suffix = IMAGE_OUTPUT_EXTENSION
    found: set[str] = set()
    for entry in entries:
        name = entry.name
        if name.startswith(".") and name.endswith(f"{suffix}.tmp"):
            name = name[1 : -len(".tmp")]
        if not name.endswith(suffix):
            continue
        image_id, _, size = name[: -len(suffix)].partition("-")
        if size in IMAGE_VARIANT_SIZES and _is_safe_image_id(image_id):
            found.add(image_id)
    return found


def delete_image_and_variants(
    images_dir: Path, variants_dir: Path, image_id: str
) -> bool:
    """
    Remove a stored photo and then its cached variants.

    Returns whether the photo file was removed. The variants are only a
    cache, so failing to remove one is logged and never fails the caller.
    """
    removed = delete_image_file(images_dir, image_id)
    try:
        delete_variant_files(variants_dir, image_id)
    except OSError:
        _LOGGER.debug("Smart Plants could not remove the cached copies of a photo")
    return removed


def remove_cache_dir(hass: HomeAssistant) -> bool:
    """
    Delete ``<config>/.cache/smart_plants/`` with every cached variant.

    Returns True when the folder is gone. A missing folder is already clean.
    """
    directory = get_cache_dir(hass)
    try:
        shutil.rmtree(directory)
    except FileNotFoundError:
        return True
    except OSError:
        _LOGGER.warning(
            "Smart Plants could not remove its cache directory %s", directory
        )
        return False
    return True
