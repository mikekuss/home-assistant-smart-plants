import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import type { HAState } from "./types.js";
import { button, click, harness, panelText, sample, settle } from "./test-helpers.js";

// The Automations card on the plant's Overview tab, fed by Home Assistant's
// search for the plant's device and for the All plants entity.
const HOUR = 3_600_000;
const ALL_PLANTS = { id: "reg-all-plants", entity_id: "binary_sensor.smart_plants_all_plants", device_id: null, unique_id: "smart_plants:all_plants", platform: "smart_plants" };
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const automation = (id: string, state: string, attributes: Record<string, unknown>): HAState => ({ entity_id: `automation.${id}`, state, attributes, last_updated: "2026-10-29T08:00:00+00:00" });
const WATER = automation("water", "on", { friendly_name: "Water reminder for Aloe", id: "1761000000001", last_triggered: ago(2 * HOUR) });
const DAILY = automation("daily", "on", { friendly_name: "Smart Plants: daily plant report", id: "1761000000002", last_triggered: ago(5 * HOUR) });
const FAILED = () => Promise.reject({ code: "home_assistant_error" });

type Reply = string[] | (() => unknown);
async function mount(options: { device?: Reply; allPlants?: Reply; states?: HAState[]; entities?: unknown[] } = {}) {
  const reply = (value: Reply | undefined) => typeof value === "function" ? value() : { automation: value ?? [] };
  const h = harness([structuredClone(sample)], msg => {
    if (msg.type === "config/entity_registry/list") return options.entities ?? [ALL_PLANTS];
    if (msg.type === "search/related") return reply(msg.item_type === "device" ? options.device : options.allPlants);
    return undefined;
  });
  h.hass.states = Object.fromEntries((options.states ?? []).map(s => [s.entity_id, s]));
  const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
  await settle(el); await click(el, "Aloe"); await settle(el);
  return { el, h };
}
const root = (el: SmartPlantsPanel) => el.shadowRoot!;
const card = (el: SmartPlantsPanel) => root(el).querySelector("#automations-heading")!.closest("section")!;
const rows = (el: SmartPlantsPanel, list = "#automations-plant") => [...card(el).querySelectorAll(`${list} > li`)];
const title = (row: Element) => row.querySelector(".li-title")!.textContent;
const searches = (h: { calls: Record<string, unknown>[] }, itemType?: string) => h.calls.filter(c => c.type === "search/related" && (!itemType || c.item_type === itemType));

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.useRealTimers(); history.replaceState(null, "", "/"); });

describe("Automations card", () => {
  it("keeps its intro text and links for a plant without related automations", async () => {
    const { el, h } = await mount({ device: ["automation.deleted"] });
    expect(searches(h)).toEqual([
      { type: "search/related", item_type: "device", item_id: "device-plant-1" },
      { type: "search/related", item_type: "entity", item_id: "binary_sensor.smart_plants_all_plants" },
    ]);
    expect(card(el).querySelector("ul.rel")).toBeNull();
    expect(card(el).textContent).toContain("Pick Smart Plants triggers such as “Plant needs water” in the automation editor");
    expect(card(el).textContent).not.toContain("aren't listed");
    expect([...card(el).querySelectorAll("a.btn")].map(a => a.textContent?.trim())).toEqual(["Open device", "Create automation"]);
  });

  it("lists an automation with its last run and opens it in Home Assistant's editor", async () => {
    const { el } = await mount({ device: ["automation.water"], states: [WATER] });
    expect(rows(el)).toHaveLength(1);
    const link = rows(el)[0]!.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("/config/automation/edit/1761000000001");
    expect(title(rows(el)[0]!)).toBe("Water reminder for Aloe");
    expect(link.querySelector(".li-sub")!.textContent).toBe("Last ran 2 hours ago");
    expect(link.querySelector('ha-icon[icon="mdi:chevron-right"]')).not.toBeNull();
    expect(card(el).textContent).not.toContain("Pick Smart Plants triggers");
    const foot = card(el).querySelector(".rel-foot")!;
    expect(foot.textContent).toContain("Automations that only use a template, the plant's area or a sensor assigned to the plant aren't listed.");
    expect([...foot.querySelectorAll("a.btn")].map(a => a.textContent?.trim())).toEqual(["Open device", "Create automation"]);
    const navigations: Event[] = []; window.addEventListener("location-changed", e => navigations.push(e), { once: true });
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true, button: 0 }));
    expect(location.pathname).toBe("/config/automation/edit/1761000000001");
    expect(navigations).toHaveLength(1);
  });

  it("shows five automations until Show all lists the rest", async () => {
    const six = Array.from({ length: 6 }, (_, i) => automation(`a${i + 1}`, "on", { friendly_name: `Automation ${i + 1}`, id: `id-${i + 1}` }));
    const { el } = await mount({ device: six.map(s => s.entity_id).reverse(), states: six });
    expect(rows(el).map(title)).toEqual(["Automation 1", "Automation 2", "Automation 3", "Automation 4", "Automation 5"]);
    button(root(el), "Show all (6)").click(); await settle(el);
    expect(rows(el).map(title)).toEqual(["Automation 1", "Automation 2", "Automation 3", "Automation 4", "Automation 5", "Automation 6"]);
    expect([...card(el).querySelectorAll("button")].map(b => b.textContent?.trim())).not.toContain("Show all (6)");
    // The button is gone, so focus moves to the first row it revealed.
    expect(root(el).activeElement).toBe(rows(el)[5]!.querySelector("a"));
  });

  it("lists automations for all plants in their own group, after the plant's own", async () => {
    const { el } = await mount({ device: ["automation.water"], allPlants: ["automation.water", "automation.daily"], states: [WATER, DAILY] });
    expect(rows(el).map(title)).toEqual(["Water reminder for Aloe"]);
    const heading = card(el).querySelector("h4.rel-group")!;
    expect(heading.textContent).toBe("For all plants");
    expect(card(el).querySelector("#automations-all-plants")!.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(rows(el, "#automations-all-plants").map(title)).toEqual(["Smart Plants: daily plant report"]);
  });

  it("shows only the group for all plants when the plant has no automation of its own", async () => {
    const { el } = await mount({ allPlants: ["automation.daily"], states: [DAILY] });
    expect(card(el).querySelector("#automations-plant")).toBeNull();
    expect(rows(el, "#automations-all-plants").map(title)).toEqual(["Smart Plants: daily plant report"]);
    expect(card(el).querySelector(".rel-foot")).not.toBeNull();
  });

  it("searches only by device when the All plants entity is disabled", async () => {
    const { h } = await mount({ entities: [{ ...ALL_PLANTS, disabled_by: "user" }] });
    expect(searches(h).map(c => c.item_type)).toEqual(["device"]);
  });

  it("marks automations that are off, unavailable or defined in YAML", async () => {
    const states = [
      WATER,
      automation("holiday", "off", { friendly_name: "Holiday watering check", id: "3", last_triggered: ago(12 * 24 * HOUR) }),
      automation("mist", "unavailable", { friendly_name: "Mist on dry air", id: "4" }),
      automation("helper", "on", { friendly_name: "Old watering helper", last_triggered: ago(3 * 24 * HOUR) }),
    ];
    const { el } = await mount({ device: states.map(s => s.entity_id), states });
    expect(rows(el).map(title)).toEqual(["Old watering helper", "Water reminder for Aloe", "Holiday watering check", "Mist on dry air"]);
    const [yaml, on, off, unavailable] = rows(el);
    expect(yaml!.querySelector("a")).toBeNull();
    expect(yaml!.querySelector('ha-icon[icon="mdi:chevron-right"]')).toBeNull();
    expect(yaml!.querySelector(".li-sub")!.textContent).toBe("Defined in YAML · Last ran 3 days ago");
    expect([...on!.querySelector(".ic")!.classList]).toEqual(["ic", "tonal"]);
    expect(off!.querySelector(".cchip.tone-later")!.textContent).toBe("Off");
    expect([...off!.querySelector(".ic")!.classList]).toEqual(["ic"]);
    expect(unavailable!.querySelector(".cchip.tone-overdue")!.textContent).toBe("Unavailable");
    expect(unavailable!.querySelector('.cchip ha-icon[icon="mdi:alert-circle-outline"]')).not.toBeNull();
    expect([...unavailable!.querySelector(".ic")!.classList]).toEqual(["ic", "tone-bad"]);
    expect(unavailable!.querySelector(".li-sub")!.textContent).toBe("Never ran");
    expect(unavailable!.querySelector("a")!.getAttribute("href")).toBe("/config/automation/edit/4");
  });

  it("follows on/off and last runs from the states, and searches again only when automations come or go", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(Date.parse("2026-10-29T12:00:00Z"));
    const soil: HAState = { entity_id: "sensor.mock_soil", state: "30", attributes: { unit_of_measurement: "%" }, last_updated: "2026-10-29T08:00:00+00:00" };
    const { el, h } = await mount({ device: ["automation.water"], states: [WATER, soil] });
    const setStates = async (...list: HAState[]) => { el.hass = { ...el.hass!, states: Object.fromEntries(list.map(s => [s.entity_id, s])) }; await settle(el); };
    expect(searches(h, "device")).toHaveLength(1);
    vi.setSystemTime(Date.parse("2026-10-29T12:00:05Z"));
    await setStates({ ...WATER, state: "off", attributes: { ...WATER.attributes, last_triggered: "2026-10-29T11:00:00+00:00" } }, { ...soil, state: "25" });
    expect(rows(el)[0]!.querySelector(".cchip")!.textContent).toBe("Off");
    expect(rows(el)[0]!.querySelector(".li-sub")!.textContent).toBe("Last ran 1 hour ago");
    expect(searches(h, "device")).toHaveLength(1);
    await setStates(WATER, soil, automation("new", "on", { friendly_name: "New automation", id: "9" }));
    expect(searches(h, "device")).toHaveLength(2);
    // Another change within a second waits for the next search.
    await setStates(WATER, soil);
    expect(searches(h, "device")).toHaveLength(2);
    await new Promise(resolve => setTimeout(resolve, 1100)); await settle(el);
    expect(searches(h, "device")).toHaveLength(3);
    expect(searches(h, "entity")).toHaveLength(3);
  });

  it("searches again when the plant opens again", async () => {
    const { el, h } = await mount({ device: ["automation.water"], states: [WATER] });
    await click(el, "Back to overview"); await click(el, "Aloe"); await settle(el);
    expect(searches(h, "device")).toHaveLength(2);
    expect(rows(el).map(title)).toEqual(["Water reminder for Aloe"]);
  });

  it("keeps the group that loaded when the other search fails and says so once", async () => {
    const { el } = await mount({ device: FAILED, allPlants: ["automation.daily"], states: [WATER, DAILY] });
    expect(card(el).querySelector("#automations-plant")).toBeNull();
    expect(rows(el, "#automations-all-plants").map(title)).toEqual(["Smart Plants: daily plant report"]);
    expect(panelText(el).split("Related automations could not be loaded.")).toHaveLength(2);
    const other = await mount({ device: ["automation.water"], allPlants: FAILED, states: [WATER, DAILY] });
    expect(rows(other.el).map(title)).toEqual(["Water reminder for Aloe"]);
    expect(card(other.el).querySelector("#automations-all-plants")).toBeNull();
    expect(panelText(other.el)).toContain("Related automations could not be loaded.");
  });

  it("says once that automations could not be loaded when both searches fail", async () => {
    const { el } = await mount({ device: FAILED, allPlants: FAILED, states: [WATER] });
    expect(card(el).querySelector("ul.rel")).toBeNull();
    expect(card(el).textContent).toContain("Pick Smart Plants triggers");
    expect(panelText(el).split("Related automations could not be loaded.")).toHaveLength(2);
  });

  it("is no longer part of Troubleshooting, and the diagnostics download keeps what both searches found", async () => {
    const blobs: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation(blob => { blobs.push(blob as Blob); return "blob:diagnostics"; });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const { el } = await mount({ device: ["automation.water"], allPlants: ["automation.water", "automation.daily"], states: [WATER, DAILY] });
    await click(el, "Sensors");
    const tab = root(el).querySelector("#detail-panel")!;
    expect(tab.querySelector("dl.entity-ids")).not.toBeNull();
    expect(tab.textContent).not.toContain("Automations using this plant");
    expect(tab.textContent).not.toContain("automation.water");
    await click(el, "Download diagnostics");
    expect(JSON.parse(await blobs.at(-1)!.text())).toMatchObject({ related_automations: ["automation.water"], related_all_plants_automations: ["automation.water", "automation.daily"] });
  });

  it("speaks German", async () => {
    const states = [WATER, DAILY, automation("holiday", "off", { friendly_name: "Gießcheck im Urlaub" })];
    const { el, h } = await mount({ device: ["automation.water", "automation.holiday"], allPlants: ["automation.daily"], states });
    el.hass = { ...h.hass, language: "de" }; await settle(el);
    expect(card(el).querySelector("h3")!.textContent).toBe("Automatisierungen");
    expect(rows(el).map(row => row.querySelector(".li-sub")!.textContent)).toEqual(["Zuletzt ausgeführt vor 2 Stunden", "In YAML definiert · Noch nie ausgeführt"]);
    expect(rows(el)[1]!.querySelector(".cchip")!.textContent).toBe("Aus");
    expect(card(el).querySelector("h4")!.textContent).toBe("Für alle Pflanzen");
    expect(card(el).querySelector(".rel-foot")!.textContent).toContain("Automatisierungen, die nur ein Template, den Bereich der Pflanze oder einen ihr zugewiesenen Sensor verwenden, werden nicht aufgeführt.");
  });
});
