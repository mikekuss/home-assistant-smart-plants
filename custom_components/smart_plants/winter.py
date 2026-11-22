"""
Winter values: thresholds that replace a plant's normal ones in winter.

Winter applies while the plant is in dormant storage or during its rest
period; either one is enough. Only a plant with winter values notices: the
roles it gave winter values evaluate against those, every other role keeps
its normal thresholds.
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Any, Final, Literal

from .care_schedule import is_resting, rest_period_bounds
from .models import MoistureConfig

if TYPE_CHECKING:
    from .models import PlantRecord
    from .roles import RoleDefinition

PLACEMENT_DORMANT_STORAGE: Final = "dormant_storage"

WinterReason = Literal["dormant_storage", "rest_period"]


def winter_reason(plant: PlantRecord, today: date) -> WinterReason | None:
    """
    Return why winter applies to ``plant`` today, or ``None`` when it doesn't.

    Dormant storage wins when both apply: it has no end date, so it still
    holds after the rest period is over.
    """
    placement = plant.placement
    if placement is not None and placement.mode == PLACEMENT_DORMANT_STORAGE:
        return "dormant_storage"
    if is_resting(plant.rest_period, today):
        return "rest_period"
    return None


def winter_active(plant: PlantRecord, today: date) -> bool:
    """Return whether ``plant`` has winter values and they apply today."""
    return (
        plant.winter_thresholds is not None and winter_reason(plant, today) is not None
    )


def winter_values_apply(
    definition: RoleDefinition, plant: PlantRecord, today: date
) -> bool:
    """Return whether the role's winter values replace its thresholds today."""
    winter = plant.winter_thresholds
    return (
        winter is not None
        and definition.key in winter
        and winter_reason(plant, today) is not None
    )


def effective_thresholds(config: Any) -> tuple[float, ...]:
    """Return the thresholds a role config evaluates against, in key order."""
    if isinstance(config, MoistureConfig):
        return (config.moisture_min, config.moisture_target, config.moisture_max)
    overrides = getattr(config, "stress_threshold_overrides", None)
    if overrides is None:
        return ()
    return tuple(float(config.effective_stress_threshold(key)) for key in overrides)


def winter_config(definition: RoleDefinition, plant: PlantRecord, today: date) -> Any:
    """
    Return the role config ``plant`` evaluates against today.

    That is the stored config, with the role's winter values in place of its
    thresholds while winter applies.
    """
    config = definition.config_for(plant)
    winter = plant.winter_thresholds
    if config is None or winter is None or definition.key not in winter:
        return config
    if winter_reason(plant, today) is None:
        return config
    apply = definition.apply_threshold_overrides
    if apply is None:
        return config
    try:
        return apply(config, winter[definition.key])
    except ValueError:
        # Stored winter values were validated on their own; this only guards
        # against a role whose rules changed since they were saved.
        return config


def winter_view(plant: PlantRecord, today: date) -> dict[str, Any] | None:
    """
    Return the winter state for the panel, or ``None`` without winter values.

    ``until`` is the last day of the rest period while winter applies because
    of it; dormant storage has no end date. A paused plant reports winter as
    not active.
    """
    if plant.winter_thresholds is None:
        return None
    # A paused plant evaluates nothing, so its winter values don't apply.
    reason = (
        None if plant.lifecycle_state == "disabled" else winter_reason(plant, today)
    )
    until: str | None = None
    if reason == "rest_period":
        bounds = rest_period_bounds(plant.rest_period, today)
        if bounds is not None:
            until = bounds[1].isoformat()
    return {
        "active": reason is not None,
        "reason": reason,
        "until": until,
        "roles": sorted(plant.winter_thresholds),
    }
