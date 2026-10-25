// Validate untrusted wire data before it can enter reactive state. Optional role
// editors have their own fail-closed validator; future roles remain opaque.
export const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 500): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const nullableText = (v: unknown, max = 500) => v === null || text(v, max);
const integer = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const timestamp = (v: unknown) => text(v, 64) && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
// The backend stores acquired_at as a full timestamp, but older or API-written
// records may still carry a calendar date such as "2024-03-01".
const acquiredAt = (v: unknown) => v === null || timestamp(v) || (typeof v === "string" && /^\d{4}-\d\d-\d\d$/.test(v) && Number.isFinite(Date.parse(v)));
const map = (v: unknown, valid: (v: unknown) => boolean) => object(v) && Object.keys(v).length <= 32 && Object.entries(v).every(([k, value]) => text(k, 60) && valid(value));
// Species temperatures and common names are optional: snapshots the panel builds
// itself (manual species) omit them, and absent, null or empty mean "unknown".
const temperature = (v: unknown) => v === undefined || v === null || (typeof v === "number" && Number.isFinite(v) && v >= -100 && v <= 100);
const commonNames = (v: unknown) => v === undefined || (object(v) && Object.entries(v).every(([lang, names]) => (lang === "en" || lang === "de") && Array.isArray(names) &&
  names.length > 0 && names.length <= 5 && new Set(names).size === names.length && names.every(name => text(name, 100) && name === name.trim())));
const snapshotFields: Record<string, (v: unknown) => boolean> = {
  provider: v => text(v, 60), provider_id: v => nullableText(v, 200), provider_ref: v => nullableText(v, 200),
  fetched_at: timestamp, locale: v => typeof v === "string" && /^(und|[a-z]{2}(?:-[A-Z]{2})?)$/.test(v), source_status: v => v === "manual" || v === "provider",
  attribution: v => text(v), common_name: nullableText, latin_name: nullableText, category: nullableText,
  confidence: v => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1),
  care_text: v => map(v, value => text(value, 4000)), field_sources: v => map(v, text),
  threshold_defaults: v => map(v, values => map(values, value => typeof value === "number" && Number.isSafeInteger(value))),
  min_temperature: temperature, max_temperature: temperature,
  survival_min_temperature: v => temperature(v) && (v === undefined || v === null || Number.isSafeInteger(v)), common_names: commonNames,
};
function snapshot(v: unknown): boolean {
  if (!object(v) || !Object.keys(v).every(key => Object.hasOwn(snapshotFields, key)) || !Object.entries(snapshotFields).every(([key, valid]) => valid(v[key]))) return false;
  const populated = ["common_name", "latin_name", "category", "confidence", "min_temperature", "max_temperature", "survival_min_temperature"].filter(key => v[key] !== null && v[key] !== undefined);
  if (v.common_names !== undefined && Object.keys(v.common_names as object).length > 0) populated.push("common_names");
  populated.push(...Object.keys(v.care_text as object), ...Object.entries(v.threshold_defaults as Record<string, Record<string, number>>).flatMap(([role, values]) => Object.keys(values).map(key => `${role}_${key}`)));
  const sources = v.field_sources as Record<string, string>;
  return new TextEncoder().encode(JSON.stringify(v)).length <= 32768 && new Set(populated).size === Object.keys(sources).length && populated.every(key => sources[key] === v.attribution) &&
    (v.source_status !== "manual" || (v.provider === "manual" && v.provider_ref === null)) &&
    (v.source_status !== "provider" || (v.provider !== "manual" && text(v.provider_ref, 200)));
}
export function validPlant(v: unknown): boolean {
  if (!object(v)) return false;
  const p = v.placement; const s = v.species; const i = v.image;
  return text(v.id, 200) && integer(v.revision, 1, Number.MAX_SAFE_INTEGER) && text(v.name, 200) && timestamp(v.created_at) &&
    acquiredAt(v.acquired_at) && ["active", "disabled"].includes(String(v.lifecycle_state)) &&
    nullableText(v.category, 60) && Array.isArray(v.tags) && v.tags.length <= 32 && v.tags.every(t => text(t, 60)) && new Set(v.tags).size === v.tags.length &&
    (p === null || (object(p) && text(p.mode, 60) && nullableText(p.exposure, 60) && nullableText(p.rain_exposure, 60) && (p.container === null || typeof p.container === "boolean"))) &&
    (s === null || (object(s) && snapshot(s.snapshot) && object(s.snapshot) && s.provider === s.snapshot.provider)) &&
    (i === null || (object(i) && text(i.id, 200) && i.content_type === "image/webp" && integer(i.width, 1, 2048) && integer(i.height, 1, 2048) && timestamp(i.created_at))) &&
    (v.care_events === undefined || (Array.isArray(v.care_events) && v.care_events.length <= 256 && v.care_events.every(validCareEvent))) &&
    (v.care_tasks === undefined || validCareTasks(v.care_tasks)) &&
    (v.rest_period === undefined || v.rest_period === null || monthRange(v.rest_period, ["start_month", "end_month"])) &&
    (v.snoozed_until === undefined || v.snoozed_until === null || timestamp(v.snoozed_until));
}
const TASK_ID = /^[0-9a-f]{32}$/;
const isoDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d\d-\d\d$/.test(v) && Number.isFinite(Date.parse(v));
const exactKeys = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const monthRange = (v: unknown, keys: string[]) => object(v) && exactKeys(v, keys) && integer(v.start_month, 1, 12) && integer(v.end_month, 1, 12);
const trimmed = (v: unknown, max: number) => text(v, max) && v === v.trim();
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
// Plant roles a reading task can follow; battery is device health, not care.
const READING_ROLES = ["temperature", "humidity", "moisture", "illuminance", "conductivity", "soil_temperature", "co2"];
function validReadingSource(v: unknown): boolean {
  if (!object(v)) return false;
  if (exactKeys(v, ["role"])) return READING_ROLES.includes(String(v.role));
  if (exactKeys(v, ["forecast"])) {
    const f = v.forecast;
    return object(f) && exactKeys(f, ["entity_id", "reading", "hours"]) && typeof f.entity_id === "string" && /^weather\.[a-z0-9_]+$/.test(f.entity_id) &&
      (f.reading === "low" || f.reading === "high") && (f.hours === 24 || f.hours === 48 || f.hours === 72);
  }
  return exactKeys(v, ["entity_id"]) && typeof v.entity_id === "string" && /^sensor\.[a-z0-9_]+$/.test(v.entity_id);
}
// A forecast already looks ahead, so it never waits, and its unit is a temperature.
const forecastSchedule = (v: Record<string, unknown>) => !(object(v.source) && Object.hasOwn(v.source, "forecast")) || (v.for_minutes === 0 && ["°C", "°F", "K"].includes(String(v.unit)));
function validSchedule(v: unknown): boolean {
  if (!object(v)) return false;
  if (v.kind === "yearly") return monthRange(v, ["kind", "start_month", "end_month"]);
  if (v.kind === "reading") {
    return exactKeys(v, ["kind", "source", "condition", "value", "unit", "for_minutes", "reset_value"]) && validReadingSource(v.source) &&
      (v.condition === "below" || v.condition === "above") && finite(v.value) && (v.unit === null || text(v.unit, 32)) && integer(v.for_minutes, 0, 4320) && forecastSchedule(v) &&
      (v.reset_value === null || (finite(v.reset_value) && (v.condition === "below" ? v.reset_value >= v.value : v.reset_value <= v.value)));
  }
  return v.kind === "interval" && exactKeys(v, ["kind", "every", "unit", "growing_season_only"]) && integer(v.every, 1, 999) &&
    ["days", "weeks", "months", "years"].includes(String(v.unit)) && typeof v.growing_season_only === "boolean";
}
export function validCareTask(v: unknown): boolean {
  return object(v) && exactKeys(v, ["id", "type", "name", "schedule", "instructions", "baseline_done_on", "last_done_at", "last_skipped_on", "created_on"]) &&
    typeof v.id === "string" && TASK_ID.test(v.id) && ["fertilize", "prune", "repot", "pests", "winter_protection", "custom"].includes(String(v.type)) &&
    (v.name === null ? v.type !== "custom" : trimmed(v.name, 60)) && validSchedule(v.schedule) &&
    (v.instructions === null || trimmed(v.instructions, 4000)) && (v.baseline_done_on === null || isoDate(v.baseline_done_on)) &&
    (v.last_done_at === null || (timestamp(v.last_done_at) && String(v.last_done_at).endsWith("Z"))) &&
    (v.last_skipped_on === null || isoDate(v.last_skipped_on)) && isoDate(v.created_on);
}
function validCareTasks(v: unknown): boolean {
  if (!Array.isArray(v) || v.length > 20 || !v.every(validCareTask)) return false;
  const tasks = v as Record<string, unknown>[];
  const typed = tasks.map(task => task.type).filter(type => type !== "custom");
  return new Set(tasks.map(task => task.id)).size === tasks.length && new Set(typed).size === typed.length;
}
// One malformed plant must not blank the whole panel: skip it with a console
// warning and keep the rest of the inventory.
export function validPlantList(plants: unknown[]): unknown[] {
  return plants.filter((plant, index) => {
    if (validPlant(plant)) return true;
    const id = object(plant) && typeof plant.id === "string" ? plant.id.slice(0, 200) : `#${index}`;
    console.warn(`Smart Plants: skipping malformed plant record ${id}`);
    return false;
  });
}
export function validCareEvent(v: unknown): boolean {
  if (!object(v) || v.schema_version !== 2 || !text(v.id, 36) || !["watering", "fertilizing", "pruning", "repotting", "note", "task"].includes(String(v.kind)) ||
    !["manual", "action", "automation"].includes(String(v.provenance)) || !(v.task_id === null || (typeof v.task_id === "string" && TASK_ID.test(v.task_id))) ||
    !timestamp(v.occurred_at) || !/(?:Z|[+-]\d\d:\d\d)$/.test(String(v.occurred_at)) ||
    typeof v.local_date !== "string" || !/^\d{4}-\d\d-\d\d$/.test(v.local_date) || v.local_date !== String(v.occurred_at).slice(0, 10) ||
    !timestamp(v.created_at) || !timestamp(v.updated_at) || !object(v.payload)) return false;
  const p = v.payload;
  const note = (value: unknown) => value === null || (text(value, 500) && value === value.trim());
  if (v.kind === "watering" || v.kind === "task") return Object.keys(p).length === 1 && Object.hasOwn(p, "note") && note(p.note);
  if (v.kind === "fertilizing") return Object.keys(p).length === 4 && (p.product === null || (text(p.product, 120) && p.product === p.product.trim())) &&
    (p.amount === null || (typeof p.amount === "number" && Number.isFinite(p.amount) && p.amount > 0 && p.amount <= 100000)) &&
    ((p.amount === null && p.unit === null) || (p.amount !== null && ["g", "mL"].includes(String(p.unit)))) && note(p.note);
  if (v.kind === "pruning") return Object.keys(p).length === 2 && (p.part === null || (text(p.part, 120) && p.part === p.part.trim())) && note(p.note);
  if (v.kind === "repotting") return Object.keys(p).length === 3 &&
    (p.container === null || (text(p.container, 120) && p.container === p.container.trim())) &&
    (p.medium === null || (text(p.medium, 120) && p.medium === p.medium.trim())) && note(p.note);
  return Object.keys(p).length === 1 && text(p.text, 1000) && p.text === p.text.trim();
}
function compareCareEvents(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const parts = (value: string): [number, number] => {
    const fractional = value.match(/\.(\d{1,6})(?=Z|[+-]\d\d:\d\d$)/)?.[1] ?? "";
    const micros = Number(fractional.padEnd(6, "0"));
    const wholeSeconds = value.replace(/\.\d{1,6}(?=Z|[+-]\d\d:\d\d$)/, "");
    return [Date.parse(wholeSeconds) + Math.floor(micros / 1000), micros % 1000];
  };
  const left = parts(String(a.occurred_at)); const right = parts(String(b.occurred_at));
  return right[0] - left[0] || right[1] - left[1] || (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0);
}
function validCareHistory(v: unknown): boolean {
  if (!object(v) || !integer(v.revision, 1, Number.MAX_SAFE_INTEGER) || !Array.isArray(v.events) || v.events.length > 256 || !v.events.every(validCareEvent) || !object(v.summary)) return false;
  const events = v.events as Record<string, unknown>[];
  const summary = v.summary;
  const watering = events.filter(e => e.kind === "watering");
  return new Set(events.map(e => e.id)).size === events.length && summary.watering_count === watering.length &&
     events.every((event, index) => index === 0 || compareCareEvents(events[index - 1]!, event) <= 0) &&
    summary.last_watered_at === (watering[0]?.occurred_at ?? null) && summary.last_watered_local_date === (watering[0]?.local_date ?? null);
}
// Compares JSON values regardless of object key order.
function sameJson(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => sameJson(item, b[index]));
  if (object(a) || object(b)) return object(a) && object(b) && exactKeys(a, Object.keys(b)) && Object.keys(a).every(key => sameJson(a[key], b[key]));
  return a === b;
}
// The backend trims task text and stores blank text as null.
const storedText = (v: unknown) => typeof v === "string" ? v.trim() || null : v;
const TASK_FIELDS = ["name", "schedule", "instructions", "baseline_done_on"] as const;
function taskFieldsMatch(task: Record<string, unknown>, msg: Record<string, unknown>): boolean {
  return TASK_FIELDS.every(field => !Object.hasOwn(msg, field) ||
    sameJson(task[field], field === "name" || field === "instructions" ? storedText(msg[field]) : msg[field]));
}
// Care task and rest period replies carry the whole plant one revision later;
// each reply must show the requested change on the requested plant and task.
function careTaskResponse(command: string, msg: Record<string, unknown>, v: Record<string, unknown>): boolean {
  const extra: Record<string, string[]> = { create: ["task_id"], complete: ["event_id"], skip: ["previous_skipped_on"] };
  const name = command.slice(command.lastIndexOf("/") + 1);
  if (!exactKeys(v, ["plant", ...(command.startsWith("smart_plants/care_tasks/") ? extra[name] ?? [] : [])])) return false;
  if (!validPlant(v.plant) || !object(v.plant) || v.plant.id !== msg.plant_id || v.plant.revision !== Number(msg.expected_revision) + 1) return false;
  const plant = v.plant;
  if (command === "smart_plants/plants/set_rest_period") return sameJson(plant.rest_period, msg.rest_period);
  if (!Array.isArray(plant.care_tasks)) return false;
  const taskId = command === "smart_plants/care_tasks/create" ? v.task_id : msg.task_id;
  const task = (plant.care_tasks as Record<string, unknown>[]).find(item => item.id === taskId);
  switch (name) {
    case "create": return typeof v.task_id === "string" && TASK_ID.test(v.task_id) && task !== undefined && task.type === msg.task_type && taskFieldsMatch(task, msg);
    case "update": return task !== undefined && taskFieldsMatch(task, msg);
    case "delete": return task === undefined;
    case "complete": {
      if (task === undefined || !text(v.event_id, 36) || !Array.isArray(plant.care_events)) return false;
      const event = (plant.care_events as Record<string, unknown>[]).find(item => item.id === v.event_id);
      return event !== undefined && event.task_id === msg.task_id && object(event.payload) && event.payload.note === (msg.note ?? null) &&
        (msg.occurred_at === undefined || event.occurred_at === msg.occurred_at);
    }
    case "skip": return task !== undefined && isoDate(task.last_skipped_on) && (v.previous_skipped_on === null || isoDate(v.previous_skipped_on));
    case "undo_skip": return task !== undefined && task.last_skipped_on === msg.previous_skipped_on;
  }
  return false;
}
const CARE_TASK_COMMANDS = new Set(["create", "update", "delete", "complete", "skip", "undo_skip"].map(name => `smart_plants/care_tasks/${name}`));
function preview(v: unknown, msg: Record<string, unknown>): boolean {
  if (!object(v) || !text(v.preview_token, 200) || !snapshot(v.snapshot) || !object(v.snapshot) || v.provider !== v.snapshot.provider ||
      !object(v.diff) || !Object.entries(v.diff).every(([key, value]) => object(value) && Object.hasOwn(snapshotFields, key) &&
        (value.before === null || snapshotFields[key]!(value.before)) && snapshotFields[key]!(value.after))) return false;
  if (msg.provider !== undefined && (v.provider !== msg.provider || v.snapshot.provider_ref !== msg.provider_ref)) return false;
  return v.operation === (msg.type === "smart_plants/species/refresh_preview" ? "refresh" : "select") &&
    (msg.type !== "smart_plants/wizard/preview" || (v.draft_id === msg.draft_id && v.revision === 0));
}
export function validState(v: unknown): boolean {
  return object(v) && text(v.entity_id, 255) && typeof v.state === "string" && timestamp(v.last_updated) && object(v.attributes) &&
    ["friendly_name", "unit_of_measurement", "device_class"].every(key => v.attributes && object(v.attributes) && (v.attributes[key] === undefined || v.attributes[key] === null || typeof v.attributes[key] === "string"));
}
const _HEALTH_LABELS = new Set(["high", "medium", "low", "unknown"]);
function healthEvaluation(v: unknown): boolean {
  if (!object(v) || typeof v.available !== "boolean" || typeof v.confidence !== "number" || !Number.isFinite(v.confidence) || v.confidence < 0 || v.confidence > 1) return false;
  if (typeof v.confidence_label !== "string" || !_HEALTH_LABELS.has(v.confidence_label)) return false;
  if (!Array.isArray(v.contributors) || !v.contributors.every(r => text(r, 60))) return false;
  if (!Array.isArray(v.configured) || !v.configured.every(r => text(r, 60))) return false;
  if (!Array.isArray(v.reasons) || !v.reasons.every(r => text(r, 4000))) return false;
  return v.available ? integer(v.health_score, 0, 100) : v.health_score === null;
}
function evaluation(v: unknown): boolean {
  if (!object(v) || typeof v.computed_available !== "boolean" || typeof v.sensor_stale !== "boolean" || !Array.isArray(v.reasons) || !v.reasons.every(r => text(r, 4000))) return false;
  return v.computed_available ? typeof v.computed_percent === "number" && Number.isFinite(v.computed_percent) && v.computed_percent >= 0 && v.computed_percent <= 100 &&
    integer(v.health_score, 0, 100) && typeof v.needs_water === "boolean" && typeof v.too_wet === "boolean" :
    v.computed_percent === null && v.health_score === null && v.needs_water === null && v.too_wet === null;
}
export function validResponse(msg: Record<string, unknown>, v: unknown): boolean {
  const command = String(msg.type);
  if (!command.startsWith("smart_plants/") || command === "smart_plants/panel/info") return true;
  if (!object(v)) return false;
  if (command === "smart_plants/wizard/start") return typeof v.draft_id === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v.draft_id) && typeof v.draft_token === "string" && /^[A-Za-z0-9_-]{43}$/.test(v.draft_token) && v.revision === 0 && integer(v.expires_in, 1, 600);
  if (command.endsWith("/preview") || command.endsWith("/refresh_preview")) return preview(v, msg);
  if (command === "smart_plants/species/search") return Array.isArray(v.results) && v.results.length <= 50 && v.results.every(r => object(r) && r.provider === msg.provider && text(r.provider_ref, 100) && text(r.latin_name) && nullableText(r.common_name) && nullableText(r.category) && text(r.attribution));
  if (command === "smart_plants/moisture/evaluation") return evaluation(v.evaluation);
  if (command === "smart_plants/plants/health") return healthEvaluation(v.evaluation);
  if (command === "smart_plants/care/list") return validCareHistory(v);
  if (["smart_plants/care/add_watering", "smart_plants/care/add", "smart_plants/care/edit"].includes(command)) {
    if (!validPlant(v.plant) || !object(v.plant) || v.plant.id !== msg.plant_id || !validCareEvent(v.event) || !object(v.event) || !Array.isArray(v.plant.care_events)) return false;
    const events = v.plant.care_events as Record<string, unknown>[];
    const returned = v.event as Record<string, unknown>;
    if (!events.some(event => event.id === returned.id && JSON.stringify(event) === JSON.stringify(returned))) return false;
    const expectedKind = command === "smart_plants/care/add_watering" ? "watering" : msg.kind;
    const expectedPayload = command === "smart_plants/care/add_watering" ? { note: msg.note } : msg.payload;
    if (returned.kind !== expectedKind || returned.occurred_at !== msg.occurred_at ||
        JSON.stringify(returned.payload) !== JSON.stringify(expectedPayload) ||
        (command === "smart_plants/care/edit" && returned.id !== msg.event_id) ||
        v.plant.revision !== Number(msg.expected_revision) + 1) return false;
    return validCareHistory({ revision: v.plant.revision, events: [...events].sort(compareCareEvents), summary: v.summary });
  }
  if (CARE_TASK_COMMANDS.has(command) || command === "smart_plants/plants/set_rest_period") return careTaskResponse(command, msg, v);
  if (command === "smart_plants/care/delete") {
    if (!validPlant(v.plant) || !object(v.plant) || v.plant.id !== msg.plant_id || !Array.isArray(v.plant.care_events)) return false;
    return v.plant.revision === Number(msg.expected_revision) + 1 &&
      !v.plant.care_events.some(event => object(event) && event.id === msg.event_id) &&
      validCareHistory({ revision: v.plant.revision, events: [...v.plant.care_events].sort((a, b) => compareCareEvents(a as Record<string, unknown>, b as Record<string, unknown>)), summary: v.summary });
  }
  if (command === "smart_plants/plants/list") {
    // Individual malformed records are dropped by validPlantList; the list
    // itself and the identities of the records it keeps stay strict.
    if (!Array.isArray(v.plants)) return false;
    const kept = v.plants.filter(validPlant) as Record<string, unknown>[];
    return new Set(kept.map(p => p.id)).size === kept.length;
  }
  if (command === "smart_plants/roles/list") return Array.isArray(v.roles) && v.roles.every(r => object(r) && text(r.role) && text(r.source_domain) && Array.isArray(r.aggregations) && r.aggregations.every(a => text(a)) && Array.isArray(r.thresholds) && r.thresholds.every(t => object(t) && text(t.key) && text(t.entity_role) && text(t.translation_key)) && Array.isArray(r.entities) && r.entities.every(e => object(e) && text(e.role) && text(e.platform) && text(e.translation_key)));
  if (command === "smart_plants/plants/delete") return Object.keys(v).length === 0;
  // The reply carries the snooze end the backend stored, in UTC; asking for the
  // current end again leaves the revision unchanged.
  if (command === "smart_plants/plants/snooze") {
    if (!validPlant(v.plant) || !object(v.plant) || v.plant.id !== msg.plant_id) return false;
    const until = v.plant.snoozed_until;
    return msg.until === null ? until === null || until === undefined : typeof until === "string" && Math.floor(Date.parse(String(msg.until)) / 1000) === Math.floor(Date.parse(until) / 1000);
  }
  // Entries are validated one by one when parsed; malformed entries are dropped.
  if (command === "smart_plants/plants/overview") return Array.isArray(v.plants) && v.plants.every(object) && new Set(v.plants.map(p => (p as Record<string, unknown>).plant_id)).size === v.plants.length;
  // A created plant reports every role it was created with. A replayed request
  // returns the plant as it is now, so only the roles' presence is checked.
  if (command === "smart_plants/wizard/create") {
    if (!validPlant(v.plant) || !object(v.plant)) return false;
    const roles = v.plant.roles;
    return msg.roles === undefined || (object(msg.roles) && object(roles) && Object.keys(msg.roles).every(role => object(roles[role])));
  }
  return validPlant(v.plant) && object(v.plant) && (msg.plant_id === undefined || v.plant.id === msg.plant_id);
}
