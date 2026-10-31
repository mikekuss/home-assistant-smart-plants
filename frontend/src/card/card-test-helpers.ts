// Synthetic Home Assistant data for the dashboard card tests.
import type { CardHass } from "./plant-card.js";
import type { CardState } from "./plant-state.js";

export const DEVICE = "device-office-aloe";
export const PLANT_ID = "0123456789abcdef0123456789abcdef";

const state = (entity_id: string, value: string, attributes: Record<string, unknown> = {}): CardState => ({ entity_id, state: value, attributes });

// One plant "Office Aloe" in the Office whose soil is dry, with temperature,
// illuminance and battery readings. `overrides` replaces or removes states.
export function cardHass(overrides: Record<string, CardState | null> = {}, options: { admin?: boolean; language?: string } = {}): CardHass & { calls: unknown[][]; ws: Record<string, unknown>[] } {
  const entries: [string, string][] = [
    ["sensor.office_aloe_soil_moisture", "moisture"], ["binary_sensor.office_aloe_needs_water", "needs_water"],
    ["binary_sensor.office_aloe_too_wet", "too_wet"], ["binary_sensor.office_aloe_sensor_stale", "sensor_stale"],
    ["sensor.office_aloe_temperature", "temperature"], ["binary_sensor.office_aloe_temperature_stress", "temperature_stress"],
    ["sensor.office_aloe_illuminance", "illuminance"], ["binary_sensor.office_aloe_low_light", "low_light"],
    ["sensor.office_aloe_battery", "battery"], ["binary_sensor.office_aloe_low_battery", "low_battery"],
    ["binary_sensor.office_aloe_care_due", "care_due"], ["sensor.office_aloe_health_score", "health_score"],
  ];
  const states: Record<string, CardState | undefined> = {
    "sensor.office_aloe_soil_moisture": state("sensor.office_aloe_soil_moisture", "12.0", { unit_of_measurement: "%", min: 20, target: 40, max: 60 }),
    "binary_sensor.office_aloe_needs_water": state("binary_sensor.office_aloe_needs_water", "on", { last_watered: "2026-09-11T12:00:00+00:00", snoozed: false, snoozed_until: null }),
    "binary_sensor.office_aloe_too_wet": state("binary_sensor.office_aloe_too_wet", "off"),
    "binary_sensor.office_aloe_sensor_stale": state("binary_sensor.office_aloe_sensor_stale", "off", { sources: 1, snoozed: false, snoozed_until: null }),
    "sensor.office_aloe_temperature": state("sensor.office_aloe_temperature", "21.5", { unit_of_measurement: "°C" }),
    "binary_sensor.office_aloe_temperature_stress": state("binary_sensor.office_aloe_temperature_stress", "off", { reason: "ok", cold_threshold_celsius: 10, hot_threshold_celsius: 28, cold_clear_celsius: 11, hot_clear_celsius: 27 }),
    "sensor.office_aloe_illuminance": state("sensor.office_aloe_illuminance", "1120", { unit_of_measurement: "lx" }),
    "binary_sensor.office_aloe_low_light": state("binary_sensor.office_aloe_low_light", "off", { reason: "ok", target_lux: 500, clear_lux: 600 }),
    "sensor.office_aloe_battery": state("sensor.office_aloe_battery", "87", { unit_of_measurement: "%" }),
    "binary_sensor.office_aloe_low_battery": state("binary_sensor.office_aloe_low_battery", "off", { reason: "ok", threshold_percent: 15, clear_percent: 20 }),
    "binary_sensor.office_aloe_care_due": state("binary_sensor.office_aloe_care_due", "off", { due_tasks: [] }),
    "sensor.office_aloe_health_score": state("sensor.office_aloe_health_score", "60"),
    "sensor.mock_unrelated": state("sensor.mock_unrelated", "5"),
  };
  for (const [id, value] of Object.entries(overrides)) {
    if (value === null) delete states[id];
    else states[id] = value;
  }
  const calls: unknown[][] = [];
  const ws: Record<string, unknown>[] = [];
  return {
    calls, ws,
    language: options.language ?? "en",
    locale: { language: options.language ?? "en", number_format: "language" },
    user: { is_admin: options.admin ?? false },
    config: { time_zone: "UTC" },
    states,
    entities: {
      ...Object.fromEntries(entries.map(([entity_id, translation_key]) => [entity_id, { entity_id, device_id: DEVICE, platform: "smart_plants", translation_key }])),
      "sensor.mock_unrelated": { entity_id: "sensor.mock_unrelated", device_id: "device-other", platform: "mock", translation_key: null },
    },
    devices: {
      [DEVICE]: { id: DEVICE, name: "Office Aloe", name_by_user: null, area_id: "office", model: "Aloe vera", identifiers: [["smart_plants", PLANT_ID]] },
      "device-other": { id: "device-other", name: "Lamp", area_id: "office", model: null, identifiers: [["mock", "lamp"]] },
    },
    areas: { office: { area_id: "office", name: "Office" } },
    callService: async (...args: unknown[]) => { calls.push(args); return undefined; },
    callWS: async <T>(msg: Record<string, unknown>): Promise<T> => {
      ws.push(msg);
      // Each logged watering becomes event-1, event-2, ... in the care history.
      if (msg.type === "smart_plants/care/list") return { revision: 7, events: calls.map((call, i) => ({ id: `event-${i + 1}`, kind: "watering", occurred_at: String((call[2] as { occurred_at?: string }).occurred_at) })) } as T;
      return {} as T;
    },
    fetchWithAuth: async () => new Response(null, { status: 404 }),
  };
}
