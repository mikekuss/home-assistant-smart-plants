# Troubleshooting

## Download diagnostics

1. Go to **Settings → Devices & services → Smart Plants**.
2. Open the **⋮** menu and select **Download diagnostics**.

The file is designed to be safe to share. It contains:

- whether OpenPlantBook is enabled and whether credentials are configured (yes/no only; the
  client ID and secret themselves are never included),
- whether "Preserve inventory when the integration is removed" is on,
- OpenPlantBook connection status, such as whether a token and cached results exist,
- inventory counts: number of plants, active vs. disabled plants, species sources, assigned
  moisture sources, photos, and internal pending operations.

It does **not** contain plant names, entity IDs, care history, or photos. Still, have a look
at the file before attaching it publicly.

> [!NOTE]
> The **Diagnostics** tab inside the Smart Plants panel is different: it shows a plant's
> health, problem indicators, and thresholds and is not a file you can download.

## Enable debug logging

Add this to `configuration.yaml` and restart Home Assistant:

```yaml
logger:
  default: warning
  logs:
    custom_components.smart_plants: debug
```

Alternatively, go to **Settings → Devices & services → Smart Plants**, open the **⋮** menu,
and select **Enable debug logging**. Reproduce the problem, then disable it again to download
the log.

## Common issues

### The Smart Plants panel doesn't appear in the sidebar

- The panel is **admin-only**. Log in with an administrator account.
- Make sure the integration is set up and loaded under **Settings → Devices & services**.
  The sidebar entry is removed while the integration is not loaded.
- After installing or updating, restart Home Assistant, then reload the browser page. In the
  companion app, clear the frontend cache (in the app settings) or restart the app.
- If you hid the panel from the sidebar, re-show it via your profile's sidebar settings.

### The panel shows "Smart Plants requires an admin account"

Your current user is not an administrator. Ask an administrator to change your user or log
in with an administrator account.

### A plant shows no moisture reading

- Check that at least one moisture sensor is assigned in the plant's **Sensors** tab.
- With the **primary** aggregation (the default), a primary sensor must be selected. Either
  pick one or switch to average, min, or max.
- The source must report a numeric value with the unit `%`, between 0 and 100. Sensors with a
  different or missing unit are ignored. Check the source in **Developer tools → States**.
- A source that is stale is excluded. With **primary**, a stale primary sensor makes the plant
  reading unavailable (there's no automatic fallback).

The same applies to the other roles with their own units; see
[Sensors and health](sensors-and-health.md#supported-roles).

### Sensor stale is on, but the sensor works

A source is considered stale when its state or attributes haven't changed in Home Assistant
within the **stale after** window (6 hours by default). Some sensors only report when the
value changes, and a very stable reading can look stale. Increase **Stale after** for that
role in the plant's **Sensors** tab, or check whether the device has stopped reporting.

### A problem indicator is unavailable

Unavailable means Smart Plants has no trustworthy value, which is deliberately different from
"no problem". Common causes:

- no valid reading from the assigned sensors (unit mismatch, out-of-range value, sensor
  offline),
- a source for that role is stale,
- for *Low light*: fewer than two daytime readings in the last two hours,
- the plant is disabled.

### "Smart Plants: assigned source missing" in Repairs

An assigned sensor was removed from Home Assistant. Open the issue in
**Settings → System → Repairs** and choose a replacement or leave the field empty to remove
the assignment. See
[Sensors and health](sensors-and-health.md#when-a-source-sensor-disappears).

If the fix fails with "The replacement is unavailable, incompatible, or no longer matches the
entity registry", pick a different entity from the `sensor` domain.

### OpenPlantBook errors

| Symptom | What to do |
| --- | --- |
| "OpenPlantBook rejected these credentials." | Check the client ID and secret on the [OpenPlantBook API key page](https://open.plantbook.io/apikey/) and enter them again. |
| "OpenPlantBook could not be reached." | Check your internet connection and try later, or disable the provider for now. |
| A reauthentication prompt appears under **Settings → Devices & services** | The stored credentials stopped working. Open the prompt and enter valid credentials. |
| Search offers no OpenPlantBook option, or it's greyed out | Enable the provider and add credentials in the integration options. See [OpenPlantBook](openplantbook.md). |
| Applying species data fails | The imported moisture range conflicts with your current thresholds. Adjust the moisture overrides and try again. |
| A reviewed species can't be applied after a while | Previews are valid for 10 minutes. Request a new preview. |

OpenPlantBook problems never affect your existing plants or their entities.

### Photo upload is rejected

Photos must be JPEG, PNG, or WebP, at most 5 MiB, and at most 2048 × 2048 pixels. Larger
images are rejected rather than resized, so scale them down first. The file content must
match its type (for example, a PNG renamed to `.jpg` is rejected).

### "Review changes from another session"

Someone saved changes to the same plant in another browser tab or device while you were
editing. The panel keeps your edits and shows what changed. Review the differences before
saving again.

### "Care history is full"

Each plant keeps up to 256 care entries. Delete old entries in the **Care history** tab to
make room.

## Report a bug

Please open an issue on
[GitHub](https://github.com/mikekuss/home-assistant-smart-plants/issues) and include:

- your Home Assistant version (**Settings → About**),
- your Smart Plants version (shown in HACS or on the integration page),
- how you installed it (HACS or manual),
- steps to reproduce, what you expected, and what happened instead,
- the diagnostics file (see above),
- relevant log lines with debug logging enabled,
- for panel problems: your browser or companion app version and any errors from the browser
  developer console.

Search existing issues first. Review diagnostics and logs for anything you don't want to share
before posting them.
