// Panel localization. Home Assistant does not load translation categories for
// custom panels, so the panel ships its own catalogs and picks one from the
// Home Assistant frontend language. English is the source catalog: its keys
// define MessageKey, every other catalog must provide exactly those keys, and
// any language without a catalog falls back to English.
import { en } from "./translations/en.js";

export type MessageKey = keyof typeof en;
export type Catalog = Record<MessageKey, string>;
export type MessageArgs = Record<string, string | number>;

export const LANGUAGES = ["en"] as const;
export type Language = typeof LANGUAGES[number];
const CATALOGS: Record<Language, Partial<Catalog>> = { en };

// Subset of the Home Assistant frontend `hass.locale` object the panel reads.
export interface HALocale {
  language?: string;
  number_format?: string;
  time_format?: string;
  date_format?: string;
}
export interface LocaleSource { language?: string; locale?: HALocale }

export interface Localizer {
  readonly language: Language;
  // Translate a key, replacing `{name}` placeholders. Numeric arguments are
  // formatted with the Home Assistant number format.
  t(key: MessageKey, args?: MessageArgs): string;
  // Pick the singular or plural key for `count` and pass it as `{count}`.
  tn(count: number, one: MessageKey, other: MessageKey, args?: MessageArgs): string;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  percent(value: number): string;
  // Format a calendar date given as YYYY-MM-DD without shifting time zones.
  date(isoDate: string): string;
  // Format the wall-clock date and time recorded in an ISO timestamp with its
  // own UTC offset, independently of the viewer's time zone.
  recordedDateTime(isoTimestamp: string): string;
  // Format an absolute ISO timestamp in the viewer's time zone.
  dateTime(isoTimestamp: string): string;
}

export function isMessageKey(key: string): key is MessageKey {
  return Object.hasOwn(en, key);
}

// Map a Home Assistant or BCP 47 language tag ("de", "de-CH", "de_AT") to a
// supported catalog, falling back to English.
export function panelLanguage(source?: LocaleSource | null): Language {
  const raw = source?.locale?.language || source?.language || "en";
  const base = raw.toLowerCase().split(/[-_]/)[0] ?? "en";
  return (LANGUAGES as readonly string[]).includes(base) ? base as Language : "en";
}

// A syntactically valid BCP 47 tag for Intl, or undefined for the browser default.
function intlTag(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const tag = raw.replaceAll("_", "-");
  try { return Intl.getCanonicalLocales(tag)[0]; } catch { return undefined; }
}

// Mirrors the Home Assistant frontend's number_format profile setting.
function numberLocales(locale: HALocale | undefined, fallback: string | undefined): { locales: string[] | undefined; grouping: boolean } {
  switch (locale?.number_format) {
    case "system": return { locales: undefined, grouping: true };
    case "comma_decimal": return { locales: ["en-US", "en"], grouping: true };
    case "decimal_comma": return { locales: ["de", "es", "it"], grouping: true };
    case "space_comma": return { locales: ["fr", "sv", "cs"], grouping: true };
    case "none": return { locales: fallback ? [fallback] : undefined, grouping: false };
    default: return { locales: fallback ? [fallback] : undefined, grouping: true };
  }
}

function hour12(locale: HALocale | undefined): boolean | undefined {
  if (locale?.time_format === "12") return true;
  if (locale?.time_format === "24") return false;
  return undefined;
}

function interpolate(template: string, args: MessageArgs | undefined, number: (value: number) => string): string {
  if (!args) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!Object.hasOwn(args, name)) return match;
    const value = args[name]!;
    return typeof value === "number" ? number(value) : value;
  });
}

const cache = new Map<string, Localizer>();

export function createLocalizer(source?: LocaleSource | null, catalogs: Record<Language, Partial<Catalog>> = CATALOGS): Localizer {
  const language = panelLanguage(source);
  const locale = source?.locale;
  const cacheKey = catalogs === CATALOGS ? JSON.stringify([language, source?.language, locale?.language, locale?.number_format, locale?.time_format, locale?.date_format]) : null;
  const cached = cacheKey ? cache.get(cacheKey) : undefined;
  if (cached) return cached;

  const tag = intlTag(locale?.language || source?.language) ?? language;
  const { locales, grouping } = numberLocales(locale, tag);
  // Four-digit values stay ungrouped ("5000 ppm"); larger ones group per locale.
  const useGrouping = (grouping ? "min2" : false) as unknown as boolean;
  const dateLocales = locale?.date_format === "system" ? undefined : [tag];
  const numberFormats = new Map<string, Intl.NumberFormat>();
  const number = (value: number, options: Intl.NumberFormatOptions = {}): string => {
    const key = JSON.stringify(options);
    let format = numberFormats.get(key);
    if (!format) { format = new Intl.NumberFormat(locales, { maximumFractionDigits: 2, useGrouping, ...options }); numberFormats.set(key, format); }
    return format.format(value);
  };
  const catalog = catalogs[language];
  const t = (key: MessageKey, args?: MessageArgs): string => interpolate(catalog[key] ?? catalogs.en[key] ?? key, args, value => number(value));
  const plural = new Intl.PluralRules(language);
  const dateFormat = new Intl.DateTimeFormat(dateLocales, { dateStyle: "medium", timeZone: "UTC" });
  const timeOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const h12 = hour12(locale);
  if (h12 !== undefined) timeOptions.hour12 = h12;
  const recordedFormat = new Intl.DateTimeFormat(dateLocales, { ...timeOptions, year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  const absoluteFormat = new Intl.DateTimeFormat(dateLocales, { ...timeOptions, year: "numeric", month: "short", day: "numeric" });

  const localizer: Localizer = {
    language,
    t,
    tn: (count, one, other, args) => t(plural.select(count) === "one" ? one : other, { ...args, count }),
    number,
    percent: value => t("format.percent", { value }),
    date: isoDate => {
      const match = /^(\d{4})-(\d\d)-(\d\d)$/.exec(isoDate);
      return match ? dateFormat.format(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : isoDate;
    },
    recordedDateTime: isoTimestamp => {
      const match = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::\d\d(?:\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.exec(isoTimestamp);
      if (!match) return isoTimestamp;
      const wallClock = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
      return t("format.recorded_date_time", { datetime: recordedFormat.format(wallClock), offset: match[6] === "Z" ? "+00:00" : match[6]! });
    },
    dateTime: isoTimestamp => {
      const parsed = Date.parse(isoTimestamp);
      return Number.isFinite(parsed) ? absoluteFormat.format(parsed) : isoTimestamp;
    },
  };
  if (cacheKey) cache.set(cacheKey, localizer);
  return localizer;
}

// English localizer for model helpers called without a Home Assistant context.
export const ENGLISH: Localizer = createLocalizer();
