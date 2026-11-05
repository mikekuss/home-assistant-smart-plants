# Dashboard card

The Smart Plants plant card shows one plant on a dashboard: name, area, status, soil moisture,
the other readings, the last watering and a **Watered** button. Every signed-in user can use
it, also users who can't open the panel. The card adds no entities.

## Add the card

1. Open a dashboard and select **Edit dashboard**.
2. Select **Add card** and search for **Smart Plants plant card**.
3. Pick the plant and select **Save**.

In a sections view the card takes half a section, and its height follows its content. For
more plants per row, make the section double or triple width. To make one card wider, use the
card's **Layout** tab or `grid_options`.

## Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `device_id` | string | Required | The plant's device. The card editor fills it in. |
| `show_readings` | boolean | `true` | Shows the soil moisture bar and the other readings. |
| `show_watering` | boolean | `true` | Shows the last watering and the **Watered** button. |

```yaml
type: custom:smart-plants-plant-card
device_id: 0123456789abcdef0123456789abcdef
show_readings: true
show_watering: true
grid_options:
  columns: 12
```

## What the card shows

- **Header.** Photo, name, area and species.
- **Status.** The same status as the panel, with its reason. A snoozed plant shows
  **Snoozed until** and the date, and **Care due** appears while a task is due.
- **Readings.** The soil moisture bar with its target band, and one chip per other reading. A
  reading outside its range turns red.
- **Watering.** When the plant was last watered, and **Watered**.

**Watered** logs a watering, like the `smart_plants.log_care` action. Administrators get
**Undo**. Users in Home Assistant's read-only group see "You don't have permission to log
care". The button is off while the plant is paused.

Selecting the name opens the plant's page in the panel for administrators. Other users get
Home Assistant's details dialog of the soil moisture sensor.

## Known limitations

The card works from the plant's entities, so it knows less than the panel:

- When all of a plant's entities are unavailable, the card shows **Paused**.
- It shows **No recent data** with "sensor is not reporting" where the panel says
  **No main sensor** or names the time of the last reading.
- It shows **No recent data** when *Needs water* or *Too wet* is disabled, because it can't
  tell whether the soil is in range.
- Without a current moisture reading, it shows no target band and no last watering.
- A deleted plant shows "Plant not found".

Home Assistant loads a small script of about 4 KB in every browser session to add the card to
the picker. The card itself loads when it's on screen. If loading fails, for example during a
restart, the card retries every 10 seconds.
