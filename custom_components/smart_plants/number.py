"""
Smart Plants ``number`` platform.

``ROLE_FACTORIES`` holds the editable moisture percentage
thresholds:

* ``moisture_min``
* ``moisture_target``
* ``moisture_max``

Writes flow through ``manager.async_set_moisture_thresholds`` under the
mutation lock so a partial write can never leave the record in an
inconsistent order. The write carries the current plant revision on
the way in; if a concurrent mutation bumped the revision the write is
retried against the fresh value once — a subsequent conflict surfaces
as a validation error the user can act on.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.const import PERCENTAGE, EntityCategory

from .entity import (
    EntityFactory,
    SmartPlantsEntity,
    async_setup_platform_lifecycle,
)
from .manager import SmartPlantsRevisionConflictError, SmartPlantsValidationError
from .roles import EntityRole, RoleDefinition, entity_factories

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddEntitiesCallback

    from .manager import SmartPlantsManager
    from .models import PlantRecord


PLATFORM = "number"
ROLE_FACTORIES: dict[str, EntityFactory]

ROLE_MOISTURE_MIN = "moisture_min"
ROLE_MOISTURE_TARGET = "moisture_target"
ROLE_MOISTURE_MAX = "moisture_max"


class SmartPlantsNumberEntity(SmartPlantsEntity, NumberEntity):
    """Base for every Smart Plants number role."""

    PLATFORM = PLATFORM

    _attr_native_min_value = 1.0
    _attr_native_max_value = 99.0
    _attr_native_step = 1.0
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_mode = NumberMode.BOX
    _attr_entity_category = EntityCategory.CONFIG
    # The panel edits thresholds through the websocket API, so these
    # entities are only needed for automations and dashboards. Home
    # Assistant applies this default only when an entity is first
    # registered; entities that already exist keep their enabled state.
    _attr_entity_registry_enabled_default = False


class _MoistureThresholdNumber(SmartPlantsNumberEntity):
    """A single moisture threshold (min/target/max)."""

    _field: str = ""

    def __init__(
        self, manager: SmartPlantsManager, plant_id: str, role: str, field: str
    ) -> None:
        super().__init__(manager, plant_id, role, role)
        self._field = field

    @property
    def native_value(self) -> float | None:
        plant = self._manager.snapshot.plants.get(self._plant_id)
        if plant is None:
            return None
        return float(getattr(plant.moisture, self._field))

    async def async_set_native_value(self, value: float) -> None:
        if isinstance(value, bool) or not float(value).is_integer():
            raise SmartPlantsValidationError(
                "moisture thresholds must be whole percentage points"
            )
        plant = self._manager.snapshot.plants.get(self._plant_id)
        if plant is None:
            return
        thresholds = {
            f"moisture_{key}": current
            for key, current in plant.moisture.threshold_overrides.items()
        }
        thresholds[self._field] = int(value)
        try:
            await self._manager.async_set_moisture_thresholds(
                self._plant_id,
                expected_revision=plant.revision,
                **thresholds,
            )
        except SmartPlantsRevisionConflictError:
            # Read-back-and-retry once: the record moved under us while
            # the user was editing. A second conflict surfaces to HA.
            fresh = self._manager.snapshot.plants.get(self._plant_id)
            if fresh is None:
                return
            thresholds = {
                f"moisture_{key}": current
                for key, current in fresh.moisture.threshold_overrides.items()
            }
            thresholds[self._field] = int(value)
            await self._manager.async_set_moisture_thresholds(
                self._plant_id,
                expected_revision=fresh.revision,
                **thresholds,
            )


class _MoistureMinNumber(_MoistureThresholdNumber):
    _attr_translation_key = ROLE_MOISTURE_MIN

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_MOISTURE_MIN, "moisture_min")


class _MoistureTargetNumber(_MoistureThresholdNumber):
    _attr_translation_key = ROLE_MOISTURE_TARGET

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_MOISTURE_TARGET, "moisture_target")


class _MoistureMaxNumber(_MoistureThresholdNumber):
    _attr_translation_key = ROLE_MOISTURE_MAX

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_MOISTURE_MAX, "moisture_max")


def _factory_min(manager: SmartPlantsManager, plant: PlantRecord) -> SmartPlantsEntity:
    return _MoistureMinNumber(manager, plant.id)


def _factory_target(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _MoistureTargetNumber(manager, plant.id)


def _factory_max(manager: SmartPlantsManager, plant: PlantRecord) -> SmartPlantsEntity:
    return _MoistureMaxNumber(manager, plant.id)


def _factory_role(
    manager: SmartPlantsManager,
    plant: PlantRecord,
    _definition: RoleDefinition,
    entity: EntityRole,
) -> SmartPlantsEntity:
    factories: dict[str, EntityFactory] = {
        "min": _factory_min,
        "target": _factory_target,
        "max": _factory_max,
    }
    return factories[entity.result_attribute or ""](manager, plant)


ROLE_FACTORIES = entity_factories(PLATFORM)


# Re-export for callers that want the shared validation-error type
_ = SmartPlantsValidationError  # keep import used


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    await async_setup_platform_lifecycle(
        hass,
        entry,
        async_add_entities,
        PLATFORM,
        ROLE_FACTORIES,
    )
