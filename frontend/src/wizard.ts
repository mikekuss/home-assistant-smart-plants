import { LitElement, html, nothing } from "lit";
import type { PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { api, ApiError } from "./api.js";
import { aggregationLabel, areaEditor, exposureLabel, moistureEditor, placementEditor, placementLabel, rainExposureLabel, snapshotView, textField, thresholdKeyLabel } from "./editors.js";
import { createLocalizer } from "./localize.js";
import type { Localizer, MessageKey } from "./localize.js";
import { builtin, canonicalMoisture, emptyMoisture, manualSpecies, tags, validateMoisture, validateTaxonomy } from "./model.js";
import { validateImage } from "./image.js";
import type { ImageInfo } from "./image.js";
import { styles } from "./styles.js";
import type { HAArea, HAEntity, HAState, HomeAssistantLike, PanelCapabilities, PlantPlacement, SpeciesSearchResult, WizardCreateInput, WizardDraft, WizardPreview } from "./types.js";

export class SmartPlantsWizard extends LitElement {
  static styles = styles;
  @property({ attribute: false }) hass!: HomeAssistantLike;
  @property({ attribute: false }) capabilities!: PanelCapabilities;
  @property({ attribute: false }) areas: HAArea[] = [];
  @property({ attribute: false }) entities: HAEntity[] = [];
  @property({ attribute: false }) states: Record<string, HAState> = {};
  @property({ type: Boolean }) blocked = false;
  @property({ type: Number }) navigationContext = 0;
  @state() private step = 0;
  @state() private busy = false;
  @state() private error = "";
  @state() private name = "";
  @state() private acquired = "";
  @state() private area = "";
  @state() private placement: PlantPlacement | null = null;
  @state() private category = "";
  @state() private tagText = "";
  @state() private common = "";
  @state() private latin = "";
  @state() private provider = "manual";
  @state() private query = "";
  @state() private results: SpeciesSearchResult[] = [];
  @state() private searched = false;
  @state() private preview: WizardPreview | null = null;
  @state() private accepted = false;
  @state() private moisture = emptyMoisture();
  @state() private all = false;
  @state() private draft: WizardDraft | null = null;
  @state() private finalRequest: WizardCreateInput | null = null;
  @state() private photo: File | null = null;
  @state() private photoInfo: ImageInfo | null = null;
  @state() private rejected = false;
  private generation = 0;
  private lifecycle = 0;
  private readonly steps: readonly MessageKey[] = ["wizard.step_basic", "wizard.step_species", "wizard.step_review_species", "wizard.step_sensors", "wizard.step_thresholds", "wizard.step_taxonomy", "wizard.step_review"];
  private get l(): Localizer { return createLocalizer(this.hass); }
  private get visibleSteps(): { index: number; label: string }[] {
    return this.steps.flatMap((key, index) => index === 2 && this.provider === "manual" ? [] : [{ index, label: this.l.t(key) }]);
  }

  connectedCallback(): void { super.connectedCallback(); if (!this.draft) void this.start(); }
  disconnectedCallback(): void { this.lifecycle++; this.generation++; this.busy = false; super.disconnectedCallback(); }
  protected willUpdate(changed: PropertyValues): void {
    const previousHass = changed.get("hass") as HomeAssistantLike | undefined;
    if ((changed.has("blocked") && this.blocked) || (previousHass && previousHass.connection !== this.hass.connection)) {
      this.lifecycle++; this.busy = false;
      this.generation++;
      if (!this.finalRequest) { this.preview = null; this.accepted = false; }
    }
  }
  private async start(): Promise<void> {
    if (this.busy || this.blocked) return;
    const lifecycle = this.lifecycle;
    this.busy = true;
    try { const draft = await api.startWizard(this.hass); if (lifecycle === this.lifecycle && this.isConnected) this.draft = draft; }
    catch (e) { if (lifecycle === this.lifecycle) this.fail(e); }
    finally { if (lifecycle === this.lifecycle) this.busy = false; }
  }
  private fail(e: unknown): void {
    const codes = ["integration_not_loaded", "unauthorized", "invalid_format", "invalid_response", "provider_disabled", "provider_authentication", "provider_rate_limit", "provider_timeout", "provider_outage", "provider_malformed_response", "not_found"];
    this.error = e instanceof ApiError && codes.includes(e.code) ? this.l.t("wizard.error_code", { code: e.code }) : this.l.t("wizard.error_generic");
    if (e instanceof ApiError && ["integration_not_loaded", "unauthorized"].includes(e.code)) this.dispatchEvent(new CustomEvent("backend-unavailable", { detail: this.error, bubbles: true, composed: true }));
  }
  private get defaults() { return { ...builtin, ...(this.accepted ? this.preview?.snapshot.threshold_defaults.moisture : {}) }; }
  private manual(): void { this.generation++; this.provider = "manual"; this.preview = null; this.accepted = false; this.results = []; this.error = ""; }
  private async search(): Promise<void> {
    if (this.busy || this.blocked || this.query.trim().length < 3) return;
    const lifecycle = this.lifecycle;
    const generation = ++this.generation; this.busy = true; this.error = ""; this.preview = null; this.accepted = false;
    try { const result = await api.searchSpecies(this.hass, this.provider, this.query.trim(), this.hass.language ?? "en"); if (generation === this.generation) { this.results = result; this.searched = true; } }
    catch (e) { if (generation === this.generation) this.fail(e); }
    finally { if (lifecycle === this.lifecycle) this.busy = false; }
  }
  private async choose(result: SpeciesSearchResult): Promise<void> {
    if (!this.draft || this.busy || this.blocked) return;
    const lifecycle = this.lifecycle;
    const generation = ++this.generation; this.busy = true; this.accepted = false; this.preview = null; this.error = "";
    try { const preview = await api.previewWizard(this.hass, this.draft, result.provider, result.provider_ref, this.hass.language ?? "en"); if (generation === this.generation) { this.preview = preview; this.step = 2; await this.focusStep(); } }
    catch (e) { if (generation === this.generation) this.fail(e); }
    finally { if (lifecycle === this.lifecycle) this.busy = false; }
  }
  private validate(): string | null {
    if (!this.name.trim() || this.name.trim().length > 200) return this.l.t("wizard.error_name_length");
    if (this.acquired && !Number.isFinite(Date.parse(this.acquired))) return this.l.t("wizard.error_acquired");
    if (this.area && !this.areas.some(a => a.area_id === this.area)) return this.l.t("wizard.error_area");
    if (this.provider !== "manual" && (!this.preview || !this.accepted)) return this.l.t("wizard.error_accept_preview");
    return validateMoisture(this.moisture, this.defaults, this.l) ?? validateTaxonomy(this.category, tags(this.tagText), this.l);
  }
  private async next(): Promise<void> {
    if (this.busy || this.blocked || !this.draft || this.step >= 6) return;
    const lifecycle = this.lifecycle;
    this.error = "";
    if (this.step === 0 && !this.name.trim()) this.error = this.l.t("wizard.error_name");
    if (this.step === 0 && this.photo && !this.error) {
      this.busy = true;
      try { const info = await validateImage(this.photo, this.l); if (lifecycle === this.lifecycle) this.photoInfo = info; }
      catch (e) { if (lifecycle === this.lifecycle) this.error = (e as Error).message; }
      finally { if (lifecycle === this.lifecycle) this.busy = false; }
      if (lifecycle !== this.lifecycle || !this.isConnected) return;
    }
    if (this.step === 1 && this.provider !== "manual" && !this.preview) this.error = this.l.t("wizard.error_choose_species");
    if (this.step === 2 && this.provider !== "manual" && !this.accepted) this.error = this.l.t("wizard.error_accept");
    if (this.step === 3) this.error = validateMoisture({ ...this.moisture, threshold_overrides: { min: null, target: null, max: null } }, builtin, this.l) ?? "";
    if (this.step === 4) this.error = validateMoisture(this.moisture, this.defaults, this.l) ?? "";
    if (this.step === 5) this.error = validateTaxonomy(this.category, tags(this.tagText), this.l) ?? "";
    if (!this.error) { this.step = this.step === 1 && this.provider === "manual" ? 3 : this.step + 1; await this.focusStep(); }
  }
  private async focusStep(): Promise<void> { await this.updateComplete; this.shadowRoot?.querySelector<HTMLElement>("h2")?.focus(); }
  private async create(): Promise<void> {
    if (this.busy || this.blocked || !this.draft) return;
    if (!this.finalRequest) {
      this.error = this.validate() ?? ""; if (this.error) return;
      this.finalRequest = structuredClone({ draft_id: this.draft.draft_id, draft_token: this.draft.draft_token, expected_revision: 0, confirmed: true, name: this.name.trim(), acquired_at: this.acquired ? new Date(this.acquired).toISOString() : null, area_id: this.area || null, placement: this.placement, category: this.category.trim() || null, tags: tags(this.tagText), moisture: canonicalMoisture(this.moisture, this.entities),
        ...(this.accepted && this.preview ? { accepted_preview: { preview_token: this.preview.preview_token, provider: this.preview.provider, operation: "select" as const } } : { species: manualSpecies(this.common, this.latin) }) });
    }
    this.busy = true; this.error = "";
    const lifecycle = this.lifecycle;
    const navigationContext = this.navigationContext;
    try {
      const plant = await api.createWizard(this.hass, this.finalRequest);
      if (lifecycle !== this.lifecycle || !this.isConnected) return;
      this.dispatchEvent(new CustomEvent("plant-created", { detail: { plant, photo: this.photo, navigationContext }, bubbles: true, composed: true }));
    } catch (e) { if (lifecycle === this.lifecycle) { this.fail(e); this.rejected = e instanceof ApiError && e.code === "invalid_format"; } }
    finally { if (lifecycle === this.lifecycle) this.busy = false; }
  }
  protected render() {
    const l = this.l; const unspecified = l.t("common.not_specified"); const none = l.t("common.none");
    const threshold = (k: "min" | "target" | "max") => this.moisture.threshold_overrides[k] ?? this.defaults[k];
    return html`<section class="wizard-card"><nav aria-label=${l.t("wizard.progress")}><ol class="stepper">${this.visibleSteps.map(({ index, label }, i) => html`<li aria-current=${index === this.step ? "step" : nothing}><span class="step-number">${l.number(i + 1)}</span><span>${label}</span></li>`)}</ol></nav>
      <h2 tabindex="-1">${l.t(this.steps[this.step]!)}</h2><p class="muted">${l.t("wizard.saved_after_confirmation")}</p>
      ${this.error ? html`<p class="error" role="alert">${this.error}</p>${(this.step === 1 || this.step === 2) && !this.finalRequest ? html`<button type="button" @click=${() => this.manual()}>${l.t("common.continue_manually")}</button>` : nothing}` : nothing}
      ${!this.draft && !this.busy ? html`<button @click=${() => void this.start()}>${l.t("wizard.retry_draft")}</button>` : nothing}
      <fieldset ?disabled=${this.busy || this.blocked || !!this.finalRequest}>
      ${this.step === 0 ? html`${textField(l.t("wizard.plant_name"), this.name, v => this.name = v)}${textField(l.t("wizard.acquired_date"), this.acquired, v => this.acquired = v, "date")}${areaEditor(l, this.area, this.areas, v => this.area = v)}${placementEditor(l, this.placement, v => this.placement = v)}<label>${l.t("wizard.photo")}<input type="file" accept="image/jpeg,image/png,image/webp" @change=${(e: Event) => { this.photo = (e.target as HTMLInputElement).files?.[0] ?? null; this.photoInfo = null; }}></label><small>${l.t("wizard.photo_hint")}</small>${this.photo ? html`<p>${l.t("wizard.photo_selected", { name: this.photo.name, bytes: this.photo.size })}</p><button @click=${() => { this.photo = null; this.photoInfo = null; const input = this.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]'); if (input) input.value = ""; }}>${l.t("wizard.photo_remove")}</button>` : nothing}` : nothing}
      ${this.step === 1 ? html`<div class="choice-cards" role="radiogroup" aria-label=${l.t("wizard.species_source")}>
        <button type="button" class=${this.provider === "manual" ? "choice-card selected" : "choice-card"} aria-pressed=${this.provider === "manual"} @click=${() => this.manual()}><strong>${l.t("wizard.manual_title")}</strong><span>${l.t("wizard.manual_description")}</span></button>
        ${this.capabilities.providers.some(p => p.provider === "openplantbook") ? html`<button type="button" class=${this.provider === "openplantbook" ? "choice-card selected" : "choice-card"} aria-pressed=${this.provider === "openplantbook"} ?disabled=${!this.capabilities.providers.some(p => p.provider === "openplantbook" && p.available)} @click=${() => { this.manual(); this.provider = "openplantbook"; }}><strong>${l.t("wizard.openplantbook_title")}</strong><span>${l.t("wizard.openplantbook_description")}</span></button>` : nothing}
      </div>
        ${this.capabilities.providers.some(p => p.provider === "openplantbook" && !p.available) ? html`<aside class="provider-help"><strong>${l.t("wizard.openplantbook_unavailable_title")}</strong><p>${l.t("wizard.openplantbook_unavailable_help")}</p><a href="https://open.plantbook.io/apikey/" target="_blank" rel="noreferrer">${l.t("wizard.openplantbook_credentials_link")}</a></aside>` : nothing}
        ${this.provider === "manual" ? html`<h3>${l.t("wizard.species_details")} <span class="muted">${l.t("wizard.optional")}</span></h3>${textField(l.t("species.common_name"), this.common, v => this.common = v)}${textField(l.t("species.scientific_name"), this.latin, v => this.latin = v)}<p class="default-summary">${l.t("wizard.builtin_defaults", { min: l.percent(builtin.min), target: l.percent(builtin.target), max: l.percent(builtin.max) })}</p>` : html`
        ${textField(l.t("wizard.search_label"), this.query, v => { this.query = v; this.generation++; this.results = []; this.preview = null; this.accepted = false; })}<button type="button" class="primary" @click=${() => void this.search()} ?disabled=${this.busy || this.query.trim().length < 3}>${l.t("wizard.search_button")}</button>${this.searched && !this.results.length ? html`<p>${l.t("wizard.no_matches")}</p>` : nothing}<ul class="result-list">${this.results.map(r => html`<li><button type="button" @click=${() => void this.choose(r)}>${r.common_name ?? r.latin_name} · ${r.latin_name}</button><small>${r.attribution}</small></li>`)}</ul><button type="button" @click=${() => this.manual()}>${l.t("wizard.manual_instead")}</button>`}` : nothing}
      ${this.step === 2 ? this.preview ? html`${snapshotView(l, this.preview.snapshot, this.preview)}<label class="check"><input type="checkbox" .checked=${this.accepted} @change=${(e: Event) => this.accepted = (e.target as HTMLInputElement).checked}>${l.t("wizard.accept_species")}</label><p>${l.t("wizard.imported_defaults_hint")}</p><button type="button" @click=${() => this.manual()}>${l.t("wizard.manual_instead")}</button>` : nothing : nothing}
       ${this.step === 3 ? moistureEditor(l, this.moisture, this.defaults, this.entities, this.states, this.all, v => this.all = v, v => this.moisture = v, "sources") : nothing}
       ${this.step === 4 ? html`<p class="default-summary">${l.t("wizard.effective_range")} <strong>${l.t("wizard.range_value", { min: l.percent(threshold("min")), max: l.percent(threshold("max")) })}</strong>${l.t("wizard.target_separator")}<strong>${l.percent(threshold("target"))}</strong>.</p><p>${this.accepted ? l.t("wizard.inherited_openplantbook") : l.t("wizard.inherited_builtin")}</p><details class="advanced-disclosure"><summary>${l.t("moisture.advanced_overrides")}</summary><p>${l.t("wizard.overrides_hint")}</p>${moistureEditor(l, this.moisture, this.defaults, this.entities, this.states, this.all, v => this.all = v, v => this.moisture = v, "thresholds")}</details>` : nothing}
      ${this.step === 5 ? html`${textField(l.t("taxonomy.category"), this.category, v => this.category = v, "text", 60)}${textField(l.t("taxonomy.tags"), this.tagText, v => this.tagText = v, "text", 2000)}<p>${l.t("wizard.taxonomy_hint")}</p>` : nothing}
      ${this.step === 6 ? html`<h3>${this.name}</h3><dl>
        <dt>${l.t("wizard.review_area")}</dt><dd>${this.areas.find(a => a.area_id === this.area)?.name ?? (this.area ? l.t("wizard.review_missing_area", { area: this.area }) : l.t("area.none"))}</dd>
        <dt>${l.t("placement.label")}</dt><dd>${this.placement?.mode ? placementLabel(l, this.placement.mode) : unspecified}</dd>
        <dt>${l.t("wizard.review_exposure")}</dt><dd>${this.placement?.exposure ? exposureLabel(l, this.placement.exposure) : unspecified} / ${this.placement?.rain_exposure ? rainExposureLabel(l, this.placement.rain_exposure) : unspecified}</dd>
        <dt>${l.t("container.label")}</dt><dd>${this.placement?.container === null || !this.placement ? unspecified : this.placement.container ? l.t("container.in_container") : l.t("container.in_ground")}</dd>
        <dt>${l.t("wizard.review_acquired")}</dt><dd>${this.acquired ? l.date(this.acquired) : unspecified}</dd>
        <dt>${l.t("species.heading")}</dt><dd>${this.accepted && this.preview ? [this.preview.snapshot.common_name, this.preview.snapshot.latin_name].filter(Boolean).join(" · ") : [this.common, this.latin].filter(Boolean).join(" · ") || l.t("common.no_species_selected")}</dd>
        <dt>${l.t("wizard.review_taxonomy")}</dt><dd>${this.category} / ${tags(this.tagText).join(", ")}</dd>
        <dt>${l.t("wizard.review_sources")}</dt><dd>${this.moisture.sources.map(s => s.entity_id).join(", ") || none}</dd>
        <dt>${l.t("wizard.review_primary_aggregation")}</dt><dd>${this.moisture.primary_entity_id ?? none} / ${aggregationLabel(l, this.moisture.aggregation)}</dd>
        <dt>${l.t("wizard.review_staleness")}</dt><dd>${l.t("wizard.review_seconds", { seconds: this.moisture.stale_after_seconds })}</dd>
        <dt>${l.t("wizard.review_thresholds")}</dt><dd>${(["min", "target", "max"] as const).map(k => l.t("wizard.review_threshold", { key: thresholdKeyLabel(l, k), value: l.percent(threshold(k)), source: this.moisture.threshold_overrides[k] === null ? l.t("wizard.inherited") : l.t("wizard.override") })).join(" · ")}</dd>
        <dt>${l.t("wizard.review_photo")}</dt><dd>${this.photo?.name ?? none}${this.photoInfo ? html` · ${l.t("wizard.review_photo_info", { format: this.photoInfo.format, width: this.photoInfo.width, height: this.photoInfo.height, bytes: this.photoInfo.bytes })}` : nothing}</dd>
        </dl><p>${l.t("wizard.confirm_hint")}</p>` : nothing}
      </fieldset>
      ${this.finalRequest ? html`<p class="notice">${l.t("wizard.final_request_retained")}</p>` : nothing}
      ${this.rejected ? html`<p>${l.t("wizard.rejected")}</p><button ?disabled=${this.busy || this.blocked} @click=${() => { this.finalRequest = null; this.rejected = false; this.preview = null; this.accepted = false; this.step = 0; this.error = ""; void this.start(); }}>${l.t("wizard.start_fresh")}</button>` : nothing}
      <div class="actions"><button @click=${() => { this.step = this.step === 3 && this.provider === "manual" ? 1 : this.step - 1; void this.focusStep(); }} ?disabled=${this.step === 0 || this.busy || !!this.finalRequest}>${l.t("wizard.previous")}</button>
      ${this.step < 6 ? html`<button class="primary" @click=${() => void this.next()} ?disabled=${this.busy || this.blocked || !this.draft}>${l.t("wizard.next")}</button>` : html`<button class="primary" @click=${() => void this.create()} ?disabled=${this.busy || this.blocked || !this.draft}>${this.finalRequest ? l.t("wizard.retry_create") : l.t("wizard.create")}</button>`}</div>
      <p role="status">${this.busy ? l.t("wizard.working") : ""}</p></section>`;
  }
}

// Home Assistant can request a new content-addressed bundle after the frontend
// document already registered the prior version's custom elements.
if (!customElements.get("smart-plants-wizard")) {
  customElements.define("smart-plants-wizard", SmartPlantsWizard);
}
