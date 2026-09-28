"""
Smart Plants ``binary_sensor`` platform.

``ROLE_FACTORIES`` holds the moisture-role binary sensors:

* ``needs_water`` — on below ``moisture_min``, off at ``min+2``.
* ``too_wet`` — on above ``moisture_max``, off at ``max-2``.
* ``sensor_stale`` — on when any assigned source is stale or missing
  from the entity registry.

``needs_water`` and ``too_wet`` become ``unavailable`` when the
computed moisture aggregate has no valid input. ``sensor_stale`` stays
available so it can reflect "no assigned source" (off) versus
"assigned source missing" (on).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.const import EntityCategory

from .entity import (
    EntityFactory,
    SmartPlantsEntity,
    async_setup_platform_lifecycle,
)
from .roles import EntityRole, RoleDefinition, entity_factories

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddEntitiesCallback

    from .manager import SmartPlantsManager
    from .models import PlantRecord


PLATFORM = "binary_sensor"
ROLE_FACTORIES: dict[str, EntityFactory]

ROLE_NEEDS_WATER = "needs_water"
ROLE_TOO_WET = "too_wet"
ROLE_SENSOR_STALE = "sensor_stale"
ROLE_LOW_LIGHT = "low_light"
ROLE_LOW_BATTERY = "low_battery"
ROLE_TEMPERATURE_STRESS = "temperature_stress"
ROLE_HUMIDITY_STRESS = "humidity_stress"
ROLE_SOIL_TEMPERATURE_STRESS = "soil_temperature_stress"
ROLE_CO2_STRESS = "co2_stress"
ROLE_CONDUCTIVITY_STRESS = "conductivity_stress"


class SmartPlantsBinarySensorEntity(SmartPlantsEntity, BinarySensorEntity):
    """Base for every Smart Plants binary sensor role."""

    PLATFORM = PLATFORM


class _MoistureBinaryBase(SmartPlantsBinarySensorEntity):
    """Common wiring to the plant's MoistureController."""

    _computed_gated: bool = True

    def __init__(self, manager: SmartPlantsManager, plant_id: str, role: str) -> None:
        super().__init__(manager, plant_id, role, role)
        self._unsub_controller: Any = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._attach_controller_listener()

    async def async_will_remove_from_hass(self) -> None:
        self._detach_controller_listener()
        await super().async_will_remove_from_hass()

    def _attach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            return
        controller = self._manager.get_moisture_controller(self._plant_id)
        if controller is None:
            return
        self._unsub_controller = controller.add_listener(self._on_evaluation)

    def _detach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            self._unsub_controller()
            self._unsub_controller = None

    def _on_evaluation(self) -> None:
        self.async_write_ha_state()

    def _on_plant_disabled(self) -> None:
        self._detach_controller_listener()

    def _on_plant_reenabled(self) -> None:
        self._attach_controller_listener()

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        controller = self._manager.get_moisture_controller(self._plant_id)
        if controller is None:
            return False
        if not self._computed_gated:
            return True
        return bool(controller.current_evaluation.computed_available)


class _NeedsWaterBinary(_MoistureBinaryBase):
    _attr_translation_key = ROLE_NEEDS_WATER
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_NEEDS_WATER)

    @property
    def is_on(self) -> bool | None:
        controller = self._manager.get_moisture_controller(self._plant_id)
        if controller is None:
            return None
        result = controller.current_evaluation
        if not result.computed_available:
            return None
        return bool(result.needs_water)


class _TooWetBinary(_MoistureBinaryBase):
    _attr_translation_key = ROLE_TOO_WET
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_TOO_WET)

    @property
    def is_on(self) -> bool | None:
        controller = self._manager.get_moisture_controller(self._plant_id)
        if controller is None:
            return None
        result = controller.current_evaluation
        if not result.computed_available:
            return None
        return bool(result.too_wet)


class _SensorStaleBinary(_MoistureBinaryBase):
    _attr_translation_key = ROLE_SENSOR_STALE
    _attr_device_class = BinarySensorDeviceClass.PROBLEM
    _computed_gated = False

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_SENSOR_STALE)

    @property
    def is_on(self) -> bool | None:
        controller = self._manager.get_moisture_controller(self._plant_id)
        if controller is None:
            return False
        return bool(controller.current_evaluation.sensor_stale)


class _LowLightBinary(SmartPlantsBinarySensorEntity):
    _attr_translation_key = ROLE_LOW_LIGHT
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_LOW_LIGHT, ROLE_LOW_LIGHT)
        self._unsub_controller: Any = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._attach_controller_listener()

    async def async_will_remove_from_hass(self) -> None:
        self._detach_controller_listener()
        await super().async_will_remove_from_hass()

    def _attach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            return
        controller = self._manager.get_role_controller(self._plant_id, "illuminance")
        if controller is None:
            return
        self._unsub_controller = controller.add_listener(self._on_evaluation)

    def _detach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            self._unsub_controller()
            self._unsub_controller = None

    def _on_evaluation(self) -> None:
        self.async_write_ha_state()

    def _on_plant_disabled(self) -> None:
        self._detach_controller_listener()

    def _on_plant_reenabled(self) -> None:
        self._attach_controller_listener()

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        controller = self._manager.get_role_controller(self._plant_id, "illuminance")
        if controller is None:
            return False
        return bool(controller.current_evaluation.low_light.available)

    @property
    def is_on(self) -> bool | None:
        controller = self._manager.get_role_controller(self._plant_id, "illuminance")
        if controller is None:
            return None
        result = controller.current_evaluation.low_light
        if not result.available:
            return None
        return bool(result.low_light)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        controller = self._manager.get_role_controller(self._plant_id, "illuminance")
        if controller is None:
            return {}
        result = controller.current_evaluation.low_light
        return {
            "confidence": result.confidence,
            "reason": result.reason,
            "sample_count": result.sample_count,
            "target_lux": result.target_lux,
            "clear_lux": result.clear_lux,
        }


class _LowBatteryBinary(SmartPlantsBinarySensorEntity):
    _attr_translation_key = ROLE_LOW_BATTERY
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_LOW_BATTERY, ROLE_LOW_BATTERY)
        self._unsub_controller: Any = None

    _attr_entity_category = EntityCategory.DIAGNOSTIC

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._attach_controller_listener()

    async def async_will_remove_from_hass(self) -> None:
        self._detach_controller_listener()
        await super().async_will_remove_from_hass()

    def _attach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            return
        controller = self._manager.get_role_controller(self._plant_id, "battery")
        if controller is None:
            return
        self._unsub_controller = controller.add_listener(self._on_evaluation)

    def _detach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            self._unsub_controller()
            self._unsub_controller = None

    def _on_evaluation(self) -> None:
        self.async_write_ha_state()

    def _on_plant_disabled(self) -> None:
        self._detach_controller_listener()

    def _on_plant_reenabled(self) -> None:
        self._attach_controller_listener()

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        controller = self._manager.get_role_controller(self._plant_id, "battery")
        if controller is None:
            return False
        return bool(controller.current_evaluation.low_battery.available)

    @property
    def is_on(self) -> bool | None:
        controller = self._manager.get_role_controller(self._plant_id, "battery")
        if controller is None:
            return None
        result = controller.current_evaluation.low_battery
        if not result.available:
            return None
        return bool(result.low_battery)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        controller = self._manager.get_role_controller(self._plant_id, "battery")
        if controller is None:
            return {}
        result = controller.current_evaluation.low_battery
        return {
            "confidence": result.confidence,
            "reason": result.reason,
            "threshold_percent": result.threshold_percent,
            "clear_percent": result.clear_percent,
        }


class _TemperatureStressBinary(SmartPlantsBinarySensorEntity):
    _attr_translation_key = ROLE_TEMPERATURE_STRESS
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(
            manager,
            plant_id,
            ROLE_TEMPERATURE_STRESS,
            ROLE_TEMPERATURE_STRESS,
        )
        self._unsub_controller: Any = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._attach_controller_listener()

    async def async_will_remove_from_hass(self) -> None:
        self._detach_controller_listener()
        await super().async_will_remove_from_hass()

    def _attach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            return
        controller = self._manager.get_role_controller(self._plant_id, "temperature")
        if controller is None:
            return
        self._unsub_controller = controller.add_listener(self._on_evaluation)

    def _detach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            self._unsub_controller()
            self._unsub_controller = None

    def _on_evaluation(self) -> None:
        self.async_write_ha_state()

    def _on_plant_disabled(self) -> None:
        self._detach_controller_listener()

    def _on_plant_reenabled(self) -> None:
        self._attach_controller_listener()

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        controller = self._manager.get_role_controller(self._plant_id, "temperature")
        if controller is None:
            return False
        return bool(controller.current_evaluation.temperature_stress.available)

    @property
    def is_on(self) -> bool | None:
        controller = self._manager.get_role_controller(self._plant_id, "temperature")
        if controller is None:
            return None
        result = controller.current_evaluation.temperature_stress
        if not result.available:
            return None
        return bool(result.temperature_stress)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        controller = self._manager.get_role_controller(self._plant_id, "temperature")
        if controller is None:
            return {}
        result = controller.current_evaluation.temperature_stress
        return {
            "confidence": result.confidence,
            "reason": result.reason,
            "cold_threshold_celsius": result.cold_threshold_celsius,
            "cold_clear_celsius": result.cold_clear_celsius,
            "hot_threshold_celsius": result.hot_threshold_celsius,
            "hot_clear_celsius": result.hot_clear_celsius,
        }


class _HumidityStressBinary(SmartPlantsBinarySensorEntity):
    _attr_translation_key = ROLE_HUMIDITY_STRESS
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(
            manager,
            plant_id,
            ROLE_HUMIDITY_STRESS,
            ROLE_HUMIDITY_STRESS,
        )
        self._unsub_controller: Any = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._attach_controller_listener()

    async def async_will_remove_from_hass(self) -> None:
        self._detach_controller_listener()
        await super().async_will_remove_from_hass()

    def _attach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            return
        controller = self._manager.get_role_controller(self._plant_id, "humidity")
        if controller is None:
            return
        self._unsub_controller = controller.add_listener(self._on_evaluation)

    def _detach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            self._unsub_controller()
            self._unsub_controller = None

    def _on_evaluation(self) -> None:
        self.async_write_ha_state()

    def _on_plant_disabled(self) -> None:
        self._detach_controller_listener()

    def _on_plant_reenabled(self) -> None:
        self._attach_controller_listener()

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        controller = self._manager.get_role_controller(self._plant_id, "humidity")
        if controller is None:
            return False
        return bool(controller.current_evaluation.humidity_stress.available)

    @property
    def is_on(self) -> bool | None:
        controller = self._manager.get_role_controller(self._plant_id, "humidity")
        if controller is None:
            return None
        result = controller.current_evaluation.humidity_stress
        if not result.available:
            return None
        return bool(result.humidity_stress)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        controller = self._manager.get_role_controller(self._plant_id, "humidity")
        if controller is None:
            return {}
        result = controller.current_evaluation.humidity_stress
        return {
            "confidence": result.confidence,
            "reason": result.reason,
            "dry_threshold_percent": result.dry_threshold_percent,
            "dry_clear_percent": result.dry_clear_percent,
            "damp_threshold_percent": result.damp_threshold_percent,
            "damp_clear_percent": result.damp_clear_percent,
        }


class _SoilTemperatureStressBinary(SmartPlantsBinarySensorEntity):
    _attr_translation_key = ROLE_SOIL_TEMPERATURE_STRESS
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(
            manager,
            plant_id,
            ROLE_SOIL_TEMPERATURE_STRESS,
            ROLE_SOIL_TEMPERATURE_STRESS,
        )
        self._unsub_controller: Any = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._attach_controller_listener()

    async def async_will_remove_from_hass(self) -> None:
        self._detach_controller_listener()
        await super().async_will_remove_from_hass()

    def _attach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            return
        controller = self._manager.get_role_controller(
            self._plant_id, "soil_temperature"
        )
        if controller is None:
            return
        self._unsub_controller = controller.add_listener(self._on_evaluation)

    def _detach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            self._unsub_controller()
            self._unsub_controller = None

    def _on_evaluation(self) -> None:
        self.async_write_ha_state()

    def _on_plant_disabled(self) -> None:
        self._detach_controller_listener()

    def _on_plant_reenabled(self) -> None:
        self._attach_controller_listener()

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        controller = self._manager.get_role_controller(
            self._plant_id, "soil_temperature"
        )
        if controller is None:
            return False
        return bool(controller.current_evaluation.soil_temperature_stress.available)

    @property
    def is_on(self) -> bool | None:
        controller = self._manager.get_role_controller(
            self._plant_id, "soil_temperature"
        )
        if controller is None:
            return None
        result = controller.current_evaluation.soil_temperature_stress
        if not result.available:
            return None
        return bool(result.soil_temperature_stress)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        controller = self._manager.get_role_controller(
            self._plant_id, "soil_temperature"
        )
        if controller is None:
            return {}
        result = controller.current_evaluation.soil_temperature_stress
        return {
            "confidence": result.confidence,
            "reason": result.reason,
            "cold_threshold_celsius": result.cold_threshold_celsius,
            "cold_clear_celsius": result.cold_clear_celsius,
            "hot_threshold_celsius": result.hot_threshold_celsius,
            "hot_clear_celsius": result.hot_clear_celsius,
        }


class _Co2StressBinary(SmartPlantsBinarySensorEntity):
    _attr_translation_key = ROLE_CO2_STRESS
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_CO2_STRESS, ROLE_CO2_STRESS)
        self._unsub_controller: Any = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._attach_controller_listener()

    async def async_will_remove_from_hass(self) -> None:
        self._detach_controller_listener()
        await super().async_will_remove_from_hass()

    def _attach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            return
        controller = self._manager.get_role_controller(self._plant_id, "co2")
        if controller is None:
            return
        self._unsub_controller = controller.add_listener(self._on_evaluation)

    def _detach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            self._unsub_controller()
            self._unsub_controller = None

    def _on_evaluation(self) -> None:
        self.async_write_ha_state()

    def _on_plant_disabled(self) -> None:
        self._detach_controller_listener()

    def _on_plant_reenabled(self) -> None:
        self._attach_controller_listener()

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        controller = self._manager.get_role_controller(self._plant_id, "co2")
        if controller is None:
            return False
        return bool(controller.current_evaluation.co2_stress.available)

    @property
    def is_on(self) -> bool | None:
        controller = self._manager.get_role_controller(self._plant_id, "co2")
        if controller is None:
            return None
        result = controller.current_evaluation.co2_stress
        if not result.available:
            return None
        return bool(result.co2_stress)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        controller = self._manager.get_role_controller(self._plant_id, "co2")
        if controller is None:
            return {}
        result = controller.current_evaluation.co2_stress
        return {
            "confidence": result.confidence,
            "reason": result.reason,
            "threshold_ppm": result.threshold_ppm,
            "clear_ppm": result.clear_ppm,
        }


class _ConductivityStressBinary(SmartPlantsBinarySensorEntity):
    _attr_translation_key = ROLE_CONDUCTIVITY_STRESS
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(
            manager,
            plant_id,
            ROLE_CONDUCTIVITY_STRESS,
            ROLE_CONDUCTIVITY_STRESS,
        )
        self._unsub_controller: Any = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._attach_controller_listener()

    async def async_will_remove_from_hass(self) -> None:
        self._detach_controller_listener()
        await super().async_will_remove_from_hass()

    def _attach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            return
        controller = self._manager.get_role_controller(self._plant_id, "conductivity")
        if controller is None:
            return
        self._unsub_controller = controller.add_listener(self._on_evaluation)

    def _detach_controller_listener(self) -> None:
        if self._unsub_controller is not None:
            self._unsub_controller()
            self._unsub_controller = None

    def _on_evaluation(self) -> None:
        self.async_write_ha_state()

    def _on_plant_disabled(self) -> None:
        self._detach_controller_listener()

    def _on_plant_reenabled(self) -> None:
        self._attach_controller_listener()

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        controller = self._manager.get_role_controller(self._plant_id, "conductivity")
        if controller is None:
            return False
        return bool(controller.current_evaluation.conductivity_stress.available)

    @property
    def is_on(self) -> bool | None:
        controller = self._manager.get_role_controller(self._plant_id, "conductivity")
        if controller is None:
            return None
        result = controller.current_evaluation.conductivity_stress
        if not result.available:
            return None
        return bool(result.conductivity_stress)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        controller = self._manager.get_role_controller(self._plant_id, "conductivity")
        if controller is None:
            return {}
        result = controller.current_evaluation.conductivity_stress
        return {
            "confidence": result.confidence,
            "reason": result.reason,
            "low_threshold_micro_siemens_per_cm": (
                result.low_threshold_micro_siemens_per_cm
            ),
            "low_clear_micro_siemens_per_cm": (result.low_clear_micro_siemens_per_cm),
            "high_threshold_micro_siemens_per_cm": (
                result.high_threshold_micro_siemens_per_cm
            ),
            "high_clear_micro_siemens_per_cm": (result.high_clear_micro_siemens_per_cm),
        }


def _factory_needs_water(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _NeedsWaterBinary(manager, plant.id)


def _factory_too_wet(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _TooWetBinary(manager, plant.id)


def _factory_sensor_stale(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _SensorStaleBinary(manager, plant.id)


def _factory_low_light(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _LowLightBinary(manager, plant.id)


def _factory_low_battery(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _LowBatteryBinary(manager, plant.id)


def _factory_temperature_stress(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _TemperatureStressBinary(manager, plant.id)


def _factory_humidity_stress(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _HumidityStressBinary(manager, plant.id)


def _factory_soil_temperature_stress(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _SoilTemperatureStressBinary(manager, plant.id)


def _factory_co2_stress(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _Co2StressBinary(manager, plant.id)


def _factory_conductivity_stress(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _ConductivityStressBinary(manager, plant.id)


def _factory_role(
    manager: SmartPlantsManager,
    plant: PlantRecord,
    _definition: RoleDefinition,
    entity: EntityRole,
) -> SmartPlantsEntity:
    factories: dict[str, EntityFactory] = {
        "needs_water": _factory_needs_water,
        "too_wet": _factory_too_wet,
        "sensor_stale": _factory_sensor_stale,
        "low_light": _factory_low_light,
        "low_battery": _factory_low_battery,
        "temperature_stress": _factory_temperature_stress,
        "humidity_stress": _factory_humidity_stress,
        "soil_temperature_stress": _factory_soil_temperature_stress,
        "co2_stress": _factory_co2_stress,
        "conductivity_stress": _factory_conductivity_stress,
    }
    return factories[entity.result_attribute or ""](manager, plant)


ROLE_FACTORIES = entity_factories(PLATFORM)


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
