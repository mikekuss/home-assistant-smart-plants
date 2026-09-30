import { describe, expect, it } from "vitest";
import { createLocalizer, ENGLISH } from "./localize.js";
import { RANGE_SPECS, chartBand, dryingEstimate, dryingText, historySummary, isHistoryRange, parseStatistics, segments, timeTicks, valueScale, withLiveValue } from "./history-model.js";
import type { HistoryPoint } from "./history-model.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.parse("2026-09-21T00:00:00Z");
const point = (hours: number, mean: number, spread = 0): HistoryPoint => ({ t: T0 + hours * HOUR, mean, min: mean - spread, max: mean + spread });
// Hourly soil moisture falling by `perDay` points per day from `from`.
const drying = (startHour: number, hours: number, from: number, perDay: number) => Array.from({ length: hours }, (_, i) => point(startHour + i, from - (perDay * i) / 24));

describe("history ranges", () => {
  it("uses statistics Home Assistant keeps for the whole range", () => {
    expect(RANGE_SPECS["24h"]).toMatchObject({ period: "5minute", spanMs: DAY });
    expect(RANGE_SPECS["7d"].period).toBe("hour");
    expect(RANGE_SPECS["30d"].period).toBe("hour");
    expect(RANGE_SPECS["1y"]).toMatchObject({ period: "day", periodMs: DAY });
    expect(isHistoryRange("30d")).toBe(true);
    expect(isHistoryRange("2w")).toBe(false);
    expect(isHistoryRange(null)).toBe(false);
  });
});

describe("parseStatistics", () => {
  it("reads periods in time order and places each at its middle", () => {
    const raw = { "sensor.mock_plant_soil_moisture": [
      { start: T0 + HOUR, end: T0 + 2 * HOUR, mean: 41, min: 40, max: 43 },
      { start: T0, end: T0 + HOUR, mean: 42.5, min: 42, max: 44 },
    ] };
    expect(parseStatistics(raw, "sensor.mock_plant_soil_moisture")).toEqual([
      { t: T0 + HOUR / 2, mean: 42.5, min: 42, max: 44 },
      { t: T0 + 1.5 * HOUR, mean: 41, min: 40, max: 43 },
    ]);
  });
  it("skips periods without a mean and tolerates a missing spread", () => {
    const raw = { "sensor.mock": [{ start: T0, end: T0 + HOUR, mean: null, min: null, max: null }, { start: T0 + HOUR, mean: 30 }, "junk", { start: "soon", mean: 1 }] };
    expect(parseStatistics(raw, "sensor.mock")).toEqual([{ t: T0 + HOUR, mean: 30, min: 30, max: 30 }]);
  });
  it("treats an entity without statistics as empty and a foreign shape as invalid", () => {
    expect(parseStatistics({}, "sensor.mock")).toEqual([]);
    expect(parseStatistics({ "sensor.mock": {} }, "sensor.mock")).toBeNull();
    expect(parseStatistics([], "sensor.mock")).toBeNull();
    expect(parseStatistics(null, "sensor.mock")).toBeNull();
  });
});

describe("series", () => {
  it("appends the current reading unless the statistics already reach the present", () => {
    const points = [point(0, 40)];
    expect(withLiveValue(points, 38, T0 + 2 * HOUR).at(-1)).toEqual({ t: T0 + 2 * HOUR, mean: 38, min: 38, max: 38 });
    expect(withLiveValue(points, null, T0 + 2 * HOUR)).toEqual(points);
    expect(withLiveValue(points, 38, T0)).toEqual(points);
    expect(withLiveValue([], 38, T0)).toHaveLength(1);
  });
  it("breaks the line where periods are missing", () => {
    const runs = segments([point(0, 40), point(1, 39), point(2, 38), point(9, 50), point(10, 49)], HOUR);
    expect(runs.map(run => run.length)).toEqual([3, 2]);
    expect(segments([], HOUR)).toEqual([]);
  });
});

describe("valueScale", () => {
  it("includes nearby target limits and stays within 0–100 for percentages", () => {
    const scale = valueScale([point(0, 45), point(1, 66)], [30, 70, null], "%");
    expect(scale.min).toBeLessThanOrEqual(30);
    expect(scale.max).toBeGreaterThanOrEqual(70);
    expect(scale.min).toBeGreaterThanOrEqual(0);
    expect(scale.max).toBeLessThanOrEqual(100);
    expect(scale.ticks.every(tick => tick >= scale.min && tick <= scale.max)).toBe(true);
    expect(valueScale([point(0, 96), point(1, 100)], [], "%").max).toBe(100);
  });
  it("leaves out a limit far from the readings", () => {
    const scale = valueScale([point(0, 520), point(1, 640)], [5000], "ppm");
    expect(scale.max).toBeLessThan(1000);
    expect(scale.ticks.length).toBeGreaterThanOrEqual(3);
  });
  it("gives a flat or empty series a usable axis", () => {
    const flat = valueScale([point(0, 21), point(1, 21)], [], "°C");
    expect(flat.max).toBeGreaterThan(flat.min);
    expect(flat.ticks.length).toBeGreaterThanOrEqual(2);
    const single = valueScale([point(0, 31)], [15, 60], "%");
    expect(single.max - single.min).toBeGreaterThanOrEqual(10);
    expect(valueScale([], [], "%")).toMatchObject({ min: 0, max: 100 });
  });
});

describe("timeTicks", () => {
  it("picks a step that fits the range", () => {
    const end = Date.parse("2026-09-28T12:00:00");
    expect(timeTicks(end - DAY, end, "en").length).toBeGreaterThanOrEqual(4);
    expect(timeTicks(end - DAY, end, "en").length).toBeLessThanOrEqual(5);
    const week = timeTicks(end - 7 * DAY, end, "en");
    expect(week).toHaveLength(7);
    expect(week.at(-1)!.label).toBe("Mon");
    expect(timeTicks(end - 30 * DAY, end, "en").length).toBeGreaterThanOrEqual(4);
    const year = timeTicks(end - 365 * DAY, end, "de");
    expect(year.length).toBeGreaterThanOrEqual(5);
    expect(year.length).toBeLessThanOrEqual(7);
    expect(week.every(tick => tick.t >= end - 7 * DAY && tick.t <= end)).toBe(true);
  });
});

describe("dryingEstimate", () => {
  it("measures the drop after the last logged watering and forecasts the minimum", () => {
    const points = [...drying(0, 48, 40, 4), point(48, 68), ...drying(49, 72, 68, 6)];
    const estimate = dryingEstimate(points, { periodMs: HOUR, wateredAt: T0 + 47.5 * HOUR, min: 30 })!;
    expect(estimate.sinceWatering).toBe(true);
    expect(estimate.ratePerDay).toBeCloseTo(6, 1);
    expect(estimate.daysToMin).toBeCloseTo((points.at(-1)!.mean - 30) / 6, 1);
  });
  it("starts at a detected rise when no watering was logged for it", () => {
    const points = [...drying(0, 48, 40, 4), point(48, 60), ...drying(49, 48, 60, 5)];
    const unlogged = dryingEstimate(points, { periodMs: HOUR, wateredAt: T0 - 10 * DAY, min: 20 })!;
    expect(unlogged.sinceWatering).toBe(false);
    expect(unlogged.ratePerDay).toBeCloseTo(5, 1);
    expect(dryingEstimate(points, { periodMs: HOUR })!.daysToMin).toBeNull();
  });
  it("counts a watering from before the chart when nothing rose since", () => {
    const estimate = dryingEstimate(drying(0, 72, 60, 3), { periodMs: HOUR, wateredAt: T0 - DAY, min: 30 })!;
    expect(estimate.sinceWatering).toBe(true);
    expect(estimate.ratePerDay).toBeCloseTo(3, 1);
  });
  it("gives no estimate for too little data, a level or rising curve, or daily statistics", () => {
    expect(dryingEstimate(drying(0, 8, 60, 6), { periodMs: HOUR })).toBeNull();
    expect(dryingEstimate(drying(0, 48, 50, 0), { periodMs: HOUR })).toBeNull();
    expect(dryingEstimate(drying(0, 48, 50, -2), { periodMs: HOUR })).toBeNull();
    expect(dryingEstimate([...drying(0, 48, 40, 4), point(48, 68), ...drying(49, 6, 68, 6)], { periodMs: HOUR })).toBeNull();
    expect(dryingEstimate(drying(0, 72, 60, 3).filter((_, i) => i % 24 === 0), { periodMs: DAY })).toBeNull();
  });
  it("drops the forecast when the minimum is reached or far away", () => {
    expect(dryingEstimate(drying(0, 48, 28, 2), { periodMs: HOUR, min: 30 })!.daysToMin).toBeNull();
    expect(dryingEstimate(drying(0, 48, 90, 0.5), { periodMs: HOUR, min: 10 })!.daysToMin).toBeNull();
  });
});

describe("history text", () => {
  const de = createLocalizer({ language: "de" });
  it("states the rate and the forecast in whole days", () => {
    expect(dryingText(ENGLISH, { ratePerDay: 5.46, sinceWatering: true, daysToMin: 4.2 }, 30)).toEqual({
      rate: "Dropping about 5.5% per day since the last watering.",
      forecast: "At this rate it reaches the minimum of 30% in about 4 days.",
    });
    expect(dryingText(ENGLISH, { ratePerDay: 8, sinceWatering: false, daysToMin: 1.2 }, 30)).toEqual({
      rate: "Dropping about 8% per day.",
      forecast: "At this rate it reaches the minimum of 30% in about 1 day.",
    });
    expect(dryingText(ENGLISH, { ratePerDay: 8, sinceWatering: false, daysToMin: 0.4 }, 30).forecast).toBe("At this rate it reaches the minimum of 30% in less than a day.");
    expect(dryingText(ENGLISH, { ratePerDay: 8, sinceWatering: false, daysToMin: null }, 30).forecast).toBe("");
    expect(dryingText(de, { ratePerDay: 5.46, sinceWatering: true, daysToMin: 4.2 }, 30)).toEqual({
      rate: "Sinkt seit dem letzten Gießen um etwa 5,5 % pro Tag.",
      forecast: "Bei diesem Tempo ist das Minimum von 30 % in etwa 4 Tagen erreicht.",
    });
  });
  it("summarizes the chart in one sentence", () => {
    expect(historySummary(ENGLISH, "Soil moisture", "7d", [point(0, 62, 1), point(1, 38.04, 0.5), point(2, 41)], "%"))
      .toBe("Soil moisture, last 7 days: from 62% to 41%, lowest 37.5%, highest 63%");
    expect(historySummary(de, "Temperatur", "24h", [], "°C")).toBe("Temperatur, letzte 24 Stunden: keine aufgezeichneten Werte");
  });
  it("draws a band for two bounds and a single limit for battery", () => {
    expect(chartBand("moisture", { min: 30, target: 45, max: 70 })).toEqual({ min: 30, max: 70, target: 45 });
    expect(chartBand("illuminance", { min: 500, max: null })).toEqual({ min: 500, max: null, target: null });
    expect(chartBand("battery", { min: 20, max: 100 })).toEqual({ min: 20, max: null, target: null });
    expect(chartBand("co2", undefined)).toEqual({ min: null, max: null, target: null });
  });
});
