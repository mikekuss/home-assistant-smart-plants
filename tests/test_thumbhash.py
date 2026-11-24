"""
Tests for the ThumbHash encoder.

The expected hashes were produced by ``rgbaToThumbHash`` of the JavaScript
reference package (``thumbhash`` 0.1.1 on npm) for the same pixels with
alpha 255, encoded with standard base64. The port uses ``math.cos``, which
can differ from ``Math.cos`` in the last bit, so a coefficient on a rounding
boundary may land one step off. Where that happens, the header with the
average colour and the scales must still match exactly and each coefficient
within one step; an image without such coefficients matches byte for byte.
"""

from __future__ import annotations

import base64
import time
from collections.abc import Callable
from unittest.mock import patch

import pytest
from custom_components.smart_plants.thumbhash import (
    image_thumbhash,
    rgb_to_thumbhash,
)
from PIL import Image

Pixel = Callable[[int, int], tuple[int, int, int]]


def _rgb(width: int, height: int, pixel: Pixel) -> bytes:
    data = bytearray()
    for y in range(height):
        for x in range(width):
            data.extend(pixel(x, y))
    return bytes(data)


def _gradient(x: int, y: int) -> tuple[int, int, int]:
    return (x * 255 // 99, y * 255 // 74, 128)


def _pattern(x: int, y: int) -> tuple[int, int, int]:
    return (
        200 if ((x >> 2) + (y >> 3)) % 2 else 30,
        (x * 7 + y * 3) % 256,
        (y * 11) % 256,
    )


def _solid(_x: int, _y: int) -> tuple[int, int, int]:
    return (34, 139, 34)


# Header bytes, then one 4-bit coefficient per nibble, low nibble first.
_HEADER_BYTES = 5


def _nibbles(digest: bytes) -> list[int]:
    return [n for byte in digest[_HEADER_BYTES:] for n in (byte & 15, byte >> 4)]


def _assert_near_reference(value: str, expected: str) -> None:
    digest = base64.b64decode(value, validate=True)
    reference = base64.b64decode(expected)
    assert len(digest) == len(reference)
    assert digest[:_HEADER_BYTES] == reference[:_HEADER_BYTES]
    for ours, theirs in zip(_nibbles(digest), _nibbles(reference), strict=True):
        assert abs(ours - theirs) <= 1


def test_matches_reference_encoder_exactly() -> None:
    digest = rgb_to_thumbhash(40, 100, _rgb(40, 100, _pattern))
    assert base64.b64encode(digest).decode("ascii") == "3ucFCwJWpDMCRYMkNN+/rbA="


@pytest.mark.parametrize(
    ("width", "height", "pixel", "expected"),
    [
        (100, 75, _gradient, "3wcKNZqAh4eAiHeIeHiHiICACPh3"),
        # A flat colour has no detail, so its coefficients are rounding
        # noise; the decoder multiplies them by a scale of zero.
        (64, 64, _solid, "kTkBBwBpaXeHd4h3hwh4h3iCeFC4gIkG"),
    ],
    ids=["landscape-gradient", "solid-colour"],
)
def test_matches_reference_encoder_within_one_step(
    width: int, height: int, pixel: Pixel, expected: str
) -> None:
    digest = rgb_to_thumbhash(width, height, _rgb(width, height, pixel))
    _assert_near_reference(base64.b64encode(digest).decode("ascii"), expected)


def test_image_thumbhash_matches_the_pixels_of_a_small_image() -> None:
    image = Image.frombytes("RGB", (100, 75), _rgb(100, 75, _gradient))
    _assert_near_reference(image_thumbhash(image), "3wcKNZqAh4eAiHeIeHiHiICACPh3")


def test_image_thumbhash_scales_a_large_image_down() -> None:
    image = Image.new("RGB", (2048, 1024), (40, 120, 60))
    with patch(
        "custom_components.smart_plants.thumbhash.rgb_to_thumbhash",
        wraps=rgb_to_thumbhash,
    ) as encoder:
        value = image_thumbhash(image)
    width, height, _rgb_data = encoder.call_args.args
    assert (width, height) == (100, 50)
    # The caller's image keeps its size.
    assert image.size == (2048, 1024)
    assert base64.b64decode(value, validate=True)
    assert len(value) <= 64


def test_image_thumbhash_accepts_other_modes() -> None:
    image = Image.new("L", (30, 20), 90)
    value = image_thumbhash(image)
    assert len(base64.b64decode(value)) >= 5


@pytest.mark.parametrize(("width", "height"), [(101, 10), (10, 101), (0, 5)])
def test_refuses_images_outside_100x100(width: int, height: int) -> None:
    with pytest.raises(ValueError, match="100x100"):
        rgb_to_thumbhash(width, height, bytes(max(width * height * 3, 0)))


def test_refuses_mismatched_pixel_data() -> None:
    with pytest.raises(ValueError, match="pixel data"):
        rgb_to_thumbhash(10, 10, bytes(10))


def test_full_size_encode_is_quick() -> None:
    rgb = _rgb(100, 100, _pattern)
    started = time.perf_counter()
    rgb_to_thumbhash(100, 100, rgb)
    # Generous bound for slow CI machines; the encode runs in the executor
    # once per upload.
    assert time.perf_counter() - started < 5
