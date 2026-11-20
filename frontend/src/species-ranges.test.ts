import { render } from "lit";
import { describe, expect, it } from "vitest";
import { snapshotView } from "./editors.js";
import { createLocalizer } from "./localize.js";
import type { SpeciesSnapshot } from "./types.js";

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
