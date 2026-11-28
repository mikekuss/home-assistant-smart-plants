"""
ThumbHash encoder for plant photos.

A ThumbHash is a compact (about 25 bytes) description of an image that a
browser decodes into a blurred placeholder while the real photo loads. This
module is a Python port of ``rgbaToThumbHash`` from the ThumbHash reference
implementation by Evan Wallace (https://github.com/evanw/thumbhash), so any
ThumbHash decoder reads the result.

Only the path of the reference encoder for fully opaque images is ported:
the placeholder is always opaque. A photo with transparency is put on a
white background first (see ``image_thumbhash``), so the alpha channel, and
the extra header byte and coefficients it adds, never occur.

The cosine is ``math.cos``. The C library behind it can differ from the
``Math.cos`` of a browser in the last bit of some results, which can move
a coefficient on a rounding boundary by one step. The hash can therefore
differ from the one the JavaScript encoder writes in a few bits, but the
placeholder drawn from it looks the same, and nothing compares the two.

The ported code is used under the MIT license of the reference
implementation:

    Copyright (c) 2023 Evan Wallace

    Permission is hereby granted, free of charge, to any person obtaining a
    copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be included
    in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
"""

from __future__ import annotations

import base64
import math
from functools import reduce
from operator import add, mul
from typing import TYPE_CHECKING, Final

from PIL import Image

if TYPE_CHECKING:
    from collections.abc import Sequence

# The reference encoder refuses larger input: a bigger image takes longer
# and changes nothing in a hash of a few dozen coefficients.
THUMBHASH_MAX_SIZE: Final = 100

# The reference scales each 0-255 channel value as ``alpha / 255 * value``
# with ``alpha == 1`` for an opaque pixel. Precomputing that product keeps
# every float operation the same as in the reference.
_UNIT: Final = tuple((1 / 255) * value for value in range(256))


def _js_round(value: float) -> int:
    """Round half up like JavaScript ``Math.round`` (Python rounds to even)."""
    floor = math.floor(value)
    return floor + 1 if value - floor >= 0.5 else floor  # noqa: PLR2004


def _encode_channel(
    channel: Sequence[float], width: int, height: int, nx: int, ny: int
) -> tuple[float, list[float], float]:
    """
    Return the DC term, the normalized AC terms and their scale.

    The reference sums ``channel * fx * fy`` pixel by pixel, row by row. The
    products and the running sum are built here with ``map`` and ``reduce``
    in exactly that order; Python's ``sum`` would use a compensated sum and
    could change the last bits of a coefficient.
    """
    dc = 0.0
    ac: list[float] = []
    scale = 0.0
    pixels = width * height
    for cy in range(ny):
        fy = [math.cos(math.pi / height * cy * (y + 0.5)) for y in range(height)]
        fy_per_pixel = [value for value in fy for _ in range(width)]
        cx = 0
        while cx * ny < nx * (ny - cy):
            fx = [math.cos(math.pi / width * cx * (x + 0.5)) for x in range(width)]
            products = map(
                mul,
                map(mul, channel, fx * height, strict=True),
                fy_per_pixel,
                strict=True,
            )
            f = reduce(add, products, 0.0) / pixels
            if cx or cy:
                ac.append(f)
                scale = max(scale, abs(f))
            else:
                dc = f
            cx += 1
    if scale:
        ac = [0.5 + 0.5 / scale * value for value in ac]
    return dc, ac, scale


def rgb_to_thumbhash(width: int, height: int, rgb: bytes) -> bytes:
    """
    Encode opaque RGB pixels (row by row, 3 bytes each) to a ThumbHash.

    ``width`` and ``height`` must both be between 1 and 100.
    """
    if not (0 < width <= THUMBHASH_MAX_SIZE and 0 < height <= THUMBHASH_MAX_SIZE):
        raise ValueError(f"{width}x{height} doesn't fit in 100x100")
    if len(rgb) != width * height * 3:
        raise ValueError("pixel data does not match the image size")

    longest = max(width, height)
    lx = max(1, _js_round(7 * width / longest))
    ly = max(1, _js_round(7 * height / longest))

    # Convert to luminance and two colour differences, as the reference
    # does after compositing; an opaque pixel composites to itself.
    unit = _UNIT
    red = [unit[value] for value in rgb[0::3]]
    green = [unit[value] for value in rgb[1::3]]
    blue = [unit[value] for value in rgb[2::3]]
    lum = [(r + g + b) / 3 for r, g, b in zip(red, green, blue, strict=True)]
    yellow_blue = [(r + g) / 2 - b for r, g, b in zip(red, green, blue, strict=True)]
    red_green = [r - g for r, g in zip(red, green, strict=True)]

    l_dc, l_ac, l_scale = _encode_channel(lum, width, height, max(3, lx), max(3, ly))
    p_dc, p_ac, p_scale = _encode_channel(yellow_blue, width, height, 3, 3)
    q_dc, q_ac, q_scale = _encode_channel(red_green, width, height, 3, 3)

    is_landscape = width > height
    header24 = (
        _js_round(63 * l_dc)
        | (_js_round(31.5 + 31.5 * p_dc) << 6)
        | (_js_round(31.5 + 31.5 * q_dc) << 12)
        | (_js_round(31 * l_scale) << 18)
    )
    header16 = (
        (ly if is_landscape else lx)
        | (_js_round(63 * p_scale) << 3)
        | (_js_round(63 * q_scale) << 9)
        | (int(is_landscape) << 15)
    )
    factors = [*l_ac, *p_ac, *q_ac]
    packed = bytearray((len(factors) + 1) // 2)
    for index, factor in enumerate(factors):
        packed[index >> 1] |= _js_round(15 * factor) << ((index & 1) << 2)
    return (
        bytes(
            (
                header24 & 255,
                (header24 >> 8) & 255,
                header24 >> 16,
                header16 & 255,
                header16 >> 8,
            )
        )
        + packed
    )


def image_thumbhash(image: Image.Image) -> str:
    """
    Return the base64 ThumbHash of ``image``.

    A copy is scaled down to fit 100x100 with its aspect ratio kept, as the
    reference encoder expects. The result is standard base64 with padding,
    the form browsers produce with ``btoa``.

    The placeholder is opaque. An image with an alpha channel is scaled
    down with it and then laid on white, the same background for every
    photo, so the result depends only on the pixels.
    """
    # ``convert`` returns a new image even for a source already in that
    # mode, so the caller's image is never resized in place.
    has_alpha = "A" in image.getbands()
    small = image.convert("RGBA" if has_alpha else "RGB")
    small.thumbnail((THUMBHASH_MAX_SIZE, THUMBHASH_MAX_SIZE), Image.Resampling.LANCZOS)
    if has_alpha:
        white = Image.new("RGBA", small.size, (255, 255, 255, 255))
        small = Image.alpha_composite(white, small).convert("RGB")
    digest = rgb_to_thumbhash(small.width, small.height, small.tobytes())
    return base64.b64encode(digest).decode("ascii")
