import { LitElement, css, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { ENGLISH } from "../localize.js";
import type { Localizer } from "../localize.js";
import { ROLE_META, formatRange, formatValue, readingLabel, relativeTime } from "../status.js";
import type { ReadingState, TargetRange } from "../status.js";
import { themeFallbacks } from "./shared-styles.js";

const clamp = (value: number) => Math.min(100, Math.max(0, value));

// Soil moisture on a 0–100 % track with the target band, the target tick and
// the current value. Greyed out with the age of the last reading when stale.
export class SpMoistureBar extends LitElement {
  static styles = [themeFallbacks, css`
    :host { display: block; font-size: 13px; color: var(--sp-text); }
    .top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .name { display: inline-flex; align-items: center; gap: 4px; color: var(--sp-text-secondary); }
    .name ha-icon { --mdc-icon-size: 16px; }
    .value { font-size: 18px; font-weight: 500; font-variant-numeric: tabular-nums; }
    .value.low { color: color-mix(in srgb, var(--sp-warning) 50%, var(--sp-text)); }
    .value.high { color: color-mix(in srgb, var(--sp-info) 50%, var(--sp-text)); }
    .value.stale, .value.unavailable { color: var(--sp-text-secondary); }
    .track { position: relative; height: 8px; margin-top: 6px; border-radius: 4px; background: color-mix(in srgb, var(--sp-text) 8%, transparent); }
    .band { position: absolute; top: 0; bottom: 0; border-radius: 4px; background: color-mix(in srgb, var(--sp-success) 30%, transparent); }
    .tick { position: absolute; top: -2px; bottom: -2px; width: 2px; margin-left: -1px; border-radius: 1px; background: color-mix(in srgb, var(--sp-success) 60%, var(--sp-text)); }
    .dot { position: absolute; top: 50%; width: 14px; height: 14px; border-radius: 50%; transform: translate(-50%, -50%); border: 2px solid var(--sp-card); box-shadow: 0 0 0 1px color-mix(in srgb, var(--sp-text) 20%, transparent); background: var(--sp-success); }
    .dot.low { background: var(--sp-warning); }
    .dot.high { background: var(--sp-info); }
    .dot.stale, .dot.unavailable { background: var(--sp-disabled); }
    :host([dimmed]) .band, :host([dimmed]) .tick { opacity: .5; }
    .scale { display: flex; justify-content: space-between; gap: 8px; margin-top: 3px; font-size: 11px; color: var(--sp-text-secondary); font-variant-numeric: tabular-nums; }
    .age { display: flex; align-items: center; gap: 4px; margin-top: 4px; font-size: 12px; color: var(--sp-text-secondary); }
    .age ha-icon { --mdc-icon-size: 15px; }
  `];

  @property({ type: Number }) public value: number | null = null;
  @property({ attribute: false }) public range: TargetRange | null = null;
  @property({ reflect: true }) public state: ReadingState = "ok";
  // ISO timestamp of the last reading, shown when the reading is stale.
  @property({ attribute: false }) public lastReported: string | null = null;
  @property({ attribute: false }) public now: number | undefined = undefined;
  @property({ attribute: false }) public l: Localizer = ENGLISH;

  protected willUpdate(): void {
    this.toggleAttribute("dimmed", this.state === "stale" || this.state === "unavailable");
  }

  private _hasRange(): boolean {
    return this.range?.min !== null && this.range?.min !== undefined && this.range.max !== null && this.range.max !== undefined;
  }

  protected render() {
    const l = this.l; const range = this.range; const value = this.value;
    const rangeText = formatRange(l, "moisture", range, "%");
    const valueText = value === null ? "—" : formatValue(l, value, "%");
    const label = value === null ? l.t("moisture_bar.label_no_value")
      : rangeText ? l.t("moisture_bar.label", { value: valueText, range: rangeText })
        : l.t("moisture_bar.label_no_range", { value: valueText });
    const hasRange = this._hasRange();
    const min = hasRange ? clamp(range!.min!) : 0; const max = hasRange ? clamp(range!.max!) : 0;
    const target = range?.target ?? null;
    const showAge = this.state === "stale" && this.lastReported;
    return html`
      <div class="top"><span class="name"><ha-icon aria-hidden="true" .icon=${ROLE_META.moisture.icon}></ha-icon>${readingLabel(l, "moisture")}</span>
        <span class="value ${this.state}" aria-hidden="true">${valueText}</span></div>
      <div class="track" role="img" aria-label=${label}>
        ${hasRange ? html`<div class="band" style="left:${min}%;width:${Math.max(0, max - min)}%"></div>` : nothing}
        ${target !== null ? html`<div class="tick" style="left:${clamp(target)}%"></div>` : nothing}
        ${value !== null ? html`<div class="dot ${this.state}" style="left:${Math.min(98, Math.max(2, value))}%"></div>` : nothing}
      </div>
      <div class="scale" aria-hidden="true"><span>${l.t("moisture_bar.dry")}</span>${rangeText ? html`<span>${l.t("moisture_bar.target", { range: rangeText })}</span>` : nothing}<span>${l.t("moisture_bar.wet")}</span></div>
      ${showAge ? html`<div class="age"><ha-icon aria-hidden="true" icon="mdi:clock-outline"></ha-icon>${l.t("moisture_bar.last_update", { age: relativeTime(l, this.lastReported!, this.now) })}</div>` : nothing}`;
  }
}

if (!customElements.get("sp-moisture-bar")) customElements.define("sp-moisture-bar", SpMoistureBar);
declare global { interface HTMLElementTagNameMap { "sp-moisture-bar": SpMoistureBar } }
