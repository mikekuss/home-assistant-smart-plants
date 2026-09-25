import { afterEach, describe, expect, it } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import { click, deferred, harness, sample, settle } from "./test-helpers.js";
import type { CareEvent } from "./types.js";

afterEach(() => document.body.replaceChildren());

describe("manual watering", () => {
  it("ignores an older history reply that arrives after a refresh", async () => {
    const first = deferred<unknown>();
    const event: CareEvent = { schema_version: 1, id: "e6e6553a-f34c-4d88-864c-c94a74f97dfa", kind: "watering", provenance: "manual", occurred_at: "2026-01-01T00:30:00+02:00", local_date: "2026-01-01", created_at: "2026-01-03T00:00:00Z", updated_at: "2026-01-03T00:00:00Z", payload: { note: "Current entry" } };
    let reads = 0;
    const h = harness([structuredClone(sample)], msg => {
      if (msg.type === "smart_plants/care/list") {
        if (++reads === 1) return first.promise;
        return { revision: 1, events: [event], summary: { watering_count: 1, last_watered_at: event.occurred_at, last_watered_local_date: event.local_date } };
      }
      return undefined;
    });
    const panel = new SmartPlantsPanel(); panel.hass = h.hass; document.body.append(panel);
    await settle(panel); await click(panel, "Aloe"); await click(panel, "Care history");
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
        const event: CareEvent = { schema_version: 1, id: "e6e6553a-f34c-4d88-864c-c94a74f97dfa", kind: msg.kind as CareEvent["kind"], provenance: "manual", occurred_at: msg.occurred_at as string, local_date: String(msg.occurred_at).slice(0, 10), created_at: "2026-09-24T12:00:00Z", updated_at: "2026-09-24T12:00:00Z", payload: msg.payload as CareEvent["payload"] };
        plant.care_events!.push(event); plant.revision++;
        return { plant: structuredClone(plant), event, summary: { watering_count: 1, last_watered_at: event.occurred_at, last_watered_local_date: event.local_date } };
      }
      return undefined;
    });
    const panel = new SmartPlantsPanel(); panel.hass = h.hass; document.body.append(panel);
    await settle(panel); await click(panel, "Aloe");
    const healthBefore = panel.shadowRoot?.querySelector(".overview-metrics")?.textContent;
    await click(panel, "Care history"); await settle(panel);
    expect(panel.shadowRoot?.textContent).toContain("No care recorded yet.");
    const when = panel.shadowRoot!.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
    when.value = "2026-01-02T11:15"; when.dispatchEvent(new Event("input", { bubbles: true }));
    const note = [...panel.shadowRoot!.querySelectorAll("label")].find(label => label.textContent?.includes("Note (optional)"))!.querySelector("input")!;
    note.value = "Watered by hand"; note.dispatchEvent(new Event("input", { bubbles: true }));
    await settle(panel); await click(panel, "Record care"); await settle(panel);
    expect(h.calls.filter(c => c.type === "smart_plants/care/add" )).toHaveLength(1);
    expect(panel.shadowRoot?.textContent).toContain("Watered by hand");
    expect(panel.shadowRoot?.textContent).toContain("1 watering events");
    await click(panel, "Overview");
    expect(panel.shadowRoot?.querySelector(".overview-metrics")?.textContent).toBe(healthBefore);
    await click(panel, "Care history");
    note.value = "Retry me"; note.dispatchEvent(new Event("input", { bubbles: true }));
    await settle(panel);
    plant.revision++; // another admin edited this plant
    await click(panel, "Refresh"); await settle(panel);
    expect(panel.shadowRoot?.textContent).toContain("Review changes from another session");
    expect(note.value).toBe("Retry me");
    expect(plant.care_events).toHaveLength(1);
  });
});
