import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import { api } from "./api.js";
import { ENGLISH, createLocalizer } from "./localize.js";
import { parseOverview } from "./overview-model.js";
import type { PlantOverview } from "./overview-model.js";
import type { PlantRecord } from "./types.js";
import { backendRoleDefaults, button, click, harness, overviewFor, panelText, role, sample, settle, snapshot } from "./test-helpers.js";
import { deriveWinterValues, fieldHint, localWinterReason, nextRestStart, nextText, normalThresholds, showWinterHint, survivalWarning, validateWinterRole, winterChip, winterDraft, winterEditorRoles, winterLines, winterPayload, winterRangeText, winterReasonText, winterSuggestion, winterThresholds, winterWhen } from "./winter.js";

const source = (id: string) => ({ sources: [{ entity_id: id, registry_id: null }], primary_entity_id: id });
// A synthetic plant with sensors for soil moisture, temperature, light and
// fertilizer level, but none for air humidity.
function plant(changes: Partial<PlantRecord> = {}): PlantRecord {
  const defaults = structuredClone(backendRoleDefaults) as Record<string, Record<string, unknown>>;
  return {
    ...structuredClone(sample), name: "Garage Oleander",
    roles: {
      ...defaults,
      moisture: { ...role, ...source("sensor.mock_soil") },
      temperature: { ...defaults.temperature, ...source("sensor.mock_temperature") },
      illuminance: { ...defaults.illuminance, ...source("sensor.mock_light") },
      conductivity: { ...defaults.conductivity, ...source("sensor.mock_conductivity") },
    },
    ...changes,
  };
}
const species = { provider: "openplantbook", snapshot: { ...snapshot, common_name: "Oleander", survival_min_temperature: 0, field_sources: { ...snapshot.field_sources, survival_min_temperature: "OpenPlantBook" } } };
const winterSet = {
  temperature: { cold_threshold_celsius: 0, cold_clear_celsius: 2, hot_clear_celsius: 32, hot_threshold_celsius: 35 },
  illuminance: { target_lux: 0, clear_lux: 200 },
};

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); localStorage.clear(); });

describe("winter values logic", () => {
  it("offers only the checks with a sensor, in a fixed order", () => {
    expect(winterEditorRoles(plant())).toEqual(["temperature", "moisture", "illuminance", "conductivity"]);
  });
  it("reads the normal values from the plant, the species and the built-in defaults", () => {
    const p = plant();
    (p.roles!.temperature as Record<string, unknown>).stress_threshold_overrides = { cold_threshold_celsius: 8, cold_clear_celsius: null, hot_clear_celsius: null, hot_threshold_celsius: null };
    (p.roles!.temperature as Record<string, unknown>).species_defaults = { hot_threshold_celsius: { value: 38 } };
    expect(normalThresholds(p, "temperature")).toEqual({ cold_threshold_celsius: 8, cold_clear_celsius: 12, hot_clear_celsius: 32, hot_threshold_celsius: 38 });
    expect(normalThresholds(p, "moisture")).toEqual({ min: 15, target: 35, max: 55 });
  });
  it("derives each clear value from the plant's normal distance to its bound", () => {
    const normal = { cold_threshold_celsius: 10, cold_clear_celsius: 12, hot_clear_celsius: 32, hot_threshold_celsius: 35 };
    expect(deriveWinterValues("temperature", { cold_threshold_celsius: 0, hot_threshold_celsius: 30 }, normal)).toEqual({ cold_threshold_celsius: 0, cold_clear_celsius: 2, hot_threshold_celsius: 30, hot_clear_celsius: 27 });
    expect(deriveWinterValues("illuminance", { target_lux: 0 }, { target_lux: 500, clear_lux: 700 })).toEqual({ target_lux: 0, clear_lux: 200 });
    expect(deriveWinterValues("moisture", { min: 10, target: 25, max: 55 }, { min: 15, target: 35, max: 55 })).toEqual({ min: 10, target: 25, max: 55 });
  });
  it("prefills the editor with the values that apply in winter now", () => {
    expect(winterDraft(plant()).temperature).toEqual({ cold_threshold_celsius: "10", hot_threshold_celsius: "35" });
    expect(winterDraft(plant({ winter_thresholds: winterSet })).temperature).toEqual({ cold_threshold_celsius: "0", hot_threshold_celsius: "35" });
    expect(winterDraft(plant()).humidity).toBeUndefined();
  });
  it("validates with the rules of the normal editors", () => {
    const temperature = normalThresholds(plant(), "temperature");
    expect(validateWinterRole("temperature", { cold_threshold_celsius: "0", hot_threshold_celsius: "35" }, temperature, ENGLISH).error).toBeNull();
    // Too close: the derived clear values would cross.
    expect(validateWinterRole("temperature", { cold_threshold_celsius: "33", hot_threshold_celsius: "35" }, temperature, ENGLISH).error).toBe(ENGLISH.t("winter.error_temperature"));
    expect(validateWinterRole("temperature", { cold_threshold_celsius: "", hot_threshold_celsius: "35" }, temperature, ENGLISH).values).toBeNull();
    const moisture = normalThresholds(plant(), "moisture");
    expect(validateWinterRole("moisture", { min: "10", target: "25", max: "55" }, moisture, ENGLISH).error).toBeNull();
    expect(validateWinterRole("moisture", { min: "10.5", target: "25", max: "55" }, moisture, ENGLISH).error).not.toBeNull();
    expect(validateWinterRole("moisture", { min: "30", target: "25", max: "55" }, moisture, ENGLISH).error).not.toBeNull();
    // 0 lx turns the light alert off; below 0 is not a value.
    expect(validateWinterRole("illuminance", { target_lux: "0" }, normalThresholds(plant(), "illuminance"), ENGLISH).error).toBeNull();
    expect(validateWinterRole("illuminance", { target_lux: "-1" }, normalThresholds(plant(), "illuminance"), ENGLISH).error).not.toBeNull();
  });
  it("sends only the checks that differ, every key as a number", () => {
    const p = plant();
    const draft = winterDraft(p);
    expect(winterPayload(p, draft, ENGLISH)).toEqual({ thresholds: null, errors: {} });
    draft.temperature = { cold_threshold_celsius: "0", hot_threshold_celsius: "35" };
    draft.illuminance = { target_lux: "0" };
    expect(winterPayload(p, draft, ENGLISH)).toEqual({ thresholds: winterSet, errors: {} });
    draft.moisture = { min: "x", target: "25", max: "55" };
    expect(winterPayload(p, draft, ENGLISH).errors).toEqual({ moisture: ENGLISH.t("winter.error_moisture") });
  });
  it("keeps the winter values of a check whose sensor is gone", () => {
    const p = plant({ winter_thresholds: { humidity: { dry_threshold_percent: 20, dry_clear_percent: 25, damp_clear_percent: 80, damp_threshold_percent: 85 } } });
    expect(winterPayload(p, winterDraft(p), ENGLISH).thresholds).toEqual({ humidity: p.winter_thresholds!.humidity });
  });
  it("names the normal value under a changed field", () => {
    const normal = normalThresholds(plant(), "moisture");
    expect(fieldHint(ENGLISH, "moisture", "min", "15", normal)).toEqual({ text: "Same as normal", changed: false });
    expect(fieldHint(ENGLISH, "moisture", "min", "10", normal)).toEqual({ text: "Normally 15%", changed: true });
  });
  it("suggests winter values and hides a suggestion once applied", () => {
    const p = plant({ species });
    const at = (role: Parameters<typeof winterSuggestion>[2], fields: Record<string, string>) => winterSuggestion(ENGLISH, p, role, fields, normalThresholds(p, role));
    expect(at("temperature", { cold_threshold_celsius: "10", hot_threshold_celsius: "35" })).toEqual({ text: "Suggestion: 0 °C, the lowest temperature Oleander survives (OpenPlantBook).", apply: { cold_threshold_celsius: "0" } });
    expect(at("temperature", { cold_threshold_celsius: "0", hot_threshold_celsius: "35" })).toBeNull();
    expect(winterSuggestion(ENGLISH, plant(), "temperature", { cold_threshold_celsius: "10" }, normalThresholds(plant(), "temperature"))).toBeNull();
    expect(at("moisture", { min: "15", target: "35", max: "55" })?.apply).toEqual({ min: "10", target: "25" });
    expect(at("moisture", { min: "10", target: "25", max: "55" })).toBeNull();
    expect(at("illuminance", { target_lux: "500" })?.apply).toEqual({ target_lux: "0" });
    expect(at("conductivity", { low_threshold_micro_siemens_per_cm: "350", high_threshold_micro_siemens_per_cm: "2000" })?.apply).toEqual({ low_threshold_micro_siemens_per_cm: "175" });
    expect(at("humidity", {})).toBeNull();
  });
  it("warns, without blocking, about a floor colder than the species survives", () => {
    const p = plant({ species });
    expect(survivalWarning(ENGLISH, p, { cold_threshold_celsius: "-2" })).toBe("Colder than Oleander survives (0 °C).");
    expect(survivalWarning(ENGLISH, p, { cold_threshold_celsius: "0" })).toBeNull();
    expect(survivalWarning(ENGLISH, plant(), { cold_threshold_celsius: "-2" })).toBeNull();
    const draft = { ...winterDraft(p), temperature: { cold_threshold_celsius: "-2", hot_threshold_celsius: "35" } };
    expect(winterPayload(p, draft, ENGLISH).errors).toEqual({});
  });
  it("offers soil temperature with the air's suggestion, inside the soil limits", () => {
    const defaults = structuredClone(backendRoleDefaults) as Record<string, Record<string, unknown>>;
    const roles = { ...plant().roles!, soil_temperature: { ...defaults.soil_temperature, ...source("sensor.mock_soil_temperature") } };
    const p = plant({ species, roles });
    expect(winterEditorRoles(p)).toEqual(["temperature", "soil_temperature", "moisture", "illuminance", "conductivity"]);
    const normal = normalThresholds(p, "soil_temperature");
    expect(normal).toEqual({ cold_threshold_celsius: 10, cold_clear_celsius: 12, hot_clear_celsius: 32, hot_threshold_celsius: 35 });
    expect(winterDraft(p).soil_temperature).toEqual({ cold_threshold_celsius: "10", hot_threshold_celsius: "35" });
    expect(winterSuggestion(ENGLISH, p, "soil_temperature", { cold_threshold_celsius: "10", hot_threshold_celsius: "35" }, normal)?.apply).toEqual({ cold_threshold_celsius: "0" });
    expect(survivalWarning(ENGLISH, p, { cold_threshold_celsius: "-2" })).toBe("Colder than Oleander survives (0 °C).");
    // The soil check accepts −20 to 60 °C: a hardy species gets no suggestion.
    const hardy = { ...p, species: { ...species, snapshot: { ...species.snapshot, survival_min_temperature: -25 } } };
    expect(winterSuggestion(ENGLISH, hardy, "soil_temperature", { cold_threshold_celsius: "10", hot_threshold_celsius: "35" }, normal)).toBeNull();
    expect(winterSuggestion(ENGLISH, hardy, "temperature", { cold_threshold_celsius: "10", hot_threshold_celsius: "35" }, normalThresholds(hardy, "temperature"))?.apply).toEqual({ cold_threshold_celsius: "-25" });
    expect(validateWinterRole("soil_temperature", { cold_threshold_celsius: "-25", hot_threshold_celsius: "35" }, normal, ENGLISH).error).toBe(ENGLISH.t("winter.error_soil_temperature"));
    const draft = { ...winterDraft(p), soil_temperature: { cold_threshold_celsius: "2", hot_threshold_celsius: "35" } };
    expect(winterPayload(p, draft, ENGLISH).thresholds).toEqual({ soil_temperature: { cold_threshold_celsius: 2, cold_clear_celsius: 4, hot_threshold_celsius: 35, hot_clear_celsius: 32 } });
    const reading = { value: 5, unit: "°C", state: "ok", range: { min: 2, target: null, max: 35 }, clear: null, normal_range: { min: 10, target: null, max: 35 }, last_reported: null, sources: [] } as unknown as Parameters<typeof winterRangeText>[2];
    expect(winterRangeText(ENGLISH, "soil_temperature", reading)).toEqual({ text: "2–35 °C", tooltip: "Winter value. Normally 10–35 °C." });
  });
  it("describes what changes and when", () => {
    const p = plant({ winter_thresholds: winterSet, rest_period: { start_month: 12, end_month: 2 } });
    expect(winterLines(ENGLISH, p).map(line => line.changed ? `${line.check} ${line.winter} instead of ${line.normal}` : `${line.check}: same`)).toEqual([
      "Temperature 0–35 °C instead of 10–35 °C", "Soil moisture: same", "Light no alert instead of at least 500 lx", "Fertilizer level: same",
    ]);
    expect(winterWhen(ENGLISH, p)).toBe("Apply during the rest period (Dec–Feb).");
    expect(winterWhen(ENGLISH, { ...p, placement: { mode: "dormant_storage", exposure: null, rain_exposure: null, container: null } })).toBe("Apply during the rest period (Dec–Feb) or while the placement is dormant storage.");
    expect(winterWhen(ENGLISH, plant({ winter_thresholds: winterSet }))).toBeNull();
    expect(nextRestStart(p, "2026-11-22")).toBe("2026-12-01");
    expect(nextRestStart(p, "2026-12-22")).toBe("2027-12-01");
    expect(nextText(ENGLISH, p, "2026-11-22")).toBe("Next: from December 1 (rest period).");
    expect(nextText(createLocalizer({ language: "de" }), p, "2026-11-22")).toBe("Nächstes Mal ab 1. Dezember (Ruhezeit).");
  });
  it("tells when winter applies before the overview arrives, storage first", () => {
    const p = plant({ rest_period: { start_month: 12, end_month: 2 } });
    expect(localWinterReason(p, "2027-01-10")).toBe("rest_period");
    expect(localWinterReason(p, "2026-11-22")).toBeNull();
    expect(localWinterReason({ ...p, placement: { mode: "dormant_storage", exposure: null, rain_exposure: null, container: null } }, "2027-01-10")).toBe("dormant_storage");
  });
  it("names the end of the rest period or dormant storage on the chip", () => {
    const p = plant({ winter_thresholds: winterSet, rest_period: { start_month: 12, end_month: 2 } });
    expect(winterChip(ENGLISH, p, { active: true, reason: "rest_period", until: "2027-02-28", roles: ["temperature"] })).toBe("Winter values until end of February");
    expect(winterChip(ENGLISH, p, { active: true, reason: "dormant_storage", until: null, roles: ["temperature"] })).toBe("Winter values · dormant storage");
    expect(winterChip(createLocalizer({ language: "de" }), p, { active: true, reason: "rest_period", until: "2027-02-28", roles: [] })).toBe("Winterwerte bis Ende Februar");
    expect(winterChip(ENGLISH, p, { active: false, reason: null, until: null, roles: ["temperature"] })).toBeNull();
    expect(winterChip(ENGLISH, p, null)).toBeNull();
  });
  it("shows a winter range with the normal one in its tooltip", () => {
    const reading = { value: 5, unit: "°C", state: "ok" as const, range: { min: 0, max: 35 }, clear: { min: 2, max: 32 }, last_reported: null, sources: [] };
    expect(winterRangeText(ENGLISH, "temperature", reading)).toBeNull();
    expect(winterRangeText(ENGLISH, "temperature", { ...reading, normal_range: { min: 10, max: 35 } })).toEqual({ text: "0–35 °C", tooltip: "Winter value. Normally 10–35 °C." });
    expect(winterRangeText(ENGLISH, "illuminance", { ...reading, unit: "lx", range: { min: 0, max: null }, normal_range: { min: 500, max: null } })).toEqual({ text: "No alert", tooltip: "Winter value. Normally at least 500 lx." });
  });
  it("offers winter values only in dormant storage and only for cold, dark or dry problems", () => {
    const storage = { mode: "dormant_storage", exposure: null, rain_exposure: null, container: null };
    const cold: PlantOverview = { ...overviewFor(plant()), status: "problem", problems: [{ role: "temperature", kind: "too_cold" }] };
    expect(showWinterHint(plant({ placement: storage }), cold)).toBe(true);
    expect(showWinterHint(plant({ placement: storage }), { ...cold, problems: [{ role: "moisture", kind: "needs_water" }] })).toBe(true);
    expect(showWinterHint(plant({ placement: storage }), { ...cold, problems: [{ role: "illuminance", kind: "low_light" }] })).toBe(true);
    // Hidden by default: another problem, no problem, another placement, a
    // rest period alone, or winter values already set.
    expect(showWinterHint(plant({ placement: storage }), { ...cold, problems: [{ role: "temperature", kind: "too_hot" }] })).toBe(false);
    expect(showWinterHint(plant({ placement: storage }), overviewFor(plant()))).toBe(false);
    expect(showWinterHint(plant(), cold)).toBe(false);
    expect(showWinterHint(plant({ rest_period: { start_month: 11, end_month: 2 } }), cold)).toBe(false);
    expect(showWinterHint(plant({ placement: storage, winter_thresholds: winterSet }), cold)).toBe(false);
  });
  it("words dormant storage so it stays true during the rest period", () => {
    const storage = { mode: "dormant_storage", exposure: null, rain_exposure: null, container: null };
    const view = { active: true, reason: "dormant_storage" as const, until: null, roles: ["temperature"] };
    const both = plant({ placement: storage, rest_period: { start_month: 12, end_month: 2 }, winter_thresholds: winterSet });
    expect(winterReasonText(ENGLISH, both, view, "2027-01-15")).toBe("Winter values apply while the placement is dormant storage and during the rest period (Dec–Feb). What changes:");
    expect(winterReasonText(ENGLISH, both, view, "2026-06-15")).toContain("They end when you change the placement.");
    expect(winterReasonText(ENGLISH, plant({ placement: storage, winter_thresholds: winterSet }), view, "2027-01-15")).toContain("They end when you change the placement.");
  });
  it("ignores malformed stored winter values", () => {
    expect(winterThresholds(plant({ winter_thresholds: { temperature: { cold_threshold_celsius: 0 } } }))).toBeNull();
    expect(winterThresholds(plant({ winter_thresholds: null }))).toBeNull();
    expect(winterThresholds(plant({ winter_thresholds: winterSet }))).toEqual(winterSet);
  });
  it("parses the overview's winter state and normal ranges", () => {
    const raw = { ...overviewFor(plant()), winter: { active: true, reason: "rest_period", until: "2027-02-28", roles: ["temperature"] } };
    expect(parseOverview(raw)?.winter).toEqual({ active: true, reason: "rest_period", until: "2027-02-28", roles: ["temperature"] });
    expect(parseOverview({ ...raw, winter: undefined })?.winter).toBeNull();
    expect(parseOverview({ ...raw, winter: { active: true, reason: null, until: null, roles: [] } })).toBeNull();
    const moisture = { ...raw.roles.moisture!, normal_range: { min: 15, target: 35, max: 55 } };
    expect(parseOverview({ ...raw, roles: { moisture } })?.roles.moisture?.normal_range).toEqual({ min: 15, target: 35, max: 55 });
    expect(parseOverview({ ...raw, roles: { moisture: { ...moisture, normal_range: { min: "x" } } } })).toBeNull();
  });
});

// ---- On the plant page ----

const NOW = "2026-11-22T12:00:00+00:00";
async function mount(initial: PlantRecord, overview: (p: PlantRecord) => PlantOverview = overviewFor) {
  let current = initial;
  const h = harness([initial], msg => {
    if (msg.type === "smart_plants/plants/list") return { plants: [current] };
    if (msg.type === "smart_plants/plants/overview") return { plants: [overview(current)] };
    if (msg.type === "smart_plants/plants/set_winter_thresholds") {
      current = { ...current, revision: current.revision + 1, winter_thresholds: msg.winter_thresholds as Record<string, Record<string, number>> | null };
      return { plant: current };
    }
    return undefined;
  });
  const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
  await settle(el); await click(el, initial.name); await settle(el);
  return { el, h };
}
const shadow = (el: SmartPlantsPanel) => el.shadowRoot!;
async function openSettings(el: SmartPlantsPanel, expand = false): Promise<void> {
  await click(el, "Settings");
  if (expand) { (el as unknown as { _setExpanded(key: string, open: boolean): void })._setExpanded("other_targets", true); await settle(el); }
}
const activeOverview = (p: PlantRecord): PlantOverview => ({
  ...overviewFor(p), status: "healthy",
  roles: { temperature: { value: 5.2, unit: "°C", state: "ok", range: { min: 0, target: null, max: 35 }, clear: { min: 2, max: 32 }, normal_range: { min: 10, target: null, max: 35 }, last_reported: NOW, sources: ["sensor.mock_temperature"] } },
  winter: { active: true, reason: "rest_period", until: "2027-02-28", roles: ["illuminance", "temperature"] },
});

describe("set_winter_thresholds", () => {
  it("sends the winter values and checks the reply", async () => {
    const reply = (winter: unknown, revision = 2) => harness([], () => ({ plant: { ...structuredClone(sample), revision, winter_thresholds: winter } }));
    const ok = reply(winterSet);
    await expect(api.setWinterThresholds(ok.hass, sample.id, 1, winterSet)).resolves.toMatchObject({ winter_thresholds: winterSet });
    expect(ok.calls.at(-1)).toEqual({ type: "smart_plants/plants/set_winter_thresholds", plant_id: sample.id, expected_revision: 1, winter_thresholds: winterSet });
    await expect(api.setWinterThresholds(reply(null).hass, sample.id, 1, null)).resolves.toMatchObject({ winter_thresholds: null });
    // A reply without the change, on the wrong revision or with a malformed value is refused.
    await expect(api.setWinterThresholds(reply(null).hass, sample.id, 1, winterSet)).rejects.toMatchObject({ code: "invalid_response" });
    await expect(api.setWinterThresholds(reply(winterSet, 5).hass, sample.id, 1, winterSet)).rejects.toMatchObject({ code: "invalid_response" });
    await expect(api.setWinterThresholds(reply({ temperature: { cold_threshold_celsius: "0" } }).hass, sample.id, 1, winterSet)).rejects.toMatchObject({ code: "invalid_response" });
  });
});

describe("winter values on the overview", () => {
  it("shows a snowflake next to the status chip only while winter values apply", async () => {
    const active = plant({ winter_thresholds: winterSet });
    const other = { ...plant(), id: "plant-2", name: "Kitchen Fern" };
    const h = harness([active, other], msg => msg.type === "smart_plants/plants/overview" ? { plants: [activeOverview(active), overviewFor(other)] } : undefined);
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el); await settle(el);
    const overview = el.shadowRoot!.querySelector("smart-plants-overview")!;
    await overview.updateComplete;
    const icons = [...overview.shadowRoot!.querySelectorAll<HTMLElement & { label: string }>(".chiprow sp-winter-icon")];
    expect(icons.map(icon => icon.label)).toEqual(["Winter values apply"]);
    expect(icons[0]!.closest("article")?.textContent).toContain("Garage Oleander");
  });
});

describe("winter values on the plant page", () => {
  it("adds nothing for a plant without winter values but the quiet entry under More targets", async () => {
    const { el } = await mount(plant());
    expect(shadow(el).querySelector(".winter-chip")).toBeNull();
    expect(panelText(el)).not.toContain("Winter values");
    await openSettings(el);
    expect(shadow(el).querySelector(".winter-card")).toBeNull();
    // The entry sits at the end of the collapsed More targets section.
    const expander = shadow(el).querySelector<HTMLDetailsElement>('[data-section="other_targets"]')!;
    expect(expander.open).toBe(false);
    await openSettings(el, true);
    expect(expander.querySelector(".winter-entry")?.textContent).toContain("Other limits for the cold months");
  });
  it("adds winter values from the entry and sends only the changed checks", async () => {
    const { el, h } = await mount(plant({ rest_period: { start_month: 12, end_month: 2 } }));
    await openSettings(el, true);
    const toasts: string[] = [];
    el.addEventListener("hass-notification", e => toasts.push((e as CustomEvent<{ message: string }>).detail.message));
    await click(el, "Add winter values");
    const dialog = shadow(el).querySelector("dialog.winter-dialog")!;
    expect(dialog.querySelector("h2")?.textContent).toBe("Winter values for Garage Oleander");
    expect(dialog.textContent).toContain("When: Apply during the rest period (Dec–Feb).");
    expect([...dialog.querySelectorAll("legend")].map(legend => legend.textContent?.trim())).toEqual(["Temperature", "Soil moisture", "Light", "Fertilizer level"]);
    const save = button(shadow(el), "Save winter values");
    expect(save.disabled).toBe(true);
    // Light: use the suggestion; temperature: type a floor.
    const lightGroup = [...dialog.querySelectorAll("fieldset")].find(group => group.textContent?.includes("Light"))!;
    lightGroup.querySelector<HTMLButtonElement>(".winter-suggestion button")!.click(); await settle(el);
    const cold = dialog.querySelector<HTMLInputElement>("fieldset input")!;
    cold.value = "0"; cold.dispatchEvent(new Event("input")); await settle(el);
    expect(dialog.textContent).toContain("Normally 10 °C");
    expect(button(shadow(el), "Save winter values").disabled).toBe(false);
    // An invalid value disables Save.
    cold.value = "34"; cold.dispatchEvent(new Event("input")); await settle(el);
    expect(button(shadow(el), "Save winter values").disabled).toBe(true);
    expect(dialog.textContent).toContain(ENGLISH.t("winter.error_temperature"));
    cold.value = "0"; cold.dispatchEvent(new Event("input")); await settle(el);
    await click(el, "Save winter values");
    expect(h.calls.filter(c => c.type === "smart_plants/plants/set_winter_thresholds")).toEqual([
      { type: "smart_plants/plants/set_winter_thresholds", plant_id: sample.id, expected_revision: 1, winter_thresholds: winterSet },
    ]);
    expect(toasts).toContain("Winter values saved.");
    // The open plant follows its own write.
    expect(panelText(el)).not.toContain("changed somewhere else");
    expect(shadow(el).querySelector("dialog.winter-dialog")).toBeNull();
    const card = shadow(el).querySelector(".winter-card")!;
    expect(card.textContent).toContain("Temperature 0–35 °C instead of 10–35 °C");
    expect(card.textContent).toContain("Next: from December 1 (rest period).");
    expect(shadow(el).querySelector(".winter-entry")).toBeNull();
  });
  it("removes winter values after a confirmation and offers Undo", async () => {
    const { el, h } = await mount(plant({ winter_thresholds: winterSet }));
    await openSettings(el);
    const card = shadow(el).querySelector(".winter-card")!;
    // No rest period and not in dormant storage: winter would never apply.
    expect(card.querySelector(".winter-never")?.textContent).toContain("Winter values don't apply yet.");
    const toasts: { message: string; action?: { text: string; action: () => void } }[] = [];
    el.addEventListener("hass-notification", e => toasts.push((e as CustomEvent).detail));
    await click(el, "Remove");
    const confirm = shadow(el).querySelector("dialog.winter-remove-dialog")!;
    expect(confirm.textContent).toContain("Garage Oleander uses its normal values all year again.");
    [...confirm.querySelectorAll("button")].find(b => b.textContent?.trim() === "Remove")!.click(); await settle(el); await settle(el);
    expect(h.calls.filter(c => c.type === "smart_plants/plants/set_winter_thresholds").at(-1)).toMatchObject({ winter_thresholds: null });
    expect(toasts.at(-1)).toMatchObject({ message: "Winter values removed", action: { text: "Undo" } });
    expect(shadow(el).querySelector(".winter-card")).toBeNull();
    toasts.at(-1)!.action!.action(); await settle(el); await settle(el);
    expect(h.calls.filter(c => c.type === "smart_plants/plants/set_winter_thresholds").at(-1)).toMatchObject({ winter_thresholds: winterSet });
    expect(shadow(el).querySelector(".winter-card")).not.toBeNull();
  });
  it("shows the active chip, its box and winter ranges with a snowflake", async () => {
    const { el } = await mount(plant({ winter_thresholds: winterSet, rest_period: { start_month: 12, end_month: 2 } }), activeOverview);
    const chip = shadow(el).querySelector<HTMLButtonElement>(".winter-chip")!;
    expect(chip.textContent).toContain("Winter values until end of February");
    expect(chip.getAttribute("aria-expanded")).toBe("false");
    chip.click(); await settle(el);
    const box = shadow(el).querySelector("#winter-box")!;
    expect(box.textContent).toContain("Winter values apply during the rest period (Dec–Feb). What changes:");
    expect(box.textContent).toContain("Light no alert instead of at least 500 lx");
    expect(box.textContent).not.toContain("Soil moisture");
    const range = shadow(el).querySelector(".keyreads .winter-range")!;
    expect(range.getAttribute("title")).toBe("Winter value. Normally 10–35 °C.");
    expect(range.textContent).toContain("0–35 °C");
    await click(el, "Settings");
    expect(shadow(el).querySelector(".winter-badge")?.textContent).toBe("Active now");
  });
  it("says so when Undo after Remove can't run", async () => {
    const { el, h } = await mount(plant({ winter_thresholds: winterSet }));
    await openSettings(el);
    const toasts: { message: string; action?: { text: string; action: () => void } }[] = [];
    el.addEventListener("hass-notification", e => toasts.push((e as CustomEvent).detail));
    await click(el, "Remove");
    const confirm = shadow(el).querySelector("dialog.winter-remove-dialog")!;
    [...confirm.querySelectorAll("button")].find(b => b.textContent?.trim() === "Remove")!.click(); await settle(el); await settle(el);
    const writes = h.calls.filter(c => c.type === "smart_plants/plants/set_winter_thresholds").length;
    // Another save is still running.
    (el as unknown as { _formBusy: boolean })._formBusy = true;
    toasts.at(-1)!.action!.action(); await settle(el); await settle(el);
    expect(h.calls.filter(c => c.type === "smart_plants/plants/set_winter_thresholds").length).toBe(writes);
    expect(toasts.at(-1)?.message).toBe("Couldn't put the winter values back. Add them again under Settings.");
  });
  it("says a paused plant's winter values wait instead of naming the next rest period", async () => {
    const { el } = await mount(plant({ winter_thresholds: winterSet, lifecycle_state: "disabled", rest_period: { start_month: 12, end_month: 2 } }), p => ({ ...overviewFor(p), winter: { active: false, reason: null, until: null, roles: ["temperature"] } }));
    await openSettings(el);
    const card = shadow(el).querySelector(".winter-card")!;
    expect(card.textContent).toContain("They don't apply while the plant is paused.");
    expect(card.textContent).not.toContain("Next:");
  });
  it("closes the winter box when another plant is opened", async () => {
    const { el } = await mount(plant({ winter_thresholds: winterSet, rest_period: { start_month: 12, end_month: 2 } }), activeOverview);
    shadow(el).querySelector<HTMLButtonElement>(".winter-chip")!.click(); await settle(el);
    expect(shadow(el).querySelector("#winter-box")).not.toBeNull();
    const panel = el as unknown as { _show(view: { kind: string; plantId?: string }): void };
    panel._show({ kind: "list" }); await settle(el);
    panel._show({ kind: "detail", plantId: plant().id }); await settle(el);
    expect(shadow(el).querySelector("#winter-box")).toBeNull();
    expect(shadow(el).querySelector(".winter-chip")?.getAttribute("aria-expanded")).toBe("false");
  });
  it("uses the dormant storage wording when storage applies", async () => {
    const storage = { mode: "dormant_storage", exposure: null, rain_exposure: null, container: null };
    const { el } = await mount(plant({ winter_thresholds: winterSet, placement: storage, rest_period: { start_month: 12, end_month: 2 } }), p => ({ ...activeOverview(p), winter: { active: true, reason: "dormant_storage", until: null, roles: ["temperature"] } }));
    const chip = shadow(el).querySelector<HTMLButtonElement>(".winter-chip")!;
    expect(chip.textContent).toContain("Winter values · dormant storage");
    chip.click(); await settle(el);
    expect(shadow(el).querySelector("#winter-box")?.textContent).toContain("They end when you change the placement.");
  });
  it("offers winter values on a cold plant in dormant storage", async () => {
    const storage = { mode: "dormant_storage", exposure: null, rain_exposure: null, container: null };
    const cold = (p: PlantRecord): PlantOverview => ({ ...overviewFor(p), status: "problem", problems: [{ role: "temperature", kind: "too_cold" }],
      roles: { temperature: { value: 5.2, unit: "°C", state: "low", range: { min: 10, target: null, max: 35 }, clear: { min: 12, max: 32 }, last_reported: NOW, sources: ["sensor.mock_temperature"] } } });
    const { el } = await mount(plant({ placement: storage }), cold);
    const reason = shadow(el).querySelector(".header-card .reason")!;
    expect(reason.textContent?.replace(/\s+/g, " ")).toContain("Temperature 5.2 °C is below the minimum of 10 °C · In dormant storage? Add winter values");
    await click(el, "Add winter values");
    expect(shadow(el).querySelector("dialog.winter-dialog")).not.toBeNull();
  });
});
