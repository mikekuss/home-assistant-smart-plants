// What the dashboard card knows about one plant, built only from the data every
// signed-in user's frontend already has: entity states, the entity and device
// registry display entries, and the areas. The Smart Plants WebSocket commands
// are admin-only, so the card cannot ask the backend for the overview.
//
// The status follows the same priority as the backend's plant status
// (custom_components/smart_plants/plant_status.py), read back from the binary
// sensors that report the same evaluations. A shared fixture
// (tests/fixtures/plant_status_cases.json) runs through both so they agree.
import type { PlantOverview, PlantProblem, RoleReading, WinterView } from "../overview-model.js";
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
const numeric = (state: string): number | null => {
  if (UNAVAILABLE.has(state)) return null;
  const v = Number(state);
  return state.trim() !== "" && Number.isFinite(v) ? v : null;
};
const numState = (s: CardState | undefined): number | null => s ? numeric(s.state) : null;

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
  // The `input_problems` attribute of the stale sensor: the other assigned
  // sensors that give no usable value, by role, as the backend counts them.
  input_problems: Partial<Record<ReadingRole, string>>;
  // The `stress_problems` attribute of the stale sensor: the other readings
  // whose problem sensor is on, by role and kind, as the backend counts them,
  // also while that problem sensor is disabled. null while the stale sensor
  // is missing, unavailable or doesn't say.
  stress_problems: Partial<Record<ReadingRole, string>> | null;
  // The states of the plant's other reading sensors, such as sensor.temperature.
  readings: Partial<Record<ReadingRole, string>>;
}

export interface StatusResult { status: PlantStatus; problems: PlantProblem[] }

// The plant status and its issues, most urgent first, as plant_status.py
// derives them. The entities don't say why moisture sensors give no value;
// the card reports them as not reporting, also when they went stale or when
// several of them wait for a main sensor to be chosen (the panel names those
// cases). Other sensors waiting for a main sensor also show as not reporting.
//
// The status is only Healthy when the verdict of every reading is known. The
// stale sensor reports the other readings' problems, so a disabled problem
// sensor doesn't matter while it reports. Without it the card reads each
// problem sensor, and a reading with a value whose problem sensor is
// disabled, missing or unavailable leaves the status open: the card reports
// that reading as not reporting rather than guess its verdict.
export function deriveStatus(input: StatusInput): StatusResult {
  if (input.allUnavailable) return { status: "paused", problems: [] };
  const problems: PlantProblem[] = [];
  const valueProblem = input.needs_water === "on" ? "needs_water" : input.too_wet === "on" ? "too_wet" : null;
  if (valueProblem) problems.push({ role: "moisture", kind: valueProblem });
  let stressed = false;
  const openVerdicts = new Set<ReadingRole>();
  for (const signal of STRESS_SIGNALS) {
    const kind = stressVerdict(input, signal);
    if (kind) {
      problems.push({ role: signal.role, kind });
      stressed = true;
    } else if (kind === undefined && numeric(input.readings[signal.role] ?? "") !== null) {
      openVerdicts.add(signal.role);
    }
  }
  const moistureAvailable = input.moisture !== null && !UNAVAILABLE.has(input.moisture);
  const stale = input.sensor_stale === "on";
  const hasSources = moistureHasSources(input);
  // A reading only counts as healthy when Needs water and Too wet both say
  // "off". A missing, disabled or unknown alert sensor leaves the verdict open.
  const verdictKnown = valueProblem !== null || (ALERT_STATES.has(input.needs_water ?? "") && ALERT_STATES.has(input.too_wet ?? ""));
  const readingProblem = !hasSources ? null : stale ? "stale" : moistureAvailable && verdictKnown ? null : "unavailable";
  if (readingProblem) problems.push({ role: "moisture", kind: readingProblem });
  const inputProblems = inputProblemsOf(input, openVerdicts);
  problems.push(...inputProblems);
  // Soil moisture is optional: a plant with other sensors is judged on those.
  // A battery level says nothing about the plant, so a battery sensor alone
  // doesn't count, as in the backend.
  const noSensors = !hasSources && !STRESS_SIGNALS.some(({ role }) => role !== "battery" && hasOtherSources(input, role));
  if (noSensors) problems.push({ role: "moisture", kind: "no_sensors" });

  let status: PlantStatus;
  if (valueProblem) status = valueProblem;
  else if (stressed) status = "problem";
  else if (readingProblem || inputProblems.length) status = "stale";
  else if (noSensors) status = "no_sensors";
  else status = "healthy";
  return { status, problems };
}

// Whether the plant has soil moisture sensors. Without the count (an older
// backend) a reading or a stale sensor still shows there are some.
export function moistureHasSources(input: StatusInput): boolean {
  if (input.sources !== null) return input.sources > 0;
  return (input.moisture !== null && !UNAVAILABLE.has(input.moisture)) || input.sensor_stale === "on";
}

// A reading's problem kind, null when it has none, undefined when no entity
// the card can read says.
function stressVerdict(input: StatusInput, signal: (typeof STRESS_SIGNALS)[number]): string | null | undefined {
  if (input.stress_problems) return input.stress_problems[signal.role] ?? null;
  const stress = input.stress[signal.role];
  if (stress?.state === "on") return signal.kinds[stress.reason ?? ""] ?? GENERIC_STRESS_KIND;
  return stress?.state === "off" ? null : undefined;
}

// Whether the entities show sensors assigned to another reading: a value, a
// problem sensor that is on or off (it needs a value), or a problem the
// backend reports for it.
function hasOtherSources(input: StatusInput, role: ReadingRole): boolean {
  return numeric(input.readings[role] ?? "") !== null || ALERT_STATES.has(input.stress[role]?.state ?? "")
    || input.input_problems[role] !== undefined || input.stress_problems?.[role] !== undefined;
}

// Other assigned sensors that give no usable value, and readings whose verdict
// is open. The backend decides which sensors count, so a removed sensor or a
// light sensor that is quiet at night or early in the morning is no problem
// here either.
function inputProblemsOf(input: StatusInput, openVerdicts: ReadonlySet<ReadingRole>): PlantProblem[] {
  const found: PlantProblem[] = [];
  for (const { role } of STRESS_SIGNALS) {
    const kind = input.input_problems[role];
    if (kind !== undefined) found.push({ role, kind: kind === "stale" ? "stale" : "unavailable" });
    else if (openVerdicts.has(role)) found.push({ role, kind: "unavailable" });
  }
  return found;
}

export function statusInput(hass: CardHassData, entities: Map<string, string>): StatusInput {
  const state = (key: string) => { const id = entities.get(key); return id ? hass.states[id] : undefined; };
  const stress: StatusInput["stress"] = {};
  for (const signal of STRESS_SIGNALS) {
    const s = state(`binary_sensor.${signal.sensor}`);
    if (s) stress[signal.role] = { state: s.state, reason: typeof s.attributes.reason === "string" ? s.attributes.reason : null };
  }
  const staleSensor = state("binary_sensor.sensor_stale");
  const staleAttrs = staleSensor && !UNAVAILABLE.has(staleSensor.state) ? staleSensor.attributes : {};
  const readings: StatusInput["readings"] = {};
  for (const { role } of STRESS_SIGNALS) {
    const s = state(`sensor.${role}`);
    if (s) readings[role] = s.state;
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
    input_problems: roleKinds(staleAttrs.input_problems) ?? {},
    stress_problems: roleKinds(staleAttrs.stress_problems),
    readings,
  };
}

// A {role: kind} attribute of the stale sensor, or null when it is no such map.
function roleKinds(reported: unknown): Partial<Record<ReadingRole, string>> | null {
  if (typeof reported !== "object" || reported === null || Array.isArray(reported)) return null;
  const kinds: Partial<Record<ReadingRole, string>> = {};
  for (const { role } of STRESS_SIGNALS) {
    const kind = (reported as Record<string, unknown>)[role];
    if (typeof kind === "string") kinds[role] = kind;
  }
  return kinds;
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
  // The plant photo's id from the stale sensor, null without a photo, and
  // undefined while that sensor doesn't say, such as for a paused plant.
  photoId: string | null | undefined;
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
  const hasMoistureSources = moistureHasSources(input);
  if (!paused && (moistureValue !== null || hasMoistureSources)) {
    const attrs = moistureState?.attributes ?? {};
    const min = num(attrs.min_threshold_percent); const max = num(attrs.max_threshold_percent);
    roles.moisture = {
      value: moistureValue, unit: "%", state: readingState(moistureValue, problems.find(p => p.role === "moisture" && (p.kind === "needs_water" || p.kind === "too_wet")), stale),
      range: { min, target: num(attrs.target_threshold_percent), max },
      clear: { min: min === null ? null : min + MOISTURE_HYSTERESIS, max: max === null ? null : max - MOISTURE_HYSTERESIS },
      last_reported: null, sources: [],
    };
  }
  for (const role of READING_ROLES) {
    if (role === "moisture" || paused) continue;
    const reading = state(`sensor.${role}`);
    const value = numState(reading);
    const problem = problems.find(p => p.role === role);
    const inputProblem = problem?.kind === "stale" || problem?.kind === "unavailable";
    // A reading without a value only shows when it is one of the plant's issues.
    if (value === null && !inputProblem) continue;
    const signal = STRESS_SIGNALS.find(s => s.role === role);
    const unit = typeof reading?.attributes.unit_of_measurement === "string" ? reading.attributes.unit_of_measurement : "";
    const { range, clear } = rangeOf(role, signal ? state(`binary_sensor.${signal.sensor}`) : undefined, unit);
    roles[role] = {
      value, unit, state: readingState(value, inputProblem ? undefined : problem, problem?.kind === "stale"),
      range, clear, last_reported: null, sources: [],
    };
  }

  const needsWater = state("binary_sensor.needs_water");
  const lastWatered = needsWater && "last_watered" in needsWater.attributes
    ? (typeof needsWater.attributes.last_watered === "string" ? needsWater.attributes.last_watered : null) : undefined;
  // Every plant binary sensor carries the snooze; the stale sensor stays available longest.
  const snoozeSource = [state("binary_sensor.sensor_stale"), needsWater, ...STRESS_SIGNALS.map(s => state(`binary_sensor.${s.sensor}`))]
    .find(s => s && typeof s.attributes.snoozed_until === "string");
  // A plant with winter values carries them on every binary sensor, like the snooze.
  const winterSource = [state("binary_sensor.sensor_stale"), needsWater, ...STRESS_SIGNALS.map(s => state(`binary_sensor.${s.sensor}`))]
    .find(s => s && typeof s.attributes.winter_values === "boolean");
  const winterReason = winterSource?.attributes.winter_reason;
  const winter: WinterView | null = winterSource ? {
    active: winterSource.attributes.winter_values === true,
    reason: winterReason === "rest_period" || winterReason === "dormant_storage" ? winterReason : null,
    until: null, roles: [],
  } : null;
  const firstReading = READING_ROLES.filter(r => r !== "moisture").map(r => entities.get(`sensor.${r}`)).find(id => id !== undefined && numState(hass.states[id]) !== null);
  const moistureId = entities.get("sensor.moisture") ?? null;
  const staleAttrs = state("binary_sensor.sensor_stale")?.attributes;
  const photoId = staleAttrs && "photo_id" in staleAttrs
    ? (typeof staleAttrs.photo_id === "string" && staleAttrs.photo_id ? staleAttrs.photo_id : null) : undefined;
  const model = device.model?.trim();
  const overview: PlantOverview = {
    plant_id: plantId, revision: 0, lifecycle_state: paused ? "disabled" : "active", status, problems, roles,
    last_watered_at: lastWatered ?? null, image: null, care: [], rest_period: null, resting: false,
    snoozed_until: (snoozeSource?.attributes.snoozed_until as string | undefined) ?? null,
    winter,
  };
  return {
    kind: "plant", deviceId, plantId, name: deviceName(device), area: (device.area_id && hass.areas?.[device.area_id]?.name) || null,
    species: model && model !== "Plant" ? model : null,
    overview, careDue: !paused && state("binary_sensor.care_due")?.state === "on", lastWatered,
    moreInfoEntity: moistureValue !== null || !firstReading ? moistureId : firstReading,
    photoId,
  };
}
