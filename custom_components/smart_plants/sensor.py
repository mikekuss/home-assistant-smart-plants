"""
Smart Plants ``sensor`` platform.

``ROLE_FACTORIES`` holds the moisture-role sensors:

* ``moisture`` — computed soil moisture percent.
* ``health_score`` — piecewise-linear moisture-only score (0..100).

Both entities become ``unavailable`` when the plant's moisture
evaluation cannot produce a valid computed percent; they never emit a
synthetic healthy value.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.const import (
    PERCENTAGE,
    EntityCategory,
    UnitOfConductivity,
    UnitOfTemperature,
)

from .co2_evaluator import CO2_PARTS_PER_MILLION
from .entity import (
    EntityFactory,
    SmartPlantsEntity,
    async_setup_platform_lifecycle,
)
from .illuminance_evaluator import LIGHT_LUX
from .roles import EntityRole, RoleDefinition, entity_factories

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddEntitiesCallback

    from .health_evaluator import HealthEvaluation
    from .manager import SmartPlantsManager
    from .models import PlantRecord


PLATFORM = "sensor"

ROLE_FACTORIES: dict[str, EntityFactory]

ROLE_MOISTURE = "moisture"
ROLE_HEALTH_SCORE = "health_score"
ROLE_TEMPERATURE = "temperature"
ROLE_HUMIDITY = "humidity"
ROLE_ILLUMINANCE = "illuminance"
ROLE_BATTERY = "battery"
ROLE_CONDUCTIVITY = "conductivity"
ROLE_SOIL_TEMPERATURE = "soil_temperature"
ROLE_CO2 = "co2"


class SmartPlantsSensorEntity(SmartPlantsEntity, SensorEntity):
    """Base for every Smart Plants sensor role."""

    PLATFORM = PLATFORM


class _MoistureControlledSensor(SmartPlantsSensorEntity):
    """Sensor whose value comes from the plant's MoistureController."""

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
        return bool(controller.current_evaluation.computed_available)


class _MoistureSensor(_MoistureControlledSensor):
    _attr_translation_key = ROLE_MOISTURE
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_device_class = SensorDeviceClass.MOISTURE
    _attr_suggested_display_precision = 1
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_MOISTURE)

    @property
    def native_value(self) -> float | None:
        controller = self._manager.get_moisture_controller(self._plant_id)
        if controller is None:
            return None
        result = controller.current_evaluation
        if not result.computed_available or result.computed_percent is None:
            return None
        return float(result.computed_percent)


# Roles that feed the composite health score. Battery is excluded (device
# health, not plant health).
_HEALTH_ROLE_KEYS: tuple[str, ...] = (
    "moisture",
    "temperature",
    "humidity",
    "illuminance",
    "conductivity",
    "soil_temperature",
    "co2",
)


class _HealthScoreSensor(SmartPlantsSensorEntity):
    """Composite plant-health score across every configured role."""

    _attr_translation_key = ROLE_HEALTH_SCORE
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_HEALTH_SCORE, ROLE_HEALTH_SCORE)
        self._unsub_controllers: dict[str, Any] = {}

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._attach_controller_listeners()

    async def async_will_remove_from_hass(self) -> None:
        self._detach_controller_listeners()
        await super().async_will_remove_from_hass()

    def _attach_controller_listeners(self) -> None:
        for role_key in _HEALTH_ROLE_KEYS:
            if role_key in self._unsub_controllers:
                continue
            controller = self._manager.get_role_controller(self._plant_id, role_key)
            if controller is None:
                continue
            self._unsub_controllers[role_key] = controller.add_listener(
                self._on_evaluation
            )

    def _detach_controller_listeners(self) -> None:
        for unsub in list(self._unsub_controllers.values()):
            unsub()
        self._unsub_controllers.clear()

    def _on_evaluation(self) -> None:
        self.async_write_ha_state()

    def _on_plant_disabled(self) -> None:
        self._detach_controller_listeners()

    def _on_plant_reenabled(self) -> None:
        self._attach_controller_listeners()

    def _current_health(self) -> HealthEvaluation | None:
        from .health_evaluator import HealthInputs, evaluate  # noqa: PLC0415
        from .manager import SmartPlantsPlantNotFoundError  # noqa: PLC0415

        try:
            plant = self._manager.get_plant(self._plant_id)
        except SmartPlantsPlantNotFoundError:
            return None
        snapshots: dict[str, Any] = {}
        for role_key in _HEALTH_ROLE_KEYS:
            controller = self._manager.get_role_controller(self._plant_id, role_key)
            snapshots[role_key] = (
                controller.current_evaluation if controller is not None else None
            )
        return evaluate(
            HealthInputs(
                plant=plant,
                moisture=snapshots["moisture"],
                temperature=snapshots["temperature"],
                humidity=snapshots["humidity"],
                illuminance=snapshots["illuminance"],
                conductivity=snapshots["conductivity"],
                soil_temperature=snapshots["soil_temperature"],
                co2=snapshots["co2"],
            )
        )

    @property
    def available(self) -> bool:
        if not super().available:
            return False
        health = self._current_health()
        if health is None:
            return False
        return bool(health.available)

    @property
    def native_value(self) -> int | None:
        health = self._current_health()
        if health is None:
            return None
        return health.health_score

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        health = self._current_health()
        if health is None:
            return {}
        return {
            "confidence": health.confidence,
            "confidence_label": health.confidence_label,
            "contributors": list(health.contributors),
            "configured": list(health.configured),
        }


class _TemperatureSensor(SmartPlantsSensorEntity):
    _attr_translation_key = ROLE_TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_suggested_display_precision = 1
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_TEMPERATURE, ROLE_TEMPERATURE)
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
        return bool(controller.current_evaluation.computed_available)

    @property
    def native_value(self) -> float | None:
        controller = self._manager.get_role_controller(self._plant_id, "temperature")
        if controller is None:
            return None
        result = controller.current_evaluation
        if not result.computed_available or result.computed_celsius is None:
            return None
        return float(result.computed_celsius)


class _HumiditySensor(SmartPlantsSensorEntity):
    _attr_translation_key = ROLE_HUMIDITY
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_device_class = SensorDeviceClass.HUMIDITY
    _attr_suggested_display_precision = 1
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_HUMIDITY, ROLE_HUMIDITY)
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
        return bool(controller.current_evaluation.computed_available)

    @property
    def native_value(self) -> float | None:
        controller = self._manager.get_role_controller(self._plant_id, "humidity")
        if controller is None:
            return None
        result = controller.current_evaluation
        if not result.computed_available or result.computed_percent is None:
            return None
        return float(result.computed_percent)


class _IlluminanceSensor(SmartPlantsSensorEntity):
    _attr_translation_key = ROLE_ILLUMINANCE
    _attr_native_unit_of_measurement = LIGHT_LUX
    _attr_device_class = SensorDeviceClass.ILLUMINANCE
    _attr_suggested_display_precision = 1
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_ILLUMINANCE, ROLE_ILLUMINANCE)
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
        return bool(controller.current_evaluation.computed_available)

    @property
    def native_value(self) -> float | None:
        controller = self._manager.get_role_controller(self._plant_id, "illuminance")
        if controller is None:
            return None
        result = controller.current_evaluation
        if not result.computed_available or result.computed_lux is None:
            return None
        return float(result.computed_lux)


class _BatterySensor(SmartPlantsSensorEntity):
    _attr_translation_key = ROLE_BATTERY
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_device_class = SensorDeviceClass.BATTERY
    _attr_suggested_display_precision = 0
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_BATTERY, ROLE_BATTERY)
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
        return bool(controller.current_evaluation.computed_available)

    @property
    def native_value(self) -> int | None:
        controller = self._manager.get_role_controller(self._plant_id, "battery")
        if controller is None:
            return None
        result = controller.current_evaluation
        if not result.computed_available or result.computed_percent is None:
            return None
        return int(result.computed_percent)


class _ConductivitySensor(SmartPlantsSensorEntity):
    _attr_translation_key = ROLE_CONDUCTIVITY
    # Home Assistant requires a unit it recognizes for device_class=CONDUCTIVITY;
    # emit the canonical HA constant (Greek mu) rather than a raw local spelling.
    _attr_native_unit_of_measurement = UnitOfConductivity.MICROSIEMENS_PER_CM
    _attr_device_class = SensorDeviceClass.CONDUCTIVITY
    _attr_suggested_display_precision = 1
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_CONDUCTIVITY, ROLE_CONDUCTIVITY)
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
        return bool(controller.current_evaluation.computed_available)

    @property
    def native_value(self) -> float | None:
        controller = self._manager.get_role_controller(self._plant_id, "conductivity")
        if controller is None:
            return None
        result = controller.current_evaluation
        if (
            not result.computed_available
            or result.computed_micro_siemens_per_cm is None
        ):
            return None
        return float(result.computed_micro_siemens_per_cm)


class _SoilTemperatureSensor(SmartPlantsSensorEntity):
    _attr_translation_key = ROLE_SOIL_TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_suggested_display_precision = 1
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(
            manager, plant_id, ROLE_SOIL_TEMPERATURE, ROLE_SOIL_TEMPERATURE
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
            self._plant_id, ROLE_SOIL_TEMPERATURE
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
            self._plant_id, ROLE_SOIL_TEMPERATURE
        )
        if controller is None:
            return False
        return bool(controller.current_evaluation.computed_available)

    @property
    def native_value(self) -> float | None:
        controller = self._manager.get_role_controller(
            self._plant_id, ROLE_SOIL_TEMPERATURE
        )
        if controller is None:
            return None
        result = controller.current_evaluation
        if not result.computed_available or result.computed_celsius is None:
            return None
        return float(result.computed_celsius)


class _Co2Sensor(SmartPlantsSensorEntity):
    _attr_translation_key = ROLE_CO2
    _attr_native_unit_of_measurement = CO2_PARTS_PER_MILLION
    _attr_device_class = SensorDeviceClass.CO2
    _attr_suggested_display_precision = 0
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_CO2, ROLE_CO2)
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
        controller = self._manager.get_role_controller(self._plant_id, ROLE_CO2)
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
        controller = self._manager.get_role_controller(self._plant_id, ROLE_CO2)
        if controller is None:
            return False
        return bool(controller.current_evaluation.computed_available)

    @property
    def native_value(self) -> int | None:
        controller = self._manager.get_role_controller(self._plant_id, ROLE_CO2)
        if controller is None:
            return None
        result = controller.current_evaluation
        if not result.computed_available or result.computed_ppm is None:
            return None
        return int(result.computed_ppm)


def _factory_moisture(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _MoistureSensor(manager, plant.id)


def _factory_health_score(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _HealthScoreSensor(manager, plant.id)


def _factory_temperature(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _TemperatureSensor(manager, plant.id)


def _factory_humidity(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _HumiditySensor(manager, plant.id)


def _factory_illuminance(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _IlluminanceSensor(manager, plant.id)


def _factory_battery(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _BatterySensor(manager, plant.id)


def _factory_conductivity(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _ConductivitySensor(manager, plant.id)


def _factory_soil_temperature(
    manager: SmartPlantsManager, plant: PlantRecord
) -> SmartPlantsEntity:
    return _SoilTemperatureSensor(manager, plant.id)


def _factory_co2(manager: SmartPlantsManager, plant: PlantRecord) -> SmartPlantsEntity:
    return _Co2Sensor(manager, plant.id)


def _factory_role(
    manager: SmartPlantsManager,
    plant: PlantRecord,
    _definition: RoleDefinition,
    entity: EntityRole,
) -> SmartPlantsEntity:
    factories: dict[str, EntityFactory] = {
        "computed_percent": _factory_moisture,
        "health_score": _factory_health_score,
        "computed_celsius": _factory_temperature,
        "computed_humidity_percent": _factory_humidity,
        "computed_lux": _factory_illuminance,
        "computed_battery_percent": _factory_battery,
        "computed_conductivity": _factory_conductivity,
        "computed_soil_temperature_celsius": _factory_soil_temperature,
        "computed_co2_ppm": _factory_co2,
    }
    return factories[entity.result_attribute or ""](manager, plant)


# Materialized from the registry after this module's implementation factories
# exist. Tests may extend the table to exercise the shared entity lifecycle.
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
