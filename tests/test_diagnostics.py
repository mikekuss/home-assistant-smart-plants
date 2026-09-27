from __future__ import annotations

from custom_components.smart_plants.const import (
    CONF_OPENPLANTBOOK_CLIENT_ID,
    CONF_OPENPLANTBOOK_CLIENT_SECRET,
    CONF_OPENPLANTBOOK_ENABLED,
    DOMAIN,
    SINGLETON_UNIQUE_ID,
)
from custom_components.smart_plants.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.smart_plants.roles import role_definitions
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def test_diagnostics_redact_all_credentials(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=SINGLETON_UNIQUE_ID,
        data={
            CONF_OPENPLANTBOOK_ENABLED: True,
            CONF_OPENPLANTBOOK_CLIENT_ID: "sensitive-client",
            CONF_OPENPLANTBOOK_CLIENT_SECRET: "sensitive-secret",
        },
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    rendered = repr(diagnostics)
    assert "sensitive-client" not in rendered
    assert "sensitive-secret" not in rendered
    assert diagnostics["entry"]["data"]["credentials_configured"] is True
    assert CONF_OPENPLANTBOOK_CLIENT_ID not in diagnostics["entry"]["data"]
    assert CONF_OPENPLANTBOOK_CLIENT_SECRET not in diagnostics["entry"]["data"]
    assert "access_token" not in rendered


async def test_diagnostics_aggregate_private_inventory_fields(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=SINGLETON_UNIQUE_ID,
        data={},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    plant = await entry.runtime_data.manager.async_create_plant(
        name="Private plant name",
        tags=("private-tag",),
        category="private-category",
    )
    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    rendered = repr(diagnostics)
    for private_value in (
        plant.id,
        plant.name,
        plant.created_at,
        "private-tag",
        "private-category",
    ):
        assert private_value not in rendered
    assert diagnostics["inventory"]["plant_count"] == 1
    assert "plants" not in diagnostics["inventory"]


async def test_diagnostics_count_sources_for_every_role(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=SINGLETON_UNIQUE_ID,
        data={},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager = entry.runtime_data.manager
    registry = er.async_get(hass)
    plant = await manager.async_create_plant(name="Office Aloe")
    assignments = {"moisture": 2, "temperature": 1, "battery": 1, "co2": 1}
    entity_ids: list[str] = []
    for role, count in assignments.items():
        sources = []
        for index in range(count):
            registry_entry = registry.async_get_or_create(
                "sensor",
                "example",
                f"{role}_{index}",
                suggested_object_id=f"mock_{role}_{index}",
            )
            entity_ids.append(registry_entry.entity_id)
            sources.append(
                {
                    "entity_id": registry_entry.entity_id,
                    "registry_id": registry_entry.id,
                }
            )
        plant = await manager.async_set_role_sources(
            plant.id,
            role=role,
            expected_revision=plant.revision,
            sources=sources,
        )

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    inventory = diagnostics["inventory"]
    assert inventory["assigned_source_count"] == 5
    by_role = inventory["assigned_source_counts_by_role"]
    assert set(by_role) == {
        definition.key
        for definition in role_definitions()
        if definition.replace_sources is not None
    }
    for role, count in by_role.items():
        assert count == assignments.get(role, 0)
    rendered = repr(diagnostics)
    for entity_id in entity_ids:
        assert entity_id not in rendered
