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
import errno
import io
import struct
import subprocess
import sys
import warnings
import zlib
from pathlib import Path
from unittest.mock import patch

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
    _decode_and_sanitize,
    _is_safe_image_id,
    _to_eight_bit,
    delete_image_file,
    image_path,
    list_image_files,
    make_variant,
    read_image_file,
    stored_image_thumbhash,
    validate_and_reencode,
    write_image_file,
)
from custom_components.smart_plants.models import PlantImage
from custom_components.smart_plants.photo_meta import is_valid_thumbhash
from custom_components.smart_plants.thumbhash import image_thumbhash
from PIL import Image, ImageFile


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


def _mpo_bytes(width: int, height: int) -> bytes:
    """Return a JPEG with a Multi-Picture extension and two frames."""
    buf = io.BytesIO()
    first = Image.new("RGB", (width, height), (200, 50, 50))
    second = Image.new("RGB", (width, height), (50, 50, 200))
    first.save(buf, format="MPO", save_all=True, append_images=[second])
    return buf.getvalue()


def test_accepts_multi_picture_jpeg_and_keeps_the_first_frame() -> None:
    raw = _mpo_bytes(64, 48)
    with Image.open(io.BytesIO(raw)) as probe:
        assert probe.format == "MPO"
        assert getattr(probe, "n_frames", 1) == 2

    processed = validate_and_reencode(raw, "image/jpeg")

    assert processed.content_type == IMAGE_OUTPUT_CONTENT_TYPE
    assert (processed.width, processed.height) == (64, 48)
    with Image.open(io.BytesIO(processed.data)) as decoded:
        assert decoded.format == "WEBP"
        assert getattr(decoded, "n_frames", 1) == 1
        pixel = decoded.convert("RGB").getpixel((32, 24))
        assert isinstance(pixel, tuple)
        assert pixel[0] > pixel[2]


def test_rejects_multi_picture_jpeg_declared_as_png() -> None:
    with pytest.raises(ImageValidationError, match="does not match"):
        validate_and_reencode(_mpo_bytes(64, 48), "image/png")


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


def test_applies_exif_orientation_before_dropping_metadata() -> None:
    # Phone cameras store a portrait photo as landscape pixels plus
    # Orientation=6 ("rotate 90° clockwise to display"). The stored WebP has
    # no EXIF, so the rotation must be in the pixels or the photo lies on its
    # side. Left half red, right half blue: after the rotation red is on top.
    original = Image.new("RGB", (80, 40), (220, 20, 20))
    original.paste((20, 20, 220), (40, 0, 80, 40))
    exif = original.getexif()
    exif[0x0112] = 6  # Orientation
    buf = io.BytesIO()
    original.save(buf, format="JPEG", quality=95, exif=exif.tobytes())

    processed = validate_and_reencode(buf.getvalue(), "image/jpeg")

    assert (processed.width, processed.height) == (40, 80)
    with Image.open(io.BytesIO(processed.data)) as decoded:
        assert decoded.size == (40, 80)
        assert 0x0112 not in decoded.getexif()
        rgb = decoded.convert("RGB")
        top = rgb.getpixel((20, 10))
        bottom = rgb.getpixel((20, 70))
    assert isinstance(top, tuple)
    assert isinstance(bottom, tuple)
    assert top[0] > top[2]
    assert bottom[2] > bottom[0]


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


@pytest.mark.parametrize("step", ["os.fsync", "Path.replace"])
def test_failed_write_removes_the_temp_file(tmp_path: Path, step: str) -> None:
    image_id = "0123456789abcdef0123456789abcdef"
    full = OSError(errno.ENOSPC, "No space left on device")
    with (
        patch(f"custom_components.smart_plants.images.{step}", side_effect=full),
        pytest.raises(OSError, match="No space left") as info,
    ):
        write_image_file(tmp_path / "images", image_id, b"hello")
    # The caller sees the original error, and nothing is left on disk.
    assert info.value is full
    assert list((tmp_path / "images").iterdir()) == []


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


def test_importing_images_leaves_pillow_global_limit_alone() -> None:
    # Pillow's MAX_IMAGE_PIXELS is shared by every integration in the Home
    # Assistant process, so importing this module must not change it. A
    # fresh interpreter shows the import effect without the test session's
    # earlier imports hiding it.
    script = (
        "from PIL import Image\n"
        "before = Image.MAX_IMAGE_PIXELS\n"
        "import custom_components.smart_plants.images\n"
        "assert Image.MAX_IMAGE_PIXELS == before, Image.MAX_IMAGE_PIXELS\n"
    )
    result = subprocess.run(  # noqa: S603 - fixed script, current interpreter
        [sys.executable, "-c", script],
        cwd=Path(__file__).resolve().parent.parent,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize(
    ("width", "height"),
    [
        # Just above our ceiling, below Pillow's default warning threshold.
        (8_001, 8_000),
        # Inside Pillow's default warning band.
        (10_000, 10_000),
        # Above Pillow's default error threshold.
        (100_000, 100_000),
    ],
)
@pytest.mark.parametrize("global_limit", ["default", None, 10**12])
# With Pillow's default limit the middle case warns before our check rejects it.
@pytest.mark.filterwarnings("ignore::PIL.Image.DecompressionBombWarning")
def test_pixel_ceiling_is_enforced_without_pillow_global(
    monkeypatch: pytest.MonkeyPatch,
    width: int,
    height: int,
    global_limit: object,
) -> None:
    # Whatever another integration does with the process-wide limit
    # (keep it, disable it, raise it), headers above our own ceiling are
    # refused with the same error.
    assert width * height > IMAGE_MAX_DECODE_PIXELS
    if global_limit != "default":
        monkeypatch.setattr(Image, "MAX_IMAGE_PIXELS", global_limit)
    with pytest.raises(ImageValidationError, match="decode ceiling"):
        validate_and_reencode(_fake_bomb_png(width, height), "image/png")


def test_pixel_ceiling_holds_when_pillow_warnings_are_errors() -> None:
    # A host that turns warnings into exceptions must still see our
    # validation error, not a raw DecompressionBombWarning.
    payload = _fake_bomb_png(10_000, 10_000)
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        with pytest.raises(ImageValidationError, match="decode ceiling"):
            validate_and_reencode(payload, "image/png")


def test_decode_checks_pixel_ceiling_before_loading_pixels(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # The decode step must refuse an oversized header on its own, before
    # Pillow allocates pixels, even with the process-wide limit disabled.
    monkeypatch.setattr(Image, "MAX_IMAGE_PIXELS", None)

    def _no_load(self: object) -> None:
        raise AssertionError("pixels were decoded")

    monkeypatch.setattr(ImageFile.ImageFile, "load", _no_load)
    with pytest.raises(ImageValidationError):
        _decode_and_sanitize(_fake_bomb_png(8_001, 8_000))


# --- Transparency and 16-bit input -----------------------------------------

_LEAF = (40, 160, 60)
# The top-left 16x16 pixels of the transparent test photos are see-through.
_CORNER = (0, 0, 16, 16)


def _encode(image: Image.Image, fmt: str, **params: object) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format=fmt, **params)
    return buffer.getvalue()


def _rgba_photo() -> Image.Image:
    image = Image.new("RGBA", (64, 64), (*_LEAF, 255))
    image.paste((0, 0, 0, 0), _CORNER)
    return image


def _palette_photo() -> Image.Image:
    image = Image.new("P", (64, 64), 1)
    image.putpalette([0, 0, 0, *_LEAF] + [0] * (256 * 3 - 6))
    image.paste(0, _CORNER)
    return image


def _gray_alpha_photo() -> Image.Image:
    image = Image.new("LA", (64, 64), (128, 255))
    image.paste((0, 0), _CORNER)
    return image


def _stored(processed_data: bytes) -> Image.Image:
    with Image.open(io.BytesIO(processed_data)) as decoded:
        assert decoded.format == "WEBP"
        decoded.load()
        return decoded.copy()


def _close(actual: object, expected: tuple[int, ...], tolerance: int = 6) -> bool:
    assert isinstance(actual, tuple)
    return all(abs(a - e) <= tolerance for a, e in zip(actual, expected, strict=True))


@pytest.mark.parametrize(
    ("raw", "content_type", "opaque"),
    [
        (_encode(_rgba_photo(), "PNG"), "image/png", (*_LEAF, 255)),
        (
            _encode(_palette_photo(), "PNG", transparency=0),
            "image/png",
            (*_LEAF, 255),
        ),
        (_encode(_gray_alpha_photo(), "PNG"), "image/png", (128, 128, 128, 255)),
        (_encode(_rgba_photo(), "WEBP", lossless=True), "image/webp", (*_LEAF, 255)),
        (_encode(_rgba_photo(), "WEBP", quality=90), "image/webp", (*_LEAF, 255)),
    ],
    ids=["rgba-png", "palette-png", "gray-alpha-png", "lossless-webp", "lossy-webp"],
)
def test_keeps_the_transparency_of_a_photo(
    raw: bytes, content_type: str, opaque: tuple[int, ...]
) -> None:
    processed = validate_and_reencode(raw, content_type)

    stored = _stored(processed.data)
    assert stored.mode == "RGBA"
    corner = stored.getpixel((4, 4))
    assert isinstance(corner, tuple)
    assert corner[3] == 0
    assert _close(stored.getpixel((40, 40)), opaque)
    assert _close(stored.getpixel((17, 17)), opaque)


@pytest.mark.parametrize(
    ("raw", "content_type"),
    [
        (_png_bytes(64, 64), "image/png"),
        (_jpeg_bytes(64, 64), "image/jpeg"),
        (_webp_bytes(64, 64), "image/webp"),
        # An alpha channel that is opaque everywhere is not kept.
        (_encode(Image.new("RGBA", (64, 64), (*_LEAF, 255)), "PNG"), "image/png"),
        # A palette with a transparent entry no pixel uses.
        (
            _encode(Image.new("P", (64, 64), 1), "PNG", transparency=0),
            "image/png",
        ),
    ],
    ids=["png", "jpeg", "webp", "opaque-rgba-png", "unused-transparency"],
)
def test_stores_an_opaque_photo_without_alpha(raw: bytes, content_type: str) -> None:
    processed = validate_and_reencode(raw, content_type)
    assert _stored(processed.data).mode == "RGB"


def test_smaller_copies_keep_the_transparency() -> None:
    photo = _rgba_photo().resize((640, 640), Image.Resampling.NEAREST)
    stored = validate_and_reencode(_encode(photo, "PNG"), "image/png").data

    copy = _stored(make_variant(stored, 160))

    assert copy.size == (160, 160)
    assert copy.mode == "RGBA"
    corner = copy.getpixel((10, 10))
    assert isinstance(corner, tuple)
    assert corner[3] == 0
    assert _close(copy.getpixel((120, 120)), (*_LEAF, 255))


def test_thumbhash_of_a_transparent_photo_uses_a_white_background(
    tmp_path: Path,
) -> None:
    raw = _encode(_rgba_photo(), "PNG")
    first = validate_and_reencode(raw, "image/png")
    second = validate_and_reencode(raw, "image/png")

    assert is_valid_thumbhash(first.thumbhash)
    assert first.thumbhash == second.thumbhash
    on_white = Image.new("RGB", (64, 64), (*_LEAF,))
    on_white.paste((255, 255, 255), _CORNER)
    assert first.thumbhash == image_thumbhash(on_white)

    image_id = "0123456789abcdef0123456789abcdef"
    write_image_file(tmp_path, image_id, first.data)
    stored_hash = stored_image_thumbhash(tmp_path, image_id)
    assert is_valid_thumbhash(stored_hash)
    assert stored_hash == stored_image_thumbhash(tmp_path, image_id)


def test_scales_a_16_bit_gray_photo_to_8_bit() -> None:
    # 30000 of 65535 is a mid-gray. Clipping it to 8 bit would store white.
    raw = _encode(Image.new("I;16", (64, 64), 30000), "PNG")

    stored = _stored(validate_and_reencode(raw, "image/png").data)

    assert stored.mode == "RGB"
    pixel = stored.getpixel((32, 32))
    assert isinstance(pixel, tuple)
    assert all(abs(channel - 117) <= 1 for channel in pixel)


@pytest.mark.parametrize(
    ("value", "expected"),
    [(0, 0), (30000, 117), (65535, 255), (-5, 0), (70000, 255)],
)
def test_rounds_wide_gray_values_to_8_bit(value: int, expected: int) -> None:
    scaled = _to_eight_bit(Image.new("I", (4, 4), value))
    assert scaled.mode == "L"
    assert scaled.getpixel((0, 0)) == expected


def test_stores_a_16_bit_gray_photo_with_a_transparency_colour_opaque() -> None:
    # Its 16-bit transparency colour would match the wrong pixels after
    # scaling to 8 bit: 30000 / 257 rounds to 117.
    buffer = io.BytesIO()
    Image.new("I;16", (64, 64), 30000).save(buffer, format="PNG", transparency=117)

    stored = _stored(validate_and_reencode(buffer.getvalue(), "image/png").data)

    assert stored.mode == "RGB"


def _png_chunk(kind: bytes, data: bytes) -> bytes:
    body = kind + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))


def test_stores_a_16_bit_rgb_photo_with_a_transparency_colour_opaque() -> None:
    # Two 16-bit pixels: the transparency colour 0x1234 and 0x3400. Read as
    # 8 bit, the 16-bit key would hide the second pixel instead of the first.
    ihdr = struct.pack(">IIBBBBB", 2, 1, 16, 2, 0, 0, 0)
    trns = struct.pack(">HHH", 0x1234, 0x1234, 0x1234)
    pixels = (0x1234, 0x1234, 0x1234, 0x3400, 0x3400, 0x3400)
    row = b"\x00" + struct.pack(">HHHHHH", *pixels)
    raw = (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"tRNS", trns)
        + _png_chunk(b"IDAT", zlib.compress(row))
        + _png_chunk(b"IEND", b"")
    )

    stored = _stored(validate_and_reencode(raw, "image/png").data)

    assert stored.mode == "RGB"


def test_applies_the_orientation_and_drops_metadata_of_a_transparent_png() -> None:
    # Left half red, right half blue, top-left corner transparent, stored
    # with Orientation=6: after turning, red is on top and the transparent
    # corner is at the top right.
    original = Image.new("RGBA", (80, 40), (220, 20, 20, 255))
    original.paste((20, 20, 220, 255), (40, 0, 80, 40))
    original.paste((0, 0, 0, 0), (0, 0, 8, 8))
    exif = original.getexif()
    exif[0x0112] = 6
    exif[271] = "TestCameraMaker"
    raw = _encode(
        original, "PNG", exif=exif.tobytes(), icc_profile=b"\x00\x00\x00\x0cfake-icc"
    )

    processed = validate_and_reencode(raw, "image/png")

    assert (processed.width, processed.height) == (40, 80)
    with Image.open(io.BytesIO(processed.data)) as decoded:
        assert decoded.mode == "RGBA"
        assert "exif" not in decoded.info
        assert "icc_profile" not in decoded.info
        assert 271 not in decoded.getexif()
        corner = decoded.getpixel((36, 3))
        top = decoded.getpixel((10, 20))
        bottom = decoded.getpixel((20, 70))
    assert isinstance(corner, tuple)
    assert corner[3] == 0
    assert _close(top, (220, 20, 20, 255), 12)
    assert _close(bottom, (20, 20, 220, 255), 12)
