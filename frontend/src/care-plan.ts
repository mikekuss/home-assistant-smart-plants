// Care plan model: wording, status chips and the task editor draft.
// Task states (due, overdue, next due) always come from the backend, which
// computes them for today's date in the Home Assistant time zone; nothing here
// recomputes a schedule from browser dates.
import type { Localizer, MessageKey } from "./localize.js";
import type { CareTaskSummary, PlantOverview } from "./overview-model.js";
import type { CareEvent, CareTask, CareTaskChanges, CareTaskInput, CareTaskType, IntervalSchedule, RestPeriod, YearlySchedule } from "./types.js";

export const CARE_TASK_TYPES: readonly CareTaskType[] = ["fertilize", "prune", "repot", "pests", "custom"];
export const TASK_ICONS: Record<CareTaskType, string> = {
  fertilize: "mdi:flask-outline",
  prune: "mdi:content-cut",
  repot: "mdi:pot-mix-outline",
  pests: "mdi:bug-outline",
  custom: "mdi:checkbox-marked-circle-outline",
};
// The care history kind a completed task is logged as. Pest checks and custom
// tasks have no kind of their own and are logged as generic task events.
export const TASK_KINDS: Record<CareTaskType, CareEvent["kind"]> = {
  fertilize: "fertilizing", prune: "pruning", repot: "repotting", pests: "task", custom: "task",
};
export const INTERVAL_UNITS: readonly IntervalSchedule["unit"][] = ["days", "weeks", "months", "years"];
export const TASK_NAME_MAX = 60;
export const TASK_INSTRUCTIONS_MAX = 500;
export const MAX_CARE_TASKS = 20;

// Default schedules of the preset tiles.
const PRESETS: Record<CareTaskType, IntervalSchedule | YearlySchedule> = {
  fertilize: { kind: "interval", every: 4, unit: "weeks", growing_season_only: true },
  prune: { kind: "yearly", start_month: 3, end_month: 4 },
  repot: { kind: "interval", every: 2, unit: "years", growing_season_only: false },
  pests: { kind: "interval", every: 2, unit: "weeks", growing_season_only: false },
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

export function scheduleText(l: Localizer, schedule: IntervalSchedule | YearlySchedule, restPeriod: RestPeriod | null): string {
  if (schedule.kind === "yearly") return l.t("care_plan.schedule_yearly", { months: monthRange(l, schedule.start_month, schedule.end_month) });
  const every = l.tn(schedule.every, `care_plan.every_${schedule.unit}_one`, `care_plan.every_${schedule.unit}_other`);
  return schedule.growing_season_only && restPeriod ? l.t("care_plan.schedule_growing_only", { every }) : every;
}

export type ChipTone = "care" | "overdue" | "later" | "done" | "resting";
export interface TaskChip { tone: ChipTone; icon: string; text: string }

// Status chip of one task. Overdue says so in words and with an icon, never by
// colour alone; missed once-a-year tasks are grey, not red.
export function taskChip(l: Localizer, state: CareTaskSummary, schedule: IntervalSchedule | YearlySchedule, today: string): TaskChip {
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
  mode: "interval" | "yearly";
  every: string;
  unit: IntervalSchedule["unit"];
  growingSeasonOnly: boolean;
  startMonth: number | null;
  endMonth: number | null;
  instructions: string;
  lastDone: string;
}
export type DraftField = "name" | "every" | "months" | "instructions" | "lastDone";
export type DraftErrors = Partial<Record<DraftField, MessageKey>>;

function draftFromSchedule(schedule: IntervalSchedule | YearlySchedule): Pick<TaskDraft, "mode" | "every" | "unit" | "growingSeasonOnly" | "startMonth" | "endMonth"> {
  return schedule.kind === "interval"
    ? { mode: "interval", every: String(schedule.every), unit: schedule.unit, growingSeasonOnly: schedule.growing_season_only, startMonth: null, endMonth: null }
    : { mode: "yearly", every: "4", unit: "weeks", growingSeasonOnly: false, startMonth: schedule.start_month, endMonth: schedule.end_month };
}

export function presetDraft(type: CareTaskType): TaskDraft {
  return { type, name: "", instructions: "", lastDone: "", ...draftFromSchedule(PRESETS[type]) };
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

export function draftSchedule(draft: TaskDraft): IntervalSchedule | YearlySchedule | null {
  if (draft.mode === "yearly") {
    return draft.startMonth !== null && draft.endMonth !== null ? { kind: "yearly", start_month: draft.startMonth, end_month: draft.endMonth } : null;
  }
  const every = Number(draft.every.trim());
  if (!/^\d+$/.test(draft.every.trim()) || every < 1 || every > 999) return null;
  return { kind: "interval", every, unit: draft.unit, growing_season_only: draft.growingSeasonOnly };
}

// Validates a draft against the same limits the backend enforces. `today` is
// the Home Assistant local date; "last done" cannot be after it.
export function validateDraft(draft: TaskDraft, today: string): { input: CareTaskInput; errors: null } | { input: null; errors: DraftErrors } {
  const errors: DraftErrors = {};
  const name = draft.name.trim();
  if (draft.type === "custom" && !name) errors.name = "care_plan.error_name_required";
  else if (name.length > TASK_NAME_MAX) errors.name = "care_plan.error_name_length";
  const schedule = draftSchedule(draft);
  if (!schedule) errors[draft.mode === "yearly" ? "months" : "every"] = draft.mode === "yearly" ? "care_plan.error_months" : "care_plan.error_every";
  const instructions = draft.instructions.trim();
  if (instructions.length > TASK_INSTRUCTIONS_MAX) errors.instructions = "care_plan.error_instructions_length";
  const lastDone = draft.lastDone.trim();
  if (lastDone && (!/^\d{4}-\d\d-\d\d$/.test(lastDone) || !Number.isFinite(Date.parse(lastDone)))) errors.lastDone = "care_plan.error_last_done";
  else if (lastDone && lastDone > today) errors.lastDone = "care_plan.error_last_done_future";
  if (Object.keys(errors).length || !schedule) return { input: null, errors };
  return { input: { task_type: draft.type, name: name || null, schedule, instructions: instructions || null, baseline_done_on: lastDone || null }, errors: null };
}

// Only the fields that differ from the stored task, so an update never
// overwrites a change made elsewhere to a field the person did not touch.
export function taskChanges(task: CareTask, input: CareTaskInput): CareTaskChanges {
  const changes: CareTaskChanges = {};
  if (input.name !== task.name) changes.name = input.name;
  if (JSON.stringify(input.schedule) !== JSON.stringify(task.schedule)) changes.schedule = input.schedule;
  if (input.instructions !== task.instructions) changes.instructions = input.instructions;
  if (input.baseline_done_on !== task.baseline_done_on) changes.baseline_done_on = input.baseline_done_on;
  return changes;
}

// Live read-back of the draft's schedule for the editor's summary line.
export function draftSummary(l: Localizer, draft: TaskDraft, restPeriod: RestPeriod | null): string {
  const schedule = draftSchedule(draft);
  if (schedule) return scheduleText(l, schedule, restPeriod);
  return l.t(draft.mode === "yearly" ? "care_plan.summary_pick_months" : "care_plan.summary_enter_interval");
}

// True when two revisions of a plant differ only in care: its care history,
// care tasks or rest period. Such changes (for example a task marked done by an
// automation) never touch what the plant editor holds, so the panel takes them
// over silently instead of pausing saving for a review.
const CARE_FIELDS = new Set(["revision", "care_events", "care_tasks", "rest_period"]);
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
