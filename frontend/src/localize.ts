// Panel localization. Home Assistant does not load translation categories for
// custom panels, so the panel ships its own catalogs and picks one from the
// Home Assistant frontend language. English is the source catalog: its keys
// define MessageKey, other catalogs may leave keys out (they fall back to the
// English text per key) but must not add keys of their own, and any language
// without a catalog falls back to English. The one exception is plural forms:
// a catalog may add `_zero`, `_two`, `_few` and `_many` variants of any English
// `_other` key for languages whose plural rules need them.
import { de } from "./translations/de.js";
import { en } from "./translations/en.js";

export type MessageKey = keyof typeof en;
export type Catalog = Record<MessageKey, string>;
export type MessageArgs = Record<string, string | number>;

// The CLDR plural categories Intl.PluralRules can return.
export const PLURAL_CATEGORIES = ["zero", "one", "two", "few", "many", "other"] as const;
export type PluralCategory = typeof PLURAL_CATEGORIES[number];
type PluralBase<K> = K extends `${infer Base}_other` ? Base : never;
// Plural variants a catalog may define next to the English keys.
export type PluralKey = `${PluralBase<MessageKey>}_${PluralCategory}`;
export type LanguageCatalog = Partial<Record<MessageKey | PluralKey, string>>;
// Catalog set passed to createLocalizer: English plus any number of languages.
export type Catalogs = Readonly<Record<string, LanguageCatalog>> & { readonly en: Partial<Catalog> };

export const LANGUAGES = ["en", "de"] as const;
export type Language = typeof LANGUAGES[number];
const CATALOGS: Catalogs = { en, de };

// Subset of the Home Assistant frontend `hass.locale` object the panel reads.
export interface HALocale {
  language?: string;
  number_format?: string;
  time_format?: string;
  date_format?: string;
}
export interface LocaleSource { language?: string; locale?: HALocale }

export interface Localizer {
  // The catalog language in use, also used as the locale for Intl formatters.
  readonly language: string;
  // Translate a key, replacing `{name}` placeholders. Numeric arguments are
  // formatted with the Home Assistant number format.
  t(key: MessageKey, args?: MessageArgs): string;
  // Pick the plural form for `count` and pass it as `{count}`. With keys named
  // `<base>_one` and `<base>_other`, the CLDR category of the active language
  // (zero, one, two, few, many, other) selects `<base>_<category>`; a missing
  // form falls back to `<base>_other`, and a key missing from the catalog falls
  // back to the English form for `count`.
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
export function panelLanguage(source?: LocaleSource | null): Language;
export function panelLanguage(source: LocaleSource | null | undefined, available: readonly string[]): string;
export function panelLanguage(source?: LocaleSource | null, available: readonly string[] = LANGUAGES): string {
  const raw = source?.locale?.language || source?.language || "en";
  const base = raw.toLowerCase().split(/[-_]/)[0] ?? "en";
  return available.includes(base) ? base : "en";
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

export function createLocalizer(source?: LocaleSource | null, catalogs: Catalogs = CATALOGS): Localizer {
  const language = panelLanguage(source, Object.keys(catalogs));
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
  const catalog: LanguageCatalog = catalogs[language] ?? catalogs.en;
  const english: LanguageCatalog = catalogs.en;
  const t = (key: MessageKey, args?: MessageArgs): string => interpolate(catalog[key] ?? english[key] ?? key, args, value => number(value));
  const plural = new Intl.PluralRules(language);
  const englishPlural = new Intl.PluralRules("en");
  const tn = (count: number, one: MessageKey, other: MessageKey, args?: MessageArgs): string => {
    const all = { ...args, count };
    const category = plural.select(count);
    const base = other.endsWith("_other") ? other.slice(0, -"_other".length) : null;
    // Keys outside the `<base>_one` / `<base>_other` pattern only know two forms.
    const named = base !== null && one === `${base}_one`;
    const own = named ? catalog[`${base}_${category}` as PluralKey] : catalog[category === "one" ? one : other];
    const text = own ?? catalog[other];
    if (text !== undefined) return interpolate(text, all, value => number(value));
    return t(englishPlural.select(count) === "one" ? one : other, all);
  };
  const dateFormat = new Intl.DateTimeFormat(dateLocales, { dateStyle: "medium", timeZone: "UTC" });
  const timeOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const h12 = hour12(locale);
  if (h12 !== undefined) timeOptions.hour12 = h12;
  const recordedFormat = new Intl.DateTimeFormat(dateLocales, { ...timeOptions, year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  const absoluteFormat = new Intl.DateTimeFormat(dateLocales, { ...timeOptions, year: "numeric", month: "short", day: "numeric" });

  const localizer: Localizer = {
    language,
    t,
    tn,
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
