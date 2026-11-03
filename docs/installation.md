# Installation

This page covers installing, configuring, updating, and removing Smart Plants, and how to
back up its data.

## Requirements

- Home Assistant **2026.8.0** or newer.
- An administrator account. The Smart Plants panel and adding or removing photos are
  admin-only.
- Optional: an [OpenPlantBook](https://open.plantbook.io/) account with API client
  credentials if you want species search. See [OpenPlantBook](openplantbook.md).

## Supported versions

**Home Assistant.** Smart Plants supports Home Assistant 2026.8.0 and every newer stable
release. Beta and development builds of Home Assistant aren't supported. CI tests every change
against the minimum version and the newest stable release before it's merged.

The minimum goes up only when Smart Plants needs something that older Home Assistant versions
don't have. A raise comes in a minor or major release, never in a patch release, and the
[changelog](../CHANGELOG.md) names the new minimum. HACS doesn't install a release that needs a
newer Home Assistant than the one you run, so you keep the last release that works with yours.

**Version numbers.** From 1.0 on, Smart Plants follows [semantic versioning](https://semver.org/):

| Release | Example | What it can contain |
| --- | --- | --- |
| Patch | 1.0.1 | Fixes only. |
| Minor | 1.1.0 | New features, and a higher minimum Home Assistant version. Existing automations keep working. |
| Major | 2.0.0 | Changes that can break existing automations, templates or dashboards. |

The promise covers what you use in Home Assistant: the entities with their unique IDs, states
and documented attributes ([Entities](entities.md)), the actions with their fields and
responses, the triggers and conditions ([Automations](automations.md)), and the dashboard card
options ([Dashboard card](dashboard-card.md)). It doesn't cover the panel's layout, the
WebSocket commands and photo addresses the panel uses internally, or the format of the storage
files.

Releases before 1.0 can contain breaking changes in a minor release. The changelog lists them
under **Changed** or **Removed**.

**Deprecations.** When part of that interface is going to change or go away, the changelog
says so under **Deprecated** at least one minor release before. The change itself waits for the
next major release.

**Fixes.** Only the latest release gets fixes, security fixes included. Older releases don't
get backports. If an update causes a problem, you can
[roll back](#roll-back-to-an-earlier-version) and
[report it](https://github.com/mikekuss/home-assistant-smart-plants/issues).

## Install with HACS

Smart Plants is part of the HACS default store, so you don't need to add a custom repository.

[![Open your Home Assistant instance and open this repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=mikekuss&repository=home-assistant-smart-plants&category=integration)

If you prefer to find it by hand:

1. Open **HACS** in the sidebar.
2. Search for **Smart Plants**, open it, and select **Download**.
3. Restart Home Assistant.

If Smart Plants doesn't show up in the search, your HACS installation may not have refreshed
its repository list yet. You can add it as a custom repository instead:

1. In HACS, open the **⋮** menu in the top-right corner and choose **Custom repositories**.
2. Enter `https://github.com/mikekuss/home-assistant-smart-plants` as the repository and
   choose **Integration** as the category. Select **Add**.
3. Continue with step 2 above.

If you added Smart Plants as a custom repository before it joined the default store, you
don't need to change anything. Updates keep arriving the same way.

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
| Forecast refresh interval | 30 min | How often Smart Plants fetches the forecast of a weather entity that a forecast reading task watches, from 15 to 180 minutes. A change of the weather entity still fetches it again, at most once every 5 minutes. Without forecast reading tasks, nothing is fetched. |
| Enable direct OpenPlantBook provider | Off | Turns OpenPlantBook species search on or off. |
| OpenPlantBook client ID | none | Your client ID. |
| OpenPlantBook client secret | none | The stored secret is never shown. Leave the field empty to keep the current secret. |

Saving the options reloads the integration. Turning OpenPlantBook off, or a provider outage,
never affects your local plants.

## Update

Before you update, make sure a recent backup includes the Smart Plants data (see
[Backup and restore](#backup-and-restore)), and read the release notes for **Changed** and
**Removed** entries.

- **HACS:** when HACS shows an update for Smart Plants, install it and restart Home Assistant.
- **Manual:** replace the `custom_components/smart_plants` folder with the new version and
  restart.

Smart Plants keeps your plant data outside `custom_components/`, so replacing the folder
doesn't touch it. When a new version starts for the first time, it may convert the stored data
to its own format. Older versions can't read the converted data, which is why rolling back
needs a copy of the old data.

A browser tab that stays open while Home Assistant restarts keeps running the previous
version of the panel until the page is reloaded. The panel notices this and shows
*Smart Plants was updated* with a **Reload** button. Reloading loads the new version; you do
not need to clear the browser cache. The check runs in the version you are updating from,
so when updating from 0.5.0 or earlier, reload the page yourself. If the panel still looks
outdated after reloading, clear the app cache in the companion app.

### Roll back to an earlier version

If the earlier version loads your plants normally, installing it is all you need to do. If the
new version converted the data, the earlier version refuses it. Smart Plants then fails to set
up, and
**Settings → Devices & services** reports that the storage was created by a newer integration
version. To go back:

1. Install the earlier version. In HACS, open Smart Plants, open the **⋮** menu, select
   **Redownload** and pick the version. For a manual installation, replace the
   `custom_components/smart_plants` folder with the one from that release.
2. Stop Home Assistant and copy `.storage/smart_plants.inventory.backup` over
   `.storage/smart_plants.inventory`. Smart Plants saves that copy of the old inventory right
   before it converts, and each conversion replaces it. If the copy is missing, restore all
   three Smart Plants data locations from a backup made before the update instead (see
   [Backup and restore](#backup-and-restore)). Restoring that whole Home Assistant backup
   works too.
3. Start Home Assistant and check that your plants and photos appear in the panel.

Anything you changed since the copy or backup was made is lost, such as new plants, logged
care and new photos. Deleting the integration deletes the copy along with the inventory,
unless *Preserve inventory when the integration is removed* is enabled.

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
| Reading task state (`.storage/smart_plants.reading_state`) | Deleted | Kept |
| Plant photos (`smart_plants/images/`) | Deleted | Kept |
| Plant devices and entities in Home Assistant | Removed | Removed (recreated when you add the integration again) |
| Your own automations, scripts, and dashboards | Not changed | Not changed |

Automations that reference removed plant entities stay in place but stop working until the
entities exist again. If you preserved the inventory but decide not to reinstall, you can
delete the paths above yourself.

## Backup and restore

Smart Plants keeps all of its user data inside the Home Assistant configuration directory:

- `.storage/smart_plants.inventory`: the plant inventory with plants, species data,
  thresholds, sensor assignments, care tasks, care history, and references to photos.
- `.storage/smart_plants.reading_state`: whether each reading task is due or waiting. Without
  it, reading tasks start fresh, which can mean one extra reminder.
- `smart_plants/images/`: the plant photos, stored as WebP files.

A full Home Assistant backup that includes the configuration directory contains all of them. A
backup of only some of them, or of `custom_components/smart_plants`, is **not** a complete
Smart Plants backup.

When restoring:

- Restore all three locations from the **same** backup. Don't combine an inventory from one
  point in time with reading task state or photos from another.
- If you restore files by hand, do it while Home Assistant is stopped, then start it and check
  that Smart Plants loads and your plants and photos appear in the panel.
- A photo that the inventory references but that is missing on disk is shown as unavailable.
  Photo files that no longer belong to any plant are removed automatically after a grace
  period.

Sensor entities are not part of Smart Plants data. After a restore, make sure the sensors you
assigned still exist; missing ones are reported in **Settings → Repairs** (see
[Sensors and health](sensors-and-health.md#when-a-source-sensor-disappears)).
