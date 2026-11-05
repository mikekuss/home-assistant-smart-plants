# FAQ

## How is this different from the built-in `plant` integration?

The built-in `plant` integration is set up in YAML and creates one entity that compares a fixed
set of sensors with limits. Smart Plants is set up in a panel. Each plant is a device with
separate sensor, problem and threshold entities, several sensors per reading, a health score,
care log, photos and optional species data. Both can run side by side.

## Do I need OpenPlantBook?

No. It only adds species search. The built-in thresholds work without species data, and you can
type species names yourself. You also don't need the separate OpenPlantBook integration.

## Does Smart Plants water my plants?

No. It detects what a plant needs and never switches devices. For automatic watering, see
[Water automatically, safely](automations.md#water-automatically-safely).

## Where is my data stored?

Locally in your configuration directory, see
[Backup and restore](installation.md#backup-and-restore). Nothing goes to a cloud service,
except OpenPlantBook searches when you turn that on.

## What's the difference between snooze and pause?

A snooze mutes alerts for a while and ends by itself. The entities keep their real states.
Pausing stops monitoring until you resume the plant, and its entities become unavailable.
Pausing ends a snooze.

## Can one sensor serve several plants?

Yes. Assign it to each plant, for example one room humidity sensor for all plants in the room.

## What happens when I replace a sensor?

The plant keeps its device, entities and history. Swap the sensor on the **Sensors** tab. If a
sensor is deleted from Home Assistant, a repair helps you pick a replacement.

## Why doesn't the battery affect the health score?

A low battery is about the sensor, not the plant. It has its own *Low battery* entity.

## Which languages are supported?

English and German. The panel follows your profile language and uses English for others. To
add a language, see [Translations](development/translations.md).
