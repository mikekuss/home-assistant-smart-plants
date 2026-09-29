import { afterEach, describe, expect, it } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import type { HAEntity, HAState, PlantRecord, RoleSourceConfig } from "./types.js";
import { roleSourceConfig, ROLE_SOURCE_SPECS } from "./model.js";
import { backendRoleDefaults, click, harness, newPlantView, sample, settle } from "./test-helpers.js";

function emptyRole(): RoleSourceConfig {
  return { sources: [], primary_entity_id: null, aggregation: "primary", stale_after_seconds: 21600 };
}

// A plant whose seven non-moisture roles all carry a valid (empty) source config.
function withRoles(over: Record<string, RoleSourceConfig> = {}): PlantRecord {
  const clone = structuredClone(sample);
  const roles: Record<string, RoleSourceConfig> = {};
  for (const role of ["temperature", "humidity", "illuminance", "battery", "conductivity", "soil_temperature", "co2"]) roles[role] = emptyRole();
  return { ...clone, roles: { ...clone.roles, ...roles, ...over } as NonNullable<PlantRecord["roles"]> };
}

function tempEntity(): HAEntity {
  return { id: "reg-temp", entity_id: "sensor.living_temp", device_id: "device-x", unique_id: "living_temp", platform: "mqtt" };
}
function tempState(): HAState {
  return { entity_id: "sensor.living_temp", state: "21.5", attributes: { device_class: "temperature", unit_of_measurement: "°C", friendly_name: "Living temp" }, last_updated: "2026-09-18T00:00:00Z" };
}
function moistureState(): HAState {
  return { entity_id: "sensor.soil_moist", state: "40", attributes: { device_class: "moisture", unit_of_measurement: "%", friendly_name: "Soil moist" }, last_updated: "2026-09-18T00:00:00Z" };
}

async function mountDetail(plant: PlantRecord, entities: HAEntity[], states: HAState[], extra?: (msg: Record<string, unknown>) => unknown) {
  const h = harness([plant], msg => {
    if (extra) { const r = extra(msg); if (r !== undefined) return r; }
    if (msg.type === "config/entity_registry/list") return entities;
    if (msg.type === "get_states") return states;
    return undefined;
  });
  const el = new SmartPlantsPanel();
  el.hass = h.hass;
  document.body.append(el);
  await settle(el);
  await click(el, plant.name);
  await click(el, "Sensors");
  return { el, calls: h.calls };
}

// The Sensors tab panel.
function sensorsSection(el: SmartPlantsPanel): HTMLElement {
  return el.shadowRoot!.querySelector("#detail-panel")! as HTMLElement;
}
// Row of a reading in "Several sensors for one reading".
function row(el: SmartPlantsPanel, label: string): HTMLElement {
  return [...sensorsSection(el).querySelectorAll("dl.sensors dt")].find(d => d.textContent === label)!.nextElementSibling! as HTMLElement;
}
async function openCombine(el: SmartPlantsPanel, label: string) {
  (row(el, label).querySelector("button.source-toggle") as HTMLButtonElement).click(); await settle(el);
}
// "Add sensor" menu: opens the sensor list of a reading without sensors.
async function addSensor(el: SmartPlantsPanel, role: string) {
  sensorsSection(el).querySelector("ha-dropdown.add-sensor")!.dispatchEvent(new CustomEvent("wa-select", { bubbles: true, composed: true, detail: { item: { value: role } } })); await settle(el);
}
async function setTemperatureStale(el: SmartPlantsPanel, seconds: string) {
  const input = sensorsSection(el).querySelector<HTMLInputElement>('#temperature-sources-editor input[type="number"]')!;
  input.value = seconds; input.dispatchEvent(new Event("input", { bubbles: true })); await settle(el);
}

afterEach(() => { document.body.querySelectorAll("smart-plants-panel").forEach(e => e.remove()); });

describe("Sensors section", () => {
  it("renders a row per role with an empty-source summary", async () => {
    const { el } = await mountDetail(withRoles(), [], []);
    const section = sensorsSection(el);
    const dts = [...section.querySelectorAll("dl.sensors dt")].map(d => d.textContent);
    expect(dts).toEqual(["Soil moisture", "Temperature", "Humidity", "Light", "Battery", "Fertilizer level", "Soil temperature", "CO₂"]);
    expect(row(el, "Temperature").textContent).toContain("No sensors");
    expect(section.textContent).toContain("No sensors yet.");
    expect(section.querySelector("ha-dropdown.add-sensor")!.textContent).toContain("Fertilizer level");
  });

  it("shows role-unavailable message when a role config is malformed", async () => {
    const clone = structuredClone(sample);
    // temperature is present but malformed (bad aggregation) → roleSourceConfig null
    const plant = { ...clone, roles: { ...clone.roles, temperature: { sources: [], primary_entity_id: null, aggregation: "median", stale_after_seconds: 21600 } } as NonNullable<PlantRecord["roles"]> };
    const { el } = await mountDetail(plant, [], []);
    expect(row(el, "Temperature").textContent).toContain("Sensor settings could not be read");
  });

  it("shows the fail-closed refusal in the affected role row when Edit sources is clicked", async () => {
    const plant = withRoles({ temperature: { ...emptyRole(), aggregation: "median" as RoleSourceConfig["aggregation"] } });
    let current = plant;
    const h = harness([plant], msg => msg.type === "smart_plants/plants/list" ? { plants: [current] } : undefined);
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
    await settle(el); await click(el, "Aloe"); await click(el, "Sensors");
    (row(el, "Temperature").querySelector("button.source-toggle") as HTMLButtonElement).click(); await settle(el);
    const alert = row(el, "Temperature").querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain("Temperature sensor settings are missing or incompatible");
    expect(alert.textContent).toContain("defaults will not be guessed");
    // Fail closed: no editor, and the refusal does not bleed into other rows.
    expect(sensorsSection(el).querySelector("#temperature-sources-editor")).toBeNull();
    expect(row(el, "Temperature").querySelector("button.source-toggle")!.getAttribute("aria-expanded")).toBe("false");
    expect(sensorsSection(el).querySelectorAll('[role="alert"]')).toHaveLength(1);
    // Opening another role's editor successfully clears the refusal.
    (row(el, "Humidity").querySelector("button.source-toggle") as HTMLButtonElement).click(); await settle(el);
    expect(sensorsSection(el).querySelector("#humidity-sources-editor")).not.toBeNull();
    expect(sensorsSection(el).querySelectorAll('[role="alert"]')).toHaveLength(0);
    // Refused again, then the plant data changes: the stale refusal disappears.
    (row(el, "Humidity").querySelector("button.source-toggle") as HTMLButtonElement).click(); await settle(el);
    (row(el, "Temperature").querySelector("button.source-toggle") as HTMLButtonElement).click(); await settle(el);
    expect(row(el, "Temperature").querySelector('[role="alert"]')).not.toBeNull();
    current = { ...plant, revision: 2 };
    h.events.get("ready")!(); await settle(el); await settle(el);
    expect(row(el, "Temperature").textContent).toContain("Sensor settings could not be read");
    expect(row(el, "Temperature").querySelector('[role="alert"]')).toBeNull();
  });

  it("accepts the backend PlantView default for every source role and still fails closed when absent", () => {
    expect(Object.keys(backendRoleDefaults).sort()).toEqual(ROLE_SOURCE_SPECS.map(spec => spec.role).sort());
    for (const spec of ROLE_SOURCE_SPECS) {
      expect(roleSourceConfig(newPlantView, spec.role), spec.role).not.toBeNull();
      // A storage-shaped record without the role is never guessed into a default.
      expect(roleSourceConfig(sample, spec.role), spec.role).toBeNull();
    }
  });

  it("opens and saves a role editor on a new plant from the backend defaults", async () => {
    const { el, calls } = await mountDetail(structuredClone(newPlantView), [tempEntity()], [tempState()], msg => {
      if (msg.type === "smart_plants/roles/set_sources") return { plant: { ...structuredClone(newPlantView), revision: 2 } };
      return undefined;
    });
    const section = sensorsSection(el);
    expect(section.textContent).not.toContain("Sensor settings could not be read");
    await openCombine(el, "Temperature");
    const combine = sensorsSection(el).querySelector("#temperature-sources-editor")!;
    const aggregation = [...combine.querySelectorAll("label")].find(l => l.textContent?.trim().startsWith("Combine readings"))!.querySelector("select")!;
    expect(aggregation.value).toBe("average");
    await addSensor(el, "temperature");
    const editor = sensorsSection(el).querySelector("#temperature-sources-editor")!;
    const picker = [...editor.querySelectorAll("select")].find(sel => [...sel.options].some(o => o.textContent?.includes("Choose a sensor")))!;
    picker.value = "sensor.living_temp"; picker.dispatchEvent(new Event("change", { bubbles: true })); await settle(el);
    [...sensorsSection(el).querySelectorAll<HTMLButtonElement>("#temperature-sources-editor button")].find(b => b.textContent?.startsWith("Save"))!.click(); await settle(el);
    expect(calls.filter(c => typeof c.type === "string" && c.type.startsWith("smart_plants/roles/set_"))).toEqual([
      { type: "smart_plants/roles/set_sources", plant_id: newPlantView.id, expected_revision: 1, role: "temperature", sources: [{ entity_id: "sensor.living_temp", registry_id: "reg-temp" }] },
    ]);
    expect(sensorsSection(el).textContent).not.toContain("sensor settings are missing or incompatible");
    expect(sensorsSection(el).querySelectorAll('[role="alert"]')).toHaveLength(0);
  });

  it("filters the picker by device class and unit, with a show-all fallback", async () => {
    const { el } = await mountDetail(withRoles(), [tempEntity()], [tempState(), moistureState()]);
    await addSensor(el, "temperature");
    const picker = () => [...sensorsSection(el).querySelectorAll("select")].find(s => [...s.options].some(o => o.textContent?.includes("Choose a sensor")))!;
    const options = () => [...picker().options].map(o => o.value);
    // Only the temperature sensor matches temperature device_class + °C.
    expect(options()).toContain("sensor.living_temp");
    expect(options()).not.toContain("sensor.soil_moist");
    // Toggle "Show all sensors" to reveal metadata-mismatched sensors.
    const showAll = sensorsSection(el).querySelector('input[type="checkbox"]') as HTMLInputElement;
    showAll.checked = true; showAll.dispatchEvent(new Event("change", { bubbles: true })); await settle(el);
    expect(options()).toContain("sensor.soil_moist");
  });

  it.each(["temperature", "soil_temperature"])("accepts °C, °F and K in the %s picker and warnings", async role => {
    const entities = [0, 1, 2, 3].map(i => ({ ...tempEntity(), id: `reg-${i}`, entity_id: `sensor.temp_${i}` }));
    const states = entities.map((entity, i) => ({ ...tempState(), entity_id: entity.entity_id, attributes: { ...tempState().attributes, unit_of_measurement: ["°C", "°F", "K", "°R"][i] } }));
    const plant = withRoles({ [role]: { ...emptyRole(), sources: entities.map(e => ({ entity_id: e.entity_id, registry_id: e.id })) } });
    const { el } = await mountDetail(plant, entities, states);
    await click(el, role === "temperature" ? "Change temperature sensors" : "Change soil temperature sensors");
    const editor = sensorsSection(el).querySelector(`#${role}-sources-editor`)!;
    const picker = editor.querySelector("select")!;
    expect([...picker.options].map(o => o.value)).toEqual(["", ...entities.slice(0, 3).map(e => e.entity_id)]);
    expect(editor.textContent).toContain("Unexpected metadata");
    expect(editor.textContent).toContain("°C / °F / K");
    expect(editor.textContent!.match(/Unexpected metadata/g)).toHaveLength(1);
  });

  it("warns about metadata mismatches on an assigned source", async () => {
    // conductivity role already has a temperature sensor assigned (wrong metadata)
    const plant = withRoles({ conductivity: { sources: [{ entity_id: "sensor.living_temp", registry_id: "reg-temp" }], primary_entity_id: null, aggregation: "primary", stale_after_seconds: 21600 } });
    const { el } = await mountDetail(plant, [tempEntity()], [tempState()]);
    await click(el, "Change fertilizer level sensors");
    expect(sensorsSection(el).querySelector("#conductivity-sources-editor")!.textContent).toContain("Unexpected metadata");
  });

  it("saves via the granular role commands, only for changed fields", async () => {
    const { el, calls } = await mountDetail(withRoles(), [tempEntity()], [tempState()], msg => {
      if (typeof msg.type === "string" && msg.type.startsWith("smart_plants/roles/set_")) {
        return { plant: { ...withRoles(), revision: 2 } };
      }
      return undefined;
    });
    await addSensor(el, "temperature");
    // Add the temperature sensor via the picker.
    const picker = [...sensorsSection(el).querySelectorAll("select")].find(s => [...s.options].some(o => o.textContent?.includes("Choose a sensor")))!;
    picker.value = "sensor.living_temp"; picker.dispatchEvent(new Event("change", { bubbles: true })); await settle(el);
    const save = [...sensorsSection(el).querySelectorAll<HTMLButtonElement>("#temperature-sources-editor button")].find(b => b.textContent?.startsWith("Save"))!;
    save.click(); await settle(el);
    const sourceCall = calls.find(c => c.type === "smart_plants/roles/set_sources");
    expect(sourceCall).toBeDefined();
    expect(sourceCall!.role).toBe("temperature");
    expect((sourceCall!.sources as unknown[]).length).toBe(1);
    // Aggregation and stale_after were not changed → not sent.
    expect(calls.some(c => c.type === "smart_plants/roles/set_aggregation")).toBe(false);
    expect(calls.some(c => c.type === "smart_plants/roles/set_stale_after")).toBe(false);
  });

  it("guards a single active editor with a switch confirmation", async () => {
    const { el } = await mountDetail(withRoles(), [tempEntity()], [tempState()]);
    // Open temperature editor and make a change (stale after).
    await openCombine(el, "Temperature");
    await setTemperatureStale(el, "3600");
    // Try to open a second role editor → should prompt, not switch.
    await openCombine(el, "Humidity");
    expect(sensorsSection(el).textContent).toContain("Discard and switch");
    expect(sensorsSection(el).querySelector("#humidity-sources-editor")).toBeNull();
    // The sensor list of the same role keeps the draft.
    await addSensor(el, "temperature");
    expect(sensorsSection(el).querySelector("#temperature-sources-editor select")).not.toBeNull();
    await openCombine(el, "Temperature");
    expect(sensorsSection(el).querySelector<HTMLInputElement>('#temperature-sources-editor input[type="number"]')!.value).toBe("3600");
  });

  it("keeps local sources and staleness through review, then retries on the new revision", async () => {
    let current = withRoles();
    const h = harness([current], msg => {
      if (msg.type === "smart_plants/plants/list") return { plants: [current] };
      if (msg.type === "config/entity_registry/list") return [tempEntity()];
      if (msg.type === "get_states") return [tempState()];
      if (msg.type === "smart_plants/roles/set_sources" && msg.expected_revision === 1) {
        current = { ...current, revision: 2, roles: { ...current.roles!, temperature: { ...emptyRole(), aggregation: "average", stale_after_seconds: 7200 } } };
        throw { error: { code: "revision_conflict", message: "stale" } };
      }
      if (typeof msg.type === "string" && msg.type.startsWith("smart_plants/roles/set_")) {
        const role = current.roles!.temperature as RoleSourceConfig;
        const next = msg.type === "smart_plants/roles/set_sources" ? { sources: msg.sources as RoleSourceConfig["sources"] } : { stale_after_seconds: msg.stale_after_seconds as number };
        current = { ...current, revision: current.revision + 1, roles: { ...current.roles!, temperature: { ...role, ...next } } };
        return { plant: current };
      }
      return undefined;
    });
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
    await settle(el); await click(el, "Aloe"); await click(el, "Sensors");
    await openCombine(el, "Temperature");
    await setTemperatureStale(el, "3600");
    await addSensor(el, "temperature");
    const picker = sensorsSection(el).querySelector<HTMLSelectElement>("#temperature-sources-editor select")!;
    picker.value = "sensor.living_temp"; picker.dispatchEvent(new Event("change", { bubbles: true })); await settle(el);
    await click(el, "Save temperature sensors");
    expect(el.shadowRoot!.textContent).toContain("Review changes from another session");
    expect(el.shadowRoot!.textContent).toContain("Both sessions changed these source fields: stale_after_seconds");
    expect(sensorsSection(el).textContent).toContain("sensor.living_temp");
    expect(h.calls.filter(c => String(c.type).startsWith("smart_plants/roles/set_"))).toHaveLength(1);
    await click(el, "I reviewed changes; retain my edits for reapply");
    expect(el.shadowRoot!.textContent).toContain("Saving will replace the refreshed values for those fields");
    expect(sensorsSection(el).textContent).toContain("sensor.living_temp");
    await openCombine(el, "Temperature");
    expect(sensorsSection(el).querySelector<HTMLInputElement>('#temperature-sources-editor input[type="number"]')!.value).toBe("3600");
    await click(el, "Save temperature sensors");
    const writes = h.calls.filter(c => String(c.type).startsWith("smart_plants/roles/set_"));
    expect(writes.map(c => [c.type, c.expected_revision])).toEqual([
      ["smart_plants/roles/set_sources", 1], ["smart_plants/roles/set_sources", 2], ["smart_plants/roles/set_stale_after", 3],
    ]);
    expect(current.roles!.temperature).toMatchObject({ aggregation: "average", stale_after_seconds: 3600, sources: [{ entity_id: "sensor.living_temp" }] });
    expect(sensorsSection(el).textContent).toContain("Temperature sensors saved.");
  });

  it("retains the draft after a mid-chain conflict without replaying completed commands", async () => {
    let current = withRoles();
    const h = harness([current], msg => {
      if (msg.type === "smart_plants/plants/list") return { plants: [current] };
      if (msg.type === "config/entity_registry/list") return [tempEntity()];
      if (msg.type === "get_states") return [tempState()];
      if (msg.type === "smart_plants/roles/set_sources") {
        current = { ...current, revision: 2, roles: { ...current.roles!, temperature: { ...emptyRole(), sources: msg.sources as RoleSourceConfig["sources"] } } };
        return { plant: current };
      }
      if (msg.type === "smart_plants/roles/set_stale_after") {
        if (msg.expected_revision === 2) {
          current = { ...current, revision: 3, roles: { ...current.roles!, temperature: { ...(current.roles!.temperature as RoleSourceConfig), aggregation: "max" } } };
          throw { error: { code: "revision_conflict", message: "stale" } };
        }
        current = { ...current, revision: 4, roles: { ...current.roles!, temperature: { ...(current.roles!.temperature as RoleSourceConfig), stale_after_seconds: msg.stale_after_seconds as number } } };
        return { plant: current };
      }
      return undefined;
    });
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
    await settle(el); await click(el, "Aloe"); await click(el, "Sensors"); await addSensor(el, "temperature");
    const picker = sensorsSection(el).querySelector<HTMLSelectElement>("#temperature-sources-editor select")!;
    picker.value = "sensor.living_temp"; picker.dispatchEvent(new Event("change", { bubbles: true })); await settle(el);
    await openCombine(el, "Temperature");
    await setTemperatureStale(el, "3600");
    await click(el, "Save temperature sensors");
    expect(el.shadowRoot!.textContent).toContain("Review changes from another session");
    expect(sensorsSection(el).querySelector<HTMLInputElement>('#temperature-sources-editor input[type="number"]')!.value).toBe("3600");
    await click(el, "I reviewed changes; retain my edits for reapply");
    expect(h.calls.filter(c => String(c.type).startsWith("smart_plants/roles/set_"))).toHaveLength(2);
    await click(el, "Save temperature sensors");
    expect(h.calls.filter(c => String(c.type).startsWith("smart_plants/roles/set_")).map(c => [c.type, c.expected_revision])).toEqual([
      ["smart_plants/roles/set_sources", 1], ["smart_plants/roles/set_stale_after", 2], ["smart_plants/roles/set_stale_after", 3],
    ]);
    expect(current.roles!.temperature).toMatchObject({ aggregation: "max", stale_after_seconds: 3600, sources: [{ entity_id: "sensor.living_temp" }] });
  });

  it("keeps open source and threshold drafts after an unrelated save", async () => {
    let current = withRoles();
    const h = harness([current], msg => {
      if (msg.type === "smart_plants/plants/list") return { plants: [current] };
      if (msg.type === "config/entity_registry/list") return [{ id: "stress-reg", entity_id: "binary_sensor.temp_stress", device_id: null, unique_id: `smart_plants:${current.id}:temperature_stress`, platform: "smart_plants" }];
      if (msg.type === "get_states") return [{ ...tempState(), entity_id: "binary_sensor.temp_stress", state: "off", attributes: {} }];
      if (msg.type === "smart_plants/plants/update") {
        current = { ...current, name: msg.name as string, revision: 2 };
        return { plant: current };
      }
      return undefined;
    });
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
    await settle(el); await click(el, "Aloe"); await click(el, "Sensors"); await openCombine(el, "Temperature");
    await setTemperatureStale(el, "3600");
    await click(el, "Settings");
    await click(el, "Edit thresholds");
    const threshold = el.shadowRoot!.querySelector<HTMLInputElement>('#temperature_stress-editor input[type="number"]')!;
    threshold.value = "8"; threshold.dispatchEvent(new Event("input", { bubbles: true })); await settle(el);
    await click(el, "Rename");
    const name = [...el.shadowRoot!.querySelectorAll("label")].find(label => label.textContent === "Name")!.querySelector("input")!;
    name.value = "New Aloe"; name.dispatchEvent(new Event("input", { bubbles: true })); await settle(el);
    await click(el, "Save name");
    await click(el, "Sensors");
    expect(sensorsSection(el).querySelector<HTMLInputElement>('#temperature-sources-editor input[type="number"]')!.value).toBe("3600");
    await click(el, "Settings");
    expect(el.shadowRoot!.querySelector<HTMLInputElement>('#temperature_stress-editor input[type="number"]')!.value).toBe("8");
  });
});
