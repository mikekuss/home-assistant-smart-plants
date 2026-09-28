"""
Repair-issue reconciliation for missing moisture sources.

Verifies that:

* A registered source removed from the entity registry raises a repair.
* Removing the source from the plant config clears the repair.
* An unregistered source (registry_id=None) never raises a repair.
* Unloading the entry cleans up any active repair rows.
"""

from __future__ import annotations

from unittest.mock import patch

from custom_components.smart_plants.const import DOMAIN, SINGLETON_UNIQUE_ID
from custom_components.smart_plants.repairs import _issue_id
from homeassistant.components.repairs import repairs_flow_manager
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.entity_registry import EVENT_ENTITY_REGISTRY_UPDATED
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id=SINGLETON_UNIQUE_ID)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_missing_registered_source_raises_repair(hass: HomeAssistant) -> None:
    registry = er.async_get(hass)
    entry_obj = registry.async_get_or_create(
        "sensor", "example", "src1", suggested_object_id="soil"
    )
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": entry_obj.entity_id, "registry_id": entry_obj.id}],
    )
    await hass.async_block_till_done()
    # Source present → no issue yet.
    issue_reg = ir.async_get(hass)
    assert (
        issue_reg.async_get_issue(DOMAIN, _issue_id(plant.id, entry_obj.entity_id))
        is None
    )

    registry.async_remove(entry_obj.entity_id)
    await hass.async_block_till_done()
    issue = issue_reg.async_get_issue(DOMAIN, _issue_id(plant.id, entry_obj.entity_id))
    assert issue is not None
    assert issue.is_fixable
    assert issue.data == {
        "plant_id": plant.id,
        "role": "moisture",
        "entity_id": entry_obj.entity_id,
        "registry_id": entry_obj.id,
    }


async def test_repair_flow_replaces_missing_primary_by_registry_identity(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    missing = registry.async_get_or_create(
        "sensor", "example", "missing", suggested_object_id="missing"
    )
    replacement = registry.async_get_or_create(
        "sensor", "example", "replacement", suggested_object_id="replacement"
    )
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    assigned = await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": missing.entity_id, "registry_id": missing.id}],
    )
    await manager.async_set_moisture_primary(
        plant.id,
        expected_revision=assigned.revision,
        primary_entity_id=missing.entity_id,
    )
    registry.async_remove(missing.entity_id)
    await hass.async_block_till_done()
    issue_id = _issue_id(plant.id, missing.entity_id)

    flow_manager = repairs_flow_manager(hass)
    assert flow_manager is not None
    form = await flow_manager.async_init(DOMAIN, data={"issue_id": issue_id})
    assert form["type"] == "form"
    result = await flow_manager.async_configure(
        form["flow_id"], {"replacement_entity_id": replacement.entity_id}
    )
    assert result["type"] == "create_entry"
    current = manager.get_plant(plant.id)
    assert current.moisture.sources[0].registry_id == replacement.id
    assert current.moisture.primary_entity_id == replacement.entity_id
    assert ir.async_get(hass).async_get_issue(DOMAIN, issue_id) is None


async def test_repair_flow_removes_missing_assignment(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    missing = registry.async_get_or_create(
        "sensor", "example", "remove-missing", suggested_object_id="remove_missing"
    )
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": missing.entity_id, "registry_id": missing.id}],
    )
    registry.async_remove(missing.entity_id)
    await hass.async_block_till_done()
    issue_id = _issue_id(plant.id, missing.entity_id)

    flow_manager = repairs_flow_manager(hass)
    assert flow_manager is not None
    form = await flow_manager.async_init(DOMAIN, data={"issue_id": issue_id})
    result = await flow_manager.async_configure(form["flow_id"], {})
    assert result["type"] == "create_entry"
    assert manager.get_plant(plant.id).moisture.sources == ()


async def test_repair_clears_when_source_removed_from_plant(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    entry_obj = registry.async_get_or_create(
        "sensor", "example", "src1", suggested_object_id="soil"
    )
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": entry_obj.entity_id, "registry_id": entry_obj.id}],
    )
    registry.async_remove(entry_obj.entity_id)
    await manager.async_update_plant(plant.id, expected_revision=2, name="Aloe Vera")
    await hass.async_block_till_done()
    issue_reg = ir.async_get(hass)
    assert (
        issue_reg.async_get_issue(DOMAIN, _issue_id(plant.id, entry_obj.entity_id))
        is not None
    )

    fresh = manager.get_plant(plant.id)
    await manager.async_set_moisture_sources(
        plant.id, expected_revision=fresh.revision, sources=[]
    )
    await hass.async_block_till_done()
    assert (
        issue_reg.async_get_issue(DOMAIN, _issue_id(plant.id, entry_obj.entity_id))
        is None
    )


async def test_repair_clears_immediately_when_registry_uuid_reappears(
    hass: HomeAssistant,
) -> None:
    registry = er.async_get(hass)
    source = registry.async_get_or_create(
        "sensor", "example", "src1", suggested_object_id="soil"
    )
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": source.entity_id, "registry_id": source.id}],
    )
    registry.async_remove(source.entity_id)
    await hass.async_block_till_done()
    issue_reg = ir.async_get(hass)
    assert (
        issue_reg.async_get_issue(DOMAIN, _issue_id(plant.id, source.entity_id))
        is not None
    )

    original_get = er.EntityRegistry.async_get

    def restored_get(
        current_registry: er.EntityRegistry, entity_id_or_uuid: str
    ) -> er.RegistryEntry | None:
        if entity_id_or_uuid == source.id:
            return source
        return original_get(current_registry, entity_id_or_uuid)

    with patch.object(er.EntityRegistry, "async_get", new=restored_get):
        hass.bus.async_fire(
            EVENT_ENTITY_REGISTRY_UPDATED,
            {"action": "create", "entity_id": source.entity_id},
        )  # type: ignore[misc]
        await hass.async_block_till_done()
    assert (
        issue_reg.async_get_issue(DOMAIN, _issue_id(plant.id, source.entity_id)) is None
    )


async def test_unregistered_source_does_not_raise_repair(
    hass: HomeAssistant,
) -> None:
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": "sensor.unregistered"}],
    )
    await hass.async_block_till_done()
    issue_reg = ir.async_get(hass)
    assert (
        issue_reg.async_get_issue(DOMAIN, _issue_id(plant.id, "sensor.unregistered"))
        is None
    )


async def test_startup_discovers_and_removes_stale_persisted_issue(
    hass: HomeAssistant,
) -> None:
    issue_id = _issue_id("deleted-plant", "sensor.old")
    ir.async_create_issue(
        hass,
        DOMAIN,
        issue_id,
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="moisture_source_missing",
        translation_placeholders={
            "entity_id": "sensor.old",
            "plant_name": "Deleted",
            "role": "moisture",
        },
    )
    assert ir.async_get(hass).async_get_issue(DOMAIN, issue_id) is not None
    await _setup(hass)
    assert ir.async_get(hass).async_get_issue(DOMAIN, issue_id) is None


async def test_unload_clears_active_issues(hass: HomeAssistant) -> None:
    registry = er.async_get(hass)
    entry_obj = registry.async_get_or_create(
        "sensor", "example", "src1", suggested_object_id="soil"
    )
    entry = await _setup(hass)
    manager = entry.runtime_data.manager
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_set_moisture_sources(
        plant.id,
        expected_revision=1,
        sources=[{"entity_id": entry_obj.entity_id, "registry_id": entry_obj.id}],
    )
    registry.async_remove(entry_obj.entity_id)
    await manager.async_update_plant(plant.id, expected_revision=2, name="Aloe Vera")
    await hass.async_block_till_done()
    issue_reg = ir.async_get(hass)
    assert (
        issue_reg.async_get_issue(DOMAIN, _issue_id(plant.id, entry_obj.entity_id))
        is not None
    )

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert manager._registry_tasks == set()
    assert manager._unsub_registry is None
    assert (
        issue_reg.async_get_issue(DOMAIN, _issue_id(plant.id, entry_obj.entity_id))
        is None
    )
