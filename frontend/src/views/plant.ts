// Presentation helpers for the plant page. The panel owns the plant's state,
// drafts and mutations; these functions only turn data into text and markup.
import { css, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import type { Localizer, MessageKey } from "../localize.js";
import { problemReason } from "../overview-model.js";
import type { PlantOverview, RoleReading } from "../overview-model.js";
import { ROLE_META, formatRange, formatValue, readingLabel, relativeTime } from "../status.js";
import type { ReadingRole } from "../status.js";
import type { CareEvent, HAState } from "../types.js";

export type DetailSection = "overview" | "sensors" | "care" | "settings";
export const DETAIL_SECTIONS: readonly DetailSection[] = ["overview", "sensors", "care", "settings"];
export const SECTION_LABELS: Record<DetailSection, MessageKey> = {
  overview: "detail.tab_overview",
  sensors: "detail.tab_sensors",
  care: "detail.tab_care",
  settings: "detail.tab_settings",
};

export const CARE_KINDS: readonly CareEvent["kind"][] = ["watering", "fertilizing", "pruning", "repotting", "note"];
export const CARE_ICONS: Record<CareEvent["kind"], string> = {
  watering: "mdi:water",
  fertilizing: "mdi:flask-outline",
  pruning: "mdi:content-cut",
  repotting: "mdi:shovel",
  note: "mdi:note-text-outline",
};

// The sensor's name as Home Assistant shows it, never its entity ID.
export function friendlyName(l: Localizer, states: Record<string, HAState>, entityId: string): string {
  const state = states[entityId];
  const name = state?.attributes.friendly_name;
  if (typeof name === "string" && name.trim()) return name;
  if (!state) return l.t("sensor.missing");
  const objectId = entityId.split(".").slice(1).join(".").replaceAll("_", " ");
  return objectId ? objectId.charAt(0).toLocaleUpperCase() + objectId.slice(1) : entityId;
}

// A reading's name inside a sentence: "Change light sensors". German keeps
// the capital noun.
export function readingPhrase(l: Localizer, role: ReadingRole): string {
  const label = readingLabel(l, role);
  if (l.language !== "en" || /^.[A-Z₀-₉]/.test(label)) return label;
  return label.charAt(0).toLocaleLowerCase() + label.slice(1);
}

// Every role with a reading, soil moisture first.
export function readingsInOrder(overview: PlantOverview | undefined): [ReadingRole, RoleReading][] {
  if (!overview) return [];
  return (Object.keys(ROLE_META) as ReadingRole[]).filter(role => overview.roles[role]).map(role => [role, overview.roles[role]!]);
}

// Colour family of a reading: soil moisture follows the watering statuses,
// other roles use the problem colour when outside their target.
export function readingTone(role: ReadingRole, reading: RoleReading): "water" | "wet" | "bad" | "off" | "ok" {
  if (reading.state === "stale" || reading.state === "unavailable") return "off";
  if (reading.state === "low") return role === "moisture" ? "water" : "bad";
  if (reading.state === "high") return role === "moisture" ? "wet" : "bad";
  return "ok";
}

export function readingStateText(l: Localizer, reading: RoleReading, now?: number): string {
  switch (reading.state) {
    case "ok": return l.t("reading_state.ok");
    case "low": return l.t("reading_state.low");
    case "high": return l.t("reading_state.high");
    case "stale": return reading.last_reported ? l.t("reading_state.stale", { age: relativeTime(l, reading.last_reported, now) }) : l.t("reading_state.stale_no_age");
    case "unavailable": return l.t("reading_state.unavailable");
  }
}

function readingValue(l: Localizer, reading: RoleReading): string {
  return reading.value === null ? "—" : formatValue(l, reading.value, reading.unit);
}

// The status sentence under the chip: every current issue, or a plain
// statement when there is nothing to report.
export function headerReason(l: Localizer, overview: PlantOverview, now?: number): string {
  if (overview.status === "paused") return l.t("detail.reason_paused");
  if (overview.status === "healthy" || !overview.problems.length) return l.t("detail.reason_healthy");
  return overview.problems.map(problem => problemReason(l, overview, problem, now)).join(" · ");
}

// Up to four readings under the header.
export function renderKeyReadings(l: Localizer, overview: PlantOverview | undefined, now?: number) {
  const readings = readingsInOrder(overview).slice(0, 4);
  if (!readings.length) return nothing;
  return html`<ul class="keyreads" aria-label=${l.t("detail.key_readings")}>${readings.map(([role, reading]) => {
    const tone = readingTone(role, reading);
    const range = formatRange(l, role, reading.range, reading.unit);
    const detail = reading.state === "stale" && reading.last_reported ? l.t("moisture_bar.last_update", { age: relativeTime(l, reading.last_reported, now) }) : range;
    const outside = tone === "water" || tone === "wet" || tone === "bad";
    return html`<li class="kr"><span class="kr-label"><ha-icon aria-hidden="true" .icon=${ROLE_META[role].icon}></ha-icon>${readingLabel(l, role)}</span>
      <span class="kr-value tone-${tone}">${readingValue(l, reading)}${outside ? html`<span class="sr-only">, ${readingStateText(l, reading, now)}</span>` : nothing}</span>
      ${detail ? html`<span class="kr-range">${detail}</span>` : nothing}</li>`;
  })}</ul>`;
}

// One row of the Readings list: role, the sensors behind it, its state, value and target.
export function renderReadingRow(l: Localizer, role: ReadingRole, reading: RoleReading, states: Record<string, HAState>, now?: number) {
  const tone = readingTone(role, reading);
  const names = reading.sources.map(id => friendlyName(l, states, id)).join(", ");
  const range = formatRange(l, role, reading.range, reading.unit);
  return html`<li class="li"><span class="ic tone-${tone}" aria-hidden="true"><ha-icon .icon=${ROLE_META[role].icon}></ha-icon></span>
    <span class="li-main"><span class="li-title">${readingLabel(l, role)}</span>
      <span class="li-sub">${names ? html`${names} · ` : nothing}<span class="state tone-${tone}">${readingStateText(l, reading, now)}</span></span></span>
    <span class="li-end"><span class="li-value">${readingValue(l, reading)}</span>${range ? html`<span class="li-sub">${range}</span>` : nothing}</span></li>`;
}

// "6 h", "30 min" or "90 s" for the not-updating window.
export function formatDuration(l: Localizer, seconds: number): string {
  if (seconds >= 3600 && seconds % 3600 === 0) return l.t("duration.hours", { count: seconds / 3600 });
  if (seconds >= 60 && seconds % 60 === 0) return l.t("duration.minutes", { count: seconds / 60 });
  return l.t("duration.seconds", { count: seconds });
}

// Care payload details as short "Label: value" parts, without empty fields.
export function careDetails(l: Localizer, event: CareEvent, fieldLabel: (key: string) => string): string[] {
  return Object.entries(event.payload)
    .filter(([, value]) => value !== null && value !== "")
    .map(([key, value]) => `${fieldLabel(key)}: ${typeof value === "number" && key === "amount" ? l.number(value) : String(value)}`);
}

// Expandable section: Home Assistant's expansion panel when it is available,
// a native disclosure otherwise.
export function expander(options: { key: string; icon: string; header: string; secondary: string; open: boolean; native: boolean; toggle: (open: boolean) => void; content: () => TemplateResult | typeof nothing }) {
  const { key, icon, header, secondary, open, native, toggle, content } = options;
  if (native) {
    return html`<ha-expansion-panel class="expander" data-section=${key} outlined .header=${header} .secondary=${secondary} .expanded=${open}
      @expanded-changed=${(e: CustomEvent<{ expanded: boolean }>) => { if (e.target === e.currentTarget) toggle(e.detail.expanded); }}>
      <ha-icon slot="leading-icon" aria-hidden="true" .icon=${icon}></ha-icon>
      ${open ? html`<div class="expander-body">${content()}</div>` : nothing}</ha-expansion-panel>`;
  }
  return html`<details class="expander" data-section=${key} ?open=${open} @toggle=${(e: Event) => { const now = (e.currentTarget as HTMLDetailsElement).open; if (now !== open) toggle(now); }}>
    <summary><ha-icon aria-hidden="true" .icon=${icon}></ha-icon><span class="summary-text"><span class="summary-title">${header}</span><span class="summary-sub">${secondary}</span></span></summary>
    <div class="expander-body">${content()}</div></details>`;
}

export const plantStyles = css`
  .pd { container: plant / inline-size; display: flex; flex-direction: column; gap: 16px; padding-bottom: 32px; --sp-primary-strong: color-mix(in srgb, var(--sp-primary) 78%, #000); }
  .pd .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  .pd ha-icon { --mdc-icon-size: 20px; flex: none; }
  .pd h2, .pd h3 { margin: 0; line-height: 1.25; }
  .pd p { margin: 0; }
  .pd ul { list-style: none; margin: 0; padding: 0; }
  .pd li { margin: 0; }
  .pd dl { margin: 0; }

  .sp-card { background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--ha-card-border-color, var(--divider-color, #e0e0e0)); border-radius: var(--ha-card-border-radius, 12px); min-width: 0; }
  .pd section.sp-card, .pd div.sp-card { padding: 0; margin: 0; }
  .pd .spacer { flex: 1; }
  .pd .error-text { color: var(--sp-error); }
  .pd code { font-size: 12.5px; overflow-wrap: anywhere; }
  .card-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 16px 4px; min-height: 52px; }
  .card-h h2, .card-h h3 { font-size: 16px; font-weight: 500; }
  .card-b { padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 12px; }
  .muted, .pd small { color: var(--sp-text-secondary); }
  .small { font-size: 13px; }

  .pd button.btn, .pd a.btn, .pd label.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; height: auto; padding: 6px 18px; border-radius: 20px; border: 0; font: inherit; font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none; white-space: nowrap; background: transparent; color: inherit; max-width: 100%; margin: 0; }
  .pd .btn ha-icon { --mdc-icon-size: 18px; }
  .pd .btn.filled { background: var(--sp-primary-strong); color: var(--text-primary-color, #fff); }
  .pd .btn.outline { border: 1px solid var(--divider-color, #bdbdbd); color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); }
  .pd .btn.tonal { background: color-mix(in srgb, var(--sp-primary) 14%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
  .pd .btn.text { color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); padding: 6px 12px; }
  .pd .btn.danger { border: 1px solid color-mix(in srgb, var(--sp-error) 60%, transparent); color: color-mix(in srgb, var(--sp-error) 60%, var(--sp-text)); }
  .pd .btn.sm { min-height: 36px; padding: 4px 14px; font-size: 13px; }
  .pd .btn:hover:not(:disabled) { box-shadow: inset 0 0 0 100px color-mix(in srgb, currentColor 8%, transparent); }
  .pd .btn.filled:hover:not(:disabled) { box-shadow: none; background: color-mix(in srgb, var(--sp-primary) 70%, #000); }
  .pd .btn:disabled { opacity: .55; cursor: default; background: transparent; }
  .pd .btn.filled:disabled { background: var(--sp-primary-strong); }
  .pd label.btn:focus-within { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
  .pd .file-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; min-height: 0; padding: 0; border: 0; }
  .pd button.icon-btn { display: inline-grid; place-items: center; width: 40px; height: 40px; min-height: 40px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--sp-text-secondary); cursor: pointer; flex: none; }
  .pd button.icon-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--sp-text) 8%, transparent); }

  /* Header */
  .hero { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 20px; align-items: start; padding: 20px; }
  .hero-name { font-size: 26px; font-weight: 400; line-height: 1.2; overflow-wrap: anywhere; hyphens: auto; }
  .hero-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 4px; color: var(--sp-text-secondary); font-size: 13.5px; }
  .hero-meta span { display: inline-flex; align-items: center; gap: 4px; }
  .hero-meta ha-icon { --mdc-icon-size: 17px; }
  .hero-status { margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
  .reason { font-size: 13.5px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
  .hero-actions { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
  .keyreads { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); border-top: 1px solid var(--divider-color, #e0e0e0); }
  .kr { display: flex; flex-direction: column; padding: 12px 20px; border-inline-end: 1px solid var(--divider-color, #e0e0e0); min-width: 0; }
  .kr:last-child { border-inline-end: 0; }
  .kr-label { display: flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--sp-text-secondary); }
  .kr-label ha-icon { --mdc-icon-size: 16px; }
  .kr-value { font-size: 20px; font-weight: 500; font-variant-numeric: tabular-nums; }
  .kr-range { font-size: 12px; color: var(--sp-text-secondary); }

  .tone-water { color: color-mix(in srgb, var(--sp-warning) 50%, var(--sp-text)); }
  .tone-wet { color: color-mix(in srgb, var(--sp-info) 50%, var(--sp-text)); }
  .tone-bad { color: color-mix(in srgb, var(--sp-error) 55%, var(--sp-text)); }
  .tone-ok.state { color: color-mix(in srgb, var(--sp-success) 55%, var(--sp-text)); }
  .tone-off.state { color: var(--sp-text-secondary); }

  /* Tabs */
  ha-tab-group { display: block; --ha-tab-track-color: var(--divider-color, #e0e0e0); }
  .tablist { display: flex; gap: 4px; border-bottom: 1px solid var(--divider-color, #e0e0e0); overflow-x: auto; scrollbar-width: none; }
  .tablist button[role="tab"] { border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; min-height: 48px; padding: 0 16px; font: inherit; font-weight: 500; color: var(--sp-text-secondary); cursor: pointer; white-space: nowrap; }
  .tablist button[role="tab"][aria-selected="true"] { color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); border-bottom-color: var(--sp-primary); }
  .tabpanel { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .tabpanel:focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 4px; }

  /* Lists */
  .cols { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 16px; align-items: start; }
  .stack { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .list { display: flex; flex-direction: column; }
  .li { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 16px; min-height: 60px; }
  .li + .li { border-top: 1px solid var(--divider-color, #e0e0e0); }
  .ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--sp-text) 7%, transparent); color: var(--sp-text-secondary); }
  .ic.tone-water { background: color-mix(in srgb, var(--sp-warning) 18%, transparent); }
  .ic.tone-wet { background: color-mix(in srgb, var(--sp-info) 16%, transparent); }
  .ic.tone-bad { background: color-mix(in srgb, var(--sp-error) 15%, transparent); }
  .ic.tone-ok { background: color-mix(in srgb, var(--sp-success) 15%, transparent); color: color-mix(in srgb, var(--sp-success) 55%, var(--sp-text)); }
  .ic.tonal { background: color-mix(in srgb, var(--sp-primary) 12%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
  .li-main { display: flex; flex-direction: column; min-width: 0; }
  .li-title { font-size: 15px; overflow-wrap: anywhere; }
  .li-sub { font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
  .li-end { display: flex; flex-direction: column; align-items: flex-end; text-align: end; font-variant-numeric: tabular-nums; }
  .li-end .li-sub { font-size: 12px; }
  .li-value { font-size: 16px; font-weight: 500; white-space: nowrap; }
  .li-actions { display: flex; align-items: center; gap: 4px; }
  .empty-box { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 12px; border: 1px dashed var(--divider-color, #e0e0e0); border-radius: 8px; font-size: 13px; color: var(--sp-text-secondary); }
  .kv { display: grid; grid-template-columns: minmax(90px, 130px) minmax(0, 1fr); gap: 10px 12px; font-size: 14px; }
  .kv dt { color: var(--sp-text-secondary); }
  .kv dd { margin: 0; overflow-wrap: anywhere; }
  .kv .btn.text { padding: 0; min-height: 0; }
  dl.sensors, dl.other-targets { display: grid; grid-template-columns: minmax(110px, 180px) minmax(0, 1fr); gap: 12px 16px; align-items: baseline; }
  dl.sensors dt, dl.other-targets dt { color: var(--sp-text-secondary); }
  dl.sensors dd, dl.other-targets dd { margin: 0; }
  dl.sensors .editor, dl.other-targets .threshold-editor { margin-top: 8px; }
  .tag { display: inline-flex; align-items: center; min-height: 24px; padding: 0 10px; margin: 0 4px 4px 0; border-radius: 12px; background: color-mix(in srgb, var(--sp-text) 7%, transparent); font-size: 12.5px; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

  /* Expanders */
  .expander { display: block; border-radius: var(--ha-card-border-radius, 12px); background: var(--ha-card-background, var(--sp-card)); --expansion-panel-summary-padding: 4px 16px; --expansion-panel-content-padding: 0 16px 16px; }
  details.expander { border: 1px solid var(--divider-color, #e0e0e0); }
  details.expander > summary { display: flex; align-items: center; gap: 14px; padding: 12px 16px; cursor: pointer; min-height: 56px; }
  details.expander > summary::marker { content: ""; }
  .summary-text { display: flex; flex-direction: column; min-width: 0; }
  .summary-title { font-weight: 500; }
  .summary-sub { font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
  details.expander > .expander-body { padding: 0 16px 16px; }
  .expander-body { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .expander-body section { border: 0; padding: 0; margin: 0; background: transparent; border-radius: 0; }
  .expander-body section + section { border-top: 1px solid var(--divider-color, #e0e0e0); padding-top: 16px; }
  .expander-body h3 { font-size: 15px; font-weight: 500; margin: 0 0 8px; }

  /* Settings */
  .setrow { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 16px; align-items: center; padding: 14px 16px; }
  .setrow + .setrow { border-top: 1px solid var(--divider-color, #e0e0e0); }
  .setrow-h { font-size: 15px; }
  .setrow-d { font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
  .setrow-editor { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .setrow-editor label { margin: 4px 0; }
  .setrow-editor .actions, .card-b .actions { margin-top: 4px; }
  .thr { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .thr label { margin: 0; }
  .field-suffix { display: flex; align-items: center; gap: 6px; }
  .field-suffix input { flex: 1; min-width: 0; }

  /* Care */
  .care-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .care-bar .spacer { flex: 1; }
  .pd button.fchip { min-height: 32px; height: auto; padding: 4px 12px; border-radius: 8px; border: 1px solid var(--divider-color, #bdbdbd); background: var(--ha-card-background, var(--sp-card)); font-size: 13px; color: var(--sp-text); cursor: pointer; }
  .pd button.fchip[aria-pressed="true"] { background: color-mix(in srgb, var(--sp-primary) 14%, transparent); border-color: transparent; color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); font-weight: 500; }
  .care-form label { margin: 8px 0; }

  ha-alert { display: block; }
  .alert-fallback { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 8px; background: color-mix(in srgb, var(--sp-warning) 14%, transparent); }
  .alert-title { font-weight: 500; }

  @container plant (max-width: 700px) {
    .hero { grid-template-columns: auto minmax(0, 1fr); gap: 14px; padding: 14px; }
    .hero-name { font-size: 21px; }
    .hero-actions { grid-column: 1 / -1; flex-direction: row; }
    .hero-actions .btn { flex: 1; }
    .keyreads { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .kr { padding: 10px 14px; }
    .kr:nth-child(2n) { border-inline-end: 0; }
    .kr:nth-child(n+3) { border-top: 1px solid var(--divider-color, #e0e0e0); }
    .cols { grid-template-columns: minmax(0, 1fr); }
    .setrow { grid-template-columns: minmax(0, 1fr); }
    .setrow > .btn, .setrow > .row { justify-self: start; margin-inline-start: -12px; }
    .thr { grid-template-columns: minmax(0, 1fr); }
    .li { padding: 10px 12px; gap: 10px; }
    .kv { grid-template-columns: minmax(0, 1fr); gap: 2px 0; }
    .kv dd { margin-bottom: 8px; }
    dl.sensors, dl.other-targets { grid-template-columns: minmax(0, 1fr); gap: 2px 0; }
    dl.sensors dd, dl.other-targets dd { margin-bottom: 10px; }
  }
`;
