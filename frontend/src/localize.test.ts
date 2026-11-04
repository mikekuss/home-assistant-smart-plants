import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ENGLISH, LANGUAGES, createLocalizer, isMessageKey, panelLanguage } from "./localize.js";
import type { Catalog, LanguageCatalog } from "./localize.js";
import { de } from "./translations/de.js";
import { en } from "./translations/en.js";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe("panel language selection", () => {
  it.each([
    [{ language: "de" }, "de"],
    [{ language: "de-CH" }, "de"],
    [{ language: "de_AT" }, "de"],
    [{ language: "DE" }, "de"],
    [{ language: "en-GB" }, "en"],
    [{ language: "fr" }, "en"],
    [{ language: "" }, "en"],
    [{}, "en"],
    [undefined, "en"],
    [null, "en"],
  ] as const)("maps %j to %s", (source, expected) => {
    expect(panelLanguage(source)).toBe(expected);
  });

  it("prefers the profile locale language over hass.language", () => {
    expect(panelLanguage({ language: "en", locale: { language: "de" } })).toBe("de");
    expect(panelLanguage({ language: "de", locale: { language: "fr" } })).toBe("en");
    expect(panelLanguage({ language: "de", locale: {} })).toBe("de");
  });
});

describe("panel translation", () => {
  it("translates with the selected catalog and interpolates arguments", () => {
    const l = createLocalizer({ language: "de" });
    expect(l.language).toBe("de");
    expect(l.t("section.overall_health")).toBe("Gesamtzustand");
    expect(l.t("dialog.delete_title", { name: "Aloe" })).toBe("Aloe löschen?");
    expect(createLocalizer({ language: "en" }).t("dialog.delete_title", { name: "Aloe" })).toBe("Delete Aloe?");
  });

  it("falls back to English for unsupported languages", () => {
    const l = createLocalizer({ language: "fr" });
    expect(l.language).toBe("en");
    expect(l.t("section.overall_health")).toBe("Overall health");
  });

  it("falls back to English for keys missing from a catalog", () => {
    const partial: Record<"en" | "de", Partial<Catalog>> = { en, de: { "section.overall_health": "Gesamtzustand" } };
    const l = createLocalizer({ language: "de" }, partial);
    expect(l.t("section.overall_health")).toBe("Gesamtzustand");
    expect(l.t("section.advanced_diagnostics")).toBe("Problem checks");
  });

  it("leaves unknown placeholders intact and formats numeric arguments", () => {
    expect(ENGLISH.t("dialog.delete_title", {})).toBe("Delete {name}?");
    expect(createLocalizer({ language: "de" }).t("section.overall_health_available_summary", { score: 12345 })).toBe("12.345 von 100");
  });

  it("selects singular and plural forms", () => {
    expect(ENGLISH.tn(1, "sensors.source_count_one", "sensors.source_count_other")).toBe("1 sensor");
    expect(ENGLISH.tn(0, "sensors.source_count_one", "sensors.source_count_other")).toBe("0 sensors");
    const l = createLocalizer({ language: "de" });
    expect(l.tn(1, "care.watering_count_one", "care.watering_count_other")).toBe("1 Gießvorgang.");
    expect(l.tn(3, "care.watering_count_one", "care.watering_count_other")).toBe("3 Gießvorgänge.");
  });

  it("selects CLDR plural forms for languages with more than two", () => {
    // Test-only Polish catalog: Polish uses one, few, many and other.
    const pl: LanguageCatalog = {
      "sensors.source_count_one": "{count} czujnik",
      "sensors.source_count_few": "{count} czujniki",
      "sensors.source_count_many": "{count} czujników",
      "sensors.source_count_other": "{count} czujnika",
      "care.watering_count_one": "{count} podlewanie.",
      "care.watering_count_other": "{count} podlewania.",
      "care_plan.in_days_other": "za {count} dni",
    };
    const l = createLocalizer({ language: "pl-PL" }, { en, de, pl });
    expect(l.language).toBe("pl");
    const sensors = (count: number) => l.tn(count, "sensors.source_count_one", "sensors.source_count_other");
    expect(sensors(1)).toBe("1 czujnik");
    expect(sensors(3)).toBe("3 czujniki");
    expect(sensors(22)).toBe("22 czujniki");
    expect(sensors(5)).toBe("5 czujników");
    expect(sensors(12)).toBe("12 czujników");
    expect(sensors(1.5)).toBe("1,5 czujnika");
    // A form the catalog lacks falls back to its `_other` text.
    expect(l.tn(5, "care.watering_count_one", "care.watering_count_other")).toBe("5 podlewania.");
    expect(l.tn(1, "care.watering_count_one", "care.watering_count_other")).toBe("1 podlewanie.");
    expect(l.tn(1, "care_plan.in_days_one", "care_plan.in_days_other")).toBe("za 1 dni");
    // Keys missing from the catalog use the English form for the count.
    expect(l.tn(1, "care_plan.overdue_one", "care_plan.overdue_other")).toBe(ENGLISH.tn(1, "care_plan.overdue_one", "care_plan.overdue_other"));
    expect(l.tn(3, "care_plan.overdue_one", "care_plan.overdue_other")).toBe(ENGLISH.tn(3, "care_plan.overdue_one", "care_plan.overdue_other"));
  });

  it("uses zero and two forms when the language has them", () => {
    // Test-only Arabic catalog: Arabic uses all six categories.
    const ar: LanguageCatalog = {
      "sensors.source_count_zero": "zero {count}",
      "sensors.source_count_one": "one {count}",
      "sensors.source_count_two": "two {count}",
      "sensors.source_count_few": "few {count}",
      "sensors.source_count_many": "many {count}",
      "sensors.source_count_other": "other {count}",
    };
    const l = createLocalizer({ language: "ar", locale: { language: "ar", number_format: "comma_decimal" } }, { en, ar });
    const forms = [0, 1, 2, 3, 11, 100].map(count => l.tn(count, "sensors.source_count_one", "sensors.source_count_other"));
    expect(forms).toEqual(["zero 0", "one 1", "two 2", "few 3", "many 11", "other 100"]);
  });

  it("keeps two-form selection for keys outside the _one/_other pattern", () => {
    const pl: LanguageCatalog = { "section.advanced_diagnostics_one_active": "jeden", "section.advanced_diagnostics_many_active": "{count} aktywne" };
    const l = createLocalizer({ language: "pl" }, { en, pl });
    expect(l.tn(1, "section.advanced_diagnostics_one_active", "section.advanced_diagnostics_many_active")).toBe("jeden");
    expect(l.tn(3, "section.advanced_diagnostics_one_active", "section.advanced_diagnostics_many_active")).toBe("3 aktywne");
  });

  it("recognizes catalog keys at runtime", () => {
    expect(isMessageKey("section.overall_health")).toBe(true);
    expect(isMessageKey("section.health_contributor.future_role")).toBe(false);
    expect(isMessageKey("toString")).toBe(false);
  });

  it("German catalog has exactly the English keys and placeholders", () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(de[key]), key).toEqual(placeholders(en[key]));
      expect(de[key].trim(), key).not.toBe("");
    }
  });

  it("German catalog uses real umlauts rather than transliterations", () => {
    const text = Object.values(de).join("\n");
    expect(text).toMatch(/[äöüÄÖÜß]/);
    expect(text).not.toMatch(/verfuegbar|aenderung|loeschen|\bfuer\b|pruef|groesse|menue|uebersicht/i);
  });
});

describe("catalog parity", () => {
  const files = readdirSync(join(__dirname, "translations")).filter(name => /^[a-z]{2,3}(-[a-z0-9]+)?\.ts$/i.test(name));
  const pluralBases = new Set(Object.keys(en).filter(key => key.endsWith("_other")).map(key => key.slice(0, -"_other".length)));
  // The English key whose placeholders a catalog key must match, or null if
  // the key is neither an English key nor a plural form of one.
  const englishKey = (key: string): keyof typeof en | null => {
    if (isMessageKey(key)) return key;
    const match = /^(.*)_(zero|one|two|few|many|other)$/.exec(key);
    return match && pluralBases.has(match[1]!) ? `${match[1]!}_other` as keyof typeof en : null;
  };

  it("finds the catalogs", () => {
    expect(files).toContain("en.ts");
    expect(files).toContain("de.ts");
  });

  it.each(files.filter(name => name !== "en.ts"))("%s has no extra keys and matches English placeholders", async name => {
    const language = name.slice(0, -".ts".length);
    const module = await import(`./translations/${language}.ts`) as Record<string, LanguageCatalog | undefined>;
    const catalog = module[language];
    expect(catalog, `${name} must export a catalog named ${language}`).toBeDefined();
    expect(LANGUAGES as readonly string[], `${language} must be listed in LANGUAGES`).toContain(language);
    for (const [key, text] of Object.entries(catalog!)) {
      const source = englishKey(key);
      expect(source, `${name}: ${key} is not an English key`).not.toBeNull();
      expect(placeholders(text!), `${name}: ${key}`).toEqual(placeholders(en[source!]));
      expect(text!.trim(), `${name}: ${key}`).not.toBe("");
    }
  });
});

describe("locale formatting", () => {
  it("formats numbers with the profile language by default", () => {
    expect(ENGLISH.number(1234.5)).toBe("1234.5");
    expect(ENGLISH.number(200000)).toBe("200,000");
    const de = createLocalizer({ language: "de" });
    expect(de.number(10.5)).toBe("10,5");
    expect(de.number(200000.5)).toBe("200.000,5");
  });

  it("honours the Home Assistant number format preference", () => {
    expect(createLocalizer({ language: "de", locale: { language: "de", number_format: "comma_decimal" } }).number(12345.5)).toBe("12,345.5");
    expect(createLocalizer({ language: "en", locale: { language: "en", number_format: "decimal_comma" } }).number(12345.5)).toBe("12.345,5");
    expect(createLocalizer({ language: "en", locale: { language: "en", number_format: "none" } }).number(12345.5)).toBe("12345.5");
  });

  it("uses the language's percent style", () => {
    expect(ENGLISH.percent(35)).toBe("35%");
    expect(createLocalizer({ language: "de" }).percent(35)).toBe("35 %");
  });

  it("formats calendar dates without shifting the day", () => {
    expect(ENGLISH.date("2026-01-02")).toBe("Jan 2, 2026");
    expect(createLocalizer({ language: "de" }).date("2026-01-02")).toBe("02.01.2026");
    expect(ENGLISH.date("not a date")).toBe("not a date");
  });

  it("formats recorded wall-clock times with their original offset", () => {
    expect(createLocalizer({ language: "en", locale: { language: "en", time_format: "24" } }).recordedDateTime("2026-01-02T11:15:00+01:00")).toBe("Jan 2, 2026, 11:15 (UTC+01:00)");
    expect(createLocalizer({ language: "de" }).recordedDateTime("2026-01-02T11:15:00Z")).toBe("2. Jan. 2026, 11:15 (UTC+00:00)");
    expect(ENGLISH.recordedDateTime("garbage")).toBe("garbage");
  });

  it("ignores malformed language tags when choosing formats", () => {
    const l = createLocalizer({ language: "de", locale: { language: "not a tag!" } });
    expect(l.language).toBe("en");
    expect(() => l.number(1.5)).not.toThrow();
  });
});
