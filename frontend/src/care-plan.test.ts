import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import { ENGLISH, createLocalizer } from "./localize.js";
import { careLine, careNote, careOnlyChange, careSuggestions, draftFromTask, lastDone, localDate, matchingTask, monthsInRange, pickMonth, presetDraft, restDraft, restSentence, restTaskChanges, resumeDate, scheduleText, shortDate, taskChanges, taskChip, validateDraft, validateRest } from "./care-plan.js";
import { matchesFilter } from "./overview-model.js";
import type { CareTaskSummary, PlantOverview } from "./overview-model.js";
import type { CareEvent, CareTask, HAEntity, HAState, HomeAssistantLike, PlantRecord, PlantSpecies, RestPeriod } from "./types.js";
import { click, harness, overviewFor, sample, settle } from "./test-helpers.js";

const l = ENGLISH;
const TODAY = "2026-10-19";
const FERTILIZE_ID = "0f8fad5bd9cb469fa16570867728950e";
const PESTS_ID = "7c9e6679742540de944be07fc1f90ae7";
const fertilize: CareTask = { id: FERTILIZE_ID, type: "fertilize", name: null, schedule: { kind: "interval", every: 4, unit: "weeks", growing_season_only: true }, instructions: null, baseline_done_on: null, last_done_at: null, last_skipped_on: null, created_on: "2026-09-01" };
const pests: CareTask = { id: PESTS_ID, type: "pests", name: null, schedule: { kind: "interval", every: 2, unit: "weeks", growing_season_only: false }, instructions: null, baseline_done_on: null, last_done_at: null, last_skipped_on: null, created_on: "2026-09-01" };
const state = (task_id: string, changes: Partial<CareTaskSummary> = {}): CareTaskSummary => ({ task_id, type: "fertilize", name: null, status: "scheduled", is_due: false, next_due: "2026-10-22", days: 3, window_end: null, resume_on: null, ...changes });

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe("care plan wording", () => {
  it("reads schedules back in words", () => {
    expect(scheduleText(l, fertilize.schedule, null)).toBe("Every 4 weeks");
    expect(scheduleText(l, fertilize.schedule, { start_month: 11, end_month: 2 })).toBe("Every 4 weeks · growing season only");
    expect(scheduleText(l, { kind: "interval", every: 1, unit: "days", growing_season_only: false }, null)).toBe("Every day");
    expect(scheduleText(l, { kind: "yearly", start_month: 3, end_month: 4 }, null)).toBe("Once a year, March–April");
    expect(scheduleText(l, { kind: "yearly", start_month: 11, end_month: 11 }, null)).toBe("Once a year, November");
    expect(scheduleText(createLocalizer({ language: "de" }), fertilize.schedule, { start_month: 11, end_month: 2 })).toBe("Alle 4 Wochen · nur in der Wachstumszeit");
  });

  it("labels every task state, with overdue in words and an icon", () => {
    const interval = fertilize.schedule; const yearly = { kind: "yearly" as const, start_month: 3, end_month: 4 };
    expect(taskChip(l, state(FERTILIZE_ID, { status: "overdue", is_due: true, days: 3 }), interval, TODAY)).toEqual({ tone: "overdue", icon: "mdi:alarm", text: "Overdue 3 days" });
    expect(taskChip(l, state(FERTILIZE_ID, { status: "due", is_due: true, days: null }), interval, TODAY).text).toBe("Due today");
    expect(taskChip(l, state(FERTILIZE_ID, { status: "due", is_due: true, window_end: "2027-04-30" }), yearly, TODAY).text).toBe("Due until Apr 30, 2027");
    expect(taskChip(l, state(FERTILIZE_ID, { status: "resting", resume_on: "2027-03-01" }), interval, TODAY)).toMatchObject({ tone: "resting", text: "Resting until Mar 1, 2027" });
    expect(taskChip(l, state(FERTILIZE_ID, { status: "scheduled", days: 1 }), interval, TODAY).text).toBe("Tomorrow");
    expect(taskChip(l, state(FERTILIZE_ID, { status: "scheduled", days: 3 }), interval, TODAY).text).toBe("In 3 days");
    expect(taskChip(l, state(FERTILIZE_ID, { status: "scheduled", days: 21 }), interval, TODAY).text).toBe("In 3 weeks");
    expect(taskChip(l, state(FERTILIZE_ID, { status: "scheduled", days: 150 }), interval, TODAY).text).toBe("In 5 months");
    expect(taskChip(l, state(FERTILIZE_ID, { status: "scheduled", next_due: "2026-12-01" }), yearly, TODAY).text).toBe("From Dec 1");
    expect(taskChip(l, state(FERTILIZE_ID, { status: "missed" }), yearly, TODAY)).toMatchObject({ tone: "later", text: "Missed this year" });
    expect(taskChip(l, state(FERTILIZE_ID, { status: "done" }), yearly, TODAY)).toMatchObject({ tone: "done", text: "Done for this year" });
    expect(taskChip(l, state(FERTILIZE_ID, { status: "skipped" }), yearly, TODAY).text).toBe("Skipped this year");
  });

  it("formats short dates with the year only when it differs", () => {
    expect(shortDate(l, "2026-03-01", TODAY)).toBe("Mar 1");
    expect(shortDate(l, "2027-03-01", TODAY)).toBe("Mar 1, 2027");
  });

  it("uses the Home Assistant time zone for the last done date", () => {
    // 23:30 UTC is already the next day in Berlin.
    expect(localDate("2026-10-18T23:30:00+00:00", "Europe/Berlin")).toBe("2026-10-19");
    expect(localDate("2026-10-18T23:30:00+00:00", "America/New_York")).toBe("2026-10-18");
    expect(lastDone({ ...fertilize, last_done_at: "2026-10-18T23:30:00+00:00", baseline_done_on: "2026-10-01" }, "Europe/Berlin")).toBe("2026-10-19");
    expect(lastDone({ ...fertilize, baseline_done_on: "2026-10-01" }, "Europe/Berlin")).toBe("2026-10-01");
    expect(lastDone(fertilize, "Europe/Berlin")).toBeNull();
  });
});

describe("care task draft", () => {
  it("picks contiguous month ranges, also across New Year", () => {
    let range = pickMonth(null, null, 11);
    expect(range).toEqual({ startMonth: 11, endMonth: 11 });
    range = pickMonth(range.startMonth, range.endMonth, 2);
    expect(range).toEqual({ startMonth: 11, endMonth: 2 });
    expect(monthsInRange(11, 2)).toEqual([11, 12, 1, 2]);
    expect(pickMonth(range.startMonth, range.endMonth, 5)).toEqual({ startMonth: 5, endMonth: 5 });
  });

  it("validates like the backend and reports every problem inline", () => {
    const custom = { ...presetDraft("custom"), every: "0", instructions: "x".repeat(4001), lastDone: "2026-10-20" };
    expect(validateDraft(custom, TODAY).errors).toEqual({ name: "care_plan.error_name_required", every: "care_plan.error_every", instructions: "care_plan.error_instructions_length", lastDone: "care_plan.error_last_done_future" });
    expect(validateDraft({ ...presetDraft("prune"), startMonth: null, endMonth: null }, TODAY).errors).toEqual({ months: "care_plan.error_months" });
    expect(validateDraft({ ...presetDraft("fertilize"), name: "  " }, TODAY).input).toEqual({ task_type: "fertilize", name: null, schedule: { kind: "interval", every: 4, unit: "weeks", growing_season_only: true }, instructions: null, baseline_done_on: null });
    expect(validateDraft({ ...presetDraft("custom"), name: " Mist leaves ", instructions: " Rain water ", lastDone: TODAY }, TODAY).input).toMatchObject({ name: "Mist leaves", instructions: "Rain water", baseline_done_on: TODAY });
  });

  it("sends only changed fields when editing", () => {
    const draft = { ...draftFromTask(fertilize), every: "6" };
    const input = validateDraft(draft, TODAY).input!;
    expect(taskChanges(fertilize, input)).toEqual({ schedule: { kind: "interval", every: 6, unit: "weeks", growing_season_only: true } });
    expect(taskChanges(fertilize, validateDraft(draftFromTask(fertilize), TODAY).input!)).toEqual({});
  });

  it("finds the task a care entry also completes", () => {
    expect(matchingTask([fertilize, pests], "fertilizing")).toBe(fertilize);
    expect(matchingTask([fertilize, pests], "task")).toBeUndefined();
    expect(matchingTask([pests], "pruning")).toBeUndefined();
  });

  it("tells care-only changes apart from edits to the plant", () => {
    const before = { ...sample, care_tasks: [], care_events: [], rest_period: null };
    expect(careOnlyChange(before, { ...before, revision: 2, care_tasks: [fertilize] })).toBe(true);
    expect(careOnlyChange(before, { ...before, revision: 2, rest_period: { start_month: 11, end_month: 2 } })).toBe(true);
    expect(careOnlyChange(before, { ...before, revision: 2, name: "Office Aloe" })).toBe(false);
  });
});

// A small care task backend: every write bumps the revision and returns the
// whole plant, like Home Assistant does.
function careBackend(initial: PlantRecord, states: (plant: PlantRecord) => CareTaskSummary[] = () => [], entities: HAEntity[] = []) {
  let plant = structuredClone(initial);
  let nextEvent = 1;
  const bump = (changes: Partial<PlantRecord>) => { plant = { ...plant, ...changes, revision: plant.revision + 1 }; return structuredClone(plant); };
  const overview = (p: PlantRecord): PlantOverview => ({ ...overviewFor(p), care: states(p) });
  const h = harness([plant], msg => {
    const tasks = plant.care_tasks ?? [];
    switch (msg.type) {
      case "smart_plants/plants/list": return { plants: [plant] };
      case "config/entity_registry/list": return entities;
      case "smart_plants/plants/overview": return { plants: [overview(plant)] };
      case "smart_plants/care/list": {
        const events = plant.care_events ?? [];
        return { revision: plant.revision, events, summary: { watering_count: 0, last_watered_at: null, last_watered_local_date: null } };
      }
      case "smart_plants/care_tasks/create": {
        const task: CareTask = { id: "9b2f3c1d4e5f40718293a4b5c6d7e8f9", type: msg.task_type as CareTask["type"], name: msg.name as string | null, schedule: msg.schedule as CareTask["schedule"], instructions: msg.instructions as string | null, baseline_done_on: msg.baseline_done_on as string | null, last_done_at: null, last_skipped_on: null, created_on: TODAY };
        return { plant: bump({ care_tasks: [...tasks, task] }), task_id: task.id };
      }
      case "smart_plants/care_tasks/update": {
        const changes = Object.fromEntries(["name", "schedule", "instructions", "baseline_done_on"].filter(key => Object.hasOwn(msg, key)).map(key => [key, msg[key]]));
        return { plant: bump({ care_tasks: tasks.map(task => task.id === msg.task_id ? { ...task, ...changes } : task) }) };
      }
      case "smart_plants/plants/set_rest_period": return { plant: bump({ rest_period: msg.rest_period as RestPeriod | null }) };
      case "smart_plants/care_tasks/delete": return { plant: bump({ care_tasks: tasks.filter(task => task.id !== msg.task_id) }) };
      case "smart_plants/care_tasks/complete": {
        const task = tasks.find(item => item.id === msg.task_id)!;
        const kind = ({ fertilize: "fertilizing", prune: "pruning", repot: "repotting", pests: "task", custom: "task" } as const)[task.type];
        const payload = kind === "fertilizing" ? { product: null, amount: null, unit: null, note: (msg.note as string | undefined) ?? null } : { note: (msg.note as string | undefined) ?? null };
        const occurred = (msg.occurred_at as string | undefined) ?? `${TODAY}T09:00:00+00:00`;
        const event: CareEvent = { schema_version: 2, id: `00000000-0000-4000-8000-00000000000${nextEvent++}`, kind, provenance: "manual", task_id: task.id, occurred_at: occurred, local_date: occurred.slice(0, 10), created_at: occurred, updated_at: occurred, payload };
        return { plant: bump({ care_events: [event, ...(plant.care_events ?? [])], care_tasks: tasks.map(item => item.id === task.id ? { ...item, last_done_at: new Date(occurred).toISOString().replace(".000Z", "Z") } : item) }), event_id: event.id };
      }
      case "smart_plants/care_tasks/skip": {
        const previous = tasks.find(item => item.id === msg.task_id)!.last_skipped_on;
        return { plant: bump({ care_tasks: tasks.map(item => item.id === msg.task_id ? { ...item, last_skipped_on: TODAY } : item) }), previous_skipped_on: previous };
      }
      case "smart_plants/care_tasks/undo_skip": return { plant: bump({ care_tasks: tasks.map(item => item.id === msg.task_id ? { ...item, last_skipped_on: msg.previous_skipped_on as string | null } : item) }) };
      case "smart_plants/care/delete": {
        const events = (plant.care_events ?? []).filter(event => event.id !== msg.event_id);
        const next = bump({ care_events: events, care_tasks: tasks.map(item => ({ ...item, last_done_at: null })) });
        return { plant: next, summary: { watering_count: 0, last_watered_at: null, last_watered_local_date: null } };
      }
      default: return undefined;
    }
  });
  h.hass.config = { time_zone: "Europe/Berlin" };
  return { h, current: () => plant, change: (next: PlantRecord) => { plant = next; } };
}

async function openCare(backend: ReturnType<typeof careBackend>) {
  const el = new SmartPlantsPanel(); el.hass = backend.h.hass; document.body.append(el);
  await settle(el); await click(el, "Aloe"); await settle(el); await click(el, "Care"); await settle(el);
  return el;
}
const carePlan = (el: SmartPlantsPanel) => el.shadowRoot!.querySelector<HTMLElement>(".care-plan")!;
const dialog = (el: SmartPlantsPanel) => el.shadowRoot!.querySelector<HTMLDialogElement>("dialog.care-dialog");
const dialogButton = (el: SmartPlantsPanel, name: string) => [...dialog(el)!.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.trim() === name || b.getAttribute("aria-label") === name)!;
const menu = async (el: SmartPlantsPanel, index: number, value: string) => {
  carePlan(el).querySelectorAll("ha-dropdown.task-menu")[index]!.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value } } })); await settle(el);
};
const typeInto = async (el: SmartPlantsPanel, input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); await settle(el);
};
const plantWith = (changes: Partial<PlantRecord>): PlantRecord => ({ ...structuredClone(sample), care_events: [], care_tasks: [], rest_period: null, ...changes });

describe("care plan card", () => {
  it("shows an empty plan above the care history and adds a task from a preset", async () => {
    const backend = careBackend(plantWith({}));
    const toasts: string[] = [];
    const el = await openCare(backend);
    el.addEventListener("hass-notification", e => toasts.push((e as CustomEvent<{ message: string }>).detail.message));
    const plan = carePlan(el);
    expect(plan.textContent).toContain("No care tasks yet");
    expect(plan.compareDocumentPosition(el.shadowRoot!.querySelector("#care-heading")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    plan.querySelector<HTMLButtonElement>("button.btn.filled")!.click(); await settle(el);
    expect(dialog(el)?.textContent).toContain("What do you want to be reminded of?");
    [...dialog(el)!.querySelectorAll<HTMLButtonElement>("button.preset")].find(b => b.textContent?.includes("Fertilize"))!.click(); await settle(el);
    expect(dialog(el)?.textContent).toContain("Fertilize · Every 4 weeks");
    // Without a rest period, the growing season option is not offered.
    expect(dialog(el)?.textContent).not.toContain("Only in the growing season");
    dialogButton(el, "Add task").click(); await settle(el);
    expect(backend.h.calls.find(c => c.type === "smart_plants/care_tasks/create")).toEqual({ type: "smart_plants/care_tasks/create", plant_id: sample.id, expected_revision: 1, task_type: "fertilize", name: null, schedule: { kind: "interval", every: 4, unit: "weeks", growing_season_only: true }, instructions: null, baseline_done_on: null });
    expect(dialog(el)).toBeNull();
    expect(toasts).toContain("Fertilize added to the care plan");
    expect(carePlan(el).textContent).toContain("Fertilize");
    expect(carePlan(el).textContent).toContain("Not done yet");
  });

  it("validates the editor inline and disables presets that already exist", async () => {
    const backend = careBackend(plantWith({ care_tasks: [fertilize] }));
    const el = await openCare(backend);
    carePlan(el).querySelector<HTMLButtonElement>(".card-h button")!.click(); await settle(el);
    const tiles = [...dialog(el)!.querySelectorAll<HTMLButtonElement>("button.preset")];
    expect(tiles.find(b => b.textContent?.includes("Fertilize"))!.disabled).toBe(true);
    expect(tiles.find(b => b.textContent?.includes("Fertilize"))!.textContent).toContain("Already in the care plan");
    tiles.find(b => b.textContent?.includes("Custom task"))!.click(); await settle(el);
    await typeInto(el, dialog(el)!.querySelector<HTMLInputElement>('input[type="number"]')!, "0");
    dialogButton(el, "Add task").click(); await settle(el);
    expect(dialog(el)!.textContent).toContain("Enter a name for this task.");
    expect(dialog(el)!.textContent).toContain("Enter a whole number from 1 to 999.");
    expect(backend.h.calls.some(c => c.type === "smart_plants/care_tasks/create")).toBe(false);
    // Once a year needs months; errors follow the edits.
    dialogButton(el, "Once a year").click(); await settle(el);
    dialogButton(el, "Add task").click(); await settle(el);
    expect(dialog(el)!.textContent).toContain("Pick at least one month.");
    dialogButton(el, "November").click(); dialogButton(el, "February").click(); await settle(el);
    expect(dialog(el)!.textContent).not.toContain("Pick at least one month.");
    expect(dialog(el)!.textContent).toContain("Once a year, November–February");
    await typeInto(el, dialog(el)!.querySelector<HTMLInputElement>('input[type="text"]')!, "Mist leaves");
    dialogButton(el, "Add task").click(); await settle(el);
    expect(backend.h.calls.find(c => c.type === "smart_plants/care_tasks/create")).toMatchObject({ task_type: "custom", name: "Mist leaves", schedule: { kind: "yearly", start_month: 11, end_month: 2 } });
  });

  it("marks a due task as done with Undo and skips with Undo", async () => {
    const backend = careBackend(plantWith({ care_tasks: [fertilize] }), plant => {
      const task = plant.care_tasks![0]!;
      return task.last_done_at || task.last_skipped_on ? [state(task.id, { next_due: "2026-11-16", days: 28 })] : [state(task.id, { status: "due", is_due: true, next_due: TODAY, days: null })];
    });
    const actions: { text: string; action: () => void }[] = [];
    const el = await openCare(backend);
    el.addEventListener("hass-notification", e => { const detail = (e as CustomEvent<{ action?: { text: string; action: () => void } }>).detail; if (detail.action) actions.push(detail.action); });
    expect(carePlan(el).textContent).toContain("Due today");
    const done = [...carePlan(el).querySelectorAll<HTMLButtonElement>("button")].find(b => b.getAttribute("aria-label") === "Mark Fertilize as done")!;
    done.click(); await settle(el); await settle(el);
    expect(backend.h.calls.find(c => c.type === "smart_plants/care_tasks/complete")).toEqual({ type: "smart_plants/care_tasks/complete", plant_id: sample.id, task_id: FERTILIZE_ID, expected_revision: 1 });
    expect(carePlan(el).textContent).toContain("In 4 weeks");
    expect(carePlan(el).textContent).toContain("Last done: Oct 19");
    actions.at(-1)!.action(); await settle(el); await settle(el);
    expect(backend.h.calls.find(c => c.type === "smart_plants/care/delete")).toMatchObject({ event_id: "00000000-0000-4000-8000-000000000001" });
    expect(carePlan(el).textContent).toContain("Due today");

    await menu(el, 0, "skip"); await settle(el);
    expect(backend.h.calls.find(c => c.type === "smart_plants/care_tasks/skip")).toMatchObject({ task_id: FERTILIZE_ID });
    actions.at(-1)!.action(); await settle(el); await settle(el);
    expect(backend.h.calls.find(c => c.type === "smart_plants/care_tasks/undo_skip")).toMatchObject({ task_id: FERTILIZE_ID, previous_skipped_on: null });
  });

  it("logs a pest check from the Log care form and says which task a care entry completes", async () => {
    const backend = careBackend(plantWith({ care_tasks: [fertilize, pests] }));
    const el = await openCare(backend);
    await menu(el, 1, "mark_done");
    const form = el.shadowRoot!.querySelector<HTMLElement>("#care-form")!;
    expect(form.textContent).toContain("Marks Check for pests as done.");
    expect(form.querySelector("select")).toBeNull();
    const when = form.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
    when.value = "2026-10-18T09:30"; when.dispatchEvent(new Event("input", { bubbles: true }));
    const note = [...form.querySelectorAll("label")].find(label => label.textContent?.includes("Note (optional)"))!.querySelector("input")!;
    await typeInto(el, note, "Checked under the leaves");
    [...form.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.trim() === "Record care")!.click(); await settle(el); await settle(el);
    expect(backend.h.calls.find(c => c.type === "smart_plants/care_tasks/complete")).toMatchObject({ task_id: PESTS_ID, note: "Checked under the leaves" });
    expect(String(backend.h.calls.find(c => c.type === "smart_plants/care_tasks/complete")!.occurred_at)).toMatch(/^2026-10-18T09:30:00[+-]\d\d:\d\d$/);
    // The history names the task instead of a generic "Care task".
    expect(el.shadowRoot!.querySelector('ul[aria-label="Plant care events"]')!.textContent).toContain("Check for pests");

    // A fertilizing entry completes the Fertilize task on its own.
    el.shadowRoot!.querySelectorAll<HTMLButtonElement>(".care-bar button.btn.filled")[0]!.click(); await settle(el);
    const kind = el.shadowRoot!.querySelector<HTMLSelectElement>("#care-form select")!;
    kind.value = "fertilizing"; kind.dispatchEvent(new Event("change", { bubbles: true })); await settle(el);
    expect(el.shadowRoot!.querySelector("#care-form")!.textContent).toContain("Also marks Fertilize as done.");
  });

  it("edits a task with only the changed fields and deletes it after confirming", async () => {
    const backend = careBackend(plantWith({ care_tasks: [fertilize], rest_period: { start_month: 11, end_month: 2 } }));
    const el = await openCare(backend);
    expect(carePlan(el).textContent).toContain("Every 4 weeks · growing season only");
    await menu(el, 0, "edit");
    expect(dialog(el)!.textContent).toContain("Edit care task");
    expect(dialog(el)!.textContent).toContain("Waits during the rest period (November–February).");
    await typeInto(el, dialog(el)!.querySelector<HTMLInputElement>('input[type="number"]')!, "6");
    dialogButton(el, "Save").click(); await settle(el);
    expect(backend.h.calls.find(c => c.type === "smart_plants/care_tasks/update")).toEqual({ type: "smart_plants/care_tasks/update", plant_id: sample.id, task_id: FERTILIZE_ID, expected_revision: 1, schedule: { kind: "interval", every: 6, unit: "weeks", growing_season_only: true } });

    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true); vi.stubGlobal("confirm", confirm);
    await menu(el, 0, "delete");
    expect(confirm.mock.calls[0]![0]).toContain("automations that use them stop working");
    expect(backend.h.calls.some(c => c.type === "smart_plants/care_tasks/delete")).toBe(false);
    await menu(el, 0, "delete"); await settle(el);
    expect(backend.h.calls.find(c => c.type === "smart_plants/care_tasks/delete")).toMatchObject({ task_id: FERTILIZE_ID, expected_revision: 2 });
    expect(carePlan(el).textContent).toContain("No care tasks yet");
  });

  it("lists the task's entities for automations", async () => {
    const backend = careBackend(plantWith({ care_tasks: [fertilize] }));
    const send = backend.h.hass.connection.sendMessagePromise;
    backend.h.hass.connection.sendMessagePromise = (async (msg: Record<string, unknown>) => msg.type === "config/entity_registry/list"
      ? [{ id: "r1", entity_id: "binary_sensor.aloe_fertilize", device_id: null, unique_id: `smart_plants:${sample.id}:care_task:${FERTILIZE_ID}:due`, platform: "smart_plants" },
        { id: "r2", entity_id: "binary_sensor.aloe_care_due", device_id: null, unique_id: `smart_plants:${sample.id}:care_due`, platform: "smart_plants" }]
      : send(msg)) as typeof send;
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const el = await openCare(backend);
    await menu(el, 0, "automate");
    const text = dialog(el)!.textContent!;
    expect(text).toContain("Automate “Fertilize”");
    expect(text).toContain("binary_sensor.aloe_fertilize");
    expect(text).toContain("binary_sensor.aloe_care_due");
    expect(text).toContain("Disabled by default");
    expect(text).toContain("smart_plants.log_care");
    dialogButton(el, "Copy binary_sensor.aloe_fertilize").click(); await settle(el);
    expect(writeText).toHaveBeenCalledWith("binary_sensor.aloe_fertilize");
  });

  it("takes over care-only changes made elsewhere without pausing saving", async () => {
    const backend = careBackend(plantWith({ care_tasks: [fertilize] }));
    const el = await openCare(backend);
    const current = backend.current();
    backend.change({ ...current, revision: current.revision + 1, care_tasks: [{ ...fertilize, last_done_at: "2026-10-19T08:00:00Z" }] });
    backend.h.events.get("ready")!(); await settle(el); await settle(el);
    expect(el.shadowRoot!.textContent).not.toContain("This plant was changed somewhere else");
    expect(carePlan(el).textContent).toContain("Last done: Oct 19");
  });
});

describe("rest period and care summaries", () => {
  const rest = { start_month: 11, end_month: 2 };
  it("describes the season and the tasks that wait", () => {
    const tasks = [fertilize, pests];
    expect(restSentence(l, rest, tasks, "2026-10-19")).toEqual({ resting: false, season: "Growing season", tasks: "1 task off during rest" });
    expect(restSentence(l, rest, tasks, "2026-12-10")).toEqual({ resting: true, season: "Resting until Mar 1, 2027", tasks: "1 task off" });
    expect(restSentence(l, rest, tasks, "2027-01-10").season).toBe("Resting until Mar 1");
    expect(restSentence(l, rest, [pests], "2026-10-19").tasks).toBe("all tasks keep running");
    expect(resumeDate({ start_month: 6, end_month: 6 }, "2026-06-15")).toBe("2026-07-01");
  });

  it("drafts, validates and diffs rest period settings", () => {
    const manualFertilize: CareTask = { ...fertilize, schedule: { kind: "interval", every: 4, unit: "weeks", growing_season_only: false } };
    // A new rest period pauses fertilizing by default.
    expect([...restDraft(null, [manualFertilize, pests]).off]).toEqual([FERTILIZE_ID]);
    expect(restDraft(rest, [manualFertilize]).off.size).toBe(0);
    expect(validateRest({ startMonth: null, endMonth: null, off: new Set() }).error).toBe("care_plan.rest_error_months");
    expect(validateRest({ startMonth: 1, endMonth: 12, off: new Set() }).error).toBe("care_plan.rest_error_whole_year");
    expect(validateRest({ startMonth: 11, endMonth: 2, off: new Set() }).rest).toEqual(rest);
    expect(restTaskChanges([fertilize, pests], new Set([PESTS_ID]))).toEqual([
      { task: fertilize, schedule: { ...fertilize.schedule, growing_season_only: false } },
      { task: pests, schedule: { ...pests.schedule, growing_season_only: true } },
    ]);
  });

  it("names due tasks in one line", () => {
    const due = [state(PESTS_ID, { type: "pests", status: "overdue", is_due: true }), state(FERTILIZE_ID, { status: "due", is_due: true }), state("c".repeat(32), { type: "custom", name: "Mist leaves", status: "due", is_due: true })];
    expect(careLine(l, due)).toBe("Check for pests, Fertilize +1");
    expect(careLine(l, due.slice(0, 1))).toBe("Check for pests");
    expect(matchesFilter("care", "healthy", true)).toBe(true);
    expect(matchesFilter("care", "needs_water", false)).toBe(false);
  });
});

describe("rest period editor, header chips and overview", () => {
  afterEach(() => { vi.useRealTimers(); });
  const at = (iso: string) => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(iso)); };

  it("sets a rest period with the tasks that wait, and removes it again", async () => {
    at("2026-10-19T10:00:00Z");
    const backend = careBackend(plantWith({ care_tasks: [fertilize, pests] }));
    const toasts: string[] = [];
    const el = await openCare(backend);
    el.addEventListener("hass-notification", e => toasts.push((e as CustomEvent<{ message: string }>).detail.message));
    expect(carePlan(el).querySelector(".restline")).toBeNull();
    carePlan(el).querySelector("ha-dropdown:not(.task-menu)")!.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "rest" } } })); await settle(el);
    expect(dialog(el)!.textContent).toContain("Watering alerts are not affected.");
    const box = (name: string) => [...dialog(el)!.querySelectorAll<HTMLLabelElement>("label.check")].find(label => label.textContent?.includes(name))!.querySelector("input")!;
    expect(box("Fertilize").checked).toBe(true);
    expect(box("Check for pests").checked).toBe(false);
    dialogButton(el, "Save").click(); await settle(el);
    expect(dialog(el)!.textContent).toContain("Pick the rest months.");
    dialogButton(el, "January").click(); await settle(el); dialogButton(el, "December").click(); await settle(el);
    dialogButton(el, "Save").click(); await settle(el);
    expect(dialog(el)!.textContent).toContain("A rest period can't cover the whole year.");
    dialogButton(el, "November").click(); await settle(el); dialogButton(el, "February").click(); await settle(el);
    box("Check for pests").click(); await settle(el);
    dialogButton(el, "Save").click(); await settle(el); await settle(el);
    expect(backend.h.calls.filter(c => c.type === "smart_plants/plants/set_rest_period" || c.type === "smart_plants/care_tasks/update")).toEqual([
      { type: "smart_plants/plants/set_rest_period", plant_id: sample.id, expected_revision: 1, rest_period: { start_month: 11, end_month: 2 } },
      { type: "smart_plants/care_tasks/update", plant_id: sample.id, task_id: PESTS_ID, expected_revision: 2, schedule: { ...pests.schedule, growing_season_only: true } },
    ]);
    expect(toasts).toContain("Rest period saved");
    const row = carePlan(el).querySelector<HTMLElement>(".restline")!;
    expect(row.textContent?.replace(/\s+/g, " ")).toContain("Growing season · 2 tasks off during rest");
    expect(row.querySelector(".months")!.getAttribute("aria-label")).toBe("Rest months: November–February");
    expect([...row.querySelectorAll(".months i.on")].map(i => i.textContent)).toEqual(["J", "F", "N", "D"]);
    expect(row.querySelector(".months i.now")!.textContent).toBe("O");

    row.querySelector<HTMLButtonElement>("button")!.click(); await settle(el);
    dialogButton(el, "Remove").click(); await settle(el); await settle(el);
    expect(backend.h.calls.filter(c => c.type === "smart_plants/plants/set_rest_period").at(-1)).toMatchObject({ rest_period: null });
    expect(carePlan(el).querySelector(".restline")).toBeNull();
  });

  it("says when the plant rests and until when", async () => {
    at("2026-12-10T10:00:00Z");
    const backend = careBackend(plantWith({ care_tasks: [fertilize], rest_period: { start_month: 11, end_month: 2 } }));
    const el = await openCare(backend);
    expect(carePlan(el).querySelector(".restline")!.textContent?.replace(/\s+/g, " ")).toContain("Resting until Mar 1, 2027 · 1 task off");
  });

  it("shows due tasks in the header and on the overview with a Care due filter", async () => {
    const custom: CareTask = { ...pests, id: "c".repeat(32), type: "custom", name: "Mist leaves" };
    const states = () => [state(PESTS_ID, { type: "pests", status: "overdue", is_due: true, days: 2 }), state(FERTILIZE_ID, { status: "due", is_due: true, days: null }), state(custom.id, { type: "custom", name: "Mist leaves", status: "due", is_due: true, days: null })];
    const backend = careBackend(plantWith({ care_tasks: [fertilize, pests, custom] }), states);
    const el = new SmartPlantsPanel(); el.hass = backend.h.hass; document.body.append(el); await settle(el);
    const overview = el.shadowRoot!.querySelector("smart-plants-overview")!; await settle(overview);
    const tiles = [...overview.shadowRoot!.querySelectorAll<HTMLButtonElement>(".tile")];
    expect(tiles.map(tile => tile.textContent?.replace(/\s+/g, " ").trim())).toContain("1Care due");
    expect(overview.shadowRoot!.querySelector(".care")!.textContent).toContain("Care: Check for pests, Fertilize +1");
    tiles.find(tile => tile.textContent?.includes("Care due"))!.click(); await settle(overview);
    expect(overview.shadowRoot!.textContent).toContain("Care due");
    expect(overview.shadowRoot!.querySelectorAll("article.card")).toHaveLength(1);
    await click(el, "Aloe"); await settle(el);
    const chips = el.shadowRoot!.querySelector<HTMLElement>(".care-chips")!;
    expect(chips.getAttribute("aria-label")).toBe("Care due");
    expect([...chips.querySelectorAll("li")].map(li => li.textContent?.replace(/\s+/g, " ").trim())).toEqual(["Check for pests (Overdue 2 days)", "Fertilize", "+1and 1 more due"]);
    expect(chips.querySelector("li")!.className).toContain("tone-overdue");
  });

  it("leaves the overview tiles alone while no plant has care tasks", async () => {
    const backend = careBackend(plantWith({}));
    const el = new SmartPlantsPanel(); el.hass = backend.h.hass; document.body.append(el); await settle(el);
    const overview = el.shadowRoot!.querySelector("smart-plants-overview")!; await settle(overview);
    expect(overview.shadowRoot!.querySelectorAll(".tile")).toHaveLength(4);
    expect(overview.shadowRoot!.querySelector(".care")).toBeNull();
  });
});

// An OpenPlantBook species with the given care texts, valid for the panel's
// plant record checks (every populated field is attributed).
function openPlantBook(careText: Record<string, string>): PlantSpecies {
  const attribution = "OpenPlantBook";
  const populated = ["latin_name", ...Object.keys(careText)];
  return { provider: "openplantbook", snapshot: { provider: "openplantbook", provider_id: "olea europaea", provider_ref: "olea europaea", fetched_at: "2026-10-01T00:00:00Z", locale: "en", source_status: "provider", attribution, common_name: null, latin_name: "Olea europaea", category: null, confidence: null, care_text: careText, field_sources: Object.fromEntries(populated.map(key => [key, attribution])), threshold_defaults: {} } };
}
const FEED = "Feed every 3-4 weeks in spring and summer; none in winter.";
const PRUNE = "Prune in late winter or early spring to keep the crown open. Remove suckers from the base and any shoots that cross the centre, and shorten long branches by a third so light reaches the inner leaves.";
const SOIL = "Free-draining mix with grit.";

describe("care suggestions", () => {
  it("offers fertilizing and pruning texts from OpenPlantBook only", () => {
    const plant = plantWith({ species: openPlantBook({ fertilization: FEED, pruning: PRUNE, soil: SOIL, watering: "Water when dry." }) });
    expect(careSuggestions(plant)).toEqual([{ type: "fertilize", text: FEED }, { type: "prune", text: PRUNE }]);
    expect(careNote(plant, "repot")).toBe(SOIL);
    expect(careNote(plant, "pests")).toBeNull();
    expect(careSuggestions(plantWith({ species: openPlantBook({ fertilization: "  " }) }))).toEqual([]);
    const manual = openPlantBook({ fertilization: FEED });
    expect(careSuggestions(plantWith({ species: { provider: "manual", snapshot: { ...manual.snapshot, provider: "manual" } } }))).toEqual([]);
    expect(careSuggestions(plantWith({}))).toEqual([]);
  });

  it("adds a task from a suggestion with the care text as instructions", async () => {
    const backend = careBackend(plantWith({ species: openPlantBook({ fertilization: FEED, pruning: PRUNE }) }));
    const el = await openCare(backend);
    expect(carePlan(el).textContent).toContain("They show up as suggestions when you add a task.");
    carePlan(el).querySelector<HTMLButtonElement>("button.btn.filled")!.click(); await settle(el);
    const box = dialog(el)!.querySelector<HTMLElement>(".suggestions")!;
    expect(box.textContent).toContain("Suggestions for Olea europaea");
    expect(box.textContent).toContain("OpenPlantBook · fertilizing");
    expect(dialog(el)!.textContent).toContain("Or start from scratch");
    // Long texts are clamped until Show more is pressed; short ones are not.
    const quotes = box.querySelectorAll("q");
    expect(quotes[0]!.classList.contains("clamped")).toBe(false);
    expect(quotes[1]!.classList.contains("clamped")).toBe(true);
    dialogButton(el, "Show more").click(); await settle(el);
    expect(box.querySelectorAll("q")[1]!.classList.contains("clamped")).toBe(false);
    expect(dialogButton(el, "Show less").getAttribute("aria-expanded")).toBe("true");
    dialogButton(el, "Add Prune task").click(); await settle(el);
    expect(dialog(el)!.querySelector("textarea")!.value).toBe(PRUNE);
    expect(dialog(el)!.textContent).toContain("From OpenPlantBook. Edit the text to make it your own.");
    expect(dialog(el)!.textContent).toContain("Prune · Once a year, March–April");
    dialogButton(el, "Add task").click(); await settle(el);
    expect(backend.h.calls.find(c => c.type === "smart_plants/care_tasks/create")).toMatchObject({ task_type: "prune", instructions: PRUNE, schedule: { kind: "yearly", start_month: 3, end_month: 4 } });
  });

  it("keeps the text of a task that already exists but offers no second task", async () => {
    const backend = careBackend(plantWith({ care_tasks: [fertilize], species: openPlantBook({ fertilization: FEED }) }));
    const el = await openCare(backend);
    carePlan(el).querySelector<HTMLButtonElement>(".card-h button")!.click(); await settle(el);
    const row = dialog(el)!.querySelector<HTMLElement>(".suggestion")!;
    expect(row.textContent).toContain(FEED);
    expect(row.textContent).toContain("Already in the care plan");
    expect(row.querySelector("button")).toBeNull();
  });

  it("hints at the care note under Instructions and stops once the text is edited", async () => {
    const backend = careBackend(plantWith({ species: openPlantBook({ soil: SOIL }) }));
    const el = await openCare(backend);
    // The soil text is not a suggestion of its own.
    expect(carePlan(el).textContent).not.toContain("They show up as suggestions");
    carePlan(el).querySelector<HTMLButtonElement>("button.btn.filled")!.click(); await settle(el);
    expect(dialog(el)!.querySelector(".suggestions")).toBeNull();
    [...dialog(el)!.querySelectorAll<HTMLButtonElement>("button.preset")].find(b => b.textContent?.includes("Repot"))!.click(); await settle(el);
    expect(dialog(el)!.textContent).toContain("OpenPlantBook has a care note for this");
    dialogButton(el, "Use as instructions").click(); await settle(el);
    const textarea = dialog(el)!.querySelector("textarea")!;
    expect(textarea.value).toBe(SOIL);
    expect(dialog(el)!.textContent).toContain("From OpenPlantBook.");
    await typeInto(el, textarea, `${SOIL} Use a pot one size larger.`);
    expect(dialog(el)!.textContent).not.toContain("From OpenPlantBook.");
    expect(dialog(el)!.textContent).not.toContain("OpenPlantBook has a care note for this");
  });

  it("accepts instructions up to 4,000 characters", () => {
    const draft = { ...presetDraft("custom"), name: "Notes", instructions: "x".repeat(4000) };
    expect(validateDraft(draft, TODAY).errors).toBeNull();
    expect(validateDraft({ ...draft, instructions: "x".repeat(4001) }, TODAY).errors).toEqual({ instructions: "care_plan.error_instructions_length" });
  });
});

describe("care changes made elsewhere", () => {
  const registry: HAEntity[] = [
    { id: "1", entity_id: "binary_sensor.mock_aloe_fertilize_due", device_id: "device-plant-1", unique_id: `smart_plants:plant-1:care_task:${FERTILIZE_ID}:due`, platform: "smart_plants" },
    { id: "2", entity_id: "binary_sensor.mock_aloe_care_due", device_id: "device-plant-1", unique_id: "smart_plants:plant-1:care_due", platform: "smart_plants" },
    { id: "3", entity_id: "sensor.mock_aloe_moisture", device_id: "device-plant-1", unique_id: "smart_plants:plant-1:moisture", platform: "smart_plants" },
  ];
  const entityState = (entity_id: string, value: string, attributes: Record<string, unknown> = {}): HAState => ({ entity_id, state: value, attributes, last_updated: "2026-10-19T09:00:00Z" });
  const initialStates = () => Object.fromEntries([
    entityState("binary_sensor.mock_aloe_fertilize_due", "on", { next_due: "2026-10-19" }),
    entityState("binary_sensor.mock_aloe_care_due", "on"),
    entityState("sensor.mock_aloe_moisture", "40"),
  ].map(s => [s.entity_id, s]));
  const reads = (backend: ReturnType<typeof careBackend>) => backend.h.calls.filter(c => c.type === "smart_plants/plants/list").length;
  const withStates = async (el: SmartPlantsPanel, hass: HomeAssistantLike, changes: HAState[]) => {
    el.hass = { ...hass, states: { ...el.hass!.states, ...Object.fromEntries(changes.map(s => [s.entity_id, s])) } }; await el.updateComplete;
  };
  const open = async () => {
    const backend = careBackend(plantWith({ care_tasks: [fertilize] }), plant => plant.care_tasks![0]!.last_done_at ? [state(FERTILIZE_ID, { next_due: "2026-11-16", days: 28 })] : [state(FERTILIZE_ID, { status: "due", is_due: true, next_due: TODAY, days: null })], registry);
    const el = await openCare(backend);
    el.hass = { ...backend.h.hass, states: initialStates() }; await settle(el);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    return { backend, el };
  };
  afterEach(() => { vi.useRealTimers(); });

  it("refreshes once after a burst of care entity changes", async () => {
    const { backend, el } = await open();
    const before = reads(backend);
    await withStates(el, backend.h.hass, [entityState("binary_sensor.mock_aloe_fertilize_due", "off", { next_due: "2026-11-16" })]);
    vi.advanceTimersByTime(200);
    await withStates(el, backend.h.hass, [entityState("binary_sensor.mock_aloe_care_due", "off")]);
    vi.advanceTimersByTime(399);
    expect(reads(backend)).toBe(before);
    vi.advanceTimersByTime(1);
    await vi.waitFor(() => expect(reads(backend)).toBe(before + 1));
    vi.advanceTimersByTime(5000);
    expect(reads(backend)).toBe(before + 1);
  });

  it("refreshes when only the attributes of a care entity change", async () => {
    const { backend, el } = await open();
    const before = reads(backend);
    await withStates(el, backend.h.hass, [entityState("binary_sensor.mock_aloe_fertilize_due", "on", { next_due: "2026-10-20" })]);
    vi.advanceTimersByTime(400);
    await vi.waitFor(() => expect(reads(backend)).toBe(before + 1));
  });

  it("ignores changes of other entities and unchanged care states", async () => {
    const { backend, el } = await open();
    const before = reads(backend);
    await withStates(el, backend.h.hass, [entityState("sensor.mock_aloe_moisture", "35"), entityState("binary_sensor.mock_aloe_care_due", "on")]);
    vi.advanceTimersByTime(5000);
    expect(reads(backend)).toBe(before);
  });

  it("waits while an editor dialog is saving", async () => {
    const { backend, el } = await open();
    const before = reads(backend);
    (el as unknown as { _formBusy: boolean })._formBusy = true;
    await withStates(el, backend.h.hass, [entityState("binary_sensor.mock_aloe_fertilize_due", "off")]);
    vi.advanceTimersByTime(5000);
    expect(reads(backend)).toBe(before);
  });

  it("does not read again for the echo of its own write", async () => {
    const { backend, el } = await open();
    const before = reads(backend);
    [...carePlan(el).querySelectorAll<HTMLButtonElement>("button")].find(b => b.getAttribute("aria-label") === "Mark Fertilize as done")!.click();
    await vi.waitFor(() => expect(backend.h.calls.some(c => c.type === "smart_plants/care_tasks/complete")).toBe(true));
    await vi.waitFor(() => expect(reads(backend)).toBe(before + 1));
    await withStates(el, backend.h.hass, [entityState("binary_sensor.mock_aloe_fertilize_due", "off")]);
    vi.advanceTimersByTime(5000);
    expect(reads(backend)).toBe(before + 1);
  });

  it("stops the pending refresh when the panel is removed", async () => {
    const { backend, el } = await open();
    const before = reads(backend);
    await withStates(el, backend.h.hass, [entityState("binary_sensor.mock_aloe_fertilize_due", "off")]);
    el.remove();
    vi.advanceTimersByTime(5000);
    expect(reads(backend)).toBe(before);
    expect(vi.getTimerCount()).toBe(0);
  });
});
