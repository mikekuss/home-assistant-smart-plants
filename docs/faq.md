# FAQ

## How is this different from the built-in `plant` integration?

Home Assistant's built-in `plant` integration is set up in YAML and creates one plant entity
that compares a fixed set of sensors against minimum and maximum values.

Smart Plants takes a different approach:

- plants are created and edited in a sidebar panel, without YAML,
- each plant is a Home Assistant device with separate sensor, problem, and threshold
  entities,
- each role can use several sensors, combined the way you choose,
- a combined health score, care history, photos, and optional OpenPlantBook species data.

Pick whichever fits your setup. Both can be installed at the same time; they don't share
configuration.

## How does it relate to other community plant integrations?

Smart Plants is an independent integration with its own domain (`smart_plants`) and its own
data. It can run next to other plant integrations. There is no importer for data from other
plant integrations, so plants are created fresh in the Smart Plants panel.

## Do I need OpenPlantBook?

No. OpenPlantBook is optional and only used for species search. You can enter species names
yourself or skip species completely. Built-in moisture and stress thresholds work without any
species data. See [OpenPlantBook](openplantbook.md).

## Do I need the separate OpenPlantBook integration?

No. Smart Plants talks to the OpenPlantBook API directly with your own client credentials.

## Does Smart Plants water my plants?

No. Smart Plants only detects conditions such as *Needs water* or *Too wet*. It never
switches pumps, valves, or other devices. If you want automatic watering, build it in your own
automation with safeguards; see the [safe irrigation pattern](automations.md#safe-irrigation-pattern).

## Where is my data stored?

Locally, in your Home Assistant configuration directory:

- `.storage/smart_plants.inventory` – plants, species data, thresholds, sensor assignments,
  and care history,
- `smart_plants/images/` – plant photos.

Nothing is sent to a cloud service, except OpenPlantBook searches if you enable that
provider. See [backup and restore](installation.md#backup-and-restore).

## How far back does the history chart go?

The chart on the plant page reads Home Assistant's own statistics for the plant's sensor
entities, so it needs the Recorder integration (part of the default configuration). The
**24 h** range uses five-minute statistics, which Home Assistant keeps as long as the recorder
keeps states (10 days by default). The **7 days** and **30 days** ranges use hourly and
**1 year** uses daily statistics, which Home Assistant keeps without a time limit.

A new plant starts with an empty chart: the first values appear within a few minutes on the
**24 h** range and after the first full hour on the longer ranges. If you exclude a plant's
sensor entity from the recorder, its chart stays empty.

## Can I use several sensors for one plant?

Yes. Each role (soil moisture, temperature, humidity, and so on) accepts up to 32 sensors.
You choose whether the plant uses one main sensor or the average, lowest, or highest value of
all valid sensors. See [Sensors and health](sensors-and-health.md#multiple-sensors-per-role).

## Can one sensor be used by several plants?

Yes. Assign the same sensor to each plant that shares it, for example one room humidity
sensor for all plants in that room.

## What happens when I replace a sensor?

The plant stays the same device with the same entities and history. Remove the old sensor
from the role and add the new one in the plant's **Sensors** tab. If a sensor is deleted
from Home Assistant, a Repairs issue helps you pick a replacement.

## Why is an entity "unavailable" instead of "off"?

Smart Plants only reports "no problem" when it has a valid, fresh reading. Without one, the
entity is unavailable so that a broken sensor never looks like a healthy plant.

## Why doesn't the battery affect the health score?

A low battery says something about the sensor, not the plant. It has its own *Low battery*
entity instead.

## Who can use the panel?

Only Home Assistant administrators. The plant entities themselves are regular entities and
can be shown on any dashboard.

## Which languages are supported?

Setup, options, entity names, repair messages, and the sidebar panel are available in English
and German.

The panel follows the language set in your Home Assistant user profile. Any other language
shows the panel in English. Numbers and dates in the panel use your profile's number and time
format settings, for example `10,5 °C` in German. Care-history times are shown as recorded,
with the UTC offset they were entered with.

## Can I edit plants from YAML or with actions?

Plants are managed in the panel. The only plant settings exposed as entities are the moisture
minimum, target, and maximum `number` entities, which you can also change with the
`number.set_value` action.
