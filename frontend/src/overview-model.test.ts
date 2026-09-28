import { describe, expect, it } from "vitest";
import { createLocalizer } from "./localize.js";
import { cardReason, chipText, groupByArea, matchesFilter, matchesSearch, parseOverview, problemReason, secondaryReadings, sortItems, wateredText } from "./overview-model.js";
import type { OverviewItem, PlantOverview, RoleReading } from "./overview-model.js";
import type { PlantStatus } from "./status.js";

const en = createLocalizer({ language: "en" });
const de = createLocalizer({ language: "de" });
const now = Date.parse("2026-09-28T12:00:00Z");

function reading(value: number | null, unit: string, range: RoleReading["range"], state: RoleReading["state"] = "ok", lastReported: string | null = "2026-09-28T11:58:00+00:00"): RoleReading {
  return { value, unit, state, range, last_reported: lastReported, sources: ["sensor.mock_probe"] };
}
function entry(status: PlantStatus, problems: PlantOverview["problems"], roles: PlantOverview["roles"] = {}): PlantOverview {
  return { plant_id: "p1", revision: 3, lifecycle_state: "active", status, problems, roles, last_watered_at: "2026-09-26T12:00:00+00:00", image: null };
}

describe("parseOverview", () => {
  const raw = {
    plant_id: "p1", revision: 3, lifecycle_state: "active", status: "needs_water",
    problems: [{ role: "moisture", kind: "needs_water" }],
    roles: {
      moisture: { value: 34, unit: "%", state: "low", range: { min: 60, target: 70, max: 85 }, last_reported: "2026-09-28T11:58:00+00:00", sources: ["sensor.mock_basil_moisture"] },
      future_role: { anything: true },
    },
    last_watered_at: null, image: { id: "img-1" },
  };
  it("accepts the backend shape and skips unknown roles", () => {
    const parsed = parseOverview(raw)!;
    expect(parsed.status).toBe("needs_water");
    expect(parsed.roles.moisture?.range).toEqual({ min: 60, target: 70, max: 85 });
    expect(Object.keys(parsed.roles)).toEqual(["moisture"]);
    expect(parsed.image).toEqual({ id: "img-1" });
  });
  it("rejects malformed entries instead of guessing", () => {
    expect(parseOverview({ ...raw, status: "needs water" })).toBeNull();
    expect(parseOverview({ ...raw, revision: "3" })).toBeNull();
    expect(parseOverview({ ...raw, problems: [{ role: "moisture" }] })).toBeNull();
    expect(parseOverview({ ...raw, roles: { moisture: { ...raw.roles.moisture, state: "wet" } } })).toBeNull();
    expect(parseOverview({ ...raw, roles: { moisture: { ...raw.roles.moisture, range: { min: "60" } } } })).toBeNull();
    expect(parseOverview(null)).toBeNull();
  });
});

describe("chip and reason text", () => {
  const basil = entry("needs_water", [{ role: "moisture", kind: "needs_water" }], { moisture: reading(34, "%", { min: 60, target: 70, max: 85 }, "low") });
  it("describes watering problems against the target", () => {
    expect(chipText(en, basil)).toEqual({ label: "Needs water", more: 0 });
    expect(cardReason(en, basil)).toBe("Soil moisture 34% is below the minimum of 60%");
    expect(cardReason(de, basil)).toBe("Bodenfeuchte 34 % liegt unter dem Minimum von 60 %");
    const monstera = entry("too_wet", [{ role: "moisture", kind: "too_wet" }], { moisture: reading(74, "%", { min: 30, target: 45, max: 60 }, "high") });
    expect(cardReason(en, monstera)).toBe("Soil moisture 74% is above the maximum of 60%");
  });
  it("names the specific problem on the chip and counts the rest", () => {
    const snake = entry("problem", [{ role: "illuminance", kind: "low_light" }, { role: "battery", kind: "battery_low" }], {
      moisture: reading(41, "%", { min: 20, target: 35, max: 70 }),
      illuminance: reading(120, "lx", { min: 500, target: null, max: null }, "low"),
      battery: reading(15, "%", { min: 20, target: null, max: null }, "low"),
    });
    expect(chipText(en, snake)).toEqual({ label: "Too little light", more: 1 });
    expect(chipText(de, snake)).toEqual({ label: "Zu wenig Licht", more: 1 });
    expect(cardReason(en, snake)).toBe("Light 120 lx, needs at least 500 lx · Sensor battery at 15%");
    const soil = entry("problem", [{ role: "soil_temperature", kind: "too_cold" }], { soil_temperature: reading(4, "°C", { min: 8, target: null, max: 30 }, "low") });
    expect(chipText(en, soil).label).toBe("Soil too cold");
    expect(cardReason(en, soil)).toBe("Soil temperature 4 °C is below the minimum of 8 °C");
  });
  it("explains stale and missing data", () => {
    const aloe = entry("stale", [{ role: "moisture", kind: "stale" }], { moisture: reading(31, "%", { min: 15, target: 25, max: 60 }, "stale", "2026-09-28T03:00:00+00:00") });
    expect(chipText(en, aloe).label).toBe("No recent data");
    expect(cardReason(en, aloe, now)).toBe("Soil moisture: last reading 9 hours ago");
    const offline = entry("stale", [{ role: "moisture", kind: "unavailable" }], { moisture: reading(null, "%", { min: 15, target: 25, max: 60 }, "unavailable", null) });
    expect(cardReason(en, offline)).toBe("Soil moisture: sensor is not reporting");
    expect(problemReason(en, offline, { role: "co2", kind: "stress" })).toBe("CO₂ is outside its target");
  });
  it("shows no reason for healthy, paused and sensorless plants", () => {
    expect(cardReason(en, entry("healthy", []))).toBe("");
    expect(cardReason(en, entry("paused", [{ role: "moisture", kind: "needs_water" }]))).toBe("");
    expect(chipText(en, entry("paused", [{ role: "moisture", kind: "needs_water" }]))).toEqual({ label: "Paused", more: 0 });
    expect(cardReason(en, entry("no_sensors", [{ role: "moisture", kind: "no_sensors" }]))).toBe("");
  });
  it("lists other readings in a fixed order after moisture", () => {
    const plant = entry("healthy", [], { battery: reading(80, "%", { min: 20, target: null, max: null }), moisture: reading(40, "%", { min: 20, target: 40, max: 60 }), temperature: reading(21, "°C", { min: 15, target: null, max: 30 }) });
    expect(secondaryReadings(plant).map(([role]) => role)).toEqual(["temperature", "battery"]);
  });
  it("describes the last watering", () => {
    expect(wateredText(en, "2026-09-26T12:00:00+00:00", now)).toBe("Watered 2 days ago");
    expect(wateredText(en, "2026-09-27T12:00:00+00:00", now)).toBe("Watered yesterday");
    expect(wateredText(en, "2026-09-28T11:59:40+00:00", now)).toBe("Watered just now");
    expect(wateredText(en, null, now)).toBe("Not watered yet");
    expect(wateredText(de, "2026-09-26T12:00:00+00:00", now)).toBe("Zuletzt gegossen: vorgestern");
  });
});

describe("filtering, search and sorting", () => {
  const item = (name: string, status: PlantStatus | undefined, areaName: string | null, extra = ""): OverviewItem => ({ id: name, name, status, areaName, searchText: [name, areaName, extra].filter(Boolean).join(" ") });
  const items = [item("Pothos", "healthy", "Living Room"), item("Basil", "needs_water", "Kitchen", "Ocimum basilicum Herbs edible"), item("Aloe", "stale", "Kitchen"), item("Monstera", "too_wet", "Living Room"), item("Peace Lily", "no_sensors", null), item("Snake Plant", "problem", "Bedroom"), item("Jade", "paused", null)];
  it("maps summary tiles to statuses", () => {
    const names = (filter: Parameters<typeof matchesFilter>[0]) => items.filter(i => matchesFilter(filter, i.status)).map(i => i.name);
    expect(names("all")).toHaveLength(7);
    expect(names("water")).toEqual(["Basil"]);
    expect(names("problems")).toEqual(["Monstera", "Snake Plant"]);
    expect(names("sensors")).toEqual(["Aloe", "Peace Lily"]);
  });
  it("searches name, area, species, category and tags", () => {
    expect(items.filter(i => matchesSearch(i, "kitchen")).map(i => i.name)).toEqual(["Basil", "Aloe"]);
    expect(items.filter(i => matchesSearch(i, "  OCIMUM ")).map(i => i.name)).toEqual(["Basil"]);
    expect(items.filter(i => matchesSearch(i, "edible")).map(i => i.name)).toEqual(["Basil"]);
    expect(items.filter(i => matchesSearch(i, "")).length).toBe(7);
  });
  it("sorts by attention, then name", () => {
    expect(sortItems(items, "attention").map(i => i.name)).toEqual(["Basil", "Monstera", "Snake Plant", "Aloe", "Peace Lily", "Pothos", "Jade"]);
    expect(sortItems(items, "name").map(i => i.name)).toEqual(["Aloe", "Basil", "Jade", "Monstera", "Peace Lily", "Pothos", "Snake Plant"]);
  });
  it("groups by area with plants without an area last", () => {
    expect(groupByArea(items).map(g => [g.area, g.items.map(i => i.name)])).toEqual([
      ["Bedroom", ["Snake Plant"]], ["Kitchen", ["Aloe", "Basil"]], ["Living Room", ["Monstera", "Pothos"]], [null, ["Jade", "Peace Lily"]],
    ]);
  });
});
