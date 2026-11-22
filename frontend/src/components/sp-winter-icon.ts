import { LitElement, css, html } from "lit";
import { property } from "lit/decorators.js";
import { themeFallbacks } from "./shared-styles.js";

// A snowflake next to the status chip while a plant's winter values apply.
// It has no text of its own: the label is its accessible name and tooltip.
export class SpWinterIcon extends LitElement {
  static styles = [themeFallbacks, css`
    :host { display: inline-flex; }
    .icon {
      display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 13px;
      background: color-mix(in srgb, var(--sp-info) 14%, transparent); color: var(--sp-info);
    }
    ha-icon { --mdc-icon-size: 17px; }
  `];

  // "Winter values apply".
  @property() public label = "";

  protected render() {
    return html`<span class="icon" part="icon" role="img" aria-label=${this.label} title=${this.label}><ha-icon aria-hidden="true" icon="mdi:snowflake"></ha-icon></span>`;
  }
}

if (!customElements.get("sp-winter-icon")) customElements.define("sp-winter-icon", SpWinterIcon);
declare global { interface HTMLElementTagNameMap { "sp-winter-icon": SpWinterIcon } }
