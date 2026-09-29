// All network access lives here: versioned Smart Plants commands, public HA
// registry/state APIs, registry subscriptions, and authenticated image HTTP.
// Backend error codes survive normalization; incompatible public data fails closed.

import type {
  HomeAssistantLike,
  PlantRecord,
  RoleMetadata,
  SpeciesPreview,
  SpeciesSearchResult,
  PanelCapabilities, WizardDraft, WizardPreview, WizardCreateInput,
  MoistureInput, HAArea, HAEntity, HADevice, HAState, Evaluation,
  HealthEvaluation, PlantPlacement, PlantSpecies, SensorSource,
  CareHistory, CareEvent,
} from "./types.js";
import { validPlant, validResponse, validState } from "./validation.js";
import { parseOverview } from "./overview-model.js";
import type { PlantOverview } from "./overview-model.js";

export class ApiError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

interface WsError {
  error?: { code?: string; message?: string };
  code?: string;
  message?: string;
}

function isWsError(value: unknown): value is WsError {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return typeof v["code"] === "string" || typeof v["error"] === "object";
}

async function send<T>(
  hass: HomeAssistantLike,
  msg: Record<string, unknown>,
): Promise<T> {
  try {
    const result = await hass.connection.sendMessagePromise<T>(msg);
    if (!validResponse(msg, result)) throw new ApiError("invalid_response", "The response is incompatible. Refresh and retry.");
    return result;
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    if (isWsError(err)) {
      const code =
        (err.error?.code as string | undefined) ??
        (err.code as string | undefined) ??
        "unknown_error";
      throw new ApiError(typeof code === "string" ? code : "unknown_error", "Request failed. Review your input, refresh and retry.");
    }
    throw new ApiError("unknown_error", "Request failed. Refresh and retry when connected.");
  }
}

export interface CreatePlantInput {
  name: string;
  acquired_at?: string | null;
  category?: string | null;
  tags?: string[];
  area_id?: string | null;
}

export interface UpdatePlantInput {
  plant_id: string;
  expected_revision: number;
  name?: string;
  acquired_at?: string | null;
  category?: string | null;
  tags?: string[];
  placement?: PlantPlacement | null;
  species?: PlantSpecies | null;
  // ``area_id`` intentionally omitted; use ``api.setArea`` to change or
  // clear the device area so the intent is applied exactly once and
  // survives restart.
}

export const api = {
  careHistory(hass: HomeAssistantLike, plantId: string): Promise<CareHistory> {
    return send(hass, { type: "smart_plants/care/list", plant_id: plantId });
  },
  async addWatering(hass: HomeAssistantLike, plantId: string, revision: number, occurredAt: string, note: string | null): Promise<{ plant: PlantRecord; event: CareEvent }> {
    return send(hass, { type: "smart_plants/care/add_watering", plant_id: plantId, expected_revision: revision, occurred_at: occurredAt, note });
  },
  async addCareEvent(hass: HomeAssistantLike, plantId: string, revision: number, kind: CareEvent["kind"], occurredAt: string, payload: CareEvent["payload"]): Promise<{ plant: PlantRecord; event: CareEvent }> {
    return send(hass, { type: "smart_plants/care/add", plant_id: plantId, expected_revision: revision, kind, occurred_at: occurredAt, payload });
  },
  async editCareEvent(hass: HomeAssistantLike, plantId: string, revision: number, eventId: string, kind: CareEvent["kind"], occurredAt: string, payload: CareEvent["payload"]): Promise<{ plant: PlantRecord; event: CareEvent }> {
    return send(hass, { type: "smart_plants/care/edit", plant_id: plantId, expected_revision: revision, event_id: eventId, kind, occurred_at: occurredAt, payload });
  },
  async deleteCareEvent(hass: HomeAssistantLike, plantId: string, revision: number, eventId: string): Promise<{ plant: PlantRecord; summary: CareHistory["summary"] }> {
    return send(hass, { type: "smart_plants/care/delete", plant_id: plantId, expected_revision: revision, event_id: eventId });
  },
  async info(hass: HomeAssistantLike): Promise<PanelCapabilities> {
    const result = await send<PanelCapabilities>(hass, { type: "smart_plants/panel/info" });
    if (!result || result.api_version !== 1 || result.schema_version !== 1 || !Array.isArray(result.providers) ||
        !result.providers.every(p => p && typeof p.provider === "string" && typeof p.available === "boolean" && typeof p.search_supported === "boolean")) {
      throw new ApiError("version_mismatch", "Panel/API version mismatch. Restart Home Assistant and fully reload the frontend after upgrading.");
    }
    return result;
  },
  startWizard(hass: HomeAssistantLike): Promise<WizardDraft> {
    return send(hass, { type: "smart_plants/wizard/start" });
  },
  previewWizard(hass: HomeAssistantLike, draft: WizardDraft, provider: string, providerRef: string, locale: string): Promise<WizardPreview> {
    return send(hass, { type: "smart_plants/wizard/preview", draft_id: draft.draft_id, draft_token: draft.draft_token, expected_revision: 0, provider, provider_ref: providerRef, locale });
  },
  async createWizard(hass: HomeAssistantLike, input: WizardCreateInput): Promise<PlantRecord> {
    return (await send<{ plant: PlantRecord }>(hass, { type: "smart_plants/wizard/create", ...input })).plant;
  },
  async configureMoisture(hass: HomeAssistantLike, plantId: string, revision: number, moisture: MoistureInput): Promise<PlantRecord> {
    return (await send<{ plant: PlantRecord }>(hass, { type: "smart_plants/moisture/configure", plant_id: plantId, expected_revision: revision, moisture })).plant;
  },
  async evaluation(hass: HomeAssistantLike, plantId: string): Promise<Evaluation> {
    return (await send<{ evaluation: Evaluation }>(hass, { type: "smart_plants/moisture/evaluation", plant_id: plantId })).evaluation;
  },
  async plantHealth(hass: HomeAssistantLike, plantId: string): Promise<HealthEvaluation> {
    return (await send<{ evaluation: HealthEvaluation }>(hass, { type: "smart_plants/plants/health", plant_id: plantId })).evaluation;
  },
  async areas(hass: HomeAssistantLike): Promise<HAArea[]> {
    return registryList(await send<unknown>(hass, { type: "config/area_registry/list" }), v => typeof v.area_id === "string" && typeof v.name === "string");
  },
  async entities(hass: HomeAssistantLike): Promise<HAEntity[]> {
    return registryList(await send<unknown>(hass, { type: "config/entity_registry/list" }), v => typeof v.id === "string" && typeof v.entity_id === "string" && typeof v.unique_id === "string" && typeof v.platform === "string" && (v.device_id === null || typeof v.device_id === "string") && (v.area_id === undefined || v.area_id === null || typeof v.area_id === "string"));
  },
  async devices(hass: HomeAssistantLike): Promise<HADevice[]> {
    return registryList(await send<unknown>(hass, { type: "config/device_registry/list" }), v => typeof v.id === "string" && (v.area_id === null || typeof v.area_id === "string") && Array.isArray(v.identifiers) && v.identifiers.every(i => Array.isArray(i) && i.length === 2 && i.every(x => typeof x === "string")));
  },
  async states(hass: HomeAssistantLike): Promise<HAState[]> {
    return registryList(await send<unknown>(hass, { type: "get_states" }), validState);
  },
  async related(hass: HomeAssistantLike, deviceId: string): Promise<string[]> {
    const result = await send<{ automation?: unknown }>(hass, { type: "search/related", item_type: "device", item_id: deviceId });
    return Array.isArray(result.automation) ? result.automation.filter((v): v is string => typeof v === "string") : [];
  },
  async subscribeRegistry(hass: HomeAssistantLike, callback: () => void): Promise<() => void> {
    const unsubscribers: (() => void)[] = [];
    try {
      if (hass.connection.subscribeEvents) for (const event of ["area_registry_updated", "device_registry_updated", "entity_registry_updated"]) {
        unsubscribers.push(await hass.connection.subscribeEvents(callback, event));
      }
    } catch (error) { unsubscribers.forEach(fn => fn()); throw error; }
    return () => unsubscribers.forEach(fn => fn());
  },
  async searchSpecies(
    hass: HomeAssistantLike,
    provider: string,
    query: string,
    locale: string,
    limit = 20,
  ): Promise<SpeciesSearchResult[]> {
    const result = await send<{ results: SpeciesSearchResult[] }>(hass, {
      type: "smart_plants/species/search",
      provider,
      query,
      locale,
      limit,
    });
    return result.results;
  },

  async previewSpecies(
    hass: HomeAssistantLike,
    provider: string,
    providerRef: string,
    locale: string,
    plantId: string,
  ): Promise<SpeciesPreview> {
    return send<SpeciesPreview>(hass, {
      type: "smart_plants/species/preview",
      provider,
      provider_ref: providerRef,
      locale,
      plant_id: plantId,
    });
  },

  async previewSpeciesRefresh(
    hass: HomeAssistantLike,
    plantId: string,
    locale: string,
  ): Promise<SpeciesPreview> {
    return send<SpeciesPreview>(hass, {
      type: "smart_plants/species/refresh_preview",
      plant_id: plantId,
      locale,
    });
  },

  async applySpecies(
    hass: HomeAssistantLike,
    plantId: string,
    expectedRevision: number,
    previewToken: string,
    provider: string,
    operation: "select" | "refresh",
  ): Promise<PlantRecord> {
    const result = await send<{ plant: PlantRecord }>(hass, {
      type: "smart_plants/species/apply",
      plant_id: plantId,
      expected_revision: expectedRevision,
      preview_token: previewToken,
      provider,
      operation,
      confirmed: true,
    });
    return result.plant;
  },

  async roles(hass: HomeAssistantLike): Promise<RoleMetadata[]> {
    const result = await send<{ roles: RoleMetadata[] }>(hass, {
      type: "smart_plants/roles/list",
    });
    return result.roles;
  },

  async setThresholdOverrides(
    hass: HomeAssistantLike,
    plantId: string,
    expectedRevision: number,
    role: string,
    values: Record<string, number | null>,
  ): Promise<PlantRecord> {
    const result = await send<{ plant: PlantRecord }>(hass, {
      type: "smart_plants/roles/set_threshold_overrides",
      plant_id: plantId,
      expected_revision: expectedRevision,
      role,
      values,
    });
    return result.plant;
  },

  async setRoleSources(hass: HomeAssistantLike, plantId: string, expectedRevision: number, role: string, sources: SensorSource[]): Promise<PlantRecord> {
    return (await send<{ plant: PlantRecord }>(hass, { type: "smart_plants/roles/set_sources", plant_id: plantId, expected_revision: expectedRevision, role, sources })).plant;
  },
  async setRolePrimary(hass: HomeAssistantLike, plantId: string, expectedRevision: number, role: string, primaryEntityId: string | null): Promise<PlantRecord> {
    return (await send<{ plant: PlantRecord }>(hass, { type: "smart_plants/roles/set_primary", plant_id: plantId, expected_revision: expectedRevision, role, primary_entity_id: primaryEntityId })).plant;
  },
  async setRoleAggregation(hass: HomeAssistantLike, plantId: string, expectedRevision: number, role: string, aggregation: string): Promise<PlantRecord> {
    return (await send<{ plant: PlantRecord }>(hass, { type: "smart_plants/roles/set_aggregation", plant_id: plantId, expected_revision: expectedRevision, role, aggregation })).plant;
  },
  async setRoleStaleAfter(hass: HomeAssistantLike, plantId: string, expectedRevision: number, role: string, staleAfterSeconds: number): Promise<PlantRecord> {
    return (await send<{ plant: PlantRecord }>(hass, { type: "smart_plants/roles/set_stale_after", plant_id: plantId, expected_revision: expectedRevision, role, stale_after_seconds: staleAfterSeconds })).plant;
  },

  // Status, readings and last watering for every plant in one call. Malformed
  // entries are dropped so the overview never renders guessed values.
  async overview(hass: HomeAssistantLike): Promise<PlantOverview[]> {
    const result = await send<{ plants?: unknown }>(hass, { type: "smart_plants/plants/overview" });
    if (!Array.isArray(result?.plants)) throw new ApiError("invalid_response", "Invalid plant overview response.");
    return result.plants.map(parseOverview).filter((entry): entry is PlantOverview => entry !== null);
  },

  async list(hass: HomeAssistantLike): Promise<PlantRecord[]> {
    const result = await send<{ plants: PlantRecord[] }>(hass, {
      type: "smart_plants/plants/list",
    });
    return result.plants;
  },

  async create(
    hass: HomeAssistantLike,
    input: CreatePlantInput,
  ): Promise<PlantRecord> {
    const result = await send<{ plant: PlantRecord }>(hass, {
      type: "smart_plants/plants/create",
      ...input,
    });
    return result.plant;
  },

  async update(
    hass: HomeAssistantLike,
    input: UpdatePlantInput,
  ): Promise<PlantRecord> {
    const result = await send<{ plant: PlantRecord }>(hass, {
      type: "smart_plants/plants/update",
      ...input,
    });
    return result.plant;
  },

  async disable(
    hass: HomeAssistantLike,
    plantId: string,
    expectedRevision: number,
  ): Promise<PlantRecord> {
    const result = await send<{ plant: PlantRecord }>(hass, {
      type: "smart_plants/plants/disable",
      plant_id: plantId,
      expected_revision: expectedRevision,
    });
    return result.plant;
  },

  async reenable(
    hass: HomeAssistantLike,
    plantId: string,
    expectedRevision: number,
  ): Promise<PlantRecord> {
    const result = await send<{ plant: PlantRecord }>(hass, {
      type: "smart_plants/plants/reenable",
      plant_id: plantId,
      expected_revision: expectedRevision,
    });
    return result.plant;
  },

  async setArea(
    hass: HomeAssistantLike,
    plantId: string,
    expectedRevision: number,
    areaId: string | null,
  ): Promise<PlantRecord> {
    const result = await send<{ plant: PlantRecord }>(hass, {
      type: "smart_plants/plants/set_area",
      plant_id: plantId,
      expected_revision: expectedRevision,
      area_id: areaId,
    });
    return result.plant;
  },

  async delete(
    hass: HomeAssistantLike,
    plantId: string,
    expectedRevision: number,
  ): Promise<void> {
    await send<Record<string, never>>(hass, {
      type: "smart_plants/plants/delete",
      plant_id: plantId,
      expected_revision: expectedRevision,
    });
  },

  async fetchImage(
    hass: HomeAssistantLike,
    plantId: string,
    signal?: AbortSignal,
  ): Promise<Blob> {
    const url = `/api/smart_plants/plants/${encodeURIComponent(plantId)}/image`;
    const headers: Record<string, string> = {};
    if (hass.auth?.accessToken) {
      headers["Authorization"] = `Bearer ${hass.auth.accessToken}`;
    }
    let response: Response;
    const init: RequestInit = {
        method: "GET",
        headers,
        credentials: "same-origin",
    };
    if (signal) {
      init.signal = signal;
    }
    try {
      response = await fetch(url, init);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      throw new ApiError("unknown_error", "Image request failed. Retry when connected.");
    }
    if (!response.ok) {
      throw new ApiError("unknown_error", `HTTP ${response.status}`);
    }
    const blob = await response.blob();
    if (blob.type !== "image/webp" || blob.size === 0) throw new ApiError("invalid_response", "The image response is incompatible. Refresh and retry.");
    return blob;
  },

  async uploadImage(
    hass: HomeAssistantLike,
    plantId: string,
    expectedRevision: number,
    file: File,
  ): Promise<PlantRecord> {
    const url = `/api/smart_plants/plants/${encodeURIComponent(
      plantId,
    )}/image?expected_revision=${expectedRevision}`;
    return sendHttp<PlantRecord>(hass, url, {
      method: "POST",
      plantId,
      body: file,
      contentType: file.type,
    });
  },

  async deleteImage(
    hass: HomeAssistantLike,
    plantId: string,
    expectedRevision: number,
  ): Promise<PlantRecord> {
    const url = `/api/smart_plants/plants/${encodeURIComponent(
      plantId,
    )}/image?expected_revision=${expectedRevision}`;
    return sendHttp<PlantRecord>(hass, url, { method: "DELETE", plantId });
  },
};

// Real registries carry entries written by older or third-party integrations
// (numeric unique IDs, legacy identifier tuples). Skip entries the panel cannot
// use rather than refusing every sensor and area because of one of them; only
// a response that is not a list at all fails closed.
function registryList<T>(value: unknown, valid: (entry: Record<string, unknown>) => boolean): T[] {
  if (!Array.isArray(value)) {
    throw new ApiError("invalid_response", "Home Assistant registry/state response is incompatible. Reload and retry.");
  }
  return value.filter(v => typeof v === "object" && v !== null && !Array.isArray(v) && valid(v as Record<string, unknown>)) as T[];
}

interface HttpArgs {
  method: "POST" | "DELETE";
  plantId: string;
  body?: BodyInit;
  contentType?: string;
}

async function sendHttp<T>(
  hass: HomeAssistantLike,
  url: string,
  args: HttpArgs,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (args.contentType) {
    headers["Content-Type"] = args.contentType;
  }
  // HA hands the panel an ``auth`` object with ``accessToken`` on the
  // frontend since 2022; fall back to same-origin cookie auth when
  // absent (tests / older shells).
  if (hass.auth?.accessToken) {
    headers["Authorization"] = `Bearer ${hass.auth.accessToken}`;
  }
  const init: RequestInit = {
    method: args.method,
    headers,
    credentials: "same-origin",
  };
  if (args.body !== undefined) {
    init.body = args.body;
  }
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError("unknown_error", "Image request failed. Retry when connected.");
  }
  const rawText = await response.text();
  let parsed: unknown = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }
  }
  if (!response.ok) {
    const err = parsed as { error?: { code?: string; message?: string } } | null;
    const code = err?.error?.code ?? "unknown_error";
    throw new ApiError(typeof code === "string" ? code : "unknown_error", "Image request failed. Use a valid JPEG, PNG or WebP up to 5 MiB and 2048 × 2048 pixels.");
  }
  const body = parsed as { plant?: T } | null;
  if (!body || !validPlant(body.plant) || (body.plant as PlantRecord).id !== args.plantId) {
    throw new ApiError("invalid_response", "The image response is incompatible. Refresh before retrying.");
  }
  return body.plant as T;
}
