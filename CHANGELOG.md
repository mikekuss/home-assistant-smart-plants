# Changelog

All notable changes to Smart Plants are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.8.0] - 2026-10-22

### Added

- The panel shows a species' German common name from OpenPlantBook when it is shown in German,
  and the overview search also finds plants by their English and German common names. See
  [OpenPlantBook](docs/openplantbook.md).
- Care suggestions from OpenPlantBook: when adding a care task, the species' fertilizing and
  pruning notes appear as suggestions that create the task with the note as its instructions,
  and fertilizing, pruning and repotting tasks offer **Use as instructions** for the matching
  note. See [Getting started](docs/getting-started.md#care-plan).

### Changed

- Smart Plants is now in the HACS default store. The installation guide and README describe
  searching for it in HACS; adding it as a custom repository remains a fallback.
- Care task instructions can now hold up to 4,000 characters, enough for a full OpenPlantBook
  care note.

### Fixed

- An open plant page now picks up care changes made elsewhere, such as a task marked done by
  the `smart_plants.log_care` or `smart_plants.skip_care_task` action or from another browser,
  within a second instead of showing the task as due until the page is reloaded.

## [0.7.1] - 2026-10-21

### Fixed

- **Watered** no longer fails when the phone's or browser's clock runs slightly ahead of
  Home Assistant's. A care time up to five minutes ahead is saved as the current time, also
  for the `smart_plants.log_care` action; later times are still refused.
- Error messages for rejected input no longer mention photo limits unless a photo was
  uploaded. The photo rules now appear only for photo errors.

## [0.7.0] - 2026-10-20

### Added

- Care plan on the plant's **Care** tab: reminders for fertilizing, pruning, repotting, pest
  checks and your own tasks, repeating or once a year, with **Done**, **Skip this time** and
  **Undo**, and an **Automate…** sheet with the task's entities. See
  [Getting started](docs/getting-started.md#care-plan).
- Optional rest period per plant, set from the Care plan card: a row with the rest months and
  the current season, and repeating tasks that wait during rest. Due care tasks appear as
  chips in the plant header, as a line on overview cards, and in a new **Care due** tile that
  filters the overview. See [Getting started](docs/getting-started.md#rest-period).
- Two actions for automations and scripts: `smart_plants.log_care` logs care for one or more
  plants or marks care tasks as done, and `smart_plants.skip_care_task` skips a care task's
  current occurrence. Use them, for example, to log a watering when you scan an NFC tag or
  after your irrigation valve ran. See [Automations](docs/automations.md#log-care-with-actions).
- Care task entities: a *due* binary sensor for every care task, a *next due* timestamp
  sensor for every care task (disabled by default), and a *Care due* binary sensor per plant
  that is on while any of its tasks is due. They update just after midnight, when a task, the
  care history, or the rest period changes, and when the time zone changes. See
  [Entities](docs/entities.md#care-tasks).

### Changed

- Care entries that mark a care task as done keep their care type when edited, and entries of
  pest checks and custom tasks show the task's name. Their note and time can now be edited.
- A change made elsewhere that only affects care, such as a task marked as done by an
  automation, no longer pauses saving on the plant page.
- Every logged watering now keeps *Needs water* off for 24 hours, including waterings logged
  with the `smart_plants.log_care` action, exactly like the panel's **Watered** button.
- Plainer wording in the panel, in English and German: error messages, the notice shown when
  a plant was changed somewhere else, the threshold editor introductions and errors, the
  "no update for a while" reasons, and the **Show all sensors** option.
- A plant with sensors but no soil moisture sensor now shows *No moisture sensor*. *No
  sensors* is shown only when nothing is assigned.
- The **Main sensor** menu shows each sensor's name, followed by its entity ID.
- **Assigned sensors** shows when each sensor last reported, the same time used to decide
  whether it is not updating.
- The delete confirmation now says that the plant's care history is deleted too.
- Care history no longer stops at 256 entries. When it is full, the oldest watering entries
  are removed to make room (never the latest watering), then the oldest notes.
- Integration diagnostics also count care tasks per type and plants with a rest period. Task
  names and instructions are never included.
- Storage moves to a new format that can hold care tasks and a rest period for each plant.
  Existing data, including every care entry, is migrated automatically on the first start;
  earlier versions cannot read the migrated data.

### Fixed

- A plant whose acquired date was stored as a plain date (for example `2024-03-01`, possible
  through the websocket API or older data) no longer leaves the panel blank. The integration
  now stores such dates as midnight UTC, and the panel skips a single malformed plant record
  with a console warning instead of rejecting the whole plant list.

## [0.6.1] - 2026-10-06

### Changed

- The integration manifest no longer lists Pillow as a requirement. Home Assistant ships it
  already, and current Home Assistant validation rejects custom integrations that repeat core
  dependencies.

## [0.6.0] - 2026-09-30

### Added

- The plant page has a **History** card on the Overview tab: a chart of one reading over the
  last 24 hours, 7 days, 30 days or year, with the target range, logged waterings and, for
  soil moisture, how fast the value is dropping and roughly when it reaches the minimum.
  The data comes from Home Assistant's long-term statistics of the plant's own sensors, and
  **Open in Home Assistant** opens the sensor's native history dialog.

## [0.5.1] - 2026-09-29

### Added

- After an update, an open panel that is still running the previous version shows
  *Smart Plants was updated* with a **Reload** button, instead of silently staying on the old
  version until the page is reloaded.

### Changed

- Large photos, such as photos taken with a phone, are scaled down in the browser to
  2048 × 2048 pixels before upload instead of being rejected. Files up to 40 MiB are accepted.
- The OpenPlantBook species preview is shorter: it shows the species, the imported moisture
  targets and collapsible care notes. Provider details and the change list are under
  **Source details**.

### Fixed

- In the add-plant wizard, an area chosen in the area picker is no longer reported as
  missing (and shown by its ID) while the panel's area list could not be loaded.
- The species search field and the other fields in the wizard's collapsible sections no
  longer touch the section header.
- The panel no longer refuses every sensor and area when a single Home Assistant registry
  entry has an unexpected shape (for example a numeric unique ID left by an older
  integration). Such entries are skipped, and the remaining sensors and areas load normally.
- Clearer wording for the banner shown when sensors and areas cannot be loaded.

## [0.5.0] - 2026-09-29

### Changed

- New plant overview in the panel. Summary tiles (All plants, Needs water, Problems, Sensor
  issues) now filter the list, and a search field and a sort menu (needs attention first,
  name, group by area) replace the *Filter plants* form. Each card shows the plant's photo,
  one status with a colour, icon and short explanation, soil moisture against its target
  range, the values of all other assigned sensors, and when it was last watered.
- The overview loads the status of all plants with a single request instead of several
  requests per plant, and uses the same status as the plant's entities.
- New plant page. A header shows the photo, area, species, the status with every current
  reason and up to four key readings, with **Watered** and **Log care** buttons. The page has
  four tabs: Overview, Sensors, Care and Settings. Sensors are listed by their Home Assistant
  name instead of their entity ID, and the labels use plain words (for example *Needs water
  below*, *Ideal* and *Too wet above* for the soil moisture targets, *Several sensors for one
  reading*, and *Pause monitoring*).
- The former Diagnostics tab is now the collapsed **Troubleshooting** section of the Sensors
  tab. Thresholds of the other checks are edited in Settings under **Other targets**, and plant
  details, photo, species and deleting the plant moved to Settings.
- Shorter add-plant wizard with three steps: *Plant* (name, area and an optional photo that
  you can drop in), *Sensors* and *Review*. Species, watering targets, date acquired,
  placement, category and tags moved into optional sections of the review step. The moisture
  targets are labelled *Needs water below*, *Ideal* and *Too wet above*. After creating, a
  confirmation offers *Open plant*, *Back to plants* and *Add another plant*.
- The wizard uses Home Assistant's own area and sensor pickers, lists sensors by name with
  their current value, and suggests sensors from the chosen area. Every picked sensor, not
  only soil moisture, is saved together with the plant and becomes the main sensor for its
  reading, so values show up right away.

### Added

- **Watered** button on each plant card to log a watering in one tap, with **Undo**.
- On the plant page: a warning when the soil moisture sensor stops reporting, care filters by
  type, a menu per sensor to change, remove or make it the main sensor, links to the device
  and to a new automation for it, and **Download diagnostics** for bug reports (no plant name,
  notes, photo or credentials).

### Fixed

- The note in the care form said care records never change moisture alerts. It now says
  that logging a watering keeps *Needs water* off for 24 hours, which is what happens.

## [0.4.0] - 2026-09-28

### Changed

- The plant device's model is now the plant's species name (common name, or Latin name as a
  fallback), or *Plant* when no species is set, instead of *Manual Plant*. Existing devices
  pick up the new model the next time Home Assistant starts.
- The moisture minimum, target, and maximum number entities are now created disabled by
  default. Thresholds stay editable in the panel; enable the entities if you use them in
  automations or dashboards. Existing number entities keep their current enabled state.

## [0.3.1] - 2026-09-28

### Fixed

- A sensor that kept reporting the same value (for example a steady moisture reading, or 0 lx
  at night) was marked as stale after the stale-after window, because only value changes were
  counted. Staleness now follows the last time a sensor reported, even if the value was
  unchanged. A sensor that goes silent still becomes stale.

## [0.3.0] - 2026-09-27

### Added

- The sidebar panel is now available in German. It follows the language in your Home Assistant
  user profile and falls back to English for other languages. Numbers and dates in the panel
  use your profile's number and time format.

### Changed

- Advanced diagnostics shows each problem indicator's reason as readable text (for example
  "too hot") instead of its internal code (`hot_stress`).

### Fixed

- Creating a plant in an area whose ID differs from its name (for example "Living Room" or
  "Küche") created a duplicate area named after the ID and put the plant there. The plant is now
  assigned to the selected area. Duplicate areas created by earlier versions are not removed
  automatically; delete them under Settings > Areas.
- In the Advanced diagnostics section, each problem indicator's status no longer carries an
  `aria-label`, which ARIA does not allow on definition-list values and which screen readers
  announced inconsistently. Screen readers now read the indicator name followed by its visible
  status text.

## [0.2.0] - 2026-09-27

### Changed

- Smart Plants now requires Home Assistant 2026.8.0 or newer.

### Fixed

- Home Assistant 2026.9 and newer logged a deprecation warning about Smart Plants' device
  lookups, which would stop working in Home Assistant 2027.8. Plant devices are now looked up
  with the per-config-entry API.
- The diagnostics download counted only soil moisture sources as assigned sources. It now counts
  sources for every sensor role and adds a per-role breakdown.

## [0.1.1] - 2026-09-27

### Fixed

- Smart Plants failed to load on Home Assistant 2026.8 and newer because it required an exact
  Pillow version that conflicts with the one Home Assistant ships.

## [0.1.0] - 2026-09-27

First public release.

### Added

- Plants as long-lived Home Assistant devices with their own area, photo, and entities; sensors
  are replaceable inputs, so a plant keeps its history when hardware is swapped.
- Sidebar panel for creating, filtering, editing, disabling, and deleting plants.
- Sensor roles for soil moisture, temperature, humidity, illuminance, conductivity, soil
  temperature, CO2, and battery. The Sensors tab explains when a role's data cannot be edited.
- Composite health score and problem binary sensors (for example *Needs water*, *Too wet*,
  *Low light*, *Sensor stale*, and per-role stress) with editable thresholds.
- Care history for watering, fertilizing, pruning, repotting, and notes.
- Optional OpenPlantBook species search with a review step before suggested values are applied.
- Repairs issues when an assigned sensor disappears, and a diagnostics download for bug reports.
- English and German translations for the integration's entities, setup, and repairs. The
  sidebar panel is English-only.

[Unreleased]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.8.0...HEAD
[0.8.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.7.1...0.8.0
[0.7.1]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.7.0...0.7.1
[0.7.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.6.1...0.7.0
[0.6.1]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.6.0...0.6.1
[0.6.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.5.1...0.6.0
[0.5.1]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.5.0...0.5.1
[0.5.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.4.0...0.5.0
[0.4.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.3.1...0.4.0
[0.3.1]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.3.0...0.3.1
[0.3.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.1.1...0.2.0
[0.1.1]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/mikekuss/home-assistant-smart-plants/releases/tag/0.1.0
