# Automations

Smart Plants adds its own triggers, conditions and actions to Home Assistant's automation
editor. Pick a plant, an area or a label, or leave the target empty for all plants. You don't
need entity IDs or templates. You can build everything below in the visual automation editor;
the YAML is shown for clarity.

In the YAML, `device_id` values such as `0123456789abcdef0123456789abcdef` are placeholders.
The easiest way to get the real value is to pick the plant in the visual editor; switching to
YAML afterwards shows its ID. Replace `notify.mobile_app_my_phone` with your own notification
action.

> [!IMPORTANT]
> Smart Plants detects what a plant needs. It **never** switches pumps, valves, or any
> other device by itself. Any watering action happens only in automations you write.

## Smart Plants triggers and conditions

In the automation editor, **Add trigger** and **Add condition** list these under
**Smart Plants**.

| Trigger | Fires when | Options |
| --- | --- | --- |
| `smart_plants.needs_water`, *Plant needs water* | A plant starts to need water. | **Trigger when** (each, first or all of the targeted plants), **For at least**, **Also while snoozed** |
| `smart_plants.problem_started`, *Plant problem started* | One of the selected problems of a plant starts. | **Problems** (default all), **For at least**, **Also while snoozed** |
| `smart_plants.problem_cleared`, *Plant problem cleared* | One of the selected problems of a plant is over. | **Problems**, **For at least** |
| `smart_plants.care_task_due`, *Care task became due* | A care task of the selected types becomes due. | **Task types** (default all), **For at least**, **Also while snoozed** |

The problems are *Needs water*, *Too wet*, *Sensor stale*, the temperature, humidity, soil
temperature, conductivity and CO2 stress sensors, *Low light* and *Low battery*. Date-based
care tasks become due just after midnight; reading tasks become due when the reading crosses
their value.

| Condition | Passes when | Options |
| --- | --- | --- |
| `smart_plants.needs_water`, *Plant needs water* | The targeted plants need water. | **Condition passes if** (any or all), **For at least** |
| `smart_plants.has_problem`, *Plant has a problem* | The targeted plants have one of the selected problems. | **Problems**, **Condition passes if** |
| `smart_plants.care_task_due`, *Care task is due* | The targeted plants have a due care task of the selected types. | **Task types**, **Condition passes if** |
| `smart_plants.is_not_snoozed`, *Plant is not snoozed* | The alerts of the targeted plants are not snoozed. | **Condition passes if** |
| `smart_plants.needs_attention`, *Plants need attention* | The [plant report](#plant-report) for the same target and options lists at least one plant. | **Include**, **Include snoozed plants** |

### Targets

- A target can be plant devices, areas, floors, labels, or Smart Plants entities. Areas,
  floors and labels match the plants in them, and other integrations' entities there are
  ignored.
- With no target, a trigger or condition covers every plant, including plants you add later.
  The editor then shows a **No target set** badge on the card. The automation still saves and
  works for all plants.
- A Smart Plants entity picked directly counts only if it is the kind the trigger or
  condition looks at. *Too wet* picked for *Plant needs water* matches nothing, so prefer
  plants, areas and labels.
- **Trigger when** and **Condition passes if** appear once a target is set. For *Plant has a
  problem*, *Care task is due* and *Plant is not snoozed*, "all" means every targeted plant,
  not every sensor. One problem per plant is enough.

### When triggers fire

- A trigger fires when a sensor turns on, never when it comes back from unavailable. A
  restart, resuming a paused plant, or a sensor that reconnects doesn't fire, even if the
  plant still needs water. A new plant in a targeted area starts being watched without firing.
- Triggers skip snoozed plants. If a plant started to need water during a snooze and still
  does when the snooze ends, the trigger fires then, once. With **Also while snoozed** the
  trigger ignores the snooze, fires during it, and doesn't fire again at its end.
- A snooze that ends while Home Assistant is off doesn't fire anything afterwards.
- *Plant problem cleared* ignores the snooze, because a problem going away is not an alert.
- **For at least** waits until the problem has lasted that long. Turning off, going
  unavailable, or a snooze starting cancels the wait. Deleting the plant or the task cancels
  it too.
- A paused plant's entities are unavailable, so its triggers don't fire and conditions leave
  it out. While Smart Plants itself isn't loaded, nothing fires, and your automations
  stay valid.

### Conditions

- Conditions check the real state. A snoozed plant that needs water passes *Plant needs
  water*. Combine it with *Plant is not snoozed* to stay quiet during a snooze.
- Unavailable entities are left out, so paused plants never count. When no targeted plant is
  available, the condition fails, even with "all".
- *Plant is not snoozed* reads the snooze from any available binary sensor of the plant, so it
  keeps working when you disable or hide *Sensor stale*.
- To test that a plant *is* snoozed, put *Plant is not snoozed* inside a **Not** condition.

### Trigger variables

Besides Home Assistant's own `trigger.entity_id`, `trigger.from_state`, `trigger.to_state`
and `trigger.for`, the Smart Plants triggers set these:

| Variable | Value |
| --- | --- |
| `trigger.plant` | The plant's name, as its device is named in Home Assistant. |
| `trigger.device_id` | The plant's device ID. |
| `trigger.problem` | The problem key, for example `too_wet` (problem triggers). |
| `trigger.problem_name` | The problem's name in Home Assistant's language, for example *Too wet* (problem triggers). |
| `trigger.task` | The task's name, for example *Fertilize* or your own name for a custom task (*Care task became due*). |
| `trigger.task_type` | The task type, for example `winter_protection` (*Care task became due*). |

## Examples

### Notify when a plant needs water

```yaml
alias: "Plants: needs water"
triggers:
  - trigger: smart_plants.needs_water
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

With no target, this covers every plant. Snoozed plants send their message when the snooze
ends.

### Any problem in an area

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

### Check a stale sensor

```yaml
alias: "Plants: sensor stale"
triggers:
  - trigger: smart_plants.problem_started
    options:
      problems:
        - sensor_stale
      for:
        hours: 1
actions:
  - action: notify.mobile_app_my_phone
    data:
      title: "Check the sensor of {{ trigger.plant }}"
      message: "It hasn't reported a valid reading for a while. Check its battery or connection."
mode: queued
```

### Frost warning

A *Winter protection* task that follows the temperature or the weather forecast (see
[Reading tasks](getting-started.md#reading-tasks)) becomes due when frost is coming:

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

## Plant report

`smart_plants.get_report` returns which plants need water, have problems or have care tasks
due, with a title and a message ready to send. It changes nothing. In the editor, it's
**Get plant report** under **Smart Plants**; it always needs a response variable.

- **Target** (optional): plant devices, Smart Plants entities (meaning their plant), areas,
  floors or labels. With no target the report covers every plant. A target with no plants
  in it gives an empty report.
- `include`: what the report lists, any of `needs_water`, `problems` and `care_tasks`.
  Default all three. `problems` covers every problem except *Needs water*.
- `include_snoozed`: also list snoozed plants, marked as snoozed. Default `false`.

The report leaves out paused plants, plants with nothing to report, and snoozed plants unless
`include_snoozed` is on. The response looks like this:

```json
{
  "title": "2 plants need attention",
  "message": "• Aloe (Kitchen): Needs water, Too wet. Due: Fertilize\n• Office Aloe: Low light\n1 snoozed plant not included.",
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
      "problems": [
        {"key": "too_wet", "name": "Too wet", "entity_id": "binary_sensor.aloe_too_wet"}
      ],
      "care_tasks": [
        {"name": "Fertilize", "task_type": "fertilize", "status": "due", "entity_id": "binary_sensor.aloe_fertilize"}
      ]
    }
  ]
}
```

- `plants` holds the listed plants, sorted by name. `count` is their number and `has_items`
  is `true` when there is at least one.
- `snoozed` counts the snoozed plants that had something to report but were left out.
  `paused` counts the paused plants.
- `area` is the plant's area or `null`. `status` of a care task is `due` or `overdue`.
- The message has one line per plant, at most 20. After that, one line says how many more
  plants there are. With nothing to report, the title is *All plants are fine* and the
  message *Nothing needs attention right now.*
- Title and message are in German when Home Assistant's language is German, otherwise in
  English. The problem and task names follow the same language.

### Daily plant report

This sends one message in the morning, only when a plant needs something:

```yaml
alias: "Plants: daily report"
triggers:
  - trigger: time
    at: "08:00:00"
conditions:
  - condition: smart_plants.needs_attention
actions:
  - action: smart_plants.get_report
    response_variable: report
  - action: notify.mobile_app_my_phone
    data:
      title: "{{ report.title }}"
      message: "{{ report.message }}"
mode: single
```

*Plants need attention* checks the same thing the report would list, so the automation stays
quiet on days when all plants are fine. Give both the same target and options.

### Telegram and special characters

The report's own text is plain: no `_`, `*`, `[`, `]` or backticks. Plant, area and task names
go in as you wrote them. Telegram bots use Markdown by default, and a name with one of these
characters can make Telegram reject the message. Set the bot's parse mode to plain text, or
avoid these characters in names.

## Thresholds on readings

To react to a value instead of a problem, for example soil moisture below 20 %, use Home
Assistant's own moisture, temperature, battery and illuminance triggers on the plant's
sensors. They work on the plant's *Soil moisture* and other Smart Plants sensors as well as on
the sensors you assigned.

## Using the entities directly

Every plant is also a set of ordinary entities (see [Entities](entities.md)). Triggers on them
need the entity IDs, and `not_from: [unavailable, unknown]` so a sensor coming back doesn't
look like a new problem:

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
actions:
  - action: notify.mobile_app_my_phone
    data:
      title: "Monstera needs water"
      message: >-
        Soil moisture is {{ states('sensor.monstera_soil_moisture') }} %.
mode: single
```

Logging a watering, in the panel or with the [`smart_plants.log_care`](#log-care-with-actions)
action, keeps *Needs water* off for 24 hours, so a reminder won't repeat right after you've
watered.

### Warn when the health score stays low

```yaml
alias: "Monstera: low health"
triggers:
  - trigger: numeric_state
    entity_id: sensor.monstera_health_score
    below: 50
    for:
      hours: 1
actions:
  - action: notify.mobile_app_my_phone
    data:
      title: "Monstera health is {{ states('sensor.monstera_health_score') }}"
      message: >-
        Based on: {{ state_attr('sensor.monstera_health_score', 'contributors') | join(', ') }}
mode: single
```

A numeric state trigger only fires when the value crosses the threshold, so it won't repeat
every time the score changes while it's already low.

## Safe irrigation pattern

If you want to water automatically, build in safeguards. This example:

- starts only when *Needs water* has been on for a while,
- asks for **explicit confirmation** on your phone and gives up after 10 minutes,
- enforces a **cooldown** of 12 hours between prompts,
- skips watering when a rain sensor is on,
- runs the valve for a **fixed, short time** and always closes it afterwards.

Pick your tomato plant as the target and replace `valve.balcony_drip`,
`binary_sensor.rain_detected`, and the notify action with your own entities. The confirmation uses the actionable notifications of the Home Assistant
companion app.

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
  # Cooldown: don't prompt again within 12 hours of the last prompt.
  - condition: template
    value_template: >-
      {{ this.attributes.last_triggered is none
         or now() - this.attributes.last_triggered > timedelta(hours=12) }}
  # Optional rain check.
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
mode: single
max_exceeded: silent
```

To record the watering in the plant's care history, add a `smart_plants.log_care` step after
the valve closes (see [Log a watering after an irrigation valve ran](#log-a-watering-after-an-irrigation-valve-ran)).

Add a separate safety net that closes the valve if it stays open too long for any reason
(for example a restart during the delay):

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

If your irrigation hardware is a switch instead of a valve, use `switch.turn_on` /
`switch.turn_off` and `to: "on"` accordingly. Start with short runtimes and check the soil
before trusting any automatic watering.

## Log care with actions

Smart Plants provides these actions for automations, scripts, and dashboards. All of them
are listed under **Smart Plants** in the action picker.

| Action | Targets | What it does |
| --- | --- | --- |
| `smart_plants.log_care` | Plant devices or care task *due* entities | Adds an entry to the plant's care history. With a care task as the target, the entry marks that task as done. |
| `smart_plants.skip_care_task` | Care task *due* entities | Skips the task's current occurrence. The task is due again on its next scheduled date. Tasks that follow a sensor reading cannot be skipped. |
| `smart_plants.snooze` | Plant devices or any of their Smart Plants entities | Snoozes the plant's alerts for a while. See [Snooze alerts](#snooze-alerts). |
| `smart_plants.unsnooze` | Plant devices or any of their Smart Plants entities | Ends the plant's snooze now. |

`smart_plants.log_care` accepts these fields:

- `kind`: what was done, one of `watering`, `fertilizing`, `pruning`, `repotting`, `note`, or
  `task` (another task). Required when you target a plant device. When you target a care
  task, you can leave it out; if you set it, it must match the task (for example
  `fertilizing` for a fertilizing task).
- `occurred_at`: when it happened. Defaults to now and can't be in the future; a time up to
  five minutes ahead of Home Assistant's clock is saved as now. A time
  without a time zone is Home Assistant's local time.
- `note`: an optional note of up to 500 characters. Required for `kind: note`.

You can target several plants or care tasks in one call. If any target is invalid (not a
Smart Plants plant or care task, deleted, or belonging to a disabled plant), nothing is
logged and the action reports an error. Areas, floors, and labels aren't supported as
targets; pick the plants or care tasks directly.

Logging `watering` also keeps *Needs water* off for 24 hours, exactly like the panel's
**Watered** button.

### Log a watering by scanning an NFC tag

Stick an NFC tag on the pot and scan it with the companion app after watering:

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

### Log a watering after an irrigation valve ran

When your own irrigation automation has watered several plants, record it for each of them so
*Needs water* doesn't fire again right away:

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

### Mark fertilizing as done with a button

Target the care task's *due* entity to mark the task as done. This example uses a helper
button (`input_button.monstera_fertilized`); a physical button works the same way with its
own trigger.

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

To skip the current occurrence instead, for example while you're away:

```yaml
action: smart_plants.skip_care_task
target:
  entity_id: binary_sensor.monstera_fertilize
```

## Snooze alerts

A snooze mutes a plant's alerts for a while, for example during a vacation, while the plant
recovers after repotting, or while you move it. It doesn't hide anything: every entity keeps
its real state, and the plant still counts in the panel. Instead, every binary sensor of the
plant gets the attribute `snoozed: true` and the end in `snoozed_until` (see
[Entities](entities.md#snoozed-plants)). The Smart Plants triggers skip snoozed plants by
themselves and remind you once when the snooze ends.

In the panel, a plant is snoozed from its page with **⋮ → Snooze alerts…** (see
[Going on vacation](getting-started.md#going-on-vacation)). A snooze set there ends at the end of
the chosen day in Home Assistant's time zone.

`smart_plants.snooze` targets one or more plants, either by their device or by any of their
Smart Plants entities (an entity target snoozes the whole plant it belongs to), and takes
exactly one of these fields:

- `duration`: how long to snooze, counted from now, for example `days: 7`.
- `until`: when the snooze ends. A time without a time zone is Home Assistant's local time.

The snooze can last at most 366 days and must end in the future; otherwise the action reports
an error and nothing changes. Snoozing an already snoozed plant replaces the end. The snooze
ends by itself at that time, even if Home Assistant was off then. `smart_plants.unsnooze` ends
it right away. Logging care, marking a task as done, and skipping a task work as usual and
don't end a snooze. Pausing a plant ends its snooze, and a paused plant can't be snoozed.

```yaml
action: smart_plants.snooze
target:
  device_id: 0123456789abcdef0123456789abcdef
data:
  duration:
    days: 14
```

### Stay quiet while a plant is snoozed

The Smart Plants triggers already skip snoozed plants. In an automation with another trigger,
for example a time or a button, add *Plant is not snoozed*:

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

If you trigger on the entities directly, a state condition on the `snoozed` attribute does the
same, see [Snoozed plants](entities.md#snoozed-plants). It only stops new notifications: a
state trigger doesn't fire again when the snooze ends.
