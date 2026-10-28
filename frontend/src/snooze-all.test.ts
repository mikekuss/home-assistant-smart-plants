import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import { activeSnooze } from "./snooze.js";
import type { PlantRecord } from "./types.js";
import { harness, overviewFor, sample, settle } from "./test-helpers.js";
import { ApiError } from "./api.js";

const NOW = new Date("2026-10-24T12:00:00Z");
const BERLIN = "Europe/Berlin";
// Chip dates are joined with no-break spaces.
const chip = (date: string) => `Snoozed until ${date.replace(/ /g, " ")}`;
type Toast = { message: string; action?: { text: string; action: () => void } };

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW); });

const plant = (id: string, name: string, extra: Partial<PlantRecord> = {}): PlantRecord => ({ ...structuredClone(sample), id, name, ...extra });
const three = () => [plant("p1", "Aloe"), plant("p2", "Basil"), plant("p3", "Cactus")];
const stored = (until: unknown) => until === null ? null : new Date(String(until)).toISOString().replace(".000", "");

// A backend double with the snooze_many and restore_snoozes rules: paused
// plants are skipped, a later end is kept, and only changed plants are listed.
async function mount(plants: PlantRecord[], options: { language?: string; snoozeMany?: (msg: Record<string, unknown>) => unknown; restore?: (msg: Record<string, unknown>) => unknown } = {}) {
  let current = plants;
  const h = harness(plants, msg => {
    if (msg.type === "smart_plants/plants/list") return { plants: current };
    if (msg.type === "smart_plants/plants/overview") return { plants: current.map(overviewFor) };
    if (msg.type === "smart_plants/plants/snooze_many") {
      const custom = options.snoozeMany?.(msg); if (custom !== undefined) return custom;
      const end = msg.until === null ? null : Date.parse(String(msg.until));
      const changed: PlantRecord[] = []; const previous: Record<string, string | null> = {};
      current = current.map(p => {
        if (p.lifecycle_state !== "active") return p;
        const was = activeSnooze(p.snoozed_until);
        if (end === null ? was === null : was !== null && Date.parse(was) >= end) return p;
        const next = { ...p, revision: p.revision + 1, snoozed_until: stored(msg.until) };
        changed.push(next); previous[p.id] = p.snoozed_until ?? null; return next;
      });
      return { plants: changed, previous };
    }
    if (msg.type === "smart_plants/plants/restore_snoozes") {
      const custom = options.restore?.(msg); if (custom !== undefined) return custom;
      const snoozes = msg.snoozes as Record<string, string | null>; const changed: PlantRecord[] = [];
      current = current.map(p => {
        if (!(p.id in snoozes)) return p;
        const next = { ...p, revision: p.revision + 1, snoozed_until: snoozes[p.id] ?? null };
        changed.push(next); return next;
      });
      return { plants: changed };
    }
    return undefined;
  });
  h.hass.config = { time_zone: BERLIN };
  if (options.language) h.hass.language = options.language;
  const el = new SmartPlantsPanel(); el.hass = h.hass;
  const toasts: Toast[] = [];
  el.addEventListener("hass-notification", e => toasts.push((e as CustomEvent<Toast>).detail));
  document.body.append(el);
  await settle(el);
  return { el, h, toasts, current: () => current };
}
const root = (el: SmartPlantsPanel) => el.shadowRoot!;
const menuItem = (el: SmartPlantsPanel) => root(el).querySelector<HTMLElement>('ha-dropdown-item[value="snooze-all"]');
const openMenu = async (el: SmartPlantsPanel) => { root(el).querySelector(".panel-appbar ha-dropdown")!.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "snooze-all" } } })); await settle(el); };
const dialog = (el: SmartPlantsPanel) => root(el).querySelector<HTMLDialogElement>("dialog.snooze-dialog");
const radio = (el: SmartPlantsPanel, value: string) => dialog(el)!.querySelector<HTMLInputElement>(`input[name=snooze-choice][value="${value}"]`)!;
const dialogButton = (el: SmartPlantsPanel, name: string) => [...dialog(el)!.querySelectorAll("button")].find(b => b.textContent?.trim() === name);
const summary = (el: SmartPlantsPanel) => dialog(el)!.querySelector(".snooze-summary")!.textContent;
const resumeHint = (el: SmartPlantsPanel) => dialog(el)!.querySelector("#snooze-resume-hint")?.textContent;
const chips = (el: SmartPlantsPanel) => [...root(el).querySelector("smart-plants-overview")!.shadowRoot!.querySelectorAll("article.card")].map(card => card.querySelector("sp-snooze-chip")?.label ?? null);
const bulkCalls = (h: ReturnType<typeof harness>) => h.calls.filter(call => call.type === "smart_plants/plants/snooze_many" || call.type === "smart_plants/plants/restore_snoozes");
const pickDate = async (el: SmartPlantsPanel, date: string) => {
  radio(el, "date").click(); await settle(el);
  const input = dialog(el)!.querySelector<HTMLInputElement>("#snooze-date")!;
  input.value = date; input.dispatchEvent(new Event("input")); await settle(el);
};

describe("Snooze all plants", () => {
  it("shows the menu item on the overview only with at least two active plants", async () => {
    expect(menuItem((await mount([])).el)).toBeNull();
    expect(menuItem((await mount([plant("p1", "Aloe")])).el)).toBeNull();
    expect(menuItem((await mount([plant("p1", "Aloe"), plant("p2", "Basil", { lifecycle_state: "disabled" })])).el)).toBeNull();
    const { el } = await mount([plant("p1", "Aloe"), plant("p2", "Basil")]);
    const item = menuItem(el)!;
    expect(item.textContent).toContain("Snooze all plants…");
    expect(item.querySelector("ha-icon")!.getAttribute("icon")).toBe("mdi:bell-sleep-outline");
    const values = [...root(el).querySelectorAll("ha-dropdown-item")].map(i => i.getAttribute("value"));
    expect(values.slice(values.indexOf("notifications"), values.indexOf("integration-options") + 1)).toEqual(["notifications", "snooze-all", "integration-options"]);
    // The plant page has its own Snooze alerts… item instead.
    root(el).querySelector("smart-plants-overview")!.shadowRoot!.querySelector<HTMLButtonElement>("button.name")!.click(); await settle(el);
    expect(menuItem(el)).toBeNull();
  });

  it("summarizes which plants it snoozes and which keep a later end", async () => {
    const { el } = await mount([plant("p1", "Aloe"), plant("p2", "Basil"), plant("p3", "Cactus", { snoozed_until: "2026-12-01T22:59:59Z" }), plant("p4", "Dill", { lifecycle_state: "disabled" })]);
    await openMenu(el);
    expect(dialog(el)?.open).toBe(true);
    expect(dialog(el)!.querySelector("h2")!.textContent).toBe("Snooze all plants");
    expect(radio(el, "1").checked).toBe(true);
    expect(dialog(el)!.textContent).toContain("Until Sun, Oct 25");
    expect(summary(el)).toBe("Snoozes 2 plants. Paused plants are left out. 1 plant already snoozed longer keeps its end.");
    await pickDate(el, "2026-12-24");
    expect(summary(el)).toBe("Snoozes 3 plants. Paused plants are left out.");
    expect(resumeHint(el)).toBe("Ends the snooze of 1 plant.");
  });

  it("leaves out the paused sentence when no plant is paused", async () => {
    const { el } = await mount(three());
    await openMenu(el);
    expect(summary(el)).toBe("Snoozes 3 plants.");
  });

  it("says so when every plant is already snoozed longer", async () => {
    const later = { snoozed_until: "2026-12-01T22:59:59Z" };
    const { el } = await mount([plant("p1", "Aloe", later), plant("p2", "Basil", later)]);
    await openMenu(el);
    expect(summary(el)).toBe("Every plant is already snoozed longer and keeps its end.");
    expect(dialogButton(el, "Snooze")!.disabled).toBe(true);
    expect(resumeHint(el)).toBe("Ends the snooze of 2 plants.");
  });

  it("counts a plant already snoozed until the same end as keeping it", async () => {
    // 1 day from Oct 24 in Berlin ends at 2026-10-25T23:59:59+01:00.
    const same = { snoozed_until: "2026-10-25T22:59:59Z" };
    const { el, h, toasts } = await mount([plant("p1", "Aloe", same), plant("p2", "Basil"), plant("p3", "Cactus")]);
    await openMenu(el);
    expect(summary(el)).toBe("Snoozes 2 plants. 1 plant already snoozed longer keeps its end.");
    dialogButton(el, "Snooze")!.click(); await settle(el);
    expect(bulkCalls(h)).toHaveLength(1);
    expect(toasts.at(-1)!.message).toBe("2 plants snoozed until Sun, Oct 25");
  });

  it("offers nothing to snooze when every plant already ends on the chosen day", async () => {
    const same = { snoozed_until: "2026-10-25T22:59:59Z" };
    const { el, h } = await mount([plant("p1", "Aloe", same), plant("p2", "Basil", same)]);
    await openMenu(el);
    expect(summary(el)).toBe("Every plant is already snoozed longer and keeps its end.");
    expect(dialogButton(el, "Snooze")!.disabled).toBe(true);
    // A later day snoozes them again.
    radio(el, "3").click(); await settle(el);
    expect(summary(el)).toBe("Snoozes 2 plants.");
    expect(dialogButton(el, "Snooze")!.disabled).toBe(false);
    expect(bulkCalls(h)).toEqual([]);
  });

  it("snoozes in one call and undoes it from the notice", async () => {
    const { el, h, toasts, current } = await mount([...three(), plant("p4", "Dill", { snoozed_until: "2026-12-01T22:59:59Z" })]);
    await openMenu(el);
    radio(el, "7").click(); await settle(el);
    dialogButton(el, "Snooze")!.click(); await settle(el);
    expect(bulkCalls(h)).toEqual([{ type: "smart_plants/plants/snooze_many", until: "2026-10-31T23:59:59+01:00" }]);
    expect(dialog(el)).toBeNull();
    expect(toasts.at(-1)!.message).toBe("3 plants snoozed until Sat, Oct 31");
    expect(chips(el)).toEqual([chip("Sat, Oct 31"), chip("Sat, Oct 31"), chip("Sat, Oct 31"), chip("Tue, Dec 1")]);
    expect(toasts.at(-1)!.action!.text).toBe("Undo");
    toasts.at(-1)!.action!.action(); await settle(el);
    expect(bulkCalls(h).at(-1)).toEqual({ type: "smart_plants/plants/restore_snoozes", snoozes: { p1: null, p2: null, p3: null } });
    expect(toasts.at(-1)!.message).toBe("Previous snoozes restored");
    expect(current().map(p => p.snoozed_until ?? null)).toEqual([null, null, null, "2026-12-01T22:59:59Z"]);
    expect(chips(el)).toEqual([null, null, null, chip("Tue, Dec 1")]);
  });

  it("resumes every snooze, including ones set per plant", async () => {
    const { el, h, toasts, current } = await mount([plant("p1", "Aloe", { snoozed_until: "2026-10-30T22:59:59Z" }), plant("p2", "Basil", { snoozed_until: "2026-12-01T22:59:59Z" }), plant("p3", "Cactus")]);
    await openMenu(el);
    const resume = dialogButton(el, "Resume all")!;
    expect(resume.getAttribute("aria-describedby")).toBe("snooze-resume-hint");
    expect(resumeHint(el)).toBe("Ends the snooze of 2 plants.");
    resume.click(); await settle(el);
    expect(bulkCalls(h)).toEqual([{ type: "smart_plants/plants/snooze_many", until: null }]);
    expect(dialog(el)).toBeNull();
    expect(toasts.at(-1)!.message).toBe("Alerts resumed for 2 plants");
    expect(current().every(p => !p.snoozed_until)).toBe(true);
    expect(chips(el)).toEqual([null, null, null]);
    toasts.at(-1)!.action!.action(); await settle(el);
    expect(bulkCalls(h).at(-1)).toEqual({ type: "smart_plants/plants/restore_snoozes", snoozes: { p1: "2026-10-30T22:59:59Z", p2: "2026-12-01T22:59:59Z" } });
    // Snoozed plants sort after the others.
    expect(chips(el)).toEqual([null, chip("Fri, Oct 30"), chip("Tue, Dec 1")]);
  });

  it("hides Resume all while no active plant is snoozed", async () => {
    const { el } = await mount([...three(), plant("p4", "Dill", { lifecycle_state: "disabled", snoozed_until: "2026-12-01T22:59:59Z" })]);
    await openMenu(el);
    expect(dialogButton(el, "Resume all")).toBeUndefined();
    expect(resumeHint(el)).toBeUndefined();
  });

  it("refuses a picked day outside the range", async () => {
    const { el, h } = await mount(three());
    await openMenu(el);
    await pickDate(el, "2026-10-24");
    dialogButton(el, "Snooze")!.click(); await settle(el);
    expect(bulkCalls(h)).toEqual([]);
    expect(dialog(el)!.querySelector("[role=alert]")!.textContent).toBe("Choose a day from tomorrow up to one year from today.");
  });

  it("shows a refused save and leaves every plant as it was", async () => {
    const { el, h, toasts } = await mount(three(), { snoozeMany: () => Promise.reject(new ApiError("unknown_error", "Refused")) });
    await openMenu(el);
    const reads = h.calls.filter(call => call.type === "smart_plants/plants/list").length;
    dialogButton(el, "Snooze")!.click(); await settle(el);
    expect(root(el).querySelector("p.error[role=alert]")!.textContent!.length).toBeGreaterThan(0);
    expect(toasts).toEqual([]);
    expect(chips(el)).toEqual([null, null, null]);
    expect(h.calls.filter(call => call.type === "smart_plants/plants/list").length).toBeGreaterThan(reads);
    expect(menuItem(el)!.hasAttribute("disabled")).toBe(false);
  });

  it("shows a failed Undo and keeps the snooze", async () => {
    const { el, toasts } = await mount(three(), { restore: () => Promise.reject(new ApiError("unknown_error", "Refused")) });
    await openMenu(el);
    dialogButton(el, "Snooze")!.click(); await settle(el);
    toasts.at(-1)!.action!.action(); await settle(el);
    expect(root(el).querySelector("p.error[role=alert]")).not.toBeNull();
    expect(toasts.at(-1)!.message).toBe("3 plants snoozed until Sun, Oct 25");
    expect(chips(el)).toEqual([chip("Sun, Oct 25"), chip("Sun, Oct 25"), chip("Sun, Oct 25")]);
  });

  it("rejects a reply whose previous ends do not match the changed plants", async () => {
    const { el, toasts } = await mount(three(), { snoozeMany: () => ({ plants: [{ ...sample, id: "p1", revision: 2 }], previous: {} }) });
    await openMenu(el);
    dialogButton(el, "Snooze")!.click(); await settle(el);
    expect(toasts).toEqual([]);
    expect(root(el).querySelector("p.error[role=alert]")).not.toBeNull();
  });

  it("uses German texts", async () => {
    const { el, toasts } = await mount([plant("p1", "Aloe"), plant("p2", "Basil", { snoozed_until: "2026-12-01T22:59:59Z" }), plant("p3", "Cactus", { lifecycle_state: "disabled" })], { language: "de" });
    expect(menuItem(el)!.textContent).toContain("Alle Pflanzen stummschalten…");
    await openMenu(el);
    expect(summary(el)).toBe("Schaltet 1 Pflanze stumm. Pausierte Pflanzen bleiben außen vor. 1 Pflanze, die schon länger stummgeschaltet ist, behält ihr Ende.");
    expect(resumeHint(el)).toBe("Beendet die Stummschaltung von 1 Pflanze.");
    expect(dialogButton(el, "Alle fortsetzen")).toBeDefined();
    dialogButton(el, "Stummschalten")!.click(); await settle(el);
    expect(toasts.at(-1)!.message).toBe("1 Pflanze bis So., 25. Okt. stummgeschaltet");
    expect(toasts.at(-1)!.action!.text).toBe("Rückgängig");
  });
});
