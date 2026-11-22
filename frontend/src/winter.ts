// Winter values: thresholds that replace a plant's normal ones while it rests
// or stands in dormant storage. The editor works with simple bounds ("Too cold
// below"); the values where an alert turns off again keep the plant's normal
// distance to those bounds. The backend decides when winter applies; this
// module only derives, validates and describes the values.
import type { Localizer, MessageKey } from "./localize.js";
import { CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS, HUMIDITY_STRESS_BUILTIN_DEFAULTS, LOW_LIGHT_STRESS_BUILTIN_DEFAULTS, TEMPERATURE_STRESS_BUILTIN_DEFAULTS, keys, moistureRole, roleSourceConfig, speciesCommonName, validateConductivityStressOverrides, validateHumidityStressOverrides, validateLowLightOverrides, validateTemperatureStressOverrides } from "./model.js";
import type { ConductivityStressInput, HumidityStressInput, LowLightStressInput, TemperatureStressInput } from "./model.js";
import type { PlantOverview, PlantProblem, RoleReading, WinterReason, WinterView } from "./overview-model.js";
import { formatRange, formatValue, readingLabel } from "./status.js";
import type { TargetRange } from "./status.js";
import { monthName, monthRange } from "./care-plan.js";
import type { PlantRecord } from "./types.js";
import { WINTER_ROLES } from "./validation.js";

// Checks a plant can give winter values, in the order the editor lists them.
export { WINTER_ROLES };
// The highest light threshold the backend accepts.
const LOW_LIGHT_MAX_LUX = 200_000;
export type WinterRole = typeof WINTER_ROLES[number];
export type WinterThresholds = Partial<Record<WinterRole, Record<string, number>>>;
export type { WinterReason, WinterView } from "./overview-model.js";
export const DORMANT_STORAGE = "dormant_storage";

interface WinterField {
  key: string;
  label: MessageKey;
  // The key of the value where this bound's alert turns off again.
  clear?: string;
}
interface WinterSpec {
  unit: string;
  step: string;
  keys: readonly string[];
  fields: readonly WinterField[];
  builtin: Record<string, number>;
  error: MessageKey;
}
export const WINTER_SPECS: Record<WinterRole, WinterSpec> = {
  temperature: {
    unit: "°C", step: "0.1", builtin: TEMPERATURE_STRESS_BUILTIN_DEFAULTS, error: "winter.error_temperature",
    keys: ["cold_threshold_celsius", "cold_clear_celsius", "hot_clear_celsius", "hot_threshold_celsius"],
    fields: [{ key: "cold_threshold_celsius", label: "winter.field_cold", clear: "cold_clear_celsius" }, { key: "hot_threshold_celsius", label: "winter.field_hot", clear: "hot_clear_celsius" }],
  },
  moisture: {
    unit: "%", step: "1", builtin: { min: 15, target: 35, max: 55 }, error: "winter.error_moisture",
    keys: ["min", "target", "max"],
    fields: [{ key: "min", label: "targets.needs_water" }, { key: "target", label: "targets.ideal" }, { key: "max", label: "targets.too_wet" }],
  },
  illuminance: {
    unit: "lx", step: "1", builtin: LOW_LIGHT_STRESS_BUILTIN_DEFAULTS, error: "winter.error_light",
    keys: ["target_lux", "clear_lux"],
    fields: [{ key: "target_lux", label: "winter.field_light", clear: "clear_lux" }],
  },
  conductivity: {
    unit: "µS/cm", step: "1", builtin: CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS, error: "winter.error_conductivity",
    keys: ["low_threshold_micro_siemens_per_cm", "low_clear_micro_siemens_per_cm", "high_clear_micro_siemens_per_cm", "high_threshold_micro_siemens_per_cm"],
    fields: [{ key: "low_threshold_micro_siemens_per_cm", label: "winter.field_low", clear: "low_clear_micro_siemens_per_cm" }, { key: "high_threshold_micro_siemens_per_cm", label: "winter.field_high", clear: "high_clear_micro_siemens_per_cm" }],
  },
  humidity: {
    unit: "%", step: "0.1", builtin: HUMIDITY_STRESS_BUILTIN_DEFAULTS, error: "winter.error_humidity",
    keys: ["dry_threshold_percent", "dry_clear_percent", "damp_clear_percent", "damp_threshold_percent"],
    fields: [{ key: "dry_threshold_percent", label: "winter.field_dry", clear: "dry_clear_percent" }, { key: "damp_threshold_percent", label: "winter.field_damp", clear: "damp_clear_percent" }],
  },
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const round1 = (v: number) => Math.round(v * 10) / 10;

// The plant's stored winter values; anything malformed counts as none.
export function winterThresholds(plant: PlantRecord): WinterThresholds | null {
  const raw = plant.winter_thresholds;
  if (!isRecord(raw)) return null;
  const out: WinterThresholds = {};
  for (const role of WINTER_ROLES) {
    const values = raw[role];
    if (values === undefined) continue;
    if (!isRecord(values) || !WINTER_SPECS[role].keys.every(key => finite(values[key]))) return null;
    out[role] = Object.fromEntries(WINTER_SPECS[role].keys.map(key => [key, values[key] as number]));
  }
  return Object.keys(out).length ? out : null;
}

// Whether a sensor is assigned to the check.
export function hasWinterSensor(plant: PlantRecord, role: WinterRole): boolean {
  return role === "moisture" ? (moistureRole(plant)?.sources.length ?? 0) > 0 : (roleSourceConfig(plant, role)?.sources.length ?? 0) > 0;
}
// The checks the editor offers: those with a sensor.
export function winterEditorRoles(plant: PlantRecord): WinterRole[] {
  return WINTER_ROLES.filter(role => hasWinterSensor(plant, role));
}

// The values the check uses the rest of the year: the plant's own value, then
// the species' value, then the built-in one.
export function normalThresholds(plant: PlantRecord, role: WinterRole): Record<string, number> {
  const spec = WINTER_SPECS[role];
  if (role === "moisture") {
    const m = moistureRole(plant);
    if (!m) return { ...spec.builtin };
    return Object.fromEntries(keys.map(key => [key, m.threshold_overrides[key] ?? m.threshold_defaults[key].value]));
  }
  const raw = plant.roles?.[role];
  const overrides = isRecord(raw) && isRecord(raw.stress_threshold_overrides) ? raw.stress_threshold_overrides : {};
  const species = isRecord(raw) && isRecord(raw.species_defaults) ? raw.species_defaults : {};
  return Object.fromEntries(spec.keys.map(key => {
    const own = overrides[key];
    const entry = species[key];
    const inherited = isRecord(entry) ? entry.value : undefined;
    return [key, finite(own) ? own : finite(inherited) ? inherited : spec.builtin[key]!];
  }));
}

// ---- Editor draft ----

// Field text per check, keyed by threshold key.
export type WinterDraft = Partial<Record<WinterRole, Record<string, string>>>;

// Prefilled with the values that apply in winter now: the winter values, or
// the normal ones for a check without them.
export function winterDraft(plant: PlantRecord): WinterDraft {
  const stored = winterThresholds(plant);
  return Object.fromEntries(winterEditorRoles(plant).map(role => {
    const values = stored?.[role] ?? normalThresholds(plant, role);
    return [role, Object.fromEntries(WINTER_SPECS[role].fields.map(field => [field.key, String(values[field.key])]))];
  }));
}

function parseField(text: string | undefined): number | null {
  const trimmed = (text ?? "").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// Every threshold of the check from the edited bounds: each clear value keeps
// its normal distance to its bound.
export function deriveWinterValues(role: WinterRole, bounds: Record<string, number>, normal: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const field of WINTER_SPECS[role].fields) {
    const value = role === "moisture" ? bounds[field.key]! : round1(bounds[field.key]!);
    out[field.key] = value;
    if (field.clear) out[field.clear] = round1(value + normal[field.clear]! - normal[field.key]!);
  }
  return out;
}

// One check's winter values, checked with the rules of its normal editor.
// `values` holds every threshold key; null while a field is invalid.
export function validateWinterRole(role: WinterRole, fields: Record<string, string>, normal: Record<string, number>, l: Localizer): { values: Record<string, number> | null; error: string | null } {
  const spec = WINTER_SPECS[role];
  // The light clear value keeps the normal distance above the target and
  // can't pass the 200,000 lx limit, so the target's upper bound depends on it.
  const lightMax = LOW_LIGHT_MAX_LUX - (normal.clear_lux! - normal.target_lux!);
  const fail = { values: null, error: role === "illuminance" ? l.t(spec.error, { max: l.number(lightMax) }) : l.t(spec.error) };
  const bounds: Record<string, number> = {};
  for (const field of spec.fields) {
    const value = parseField(fields[field.key]);
    if (value === null) return fail;
    bounds[field.key] = value;
  }
  const values = deriveWinterValues(role, bounds, normal);
  const text = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]));
  switch (role) {
    case "moisture": {
      const [min, target, max] = [values.min!, values.target!, values.max!];
      const ok = [min, target, max].every(v => Number.isInteger(v) && v >= 1 && v <= 99) && min < target && target < max && max - min >= 4;
      return ok ? { values, error: null } : fail;
    }
    case "temperature": return validateTemperatureStressOverrides(text as TemperatureStressInput, l).error ? fail : { values, error: null };
    case "humidity": return validateHumidityStressOverrides(text as HumidityStressInput, l).error ? fail : { values, error: null };
    case "conductivity": return validateConductivityStressOverrides(text as ConductivityStressInput, l).error ? fail : { values, error: null };
    case "illuminance": return validateLowLightOverrides(text as LowLightStressInput, l).error ? fail : { values, error: null };
  }
}

const sameValues = (a: Record<string, number>, b: Record<string, number>) => Object.keys(a).every(key => Math.abs(a[key]! - (b[key] ?? Number.NaN)) < 1e-9);

// What Save sends: only the checks whose winter values differ from their
// normal ones, plus stored winter values of checks the editor doesn't show
// (their sensor was removed). `thresholds` is null when nothing differs;
// `errors` names each invalid check.
export function winterPayload(plant: PlantRecord, draft: WinterDraft, l: Localizer): { thresholds: WinterThresholds | null; errors: Partial<Record<WinterRole, string>> } {
  const out: WinterThresholds = {}; const errors: Partial<Record<WinterRole, string>> = {};
  const stored = winterThresholds(plant);
  for (const role of WINTER_ROLES) {
    const fields = draft[role];
    if (!fields) { if (stored?.[role]) out[role] = stored[role]; continue; }
    const normal = normalThresholds(plant, role);
    const { values, error } = validateWinterRole(role, fields, normal, l);
    if (error || !values) { errors[role] = error ?? l.t(WINTER_SPECS[role].error); continue; }
    if (!sameValues(values, normal)) out[role] = values;
  }
  return { thresholds: Object.keys(out).length ? out : null, errors };
}

// "Same as normal" or "Normally 15 %" under a field.
export function fieldHint(l: Localizer, role: WinterRole, key: string, text: string | undefined, normal: Record<string, number>): { text: string; changed: boolean } {
  const value = parseField(text);
  const normalValue = normal[key]!;
  if (value !== null && Math.abs(value - normalValue) < 1e-9) return { text: l.t("winter.same"), changed: false };
  return { text: l.t("winter.normally", { value: formatValue(l, normalValue, WINTER_SPECS[role].unit) }), changed: true };
}

// The species name the suggestions use.
function speciesName(l: Localizer, plant: PlantRecord): string {
  const snapshot = plant.species?.snapshot;
  return (snapshot ? speciesCommonName(snapshot, l.language) ?? snapshot.latin_name : null) ?? plant.name;
}
export function survivalTemperature(plant: PlantRecord): number | null {
  const value = plant.species?.snapshot.survival_min_temperature;
  return finite(value) ? value : null;
}

// A moisture suggestion rounds to steps of 5 %, unless that would undo it.
function roundMoisture(value: number, normal: number): number {
  const stepped = Math.round(value / 5) * 5;
  return stepped >= 1 && stepped < normal ? stepped : Math.max(1, Math.round(value));
}

export interface WinterSuggestion { text: string; apply: Record<string, string> }
// A suggestion for the check, or null when there is none or the fields
// already hold it.
export function winterSuggestion(l: Localizer, plant: PlantRecord, role: WinterRole, fields: Record<string, string> | undefined, normal: Record<string, number>): WinterSuggestion | null {
  const current = (key: string) => parseField(fields?.[key]);
  switch (role) {
    case "temperature": {
      const survival = survivalTemperature(plant);
      if (survival === null || current("cold_threshold_celsius") === survival) return null;
      return { text: l.t("winter.suggest_temperature", { value: formatValue(l, survival, "°C"), species: speciesName(l, plant) }), apply: { cold_threshold_celsius: String(survival) } };
    }
    case "moisture": {
      const min = roundMoisture(normal.min! * 2 / 3, normal.min!);
      const target = roundMoisture(normal.target! * 3 / 4, normal.target!);
      if (min === normal.min && target === normal.target) return null;
      if (current("min") === min && current("target") === target) return null;
      const apply = { min: String(min), target: String(target), max: fields?.max ?? String(normal.max) };
      if (validateWinterRole("moisture", apply, normal, l).error) return null;
      return { text: l.t("winter.suggest_moisture", { min: l.percent(min), target: l.percent(target) }), apply: { min: apply.min, target: apply.target } };
    }
    case "illuminance":
      return normal.target_lux === 0 || current("target_lux") === 0 ? null : { text: l.t("winter.suggest_light"), apply: { target_lux: "0" } };
    case "conductivity": {
      const low = round1(normal.low_threshold_micro_siemens_per_cm! / 2);
      if (low === normal.low_threshold_micro_siemens_per_cm || current("low_threshold_micro_siemens_per_cm") === low) return null;
      return { text: l.t("winter.suggest_conductivity", { value: formatValue(l, low, "µS/cm") }), apply: { low_threshold_micro_siemens_per_cm: String(low) } };
    }
    case "humidity": return null;
  }
}

// A warning, not an error: a floor colder than the species survives.
export function survivalWarning(l: Localizer, plant: PlantRecord, fields: Record<string, string> | undefined): string | null {
  const survival = survivalTemperature(plant);
  const floor = parseField(fields?.cold_threshold_celsius);
  if (survival === null || floor === null || floor >= survival) return null;
  return l.t("winter.warn_survival", { species: speciesName(l, plant), value: formatValue(l, survival, "°C") });
}

// ---- Describing winter values ----

// The target range a set of thresholds gives, as the plant page shows ranges.
export function winterRange(role: WinterRole, values: Record<string, number>): TargetRange {
  switch (role) {
    case "temperature": return { min: values.cold_threshold_celsius!, max: values.hot_threshold_celsius! };
    case "moisture": return { min: values.min!, target: values.target!, max: values.max! };
    case "illuminance": return { min: values.target_lux!, max: null };
    case "conductivity": return { min: values.low_threshold_micro_siemens_per_cm!, max: values.high_threshold_micro_siemens_per_cm! };
    case "humidity": return { min: values.dry_threshold_percent!, max: values.damp_threshold_percent! };
  }
}
const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase() + text.slice(1);
// A range inside a sentence: "0–35 °C", "at least 500 lx", "no alert".
export function rangePhrase(l: Localizer, role: WinterRole, range: TargetRange): string {
  if (role === "illuminance" && range.min === 0) return l.t("winter.no_alert");
  return lowerFirst(formatRange(l, role, range, WINTER_SPECS[role].unit));
}

export interface WinterLine { role: WinterRole; check: string; changed: boolean; winter: string; normal: string }
// One line per check: what changes, or that it stays as normal. Checks
// without a sensor are listed only when they have winter values.
export function winterLines(l: Localizer, plant: PlantRecord): WinterLine[] {
  const stored = winterThresholds(plant);
  return WINTER_ROLES.filter(role => stored?.[role] || hasWinterSensor(plant, role)).map(role => {
    const normal = rangePhrase(l, role, winterRange(role, normalThresholds(plant, role)));
    const winter = stored?.[role] ? rangePhrase(l, role, winterRange(role, stored[role])) : normal;
    return { role, check: readingLabel(l, role), changed: !!stored?.[role], winter, normal };
  });
}
// "Temperature 0–35 °C instead of 10–35 °C" split around the check's name,
// so the name can stand out.
export function changeParts(l: Localizer, line: WinterLine): { before: string; after: string } {
  const marker = "\u0000";
  const [before = "", after = ""] = l.t("winter.change", { check: marker, winter: line.winter, normal: line.normal }).split(marker);
  return { before, after };
}

const isStorage = (plant: PlantRecord) => plant.placement?.mode === DORMANT_STORAGE;
function restMonths(l: Localizer, plant: PlantRecord): string | null {
  const rest = plant.rest_period;
  return rest ? monthRange(l, rest.start_month, rest.end_month, "short") : null;
}
// When winter values apply, from the plant's rest period and placement; null
// when they never would.
export function winterWhen(l: Localizer, plant: PlantRecord): string | null {
  const months = restMonths(l, plant);
  if (months && isStorage(plant)) return l.t("winter.when_both", { months });
  if (months) return l.t("winter.when_rest", { months });
  if (isStorage(plant)) return l.t("winter.when_storage");
  return null;
}
// The day the next rest period starts, after `today` (YYYY-MM-DD).
export function nextRestStart(plant: PlantRecord, today: string): string | null {
  const rest = plant.rest_period;
  const [year, month] = today.split("-").map(Number);
  if (!rest || !year || !month) return null;
  const start = rest.start_month > month ? year : year + 1;
  return `${start}-${String(rest.start_month).padStart(2, "0")}-01`;
}
export function nextText(l: Localizer, plant: PlantRecord, today: string): string | null {
  const next = nextRestStart(plant, today);
  if (!next) return null;
  const [year, month, day] = next.split("-").map(Number) as [number, number, number];
  const date = new Intl.DateTimeFormat(l.language, { day: "numeric", month: "long", timeZone: "UTC" }).format(Date.UTC(year, month - 1, day));
  return l.t("winter.next", { date });
}

// Whether winter applies today, as the backend decides it: dormant storage
// first, then a rest period month. Used only before the overview arrives.
export function localWinterReason(plant: PlantRecord, today: string): WinterReason | null {
  if (isStorage(plant)) return DORMANT_STORAGE;
  const rest = plant.rest_period; const month = Number(today.slice(5, 7));
  if (!rest || !month) return null;
  const inRange = rest.start_month <= rest.end_month ? month >= rest.start_month && month <= rest.end_month : month >= rest.start_month || month <= rest.end_month;
  return inRange ? "rest_period" : null;
}

// The header chip while winter values apply; null otherwise.
export function winterChip(l: Localizer, plant: PlantRecord, winter: WinterView | null | undefined): string | null {
  if (!winter?.active) return null;
  if (winter.reason === "rest_period") {
    const month = winter.until ? Number(winter.until.slice(5, 7)) : plant.rest_period?.end_month;
    if (month) return l.t("winter.chip_until", { month: monthName(l, month) });
  }
  return l.t("winter.chip_storage");
}
// The sentence that opens the chip's box.
export function winterReasonText(l: Localizer, plant: PlantRecord, winter: WinterView, today: string): string {
  const months = restMonths(l, plant);
  if (winter.reason === "rest_period" && months) return l.t("winter.reason_rest", { months });
  // In dormant storage during the rest period, changing the placement alone
  // doesn't end the winter values.
  const resting = months !== null && localWinterReason({ ...plant, placement: null }, today) === "rest_period";
  return resting ? l.t("winter.reason_storage_rest", { months }) : l.t("winter.reason_storage");
}

// A reading's range while winter values replace it, with the tooltip that
// names the normal range; null when the normal range applies.
export function winterRangeText(l: Localizer, role: string, reading: RoleReading): { text: string; tooltip: string } | null {
  const normal = reading.normal_range;
  if (!normal || !(WINTER_ROLES as readonly string[]).includes(role)) return null;
  const winterRole = role as WinterRole;
  const text = winterRole === "illuminance" && reading.range.min === 0 ? l.t("winter.no_alert_short") : formatRange(l, winterRole, reading.range, reading.unit);
  const normalText = winterRole === "illuminance" && normal.min === 0 ? l.t("winter.no_alert") : lowerFirst(formatRange(l, winterRole, normal, reading.unit));
  return { text, tooltip: l.t("winter.range_tooltip", { normal: normalText }) };
}

// Problems the hint offers winter values for.
const HINT_PROBLEMS: readonly PlantProblem[] = [{ role: "temperature", kind: "too_cold" }, { role: "illuminance", kind: "low_light" }, { role: "moisture", kind: "needs_water" }];
// The "In dormant storage? Add winter values" hint: only for a plant in
// dormant storage without winter values that shows one of those problems.
export function showWinterHint(plant: PlantRecord, overview: PlantOverview | undefined): boolean {
  if (!overview || !isStorage(plant) || plant.winter_thresholds || overview.status === "paused") return false;
  return overview.problems.some(problem => HINT_PROBLEMS.some(hint => hint.role === problem.role && hint.kind === problem.kind));
}
