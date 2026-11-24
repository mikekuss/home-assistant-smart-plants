"""
Unit tests for the smaller photo copies and the upload ThumbHash.

These run without Home Assistant: ``make_variant`` and the cache file helpers
are plain Pillow and filesystem code.
"""

from __future__ import annotations

import errno
import io
from pathlib import Path
from unittest.mock import patch

import pytest
from custom_components.smart_plants.const import (
    IMAGE_THUMB_2X_SIZE,
    IMAGE_THUMB_SIZE,
)
from custom_components.smart_plants.images import (
    ImageNotFoundError,
    ImageValidationError,
    delete_image_and_variants,
    delete_variant_files,
    list_variant_image_ids,
    make_variant,
    read_variant_file,
    stored_image_thumbhash,
    validate_and_reencode,
    write_image_file,
    write_variant_file,
)
from custom_components.smart_plants.photo_meta import is_valid_thumbhash
from PIL import Image

_ID = "0123456789abcdef0123456789abcdef"
_OTHER_ID = "fedcba9876543210fedcba9876543210"


def _webp(width: int, height: int) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), (60, 140, 80)).save(buffer, format="WEBP")
    return buffer.getvalue()


def _size(data: bytes) -> tuple[int, int]:
    with Image.open(io.BytesIO(data)) as decoded:
        assert decoded.format == "WEBP"
        return decoded.size


@pytest.mark.parametrize(
    ("source", "longest", "expected"),
    [
        ((2000, 1000), IMAGE_THUMB_SIZE, (320, 160)),
        ((2000, 1000), IMAGE_THUMB_2X_SIZE, (640, 320)),
        ((600, 1200), IMAGE_THUMB_SIZE, (160, 320)),
        ((2048, 2048), IMAGE_THUMB_2X_SIZE, (640, 640)),
        # A photo that is already small keeps its size.
        ((200, 100), IMAGE_THUMB_SIZE, (200, 100)),
        ((200, 100), IMAGE_THUMB_2X_SIZE, (200, 100)),
    ],
)
def test_make_variant_fits_the_longer_side(
    source: tuple[int, int], longest: int, expected: tuple[int, int]
) -> None:
    assert _size(make_variant(_webp(*source), longest)) == expected


def test_make_variant_refuses_a_file_that_is_not_webp() -> None:
    buffer = io.BytesIO()
    Image.new("RGB", (50, 50)).save(buffer, format="PNG")
    with pytest.raises(ImageValidationError):
        make_variant(buffer.getvalue(), IMAGE_THUMB_SIZE)
    with pytest.raises(ImageValidationError):
        make_variant(b"not an image", IMAGE_THUMB_SIZE)


def test_make_variant_refuses_a_file_above_the_dimension_cap() -> None:
    with pytest.raises(ImageValidationError):
        make_variant(_webp(2100, 10), IMAGE_THUMB_SIZE)


def test_upload_carries_a_thumbhash() -> None:
    buffer = io.BytesIO()
    Image.new("RGB", (400, 300), (200, 50, 50)).save(buffer, format="JPEG")
    processed = validate_and_reencode(buffer.getvalue(), "image/jpeg")
    assert is_valid_thumbhash(processed.thumbhash)


def test_stored_image_thumbhash(tmp_path: Path) -> None:
    write_image_file(tmp_path, _ID, _webp(300, 200))
    assert is_valid_thumbhash(stored_image_thumbhash(tmp_path, _ID))
    with pytest.raises(ImageNotFoundError):
        stored_image_thumbhash(tmp_path, _OTHER_ID)


def test_variant_files_round_trip(tmp_path: Path) -> None:
    variants = tmp_path / "thumbs"
    assert read_variant_file(variants, _ID, "thumb") is None
    write_variant_file(variants, _ID, "thumb", b"small")
    write_variant_file(variants, _ID, "thumb2x", b"larger")
    assert read_variant_file(variants, _ID, "thumb") == b"small"
    assert sorted(path.name for path in variants.iterdir()) == [
        f"{_ID}-thumb.webp",
        f"{_ID}-thumb2x.webp",
    ]
    assert delete_variant_files(variants, _ID) == 2
    assert list(variants.iterdir()) == []
    assert delete_variant_files(variants, _ID) == 0


def test_a_failed_variant_write_leaves_no_temp_file(tmp_path: Path) -> None:
    variants = tmp_path / "thumbs"
    with (
        patch(
            "custom_components.smart_plants.images.os.fsync",
            side_effect=OSError(errno.ENOSPC, "No space left on device"),
        ),
        pytest.raises(OSError, match="No space"),
    ):
        write_variant_file(variants, _ID, "thumb", b"small")
    assert list(variants.iterdir()) == []


@pytest.mark.parametrize(
    ("image_id", "size"),
    [
        ("../" + _ID[3:], "thumb"),
        (_ID.upper(), "thumb"),
        (_ID + "\x00", "thumb"),
        (_ID, "../thumb"),
        (_ID, "large"),
    ],
)
def test_variant_paths_accept_only_known_shapes(
    tmp_path: Path, image_id: str, size: str
) -> None:
    variants = tmp_path / "thumbs"
    with pytest.raises(ImageValidationError):
        read_variant_file(variants, image_id, size)
    with pytest.raises(ImageValidationError):
        write_variant_file(variants, image_id, size, b"x")
    assert not variants.exists()


def test_list_variant_image_ids_skips_other_files(tmp_path: Path) -> None:
    write_variant_file(tmp_path, _ID, "thumb", b"x")
    (tmp_path / f".{_OTHER_ID}-thumb2x.webp.tmp").write_bytes(b"x")
    (tmp_path / "notes.txt").write_bytes(b"x")
    (tmp_path / f"{_ID}-large.webp").write_bytes(b"x")
    (tmp_path / "abc-thumb.webp").write_bytes(b"x")
    assert list_variant_image_ids(tmp_path) == {_ID, _OTHER_ID}
    assert list_variant_image_ids(tmp_path / "missing") == set()

    # Removing an id's copies removes its unfinished temp file as well.
    assert delete_variant_files(tmp_path, _OTHER_ID) == 1
    assert list_variant_image_ids(tmp_path) == {_ID}


def test_delete_image_and_variants(tmp_path: Path) -> None:
    images = tmp_path / "images"
    variants = tmp_path / "thumbs"
    write_image_file(images, _ID, _webp(10, 10))
    write_variant_file(variants, _ID, "thumb", b"x")
    write_variant_file(variants, _OTHER_ID, "thumb", b"x")
    assert delete_image_and_variants(images, variants, _ID) is True
    assert list(images.iterdir()) == []
    assert list_variant_image_ids(variants) == {_OTHER_ID}
    # Nothing left to remove, and a missing cache folder is fine.
    assert delete_image_and_variants(images, tmp_path / "none", _ID) is False
