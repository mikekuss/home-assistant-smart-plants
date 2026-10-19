import type { HALocale } from "./localize.js";
// Public Smart Plants v1 wire shapes and the small public HA surface we use.
// Optional roles are runtime-validated by model.ts before any editor consumes them.

export type PlantLifecycleState = "active" | "disabled";

export interface PlantImage {
  id: string;
  content_type: string;
  width: number;
  height: number;
  created_at: string;
}

export interface PlantPlacement {
  mode: string;
  exposure: string | null;
  rain_exposure: string | null;
  container: boolean | null;
}

export interface PlantSpecies {
  provider: string;
  snapshot: SpeciesSnapshot;
}

export interface SpeciesSnapshot {
  provider: string;
  provider_id: string | null;
  provider_ref: string | null;
  fetched_at: string;
  locale: string;
  source_status: "manual" | "provider";
  attribution: string;
  common_name: string | null;
  latin_name: string | null;
  category: string | null;
  confidence: number | null;
  care_text: Record<string, string>;
  field_sources: Record<string, string>;
  threshold_defaults: Record<string, Record<string, number>>;
  min_temperature?: number | null;
  max_temperature?: number | null;
  survival_min_temperature?: number | null;
  common_names?: Partial<Record<"en" | "de", string[]>>;
}

export interface SpeciesSearchResult {
  provider: string;
  provider_ref: string;
  common_name: string | null;
  latin_name: string;
  category: string | null;
  attribution: string;
}

export interface SpeciesPreview {
  preview_token: string;
  provider: string;
  operation: SpeciesPreviewOperation;
  snapshot: SpeciesSnapshot;
  diff: Record<string, { before: unknown; after: unknown }>;
}

export type SpeciesPreviewOperation = "select" | "refresh";

export type ThresholdSource = "builtin" | "provider";

export interface ThresholdDefault {
  value: number;
  source: ThresholdSource;
  provider: string | null;
  provider_ref: string | null;
}

export interface SensorSource {
  entity_id: string;
  registry_id: string | null;
}

export interface MoistureRoleConfig {
  sources: SensorSource[];
  primary_entity_id: string | null;
  aggregation: "primary" | "average" | "min" | "max";
  stale_after_seconds: number;
  threshold_defaults: Record<"min" | "target" | "max", ThresholdDefault>;
  // A present null explicitly means inherited. Registered threshold maps are
  // total, so omission is malformed rather than a second clear spelling.
  threshold_overrides: Record<"min" | "target" | "max", number | null>;
}

// The source-configuration fields shared by every role. Threshold data is
// role-specific and handled separately; the Sensors section only edits sources.
export interface RoleSourceConfig {
  sources: SensorSource[];
  primary_entity_id: string | null;
  aggregation: "primary" | "average" | "min" | "max";
  stale_after_seconds: number;
}
export type RoleSourceInput = RoleSourceConfig;

export interface PlantRoles {
  moisture: MoistureRoleConfig;
  // Newer backend roles survive older frontend clients without being guessed.
  [role: string]: unknown;
}

export interface PlantRecord {
  id: string;
  revision: number;
  name: string;
  created_at: string;
  lifecycle_state: PlantLifecycleState;
  acquired_at: string | null;
  species: PlantSpecies | null;
  placement: PlantPlacement | null;
  tags: string[];
  category: string | null;
  image: PlantImage | null;
  roles?: PlantRoles;
  care_events?: CareEvent[];
  care_tasks?: CareTask[];
  rest_period?: RestPeriod | null;
}

// Months are 1-12, inclusive at both ends; a range may wrap past December.
export interface RestPeriod {
  start_month: number;
  end_month: number;
}
export interface IntervalSchedule {
  kind: "interval";
  every: number;
  unit: "days" | "weeks" | "months" | "years";
  growing_season_only: boolean;
}
export interface YearlySchedule {
  kind: "yearly";
  start_month: number;
  end_month: number;
}
export type CareTaskType = "fertilize" | "prune" | "repot" | "pests" | "custom";
export interface CareTask {
  id: string;
  type: CareTaskType;
  // null means the translated default name for the type.
  name: string | null;
  schedule: IntervalSchedule | YearlySchedule;
  instructions: string | null;
  baseline_done_on: string | null;
  last_done_at: string | null;
  last_skipped_on: string | null;
  created_on: string;
}

export type CareTaskStatus = "scheduled" | "due" | "overdue" | "resting" | "done" | "skipped" | "missed";
// Fields of `smart_plants/care_tasks/create`. Blank text is stored as null.
export interface CareTaskInput {
  task_type: CareTaskType;
  name: string | null;
  schedule: IntervalSchedule | YearlySchedule;
  instructions: string | null;
  baseline_done_on: string | null;
}
// Fields of `smart_plants/care_tasks/update`; omitted fields stay unchanged.
export type CareTaskChanges = Partial<Omit<CareTaskInput, "task_type">>;
// Optional fields of `smart_plants/care_tasks/complete`; the backend uses the
// current time when `occurred_at` is omitted.
export interface CareTaskCompletion {
  occurred_at?: string;
  note?: string | null;
}

export interface CareEvent {
  schema_version: 2;
  id: string;
  kind: "watering" | "fertilizing" | "pruning" | "repotting" | "note" | "task";
  provenance: "manual" | "action" | "automation";
  task_id: string | null;
  occurred_at: string;
  local_date: string;
  created_at: string;
  updated_at: string;
  payload: Record<string, string | number | null>;
}
export interface CareHistory {
  revision: number;
  events: CareEvent[];
  summary: { watering_count: number; last_watered_at: string | null; last_watered_local_date: string | null };
}

export interface RoleMetadata {
  role: string;
  source_domain: string;
  aggregations: string[];
  thresholds: Array<{
    key: string;
    entity_role: string;
    translation_key: string;
  }>;
  entities: Array<{
    role: string;
    platform: string;
    translation_key: string;
  }>;
}

// Home Assistant Panel API object for a custom lovelace panel. Only the
// bits we actually use are typed; the runtime object HA hands us has many
// more fields.
export interface HomeAssistantLike {
  auth?: {
    accessToken?: string;
  };
  connection: {
    sendMessagePromise<T = unknown>(msg: Record<string, unknown>): Promise<T>;
    addEventListener?(event: string, callback: () => void): void;
    removeEventListener?(event: string, callback: () => void): void;
    subscribeEvents?<T>(callback: (event: T) => void, event: string): Promise<() => void>;
  };
  states?: Record<string, HAState>;
  // Area registry snapshot the frontend keeps for its own pickers.
  areas?: Record<string, { area_id?: unknown; name?: unknown }>;
  language?: string;
  // Profile language and number/date/time format preferences (HA frontend).
  locale?: HALocale;
  user?: {
    is_admin?: boolean;
    name?: string;
  };
  // Core configuration; the panel reads the Home Assistant time zone so care
  // dates match the dates the backend computes.
  config?: { time_zone?: unknown };
  // Home Assistant frontend supplies `localize` on the hass object. It may
  // return the empty string when a key is unknown; callers must fall back.
  localize?: (key: string, ...args: unknown[]) => string;
}

export interface PanelInfo {
  config?: Record<string, unknown>;
  title?: string;
  url_path?: string;
}

export interface PanelCapabilities {
  api_version: 1;
  schema_version: 1;
  providers: { provider: string; available: boolean; search_supported: boolean }[];
  // Identifies the panel bundle Home Assistant currently serves; older backends omit it.
  bundle_version?: string;
}
export interface WizardDraft { draft_id: string; draft_token: string; revision: 0; expires_in: number }
export interface WizardPreview extends SpeciesPreview { draft_id: string; revision: 0; operation: "select" }
export type MoistureInput = Omit<MoistureRoleConfig, "threshold_defaults">;
export interface WizardCreateInput {
  draft_id: string;
  draft_token: string;
  expected_revision: 0;
  confirmed: true;
  name: string;
  moisture: MoistureInput;
  acquired_at?: string | null;
  placement?: PlantPlacement | null;
  tags?: string[];
  category?: string | null;
  area_id?: string | null;
  species?: PlantSpecies | null;
  accepted_preview?: { preview_token: string; provider: string; operation: "select" };
  // Non-moisture roles configured together with the plant, validated like the roles/* commands.
  roles?: Record<string, { sources: SensorSource[]; primary_entity_id?: string | null; aggregation?: RoleSourceConfig["aggregation"]; stale_after_seconds?: number }>;
}
export interface HAArea { area_id: string; name: string }
export interface HAEntity { id: string; entity_id: string; device_id: string | null; unique_id: string; platform: string; area_id?: string | null }
export interface HADevice { id: string; area_id: string | null; identifiers: [string, string][]; name_by_user?: string | null }
// `last_reported` changes on every report, even when nothing else did; staleness
// is measured from it. Not every state source supplies it.
export interface HAState { entity_id: string; state: string; attributes: Record<string, unknown>; last_updated: string; last_reported?: unknown }
export interface Evaluation {
  computed_percent: number | null;
  health_score: number | null;
  needs_water: boolean | null;
  too_wet: boolean | null;
  sensor_stale: boolean;
  computed_available: boolean;
  reasons: string[];
}
// Reply payload of `smart_plants/plants/health`. Backend-authoritative composite
// health. `contributors` are the role keys
// included in this evaluation, in the fixed CONTRIBUTOR_ORDER;
// `configured` is the (larger-or-equal) set of role keys currently configured
// on the plant.
export type HealthConfidenceLabel = "high" | "medium" | "low" | "unknown";
export interface HealthEvaluation {
  health_score: number | null;
  available: boolean;
  confidence: number;
  confidence_label: HealthConfidenceLabel;
  contributors: string[];
  configured: string[];
  reasons: string[];
}
