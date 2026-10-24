// Snoozing a plant's alerts: the dialog's choices, the end time sent to the
// backend and the chip text. A snooze always ends at the end of a local day in
// Home Assistant's time zone, so "1 day" means "until the end of tomorrow".
import type { Localizer, MessageKey } from "./localize.js";

export type SnoozeChoice = "1" | "3" | "7" | "14" | "date";
export const SNOOZE_PRESETS: readonly { choice: Exclude<SnoozeChoice, "date">; days: number; label: MessageKey }[] = [
  { choice: "1", days: 1, label: "snooze.preset_1" },
  { choice: "3", days: 3, label: "snooze.preset_3" },
  { choice: "7", days: 7, label: "snooze.preset_7" },
  { choice: "14", days: 14, label: "snooze.preset_14" },
];
// The backend accepts an end at most 366 days ahead; the last day offered is a year from today.
export const SNOOZE_MAX_DAYS = 365;

const DATE = /^(\d{4})-(\d\d)-(\d\d)$/;

// "YYYY-MM-DD" plus a number of days, on the calendar.
export function addDays(isoDate: string, days: number): string {
  const match = DATE.exec(isoDate);
  if (!match) return isoDate;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days)).toISOString().slice(0, 10);
}

function zoneParts(time: number, timeZone: string | undefined): Record<string, number> {
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" };
  let format: Intl.DateTimeFormat;
  try { format = new Intl.DateTimeFormat("en-CA", { ...options, ...(timeZone ? { timeZone } : {}) }); }
  catch { format = new Intl.DateTimeFormat("en-CA", options); }
  return Object.fromEntries(format.formatToParts(time).filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
}

// Minutes the time zone is ahead of UTC at a moment.
function zoneOffset(time: number, timeZone: string | undefined): number {
  const p = zoneParts(time, timeZone);
  const wall = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour! % 24, p.minute!, p.second!);
  return Math.round((wall - Math.floor(time / 1000) * 1000) / 60000);
}

// The last second of a local day as an ISO timestamp with the zone's offset,
// for example "2026-10-30T23:59:59+01:00".
export function endOfLocalDay(isoDate: string, timeZone: string | undefined): string | null {
  const match = DATE.exec(isoDate);
  if (!match) return null;
  const wall = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59);
  // The offset at that wall time; checked twice in case a clock change lies in between.
  let offset = zoneOffset(wall, timeZone);
  offset = zoneOffset(wall - offset * 60000, timeZone);
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return `${isoDate}T23:59:59${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

// The end sent for a choice: N days after today, or the picked date.
export function snoozeUntil(choice: SnoozeChoice, today: string, pickedDate: string, timeZone: string | undefined): string | null {
  const preset = SNOOZE_PRESETS.find(p => p.choice === choice);
  if (preset) return endOfLocalDay(addDays(today, preset.days), timeZone);
  return validSnoozeDate(pickedDate, today) ? endOfLocalDay(pickedDate, timeZone) : null;
}

// Days the date picker offers: tomorrow up to a year from today.
export function snoozeDateRange(today: string): { min: string; max: string } {
  return { min: addDays(today, 1), max: addDays(today, SNOOZE_MAX_DAYS) };
}

export function validSnoozeDate(pickedDate: string, today: string): boolean {
  if (!DATE.test(pickedDate) || addDays(pickedDate, 0) !== pickedDate) return false;
  const { min, max } = snoozeDateRange(today);
  return pickedDate >= min && pickedDate <= max;
}

// The snooze end while it is still ahead; an end in the past counts as no snooze.
export function activeSnooze(snoozedUntil: string | null | undefined, now = Date.now()): string | null {
  if (!snoozedUntil) return null;
  const end = Date.parse(snoozedUntil);
  return Number.isFinite(end) && end > now ? snoozedUntil : null;
}

// The local date a snooze ends on. A snooze ending at the very start of a day
// (an end set by an automation, for example) still reads as the day before.
export function snoozeEndDate(snoozedUntil: string, timeZone: string | undefined): string | null {
  const end = Date.parse(snoozedUntil);
  if (!Number.isFinite(end)) return null;
  const p = zoneParts(end - 1000, timeZone);
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// "Fri, Oct 30"; the year is added when the snooze ends in another year.
export function snoozeDateText(l: Localizer, isoDate: string, today: string): string {
  const match = DATE.exec(isoDate);
  if (!match) return isoDate;
  const sameYear = isoDate.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat(l.language, { weekday: "short", month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" })
    .format(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

// Chip text for a snoozed plant, or null when it is not snoozed. The date is
// joined with no-break spaces so a narrow chip wraps before it, not inside it.
export function snoozeChipText(l: Localizer, snoozedUntil: string | null | undefined, today: string, timeZone: string | undefined, now = Date.now()): string | null {
  const active = activeSnooze(snoozedUntil, now);
  const date = active ? snoozeEndDate(active, timeZone) : null;
  return date ? l.t("snooze.chip", { date: snoozeDateText(l, date, today).replace(/\s/g, "\u00a0") }) : null;
}
