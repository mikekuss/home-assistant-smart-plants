"""
Automation conditions for plants.

Conditions report the real state of the plant entities; whether a plant is
snoozed is its own condition. Unavailable entities are left out, so a paused
plant never counts. Unlike Home Assistant's own conditions, a condition fails
when no targeted plant is available instead of passing with nothing to check.

Without a target a condition checks every plant. Conditions that look at more
than one sensor group them by plant first, so ``all`` means every targeted
plant, not every sensor.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import timedelta
from typing import TYPE_CHECKING, Any, ClassVar, Final, Unpack, override

from homeassistant.const import CONF_FOR, STATE_ON
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.condition import (
    Condition,
    ConditionCheckParams,
    ConditionConfig,
)
from homeassistant.util import dt as dt_util

from .automation_targets import (
    ATTR_TASK_TYPE,
    PROBLEM_ROLES,
    ROLE_NEEDS_WATER,
    TASK_TYPES,
    EntryFilter,
    group_by_plant,
    is_available,
    is_task_due_entry,
    multi_select,
    options_schema,
    plant_binary_sensor_filter,
    plant_snoozed,
    problem_filter,
    resolve_entities,
)
from .report import INCLUDE_OPTIONS, collect_plants, select_plants
from .schema_library import vol

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant, State
    from homeassistant.helpers.typing import ConfigType

ATTR_BEHAVIOR: Final = "behavior"
BEHAVIOR_ANY: Final = "any"
BEHAVIOR_ALL: Final = "all"
ATTR_INCLUDE: Final = "include"
ATTR_INCLUDE_SNOOZED: Final = "include_snoozed"
ATTR_PROBLEMS: Final = "problems"
ATTR_TASK_TYPES: Final = "task_types"


_BEHAVIOR = {
    vol.Optional(ATTR_BEHAVIOR, default=BEHAVIOR_ANY): vol.In(
        [BEHAVIOR_ANY, BEHAVIOR_ALL]
    )
}

NEEDS_WATER_SCHEMA: Final = options_schema(
    {**_BEHAVIOR, vol.Optional(CONF_FOR): cv.positive_time_period}
)
HAS_PROBLEM_SCHEMA: Final = options_schema(
    {
        vol.Optional(ATTR_PROBLEMS, default=list(PROBLEM_ROLES)): multi_select(
            PROBLEM_ROLES
        ),
        **_BEHAVIOR,
    }
)
CARE_TASK_DUE_SCHEMA: Final = options_schema(
    {
        vol.Optional(ATTR_TASK_TYPES, default=list(TASK_TYPES)): multi_select(
            TASK_TYPES
        ),
        **_BEHAVIOR,
    }
)
IS_NOT_SNOOZED_SCHEMA: Final = options_schema(_BEHAVIOR)
NEEDS_ATTENTION_SCHEMA: Final = options_schema(
    {
        vol.Optional(ATTR_INCLUDE, default=list(INCLUDE_OPTIONS)): multi_select(
            INCLUDE_OPTIONS
        ),
        vol.Optional(ATTR_INCLUDE_SNOOZED, default=False): cv.boolean,
    }
)


def _matches(behavior: str, results: Iterable[bool]) -> bool:
    """Apply ``behavior``; nothing to check fails."""
    values = list(results)
    if not values:
        return False
    return all(values) if behavior == BEHAVIOR_ALL else any(values)


class _PlantCondition(Condition):
    """Base for the Smart Plants conditions."""

    _schema: ClassVar[vol.Schema]

    @override
    @classmethod
    async def async_validate_config(
        cls, hass: HomeAssistant, config: ConfigType
    ) -> ConfigType:
        validated: ConfigType = cls._schema(config)
        return validated

    def __init__(self, hass: HomeAssistant, config: ConditionConfig) -> None:
        super().__init__(hass, config)
        self._target = config.target
        self._options: dict[str, Any] = config.options or {}
        self._behavior: str = self._options.get(ATTR_BEHAVIOR, BEHAVIOR_ANY)

    def _available_states(self, entry_filter: EntryFilter) -> dict[str, State]:
        """Return the available states of the targeted matching entities."""
        states: dict[str, State] = {}
        for entity_id in resolve_entities(self._hass, self._target, entry_filter):
            state = self._hass.states.get(entity_id)
            if state is not None and is_available(state):
                states[entity_id] = state
        return states

    def _by_plant(
        self,
        entry_filter: EntryFilter,
        passes: Callable[[State], bool],
        counts: Callable[[State], bool] = lambda _state: True,
    ) -> bool:
        """
        Apply ``behavior`` to plants: a plant passes if any of its states do.

        Only states for which ``counts`` is true take part.
        """
        states = {
            entity_id: state
            for entity_id, state in self._available_states(entry_filter).items()
            if counts(state)
        }
        return _matches(
            self._behavior,
            (
                any(passes(states[entity_id]) for entity_id in ids)
                for ids in group_by_plant(self._hass, states).values()
            ),
        )


class NeedsWaterCondition(_PlantCondition):
    """Passes when targeted plants need water."""

    _schema = NEEDS_WATER_SCHEMA
    _entry_filter = staticmethod(problem_filter([ROLE_NEEDS_WATER]))

    @override
    def _async_check(self, **kwargs: Unpack[ConditionCheckParams]) -> bool:
        duration: timedelta | None = self._options.get(CONF_FOR)
        cutoff = dt_util.utcnow() - duration if duration else None

        def needs_water(state: State) -> bool:
            # The snooze only changes attributes, so last_changed is when the
            # sensor turned on.
            return state.state == STATE_ON and (
                cutoff is None or state.last_changed <= cutoff
            )

        states = self._available_states(self._entry_filter)
        return _matches(
            self._behavior, (needs_water(state) for state in states.values())
        )


class HasProblemCondition(_PlantCondition):
    """Passes when targeted plants have one of the selected problems."""

    _schema = HAS_PROBLEM_SCHEMA

    @override
    def _async_check(self, **kwargs: Unpack[ConditionCheckParams]) -> bool:
        return self._by_plant(
            problem_filter(self._options[ATTR_PROBLEMS]),
            lambda state: state.state == STATE_ON,
        )


class CareTaskDueCondition(_PlantCondition):
    """Passes when targeted plants have a due care task of the selected types."""

    _schema = CARE_TASK_DUE_SCHEMA

    @override
    def _async_check(self, **kwargs: Unpack[ConditionCheckParams]) -> bool:
        task_types = frozenset(self._options[ATTR_TASK_TYPES])
        return self._by_plant(
            is_task_due_entry,
            lambda state: state.state == STATE_ON,
            # Tasks of other types do not count, not even as "not due".
            lambda state: state.attributes.get(ATTR_TASK_TYPE) in task_types,
        )


class IsNotSnoozedCondition(_PlantCondition):
    """Passes when the alerts of targeted plants are not snoozed."""

    _schema = IS_NOT_SNOOZED_SCHEMA

    @override
    def _async_check(self, **kwargs: Unpack[ConditionCheckParams]) -> bool:
        states = self._available_states(plant_binary_sensor_filter)
        return _matches(
            self._behavior,
            (
                plant_snoozed(states[entity_id] for entity_id in ids) is False
                for ids in group_by_plant(self._hass, states).values()
            ),
        )


class NeedsAttentionCondition(_PlantCondition):
    """Passes when the plant report for the target would list a plant."""

    _schema = NEEDS_ATTENTION_SCHEMA

    @override
    def _async_check(self, **kwargs: Unpack[ConditionCheckParams]) -> bool:
        selection = select_plants(
            collect_plants(self._hass, self._target),
            include=self._options[ATTR_INCLUDE],
            include_snoozed=self._options[ATTR_INCLUDE_SNOOZED],
        )
        return bool(selection.plants)


CONDITIONS: Final[dict[str, type[Condition]]] = {
    "needs_water": NeedsWaterCondition,
    "has_problem": HasProblemCondition,
    "care_task_due": CareTaskDueCondition,
    "is_not_snoozed": IsNotSnoozedCondition,
    "needs_attention": NeedsAttentionCondition,
}


async def async_get_conditions(hass: HomeAssistant) -> dict[str, type[Condition]]:
    """Return the Smart Plants conditions."""
    return CONDITIONS
