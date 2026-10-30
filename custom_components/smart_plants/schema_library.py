"""
The schema library Home Assistant validates with.

Home Assistant 2026.9 replaced voluptuous with probatio, which has the same
API. It no longer depends on voluptuous, and ``import voluptuous`` only works
there because Home Assistant maps that name to probatio at startup. Real
voluptuous objects don't work with core's probatio ones. A voluptuous schema
fails to compile around core's markers, core can't render a voluptuous form,
and core doesn't recognize voluptuous errors.

So every module imports ``vol`` from here. It is probatio on Home Assistant
2026.9 and later, and voluptuous on older releases. The check uses the release
number, not an attempt to import probatio, because another package can install
probatio next to an older release that still validates with voluptuous. Type
checks run against the minimum supported release, which uses voluptuous.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.const import MAJOR_VERSION, MINOR_VERSION

if TYPE_CHECKING:
    import voluptuous as vol
elif (MAJOR_VERSION, MINOR_VERSION) >= (2026, 9):
    import probatio as vol
else:
    import voluptuous as vol

__all__ = ["vol"]
