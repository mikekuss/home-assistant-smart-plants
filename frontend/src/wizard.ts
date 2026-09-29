import { LitElement, css, html, nothing } from "lit";
import type { PropertyValues, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { api, ApiError } from "./api.js";
import { placementLabel, snapshotView } from "./editors.js";
import { isDefined } from "./ha-elements.js";
import type { HaElement } from "./ha-elements.js";
import { createLocalizer } from "./localize.js";
import type { Localizer } from "./localize.js";
import { builtin, canonicalMoisture, emptyMoisture, keys, manualSpecies, placements, resolveSource, roleSourceSpec, tags, validateMoisture, validateTaxonomy } from "./model.js";
import type { SourceRole } from "./model.js";
import { prepareImage } from "./image.js";
import { READING_ROLES, ROLE_META, formatValue, readingLabel } from "./status.js";
import type { ReadingRole } from "./status.js";
import { srOnly, themeFallbacks } from "./components/shared-styles.js";
import type { HAArea, HADevice, HAEntity, HAState, HomeAssistantLike, MoistureInput, PanelCapabilities, PlantPlacement, PlantRecord, SensorSource, SpeciesSearchResult, WizardCreateInput, WizardDraft, WizardPreview } from "./types.js";

// Steps of the add-plant flow; 4 is the confirmation shown after creation.
type Step = 1 | 2 | 3 | 4;
type Section = "species" | "details";
interface ExtraSensor { role: SourceRole; entity_id: string }
interface Suggestion { role: ReadingRole; entity_id: string; name: string }

const WIZARD_ELEMENTS: readonly HaElement[] = ["ha-area-picker", "ha-entity-picker", "ha-selector", "ha-alert", "ha-expansion-panel", "ha-dropdown", "ha-dropdown-item"];
const EXTRA_ROLES = READING_ROLES.filter((role): role is SourceRole => role !== "moisture");
const INTEGRATION_OPTIONS = "/config/integrations/integration/smart_plants";
const CREDENTIALS_URL = "https://open.plantbook.io/apikey/";

// The create-plant flow: name, area and photo; sensors; review with optional
// species, targets and details. Nothing is stored before "Create plant". The
// final request is built once and resent unchanged on retry, so an uncertain
// result can never create a second plant.
export class SmartPlantsWizard extends LitElement {
  static styles = [themeFallbacks, srOnly, css`
    :host { display: block; container-type: inline-size; color: var(--sp-text);
      --sp-primary-strong: color-mix(in srgb, var(--sp-primary) 78%, #000);
      /* Secondary text a little darker than the theme's so it keeps 4.5:1 on tinted rows and filled fields. */
      --wz-muted: color-mix(in srgb, var(--sp-text-secondary) 78%, var(--sp-text));
      --wz-divider: var(--divider-color, #e0e0e0);
      --wz-card: var(--ha-card-background, var(--card-background-color, #fff));
      --wz-fill: var(--input-fill-color, color-mix(in srgb, var(--sp-text) 5%, var(--wz-card)));
      --wz-tonal: color-mix(in srgb, var(--sp-primary) 12%, transparent);
      --wz-tonal-fg: color-mix(in srgb, var(--sp-primary) 65%, var(--sp-text));
      --wz-off: color-mix(in srgb, var(--sp-text) 7%, transparent); }
    * { box-sizing: border-box; }
    button, input, select { font: inherit; color: inherit; }
    :focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    h2[tabindex]:focus { outline: none; }
    ha-icon { --mdc-icon-size: 20px; flex: none; }
    p { margin: 0; }
    .wz { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; hyphens: auto; overflow-wrap: anywhere; }
    .stepline { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--wz-muted); }
    .stepline b { color: var(--sp-text); font-weight: 500; }
    .bars { display: flex; gap: 8px; }
    .bars span { flex: 1; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--sp-text) 10%, transparent); }
    .bars span.on { background: var(--sp-primary); }
    .card { background: var(--wz-card); border: 1px solid var(--ha-card-border-color, var(--wz-divider)); border-radius: var(--ha-card-border-radius, 12px); padding: 20px; }
    h2 { font-size: 22px; font-weight: 400; line-height: 1.25; margin: 0 0 4px; }
    .intro { color: var(--wz-muted); margin: 0 0 16px; }
    .stack { display: flex; flex-direction: column; gap: 14px; }
    .muted { color: var(--wz-muted); }
    .small { font-size: 12.5px; }

    /* Filled text fields in the style of Home Assistant's inputs. */
    .field { position: relative; display: block; min-height: 56px; padding: 7px 12px 0; border-radius: 4px 4px 0 0; background: var(--wz-fill);
      border-bottom: 1px solid var(--input-idle-line-color, #8a8a8a); font-size: 12px; color: var(--wz-muted); cursor: text; }
    .field:focus-within { border-bottom: 2px solid var(--sp-primary); color: color-mix(in srgb, var(--sp-primary) 70%, var(--sp-text)); }
    .field input, .field select { display: block; width: 100%; min-height: 32px; margin: 0; padding: 2px 0 6px; border: 0; background: transparent; outline: none; font-size: 16px; color: var(--sp-text); }
    .field select { appearance: none; padding-inline-end: 28px; cursor: pointer; }
    .field select option, .field select optgroup { color: var(--sp-text); background: var(--wz-card); }
    .field .trail { position: absolute; inset-inline-end: 10px; top: 18px; color: var(--wz-muted); pointer-events: none; }
    .field .suffix { display: flex; align-items: center; gap: 4px; font-size: 16px; color: var(--sp-text); }
    .field .suffix input { flex: 1; min-width: 0; }
    .field > label { display: block; cursor: inherit; }
    .helper { font-size: 12px; color: var(--wz-muted); padding: 4px 12px 0; }
    ha-area-picker, ha-entity-picker, ha-selector { display: block; }

    .drop { display: flex; align-items: center; gap: 14px; padding: 16px; border: 1.5px dashed var(--wz-divider); border-radius: 12px; }
    .drop.has { border-style: solid; }
    .drop.over { border-color: var(--sp-primary); background: var(--wz-tonal); }
    .drop:focus-within { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    .drop label { display: flex; align-items: center; gap: 14px; flex: 1; cursor: pointer; }
    .drop ha-icon { --mdc-icon-size: 28px; color: var(--wz-tonal-fg); }
    .drop .grow { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .drop img { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; flex: none; }

    .caption { margin: 6px 0 0; font-size: 12px; font-weight: 400; letter-spacing: .05em; text-transform: uppercase; color: var(--wz-muted); }
    .rows { display: flex; flex-direction: column; gap: 8px; }
    .item { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 10px; }
    .item.sugg { border: 1px solid var(--wz-divider); }
    .item.assigned { background: var(--wz-tonal); }
    .item .ic { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--wz-off); color: var(--wz-muted); }
    .item.assigned .ic { background: var(--wz-card); color: var(--wz-tonal-fg); }
    .item.pending { grid-template-columns: minmax(0, 1fr) auto; padding: 0; }
    .add-another { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
    .role-menu { display: flex; flex-wrap: wrap; gap: 6px; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 0 18px; border: 0; border-radius: 20px; cursor: pointer;
      font-size: 14px; font-weight: 500; white-space: nowrap; background: transparent; color: var(--wz-tonal-fg); text-decoration: none; }
    .btn ha-icon { --mdc-icon-size: 18px; }
    .btn.filled { background: var(--sp-primary-strong); color: var(--text-primary-color, #fff); }
    .btn.text { padding: 0 12px; }
    .btn.text:hover:not(:disabled) { background: color-mix(in srgb, var(--sp-primary) 10%, transparent); }
    .btn.outline { border: 1px solid var(--wz-divider); }
    .btn.sm { min-height: 32px; padding: 0 14px; font-size: 13px; }
    .btn.flush { padding: 0; min-height: 32px; align-self: flex-start; }
    .btn:disabled { opacity: .5; cursor: default; }
    .iconbtn { width: 40px; height: 40px; display: inline-grid; place-items: center; border: 0; border-radius: 50%; background: transparent; cursor: pointer; color: var(--sp-text); }
    .iconbtn:hover { background: color-mix(in srgb, var(--sp-text) 6%, transparent); }

    .actions { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .actions .end { display: flex; gap: 10px; margin-inline-start: auto; }

    .review { display: flex; flex-direction: column; }
    .li { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 0; min-height: 60px; }
    .li + .li { border-top: 1px solid var(--wz-divider); }
    .li .ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--wz-tonal); color: var(--wz-tonal-fg); }
    .li .p { font-size: 15px; }
    .li .s { font-size: 13px; color: var(--wz-muted); }
    .sections { display: flex; flex-direction: column; gap: 14px; margin-top: 12px; }

    .expander { display: block; border-radius: 12px; background: var(--wz-card); --expansion-panel-summary-padding: 4px 16px; --expansion-panel-content-padding: 0 16px; }
    ha-expansion-panel.expander .expander-body { padding: 12px 0 16px; }
    details.expander { border: 1px solid var(--wz-divider); }
    details.expander > summary { display: flex; align-items: center; gap: 14px; padding: 12px 16px; min-height: 56px; cursor: pointer; list-style: none; }
    details.expander > summary::-webkit-details-marker { display: none; }
    .summary-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .summary-title { font-weight: 500; }
    .summary-sub { font-size: 12.5px; color: var(--wz-muted); }
    details.expander > .expander-body { padding: 0 16px 16px; }
    .expander-body { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
    .expander-body h3 { margin: 4px 0 0; font-size: 14px; font-weight: 500; }
    .thr { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; border: 0; margin: 0; padding: 0; min-width: 0; }
    .thr legend { padding: 0; margin-bottom: 8px; font-size: 14px; font-weight: 500; }
    .two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: start; }
    .search { display: flex; gap: 10px; align-items: flex-start; }
    .search .field { flex: 1; }
    .search .btn { margin-top: 8px; }
    .results { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .results li { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border: 1px solid var(--wz-divider); border-radius: 10px; }
    .results li:hover { border-color: var(--sp-primary); }
    .results button { text-align: start; padding: 0; border: 0; background: transparent; cursor: pointer; font-weight: 500; color: var(--wz-tonal-fg); }
    .results small { color: var(--wz-muted); font-size: 12px; }
    .preview { border: 1px solid var(--wz-divider); border-radius: 10px; padding: 12px 14px; }
    .preview article { display: flex; flex-direction: column; gap: 6px; }
    .preview h3, .preview h4 { margin: 4px 0 0; font-size: 14px; font-weight: 500; }
    .preview dl { display: grid; grid-template-columns: minmax(90px, 1fr) 2fr; gap: 2px 12px; margin: 0; font-size: 13px; }
    .preview dt { color: var(--wz-muted); }
    .preview dd { margin: 0; }
    .preview details > summary { cursor: pointer; font-size: 13px; color: var(--primary-color); padding: 4px 0; }
    .preview details[open] > summary { margin-bottom: 6px; }
    .preview .muted { color: var(--wz-muted); }
    .check { display: flex; align-items: center; gap: 10px; font-weight: 500; cursor: pointer; }
    .check input { width: 20px; height: 20px; margin: 0; accent-color: var(--sp-primary-strong); }
    .species-chip { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; background: var(--wz-tonal); }
    .species-chip .grow { flex: 1; min-width: 0; }

    ha-alert { display: block; }
    .alert { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 8px; font-size: 13.5px; color: var(--sp-text); }
    .alert.warning { background: color-mix(in srgb, var(--sp-warning) 18%, transparent); }
    .alert.info { background: color-mix(in srgb, var(--sp-info) 14%, transparent); }
    .alert.warning > ha-icon { color: color-mix(in srgb, var(--sp-warning) 60%, var(--sp-text)); }
    .alert.info > ha-icon { color: color-mix(in srgb, var(--sp-info) 60%, var(--sp-text)); }
    .alert b { font-weight: 500; }
    .alert-links { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 6px; }
    .alert-links a, a.link { color: var(--wz-tonal-fg); font-weight: 500; }
    .error { padding: 12px 14px; border-radius: 8px; border-inline-start: 4px solid var(--sp-error); background: color-mix(in srgb, var(--sp-error) 8%, transparent); color: var(--sp-text); }
    .notice { padding: 12px 14px; border-radius: 8px; border-inline-start: 4px solid var(--sp-warning); background: color-mix(in srgb, var(--sp-warning) 10%, transparent); }
    .status:empty { display: none; }

    .done { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 20px; text-align: center; }
    .done .big { width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center;
      background: color-mix(in srgb, var(--sp-success) 16%, transparent); color: color-mix(in srgb, var(--sp-success) 55%, var(--sp-text)); }
    .done .big ha-icon { --mdc-icon-size: 40px; }
    .done h2 { margin: 6px 0 0; }
    .done p { max-width: 46ch; color: var(--wz-muted); }
    .done .row { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 8px; }

    @container (max-width: 600px) {
      .stepline .all { display: none; }
      .card { padding: 16px; }
      .thr, .two { grid-template-columns: minmax(0, 1fr); }
      /* The action row stays reachable at the bottom of the screen while the step scrolls. */
      .actions { position: sticky; bottom: 0; z-index: 2; padding: 10px 0 calc(10px + env(safe-area-inset-bottom, 0px)); background: var(--primary-background-color, var(--wz-card)); }
    }
  `];

  @property({ attribute: false }) hass!: HomeAssistantLike;
  @property({ attribute: false }) capabilities!: PanelCapabilities;
  @property({ attribute: false }) areas: HAArea[] = [];
  // The area picker lists the areas from hass.areas. Accept those too, so a
  // choice from the picker is not reported as missing while the panel's own
  // registry request is failing or still loading.
  private get knownAreas(): HAArea[] {
    const known = new Map(this.areas.map(a => [a.area_id, a]));
    for (const [id, a] of Object.entries(this.hass?.areas ?? {})) {
      if (!known.has(id) && a && a.area_id === id && typeof a.name === "string") known.set(id, { area_id: id, name: a.name });
    }
    return [...known.values()];
  }
  @property({ attribute: false }) entities: HAEntity[] = [];
  @property({ attribute: false }) devices: HADevice[] = [];
  @property({ attribute: false }) states: Record<string, HAState> = {};
  @property({ type: Boolean }) blocked = false;
  @property({ type: Number }) navigationContext = 0;
  // Upload progress of the created plant's photo, reported by the panel.
  @property() photoStatus = "";
  @state() private step: Step = 1;
  @state() private busy = false;
  @state() private error = "";
  @state() private name = "";
  @state() private area = "";
  @state() private photo: File | null = null;
  @state() private photoUrl: string | null = null;
  @state() private photoError = "";
  @state() private photoChecking = false;
  @state() private dragging = false;
  @state() private moisture: MoistureInput = emptyMoisture();
  @state() private extras: ExtraSensor[] = [];
  @state() private pendingRole: SourceRole | null = null;
  @state() private roleMenu = false;
  @state() private expanded: ReadonlySet<Section> = new Set();
  // Sections opened at least once keep their content rendered.
  @state() private opened: ReadonlySet<Section> = new Set();
  @state() private query = "";
  @state() private results: SpeciesSearchResult[] = [];
  @state() private searched = false;
  @state() private preview: WizardPreview | null = null;
  @state() private accepted = false;
  @state() private speciesError = "";
  @state() private common = "";
  @state() private latin = "";
  @state() private acquired = "";
  @state() private placement = "";
  @state() private category = "";
  @state() private tagText = "";
  @state() private draft: WizardDraft | null = null;
  @state() private finalRequest: WizardCreateInput | null = null;
  @state() private rejected = false;
  @state() private created: PlantRecord | null = null;
  private generation = 0;
  private lifecycle = 0;
  private photoCheck = 0;
  private entityById = new Map<string, HAEntity>();
  private areaOfEntity = new Map<string, string>();
  private get l(): Localizer { return createLocalizer(this.hass); }

  connectedCallback(): void {
    super.connectedCallback();
    for (const tag of WIZARD_ELEMENTS) if (!isDefined(tag)) void customElements.whenDefined(tag).then(() => this.requestUpdate());
    if (this.photo && !this.photoUrl) this.photoUrl = URL.createObjectURL(this.photo);
    if (!this.draft && !this.created) void this.start();
  }
  disconnectedCallback(): void {
    this.lifecycle++; this.generation++; this.busy = false;
    // The thumbnail's object URL is recreated if the retained wizard is shown again.
    if (this.photoUrl) { URL.revokeObjectURL(this.photoUrl); this.photoUrl = null; }
    super.disconnectedCallback();
  }
  protected willUpdate(changed: PropertyValues): void {
    const previousHass = changed.get("hass") as HomeAssistantLike | undefined;
    if ((changed.has("blocked") && this.blocked) || (previousHass && previousHass.connection !== this.hass.connection)) {
      this.lifecycle++; this.busy = false;
      this.generation++;
      if (!this.finalRequest) { this.preview = null; this.accepted = false; }
    }
    if (changed.has("entities") || changed.has("devices")) {
      this.entityById = new Map(this.entities.map(e => [e.entity_id, e]));
      const deviceArea = new Map(this.devices.map(d => [d.id, d.area_id]));
      this.areaOfEntity = new Map(this.entities.flatMap(e => { const area = e.area_id || (e.device_id ? deviceArea.get(e.device_id) : null); return area ? [[e.entity_id, area] as [string, string]] : []; }));
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
  private message(e: unknown): string {
    const codes = ["integration_not_loaded", "unauthorized", "invalid_format", "invalid_response", "provider_disabled", "provider_authentication", "provider_rate_limit", "provider_timeout", "provider_outage", "provider_malformed_response", "not_found"];
    return e instanceof ApiError && codes.includes(e.code) ? this.l.t("wizard.error_code", { code: e.code }) : this.l.t("wizard.error_generic");
  }
  private fail(e: unknown, species = false): void {
    const text = this.message(e);
    if (species) this.speciesError = text; else this.error = text;
    if (e instanceof ApiError && ["integration_not_loaded", "unauthorized"].includes(e.code)) this.dispatchEvent(new CustomEvent("backend-unavailable", { detail: text, bubbles: true, composed: true }));
  }
  private emit(type: string): void { this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true })); }

  // Species and targets
  private get defaults(): typeof builtin { return { ...builtin, ...(this.accepted ? this.preview?.snapshot.threshold_defaults.moisture : {}) }; }
  private get providerInfo() { return this.capabilities.providers.find(p => p.provider === "openplantbook"); }
  private manual(): void { this.generation++; this.preview = null; this.accepted = false; this.results = []; this.searched = false; this.speciesError = ""; }
  private async search(): Promise<void> {
    if (this.busy || this.blocked || this.query.trim().length < 3) return;
    const lifecycle = this.lifecycle;
    const generation = ++this.generation; this.busy = true; this.speciesError = ""; this.preview = null; this.accepted = false;
    try { const result = await api.searchSpecies(this.hass, "openplantbook", this.query.trim(), this.hass.language ?? "en"); if (generation === this.generation) { this.results = result; this.searched = true; } }
    catch (e) { if (generation === this.generation) this.fail(e, true); }
    finally { if (lifecycle === this.lifecycle) this.busy = false; }
  }
  private async choose(result: SpeciesSearchResult): Promise<void> {
    if (!this.draft || this.busy || this.blocked) return;
    const lifecycle = this.lifecycle;
    const generation = ++this.generation; this.busy = true; this.accepted = false; this.preview = null; this.speciesError = "";
    try { const preview = await api.previewWizard(this.hass, this.draft, result.provider, result.provider_ref, this.hass.language ?? "en"); if (generation === this.generation) this.preview = preview; }
    catch (e) { if (generation === this.generation) this.fail(e, true); }
    finally { if (lifecycle === this.lifecycle) this.busy = false; }
  }
  private setOverride(key: typeof keys[number], raw: string): void {
    this.moisture = { ...this.moisture, threshold_overrides: { ...this.moisture.threshold_overrides, [key]: raw.trim() === "" ? null : Number(raw) } };
  }

  // Sensors
  private stateOf(id: string): HAState | undefined { return this.states[id]; }
  private friendly(id: string): string {
    const name = this.stateOf(id)?.attributes.friendly_name;
    return typeof name === "string" && name.trim() ? name : id;
  }
  private valueText(id: string): string {
    const s = this.stateOf(id);
    if (!s || ["unknown", "unavailable", ""].includes(s.state)) return this.l.t("wizard.sensor_unavailable");
    const unit = typeof s.attributes.unit_of_measurement === "string" ? s.attributes.unit_of_measurement : "";
    const value = Number(s.state);
    return Number.isFinite(value) ? formatValue(this.l, value, unit) : s.state;
  }
  // Whether a sensor state can feed a role: its device class and unit match
  // what the role's evaluator accepts. The plant's own computed sensors never do.
  private fits(role: ReadingRole, s: HAState): boolean {
    if (!s.entity_id.startsWith("sensor.") || this.entityById.get(s.entity_id)?.platform === "smart_plants") return false;
    const deviceClass = s.attributes.device_class; const unit = s.attributes.unit_of_measurement;
    if (role === "moisture") return deviceClass === "moisture";
    const spec = roleSourceSpec(role);
    return !!spec && deviceClass === spec.deviceClass && typeof unit === "string" && spec.acceptedUnits.includes(unit);
  }
  // The role a sensor most likely measures. Temperature sensors named after
  // the soil are offered as soil temperature.
  private roleFor(s: HAState): ReadingRole | null {
    const role = READING_ROLES.find(r => r !== "soil_temperature" && this.fits(r, s)) ?? null;
    if (role === "temperature" && /soil|boden/i.test(`${s.entity_id} ${this.friendly(s.entity_id)}`)) return "soil_temperature";
    return role;
  }
  private get assignedIds(): string[] { return [...this.moisture.sources.map(s => s.entity_id), ...this.extras.map(x => x.entity_id)]; }
  private get takenRoles(): Set<ReadingRole> { return new Set<ReadingRole>([...(this.moisture.sources.length ? ["moisture" as const] : []), ...this.extras.map(x => x.role)]); }
  private source(id: string): SensorSource { return { entity_id: id, registry_id: this.entityById.get(id)?.id ?? null }; }
  private assign(role: ReadingRole, id: string): void {
    if (!id || this.assignedIds.includes(id)) return;
    if (role === "moisture") this.moisture = { ...this.moisture, sources: [this.source(id)], primary_entity_id: id };
    else this.extras = [...this.extras.filter(x => x.role !== role), { role, entity_id: id }];
    if (this.pendingRole === role) this.pendingRole = null;
  }
  private unassign(role: ReadingRole): void {
    if (role === "moisture") this.moisture = { ...this.moisture, sources: [], primary_entity_id: null };
    else this.extras = this.extras.filter(x => x.role !== role);
  }
  private suggestions(): Suggestion[] {
    if (!this.area) return [];
    const taken = this.takenRoles; const assigned = new Set(this.assignedIds);
    return Object.values(this.states).flatMap(s => {
      if (assigned.has(s.entity_id) || this.areaOfEntity.get(s.entity_id) !== this.area) return [];
      const role = this.roleFor(s);
      return role && !taken.has(role) ? [{ role, entity_id: s.entity_id, name: this.friendly(s.entity_id) }] : [];
    }).sort((a, b) => READING_ROLES.indexOf(a.role) - READING_ROLES.indexOf(b.role) || a.name.localeCompare(b.name));
  }

  // Photo
  private async pickPhoto(file: File | null | undefined): Promise<void> {
    this.clearPhoto();
    if (!file) return;
    const check = ++this.photoCheck; this.photoChecking = true;
    try {
      const prepared = await prepareImage(file, this.l);
      if (check !== this.photoCheck) return;
      this.photo = prepared; this.photoUrl = URL.createObjectURL(prepared);
    } catch (e) { if (check === this.photoCheck) this.photoError = (e as Error).message; }
    finally { if (check === this.photoCheck) this.photoChecking = false; }
  }
  private clearPhoto(): void {
    this.photoCheck++; this.photoChecking = false;
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
    this.photo = null; this.photoUrl = null; this.photoError = "";
  }

  // Navigation
  private async go(step: Step): Promise<void> {
    this.step = step; this.roleMenu = false;
    await this.updateComplete; this.shadowRoot?.querySelector<HTMLElement>("h2")?.focus();
  }
  private async next(): Promise<void> {
    if (this.busy || this.blocked || !this.draft) return;
    this.error = "";
    if (this.step === 1) {
      if (!this.name.trim()) { this.error = this.l.t("wizard.error_name"); return; }
      if (this.photoChecking) return;
      await this.go(2);
    } else if (this.step === 2) await this.go(3);
  }
  private back(): void {
    if (this.busy || this.finalRequest) return;
    this.error = "";
    if (this.step === 2 || this.step === 3) void this.go(this.step === 3 ? 2 : 1);
  }
  private toggle(section: Section, open: boolean): void {
    if (open) this.opened = new Set([...this.opened, section]);
    const next = new Set(this.expanded);
    if (open) next.add(section); else next.delete(section);
    this.expanded = next;
  }
  private validate(): string | null {
    const l = this.l;
    if (!this.name.trim() || this.name.trim().length > 200) return l.t("wizard.error_name_length");
    if (this.area && !this.knownAreas.some(a => a.area_id === this.area)) return l.t("wizard.error_area");
    if (this.preview && !this.accepted) { this.toggle("species", true); return l.t("wizard.error_accept_preview"); }
    if (validateMoisture(this.moisture, this.defaults, l)) { this.toggle("species", true); return l.t("wizard.error_targets"); }
    if (this.acquired && !Number.isFinite(Date.parse(this.acquired))) { this.toggle("details", true); return l.t("wizard.error_acquired"); }
    const taxonomy = validateTaxonomy(this.category, tags(this.tagText), l);
    if (taxonomy) this.toggle("details", true);
    return taxonomy;
  }
  private request(draft: WizardDraft): WizardCreateInput {
    const roles = Object.fromEntries(this.extras.map(({ role, entity_id }) => {
      const entry = resolveSource(this.source(entity_id), this.entities);
      const source = entry ? { entity_id: entry.entity_id, registry_id: entry.id } : { entity_id, registry_id: null };
      return [role, { sources: [source], primary_entity_id: source.entity_id }];
    }));
    const placement: PlantPlacement | null = this.placement ? { mode: this.placement, exposure: null, rain_exposure: null, container: null } : null;
    return structuredClone({ draft_id: draft.draft_id, draft_token: draft.draft_token, expected_revision: 0, confirmed: true, name: this.name.trim(), acquired_at: this.acquired ? new Date(this.acquired).toISOString() : null, area_id: this.area || null, placement, category: this.category.trim() || null, tags: tags(this.tagText), moisture: canonicalMoisture(this.moisture, this.entities),
      ...(this.extras.length ? { roles } : {}),
      ...(this.accepted && this.preview ? { accepted_preview: { preview_token: this.preview.preview_token, provider: this.preview.provider, operation: "select" as const } } : { species: manualSpecies(this.common, this.latin) }) });
  }
  private async create(): Promise<void> {
    if (this.busy || this.blocked || !this.draft) return;
    if (!this.finalRequest) {
      this.error = this.validate() ?? ""; if (this.error) return;
      this.finalRequest = this.request(this.draft);
    }
    this.busy = true; this.error = "";
    const lifecycle = this.lifecycle;
    const navigationContext = this.navigationContext;
    try {
      const plant = await api.createWizard(this.hass, this.finalRequest);
      if (lifecycle !== this.lifecycle || !this.isConnected) return;
      this.created = plant; this.step = 4;
      this.dispatchEvent(new CustomEvent("plant-created", { detail: { plant, photo: this.photo, navigationContext }, bubbles: true, composed: true }));
      await this.updateComplete; this.shadowRoot?.querySelector<HTMLElement>("h2")?.focus();
    } catch (e) { if (lifecycle === this.lifecycle) { this.fail(e); this.rejected = e instanceof ApiError && e.code === "invalid_format"; } }
    finally { if (lifecycle === this.lifecycle) this.busy = false; }
  }
  // After a definite rejection the user may start over with a fresh draft;
  // species data must be previewed and accepted again.
  private startFresh(): void {
    this.finalRequest = null; this.rejected = false; this.preview = null; this.accepted = false; this.results = []; this.searched = false; this.error = ""; this.draft = null;
    void this.go(1); void this.start();
  }
  private restart(): void {
    this.lifecycle++; this.generation++; this.busy = false;
    this.clearPhoto();
    Object.assign(this, { name: "", area: "", moisture: emptyMoisture(), extras: [], pendingRole: null, roleMenu: false, expanded: new Set(), opened: new Set(), query: "", results: [], searched: false, preview: null, accepted: false, speciesError: "", common: "", latin: "", acquired: "", placement: "", category: "", tagText: "", draft: null, finalRequest: null, rejected: false, created: null, error: "" });
    this.emit("wizard-restart");
    void this.go(1); void this.start();
  }

  protected render() {
    const l = this.l;
    if (this.step === 4 && this.created) return this.renderDone();
    const names = [l.t("wizard.step_plant"), l.t("wizard.step_sensors"), l.t("wizard.step_review")];
    const locked = this.busy || this.blocked || !!this.finalRequest;
    const primary = this.step === 3
      ? html`<button type="button" class="btn filled" ?disabled=${this.busy || this.blocked || !this.draft} @click=${() => void this.create()}><ha-icon aria-hidden="true" icon="mdi:check"></ha-icon>${this.finalRequest ? l.t("wizard.retry_create") : l.t("wizard.create")}</button>`
      : html`<button type="button" class="btn filled" ?disabled=${this.busy || this.blocked || !this.draft || this.photoChecking} @click=${() => void this.next()}>${this.step === 2 && !this.assignedIds.length ? l.t("wizard.skip") : l.t("wizard.next")}</button>`;
    return html`<div class="wz" lang=${l.language}>
      <div class="stepline"><span>${l.t("wizard.step_of", { step: this.step, total: 3, name: names[this.step - 1]! })}</span>
        <span class="all" aria-hidden="true">${names.map((n, i) => html`${i ? " · " : ""}${i + 1 === this.step ? html`<b>${n}</b>` : n}`)}</span></div>
      <div class="bars" aria-hidden="true">${[1, 2, 3].map(i => html`<span class=${i <= this.step ? "on" : ""}></span>`)}</div>
      <div class="card">
        <fieldset style="border:0;margin:0;padding:0;min-width:0" ?disabled=${locked}>
          ${this.step === 1 ? this.renderPlant() : this.step === 2 ? this.renderSensors() : this.renderReview()}
        </fieldset>
        ${this.error ? html`<p class="error" role="alert" style="margin-top:14px">${this.error}</p>` : nothing}
        ${!this.draft && !this.busy ? html`<p style="margin-top:14px"><button type="button" class="btn outline sm" @click=${() => void this.start()}>${l.t("wizard.retry_draft")}</button></p>` : nothing}
        ${this.finalRequest ? html`<p class="notice" style="margin-top:14px">${l.t("wizard.final_request_retained")}</p>` : nothing}
        ${this.rejected ? html`<p style="margin-top:14px">${l.t("wizard.rejected")}</p><p style="margin-top:8px"><button type="button" class="btn outline sm" ?disabled=${this.busy || this.blocked} @click=${() => this.startFresh()}>${l.t("wizard.start_fresh")}</button></p>` : nothing}
      </div>
      <div class="actions">
        ${this.step === 1
          ? html`<button type="button" class="btn text" ?disabled=${this.busy} @click=${() => this.emit("wizard-close")}>${l.t("common.cancel")}</button>`
          : html`<button type="button" class="btn text" ?disabled=${this.busy || !!this.finalRequest} @click=${() => this.back()}>${l.t("wizard.back")}</button>`}
        <span class="end">${primary}</span>
      </div>
      <p class="status small muted" role="status">${this.busy ? l.t("wizard.working") : ""}</p>
    </div>`;
  }

  private renderPlant() {
    const l = this.l;
    const areaPicker = isDefined("ha-area-picker") && this.hass
      ? html`<ha-area-picker .hass=${this.hass} .label=${l.t("wizard.area")} .value=${this.area || undefined} .noAdd=${true} .disabled=${this.busy || this.blocked} @value-changed=${(e: CustomEvent<{ value?: string }>) => { this.area = e.detail.value ?? ""; }}></ha-area-picker>`
      : html`<div class="field"><label for="area">${l.t("wizard.area")}</label><select id="area" aria-describedby="area-helper" @change=${(e: Event) => { this.area = (e.target as HTMLSelectElement).value; }}>
          <option value="" ?selected=${!this.area}>${l.t("wizard.no_area")}</option>
          ${this.area && !this.knownAreas.some(a => a.area_id === this.area) ? html`<option value=${this.area} selected>${l.t("area.missing_option", { area: this.area })}</option>` : nothing}
          ${this.knownAreas.map(a => html`<option value=${a.area_id} ?selected=${a.area_id === this.area}>${a.name}</option>`)}</select><ha-icon class="trail" aria-hidden="true" icon="mdi:menu-down"></ha-icon></div>`;
    return html`<h2 tabindex="-1">${l.t("wizard.plant_heading")}</h2><p class="intro">${l.t("wizard.plant_intro")}</p>
      <div class="stack">
        <label class="field">${l.t("wizard.plant_name")}<input required maxlength="200" autocomplete="off" .value=${this.name} @input=${(e: Event) => { this.name = (e.target as HTMLInputElement).value; }} @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") void this.next(); }}></label>
        <div>${areaPicker}<div class="helper" id="area-helper">${l.t("wizard.area_helper")}</div></div>
        ${this.renderPhoto()}
      </div>`;
  }

  private renderPhoto() {
    const l = this.l;
    const drag = (e: DragEvent, over: boolean) => { e.preventDefault(); this.dragging = over; };
    return html`<div class="drop ${this.photo ? "has" : ""} ${this.dragging ? "over" : ""}" @dragover=${(e: DragEvent) => drag(e, true)} @dragleave=${(e: DragEvent) => drag(e, false)}
        @drop=${(e: DragEvent) => { drag(e, false); if (!this.busy && !this.blocked) void this.pickPhoto(e.dataTransfer?.files?.[0]); }}>
      ${this.photo && this.photoUrl ? html`<img src=${this.photoUrl} alt="">
          <div class="grow"><span>${this.photo.name}</span><span class="small muted">${l.t("wizard.photo_pending")}</span></div>
          <button type="button" class="btn text sm" aria-label=${l.t("wizard.photo_remove_label")} @click=${() => this.clearPhoto()}>${l.t("wizard.photo_remove")}</button>`
        : html`<label><ha-icon aria-hidden="true" icon="mdi:camera-plus-outline"></ha-icon>
          <span class="grow"><span>${l.t("wizard.photo_add")} <span class="muted">${l.t("wizard.photo_optional")}</span></span><span class="small muted" id="photo-hint">${this.photoChecking ? l.t("wizard.photo_checking") : l.t("wizard.photo_hint")}</span></span>
          <input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label=${l.t("wizard.photo_label")} aria-describedby="photo-hint" @change=${(e: Event) => { const input = e.target as HTMLInputElement; void this.pickPhoto(input.files?.[0]); input.value = ""; }}></label>`}
      </div>${this.photoError ? html`<p class="error" role="alert">${this.photoError}</p>` : nothing}`;
  }

  private sensorPicker(role: ReadingRole, label: string) {
    const l = this.l; const exclude = this.assignedIds;
    if (isDefined("ha-entity-picker") && this.hass) {
      return html`<ha-entity-picker .hass=${this.hass} .label=${label} .placeholder=${l.t("wizard.search_sensors")} .value=${""} .includeDomains=${["sensor"]} .excludeEntities=${exclude}
        .entityFilter=${(s: HAState) => this.fits(role, s)} @value-changed=${(e: CustomEvent<{ value?: string }>) => { if (e.detail.value) this.assign(role, e.detail.value); }}></ha-entity-picker>`;
    }
    const candidates = Object.values(this.states).filter(s => !exclude.includes(s.entity_id) && this.fits(role, s))
      .map(s => ({ id: s.entity_id, text: `${this.friendly(s.entity_id)} · ${this.valueText(s.entity_id)}`, near: !!this.area && this.areaOfEntity.get(s.entity_id) === this.area }))
      .sort((a, b) => a.text.localeCompare(b.text));
    const near = candidates.filter(c => c.near); const other = candidates.filter(c => !c.near);
    const areaName = this.knownAreas.find(a => a.area_id === this.area)?.name;
    const option = (c: { id: string; text: string }) => html`<option value=${c.id}>${c.text}</option>`;
    return html`<div class="field"><label for="sensor-${role}">${label}</label><select id="sensor-${role}" @change=${(e: Event) => this.assign(role, (e.target as HTMLSelectElement).value)}>
        <option value="" selected>${candidates.length ? l.t("wizard.choose_sensor") : l.t("wizard.no_suitable_sensors")}</option>
        ${near.length && areaName ? html`<optgroup label=${l.t("wizard.group_in_area", { area: areaName })}>${near.map(option)}</optgroup><optgroup label=${l.t("wizard.group_other")}>${other.map(option)}</optgroup>` : candidates.map(option)}
      </select><ha-icon class="trail" aria-hidden="true" icon="mdi:menu-down"></ha-icon></div>`;
  }

  private assignedRow(role: ReadingRole, id: string) {
    const l = this.l; const name = this.friendly(id);
    return html`<div class="item assigned"><span class="ic" aria-hidden="true"><ha-icon .icon=${ROLE_META[role].icon}></ha-icon></span>
      <div><div>${name}</div><div class="small muted">${l.t("wizard.sensor_reading", { role: readingLabel(l, role), value: this.valueText(id) })}</div></div>
      <button type="button" class="iconbtn" aria-label=${l.t("wizard.remove_sensor", { name })} @click=${() => this.unassign(role)}><ha-icon aria-hidden="true" icon="mdi:close"></ha-icon></button></div>`;
  }

  private renderSensors() {
    const l = this.l;
    const moisture = this.moisture.sources[0]?.entity_id;
    const areaName = this.knownAreas.find(a => a.area_id === this.area)?.name;
    const suggestions = this.suggestions();
    const free = EXTRA_ROLES.filter(role => !this.takenRoles.has(role) && role !== this.pendingRole);
    return html`<h2 tabindex="-1">${l.t("wizard.sensors_heading")}</h2><p class="intro">${l.t("wizard.sensors_intro")}</p>
      <div class="stack">
        ${moisture ? this.assignedRow("moisture", moisture) : this.sensorPicker("moisture", l.t("wizard.moisture_sensor"))}
        ${this.extras.length ? html`<div class="rows">${this.extras.map(x => this.assignedRow(x.role, x.entity_id))}</div>` : nothing}
        ${this.pendingRole ? html`<div class="item pending"><div>${this.sensorPicker(this.pendingRole, l.t("wizard.role_sensor", { role: readingLabel(l, this.pendingRole) }))}</div>
          <button type="button" class="iconbtn" aria-label=${l.t("wizard.discard_role", { role: readingLabel(l, this.pendingRole) })} @click=${() => { this.pendingRole = null; }}><ha-icon aria-hidden="true" icon="mdi:close"></ha-icon></button></div>` : nothing}
        ${areaName ? html`<h3 class="caption">${l.t("wizard.suggested", { area: areaName })}</h3>
          ${suggestions.length ? html`<div class="rows">${suggestions.map(s => html`<div class="item sugg"><span class="ic" aria-hidden="true"><ha-icon .icon=${ROLE_META[s.role].icon}></ha-icon></span>
            <div><div>${s.name}</div><div class="small muted">${l.t("wizard.sensor_reading", { role: readingLabel(l, s.role), value: this.valueText(s.entity_id) })}</div></div>
            <button type="button" class="btn text sm" aria-label=${l.t("wizard.add_label", { name: s.name })} @click=${() => this.assign(s.role, s.entity_id)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("wizard.add")}</button></div>`)}</div>`
            : html`<p class="small muted">${l.t("wizard.no_suggestions", { area: areaName })}</p>`}` : nothing}
        ${free.length ? html`<div class="add-another">${this.renderRoleMenu(free)}<span class="small muted">${l.t("wizard.add_another_hint")}</span></div>` : nothing}
      </div>`;
  }

  private renderRoleMenu(roles: SourceRole[]) {
    const l = this.l;
    const trigger = (slot: boolean) => html`<button type="button" class="btn outline sm" slot=${slot ? "trigger" : nothing} aria-expanded=${slot ? nothing : String(this.roleMenu)} @click=${slot ? nothing : () => { this.roleMenu = !this.roleMenu; }}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("wizard.add_another")}</button>`;
    if (isDefined("ha-dropdown") && isDefined("ha-dropdown-item")) {
      return html`<ha-dropdown @wa-select=${(e: CustomEvent<{ item: { value: string } }>) => { const role = e.detail.item.value; if ((EXTRA_ROLES as readonly string[]).includes(role)) this.pendingRole = role as SourceRole; }}>
        ${trigger(true)}${roles.map(role => html`<ha-dropdown-item value=${role}><ha-icon slot="icon" .icon=${ROLE_META[role].icon}></ha-icon>${readingLabel(l, role)}</ha-dropdown-item>`)}</ha-dropdown>`;
    }
    return html`${trigger(false)}${this.roleMenu ? html`<div class="role-menu">${roles.map(role => html`<button type="button" class="btn outline sm" @click=${() => { this.pendingRole = role; this.roleMenu = false; }}><ha-icon aria-hidden="true" .icon=${ROLE_META[role].icon}></ha-icon>${readingLabel(l, role)}</button>`)}</div>` : nothing}`;
  }

  private alert(type: "warning" | "info", body: TemplateResult | string, title = "") {
    if (isDefined("ha-alert")) return html`<ha-alert alert-type=${type} .title=${title}>${body}</ha-alert>`;
    return html`<div class="alert ${type}" role=${type === "warning" ? "alert" : "note"}><ha-icon aria-hidden="true" icon=${type === "warning" ? "mdi:alert-outline" : "mdi:information-outline"}></ha-icon><div>${title ? html`<b>${title}</b> ` : nothing}${body}</div></div>`;
  }

  // Home Assistant's expansion panel when available, a native disclosure
  // otherwise. The panel measures its content right after announcing that it
  // will open, so the content is rendered on that announcement and kept.
  private expander(key: Section, icon: string, header: string, secondary: string, content: () => TemplateResult) {
    const open = this.expanded.has(key);
    if (isDefined("ha-expansion-panel")) {
      return html`<ha-expansion-panel class="expander" data-section=${key} outlined .header=${header} .secondary=${secondary} .expanded=${open}
        @expanded-will-change=${(e: CustomEvent<{ expanded: boolean }>) => { if (e.target === e.currentTarget && e.detail.expanded) this.opened = new Set([...this.opened, key]); }}
        @expanded-changed=${(e: CustomEvent<{ expanded: boolean }>) => { if (e.target === e.currentTarget) this.toggle(key, e.detail.expanded); }}>
        <ha-icon slot="leading-icon" aria-hidden="true" .icon=${icon}></ha-icon>
        ${open || this.opened.has(key) ? html`<div class="expander-body">${content()}</div>` : nothing}</ha-expansion-panel>`;
    }
    return html`<details class="expander" data-section=${key} ?open=${open} @toggle=${(e: Event) => { const now = (e.currentTarget as HTMLDetailsElement).open; if (now !== open) this.toggle(key, now); }}>
      <summary><ha-icon aria-hidden="true" .icon=${icon}></ha-icon><span class="summary-text"><span class="summary-title">${header}</span><span class="summary-sub">${secondary}</span></span><ha-icon aria-hidden="true" icon=${open ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon></summary>
      ${open ? html`<div class="expander-body">${content()}</div>` : nothing}</details>`;
  }

  private renderReview() {
    const l = this.l;
    const moisture = this.moisture.sources[0]?.entity_id;
    const areaName = this.area ? this.knownAreas.find(a => a.area_id === this.area)?.name ?? l.t("area.missing_option", { area: this.area }) : l.t("wizard.no_area");
    const d = this.defaults; const eff = (k: typeof keys[number]) => this.moisture.threshold_overrides[k] ?? d[k];
    const species = this.accepted && this.preview ? this.preview.snapshot.latin_name ?? this.preview.snapshot.common_name : [this.common.trim(), this.latin.trim()].filter(Boolean).join(" · ");
    const speciesSummary = this.accepted && species ? l.t("wizard.species_summary_accepted", { species })
      : species ? l.t("wizard.species_summary_manual", { species, min: l.percent(eff("min")), max: l.percent(eff("max")) })
      : l.t("wizard.species_summary_default", { min: l.percent(eff("min")), max: l.percent(eff("max")) });
    return html`<h2 tabindex="-1">${l.t("wizard.review_heading")}</h2><p class="intro" style="margin-bottom:8px">${l.t("wizard.review_intro")}</p>
      <div class="review">
        <div class="li"><span class="ic" aria-hidden="true"><ha-icon icon="mdi:sprout"></ha-icon></span><div><div class="p">${this.name.trim()}</div><div class="s">${areaName}${this.photo ? ` · ${l.t("wizard.with_photo")}` : ""}</div></div>
          <button type="button" class="btn text sm" aria-label=${l.t("wizard.edit_plant")} @click=${() => void this.go(1)}>${l.t("wizard.edit")}</button></div>
        <div class="li"><span class="ic" aria-hidden="true"><ha-icon icon="mdi:access-point"></ha-icon></span><div><div class="p">${moisture ? this.friendly(moisture) : l.t("wizard.no_moisture")}</div><div class="s">${this.extras.length ? this.extras.map(x => this.friendly(x.entity_id)).join(", ") : l.t("wizard.no_other_sensors")}</div></div>
          <button type="button" class="btn text sm" aria-label=${l.t("wizard.edit_sensors")} @click=${() => void this.go(2)}>${l.t("wizard.edit")}</button></div>
      </div>
      ${moisture ? nothing : html`<div style="margin-top:6px">${this.alert("warning", l.t("wizard.no_moisture_warning"))}</div>`}
      <div class="sections">
        ${this.expander("species", "mdi:leaf", l.t("wizard.species_section"), speciesSummary, () => this.renderSpecies())}
        ${this.expander("details", "mdi:tag-outline", l.t("wizard.details_section"), l.t("wizard.details_summary"), () => this.renderDetails())}
      </div>`;
  }

  private renderSpecies() {
    const l = this.l; const provider = this.providerInfo; const d = this.defaults;
    const overridden = keys.some(k => this.moisture.threshold_overrides[k] !== null);
    const labels = { min: l.t("wizard.target_min"), target: l.t("wizard.target_ideal"), max: l.t("wizard.target_max") };
    const search = provider?.available ? this.accepted && this.preview ? html`<div class="species-chip"><ha-icon aria-hidden="true" icon="mdi:leaf"></ha-icon>
        <div class="grow"><div><i>${this.preview.snapshot.latin_name}</i>${this.preview.snapshot.common_name && this.preview.snapshot.common_name !== this.preview.snapshot.latin_name ? ` · ${this.preview.snapshot.common_name}` : ""}</div><div class="small muted">${this.preview.snapshot.attribution}</div></div>
        <button type="button" class="btn text sm" @click=${() => this.manual()}>${l.t("wizard.remove_species")}</button></div>`
      : html`<div class="search"><label class="field">${l.t("wizard.species_search")}<input type="search" autocomplete="off" aria-describedby="search-hint" .value=${this.query}
          @input=${(e: Event) => { this.query = (e.target as HTMLInputElement).value; this.generation++; this.results = []; this.searched = false; this.preview = null; this.accepted = false; }}
          @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void this.search(); } }}></label>
          <button type="button" class="btn outline" ?disabled=${this.busy || this.query.trim().length < 3} @click=${() => void this.search()}><ha-icon aria-hidden="true" icon="mdi:magnify"></ha-icon>${l.t("wizard.search_button")}</button></div>
        <span class="helper" id="search-hint" style="padding-top:0;margin-top:-8px">${l.t("wizard.search_hint")}</span>
        ${this.speciesError ? html`<p class="error" role="alert">${this.speciesError}</p><button type="button" class="btn text sm flush" @click=${() => this.manual()}>${l.t("common.continue_manually")}</button>` : nothing}
        ${this.searched && !this.results.length ? html`<p class="small muted">${l.t("wizard.no_matches")}</p>` : nothing}
        ${this.results.length && !this.preview ? html`<ul class="results" aria-label=${l.t("wizard.results")}>${this.results.map(r => html`<li><button type="button" @click=${() => void this.choose(r)}>${r.common_name ?? r.latin_name} · ${r.latin_name}</button><small>${r.attribution}</small></li>`)}</ul>` : nothing}
        ${this.preview ? html`<div class="preview">${snapshotView(l, this.preview.snapshot)}</div>
          <label class="check"><input type="checkbox" .checked=${this.accepted} @change=${(e: Event) => { this.accepted = (e.target as HTMLInputElement).checked; this.error = ""; }}>${l.t("wizard.accept_species")}</label>
          <button type="button" class="btn text sm flush" @click=${() => this.manual()}>${l.t("wizard.remove_species")}</button>` : nothing}`
      : provider ? this.alert("info", html`${l.t("wizard.provider_unavailable_body")}<span class="alert-links"><a href=${INTEGRATION_OPTIONS} @click=${(e: Event) => { e.preventDefault(); history.pushState(null, "", INTEGRATION_OPTIONS); window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } })); }}>${l.t("wizard.open_options")}</a><a href=${CREDENTIALS_URL} target="_blank" rel="noreferrer">${l.t("wizard.openplantbook_credentials_link")}</a></span>`, l.t("wizard.provider_unavailable_title"))
      : nothing;
    return html`${search}
      ${this.accepted || this.preview ? nothing : html`<h3>${l.t("wizard.manual_species")}</h3><div class="two">
        <label class="field">${l.t("species.common_name")}<input maxlength="200" .value=${this.common} @input=${(e: Event) => { this.common = (e.target as HTMLInputElement).value; }}></label>
        <label class="field">${l.t("species.scientific_name")}<input maxlength="200" .value=${this.latin} @input=${(e: Event) => { this.latin = (e.target as HTMLInputElement).value; }}></label></div>`}
      <fieldset class="thr"><legend>${l.t("wizard.targets_label")}</legend>
        ${keys.map(k => html`<div class="field"><label for="target-${k}">${labels[k]}</label><span class="suffix"><input id="target-${k}" type="number" min="1" max="99" step="1" inputmode="numeric" .value=${String(this.moisture.threshold_overrides[k] ?? d[k])}
          @input=${(e: Event) => this.setOverride(k, (e.target as HTMLInputElement).value)}
          @change=${(e: Event) => { const input = e.target as HTMLInputElement; if (!input.value.trim()) input.value = String(d[k]); }}><span aria-hidden="true">%</span></span></div>`)}
      </fieldset>
      <p class="helper" style="padding:0">${this.accepted ? l.t("wizard.targets_species") : l.t("wizard.targets_default")}</p>
      ${overridden ? html`<button type="button" class="btn text sm flush" @click=${() => { this.moisture = { ...this.moisture, threshold_overrides: { min: null, target: null, max: null } }; }}>${l.t("wizard.targets_reset")}</button>` : nothing}`;
  }

  private renderDetails() {
    const l = this.l;
    const language = this.hass?.locale?.language ?? this.hass?.language ?? l.language;
    const date = isDefined("ha-selector") && this.hass
      ? html`<ha-selector .hass=${this.hass} .selector=${{ date: {} }} .label=${l.t("wizard.acquired_date")} .value=${this.acquired || undefined} .required=${false} @value-changed=${(e: CustomEvent<{ value?: string | null }>) => { this.acquired = e.detail.value ?? ""; }}></ha-selector>`
      : html`<label class="field">${l.t("wizard.acquired_date")}<input type="date" lang=${language} .value=${this.acquired} @input=${(e: Event) => { this.acquired = (e.target as HTMLInputElement).value; }}></label>`;
    const capital = (text: string) => text.charAt(0).toLocaleUpperCase(language) + text.slice(1);
    return html`<div class="two">
      ${date}
      <div class="field"><label for="placement">${l.t("placement.label")}</label><select id="placement" @change=${(e: Event) => { this.placement = (e.target as HTMLSelectElement).value; }}>
        <option value="" ?selected=${!this.placement}>${l.t("common.not_specified")}</option>
        ${placements.map(p => html`<option value=${p} ?selected=${p === this.placement}>${capital(placementLabel(l, p))}</option>`)}</select><ha-icon class="trail" aria-hidden="true" icon="mdi:menu-down"></ha-icon></div>
      <label class="field">${l.t("taxonomy.category")}<input maxlength="60" .value=${this.category} @input=${(e: Event) => { this.category = (e.target as HTMLInputElement).value; }}></label>
      <div><label class="field">${l.t("wizard.tags")}<input maxlength="2000" aria-describedby="tags-hint" .value=${this.tagText} @input=${(e: Event) => { this.tagText = (e.target as HTMLInputElement).value; }}></label><div class="helper" id="tags-hint">${l.t("wizard.tags_hint")}</div></div>
    </div>`;
  }

  private renderDone() {
    const l = this.l; const plant = this.created!;
    const areaName = this.area ? this.knownAreas.find(a => a.area_id === this.area)?.name : undefined;
    return html`<div class="wz" lang=${l.language}><div class="card done">
      <div class="big" aria-hidden="true"><ha-icon icon="mdi:check"></ha-icon></div>
      <h2 tabindex="-1">${l.t("wizard.done_heading", { name: plant.name })}</h2>
      <p>${areaName ? l.t("wizard.done_body_area", { area: areaName }) : l.t("wizard.done_body")}</p>
      <p class="small" role="status">${this.photoStatus}</p>
      <div class="row"><button type="button" class="btn filled" @click=${() => this.dispatchEvent(new CustomEvent("wizard-open-plant", { detail: { plantId: plant.id }, bubbles: true, composed: true }))}>${l.t("wizard.open_plant")}</button>
        <button type="button" class="btn outline" @click=${() => this.emit("wizard-close")}>${l.t("wizard.back_to_plants")}</button>
        <button type="button" class="btn outline" ?disabled=${this.blocked} @click=${() => this.restart()}>${l.t("wizard.add_another_plant")}</button></div>
    </div></div>`;
  }
}

// Home Assistant can request a new content-addressed bundle after the frontend
// document already registered the prior version's custom elements.
if (!customElements.get("smart-plants-wizard")) {
  customElements.define("smart-plants-wizard", SmartPlantsWizard);
}
declare global { interface HTMLElementTagNameMap { "smart-plants-wizard": SmartPlantsWizard } }
