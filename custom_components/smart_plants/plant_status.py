"""
Pure plant status derivation shared by the overview command.

The overview status is derived from the same evaluations the entities
read (``controller.current_evaluation`` for each role), so the panel and
the binary sensors cannot disagree. This module performs no I/O and holds
no state.

Status priority, highest first:

1. ``paused`` -- the plant is disabled.
2. ``needs_water`` -- the moisture evaluation reports ``needs_water``.
3. ``too_wet`` -- the moisture evaluation reports ``too_wet``.
4. ``problem`` -- another role's stress signal is on (temperature, humidity,
   low light, conductivity, soil temperature, CO2, low battery).
5. ``stale`` -- a moisture source is stale, or the moisture value is
   unavailable although sources are assigned.
6. ``no_sensors`` -- the moisture role has no sources.
7. ``healthy`` -- none of the above.

``problems`` lists every active issue in the same order, so for any status
other than ``paused`` and ``healthy`` the first problem matches the status.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Final, Literal

PlantStatus = Literal[
    "paused",
    "needs_water",
    "too_wet",
    "problem",
    "stale",
    "no_sensors",
    "healthy",
]
RoleState = Literal["ok", "low", "high", "stale", "unavailable"]

MOISTURE_ROLE: Final = "moisture"


@dataclass(frozen=True, slots=True)
class _StressSignal:
    """Where a role's stress result lives and how its reasons map to kinds."""

    attribute: str
    flag: str
    kinds: dict[str, str]


# Non-moisture roles in status priority order. ``attribute`` names the nested
# stress evaluation on the role's evaluation, ``flag`` the boolean the
# matching binary sensor reports, and ``kinds`` maps each stress reason the
# evaluator emits to a direction-specific problem kind.
_STRESS_SIGNALS: Final[dict[str, _StressSignal]] = {
    "temperature": _StressSignal(
        "temperature_stress",
        "temperature_stress",
        {"cold_stress": "too_cold", "hot_stress": "too_hot"},
    ),
    "humidity": _StressSignal(
        "humidity_stress",
        "humidity_stress",
        {"dry_stress": "too_dry", "damp_stress": "too_humid"},
    ),
    "illuminance": _StressSignal("low_light", "low_light", {"low_light": "low_light"}),
    "conductivity": _StressSignal(
        "conductivity_stress",
        "conductivity_stress",
        {
            "low_conductivity_stress": "low_conductivity",
            "high_conductivity_stress": "high_conductivity",
        },
    ),
    "soil_temperature": _StressSignal(
        "soil_temperature_stress",
        "soil_temperature_stress",
        {"cold_stress": "too_cold", "hot_stress": "too_hot"},
    ),
    "co2": _StressSignal("co2_stress", "co2_stress", {"co2_stress": "high_co2"}),
    "battery": _StressSignal(
        "low_battery", "low_battery", {"low_battery": "battery_low"}
    ),
}

STRESS_ROLE_ORDER: Final[tuple[str, ...]] = tuple(_STRESS_SIGNALS)

# Fallback kind for a stress signal whose reason carries no direction. The
# built-in evaluators always report a direction; this keeps a future role or
# reason from being dropped silently.
GENERIC_STRESS_KIND: Final = "stress"

_KIND_STATE: Final[dict[str, RoleState]] = {
    "needs_water": "low",
    "too_wet": "high",
    "too_cold": "low",
    "too_hot": "high",
    "too_dry": "low",
    "too_humid": "high",
    "low_light": "low",
    "low_conductivity": "low",
    "high_conductivity": "high",
    "high_co2": "high",
    "battery_low": "low",
}


@dataclass(frozen=True, slots=True)
class RoleProblem:
    role: str
    kind: str

    def as_dict(self) -> dict[str, str]:
        return {"role": self.role, "kind": self.kind}


@dataclass(frozen=True, slots=True)
class PlantStatusResult:
    status: PlantStatus
    problems: tuple[RoleProblem, ...] = ()


def _has_sources(evaluation: Any) -> bool:
    return evaluation is not None and "no_sources" not in getattr(
        evaluation, "reasons", ()
    )


def stress_kind(role: str, evaluation: Any) -> str | None:
    """
    Return the problem kind when ``role`` reports stress, otherwise ``None``.

    Reads the same boolean the role's problem binary sensor reports, so a
    kind is returned exactly when that entity is on.
    """
    signal = _STRESS_SIGNALS.get(role)
    if signal is None or evaluation is None:
        return None
    stress = getattr(evaluation, signal.attribute, None)
    if stress is None or not getattr(stress, "available", False):
        return None
    if not getattr(stress, signal.flag, False):
        return None
    return signal.kinds.get(getattr(stress, "reason", ""), GENERIC_STRESS_KIND)


def _moisture_value_problem(evaluation: Any) -> str | None:
    """Return ``needs_water``/``too_wet`` when the moisture value is usable."""
    if evaluation is None or not evaluation.computed_available:
        return None
    if evaluation.needs_water:
        return "needs_water"
    if evaluation.too_wet:
        return "too_wet"
    return None


def _moisture_reading_problem(evaluation: Any) -> str | None:
    """Return ``stale``/``unavailable`` for an assigned but unusable reading."""
    if not _has_sources(evaluation):
        return None
    if evaluation.sensor_stale:
        return "stale"
    if not evaluation.computed_available:
        return "unavailable"
    return None


def evaluate_plant_status(
    *,
    disabled: bool,
    evaluations: dict[str, Any],
) -> PlantStatusResult:
    """
    Choose one status and list every active problem for a plant.

    ``evaluations`` maps a role key to that role's current evaluation (or
    ``None`` when the role has no controller). Missing roles are treated as
    unconfigured.
    """
    if disabled:
        return PlantStatusResult(status="paused")

    moisture = evaluations.get(MOISTURE_ROLE)
    problems: list[RoleProblem] = []

    value_problem = _moisture_value_problem(moisture)
    if value_problem is not None:
        problems.append(RoleProblem(MOISTURE_ROLE, value_problem))
    for role in STRESS_ROLE_ORDER:
        kind = stress_kind(role, evaluations.get(role))
        if kind is not None:
            problems.append(RoleProblem(role, kind))
    reading_problem = _moisture_reading_problem(moisture)
    if reading_problem is not None:
        problems.append(RoleProblem(MOISTURE_ROLE, reading_problem))
    if not _has_sources(moisture):
        problems.append(RoleProblem(MOISTURE_ROLE, "no_sensors"))

    if value_problem is not None:
        status: PlantStatus = value_problem  # type: ignore[assignment]
    elif any(problem.role != MOISTURE_ROLE for problem in problems):
        status = "problem"
    elif reading_problem is not None:
        status = "stale"
    elif not _has_sources(moisture):
        status = "no_sensors"
    else:
        status = "healthy"
    return PlantStatusResult(status=status, problems=tuple(problems))


def role_state(role: str, evaluation: Any) -> RoleState:
    """
    Summarize one role's reading for the overview.

    Returns ``ok``, ``low``, ``high``, ``stale`` or ``unavailable``.
    Staleness wins over a direction because a stale source makes the stress
    signal unavailable. ``low``/``high`` follow the same flags the problem
    binary sensors report.
    """
    if evaluation is None:
        return "unavailable"
    if getattr(evaluation, "sensor_stale", False):
        return "stale"
    if not getattr(evaluation, "computed_available", False):
        return "unavailable"
    if role == MOISTURE_ROLE:
        kind = _moisture_value_problem(evaluation)
    else:
        kind = stress_kind(role, evaluation)
    if kind is None:
        return "ok"
    # A directionless stress is still a problem; report it on the high side
    # rather than as ``ok`` so the state never contradicts ``problems``.
    return _KIND_STATE.get(kind, "high")
