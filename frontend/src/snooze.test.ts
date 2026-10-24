import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import { createLocalizer, ENGLISH } from "./localize.js";
import { parseOverview } from "./overview-model.js";
import { careOnlyChange } from "./care-plan.js";
import { validResponse } from "./validation.js";
import { activeSnooze, addDays, endOfLocalDay, snoozeChipText, snoozeDateRange, snoozeEndDate, snoozeUntil, validSnoozeDate } from "./snooze.js";
import type { PlantRecord } from "./types.js";
import { harness, overviewFor, panelText, sample, settle } from "./test-helpers.js";
import { ApiError } from "./api.js";

const NOW = new Date("2026-10-24T12:00:00Z");
const BERLIN = "Europe/Berlin";
const DE = createLocalizer({ language: "de" });
// Chip dates are joined with no-break spaces.
const nb = (date: string) => date.replace(/ /g, "\u00a0");

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); });

describe("snooze end", () => {
  it("ends at the last second of the local day in the Home Assistant time zone", () => {
    expect(endOfLocalDay("2026-10-24", BERLIN)).toBe("2026-10-24T23:59:59+02:00");
    // Clocks go back in Berlin on October 25.
    expect(endOfLocalDay("2026-10-25", BERLIN)).toBe("2026-10-25T23:59:59+01:00");
    expect(endOfLocalDay("2026-11-01", "America/New_York")).toBe("2026-11-01T23:59:59-05:00");
    expect(endOfLocalDay("2026-10-30", "Asia/Kolkata")).toBe("2026-10-30T23:59:59+05:30");
    expect(endOfLocalDay("2026-10-30", "UTC")).toBe("2026-10-30T23:59:59+00:00");
    expect(endOfLocalDay("not a date", BERLIN)).toBeNull();
  });
  it("counts presets from today and accepts picked days from tomorrow up to a year ahead", () => {
    expect(snoozeUntil("1", "2026-10-24", "", BERLIN)).toBe("2026-10-25T23:59:59+01:00");
    expect(snoozeUntil("3", "2026-10-24", "", BERLIN)).toBe("2026-10-27T23:59:59+01:00");
    expect(snoozeUntil("7", "2026-12-28", "", BERLIN)).toBe("2027-01-04T23:59:59+01:00");
    expect(snoozeUntil("14", "2026-10-24", "", "UTC")).toBe("2026-11-07T23:59:59+00:00");
    expect(snoozeUntil("date", "2026-10-24", "2026-10-30", BERLIN)).toBe("2026-10-30T23:59:59+01:00");
    expect(snoozeDateRange("2026-10-24")).toEqual({ min: "2026-10-25", max: "2027-10-24" });
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    for (const bad of ["2026-10-24", "2027-10-25", "2027-02-30", "", "tomorrow"]) {
      expect(validSnoozeDate(bad, "2026-10-24")).toBe(false);
      expect(snoozeUntil("date", "2026-10-24", bad, BERLIN)).toBeNull();
    }
    expect(validSnoozeDate("2027-10-24", "2026-10-24")).toBe(true);
  });
  it("names the day a snooze ends, in English and German", () => {
    const now = NOW.getTime();
    expect(snoozeChipText(ENGLISH, "2026-10-30T22:59:59Z", "2026-10-24", BERLIN, now)).toBe(`Snoozed until ${nb("Fri, Oct 30")}`);
    expect(snoozeChipText(DE, "2026-10-30T22:59:59Z", "2026-10-24", BERLIN, now)).toBe(`Stummgeschaltet bis ${nb("Fr., 30. Okt.")}`);
    // An end at midnight still belongs to the day before.
    expect(snoozeEndDate("2026-10-30T23:00:00Z", BERLIN)).toBe("2026-10-30");
    expect(snoozeChipText(ENGLISH, "2027-01-04T22:59:59Z", "2026-10-24", BERLIN, now)).toBe(`Snoozed until ${nb("Mon, Jan 4, 2027")}`);
    expect(snoozeChipText(ENGLISH, "2026-10-24T11:59:59Z", "2026-10-24", BERLIN, now)).toBeNull();
    expect(snoozeChipText(ENGLISH, null, "2026-10-24", BERLIN, now)).toBeNull();
    expect(activeSnooze("garbage", now)).toBeNull();
  });
});

describe("snooze data", () => {
  const raw = { plant_id: "p1", revision: 3, lifecycle_state: "active", status: "healthy", problems: [], roles: {}, last_watered_at: null, image: null, care: [], rest_period: null, resting: false };
  it("reads the snooze end from the overview and tolerates older backends without it", () => {
    expect(parseOverview(raw)?.snoozed_until).toBeNull();
    expect(parseOverview({ ...raw, snoozed_until: "2026-10-30T22:59:59Z" })?.snoozed_until).toBe("2026-10-30T22:59:59Z");
    expect(parseOverview({ ...raw, snoozed_until: "soon" })).toBeNull();
  });
  it("checks that a snooze reply stored the requested end", () => {
    const msg = { type: "smart_plants/plants/snooze", plant_id: "plant-1", expected_revision: 1, until: "2026-10-30T23:59:59+01:00" };
    expect(validResponse(msg, { plant: { ...sample, revision: 2, snoozed_until: "2026-10-30T22:59:59Z" } })).toBe(true);
    expect(validResponse(msg, { plant: { ...sample, revision: 2, snoozed_until: "2026-10-31T22:59:59Z" } })).toBe(false);
    expect(validResponse(msg, { plant: { ...sample, id: "other", revision: 2, snoozed_until: "2026-10-30T22:59:59Z" } })).toBe(false);
    expect(validResponse({ ...msg, until: null }, { plant: { ...sample, revision: 2, snoozed_until: null } })).toBe(true);
    expect(validResponse({ ...msg, until: null }, { plant: { ...sample, revision: 2, snoozed_until: "2026-10-30T22:59:59Z" } })).toBe(false);
    expect(validResponse({ type: "smart_plants/plants/list" }, { plants: [{ ...sample, snoozed_until: 5 }] })).toBe(true);
  });
  it("takes over a snooze change without a conflict review", () => {
    expect(careOnlyChange({ ...sample, snoozed_until: null }, { ...sample, revision: 2, snoozed_until: "2026-10-30T22:59:59Z" })).toBe(true);
    expect(careOnlyChange({ ...sample, snoozed_until: null }, { ...sample, revision: 2, name: "Other", snoozed_until: null })).toBe(false);
  });
});

describe("snoozing in the panel", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW); });

  async function mount(plant: PlantRecord, options: { language?: string; snooze?: (msg: Record<string, unknown>, current: PlantRecord) => unknown; open?: boolean } = {}) {
    let current = plant;
    const h = harness([plant], msg => {
      if (msg.type === "smart_plants/plants/list") return { plants: [current] };
      if (msg.type === "smart_plants/plants/overview") return { plants: [overviewFor(current)] };
      if (msg.type === "smart_plants/plants/snooze") {
        const custom = options.snooze?.(msg, current); if (custom !== undefined) return custom;
        current = { ...current, revision: current.revision + 1, snoozed_until: msg.until === null ? null : new Date(String(msg.until)).toISOString().replace(".000", "") };
        return { plant: current };
      }
      return undefined;
    });
    h.hass.config = { time_zone: BERLIN };
    if (options.language) h.hass.language = options.language;
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
    await settle(el);
    if (options.open !== false) {
      el.shadowRoot!.querySelector<HTMLButtonElement>("smart-plants-overview")!.shadowRoot!.querySelector<HTMLButtonElement>("button.name")!.click();
      await settle(el);
    }
    return { el, h, current: () => current };
  }
  const root = (el: SmartPlantsPanel) => el.shadowRoot!;
  const menuItem = (el: SmartPlantsPanel) => root(el).querySelector<HTMLElement>('ha-dropdown-item[value="snooze"]')!;
  const openMenu = async (el: SmartPlantsPanel) => { root(el).querySelector(".panel-appbar ha-dropdown")!.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "snooze" } } })); await settle(el); };
  const dialog = (el: SmartPlantsPanel) => root(el).querySelector<HTMLDialogElement>("dialog.snooze-dialog");
  const radio = (el: SmartPlantsPanel, value: string) => dialog(el)!.querySelector<HTMLInputElement>(`input[name=snooze-choice][value="${value}"]`)!;
  const dialogButton = (el: SmartPlantsPanel, name: string) => [...dialog(el)!.querySelectorAll("button")].find(b => b.textContent?.trim() === name)!;
  const snoozeCalls = (h: ReturnType<typeof harness>) => h.calls.filter(call => call.type === "smart_plants/plants/snooze");

  it("snoozes for a preset until the end of the local day", async () => {
    const { el, h } = await mount(structuredClone(sample));
    expect(menuItem(el).textContent).toContain("Snooze alerts…");
    expect(menuItem(el).hasAttribute("disabled")).toBe(false);
    expect(root(el).querySelector("sp-snooze-chip")).toBeNull();
    await openMenu(el);
    expect(dialog(el)?.open).toBe(true);
    expect(dialog(el)!.querySelector("h2")!.textContent).toBe("Snooze alerts for Aloe");
    expect(radio(el, "1").checked).toBe(true);
    expect(dialog(el)!.textContent).toContain("Until Sun, Oct 25");
    radio(el, "3").click(); await settle(el);
    dialogButton(el, "Snooze").click(); await settle(el);
    expect(snoozeCalls(h)).toEqual([{ type: "smart_plants/plants/snooze", plant_id: "plant-1", expected_revision: 1, until: "2026-10-27T23:59:59+01:00" }]);
    expect(dialog(el)).toBeNull();
    const chip = root(el).querySelector("sp-snooze-chip")!;
    expect(chip.label).toBe(`Snoozed until ${nb("Tue, Oct 27")}`);
    // The status chip stays as it was; a snooze only mutes alerts.
    expect(root(el).querySelector("sp-status-chip")!.status).toBe("no_sensors");
    expect(menuItem(el).textContent).toContain("Change snooze…");
  });

  it("snoozes until a picked day and refuses days outside the range", async () => {
    const { el, h } = await mount(structuredClone(sample));
    await openMenu(el);
    radio(el, "date").click(); await settle(el);
    const input = dialog(el)!.querySelector<HTMLInputElement>("#snooze-date")!;
    expect(input.min).toBe("2026-10-25"); expect(input.max).toBe("2027-10-24");
    expect(input.value).toBe("2026-10-25");
    input.value = "2027-11-01"; input.dispatchEvent(new Event("input")); await settle(el);
    dialogButton(el, "Snooze").click(); await settle(el);
    expect(snoozeCalls(h)).toEqual([]);
    expect(dialog(el)!.querySelector("[role=alert]")!.textContent).toBe("Choose a day from tomorrow up to one year from today.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    input.value = "2026-12-24"; input.dispatchEvent(new Event("input")); await settle(el);
    dialogButton(el, "Snooze").click(); await settle(el);
    expect(snoozeCalls(h).map(call => call.until)).toEqual(["2026-12-24T23:59:59+01:00"]);
    expect(root(el).querySelector("sp-snooze-chip")!.label).toBe(`Snoozed until ${nb("Thu, Dec 24")}`);
  });

  it("shows the snooze with Resume, changes it and resumes", async () => {
    const { el, h } = await mount({ ...structuredClone(sample), snoozed_until: "2026-10-30T22:59:59Z" });
    expect(root(el).querySelector("sp-snooze-chip")!.label).toBe(`Snoozed until ${nb("Fri, Oct 30")}`);
    const resume = root(el).querySelector<HTMLButtonElement>(".hero-status .snooze button")!;
    expect(resume.textContent).toBe("Resume");
    expect(resume.getAttribute("aria-label")).toBe("Resume alerts for Aloe");
    await openMenu(el);
    expect(dialog(el)!.querySelector("h2")!.textContent).toBe("Change snooze for Aloe");
    expect(dialog(el)!.textContent).toContain("Snoozed until Fri, Oct 30");
    expect(radio(el, "date").checked).toBe(true);
    expect(dialog(el)!.querySelector<HTMLInputElement>("#snooze-date")!.value).toBe("2026-10-30");
    radio(el, "14").click(); await settle(el);
    dialogButton(el, "Snooze").click(); await settle(el);
    expect(snoozeCalls(h).at(-1)!.until).toBe("2026-11-07T23:59:59+01:00");
    root(el).querySelector<HTMLButtonElement>(".hero-status .snooze button")!.click(); await settle(el);
    expect(snoozeCalls(h).at(-1)).toEqual({ type: "smart_plants/plants/snooze", plant_id: "plant-1", expected_revision: 2, until: null });
    expect(root(el).querySelector("sp-snooze-chip")).toBeNull();
    expect(menuItem(el).textContent).toContain("Snooze alerts…");
  });

  it("resumes from the dialog", async () => {
    const { el, h } = await mount({ ...structuredClone(sample), snoozed_until: "2026-10-30T22:59:59Z" });
    await openMenu(el);
    dialogButton(el, "Resume").click(); await settle(el);
    expect(snoozeCalls(h).at(-1)!.until).toBeNull();
    expect(dialog(el)).toBeNull();
    expect(root(el).querySelector("sp-snooze-chip")).toBeNull();
  });

  it("uses German texts", async () => {
    const { el } = await mount({ ...structuredClone(sample), snoozed_until: "2026-10-30T22:59:59Z" }, { language: "de" });
    expect(root(el).querySelector("sp-snooze-chip")!.label).toBe(`Stummgeschaltet bis ${nb("Fr., 30. Okt.")}`);
    expect(menuItem(el).textContent).toContain("Stummschaltung ändern…");
    await openMenu(el);
    // The German date already ends with a period; the line adds no second one.
    expect(dialog(el)!.querySelector(".snooze-current")!.textContent).toBe("Stummgeschaltet bis Fr., 30. Okt.");
    expect(dialog(el)!.textContent).toContain("1 Woche");
    expect(dialogButton(el, "Stummschalten")).toBeDefined();
  });

  it("hides a snooze that already ended and cannot snooze a paused plant", async () => {
    const { el } = await mount({ ...structuredClone(sample), lifecycle_state: "disabled", snoozed_until: "2026-10-24T10:00:00Z" });
    expect(root(el).querySelector("sp-snooze-chip")).toBeNull();
    expect(menuItem(el).hasAttribute("disabled")).toBe(true);
  });

  it("reports a revision conflict like other plant edits and refreshes", async () => {
    const { el, h } = await mount(structuredClone(sample), { snooze: () => Promise.reject(new ApiError("revision_conflict", "Conflict")) });
    await openMenu(el);
    const reads = h.calls.filter(call => call.type === "smart_plants/plants/list").length;
    dialogButton(el, "Snooze").click(); await settle(el);
    expect(panelText(el)).toContain("This plant was changed somewhere else.");
    expect(h.calls.filter(call => call.type === "smart_plants/plants/list").length).toBeGreaterThan(reads);
    expect(root(el).querySelector("sp-snooze-chip")).toBeNull();
  });

  it("refreshes when a plant sensor reports a changed snooze", async () => {
    const plant = structuredClone(sample);
    const { el, h } = await mount(plant);
    const entity = { entity_id: "binary_sensor.mock_aloe_needs_water", platform: "smart_plants", unique_id: "smart_plants:plant-1:needs_water" };
    (el as unknown as { _entities: unknown[] })._entities = [entity];
    const state = (until: string | null) => ({ entity_id: entity.entity_id, state: "off", attributes: { snoozed: until !== null, snoozed_until: until }, last_updated: NOW.toISOString() });
    el.hass = { ...h.hass, states: { [entity.entity_id]: state(null) } }; await settle(el);
    const reads = h.calls.filter(call => call.type === "smart_plants/plants/list").length;
    el.hass = { ...h.hass, states: { [entity.entity_id]: state("2026-10-30T22:59:59Z") } }; await settle(el);
    await new Promise(resolve => setTimeout(resolve, 450)); await settle(el);
    expect(h.calls.filter(call => call.type === "smart_plants/plants/list").length).toBe(reads + 1);
  });

  it("shows the grey chip on the overview card without a button", async () => {
    const { el } = await mount({ ...structuredClone(sample), snoozed_until: "2026-10-30T22:59:59Z" }, { open: false });
    const card = root(el).querySelector("smart-plants-overview")!.shadowRoot!.querySelector("article.card")!;
    expect(card.querySelector("sp-snooze-chip")!.label).toBe(`Snoozed until ${nb("Fri, Oct 30")}`);
    expect(card.querySelector(".chiprow")!.querySelectorAll("button")).toHaveLength(0);
    expect(card.querySelector("sp-status-chip")).not.toBeNull();
  });
});
