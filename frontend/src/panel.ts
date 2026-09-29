import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { PropertyValues } from "lit";
import { api, ApiError } from "./api.js";
import type { UpdatePlantInput } from "./api.js";
import { aggregationLabel, areaEditor, moistureEditor, placementEditor, placementLabel, roleSourcesEditor, selectField, snapshotView, textField } from "./editors.js";
import { createLocalizer, isMessageKey } from "./localize.js";
import type { Localizer, MessageKey } from "./localize.js";
import { CO2_STRESS_BUILTIN_DEFAULTS, CO2_STRESS_KEYS, CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS, CONDUCTIVITY_STRESS_KEYS, HUMIDITY_STRESS_BUILTIN_DEFAULTS, HUMIDITY_STRESS_KEYS, LOW_BATTERY_STRESS_BUILTIN_DEFAULTS, LOW_BATTERY_STRESS_KEYS, LOW_LIGHT_STRESS_BUILTIN_DEFAULTS, LOW_LIGHT_STRESS_KEYS, SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS, SOIL_TEMPERATURE_STRESS_KEYS, TEMPERATURE_STRESS_BUILTIN_DEFAULTS, TEMPERATURE_STRESS_KEYS, builtin, canonicalMoisture, co2StressInput, conductivityStressInput, confidenceGloss, confidenceLabel, contributorLabel, effectiveThresholds, humidityStressInput, keys, lowBatteryInput, lowLightInput, manualSpecies, moistureInput, moistureRole, plantDevice, problemBinaries, resolveSource, roleSourceConfig, roleSourceInput, roleSourceSpec, ROLE_SOURCE_SPECS, canonicalRoleSources, validateRoleSources, soilTemperatureStressInput, tags, temperatureStressInput, validateCo2StressOverrides, validateConductivityStressOverrides, validateHumidityStressOverrides, validateLowBatteryOverrides, validateLowLightOverrides, validateMoisture, validateSoilTemperatureStressOverrides, validateTaxonomy, validateTemperatureStressOverrides } from "./model.js";
import type { ProblemBinaryRole, SourceRole } from "./model.js";
import "./components/index.js";
import { themeFallbacks } from "./components/shared-styles.js";
import { isDefined } from "./ha-elements.js";
import { chipText } from "./overview-model.js";
import { ROLE_META, formatValue, readingLabel, relativeTime } from "./status.js";
import { CARE_ICONS, CARE_KINDS, DETAIL_SECTIONS, SECTION_LABELS, careDetails, expander, formatDuration, friendlyName, headerReason, readingPhrase, plantStyles, readingsInOrder, renderKeyReadings, renderReadingRow } from "./views/plant.js";
import type { DetailSection } from "./views/plant.js";

// Per-role editable-threshold configuration. Adding a role here + wiring
// _persistedOverrides + validator + seeder registers a reviewed editor.
interface ThresholdEditorSpec {
  readonly problemRole: ProblemBinaryRole;   // the stress-binary role name (edit target)
  readonly configRole: string;               // the config-owner role name (WebSocket payload)
  readonly keys: readonly string[];
  readonly defaults: Record<string, number>;
  readonly unit: string;
  readonly min: string;
  readonly max: string;
  readonly step: string;
  readonly labels: Record<string, MessageKey>;   // per-key label, `{unit}` placeholder
  readonly validate: (input: Record<string, string>, l: Localizer) => { values: Record<string, number | null>; error: string | null };
  readonly seed: (persisted: Partial<Record<string, number | null>> | null | undefined) => Record<string, string>;
}
const THRESHOLD_EDITORS: readonly ThresholdEditorSpec[] = [
  {
    problemRole: "temperature_stress",
    configRole: "temperature",
    keys: TEMPERATURE_STRESS_KEYS,
    defaults: TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
    unit: "°C",
    min: "-40", max: "80", step: "0.1",
    labels: { cold_threshold_celsius: "threshold_field.cold_trigger", cold_clear_celsius: "threshold_field.cold_clear", hot_clear_celsius: "threshold_field.hot_clear", hot_threshold_celsius: "threshold_field.hot_trigger" },
    validate: (input, l) => validateTemperatureStressOverrides(input as never, l),
    seed: persisted => temperatureStressInput(persisted as never),
  },
  {
    problemRole: "humidity_stress",
    configRole: "humidity",
    keys: HUMIDITY_STRESS_KEYS,
    defaults: HUMIDITY_STRESS_BUILTIN_DEFAULTS,
    unit: "%",
    min: "0", max: "100", step: "0.1",
    labels: { dry_threshold_percent: "threshold_field.dry_trigger", dry_clear_percent: "threshold_field.dry_clear", damp_clear_percent: "threshold_field.damp_clear", damp_threshold_percent: "threshold_field.damp_trigger" },
    validate: (input, l) => validateHumidityStressOverrides(input as never, l),
    seed: persisted => humidityStressInput(persisted as never),
  },
  {
    problemRole: "conductivity_stress",
    configRole: "conductivity",
    keys: CONDUCTIVITY_STRESS_KEYS,
    defaults: CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS,
    unit: "µS/cm",
    min: "0", max: "10000", step: "0.1",
    labels: { low_threshold_micro_siemens_per_cm: "threshold_field.low_trigger", low_clear_micro_siemens_per_cm: "threshold_field.low_clear", high_clear_micro_siemens_per_cm: "threshold_field.high_clear", high_threshold_micro_siemens_per_cm: "threshold_field.high_trigger" },
    validate: (input, l) => validateConductivityStressOverrides(input as never, l),
    seed: persisted => conductivityStressInput(persisted as never),
  },
  {
    problemRole: "co2_stress",
    configRole: "co2",
    keys: CO2_STRESS_KEYS,
    defaults: CO2_STRESS_BUILTIN_DEFAULTS,
    unit: "ppm",
    min: "0", max: "10000", step: "1",
    labels: { threshold_ppm: "threshold_field.high_trigger", clear_ppm: "threshold_field.high_clear" },
    validate: (input, l) => validateCo2StressOverrides(input as never, l),
    seed: persisted => co2StressInput(persisted as never),
  },
  {
    problemRole: "soil_temperature_stress",
    configRole: "soil_temperature",
    keys: SOIL_TEMPERATURE_STRESS_KEYS,
    defaults: SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
    unit: "°C",
    min: "-20", max: "60", step: "0.1",
    labels: { cold_threshold_celsius: "threshold_field.cold_trigger", cold_clear_celsius: "threshold_field.cold_clear", hot_clear_celsius: "threshold_field.hot_clear", hot_threshold_celsius: "threshold_field.hot_trigger" },
    validate: (input, l) => validateSoilTemperatureStressOverrides(input as never, l),
    seed: persisted => soilTemperatureStressInput(persisted as never),
  },
  {
    problemRole: "low_battery",
    configRole: "battery",
    keys: LOW_BATTERY_STRESS_KEYS,
    defaults: LOW_BATTERY_STRESS_BUILTIN_DEFAULTS,
    unit: "%",
    min: "0", max: "100", step: "1",
    labels: { threshold_percent: "threshold_field.low_trigger", clear_percent: "threshold_field.low_clear" },
    validate: (input, l) => validateLowBatteryOverrides(input as never, l),
    seed: persisted => lowBatteryInput(persisted as never),
  },
  {
    problemRole: "low_light",
    configRole: "illuminance",
    keys: LOW_LIGHT_STRESS_KEYS,
    defaults: LOW_LIGHT_STRESS_BUILTIN_DEFAULTS,
    unit: "lx",
    min: "0", max: "200000", step: "0.1",
    labels: { target_lux: "threshold_field.target", clear_lux: "threshold_field.clear" },
    validate: (input, l) => validateLowLightOverrides(input as never, l),
    seed: persisted => lowLightInput(persisted as never),
  },
];
const _EDITOR_BY_PROBLEM_ROLE: Record<string, ThresholdEditorSpec> = Object.fromEntries(THRESHOLD_EDITORS.map(spec => [spec.problemRole, spec]));
const MENU_ICON_PATH = "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z";
const ADD_ICON_PATH = "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z";
const BACK_ICON_PATH = "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z";
// Sections of the plant page that expand and collapse.
type Expandable = "combine" | "troubleshooting" | "other_targets" | "more_details";
type SettingRow = "name" | "area" | "species";
type SensorRole = "moisture" | SourceRole;
type SourceMode = "pick" | "combine";
import { validateImage } from "./image.js";
import { validState } from "./validation.js";
import { styles } from "./styles.js";
import "./wizard.js";
import { DOCUMENTATION_URL } from "./views/overview.js";
import type { OpenPlantDetail } from "./views/overview.js";
import type { PlantOverview } from "./overview-model.js";
import type { CareEvent, CareHistory, Evaluation, HAArea, HADevice, HAEntity, HAState, HealthEvaluation, HomeAssistantLike, MoistureInput, PanelCapabilities, PanelInfo, PlantPlacement, PlantRecord, RoleSourceInput, SpeciesPreview, SpeciesSearchResult } from "./types.js";

type View = { kind: "list" } | { kind: "create" } | { kind: "detail"; plantId: string };
interface Edits { name: string; acquired: string; placement: PlantPlacement | null; category: string; tagText: string; area: string; common: string; latin: string; moisture: MoistureInput | null }
type SaveKind = "identity" | "taxonomy" | "area" | "moisture" | "species";
interface Conflict { before: PlantRecord; after: PlantRecord; changes: string[] }

// Local wall-clock time with its UTC offset, as care events are recorded.
function localTimestamp(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const local = new Date(date.getTime() + offset * 60000).toISOString().slice(0, 19);
  return `${local}${offset < 0 ? "-" : "+"}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`;
}

export class SmartPlantsPanel extends LitElement {
  static styles = [themeFallbacks, styles, plantStyles];
  @property({ attribute: false }) public hass?: HomeAssistantLike;
  @property({ attribute: false }) public panel?: PanelInfo;
  @property({ type: Boolean, reflect: true }) public narrow = false;
  @state() private _plants: PlantRecord[] = [];
  @state() private _loading = true;
  @state() private _error = "";
  @state() private _notice = "";
  @state() private _view: View = { kind: "list" };
  @state() private _detailSection: DetailSection = "overview";
  @state() private _formBusy = false;
  @state() private _capabilities: PanelCapabilities | null = null;
  @state() private _blocked = true;
  @state() private _areas: HAArea[] = [];
  @state() private _entities: HAEntity[] = [];
  @state() private _devices: HADevice[] = [];
  @state() private _states: Record<string, HAState> = {};
  @state() private _evaluations: Record<string, Evaluation> = {};
  @state() private _health: Record<string, HealthEvaluation> = {};
  @state() private _healthError = "";
  @state() private _careHistory: CareHistory | null = null;
  @state() private _careError = "";
  @state() private _careDate = "";
  @state() private _careNote = "";
  @state() private _careKind: CareEvent["kind"] = "watering";
  @state() private _careFields: Record<string, string> = {};
  @state() private _careEditingId: string | null = null;
  @state() private _registryError = "";
  @state() private _areaReview = false;
  @state() private _overview: Record<string, PlantOverview> = {};
  // Kept apart from `_error` so a failed status read never blocks an edit.
  @state() private _overviewError = "";
  @state() private _thumbnails: Record<string, string> = {};
  @state() private _watering: ReadonlySet<string> = new Set();
  @state() private _edits: Edits | null = null;
  @state() private _conflict: Conflict | null = null;
  @state() private _allSensors = false;
  @state() private _preview: SpeciesPreview | null = null;
  @state() private _provider = "manual";
  @state() private _query = "";
  @state() private _results: SpeciesSearchResult[] = [];
  @state() private _related: string[] = [];
  @state() private _imageUrl: string | null = null;
  @state() private _imageLoading = false;
  @state() private _imageError: string | null = null;
  @state() private _dialog: "delete" | "species" | null = null;
  @state() private _wizardStarted = false;
  @state() private _creationNotice = "";
  // Photo part of the creation notice, shown on the wizard's confirmation.
  @state() private _creationPhoto = "";
  @state() private _createdPlantId: string | null = null;
  @state() private _thresholdRole: string | null = null;
  @state() private _thresholdEdits: Record<string, string> | null = null;
  @state() private _thresholdBaseline: Record<string, string> | null = null;
  @state() private _thresholdError = "";
  @state() private _thresholdSaved: Record<string, string> = {};
  @state() private _pendingThresholdSwitch: { spec: ThresholdEditorSpec; plant: PlantRecord } | null = null;
  @state() private _sourceRole: string | null = null;
  @state() private _sourceEdits: RoleSourceInput | null = null;
  @state() private _sourceBaseline: RoleSourceInput | null = null;
  @state() private _sourceError = "";
  // Fail-closed refusal to open a role's editor, keyed to the plant snapshot it was raised against.
  @state() private _sourceUnavailable: { role: string; plantId: string; revision: number; mode: SourceMode } | null = null;
  @state() private _sourceSaved: Record<string, string> = {};
  @state() private _pendingSourceSwitch: { role: string; plant: PlantRecord; mode: SourceMode } | null = null;
  // Which part of the open role editor is shown: the sensor list or how several sensors combine.
  @state() private _sourceMode: SourceMode = "combine";
  // The soil moisture sensor editor edits the moisture draft in `_edits`.
  @state() private _moistureMode: SourceMode | null = null;
  @state() private _expanded: ReadonlySet<Expandable> = new Set();
  @state() private _settingsOpen: ReadonlySet<SettingRow> = new Set();
  @state() private _careFilter: CareEvent["kind"] | "all" = "all";
  @state() private _careFormOpen = false;
  @state() private _allSourceSensors = false;
  private _base: PlantRecord | null = null;
  private _baseArea = "";
  private _imageKey: string | null = null;
  private _imageRequest = 0;
  private _imageAbort: AbortController | undefined;
  // Card thumbnails: object URL key per plant and in-flight fetches.
  private _thumbnailKeys: Record<string, string> = {};
  private _thumbnailAborts = new Map<string, AbortController>();
  private _request = 0;
  private _careRequest = 0;
  private _providerRequest = 0;
  private _context = 0;
  private _unsubscribe: (() => void) | undefined;
  private _connection: HomeAssistantLike["connection"] | undefined;
  private _subscriptionGeneration = 0;
  private _focusReturn: HTMLElement | null = null;
  private _timer: ReturnType<typeof setInterval> | undefined;
  private get _l(): Localizer { return createLocalizer(this.hass); }
  private readonly _ready = () => { void this._refresh(); };
  private readonly _disconnected = () => { this._context++; this._formBusy = false; this._blocked = true; this._request++; this._providerRequest++; this._preview = null; this._clearImage(); this._error = this._l.t("error.disconnected"); };

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("hass")) {
      if (this.hass?.states) this._states = Object.fromEntries(Object.entries(this.hass.states).filter(([id, s]) => validState(s) && s.entity_id === id));
      this._syncImage();
    }
  }
  protected updated(changed: PropertyValues): void {
    if (changed.has("hass")) {
      if (this.hass?.connection !== this._connection) { this._unbind(); this._bind(); void this._refresh(); }
      if (this.hass?.user?.is_admin === false) this._unbind();
    }
    const dialog = this.shadowRoot?.querySelector("dialog");
    let active: Element | null | undefined = null;
    // Some DOM implementations throw when the focused element was just removed, for example by a tab switch.
    try { active = this.shadowRoot?.activeElement; } catch { active = null; }
    if (dialog?.open && (!active || !dialog.contains(active) || active.matches(":disabled"))) dialog.querySelector<HTMLElement>("button")?.focus();
  }
  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) { this._bind(); void this._refresh(); this._syncImage(); }
    // Home Assistant may register its tab and expansion elements after the panel first renders.
    for (const tag of ["ha-tab-group", "ha-expansion-panel", "ha-alert", "ha-area-picker"]) void customElements.whenDefined(tag).then(() => this.requestUpdate());
    // Bounded read refresh also catches integration lifecycle and other admin edits.
    this._timer = setInterval(() => { if (!this._formBusy && !this._loading && this.isConnected) void this._refresh(false); }, 30000);
  }
  disconnectedCallback(): void {
    this._context++; this._formBusy = false; this._request++; this._providerRequest++; this._clearImage(); this._clearThumbnails(); this._unbind(); clearInterval(this._timer); super.disconnectedCallback();
  }
  private _bind(): void {
    if (!this.hass || this.hass.user?.is_admin === false || this._connection) return;
    const connection = this.hass.connection; this._connection = connection;
    const generation = this._subscriptionGeneration;
    connection.addEventListener?.("ready", this._ready); connection.addEventListener?.("disconnected", this._disconnected);
    void api.subscribeRegistry(this.hass, this._ready).then(unsubscribe => {
      if (this._connection !== connection || generation !== this._subscriptionGeneration || !this.isConnected) unsubscribe(); else this._unsubscribe = unsubscribe;
    }).catch(() => { this._registryError = this._l.t("error.registry_updates"); });
  }
  private _unbind(): void {
    this._context++; this._formBusy = false;
    this._request++; this._providerRequest++; this._preview = null; this._blocked = true; this._clearImage(); this._clearThumbnails();
    this._subscriptionGeneration++;
    this._unsubscribe?.(); this._unsubscribe = undefined;
    this._connection?.removeEventListener?.("ready", this._ready); this._connection?.removeEventListener?.("disconnected", this._disconnected); this._connection = undefined;
  }
  private _clearThumbnails(): void {
    for (const abort of this._thumbnailAborts.values()) abort.abort();
    this._thumbnailAborts.clear();
    for (const url of Object.values(this._thumbnails)) URL.revokeObjectURL(url);
    this._thumbnails = {}; this._thumbnailKeys = {};
  }
  // Loads photos for the overview cards; unchanged photos keep their object URL.
  private _syncThumbnails(): void {
    if (this._blocked || !this.hass || this.hass.user?.is_admin === false || !this.isConnected) { this._clearThumbnails(); return; }
    // Only the overview shows thumbnails; returning to it loads any that changed.
    if (this._view.kind !== "list") return;
    const hass = this.hass; const token = hass.auth?.accessToken ?? "";
    const wanted = new Map(this._plants.filter(p => p.image).map(p => [p.id, `${token}:${p.id}:${p.image!.id}`]));
    const next = { ...this._thumbnails };
    for (const id of Object.keys(this._thumbnailKeys)) {
      if (wanted.get(id) === this._thumbnailKeys[id]) continue;
      this._thumbnailAborts.get(id)?.abort(); this._thumbnailAborts.delete(id);
      if (next[id]) URL.revokeObjectURL(next[id]!);
      delete next[id]; delete this._thumbnailKeys[id];
    }
    this._thumbnails = next;
    for (const [id, key] of wanted) {
      if (this._thumbnailKeys[id] === key) continue;
      this._thumbnailKeys[id] = key;
      const abort = new AbortController(); this._thumbnailAborts.set(id, abort);
      void api.fetchImage(hass, id, abort.signal).then(blob => {
        if (abort.signal.aborted || this._thumbnailKeys[id] !== key) return;
        this._thumbnailAborts.delete(id);
        this._thumbnails = { ...this._thumbnails, [id]: URL.createObjectURL(blob) };
      }).catch(() => {
        // A missing photo falls back to the plant icon; the plant page shows photo errors.
        if (this._thumbnailKeys[id] === key) { this._thumbnailAborts.delete(id); delete this._thumbnailKeys[id]; }
      });
    }
  }
  private _clearImage(): void {
    this._imageRequest++; this._imageAbort?.abort(); this._imageAbort = undefined; this._imageKey = null;
    if (this._imageUrl) URL.revokeObjectURL(this._imageUrl);
    this._imageUrl = null; this._imageLoading = false; this._imageError = null;
  }
  private _syncImage(): void {
    if (this._blocked || this.hass?.user?.is_admin === false) { this._clearImage(); return; }
    const plant = this._view.kind === "detail" ? this._plantById(this._view.plantId) : undefined;
    const key = this.hass && plant?.image ? `${this.hass.auth?.accessToken ?? ""}:${plant.id}:${plant.revision}:${plant.image.id}` : null;
    if (key === this._imageKey || !this.isConnected) return;
    this._clearImage(); this._imageKey = key;
    if (!key || !this.hass || !plant) return;
    const request = this._imageRequest; const abort = new AbortController(); this._imageAbort = abort; this._imageLoading = true;
    void api.fetchImage(this.hass, plant.id, abort.signal).then(blob => {
      const url = URL.createObjectURL(blob);
      if (request !== this._imageRequest || !this.isConnected) { URL.revokeObjectURL(url); return; }
      this._imageAbort = undefined; this._imageUrl = url; this._imageLoading = false;
    }).catch((e: unknown) => {
      if (request !== this._imageRequest) return;
      this._imageAbort = undefined; this._imageLoading = false;
      if (!(e instanceof DOMException && e.name === "AbortError")) this._imageError = this._friendly(e);
    });
  }
  private async _refresh(showLoading = true): Promise<void> {
    if (!this.isConnected) return;
    if (!this.hass || this.hass.user?.is_admin === false) return;
    const request = ++this._request; const hass = this.hass;
    if (showLoading) this._loading = true;
    try {
      const info = await api.info(hass);
      const plants = await api.list(hass);
      if (request !== this._request || !this.isConnected) return;
      this._capabilities = info; this._blocked = false; this._plants = plants;
      if (showLoading) this._error = "";
      if (this._base) {
        const latest = plants.find(p => p.id === this._base?.id);
        if (latest && latest.revision !== this._base.revision) this._setConflict(this._base, latest);
        if (!latest) { this._context++; this._formBusy = false; this._closeDialog(); this._base = null; this._conflict = null; this._edits = null; this._notice = this._l.t("notice.deleted_elsewhere"); void this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLElement>("h1")?.focus()); }
      }
      this._syncImage();
      try {
        const [areas, entities, devices, states] = await Promise.all([api.areas(hass), api.entities(hass), api.devices(hass), api.states(hass)]);
        if (request !== this._request) return;
        this._areas = areas; this._entities = entities; this._devices = devices; this._states = hass.states ? Object.fromEntries(Object.entries(hass.states).filter(([id, s]) => validState(s) && s.entity_id === id)) : Object.fromEntries(states.map(s => [s.entity_id, s])); this._registryError = "";
        if (this._base && this._edits) {
          const area = plantDevice(this._base, devices)?.area_id ?? "";
          if (area !== this._baseArea) {
            const dirty = this._edits.area !== this._baseArea;
            this._notice = this._l.t(dirty ? "notice.area_changed_retained" : "notice.area_changed_synced", { from: this._areaName(this._baseArea), to: this._areaName(area) });
            if (!dirty) this._edit({ area });
            this._areaReview = dirty; this._baseArea = area;
          }
        }
      } catch (e) { if (request === this._request) this._registryError = this._friendly(e); }
      // Status and readings come from the backend in one call; the panel never
      // reconstructs hysteresis or grace from state timestamps.
      try {
        const overview = await api.overview(hass);
        if (request === this._request) { this._overview = Object.fromEntries(overview.map(entry => [entry.plant_id, entry])); this._overviewError = ""; }
      } catch (e) { if (request === this._request) { this._overview = {}; this._overviewError = this._friendly(e); } }
      if (request === this._request) this._syncThumbnails();
      if (this._view.kind === "detail") {
        const targetId = this._view.plantId;
        try {
          const evaluation = await api.evaluation(hass, targetId);
          if (request === this._request) this._evaluations = { ...this._evaluations, [targetId]: evaluation };
        } catch { if (request === this._request) { const next = { ...this._evaluations }; delete next[targetId]; this._evaluations = next; } }
      }
      // Composite multi-role health is computed by the backend and shown
      // read-only. Fetched only for the currently-viewed
      // plant to keep list scrolling cheap.
      if (this._view.kind === "detail") {
        const targetId = this._view.plantId;
        await this._loadCare(targetId, this._context, request);
        try {
          const composite = await api.plantHealth(hass, targetId);
          if (request === this._request) { this._health = { ...this._health, [targetId]: composite }; this._healthError = ""; }
        } catch (e) {
          if (request === this._request) { const next = { ...this._health }; delete next[targetId]; this._health = next; this._healthError = this._friendly(e); }
        }
      }
    } catch (e) { if (request === this._request) { this._error = this._friendly(e); this._blocked = true; this._clearImage(); } }
    finally { if (request === this._request) this._loading = false; }
  }
  private _friendly(e: unknown): string {
    const key = e instanceof ApiError ? `api_error.${e.code}` : "";
    return this._l.t(isMessageKey(key) ? key : "api_error.unknown");
  }
  private _plantById(id: string): PlantRecord | undefined { return this._plants.find(p => p.id === id); }
  private _plantAreaNames(): Record<string, string | null> {
    return Object.fromEntries(this._plants.map(p => { const area = plantDevice(p, this._devices)?.area_id; return [p.id, area ? this._areaName(area) : null]; }));
  }
  private _areaName(id: string): string { return this._areas.find(a => a.area_id === id)?.name ?? (id || this._l.t("area.none")); }
  private _setConflict(before: PlantRecord, after: PlantRecord): void {
    const fields = ["name", "acquired_at", "placement", "category", "tags", "species", "image", "lifecycle_state", "roles", "care_events"] as const;
    const changes = fields.filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k])).map(k => k === "roles" ? this._l.t("conflict.roles_changed") : `${this._l.t(`conflict_field.${k}`)}: ${JSON.stringify(before[k])} → ${JSON.stringify(after[k])}`);
    this._conflict = { before, after, changes }; this._preview = null; this._providerRequest++;
  }
  private _beginEdit(plant: PlantRecord): void {
    const m = moistureRole(plant); this._base = structuredClone(plant); this._baseArea = plantDevice(plant, this._devices)?.area_id ?? "";
    this._edits = { name: plant.name, acquired: plant.acquired_at ?? "", placement: structuredClone(plant.placement), category: plant.category ?? "", tagText: plant.tags.join(", "), area: this._baseArea, common: plant.species?.snapshot.common_name ?? "", latin: plant.species?.snapshot.latin_name ?? "", moisture: m ? moistureInput(m) : null };
    this._conflict = null; this._areaReview = false; this._preview = null; this._results = []; this._provider = "manual"; this._related = []; this._thresholdRole = null; this._thresholdEdits = null; this._thresholdBaseline = null; this._thresholdError = ""; this._thresholdSaved = {}; this._pendingThresholdSwitch = null;
    this._sourceRole = null; this._sourceEdits = null; this._sourceBaseline = null; this._sourceError = ""; this._sourceSaved = {}; this._pendingSourceSwitch = null; this._allSourceSensors = false; this._sourceUnavailable = null;
    const device = plantDevice(plant, this._devices);
    const context = this._context;
    if (device && this.hass) void api.related(this.hass, device.id).then(ids => { if (context === this._context && this._base?.id === plant.id) this._related = ids; }).catch(() => { if (context === this._context && this._base?.id === plant.id) this._notice = this._l.t("notice.related_failed"); });
  }
  private _show(view: View): void {
    this._context++; this._closeDialog(); this._formBusy = false;
    this._providerRequest++; this._view = view; this._error = ""; this._notice = ""; this._healthError = ""; this._careHistory = null; this._careError = "";
    if (view.kind === "create") this._wizardStarted = true;
    if (view.kind === "detail") {
      this._detailSection = "overview"; this._expanded = new Set(); this._settingsOpen = new Set(); this._moistureMode = null;
      this._careFilter = "all"; this._careFormOpen = false; this._careEditingId = null; this._careKind = "watering"; this._careFields = {};
      const now = new Date(); this._careDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); this._careNote = "";
      const plant = this._plantById(view.plantId); if (plant) this._beginEdit(plant);
      const targetId = view.plantId; const hass = this.hass; const context = this._context;
      if (hass && !this._blocked) {
        void this._loadCare(targetId, context);
        void api.evaluation(hass, targetId)
          .then(evaluation => { if (context === this._context) this._evaluations = { ...this._evaluations, [targetId]: evaluation }; })
          .catch(() => undefined);
        void api.plantHealth(hass, targetId)
          .then(composite => { if (context === this._context) { this._health = { ...this._health, [targetId]: composite }; this._healthError = ""; } })
          .catch((e: unknown) => { if (context === this._context) { const next = { ...this._health }; delete next[targetId]; this._health = next; this._healthError = this._friendly(e); } });
      }
    }
    else { this._base = null; this._edits = null; this._conflict = null; }
    this._syncImage(); this._syncThumbnails(); void this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLElement>("h1")?.focus());
  }
  private _handleMenuAction(event: CustomEvent<{ item: { value: string } }>): void {
    if (event.detail.item.value === "add-plant") this._show({ kind: "create" });
    if (event.detail.item.value === "back-to-overview") this._show({ kind: "list" });
    if (event.detail.item.value === "integration-options") this._navigate("/config/integrations/integration/smart_plants");
    if (event.detail.item.value === "documentation") window.open(DOCUMENTATION_URL, "_blank", "noopener,noreferrer");
    const plant = this._view.kind === "detail" ? this._plantById(this._view.plantId) : undefined;
    if (!plant) return;
    const device = plantDevice(plant, this._devices);
    if (event.detail.item.value === "open-device" && device) this._navigate(`/config/devices/device/${encodeURIComponent(device.id)}`);
    if (event.detail.item.value === "download-diagnostics") this._downloadDiagnostics(plant);
    if (event.detail.item.value === "toggle-monitoring") this._toggleMonitoring(plant);
    if (event.detail.item.value === "delete-plant") this._openDialog("delete", this.shadowRoot?.querySelector<HTMLElement>(".panel-appbar ha-dropdown [slot=trigger]") ?? null);
  }
  // Home Assistant's own client-side navigation.
  private _navigate(path: string): void {
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
  }
  // Shows Home Assistant's toast, with an optional action such as Undo.
  private _toast(message: string, action?: { text: string; action: () => void }): void {
    this.dispatchEvent(new CustomEvent("hass-notification", { bubbles: true, composed: true, detail: { message, duration: action ? 8000 : 4000, ...(action ? { action } : {}) } }));
  }
  private _openFromOverview(detail: OpenPlantDetail): void {
    this._show({ kind: "detail", plantId: detail.plantId });
    if (detail.section) this._detailSection = detail.section;
  }
  private _selectSection(section: string): void {
    if ((DETAIL_SECTIONS as readonly string[]).includes(section) && section !== this._detailSection) this._detailSection = section as DetailSection;
  }
  // Switches tab and brings a part of it into view, for links between tabs.
  private _goTo(section: DetailSection, target?: string, expand?: Expandable): void {
    this._selectSection(section);
    if (expand) this._setExpanded(expand, true);
    const context = this._context;
    void this.updateComplete.then(() => {
      if (context !== this._context || !target) return;
      const node = this.shadowRoot?.querySelector<HTMLElement>(target);
      node?.scrollIntoView?.({ block: "nearest" }); node?.focus();
    });
  }
  private _setExpanded(key: Expandable, open: boolean): void {
    const next = new Set(this._expanded); if (open) next.add(key); else next.delete(key); this._expanded = next;
  }
  // Keeps the open plant's editor on the revision just written by a quick
  // action; any other change still goes through the conflict review.
  private _followQuickWrite(plant: PlantRecord): void {
    if (this._base?.id === plant.id && !this._conflict && !this._formBusy && this._base.revision + 1 === plant.revision) this._rebaseEdits(this._base, plant);
  }
  // Retries once after a revision conflict, with the refreshed plant revision.
  private async _withRevision<T>(plantId: string, operation: (revision: number) => Promise<T>): Promise<T> {
    const current = this._plantById(plantId);
    if (!current) throw new ApiError("not_found", "Plant not found.");
    try { return await operation(current.revision); }
    catch (e) {
      if (!(e instanceof ApiError && e.code === "revision_conflict")) throw e;
      await this._refresh(false);
      const latest = this._plantById(plantId);
      if (!latest) throw e;
      return await operation(latest.revision);
    }
  }
  private _setWatering(plantId: string, busy: boolean): void {
    const next = new Set(this._watering); if (busy) next.add(plantId); else next.delete(plantId); this._watering = next;
  }
  private _adopt(plant: PlantRecord): void {
    const latest = this._plantById(plant.id);
    if (!latest || latest.revision <= plant.revision) this._plants = this._plants.map(p => p.id === plant.id ? plant : p);
    const entry = this._overview[plant.id];
    if (entry && entry.revision < plant.revision) this._overview = { ...this._overview, [plant.id]: { ...entry, revision: plant.revision } };
  }
  private async _logWatering(plantId: string): Promise<void> {
    const plant = this._plantById(plantId);
    if (!this.hass || !plant || this._blocked || this._watering.has(plantId)) return;
    const hass = this.hass; const l = this._l;
    this._setWatering(plantId, true); this._error = ""; this._request++;
    try {
      const result = await this._withRevision(plantId, revision => api.addWatering(hass, plantId, revision, localTimestamp(new Date()), null));
      this._adopt(result.plant); this._followQuickWrite(result.plant);
      const entry = this._overview[plantId];
      if (entry) this._overview = { ...this._overview, [plantId]: { ...entry, last_watered_at: result.event.occurred_at } };
      this._toast(l.t("watering.logged", { name: plant.name }), { text: l.t("watering.undo"), action: () => void this._undoWatering(plantId, plant.name, result.event.id) });
    } catch (e) {
      this._error = this._friendly(e);
    } finally {
      this._setWatering(plantId, false);
      void this._refresh(false);
    }
  }
  private async _undoWatering(plantId: string, name: string, eventId: string): Promise<void> {
    if (!this.hass || this._blocked) return;
    const hass = this.hass; this._request++;
    try {
      const result = await this._withRevision(plantId, revision => api.deleteCareEvent(hass, plantId, revision, eventId));
      this._adopt(result.plant); this._followQuickWrite(result.plant);
      const entry = this._overview[plantId];
      if (entry) this._overview = { ...this._overview, [plantId]: { ...entry, last_watered_at: result.summary.last_watered_at } };
      this._toast(this._l.t("watering.removed", { name }));
    } catch (e) { this._error = this._friendly(e); }
    finally { void this._refresh(false); }
  }
  private async _loadCare(plantId: string, context: number, request?: number): Promise<void> {
    if (!this.hass) return;
    const careRequest = ++this._careRequest;
    try {
      const history = await api.careHistory(this.hass, plantId);
      if (careRequest === this._careRequest && context === this._context && (request === undefined || request === this._request) && this._view.kind === "detail" && this._view.plantId === plantId) {
        this._careHistory = history; this._careError = "";
      }
    } catch (error) {
      if (careRequest === this._careRequest && context === this._context && (request === undefined || request === this._request)) { this._careHistory = null; this._careError = this._friendly(error); }
    }
  }
  private _carePayload(): CareEvent["payload"] {
    const note = this._careNote.trim() || null;
    switch (this._careKind) {
      case "watering": return { note };
      case "fertilizing": {
        const amount = this._careFields.amount?.trim() ? Number(this._careFields.amount) : null;
        return { product: this._careFields.product?.trim() || null, amount, unit: amount === null ? null : this._careFields.unit || null, note };
      }
      case "pruning": return { part: this._careFields.part?.trim() || null, note };
      case "repotting": return { container: this._careFields.container?.trim() || null, medium: this._careFields.medium?.trim() || null, note };
      case "note": return { text: this._careFields.text?.trim() ?? "" };
    }
  }
  private _editCare(event: CareEvent): void {
    this._careEditingId = event.id; this._careKind = event.kind; this._careNote = typeof event.payload.note === "string" ? event.payload.note : "";
    const occurred = new Date(event.occurred_at);
    this._careDate = new Date(occurred.getTime() - occurred.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const p = event.payload;
    this._careFields = Object.fromEntries(Object.entries(p).map(([key, value]) => [key, value === null || value === undefined ? "" : String(value)]));
    this._careError = "";
  }
  private async _saveCare(plant: PlantRecord): Promise<void> {
    const history = this._careHistory;
    if (!this.hass || !history || history.revision !== plant.revision || this._formBusy || this._blocked || this._conflict) {
      this._careError = this._l.t("care.error_refresh_save"); return;
    }
    const date = new Date(this._careDate);
    if (!this._careDate || Number.isNaN(date.getTime()) || date.getTime() > Date.now() ||
        new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) !== this._careDate) {
      this._careError = this._l.t("care.error_date"); return;
    }
    const fields = this._careFields;
    const payload = this._carePayload();
    const note = typeof payload.note === "string" ? payload.note : null;
    if ((this._careKind === "watering" || this._careKind === "fertilizing" || this._careKind === "pruning" || this._careKind === "repotting") && note && note.length > 500) {
      this._careError = this._l.t("care.error_note_length"); return;
    }
    if (this._careKind === "fertilizing" && payload.amount !== null && (!Number.isFinite(payload.amount) || Number(payload.amount) <= 0 || Number(payload.amount) > 100000 || !payload.unit)) {
      this._careError = this._l.t("care.error_amount"); return;
    }
    if (this._careKind === "note" && (!String(payload.text).trim() || String(payload.text).length > 1000)) { this._careError = this._l.t("care.error_note_text"); return; }
    if (Object.values(fields).some(value => value.length > 120)) { this._careError = this._l.t("care.error_details_length"); return; }
    const offset = -date.getTimezoneOffset();
    const suffix = `${offset < 0 ? "-" : "+"}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`;
    const occurredAt = `${this._careDate}:00${suffix}`; const hass = this.hass; this._careError = "";
    await this._mutate(async () => {
      const result = this._careEditingId
        ? await api.editCareEvent(hass, plant.id, plant.revision, this._careEditingId, this._careKind, occurredAt, payload)
        : await api.addCareEvent(hass, plant.id, plant.revision, this._careKind, occurredAt, payload);
      return result.plant;
    });
    if (!this._error) { this._careEditingId = null; this._careKind = "watering"; this._careFields = {}; this._careNote = ""; }
  }
  private async _deleteCare(plant: PlantRecord, event: CareEvent): Promise<void> {
    if (!this.hass || !this._careHistory || this._careHistory.revision !== plant.revision) { this._careError = this._l.t("care.error_refresh_delete"); return; }
    if (!window.confirm(this._l.t("care.confirm_delete", { kind: this._l.t(`care_kind_phrase.${event.kind}`) }))) return;
    const hass = this.hass;
    await this._mutate(async () => (await api.deleteCareEvent(hass, plant.id, plant.revision, event.id)).plant);
  }
  private _openCareForm(): void {
    this._careFormOpen = true;
    this._goTo("care", "#care-form select");
  }
  private _closeCareForm(): void {
    this._careFormOpen = false; this._careEditingId = null; this._careKind = "watering"; this._careFields = {}; this._careNote = ""; this._careError = "";
  }
  private _renderCare(plant: PlantRecord) {
    const l = this._l;
    const history = this._careHistory;
    const details: Record<string, string[]> = { fertilizing: ["product", "amount", "unit"], pruning: ["part"], repotting: ["container", "medium"], note: ["text"] };
    const fieldLabel = (key: string) => { const k = `care_field.${key}`; return isMessageKey(k) ? l.t(k) : key; };
    const kindLabel = (kind: CareEvent["kind"]) => l.t(`care_kind.${kind}`);
    const kindPhrase = (kind: CareEvent["kind"]) => l.t(`care_kind_phrase.${kind}`);
    const busy = this._formBusy || !!this._conflict;
    const events = history?.events.filter(event => this._careFilter === "all" || event.kind === this._careFilter) ?? [];
    const filters: [CareEvent["kind"] | "all", string][] = [["all", l.t("care.filter_all")], ...CARE_KINDS.map(kind => [kind, kind === "note" ? l.t("care.filter_notes") : kindLabel(kind)] as [CareEvent["kind"], string])];
    const formOpen = this._careFormOpen || this._careEditingId !== null;
    return html`<div class="care-bar"><div class="row" role="group" aria-label=${l.t("care.filter_label")}>${filters.map(([kind, label]) => html`<button type="button" class="fchip" aria-pressed=${this._careFilter === kind ? "true" : "false"} @click=${() => { this._careFilter = kind; }}>${label}</button>`)}</div>
        <span class="spacer"></span><button type="button" class="btn filled" ?disabled=${this._blocked} @click=${() => this._openCareForm()}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("detail.log_care")}</button></div>
      ${this._careError ? html`<p class="error" role="alert">${this._careError}</p>` : nothing}
      ${history ? html`<p class="small muted" role="status">${l.tn(history.summary.watering_count, "care.watering_count_one", "care.watering_count_other")} ${history.summary.last_watered_local_date ? l.t("care.last_watered", { date: l.date(history.summary.last_watered_local_date) }) : l.t("care.never_watered")}</p>` : nothing}
      ${formOpen ? html`<section class="sp-card" id="care-form" aria-labelledby="care-form-heading"><div class="card-h"><h3 id="care-form-heading">${this._careEditingId ? l.t("care.edit_kind", { kind: kindPhrase(this._careKind) }) : l.t("care.record")}</h3>
          <button type="button" class="icon-btn" aria-label=${l.t("care.close_form")} @click=${() => this._closeCareForm()}><ha-icon aria-hidden="true" icon="mdi:close"></ha-icon></button></div>
        <div class="card-b care-form"><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict || !history || history.revision !== plant.revision}>
        <legend class="sr-only">${this._careEditingId ? l.t("care.edit_kind", { kind: kindPhrase(this._careKind) }) : l.t("care.record")}</legend>
        <label>${l.t("care.type")}<select aria-label=${l.t("care.type")} .value=${this._careKind} @change=${(e: Event) => { this._careKind = (e.target as HTMLSelectElement).value as CareEvent["kind"]; this._careFields = {}; }}>${CARE_KINDS.map(kind => html`<option value=${kind} ?selected=${kind === this._careKind}>${kindLabel(kind)}</option>`)}</select></label>
        <label>${l.t("care.when")}<input type="datetime-local" .value=${this._careDate} @input=${(e: Event) => this._careDate = (e.target as HTMLInputElement).value}></label>
        ${(details[this._careKind] ?? []).map(key => html`<label>${fieldLabel(key)}<input aria-label=${fieldLabel(key)} type=${key === "amount" ? "number" : "text"} maxlength=${key === "text" ? 1000 : 120} .value=${this._careFields[key] ?? ""} @input=${(e: Event) => this._careFields = { ...this._careFields, [key]: (e.target as HTMLInputElement).value }}></label>`)}
        ${this._careKind !== "note" ? html`<label>${l.t("care.note_optional")}<input type="text" maxlength="500" .value=${this._careNote} @input=${(e: Event) => this._careNote = (e.target as HTMLInputElement).value}></label>` : nothing}
        ${this._careKind === "fertilizing" ? html`<label>${l.t("care.unit")}<select aria-label=${l.t("care.unit")} .value=${this._careFields.unit ?? ""} @change=${(e: Event) => this._careFields = { ...this._careFields, unit: (e.target as HTMLSelectElement).value }}><option value="">${l.t("care.no_amount")}</option><option value="g">g</option><option value="mL">mL</option></select></label>` : nothing}
        <div class="actions"><button type="button" class="primary" @click=${() => void this._saveCare(plant)}>${this._careEditingId ? l.t("care.save_changes") : l.t("care.record")}</button>
        ${this._careEditingId ? html`<button type="button" @click=${() => { this._careEditingId = null; this._careKind = "watering"; this._careFields = {}; this._careNote = ""; }}>${l.t("care.cancel_editing")}</button>` : nothing}</div>
      </fieldset></div></section>` : nothing}
      <section class="sp-card" aria-labelledby="care-heading"><div class="card-h"><h3 id="care-heading">${l.t("care.heading")}</h3></div>
      ${!history ? html`<p class="card-b muted">${l.t("care.loading")}</p>` : !history.events.length ? html`<p class="card-b muted">${l.t("care.empty")}</p>` : !events.length ? html`<p class="card-b muted">${l.t("care.filter_empty")}</p>`
        : html`<ul class="list" aria-label=${l.t("care.events_label")}>${events.map(event => {
          const extra = careDetails(l, event, fieldLabel);
          const when = l.recordedDateTime(event.occurred_at);
          return html`<li class="li"><span class="ic tonal" aria-hidden="true"><ha-icon .icon=${CARE_ICONS[event.kind]}></ha-icon></span>
            <span class="li-main"><span class="li-title">${kindLabel(event.kind)}</span><span class="li-sub"><time datetime=${event.occurred_at}>${when}</time>${extra.map(part => html` · <span class="prose">${part}</span>`)}</span></span>
            <ha-dropdown @wa-select=${(e: CustomEvent<{ item: { value: string } }>) => { if (e.detail.item.value === "edit") { this._editCare(event); this._goTo("care", "#care-form select"); } else if (e.detail.item.value === "delete") void this._deleteCare(plant, event); }}>
              <button slot="trigger" type="button" class="icon-btn" ?disabled=${busy} aria-label=${l.t("care.event_menu", { kind: kindLabel(event.kind), date: when })}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
              <ha-dropdown-item value="edit" ?disabled=${busy}>${l.t("care.edit_kind", { kind: kindPhrase(event.kind) })}<ha-icon slot="icon" icon="mdi:pencil-outline"></ha-icon></ha-dropdown-item>
              <ha-dropdown-item value="delete" ?disabled=${busy}>${l.t("care.delete_kind", { kind: kindPhrase(event.kind) })}<ha-icon slot="icon" icon="mdi:delete-outline"></ha-icon></ha-dropdown-item>
            </ha-dropdown></li>`;
        })}</ul>`}</section>
      <p class="small muted">${l.t("care.no_irrigation")}</p>`;
  }
  private _edit(part: Partial<Edits>): void { if (this._edits) this._edits = { ...this._edits, ...part }; }
  private async _save(kind: SaveKind): Promise<void> {
    const base = this._base; const edit = this._edits;
    if (!this.hass || !base || !edit || this._formBusy || this._blocked || this._conflict) return;
    if (kind === "area" && this._areaReview) return;
     if (kind === "area" && (this._registryError || (edit.area && !this._areas.some(a => a.area_id === edit.area)))) { this._error = this._l.t("error.area_reconnect"); return; }
    const hass = this.hass;
    const input: UpdatePlantInput = { plant_id: base.id, expected_revision: base.revision };
    if (kind === "identity") {
      if (!edit.name.trim() || edit.name.trim().length > 200 || (edit.acquired && !Number.isFinite(Date.parse(edit.acquired)))) { this._error = this._l.t("error.identity"); return; }
      Object.assign(input, { name: edit.name.trim(), acquired_at: edit.acquired ? new Date(edit.acquired).toISOString() : null, placement: edit.placement });
    }
    if (kind === "taxonomy") {
      const error = validateTaxonomy(edit.category, tags(edit.tagText), this._l); if (error) { this._error = error; return; }
      Object.assign(input, { category: edit.category.trim() || null, tags: tags(edit.tagText) });
    }
    if (kind === "species") input.species = manualSpecies(edit.common, edit.latin);
    if (kind === "moisture") {
      if (!edit.moisture) return;
       if (this._registryError) { this._error = this._l.t("error.moisture_reconnect"); return; }
      const error = validateMoisture(edit.moisture, this._defaults(base), this._l); if (error) { this._error = error; return; }
    }
    await this._mutate(async () => {
      if (kind === "area") {
        const plant = await api.setArea(hass, base.id, base.revision, edit.area || null);
        return plant;
      }
      return kind === "moisture" && edit.moisture ? api.configureMoisture(hass, base.id, base.revision, canonicalMoisture(edit.moisture, this._entities)) : api.update(hass, input);
    }, false, kind);
  }
  private async _mutate(operation: () => Promise<PlantRecord | void>, deleted = false, saved?: SaveKind): Promise<void> {
    if (this._formBusy || this._blocked || this._conflict) return;
    this._formBusy = true; this._error = "";
    const context = this._context; const before = this._base; const selectedArea = this._edits?.area;
    this._request++; // Reads admitted before this write must not overwrite its result.
    try {
      const plant = await operation();
      if (context !== this._context || !this.isConnected) return;
      if (plant) {
        const latest = this._plantById(plant.id);
        if (latest && latest.revision > plant.revision) { await this._refresh(false); return; }
        this._plants = this._plants.map(p => p.id === plant.id ? plant : p);
        if (before && this._base?.id === plant.id) this._rebaseEdits(before, plant, saved);
        if (saved === "area" && selectedArea !== undefined) { this._baseArea = selectedArea; this._edit({ area: selectedArea }); this._areaReview = false; }
        this._syncImage(); this._notice = this._l.t("notice.saved");
      }
      if (deleted) { this._show({ kind: "list" }); }
      await this._refresh(false);
    } catch (e) {
      if (context !== this._context || !this.isConnected) return;
      this._error = this._friendly(e);
      if (e instanceof ApiError && e.code === "revision_conflict") await this._refresh(false);
      if (e instanceof ApiError && ["integration_not_loaded", "unauthorized"].includes(e.code)) { this._blocked = true; this._clearImage(); }
    } finally { if (context === this._context) this._formBusy = false; }
  }
  private _defaults(plant: PlantRecord): typeof builtin {
    const m = moistureRole(plant); return m ? { min: m.threshold_defaults.min.value, target: m.threshold_defaults.target.value, max: m.threshold_defaults.max.value } : builtin;
  }
  private _reviewConflict(): void {
    if (!this._conflict || !this._edits) return;
    const overlaps = this._sourceConflictFields(this._conflict.after);
    this._rebaseEdits(this._conflict.before, this._conflict.after);
    const l = this._l;
    this._notice = [l.t("conflict.reviewed"), ...(overlaps.length ? [l.t("conflict.reviewed_overlap", { fields: this._sourceFieldList(overlaps) })] : []), l.t("conflict.reviewed_species")].join(" ");
  }
  private _sourceFieldList(fields: readonly ("sources" | "primary_entity_id" | "aggregation" | "stale_after_seconds")[]): string {
    return fields.map(field => this._l.t(`source_field.${field}`)).join(", ");
  }
  private _sourceConflictFields(after: PlantRecord): ("sources" | "primary_entity_id" | "aggregation" | "stale_after_seconds")[] {
    if (!this._sourceRole || !this._sourceEdits || !this._sourceBaseline) return [];
    const current = roleSourceConfig(after, this._sourceRole);
    if (!current) return [];
    return (["sources", "primary_entity_id", "aggregation", "stale_after_seconds"] as const).filter(key =>
      JSON.stringify(this._sourceEdits![key]) !== JSON.stringify(this._sourceBaseline![key]) &&
      JSON.stringify(current[key]) !== JSON.stringify(this._sourceBaseline![key]));
  }
  private _rebaseEdits(before: PlantRecord, after: PlantRecord, saved?: SaveKind): void {
    if (!this._edits) return;
    // Retain only fields the user actually changed, rebasing untouched fields to the latest record.
    const edits = this._edits; const areaReview = this._areaReview;
    const sourceRole = this._sourceRole;
    const sourceEdits = this._sourceEdits;
    const sourceBaseline = this._sourceBaseline;
    const thresholdRole = this._thresholdRole;
    const thresholdEdits = this._thresholdEdits;
    const thresholdBaseline = this._thresholdBaseline;
    const retained: Partial<Edits> = {};
    if (edits.name !== before.name) retained.name = edits.name;
    if (edits.acquired !== (before.acquired_at ?? "")) retained.acquired = edits.acquired;
    if (JSON.stringify(edits.placement) !== JSON.stringify(before.placement)) retained.placement = edits.placement;
    if (edits.category !== (before.category ?? "")) retained.category = edits.category;
    if (JSON.stringify(tags(edits.tagText)) !== JSON.stringify(before.tags)) retained.tagText = edits.tagText;
    if (edits.area !== this._baseArea) retained.area = edits.area;
    if (edits.common !== (before.species?.snapshot.common_name ?? "")) retained.common = edits.common;
    if (edits.latin !== (before.species?.snapshot.latin_name ?? "")) retained.latin = edits.latin;
    const beforeMoisture = moistureRole(before); const afterMoisture = moistureRole(after);
    if (edits.moisture && beforeMoisture && afterMoisture) {
      const merged = moistureInput(afterMoisture);
      for (const k of ["sources", "primary_entity_id", "aggregation", "stale_after_seconds"] as const) {
        if (JSON.stringify(edits.moisture[k]) !== JSON.stringify(beforeMoisture[k])) Object.assign(merged, { [k]: structuredClone(edits.moisture[k]) });
      }
      for (const k of keys) if (edits.moisture.threshold_overrides[k] !== beforeMoisture.threshold_overrides[k]) merged.threshold_overrides[k] = edits.moisture.threshold_overrides[k];
      retained.moisture = merged;
    }
    const fields: Record<SaveKind, (keyof Edits)[]> = { identity: ["name", "acquired", "placement"], taxonomy: ["category", "tagText"], area: ["area"], species: ["common", "latin"], moisture: ["moisture"] };
    if (saved) for (const key of fields[saved]) delete retained[key];
    this._beginEdit(after); this._edit(retained); this._areaReview = areaReview;
    if (sourceRole && sourceEdits && sourceBaseline) {
      const current = roleSourceConfig(after, sourceRole);
      if (current) {
        const baseline = roleSourceInput(current);
        const rebased = structuredClone(baseline);
        for (const key of ["sources", "primary_entity_id", "aggregation", "stale_after_seconds"] as const) {
          if (JSON.stringify(sourceEdits[key]) !== JSON.stringify(sourceBaseline[key])) Object.assign(rebased, { [key]: structuredClone(sourceEdits[key]) });
        }
        this._sourceRole = sourceRole; this._sourceBaseline = baseline; this._sourceEdits = rebased;
      }
    }
    if (thresholdRole && thresholdEdits && thresholdBaseline) {
      const spec = _EDITOR_BY_PROBLEM_ROLE[thresholdRole];
      if (spec) {
        const baseline = spec.seed(this._persistedRoleOverrides(spec, after));
        const rebased = { ...baseline };
        for (const key of spec.keys) if (thresholdEdits[key] !== thresholdBaseline[key]) rebased[key] = thresholdEdits[key];
        this._thresholdRole = thresholdRole; this._thresholdBaseline = baseline; this._thresholdEdits = rebased;
      }
    }
  }
  private async _searchSpecies(): Promise<void> {
    if (!this.hass || this._formBusy || this._blocked || this._query.trim().length < 3) return;
    const context = this._context;
    const request = ++this._providerRequest; this._formBusy = true; this._error = ""; this._preview = null;
    try { const results = await api.searchSpecies(this.hass, this._provider, this._query.trim(), this.hass.language ?? "en"); if (request === this._providerRequest) { this._results = results; if (!results.length) this._notice = this._l.t("species.no_matches"); } }
    catch (e) { if (request === this._providerRequest) this._error = this._friendly(e); }
    finally { if (context === this._context) this._formBusy = false; }
  }
  private async _previewSpecies(result?: SpeciesSearchResult): Promise<void> {
    if (!this.hass || !this._base || this._formBusy || this._blocked || this._conflict) return;
    const context = this._context;
    const trigger = this.shadowRoot?.activeElement as HTMLElement | null;
    const request = ++this._providerRequest; const base = this._base; this._formBusy = true; this._error = ""; this._preview = null;
    try {
      const preview = result ? await api.previewSpecies(this.hass, result.provider, result.provider_ref, this.hass.language ?? "en", base.id) : await api.previewSpeciesRefresh(this.hass, base.id, this.hass.language ?? "en");
      if (!result && (preview.provider !== base.species?.provider || preview.snapshot.provider_ref !== base.species?.snapshot.provider_ref)) throw new ApiError("invalid_response", "Species refresh returned a different species.");
      if (request === this._providerRequest && this._base?.revision === base.revision) { this._preview = preview; this._openDialog("species", trigger); }
    } catch (e) { if (request === this._providerRequest) this._error = this._friendly(e); }
    finally { if (context === this._context) this._formBusy = false; }
  }
  private _openDialog(kind: "delete" | "species", trigger = this.shadowRoot?.activeElement as HTMLElement | null): void {
    this._focusReturn = trigger; this._dialog = kind;
    const context = this._context;
    void this.updateComplete.then(() => { if (context !== this._context || this._dialog !== kind) return; const dialog = this.shadowRoot?.querySelector("dialog"); if (dialog && !dialog.open) dialog.showModal(); dialog?.querySelector<HTMLElement>(kind === "species" ? "h2" : "button")?.focus(); });
  }
  private _closeDialog(): void {
    this.shadowRoot?.querySelector("dialog")?.close(); this._dialog = null;
    const target = this._focusReturn?.isConnected && !this._focusReturn.matches(":disabled") ? this._focusReturn : this.shadowRoot?.querySelector<HTMLElement>("h1");
    target?.focus(); this._focusReturn = null;
  }
  private _renderDialog() {
    if (!this._dialog || !this._base) return nothing;
    const base = this._base; const preview = this._preview; const l = this._l;
    return html`<dialog aria-labelledby="dialog-title" @cancel=${(e: Event) => { e.preventDefault(); this._closeDialog(); }} @keydown=${(e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button:not([disabled]),a[href],input:not([disabled]),summary")];
      const first = nodes[0]; const last = nodes.at(-1);
      if (e.shiftKey && (this.shadowRoot?.activeElement === first || this.shadowRoot?.activeElement?.matches("#dialog-title"))) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && this.shadowRoot?.activeElement === last) { e.preventDefault(); first?.focus(); }
    }}><h2 id="dialog-title" tabindex="-1">${this._dialog === "delete" ? l.t("dialog.delete_title", { name: base.name }) : l.t("dialog.species_title")}</h2>
      ${this._dialog === "delete" ? html`<p>${l.t("dialog.delete_body")}</p>` : preview ? snapshotView(l, preview.snapshot, preview) : html`<p>${l.t("dialog.preview_invalid")}</p>`}
      <div class="actions"><button @click=${() => this._closeDialog()}>${l.t("common.cancel")}</button><button class="primary" ?disabled=${this._formBusy || this._blocked || !!this._conflict || (this._dialog === "species" && !preview)} @click=${() => {
        const kind = this._dialog; this._closeDialog();
        if (!this.hass) return;
        const hass = this.hass;
        if (kind === "delete") void this._mutate(() => api.delete(hass, base.id, base.revision), true);
        else if (preview) void this._mutate(() => api.applySpecies(hass, base.id, base.revision, preview.preview_token, preview.provider, preview.operation), false, "species");
      }}>${this._dialog === "delete" ? l.t("dialog.delete_confirm") : l.t("dialog.species_confirm")}</button></div></dialog>`;
  }
  private async _uploadImage(plant: PlantRecord, file: File): Promise<void> {
    if (!this.hass || this._formBusy || this._blocked) return;
    const context = this._context;
    this._formBusy = true;
    try { await validateImage(file, this._l); }
    catch (e) { if (context === this._context) this._error = (e as Error).message; return; }
    finally { if (context === this._context) this._formBusy = false; }
    if (context !== this._context || !this.isConnected || this._view.kind !== "detail" || this._view.plantId !== plant.id || this._base?.revision !== plant.revision) return;
    const hass = this.hass;
    // The authenticated backend decodes, checks dimensions, strips metadata and re-encodes.
    await this._mutate(() => api.uploadImage(hass, plant.id, plant.revision, file));
  }
  // Photo row of the Settings tab: current state, choose a file, remove.
  private _renderPhotoRow(plant: PlantRecord) {
    const l = this._l; const disabled = this._formBusy || this._blocked || !!this._conflict;
    const status = plant.image
      ? this._imageLoading ? html`<span role="status">${l.t("photo.loading")}</span>`
        : this._imageError ? html`<span class="error-text" role="alert">${l.t("photo.load_failed", { error: this._imageError })}</span> <button type="button" class="btn text sm" @click=${() => { this._clearImage(); this._syncImage(); }}>${l.t("photo.retry")}</button>`
          : l.t("photo.stored", { type: plant.image.content_type, width: plant.image.width, height: plant.image.height })
      : l.t("photo.none");
    return html`<div class="setrow"><div><div class="setrow-h">${l.t("settings.photo")}</div><div class="setrow-d">${status}</div><div class="setrow-d">${l.t("photo.hint")}</div></div>
      <div class="row">
        <label class="btn text sm">${plant.image ? l.t("photo.replace") : l.t("photo.upload")}<input class="file-input" type="file" accept="image/jpeg,image/png,image/webp" ?disabled=${disabled} @change=${(e: Event) => { const input = e.target as HTMLInputElement; const file = input.files?.[0]; input.value = ""; if (file) void this._uploadImage(plant, file); }}></label>
        ${plant.image ? html`<button type="button" class="btn text sm" ?disabled=${disabled} @click=${() => { if (this.hass) { const hass = this.hass; void this._mutate(() => api.deleteImage(hass, plant.id, plant.revision)); } }}>${l.t("photo.remove")}</button>` : nothing}
      </div></div>`;
  }
  private _saveButton(kind: SaveKind, label: string) { return html`<button class="primary" @click=${() => void this._save(kind)}>${label}</button>`; }
  private _renderOverallHealth(plant: PlantRecord) {
    // Read-only surfacing of the accepted multi-role health composite.
    // Reads only the sibling `smart_plants/plants/health` reply cached in
    // `_health`; issues no new WebSocket command or mutation of any kind.
    const health = this._health[plant.id];
    const l = this._l;
    const unavailable = l.t("section.overall_health_unavailable");
    return html`<section aria-labelledby="overall-health-heading"><h3 id="overall-health-heading">${l.t("section.overall_health")}</h3>
      ${!health ? html`<p role="status">${this._healthError ? `${unavailable} ${this._healthError}` : unavailable}</p>` : html`
        <p role="status" aria-live="polite">${health.available && health.health_score !== null ? l.t("section.overall_health_available_summary", { score: health.health_score }) : l.t("section.overall_health_unavailable_detail")}</p>
        <dl class="overall-health">
          <dt>${l.t("section.overall_health_confidence")}</dt><dd>${confidenceLabel(health.confidence_label, l)} — ${confidenceGloss(health.confidence_label, l)}</dd>
          <dt>${l.t("section.overall_health_included_roles")}</dt><dd>${health.contributors.length ? html`<ul class="contributors">${health.contributors.map(r => html`<li>${contributorLabel(r, l)}</li>`)}</ul>` : l.t("section.overall_health_none_contributing")}</dd>
          <dt>${l.t("section.overall_health_configured_unavailable")}</dt><dd>${(() => {
            const unavailableRoles = health.configured.filter(r => !health.contributors.includes(r));
            return unavailableRoles.length ? html`<ul class="configured-unavailable">${unavailableRoles.map(r => html`<li>${contributorLabel(r, l)}</li>`)}</ul>` : l.t("section.overall_health_all_included");
          })()}</dd>
        </dl>
      `}
    </section>`;
  }
  // Read-only status of every problem check with its effective thresholds.
  // The thresholds are edited under Settings, Other targets.
  private _renderDiagnostics(plant: PlantRecord) {
    const l = this._l;
    const rows = problemBinaries(plant, this._entities, this._states, l);
    const active = rows.filter(r => r.status === "on").length;
    const summary = active === 0
      ? l.t("section.advanced_diagnostics_zero_active")
      : l.tn(active, "section.advanced_diagnostics_one_active", "section.advanced_diagnostics_many_active");
    return html`<section aria-labelledby="diagnostics-heading"><h3 id="diagnostics-heading">${l.t("section.advanced_diagnostics")}</h3>
      <p role="status" aria-live="polite">${summary}</p>
      <p>${l.t("section.advanced_diagnostics_description")}</p>
      <dl class="diagnostics">${rows.map(row => {
        const thresholds = row.status === "not_configured" ? [] : effectiveThresholds(plant, row.role, this._entities, this._states, l);
        // The <dt> names the row and the <dd> text carries the status; ARIA
        // prohibits aria-label on the definition role, so none is set here.
        return html`<dt>${row.label}</dt><dd class=${"status-" + row.status}>${this._problemStatusText(row.status)}${row.reason ? html` — ${this._problemReason(row.reason)}` : nothing}${thresholds.length ? html`<ul class="thresholds" aria-label=${l.t("section.effective_thresholds_label", { label: row.label })}>${thresholds.map(t => html`<li><span class="threshold-label">${t.label}</span>: <span class="threshold-value">${t.value === null ? "—" : `${l.number(t.value)} ${t.unit}`}</span></li>`)}</ul>` : nothing}</dd>`;
      })}</dl></section>`;
  }
  private _problemStatusText(status: string): string {
    const l = this._l;
    return status === "on" ? l.t("section.advanced_diagnostics_status_problem")
      : status === "off" ? l.t("section.advanced_diagnostics_status_ok")
        : status === "unavailable" ? l.t("section.advanced_diagnostics_status_unavailable")
          : l.t("section.advanced_diagnostics_status_not_configured");
  }
  // Settings, Other targets: per-plant thresholds of every configured check
  // other than soil moisture. Editable roles are listed in THRESHOLD_EDITORS.
  private _renderOtherTargets(plant: PlantRecord) {
    const l = this._l;
    const rows = problemBinaries(plant, this._entities, this._states, l).filter(row => row.status !== "not_configured" && _EDITOR_BY_PROBLEM_ROLE[row.role]);
    const pending = this._pendingThresholdSwitch;
    const currentSpec = this._thresholdRole ? _EDITOR_BY_PROBLEM_ROLE[this._thresholdRole] : null;
    const currentLabel = currentSpec ? l.t(`problem_phrase.${currentSpec.problemRole}`) : "";
    const pendingLabel = pending ? l.t(`problem_phrase.${pending.spec.problemRole}`) : "";
    return html`<p class="small muted">${l.t("other_targets.intro")}</p>
      ${pending ? html`<p class="notice threshold-switch-alert" role="alert">${l.t("section.advanced_diagnostics_switch_prompt", { current: currentLabel, pending: pendingLabel })}
        <button type="button" class="primary" @click=${() => this._confirmDiscardAndSwitch()}>${l.t("section.advanced_diagnostics_switch_discard")}</button>
        <button type="button" @click=${() => { this._pendingThresholdSwitch = null; }}>${l.t("section.advanced_diagnostics_switch_keep")}</button>
      </p>` : nothing}
      ${rows.length ? html`<dl class="other-targets">${rows.map(row => {
        const spec = _EDITOR_BY_PROBLEM_ROLE[row.role]!;
        const thresholds = effectiveThresholds(plant, row.role, this._entities, this._states, l);
        const editing = this._thresholdRole === row.role && this._thresholdEdits !== null;
        const saved = this._thresholdSaved[row.role];
        return html`<dt>${row.label}</dt><dd>${thresholds.length ? html`<ul class="thresholds" aria-label=${l.t("section.effective_thresholds_label", { label: row.label })}>${thresholds.map(t => html`<li><span class="threshold-label">${t.label}</span>: <span class="threshold-value">${t.value === null ? "—" : `${l.number(t.value)} ${t.unit}`}</span></li>`)}</ul>` : nothing}
          <button class="threshold-toggle btn outline sm" type="button" aria-expanded=${editing ? "true" : "false"} aria-controls=${`${row.role}-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleThresholdEdit(spec, plant)}>${editing ? l.t("section.advanced_diagnostics_cancel_edit") : l.t("section.advanced_diagnostics_edit_thresholds")}</button>${editing ? this._renderThresholdEditor(spec, plant) : nothing}${saved && !editing ? html`<p class="notice" role="status">${saved}</p>` : nothing}</dd>`;
      })}</dl>` : html`<p>${l.t("other_targets.none")}</p>`}`;
  }
  // Problem binaries report a reason code; unknown codes are shown verbatim.
  private _problemReason(code: string): string {
    const key = `problem_reason.${code}`;
    return isMessageKey(key) ? this._l.t(key) : code;
  }
  private _persistedRoleOverrides(spec: ThresholdEditorSpec, plant: PlantRecord): Partial<Record<string, number | null>> | null {
    const raw = plant.roles?.[spec.configRole];
    if (!raw || typeof raw !== "object") return null;
    const overrides = (raw as Record<string, unknown>)["stress_threshold_overrides"];
    if (!overrides || typeof overrides !== "object") return null;
    const out: Partial<Record<string, number | null>> = {};
    for (const key of spec.keys) {
      const v = (overrides as Record<string, unknown>)[key];
      out[key] = v === null || typeof v === "number" ? v as number | null : null;
    }
    return out;
  }
  private _toggleThresholdEdit(spec: ThresholdEditorSpec, plant: PlantRecord): void {
    if (this._thresholdRole === spec.problemRole && this._thresholdEdits !== null) {
      this._thresholdRole = null; this._thresholdEdits = null; this._thresholdBaseline = null; this._thresholdError = ""; this._pendingThresholdSwitch = null; return;
    }
    if (this._thresholdRole && this._thresholdRole !== spec.problemRole && this._hasUnsavedThresholdChanges()) {
      this._pendingThresholdSwitch = { spec, plant };
      return;
    }
    this._openThresholdEditor(spec, plant);
  }
  private _openThresholdEditor(spec: ThresholdEditorSpec, plant: PlantRecord): void {
    const seeded = spec.seed(this._persistedRoleOverrides(spec, plant));
    this._thresholdRole = spec.problemRole;
    this._thresholdEdits = seeded;
    this._thresholdBaseline = { ...seeded };
    this._thresholdError = "";
    this._pendingThresholdSwitch = null;
    this._thresholdSaved = { ...this._thresholdSaved, [spec.problemRole]: "" };
  }
  private _hasUnsavedThresholdChanges(): boolean {
    if (!this._thresholdEdits || !this._thresholdBaseline) return false;
    for (const key of Object.keys(this._thresholdEdits)) {
      if ((this._thresholdEdits[key] ?? "") !== (this._thresholdBaseline[key] ?? "")) return true;
    }
    return false;
  }
  private _confirmDiscardAndSwitch(): void {
    const pending = this._pendingThresholdSwitch;
    if (!pending) return;
    this._openThresholdEditor(pending.spec, pending.plant);
  }
  private _editThreshold(part: Record<string, string>): void {
    if (this._thresholdEdits) this._thresholdEdits = { ...this._thresholdEdits, ...part };
  }
  private _renderThresholdEditor(spec: ThresholdEditorSpec, plant: PlantRecord) {
    const edits = this._thresholdEdits;
    if (!edits) return nothing;
    const l = this._l;
    const effective = (key: string) => { const raw = edits[key]!.trim(); const n = Number(raw); return raw === "" ? l.number(spec.defaults[key]!) : Number.isFinite(n) ? l.number(n) : raw; };
    const field = (key: string) => html`<label>${l.t(spec.labels[key]!, { unit: spec.unit })}<input type="number" step=${spec.step} min=${spec.min} max=${spec.max} inputmode="decimal" .value=${edits[key]} @input=${(e: Event) => this._editThreshold({ [key]: (e.target as HTMLInputElement).value })}></label><small>${l.t("threshold.default_effective", { default: l.number(spec.defaults[key]!), effective: effective(key), unit: spec.unit })}</small><button type="button" @click=${() => this._editThreshold({ [key]: "" })}>${l.t("threshold.inherit")}</button>`;
    return html`<div id=${`${spec.problemRole}-editor`} class="threshold-editor" role="group" aria-label=${l.t("threshold.group_label", { label: l.t(`problem_phrase.${spec.problemRole}`) })}>
      <p>${l.t(`threshold_intro.${spec.problemRole}`)}</p>
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
        <div class="grid">${spec.keys.map(k => html`<div>${field(k)}</div>`)}</div>
        ${this._thresholdError ? html`<p class="error" role="alert">${this._thresholdError}</p>` : nothing}
        <div class="actions">
          <button type="button" @click=${() => this._editThreshold(Object.fromEntries(spec.keys.map(k => [k, ""])))}>${l.t("threshold.inherit_all")}</button>
          <button type="button" @click=${() => { this._thresholdRole = null; this._thresholdEdits = null; this._thresholdBaseline = null; this._thresholdError = ""; this._pendingThresholdSwitch = null; }}>${l.t("common.cancel")}</button>
          <button type="button" class="primary" @click=${() => void this._saveThresholds(spec, plant)}>${l.t("threshold.save")}</button>
        </div>
      </fieldset>
    </div>`;
  }
  private async _saveThresholds(spec: ThresholdEditorSpec, plant: PlantRecord): Promise<void> {
    if (!this.hass || !this._thresholdEdits || this._formBusy || this._blocked || this._conflict) return;
    const { values, error } = spec.validate(this._thresholdEdits, this._l);
    if (error) { this._thresholdError = error; return; }
    this._thresholdError = "";
    const hass = this.hass;
    await this._mutate(() => api.setThresholdOverrides(hass, plant.id, plant.revision, spec.configRole, values));
    if (!this._error) {
      this._thresholdRole = null; this._thresholdEdits = null; this._thresholdBaseline = null; this._pendingThresholdSwitch = null;
      this._thresholdSaved = { ...this._thresholdSaved, [spec.problemRole]: this._l.t(`threshold_saved.${spec.problemRole}`) };
    }
  }
  // ---- Sensors section: generic per-role source assignment ----
  // ---- Sensors tab ----
  // "2 sensors · Average · main sensor Kitchen probe · not updating after 6 h".
  private _sourceSummary(plant: PlantRecord, role: SensorRole): string {
    const c = role === "moisture" ? moistureRole(plant) : roleSourceConfig(plant, role);
    const l = this._l;
    if (!c) return l.t("sensors.summary_unavailable");
    if (!c.sources.length) return l.t("sensors.summary_empty");
    const parts = [l.tn(c.sources.length, "sensors.source_count_one", "sensors.source_count_other"), aggregationLabel(l, c.aggregation)];
    if (c.primary_entity_id && c.sources.length > 1) parts.push(l.t("sensors.summary_primary", { name: friendlyName(l, this._states, c.primary_entity_id) }));
    parts.push(l.t("sensors.summary_stale", { duration: formatDuration(l, c.stale_after_seconds) }));
    return parts.join(" · ");
  }
  private _toggleSourceEdit(role: string, plant: PlantRecord, mode: SourceMode = "combine"): void {
    if (this._sourceRole === role && this._sourceEdits !== null) {
      if (this._sourceMode !== mode) { this._sourceMode = mode; return; }
      this._sourceRole = null; this._sourceEdits = null; this._sourceBaseline = null; this._sourceError = ""; this._pendingSourceSwitch = null; return;
    }
    this._openSensorEditor(role, plant, mode);
  }
  // Opens a role's editor, asking first when another role has unsaved changes.
  private _openSensorEditor(role: string, plant: PlantRecord, mode: SourceMode): void {
    if (role === "moisture") { this._moistureMode = mode; this._focusEditor(mode, role); return; }
    if (this._sourceRole === role && this._sourceEdits !== null) { this._sourceMode = mode; this._focusEditor(mode, role); return; }
    if (this._sourceRole && this._sourceRole !== role && this._hasUnsavedSourceChanges()) { this._pendingSourceSwitch = { role, plant, mode }; return; }
    this._openSourceEditor(role, plant, mode);
  }
  private _focusEditor(mode: SourceMode, role: string): void {
    if (mode !== "pick") return;
    const context = this._context;
    void this.updateComplete.then(() => {
      if (context !== this._context) return;
      const heading = this.shadowRoot?.querySelector<HTMLElement>(`#${role}-picker-heading`);
      heading?.scrollIntoView?.({ block: "nearest" }); heading?.focus();
    });
  }
  private _openSourceEditor(role: string, plant: PlantRecord, mode: SourceMode = "combine"): void {
    const c = roleSourceConfig(plant, role);
    if (!c) { this._sourceUnavailable = { role, plantId: plant.id, revision: plant.revision, mode }; this._pendingSourceSwitch = null; return; }
    const seeded = roleSourceInput(c);
    this._sourceRole = role; this._sourceEdits = seeded; this._sourceBaseline = structuredClone(seeded); this._sourceMode = mode;
    this._sourceError = ""; this._pendingSourceSwitch = null; this._allSourceSensors = false; this._sourceUnavailable = null;
    this._sourceSaved = { ...this._sourceSaved, [role]: "" };
    this._focusEditor(mode, role);
  }
  private _sourceRefused(plant: PlantRecord, role: string, mode: SourceMode): boolean {
    const u = this._sourceUnavailable;
    // Stale once the plant data changes; the next click re-evaluates the fresh snapshot.
    return !!u && u.role === role && u.mode === mode && u.plantId === plant.id && u.revision === plant.revision && !roleSourceConfig(plant, role);
  }
  private _hasUnsavedSourceChanges(): boolean {
    if (!this._sourceEdits || !this._sourceBaseline) return false;
    return JSON.stringify(this._sourceEdits) !== JSON.stringify(this._sourceBaseline);
  }
  private _confirmSourceSwitch(): void {
    const pending = this._pendingSourceSwitch;
    if (pending) this._openSourceEditor(pending.role, pending.plant, pending.mode);
  }
  private _editSource(part: Partial<RoleSourceInput>): void {
    if (this._sourceEdits) this._sourceEdits = { ...this._sourceEdits, ...part };
  }
  private _closeSourceEditor(): void {
    this._sourceRole = null; this._sourceEdits = null; this._sourceBaseline = null; this._sourceError = ""; this._pendingSourceSwitch = null;
  }
  // Closes the soil moisture sensor editor and drops its unsaved sensor
  // changes; unsaved moisture targets stay in the draft.
  private _closeMoistureEditor(): void {
    const m = this._base ? moistureRole(this._base) : null;
    if (m && this._edits?.moisture) {
      const base = moistureInput(m);
      this._edit({ moisture: { ...this._edits.moisture, sources: base.sources, primary_entity_id: base.primary_entity_id, aggregation: base.aggregation, stale_after_seconds: base.stale_after_seconds } });
    }
    this._moistureMode = null;
  }
  private async _saveMoistureSensors(): Promise<void> {
    await this._save("moisture");
    if (!this._error) this._moistureMode = null;
  }
  // Assigned sensors across all roles, in reading order.
  private _assignedSensors(plant: PlantRecord): { role: SensorRole; entityId: string; main: boolean; several: boolean }[] {
    const roles: SensorRole[] = ["moisture", ...ROLE_SOURCE_SPECS.map(spec => spec.role)];
    const order = Object.keys(ROLE_META);
    return roles.sort((a, b) => order.indexOf(a) - order.indexOf(b)).flatMap(role => {
      const c = role === "moisture" ? moistureRole(plant) : roleSourceConfig(plant, role);
      if (!c) return [];
      return c.sources.map(source => ({ role, entityId: resolveSource(source, this._entities)?.entity_id ?? source.entity_id, main: c.primary_entity_id === source.entity_id, several: c.sources.length > 1 }));
    });
  }
  private _sensorValue(entityId: string): string {
    const state = this._states[entityId]; const l = this._l;
    if (!state) return "";
    const value = Number(state.state); const unit = typeof state.attributes.unit_of_measurement === "string" ? state.attributes.unit_of_measurement : "";
    if (state.state.trim() !== "" && Number.isFinite(value)) return formatValue(l, value, unit);
    return state.state === "unavailable" || state.state === "unknown" ? l.t("sources.unavailable") : state.state;
  }
  // Row actions on an assigned sensor; they save straight away.
  private async _sensorAction(plant: PlantRecord, role: SensorRole, entityId: string, action: string): Promise<void> {
    if (action === "change") { this._openSensorEditor(role, plant, "pick"); return; }
    if (!this.hass || this._formBusy || this._blocked || this._conflict) return;
    if (this._registryError) { this._error = this._l.t("error.sources_reconnect"); return; }
    const hass = this.hass;
    if (role === "moisture") {
      const m = moistureRole(plant); if (!m) return;
      const next = moistureInput(m);
      if (action === "remove") { next.sources = next.sources.filter(s => s.entity_id !== entityId); if (next.primary_entity_id === entityId) next.primary_entity_id = null; }
      else if (action === "primary") next.primary_entity_id = entityId;
      else return;
      await this._mutate(() => api.configureMoisture(hass, plant.id, plant.revision, canonicalMoisture(next, this._entities)));
      return;
    }
    const c = roleSourceConfig(plant, role); if (!c) return;
    if (action === "remove") {
      const sources = canonicalRoleSources({ ...c, sources: c.sources.filter(s => s.entity_id !== entityId) }, this._entities).sources;
      await this._mutate(() => api.setRoleSources(hass, plant.id, plant.revision, role, sources));
    } else if (action === "primary") {
      await this._mutate(() => api.setRolePrimary(hass, plant.id, plant.revision, role, entityId));
    }
  }
  private _staleAlert(plant: PlantRecord) {
    const l = this._l; const reading = this._overview[plant.id]?.roles.moisture;
    if (!reading || reading.state !== "stale") return nothing;
    const name = reading.sources.map(id => friendlyName(l, this._states, id)).join(", ") || readingLabel(l, "moisture");
    const title = reading.last_reported ? l.t("stale_alert.title", { name, age: relativeTime(l, reading.last_reported) }) : l.t("stale_alert.title_no_age", { name });
    if (isDefined("ha-alert")) return html`<ha-alert class="stale-alert" alert-type="warning" .title=${title}>${l.t("stale_alert.body")}</ha-alert>`;
    return html`<div class="alert-fallback stale-alert" role="alert"><ha-icon aria-hidden="true" icon="mdi:alert-outline"></ha-icon><div><p class="alert-title">${title}</p><p>${l.t("stale_alert.body")}</p></div></div>`;
  }
  private _renderSensorsTab(plant: PlantRecord) {
    const l = this._l;
    const disabled = this._formBusy || this._blocked || !!this._conflict;
    const pending = this._pendingSourceSwitch;
    const pendingSpec = roleSourceSpec(this._sourceRole ?? "");
    const assigned = this._assignedSensors(plant);
    const free: SensorRole[] = [
      ...(moistureRole(plant)?.sources.length ? [] : ["moisture" as const]),
      ...ROLE_SOURCE_SPECS.filter(spec => !roleSourceConfig(plant, spec.role)?.sources.length).map(spec => spec.role),
    ];
    const pickRefused = ROLE_SOURCE_SPECS.find(spec => this._sourceRefused(plant, spec.role, "pick"));
    return html`${this._staleAlert(plant)}
      ${pending ? html`<div class="notice" role="alert"><p>${l.t("sensors.switch_prompt", { role: pendingSpec ? readingPhrase(l, pendingSpec.role) : this._sourceRole ?? "" })}</p>
        <button type="button" class="primary" @click=${() => this._confirmSourceSwitch()}>${l.t("section.advanced_diagnostics_switch_discard")}</button>
        <button type="button" @click=${() => { this._pendingSourceSwitch = null; }}>${l.t("section.advanced_diagnostics_switch_keep")}</button></div>` : nothing}
      <section class="sp-card" aria-labelledby="assigned-heading"><div class="card-h"><h3 id="assigned-heading">${l.t("assigned.heading")}</h3></div>
        ${assigned.length ? html`<ul class="list">${assigned.map(item => {
          const name = friendlyName(l, this._states, item.entityId); const state = this._states[item.entityId];
          const updated = state ? l.t("assigned.updated", { age: relativeTime(l, state.last_updated) }) : l.t("assigned.not_found");
          return html`<li class="li"><span class="ic" aria-hidden="true"><ha-icon .icon=${ROLE_META[item.role].icon}></ha-icon></span>
            <span class="li-main"><span class="li-title">${name}</span><span class="li-sub">${readingLabel(l, item.role)} · ${updated}${item.main && item.several ? ` · ${l.t("assigned.main")}` : ""}</span></span>
            <span class="li-actions"><span class="li-value">${this._sensorValue(item.entityId)}</span>
              <ha-dropdown @wa-select=${(e: CustomEvent<{ item: { value: string } }>) => void this._sensorAction(plant, item.role, item.entityId, e.detail.item.value)}>
                <button slot="trigger" type="button" class="icon-btn" ?disabled=${disabled} aria-label=${l.t("assigned.menu", { name })}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
                <ha-dropdown-item value="change">${l.t("assigned.change", { role: readingPhrase(l, item.role) })}<ha-icon slot="icon" icon="mdi:pencil-outline"></ha-icon></ha-dropdown-item>
                ${item.several && !item.main ? html`<ha-dropdown-item value="primary">${l.t("assigned.make_main")}<ha-icon slot="icon" icon="mdi:star-outline"></ha-icon></ha-dropdown-item>` : nothing}
                <ha-dropdown-item value="remove">${l.t("assigned.remove")}<ha-icon slot="icon" icon="mdi:link-variant-off"></ha-icon></ha-dropdown-item>
              </ha-dropdown></span></li>`;
        })}</ul>` : html`<p class="card-b muted">${l.t("assigned.empty")}</p>`}
        <div class="card-b"><div class="row">${free.length ? html`<ha-dropdown class="add-sensor" @wa-select=${(e: CustomEvent<{ item: { value: string } }>) => this._openSensorEditor(e.detail.item.value, plant, "pick")}>
            <button slot="trigger" type="button" class="btn tonal" ?disabled=${disabled}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("assigned.add")}</button>
            ${free.map(role => html`<ha-dropdown-item value=${role}>${readingLabel(l, role)}<ha-icon slot="icon" .icon=${ROLE_META[role].icon}></ha-icon></ha-dropdown-item>`)}
          </ha-dropdown><span class="small muted">${l.t("assigned.available", { roles: free.map(role => readingLabel(l, role)).join(", ") })}</span>` : html`<span class="small muted">${l.t("assigned.all_assigned")}</span>`}</div>
          ${pickRefused ? html`<p id=${`${pickRefused.role}-sources-unavailable`} class="error" role="alert">${l.t("sensors.refused", { role: readingLabel(l, pickRefused.role) })}</p>` : nothing}
        </div></section>
      ${this._moistureMode === "pick" ? this._renderPicker("moisture", plant) : nothing}
      ${this._sourceRole && this._sourceEdits && this._sourceMode === "pick" ? this._renderPicker(this._sourceRole as SourceRole, plant) : nothing}
      ${this._expander("combine", "mdi:call-merge", l.t("combine.heading"), l.t("combine.secondary"), () => this._renderCombine(plant))}
      ${this._expander("troubleshooting", "mdi:stethoscope", l.t("troubleshooting.heading"), l.t("troubleshooting.secondary"), () => this._renderTroubleshooting(plant))}`;
  }
  // Card that edits which sensors a role uses.
  private _renderPicker(role: SensorRole, plant: PlantRecord) {
    const l = this._l; const label = readingLabel(l, role);
    const disabled = this._formBusy || this._blocked || !!this._conflict;
    const edit = this._edits;
    let body;
    if (role === "moisture") {
      body = edit?.moisture ? html`<div id="moisture-sources-editor" class="editor"><fieldset ?disabled=${disabled}>${moistureEditor(l, edit.moisture, this._defaults(plant), this._entities, this._states, this._allSensors, v => this._allSensors = v, v => this._edit({ moisture: v }), "pick")}
        <div class="actions"><button type="button" @click=${() => this._closeMoistureEditor()}>${l.t("common.cancel")}</button><button type="button" class="primary" @click=${() => void this._saveMoistureSensors()}>${l.t("sensors.save_moisture")}</button></div></fieldset></div>`
        : html`<p class="error" role="alert">${l.t("moisture.incompatible")}</p>`;
    } else body = this._renderSourceEditor(role, plant);
    return html`<section class="sp-card picker" aria-labelledby=${`${role}-picker-heading`}><div class="card-h"><h3 id=${`${role}-picker-heading`} tabindex="-1">${l.t("sensors.edit_heading", { role: label })}</h3></div>
      <div class="card-b">${body}</div></section>`;
  }
  private _renderSourceEditor(role: SourceRole, plant: PlantRecord) {
    const spec = roleSourceSpec(role); const edits = this._sourceEdits; const l = this._l;
    if (!spec || !edits) return nothing;
    return html`<div id=${`${role}-sources-editor`} class="editor"><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
      ${roleSourcesEditor(l, spec, edits, this._entities, this._states, this._allSourceSensors, v => this._allSourceSensors = v, v => this._editSource(v), this._sourceMode)}
      ${this._sourceError ? html`<p class="error" role="alert">${this._sourceError}</p>` : nothing}
      <div class="actions">
        <button type="button" @click=${() => this._closeSourceEditor()}>${l.t("common.cancel")}</button>
        <button type="button" class="primary" @click=${() => void this._saveRoleSources(role, plant)}>${l.t("sensors.save", { role: readingPhrase(l, role) })}</button>
      </div></fieldset></div>`;
  }
  // "Several sensors for one reading": how each role combines its sensors.
  private _renderCombine(plant: PlantRecord) {
    const l = this._l; const disabled = this._formBusy || this._blocked || !!this._conflict;
    const edit = this._edits; const moistureOpen = this._moistureMode === "combine";
    return html`<p class="small muted">${l.t("combine.intro")}</p>
      <dl class="sensors">
        <dt>${readingLabel(l, "moisture")}</dt><dd>${this._sourceSummary(plant, "moisture")}
          <button class="source-toggle btn text sm" type="button" aria-expanded=${moistureOpen ? "true" : "false"} aria-controls="moisture-sources-editor" aria-label=${moistureOpen ? l.t("common.cancel") : l.t("combine.edit_label", { role: readingPhrase(l, "moisture") })} ?disabled=${disabled || !edit?.moisture} @click=${() => { if (moistureOpen) this._closeMoistureEditor(); else this._moistureMode = "combine"; }}>${moistureOpen ? l.t("common.cancel") : l.t("sensors.edit")}</button>
          ${moistureOpen && edit?.moisture ? html`<div id="moisture-sources-editor" class="editor"><fieldset ?disabled=${disabled}>${moistureEditor(l, edit.moisture, this._defaults(plant), this._entities, this._states, this._allSensors, v => this._allSensors = v, v => this._edit({ moisture: v }), "combine")}
            <div class="actions"><button type="button" @click=${() => this._closeMoistureEditor()}>${l.t("common.cancel")}</button><button type="button" class="primary" @click=${() => void this._saveMoistureSensors()}>${l.t("sensors.save_moisture")}</button></div></fieldset></div>` : nothing}</dd>
        ${ROLE_SOURCE_SPECS.map(spec => {
          const editing = this._sourceRole === spec.role && this._sourceEdits !== null && this._sourceMode === "combine";
          const saved = this._sourceSaved[spec.role];
          const label = readingLabel(l, spec.role);
          return html`<dt>${label}</dt><dd>${this._sourceSummary(plant, spec.role)}
            <button class="source-toggle btn text sm" type="button" aria-expanded=${editing ? "true" : "false"} aria-controls=${`${spec.role}-sources-editor`} aria-label=${editing ? l.t("common.cancel") : l.t("combine.edit_label", { role: readingPhrase(l, spec.role) })} ?disabled=${disabled} @click=${() => this._toggleSourceEdit(spec.role, plant, "combine")}>${editing ? l.t("common.cancel") : l.t("sensors.edit")}</button>
            ${editing ? this._renderSourceEditor(spec.role, plant) : nothing}
            ${!editing && this._sourceRefused(plant, spec.role, "combine") ? html`<p id=${`${spec.role}-sources-unavailable`} class="error" role="alert">${l.t("sensors.refused", { role: label })}</p>` : nothing}
            ${saved && !editing ? html`<p class="notice" role="status">${saved}</p>` : nothing}</dd>`;
        })}
      </dl>`;
  }
  private _renderTroubleshooting(plant: PlantRecord) {
    const l = this._l; const device = plantDevice(plant, this._devices); const evaluation = this._evaluations[plant.id];
    const roles: SensorRole[] = ["moisture", ...ROLE_SOURCE_SPECS.map(spec => spec.role)];
    const configured = roles.flatMap(role => {
      const c = role === "moisture" ? moistureRole(plant) : roleSourceConfig(plant, role);
      return c?.sources.length ? [{ role, c }] : [];
    });
    return html`<section aria-labelledby="entities-heading"><h3 id="entities-heading">${l.t("troubleshooting.entities_heading")}</h3>
        <dl class="kv entity-ids">${configured.map(({ role, c }) => html`<dt>${readingLabel(l, role)}</dt><dd>${c.sources.map(source => { const id = resolveSource(source, this._entities)?.entity_id ?? source.entity_id; return html`<div><code>${id}</code>${id === c.primary_entity_id ? html` <span class="muted">(${l.t("assigned.main")})</span>` : nothing}</div>`; })}</dd>`)}
          <dt>${l.t("troubleshooting.plant_id")}</dt><dd><code>${plant.id}</code></dd>
          ${device ? html`<dt>${l.t("troubleshooting.device_id")}</dt><dd><code>${device.id}</code></dd>` : nothing}</dl></section>
      <section aria-labelledby="evaluation-heading"><h3 id="evaluation-heading">${l.t("troubleshooting.moisture_heading")}</h3>
        ${evaluation ? html`<dl class="kv moisture-evaluation"><dt>${l.t("troubleshooting.moisture_value")}</dt><dd>${evaluation.computed_percent === null ? "—" : l.percent(evaluation.computed_percent)}</dd>
          <dt>${l.t("troubleshooting.moisture_health")}</dt><dd>${evaluation.health_score === null ? "—" : l.t("section.overall_health_available_summary", { score: evaluation.health_score })}</dd>
          ${evaluation.reasons.length ? html`<dt>${l.t("troubleshooting.reasons")}</dt><dd>${evaluation.reasons.join(" ")}</dd>` : nothing}</dl>` : html`<p>${l.t("troubleshooting.no_evaluation")}</p>`}</section>
      ${this._renderOverallHealth(plant)}
      ${this._renderDiagnostics(plant)}
      <section aria-labelledby="related-heading"><h3 id="related-heading">${l.t("automations.related_heading")}</h3>
        ${this._related.length ? html`<ul class="related">${this._related.map(id => html`<li><code>${id}</code></li>`)}</ul>` : html`<p>${l.t("automations.related_none")}</p>`}
        <p class="small muted">${l.t("automations.description")}</p>
        <a href="/config/automation/dashboard" @click=${(e: MouseEvent) => this._internalLink(e, "/config/automation/dashboard")}>${l.t("automations.open_editor")}</a></section>
      <section aria-labelledby="download-heading"><h3 id="download-heading">${l.t("troubleshooting.download_heading")}</h3>
        <p class="small muted">${l.t("troubleshooting.download_hint")}</p>
        <div class="row"><button type="button" class="btn outline sm" @click=${() => this._downloadDiagnostics(plant)}><ha-icon aria-hidden="true" icon="mdi:download"></ha-icon>${l.t("detail.menu_download")}</button></div></section>`;
  }
  // Follows an in-app link with Home Assistant's own navigation.
  private _internalLink(event: MouseEvent, path: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); this._navigate(path);
  }
  // Technical snapshot of the plant for bug reports: configuration, entity
  // IDs and current evaluation. No name, notes, tags or photo.
  private _downloadDiagnostics(plant: PlantRecord): void {
    const device = plantDevice(plant, this._devices);
    const data = {
      generated_at: new Date().toISOString(),
      plant: { id: plant.id, revision: plant.revision, lifecycle_state: plant.lifecycle_state, created_at: plant.created_at, has_photo: plant.image !== null, care_event_count: this._careHistory?.events.length ?? null,
        species: plant.species ? { provider: plant.species.provider, provider_ref: plant.species.snapshot.provider_ref, source_status: plant.species.snapshot.source_status, fetched_at: plant.species.snapshot.fetched_at } : null },
      device_id: device?.id ?? null,
      roles: plant.roles ?? null,
      status: this._overview[plant.id] ?? null,
      moisture_evaluation: this._evaluations[plant.id] ?? null,
      overall_health: this._health[plant.id] ?? null,
      problem_checks: problemBinaries(plant, this._entities, this._states, this._l).map(row => ({ role: row.role, status: row.status, reason: row.reason })),
      related_automations: this._related,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `smart-plants-${plant.id}-diagnostics.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  private _toggleMonitoring(plant: PlantRecord): void {
    if (!this.hass) return;
    const hass = this.hass;
    void this._mutate(() => plant.lifecycle_state === "active" ? api.disable(hass, plant.id, plant.revision) : api.reenable(hass, plant.id, plant.revision));
  }
  private _expander(key: Expandable, icon: string, header: string, secondary: string, content: () => ReturnType<typeof html> | typeof nothing) {
    return expander({ key, icon, header, secondary, content, open: this._expanded.has(key), native: isDefined("ha-expansion-panel"), toggle: open => this._setExpanded(key, open) });
  }
  private async _saveRoleSources(role: SourceRole, plant: PlantRecord): Promise<void> {
    if (!this.hass || !this._sourceEdits || this._formBusy || this._blocked || this._conflict) return;
    if (this._registryError) { this._sourceError = this._l.t("error.sources_reconnect"); return; }
    const error = validateRoleSources(this._sourceEdits, this._l); if (error) { this._sourceError = error; return; }
    this._sourceError = "";
    const hass = this.hass;
    const desired = canonicalRoleSources(this._sourceEdits, this._entities);
    const base = roleSourceConfig(plant, role);
    await this._mutate(async () => {
      let revision = plant.revision; let latest = plant;
      // Issue only the granular commands whose values changed, chaining the
      // revision from each reply. set_sources first (it may clear a removed
      // primary), then primary, aggregation, and staleness.
      if (!base || JSON.stringify(base.sources) !== JSON.stringify(desired.sources)) {
        latest = await api.setRoleSources(hass, plant.id, revision, role, desired.sources); revision = latest.revision;
      }
      if (!base || base.primary_entity_id !== desired.primary_entity_id) {
        latest = await api.setRolePrimary(hass, plant.id, revision, role, desired.primary_entity_id); revision = latest.revision;
      }
      if (!base || base.aggregation !== desired.aggregation) {
        latest = await api.setRoleAggregation(hass, plant.id, revision, role, desired.aggregation); revision = latest.revision;
      }
      if (!base || base.stale_after_seconds !== desired.stale_after_seconds) {
        latest = await api.setRoleStaleAfter(hass, plant.id, revision, role, desired.stale_after_seconds); revision = latest.revision;
      }
      return latest;
    });
    if (!this._error) {
      this._sourceRole = null; this._sourceEdits = null; this._sourceBaseline = null; this._pendingSourceSwitch = null;
      this._sourceSaved = { ...this._sourceSaved, [role]: this._l.t("sensors.saved", { role: readingLabel(this._l, role) }) };
    }
  }
  // ---- Plant page ----
  private _renderHeader(plant: PlantRecord) {
    const l = this._l; const o = this._overview[plant.id];
    const areaId = plantDevice(plant, this._devices)?.area_id;
    const species = plant.species?.snapshot.latin_name ?? plant.species?.snapshot.common_name ?? null;
    const chip = o ? chipText(l, o) : null;
    return html`<div class="sp-card header-card">
      <div class="hero">
        <sp-plant-avatar size="large" .src=${this._imageUrl} .name=${plant.name} .l=${l} @photo-error=${() => { this._imageError = l.t("photo.decode_failed"); }}></sp-plant-avatar>
        <div class="hero-text">
          <h2 class="hero-name">${plant.name}</h2>
          <div class="hero-meta">${areaId ? html`<span><ha-icon aria-hidden="true" icon="mdi:texture-box"></ha-icon>${this._areaName(areaId)}</span>` : nothing}
            <span><ha-icon aria-hidden="true" icon="mdi:leaf"></ha-icon>${species ? html`<i>${species}</i>` : l.t("detail.no_species")}</span></div>
          ${o && chip ? html`<div class="hero-status"><sp-status-chip .status=${o.status} .label=${chip.label} .more=${chip.more} .l=${l}></sp-status-chip><span class="reason">${headerReason(l, o)}</span></div>` : nothing}
        </div>
        <div class="hero-actions">
          <button type="button" class="btn filled" ?disabled=${this._blocked || this._watering.has(plant.id) || !!this._conflict} @click=${() => void this._logWatering(plant.id)}><ha-icon aria-hidden="true" icon="mdi:water"></ha-icon>${l.t("card.log_watering")}</button>
          <button type="button" class="btn outline" @click=${() => this._openCareForm()}><ha-icon aria-hidden="true" icon="mdi:note-edit-outline"></ha-icon>${l.t("detail.log_care")}</button>
        </div>
      </div>
      ${renderKeyReadings(l, o)}
    </div>`;
  }
  private _renderTabs() {
    const l = this._l;
    if (isDefined("ha-tab-group")) {
      return html`<ha-tab-group class="tabs" @wa-tab-show=${(e: CustomEvent<{ name: string }>) => this._selectSection(e.detail.name)}>
        ${DETAIL_SECTIONS.map(section => html`<ha-tab-group-tab slot="nav" .panel=${section} .active=${this._detailSection === section}>${l.t(SECTION_LABELS[section])}</ha-tab-group-tab>`)}</ha-tab-group>`;
    }
    const move = (e: KeyboardEvent) => {
      const index = DETAIL_SECTIONS.indexOf(this._detailSection);
      const next = e.key === "ArrowRight" ? (index + 1) % DETAIL_SECTIONS.length : e.key === "ArrowLeft" ? (index + DETAIL_SECTIONS.length - 1) % DETAIL_SECTIONS.length : e.key === "Home" ? 0 : e.key === "End" ? DETAIL_SECTIONS.length - 1 : -1;
      if (next < 0) return;
      e.preventDefault(); this._selectSection(DETAIL_SECTIONS[next]!);
      void this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLElement>(`#tab-${DETAIL_SECTIONS[next]}`)?.focus());
    };
    return html`<div class="tablist" role="tablist" aria-label=${l.t("detail.sections_label")} @keydown=${move}>${DETAIL_SECTIONS.map(section => {
      const selected = this._detailSection === section;
      return html`<button type="button" role="tab" id=${`tab-${section}`} aria-controls="detail-panel" aria-selected=${selected ? "true" : "false"} tabindex=${selected ? "0" : "-1"} @click=${() => this._selectSection(section)}>${l.t(SECTION_LABELS[section])}</button>`;
    })}</div>`;
  }
  private _renderOverviewTab(plant: PlantRecord) {
    const l = this._l; const o = this._overview[plant.id]; const readings = readingsInOrder(o);
    const history = this._careHistory; const recent = history?.events.slice(0, 3) ?? [];
    const device = plantDevice(plant, this._devices);
    const notSet = l.t("about.not_set");
    const snapshot = plant.species?.snapshot;
    const cap = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);
    const createPath = device ? `/config/automation/edit/new?add_automation_element=trigger&target_device_id=${encodeURIComponent(device.id)}` : "";
    const devicePath = device ? `/config/devices/device/${encodeURIComponent(device.id)}` : "";
    return html`<div class="cols">
      <div class="stack">
        <section class="sp-card" aria-labelledby="readings-heading"><div class="card-h"><h3 id="readings-heading">${l.t("readings.heading")}</h3>
          ${readings.length ? html`<button type="button" class="btn text sm" @click=${() => this._selectSection("sensors")}>${l.t("readings.manage")}</button>` : nothing}</div>
          ${readings.length ? html`<ul class="list">${readings.map(([role, reading]) => renderReadingRow(l, role, reading, this._states))}</ul>`
            : html`<div class="card-b"><div class="empty-box"><span>${o?.status === "paused" ? l.t("readings.paused") : l.t("readings.empty")}</span><button type="button" class="btn tonal sm" @click=${() => this._selectSection("sensors")}>${l.t("readings.assign")}</button></div></div>`}
        </section>
        <section class="sp-card" aria-labelledby="recent-heading"><div class="card-h"><h3 id="recent-heading">${l.t("recent.heading")}</h3>
          ${history?.events.length ? html`<button type="button" class="btn text sm" @click=${() => this._selectSection("care")}>${l.t("recent.show_all")}</button>` : nothing}</div>
          ${!history ? html`<p class="card-b muted">${l.t("care.loading")}</p>` : recent.length ? html`<ul class="list">${recent.map(event => html`<li class="li"><span class="ic tonal" aria-hidden="true"><ha-icon .icon=${CARE_ICONS[event.kind]}></ha-icon></span>
            <span class="li-main"><span class="li-title">${l.t(`care_done.${event.kind}`)}</span><span class="li-sub">${l.date(event.local_date)}</span></span><span></span></li>`)}</ul>`
            : html`<div class="card-b"><div class="empty-box"><span>${l.t("care.empty")}</span><button type="button" class="btn tonal sm" @click=${() => this._openCareForm()}>${l.t("detail.log_care")}</button></div></div>`}
        </section>
      </div>
      <div class="stack">
        <section class="sp-card" aria-labelledby="about-heading"><div class="card-h"><h3 id="about-heading">${l.t("about.heading")}</h3>
          <button type="button" class="icon-btn" aria-label=${l.t("about.edit")} @click=${() => this._selectSection("settings")}><ha-icon aria-hidden="true" icon="mdi:pencil-outline"></ha-icon></button></div>
          <div class="card-b"><dl class="kv about">
            <dt>${l.t("about.species")}</dt><dd>${snapshot ? html`${snapshot.latin_name ? html`<i>${snapshot.latin_name}</i>` : nothing}${snapshot.common_name && snapshot.common_name !== snapshot.latin_name ? html`${snapshot.latin_name ? " · " : ""}${snapshot.common_name}` : nothing}
              <div class="small muted">${snapshot.source_status === "provider" ? l.t("about.species_provider", { provider: snapshot.provider === "openplantbook" ? "OpenPlantBook" : snapshot.provider }) : l.t("about.species_manual")}</div>`
              : html`<button type="button" class="btn text sm" @click=${() => this._openSetting("species")}>${l.t("about.add_species")}</button>`}</dd>
            <dt>${l.t("about.area")}</dt><dd>${device?.area_id ? this._areaName(device.area_id) : l.t("area.none")}</dd>
            <dt>${l.t("about.placement")}</dt><dd>${plant.placement ? cap(placementLabel(l, plant.placement.mode)) : notSet}</dd>
            <dt>${l.t("about.since")}</dt><dd>${plant.acquired_at ? l.date(plant.acquired_at.slice(0, 10)) : notSet}</dd>
            <dt>${l.t("about.category")}</dt><dd>${plant.category ?? notSet}</dd>
            <dt>${l.t("about.tags")}</dt><dd>${plant.tags.length ? plant.tags.map(tag => html`<span class="tag">${tag}</span>`) : notSet}</dd>
          </dl></div></section>
        <section class="sp-card" aria-labelledby="automations-heading"><div class="card-h"><h3 id="automations-heading">${l.t("automations.heading")}</h3></div>
          <div class="card-b"><p class="small muted">${l.t("automations.body")}</p>
            ${device ? html`<div class="row"><a class="btn outline sm" href=${devicePath} @click=${(e: MouseEvent) => this._internalLink(e, devicePath)}><ha-icon aria-hidden="true" icon="mdi:devices"></ha-icon>${l.t("automations.open_device")}</a>
              <a class="btn outline sm" href=${createPath} @click=${(e: MouseEvent) => this._internalLink(e, createPath)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("automations.create")}</a></div>` : nothing}
          </div></section>
      </div></div>`;
  }
  private _openSetting(row: SettingRow): void {
    const next = new Set(this._settingsOpen); next.add(row); this._settingsOpen = next;
    this._goTo("settings", `#setting-${row}-editor input, #setting-${row}-editor select, #setting-${row}-editor ha-area-picker`);
  }
  private _closeSetting(row: SettingRow): void {
    const next = new Set(this._settingsOpen); next.delete(row); this._settingsOpen = next;
  }
  // One row of the Plant card: title, current value and an inline editor.
  private _settingRow(row: SettingRow, title: string, value: unknown, action: string, editor: () => unknown, forceOpen = false) {
    const l = this._l; const open = forceOpen || this._settingsOpen.has(row);
    return html`<div class="setrow"><div><div class="setrow-h" id=${`setting-${row}`}>${title}</div><div class="setrow-d">${value}</div></div>
      <button type="button" class="btn text sm" aria-expanded=${open ? "true" : "false"} aria-controls=${`setting-${row}-editor`} ?disabled=${forceOpen} @click=${() => open ? this._closeSetting(row) : this._openSetting(row)}>${open ? l.t("settings.close") : action}</button>
      ${open ? html`<div class="setrow-editor" id=${`setting-${row}-editor`}>${editor()}</div>` : nothing}</div>`;
  }
  private _renderSettingsTab(plant: PlantRecord) {
    const l = this._l; const edit = this._edits!; const m = moistureRole(plant);
    const disabled = this._formBusy || this._blocked || !!this._conflict;
    const device = plantDevice(plant, this._devices);
    const snapshot = plant.species?.snapshot;
    const speciesName = snapshot ? snapshot.latin_name ?? snapshot.common_name ?? l.t("snapshot.species") : "";
    const speciesValue = snapshot ? html`<i>${speciesName}</i> · ${snapshot.source_status === "provider" ? l.t("settings.species_provider", { provider: snapshot.provider === "openplantbook" ? "OpenPlantBook" : snapshot.provider, date: l.date(snapshot.fetched_at.slice(0, 10)) }) : l.t("about.species_manual")}` : l.t("settings.species_none");
    const areaPicker = isDefined("ha-area-picker") && this.hass
      ? html`<ha-area-picker .hass=${this.hass} .label=${l.t("area.label")} .value=${edit.area || undefined} .noAdd=${true} .disabled=${disabled || !!this._registryError || this._areaReview} @value-changed=${(e: CustomEvent<{ value?: string }>) => this._edit({ area: e.detail.value ?? "" })}></ha-area-picker>`
      : html`<fieldset ?disabled=${disabled || !!this._registryError || this._areaReview}>${areaEditor(l, edit.area, this._areas, v => this._edit({ area: v }))}</fieldset>`;
    const defaults = this._defaults(plant);
    const fromSpecies = m ? keys.some(k => m.threshold_defaults[k].source === "provider") : false;
    const custom = m ? keys.some(k => m.threshold_overrides[k] !== null) : false;
    const targetLine = custom ? l.t(fromSpecies ? "targets.custom_species" : "targets.custom_defaults") : l.t(fromSpecies ? "targets.from_species" : "targets.from_defaults");
    const targetLabels: Record<typeof keys[number], MessageKey> = { min: "targets.needs_water", target: "targets.ideal", max: "targets.too_wet" };
    const lifecycleActive = plant.lifecycle_state === "active";
    return html`<section class="sp-card" aria-labelledby="plant-settings-heading"><div class="card-h"><h3 id="plant-settings-heading">${l.t("settings.plant_heading")}</h3></div>
        ${this._settingRow("name", l.t("settings.name"), plant.name, l.t("settings.rename"), () => html`<fieldset ?disabled=${disabled}>${textField(l.t("detail.name"), edit.name, v => this._edit({ name: v }))}
          <div class="actions"><button type="button" @click=${() => { this._edit({ name: plant.name }); this._closeSetting("name"); }}>${l.t("common.cancel")}</button>${this._saveButton("identity", l.t("settings.save_name"))}</div></fieldset>`)}
        ${this._settingRow("area", l.t("settings.area"), l.t("settings.area_value", { area: this._areaName(device?.area_id ?? "") }), l.t("settings.change_area"), () => html`
          ${this._areaReview ? html`<p class="notice">${l.t("detail.area_review")}</p><div class="row"><button type="button" @click=${() => this._areaReview = false}>${l.t("detail.area_reviewed")}</button><button type="button" @click=${() => { this._edit({ area: this._baseArea }); this._areaReview = false; }}>${l.t("detail.area_use_current")}</button></div>` : nothing}
          ${areaPicker}<div class="actions"><button type="button" ?disabled=${disabled} @click=${() => { this._edit({ area: this._baseArea }); this._closeSetting("area"); }}>${l.t("common.cancel")}</button><button type="button" class="primary" ?disabled=${disabled || !!this._registryError || this._areaReview} @click=${() => void this._save("area")}>${l.t("detail.save_area")}</button></div>`, this._areaReview)}
        ${this._renderPhotoRow(plant)}
        ${this._settingRow("species", l.t("settings.species"), speciesValue, snapshot ? l.t("settings.change_species") : l.t("settings.find_species"), () => html`
          ${plant.species ? snapshotView(l, plant.species.snapshot) : nothing}<fieldset ?disabled=${disabled}>
          ${plant.species?.snapshot.provider_ref ? html`<button type="button" @click=${() => void this._previewSpecies()}>${l.t("species.preview_refresh")}</button>` : nothing}
          ${selectField(l, l.t("species.provider"), this._provider, [{ value: "manual", label: l.t("species.manual") }, ...(this._capabilities?.providers.filter(p => p.available && p.search_supported).map(p => ({ value: p.provider, label: p.provider === "openplantbook" ? "OpenPlantBook" : p.provider })) ?? [])], v => { this._providerRequest++; this._provider = v; this._preview = null; this._results = []; })}
          ${this._provider === "manual" ? html`${textField(l.t("species.common_name"), edit.common, v => this._edit({ common: v }))}${textField(l.t("species.scientific_name"), edit.latin, v => this._edit({ latin: v }))}<p class="small muted">${l.t("species.manual_hint")}</p><div class="actions">${this._saveButton("species", l.t("species.save_manual"))}</div>`
            : html`${textField(l.t("species.search"), this._query, v => { this._query = v; this._providerRequest++; this._results = []; this._preview = null; })}<div class="actions"><button type="button" @click=${() => void this._searchSpecies()}>${l.t("species.search")}</button></div><ul class="result-list">${this._results.map(r => html`<li><button type="button" @click=${() => void this._previewSpecies(r)}>${r.common_name ?? r.latin_name} · ${r.latin_name}</button><small>${r.attribution}</small></li>`)}</ul><button type="button" @click=${() => { this._provider = "manual"; this._providerRequest++; this._preview = null; }}>${l.t("common.continue_manually")}</button>`}</fieldset>`)}
      </section>
      <section class="sp-card" aria-labelledby="targets-heading"><div class="card-h"><h3 id="targets-heading">${l.t("targets.heading")}</h3></div>
        <div class="card-b">${m && edit.moisture ? html`<p class="small muted">${targetLine}</p>
          <fieldset ?disabled=${disabled}><div class="thr">${keys.map(k => {
            const override = edit.moisture!.threshold_overrides[k];
            return html`<div><label>${l.t(targetLabels[k])}<span class="field-suffix"><input type="number" min="1" max="99" step="1" inputmode="numeric" aria-label=${l.t(targetLabels[k])} .value=${override === null ? "" : String(override)} placeholder=${String(defaults[k])}
              @input=${(e: Event) => { const v = (e.target as HTMLInputElement).value; this._edit({ moisture: { ...edit.moisture!, threshold_overrides: { ...edit.moisture!.threshold_overrides, [k]: v.trim() === "" ? null : Number(v) } } }); }}><span aria-hidden="true">%</span></span></label>
              <small>${override === null ? l.t("targets.default_hint", { value: l.percent(defaults[k]) }) : l.t("targets.custom_hint", { value: l.percent(defaults[k]) })}</small></div>`;
          })}</div>
          <div class="row"><button type="button" class="btn text sm" @click=${() => this._edit({ moisture: { ...edit.moisture!, threshold_overrides: { min: null, target: null, max: null } } })}>${l.t("targets.reset")}</button><span class="spacer"></span>
            <button type="button" class="btn filled sm" @click=${() => void this._save("moisture")}>${l.t("targets.save")}</button></div></fieldset>`
          : html`<p class="error" role="alert">${l.t("moisture.incompatible")}</p>`}</div></section>
      ${this._expander("other_targets", "mdi:tune-variant", l.t("other_targets.heading"), l.t("other_targets.secondary"), () => this._renderOtherTargets(plant))}
      ${this._expander("more_details", "mdi:tag-outline", l.t("more_details.heading"), l.t("more_details.secondary"), () => html`
        <fieldset ?disabled=${disabled}>${placementEditor(l, edit.placement, v => this._edit({ placement: v }))}
          <label>${l.t("detail.acquired")}<input type="date" .value=${edit.acquired.slice(0, 10)} @input=${(e: Event) => this._edit({ acquired: (e.target as HTMLInputElement).value })}></label>
          <div class="actions">${this._saveButton("identity", l.t("more_details.save_identity"))}</div></fieldset>
        <fieldset ?disabled=${disabled}>${textField(l.t("taxonomy.category"), edit.category, v => this._edit({ category: v }), "text", 60)}${textField(l.t("taxonomy.tags"), edit.tagText, v => this._edit({ tagText: v }), "text", 2000)}<p class="small muted">${l.t("taxonomy.hint")}</p>
          <div class="actions">${this._saveButton("taxonomy", l.t("taxonomy.save"))}</div></fieldset>`)}
      <section class="sp-card" aria-labelledby="manage-heading"><div class="card-h"><h3 id="manage-heading">${l.t("manage.heading")}</h3></div>
        <div class="setrow"><div><div class="setrow-h">${lifecycleActive ? l.t("manage.pause") : l.t("manage.resume")}</div><div class="setrow-d">${lifecycleActive ? l.t("manage.pause_hint") : l.t("manage.resume_hint")}</div></div>
          <button type="button" class="btn outline sm" ?disabled=${disabled} @click=${() => this._toggleMonitoring(plant)}>${lifecycleActive ? l.t("manage.pause_button") : l.t("manage.resume_button")}</button></div>
        <div class="setrow"><div><div class="setrow-h">${l.t("manage.delete")}</div><div class="setrow-d">${l.t("manage.delete_hint")}</div></div>
          <button type="button" class="btn danger sm" ?disabled=${disabled} @click=${() => this._openDialog("delete")}>${l.t("manage.delete_button")}</button></div>
      </section>`;
  }
  private _renderDetail(id: string) {
    const l = this._l;
    const plant = this._plantById(id); const edit = this._edits;
    if (!plant || !edit) return html`<p>${l.t("detail.not_found")}</p>`;
    const overlaps = this._conflict ? this._sourceConflictFields(this._conflict.after) : [];
    const panels: Record<DetailSection, () => unknown> = {
      overview: () => this._renderOverviewTab(plant),
      sensors: () => this._renderSensorsTab(plant),
      care: () => this._renderCare(plant),
      settings: () => this._renderSettingsTab(plant),
    };
    return html`<div class="pd">
      ${this._conflict ? html`<section class="notice" role="alert"><h2>${l.t("conflict.heading")}</h2><p>${l.t("conflict.revision", { before: this._conflict.before.revision, after: this._conflict.after.revision })}</p><ul>${this._conflict.changes.map(c => html`<li class="prose">${c}</li>`)}</ul>${overlaps.length ? html`<p>${l.t("conflict.source_overlap", { fields: this._sourceFieldList(overlaps) })}</p>` : nothing}<div class="actions"><button @click=${() => this._reviewConflict()}>${l.t("conflict.retain")}</button><button @click=${() => this._beginEdit(plant)}>${l.t("conflict.discard")}</button></div></section>` : nothing}
      ${this._renderHeader(plant)}
      ${this._renderTabs()}
      <div class="tabpanel" id="detail-panel" role="tabpanel" aria-label=${l.t(SECTION_LABELS[this._detailSection])}>${panels[this._detailSection]()}</div>
      ${this._renderDialog()}</div>`;
  }
  // Leaving the wizard with Cancel or from its confirmation discards it, so
  // the next "Add plant" starts with a fresh draft.
  private _closeWizard(): void {
    if (this._formBusy) return;
    this._clearCreationNotice();
    this._wizardStarted = false;
    this._show({ kind: "list" });
  }
  // "Open plant" on the confirmation: leave the wizard for the new plant's page.
  private _openCreated(plantId: string): void {
    if (this._formBusy || !this._plantById(plantId)) return;
    this._clearCreationNotice();
    this._wizardStarted = false;
    this._show({ kind: "detail", plantId });
  }
  // A finished creation notice is no longer needed once the confirmation was
  // seen; an upload in progress keeps reporting until it ends.
  private _clearCreationNotice(): void {
    if (this._creationNotice.endsWith(this._l.t("created.uploading"))) return;
    this._creationNotice = ""; this._creationPhoto = ""; this._createdPlantId = null;
  }
  private async _created(e: CustomEvent<{ plant: PlantRecord; photo: File | null; navigationContext: number }>): Promise<void> {
    const { plant, photo, navigationContext } = e.detail;
    const hass = this.hass;
    const foreground = this._view.kind === "create" && navigationContext === this._context;
    const initialPhoto = photo && plant.revision === 1 && plant.image === null;
    // The visible wizard shows its confirmation; a hidden one is discarded.
    if (!foreground) this._wizardStarted = false;
    // A committed result belongs in inventory even when its wizard is hidden.
    const latest = this._plantById(plant.id);
    if (!latest || latest.revision <= plant.revision) this._plants = [...this._plants.filter(p => p.id !== plant.id), plant];
    this._createdPlantId = plant.id;
    const l = this._l; const created = l.t("created.notice", { name: plant.name }); const uploading = l.t("created.uploading");
    const note = (photoText: string) => { this._creationPhoto = photoText; this._creationNotice = photoText ? `${created} ${photoText}` : created; };
    note(initialPhoto ? uploading : photo ? l.t("created.photo_skipped") : "");
    const photoContext = this._context;
    // Reconcile through reads without rebasing or clearing unrelated pending
    // edits. Invalidate reads admitted before the creation result as usual.
    void this._refresh(false);
    if (!initialPhoto || !hass) return;
    try {
      // Photo completion is independent of the selected editor and its busy
      // state. Never use _mutate/_show here: either would couple background
      // creation to unrelated navigation or edits. Revision validation remains
      // authoritative if the new plant is edited while its upload is pending.
      await validateImage(photo, l);
      if (!this.isConnected || this.hass?.connection !== hass.connection || this._blocked) return;
      const uploaded = await api.uploadImage(hass, plant.id, plant.revision, photo);
      if (!this.isConnected || this.hass?.connection !== hass.connection) return;
      // The still-current created-plant editor can adopt its own photo revision
      // while retaining dirty fields. Other contexts reconcile only via refresh.
      if (photoContext === this._context && this._base?.id === plant.id && this._base.revision === plant.revision && !this._formBusy && !this._conflict) this._rebaseEdits(this._base, uploaded);
      if (this._createdPlantId === plant.id) note(l.t("created.photo_uploaded"));
    } catch (error) {
      if (!this.isConnected || this.hass?.connection !== hass.connection) return;
      if (this._createdPlantId === plant.id) note(`${l.t("created.photo_failed")} ${this._friendly(error)}`);
    } finally {
      if (this._createdPlantId === plant.id && this._creationNotice.endsWith(uploading)) note(l.t("created.photo_interrupted"));
    }
    await this._refresh(false);
  }
  protected render() {
    const l = this._l;
    if (this.hass?.user?.is_admin === false) return html`<main><div class="panel-content"><p role="alert">${l.t("panel.admin_required")}</p></div></main>`;
    const menuLabel = this.hass?.localize?.("ui.common.menu") || l.t("panel.menu");
    const detailPlant = this._view.kind === "detail" ? this._plantById(this._view.plantId) : undefined;
    const busy = this._formBusy || this._blocked || !!this._conflict;
    return html`<main><ha-top-app-bar-fixed class="panel-appbar" .narrow=${this.narrow}>
       ${this._view.kind === "detail" ? html`<ha-icon-button slot="navigationIcon" class="back" .label=${l.t("detail.back")} .path=${BACK_ICON_PATH} @click=${() => { if (!this._formBusy) this._show({ kind: "list" }); }}></ha-icon-button>` : nothing}
       <h1 slot="title" class="page-title" tabindex="-1">${detailPlant ? detailPlant.name : "Smart Plants"}</h1>
       <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
         <ha-icon-button slot="trigger" .label=${menuLabel} .path=${MENU_ICON_PATH}></ha-icon-button>
         ${detailPlant ? html`
         <ha-dropdown-item value="open-device" ?disabled=${!plantDevice(detailPlant, this._devices)}>${l.t("detail.menu_open_device")}<ha-icon slot="icon" icon="mdi:open-in-new"></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="download-diagnostics">${l.t("detail.menu_download")}<ha-icon slot="icon" icon="mdi:download"></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="toggle-monitoring" ?disabled=${busy}>${detailPlant.lifecycle_state === "active" ? l.t("manage.pause") : l.t("manage.resume")}<ha-icon slot="icon" .icon=${detailPlant.lifecycle_state === "active" ? "mdi:pause-circle-outline" : "mdi:play-circle-outline"}></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="delete-plant" ?disabled=${busy}>${l.t("manage.delete")}<ha-icon slot="icon" icon="mdi:delete-outline"></ha-icon></ha-dropdown-item>` : html`
         ${this._view.kind !== "list" ? html`<ha-dropdown-item value="back-to-overview" ?disabled=${this._formBusy}>${l.t("panel.back_to_overview")}</ha-dropdown-item>` : nothing}
         <ha-dropdown-item value="add-plant" ?disabled=${this._blocked}>${l.t("panel.add_plant")}<ha-svg-icon slot="icon" .path=${ADD_ICON_PATH}></ha-svg-icon></ha-dropdown-item>
         <ha-dropdown-item value="integration-options">${l.t("overview.integration_options")}<ha-icon slot="icon" icon="mdi:cog-outline"></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="documentation">${l.t("overview.documentation")}<ha-icon slot="icon" icon="mdi:help-circle-outline"></ha-icon></ha-dropdown-item>`}
       </ha-dropdown>
       <div class="panel-content">${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}${this._notice ? html`<p class="notice" role="status">${this._notice}</p>` : nothing}${this._registryError ? html`<p class="notice" role="alert">${l.t("panel.registry_unavailable")}</p>` : nothing}
      ${this._creationNotice && this._view.kind !== "create" ? html`<p class="notice" role="status">${this._creationNotice}</p>${this._createdPlantId && !(this._view.kind === "detail" && this._view.plantId === this._createdPlantId) ? html`<button ?disabled=${this._formBusy} @click=${() => { if (this._createdPlantId) this._show({ kind: "detail", plantId: this._createdPlantId }); }}>${l.t("panel.open_created")}</button>` : nothing}` : nothing}
      ${this._view.kind === "list" && this._overviewError ? html`<p class="error" role="alert">${l.t("overview.status_unavailable", { error: this._overviewError })}</p>` : nothing}
      <smart-plants-overview ?hidden=${this._view.kind !== "list"} .l=${l} .plants=${this._plants} .overview=${this._overview} .areaNames=${this._plantAreaNames()}
        .thumbnails=${this._thumbnails} .watering=${this._watering} .loading=${this._loading} .blocked=${this._blocked}
        @open-plant=${(e: CustomEvent<OpenPlantDetail>) => this._openFromOverview(e.detail)} @add-plant=${() => this._show({ kind: "create" })} @log-watering=${(e: CustomEvent<{ plantId: string }>) => void this._logWatering(e.detail.plantId)}></smart-plants-overview>
      ${this._view.kind === "detail" ? this._renderDetail(this._view.plantId) : nothing}
      ${this._wizardStarted && this._capabilities ? html`<div ?hidden=${this._view.kind !== "create"}><smart-plants-wizard .hass=${this.hass} .capabilities=${this._capabilities} .areas=${this._areas} .entities=${this._entities} .devices=${this._devices} .states=${this._states} .blocked=${this._blocked} .navigationContext=${this._context} .photoStatus=${this._creationPhoto} @plant-created=${(e: CustomEvent<{ plant: PlantRecord; photo: File | null; navigationContext: number }>) => void this._created(e)} @wizard-close=${() => this._closeWizard()} @wizard-open-plant=${(e: CustomEvent<{ plantId: string }>) => this._openCreated(e.detail.plantId)} @wizard-restart=${() => this._clearCreationNotice()} @backend-unavailable=${(e: CustomEvent<string>) => { this._blocked = true; this._error = e.detail; }}></smart-plants-wizard></div>` : nothing}
        <p role="status" aria-live="polite">${this._formBusy ? l.t("panel.busy") : ""}</p></div></ha-top-app-bar-fixed></main>`;
  }
}
// Keep SPA navigation and cache-busted bundle reloads idempotent: HA retains
// custom element definitions for the lifetime of its frontend document.
if (!customElements.get("smart-plants-panel")) {
  customElements.define("smart-plants-panel", SmartPlantsPanel);
}
declare global { interface HTMLElementTagNameMap { "smart-plants-panel": SmartPlantsPanel } }
