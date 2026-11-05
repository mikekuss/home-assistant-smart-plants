# Translations

Smart Plants has two sets of translations. Home Assistant loads the backend files for setup,
options, entity names, repairs, actions, triggers and conditions. The panel and the dashboard
card have their own catalogs, because Home Assistant doesn't load translations for custom
panels. English is the source in both. English and German are complete.

## Backend

| File | Contents |
| --- | --- |
| `custom_components/smart_plants/strings.json` | The English source. |
| `custom_components/smart_plants/translations/en.json` | The same content as `strings.json`. |
| `custom_components/smart_plants/translations/<language>.json` | One file per language, for example `de.json`. |

The file name is the Home Assistant language code, such as `fr` or `pt-BR`. A missing key shows
the English text.

- Keep placeholders such as `{name}` exactly as in English. You may move them in the sentence.
- Don't use `[%key:...]` references. In a custom integration they show up as literal text.

## Panel and card

The catalogs are in `frontend/src/translations/`, with `en.ts` as the source. Its keys define
the `MessageKey` type. The panel picks the catalog of the user's profile language, then the
Home Assistant language, then English. A missing key shows the English text.

### Plural forms

Keys that depend on a number end in `_one` and `_other`, for example
`sensors.source_count_one`. At runtime the panel asks `Intl.PluralRules` for the language's
category and uses the key with that ending. A catalog may add `_zero`, `_two`, `_few` and
`_many` next to any English `_other` key. Polish, for example:

```ts
"sensors.source_count_one": "{count} czujnik",
"sensors.source_count_few": "{count} czujniki",
"sensors.source_count_many": "{count} czujników",
"sensors.source_count_other": "{count} czujnika",
```

Without the form for the category, the panel uses the catalog's `_other`, then English. Look
up the categories in the
[CLDR plural rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html).

## Add a language

1. Copy `custom_components/smart_plants/translations/en.json` to `<language>.json` and
   translate the values.
2. Create `frontend/src/translations/<language>.ts` with a constant named after the file:

   ```ts
   import type { LanguageCatalog } from "../localize.js";

   export const fr: LanguageCatalog = {
     "common.cancel": "Annuler",
   };
   ```

3. Register it in `frontend/src/localize.ts`: import it, add the code to `LANGUAGES` and the
   catalog to `CATALOGS`.
4. Add the card picker texts to `PICKER_TEXT` in `frontend/src/card/picker.ts`. They copy
   `plant_card.name`, `plant_card.description` and `plant_card.load_error`, because the card
   loader doesn't load the catalogs.
5. Run `npm run build` in `frontend/` and commit the rebuilt bundles with the source.
6. Run the tests.

A native speaker reviews machine-translated text before it's merged. Say in the pull request
which parts were machine-translated.

## Tests

| Test | Checks |
| --- | --- |
| `tests/test_translations.py` | `en.json` equals `strings.json`. Language files have no extra keys, the English placeholders, no empty strings and no `[%key:...]`. German has every key. |
| `frontend/src/localize.test.ts` | Every catalog is exported under its file name and listed in `LANGUAGES`, has no extra keys apart from plural variants, the English placeholders and no empty strings. German has every key. Plural selection. |
| `frontend/src/card/plant-card.test.ts` | `PICKER_TEXT` matches the catalogs. |

Run them with `pytest -q` (through `bash scripts/docker-test.sh` on Windows and macOS) and
`npm test` in `frontend/`.
