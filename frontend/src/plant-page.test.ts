import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import { createLocalizer, ENGLISH } from "./localize.js";
import { formatDuration, friendlyName, headerReason, readingPhrase, readingStateText } from "./views/plant.js";
import type { PlantOverview } from "./overview-model.js";
import type { CareEvent, HAState, PlantRecord } from "./types.js";
import { button, click, deferred, harness, overviewFor, panelText, role, sample, settle } from "./test-helpers.js";

const NOW = "2026-09-28T12:00:00+00:00";
const soil: HAState = { entity_id: "sensor.mock_soil", state: "12", attributes: { friendly_name: "Kitchen Soil Probe", unit_of_measurement: "%", device_class: "moisture" }, last_updated: NOW };
const backup: HAState = { entity_id: "sensor.mock_backup", state: "14", attributes: { friendly_name: "Backup Probe", unit_of_measurement: "%", device_class: "moisture" }, last_updated: NOW };
const watered = (id: string, kind: CareEvent["kind"], day: string): CareEvent => ({ schema_version: 1, id, kind, provenance: "manual", occurred_at: `2026-09-${day}T10:00:00+00:00`, local_date: `2026-09-${day}`, created_at: NOW, updated_at: NOW, payload: kind === "note" ? { text: "Leaf" } : { note: null } });

function plantWithSensors(): PlantRecord {
  return { ...structuredClone(sample), roles: { moisture: { ...role, sources: [{ entity_id: "sensor.mock_soil", registry_id: null }, { entity_id: "sensor.mock_backup", registry_id: null }], primary_entity_id: "sensor.mock_soil" } } };
}
function needsWater(plant: PlantRecord): PlantOverview {
  return { ...overviewFor(plant), status: "needs_water", problems: [{ role: "moisture", kind: "needs_water" }], roles: { moisture: { value: 12, unit: "%", state: "low", range: { min: 20, target: 40, max: 60 }, last_reported: NOW, sources: ["sensor.mock_soil", "sensor.mock_backup"] } } };
}
async function mount(plant: PlantRecord, overview?: (p: PlantRecord) => PlantOverview, extra?: (msg: Record<string, unknown>, set: (next: PlantRecord) => void) => unknown) {
  let current = plant;
  const h = harness([plant], msg => {
    const custom = extra?.(msg, next => { current = next; }); if (custom !== undefined) return custom;
    if (msg.type === "smart_plants/plants/list") return { plants: [current] };
    if (msg.type === "smart_plants/plants/overview") return { plants: [overview ? overview(current) : overviewFor(current)] };
    if (msg.type === "get_states") return [soil, backup];
    return undefined;
  });
  const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
  await settle(el); await click(el, plant.name); await settle(el);
  return { el, h, set: (next: PlantRecord) => { current = next; } };
}
const root = (el: SmartPlantsPanel) => el.shadowRoot!;
const tabPanel = (el: SmartPlantsPanel) => root(el).querySelector<HTMLElement>("#detail-panel")!;

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe("plant page helpers", () => {
  it("formats the not-updating window and sentence phrases", () => {
    expect(formatDuration(ENGLISH, 21600)).toBe("6 h");
    expect(formatDuration(ENGLISH, 1800)).toBe("30 min");
    expect(formatDuration(ENGLISH, 90)).toBe("90 s");
    expect(readingPhrase(ENGLISH, "illuminance")).toBe("light");
    expect(readingPhrase(ENGLISH, "co2")).toBe("CO₂");
    expect(readingPhrase(createLocalizer({ language: "de" }), "moisture")).toBe("Bodenfeuchte");
  });
  it("names sensors by their friendly name and never shows a raw entity ID", () => {
    expect(friendlyName(ENGLISH, { [soil.entity_id]: soil }, soil.entity_id)).toBe("Kitchen Soil Probe");
    expect(friendlyName(ENGLISH, { "sensor.mock_plain": { ...soil, entity_id: "sensor.mock_plain", attributes: {} } }, "sensor.mock_plain")).toBe("Mock plain");
    expect(friendlyName(ENGLISH, {}, "sensor.mock_gone")).toBe("Missing sensor");
  });
  it("lists every reason in the header and states when all is well", () => {
    const plant = plantWithSensors();
    const overview: PlantOverview = { ...needsWater(plant), status: "needs_water", problems: [{ role: "moisture", kind: "needs_water" }, { role: "battery", kind: "battery_low" }], roles: { ...needsWater(plant).roles, battery: { value: 15, unit: "%", state: "low", range: { min: 20, max: null }, last_reported: NOW, sources: [] } } };
    expect(headerReason(ENGLISH, overview)).toBe("Soil moisture 12% is below the minimum of 20% · Sensor battery at 15%");
    expect(headerReason(ENGLISH, overviewFor(plant))).toBe("All readings are within target.");
    expect(headerReason(ENGLISH, { ...overviewFor(plant), status: "paused" })).toBe("Monitoring is paused.");
    expect(readingStateText(ENGLISH, { value: null, unit: "%", state: "stale", range: { min: 1, max: 2 }, last_reported: null, sources: [] })).toBe("Not updating");
  });
});

describe("plant page", () => {
  it("shows the header, key readings and friendly sensor names", async () => {
    const { el } = await mount(plantWithSensors(), needsWater);
    const header = root(el).querySelector(".header-card")!;
    expect(root(el).querySelector("h1")?.textContent).toBe("Aloe");
    expect(header.querySelector("sp-status-chip")?.getAttribute("status")).toBe("needs_water");
    expect(panelText(el)).toContain("Needs water");
    expect(header.textContent).toContain("Soil moisture 12% is below the minimum of 20%");
    expect(header.textContent).toContain("No species");
    expect(header.querySelectorAll(".kr")).toHaveLength(1);
    expect(header.querySelector(".kr")!.textContent).toContain("20–60%");
    const readings = tabPanel(el).textContent!;
    expect(readings).toContain("Kitchen Soil Probe, Backup Probe");
    expect(readings).toContain("Too low");
    expect(readings).not.toContain("sensor.mock_soil");
    expect([...root(el).querySelectorAll("[role=tab]")].map(t => t.textContent)).toEqual(["Overview", "Sensors", "Care", "Settings"]);
  });
  it("moves between tabs with the arrow keys", async () => {
    const { el } = await mount(plantWithSensors());
    const list = root(el).querySelector("[role=tablist]")!;
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); await settle(el);
    expect(root(el).querySelector("#tab-sensors")?.getAttribute("aria-selected")).toBe("true");
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })); await settle(el);
    expect(tabPanel(el).getAttribute("aria-label")).toBe("Settings");
  });
  it("warns in Sensors when the moisture sensor stopped reporting and keeps entity IDs in Troubleshooting", async () => {
    const stale = (p: PlantRecord): PlantOverview => ({ ...needsWater(p), status: "stale", problems: [{ role: "moisture", kind: "stale" }], roles: { moisture: { ...needsWater(p).roles.moisture!, state: "stale", value: null, last_reported: "2026-09-28T03:00:00+00:00", sources: ["sensor.mock_soil"] } } });
    const { el } = await mount(plantWithSensors(), stale);
    expect(root(el).querySelector(".kr")?.textContent).toContain("Last update");
    await click(el, "Sensors");
    const alert = tabPanel(el).querySelector(".stale-alert")!;
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.textContent).toContain("Kitchen Soil Probe last reported");
    const assigned = tabPanel(el).querySelector("section.sp-card")!;
    expect(assigned.textContent).toContain("Kitchen Soil Probe");
    expect(assigned.textContent).toContain("Main sensor");
    expect(assigned.textContent).not.toContain("sensor.mock_soil");
    expect(tabPanel(el).querySelector("dl.entity-ids")?.textContent).toContain("sensor.mock_soil");
  });
  it("logs a watering from the header without asking to review a conflict", async () => {
    const plant = plantWithSensors();
    const { el, h, set } = await mount(plant, undefined, msg => {
      if (msg.type === "smart_plants/care/add_watering") {
        const occurred = String(msg.occurred_at);
        const event: CareEvent = { ...watered("w1", "watering", "28"), occurred_at: occurred, local_date: occurred.slice(0, 10) };
        const updated = { ...plant, revision: 2, care_events: [event] }; set(updated);
        return { plant: updated, event, summary: { watering_count: 1, last_watered_at: occurred, last_watered_local_date: event.local_date } };
      }
      return undefined;
    });
    const toasts: string[] = []; el.addEventListener("hass-notification", e => toasts.push((e as CustomEvent<{ message: string }>).detail.message));
    await click(el, "Watered"); await settle(el); await settle(el);
    expect(h.calls.filter(c => c.type === "smart_plants/care/add_watering")).toHaveLength(1);
    expect(toasts).toEqual(["Watering logged for Aloe"]);
    expect(el.shadowRoot!.textContent).not.toContain("Review changes from another session");
  });
  it("filters care entries by kind and opens the form from Log care", async () => {
    const events = [watered("n1", "note", "21"), watered("w1", "watering", "20")];
    const plant = { ...plantWithSensors(), care_events: events };
    const { el } = await mount(plant, undefined, msg => msg.type === "smart_plants/care/list" ? { revision: 1, events, summary: { watering_count: 1, last_watered_at: events[1]!.occurred_at, last_watered_local_date: events[1]!.local_date } } : undefined);
    expect(tabPanel(el).textContent).toContain("Watered");
    await click(el, "Care");
    expect(tabPanel(el).querySelectorAll("ul.list li")).toHaveLength(2);
    await click(el, "Notes");
    expect(tabPanel(el).querySelectorAll("ul.list li")).toHaveLength(1);
    expect(button(root(el), "Notes").getAttribute("aria-pressed")).toBe("true");
    await click(el, "Pruning");
    expect(tabPanel(el).textContent).toContain("No entries of this type yet.");
    expect(root(el).querySelector("#care-form")).toBeNull();
    await click(el, "Log care");
    expect(root(el).querySelector("#care-form select")).not.toBeNull();
  });
  it("removes a sensor and picks the main sensor from the row menu", async () => {
    const plant = plantWithSensors();
    let revision = 1;
    const { el, h } = await mount(plant, undefined, (msg, set) => { if (msg.type !== "smart_plants/moisture/configure") return undefined; const next = { ...plant, revision: ++revision }; set(next); return { plant: next }; });
    await click(el, "Sensors");
    const rows = [...tabPanel(el).querySelectorAll("ul.list li")];
    const menu = (index: number) => rows[index]!.querySelector("ha-dropdown")!;
    expect(menu(0).textContent).not.toContain("Use as main sensor");
    menu(1).dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "primary" } } })); await settle(el);
    expect(h.calls.find(c => c.type === "smart_plants/moisture/configure")).toMatchObject({ moisture: { primary_entity_id: "sensor.mock_backup" } });
    menu(0).dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "remove" } } })); await settle(el);
    expect(h.calls.filter(c => c.type === "smart_plants/moisture/configure").at(-1)).toMatchObject({ moisture: { sources: [{ entity_id: "sensor.mock_backup" }], primary_entity_id: null } });
  });
  it("labels soil moisture targets plainly and says where the values come from", async () => {
    const { el } = await mount(plantWithSensors());
    await click(el, "Settings");
    const card = tabPanel(el).querySelector("#targets-heading")!.closest("section")!;
    expect([...card.querySelectorAll("label")].map(l => [...l.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join("").trim())).toEqual(["Needs water below", "Ideal", "Too wet above"]);
    expect(card.textContent).toContain("Values are Smart Plants defaults");
    expect(tabPanel(el).textContent).toContain("Pause monitoring");
    expect(tabPanel(el).textContent).not.toMatch(/aggregation|lifecycle/i);
  });
  it("downloads technical diagnostics without the plant name and pauses from the menu", async () => {
    const plant = { ...plantWithSensors(), name: "Private Name" };
    const blobs: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation(blob => { blobs.push(blob as Blob); return "blob:diagnostics"; });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const { el, h } = await mount(plant, undefined, msg => msg.type === "smart_plants/plants/disable" ? { plant: { ...plant, revision: 2, lifecycle_state: "disabled" } } : undefined);
    await click(el, "Download diagnostics");
    expect(clicked).toHaveBeenCalledOnce();
    const text = await blobs.at(-1)!.text();
    expect(JSON.parse(text)).toMatchObject({ plant: { id: plant.id, revision: 1 }, roles: { moisture: { primary_entity_id: "sensor.mock_soil" } } });
    expect(text).not.toContain("Private Name");
    await click(el, "Pause monitoring");
    expect(h.calls.find(c => c.type === "smart_plants/plants/disable")).toMatchObject({ plant_id: plant.id, expected_revision: 1 });
  });
});

describe("plant history", () => {
  const HOUR = 3_600_000;
  const moistureId = "sensor.mock_aloe_soil_moisture";
  const registry = (plant: PlantRecord, roles: string[] = ["moisture"]) => roles.map((r, i) => ({ id: `entry-${i}`, entity_id: r === "moisture" ? moistureId : `sensor.mock_aloe_${r}`, device_id: `device-${plant.id}`, unique_id: `smart_plants:${plant.id}:${r}`, platform: "smart_plants" }));
  // Hourly statistics ending now: a watering 60 hours ago, then a steady drop of 6 points per day.
  const statistics = (id: string) => {
    const now = Date.now();
    const rows = Array.from({ length: 96 }, (_, i) => {
      const hoursAgo = 96 - i; const mean = hoursAgo > 60 ? 35 - (96 - hoursAgo) * 0.1 : 70 - ((60 - hoursAgo) * 6) / 24;
      return { start: now - hoursAgo * HOUR, end: now - (hoursAgo - 1) * HOUR, mean, min: mean - 0.5, max: mean + 0.5 };
    });
    return { [id]: rows };
  };
  const wateredOverview = (p: PlantRecord): PlantOverview => ({ ...overviewFor(p), roles: { moisture: { value: 55, unit: "%", state: "ok", range: { min: 20, target: 40, max: 60 }, last_reported: NOW, sources: ["sensor.mock_soil"] } }, last_watered_at: new Date(Date.now() - 61 * HOUR).toISOString() });
  const history = (el: SmartPlantsPanel) => root(el).querySelector<HTMLElement>(".history-card");
  const requests = (h: { calls: Record<string, unknown>[] }) => h.calls.filter(c => c.type === "recorder/statistics_during_period");

  it("is left out while the plant has no sensor of its own to chart", async () => {
    const { el, h } = await mount(plantWithSensors());
    expect(history(el)).toBeNull();
    expect(requests(h)).toHaveLength(0);
  });
  it("charts the plant's own moisture sensor with the target range and the drying rate", async () => {
    const plant = plantWithSensors();
    const { el, h } = await mount(plant, wateredOverview, msg => msg.type === "config/entity_registry/list" ? registry(plant) : msg.type === "recorder/statistics_during_period" ? statistics(moistureId) : undefined);
    await settle(el);
    expect(requests(h)).toHaveLength(1);
    expect(requests(h)[0]).toMatchObject({ statistic_ids: [moistureId], period: "hour", types: ["mean", "min", "max"] });
    expect(requests(h)[0]).not.toHaveProperty("units");
    expect(Date.now() - Date.parse(String(requests(h)[0]!.start_time))).toBeGreaterThan(6.9 * 24 * HOUR);
    const chart = history(el)!.querySelector("sp-history-chart")!;
    await chart.updateComplete;
    // The current reading closes the gap between the last statistics period and now.
    expect(chart.points).toHaveLength(97);
    expect(chart.points.at(-1)!.mean).toBe(55);
    expect(chart.band).toEqual({ min: 20, max: 60, target: 40 });
    expect(chart.summary).toMatch(/^Soil moisture, last 7 days: from /);
    expect(chart.bandLabel).toBe("Target: 20–60%");
    expect(history(el)!.querySelector(".history-rate")!.textContent).toMatch(/Dropping about 6(\.\d)?% per day since the last watering\. At this rate it reaches the minimum of 20% in about 6 days\./);
    // One sensor: no reading chips, but the range switch.
    expect(history(el)!.querySelector("[aria-label='Reading']")).toBeNull();
    expect([...history(el)!.querySelectorAll(".seg button")].map(b => b.getAttribute("aria-pressed"))).toEqual(["false", "true", "false", "false"]);
  });
  it("switches range and reading, remembers both and opens the sensor in Home Assistant", async () => {
    const base = plantWithSensors();
    const plant: PlantRecord = { ...base, roles: { ...base.roles!, temperature: { sources: [{ entity_id: "sensor.mock_temp", registry_id: null }], primary_entity_id: null, aggregation: "average", stale_after_seconds: 21600 } } };
    const { el, h } = await mount(plant, wateredOverview, msg => msg.type === "config/entity_registry/list" ? registry(plant, ["moisture", "temperature", "needs_water"]) : msg.type === "recorder/statistics_during_period" ? statistics((msg.statistic_ids as string[])[0]!) : undefined);
    await settle(el);
    expect([...history(el)!.querySelectorAll("[aria-label='Reading'] button")].map(b => b.textContent)).toEqual(["Soil moisture", "Temperature"]);
    await click(el, "1 year"); await settle(el);
    expect(requests(h).at(-1)).toMatchObject({ statistic_ids: [moistureId], period: "day" });
    expect(localStorage.getItem("smart_plants.history_range")).toBe("1y");
    await click(el, "Temperature"); await settle(el);
    expect(requests(h).at(-1)).toMatchObject({ statistic_ids: ["sensor.mock_aloe_temperature"], period: "day", units: { temperature: "°C" } });
    expect(localStorage.getItem("smart_plants.history_role")).toBe("temperature");
    expect(history(el)!.querySelector(".history-rate")).toBeNull();
    const opened: unknown[] = []; el.addEventListener("hass-more-info", e => opened.push((e as CustomEvent).detail));
    await click(el, "Open in Home Assistant");
    expect(opened).toEqual([{ entityId: "sensor.mock_aloe_temperature" }]);
  });
  it("explains missing data, a missing recorder and a failed request", async () => {
    const plant = plantWithSensors();
    let reply: () => unknown = () => ({});
    const noReading = (p: PlantRecord): PlantOverview => ({ ...overviewFor(p), roles: { moisture: { ...overviewFor(p).roles.moisture!, value: null, state: "unavailable" } } });
    const { el, h } = await mount(plant, noReading, msg => msg.type === "config/entity_registry/list" ? registry(plant) : msg.type === "recorder/statistics_during_period" ? reply() : undefined);
    await settle(el);
    expect(history(el)!.textContent).toContain("Home Assistant has not recorded any values for this period yet.");
    reply = () => Promise.reject({ code: "unknown_command" });
    await click(el, "24 h"); await settle(el);
    expect(history(el)!.textContent).toContain("History is not available because Home Assistant's Recorder is not running.");
    expect(history(el)!.textContent).not.toContain("Open in Home Assistant");
    reply = () => Promise.reject({ code: "home_assistant_error" });
    await click(el, "30 days"); await settle(el);
    expect(history(el)!.querySelector("[role=alert]")!.textContent).toBe("The history could not be loaded.");
    reply = () => statistics(moistureId);
    const before = requests(h).length;
    await click(el, "Try again"); await settle(el);
    expect(requests(h)).toHaveLength(before + 1);
    expect(history(el)!.querySelector("sp-history-chart")).not.toBeNull();
  });
  it("ignores a slow reply for a range that is no longer shown", async () => {
    const plant = plantWithSensors();
    const slow = deferred<unknown>();
    const { el } = await mount(plant, wateredOverview, msg => msg.type === "config/entity_registry/list" ? registry(plant) : msg.type === "recorder/statistics_during_period" ? (msg.period === "hour" ? slow.promise : { [moistureId]: [] }) : undefined);
    await settle(el);
    expect(history(el)!.textContent).toContain("Loading history…");
    await click(el, "1 year"); await settle(el);
    slow.resolve(statistics(moistureId)); await settle(el);
    // Only the current reading: the late hourly statistics were dropped.
    expect(history(el)!.querySelector("sp-history-chart")!.points).toHaveLength(1);
  });
});
