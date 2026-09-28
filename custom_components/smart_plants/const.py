from __future__ import annotations

DOMAIN = "smart_plants"
NAME = "Smart Plants"

MIN_HA_VERSION = "2026.8.0"

SINGLETON_UNIQUE_ID = "global"

CONF_PRESERVE_INVENTORY_ON_REMOVAL = "preserve_inventory_on_removal"
DEFAULT_PRESERVE_INVENTORY_ON_REMOVAL = False
CONF_OPENPLANTBOOK_ENABLED = "openplantbook_enabled"
CONF_OPENPLANTBOOK_CLIENT_ID = "openplantbook_client_id"
CONF_OPENPLANTBOOK_CLIENT_SECRET = "openplantbook_client_secret"  # noqa: S105

STORAGE_KEY = f"{DOMAIN}.inventory"
STORAGE_MAJOR_VERSION = 1
STORAGE_MINOR_VERSION = 11

OPENPLANTBOOK_PROVIDER = "openplantbook"
MANUAL_PROVIDER = "manual"

# --- Image lifecycle --------------------------------------------------------

# Directory under ``hass.config.path`` that holds the re-encoded WebP files.
# Kept outside ``custom_components/`` so an integration-directory replacement
# (HACS update, git checkout) never touches user image data.
IMAGE_STORAGE_DIRNAME = "smart_plants/images"

# Hard cap on the raw upload byte length before we ever look at the file.
IMAGE_MAX_UPLOAD_BYTES = 5 * 1024 * 1024

# Source and decoded dimension cap. Either axis above this is rejected.
IMAGE_MAX_DIMENSION = 2048

# Defense-in-depth ceiling on header-declared pixel count, checked BEFORE
# Pillow decodes the file. Rejects decompression-bomb PNGs whose headers
# claim absurd dimensions. Set well above modern smartphone sensors
# (48-50 MP) so ordinary photos pass, but well below Pillow's own 89 MP
# default so a crafted 100 MP+ file never reaches the decoder.
IMAGE_MAX_DECODE_PIXELS = 64_000_000

# Seconds an unreferenced file must sit on disk before the reconciler is
# allowed to delete it on startup. Long enough to survive a same-day
# debug session or manual snapshot recovery; short enough that leaks
# never accumulate.
IMAGE_ORPHAN_GRACE_SECONDS = 24 * 60 * 60

# Accepted input MIME types; every accepted upload is re-encoded to the
# single output type below.
IMAGE_ALLOWED_INPUT_TYPES: frozenset[str] = frozenset(
    ("image/jpeg", "image/png", "image/webp")
)
IMAGE_OUTPUT_CONTENT_TYPE = "image/webp"
IMAGE_OUTPUT_EXTENSION = ".webp"
