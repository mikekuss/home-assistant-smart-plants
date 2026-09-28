"""
Build the per-plant overview payload for ``smart_plants/plants/overview``.

Every value comes from the role controllers' current evaluations and the
plant's stored role configuration, which are exactly what the entities and
evaluators use. The payload never includes species provider data,
credentials or tokens.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Final

from homeassistant.const import PERCENTAGE, UnitOfConductivity, UnitOfTemperature

from .care import care_summary
from .co2_evaluator import CO2_PARTS_PER_MILLION
from .illuminance_evaluator import LIGHT_LUX
from .plant_status import evaluate_plant_status, role_state
from .roles import role_definitions

if TYPE_CHECKING:
    from .manager import SmartPlantsManager
    from .models import PlantRecord


@dataclass(frozen=True, slots=True)
class _RoleView:
    """How to read one role's value, unit and target range."""

    value_attribute: str
    unit: str
    # (min, target, max) threshold keys; ``None`` where the role has no bound.
    range_keys: tuple[str | None, str | None, str | None]


_ROLE_VIEWS: Final[dict[str, _RoleView]] = {
    "moisture": _RoleView("computed_percent", PERCENTAGE, ("min", "target", "max")),
    "temperature": _RoleView(
        "computed_celsius",
        UnitOfTemperature.CELSIUS,
        ("cold_threshold_celsius", None, "hot_threshold_celsius"),
    ),
    "humidity": _RoleView(
        "computed_percent",
        PERCENTAGE,
        ("dry_threshold_percent", None, "damp_threshold_percent"),
    ),
    "illuminance": _RoleView("computed_lux", LIGHT_LUX, ("target_lux", None, None)),
    "conductivity": _RoleView(
        "computed_micro_siemens_per_cm",
        UnitOfConductivity.MICROSIEMENS_PER_CM,
        (
            "low_threshold_micro_siemens_per_cm",
            None,
            "high_threshold_micro_siemens_per_cm",
        ),
    ),
    "soil_temperature": _RoleView(
        "computed_celsius",
        UnitOfTemperature.CELSIUS,
        ("cold_threshold_celsius", None, "hot_threshold_celsius"),
    ),
    "co2": _RoleView(
        "computed_ppm", CO2_PARTS_PER_MILLION, (None, None, "threshold_ppm")
    ),
    "battery": _RoleView(
        "computed_percent", PERCENTAGE, ("threshold_percent", None, None)
    ),
}

_RANGE_FIELDS: Final = ("min", "target", "max")


def _effective_threshold(role: str, config: Any, key: str | None) -> float | None:
    if key is None:
        return None
    if role == "moisture":
        return config.effective_threshold(key)  # type: ignore[no-any-return]
    return config.effective_stress_threshold(key)  # type: ignore[no-any-return]


def _role_range(role: str, config: Any) -> dict[str, float | None]:
    view = _ROLE_VIEWS.get(role)
    keys = view.range_keys if view is not None else (None, None, None)
    return {
        field: _effective_threshold(role, config, key)
        for field, key in zip(_RANGE_FIELDS, keys, strict=True)
    }


def _role_view(
    role: str,
    config: Any,
    controller: Any | None,
    *,
    disabled: bool,
) -> dict[str, Any]:
    view = _ROLE_VIEWS.get(role)
    evaluation = controller.current_evaluation if controller is not None else None
    value: Any = None
    state = "unavailable"
    if not disabled and evaluation is not None:
        state = role_state(role, evaluation)
        if view is not None and getattr(evaluation, "computed_available", False):
            value = getattr(evaluation, view.value_attribute, None)
    last_valid_at = getattr(controller, "last_valid_at", None)
    return {
        "value": value,
        "unit": view.unit if view is not None else None,
        "state": state,
        "range": _role_range(role, config),
        "last_reported": (
            last_valid_at.isoformat() if last_valid_at is not None else None
        ),
        "sources": [source.entity_id for source in config.sources],
    }


def plant_overview(manager: SmartPlantsManager, plant: PlantRecord) -> dict[str, Any]:
    """Return the overview payload for one plant."""
    disabled = plant.lifecycle_state == "disabled"
    evaluations: dict[str, Any] = {}
    roles: dict[str, Any] = {}
    for definition in role_definitions():
        controller = manager.get_role_controller(plant.id, definition.key)
        evaluations[definition.key] = (
            controller.current_evaluation if controller is not None else None
        )
        config = definition.config_for(plant)
        if config is None or not getattr(config, "sources", ()):
            continue
        roles[definition.key] = _role_view(
            definition.key, config, controller, disabled=disabled
        )
    result = evaluate_plant_status(disabled=disabled, evaluations=evaluations)
    return {
        "plant_id": plant.id,
        "revision": plant.revision,
        "lifecycle_state": plant.lifecycle_state,
        "status": result.status,
        "problems": [problem.as_dict() for problem in result.problems],
        "roles": roles,
        "last_watered_at": care_summary(plant.care_events)["last_watered_at"],
        "image": {"id": plant.image.id} if plant.image is not None else None,
    }
