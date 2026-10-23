# Automations

Smart Plants exposes each plant's state as ordinary Home Assistant entities, so you use them
in native automations like any other sensor. You can build everything below in the visual
automation editor; the YAML is shown for clarity.

The examples use placeholder entity IDs for a plant named "Monstera". Look up your real IDs
on the plant's device page (see [Entities](entities.md#naming-and-entity-ids)) and replace
`notify.mobile_app_my_phone` with your own notification action.

> [!IMPORTANT]
> Smart Plants detects what a plant needs. It **never** switches pumps, valves, or any
> other device by itself. Any watering action happens only in automations you write.

## Tips before you start

- Problem indicators are **on** when there is a problem.
- Entities go **unavailable** when there is no valid reading, for example after a restart or
  when a sensor drops out. Use `not_from: [unavailable, unknown]` so a sensor coming back
  doesn't look like a new problem.
- Add a `for:` duration to avoid reacting to short spikes.
- Logging a watering, in the panel or with the [`smart_plants.log_care`](#log-care-with-actions)
  action, pauses *Needs water* for 24 hours, so a reminder won't repeat right after you've
  watered.

## Notify when a plant needs water

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

## One automation for several plants and problems

```yaml
alias: "Plants: problem detected"
triggers:
  - trigger: state
    entity_id:
      - binary_sensor.monstera_needs_water
      - binary_sensor.monstera_too_wet
      - binary_sensor.monstera_temperature_stress
      - binary_sensor.fiddle_leaf_fig_needs_water
      - binary_sensor.fiddle_leaf_fig_low_light
    not_from:
      - unavailable
      - unknown
    to: "on"
    for:
      minutes: 15
actions:
  - action: notify.mobile_app_my_phone
    data:
      title: "Plant problem"
      message: "{{ trigger.to_state.name }}"
mode: queued
```

`trigger.to_state.name` is the friendly name, for example *Monstera Too wet*.

## Warn when the health score stays low

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

## Remind yourself to check a sensor

```yaml
alias: "Monstera: moisture sensor stale"
triggers:
  - trigger: state
    entity_id: binary_sensor.monstera_sensor_stale
    to: "on"
    for:
      hours: 1
actions:
  - action: notify.mobile_app_my_phone
    data:
      title: "Check the Monstera moisture sensor"
      message: "It hasn't reported a valid reading for a while. Check its battery or connection."
mode: single
```

## Safe irrigation pattern

If you want to water automatically, build in safeguards. This example:

- starts only when *Needs water* has been on for a while,
- asks for **explicit confirmation** on your phone and gives up after 10 minutes,
- enforces a **cooldown** of 12 hours between prompts,
- skips watering when a rain sensor is on,
- runs the valve for a **fixed, short time** and always closes it afterwards.

Replace `valve.balcony_drip`, `binary_sensor.rain_detected`, and the notify action with your
own entities. The confirmation uses the actionable notifications of the Home Assistant
companion app.

```yaml
alias: "Balcony tomatoes: confirm and water"
triggers:
  - trigger: state
    entity_id: binary_sensor.balcony_tomatoes_needs_water
    not_from:
      - unavailable
      - unknown
    to: "on"
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

- `kind` – what was done: `watering`, `fertilizing`, `pruning`, `repotting`, `note`, or
  `task` (another task). Required when you target a plant device. When you target a care
  task, you can leave it out; if you set it, it must match the task (for example
  `fertilizing` for a fertilizing task).
- `occurred_at` – when it happened. Defaults to now and can't be in the future; a time up to
  five minutes ahead of Home Assistant's clock is saved as now. A time
  without a time zone is Home Assistant's local time.
- `note` – an optional note of up to 500 characters. Required for `kind: note`.

You can target several plants or care tasks in one call. If any target is invalid (not a
Smart Plants plant or care task, deleted, or belonging to a disabled plant), nothing is
logged and the action reports an error. Areas, floors, and labels aren't supported as
targets; pick the plants or care tasks directly.

Logging `watering` also keeps *Needs water* off for 24 hours, exactly like the panel's
**Watered** button.

In the YAML below, `device_id` is a placeholder. The easiest way to get the real value is to
pick the plant in the visual editor; switching to YAML afterwards shows its ID.

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
[Entities](entities.md#snoozed-plants)). Your automations check `snoozed` to stay quiet.

`smart_plants.snooze` targets one or more plants, either by their device or by any of their
Smart Plants entities (an entity target snoozes the whole plant it belongs to), and takes
exactly one of these fields:

- `duration` – how long to snooze, counted from now, for example `days: 7`.
- `until` – when the snooze ends. A time without a time zone is Home Assistant's local time.

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

Add a state condition on the `snoozed` attribute to any alert automation:

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
      message: "The Monstera needs water."
mode: single
```

The condition only stops new notifications. When the snooze ends, the entity's state hasn't
changed, so a problem that started during the snooze doesn't trigger the automation again. To
get a reminder for it, add a second trigger on the attribute turning off, for example
`trigger: state`, `entity_id: binary_sensor.monstera_needs_water`, `attribute: snoozed`,
`to: false`, together with a condition that the entity is `on`.
