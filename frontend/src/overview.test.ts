import { afterEach, describe, expect, it, vi } from "vitest";
import "./views/overview.js";
import { SmartPlantsPanel } from "./panel.js";
import { createLocalizer } from "./localize.js";
import type { PlantOverview } from "./overview-model.js";
import { harness, overviewFor, overviewOf, panelText, role, sample, settle } from "./test-helpers.js";
import type { PlantRecord } from "./types.js";
import type { SmartPlantsOverview } from "./views/overview.js";

const now = Date.parse("2026-09-28T12:00:00Z");
const plant = (id: string, name: string, extra: Partial<PlantRecord> = {}): PlantRecord => ({ ...structuredClone(sample), id, name, ...extra });
const withMoisture = (p: PlantRecord): PlantRecord => ({ ...p, roles: { moisture: { ...role, sources: [{ entity_id: `sensor.mock_${p.id}_moisture`, registry_id: null }] } } });

const basil = withMoisture(plant("basil", "Basil", { category: "Herbs", tags: ["Edible"], species: { provider: "openplantbook", snapshot: { ...structuredClone(sample.species?.snapshot ?? null), provider: "openplantbook", provider_id: null, provider_ref: null, fetched_at: "2026-09-01T00:00:00Z", locale: "en", source_status: "provider", attribution: "OpenPlantBook", common_name: "Basil", latin_name: "Ocimum basilicum", category: null, confidence: null, care_text: {}, field_sources: {}, threshold_defaults: {} } } }));
const monstera = withMoisture(plant("monstera", "Monstera"));
const lily = plant("lily", "Peace Lily");
const plants = [basil, monstera, lily];
const overview: Record<string, PlantOverview> = {
  basil: { ...overviewFor(basil), status: "needs_water", problems: [{ role: "moisture", kind: "needs_water" }], roles: { moisture: { value: 34, unit: "%", state: "low", range: { min: 60, target: 70, max: 85 }, last_reported: "2026-09-28T11:58:00+00:00", sources: ["sensor.mock_basil_moisture"] }, temperature: { value: 23.1, unit: "°C", state: "ok", range: { min: 15, target: null, max: 30 }, last_reported: null, sources: ["sensor.mock_kitchen_temperature"] } }, last_watered_at: "2026-09-24T12:00:00+00:00" },
  monstera: { ...overviewFor(monstera), status: "too_wet", problems: [{ role: "moisture", kind: "too_wet" }], roles: { moisture: { value: 74, unit: "%", state: "high", range: { min: 30, target: 45, max: 60 }, last_reported: null, sources: ["sensor.mock_monstera_moisture"] } } },
  lily: overviewFor(lily),
};

async function mountView(props: Partial<SmartPlantsOverview> = {}): Promise<SmartPlantsOverview> {
  const el = document.createElement("smart-plants-overview");
  Object.assign(el, { plants, overview, areaNames: { basil: "Kitchen", monstera: "Living Room", lily: "Bedroom" }, now, ...props });
  document.body.append(el); await settle(el); return el;
}
const q = (el: SmartPlantsOverview, selector: string) => el.shadowRoot!.querySelector<HTMLElement>(selector);
const qa = (el: SmartPlantsOverview, selector: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(selector)];
const cardNames = (el: SmartPlantsOverview) => qa(el, ".card .name").map(n => n.textContent?.trim());
const tile = (el: SmartPlantsOverview, label: string) => qa(el, ".tile").find(t => t.querySelector(".lbl")?.textContent === label)!;

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

describe("overview view", () => {
  it("counts statuses in the summary tiles and filters with them", async () => {
    const el = await mountView();
    expect(qa(el, ".tile").map(t => `${t.querySelector(".lbl")!.textContent} ${t.querySelector(".num")!.textContent}`)).toEqual(["All plants 3", "Needs water 1", "Problems 1", "Sensor issues 1"]);
    expect(tile(el, "All plants").getAttribute("aria-pressed")).toBe("true");
    tile(el, "Needs water").click(); await settle(el);
    expect(tile(el, "Needs water").getAttribute("aria-pressed")).toBe("true");
    expect(cardNames(el)).toEqual(["Basil"]);
    expect(q(el, ".countline [role=status]")!.textContent).toBe("1 of 3 plants · Needs water");
    tile(el, "Needs water").click(); await settle(el);
    expect(cardNames(el)).toHaveLength(3);
  });
  it("puts plants that need attention first and can sort by name or group by area", async () => {
    const el = await mountView();
    expect(cardNames(el)).toEqual(["Basil", "Monstera", "Peace Lily"]);
    q(el, "ha-dropdown")!.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "name" } } })); await settle(el);
    expect(cardNames(el)).toEqual(["Basil", "Monstera", "Peace Lily"]);
    expect(q(el, "button.pill")!.textContent).toContain("Name");
    expect(q(el, 'ha-dropdown-item[value="name"]')!.hasAttribute("checked")).toBe(true);
    expect(q(el, 'ha-dropdown-item[value="attention"]')!.hasAttribute("checked")).toBe(false);
    q(el, "ha-dropdown")!.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "area" } } })); await settle(el);
    expect(qa(el, ".group-heading").map(h => h.textContent!.replace(/\s+/g, " ").trim())).toEqual(["Bedroom · 1", "Kitchen · 1", "Living Room · 1"]);
  });
  it("searches species and tags and offers a way back from no results", async () => {
    const el = await mountView();
    const input = q(el, "input[type=search]") as HTMLInputElement;
    input.value = "ocimum"; input.dispatchEvent(new Event("input")); await settle(el);
    expect(cardNames(el)).toEqual(["Basil"]);
    input.value = "cactus"; input.dispatchEvent(new Event("input")); await settle(el);
    expect(q(el, "sp-empty-state")!.getAttribute("heading") ?? (q(el, "sp-empty-state") as unknown as { heading: string }).heading).toBe("No plants match");
    expect(q(el, "sp-empty-state")!.textContent).toContain("No plant matches “cactus”.");
    qa(el, "button").find(b => b.textContent?.trim() === "Show all plants")!.click(); await settle(el);
    expect(cardNames(el)).toHaveLength(3);
  });
  it("renders a card per plant with status, readings and last watering", async () => {
    const el = await mountView();
    const card = qa(el, ".card")[0]!;
    expect(card.querySelector(".sub")!.textContent).toContain("Kitchen");
    expect(card.querySelector(".sub i")!.textContent).toBe("Ocimum basilicum");
    const chip = card.querySelector("sp-status-chip") as HTMLElement & { status: string; label: string };
    expect(chip.status).toBe("needs_water"); expect(chip.label).toBe("Needs water");
    expect(card.querySelector(".reason")!.textContent).toBe("Soil moisture 34% is below the minimum of 60%");
    expect((card.querySelector("sp-moisture-bar") as HTMLElement & { value: number }).value).toBe(34);
    expect((card.querySelector("sp-reading-chip") as HTMLElement & { role: string }).role).toBe("temperature");
    expect(card.querySelector(".last")!.textContent).toContain("Watered 4 days ago");
    expect(card.querySelector(".tonal")!.getAttribute("aria-label")).toBe("Log watering for Basil");
    expect(card.textContent).not.toContain("Herbs");
    expect(card.textContent).not.toContain("/100");
  });
  it("offers sensor assignment on a plant without sensors", async () => {
    const el = await mountView(); const opened = vi.fn();
    el.addEventListener("open-plant", e => opened((e as CustomEvent).detail));
    const card = qa(el, ".card").find(c => c.textContent!.includes("Peace Lily"))!;
    expect(card.querySelector(".empty-box")!.textContent).toContain("No sensors assigned yet");
    (card.querySelector(".empty-box button") as HTMLButtonElement).click();
    expect(opened).toHaveBeenCalledWith({ plantId: "lily", section: "sensors" });
  });
  it("emits open, watering and add events", async () => {
    const el = await mountView(); const events: string[] = [];
    for (const type of ["open-plant", "log-watering", "add-plant"]) el.addEventListener(type, e => events.push(`${type}:${JSON.stringify((e as CustomEvent).detail ?? null)}`));
    (q(el, ".card .name") as HTMLButtonElement).click();
    (q(el, ".card .tonal") as HTMLButtonElement).click();
    (q(el, ".fab") as HTMLButtonElement).click();
    expect(events).toEqual(['open-plant:{"plantId":"basil"}', 'log-watering:{"plantId":"basil"}', "add-plant:null"]);
  });
  it("disables watering while it is saved and when the backend is unavailable", async () => {
    const el = await mountView({ watering: new Set(["basil"]) });
    expect((q(el, ".card .tonal") as HTMLButtonElement).disabled).toBe(true);
    el.blocked = true; await settle(el);
    expect(qa(el, ".card .tonal").every(b => (b as HTMLButtonElement).disabled)).toBe(true);
    expect((q(el, ".fab") as HTMLButtonElement).disabled).toBe(true);
  });
  it("renders German labels", async () => {
    const el = await mountView({ l: createLocalizer({ language: "de" }) });
    expect(qa(el, ".tile .lbl").map(t => t.textContent)).toEqual(["Alle Pflanzen", "Braucht Wasser", "Probleme", "Sensorprobleme"]);
    expect(q(el, ".card .reason")!.textContent).toBe("Bodenfeuchte 34 % liegt unter dem Minimum von 60 %");
  });
});

// The backend reply for care/add_watering: the event is stored on the plant at the next revision.
function wateringReply(planted: PlantRecord, msg: Record<string, unknown>, id: string) {
  const occurred = String(msg.occurred_at);
  const event = { schema_version: 1 as const, id, kind: "watering" as const, provenance: "manual" as const, occurred_at: occurred, local_date: occurred.slice(0, 10), created_at: "2026-09-28T12:00:00+00:00", updated_at: "2026-09-28T12:00:00+00:00", payload: { note: null } };
  return { plant: { ...planted, revision: Number(msg.expected_revision) + 1, care_events: [event] }, event, summary: { watering_count: 1, last_watered_at: occurred, last_watered_local_date: event.local_date } };
}

describe("panel watering from the overview", () => {
  async function mountPanel(handler?: (msg: Record<string, unknown>) => unknown) {
    const planted = withMoisture(structuredClone(sample));
    const h = harness([planted], handler);
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el); await settle(el);
    await vi.waitFor(() => { expect(overviewOf(el).shadowRoot!.querySelector(".card")).not.toBeNull(); });
    await vi.waitFor(() => { expect(h.calls.some(c => c.type === "smart_plants/plants/overview")).toBe(true); });
    await settle(overviewOf(el));
    return { el, h, planted };
  }
  const waterButton = (el: SmartPlantsPanel) => overviewOf(el).shadowRoot!.querySelector<HTMLButtonElement>(".card .tonal")!;

  it("loads status for all plants with one overview call", async () => {
    const { el, h } = await mountPanel();
    expect(h.calls.filter(c => c.type === "smart_plants/plants/overview")).toHaveLength(1);
    expect(h.calls.filter(c => c.type === "smart_plants/moisture/evaluation")).toHaveLength(0);
    await vi.waitFor(() => { expect(panelText(el)).toContain("Healthy"); });
  });
  it("logs a watering and offers Undo in Home Assistant's toast", async () => {
    let current: PlantRecord | null = null;
    const { el, h, planted } = await mountPanel(msg => {
      if (msg.type === "smart_plants/plants/list" && current) return { plants: [current] };
      if (msg.type === "smart_plants/care/add_watering") { const reply = wateringReply(planted, msg, "evt-1"); current = reply.plant; return reply; }
      if (msg.type === "smart_plants/care/delete") { current = { ...planted, revision: Number(msg.expected_revision) + 1, care_events: [] }; return { plant: current, summary: { watering_count: 0, last_watered_at: null, last_watered_local_date: null } }; }
      return undefined;
    });
    const toasts: { message: string; action?: { text: string; action: () => void } }[] = [];
    el.addEventListener("hass-notification", e => toasts.push((e as CustomEvent).detail));
    waterButton(el).click();
    await vi.waitFor(() => { expect(toasts).toHaveLength(1); });
    const add = h.calls.find(c => c.type === "smart_plants/care/add_watering")!;
    expect(add).toMatchObject({ plant_id: planted.id, expected_revision: 1, note: null });
    expect(String(add.occurred_at)).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
    expect(toasts[0]!.message).toBe("Watering logged for Aloe");
    expect(toasts[0]!.action!.text).toBe("Undo");
    toasts[0]!.action!.action();
    await vi.waitFor(() => { expect(toasts).toHaveLength(2); });
    expect(h.calls.find(c => c.type === "smart_plants/care/delete")).toMatchObject({ plant_id: planted.id, expected_revision: 2, event_id: "evt-1" });
    expect(toasts[1]!.message).toBe("Watering removed for Aloe");
  });
  it("retries once with the refreshed revision after a conflict", async () => {
    let attempts = 0;
    const { el, h, planted } = await mountPanel(msg => {
      if (msg.type === "smart_plants/care/add_watering") {
        attempts++;
        if (attempts === 1) return Promise.reject({ code: "revision_conflict", message: "changed" });
        return wateringReply(planted, msg, "evt-2");
      }
      return undefined;
    });
    waterButton(el).click();
    await vi.waitFor(() => { expect(h.calls.filter(c => c.type === "smart_plants/care/add_watering")).toHaveLength(2); });
    expect(h.calls.filter(c => c.type === "smart_plants/care/add_watering")).toHaveLength(2);
    expect(panelText(el)).not.toContain("changed elsewhere");
  });
  it("shows an error when watering fails for another reason", async () => {
    const { el } = await mountPanel(msg => msg.type === "smart_plants/care/add_watering" ? Promise.reject({ code: "not_found", message: "gone" }) : undefined);
    waterButton(el).click();
    await vi.waitFor(() => { expect(el.shadowRoot!.querySelector(".error")?.textContent).toContain("Plant or species not found"); });
  });
  it("keeps edits possible when the status read fails", async () => {
    const { el } = await mountPanel(msg => msg.type === "smart_plants/plants/overview" ? Promise.reject({ code: "unknown_error", message: "boom" }) : undefined);
    await vi.waitFor(() => { expect(el.shadowRoot!.querySelector(".error")?.textContent).toContain("Plant status is unavailable"); });
    expect(overviewOf(el).shadowRoot!.querySelector(".card")).not.toBeNull();
  });
});
