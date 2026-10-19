import { describe, expect, it } from "vitest";
import { api } from "./api.js";
import { harness, sample } from "./test-helpers.js";
import type { CareEvent, CareTask, PlantRecord } from "./types.js";

const TASK_ID = "0f8fad5bd9cb469fa16570867728950e";
const EVENT_ID = "e6e6553a-f34c-4d88-864c-c94a74f97dfa";
const interval = { kind: "interval" as const, every: 2, unit: "weeks" as const, growing_season_only: false };
const task: CareTask = { id: TASK_ID, type: "fertilize", name: null, schedule: interval, instructions: null, baseline_done_on: null, last_done_at: null, last_skipped_on: null, created_on: "2026-06-15" };
const event: CareEvent = { schema_version: 2, id: EVENT_ID, kind: "fertilizing", provenance: "manual", task_id: TASK_ID, occurred_at: "2026-06-15T10:00:00+02:00", local_date: "2026-06-15",
  created_at: "2026-06-15T08:00:01Z", updated_at: "2026-06-15T08:00:01Z", payload: { product: null, amount: null, unit: null, note: "Half strength" } };
// The plant before each request is at revision 1; replies are at revision 2.
const plant = (changes: Partial<PlantRecord> = {}): PlantRecord => ({ ...structuredClone(sample), revision: 2, care_tasks: [task], care_events: [], rest_period: null, ...changes });
const reply = (result: unknown) => harness([], () => result);

describe("care task commands", () => {
  it("creates a task and binds the reply to the requested fields", async () => {
    const custom: CareTask = { ...task, type: "custom", name: "Mist leaves", schedule: { kind: "yearly", start_month: 11, end_month: 2 }, instructions: "Rain water", baseline_done_on: "2026-06-01" };
    const input = { task_type: "custom" as const, name: "  Mist leaves ", schedule: { end_month: 2, start_month: 11, kind: "yearly" as const }, instructions: "Rain water", baseline_done_on: "2026-06-01" };
    const valid = { plant: plant({ care_tasks: [custom] }), task_id: TASK_ID };
    const h = reply(valid);
    await expect(api.createCareTask(h.hass, sample.id, 1, input)).resolves.toEqual(valid);
    expect(h.calls.at(-1)).toEqual({ type: "smart_plants/care_tasks/create", plant_id: sample.id, expected_revision: 1, ...input });
    for (const malformed of [
      { ...valid, task_id: "7c9e6679742540de944be07fc1f90ae7" },
      { ...valid, task_id: "not-a-task" },
      { ...valid, plant: plant({ care_tasks: [{ ...custom, type: "pests", name: "Mist leaves" }] }) },
      { ...valid, plant: plant({ care_tasks: [{ ...custom, name: "Other" }] }) },
      { ...valid, plant: plant({ care_tasks: [{ ...custom, schedule: { kind: "yearly", start_month: 11, end_month: 3 } }] }) },
      { ...valid, plant: plant({ care_tasks: [{ ...custom, baseline_done_on: null }] }) },
      { ...valid, plant: plant({ care_tasks: [custom], revision: 3 }) },
      { ...valid, plant: { ...plant({ care_tasks: [custom] }), id: "another-plant" } },
      { ...valid, extra: true },
      { plant: valid.plant },
    ]) {
      await expect(api.createCareTask(reply(malformed).hass, sample.id, 1, input), JSON.stringify(malformed).slice(0, 80)).rejects.toMatchObject({ code: "invalid_response" });
    }
  });

  it("stores blank optional text as null", async () => {
    const input = { task_type: "fertilize" as const, name: " ", schedule: interval, instructions: "", baseline_done_on: null };
    await expect(api.createCareTask(reply({ plant: plant(), task_id: TASK_ID }).hass, sample.id, 1, input)).resolves.toMatchObject({ task_id: TASK_ID });
  });

  it("updates only the given fields", async () => {
    const changed: CareTask = { ...task, schedule: { ...interval, every: 3 }, instructions: "Feed lightly" };
    const h = reply({ plant: plant({ care_tasks: [changed] }) });
    await expect(api.updateCareTask(h.hass, sample.id, TASK_ID, 1, { schedule: changed.schedule, instructions: "Feed lightly" })).resolves.toMatchObject({ care_tasks: [changed] });
    expect(h.calls.at(-1)).toEqual({ type: "smart_plants/care_tasks/update", plant_id: sample.id, task_id: TASK_ID, expected_revision: 1, schedule: changed.schedule, instructions: "Feed lightly" });
    await expect(api.updateCareTask(reply({ plant: plant({ care_tasks: [task] }) }).hass, sample.id, TASK_ID, 1, { instructions: "Feed lightly" })).rejects.toMatchObject({ code: "invalid_response" });
    await expect(api.updateCareTask(reply({ plant: plant({ care_tasks: [] }) }).hass, sample.id, TASK_ID, 1, {})).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("deletes a task", async () => {
    const h = reply({ plant: plant({ care_tasks: [] }) });
    await expect(api.deleteCareTask(h.hass, sample.id, TASK_ID, 1)).resolves.toMatchObject({ care_tasks: [] });
    expect(h.calls.at(-1)).toEqual({ type: "smart_plants/care_tasks/delete", plant_id: sample.id, task_id: TASK_ID, expected_revision: 1 });
    await expect(api.deleteCareTask(reply({ plant: plant() }).hass, sample.id, TASK_ID, 1)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("completes a task and returns the event id for undo", async () => {
    const done = plant({ care_tasks: [{ ...task, last_done_at: "2026-06-15T08:00:00Z" }], care_events: [event] });
    const valid = { plant: done, event_id: EVENT_ID };
    const h = reply(valid);
    await expect(api.completeCareTask(h.hass, sample.id, TASK_ID, 1, { occurred_at: event.occurred_at, note: "Half strength" })).resolves.toEqual(valid);
    expect(h.calls.at(-1)).toEqual({ type: "smart_plants/care_tasks/complete", plant_id: sample.id, task_id: TASK_ID, expected_revision: 1, occurred_at: event.occurred_at, note: "Half strength" });
    const withoutNote = { plant: plant({ care_events: [{ ...event, payload: { ...event.payload, note: null } }] }), event_id: EVENT_ID };
    const now = reply(withoutNote);
    await expect(api.completeCareTask(now.hass, sample.id, TASK_ID, 1)).resolves.toEqual(withoutNote);
    expect(now.calls.at(-1)).toEqual({ type: "smart_plants/care_tasks/complete", plant_id: sample.id, task_id: TASK_ID, expected_revision: 1 });
    for (const malformed of [
      { ...valid, event_id: "d4dab649-96a8-4daa-baa1-0a5b310cbfd7" },
      { ...valid, plant: { ...done, care_events: [{ ...event, task_id: null }] } },
      { ...valid, plant: { ...done, care_events: [{ ...event, occurred_at: "2026-06-15T09:00:00+02:00" }] } },
      { ...valid, plant: { ...done, care_events: [{ ...event, payload: { ...event.payload, note: "Other" } }] } },
      { ...valid, plant: { ...done, care_tasks: [] } },
      { plant: done },
    ]) {
      await expect(api.completeCareTask(reply(malformed).hass, sample.id, TASK_ID, 1, { occurred_at: event.occurred_at, note: "Half strength" })).rejects.toMatchObject({ code: "invalid_response" });
    }
  });

  it("skips a task and undoes the skip", async () => {
    const skipped = plant({ care_tasks: [{ ...task, last_skipped_on: "2026-06-15" }] });
    const h = reply({ plant: skipped, previous_skipped_on: "2026-06-01" });
    await expect(api.skipCareTask(h.hass, sample.id, TASK_ID, 1)).resolves.toMatchObject({ previous_skipped_on: "2026-06-01" });
    expect(h.calls.at(-1)).toEqual({ type: "smart_plants/care_tasks/skip", plant_id: sample.id, task_id: TASK_ID, expected_revision: 1 });
    await expect(api.skipCareTask(reply({ plant: skipped, previous_skipped_on: null }).hass, sample.id, TASK_ID, 1)).resolves.toMatchObject({ previous_skipped_on: null });
    for (const malformed of [{ plant: plant(), previous_skipped_on: null }, { plant: skipped, previous_skipped_on: "June" }, { plant: skipped }]) {
      await expect(api.skipCareTask(reply(malformed).hass, sample.id, TASK_ID, 1)).rejects.toMatchObject({ code: "invalid_response" });
    }

    const restored = plant({ care_tasks: [{ ...task, last_skipped_on: "2026-06-01" }] });
    const undo = reply({ plant: restored });
    await expect(api.undoSkipCareTask(undo.hass, sample.id, TASK_ID, 1, "2026-06-01")).resolves.toMatchObject({ care_tasks: [{ last_skipped_on: "2026-06-01" }] });
    expect(undo.calls.at(-1)).toEqual({ type: "smart_plants/care_tasks/undo_skip", plant_id: sample.id, task_id: TASK_ID, expected_revision: 1, previous_skipped_on: "2026-06-01" });
    await expect(api.undoSkipCareTask(reply({ plant: plant() }).hass, sample.id, TASK_ID, 1, null)).resolves.toMatchObject({ care_tasks: [{ last_skipped_on: null }] });
    await expect(api.undoSkipCareTask(reply({ plant: skipped }).hass, sample.id, TASK_ID, 1, "2026-06-01")).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("sets and clears the rest period", async () => {
    const winter = { start_month: 11, end_month: 2 };
    const h = reply({ plant: plant({ rest_period: winter }) });
    await expect(api.setRestPeriod(h.hass, sample.id, 1, winter)).resolves.toMatchObject({ rest_period: winter });
    expect(h.calls.at(-1)).toEqual({ type: "smart_plants/plants/set_rest_period", plant_id: sample.id, expected_revision: 1, rest_period: winter });
    await expect(api.setRestPeriod(reply({ plant: plant() }).hass, sample.id, 1, null)).resolves.toMatchObject({ rest_period: null });
    for (const malformed of [{ plant: plant() }, { plant: plant({ rest_period: { start_month: 11, end_month: 3 } }) }, { plant: plant({ rest_period: winter, revision: 1 }) }]) {
      await expect(api.setRestPeriod(reply(malformed).hass, sample.id, 1, winter)).rejects.toMatchObject({ code: "invalid_response" });
    }
  });

  it("edits a task care event", async () => {
    const taskEvent: CareEvent = { ...event, kind: "task", payload: { note: "Sprayed" } };
    const edited = plant({ care_events: [taskEvent] });
    const summary = { watering_count: 0, last_watered_at: null, last_watered_local_date: null };
    const h = reply({ plant: edited, event: taskEvent, summary });
    await expect(api.editCareEvent(h.hass, sample.id, 1, EVENT_ID, "task", taskEvent.occurred_at, { note: "Sprayed" })).resolves.toMatchObject({ event: taskEvent });
    expect(h.calls.at(-1)).toMatchObject({ type: "smart_plants/care/edit", kind: "task", payload: { note: "Sprayed" } });
  });

  it("keeps backend error codes", async () => {
    const h = harness([], () => { throw { code: "revision_conflict", message: "stale" }; });
    await expect(api.skipCareTask(h.hass, sample.id, TASK_ID, 1)).rejects.toMatchObject({ code: "revision_conflict" });
  });
});
