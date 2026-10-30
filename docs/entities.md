# Entities

Every plant is one Home Assistant **device**. The device is the long-lived object: it keeps
its identity, history, area, and your customizations for as long as the plant exists. The
sensors you assign are replaceable inputs; you can swap hardware without losing the plant or
its entity history.

## Device

| Property | Value |
| --- | --- |
| Name | The plant name. Renaming the plant in the panel renames the device. |
| Manufacturer | Smart Plants |
| Model | The species name (common name, or the Latin name if there is no common name) when a species is set, otherwise *Plant*. It follows species changes. |
| Area | Set in the creation wizard, the panel, or the device page. |

You can change the device's name, area, and labels on the Home Assistant device page as
usual. Smart Plants does not overwrite those edits.

## Naming and entity IDs

Entities use Home Assistant's device-based naming: the friendly name is the plant name
followed by the entity name, for example *Monstera Needs water*.

Home Assistant generates the entity IDs from those names when it first creates an entity.
For a plant called "Monstera" on an English-language system you get IDs like:

- `sensor.monstera_soil_moisture`
- `sensor.monstera_health_score`
- `binary_sensor.monstera_needs_water`
- `number.monstera_moisture_minimum`

Renaming the plant later does not change existing entity IDs. Check the actual IDs on the
plant's device page (**Open device** in the plant's **⋮** menu in the panel) before using
them in automations. You can rename entity IDs in Home Assistant like any other entity.

## When entities are created

- **Soil moisture entities** (the moisture sensor, health score, *Needs water*, *Too wet*,
  *Sensor stale*, and the three moisture number entities) come with every plant, even before
  you assign a sensor.
- **Other roles** (temperature, humidity, illuminance, conductivity, soil temperature, CO₂,
  battery) get their sensor and problem indicator the first time you assign a source to that
  role. If you later remove all sources, the entities stay (and read unavailable) so their
  history and your customizations are kept.
- **All plants** exists once for the whole integration, whether or not you have plants (see
  [All plants](#all-plants)).
- **Care task entities** appear when you add a care task and go away when you delete it. *Care due* exists while the plant has at least one care task (see
  [Care tasks](#care-tasks)).

All entities are enabled by default, except the three moisture number entities and the
*next due* sensors of care tasks, which start disabled (see
[Number entities](#number-entities) and [Care tasks](#care-tasks)). Deleting a plant removes
its device and all of its entities.

## Sensors

| Entity name | Created | Unit | Device class | Category | Attributes |
| --- | --- | --- | --- | --- | --- |
| Soil moisture | Always | % | moisture | none | `min`, `target`, `max` |
| Health score | Always | % | none | none | `confidence`, `confidence_label`, `contributors`, `configured` |
| Temperature | First temperature source | °C | temperature | none | none |
| Humidity | First humidity source | % | humidity | none | none |
| Illuminance | First illuminance source | lx | illuminance | none | none |
| Conductivity | First conductivity source | µS/cm | conductivity | none | none |
| Soil temperature | First soil temperature source | °C | temperature | none | none |
| CO2 | First CO₂ source | ppm | carbon_dioxide | none | none |
| Battery | First battery source | % | battery | Diagnostic | none |

All sensors have the *measurement* state class, so Home Assistant records long-term
statistics for them. A sensor is unavailable when its role has no valid value (see
[Sensors and health](sensors-and-health.md)).

The `min`, `target` and `max` attributes of *Soil moisture* are the moisture thresholds in
effect, in percent (built-in, from the species, or your override). Dashboards and templates
can read them without enabling the [number entities](#number-entities).

## Binary sensors

All binary sensors on this table use the *problem* device class: **on** means there is a
problem. The care task binary sensors are described under [Care tasks](#care-tasks).

| Entity name | Created | Category | Attributes |
| --- | --- | --- | --- |
| Needs water | Always | none | `last_watered` |
| Too wet | Always | none | none |
| Sensor stale | Always | none | none |
| Temperature stress | First temperature source | none | `confidence`, `reason`, `cold_threshold_celsius`, `cold_clear_celsius`, `hot_threshold_celsius`, `hot_clear_celsius` |
| Humidity stress | First humidity source | none | `confidence`, `reason`, `dry_threshold_percent`, `dry_clear_percent`, `damp_threshold_percent`, `damp_clear_percent` |
| Low light | First illuminance source | none | `confidence`, `reason`, `sample_count`, `target_lux`, `clear_lux` |
| Conductivity stress | First conductivity source | none | `confidence`, `reason`, `low_threshold_micro_siemens_per_cm`, `low_clear_micro_siemens_per_cm`, `high_threshold_micro_siemens_per_cm`, `high_clear_micro_siemens_per_cm` |
| Soil temperature stress | First soil temperature source | none | `confidence`, `reason`, `cold_threshold_celsius`, `cold_clear_celsius`, `hot_threshold_celsius`, `hot_clear_celsius` |
| CO2 stress | First CO₂ source | none | `confidence`, `reason`, `threshold_ppm`, `clear_ppm` |
| Low battery | First battery source | Diagnostic | `confidence`, `reason`, `threshold_percent`, `clear_percent` |

Every binary sensor of a plant, including the care task ones, also has the attributes
`snoozed` and `snoozed_until`; see [Snoozed plants](#snoozed-plants).

The threshold attributes show the thresholds currently in effect (built-in or your override).
The `reason` attribute explains the current state, for example `cold_stress`, `hot_stress`,
`temperature_ok`, `low_light`, `enough_light`, `nighttime`, or `battery_ok`.

`last_watered` on *Needs water* is when the plant was last watered, as an ISO timestamp, or
`null` before the first watering. It changes with every watering you log, also from the
**Watered** button or the `smart_plants.log_care` action.

*Needs water* and *Too wet* are unavailable while there is no valid moisture reading.
*Sensor stale* stays available: it's off when no moisture sensor is assigned and on while any
assigned moisture sensor is stale.

## All plants

Smart Plants also adds one *All plants* binary sensor
(`binary_sensor.smart_plants_all_plants`, *Alle Pflanzen* in German). It belongs to no plant
device, has the device class `problem` and no attributes.

It's on while at least one plant needs water, has a problem or has a care task due. Snoozed
and paused plants don't count, the same as the
[*Plants need attention*](automations.md#smart-plants-triggers-and-conditions) condition with
its defaults. With no plants it's off. You can show it on a dashboard as "a plant needs
something".

As a target in Smart Plants triggers, conditions and the plant report it means every plant,
including plants you add later (see [Targets](automations.md#targets)).

## Number entities

| Entity name | Created | Unit | Range | Category |
| --- | --- | --- | --- | --- |
| Moisture minimum | Always | % | 1–99, step 1 | Configuration |
| Moisture target | Always | % | 1–99, step 1 | Configuration |
| Moisture maximum | Always | % | 1–99, step 1 | Configuration |

These entities are **disabled by default**. You don't need them to edit thresholds: the panel
edits them directly, and health detection works the same whether they are enabled or not.
Enable them if you want to read or change a threshold from an automation or a dashboard: open
the plant's device page, expand the hidden entities in the **Configuration** card, select the
entity, open its settings (cog icon), and turn on **Enabled**. You can also find them under
**Settings → Devices & services → Entities** with the disabled-entities filter. Home Assistant
adds the entity after a short delay.

Plants created before this default keep their number entities enabled.

These show the effective moisture thresholds. Setting a value stores it as a per-plant
override, the same as editing it in the panel. A value that would break
minimum < target < maximum (with at least 4 points between minimum and maximum) fails, and
nothing changes.

## Care tasks

Each care task gets its own entities. They belong to the task, not to its name or type, so renaming a task or changing its schedule keeps the same entities, entity IDs, and
history.

| Entity | Platform | Created | Enabled | Device class | Attributes |
| --- | --- | --- | --- | --- | --- |
| Task (for example *Fertilize*) | Binary sensor | Per care task | Yes | none | `status`, `next_due`, `last_done`, `task_type`; reading tasks also `reading`, `unit`, `condition`, `value`, `reset_value`, `source`, `due_since`, `due_at`; forecast tasks also `forecast`, `forecast_until` |
| Task *next due* | Sensor | Per care task with a date schedule | No | timestamp | none |
| Care due | Binary sensor | While the plant has a care task | Yes | none | `due_tasks`, `resting` |

**Task binary sensor.** Named after the task type (*Fertilize*, *Prune*, *Repot*, *Check for
pests*, *Winter protection*), or after the task's own name when it has one (always for custom
tasks). Its state reads *Due* (on) on the day the task is due and while it is overdue, and *Not due* (off)
otherwise. It has no device class, because a due task is a reminder rather than a problem.

- `status`: `scheduled` (not due yet), `due` (due today, or inside its yearly window),
  `overdue`, `resting` (paused during the rest period), `done` or `skipped` (this year's
  window of a yearly task is handled), or `missed` (a yearly window closed without being
  handled). Reading tasks use `due`, `watching`, `waiting`, and `no_reading` instead (see
  [Reading tasks](#reading-tasks)).
- `next_due`: the date the task is next due (`YYYY-MM-DD`), or `null`; always `null` for
  reading tasks.
- `last_done`: the local date the task was last done (`YYYY-MM-DD`), or `null`.
- `task_type`: `fertilize`, `prune`, `repot`, `pests`, `winter_protection`, or `custom`.

**Next due sensor.** A timestamp sensor whose value is midnight, in the Home Assistant time
zone, of the day the task is next due. It reads unknown when there is no next due date. It is
**disabled by default**; enable it on the plant's device page like the
[number entities](#number-entities) when you want to use it in an automation or a dashboard.

Example: a reminder two days before fertilizing is due, using the enabled next due sensor
(check the actual entity IDs on the device page). The time trigger's `offset` takes a
duration such as `"-48:00:00"` for two days before:

```yaml
automation:
  - alias: "Fertilizer reminder"
    triggers:
      - trigger: time
        at:
          entity_id: sensor.monstera_fertilize_next_due
          offset: "-48:00:00"
    actions:
      - action: notify.notify
        data:
          message: "The Monstera needs fertilizer in two days."
```

**Care due.** On while any of the plant's care tasks is due or overdue.

- `due_tasks`: the names of the tasks that are due, in the Home Assistant language.
- `resting`: `true` while today is inside the plant's rest period.

Smart Plants recomputes the states when a task, the care history or the rest period changes,
just after midnight every day, and when the Home Assistant time zone changes. You edit tasks
and the rest period in the panel.

### Reading tasks

A care task can follow a sensor reading instead of a date, for example *Winter protection*
when the temperature drops below 5 °C. Such a task watches either one of the plant's roles
(temperature, humidity, soil moisture, illuminance, conductivity, soil temperature, or CO2,
using the plant's combined value in °C, %, lx, µS/cm, or ppm), one sensor entity, or the
forecast low or high temperature of a weather entity (see
[Forecast readings](#forecast-readings)). Any task type can use a reading schedule. You create
and edit reading tasks in the panel (see
[Reading tasks](getting-started.md#reading-tasks)) or through the
`smart_plants/care_tasks/create` WebSocket command.

How a reading task behaves:

- It becomes due when the reading is strictly below (or above) the value. With *only after*
  set, the reading has to stay there for that many minutes first; a reading back on the other
  side starts the count again. While the count runs, `status` is `watching` and `due_at` is
  when the task becomes due.
- It stops being due on its own when the reading reaches the reset value (the value itself
  unless a reset value is set). Between the value and the reset value it stays due.
- Marking it as done (in the panel or with `smart_plants.log_care` on its entity) turns it
  off and sets `status` to `waiting` until the reading reaches the reset value. After that it
  watches again. A Done logged for a time before the task was last armed again does not
  count. Removing the Done again (Undo) makes the task due at once if the reading is still
  past the value.
- It cannot be skipped; `smart_plants.skip_care_task` rejects it.
- Without a usable reading (the sensor is unavailable, unknown, not a number, in a unit that
  cannot be converted, or the role has no current value), nothing changes: a due task stays
  on, a waiting task stays waiting, and `status` is `no_reading`.
- Smart Plants converts a sensor's reading into the unit of the task's value when the sensor's
  device class allows it, for example from °F to °C.
- The rest period does not affect reading tasks, and they do not change at midnight.
- While the plant is paused, its entities are unavailable and Smart Plants doesn't track its
  reading tasks. They keep their state and run again as soon as you resume the plant.
- Reading tasks have no *next due* sensor. Switching a task to a reading schedule removes it;
  switching back creates it again, disabled.
- Changing the source, condition, value, unit, reset value, or *only after* starts the task
  over: not due and not waiting. Renaming it or editing its instructions keeps its state.

Additional attributes of a reading task's binary sensor:

- `reading`: the current reading in the task's unit, rounded to two decimals, or `null`
  without a usable reading.
- `unit`, `condition` (`below` or `above`), `value`, `reset_value`: the task's settings.
- `source`: the role name, the sensor entity ID, or the weather entity ID the task watches.
- `due_since`: when the task last became due, or `null` while it is not due.
- `due_at`: while an *only after* count runs, when the task becomes due; otherwise `null`.
- `forecast` (forecast tasks only): `low` or `high`, the forecast temperature the task watches.
- `forecast_until` (forecast tasks only): the end of the part of the look-ahead window the
  forecast covers, or `null` without a usable forecast. It is earlier than the window's end
  when the weather entity's forecast does not reach that far.

`reading`, `forecast`, and `forecast_until` are not recorded in history.

Whether a reading task is due, waiting, or armed is kept across restarts. The *only after*
count is not: after a restart it starts again from the first reading past the value.

#### Forecast readings

A reading task can watch a weather entity's forecast instead of a sensor, for example to be
reminded about frost before it arrives. Its reading is the lowest (`low`) or highest (`high`)
forecast temperature over the next 24, 48, or 72 hours, in the weather entity's temperature
unit.

- Smart Plants picks the forecast type: the finest one the weather entity offers (hourly, then
  twice daily, then daily) that reaches the end of the window. If none reaches it, it uses the
  finest one for the part it covers, and `forecast_until` tells how far that is.
  If fetching one type fails, Smart Plants tries the next one.
- Hourly forecasts use each hour's temperature. Twice-daily and daily forecasts use every
  period that overlaps the window, with the period's low temperature for `low` when the
  weather entity provides one.
- Smart Plants fetches the forecast when the task starts, every 30 minutes, and when the
  weather entity changes, at most once every 5 minutes. You can change the 30 minutes with
  **Forecast refresh interval** in the [integration options](installation.md#options)
  (15 to 180 minutes). Tasks that use the same weather entity
  share one fetch. While no task of an active plant uses a forecast, nothing is fetched.
- *Only after* is not available: a forecast already looks ahead, so the task becomes due at
  the first fetch that is past the value.
- Without a usable forecast (the weather entity is missing or unavailable, offers no
  forecast, every forecast type fails or is empty, or none of it lies in the window),
  `status` is `no_reading`, as for a sensor without a reading.

## Snoozed plants

A snooze, set with the [`smart_plants.snooze`](automations.md#snooze-alerts) action, mutes a
plant's alerts without changing any entity. While it lasts, every binary sensor of the plant
(*Needs water*, *Too wet*, *Sensor stale*, *Low light*, *Low battery*, the stress sensors, the
care task *due* sensors and *Care due*) keeps its real state and has these attributes:

| Attribute | Value |
| --- | --- |
| `snoozed` | `true` while the plant is snoozed, otherwise `false` |
| `snoozed_until` | When the snooze ends, as a UTC timestamp such as `2026-11-01T22:59:59Z`, otherwise `null` |

Sensors such as soil moisture, the health score, or *next due* have no snooze attributes:
they are values, not alerts. The snooze adds no entity. The recorder doesn't store the two
attributes, so history and the logbook don't show them. Automations read them from the current
state. While a binary sensor is unavailable (for example without a valid moisture reading),
Home Assistant shows no attributes for it, so `snoozed` is missing then; a state condition on
`snoozed: false` doesn't match in that case.

The Smart Plants triggers skip snoozed plants by themselves, and the *Plant is not snoozed*
condition checks the snooze without attributes (see
[Smart Plants triggers and conditions](automations.md#smart-plants-triggers-and-conditions)).
It reads the snooze from any available binary sensor of the plant. If you use the entities
directly, a state condition on the attribute keeps an automation quiet during a snooze:

```yaml
conditions:
  - condition: state
    entity_id: binary_sensor.aloe_needs_water
    attribute: snoozed
    state: false
```

## Paused plants

When you pause a plant in the panel (**Pause monitoring**), all of its entities stay
registered but become unavailable until you resume it (**Resume monitoring**). Home Assistant
keeps their history. Pausing a plant also ends its snooze.

## Not exposed as entities

Care history (watering, fertilizing, and so on), species information, and photos are managed
in the panel and are not exposed as entities. Care tasks are exposed as described under
[Care tasks](#care-tasks).
