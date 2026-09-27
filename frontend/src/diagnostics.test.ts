import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import { PROBLEM_BINARY_ROLES, THRESHOLD_SPECS, effectiveThresholds, problemBinaries } from "./model.js";
import type { HAEntity, HAState, PlantRecord } from "./types.js";
import { click, harness, sample, settle } from "./test-helpers.js";

const PLANT_ID = sample.id;

function stressEntity(role: string): HAEntity {
  return {
    id: `reg-${role}`,
    entity_id: `binary_sensor.smart_plants_${PLANT_ID}_${role}`,
    device_id: `device-${PLANT_ID}`,
    unique_id: `smart_plants:${PLANT_ID}:${role}`,
    platform: "smart_plants",
  };
}

function stressState(role: string, state: string, attributes: Record<string, unknown> = {}): HAState {
  return {
    entity_id: `binary_sensor.smart_plants_${PLANT_ID}_${role}`,
    state,
    attributes,
    last_updated: "2026-09-17T00:00:00Z",
  };
}

function buildRegistry(roles: readonly string[] = PROBLEM_BINARY_ROLES): HAEntity[] {
  return roles.map(stressEntity);
}

function buildStates(entries: Record<string, { state: string; attributes?: Record<string, unknown> }>): Record<string, HAState> {
  return Object.fromEntries(
    Object.entries(entries).map(([role, v]) => {
      const s = stressState(role, v.state, v.attributes ?? {});
      return [s.entity_id, s];
    }),
  );
}

async function mountDetailWith(entities: HAEntity[], states: Record<string, HAState>): Promise<SmartPlantsPanel> {
  const h = harness([sample], msg => {
    if (msg.type === "config/entity_registry/list") return entities;
    if (msg.type === "get_states") return Object.values(states);
    return undefined;
  });
  const el = new SmartPlantsPanel();
  el.hass = h.hass;
  document.body.append(el);
  await settle(el);
  await click(el, "Aloe");
  await click(el, "Diagnostics");
  return el;
}

describe("problemBinaries model helper", () => {
  it("returns one reading per Phase 7 problem role in a stable order", () => {
    const plant: PlantRecord = structuredClone(sample);
    const rows = problemBinaries(plant, [], {});
    expect(rows.map(r => r.role)).toEqual([...PROBLEM_BINARY_ROLES]);
    expect(rows.every(r => r.status === "not_configured")).toBe(true);
  });

  it("maps on/off/unavailable/unknown/missing to the four statuses", () => {
    const entities = buildRegistry([
      "temperature_stress",
      "humidity_stress",
      "soil_temperature_stress",
      "co2_stress",
      "low_light",
      // conductivity_stress and low_battery intentionally missing
    ]);
    const states = buildStates({
      temperature_stress: { state: "on", attributes: { reason: "heat" } },
      humidity_stress: { state: "off" },
      soil_temperature_stress: { state: "unavailable" },
      co2_stress: { state: "unknown" },
      low_light: { state: "on" },
    });
    const rows = problemBinaries(sample, entities, states);
    const byRole = Object.fromEntries(rows.map(r => [r.role, r]));
    expect(byRole.temperature_stress.status).toBe("on");
    expect(byRole.temperature_stress.reason).toBe("heat");
    expect(byRole.humidity_stress.status).toBe("off");
    expect(byRole.soil_temperature_stress.status).toBe("unavailable");
    expect(byRole.co2_stress.status).toBe("unavailable");
    expect(byRole.low_light.status).toBe("on");
    expect(byRole.low_battery.status).toBe("not_configured");
    expect(byRole.conductivity_stress.status).toBe("not_configured");
  });

  it("ignores registry entries from other platforms with the same unique id", () => {
    const foreign: HAEntity = {
      id: "reg-foreign",
      entity_id: `binary_sensor.other_${PLANT_ID}_temperature_stress`,
      device_id: null,
      unique_id: `smart_plants:${PLANT_ID}:temperature_stress`,
      platform: "not_smart_plants",
    };
    const rows = problemBinaries(sample, [foreign], {});
    expect(rows.find(r => r.role === "temperature_stress")?.status).toBe("not_configured");
  });

  it("effectiveThresholds returns one reading per role spec when the entity is registered", () => {
    const entities = buildRegistry(["low_light"]);
    const states = buildStates({ low_light: { state: "off", attributes: { target_lux: 500, clear_lux: 700 } } });
    const rows = effectiveThresholds(sample, "low_light", entities, states);
    expect(rows.map(r => r.key)).toEqual(THRESHOLD_SPECS.low_light.map(s => s.key));
    expect(rows.every(r => r.value !== null)).toBe(true);
  });

  it("effectiveThresholds returns empty when the entity is not registered", () => {
    expect(effectiveThresholds(sample, "temperature_stress", [], {})).toEqual([]);
  });

  it("effectiveThresholds maps non-finite or non-numeric attribute values to null", () => {
    const entities = buildRegistry(["low_battery"]);
    const states = buildStates({ low_battery: { state: "unavailable", attributes: { threshold_percent: "20", clear_percent: NaN } } });
    const rows = effectiveThresholds(sample, "low_battery", entities, states);
    expect(rows.every(r => r.value === null)).toBe(true);
  });

  it("treats an empty-string reason attribute as no reason", () => {
    const entities = buildRegistry(["temperature_stress"]);
    const states = buildStates({ temperature_stress: { state: "on", attributes: { reason: "   " } } });
    const rows = problemBinaries(sample, entities, states);
    expect(rows.find(r => r.role === "temperature_stress")?.reason).toBeNull();
  });
});

describe("Advanced diagnostics section", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" }))));
  });
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the heading, description, and one row per role", async () => {
    const el = await mountDetailWith(buildRegistry(), {});
    const heading = el.shadowRoot!.querySelector("#diagnostics-heading");
    expect(heading?.textContent).toContain("Advanced diagnostics");
    const section = heading!.closest("section")!;
    expect(section.textContent).toContain("Status of the problem indicators");
    const dts = section.querySelectorAll("dt");
    expect(dts.length).toBe(PROBLEM_BINARY_ROLES.length);
    expect([...dts].map(n => n.textContent)).toContain("Temperature stress");
    expect([...dts].map(n => n.textContent)).toContain("Low battery");
  });

  it("summarizes the number of active problems", async () => {
    const entities = buildRegistry();
    const states = buildStates({
      temperature_stress: { state: "on" },
      humidity_stress: { state: "off" },
      soil_temperature_stress: { state: "unavailable" },
      co2_stress: { state: "off" },
      low_light: { state: "on" },
      low_battery: { state: "off" },
      conductivity_stress: { state: "off" },
    });
    const el = await mountDetailWith(entities, states);
    const section = el.shadowRoot!.querySelector("#diagnostics-heading")!.closest("section")!;
    expect(section.querySelector('p[role="status"]')?.textContent).toContain("2 active problems");
  });

  it("uses singular copy for exactly one active problem", async () => {
    const entities = buildRegistry();
    const states = buildStates({ temperature_stress: { state: "on" } });
    const el = await mountDetailWith(entities, states);
    const section = el.shadowRoot!.querySelector("#diagnostics-heading")!.closest("section")!;
    expect(section.querySelector('p[role="status"]')?.textContent?.trim()).toBe("1 active problem.");
  });

  it("uses zero copy when no problems are active or configured", async () => {
    const el = await mountDetailWith([], {});
    const section = el.shadowRoot!.querySelector("#diagnostics-heading")!.closest("section")!;
    expect(section.querySelector('p[role="status"]')?.textContent?.trim()).toBe("No active problems.");
  });

  it("announces active problem rows through the term and its visible status text", async () => {
    const entities = buildRegistry(["temperature_stress"]);
    const states = buildStates({ temperature_stress: { state: "on" } });
    const el = await mountDetailWith(entities, states);
    const dd = el.shadowRoot!.querySelector("dl.diagnostics dd.status-on");
    expect(dd?.previousElementSibling?.tagName).toBe("DT");
    expect(dd?.previousElementSibling?.textContent?.trim()).toBe("Temperature stress");
    expect(dd?.hasAttribute("aria-label")).toBe(false);
    expect(dd?.textContent?.trim().startsWith("problem detected")).toBe(true);
  });

  it("renders reason text verbatim next to the status when the backend supplies one", async () => {
    const entities = buildRegistry(["co2_stress"]);
    const states = buildStates({ co2_stress: { state: "on", attributes: { reason: "high_co2" } } });
    const el = await mountDetailWith(entities, states);
    const dd = el.shadowRoot!.querySelector("dl.diagnostics dd.status-on");
    expect(dd?.textContent).toContain("high_co2");
  });

  it("renders unavailable and unknown as unavailable, and missing entities as not configured", async () => {
    const entities = buildRegistry(["temperature_stress", "humidity_stress"]);
    const states = buildStates({
      temperature_stress: { state: "unavailable" },
      humidity_stress: { state: "unknown" },
    });
    const el = await mountDetailWith(entities, states);
    const dds = [...el.shadowRoot!.querySelectorAll("dl.diagnostics dd")];
    const unavailable = dds.filter(dd => dd.textContent?.trim().startsWith("unavailable"));
    const notConfigured = dds.filter(dd => dd.textContent?.trim().startsWith("not configured"));
    expect(unavailable.length).toBe(2);
    expect(notConfigured.length).toBe(PROBLEM_BINARY_ROLES.length - 2);
  });

  it("renders one effective-threshold sub-list per registered role with the exposed attribute values", async () => {
    const entities = buildRegistry(["temperature_stress", "co2_stress", "low_battery"]);
    const states = buildStates({
      temperature_stress: { state: "on", attributes: { cold_threshold_celsius: 10.0, cold_clear_celsius: 12.0, hot_clear_celsius: 32.0, hot_threshold_celsius: 35.0 } },
      co2_stress: { state: "off", attributes: { threshold_ppm: 5000, clear_ppm: 4000 } },
      low_battery: { state: "off", attributes: { threshold_percent: 20, clear_percent: 25 } },
    });
    const el = await mountDetailWith(entities, states);
    const lists = el.shadowRoot!.querySelectorAll("dl.diagnostics ul.thresholds");
    // Only three roles are registered, so only three sub-lists render.
    expect(lists.length).toBe(3);
    const tempList = [...lists].find(ul => ul.getAttribute("aria-label")?.includes("Temperature stress"))!;
    const tempText = tempList.textContent ?? "";
    expect(tempText).toContain("Cold threshold");
    expect(tempText).toContain("10 °C");
    expect(tempText).toContain("Hot threshold");
    expect(tempText).toContain("35 °C");
    const co2List = [...lists].find(ul => ul.getAttribute("aria-label")?.includes("CO2 stress"))!;
    expect(co2List.textContent).toContain("5000 ppm");
    expect(co2List.textContent).toContain("4000 ppm");
    const batteryList = [...lists].find(ul => ul.getAttribute("aria-label")?.includes("Low battery"))!;
    expect(batteryList.textContent).toContain("20 %");
    expect(batteryList.textContent).toContain("25 %");
  });

  it("renders an em dash when a threshold attribute is missing from the state", async () => {
    const entities = buildRegistry(["temperature_stress"]);
    const states = buildStates({ temperature_stress: { state: "unavailable", attributes: {} } });
    const el = await mountDetailWith(entities, states);
    const list = el.shadowRoot!.querySelector("dl.diagnostics ul.thresholds")!;
    expect(list.querySelectorAll("li").length).toBe(THRESHOLD_SPECS.temperature_stress.length);
    for (const li of list.querySelectorAll("li")) {
      expect(li.textContent).toContain("—");
    }
  });

  it("omits the threshold sub-list entirely for roles that are not configured", async () => {
    const el = await mountDetailWith([], {});
    const lists = el.shadowRoot!.querySelectorAll("dl.diagnostics ul.thresholds");
    expect(lists.length).toBe(0);
  });

  it("reflects backend-supplied override values verbatim in the threshold sub-list", async () => {
    // The frontend does not resolve overrides; the backend already emits effective
    // (overridden or inherited) values on the binary sensor attributes.
    const entities = buildRegistry(["humidity_stress"]);
    const states = buildStates({
      humidity_stress: { state: "on", attributes: { dry_threshold_percent: 30, dry_clear_percent: 35, damp_clear_percent: 78, damp_threshold_percent: 82 } },
    });
    const el = await mountDetailWith(entities, states);
    const list = el.shadowRoot!.querySelector("dl.diagnostics ul.thresholds")!;
    const text = list.textContent ?? "";
    expect(text).toContain("30 %");
    expect(text).toContain("35 %");
    expect(text).toContain("78 %");
    expect(text).toContain("82 %");
  });

  it("is not rendered on the list view", async () => {
    const h = harness([sample]);
    const el = new SmartPlantsPanel();
    el.hass = h.hass;
    document.body.append(el);
    await settle(el);
    expect(el.shadowRoot!.querySelector("#diagnostics-heading")).toBeNull();
  });

  it("does not issue additional WebSocket commands beyond the detail baseline", async () => {
    const h = harness([sample], msg => {
      if (msg.type === "config/entity_registry/list") return buildRegistry();
      if (msg.type === "get_states") return [stressState("temperature_stress", "on")];
      return undefined;
    });
    const el = new SmartPlantsPanel();
    el.hass = h.hass;
    document.body.append(el);
    await settle(el);
    await click(el, "Aloe");
    const forbidden = h.calls.filter(c => {
      const t = typeof c.type === "string" ? c.type : "";
      return t.startsWith("smart_plants/") && !["smart_plants/panel/info", "smart_plants/plants/list", "smart_plants/moisture/evaluation", "smart_plants/plants/health", "smart_plants/care/list"].includes(t);
    });
    expect(forbidden).toEqual([]);
  });
});

describe("Overall health section", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" }))));
  });
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountWithHealth(health: unknown, options: { rejectHealth?: boolean } = {}): Promise<SmartPlantsPanel> {
    const h = harness([sample], msg => {
      if (msg.type === "smart_plants/plants/health") {
        if (options.rejectHealth) throw { code: "integration_not_loaded" };
        return { evaluation: health };
      }
      return undefined;
    });
    const el = new SmartPlantsPanel();
    el.hass = h.hass;
    document.body.append(el);
    await settle(el);
    await click(el, "Aloe");
    await click(el, "Diagnostics");
    await settle(el); await settle(el);
    return el;
  }

  it("renders composite score, confidence label, and contributors when the reply is available", async () => {
    const el = await mountWithHealth({ health_score: 76, available: true, confidence: 0.5, confidence_label: "medium", contributors: ["moisture", "temperature"], configured: ["moisture", "temperature", "humidity"], reasons: [] });
    const heading = el.shadowRoot!.querySelector("#overall-health-heading");
    expect(heading?.textContent).toContain("Overall health");
    const section = heading!.closest("section")!;
    expect(section.querySelector('p[role="status"]')?.textContent).toContain("76 out of 100");
    const dl = section.querySelector("dl.overall-health")!;
    expect(dl.textContent).toContain("medium");
    expect(dl.textContent).toContain("at least half of the configured roles");
    const contributors = [...dl.querySelectorAll("ul.contributors li")].map(li => li.textContent);
    expect(contributors).toEqual(["Moisture", "Temperature"]);
    const unavailable = [...dl.querySelectorAll("ul.configured-unavailable li")].map(li => li.textContent);
    expect(unavailable).toEqual(["Humidity"]);
  });

  it("degrades gracefully when the reply is unavailable", async () => {
    const el = await mountWithHealth({ health_score: null, available: false, confidence: 0.0, confidence_label: "unknown", contributors: [], configured: [], reasons: ["no_contributors"] });
    const section = el.shadowRoot!.querySelector("#overall-health-heading")!.closest("section")!;
    expect(section.querySelector('p[role="status"]')?.textContent).toContain("Overall health is unavailable");
    expect(section.textContent).toContain("unknown");
    expect(section.textContent).toContain("no roles are configured");
    expect(section.textContent).toContain("No roles are currently contributing");
  });

  it("says none when every configured role is included", async () => {
    const el = await mountWithHealth({ health_score: 100, available: true, confidence: 1.0, confidence_label: "high", contributors: ["moisture"], configured: ["moisture"], reasons: [] });
    const section = el.shadowRoot!.querySelector("#overall-health-heading")!.closest("section")!;
    expect(section.textContent).toContain("every configured role is currently included");
    expect(section.querySelectorAll("ul.configured-unavailable").length).toBe(0);
  });

  it("shows an unavailable copy when the health request fails", async () => {
    const el = await mountWithHealth(null, { rejectHealth: true });
    const section = el.shadowRoot!.querySelector("#overall-health-heading")!.closest("section")!;
    expect(section.querySelector('p[role="status"]')?.textContent).toContain("Overall health is unavailable");
  });

  it("fetches the composite via smart_plants/plants/health and issues no mutation commands", async () => {
    const seen: string[] = [];
    const h = harness([sample], msg => {
      seen.push(String(msg.type));
      if (msg.type === "smart_plants/plants/health") return { evaluation: { health_score: 50, available: true, confidence: 1.0, confidence_label: "high", contributors: ["moisture"], configured: ["moisture"], reasons: [] } };
      return undefined;
    });
    const el = new SmartPlantsPanel();
    el.hass = h.hass;
    document.body.append(el);
    await settle(el);
    await click(el, "Aloe");
    await click(el, "Diagnostics");
    await settle(el); await settle(el);
    expect(seen).toContain("smart_plants/plants/health");
    // Mutation commands the panel could issue elsewhere are not triggered by this section.
    const mutations = h.calls.map(c => String(c.type)).filter(t =>
      t === "smart_plants/plants/update" || t === "smart_plants/plants/delete" || t === "smart_plants/plants/disable" || t === "smart_plants/plants/reenable" || t === "smart_plants/moisture/configure" || t === "smart_plants/roles/set_threshold_overrides",
    );
    expect(mutations).toEqual([]);
  });

  it("is not rendered on the list view", async () => {
    const h = harness([sample]);
    const el = new SmartPlantsPanel();
    el.hass = h.hass;
    document.body.append(el);
    await settle(el);
    expect(el.shadowRoot!.querySelector("#overall-health-heading")).toBeNull();
  });
});

describe("Localization fallback and passthrough", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["x"], { type: "image/webp" }))));
  });
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountWith(localize?: (key: string, ...args: unknown[]) => string): Promise<{ el: SmartPlantsPanel; seenKeys: string[] }> {
    const seenKeys: string[] = [];
    const wrapped = localize
      ? (key: string, ...args: unknown[]) => { seenKeys.push(key); return localize(key, ...args); }
      : undefined;
    const entities = buildRegistry(["temperature_stress"]);
    const states = buildStates({ temperature_stress: { state: "on", attributes: {} } });
    const h = harness([sample], msg => {
      if (msg.type === "config/entity_registry/list") return entities;
      if (msg.type === "get_states") return Object.values(states);
      if (msg.type === "smart_plants/plants/health") return { evaluation: { health_score: 82, available: true, confidence: 1.0, confidence_label: "high", contributors: ["moisture"], configured: ["moisture", "temperature"], reasons: [] } };
      return undefined;
    });
    if (wrapped) h.hass.localize = wrapped;
    const el = new SmartPlantsPanel();
    el.hass = h.hass;
    document.body.append(el);
    await settle(el);
    await click(el, "Aloe");
    await click(el, "Diagnostics");
    await settle(el); await settle(el);
    return { el, seenKeys };
  }

  it("falls back bit-identically when no localize is supplied", async () => {
    const { el } = await mountWith(undefined);
    const overall = el.shadowRoot!.querySelector("#overall-health-heading")!.closest("section")!;
    const diagnostics = el.shadowRoot!.querySelector("#diagnostics-heading")!.closest("section")!;
    expect(el.shadowRoot!.querySelector("#overall-health-heading")?.textContent).toBe("Overall health");
    expect(overall.textContent).toContain("82 out of 100");
    expect(overall.textContent).toContain("high");
    expect(overall.textContent).toContain("every configured role is currently available.");
    expect(overall.textContent).toContain("Moisture");
    expect(overall.textContent).toContain("Temperature");
    expect(el.shadowRoot!.querySelector("#diagnostics-heading")?.textContent).toBe("Advanced diagnostics");
    expect(diagnostics.textContent).toContain("Status of the problem indicators");
    expect(diagnostics.textContent).toContain("1 active problem.");
    expect(diagnostics.textContent).toContain("problem detected");
  });

  it("calls localize with the documented keys and renders returned strings verbatim", async () => {
    const map: Record<string, string> = {
      "component.smart_plants.panel.section.overall_health": "Gesamtzustand",
      "component.smart_plants.panel.section.overall_health_available_summary": "{score} von 100",
      "component.smart_plants.panel.section.overall_health_confidence": "Vertrauen",
      "component.smart_plants.panel.section.overall_health_included_roles": "Beruecksichtigte Rollen",
      "component.smart_plants.panel.section.overall_health_configured_unavailable": "Konfiguriert, aber nicht verfuegbar",
      "component.smart_plants.panel.section.confidence_high": "jede konfigurierte Rolle ist derzeit verfuegbar.",
      "component.smart_plants.panel.health_contributor.moisture": "Feuchte",
      "component.smart_plants.panel.health_contributor.temperature": "Temperatur",
      "component.smart_plants.panel.section.advanced_diagnostics": "Erweiterte Diagnose",
      "component.smart_plants.panel.section.advanced_diagnostics_description": "Status der Indikatoren.",
      "component.smart_plants.panel.section.advanced_diagnostics_one_active": "1 aktives Problem.",
      "component.smart_plants.panel.section.advanced_diagnostics_status_problem": "Problem erkannt",
    };
    const localize = (key: string, ..._args: unknown[]) => map[key] ?? "";
    const { el, seenKeys } = await mountWith(localize);
    expect(seenKeys).toContain("component.smart_plants.panel.section.overall_health");
    expect(seenKeys).toContain("component.smart_plants.panel.section.advanced_diagnostics");
    expect(seenKeys).toContain("component.smart_plants.panel.section.confidence_high");
    expect(seenKeys).toContain("component.smart_plants.panel.health_contributor.moisture");
    const overall = el.shadowRoot!.querySelector("#overall-health-heading")!.closest("section")!;
    const diagnostics = el.shadowRoot!.querySelector("#diagnostics-heading")!.closest("section")!;
    expect(el.shadowRoot!.querySelector("#overall-health-heading")?.textContent).toBe("Gesamtzustand");
    expect(overall.textContent).toContain("82 von 100");
    expect(overall.textContent).toContain("Vertrauen");
    expect(overall.textContent).toContain("Feuchte");
    expect(overall.textContent).toContain("Temperatur");
    expect(overall.textContent).toContain("jede konfigurierte Rolle ist derzeit verfuegbar.");
    expect(el.shadowRoot!.querySelector("#diagnostics-heading")?.textContent).toBe("Erweiterte Diagnose");
    expect(diagnostics.textContent).toContain("Status der Indikatoren.");
    expect(diagnostics.textContent).toContain("1 aktives Problem.");
    expect(diagnostics.textContent).toContain("Problem erkannt");
  });

  it("preserves DOM structure and aria attributes when localize is supplied", async () => {
    const localize = (key: string, ..._args: unknown[]) =>
      key === "component.smart_plants.panel.section.advanced_diagnostics_status_problem" ? "Problem erkannt" : "";
    const { el } = await mountWith(localize);
    const overall = el.shadowRoot!.querySelector("section[aria-labelledby=overall-health-heading]");
    const diagnostics = el.shadowRoot!.querySelector("section[aria-labelledby=diagnostics-heading]");
    expect(overall).not.toBeNull();
    expect(diagnostics).not.toBeNull();
    expect(diagnostics!.querySelector("dl.diagnostics")).not.toBeNull();
    const dd = diagnostics!.querySelector("dd.status-on");
    // The visible status text uses the (localized) "problem detected" phrase
    expect(dd?.hasAttribute("aria-label")).toBe(false);
    expect(dd?.textContent?.trim().startsWith("Problem erkannt")).toBe(true);
    expect(overall!.querySelector("dl.overall-health")).not.toBeNull();
    expect(overall!.querySelector("p[role=status]")).not.toBeNull();
    expect(diagnostics!.querySelector("p[role=status]")).not.toBeNull();
  });

  it("falls back when localize returns an empty or whitespace string", async () => {
    const localize = (_key: string, ..._args: unknown[]) => "  ";
    const { el } = await mountWith(localize);
    expect(el.shadowRoot!.querySelector("#overall-health-heading")?.textContent).toBe("Overall health");
    expect(el.shadowRoot!.querySelector("#diagnostics-heading")?.textContent).toBe("Advanced diagnostics");
    const overall = el.shadowRoot!.querySelector("#overall-health-heading")!.closest("section")!;
    expect(overall.textContent).toContain("Moisture");
    expect(overall.textContent).toContain("every configured role is currently available.");
  });
});
