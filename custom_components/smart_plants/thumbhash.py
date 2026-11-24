"""
ThumbHash encoder for plant photos.

A ThumbHash is a compact (about 25 bytes) description of an image that a
browser decodes into a blurred placeholder while the real photo loads. This
module is a Python port of ``rgbaToThumbHash`` from the ThumbHash reference
implementation by Evan Wallace (https://github.com/evanw/thumbhash). It
produces the same bytes as the JavaScript encoder, so any ThumbHash decoder
reads the result.

Stored plant photos are always RGB without transparency, so only the path
of the reference encoder for fully opaque images is ported: the alpha
channel, and the extra header byte and coefficients it adds, never occur.

The cosine comes from a port of the fdlibm ``cos`` that V8 (Chrome,
Node.js) uses for ``Math.cos``, not from ``math.cos``. The C library behind
``math.cos`` differs between platforms in the last bit of some results, and
such a bit can flip a coefficient that sits on a rounding boundary. With
the same cosine everywhere, the hash of a photo is the same on every
machine and equal to the one the JavaScript encoder writes there.

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

The cosine is ported from fdlibm, which carries this notice:

    Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.

    Developed at SunSoft, a Sun Microsystems, Inc. business.
    Permission to use, copy, modify, and distribute this
    software is freely granted, provided that this notice
    is preserved.
"""

from __future__ import annotations

import base64
import math
import struct
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
# every float operation, and so every output bit, the same.
_UNIT: Final = tuple((1 / 255) * value for value in range(256))


# --- Cosine (fdlibm) ------------------------------------------------------
#
# Only what the encoder needs: arguments are ``pi / n * c * (x + 0.5)`` with
# ``n`` at most 100 and ``c`` below 7, so they are never negative and stay
# far below the range that needs the large-argument reduction.

_C1: Final = 4.16666666666666019037e-02
_C2: Final = -1.38888888888741095749e-03
_C3: Final = 2.48015872894767294178e-05
_C4: Final = -2.75573143513906633035e-07
_C5: Final = 2.08757232129817482790e-09
_C6: Final = -1.13596475577881948265e-11
_S1: Final = -1.66666666666666324348e-01
_S2: Final = 8.33333333332248946124e-03
_S3: Final = -1.98412698298579493134e-04
_S4: Final = 2.75573137070700676789e-06
_S5: Final = -2.50507602534068634195e-08
_S6: Final = 1.58969099521155010221e-10
_INV_PIO2: Final = 6.36619772367581382433e-01
_PIO2_1: Final = 1.57079632673412561417e00
_PIO2_1T: Final = 6.07710050650619224932e-11
_PIO2_2: Final = 6.07710050630396597660e-11
_PIO2_2T: Final = 2.02226624879595063154e-21
_PIO2_3: Final = 2.02226624871116645580e-21
_PIO2_3T: Final = 8.47842766036889956997e-32
# High words of n * pi / 2 for n = 1..32; an argument with the same high
# word is close enough to a multiple of pi / 2 to need the precise path.
_NPIO2_HW: Final = (
    0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C,
    0x4025FDBB, 0x402921FB, 0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C,
    0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB, 0x403AB41B, 0x403C463A,
    0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C,
    0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB,
    0x404858EB, 0x404921FB,
)  # fmt: skip
# High-word thresholds: 2**-27, 0.3, 0.78125, pi / 4, pi / 2 and 3 * pi / 4.
_HW_TINY: Final = 0x3E400000
_HW_0_3: Final = 0x3FD33333
_HW_0_78125: Final = 0x3FE90000
_HW_PI_4: Final = 0x3FE921FB
_HW_PI_2: Final = 0x3FF921FB
_HW_3PI_4: Final = 0x4002D97C
# Above 2**19 * pi / 2 fdlibm switches to a reduction this port leaves out.
_MAX_COS_ARGUMENT: Final = 823549.6


def _high_word(value: float) -> int:
    return int(struct.unpack("<Q", struct.pack("<d", value))[0] >> 32)


def _from_high_word(high: int) -> float:
    return float(struct.unpack("<d", struct.pack("<Q", high << 32))[0])


def _kernel_cos(x: float, y: float) -> float:
    ix = _high_word(x) & 0x7FFFFFFF
    if ix < _HW_TINY and int(x) == 0:
        return 1.0
    z = x * x
    r = z * (_C1 + z * (_C2 + z * (_C3 + z * (_C4 + z * (_C5 + z * _C6)))))
    if ix < _HW_0_3:
        return 1.0 - (0.5 * z - (z * r - x * y))
    qx = 0.28125 if ix > _HW_0_78125 else _from_high_word(ix - 0x00200000)
    hz = 0.5 * z - qx
    a = 1.0 - qx
    return a - (hz - (z * r - x * y))


def _kernel_sin(x: float, y: float) -> float:
    ix = _high_word(x) & 0x7FFFFFFF
    if ix < _HW_TINY and int(x) == 0:
        return x
    z = x * x
    v = z * x
    r = _S2 + z * (_S3 + z * (_S4 + z * (_S5 + z * _S6)))
    return x - ((z * (0.5 * y - v * r) - y) - v * _S1)


def _rem_pio2(x: float) -> tuple[int, float, float]:
    """Return ``n`` and ``x - n * pi / 2`` as a head and a tail (``x > pi/4``)."""
    ix = _high_word(x) & 0x7FFFFFFF
    if ix < _HW_3PI_4:  # below 3 * pi / 4: n is 1
        z = x - _PIO2_1
        if ix != _HW_PI_2:
            y0 = z - _PIO2_1T
            return 1, y0, (z - y0) - _PIO2_1T
        z -= _PIO2_2
        y0 = z - _PIO2_2T
        return 1, y0, (z - y0) - _PIO2_2T
    n = int(x * _INV_PIO2 + 0.5)
    fn = float(n)
    r = x - fn * _PIO2_1
    w = fn * _PIO2_1T
    y0 = r - w
    if n >= 32 or ix == _NPIO2_HW[n - 1]:  # noqa: PLR2004
        exponent = ix >> 20
        if exponent - ((_high_word(y0) >> 20) & 0x7FF) > 16:  # noqa: PLR2004
            t = r
            w = fn * _PIO2_2
            r = t - w
            w = fn * _PIO2_2T - ((t - r) - w)
            y0 = r - w
            if exponent - ((_high_word(y0) >> 20) & 0x7FF) > 49:  # noqa: PLR2004
                t = r
                w = fn * _PIO2_3
                r = t - w
                w = fn * _PIO2_3T - ((t - r) - w)
                y0 = r - w
    return n, y0, (r - y0) - w


def _cos(x: float) -> float:
    """``Math.cos`` as V8 computes it, for ``0 <= x <= 823549.6``."""
    if not 0 <= x <= _MAX_COS_ARGUMENT:
        raise ValueError("cosine argument outside the supported range")
    if _high_word(x) <= _HW_PI_4:  # up to pi / 4: no reduction
        return _kernel_cos(x, 0.0)
    n, y0, y1 = _rem_pio2(x)
    quadrant = n & 3
    if quadrant == 0:
        return _kernel_cos(y0, y1)
    if quadrant == 1:
        return -_kernel_sin(y0, y1)
    if quadrant == 2:  # noqa: PLR2004
        return -_kernel_cos(y0, y1)
    return _kernel_sin(y0, y1)


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
        fy = [_cos(math.pi / height * cy * (y + 0.5)) for y in range(height)]
        fy_per_pixel = [value for value in fy for _ in range(width)]
        cx = 0
        while cx * ny < nx * (ny - cy):
            fx = [_cos(math.pi / width * cx * (x + 0.5)) for x in range(width)]
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
    """
    # ``convert`` returns a new image even for an RGB source, so the
    # caller's image is never resized in place.
    small = image.convert("RGB")
    small.thumbnail((THUMBHASH_MAX_SIZE, THUMBHASH_MAX_SIZE), Image.Resampling.LANCZOS)
    digest = rgb_to_thumbhash(small.width, small.height, small.tobytes())
    return base64.b64encode(digest).decode("ascii")
