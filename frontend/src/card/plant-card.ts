// Content of the dashboard card for one plant (`type:
// custom:smart-plants-plant-card`). The small loader (loader.ts) defines the
// card itself and imports this module once a card is on screen. The card looks
// like a plant card on the panel overview and works for every signed-in user,
// so it reads only entity states and the registries the frontend already has,
// and logs a watering with the smart_plants.log_care action. Admins also get
// the plant photo, a link to the plant in the panel and Undo.
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import "../components/sp-moisture-bar.js";
import "../components/sp-plant-avatar.js";
import "../components/sp-reading-chip.js";
import "../components/sp-snooze-chip.js";
import "../components/sp-status-chip.js";
import { themeFallbacks } from "../components/shared-styles.js";
import { createLocalizer } from "../localize.js";
import type { HALocale, Localizer, MessageKey } from "../localize.js";
import { cardReason, chipText, secondaryReadings, wateredText } from "../overview-model.js";
import { relativeTime } from "../status.js";
import { localDate } from "../care-plan.js";
import { snoozeChipText } from "../snooze.js";
import { DOMAIN, plantDevices, plantView } from "./plant-state.js";
import type { CardHassData, CardPlant, PlantView } from "./plant-state.js";

export const CONTENT_ELEMENT = "smart-plants-plant-card-content";
export const PANEL_PATH = "/smart-plants";

export interface PlantCardConfig {
  type: string;
  device_id?: string;
  show_readings?: boolean;
  show_watering?: boolean;
}

export interface CardHass extends CardHassData {
  language?: string;
  locale?: HALocale;
  user?: { is_admin?: boolean };
  config?: { time_zone?: unknown };
  callService(domain: string, service: string, data?: Record<string, unknown>, target?: Record<string, unknown>, notifyOnError?: boolean): Promise<unknown>;
  callWS?<T>(msg: Record<string, unknown>): Promise<T>;
  fetchWithAuth?(path: string, init?: RequestInit): Promise<Response>;
}

interface CareListReply { revision: number; events: { id: string; kind: string; occurred_at: string }[] }

// Local wall-clock time with its UTC offset, whole seconds, as care events are recorded.
function localTimestamp(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const pad = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, "0");
  const local = new Date(date.getTime() + offset * 60000).toISOString().slice(0, 19);
  return `${local}${offset < 0 ? "-" : "+"}${pad(offset / 60)}:${pad(offset % 60)}`;
}

const errorCode = (e: unknown): string | null =>
  typeof e === "object" && e !== null && typeof (e as { code?: unknown }).code === "string" ? (e as { code: string }).code : null;

// The editor runs without the card's hass, so it takes the language Home
// Assistant sets on the document.
const documentLocalizer = (): Localizer => createLocalizer({ language: document.documentElement.lang || "en" });

export class SmartPlantsPlantCardContent extends LitElement {
  static styles = [themeFallbacks, css`
    :host { display: block; container-type: inline-size; }
    ha-card { display: flex; flex-direction: column; height: 100%; overflow: hidden; position: relative; color: var(--sp-text);
      background: var(--ha-card-background, var(--sp-card)); border-radius: var(--ha-card-border-radius, 12px);
      border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0)); box-shadow: var(--ha-card-box-shadow, none); }
    button { font: inherit; color: inherit; }
    :focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    ha-icon { flex: none; }
    .head { display: flex; gap: 12px; padding: 14px 14px 10px; align-items: flex-start; }
    .title { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    h2 { margin: 0; font-size: 16px; font-weight: 500; line-height: 1.3; }
    .name { all: unset; cursor: pointer; overflow-wrap: anywhere; }
    .name:hover { text-decoration: underline; text-underline-offset: 3px; }
    .name:focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 2px; border-radius: 2px; }
    .sub { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 13px; color: var(--sp-text-secondary); }
    .sub ha-icon { --mdc-icon-size: 16px; }
    .status { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 0 14px 10px; }
    .chiprow { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; max-width: 100%; }
    .reason { font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
    .care { display: flex; align-items: center; gap: 6px; margin: 0 14px 10px; font-size: 13px; color: color-mix(in srgb, var(--sp-care) 55%, var(--sp-text)); }
    .care ha-icon { --mdc-icon-size: 17px; }
    .readings { display: flex; flex-direction: column; gap: 10px; padding: 4px 14px 12px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .empty-box { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 14px 12px; padding: 10px 12px;
      border: 1px dashed var(--divider-color, #e0e0e0); border-radius: 8px; font-size: 13px; color: var(--sp-text-secondary); }
    .text-button { border: 0; background: transparent; color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); font-weight: 500; cursor: pointer; padding: 6px 10px; border-radius: 16px; }
    .text-button:hover { background: color-mix(in srgb, var(--sp-primary) 10%, transparent); }
    .foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px 6px 14px;
      border-top: 1px solid var(--divider-color, #e0e0e0); }
    .last { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--sp-text-secondary); min-width: 0; }
    .last ha-icon { --mdc-icon-size: 17px; }
    .last .short { display: none; }
    .tonal { display: inline-flex; align-items: center; gap: 6px; height: 36px; margin-left: auto; padding: 0 14px; border: 0; border-radius: 18px; cursor: pointer; font-size: 13px; font-weight: 500; white-space: nowrap;
      background: color-mix(in srgb, var(--sp-primary) 14%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
    .tonal ha-icon { --mdc-icon-size: 17px; }
    .tonal:disabled { opacity: .5; cursor: default; }
    .warning { display: flex; gap: 10px; padding: 14px; background: color-mix(in srgb, var(--sp-warning) 14%, var(--sp-card)); }
    .warning ha-icon { color: color-mix(in srgb, var(--sp-warning) 70%, var(--sp-text)); }
    .warning p { margin: 2px 0 0; font-size: 13px; }
    .warning strong { font-weight: 500; }
    /* A narrow card, such as half a section: area and species stay on one line,
       the reason takes at most two lines, and the last watering shows only the
       time. The button moves to its own row when the time doesn't fit beside it. */
    @container (max-width: 300px) {
      .sub { flex-wrap: nowrap; min-width: 0; }
      .subtext { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .reason { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; }
      .foot { flex-wrap: wrap; row-gap: 4px; padding: 6px 8px 8px 14px; }
      .last { white-space: nowrap; }
      .last .long { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
      .last .short { display: inline; overflow: hidden; text-overflow: ellipsis; }
    }
    /* Half of the narrowest section: a smaller photo leaves room for the name. */
    @container (max-width: 200px) {
      .head { gap: 10px; padding: 12px 12px 8px; }
      sp-plant-avatar { --sp-avatar-size: 40px; --sp-avatar-radius: 10px; }
      .status { padding: 0 12px 10px; }
      .care { margin: 0 12px 10px; }
      .readings { padding: 4px 12px 12px; }
      .empty-box { margin: 0 12px 12px; }
      .foot { padding: 6px 6px 8px 12px; }
      .warning { padding: 12px; }
    }
  `];

  @property({ attribute: false }) public hass?: CardHass;
  @state() private _config: PlantCardConfig | null = null;
  @state() private _busy = false;
  @state() private _photo: string | null = null;
  private _photoFor: string | null = null;
  private _photoRequest = 0;

  public setConfig(config: PlantCardConfig): void {
    this._config = { show_readings: true, show_watering: true, ...config };
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this._syncPhoto();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearPhoto();
  }

  protected updated(): void {
    this._syncPhoto();
  }

  private get _l(): Localizer { return createLocalizer(this.hass); }
  private get _admin(): boolean { return this.hass?.user?.is_admin === true; }

  private _plant(): CardPlant | null {
    if (!this.hass || !this._config?.device_id) return null;
    return plantView(this.hass, this._config.device_id);
  }

  // Admins may read the plant photo; the image view refuses everyone else.
  private _syncPhoto(): void {
    const plant = this._plant();
    const plantId = plant?.kind === "plant" && this._admin && this.isConnected ? plant.plantId : null;
    if (plantId === this._photoFor) return;
    this._clearPhoto();
    this._photoFor = plantId;
    if (!plantId || !this.hass) return;
    const request = ++this._photoRequest;
    const hass = this.hass;
    const path = `/api/${DOMAIN}/plants/${encodeURIComponent(plantId)}/image`;
    const fetching = hass.fetchWithAuth ? hass.fetchWithAuth(path) : fetch(path, { credentials: "same-origin" });
    void fetching.then(async response => {
      if (!response.ok) return;
      const blob = await response.blob();
      if (request !== this._photoRequest || !blob.type.startsWith("image/") || !blob.size) return;
      this._photo = URL.createObjectURL(blob);
    }).catch(() => undefined);
  }

  private _clearPhoto(): void {
    this._photoRequest++;
    if (this._photo) URL.revokeObjectURL(this._photo);
    this._photo = null; this._photoFor = null;
  }

  private _toast(message: string, action?: { text: string; action: () => void }): void {
    this.dispatchEvent(new CustomEvent("hass-notification", { bubbles: true, composed: true, detail: { message, duration: action ? 8000 : 4000, ...(action ? { action } : {}) } }));
  }

  private _navigate(path: string): void {
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
  }

  // Admins open the plant in the panel; everyone else gets Home Assistant's
  // more-info dialog, because the panel is for admins only.
  private _open(plant: PlantView, section?: "sensors"): void {
    if (this._admin) {
      this._navigate(`${PANEL_PATH}/plant/${encodeURIComponent(plant.plantId)}${section ? `/${section}` : ""}`);
      return;
    }
    if (plant.moreInfoEntity) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: plant.moreInfoEntity } }));
  }

  private async _logWatering(plant: PlantView): Promise<void> {
    if (!this.hass || this._busy) return;
    const hass = this.hass; const l = this._l;
    const occurredAt = localTimestamp(new Date());
    this._busy = true;
    try {
      // The action returns no event. For Undo, admins note the waterings that
      // exist before logging, so the new one can be told apart afterwards.
      const before = this._admin ? await this._wateringIds(hass, plant) : null;
      await hass.callService(DOMAIN, "log_care", { kind: "watering", occurred_at: occurredAt }, { device_id: plant.deviceId }, false);
      const message = l.t("watering.logged", { name: plant.name });
      if (before) this._toast(message, { text: l.t("watering.undo"), action: () => void this._undo(plant, before, occurredAt) });
      else this._toast(message);
    } catch (e) {
      this._toast(errorCode(e) === "unauthorized" ? l.t("plant_card.unauthorized") : l.t("plant_card.log_failed", { name: plant.name }));
    } finally {
      this._busy = false;
    }
  }

  private async _wateringIds(hass: CardHass, plant: PlantView): Promise<Set<string> | null> {
    if (!hass.callWS) return null;
    try {
      const history = await hass.callWS<CareListReply>({ type: `${DOMAIN}/care/list`, plant_id: plant.plantId });
      return new Set(history.events.filter(e => e.kind === "watering").map(e => e.id));
    } catch {
      return null;
    }
  }

  // Undo removes the watering that appeared since logging. The backend may move
  // a slightly future time to its own clock, so the time only breaks a tie when
  // someone else logged a watering at the same moment.
  private async _undo(plant: PlantView, before: Set<string>, occurredAt: string): Promise<void> {
    const hass = this.hass; const l = this._l;
    if (!hass?.callWS) return;
    try {
      const history = await hass.callWS<CareListReply>({ type: `${DOMAIN}/care/list`, plant_id: plant.plantId });
      const at = Date.parse(occurredAt);
      const added = history.events.filter(e => e.kind === "watering" && !before.has(e.id));
      const event = added.sort((a, b) => Math.abs(Date.parse(a.occurred_at) - at) - Math.abs(Date.parse(b.occurred_at) - at))[0];
      if (!event) throw new Error("not found");
      await hass.callWS({ type: `${DOMAIN}/care/delete`, plant_id: plant.plantId, expected_revision: history.revision, event_id: event.id });
      this._toast(l.t("watering.removed", { name: plant.name }));
    } catch {
      this._toast(l.t("plant_card.undo_failed", { name: plant.name }));
    }
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const l = this._l;
    if (!this._config.device_id) return this._warning(l.t("plant_card.name"), l.t("plant_card.no_plant"));
    const plant = this._plant();
    if (!plant || plant.kind === "missing") return this._warning(l.t("plant_card.missing_title"), l.t("plant_card.missing_body"));
    return this._renderPlant(plant, l);
  }

  private _warning(title: string, body: string) {
    return html`<ha-card><div class="warning" role="alert"><ha-icon aria-hidden="true" icon="mdi:alert-outline"></ha-icon><div><strong>${title}</strong><p>${body}</p></div></div></ha-card>`;
  }

  private _renderPlant(plant: PlantView, l: Localizer) {
    const config = this._config!;
    const o = plant.overview; const paused = o.status === "paused";
    const chip = chipText(l, o);
    const reason = paused ? l.t("plant_card.paused") : cardReason(l, o);
    const now = Date.now();
    const timeZone = typeof this.hass?.config?.time_zone === "string" ? this.hass.config.time_zone : undefined;
    const snoozed = paused ? null : snoozeChipText(l, o.snoozed_until, localDate(new Date(now).toISOString(), timeZone) ?? "", timeZone, now);
    const canOpen = this._admin || plant.moreInfoEntity !== null;
    const label = l.t(this._admin ? "plant_card.open_label" : "plant_card.details_label", { name: plant.name });
    return html`<ha-card>
      <div class="head"><sp-plant-avatar .src=${this._photo} .name=${plant.name} .l=${l} @photo-error=${() => this._clearPhoto()}></sp-plant-avatar>
        <div class="title"><h2>${canOpen ? html`<button type="button" class="name" title=${label} @click=${() => this._open(plant)}>${plant.name}</button>` : plant.name}</h2>
          ${plant.area || plant.species ? html`<span class="sub" title=${[plant.area, plant.species].filter(Boolean).join(" · ")}>${plant.area ? html`<ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>` : nothing}<span class="subtext">${plant.area ?? nothing}${plant.area && plant.species ? " · " : ""}${plant.species ? html`<i>${plant.species}</i>` : nothing}</span></span>` : nothing}</div></div>
      <div class="status"><div class="chiprow"><sp-status-chip .status=${o.status} .label=${chip.label} .more=${chip.more} .l=${l}></sp-status-chip>${snoozed ? html`<sp-snooze-chip .label=${snoozed}></sp-snooze-chip>` : nothing}</div>${reason ? html`<span class="reason" title=${reason}>${reason}</span>` : nothing}</div>
      ${plant.careDue ? html`<p class="care"><ha-icon aria-hidden="true" icon="mdi:calendar-check-outline"></ha-icon><span>${l.t("plant_card.care_due")}</span></p>` : nothing}
      ${config.show_readings !== false ? this._renderReadings(plant, l) : nothing}
      ${config.show_watering !== false ? html`<div class="foot">${plant.lastWatered !== undefined ? this._renderWatered(l, plant.lastWatered, now) : nothing}
        <button type="button" class="tonal" ?disabled=${paused || this._busy} aria-label=${l.t("card.log_watering_label", { name: plant.name })} @click=${() => void this._logWatering(plant)}><ha-icon aria-hidden="true" icon="mdi:water"></ha-icon>${l.t("card.log_watering")}</button></div>` : nothing}
    </ha-card>`;
  }

  // The last watering. A narrow card shows only the time, such as "3 days ago",
  // next to the history icon; screen readers and the tooltip get the sentence.
  private _renderWatered(l: Localizer, lastWatered: string | null, now: number) {
    const full = wateredText(l, lastWatered, now);
    const at = lastWatered ? Date.parse(lastWatered) : NaN;
    if (!Number.isFinite(at)) return html`<span class="last"><ha-icon aria-hidden="true" icon="mdi:history"></ha-icon><span>${full}</span></span>`;
    const age = Math.abs(now - at) < 60_000 ? l.t("card.watered_short_just_now") : relativeTime(l, lastWatered!, now);
    const short = age.charAt(0).toLocaleUpperCase(l.language) + age.slice(1);
    return html`<span class="last" title=${full}><ha-icon aria-hidden="true" icon="mdi:history"></ha-icon><span class="long">${full}</span><span class="short" aria-hidden="true">${short}</span></span>`;
  }

  private _renderReadings(plant: PlantView, l: Localizer) {
    const o = plant.overview;
    const moisture = o.roles.moisture;
    const others = secondaryReadings(o);
    if (o.status === "no_sensors" && !others.length) {
      return html`<div class="empty-box"><span>${l.t("card.no_sensors")}</span>${this._admin
        ? html`<button type="button" class="text-button" aria-label=${l.t("card.assign_label", { name: plant.name })} @click=${() => this._open(plant, "sensors")}>${l.t("card.assign")}</button>` : nothing}</div>`;
    }
    if (!moisture && !others.length) return nothing;
    return html`<div class="readings">
      ${moisture ? html`<sp-moisture-bar .value=${moisture.value} .range=${moisture.range} .state=${moisture.state} .l=${l}></sp-moisture-bar>` : nothing}
      ${others.length ? html`<div class="chips">${others.map(([role, r]) => html`<sp-reading-chip .role=${role} .value=${r.value} .unit=${r.unit} .state=${r.state} .range=${r.range} .l=${l}></sp-reading-chip>`)}</div>` : nothing}
    </div>`;
  }
}

if (!customElements.get(CONTENT_ELEMENT)) customElements.define(CONTENT_ELEMENT, SmartPlantsPlantCardContent);
declare global { interface HTMLElementTagNameMap { "smart-plants-plant-card-content": SmartPlantsPlantCardContent } }

export function getConfigForm(): Record<string, unknown> {
  const l = documentLocalizer();
  const labels: Record<string, MessageKey> = { device_id: "plant_card.editor_plant", show_readings: "plant_card.editor_show_readings", show_watering: "plant_card.editor_show_watering" };
  const helpers: Record<string, MessageKey> = { show_readings: "plant_card.editor_show_readings_help", show_watering: "plant_card.editor_show_watering_help" };
  return {
    schema: [
      { name: "device_id", required: true, selector: { device: { filter: { integration: DOMAIN } } } },
      { name: "show_readings", default: true, selector: { boolean: {} } },
      { name: "show_watering", default: true, selector: { boolean: {} } },
    ],
    computeLabel: (schema: { name: string }) => labels[schema.name] ? l.t(labels[schema.name]!) : undefined,
    computeHelper: (schema: { name: string }) => helpers[schema.name] ? l.t(helpers[schema.name]!) : undefined,
  };
}

// The first plant in name order, preferring one that needs water.
export function getStubConfig(hass: CardHassData): Omit<PlantCardConfig, "type"> {
  const devices = plantDevices(hass);
  const thirsty = devices.find(d => { const view = plantView(hass, d.id); return view.kind === "plant" && view.overview.status === "needs_water"; });
  const device = thirsty ?? devices[0];
  return { ...(device ? { device_id: device.id } : {}), show_readings: true, show_watering: true };
}
