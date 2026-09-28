import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import "../components/index.js";
import { themeFallbacks } from "../components/shared-styles.js";
import { ENGLISH } from "../localize.js";
import type { Localizer, MessageKey } from "../localize.js";
import { OVERVIEW_FILTERS, OVERVIEW_SORTS, cardReason, chipText, groupByArea, matchesFilter, matchesSearch, secondaryReadings, sortItems, wateredText } from "../overview-model.js";
import type { OverviewFilter, OverviewItem, OverviewSort, PlantOverview } from "../overview-model.js";
import type { PlantRecord } from "../types.js";

export const DOCUMENTATION_URL = "https://github.com/mikekuss/home-assistant-smart-plants/blob/main/docs/getting-started.md";

const TILES: Record<OverviewFilter, { label: MessageKey; icon: string; tone: string }> = {
  all: { label: "overview.tile_all", icon: "mdi:sprout", tone: "var(--sp-primary)" },
  water: { label: "overview.tile_water", icon: "mdi:water-alert", tone: "var(--sp-warning)" },
  problems: { label: "overview.tile_problems", icon: "mdi:alert-circle", tone: "var(--sp-error)" },
  sensors: { label: "overview.tile_sensors", icon: "mdi:clock-alert-outline", tone: "var(--sp-disabled)" },
};
const SORT_LABELS: Record<OverviewSort, MessageKey> = { attention: "overview.sort_attention", name: "overview.sort_name", area: "overview.sort_area" };
const SORT_ICONS: Record<OverviewSort, string> = { attention: "mdi:alert-circle-outline", name: "mdi:sort-alphabetical-ascending", area: "mdi:texture-box" };

interface CardItem extends OverviewItem { plant: PlantRecord; overview: PlantOverview | undefined; species: string | null }

export interface OpenPlantDetail { plantId: string; section?: "sensors" }

// The plant overview: summary tiles that filter, search and sort, and one card
// per plant. It only renders; the panel owns data loading and mutations and
// listens for `open-plant`, `add-plant` and `log-watering`.
export class SmartPlantsOverview extends LitElement {
  static styles = [themeFallbacks, css`
    /* White text on the theme's primary colour needs a slightly darker fill to reach 4.5:1. */
    :host { display: block; container-type: inline-size; --sp-primary-strong: color-mix(in srgb, var(--sp-primary) 78%, #000); }
    :host([hidden]) { display: none; }
    .content { display: flex; flex-direction: column; gap: 16px; padding-bottom: 88px; }
    button { font: inherit; color: inherit; }
    :focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    ha-icon { --mdc-icon-size: 20px; flex: none; }

    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .tile { display: flex; align-items: center; gap: 12px; padding: 12px 14px; text-align: start; cursor: pointer; min-width: 0;
      background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--ha-card-border-color, var(--divider-color, #e0e0e0)); border-radius: var(--ha-card-border-radius, 12px); }
    /* Hover tints the border, not the fill, so secondary text keeps its contrast. */
    .tile:hover { border-color: color-mix(in srgb, var(--sp-primary) 55%, var(--divider-color, #e0e0e0)); }
    .tile[aria-pressed="true"] { border-color: var(--sp-primary); box-shadow: inset 0 0 0 1px var(--sp-primary); }
    .tile .ico { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none;
      background: color-mix(in srgb, var(--tone) 16%, transparent); color: color-mix(in srgb, var(--tone) 55%, var(--sp-text)); }
    .tile .num { display: block; font-size: 22px; font-weight: 500; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .tile .lbl { display: block; font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
    .tile.zero .num { color: var(--sp-text-secondary); }

    .listbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .search { flex: 1 1 220px; display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border-radius: 20px; color: var(--sp-text-secondary);
      background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--divider-color, #e0e0e0); }
    .search:focus-within { border-color: var(--sp-primary); }
    .search input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: var(--sp-text); font: inherit; }
    .pill { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 10px 0 14px; border-radius: 20px; cursor: pointer; font-size: 14px;
      background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--divider-color, #e0e0e0); }
    .icon-space { display: inline-block; width: 20px; }
    ha-dropdown-item[checked] { color: var(--sp-primary); font-weight: 500; }

    .countline { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 13px; color: var(--sp-text-secondary); }
    .countline p { margin: 0; }
    .text-button { border: 0; background: transparent; color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); font-weight: 500; cursor: pointer; padding: 6px 10px; border-radius: 16px; }
    .text-button:hover { background: color-mix(in srgb, var(--sp-primary) 10%, transparent); }

    .group-heading { display: flex; align-items: center; gap: 8px; margin: 4px 0 0; font-size: 14px; font-weight: 500; color: var(--sp-text-secondary); }
    .group-heading .n { font-weight: 400; }
    .grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 12px; align-items: start; }

    .card { position: relative; display: flex; flex-direction: column; min-width: 0;
      background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
      border-radius: var(--ha-card-border-radius, 12px); box-shadow: var(--ha-card-box-shadow, none); }
    .card:hover { box-shadow: 0 2px 10px color-mix(in srgb, #000 10%, transparent); }
    .head { display: flex; gap: 12px; padding: 14px 14px 10px; align-items: flex-start; }
    .title { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .name { all: unset; font-size: 16px; font-weight: 500; line-height: 1.3; color: var(--sp-text); cursor: pointer; overflow-wrap: anywhere; }
    .name::after { content: ""; position: absolute; inset: 0; border-radius: var(--ha-card-border-radius, 12px); }
    .name:focus-visible { outline: none; }
    .name:focus-visible::after { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    .sub { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 13px; color: var(--sp-text-secondary); }
    .sub ha-icon { --mdc-icon-size: 16px; }
    .status { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 0 14px 10px; }
    .reason { font-size: 13px; color: var(--sp-text-secondary); overflow-wrap: anywhere; hyphens: auto; }
    .readings { display: flex; flex-direction: column; gap: 10px; padding: 4px 14px 12px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .empty-box { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 14px 12px; padding: 10px 12px;
      border: 1px dashed var(--divider-color, #e0e0e0); border-radius: 8px; font-size: 13px; color: var(--sp-text-secondary); }
    .foot { position: relative; z-index: 1; margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px 6px 14px;
      border-top: 1px solid var(--divider-color, #e0e0e0); }
    .last { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--sp-text-secondary); min-width: 0; }
    .last ha-icon { --mdc-icon-size: 17px; }
    .tonal { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 14px; border: 0; border-radius: 16px; cursor: pointer; font-size: 13px; font-weight: 500; white-space: nowrap;
      background: color-mix(in srgb, var(--sp-primary) 14%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
    .tonal ha-icon { --mdc-icon-size: 17px; }
    .tonal:disabled { opacity: .5; cursor: default; }
    .filled { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 20px; border: 0; border-radius: 20px; cursor: pointer; font-weight: 500;
      background: var(--sp-primary-strong); color: var(--text-primary-color, #fff); }
    .filled:disabled { opacity: .5; cursor: default; }
    a.text-button { text-decoration: none; display: inline-flex; align-items: center; }
    .no-results { background: var(--ha-card-background, var(--sp-card)); border: 1px solid var(--divider-color, #e0e0e0); border-radius: var(--ha-card-border-radius, 12px); }
    .loading { color: var(--sp-text-secondary); }

    .fab { position: fixed; right: max(16px, env(safe-area-inset-right, 0px)); bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 3;
      display: inline-flex; align-items: center; gap: 10px; height: 56px; padding: 0 22px 0 18px; border: 0; border-radius: 28px; cursor: pointer; font-size: 15px; font-weight: 500;
      background: var(--sp-primary-strong); color: var(--text-primary-color, #fff); box-shadow: 0 3px 8px color-mix(in srgb, #000 25%, transparent); }
    .fab ha-icon { --mdc-icon-size: 24px; }
    .fab:disabled { opacity: .6; cursor: default; }

    @container (max-width: 600px) {
      .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .tile { padding: 10px; gap: 10px; }
      .tile .ico { width: 34px; height: 34px; }
      .grid { grid-template-columns: 1fr; }
    }
  `];

  @property({ attribute: false }) public l: Localizer = ENGLISH;
  @property({ attribute: false }) public plants: PlantRecord[] = [];
  @property({ attribute: false }) public overview: Record<string, PlantOverview> = {};
  @property({ attribute: false }) public areaNames: Record<string, string | null> = {};
  @property({ attribute: false }) public thumbnails: Record<string, string> = {};
  @property({ attribute: false }) public watering: ReadonlySet<string> = new Set();
  @property({ type: Boolean }) public loading = false;
  @property({ type: Boolean }) public blocked = false;
  @property({ attribute: false }) public now: number | undefined = undefined;
  // While a plant is open the overview stays mounted to keep its filter, sort
  // and search, but renders nothing so its cards never duplicate the plant page.
  @property({ type: Boolean, reflect: true }) public override hidden = false;
  @state() private _filter: OverviewFilter = "all";
  @state() private _sort: OverviewSort = "attention";
  @state() private _query = "";

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _items(): CardItem[] {
    return this.plants.map(plant => {
      const species = plant.species?.snapshot.latin_name ?? plant.species?.snapshot.common_name ?? null;
      const areaName = this.areaNames[plant.id] ?? null;
      const overview = this.overview[plant.id];
      return {
        id: plant.id, name: plant.name, areaName, status: overview?.status, plant, overview, species,
        searchText: [plant.name, areaName, plant.species?.snapshot.common_name, plant.species?.snapshot.latin_name, plant.category, ...plant.tags].filter(Boolean).join(" "),
      };
    });
  }

  private _clear(): void { this._filter = "all"; this._query = ""; }

  protected render() {
    const l = this.l;
    if (this.hidden) return nothing;
    if (this.loading && !this.plants.length) return html`<p class="loading" role="status">${l.t("list.loading")}</p>`;
    if (!this.plants.length) return this._renderEmpty();
    const items = this._items();
    const shown = items.filter(item => matchesFilter(this._filter, item.status) && matchesSearch(item, this._query));
    const filtered = this._filter !== "all";
    return html`<div class="content">
      <div class="summary" role="group" aria-label=${l.t("overview.filter_label")}>${OVERVIEW_FILTERS.map(filter => this._renderTile(filter, items.filter(item => matchesFilter(filter, item.status)).length))}</div>
      <div class="listbar">
        <label class="search"><ha-icon aria-hidden="true" icon="mdi:magnify"></ha-icon>
          <input type="search" .value=${this._query} placeholder=${l.t("overview.search")} aria-label=${l.t("overview.search")} @input=${(e: Event) => { this._query = (e.target as HTMLInputElement).value; }}></label>
        <ha-dropdown @wa-select=${(e: CustomEvent<{ item: { value: string } }>) => { const value = e.detail.item.value; if ((OVERVIEW_SORTS as readonly string[]).includes(value)) this._sort = value as OverviewSort; }}>
          <button slot="trigger" class="pill" type="button" aria-label=${l.t("overview.sort_button", { sort: l.t(SORT_LABELS[this._sort]) })}><ha-icon aria-hidden="true" icon="mdi:sort"></ha-icon>${l.t(SORT_LABELS[this._sort])}<ha-icon aria-hidden="true" icon="mdi:menu-down"></ha-icon></button>
          ${OVERVIEW_SORTS.map(sort => html`<ha-dropdown-item value=${sort} ?checked=${this._sort === sort}>
            ${this._sort === sort ? html`<ha-icon slot="icon" icon="mdi:check"></ha-icon>` : html`<ha-icon slot="icon" .icon=${SORT_ICONS[sort]}></ha-icon>`}${l.t(SORT_LABELS[sort])}</ha-dropdown-item>`)}
        </ha-dropdown>
      </div>
      <div class="countline"><p role="status">${l.t("list.count_filtered", { shown: shown.length, total: items.length })}${filtered ? ` · ${l.t(TILES[this._filter].label)}` : ""}</p>
        ${filtered || this._query ? html`<button type="button" class="text-button" @click=${() => this._clear()}>${l.t("overview.clear_filter")}</button>` : nothing}</div>
      ${shown.length ? this._renderList(shown) : this._renderNoResults()}
    </div>
    <button type="button" class="fab" ?disabled=${this.blocked} @click=${() => this._emit("add-plant")}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("panel.add_plant")}</button>`;
  }

  private _renderTile(filter: OverviewFilter, count: number) {
    const tile = TILES[filter];
    return html`<button type="button" class="tile ${count === 0 ? "zero" : ""}" style="--tone:${tile.tone}" aria-pressed=${this._filter === filter ? "true" : "false"}
      @click=${() => { this._filter = this._filter === filter && filter !== "all" ? "all" : filter; }}>
      <span class="ico" aria-hidden="true"><ha-icon .icon=${tile.icon}></ha-icon></span>
      <span><span class="num">${this.l.number(count)}</span><span class="lbl">${this.l.t(tile.label)}</span></span></button>`;
  }

  private _renderList(items: CardItem[]) {
    if (this._sort !== "area") return html`<ul class="grid">${sortItems(items, this._sort).map(item => html`<li>${this._renderCard(item)}</li>`)}</ul>`;
    return groupByArea(items).map(group => html`<h2 class="group-heading"><ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>${group.area ?? this.l.t("overview.no_area")} <span class="n">· ${this.l.number(group.items.length)}</span></h2>
      <ul class="grid">${group.items.map(item => html`<li>${this._renderCard(item)}</li>`)}</ul>`);
  }

  private _renderCard(item: CardItem) {
    const l = this.l; const o = item.overview; const plant = item.plant;
    const chip = o ? chipText(l, o) : null;
    const reason = o ? cardReason(l, o, this.now) : "";
    const moisture = o?.roles.moisture;
    const others = o ? secondaryReadings(o) : [];
    const headingId = `plant-${plant.id}`;
    return html`<article class="card" aria-labelledby=${headingId}>
      <div class="head"><sp-plant-avatar .src=${this.thumbnails[plant.id] ?? null} .name=${plant.name} .l=${l}></sp-plant-avatar>
        <div class="title"><div role="heading" aria-level=${this._sort === "area" ? "3" : "2"}><button type="button" class="name" id=${headingId} @click=${() => this._emit("open-plant", { plantId: plant.id } satisfies OpenPlantDetail)}>${plant.name}</button></div>
          <span class="sub">${item.areaName ? html`<ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>${item.areaName}` : nothing}${item.areaName && item.species ? " · " : ""}${item.species ? html`<i>${item.species}</i>` : nothing}</span></div></div>
      ${o && chip ? html`<div class="status"><sp-status-chip .status=${o.status} .label=${chip.label} .more=${chip.more} .l=${l}></sp-status-chip>${reason ? html`<span class="reason">${reason}</span>` : nothing}</div>` : nothing}
      ${o && o.status === "no_sensors" && !others.length
        ? html`<div class="empty-box"><span>${l.t("card.no_sensors")}</span><button type="button" class="text-button" @click=${() => this._emit("open-plant", { plantId: plant.id, section: "sensors" } satisfies OpenPlantDetail)} aria-label=${l.t("card.assign_label", { name: plant.name })}>${l.t("card.assign")}</button></div>`
        : moisture || others.length ? html`<div class="readings">
          ${moisture ? html`<sp-moisture-bar .value=${moisture.value} .range=${moisture.range} .state=${moisture.state} .lastReported=${moisture.last_reported} .now=${this.now} .l=${l}></sp-moisture-bar>` : nothing}
          ${others.length ? html`<div class="chips">${others.map(([role, r]) => html`<sp-reading-chip .role=${role} .value=${r.value} .unit=${r.unit} .state=${r.state} .range=${r.range} .l=${l}></sp-reading-chip>`)}</div>` : nothing}
        </div>` : nothing}
      <div class="foot"><span class="last"><ha-icon aria-hidden="true" icon="mdi:history"></ha-icon>${wateredText(l, o?.last_watered_at ?? null, this.now)}</span>
        <button type="button" class="tonal" ?disabled=${this.blocked || this.watering.has(plant.id)} aria-label=${l.t("card.log_watering_label", { name: plant.name })} @click=${() => this._emit("log-watering", { plantId: plant.id })}><ha-icon aria-hidden="true" icon="mdi:water"></ha-icon>${l.t("card.log_watering")}</button></div>
    </article>`;
  }

  private _renderEmpty() {
    const l = this.l;
    return html`<sp-empty-state icon="mdi:sprout" .heading=${l.t("overview.empty_heading")}>${l.t("overview.empty_body")}
      <button slot="actions" type="button" class="filled" ?disabled=${this.blocked} @click=${() => this._emit("add-plant")}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("panel.add_plant")}</button>
      <a slot="actions" class="text-button" href=${DOCUMENTATION_URL} target="_blank" rel="noopener noreferrer">${l.t("overview.how_it_works")}</a></sp-empty-state>`;
  }

  private _renderNoResults() {
    const l = this.l;
    const body = this._query.trim() ? l.t("overview.no_match_query", { query: this._query.trim() }) : l.t("overview.no_match_filter", { filter: l.t(TILES[this._filter].label) });
    return html`<sp-empty-state class="no-results" compact icon="mdi:magnify-remove-outline" .heading=${l.t("overview.no_match_heading")}>${body}
      <button slot="actions" type="button" class="text-button" @click=${() => this._clear()}>${l.t("overview.show_all")}</button></sp-empty-state>`;
  }
}

if (!customElements.get("smart-plants-overview")) customElements.define("smart-plants-overview", SmartPlantsOverview);
declare global { interface HTMLElementTagNameMap { "smart-plants-overview": SmartPlantsOverview } }
