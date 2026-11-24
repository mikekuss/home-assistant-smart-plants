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
- Every role is optional. Without a soil moisture sensor there are no watering alerts, and the
  plant's status comes from its other readings. A plant shows *No sensors* while no sensor is
  assigned, or only a battery sensor, because the battery level says nothing about the plant.

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
after**: 24 hours by default, 7 days for the battery. You can set it per plant and reading from
60 seconds to 7 days, in seconds. A new sensor gets one full window before it can count as not
updating. An assigned sensor that no longer exists counts as not updating at once.

After Home Assistant restarts, each sensor gets one full **Not updating after** window again
before it counts as not updating, so *Sensor stale* can stay off for a day after a restart (a
week for the battery). The plant status doesn't wait: a sensor that is unavailable or has no
usable value makes the plant show *No recent data* right away.

A sensor that reports the same value again stays current, as long as Home Assistant records
the report. Home Assistant's MQTT integration, which Zigbee2MQTT sensors also use, doesn't write
a sensor's state again while its value stays the same, unless `force_update` is set on the
entity. The device may keep sending, but Smart Plants sees no new report. A soil moisture sensor
in a pot that barely dries can go many hours without a change, and such a sensor counts as not
updating once **Not updating after** has passed, although it works. If that happens, raise
**Not updating after** for that reading, up to 7 days.

A plant shows *No recent data* when an assigned sensor is not updating or has no usable value
and nothing more urgent applies. The plant page names the sensor, for example
*Temperature: sensor is not reporting*. Two sensors are exceptions:

- **Battery** never counts for the plant, because a battery level says nothing about the plant.
  The plant's *Battery* sensor still becomes unavailable once the battery sensor is not
  updating, after 7 days by default.
- **Light** doesn't count from 18:00 to 08:00. In the morning it counts once its window has
  passed since 08:00, so with a window of 6 hours, a quiet light sensor counts from 14:00. A
  window of 10 hours or more, such as the default, covers the whole day, so it gets that morning
  only after a day on which the sensor reported or was assigned. A light sensor that stays
  silent through such a day is no longer hidden from 08:00 the next morning, so it counts as not
  updating as soon as its window has passed.

For soil moisture, *Sensor stale* turns on while any moisture sensor is not updating. For the
other readings, the problem sensor becomes unavailable instead.

Earlier versions used 6 hours for every reading. On update, a reading still set to exactly 6
hours moves to its new default. Any other value you set stays.

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

After you log a watering, *Needs water* and *Too wet* stay off for 24 hours from the time of
the entry. Before the water reaches it, the sensor still reads a dry pot; then it reads the
fresh water while it drains, often well above the maximum. Soil that is still above the
maximum when the 24 hours are over turns *Too wet* on. This holds for the panel, the card,
the *Watered* button and the `smart_plants.log_care` action. Other sensors and the health
score don't change.

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
override must sit between its trigger value and the normal range. Your own values always win.

Species data from [OpenPlantBook](openplantbook.md) replaces some defaults:

- The moisture minimum and maximum.
- The temperature range the species likes. Its lowest and highest temperature become the
  temperature triggers. The clear values keep the built-in gap, 2 °C above the low trigger and
  3 °C below the high one.
- The air humidity range the species likes. Its lowest and highest humidity become the
  humidity triggers, and the clear values sit 5 % inside them.

When the species gives only one side of a range, the other side keeps the built-in value. When
its values don't fit a value you entered, or leave too little room between trigger and clear,
the reading keeps the built-in values; the species is still applied. In **Edit thresholds** a
value from the species reads *Species default*.

## Winter values

Some plants spend the winter cool, dry and dark, for example an oleander in a garage at 5 °C.
With its normal thresholds it would report *Too cold*, *Needs water* and *Low light* all
winter. Winter values are a second set of thresholds that replace the normal ones while winter
applies. Most plants don't need them, and a plant without winter values doesn't change.

Winter applies to a plant with winter values:

- during its [rest period](care.md#set-a-rest-period), or
- while its placement is **Dormant storage** (under **More details**).

Either one is enough. Dormant storage has no end date: winter values apply until you change
the placement.

To add them, open the plant's **Settings** tab, expand **Other targets** and select **Add winter
values**. The editor shows one group per check the plant has a sensor for: temperature, soil
temperature, soil moisture, light, fertilizer level and air humidity. It starts from the current
values. Change only what should be different in winter; a check you leave as it is keeps its
normal values.
The values where an alert turns off again keep the same distance as the normal ones. The editor
suggests:

- for temperature, the lowest temperature the species survives, when OpenPlantBook has it,
- for soil temperature, the same value, but only when it is below the plant's normal *Too cold
  below* for the soil, so winter never makes the soil check stricter (soil temperature accepts
  −20 to 60 °C, so a colder value isn't suggested there either),
- for soil moisture, about two thirds of the normal *Needs water below* and three quarters of
  *Ideal*,
- for light, 0 lx, which turns the low light alert off,
- for fertilizer level, half the normal lower bound.

It suggests nothing for air humidity, because dry heating air is a real problem in winter. A
temperature floor below the species' survival temperature shows a warning. For soil temperature
the warning follows the suggestion: it only appears when the survival temperature is below the
normal soil floor.

While winter values apply, the plant page shows **Winter values until end of** *month* (rest
period) or **Winter values · dormant storage**. Select it to see what changes, such as
*Temperature 0–35 °C instead of 10–35 °C*. Ranges that use a winter value show a snowflake, and
the overview and the dashboard card show a snowflake next to the status. A plant in dormant
storage without winter values that reports *Too cold*, *Soil too cold*, *Low light* or *Needs
water* offers **Add winter values** next to the problem.

The problem sensors use the winter values while they apply, so automations keep working
without changes. The binary sensors of a plant with winter values report whether they apply,
see [Winter values](entities.md#winter-values). Snoozing and pausing work as before. Retiring a
plant drops its winter values, like its other custom thresholds.

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
