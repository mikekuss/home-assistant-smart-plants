from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, cast

import pytest
from custom_components.smart_plants.const import (
    STORAGE_KEY,
    STORAGE_MAJOR_VERSION,
    STORAGE_MINOR_VERSION,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.models import PlantRecord
from custom_components.smart_plants.roles import (
    EntityRole,
    RoleDefinition,
    ThresholdRole,
    role_definitions,
    temporary_role,
)
from homeassistant.core import HomeAssistant, State


def _plant_payload() -> dict[str, Any]:
    return {
        "id": "plant-1",
        "revision": 1,
        "name": "Aloe",
        "created_at": "2026-09-05T00:00:00Z",
        "lifecycle_state": "active",
        "acquired_at": None,
        "species": None,
        "placement": None,
        "tags": [],
        "category": None,
        "image": None,
    }


@dataclass(frozen=True)
class _SyntheticConfig:
    marker: str = "default"


class _SyntheticAdapter:
    def is_valid(self, state: State) -> bool:
        return state.state == "synthetic"


class _SyntheticController:
    def __init__(self, config: _SyntheticConfig, calls: list[str]) -> None:
        self.config = config
        self.calls = calls

    def start(self) -> None:
        self.calls.append(f"start:{self.config.marker}")

    def stop(self) -> None:
        self.calls.append("stop")

    def close(self) -> None:
        self.calls.append("close")

    def reconfigure(self, config: Any) -> None:
        self.config = config
        self.calls.append("reconfigure")


async def test_synthetic_role_registers_through_controller_seam(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    calls: list[str] = []

    def controller_factory(
        _hass: Any, _plant_id: str, config: Any, _adapter: Any
    ) -> _SyntheticController:
        return _SyntheticController(config, calls)

    definition = RoleDefinition(
        key="synthetic",
        config_type=_SyntheticConfig,
        default_config=_SyntheticConfig,
        controller_factory=controller_factory,
        measurement_adapter=_SyntheticAdapter(),
        aggregations=frozenset({"primary"}),
        source_domain="sensor",
        thresholds=(),
        entities=(),
        parse_config=lambda raw: _SyntheticConfig(
            cast("dict[str, str]", raw)["marker"]
        ),
        serialize_config=lambda config: {"marker": config.marker},
    )
    payload = _plant_payload()
    payload["roles"] = {
        "moisture": PlantRecord.from_storage(payload).moisture.as_storage(),
        "synthetic": {"marker": "stored"},
    }
    payload["care_events"] = []
    hass_storage[STORAGE_KEY] = {
        "version": STORAGE_MAJOR_VERSION,
        "minor_version": STORAGE_MINOR_VERSION,
        "key": STORAGE_KEY,
        "data": {
            "revision": 1,
            "plants": [payload],
            "pending_operations": [],
            "tombstones": [],
        },
    }

    with temporary_role(definition):
        manager = SmartPlantsManager(hass)
        await manager.async_load()
        assert calls == ["start:stored"]
        assert manager.get_role_controller("plant-1", "synthetic") is not None
        await manager.async_unload()
        assert calls[-1] == "close"


def test_unknown_stored_role_round_trips_opaquely() -> None:
    payload = _plant_payload()
    payload["roles"] = {"future_role": {"schema": 9, "nested": [1, {"future": True}]}}
    plant = PlantRecord.from_storage(payload)
    assert plant.as_storage()["roles"]["future_role"] == payload["roles"]["future_role"]


@pytest.mark.parametrize(
    ("entities", "thresholds", "match"),
    [
        (
            (
                EntityRole(
                    "moisture",
                    "sensor",
                    "synthetic",
                    "example.module:factory",
                ),
            ),
            (),
            "entity role",
        ),
        (
            (
                EntityRole(
                    "synthetic_min",
                    "number",
                    "synthetic_min",
                    "example.module:factory",
                ),
            ),
            (ThresholdRole("min", "synthetic_min", "synthetic_min"),),
            "threshold key",
        ),
    ],
)
def test_cross_role_metadata_collisions_are_rejected(
    entities: tuple[EntityRole, ...],
    thresholds: tuple[ThresholdRole, ...],
    match: str,
) -> None:
    definition = RoleDefinition(
        key="colliding",
        config_type=_SyntheticConfig,
        default_config=_SyntheticConfig,
        controller_factory=lambda *_args: _SyntheticController(_SyntheticConfig(), []),
        measurement_adapter=_SyntheticAdapter(),
        aggregations=frozenset({"primary"}),
        source_domain="sensor",
        thresholds=thresholds,
        entities=entities,
    )
    with pytest.raises(ValueError, match=match), temporary_role(definition):
        pass


def test_registered_entity_translation_keys_exist() -> None:
    component = Path(__file__).parents[1] / "custom_components" / "smart_plants"
    for filename in ("strings.json", "translations/en.json", "translations/de.json"):
        content = json.loads((component / filename).read_text(encoding="utf-8"))
        entity_translations = content["entity"]
        for definition in role_definitions():
            for entity in definition.entities:
                assert entity.translation_key in entity_translations[entity.platform]


async def test_override_clear_restores_attributed_inheritance(
    hass: HomeAssistant,
) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    plant = await manager.async_create_plant(name="Aloe")
    overridden = await manager.async_set_moisture_thresholds(
        plant.id,
        expected_revision=plant.revision,
        moisture_min=20,
        moisture_target=40,
        moisture_max=60,
    )
    refreshed = await manager.async_reconcile_moisture_threshold_defaults(
        plant.id,
        expected_revision=overridden.revision,
        defaults={
            key: {
                "value": value,
                "source": "provider",
                "provider": "example",
                "provider_ref": "species-1",
            }
            for key, value in {"min": 10, "target": 30, "max": 50}.items()
        },
    )
    assert (
        refreshed.moisture.moisture_min,
        refreshed.moisture.moisture_target,
        refreshed.moisture.moisture_max,
    ) == (20, 40, 60)
    inherited = await manager.async_set_moisture_thresholds(
        plant.id,
        expected_revision=refreshed.revision,
        moisture_min=None,
        moisture_target=None,
        moisture_max=None,
    )
    assert dict(inherited.moisture.threshold_overrides) == {
        "min": None,
        "target": None,
        "max": None,
    }
    assert (
        inherited.moisture.moisture_min,
        inherited.moisture.moisture_target,
        inherited.moisture.moisture_max,
    ) == (10, 30, 50)
