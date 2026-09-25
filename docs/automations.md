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
- Logging a watering in the panel pauses *Needs water* for 24 hours, so a reminder won't
  repeat right after you've watered.

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
