// The archive of retired plants: a quiet list, a plain page per plant with its
// photo, dates and care log, and the Restore and Delete for good dialogs. A
// retired plant has no device or entities, so everything here comes from the
// archive commands. The panel shows this page only once a plant was retired.
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { PropertyValues } from "lit";
import { api, ApiError } from "../api.js";
import { isMessageKey } from "../localize.js";
import type { Localizer } from "../localize.js";
import { speciesCommonName } from "../model.js";
import { isReadingRole, readingLabel } from "../status.js";
import { styles } from "../styles.js";
import { themeFallbacks } from "../components/shared-styles.js";
import "../components/index.js";
import { CARE_ICONS, careDetails, plantStyles } from "./plant.js";
import type { ArchivedPlantSummary, ArchivedPlantView, HomeAssistantLike, PlantRecord, RestoreCheck } from "../types.js";

// Whole months from `start` to `end`, for "Monitored for 2 years, 3 months".
export function monthsBetween(start: string, end: string): number {
  const a = new Date(start); const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function durationText(l: Localizer, months: number): string {
  const years = Math.floor(months / 12); const rest = months % 12;
  const y = years ? l.tn(years, "archive.years_one", "archive.years_other") : "";
  const m = rest || !years ? l.tn(rest, "archive.months_one", "archive.months_other") : "";
  return y && m ? l.t("archive.duration_both", { years: y, months: m }) : y || m;
}

// The date part of a timestamp in the viewer's locale; acquired dates may be
// stored as a plain date.
function dayText(l: Localizer, value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? l.date(value) : l.date(new Date(value).toISOString().slice(0, 10));
}

function monthYear(l: Localizer, value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(l.language, { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function speciesText(l: Localizer, plant: ArchivedPlantSummary): string {
  const snapshot = plant.species?.snapshot;
  if (!snapshot) return "";
  const common = speciesCommonName(snapshot, l.language);
  return [snapshot.latin_name, common].filter(Boolean).join(" · ");
}

export class SmartPlantsArchive extends LitElement {
  static styles = [themeFallbacks, styles, plantStyles, css`
    :host { display: block; }
    .archive { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
    .intro { margin: 0; }
    .archive-list { list-style: none; margin: 0; padding: 0; }
    .archive-list li { margin: 0; }
    .archive-row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center; width: 100%; min-height: 60px; padding: 10px 16px; border: 0; background: none; color: inherit; font: inherit; text-align: start; cursor: pointer; border-radius: 0; }
    .archive-list li + li .archive-row { border-top: 1px solid var(--divider-color, #e0e0e0); }
    .archive-row:hover { background: color-mix(in srgb, currentColor 5%, transparent); }
    .archive-row:focus-visible { outline: 2px solid var(--sp-primary, var(--primary-color)); outline-offset: -2px; }
    .row-text { display: flex; flex-direction: column; min-width: 0; }
    .row-text span { overflow: hidden; text-overflow: ellipsis; }
    .hero { display: flex; gap: 16px; align-items: center; padding: 16px; flex-wrap: wrap; }
    .hero h2 { margin: 0; font-size: 1.25rem; font-weight: 500; }
    .hero .row-text { gap: 2px; }
    .facts { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 6px 16px; margin: 0; padding: 0 16px 16px; }
    .facts dt { color: var(--secondary-text-color); }
    .facts dd { margin: 0; }
    .card-h { padding: 12px 16px 0; }
    .card-h h3 { margin: 0; font-size: 1rem; font-weight: 500; }
    .footer { display: flex; gap: 8px; flex-wrap: wrap; justify-content: space-between; }
    .sensor-list { margin: 4px 0 0; padding-inline-start: 20px; }
    dialog label.check { display: flex; gap: 8px; align-items: flex-start; }
    dialog .field { display: flex; flex-direction: column; gap: 4px; }
    dialog input[type=text] { min-height: 40px; }
  `];
  @property({ attribute: false }) public hass?: HomeAssistantLike;
  @property({ attribute: false }) public l!: Localizer;
  // The retired plant to show, or null for the list.
  @property({ attribute: false }) public plantId: string | null = null;
  @state() private _list: ArchivedPlantSummary[] | null = null;
  @state() private _detail: ArchivedPlantView | null = null;
  @state() private _error = "";
  @state() private _photos: Record<string, string> = {};
  @state() private _dialog: "restore" | "delete" | null = null;
  @state() private _check: RestoreCheck | null = null;
  @state() private _name = "";
  @state() private _shareSensors = false;
  @state() private _busy = false;
  @state() private _dialogError = "";
  private _request = 0;
  private _photoRequests = new Set<string>();

  disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const url of Object.values(this._photos)) URL.revokeObjectURL(url);
    this._photos = {}; this._photoRequests.clear(); this._request++;
  }
  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("plantId") || (changed.has("hass") && !changed.get("hass") && this.hass)) void this._load();
  }
  protected updated(changed: PropertyValues): void {
    if (changed.has("_dialog") && this._dialog) {
      const dialog = this.shadowRoot?.querySelector("dialog");
      if (dialog && !dialog.open) dialog.showModal();
      this.shadowRoot?.querySelector<HTMLElement>("dialog h2")?.focus();
    }
  }
  private _friendly(e: unknown): string {
    const key = e instanceof ApiError ? `api_error.${e.code}` : "";
    return this.l.t(isMessageKey(key) ? key : "api_error.unknown");
  }
  private async _load(): Promise<void> {
    const hass = this.hass; if (!hass) return;
    const request = ++this._request; const plantId = this.plantId;
    this._error = "";
    try {
      if (plantId) {
        this._detail = null;
        const detail = await api.archiveGet(hass, plantId);
        if (request !== this._request) return;
        this._detail = detail; this._photo(detail);
      } else {
        const list = await api.archiveList(hass);
        if (request !== this._request) return;
        this._list = list; list.forEach(item => this._photo(item));
      }
    } catch (e) {
      if (request !== this._request) return;
      if (plantId && e instanceof ApiError && e.code === "not_found") { this._open(null); return; }
      this._error = this._friendly(e);
    }
  }
  private _photo(plant: ArchivedPlantSummary): void {
    const hass = this.hass; const image = plant.image;
    if (!hass || !image) return;
    const key = `${plant.id}/${image.id}`;
    if (this._photos[key] || this._photoRequests.has(key)) return;
    this._photoRequests.add(key);
    void api.fetchImage(hass, plant.id).then(blob => {
      if (!this.isConnected) return;
      this._photos = { ...this._photos, [key]: URL.createObjectURL(blob) };
    }).catch(() => undefined).finally(() => this._photoRequests.delete(key));
  }
  private _photoUrl(plant: ArchivedPlantSummary): string | null {
    return plant.image ? this._photos[`${plant.id}/${plant.image.id}`] ?? null : null;
  }
  private _open(plantId: string | null): void {
    this.dispatchEvent(new CustomEvent("archive-open", { detail: { plantId } }));
  }
  private async _openRestore(): Promise<void> {
    const hass = this.hass; const detail = this._detail; if (!hass || !detail || this._busy) return;
    this._busy = true; this._dialogError = "";
    try {
      const check = await api.restoreCheck(hass, detail.id);
      this._check = check; this._name = check.suggested_name; this._shareSensors = false; this._dialog = "restore";
    } catch (e) { this._error = this._friendly(e); }
    finally { this._busy = false; }
  }
  private _close(): void {
    this.shadowRoot?.querySelector("dialog")?.close();
    this._dialog = null; this._dialogError = ""; this._check = null;
    void this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLElement>(".footer button")?.focus());
  }
  private async _restore(): Promise<void> {
    const hass = this.hass; const detail = this._detail; if (!hass || !detail || this._busy) return;
    const name = this._name.trim();
    if (!name) { this._dialogError = this.l.t("archive.restore_name_required"); return; }
    this._busy = true; this._dialogError = "";
    try {
      const plant: PlantRecord = await api.restore(hass, detail.id, detail.revision, name, this._shareSensors);
      this.shadowRoot?.querySelector("dialog")?.close(); this._dialog = null;
      this.dispatchEvent(new CustomEvent("archive-restored", { detail: { plant } }));
    } catch (e) { this._dialogError = this._friendly(e); }
    finally { this._busy = false; }
  }
  private async _delete(): Promise<void> {
    const hass = this.hass; const detail = this._detail; if (!hass || !detail || this._busy) return;
    this._busy = true; this._dialogError = "";
    try {
      await api.deleteArchived(hass, detail.id, detail.revision);
      this.shadowRoot?.querySelector("dialog")?.close(); this._dialog = null;
      this.dispatchEvent(new CustomEvent("archive-deleted", { detail: { plantId: detail.id, name: detail.name } }));
    } catch (e) { this._dialogError = this._friendly(e); }
    finally { this._busy = false; }
  }
  private _trapFocus(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;
    const nodes = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button:not([disabled]),input:not([disabled])")];
    const first = nodes[0]; const last = nodes.at(-1); const active = this.shadowRoot?.activeElement;
    if (e.shiftKey && (active === first || active?.matches("h2"))) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first?.focus(); }
  }
  private _roleText(role: string): string { return isReadingRole(role) ? readingLabel(this.l, role) : role; }

  private _renderList() {
    const l = this.l; const list = this._list;
    if (!list) return html`<p class="muted" role="status">${l.t("archive.loading")}</p>`;
    if (!list.length) return html`<div class="archive"><p>${l.t("archive.empty")}</p><div><button type="button" @click=${() => this.dispatchEvent(new CustomEvent("archive-close"))}>${l.t("panel.back_to_overview")}</button></div></div>`;
    return html`<div class="archive"><p class="muted intro">${l.t("archive.intro")}</p>
      <section class="sp-card" aria-label=${l.t("archive.title")}><ul class="archive-list">${list.map(plant => {
        const species = speciesText(l, plant);
        const dates = l.t("archive.date_range", { start: monthYear(l, plant.acquired_at ?? plant.created_at), end: monthYear(l, plant.archived_at) });
        return html`<li><button type="button" class="archive-row" @click=${() => this._open(plant.id)}>
          <sp-plant-avatar .l=${l} .name=${plant.name} .src=${this._photoUrl(plant)}></sp-plant-avatar>
          <span class="row-text"><span>${plant.name}</span>${species ? html`<span class="small muted">${species}</span>` : nothing}</span>
          <span class="small muted">${dates}</span></button></li>`;
      })}</ul></section></div>`;
  }
  private _renderDetail() {
    const l = this.l; const plant = this._detail;
    if (!plant) return html`<p class="muted" role="status">${l.t("archive.loading")}</p>`;
    const species = speciesText(l, plant);
    const start = plant.acquired_at ?? plant.created_at;
    const fieldLabel = (key: string) => { const k = `care_field.${key}`; return isMessageKey(k) ? l.t(k) : key; };
    return html`<div class="archive pd">
      <section class="sp-card"><div class="hero">
        <sp-plant-avatar size="large" .l=${l} .name=${plant.name} .src=${this._photoUrl(plant)}></sp-plant-avatar>
        <div class="row-text"><h2>${plant.name}</h2>${species ? html`<span class="muted">${species}</span>` : nothing}${plant.area_name ? html`<span class="small muted">${plant.area_name}</span>` : nothing}</div></div>
        <dl class="facts">
          ${plant.acquired_at ? html`<dt>${l.t("archive.fact_acquired")}</dt><dd>${dayText(l, plant.acquired_at)}</dd>` : nothing}
          <dt>${l.t("archive.fact_added")}</dt><dd>${dayText(l, plant.created_at)}</dd>
          <dt>${l.t("archive.fact_retired")}</dt><dd>${dayText(l, plant.archived_at)}</dd>
          <dt>${l.t("archive.fact_monitored")}</dt><dd>${durationText(l, monthsBetween(start, plant.archived_at))}</dd>
        </dl></section>
      <section class="sp-card" aria-labelledby="archive-care"><div class="card-h"><h3 id="archive-care">${l.t("archive.care_heading")}</h3></div>
        <p class="small muted card-b">${l.tn(plant.summary.watering_count, "care.watering_count_one", "care.watering_count_other")}</p>
        ${plant.events.length ? html`<ul class="list" aria-label=${l.t("care.events_label")}>${plant.events.map(event => {
          const extra = careDetails(l, event, fieldLabel);
          return html`<li class="li"><span class="ic tonal" aria-hidden="true"><ha-icon .icon=${CARE_ICONS[event.kind]}></ha-icon></span>
            <span class="li-main"><span class="li-title">${l.t(`care_kind.${event.kind}`)}</span><span class="li-sub"><time datetime=${event.occurred_at}>${l.recordedDateTime(event.occurred_at)}</time>${extra.map(part => html` · <span class="prose">${part}</span>`)}</span></span><span></span></li>`;
        })}</ul>` : html`<p class="card-b muted">${l.t("care.empty")}</p>`}</section>
      <div class="footer">
        <button type="button" class="btn filled" ?disabled=${this._busy} @click=${() => void this._openRestore()}><ha-icon aria-hidden="true" icon="mdi:restore"></ha-icon>${l.t("archive.restore")}</button>
        <button type="button" class="btn danger" ?disabled=${this._busy} @click=${() => { this._dialogError = ""; this._dialog = "delete"; }}><ha-icon aria-hidden="true" icon="mdi:delete-outline"></ha-icon>${l.t("archive.delete")}</button>
      </div>
      ${this._dialog === "restore" ? this._renderRestoreDialog(plant) : this._dialog === "delete" ? this._renderDeleteDialog(plant) : nothing}
    </div>`;
  }
  private _renderRestoreDialog(plant: ArchivedPlantView) {
    const l = this.l; const check = this._check; if (!check) return nothing;
    const blocked = check.blocked === "limit" ? l.t("archive.restore_blocked_limit") : check.blocked === "busy" ? l.t("archive.restore_blocked_busy") : "";
    return html`<dialog aria-labelledby="restore-title" @cancel=${(e: Event) => { e.preventDefault(); this._close(); }} @keydown=${(e: KeyboardEvent) => this._trapFocus(e)}>
      <h2 id="restore-title" tabindex="-1">${l.t("archive.restore_title", { name: plant.name })}</h2>
      <p>${l.t("archive.restore_body")}</p>
      ${blocked ? html`<p class="error" role="alert">${blocked}</p>` : html`
        ${check.name_taken ? html`<div class="field"><label for="restore-name">${l.t("archive.restore_name")}</label>
          <input id="restore-name" type="text" maxlength="200" .value=${this._name} aria-describedby="restore-name-help" @input=${(e: Event) => { this._name = (e.target as HTMLInputElement).value; }}>
          <span class="small muted" id="restore-name-help">${l.t("archive.restore_name_taken", { name: plant.name })}</span></div>` : nothing}
        ${check.sources_in_use.length ? html`<div><p class="small">${l.t("archive.restore_in_use")}</p>
          <ul class="sensor-list small">${check.sources_in_use.map(item => html`<li>${this._roleText(item.role)} · ${item.entity_id} → ${item.plants.join(", ")}</li>`)}</ul>
          <label class="check"><input type="checkbox" .checked=${this._shareSensors} @change=${(e: Event) => { this._shareSensors = (e.target as HTMLInputElement).checked; }}><span>${l.t("archive.restore_share")}</span></label></div>` : nothing}
        ${check.sources_missing.length ? html`<div><p class="small">${l.t("archive.restore_missing")}</p>
          <ul class="sensor-list small">${check.sources_missing.map(item => html`<li>${this._roleText(item.role)} · ${item.entity_id}</li>`)}</ul></div>` : nothing}
        ${check.area_missing ? html`<p class="small">${l.t("archive.restore_area_missing", { area: plant.area_name ?? "" })}</p>` : nothing}`}
      ${this._dialogError ? html`<p class="error" role="alert">${this._dialogError}</p>` : nothing}
      <div class="actions"><button type="button" @click=${() => this._close()}>${l.t("common.cancel")}</button>
        <button type="button" class="primary" ?disabled=${this._busy || !!blocked} @click=${() => void this._restore()}>${check.sources_in_use.length && !this._shareSensors ? l.t("archive.restore_without") : l.t("archive.restore_confirm")}</button></div></dialog>`;
  }
  private _renderDeleteDialog(plant: ArchivedPlantView) {
    const l = this.l;
    return html`<dialog aria-labelledby="delete-title" @cancel=${(e: Event) => { e.preventDefault(); this._close(); }} @keydown=${(e: KeyboardEvent) => this._trapFocus(e)}>
      <h2 id="delete-title" tabindex="-1">${l.t("archive.delete_title", { name: plant.name })}</h2>
      <p>${l.t("archive.delete_body")}</p>
      ${this._dialogError ? html`<p class="error" role="alert">${this._dialogError}</p>` : nothing}
      <div class="actions"><button type="button" @click=${() => this._close()}>${l.t("common.cancel")}</button>
        <button type="button" class="primary" ?disabled=${this._busy} @click=${() => void this._delete()}>${l.t("archive.delete_confirm")}</button></div></dialog>`;
  }
  protected render() {
    return html`${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}${this.plantId ? this._renderDetail() : this._renderList()}`;
  }
}
if (!customElements.get("smart-plants-archive")) customElements.define("smart-plants-archive", SmartPlantsArchive);
declare global { interface HTMLElementTagNameMap { "smart-plants-archive": SmartPlantsArchive } }
