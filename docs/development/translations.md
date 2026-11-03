# Translations

Smart Plants has two sets of translations. Home Assistant loads the backend files for setup,
options, entity names, repair issues, actions, triggers and conditions. The sidebar panel and the
dashboard card ship their own catalogs, because Home Assistant does not load translation
categories for custom panels. English is the source language in both. Today English and German
are complete.

## Backend

| File | Contents |
| --- | --- |
| `custom_components/smart_plants/strings.json` | The English source strings. |
| `custom_components/smart_plants/translations/en.json` | The same content as `strings.json`. |
| `custom_components/smart_plants/translations/<language>.json` | One file per language, for example `de.json`. |

The file name is the Home Assistant language code, such as `fr`, `pl` or `pt-BR`. A language
file may leave keys out. Home Assistant then shows the English text for those keys.

Placeholders such as `{name}` or `{count}` must stay exactly as they are in English. You may
move them within the sentence, but don't rename, add or drop one.

Don't use `[%key:...]` references. Home Assistant resolves them only when it builds its own
core translations, so in a custom integration the marker would show up as literal text.

## Panel and card

The catalogs live in `frontend/src/translations/`. `en.ts` is the source. Its keys define the
`MessageKey` type, so a key that English lacks is a type error and a test failure. The panel
picks a catalog from the language in the user's Home Assistant profile, then from the Home
Assistant language, and uses English for any other language. A key missing from a catalog shows
its English text.

### Plural forms

Keys that depend on a number come in pairs that end in `_one` and `_other`, for example
`sensors.source_count_one` and `sensors.source_count_other`. The code always passes both English
keys. At runtime the panel asks `Intl.PluralRules` for the active language's plural category
(`zero`, `one`, `two`, `few`, `many` or `other`) and uses the key with that ending.

A catalog may therefore add `_zero`, `_two`, `_few` and `_many` variants next to any English
`_other` key. Polish, for example, uses `_few` for numbers such as 3 and 22 and `_many` for 5 and 12:

```ts
"sensors.source_count_one": "{count} czujnik",
"sensors.source_count_few": "{count} czujniki",
"sensors.source_count_many": "{count} czujników",
"sensors.source_count_other": "{count} czujnika",
```

If the catalog lacks the form for the selected category, the panel uses the catalog's `_other`
text. If the catalog has neither, it uses the English form for the number. A variant uses the
same placeholders as the English `_other` key. Look up your language's categories in the
[CLDR plural rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html).

## Adding a language

1. Copy `custom_components/smart_plants/translations/en.json` to `<language>.json` and
   translate the values. Keep the keys and placeholders.
2. Create `frontend/src/translations/<language>.ts`. It exports a constant named after the
   file, typed as `LanguageCatalog` so that keys may be missing:

   ```ts
   import type { LanguageCatalog } from "../localize.js";

   export const fr: LanguageCatalog = {
     "common.cancel": "Annuler",
   };
   ```

3. Register the catalog in `frontend/src/localize.ts`. Import it, add the code to `LANGUAGES`
   and add the catalog to `CATALOGS`.
4. Run `npm run build` in `frontend/` and commit the rebuilt bundles in
   `custom_components/smart_plants/frontend/` together with the source.
5. Run the tests below.

Text from a machine translation needs a review by a native speaker before it is merged. Say in
the pull request which parts were machine-translated.

## Tests

| Test | Checks |
| --- | --- |
| `tests/test_translations.py` | `en.json` equals `strings.json`. Every language file has no keys English lacks, the same placeholders per key as English, no empty strings and no `[%key:...]` markers. German must have every English key. |
| `frontend/src/localize.test.ts` | Every catalog in `frontend/src/translations/` is exported under its file name and listed in `LANGUAGES`, has no keys English lacks apart from plural variants, uses the English placeholders and has no empty strings. German must have every English key. It also covers plural selection. |

Run them with the commands in [CONTRIBUTING.md](../../CONTRIBUTING.md): `pytest -q` for the
backend (through `bash scripts/docker-test.sh` on Windows and macOS) and `npm test` in
`frontend/`.
