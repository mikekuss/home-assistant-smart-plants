import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { PropertyValues } from "lit";
import { api, ApiError } from "./api.js";
import type { UpdatePlantInput } from "./api.js";
import { areaEditor, moistureEditor, placementEditor, roleSourcesEditor, selectField, snapshotView, textField } from "./editors.js";
import { CO2_STRESS_BUILTIN_DEFAULTS, CO2_STRESS_KEYS, CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS, CONDUCTIVITY_STRESS_KEYS, HUMIDITY_STRESS_BUILTIN_DEFAULTS, HUMIDITY_STRESS_KEYS, LOW_BATTERY_STRESS_BUILTIN_DEFAULTS, LOW_BATTERY_STRESS_KEYS, LOW_LIGHT_STRESS_BUILTIN_DEFAULTS, LOW_LIGHT_STRESS_KEYS, SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS, SOIL_TEMPERATURE_STRESS_KEYS, TEMPERATURE_STRESS_BUILTIN_DEFAULTS, TEMPERATURE_STRESS_KEYS, builtin, canonicalMoisture, co2StressInput, conductivityStressInput, confidenceGloss, contributorLabel, effectiveThresholds, humidityStressInput, keys, lowBatteryInput, lowLightInput, manualSpecies, moistureInput, moistureRole, plantDevice, problemBinaries, resolveSource, roleSourceConfig, roleSourceInput, roleSourceSpec, ROLE_SOURCE_SPECS, canonicalRoleSources, validateRoleSources, soilTemperatureStressInput, tags, temperatureStressInput, translator, validateCo2StressOverrides, validateConductivityStressOverrides, validateHumidityStressOverrides, validateLowBatteryOverrides, validateLowLightOverrides, validateMoisture, validateSoilTemperatureStressOverrides, validateTaxonomy, validateTemperatureStressOverrides } from "./model.js";
import type { ProblemBinaryRole } from "./model.js";

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
  readonly labels: Record<string, string>;   // per-key label
  readonly successNotice: string;
  readonly formIntro: string;
  readonly validate: (input: Record<string, string>) => { values: Record<string, number | null>; error: string | null };
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
    labels: { cold_threshold_celsius: "Cold trigger (°C)", cold_clear_celsius: "Cold clear (°C)", hot_clear_celsius: "Hot clear (°C)", hot_threshold_celsius: "Hot trigger (°C)" },
    successNotice: "Temperature stress thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy cold trigger < cold clear < hot clear < hot trigger, with at least 0.5 °C hysteresis per side and a 1.0 °C stable band.",
    validate: input => validateTemperatureStressOverrides(input as never),
    seed: persisted => temperatureStressInput(persisted as never),
  },
  {
    problemRole: "humidity_stress",
    configRole: "humidity",
    keys: HUMIDITY_STRESS_KEYS,
    defaults: HUMIDITY_STRESS_BUILTIN_DEFAULTS,
    unit: "%",
    min: "0", max: "100", step: "0.1",
    labels: { dry_threshold_percent: "Dry trigger (%)", dry_clear_percent: "Dry clear (%)", damp_clear_percent: "Damp clear (%)", damp_threshold_percent: "Damp trigger (%)" },
    successNotice: "Humidity stress thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy dry trigger < dry clear < damp clear < damp trigger, with at least 1.0 % hysteresis per side and a 5.0 % stable band.",
    validate: input => validateHumidityStressOverrides(input as never),
    seed: persisted => humidityStressInput(persisted as never),
  },
  {
    problemRole: "conductivity_stress",
    configRole: "conductivity",
    keys: CONDUCTIVITY_STRESS_KEYS,
    defaults: CONDUCTIVITY_STRESS_BUILTIN_DEFAULTS,
    unit: "µS/cm",
    min: "0", max: "10000", step: "0.1",
    labels: { low_threshold_micro_siemens_per_cm: "Low trigger (µS/cm)", low_clear_micro_siemens_per_cm: "Low clear (µS/cm)", high_clear_micro_siemens_per_cm: "High clear (µS/cm)", high_threshold_micro_siemens_per_cm: "High trigger (µS/cm)" },
    successNotice: "Conductivity stress thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy low trigger < low clear < high clear < high trigger, with at least 10.0 µS/cm hysteresis per side and a 50.0 µS/cm stable band.",
    validate: input => validateConductivityStressOverrides(input as never),
    seed: persisted => conductivityStressInput(persisted as never),
  },
  {
    problemRole: "co2_stress",
    configRole: "co2",
    keys: CO2_STRESS_KEYS,
    defaults: CO2_STRESS_BUILTIN_DEFAULTS,
    unit: "ppm",
    min: "0", max: "10000", step: "1",
    labels: { threshold_ppm: "High trigger (ppm)", clear_ppm: "High clear (ppm)" },
    successNotice: "CO2 stress thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy clear_ppm < threshold_ppm with at least 100 ppm hysteresis; both are integers within 0…10000 ppm.",
    validate: input => validateCo2StressOverrides(input as never),
    seed: persisted => co2StressInput(persisted as never),
  },
  {
    problemRole: "soil_temperature_stress",
    configRole: "soil_temperature",
    keys: SOIL_TEMPERATURE_STRESS_KEYS,
    defaults: SOIL_TEMPERATURE_STRESS_BUILTIN_DEFAULTS,
    unit: "°C",
    min: "-20", max: "60", step: "0.1",
    labels: { cold_threshold_celsius: "Cold trigger (°C)", cold_clear_celsius: "Cold clear (°C)", hot_clear_celsius: "Hot clear (°C)", hot_threshold_celsius: "Hot trigger (°C)" },
    successNotice: "Soil temperature stress thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy cold trigger < cold clear < hot clear < hot trigger, with at least 0.5 °C hysteresis per side and a 1.0 °C stable band, all within −20.0…60.0 °C.",
    validate: input => validateSoilTemperatureStressOverrides(input as never),
    seed: persisted => soilTemperatureStressInput(persisted as never),
  },
  {
    problemRole: "low_battery",
    configRole: "battery",
    keys: LOW_BATTERY_STRESS_KEYS,
    defaults: LOW_BATTERY_STRESS_BUILTIN_DEFAULTS,
    unit: "%",
    min: "0", max: "100", step: "1",
    labels: { threshold_percent: "Low trigger (%)", clear_percent: "Low clear (%)" },
    successNotice: "Low battery thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy threshold_percent < clear_percent with at least 1 % hysteresis; both are integers within 0…100 %.",
    validate: input => validateLowBatteryOverrides(input as never),
    seed: persisted => lowBatteryInput(persisted as never),
  },
  {
    problemRole: "low_light",
    configRole: "illuminance",
    keys: LOW_LIGHT_STRESS_KEYS,
    defaults: LOW_LIGHT_STRESS_BUILTIN_DEFAULTS,
    unit: "lx",
    min: "0", max: "200000", step: "0.1",
    labels: { target_lux: "Target (lx)", clear_lux: "Clear (lx)" },
    successNotice: "Low light thresholds saved.",
    formIntro: "Blank fields inherit the built-in default. Filled fields override it for this plant only. Effective ordering must satisfy target_lux < clear_lux with at least 10.0 lx hysteresis; both are within 0.0…200000.0 lx.",
    validate: input => validateLowLightOverrides(input as never),
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
import type { CareEvent, CareHistory, Evaluation, HAArea, HADevice, HAEntity, HAState, HealthEvaluation, HomeAssistantLike, MoistureInput, PanelCapabilities, PanelInfo, PlantPlacement, PlantRecord, RoleSourceInput, SpeciesPreview, SpeciesSearchResult } from "./types.js";

type View = { kind: "list" } | { kind: "create" } | { kind: "detail"; plantId: string };
type DetailSection = "overview" | "sensors" | "care" | "details" | "diagnostics";
interface Edits { name: string; acquired: string; placement: PlantPlacement | null; category: string; tagText: string; area: string; common: string; latin: string; moisture: MoistureInput | null }
type SaveKind = "identity" | "taxonomy" | "area" | "moisture" | "species";
interface Conflict { before: PlantRecord; after: PlantRecord; changes: string[] }

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
  @state() private _filters: Record<string, string> = {};
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
  private _request = 0;
  private _careRequest = 0;
  private _providerRequest = 0;
  private _context = 0;
  private _unsubscribe: (() => void) | undefined;
  private _connection: HomeAssistantLike["connection"] | undefined;
  private _subscriptionGeneration = 0;
  private _focusReturn: HTMLElement | null = null;
  private _timer: ReturnType<typeof setInterval> | undefined;
  private readonly _ready = () => { void this._refresh(); };
  private readonly _disconnected = () => { this._context++; this._formBusy = false; this._blocked = true; this._request++; this._providerRequest++; this._preview = null; this._clearImage(); this._error = "Disconnected. Local edits and creation retries are retained. Reconnect before saving."; };

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
    this._context++; this._formBusy = false; this._request++; this._providerRequest++; this._clearImage(); this._unbind(); clearInterval(this._timer); super.disconnectedCallback();
  }
  private _bind(): void {
    if (!this.hass || this.hass.user?.is_admin === false || this._connection) return;
    const connection = this.hass.connection; this._connection = connection;
    const generation = this._subscriptionGeneration;
    connection.addEventListener?.("ready", this._ready); connection.addEventListener?.("disconnected", this._disconnected);
    void api.subscribeRegistry(this.hass, this._ready).then(unsubscribe => {
      if (this._connection !== connection || generation !== this._subscriptionGeneration || !this.isConnected) unsubscribe(); else this._unsubscribe = unsubscribe;
    }).catch(() => { this._registryError = "Registry updates unavailable; reconnect to retry native changes."; });
  }
  private _unbind(): void {
    this._context++; this._formBusy = false;
    this._request++; this._providerRequest++; this._preview = null; this._blocked = true; this._clearImage();
    this._subscriptionGeneration++;
    this._unsubscribe?.(); this._unsubscribe = undefined;
    this._connection?.removeEventListener?.("ready", this._ready); this._connection?.removeEventListener?.("disconnected", this._disconnected); this._connection = undefined;
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
        if (!latest) { this._context++; this._formBusy = false; this._closeDialog(); this._base = null; this._conflict = null; this._edits = null; this._notice = "This plant was deleted in another session."; void this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLElement>("h1")?.focus()); }
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
            this._notice = `Home Assistant area changed from ${this._areaName(this._baseArea)} to ${this._areaName(area)}.${dirty ? " Your area selection is retained; review it before saving." : " The area selector now reflects the native area."}`;
            if (!dirty) this._edit({ area });
            this._areaReview = dirty; this._baseArea = area;
          }
        }
      } catch (e) { if (request === this._request) this._registryError = this._friendly(e); }
      // Evaluation is authoritative: do not reconstruct hysteresis or restart grace from state timestamps.
      const entries = await Promise.all(plants.map(async p => {
        try { return [p.id, await api.evaluation(hass, p.id)] as const; }
        catch { return null; }
      }));
      if (request === this._request) this._evaluations = Object.fromEntries(entries.filter((v): v is NonNullable<typeof v> => v !== null));
      // Composite multi-role health, backend-neutral: read-only, per the
      // multi-role health contract. Fetched only for the currently-viewed
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
    if (!(e instanceof ApiError)) return "Request failed. Refresh and retry when connected.";
    const messages: Record<string, string> = {
      integration_not_loaded: "Smart Plants is not loaded. Open Settings → Devices & Services, then refresh after loading the integration.",
      unauthorized: "Smart Plants requires an administrator account.",
      not_found: "Plant or species not found. It may have been removed in another session.",
      revision_conflict: "This plant changed elsewhere. Review the refreshed field changes and explicitly reapply your edits.",
      provider_disabled: "Provider is unavailable. Continue manually; accepted local species data remains available.",
      provider_authentication: "Provider authentication failed. Review the integration's reauthentication in Settings, or continue manually.",
      provider_rate_limit: "Provider rate limit reached. Retry later or continue manually.",
      provider_timeout: "Provider timed out. Retry later or continue manually.",
      provider_outage: "Provider is currently unavailable. Retry later or continue manually.",
      provider_malformed_response: "Provider returned an invalid response. Continue manually or retry later.",
      version_mismatch: "Panel/API version mismatch. Restart Home Assistant and fully reload the frontend after upgrading.",
      invalid_response: "The response is incompatible. Refresh before editing or retrying; creation retries retain the original request.",
      invalid_format: "The server rejected the input. Review fields and source identities. Images must be valid JPEG, PNG or WebP up to 5 MiB and 2048 × 2048 pixels; expired species previews require a new review.",
    };
    return messages[e.code] ?? "Request failed. Refresh and retry when connected.";
  }
  private _plantById(id: string): PlantRecord | undefined { return this._plants.find(p => p.id === id); }
  private _areaName(id: string): string { return this._areas.find(a => a.area_id === id)?.name ?? (id || "No area"); }
  private _setConflict(before: PlantRecord, after: PlantRecord): void {
    const fields: (keyof PlantRecord)[] = ["name", "acquired_at", "placement", "category", "tags", "species", "image", "lifecycle_state", "roles", "care_events"];
    const changes = fields.filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k])).map(k => k === "roles" ? "Sensor configuration or threshold defaults/overrides changed." : `${k}: ${JSON.stringify(before[k])} → ${JSON.stringify(after[k])}`);
    this._conflict = { before, after, changes }; this._preview = null; this._providerRequest++;
  }
  private _beginEdit(plant: PlantRecord): void {
    const m = moistureRole(plant); this._base = structuredClone(plant); this._baseArea = plantDevice(plant, this._devices)?.area_id ?? "";
    this._edits = { name: plant.name, acquired: plant.acquired_at ?? "", placement: structuredClone(plant.placement), category: plant.category ?? "", tagText: plant.tags.join(", "), area: this._baseArea, common: plant.species?.snapshot.common_name ?? "", latin: plant.species?.snapshot.latin_name ?? "", moisture: m ? moistureInput(m) : null };
    this._conflict = null; this._areaReview = false; this._preview = null; this._results = []; this._provider = "manual"; this._related = []; this._thresholdRole = null; this._thresholdEdits = null; this._thresholdBaseline = null; this._thresholdError = ""; this._thresholdSaved = {}; this._pendingThresholdSwitch = null;
    this._sourceRole = null; this._sourceEdits = null; this._sourceBaseline = null; this._sourceError = ""; this._sourceSaved = {}; this._pendingSourceSwitch = null; this._allSourceSensors = false; this._sourceUnavailable = null;
    const device = plantDevice(plant, this._devices);
    const context = this._context;
    if (device && this.hass) void api.related(this.hass, device.id).then(ids => { if (context === this._context && this._base?.id === plant.id) this._related = ids; }).catch(() => { if (context === this._context && this._base?.id === plant.id) this._notice = "Related automations could not be loaded. Open the native device page to inspect them."; });
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
        void api.plantHealth(hass, targetId)
          .then(composite => { if (context === this._context) { this._health = { ...this._health, [targetId]: composite }; this._healthError = ""; } })
          .catch((e: unknown) => { if (context === this._context) { const next = { ...this._health }; delete next[targetId]; this._health = next; this._healthError = this._friendly(e); } });
      }
    }
    else { this._base = null; this._edits = null; this._conflict = null; }
    this._syncImage(); void this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLElement>("h1")?.focus());
  }
  private _handleMenuAction(event: CustomEvent<{ item: { value: string } }>): void {
    if (event.detail.item.value === "add-plant") this._show({ kind: "create" });
    if (event.detail.item.value === "back-to-overview") this._show({ kind: "list" });
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
      this._careError = "Refresh care history before saving. Your draft is retained."; return;
    }
    const date = new Date(this._careDate);
    if (!this._careDate || Number.isNaN(date.getTime()) || date.getTime() > Date.now() ||
        new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) !== this._careDate) {
      this._careError = "Choose a valid local date and time that is not in the future."; return;
    }
    const fields = this._careFields;
    const payload = this._carePayload();
    const note = typeof payload.note === "string" ? payload.note : null;
    if ((this._careKind === "watering" || this._careKind === "fertilizing" || this._careKind === "pruning" || this._careKind === "repotting") && note && note.length > 500) {
      this._careError = "Notes must be at most 500 characters."; return;
    }
    if (this._careKind === "fertilizing" && payload.amount !== null && (!Number.isFinite(payload.amount) || Number(payload.amount) <= 0 || Number(payload.amount) > 100000 || !payload.unit)) {
      this._careError = "Enter a positive amount up to 100000 with a unit."; return;
    }
    if (this._careKind === "note" && (!String(payload.text).trim() || String(payload.text).length > 1000)) { this._careError = "Enter a note of 1 to 1000 characters."; return; }
    if (Object.values(fields).some(value => value.length > 120)) { this._careError = "Care details must be at most 120 characters."; return; }
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
    if (!this.hass || !this._careHistory || this._careHistory.revision !== plant.revision) { this._careError = "Refresh care history before deleting."; return; }
    if (!window.confirm(`Delete this ${event.kind} record? This cannot be undone.`)) return;
    const hass = this.hass;
    await this._mutate(async () => (await api.deleteCareEvent(hass, plant.id, plant.revision, event.id)).plant);
  }
  private _renderCare(plant: PlantRecord) {
    const history = this._careHistory;
    const details: Record<string, string[]> = { fertilizing: ["product", "amount", "unit"], pruning: ["part"], repotting: ["container", "medium"], note: ["text"] };
    const labels: Record<string, string> = { product: "Product", amount: "Amount", unit: "Unit (g or mL)", part: "Plant part", container: "Container", medium: "Growing medium", text: "Note text" };
    const kindLabel = (kind: CareEvent["kind"]) => ({ watering: "Watering", fertilizing: "Fertilizing", pruning: "Pruning", repotting: "Repotting", note: "Note" })[kind];
    const dateValue = (event: CareEvent) => `${event.local_date} · ${event.occurred_at} (recorded offset)`;
    return html`<section aria-labelledby="care-heading"><h2 id="care-heading">Care history</h2>
      ${this._careError ? html`<p class="error" role="alert">${this._careError}</p>` : nothing}
      ${history ? html`<p role="status">${history.summary.watering_count} watering events. Last watered: ${history.summary.last_watered_local_date ?? "never"}.</p>
        ${history.events.length ? html`<ul aria-label="Plant care events">${history.events.map(event => html`<li><strong>${kindLabel(event.kind)}</strong> <time datetime=${event.occurred_at}>${dateValue(event)}</time>
          ${Object.entries(event.payload).filter(([, value]) => value !== null).map(([key, value]) => html`<p>${labels[key] ?? key}: ${value}</p>`)}
          <button type="button" ?disabled=${this._formBusy || !!this._conflict} @click=${() => this._editCare(event)}>Edit ${kindLabel(event.kind).toLowerCase()}</button>
          <button type="button" ?disabled=${this._formBusy || !!this._conflict} @click=${() => void this._deleteCare(plant, event)}>Delete ${kindLabel(event.kind).toLowerCase()}</button></li>`)}</ul>` : html`<p>No care recorded yet.</p>`}` : html`<p>Loading care history or refresh to retry.</p>`}
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict || !history || history.revision !== plant.revision}>
        <legend>${this._careEditingId ? `Edit ${kindLabel(this._careKind).toLowerCase()}` : "Record care"}</legend>
        <label>Care type<select aria-label="Care type" .value=${this._careKind} @change=${(e: Event) => { this._careKind = (e.target as HTMLSelectElement).value as CareEvent["kind"]; this._careFields = {}; }}>${(["watering", "fertilizing", "pruning", "repotting", "note"] as const).map(kind => html`<option value=${kind}>${kindLabel(kind)}</option>`)}</select></label>
        <label>When (your local time)<input type="datetime-local" .value=${this._careDate} @input=${(e: Event) => this._careDate = (e.target as HTMLInputElement).value}></label>
        ${(details[this._careKind] ?? []).map(key => html`<label>${labels[key]}<input aria-label=${labels[key]} type=${key === "amount" ? "number" : "text"} maxlength=${key === "text" ? 1000 : 120} .value=${this._careFields[key] ?? ""} @input=${(e: Event) => this._careFields = { ...this._careFields, [key]: (e.target as HTMLInputElement).value }}></label>`)}
        ${this._careKind !== "note" ? html`<label>Note (optional)<input type="text" maxlength="500" .value=${this._careNote} @input=${(e: Event) => this._careNote = (e.target as HTMLInputElement).value}></label>` : nothing}
        ${this._careKind === "fertilizing" ? html`<label>Unit<select aria-label="Unit" .value=${this._careFields.unit ?? ""} @change=${(e: Event) => this._careFields = { ...this._careFields, unit: (e.target as HTMLSelectElement).value }}><option value="">No measured amount</option><option value="g">g</option><option value="mL">mL</option></select></label>` : nothing}
        <button type="button" class="primary" @click=${() => void this._saveCare(plant)}>${this._careEditingId ? "Save care changes" : "Record care"}</button>
        ${this._careEditingId ? html`<button type="button" @click=${() => { this._careEditingId = null; this._careKind = "watering"; this._careFields = {}; this._careNote = ""; }}>Cancel editing</button>` : nothing}
      </fieldset><p>Care records do not operate irrigation or change moisture alerts.</p></section>`;
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
  private _missing(p: PlantRecord): boolean { return !!moistureRole(p)?.sources.some(s => s.registry_id && !resolveSource(s, this._entities)); }
  private _matches(p: PlantRecord): boolean {
    const f = this._filters; const status = this._status(p); const e = this._evaluations[p.id];
    const haystack = [p.name, p.species?.snapshot.common_name, p.species?.snapshot.latin_name, p.category, ...p.tags].join(" ").toLocaleLowerCase();
    return (!f.search || haystack.includes(f.search.toLocaleLowerCase())) &&
      (!f.status || (f.status === "problems" ? ["needs water", "too wet", "stale", "unavailable"].includes(status) || this._missing(p) : status === f.status)) &&
      (!f.area || (plantDevice(p, this._devices)?.area_id ?? "none") === f.area) &&
      (!f.placement || (p.placement?.mode ?? "none") === f.placement) &&
      (!f.lifecycle || p.lifecycle_state === f.lifecycle) &&
      (!f.species || (p.species?.snapshot.latin_name ?? p.species?.snapshot.common_name ?? "none") === f.species) &&
      (!f.category || (p.category ?? "none") === f.category) && (!f.tag || p.tags.includes(f.tag)) &&
      (!f.sensor || (f.sensor === "missing" ? this._missing(p) : f.sensor === "stale" ? !!e?.sensor_stale : f.sensor === "unavailable" ? !e?.computed_available : this._missing(p) || !!e?.sensor_stale));
  }
  private _filter(label: string, key: string, options: string[]) {
    return selectField(label, this._filters[key] ?? "", [{ value: "", label: `All ${label.toLowerCase()}` }, ...[...new Set(options)].sort().map(v => ({ value: v, label: key === "area" ? this._areaName(v === "none" ? "" : v) : v }))], v => this._filters = { ...this._filters, [key]: v });
  }
  private _renderList() {
    if (this._loading) return html`<p role="status">Loading plants…</p>`;
    const plants = this._plants.filter(p => this._matches(p));
    const needsWater = this._plants.filter(p => this._status(p) === "needs water").length;
    const problems = this._plants.filter(p => p.lifecycle_state !== "disabled" && (this._missing(p) || ["too wet", "stale", "unavailable"].includes(this._status(p)))).length;
    return html`<section class="inventory-summary" aria-label="Plant summary"><article><span>Total plants</span><strong>${this._plants.length}</strong></article><article><span>Needs water</span><strong>${needsWater}</strong></article><article><span>Problems</span><strong>${problems}</strong></article></section>
      <details class="filter-disclosure"><summary role="button">Filter plants${Object.values(this._filters).filter(Boolean).length ? ` · ${Object.values(this._filters).filter(Boolean).length} active` : ""}</summary><section><div class="grid">${textField("Search plants", this._filters.search ?? "", v => this._filters = { ...this._filters, search: v })}
      ${this._filter("Status", "status", ["healthy", "needs water", "too wet", "stale", "unavailable", "disabled", "problems"])}
      ${this._filter("Lifecycle", "lifecycle", ["active", "disabled"])}
      ${this._filter("Area", "area", ["none", ...this._areas.map(a => a.area_id)])}
      ${this._filter("Placement", "placement", this._plants.map(p => p.placement?.mode ?? "none"))}
      ${this._filter("Species", "species", this._plants.map(p => p.species?.snapshot.latin_name ?? p.species?.snapshot.common_name ?? "none"))}
      ${this._filter("Category", "category", this._plants.map(p => p.category ?? "none"))}
      ${this._filter("Sensor condition", "sensor", ["missing", "stale", "unavailable", "missing or stale"])}
      ${this._filter("Tags", "tag", this._plants.flatMap(p => p.tags))}</div><button @click=${() => this._filters = {}}>Clear filters</button></section></details>
      ${!this._plants.length ? html`<section class="empty"><h2>A home for every plant</h2><p>Create a lasting plant profile, connect replaceable moisture sensors, and use its entities in native Home Assistant automations. Species and sensors are optional.</p><button class="primary" ?disabled=${this._blocked} @click=${() => this._show({ kind: "create" })}>Add your first plant</button></section>` : !plants.length ? html`<p role="status">No plants match these filters.</p>` : html`<p class="plant-count" role="status">${plants.length === this._plants.length ? `${plants.length} plants` : `${plants.length} of ${this._plants.length} plants`}</p><ul class="plants">${plants.map(p => html`<li class="plant plant-card"><div class="plant-card-heading"><span class="plant-avatar" aria-hidden="true">${(p.name.trim()[0] ?? "?").toLocaleUpperCase()}</span><div><button class="name" @click=${() => this._show({ kind: "detail", plantId: p.id })}>${p.name}</button><span class="plant-status">${this._status(p)}${this._missing(p) ? " · missing source" : ""}</span></div></div><div class="plant-card-metrics"><div><small>Soil moisture</small><strong>${this._evaluations[p.id]?.computed_percent ?? "—"}<small>%</small></strong></div><div><small>Moisture health</small><strong>${this._evaluations[p.id]?.health_score ?? "—"}<small>/100</small></strong></div></div><small class="plant-meta">${this._areaName(plantDevice(p, this._devices)?.area_id ?? "")} · ${p.placement?.mode ?? "No placement"}<br>${p.species?.snapshot.common_name ?? p.species?.snapshot.latin_name ?? "Manual plant"} · ${p.category ?? "Uncategorized"}${p.tags.length ? html`<br>${p.tags.join(" · ")}` : nothing}</small></li>`)}</ul>`}`;
  }
  private async _save(kind: SaveKind): Promise<void> {
    const base = this._base; const edit = this._edits;
    if (!this.hass || !base || !edit || this._formBusy || this._blocked || this._conflict) return;
    if (kind === "area" && this._areaReview) return;
     if (kind === "area" && (this._registryError || (edit.area && !this._areas.some(a => a.area_id === edit.area)))) { this._error = "Reconnect to load current Home Assistant areas, then choose an area or No area."; return; }
    const hass = this.hass;
    const input: UpdatePlantInput = { plant_id: base.id, expected_revision: base.revision };
    if (kind === "identity") {
      if (!edit.name.trim() || edit.name.trim().length > 200 || (edit.acquired && !Number.isFinite(Date.parse(edit.acquired)))) { this._error = "Enter a valid name and acquired ISO date/time."; return; }
      Object.assign(input, { name: edit.name.trim(), acquired_at: edit.acquired ? new Date(edit.acquired).toISOString() : null, placement: edit.placement });
    }
    if (kind === "taxonomy") {
      const error = validateTaxonomy(edit.category, tags(edit.tagText)); if (error) { this._error = error; return; }
      Object.assign(input, { category: edit.category.trim() || null, tags: tags(edit.tagText) });
    }
    if (kind === "species") input.species = manualSpecies(edit.common, edit.latin);
    if (kind === "moisture") {
      if (!edit.moisture) return;
       if (this._registryError) { this._error = "Reconnect to load current registry data before saving moisture sources."; return; }
      const error = validateMoisture(edit.moisture, this._defaults(base)); if (error) { this._error = error; return; }
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
        this._syncImage(); this._notice = "Saved.";
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
    this._notice = `Changes reviewed. Your edited fields are retained; inspect them and use each Save button to explicitly reapply.${overlaps.length ? ` Both sessions changed ${overlaps.join(", ")} in the sources editor. Saving will replace the refreshed values for those fields.` : ""} Species previews must be requested and reviewed again.`;
  }
  private _sourceConflictFields(after: PlantRecord): string[] {
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
    try { const results = await api.searchSpecies(this.hass, this._provider, this._query.trim(), this.hass.language ?? "en"); if (request === this._providerRequest) { this._results = results; if (!results.length) this._notice = "No species matches. Try another search or manual entry."; } }
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
    const base = this._base; const preview = this._preview;
    return html`<dialog aria-labelledby="dialog-title" @cancel=${(e: Event) => { e.preventDefault(); this._closeDialog(); }} @keydown=${(e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button:not([disabled]),a[href],input:not([disabled]),summary")];
      const first = nodes[0]; const last = nodes.at(-1);
      if (e.shiftKey && (this.shadowRoot?.activeElement === first || this.shadowRoot?.activeElement?.matches("#dialog-title"))) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && this.shadowRoot?.activeElement === last) { e.preventDefault(); first?.focus(); }
    }}><h2 id="dialog-title" tabindex="-1">${this._dialog === "delete" ? `Delete ${base.name}?` : "Review species changes"}</h2>
      ${this._dialog === "delete" ? html`<p>This permanently removes the plant, its device, entities, and local photo. This cannot be undone.</p>` : preview ? snapshotView(preview.snapshot, preview) : html`<p>The preview is no longer valid. Close and request a new preview.</p>`}
      <div class="actions"><button @click=${() => this._closeDialog()}>Cancel</button><button class="primary" ?disabled=${this._formBusy || this._blocked || !!this._conflict || (this._dialog === "species" && !preview)} @click=${() => {
        const kind = this._dialog; this._closeDialog();
        if (!this.hass) return;
        const hass = this.hass;
        if (kind === "delete") void this._mutate(() => api.delete(hass, base.id, base.revision), true);
        else if (preview) void this._mutate(() => api.applySpecies(hass, base.id, base.revision, preview.preview_token, preview.provider, preview.operation), false, "species");
      }}>${this._dialog === "delete" ? "Permanently delete plant" : "Accept and apply reviewed species"}</button></div></dialog>`;
  }
  private async _uploadImage(plant: PlantRecord, file: File): Promise<void> {
    if (!this.hass || this._formBusy || this._blocked) return;
    const context = this._context;
    this._formBusy = true;
    try { await validateImage(file); }
    catch (e) { if (context === this._context) this._error = (e as Error).message; return; }
    finally { if (context === this._context) this._formBusy = false; }
    if (context !== this._context || !this.isConnected || this._view.kind !== "detail" || this._view.plantId !== plant.id || this._base?.revision !== plant.revision) return;
    const hass = this.hass;
    // The authenticated backend decodes, checks dimensions, strips metadata and re-encodes.
    await this._mutate(() => api.uploadImage(hass, plant.id, plant.revision, file));
  }
  private _renderImage(plant: PlantRecord) {
    return html`<section><h2>Plant photo</h2>${plant.image ? this._imageLoading ? html`<p role="status">Loading photo…</p>` : this._imageError ? html`<p class="error" role="alert">Photo could not be loaded: ${this._imageError}</p><button @click=${() => { this._clearImage(); this._syncImage(); }}>Retry photo</button>` : this._imageUrl ? html`<img class="preview" alt="Photo of ${plant.name}" src=${this._imageUrl} @error=${() => { this._imageError = "The stored photo could not be decoded. Retry or replace it with a valid image."; }}>` : nothing : html`<p>No photo yet.</p>`}
      ${plant.image ? html`<p>Stored locally: ${plant.image.content_type} · ${plant.image.width} × ${plant.image.height} pixels</p>` : nothing}
      <label>${plant.image ? "Replace photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" ?disabled=${this._formBusy || this._blocked || !!this._conflict} @change=${(e: Event) => { const input = e.target as HTMLInputElement; const file = input.files?.[0]; input.value = ""; if (file) void this._uploadImage(plant, file); }}></label><small>JPEG, PNG or WebP · max 5 MiB · max 2048 × 2048. Images are authenticated and stored locally.</small>
      ${plant.image ? html`<button ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => { if (this.hass) { const hass = this.hass; void this._mutate(() => api.deleteImage(hass, plant.id, plant.revision)); } }}>Remove photo</button>` : nothing}</section>`;
  }
  private _saveButton(kind: SaveKind, label: string) { return html`<button class="primary" @click=${() => void this._save(kind)}>${label}</button>`; }
  // Small localize shim: reads `hass.localize` when the frontend supplies it
  // and falls back to the exact inline English otherwise. Fallbacks are
  // bit-identical to the previously inline copy so behaviour is unchanged
  // when localize is not provided.
  private _t(key: string, fallback: string, args?: Record<string, string | number>): string {
    return translator(this.hass?.localize)(`component.smart_plants.${key}`, fallback, args);
  }
  private _renderOverallHealth(plant: PlantRecord) {
    // Read-only surfacing of the accepted multi-role health composite.
    // Reads only the sibling `smart_plants/plants/health` reply cached in
    // `_health`; issues no new WebSocket command or mutation of any kind.
    const health = this._health[plant.id];
    const localize = this.hass?.localize;
    const heading = this._t("panel.section.overall_health", "Overall health");
    const unavailable = this._t("panel.section.overall_health_unavailable", "Overall health is unavailable.");
    const unavailableDetail = this._t("panel.section.overall_health_unavailable_detail", "Overall health is unavailable — no configured role is currently reporting a valid value.");
    const confidenceLabel = this._t("panel.section.overall_health_confidence", "Confidence");
    const includedLabel = this._t("panel.section.overall_health_included_roles", "Included roles");
    const noneContributing = this._t("panel.section.overall_health_none_contributing", "No roles are currently contributing to the composite.");
    const configuredUnavailableLabel = this._t("panel.section.overall_health_configured_unavailable", "Configured but unavailable");
    const allIncluded = this._t("panel.section.overall_health_all_included", "None — every configured role is currently included.");
    return html`<section aria-labelledby="overall-health-heading"><h2 id="overall-health-heading">${heading}</h2>
      ${!health ? html`<p role="status">${this._healthError ? `${unavailable} ${this._healthError}` : unavailable}</p>` : html`
        <p role="status" aria-live="polite">${health.available && health.health_score !== null ? this._t("panel.section.overall_health_available_summary", "{score} out of 100", { score: health.health_score }) : unavailableDetail}</p>
        <dl class="overall-health">
          <dt>${confidenceLabel}</dt><dd>${health.confidence_label} — ${confidenceGloss(health.confidence_label, localize)}</dd>
          <dt>${includedLabel}</dt><dd>${health.contributors.length ? html`<ul class="contributors">${health.contributors.map(r => html`<li>${contributorLabel(r, localize)}</li>`)}</ul>` : noneContributing}</dd>
          <dt>${configuredUnavailableLabel}</dt><dd>${(() => {
            const unavailableRoles = health.configured.filter(r => !health.contributors.includes(r));
            return unavailableRoles.length ? html`<ul class="configured-unavailable">${unavailableRoles.map(r => html`<li>${contributorLabel(r, localize)}</li>`)}</ul>` : allIncluded;
          })()}</dd>
        </dl>
      `}
    </section>`;
  }
  private _renderDiagnostics(plant: PlantRecord) {
    // Read-only status rows + effective-threshold sub-lists.
    // Editable roles are listed in THRESHOLD_EDITORS.
    const rows = problemBinaries(plant, this._entities, this._states);
    const active = rows.filter(r => r.status === "on").length;
    const statusText = (status: string) => status === "on"
      ? this._t("panel.section.advanced_diagnostics_status_problem", "problem detected")
      : status === "off"
        ? this._t("panel.section.advanced_diagnostics_status_ok", "no problem")
        : status === "unavailable"
          ? this._t("panel.section.advanced_diagnostics_status_unavailable", "unavailable")
          : this._t("panel.section.advanced_diagnostics_status_not_configured", "not configured");
    const pending = this._pendingThresholdSwitch;
    const currentSpec = this._thresholdRole ? _EDITOR_BY_PROBLEM_ROLE[this._thresholdRole] : null;
    const currentLabel = currentSpec ? currentSpec.problemRole.replaceAll("_", " ") : "";
    const pendingLabel = pending ? pending.spec.problemRole.replaceAll("_", " ") : "";
    const heading = this._t("panel.section.advanced_diagnostics", "Advanced diagnostics");
    const description = this._t("panel.section.advanced_diagnostics_description", "Status of the problem indicators for this plant. Threshold editing is available for every role: temperature, humidity, conductivity, CO2, soil temperature stress, low battery, and low light.");
    const summary = active === 0
      ? this._t("panel.section.advanced_diagnostics_zero_active", "No active problems.")
      : active === 1
        ? this._t("panel.section.advanced_diagnostics_one_active", "1 active problem.")
        : this._t("panel.section.advanced_diagnostics_many_active", "{count} active problems.", { count: active });
    return html`<section aria-labelledby="diagnostics-heading"><h2 id="diagnostics-heading">${heading}</h2>
      <p role="status" aria-live="polite">${summary}</p>
      <p>${description}</p>
      ${pending ? html`<p class="notice threshold-switch-alert" role="alert">${this._t("panel.section.advanced_diagnostics_switch_prompt", "Unsaved changes in the {current} editor. Discard them and switch to the {pending} editor?", { current: currentLabel, pending: pendingLabel })}
        <button type="button" class="primary" @click=${() => this._confirmDiscardAndSwitch()}>${this._t("panel.section.advanced_diagnostics_switch_discard", "Discard and switch")}</button>
        <button type="button" @click=${() => { this._pendingThresholdSwitch = null; }}>${this._t("panel.section.advanced_diagnostics_switch_keep", "Keep editing")}</button>
      </p>` : nothing}
      <dl class="diagnostics">${rows.map(row => {
        const thresholds = row.status === "not_configured" ? [] : effectiveThresholds(plant, row.role, this._entities, this._states);
        const spec = _EDITOR_BY_PROBLEM_ROLE[row.role];
        const editable = !!spec && row.status !== "not_configured";
        const editing = editable && this._thresholdRole === row.role && this._thresholdEdits !== null;
        const saved = spec ? this._thresholdSaved[row.role] : "";
        // The <dt> names the row and the <dd> text carries the status; ARIA
        // prohibits aria-label on the definition role, so none is set here.
        return html`<dt>${row.label}</dt><dd class=${"status-" + row.status}>${statusText(row.status)}${row.reason ? html` — ${row.reason}` : nothing}${thresholds.length ? html`<ul class="thresholds" aria-label=${`${row.label} effective thresholds`}>${thresholds.map(t => html`<li><span class="threshold-label">${t.label}</span>: <span class="threshold-value">${t.value === null ? "—" : `${t.value} ${t.unit}`}</span></li>`)}</ul>` : nothing}${editable && spec ? html`<button class="threshold-toggle" type="button" aria-expanded=${editing ? "true" : "false"} aria-controls=${`${row.role}-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleThresholdEdit(spec, plant)}>${editing ? this._t("panel.section.advanced_diagnostics_cancel_edit", "Cancel") : this._t("panel.section.advanced_diagnostics_edit_thresholds", "Edit thresholds")}</button>${editing ? this._renderThresholdEditor(spec, plant) : nothing}${saved && !editing ? html`<p class="notice" role="status">${saved}</p>` : nothing}` : nothing}</dd>`;
      })}</dl></section>`;
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
    const field = (key: string) => html`<label>${spec.labels[key]}<input type="number" step=${spec.step} min=${spec.min} max=${spec.max} inputmode="decimal" .value=${edits[key]} @input=${(e: Event) => this._editThreshold({ [key]: (e.target as HTMLInputElement).value })}></label><small>Default ${spec.defaults[key]} ${spec.unit} · effective ${edits[key].trim() === "" ? spec.defaults[key] : edits[key]} ${spec.unit}</small><button type="button" @click=${() => this._editThreshold({ [key]: "" })}>Inherit</button>`;
    return html`<div id=${`${spec.problemRole}-editor`} class="threshold-editor" role="group" aria-label=${`${spec.problemRole.replaceAll("_", " ")} thresholds`}>
      <p>${spec.formIntro}</p>
      <fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
        <div class="grid">${spec.keys.map(k => html`<div>${field(k)}</div>`)}</div>
        ${this._thresholdError ? html`<p class="error" role="alert">${this._thresholdError}</p>` : nothing}
        <div class="actions">
          <button type="button" @click=${() => this._editThreshold(Object.fromEntries(spec.keys.map(k => [k, ""])))}>Inherit all built-in defaults</button>
          <button type="button" @click=${() => { this._thresholdRole = null; this._thresholdEdits = null; this._thresholdBaseline = null; this._thresholdError = ""; this._pendingThresholdSwitch = null; }}>Cancel</button>
          <button type="button" class="primary" @click=${() => void this._saveThresholds(spec, plant)}>Save thresholds</button>
        </div>
      </fieldset>
    </div>`;
  }
  private async _saveThresholds(spec: ThresholdEditorSpec, plant: PlantRecord): Promise<void> {
    if (!this.hass || !this._thresholdEdits || this._formBusy || this._blocked || this._conflict) return;
    const { values, error } = spec.validate(this._thresholdEdits);
    if (error) { this._thresholdError = error; return; }
    this._thresholdError = "";
    const hass = this.hass;
    await this._mutate(() => api.setThresholdOverrides(hass, plant.id, plant.revision, spec.configRole, values));
    if (!this._error) {
      this._thresholdRole = null; this._thresholdEdits = null; this._thresholdBaseline = null; this._pendingThresholdSwitch = null;
      this._thresholdSaved = { ...this._thresholdSaved, [spec.problemRole]: spec.successNotice };
    }
  }
  // ---- Sensors section: generic per-role source assignment ----
  private _sourceSummary(plant: PlantRecord, role: string): string {
    const c = roleSourceConfig(plant, role);
    if (!c) return "role data unavailable";
    if (!c.sources.length) return "no sources — this role has no computed entity yet";
    return `${c.sources.length} source${c.sources.length === 1 ? "" : "s"} · ${c.aggregation}${c.primary_entity_id ? ` · primary ${c.primary_entity_id}` : ""}`;
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
    const pending = this._pendingSourceSwitch;
    return html`<section aria-labelledby="sensors-heading"><h2 id="sensors-heading">Sensors</h2>
      <p>Assign Home Assistant sensors to each role. A role's computed sensor and problem binary appear once it has had at least one source. The entity picker is filtered by device class and unit; other sensors are available under "Show all sensors".</p>
      ${pending ? html`<div class="notice" role="alert"><p>You have unsaved changes in the ${roleSourceSpec(this._sourceRole ?? "")?.label ?? this._sourceRole} sources editor. Switch editors and discard them?</p>
        <button type="button" class="primary" @click=${() => this._confirmSourceSwitch()}>Discard and switch</button>
        <button type="button" @click=${() => { this._pendingSourceSwitch = null; }}>Keep editing</button></div>` : nothing}
      <dl class="sensors">${ROLE_SOURCE_SPECS.map(spec => {
        const editing = this._sourceRole === spec.role && this._sourceEdits !== null;
        const saved = this._sourceSaved[spec.role];
        return html`<dt>${spec.label}</dt><dd>${this._sourceSummary(plant, spec.role)}
          <button class="source-toggle" type="button" aria-expanded=${editing ? "true" : "false"} aria-controls=${`${spec.role}-sources-editor`} ?disabled=${this._formBusy || this._blocked || !!this._conflict} @click=${() => this._toggleSourceEdit(spec.role, plant)}>${editing ? "Cancel" : "Edit sources"}</button>
          ${editing ? this._renderSourceEditor(spec.role, plant) : nothing}
          ${!editing && this._sourceRefused(plant, spec.role) ? html`<p id=${`${spec.role}-sources-unavailable`} class="error" role="alert">${spec.label} source data is missing or incompatible. Refresh or upgrade before editing; defaults will not be guessed.</p>` : nothing}
          ${saved && !editing ? html`<p class="notice" role="status">${saved}</p>` : nothing}</dd>`;
      })}</dl></section>`;
  }
  private _renderSourceEditor(role: string, plant: PlantRecord) {
    const spec = roleSourceSpec(role); const edits = this._sourceEdits;
    if (!spec || !edits) return nothing;
    return html`<div id=${`${role}-sources-editor`} class="editor"><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
      ${roleSourcesEditor(spec, edits, this._entities, this._states, this._allSourceSensors, v => this._allSourceSensors = v, v => this._editSource(v))}
      ${this._sourceError ? html`<p class="error" role="alert">${this._sourceError}</p>` : nothing}
      <div class="actions">
        <button type="button" @click=${() => { this._sourceRole = null; this._sourceEdits = null; this._sourceBaseline = null; this._sourceError = ""; this._pendingSourceSwitch = null; }}>Cancel</button>
        <button type="button" class="primary" @click=${() => void this._saveRoleSources(role, plant)}>Save ${spec.label.toLowerCase()} sources</button>
      </div></fieldset></div>`;
  }
  private async _saveRoleSources(role: string, plant: PlantRecord): Promise<void> {
    if (!this.hass || !this._sourceEdits || this._formBusy || this._blocked || this._conflict) return;
    if (this._registryError) { this._sourceError = "Reconnect to load current registry data before saving sources."; return; }
    const error = validateRoleSources(this._sourceEdits); if (error) { this._sourceError = error; return; }
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
      this._sourceSaved = { ...this._sourceSaved, [role]: `${roleSourceSpec(role)?.label ?? role} sources saved.` };
    }
  }
  private _renderPlantOverview(plant: PlantRecord, evaluation: Evaluation | undefined) {
    const moisture = moistureRole(plant);
    const sources = moisture?.sources.map(source => resolveSource(source, this._entities)?.entity_id ?? source.entity_id) ?? [];
    const assignedRoles = ROLE_SOURCE_SPECS.flatMap(spec => {
      if (spec.role === "moisture") return [];
      const config = roleSourceConfig(plant, spec.role);
      return config?.sources.length ? [{ label: spec.label, count: config.sources.length }] : [];
    });
    const latestCare = this._careHistory?.events.slice(0, 3) ?? [];
    return html`<section class="plant-overview-card"><div class="overview-heading">${this._imageUrl ? html`<img class="overview-avatar" src=${this._imageUrl} alt=${`Photo of ${plant.name}`}>` : html`<div class="overview-avatar placeholder" aria-hidden="true">${plant.name.slice(0, 1).toLocaleUpperCase()}</div>`}<div><p class="eyebrow">PLANT OVERVIEW</p><p>${plant.species?.snapshot.common_name ?? plant.species?.snapshot.latin_name ?? "No species selected"}</p>${plant.category ? html`<span class="muted">${plant.category}</span>` : nothing}<button type="button" @click=${() => this._detailSection = "details"}>Plant details and photo</button></div></div>
      <div class="overview-metrics"><article><span>Soil moisture</span><strong>${evaluation?.computed_percent ?? "—"}${evaluation?.computed_percent === null || evaluation?.computed_percent === undefined ? "" : "%"}</strong><small>${evaluation?.computed_available ? "Current reading" : "No current reading"}</small></article><article><span>Moisture health</span><strong>${evaluation?.health_score ?? "—"}${evaluation?.health_score === null || evaluation?.health_score === undefined ? "" : "/100"}</strong><small>Based on moisture readings</small></article><article><span>Moisture sensors</span><strong>${sources.length}</strong><small>${moisture?.aggregation ?? "Not configured"} aggregation</small></article></div>
       <section class="overview-sensors"><h2>Assigned sensors</h2>${sources.length || assignedRoles.length ? html`<ul>${sources.map(id => html`<li>Soil moisture · ${id}${id === moisture?.primary_entity_id ? html` <span class="muted">Primary</span>` : nothing}</li>`)}${assignedRoles.map(role => html`<li>${role.label} · ${role.count} source${role.count === 1 ? "" : "s"}</li>`)}</ul>` : html`<p>No sensors assigned. You can still use the plant profile and log care.</p>`}<button type="button" @click=${() => this._detailSection = "sensors"}>Manage sensors</button></section>
       <section class="overview-care"><h2>Recent care</h2>${latestCare.length ? html`<ul>${latestCare.map(event => html`<li><strong>${event.kind}</strong> · ${event.local_date}</li>`)}</ul>` : html`<p>No care events recorded yet.</p>`}<button type="button" @click=${() => this._detailSection = "care"}>Open care history</button></section>
      ${this._health?.[plant.id] ? html`<p class="muted">Overall health confidence: ${this._health[plant.id]?.confidence_label ?? "unknown"}</p>` : nothing}
    </section>`;
  }
  private _renderDetail(id: string) {
    const plant = this._plantById(id); const edit = this._edits;
    if (!plant || !edit) return html`<p>Plant not found — it may have been deleted in another session.</p>`;
    const evaluation = this._evaluations[id]; const m = moistureRole(plant); const device = plantDevice(plant, this._devices);
    return html`${this._conflict ? html`<section class="notice" role="alert"><h2>Review changes from another session</h2><p>Revision ${this._conflict.before.revision} → ${this._conflict.after.revision}. Saving is paused. Local edits are retained.</p><ul>${this._conflict.changes.map(c => html`<li class="prose">${c}</li>`)}</ul>${this._sourceConflictFields(this._conflict.after).length ? html`<p>Both sessions changed these source fields: ${this._sourceConflictFields(this._conflict.after).join(", ")}. Review the refreshed role summary and your draft before retrying; Save will replace the refreshed values for these fields.</p>` : nothing}<button @click=${() => this._reviewConflict()}>I reviewed changes; retain my edits for reapply</button><button @click=${() => this._beginEdit(plant)}>Discard my edits and use refreshed values</button></section>` : nothing}
       <header class="detail-heading"><div><h2>${plant.name}</h2><p>${this._status(plant)}</p></div>${device ? html`<a href="/config/devices/device/${encodeURIComponent(device.id)}">Open Home Assistant device</a>` : nothing}</header>
      <nav class="detail-tabs" aria-label="Plant sections">${([ ["overview", "Overview"], ["sensors", "Sensors"], ["care", "Care history"], ["details", "Plant details"], ["diagnostics", "Diagnostics"] ] as [DetailSection, string][]).map(([section, label]) => html`<button type="button" aria-current=${this._detailSection === section ? "page" : nothing} @click=${() => this._detailSection = section}>${label}</button>`)}</nav>
        ${this._detailSection === "overview" ? this._renderPlantOverview(plant, evaluation) : nothing}
       ${this._detailSection === "details" ? html`<section><h2>Identity and placement</h2>${this._renderImage(plant)}<fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>${textField("Name", edit.name, v => this._edit({ name: v }))}${textField("Acquired (ISO date/time, optional)", edit.acquired, v => this._edit({ acquired: v }))}${placementEditor(edit.placement, v => this._edit({ placement: v }))}${this._saveButton("identity", "Save identity")}</fieldset></section>
       <section><h2>Home Assistant area</h2><p>Current: ${this._areaName(device?.area_id ?? "")}. Area belongs to the native device registry.</p>${this._areaReview ? html`<p class="notice">The native area changed. Review current and selected areas before reapplying.</p><button @click=${() => this._areaReview = false}>I reviewed the native area change</button><button @click=${() => { this._edit({ area: this._baseArea }); this._areaReview = false; }}>Use current native area</button>` : nothing}<fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict || !!this._registryError || this._areaReview}>${areaEditor(edit.area, this._areas, v => this._edit({ area: v }))}${this._saveButton("area", "Save area")}</fieldset></section>
       <section><h2>Taxonomy</h2><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>${textField("Category", edit.category, v => this._edit({ category: v }), "text", 60)}${textField("Tags (comma-separated)", edit.tagText, v => this._edit({ tagText: v }), "text", 2000)}<p>Smart Plants taxonomy is separate from Home Assistant labels.</p>${this._saveButton("taxonomy", "Save taxonomy")}</fieldset></section>
       <section><h2>Species</h2>${plant.species ? snapshotView(plant.species.snapshot) : html`<p>No species assigned.</p>`}<fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>
      ${plant.species?.snapshot.provider_ref ? html`<button @click=${() => void this._previewSpecies()}>Preview species refresh</button>` : nothing}
      ${selectField("Species provider", this._provider, [{ value: "manual", label: "Manual species" }, ...(this._capabilities?.providers.filter(p => p.available && p.search_supported).map(p => ({ value: p.provider, label: p.provider })) ?? [])], v => { this._providerRequest++; this._provider = v; this._preview = null; this._results = []; })}
       ${this._provider === "manual" ? html`${textField("Common name", edit.common, v => this._edit({ common: v }))}${textField("Scientific name", edit.latin, v => this._edit({ latin: v }))}<p>Save replaces the species with user-supplied data. Leave both names blank to clear species.</p>${this._saveButton("species", "Save manual species")}` : html`${textField("Search species", this._query, v => { this._query = v; this._providerRequest++; this._results = []; this._preview = null; })}<button @click=${() => void this._searchSpecies()}>Search species</button><ul>${this._results.map(r => html`<li><button @click=${() => void this._previewSpecies(r)}>${r.common_name ?? r.latin_name} · ${r.latin_name}</button><small>${r.attribution}</small></li>`)}</ul><button @click=${() => { this._provider = "manual"; this._providerRequest++; this._preview = null; }}>Continue manually</button>`}</fieldset></section>
       ` : nothing}
       ${this._detailSection === "details" ? html`
       <section><h2>Lifecycle</h2><p>Disabling stops plant evaluation and makes its entities unavailable. User-authored automations remain independent.</p><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}><div class="actions"><button @click=${() => { if (this.hass) { const hass = this.hass; void this._mutate(() => plant.lifecycle_state === "active" ? api.disable(hass, plant.id, plant.revision) : api.reenable(hass, plant.id, plant.revision)); } }}>${plant.lifecycle_state === "active" ? "Disable" : "Re-enable"}</button><button @click=${() => this._openDialog("delete")}>Delete plant</button></div></fieldset></section>` : nothing}
       ${this._detailSection === "sensors" ? html`<section><h2>Moisture configuration</h2>${m && edit.moisture ? html`<p class="default-summary">Effective thresholds: ${keys.map(k => `${k} ${m.threshold_overrides[k] ?? this._defaults(plant)[k]}%`).join(" · ")}</p><fieldset ?disabled=${this._formBusy || this._blocked || !!this._conflict}>${moistureEditor(edit.moisture, this._defaults(plant), this._entities, this._states, this._allSensors, v => this._allSensors = v, v => this._edit({ moisture: v }), "sources")}<details class="advanced-disclosure"><summary>Advanced threshold overrides</summary><p>Blank values inherit the effective default shown above.</p>${moistureEditor(edit.moisture, this._defaults(plant), this._entities, this._states, this._allSensors, v => this._allSensors = v, v => this._edit({ moisture: v }), "thresholds")}</details>${this._saveButton("moisture", "Save complete moisture configuration")}</fieldset>` : html`<p class="error" role="alert">Moisture role data is missing or incompatible. Refresh or upgrade before editing; defaults will not be guessed.</p>`}</section>${this._renderSensors(plant)}` : nothing}
       ${this._detailSection === "care" ? this._renderCare(plant) : nothing}
       ${this._detailSection === "diagnostics" ? html`<section><h2>Native automations</h2><p>Use the plant's needs-water entity for notifications or reminders in Home Assistant. Dynamic/template references may not appear in related results.</p><a href="/config/automation/dashboard">Open automation editor</a><ul>${this._related.map(id => html`<li>${id}</li>`)}</ul></section>${this._renderOverallHealth(plant)}${this._renderDiagnostics(plant)}` : nothing}
       ${this._renderDialog()}`;
  }
  private async _created(e: CustomEvent<{ plant: PlantRecord; photo: File | null; navigationContext: number }>): Promise<void> {
    const { plant, photo, navigationContext } = e.detail;
    const hass = this.hass;
    const foreground = this._view.kind === "create" && navigationContext === this._context;
    const initialPhoto = photo && plant.revision === 1 && plant.image === null;
    this._wizardStarted = false;
    // A committed result belongs in inventory even when its wizard is hidden.
    // Only the navigation context that submitted it may open its detail editor.
    const latest = this._plantById(plant.id);
    if (!latest || latest.revision <= plant.revision) this._plants = [...this._plants.filter(p => p.id !== plant.id), plant];
    this._createdPlantId = plant.id;
    this._creationNotice = `${plant.name} created.${initialPhoto ? " Uploading its selected photo…" : photo ? " The plant changed after creation. The original wizard photo was not uploaded. Review its current photo in the plant detail and explicitly upload a photo if wanted." : ""}`;
    if (foreground) this._show({ kind: "detail", plantId: plant.id });
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
      await validateImage(photo);
      if (!this.isConnected || this.hass?.connection !== hass.connection || this._blocked) return;
      const uploaded = await api.uploadImage(hass, plant.id, plant.revision, photo);
      if (!this.isConnected || this.hass?.connection !== hass.connection) return;
      // The still-current created-plant editor can adopt its own photo revision
      // while retaining dirty fields. Other contexts reconcile only via refresh.
      if (photoContext === this._context && this._base?.id === plant.id && this._base.revision === plant.revision && !this._formBusy && !this._conflict) this._rebaseEdits(this._base, uploaded);
      if (this._createdPlantId === plant.id) this._creationNotice = `${plant.name} created. Selected photo uploaded.`;
    } catch (error) {
      if (!this.isConnected || this.hass?.connection !== hass.connection) return;
      if (this._createdPlantId === plant.id) this._creationNotice = `${plant.name} created. Selected photo was not uploaded. Open the created plant to upload it again. ${this._friendly(error)}`;
    } finally {
      if (this._createdPlantId === plant.id && this._creationNotice.endsWith("Uploading its selected photo…")) this._creationNotice = `${plant.name} created. Photo upload interrupted. Open the created plant to check its photo before retrying.`;
    }
    await this._refresh(false);
  }
  protected render() {
    if (this.hass?.user?.is_admin === false) return html`<main><div class="panel-content"><p role="alert">Smart Plants requires an admin account.</p></div></main>`;
    const menuLabel = this.hass?.localize?.("ui.common.menu") || "Menu";
    return html`<main><ha-top-app-bar-fixed class="panel-appbar" .narrow=${this.narrow}>
       <h1 slot="title" class="page-title" tabindex="-1">Smart Plants</h1>
       <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
         <ha-icon-button slot="trigger" .label=${menuLabel} .path=${MENU_ICON_PATH}></ha-icon-button>
         ${this._view.kind !== "list" ? html`<ha-dropdown-item value="back-to-overview" ?disabled=${this._formBusy}>Back to overview</ha-dropdown-item>` : nothing}
         <ha-dropdown-item value="add-plant" ?disabled=${this._blocked}>Add plant<ha-svg-icon slot="icon" .path=${ADD_ICON_PATH}></ha-svg-icon></ha-dropdown-item>
       </ha-dropdown>
       <div class="panel-content">${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}${this._notice ? html`<p class="notice" role="status">${this._notice}</p>` : nothing}${this._registryError ? html`<p class="notice" role="alert">Registry/state data unavailable: ${this._registryError}. Reconnect before assigning registered sensors or areas.</p>` : nothing}
      ${this._creationNotice ? html`<p class="notice" role="status">${this._creationNotice}</p>${this._createdPlantId && !(this._view.kind === "detail" && this._view.plantId === this._createdPlantId) ? html`<button ?disabled=${this._formBusy} @click=${() => { if (this._createdPlantId) this._show({ kind: "detail", plantId: this._createdPlantId }); }}>Open created plant</button>` : nothing}` : nothing}
      ${this._view.kind === "list" ? this._renderList() : this._view.kind === "detail" ? this._renderDetail(this._view.plantId) : nothing}
      ${this._wizardStarted && this._capabilities ? html`<div ?hidden=${this._view.kind !== "create"}><smart-plants-wizard .hass=${this.hass} .capabilities=${this._capabilities} .areas=${this._areas} .entities=${this._entities} .states=${this._states} .blocked=${this._blocked} .navigationContext=${this._context} @plant-created=${(e: CustomEvent<{ plant: PlantRecord; photo: File | null; navigationContext: number }>) => void this._created(e)} @backend-unavailable=${(e: CustomEvent<string>) => { this._blocked = true; this._error = e.detail; }}></smart-plants-wizard></div>` : nothing}
        <p role="status" aria-live="polite">${this._formBusy ? "Saving or loading preview…" : ""}</p></div></ha-top-app-bar-fixed></main>`;
  }
}
// Keep SPA navigation and cache-busted bundle reloads idempotent: HA retains
// custom element definitions for the lifetime of its frontend document.
if (!customElements.get("smart-plants-panel")) {
  customElements.define("smart-plants-panel", SmartPlantsPanel);
}
declare global { interface HTMLElementTagNameMap { "smart-plants-panel": SmartPlantsPanel } }
