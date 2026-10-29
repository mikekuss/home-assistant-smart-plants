import { describe, expect, it } from "vitest";
import { createLocalizer } from "./localize.js";
import { RELATED_LIMIT, automationDetail, automationRow, capRows, relatedAutomations } from "./related-automations.js";
import type { AutomationRow } from "./related-automations.js";
import type { HAState } from "./types.js";

const en = createLocalizer({ language: "en" });
const de = createLocalizer({ language: "de" });
const now = Date.parse("2026-10-29T12:00:00Z");
const automation = (id: string, state: string, attributes: Record<string, unknown> = {}): HAState => ({ entity_id: `automation.${id}`, state, attributes, last_updated: "2026-10-29T08:00:00+00:00" });
const statesOf = (...list: HAState[]): Record<string, HAState> => Object.fromEntries(list.map(s => [s.entity_id, s]));
const names = (rows: readonly AutomationRow[]) => rows.map(row => row.name);

describe("automationRow", () => {
  it("names the automation by its friendly name and falls back to the entity ID", () => {
    expect(automationRow(automation("water", "on", { friendly_name: "Water reminder" })).name).toBe("Water reminder");
    expect(automationRow(automation("water", "on", { friendly_name: "  " })).name).toBe("automation.water");
    expect(automationRow(automation("water", "on", { friendly_name: 42 })).name).toBe("automation.water");
    expect(automationRow(automation("water", "on")).name).toBe("automation.water");
  });
  it("reads on and off, and any other state as unavailable", () => {
    expect(automationRow(automation("a", "on")).status).toBe("on");
    expect(automationRow(automation("a", "off")).status).toBe("off");
    expect(automationRow(automation("a", "unavailable")).status).toBe("unavailable");
    expect(automationRow(automation("a", "unknown")).status).toBe("unavailable");
  });
  it("opens the automation in the editor by its id and leaves YAML without an id unlinked", () => {
    expect(automationRow(automation("a", "on", { id: "1761000000000" })).editPath).toBe("/config/automation/edit/1761000000000");
    expect(automationRow(automation("a", "on", { id: "water plants/daily" })).editPath).toBe("/config/automation/edit/water%20plants%2Fdaily");
    expect(automationRow(automation("a", "on")).editPath).toBeNull();
    expect(automationRow(automation("a", "on", { id: "" })).editPath).toBeNull();
    expect(automationRow(automation("a", "on", { id: 1761000000000 })).editPath).toBeNull();
  });
  it("keeps the last run only when it is a time", () => {
    expect(automationRow(automation("a", "on", { last_triggered: "2026-10-29T10:00:00.123456+00:00" })).lastTriggered).toBe("2026-10-29T10:00:00.123456+00:00");
    expect(automationRow(automation("a", "on", { last_triggered: null })).lastTriggered).toBeNull();
    expect(automationRow(automation("a", "on", { last_triggered: "yesterday" })).lastTriggered).toBeNull();
    expect(automationRow(automation("a", "on")).lastTriggered).toBeNull();
  });
});

describe("automationDetail", () => {
  const ran = (last: string | null, attributes: Record<string, unknown> = { id: "1" }) => automationRow(automation("a", "on", { ...attributes, last_triggered: last }));
  it("says when the automation last ran or that it never ran", () => {
    expect(automationDetail(en, ran("2026-10-29T10:00:00+00:00"), now)).toBe("Last ran 2 hours ago");
    expect(automationDetail(en, ran("2026-10-28T09:00:00+00:00"), now)).toBe("Last ran yesterday");
    expect(automationDetail(en, ran(null), now)).toBe("Never ran");
    expect(automationDetail(de, ran("2026-10-29T10:00:00+00:00"), now)).toBe("Zuletzt ausgeführt vor 2 Stunden");
    expect(automationDetail(de, ran("2026-10-28T09:00:00+00:00"), now)).toBe("Zuletzt ausgeführt gestern");
    expect(automationDetail(de, ran(null), now)).toBe("Noch nie ausgeführt");
  });
  it("starts with Defined in YAML when the editor can't open the automation", () => {
    expect(automationDetail(en, ran("2026-10-26T12:00:00+00:00", {}), now)).toBe("Defined in YAML · Last ran 3 days ago");
    expect(automationDetail(en, ran(null, {}), now)).toBe("Defined in YAML · Never ran");
    expect(automationDetail(de, ran(null, {}), now)).toBe("In YAML definiert · Noch nie ausgeführt");
  });
  it("reads a run reported ahead of the browser's clock as now", () => {
    expect(automationDetail(en, ran("2026-10-29T12:00:05+00:00"), now)).toBe("Last ran now");
  });
});

describe("relatedAutomations", () => {
  const states = statesOf(
    automation("holiday", "off", { friendly_name: "Holiday watering check", id: "3" }),
    automation("water", "on", { friendly_name: "Water reminder for Aloe", id: "1" }),
    automation("mist", "unavailable", { friendly_name: "Mist on dry air", id: "4" }),
    automation("light", "on", { friendly_name: "grow light on dark days", id: "2" }),
    automation("daily", "on", { friendly_name: "Smart Plants: daily plant report", id: "5" }),
  );
  it("lists automations that are on first, then off and unavailable ones, each by name", () => {
    const { plant } = relatedAutomations(["automation.holiday", "automation.water", "automation.mist", "automation.light"], [], states, "en");
    expect(names(plant)).toEqual(["grow light on dark days", "Water reminder for Aloe", "Holiday watering check", "Mist on dry air"]);
  });
  it("sorts names the way the panel language does", () => {
    const german = statesOf(automation("z", "on", { friendly_name: "Zimmerpflanzen gießen" }), automation("oel", "on", { friendly_name: "Ölbaum düngen" }), automation("obst", "on", { friendly_name: "Obstbaum gießen" }));
    expect(names(relatedAutomations(["automation.z", "automation.oel", "automation.obst"], [], german, "de").plant)).toEqual(["Obstbaum gießen", "Ölbaum düngen", "Zimmerpflanzen gießen"]);
  });
  it("leaves out IDs without a state and lists an automation both searches found only with the plant's own", () => {
    const related = relatedAutomations(["automation.water", "automation.deleted", "automation.water"], ["automation.water", "automation.daily", "automation.gone"], states, "en");
    expect(related.plant.map(row => row.entityId)).toEqual(["automation.water"]);
    expect(related.allPlants.map(row => row.entityId)).toEqual(["automation.daily"]);
  });
  it("lists nothing when no search found an automation that still exists", () => {
    expect(relatedAutomations(["automation.deleted"], [], states, "en")).toEqual({ plant: [], allPlants: [] });
  });
});

describe("capRows", () => {
  const rows = (count: number) => Array.from({ length: count }, (_, i) => automationRow(automation(`a${i}`, "on")));
  it("shows five rows, then offers Show all for the rest until expanded", () => {
    expect(RELATED_LIMIT).toBe(5);
    expect(capRows(rows(5), false)).toEqual({ shown: rows(5), more: false });
    expect(capRows(rows(6), false)).toEqual({ shown: rows(5), more: true });
    expect(capRows(rows(6), true)).toEqual({ shown: rows(6), more: false });
    expect(capRows([], false)).toEqual({ shown: [], more: false });
  });
});
