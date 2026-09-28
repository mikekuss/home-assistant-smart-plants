import { LitElement, css, html } from "lit";
import { property } from "lit/decorators.js";
import { ENGLISH } from "../localize.js";
import type { Localizer } from "../localize.js";
import { themeFallbacks } from "./shared-styles.js";

// The plant photo, or a plant icon on a tinted tile when there is none.
// `src` is an object URL the view created from the authenticated image fetch.
export class SpPlantAvatar extends LitElement {
  static styles = [themeFallbacks, css`
    :host { --sp-avatar-size: 56px; --sp-avatar-radius: 12px; display: inline-block; flex: none; width: var(--sp-avatar-size); height: var(--sp-avatar-size); max-width: 100%; }
    :host([size="large"]) { --sp-avatar-size: 132px; --sp-avatar-radius: 16px; }
    @media (max-width: 600px) { :host([size="large"]) { --sp-avatar-size: 76px; --sp-avatar-radius: 12px; } }
    .tile { width: 100%; height: 100%; border-radius: var(--sp-avatar-radius); overflow: hidden; display: grid; place-items: center;
      background: color-mix(in srgb, var(--sp-primary) 12%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    ha-icon { --mdc-icon-size: calc(var(--sp-avatar-size) * .54); }
  `];

  @property({ attribute: false }) public src: string | null = null;
  @property() public name = "";
  @property({ reflect: true }) public size: "small" | "large" = "small";
  @property({ attribute: false }) public l: Localizer = ENGLISH;

  protected render() {
    return html`<div class="tile" part="tile">${this.src
      ? html`<img src=${this.src} alt=${this.l.t("photo.alt", { name: this.name })}>`
      : html`<ha-icon aria-hidden="true" icon="mdi:sprout"></ha-icon>`}</div>`;
  }
}

if (!customElements.get("sp-plant-avatar")) customElements.define("sp-plant-avatar", SpPlantAvatar);
declare global { interface HTMLElementTagNameMap { "sp-plant-avatar": SpPlantAvatar } }
