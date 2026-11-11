# Sensors and health

Smart Plants doesn't talk to hardware. You assign existing Home Assistant sensors to a plant,
and Smart Plants turns their readings into plant sensors, problem sensors and a health score.

## Supported sensors

Each plant has one role per kind of reading. The panel calls roles readings and uses plainer
names for some: *Temperature*, *Humidity*, *Light* and *Fertilizer level*.

| Role | Units | Valid range | Problem sensor | Default combination |
| --- | --- | --- | --- | --- |
| Soil moisture | `%` | 0–100 % | Needs water, Too wet, Sensor stale | Main sensor only |
| Temperature | `°C`, `°F`, `K` | −40 to 80 °C | Temperature stress | Average |
| Humidity | `%` | 0–100 % | Humidity stress | Average |
| Illuminance | `lx` | 0–200,000 lx | Low light | Main sensor only |
| Conductivity | `µS/cm`, `μS/cm`, `uS/cm` | 0–10,000 µS/cm | Conductivity stress | Main sensor only |
| Soil temperature | `°C`, `°F`, `K` | −20 to 60 °C | Soil temperature stress | Main sensor only |
| CO₂ | `ppm` | 0–10,000 ppm | CO2 stress | Average |
| Battery | `%` | 0–100 % | Low battery | Lowest |

- A source must be a `sensor` entity with a number as its state.
- Smart Plants checks the unit of every reading. It ignores a reading with a missing or other
  unit, a value outside the valid range, `unknown` and `unavailable`.
- Temperatures are converted to °C. Home Assistant shows them in your unit system.
- Smart Plants' own sensors can't be sources. A plant that already uses one keeps it, and the
  **Sensors** tab marks it *Smart Plants sensor, replace it*.

## Use several sensors for one reading

A reading takes up to 32 sensors. Set **Combine readings** on the **Sensors** tab under
**Several sensors for one reading**:

| Combine readings | Value |
| --- | --- |
| Main sensor only | The **Main sensor**. When it's invalid or not updating, the value is unavailable. There is no fallback to another sensor. |
| Average | The mean of all valid, current sensors. |
| Lowest | The lowest valid, current sensor. |
| Highest | The highest valid, current sensor. |

A single sensor is always the main sensor. With several sensors, Smart Plants never picks the
main sensor for you. Until you pick one, **Main sensor only** gives no value, and the plant
shows *No main sensor* with *Soil moisture: no main sensor chosen*. To remove the main sensor,
first select **Use as main sensor** on another one.

## Data updates

Smart Plants updates a plant when an assigned sensor reports. Timers handle the rest: sensors
that stop updating, the daytime hours of *Low light*, and care task dates just after midnight.
Smart Plants doesn't poll your sensors.

A sensor counts as not updating when it hasn't reported a valid state for **Not updating
after**, 6 hours by default (60 seconds to 7 days, set in seconds). A sensor that reports the
same value again stays current. A new sensor gets one full window before it can count as not
updating. An assigned sensor that no longer exists counts as not updating at once.

A plant shows *No recent data* when an assigned sensor is not updating or has no usable value
and nothing more urgent applies. The plant page names the sensor, for example
*Temperature: sensor is not reporting*. Two sensors are exceptions:

- **Battery** never counts, because many battery sensors report only on a change.
- **Light** doesn't count from 18:00 to 08:00. In the morning it counts once its window has
  passed since 08:00, so with 6 hours, a quiet light sensor counts from 14:00. A window of 10
  hours or more covers the whole day, so it gets that morning only after a day on which the
  sensor reported or was assigned: a light sensor that stays silent through such a day counts
  from 08:00 the next morning.

For soil moisture, *Sensor stale* turns on while any moisture sensor is not updating. For the
other readings, the problem sensor becomes unavailable instead. If a sensor reports only on a
change, raise its **Not updating after** value.

## Problem sensors

Each problem sensor is a binary sensor. On means there is a problem. It turns on at one value
and off at another, so it doesn't flicker around a single limit. While the value is back in
range but the sensor is still on, the status names the value where it turns off, for example
*Soil moisture 16%, alert turns off at 17%*.

When a reading has no valid value, its problem sensor is **unavailable**, never off.
Unavailable doesn't mean healthy.

- **Needs water** turns on below the minimum and off at minimum + 2 points.
- **Too wet** turns on above the maximum and off at maximum − 2 points.
- A stress sensor turns off at its clear value, or when the reading reaches the opposite
  limit.
- **Low light** uses the brightest reading of the last two hours between 08:00 and 18:00, from
  at least two different minutes. Until then it's unavailable. A reading leaves the two hours
  on time even when the sensor doesn't report again, so a bright reading in the morning doesn't
  hold off *Low light* for longer than two hours. At night it's off, or unavailable while the
  light sensor is not updating.

After you log a watering, *Needs water* stays off for 24 hours from the time of the entry.
This holds for the panel, the card, the *Watered* button and the `smart_plants.log_care` action.
Other sensors and the health score don't change.

## Built-in thresholds

| Role | Turns on | Turns off |
| --- | --- | --- |
| Soil moisture | below 15 % (minimum), above 55 % (maximum), target 35 % | minimum + 2, maximum − 2 |
| Temperature | ≤ 10 °C or ≥ 35 °C | ≥ 12 °C, ≤ 32 °C |
| Humidity | ≤ 25 % or ≥ 85 % | ≥ 30 %, ≤ 80 % |
| Illuminance | brightest daytime reading < 500 lx | ≥ 700 lx |
| Conductivity | ≤ 350 or ≥ 2,000 µS/cm | ≥ 500, ≤ 1,800 µS/cm |
| Soil temperature | ≤ 10 °C or ≥ 35 °C | ≥ 12 °C, ≤ 32 °C |
| CO₂ | ≥ 5,000 ppm | ≤ 4,000 ppm |
| Battery | ≤ 20 % | ≥ 25 % |

You can change every threshold per plant on the **Settings** tab. Moisture values are whole
numbers with minimum < target < maximum, at least 4 points apart. The clear value of an
override must sit between its trigger value and the normal range. Species data from
[OpenPlantBook](openplantbook.md) replaces the moisture minimum and maximum defaults. Your own
values always win.

## Health score

The **Health score** sensor goes from 0 to 100. The panel shows it on the **Sensors** tab
under **Troubleshooting** as **Overall health**.

- Soil moisture scores 100 at the target, 50 at the minimum and maximum, and 0 at 0 % and
  100 %.
- Every other reading scores 100 while its problem sensor is off and 0 while it's on.
- The score is the weighted average of the readings that have a value: soil moisture 3,
  temperature 2, all others 1. Battery never counts. Light doesn't count at night.

For example, moisture at 80, temperature fine and humidity stress on give
(3 × 80 + 2 × 100 + 1 × 0) / 6 ≈ 73. Readings without a current value are left out. Without
any, the score is unavailable. The attributes `configured`, `contributors`, `confidence` and
`confidence_label` tell you how complete it is, see [Entities](entities.md#sensors).

## When a sensor changes or disappears

Smart Plants stores sensors by their entity registry ID, so renaming a sensor's entity ID keeps
the assignment. A sensor without a unique ID is stored by entity ID, and renaming it breaks the
assignment.

### When a sensor disappears

When an assigned sensor is removed from Home Assistant, the plant keeps the assignment and
Home Assistant shows the repair "Smart Plants: assigned source missing".

1. Go to **Settings > System > Repairs** and select the issue.
2. Pick a replacement, or leave the field empty to remove the assignment.
3. Select **Submit**.

A replacement for the main sensor becomes the main sensor. The issue goes away when the sensor
comes back or you change the assignment in the panel. Paused plants raise no repairs.
