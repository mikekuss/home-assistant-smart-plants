# Automations

Smart Plants adds triggers, conditions and actions to the automation editor, under
**Smart Plants**. You target plants, areas, floors, labels or *All plants*, without entity IDs
or templates. For two ready-made notifications, see [Notifications](notifications.md).

> [!IMPORTANT]
> Smart Plants never switches pumps, valves or other devices. Watering happens only in
> automations you write.

The `device_id` values below are placeholders. Pick the plant in the visual editor, then switch
to YAML to see its ID. Replace `notify.mobile_app_my_phone` with your own notification action.

## See which automations use a plant

The **Automations** card on a plant's **Overview** tab lists the automations that name the
plant or one of its entities, with when each last ran. **For all plants** lists the ones that
use *All plants*. Select a row to open the automation. *Off* marks a turned-off automation, and
*Defined in YAML* one without an `id`, which the editor can't open.

The card has **Open device**, **Create automation** and **Set up notifications**. It doesn't
find automations that reach the plant only through its area, floor, label, an assigned source
sensor or a template.

## Triggers

| Trigger | Fires when | Options |
| --- | --- | --- |
| *Plant needs water* (`smart_plants.needs_water`) | A plant starts to need water. | **Trigger when**, **For at least**, **Also while snoozed** |
| *Plant problem started* (`smart_plants.problem_started`) | A selected problem starts. | **Problems** (default all), **For at least**, **Also while snoozed** |
| *Plant problem cleared* (`smart_plants.problem_cleared`) | A selected problem is over. | **Problems**, **For at least** |
| *Care task became due* (`smart_plants.care_task_due`) | A care task of the selected types becomes due. | **Task types** (default all), **For at least**, **Also while snoozed** |

The problems are `needs_water`, `too_wet`, `sensor_stale`, `temperature_stress`,
`humidity_stress`, `soil_temperature_stress`, `conductivity_stress`, `co2_stress`, `low_light`
and `low_battery`.

- A trigger fires when a problem starts, never when an entity comes back from unavailable. A
  restart, resuming a plant or a sensor that reconnects doesn't fire.
- Triggers skip snoozed plants. If the problem is still there when the snooze ends, the trigger
  fires once. **Also while snoozed** ignores the snooze. *Plant problem cleared* always ignores
  it.
- **For at least** waits until the problem has lasted that long. The problem ending, a snooze
  or deleting the plant cancels the wait.
- Date tasks become due just after midnight. Reading tasks become due once the reading has
  stayed past their value for **Only after**.

The triggers set these variables, next to Home Assistant's own `trigger.entity_id`,
`trigger.from_state`, `trigger.to_state` and `trigger.for`:

| Variable | Value |
| --- | --- |
| `trigger.plant` | The plant's device name. |
| `trigger.device_id` | The plant's device ID. |
| `trigger.problem` | The problem key, for example `too_wet`. |
| `trigger.problem_name` | The problem entity's name without the plant name, for example *Too wet*. |
| `trigger.task` | The task entity's name without the plant name, for example *Fertilize*. |
| `trigger.task_type` | The task type, for example `winter_protection`. |

## Conditions

| Condition | Passes when | Options |
| --- | --- | --- |
| *Plant needs water* (`smart_plants.needs_water`) | The targeted plants need water. | **Condition passes if** (any or all), **For at least** |
| *Plant has a problem* (`smart_plants.has_problem`) | The plants have a selected problem. | **Problems**, **Condition passes if** |
| *Care task is due* (`smart_plants.care_task_due`) | The plants have a due task of the selected types. | **Task types**, **Condition passes if** |
| *Plant is not snoozed* (`smart_plants.is_not_snoozed`) | The plants' alerts aren't snoozed. | **Condition passes if** |
| *Plants need attention* (`smart_plants.needs_attention`) | The [plant report](#plant-report) with the same target and options lists a plant. | **Include**, **Include snoozed plants** |

- Conditions check the real state, so a snoozed plant passes *Plant needs water*. Add *Plant is
  not snoozed* to stay quiet during a snooze. To test for a snooze, put it in a **Not**
  condition.
- Paused plants and unavailable entities don't count. When no targeted plant is available, the
  condition fails.
- "All" means every targeted plant, not every sensor.

## Targets

- A target can be plant devices, areas, floors, labels or Smart Plants entities. Areas, floors
  and labels match the plants in them.
- The **All plants** entity (`binary_sensor.smart_plants_all_plants`) means every plant,
  including plants you add later. It wins over other targets and still works after you rename
  its entity ID. It counts only when you pick the entity itself.
- No target also means every plant. The visual editor marks that **No target set**, so pick
  *All plants* there.
- Another Smart Plants entity counts only if it's what the trigger or condition checks. *Too
  wet* picked for *Plant needs water* matches nothing, so prefer plants, areas and labels.
- Hidden or disabled entities don't count for *All plants* or an empty target.

## Actions

| Action | Targets | What it does |
| --- | --- | --- |
| `smart_plants.log_care` | Plant devices or care task entities | Adds a care entry. With a task as target, marks the task as done. |
| `smart_plants.skip_care_task` | Care task entities | Skips the current occurrence. Not for reading tasks or paused plants. |
| `smart_plants.snooze` | Plants, their entities or *All plants* | Snoozes alerts, see [Snooze alerts](#snooze-alerts). |
| `smart_plants.unsnooze` | Plants, their entities or *All plants* | Ends the snooze now. |
| `smart_plants.get_report` | Plants, their entities, areas, floors, labels or *All plants* | Returns the [plant report](#plant-report). Changes nothing. |

The first four change plants and need permission to control Smart Plants entities. Members of
Home Assistant's read-only group get *Unauthorized*. Automations aren't affected.

`smart_plants.log_care` fields:

| Field | Required | Description |
| --- | --- | --- |
| `kind` | With a plant target | `watering`, `fertilizing`, `pruning`, `repotting`, `pest_control`, `note` or `task`. With a task target, leave it out or match the task. |
| `occurred_at` | No | When it happened. Defaults to now and can't be in the future. Without a time zone it's local time. |
| `note` | For `kind: note` | Up to 500 characters. |

If any target is invalid, nothing is logged. Areas, floors and labels aren't accepted. A
`watering` keeps *Needs water* off for 24 hours from `occurred_at`. With a response variable,
the action returns `events`, one per entry, with `plant_id`, `event_id`, `kind`, `occurred_at`
and `task_id`.

## Plant report

`smart_plants.get_report` (**Get plant report**) returns the plants that need water, have
problems or have care tasks due, with a title and message ready to send. It needs a response
variable.

| Field | Default | Description |
| --- | --- | --- |
| `include` | All | Any of `needs_water`, `problems` and `care_tasks`. `problems` leaves out *Needs water*. |
| `include_snoozed` | `false` | Also list snoozed plants, marked as snoozed. |
| `language` | Home Assistant's | `en` or `de`, region codes such as `de-DE` work too. Other languages give English. |

The report leaves out paused plants, plants with nothing to report and, by default, snoozed
plants. The response:

```json
{
  "title": "2 plants need attention",
  "message": "• Aloe (Kitchen): Needs water. Due: Fertilize\n• Office Aloe: Low light\n1 snoozed plant not included.",
  "has_items": true,
  "count": 2,
  "snoozed": 1,
  "paused": 0,
  "language": "en",
  "plants": [
    {
      "plant": "Aloe",
      "device_id": "0123456789abcdef0123456789abcdef",
      "area": "Kitchen",
      "needs_water": true,
      "snoozed": false,
      "problems": [],
      "care_tasks": [
        {"name": "Fertilize", "task_type": "fertilize", "status": "due", "entity_id": "binary_sensor.aloe_fertilize"}
      ]
    },
    {
      "plant": "Office Aloe",
      "device_id": "fedcba9876543210fedcba9876543210",
      "area": null,
      "needs_water": false,
      "snoozed": false,
      "problems": [
        {"key": "low_light", "name": "Low light", "entity_id": "binary_sensor.office_aloe_low_light"}
      ],
      "care_tasks": []
    }
  ]
}
```

`plants` is sorted by name. `snoozed` counts the snoozed plants left out, `paused` the paused
plants. A task's `status` is `due`, `overdue` or `no_reading`. The message has one line per
plant, at most 20. With nothing to report, the title is *All plants are fine*.

The report's own text has no `_`, `*`, `[`, `]` or backticks, but plant names go in as written.
For Telegram, set the parse mode to plain text if a name contains one of them.

## Snooze alerts

A snooze mutes a plant's alerts, for example during a vacation. Every entity keeps its real
state, and the binary sensors get `snoozed` and `snoozed_until` (see
[Snoozed plants](entities.md#snoozed-plants)). In the panel, use **⋮ > Snooze alerts…** in the plant's top
card or **⋮ > Snooze all plants…** on the overview.

`smart_plants.snooze` takes exactly one of:

- `duration`: how long from now, for example `days: 7`.
- `until`: when it ends. Without a time zone it's local time.

A snooze lasts at most 366 days and must end in the future. Snoozing again replaces the end.
It ends by itself, also while Home Assistant is off. Logging care doesn't end it. Pausing a
plant ends it, and a paused plant can't be snoozed.

With *All plants* as target, `smart_plants.snooze` snoozes every active plant. A plant already
snoozed until later keeps its end. `smart_plants.unsnooze` with *All plants* ends every snooze.
Plants added afterwards aren't snoozed.

## Examples

<details>
<summary>Notify when a plant needs water</summary>

```yaml
alias: "Plants: needs water"
triggers:
  - trigger: smart_plants.needs_water
    target:
      entity_id: binary_sensor.smart_plants_all_plants
    options:
      for:
        minutes: 30
actions:
  - action: notify.mobile_app_my_phone
    data:
      title: "{{ trigger.plant }} needs water"
      message: "Water it when you get a chance."
mode: queued
```

</details>

<details>
<summary>Notify about a problem in an area</summary>

```yaml
alias: "Living room plants: problem started"
triggers:
  - trigger: smart_plants.problem_started
    target:
      area_id: living_room
    options:
      problems:
        - too_wet
        - temperature_stress
        - humidity_stress
        - low_light
      for:
        minutes: 15
actions:
  - action: notify.mobile_app_my_phone
    data:
      title: "{{ trigger.plant }}: {{ trigger.problem_name }}"
      message: "A plant in the living room has a problem."
mode: queued
```

</details>

<details>
<summary>Notify about a sensor that stopped</summary>

```yaml
alias: "Plants: sensor stale"
triggers:
  - trigger: smart_plants.problem_started
    target:
      entity_id: binary_sensor.smart_plants_all_plants
    options:
      problems:
        - sensor_stale
      for:
        hours: 1
actions:
  - action: notify.mobile_app_my_phone
    data:
      title: "Check the sensor of {{ trigger.plant }}"
      message: "It hasn't reported for a while. Check its battery or connection."
mode: queued
```

</details>

<details>
<summary>Warn about frost</summary>

Needs a *Winter protection* reading task, see [Reading tasks](care.md#reading-tasks).

```yaml
alias: "Balcony: frost warning"
triggers:
  - trigger: smart_plants.care_task_due
    target:
      label_id: balcony
    options:
      task_types:
        - winter_protection
actions:
  - action: notify.mobile_app_my_phone
    data:
      title: "Frost is coming"
      message: "Bring {{ trigger.plant }} inside or cover it."
mode: queued
```

</details>

<details>
<summary>Send a daily plant report</summary>

The condition keeps the automation quiet on days when all plants are fine. Give it the same
target and options as the report.

```yaml
alias: "Plants: daily report"
triggers:
  - trigger: time
    at: "08:00:00"
conditions:
  - condition: smart_plants.needs_attention
    target:
      entity_id: binary_sensor.smart_plants_all_plants
actions:
  - action: smart_plants.get_report
    target:
      entity_id: binary_sensor.smart_plants_all_plants
    response_variable: report
  - action: notify.mobile_app_my_phone
    data:
      title: "{{ report.title }}"
      message: "{{ report.message }}"
mode: single
```

</details>

<details>
<summary>Log a watering with an NFC tag</summary>

```yaml
alias: "Monstera: watered (NFC tag)"
triggers:
  - trigger: tag
    tag_id: monstera-pot
actions:
  - action: smart_plants.log_care
    target:
      device_id: 0123456789abcdef0123456789abcdef
    data:
      kind: watering
mode: single
```

</details>

<details>
<summary>Log a watering after an irrigation valve ran</summary>

```yaml
alias: "Balcony: log watering after the drip valve ran"
triggers:
  - trigger: state
    entity_id: valve.balcony_drip
    from: "open"
    to: "closed"
actions:
  - action: smart_plants.log_care
    target:
      device_id:
        - 0123456789abcdef0123456789abcdef
        - fedcba9876543210fedcba9876543210
    data:
      kind: watering
      note: "Drip irrigation"
mode: single
```

</details>

<details>
<summary>Mark fertilizing as done with a button</summary>

Target the task's entity to mark it as done. `smart_plants.skip_care_task` with the same target
skips it instead.

```yaml
alias: "Monstera: fertilizing done"
triggers:
  - trigger: state
    entity_id: input_button.monstera_fertilized
    not_from:
      - unavailable
      - unknown
actions:
  - action: smart_plants.log_care
    target:
      entity_id: binary_sensor.monstera_fertilize
mode: single
```

</details>

<details>
<summary>Snooze all plants while on vacation</summary>

```yaml
alias: "Vacation: snooze all plants"
triggers:
  - trigger: state
    entity_id: input_boolean.vacation
    to: "on"
    id: "away"
  - trigger: state
    entity_id: input_boolean.vacation
    to: "off"
    id: "home"
actions:
  - choose:
      - conditions:
          - condition: trigger
            id: "away"
        sequence:
          - action: smart_plants.snooze
            target:
              entity_id: binary_sensor.smart_plants_all_plants
            data:
              duration:
                days: 21
      - conditions:
          - condition: trigger
            id: "home"
        sequence:
          - action: smart_plants.unsnooze
            target:
              entity_id: binary_sensor.smart_plants_all_plants
mode: single
```

</details>

<details>
<summary>Check a plant in the evening, unless it's snoozed</summary>

```yaml
alias: "Monstera: evening check"
triggers:
  - trigger: time
    at: "19:00:00"
conditions:
  - condition: smart_plants.needs_water
    target:
      device_id: 0123456789abcdef0123456789abcdef
  - condition: smart_plants.is_not_snoozed
    target:
      device_id: 0123456789abcdef0123456789abcdef
actions:
  - action: notify.mobile_app_my_phone
    data:
      message: "The Monstera needs water."
mode: single
```

</details>

<details>
<summary>Use the entities directly</summary>

Triggers on the entities need the entity IDs and `not_from` so a sensor coming back isn't a
new problem. Home Assistant's own numeric triggers also work on the plant's sensors, for
example on *Health score*.

```yaml
alias: "Monstera: needs water"
triggers:
  - trigger: state
    entity_id: binary_sensor.monstera_needs_water
    not_from:
      - unavailable
      - unknown
    to: "on"
    for:
      minutes: 30
conditions:
  - condition: state
    entity_id: binary_sensor.monstera_needs_water
    attribute: snoozed
    state: false
actions:
  - action: notify.mobile_app_my_phone
    data:
      title: "Monstera needs water"
      message: "Soil moisture is {{ states('sensor.monstera_soil_moisture') }} %."
mode: single
```

</details>

## Water automatically, safely

If you want automatic watering, build in safeguards. This example waits until *Needs water*
has been on for 30 minutes, asks for confirmation on your phone, gives up after 10 minutes,
prompts at most every 12 hours, skips rain, and runs the valve for a fixed 2 minutes. It uses
the actionable notifications of the companion app. Replace the valve, the rain sensor and the
notify action with your own.

<details>
<summary>Confirm and water</summary>

```yaml
alias: "Balcony tomatoes: confirm and water"
triggers:
  - trigger: smart_plants.needs_water
    target:
      device_id: 0123456789abcdef0123456789abcdef
    options:
      for:
        minutes: 30
conditions:
  # Don't prompt again within 12 hours of the last prompt.
  - condition: template
    value_template: >-
      {{ this.attributes.last_triggered is none
         or now() - this.attributes.last_triggered > timedelta(hours=12) }}
  - condition: state
    entity_id: binary_sensor.rain_detected
    state: "off"
actions:
  - action: notify.mobile_app_my_phone
    data:
      title: "Water the balcony tomatoes?"
      message: >-
        Soil moisture is {{ states('sensor.balcony_tomatoes_soil_moisture') }} %.
      data:
        actions:
          - action: WATER_TOMATOES
            title: "Water for 2 minutes"
          - action: SKIP_TOMATOES
            title: "Skip"
  - wait_for_trigger:
      - trigger: event
        event_type: mobile_app_notification_action
        event_data:
          action: WATER_TOMATOES
      - trigger: event
        event_type: mobile_app_notification_action
        event_data:
          action: SKIP_TOMATOES
    timeout:
      minutes: 10
    continue_on_timeout: false
  # Stop unless you chose "Water".
  - condition: template
    value_template: "{{ wait.trigger.event.data.action == 'WATER_TOMATOES' }}"
  - action: valve.open_valve
    target:
      entity_id: valve.balcony_drip
  - delay:
      minutes: 2
  - action: valve.close_valve
    target:
      entity_id: valve.balcony_drip
  - action: smart_plants.log_care
    target:
      device_id: 0123456789abcdef0123456789abcdef
    data:
      kind: watering
      note: "Drip irrigation"
mode: single
max_exceeded: silent
```

</details>

Add a second automation that closes the valve if it stays open too long, for example after a
restart during the delay:

<details>
<summary>Maximum valve runtime</summary>

```yaml
alias: "Balcony drip: maximum runtime"
triggers:
  - trigger: state
    entity_id: valve.balcony_drip
    to: "open"
    for:
      minutes: 5
  - trigger: homeassistant
    event: start
actions:
  - action: valve.close_valve
    target:
      entity_id: valve.balcony_drip
mode: single
```

</details>

For a switch instead of a valve, use `switch.turn_on`, `switch.turn_off` and `to: "on"`. Start
with short runtimes and check the soil before you rely on it.
