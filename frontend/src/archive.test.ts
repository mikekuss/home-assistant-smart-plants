import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel, retiredSensors } from "./panel.js";
import { ENGLISH, createLocalizer } from "./localize.js";
import { durationText, monthsBetween } from "./views/archive.js";
import type { SmartPlantsArchive } from "./views/archive.js";
import { button, click, harness, sample, settle } from "./test-helpers.js";
import type { ArchivedPlantSummary, ArchivedPlantView, HomeAssistantLike, PlantRecord, RestoreCheck } from "./types.js";

const summary: ArchivedPlantSummary = {
  id: "old", revision: 5, name: "Basil", created_at: "2023-03-20T08:00:00Z", acquired_at: "2023-03-14", archived_at: "2026-11-02T10:00:00Z",
  species: null, category: null, image: null, area_name: "Kitchen", event_count: 2,
};
const view: ArchivedPlantView = {
  ...summary, placement: null, tags: [], sources: { moisture: ["sensor.mock_moisture"] },
  events: [
    { schema_version: 2, id: "e2", kind: "note", provenance: "manual", task_id: null, occurred_at: "2026-11-02T10:00:00Z", local_date: "2026-11-02", created_at: "2026-11-02T10:00:00Z", updated_at: "2026-11-02T10:00:00Z", payload: { text: "Retired" } },
    { schema_version: 2, id: "e1", kind: "watering", provenance: "manual", task_id: null, occurred_at: "2026-10-28T10:00:00Z", local_date: "2026-10-28", created_at: "2026-10-28T10:00:00Z", updated_at: "2026-10-28T10:00:00Z", payload: { note: null } },
  ],
  summary: { watering_count: 1, last_watered_at: "2026-10-28T10:00:00Z", last_watered_local_date: "2026-10-28" },
};
const noConflicts: RestoreCheck = { name_taken: false, suggested_name: "Basil", sources_in_use: [], sources_missing: [], area_missing: false, blocked: null };

function withSensor(plant: PlantRecord): PlantRecord {
  const copy = structuredClone(plant);
  copy.roles = { ...copy.roles!, moisture: { ...copy.roles!.moisture, sources: [{ entity_id: "sensor.mock_moisture", registry_id: null }], primary_entity_id: "sensor.mock_moisture" } };
  return copy;
}
async function mount(hass: HomeAssistantLike): Promise<SmartPlantsPanel> {
  const el = new SmartPlantsPanel(); el.hass = hass; document.body.append(el); await settle(el); return el;
}
function menuValues(el: SmartPlantsPanel): string[] {
  const menu = el.shadowRoot!.querySelector(".panel-appbar ha-dropdown")!;
  return [...menu.querySelectorAll("ha-dropdown-item")].map(item => item.getAttribute("value") ?? "");
}
async function choose(el: SmartPlantsPanel, value: string): Promise<void> {
  el.shadowRoot!.querySelector(".panel-appbar ha-dropdown")!.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value } } }));
  await settle(el);
}
async function archivePage(el: SmartPlantsPanel): Promise<SmartPlantsArchive> {
  const page = el.shadowRoot!.querySelector("smart-plants-archive")!;
  await settle(page); await settle(page);
  return page;
}

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(function (this: HTMLDialogElement) { this.open = true; });
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (this: HTMLDialogElement) { this.open = false; });
});
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

describe("time together", () => {
  it("counts whole months", () => {
    expect(monthsBetween("2023-03-14", "2026-11-02T10:00:00Z")).toBe(43);
    expect(monthsBetween("2026-10-30T00:00:00Z", "2026-11-02T00:00:00Z")).toBe(0);
    expect(monthsBetween("2026-11-02T00:00:00Z", "2026-10-01T00:00:00Z")).toBe(0);
  });
  it("names years and months", () => {
    expect(durationText(ENGLISH, 43)).toBe("3 years, 7 months");
    expect(durationText(ENGLISH, 12)).toBe("1 year");
    expect(durationText(ENGLISH, 1)).toBe("1 month");
    expect(durationText(ENGLISH, 0)).toBe("0 months");
    expect(durationText(createLocalizer({ language: "de" }), 25)).toBe("2 Jahre, 1 Monat");
  });
});

describe("retiring a plant", () => {
  it("keeps the main sensor of each reading for a new plant", () => {
    expect(retiredSensors(withSensor(sample))).toEqual([{ role: "moisture", entity_id: "sensor.mock_moisture" }]);
    expect(retiredSensors(sample)).toEqual([]);
  });

  it("shows the archive menu item only once a plant is retired", async () => {
    const empty = await mount(harness().hass);
    expect(menuValues(empty)).not.toContain("archive");
    document.body.replaceChildren();
    const h = harness([sample], msg => msg.type === "smart_plants/plants/list" ? { plants: [sample], archived_count: 2 } : undefined);
    const el = await mount(h.hass);
    expect(menuValues(el)).toContain("archive");
    expect(el.shadowRoot!.querySelector('ha-dropdown-item[value="archive"] .menu-count')!.textContent).toBe("2");
  });

  it("retires from the delete dialog and offers a new plant with the sensors", async () => {
    const plant = withSensor(sample); let retired = false;
    const toasts: unknown[] = [];
    const h = harness([plant], msg => {
      if (msg.type === "smart_plants/plants/list") return { plants: retired ? [] : [plant], archived_count: retired ? 1 : 0 };
      if (msg.type === "smart_plants/plants/archive") { retired = true; return { archived: { ...summary, id: plant.id } }; }
      return undefined;
    });
    const el = await mount(h.hass);
    el.addEventListener("hass-notification", e => toasts.push((e as CustomEvent).detail));
    await click(el, "Aloe");
    await choose(el, "delete-plant");
    const dialog = el.shadowRoot!.querySelector("dialog")!;
    expect(dialog.textContent).toContain("retire the plant instead");
    button(el.shadowRoot!, "Retire instead").click(); await settle(el);
    expect(el.shadowRoot!.querySelector("dialog h2")!.textContent).toBe("Retire Aloe?");
    expect(el.shadowRoot!.querySelector("dialog")!.textContent).toContain("1 automation uses this plant's entities");
    await click(el, "Retire"); await settle(el); await settle(el);
    expect(h.calls.find(c => c.type === "smart_plants/plants/archive")).toMatchObject({ plant_id: plant.id, expected_revision: plant.revision });
    expect(h.calls.some(c => c.type === "smart_plants/plants/delete")).toBe(false);
    expect(menuValues(el)).toContain("archive");
    expect(toasts).toEqual([expect.objectContaining({ message: "Aloe retired", action: expect.objectContaining({ text: "Add plant with its sensors" }) })]);
  });
});

describe("the archive page", () => {
  function archiveHarness(handler?: (msg: Record<string, unknown>) => unknown) {
    return harness([sample], msg => {
      const custom = handler?.(msg); if (custom !== undefined) return custom;
      if (msg.type === "smart_plants/plants/list") return { plants: [sample], archived_count: 1 };
      if (msg.type === "smart_plants/archive/list") return { plants: [summary] };
      if (msg.type === "smart_plants/archive/get") return { plant: view };
      if (msg.type === "smart_plants/archive/restore_check") return noConflicts;
      return undefined;
    });
  }

  it("lists retired plants and shows one with its dates and care history", async () => {
    const el = await mount(archiveHarness().hass);
    await choose(el, "archive");
    expect(el.shadowRoot!.querySelector("h1")!.textContent).toBe("Retired plants");
    let page = await archivePage(el);
    const row = page.shadowRoot!.querySelector<HTMLButtonElement>(".archive-row")!;
    expect(row.textContent).toContain("Basil");
    expect(row.textContent).toContain("2023");
    row.click(); await settle(el); page = await archivePage(el);
    const text = page.shadowRoot!.textContent!;
    expect(text).toContain("Kitchen");
    expect(text).toContain("Monitored for");
    expect(text).toContain("3 years, 7 months");
    expect(page.shadowRoot!.querySelectorAll(".list .li")).toHaveLength(2);
    expect(text).not.toContain("With you");
  });

  it("restores without sensors other plants use unless asked", async () => {
    const restored = { ...structuredClone(sample), id: "old", name: "Basil 2" };
    const h = archiveHarness(msg => {
      if (msg.type === "smart_plants/archive/restore_check") return { ...noConflicts, name_taken: true, suggested_name: "Basil 2", sources_in_use: [{ role: "moisture", entity_id: "sensor.mock_moisture", plants: ["Basil"] }] };
      if (msg.type === "smart_plants/archive/restore") return { plant: restored };
      return undefined;
    });
    const el = await mount(h.hass);
    await choose(el, "archive");
    let page = await archivePage(el);
    page.shadowRoot!.querySelector<HTMLButtonElement>(".archive-row")!.click(); await settle(el); page = await archivePage(el);
    button(page.shadowRoot!, "Restore").click(); await settle(page); await settle(page);
    const dialog = page.shadowRoot!.querySelector("dialog")!;
    expect(dialog.textContent).toContain("A plant named Basil already exists.");
    expect(page.shadowRoot!.querySelector<HTMLInputElement>("#restore-name")!.value).toBe("Basil 2");
    expect(dialog.textContent).toContain("sensor.mock_moisture → Basil");
    button(page.shadowRoot!, "Restore without them").click(); await settle(page); await settle(el);
    expect(h.calls.find(c => c.type === "smart_plants/archive/restore")).toMatchObject({ plant_id: "old", expected_revision: 5, name: "Basil 2", include_sources_in_use: false });
  });

  it("deletes a retired plant for good after confirming", async () => {
    let deleted = false;
    const h = archiveHarness(msg => {
      if (msg.type === "smart_plants/archive/delete") { deleted = true; return {}; }
      if (msg.type === "smart_plants/plants/list") return { plants: [sample], archived_count: deleted ? 0 : 1 };
      return undefined;
    });
    const el = await mount(h.hass);
    await choose(el, "archive");
    let page = await archivePage(el);
    page.shadowRoot!.querySelector<HTMLButtonElement>(".archive-row")!.click(); await settle(el); page = await archivePage(el);
    button(page.shadowRoot!, "Delete for good").click(); await settle(page);
    expect(page.shadowRoot!.querySelector("dialog h2")!.textContent).toBe("Delete Basil for good?");
    expect(h.calls.some(c => c.type === "smart_plants/archive/delete")).toBe(false);
    [...page.shadowRoot!.querySelectorAll<HTMLButtonElement>("dialog button")].find(b => b.textContent === "Delete for good")!.click();
    await settle(page); await settle(el); await settle(el);
    expect(h.calls.find(c => c.type === "smart_plants/archive/delete")).toMatchObject({ plant_id: "old", expected_revision: 5 });
    expect(el.shadowRoot!.querySelector("smart-plants-archive")).toBeNull();
    expect(menuValues(el)).not.toContain("archive");
  });
});
