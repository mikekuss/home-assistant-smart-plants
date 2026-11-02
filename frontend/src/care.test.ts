import { afterEach, describe, expect, it } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import { click, deferred, harness, sample, settle } from "./test-helpers.js";
import type { CareEvent, PlantRecord } from "./types.js";

afterEach(() => document.body.replaceChildren());

describe("manual watering", () => {
  it("ignores an older history reply that arrives after a refresh", async () => {
    const first = deferred<unknown>();
    const event: CareEvent = { schema_version: 2, id: "e6e6553a-f34c-4d88-864c-c94a74f97dfa", kind: "watering", provenance: "manual", task_id: null, occurred_at: "2026-01-01T00:30:00+02:00", local_date: "2026-01-01", created_at: "2026-01-03T00:00:00Z", updated_at: "2026-01-03T00:00:00Z", payload: { note: "Current entry" } };
    let reads = 0;
    const h = harness([structuredClone(sample)], msg => {
      if (msg.type === "smart_plants/care/list") {
        if (++reads === 1) return first.promise;
        return { revision: 1, events: [event], summary: { watering_count: 1, last_watered_at: event.occurred_at, last_watered_local_date: event.local_date } };
      }
      return undefined;
    });
    const panel = new SmartPlantsPanel(); panel.hass = h.hass; document.body.append(panel);
    await settle(panel); await click(panel, "Aloe"); await click(panel, "Care");
    await click(panel, "Refresh"); await settle(panel);
    expect(panel.shadowRoot?.textContent).toContain("Current entry");
    first.resolve({ revision: 1, events: [], summary: { watering_count: 0, last_watered_at: null, last_watered_local_date: null } });
    await settle(panel);
    expect(panel.shadowRoot?.textContent).toContain("Current entry");
    expect(panel.shadowRoot?.textContent).not.toContain("No care recorded yet.");
  });
  it("records a dated event, renders history and retains its note across a revision conflict", async () => {
    const plant = structuredClone(sample);
    plant.care_events = [];
    const h = harness([plant], msg => {
      if (msg.type === "smart_plants/care/add") {
        if (msg.expected_revision !== plant.revision) throw { code: "revision_conflict" };
        const event: CareEvent = { schema_version: 2, id: "e6e6553a-f34c-4d88-864c-c94a74f97dfa", kind: msg.kind as CareEvent["kind"], provenance: "manual", task_id: null, occurred_at: msg.occurred_at as string, local_date: String(msg.occurred_at).slice(0, 10), created_at: "2026-09-24T12:00:00Z", updated_at: "2026-09-24T12:00:00Z", payload: msg.payload as CareEvent["payload"] };
        plant.care_events!.push(event); plant.revision++;
        return { plant: structuredClone(plant), event, summary: { watering_count: 1, last_watered_at: event.occurred_at, last_watered_local_date: event.local_date } };
      }
      return undefined;
    });
    const panel = new SmartPlantsPanel(); panel.hass = h.hass; document.body.append(panel);
    await settle(panel); await click(panel, "Aloe");
    const readingsBefore = panel.shadowRoot?.querySelector(".keyreads")?.textContent;
    await click(panel, "Care"); await settle(panel);
    expect(panel.shadowRoot?.textContent).toContain("No care recorded yet.");
    await click(panel, "Log care");
    const when = panel.shadowRoot!.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
    when.value = "2026-01-02T11:15"; when.dispatchEvent(new Event("input", { bubbles: true }));
    let note = [...panel.shadowRoot!.querySelectorAll("label")].find(label => label.textContent?.includes("Note (optional)"))!.querySelector("input")!;
    note.value = "Watered by hand"; note.dispatchEvent(new Event("input", { bubbles: true }));
    await settle(panel); await click(panel, "Record care"); await settle(panel);
    expect(h.calls.filter(c => c.type === "smart_plants/care/add" )).toHaveLength(1);
    expect(panel.shadowRoot?.textContent).toContain("Watered by hand");
    expect(panel.shadowRoot?.textContent).toContain("1 watering event.");
    await click(panel, "Overview");
    expect(panel.shadowRoot?.querySelector(".keyreads")?.textContent).toBe(readingsBefore);
    await click(panel, "Care");
    note = [...panel.shadowRoot!.querySelectorAll("label")].find(label => label.textContent?.includes("Note (optional)"))!.querySelector("input")!;
    note.value = "Retry me"; note.dispatchEvent(new Event("input", { bubbles: true }));
    await settle(panel);
    plant.revision++; plant.category = "succulent"; // another admin edited this plant
    await click(panel, "Refresh"); await settle(panel);
    expect(panel.shadowRoot?.textContent).toContain("This plant was changed somewhere else");
    note = [...panel.shadowRoot!.querySelectorAll("label")].find(label => label.textContent?.includes("Note (optional)"))!.querySelector("input")!;
    expect(note.value).toBe("Retry me");
    expect(plant.care_events).toHaveLength(1);
  });
});

function careBackend(plant: PlantRecord, history: () => unknown = () => ({ revision: plant.revision, events: plant.care_events ?? [], summary: { watering_count: 0, last_watered_at: null, last_watered_local_date: null } })) {
  return harness([plant], msg => {
    if (msg.type === "smart_plants/care/list") return history();
    if (msg.type === "smart_plants/care/add" || msg.type === "smart_plants/care/edit") {
      const event: CareEvent = { schema_version: 2, id: "e6e6553a-f34c-4d88-864c-c94a74f97dfa", kind: msg.kind as CareEvent["kind"], provenance: "manual", task_id: null, occurred_at: msg.occurred_at as string, local_date: String(msg.occurred_at).slice(0, 10), created_at: "2026-09-24T12:00:00Z", updated_at: "2026-09-24T12:00:00Z", payload: msg.payload as CareEvent["payload"] };
      plant.care_events = [event]; plant.revision++;
      return { plant: structuredClone(plant), event, summary: { watering_count: 0, last_watered_at: null, last_watered_local_date: null } };
    }
    return undefined;
  });
}
const labelText = (label: Element) => [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join("").trim();
const input = (panel: SmartPlantsPanel, label: string) => [...panel.shadowRoot!.querySelectorAll("#care-form label")].find(item => labelText(item) === label)!.querySelector<HTMLInputElement | HTMLSelectElement>("input, select")!;
async function type(panel: SmartPlantsPanel, control: HTMLInputElement | HTMLSelectElement, value: string) {
  control.value = value; control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? "change" : "input", { bubbles: true })); await settle(panel);
}
async function openCareForm(panel: SmartPlantsPanel, kind: CareEvent["kind"]) {
  await settle(panel); await click(panel, "Aloe"); await click(panel, "Care"); await click(panel, "Log care");
  await type(panel, panel.shadowRoot!.querySelector<HTMLSelectElement>("#care-form select")!, kind);
  await type(panel, panel.shadowRoot!.querySelector<HTMLInputElement>('#care-form input[type="datetime-local"]')!, "2026-01-02T11:15");
}
const mounted = (h: ReturnType<typeof careBackend>) => { const panel = new SmartPlantsPanel(); panel.hass = h.hass; document.body.append(panel); return panel; };
const fresh = (): PlantRecord => ({ ...structuredClone(sample), care_events: [] });

describe("care form limits", () => {
  it("saves notes up to 1,000 characters and stops at 1,001", async () => {
    const h = careBackend(fresh()); const panel = mounted(h);
    await openCareForm(panel, "note");
    await type(panel, input(panel, "Note text"), "x".repeat(1001));
    await click(panel, "Record care");
    expect(h.calls.some(c => c.type === "smart_plants/care/add")).toBe(false);
    await type(panel, input(panel, "Note text"), "x".repeat(1000));
    await click(panel, "Record care"); await settle(panel);
    expect(h.calls.filter(c => c.type === "smart_plants/care/add").map(c => (c.payload as { text: string }).text.length)).toEqual([1000]);
  });

  it("saves an optional note longer than 120 characters but checks short details", async () => {
    const h = careBackend(fresh()); const panel = mounted(h);
    await openCareForm(panel, "pruning");
    await type(panel, input(panel, "Plant part"), "y".repeat(121));
    await type(panel, input(panel, "Note (optional)"), "z".repeat(300));
    await click(panel, "Record care");
    expect(h.calls.some(c => c.type === "smart_plants/care/add")).toBe(false);
    await type(panel, input(panel, "Plant part"), "y".repeat(120));
    await click(panel, "Record care"); await settle(panel);
    expect(h.calls.filter(c => c.type === "smart_plants/care/add").map(c => c.payload)).toEqual([{ part: "y".repeat(120), note: "z".repeat(300) }]);
  });

  it("edits a watering whose note is longer than 120 characters", async () => {
    const event: CareEvent = { schema_version: 2, id: "e6e6553a-f34c-4d88-864c-c94a74f97dfa", kind: "watering", provenance: "manual", task_id: null, occurred_at: "2026-01-01T10:00:00+00:00", local_date: "2026-01-01", created_at: "2026-01-01T10:00:00Z", updated_at: "2026-01-01T10:00:00Z", payload: { note: "n".repeat(400) } };
    const plant = { ...structuredClone(sample), care_events: [event] };
    const h = careBackend(plant, () => ({ revision: plant.revision, events: plant.care_events, summary: { watering_count: 1, last_watered_at: plant.care_events[0]!.occurred_at, last_watered_local_date: plant.care_events[0]!.local_date } }));
    const panel = mounted(h);
    await settle(panel); await click(panel, "Aloe"); await click(panel, "Care");
    panel.shadowRoot!.querySelector(".care-history ha-dropdown")!.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "edit" } } })); await settle(panel); await settle(panel);
    await click(panel, "Save care changes"); await settle(panel);
    expect(h.calls.filter(c => c.type === "smart_plants/care/edit")).toHaveLength(1);
  });

  it("shows one Unit control for fertilizing and saves both units", async () => {
    const h = careBackend(fresh()); const panel = mounted(h);
    await openCareForm(panel, "fertilizing");
    const units = [...panel.shadowRoot!.querySelectorAll("#care-form label")].filter(label => labelText(label).startsWith("Unit"));
    expect(units).toHaveLength(1);
    expect(units[0]!.querySelector("select")).not.toBeNull();
    await type(panel, input(panel, "Amount"), "5");
    await type(panel, input(panel, "Unit"), "mL");
    await click(panel, "Record care"); await settle(panel);
    await click(panel, "Log care");
    await type(panel, panel.shadowRoot!.querySelector<HTMLSelectElement>("#care-form select")!, "fertilizing");
    await type(panel, input(panel, "Amount"), "3");
    await type(panel, input(panel, "Unit"), "g");
    await click(panel, "Record care"); await settle(panel);
    expect(h.calls.filter(c => c.type === "smart_plants/care/add").map(c => (c.payload as { unit: string }).unit)).toEqual(["mL", "g"]);
  });
});

describe("care history errors", () => {
  it("shows a failed read with a retry on both tabs instead of loading", async () => {
    const plant = fresh();
    let fail = true;
    const h = careBackend(plant, () => { if (fail) throw { code: "integration_not_loaded" }; return { revision: plant.revision, events: [], summary: { watering_count: 0, last_watered_at: null, last_watered_local_date: null } }; });
    const panel = mounted(h);
    await settle(panel); await click(panel, "Aloe"); await settle(panel);
    const recent = () => panel.shadowRoot!.querySelector("section[aria-labelledby=recent-heading]")!;
    expect(recent().textContent).not.toContain("Loading care history");
    expect(recent().querySelector("[role=alert]")?.textContent).toContain("Care history couldn't be loaded");
    await click(panel, "Care");
    expect(panel.shadowRoot!.querySelector(".care-history [role=alert]")?.textContent).toContain("Care history couldn't be loaded");
    expect(panel.shadowRoot!.querySelector(".care-history")!.textContent).not.toContain("Loading care history");
    fail = false;
    const retry = [...panel.shadowRoot!.querySelectorAll<HTMLButtonElement>(".care-history button")].find(b => b.textContent?.trim() === "Try again")!;
    retry.focus(); retry.click(); await settle(panel); await settle(panel);
    expect(panel.shadowRoot!.querySelector(".care-history")!.textContent).toContain("No care recorded yet.");
    expect(panel.shadowRoot!.activeElement?.tagName).toBe("H1");
  });
});
