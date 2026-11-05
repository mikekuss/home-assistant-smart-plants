# OpenPlantBook

[OpenPlantBook](https://open.plantbook.io/) is an optional species database. Smart Plants can
search it and import species details and moisture ranges. Every plant works without it.

Smart Plants calls the OpenPlantBook API itself. You don't need the separate OpenPlantBook
integration.

## Turn on species search

1. Create an account at [open.plantbook.io](https://open.plantbook.io/) and create client
   credentials on the [API key page](https://open.plantbook.io/apikey/).
2. Go to **Settings > Devices & services > Smart Plants > Configure**.
3. Tick **Enable direct OpenPlantBook provider**, enter the **OpenPlantBook client ID** and
   **OpenPlantBook client secret**, and select **Submit**.

Smart Plants checks the credentials before it saves. To turn search off again, untick the
provider. Species data you applied stays on your plants.

## Search a species

- In the wizard, open **Species and watering targets** on the review step and use **Search
  OpenPlantBook**.
- For an existing plant, open the **Settings** tab, select **Find species** or **Change
  species** and choose *OpenPlantBook*.

Type at least three characters. A result opens a read-only preview with the names, category,
care text, the moisture minimum and maximum if available, and the attribution per field. For
an existing plant it also shows what would change. A preview expires after 10 minutes.

## Apply species data

- **In the wizard,** tick **I reviewed and accept this species information**, then select
  **Create plant**.
- **For an existing plant,** select **Accept and apply reviewed species**.

Smart Plants stores the species with the plant. OpenPlantBook's moisture minimum and maximum
become the plant's defaults, and your own values stay. If the imported range doesn't fit your
current targets, Smart Plants doesn't apply it. Change the **Soil moisture targets** first.

**Preview species refresh** fetches the latest data for a plant and shows the changes. Saving
manual species details replaces the OpenPlantBook data.

## Data and privacy

- Species data lives in `.storage/smart_plants.inventory` with its source, attribution and
  fetch time. Your plants never depend on OpenPlantBook being reachable.
- Smart Plants keeps search results and species details in memory for up to an hour.
- Smart Plants doesn't download images from OpenPlantBook.
- The credentials live in the configuration entry. Diagnostics never include them.

Species data and care text belong to OpenPlantBook and its contributors. Smart Plants shows
the attribution "OpenPlantBook (https://open.plantbook.io/)" next to imported data. Smart
Plants isn't affiliated with OpenPlantBook.

## Troubleshooting

| Message | What to do |
| --- | --- |
| Enter both an OpenPlantBook client ID and client secret, or disable the provider. | Fill in both fields, or untick the provider. |
| OpenPlantBook rejected these credentials. | Check them on the API key page. |
| OpenPlantBook could not be reached. Try again later or disable the provider. | Check the connection and try again. |
| The OpenPlantBook client ID or client secret is too long. | Paste only the credential. |
| OpenPlantBook didn't accept your credentials. … | Update them in the reauthentication prompt under **Settings > Devices & services**. |
| OpenPlantBook is getting too many requests. … | Wait and try again. |
| OpenPlantBook took too long to answer. … or isn't reachable right now. … | Try again later, or continue without a species. |
| Species search needs OpenPlantBook. | Turn on the provider in the options. |

A preview that can't be applied after a while has expired. Search again.
