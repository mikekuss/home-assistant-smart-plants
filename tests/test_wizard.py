from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from dataclasses import replace
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from custom_components.smart_plants.events import PlantAddedEvent, PlantUpdatedEvent
from custom_components.smart_plants.manager import (
    WIZARD_MAX_AGE,
    WIZARD_MAX_DRAFTS,
    SmartPlantsManager,
    SmartPlantsManagerUnavailableError,
    SmartPlantsRevisionConflictError,
)
from custom_components.smart_plants.models import MoistureConfig, PlantRecord
from custom_components.smart_plants.provider import (
    ManualSpeciesProvider,
    ProviderRegistry,
    SpeciesProfile,
    SpeciesProviderService,
)
from custom_components.smart_plants.repairs import _issue_id
from custom_components.smart_plants.roles import entity_roles
from custom_components.smart_plants.storage import SmartPlantsStorageError
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from .helpers import plant_device
from .test_provider import SyntheticProvider
from .test_websocket_api import _setup


def _moisture(**changes: Any) -> dict[str, Any]:
    values = MoistureConfig().as_storage()
    values.pop("threshold_defaults")
    return {**values, **changes}


def _credentials(draft: dict[str, Any]) -> dict[str, Any]:
    return {
        "draft_id": draft["draft_id"],
        "draft_token": draft["draft_token"],
        "expected_revision": 0,
    }


def _production_entity_role_count() -> int:
    return sum(
        len(entity_roles(platform))
        for platform in ("sensor", "binary_sensor", "number")
    )


def _moisture_entity_role_count() -> int:
    # Only always-present (moisture) role entities exist for a plant whose
    # only configured role is moisture. The seven non-moisture roles create
    # entities lazily once they have a source.
    return sum(
        1
        for platform in ("sensor", "binary_sensor", "number")
        for definition, _entity in entity_roles(platform)
        if definition.key == "moisture"
    )


class ThresholdProvider(SyntheticProvider):
    async def async_get_species(
        self, provider_ref: str, locale: str, *, force_refresh: bool = False
    ) -> SpeciesProfile:
        profile = await super().async_get_species(
            provider_ref, locale, force_refresh=force_refresh
        )
        return SpeciesProfile(
            replace(
                profile.snapshot,
                threshold_defaults={"moisture": {"min": 40, "max": 80}},
                field_sources={
                    **profile.snapshot.field_sources,
                    "moisture_min": profile.snapshot.attribution,
                    "moisture_max": profile.snapshot.attribution,
                },
            )
        )


@pytest.fixture
async def runtime(
    hass: HomeAssistant,
) -> AsyncIterator[tuple[SmartPlantsManager, SpeciesProviderService]]:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    registry = ProviderRegistry()
    registry.register(ManualSpeciesProvider())
    registry.register(ThresholdProvider())
    service = SpeciesProviderService(registry, manager)
    yield manager, service
    await service.async_close()
    await manager.async_unload()


async def _create(
    service: SpeciesProviderService, draft: dict[str, Any], **changes: Any
) -> PlantRecord:
    return await service.async_wizard_create(
        **{
            **_credentials(draft),
            "confirmed": True,
            "name": "Aloe",
            "moisture": _moisture(),
            **changes,
        }
    )


async def _preview(
    service: SpeciesProviderService, draft: dict[str, Any]
) -> dict[str, Any]:
    preview = await service.async_wizard_preview(
        **_credentials(draft), provider="synthetic", provider_ref="test", locale="en"
    )
    return {
        "preview_token": preview.token,
        "provider": preview.provider,
        "operation": preview.operation,
    }


async def test_start_and_preview_have_no_inventory_side_effects(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    manager, service = runtime
    before = manager.snapshot
    events: list[object] = []
    manager.subscribe(events.append)
    with patch.object(manager._store, "async_save", new_callable=AsyncMock) as save:
        draft = manager.wizard_start()
        accepted = await _preview(service, draft)
    save.assert_not_called()
    assert manager.snapshot is before
    assert not manager._controllers
    assert not events
    assert draft["revision"] == 0
    assert draft["expires_in"] == WIZARD_MAX_AGE
    assert accepted["operation"] == "select"


@pytest.mark.parametrize("confirmed", [False, None, 0, 1, "true"])
async def test_confirmation_is_strict_and_required(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
    confirmed: Any,
) -> None:
    manager, service = runtime
    draft = manager.wizard_start()
    with pytest.raises(ValueError, match="confirmed"):
        await _create(service, draft, confirmed=confirmed)
    assert not manager.list_plants()
    assert manager.require_wizard_draft(draft["draft_id"], draft["draft_token"])


@pytest.mark.parametrize("revision", [True, False, 1, -1, 0.0, "0"])
async def test_revision_zero_is_not_a_coercion(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
    revision: Any,
) -> None:
    manager, service = runtime
    draft = manager.wizard_start()
    with pytest.raises(ValueError, match="zero"):
        await _create(service, draft, expected_revision=revision)
    assert not manager.list_plants()


@pytest.mark.parametrize("field", ["draft_id", "draft_token"])
async def test_draft_credentials_cannot_be_mixed(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
    field: str,
) -> None:
    manager, service = runtime
    first, second = manager.wizard_start(), manager.wizard_start()
    first[field] = second[field]
    with pytest.raises(ValueError, match="missing or expired"):
        await _preview(service, first)
    with pytest.raises(ValueError, match="missing or expired"):
        await _create(service, first)
    assert not manager.list_plants()


@pytest.mark.parametrize("binding", ["draft", "provider", "operation", "existing"])
async def test_preview_cannot_cross_identity_or_operation(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
    binding: str,
) -> None:
    manager, service = runtime
    draft = manager.wizard_start()
    accepted = await _preview(service, draft)
    if binding == "draft":
        draft = manager.wizard_start()
    elif binding == "existing":
        plant = await manager.async_create_plant(name="Existing")
        preview = await service.async_preview(
            "synthetic", "test", "en", plant_id=plant.id
        )
        accepted["preview_token"] = preview.token
    else:
        accepted[binding] = "different"
    before = manager.snapshot
    with pytest.raises(ValueError, match="bound"):
        await _create(service, draft, accepted_preview=accepted)
    assert manager.snapshot is before


async def test_provider_defaults_and_overrides_are_one_final_configuration(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    manager, service = runtime
    draft = manager.wizard_start()
    accepted = await _preview(service, draft)
    before = manager.snapshot
    with pytest.raises(ValueError, match="min < target < max"):
        await _create(service, draft, accepted_preview=accepted)
    assert manager.snapshot is before
    assert accepted["preview_token"] in service._previews
    events: list[object] = []
    manager.subscribe(events.append)
    plant = await _create(
        service,
        draft,
        accepted_preview=accepted,
        moisture=_moisture(
            threshold_overrides={"min": None, "target": 60, "max": None}
        ),
    )
    assert plant.revision == 1
    assert plant.species is not None
    assert plant.species.provider == "synthetic"
    assert plant.moisture.moisture_min == 40
    assert plant.moisture.moisture_target == 60
    assert plant.moisture.moisture_max == 80
    assert plant.moisture.threshold_defaults["target"].source == "builtin"
    assert plant.moisture.threshold_defaults["target"].value == 35
    assert plant.moisture.threshold_defaults["min"].provider_ref == "test"
    assert len(events) == 1
    assert isinstance(events[0], PlantAddedEvent)
    assert events[0].plant == plant


@pytest.mark.parametrize(
    "values",
    [
        {"sources": [{"entity_id": "switch.pump"}]},
        {"sources": [{"entity_id": "sensor.bad", "registry_id": "missing"}]},
        {"sources": [{"entity_id": "sensor.a"}] * 2},
        {"sources": [{"entity_id": f"sensor.a{i}"} for i in range(33)]},
        {"sources": {}},
        {"primary_entity_id": "sensor.absent"},
        {"aggregation": "median"},
        {"stale_after_seconds": True},
        {"stale_after_seconds": 1},
        {"stale_after_seconds": 999999999},
        {"threshold_overrides": {"min": 40, "target": 30, "max": 60}},
        {"threshold_overrides": {"min": 30, "target": 31, "max": 32}},
        {"threshold_overrides": {"min": None}},
        {"threshold_overrides": {"min": True, "target": 35, "max": 55}},
        {"threshold_defaults": {}},
    ],
)
async def test_invalid_configuration_never_partially_creates_or_edits(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
    values: dict[str, Any],
) -> None:
    manager, service = runtime
    draft = manager.wizard_start()
    existing = await manager.async_create_plant(name="Existing")
    before = manager.snapshot
    with patch.object(manager._store, "async_save", new_callable=AsyncMock) as save:
        with pytest.raises(ValueError, match=r"moisture|source"):
            await _create(service, draft, moisture=_moisture(**values))
        with pytest.raises(ValueError, match=r"moisture|source"):
            await manager.async_configure_moisture(
                existing.id, expected_revision=1, moisture=_moisture(**values)
            )
    save.assert_not_called()
    assert manager.snapshot is before


async def test_manual_species_and_provider_forgery(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    from custom_components.smart_plants.models import PlantSpecies  # noqa: PLC0415

    manager, service = runtime
    draft = manager.wizard_start()
    profile = await ThresholdProvider().async_get_species("test", "en")
    with pytest.raises(ValueError, match="preview"):
        await _create(
            service, draft, species=PlantSpecies("synthetic", profile.snapshot)
        )
    manual = PlantSpecies(
        "manual",
        ManualSpeciesProvider.profile(
            common_name="Aloe", latin_name=None, category=None
        ).snapshot,
    )
    accepted = await _preview(service, draft)
    with pytest.raises(ValueError, match="choose"):
        await _create(service, draft, species=manual, accepted_preview=accepted)
    plant = await _create(service, draft, species=manual)
    assert plant.species == manual
    assert plant.moisture.threshold_overrides == {
        "min": None,
        "target": None,
        "max": None,
    }


async def test_atomic_source_replacement_canonicalizes_registry_identity(
    hass: HomeAssistant,
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    manager, service = runtime
    registered = er.async_get(hass).async_get_or_create(
        "sensor", "test", "source", suggested_object_id="new"
    )
    plant = await _create(
        service,
        manager.wizard_start(),
        moisture=_moisture(
            sources=[{"entity_id": "sensor.old"}], primary_entity_id="sensor.old"
        ),
    )
    values = _moisture(
        sources=[{"entity_id": registered.entity_id}],
        primary_entity_id=registered.entity_id,
        aggregation="average",
        stale_after_seconds=3600,
        threshold_overrides={"min": 20, "target": 40, "max": 60},
    )
    events: list[object] = []
    manager.subscribe(events.append)
    updated = await manager.async_configure_moisture(
        plant.id, expected_revision=1, moisture=values
    )
    assert updated.revision == 2
    assert updated.moisture.sources[0].registry_id == registered.id
    assert updated.moisture.primary_entity_id == registered.entity_id
    assert updated.moisture.aggregation == "average"
    assert updated.moisture.stale_after_seconds == 3600
    assert updated.moisture.threshold_defaults == plant.moisture.threshold_defaults
    assert len(events) == 1
    assert isinstance(events[0], PlantUpdatedEvent)
    controller = manager.get_moisture_controller(plant.id)
    assert controller is not None
    assert controller.config == updated.moisture
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_configure_moisture(
            plant.id, expected_revision=1, moisture=values
        )
    assert (
        await manager.async_configure_moisture(
            plant.id, expected_revision=2, moisture=values
        )
        == updated
    )
    assert len(events) == 1


@pytest.mark.parametrize("reuse_entity_id", [False, True])
async def test_ws_configure_retains_missing_uuid_through_edit_and_restart(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    *,
    reuse_entity_id: bool,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    registry = er.async_get(hass)
    source = registry.async_get_or_create(
        "sensor", "test", "original", suggested_object_id="soil"
    )
    plant = await _create(
        entry.runtime_data.provider_service,
        manager.wizard_start(),
        moisture=_moisture(
            sources=[{"entity_id": source.entity_id}],
            primary_entity_id=source.entity_id,
        ),
    )
    registry.async_remove(source.entity_id)
    if reuse_entity_id:
        replacement = registry.async_get_or_create(
            "sensor", "test", "replacement", suggested_object_id="soil"
        )
        assert replacement.entity_id == source.entity_id
        assert replacement.id != source.id
        hass.states.async_set(source.entity_id, "35", {"unit_of_measurement": "%"})
    await hass.async_block_till_done()
    values = _moisture(
        sources=[item.as_storage() for item in plant.moisture.sources],
        primary_entity_id=source.entity_id,
        stale_after_seconds=3600,
        threshold_overrides={"min": 20, "target": 40, "max": 60},
    )
    events: list[object] = []
    manager.subscribe(events.append)
    client = await hass_ws_client(hass)
    request = {
        "type": "smart_plants/moisture/configure",
        "plant_id": plant.id,
        "expected_revision": plant.revision,
        "moisture": values,
    }
    await client.send_json_auto_id(request)
    response = await client.receive_json()
    assert response["success"], response
    updated = manager.get_plant(plant.id)
    assert updated.revision == plant.revision + 1
    assert updated.moisture.sources == plant.moisture.sources
    assert updated.moisture.moisture_target == 40
    assert updated.moisture.stale_after_seconds == 3600
    assert len(events) == 1
    assert isinstance(events[0], PlantUpdatedEvent)
    await client.send_json_auto_id(request)
    assert (await client.receive_json())["error"]["code"] == "revision_conflict"
    request["expected_revision"] = updated.revision
    await client.send_json_auto_id(request)
    assert (await client.receive_json())["result"]["plant"] == updated.as_view()
    assert len(events) == 1
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert await hass.config_entries.async_setup(entry.entry_id)
    manager = entry.runtime_data.manager
    assert manager.get_plant(plant.id) == updated
    controller = manager.get_moisture_controller(plant.id)
    assert controller is not None
    assert not controller.current_evaluation.computed_available
    assert controller.current_evaluation.sensor_stale
    issue_id = _issue_id(plant.id, source.entity_id)
    assert ir.async_get(hass).async_get_issue("smart_plants", issue_id) is not None
    # Retention remains editable after restart; explicit removal clears Repairs.
    request["moisture"] = {**values, "aggregation": "average"}
    await client.send_json_auto_id(request)
    assert (await client.receive_json())["success"]
    await manager.async_configure_moisture(
        plant.id, expected_revision=updated.revision + 1, moisture=_moisture()
    )
    await hass.async_block_till_done()
    assert ir.async_get(hass).async_get_issue("smart_plants", issue_id) is None


@pytest.mark.parametrize("forgery", ["uuid", "entity_id", "other_plant", "create"])
async def test_retention_cannot_introduce_missing_assignments(
    hass: HomeAssistant,
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
    forgery: str,
) -> None:
    manager, service = runtime
    registry = er.async_get(hass)
    source = registry.async_get_or_create("sensor", "test", "original")
    pair = {"entity_id": source.entity_id, "registry_id": source.id}
    plant = await _create(
        service,
        manager.wizard_start(),
        moisture=_moisture(
            sources=[pair],
            primary_entity_id=source.entity_id,
        ),
    )
    other = await manager.async_create_plant(name="Other")
    registry.async_remove(source.entity_id)
    await hass.async_block_till_done()
    if forgery == "uuid":
        pair = {**pair, "registry_id": "invented-missing-uuid"}
    elif forgery == "entity_id":
        pair = {**pair, "entity_id": "sensor.changed"}
    values = _moisture(sources=[pair], primary_entity_id=pair["entity_id"])
    before = manager.snapshot
    events: list[object] = []
    manager.subscribe(events.append)
    target = other if forgery == "other_plant" else plant
    with patch.object(manager._store, "async_save", new_callable=AsyncMock) as save:
        if forgery == "create":
            with pytest.raises(ValueError, match="registry identity"):
                await _create(service, manager.wizard_start(), moisture=values)
        else:
            with pytest.raises(ValueError, match="registry identity"):
                await manager.async_configure_moisture(
                    target.id, expected_revision=target.revision, moisture=values
                )
    save.assert_not_called()
    assert manager.snapshot is before
    assert not events


async def test_missing_source_configuration_failure_publishes_nothing(
    hass: HomeAssistant,
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    manager, service = runtime
    registry = er.async_get(hass)
    source = registry.async_get_or_create("sensor", "test", "original")
    plant = await _create(
        service,
        manager.wizard_start(),
        moisture=_moisture(
            sources=[{"entity_id": source.entity_id}],
            primary_entity_id=source.entity_id,
        ),
    )
    registry.async_remove(source.entity_id)
    await hass.async_block_till_done()
    before = manager.snapshot
    controller = manager.get_moisture_controller(plant.id)
    assert controller is not None
    events: list[object] = []
    manager.subscribe(events.append)
    values = _moisture(
        sources=[item.as_storage() for item in plant.moisture.sources],
        primary_entity_id=source.entity_id,
        aggregation="max",
    )
    with (
        patch.object(manager._store, "async_save", side_effect=SmartPlantsStorageError),
        pytest.raises(SmartPlantsStorageError),
    ):
        await manager.async_configure_moisture(
            plant.id, expected_revision=plant.revision, moisture=values
        )
    assert manager.snapshot is before
    assert controller.config == plant.moisture
    assert not events
    updated = await manager.async_configure_moisture(
        plant.id, expected_revision=plant.revision, moisture=values
    )
    assert updated.moisture.sources == plant.moisture.sources
    assert updated.moisture.aggregation == "max"
    assert len(events) == 1


async def test_configure_rejects_stale_pair_after_registry_rename(
    hass: HomeAssistant,
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    manager, service = runtime
    registry = er.async_get(hass)
    source = registry.async_get_or_create("sensor", "test", "original")
    values = _moisture(
        sources=[{"entity_id": source.entity_id, "registry_id": source.id}],
        primary_entity_id=source.entity_id,
    )
    plant = await _create(service, manager.wizard_start(), moisture=values)
    renamed = registry.async_update_entity(
        source.entity_id, new_entity_id="sensor.renamed"
    )
    await hass.async_block_till_done()
    current = manager.get_plant(plant.id)
    assert current.moisture.sources[0].entity_id == renamed.entity_id
    assert current.moisture.sources[0].registry_id == source.id
    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_configure_moisture(
            plant.id, expected_revision=plant.revision, moisture=values
        )
    with pytest.raises(ValueError, match="registry identity"):
        await manager.async_configure_moisture(
            plant.id, expected_revision=current.revision, moisture=values
        )
    assert manager.get_plant(plant.id) == current
    updated = await manager.async_configure_moisture(
        plant.id,
        expected_revision=current.revision,
        moisture=_moisture(
            sources=[item.as_storage() for item in current.moisture.sources],
            primary_entity_id=renamed.entity_id,
            aggregation="min",
        ),
    )
    assert updated.moisture.sources == current.moisture.sources
    assert updated.moisture.aggregation == "min"


async def test_concurrent_replay_is_first_commit_wins_and_does_not_resurrect(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    manager, service = runtime
    draft = manager.wizard_start()
    events: list[object] = []
    manager.subscribe(events.append)
    first, second = await asyncio.gather(
        _create(service, draft), _create(service, draft, name="Ignored replay")
    )
    assert first == second
    assert first.name == "Aloe"
    assert len(events) == len(manager.list_plants()) == 1
    changed = await manager.async_update_plant(
        first.id, expected_revision=1, name="Edited"
    )
    assert await _create(service, draft) == changed
    await manager.async_delete_plant(first.id, expected_revision=2)
    with pytest.raises(ValueError, match="missing or expired"):
        await _create(service, draft)
    assert not manager.list_plants()


async def test_drafts_are_bounded_expire_and_success_recovers_after_expiry(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    manager, service = runtime
    oldest = manager.wizard_start()
    for _ in range(WIZARD_MAX_DRAFTS):
        newest = manager.wizard_start()
    assert len(manager._wizard_drafts) == WIZARD_MAX_DRAFTS
    with pytest.raises(ValueError, match="missing or expired"):
        await _create(service, oldest)
    committed = manager.wizard_start()
    plant = await _create(service, committed)
    with patch(
        "custom_components.smart_plants.manager.time.monotonic", return_value=1e12
    ):
        with pytest.raises(ValueError, match="missing or expired"):
            await _create(service, newest)
        assert await _create(service, committed) == plant
    assert not manager._wizard_drafts


async def test_failed_first_persistence_keeps_draft_for_retry(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    manager, service = runtime
    draft = manager.wizard_start()
    with (
        patch.object(manager._store, "async_save", side_effect=SmartPlantsStorageError),
        pytest.raises(SmartPlantsStorageError),
    ):
        await _create(service, draft)
    assert not manager.list_plants()
    assert (await _create(service, draft)).revision == 1


async def test_unload_clears_drafts_and_fences_all_wizard_operations(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    manager, service = runtime
    draft = manager.wizard_start()
    await manager.async_unload()
    assert not manager._wizard_drafts
    with pytest.raises(SmartPlantsManagerUnavailableError):
        manager.wizard_start()
    with pytest.raises(SmartPlantsManagerUnavailableError):
        service.panel_info()
    with pytest.raises(SmartPlantsManagerUnavailableError):
        await _create(service, draft)
    with pytest.raises(SmartPlantsManagerUnavailableError):
        await _preview(service, draft)


async def test_full_ws_create_area_entities_and_restart_replay(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    entry = await _setup(hass)
    client = await hass_ws_client(hass)
    area = ar.async_get(hass).async_create("Kitchen")
    await client.send_json_auto_id({"type": "smart_plants/wizard/start"})
    draft = (await client.receive_json())["result"]
    assert not entry.runtime_data.manager.list_plants()
    request = {
        "type": "smart_plants/wizard/create",
        **_credentials(draft),
        "confirmed": True,
        "name": "Aloe",
        "area_id": area.id,
        "tags": ["succulent"],
        "category": "Indoor",
        "placement": {"mode": "indoor", "container": True},
        "moisture": _moisture(
            sources=[{"entity_id": "sensor.soil"}], primary_entity_id="sensor.soil"
        ),
    }
    await client.send_json_auto_id(request)
    response = await client.receive_json()
    assert response["success"], response
    plant = response["result"]["plant"]
    await hass.async_block_till_done()
    device = plant_device(dr.async_get(hass), plant["id"])
    assert device is not None
    assert device.area_id == area.id
    entities = er.async_entries_for_device(er.async_get(hass), device.id)
    assert len(entities) == _moisture_entity_role_count()
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await client.send_json_auto_id(request)
    replay = await client.receive_json()
    assert replay["success"], replay
    assert replay["result"]["plant"] == plant
    assert len(entry.runtime_data.manager.list_plants()) == 1
    assert (
        len(er.async_entries_for_device(er.async_get(hass), device.id))
        == _moisture_entity_role_count()
    )


@pytest.mark.parametrize("boundary", ["side_effect", "final_save"])
@pytest.mark.parametrize("restart_first", [False, True])
async def test_interrupted_create_recovery_uses_original_full_intent(
    hass: HomeAssistant,
    boundary: str,
    *,
    restart_first: bool,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    service = entry.runtime_data.provider_service
    draft = manager.wizard_start()
    area = ar.async_get(hass).async_create("Kitchen")
    save = manager._store.async_save
    calls = 0

    async def fail_final(snapshot: Any) -> None:
        nonlocal calls
        calls += 1
        if calls == 2:
            raise SmartPlantsStorageError("interrupted")
        await save(snapshot)

    target = manager.reconciler if boundary == "side_effect" else manager._store
    method = "async_reconcile_present" if boundary == "side_effect" else "async_save"
    failure: Any = (
        RuntimeError("interrupted") if boundary == "side_effect" else fail_final
    )
    with (
        patch.object(target, method, side_effect=failure),
        pytest.raises((RuntimeError, SmartPlantsStorageError)),
    ):
        await _create(
            service,
            draft,
            area_id=area.id,
            moisture=_moisture(
                threshold_overrides={"min": 20, "target": 40, "max": 60}
            ),
        )
    assert len(manager.list_plants()) == 1
    assert len(manager.snapshot.pending_operations) == 1
    assert not manager._wizard_drafts
    if restart_first:
        assert await hass.config_entries.async_unload(entry.entry_id)
        assert await hass.config_entries.async_setup(entry.entry_id)
        manager = entry.runtime_data.manager
        service = entry.runtime_data.provider_service
    # A live retry completes reconciliation rather than creating another plant.
    plant = await _create(service, draft, name="Ignored", area_id=None)
    assert plant.name == "Aloe"
    assert plant.moisture.moisture_target == 40
    device = plant_device(dr.async_get(hass), plant.id)
    assert device is not None
    assert device.area_id == area.id
    assert not manager.snapshot.pending_operations
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert await hass.config_entries.async_setup(entry.entry_id)
    assert await _create(entry.runtime_data.provider_service, draft) == plant


def _requests() -> list[dict[str, Any]]:
    creds = {"draft_id": "d" * 36, "draft_token": "t" * 43, "expected_revision": 0}
    return [
        {"type": "smart_plants/panel/info"},
        {"type": "smart_plants/wizard/start"},
        {
            "type": "smart_plants/wizard/preview",
            **creds,
            "provider": "synthetic",
            "provider_ref": "test",
            "locale": "en",
        },
        {
            "type": "smart_plants/wizard/create",
            **creds,
            "confirmed": True,
            "name": "Aloe",
            "moisture": _moisture(),
        },
        {
            "type": "smart_plants/moisture/configure",
            "plant_id": "test",
            "expected_revision": 1,
            "moisture": _moisture(),
        },
    ]


@pytest.mark.parametrize("message", _requests())
async def test_every_new_command_is_admin_only(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
    message: dict[str, Any],
) -> None:
    entry = await _setup(hass)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await client.send_json_auto_id(message)
    response = await client.receive_json()
    assert response["error"]["code"] == "unauthorized"
    assert not entry.runtime_data.manager.list_plants()
    assert not entry.runtime_data.manager._wizard_drafts


@pytest.mark.parametrize("message", _requests())
async def test_every_new_command_maps_unload(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    message: dict[str, Any],
) -> None:
    entry = await _setup(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(message)
    response = await client.receive_json()
    assert response["error"]["code"] == "integration_not_loaded"


async def test_info_is_explicit_v1_and_never_uses_provider_diagnostics(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    entry = await _setup(hass)
    provider = SyntheticProvider()
    entry.runtime_data.provider_service._registry.register(provider)
    client = await hass_ws_client(hass)
    with patch.object(provider, "diagnostics", side_effect=AssertionError("secret")):
        await client.send_json_auto_id({"type": "smart_plants/panel/info"})
        response = await client.receive_json()
    assert response["result"] == {
        "api_version": 1,
        "schema_version": 1,
        "providers": [
            {"provider": "manual", "available": True, "search_supported": False},
            {"provider": "openplantbook", "available": False, "search_supported": True},
            {"provider": "synthetic", "available": True, "search_supported": True},
        ],
    }


@pytest.mark.parametrize(
    "changes",
    [
        {"confirmed": False},
        {"confirmed": 1},
        {"expected_revision": False},
        {"expected_revision": 1},
        {"plant_id": "forged"},
        {"image": {}},
        {"name": " "},
        {"area_id": ""},
        {"placement": {"mode": "indoor", "container": "invalid"}},
        {"tags": ["duplicate", "duplicate"]},
        {"moisture": {"sources": []}},
    ],
)
async def test_ws_rejects_invalid_final_payload_without_mutations(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    changes: dict[str, Any],
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    draft = manager.wizard_start()
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "smart_plants/wizard/create",
            **_credentials(draft),
            "confirmed": True,
            "name": "Aloe",
            "moisture": _moisture(),
            **changes,
        }
    )
    response = await client.receive_json()
    assert response["error"]["code"] == "invalid_format"
    assert not manager.list_plants()
    assert not manager.snapshot.pending_operations
    assert not dr.async_entries_for_config_entry(dr.async_get(hass), entry.entry_id)


async def test_ws_requires_confirmation_and_supports_provider_create_and_configure(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    entry.runtime_data.provider_service._registry.register(SyntheticProvider())
    draft = manager.wizard_start()
    client = await hass_ws_client(hass)
    request = {
        "type": "smart_plants/wizard/create",
        **_credentials(draft),
        "name": "Aloe",
        "moisture": _moisture(),
    }
    await client.send_json_auto_id(request)
    assert (await client.receive_json())["error"]["code"] == "invalid_format"
    await client.send_json_auto_id(
        {
            "type": "smart_plants/wizard/preview",
            **_credentials(draft),
            "provider": "synthetic",
            "provider_ref": "test",
            "locale": "en",
        }
    )
    preview = (await client.receive_json())["result"]
    assert preview["draft_id"] == draft["draft_id"]
    assert preview["revision"] == 0
    assert "draft_token" not in preview
    assert not manager.list_plants()
    request["confirmed"] = True
    request["accepted_preview"] = {
        key: preview[key] for key in ("preview_token", "provider", "operation")
    }
    await client.send_json_auto_id(request)
    response = await client.receive_json()
    assert response["success"], response
    plant = response["result"]["plant"]
    assert plant["species"]["snapshot"] == preview["snapshot"]
    configure = {
        "type": "smart_plants/moisture/configure",
        "plant_id": plant["id"],
        "expected_revision": 1,
        "moisture": _moisture(
            sources=[{"entity_id": "sensor.new"}],
            primary_entity_id="sensor.new",
            aggregation="max",
            stale_after_seconds=3600,
            threshold_overrides={"min": None, "target": 40, "max": None},
        ),
    }
    await client.send_json_auto_id(configure)
    configured = await client.receive_json()
    assert configured["success"], configured
    assert configured["result"]["plant"]["revision"] == 2
    await client.send_json_auto_id(configure)
    assert (await client.receive_json())["error"]["code"] == "revision_conflict"
    with patch.object(
        manager,
        "async_configure_moisture",
        side_effect=RuntimeError("credential-secret"),
    ):
        await client.send_json_auto_id(configure)
        failure = await client.receive_json()
    assert failure["error"] == {"code": "unknown_error", "message": "internal error"}


class BlockingPreviewProvider(SyntheticProvider):
    def __init__(self) -> None:
        self.entered = asyncio.Event()
        self.release = asyncio.Event()

    async def async_get_species(
        self, provider_ref: str, locale: str, *, force_refresh: bool = False
    ) -> SpeciesProfile:
        self.entered.set()
        await self.release.wait()
        return await super().async_get_species(
            provider_ref, locale, force_refresh=force_refresh
        )

    async def async_close(self) -> None:
        self.release.set()


@pytest.mark.parametrize("close_service", [False, True])
async def test_inflight_preview_cannot_publish_after_unload(
    hass: HomeAssistant,
    *,
    close_service: bool,
) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    provider = BlockingPreviewProvider()
    registry = ProviderRegistry()
    registry.register(provider)
    service = SpeciesProviderService(registry, manager)
    draft = manager.wizard_start()
    task = asyncio.create_task(_preview(service, draft))
    await provider.entered.wait()
    if close_service:
        await service.async_close()
    else:
        await manager.async_unload()
        provider.release.set()
    outcome = (await asyncio.gather(task, return_exceptions=True))[0]
    assert isinstance(outcome, Exception)
    assert not service._previews
    assert not service._tasks
    assert not manager.list_plants()
    await service.async_close()
    await manager.async_unload()


async def test_preview_expiry_and_consumed_draft_during_inflight_preview(
    hass: HomeAssistant,
) -> None:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    provider = BlockingPreviewProvider()
    registry = ProviderRegistry()
    registry.register(provider)
    service = SpeciesProviderService(registry, manager)
    draft = manager.wizard_start()
    task = asyncio.create_task(_preview(service, draft))
    await provider.entered.wait()
    await _create(service, draft)
    provider.release.set()
    with pytest.raises(ValueError, match="missing or expired"):
        await task
    assert not service._previews
    draft = manager.wizard_start()
    accepted = await _preview(service, draft)
    with (
        patch.object(service, "_now", return_value=1e12),
        pytest.raises(ValueError, match="missing or expired"),
    ):
        await _create(service, draft, accepted_preview=accepted)
    assert len(manager.list_plants()) == 1
    await service.async_close()
    await manager.async_unload()


async def test_unload_rejects_queued_create_and_configuration(
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    manager, service = runtime
    plant = await manager.async_create_plant(name="Existing")
    draft = manager.wizard_start()
    async with manager.mutation_lock:
        create = asyncio.create_task(_create(service, draft))
        configure = asyncio.create_task(
            manager.async_configure_moisture(
                plant.id, expected_revision=1, moisture=_moisture(aggregation="max")
            )
        )
        await asyncio.sleep(0)
        unload = asyncio.create_task(manager.async_unload())
        await asyncio.sleep(0)
    outcomes = await asyncio.gather(create, configure, unload, return_exceptions=True)
    assert isinstance(outcomes[0], SmartPlantsManagerUnavailableError)
    assert isinstance(outcomes[1], SmartPlantsManagerUnavailableError)
    assert manager.list_plants() == (plant,)


async def test_unload_drains_admitted_create_and_replay_after_reload(
    hass: HomeAssistant,
    runtime: tuple[SmartPlantsManager, SpeciesProviderService],
) -> None:
    manager, service = runtime
    draft = manager.wizard_start()
    entered, release = asyncio.Event(), asyncio.Event()
    save = manager._store.async_save

    async def blocked_save(snapshot: Any) -> None:
        entered.set()
        await release.wait()
        await save(snapshot)

    with patch.object(manager._store, "async_save", side_effect=blocked_save):
        create = asyncio.create_task(_create(service, draft))
        await entered.wait()
        unload = asyncio.create_task(manager.async_unload())
        await asyncio.sleep(0)
        assert not unload.done()
        release.set()
        plant = await create
        await unload
    assert manager.list_plants() == (plant,)
    reloaded = SmartPlantsManager(hass)
    await reloaded.async_load()
    new_service = SpeciesProviderService(ProviderRegistry(), reloaded)
    assert await _create(new_service, draft) == plant
    await new_service.async_close()
    await reloaded.async_unload()
