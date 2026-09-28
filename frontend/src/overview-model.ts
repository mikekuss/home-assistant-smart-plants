// Wire shape and presentation logic for the plant overview. The backend
// command `smart_plants/plants/overview` decides each plant's status from the
// same evaluations its entities use; this module only validates and presents it.
import type { Localizer, MessageKey } from "./localize.js";
import { ROLE_META, compareStatus, formatValue, isPlantStatus, isReadingRole, readingLabel, relativeTime, statusLabel } from "./status.js";
import type { PlantStatus, ReadingRole, ReadingState, TargetRange } from "./status.js";

export interface RoleReading {
  value: number | null;
  unit: string;
  state: ReadingState;
  range: TargetRange;
  last_reported: string | null;
  sources: string[];
}
export interface PlantProblem { role: string; kind: string }
export interface PlantOverview {
  plant_id: string;
  revision: number;
  lifecycle_state: "active" | "disabled";
  status: PlantStatus;
  problems: PlantProblem[];
  roles: Partial<Record<ReadingRole, RoleReading>>;
  last_watered_at: string | null;
  image: { id: string } | null;
}

const READING_STATES: readonly ReadingState[] = ["ok", "low", "high", "stale", "unavailable"];
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const numOrNull = (v: unknown): v is number | null => v === null || (typeof v === "number" && Number.isFinite(v));
const strOrNull = (v: unknown): v is string | null => v === null || typeof v === "string";

function parseReading(raw: unknown): RoleReading | null {
  if (!isRecord(raw) || !isRecord(raw.range)) return null;
  const { value, unit, state, range, last_reported, sources } = raw;
  if (!numOrNull(value) || !(unit === null || typeof unit === "string") || !READING_STATES.includes(state as ReadingState)) return null;
  if (!numOrNull(range.min) || !numOrNull(range.target) || !numOrNull(range.max) || !strOrNull(last_reported)) return null;
  if (!Array.isArray(sources) || !sources.every(s => typeof s === "string")) return null;
  return { value, unit: unit ?? "", state: state as ReadingState, range: { min: range.min, target: range.target, max: range.max }, last_reported, sources: [...sources] };
}

// Validates one overview entry; returns null for anything malformed so a bad
// entry never renders guessed values. Unknown roles are skipped.
export function parseOverview(raw: unknown): PlantOverview | null {
  if (!isRecord(raw)) return null;
  const { plant_id, revision, lifecycle_state, status, problems, roles, last_watered_at, image } = raw;
  if (typeof plant_id !== "string" || typeof revision !== "number" || (lifecycle_state !== "active" && lifecycle_state !== "disabled")) return null;
  if (!isPlantStatus(status) || !Array.isArray(problems) || !isRecord(roles) || !strOrNull(last_watered_at)) return null;
  if (!(image === null || (isRecord(image) && typeof image.id === "string"))) return null;
  const parsedProblems = problems.filter((p): p is PlantProblem => isRecord(p) && typeof p.role === "string" && typeof p.kind === "string").map(p => ({ role: p.role, kind: p.kind }));
  if (parsedProblems.length !== problems.length) return null;
  const parsedRoles: Partial<Record<ReadingRole, RoleReading>> = {};
  for (const [role, value] of Object.entries(roles)) {
    if (!isReadingRole(role)) continue;
    const reading = parseReading(value);
    if (!reading) return null;
    parsedRoles[role] = reading;
  }
  return { plant_id, revision, lifecycle_state, status, problems: parsedProblems, roles: parsedRoles, last_watered_at, image: image === null ? null : { id: (image as { id: string }).id } };
}

// ---- Chip and reason text ----

const KIND_LABELS: Record<string, MessageKey> = {
  too_cold: "problem_kind.too_cold",
  too_hot: "problem_kind.too_hot",
  too_dry: "problem_kind.too_dry",
  too_humid: "problem_kind.too_humid",
  low_light: "problem_kind.low_light",
  low_conductivity: "problem_kind.low_conductivity",
  high_conductivity: "problem_kind.high_conductivity",
  high_co2: "problem_kind.high_co2",
  battery_low: "problem_kind.battery_low",
};
const SOIL_KIND_LABELS: Record<string, MessageKey> = { too_cold: "problem_kind.soil_too_cold", too_hot: "problem_kind.soil_too_hot" };

// The chip names the most urgent issue: the status itself, or for `problem`
// the specific issue ("Too little light"). Further issues become "+N".
export function chipText(l: Localizer, overview: PlantOverview): { label: string; more: number } {
  const first = overview.problems[0];
  const more = overview.status === "healthy" || overview.status === "paused" ? 0 : Math.max(0, overview.problems.length - 1);
  if (overview.status === "problem" && first) {
    const key = (first.role === "soil_temperature" ? SOIL_KIND_LABELS[first.kind] : undefined) ?? KIND_LABELS[first.kind];
    return { label: key ? l.t(key) : statusLabel(l, "problem"), more };
  }
  return { label: statusLabel(l, overview.status), more };
}

function valueText(l: Localizer, reading: RoleReading | undefined): string | null {
  return reading && reading.value !== null ? formatValue(l, reading.value, reading.unit) : null;
}

// One plain sentence per issue, for example "Soil moisture 34% is below the
// minimum of 60%". Issues without enough data fall back to a short phrase.
export function problemReason(l: Localizer, overview: PlantOverview, problem: PlantProblem, now?: number): string {
  const role = isReadingRole(problem.role) ? problem.role : null;
  const reading = role ? overview.roles[role] : undefined;
  const name = role ? readingLabel(l, role) : problem.role;
  const value = valueText(l, reading);
  const limit = (bound: number | null | undefined) => bound === null || bound === undefined || !reading ? null : formatValue(l, bound, reading.unit);
  switch (problem.kind) {
    case "stale":
      return reading?.last_reported
        ? l.t("reason.stale", { role: name, age: relativeTime(l, reading.last_reported, now) })
        : l.t("reason.not_reporting", { role: name });
    case "unavailable":
      return l.t("reason.not_reporting", { role: name });
    case "no_sensors":
      return l.t("reason.no_sensors");
    case "low_light": {
      const min = limit(reading?.range.min);
      return value && min ? l.t("reason.low_light", { value, limit: min }) : l.t("problem_kind.low_light");
    }
    case "battery_low":
      return value ? l.t("reason.battery_low", { value }) : l.t("problem_kind.battery_low");
  }
  const direction = ["needs_water", "too_cold", "too_dry", "low_conductivity"].includes(problem.kind) ? "low"
    : ["too_wet", "too_hot", "too_humid", "high_conductivity", "high_co2"].includes(problem.kind) ? "high" : null;
  if (direction === "low") {
    const min = limit(reading?.range.min);
    if (value && min) return l.t("reason.below_min", { role: name, value, limit: min });
  }
  if (direction === "high") {
    const max = limit(reading?.range.max);
    if (value && max) return l.t("reason.above_max", { role: name, value, limit: max });
  }
  return l.t("reason.outside_target", { role: name });
}

// The card shows up to two issues; the plant page lists all of them.
export function cardReason(l: Localizer, overview: PlantOverview, now?: number): string {
  if (overview.status === "healthy" || overview.status === "paused" || overview.status === "no_sensors") return "";
  return overview.problems.slice(0, 2).map(p => problemReason(l, overview, p, now)).join(" · ");
}

export function wateredText(l: Localizer, lastWateredAt: string | null, now: number = Date.now()): string {
  if (!lastWateredAt) return l.t("card.never_watered");
  const at = Date.parse(lastWateredAt);
  if (Number.isFinite(at) && Math.abs(now - at) < 60_000) return l.t("card.watered_just_now");
  return l.t("card.watered", { age: relativeTime(l, lastWateredAt, now) });
}

// Other roles in a fixed order, after soil moisture.
export function secondaryReadings(overview: PlantOverview): [ReadingRole, RoleReading][] {
  return (Object.keys(ROLE_META) as ReadingRole[])
    .filter(role => role !== "moisture" && overview.roles[role])
    .map(role => [role, overview.roles[role]!]);
}

// ---- Filtering, search and sorting ----

export type OverviewFilter = "all" | "water" | "problems" | "sensors";
export const OVERVIEW_FILTERS: readonly OverviewFilter[] = ["all", "water", "problems", "sensors"];
export function matchesFilter(filter: OverviewFilter, status: PlantStatus | undefined): boolean {
  switch (filter) {
    case "all": return true;
    case "water": return status === "needs_water";
    case "problems": return status === "too_wet" || status === "problem";
    case "sensors": return status === "stale" || status === "no_sensors";
  }
}

export type OverviewSort = "attention" | "name" | "area";
export const OVERVIEW_SORTS: readonly OverviewSort[] = ["attention", "name", "area"];

export interface OverviewItem {
  id: string;
  name: string;
  areaName: string | null;
  status: PlantStatus | undefined;
  // Name, area, species, category and tags for search.
  searchText: string;
}

export function matchesSearch(item: OverviewItem, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  return !q || item.searchText.toLocaleLowerCase().includes(q);
}

const byName = (a: OverviewItem, b: OverviewItem) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

export function sortItems<T extends OverviewItem>(items: readonly T[], sort: OverviewSort): T[] {
  const sorted = [...items];
  if (sort === "attention") sorted.sort((a, b) => compareStatus(a.status ?? "healthy", b.status ?? "healthy") || byName(a, b));
  else sorted.sort(byName);
  return sorted;
}

// Area groups in name order; plants without an area come last.
export function groupByArea<T extends OverviewItem>(items: readonly T[]): { area: string | null; items: T[] }[] {
  const groups = new Map<string | null, T[]>();
  for (const item of sortItems(items, "name")) groups.set(item.areaName, [...(groups.get(item.areaName) ?? []), item]);
  return [...groups.entries()]
    .sort(([a], [b]) => a === null ? 1 : b === null ? -1 : a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([area, grouped]) => ({ area, items: grouped }));
}
