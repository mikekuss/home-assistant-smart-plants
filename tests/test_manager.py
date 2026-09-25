from __future__ import annotations

import pytest
from custom_components.smart_plants.events import PlantAddedEvent
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsPlantNotFoundError,
    SmartPlantsRevisionConflictError,
    SmartPlantsValidationError,
)
from custom_components.smart_plants.models import (
    PlantPlacement,
    PlantSpecies,
    SpeciesSnapshot,
)
from homeassistant.core import HomeAssistant


async def _loaded_manager(hass: HomeAssistant) -> SmartPlantsManager:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    return manager


async def test_callback_runs_unlocked_and_can_reenter_manager(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    observed: list[tuple[bool, str]] = []

    async def reenter(event: object) -> None:
        if not isinstance(event, PlantAddedEvent):
            return
        observed.append((manager.mutation_lock.locked(), event.plant.lifecycle_state))
        await manager.async_disable_plant(event.plant.id, expected_revision=1)

    manager.subscribe(reenter)
    plant = await manager.async_create_plant(name="Aloe")

    assert observed == [(False, "active")]
    assert manager.get_plant(plant.id).lifecycle_state == "disabled"


async def test_create_plant_generates_server_side_id_and_stamps_timestamps(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Olivenbaum")

    assert plant.id
    assert plant.revision == 1
    assert plant.name == "Olivenbaum"
    assert plant.lifecycle_state == "active"
    assert plant.created_at, "created_at must be stamped server-side"
    assert plant.acquired_at is None
    assert plant.tags == ()
    assert plant.species is None
    assert plant.placement is None
    assert plant.image is None
    assert plant.category is None
    assert manager.snapshot.plants[plant.id] == plant


async def test_create_plant_persists_all_optional_fields(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    species = PlantSpecies(
        provider="manual",
        snapshot=SpeciesSnapshot(
            provider="manual",
            provider_id=None,
            provider_ref=None,
            fetched_at="2026-09-05T00:00:00Z",
            locale="und",
            source_status="manual",
            attribution="User supplied",
            common_name="Aloe",
            latin_name="Aloe vera",
            field_sources={
                "common_name": "User supplied",
                "latin_name": "User supplied",
            },
        ),
    )
    placement = PlantPlacement(
        mode="indoor", exposure="bright_indirect", container=True
    )
    plant = await manager.async_create_plant(
        name="Aloe",
        acquired_at="2026-08-01T00:00:00Z",
        species=species,
        placement=placement,
        tags=["houseplant", "succulent"],
        category="houseplant",
    )

    assert plant.tags == ("houseplant", "succulent")
    assert plant.category == "houseplant"
    assert plant.species == species
    assert plant.placement == placement
    # image ids/metadata are server-authored through the dedicated image
    # endpoints — public plant CRUD must never accept them from clients.
    assert plant.image is None
    assert plant.acquired_at == "2026-08-01T00:00:00Z"


async def test_create_plant_rejects_invalid_name(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    for bad_name in ("", "   "):
        with pytest.raises(SmartPlantsValidationError):
            await manager.async_create_plant(name=bad_name)


async def test_create_plant_rejects_duplicate_tags(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    with pytest.raises(SmartPlantsValidationError):
        await manager.async_create_plant(name="A", tags=["x", "x"])


async def test_update_plant_requires_matching_revision(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")

    with pytest.raises(SmartPlantsRevisionConflictError) as excinfo:
        await manager.async_update_plant(
            plant.id, expected_revision=999, name="Aloe Vera"
        )
    assert excinfo.value.expected == 999
    assert excinfo.value.actual == 1
    assert manager.snapshot.plants[plant.id].name == "Aloe"


async def test_update_plant_bumps_revision_only_when_something_changes(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")

    noop = await manager.async_update_plant(plant.id, expected_revision=1)
    assert noop.revision == 1
    assert manager.snapshot.revision == 1

    updated = await manager.async_update_plant(
        plant.id, expected_revision=1, name="Aloe Vera", tags=["houseplant"]
    )
    assert updated.revision == 2
    assert updated.name == "Aloe Vera"
    assert updated.tags == ("houseplant",)


async def test_update_plant_can_clear_optional_fields(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    placement = PlantPlacement(mode="indoor")
    plant = await manager.async_create_plant(
        name="Aloe", placement=placement, tags=["houseplant"], category="houseplant"
    )

    updated = await manager.async_update_plant(
        plant.id,
        expected_revision=1,
        placement=None,
        tags=[],
        category=None,
    )
    assert updated.placement is None
    assert updated.tags == ()
    assert updated.category is None


async def test_disable_and_reenable_plant_cycle(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")

    disabled = await manager.async_disable_plant(plant.id, expected_revision=1)
    assert disabled.lifecycle_state == "disabled"
    assert disabled.revision == 2

    # Disabling again is a no-op that neither bumps the revision nor writes.
    idle = await manager.async_disable_plant(plant.id, expected_revision=2)
    assert idle.revision == 2

    reenabled = await manager.async_reenable_plant(plant.id, expected_revision=2)
    assert reenabled.lifecycle_state == "active"
    assert reenabled.revision == 3


async def test_delete_plant_removes_record_and_writes_tombstone(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")

    await manager.async_delete_plant(plant.id, expected_revision=1)
    assert plant.id not in manager.snapshot.plants
    assert len(manager.snapshot.tombstones) == 1
    tombstone = manager.snapshot.tombstones[0]
    assert tombstone.plant_id == plant.id
    assert tombstone.deleted_at

    # Deleting an already-deleted plant surfaces a not-found rather than a
    # revision conflict, so callers can distinguish "gone" from "stale".
    with pytest.raises(SmartPlantsPlantNotFoundError):
        await manager.async_delete_plant(plant.id, expected_revision=1)


async def test_delete_plant_requires_matching_revision(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_update_plant(plant.id, expected_revision=1, name="Aloe Vera")

    with pytest.raises(SmartPlantsRevisionConflictError):
        await manager.async_delete_plant(plant.id, expected_revision=1)
    assert plant.id in manager.snapshot.plants
    assert manager.snapshot.tombstones == ()


async def test_list_plants_returns_snapshot_view(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    a = await manager.async_create_plant(name="A")
    b = await manager.async_create_plant(name="B")

    listed = manager.list_plants()
    assert {p.id for p in listed} == {a.id, b.id}


async def test_created_plant_survives_reload(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(
        name="Aloe",
        tags=["houseplant"],
        category="houseplant",
        placement=PlantPlacement(mode="indoor", container=True),
    )

    reloaded = await _loaded_manager(hass)
    persisted = reloaded.snapshot.plants[plant.id]
    assert persisted == plant


@pytest.mark.parametrize("bad_revision", [True, False, 0, -1, 1.0, "1"])
async def test_manager_rejects_invalid_expected_revision(
    hass: HomeAssistant, bad_revision: object
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")

    with pytest.raises(SmartPlantsValidationError, match="expected_revision"):
        await manager.async_update_plant(
            plant.id,
            expected_revision=bad_revision,  # type: ignore[arg-type]
            name="Changed",
        )
    assert manager.get_plant(plant.id) == plant


@pytest.mark.parametrize("bad_id", ["", "   ", " padded ", "x" * 201])
async def test_manager_rejects_invalid_plant_id(
    hass: HomeAssistant, bad_id: str
) -> None:
    manager = await _loaded_manager(hass)
    with pytest.raises(SmartPlantsValidationError, match="plant_id"):
        manager.get_plant(bad_id)


async def test_manager_rejects_non_manual_species(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    with pytest.raises(SmartPlantsValidationError, match="provider"):
        await manager.async_create_plant(
            name="Aloe",
            species=PlantSpecies(
                provider="remote",
                snapshot=SpeciesSnapshot(
                    provider="remote",
                    provider_id="aloe",
                    provider_ref="aloe",
                    fetched_at="2026-09-05T00:00:00Z",
                    locale="en",
                    source_status="provider",
                    attribution="Remote",
                ),
            ),
        )


async def test_manager_rejects_invalid_direct_placement(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    with pytest.raises(SmartPlantsValidationError, match="placement mode"):
        await manager.async_create_plant(
            name="Aloe", placement=PlantPlacement(mode="   ")
        )


@pytest.mark.parametrize("bad_timestamp", ["not-a-date", " 2026-08-01", "x" * 65])
async def test_manager_rejects_invalid_acquired_at(
    hass: HomeAssistant, bad_timestamp: str
) -> None:
    manager = await _loaded_manager(hass)
    with pytest.raises(SmartPlantsValidationError, match="acquired_at"):
        await manager.async_create_plant(name="Aloe", acquired_at=bad_timestamp)


async def test_manager_accepts_iso_acquired_date(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe", acquired_at="2026-08-01")
    assert plant.acquired_at == "2026-08-01"
