# OpenPlantBook

[OpenPlantBook](https://open.plantbook.io/) is an optional species database. Smart Plants can
search it and import species details and moisture ranges into your plants. Smart Plants works
fully without it: every plant can be created and managed manually.

Smart Plants connects to the OpenPlantBook API directly. You do **not** need the separate
Home Assistant OpenPlantBook integration.

## Get API credentials

1. Create an account at [open.plantbook.io](https://open.plantbook.io/).
2. Open the [API key page](https://open.plantbook.io/apikey/) and create client
   credentials.
3. Note the **client ID** and **client secret**.

## Enable the provider

You can enter the credentials during setup or later:

1. Go to **Settings → Devices & services → Smart Plants → Configure**.
2. Tick **Enable direct OpenPlantBook provider**.
3. Enter the **OpenPlantBook client ID** and **OpenPlantBook client secret**.
4. Select **Submit**.

Smart Plants checks the credentials with OpenPlantBook before saving. Possible errors:

| Message | What to do |
| --- | --- |
| Enter both an OpenPlantBook client ID and client secret, or disable the provider. | Fill in both fields, or untick the provider. |
| OpenPlantBook rejected these credentials. | Check the ID and secret on the OpenPlantBook API key page. |
| OpenPlantBook could not be reached. | Try again later, or disable the provider for now. |
| The OpenPlantBook client ID or client secret is too long. | Check that you pasted only the credential. |

The secret is never shown again in the form. Leave it empty in the options to keep the stored
secret.

## Search and preview

With the provider enabled, you can search OpenPlantBook in two places:

- In the creation wizard, choose **Search OpenPlantBook** in the *Species and care* step.
- For an existing plant, in the **Settings** tab under **Species** (**Find species** or
  **Change species**), choose *OpenPlantBook* as the species provider and search.

Type at least three characters. The search uses your Home Assistant language. Selecting a
result opens a **read-only preview** that shows:

- common name, scientific name, and category,
- care text supplied by OpenPlantBook (watering, sunlight, soil, pruning, fertilization),
- imported moisture minimum and maximum, if OpenPlantBook has them,
- attribution for each field,
- for existing plants, the changes compared to the current species data.

Nothing is changed until you accept the preview. A preview expires after 10 minutes; if it
has expired, request a new one.

## Apply reviewed data

- **In the wizard:** tick **I reviewed and accept this species information**, then continue.
- **For an existing plant:** review the changes and select
  **Accept and apply reviewed species**.

What applying does:

- The species snapshot (names, category, care text, attribution, and when it was fetched) is
  stored with the plant.
- OpenPlantBook's moisture minimum and maximum become the plant's **default** moisture
  minimum and maximum. The target keeps its built-in default.
- Your own **overrides are always preserved.** Each threshold either inherits its default or
  uses your override, field by field. Applying species data only changes defaults.
- If the imported values can't be combined with your current settings (for example, the
  imported minimum is above the current target), the apply is refused. In the wizard you'll
  be asked to fix the thresholds; for an existing plant, set a matching override first and
  apply again.

For a plant that already has OpenPlantBook data, **Preview species refresh** fetches the
latest data and shows what would change. You can also switch back to manual species details
at any time; saving manual details replaces the species data.

## What is stored locally

Species data is stored in the plant inventory in your Home Assistant configuration directory
(`.storage/smart_plants.inventory`) together with the source reference, attribution, locale,
and fetch time. Your plants never depend on OpenPlantBook being reachable: if it's down, or
you disable the provider, existing species data and thresholds stay as they are.

Smart Plants does **not** download or display images from OpenPlantBook. Plant photos only
come from your own uploads.

Search results and species details are cached in memory for up to an hour to reduce requests.
Your credentials are stored in the Smart Plants configuration entry and are not included in
diagnostics downloads.

## Reauthentication

If OpenPlantBook rejects the stored credentials during a search or preview (for example after
you rotated them), Home Assistant shows a **reauthentication** prompt for Smart Plants in
**Settings → Devices & services**. Enter the new client ID and secret there. Your plants stay
available while authentication is broken; only species search is affected.

## Disable the provider

Go to **Settings → Devices & services → Smart Plants → Configure** and untick
**Enable direct OpenPlantBook provider**. Species data you already applied stays on your
plants. The wizard will then only offer manual species details.

## Attribution and licensing

Species data and care text come from OpenPlantBook and belong to OpenPlantBook and its
contributors. Smart Plants shows the attribution "OpenPlantBook (https://open.plantbook.io/)"
next to imported data and keeps it with each stored snapshot. Please respect OpenPlantBook's
terms of use for your account.

Smart Plants is an independent project and is not affiliated with or endorsed by
OpenPlantBook.
