# Entities

Each plant is one Home Assistant device. The device keeps its identity, history and area for as
long as the plant exists. The sensors you assign are inputs you can replace.

## Device

| Property | Value |
| --- | --- |
| Name | The plant name. Renaming the plant renames the device. |
| Manufacturer | Smart Plants |
| Model | The species (common name, else scientific name), or *Plant* without a species. |
| Area | Set in the wizard, the panel or the device page. |

Your own edits on the device page, such as name, area and labels, stay.

## Entity names and IDs

The friendly name is the plant name plus the entity name, for example *Monstera Needs water*.
Home Assistant creates the entity ID from it once, for example
`binary_sensor.monstera_needs_water`. Renaming the plant later keeps the entity IDs. Check the
real IDs on the device page (**⋮ > Open device** in the panel).

## When entities are created

- **Soil moisture entities** come with every plant: *Soil moisture*, *Health score*,
  *Needs water*, *Too wet*, *Sensor stale* and the three moisture numbers.
- **Watering entities** come with every plant: the *Last watered* sensor and the *Watered*
  button.
- **Other readings** get their sensor and problem sensor when you assign the first sensor.
  When you remove all sensors, the entities stay and read unavailable, so their history stays.
- **Care task entities** exist while the task exists. *Care due* exists while the plant has a
  care task.
- **All plants** exists once for the whole integration.

All entities are enabled by default, except the moisture numbers, *Last watered*, the
[buttons](#buttons) and the *next due* and *last done* sensors of care tasks. To use one,
enable it on the device page. Deleting a plant removes its device and entities.

## Sensors

| Entity | Created | Unit | Device class | Attributes |
| --- | --- | --- | --- | --- |
| Soil moisture | Always | % | moisture | `min_threshold_percent`, `target_threshold_percent`, `max_threshold_percent` |
| Health score | Always | % | | `configured`, `contributors`, `confidence`, `confidence_label` |
| Temperature | First temperature sensor | °C | temperature | |
| Humidity | First humidity sensor | % | humidity | |
| Illuminance | First illuminance sensor | lx | illuminance | |
| Conductivity | First conductivity sensor | µS/cm | conductivity | |
| Soil temperature | First soil temperature sensor | °C | temperature | |
| CO2 | First CO₂ sensor | ppm | carbon_dioxide | |
| Battery | First battery sensor | % | battery | |
| Last watered | Always, disabled | | timestamp | |

The reading sensors have the *measurement* state class, so Home Assistant keeps long-term
statistics. *Battery* is a diagnostic entity. A sensor is unavailable while its reading has no
valid value.

- The `*_threshold_percent` attributes of *Soil moisture* are the moisture limits in effect.
  Dashboards can read them without the number entities.
- *Last watered* is the time of the last logged watering, the same as the `last_watered`
  attribute of *Needs water*. It's unknown before the first watering.
- On *Health score*, `configured` lists the readings with sensors (never battery),
  `contributors` the readings in the current score, `confidence` their share from 0 to 1, and
  `confidence_label` is `high` (all), `medium` (at least half), `low` (fewer than half) or
  `unknown` (none).

## Binary sensors

These binary sensors have the *problem* device class. On means there is a problem.

| Entity | Created | Attributes |
| --- | --- | --- |
| Needs water | Always | `last_watered` |
| Too wet | Always | |
| Sensor stale | Always | `sources`, `input_problems`, `photo_id` |
| Temperature stress | First temperature sensor | `reason`, `confidence`, `cold_threshold_celsius`, `cold_clear_celsius`, `hot_threshold_celsius`, `hot_clear_celsius` |
| Humidity stress | First humidity sensor | `reason`, `confidence`, `dry_threshold_percent`, `dry_clear_percent`, `damp_threshold_percent`, `damp_clear_percent` |
| Low light | First illuminance sensor | `reason`, `confidence`, `sample_count`, `target_lux`, `clear_lux` |
| Conductivity stress | First conductivity sensor | `reason`, `confidence`, `low_threshold_micro_siemens_per_cm`, `low_clear_micro_siemens_per_cm`, `high_threshold_micro_siemens_per_cm`, `high_clear_micro_siemens_per_cm` |
| Soil temperature stress | First soil temperature sensor | `reason`, `confidence`, `cold_threshold_celsius`, `cold_clear_celsius`, `hot_threshold_celsius`, `hot_clear_celsius` |
| CO2 stress | First CO₂ sensor | `reason`, `confidence`, `threshold_ppm`, `clear_ppm` |
| Low battery | First battery sensor | `reason`, `confidence`, `threshold_percent`, `clear_percent` |

*Low battery* is a diagnostic entity. Every binary sensor of a plant, including the care task
ones, also has `snoozed` and `snoozed_until` (see [Snoozed plants](#snoozed-plants)).

- `last_watered`: the last logged watering as an ISO timestamp, or `null`.
- `sources`: how many soil moisture sensors the plant has. It tells a plant without a moisture
  sensor from one whose sensor stopped.
- `input_problems`: the other sensors that make the plant show *No recent data*, by reading,
  for example `{"temperature": "stale"}`. Values are `stale`, `unavailable` and
  `no_main_sensor`. Battery and light at night never appear.
- `photo_id`: the ID of the plant's photo, or `null`.
- `reason`: why the sensor has its state. It's the problem while on, for example `cold_stress`,
  `dry_stress` or `low_light`. While off it's `temperature_ok`, `enough_light`, `nighttime` or
  the like.
- `confidence`: `low` when the reading was evaluated, `none` when it wasn't, for example at
  night.
- The threshold attributes are the limits in effect, built in or your own.
- `sample_count`: the daytime light samples *Low light* uses. Not recorded in history.

*Needs water* and *Too wet* are unavailable without a valid moisture reading. *Sensor stale*
stays available. It's off without moisture sensors and on while one is not updating.

## Number entities

| Entity | Unit | Range | Category |
| --- | --- | --- | --- |
| Moisture minimum | % | 1–99 | Configuration |
| Moisture target | % | 1–99 | Configuration |
| Moisture maximum | % | 1–99 | Configuration |

These are disabled by default. The panel doesn't need them. To change a limit from an
automation, enable the entity on the device page and use `number.set_value`. A value that
breaks minimum < target < maximum, at least 4 apart, fails and changes nothing.

## Buttons

All buttons are disabled by default. Enable one on the device page to put it on a dashboard or
press it from an automation with `button.press`.

| Entity | Created | Press |
| --- | --- | --- |
| Watered | Always | Logs a watering now, like **Watered** on the [dashboard card](dashboard-card.md). |
| *Done* of a care task, for example *Fertilize done* | Per care task | Marks the task as done now, like **Mark as done** in the panel. |

A press logs care the same way as the [`smart_plants.log_care`](automations.md#actions)
action, without a note. A logged watering keeps *Needs water* off for 24 hours, see
[Sensors and health](sensors-and-health.md). The buttons are unavailable while the plant is
paused. When the care can't be saved, for example because the storage is full, the press
fails with a message and nothing is logged.

## All plants

`binary_sensor.smart_plants_all_plants` (*All plants*) belongs to no plant. It has the
*problem* device class and is on while at least one plant needs water, has a problem or has a
care task due. Snoozed and paused plants don't count.

As a target in Smart Plants triggers, conditions and actions, it means every plant, including
plants you add later. See [Targets](automations.md#targets).

## Care tasks

Each care task has its own entities. Renaming the task or changing its schedule keeps them.

| Entity | Platform | Enabled | Attributes |
| --- | --- | --- | --- |
| The task, for example *Fertilize* | Binary sensor | Yes | `status`, `next_due`, `last_done`, `task_type` |
| *Next due* of the task | Sensor, timestamp | No | |
| *Last done* of the task | Sensor, timestamp | No | |
| *Done* of the task | Button | No | |
| Care due | Binary sensor | Yes | `due_tasks`, `resting` |

The task binary sensor is named after the task type or your own name. It's on (*Due*) on the
due day and while overdue. It has no device class, because a due task is a reminder.

- `status`: `scheduled`, `due`, `overdue`, `resting`, `done` or `skipped` (yearly window
  handled) or `missed` (yearly window closed without a Done). Reading tasks use `due`,
  `watching`, `waiting` and `no_reading`.
- `next_due` and `last_done`: dates as `YYYY-MM-DD`, or `null`. Reading tasks have no
  `next_due`.
- `task_type`: `fertilize`, `prune`, `repot`, `pests`, `winter_protection` or `custom`.

The *Next due* sensor is midnight of the due day in Home Assistant's time zone. Date tasks have
it, reading tasks don't. It has no state class. Enable it to use it, for example in a time
trigger with `offset: "-48:00:00"` for two days before.

The *Last done* sensor is the time of the task's last Done, or midnight of the *last done* date
you entered for the task when that is later. It's unknown without either. Skipping doesn't count.
Every task has it, also reading tasks. The *Done* button is described under
[Buttons](#buttons).

*Care due* is on while a task of the plant is due. `due_tasks` lists their names, and `resting`
is `true` inside the rest period.

Smart Plants updates the task states when a task, the care log or the rest period changes, just
after midnight, and when a reading changes.

### Reading task attributes

A task with a reading schedule also has:

| Attribute | Value |
| --- | --- |
| `reading` | The current reading in the task's unit, or `null`. Not recorded. |
| `unit`, `condition`, `value`, `reset_value` | The task's settings. `condition` is `below` or `above`. |
| `source` | The role, sensor entity ID or weather entity ID it watches. |
| `due_since` | When it last became due, or `null`. |
| `due_at` | While **Only after** counts, when it becomes due, else `null`. |
| `forecast` | Forecast tasks only: `low` or `high`. Not recorded. |
| `forecast_until` | Forecast tasks only: how far the forecast reaches, or `null`. Not recorded. |

A reading task becomes due when the reading stays past `value` for **Only after**. While that
count runs, `status` is `watching`. The task stops being due at `reset_value`. After Done it's `waiting` until the reading
reaches `reset_value`. Without a usable reading nothing changes, and `status` is `no_reading`.
The state survives a restart, the **Only after** count doesn't.

## Snoozed plants

A snooze keeps every entity's real state. Each binary sensor of the plant gets:

| Attribute | Value |
| --- | --- |
| `snoozed` | `true` while snoozed, otherwise `false` |
| `snoozed_until` | The end as a UTC timestamp such as `2026-11-01T22:59:59Z`, or `null` |

Sensors have no snooze attributes. The recorder doesn't store them. An unavailable binary
sensor shows no attributes, so a state condition on `snoozed: false` doesn't match then. The
*Plant is not snoozed* condition avoids that, see [Conditions](automations.md#conditions).

## Paused plants

A paused plant's entities stay registered and become unavailable until you resume it. Home
Assistant keeps their history.

## Not exposed as entities

The care log, species data and photos live in the panel. Use the
[actions](automations.md#actions) or the [buttons](#buttons) to log care from automations.
