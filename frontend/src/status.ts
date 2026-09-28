// Plant status and reading presentation shared by the overview, the plant page
// and the create wizard. Status and role icons are Material Design Icons names
// resolved by Home Assistant's own icon set through `ha-icon`, so the panel
// bundles no icon data.
import type { Localizer, MessageKey } from "./localize.js";

// One status per plant, most urgent first. `paused` is shown for disabled
// plants regardless of their readings.
export const PLANT_STATUSES = ["needs_water", "too_wet", "problem", "stale", "no_sensors", "healthy", "paused"] as const;
export type PlantStatus = typeof PLANT_STATUSES[number];

export interface StatusMeta {
  readonly icon: string;
  // Home Assistant theme variable that carries the status colour.
  readonly color: string;
  readonly label: MessageKey;
}

export const STATUS_META: Readonly<Record<PlantStatus, StatusMeta>> = {
  needs_water: { icon: "mdi:water-alert", color: "--warning-color", label: "plant_status.needs_water" },
  too_wet: { icon: "mdi:waves-arrow-up", color: "--info-color", label: "plant_status.too_wet" },
  problem: { icon: "mdi:alert-circle", color: "--error-color", label: "plant_status.problem" },
  stale: { icon: "mdi:clock-alert-outline", color: "--disabled-text-color", label: "plant_status.stale" },
  no_sensors: { icon: "mdi:sprout-outline", color: "--disabled-text-color", label: "plant_status.no_sensors" },
  healthy: { icon: "mdi:check-circle", color: "--success-color", label: "plant_status.healthy" },
  paused: { icon: "mdi:pause-circle-outline", color: "--disabled-text-color", label: "plant_status.paused" },
};

export function isPlantStatus(value: unknown): value is PlantStatus {
  return typeof value === "string" && (PLANT_STATUSES as readonly string[]).includes(value);
}

export function statusLabel(l: Localizer, status: PlantStatus): string {
  return l.t(STATUS_META[status].label);
}

// Negative when `a` needs attention before `b`.
export function compareStatus(a: PlantStatus, b: PlantStatus): number {
  return PLANT_STATUSES.indexOf(a) - PLANT_STATUSES.indexOf(b);
}

export const READING_ROLES = ["moisture", "temperature", "humidity", "illuminance", "conductivity", "soil_temperature", "co2", "battery"] as const;
export type ReadingRole = typeof READING_ROLES[number];
export type ReadingState = "ok" | "low" | "high" | "stale" | "unavailable";

export interface RoleMeta {
  readonly icon: string;
  readonly label: MessageKey;
}

export const ROLE_META: Readonly<Record<ReadingRole, RoleMeta>> = {
  moisture: { icon: "mdi:water", label: "reading.moisture" },
  temperature: { icon: "mdi:thermometer", label: "reading.temperature" },
  humidity: { icon: "mdi:water-percent", label: "reading.humidity" },
  illuminance: { icon: "mdi:white-balance-sunny", label: "reading.illuminance" },
  conductivity: { icon: "mdi:flash", label: "reading.conductivity" },
  soil_temperature: { icon: "mdi:thermometer-lines", label: "reading.soil_temperature" },
  co2: { icon: "mdi:molecule-co2", label: "reading.co2" },
  battery: { icon: "mdi:battery", label: "reading.battery" },
};

export function isReadingRole(value: unknown): value is ReadingRole {
  return typeof value === "string" && (READING_ROLES as readonly string[]).includes(value);
}

export function readingLabel(l: Localizer, role: ReadingRole): string {
  return l.t(ROLE_META[role].label);
}

export interface TargetRange { min: number | null; target?: number | null; max: number | null }

// A value with its unit, following the catalog's spacing for percentages.
export function formatValue(l: Localizer, value: number, unit: string): string {
  if (unit === "%") return l.percent(value);
  return unit ? `${l.number(value)} ${unit}` : l.number(value);
}

// "30–60 %", "At least 500 lx", "Low below 20 %" or "" when there is no bound.
export function formatRange(l: Localizer, role: ReadingRole, range: TargetRange | null | undefined, unit: string): string {
  if (!range) return "";
  const { min, max } = range;
  if (role === "battery" && min !== null) return l.t("range.low_below", { value: formatValue(l, min, unit) });
  if (min !== null && max !== null) {
    return l.t("range.between", { min: l.number(min), max: formatValue(l, max, unit) });
  }
  if (min !== null) return l.t("range.at_least", { value: formatValue(l, min, unit) });
  if (max !== null) return l.t("range.at_most", { value: formatValue(l, max, unit) });
  return "";
}

const RELATIVE_STEPS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60], ["minute", 60], ["hour", 24], ["day", 7], ["week", 4.34524], ["month", 12], ["year", Number.POSITIVE_INFINITY],
];

// "9 hours ago" / "vor 9 Stunden"; `now` is injectable for tests.
export function relativeTime(l: Localizer, isoTimestamp: string, now: number = Date.now()): string {
  const then = Date.parse(isoTimestamp);
  if (!Number.isFinite(then)) return isoTimestamp;
  const format = new Intl.RelativeTimeFormat(l.language, { numeric: "auto" });
  let value = (then - now) / 1000;
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(value) < size) return format.format(Math.round(value), unit);
    value /= size;
  }
  return isoTimestamp;
}
