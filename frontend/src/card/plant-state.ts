// What the dashboard card knows about one plant, built only from the data every
// signed-in user's frontend already has: entity states, the entity and device
// registry display entries, and the areas. The Smart Plants WebSocket commands
// are admin-only, so the card cannot ask the backend for the overview.
//
// The status follows the same priority as the backend's plant status
// (custom_components/smart_plants/plant_status.py), read back from the binary
// sensors that report the same evaluations. A shared fixture
// (tests/fixtures/plant_status_cases.json) runs through both so they agree.
import type { PlantOverview, PlantProblem, RoleReading } from "../overview-model.js";
import { READING_ROLES } from "../status.js";
import type { PlantStatus, ReadingRole, ReadingState, TargetRange } from "../status.js";

export const DOMAIN = "smart_plants";

export interface CardState { entity_id: string; state: string; attributes: Record<string, unknown>; last_changed?: string; last_updated?: string }
export interface CardEntityEntry { entity_id: string; device_id?: string | null; platform?: string; translation_key?: string | null }
export interface CardDeviceEntry { id: string; name?: string | null; name_by_user?: string | null; area_id?: string | null; model?: string | null; identifiers?: readonly (readonly [string, string])[] }
export interface CardArea { area_id: string; name: string }
export interface CardHassData {
  states: Record<string, CardState | undefined>;
  entities?: Record<string, CardEntityEntry | undefined>;
  devices?: Record<string, CardDeviceEntry | undefined>;
  areas?: Record<string, CardArea | undefined>;
}

// Non-moisture roles in status priority order, with the binary sensor that
// reports each role's alert and how its `reason` maps to a problem kind.
export const STRESS_SIGNALS: readonly { role: ReadingRole; sensor: string; kinds: Readonly<Record<string, string>> }[] = [
  { role: "temperature", sensor: "temperature_stress", kinds: { cold_stress: "too_cold", hot_stress: "too_hot" } },
  { role: "humidity", sensor: "humidity_stress", kinds: { dry_stress: "too_dry", damp_stress: "too_humid" } },
  { role: "illuminance", sensor: "low_light", kinds: { low_light: "low_light" } },
  { role: "conductivity", sensor: "conductivity_stress", kinds: { low_conductivity_stress: "low_conductivity", high_conductivity_stress: "high_conductivity" } },
  { role: "soil_temperature", sensor: "soil_temperature_stress", kinds: { cold_stress: "too_cold", hot_stress: "too_hot" } },
  { role: "co2", sensor: "co2_stress", kinds: { co2_stress: "high_co2" } },
  { role: "battery", sensor: "low_battery", kinds: { low_battery: "battery_low" } },
];
// A stress reason without a direction still counts, as in the backend.
const GENERIC_STRESS_KIND = "stress";
const LOW_KINDS = new Set(["needs_water", "too_cold", "too_dry", "low_light", "low_conductivity", "battery_low"]);

// The threshold and clear-value attributes each alert sensor reports, as
// (min, max) pairs; the backend overview builds the same ranges.
const RANGE_ATTRIBUTES: Readonly<Partial<Record<ReadingRole, { range: [string | null, string | null]; clear: [string | null, string | null] }>>> = {
  temperature: { range: ["cold_threshold_celsius", "hot_threshold_celsius"], clear: ["cold_clear_celsius", "hot_clear_celsius"] },
  humidity: { range: ["dry_threshold_percent", "damp_threshold_percent"], clear: ["dry_clear_percent", "damp_clear_percent"] },
  illuminance: { range: ["target_lux", null], clear: ["clear_lux", null] },
  conductivity: { range: ["low_threshold_micro_siemens_per_cm", "high_threshold_micro_siemens_per_cm"], clear: ["low_clear_micro_siemens_per_cm", "high_clear_micro_siemens_per_cm"] },
  soil_temperature: { range: ["cold_threshold_celsius", "hot_threshold_celsius"], clear: ["cold_clear_celsius", "hot_clear_celsius"] },
  co2: { range: [null, "threshold_ppm"], clear: [null, "clear_ppm"] },
  battery: { range: ["threshold_percent", null], clear: ["clear_percent", null] },
};
// Needs water and too wet turn off this far inside the moisture bounds.
export const MOISTURE_HYSTERESIS = 2;

const UNAVAILABLE = new Set(["unavailable", "unknown"]);
const ALERT_STATES = new Set(["on", "off"]);
const num = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
const numState = (s: CardState | undefined): number | null => {
  if (!s || UNAVAILABLE.has(s.state)) return null;
  const v = Number(s.state);
  return s.state.trim() !== "" && Number.isFinite(v) ? v : null;
};

// The plant's own entities keyed by "<domain>.<translation key>", for example
// "sensor.moisture" or "binary_sensor.needs_water".
export function plantEntities(hass: CardHassData, deviceId: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const entry of Object.values(hass.entities ?? {})) {
    if (!entry || entry.device_id !== deviceId || entry.platform !== DOMAIN || !entry.translation_key) continue;
    const domain = entry.entity_id.split(".")[0];
    found.set(`${domain}.${entry.translation_key}`, entry.entity_id);
  }
  return found;
}

export function plantIdOf(device: CardDeviceEntry | undefined): string | null {
  return device?.identifiers?.find(([domain]) => domain === DOMAIN)?.[1] ?? null;
}

// Plant devices in name order, for the card editor and the stub config.
export function plantDevices(hass: CardHassData): CardDeviceEntry[] {
  return Object.values(hass.devices ?? {})
    .filter((d): d is CardDeviceEntry => !!d && plantIdOf(d) !== null)
    .sort((a, b) => deviceName(a).localeCompare(deviceName(b), undefined, { sensitivity: "base" }));
}

export const deviceName = (device: CardDeviceEntry): string => device.name_by_user || device.name || "";

// The entity states the status depends on, in the shape the shared fixture uses.
export interface StatusInput {
  // Every entity of the plant reads unavailable: the plant is paused.
  allUnavailable: boolean;
  moisture: string | null;
  needs_water: string | null;
  too_wet: string | null;
  sensor_stale: string | null;
  // The `sources` attribute of the stale sensor: how many moisture sensors
  // are assigned. null while the stale sensor is unavailable or doesn't say.
  sources: number | null;
  stress: Partial<Record<ReadingRole, { state: string; reason: string | null }>>;
}

export interface StatusResult { status: PlantStatus; problems: PlantProblem[] }

// The plant status and its issues, most urgent first, as plant_status.py
// derives them. The entities don't say why assigned moisture sensors give no
// value; the card reports them as not reporting, also when several sensors
// wait for a main sensor to be chosen (the panel names that case).
export function deriveStatus(input: StatusInput): StatusResult {
  if (input.allUnavailable) return { status: "paused", problems: [] };
  const problems: PlantProblem[] = [];
  const valueProblem = input.needs_water === "on" ? "needs_water" : input.too_wet === "on" ? "too_wet" : null;
  if (valueProblem) problems.push({ role: "moisture", kind: valueProblem });
  for (const signal of STRESS_SIGNALS) {
    const stress = input.stress[signal.role];
    if (stress?.state === "on") problems.push({ role: signal.role, kind: signal.kinds[stress.reason ?? ""] ?? GENERIC_STRESS_KIND });
  }
  const moistureAvailable = input.moisture !== null && !UNAVAILABLE.has(input.moisture);
  const stale = input.sensor_stale === "on";
  // Without the count (an older backend) a reading or a stale sensor still shows there are sources.
  const hasSources = input.sources !== null ? input.sources > 0 : moistureAvailable || stale;
  // A reading only counts as healthy when Needs water and Too wet both say
  // "off". A missing, disabled or unknown alert sensor leaves the verdict open.
  const verdictKnown = valueProblem !== null || (ALERT_STATES.has(input.needs_water ?? "") && ALERT_STATES.has(input.too_wet ?? ""));
  const readingProblem = !hasSources ? null : stale ? "stale" : moistureAvailable && verdictKnown ? null : "unavailable";
  if (readingProblem) problems.push({ role: "moisture", kind: readingProblem });
  if (!hasSources) problems.push({ role: "moisture", kind: "no_sensors" });

  let status: PlantStatus;
  if (valueProblem) status = valueProblem;
  else if (problems.some(p => p.role !== "moisture")) status = "problem";
  else if (readingProblem) status = "stale";
  else if (!hasSources) status = "no_sensors";
  else status = "healthy";
  return { status, problems };
}

export function statusInput(hass: CardHassData, entities: Map<string, string>): StatusInput {
  const state = (key: string) => { const id = entities.get(key); return id ? hass.states[id] : undefined; };
  const stress: StatusInput["stress"] = {};
  for (const signal of STRESS_SIGNALS) {
    const s = state(`binary_sensor.${signal.sensor}`);
    if (s) stress[signal.role] = { state: s.state, reason: typeof s.attributes.reason === "string" ? s.attributes.reason : null };
  }
  const ids = [...entities.values()];
  return {
    allUnavailable: ids.length > 0 && ids.every(id => { const s = hass.states[id]; return !s || s.state === "unavailable"; }),
    moisture: state("sensor.moisture")?.state ?? null,
    needs_water: state("binary_sensor.needs_water")?.state ?? null,
    too_wet: state("binary_sensor.too_wet")?.state ?? null,
    sensor_stale: state("binary_sensor.sensor_stale")?.state ?? null,
    sources: num(state("binary_sensor.sensor_stale")?.attributes.sources),
    stress,
  };
}

// Temperature thresholds are stored in °C, but Home Assistant shows
// temperature readings in the unit system's unit, so bounds follow the reading.
const CELSIUS_ROLES = new Set<ReadingRole>(["temperature", "soil_temperature"]);
const fromCelsius = (value: number, unit: string): number => {
  if (unit === "°F") return Math.round((value * 9 / 5 + 32) * 10) / 10;
  if (unit === "K") return Math.round((value + 273.15) * 100) / 100;
  return value;
};

function rangeOf(role: ReadingRole, alert: CardState | undefined, unit: string): { range: TargetRange; clear: { min: number | null; max: number | null } } {
  const spec = RANGE_ATTRIBUTES[role];
  const attr = (key: string | null) => {
    const value = key && alert && !UNAVAILABLE.has(alert.state) ? num(alert.attributes[key]) : null;
    return value !== null && CELSIUS_ROLES.has(role) ? fromCelsius(value, unit) : value;
  };
  return {
    range: { min: attr(spec?.range[0] ?? null), target: null, max: attr(spec?.range[1] ?? null) },
    clear: { min: attr(spec?.clear[0] ?? null), max: attr(spec?.clear[1] ?? null) },
  };
}

function readingState(value: number | null, problem: PlantProblem | undefined, stale: boolean): ReadingState {
  if (stale) return "stale";
  if (value === null) return "unavailable";
  if (!problem) return "ok";
  return LOW_KINDS.has(problem.kind) ? "low" : "high";
}

export interface PlantView {
  kind: "plant";
  deviceId: string;
  plantId: string;
  name: string;
  area: string | null;
  // The species name the device model carries; "Plant" means none.
  species: string | null;
  overview: PlantOverview;
  careDue: boolean;
  // undefined when the needs water sensor does not report it right now.
  lastWatered: string | null | undefined;
  // Entity for Home Assistant's more-info dialog: the moisture sensor, or the
  // first reading sensor when there is no moisture source.
  moreInfoEntity: string | null;
}
export type CardPlant = PlantView | { kind: "missing" };

// Everything the card renders for one plant, as a PlantOverview so it can
// reuse the panel's chip, reason and watering texts.
export function plantView(hass: CardHassData, deviceId: string): CardPlant {
  const device = hass.devices?.[deviceId];
  const plantId = plantIdOf(device);
  if (!device || !plantId) return { kind: "missing" };
  const entities = plantEntities(hass, deviceId);
  const state = (key: string) => { const id = entities.get(key); return id ? hass.states[id] : undefined; };
  const input = statusInput(hass, entities);
  const { status, problems } = deriveStatus(input);
  const paused = status === "paused";

  const roles: Partial<Record<ReadingRole, RoleReading>> = {};
  const moistureState = state("sensor.moisture");
  const moistureValue = numState(moistureState);
  const stale = input.sensor_stale === "on";
  const hasMoistureSources = problems.every(p => p.kind !== "no_sensors");
  if (!paused && (moistureValue !== null || hasMoistureSources)) {
    const attrs = moistureState?.attributes ?? {};
    const min = num(attrs.min); const max = num(attrs.max);
    roles.moisture = {
      value: moistureValue, unit: "%", state: readingState(moistureValue, problems.find(p => p.role === "moisture" && (p.kind === "needs_water" || p.kind === "too_wet")), stale),
      range: { min, target: num(attrs.target), max },
      clear: { min: min === null ? null : min + MOISTURE_HYSTERESIS, max: max === null ? null : max - MOISTURE_HYSTERESIS },
      last_reported: null, sources: [],
    };
  }
  for (const role of READING_ROLES) {
    if (role === "moisture" || paused) continue;
    const reading = state(`sensor.${role}`);
    const value = numState(reading);
    if (value === null) continue;
    const signal = STRESS_SIGNALS.find(s => s.role === role);
    const unit = typeof reading?.attributes.unit_of_measurement === "string" ? reading.attributes.unit_of_measurement : "";
    const { range, clear } = rangeOf(role, signal ? state(`binary_sensor.${signal.sensor}`) : undefined, unit);
    roles[role] = { value, unit, state: readingState(value, problems.find(p => p.role === role), false), range, clear, last_reported: null, sources: [] };
  }

  const needsWater = state("binary_sensor.needs_water");
  const lastWatered = needsWater && "last_watered" in needsWater.attributes
    ? (typeof needsWater.attributes.last_watered === "string" ? needsWater.attributes.last_watered : null) : undefined;
  // Every plant binary sensor carries the snooze; the stale sensor stays available longest.
  const snoozeSource = [state("binary_sensor.sensor_stale"), needsWater, ...STRESS_SIGNALS.map(s => state(`binary_sensor.${s.sensor}`))]
    .find(s => s && typeof s.attributes.snoozed_until === "string");
  const firstReading = READING_ROLES.filter(r => r !== "moisture").map(r => entities.get(`sensor.${r}`)).find(id => id !== undefined && numState(hass.states[id]) !== null);
  const moistureId = entities.get("sensor.moisture") ?? null;
  const model = device.model?.trim();
  const overview: PlantOverview = {
    plant_id: plantId, revision: 0, lifecycle_state: paused ? "disabled" : "active", status, problems, roles,
    last_watered_at: lastWatered ?? null, image: null, care: [], rest_period: null, resting: false,
    snoozed_until: (snoozeSource?.attributes.snoozed_until as string | undefined) ?? null,
  };
  return {
    kind: "plant", deviceId, plantId, name: deviceName(device), area: (device.area_id && hass.areas?.[device.area_id]?.name) || null,
    species: model && model !== "Plant" ? model : null,
    overview, careDue: !paused && state("binary_sensor.care_due")?.state === "on", lastWatered,
    moreInfoEntity: moistureValue !== null || !firstReading ? moistureId : firstReading,
  };
}
