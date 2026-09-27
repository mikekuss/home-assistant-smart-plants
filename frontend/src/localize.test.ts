import { describe, expect, it } from "vitest";
import { ENGLISH, createLocalizer, isMessageKey, panelLanguage } from "./localize.js";
import type { Catalog } from "./localize.js";
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
    expect(l.t("section.advanced_diagnostics")).toBe("Advanced diagnostics");
  });

  it("leaves unknown placeholders intact and formats numeric arguments", () => {
    expect(ENGLISH.t("dialog.delete_title", {})).toBe("Delete {name}?");
    expect(createLocalizer({ language: "de" }).t("section.overall_health_available_summary", { score: 12345 })).toBe("12.345 von 100");
  });

  it("selects singular and plural forms", () => {
    expect(ENGLISH.tn(1, "list.count_one", "list.count_other")).toBe("1 plant");
    expect(ENGLISH.tn(0, "list.count_one", "list.count_other")).toBe("0 plants");
    const l = createLocalizer({ language: "de" });
    expect(l.tn(1, "care.watering_count_one", "care.watering_count_other")).toBe("1 Gießvorgang.");
    expect(l.tn(3, "care.watering_count_one", "care.watering_count_other")).toBe("3 Gießvorgänge.");
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
