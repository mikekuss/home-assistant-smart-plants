"""
Smart Plants ``button`` platform.

Buttons log care with one press, for dashboards and wall switches:

* ``watered`` -- every plant (registered by the moisture role): logs a
  watering now.
* the "done" button of each care task, managed by ``CareEntityLifecycle``:
  marks the task as done now, like **Mark as done** in the panel.

All buttons are disabled by default. A press is stored with the ``action``
provenance, the same as the ``smart_plants.log_care`` action, and fails with
a translated error when the care cannot be saved.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import TYPE_CHECKING, Final

from homeassistant.components.button import ButtonEntity
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util

from .care_entities import (
    TASK_SUFFIX_DONE,
    CareEntityLifecycle,
    task_role,
    task_translation_key,
)
from .const import DOMAIN
from .entity import (
    EntityFactory,
    SmartPlantsEntity,
    async_setup_platform_lifecycle,
)
from .manager import (
    PlantChange,
    SmartPlantsManagerUnavailableError,
    SmartPlantsPlantNotFoundError,
    SmartPlantsValidationError,
    complete_task_change,
    watering_change,
)
from .roles import EntityRole, RoleDefinition, entity_factories
from .storage import SmartPlantsStorageError, SmartPlantsStorageFullError

if TYPE_CHECKING:
    import asyncio

    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import (
        AddEntitiesCallback,
        EntityPlatform,
    )

    from .events import PlantEvent
    from .manager import SmartPlantsManager
    from .models import CareTask, PlantRecord


PLATFORM = "button"
ROLE_WATERED: Final = "watered"
ACTION_PROVENANCE: Final = "action"

# Name of a "done" button whose task has its own name. The translated pattern
# is used once the platform translations are loaded.
_NAMED_DONE_KEY: Final = "care_task_named_done"
_NAMED_DONE_DEFAULT: Final = "{task_name} done"


def _error(key: str, **placeholders: str) -> HomeAssistantError:
    return HomeAssistantError(
        translation_domain=DOMAIN,
        translation_key=key,
        translation_placeholders=placeholders or None,
    )


@contextmanager
def _press_errors(target: str) -> Iterator[None]:
    """Translate the manager errors of a press into action errors."""
    try:
        yield
    except SmartPlantsValidationError as err:
        raise _error("care_rejected", target=target, reason=str(err)) from err
    except SmartPlantsPlantNotFoundError as err:
        raise _error("plant_not_found") from err
    except SmartPlantsManagerUnavailableError as err:
        raise _error("integration_not_loaded") from err
    except SmartPlantsStorageFullError as err:
        raise _error("storage_full") from err
    except SmartPlantsStorageError as err:
        raise _error("storage_failed") from err


def _now() -> str:
    """Return now as a local ISO timestamp with an offset, like the action."""
    return dt_util.now().replace(microsecond=0).isoformat()


class SmartPlantsButtonEntity(SmartPlantsEntity, ButtonEntity):
    """Base for every Smart Plants button."""

    PLATFORM = PLATFORM
    _attr_entity_registry_enabled_default = False

    async def _async_log(self, change: PlantChange) -> None:
        plant = self._manager.snapshot.plants.get(self._plant_id)
        if plant is None:
            raise _error("plant_not_found")
        if plant.lifecycle_state != "active":
            raise _error("plant_disabled", plant=plant.name)
        with _press_errors(self.entity_id or plant.name):
            await self._manager.async_apply_plant_changes([(plant.id, change)])


class _WateredButton(SmartPlantsButtonEntity):
    """Logs a watering of the plant now."""

    def __init__(self, manager: SmartPlantsManager, plant_id: str) -> None:
        super().__init__(manager, plant_id, ROLE_WATERED, ROLE_WATERED)

    async def async_press(self) -> None:
        await self._async_log(
            watering_change(occurred_at=_now(), note=None, provenance=ACTION_PROVENANCE)
        )


class _CareTaskDoneButton(SmartPlantsButtonEntity):
    """Marks one care task as done now."""

    def __init__(
        self, manager: SmartPlantsManager, plant_id: str, task: CareTask
    ) -> None:
        super().__init__(
            manager,
            plant_id,
            task_role(task.id, TASK_SUFFIX_DONE),
            f"{task_translation_key(task.type)}_{TASK_SUFFIX_DONE}",
        )
        self._task_id = task.id
        self._sync_name(task)

    def _task(self) -> CareTask | None:
        plant = self._manager.snapshot.plants.get(self._plant_id)
        return None if plant is None else plant.care_task(self._task_id)

    def _sync_name(self, task: CareTask) -> None:
        # A task's own name replaces the translated name of its type.
        if task.name is None:
            if hasattr(self, "_attr_name"):
                del self._attr_name
            return
        platform_data = getattr(self, "platform_data", None)
        pattern = None
        if platform_data is not None:
            pattern = platform_data.platform_translations.get(
                f"component.{DOMAIN}.entity.{PLATFORM}.{_NAMED_DONE_KEY}.name"
            )
        self._attr_name = (pattern or _NAMED_DONE_DEFAULT).replace(
            "{task_name}", task.name
        )

    def add_to_platform_start(
        self,
        hass: HomeAssistant,
        platform: EntityPlatform,
        parallel_updates: asyncio.Semaphore | None,
    ) -> None:
        super().add_to_platform_start(hass, platform, parallel_updates)
        # Translations become available here, before the entity id and the
        # registry name are derived from the entity name.
        if (task := self._task()) is not None:
            self._sync_name(task)

    def _handle_manager_event(self, event: PlantEvent) -> None:
        task = self._task()
        if task is None:
            # The task is gone; the care lifecycle removes this entity.
            return
        self._sync_name(task)
        super()._handle_manager_event(event)

    @property
    def available(self) -> bool:
        return super().available and self._task() is not None

    async def async_press(self) -> None:
        if self._task() is None:
            raise _error("care_task_not_found", target=self.entity_id or "")
        await self._async_log(
            complete_task_change(
                self._task_id,
                occurred_at=_now(),
                note=None,
                provenance=ACTION_PROVENANCE,
            )
        )


def _factory_role(
    manager: SmartPlantsManager,
    plant: PlantRecord,
    _definition: RoleDefinition,
    _entity: EntityRole,
) -> SmartPlantsEntity:
    return _WateredButton(manager, plant.id)


def _factory_care_task_done(
    manager: SmartPlantsManager, plant: PlantRecord, task: CareTask
) -> SmartPlantsEntity:
    return _CareTaskDoneButton(manager, plant.id, task)


# Materialized from the registry after this module's implementation factories
# exist: the moisture role registers the "watered" button.
ROLE_FACTORIES: dict[str, EntityFactory] = entity_factories(PLATFORM)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    lifecycle = await async_setup_platform_lifecycle(
        hass,
        entry,
        async_add_entities,
        PLATFORM,
        ROLE_FACTORIES,
    )
    care = CareEntityLifecycle(
        hass,
        entry.runtime_data.manager,
        PLATFORM,
        {TASK_SUFFIX_DONE: _factory_care_task_done},
        {},
        async_add_entities,
    )
    lifecycle.async_on_unload(care.async_unload)
    await care.async_setup()
