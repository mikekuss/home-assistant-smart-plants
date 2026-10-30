// The Smart Plants dashboard card, `type: custom:smart-plants-plant-card`.
// Home Assistant loads this small module in every frontend session, so the
// card is available on any dashboard and listed in the card picker. The card
// content and the translations live in a second module, which is imported
// only once a card is on screen or the card editor opens. Without a card on
// any dashboard this module only defines the element and the picker entry.
import { pickerText } from "./picker.js";

export const CARD_TYPE = "smart-plants-plant-card";
const CONTENT_ELEMENT = "smart-plants-plant-card-content";
const CONTENT_FILE = "smart-plants-card-full.js";

interface CardConfig { type: string; device_id?: string; show_readings?: boolean; show_watering?: boolean }
interface ContentElement extends HTMLElement { hass?: unknown; setConfig(config: CardConfig): void }
export interface CardModule {
  getConfigForm(): Record<string, unknown>;
  getStubConfig(hass: unknown): Record<string, unknown>;
}

// The content module next to this one, with the same version query, so both
// come from the same release.
// (The base is a variable so the bundler leaves the URL to the browser.)
function contentUrl(): string {
  const self = import.meta.url;
  const url = new URL(CONTENT_FILE, self);
  url.search = new URL(self).search;
  return url.href;
}

export class SmartPlantsPlantCard extends HTMLElement {
  // Replaced in tests, which import the content module directly.
  static load: () => Promise<CardModule> = () => import(/* @vite-ignore */ contentUrl()) as Promise<CardModule>;
  private static _module: Promise<CardModule> | null = null;
  private _config: CardConfig | null = null;
  private _hass: unknown;
  private _content: ContentElement | null = null;

  static module(): Promise<CardModule> {
    if (!this._module) this._module = this.load().catch(error => { this._module = null; throw error; });
    return this._module;
  }

  static async getConfigForm(): Promise<Record<string, unknown>> {
    return (await this.module()).getConfigForm();
  }

  static async getStubConfig(hass: unknown): Promise<Record<string, unknown>> {
    return { type: `custom:${CARD_TYPE}`, ...(await this.module()).getStubConfig(hass) };
  }

  set hass(hass: unknown) {
    this._hass = hass;
    if (this._content) this._content.hass = hass;
  }
  get hass(): unknown { return this._hass; }

  setConfig(config: CardConfig): void {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    this._config = { ...config };
    this._content?.setConfig(this._config);
  }

  // Masonry view: rows of about 50 pixels for the parts the card shows.
  getCardSize(): number {
    const config = this._config;
    return 3 + (config?.show_readings !== false ? 2 : 0) + (config?.show_watering !== false ? 1 : 0);
  }

  // Sections view: half a section wide; the height follows the content.
  getGridOptions(): Record<string, unknown> {
    return { columns: 6, min_columns: 4, rows: "auto" };
  }

  connectedCallback(): void {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `:host { display: block; height: 100%; } ${CONTENT_ELEMENT} { display: block; height: 100%; }`;
      root.append(style);
    }
    if (this._content) return;
    void SmartPlantsPlantCard.module().then(() => {
      if (this._content || !this.isConnected || !this.shadowRoot) return;
      const content = document.createElement(CONTENT_ELEMENT) as ContentElement;
      if (this._config) content.setConfig(this._config);
      content.hass = this._hass;
      this._content = content;
      this.shadowRoot.append(content);
    }).catch(() => undefined);
  }
}

if (!customElements.get(CARD_TYPE)) customElements.define(CARD_TYPE, SmartPlantsPlantCard);

interface CustomCardEntry { type: string; name: string; description: string; preview?: boolean; documentationURL?: string }
const registry = window as unknown as { customCards?: CustomCardEntry[] };
registry.customCards = registry.customCards ?? [];
if (!registry.customCards.some(card => card.type === CARD_TYPE)) {
  registry.customCards.push({
    type: CARD_TYPE, ...pickerText(document.documentElement.lang), preview: true,
    documentationURL: "https://github.com/mikekuss/home-assistant-smart-plants/blob/main/docs/dashboard-card.md",
  });
}
