import { LitElement, css, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { ENGLISH } from "../localize.js";
import type { Localizer } from "../localize.js";
import { STATUS_META, statusLabel } from "../status.js";
import type { PlantStatus } from "../status.js";
import { srOnly, statusColorVar, themeFallbacks } from "./shared-styles.js";

// Pill with icon and text for a plant status. Colour is never the only signal.
export class SpStatusChip extends LitElement {
  static styles = [themeFallbacks, srOnly, css`
    :host { display: inline-flex; max-width: 100%; }
    .chip {
      display: inline-flex; align-items: center; gap: 5px; min-height: 26px; max-width: 100%;
      padding: 2px 10px 2px 7px; border-radius: 13px; font-size: 13px; font-weight: 500; line-height: 1.3;
      background: color-mix(in srgb, var(--sp-status) 16%, transparent);
      color: color-mix(in srgb, var(--sp-status) 50%, var(--sp-text));
    }
    :host([muted]) .chip { color: color-mix(in srgb, var(--sp-status) 35%, var(--sp-text)); }
    ha-icon { --mdc-icon-size: 17px; flex: none; }
    .label { overflow-wrap: anywhere; hyphens: auto; }
  `];

  @property({ reflect: true }) public status: PlantStatus = "healthy";
  // Overrides the status name, for example "Too little light" for a problem.
  @property() public label = "";
  // Further issues beyond the one named on the chip.
  @property({ type: Number }) public more = 0;
  @property({ attribute: false }) public l: Localizer = ENGLISH;

  protected willUpdate(): void {
    const color = STATUS_META[this.status]?.color ?? "--disabled-text-color";
    this.toggleAttribute("muted", color === "--disabled-text-color");
    this.style.setProperty("--sp-status", statusColorVar(color));
  }

  protected render() {
    const meta = STATUS_META[this.status] ?? STATUS_META.healthy;
    const text = this.label || statusLabel(this.l, this.status in STATUS_META ? this.status : "healthy");
    return html`<span class="chip" part="chip"><ha-icon aria-hidden="true" .icon=${meta.icon}></ha-icon><span class="label">${text}</span>${this.more > 0
      ? html`<span aria-hidden="true">${this.l.t("plant_status.more", { count: this.more })}</span><span class="sr-only">${this.l.t("plant_status.more_label", { count: this.more })}</span>`
      : nothing}</span>`;
  }
}

if (!customElements.get("sp-status-chip")) customElements.define("sp-status-chip", SpStatusChip);
declare global { interface HTMLElementTagNameMap { "sp-status-chip": SpStatusChip } }
