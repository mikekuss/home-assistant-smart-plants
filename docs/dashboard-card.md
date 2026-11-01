# Dashboard card

The Smart Plants plant card shows one plant on any dashboard. It looks like a plant card on the
panel overview. It shows the name, area and status, the soil moisture bar, the other readings,
the last watering and a **Watered** button. Every signed-in user can see it, also users who
aren't administrators and can't open the Smart Plants panel.

The card is optional. Smart Plants adds no entity for it, and nothing changes on a dashboard
until you add the card yourself.

## Add the card

1. Open a dashboard and choose **Edit dashboard**.
2. Choose **Add card** and search for **Smart Plants plant card**.
3. Pick the plant. The card editor offers your Smart Plants plants only.
4. Choose **Save**.

The editor starts with the first plant that needs water, or with your first plant.

## Card size

In a sections view the card takes half a section, so two plants share a row, and its height
follows its content. A narrow card keeps its text short. It shows only when the plant was last
watered, for example "3 days ago", and the full sentence as a tooltip. It shortens a long area
and species line and a reason longer than two lines, and it shows only the target under the
soil moisture bar.

For more plants per row, open the section's settings and set its width to double or triple.
The section then holds four or six plants per row. To make one card wider, change its size on the
card's **Layout** tab, or set `grid_options` in YAML. The **Layout** tab doesn't go below half
a section. This card takes the full width:

```yaml
type: custom:smart-plants-plant-card
device_id: 0123456789abcdef0123456789abcdef
grid_options:
  columns: 12
```

## Options

| Option | Default | What it does |
| --- | --- | --- |
| Plant (`device_id`) | none | The plant's device. Required. |
| Show readings (`show_readings`) | on | Shows the soil moisture bar and the chips for the other readings. |
| Show Watered button (`show_watering`) | on | Shows the last watering and the **Watered** button. |

In YAML the card looks like this:

```yaml
type: custom:smart-plants-plant-card
device_id: 0123456789abcdef0123456789abcdef
show_readings: true
show_watering: true
```

Use the card editor to pick the plant. It fills in the device ID for you.

## What the card shows

- **Head.** The plant's photo, name and area, and the species when the plant has one. Every
  user who can see the card sees the photo. A plant without a photo shows the plant icon. A
  plant that is paused while the dashboard is open keeps its photo; after a reload it shows the
  plant icon until you resume it, because its entities don't report the photo while paused.
- **Status.** The same status as on the panel, for example **Needs water**, **Too hot +1** or
  **Paused**, with the reason below it. A snoozed plant also shows **Snoozed until** and the
  date. **Care due** appears while a care task is due.
- **Readings.** The soil moisture bar with the plant's target band, then one chip for each
  other reading with a current value. A reading outside its range turns red.
- **Watering.** When the plant was last watered, for example "Watered 2 days ago", and the
  **Watered** button.

The card reads the plant's entities, so it updates as soon as they change. The target band
comes from the `min`, `target` and `max` attributes of the soil moisture sensor. The last
watering comes from the `last_watered` attribute of *Needs water*. The `sources` attribute of
*Sensor stale* tells the card whether the plant has soil moisture sensors. They are described
in [Entities](entities.md#sensors).

Home Assistant drops these attributes while an entity is unavailable. So the card shows no
target band and no last watering while the plant has no current moisture reading, and none
for a paused plant.

## Watered button

**Watered** logs a watering for the plant right away, the same as the
[`smart_plants.log_care`](automations.md#log-care-with-actions) action. A notice confirms it,
for example "Watering logged for Office Aloe". For administrators the notice offers **Undo**,
which removes that watering again. Other users get the notice without **Undo**.

Users in Home Assistant's read-only group may not log care. For them the card shows "You don't
have permission to log care" and logs nothing. The button is off while the plant is paused.

To hide the button, turn off **Show Watered button**.

## Open the plant

Select the plant's name. Administrators go to the plant's page in the Smart Plants panel. Other
users get Home Assistant's details dialog for the plant's soil moisture sensor, or for its
first reading when it has no soil moisture sensor.

A plant without sensors shows "No sensors assigned yet". For administrators it also has
**Assign**, which opens the plant's **Sensors** tab.

## Limits

- **Paused or not reporting.** A paused plant's entities all read unavailable. The card shows
  **Paused** whenever all of a plant's entities are unavailable, also when there is another
  reason.
- **No main sensor.** When several soil moisture sensors wait for you to choose the main
  sensor, the panel says **No main sensor**. The card shows **No recent data** with "sensor is
  not reporting", because the entities don't say why there is no value.
- **Missing alert sensors.** The card shows **No recent data** instead of a healthy status
  when *Needs water* or *Too wet* is disabled or has no state, because it can't tell whether
  the soil is in range.
- **Removed plant.** When you delete a plant, its card shows "Plant not found". Edit the card
  to pick another plant, or remove it.

## Loading

Smart Plants loads a small script in every Home Assistant browser session. It adds the card to
the card picker and is about 3 KB. The card itself, with its translations, loads only when a
card is on screen or the card editor opens. If that fails, for example while Home Assistant
restarts, the card says it could not be loaded and tries again every 10 seconds. The card
follows your Home Assistant language. It is available in English and German.
