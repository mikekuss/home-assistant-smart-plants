// Data side of the plant page's history chart. Home Assistant already records
// long-term statistics for every plant sensor; this module picks the request
// for a time range, validates the reply and derives what the chart draws:
// line segments, the value axis, time ticks and how fast soil moisture drops.
import type { Localizer } from "./localize.js";
import { formatValue } from "./status.js";
import type { ReadingRole, TargetRange } from "./status.js";

export const HISTORY_RANGES = ["24h", "7d", "30d", "1y"] as const;
export type HistoryRange = typeof HISTORY_RANGES[number];
export type StatisticsPeriod = "5minute" | "hour" | "day";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface RangeSpec { readonly spanMs: number; readonly period: StatisticsPeriod; readonly periodMs: number }
// Five-minute statistics only live as long as the recorder keeps states, so
// longer ranges use the hourly and daily statistics Home Assistant keeps forever.
export const RANGE_SPECS: Readonly<Record<HistoryRange, RangeSpec>> = {
  "24h": { spanMs: DAY, period: "5minute", periodMs: 5 * 60_000 },
  "7d": { spanMs: 7 * DAY, period: "hour", periodMs: HOUR },
  "30d": { spanMs: 30 * DAY, period: "hour", periodMs: HOUR },
  "1y": { spanMs: 365 * DAY, period: "day", periodMs: DAY },
};

export function isHistoryRange(value: unknown): value is HistoryRange {
  return typeof value === "string" && (HISTORY_RANGES as readonly string[]).includes(value);
}

// One statistics period: its middle as the time, the mean and the spread.
export interface HistoryPoint { t: number; mean: number; min: number; max: number }

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Reads the reply of `recorder/statistics_during_period` for one entity.
// Returns null when the reply is not a statistics result at all; periods
// without a mean (sensor unavailable) are left out and show as gaps.
export function parseStatistics(raw: unknown, statisticId: string): HistoryPoint[] | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const rows = (raw as Record<string, unknown>)[statisticId];
  if (rows === undefined) return [];
  if (!Array.isArray(rows)) return null;
  const points: HistoryPoint[] = [];
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const { start, end, mean, min, max } = row as Record<string, unknown>;
    if (!finite(start) || !finite(mean)) continue;
    const t = finite(end) && end > start ? (start + end) / 2 : start;
    const low = finite(min) ? Math.min(min, mean) : mean;
    const high = finite(max) ? Math.max(max, mean) : mean;
    points.push({ t, mean, min: low, max: high });
  }
  return points.sort((a, b) => a.t - b.t);
}

// Statistics trail the present by up to one period; the current reading closes that gap.
export function withLiveValue(points: readonly HistoryPoint[], value: number | null | undefined, now: number): HistoryPoint[] {
  const last = points.at(-1);
  if (value === null || value === undefined || !Number.isFinite(value) || (last && last.t >= now)) return [...points];
  return [...points, { t: now, mean: value, min: value, max: value }];
}

// Runs of points without a hole; a missing stretch breaks the line instead of being bridged.
export function segments(points: readonly HistoryPoint[], periodMs: number): HistoryPoint[][] {
  const result: HistoryPoint[][] = [];
  let previous: HistoryPoint | undefined;
  for (const point of points) {
    if (!previous || point.t - previous.t > periodMs * 2.5) result.push([]);
    result.at(-1)!.push(point);
    previous = point;
  }
  return result;
}

export interface ValueScale { min: number; max: number; ticks: number[] }

function niceStep(rough: number): number {
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
}

// Value axis covering the data and any target limit close enough to matter.
// A far-away limit (CO₂ warning at 5000 ppm while readings sit near 600) is
// left out so the curve keeps its shape. Percentages never leave 0–100.
export function valueScale(points: readonly HistoryPoint[], limits: readonly (number | null | undefined)[], unit: string): ValueScale {
  let low = Math.min(...points.map(p => p.min));
  let high = Math.max(...points.map(p => p.max));
  if (!Number.isFinite(low) || !Number.isFinite(high)) { low = 0; high = unit === "%" ? 100 : 1; }
  const reach = Math.max(high - low, unit === "%" ? 10 : Math.max(Math.abs(high) * 0.1, 1)) * 1.5;
  for (const limit of limits) {
    if (limit === null || limit === undefined || !Number.isFinite(limit)) continue;
    if (limit < low && limit >= low - reach) low = limit;
    if (limit > high && limit <= high + reach) high = limit;
  }
  // A flat or single-value series still gets an axis wide enough to read.
  const narrowest = unit === "%" ? 10 : Math.max(Math.abs(high) * 0.05, 2);
  if (high - low < narrowest) { const pad = (narrowest - (high - low)) / 2; low -= pad; high += pad; }
  const step = niceStep((high - low) / 4);
  let min = Math.floor((low - step * 0.25) / step) * step;
  let max = Math.ceil((high + step * 0.25) / step) * step;
  if (unit === "%") { min = Math.max(0, min); max = Math.min(100, max); }
  else if (low >= 0) min = Math.max(0, min);
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step - 1e-9) * step; tick <= max + step * 1e-6; tick += step) ticks.push(Number(tick.toPrecision(12)));
  return { min, max, ticks };
}

export interface TimeTick { t: number; label: string }

// Ticks on local clock boundaries: every six hours, every day, every week or every other month.
export function timeTicks(start: number, end: number, language: string): TimeTick[] {
  const span = end - start;
  const ticks: TimeTick[] = [];
  const cursor = new Date(start);
  const push = (format: Intl.DateTimeFormat) => { const t = cursor.getTime(); if (t >= start && t <= end) ticks.push({ t, label: format.format(t) }); };
  if (span <= 1.5 * DAY) {
    const format = new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" });
    cursor.setMinutes(0, 0, 0); cursor.setHours(Math.floor(cursor.getHours() / 6) * 6);
    for (let i = 0; i < 12 && cursor.getTime() <= end; i++) { push(format); cursor.setHours(cursor.getHours() + 6); }
  } else if (span <= 45 * DAY) {
    const weekly = span > 10 * DAY;
    const format = new Intl.DateTimeFormat(language, weekly ? { day: "numeric", month: "short" } : { weekday: "short" });
    cursor.setHours(0, 0, 0, 0);
    for (let i = 0; i < 60 && cursor.getTime() <= end; i++) { push(format); cursor.setDate(cursor.getDate() + (weekly ? 7 : 1)); }
  } else {
    const format = new Intl.DateTimeFormat(language, { month: "short" });
    cursor.setHours(0, 0, 0, 0); cursor.setDate(1);
    for (let i = 0; i < 24 && cursor.getTime() <= end; i++) { push(format); cursor.setMonth(cursor.getMonth() + 2); }
  }
  return ticks;
}

export interface DryingEstimate {
  // Percentage points lost per day, positive.
  ratePerDay: number;
  // The drop is measured from a logged watering rather than from a detected rise.
  sinceWatering: boolean;
  // Days until the minimum at the current rate; null without a minimum or when it is far off.
  daysToMin: number | null;
}

const RISE = 5;
const MIN_WINDOW = 12 * HOUR;
const MIN_RATE = 0.2;
const MAX_FORECAST_DAYS = 60;

// How fast soil moisture falls since it last went up. The drop starts at the
// peak after the latest watering or the latest clear rise, needs at least
// twelve hours of readings and is the slope of a straight line through them.
// Daily statistics blur a watering into its day, so they give no estimate.
export function dryingEstimate(points: readonly HistoryPoint[], options: { periodMs: number; wateredAt?: number | null; min?: number | null }): DryingEstimate | null {
  const { periodMs, wateredAt = null, min = null } = options;
  if (periodMs > HOUR || points.length < 3) return null;
  const window = Math.max(6 * HOUR, periodMs * 1.5);
  // Index where the latest rise began; the points after it stay above the old level for a while.
  let rise = 0; let earliest = 0; let rising = false;
  for (let i = 1; i < points.length; i++) {
    while (points[i]!.t - points[earliest]!.t > window) earliest++;
    let floor = points[i]!.mean;
    for (let j = earliest; j < i; j++) floor = Math.min(floor, points[j]!.mean);
    const above = points[i]!.mean - floor >= RISE;
    if (above && !rising) rise = i;
    rising = above;
  }
  const last = points.at(-1)!;
  let start = rise; let sinceWatering = false;
  if (wateredAt !== null && Number.isFinite(wateredAt) && wateredAt <= last.t) {
    const index = points.findIndex(p => p.t >= wateredAt);
    // A rise right after the watering is the watering taking effect.
    if (index >= 0 && (index >= rise || points[rise]!.t - wateredAt <= window)) { start = Math.max(index, rise); sinceWatering = true; }
  }
  // Skip to the peak: the soil keeps soaking for a while after watering.
  for (let i = start + 1; i < points.length && points[i]!.t - points[start]!.t <= window; i++) if (points[i]!.mean >= points[start]!.mean) start = i;
  const fit = points.slice(start);
  if (fit.length < 3 || last.t - fit[0]!.t < MIN_WINDOW) return null;
  const meanT = fit.reduce((sum, p) => sum + p.t, 0) / fit.length;
  const meanV = fit.reduce((sum, p) => sum + p.mean, 0) / fit.length;
  let covariance = 0; let variance = 0;
  for (const p of fit) { covariance += (p.t - meanT) * (p.mean - meanV); variance += (p.t - meanT) ** 2; }
  if (variance === 0) return null;
  const ratePerDay = -(covariance / variance) * DAY;
  if (!(ratePerDay >= MIN_RATE)) return null;
  const days = min !== null && last.mean > min ? (last.mean - min) / ratePerDay : null;
  return { ratePerDay, sinceWatering, daysToMin: days !== null && days <= MAX_FORECAST_DAYS ? days : null };
}

// "Dropping about 5.5% per day since the last watering. At this rate it
// reaches the minimum of 30% in about 4 days."
export function dryingText(l: Localizer, estimate: DryingEstimate, min: number | null | undefined): { rate: string; forecast: string } {
  const rate = formatValue(l, Math.round(estimate.ratePerDay * 10) / 10, "%");
  const days = estimate.daysToMin;
  const limit = min === null || min === undefined ? "" : formatValue(l, min, "%");
  return {
    rate: l.t(estimate.sinceWatering ? "history.rate_since_watering" : "history.rate", { rate }),
    forecast: days === null || !limit ? "" : days < 1 ? l.t("history.forecast_soon", { limit }) : l.tn(Math.round(days), "history.forecast_one", "history.forecast_other", { limit }),
  };
}

const PERIOD_KEYS = { "24h": "history.period_24h", "7d": "history.period_7d", "30d": "history.period_30d", "1y": "history.period_1y" } as const;

// The chart in one sentence for screen readers.
export function historySummary(l: Localizer, roleLabel: string, range: HistoryRange, points: readonly HistoryPoint[], unit: string): string {
  const period = l.t(PERIOD_KEYS[range]);
  const first = points[0]; const last = points.at(-1);
  if (!first || !last) return l.t("history.summary_empty", { role: roleLabel, period });
  const value = (v: number) => formatValue(l, Math.round(v * 10) / 10, unit);
  return l.t("history.summary", {
    role: roleLabel, period, first: value(first.mean), last: value(last.mean),
    low: value(Math.min(...points.map(p => p.min))), high: value(Math.max(...points.map(p => p.max))),
  });
}

// Limits the chart draws for a role: a band between two bounds, or a single line.
export function chartBand(role: ReadingRole, range: TargetRange | null | undefined): { min: number | null; max: number | null; target: number | null } {
  return { min: range?.min ?? null, max: role === "battery" ? null : range?.max ?? null, target: range?.target ?? null };
}
