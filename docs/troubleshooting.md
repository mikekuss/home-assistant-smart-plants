# Troubleshooting

## Download diagnostics

Go to **Settings > Devices & services > Smart Plants** and select **⋮ > Download
diagnostics**. The file contains settings, counts and states, for example how many plants,
sensors per role and care tasks exist. It doesn't contain plant names, entity IDs, readings,
thresholds, care history, photos or credentials. Look through it before you post it.

Each plant also has its own diagnostics. Open the plant and select **⋮ > Download diagnostics**.
That file contains the plant's configuration, its sensor and automation entity IDs and its
current evaluation, without the plant name, notes, photo or credentials. The **Sensors** tab
shows the same evaluation under **Troubleshooting**.

## Turn on debug logging

Go to **Settings > Devices & services > Smart Plants** and select **⋮ > Enable debug
logging**. Reproduce the problem, then turn it off to download the log. Or add this to
`configuration.yaml` and restart:

```yaml
logger:
  logs:
    custom_components.smart_plants: debug
```

## Panel

### Smart Plants is missing from the sidebar

- Only administrators see the panel.
- Check that the integration is loaded under **Settings > Devices & services**.
- After an install or update, restart Home Assistant and reload the page. In the companion
  app, clear the frontend cache in the app settings.
- If you hid the panel, show it again in your profile's sidebar settings.

### "Smart Plants requires an admin account."

Your user isn't an administrator. Sign in as an administrator, or use the
[dashboard card](dashboard-card.md).

### "This plant was changed somewhere else."

Someone saved the same plant in another tab or device. The panel keeps your edits. Check the
latest values and save again.

### A photo is rejected

Photos must be JPEG, PNG or WebP, up to 40 MiB and 64 megapixels, and the content must match
the file type. A PNG renamed to `.jpg` is rejected.

### "Smart Plants storage is full"

All plants share one storage file of at most 8 MiB. Delete old care entries or long notes.

## Readings and status

### A plant shows no soil moisture

- Check that a moisture sensor is assigned on the **Sensors** tab.
- With several sensors and **Main sensor only**, pick a **Main sensor** under **Several
  sensors for one reading**, or choose **Average**, **Lowest** or **Highest**. Until then the
  plant shows *No main sensor*.
- The sensor must report a number in `%` from 0 to 100. Check it in **Developer tools >
  States**.
- With **Main sensor only**, a main sensor that isn't updating makes the value unavailable.

The other readings work the same with their own units, see
[Supported sensors](sensors-and-health.md#supported-sensors).

### *Sensor stale* is on, but the sensor works

A sensor counts as not updating when it hasn't reported for **Not updating after**, 6 hours by
default. Sensors that report only on a change can look stale while their value is stable.
Raise **Not updating after** for that reading under **Several sensors for one reading**.

### A problem sensor is unavailable, not off

Smart Plants reports "no problem" only with a valid, current reading, so a broken sensor never
looks healthy. Common causes:

- No valid reading, for example a wrong unit, a value out of range or an offline sensor.
- A sensor of that reading isn't updating.
- *Low light* has daytime readings from fewer than two minutes in the last two hours, or its
  sensor isn't updating at night.
- The plant is paused.

### "Smart Plants: assigned source missing" in Repairs

An assigned sensor was removed from Home Assistant. Open the repair and pick a replacement, or
leave the field empty to remove it. See
[When a sensor disappears](sensors-and-health.md#when-a-sensor-disappears). If the fix fails
with "The replacement is unavailable, incompatible, or no longer matches the entity registry",
pick another `sensor` entity.

## Automations and care

### An automation didn't fire after a restart

The Smart Plants triggers fire when a problem starts, not when an entity comes back from
unavailable. After a restart, resuming a plant or a sensor reconnecting, the trigger doesn't
fire again, or every restart would repeat your notifications. A snooze that ends while Home
Assistant is off fires nothing either. The [daily report](notifications.md#daily-plant-report)
still lists the plant.

### Old care entries disappeared

Each plant keeps up to 256 entries. A new entry beyond that removes the oldest watering first,
then the oldest note, then the oldest entry that isn't the latest of its type.

### A reading task shows *No reading*

The task's sensor gives no usable number. The task keeps its state until a reading arrives.

- Check the sensor in **Developer tools > States**. It must report a number.
- For a plant sensor, check the reading on the **Sensors** tab.
- Another sensor's unit must be convertible into the task's unit. A sensor without a unit
  doesn't work.
- A paused plant's tasks show no reading.

### A forecast task shows *No forecast*

- The weather entity must be available, report a temperature unit and offer a forecast. Test
  it in **Developer tools > Actions** with `weather.get_forecasts` and `type: hourly` or
  `type: daily`.
- If you removed or renamed the weather entity, edit the task and pick it again.
- With debug logging, each failed fetch logs a line such as
  `Forecast for weather.home skipped: no forecast type`.

For OpenPlantBook messages, see [OpenPlantBook](openplantbook.md#troubleshooting).

## Known limitations

- Only administrators can use the panel. Other users get the dashboard card and the entities.
- Plants are managed in the panel. Only the moisture limits are entities.
- There is no import from other plant integrations.
- The panel, setup and entity names are in English and German.
- The history chart needs the recorder. Its **24 h** range goes back as far as the recorder
  keeps short-term statistics, 10 days by default.
- Smart Plants never switches devices.

## Report a bug

Search the [issues](https://github.com/mikekuss/home-assistant-smart-plants/issues) first, then
open a bug report. Include your Home Assistant and Smart Plants versions, the steps to
reproduce, the diagnostics file and debug log lines. For panel problems, add your browser and
any console errors.
