// Synthetic Home Assistant dashboard for the packaged card. The only
// application code is the production card loader, which imports the card
// content next to it. Query parameters: `admin`, `lang=de`, `empty` (no card
// on the dashboard), `refuse` (log_care answers Unauthorized).
const params = new URLSearchParams(location.search);
const admin = params.has("admin");
const language = params.get("lang") ?? "en";
document.documentElement.lang = language;

const now = Date.now();
const iso = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "+00:00");
const day = 86_400_000;
const state = (entity_id, value, attributes = {}) => ({ entity_id, state: value, attributes, last_changed: iso(now), last_updated: iso(now) });

const plants = [
  { slug: "office_aloe", device: "device-office-aloe", id: "00000000000040008000000000000001", name: "Office Aloe", area: "office", model: "Aloe vera" },
  { slug: "kitchen_basil", device: "device-kitchen-basil", id: "00000000000040008000000000000002", name: "Kitchen Basil", area: "kitchen", model: "Ocimum basilicum" },
  { slug: "balcony_lavender", device: "device-balcony-lavender", id: "00000000000040008000000000000003", name: "Balcony Lavender", area: "balcony", model: "Plant" },
];
const keys = [["sensor", "moisture"], ["binary_sensor", "needs_water"], ["binary_sensor", "too_wet"], ["binary_sensor", "sensor_stale"], ["sensor", "temperature"],
  ["binary_sensor", "temperature_stress"], ["sensor", "illuminance"], ["binary_sensor", "low_light"], ["sensor", "battery"], ["binary_sensor", "low_battery"], ["binary_sensor", "care_due"]];
const entities = {};
for (const plant of plants) for (const [domain, key] of keys) {
  const entity_id = `${domain}.${plant.slug}_${key}`;
  entities[entity_id] = { entity_id, device_id: plant.device, platform: "smart_plants", translation_key: key };
}
const states = {};
const set = (entity_id, value, attributes) => { states[entity_id] = state(entity_id, value, attributes); };
// Office Aloe: healthy, four readings, watered two days ago.
set("sensor.office_aloe_moisture", "36.0", { unit_of_measurement: "%", min: 15, target: 35, max: 60 });
set("binary_sensor.office_aloe_needs_water", "off", { last_watered: iso(now - 2 * day), snoozed: false, snoozed_until: null });
set("binary_sensor.office_aloe_too_wet", "off", {});
set("binary_sensor.office_aloe_sensor_stale", "off", { snoozed: false, snoozed_until: null });
set("sensor.office_aloe_temperature", "21.5", { unit_of_measurement: "°C" });
set("binary_sensor.office_aloe_temperature_stress", "off", { reason: "ok", cold_threshold_celsius: 10, hot_threshold_celsius: 28 });
set("sensor.office_aloe_illuminance", "1120", { unit_of_measurement: "lx" });
set("binary_sensor.office_aloe_low_light", "off", { reason: "ok", target_lux: 500 });
set("sensor.office_aloe_battery", "87", { unit_of_measurement: "%" });
set("binary_sensor.office_aloe_low_battery", "off", { reason: "ok", threshold_percent: 15 });
// Kitchen Basil: needs water, snoozed, care due.
const snoozed = iso(now + 2 * day);
set("sensor.kitchen_basil_moisture", "12.0", { unit_of_measurement: "%", min: 30, target: 50, max: 70 });
set("binary_sensor.kitchen_basil_needs_water", "on", { last_watered: iso(now - 9 * day), snoozed: true, snoozed_until: snoozed });
set("binary_sensor.kitchen_basil_too_wet", "off", { snoozed: true, snoozed_until: snoozed });
set("binary_sensor.kitchen_basil_sensor_stale", "off", { snoozed: true, snoozed_until: snoozed });
set("sensor.kitchen_basil_temperature", "23", { unit_of_measurement: "°C" });
set("binary_sensor.kitchen_basil_temperature_stress", "off", { reason: "ok", snoozed: true, snoozed_until: snoozed });
set("binary_sensor.kitchen_basil_care_due", "on", { due_tasks: ["Fertilize"], snoozed: true, snoozed_until: snoozed });
// Balcony Lavender: paused, so every entity reads unavailable.
for (const [domain, key] of keys) if (["moisture", "needs_water", "too_wet", "sensor_stale"].includes(key)) set(`${domain}.balcony_lavender_${key}`, "unavailable", {});

const record = window.__cardHarness = { calls: [], ws: [], toasts: [], moreInfo: [], navigations: [] };
const hass = {
  language, locale: { language, number_format: "language", time_format: "language" },
  user: { is_admin: admin, name: admin ? "admin" : "viewer" },
  config: { time_zone: "UTC" },
  states, entities,
  devices: Object.fromEntries(plants.map(p => [p.device, { id: p.device, name: p.name, name_by_user: null, area_id: p.area, model: p.model, identifiers: [["smart_plants", p.id]] }])),
  areas: { office: { area_id: "office", name: "Office" }, kitchen: { area_id: "kitchen", name: "Kitchen" }, balcony: { area_id: "balcony", name: "Balcony" } },
  async callService(domain, service, data, target, notifyOnError) {
    record.calls.push({ domain, service, data, target, notifyOnError });
    if (params.has("refuse")) throw { code: "unauthorized", message: "Unauthorized" };
    const plant = plants.find(p => p.device === target.device_id);
    const sensor = states[`binary_sensor.${plant.slug}_needs_water`];
    states[sensor.entity_id] = { ...sensor, attributes: { ...sensor.attributes, last_watered: data.occurred_at } };
    update();
  },
  async callWS(msg) {
    record.ws.push(msg);
    if (!admin) throw { code: "unauthorized", message: "Unauthorized" };
    if (msg.type === "smart_plants/care/list") return { revision: 4, events: record.calls.filter(c => c.data?.kind === "watering").map((c, i) => ({ id: `event-${i + 1}`, kind: "watering", occurred_at: c.data.occurred_at })) };
    return {};
  },
  async fetchWithAuth() { return new Response(null, { status: 404 }); },
};

const cards = [];
function update() {
  const next = { ...hass, states: { ...hass.states } };
  for (const card of cards) card.hass = next;
}

window.addEventListener("hass-notification", event => {
  const { message, action } = event.detail;
  record.toasts.push(message);
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.append(message);
  if (action) {
    const undo = document.createElement("button");
    undo.type = "button"; undo.textContent = action.text;
    undo.addEventListener("click", () => { toast.remove(); action.action(); });
    toast.append(undo);
  }
  document.getElementById("toasts").append(toast);
});
window.addEventListener("hass-more-info", event => { record.moreInfo.push(event.detail.entityId); });
window.addEventListener("location-changed", () => { record.navigations.push(location.pathname); });

await import("/custom_components/smart_plants/frontend/smart-plants-card.js?v=0.0.0-test");
await customElements.whenDefined("smart-plants-plant-card");
record.picker = window.customCards;
if (!params.has("empty")) {
  for (const plant of plants) {
    const card = document.createElement("smart-plants-plant-card");
    card.setConfig({ type: "custom:smart-plants-plant-card", device_id: plant.device });
    card.hass = hass;
    cards.push(card);
    document.getElementById("section").append(card);
  }
  const removed = document.createElement("smart-plants-plant-card");
  removed.setConfig({ type: "custom:smart-plants-plant-card", device_id: "device-removed" });
  removed.hass = hass;
  cards.push(removed);
  document.getElementById("section").append(removed);
}
record.ready = true;
