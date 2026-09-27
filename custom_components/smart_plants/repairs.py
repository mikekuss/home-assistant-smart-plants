"""
Phase 4 Cut 4: Repair issues for missing moisture sources.

A plant may reference an entity_registry UUID that no longer resolves
to a live entity (the source device was removed, the user deleted the
registry entry, etc.). Per phase-04 the assignment is preserved and a
Home Assistant repair issue is created so the user can fix it via the
Repairs dashboard. When the assignment is fixed — the source
reappears, the plant is reassigned, or the source is removed from the
plant's config — the issue is cleared.

This module owns:

* ``MissingSourceRepairMonitor``: a manager-scoped monitor that
  computes the current set of missing-source issues from the plant
  snapshot and the HA entity registry, and reconciles them against
  the issue registry (create new / delete resolved).
"""

from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, cast

import voluptuous as vol
from homeassistant.components.repairs import RepairsFlow, RepairsFlowResult
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers import selector

from .const import DOMAIN
from .events import (
    PlantAddedEvent,
    PlantDeletedEvent,
    PlantEvent,
    PlantLifecycleChangedEvent,
    PlantUpdatedEvent,
)
from .roles import role_definitions

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .manager import SmartPlantsManager


_ISSUE_ID_PREFIX = "moisture_source_missing"
_ISSUE_TRANSLATION_KEY = "moisture_source_missing"
_LEGACY_ISSUE_ID_PARTS = 3
_ISSUE_ID_PARTS = 4


def _issue_id(plant_id: str, entity_id: str, role: str = "moisture") -> str:
    # Stable id keyed by (plant, entity) so a fix creates/removes exactly
    # the corresponding row without churning the entire set.
    return f"{_ISSUE_ID_PREFIX}::{role}::{plant_id}::{entity_id}"


class MissingSourceRepairMonitor:
    """Reconciles moisture-source missing-registry issues on every event."""

    def __init__(self, hass: HomeAssistant, manager: SmartPlantsManager) -> None:
        self._hass = hass
        self._manager = manager
        self._unsub: Callable[[], None] | None = None
        self._unsub_registry: Callable[[], None] | None = None
        self._active_issues: set[tuple[str, str, str, str]] = set()

    def start(self) -> None:
        if self._unsub is not None:
            return
        try:
            self._unsub = self._manager.subscribe(self._handle_event)
            self._unsub_registry = self._manager.subscribe_registry(self._reconcile)
            self._discover_owned_issues()
            self._reconcile()
        except BaseException:
            self.stop()
            raise

    def stop(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None
        if self._unsub_registry is not None:
            self._unsub_registry()
            self._unsub_registry = None
        for role, plant_id, entity_id, _registry_id in self._active_issues:
            ir.async_delete_issue(
                self._hass, DOMAIN, _issue_id(plant_id, entity_id, role)
            )
        self._active_issues.clear()

    def _discover_owned_issues(self) -> None:
        """Adopt persisted issues so stale rows are removed after a restart."""
        registry = ir.async_get(self._hass)
        for domain, issue_id in list(registry.issues):
            if domain != DOMAIN or not issue_id.startswith(f"{_ISSUE_ID_PREFIX}::"):
                continue
            parts = issue_id.split("::")
            if len(parts) == _ISSUE_ID_PARTS:
                issue = registry.async_get_issue(DOMAIN, issue_id)
                data = issue.data if issue is not None else None
                registry_id = data.get("registry_id") if data is not None else None
                if isinstance(registry_id, str):
                    self._active_issues.add((parts[1], parts[2], parts[3], registry_id))
                else:
                    ir.async_delete_issue(self._hass, DOMAIN, issue_id)
            elif len(parts) == _LEGACY_ISSUE_ID_PARTS:
                # Adopt pre-role issue ids so startup removes the stale row.
                ir.async_delete_issue(self._hass, DOMAIN, issue_id)

    def _handle_event(self, event: PlantEvent) -> None:
        if isinstance(
            event,
            (
                PlantAddedEvent,
                PlantUpdatedEvent,
                PlantLifecycleChangedEvent,
                PlantDeletedEvent,
            ),
        ):
            self._reconcile()

    def _reconcile(self) -> None:
        registry = er.async_get(self._hass)
        expected: set[tuple[str, str, str, str]] = set()
        for plant in self._manager.snapshot.plants.values():
            if plant.lifecycle_state != "active":
                continue
            for definition in role_definitions():
                sources = getattr(definition.config_for(plant), "sources", ())
                for source in sources:
                    if source.registry_id is None:
                        continue
                    if registry.async_get(source.registry_id) is not None:
                        continue
                    expected.add(
                        (
                            definition.key,
                            plant.id,
                            source.entity_id,
                            source.registry_id,
                        )
                    )

        stale = self._active_issues - expected
        for role, plant_id, entity_id, _registry_id in stale:
            ir.async_delete_issue(
                self._hass, DOMAIN, _issue_id(plant_id, entity_id, role)
            )
            self._active_issues.discard((role, plant_id, entity_id, _registry_id))

        new = expected - self._active_issues
        for role, plant_id, entity_id, registry_id in new:
            named = self._manager.snapshot.plants.get(plant_id)
            plant_name = named.name if named is not None else plant_id
            ir.async_create_issue(
                self._hass,
                DOMAIN,
                _issue_id(plant_id, entity_id, role),
                data={
                    "plant_id": plant_id,
                    "role": role,
                    "entity_id": entity_id,
                    "registry_id": registry_id,
                },
                is_fixable=True,
                severity=ir.IssueSeverity.WARNING,
                translation_key=_ISSUE_TRANSLATION_KEY,
                translation_placeholders={
                    "entity_id": entity_id,
                    "plant_name": plant_name,
                    "role": role,
                },
            )
            self._active_issues.add((role, plant_id, entity_id, registry_id))


class MissingSourceRepairFlow(RepairsFlow):
    """Replace or remove one missing UUID-backed source assignment."""

    async def async_step_init(
        self, user_input: dict[str, str] | None = None
    ) -> RepairsFlowResult:
        del user_input
        return await self.async_step_source()

    async def async_step_source(  # noqa: PLR0911
        self, user_input: dict[str, str] | None = None
    ) -> RepairsFlowResult:
        data = self.data or {}
        plant_id = data.get("plant_id")
        role = data.get("role")
        registry_id = data.get("registry_id")
        entity_id = data.get("entity_id")
        if not all(isinstance(value, str) for value in data.values()) or not all(
            isinstance(value, str) for value in (plant_id, role, registry_id, entity_id)
        ):
            return self.async_abort(reason="invalid_issue")
        plant_id = cast("str", plant_id)
        role = cast("str", role)
        registry_id = cast("str", registry_id)
        entity_id = cast("str", entity_id)

        entry_id = self.hass.data.get(DOMAIN)
        entry = (
            self.hass.config_entries.async_get_entry(entry_id)
            if isinstance(entry_id, str)
            else None
        )
        runtime = getattr(entry, "runtime_data", None)
        if runtime is None:
            return self.async_abort(reason="integration_not_loaded")
        manager = runtime.manager
        plant = manager.snapshot.plants.get(plant_id)
        try:
            definition = next(item for item in role_definitions() if item.key == role)
        except StopIteration:
            return self.async_abort(reason="invalid_issue")
        config = definition.config_for(plant) if plant is not None else None
        sources = tuple(getattr(config, "sources", ()))
        target = next(
            (source for source in sources if source.registry_id == registry_id), None
        )
        if plant is None or target is None:
            return self.async_abort(reason="issue_resolved")

        if user_input is None:
            return self.async_show_form(
                step_id="source",
                data_schema=vol.Schema(
                    {
                        vol.Optional("replacement_entity_id"): selector.EntitySelector(
                            selector.EntitySelectorConfig(
                                domain=definition.source_domain
                            )
                        )
                    }
                ),
                description_placeholders={
                    "entity_id": entity_id,
                    "plant_name": plant.name,
                    "role": role,
                },
            )

        replacement = user_input.get("replacement_entity_id")
        replacement_sources = [
            source.as_storage() for source in sources if source is not target
        ]
        if replacement:
            replacement_sources.append({"entity_id": replacement})
        was_primary = getattr(config, "primary_entity_id", None) == target.entity_id
        try:
            updated = await manager.async_set_role_sources(
                plant.id,
                role=role,
                expected_revision=plant.revision,
                sources=replacement_sources,
            )
            if replacement and was_primary:
                await manager.async_set_role_primary(
                    plant.id,
                    role=role,
                    expected_revision=updated.revision,
                    primary_entity_id=replacement,
                )
        except ValueError, RuntimeError, LookupError:
            return self.async_show_form(
                step_id="source",
                data_schema=vol.Schema(
                    {
                        vol.Optional("replacement_entity_id"): selector.EntitySelector(
                            selector.EntitySelectorConfig(
                                domain=definition.source_domain
                            )
                        )
                    }
                ),
                errors={"base": "invalid_source"},
            )
        return self.async_create_entry(data={})


async def async_create_fix_flow(
    hass: HomeAssistant,
    issue_id: str,
    data: dict[str, str | int | float | None] | None,
) -> RepairsFlow:
    """Create the native Repairs UI flow for a missing source issue."""
    del hass
    if not issue_id.startswith(f"{_ISSUE_ID_PREFIX}::"):
        return MissingSourceRepairFlow()
    flow = MissingSourceRepairFlow()
    flow.data = data
    return flow
