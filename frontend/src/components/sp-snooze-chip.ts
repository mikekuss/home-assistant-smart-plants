import { LitElement, css, html } from "lit";
import { property } from "lit/decorators.js";
import { themeFallbacks } from "./shared-styles.js";

// Grey pill for a plant whose alerts are snoozed. It sits next to the status
// chip and never replaces it: a snooze mutes alerts, the status stays true.
export class SpSnoozeChip extends LitElement {
  static styles = [themeFallbacks, css`
    :host { display: inline-flex; max-width: 100%; }
    .chip {
      display: inline-flex; align-items: center; gap: 5px; min-height: 26px; max-width: 100%;
      padding: 2px 10px 2px 7px; border-radius: 13px; font-size: 13px; font-weight: 500; line-height: 1.3;
      background: color-mix(in srgb, var(--sp-text) 8%, transparent);
      color: color-mix(in srgb, var(--sp-text-secondary) 60%, var(--sp-text));
    }
    ha-icon { --mdc-icon-size: 17px; flex: none; }
    .label { overflow-wrap: anywhere; hyphens: auto; }
  `];

  // "Snoozed until Fri, Oct 30".
  @property() public label = "";

  protected render() {
    return html`<span class="chip" part="chip"><ha-icon aria-hidden="true" icon="mdi:bell-sleep-outline"></ha-icon><span class="label">${this.label}</span></span>`;
  }
}

if (!customElements.get("sp-snooze-chip")) customElements.define("sp-snooze-chip", SpSnoozeChip);
declare global { interface HTMLElementTagNameMap { "sp-snooze-chip": SpSnoozeChip } }
