import { LitElement, html, nothing } from "lit";
import type { PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { api, ApiError } from "./api.js";
import { areaEditor, moistureEditor, placementEditor, snapshotView, textField } from "./editors.js";
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
  private readonly steps = ["Basic info", "Species and care", "Review species", "Moisture sensors", "Moisture thresholds", "Category and tags", "Review and create"];
  private get visibleSteps(): { index: number; label: string }[] {
    return this.steps.flatMap((label, index) => index === 2 && this.provider === "manual" ? [] : [{ index, label }]);
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
    this.error = e instanceof ApiError && codes.includes(e.code) ? `${e.code}: Request failed. Review input or retry when connected. Species can be entered manually; expired previews require a new review.` : "Request failed. Retry when connected.";
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
    if (!this.name.trim() || this.name.trim().length > 200) return "Enter a plant name (1–200 characters).";
    if (this.acquired && !Number.isFinite(Date.parse(this.acquired))) return "Enter a valid acquired date.";
    if (this.area && !this.areas.some(a => a.area_id === this.area)) return "The selected Home Assistant area no longer exists. Choose a current area or No area.";
    if (this.provider !== "manual" && (!this.preview || !this.accepted)) return "Review and explicitly accept the selected species preview, or continue manually.";
    return validateMoisture(this.moisture, this.defaults) ?? validateTaxonomy(this.category, tags(this.tagText));
  }
  private async next(): Promise<void> {
    if (this.busy || this.blocked || !this.draft || this.step >= 6) return;
    const lifecycle = this.lifecycle;
    this.error = "";
    if (this.step === 0 && !this.name.trim()) this.error = "Enter a plant name.";
    if (this.step === 0 && this.photo && !this.error) {
      this.busy = true;
      try { const info = await validateImage(this.photo); if (lifecycle === this.lifecycle) this.photoInfo = info; }
      catch (e) { if (lifecycle === this.lifecycle) this.error = (e as Error).message; }
      finally { if (lifecycle === this.lifecycle) this.busy = false; }
      if (lifecycle !== this.lifecycle || !this.isConnected) return;
    }
    if (this.step === 1 && this.provider !== "manual" && !this.preview) this.error = "Choose a species result or continue manually.";
    if (this.step === 2 && this.provider !== "manual" && !this.accepted) this.error = "Explicitly accept the preview or continue manually.";
    if (this.step === 3) this.error = validateMoisture({ ...this.moisture, threshold_overrides: { min: null, target: null, max: null } }, builtin) ?? "";
    if (this.step === 4) this.error = validateMoisture(this.moisture, this.defaults) ?? "";
    if (this.step === 5) this.error = validateTaxonomy(this.category, tags(this.tagText)) ?? "";
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
    return html`<section class="wizard-card"><nav aria-label="Creation progress"><ol class="stepper">${this.visibleSteps.map(({ index, label }, i) => html`<li aria-current=${index === this.step ? "step" : nothing}><span class="step-number">${i + 1}</span><span>${label}</span></li>`)}</ol></nav>
      <h2 tabindex="-1">${this.steps[this.step]}</h2><p class="muted">Your plant is saved only after the final confirmation. You can go back without losing your choices.</p>
      ${this.error ? html`<p class="error" role="alert">${this.error}</p>${(this.step === 1 || this.step === 2) && !this.finalRequest ? html`<button type="button" @click=${() => this.manual()}>Continue manually</button>` : nothing}` : nothing}
      ${!this.draft && !this.busy ? html`<button @click=${() => void this.start()}>Retry starting draft</button>` : nothing}
      <fieldset ?disabled=${this.busy || this.blocked || !!this.finalRequest}>
      ${this.step === 0 ? html`${textField("Plant name", this.name, v => this.name = v)}${textField("Acquired date", this.acquired, v => this.acquired = v, "date")}${areaEditor(this.area, this.areas, v => this.area = v)}${placementEditor(this.placement, v => this.placement = v)}<label>Optional local photo<input type="file" accept="image/jpeg,image/png,image/webp" @change=${(e: Event) => { this.photo = (e.target as HTMLInputElement).files?.[0] ?? null; this.photoInfo = null; }}></label><small>JPEG, PNG or WebP; 5 MiB, 2048 × 2048 maximum. Uploaded only after creation.</small>${this.photo ? html`<p>Selected: ${this.photo.name} (${this.photo.size} bytes)</p><button @click=${() => { this.photo = null; this.photoInfo = null; const input = this.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]'); if (input) input.value = ""; }}>Remove selected photo</button>` : nothing}` : nothing}
      ${this.step === 1 ? html`<div class="choice-cards" role="radiogroup" aria-label="Species source">
        <button type="button" class=${this.provider === "manual" ? "choice-card selected" : "choice-card"} aria-pressed=${this.provider === "manual"} @click=${() => this.manual()}><strong>Enter details myself</strong><span>Choose a species name or continue without one. Works offline.</span></button>
        ${this.capabilities.providers.some(p => p.provider === "openplantbook") ? html`<button type="button" class=${this.provider === "openplantbook" ? "choice-card selected" : "choice-card"} aria-pressed=${this.provider === "openplantbook"} ?disabled=${!this.capabilities.providers.some(p => p.provider === "openplantbook" && p.available)} @click=${() => { this.manual(); this.provider = "openplantbook"; }}><strong>Search OpenPlantBook</strong><span>Find a species, review imported information, then choose what to apply.</span></button>` : nothing}
      </div>
        ${this.capabilities.providers.some(p => p.provider === "openplantbook" && !p.available) ? html`<aside class="provider-help"><strong>OpenPlantBook is not connected</strong><p>Smart Plants connects directly to OpenPlantBook. Create an OpenPlantBook account and API client credentials, then add them in Home Assistant under Settings → Devices & services → Smart Plants → Configure. You do not need to install a separate Home Assistant integration.</p><a href="https://open.plantbook.io/apikey/" target="_blank" rel="noreferrer">Get OpenPlantBook API credentials</a></aside>` : nothing}
        ${this.provider === "manual" ? html`<h3>Species details <span class="muted">Optional</span></h3>${textField("Common name", this.common, v => this.common = v)}${textField("Scientific name", this.latin, v => this.latin = v)}<p class="default-summary">Moisture defaults come from Smart Plants: ${builtin.min}% minimum, ${builtin.target}% target, ${builtin.max}% maximum. You can review or adjust them later.</p>` : html`
        ${textField("Search OpenPlantBook (at least 3 characters)", this.query, v => { this.query = v; this.generation++; this.results = []; this.preview = null; this.accepted = false; })}<button type="button" class="primary" @click=${() => void this.search()} ?disabled=${this.busy || this.query.trim().length < 3}>Search plants</button>${this.searched && !this.results.length ? html`<p>No matches. Try another search or switch to manual entry.</p>` : nothing}<ul class="result-list">${this.results.map(r => html`<li><button type="button" @click=${() => void this.choose(r)}>${r.common_name ?? r.latin_name} · ${r.latin_name}</button><small>${r.attribution}</small></li>`)}</ul><button type="button" @click=${() => this.manual()}>Enter details manually instead</button>`}` : nothing}
      ${this.step === 2 ? this.preview ? html`${snapshotView(this.preview.snapshot, this.preview)}<label class="check"><input type="checkbox" .checked=${this.accepted} @change=${(e: Event) => this.accepted = (e.target as HTMLInputElement).checked}>I reviewed and accept this species information</label><p>Imported moisture defaults will be shown with their source. Missing values use Smart Plants defaults.</p><button type="button" @click=${() => this.manual()}>Enter details manually instead</button>` : nothing : nothing}
       ${this.step === 3 ? moistureEditor(this.moisture, this.defaults, this.entities, this.states, this.all, v => this.all = v, v => this.moisture = v, "sources") : nothing}
       ${this.step === 4 ? html`<p class="default-summary">Current effective range: <strong>${this.moisture.threshold_overrides.min ?? this.defaults.min}%–${this.moisture.threshold_overrides.max ?? this.defaults.max}%</strong>, target <strong>${this.moisture.threshold_overrides.target ?? this.defaults.target}%</strong>.</p><p>Values shown as inherited use ${this.accepted ? "reviewed OpenPlantBook data where supplied, otherwise Smart Plants defaults" : "Smart Plants built-in defaults"}.</p><details class="advanced-disclosure"><summary>Advanced threshold overrides</summary><p>Leave a value blank to inherit its current default.</p>${moistureEditor(this.moisture, this.defaults, this.entities, this.states, this.all, v => this.all = v, v => this.moisture = v, "thresholds")}</details>` : nothing}
      ${this.step === 5 ? html`${textField("Category", this.category, v => this.category = v, "text", 60)}${textField("Tags (comma-separated)", this.tagText, v => this.tagText = v, "text", 2000)}<p>Tags and category belong to Smart Plants, independently of Home Assistant labels.</p>` : nothing}
      ${this.step === 6 ? html`<h3>${this.name}</h3><dl>
        <dt>Area</dt><dd>${this.areas.find(a => a.area_id === this.area)?.name ?? (this.area ? `${this.area} (missing area)` : "No area")}</dd>
        <dt>Placement</dt><dd>${this.placement?.mode ?? "Not specified"}</dd>
        <dt>Sun / rain exposure</dt><dd>${this.placement?.exposure ?? "Not specified"} / ${this.placement?.rain_exposure ?? "Not specified"}</dd>
        <dt>Container</dt><dd>${this.placement?.container === null || !this.placement ? "Not specified" : this.placement.container ? "In a container" : "In the ground"}</dd>
        <dt>Acquired</dt><dd>${this.acquired || "Not specified"}</dd>
        <dt>Species</dt><dd>${this.accepted && this.preview ? [this.preview.snapshot.common_name, this.preview.snapshot.latin_name].filter(Boolean).join(" · ") : [this.common, this.latin].filter(Boolean).join(" · ") || "No species selected"}</dd>
        <dt>Category / tags</dt><dd>${this.category} / ${tags(this.tagText).join(", ")}</dd>
        <dt>Sources</dt><dd>${this.moisture.sources.map(s => s.entity_id).join(", ") || "None"}</dd>
        <dt>Primary / aggregation</dt><dd>${this.moisture.primary_entity_id ?? "None"} / ${this.moisture.aggregation}</dd>
        <dt>Staleness</dt><dd>${this.moisture.stale_after_seconds} seconds</dd>
        <dt>Effective thresholds</dt><dd>${(["min", "target", "max"] as const).map(k => `${k}: ${this.moisture.threshold_overrides[k] ?? this.defaults[k]}% (${this.moisture.threshold_overrides[k] === null ? "inherited" : "override"})`).join(" · ")}</dd>
        <dt>Photo</dt><dd>${this.photo?.name ?? "None"}${this.photoInfo ? html` · ${this.photoInfo.format} · ${this.photoInfo.width} × ${this.photoInfo.height} pixels · ${this.photoInfo.bytes} bytes` : nothing}</dd>
        </dl><p>Confirming creates one plant device and its moisture entities. You can configure notifications in Home Assistant afterwards.</p>` : nothing}
      </fieldset>
      ${this.finalRequest ? html`<p class="notice">The final request is retained unchanged. Retry it to resolve an uncertain result safely, including after reconnect. Do not start a replacement draft until the result is resolved.</p>` : nothing}
      ${this.rejected ? html`<p>The server rejected the request as invalid or expired. You may correct it using a fresh draft; species data must be previewed and accepted again.</p><button ?disabled=${this.busy || this.blocked} @click=${() => { this.finalRequest = null; this.rejected = false; this.preview = null; this.accepted = false; this.step = 0; this.error = ""; void this.start(); }}>Start fresh draft retaining editable fields</button>` : nothing}
      <div class="actions"><button @click=${() => { this.step = this.step === 3 && this.provider === "manual" ? 1 : this.step - 1; void this.focusStep(); }} ?disabled=${this.step === 0 || this.busy || !!this.finalRequest}>Previous step</button>
      ${this.step < 6 ? html`<button class="primary" @click=${() => void this.next()} ?disabled=${this.busy || this.blocked || !this.draft}>Next step</button>` : html`<button class="primary" @click=${() => void this.create()} ?disabled=${this.busy || this.blocked || !this.draft}>${this.finalRequest ? "Retry same creation request" : "Confirm and create plant"}</button>`}</div>
      <p role="status">${this.busy ? "Working…" : ""}</p></section>`;
  }
}

// Home Assistant can request a new content-addressed bundle after the frontend
// document already registered the prior version's custom elements.
if (!customElements.get("smart-plants-wizard")) {
  customElements.define("smart-plants-wizard", SmartPlantsWizard);
}
