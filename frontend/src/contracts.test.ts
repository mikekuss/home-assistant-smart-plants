import { describe, expect, it, vi } from "vitest";
import { api } from "./api.js";
import { builtin, canonicalMoisture, emptyMoisture, moistureRole, resolveSource, sourceWarning, validateMoisture } from "./model.js";
import { capabilities, draft, harness, role, sample } from "./test-helpers.js";
import type { HAEntity, HomeAssistantLike, PlantRecord, WizardCreateInput, WizardDraft } from "./types.js";

describe("v1 transport and public Home Assistant wrappers", () => {
  it("uses literal v1 capabilities and complete atomic moisture command", async () => {
    const h = harness(); expect(await api.info(h.hass)).toEqual(capabilities);
    await api.configureMoisture(h.hass, sample.id, 4, emptyMoisture());
    expect(h.calls.at(-1)).toEqual({ type: "smart_plants/moisture/configure", plant_id: sample.id, expected_revision: 4, moisture: emptyMoisture() });
  });
  it.each([null, {}, { ...capabilities, api_version: true }, { ...capabilities, schema_version: "1" }, { ...capabilities, providers: [null] }])("rejects incompatible info %#", async info => {
    const h = harness([], msg => msg.type === "smart_plants/panel/info" ? info : undefined);
    await expect(api.info(h.hass)).rejects.toMatchObject({ code: "version_mismatch" });
  });
  it("keeps wizard capability pairing and omits noncontract draft metadata", async () => {
    const h = harness(); await api.previewWizard(h.hass, draft as WizardDraft, "openplantbook", "aloe", "en");
    expect(h.calls.at(-1)).not.toHaveProperty("expires_in"); expect(h.calls.at(-1)).not.toHaveProperty("revision");
    const input: WizardCreateInput = { draft_id: draft.draft_id, draft_token: draft.draft_token, expected_revision: 0, confirmed: true, name: "Aloe", moisture: emptyMoisture() };
    await api.createWizard(h.hass, input); await api.createWizard(h.hass, input);
    expect(h.calls.at(-1)).toEqual(h.calls.at(-2)); expect(input).not.toHaveProperty("type");
  });
  it("calls public registry, state and related commands with safe result shapes", async () => {
    const h = harness(); expect(await api.areas(h.hass)).toHaveLength(2); expect(await api.devices(h.hass)).toHaveLength(1); expect(await api.entities(h.hass)).toEqual([]); expect(await api.states(h.hass)).toEqual([]); expect(await api.related(h.hass, "device-1")).toEqual(["automation.plant_reminder"]);
    expect(h.calls.map(c => c.type)).toEqual(["config/area_registry/list", "config/device_registry/list", "config/entity_registry/list", "get_states", "search/related"]);
    expect(h.calls.at(-1)).toEqual({ type: "search/related", item_type: "device", item_id: "device-1" });
  });
  it.each(["areas", "devices", "entities", "states"] as const)("rejects malformed public %s results instead of using guessed IDs", async method => {
    const h = harness([], () => [{ id: "not-enough" }]); await expect(api[method](h.hass)).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("releases already admitted subscriptions if a later registry subscription fails", async () => {
    const unsubscribe = vi.fn(); let count = 0;
    const h = harness(); h.hass.connection.subscribeEvents = vi.fn(async () => { if (++count === 2) throw new Error("disconnect"); return unsubscribe; }) as NonNullable<HomeAssistantLike["connection"]["subscribeEvents"]>;
    await expect(api.subscribeRegistry(h.hass, vi.fn())).rejects.toThrow("disconnect"); expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe("moisture runtime and identity boundaries", () => {
  it.each([undefined, null, {}, { moisture: null }, { moisture: { ...role, sources: "sensor.fake" } }, { moisture: { ...role, threshold_defaults: null } }, { moisture: { ...role, threshold_overrides: { min: null, target: false, max: null } } }, { moisture: { ...role, stale_after_seconds: 59 } }])("fails closed for malformed optional roles %#", roles => {
    expect(moistureRole({ ...sample, roles } as unknown as PlantRecord)).toBeNull();
  });
  it("validates role metadata without requiring or interpreting future roles", () => {
    expect(moistureRole({ ...sample, roles: { moisture: role, future: { arbitrary: "data" } } })).toEqual(role);
  });
  it.each([59, 604801, 60.5, Number.NaN])("rejects invalid staleness %s", seconds => {
    expect(validateMoisture({ ...emptyMoisture(), stale_after_seconds: seconds }, builtin)).toContain("Staleness");
  });
  it("validates effective inherited/provider values including missing provider targets", () => {
    expect(validateMoisture(emptyMoisture(), { min: 40, target: 35, max: 60 })).toContain("Effective");
    expect(validateMoisture({ ...emptyMoisture(), threshold_overrides: { min: null, target: 50, max: null } }, { min: 40, target: 35, max: 60 })).toBeNull();
    expect(validateMoisture({ ...emptyMoisture(), threshold_overrides: { min: 20, target: 21, max: 23 } }, builtin)).toContain("span");
  });
  it("never recovers a removed UUID using a reused entity ID; canonicalizes genuine renames", () => {
    const entity: HAEntity = { id: "replacement", entity_id: "sensor.old", device_id: null, unique_id: "source", platform: "test" };
    const source = { entity_id: "sensor.old", registry_id: "original" };
    expect(resolveSource(source, [entity])).toBeUndefined(); expect(sourceWarning(source, [entity], {})).toContain("Missing registered source");
    const renamed = { ...entity, id: "original", entity_id: "sensor.renamed" };
    expect(canonicalMoisture({ ...emptyMoisture(), sources: [source], primary_entity_id: source.entity_id }, [entity, renamed])).toMatchObject({ sources: [{ entity_id: "sensor.renamed", registry_id: "original" }], primary_entity_id: "sensor.renamed" });
    expect(canonicalMoisture({ ...emptyMoisture(), sources: [source] }, [entity]).sources).toEqual([source]);
  });
  it("explains weaker rename guarantees without blocking unregistered assignments", () => {
    const source = { entity_id: "sensor.unregistered", registry_id: null };
    expect(sourceWarning(source, [], {})).toContain("renames cannot be followed reliably"); expect(validateMoisture({ ...emptyMoisture(), sources: [source] }, builtin)).toBeNull();
  });
});
