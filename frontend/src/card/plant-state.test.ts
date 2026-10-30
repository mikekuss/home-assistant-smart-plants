import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/plant_status_cases.json";
import { deriveStatus, plantDevices, plantEntities, plantView } from "./plant-state.js";
import type { PlantView, StatusInput } from "./plant-state.js";
import { DEVICE, PLANT_ID, cardHass } from "./card-test-helpers.js";

interface Case { name: string; entities: StatusInput; status: string; problems: unknown[]; card?: { status: string; problems: unknown[] } }
const cases = (fixture as unknown as { cases: Case[] }).cases;

describe("status cases shared with plant_status.py", () => {
  it.each(cases.map(c => [c.name, c] as const))("%s", (_name, c) => {
    const expected = c.card ?? { status: c.status, problems: c.problems };
    expect(deriveStatus(c.entities)).toEqual(expected);
  });
  it("covers every status", () => {
    expect(new Set(cases.map(c => c.status))).toEqual(new Set(["healthy", "needs_water", "too_wet", "problem", "stale", "no_sensors", "paused"]));
  });
});

const view = (hass = cardHass()): PlantView => {
  const result = plantView(hass, DEVICE);
  if (result.kind !== "plant") throw new Error("plant missing");
  return result;
};

describe("plant entities", () => {
  it("finds only the plant's own Smart Plants entities", () => {
    const entities = plantEntities(cardHass(), DEVICE);
    expect(entities.get("sensor.moisture")).toBe("sensor.office_aloe_soil_moisture");
    expect(entities.get("binary_sensor.low_light")).toBe("binary_sensor.office_aloe_low_light");
    expect([...entities.values()]).not.toContain("sensor.mock_unrelated");
  });
  it("lists plant devices only", () => {
    expect(plantDevices(cardHass()).map(d => d.id)).toEqual([DEVICE]);
  });
});

describe("plant view", () => {
  it("builds the overview from entity states", () => {
    const plant = view();
    expect(plant).toMatchObject({ plantId: PLANT_ID, name: "Office Aloe", area: "Office", species: "Aloe vera", careDue: false, lastWatered: "2026-09-11T12:00:00+00:00", moreInfoEntity: "sensor.office_aloe_soil_moisture" });
    expect(plant.overview.status).toBe("needs_water");
    expect(plant.overview.roles.moisture).toMatchObject({ value: 12, state: "low", range: { min: 20, target: 40, max: 60 }, clear: { min: 22, max: 58 } });
    expect(plant.overview.roles.temperature).toMatchObject({ value: 21.5, unit: "°C", state: "ok", range: { min: 10, max: 28 }, clear: { min: 11, max: 27 } });
    expect(plant.overview.roles.illuminance).toMatchObject({ value: 1120, range: { min: 500, max: null } });
    expect(Object.keys(plant.overview.roles)).toEqual(["moisture", "temperature", "illuminance", "battery"]);
  });
  it("marks the reading that is out of range", () => {
    const hass = cardHass({
      "binary_sensor.office_aloe_needs_water": { entity_id: "binary_sensor.office_aloe_needs_water", state: "off", attributes: { last_watered: null } },
      "sensor.office_aloe_temperature": { entity_id: "sensor.office_aloe_temperature", state: "29.5", attributes: { unit_of_measurement: "°C" } },
      "binary_sensor.office_aloe_temperature_stress": { entity_id: "binary_sensor.office_aloe_temperature_stress", state: "on", attributes: { reason: "hot_stress", cold_threshold_celsius: 10, hot_threshold_celsius: 28 } },
    });
    const plant = view(hass);
    expect(plant.overview.status).toBe("problem");
    expect(plant.overview.roles.temperature?.state).toBe("high");
    expect(plant.overview.roles.moisture?.state).toBe("ok");
    expect(plant.lastWatered).toBeNull();
  });
  it("reads care due, the snooze and a missing last watering", () => {
    const hass = cardHass({
      "binary_sensor.office_aloe_care_due": { entity_id: "binary_sensor.office_aloe_care_due", state: "on", attributes: {} },
      "binary_sensor.office_aloe_sensor_stale": { entity_id: "binary_sensor.office_aloe_sensor_stale", state: "off", attributes: { snoozed: true, snoozed_until: "2026-11-01T23:59:59+00:00" } },
      "binary_sensor.office_aloe_needs_water": { entity_id: "binary_sensor.office_aloe_needs_water", state: "unavailable", attributes: {} },
      "sensor.office_aloe_soil_moisture": { entity_id: "sensor.office_aloe_soil_moisture", state: "unavailable", attributes: {} },
    });
    const plant = view(hass);
    expect(plant.careDue).toBe(true);
    expect(plant.overview.snoozed_until).toBe("2026-11-01T23:59:59+00:00");
    expect(plant.lastWatered).toBeUndefined();
    expect(plant.overview.status).toBe("no_sensors");
    expect(plant.overview.roles.moisture).toBeUndefined();
    expect(plant.moreInfoEntity).toBe("sensor.office_aloe_temperature");
  });
  it("shows a paused plant without readings", () => {
    const hass = cardHass();
    for (const id of Object.keys(hass.states)) if (id.startsWith("sensor.office") || id.startsWith("binary_sensor.office")) hass.states[id] = { entity_id: id, state: "unavailable", attributes: {} };
    const plant = view(hass);
    expect(plant.overview.status).toBe("paused");
    expect(plant.overview.roles).toEqual({});
    expect(plant.careDue).toBe(false);
  });
  it("reports a removed plant", () => {
    const hass = cardHass();
    delete hass.devices![DEVICE];
    expect(plantView(hass, DEVICE)).toEqual({ kind: "missing" });
    expect(plantView(hass, "device-other")).toEqual({ kind: "missing" });
  });
  it("leaves out the default device model", () => {
    const hass = cardHass();
    hass.devices![DEVICE] = { ...hass.devices![DEVICE]!, model: "Plant", name_by_user: "Desk Aloe", area_id: null };
    expect(view(hass)).toMatchObject({ species: null, name: "Desk Aloe", area: null });
  });
});
