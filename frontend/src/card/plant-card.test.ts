import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { getConfigForm, getStubConfig } from "./plant-card.js";
import type { SmartPlantsPlantCardContent } from "./plant-card.js";
import { CARD_TYPE, SmartPlantsPlantCard, defineCard } from "./loader.js";
import { PICKER_TEXT, pickerText } from "./picker.js";
import { en } from "../translations/en.js";
import { de } from "../translations/de.js";
import { DEVICE, PLANT_ID, cardHass } from "./card-test-helpers.js";
import type { CardState } from "./plant-state.js";

beforeAll(() => { SmartPlantsPlantCard.load = () => import("./plant-card.js"); });
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

type Hass = ReturnType<typeof cardHass>;
async function mount(hass: Hass, config: Record<string, unknown> = {}): Promise<SmartPlantsPlantCardContent> {
  const card = document.createElement(CARD_TYPE) as SmartPlantsPlantCard;
  card.setConfig({ type: `custom:${CARD_TYPE}`, device_id: DEVICE, ...config });
  card.hass = hass;
  document.body.append(card);
  await SmartPlantsPlantCard.module();
  await new Promise(resolve => setTimeout(resolve, 0));
  const content = card.shadowRoot!.querySelector("smart-plants-plant-card-content") as SmartPlantsPlantCardContent;
  await content.updateComplete;
  return content;
}
const text = (root: Element) => (root.shadowRoot!.textContent ?? "").replace(/\s+/g, " ").trim();
const deepText = (root: Element): string => {
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) parts.push(node.textContent ?? "");
    if (node instanceof Element && node.shadowRoot) walk(node.shadowRoot);
    node.childNodes.forEach(walk);
  };
  walk(root.shadowRoot!);
  return parts.join(" ").replace(/\s+/g, " ").trim();
};
const $ = <T extends Element = HTMLElement>(content: Element, selector: string) => content.shadowRoot!.querySelector(selector) as T | null;
const unavailable = (id: string): CardState => ({ entity_id: id, state: "unavailable", attributes: {} });

describe("registry swap", () => {
  it("defines the card again in a registry that replaced the native one", () => {
    const native = window.customElements;
    const defined = new Map<string, CustomElementConstructor>();
    const swapped = { get: (name: string) => defined.get(name), define: (name: string, cls: CustomElementConstructor) => { if (defined.has(name)) throw new Error("used"); defined.set(name, cls); } };
    Object.defineProperty(window, "customElements", { value: swapped, configurable: true, writable: true });
    try {
      defineCard();
      defineCard();
      expect(defined.get(CARD_TYPE)).toBe(SmartPlantsPlantCard);
      expect(defined.size).toBe(1);
    } finally {
      Object.defineProperty(window, "customElements", { value: native, configurable: true, writable: true });
    }
    expect(window.customElements.get(CARD_TYPE)).toBe(SmartPlantsPlantCard);
  });
});

describe("loader retry", () => {
  const statics = SmartPlantsPlantCard as unknown as { _module: Promise<unknown> | null; retryDelayMs: number };
  const realLoad = SmartPlantsPlantCard.load;
  afterEach(() => { SmartPlantsPlantCard.load = realLoad; statics.retryDelayMs = 10_000; });
  const failOnce = () => {
    statics._module = null;
    statics.retryDelayMs = 300;
    const attempts: number[] = [];
    SmartPlantsPlantCard.load = attempt => { attempts.push(attempt); return attempts.length === 1 ? Promise.reject(new Error("offline")) : import("./plant-card.js"); };
    return attempts;
  };
  const place = (count: number, language = "en") => Array.from({ length: count }, () => {
    const card = document.createElement(CARD_TYPE) as SmartPlantsPlantCard;
    card.setConfig({ type: `custom:${CARD_TYPE}`, device_id: DEVICE });
    card.hass = cardHass({}, { language });
    document.body.append(card);
    return card;
  });
  const content = (card: SmartPlantsPlantCard) => card.shadowRoot!.querySelector("smart-plants-plant-card-content");
  const error = (card: SmartPlantsPlantCard) => card.shadowRoot!.querySelector(".error")?.textContent ?? null;
  it("shows an error and loads the card on the next attempt", async () => {
    const attempts = failOnce();
    const [card] = place(1, "de");
    await vi.waitFor(() => expect(error(card!)).toBe("Die Pflanzenkarte konnte nicht geladen werden. Gleich folgt ein neuer Versuch."));
    expect(card!.shadowRoot!.querySelector(".error")!.getAttribute("role")).toBe("alert");
    await vi.waitFor(() => expect(content(card!)).not.toBeNull());
    expect(error(card!)).toBeNull();
    expect(attempts.length).toBe(2);
    expect(attempts[1]).toBeGreaterThan(attempts[0]!);
  });
  it("retries once for several cards", async () => {
    const attempts = failOnce();
    const cards = place(3);
    await vi.waitFor(() => expect(cards.map(error)).toEqual(Array(3).fill("The plant card could not be loaded. Trying again shortly.")));
    await vi.waitFor(() => expect(cards.every(card => content(card) !== null)).toBe(true));
    expect(cards.map(error)).toEqual([null, null, null]);
    expect(attempts).toHaveLength(2);
  });
});

describe("loader", () => {
  it("lists the card in the picker once, with the catalog's name", async () => {
    const cards = (window as unknown as { customCards: { type: string; name: string; preview?: boolean }[] }).customCards;
    expect(cards.filter(card => card.type === CARD_TYPE)).toEqual([expect.objectContaining({ name: "Smart Plants plant card", preview: true })]);
    expect(PICKER_TEXT.en).toEqual({ name: en["plant_card.name"], description: en["plant_card.description"], load_error: en["plant_card.load_error"] });
    expect(PICKER_TEXT.de).toEqual({ name: de["plant_card.name"], description: de["plant_card.description"], load_error: de["plant_card.load_error"] });
    expect(pickerText("de-AT").name).toBe("Smart Plants Pflanzenkarte");
    expect(pickerText("fr").name).toBe("Smart Plants plant card");
  });
  it("sizes the card for masonry and sections views", () => {
    const card = document.createElement(CARD_TYPE) as SmartPlantsPlantCard;
    card.setConfig({ type: CARD_TYPE, device_id: DEVICE });
    expect(card.getCardSize()).toBe(6);
    card.setConfig({ type: CARD_TYPE, device_id: DEVICE, show_readings: false });
    expect(card.getCardSize()).toBe(4);
    card.setConfig({ type: CARD_TYPE, device_id: DEVICE, show_readings: false, show_watering: false });
    expect(card.getCardSize()).toBe(3);
    expect(card.getGridOptions()).toEqual({ columns: 6, min_columns: 6, rows: "auto" });
    expect(() => card.setConfig(null as unknown as { type: string })).toThrow();
  });
  it("offers the editor form and a stub config", async () => {
    const form = await SmartPlantsPlantCard.getConfigForm() as ReturnType<typeof getConfigForm>;
    expect(form.schema).toEqual([
      { name: "device_id", required: true, selector: { device: { filter: { integration: "smart_plants" } } } },
      { name: "show_readings", default: true, selector: { boolean: {} } },
      { name: "show_watering", default: true, selector: { boolean: {} } },
    ]);
    expect(await SmartPlantsPlantCard.getStubConfig(cardHass())).toEqual({ type: `custom:${CARD_TYPE}`, device_id: DEVICE, show_readings: true, show_watering: true });
    expect(getStubConfig({ states: {}, devices: {} })).toEqual({ show_readings: true, show_watering: true });
  });
  it("labels the editor in the document language", () => {
    document.documentElement.lang = "de";
    try {
      const form = getConfigForm() as { computeLabel: (s: { name: string }) => string; computeHelper: (s: { name: string }) => string | undefined };
      expect(form.computeLabel({ name: "device_id" })).toBe("Pflanze");
      expect(form.computeHelper({ name: "show_watering" })).toBe("Trägt Gießen für diese Pflanze ein");
      expect(form.computeHelper({ name: "device_id" })).toBeUndefined();
    } finally { document.documentElement.lang = ""; }
  });
});

describe("card", () => {
  it("shows the plant like the panel's overview card", async () => {
    const content = await mount(cardHass());
    const all = deepText(content);
    expect(all).toContain("Office Aloe");
    expect(all).toContain("Office · Aloe vera");
    expect(all).toContain("Needs water");
    expect(all).toContain("Soil moisture 12% is below the minimum of 20%");
    expect(all).toContain("Target 20–60%");
    expect(all).toContain("21.5 °C");
    expect(all).toMatch(/Watered \d+ (days|weeks|months) ago|Watered last/);
    expect($(content, "sp-reading-chip[role='battery']") ?? content.shadowRoot!.querySelectorAll("sp-reading-chip").length).toBeTruthy();
    expect($(content, ".tonal")!.getAttribute("aria-label")).toBe("Log watering for Office Aloe");
  });
  it("hides the readings and the watering when turned off", async () => {
    const content = await mount(cardHass(), { show_readings: false, show_watering: false });
    expect($(content, "sp-moisture-bar")).toBeNull();
    expect($(content, ".foot")).toBeNull();
    expect(text(content)).toContain("Office Aloe");
  });
  it("shows the care line, the snooze and a problem with more issues", async () => {
    const content = await mount(cardHass({
      "binary_sensor.office_aloe_care_due": { entity_id: "binary_sensor.office_aloe_care_due", state: "on", attributes: {} },
      "binary_sensor.office_aloe_sensor_stale": { entity_id: "binary_sensor.office_aloe_sensor_stale", state: "off", attributes: { snoozed: true, snoozed_until: "2099-11-01T23:59:59+00:00" } },
      "binary_sensor.office_aloe_needs_water": { entity_id: "binary_sensor.office_aloe_needs_water", state: "off", attributes: { last_watered: null } },
      "sensor.office_aloe_temperature": { entity_id: "sensor.office_aloe_temperature", state: "29.5", attributes: { unit_of_measurement: "°C" } },
      "binary_sensor.office_aloe_temperature_stress": { entity_id: "binary_sensor.office_aloe_temperature_stress", state: "on", attributes: { reason: "hot_stress", hot_threshold_celsius: 28, hot_clear_celsius: 27 } },
      "binary_sensor.office_aloe_low_battery": { entity_id: "binary_sensor.office_aloe_low_battery", state: "on", attributes: { reason: "low_battery", threshold_percent: 90 } },
    }));
    const all = deepText(content);
    expect(all).toContain("Care due");
    expect(all).toContain("Snoozed until");
    expect(all).toContain("Too hot");
    expect(all).toContain("+1");
    expect(all).toContain("Temperature 29.5 °C is above the maximum of 28 °C");
    expect(all).toContain("Not watered yet");
  });
  it("shows no sensors with an Assign link for admins only", async () => {
    const empty = { "sensor.office_aloe_soil_moisture": unavailable("sensor.office_aloe_soil_moisture"), "binary_sensor.office_aloe_needs_water": unavailable("binary_sensor.office_aloe_needs_water"),
      "binary_sensor.office_aloe_sensor_stale": { entity_id: "binary_sensor.office_aloe_sensor_stale", state: "off", attributes: { sources: 0 } },
      "sensor.office_aloe_temperature": null, "sensor.office_aloe_illuminance": null, "sensor.office_aloe_battery": null };
    const user = await mount(cardHass(empty));
    expect(deepText(user)).toContain("No sensors assigned yet");
    expect($(user, ".empty-box button")).toBeNull();
    expect($(user, ".last")).toBeNull();
    document.body.replaceChildren();
    const navigate = vi.fn();
    window.addEventListener("location-changed", navigate);
    const admin = await mount(cardHass(empty, { admin: true }));
    $(admin, ".empty-box button")!.click();
    expect(location.pathname).toBe(`/smart-plants/plant/${PLANT_ID}/sensors`);
    expect(navigate).toHaveBeenCalledOnce();
    window.removeEventListener("location-changed", navigate);
  });
  it("tells a moisture sensor that stopped reporting from no sensors", async () => {
    const content = await mount(cardHass({
      "sensor.office_aloe_soil_moisture": unavailable("sensor.office_aloe_soil_moisture"),
      "binary_sensor.office_aloe_needs_water": unavailable("binary_sensor.office_aloe_needs_water"),
      "binary_sensor.office_aloe_too_wet": unavailable("binary_sensor.office_aloe_too_wet"),
    }, { admin: true }));
    const all = deepText(content);
    expect(all).toContain("No recent data");
    expect(all).toContain("Soil moisture: sensor is not reporting");
    expect(all).not.toContain("No sensors assigned yet");
    // The band and the last watering are not reported while the sensors are unavailable.
    expect(all).not.toContain("Target");
    expect($(content, ".last")).toBeNull();
    expect($<HTMLButtonElement>(content, ".tonal")!.disabled).toBe(false);
  });
  it("disables the button of a paused plant", async () => {
    const hass = cardHass();
    for (const id of Object.keys(hass.states)) if (id.includes("office_aloe")) hass.states[id] = unavailable(id);
    const content = await mount(hass);
    expect(deepText(content)).toContain("Paused");
    expect(deepText(content)).toContain("Monitoring is paused");
    expect($<HTMLButtonElement>(content, ".tonal")!.disabled).toBe(true);
    expect($(content, "sp-moisture-bar")).toBeNull();
  });
  it("warns when the plant is gone or not chosen", async () => {
    const hass = cardHass();
    delete hass.devices![DEVICE];
    const content = await mount(hass);
    expect($(content, "[role='alert']")!.textContent).toContain("Plant not found");
    document.body.replaceChildren();
    const unset = await mount(cardHass(), { device_id: undefined });
    expect(text(unset)).toContain("Pick a plant in the card editor.");
  });
  it("speaks German when Home Assistant does", async () => {
    const content = await mount(cardHass({}, { language: "de" }));
    const all = deepText(content);
    expect(all).toContain("Braucht Wasser");
    expect(all).toContain("Bodenfeuchte 12 % liegt unter dem Minimum von 20 %");
    expect($(content, ".tonal")!.textContent).toContain("Gegossen");
  });
});

describe("tap on the name", () => {
  it("opens the plant in the panel for admins", async () => {
    const content = await mount(cardHass({}, { admin: true }));
    const name = $(content, ".name")!;
    expect(name.getAttribute("title")).toBe("Open Office Aloe in Smart Plants");
    name.click();
    expect(location.pathname).toBe(`/smart-plants/plant/${PLANT_ID}`);
  });
  it("opens the more-info dialog for other users", async () => {
    const content = await mount(cardHass());
    const more = vi.fn();
    content.addEventListener("hass-more-info", more);
    $(content, ".name")!.click();
    expect((more.mock.calls[0]![0] as CustomEvent).detail).toEqual({ entityId: "sensor.office_aloe_soil_moisture" });
  });
});

describe("Watered button", () => {
  const toasts = (content: Element) => {
    const seen: { message: string; action?: { text: string; action: () => void } }[] = [];
    content.addEventListener("hass-notification", e => { seen.push((e as CustomEvent).detail); });
    return seen;
  };
  it("logs a watering with the action and offers Undo to admins", async () => {
    const hass = cardHass({}, { admin: true });
    const content = await mount(hass);
    const seen = toasts(content);
    $(content, ".tonal")!.click();
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    const [domain, service, data, target, notify] = hass.calls[0]!;
    expect([domain, service, target, notify]).toEqual(["smart_plants", "log_care", { device_id: DEVICE }, false]);
    expect(data).toMatchObject({ kind: "watering" });
    expect((data as { occurred_at: string }).occurred_at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
    expect(seen[0]).toMatchObject({ message: "Watering logged for Office Aloe", action: { text: "Undo" } });
    seen[0]!.action!.action();
    await vi.waitFor(() => expect(seen).toHaveLength(2));
    expect(hass.ws).toEqual([
      { type: "smart_plants/care/list", plant_id: PLANT_ID },
      { type: "smart_plants/care/list", plant_id: PLANT_ID },
      { type: "smart_plants/care/delete", plant_id: PLANT_ID, expected_revision: 7, event_id: "event-1" },
    ]);
    expect(seen[1]!.message).toBe("Watering removed for Office Aloe");
  });
  it("logs without Undo for other users", async () => {
    const hass = cardHass();
    const content = await mount(hass);
    const seen = toasts(content);
    $(content, ".tonal")!.click();
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).toEqual({ message: "Watering logged for Office Aloe", duration: 4000 });
  })
  // A care history whose log_care action records the watering through `record`.
  const history = (hass: ReturnType<typeof cardHass>, events: { id: string; kind: string; occurred_at: string }[], record: (submitted: string) => void) => {
    hass.callService = async (...args: unknown[]) => { hass.calls.push(args); record((args[2] as { occurred_at: string }).occurred_at); };
    hass.callWS = async <T>(msg: Record<string, unknown>): Promise<T> => { hass.ws.push(msg); return (msg.type === "smart_plants/care/list" ? { revision: 3, events: events.map(e => ({ ...e })) } : {}) as T; };
  };
  const undo = async (hass: ReturnType<typeof cardHass>) => {
    const content = await mount(hass);
    const seen = toasts(content);
    $(content, ".tonal")!.click();
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    seen[0]!.action!.action();
    await vi.waitFor(() => expect(seen).toHaveLength(2));
    return { seen, deleted: hass.ws.filter(m => m.type === "smart_plants/care/delete").map(m => m.event_id) };
  };
  it("undoes its own watering after the backend moved its time", async () => {
    const hass = cardHass({}, { admin: true });
    const events = [{ id: "earlier", kind: "watering", occurred_at: "2026-09-11T12:00:00+00:00" }];
    // Another watering already has the submitted second; the backend records ours a little earlier.
    history(hass, events, submitted => {
      events[0]!.occurred_at = submitted;
      events.push({ id: "mine", kind: "watering", occurred_at: new Date(Date.parse(submitted) - 3000).toISOString() });
    });
    const { seen, deleted } = await undo(hass);
    expect(deleted).toEqual(["mine"]);
    expect(seen[1]!.message).toBe("Watering removed for Office Aloe");
  });
  it("picks the watering closest to its time when another one was logged meanwhile", async () => {
    const hass = cardHass({}, { admin: true });
    const events: { id: string; kind: string; occurred_at: string }[] = [{ id: "fertilizer", kind: "fertilizing", occurred_at: "2026-09-11T12:00:00+00:00" }];
    history(hass, events, submitted => {
      events.push({ id: "someone-else", kind: "watering", occurred_at: new Date(Date.parse(submitted) - 3_600_000).toISOString() });
      events.push({ id: "mine", kind: "watering", occurred_at: submitted });
    });
    const { deleted } = await undo(hass);
    expect(deleted).toEqual(["mine"]);
  });
  it("offers no Undo when the care history cannot be read", async () => {
    const hass = cardHass({}, { admin: true });
    hass.callWS = async () => { throw { code: "unknown_error", message: "x" }; };
    const content = await mount(hass);
    const seen = toasts(content);
    $(content, ".tonal")!.click();
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).toEqual({ message: "Watering logged for Office Aloe", duration: 4000 });
    expect(hass.calls).toHaveLength(1);
  });
  it("keeps the action call unchanged for other users", async () => {
    const hass = cardHass();
    const content = await mount(hass);
    $(content, ".tonal")!.click();
    await vi.waitFor(() => expect(hass.calls).toHaveLength(1));
    expect(hass.ws).toEqual([]);
  });
  it("explains a refused watering", async () => {
    const hass = cardHass({}, { language: "de" });
    hass.callService = async () => { throw { code: "unauthorized", message: "Unauthorized" }; };
    const content = await mount(hass);
    const seen = toasts(content);
    $(content, ".tonal")!.click();
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]!.message).toBe("Du darfst keine Pflege eintragen");
    hass.callService = async () => { throw { code: "home_assistant_error", message: "x" }; };
    $(content, ".tonal")!.click();
    await vi.waitFor(() => expect(seen).toHaveLength(2));
    expect(seen[1]!.message).toBe("Gießen für Office Aloe konnte nicht eingetragen werden");
  });
  it("says so when Undo cannot find the watering", async () => {
    const hass = cardHass({}, { admin: true });
    hass.callWS = async <T>() => ({ revision: 1, events: [] }) as T;
    const content = await mount(hass);
    const seen = toasts(content);
    $(content, ".tonal")!.click();
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    seen[0]!.action!.action();
    await vi.waitFor(() => expect(seen).toHaveLength(2));
    expect(seen[1]!.message).toBe("Watering could not be removed for Office Aloe");
  });
});

describe("photo", () => {
  it("is fetched for admins only", async () => {
    const admin = cardHass({}, { admin: true });
    const fetches: string[] = [];
    admin.fetchWithAuth = async (path: string) => { fetches.push(path); return new Response(new Blob(["x"], { type: "image/webp" })); };
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:photo");
    const content = await mount(admin);
    await vi.waitFor(() => expect($<HTMLElement & { src: string | null }>(content, "sp-plant-avatar")!.src).toBe("blob:photo"));
    expect(fetches).toEqual([`/api/smart_plants/plants/${PLANT_ID}/image`]);
    document.body.replaceChildren();
    const user = cardHass();
    user.fetchWithAuth = async (path: string) => { fetches.push(path); return new Response(null, { status: 403 }); };
    const other = await mount(user);
    expect($<HTMLElement & { src: string | null }>(other, "sp-plant-avatar")!.src).toBeNull();
    expect(fetches).toHaveLength(1);
  });
});
