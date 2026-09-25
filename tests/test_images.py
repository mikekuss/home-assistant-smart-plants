"""
Unit tests for the image validation/re-encoding pipeline.

These tests exercise ``validate_and_reencode`` (pure Pillow, no hass)
and the low-level file helpers to prove:

* Malformed / MIME-mismatched / oversized inputs are rejected before
  anything reaches disk.
* Decompression-bomb PNGs are refused before Pillow decodes pixels.
* Either dimension exceeding ``IMAGE_MAX_DIMENSION`` is rejected — no
  silent resize.
* Exact-boundary uploads (2048 on both axes) are accepted.
* EXIF/ICC/XMP metadata is dropped when re-encoded to WebP.
* Path-traversal / NUL-injection lookups can never reach the filesystem.
"""

from __future__ import annotations

import contextlib
import io
import struct
import zlib
from pathlib import Path

import pytest
from custom_components.smart_plants.const import (
    IMAGE_MAX_DECODE_PIXELS,
    IMAGE_MAX_DIMENSION,
    IMAGE_MAX_UPLOAD_BYTES,
    IMAGE_OUTPUT_CONTENT_TYPE,
)
from custom_components.smart_plants.images import (
    ImageNotFoundError,
    ImageValidationError,
    _is_safe_image_id,
    delete_image_file,
    image_path,
    list_image_files,
    read_image_file,
    validate_and_reencode,
    write_image_file,
)
from custom_components.smart_plants.models import PlantImage
from PIL import Image


def _jpeg_bytes(width: int, height: int) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), (200, 50, 50)).save(
        buf, format="JPEG", quality=90
    )
    return buf.getvalue()


def _png_bytes(width: int, height: int) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), (50, 200, 50)).save(buf, format="PNG")
    return buf.getvalue()


def _webp_bytes(width: int, height: int) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), (50, 50, 200)).save(buf, format="WEBP")
    return buf.getvalue()


def _fake_bomb_png(declared_width: int, declared_height: int) -> bytes:
    """
    Craft a minimal PNG whose IHDR claims huge dimensions.

    Only the header is well-formed; the IDAT is a valid one-pixel
    zlib payload. Real Pillow inspects IHDR during ``open()`` so this
    is enough to trip the decompression-bomb guard.
    """
    signature = b"\x89PNG\r\n\x1a\n"

    def _chunk(kind: bytes, data: bytes) -> bytes:
        length = struct.pack(">I", len(data))
        crc = struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        return length + kind + data + crc

    ihdr = struct.pack(">IIBBBBB", declared_width, declared_height, 8, 2, 0, 0, 0)
    idat = zlib.compress(b"\x00\x00\x00\x00")
    return (
        signature + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", idat) + _chunk(b"IEND", b"")
    )


def test_rejects_empty_payload() -> None:
    with pytest.raises(ImageValidationError):
        validate_and_reencode(b"", "image/jpeg")


def test_rejects_non_bytes_payload() -> None:
    with pytest.raises(ImageValidationError):
        validate_and_reencode("not bytes", "image/jpeg")  # type: ignore[arg-type]


def test_rejects_oversized_payload() -> None:
    huge = b"\x00" * (IMAGE_MAX_UPLOAD_BYTES + 1)
    with pytest.raises(ImageValidationError):
        validate_and_reencode(huge, "image/jpeg")


def test_rejects_unsupported_declared_type() -> None:
    with pytest.raises(ImageValidationError):
        validate_and_reencode(_jpeg_bytes(10, 10), "image/gif")


def test_rejects_mime_mismatch_between_declared_and_actual() -> None:
    with pytest.raises(ImageValidationError):
        # Declared as JPEG but the bytes are actually PNG.
        validate_and_reencode(_png_bytes(10, 10), "image/jpeg")


def test_rejects_malformed_bytes() -> None:
    with pytest.raises(ImageValidationError):
        validate_and_reencode(b"\xff\xd8not really a jpeg", "image/jpeg")


def test_rejects_decompression_bomb_declared_dimensions() -> None:
    # Header claims a 100_000 x 100_000 image; must be rejected before
    # any pixel allocation happens.
    payload = _fake_bomb_png(100_000, 100_000)
    with pytest.raises(ImageValidationError):
        validate_and_reencode(payload, "image/png")


def test_accepts_and_returns_webp_for_valid_jpeg() -> None:
    processed = validate_and_reencode(_jpeg_bytes(400, 300), "image/jpeg")
    assert processed.content_type == IMAGE_OUTPUT_CONTENT_TYPE
    assert processed.width == 400
    assert processed.height == 300
    # The output must actually be WebP.
    with Image.open(io.BytesIO(processed.data)) as decoded:
        assert decoded.format == "WEBP"


def test_rejects_oversized_phone_photo() -> None:
    # Simulate an oversized phone photo: 4000x3000 JPEG. Must be
    # rejected outright — never silently downscaled. What the user
    # sends is what the store keeps, or the upload is refused.
    with pytest.raises(ImageValidationError):
        validate_and_reencode(_jpeg_bytes(4000, 3000), "image/jpeg")


def test_rejects_dimension_just_over_cap_width() -> None:
    with pytest.raises(ImageValidationError):
        validate_and_reencode(_jpeg_bytes(IMAGE_MAX_DIMENSION + 1, 100), "image/jpeg")


def test_rejects_dimension_just_over_cap_height() -> None:
    with pytest.raises(ImageValidationError):
        validate_and_reencode(_jpeg_bytes(100, IMAGE_MAX_DIMENSION + 1), "image/jpeg")


def test_accepts_exact_dimension_cap_boundary() -> None:
    # A picture on both boundaries must pass — the cap is inclusive.
    processed = validate_and_reencode(
        _jpeg_bytes(IMAGE_MAX_DIMENSION, IMAGE_MAX_DIMENSION), "image/jpeg"
    )
    assert processed.width == IMAGE_MAX_DIMENSION
    assert processed.height == IMAGE_MAX_DIMENSION


def test_strips_exif_metadata() -> None:
    # Build a JPEG carrying a fake EXIF block; the re-encoded WebP
    # must not carry the EXIF fields through.
    original = Image.new("RGB", (100, 100), (10, 10, 10))
    exif = original.getexif()
    exif[271] = "TestCameraMaker"  # Make
    exif[272] = "TestCameraModel"  # Model
    buf = io.BytesIO()
    original.save(buf, format="JPEG", exif=exif.tobytes())
    src = buf.getvalue()

    processed = validate_and_reencode(src, "image/jpeg")
    with Image.open(io.BytesIO(processed.data)) as decoded:
        decoded_exif = decoded.getexif()
        assert 271 not in decoded_exif
        assert 272 not in decoded_exif
        # info block should not carry EXIF either (belt and braces).
        assert "exif" not in decoded.info


def test_image_id_shape_rejects_traversal() -> None:
    assert _is_safe_image_id("abcdef0123456789abcdef0123456789")
    assert not _is_safe_image_id("../etc/passwd")
    assert not _is_safe_image_id("a" * 33)
    assert not _is_safe_image_id("a" * 31)
    assert not _is_safe_image_id("../aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    assert not _is_safe_image_id("00000000000000000000000000000000/x")
    assert not _is_safe_image_id("00000000000000000000000000000000\x00")
    assert not _is_safe_image_id("ABCDEF0123456789ABCDEF0123456789")  # uppercase


def test_image_path_rejects_malformed_id(tmp_path: Path) -> None:
    with pytest.raises(ImageValidationError):
        image_path(tmp_path, "../secret")


def test_write_read_delete_roundtrip(tmp_path: Path) -> None:
    image_id = "0123456789abcdef0123456789abcdef"
    write_image_file(tmp_path, image_id, b"hello")
    assert read_image_file(tmp_path, image_id) == b"hello"
    assert delete_image_file(tmp_path, image_id) is True
    with pytest.raises(ImageNotFoundError):
        read_image_file(tmp_path, image_id)


def test_delete_nonexistent_is_false(tmp_path: Path) -> None:
    image_id = "0123456789abcdef0123456789abcdef"
    assert delete_image_file(tmp_path, image_id) is False


def test_list_image_files_ignores_foreign_names(tmp_path: Path) -> None:
    image_id = "0123456789abcdef0123456789abcdef"
    write_image_file(tmp_path, image_id, b"x")
    (tmp_path / "not-a-valid-id.webp").write_bytes(b"y")
    (tmp_path / "0123456789abcdef0123456789abcdef.png").write_bytes(b"z")
    ids = [i for i, _mtime in list_image_files(tmp_path)]
    assert ids == [image_id]


def test_strips_icc_profile_and_xmp_metadata() -> None:
    # Build a JPEG carrying an ICC profile and an XMP packet; both
    # must be dropped by the re-encode pipeline. Pillow surfaces ICC
    # via ``info['icc_profile']`` and XMP via ``info['xmp']`` (or
    # ``getxmp()``); we assert neither ends up on the re-encoded WebP.
    original = Image.new("RGB", (100, 100), (10, 10, 10))
    icc_bytes = b"\x00\x00\x00\x0cfake-icc"
    xmp_packet = (
        b"<?xpacket begin='\xef\xbb\xbf' id='W5M0MpCehiHzreSzNTczkc9d'?>"
        b"<x:xmpmeta xmlns:x='adobe:ns:meta/'><rdf:RDF/></x:xmpmeta>"
        b"<?xpacket end='w'?>"
    )
    buf = io.BytesIO()
    original.save(
        buf,
        format="JPEG",
        icc_profile=icc_bytes,
        xmp=xmp_packet,
    )
    src = buf.getvalue()

    processed = validate_and_reencode(src, "image/jpeg")
    with Image.open(io.BytesIO(processed.data)) as decoded:
        assert "icc_profile" not in decoded.info
        assert "xmp" not in decoded.info
        # ``getxmp()`` returns an empty dict when there is no XMP.
        # Older Pillow builds may not expose getxmp() at all; the info
        # checks above are still authoritative in that case.
        with contextlib.suppress(AttributeError):
            assert decoded.getxmp() in ({}, None)


# --- Persisted PlantImage metadata validation ----------------------------


_VALID_STORED_IMAGE: dict[str, object] = {
    "id": "0123456789abcdef0123456789abcdef",
    "content_type": "image/webp",
    "width": 200,
    "height": 150,
    "created_at": "2026-09-05T00:00:00+00:00",
}


def test_stored_image_accepts_valid_record() -> None:
    image = PlantImage.from_storage(dict(_VALID_STORED_IMAGE))
    assert image.id == _VALID_STORED_IMAGE["id"]


@pytest.mark.parametrize(
    "bad_id",
    [
        "../etc/passwd",
        "not-hex-not-hex-not-hex-not-hex!",
        "ABCDEF0123456789ABCDEF0123456789",  # uppercase
        "0123456789abcdef",  # too short
        "0123456789abcdef0123456789abcdef00",  # too long
    ],
)
def test_stored_image_rejects_malformed_id(bad_id: str) -> None:
    payload = dict(_VALID_STORED_IMAGE)
    payload["id"] = bad_id
    with pytest.raises(ValueError, match="plant image id"):
        PlantImage.from_storage(payload)


@pytest.mark.parametrize(
    "bad_mime",
    ["image/jpeg", "image/png", "image/gif", "application/octet-stream", ""],
)
def test_stored_image_rejects_non_webp_mime(bad_mime: str) -> None:
    payload = dict(_VALID_STORED_IMAGE)
    payload["content_type"] = bad_mime
    with pytest.raises(ValueError, match="plant image content_type"):
        PlantImage.from_storage(payload)


def test_stored_image_rejects_oversized_width() -> None:
    payload = dict(_VALID_STORED_IMAGE)
    payload["width"] = IMAGE_MAX_DIMENSION + 1
    with pytest.raises(ValueError, match="dimensions"):
        PlantImage.from_storage(payload)


def test_stored_image_rejects_oversized_height() -> None:
    payload = dict(_VALID_STORED_IMAGE)
    payload["height"] = IMAGE_MAX_DIMENSION + 1
    with pytest.raises(ValueError, match="dimensions"):
        PlantImage.from_storage(payload)


@pytest.mark.parametrize("bad_dim", [0, -1])
def test_stored_image_rejects_non_positive_dimension(bad_dim: int) -> None:
    payload = dict(_VALID_STORED_IMAGE)
    payload["width"] = bad_dim
    with pytest.raises(ValueError, match="plant image width"):
        PlantImage.from_storage(payload)


@pytest.mark.parametrize(
    "bad_timestamp",
    [
        "not-a-timestamp",
        "2026/09/05",
        "yesterday",
        "",
    ],
)
def test_stored_image_rejects_malformed_timestamp(bad_timestamp: str) -> None:
    payload = dict(_VALID_STORED_IMAGE)
    payload["created_at"] = bad_timestamp
    with pytest.raises(ValueError, match="created_at"):
        PlantImage.from_storage(payload)


def test_stored_image_accepts_zulu_timestamp() -> None:
    payload = dict(_VALID_STORED_IMAGE)
    payload["created_at"] = "2026-09-05T00:00:00Z"
    image = PlantImage.from_storage(payload)
    assert image.created_at == "2026-09-05T00:00:00Z"


def test_max_decode_pixels_ceiling_matches_pillow_setting() -> None:
    # Defense in depth: Pillow's own MAX_IMAGE_PIXELS must be set to our
    # ceiling on import so a bomb file that slips past the probe still
    # trips DecompressionBombError inside load().
    assert Image.MAX_IMAGE_PIXELS == IMAGE_MAX_DECODE_PIXELS
