import { LitElement, css, html } from "lit";
import { property } from "lit/decorators.js";
import { themeFallbacks } from "./shared-styles.js";

// Centred empty state: icon in a tinted circle, heading, one sentence (default
// slot) and actions (slot "actions").
export class SpEmptyState extends LitElement {
  static styles = [themeFallbacks, css`
    :host { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 48px 20px; color: var(--sp-text); }
    .art { width: 96px; height: 96px; border-radius: 50%; display: grid; place-items: center;
      background: color-mix(in srgb, var(--sp-primary) 12%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
    :host([compact]) { padding: 32px 16px; }
    :host([compact]) .art { width: 64px; height: 64px; }
    ha-icon { --mdc-icon-size: 52px; }
    :host([compact]) ha-icon { --mdc-icon-size: 34px; }
    h2 { margin: 6px 0 0; font-size: 22px; font-weight: 400; line-height: 1.25; text-wrap: balance; }
    :host([compact]) h2 { font-size: 18px; }
    .text { max-width: 44ch; color: var(--sp-text-secondary); }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 6px; }
  `];

  @property() public icon = "mdi:sprout";
  @property() public heading = "";
  @property({ type: Boolean, reflect: true }) public compact = false;

  protected render() {
    return html`<div class="art" aria-hidden="true"><ha-icon .icon=${this.icon}></ha-icon></div>
      <h2>${this.heading}</h2><div class="text"><slot></slot></div><div class="actions"><slot name="actions"></slot></div>`;
  }
}

if (!customElements.get("sp-empty-state")) customElements.define("sp-empty-state", SpEmptyState);
declare global { interface HTMLElementTagNameMap { "sp-empty-state": SpEmptyState } }
