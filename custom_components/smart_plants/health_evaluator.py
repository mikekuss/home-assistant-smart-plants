"""
Composite plant health.

Pure function ``evaluate`` combines the moisture controller's continuous
0..100 health score with the non-moisture stress binaries into a single
weighted-mean composite score. Roles that are not configured or currently
unavailable are excluded from both the numerator and the weight
denominator; they are never treated as healthy.

The code below defines the weights, availability
rules, confidence semantics, and the bit-identical moisture-only
equivalence.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

if TYPE_CHECKING:
    from .co2_evaluator import Co2Evaluation
    from .conductivity_evaluator import ConductivityEvaluation
    from .humidity_evaluator import HumidityEvaluation
    from .illuminance_evaluator import IlluminanceEvaluation
    from .models import PlantRecord
    from .moisture_evaluator import MoistureEvaluation
    from .soil_temperature_evaluator import SoilTemperatureEvaluation
    from .temperature_evaluator import TemperatureEvaluation


WEIGHT_MOISTURE: Final = 3
WEIGHT_TEMPERATURE: Final = 2
WEIGHT_HUMIDITY: Final = 1
WEIGHT_ILLUMINANCE: Final = 1
WEIGHT_CONDUCTIVITY: Final = 1
WEIGHT_SOIL_TEMPERATURE: Final = 1
WEIGHT_CO2: Final = 1

# Battery is intentionally excluded from the plant-health composite: a low
# battery is device health, not plant health. The low_battery problem binary is
# still exposed as its own entity.

# Fixed contributor order used across evaluator outputs and the WebSocket
# reply. Consumers rely on this being stable.
CONTRIBUTOR_ORDER: Final[tuple[str, ...]] = (
    "moisture",
    "temperature",
    "humidity",
    "illuminance",
    "conductivity",
    "soil_temperature",
    "co2",
)

_WEIGHTS: Final[dict[str, int]] = {
    "moisture": WEIGHT_MOISTURE,
    "temperature": WEIGHT_TEMPERATURE,
    "humidity": WEIGHT_HUMIDITY,
    "illuminance": WEIGHT_ILLUMINANCE,
    "conductivity": WEIGHT_CONDUCTIVITY,
    "soil_temperature": WEIGHT_SOIL_TEMPERATURE,
    "co2": WEIGHT_CO2,
}


@dataclass(frozen=True, slots=True)
class HealthEvaluation:
    """Composite plant-health result."""

    health_score: int | None
    available: bool
    confidence: float
    confidence_label: str
    contributors: tuple[str, ...]
    configured: tuple[str, ...]
    reasons: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class HealthInputs:
    """
    Frozen snapshot handed to :func:`evaluate`.

    Each field carries the plant's current per-role evaluation, or
    ``None`` when the role has no controller (e.g. before setup).
    Configured-ness is derived from the plant record, not from the
    presence of an evaluation snapshot: a role controller may exist
    with no sources assigned, and the evaluator treats that the same
    as "not configured".
    """

    plant: PlantRecord
    moisture: MoistureEvaluation | None
    temperature: TemperatureEvaluation | None
    humidity: HumidityEvaluation | None
    illuminance: IlluminanceEvaluation | None
    # Battery is intentionally not a composite input (device health, not plant
    # health); the low_battery binary remains its own entity.
    conductivity: ConductivityEvaluation | None
    soil_temperature: SoilTemperatureEvaluation | None
    co2: Co2Evaluation | None


def _sources_for(plant: PlantRecord, role_key: str) -> int:
    """Return the number of sources configured on ``plant`` for ``role_key``."""
    config = plant.role_config(role_key)
    if config is None:
        return 0
    sources = getattr(config, "sources", ())
    return len(sources)


def _moisture_value(evaluation: MoistureEvaluation | None) -> float | None:
    if evaluation is None:
        return None
    if not evaluation.computed_available:
        return None
    if evaluation.health_score is None:
        return None
    return float(evaluation.health_score)


def _stress_value(available: bool, problem: bool) -> float | None:  # noqa: FBT001
    """Return 100.0 when stress off, 0.0 when stress on, None when unavailable."""
    if not available:
        return None
    return 0.0 if problem else 100.0


def _label(*, included: int, configured: int) -> str:
    if configured == 0:
        return "unknown"
    if included == configured:
        return "high"
    half = math.ceil(configured / 2)
    if included >= half:
        return "medium"
    return "low"


def evaluate(inputs: HealthInputs) -> HealthEvaluation:
    """Combine per-role evaluations into a composite plant-health score."""
    values: dict[str, float] = {}
    configured: list[str] = []
    reasons: list[str] = []

    plant = inputs.plant

    # Moisture: continuous 0..100 when computed_available.
    if _sources_for(plant, "moisture") > 0:
        configured.append("moisture")
        moisture_value = _moisture_value(inputs.moisture)
        if moisture_value is not None:
            values["moisture"] = moisture_value

    # Non-moisture stress binaries. The attribute names match each role's
    # evaluation dataclass and its problem flag.
    stress_specs: tuple[tuple[str, object, str, str], ...] = (
        (
            "temperature",
            inputs.temperature,
            "temperature_stress",
            "temperature_stress",
        ),
        ("humidity", inputs.humidity, "humidity_stress", "humidity_stress"),
        ("illuminance", inputs.illuminance, "low_light", "low_light"),
        (
            "conductivity",
            inputs.conductivity,
            "conductivity_stress",
            "conductivity_stress",
        ),
        (
            "soil_temperature",
            inputs.soil_temperature,
            "soil_temperature_stress",
            "soil_temperature_stress",
        ),
        ("co2", inputs.co2, "co2_stress", "co2_stress"),
    )
    for role_key, evaluation, sub_attr, problem_attr in stress_specs:
        if _sources_for(plant, role_key) <= 0:
            continue
        configured.append(role_key)
        if evaluation is None:
            continue
        sub = getattr(evaluation, sub_attr, None)
        if sub is None:
            continue
        # Illuminance at night is not evaluable for plant health: exclude it from
        # the composite rather than counting a nighttime "off" as healthy. The
        # low_light binary itself still reports off at night. A dead or
        # stale light sensor is already available=False here (the evaluator
        # checks unavailability before nighttime), so it is excluded, never 100.
        if getattr(sub, "reason", None) == "nighttime":
            continue
        available = bool(getattr(sub, "available", False))
        problem = bool(getattr(sub, problem_attr, False))
        value = _stress_value(available, problem)
        if value is not None:
            values[role_key] = value

    contributors_ordered = tuple(k for k in CONTRIBUTOR_ORDER if k in values)
    configured_ordered = tuple(k for k in CONTRIBUTOR_ORDER if k in configured)

    if not contributors_ordered:
        if not configured_ordered:
            reasons.append("no_roles_configured")
        else:
            reasons.append("no_contributors")
        return HealthEvaluation(
            health_score=None,
            available=False,
            confidence=0.0,
            confidence_label=_label(included=0, configured=len(configured_ordered)),
            contributors=(),
            configured=configured_ordered,
            reasons=tuple(reasons),
        )

    weighted_sum = 0.0
    weight_total = 0
    for role_key in contributors_ordered:
        weight = _WEIGHTS[role_key]
        weighted_sum += weight * values[role_key]
        weight_total += weight
    raw = weighted_sum / weight_total
    # floor(x + 0.5) matches the documented moisture-only tie-break.
    health = math.floor(raw + 0.5)
    health = max(0, min(100, health))

    included_count = len(contributors_ordered)
    configured_count = len(configured_ordered)
    confidence = included_count / configured_count if configured_count > 0 else 0.0
    return HealthEvaluation(
        health_score=health,
        available=True,
        confidence=confidence,
        confidence_label=_label(included=included_count, configured=configured_count),
        contributors=contributors_ordered,
        configured=configured_ordered,
        reasons=tuple(reasons),
    )
