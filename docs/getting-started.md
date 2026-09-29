# Getting started

This guide walks you through the Smart Plants panel: creating your first plant, assigning
sensors, adjusting thresholds, logging care, and managing plants over time.

## The Smart Plants panel

After you [add the integration](installation.md#add-the-integration), **Smart Plants**
appears in the Home Assistant sidebar (sprout icon). The panel is available to
**administrator** accounts only; non-admin users don't see it.

![Smart Plants panel overview](images/overview.png)

The overview shows:

- four summary tiles: **All plants**, **Needs water**, **Problems** (too wet, or another
  reading outside its target such as too little light or a low sensor battery) and
  **Sensor issues** (no recent data, or no soil moisture sensor assigned). Select a tile to
  show only those plants; select it again to show all plants.
- a search field that matches plant name, area, species, category and tags, and a sort menu:
  **Needs attention first** (the default), **Name**, or **Group by area**.
- one card per plant with its photo, area and species, a status label with a short
  explanation (for example *Soil moisture 34% is below the minimum of 60%*), the soil
  moisture on a bar with its target range, the current value of every other assigned
  sensor, and when the plant was last watered.

Each plant has one status, most urgent first: *Needs water*, *Too wet*, a named problem
(such as *Too little light* or *Battery low*), *No recent data*, *No sensors*, *Healthy*.
Paused plants show *Paused*.

Select **Watered** on a card to log a watering right now. A message confirms it and offers
**Undo** for a few seconds.

Use **Add plant** at the bottom right (or **⋮ → Add plant** in the top bar) to start the
creation wizard. Select a plant's name to open its detail view. The **⋮** menu also links to
the integration options and this documentation.

## Create your first plant

The wizard saves nothing until you confirm on the last step. You can move back and forth
without losing your entries.

![Creation wizard, step 1: basic info](images/create-wizard.png)

1. **Basic info** – Enter a name (required). Optionally add an acquired date, a Home
   Assistant area, a placement (indoor, outdoor, balcony, greenhouse, covered outdoor, or
   dormant storage, with optional sun exposure, rain exposure, and container), and a photo.
2. **Species and care** – Choose how to describe the species:
   - **Enter details myself**: optionally type a common and scientific name. Works offline.
   - **Search OpenPlantBook**: only available when you have
     [set up OpenPlantBook](openplantbook.md). Type at least three characters, search, and
     pick a result.
3. **Review species** (OpenPlantBook only) – Check the imported information and tick
   **I reviewed and accept this species information**. Nothing is applied without this.
4. **Moisture sensors** – Add one or more soil moisture sensors, choose a **primary** sensor,
   an **aggregation**, and the **stale after** window. You can skip this and add sensors later.
5. **Moisture thresholds** – Review the effective minimum, target, and maximum. Open
   **Advanced threshold overrides** to change them.
6. **Category and tags** – Optional labels for filtering. They belong to Smart Plants and are
   separate from Home Assistant labels.
7. **Review and create** – Check the summary and select **Confirm and create plant**.

Smart Plants creates one Home Assistant device for the plant, with its moisture and health
entities. If you selected a photo, it is uploaded right after the plant is created.

![Plant detail view with the Overview tab, current soil moisture, moisture health, and assigned sensors](images/plant-detail.png)

> [!TIP]
> The default moisture aggregation is **primary**. With that setting, the plant only gets a
> moisture reading once you pick a primary sensor. If you don't want to pick one, switch the
> aggregation to average, min, or max.

## Assign sensors

Open the plant and go to the **Sensors** tab.

- **Moisture configuration** edits the soil moisture sources, primary sensor, aggregation,
  staleness window, and (under **Advanced threshold overrides**) the moisture thresholds.
  Select **Save complete moisture configuration** to apply everything at once.
- **Sensors** lists the other roles: air temperature, air humidity, illuminance, battery,
  conductivity, soil temperature, and CO₂. Select **Edit sources** on a role, add sensors,
  and save.

The sensor picker is filtered by device class and unit for each role. Tick
**Show all sensors** to pick anything else, or type an entity ID and press Enter to assign a
sensor that is currently unavailable. Each role accepts up to 32 sources.

A role's sensor and problem entities appear the first time you assign a source to it. See
[Sensors and health](sensors-and-health.md) for accepted units and how values are combined.

## Edit thresholds

- **Moisture** – In the **Sensors** tab under **Advanced threshold overrides**, or with the
  plant's *Moisture minimum*, *Moisture target*, and *Moisture maximum* number entities.
  Leave a field blank (or select **Inherit**) to use the default again.
- **Other roles** – In the **Diagnostics** tab, the **Advanced diagnostics** section lists
  each configured role with its status and effective thresholds. Select the edit button next
  to a role, change values, and **Save thresholds**. **Inherit all built-in defaults** resets
  that role.

The editors validate the order of values (for example, the "clear" value must sit between
the trigger value and the normal range) before saving. Built-in defaults are listed in
[Sensors and health](sensors-and-health.md#built-in-thresholds).

## Log care

Open the plant and go to the **Care history** tab. Choose a care type, set the date and time
(your local time, not in the future), fill in the optional details, and select
**Record care**.

| Care type | Details you can record |
| --- | --- |
| Watering | Note |
| Fertilizing | Product, amount with unit (g or mL), note |
| Pruning | Part pruned, note |
| Repotting | Container, medium, note |
| Note | Text (required, up to 1000 characters) |

Notes can be up to 500 characters and other details up to 120. You can edit or delete any
entry later. Each plant keeps up to 256 care entries.

Logging a **watering** pauses the plant's *Needs water* alert for 24 hours from the time you
entered, giving the soil sensor time to catch up. See
[Sensors and health](sensors-and-health.md#manual-watering-grace).

## Plant photos

Add or replace a photo in the **Plant details** tab (or during creation).

- Formats: JPEG, PNG, or WebP.
- Maximum file size: 5 MiB.
- Maximum dimensions: 2048 × 2048 pixels. Larger images are rejected, not resized, so scale
  them down first.

Smart Plants re-encodes every photo to WebP and strips metadata such as EXIF (including
location data) before storing it locally. Photos are only served to logged-in administrators.
Select **Remove photo** to delete it.

## Edit plant details

The **Plant details** tab lets you change the name, acquired date, placement, Home Assistant
area, category, tags, and species. Renaming a plant also renames its Home Assistant device;
the entity IDs stay the same. The area is the same one shown on the device page in Home
Assistant.

If another browser session saves changes to the same plant while you are editing, the panel
pauses saving and shows what changed, so you don't overwrite each other.

## Disable, re-enable, or delete a plant

In the **Plant details** tab under **Lifecycle**:

- **Disable** stops evaluation for the plant. Its entities stay registered but become
  unavailable, and its history is kept. Use this for plants in storage or temporarily without
  sensors.
- **Re-enable** resumes evaluation.
- **Delete plant** permanently removes the plant, its device and entities, its photo, and its
  care history. You are asked to confirm first. This cannot be undone.

Automations you wrote are never changed by Smart Plants. After deleting a plant, update any
automations that used its entities.

## Next steps

- [Sensors and health](sensors-and-health.md) – how values and problems are calculated.
- [Entities](entities.md) – what each plant exposes to Home Assistant.
- [Automations](automations.md) – notification and irrigation examples.
