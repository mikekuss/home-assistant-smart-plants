import { describe, expect, it } from "vitest";
import { createLocalizer, isMessageKey } from "./localize.js";
import { PLANT_STATUSES, READING_ROLES, ROLE_META, STATUS_META, compareStatus, formatRange, formatValue, isPlantStatus, isReadingRole, readingLabel, relativeTime, statusLabel } from "./status.js";
import type { PlantStatus } from "./status.js";

const en = createLocalizer({ language: "en" });
const de = createLocalizer({ language: "de" });

describe("plant status mapping", () => {
  it("gives every status an mdi icon, a theme colour and a catalog label", () => {
    for (const status of PLANT_STATUSES) {
      const meta = STATUS_META[status];
      expect(meta.icon).toMatch(/^mdi:[a-z0-9-]+$/);
      expect(meta.color).toMatch(/^--[a-z-]+-color$/);
      expect(isMessageKey(meta.label)).toBe(true);
    }
  });
  it("uses sentence case in English and German", () => {
    expect(PLANT_STATUSES.map(s => statusLabel(en, s))).toEqual(["Needs water", "Too wet", "Problem", "No recent data", "No sensors", "Healthy", "Paused"]);
    expect(PLANT_STATUSES.map(s => statusLabel(de, s))).toEqual(["Braucht Wasser", "Zu nass", "Problem", "Keine aktuellen Daten", "Keine Sensoren", "Gesund", "Pausiert"]);
  });
  it("orders plants that need attention first", () => {
    const shuffled: PlantStatus[] = ["healthy", "paused", "stale", "needs_water", "no_sensors", "problem", "too_wet"];
    expect([...shuffled].sort(compareStatus)).toEqual(["needs_water", "too_wet", "problem", "stale", "no_sensors", "healthy", "paused"]);
  });
  it("recognizes only known statuses", () => {
    expect(isPlantStatus("needs_water")).toBe(true);
    expect(isPlantStatus("needs water")).toBe(false);
    expect(isPlantStatus(undefined)).toBe(false);
  });
});

describe("reading presentation", () => {
  it("gives every role an icon and a plain label", () => {
    for (const role of READING_ROLES) {
      expect(ROLE_META[role].icon).toMatch(/^mdi:[a-z0-9-]+$/);
      expect(isMessageKey(ROLE_META[role].label)).toBe(true);
    }
    expect(readingLabel(en, "illuminance")).toBe("Light");
    expect(readingLabel(de, "moisture")).toBe("Bodenfeuchte");
    expect(isReadingRole("co2")).toBe(true);
    expect(isReadingRole("health")).toBe(false);
  });
  it("formats values with the catalog's percent spacing", () => {
    expect(formatValue(en, 34, "%")).toBe("34%");
    expect(formatValue(de, 34, "%")).toBe("34 %");
    expect(formatValue(en, 22.4, "°C")).toBe("22.4 °C");
    expect(formatValue(de, 22.4, "°C")).toBe("22,4 °C");
    expect(formatValue(en, 1850, "lx")).toBe("1850 lx");
    expect(formatValue(en, 21000, "lx")).toBe("21,000 lx");
  });
  it("describes target ranges in plain words", () => {
    expect(formatRange(en, "moisture", { min: 30, target: 45, max: 60 }, "%")).toBe("30–60%");
    expect(formatRange(de, "moisture", { min: 30, target: 45, max: 60 }, "%")).toBe("30–60 %");
    expect(formatRange(en, "temperature", { min: 18, max: 28 }, "°C")).toBe("18–28 °C");
    expect(formatRange(en, "illuminance", { min: 500, max: null }, "lx")).toBe("At least 500 lx");
    expect(formatRange(en, "co2", { min: null, max: 1500 }, "ppm")).toBe("At most 1500 ppm");
    expect(formatRange(en, "battery", { min: 20, max: null }, "%")).toBe("Low below 20%");
    expect(formatRange(de, "battery", { min: 20, max: null }, "%")).toBe("Niedrig unter 20 %");
    expect(formatRange(en, "temperature", { min: null, max: null }, "°C")).toBe("");
    expect(formatRange(en, "temperature", null, "°C")).toBe("");
  });
  it("formats the age of a reading relative to now", () => {
    const now = Date.parse("2026-09-28T12:00:00Z");
    expect(relativeTime(en, "2026-09-28T03:00:00Z", now)).toBe("9 hours ago");
    expect(relativeTime(de, "2026-09-28T03:00:00Z", now)).toBe("vor 9 Stunden");
    expect(relativeTime(en, "2026-09-28T11:58:00Z", now)).toBe("2 minutes ago");
    expect(relativeTime(en, "2026-09-26T12:00:00Z", now)).toBe("2 days ago");
    expect(relativeTime(en, "not a date", now)).toBe("not a date");
  });
});
