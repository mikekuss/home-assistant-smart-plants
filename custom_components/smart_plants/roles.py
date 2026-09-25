"""Registered monitoring-role contracts and metadata."""

from __future__ import annotations

from collections.abc import Callable, Iterator, Mapping
from contextlib import contextmanager
from dataclasses import dataclass
from importlib import import_module
from types import MappingProxyType
from typing import TYPE_CHECKING, Any, Protocol

from homeassistant.core import State

from .models import (
    BATTERY_AGGREGATIONS,
    CO2_AGGREGATIONS,
    CO2_STRESS_BUILTIN_DEFAULTS,
    CO2_STRESS_OVERRIDE_KEYS,
    CONDUCTIVITY_AGGREGATIONS,
    CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS,
    CONDUCTIVITY_STRESS_OVERRIDE_KEYS,
    HUMIDITY_AGGREGATIONS,
    HUMIDITY_STRESS_BUILTIN_DEFAULTS,
    HUMIDITY_STRESS_OVERRIDE_KEYS,
    ILLUMINANCE_AGGREGATIONS,
    LOW_BATTERY_BUILTIN_DEFAULTS,
    LOW_BATTERY_OVERRIDE_KEYS,
    LOW_LIGHT_BUILTIN_DEFAULTS,
    LOW_LIGHT_OVERRIDE_KEYS,
    MAX_STALE_AFTER_SECONDS,
    MIN_STALE_AFTER_SECONDS,
    MOISTURE_AGGREGATIONS,
    SOIL_TEMPERATURE_AGGREGATIONS,
    SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
    SOIL_TEMPERATURE_STRESS_OVERRIDE_KEYS,
    TEMPERATURE_AGGREGATIONS,
    TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
    TEMPERATURE_STRESS_OVERRIDE_KEYS,
    BatteryConfig,
    Co2Config,
    ConductivityConfig,
    HumidityConfig,
    IlluminanceConfig,
    MoistureConfig,
    SoilTemperatureConfig,
    TemperatureConfig,
    ThresholdDefault,
    require_co2_stress_threshold,
    require_conductivity_stress_threshold,
    require_humidity_stress_threshold,
    require_low_battery_threshold,
    require_low_light_threshold,
    require_moisture_threshold,
    require_soil_temperature_stress_threshold,
    require_temperature_stress_threshold,
    validate_co2_stress_threshold_order,
    validate_conductivity_stress_threshold_order,
    validate_humidity_stress_threshold_order,
    validate_low_battery_threshold_order,
    validate_low_light_threshold_order,
    validate_moisture_threshold_order,
    validate_soil_temperature_stress_threshold_order,
    validate_temperature_stress_threshold_order,
)

if TYPE_CHECKING:
    from .entity import EntityFactory, SmartPlantsEntity
    from .manager import SmartPlantsManager
    from .models import PlantRecord


class RoleController(Protocol):
    """Runtime controller lifecycle required by the manager."""

    def start(self) -> None: ...
    def stop(self) -> None: ...
    def close(self) -> None: ...
    def reconfigure(self, config: Any) -> None: ...


class MeasurementAdapter(Protocol):
    """Role-owned state normalization boundary used by SourceTracker."""

    def is_valid(self, state: State) -> bool: ...


@dataclass(frozen=True, slots=True)
class ThresholdRole:
    key: str
    entity_role: str
    translation_key: str


@dataclass(frozen=True, slots=True)
class EntityRole:
    role: str
    platform: str
    translation_key: str
    factory: str
    result_attribute: str | None = None


@dataclass(frozen=True, slots=True)
class RoleDefinition:
    """Everything runtime code needs to activate one monitoring role."""

    key: str
    config_type: type[Any]
    default_config: Callable[[], Any]
    controller_factory: Callable[[Any, str, Any, MeasurementAdapter], RoleController]
    measurement_adapter: MeasurementAdapter
    aggregations: frozenset[str]
    source_domain: str
    thresholds: tuple[ThresholdRole, ...]
    entities: tuple[EntityRole, ...]
    # Moisture is the plant's core role: its entities are always created so the
    # accepted Phase 2-6 moisture-only guarantees hold even with no sources. The
    # seven Phase 7 roles are opt-in: their entities are created only once the
    # role has had at least one source (see the entity-lifecycle contract).
    always_present: bool = False
    parse_config: Callable[[object], Any] | None = None
    serialize_config: Callable[[Any], object] | None = None
    replace_sources: Callable[[Any, tuple[Any, ...], str | None], Any] | None = None
    replace_aggregation: Callable[[Any, str], Any] | None = None
    replace_stale_after: Callable[[Any, int], Any] | None = None
    stale_after_range: tuple[int, int] | None = None
    apply_threshold_overrides: Callable[[Any, Mapping[str, object]], Any] | None = None
    apply_threshold_defaults: Callable[[Any, Mapping[str, object]], Any] | None = None

    def config_for(self, plant: PlantRecord) -> Any | None:
        configured = plant.role_config(self.key)
        return self.default_config() if configured is None else configured


class _MoistureMeasurementAdapter:
    def is_valid(self, state: State) -> bool:
        from .moisture_evaluator import parse_measurement  # noqa: PLC0415

        return (
            parse_measurement(state.state, state.attributes.get("unit_of_measurement"))
            is not None
        )


class _TemperatureMeasurementAdapter:
    def is_valid(self, state: State) -> bool:
        from .temperature_evaluator import parse_temperature  # noqa: PLC0415

        return (
            parse_temperature(state.state, state.attributes.get("unit_of_measurement"))
            is not None
        )


class _HumidityMeasurementAdapter:
    def is_valid(self, state: State) -> bool:
        from .humidity_evaluator import parse_humidity  # noqa: PLC0415

        return (
            parse_humidity(state.state, state.attributes.get("unit_of_measurement"))
            is not None
        )


class _IlluminanceMeasurementAdapter:
    def is_valid(self, state: State) -> bool:
        from .illuminance_evaluator import parse_illuminance  # noqa: PLC0415

        return (
            parse_illuminance(state.state, state.attributes.get("unit_of_measurement"))
            is not None
        )


class _BatteryMeasurementAdapter:
    def is_valid(self, state: State) -> bool:
        from .battery_evaluator import parse_battery  # noqa: PLC0415

        return (
            parse_battery(state.state, state.attributes.get("unit_of_measurement"))
            is not None
        )


class _ConductivityMeasurementAdapter:
    def is_valid(self, state: State) -> bool:
        from .conductivity_evaluator import parse_conductivity  # noqa: PLC0415

        return (
            parse_conductivity(state.state, state.attributes.get("unit_of_measurement"))
            is not None
        )


class _SoilTemperatureMeasurementAdapter:
    def is_valid(self, state: State) -> bool:
        from .soil_temperature_evaluator import parse_soil_temperature  # noqa: PLC0415

        return (
            parse_soil_temperature(
                state.state, state.attributes.get("unit_of_measurement")
            )
            is not None
        )


class _Co2MeasurementAdapter:
    def is_valid(self, state: State) -> bool:
        from .co2_evaluator import parse_co2  # noqa: PLC0415

        return (
            parse_co2(state.state, state.attributes.get("unit_of_measurement"))
            is not None
        )


def _moisture_controller_factory(
    hass: Any,
    plant_id: str,
    config: Any,
    adapter: MeasurementAdapter,
) -> RoleController:
    from .moisture_controller import MoisturePlantController  # noqa: PLC0415

    return MoisturePlantController(hass, plant_id, config, adapter=adapter)


def _temperature_controller_factory(
    hass: Any,
    plant_id: str,
    config: Any,
    adapter: MeasurementAdapter,
) -> RoleController:
    from .temperature_controller import TemperaturePlantController  # noqa: PLC0415

    return TemperaturePlantController(hass, plant_id, config, adapter=adapter)


def _humidity_controller_factory(
    hass: Any,
    plant_id: str,
    config: Any,
    adapter: MeasurementAdapter,
) -> RoleController:
    from .humidity_controller import HumidityPlantController  # noqa: PLC0415

    return HumidityPlantController(hass, plant_id, config, adapter=adapter)


def _illuminance_controller_factory(
    hass: Any,
    plant_id: str,
    config: Any,
    adapter: MeasurementAdapter,
) -> RoleController:
    from .illuminance_controller import IlluminancePlantController  # noqa: PLC0415

    return IlluminancePlantController(hass, plant_id, config, adapter=adapter)


def _battery_controller_factory(
    hass: Any,
    plant_id: str,
    config: Any,
    adapter: MeasurementAdapter,
) -> RoleController:
    from .battery_controller import BatteryPlantController  # noqa: PLC0415

    return BatteryPlantController(hass, plant_id, config, adapter=adapter)


def _conductivity_controller_factory(
    hass: Any,
    plant_id: str,
    config: Any,
    adapter: MeasurementAdapter,
) -> RoleController:
    from .conductivity_controller import ConductivityPlantController  # noqa: PLC0415

    return ConductivityPlantController(hass, plant_id, config, adapter=adapter)


def _soil_temperature_controller_factory(
    hass: Any,
    plant_id: str,
    config: Any,
    adapter: MeasurementAdapter,
) -> RoleController:
    from .soil_temperature_controller import (  # noqa: PLC0415
        SoilTemperaturePlantController,
    )

    return SoilTemperaturePlantController(hass, plant_id, config, adapter=adapter)


def _co2_controller_factory(
    hass: Any,
    plant_id: str,
    config: Any,
    adapter: MeasurementAdapter,
) -> RoleController:
    from .co2_controller import Co2PlantController  # noqa: PLC0415

    return Co2PlantController(hass, plant_id, config, adapter=adapter)


def _apply_moisture_overrides(
    config: MoistureConfig, values: Mapping[str, object]
) -> MoistureConfig:
    from dataclasses import replace  # noqa: PLC0415

    expected = {threshold.key for threshold in MOISTURE_THRESHOLDS}
    if set(values) != expected:
        raise ValueError("moisture overrides must contain min, target, and max")
    overrides = {
        key: None
        if value is None
        else require_moisture_threshold(value, f"moisture_{key}")
        for key, value in values.items()
    }
    candidate = replace(config, threshold_overrides=overrides)
    validate_moisture_threshold_order(
        candidate.moisture_min, candidate.moisture_target, candidate.moisture_max
    )
    return candidate


def _apply_moisture_defaults(
    config: MoistureConfig, values: Mapping[str, object]
) -> MoistureConfig:
    from dataclasses import replace  # noqa: PLC0415

    expected = {threshold.key for threshold in MOISTURE_THRESHOLDS}
    if set(values) != expected:
        raise ValueError("moisture defaults must contain min, target, and max")
    defaults = {
        key: ThresholdDefault.from_storage(value, f"moisture threshold default {key}")
        for key, value in values.items()
    }
    candidate = replace(config, threshold_defaults=defaults)
    validate_moisture_threshold_order(
        candidate.moisture_min, candidate.moisture_target, candidate.moisture_max
    )
    return candidate


def _replace_moisture_sources(
    config: MoistureConfig, sources: tuple[Any, ...], primary: str | None
) -> MoistureConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, sources=sources, primary_entity_id=primary)


def _replace_moisture_aggregation(
    config: MoistureConfig, aggregation: str
) -> MoistureConfig:
    from dataclasses import replace  # noqa: PLC0415
    from typing import cast  # noqa: PLC0415

    return replace(config, aggregation=cast("Any", aggregation))


def _replace_moisture_stale_after(
    config: MoistureConfig, stale_after_seconds: int
) -> MoistureConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, stale_after_seconds=stale_after_seconds)


def _replace_temperature_sources(
    config: TemperatureConfig, sources: tuple[Any, ...], primary: str | None
) -> TemperatureConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, sources=sources, primary_entity_id=primary)


def _replace_temperature_aggregation(
    config: TemperatureConfig, aggregation: str
) -> TemperatureConfig:
    from dataclasses import replace  # noqa: PLC0415
    from typing import cast  # noqa: PLC0415

    return replace(config, aggregation=cast("Any", aggregation))


def _replace_temperature_stale_after(
    config: TemperatureConfig, stale_after_seconds: int
) -> TemperatureConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, stale_after_seconds=stale_after_seconds)


def _apply_temperature_stress_overrides(
    config: TemperatureConfig, values: Mapping[str, object]
) -> TemperatureConfig:
    from dataclasses import replace  # noqa: PLC0415

    expected = set(TEMPERATURE_STRESS_OVERRIDE_KEYS)
    if set(values) != expected:
        raise ValueError(
            "temperature stress overrides must contain "
            "cold_threshold_celsius, cold_clear_celsius, "
            "hot_threshold_celsius, and hot_clear_celsius"
        )
    overrides: dict[str, float | None] = {}
    for key in TEMPERATURE_STRESS_OVERRIDE_KEYS:
        value = values[key]
        overrides[key] = (
            None
            if value is None
            else require_temperature_stress_threshold(
                value, f"temperature stress override {key}"
            )
        )
    builtins = TEMPERATURE_STRESS_BUILTIN_DEFAULTS
    effective: dict[str, float] = {
        key: (
            builtins[key] if overrides[key] is None else float(overrides[key])  # type: ignore[arg-type]
        )
        for key in TEMPERATURE_STRESS_OVERRIDE_KEYS
    }
    validate_temperature_stress_threshold_order(
        effective["cold_threshold_celsius"],
        effective["cold_clear_celsius"],
        effective["hot_clear_celsius"],
        effective["hot_threshold_celsius"],
    )
    return replace(config, stress_threshold_overrides=overrides)


def _apply_humidity_stress_overrides(
    config: HumidityConfig, values: Mapping[str, object]
) -> HumidityConfig:
    from dataclasses import replace  # noqa: PLC0415

    expected = set(HUMIDITY_STRESS_OVERRIDE_KEYS)
    if set(values) != expected:
        raise ValueError(
            "humidity stress overrides must contain "
            "dry_threshold_percent, dry_clear_percent, "
            "damp_threshold_percent, and damp_clear_percent"
        )
    overrides: dict[str, float | None] = {}
    for key in HUMIDITY_STRESS_OVERRIDE_KEYS:
        value = values[key]
        overrides[key] = (
            None
            if value is None
            else require_humidity_stress_threshold(
                value, f"humidity stress override {key}"
            )
        )
    builtins = HUMIDITY_STRESS_BUILTIN_DEFAULTS
    effective: dict[str, float] = {
        key: (builtins[key] if overrides[key] is None else float(overrides[key]))  # type: ignore[arg-type]
        for key in HUMIDITY_STRESS_OVERRIDE_KEYS
    }
    validate_humidity_stress_threshold_order(
        effective["dry_threshold_percent"],
        effective["dry_clear_percent"],
        effective["damp_clear_percent"],
        effective["damp_threshold_percent"],
    )
    return replace(config, stress_threshold_overrides=overrides)


def _apply_low_light_overrides(
    config: IlluminanceConfig, values: Mapping[str, object]
) -> IlluminanceConfig:
    from dataclasses import replace  # noqa: PLC0415

    expected = set(LOW_LIGHT_OVERRIDE_KEYS)
    if set(values) != expected:
        raise ValueError("low_light overrides must contain target_lux and clear_lux")
    overrides: dict[str, float | None] = {}
    for key in LOW_LIGHT_OVERRIDE_KEYS:
        value = values[key]
        overrides[key] = (
            None
            if value is None
            else require_low_light_threshold(value, f"low_light override {key}")
        )
    builtins = LOW_LIGHT_BUILTIN_DEFAULTS
    effective: dict[str, float] = {
        key: (builtins[key] if overrides[key] is None else float(overrides[key]))  # type: ignore[arg-type]
        for key in LOW_LIGHT_OVERRIDE_KEYS
    }
    validate_low_light_threshold_order(effective["target_lux"], effective["clear_lux"])
    return replace(config, stress_threshold_overrides=overrides)


def _apply_low_battery_overrides(
    config: BatteryConfig, values: Mapping[str, object]
) -> BatteryConfig:
    from dataclasses import replace  # noqa: PLC0415

    expected = set(LOW_BATTERY_OVERRIDE_KEYS)
    if set(values) != expected:
        raise ValueError(
            "low_battery overrides must contain threshold_percent and clear_percent"
        )
    overrides: dict[str, int | None] = {}
    for key in LOW_BATTERY_OVERRIDE_KEYS:
        value = values[key]
        overrides[key] = (
            None
            if value is None
            else require_low_battery_threshold(value, f"low_battery override {key}")
        )
    builtins = LOW_BATTERY_BUILTIN_DEFAULTS
    effective: dict[str, int] = {
        key: (builtins[key] if overrides[key] is None else int(overrides[key]))  # type: ignore[arg-type]
        for key in LOW_BATTERY_OVERRIDE_KEYS
    }
    validate_low_battery_threshold_order(
        effective["threshold_percent"], effective["clear_percent"]
    )
    return replace(config, stress_threshold_overrides=overrides)


def _apply_conductivity_stress_overrides(
    config: ConductivityConfig, values: Mapping[str, object]
) -> ConductivityConfig:
    from dataclasses import replace  # noqa: PLC0415

    expected = set(CONDUCTIVITY_STRESS_OVERRIDE_KEYS)
    if set(values) != expected:
        raise ValueError(
            "conductivity stress overrides must contain "
            "low_threshold_micro_siemens_per_cm, "
            "low_clear_micro_siemens_per_cm, "
            "high_threshold_micro_siemens_per_cm, and "
            "high_clear_micro_siemens_per_cm"
        )
    overrides: dict[str, float | None] = {}
    for key in CONDUCTIVITY_STRESS_OVERRIDE_KEYS:
        value = values[key]
        overrides[key] = (
            None
            if value is None
            else require_conductivity_stress_threshold(
                value, f"conductivity stress override {key}"
            )
        )
    builtins = CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS
    effective: dict[str, float] = {
        key: (builtins[key] if overrides[key] is None else float(overrides[key]))  # type: ignore[arg-type]
        for key in CONDUCTIVITY_STRESS_OVERRIDE_KEYS
    }
    validate_conductivity_stress_threshold_order(
        effective["low_threshold_micro_siemens_per_cm"],
        effective["low_clear_micro_siemens_per_cm"],
        effective["high_clear_micro_siemens_per_cm"],
        effective["high_threshold_micro_siemens_per_cm"],
    )
    return replace(config, stress_threshold_overrides=overrides)


def _apply_soil_temperature_stress_overrides(
    config: SoilTemperatureConfig, values: Mapping[str, object]
) -> SoilTemperatureConfig:
    from dataclasses import replace  # noqa: PLC0415

    expected = set(SOIL_TEMPERATURE_STRESS_OVERRIDE_KEYS)
    if set(values) != expected:
        raise ValueError(
            "soil_temperature stress overrides must contain "
            "cold_threshold_celsius, cold_clear_celsius, "
            "hot_threshold_celsius, and hot_clear_celsius"
        )
    overrides: dict[str, float | None] = {}
    for key in SOIL_TEMPERATURE_STRESS_OVERRIDE_KEYS:
        value = values[key]
        overrides[key] = (
            None
            if value is None
            else require_soil_temperature_stress_threshold(
                value, f"soil_temperature stress override {key}"
            )
        )
    builtins = SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS
    effective: dict[str, float] = {
        key: (builtins[key] if overrides[key] is None else float(overrides[key]))  # type: ignore[arg-type]
        for key in SOIL_TEMPERATURE_STRESS_OVERRIDE_KEYS
    }
    validate_soil_temperature_stress_threshold_order(
        effective["cold_threshold_celsius"],
        effective["cold_clear_celsius"],
        effective["hot_clear_celsius"],
        effective["hot_threshold_celsius"],
    )
    return replace(config, stress_threshold_overrides=overrides)


def _apply_co2_stress_overrides(
    config: Co2Config, values: Mapping[str, object]
) -> Co2Config:
    from dataclasses import replace  # noqa: PLC0415

    expected = set(CO2_STRESS_OVERRIDE_KEYS)
    if set(values) != expected:
        raise ValueError(
            "co2 stress overrides must contain threshold_ppm and clear_ppm"
        )
    overrides: dict[str, int | None] = {}
    for key in CO2_STRESS_OVERRIDE_KEYS:
        value = values[key]
        overrides[key] = (
            None
            if value is None
            else require_co2_stress_threshold(value, f"co2 stress override {key}")
        )
    builtins = CO2_STRESS_BUILTIN_DEFAULTS
    effective: dict[str, int] = {
        key: (builtins[key] if overrides[key] is None else int(overrides[key]))  # type: ignore[arg-type]
        for key in CO2_STRESS_OVERRIDE_KEYS
    }
    validate_co2_stress_threshold_order(
        effective["clear_ppm"], effective["threshold_ppm"]
    )
    return replace(config, stress_threshold_overrides=overrides)


def _replace_humidity_sources(
    config: HumidityConfig, sources: tuple[Any, ...], primary: str | None
) -> HumidityConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, sources=sources, primary_entity_id=primary)


def _replace_humidity_aggregation(
    config: HumidityConfig, aggregation: str
) -> HumidityConfig:
    from dataclasses import replace  # noqa: PLC0415
    from typing import cast  # noqa: PLC0415

    return replace(config, aggregation=cast("Any", aggregation))


def _replace_humidity_stale_after(
    config: HumidityConfig, stale_after_seconds: int
) -> HumidityConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, stale_after_seconds=stale_after_seconds)


def _replace_illuminance_sources(
    config: IlluminanceConfig, sources: tuple[Any, ...], primary: str | None
) -> IlluminanceConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, sources=sources, primary_entity_id=primary)


def _replace_illuminance_aggregation(
    config: IlluminanceConfig, aggregation: str
) -> IlluminanceConfig:
    from dataclasses import replace  # noqa: PLC0415
    from typing import cast  # noqa: PLC0415

    return replace(config, aggregation=cast("Any", aggregation))


def _replace_illuminance_stale_after(
    config: IlluminanceConfig, stale_after_seconds: int
) -> IlluminanceConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, stale_after_seconds=stale_after_seconds)


def _replace_battery_sources(
    config: BatteryConfig, sources: tuple[Any, ...], primary: str | None
) -> BatteryConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, sources=sources, primary_entity_id=primary)


def _replace_battery_aggregation(
    config: BatteryConfig, aggregation: str
) -> BatteryConfig:
    from dataclasses import replace  # noqa: PLC0415
    from typing import cast  # noqa: PLC0415

    return replace(config, aggregation=cast("Any", aggregation))


def _replace_battery_stale_after(
    config: BatteryConfig, stale_after_seconds: int
) -> BatteryConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, stale_after_seconds=stale_after_seconds)


def _replace_conductivity_sources(
    config: ConductivityConfig, sources: tuple[Any, ...], primary: str | None
) -> ConductivityConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, sources=sources, primary_entity_id=primary)


def _replace_conductivity_aggregation(
    config: ConductivityConfig, aggregation: str
) -> ConductivityConfig:
    from dataclasses import replace  # noqa: PLC0415
    from typing import cast  # noqa: PLC0415

    return replace(config, aggregation=cast("Any", aggregation))


def _replace_conductivity_stale_after(
    config: ConductivityConfig, stale_after_seconds: int
) -> ConductivityConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, stale_after_seconds=stale_after_seconds)


def _replace_soil_temperature_sources(
    config: SoilTemperatureConfig, sources: tuple[Any, ...], primary: str | None
) -> SoilTemperatureConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, sources=sources, primary_entity_id=primary)


def _replace_soil_temperature_aggregation(
    config: SoilTemperatureConfig, aggregation: str
) -> SoilTemperatureConfig:
    from dataclasses import replace  # noqa: PLC0415
    from typing import cast  # noqa: PLC0415

    return replace(config, aggregation=cast("Any", aggregation))


def _replace_soil_temperature_stale_after(
    config: SoilTemperatureConfig, stale_after_seconds: int
) -> SoilTemperatureConfig:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, stale_after_seconds=stale_after_seconds)


def _replace_co2_sources(
    config: Co2Config, sources: tuple[Any, ...], primary: str | None
) -> Co2Config:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, sources=sources, primary_entity_id=primary)


def _replace_co2_aggregation(config: Co2Config, aggregation: str) -> Co2Config:
    from dataclasses import replace  # noqa: PLC0415
    from typing import cast  # noqa: PLC0415

    return replace(config, aggregation=cast("Any", aggregation))


def _replace_co2_stale_after(config: Co2Config, stale_after_seconds: int) -> Co2Config:
    from dataclasses import replace  # noqa: PLC0415

    return replace(config, stale_after_seconds=stale_after_seconds)


_ROLES: dict[str, RoleDefinition] = {}


def register_role(definition: RoleDefinition) -> None:
    """Register a role, rejecting metadata collisions and malformed keys."""
    if (
        not definition.key
        or definition.key != definition.key.strip()
        or ":" in definition.key
    ):
        raise ValueError(
            "role key must be non-empty without surrounding whitespace or ':'"
        )
    if definition.key in _ROLES:
        raise ValueError(f"role {definition.key!r} is already registered")
    entity_roles = [entity.role for entity in definition.entities]
    if any(":" in role for role in entity_roles):
        raise ValueError(f"role {definition.key!r} contains ':' in an entity role")
    threshold_roles = [threshold.entity_role for threshold in definition.thresholds]
    if len(entity_roles) != len(set(entity_roles)) or len(threshold_roles) != len(
        set(threshold_roles)
    ):
        raise ValueError(f"role {definition.key!r} contains duplicate entity roles")
    existing_entity_roles = {
        entity.role for registered in _ROLES.values() for entity in registered.entities
    }
    existing_threshold_keys = {
        threshold.key
        for registered in _ROLES.values()
        for threshold in registered.thresholds
    }
    entity_collision = existing_entity_roles.intersection(entity_roles)
    threshold_collision = existing_threshold_keys.intersection(
        threshold.key for threshold in definition.thresholds
    )
    if entity_collision:
        raise ValueError(
            f"role {definition.key!r} reuses entity role {min(entity_collision)!r}"
        )
    if threshold_collision:
        raise ValueError(
            f"role {definition.key!r} reuses threshold key {min(threshold_collision)!r}"
        )
    by_entity_role = {entity.role: entity for entity in definition.entities}
    for threshold in definition.thresholds:
        entity = by_entity_role.get(threshold.entity_role)
        if entity is None or entity.translation_key != threshold.translation_key:
            raise ValueError(
                f"role {definition.key!r} threshold entity metadata is inconsistent"
            )
    _ROLES[definition.key] = definition


def require_role(role: str) -> RoleDefinition:
    """Resolve an external role key, rejecting values runtime cannot interpret."""
    try:
        return _ROLES[role]
    except KeyError as err:
        raise ValueError(f"role {role!r} is not supported") from err


def role_definitions() -> tuple[RoleDefinition, ...]:
    return tuple(_ROLES.values())


def exposed_roles() -> tuple[str, ...]:
    return tuple(_ROLES)


def entity_roles(platform: str) -> tuple[tuple[RoleDefinition, EntityRole], ...]:
    return tuple(
        (definition, entity)
        for definition in _ROLES.values()
        for entity in definition.entities
        if entity.platform == platform
    )


def entity_factories(platform: str) -> dict[str, EntityFactory]:
    """Construct a platform factory table solely from registered metadata."""
    factories: dict[str, EntityFactory] = {}
    for definition, entity in entity_roles(platform):
        module_name, name = entity.factory.split(":", maxsplit=1)
        implementation = getattr(import_module(module_name), name)

        def factory(
            manager: SmartPlantsManager,
            plant: PlantRecord,
            *,
            _definition: RoleDefinition = definition,
            _entity: EntityRole = entity,
            _implementation: Callable[
                [SmartPlantsManager, PlantRecord, RoleDefinition, EntityRole],
                SmartPlantsEntity,
            ] = implementation,
        ) -> SmartPlantsEntity:
            return _implementation(manager, plant, _definition, _entity)

        factories[entity.role] = factory
    return factories


def entity_gating(platform: str) -> dict[str, tuple[str, bool]]:
    """
    Return ``{entity_role: (config_role_key, always_present)}`` for ``platform``.

    Drives the entity-lifecycle gate: an entity whose role is ``always_present``
    (moisture) is always created; every other role's entities are created only
    once the role has had a source (or the entity already exists in the registry).
    """
    return {
        entity.role: (definition.key, definition.always_present)
        for definition, entity in entity_roles(platform)
    }


def source_accepting_roles() -> tuple[str, ...]:
    """Return registered roles that accept sources and are lifecycle-gated."""
    return tuple(
        definition.key
        for definition in _ROLES.values()
        if definition.replace_sources is not None and not definition.always_present
    )


@contextmanager
def temporary_role(definition: RoleDefinition) -> Iterator[None]:
    """Test-only-friendly scoped registration without mutating built-ins."""
    register_role(definition)
    try:
        yield
    finally:
        _ROLES.pop(definition.key, None)


MOISTURE_THRESHOLDS = (
    ThresholdRole("min", "moisture_min", "moisture_min"),
    ThresholdRole("target", "moisture_target", "moisture_target"),
    ThresholdRole("max", "moisture_max", "moisture_max"),
)

register_role(
    RoleDefinition(
        key="moisture",
        always_present=True,
        config_type=MoistureConfig,
        default_config=MoistureConfig,
        controller_factory=_moisture_controller_factory,
        measurement_adapter=_MoistureMeasurementAdapter(),
        aggregations=MOISTURE_AGGREGATIONS,
        source_domain="sensor",
        thresholds=MOISTURE_THRESHOLDS,
        entities=(
            EntityRole(
                "moisture",
                "sensor",
                "moisture",
                "custom_components.smart_plants.sensor:_factory_role",
                "computed_percent",
            ),
            EntityRole(
                "health_score",
                "sensor",
                "health_score",
                "custom_components.smart_plants.sensor:_factory_role",
                "health_score",
            ),
            EntityRole(
                "needs_water",
                "binary_sensor",
                "needs_water",
                "custom_components.smart_plants.binary_sensor:_factory_role",
                "needs_water",
            ),
            EntityRole(
                "too_wet",
                "binary_sensor",
                "too_wet",
                "custom_components.smart_plants.binary_sensor:_factory_role",
                "too_wet",
            ),
            EntityRole(
                "sensor_stale",
                "binary_sensor",
                "sensor_stale",
                "custom_components.smart_plants.binary_sensor:_factory_role",
                "sensor_stale",
            ),
            *(
                EntityRole(
                    threshold.entity_role,
                    "number",
                    threshold.translation_key,
                    "custom_components.smart_plants.number:_factory_role",
                    threshold.key,
                )
                for threshold in MOISTURE_THRESHOLDS
            ),
        ),
        parse_config=MoistureConfig.from_storage,
        serialize_config=lambda config: config.as_storage(),
        replace_sources=_replace_moisture_sources,
        replace_aggregation=_replace_moisture_aggregation,
        replace_stale_after=_replace_moisture_stale_after,
        stale_after_range=(MIN_STALE_AFTER_SECONDS, MAX_STALE_AFTER_SECONDS),
        apply_threshold_overrides=_apply_moisture_overrides,
        apply_threshold_defaults=_apply_moisture_defaults,
    )
)

register_role(
    RoleDefinition(
        key="temperature",
        config_type=TemperatureConfig,
        default_config=TemperatureConfig,
        controller_factory=_temperature_controller_factory,
        measurement_adapter=_TemperatureMeasurementAdapter(),
        aggregations=TEMPERATURE_AGGREGATIONS,
        source_domain="sensor",
        thresholds=(),
        entities=(
            EntityRole(
                "temperature",
                "sensor",
                "temperature",
                "custom_components.smart_plants.sensor:_factory_role",
                "computed_celsius",
            ),
            EntityRole(
                "temperature_stress",
                "binary_sensor",
                "temperature_stress",
                "custom_components.smart_plants.binary_sensor:_factory_role",
                "temperature_stress",
            ),
        ),
        parse_config=TemperatureConfig.from_storage,
        serialize_config=lambda config: config.as_storage(),
        replace_sources=_replace_temperature_sources,
        replace_aggregation=_replace_temperature_aggregation,
        replace_stale_after=_replace_temperature_stale_after,
        stale_after_range=(MIN_STALE_AFTER_SECONDS, MAX_STALE_AFTER_SECONDS),
        apply_threshold_overrides=_apply_temperature_stress_overrides,
    )
)

register_role(
    RoleDefinition(
        key="humidity",
        config_type=HumidityConfig,
        default_config=HumidityConfig,
        controller_factory=_humidity_controller_factory,
        measurement_adapter=_HumidityMeasurementAdapter(),
        aggregations=HUMIDITY_AGGREGATIONS,
        source_domain="sensor",
        thresholds=(),
        entities=(
            EntityRole(
                "humidity",
                "sensor",
                "humidity",
                "custom_components.smart_plants.sensor:_factory_role",
                "computed_humidity_percent",
            ),
            EntityRole(
                "humidity_stress",
                "binary_sensor",
                "humidity_stress",
                "custom_components.smart_plants.binary_sensor:_factory_role",
                "humidity_stress",
            ),
        ),
        parse_config=HumidityConfig.from_storage,
        serialize_config=lambda config: config.as_storage(),
        replace_sources=_replace_humidity_sources,
        replace_aggregation=_replace_humidity_aggregation,
        replace_stale_after=_replace_humidity_stale_after,
        stale_after_range=(MIN_STALE_AFTER_SECONDS, MAX_STALE_AFTER_SECONDS),
        apply_threshold_overrides=_apply_humidity_stress_overrides,
    )
)

register_role(
    RoleDefinition(
        key="illuminance",
        config_type=IlluminanceConfig,
        default_config=IlluminanceConfig,
        controller_factory=_illuminance_controller_factory,
        measurement_adapter=_IlluminanceMeasurementAdapter(),
        aggregations=ILLUMINANCE_AGGREGATIONS,
        source_domain="sensor",
        thresholds=(),
        entities=(
            EntityRole(
                "illuminance",
                "sensor",
                "illuminance",
                "custom_components.smart_plants.sensor:_factory_role",
                "computed_lux",
            ),
            EntityRole(
                "low_light",
                "binary_sensor",
                "low_light",
                "custom_components.smart_plants.binary_sensor:_factory_role",
                "low_light",
            ),
        ),
        parse_config=IlluminanceConfig.from_storage,
        serialize_config=lambda config: config.as_storage(),
        replace_sources=_replace_illuminance_sources,
        replace_aggregation=_replace_illuminance_aggregation,
        replace_stale_after=_replace_illuminance_stale_after,
        stale_after_range=(MIN_STALE_AFTER_SECONDS, MAX_STALE_AFTER_SECONDS),
        apply_threshold_overrides=_apply_low_light_overrides,
    )
)

register_role(
    RoleDefinition(
        key="battery",
        config_type=BatteryConfig,
        default_config=BatteryConfig,
        controller_factory=_battery_controller_factory,
        measurement_adapter=_BatteryMeasurementAdapter(),
        aggregations=BATTERY_AGGREGATIONS,
        source_domain="sensor",
        thresholds=(),
        entities=(
            EntityRole(
                "battery",
                "sensor",
                "battery",
                "custom_components.smart_plants.sensor:_factory_role",
                "computed_battery_percent",
            ),
            EntityRole(
                "low_battery",
                "binary_sensor",
                "low_battery",
                "custom_components.smart_plants.binary_sensor:_factory_role",
                "low_battery",
            ),
        ),
        parse_config=BatteryConfig.from_storage,
        serialize_config=lambda config: config.as_storage(),
        replace_sources=_replace_battery_sources,
        replace_aggregation=_replace_battery_aggregation,
        replace_stale_after=_replace_battery_stale_after,
        stale_after_range=(MIN_STALE_AFTER_SECONDS, MAX_STALE_AFTER_SECONDS),
        apply_threshold_overrides=_apply_low_battery_overrides,
    )
)

register_role(
    RoleDefinition(
        key="conductivity",
        config_type=ConductivityConfig,
        default_config=ConductivityConfig,
        controller_factory=_conductivity_controller_factory,
        measurement_adapter=_ConductivityMeasurementAdapter(),
        aggregations=CONDUCTIVITY_AGGREGATIONS,
        source_domain="sensor",
        thresholds=(),
        entities=(
            EntityRole(
                "conductivity",
                "sensor",
                "conductivity",
                "custom_components.smart_plants.sensor:_factory_role",
                "computed_conductivity",
            ),
            EntityRole(
                "conductivity_stress",
                "binary_sensor",
                "conductivity_stress",
                "custom_components.smart_plants.binary_sensor:_factory_role",
                "conductivity_stress",
            ),
        ),
        parse_config=ConductivityConfig.from_storage,
        serialize_config=lambda config: config.as_storage(),
        replace_sources=_replace_conductivity_sources,
        replace_aggregation=_replace_conductivity_aggregation,
        replace_stale_after=_replace_conductivity_stale_after,
        stale_after_range=(MIN_STALE_AFTER_SECONDS, MAX_STALE_AFTER_SECONDS),
        apply_threshold_overrides=_apply_conductivity_stress_overrides,
    )
)

register_role(
    RoleDefinition(
        key="soil_temperature",
        config_type=SoilTemperatureConfig,
        default_config=SoilTemperatureConfig,
        controller_factory=_soil_temperature_controller_factory,
        measurement_adapter=_SoilTemperatureMeasurementAdapter(),
        aggregations=SOIL_TEMPERATURE_AGGREGATIONS,
        source_domain="sensor",
        thresholds=(),
        entities=(
            EntityRole(
                "soil_temperature",
                "sensor",
                "soil_temperature",
                "custom_components.smart_plants.sensor:_factory_role",
                "computed_soil_temperature_celsius",
            ),
            EntityRole(
                "soil_temperature_stress",
                "binary_sensor",
                "soil_temperature_stress",
                "custom_components.smart_plants.binary_sensor:_factory_role",
                "soil_temperature_stress",
            ),
        ),
        parse_config=SoilTemperatureConfig.from_storage,
        serialize_config=lambda config: config.as_storage(),
        replace_sources=_replace_soil_temperature_sources,
        replace_aggregation=_replace_soil_temperature_aggregation,
        replace_stale_after=_replace_soil_temperature_stale_after,
        stale_after_range=(MIN_STALE_AFTER_SECONDS, MAX_STALE_AFTER_SECONDS),
        apply_threshold_overrides=_apply_soil_temperature_stress_overrides,
    )
)

register_role(
    RoleDefinition(
        key="co2",
        config_type=Co2Config,
        default_config=Co2Config,
        controller_factory=_co2_controller_factory,
        measurement_adapter=_Co2MeasurementAdapter(),
        aggregations=CO2_AGGREGATIONS,
        source_domain="sensor",
        thresholds=(),
        entities=(
            EntityRole(
                "co2",
                "sensor",
                "co2",
                "custom_components.smart_plants.sensor:_factory_role",
                "computed_co2_ppm",
            ),
            EntityRole(
                "co2_stress",
                "binary_sensor",
                "co2_stress",
                "custom_components.smart_plants.binary_sensor:_factory_role",
                "co2_stress",
            ),
        ),
        parse_config=Co2Config.from_storage,
        serialize_config=lambda config: config.as_storage(),
        replace_sources=_replace_co2_sources,
        replace_aggregation=_replace_co2_aggregation,
        replace_stale_after=_replace_co2_stale_after,
        stale_after_range=(MIN_STALE_AFTER_SECONDS, MAX_STALE_AFTER_SECONDS),
        apply_threshold_overrides=_apply_co2_stress_overrides,
    )
)

ROLE_METADATA: Mapping[str, RoleDefinition] = MappingProxyType(_ROLES)
