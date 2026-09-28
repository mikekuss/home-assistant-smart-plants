import { LitElement, css, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { ENGLISH } from "../localize.js";
import type { Localizer } from "../localize.js";
import { ROLE_META, formatRange, formatValue, readingLabel } from "../status.js";
import type { ReadingRole, ReadingState, TargetRange } from "../status.js";
import { srOnly, themeFallbacks } from "./shared-styles.js";

// Compact reading: role icon, value and unit. Out-of-range readings use the
// error colours; the target range is in the tooltip and screen-reader text.
export class SpReadingChip extends LitElement {
  static styles = [themeFallbacks, srOnly, css`
    :host { display: inline-flex; }
    .chip {
      display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 9px 0 6px; border-radius: 8px;
      font-size: 13px; font-variant-numeric: tabular-nums; color: var(--sp-text);
      background: color-mix(in srgb, var(--sp-text) 7%, transparent);
    }
    ha-icon { --mdc-icon-size: 17px; color: var(--sp-text-secondary); }
    :host([state="low"]) .chip, :host([state="high"]) .chip {
      background: color-mix(in srgb, var(--sp-error) 15%, transparent);
      color: color-mix(in srgb, var(--sp-error) 50%, var(--sp-text));
    }
    :host([state="low"]) ha-icon, :host([state="high"]) ha-icon { color: inherit; }
    :host([state="stale"]) .chip, :host([state="unavailable"]) .chip { opacity: .6; }
  `];

  @property() public role: ReadingRole = "temperature";
  @property({ type: Number }) public value: number | null = null;
  @property() public unit = "";
  @property({ reflect: true }) public state: ReadingState = "ok";
  @property({ attribute: false }) public range: TargetRange | null = null;
  @property({ attribute: false }) public l: Localizer = ENGLISH;

  protected render() {
    const l = this.l; const meta = ROLE_META[this.role] ?? ROLE_META.temperature;
    const name = readingLabel(l, this.role in ROLE_META ? this.role : "temperature");
    const rangeText = formatRange(l, this.role, this.range, this.unit);
    const outside = (this.state === "low" || this.state === "high") && rangeText;
    return html`<span class="chip" part="chip" title=${rangeText ? `${name}: ${rangeText}` : name}>
      <ha-icon aria-hidden="true" .icon=${meta.icon}></ha-icon><span class="sr-only">${name}</span>
      ${this.value === null ? l.t("reading.no_value") : formatValue(l, this.value, this.unit)}
      ${outside ? html`<span class="sr-only">, ${l.t("reading.outside_target", { range: rangeText })}</span>` : nothing}
      ${this.state === "stale" ? html`<span class="sr-only">, ${l.t("reading.not_updating")}</span>` : nothing}
    </span>`;
  }
}

if (!customElements.get("sp-reading-chip")) customElements.define("sp-reading-chip", SpReadingChip);
declare global { interface HTMLElementTagNameMap { "sp-reading-chip": SpReadingChip } }
