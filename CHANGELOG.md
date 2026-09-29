# Changelog

All notable changes to Smart Plants are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- After an update, an open panel that is still running the previous version shows
  *Smart Plants was updated* with a **Reload** button, instead of silently staying on the old
  version until the page is reloaded.

### Fixed

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

[Unreleased]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.5.0...HEAD
[0.5.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.4.0...0.5.0
[0.4.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.3.1...0.4.0
[0.3.1]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.3.0...0.3.1
[0.3.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.1.1...0.2.0
[0.1.1]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/mikekuss/home-assistant-smart-plants/releases/tag/0.1.0
