# Changelog

All notable changes to Smart Plants are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.3.1...HEAD
[0.3.1]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.3.0...0.3.1
[0.3.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.1.1...0.2.0
[0.1.1]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/mikekuss/home-assistant-smart-plants/releases/tag/0.1.0
