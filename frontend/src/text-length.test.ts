import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api.js";
import { careNote, presetDraft, validateDraft } from "./care-plan.js";
import { validateTaxonomy } from "./model.js";
import { parseOverview } from "./overview-model.js";
import { SmartPlantsPanel } from "./panel.js";
import { charCount, inputMaxLength, sliceChars } from "./text.js";
import { harness, overviewFor, sample, settle } from "./test-helpers.js";
import { validCareEvent, validPlant } from "./validation.js";
import type { CareEvent, CareTask, PlantRecord } from "./types.js";

// The limits the backend enforces, shared with tests/test_text_length_limits.py.
// Both count Unicode code points; the character is two UTF-16 units in JavaScript.
const FIXTURE = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/text_length_limits.json"), "utf8")) as { character: string; limits: Record<string, number> };
const CHAR = FIXTURE.character;
const full = (field: string, extra = 0) => CHAR.repeat(FIXTURE.limits[field]! + extra);

const event = (kind: CareEvent["kind"], payload: Record<string, unknown>): CareEvent => ({
  schema_version: 2, id: `${kind}-0000-4000-8000-000000000000`.slice(0, 36), kind, provenance: "action", task_id: null,
  occurred_at: "2026-06-01T08:00:00Z", local_date: "2026-06-01", created_at: "2026-06-01T08:00:00Z", updated_at: "2026-06-01T08:00:00Z", payload,
} as CareEvent);
const task = (extra: Partial<CareTask> = {}): CareTask => ({
  id: "0123456789abcdef0123456789abcdef", type: "custom", name: full("task_name"), schedule: { kind: "interval", every: 2, unit: "weeks", growing_season_only: false },
  instructions: full("task_instructions"), baseline_done_on: null, last_done_at: null, last_skipped_on: null, created_on: "2026-06-01", ...extra,
});
const plantAtLimits = (): PlantRecord => ({
  ...structuredClone(sample), name: full("plant_name"), tags: [full("tag")], category: full("category"), care_tasks: [task()],
  care_events: [event("watering", { note: full("care_note") }), event("note", { text: full("note_text") }), event("fertilizing", { product: full("care_detail"), amount: null, unit: null, note: null })],
});

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

describe("text limits count characters, as the backend does", () => {
  it("counts a character outside the Basic Multilingual Plane once", () => {
    expect(CHAR.length).toBe(2);
    expect(charCount(CHAR)).toBe(1);
    expect(charCount(full("care_note"))).toBe(500);
    expect(sliceChars(`${CHAR}${CHAR}a`, 2)).toBe(`${CHAR}${CHAR}`);
    // Native maxlength counts UTF-16 units, so it leaves room for every character.
    expect(inputMaxLength(500)).toBeGreaterThanOrEqual(full("care_note").length);
  });

  it("accepts a plant with every text at its limit", () => {
    expect(validPlant(plantAtLimits())).toBe(true);
  });

  it.each([
    ["plant name", (p: PlantRecord) => ({ ...p, name: full("plant_name", 1) })],
    ["tag", (p: PlantRecord) => ({ ...p, tags: [full("tag", 1)] })],
    ["category", (p: PlantRecord) => ({ ...p, category: full("category", 1) })],
    ["task name", (p: PlantRecord) => ({ ...p, care_tasks: [task({ name: full("task_name", 1) })] })],
    ["task instructions", (p: PlantRecord) => ({ ...p, care_tasks: [task({ instructions: full("task_instructions", 1) })] })],
  ])("refuses a %s one character over its limit", (_field, change) => {
    expect(validPlant(change(plantAtLimits()))).toBe(false);
  });

  it("checks care event texts by characters", () => {
    expect(validCareEvent(event("watering", { note: full("care_note") }))).toBe(true);
    expect(validCareEvent(event("watering", { note: full("care_note", 1) }))).toBe(false);
    expect(validCareEvent(event("note", { text: full("note_text") }))).toBe(true);
    expect(validCareEvent(event("note", { text: full("note_text", 1) }))).toBe(false);
  });

  it("keeps an overview task whose name is at its limit", () => {
    const overview = { ...overviewFor(sample), care: [{ task_id: task().id, type: "custom", name: full("task_name"), status: "scheduled", is_due: false, next_due: "2026-07-01", days: 10, window_end: null, resume_on: null }] };
    expect(parseOverview(overview)?.care).toHaveLength(1);
    expect(parseOverview({ ...overview, care: [{ ...overview.care[0], name: full("task_name", 1) }] })).toBeNull();
  });

  it("accepts a retired plant whose name is at its limit", async () => {
    const archived = { id: "plant-9", revision: 2, name: full("plant_name"), created_at: "2026-06-01T08:00:00Z", archived_at: "2026-06-02T08:00:00Z", acquired_at: null, species: null, image: null, area_name: CHAR.repeat(100), event_count: 0 };
    await expect(api.archiveList(harness([], () => ({ plants: [archived] })).hass)).resolves.toEqual([archived]);
  });

  it("lets the editors save text at the limit and refuses one more character", () => {
    const draft = { ...presetDraft("fertilize"), name: full("task_name"), instructions: full("task_instructions") };
    expect(validateDraft(draft, "2026-06-15").errors).toBeNull();
    expect(validateDraft({ ...draft, name: full("task_name", 1), instructions: full("task_instructions", 1) }, "2026-06-15").errors)
      .toEqual({ name: "care_plan.error_name_length", instructions: "care_plan.error_instructions_length" });
    expect(validateTaxonomy(full("category"), [full("tag")])).toBeNull();
    expect(validateTaxonomy(full("category", 1), [])).not.toBeNull();
    expect(validateTaxonomy("", [full("tag", 1)])).not.toBeNull();
  });

  it("cuts species care text at a character boundary", () => {
    const snapshot = { provider: "openplantbook", care_text: { fertilization: `${"a".repeat(3999)}${CHAR}${CHAR}` } };
    const note = careNote({ ...sample, species: { provider: "openplantbook", snapshot } } as unknown as PlantRecord, "fertilize");
    expect(note).toBe(`${"a".repeat(3999)}${CHAR}`);
  });
});

describe("a plant record the panel cannot read", () => {
  it("is named on the overview instead of disappearing silently", async () => {
    const broken = { ...structuredClone(sample), id: "plant-2", name: "Office Aloe", revision: "two" };
    const h = harness([structuredClone(sample), broken as unknown as PlantRecord]);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el); await settle(el);
    expect(el.shadowRoot!.textContent).toContain("1 plant can't be shown because the panel can't read its data. Reload the page; if that doesn't help, check the Home Assistant log.");
  });

  it("is not reported as deleted while it is open", async () => {
    let plants: unknown[] = [structuredClone(sample)];
    const h = harness([], msg => msg.type === "smart_plants/plants/list" ? { plants } : msg.type === "smart_plants/plants/overview" ? { plants: [overviewFor(sample)] } : undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el); await settle(el);
    el.shadowRoot!.querySelector("smart-plants-overview")!.shadowRoot!.querySelector<HTMLButtonElement>("button.name")!.click(); await settle(el);
    plants = [{ ...structuredClone(sample), revision: 2, name: 7 }];
    await (el as unknown as { _refresh(show: boolean): Promise<void> })._refresh(false); await settle(el);
    const text = el.shadowRoot!.textContent!;
    expect(text).not.toContain("This plant was deleted in another session.");
    expect(text).toContain("The panel can't read this plant's data any more. Reload the page; if that doesn't help, check the Home Assistant log.");
  });
});
