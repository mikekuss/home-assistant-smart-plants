import { render } from "lit";
import { describe, expect, it } from "vitest";
import { snapshotView } from "./editors.js";
import { createLocalizer } from "./localize.js";
import type { PlantRecord, SpeciesSnapshot } from "./types.js";

function snapshot(changes: Partial<SpeciesSnapshot> = {}): SpeciesSnapshot {
  return { provider: "openplantbook", provider_id: "aloe vera", provider_ref: "aloe vera", fetched_at: "2026-10-01T00:00:00Z", locale: "en", source_status: "provider", attribution: "OpenPlantBook", common_name: "Aloe", latin_name: "Aloe vera", category: null, confidence: null, care_text: {}, field_sources: {}, threshold_defaults: { moisture: { min: 15, max: 55 } }, min_temperature: null, max_temperature: null, ...changes };
}
function ranges(value: SpeciesSnapshot): string | null {
  const host = document.createElement("div");
  render(snapshotView(createLocalizer(), value), host);
  return host.querySelector(".snapshot-ranges")?.textContent ?? null;
}

describe("species ranges in the species preview", () => {
  it("lists the temperature and air humidity ranges that become thresholds", () => {
    const text = ranges(snapshot({ min_temperature: 8, max_temperature: 32, threshold_defaults: { moisture: { min: 15, max: 55 }, humidity: { min: 40, max: 80 } } }));
    expect(text).toContain("Imported problem ranges");
    expect(text).toContain("Temperature 8–32 °C");
    expect(text).toContain("Air humidity 40–80 %");
  });

  it("marks a missing edge and leaves the line out without ranges", () => {
    expect(ranges(snapshot({ threshold_defaults: { humidity: { max: 70 } } }))).toContain("Air humidity —–70 %");
    expect(ranges(snapshot())).toBeNull();
  });
});

describe("species ranges a plant can't take", () => {
  const notes = (value: SpeciesSnapshot, plant: PlantRecord | null | undefined): string[] => {
    const host = document.createElement("div");
    render(snapshotView(createLocalizer(), value, undefined, plant), host);
    return [...host.querySelectorAll(".snapshot-not-applied")].map(p => p.textContent ?? "");
  };
  const plant = (temperature: Record<string, number | null>): PlantRecord => ({ id: "p", revision: 1, name: "Aloe", created_at: "2026-01-01T00:00:00Z", lifecycle_state: "active", acquired_at: null, species: null, placement: null, tags: [], category: null, image: null,
    roles: { moisture: {} as never, temperature: { stress_threshold_overrides: { cold_threshold_celsius: null, cold_clear_celsius: null, hot_clear_celsius: null, hot_threshold_celsius: null, ...temperature } } } });
  const ranged = snapshot({ min_temperature: 15, max_temperature: 30, threshold_defaults: { moisture: { min: 15, max: 55 }, humidity: { min: 40, max: 80 } } });

  it("says nothing when the ranges fit", () => {
    expect(notes(ranged, plant({}))).toEqual([]);
    expect(notes(ranged, null)).toEqual([]);
  });

  it("says when the plant's own values don't fit a range", () => {
    // Cold clears at 16 °C by the species, above a hot clear the user set at 14 °C.
    expect(notes(ranged, plant({ hot_clear_celsius: 14 }))).toEqual([expect.stringContaining("The temperature range isn't used")]);
  });

  it("says when a range is too narrow on its own", () => {
    const narrow = snapshot({ min_temperature: 20, max_temperature: 22 });
    expect(notes(narrow, null)).toEqual([expect.stringContaining("The temperature range isn't used")]);
  });

  it("lists no ranges for a manual species, which supplies none", () => {
    const manual = snapshot({ provider: "manual", provider_ref: null, source_status: "manual", min_temperature: 12, max_temperature: 23 });
    expect(ranges(manual)).toBeNull();
    expect(notes(manual, plant({ hot_clear_celsius: 5 }))).toEqual([]);
  });
});
