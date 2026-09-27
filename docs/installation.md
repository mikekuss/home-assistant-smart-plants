# Installation

This page covers installing, configuring, updating, and removing Smart Plants, and how to
back up its data.

## Requirements

- Home Assistant **2026.8.0** or newer.
- An administrator account. The Smart Plants panel and its photo endpoints are admin-only.
- Optional: an [OpenPlantBook](https://open.plantbook.io/) account with API client
  credentials if you want species search. See [OpenPlantBook](openplantbook.md).

## Install with HACS

Smart Plants is currently distributed through HACS as a custom repository.

[![Open your Home Assistant instance and open this repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=mikekuss&repository=home-assistant-smart-plants&category=integration)

If you prefer to add it by hand:

1. Open **HACS** in the sidebar.
2. Open the **⋮** menu in the top-right corner and choose **Custom repositories**.
3. Enter `https://github.com/mikekuss/home-assistant-smart-plants` as the repository and
   choose **Integration** as the category. Select **Add**.
4. Search for **Smart Plants** in HACS, open it, and select **Download**.
5. Restart Home Assistant.

## Install manually

1. Download the repository (for example the source archive of a
   [release](https://github.com/mikekuss/home-assistant-smart-plants/releases)).
2. Copy the `custom_components/smart_plants` folder into the `custom_components` folder of
   your Home Assistant configuration directory. The result should be
   `<config>/custom_components/smart_plants/manifest.json`.
3. Restart Home Assistant.

The folder already contains the built sidebar panel, so there is nothing to compile.

## Add the integration

[![Open your Home Assistant instance and start setting up Smart Plants.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=smart_plants)

Or go to **Settings → Devices & services → Add integration** and search for **Smart Plants**.

The setup form has three optional fields:

| Field | Meaning |
| --- | --- |
| Enable direct OpenPlantBook provider | Turns on species search through OpenPlantBook. Leave it off to manage plants manually. |
| OpenPlantBook client ID | Your OpenPlantBook API client ID. |
| OpenPlantBook client secret | Your OpenPlantBook API client secret. |

If you enable OpenPlantBook, Smart Plants checks the credentials before finishing setup. You
can skip OpenPlantBook entirely and add it later.

Smart Plants allows a single configuration entry. All your plants live inside that one entry;
if you try to add the integration a second time, setup stops with "Smart Plants is already
configured."

After setup, a **Smart Plants** item appears in the sidebar for admin users. Continue with
[Getting started](getting-started.md).

## Options

Go to **Settings → Devices & services → Smart Plants → Configure**.

| Option | Default | Meaning |
| --- | --- | --- |
| Preserve inventory when the integration is removed | Off | Keeps your plant data and photos on disk when you delete the integration, so a later reinstall picks them up again. |
| Enable direct OpenPlantBook provider | Off | Turns OpenPlantBook species search on or off. |
| OpenPlantBook client ID | – | Your client ID. |
| OpenPlantBook client secret | – | The stored secret is never shown. Leave the field empty to keep the current secret. |

Saving the options reloads the integration. Turning OpenPlantBook off, or a provider outage,
never affects your local plants.

## Update

- **HACS:** when HACS shows an update for Smart Plants, install it and restart Home Assistant.
- **Manual:** replace the `custom_components/smart_plants` folder with the new version and
  restart.

Your plant data is stored outside `custom_components/`, so updating never touches it. The
panel is loaded with a version-specific URL. If the panel still looks outdated after a
restart, reload the browser page (or clear the app cache in the companion app).

## Uninstall

1. If you plan to reinstall and want to keep your plants, first enable **Preserve inventory
   when the integration is removed** in the options (see above).
2. Go to **Settings → Devices & services → Smart Plants**, open the **⋮** menu and select
   **Delete**.
3. If you installed through HACS, open Smart Plants in HACS and remove it. If you installed
   manually, delete `<config>/custom_components/smart_plants`.
4. Restart Home Assistant.

What happens to your data when you delete the integration:

| Data | Default | With "Preserve inventory" enabled |
| --- | --- | --- |
| Plant inventory (`.storage/smart_plants.inventory`), including species data, thresholds, sensor assignments, and care history | Deleted | Kept |
| Plant photos (`smart_plants/images/`) | Deleted | Kept |
| Plant devices and entities in Home Assistant | Removed | Removed (recreated when you add the integration again) |
| Your own automations, scripts, and dashboards | Not changed | Not changed |

Automations that reference removed plant entities stay in place but stop working until the
entities exist again. If you preserved the inventory but decide not to reinstall, you can
delete the two paths above yourself.

## Backup and restore

Smart Plants keeps all of its user data in two places inside the Home Assistant configuration
directory:

- `.storage/smart_plants.inventory` – the plant inventory: plants, species data, thresholds,
  sensor assignments, care history, and references to photos.
- `smart_plants/images/` – the plant photos, stored as WebP files.

A full Home Assistant backup that includes the configuration directory contains both. A
backup of only one of them, or of `custom_components/smart_plants`, is **not** a complete
Smart Plants backup.

When restoring:

- Restore both paths from the **same** backup. Don't combine an inventory from one point in
  time with photos from another.
- If you restore files by hand, do it while Home Assistant is stopped, then start it and check
  that Smart Plants loads and your plants and photos appear in the panel.
- A photo that the inventory references but that is missing on disk is shown as unavailable.
  Photo files that no longer belong to any plant are removed automatically after a grace
  period.

Sensor entities are not part of Smart Plants data. After a restore, make sure the sensors you
assigned still exist; missing ones are reported in **Settings → Repairs** (see
[Sensors and health](sensors-and-health.md#when-a-source-sensor-disappears)).
