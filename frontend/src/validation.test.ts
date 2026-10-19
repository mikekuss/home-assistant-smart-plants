import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api.js";
import { validCareEvent, validCareTask, validPlant } from "./validation.js";
import { draft, evaluation, harness, preview, sample, snapshot } from "./test-helpers.js";
import type { CareEvent, CareTask, WizardDraft } from "./types.js";
afterEach(() => vi.unstubAllGlobals());

describe("untrusted runtime responses", () => {
  it("requires a created plant to report every role it was created with", async () => {
    const request = { draft_id: draft.draft_id, draft_token: draft.draft_token, expected_revision: 0 as const, confirmed: true as const, name: "Aloe",
      moisture: { sources: [], primary_entity_id: null, aggregation: "primary" as const, stale_after_seconds: 21600, threshold_overrides: { min: null, target: null, max: null } },
      roles: { temperature: { sources: [{ entity_id: "sensor.mock_temperature", registry_id: null }], primary_entity_id: "sensor.mock_temperature" } } };
    const withRole = { ...sample, roles: { ...sample.roles!, temperature: { sources: request.roles.temperature.sources, primary_entity_id: "sensor.mock_temperature", aggregation: "average", stale_after_seconds: 21600 } } };
    await expect(api.createWizard(harness([], () => ({ plant: withRole })).hass, request)).resolves.toMatchObject({ id: sample.id });
    await expect(api.createWizard(harness([], () => ({ plant: sample })).hass, request)).rejects.toMatchObject({ code: "invalid_response" });
    const { roles: _roles, ...withoutRoles } = request;
    await expect(api.createWizard(harness([], () => ({ plant: sample })).hass, withoutRoles)).resolves.toMatchObject({ id: sample.id });
  });
  it("accepts a second, newer watering even when the plant stores insertion order", async () => {
    const first: CareEvent = { schema_version: 2, id: "e6e6553a-f34c-4d88-864c-c94a74f97dfa", kind: "watering", provenance: "manual", task_id: null, occurred_at: "2026-01-01T00:30:00+02:00", local_date: "2026-01-01", created_at: "2026-01-03T00:00:00Z", updated_at: "2026-01-03T00:00:00Z", payload: { note: null } };
    const second: CareEvent = { ...first, id: "d4dab649-96a8-4daa-baa1-0a5b310cbfd7", occurred_at: "2026-01-02T12:00:00Z", local_date: "2026-01-02" };
    const plant = { ...sample, revision: 3, care_events: [first, second] };
    const summary = { watering_count: 2, last_watered_at: second.occurred_at, last_watered_local_date: second.local_date };
    const input = [plant, { event: second, summary }];
    const h = harness([], () => ({ plant: input[0], ...input[1] }));
    await expect(api.addWatering(h.hass, plant.id, 2, second.occurred_at, null)).resolves.toMatchObject({ plant, event: second });
    await expect(api.careHistory(harness([], () => ({ revision: 3, events: [second, first], summary })).hass, plant.id)).resolves.toMatchObject({ events: [second, first], summary });
    await expect(api.careHistory(harness([], () => ({ revision: 3, events: [first, second], summary })).hass, plant.id)).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("orders distinct instants within one millisecond without using IDs as time", async () => {
    const newer: CareEvent = { schema_version: 2, id: "00000000-0000-4000-8000-000000000001", kind: "watering", provenance: "manual", task_id: null, occurred_at: "2026-01-01T12:00:00.000002Z", local_date: "2026-01-01", created_at: "2026-01-03T00:00:00Z", updated_at: "2026-01-03T00:00:00Z", payload: { note: null } };
    const older: CareEvent = { ...newer, id: "ffffffff-ffff-4fff-8fff-ffffffffffff", occurred_at: "2026-01-01T12:00:00.000001Z" };
    const summary = { watering_count: 2, last_watered_at: newer.occurred_at, last_watered_local_date: newer.local_date };
    const plant = { ...sample, revision: 3, care_events: [older, newer] };
    await expect(api.addWatering(harness([], () => ({ plant, event: newer, summary })).hass, plant.id, 2, newer.occurred_at, null)).resolves.toMatchObject({ plant });
    await expect(api.careHistory(harness([], () => ({ revision: 3, events: [newer, older], summary })).hass, plant.id)).resolves.toMatchObject({ events: [newer, older] });
    await expect(api.careHistory(harness([], () => ({ revision: 3, events: [older, newer], summary })).hass, plant.id)).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("uses ascending IDs to break equal-instant care event ties", async () => {
    const lower: CareEvent = { schema_version: 2, id: "11111111-1111-4111-8111-111111111111", kind: "watering", provenance: "manual", task_id: null, occurred_at: "2026-01-01T00:30:00+02:00", local_date: "2026-01-01", created_at: "2026-01-03T00:00:00Z", updated_at: "2026-01-03T00:00:00Z", payload: { note: null } };
    const higher: CareEvent = { ...lower, id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", occurred_at: "2025-12-31T22:30:00Z", local_date: "2025-12-31" };
    const summary = { watering_count: 2, last_watered_at: lower.occurred_at, last_watered_local_date: lower.local_date };
    const result = { revision: 3, events: [lower, higher], summary };
    await expect(api.careHistory(harness([], () => result).hass, sample.id)).resolves.toMatchObject({ events: [lower, higher], summary });
    await expect(api.careHistory(harness([], () => ({ ...result, events: [higher, lower], summary: { ...summary, last_watered_at: higher.occurred_at, last_watered_local_date: higher.local_date } })).hass, sample.id)).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("binds care mutation replies to the requested payload, identity and revision", async () => {
    const occurredAt = "2026-01-01T12:00:00Z";
    const event: CareEvent = { schema_version: 2, id: "e6e6553a-f34c-4d88-864c-c94a74f97dfa", kind: "pruning", provenance: "manual", task_id: null, occurred_at: occurredAt, local_date: "2026-01-01", created_at: "2026-01-03T00:00:00Z", updated_at: "2026-01-03T00:00:00Z", payload: { part: "tip", note: null } };
    const plant = { ...sample, revision: 2, care_events: [event] };
    const summary = { watering_count: 0, last_watered_at: null, last_watered_local_date: null };
    const requestPayload = { part: "tip", note: null };
    const valid = { plant, event, summary };
    await expect(api.addCareEvent(harness([], () => valid).hass, plant.id, 1, "pruning", occurredAt, requestPayload)).resolves.toMatchObject({ event });
    for (const malformed of [
      { ...valid, event: { ...event, kind: "note", payload: { text: "other" } }, plant: { ...plant, care_events: [{ ...event, kind: "note", payload: { text: "other" } }] } },
      { ...valid, event: { ...event, payload: { part: "other", note: null } }, plant: { ...plant, care_events: [{ ...event, payload: { part: "other", note: null } }] } },
      { ...valid, plant: { ...plant, revision: 3 } },
    ]) {
      await expect(api.addCareEvent(harness([], () => malformed).hass, plant.id, 1, "pruning", occurredAt, requestPayload)).rejects.toMatchObject({ code: "invalid_response" });
    }
  });
  it.each(["text/html", "image/svg+xml", "image/png"])("rejects unexpected protected image content type %s", async type => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["bytes"], { type }))));
    await expect(api.fetchImage(harness().hass, sample.id)).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("rejects an image mutation response for a different plant", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ plant: { ...sample, id: "another-plant" } }))));
    await expect(api.deleteImage(harness().hass, sample.id, 1)).rejects.toMatchObject({ code: "invalid_response" });
  });
  it.each([null, [], {}, { ...sample, revision: true }, { ...sample, revision: 0 }, { ...sample, tags: [null] }, { ...sample, lifecycle_state: "deleted" }, { ...sample, acquired_at: "yesterday" }, { ...sample, placement: { mode: "unknown" } }, { ...sample, species: { provider: "other", snapshot } }, { ...sample, image: { id: "x", width: 2049, height: 1, content_type: "image/webp", created_at: sample.created_at } }])("skips a malformed plant record and keeps the rest of the inventory %#", async plant => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const h = harness([], () => ({ plants: [plant, sample] }));
      expect(await api.list(h.hass)).toEqual([sample]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain("skipping malformed plant record");
    } finally {
      warn.mockRestore();
    }
  });
  it.each([[null], [{}], ["plants"], [undefined]])("rejects a plant list response without a plant array %#", async plants => {
    await expect(api.list(harness([], () => ({ plants })).hass)).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("accepts a date-only acquired_at and keeps it unchanged", async () => {
    const plant = { ...sample, acquired_at: "2024-03-01" };
    expect(await api.list(harness([], () => ({ plants: [plant] })).hass)).toEqual([plant]);
    await expect(api.update(harness([], () => ({ plant })).hass, { plant_id: sample.id, expected_revision: 1, name: "New" })).resolves.toEqual(plant);
    for (const bad of ["2024-13-45", "2024-03", "03/01/2024", "2024-03-01 "]) {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      expect(await api.list(harness([], () => ({ plants: [{ ...sample, acquired_at: bad }] })).hass)).toEqual([]);
      warn.mockRestore();
    }
  });
  it("rejects duplicate identities and wrongly bound mutation results", async () => {
    await expect(api.list(harness([], () => ({ plants: [sample, sample] })).hass)).rejects.toMatchObject({ code: "invalid_response" });
    await expect(api.update(harness([], () => ({ plant: { ...sample, id: "other" } })).hass, { plant_id: sample.id, expected_revision: 1, name: "New" })).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("preserves legacy placement strings rather than interpreting them as an incompatible inventory", async () => {
    const plant = { ...sample, placement: { mode: "custom_location", exposure: "north", rain_exposure: "sheltered", container: null } };
    expect(await api.list(harness([plant]).hass)).toEqual([plant]);
  });
  it("rejects missing attribution and fractional imported thresholds", async () => {
    for (const modified of [{ ...snapshot, field_sources: {} }, { ...snapshot, threshold_defaults: { moisture: { min: 20.5, max: 60 } } }]) {
      await expect(api.previewWizard(harness([], () => ({ ...preview, snapshot: modified })).hass, draft as WizardDraft, "openplantbook", "aloe", "en")).rejects.toMatchObject({ code: "invalid_response" });
    }
  });
  it.each([{ ...draft, revision: false }, { ...draft, expires_in: 0 }, { ...draft, draft_token: null }])("rejects malformed draft capability %#", async result => {
    await expect(api.startWizard(harness([], () => result).hass)).rejects.toMatchObject({ code: "invalid_response" });
  });
  it.each([{ ...preview, draft_id: "other" }, { ...preview, operation: "refresh" }, { ...preview, provider: "other" }, { ...preview, snapshot: {} }, { ...preview, snapshot: { ...snapshot, care_text: [] } }, { ...preview, snapshot: { ...snapshot, confidence: 2 } }, { ...preview, snapshot: { ...snapshot, image_url: "https://example.invalid/private" } }, { ...preview, diff: { credentials: { before: null, after: "secret" } } }])("rejects malformed or incorrectly bound preview %#", async result => {
    await expect(api.previewWizard(harness([], () => result).hass, draft as WizardDraft, "openplantbook", "aloe", "en")).rejects.toMatchObject({ code: "invalid_response" });
  });
  it.each([null, { ...evaluation, computed_available: "yes" }, { ...evaluation, computed_percent: NaN }, { ...evaluation, health_score: 101 }, { ...evaluation, reasons: [null] }, { ...evaluation, computed_available: false }, { ...evaluation, needs_water: null }])("rejects malformed or contradictory evaluation %#", async result => {
    await expect(api.evaluation(harness([], () => ({ evaluation: result })).hass, sample.id)).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("keeps absent provider targets absent and accepts unavailable evaluation", async () => {
    const h = harness(); expect((await api.previewWizard(h.hass, draft as WizardDraft, "openplantbook", "aloe", "en")).snapshot.threshold_defaults.moisture).not.toHaveProperty("target");
    const unavailable = { ...evaluation, computed_available: false, computed_percent: null, health_score: null, needs_water: null, too_wet: null };
    expect(await api.evaluation(harness([], () => ({ evaluation: unavailable })).hass, sample.id)).toEqual(unavailable);
  });
  it.each([null, [{ provider: "other", provider_ref: "aloe", latin_name: "Aloe", common_name: null, category: null, attribution: "Provider" }], Array(51).fill({})])("rejects malformed search results %#", async results => {
    await expect(api.searchSpecies(harness([], () => ({ results })).hass, "openplantbook", "Aloe", "en")).rejects.toMatchObject({ code: "invalid_response" });
  });
  it.each([{ code: "unknown_error", message: "Bearer private-token" }, { error: { code: "invalid_format", message: "client_secret=private" } }, new Error("private path"), { error: null }])("never exposes transport error details %#", async failure => {
    const h = harness([], () => { throw failure; });
    await expect(api.list(h.hass)).rejects.not.toHaveProperty("message", expect.stringContaining("private"));
  });
});

describe("care tasks and linked care events", () => {
  const task: CareTask = { id: "0f8fad5bd9cb469fa16570867728950e", type: "fertilize", name: null, schedule: { kind: "interval", every: 4, unit: "weeks", growing_season_only: true },
    instructions: null, baseline_done_on: null, last_done_at: "2026-01-02T03:04:05Z", last_skipped_on: null, created_on: "2026-01-01" };
  const event: CareEvent = { schema_version: 2, id: "e6e6553a-f34c-4d88-864c-c94a74f97dfa", kind: "task", provenance: "automation", task_id: task.id, occurred_at: "2026-01-01T00:30:00+02:00",
    local_date: "2026-01-01", created_at: "2026-01-03T00:00:00Z", updated_at: "2026-01-03T00:00:00Z", payload: { note: "Sprayed" } };
  it("accepts schema 2 events with task links, the task kind and every provenance", () => {
    expect(validCareEvent(event)).toBe(true);
    for (const provenance of ["manual", "action", "automation"]) expect(validCareEvent({ ...event, provenance })).toBe(true);
    expect(validCareEvent({ ...event, kind: "watering", task_id: null, payload: { note: null } })).toBe(true);
  });
  it.each([{ schema_version: 1 }, { provenance: "provider" }, { task_id: "not-a-task" }, { task_id: undefined }, { payload: {} }, { payload: { text: "x" } }, { payload: { note: " x" } }])("rejects malformed care event %#", change => {
    expect(validCareEvent({ ...event, ...change })).toBe(false);
  });
  it("accepts plants with care tasks and a rest period", () => {
    const custom: CareTask = { ...task, id: "7c9e6679742540de944be07fc1f90ae7", type: "custom", name: "Mist", schedule: { kind: "yearly", start_month: 11, end_month: 2 } };
    expect(validPlant({ ...sample, care_tasks: [task, custom], rest_period: { start_month: 11, end_month: 2 } })).toBe(true);
    expect(validPlant({ ...sample, care_tasks: [], rest_period: null })).toBe(true);
    expect(validPlant(sample)).toBe(true);
    expect(validPlant({ ...sample, care_tasks: [task, { ...task, id: custom.id }] })).toBe(false);
    expect(validPlant({ ...sample, care_tasks: [task, task] })).toBe(false);
    expect(validPlant({ ...sample, care_tasks: Array.from({ length: 21 }, (_, i) => ({ ...custom, id: i.toString(16).padStart(32, "a") })) })).toBe(false);
    expect(validPlant({ ...sample, care_tasks: {} })).toBe(false);
    expect(validPlant({ ...sample, rest_period: { start_month: 0, end_month: 2 } })).toBe(false);
    expect(validPlant({ ...sample, rest_period: { start_month: 1 } })).toBe(false);
  });
  it.each([{ id: "short" }, { type: "water" }, { type: "custom", name: null }, { name: " x" }, { name: "x".repeat(61) }, { instructions: "x".repeat(501) },
    { schedule: { kind: "interval", every: 0, unit: "weeks", growing_season_only: true } }, { schedule: { kind: "interval", every: 2, unit: "hours", growing_season_only: true } },
    { schedule: { kind: "yearly", start_month: 3, end_month: 13 } }, { schedule: { kind: "yearly", start_month: 3 } }, { last_done_at: "2026-01-02T03:04:05+01:00" },
    { baseline_done_on: "2026-01-01T00:00:00Z" }, { created_on: null }, { extra: 1 }])("rejects malformed care task %#", change => {
    expect(validCareTask({ ...task, ...change })).toBe(false);
  });
});
