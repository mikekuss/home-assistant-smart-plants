from __future__ import annotations

import json
import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field, replace
from datetime import datetime
from types import MappingProxyType
from typing import Any, Final, Literal, Self, TypeGuard, cast

from .care import MAX_CARE_EVENTS, CareEvent
from .const import IMAGE_MAX_DIMENSION, IMAGE_OUTPUT_CONTENT_TYPE

# Server-generated image ids are 32 lowercase hex chars (uuid4().hex).
# Persisted records outside that shape are refused to keep image lookup
# strictly inside the images directory.
_IMAGE_ID_STORAGE_RE: Final = re.compile(r"^[0-9a-f]{32}$")
_IDENTIFIER_MAX_LEN: Final = 200
_SHORT_VALUE_MAX_LEN: Final = 60
_TIMESTAMP_MAX_LEN: Final = 64
_CANONICAL_LOCALE_RE: Final = re.compile(r"^(?:und|[a-z]{2}(?:-[A-Z]{2})?)$")
SPECIES_SNAPSHOT_MAX_BYTES: Final = 32 * 1024
SPECIES_TEXT_MAX_LEN: Final = 500
SPECIES_CARE_TEXT_MAX_LEN: Final = 4_000
SPECIES_ATTRIBUTION_MAX_LEN: Final = 500
SPECIES_MAP_MAX_COUNT: Final = 32
COLLECTION_MAX_COUNT: Final = 1_000
PLANT_TAG_MAX_COUNT: Final = 32
SENSOR_SOURCE_MAX_COUNT: Final = 32

PlantLifecycleState = Literal["active", "disabled"]

MoistureAggregation = Literal["primary", "average", "min", "max"]
TemperatureAggregation = Literal["primary", "average", "min", "max"]
HumidityAggregation = Literal["primary", "average", "min", "max"]
IlluminanceAggregation = Literal["primary", "average", "min", "max"]
BatteryAggregation = Literal["primary", "average", "min", "max"]
ConductivityAggregation = Literal["primary", "average", "min", "max"]
SoilTemperatureAggregation = Literal["primary", "average", "min", "max"]
Co2Aggregation = Literal["primary", "average", "min", "max"]

MOISTURE_AGGREGATIONS: Final[frozenset[str]] = frozenset(
    ("primary", "average", "min", "max")
)
TEMPERATURE_AGGREGATIONS: Final[frozenset[str]] = frozenset(
    ("primary", "average", "min", "max")
)
HUMIDITY_AGGREGATIONS: Final[frozenset[str]] = frozenset(
    ("primary", "average", "min", "max")
)
ILLUMINANCE_AGGREGATIONS: Final[frozenset[str]] = frozenset(
    ("primary", "average", "min", "max")
)
BATTERY_AGGREGATIONS: Final[frozenset[str]] = frozenset(
    ("primary", "average", "min", "max")
)
CONDUCTIVITY_AGGREGATIONS: Final[frozenset[str]] = frozenset(
    ("primary", "average", "min", "max")
)
SOIL_TEMPERATURE_AGGREGATIONS: Final[frozenset[str]] = frozenset(
    ("primary", "average", "min", "max")
)
CO2_AGGREGATIONS: Final[frozenset[str]] = frozenset(
    ("primary", "average", "min", "max")
)

# Documented in phase-04: 0 < min < target < max < 100 with at least four
# percentage points between min and max. Kept as a module constant so
# validation and tests agree on the exact numeric boundary.
MOISTURE_MIN_SPAN: Final = 4

# Default six-hour staleness window from the phase spec. Editable per plant.
DEFAULT_STALE_AFTER_SECONDS: Final = 21_600
# Bounded upper limit so a persisted mistake cannot silently disable
# staleness detection forever. Seven days is well beyond the six-hour
# default and any credible operator override.
MAX_STALE_AFTER_SECONDS: Final = 7 * 24 * 60 * 60
MIN_STALE_AFTER_SECONDS: Final = 60

# Percentage bounds on assigned source registry ids / entity ids so a
# malformed payload cannot balloon storage.
_ENTITY_ID_MAX_LEN: Final = 255
_REGISTRY_ID_MAX_LEN: Final = 200

_MOISTURE_PERCENT_LOWER: Final = 0
_MOISTURE_PERCENT_UPPER: Final = 100

DEFAULT_MOISTURE_MIN: Final = 15
DEFAULT_MOISTURE_TARGET: Final = 35
DEFAULT_MOISTURE_MAX: Final = 55

ThresholdSource = Literal["builtin", "provider"]
SpeciesSourceStatus = Literal["manual", "provider"]


@dataclass(frozen=True, slots=True)
class ThresholdDefault:
    """An inherited threshold value and the evidence that supplied it."""

    value: int
    source: ThresholdSource = "builtin"
    provider: str | None = None
    provider_ref: str | None = None

    @classmethod
    def from_storage(cls, data: object, field_name: str) -> Self:
        if not isinstance(data, dict):
            raise ValueError(f"{field_name} must be an object")
        _require_no_extra_keys(
            data,
            frozenset({"value", "source", "provider", "provider_ref"}),
            field_name,
        )
        source = data.get("source")
        if source not in ("builtin", "provider"):
            raise ValueError(f"{field_name} source is not supported")
        provider = _optional_short_str(data.get("provider"), f"{field_name} provider")
        provider_ref = _optional_str(
            data.get("provider_ref"), f"{field_name} provider_ref"
        )
        if source == "builtin" and (provider is not None or provider_ref is not None):
            raise ValueError(f"{field_name} builtin source cannot name a provider")
        if source == "provider" and (provider is None or provider_ref is None):
            raise ValueError(f"{field_name} provider source requires attribution")
        return cls(
            value=require_moisture_threshold(data.get("value"), f"{field_name} value"),
            source=source,
            provider=provider,
            provider_ref=provider_ref,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "value": self.value,
            "source": self.source,
            "provider": self.provider,
            "provider_ref": self.provider_ref,
        }


PlantOperationKind = Literal[
    "create_plant",
    "update_plant",
    "update_area",
    "disable_plant",
    "reenable_plant",
    "delete_plant",
    "create_image",
    "replace_image",
    "delete_image",
]

_OPERATION_KINDS: Final[frozenset[str]] = frozenset(
    (
        "create_plant",
        "update_plant",
        "update_area",
        "disable_plant",
        "reenable_plant",
        "delete_plant",
        "create_image",
        "replace_image",
        "delete_image",
    )
)

# Schema versions for the typed persistence shapes. Bump when the field set of
# the corresponding record changes incompatibly, and add a migration branch.
PLANT_RECORD_SCHEMA_VERSION: Final = 1
PENDING_OPERATION_SCHEMA_VERSION: Final = 2
TOMBSTONE_SCHEMA_VERSION: Final = 3


def _is_pure_int(value: object) -> TypeGuard[int]:
    return isinstance(value, int) and not isinstance(value, bool)


def _deep_freeze(value: Any) -> Any:
    if isinstance(value, Mapping):
        return MappingProxyType(
            {key: _deep_freeze(item) for key, item in value.items()}
        )
    if isinstance(value, (list, tuple)):
        return tuple(_deep_freeze(item) for item in value)
    return value


def _deep_thaw(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {key: _deep_thaw(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [_deep_thaw(item) for item in value]
    return value


def _require_str(value: object, field_name: str, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")
    if not allow_empty and not value:
        raise ValueError(f"{field_name} must not be empty")
    return value


def _require_identifier(value: object, field_name: str) -> str:
    identifier = _require_str(value, field_name)
    if identifier != identifier.strip():
        raise ValueError(f"{field_name} must not contain surrounding whitespace")
    if len(identifier) > _IDENTIFIER_MAX_LEN:
        raise ValueError(
            f"{field_name} must be at most {_IDENTIFIER_MAX_LEN} characters"
        )
    return identifier


def _require_short_str(value: object, field_name: str) -> str:
    result = _require_str(value, field_name)
    if result != result.strip():
        raise ValueError(f"{field_name} must not contain surrounding whitespace")
    if len(result) > _SHORT_VALUE_MAX_LEN:
        raise ValueError(
            f"{field_name} must be at most {_SHORT_VALUE_MAX_LEN} characters"
        )
    return result


def _optional_short_str(value: object, field_name: str) -> str | None:
    if value is None:
        return None
    return _require_short_str(value, field_name)


def _require_iso8601(value: object, field_name: str) -> str:
    timestamp = _require_str(value, field_name)
    if timestamp != timestamp.strip() or len(timestamp) > _TIMESTAMP_MAX_LEN:
        raise ValueError(f"{field_name} must be a bounded ISO 8601 value")
    try:
        datetime.fromisoformat(timestamp)
    except ValueError as err:
        raise ValueError(f"{field_name} must be an ISO 8601 value") from err
    return timestamp


def _optional_iso8601(value: object, field_name: str) -> str | None:
    if value is None:
        return None
    return _require_iso8601(value, field_name)


def _optional_str(value: object, field_name: str) -> str | None:
    if value is None:
        return None
    return _require_str(value, field_name)


def _require_bounded_str(value: object, field_name: str, maximum: int) -> str:
    result = _require_str(value, field_name)
    if len(result) > maximum:
        raise ValueError(f"{field_name} must be at most {maximum} characters")
    return result


def _optional_bounded_str(value: object, field_name: str, maximum: int) -> str | None:
    if value is None:
        return None
    return _require_bounded_str(value, field_name, maximum)


def _optional_bounded_trimmed_str(
    value: object, field_name: str, maximum: int
) -> str | None:
    result = _optional_bounded_str(value, field_name, maximum)
    if result is not None and result != result.strip():
        raise ValueError(f"{field_name} must not contain surrounding whitespace")
    return result


def _require_bounded_trimmed_str(value: object, field_name: str, maximum: int) -> str:
    result = _require_bounded_str(value, field_name, maximum)
    if result != result.strip():
        raise ValueError(f"{field_name} must not contain surrounding whitespace")
    return result


def _require_positive_int(value: object, field_name: str) -> int:
    if not _is_pure_int(value) or value < 1:
        raise ValueError(f"{field_name} must be a positive integer")
    return value


def _require_non_negative_int(value: object, field_name: str) -> int:
    if not _is_pure_int(value) or value < 0:
        raise ValueError(f"{field_name} must be a non-negative integer")
    return value


def _require_exact_schema_version(value: object, field_name: str, expected: int) -> int:
    """
    Reject any schema version that is not exactly ``expected``.

    Recovery schemas are versioned strictly: an older version means the
    record was written before a breaking payload change and must be
    handled by migration, not the current parser; a newer version means
    the record was written by a future integration release and this
    installation cannot safely reason about the payload shape. Both must
    fail-closed instead of being interpreted with the current rules.
    """
    if not _is_pure_int(value):
        raise ValueError(f"{field_name} must be an integer")
    if value != expected:
        raise ValueError(f"{field_name} {value} is not supported (expected {expected})")
    return value


def _require_object_payload(value: object, field_name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object")
    return value


def _require_no_extra_keys(
    payload: Mapping[str, Any], allowed: frozenset[str], context: str
) -> None:
    extra = set(payload.keys()) - allowed
    if extra:
        offender = min(extra)
        raise ValueError(f"{context} payload contains unsupported key {offender!r}")


def _validate_area_payload(payload: dict[str, Any], context: str) -> None:
    """
    Validate ``create_plant`` / ``update_plant`` / lifecycle-op payloads.

    Optional ``area_id`` string; nothing else allowed. Absent key means
    "no requested area"; a present but ``None`` value means the same.
    """
    _require_no_extra_keys(payload, frozenset({"area_id"}), context)
    area_id = payload.get("area_id")
    if area_id is not None and (
        not isinstance(area_id, str)
        or not area_id
        or area_id != area_id.strip()
        or len(area_id) > _IDENTIFIER_MAX_LEN
    ):
        raise ValueError(
            f"{context} payload area_id must be a non-empty string or null"
        )


def _validate_empty_payload(payload: dict[str, Any], context: str) -> None:
    _require_no_extra_keys(payload, frozenset(), context)


def _validate_area_intent_payload(payload: dict[str, Any], context: str) -> None:
    """
    Validate ``update_area`` explicit-intent payload.

    Requires ``target_area_id`` (string or null). Null means "clear the
    device area". A missing key is rejected: explicit area intent must
    always carry an unambiguous target so replay after a crash never
    guesses what the user asked for.
    """
    _require_no_extra_keys(payload, frozenset({"target_area_id"}), context)
    if "target_area_id" not in payload:
        raise ValueError(f"{context} payload.target_area_id is required")
    target = payload["target_area_id"]
    if target is not None and (not isinstance(target, str) or not target):
        raise ValueError(
            f"{context} payload.target_area_id must be a non-empty string or null"
        )
    if isinstance(target, str) and (
        target != target.strip() or len(target) > _IDENTIFIER_MAX_LEN
    ):
        raise ValueError(f"{context} payload.target_area_id is invalid")


def _validate_image_upsert_payload(payload: dict[str, Any], context: str) -> None:
    """create_image / replace_image payload."""
    _require_no_extra_keys(
        payload, frozenset({"new_image", "previous_image_id"}), context
    )
    new_image = payload.get("new_image")
    if not isinstance(new_image, dict):
        raise ValueError(f"{context} payload.new_image must be an object")
    # Reuse PlantImage's strict field validation so a malformed nested
    # record fails load rather than surfacing at replay time as an odd
    # runtime error the reconciler has to defend against.
    PlantImage.from_storage(new_image)
    previous_image_id = payload.get("previous_image_id")
    if previous_image_id is not None:
        previous_image_id = _require_str(
            previous_image_id, f"{context} payload.previous_image_id"
        )
        if not _IMAGE_ID_STORAGE_RE.fullmatch(previous_image_id):
            raise ValueError(f"{context} payload.previous_image_id is malformed")


def _validate_image_delete_payload(payload: dict[str, Any], context: str) -> None:
    _require_no_extra_keys(payload, frozenset({"previous_image_id"}), context)
    previous_image_id = payload.get("previous_image_id")
    previous_image_id = _require_str(
        previous_image_id, f"{context} payload.previous_image_id"
    )
    if not _IMAGE_ID_STORAGE_RE.fullmatch(previous_image_id):
        raise ValueError(f"{context} payload.previous_image_id is malformed")


def _validate_pending_operation_payload(kind: str, payload: dict[str, Any]) -> None:
    context = f"pending operation ({kind})"
    validator = _PENDING_OPERATION_PAYLOAD_VALIDATORS.get(kind)
    if validator is None:
        # Guarded by kind check earlier; belt-and-suspenders so a future
        # kind added to _OPERATION_KINDS but not to the validator table
        # fails loudly instead of accepting an unchecked payload.
        raise ValueError(f"{context} has no registered payload validator")
    validator(payload, context)


@dataclass(frozen=True, slots=True)
class PlantImage:
    id: str
    content_type: str
    width: int
    height: int
    created_at: str

    @classmethod
    def from_storage(cls, data: object) -> Self:
        if not isinstance(data, dict):
            raise ValueError("plant image must be an object")
        _require_no_extra_keys(
            data,
            frozenset({"id", "content_type", "width", "height", "created_at"}),
            "plant image",
        )
        image_id = _require_str(data.get("id"), "plant image id")
        if not _IMAGE_ID_STORAGE_RE.fullmatch(image_id):
            raise ValueError("plant image id is malformed")
        content_type = _require_str(
            data.get("content_type"), "plant image content_type"
        )
        # The server re-encodes every accepted upload to WebP; anything
        # else on disk is either a legacy record we did not write or a
        # forged payload from a client that reached generic plant CRUD
        # before the ownership tightening. Refuse either way.
        if content_type != IMAGE_OUTPUT_CONTENT_TYPE:
            raise ValueError("plant image content_type is not supported")
        width = _require_positive_int(data.get("width"), "plant image width")
        height = _require_positive_int(data.get("height"), "plant image height")
        if width > IMAGE_MAX_DIMENSION or height > IMAGE_MAX_DIMENSION:
            raise ValueError("plant image dimensions exceed the upload cap")
        created_at = _require_iso8601(data.get("created_at"), "plant image created_at")
        return cls(
            id=image_id,
            content_type=content_type,
            width=width,
            height=height,
            created_at=created_at,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "content_type": self.content_type,
            "width": self.width,
            "height": self.height,
            "created_at": self.created_at,
        }


@dataclass(frozen=True, slots=True)
class PlantPlacement:
    mode: str
    exposure: str | None = None
    rain_exposure: str | None = None
    container: bool | None = None

    @classmethod
    def from_storage(cls, data: object) -> Self:
        if not isinstance(data, dict):
            raise ValueError("plant placement must be an object")
        _require_no_extra_keys(
            data,
            frozenset({"mode", "exposure", "rain_exposure", "container"}),
            "plant placement",
        )
        container = data.get("container")
        if container is not None and not isinstance(container, bool):
            raise ValueError("plant placement container must be a boolean")
        return cls(
            mode=_require_short_str(data.get("mode"), "plant placement mode"),
            exposure=_optional_short_str(
                data.get("exposure"), "plant placement exposure"
            ),
            rain_exposure=_optional_short_str(
                data.get("rain_exposure"), "plant placement rain_exposure"
            ),
            container=container,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "exposure": self.exposure,
            "rain_exposure": self.rain_exposure,
            "container": self.container,
        }


@dataclass(frozen=True, slots=True)
class SpeciesSnapshot:
    """Accepted, immutable and fully attributed species evidence."""

    provider: str
    provider_id: str | None
    provider_ref: str | None
    fetched_at: str
    locale: str
    source_status: SpeciesSourceStatus
    attribution: str
    common_name: str | None = None
    latin_name: str | None = None
    category: str | None = None
    confidence: float | None = None
    care_text: Mapping[str, str] = field(default_factory=dict)
    field_sources: Mapping[str, str] = field(default_factory=dict)
    threshold_defaults: Mapping[str, Mapping[str, int]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "care_text", _deep_freeze(self.care_text))
        object.__setattr__(self, "field_sources", _deep_freeze(self.field_sources))
        object.__setattr__(
            self, "threshold_defaults", _deep_freeze(self.threshold_defaults)
        )

    @classmethod
    def from_storage(cls, data: object) -> Self:  # noqa: PLR0912, PLR0915
        if not isinstance(data, dict):
            raise ValueError("species snapshot must be an object")
        allowed = frozenset(
            {
                "provider",
                "provider_id",
                "provider_ref",
                "fetched_at",
                "locale",
                "source_status",
                "attribution",
                "common_name",
                "latin_name",
                "category",
                "confidence",
                "care_text",
                "field_sources",
                "threshold_defaults",
            }
        )
        _require_no_extra_keys(data, allowed, "species snapshot")
        try:
            encoded_size = len(
                json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
            )
        except (RecursionError, TypeError, ValueError) as err:
            raise ValueError("species snapshot must be JSON serializable") from err
        if encoded_size > SPECIES_SNAPSHOT_MAX_BYTES:
            raise ValueError("species snapshot exceeds the storage size limit")
        provider = _require_short_str(data.get("provider"), "species provider")
        provider_id = _optional_bounded_trimmed_str(
            data.get("provider_id"), "species provider_id", _IDENTIFIER_MAX_LEN
        )
        provider_ref = _optional_bounded_trimmed_str(
            data.get("provider_ref"), "species provider_ref", _IDENTIFIER_MAX_LEN
        )
        status = data.get("source_status")
        if status not in ("manual", "provider"):
            raise ValueError("species source_status is not supported")
        if status == "manual" and provider != "manual":
            raise ValueError("manual species must use the manual provider")
        if status == "provider" and (provider == "manual" or provider_ref is None):
            raise ValueError("provider species requires a provider reference")
        confidence_raw = data.get("confidence")
        confidence: float | None = None
        if confidence_raw is not None:
            if isinstance(confidence_raw, bool) or not isinstance(
                confidence_raw, (int, float)
            ):
                raise ValueError("species confidence must be a number or null")
            confidence = float(confidence_raw)
            if not 0 <= confidence <= 1:
                raise ValueError("species confidence must be between 0 and 1")
        care = data.get("care_text")
        sources = data.get("field_sources")
        thresholds = data.get("threshold_defaults")
        if not isinstance(care, dict) or not all(
            isinstance(key, str) and isinstance(value, str)
            for key, value in care.items()
        ):
            raise ValueError("species care_text must be a string map")
        if len(care) > SPECIES_MAP_MAX_COUNT or any(
            not key
            or key != key.strip()
            or len(key) > _SHORT_VALUE_MAX_LEN
            or not value
            or value != value.strip()
            or len(value) > SPECIES_CARE_TEXT_MAX_LEN
            for key, value in care.items()
        ):
            raise ValueError("species care_text exceeds its field limits")
        if not isinstance(sources, dict) or not all(
            isinstance(key, str) and isinstance(value, str)
            for key, value in sources.items()
        ):
            raise ValueError("species field_sources must be a string map")
        if len(sources) > SPECIES_MAP_MAX_COUNT or any(
            not key
            or key != key.strip()
            or len(key) > _SHORT_VALUE_MAX_LEN
            or not value
            or value != value.strip()
            or len(value) > SPECIES_ATTRIBUTION_MAX_LEN
            for key, value in sources.items()
        ):
            raise ValueError("species field_sources exceeds its field limits")
        if not isinstance(thresholds, dict):
            raise ValueError("species threshold_defaults must be an object")
        parsed_thresholds: dict[str, dict[str, int]] = {}
        if len(thresholds) > SPECIES_MAP_MAX_COUNT:
            raise ValueError("species threshold_defaults has too many roles")
        for role, values in thresholds.items():
            if (
                not isinstance(role, str)
                or not role
                or role != role.strip()
                or len(role) > _SHORT_VALUE_MAX_LEN
                or not isinstance(values, dict)
                or len(values) > SPECIES_MAP_MAX_COUNT
            ):
                raise ValueError("species role thresholds must be objects")
            parsed_thresholds[role] = {}
            for key, value in values.items():
                if (
                    not isinstance(key, str)
                    or not key
                    or key != key.strip()
                    or len(key) > _SHORT_VALUE_MAX_LEN
                    or not _is_pure_int(value)
                ):
                    raise ValueError("species thresholds must be integer maps")
                parsed_thresholds[role][key] = value
        populated = {
            key
            for key in ("common_name", "latin_name", "category", "confidence")
            if data.get(key) is not None
        }
        populated.update(care)
        populated.update(
            f"{role}_{key}"
            for role, values in parsed_thresholds.items()
            for key in values
        )
        if set(sources) != populated:
            raise ValueError(
                "species field_sources must exactly attribute every populated field"
            )
        if any(value != data.get("attribution") for value in sources.values()):
            raise ValueError("species field_sources must use the snapshot attribution")
        locale = _require_short_str(data.get("locale"), "species locale")
        if not _CANONICAL_LOCALE_RE.fullmatch(locale):
            raise ValueError("species locale must be canonical")
        return cls(
            provider=provider,
            provider_id=provider_id,
            provider_ref=provider_ref,
            fetched_at=_require_iso8601(data.get("fetched_at"), "species fetched_at"),
            locale=locale,
            source_status=status,
            attribution=_require_bounded_trimmed_str(
                data.get("attribution"),
                "species attribution",
                SPECIES_ATTRIBUTION_MAX_LEN,
            ),
            common_name=_optional_bounded_trimmed_str(
                data.get("common_name"), "species common_name", SPECIES_TEXT_MAX_LEN
            ),
            latin_name=_optional_bounded_trimmed_str(
                data.get("latin_name"), "species latin_name", SPECIES_TEXT_MAX_LEN
            ),
            category=_optional_bounded_trimmed_str(
                data.get("category"), "species category", SPECIES_TEXT_MAX_LEN
            ),
            confidence=confidence,
            care_text=care,
            field_sources=sources,
            threshold_defaults=parsed_thresholds,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "provider_id": self.provider_id,
            "provider_ref": self.provider_ref,
            "fetched_at": self.fetched_at,
            "locale": self.locale,
            "source_status": self.source_status,
            "attribution": self.attribution,
            "common_name": self.common_name,
            "latin_name": self.latin_name,
            "category": self.category,
            "confidence": self.confidence,
            "care_text": _deep_thaw(self.care_text),
            "field_sources": _deep_thaw(self.field_sources),
            "threshold_defaults": _deep_thaw(self.threshold_defaults),
        }


@dataclass(frozen=True, slots=True)
class PlantSpecies:
    """Provider identity plus one accepted normalized snapshot."""

    provider: str
    snapshot: SpeciesSnapshot

    @classmethod
    def from_storage(cls, data: object) -> Self:
        if not isinstance(data, dict):
            raise ValueError("plant species must be an object")
        _require_no_extra_keys(
            data, frozenset({"provider", "snapshot"}), "plant species"
        )
        provider = _require_short_str(data.get("provider"), "plant species provider")
        snapshot = SpeciesSnapshot.from_storage(data.get("snapshot"))
        if provider != snapshot.provider:
            raise ValueError("plant species provider must match its snapshot")
        return cls(provider=provider, snapshot=snapshot)

    def as_storage(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "snapshot": self.snapshot.as_storage(),
        }


@dataclass(frozen=True, slots=True)
class SensorSource:
    """
    One assigned source entity for a plant sensor role.

    ``entity_id`` is the current HA entity id (e.g. ``sensor.aloe_soil``).
    ``registry_id`` is the immutable entity_registry UUID when the source
    is registered; ``None`` marks an unregistered source with the
    documented weaker rename guarantee.
    """

    entity_id: str
    registry_id: str | None = None

    @classmethod
    def from_storage(cls, data: object) -> Self:
        if not isinstance(data, dict):
            raise ValueError("sensor source must be an object")
        _require_no_extra_keys(
            data, frozenset({"entity_id", "registry_id"}), "sensor source"
        )
        entity_id = _require_str(data.get("entity_id"), "sensor source entity_id")
        if entity_id != entity_id.strip() or len(entity_id) > _ENTITY_ID_MAX_LEN:
            raise ValueError(
                f"sensor source entity_id must be at most "
                f"{_ENTITY_ID_MAX_LEN} characters"
            )
        registry_raw = data.get("registry_id")
        registry_id: str | None
        if registry_raw is None:
            registry_id = None
        else:
            registry_id = _require_str(registry_raw, "sensor source registry_id")
            if (
                registry_id != registry_id.strip()
                or len(registry_id) > _REGISTRY_ID_MAX_LEN
            ):
                raise ValueError(
                    f"sensor source registry_id must be at most "
                    f"{_REGISTRY_ID_MAX_LEN} characters"
                )
        return cls(entity_id=entity_id, registry_id=registry_id)

    def as_storage(self) -> dict[str, Any]:
        return {"entity_id": self.entity_id, "registry_id": self.registry_id}


@dataclass(frozen=True, slots=True)
class MoistureConfig:
    """
    Per-plant soil moisture assignment, thresholds and staleness.

    Persisted alongside the plant record. All fields have documented
    defaults so migrating from an older store or creating a plant
    without explicit moisture data still produces a valid config.
    """

    sources: tuple[SensorSource, ...] = ()
    primary_entity_id: str | None = None
    aggregation: MoistureAggregation = "primary"
    stale_after_seconds: int = DEFAULT_STALE_AFTER_SECONDS
    threshold_defaults: Mapping[str, ThresholdDefault] = field(
        default_factory=lambda: MappingProxyType(
            {
                "min": ThresholdDefault(DEFAULT_MOISTURE_MIN),
                "target": ThresholdDefault(DEFAULT_MOISTURE_TARGET),
                "max": ThresholdDefault(DEFAULT_MOISTURE_MAX),
            }
        )
    )
    threshold_overrides: Mapping[str, int | None] = field(
        default_factory=lambda: MappingProxyType(
            {"min": None, "target": None, "max": None}
        )
    )

    def __post_init__(self) -> None:
        object.__setattr__(
            self, "threshold_defaults", MappingProxyType(dict(self.threshold_defaults))
        )
        object.__setattr__(
            self,
            "threshold_overrides",
            MappingProxyType(dict(self.threshold_overrides)),
        )

    @property
    def moisture_min(self) -> int:
        return self.effective_threshold("min")

    @property
    def moisture_target(self) -> int:
        return self.effective_threshold("target")

    @property
    def moisture_max(self) -> int:
        return self.effective_threshold("max")

    def effective_threshold(self, key: str) -> int:
        override = self.threshold_overrides[key]
        return self.threshold_defaults[key].value if override is None else override

    @classmethod
    def from_storage(cls, data: object) -> Self:  # noqa: PLR0912, PLR0915
        if not isinstance(data, dict):
            raise ValueError("moisture config must be an object")
        _require_no_extra_keys(
            data,
            frozenset(
                {
                    "sources",
                    "primary_entity_id",
                    "aggregation",
                    "stale_after_seconds",
                    "threshold_defaults",
                    "threshold_overrides",
                    # Version-5 records are accepted only as a migration input.
                    "moisture_min",
                    "moisture_target",
                    "moisture_max",
                }
            ),
            "moisture config",
        )
        raw_sources = data.get("sources", [])
        if isinstance(raw_sources, str) or not isinstance(raw_sources, Iterable):
            raise ValueError("moisture config sources must be a list")
        parsed_sources: list[SensorSource] = []
        seen_entity_ids: set[str] = set()
        seen_registry_ids: set[str] = set()
        for src in raw_sources:
            if len(parsed_sources) >= SENSOR_SOURCE_MAX_COUNT:
                raise ValueError("moisture config has too many sources")
            source = SensorSource.from_storage(src)
            if source.entity_id in seen_entity_ids:
                raise ValueError("moisture config sources must be unique by entity_id")
            if (
                source.registry_id is not None
                and source.registry_id in seen_registry_ids
            ):
                raise ValueError(
                    "moisture config sources must be unique by registry_id"
                )
            seen_entity_ids.add(source.entity_id)
            if source.registry_id is not None:
                seen_registry_ids.add(source.registry_id)
            parsed_sources.append(source)

        primary_raw = data.get("primary_entity_id")
        if primary_raw is None:
            primary_entity_id: str | None = None
        else:
            primary_entity_id = _require_str(
                primary_raw, "moisture config primary_entity_id"
            )
            if (
                primary_entity_id != primary_entity_id.strip()
                or len(primary_entity_id) > _ENTITY_ID_MAX_LEN
            ):
                raise ValueError("moisture config primary_entity_id is invalid")
        if primary_entity_id is not None and primary_entity_id not in seen_entity_ids:
            raise ValueError(
                "moisture config primary_entity_id must reference a listed source"
            )

        aggregation_raw = data.get("aggregation", "primary")
        aggregation = _require_str(aggregation_raw, "moisture config aggregation")
        if aggregation not in MOISTURE_AGGREGATIONS:
            raise ValueError("moisture config aggregation is not supported")

        stale_after_seconds = _require_positive_int(
            data.get("stale_after_seconds", DEFAULT_STALE_AFTER_SECONDS),
            "moisture config stale_after_seconds",
        )
        if not (
            MIN_STALE_AFTER_SECONDS <= stale_after_seconds <= MAX_STALE_AFTER_SECONDS
        ):
            raise ValueError(
                "moisture config stale_after_seconds is outside the allowed range"
            )

        defaults_raw = data.get("threshold_defaults")
        overrides_raw = data.get("threshold_overrides")
        keys = ("min", "target", "max")
        if defaults_raw is None and overrides_raw is None:
            # Version 5 could not distinguish inherited values from explicit
            # edits. Preserve every old effective value as an override; users
            # can now clear it explicitly, while migration never risks letting
            # a future provider refresh overwrite an old local choice.
            builtins = {
                "min": DEFAULT_MOISTURE_MIN,
                "target": DEFAULT_MOISTURE_TARGET,
                "max": DEFAULT_MOISTURE_MAX,
            }
            defaults = {key: ThresholdDefault(value) for key, value in builtins.items()}
            overrides: dict[str, int | None] = {}
            for key in keys:
                field_key = f"moisture_{key}"
                value = require_moisture_threshold(
                    data.get(field_key, builtins[key]), f"moisture config {field_key}"
                )
                overrides[key] = value
        else:
            if not isinstance(defaults_raw, dict):
                raise ValueError("moisture config threshold_defaults must be an object")
            if not isinstance(overrides_raw, dict):
                raise ValueError(
                    "moisture config threshold_overrides must be an object"
                )
            if set(defaults_raw) != set(keys) or set(overrides_raw) != set(keys):
                raise ValueError(
                    "moisture threshold maps must contain min, target, and max"
                )
            defaults = {
                key: ThresholdDefault.from_storage(
                    defaults_raw[key], f"moisture threshold default {key}"
                )
                for key in keys
            }
            overrides = {}
            for key in keys:
                raw_override = overrides_raw[key]
                overrides[key] = (
                    None
                    if raw_override is None
                    else require_moisture_threshold(
                        raw_override, f"moisture threshold override {key}"
                    )
                )
        moisture_min = overrides["min"] or defaults["min"].value
        moisture_target = overrides["target"] or defaults["target"].value
        moisture_max = overrides["max"] or defaults["max"].value
        validate_moisture_threshold_order(moisture_min, moisture_target, moisture_max)

        return cls(
            sources=tuple(parsed_sources),
            primary_entity_id=primary_entity_id,
            aggregation=aggregation,  # type: ignore[arg-type]
            stale_after_seconds=stale_after_seconds,
            threshold_defaults=defaults,
            threshold_overrides=overrides,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "sources": [source.as_storage() for source in self.sources],
            "primary_entity_id": self.primary_entity_id,
            "aggregation": self.aggregation,
            "stale_after_seconds": self.stale_after_seconds,
            "threshold_defaults": {
                key: value.as_storage()
                for key, value in self.threshold_defaults.items()
            },
            # Every registered threshold key is present. Null means inherited;
            # a missing key is malformed rather than another spelling of null.
            "threshold_overrides": dict(self.threshold_overrides),
        }


TEMPERATURE_STRESS_OVERRIDE_KEYS: Final = (
    "cold_threshold_celsius",
    "cold_clear_celsius",
    "hot_threshold_celsius",
    "hot_clear_celsius",
)
TEMPERATURE_STRESS_BUILTIN_DEFAULTS: Final[Mapping[str, float]] = MappingProxyType(
    {
        "cold_threshold_celsius": 10.0,
        "cold_clear_celsius": 12.0,
        "hot_threshold_celsius": 35.0,
        "hot_clear_celsius": 32.0,
    }
)
_TEMPERATURE_STRESS_CELSIUS_LOWER: Final = -40.0
_TEMPERATURE_STRESS_CELSIUS_UPPER: Final = 80.0
_TEMPERATURE_STRESS_MIN_HYSTERESIS_SPAN: Final = 0.5
_TEMPERATURE_STRESS_MIN_STABLE_SPAN: Final = 1.0


def _round_half_up_one_decimal(value: float) -> float:
    """Round a float half-away-from-zero to one decimal, matching stored precision."""
    import math  # noqa: PLC0415

    if value >= 0:
        return math.floor(value * 10.0 + 0.5) / 10.0
    return -(math.floor(-value * 10.0 + 0.5) / 10.0)


def require_temperature_stress_threshold(value: object, field_name: str) -> float:
    """Return a validated Celsius override, rounded to one decimal."""
    import math  # noqa: PLC0415

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must be a number")
    numeric = float(value)
    if math.isnan(numeric) or math.isinf(numeric):
        raise ValueError(f"{field_name} must be a finite number")
    rounded = _round_half_up_one_decimal(numeric)
    if not (
        _TEMPERATURE_STRESS_CELSIUS_LOWER
        <= rounded
        <= _TEMPERATURE_STRESS_CELSIUS_UPPER
    ):
        raise ValueError(
            f"{field_name} must satisfy "
            f"{_TEMPERATURE_STRESS_CELSIUS_LOWER} <= value <= "
            f"{_TEMPERATURE_STRESS_CELSIUS_UPPER}"
        )
    return rounded


def validate_temperature_stress_threshold_order(
    cold_threshold: float,
    cold_clear: float,
    hot_clear: float,
    hot_threshold: float,
) -> None:
    """Enforce ordered thresholds plus per-side hysteresis and stable-band spans."""
    if not (cold_threshold < cold_clear < hot_clear < hot_threshold):
        raise ValueError(
            "temperature stress thresholds must satisfy "
            "cold_threshold_celsius < cold_clear_celsius < "
            "hot_clear_celsius < hot_threshold_celsius"
        )
    if cold_clear - cold_threshold < _TEMPERATURE_STRESS_MIN_HYSTERESIS_SPAN:
        raise ValueError(
            "temperature stress cold_clear_celsius must exceed "
            "cold_threshold_celsius by at least "
            f"{_TEMPERATURE_STRESS_MIN_HYSTERESIS_SPAN} °C"
        )
    if hot_threshold - hot_clear < _TEMPERATURE_STRESS_MIN_HYSTERESIS_SPAN:
        raise ValueError(
            "temperature stress hot_threshold_celsius must exceed "
            "hot_clear_celsius by at least "
            f"{_TEMPERATURE_STRESS_MIN_HYSTERESIS_SPAN} °C"
        )
    if hot_clear - cold_clear < _TEMPERATURE_STRESS_MIN_STABLE_SPAN:
        raise ValueError(
            "temperature stress stable band between cold_clear_celsius and "
            "hot_clear_celsius must be at least "
            f"{_TEMPERATURE_STRESS_MIN_STABLE_SPAN} °C"
        )


def _default_temperature_stress_overrides() -> Mapping[str, float | None]:
    return MappingProxyType(dict.fromkeys(TEMPERATURE_STRESS_OVERRIDE_KEYS, None))


def _parse_stress_overrides(  # noqa: PLR0913
    raw: object,
    *,
    keys: tuple[str, ...],
    builtins: Mapping[str, Any],
    require: Any,
    validate: Any,
    field_prefix: str,
    missing_message: str,
    object_error: str,
) -> dict[str, Any]:
    """Parse an optional per-role stress override map. Shared helper."""
    if raw is None:
        return dict.fromkeys(keys, None)
    if not isinstance(raw, dict):
        raise ValueError(object_error)
    if set(raw) != set(keys):
        raise ValueError(missing_message)
    overrides: dict[str, Any] = {}
    for key in keys:
        value = raw[key]
        overrides[key] = (
            None if value is None else require(value, f"{field_prefix} {key}")
        )
    effective = {
        key: builtins[key] if overrides[key] is None else overrides[key] for key in keys
    }
    validate(effective)
    return overrides


@dataclass(frozen=True, slots=True)
class TemperatureConfig:
    """Per-plant ambient-temperature assignment and staleness."""

    sources: tuple[SensorSource, ...] = ()
    primary_entity_id: str | None = None
    aggregation: TemperatureAggregation = "average"
    stale_after_seconds: int = DEFAULT_STALE_AFTER_SECONDS
    stress_threshold_overrides: Mapping[str, float | None] = field(
        default_factory=_default_temperature_stress_overrides
    )

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "stress_threshold_overrides",
            MappingProxyType(dict(self.stress_threshold_overrides)),
        )

    def effective_stress_threshold(self, key: str) -> float:
        override = self.stress_threshold_overrides[key]
        if override is None:
            return TEMPERATURE_STRESS_BUILTIN_DEFAULTS[key]
        return override

    @classmethod
    def from_storage(cls, data: object) -> Self:  # noqa: PLR0912, PLR0915
        if not isinstance(data, dict):
            raise ValueError("temperature config must be an object")
        _require_no_extra_keys(
            data,
            frozenset(
                {
                    "sources",
                    "primary_entity_id",
                    "aggregation",
                    "stale_after_seconds",
                    "stress_threshold_overrides",
                }
            ),
            "temperature config",
        )
        raw_sources = data.get("sources", [])
        if isinstance(raw_sources, str) or not isinstance(raw_sources, Iterable):
            raise ValueError("temperature config sources must be a list")
        parsed_sources: list[SensorSource] = []
        seen_entity_ids: set[str] = set()
        seen_registry_ids: set[str] = set()
        for src in raw_sources:
            if len(parsed_sources) >= SENSOR_SOURCE_MAX_COUNT:
                raise ValueError("temperature config has too many sources")
            source = SensorSource.from_storage(src)
            if source.entity_id in seen_entity_ids:
                raise ValueError(
                    "temperature config sources must be unique by entity_id"
                )
            if (
                source.registry_id is not None
                and source.registry_id in seen_registry_ids
            ):
                raise ValueError(
                    "temperature config sources must be unique by registry_id"
                )
            seen_entity_ids.add(source.entity_id)
            if source.registry_id is not None:
                seen_registry_ids.add(source.registry_id)
            parsed_sources.append(source)

        primary_raw = data.get("primary_entity_id")
        primary_entity_id: str | None
        if primary_raw is None:
            primary_entity_id = None
        else:
            primary_entity_id = _require_str(
                primary_raw, "temperature config primary_entity_id"
            )
            if (
                primary_entity_id != primary_entity_id.strip()
                or len(primary_entity_id) > _ENTITY_ID_MAX_LEN
            ):
                raise ValueError("temperature config primary_entity_id is invalid")
        if primary_entity_id is not None and primary_entity_id not in seen_entity_ids:
            raise ValueError(
                "temperature config primary_entity_id must reference a listed source"
            )

        aggregation_raw = data.get("aggregation", "average")
        aggregation = _require_str(aggregation_raw, "temperature config aggregation")
        if aggregation not in TEMPERATURE_AGGREGATIONS:
            raise ValueError("temperature config aggregation is not supported")

        stale_after_seconds = _require_positive_int(
            data.get("stale_after_seconds", DEFAULT_STALE_AFTER_SECONDS),
            "temperature config stale_after_seconds",
        )
        if not (
            MIN_STALE_AFTER_SECONDS <= stale_after_seconds <= MAX_STALE_AFTER_SECONDS
        ):
            raise ValueError(
                "temperature config stale_after_seconds is outside the allowed range"
            )

        raw_overrides = data.get("stress_threshold_overrides")
        overrides: dict[str, float | None]
        if raw_overrides is None:
            overrides = dict.fromkeys(TEMPERATURE_STRESS_OVERRIDE_KEYS, None)
        else:
            if not isinstance(raw_overrides, dict):
                raise ValueError(
                    "temperature config stress_threshold_overrides must be an object"
                )
            if set(raw_overrides) != set(TEMPERATURE_STRESS_OVERRIDE_KEYS):
                raise ValueError(
                    "temperature stress override map must contain "
                    "cold_threshold_celsius, cold_clear_celsius, "
                    "hot_threshold_celsius, and hot_clear_celsius"
                )
            overrides = {}
            for key in TEMPERATURE_STRESS_OVERRIDE_KEYS:
                raw_value = raw_overrides[key]
                overrides[key] = (
                    None
                    if raw_value is None
                    else require_temperature_stress_threshold(
                        raw_value, f"temperature stress override {key}"
                    )
                )
            builtins = TEMPERATURE_STRESS_BUILTIN_DEFAULTS
            effective_cold_threshold = (
                overrides["cold_threshold_celsius"]
                if overrides["cold_threshold_celsius"] is not None
                else builtins["cold_threshold_celsius"]
            )
            effective_cold_clear = (
                overrides["cold_clear_celsius"]
                if overrides["cold_clear_celsius"] is not None
                else builtins["cold_clear_celsius"]
            )
            effective_hot_clear = (
                overrides["hot_clear_celsius"]
                if overrides["hot_clear_celsius"] is not None
                else builtins["hot_clear_celsius"]
            )
            effective_hot_threshold = (
                overrides["hot_threshold_celsius"]
                if overrides["hot_threshold_celsius"] is not None
                else builtins["hot_threshold_celsius"]
            )
            validate_temperature_stress_threshold_order(
                effective_cold_threshold,
                effective_cold_clear,
                effective_hot_clear,
                effective_hot_threshold,
            )
        return cls(
            sources=tuple(parsed_sources),
            primary_entity_id=primary_entity_id,
            aggregation=aggregation,  # type: ignore[arg-type]
            stale_after_seconds=stale_after_seconds,
            stress_threshold_overrides=overrides,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "sources": [source.as_storage() for source in self.sources],
            "primary_entity_id": self.primary_entity_id,
            "aggregation": self.aggregation,
            "stale_after_seconds": self.stale_after_seconds,
            "stress_threshold_overrides": {
                key: self.stress_threshold_overrides[key]
                for key in TEMPERATURE_STRESS_OVERRIDE_KEYS
            },
        }


HUMIDITY_STRESS_OVERRIDE_KEYS: Final = (
    "dry_threshold_percent",
    "dry_clear_percent",
    "damp_threshold_percent",
    "damp_clear_percent",
)
HUMIDITY_STRESS_BUILTIN_DEFAULTS: Final[Mapping[str, float]] = MappingProxyType(
    {
        "dry_threshold_percent": 25.0,
        "dry_clear_percent": 30.0,
        "damp_threshold_percent": 85.0,
        "damp_clear_percent": 80.0,
    }
)
_HUMIDITY_STRESS_LOWER: Final = 0.0
_HUMIDITY_STRESS_UPPER: Final = 100.0
_HUMIDITY_STRESS_MIN_HYSTERESIS_SPAN: Final = 1.0
_HUMIDITY_STRESS_MIN_STABLE_SPAN: Final = 5.0


def require_humidity_stress_threshold(value: object, field_name: str) -> float:
    import math  # noqa: PLC0415

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must be a number")
    numeric = float(value)
    if math.isnan(numeric) or math.isinf(numeric):
        raise ValueError(f"{field_name} must be a finite number")
    rounded = _round_half_up_one_decimal(numeric)
    if not (_HUMIDITY_STRESS_LOWER <= rounded <= _HUMIDITY_STRESS_UPPER):
        raise ValueError(
            f"{field_name} must satisfy "
            f"{_HUMIDITY_STRESS_LOWER} <= value <= {_HUMIDITY_STRESS_UPPER}"
        )
    return rounded


def validate_humidity_stress_threshold_order(
    dry_threshold: float,
    dry_clear: float,
    damp_clear: float,
    damp_threshold: float,
) -> None:
    if not (dry_threshold < dry_clear < damp_clear < damp_threshold):
        raise ValueError(
            "humidity stress thresholds must satisfy "
            "dry_threshold_percent < dry_clear_percent < "
            "damp_clear_percent < damp_threshold_percent"
        )
    if dry_clear - dry_threshold < _HUMIDITY_STRESS_MIN_HYSTERESIS_SPAN:
        raise ValueError(
            "humidity stress dry_clear_percent must exceed "
            "dry_threshold_percent by at least "
            f"{_HUMIDITY_STRESS_MIN_HYSTERESIS_SPAN} %"
        )
    if damp_threshold - damp_clear < _HUMIDITY_STRESS_MIN_HYSTERESIS_SPAN:
        raise ValueError(
            "humidity stress damp_threshold_percent must exceed "
            "damp_clear_percent by at least "
            f"{_HUMIDITY_STRESS_MIN_HYSTERESIS_SPAN} %"
        )
    if damp_clear - dry_clear < _HUMIDITY_STRESS_MIN_STABLE_SPAN:
        raise ValueError(
            "humidity stress stable band must be at least "
            f"{_HUMIDITY_STRESS_MIN_STABLE_SPAN} %"
        )


def _default_humidity_stress_overrides() -> Mapping[str, float | None]:
    return MappingProxyType(dict.fromkeys(HUMIDITY_STRESS_OVERRIDE_KEYS, None))


@dataclass(frozen=True, slots=True)
class HumidityConfig:
    """Per-plant ambient-humidity assignment and staleness."""

    sources: tuple[SensorSource, ...] = ()
    primary_entity_id: str | None = None
    aggregation: HumidityAggregation = "average"
    stale_after_seconds: int = DEFAULT_STALE_AFTER_SECONDS
    stress_threshold_overrides: Mapping[str, float | None] = field(
        default_factory=_default_humidity_stress_overrides
    )

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "stress_threshold_overrides",
            MappingProxyType(dict(self.stress_threshold_overrides)),
        )

    def effective_stress_threshold(self, key: str) -> float:
        override = self.stress_threshold_overrides[key]
        if override is None:
            return HUMIDITY_STRESS_BUILTIN_DEFAULTS[key]
        return override

    @classmethod
    def from_storage(cls, data: object) -> Self:  # noqa: PLR0912
        if not isinstance(data, dict):
            raise ValueError("humidity config must be an object")
        _require_no_extra_keys(
            data,
            frozenset(
                {
                    "sources",
                    "primary_entity_id",
                    "aggregation",
                    "stale_after_seconds",
                    "stress_threshold_overrides",
                }
            ),
            "humidity config",
        )
        raw_sources = data.get("sources", [])
        if isinstance(raw_sources, str) or not isinstance(raw_sources, Iterable):
            raise ValueError("humidity config sources must be a list")
        parsed_sources: list[SensorSource] = []
        seen_entity_ids: set[str] = set()
        seen_registry_ids: set[str] = set()
        for src in raw_sources:
            if len(parsed_sources) >= SENSOR_SOURCE_MAX_COUNT:
                raise ValueError("humidity config has too many sources")
            source = SensorSource.from_storage(src)
            if source.entity_id in seen_entity_ids:
                raise ValueError("humidity config sources must be unique by entity_id")
            if (
                source.registry_id is not None
                and source.registry_id in seen_registry_ids
            ):
                raise ValueError(
                    "humidity config sources must be unique by registry_id"
                )
            seen_entity_ids.add(source.entity_id)
            if source.registry_id is not None:
                seen_registry_ids.add(source.registry_id)
            parsed_sources.append(source)

        primary_raw = data.get("primary_entity_id")
        primary_entity_id: str | None
        if primary_raw is None:
            primary_entity_id = None
        else:
            primary_entity_id = _require_str(
                primary_raw, "humidity config primary_entity_id"
            )
            if (
                primary_entity_id != primary_entity_id.strip()
                or len(primary_entity_id) > _ENTITY_ID_MAX_LEN
            ):
                raise ValueError("humidity config primary_entity_id is invalid")
        if primary_entity_id is not None and primary_entity_id not in seen_entity_ids:
            raise ValueError(
                "humidity config primary_entity_id must reference a listed source"
            )

        aggregation_raw = data.get("aggregation", "average")
        aggregation = _require_str(aggregation_raw, "humidity config aggregation")
        if aggregation not in HUMIDITY_AGGREGATIONS:
            raise ValueError("humidity config aggregation is not supported")

        stale_after_seconds = _require_positive_int(
            data.get("stale_after_seconds", DEFAULT_STALE_AFTER_SECONDS),
            "humidity config stale_after_seconds",
        )
        if not (
            MIN_STALE_AFTER_SECONDS <= stale_after_seconds <= MAX_STALE_AFTER_SECONDS
        ):
            raise ValueError(
                "humidity config stale_after_seconds is outside the allowed range"
            )
        overrides = _parse_stress_overrides(
            data.get("stress_threshold_overrides"),
            keys=HUMIDITY_STRESS_OVERRIDE_KEYS,
            builtins=HUMIDITY_STRESS_BUILTIN_DEFAULTS,
            require=require_humidity_stress_threshold,
            validate=lambda eff: validate_humidity_stress_threshold_order(
                eff["dry_threshold_percent"],
                eff["dry_clear_percent"],
                eff["damp_clear_percent"],
                eff["damp_threshold_percent"],
            ),
            field_prefix="humidity stress override",
            missing_message=(
                "humidity stress override map must contain "
                "dry_threshold_percent, dry_clear_percent, "
                "damp_threshold_percent, and damp_clear_percent"
            ),
            object_error="humidity config stress_threshold_overrides must be an object",
        )
        return cls(
            sources=tuple(parsed_sources),
            primary_entity_id=primary_entity_id,
            aggregation=aggregation,  # type: ignore[arg-type]
            stale_after_seconds=stale_after_seconds,
            stress_threshold_overrides=overrides,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "sources": [source.as_storage() for source in self.sources],
            "primary_entity_id": self.primary_entity_id,
            "aggregation": self.aggregation,
            "stale_after_seconds": self.stale_after_seconds,
            "stress_threshold_overrides": {
                key: self.stress_threshold_overrides[key]
                for key in HUMIDITY_STRESS_OVERRIDE_KEYS
            },
        }


LOW_LIGHT_OVERRIDE_KEYS: Final = ("target_lux", "clear_lux")
LOW_LIGHT_BUILTIN_DEFAULTS: Final[Mapping[str, float]] = MappingProxyType(
    {"target_lux": 500.0, "clear_lux": 700.0}
)
_LOW_LIGHT_LOWER: Final = 0.0
_LOW_LIGHT_UPPER: Final = 200_000.0
_LOW_LIGHT_MIN_HYSTERESIS_SPAN: Final = 10.0


def require_low_light_threshold(value: object, field_name: str) -> float:
    import math  # noqa: PLC0415

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must be a number")
    numeric = float(value)
    if math.isnan(numeric) or math.isinf(numeric):
        raise ValueError(f"{field_name} must be a finite number")
    rounded = _round_half_up_one_decimal(numeric)
    if not (_LOW_LIGHT_LOWER <= rounded <= _LOW_LIGHT_UPPER):
        raise ValueError(
            f"{field_name} must satisfy "
            f"{_LOW_LIGHT_LOWER} <= value <= {_LOW_LIGHT_UPPER}"
        )
    return rounded


def validate_low_light_threshold_order(target_lux: float, clear_lux: float) -> None:
    if not (target_lux < clear_lux):
        raise ValueError("low_light thresholds must satisfy target_lux < clear_lux")
    if clear_lux - target_lux < _LOW_LIGHT_MIN_HYSTERESIS_SPAN:
        raise ValueError(
            "low_light clear_lux must exceed target_lux by at least "
            f"{_LOW_LIGHT_MIN_HYSTERESIS_SPAN} lx"
        )


def _default_low_light_overrides() -> Mapping[str, float | None]:
    return MappingProxyType(dict.fromkeys(LOW_LIGHT_OVERRIDE_KEYS, None))


@dataclass(frozen=True, slots=True)
class IlluminanceConfig:
    """Per-plant illuminance assignment and staleness."""

    sources: tuple[SensorSource, ...] = ()
    primary_entity_id: str | None = None
    aggregation: IlluminanceAggregation = "primary"
    stale_after_seconds: int = DEFAULT_STALE_AFTER_SECONDS
    stress_threshold_overrides: Mapping[str, float | None] = field(
        default_factory=_default_low_light_overrides
    )

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "stress_threshold_overrides",
            MappingProxyType(dict(self.stress_threshold_overrides)),
        )

    def effective_stress_threshold(self, key: str) -> float:
        override = self.stress_threshold_overrides[key]
        if override is None:
            return LOW_LIGHT_BUILTIN_DEFAULTS[key]
        return override

    @classmethod
    def from_storage(cls, data: object) -> Self:  # noqa: PLR0912
        if not isinstance(data, dict):
            raise ValueError("illuminance config must be an object")
        _require_no_extra_keys(
            data,
            frozenset(
                {
                    "sources",
                    "primary_entity_id",
                    "aggregation",
                    "stale_after_seconds",
                    "stress_threshold_overrides",
                }
            ),
            "illuminance config",
        )
        raw_sources = data.get("sources", [])
        if isinstance(raw_sources, str) or not isinstance(raw_sources, Iterable):
            raise ValueError("illuminance config sources must be a list")
        parsed_sources: list[SensorSource] = []
        seen_entity_ids: set[str] = set()
        seen_registry_ids: set[str] = set()
        for src in raw_sources:
            if len(parsed_sources) >= SENSOR_SOURCE_MAX_COUNT:
                raise ValueError("illuminance config has too many sources")
            source = SensorSource.from_storage(src)
            if source.entity_id in seen_entity_ids:
                raise ValueError(
                    "illuminance config sources must be unique by entity_id"
                )
            if (
                source.registry_id is not None
                and source.registry_id in seen_registry_ids
            ):
                raise ValueError(
                    "illuminance config sources must be unique by registry_id"
                )
            seen_entity_ids.add(source.entity_id)
            if source.registry_id is not None:
                seen_registry_ids.add(source.registry_id)
            parsed_sources.append(source)

        primary_raw = data.get("primary_entity_id")
        primary_entity_id: str | None
        if primary_raw is None:
            primary_entity_id = None
        else:
            primary_entity_id = _require_str(
                primary_raw, "illuminance config primary_entity_id"
            )
            if (
                primary_entity_id != primary_entity_id.strip()
                or len(primary_entity_id) > _ENTITY_ID_MAX_LEN
            ):
                raise ValueError("illuminance config primary_entity_id is invalid")
        if primary_entity_id is not None and primary_entity_id not in seen_entity_ids:
            raise ValueError(
                "illuminance config primary_entity_id must reference a listed source"
            )

        aggregation_raw = data.get("aggregation", "primary")
        aggregation = _require_str(aggregation_raw, "illuminance config aggregation")
        if aggregation not in ILLUMINANCE_AGGREGATIONS:
            raise ValueError("illuminance config aggregation is not supported")

        stale_after_seconds = _require_positive_int(
            data.get("stale_after_seconds", DEFAULT_STALE_AFTER_SECONDS),
            "illuminance config stale_after_seconds",
        )
        if not (
            MIN_STALE_AFTER_SECONDS <= stale_after_seconds <= MAX_STALE_AFTER_SECONDS
        ):
            raise ValueError(
                "illuminance config stale_after_seconds is outside the allowed range"
            )
        overrides = _parse_stress_overrides(
            data.get("stress_threshold_overrides"),
            keys=LOW_LIGHT_OVERRIDE_KEYS,
            builtins=LOW_LIGHT_BUILTIN_DEFAULTS,
            require=require_low_light_threshold,
            validate=lambda eff: validate_low_light_threshold_order(
                eff["target_lux"], eff["clear_lux"]
            ),
            field_prefix="low_light override",
            missing_message=(
                "low_light override map must contain target_lux and clear_lux"
            ),
            object_error=(
                "illuminance config stress_threshold_overrides must be an object"
            ),
        )
        return cls(
            sources=tuple(parsed_sources),
            primary_entity_id=primary_entity_id,
            aggregation=aggregation,  # type: ignore[arg-type]
            stale_after_seconds=stale_after_seconds,
            stress_threshold_overrides=overrides,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "sources": [source.as_storage() for source in self.sources],
            "primary_entity_id": self.primary_entity_id,
            "aggregation": self.aggregation,
            "stale_after_seconds": self.stale_after_seconds,
            "stress_threshold_overrides": {
                key: self.stress_threshold_overrides[key]
                for key in LOW_LIGHT_OVERRIDE_KEYS
            },
        }


LOW_BATTERY_OVERRIDE_KEYS: Final = ("threshold_percent", "clear_percent")
LOW_BATTERY_BUILTIN_DEFAULTS: Final[Mapping[str, int]] = MappingProxyType(
    {"threshold_percent": 20, "clear_percent": 25}
)
_LOW_BATTERY_LOWER: Final = 0
_LOW_BATTERY_UPPER: Final = 100
_LOW_BATTERY_MIN_HYSTERESIS_SPAN: Final = 1


def _round_half_up_int(value: float) -> int:
    import math  # noqa: PLC0415

    if value >= 0:
        return math.floor(value + 0.5)
    return -math.floor(-value + 0.5)


def require_low_battery_threshold(value: object, field_name: str) -> int:
    import math  # noqa: PLC0415

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must be a number")
    numeric = float(value)
    if math.isnan(numeric) or math.isinf(numeric):
        raise ValueError(f"{field_name} must be a finite number")
    rounded = _round_half_up_int(numeric)
    if not (_LOW_BATTERY_LOWER <= rounded <= _LOW_BATTERY_UPPER):
        raise ValueError(
            f"{field_name} must satisfy "
            f"{_LOW_BATTERY_LOWER} <= value <= {_LOW_BATTERY_UPPER}"
        )
    return rounded


def validate_low_battery_threshold_order(
    threshold_percent: int, clear_percent: int
) -> None:
    if not (threshold_percent < clear_percent):
        raise ValueError(
            "low_battery thresholds must satisfy threshold_percent < clear_percent"
        )
    if clear_percent - threshold_percent < _LOW_BATTERY_MIN_HYSTERESIS_SPAN:
        raise ValueError(
            "low_battery clear_percent must exceed threshold_percent by at least "
            f"{_LOW_BATTERY_MIN_HYSTERESIS_SPAN} %"
        )


def _default_low_battery_overrides() -> Mapping[str, int | None]:
    return MappingProxyType(dict.fromkeys(LOW_BATTERY_OVERRIDE_KEYS, None))


@dataclass(frozen=True, slots=True)
class BatteryConfig:
    """Per-plant battery assignment and staleness."""

    sources: tuple[SensorSource, ...] = ()
    primary_entity_id: str | None = None
    aggregation: BatteryAggregation = "min"
    stale_after_seconds: int = DEFAULT_STALE_AFTER_SECONDS
    stress_threshold_overrides: Mapping[str, int | None] = field(
        default_factory=_default_low_battery_overrides
    )

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "stress_threshold_overrides",
            MappingProxyType(dict(self.stress_threshold_overrides)),
        )

    def effective_stress_threshold(self, key: str) -> int:
        override = self.stress_threshold_overrides[key]
        if override is None:
            return LOW_BATTERY_BUILTIN_DEFAULTS[key]
        return override

    @classmethod
    def from_storage(cls, data: object) -> Self:  # noqa: PLR0912
        if not isinstance(data, dict):
            raise ValueError("battery config must be an object")
        _require_no_extra_keys(
            data,
            frozenset(
                {
                    "sources",
                    "primary_entity_id",
                    "aggregation",
                    "stale_after_seconds",
                    "stress_threshold_overrides",
                }
            ),
            "battery config",
        )
        raw_sources = data.get("sources", [])
        if isinstance(raw_sources, str) or not isinstance(raw_sources, Iterable):
            raise ValueError("battery config sources must be a list")
        parsed_sources: list[SensorSource] = []
        seen_entity_ids: set[str] = set()
        seen_registry_ids: set[str] = set()
        for src in raw_sources:
            if len(parsed_sources) >= SENSOR_SOURCE_MAX_COUNT:
                raise ValueError("battery config has too many sources")
            source = SensorSource.from_storage(src)
            if source.entity_id in seen_entity_ids:
                raise ValueError("battery config sources must be unique by entity_id")
            if (
                source.registry_id is not None
                and source.registry_id in seen_registry_ids
            ):
                raise ValueError("battery config sources must be unique by registry_id")
            seen_entity_ids.add(source.entity_id)
            if source.registry_id is not None:
                seen_registry_ids.add(source.registry_id)
            parsed_sources.append(source)

        primary_raw = data.get("primary_entity_id")
        primary_entity_id: str | None
        if primary_raw is None:
            primary_entity_id = None
        else:
            primary_entity_id = _require_str(
                primary_raw, "battery config primary_entity_id"
            )
            if (
                primary_entity_id != primary_entity_id.strip()
                or len(primary_entity_id) > _ENTITY_ID_MAX_LEN
            ):
                raise ValueError("battery config primary_entity_id is invalid")
        if primary_entity_id is not None and primary_entity_id not in seen_entity_ids:
            raise ValueError(
                "battery config primary_entity_id must reference a listed source"
            )

        aggregation_raw = data.get("aggregation", "min")
        aggregation = _require_str(aggregation_raw, "battery config aggregation")
        if aggregation not in BATTERY_AGGREGATIONS:
            raise ValueError("battery config aggregation is not supported")

        stale_after_seconds = _require_positive_int(
            data.get("stale_after_seconds", DEFAULT_STALE_AFTER_SECONDS),
            "battery config stale_after_seconds",
        )
        if not (
            MIN_STALE_AFTER_SECONDS <= stale_after_seconds <= MAX_STALE_AFTER_SECONDS
        ):
            raise ValueError(
                "battery config stale_after_seconds is outside the allowed range"
            )
        overrides = _parse_stress_overrides(
            data.get("stress_threshold_overrides"),
            keys=LOW_BATTERY_OVERRIDE_KEYS,
            builtins=LOW_BATTERY_BUILTIN_DEFAULTS,
            require=require_low_battery_threshold,
            validate=lambda eff: validate_low_battery_threshold_order(
                eff["threshold_percent"], eff["clear_percent"]
            ),
            field_prefix="low_battery override",
            missing_message=(
                "low_battery override map must contain "
                "threshold_percent and clear_percent"
            ),
            object_error=(
                "battery config stress_threshold_overrides must be an object"
            ),
        )
        return cls(
            sources=tuple(parsed_sources),
            primary_entity_id=primary_entity_id,
            aggregation=aggregation,  # type: ignore[arg-type]
            stale_after_seconds=stale_after_seconds,
            stress_threshold_overrides=overrides,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "sources": [source.as_storage() for source in self.sources],
            "primary_entity_id": self.primary_entity_id,
            "aggregation": self.aggregation,
            "stale_after_seconds": self.stale_after_seconds,
            "stress_threshold_overrides": {
                key: self.stress_threshold_overrides[key]
                for key in LOW_BATTERY_OVERRIDE_KEYS
            },
        }


CONDUCTIVITY_STRESS_OVERRIDE_KEYS: Final = (
    "low_threshold_micro_siemens_per_cm",
    "low_clear_micro_siemens_per_cm",
    "high_threshold_micro_siemens_per_cm",
    "high_clear_micro_siemens_per_cm",
)
CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS: Final[Mapping[str, float]] = MappingProxyType(
    {
        "low_threshold_micro_siemens_per_cm": 350.0,
        "low_clear_micro_siemens_per_cm": 500.0,
        "high_threshold_micro_siemens_per_cm": 2000.0,
        "high_clear_micro_siemens_per_cm": 1800.0,
    }
)
_CONDUCTIVITY_STRESS_LOWER: Final = 0.0
_CONDUCTIVITY_STRESS_UPPER: Final = 10_000.0
_CONDUCTIVITY_STRESS_MIN_HYSTERESIS_SPAN: Final = 10.0
_CONDUCTIVITY_STRESS_MIN_STABLE_SPAN: Final = 50.0


def require_conductivity_stress_threshold(value: object, field_name: str) -> float:
    import math  # noqa: PLC0415

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must be a number")
    numeric = float(value)
    if math.isnan(numeric) or math.isinf(numeric):
        raise ValueError(f"{field_name} must be a finite number")
    rounded = _round_half_up_one_decimal(numeric)
    if not (_CONDUCTIVITY_STRESS_LOWER <= rounded <= _CONDUCTIVITY_STRESS_UPPER):
        raise ValueError(
            f"{field_name} must satisfy "
            f"{_CONDUCTIVITY_STRESS_LOWER} <= value <= {_CONDUCTIVITY_STRESS_UPPER}"
        )
    return rounded


def validate_conductivity_stress_threshold_order(
    low_threshold: float, low_clear: float, high_clear: float, high_threshold: float
) -> None:
    if not (low_threshold < low_clear < high_clear < high_threshold):
        raise ValueError(
            "conductivity stress thresholds must satisfy "
            "low_threshold_micro_siemens_per_cm < "
            "low_clear_micro_siemens_per_cm < "
            "high_clear_micro_siemens_per_cm < "
            "high_threshold_micro_siemens_per_cm"
        )
    if low_clear - low_threshold < _CONDUCTIVITY_STRESS_MIN_HYSTERESIS_SPAN:
        raise ValueError(
            "conductivity stress low_clear_micro_siemens_per_cm must exceed "
            "low_threshold_micro_siemens_per_cm by at least "
            f"{_CONDUCTIVITY_STRESS_MIN_HYSTERESIS_SPAN} µS/cm"
        )
    if high_threshold - high_clear < _CONDUCTIVITY_STRESS_MIN_HYSTERESIS_SPAN:
        raise ValueError(
            "conductivity stress high_threshold_micro_siemens_per_cm must exceed "
            "high_clear_micro_siemens_per_cm by at least "
            f"{_CONDUCTIVITY_STRESS_MIN_HYSTERESIS_SPAN} µS/cm"
        )
    if high_clear - low_clear < _CONDUCTIVITY_STRESS_MIN_STABLE_SPAN:
        raise ValueError(
            "conductivity stress stable band must be at least "
            f"{_CONDUCTIVITY_STRESS_MIN_STABLE_SPAN} µS/cm"
        )


def _default_conductivity_stress_overrides() -> Mapping[str, float | None]:
    return MappingProxyType(dict.fromkeys(CONDUCTIVITY_STRESS_OVERRIDE_KEYS, None))


@dataclass(frozen=True, slots=True)
class ConductivityConfig:
    """Per-plant conductivity assignment and staleness."""

    sources: tuple[SensorSource, ...] = ()
    primary_entity_id: str | None = None
    aggregation: ConductivityAggregation = "primary"
    stale_after_seconds: int = DEFAULT_STALE_AFTER_SECONDS
    stress_threshold_overrides: Mapping[str, float | None] = field(
        default_factory=_default_conductivity_stress_overrides
    )

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "stress_threshold_overrides",
            MappingProxyType(dict(self.stress_threshold_overrides)),
        )

    def effective_stress_threshold(self, key: str) -> float:
        override = self.stress_threshold_overrides[key]
        if override is None:
            return CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS[key]
        return override

    @classmethod
    def from_storage(cls, data: object) -> Self:  # noqa: PLR0912
        if not isinstance(data, dict):
            raise ValueError("conductivity config must be an object")
        _require_no_extra_keys(
            data,
            frozenset(
                {
                    "sources",
                    "primary_entity_id",
                    "aggregation",
                    "stale_after_seconds",
                    "stress_threshold_overrides",
                }
            ),
            "conductivity config",
        )
        raw_sources = data.get("sources", [])
        if isinstance(raw_sources, str) or not isinstance(raw_sources, Iterable):
            raise ValueError("conductivity config sources must be a list")
        parsed_sources: list[SensorSource] = []
        seen_entity_ids: set[str] = set()
        seen_registry_ids: set[str] = set()
        for src in raw_sources:
            if len(parsed_sources) >= SENSOR_SOURCE_MAX_COUNT:
                raise ValueError("conductivity config has too many sources")
            source = SensorSource.from_storage(src)
            if source.entity_id in seen_entity_ids:
                raise ValueError(
                    "conductivity config sources must be unique by entity_id"
                )
            if (
                source.registry_id is not None
                and source.registry_id in seen_registry_ids
            ):
                raise ValueError(
                    "conductivity config sources must be unique by registry_id"
                )
            seen_entity_ids.add(source.entity_id)
            if source.registry_id is not None:
                seen_registry_ids.add(source.registry_id)
            parsed_sources.append(source)

        primary_raw = data.get("primary_entity_id")
        primary_entity_id: str | None
        if primary_raw is None:
            primary_entity_id = None
        else:
            primary_entity_id = _require_str(
                primary_raw, "conductivity config primary_entity_id"
            )
            if (
                primary_entity_id != primary_entity_id.strip()
                or len(primary_entity_id) > _ENTITY_ID_MAX_LEN
            ):
                raise ValueError("conductivity config primary_entity_id is invalid")
        if primary_entity_id is not None and primary_entity_id not in seen_entity_ids:
            raise ValueError(
                "conductivity config primary_entity_id must reference a listed source"
            )

        aggregation_raw = data.get("aggregation", "primary")
        aggregation = _require_str(aggregation_raw, "conductivity config aggregation")
        if aggregation not in CONDUCTIVITY_AGGREGATIONS:
            raise ValueError("conductivity config aggregation is not supported")

        stale_after_seconds = _require_positive_int(
            data.get("stale_after_seconds", DEFAULT_STALE_AFTER_SECONDS),
            "conductivity config stale_after_seconds",
        )
        if not (
            MIN_STALE_AFTER_SECONDS <= stale_after_seconds <= MAX_STALE_AFTER_SECONDS
        ):
            raise ValueError(
                "conductivity config stale_after_seconds is outside the allowed range"
            )
        overrides = _parse_stress_overrides(
            data.get("stress_threshold_overrides"),
            keys=CONDUCTIVITY_STRESS_OVERRIDE_KEYS,
            builtins=CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS,
            require=require_conductivity_stress_threshold,
            validate=lambda eff: validate_conductivity_stress_threshold_order(
                eff["low_threshold_micro_siemens_per_cm"],
                eff["low_clear_micro_siemens_per_cm"],
                eff["high_clear_micro_siemens_per_cm"],
                eff["high_threshold_micro_siemens_per_cm"],
            ),
            field_prefix="conductivity stress override",
            missing_message=(
                "conductivity stress override map must contain "
                "low_threshold_micro_siemens_per_cm, "
                "low_clear_micro_siemens_per_cm, "
                "high_threshold_micro_siemens_per_cm, and "
                "high_clear_micro_siemens_per_cm"
            ),
            object_error=(
                "conductivity config stress_threshold_overrides must be an object"
            ),
        )
        return cls(
            sources=tuple(parsed_sources),
            primary_entity_id=primary_entity_id,
            aggregation=aggregation,  # type: ignore[arg-type]
            stale_after_seconds=stale_after_seconds,
            stress_threshold_overrides=overrides,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "sources": [source.as_storage() for source in self.sources],
            "primary_entity_id": self.primary_entity_id,
            "aggregation": self.aggregation,
            "stale_after_seconds": self.stale_after_seconds,
            "stress_threshold_overrides": {
                key: self.stress_threshold_overrides[key]
                for key in CONDUCTIVITY_STRESS_OVERRIDE_KEYS
            },
        }


SOIL_TEMPERATURE_STRESS_OVERRIDE_KEYS: Final = (
    "cold_threshold_celsius",
    "cold_clear_celsius",
    "hot_threshold_celsius",
    "hot_clear_celsius",
)
SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS: Final[Mapping[str, float]] = MappingProxyType(
    {
        "cold_threshold_celsius": 10.0,
        "cold_clear_celsius": 12.0,
        "hot_threshold_celsius": 35.0,
        "hot_clear_celsius": 32.0,
    }
)
_SOIL_TEMPERATURE_STRESS_LOWER: Final = -20.0
_SOIL_TEMPERATURE_STRESS_UPPER: Final = 60.0
_SOIL_TEMPERATURE_STRESS_MIN_HYSTERESIS_SPAN: Final = 0.5
_SOIL_TEMPERATURE_STRESS_MIN_STABLE_SPAN: Final = 1.0


def require_soil_temperature_stress_threshold(value: object, field_name: str) -> float:
    import math  # noqa: PLC0415

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must be a number")
    numeric = float(value)
    if math.isnan(numeric) or math.isinf(numeric):
        raise ValueError(f"{field_name} must be a finite number")
    rounded = _round_half_up_one_decimal(numeric)
    if not (
        _SOIL_TEMPERATURE_STRESS_LOWER <= rounded <= _SOIL_TEMPERATURE_STRESS_UPPER
    ):
        raise ValueError(
            f"{field_name} must satisfy "
            f"{_SOIL_TEMPERATURE_STRESS_LOWER} <= value <= "
            f"{_SOIL_TEMPERATURE_STRESS_UPPER}"
        )
    return rounded


def validate_soil_temperature_stress_threshold_order(
    cold_threshold: float, cold_clear: float, hot_clear: float, hot_threshold: float
) -> None:
    if not (cold_threshold < cold_clear < hot_clear < hot_threshold):
        raise ValueError(
            "soil_temperature stress thresholds must satisfy "
            "cold_threshold_celsius < cold_clear_celsius < "
            "hot_clear_celsius < hot_threshold_celsius"
        )
    if cold_clear - cold_threshold < _SOIL_TEMPERATURE_STRESS_MIN_HYSTERESIS_SPAN:
        raise ValueError(
            "soil_temperature stress cold_clear_celsius must exceed "
            "cold_threshold_celsius by at least "
            f"{_SOIL_TEMPERATURE_STRESS_MIN_HYSTERESIS_SPAN} °C"
        )
    if hot_threshold - hot_clear < _SOIL_TEMPERATURE_STRESS_MIN_HYSTERESIS_SPAN:
        raise ValueError(
            "soil_temperature stress hot_threshold_celsius must exceed "
            "hot_clear_celsius by at least "
            f"{_SOIL_TEMPERATURE_STRESS_MIN_HYSTERESIS_SPAN} °C"
        )
    if hot_clear - cold_clear < _SOIL_TEMPERATURE_STRESS_MIN_STABLE_SPAN:
        raise ValueError(
            "soil_temperature stress stable band must be at least "
            f"{_SOIL_TEMPERATURE_STRESS_MIN_STABLE_SPAN} °C"
        )


def _default_soil_temperature_stress_overrides() -> Mapping[str, float | None]:
    return MappingProxyType(dict.fromkeys(SOIL_TEMPERATURE_STRESS_OVERRIDE_KEYS, None))


@dataclass(frozen=True, slots=True)
class SoilTemperatureConfig:
    """Per-plant soil-temperature assignment and staleness."""

    sources: tuple[SensorSource, ...] = ()
    primary_entity_id: str | None = None
    aggregation: SoilTemperatureAggregation = "primary"
    stale_after_seconds: int = DEFAULT_STALE_AFTER_SECONDS
    stress_threshold_overrides: Mapping[str, float | None] = field(
        default_factory=_default_soil_temperature_stress_overrides
    )

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "stress_threshold_overrides",
            MappingProxyType(dict(self.stress_threshold_overrides)),
        )

    def effective_stress_threshold(self, key: str) -> float:
        override = self.stress_threshold_overrides[key]
        if override is None:
            return SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS[key]
        return override

    @classmethod
    def from_storage(cls, data: object) -> Self:  # noqa: PLR0912
        if not isinstance(data, dict):
            raise ValueError("soil_temperature config must be an object")
        _require_no_extra_keys(
            data,
            frozenset(
                {
                    "sources",
                    "primary_entity_id",
                    "aggregation",
                    "stale_after_seconds",
                    "stress_threshold_overrides",
                }
            ),
            "soil_temperature config",
        )
        raw_sources = data.get("sources", [])
        if isinstance(raw_sources, str) or not isinstance(raw_sources, Iterable):
            raise ValueError("soil_temperature config sources must be a list")
        parsed_sources: list[SensorSource] = []
        seen_entity_ids: set[str] = set()
        seen_registry_ids: set[str] = set()
        for src in raw_sources:
            if len(parsed_sources) >= SENSOR_SOURCE_MAX_COUNT:
                raise ValueError("soil_temperature config has too many sources")
            source = SensorSource.from_storage(src)
            if source.entity_id in seen_entity_ids:
                raise ValueError(
                    "soil_temperature config sources must be unique by entity_id"
                )
            if (
                source.registry_id is not None
                and source.registry_id in seen_registry_ids
            ):
                raise ValueError(
                    "soil_temperature config sources must be unique by registry_id"
                )
            seen_entity_ids.add(source.entity_id)
            if source.registry_id is not None:
                seen_registry_ids.add(source.registry_id)
            parsed_sources.append(source)

        primary_raw = data.get("primary_entity_id")
        primary_entity_id: str | None
        if primary_raw is None:
            primary_entity_id = None
        else:
            primary_entity_id = _require_str(
                primary_raw, "soil_temperature config primary_entity_id"
            )
            if (
                primary_entity_id != primary_entity_id.strip()
                or len(primary_entity_id) > _ENTITY_ID_MAX_LEN
            ):
                raise ValueError("soil_temperature config primary_entity_id is invalid")
        if primary_entity_id is not None and primary_entity_id not in seen_entity_ids:
            raise ValueError(
                "soil_temperature config primary_entity_id must reference "
                "a listed source"
            )

        aggregation_raw = data.get("aggregation", "primary")
        aggregation = _require_str(
            aggregation_raw, "soil_temperature config aggregation"
        )
        if aggregation not in SOIL_TEMPERATURE_AGGREGATIONS:
            raise ValueError("soil_temperature config aggregation is not supported")

        stale_after_seconds = _require_positive_int(
            data.get("stale_after_seconds", DEFAULT_STALE_AFTER_SECONDS),
            "soil_temperature config stale_after_seconds",
        )
        if not (
            MIN_STALE_AFTER_SECONDS <= stale_after_seconds <= MAX_STALE_AFTER_SECONDS
        ):
            raise ValueError(
                "soil_temperature config stale_after_seconds is outside "
                "the allowed range"
            )
        overrides = _parse_stress_overrides(
            data.get("stress_threshold_overrides"),
            keys=SOIL_TEMPERATURE_STRESS_OVERRIDE_KEYS,
            builtins=SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
            require=require_soil_temperature_stress_threshold,
            validate=lambda eff: validate_soil_temperature_stress_threshold_order(
                eff["cold_threshold_celsius"],
                eff["cold_clear_celsius"],
                eff["hot_clear_celsius"],
                eff["hot_threshold_celsius"],
            ),
            field_prefix="soil_temperature stress override",
            missing_message=(
                "soil_temperature stress override map must contain "
                "cold_threshold_celsius, cold_clear_celsius, "
                "hot_threshold_celsius, and hot_clear_celsius"
            ),
            object_error=(
                "soil_temperature config stress_threshold_overrides must be an object"
            ),
        )
        return cls(
            sources=tuple(parsed_sources),
            primary_entity_id=primary_entity_id,
            aggregation=aggregation,  # type: ignore[arg-type]
            stale_after_seconds=stale_after_seconds,
            stress_threshold_overrides=overrides,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "sources": [source.as_storage() for source in self.sources],
            "primary_entity_id": self.primary_entity_id,
            "aggregation": self.aggregation,
            "stale_after_seconds": self.stale_after_seconds,
            "stress_threshold_overrides": {
                key: self.stress_threshold_overrides[key]
                for key in SOIL_TEMPERATURE_STRESS_OVERRIDE_KEYS
            },
        }


CO2_STRESS_OVERRIDE_KEYS: Final = ("threshold_ppm", "clear_ppm")
CO2_STRESS_BUILTIN_DEFAULTS: Final[Mapping[str, int]] = MappingProxyType(
    {"threshold_ppm": 5000, "clear_ppm": 4000}
)
_CO2_STRESS_LOWER: Final = 0
_CO2_STRESS_UPPER: Final = 10_000
_CO2_STRESS_MIN_HYSTERESIS_SPAN: Final = 100


def require_co2_stress_threshold(value: object, field_name: str) -> int:
    import math  # noqa: PLC0415

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must be a number")
    numeric = float(value)
    if math.isnan(numeric) or math.isinf(numeric):
        raise ValueError(f"{field_name} must be a finite number")
    rounded = _round_half_up_int(numeric)
    if not (_CO2_STRESS_LOWER <= rounded <= _CO2_STRESS_UPPER):
        raise ValueError(
            f"{field_name} must satisfy "
            f"{_CO2_STRESS_LOWER} <= value <= {_CO2_STRESS_UPPER}"
        )
    return rounded


def validate_co2_stress_threshold_order(clear_ppm: int, threshold_ppm: int) -> None:
    if not (clear_ppm < threshold_ppm):
        raise ValueError("co2 stress thresholds must satisfy clear_ppm < threshold_ppm")
    if threshold_ppm - clear_ppm < _CO2_STRESS_MIN_HYSTERESIS_SPAN:
        raise ValueError(
            "co2 stress threshold_ppm must exceed clear_ppm by at least "
            f"{_CO2_STRESS_MIN_HYSTERESIS_SPAN} ppm"
        )


def _default_co2_stress_overrides() -> Mapping[str, int | None]:
    return MappingProxyType(dict.fromkeys(CO2_STRESS_OVERRIDE_KEYS, None))


@dataclass(frozen=True, slots=True)
class Co2Config:
    """Per-plant CO2 assignment and staleness."""

    sources: tuple[SensorSource, ...] = ()
    primary_entity_id: str | None = None
    aggregation: Co2Aggregation = "average"
    stale_after_seconds: int = DEFAULT_STALE_AFTER_SECONDS
    stress_threshold_overrides: Mapping[str, int | None] = field(
        default_factory=_default_co2_stress_overrides
    )

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "stress_threshold_overrides",
            MappingProxyType(dict(self.stress_threshold_overrides)),
        )

    def effective_stress_threshold(self, key: str) -> int:
        override = self.stress_threshold_overrides[key]
        if override is None:
            return CO2_STRESS_BUILTIN_DEFAULTS[key]
        return override

    @classmethod
    def from_storage(cls, data: object) -> Self:  # noqa: PLR0912
        if not isinstance(data, dict):
            raise ValueError("co2 config must be an object")
        _require_no_extra_keys(
            data,
            frozenset(
                {
                    "sources",
                    "primary_entity_id",
                    "aggregation",
                    "stale_after_seconds",
                    "stress_threshold_overrides",
                }
            ),
            "co2 config",
        )
        raw_sources = data.get("sources", [])
        if isinstance(raw_sources, str) or not isinstance(raw_sources, Iterable):
            raise ValueError("co2 config sources must be a list")
        parsed_sources: list[SensorSource] = []
        seen_entity_ids: set[str] = set()
        seen_registry_ids: set[str] = set()
        for src in raw_sources:
            if len(parsed_sources) >= SENSOR_SOURCE_MAX_COUNT:
                raise ValueError("co2 config has too many sources")
            source = SensorSource.from_storage(src)
            if source.entity_id in seen_entity_ids:
                raise ValueError("co2 config sources must be unique by entity_id")
            if (
                source.registry_id is not None
                and source.registry_id in seen_registry_ids
            ):
                raise ValueError("co2 config sources must be unique by registry_id")
            seen_entity_ids.add(source.entity_id)
            if source.registry_id is not None:
                seen_registry_ids.add(source.registry_id)
            parsed_sources.append(source)

        primary_raw = data.get("primary_entity_id")
        primary_entity_id: str | None
        if primary_raw is None:
            primary_entity_id = None
        else:
            primary_entity_id = _require_str(
                primary_raw, "co2 config primary_entity_id"
            )
            if (
                primary_entity_id != primary_entity_id.strip()
                or len(primary_entity_id) > _ENTITY_ID_MAX_LEN
            ):
                raise ValueError("co2 config primary_entity_id is invalid")
        if primary_entity_id is not None and primary_entity_id not in seen_entity_ids:
            raise ValueError(
                "co2 config primary_entity_id must reference a listed source"
            )

        aggregation_raw = data.get("aggregation", "average")
        aggregation = _require_str(aggregation_raw, "co2 config aggregation")
        if aggregation not in CO2_AGGREGATIONS:
            raise ValueError("co2 config aggregation is not supported")

        stale_after_seconds = _require_positive_int(
            data.get("stale_after_seconds", DEFAULT_STALE_AFTER_SECONDS),
            "co2 config stale_after_seconds",
        )
        if not (
            MIN_STALE_AFTER_SECONDS <= stale_after_seconds <= MAX_STALE_AFTER_SECONDS
        ):
            raise ValueError(
                "co2 config stale_after_seconds is outside the allowed range"
            )
        overrides = _parse_stress_overrides(
            data.get("stress_threshold_overrides"),
            keys=CO2_STRESS_OVERRIDE_KEYS,
            builtins=CO2_STRESS_BUILTIN_DEFAULTS,
            require=require_co2_stress_threshold,
            validate=lambda eff: validate_co2_stress_threshold_order(
                eff["clear_ppm"], eff["threshold_ppm"]
            ),
            field_prefix="co2 stress override",
            missing_message=(
                "co2 stress override map must contain threshold_ppm and clear_ppm"
            ),
            object_error="co2 config stress_threshold_overrides must be an object",
        )
        return cls(
            sources=tuple(parsed_sources),
            primary_entity_id=primary_entity_id,
            aggregation=aggregation,  # type: ignore[arg-type]
            stale_after_seconds=stale_after_seconds,
            stress_threshold_overrides=overrides,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "sources": [source.as_storage() for source in self.sources],
            "primary_entity_id": self.primary_entity_id,
            "aggregation": self.aggregation,
            "stale_after_seconds": self.stale_after_seconds,
            "stress_threshold_overrides": {
                key: self.stress_threshold_overrides[key]
                for key in CO2_STRESS_OVERRIDE_KEYS
            },
        }


def require_moisture_threshold(value: object, field_name: str) -> int:
    if not _is_pure_int(value):
        raise ValueError(f"{field_name} must be an integer")
    if not (_MOISTURE_PERCENT_LOWER < value < _MOISTURE_PERCENT_UPPER):
        raise ValueError(f"{field_name} must satisfy 0 < value < 100")
    return value


def validate_moisture_threshold_order(
    moisture_min: int, moisture_target: int, moisture_max: int
) -> None:
    if not (moisture_min < moisture_target < moisture_max):
        raise ValueError("moisture thresholds must satisfy min < target < max")
    if moisture_max - moisture_min < MOISTURE_MIN_SPAN:
        raise ValueError(
            "moisture thresholds must span at least "
            f"{MOISTURE_MIN_SPAN} percentage points from min to max"
        )


@dataclass(frozen=True, slots=True)
class PlantRecord:
    id: str
    revision: int
    name: str
    created_at: str
    lifecycle_state: PlantLifecycleState = "active"
    acquired_at: str | None = None
    species: PlantSpecies | None = None
    placement: PlantPlacement | None = None
    tags: tuple[str, ...] = ()
    category: str | None = None
    image: PlantImage | None = None
    moisture: MoistureConfig = field(default_factory=MoistureConfig)
    extra_roles: Mapping[str, Any] = field(default_factory=dict)
    care_events: tuple[CareEvent, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "extra_roles", _deep_freeze(self.extra_roles))
        object.__setattr__(self, "care_events", tuple(self.care_events))

    def role_config(self, role: str) -> Any | None:
        if role == "moisture":
            return self.moisture
        return self.extra_roles.get(role)

    def with_role_config(self, role: str, config: Any) -> Self:
        if role == "moisture":
            return replace(self, moisture=cast("MoistureConfig", config))
        roles = dict(self.extra_roles)
        roles[role] = config
        return replace(self, extra_roles=roles)

    @classmethod
    def from_storage(cls, data: object, *, require_roles: bool = False) -> Self:  # noqa: PLR0912
        if not isinstance(data, dict):
            raise ValueError("plant record must be an object")
        _require_no_extra_keys(
            data,
            frozenset(
                {
                    "id",
                    "revision",
                    "name",
                    "created_at",
                    "lifecycle_state",
                    "acquired_at",
                    "species",
                    "placement",
                    "tags",
                    "category",
                    "image",
                    "moisture",
                    "roles",
                    "care_events",
                }
            ),
            "plant record",
        )

        lifecycle_state = data.get("lifecycle_state", "active")
        if lifecycle_state not in ("active", "disabled"):
            raise ValueError("plant lifecycle_state is not supported")

        raw_tags = data.get("tags", ())
        if isinstance(raw_tags, str) or not isinstance(raw_tags, Iterable):
            raise ValueError("plant tags must be a list of strings")
        tags = tuple(_require_short_str(tag, "plant tag") for tag in raw_tags)
        if len(tags) > PLANT_TAG_MAX_COUNT or any(
            len(tag) > _SHORT_VALUE_MAX_LEN for tag in tags
        ):
            raise ValueError("plant tags exceed their collection or field limits")

        image_data = data.get("image")
        species_data = data.get("species")
        placement_data = data.get("placement")
        raw_roles = data.get("roles", {})
        if not isinstance(raw_roles, dict):
            raise ValueError("plant roles must be an object")
        if require_roles and "moisture" in data:
            raise ValueError("plant top-level moisture is not valid in current storage")
        if require_roles and "moisture" not in raw_roles:
            raise ValueError("plant roles.moisture is required")
        moisture_data = raw_roles.get("moisture", data.get("moisture"))
        if require_roles and not isinstance(moisture_data, dict):
            raise ValueError("plant roles.moisture must be an object")
        moisture = (
            MoistureConfig.from_storage(moisture_data)
            if moisture_data is not None
            else MoistureConfig()
        )
        extra_roles: dict[str, Any] = {}
        raw_events = data.get("care_events")
        if require_roles and not isinstance(raw_events, list):
            raise ValueError("plant care_events is required")
        if raw_events is None:
            raw_events = []
        if not isinstance(raw_events, list) or len(raw_events) > MAX_CARE_EVENTS:
            raise ValueError("plant care_events exceeds its limit or is invalid")
        care_events = tuple(CareEvent.from_storage(row) for row in raw_events)
        if len({event.id for event in care_events}) != len(care_events):
            raise ValueError("duplicate care event id")
        from .roles import ROLE_METADATA  # noqa: PLC0415

        for key, value in raw_roles.items():
            if key == "moisture":
                continue
            definition = ROLE_METADATA.get(key)
            # Fail closed on current-minor loads (require_roles): a stored role
            # config whose type carries a stress_threshold_overrides map must
            # include it. Migrations from older minors re-round-trip such role
            # configs to add the map before this strict load runs, so a missing
            # map here is corrupt current-minor storage, not a legacy shape.
            # (Older minors are parsed leniently during migration, which fills
            # defaults; roles whose config has no such map are unaffected.)
            if (
                require_roles
                and isinstance(value, dict)
                and definition is not None
                and "stress_threshold_overrides"
                in getattr(definition.config_type, "__dataclass_fields__", {})
                and "stress_threshold_overrides" not in value
            ):
                raise ValueError(
                    f"plant roles.{key} is missing stress_threshold_overrides"
                )
            extra_roles[key] = (
                definition.parse_config(value)
                if definition is not None and definition.parse_config is not None
                else _deep_freeze(value)
            )

        return cls(
            id=_require_identifier(data.get("id"), "plant id"),
            revision=_require_positive_int(data.get("revision"), "plant revision"),
            name=_require_bounded_trimmed_str(data.get("name"), "plant name", 200),
            created_at=_require_iso8601(data.get("created_at"), "plant created_at"),
            lifecycle_state=lifecycle_state,
            acquired_at=_optional_iso8601(data.get("acquired_at"), "plant acquired_at"),
            species=PlantSpecies.from_storage(species_data)
            if species_data is not None
            else None,
            placement=PlantPlacement.from_storage(placement_data)
            if placement_data is not None
            else None,
            tags=tags,
            category=_optional_bounded_trimmed_str(
                data.get("category"), "plant category", _SHORT_VALUE_MAX_LEN
            ),
            image=PlantImage.from_storage(image_data)
            if image_data is not None
            else None,
            moisture=moisture,
            extra_roles=extra_roles,
            care_events=care_events,
        )

    def as_storage(self) -> dict[str, Any]:
        from .roles import ROLE_METADATA  # noqa: PLC0415

        extra_roles: dict[str, Any] = {}
        for key, value in self.extra_roles.items():
            definition = ROLE_METADATA.get(key)
            extra_roles[key] = (
                definition.serialize_config(value)
                if definition is not None and definition.serialize_config is not None
                else _deep_thaw(value)
            )
        return {
            "id": self.id,
            "revision": self.revision,
            "name": self.name,
            "created_at": self.created_at,
            "lifecycle_state": self.lifecycle_state,
            "acquired_at": self.acquired_at,
            "species": self.species.as_storage() if self.species is not None else None,
            "placement": self.placement.as_storage()
            if self.placement is not None
            else None,
            "tags": list(self.tags),
            "category": self.category,
            "image": self.image.as_storage() if self.image is not None else None,
            "care_events": [event.as_storage() for event in self.care_events],
            "roles": {
                **extra_roles,
                "moisture": self.moisture.as_storage(),
            },
        }

    def as_view(self) -> dict[str, Any]:
        """
        Serialize for the panel/API contract, never for persistence.

        Storage keeps only roles that have been configured, so a new plant
        stores just ``roles.moisture``. Clients still need every
        source-accepting role's config to seed its sources editor, so each
        unconfigured one is filled with its registered default here. The
        manager falls back to the same default when mutating the role, so the
        view matches what a save would start from.
        """
        from .roles import role_definitions  # noqa: PLC0415

        view = self.as_storage()
        roles: dict[str, Any] = view["roles"]
        for definition in role_definitions():
            if (
                definition.key in roles
                or definition.replace_sources is None
                or definition.serialize_config is None
            ):
                continue
            roles[definition.key] = definition.serialize_config(
                definition.default_config()
            )
        return view

    def with_next_revision(self, **changes: Any) -> Self:
        return replace(self, revision=self.revision + 1, **changes)


@dataclass(frozen=True, slots=True)
class PendingOperation:
    """
    Typed record of a partially-applied plant mutation.

    Persisted before the non-transactional side effects (device registry,
    area assignment, filesystem writes) run, and cleared once reconciliation
    confirms the target state.
    """

    op_id: str
    kind: PlantOperationKind
    plant_id: str
    requested_at: str
    expected_revision: int | None = None
    payload: Mapping[str, Any] = field(default_factory=dict)
    schema_version: int = PENDING_OPERATION_SCHEMA_VERSION

    def __post_init__(self) -> None:
        object.__setattr__(self, "payload", _deep_freeze(self.payload))

    @classmethod
    def from_storage(cls, data: object) -> Self:
        if not isinstance(data, dict):
            raise ValueError("pending operation must be an object")
        kind = data.get("kind")
        if kind not in _OPERATION_KINDS:
            raise ValueError("pending operation kind is not supported")
        expected_revision = data.get("expected_revision")
        if expected_revision is not None:
            expected_revision = _require_positive_int(
                expected_revision, "pending operation expected_revision"
            )
        payload = _require_object_payload(
            data.get("payload", {}), "pending operation payload"
        )
        # Strict schema-version equality: an older or newer value is a
        # signal that the payload shape may differ from what the current
        # validators know about, so we refuse instead of guessing.
        schema_version = _require_exact_schema_version(
            data.get("schema_version"),
            "pending operation schema_version",
            PENDING_OPERATION_SCHEMA_VERSION,
        )
        _validate_pending_operation_payload(kind, payload)
        return cls(
            op_id=_require_identifier(data.get("op_id"), "pending operation op_id"),
            kind=kind,
            plant_id=_require_identifier(
                data.get("plant_id"), "pending operation plant_id"
            ),
            requested_at=_require_iso8601(
                data.get("requested_at"), "pending operation requested_at"
            ),
            expected_revision=expected_revision,
            payload=payload,
            schema_version=schema_version,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "op_id": self.op_id,
            "kind": self.kind,
            "plant_id": self.plant_id,
            "requested_at": self.requested_at,
            "expected_revision": self.expected_revision,
            "payload": _deep_thaw(self.payload),
            "schema_version": self.schema_version,
        }


@dataclass(frozen=True, slots=True)
class Tombstone:
    """
    Marker for a deleted plant awaiting non-transactional cleanup.

    Kept until every side effect (device removal, image file removal) has
    been reconciled. Consumed by startup reconciliation, then dropped.
    """

    plant_id: str
    deleted_at: str
    payload: Mapping[str, Any] = field(default_factory=dict)
    schema_version: int = TOMBSTONE_SCHEMA_VERSION

    def __post_init__(self) -> None:
        object.__setattr__(self, "payload", _deep_freeze(self.payload))

    @classmethod
    def from_storage(cls, data: object) -> Self:
        if not isinstance(data, dict):
            raise ValueError("tombstone must be an object")
        payload = _require_object_payload(data.get("payload", {}), "tombstone payload")
        schema_version = _require_exact_schema_version(
            data.get("schema_version"),
            "tombstone schema_version",
            TOMBSTONE_SCHEMA_VERSION,
        )
        # Only one tombstone kind exists today (plant deletion); validate
        # its known payload shape strictly. Adding a new tombstone kind
        # is a schema-version bump plus a new branch here.
        _require_no_extra_keys(
            payload, frozenset({"image_id", "cleanup_phase"}), "tombstone"
        )
        image_id = payload.get("image_id")
        if image_id is not None:
            image_id = _require_str(image_id, "tombstone payload.image_id")
            if not _IMAGE_ID_STORAGE_RE.fullmatch(image_id):
                raise ValueError("tombstone payload.image_id is malformed")
        cleanup_phase = payload.get("cleanup_phase", "pending")
        if cleanup_phase not in ("pending", "registry_persisted"):
            raise ValueError("tombstone payload.cleanup_phase is not supported")
        return cls(
            plant_id=_require_identifier(data.get("plant_id"), "tombstone plant_id"),
            deleted_at=_require_iso8601(data.get("deleted_at"), "tombstone deleted_at"),
            payload=payload,
            schema_version=schema_version,
        )

    def as_storage(self) -> dict[str, Any]:
        return {
            "plant_id": self.plant_id,
            "deleted_at": self.deleted_at,
            "payload": _deep_thaw(self.payload),
            "schema_version": self.schema_version,
        }


@dataclass(frozen=True, slots=True)
class InventorySnapshot:
    revision: int
    plants: Mapping[str, PlantRecord] = field(default_factory=dict)
    pending_operations: tuple[PendingOperation, ...] = ()
    tombstones: tuple[Tombstone, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "plants", MappingProxyType(dict(self.plants)))
        object.__setattr__(self, "pending_operations", tuple(self.pending_operations))
        object.__setattr__(self, "tombstones", tuple(self.tombstones))

    @classmethod
    def empty(cls) -> Self:
        return cls(revision=0)

    def as_storage(self) -> dict[str, Any]:
        return {
            "revision": self.revision,
            "plants": [plant.as_storage() for plant in self.plants.values()],
            "pending_operations": [op.as_storage() for op in self.pending_operations],
            "tombstones": [tombstone.as_storage() for tombstone in self.tombstones],
        }

    def with_plant(self, plant: PlantRecord) -> Self:
        plants = dict(self.plants)
        plants[plant.id] = plant
        return type(self)(
            revision=self.revision + 1,
            plants=plants,
            pending_operations=self.pending_operations,
            tombstones=self.tombstones,
        )

    def without_plant(self, plant_id: str) -> Self:
        plants = dict(self.plants)
        plants.pop(plant_id, None)
        return type(self)(
            revision=self.revision + 1,
            plants=plants,
            pending_operations=self.pending_operations,
            tombstones=self.tombstones,
        )


# --- Recovery-schema payload dispatch ------------------------------------
#
# Kind → payload validator. Kept at module bottom so validators declared
# above can reference the record classes (``PlantImage`` in particular)
# by direct name without an import cycle.
_PENDING_OPERATION_PAYLOAD_VALIDATORS: Final[Mapping[str, Any]] = MappingProxyType(
    {
        "create_plant": _validate_area_payload,
        "update_plant": _validate_empty_payload,
        "update_area": _validate_area_intent_payload,
        "disable_plant": _validate_empty_payload,
        "reenable_plant": _validate_empty_payload,
        "delete_plant": _validate_empty_payload,
        "create_image": _validate_image_upsert_payload,
        "replace_image": _validate_image_upsert_payload,
        "delete_image": _validate_image_delete_payload,
    }
)
