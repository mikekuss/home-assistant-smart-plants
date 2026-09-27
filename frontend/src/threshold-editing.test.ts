import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import { CO2_STRESS_KEYS, CONDUCTIVITY_STRESS_KEYS, HUMIDITY_STRESS_KEYS, LOW_BATTERY_STRESS_KEYS, LOW_LIGHT_STRESS_KEYS, SOIL_TEMPERATURE_STRESS_KEYS, TEMPERATURE_STRESS_KEYS, parseCo2StressField, parseConductivityStressField, parseHumidityStressField, parseLowBatteryField, parseLowLightField, parseSoilTemperatureStressField, parseTemperatureStressField, validateCo2StressOverrides, validateConductivityStressOverrides, validateHumidityStressOverrides, validateLowBatteryOverrides, validateLowLightOverrides, validateSoilTemperatureStressOverrides, validateTemperatureStressOverrides } from "./model.js";
import type { HAEntity, HAState, PlantRecord } from "./types.js";
import { click, harness, sample, settle } from "./test-helpers.js";

const PLANT_ID = sample.id;

function stressEntity(role: string): HAEntity {
  return { id: `reg-${role}`, entity_id: `binary_sensor.smart_plants_${PLANT_ID}_${role}`, device_id: `device-${PLANT_ID}`, unique_id: `smart_plants:${PLANT_ID}:${role}`, platform: "smart_plants" };
}
function stressState(role: string, state: string, attributes: Record<string, unknown> = {}): HAState {
  return { entity_id: `binary_sensor.smart_plants_${PLANT_ID}_${role}`, state, attributes, last_updated: "2026-09-18T00:00:00Z" };
}
function withTemperatureRole(overrides: Partial<Record<string, number | null>> = {}): PlantRecord {
  const seeded: Record<string, number | null> = { cold_threshold_celsius: null, cold_clear_celsius: null, hot_clear_celsius: null, hot_threshold_celsius: null, ...overrides };
  const clone = structuredClone(sample);
  return { ...clone, roles: { ...clone.roles, temperature: { stress_threshold_overrides: seeded } } as NonNullable<PlantRecord["roles"]> };
}
function withHumidityRole(overrides: Partial<Record<string, number | null>> = {}): PlantRecord {
  const seeded: Record<string, number | null> = { dry_threshold_percent: null, dry_clear_percent: null, damp_clear_percent: null, damp_threshold_percent: null, ...overrides };
  const clone = structuredClone(sample);
  return { ...clone, roles: { ...clone.roles, humidity: { stress_threshold_overrides: seeded } } as NonNullable<PlantRecord["roles"]> };
}
function withConductivityRole(overrides: Partial<Record<string, number | null>> = {}): PlantRecord {
  const seeded: Record<string, number | null> = { low_threshold_micro_siemens_per_cm: null, low_clear_micro_siemens_per_cm: null, high_clear_micro_siemens_per_cm: null, high_threshold_micro_siemens_per_cm: null, ...overrides };
  const clone = structuredClone(sample);
  return { ...clone, roles: { ...clone.roles, conductivity: { stress_threshold_overrides: seeded } } as NonNullable<PlantRecord["roles"]> };
}
function withCo2Role(overrides: Partial<Record<string, number | null>> = {}): PlantRecord {
  const seeded: Record<string, number | null> = { threshold_ppm: null, clear_ppm: null, ...overrides };
  const clone = structuredClone(sample);
  return { ...clone, roles: { ...clone.roles, co2: { stress_threshold_overrides: seeded } } as NonNullable<PlantRecord["roles"]> };
}
function withSoilTemperatureRole(overrides: Partial<Record<string, number | null>> = {}): PlantRecord {
  const seeded: Record<string, number | null> = { cold_threshold_celsius: null, cold_clear_celsius: null, hot_clear_celsius: null, hot_threshold_celsius: null, ...overrides };
  const clone = structuredClone(sample);
  return { ...clone, roles: { ...clone.roles, soil_temperature: { stress_threshold_overrides: seeded } } as NonNullable<PlantRecord["roles"]> };
}
function withBatteryRole(overrides: Partial<Record<string, number | null>> = {}): PlantRecord {
  const seeded: Record<string, number | null> = { threshold_percent: null, clear_percent: null, ...overrides };
  const clone = structuredClone(sample);
  return { ...clone, roles: { ...clone.roles, battery: { stress_threshold_overrides: seeded } } as NonNullable<PlantRecord["roles"]> };
}
function withIlluminanceRole(overrides: Partial<Record<string, number | null>> = {}): PlantRecord {
  const seeded: Record<string, number | null> = { target_lux: null, clear_lux: null, ...overrides };
  const clone = structuredClone(sample);
  return { ...clone, roles: { ...clone.roles, illuminance: { stress_threshold_overrides: seeded } } as NonNullable<PlantRecord["roles"]> };
}
async function mountDetail(plant: PlantRecord, entities: HAEntity[], states: Record<string, HAState>, extra?: (msg: Record<string, unknown>) => unknown) {
  const h = harness([plant], msg => {
    if (extra) { const r = extra(msg); if (r !== undefined) return r; }
    if (msg.type === "config/entity_registry/list") return entities;
    if (msg.type === "get_states") return Object.values(states);
    return undefined;
  });
  const el = new SmartPlantsPanel();
  el.hass = h.hass;
  document.body.append(el);
  await settle(el);
  await click(el, plant.name);
  await click(el, "Diagnostics");
  return { el, calls: h.calls };
}

describe("temperature-stress override helpers", () => {
  it("parses blank as inherit and numbers within range as one-decimal", () => {
    expect(parseTemperatureStressField("")).toBeNull();
    expect(parseTemperatureStressField("  ")).toBeNull();
    expect(parseTemperatureStressField("10")).toBe(10);
    expect(parseTemperatureStressField("10.05")).toBe(10.1);
  });
  it("rejects non-finite and out-of-range values", () => {
    expect(parseTemperatureStressField("abc")).toBe("invalid");
    expect(parseTemperatureStressField("NaN")).toBe("invalid");
    expect(parseTemperatureStressField("-40.1")).toBe("invalid");
    expect(parseTemperatureStressField("80.1")).toBe("invalid");
  });
  it("all-blank overrides validate as all-null (inherit built-in defaults)", () => {
    const { values, error } = validateTemperatureStressOverrides({ cold_threshold_celsius: "", cold_clear_celsius: "", hot_clear_celsius: "", hot_threshold_celsius: "" });
    expect(error).toBeNull();
    for (const k of TEMPERATURE_STRESS_KEYS) expect(values[k]).toBeNull();
  });
  it("rejects effective ordering violations", () => {
    const { error } = validateTemperatureStressOverrides({ cold_threshold_celsius: "20", cold_clear_celsius: "18", hot_clear_celsius: "", hot_threshold_celsius: "" });
    expect(error).not.toBeNull();
  });
  it("rejects too-small hysteresis span", () => {
    const { error } = validateTemperatureStressOverrides({ cold_threshold_celsius: "10", cold_clear_celsius: "10.2", hot_clear_celsius: "", hot_threshold_celsius: "" });
    expect(error).not.toBeNull();
  });
  it("rejects too-small stable band between clears", () => {
    const { error } = validateTemperatureStressOverrides({ cold_threshold_celsius: "10", cold_clear_celsius: "11", hot_clear_celsius: "11.5", hot_threshold_celsius: "12" });
    expect(error).not.toBeNull();
  });
});

describe("temperature stress threshold editor UI", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" })))); });
  afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows the temperature Edit thresholds button on configured editable rows", async () => {
    // Only temperature_stress registered; low_light is now editable but omitted here.
    const roles = ["temperature_stress"];
    const entities = roles.map(stressEntity);
    const states = Object.fromEntries(roles.map(r => [`binary_sensor.smart_plants_${PLANT_ID}_${r}`, stressState(r, "off")]));
    const { el } = await mountDetail(withTemperatureRole(), entities, states);
    const toggles = [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")];
    expect(toggles.length).toBe(1);
    expect(toggles[0].textContent).toContain("Edit thresholds");
    const tempDd = [...el.shadowRoot!.querySelectorAll("dl.diagnostics dd")].find(dd => dd.querySelector("button.threshold-toggle"));
    const tempDt = tempDd?.previousElementSibling;
    expect(tempDt?.textContent).toContain("Temperature stress");
  });

  it("hides the toggle button when the temperature_stress entity is not configured", async () => {
    const { el } = await mountDetail(withTemperatureRole(), [], {});
    expect(el.shadowRoot!.querySelector("button.threshold-toggle")).toBeNull();
  });

  it("opens the sub-form on click, seeded with blanks for null overrides", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withTemperatureRole(), entities, states);
    await click(el, "Edit thresholds");
    const form = el.shadowRoot!.querySelector("#temperature_stress-editor")!;
    expect(form).not.toBeNull();
    const inputs = [...form.querySelectorAll("input[type='number']")] as HTMLInputElement[];
    expect(inputs.length).toBe(4);
    for (const i of inputs) expect(i.value).toBe("");
  });

  it("seeds fields from persisted numeric overrides", async () => {
    const plant = withTemperatureRole({ cold_threshold_celsius: 5, cold_clear_celsius: 7 });
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(plant, entities, states);
    await click(el, "Edit thresholds");
    const form = el.shadowRoot!.querySelector("#temperature_stress-editor")!;
    const inputs = [...form.querySelectorAll("input[type='number']")] as HTMLInputElement[];
    const map = Object.fromEntries(inputs.map(i => [(i.closest("label")?.textContent ?? "").trim(), i.value]));
    expect(map).toEqual(expect.objectContaining({}));
    expect(inputs.some(i => i.value === "5")).toBe(true);
    expect(inputs.some(i => i.value === "7")).toBe(true);
  });

  it("rejects invalid input before issuing a WebSocket call", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el, calls } = await mountDetail(withTemperatureRole(), entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#temperature_stress-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "20"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "18"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const err = el.shadowRoot!.querySelector("#temperature_stress-editor p.error");
    expect(err?.textContent).toContain("Effective thresholds");
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });

  it("sends role=temperature and all four keys on successful save", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const plant = withTemperatureRole();
    const updated = withTemperatureRole({ cold_threshold_celsius: 5, cold_clear_celsius: 7, hot_clear_celsius: null, hot_threshold_celsius: null });
    const { el, calls } = await mountDetail(plant, entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#temperature_stress-editor input[type='number']")] as HTMLInputElement[];
    // Cold trigger + cold clear only; hot side inherits.
    inputs[0].value = "5"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "7"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const sent = calls.find(c => c.type === "smart_plants/roles/set_threshold_overrides") as Record<string, unknown> | undefined;
    expect(sent).toBeDefined();
    expect(sent?.role).toBe("temperature");
    expect(sent?.plant_id).toBe(PLANT_ID);
    expect(sent?.expected_revision).toBe(1);
    expect(sent?.values).toEqual({ cold_threshold_celsius: 5, cold_clear_celsius: 7, hot_clear_celsius: null, hot_threshold_celsius: null });
  });

  it("collapses the form and announces success after save", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const updated = withTemperatureRole({ cold_threshold_celsius: 5, cold_clear_celsius: 7 });
    const { el } = await mountDetail(withTemperatureRole(), entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    await click(el, "Save thresholds");
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).toBeNull();
    const notice = [...el.shadowRoot!.querySelectorAll("p.notice")].find(n => n.textContent?.includes("Temperature stress thresholds saved."));
    expect(notice).toBeDefined();
  });

  it("Cancel closes the form without issuing a WebSocket call", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el, calls } = await mountDetail(withTemperatureRole(), entities, states);
    await click(el, "Edit thresholds");
    await click(el, "Cancel");
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).toBeNull();
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });

  it("Inherit all built-in defaults clears every field to blank", async () => {
    const plant = withTemperatureRole({ cold_threshold_celsius: 5, cold_clear_celsius: 7 });
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(plant, entities, states);
    await click(el, "Edit thresholds");
    await click(el, "Inherit all built-in defaults");
    const inputs = [...el.shadowRoot!.querySelectorAll("#temperature_stress-editor input[type='number']")] as HTMLInputElement[];
    for (const i of inputs) expect(i.value).toBe("");
  });

  it("renders an Edit thresholds toggle for the low_light row (no read-only role remains)", async () => {
    const roles = ["low_light"];
    const entities = roles.map(stressEntity);
    const states = Object.fromEntries(roles.map(r => [`binary_sensor.smart_plants_${PLANT_ID}_${r}`, stressState(r, "off")]));
    const { el } = await mountDetail(withTemperatureRole(), entities, states);
    // low_light is now editable — one toggle per registered editable row.
    expect(el.shadowRoot!.querySelectorAll("button.threshold-toggle").length).toBe(1);
  });
});

describe("humidity-stress override helpers", () => {
  it("parses blank as inherit and numbers within range as one-decimal", () => {
    expect(parseHumidityStressField("")).toBeNull();
    expect(parseHumidityStressField("30")).toBe(30);
    expect(parseHumidityStressField("30.05")).toBe(30.1);
  });
  it("rejects non-finite and out-of-range values", () => {
    expect(parseHumidityStressField("abc")).toBe("invalid");
    expect(parseHumidityStressField("-0.1")).toBe("invalid");
    expect(parseHumidityStressField("100.1")).toBe("invalid");
  });
  it("all-blank humidity overrides validate as all-null", () => {
    const { values, error } = validateHumidityStressOverrides({ dry_threshold_percent: "", dry_clear_percent: "", damp_clear_percent: "", damp_threshold_percent: "" });
    expect(error).toBeNull();
    for (const k of HUMIDITY_STRESS_KEYS) expect(values[k]).toBeNull();
  });
  it("rejects effective ordering violations for humidity", () => {
    const { error } = validateHumidityStressOverrides({ dry_threshold_percent: "40", dry_clear_percent: "35", damp_clear_percent: "", damp_threshold_percent: "" });
    expect(error).not.toBeNull();
  });
  it("rejects too-small humidity hysteresis span", () => {
    const { error } = validateHumidityStressOverrides({ dry_threshold_percent: "25", dry_clear_percent: "25.5", damp_clear_percent: "", damp_threshold_percent: "" });
    expect(error).not.toBeNull();
  });
  it("rejects too-small stable band between humidity clears", () => {
    const { error } = validateHumidityStressOverrides({ dry_threshold_percent: "40", dry_clear_percent: "45", damp_clear_percent: "48", damp_threshold_percent: "50" });
    expect(error).not.toBeNull();
  });
});

describe("humidity stress threshold editor UI", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" })))); });
  afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows a humidity Edit thresholds button next to the humidity_stress row and only when configured", async () => {
    const entities = [stressEntity("temperature_stress"), stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const { el } = await mountDetail(withHumidityRole(), entities, states);
    const toggles = [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")];
    expect(toggles.length).toBe(2); // one per editable configured role
    const dds = [...el.shadowRoot!.querySelectorAll("dl.diagnostics dd")];
    const humidityDd = dds.find(dd => dd.previousElementSibling?.textContent?.includes("Humidity stress"));
    expect(humidityDd?.querySelector("button.threshold-toggle")).not.toBeNull();
  });

  it("hides the humidity toggle when humidity_stress is not configured", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withHumidityRole(), entities, states);
    // Only temperature toggle should be present.
    expect(el.shadowRoot!.querySelectorAll("button.threshold-toggle").length).toBe(1);
  });

  it("opens the humidity sub-form seeded with blanks and four fields", async () => {
    const entities = [stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const { el } = await mountDetail(withHumidityRole(), entities, states);
    await click(el, "Edit thresholds");
    const form = el.shadowRoot!.querySelector("#humidity_stress-editor");
    expect(form).not.toBeNull();
    const inputs = [...form!.querySelectorAll("input[type='number']")] as HTMLInputElement[];
    expect(inputs.length).toBe(4);
    for (const i of inputs) expect(i.value).toBe("");
  });

  it("seeds humidity fields from persisted numeric overrides", async () => {
    const plant = withHumidityRole({ dry_threshold_percent: 15, dry_clear_percent: 20 });
    const entities = [stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const { el } = await mountDetail(plant, entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#humidity_stress-editor input[type='number']")] as HTMLInputElement[];
    expect(inputs.some(i => i.value === "15")).toBe(true);
    expect(inputs.some(i => i.value === "20")).toBe(true);
  });

  it("rejects invalid humidity input before issuing a WebSocket call", async () => {
    const entities = [stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const { el, calls } = await mountDetail(withHumidityRole(), entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#humidity_stress-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "40"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "35"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const err = el.shadowRoot!.querySelector("#humidity_stress-editor p.error");
    expect(err?.textContent).toContain("Effective thresholds");
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });

  it("sends role=humidity and all four keys on successful humidity save", async () => {
    const entities = [stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const plant = withHumidityRole();
    const updated = withHumidityRole({ dry_threshold_percent: 15, dry_clear_percent: 20 });
    const { el, calls } = await mountDetail(plant, entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#humidity_stress-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "15"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "20"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const sent = calls.find(c => c.type === "smart_plants/roles/set_threshold_overrides") as Record<string, unknown> | undefined;
    expect(sent).toBeDefined();
    expect(sent?.role).toBe("humidity");
    expect(sent?.plant_id).toBe(PLANT_ID);
    expect(sent?.values).toEqual({ dry_threshold_percent: 15, dry_clear_percent: 20, damp_clear_percent: null, damp_threshold_percent: null });
  });

  it("collapses the humidity sub-form and announces success after save", async () => {
    const entities = [stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const updated = withHumidityRole({ dry_threshold_percent: 15, dry_clear_percent: 20 });
    const { el } = await mountDetail(withHumidityRole(), entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    await click(el, "Save thresholds");
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).toBeNull();
    const notice = [...el.shadowRoot!.querySelectorAll("p.notice")].find(n => n.textContent?.includes("Humidity stress thresholds saved."));
    expect(notice).toBeDefined();
  });

  it("keeps the temperature and humidity editors independent", async () => {
    const entities = [stressEntity("temperature_stress"), stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const plant = { ...withTemperatureRole(), roles: { ...withTemperatureRole().roles, humidity: { stress_threshold_overrides: { dry_threshold_percent: null, dry_clear_percent: null, damp_clear_percent: null, damp_threshold_percent: null } } } as NonNullable<PlantRecord["roles"]> };
    const { el } = await mountDetail(plant, entities, states);
    // Open temperature editor.
    const tempToggle = [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")].find(b => b.closest("dd")?.previousElementSibling?.textContent?.includes("Temperature stress")) as HTMLButtonElement;
    tempToggle.click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).toBeNull();
    // Opening the humidity editor closes the temperature one (single active editor).
    const humToggle = [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")].find(b => b.closest("dd")?.previousElementSibling?.textContent?.includes("Humidity stress")) as HTMLButtonElement;
    humToggle.click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).toBeNull();
  });
});

describe("conductivity-stress override helpers", () => {
  it("parses blank as inherit and numbers within range as one-decimal", () => {
    expect(parseConductivityStressField("")).toBeNull();
    expect(parseConductivityStressField("350")).toBe(350);
    expect(parseConductivityStressField("350.05")).toBe(350.1);
  });
  it("rejects non-finite and out-of-range values", () => {
    expect(parseConductivityStressField("abc")).toBe("invalid");
    expect(parseConductivityStressField("-0.1")).toBe("invalid");
    expect(parseConductivityStressField("10000.1")).toBe("invalid");
  });
  it("all-blank conductivity overrides validate as all-null", () => {
    const { values, error } = validateConductivityStressOverrides({ low_threshold_micro_siemens_per_cm: "", low_clear_micro_siemens_per_cm: "", high_clear_micro_siemens_per_cm: "", high_threshold_micro_siemens_per_cm: "" });
    expect(error).toBeNull();
    for (const k of CONDUCTIVITY_STRESS_KEYS) expect(values[k]).toBeNull();
  });
  it("rejects effective ordering violations for conductivity", () => {
    const { error } = validateConductivityStressOverrides({ low_threshold_micro_siemens_per_cm: "600", low_clear_micro_siemens_per_cm: "500", high_clear_micro_siemens_per_cm: "", high_threshold_micro_siemens_per_cm: "" });
    expect(error).not.toBeNull();
  });
  it("rejects too-small conductivity hysteresis span", () => {
    const { error } = validateConductivityStressOverrides({ low_threshold_micro_siemens_per_cm: "350", low_clear_micro_siemens_per_cm: "355", high_clear_micro_siemens_per_cm: "", high_threshold_micro_siemens_per_cm: "" });
    expect(error).not.toBeNull();
  });
  it("rejects too-small stable band between conductivity clears", () => {
    const { error } = validateConductivityStressOverrides({ low_threshold_micro_siemens_per_cm: "350", low_clear_micro_siemens_per_cm: "500", high_clear_micro_siemens_per_cm: "540", high_threshold_micro_siemens_per_cm: "600" });
    expect(error).not.toBeNull();
  });
});

describe("conductivity stress threshold editor UI", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" })))); });
  afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows a conductivity Edit thresholds button next to the conductivity_stress row and only when configured", async () => {
    const entities = [stressEntity("conductivity_stress"), stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_conductivity_stress`]: stressState("conductivity_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withConductivityRole(), entities, states);
    const toggles = [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")];
    expect(toggles.length).toBe(2);
    const dds = [...el.shadowRoot!.querySelectorAll("dl.diagnostics dd")];
    const condDd = dds.find(dd => dd.previousElementSibling?.textContent?.includes("Conductivity stress"));
    expect(condDd?.querySelector("button.threshold-toggle")).not.toBeNull();
  });

  it("hides the conductivity toggle when conductivity_stress is not configured", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withConductivityRole(), entities, states);
    expect(el.shadowRoot!.querySelectorAll("button.threshold-toggle").length).toBe(1);
  });

  it("opens the conductivity sub-form seeded with blanks and four fields", async () => {
    const entities = [stressEntity("conductivity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_conductivity_stress`]: stressState("conductivity_stress", "off") };
    const { el } = await mountDetail(withConductivityRole(), entities, states);
    await click(el, "Edit thresholds");
    const form = el.shadowRoot!.querySelector("#conductivity_stress-editor");
    expect(form).not.toBeNull();
    const inputs = [...form!.querySelectorAll("input[type='number']")] as HTMLInputElement[];
    expect(inputs.length).toBe(4);
    for (const i of inputs) { expect(i.value).toBe(""); expect(i.max).toBe("10000"); }
  });

  it("seeds conductivity fields from persisted numeric overrides", async () => {
    const plant = withConductivityRole({ low_threshold_micro_siemens_per_cm: 400, low_clear_micro_siemens_per_cm: 550 });
    const entities = [stressEntity("conductivity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_conductivity_stress`]: stressState("conductivity_stress", "off") };
    const { el } = await mountDetail(plant, entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#conductivity_stress-editor input[type='number']")] as HTMLInputElement[];
    expect(inputs.some(i => i.value === "400")).toBe(true);
    expect(inputs.some(i => i.value === "550")).toBe(true);
  });

  it("rejects invalid conductivity input before issuing a WebSocket call", async () => {
    const entities = [stressEntity("conductivity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_conductivity_stress`]: stressState("conductivity_stress", "off") };
    const { el, calls } = await mountDetail(withConductivityRole(), entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#conductivity_stress-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "600"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "500"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const err = el.shadowRoot!.querySelector("#conductivity_stress-editor p.error");
    expect(err?.textContent).toContain("Effective thresholds");
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });

  it("sends role=conductivity and all four keys on successful conductivity save", async () => {
    const entities = [stressEntity("conductivity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_conductivity_stress`]: stressState("conductivity_stress", "off") };
    const plant = withConductivityRole();
    const updated = withConductivityRole({ low_threshold_micro_siemens_per_cm: 400, low_clear_micro_siemens_per_cm: 550 });
    const { el, calls } = await mountDetail(plant, entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#conductivity_stress-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "400"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "550"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const sent = calls.find(c => c.type === "smart_plants/roles/set_threshold_overrides") as Record<string, unknown> | undefined;
    expect(sent).toBeDefined();
    expect(sent?.role).toBe("conductivity");
    expect(sent?.plant_id).toBe(PLANT_ID);
    expect(sent?.values).toEqual({ low_threshold_micro_siemens_per_cm: 400, low_clear_micro_siemens_per_cm: 550, high_clear_micro_siemens_per_cm: null, high_threshold_micro_siemens_per_cm: null });
  });

  it("collapses the conductivity sub-form and announces success after save", async () => {
    const entities = [stressEntity("conductivity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_conductivity_stress`]: stressState("conductivity_stress", "off") };
    const updated = withConductivityRole({ low_threshold_micro_siemens_per_cm: 400, low_clear_micro_siemens_per_cm: 550 });
    const { el } = await mountDetail(withConductivityRole(), entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    await click(el, "Save thresholds");
    expect(el.shadowRoot!.querySelector("#conductivity_stress-editor")).toBeNull();
    const notice = [...el.shadowRoot!.querySelectorAll("p.notice")].find(n => n.textContent?.includes("Conductivity stress thresholds saved."));
    expect(notice).toBeDefined();
  });

  it("keeps the conductivity editor single-active alongside temperature and humidity", async () => {
    const entities = [stressEntity("temperature_stress"), stressEntity("humidity_stress"), stressEntity("conductivity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_conductivity_stress`]: stressState("conductivity_stress", "off") };
    const tempBase = withTemperatureRole();
    const humBase = withHumidityRole();
    const condBase = withConductivityRole();
    const plant: PlantRecord = { ...tempBase, roles: { ...tempBase.roles, ...humBase.roles, ...condBase.roles } as NonNullable<PlantRecord["roles"]> };
    const { el } = await mountDetail(plant, entities, states);
    const toggleFor = (label: string) => [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")].find(b => b.closest("dd")?.previousElementSibling?.textContent?.includes(label)) as HTMLButtonElement;
    toggleFor("Temperature stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).not.toBeNull();
    toggleFor("Conductivity stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#conductivity_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).toBeNull();
    toggleFor("Humidity stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#conductivity_stress-editor")).toBeNull();
  });
});

describe("co2-stress override helpers", () => {
  it("parses blank as inherit and numbers within range as integer half-up", () => {
    expect(parseCo2StressField("")).toBeNull();
    expect(parseCo2StressField("  ")).toBeNull();
    expect(parseCo2StressField("4500")).toBe(4500);
    expect(parseCo2StressField("4500.4")).toBe(4500);
    expect(parseCo2StressField("4500.5")).toBe(4501);
    expect(parseCo2StressField("4500.7")).toBe(4501);
  });
  it("rejects non-finite, non-numeric, and out-of-range values", () => {
    expect(parseCo2StressField("abc")).toBe("invalid");
    expect(parseCo2StressField("NaN")).toBe("invalid");
    expect(parseCo2StressField("-1")).toBe("invalid");
    expect(parseCo2StressField("10001")).toBe("invalid");
  });
  it("all-blank co2 overrides validate as all-null", () => {
    const { values, error } = validateCo2StressOverrides({ threshold_ppm: "", clear_ppm: "" });
    expect(error).toBeNull();
    for (const k of CO2_STRESS_KEYS) expect(values[k]).toBeNull();
  });
  it("rejects effective ordering violations for co2", () => {
    const { error } = validateCo2StressOverrides({ threshold_ppm: "3000", clear_ppm: "4000" });
    expect(error).not.toBeNull();
  });
  it("rejects too-small co2 hysteresis span", () => {
    const { error } = validateCo2StressOverrides({ threshold_ppm: "4050", clear_ppm: "4000" });
    expect(error).not.toBeNull();
  });
});

describe("co2 stress threshold editor UI", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" })))); });
  afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows a co2 Edit thresholds button next to the co2_stress row and only when configured", async () => {
    const entities = [stressEntity("co2_stress"), stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_co2_stress`]: stressState("co2_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withCo2Role(), entities, states);
    const toggles = [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")];
    expect(toggles.length).toBe(2);
    const dds = [...el.shadowRoot!.querySelectorAll("dl.diagnostics dd")];
    const co2Dd = dds.find(dd => dd.previousElementSibling?.textContent?.includes("CO2 stress"));
    expect(co2Dd?.querySelector("button.threshold-toggle")).not.toBeNull();
  });

  it("hides the co2 toggle when co2_stress is not configured", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withCo2Role(), entities, states);
    expect(el.shadowRoot!.querySelectorAll("button.threshold-toggle").length).toBe(1);
  });

  it("opens the co2 sub-form seeded with blanks and two fields with min/max/step", async () => {
    const entities = [stressEntity("co2_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_co2_stress`]: stressState("co2_stress", "off") };
    const { el } = await mountDetail(withCo2Role(), entities, states);
    await click(el, "Edit thresholds");
    const form = el.shadowRoot!.querySelector("#co2_stress-editor");
    expect(form).not.toBeNull();
    const inputs = [...form!.querySelectorAll("input[type='number']")] as HTMLInputElement[];
    expect(inputs.length).toBe(2);
    for (const i of inputs) { expect(i.value).toBe(""); expect(i.max).toBe("10000"); expect(i.min).toBe("0"); expect(i.step).toBe("1"); }
  });

  it("seeds co2 fields from persisted integer overrides", async () => {
    const plant = withCo2Role({ threshold_ppm: 3000, clear_ppm: 2500 });
    const entities = [stressEntity("co2_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_co2_stress`]: stressState("co2_stress", "off") };
    const { el } = await mountDetail(plant, entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#co2_stress-editor input[type='number']")] as HTMLInputElement[];
    expect(inputs.some(i => i.value === "3000")).toBe(true);
    expect(inputs.some(i => i.value === "2500")).toBe(true);
  });

  it("rejects invalid co2 input (ordering) before issuing a WebSocket call", async () => {
    const entities = [stressEntity("co2_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_co2_stress`]: stressState("co2_stress", "off") };
    const { el, calls } = await mountDetail(withCo2Role(), entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#co2_stress-editor input[type='number']")] as HTMLInputElement[];
    // threshold=3000, clear=4000 violates clear<threshold.
    inputs[0].value = "3000"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "4000"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const err = el.shadowRoot!.querySelector("#co2_stress-editor p.error");
    expect(err?.textContent).toContain("Effective thresholds");
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });

  it("rejects out-of-range co2 input before issuing a WebSocket call", async () => {
    const entities = [stressEntity("co2_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_co2_stress`]: stressState("co2_stress", "off") };
    const { el, calls } = await mountDetail(withCo2Role(), entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#co2_stress-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "20000"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const err = el.shadowRoot!.querySelector("#co2_stress-editor p.error");
    expect(err?.textContent).toContain("Effective thresholds");
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });

  it("sends role=co2 and both ppm keys on successful co2 save", async () => {
    const entities = [stressEntity("co2_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_co2_stress`]: stressState("co2_stress", "off") };
    const plant = withCo2Role();
    const updated = withCo2Role({ threshold_ppm: 3000, clear_ppm: 2500 });
    const { el, calls } = await mountDetail(plant, entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#co2_stress-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "3000"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "2500"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const sent = calls.find(c => c.type === "smart_plants/roles/set_threshold_overrides") as Record<string, unknown> | undefined;
    expect(sent).toBeDefined();
    expect(sent?.role).toBe("co2");
    expect(sent?.plant_id).toBe(PLANT_ID);
    expect(sent?.expected_revision).toBe(1);
    expect(sent?.values).toEqual({ threshold_ppm: 3000, clear_ppm: 2500 });
  });

  it("collapses the co2 sub-form and announces success after save", async () => {
    const entities = [stressEntity("co2_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_co2_stress`]: stressState("co2_stress", "off") };
    const updated = withCo2Role({ threshold_ppm: 3000, clear_ppm: 2500 });
    const { el } = await mountDetail(withCo2Role(), entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    await click(el, "Save thresholds");
    expect(el.shadowRoot!.querySelector("#co2_stress-editor")).toBeNull();
    const notice = [...el.shadowRoot!.querySelectorAll("p.notice")].find(n => n.textContent?.includes("CO2 stress thresholds saved."));
    expect(notice).toBeDefined();
  });

  it("keeps the co2 editor single-active alongside temperature, humidity, and conductivity", async () => {
    const entities = [stressEntity("temperature_stress"), stressEntity("humidity_stress"), stressEntity("conductivity_stress"), stressEntity("co2_stress")];
    const states = {
      [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off"),
      [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off"),
      [`binary_sensor.smart_plants_${PLANT_ID}_conductivity_stress`]: stressState("conductivity_stress", "off"),
      [`binary_sensor.smart_plants_${PLANT_ID}_co2_stress`]: stressState("co2_stress", "off"),
    };
    const tempBase = withTemperatureRole();
    const humBase = withHumidityRole();
    const condBase = withConductivityRole();
    const co2Base = withCo2Role();
    const plant: PlantRecord = { ...tempBase, roles: { ...tempBase.roles, ...humBase.roles, ...condBase.roles, ...co2Base.roles } as NonNullable<PlantRecord["roles"]> };
    const { el } = await mountDetail(plant, entities, states);
    const toggleFor = (label: string) => [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")].find(b => b.closest("dd")?.previousElementSibling?.textContent?.includes(label)) as HTMLButtonElement;
    toggleFor("Temperature stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).not.toBeNull();
    toggleFor("CO2 stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#co2_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).toBeNull();
    toggleFor("Humidity stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#co2_stress-editor")).toBeNull();
    toggleFor("Conductivity stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#conductivity_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).toBeNull();
  });
});

describe("soil-temperature-stress override helpers", () => {
  it("parses blank as inherit and numbers within range as one-decimal", () => {
    expect(parseSoilTemperatureStressField("")).toBeNull();
    expect(parseSoilTemperatureStressField("  ")).toBeNull();
    expect(parseSoilTemperatureStressField("10")).toBe(10);
    expect(parseSoilTemperatureStressField("10.05")).toBe(10.1);
  });
  it("rejects non-finite and out-of-range values", () => {
    expect(parseSoilTemperatureStressField("abc")).toBe("invalid");
    expect(parseSoilTemperatureStressField("NaN")).toBe("invalid");
    expect(parseSoilTemperatureStressField("-20.1")).toBe("invalid");
    expect(parseSoilTemperatureStressField("60.1")).toBe("invalid");
  });
  it("all-blank soil temperature overrides validate as all-null", () => {
    const { values, error } = validateSoilTemperatureStressOverrides({ cold_threshold_celsius: "", cold_clear_celsius: "", hot_clear_celsius: "", hot_threshold_celsius: "" });
    expect(error).toBeNull();
    for (const k of SOIL_TEMPERATURE_STRESS_KEYS) expect(values[k]).toBeNull();
  });
  it("rejects effective ordering violations for soil temperature", () => {
    const { error } = validateSoilTemperatureStressOverrides({ cold_threshold_celsius: "20", cold_clear_celsius: "18", hot_clear_celsius: "", hot_threshold_celsius: "" });
    expect(error).not.toBeNull();
  });
  it("rejects too-small soil temperature hysteresis span", () => {
    const { error } = validateSoilTemperatureStressOverrides({ cold_threshold_celsius: "10", cold_clear_celsius: "10.2", hot_clear_celsius: "", hot_threshold_celsius: "" });
    expect(error).not.toBeNull();
  });
  it("rejects too-small stable band between soil temperature clears", () => {
    const { error } = validateSoilTemperatureStressOverrides({ cold_threshold_celsius: "10", cold_clear_celsius: "11", hot_clear_celsius: "11.5", hot_threshold_celsius: "12" });
    expect(error).not.toBeNull();
  });
});

describe("soil temperature stress threshold editor UI", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" })))); });
  afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows a soil temperature Edit thresholds button next to the soil_temperature_stress row and only when configured", async () => {
    const entities = [stressEntity("soil_temperature_stress"), stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_soil_temperature_stress`]: stressState("soil_temperature_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withSoilTemperatureRole(), entities, states);
    const toggles = [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")];
    expect(toggles.length).toBe(2);
    const dds = [...el.shadowRoot!.querySelectorAll("dl.diagnostics dd")];
    const soilDd = dds.find(dd => dd.previousElementSibling?.textContent?.includes("Soil temperature stress"));
    expect(soilDd?.querySelector("button.threshold-toggle")).not.toBeNull();
  });

  it("hides the soil temperature toggle when soil_temperature_stress is not configured", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withSoilTemperatureRole(), entities, states);
    expect(el.shadowRoot!.querySelectorAll("button.threshold-toggle").length).toBe(1);
  });

  it("opens the soil temperature sub-form seeded with blanks and four fields with min=-20/max=60/step=0.1", async () => {
    const entities = [stressEntity("soil_temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_soil_temperature_stress`]: stressState("soil_temperature_stress", "off") };
    const { el } = await mountDetail(withSoilTemperatureRole(), entities, states);
    await click(el, "Edit thresholds");
    const form = el.shadowRoot!.querySelector("#soil_temperature_stress-editor");
    expect(form).not.toBeNull();
    const inputs = [...form!.querySelectorAll("input[type='number']")] as HTMLInputElement[];
    expect(inputs.length).toBe(4);
    for (const i of inputs) { expect(i.value).toBe(""); expect(i.min).toBe("-20"); expect(i.max).toBe("60"); expect(i.step).toBe("0.1"); }
  });

  it("seeds soil temperature fields from persisted numeric overrides", async () => {
    const plant = withSoilTemperatureRole({ cold_threshold_celsius: 8, cold_clear_celsius: 11 });
    const entities = [stressEntity("soil_temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_soil_temperature_stress`]: stressState("soil_temperature_stress", "off") };
    const { el } = await mountDetail(plant, entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#soil_temperature_stress-editor input[type='number']")] as HTMLInputElement[];
    expect(inputs.some(i => i.value === "8")).toBe(true);
    expect(inputs.some(i => i.value === "11")).toBe(true);
  });

  it("rejects invalid soil temperature input before issuing a WebSocket call", async () => {
    const entities = [stressEntity("soil_temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_soil_temperature_stress`]: stressState("soil_temperature_stress", "off") };
    const { el, calls } = await mountDetail(withSoilTemperatureRole(), entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#soil_temperature_stress-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "20"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "18"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const err = el.shadowRoot!.querySelector("#soil_temperature_stress-editor p.error");
    expect(err?.textContent).toContain("Effective thresholds");
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });

  it("sends role=soil_temperature and all four °C keys on successful soil temperature save", async () => {
    const entities = [stressEntity("soil_temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_soil_temperature_stress`]: stressState("soil_temperature_stress", "off") };
    const plant = withSoilTemperatureRole();
    const updated = withSoilTemperatureRole({ cold_threshold_celsius: 8, cold_clear_celsius: 11 });
    const { el, calls } = await mountDetail(plant, entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#soil_temperature_stress-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "8"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "11"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const sent = calls.find(c => c.type === "smart_plants/roles/set_threshold_overrides") as Record<string, unknown> | undefined;
    expect(sent).toBeDefined();
    expect(sent?.role).toBe("soil_temperature");
    expect(sent?.plant_id).toBe(PLANT_ID);
    expect(sent?.expected_revision).toBe(1);
    expect(sent?.values).toEqual({ cold_threshold_celsius: 8, cold_clear_celsius: 11, hot_clear_celsius: null, hot_threshold_celsius: null });
  });

  it("collapses the soil temperature sub-form and announces success after save", async () => {
    const entities = [stressEntity("soil_temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_soil_temperature_stress`]: stressState("soil_temperature_stress", "off") };
    const updated = withSoilTemperatureRole({ cold_threshold_celsius: 8, cold_clear_celsius: 11 });
    const { el } = await mountDetail(withSoilTemperatureRole(), entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    await click(el, "Save thresholds");
    expect(el.shadowRoot!.querySelector("#soil_temperature_stress-editor")).toBeNull();
    const notice = [...el.shadowRoot!.querySelectorAll("p.notice")].find(n => n.textContent?.includes("Soil temperature stress thresholds saved."));
    expect(notice).toBeDefined();
  });

  it("keeps the soil temperature editor single-active alongside the four other editors", async () => {
    const roles = ["temperature_stress", "humidity_stress", "conductivity_stress", "co2_stress", "soil_temperature_stress"] as const;
    const entities = roles.map(r => stressEntity(r));
    const states = Object.fromEntries(roles.map(r => [`binary_sensor.smart_plants_${PLANT_ID}_${r}`, stressState(r, "off")]));
    const tempBase = withTemperatureRole();
    const plant: PlantRecord = { ...tempBase, roles: { ...tempBase.roles, ...withHumidityRole().roles, ...withConductivityRole().roles, ...withCo2Role().roles, ...withSoilTemperatureRole().roles } as NonNullable<PlantRecord["roles"]> };
    const { el } = await mountDetail(plant, entities, states);
    const toggleFor = (label: string) => [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")].find(b => b.closest("dd")?.previousElementSibling?.textContent?.includes(label)) as HTMLButtonElement;
    toggleFor("Temperature stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).not.toBeNull();
    toggleFor("Soil temperature stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#soil_temperature_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).toBeNull();
    toggleFor("Humidity stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#soil_temperature_stress-editor")).toBeNull();
    toggleFor("Conductivity stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#conductivity_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).toBeNull();
    toggleFor("CO2 stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#co2_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#conductivity_stress-editor")).toBeNull();
  });
});

describe("low-battery override helpers", () => {
  it("parses blank as inherit and numbers within range as integer half-up", () => {
    expect(parseLowBatteryField("")).toBeNull();
    expect(parseLowBatteryField("  ")).toBeNull();
    expect(parseLowBatteryField("20")).toBe(20);
    expect(parseLowBatteryField("20.4")).toBe(20);
    expect(parseLowBatteryField("20.5")).toBe(21);
    expect(parseLowBatteryField("20.7")).toBe(21);
  });
  it("rejects non-finite, non-numeric, and out-of-range values", () => {
    expect(parseLowBatteryField("abc")).toBe("invalid");
    expect(parseLowBatteryField("NaN")).toBe("invalid");
    expect(parseLowBatteryField("-1")).toBe("invalid");
    expect(parseLowBatteryField("101")).toBe("invalid");
  });
  it("all-blank low-battery overrides validate as all-null", () => {
    const { values, error } = validateLowBatteryOverrides({ threshold_percent: "", clear_percent: "" });
    expect(error).toBeNull();
    for (const k of LOW_BATTERY_STRESS_KEYS) expect(values[k]).toBeNull();
  });
  it("rejects effective ordering violations for low battery", () => {
    // threshold >= clear violates threshold < clear.
    const { error } = validateLowBatteryOverrides({ threshold_percent: "30", clear_percent: "25" });
    expect(error).not.toBeNull();
  });
  it("rejects too-small low-battery hysteresis span", () => {
    // clear - threshold == 0 fails the >= 1 % hysteresis rule.
    const { error } = validateLowBatteryOverrides({ threshold_percent: "20", clear_percent: "20" });
    expect(error).not.toBeNull();
  });
});

describe("low battery threshold editor UI", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" })))); });
  afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows a low battery Edit thresholds button next to the low_battery row and only when configured", async () => {
    const entities = [stressEntity("low_battery"), stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_battery`]: stressState("low_battery", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withBatteryRole(), entities, states);
    const toggles = [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")];
    expect(toggles.length).toBe(2);
    const dds = [...el.shadowRoot!.querySelectorAll("dl.diagnostics dd")];
    const batDd = dds.find(dd => dd.previousElementSibling?.textContent?.includes("Low battery"));
    expect(batDd?.querySelector("button.threshold-toggle")).not.toBeNull();
  });

  it("hides the low battery toggle when low_battery is not configured", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withBatteryRole(), entities, states);
    expect(el.shadowRoot!.querySelectorAll("button.threshold-toggle").length).toBe(1);
  });

  it("opens the low battery sub-form seeded with blanks and two fields with min/max/step", async () => {
    const entities = [stressEntity("low_battery")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_battery`]: stressState("low_battery", "off") };
    const { el } = await mountDetail(withBatteryRole(), entities, states);
    await click(el, "Edit thresholds");
    const form = el.shadowRoot!.querySelector("#low_battery-editor");
    expect(form).not.toBeNull();
    const inputs = [...form!.querySelectorAll("input[type='number']")] as HTMLInputElement[];
    expect(inputs.length).toBe(2);
    for (const i of inputs) { expect(i.value).toBe(""); expect(i.min).toBe("0"); expect(i.max).toBe("100"); expect(i.step).toBe("1"); }
  });

  it("seeds low battery fields from persisted integer overrides", async () => {
    const plant = withBatteryRole({ threshold_percent: 15, clear_percent: 30 });
    const entities = [stressEntity("low_battery")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_battery`]: stressState("low_battery", "off") };
    const { el } = await mountDetail(plant, entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#low_battery-editor input[type='number']")] as HTMLInputElement[];
    expect(inputs.some(i => i.value === "15")).toBe(true);
    expect(inputs.some(i => i.value === "30")).toBe(true);
  });

  it("rejects invalid low battery input (ordering) before issuing a WebSocket call", async () => {
    const entities = [stressEntity("low_battery")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_battery`]: stressState("low_battery", "off") };
    const { el, calls } = await mountDetail(withBatteryRole(), entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#low_battery-editor input[type='number']")] as HTMLInputElement[];
    // threshold=30, clear=25 violates threshold<clear.
    inputs[0].value = "30"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "25"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const err = el.shadowRoot!.querySelector("#low_battery-editor p.error");
    expect(err?.textContent).toContain("Effective thresholds");
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });

  it("rejects out-of-range low battery input before issuing a WebSocket call", async () => {
    const entities = [stressEntity("low_battery")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_battery`]: stressState("low_battery", "off") };
    const { el, calls } = await mountDetail(withBatteryRole(), entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#low_battery-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "150"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const err = el.shadowRoot!.querySelector("#low_battery-editor p.error");
    expect(err?.textContent).toContain("Effective thresholds");
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });

  it("sends role=battery and both % keys on successful low battery save", async () => {
    const entities = [stressEntity("low_battery")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_battery`]: stressState("low_battery", "off") };
    const plant = withBatteryRole();
    const updated = withBatteryRole({ threshold_percent: 15, clear_percent: 30 });
    const { el, calls } = await mountDetail(plant, entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#low_battery-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "15"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "30"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const sent = calls.find(c => c.type === "smart_plants/roles/set_threshold_overrides") as Record<string, unknown> | undefined;
    expect(sent).toBeDefined();
    expect(sent?.role).toBe("battery");
    expect(sent?.plant_id).toBe(PLANT_ID);
    expect(sent?.expected_revision).toBe(1);
    expect(sent?.values).toEqual({ threshold_percent: 15, clear_percent: 30 });
  });

  it("collapses the low battery sub-form and announces success after save", async () => {
    const entities = [stressEntity("low_battery")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_battery`]: stressState("low_battery", "off") };
    const updated = withBatteryRole({ threshold_percent: 15, clear_percent: 30 });
    const { el } = await mountDetail(withBatteryRole(), entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    await click(el, "Save thresholds");
    expect(el.shadowRoot!.querySelector("#low_battery-editor")).toBeNull();
    const notice = [...el.shadowRoot!.querySelectorAll("p.notice")].find(n => n.textContent?.includes("Low battery thresholds saved."));
    expect(notice).toBeDefined();
  });

  it("keeps the low battery editor single-active alongside every other editor", async () => {
    const roles = ["temperature_stress", "humidity_stress", "conductivity_stress", "co2_stress", "soil_temperature_stress", "low_battery", "low_light"] as const;
    const entities = roles.map(r => stressEntity(r));
    const states = Object.fromEntries(roles.map(r => [`binary_sensor.smart_plants_${PLANT_ID}_${r}`, stressState(r, "off")]));
    const tempBase = withTemperatureRole();
    const plant: PlantRecord = { ...tempBase, roles: { ...tempBase.roles, ...withHumidityRole().roles, ...withConductivityRole().roles, ...withCo2Role().roles, ...withSoilTemperatureRole().roles, ...withBatteryRole().roles, ...withIlluminanceRole().roles } as NonNullable<PlantRecord["roles"]> };
    const { el } = await mountDetail(plant, entities, states);
    const toggleFor = (label: string) => [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")].find(b => b.closest("dd")?.previousElementSibling?.textContent?.includes(label)) as HTMLButtonElement;
    toggleFor("Temperature stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).not.toBeNull();
    toggleFor("Low battery").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#low_battery-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).toBeNull();
    toggleFor("CO2 stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#co2_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#low_battery-editor")).toBeNull();
    toggleFor("Soil temperature stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#soil_temperature_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#co2_stress-editor")).toBeNull();
    toggleFor("Humidity stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#soil_temperature_stress-editor")).toBeNull();
    toggleFor("Conductivity stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#conductivity_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).toBeNull();
  });
});

describe("low-light override helpers", () => {
  it("parses blank as inherit and numbers within range as one-decimal", () => {
    expect(parseLowLightField("")).toBeNull();
    expect(parseLowLightField("  ")).toBeNull();
    expect(parseLowLightField("500")).toBe(500);
    expect(parseLowLightField("500.05")).toBe(500.1);
  });
  it("rejects non-finite, non-numeric, and out-of-range values", () => {
    expect(parseLowLightField("abc")).toBe("invalid");
    expect(parseLowLightField("NaN")).toBe("invalid");
    expect(parseLowLightField("-0.1")).toBe("invalid");
    expect(parseLowLightField("200000.1")).toBe("invalid");
  });
  it("all-blank low-light overrides validate as all-null", () => {
    const { values, error } = validateLowLightOverrides({ target_lux: "", clear_lux: "" });
    expect(error).toBeNull();
    for (const k of LOW_LIGHT_STRESS_KEYS) expect(values[k]).toBeNull();
  });
  it("rejects effective ordering violations for low light", () => {
    // target >= clear violates target < clear.
    const { error } = validateLowLightOverrides({ target_lux: "800", clear_lux: "700" });
    expect(error).not.toBeNull();
  });
  it("rejects too-small low-light hysteresis span", () => {
    // clear - target == 5 fails the >= 10 lx hysteresis rule.
    const { error } = validateLowLightOverrides({ target_lux: "500", clear_lux: "505" });
    expect(error).not.toBeNull();
  });
});

describe("low light threshold editor UI", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" })))); });
  afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows a low light Edit thresholds button next to the low_light row and only when configured", async () => {
    const entities = [stressEntity("low_light"), stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_light`]: stressState("low_light", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withIlluminanceRole(), entities, states);
    const toggles = [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")];
    expect(toggles.length).toBe(2);
    const dds = [...el.shadowRoot!.querySelectorAll("dl.diagnostics dd")];
    const lightDd = dds.find(dd => dd.previousElementSibling?.textContent?.includes("Low light"));
    expect(lightDd?.querySelector("button.threshold-toggle")).not.toBeNull();
  });

  it("hides the low light toggle when low_light is not configured", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const { el } = await mountDetail(withIlluminanceRole(), entities, states);
    expect(el.shadowRoot!.querySelectorAll("button.threshold-toggle").length).toBe(1);
  });

  it("opens the low light sub-form seeded with blanks and two fields with min/max/step", async () => {
    const entities = [stressEntity("low_light")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_light`]: stressState("low_light", "off") };
    const { el } = await mountDetail(withIlluminanceRole(), entities, states);
    await click(el, "Edit thresholds");
    const form = el.shadowRoot!.querySelector("#low_light-editor");
    expect(form).not.toBeNull();
    const inputs = [...form!.querySelectorAll("input[type='number']")] as HTMLInputElement[];
    expect(inputs.length).toBe(2);
    for (const i of inputs) { expect(i.value).toBe(""); expect(i.min).toBe("0"); expect(i.max).toBe("200000"); expect(i.step).toBe("0.1"); }
  });

  it("seeds low light fields from persisted numeric overrides", async () => {
    const plant = withIlluminanceRole({ target_lux: 600, clear_lux: 900 });
    const entities = [stressEntity("low_light")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_light`]: stressState("low_light", "off") };
    const { el } = await mountDetail(plant, entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#low_light-editor input[type='number']")] as HTMLInputElement[];
    expect(inputs.some(i => i.value === "600")).toBe(true);
    expect(inputs.some(i => i.value === "900")).toBe(true);
  });

  it("rejects invalid low light input (ordering) before issuing a WebSocket call", async () => {
    const entities = [stressEntity("low_light")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_light`]: stressState("low_light", "off") };
    const { el, calls } = await mountDetail(withIlluminanceRole(), entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#low_light-editor input[type='number']")] as HTMLInputElement[];
    // target=800, clear=700 violates target<clear.
    inputs[0].value = "800"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "700"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const err = el.shadowRoot!.querySelector("#low_light-editor p.error");
    expect(err?.textContent).toContain("Effective thresholds");
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });

  it("rejects out-of-range low light input before issuing a WebSocket call", async () => {
    const entities = [stressEntity("low_light")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_light`]: stressState("low_light", "off") };
    const { el, calls } = await mountDetail(withIlluminanceRole(), entities, states);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#low_light-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "-1"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const err = el.shadowRoot!.querySelector("#low_light-editor p.error");
    expect(err?.textContent).toContain("Effective thresholds");
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });

  it("sends role=illuminance and both lux keys on successful low light save", async () => {
    const entities = [stressEntity("low_light")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_light`]: stressState("low_light", "off") };
    const plant = withIlluminanceRole();
    const updated = withIlluminanceRole({ target_lux: 600, clear_lux: 900 });
    const { el, calls } = await mountDetail(plant, entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    const inputs = [...el.shadowRoot!.querySelectorAll("#low_light-editor input[type='number']")] as HTMLInputElement[];
    inputs[0].value = "600"; inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "900"; inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    await click(el, "Save thresholds");
    const sent = calls.find(c => c.type === "smart_plants/roles/set_threshold_overrides") as Record<string, unknown> | undefined;
    expect(sent).toBeDefined();
    expect(sent?.role).toBe("illuminance");
    expect(sent?.plant_id).toBe(PLANT_ID);
    expect(sent?.expected_revision).toBe(1);
    expect(sent?.values).toEqual({ target_lux: 600, clear_lux: 900 });
  });

  it("collapses the low light sub-form and announces success after save", async () => {
    const entities = [stressEntity("low_light")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_low_light`]: stressState("low_light", "off") };
    const updated = withIlluminanceRole({ target_lux: 600, clear_lux: 900 });
    const { el } = await mountDetail(withIlluminanceRole(), entities, states, msg => msg.type === "smart_plants/roles/set_threshold_overrides" ? { plant: { ...updated, revision: 2 } } : undefined);
    await click(el, "Edit thresholds");
    await click(el, "Save thresholds");
    expect(el.shadowRoot!.querySelector("#low_light-editor")).toBeNull();
    const notice = [...el.shadowRoot!.querySelectorAll("p.notice")].find(n => n.textContent?.includes("Low light thresholds saved."));
    expect(notice).toBeDefined();
  });

  it("keeps the low light editor single-active alongside all six other editors", async () => {
    const roles = ["temperature_stress", "humidity_stress", "conductivity_stress", "co2_stress", "soil_temperature_stress", "low_battery", "low_light"] as const;
    const entities = roles.map(r => stressEntity(r));
    const states = Object.fromEntries(roles.map(r => [`binary_sensor.smart_plants_${PLANT_ID}_${r}`, stressState(r, "off")]));
    const tempBase = withTemperatureRole();
    const plant: PlantRecord = { ...tempBase, roles: { ...tempBase.roles, ...withHumidityRole().roles, ...withConductivityRole().roles, ...withCo2Role().roles, ...withSoilTemperatureRole().roles, ...withBatteryRole().roles, ...withIlluminanceRole().roles } as NonNullable<PlantRecord["roles"]> };
    const { el } = await mountDetail(plant, entities, states);
    const toggleFor = (label: string) => [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")].find(b => b.closest("dd")?.previousElementSibling?.textContent?.includes(label)) as HTMLButtonElement;
    toggleFor("Temperature stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).not.toBeNull();
    toggleFor("Low light").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#low_light-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).toBeNull();
    toggleFor("Low battery").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#low_battery-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#low_light-editor")).toBeNull();
  });
});

describe("cross-editor unsaved-changes hardening", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" })))); });
  afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("prompts the user before discarding unsaved changes when switching editors", async () => {
    const entities = [stressEntity("temperature_stress"), stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const tempBase = withTemperatureRole();
    const plant: PlantRecord = { ...tempBase, roles: { ...tempBase.roles, ...withHumidityRole().roles } as NonNullable<PlantRecord["roles"]> };
    const { el } = await mountDetail(plant, entities, states);
    const toggleFor = (label: string) => [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")].find(b => b.closest("dd")?.previousElementSibling?.textContent?.includes(label)) as HTMLButtonElement;
    // Open temperature editor, type in a field to create unsaved changes.
    toggleFor("Temperature stress").click(); await settle(el);
    const input = el.shadowRoot!.querySelector("#temperature_stress-editor input[type='number']") as HTMLInputElement;
    input.value = "5"; input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    // Try to open humidity editor. This should NOT switch — instead show the alert.
    toggleFor("Humidity stress").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).toBeNull();
    const alert = el.shadowRoot!.querySelector("p.threshold-switch-alert[role='alert']");
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain("Unsaved changes");
  });

  it("Keep editing dismisses the alert and preserves the current editor", async () => {
    const entities = [stressEntity("temperature_stress"), stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const tempBase = withTemperatureRole();
    const plant: PlantRecord = { ...tempBase, roles: { ...tempBase.roles, ...withHumidityRole().roles } as NonNullable<PlantRecord["roles"]> };
    const { el } = await mountDetail(plant, entities, states);
    const toggleFor = (label: string) => [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")].find(b => b.closest("dd")?.previousElementSibling?.textContent?.includes(label)) as HTMLButtonElement;
    toggleFor("Temperature stress").click(); await settle(el);
    const input = el.shadowRoot!.querySelector("#temperature_stress-editor input[type='number']") as HTMLInputElement;
    input.value = "5"; input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    toggleFor("Humidity stress").click(); await settle(el);
    await click(el, "Keep editing");
    expect(el.shadowRoot!.querySelector("p.threshold-switch-alert")).toBeNull();
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).toBeNull();
    // Local edit is preserved.
    const preservedInput = el.shadowRoot!.querySelector("#temperature_stress-editor input[type='number']") as HTMLInputElement;
    expect(preservedInput.value).toBe("5");
  });

  it("Discard and switch opens the pending editor and discards prior edits", async () => {
    const entities = [stressEntity("temperature_stress"), stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const tempBase = withTemperatureRole();
    const plant: PlantRecord = { ...tempBase, roles: { ...tempBase.roles, ...withHumidityRole().roles } as NonNullable<PlantRecord["roles"]> };
    const { el } = await mountDetail(plant, entities, states);
    const toggleFor = (label: string) => [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")].find(b => b.closest("dd")?.previousElementSibling?.textContent?.includes(label)) as HTMLButtonElement;
    toggleFor("Temperature stress").click(); await settle(el);
    const input = el.shadowRoot!.querySelector("#temperature_stress-editor input[type='number']") as HTMLInputElement;
    input.value = "5"; input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    toggleFor("Humidity stress").click(); await settle(el);
    await click(el, "Discard and switch");
    expect(el.shadowRoot!.querySelector("p.threshold-switch-alert")).toBeNull();
    expect(el.shadowRoot!.querySelector("#humidity_stress-editor")).not.toBeNull();
    expect(el.shadowRoot!.querySelector("#temperature_stress-editor")).toBeNull();
  });

  it("does not save automatically when switching with unsaved changes", async () => {
    const entities = [stressEntity("temperature_stress"), stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const tempBase = withTemperatureRole();
    const plant: PlantRecord = { ...tempBase, roles: { ...tempBase.roles, ...withHumidityRole().roles } as NonNullable<PlantRecord["roles"]> };
    const { el, calls } = await mountDetail(plant, entities, states);
    const toggleFor = (label: string) => [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")].find(b => b.closest("dd")?.previousElementSibling?.textContent?.includes(label)) as HTMLButtonElement;
    toggleFor("Temperature stress").click(); await settle(el);
    const input = el.shadowRoot!.querySelector("#temperature_stress-editor input[type='number']") as HTMLInputElement;
    input.value = "5"; input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    toggleFor("Humidity stress").click(); await settle(el);
    await click(el, "Discard and switch");
    expect(calls.some(c => c.type === "smart_plants/roles/set_threshold_overrides")).toBe(false);
  });
});

describe("Threshold editor localization", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" })))); });
  afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("falls back to English toggle/switch copy when no localize is supplied", async () => {
    const entities = [stressEntity("temperature_stress"), stressEntity("humidity_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off"), [`binary_sensor.smart_plants_${PLANT_ID}_humidity_stress`]: stressState("humidity_stress", "off") };
    const tempBase = withTemperatureRole();
    const plant: PlantRecord = { ...tempBase, roles: { ...tempBase.roles, ...withHumidityRole().roles } as NonNullable<PlantRecord["roles"]> };
    const { el } = await mountDetail(plant, entities, states);
    const toggles = [...el.shadowRoot!.querySelectorAll("button.threshold-toggle")] as HTMLButtonElement[];
    expect(toggles.length).toBeGreaterThan(0);
    for (const t of toggles) expect(t.textContent?.trim()).toBe("Edit thresholds");
    toggles[0].click(); await settle(el);
    toggles[1].click(); await settle(el);
    const alert = el.shadowRoot!.querySelector("p.threshold-switch-alert");
    // Baseline == baseline (both blank) so no unsaved change is present; still
    // confirm the switching UX renders the accepted English toggle copy.
    expect(alert).toBeNull();
  });

  it("uses English copy when the Home Assistant language has no panel catalog", async () => {
    const entities = [stressEntity("temperature_stress")];
    const states = { [`binary_sensor.smart_plants_${PLANT_ID}_temperature_stress`]: stressState("temperature_stress", "off") };
    const h = harness([withTemperatureRole()], msg => {
      if (msg.type === "config/entity_registry/list") return entities;
      if (msg.type === "get_states") return Object.values(states);
      return undefined;
    });
    h.hass.language = "xx";
    const el = new SmartPlantsPanel();
    el.hass = h.hass;
    document.body.append(el);
    await settle(el);
    await click(el, "Aloe");
    await click(el, "Diagnostics");
    const toggle = el.shadowRoot!.querySelector("button.threshold-toggle") as HTMLButtonElement;
    expect(toggle.textContent?.trim()).toBe("Edit thresholds");
  });
});
