# Installation

## Requirements

- Home Assistant 2026.8.0 or newer.
- An administrator account. Only administrators can open the Smart Plants panel and add or
  remove photos.
- Optional: an [OpenPlantBook](openplantbook.md) account for species search.

## Install from the Marketplace or HACS

Smart Plants is in the default catalog, so you don't need to add a custom repository.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=mikekuss&repository=home-assistant-smart-plants&category=integration)

The button opens the Marketplace on Home Assistant 2026.11 and newer, and HACS on older
versions.

**Home Assistant 2026.11 and newer**

1. Go to **Settings > Marketplace**.
2. Search for **Smart Plants** and select **Install**.
3. The setup of the integration opens. Continue with [Add the integration](#add-the-integration).

**Home Assistant 2026.8 to 2026.10 with HACS**

1. Open **HACS** in the sidebar.
2. Search for **Smart Plants**, open it and select **Download**.
3. Restart Home Assistant.

## Install manually

1. Download the source archive of a
   [release](https://github.com/mikekuss/home-assistant-smart-plants/releases).
2. Copy the `custom_components/smart_plants` folder into the `custom_components` folder of
   your configuration directory, so that `<config>/custom_components/smart_plants/manifest.json`
   exists.
3. Restart Home Assistant.

The folder contains the built panel. There is nothing to compile.

## Add the integration

[![Open your Home Assistant instance and start setting up a new integration.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=smart_plants)

Or go to **Settings > Devices & services > Add integration** and search for **Smart Plants**.

All fields are optional. Leave them empty to use Smart Plants without OpenPlantBook.

| Field | Description |
| --- | --- |
| Enable direct OpenPlantBook provider | Turns on species search. |
| OpenPlantBook client ID | Your OpenPlantBook API client ID. |
| OpenPlantBook client secret | Your OpenPlantBook API client secret. |

With the provider on, Smart Plants checks the credentials before it finishes. Smart Plants has
one configuration entry for all plants. A second setup stops with "Smart Plants is already
configured."

After setup, **Smart Plants** appears in the sidebar for administrators. Continue with
[Getting started](getting-started.md).

## Options

Go to **Settings > Devices & services > Smart Plants > Configure**. Saving reloads the
integration.

| Option | Default | Description |
| --- | --- | --- |
| Preserve inventory when the integration is removed | Off | Keeps plant data and photos on disk when you delete the integration, so a reinstall finds them again. |
| Forecast refresh interval | 30 min | How often forecast reading tasks fetch the weather forecast, from 15 to 180 minutes. A change of the weather entity also fetches it, at most once every 5 minutes. |
| Enable direct OpenPlantBook provider | Off | Turns species search on or off. |
| OpenPlantBook client ID | Empty | Your client ID. |
| OpenPlantBook client secret | Empty | The form never shows the stored secret. Leave it empty to keep it. |

When OpenPlantBook rejects the stored credentials, Home Assistant shows a reauthentication
prompt for Smart Plants under **Settings > Devices & services**. Your plants keep working in
the meantime.

## Update

Before you update, make sure a recent backup includes the Smart Plants data (see
[Backup and restore](#backup-and-restore)). Read the release notes for **Changed** and
**Removed** entries.

- **Marketplace or HACS:** install the update when it shows up, then restart Home Assistant.
- **Manual:** replace the `custom_components/smart_plants` folder and restart.

The plant data lives outside `custom_components/`, so an update doesn't touch it. A new
version may convert the stored data on its first start. Older versions can't read the
converted data.

A browser tab that was open during the restart shows *Smart Plants was updated* with a
**Reload** button. Reloading loads the new panel.

### Roll back to an earlier version

If the earlier version loads your plants, installing it is enough. If the newer version
converted the data, the earlier version refuses it, and **Settings > Devices & services**
says the storage was created by a newer version. Then:

1. Install the earlier version. In HACS, open Smart Plants, select **⋮ > Redownload** and
   pick the version. Otherwise, [install that release manually](#install-manually).
2. Stop Home Assistant. Copy `.storage/smart_plants.inventory.backup` over
   `.storage/smart_plants.inventory`. Smart Plants writes this copy right before each
   conversion. If it's missing, restore the three Smart Plants locations from a backup made
   before the update (see [Backup and restore](#backup-and-restore)).
3. Start Home Assistant and check that your plants and photos appear in the panel.

Changes made after the copy or backup are lost, for example new plants, care entries and
photos.

## Supported versions

Smart Plants supports Home Assistant 2026.8.0 and every newer stable release. Beta and
development builds aren't supported. CI tests every change against 2026.8.0 and the newest
stable release.

The minimum Home Assistant version goes up only when Smart Plants needs a newer feature. That
happens in a minor or major release, never in a patch, and the [changelog](../CHANGELOG.md)
names the new minimum. The Marketplace and HACS don't offer a release that needs a newer Home
Assistant than yours.

From 1.0, Smart Plants follows [semantic versioning](https://semver.org/):

| Release | Example | Can contain |
| --- | --- | --- |
| Patch | 1.0.1 | Fixes only. |
| Minor | 1.1.0 | New features and a higher minimum Home Assistant version. Existing automations keep working. |
| Major | 2.0.0 | Changes that can break automations, templates or dashboards. |

This covers what you use in Home Assistant: the entities with their unique IDs, states and
documented attributes, the actions with their fields and responses, the triggers and
conditions, and the dashboard card options. It doesn't cover the panel layout, the panel's
internal WebSocket commands and photo URLs, or the storage format. Until 1.0, a minor release
can also contain such a change, and the changelog lists it under **Changed** or **Removed**.

A change to this interface is announced under **Deprecated** at least one minor release
before, and it waits for the next major release. Only the latest release gets fixes, including
security fixes.

## Backup and restore

Smart Plants keeps its data in the Home Assistant configuration directory:

| Path | Contents |
| --- | --- |
| `.storage/smart_plants.inventory` | Plants, species data, thresholds, sensor assignments, care tasks, care history and photo references. |
| `.storage/smart_plants.reading_state` | Whether each reading task is due or waiting. Without it, reading tasks start fresh, which can mean one extra reminder. |
| `smart_plants/images/` | Plant photos as WebP files. |

A full Home Assistant backup contains all three. Restore all three from the same backup, and do
it while Home Assistant is stopped if you copy files by hand. The sensors you assigned aren't
part of this data. A missing sensor shows up in **Settings > System > Repairs** (see
[When a sensor disappears](sensors-and-health.md#when-a-sensor-disappears)).

## Remove Smart Plants

1. To keep your plants for a later reinstall, first turn on **Preserve inventory when the
   integration is removed** in the [options](#options).
2. Go to **Settings > Devices & services > Smart Plants**, select **⋮ > Delete**.
3. Remove Smart Plants in the Marketplace or HACS, or delete
   `<config>/custom_components/smart_plants` for a manual installation.
4. Restart Home Assistant.

Deleting the integration removes the plant devices and entities. By default it also deletes
the three data locations above and the inventory backup copy. With **Preserve inventory**
turned on, the data stays. Smart Plants never changes your automations, scripts or dashboards.
Automations that use plant entities stop working until the entities exist again.
