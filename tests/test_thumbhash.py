"""
Tests for the ThumbHash encoder.

The expected hashes were produced by ``rgbaToThumbHash`` of the JavaScript
reference package (``thumbhash`` 0.1.1 on npm) for the same pixels with
alpha 255, encoded with standard base64. Matching them byte for byte shows
the port writes what every ThumbHash decoder expects.
"""

from __future__ import annotations

import base64
import math
import time
from collections.abc import Callable
from unittest.mock import patch

import pytest
from custom_components.smart_plants.thumbhash import (
    _cos,
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


@pytest.mark.parametrize(
    ("width", "height", "pixel", "expected"),
    [
        (100, 75, _gradient, "3wcKNZqAh4eAiHeIeHiHiICACPh3"),
        (40, 100, _pattern, "3ucFCwJWpDMCRYMkNN+/rbA="),
        (64, 64, _solid, "kTkBBwBpaXeHd4h3hwh4h3iCeFC4gIkG"),
    ],
    ids=["landscape-gradient", "portrait-pattern", "solid-colour"],
)
def test_matches_reference_encoder(
    width: int, height: int, pixel: Pixel, expected: str
) -> None:
    digest = rgb_to_thumbhash(width, height, _rgb(width, height, pixel))
    assert base64.b64encode(digest).decode("ascii") == expected


# ``Math.cos`` results of Node.js for ``pi / n * c * (x + 0.5)``. The C
# library behind ``math.cos`` returns a neighbouring float for some of these
# on some platforms.
@pytest.mark.parametrize(
    ("n", "c", "x", "expected"),
    [
        (100, 1, 11, 0.9354440308298673),
        (100, 1, 17, 0.8526401643540923),
        (100, 1, 56, -0.2027872953565126),
        (100, 1, 59, -0.29404032523230395),
        (100, 1, 77, -0.7604059656000308),
        (75, 6, 70, 0.4257792915650714),
        (37, 5, 30, 0.9278890272965099),
    ],
)
def test_cosine_matches_javascript(n: int, c: int, x: int, expected: float) -> None:
    assert _cos(math.pi / n * c * (x + 0.5)) == expected


def test_cosine_is_accurate_for_every_encoder_argument() -> None:
    for n in range(1, 101):
        for c in range(7):
            for x in range(n):
                argument = math.pi / n * c * (x + 0.5)
                reference = math.cos(argument)
                assert abs(_cos(argument) - reference) <= math.ulp(reference)


def test_cosine_refuses_arguments_it_does_not_reduce() -> None:
    with pytest.raises(ValueError, match="cosine"):
        _cos(-1.0)
    with pytest.raises(ValueError, match="cosine"):
        _cos(1e7)


def test_image_thumbhash_matches_the_pixels_of_a_small_image() -> None:
    image = Image.frombytes("RGB", (100, 75), _rgb(100, 75, _gradient))
    assert image_thumbhash(image) == "3wcKNZqAh4eAiHeIeHiHiICACPh3"


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
