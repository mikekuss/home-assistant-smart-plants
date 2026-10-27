"""
Automation triggers for plants.

The triggers build on Home Assistant's entity trigger base, which resolves
plant devices, areas, floors and labels to the plant's binary sensors, follows
registry changes, ignores changes from or to unavailable, and handles the
``behavior`` and ``for`` options.

Alert triggers fire when a sensor starts *alerting*: it is on and its plant is
not snoozed. So a plant that started needing water during a snooze triggers
once when the snooze ends. ``include_snoozed`` tracks the state alone.

Without a target a trigger watches every plant, including plants added later.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, ClassVar, Final, override

import voluptuous as vol
from homeassistant.const import (
    ATTR_ENTITY_ID,
    CONF_FOR,
    STATE_OFF,
    STATE_ON,
)
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.trigger import (
    ATTR_BEHAVIOR,
    BEHAVIOR_ALL,
    BEHAVIOR_EACH,
    BEHAVIOR_FIRST,
    EntityTriggerBase,
    NotTriggeredReasonReporter,
    Trigger,
    TriggerActionRunner,
    TriggerConfig,
    TriggerNotTriggeredReporter,
)

from .automation_targets import (
    ATTR_TASK_TYPE,
    BINARY_SENSOR,
    PROBLEM_ROLES,
    ROLE_NEEDS_WATER,
    TASK_TYPES,
    EntryFilter,
    all_plant_entities,
    entity_display_name,
    filter_entities,
    has_target,
    is_alerting,
    is_task_due_entry,
    multi_select,
    options_schema,
    plant_of,
    problem_filter,
    problem_role,
)
from .const import DOMAIN

if TYPE_CHECKING:
    from homeassistant.core import CALLBACK_TYPE, Context, HomeAssistant, State

ATTR_INCLUDE_SNOOZED: Final = "include_snoozed"
ATTR_PROBLEMS: Final = "problems"
ATTR_TASK_TYPES: Final = "task_types"

# Stands in for an empty target so the target tracker runs. The trigger's
# entity filter then ignores it and returns every matching plant entity; the
# tracker calls the filter again on every registry change, so plants added
# later are picked up without dropping the pending delays of other plants.
_ALL_PLANTS_TARGET: Final = {ATTR_ENTITY_ID: [f"{BINARY_SENSOR}.{DOMAIN}_all_plants"]}


_FOR = {vol.Optional(CONF_FOR): cv.positive_time_period}
_INCLUDE_SNOOZED = {vol.Optional(ATTR_INCLUDE_SNOOZED, default=False): cv.boolean}
_PROBLEMS = {
    vol.Optional(ATTR_PROBLEMS, default=list(PROBLEM_ROLES)): multi_select(
        PROBLEM_ROLES
    )
}

NEEDS_WATER_SCHEMA: Final = options_schema(
    {
        vol.Optional(ATTR_BEHAVIOR, default=BEHAVIOR_EACH): vol.In(
            [BEHAVIOR_EACH, BEHAVIOR_FIRST, BEHAVIOR_ALL]
        ),
        **_FOR,
        **_INCLUDE_SNOOZED,
    }
)
PROBLEM_STARTED_SCHEMA: Final = options_schema(
    {**_PROBLEMS, **_FOR, **_INCLUDE_SNOOZED}
)
PROBLEM_CLEARED_SCHEMA: Final = options_schema({**_PROBLEMS, **_FOR})
CARE_TASK_DUE_SCHEMA: Final = options_schema(
    {
        vol.Optional(ATTR_TASK_TYPES, default=list(TASK_TYPES)): multi_select(
            TASK_TYPES
        ),
        **_FOR,
        **_INCLUDE_SNOOZED,
    }
)


class _PlantTrigger(EntityTriggerBase):
    """A trigger on one kind of plant binary sensor."""

    # Low battery is a diagnostic entity; find it through its plant too.
    _primary_entities_only: ClassVar[bool] = False

    def __init__(self, hass: HomeAssistant, config: TriggerConfig) -> None:
        super().__init__(hass, config)
        self._all_plants = not has_target(self._target)
        if self._all_plants:
            self._target = _ALL_PLANTS_TARGET
        self._include_snoozed: bool = self._options.get(ATTR_INCLUDE_SNOOZED, False)

    def _entry_matches(self, entry: er.RegistryEntry) -> bool:
        raise NotImplementedError

    def _alerting(self, state: State) -> bool:
        return is_alerting(state, include_snoozed=self._include_snoozed)

    @override
    def entity_filter(self, entities: set[str]) -> set[str]:
        entry_filter: EntryFilter = self._entry_matches
        if self._all_plants:
            return all_plant_entities(self._hass, entry_filter)
        return filter_entities(self._hass, entities, entry_filter)

    @override
    def is_valid_state(
        self, state: State, report_not_triggered: NotTriggeredReasonReporter
    ) -> bool:
        return self._alerting(state)

    @override
    def is_valid_transition(self, from_state: State, to_state: State) -> bool:
        # The new state is alerting; fire when the old one was not. A snooze
        # ending while the state stays on is such a change.
        return not self._alerting(from_state)

    def _variables(self, state: State, plant_name: str) -> dict[str, Any]:
        """Return the trigger variables specific to this trigger."""
        raise NotImplementedError

    def _trigger_variables(self, entity_id: str, state: State) -> dict[str, Any]:
        plant = plant_of(self._hass, entity_id)
        return {
            "device_id": None if plant is None else plant.device_id,
            "plant": None if plant is None else plant.name,
            **self._variables(state, "" if plant is None else plant.name),
        }

    @override
    async def async_attach_runner(
        self,
        run_action: TriggerActionRunner,
        did_not_trigger: TriggerNotTriggeredReporter | None = None,
    ) -> CALLBACK_TYPE:
        def run_with_plant(
            extra_trigger_payload: dict[str, Any],
            description: str,
            context: Context | None = None,
        ) -> Any:
            entity_id = extra_trigger_payload[ATTR_ENTITY_ID]
            state = extra_trigger_payload["to_state"]
            return run_action(
                {**extra_trigger_payload, **self._trigger_variables(entity_id, state)},
                description,
                context,
            )

        return await super().async_attach_runner(run_with_plant, did_not_trigger)


class _ProblemTrigger(_PlantTrigger):
    def __init__(self, hass: HomeAssistant, config: TriggerConfig) -> None:
        super().__init__(hass, config)
        self._problem_filter = problem_filter(self._problem_roles())

    def _problem_roles(self) -> list[str]:
        roles: list[str] = self._options[ATTR_PROBLEMS]
        return roles

    @override
    def _entry_matches(self, entry: er.RegistryEntry) -> bool:
        return self._problem_filter(entry)

    @override
    def _variables(self, state: State, plant_name: str) -> dict[str, Any]:
        entry = er.async_get(self._hass).async_get(state.entity_id)
        return {
            "problem": None if entry is None else problem_role(entry),
            "problem_name": entity_display_name(state, plant_name),
        }


class NeedsWaterTrigger(_ProblemTrigger):
    """Triggers when a plant starts to need water."""

    _schema = NEEDS_WATER_SCHEMA

    @override
    def _problem_roles(self) -> list[str]:
        return [ROLE_NEEDS_WATER]


class ProblemStartedTrigger(_ProblemTrigger):
    """Triggers when one of the selected problems of a plant starts."""

    _schema = PROBLEM_STARTED_SCHEMA


class ProblemClearedTrigger(_ProblemTrigger):
    """Triggers when one of the selected problems of a plant is over."""

    _schema = PROBLEM_CLEARED_SCHEMA

    @override
    def is_valid_state(
        self, state: State, report_not_triggered: NotTriggeredReasonReporter
    ) -> bool:
        # Clearing is not an alert, so the snooze does not matter.
        return state.state == STATE_OFF

    @override
    def is_valid_transition(self, from_state: State, to_state: State) -> bool:
        return from_state.state == STATE_ON


class CareTaskDueTrigger(_PlantTrigger):
    """Triggers when a care task of a plant becomes due."""

    _schema = CARE_TASK_DUE_SCHEMA

    def __init__(self, hass: HomeAssistant, config: TriggerConfig) -> None:
        super().__init__(hass, config)
        self._task_types = frozenset(self._options[ATTR_TASK_TYPES])

    @override
    def _entry_matches(self, entry: er.RegistryEntry) -> bool:
        return is_task_due_entry(entry)

    @override
    def _alerting(self, state: State) -> bool:
        return (
            super()._alerting(state)
            and state.attributes.get(ATTR_TASK_TYPE) in self._task_types
        )

    @override
    def _variables(self, state: State, plant_name: str) -> dict[str, Any]:
        return {
            "task": entity_display_name(state, plant_name),
            "task_type": state.attributes.get(ATTR_TASK_TYPE),
        }


TRIGGERS: Final[dict[str, type[Trigger]]] = {
    "needs_water": NeedsWaterTrigger,
    "problem_started": ProblemStartedTrigger,
    "problem_cleared": ProblemClearedTrigger,
    "care_task_due": CareTaskDueTrigger,
}


async def async_get_triggers(hass: HomeAssistant) -> dict[str, type[Trigger]]:
    """Return the Smart Plants triggers."""
    return TRIGGERS
