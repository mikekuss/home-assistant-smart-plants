import { expect, vi } from "vitest";
import { builtin, emptyMoisture, keys } from "./model.js";
import plantViewRoleDefaults from "../../tests/fixtures/plant_view_role_defaults.json";
import type { PlantOverview } from "./overview-model.js";
import type { Evaluation, HealthEvaluation, HomeAssistantLike, MoistureRoleConfig, PanelCapabilities, PlantRecord, SpeciesSnapshot } from "./types.js";

export const capabilities: PanelCapabilities = { api_version: 1, schema_version: 1, providers: [{ provider: "manual", available: true, search_supported: false }, { provider: "openplantbook", available: true, search_supported: true }] };
export const draft = { draft_id: "12345678-1234-1234-1234-123456789abc", draft_token: "t".repeat(43), revision: 0, expires_in: 600 };
export const snapshot: SpeciesSnapshot = { provider: "openplantbook", provider_id: "aloe", provider_ref: "aloe", fetched_at: "2026-09-10T00:00:00Z", locale: "en", source_status: "provider", attribution: "OpenPlantBook", common_name: "Aloe", latin_name: "Aloe vera", category: "succulent", confidence: null, care_text: { watering: "Let soil dry." }, field_sources: { common_name: "OpenPlantBook", latin_name: "OpenPlantBook", category: "OpenPlantBook", watering: "OpenPlantBook", moisture_min: "OpenPlantBook", moisture_max: "OpenPlantBook" }, threshold_defaults: { moisture: { min: 20, max: 60 } } };
export const preview = { draft_id: draft.draft_id, revision: 0, preview_token: "preview-1", provider: "openplantbook", operation: "select", snapshot, diff: { common_name: { before: null, after: "Aloe" } } };
export const role: MoistureRoleConfig = { ...emptyMoisture(), threshold_defaults: Object.fromEntries(keys.map(k => [k, { value: builtin[k], source: "builtin", provider: null, provider_ref: null }])) as MoistureRoleConfig["threshold_defaults"] };
// `sample` is storage-shaped (moisture only), as an older backend or a raw
// record would send. The backend PlantView fills every unconfigured source role
// with its registered default; this backend-owned fixture holds those defaults.
export const backendRoleDefaults: Record<string, unknown> = plantViewRoleDefaults;
export const sample: PlantRecord = { id: "plant-1", revision: 1, name: "Aloe", created_at: "2026-09-10T00:00:00Z", acquired_at: null, lifecycle_state: "active", species: null, placement: null, category: null, tags: [], image: null, roles: { moisture: role } };
export const newPlantView: PlantRecord = { ...sample, roles: { ...structuredClone(backendRoleDefaults), moisture: role } };
export const evaluation: Evaluation = { computed_percent: 30, health_score: 88, computed_available: true, needs_water: false, too_wet: false, sensor_stale: false, reasons: [] };
export const healthEvaluation: HealthEvaluation = { health_score: 88, available: true, confidence: 1.0, confidence_label: "high", contributors: ["moisture"], configured: ["moisture"], reasons: [] };
// Signature-only fixture for tests that mock the browser decoder explicitly.
export const pngFile = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], "image.png", { type: "image/png" });
export function harness(plants: PlantRecord[] = [structuredClone(sample)], handler?: (msg: Record<string, unknown>) => unknown) {
  const events = new Map<string, () => void>();
  const calls: Record<string, unknown>[] = [];
  const send = vi.fn(async (msg: Record<string, unknown>) => {
    calls.push(structuredClone(msg));
    const custom = handler?.(msg); if (custom !== undefined) return await custom as never;
    switch (msg.type) {
      case "smart_plants/panel/info": return capabilities as never;
      case "smart_plants/plants/list": return { plants } as never;
      case "smart_plants/wizard/start": return draft as never;
      case "smart_plants/wizard/preview": return preview as never;
      case "smart_plants/species/preview": return preview as never;
      case "smart_plants/species/refresh_preview": return { ...preview, operation: "refresh" } as never;
      case "smart_plants/species/search": return { results: [{ provider: "openplantbook", provider_ref: "aloe", common_name: "Aloe", latin_name: "Aloe vera", category: null, attribution: "OpenPlantBook" }] } as never;
      case "smart_plants/wizard/create": return { plant: sample } as never;
      case "smart_plants/moisture/evaluation": return { evaluation } as never;
      case "smart_plants/plants/overview": return { plants: plants.map(overviewFor) } as never;
      case "smart_plants/plants/health": return { evaluation: healthEvaluation } as never;
      case "smart_plants/care/list": {
        const plant = plants.find(p => p.id === msg.plant_id) ?? sample;
        const events = plant.care_events ?? [];
        return { revision: plant.revision, events, summary: { watering_count: events.length, last_watered_at: events[0]?.occurred_at ?? null, last_watered_local_date: events[0]?.local_date ?? null } } as never;
      }
      case "search/related": return { automation: ["automation.plant_reminder"] } as never;
      case "config/area_registry/list": return [{ area_id: "kitchen", name: "Kitchen" }, { area_id: "garden", name: "Garden" }] as never;
      case "config/entity_registry/list": return [] as never;
      case "config/device_registry/list": return plants.map(p => ({ id: `device-${p.id}`, area_id: "kitchen", identifiers: [["smart_plants", p.id]] })) as never;
      case "get_states": return [] as never;
      default: return { plant: plants.find(p => p.id === msg.plant_id) ?? sample } as never;
    }
  });
  const hass: HomeAssistantLike = { auth: { accessToken: "test-token" }, user: { is_admin: true }, connection: { sendMessagePromise: send, addEventListener: (name, fn) => { events.set(name, fn); }, removeEventListener: name => { events.delete(name); } } };
  return { hass, calls, send, events };
}
// Overview entry as the backend reports it for a plant with synthetic readings.
export function overviewFor(plant: PlantRecord): PlantOverview {
  const sources = (plant.roles?.moisture as MoistureRoleConfig | undefined)?.sources ?? [];
  return {
    plant_id: plant.id, revision: plant.revision, lifecycle_state: plant.lifecycle_state,
    status: plant.lifecycle_state === "disabled" ? "paused" : sources.length ? "healthy" : "no_sensors",
    problems: sources.length || plant.lifecycle_state === "disabled" ? [] : [{ role: "moisture", kind: "no_sensors" }],
    roles: sources.length ? { moisture: { value: 30, unit: "%", state: "ok", range: { min: 20, target: 40, max: 60 }, last_reported: "2026-09-10T00:00:00+00:00", sources: sources.map(s => s.entity_id) } } : {},
    last_watered_at: plant.care_events?.[0]?.occurred_at ?? null,
    image: plant.image ? { id: plant.image.id } : null,
  };
}
export function overviewOf(panel: { shadowRoot: ShadowRoot | null }): HTMLElementTagNameMap["smart-plants-overview"] {
  const overview = panel.shadowRoot?.querySelector("smart-plants-overview");
  expect(overview, "overview element").toBeTruthy(); return overview!;
}
// Text of the panel including nested component shadow roots, skipping hidden views.
export function panelText(panel: { shadowRoot: ShadowRoot | null }): string {
  const collect = (root: ShadowRoot | Element): string => [...root.childNodes].map(node => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (!(node instanceof Element) || (node as HTMLElement).hidden || node.localName === "style") return "";
    return `${node.shadowRoot ? collect(node.shadowRoot) : ""}${collect(node)}`;
  }).join(" ");
  return panel.shadowRoot ? collect(panel.shadowRoot) : "";
}
export async function settle(element: { updateComplete: Promise<unknown> }): Promise<void> { await element.updateComplete; await new Promise(resolve => setTimeout(resolve, 0)); await element.updateComplete; }
export function button(root: ShadowRoot, name: string): HTMLButtonElement {
  if (name === "Add plant" || name === "Back to overview") {
    const value = name === "Add plant" ? "add-plant" : "back-to-overview";
    const item = root.querySelector<HTMLElement>(`ha-dropdown-item[value="${value}"]`);
    expect(item, `menu item ${name}`).toBeDefined();
    const proxy = document.createElement("button");
    proxy.disabled = Boolean((item as HTMLElement & { disabled?: boolean }).disabled ?? item!.hasAttribute("disabled"));
    proxy.click = () => item!.dispatchEvent(new CustomEvent("wa-select", { bubbles: true, composed: true, detail: { item: { value } } }));
    return proxy;
  }
  // Plant cards live inside the overview element's own shadow root.
  const overview = root.querySelector("smart-plants-overview");
  const scopes = overview?.shadowRoot && !overview.hidden ? [root, overview.shadowRoot] : [root];
  const result = scopes.flatMap(scope => [...scope.querySelectorAll("button")]).find(b => b.textContent?.trim() === name);
  expect(result, `button ${name}`).toBeDefined(); return result!;
}
export async function click(element: { shadowRoot: ShadowRoot | null; updateComplete: Promise<unknown> }, name: string): Promise<void> {
  if (name === "Refresh") {
    // Legacy test call sites exercise the same internal refresh triggered by HA
    // connection readiness; the panel intentionally has no manual Refresh UI.
    await (element as typeof element & { _refresh: () => Promise<void> })._refresh();
  } else button(element.shadowRoot!, name).click();
  await settle(element);
}
export function field(root: ShadowRoot, label: string): HTMLInputElement | HTMLSelectElement {
  const node = [...root.querySelectorAll("label")].find(l => [...l.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join("").trim() === label);
  expect(node, `field ${label}`).toBeDefined();
  // A label either wraps its control or names it with `for`.
  return node!.querySelector("input,select") ?? (node!.getRootNode() as ShadowRoot).getElementById(node!.htmlFor) as HTMLInputElement | HTMLSelectElement;
}
export async function fill(element: { shadowRoot: ShadowRoot | null; updateComplete: Promise<unknown> }, label: string, value: string): Promise<void> {
  const input = field(element.shadowRoot!, label); input.value = value; input.dispatchEvent(new Event(input.tagName === "SELECT" ? "change" : "input", { bubbles: true })); await settle(element);
}
export function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
