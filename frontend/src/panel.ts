import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { PropertyValues } from "lit";
import { api, ApiError } from "./api.js";
import type { UpdatePlantInput } from "./api.js";
import { aggregationLabel, areaEditor, moistureEditor, placementEditor, roleSourcesEditor, selectField, snapshotView, textField, thresholdKeyLabel } from "./editors.js";
import { createLocalizer, isMessageKey } from "./localize.js";
import type { Localizer, MessageKey } from "./localize.js";
import { CO2_STRESS_BUILTIN_DEFAULTS, CO2_STRESS_KEYS, CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS, CONDUCTIVITY_STRESS_KEYS, HUMIDITY_STRESS_BUILTIN_DEFAULTS, HUMIDITY_STRESS_KEYS, LOW_BATTERY_STRESS_BUILTIN_DEFAULTS, LOW_BATTERY_STRESS_KEYS, LOW_LIGHT_STRESS_BUILTIN_DEFAULTS, LOW_LIGHT_STRESS_KEYS, SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS, SOIL_TEMPERATURE_STRESS_KEYS, TEMPERATURE_STRESS_BUILTIN_DEFAULTS, TEMPERATURE_STRESS_KEYS, builtin, canonicalMoisture, co2StressInput, conductivityStressInput, confidenceGloss, confidenceLabel, contributorLabel, effectiveThresholds, humidityStressInput, keys, lowBatteryInput, lowLightInput, manualSpecies, moistureInput, moistureRole, plantDevice, problemBinaries, resolveSource, roleLabel, rolePhrase, roleSourceConfig, roleSourceInput, roleSourceSpec, ROLE_SOURCE_SPECS, canonicalRoleSources, validateRoleSources, soilTemperatureStressInput, tags, temperatureStressInput, validateCo2StressOverrides, validateConductivityStressOverrides, validateHumidityStressOverrides, validateLowBatteryOverrides, validateLowLightOverrides, validateMoisture, validateSoilTemperatureStressOverrides, validateTaxonomy, validateTemperatureStressOverrides } from "./model.js";
import type { ProblemBinaryRole, SourceRole } from "./model.js";

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
import { validateImage } from "./image.js";
import { validState } from "./validation.js";
import { styles } from "./styles.js";
import "./wizard.js";
import { DOCUMENTATION_URL } from "./views/overview.js";
import type { OpenPlantDetail } from "./views/overview.js";
import type { PlantOverview } from "./overview-model.js";
import type { CareEvent, CareHistory, Evaluation, HAArea, HADevice, HAEntity, HAState, HealthEvaluation, HomeAssistantLike, MoistureInput, PanelCapabilities, PanelInfo, PlantPlacement, PlantRecord, RoleSourceInput, SpeciesPreview, SpeciesSearchResult } from "./types.js";

type View = { kind: "list" } | { kind: "create" } | { kind: "detail"; plantId: string };
type DetailSection = "overview" | "sensors" | "care" | "details" | "diagnostics";
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
  static styles = styles;
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
  @state() private _sourceUnavailable: { role: string; plantId: string; revision: number } | null = null;
  @state() private _sourceSaved: Record<string, string> = {};
  @state() private _pendingSourceSwitch: { role: string; plant: PlantRecord } | null = null;
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
    const active = this.shadowRoot?.activeElement;
    if (dialog?.open && (!active || !dialog.contains(active) || active.matches(":disabled"))) dialog.querySelector<HTMLElement>("button")?.focus();
  }
  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) { this._bind(); void this._refresh(); this._syncImage(); }
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
      this._detailSection = "overview";
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
      this._adopt(result.plant);
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
      this._adopt(result.plant);
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
  private _renderCare(plant: PlantRecord) {
    const l = this._l;
    const history = this._careHistory;
    const details: Record<string, string[]> = { fertilizing: ["product", "amount", "unit"], pruning: ["part"], repotting: ["container", "medium"], note: ["text"] };
    const fieldLabel = (key: string) => { const k = `care_field.${key}`; return isMessageKey(k) ? l.t(k) : key; };
    const kindLabel = (kind: CareEvent["kind"]) => l.t(`care_kind.${kind}`);
    const kindPhrase = (kind: CareEvent["kind"]) => l.t(`care_kind_phrase.${kind}`);
    const fieldValue = (key: string, value: unknown) => typeof value === "number" && key === "amount" ? l.number(value) : String(value);
    return html`<section aria-labelledby="care-heading"><h2 id="care-heading">${l.t("care.heading")}</h2>
      ${this._careError ? html`<p class="error" role="alert">${this._careError}</p>` : nothing}
      ${history ? html`<p role="status">${l.tn(history.summary.watering_count, "care.watering_count_one", "care.watering_count_other")} ${history.summary.last_watered_local_date ? l.t("care.last_watered", { date: l.date(history.summary.last_watered_local_date) }) : l.t("care.never_watered")}</p>
        ${history.events.length ? html`<ul aria-label=${l.t("care.events_label")}>${history.events.map(event => html`<li><strong>${kindLabel(event.kind)}</strong> <time datetime=${event.occurred_at}>${l.recordedDateTime(event.occurred_at)}</time>
          ${Object.entries(event.payload).filter(([, value]) => value !== null).map(([key, value]) => html`<p>${fieldLabel(key)}: ${fieldValue(key, value)}</p>`)}
          <button type="button" ?disabled=${this._formBusy || !!this._conflict} @click=${() => this._editCare(event)}>${l.t("care.edit_kind", { kind: kindPhrase(event.kind) })}</button>
          <button type="button" ?disabled=${this._formBusy || !!this._conflict} @click=${() => void this._deleteCare(plant, event)}>${l.t("care.delete_kind", { kind: kindPhrase(event.kind) })}</button></li>`)}</ul>` : html`<p>${l.t("care.empty")}</p>`}` : html`<p>${l.t("care.loading")}</p>`}
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict || !history || history.revision !== plant.revision}>
        <legend>${this._careEditingId ? l.t("care.edit_kind", { kind: kindPhrase(this._careKind) }) : l.t("care.record")}</legend>
        <label>${l.t("care.type")}<select aria-label=${l.t("care.type")} .value=${this._careKind} @change=${(e: Event) => { this._careKind = (e.target as HTMLSelectElement).value as CareEvent["kind"]; this._careFields = {}; }}>${(["watering", "fertilizing", "pruning", "repotting", "note"] as const).map(kind => html`<option value=${kind}>${kindLabel(kind)}</option>`)}</select></label>
        <label>${l.t("care.when")}<input type="datetime-local" .value=${this._careDate} @input=${(e: Event) => this._careDate = (e.target as HTMLInputElement).value}></label>
        ${(details[this._careKind] ?? []).map(key => html`<label>${fieldLabel(key)}<input aria-label=${fieldLabel(key)} type=${key === "amount" ? "number" : "text"} maxlength=${key === "text" ? 1000 : 120} .value=${this._careFields[key] ?? ""} @input=${(e: Event) => this._careFields = { ...this._careFields, [key]: (e.target as HTMLInputElement).value }}></label>`)}
        ${this._careKind !== "note" ? html`<label>${l.t("care.note_optional")}<input type="text" maxlength="500" .value=${this._careNote} @input=${(e: Event) => this._careNote = (e.target as HTMLInputElement).value}></label>` : nothing}
        ${this._careKind === "fertilizing" ? html`<label>${l.t("care.unit")}<select aria-label=${l.t("care.unit")} .value=${this._careFields.unit ?? ""} @change=${(e: Event) => this._careFields = { ...this._careFields, unit: (e.target as HTMLSelectElement).value }}><option value="">${l.t("care.no_amount")}</option><option value="g">g</option><option value="mL">mL</option></select></label>` : nothing}
        <button type="button" class="primary" @click=${() => void this._saveCare(plant)}>${this._careEditingId ? l.t("care.save_changes") : l.t("care.record")}</button>
        ${this._careEditingId ? html`<button type="button" @click=${() => { this._careEditingId = null; this._careKind = "watering"; this._careFields = {}; this._careNote = ""; }}>${l.t("care.cancel_editing")}</button>` : nothing}
      </fieldset><p>${l.t("care.no_irrigation")}</p></section>`;
  }
  private _edit(part: Partial<Edits>): void { if (this._edits) this._edits = { ...this._edits, ...part }; }
  private _status(p: PlantRecord): string {
    const e = this._evaluations[p.id];
    if (p.lifecycle_state === "disabled") return "disabled";
    if (!e || !e.computed_available) return "unavailable";
    if (e.needs_water) return "needs water";
    if (e.too_wet) return "too wet";
    if (e.sensor_stale) return "stale";
    return "healthy";
  }
  // `_status` values double as filter option values; this maps them for display.
  private _statusLabel(status: string): string {
    const keys: Record<string, MessageKey> = { healthy: "status.healthy", "needs water": "status.needs_water", "too wet": "status.too_wet", stale: "status.stale", unavailable: "status.unavailable", disabled: "status.disabled", problems: "status.problems" };
    return keys[status] ? this._l.t(keys[status]) : status;
  }
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
  private _renderImage(plant: PlantRecord) {
    const l = this._l;
    return html`<section><h2>${l.t("photo.heading")}</h2>${plant.image ? this._imageLoading ? html`<p role="status">${l.t("photo.loading")}</p>` : this._imageError ? html`<p class="error" role="alert">${l.t("photo.load_failed", { error: this._imageError })}</p><button @click=${() => { this._clearImage(); this._syncImage(); }}>${l.t("photo.retry")}</button>` : this._imageUrl ? html`<img class="preview" alt=${l.t("photo.alt", { name: plant.name })} src=${this._imageUrl} @error=${() => { this._imageError = l.t("photo.decode_failed"); }}>` : nothing : html`<p>${l.t("photo.none")}</p>`}
      ${plant.image ? html`<p>${l.t("photo.stored", { type: plant.image.content_type, width: plant.image.width, height: plant.image.height })}</p>` : nothing}
      <label>${plant.image ? l.t("photo.replace") : l.t("photo.upload")}<input type="file" accept="image/jpeg,image/png,image/webp" ?disabled=${this._formBusy || this._blocked || !!this._conflict} @change=${(e: Event) => { const input = e.target as HTMLInputElement; const file = input.files?.[0]; input.value = ""; if (file) void this._uploadImage(plant, file); }}></label><small>${l.t("photo.hint")}</small>
      ${plant.image ? html`<button ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => { if (this.hass) { const hass = this.hass; void this._mutate(() => api.deleteImage(hass, plant.id, plant.revision)); } }}>${l.t("photo.remove")}</button>` : nothing}</section>`;
  }
  private _saveButton(kind: SaveKind, label: string) { return html`<button class="primary" @click=${() => void this._save(kind)}>${label}</button>`; }
  private _renderOverallHealth(plant: PlantRecord) {
    // Read-only surfacing of the accepted multi-role health composite.
    // Reads only the sibling `smart_plants/plants/health` reply cached in
    // `_health`; issues no new WebSocket command or mutation of any kind.
    const health = this._health[plant.id];
    const l = this._l;
    const unavailable = l.t("section.overall_health_unavailable");
    return html`<section aria-labelledby="overall-health-heading"><h2 id="overall-health-heading">${l.t("section.overall_health")}</h2>
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
  private _renderDiagnostics(plant: PlantRecord) {
    // Read-only status rows + effective-threshold sub-lists.
    // Editable roles are listed in THRESHOLD_EDITORS.
    const l = this._l;
    const rows = problemBinaries(plant, this._entities, this._states, l);
    const active = rows.filter(r => r.status === "on").length;
    const statusText = (status: string) => status === "on"
      ? l.t("section.advanced_diagnostics_status_problem")
      : status === "off"
        ? l.t("section.advanced_diagnostics_status_ok")
        : status === "unavailable"
          ? l.t("section.advanced_diagnostics_status_unavailable")
          : l.t("section.advanced_diagnostics_status_not_configured");
    const pending = this._pendingThresholdSwitch;
    const currentSpec = this._thresholdRole ? _EDITOR_BY_PROBLEM_ROLE[this._thresholdRole] : null;
    const currentLabel = currentSpec ? l.t(`problem_phrase.${currentSpec.problemRole}`) : "";
    const pendingLabel = pending ? l.t(`problem_phrase.${pending.spec.problemRole}`) : "";
    const summary = active === 0
      ? l.t("section.advanced_diagnostics_zero_active")
      : l.tn(active, "section.advanced_diagnostics_one_active", "section.advanced_diagnostics_many_active");
    return html`<section aria-labelledby="diagnostics-heading"><h2 id="diagnostics-heading">${l.t("section.advanced_diagnostics")}</h2>
      <p role="status" aria-live="polite">${summary}</p>
      <p>${l.t("section.advanced_diagnostics_description")}</p>
      ${pending ? html`<p class="notice threshold-switch-alert" role="alert">${l.t("section.advanced_diagnostics_switch_prompt", { current: currentLabel, pending: pendingLabel })}
        <button type="button" class="primary" @click=${() => this._confirmDiscardAndSwitch()}>${l.t("section.advanced_diagnostics_switch_discard")}</button>
        <button type="button" @click=${() => { this._pendingThresholdSwitch = null; }}>${l.t("section.advanced_diagnostics_switch_keep")}</button>
      </p>` : nothing}
      <dl class="diagnostics">${rows.map(row => {
        const thresholds = row.status === "not_configured" ? [] : effectiveThresholds(plant, row.role, this._entities, this._states, l);
        const spec = _EDITOR_BY_PROBLEM_ROLE[row.role];
        const editable = !!spec && row.status !== "not_configured";
        const editing = editable && this._thresholdRole === row.role && this._thresholdEdits !== null;
        const saved = spec ? this._thresholdSaved[row.role] : "";
        // The <dt> names the row and the <dd> text carries the status; ARIA
        // prohibits aria-label on the definition role, so none is set here.
        return html`<dt>${row.label}</dt><dd class=${"status-" + row.status}>${statusText(row.status)}${row.reason ? html` — ${this._problemReason(row.reason)}` : nothing}${thresholds.length ? html`<ul class="thresholds" aria-label=${l.t("section.effective_thresholds_label", { label: row.label })}>${thresholds.map(t => html`<li><span class="threshold-label">${t.label}</span>: <span class="threshold-value">${t.value === null ? "—" : `${l.number(t.value)} ${t.unit}`}</span></li>`)}</ul>` : nothing}${editable && spec ? html`<button class="threshold-toggle" type="button" aria-expanded=${editing ? "true" : "false"} aria-controls=${`${row.role}-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleThresholdEdit(spec, plant)}>${editing ? l.t("section.advanced_diagnostics_cancel_edit") : l.t("section.advanced_diagnostics_edit_thresholds")}</button>${editing ? this._renderThresholdEditor(spec, plant) : nothing}${saved && !editing ? html`<p class="notice" role="status">${saved}</p>` : nothing}` : nothing}</dd>`;
      })}</dl></section>`;
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
  private _sourceSummary(plant: PlantRecord, role: string): string {
    const c = roleSourceConfig(plant, role);
    const l = this._l;
    if (!c) return l.t("sensors.summary_unavailable");
    if (!c.sources.length) return l.t("sensors.summary_empty");
    return `${l.tn(c.sources.length, "sensors.source_count_one", "sensors.source_count_other")} · ${aggregationLabel(l, c.aggregation)}${c.primary_entity_id ? l.t("sensors.summary_primary", { entity_id: c.primary_entity_id }) : ""}`;
  }
  private _toggleSourceEdit(role: string, plant: PlantRecord): void {
    if (this._sourceRole === role && this._sourceEdits !== null) {
      this._sourceRole = null; this._sourceEdits = null; this._sourceBaseline = null; this._sourceError = ""; this._pendingSourceSwitch = null; return;
    }
    if (this._sourceRole && this._sourceRole !== role && this._hasUnsavedSourceChanges()) { this._pendingSourceSwitch = { role, plant }; return; }
    this._openSourceEditor(role, plant);
  }
  private _openSourceEditor(role: string, plant: PlantRecord): void {
    const c = roleSourceConfig(plant, role);
    if (!c) { this._sourceUnavailable = { role, plantId: plant.id, revision: plant.revision }; this._pendingSourceSwitch = null; return; }
    const seeded = roleSourceInput(c);
    this._sourceRole = role; this._sourceEdits = seeded; this._sourceBaseline = structuredClone(seeded);
    this._sourceError = ""; this._pendingSourceSwitch = null; this._allSourceSensors = false; this._sourceUnavailable = null;
    this._sourceSaved = { ...this._sourceSaved, [role]: "" };
  }
  private _sourceRefused(plant: PlantRecord, role: string): boolean {
    const u = this._sourceUnavailable;
    // Stale once the plant data changes; the next click re-evaluates the fresh snapshot.
    return !!u && u.role === role && u.plantId === plant.id && u.revision === plant.revision && !roleSourceConfig(plant, role);
  }
  private _hasUnsavedSourceChanges(): boolean {
    if (!this._sourceEdits || !this._sourceBaseline) return false;
    return JSON.stringify(this._sourceEdits) !== JSON.stringify(this._sourceBaseline);
  }
  private _confirmSourceSwitch(): void {
    const pending = this._pendingSourceSwitch;
    if (pending) this._openSourceEditor(pending.role, pending.plant);
  }
  private _editSource(part: Partial<RoleSourceInput>): void {
    if (this._sourceEdits) this._sourceEdits = { ...this._sourceEdits, ...part };
  }
  private _renderSensors(plant: PlantRecord) {
    const l = this._l;
    const pending = this._pendingSourceSwitch;
    const pendingSpec = roleSourceSpec(this._sourceRole ?? "");
    return html`<section aria-labelledby="sensors-heading"><h2 id="sensors-heading">${l.t("sensors.heading")}</h2>
      <p>${l.t("sensors.intro")}</p>
      ${pending ? html`<div class="notice" role="alert"><p>${l.t("sensors.switch_prompt", { role: pendingSpec ? rolePhrase(pendingSpec.role, l) : this._sourceRole ?? "" })}</p>
        <button type="button" class="primary" @click=${() => this._confirmSourceSwitch()}>${l.t("section.advanced_diagnostics_switch_discard")}</button>
        <button type="button" @click=${() => { this._pendingSourceSwitch = null; }}>${l.t("section.advanced_diagnostics_switch_keep")}</button></div>` : nothing}
      <dl class="sensors">${ROLE_SOURCE_SPECS.map(spec => {
        const editing = this._sourceRole === spec.role && this._sourceEdits !== null;
        const saved = this._sourceSaved[spec.role];
        return html`<dt>${roleLabel(spec.role, l)}</dt><dd>${this._sourceSummary(plant, spec.role)}
          <button class="source-toggle" type="button" aria-expanded=${editing ? "true" : "false"} aria-controls=${`${spec.role}-sources-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleSourceEdit(spec.role, plant)}>${editing ? l.t("common.cancel") : l.t("sensors.edit")}</button>
          ${editing ? this._renderSourceEditor(spec.role, plant) : nothing}
          ${!editing && this._sourceRefused(plant, spec.role) ? html`<p id=${`${spec.role}-sources-unavailable`} class="error" role="alert">${l.t("sensors.refused", { role: roleLabel(spec.role, l) })}</p>` : nothing}
          ${saved && !editing ? html`<p class="notice" role="status">${saved}</p>` : nothing}</dd>`;
      })}</dl></section>`;
  }
  private _renderSourceEditor(role: SourceRole, plant: PlantRecord) {
    const spec = roleSourceSpec(role); const edits = this._sourceEdits; const l = this._l;
    if (!spec || !edits) return nothing;
    return html`<div id=${`${role}-sources-editor`} class="editor"><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
      ${roleSourcesEditor(l, spec, edits, this._entities, this._states, this._allSourceSensors, v => this._allSourceSensors = v, v => this._editSource(v))}
      ${this._sourceError ? html`<p class="error" role="alert">${this._sourceError}</p>` : nothing}
      <div class="actions">
        <button type="button" @click=${() => { this._sourceRole = null; this._sourceEdits = null; this._sourceBaseline = null; this._sourceError = ""; this._pendingSourceSwitch = null; }}>${l.t("common.cancel")}</button>
        <button type="button" class="primary" @click=${() => void this._saveRoleSources(role, plant)}>${l.t("sensors.save", { role: rolePhrase(role, l) })}</button>
      </div></fieldset></div>`;
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
      this._sourceSaved = { ...this._sourceSaved, [role]: this._l.t("sensors.saved", { role: roleLabel(role, this._l) }) };
    }
  }
  private _renderPlantOverview(plant: PlantRecord, evaluation: Evaluation | undefined) {
    const l = this._l;
    const moisture = moistureRole(plant);
    const sources = moisture?.sources.map(source => resolveSource(source, this._entities)?.entity_id ?? source.entity_id) ?? [];
    const assignedRoles = ROLE_SOURCE_SPECS.flatMap(spec => {
      const config = roleSourceConfig(plant, spec.role);
      return config?.sources.length ? [{ label: roleLabel(spec.role, l), count: config.sources.length }] : [];
    });
    const latestCare = this._careHistory?.events.slice(0, 3) ?? [];
    const percent = evaluation?.computed_percent; const score = evaluation?.health_score;
    const overallConfidence = this._health?.[plant.id]?.confidence_label;
    return html`<section class="plant-overview-card"><div class="overview-heading">${this._imageUrl ? html`<img class="overview-avatar" src=${this._imageUrl} alt=${l.t("photo.alt", { name: plant.name })}>` : html`<div class="overview-avatar placeholder" aria-hidden="true">${plant.name.slice(0, 1).toLocaleUpperCase()}</div>`}<div><p class="eyebrow">${l.t("overview.eyebrow")}</p><p>${plant.species?.snapshot.common_name ?? plant.species?.snapshot.latin_name ?? l.t("common.no_species_selected")}</p>${plant.category ? html`<span class="muted">${plant.category}</span>` : nothing}<button type="button" @click=${() => this._detailSection = "details"}>${l.t("overview.details_button")}</button></div></div>
      <div class="overview-metrics"><article><span>${l.t("metric.soil_moisture")}</span><strong>${percent === null || percent === undefined ? "—" : l.percent(percent)}</strong><small>${evaluation?.computed_available ? l.t("overview.current_reading") : l.t("overview.no_current_reading")}</small></article><article><span>${l.t("metric.moisture_health")}</span><strong>${score === null || score === undefined ? "—" : `${l.number(score)}/100`}</strong><small>${l.t("overview.based_on_moisture")}</small></article><article><span>${l.t("overview.moisture_sensors")}</span><strong>${l.number(sources.length)}</strong><small>${l.t("overview.aggregation", { aggregation: moisture ? aggregationLabel(l, moisture.aggregation) : l.t("overview.not_configured") })}</small></article></div>
       <section class="overview-sensors"><h2>${l.t("overview.assigned_sensors")}</h2>${sources.length || assignedRoles.length ? html`<ul>${sources.map(id => html`<li>${l.t("metric.soil_moisture")} · ${id}${id === moisture?.primary_entity_id ? html` <span class="muted">${l.t("overview.primary")}</span>` : nothing}</li>`)}${assignedRoles.map(role => html`<li>${role.label} · ${l.tn(role.count, "sensors.source_count_one", "sensors.source_count_other")}</li>`)}</ul>` : html`<p>${l.t("overview.no_sensors")}</p>`}<button type="button" @click=${() => this._detailSection = "sensors"}>${l.t("overview.manage_sensors")}</button></section>
       <section class="overview-care"><h2>${l.t("overview.recent_care")}</h2>${latestCare.length ? html`<ul>${latestCare.map(event => html`<li><strong>${l.t(`care_kind.${event.kind}`)}</strong> · ${l.date(event.local_date)}</li>`)}</ul>` : html`<p>${l.t("overview.no_care")}</p>`}<button type="button" @click=${() => this._detailSection = "care"}>${l.t("overview.open_care")}</button></section>
      ${overallConfidence !== undefined ? html`<p class="muted">${l.t("overview.overall_confidence", { label: confidenceLabel(overallConfidence, l) })}</p>` : nothing}
    </section>`;
  }
  private _renderDetail(id: string) {
    const l = this._l;
    const plant = this._plantById(id); const edit = this._edits;
    if (!plant || !edit) return html`<p>${l.t("detail.not_found")}</p>`;
    const evaluation = this._evaluations[id]; const m = moistureRole(plant); const device = plantDevice(plant, this._devices);
    const disabled = this._formBusy || this._blocked || !!this._conflict;
    const overlaps = this._conflict ? this._sourceConflictFields(this._conflict.after) : [];
    const tabs: [DetailSection, MessageKey][] = [["overview", "detail.tab_overview"], ["sensors", "sensors.heading"], ["care", "care.heading"], ["details", "detail.tab_details"], ["diagnostics", "detail.tab_diagnostics"]];
    return html`${this._conflict ? html`<section class="notice" role="alert"><h2>${l.t("conflict.heading")}</h2><p>${l.t("conflict.revision", { before: this._conflict.before.revision, after: this._conflict.after.revision })}</p><ul>${this._conflict.changes.map(c => html`<li class="prose">${c}</li>`)}</ul>${overlaps.length ? html`<p>${l.t("conflict.source_overlap", { fields: this._sourceFieldList(overlaps) })}</p>` : nothing}<button @click=${() => this._reviewConflict()}>${l.t("conflict.retain")}</button><button @click=${() => this._beginEdit(plant)}>${l.t("conflict.discard")}</button></section>` : nothing}
       <header class="detail-heading"><div><h2>${plant.name}</h2><p>${this._statusLabel(this._status(plant))}</p></div>${device ? html`<a href="/config/devices/device/${encodeURIComponent(device.id)}">${l.t("detail.open_device")}</a>` : nothing}</header>
      <nav class="detail-tabs" aria-label=${l.t("detail.sections_label")}>${tabs.map(([section, label]) => html`<button type="button" aria-current=${this._detailSection === section ? "page" : nothing} @click=${() => this._detailSection = section}>${l.t(label)}</button>`)}</nav>
        ${this._detailSection === "overview" ? this._renderPlantOverview(plant, evaluation) : nothing}
       ${this._detailSection === "details" ? html`<section><h2>${l.t("detail.identity_heading")}</h2>${this._renderImage(plant)}<fieldset ?disabled=${disabled}>${textField(l.t("detail.name"), edit.name, v => this._edit({ name: v }))}${textField(l.t("detail.acquired"), edit.acquired, v => this._edit({ acquired: v }))}${placementEditor(l, edit.placement, v => this._edit({ placement: v }))}${this._saveButton("identity", l.t("detail.save_identity"))}</fieldset></section>
       <section><h2>${l.t("area.label")}</h2><p>${l.t("detail.area_current", { area: this._areaName(device?.area_id ?? "") })}</p>${this._areaReview ? html`<p class="notice">${l.t("detail.area_review")}</p><button @click=${() => this._areaReview = false}>${l.t("detail.area_reviewed")}</button><button @click=${() => { this._edit({ area: this._baseArea }); this._areaReview = false; }}>${l.t("detail.area_use_current")}</button>` : nothing}<fieldset ?disabled=${disabled || !!this._registryError || this._areaReview}>${areaEditor(l, edit.area, this._areas, v => this._edit({ area: v }))}${this._saveButton("area", l.t("detail.save_area"))}</fieldset></section>
       <section><h2>${l.t("taxonomy.heading")}</h2><fieldset ?disabled=${disabled}>${textField(l.t("taxonomy.category"), edit.category, v => this._edit({ category: v }), "text", 60)}${textField(l.t("taxonomy.tags"), edit.tagText, v => this._edit({ tagText: v }), "text", 2000)}<p>${l.t("taxonomy.hint")}</p>${this._saveButton("taxonomy", l.t("taxonomy.save"))}</fieldset></section>
       <section><h2>${l.t("species.heading")}</h2>${plant.species ? snapshotView(l, plant.species.snapshot) : html`<p>${l.t("species.none")}</p>`}<fieldset ?disabled=${disabled}>
      ${plant.species?.snapshot.provider_ref ? html`<button @click=${() => void this._previewSpecies()}>${l.t("species.preview_refresh")}</button>` : nothing}
      ${selectField(l, l.t("species.provider"), this._provider, [{ value: "manual", label: l.t("species.manual") }, ...(this._capabilities?.providers.filter(p => p.available && p.search_supported).map(p => ({ value: p.provider, label: p.provider })) ?? [])], v => { this._providerRequest++; this._provider = v; this._preview = null; this._results = []; })}
       ${this._provider === "manual" ? html`${textField(l.t("species.common_name"), edit.common, v => this._edit({ common: v }))}${textField(l.t("species.scientific_name"), edit.latin, v => this._edit({ latin: v }))}<p>${l.t("species.manual_hint")}</p>${this._saveButton("species", l.t("species.save_manual"))}` : html`${textField(l.t("species.search"), this._query, v => { this._query = v; this._providerRequest++; this._results = []; this._preview = null; })}<button @click=${() => void this._searchSpecies()}>${l.t("species.search")}</button><ul>${this._results.map(r => html`<li><button @click=${() => void this._previewSpecies(r)}>${r.common_name ?? r.latin_name} · ${r.latin_name}</button><small>${r.attribution}</small></li>`)}</ul><button @click=${() => { this._provider = "manual"; this._providerRequest++; this._preview = null; }}>${l.t("common.continue_manually")}</button>`}</fieldset></section>
       ` : nothing}
       ${this._detailSection === "details" ? html`
       <section><h2>${l.t("lifecycle.heading")}</h2><p>${l.t("lifecycle.description")}</p><fieldset ?disabled=${disabled}><div class="actions"><button @click=${() => { if (this.hass) { const hass = this.hass; void this._mutate(() => plant.lifecycle_state === "active" ? api.disable(hass, plant.id, plant.revision) : api.reenable(hass, plant.id, plant.revision)); } }}>${plant.lifecycle_state === "active" ? l.t("lifecycle.disable") : l.t("lifecycle.reenable")}</button><button @click=${() => this._openDialog("delete")}>${l.t("lifecycle.delete")}</button></div></fieldset></section>` : nothing}
       ${this._detailSection === "sensors" ? html`<section><h2>${l.t("moisture.heading")}</h2>${m && edit.moisture ? html`<p class="default-summary">${l.t("moisture.effective_summary", { thresholds: keys.map(k => `${thresholdKeyLabel(l, k)} ${l.percent(m.threshold_overrides[k] ?? this._defaults(plant)[k])}`).join(" · ") })}</p><fieldset ?disabled=${disabled}>${moistureEditor(l, edit.moisture, this._defaults(plant), this._entities, this._states, this._allSensors, v => this._allSensors = v, v => this._edit({ moisture: v }), "sources")}<details class="advanced-disclosure"><summary>${l.t("moisture.advanced_overrides")}</summary><p>${l.t("moisture.advanced_hint")}</p>${moistureEditor(l, edit.moisture, this._defaults(plant), this._entities, this._states, this._allSensors, v => this._allSensors = v, v => this._edit({ moisture: v }), "thresholds")}</details>${this._saveButton("moisture", l.t("moisture.save"))}</fieldset>` : html`<p class="error" role="alert">${l.t("moisture.incompatible")}</p>`}</section>${this._renderSensors(plant)}` : nothing}
       ${this._detailSection === "care" ? this._renderCare(plant) : nothing}
       ${this._detailSection === "diagnostics" ? html`<section><h2>${l.t("automations.heading")}</h2><p>${l.t("automations.description")}</p><a href="/config/automation/dashboard">${l.t("automations.open_editor")}</a><ul>${this._related.map(id => html`<li>${id}</li>`)}</ul></section>${this._renderOverallHealth(plant)}${this._renderDiagnostics(plant)}` : nothing}
       ${this._renderDialog()}`;
  }
  // Leaving the wizard with Cancel or from its confirmation discards it, so
  // the next "Add plant" starts with a fresh draft.
  private _closeWizard(): void {
    if (this._formBusy) return;
    this._clearCreationNotice();
    this._wizardStarted = false;
    this._show({ kind: "list" });
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
    return html`<main><ha-top-app-bar-fixed class="panel-appbar" .narrow=${this.narrow}>
       <h1 slot="title" class="page-title" tabindex="-1">Smart Plants</h1>
       <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
         <ha-icon-button slot="trigger" .label=${menuLabel} .path=${MENU_ICON_PATH}></ha-icon-button>
         ${this._view.kind !== "list" ? html`<ha-dropdown-item value="back-to-overview" ?disabled=${this._formBusy}>${l.t("panel.back_to_overview")}</ha-dropdown-item>` : nothing}
         <ha-dropdown-item value="add-plant" ?disabled=${this._blocked}>${l.t("panel.add_plant")}<ha-svg-icon slot="icon" .path=${ADD_ICON_PATH}></ha-svg-icon></ha-dropdown-item>
         <ha-dropdown-item value="integration-options">${l.t("overview.integration_options")}<ha-icon slot="icon" icon="mdi:cog-outline"></ha-icon></ha-dropdown-item>
         <ha-dropdown-item value="documentation">${l.t("overview.documentation")}<ha-icon slot="icon" icon="mdi:help-circle-outline"></ha-icon></ha-dropdown-item>
       </ha-dropdown>
       <div class="panel-content">${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}${this._notice ? html`<p class="notice" role="status">${this._notice}</p>` : nothing}${this._registryError ? html`<p class="notice" role="alert">${l.t("panel.registry_unavailable", { error: this._registryError })}</p>` : nothing}
      ${this._creationNotice && this._view.kind !== "create" ? html`<p class="notice" role="status">${this._creationNotice}</p>${this._createdPlantId && !(this._view.kind === "detail" && this._view.plantId === this._createdPlantId) ? html`<button ?disabled=${this._formBusy} @click=${() => { if (this._createdPlantId) this._show({ kind: "detail", plantId: this._createdPlantId }); }}>${l.t("panel.open_created")}</button>` : nothing}` : nothing}
      ${this._view.kind === "list" && this._overviewError ? html`<p class="error" role="alert">${l.t("overview.status_unavailable", { error: this._overviewError })}</p>` : nothing}
      <smart-plants-overview ?hidden=${this._view.kind !== "list"} .l=${l} .plants=${this._plants} .overview=${this._overview} .areaNames=${this._plantAreaNames()}
        .thumbnails=${this._thumbnails} .watering=${this._watering} .loading=${this._loading} .blocked=${this._blocked}
        @open-plant=${(e: CustomEvent<OpenPlantDetail>) => this._openFromOverview(e.detail)} @add-plant=${() => this._show({ kind: "create" })} @log-watering=${(e: CustomEvent<{ plantId: string }>) => void this._logWatering(e.detail.plantId)}></smart-plants-overview>
      ${this._view.kind === "detail" ? this._renderDetail(this._view.plantId) : nothing}
      ${this._wizardStarted && this._capabilities ? html`<div ?hidden=${this._view.kind !== "create"}><smart-plants-wizard .hass=${this.hass} .capabilities=${this._capabilities} .areas=${this._areas} .entities=${this._entities} .devices=${this._devices} .states=${this._states} .blocked=${this._blocked} .navigationContext=${this._context} .photoStatus=${this._creationPhoto} @plant-created=${(e: CustomEvent<{ plant: PlantRecord; photo: File | null; navigationContext: number }>) => void this._created(e)} @wizard-close=${() => this._closeWizard()} @wizard-restart=${() => this._clearCreationNotice()} @backend-unavailable=${(e: CustomEvent<string>) => { this._blocked = true; this._error = e.detail; }}></smart-plants-wizard></div>` : nothing}
        <p role="status" aria-live="polite">${this._formBusy ? l.t("panel.busy") : ""}</p></div></ha-top-app-bar-fixed></main>`;
  }
}
// Keep SPA navigation and cache-busted bundle reloads idempotent: HA retains
// custom element definitions for the lifetime of its frontend document.
if (!customElements.get("smart-plants-panel")) {
  customElements.define("smart-plants-panel", SmartPlantsPanel);
}
declare global { interface HTMLElementTagNameMap { "smart-plants-panel": SmartPlantsPanel } }
