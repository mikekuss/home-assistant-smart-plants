# Troubleshooting

When you [report a bug](#report-a-bug), the diagnostics file and the log usually show the
cause. Everything below stays on your system until you attach it yourself.

## Download diagnostics

1. Go to **Settings > Devices & services** and open **Smart Plants**.
2. Select **⋮** next to the Smart Plants entry, then **Download diagnostics**.
3. Attach the downloaded `.json` file to your bug report.

The file is redacted: it contains versions, settings, counts and states, for example how many
plants, sensors per role and care tasks exist. It doesn't contain plant names, readings,
thresholds, care history, photos or OpenPlantBook credentials. Home Assistant adds the open
repairs of Smart Plants: a repair for a missing sensor is listed with the sensor's entity ID
and an internal plant ID. Look through the file before you post it.

Home Assistant offers the download only while Smart Plants is set up. If setup failed, copy the
error shown on the Smart Plants entry and attach the log instead. When the stored data can't be
loaded, the log names the storage version on disk and the one your Smart Plants version
supports.

For a problem with one plant, also download that plant's diagnostics: open the plant and select
**⋮ > Download diagnostics** in its top card. That file contains the plant's configuration,
its sensor and automation entity IDs and its current evaluation, without the plant name,
notes, photo or credentials. The **Sensors** tab shows the same evaluation under
**Troubleshooting**.

## Turn on debug logging

1. Go to **Settings > Devices & services**, open **Smart Plants** and select **⋮** at the top
   right **> Enable debug logging**.
2. Reproduce the problem.
3. Select **⋮** at the top right **> Disable debug logging**. Your browser then downloads the
   log file.
4. Paste the lines that mention `smart_plants` into your bug report.

Or add this to `configuration.yaml` and restart:

```yaml
logger:
  logs:
    custom_components.smart_plants: debug
```

Errors are logged without debug logging too. Find them under **Settings > System > Logs**:
search for `smart_plants` and open an entry to see its full text. For most panel commands, an
unexpected error logs the command, the error type and where in Smart Plants it was raised, but
not what you entered. Other errors are logged with their full message and traceback, which can
contain plant names or entity IDs.

## Browser console errors

For problems in the panel or the dashboard card, the browser often knows more than the log.

1. Open the page with the problem in a desktop browser.
2. Open the developer tools: **F12** or **Ctrl+Shift+I**, on a Mac **Cmd+Option+I**. In
   Safari, first turn on **Show features for web developers** in the advanced settings.
3. Select the **Console** tab, reload the page and repeat what went wrong.
4. Copy the red error lines into your bug report.

The console can show your Home Assistant address and entity IDs. Remove what you don't want to
share. If the problem only happens in the companion app, say so in the report.

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

### "This task was changed somewhere else while you edited it"

Someone changed the same field of the care task in another tab or device, or an action did. The
editor keeps your value for the fields it names and shows the other change in every field you
didn't touch. **Save** again to keep your value; fields you didn't touch keep the other change.

### A photo is rejected

Photos must be JPEG, PNG, WebP or HEIC, up to 40 MiB and 64 megapixels, and the content must
match the file type. A PNG renamed to `.jpg` is rejected. HEIC files only work in Safari on
macOS. Other desktop browsers say they can't read HEIC photos; convert the photo to JPEG first.
On an iPhone or iPad the panel doesn't offer HEIC, so iOS hands over a JPEG copy instead.

### "The photo was larger than a proxy in front of Home Assistant allows"

The browser reduces every photo to under 1 MB before the upload, which fits the default limit
of most reverse proxies. A proxy set to a lower limit still refuses it. In the NGINX Home
Assistant SSL proxy add-on (4.5.0 or later), raise **Max body size (in MB)**
(`client_max_body_size_megabytes`) on its **Configuration** tab. For another proxy, raise its
limit for the request body size, such as `client_max_body_size` in a plain NGINX setup.

### "This photo couldn't be made small enough to upload"

Even at 1280 pixels on the longer side and the lowest quality, the photo didn't get under
1 MB. This is rare and happens with photos full of fine detail or noise. Crop the photo, or
choose one with fewer megapixels.

### "Home Assistant's disk is full or read-only"

Smart Plants couldn't save the photo because the Home Assistant disk is full or mounted
read-only. The plant keeps its previous photo. Free up space, for example by deleting old
backups, then upload the photo again.

### "Smart Plants storage is full"

All plants share one storage file of at most 8 MiB. Delete old care entries or long notes.
When an update converts the stored data, the file can end up a little over the limit. Smart
Plants still starts, but every change says the storage is full until you delete entries.

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

A sensor counts as not updating when it hasn't reported for **Not updating after**: 24 hours
by default, 7 days for the battery. Home Assistant's MQTT integration, which Zigbee2MQTT sensors
also use, doesn't write a sensor's state again while its value stays the same, unless
`force_update` is set on the entity. Smart Plants then sees no new report, so a steady value can
look stale although the sensor works. Raise **Not updating after** for that reading under
**Several sensors for one reading**, up to 7 days (604800 seconds). See
[Data updates](sensors-and-health.md#data-updates).

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

### An automation stopped working after retiring a plant

Retiring removes the plant's entities, so automations, scripts and dashboards that used them
stop working, as after a delete. Point them at another plant, or restore the plant from
**⋮ > Retired plants** in the overview.

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
- The panel, setup and entity names are in English, German and Italian.
- The history chart needs the recorder. Its **24 h** range goes back as far as the recorder
  keeps short-term statistics, 10 days by default.
- Smart Plants never switches devices.

## Report a bug

Search the [issues](https://github.com/mikekuss/home-assistant-smart-plants/issues) first, then
open a bug report. Include:

- your Home Assistant and Smart Plants versions,
- the steps to reproduce,
- the [diagnostics file](#download-diagnostics),
- the log lines, ideally with [debug logging](#turn-on-debug-logging),
- for panel or card problems, your browser and its [console errors](#browser-console-errors).
