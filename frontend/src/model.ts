import type { HADevice, HAEntity, HAState, MoistureInput, MoistureRoleConfig, PlantRecord, PlantSpecies, RoleSourceConfig, RoleSourceInput, SensorSource } from "./types.js";

export const keys = ["min", "target", "max"] as const;
export const builtin = { min: 15, target: 35, max: 55 };
export const placements = ["indoor", "outdoor", "balcony", "greenhouse", "covered_outdoor", "dormant_storage"];
// The Phase 7 problem binaries surfaced by the read-only diagnostics section.
// Moisture problems (needs_water, too_wet, sensor_stale) are already summarized
// in the detail header; this list intentionally excludes them so both places
// stay unambiguous.
export const PROBLEM_BINARY_ROLES = [
  "temperature_stress",
  "humidity_stress",
  "soil_temperature_stress",
  "co2_stress",
  "low_light",
  "low_battery",
  "conductivity_stress",
] as const;
export type ProblemBinaryRole = typeof PROBLEM_BINARY_ROLES[number];
// Human-readable labels for every role key that may appear in a
// `smart_plants/plants/health` reply's `contributors` / `configured` lists.
// Keys match the accepted CONTRIBUTOR_ORDER in the multi-role health contract.
export const HEALTH_CONTRIBUTOR_LABELS: Record<string, string> = {
  moisture: "Moisture",
  temperature: "Temperature",
  humidity: "Humidity",
  illuminance: "Illuminance",
  battery: "Battery",
  conductivity: "Conductivity",
  soil_temperature: "Soil temperature",
  co2: "CO2",
};
// Plain-English gloss per confidence label. Text-only signalling per the
// accepted Phase 6 detail-view a11y baseline.
export const HEALTH_CONFIDENCE_GLOSS: Record<string, string> = {
  high: "every configured role is currently available.",
  medium: "at least half of the configured roles are currently available.",
  low: "fewer than half of the configured roles are currently available.",
  unknown: "no roles are configured for this plant yet.",
};
// Localize wrapper: reads hass.localize when supplied, interpolates `{key}`
// placeholders from args, and falls back to `fallback` when localize is not
// present or returns an empty/whitespace-only string. Kept parameter-position
// free so callers can `_t = translator(this.hass?.localize)`.
export type LocalizeFn = (key: string, ...args: unknown[]) => string;
export function translator(localize: LocalizeFn | undefined): (key: string, fallback: string, args?: Record<string, string | number>) => string {
  return (key, fallback, args) => {
    let value = fallback;
    if (localize) {
      const flat: unknown[] = [];
      if (args) for (const [k, v] of Object.entries(args)) { flat.push(k, v); }
      const raw = localize(key, ...flat);
      if (typeof raw === "string" && raw.trim() !== "") value = raw;
    }
    if (args) for (const [k, v] of Object.entries(args)) value = value.replaceAll(`{${k}}`, String(v));
    return value;
  };
}
export function contributorLabel(role: string, localize: LocalizeFn | undefined): string {
  const fallback = HEALTH_CONTRIBUTOR_LABELS[role] ?? role.replaceAll("_", " ");
  return translator(localize)(`component.smart_plants.panel.health_contributor.${role}`, fallback);
}
export function confidenceGloss(label: string, localize: LocalizeFn | undefined): string {
  const fallback = HEALTH_CONFIDENCE_GLOSS[label] ?? "no additional detail available.";
  return translator(localize)(`component.smart_plants.panel.section.confidence_${label}`, fallback);
}
export const PROBLEM_BINARY_LABELS: Record<ProblemBinaryRole, string> = {
  temperature_stress: "Temperature stress",
  humidity_stress: "Humidity stress",
  soil_temperature_stress: "Soil temperature stress",
  co2_stress: "CO2 stress",
  low_light: "Low light",
  low_battery: "Low battery",
  conductivity_stress: "Conductivity stress",
};
export type ProblemStatus = "on" | "off" | "unavailable" | "not_configured";
export interface ProblemBinaryReading {
  role: ProblemBinaryRole;
  label: string;
  status: ProblemStatus;
  reason: string | null;
}
// Effective threshold attributes each Phase 7 stress binary exposes. The
// diagnostics section surfaces these read-only. Overrides (storage minor 8/9)
// are applied backend-side so `value` already reflects the effective (built-in
// or overridden) threshold.
export interface ThresholdSpec { key: string; label: string; unit: string }
export const THRESHOLD_SPECS: Record<ProblemBinaryRole, readonly ThresholdSpec[]> = {
  temperature_stress: [
    { key: "cold_threshold_celsius", label: "Cold threshold", unit: "°C" },
    { key: "cold_clear_celsius", label: "Cold clear", unit: "°C" },
    { key: "hot_clear_celsius", label: "Hot clear", unit: "°C" },
    { key: "hot_threshold_celsius", label: "Hot threshold", unit: "°C" },
  ],
  humidity_stress: [
    { key: "dry_threshold_percent", label: "Dry threshold", unit: "%" },
    { key: "dry_clear_percent", label: "Dry clear", unit: "%" },
    { key: "damp_clear_percent", label: "Damp clear", unit: "%" },
    { key: "damp_threshold_percent", label: "Damp threshold", unit: "%" },
  ],
  soil_temperature_stress: [
    { key: "cold_threshold_celsius", label: "Cold threshold", unit: "°C" },
    { key: "cold_clear_celsius", label: "Cold clear", unit: "°C" },
    { key: "hot_clear_celsius", label: "Hot clear", unit: "°C" },
    { key: "hot_threshold_celsius", label: "Hot threshold", unit: "°C" },
  ],
  co2_stress: [
    { key: "threshold_ppm", label: "High threshold", unit: "ppm" },
    { key: "clear_ppm", label: "High clear", unit: "ppm" },
  ],
  low_light: [
    { key: "target_lux", label: "Target", unit: "lx" },
    { key: "clear_lux", label: "Clear", unit: "lx" },
  ],
  low_battery: [
    { key: "threshold_percent", label: "Low threshold", unit: "%" },
    { key: "clear_percent", label: "Low clear", unit: "%" },
  ],
  conductivity_stress: [
    { key: "low_threshold_micro_siemens_per_cm", label: "Low threshold", unit: "µS/cm" },
    { key: "low_clear_micro_siemens_per_cm", label: "Low clear", unit: "µS/cm" },
    { key: "high_clear_micro_siemens_per_cm", label: "High clear", unit: "µS/cm" },
    { key: "high_threshold_micro_siemens_per_cm", label: "High threshold", unit: "µS/cm" },
  ],
};
export interface ThresholdReading { key: string; label: string; unit: string; value: number | null }
// Built-in defaults used to merge inherited (null / blank) overrides for the
// temperature_stress threshold-editing surface. Kept in one place with the
// backend temperature-stress threshold rules.
export const TEMPERATURE_STRESS_BUILTIN_DEFAULTS: Record<string, number> = {
  cold_threshold_celsius: 10.0,
  cold_clear_celsius: 12.0,
  hot_clear_celsius: 32.0,
  hot_threshold_celsius: 35.0,
};
export const TEMPERATURE_STRESS_KEYS = ["cold_threshold_celsius", "cold_clear_celsius", "hot_clear_celsius", "hot_threshold_celsius"] as const;
export type TemperatureStressKey = typeof TEMPERATURE_STRESS_KEYS[number];
export type TemperatureStressInput = Record<TemperatureStressKey, string>;
const _TEMP_LOW = -40.0;
const _TEMP_HIGH = 80.0;
const _TEMP_MIN_HYST = 0.5;
const _TEMP_MIN_STABLE = 1.0;
function _roundHalfUpOneDecimal(value: number): number {
  return value >= 0 ? Math.floor(value * 10 + 0.5) / 10 : -(Math.floor(-value * 10 + 0.5) / 10);
}
// Parse a text input to null (blank = inherit) or a validated one-decimal number in the accepted range.
export function parseTemperatureStressField(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "invalid";
  const rounded = _roundHalfUpOneDecimal(n);
  if (rounded < _TEMP_LOW || rounded > _TEMP_HIGH) return "invalid";
  return rounded;
}
// Validate an entire override map for temperature_stress and return the WebSocket
// payload (all four keys, number | null) plus an inline error string if invalid.
export function validateTemperatureStressOverrides(input: TemperatureStressInput): { values: Record<TemperatureStressKey, number | null>; error: string | null } {
  const parsed: Partial<Record<TemperatureStressKey, number | null>> = {};
  for (const key of TEMPERATURE_STRESS_KEYS) {
    const result = parseTemperatureStressField(input[key]);
    if (result === "invalid") return { values: {} as Record<TemperatureStressKey, number | null>, error: "Effective thresholds must satisfy cold trigger < cold clear < hot clear < hot trigger, with ≥ 0.5 °C hysteresis and a ≥ 1.0 °C stable band, all within −40.0…80.0 °C." };
    parsed[key] = result;
  }
  const values = parsed as Record<TemperatureStressKey, number | null>;
  const eff = (k: TemperatureStressKey) => values[k] ?? TEMPERATURE_STRESS_BUILTIN_DEFAULTS[k];
  const ct = eff("cold_threshold_celsius"), cc = eff("cold_clear_celsius"), hc = eff("hot_clear_celsius"), ht = eff("hot_threshold_celsius");
  if (!(ct < cc && cc < hc && hc < ht) || cc - ct < _TEMP_MIN_HYST || ht - hc < _TEMP_MIN_HYST || hc - cc < _TEMP_MIN_STABLE) {
    return { values, error: "Effective thresholds must satisfy cold trigger < cold clear < hot clear < hot trigger, with ≥ 0.5 °C hysteresis and a ≥ 1.0 °C stable band, all within −40.0…80.0 °C." };
  }
  return { values, error: null };
}
// Seed the sub-form from the persisted overrides on TemperatureConfig (null = blank).
export function temperatureStressInput(persisted: Partial<Record<TemperatureStressKey, number | null>> | null | undefined): TemperatureStressInput {
  const out: TemperatureStressInput = { cold_threshold_celsius: "", cold_clear_celsius: "", hot_clear_celsius: "", hot_threshold_celsius: "" };
  if (!persisted) return out;
  for (const key of TEMPERATURE_STRESS_KEYS) {
    const v = persisted[key];
    out[key] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}
// Humidity stress overrides, mirroring the temperature helpers with the
// backend humidity contract's bounds/hysteresis/stable-band rules.
export const HUMIDITY_STRESS_BUILTIN_DEFAULTS: Record<string, number> = {
  dry_threshold_percent: 25.0,
  dry_clear_percent: 30.0,
  damp_clear_percent: 80.0,
  damp_threshold_percent: 85.0,
};
export const HUMIDITY_STRESS_KEYS = ["dry_threshold_percent", "dry_clear_percent", "damp_clear_percent", "damp_threshold_percent"] as const;
export type HumidityStressKey = typeof HUMIDITY_STRESS_KEYS[number];
export type HumidityStressInput = Record<HumidityStressKey, string>;
const _HUM_LOW = 0.0;
const _HUM_HIGH = 100.0;
const _HUM_MIN_HYST = 1.0;
const _HUM_MIN_STABLE = 5.0;
export function parseHumidityStressField(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "invalid";
  const rounded = _roundHalfUpOneDecimal(n);
  if (rounded < _HUM_LOW || rounded > _HUM_HIGH) return "invalid";
  return rounded;
}
const _HUM_ERROR = "Effective thresholds must satisfy dry trigger < dry clear < damp clear < damp trigger, with ≥ 1.0 % hysteresis and a ≥ 5.0 % stable band, all within 0.0…100.0 %.";
export function validateHumidityStressOverrides(input: HumidityStressInput): { values: Record<HumidityStressKey, number | null>; error: string | null } {
  const parsed: Partial<Record<HumidityStressKey, number | null>> = {};
  for (const key of HUMIDITY_STRESS_KEYS) {
    const result = parseHumidityStressField(input[key]);
    if (result === "invalid") return { values: {} as Record<HumidityStressKey, number | null>, error: _HUM_ERROR };
    parsed[key] = result;
  }
  const values = parsed as Record<HumidityStressKey, number | null>;
  const eff = (k: HumidityStressKey) => values[k] ?? HUMIDITY_STRESS_BUILTIN_DEFAULTS[k];
  const dt = eff("dry_threshold_percent"), dc = eff("dry_clear_percent"), pc = eff("damp_clear_percent"), pt = eff("damp_threshold_percent");
  if (!(dt < dc && dc < pc && pc < pt) || dc - dt < _HUM_MIN_HYST || pt - pc < _HUM_MIN_HYST || pc - dc < _HUM_MIN_STABLE) {
    return { values, error: _HUM_ERROR };
  }
  return { values, error: null };
}
export function humidityStressInput(persisted: Partial<Record<HumidityStressKey, number | null>> | null | undefined): HumidityStressInput {
  const out: HumidityStressInput = { dry_threshold_percent: "", dry_clear_percent: "", damp_clear_percent: "", damp_threshold_percent: "" };
  if (!persisted) return out;
  for (const key of HUMIDITY_STRESS_KEYS) {
    const v = persisted[key];
    out[key] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}
// Conductivity stress overrides, mirroring the temperature/humidity helpers
// with the backend conductivity contract's bounds/hysteresis/stable-band
// rules.
export const CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS: Record<string, number> = {
  low_threshold_micro_siemens_per_cm: 350.0,
  low_clear_micro_siemens_per_cm: 500.0,
  high_clear_micro_siemens_per_cm: 1800.0,
  high_threshold_micro_siemens_per_cm: 2000.0,
};
export const CONDUCTIVITY_STRESS_KEYS = ["low_threshold_micro_siemens_per_cm", "low_clear_micro_siemens_per_cm", "high_clear_micro_siemens_per_cm", "high_threshold_micro_siemens_per_cm"] as const;
export type ConductivityStressKey = typeof CONDUCTIVITY_STRESS_KEYS[number];
export type ConductivityStressInput = Record<ConductivityStressKey, string>;
const _COND_LOW = 0.0;
const _COND_HIGH = 10000.0;
const _COND_MIN_HYST = 10.0;
const _COND_MIN_STABLE = 50.0;
export function parseConductivityStressField(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "invalid";
  const rounded = _roundHalfUpOneDecimal(n);
  if (rounded < _COND_LOW || rounded > _COND_HIGH) return "invalid";
  return rounded;
}
const _COND_ERROR = "Effective thresholds must satisfy low trigger < low clear < high clear < high trigger, with ≥ 10.0 µS/cm hysteresis and a ≥ 50.0 µS/cm stable band, all within 0.0…10000.0 µS/cm.";
export function validateConductivityStressOverrides(input: ConductivityStressInput): { values: Record<ConductivityStressKey, number | null>; error: string | null } {
  const parsed: Partial<Record<ConductivityStressKey, number | null>> = {};
  for (const key of CONDUCTIVITY_STRESS_KEYS) {
    const result = parseConductivityStressField(input[key]);
    if (result === "invalid") return { values: {} as Record<ConductivityStressKey, number | null>, error: _COND_ERROR };
    parsed[key] = result;
  }
  const values = parsed as Record<ConductivityStressKey, number | null>;
  const eff = (k: ConductivityStressKey) => values[k] ?? CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS[k];
  const lt = eff("low_threshold_micro_siemens_per_cm"), lc = eff("low_clear_micro_siemens_per_cm"), hc = eff("high_clear_micro_siemens_per_cm"), ht = eff("high_threshold_micro_siemens_per_cm");
  if (!(lt < lc && lc < hc && hc < ht) || lc - lt < _COND_MIN_HYST || ht - hc < _COND_MIN_HYST || hc - lc < _COND_MIN_STABLE) {
    return { values, error: _COND_ERROR };
  }
  return { values, error: null };
}
export function conductivityStressInput(persisted: Partial<Record<ConductivityStressKey, number | null>> | null | undefined): ConductivityStressInput {
  const out: ConductivityStressInput = { low_threshold_micro_siemens_per_cm: "", low_clear_micro_siemens_per_cm: "", high_clear_micro_siemens_per_cm: "", high_threshold_micro_siemens_per_cm: "" };
  if (!persisted) return out;
  for (const key of CONDUCTIVITY_STRESS_KEYS) {
    const v = persisted[key];
    out[key] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}
// CO2 stress overrides — the only integer editor. Two keys, ordering
// clear_ppm < threshold_ppm, per-side hysteresis >= 100 ppm, bounds 0..10000.
// Rounded half-away-from-zero to integer, matching the accepted backend
// require_co2_stress_threshold validator.
export const CO2_STRESS_BUILTIN_DEFAULTS: Record<string, number> = {
  threshold_ppm: 5000,
  clear_ppm: 4000,
};
export const CO2_STRESS_KEYS = ["threshold_ppm", "clear_ppm"] as const;
export type Co2StressKey = typeof CO2_STRESS_KEYS[number];
export type Co2StressInput = Record<Co2StressKey, string>;
const _CO2_LOW = 0;
const _CO2_HIGH = 10000;
const _CO2_MIN_HYST = 100;
function _roundHalfUpInt(value: number): number {
  return value >= 0 ? Math.floor(value + 0.5) : -Math.floor(-value + 0.5);
}
export function parseCo2StressField(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "invalid";
  const rounded = _roundHalfUpInt(n);
  if (rounded < _CO2_LOW || rounded > _CO2_HIGH) return "invalid";
  return rounded;
}
const _CO2_ERROR = "Effective thresholds must satisfy clear_ppm < threshold_ppm with ≥ 100 ppm hysteresis, both integers within 0…10000 ppm.";
export function validateCo2StressOverrides(input: Co2StressInput): { values: Record<Co2StressKey, number | null>; error: string | null } {
  const parsed: Partial<Record<Co2StressKey, number | null>> = {};
  for (const key of CO2_STRESS_KEYS) {
    const result = parseCo2StressField(input[key]);
    if (result === "invalid") return { values: {} as Record<Co2StressKey, number | null>, error: _CO2_ERROR };
    parsed[key] = result;
  }
  const values = parsed as Record<Co2StressKey, number | null>;
  const eff = (k: Co2StressKey) => values[k] ?? CO2_STRESS_BUILTIN_DEFAULTS[k];
  const clear = eff("clear_ppm"), threshold = eff("threshold_ppm");
  if (!(clear < threshold) || threshold - clear < _CO2_MIN_HYST) {
    return { values, error: _CO2_ERROR };
  }
  return { values, error: null };
}
export function co2StressInput(persisted: Partial<Record<Co2StressKey, number | null>> | null | undefined): Co2StressInput {
  const out: Co2StressInput = { threshold_ppm: "", clear_ppm: "" };
  if (!persisted) return out;
  for (const key of CO2_STRESS_KEYS) {
    const v = persisted[key];
    out[key] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}
// Soil-temperature stress overrides mirror the ambient temperature helpers with
// the soil-specific [-20.0, 60.0] °C physical bound; per-side hysteresis ≥ 0.5 °C, stable band
// ≥ 1.0 °C. Built-in defaults 10.0 / 12.0 / 32.0 / 35.0 °C.
export const SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS: Record<string, number> = {
  cold_threshold_celsius: 10.0,
  cold_clear_celsius: 12.0,
  hot_clear_celsius: 32.0,
  hot_threshold_celsius: 35.0,
};
export const SOIL_TEMPERATURE_STRESS_KEYS = ["cold_threshold_celsius", "cold_clear_celsius", "hot_clear_celsius", "hot_threshold_celsius"] as const;
export type SoilTemperatureStressKey = typeof SOIL_TEMPERATURE_STRESS_KEYS[number];
export type SoilTemperatureStressInput = Record<SoilTemperatureStressKey, string>;
const _SOIL_TEMP_LOW = -20.0;
const _SOIL_TEMP_HIGH = 60.0;
const _SOIL_TEMP_MIN_HYST = 0.5;
const _SOIL_TEMP_MIN_STABLE = 1.0;
export function parseSoilTemperatureStressField(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "invalid";
  const rounded = _roundHalfUpOneDecimal(n);
  if (rounded < _SOIL_TEMP_LOW || rounded > _SOIL_TEMP_HIGH) return "invalid";
  return rounded;
}
const _SOIL_TEMP_ERROR = "Effective thresholds must satisfy cold trigger < cold clear < hot clear < hot trigger, with ≥ 0.5 °C hysteresis and a ≥ 1.0 °C stable band, all within −20.0…60.0 °C.";
export function validateSoilTemperatureStressOverrides(input: SoilTemperatureStressInput): { values: Record<SoilTemperatureStressKey, number | null>; error: string | null } {
  const parsed: Partial<Record<SoilTemperatureStressKey, number | null>> = {};
  for (const key of SOIL_TEMPERATURE_STRESS_KEYS) {
    const result = parseSoilTemperatureStressField(input[key]);
    if (result === "invalid") return { values: {} as Record<SoilTemperatureStressKey, number | null>, error: _SOIL_TEMP_ERROR };
    parsed[key] = result;
  }
  const values = parsed as Record<SoilTemperatureStressKey, number | null>;
  const eff = (k: SoilTemperatureStressKey) => values[k] ?? SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS[k];
  const ct = eff("cold_threshold_celsius"), cc = eff("cold_clear_celsius"), hc = eff("hot_clear_celsius"), ht = eff("hot_threshold_celsius");
  if (!(ct < cc && cc < hc && hc < ht) || cc - ct < _SOIL_TEMP_MIN_HYST || ht - hc < _SOIL_TEMP_MIN_HYST || hc - cc < _SOIL_TEMP_MIN_STABLE) {
    return { values, error: _SOIL_TEMP_ERROR };
  }
  return { values, error: null };
}
export function soilTemperatureStressInput(persisted: Partial<Record<SoilTemperatureStressKey, number | null>> | null | undefined): SoilTemperatureStressInput {
  const out: SoilTemperatureStressInput = { cold_threshold_celsius: "", cold_clear_celsius: "", hot_clear_celsius: "", hot_threshold_celsius: "" };
  if (!persisted) return out;
  for (const key of SOIL_TEMPERATURE_STRESS_KEYS) {
    const v = persisted[key];
    out[key] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}
// Low-battery overrides — integer, two keys, LOW-stress ordering
// threshold_percent < clear_percent (on when <= threshold, clear when >= clear),
// per-side hysteresis >= 1 %, physical bound [0, 100] %. Rounded half-away-from-zero
// to integer, matching the accepted backend require_low_battery_threshold validator.
export const LOW_BATTERY_STRESS_BUILTIN_DEFAULTS: Record<string, number> = {
  threshold_percent: 20,
  clear_percent: 25,
};
export const LOW_BATTERY_STRESS_KEYS = ["threshold_percent", "clear_percent"] as const;
export type LowBatteryStressKey = typeof LOW_BATTERY_STRESS_KEYS[number];
export type LowBatteryStressInput = Record<LowBatteryStressKey, string>;
const _LOW_BATTERY_LOW = 0;
const _LOW_BATTERY_HIGH = 100;
const _LOW_BATTERY_MIN_HYST = 1;
export function parseLowBatteryField(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "invalid";
  const rounded = _roundHalfUpInt(n);
  if (rounded < _LOW_BATTERY_LOW || rounded > _LOW_BATTERY_HIGH) return "invalid";
  return rounded;
}
const _LOW_BATTERY_ERROR = "Effective thresholds must satisfy threshold_percent < clear_percent with ≥ 1 % hysteresis, both integers within 0…100 %.";
export function validateLowBatteryOverrides(input: LowBatteryStressInput): { values: Record<LowBatteryStressKey, number | null>; error: string | null } {
  const parsed: Partial<Record<LowBatteryStressKey, number | null>> = {};
  for (const key of LOW_BATTERY_STRESS_KEYS) {
    const result = parseLowBatteryField(input[key]);
    if (result === "invalid") return { values: {} as Record<LowBatteryStressKey, number | null>, error: _LOW_BATTERY_ERROR };
    parsed[key] = result;
  }
  const values = parsed as Record<LowBatteryStressKey, number | null>;
  const eff = (k: LowBatteryStressKey) => values[k] ?? LOW_BATTERY_STRESS_BUILTIN_DEFAULTS[k];
  const threshold = eff("threshold_percent"), clear = eff("clear_percent");
  if (!(threshold < clear) || clear - threshold < _LOW_BATTERY_MIN_HYST) {
    return { values, error: _LOW_BATTERY_ERROR };
  }
  return { values, error: null };
}
export function lowBatteryInput(persisted: Partial<Record<LowBatteryStressKey, number | null>> | null | undefined): LowBatteryStressInput {
  const out: LowBatteryStressInput = { threshold_percent: "", clear_percent: "" };
  if (!persisted) return out;
  for (const key of LOW_BATTERY_STRESS_KEYS) {
    const v = persisted[key];
    out[key] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}
// Low-light overrides — one decimal, two keys, LOW-light ordering
// target_lux < clear_lux (on when <= target, clear when >= clear), per-side
// hysteresis clear_lux - target_lux >= 10.0 lx, physical bound [0.0, 200000.0] lx.
// Rounded half-away-from-zero to one decimal, matching the accepted backend
// require_low_light_threshold validator.
export const LOW_LIGHT_STRESS_BUILTIN_DEFAULTS: Record<string, number> = {
  target_lux: 500.0,
  clear_lux: 700.0,
};
export const LOW_LIGHT_STRESS_KEYS = ["target_lux", "clear_lux"] as const;
export type LowLightStressKey = typeof LOW_LIGHT_STRESS_KEYS[number];
export type LowLightStressInput = Record<LowLightStressKey, string>;
const _LOW_LIGHT_LOW = 0.0;
const _LOW_LIGHT_HIGH = 200000.0;
const _LOW_LIGHT_MIN_HYST = 10.0;
export function parseLowLightField(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "invalid";
  const rounded = _roundHalfUpOneDecimal(n);
  if (rounded < _LOW_LIGHT_LOW || rounded > _LOW_LIGHT_HIGH) return "invalid";
  return rounded;
}
const _LOW_LIGHT_ERROR = "Effective thresholds must satisfy target_lux < clear_lux with ≥ 10.0 lx hysteresis, both within 0.0…200000.0 lx.";
export function validateLowLightOverrides(input: LowLightStressInput): { values: Record<LowLightStressKey, number | null>; error: string | null } {
  const parsed: Partial<Record<LowLightStressKey, number | null>> = {};
  for (const key of LOW_LIGHT_STRESS_KEYS) {
    const result = parseLowLightField(input[key]);
    if (result === "invalid") return { values: {} as Record<LowLightStressKey, number | null>, error: _LOW_LIGHT_ERROR };
    parsed[key] = result;
  }
  const values = parsed as Record<LowLightStressKey, number | null>;
  const eff = (k: LowLightStressKey) => values[k] ?? LOW_LIGHT_STRESS_BUILTIN_DEFAULTS[k];
  const target = eff("target_lux"), clear = eff("clear_lux");
  if (!(target < clear) || clear - target < _LOW_LIGHT_MIN_HYST) {
    return { values, error: _LOW_LIGHT_ERROR };
  }
  return { values, error: null };
}
export function lowLightInput(persisted: Partial<Record<LowLightStressKey, number | null>> | null | undefined): LowLightStressInput {
  const out: LowLightStressInput = { target_lux: "", clear_lux: "" };
  if (!persisted) return out;
  for (const key of LOW_LIGHT_STRESS_KEYS) {
    const v = persisted[key];
    out[key] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}
export function effectiveThresholds(plant: PlantRecord, role: ProblemBinaryRole, entities: HAEntity[], states: Record<string, HAState>): ThresholdReading[] {
  const uniqueId = `smart_plants:${plant.id}:${role}`;
  const entry = entities.find(e => e.unique_id === uniqueId && e.platform === "smart_plants");
  if (!entry) return [];
  const state = states[entry.entity_id];
  if (!state) return [];
  return THRESHOLD_SPECS[role].map(spec => {
    const raw = state.attributes[spec.key];
    const value = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    return { key: spec.key, label: spec.label, unit: spec.unit, value };
  });
}
export function problemBinaries(plant: PlantRecord, entities: HAEntity[], states: Record<string, HAState>): ProblemBinaryReading[] {
  return PROBLEM_BINARY_ROLES.map(role => {
    const uniqueId = `smart_plants:${plant.id}:${role}`;
    const entry = entities.find(e => e.unique_id === uniqueId && e.platform === "smart_plants");
    if (!entry) return { role, label: PROBLEM_BINARY_LABELS[role], status: "not_configured" as ProblemStatus, reason: null };
    const state = states[entry.entity_id];
    if (!state || state.state === "unavailable" || state.state === "unknown") return { role, label: PROBLEM_BINARY_LABELS[role], status: "unavailable" as ProblemStatus, reason: null };
    const status: ProblemStatus = state.state === "on" ? "on" : "off";
    const rawReason = state.attributes["reason"];
    const reason = typeof rawReason === "string" && rawReason.trim() ? rawReason : null;
    return { role, label: PROBLEM_BINARY_LABELS[role], status, reason };
  });
}
export function emptyMoisture(): MoistureInput {
  return { sources: [], primary_entity_id: null, aggregation: "primary", stale_after_seconds: 21600, threshold_overrides: { min: null, target: null, max: null } };
}
export function moistureRole(plant: PlantRecord): MoistureRoleConfig | null {
  const m = plant.roles?.moisture;
  if (!m || !Array.isArray(m.sources) || m.sources.length > 32 || !m.sources.every(s => s && typeof s.entity_id === "string" && /^sensor\.[a-z0-9_]+$/.test(s.entity_id) && (s.registry_id === null || typeof s.registry_id === "string")) ||
      !["primary", "average", "min", "max"].includes(m.aggregation) || !Number.isInteger(m.stale_after_seconds) || m.stale_after_seconds < 60 || m.stale_after_seconds > 604800 ||
      !(m.primary_entity_id === null || m.sources.some(s => s.entity_id === m.primary_entity_id)) ||
      !keys.every(k => m.threshold_defaults?.[k] && Number.isInteger(m.threshold_defaults[k].value) && m.threshold_defaults[k].value >= 1 && m.threshold_defaults[k].value <= 99 && ["builtin", "provider"].includes(m.threshold_defaults[k].source) &&
        (m.threshold_defaults[k].provider === null || typeof m.threshold_defaults[k].provider === "string") && (m.threshold_defaults[k].provider_ref === null || typeof m.threshold_defaults[k].provider_ref === "string") &&
        (m.threshold_overrides?.[k] === null || Number.isInteger(m.threshold_overrides?.[k])))) return null;
  if (validateMoisture(m, Object.fromEntries(keys.map(k => [k, m.threshold_defaults[k].value])) as typeof builtin)) return null;
  if (keys.some(k => {
    const d = m.threshold_defaults[k];
    return d.source === "builtin" ? d.provider !== null || d.provider_ref !== null : !d.provider || !d.provider_ref;
  })) return null;
  return m;
}
export function moistureInput(m: MoistureRoleConfig): MoistureInput {
  return structuredClone({ sources: m.sources, primary_entity_id: m.primary_entity_id, aggregation: m.aggregation, stale_after_seconds: m.stale_after_seconds, threshold_overrides: m.threshold_overrides });
}
export function validateMoisture(m: MoistureInput, defaults: typeof builtin): string | null {
  if (m.sources.length > 32 || new Set(m.sources.map(s => s.entity_id)).size !== m.sources.length || new Set(m.sources.map(s => s.registry_id ?? s.entity_id)).size !== m.sources.length || m.sources.some(s => !/^sensor\.[a-z0-9_]+$/.test(s.entity_id))) return "Choose at most 32 unique sensor entities.";
  if (!["primary", "average", "min", "max"].includes(m.aggregation)) return "Choose a supported aggregation.";
  if (m.primary_entity_id !== null && !m.sources.some(s => s.entity_id === m.primary_entity_id)) return "Primary must be one of the assigned sensors or None.";
  if (!Number.isInteger(m.stale_after_seconds) || m.stale_after_seconds < 60 || m.stale_after_seconds > 604800) return "Staleness must be an integer from 60 to 604800 seconds.";
  const v = keys.map(k => m.threshold_overrides[k] ?? defaults[k]);
  if (v.some(n => !Number.isInteger(n) || n < 1 || n > 99) || !(v[0] < v[1] && v[1] < v[2] && v[2] - v[0] >= 4)) return "Effective moisture thresholds must be integers: 1 ≤ min < target < max ≤ 99, with a span of at least 4%.";
  return null;
}
export function manualSpecies(common: string, latin: string): PlantSpecies | null {
  if (!common.trim() && !latin.trim()) return null;
  return { provider: "manual", snapshot: { provider: "manual", provider_id: null, provider_ref: null, fetched_at: new Date().toISOString(), locale: "und", source_status: "manual", attribution: "User supplied", common_name: common.trim() || null, latin_name: latin.trim() || null, category: null, confidence: null, care_text: {}, field_sources: { ...(common.trim() ? { common_name: "User supplied" } : {}), ...(latin.trim() ? { latin_name: "User supplied" } : {}) }, threshold_defaults: {} } };
}
export function plantDevice(plant: PlantRecord, devices: HADevice[]): HADevice | undefined {
  return devices.find(d => d.identifiers.some(([domain, id]) => domain === "smart_plants" && id === plant.id));
}
// A removed UUID must never bind to a replacement that reused the old entity ID.
export function resolveSource(source: SensorSource, entities: HAEntity[]): HAEntity | undefined {
  return source.registry_id ? entities.find(e => e.id === source.registry_id) : entities.find(e => e.entity_id === source.entity_id);
}
export function canonicalMoisture(m: MoistureInput, entities: HAEntity[]): MoistureInput {
  const primary = m.sources.find(s => s.entity_id === m.primary_entity_id);
  return { ...structuredClone(m), sources: m.sources.map(s => {
    const entry = resolveSource(s, entities);
    return entry ? { entity_id: entry.entity_id, registry_id: entry.id } : { ...s };
  }), primary_entity_id: primary ? resolveSource(primary, entities)?.entity_id ?? primary.entity_id : null };
}
export function sourceWarning(source: SensorSource, entities: HAEntity[], states: Record<string, HAState>): string {
  const registered = resolveSource(source, entities);
  if (source.registry_id && !registered) return "Missing registered source — replace it explicitly or review Repairs.";
  const state = states[registered?.entity_id ?? source.entity_id];
  const warnings = [];
  if (!registered) warnings.push("Unregistered: renames cannot be followed reliably");
  if (!state || ["unknown", "unavailable"].includes(state.state)) warnings.push("Currently unavailable");
  if (state && (state.attributes.unit_of_measurement !== "%" || state.attributes.device_class !== "moisture")) warnings.push("Unexpected metadata: evaluation requires numeric 0–100 %");
  if (state && !["unknown", "unavailable"].includes(state.state) && (!state.state.trim() || !Number.isFinite(Number(state.state)) || Number(state.state) < 0 || Number(state.state) > 100)) warnings.push("Invalid reading: evaluation requires a numeric percentage from 0 to 100");
  return warnings.join(". ");
}
// The seven Phase 7 roles that accept sources via the generic Sensors section.
// deviceClass/acceptedUnits drive the picker filter and metadata warnings and
// must match each role's evaluator so the UI warns before the backend rejects.
export interface RoleSourceSpec { role: string; label: string; deviceClass: string; acceptedUnits: string[] }
export const ROLE_SOURCE_SPECS: readonly RoleSourceSpec[] = [
  { role: "temperature", label: "Air temperature", deviceClass: "temperature", acceptedUnits: ["°C", "°F", "K"] },
  { role: "humidity", label: "Air humidity", deviceClass: "humidity", acceptedUnits: ["%"] },
  { role: "illuminance", label: "Illuminance", deviceClass: "illuminance", acceptedUnits: ["lx"] },
  { role: "battery", label: "Battery", deviceClass: "battery", acceptedUnits: ["%"] },
  // Conductivity source sensors report the micro sign (U+00B5), Greek mu
  // (U+03BC, the HA constant), or ASCII "uS/cm"; accept all three.
  { role: "conductivity", label: "Conductivity", deviceClass: "conductivity", acceptedUnits: ["µS/cm", "μS/cm", "uS/cm"] },
  { role: "soil_temperature", label: "Soil temperature", deviceClass: "temperature", acceptedUnits: ["°C", "°F", "K"] },
  { role: "co2", label: "CO₂", deviceClass: "carbon_dioxide", acceptedUnits: ["ppm"] },
] as const;
export function roleSourceSpec(role: string): RoleSourceSpec | undefined { return ROLE_SOURCE_SPECS.find(s => s.role === role); }
export function emptyRoleSources(): RoleSourceInput {
  return { sources: [], primary_entity_id: null, aggregation: "primary", stale_after_seconds: 21600 };
}
// Runtime-validate a role's source config from the plant view; never guess a
// missing or malformed shape, mirroring moistureRole's fail-safe behaviour.
export function roleSourceConfig(plant: PlantRecord, role: string): RoleSourceConfig | null {
  const c = plant.roles?.[role] as Partial<RoleSourceConfig> | undefined;
  if (!c || !Array.isArray(c.sources) || c.sources.length > 32 ||
      !c.sources.every(s => s && typeof s.entity_id === "string" && /^sensor\.[a-z0-9_]+$/.test(s.entity_id) && (s.registry_id === null || typeof s.registry_id === "string")) ||
      typeof c.aggregation !== "string" || !["primary", "average", "min", "max"].includes(c.aggregation) ||
      !Number.isInteger(c.stale_after_seconds) || (c.stale_after_seconds as number) < 60 || (c.stale_after_seconds as number) > 604800 ||
      !(c.primary_entity_id === null || (typeof c.primary_entity_id === "string" && c.sources.some(s => s.entity_id === c.primary_entity_id)))) return null;
  return { sources: c.sources, primary_entity_id: c.primary_entity_id ?? null, aggregation: c.aggregation as RoleSourceConfig["aggregation"], stale_after_seconds: c.stale_after_seconds as number };
}
export function roleSourceInput(c: RoleSourceConfig): RoleSourceInput {
  return structuredClone({ sources: c.sources, primary_entity_id: c.primary_entity_id, aggregation: c.aggregation, stale_after_seconds: c.stale_after_seconds });
}
export function validateRoleSources(c: RoleSourceInput): string | null {
  if (c.sources.length > 32 || new Set(c.sources.map(s => s.entity_id)).size !== c.sources.length || new Set(c.sources.map(s => s.registry_id ?? s.entity_id)).size !== c.sources.length || c.sources.some(s => !/^sensor\.[a-z0-9_]+$/.test(s.entity_id))) return "Choose at most 32 unique sensor entities.";
  if (!["primary", "average", "min", "max"].includes(c.aggregation)) return "Choose a supported aggregation.";
  if (c.primary_entity_id !== null && !c.sources.some(s => s.entity_id === c.primary_entity_id)) return "Primary must be one of the assigned sensors or None.";
  if (!Number.isInteger(c.stale_after_seconds) || c.stale_after_seconds < 60 || c.stale_after_seconds > 604800) return "Staleness must be an integer from 60 to 604800 seconds.";
  return null;
}
export function canonicalRoleSources(c: RoleSourceInput, entities: HAEntity[]): RoleSourceInput {
  const primary = c.sources.find(s => s.entity_id === c.primary_entity_id);
  return { ...structuredClone(c), sources: c.sources.map(s => {
    const entry = resolveSource(s, entities);
    return entry ? { entity_id: entry.entity_id, registry_id: entry.id } : { ...s };
  }), primary_entity_id: primary ? resolveSource(primary, entities)?.entity_id ?? primary.entity_id : null };
}
// Generic metadata warning parameterised by the role's expected device_class and
// accepted units (the moisture equivalent is sourceWarning).
export function roleSourceWarning(source: SensorSource, entities: HAEntity[], states: Record<string, HAState>, spec: RoleSourceSpec): string {
  const registered = resolveSource(source, entities);
  if (source.registry_id && !registered) return "Missing registered source — replace it explicitly or review Repairs.";
  const state = states[registered?.entity_id ?? source.entity_id];
  const warnings = [];
  if (!registered) warnings.push("Unregistered: renames cannot be followed reliably");
  if (!state || ["unknown", "unavailable"].includes(state.state)) warnings.push("Currently unavailable");
  if (state) {
    const unit = state.attributes.unit_of_measurement;
    const cls = state.attributes.device_class;
    if (typeof unit !== "string" || !spec.acceptedUnits.includes(unit) || cls !== spec.deviceClass) warnings.push(`Unexpected metadata: ${spec.label} evaluation requires device class ${spec.deviceClass} and unit ${spec.acceptedUnits.join(" / ")}`);
  }
  return warnings.join(". ");
}
export function tags(raw: string): string[] { return [...new Set(raw.split(",").map(s => s.trim()).filter(Boolean))]; }
export function validateTaxonomy(category: string, values: string[]): string | null {
  return category.length > 60 || values.length > 32 || values.some(t => t.length > 60) ? "Use a category up to 60 characters and at most 32 unique tags up to 60 characters each." : null;
}
