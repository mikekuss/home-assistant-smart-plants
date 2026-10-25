// Care plan model: wording, status chips and the task editor draft.
// Task states (due, overdue, next due) always come from the backend, which
// computes them for today's date in the Home Assistant time zone; nothing here
// recomputes a schedule from browser dates.
import type { Localizer, MessageKey } from "./localize.js";
import type { CareTaskSummary, PlantOverview } from "./overview-model.js";
import { formatValue, readingLabel } from "./status.js";
import type { ReadingRole } from "./status.js";
import type { CareEvent, CareSchedule, CareTask, CareTaskChanges, CareTaskInput, CareTaskType, ForecastSource, HAState, IntervalSchedule, PlantRecord, ReadingSchedule, RestPeriod, YearlySchedule } from "./types.js";

export const CARE_TASK_TYPES: readonly CareTaskType[] = ["fertilize", "prune", "repot", "pests", "winter_protection", "custom"];
export const TASK_ICONS: Record<CareTaskType, string> = {
  fertilize: "mdi:flask-outline",
  prune: "mdi:content-cut",
  repot: "mdi:pot-mix-outline",
  pests: "mdi:bug-outline",
  winter_protection: "mdi:snowflake",
  custom: "mdi:checkbox-marked-circle-outline",
};
// The care history kind a completed task is logged as. Pest checks, winter
// protection and custom tasks have no kind of their own and are logged as
// generic task events.
export const TASK_KINDS: Record<CareTaskType, CareEvent["kind"]> = {
  fertilize: "fertilizing", prune: "pruning", repot: "repotting", pests: "task", winter_protection: "task", custom: "task",
};
// Plant roles a reading task can follow (battery is device health, not care),
// with the normalized unit the backend compares the role's value in.
export type ReadingSourceRole = Exclude<ReadingRole, "battery">;
export const ROLE_UNITS: Readonly<Record<ReadingSourceRole, string>> = {
  temperature: "°C", soil_temperature: "°C", humidity: "%", moisture: "%", illuminance: "lx", conductivity: "\u00b5S/cm", co2: "ppm",
};
export const READING_SOURCE_ROLES = Object.keys(ROLE_UNITS) as ReadingSourceRole[];
export const MAX_FOR_HOURS = 72;
// Look-ahead windows of a forecast reading, in hours.
export const FORECAST_HOURS = [24, 48, 72] as const;
export const INTERVAL_UNITS: readonly IntervalSchedule["unit"][] = ["days", "weeks", "months", "years"];
export const TASK_NAME_MAX = 60;
export const TASK_INSTRUCTIONS_MAX = 4000;
export const MAX_CARE_TASKS = 20;

// Default schedules of the preset tiles. Winter protection starts as a
// reading task instead (see presetDraft).
const PRESETS: Record<CareTaskType, IntervalSchedule | YearlySchedule> = {
  fertilize: { kind: "interval", every: 4, unit: "weeks", growing_season_only: true },
  prune: { kind: "yearly", start_month: 3, end_month: 4 },
  repot: { kind: "interval", every: 2, unit: "years", growing_season_only: false },
  pests: { kind: "interval", every: 2, unit: "weeks", growing_season_only: false },
  winter_protection: { kind: "interval", every: 1, unit: "weeks", growing_season_only: false },
  custom: { kind: "interval", every: 1, unit: "weeks", growing_season_only: false },
};

export function taskName(l: Localizer, task: { type: CareTaskType; name: string | null }): string {
  return task.name ?? l.t(`care_task_type.${task.type}`);
}

// Months 1-12 covered by an inclusive range that may wrap past December.
export function monthsInRange(start: number, end: number): number[] {
  const months: number[] = [];
  for (let month = start; ; month = month % 12 + 1) {
    months.push(month);
    if (month === end || months.length === 12) return months;
  }
}

export function monthName(l: Localizer, month: number, style: "long" | "short" | "narrow" = "long"): string {
  return new Intl.DateTimeFormat(l.language, { month: style, timeZone: "UTC" }).format(Date.UTC(2000, month - 1, 1));
}

export function monthRange(l: Localizer, start: number, end: number, style: "long" | "short" = "long"): string {
  return start === end ? monthName(l, start, style) : l.t("care_plan.month_range", { start: monthName(l, start, style), end: monthName(l, end, style) });
}

// A calendar date (YYYY-MM-DD) as "Mar 1", with the year only when it is not
// the year of `today`.
export function shortDate(l: Localizer, isoDate: string, today: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  const sameYear = isoDate.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat(l.language, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" }).format(Date.UTC(year, month - 1, day));
}

// `states` names the sensor of a reading task that follows another sensor.
export function scheduleText(l: Localizer, schedule: CareSchedule, restPeriod: RestPeriod | null, states?: Record<string, HAState>): string {
  if (schedule.kind === "reading") return l.t("care_plan.schedule_reading", { rule: readingRule(l, schedule), source: sourceName(l, schedule.source, states) });
  if (schedule.kind === "yearly") return l.t("care_plan.schedule_yearly", { months: monthRange(l, schedule.start_month, schedule.end_month) });
  const every = l.tn(schedule.every, `care_plan.every_${schedule.unit}_one`, `care_plan.every_${schedule.unit}_other`);
  return schedule.growing_season_only && restPeriod ? l.t("care_plan.schedule_growing_only", { every }) : every;
}

// ---- Reading tasks ----

// "Below 5 °C", or for a forecast "Forecast low below 2 °C", with the
// look-ahead when it is longer than the default 24 hours.
function readingRule(l: Localizer, schedule: ReadingSchedule): string {
  const value = readingValue(l, schedule.value, schedule.unit);
  if (!("forecast" in schedule.source)) return l.t(`care_plan.condition_${schedule.condition}`, { value });
  const { reading, hours } = schedule.source.forecast;
  const rule = l.t(`care_plan.forecast_rule_${reading}_${schedule.condition}`, { value });
  return hours === 24 ? rule : `${rule} · ${forecastWindow(l, hours)}`;
}

export function isSourceRole(role: string): role is ReadingSourceRole {
  return Object.hasOwn(ROLE_UNITS, role);
}

// A number with its unit as the panel shows readings ("5 °C", "55 %").
export function readingValue(l: Localizer, value: number, unit: string | null): string {
  return formatValue(l, value, unit ?? "");
}

// The source of a reading task: the role's name, or the sensor's or weather
// entity's friendly name.
export function sourceName(l: Localizer, source: ReadingSchedule["source"], states?: Record<string, HAState>): string {
  if ("role" in source) return isSourceRole(source.role) ? readingLabel(l, source.role) : source.role;
  const entityId = "forecast" in source ? source.forecast.entity_id : source.entity_id;
  const name = states?.[entityId]?.attributes.friendly_name;
  return typeof name === "string" && name.trim() ? name : entityId;
}

// ---- Forecast readings ----

// "next 24 h", "next 2 days", "next 3 days".
export function forecastWindow(l: Localizer, hours: number): string {
  return l.t(hours === 72 ? "care_plan.forecast_window_72" : hours === 48 ? "care_plan.forecast_window_48" : "care_plan.forecast_window_24");
}

// A weather entity that offers a forecast: daily (1), hourly (2) or twice
// daily (4) in its supported features.
export function forecastCapable(state: HAState | undefined): boolean {
  const features = state?.attributes.supported_features;
  return !!state && state.entity_id.startsWith("weather.") && typeof features === "number" && Number.isInteger(features) && (features & 7) !== 0;
}

// Weather entities a forecast reading can watch, sorted by name.
export function forecastEntities(l: Localizer, states?: Record<string, HAState>): HAState[] {
  const name = (s: HAState) => sourceName(l, { entity_id: s.entity_id }, states);
  return Object.values(states ?? {}).filter(forecastCapable).sort((a, b) => name(a).localeCompare(name(b)) || a.entity_id.localeCompare(b.entity_id));
}

// The temperature unit a weather entity reports its forecast in.
export function forecastUnit(entityId: string, states?: Record<string, HAState>): string | null {
  const unit = states?.[entityId]?.attributes.temperature_unit;
  return typeof unit === "string" && TEMPERATURE_UNITS.has(unit) ? unit : null;
}

// True when a forecast draft's weather entity no longer exists. Without any
// states yet (still loading) nothing counts as missing.
export function forecastMissing(draft: TaskDraft, states?: Record<string, HAState>): boolean {
  return draft.mode === "reading" && !draft.role && !draft.entityId && !!draft.forecast && !!draft.weatherEntityId
    && !!states && Object.keys(states).length > 0 && !states[draft.weatherEntityId];
}

// The current forecast value of a task being edited, for its row in the
// Reading picker: only while the draft still names the saved forecast.
export function forecastRowValue(plant: PlantRecord, overview: PlantOverview | undefined, taskId: string | null, source: ForecastSource): { value: number; unit: string | null } | null {
  const saved = plant.care_tasks?.find(task => task.id === taskId)?.schedule;
  const state = overview?.care.find(item => item.task_id === taskId);
  if (saved?.kind !== "reading" || !("forecast" in saved.source) || !state || state.reading === null) return null;
  const stored = saved.source.forecast;
  if (stored.entity_id !== source.entity_id || stored.hours !== source.hours || stored.reading !== source.reading) return null;
  return { value: state.reading, unit: state.unit ?? saved.unit };
}

// The end of a forecast task's coverage when the forecast stops before the
// end of its look-ahead window, else null. The window is counted from the
// last fetch, which can be up to half an hour old, so an hour of slack
// keeps a fully covered window from looking short.
export function forecastShortUntil(state: CareTaskSummary, schedule: CareSchedule, now: number): string | null {
  if (schedule.kind !== "reading" || !("forecast" in schedule.source) || !state.forecast_until) return null;
  const until = Date.parse(state.forecast_until);
  return Number.isFinite(until) && until < now + (schedule.source.forecast.hours - 1) * 3600000 ? state.forecast_until : null;
}

// "Forecast only until Tue 6:00 PM" in the Home Assistant time zone.
export function forecastShortText(l: Localizer, until: string, timeZone: string | undefined): string {
  const options: Intl.DateTimeFormatOptions = { weekday: "short", hour: "numeric", minute: "2-digit" };
  let format: Intl.DateTimeFormat;
  try { format = new Intl.DateTimeFormat(l.language, { ...options, ...(timeZone ? { timeZone } : {}) }); }
  catch { format = new Intl.DateTimeFormat(l.language, options); }
  return l.t("care_plan.forecast_short", { time: format.format(Date.parse(until)) });
}

const TEMPERATURE_UNITS = new Set(["°C", "°F", "K"]);
// True for the temperature roles, sensors with the temperature device class
// and forecasts.
export function isTemperatureSource(source: ReadingSchedule["source"] | null, states?: Record<string, HAState>): boolean {
  if (!source) return false;
  if ("role" in source) return source.role === "temperature" || source.role === "soil_temperature";
  if ("forecast" in source) return true;
  return states?.[source.entity_id]?.attributes.device_class === "temperature";
}

// Converts a Celsius value into a temperature unit, rounded to one decimal.
// Returns null for units that are not a temperature.
export function fromCelsius(celsius: number, unit: string | null): number | null {
  const value = unit === "°C" ? celsius : unit === "°F" ? celsius * 9 / 5 + 32 : unit === "K" ? celsius + 273.15 : null;
  return value === null ? null : Math.round(value * 10) / 10;
}

// The species' minimum temperature in Celsius, from an OpenPlantBook species only.
export function minTemperature(plant: PlantRecord): number | null {
  const snapshot = plant.species?.snapshot;
  const value = snapshot?.provider === "openplantbook" ? snapshot.min_temperature : null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// The value the OpenPlantBook minimum temperature suggests for a reading
// draft, in the draft's unit: only for a temperature source (of a forecast,
// its low) and the Below condition.
export function readingSuggestion(plant: PlantRecord, draft: TaskDraft, states?: Record<string, HAState>): number | null {
  const min = minTemperature(plant);
  const source = draftSource(draft);
  if (min === null || draft.mode !== "reading" || draft.condition !== "below" || !isTemperatureSource(source, states)) return null;
  if (source && "forecast" in source && source.forecast.reading !== "low") return null;
  return fromCelsius(min, draft.readingUnit ?? "°C");
}

// Roles assigned on the plant that a reading task can follow, in a fixed order.
export function plantReadingRoles(plant: PlantRecord): ReadingSourceRole[] {
  const roles = plant.roles as Record<string, unknown> | undefined;
  return READING_SOURCE_ROLES.filter(role => {
    const config = roles?.[role] as { sources?: unknown } | undefined;
    return Array.isArray(config?.sources) && config.sources.length > 0;
  });
}

// A sensor a reading task can follow: a sensor entity with a numeric state.
export function numericSensor(state: HAState | undefined): boolean {
  return !!state && state.entity_id.startsWith("sensor.") && state.state.trim() !== "" && Number.isFinite(Number(state.state));
}

// Picks the source of a reading draft and the unit its value is entered in.
// A value from the OpenPlantBook suggestion follows into the new unit, so
// 5 °C becomes 41 °F; a draft without a source yet holds it in Celsius.
export function pickSource(draft: TaskDraft, source: ReadingSchedule["source"] | null, unit: string | null, plant: PlantRecord): Partial<TaskDraft> {
  const forecast = source && "forecast" in source ? source.forecast : null;
  const changes: Partial<TaskDraft> = { role: source && "role" in source ? source.role : null, entityId: source && "entity_id" in source ? source.entity_id : null,
    forecast: forecast?.reading ?? null, weatherEntityId: forecast?.entity_id ?? null, readingUnit: unit };
  if (forecast) changes.forecastHours = forecast.hours;
  const min = minTemperature(plant);
  const before = min === null ? null : fromCelsius(min, draft.readingUnit ?? "°C");
  const after = min === null ? null : fromCelsius(min, unit);
  if (before !== null && after !== null && before !== after && parseNumber(draft.value) === before) changes.value = String(after);
  return changes;
}

// The unit a role source compares in, or the unit a sensor reports.
export function sourceUnit(source: ReadingSchedule["source"], states?: Record<string, HAState>): string | null {
  if ("role" in source) return isSourceRole(source.role) ? ROLE_UNITS[source.role] : null;
  if ("forecast" in source) return forecastUnit(source.forecast.entity_id, states);
  const unit = states?.[source.entity_id]?.attributes.unit_of_measurement;
  return typeof unit === "string" && unit ? unit : null;
}

function clockTime(l: Localizer, time: number, timeZone: string | undefined): string {
  let format: Intl.DateTimeFormat;
  try { format = new Intl.DateTimeFormat(l.language, { hour: "numeric", minute: "2-digit", ...(timeZone ? { timeZone } : {}) }); }
  catch { format = new Intl.DateTimeFormat(l.language, { hour: "numeric", minute: "2-digit" }); }
  return format.format(time);
}

// Status chip of a reading task: not needed, waiting out "only after", due,
// done and waiting for the safe side, or no reading. A forecast's value says
// "forecast" in front of it.
function readingChip(l: Localizer, state: CareTaskSummary, schedule: ReadingSchedule, today: string, lastDoneAt: string | null, timeZone: string | undefined): TaskChip {
  const forecast = "forecast" in schedule.source;
  const value = state.reading === null ? null : readingValue(l, state.reading, state.unit ?? schedule.unit);
  const reading = value !== null && forecast ? l.t("care_plan.forecast_value", { value }) : value;
  switch (state.status) {
    case "due": case "overdue": return { tone: "care", icon: "mdi:alert-circle-outline", text: reading ? l.t("care_plan.reading_due", { reading }) : l.t("care_plan.due_now") };
    case "waiting": {
      const reset = schedule.reset_value ?? schedule.value;
      const until = reset === schedule.value && TEMPERATURE_UNITS.has(schedule.unit ?? "")
        ? l.t(schedule.condition === "below" ? "care_plan.reading_still_cold" : "care_plan.reading_still_warm")
        : l.t(schedule.condition === "below" ? "care_plan.reading_until_above" : "care_plan.reading_until_below", { value: readingValue(l, reset, schedule.unit) });
      const done = lastDoneAt ? localDate(lastDoneAt, timeZone) : null;
      return { tone: "done", icon: "mdi:check", text: done ? l.t("care_plan.reading_done_on", { date: shortDate(l, done, today), until }) : l.t("care_plan.reading_waiting", { until }) };
    }
    case "no_reading": return { tone: "later", icon: "mdi:help-circle-outline", text: l.t(forecast ? "care_plan.forecast_none" : "care_plan.reading_none") };
    default: {
      const dueAt = state.due_at ? Date.parse(state.due_at) : NaN;
      if (Number.isFinite(dueAt)) {
        const value = readingValue(l, schedule.value, schedule.unit);
        return { tone: "later", icon: "mdi:timer-sand", text: l.t(schedule.condition === "below" ? "care_plan.reading_below_since" : "care_plan.reading_above_since",
          { value, since: clockTime(l, dueAt - schedule.for_minutes * 60000, timeZone), time: clockTime(l, dueAt, timeZone) }) };
      }
      return { tone: "later", icon: "mdi:gauge", text: reading ? l.t("care_plan.reading_not_needed", { reading }) : l.t("care_plan.reading_not_needed_plain") };
    }
  }
}

export type ChipTone = "care" | "overdue" | "later" | "done" | "resting";
export interface TaskChip { tone: ChipTone; icon: string; text: string }

// Status chip of one task. Overdue says so in words and with an icon, never by
// colour alone; missed once-a-year tasks are grey, not red. Reading tasks also
// use the task's last Done and the Home Assistant time zone.
export function taskChip(l: Localizer, state: CareTaskSummary, schedule: CareSchedule, today: string, extra: { lastDoneAt?: string | null; timeZone?: string | undefined } = {}): TaskChip {
  if (schedule.kind === "reading") return readingChip(l, state, schedule, today, extra.lastDoneAt ?? null, extra.timeZone);
  const date = (iso: string | null) => iso ? shortDate(l, iso, today) : "";
  switch (state.status) {
    case "overdue": return { tone: "overdue", icon: "mdi:alarm", text: l.tn(state.days ?? 0, "care_plan.overdue_one", "care_plan.overdue_other") };
    case "due": return schedule.kind === "yearly" && state.window_end
      ? { tone: "care", icon: "mdi:calendar-clock", text: l.t("care_plan.due_until", { date: date(state.window_end) }) }
      : { tone: "care", icon: "mdi:calendar-clock", text: l.t("care_plan.due_today") };
    case "resting": return { tone: "resting", icon: "mdi:weather-night", text: l.t("care_plan.resting_until", { date: date(state.resume_on ?? state.next_due) }) };
    case "done": return { tone: "done", icon: "mdi:check", text: l.t("care_plan.done_this_year") };
    case "skipped": return { tone: "later", icon: "mdi:skip-next", text: l.t("care_plan.skipped_this_year") };
    case "missed": return { tone: "later", icon: "mdi:calendar-remove-outline", text: l.t("care_plan.missed_this_year") };
    // Reading states belong to reading schedules; a date task only shows one
    // while its schedule kind just changed and the states are refreshing.
    case "watching": case "waiting": case "no_reading": return { tone: "later", icon: "mdi:calendar-blank-outline", text: l.t("care_plan.reading_none") };
    case "scheduled": {
      if (schedule.kind === "yearly") return { tone: "later", icon: "mdi:calendar-blank-outline", text: l.t("care_plan.from_date", { date: date(state.next_due) }) };
      const days = state.days ?? 0;
      if (days === 1) return { tone: "later", icon: "mdi:calendar-blank-outline", text: l.t("care_plan.tomorrow") };
      if (days < 14) return { tone: "later", icon: "mdi:calendar-blank-outline", text: l.tn(days, "care_plan.in_days_one", "care_plan.in_days_other") };
      if (days < 60) return { tone: "later", icon: "mdi:calendar-blank-outline", text: l.tn(Math.round(days / 7), "care_plan.in_weeks_one", "care_plan.in_weeks_other") };
      return { tone: "later", icon: "mdi:calendar-blank-outline", text: l.tn(Math.max(2, Math.round(days / 30.44)), "care_plan.in_months_one", "care_plan.in_months_other") };
    }
  }
}

// Local calendar date of an absolute timestamp in the Home Assistant time
// zone (falls back to the browser's zone when Home Assistant does not say).
export function localDate(isoTimestamp: string, timeZone?: string | undefined): string | null {
  const time = Date.parse(isoTimestamp);
  if (!Number.isFinite(time)) return null;
  let format: Intl.DateTimeFormat;
  try { format = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", ...(timeZone ? { timeZone } : {}) }); }
  catch { format = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }); }
  const parts = Object.fromEntries(format.formatToParts(time).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// The last time a task was done: its latest Done, or the date the person
// entered as "last done", whichever is later.
export function lastDone(task: CareTask, timeZone?: string | undefined): string | null {
  const done = task.last_done_at ? localDate(task.last_done_at, timeZone) : null;
  const baseline = task.baseline_done_on;
  if (!done) return baseline;
  if (!baseline) return done;
  return done > baseline ? done : baseline;
}

// The care task a care entry of `kind` also completes: the plant's task of the
// matching type. Generic task entries complete nothing unless linked.
export function matchingTask(tasks: readonly CareTask[], kind: CareEvent["kind"]): CareTask | undefined {
  if (kind === "task") return undefined;
  return tasks.find(task => TASK_KINDS[task.type] === kind);
}

export function existingTypes(tasks: readonly CareTask[]): Set<CareTaskType> {
  return new Set(tasks.filter(task => task.type !== "custom").map(task => task.type));
}

// ---- Task editor draft ----

export interface TaskDraft {
  type: CareTaskType;
  name: string;
  mode: "interval" | "yearly" | "reading";
  every: string;
  unit: IntervalSchedule["unit"];
  growingSeasonOnly: boolean;
  startMonth: number | null;
  endMonth: number | null;
  // Reading tasks: one of the plant's roles, another sensor, or a weather
  // entity's forecast low or high; only one of them.
  role: string | null;
  entityId: string | null;
  forecast: ForecastSource["reading"] | null;
  weatherEntityId: string | null;
  // Look-ahead of a forecast in hours, kept while another source is picked.
  forecastHours: number;
  condition: ReadingSchedule["condition"];
  value: string;
  // Unit of the reading values: the role's normalized unit or the sensor's unit.
  readingUnit: string | null;
  forHours: string;
  resetValue: string;
  instructions: string;
  lastDone: string;
}
export type DraftField = "name" | "every" | "months" | "source" | "value" | "forHours" | "resetValue" | "instructions" | "lastDone";
export type DraftErrors = Partial<Record<DraftField, MessageKey>>;

type ScheduleFields = Omit<TaskDraft, "type" | "name" | "instructions" | "lastDone">;
const DEFAULT_FIELDS: ScheduleFields = { mode: "interval", every: "4", unit: "weeks", growingSeasonOnly: false, startMonth: null, endMonth: null, role: null, entityId: null, forecast: null, weatherEntityId: null, forecastHours: 24, condition: "below", value: "", readingUnit: null, forHours: "", resetValue: "" };

function draftFromSchedule(schedule: CareSchedule): ScheduleFields {
  switch (schedule.kind) {
    case "interval": return { ...DEFAULT_FIELDS, every: String(schedule.every), unit: schedule.unit, growingSeasonOnly: schedule.growing_season_only };
    case "yearly": return { ...DEFAULT_FIELDS, mode: "yearly", startMonth: schedule.start_month, endMonth: schedule.end_month };
    case "reading": return { ...DEFAULT_FIELDS, mode: "reading", role: "role" in schedule.source ? schedule.source.role : null, entityId: "entity_id" in schedule.source ? schedule.source.entity_id : null,
      ...("forecast" in schedule.source ? { forecast: schedule.source.forecast.reading, weatherEntityId: schedule.source.forecast.entity_id, forecastHours: schedule.source.forecast.hours } : {}),
      condition: schedule.condition, value: String(schedule.value), readingUnit: schedule.unit, forHours: schedule.for_minutes ? String(schedule.for_minutes / 60) : "", resetValue: schedule.reset_value === null ? "" : String(schedule.reset_value) };
  }
}

// A new task from a preset tile. Winter protection follows the plant's
// temperature when it has one, else the forecast low of the first weather
// entity with a forecast; otherwise the person picks a sensor first.
export function presetDraft(type: CareTaskType, plant?: PlantRecord, states?: Record<string, HAState>, l?: Localizer): TaskDraft {
  const draft: TaskDraft = { type, name: "", instructions: "", lastDone: "", ...draftFromSchedule(PRESETS[type]) };
  if (type !== "winter_protection") return draft;
  const reading: TaskDraft = { ...draft, mode: "reading", condition: "below" };
  if (plant && plantReadingRoles(plant).includes("temperature")) return { ...reading, role: "temperature", readingUnit: ROLE_UNITS.temperature };
  const weather = l ? forecastEntities(l, states)[0] : undefined;
  if (weather) return { ...reading, forecast: "low", weatherEntityId: weather.entity_id, readingUnit: forecastUnit(weather.entity_id, states) };
  return reading;
}

// Winter protection with the species' minimum temperature as its value.
export function winterDraft(plant: PlantRecord, states?: Record<string, HAState>, l?: Localizer): TaskDraft | null {
  const min = minTemperature(plant);
  if (min === null) return null;
  const draft = presetDraft("winter_protection", plant, states, l);
  return { ...draft, value: String(fromCelsius(min, draft.readingUnit ?? "°C")) };
}

// The OpenPlantBook care text that fits each task type. Watering and sunlight
// texts describe health targets, not tasks, so they never become suggestions.
const CARE_NOTE_KEYS: Partial<Record<CareTaskType, string>> = { fertilize: "fertilization", prune: "pruning", repot: "soil" };
// Task types whose care text is offered in the first step of Add task. The
// soil text only appears as a hint while editing a repotting task.
const SUGGESTED_TYPES: readonly CareTaskType[] = ["fertilize", "prune"];

// The species' care text for a task type, from an OpenPlantBook species only.
export function careNote(plant: PlantRecord, type: CareTaskType): string | null {
  const snapshot = plant.species?.snapshot;
  const key = CARE_NOTE_KEYS[type];
  if (!snapshot || snapshot.provider !== "openplantbook" || !key) return null;
  const text = snapshot.care_text[key]?.trim();
  return text ? text.slice(0, TASK_INSTRUCTIONS_MAX) : null;
}

export interface CareSuggestion { type: CareTaskType; text: string }
export function careSuggestions(plant: PlantRecord): CareSuggestion[] {
  return SUGGESTED_TYPES.flatMap(type => { const text = careNote(plant, type); return text ? [{ type, text }] : []; });
}

export function suggestionDraft(type: CareTaskType, text: string, plant?: PlantRecord, states?: Record<string, HAState>, l?: Localizer): TaskDraft {
  return { ...presetDraft(type, plant, states, l), instructions: text };
}

export function draftFromTask(task: CareTask): TaskDraft {
  return { type: task.type, name: task.name ?? "", instructions: task.instructions ?? "", lastDone: task.baseline_done_on ?? "", ...draftFromSchedule(task.schedule) };
}

// Picks a contiguous month range by clicks: the first click picks one month,
// a second click on another month extends the range forward to it (wrapping
// past December), and a click on a range starts over.
export function pickMonth(startMonth: number | null, endMonth: number | null, month: number): { startMonth: number; endMonth: number } {
  if (startMonth !== null && endMonth !== null && startMonth === endMonth && month !== startMonth) return { startMonth, endMonth: month };
  return { startMonth: month, endMonth: month };
}

// A number typed into a value field, or null when it is not one. Accepts a
// decimal comma and at most three decimals, as the backend stores them.
export function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (!/^[-+]?(\d+(\.\d{0,3})?|\.\d{1,3})$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function draftSource(draft: TaskDraft): ReadingSchedule["source"] | null {
  if (draft.role) return { role: draft.role };
  if (draft.entityId) return { entity_id: draft.entityId };
  return draft.forecast && draft.weatherEntityId ? { forecast: { entity_id: draft.weatherEntityId, reading: draft.forecast, hours: draft.forecastHours } } : null;
}

export function isForecastDraft(draft: TaskDraft): boolean {
  const source = draftSource(draft);
  return !!source && "forecast" in source;
}

// "Only after" in minutes from hours; empty means at once. Fractions that
// come out to whole minutes are accepted, so a task saved with 90 minutes
// (for example through the API) opens as 1.5 hours and saves unchanged.
function forMinutes(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (!trimmed) return 0;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const minutes = Number(trimmed) * 60;
  const rounded = Math.round(minutes);
  if (Math.abs(minutes - rounded) > 1e-9 || rounded > MAX_FOR_HOURS * 60) return null;
  return rounded;
}

// A forecast never waits ("only after" is hidden) and needs its weather
// entity and that entity's temperature unit.
function readingErrors(draft: TaskDraft, states?: Record<string, HAState>): DraftErrors {
  const errors: DraftErrors = {};
  const forecast = isForecastDraft(draft);
  if (!draftSource(draft)) errors.source = "care_plan.error_source";
  else if (forecastMissing(draft, states)) errors.source = "care_plan.error_weather_missing";
  else if (forecast && !TEMPERATURE_UNITS.has(draft.readingUnit ?? "")) errors.source = "care_plan.error_weather_unit";
  const value = parseNumber(draft.value);
  if (value === null) errors.value = "care_plan.error_value";
  if (!forecast && forMinutes(draft.forHours) === null) errors.forHours = "care_plan.error_for_hours";
  if (draft.resetValue.trim()) {
    const reset = parseNumber(draft.resetValue);
    // "Due again after" lies on the safe side of the value, or equals it.
    if (reset === null) errors.resetValue = "care_plan.error_value";
    else if (value !== null && (draft.condition === "below" ? reset < value : reset > value)) errors.resetValue = draft.condition === "below" ? "care_plan.error_reset_below" : "care_plan.error_reset_above";
  }
  return errors;
}

export function draftSchedule(draft: TaskDraft, states?: Record<string, HAState>): CareSchedule | null {
  if (draft.mode === "reading") {
    const source = draftSource(draft); const value = parseNumber(draft.value); const minutes = isForecastDraft(draft) ? 0 : forMinutes(draft.forHours);
    if (!source || value === null || minutes === null || Object.keys(readingErrors(draft, states)).length) return null;
    return { kind: "reading", source, condition: draft.condition, value, unit: draft.readingUnit, for_minutes: minutes, reset_value: draft.resetValue.trim() ? parseNumber(draft.resetValue) : null };
  }
  if (draft.mode === "yearly") {
    return draft.startMonth !== null && draft.endMonth !== null ? { kind: "yearly", start_month: draft.startMonth, end_month: draft.endMonth } : null;
  }
  const every = Number(draft.every.trim());
  if (!/^\d+$/.test(draft.every.trim()) || every < 1 || every > 999) return null;
  return { kind: "interval", every, unit: draft.unit, growing_season_only: draft.growingSeasonOnly };
}

// Validates a draft against the same limits the backend enforces. `today` is
// the Home Assistant local date; "last done" cannot be after it. `states`
// tells whether a forecast's weather entity still exists.
export function validateDraft(draft: TaskDraft, today: string, states?: Record<string, HAState>): { input: CareTaskInput; errors: null } | { input: null; errors: DraftErrors } {
  const errors: DraftErrors = {};
  const name = draft.name.trim();
  if (draft.type === "custom" && !name) errors.name = "care_plan.error_name_required";
  else if (name.length > TASK_NAME_MAX) errors.name = "care_plan.error_name_length";
  const schedule = draftSchedule(draft, states);
  if (draft.mode === "reading") Object.assign(errors, readingErrors(draft, states));
  else if (!schedule) errors[draft.mode === "yearly" ? "months" : "every"] = draft.mode === "yearly" ? "care_plan.error_months" : "care_plan.error_every";
  const instructions = draft.instructions.trim();
  if (instructions.length > TASK_INSTRUCTIONS_MAX) errors.instructions = "care_plan.error_instructions_length";
  // "Last done" only anchors date schedules.
  const lastDone = draft.mode === "reading" ? "" : draft.lastDone.trim();
  if (lastDone && (!/^\d{4}-\d\d-\d\d$/.test(lastDone) || !Number.isFinite(Date.parse(lastDone)))) errors.lastDone = "care_plan.error_last_done";
  else if (lastDone && lastDone > today) errors.lastDone = "care_plan.error_last_done_future";
  if (Object.keys(errors).length || !schedule) return { input: null, errors };
  return { input: { task_type: draft.type, name: name || null, schedule, instructions: instructions || null, baseline_done_on: lastDone || null }, errors: null };
}

// JSON with sorted object keys, so equal schedules compare equal whatever
// order the backend wrote their keys in.
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : item);
}

// Only the fields that differ from the stored task, so an update never
// overwrites a change made elsewhere to a field the person did not touch.
export function taskChanges(task: CareTask, input: CareTaskInput): CareTaskChanges {
  const changes: CareTaskChanges = {};
  if (input.name !== task.name) changes.name = input.name;
  if (stableJson(input.schedule) !== stableJson(task.schedule)) changes.schedule = input.schedule;
  if (input.instructions !== task.instructions) changes.instructions = input.instructions;
  if (input.baseline_done_on !== task.baseline_done_on) changes.baseline_done_on = input.baseline_done_on;
  return changes;
}

// Live read-back of the draft's schedule for the editor's summary line.
export function draftSummary(l: Localizer, draft: TaskDraft, restPeriod: RestPeriod | null, states?: Record<string, HAState>): string {
  if (draft.mode === "reading") return readingSummary(l, draft, states);
  const schedule = draftSchedule(draft);
  if (schedule) return scheduleText(l, schedule, restPeriod);
  return l.t(draft.mode === "yearly" ? "care_plan.summary_pick_months" : "care_plan.summary_enter_interval");
}

// "When the temperature is below 5 °C · for 2 h · due again above 12 °C", or
// "When the forecast low for the next 24 hours is below 2 °C".
function readingSummary(l: Localizer, draft: TaskDraft, states?: Record<string, HAState>): string {
  const source = draftSource(draft);
  if (!source) return l.t("care_plan.summary_pick_source");
  const subject = "role" in source && isSourceRole(source.role) ? l.t(`care_plan.subject_${source.role}`)
    : "forecast" in source ? l.t(`care_plan.subject_forecast_${source.forecast.reading}`, { window: forecastWindowLong(l, source.forecast.hours) })
    : sourceName(l, source, states);
  const value = parseNumber(draft.value);
  const below = draft.condition === "below";
  if (value === null) return l.t(below ? "care_plan.summary_below_enter" : "care_plan.summary_above_enter", { subject });
  const parts = [l.t(below ? "care_plan.summary_below" : "care_plan.summary_above", { subject, value: readingValue(l, value, draft.readingUnit) })];
  const minutes = "forecast" in source ? 0 : forMinutes(draft.forHours);
  if (minutes) parts.push(l.tn(minutes / 60, "care_plan.summary_for_hours_one", "care_plan.summary_for_hours_other"));
  const reset = draft.resetValue.trim() ? parseNumber(draft.resetValue) : null;
  if (reset !== null && reset !== value) parts.push(l.t(below ? "care_plan.summary_again_above" : "care_plan.summary_again_below", { value: readingValue(l, reset, draft.readingUnit) }));
  return parts.join(" · ");
}

function forecastWindowLong(l: Localizer, hours: number): string {
  return l.t(hours === 72 ? "care_plan.forecast_window_long_72" : hours === 48 ? "care_plan.forecast_window_long_48" : "care_plan.forecast_window_long_24");
}

// True when two revisions of a plant differ only in care: its care history,
// care tasks, rest period or alert snooze. Such changes (for example a task
// marked done by an automation, or a snooze that ran out) never touch what the
// plant editor holds, so the panel takes them over silently instead of pausing
// saving for a review.
const CARE_FIELDS = new Set(["revision", "care_events", "care_tasks", "rest_period", "snoozed_until"]);
export function careOnlyChange(before: object, after: object): boolean {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].every(key => CARE_FIELDS.has(key) || JSON.stringify((before as Record<string, unknown>)[key]) === JSON.stringify((after as Record<string, unknown>)[key]));
}

// Entity registry unique IDs of a task's entities and the plant's care due sensor.
export function taskEntityUniqueIds(plantId: string, taskId: string): { due: string; next: string; careDue: string } {
  return { due: `smart_plants:${plantId}:care_task:${taskId}:due`, next: `smart_plants:${plantId}:care_task:${taskId}:next`, careDue: `smart_plants:${plantId}:care_due` };
}

// ---- Care chips and summaries ----

export function summaryName(l: Localizer, state: CareTaskSummary): string {
  return state.name ?? l.t(`care_task_type.${state.type}`);
}

// Tasks due today or overdue, in the backend's order (overdue first).
export function dueTasks(overview: PlantOverview | undefined): CareTaskSummary[] {
  return overview?.care.filter(task => task.is_due) ?? [];
}

// "Prune, Fertilize +1": the first `shown` due task names and how many more.
export function careLine(l: Localizer, due: readonly CareTaskSummary[], shown = 2): string {
  const names = due.slice(0, shown).map(task => summaryName(l, task)).join(", ");
  return due.length > shown ? l.t("care_plan.line_more", { names, count: due.length - shown }) : names;
}

// ---- Rest period ----

export function inRestPeriod(rest: RestPeriod | null, month: number): boolean {
  return !!rest && monthsInRange(rest.start_month, rest.end_month).includes(month);
}

// First day after the rest period that contains or follows `today`.
export function resumeDate(rest: RestPeriod, today: string): string {
  const year = Number(today.slice(0, 4)); const month = Number(today.slice(5, 7));
  const resume = rest.end_month % 12 + 1;
  return `${resume > month ? year : year + 1}-${String(resume).padStart(2, "0")}-01`;
}

// Repeating tasks that wait during the rest period.
export function tasksOffDuringRest(tasks: readonly CareTask[]): CareTask[] {
  return tasks.filter(task => task.schedule.kind === "interval" && task.schedule.growing_season_only);
}

// The rest row's sentence: the current season and how many tasks wait.
export function restSentence(l: Localizer, rest: RestPeriod, tasks: readonly CareTask[], today: string): { resting: boolean; season: string; tasks: string } {
  const resting = inRestPeriod(rest, Number(today.slice(5, 7)));
  const off = tasksOffDuringRest(tasks).length;
  const season = resting ? l.t("care_plan.resting_until", { date: shortDate(l, resumeDate(rest, today), today) }) : l.t("care_plan.growing_season");
  const count = off === 0 ? l.t("care_plan.rest_all_running")
    : resting ? l.tn(off, "care_plan.rest_tasks_off_now_one", "care_plan.rest_tasks_off_now_other")
    : l.tn(off, "care_plan.rest_tasks_off_one", "care_plan.rest_tasks_off_other");
  return { resting, season, tasks: count };
}

export interface RestDraft {
  startMonth: number | null;
  endMonth: number | null;
  // Repeating tasks that wait during the rest period.
  off: ReadonlySet<string>;
}

// A new rest period pauses fertilizing by default; an existing one shows the
// tasks' current settings.
export function restDraft(rest: RestPeriod | null, tasks: readonly CareTask[]): RestDraft {
  const repeating = tasks.filter(task => task.schedule.kind === "interval");
  const off = repeating.filter(task => task.schedule.kind === "interval" && (task.schedule.growing_season_only || (!rest && task.type === "fertilize")));
  return { startMonth: rest?.start_month ?? null, endMonth: rest?.end_month ?? null, off: new Set(off.map(task => task.id)) };
}

export function validateRest(draft: RestDraft): { rest: RestPeriod; error: null } | { rest: null; error: MessageKey } {
  if (draft.startMonth === null || draft.endMonth === null) return { rest: null, error: "care_plan.rest_error_months" };
  if (monthsInRange(draft.startMonth, draft.endMonth).length === 12) return { rest: null, error: "care_plan.rest_error_whole_year" };
  return { rest: { start_month: draft.startMonth, end_month: draft.endMonth }, error: null };
}

// Repeating tasks whose "off during rest" setting the draft changes.
export function restTaskChanges(tasks: readonly CareTask[], off: ReadonlySet<string>): { task: CareTask; schedule: IntervalSchedule }[] {
  return tasks.flatMap(task => task.schedule.kind === "interval" && task.schedule.growing_season_only !== off.has(task.id)
    ? [{ task, schedule: { ...task.schedule, growing_season_only: off.has(task.id) } }] : []);
}
