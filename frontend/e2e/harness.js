// Synthetic public HA surface only. The sole application import is the packaged
// production ESM artifact, never Vite source or component implementations.
const copy = value => structuredClone(value);
const now = "2026-09-13T12:00:00Z";
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const attribution = "OpenPlantBook (https://open.plantbook.io/)";
const snapshot = {
  provider: "openplantbook", provider_id: "aloe vera", provider_ref: "aloe vera",
  fetched_at: now, locale: "en", source_status: "provider", attribution,
  common_name: "Aloe vera", latin_name: "Aloe vera", category: "Succulent",
  confidence: null, care_text: { watering: "Allow soil to dry between watering." },
  field_sources: Object.fromEntries(["common_name", "latin_name", "category", "watering", "moisture_min", "moisture_max"].map(k => [k, attribution])),
  threshold_defaults: { moisture: { min: 20, max: 60 } },
};
const defaults = (provider = false) => Object.fromEntries(Object.entries({ min: 15, target: 35, max: 55 }).map(([k, value]) => {
  const imported = provider && snapshot.threshold_defaults.moisture[k];
  return [k, { value: imported || value, source: imported ? "provider" : "builtin", provider: imported ? "openplantbook" : null, provider_ref: imported ? "aloe vera" : null }];
}));
const moisture = () => ({ sources: [], primary_entity_id: null, aggregation: "primary", stale_after_seconds: 21600, threshold_defaults: defaults(), threshold_overrides: { min: null, target: null, max: null } });
// Stored plants mirror backend storage: only roles.moisture until another role
// is configured. Responses go through view(), mirroring PlantRecord.as_view(),
// which fills each unconfigured source role with its registered default. These
// defaults are a copy of tests/fixtures/plant_view_role_defaults.json (asserted
// against the backend in pytest and against this copy in panel.spec.ts).
const roleDefaults = {"temperature":{"sources":[],"primary_entity_id":null,"aggregation":"average","stale_after_seconds":21600,"stress_threshold_overrides":{"cold_threshold_celsius":null,"cold_clear_celsius":null,"hot_threshold_celsius":null,"hot_clear_celsius":null}},"humidity":{"sources":[],"primary_entity_id":null,"aggregation":"average","stale_after_seconds":21600,"stress_threshold_overrides":{"dry_threshold_percent":null,"dry_clear_percent":null,"damp_threshold_percent":null,"damp_clear_percent":null}},"illuminance":{"sources":[],"primary_entity_id":null,"aggregation":"primary","stale_after_seconds":21600,"stress_threshold_overrides":{"target_lux":null,"clear_lux":null}},"battery":{"sources":[],"primary_entity_id":null,"aggregation":"min","stale_after_seconds":21600,"stress_threshold_overrides":{"threshold_percent":null,"clear_percent":null}},"conductivity":{"sources":[],"primary_entity_id":null,"aggregation":"primary","stale_after_seconds":21600,"stress_threshold_overrides":{"low_threshold_micro_siemens_per_cm":null,"low_clear_micro_siemens_per_cm":null,"high_threshold_micro_siemens_per_cm":null,"high_clear_micro_siemens_per_cm":null}},"soil_temperature":{"sources":[],"primary_entity_id":null,"aggregation":"primary","stale_after_seconds":21600,"stress_threshold_overrides":{"cold_threshold_celsius":null,"cold_clear_celsius":null,"hot_threshold_celsius":null,"hot_clear_celsius":null}},"co2":{"sources":[],"primary_entity_id":null,"aggregation":"average","stale_after_seconds":21600,"stress_threshold_overrides":{"threshold_ppm":null,"clear_ppm":null}}};
const roleConfig = (p, role) => copy(p.roles[role] ?? roleDefaults[role]);
const view = p => ({ ...copy(p), roles: { ...copy(roleDefaults), ...copy(p.roles) } });
const viewResult = result => {
  if (!result || typeof result !== "object") return result;
  if (result.plant) return { ...result, plant: view(result.plant) };
  if (Array.isArray(result.plants)) return { ...result, plants: result.plants.map(view) };
  return result;
};
const plant = (n, name, changes = {}) => ({ id: uuid(n), revision: 1, name, created_at: now, lifecycle_state: "active", acquired_at: null, species: null, placement: null, tags: [], category: null, image: null, care_events: [], roles: { moisture: moisture() }, ...changes });
const entity = (n, id) => ({ id: uuid(n), entity_id: id, device_id: null, unique_id: `synthetic-${n}`, platform: "mock" });
const sensor = (id, value, attributes) => ({ entity_id: id, state: value, attributes, last_updated: now });
const unavailable = { computed_percent: null, health_score: null, needs_water: null, too_wet: null, sensor_stale: false, computed_available: false, reasons: ["No valid primary moisture source."] };
const state = {
  plants: [], messages: [], requests: [], unexpected: [],
  areas: [{ area_id: "office", name: "Office" }, { area_id: "garden", name: "Garden" }],
  entities: [entity(101, "sensor.soil"), entity(102, "sensor.backup"), entity(103, "sensor.metadata_free"), entity(104, "sensor.living_temp")],
  devices: [],
  states: [sensor("sensor.soil", "12", { friendly_name: "Soil probe", unit_of_measurement: "%", device_class: "moisture" }), sensor("sensor.backup", "unavailable", { friendly_name: "Backup probe", unit_of_measurement: "%", device_class: "moisture" }), sensor("sensor.metadata_free", "42", { friendly_name: "Metadata-free probe" }), sensor("sensor.living_temp", "21.5", { friendly_name: "Living room temperature", unit_of_measurement: "°C", device_class: "temperature" })],
  evaluations: {}, health: {}, failures: {}, malformed: {}, providerAvailable: true,
  conflictNext: false, loseCreateResponse: false, imageFailure: null,
  blobsCreated: [], blobsRevoked: [], imageSerial: 0,
  holdNext: {}, pending: {}, roleDefaults: copy(roleDefaults),
};
// Deliberately allow an already-admitted response to arrive after disconnect or
// abort, exercising the production component's generation checks as well.
async function hold(key, response) {
  if (state.holdNext[key]) {
    delete state.holdNext[key];
    await new Promise(resolve => { state.pending[key] = resolve; });
  }
  return response;
}
state.release = key => { const resolve = state.pending[key]; delete state.pending[key]; resolve?.(); };
const listeners = new Map();
state.emit = event => { for (const callback of listeners.get(event) ?? []) callback({ event_type: event }); };
const listen = (event, cb) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(cb); };
const find = id => state.plants.find(p => p.id === id);
const revise = (p, changes) => { Object.assign(p, copy(changes), { revision: p.revision + 1 }); return copy(p); };
const deviceFor = (p, area = null) => ({ id: `device-${p.id}`, area_id: area, identifiers: [["smart_plants", p.id]], name_by_user: null });
state.seed = () => {
  state.plants = [
    plant(1, "Office Aloe", { category: "Succulent", tags: ["sunny", "office"], species: { provider: "openplantbook", snapshot: copy(snapshot) }, placement: { mode: "indoor", exposure: "partial_sun", rain_exposure: "none", container: true } }),
    plant(2, "Garden Fern", { category: "Fern", tags: ["shade"], placement: { mode: "outdoor", exposure: "shade", rain_exposure: "full", container: false } }),
    plant(3, "Resting Cactus", { lifecycle_state: "disabled", category: "Succulent", tags: ["sunny"] }),
  ];
  state.plants[0].roles.moisture = { ...moisture(), sources: [{ entity_id: "sensor.soil", registry_id: uuid(101) }], primary_entity_id: "sensor.soil", threshold_defaults: defaults(true) };
  state.plants[1].roles.moisture.sources = [{ entity_id: "sensor.removed", registry_id: uuid(199) }];
  state.devices = state.plants.map((p, i) => deviceFor(p, i === 0 ? "office" : "garden"));
  state.evaluations[uuid(1)] = { computed_percent: 12, health_score: 30, needs_water: true, too_wet: false, sensor_stale: false, computed_available: true, reasons: ["Primary moisture is below the minimum."] };
  state.evaluations[uuid(2)] = { ...unavailable, sensor_stale: true, reasons: ["Assigned registered source is missing."] };
};
// Register the seven Phase 7 stress binaries against one dedicated diagnostics
// plant. Attribute keys mirror the backend diagnostics attributes so the panel
// resolves effective thresholds without a live evaluator. Opt-in for a11y-only
// specs; leaves existing tests undisturbed.
state.seedDiagnostics = () => {
  const diag = plant(50, "Diagnostics Plant", { category: "Test", placement: { mode: "indoor", exposure: "partial_sun", rain_exposure: "none", container: true } });
  state.plants.push(diag);
  state.devices.push(deviceFor(diag, "office"));
  state.evaluations[diag.id] = { ...unavailable, reasons: ["No moisture source is assigned for this plant."] };
  // Synthetic composite: temperature + humidity currently included; a couple
  // more configured-but-unavailable roles to exercise the split list.
  // Battery is not a composite contributor (device health); it is absent from
  // contributors/configured. illuminance is configured-but-unavailable here.
  state.health[diag.id] = { health_score: 78, available: true, confidence: 2 / 3, confidence_label: "medium", contributors: ["temperature", "humidity"], configured: ["temperature", "humidity", "illuminance"], reasons: [] };
  const binaries = [
    ["temperature_stress", "off", { cold_threshold_celsius: 10.0, cold_clear_celsius: 12.0, hot_clear_celsius: 32.0, hot_threshold_celsius: 35.0, reason: "Temperature within normal range." }],
    ["humidity_stress", "off", { dry_threshold_percent: 25.0, dry_clear_percent: 30.0, damp_clear_percent: 80.0, damp_threshold_percent: 85.0, reason: "Humidity within normal range." }],
    ["soil_temperature_stress", "off", { cold_threshold_celsius: 10.0, cold_clear_celsius: 12.0, hot_clear_celsius: 32.0, hot_threshold_celsius: 35.0, reason: "Soil temperature within normal range." }],
    ["co2_stress", "off", { threshold_ppm: 5000, clear_ppm: 4000, reason: "CO2 within normal range." }],
    ["low_light", "off", { target_lux: 500.0, clear_lux: 700.0, reason: "Daytime illuminance above target." }],
    ["low_battery", "off", { threshold_percent: 20, clear_percent: 25, reason: "Battery above low threshold." }],
    ["conductivity_stress", "off", { low_threshold_micro_siemens_per_cm: 350.0, low_clear_micro_siemens_per_cm: 500.0, high_clear_micro_siemens_per_cm: 1800.0, high_threshold_micro_siemens_per_cm: 2000.0, reason: "Conductivity within normal range." }],
  ];
  binaries.forEach(([role, value, attrs], i) => {
    const eid = `binary_sensor.diagnostics_${role}`;
    state.entities.push({ id: uuid(700 + i), entity_id: eid, device_id: `device-${diag.id}`, unique_id: `smart_plants:${diag.id}:${role}`, platform: "smart_plants" });
    state.states.push({ entity_id: eid, state: value, attributes: { friendly_name: `Diagnostics ${role}`, ...attrs }, last_updated: now });
  });
};
const params = new URLSearchParams(location.search);
if (params.has("seed") || params.has("diagnostics")) state.seed();
if (params.has("diagnostics")) state.seedDiagnostics();
const drafts = new Map();
const previews = new Map();
function preview(message) {
  const token = `preview-${previews.size + 1}`;
  const result = { preview_token: token, provider: "openplantbook", operation: message.type.endsWith("refresh_preview") ? "refresh" : "select", snapshot: copy(snapshot), diff: { common_name: { before: find(message.plant_id)?.species?.snapshot.common_name ?? null, after: snapshot.common_name } }, ...(message.draft_id ? { draft_id: message.draft_id, revision: 0 } : {}) };
  previews.set(token, { ...result, plant_id: message.plant_id, revision: find(message.plant_id)?.revision });
  return result;
}
function reject(code) { throw { code, message: "PRIVATE_SENTINEL: upstream details must never render" }; }
const connection = {
  addEventListener: listen,
  removeEventListener(event, cb) { listeners.get(event)?.delete(cb); },
  async subscribeEvents(cb, event) { listen(event, cb); return () => listeners.get(event)?.delete(cb); },
  async sendMessagePromise(message) {
    state.messages.push(copy(message));
    if (state.failures[message.type]) reject(state.failures[message.type]);
    if (Object.hasOwn(state.malformed, message.type)) return copy(state.malformed[message.type]);
    return viewResult(await respond(message));
  },
};
// Storage-shaped responses; sendMessagePromise applies the PlantView defaults.
async function respond(message) {
  const p = find(message.plant_id);
  if (p && message.expected_revision !== undefined) {
    if (state.conflictNext) { state.conflictNext = false; revise(p, { name: "Remote renamed plant", category: "Remote category" }); }
    if (message.expected_revision !== p.revision) reject("revision_conflict");
  }
  switch (message.type) {
    case "smart_plants/panel/info": return { api_version: 1, schema_version: 1, providers: [{ provider: "manual", available: true, search_supported: false }, { provider: "openplantbook", available: state.providerAvailable, search_supported: true }] };
    case "smart_plants/plants/list": return { plants: copy(state.plants) };
    case "config/area_registry/list": return copy(state.areas);
    case "config/entity_registry/list": return copy(state.entities);
    case "config/device_registry/list": return copy(state.devices);
    case "get_states": return copy(state.states);
    case "search/related": return { automation: ["automation.plant_reminder"] };
    case "smart_plants/moisture/evaluation": return { evaluation: copy(p?.lifecycle_state === "disabled" ? unavailable : state.evaluations[message.plant_id] ?? unavailable) };
    case "smart_plants/plants/health": {
      const composite = state.health[message.plant_id];
      if (composite) return { evaluation: copy(composite) };
      return { evaluation: { health_score: null, available: false, confidence: 0.0, confidence_label: "unknown", contributors: [], configured: [], reasons: ["no_contributors"] } };
    }
    case "smart_plants/care/list": {
      if (!p) reject("not_found");
      const events = copy(p.care_events).sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at) || a.id.localeCompare(b.id));
      const waterings = events.filter(e => e.kind === "watering");
      return { revision: p.revision, events, summary: { watering_count: waterings.length, last_watered_at: waterings[0]?.occurred_at ?? null, last_watered_local_date: waterings[0]?.local_date ?? null } };
    }
    case "smart_plants/care/add_watering":
    case "smart_plants/care/add": {
      if (!p || !message.occurred_at || Date.parse(message.occurred_at) > Date.now()) reject("invalid_format");
      const kind = message.type.endsWith("add_watering") ? "watering" : message.kind;
      const payload = message.type.endsWith("add_watering") ? { note: message.note } : message.payload;
      const event = { schema_version: 1, id: uuid(900 + p.care_events.length), kind, provenance: "manual", occurred_at: message.occurred_at, local_date: message.occurred_at.slice(0, 10), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), payload };
      p.care_events.push(event);
      const updated = revise(p, {});
      const waterings = p.care_events.filter(e => e.kind === "watering").sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at) || a.id.localeCompare(b.id));
      return { plant: updated, event: copy(event), summary: { watering_count: waterings.length, last_watered_at: waterings[0]?.occurred_at ?? null, last_watered_local_date: waterings[0]?.local_date ?? null } };
    }
    case "smart_plants/care/edit": {
      const index = p.care_events.findIndex(e => e.id === message.event_id);
      if (index < 0) reject("not_found");
      const original = p.care_events[index];
      p.care_events[index] = { ...original, kind: message.kind, occurred_at: message.occurred_at, local_date: message.occurred_at.slice(0, 10), updated_at: new Date().toISOString(), payload: copy(message.payload) };
      const updated = revise(p, {});
      const waterings = p.care_events.filter(e => e.kind === "watering").sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at) || a.id.localeCompare(b.id));
      return { plant: updated, event: copy(p.care_events[index]), summary: { watering_count: waterings.length, last_watered_at: waterings[0]?.occurred_at ?? null, last_watered_local_date: waterings[0]?.local_date ?? null } };
    }
    case "smart_plants/care/delete": {
      const index = p.care_events.findIndex(e => e.id === message.event_id);
      if (index < 0) reject("not_found");
      p.care_events.splice(index, 1);
      const updated = revise(p, {});
      const waterings = p.care_events.filter(e => e.kind === "watering").sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at) || a.id.localeCompare(b.id));
      return { plant: updated, summary: { watering_count: waterings.length, last_watered_at: waterings[0]?.occurred_at ?? null, last_watered_local_date: waterings[0]?.local_date ?? null } };
    }
    case "smart_plants/wizard/start": {
      const draft = { draft_id: uuid(500 + drafts.size), draft_token: "d".repeat(43), revision: 0, expires_in: 600 };
      drafts.set(draft.draft_id, { ...draft, plant: null }); return copy(draft);
    }
    case "smart_plants/species/search": return { results: [{ provider: "openplantbook", provider_ref: "aloe vera", common_name: "Aloe vera", latin_name: "Aloe vera", category: "Succulent", attribution }] };
    case "smart_plants/species/preview":
    case "smart_plants/species/refresh_preview":
    case "smart_plants/wizard/preview": return hold(message.type, preview(message));
    case "smart_plants/wizard/create": {
      const draft = drafts.get(message.draft_id);
      if (!draft || draft.draft_token !== message.draft_token || message.confirmed !== true || message.expected_revision !== 0) reject("invalid_format");
      if (draft.plant) return { plant: copy(find(draft.plant)) };
      const accepted = message.accepted_preview && previews.get(message.accepted_preview.preview_token);
      if (message.accepted_preview && (!accepted || accepted.draft_id !== draft.draft_id)) reject("invalid_format");
      const created = plant(1000 + drafts.size, message.name, Object.fromEntries(["acquired_at", "placement", "tags", "category"].filter(k => Object.hasOwn(message, k)).map(k => [k, copy(message[k])])));
      created.species = accepted ? { provider: accepted.provider, snapshot: copy(accepted.snapshot) } : copy(message.species ?? null);
      created.roles.moisture = { ...copy(message.moisture), threshold_defaults: defaults(!!accepted) };
      state.plants.push(created); state.devices.push(deviceFor(created, message.area_id ?? null)); draft.plant = created.id;
      if (state.loseCreateResponse) { state.loseCreateResponse = false; reject("unknown_error"); }
      return hold(message.type, { plant: copy(created) });
    }
    case "smart_plants/plants/update": return { plant: revise(p, Object.fromEntries(["name", "acquired_at", "placement", "category", "tags", "species"].filter(k => Object.hasOwn(message, k)).map(k => [k, message[k]]))) };
    case "smart_plants/plants/set_area": state.devices.find(d => d.identifiers[0][1] === p.id).area_id = message.area_id; return { plant: revise(p, {}) };
    case "smart_plants/moisture/configure": {
      if (message.moisture.sources.some(s => {
        if (!s.registry_id) return false;
        const entry = state.entities.find(e => e.id === s.registry_id);
        // An existing UUID must match its current entity ID. Only an EXACT
        // preexisting missing pair can be retained, never a changed/new pair
        // or a substitute registry entry that reused the old entity ID.
        return entry ? entry.entity_id !== s.entity_id : !p.roles.moisture.sources.some(old => old.registry_id === s.registry_id && old.entity_id === s.entity_id);
      })) reject("invalid_format");
      return { plant: revise(p, { roles: { ...p.roles, moisture: { ...copy(message.moisture), threshold_defaults: copy(p.roles.moisture.threshold_defaults) } } }) };
    }
    case "smart_plants/species/apply": {
      const accepted = previews.get(message.preview_token);
      if (!accepted || accepted.plant_id !== p.id || accepted.revision !== p.revision || accepted.operation !== message.operation || message.confirmed !== true) reject("invalid_format");
      return { plant: revise(p, { species: { provider: accepted.provider, snapshot: accepted.snapshot }, roles: { ...p.roles, moisture: { ...p.roles.moisture, threshold_defaults: defaults(true) } } }) };
    }
    case "smart_plants/roles/set_sources": {
      const role = roleConfig(p, message.role);
      const primary = message.sources.some(s => s.entity_id === role.primary_entity_id) ? role.primary_entity_id : null;
      return { plant: revise(p, { roles: { ...p.roles, [message.role]: { ...role, sources: copy(message.sources), primary_entity_id: primary } } }) };
    }
    case "smart_plants/roles/set_primary": {
      const role = roleConfig(p, message.role);
      if (message.primary_entity_id !== null && !role.sources.some(s => s.entity_id === message.primary_entity_id)) reject("invalid_format");
      return { plant: revise(p, { roles: { ...p.roles, [message.role]: { ...role, primary_entity_id: message.primary_entity_id } } }) };
    }
    case "smart_plants/roles/set_aggregation": {
      const role = roleConfig(p, message.role);
      return { plant: revise(p, { roles: { ...p.roles, [message.role]: { ...role, aggregation: message.aggregation } } }) };
    }
    case "smart_plants/roles/set_stale_after": {
      const role = roleConfig(p, message.role);
      return { plant: revise(p, { roles: { ...p.roles, [message.role]: { ...role, stale_after_seconds: message.stale_after_seconds } } }) };
    }
    case "smart_plants/plants/disable": return { plant: revise(p, { lifecycle_state: "disabled" }) };
    case "smart_plants/plants/reenable": return { plant: revise(p, { lifecycle_state: "active" }) };
    case "smart_plants/plants/delete": state.plants = state.plants.filter(v => v.id !== p.id); state.devices = state.devices.filter(d => d.identifiers[0][1] !== p.id); return {};
    default: state.unexpected.push(message.type); throw new Error(`Unexpected WS command: ${message.type}`);
  }
}
// Decodable WebP bytes generated locally, never fake text/PNG labelled as WebP.
const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 120;
const ctx = canvas.getContext("2d"); ctx.fillStyle = "#eff5ed"; ctx.fillRect(0, 0, 160, 120); ctx.fillStyle = "#3b6b43"; ctx.beginPath(); ctx.ellipse(80, 50, 22, 40, .4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#925c38"; ctx.fillRect(60, 80, 40, 30);
const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp"));
const createURL = URL.createObjectURL.bind(URL), revokeURL = URL.revokeObjectURL.bind(URL);
URL.createObjectURL = blob => { const url = createURL(blob); state.blobsCreated.push(url); return url; };
URL.revokeObjectURL = url => { state.blobsRevoked.push(url); revokeURL(url); };
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url, location.href);
  if (url.origin !== location.origin || !/^\/api\/smart_plants\/plants\/[^/]+\/image$/.test(url.pathname)) { state.unexpected.push(url.href); throw new Error("Unmocked HTTP blocked"); }
  const headers = new Headers(init.headers), method = init.method ?? "GET";
  state.requests.push({ method, path: `${url.pathname}${url.search}`, authorization: headers.get("Authorization"), contentType: headers.get("Content-Type"), bytes: init.body?.size ?? 0 });
  if (headers.get("Authorization") !== "Bearer playwright-token") return Response.json({ error: { code: "unauthorized" } }, { status: 401 });
  const p = find(decodeURIComponent(url.pathname.split("/")[4]));
  if (state.imageFailure) return Response.json({ error: { code: state.imageFailure, message: "PRIVATE_SENTINEL" } }, { status: 400 });
  if (method === "GET") return hold("image/GET", new Response(imageBlob, { headers: { "Content-Type": "image/webp" } }));
  if (Number(url.searchParams.get("expected_revision")) !== p.revision) return Response.json({ error: { code: "revision_conflict" } }, { status: 409 });
  if (method === "POST") revise(p, { image: { id: uuid(800 + ++state.imageSerial), content_type: "image/webp", width: 160, height: 120, created_at: now } });
  else if (method === "DELETE") revise(p, { image: null });
  else { state.unexpected.push(method); throw new Error("Unmocked image method"); }
  return hold(`image/${method}`, Response.json({ plant: view(p) }));
};
window.__smartPlantsHarness = state;
// HA supplies these components in production. The fixture keeps their public
// slots, menu selection event, and toolbar sizing for isolated artifact tests.
if (!customElements.get("ha-top-app-bar-fixed")) {
  customElements.define("ha-top-app-bar-fixed", class extends HTMLElement {
    constructor() {
      super(); this.attachShadow({ mode: "open" }).innerHTML = `<style>:host{display:block;position:relative;height:100vh;overflow:hidden}.top-app-bar{position:absolute;top:0;left:0;right:0;z-index:4;box-sizing:border-box;width:100%;height:var(--header-height,56px);display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:var(--app-header-background-color,#fff);color:var(--app-header-text-color,#212121);border-bottom:1px solid var(--divider-color,#ddd)}.title{display:flex;align-items:center;min-width:0;flex:1}.title h1{font-size:20px;font-weight:400;line-height:56px;margin:0;padding-inline-start:24px}.actions{display:flex;align-items:center;gap:8px}.content{position:absolute;top:var(--header-height,56px);left:0;right:0;bottom:0;overflow:auto}</style><header class="top-app-bar"><div class="title"><slot name="title"></slot></div><div class="actions"><slot name="actionItems"></slot></div></header><div class="content"><slot></slot></div>`;
  }
  });
}
if (!customElements.get("ha-dropdown")) {
  customElements.define("ha-dropdown", class extends HTMLElement {
    constructor() {
      super(); this.attachShadow({ mode: "open" }).innerHTML = `<style>:host{position:relative}.menu[hidden]{display:none}.menu{position:absolute;right:0;top:48px;z-index:5;min-width:180px;background:white;box-shadow:0 2px 8px #0003;border-radius:8px}</style><slot name="trigger"></slot><div class="menu" role="menu" hidden><slot></slot></div>`;
      this.shadowRoot.addEventListener("keydown", (event) => { if (event.key === "Escape") this.closeMenu(); });
    }
    toggleMenu() { const menu = this.shadowRoot.querySelector(".menu"); menu.hidden = !menu.hidden; }
    openMenu() { this.shadowRoot.querySelector(".menu").hidden = false; }
    closeMenu() { this.shadowRoot.querySelector(".menu").hidden = true; }
  });
}
if (!customElements.get("ha-icon-button")) {
  customElements.define("ha-icon-button", class extends HTMLElement {
    set label(value) { this._label = value; this.render(); }
    get label() { return this._label; }
    set path(value) { this._path = value; }
    connectedCallback() { this.render(); }
    constructor() { super(); this.attachShadow({ mode: "open" }); }
    render() {
      if (!this.shadowRoot) return;
      this.shadowRoot.innerHTML = `<button type="button" aria-label="${this._label ?? "Menu"}" style="width:44px;height:44px;border:0;border-radius:50%;background:transparent;cursor:pointer"><svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg></button><style>button:focus-visible{outline:3px solid #03a9f4;outline-offset:2px}</style>`;
      this.shadowRoot.querySelector("button").addEventListener("click", () => this.closest("ha-dropdown")?.toggleMenu());
    }
  });
}
if (!customElements.get("ha-dropdown-item")) {
  customElements.define("ha-dropdown-item", class extends HTMLElement {
    static get observedAttributes() { return ["disabled"]; }
    set disabled(value) { this.toggleAttribute("disabled", Boolean(value)); this.render(); }
    get disabled() { return this.hasAttribute("disabled"); }
    set value(value) { this.setAttribute("value", value); }
    get value() { return this.getAttribute("value"); }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }
    constructor() { super(); this.attachShadow({ mode: "open" }); }
    render() {
      if (!this.shadowRoot) return;
      this.shadowRoot.innerHTML = `<button role="menuitem" type="button" ${this.disabled ? "disabled" : ""} style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px;border:0;background:transparent;text-align:left"><slot></slot></button>`;
      this.shadowRoot.querySelector("button").addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("wa-select", { bubbles: true, composed: true, detail: { item: this } }));
        this.closest("ha-dropdown")?.closeMenu();
      });
    }
  });
}
if (!customElements.get("ha-svg-icon")) customElements.define("ha-svg-icon", class extends HTMLElement {});
await import("/custom_components/smart_plants/frontend/smart-plants-panel.js");
const panel = document.createElement("smart-plants-panel");
// `?lang=de` renders the panel as a Home Assistant user with that profile language.
const language = params.get("lang") ?? "en";
document.documentElement.lang = language;
panel.hass = { auth: { accessToken: "playwright-token" }, connection, language, locale: { language, number_format: "language", time_format: "language", date_format: "language" }, user: { is_admin: true, name: "Synthetic browser admin" } };
panel.panel = { title: "Smart Plants", url_path: "smart-plants" };
document.body.append(panel);
