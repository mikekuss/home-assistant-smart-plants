# Smart Plants for Home Assistant

[![HACS Default](https://img.shields.io/badge/HACS-Default-41BDF5.svg)](https://hacs.xyz/)
[![GitHub release](https://img.shields.io/github/v/release/mikekuss/home-assistant-smart-plants)](https://github.com/mikekuss/home-assistant-smart-plants/releases)
[![CI](https://github.com/mikekuss/home-assistant-smart-plants/actions/workflows/ci.yml/badge.svg)](https://github.com/mikekuss/home-assistant-smart-plants/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.8%2B-blue)

Smart Plants turns each of your plants into a Home Assistant device. You add a plant in a
sidebar panel, link the sensors you already have, and get a status such as *Needs water* plus
entities you can use in normal automations. You don't need YAML or template sensors.

![Smart Plants panel overview with status tiles, search and plant cards](docs/images/overview.png)

> **Status:** early development. Expect rough edges and make sure your Home Assistant
> backups include Smart Plants data (see [Installation](docs/installation.md#backup-and-restore)).

## Features

The core is watching a plant through its sensors. Everything else is optional and stays out of
the way until you use it.

- **Plants as stable devices.** Each plant is a Home Assistant device with its own area,
  photo, and entities. Sensors are inputs you can replace, so a plant keeps its history when
  you swap hardware.
- **Sensor roles.** Assign existing sensors for soil moisture, temperature, humidity,
  illuminance, conductivity, soil temperature, CO2, and battery.
- **One clear status per plant.** For example *Needs water* or *Healthy*, with a short reason.
  Each plant also gets problem binary sensors such as *Needs water*, *Too wet*, *Low light* and
  *Sensor stale*, stress sensors per reading, and a health score. You can edit every threshold
  per plant.
- **A panel for everything.** The overview shows all plants with status filters, search and
  sorting by what needs attention. A three-step wizard adds plants, and each plant has a page
  for its readings, sensors, care and settings.
- **Care log.** Log watering, fertilizing, pruning, repotting and notes. The **Watered** button
  on each plant logs a watering with one tap.

Optional, when you want them:

- **Care reminders.** Repeating tasks (fertilize every 4 weeks), yearly tasks (prune in March)
  and tasks that follow a reading (winter protection below 5 °C). A reading can come from a
  sensor or from a weather forecast for the next 24 hours, 2 days or 3 days, so a frost warning
  arrives before the cold night. Each task has its own entity for automations.
- **Rest period.** Pause tasks such as fertilizing during the months a plant rests.
- **Snooze.** Mute a plant's alerts while you're on vacation. Automations check the `snoozed`
  attribute, and the snooze ends by itself.
- **Species data from [OpenPlantBook](https://open.plantbook.io/).** Search a species and review
  its suggested targets before you apply them. Smart Plants works fully without it.

Smart Plants never switches valves or pumps. It tells you what a plant needs, and your own
automations decide what to do. Entities work in any automation, dashboard or notification.
Repairs tell you when an assigned sensor disappears, and diagnostics help with bug reports.
The panel, setup, entity names and repairs are available in English and German.

## Requirements

- Home Assistant **2026.8.0** or newer.
- Optional: an OpenPlantBook account with API client credentials.

## Installation

[![Open your Home Assistant instance and open this repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=mikekuss&repository=home-assistant-smart-plants&category=integration)

1. In HACS, search for **Smart Plants** (or use the button above).
2. Download it and restart Home Assistant.
3. Add the integration:

   [![Open your Home Assistant instance and start setting up Smart Plants.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=smart_plants)

4. Open **Smart Plants** in the sidebar and add your first plant.

Manual installation, updating, and removal are covered in [docs/installation.md](docs/installation.md).

## Documentation

- [Installation, updates, backup and restore](docs/installation.md)
- [Getting started](docs/getting-started.md)
- [Sensors and plant health](docs/sensors-and-health.md)
- [Entities](docs/entities.md)
- [OpenPlantBook](docs/openplantbook.md)
- [Automation examples](docs/automations.md)
- [Notifications](docs/notifications.md)
- [Troubleshooting](docs/troubleshooting.md)
- [FAQ](docs/faq.md)

## Getting help

- Check [Troubleshooting](docs/troubleshooting.md) and the [FAQ](docs/faq.md).
- Report bugs in [GitHub issues](https://github.com/mikekuss/home-assistant-smart-plants/issues)
  and attach the integration's diagnostics download.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup.

## License

[MIT](LICENSE). The bundled panel includes [Lit](https://lit.dev/) (BSD-3-Clause); see
[THIRD_PARTY_LICENSES.txt](custom_components/smart_plants/frontend/THIRD_PARTY_LICENSES.txt).

Smart Plants is not affiliated with or endorsed by Home Assistant, Nabu Casa, or OpenPlantBook.
