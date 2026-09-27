# Changelog

All notable changes to Smart Plants are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

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

[Unreleased]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.1.1...HEAD
[0.1.1]: https://github.com/mikekuss/home-assistant-smart-plants/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/mikekuss/home-assistant-smart-plants/releases/tag/0.1.0
