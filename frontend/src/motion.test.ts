import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "./views/overview.js";
import "./components/sp-plant-avatar.js";
import { SmartPlantsPanel } from "./panel.js";
import { fadeIn } from "./components/motion.js";
import { CARD_TYPE, SmartPlantsPlantCard } from "./card/loader.js";
import { DEVICE, cardHass } from "./card/card-test-helpers.js";
import { deferred, harness, overviewFor, overviewOf, sample, settle } from "./test-helpers.js";
import type { PlantRecord } from "./types.js";
import type { SmartPlantsOverview } from "./views/overview.js";

const plant = (id: string, name: string): PlantRecord => ({ ...structuredClone(sample), id, name });
const plants = [plant("basil", "Basil"), plant("fern", "Fern")];
const overview = Object.fromEntries(plants.map(p => [p.id, overviewFor(p)]));

let animate: ReturnType<typeof vi.fn>;
let reduce = false;
beforeEach(() => {
  animate = vi.fn();
  Object.defineProperty(Element.prototype, "animate", { configurable: true, writable: true, value: animate });
  reduce = false;
  vi.spyOn(window, "matchMedia").mockImplementation(query => ({ matches: reduce && query.includes("reduce"), media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }) as MediaQueryList);
});
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); delete (Element.prototype as Partial<Element>).animate; });

async function mountView(props: Partial<SmartPlantsOverview>): Promise<SmartPlantsOverview> {
  const el = document.createElement("smart-plants-overview");
  Object.assign(el, { plants, overview, ...props });
  document.body.append(el); await settle(el); return el;
}
const q = (el: SmartPlantsOverview, selector: string) => el.shadowRoot!.querySelector<HTMLElement>(selector);
const qa = (el: SmartPlantsOverview, selector: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(selector)];

describe("fades", () => {
  it("fade in once and not at all with reduced motion", () => {
    const element = document.createElement("div");
    fadeIn(element);
    expect(animate).toHaveBeenCalledWith([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
    reduce = true; animate.mockClear();
    fadeIn(element);
    expect(animate).not.toHaveBeenCalled();
  });
});

describe("overview placeholders", () => {
  it("show one placeholder card per plant until the first status read is answered", async () => {
    const el = await mountView({ pending: true, overview: {} });
    expect(q(el, ".content")!.getAttribute("aria-busy")).toBe("true");
    expect(qa(el, ".grid[aria-hidden=true] .card")).toHaveLength(2);
    expect(qa(el, ".card .name")).toHaveLength(0);
    // No counts that would claim no plant needs water yet.
    expect(qa(el, "button.tile")).toHaveLength(0);
    expect(q(el, ".countline [role=status]")!.textContent).toBe("Loading plants…");
    const search = q(el, ".search input") as HTMLInputElement;
    search.focus();
    Object.assign(el, { pending: false, overview }); await settle(el);
    expect(q(el, ".content")!.hasAttribute("aria-busy")).toBe(false);
    expect(qa(el, ".card .name").map(n => n.textContent)).toEqual(["Basil", "Fern"]);
    expect(qa(el, "button.tile").length).toBeGreaterThan(0);
    // The search field is the same element, so it keeps the focus.
    expect(q(el, ".search input")).toBe(search);
    expect(el.shadowRoot!.activeElement).toBe(search);
    expect(animate).toHaveBeenCalled();
  });
  it("show three placeholder cards while the plant list loads", async () => {
    const el = await mountView({ plants: [], loading: true });
    expect(qa(el, ".grid[aria-hidden=true] .card")).toHaveLength(3);
    expect(el.shadowRoot!.textContent).not.toContain("No plants yet");
  });
  it("fade in only when they are replaced, not on later updates", async () => {
    const el = await mountView({ pending: true });
    Object.assign(el, { pending: false }); await settle(el);
    expect(animate).toHaveBeenCalled();
    animate.mockClear();
    Object.assign(el, { overview: { ...overview }, now: Date.now() }); await settle(el);
    expect(animate).not.toHaveBeenCalled();
    el.hidden = true; await settle(el); el.hidden = false; await settle(el);
    expect(animate).not.toHaveBeenCalled();
  });
});

describe("panel first load", () => {
  it("asks for the status together with the registries and shows cards only once it is there", async () => {
    const status = deferred<unknown>(); const areas = deferred<unknown>();
    const h = harness(plants, msg => msg.type === "smart_plants/plants/overview" ? status.promise : msg.type === "config/area_registry/list" ? areas.promise : undefined);
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
    await settle(el); await settle(overviewOf(el));
    // The status read does not wait for the registries.
    expect(h.calls.some(c => c.type === "smart_plants/plants/overview")).toBe(true);
    expect(overviewOf(el).pending).toBe(true);
    areas.resolve([]); await settle(el); await settle(overviewOf(el));
    expect(overviewOf(el).shadowRoot!.querySelectorAll(".card .name")).toHaveLength(0);
    status.resolve({ plants: plants.map(overviewFor) }); await settle(el); await settle(overviewOf(el));
    expect(overviewOf(el).pending).toBe(false);
    expect(overviewOf(el).shadowRoot!.querySelectorAll(".card .name")).toHaveLength(2);
  });
  it("shows the cards without status and the error when the status read fails", async () => {
    const h = harness(plants, msg => msg.type === "smart_plants/plants/overview" ? Promise.reject({ code: "unknown_error", message: "boom" }) : undefined);
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
    await settle(el); await settle(overviewOf(el));
    expect(overviewOf(el).pending).toBe(false);
    expect(overviewOf(el).shadowRoot!.querySelectorAll(".card .name")).toHaveLength(2);
    expect(el.shadowRoot!.querySelector(".load-error[role=alert]")).not.toBeNull();
  });
  it("shows the empty state, not placeholders, when the backend is unavailable", async () => {
    const h = harness(plants, msg => msg.type === "smart_plants/panel/info" ? Promise.reject({ code: "unknown_error", message: "boom" }) : undefined);
    const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
    await settle(el); await settle(overviewOf(el));
    expect(overviewOf(el).pending).toBe(false);
    expect(overviewOf(el).shadowRoot!.querySelector(".grid[aria-hidden=true]")).toBeNull();
  });
});

describe("photo", () => {
  it("fades in the first time it is shown only", async () => {
    const avatar = document.createElement("sp-plant-avatar");
    avatar.src = "blob:photo-1"; document.body.append(avatar); await avatar.updateComplete;
    const img = avatar.shadowRoot!.querySelector("img")!;
    img.dispatchEvent(new Event("load"));
    expect(animate).toHaveBeenCalledWith([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-out" });
    animate.mockClear();
    const again = document.createElement("sp-plant-avatar");
    again.src = "blob:photo-1"; document.body.append(again); await again.updateComplete;
    again.shadowRoot!.querySelector("img")!.dispatchEvent(new Event("load"));
    expect(animate).not.toHaveBeenCalled();
  });
});

describe("card placeholder", () => {
  const statics = SmartPlantsPlantCard as unknown as { _module: Promise<unknown> | null };
  const realLoad = SmartPlantsPlantCard.load;
  beforeAll(() => { statics._module = null; });
  afterEach(() => { SmartPlantsPlantCard.load = realLoad; statics._module = null; });

  it("holds about the card's height until the content module is there", async () => {
    const module = deferred<unknown>();
    SmartPlantsPlantCard.load = () => module.promise.then(() => import("./card/plant-card.js"));
    const card = document.createElement(CARD_TYPE) as SmartPlantsPlantCard;
    card.setConfig({ type: `custom:${CARD_TYPE}`, device_id: DEVICE });
    card.hass = cardHass();
    document.body.append(card);
    const placeholder = card.shadowRoot!.querySelector<HTMLElement>(".placeholder")!;
    expect(placeholder.getAttribute("aria-hidden")).toBe("true");
    expect(placeholder.style.minHeight).toBe("370px");
    card.setConfig({ type: `custom:${CARD_TYPE}`, device_id: DEVICE, show_readings: false, show_watering: false });
    expect(placeholder.style.minHeight).toBe("170px");
    module.resolve(undefined); await SmartPlantsPlantCard.module(); await new Promise(resolve => setTimeout(resolve, 0));
    expect(card.shadowRoot!.querySelector(".placeholder")).toBeNull();
    expect(card.shadowRoot!.querySelector("smart-plants-plant-card-content")).not.toBeNull();
  });
});
