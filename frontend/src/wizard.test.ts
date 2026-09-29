import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsWizard } from "./wizard.js";
import { button, capabilities, click, deferred, draft, field, fill, harness, pngFile, preview, sample, settle } from "./test-helpers.js";
import type { HADevice, HAEntity, HAState, HomeAssistantLike, PanelCapabilities } from "./types.js";

const reading = (entity_id: string, state: string, friendly_name: string, device_class: string, unit_of_measurement: string): HAState =>
  ({ entity_id, state, attributes: { friendly_name, device_class, unit_of_measurement }, last_updated: "2026-09-10T00:00:00Z" });
const registry = (n: number, entity_id: string, extra: Partial<HAEntity> = {}): HAEntity =>
  ({ id: `uuid-${n}`, entity_id, device_id: null, unique_id: `mock-${n}`, platform: "mock", ...extra });
// Synthetic sensors: some in the kitchen by entity or device area, one elsewhere,
// one without registry entry, and the plant integration's own computed sensor.
const entities: HAEntity[] = [
  registry(1, "sensor.mock_soil", { area_id: "kitchen" }),
  registry(2, "sensor.mock_kitchen_temperature", { device_id: "kitchen-climate" }),
  registry(3, "sensor.mock_garden_humidity", { area_id: "garden" }),
  registry(4, "sensor.mock_kitchen_humidity", { area_id: "kitchen" }),
  registry(5, "sensor.aloe_soil_moisture", { platform: "smart_plants", area_id: "kitchen" }),
  registry(6, "sensor.mock_kitchen_soil_temperature", { area_id: "kitchen" }),
];
const devices: HADevice[] = [{ id: "kitchen-climate", area_id: "kitchen", identifiers: [["mock", "climate"]] }];
const states: Record<string, HAState> = Object.fromEntries([
  reading("sensor.mock_soil", "44", "Rubber Plant Moisture", "moisture", "%"),
  reading("sensor.mock_spare_soil", "12", "Spare Moisture Probe", "moisture", "%"),
  reading("sensor.mock_kitchen_temperature", "21.5", "Kitchen Temperature", "temperature", "°C"),
  reading("sensor.mock_garden_humidity", "70", "Garden Humidity", "humidity", "%"),
  reading("sensor.mock_kitchen_humidity", "51", "Kitchen Humidity", "humidity", "%"),
  reading("sensor.aloe_soil_moisture", "30", "Aloe Soil moisture", "moisture", "%"),
  reading("sensor.mock_kitchen_soil_temperature", "18", "Kitchen Soil Temperature", "temperature", "°C"),
  reading("sensor.mock_pot_battery", "80", "Pot Battery", "battery", "%"),
].map(s => [s.entity_id, s]));
const areas = [{ area_id: "kitchen", name: "Kitchen" }, { area_id: "garden", name: "Garden" }];

async function mount(hass: HomeAssistantLike, caps: PanelCapabilities = capabilities): Promise<SmartPlantsWizard> {
  const element = new SmartPlantsWizard(); element.hass = hass; element.capabilities = caps;
  element.areas = areas; element.entities = entities; element.devices = devices; element.states = states;
  document.body.append(element); await settle(element); return element;
}
const root = (el: SmartPlantsWizard) => el.shadowRoot!;
const text = (el: SmartPlantsWizard) => root(el).textContent?.replace(/\s+/g, " ") ?? "";
// Buttons whose visible text is short ("Add", "Edit") or an icon carry a full accessible name.
function labelled(el: SmartPlantsWizard, name: string): HTMLButtonElement {
  const found = [...root(el).querySelectorAll("button")].find(b => b.getAttribute("aria-label") === name);
  expect(found, `button labelled ${name}`).toBeDefined(); return found!;
}
async function press(el: SmartPlantsWizard, name: string): Promise<void> { labelled(el, name).click(); await settle(el); }
async function open(el: SmartPlantsWizard, section: "species" | "details"): Promise<void> {
  const details = root(el).querySelector<HTMLDetailsElement>(`details[data-section="${section}"]`)!;
  details.open = true; details.dispatchEvent(new Event("toggle")); await settle(el);
}
async function toReview(el: SmartPlantsWizard, name = "My Aloe"): Promise<void> {
  await fill(el, "Plant name", name); await click(el, "Next"); await click(el, "Skip for now");
}
async function choosePhoto(el: SmartPlantsWizard, file: File): Promise<void> {
  const input = root(el).querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", { value: [file], configurable: true }); input.dispatchEvent(new Event("change")); await settle(el); await settle(el);
}
const heading = (el: SmartPlantsWizard) => root(el).querySelector("h2")?.textContent;

beforeEach(() => {
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 640, height: 480, close: vi.fn() })));
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:wizard-photo"); vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
});
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("three-step creation wizard", () => {
  it("creates a plant with only a name after the final confirmation, with exact fields, and shows the confirmation", async () => {
    const h = harness([]); const el = await mount(h.hass); const created = vi.fn(); el.addEventListener("plant-created", created);
    expect(text(el)).toContain("Step 1 of 3 · Plant");
    await fill(el, "Plant name", "My Aloe"); await click(el, "Next");
    expect(text(el)).toContain("Step 2 of 3 · Sensors");
    expect(button(root(el), "Skip for now")).toBeDefined();
    await click(el, "Skip for now");
    expect(heading(el)).toBe("Check and create");
    expect(text(el)).toContain("Without a soil moisture sensor there are no watering alerts.");
    expect(h.calls.map(c => c.type)).toEqual(["smart_plants/wizard/start"]);
    await click(el, "Create plant");
    expect(h.calls.at(-1)).toEqual({ type: "smart_plants/wizard/create", draft_id: draft.draft_id, draft_token: draft.draft_token, expected_revision: 0, confirmed: true, name: "My Aloe", acquired_at: null, area_id: null, placement: null, category: null, tags: [], moisture: { sources: [], primary_entity_id: null, aggregation: "primary", stale_after_seconds: 21600, threshold_overrides: { min: null, target: null, max: null } }, species: null });
    expect(created).toHaveBeenCalledOnce();
    expect(text(el)).toContain(`${sample.name} is ready`);
    expect(text(el)).toContain("The plant is now a device in Home Assistant.");
    expect(root(el).activeElement?.tagName).toBe("H2");
    expect(text(el)).not.toContain(draft.draft_token);
  });

  it("creates soil moisture plus two other sensors in one request, each with its main sensor", async () => {
    const h = harness([]); const el = await mount(h.hass);
    await fill(el, "Plant name", "Kitchen Fern"); await fill(el, "Area", "kitchen"); await click(el, "Next");
    await fill(el, "Soil moisture sensor", "sensor.mock_soil");
    expect(text(el)).toContain("Rubber Plant Moisture");
    expect(text(el)).toContain("Soil moisture · now 44%");
    await press(el, "Add Kitchen Temperature");
    await click(el, "Add another sensor"); await click(el, "Battery");
    await fill(el, "Battery sensor", "sensor.mock_pot_battery");
    expect(button(root(el), "Next")).toBeDefined();
    await click(el, "Next");
    expect(text(el)).toContain("Kitchen Temperature, Pot Battery");
    await click(el, "Create plant");
    const creates = h.calls.filter(c => c.type === "smart_plants/wizard/create");
    expect(creates).toHaveLength(1);
    expect(creates[0]).toMatchObject({ area_id: "kitchen",
      moisture: { sources: [{ entity_id: "sensor.mock_soil", registry_id: "uuid-1" }], primary_entity_id: "sensor.mock_soil", aggregation: "primary" },
      roles: { temperature: { sources: [{ entity_id: "sensor.mock_kitchen_temperature", registry_id: "uuid-2" }], primary_entity_id: "sensor.mock_kitchen_temperature" },
        battery: { sources: [{ entity_id: "sensor.mock_pot_battery", registry_id: null }], primary_entity_id: "sensor.mock_pot_battery" } } });
    expect(Object.keys(creates[0]!.roles as object)).toEqual(["temperature", "battery"]);
    expect(h.calls.some(c => String(c.type).startsWith("smart_plants/roles/"))).toBe(false);
  });

  it("suggests sensors from the chosen area by entity or device area, never the plant integration's own sensors", async () => {
    const el = await mount(harness([]).hass);
    await fill(el, "Plant name", "Fern"); await click(el, "Next");
    expect(text(el)).not.toContain("Suggested from");
    await click(el, "Back"); await fill(el, "Area", "kitchen"); await click(el, "Next");
    expect(text(el)).toContain("Suggested from Kitchen");
    const suggested = [...root(el).querySelectorAll(".item.sugg")].map(row => [...row.querySelectorAll(":scope > div > div")].map(line => line.textContent).join("|"));
    expect(suggested).toEqual([
      "Rubber Plant Moisture|Soil moisture · now 44%",
      "Kitchen Temperature|Temperature · now 21.5 °C",
      "Kitchen Humidity|Humidity · now 51%",
      "Kitchen Soil Temperature|Soil temperature · now 18 °C",
    ]);
    await press(el, "Add Rubber Plant Moisture");
    expect(root(el).querySelector("select")).toBeNull();
    expect(root(el).querySelectorAll(".item.sugg")).toHaveLength(3);
    await press(el, "Remove Rubber Plant Moisture");
    const options = [...field(root(el), "Soil moisture sensor").querySelectorAll("option")].map(o => o.value);
    expect(options).toEqual(["", "sensor.mock_soil", "sensor.mock_spare_soil"]);
    expect(field(root(el), "Soil moisture sensor").querySelector("optgroup")?.getAttribute("label")).toBe("In Kitchen");
  });

  it("keeps every choice when going back and focuses the step heading", async () => {
    const el = await mount(harness([]).hass);
    await fill(el, "Plant name", "Fern"); await fill(el, "Area", "kitchen"); await choosePhoto(el, pngFile());
    await click(el, "Next"); expect(root(el).activeElement?.tagName).toBe("H2");
    await fill(el, "Soil moisture sensor", "sensor.mock_soil"); await click(el, "Next");
    await open(el, "species"); await fill(el, "Ideal", "40"); await fill(el, "Scientific name", "Nephrolepis exaltata");
    await open(el, "details"); await fill(el, "Tags", "shade, shade, fern"); await fill(el, "Placement", "balcony");
    await click(el, "Back");
    expect(text(el)).toContain("Rubber Plant Moisture");
    await click(el, "Back");
    expect((field(root(el), "Plant name") as HTMLInputElement).value).toBe("Fern");
    expect((field(root(el), "Area") as HTMLSelectElement).value).toBe("kitchen");
    expect(text(el)).toContain("image.png");
    await click(el, "Next"); await click(el, "Next");
    expect(text(el)).toContain("Kitchen · with photo");
    expect(text(el)).toContain("Nephrolepis exaltata · needs water below 15%, too wet above 55%");
    expect((field(root(el), "Ideal") as HTMLInputElement).value).toBe("40");
    expect((field(root(el), "Tags") as HTMLInputElement).value).toBe("shade, shade, fern");
    await press(el, "Edit plant"); expect(heading(el)).toBe("Name your plant");
  });

  it("blocks an empty name and invalid watering targets without any write", async () => {
    const h = harness([]); const el = await mount(h.hass);
    await click(el, "Next"); expect(text(el)).toContain("Enter a plant name.");
    expect(heading(el)).toBe("Name your plant");
    await toReview(el, "Aloe");
    await open(el, "species"); await fill(el, "Ideal", "10");
    await click(el, "Create plant");
    expect(text(el)).toContain("Check the watering targets");
    expect(h.calls.map(c => c.type)).toEqual(["smart_plants/wizard/start"]);
    await click(el, "Reset to defaults"); await click(el, "Create plant");
    expect(h.calls.at(-1)).toMatchObject({ type: "smart_plants/wizard/create", moisture: { threshold_overrides: { min: null, target: null, max: null } } });
  });

  it("stores a species only after explicit acceptance and sends only the bound preview token", async () => {
    const h = harness([]); const el = await mount(h.hass);
    await toReview(el, "Aloe"); await open(el, "species");
    await fill(el, "Search OpenPlantBook", "Aloe"); await click(el, "Search"); await click(el, "Aloe · Aloe vera");
    expect(text(el)).toContain("Not supplied (built-in default applies)");
    expect(h.calls.find(c => c.type === "smart_plants/wizard/preview")).toEqual({ type: "smart_plants/wizard/preview", draft_id: draft.draft_id, draft_token: draft.draft_token, expected_revision: 0, provider: "openplantbook", provider_ref: "aloe", locale: "en" });
    await click(el, "Create plant");
    expect(text(el)).toContain("Review and explicitly accept the selected species");
    expect(h.calls.filter(c => c.type === "smart_plants/wizard/create")).toHaveLength(0);
    const accept = root(el).querySelector<HTMLInputElement>('input[type="checkbox"]')!; accept.checked = true; accept.dispatchEvent(new Event("change")); await settle(el);
    expect((field(root(el), "Needs water below") as HTMLInputElement).value).toBe("20");
    expect((field(root(el), "Too wet above") as HTMLInputElement).value).toBe("60");
    expect(text(el)).toContain("Aloe vera · targets from OpenPlantBook");
    await click(el, "Create plant");
    expect(h.calls.at(-1)).toMatchObject({ accepted_preview: { preview_token: preview.preview_token, provider: "openplantbook", operation: "select" }, moisture: { threshold_overrides: { min: null, target: null, max: null } } });
    expect(h.calls.at(-1)).not.toHaveProperty("species"); expect(h.calls.at(-1)).not.toHaveProperty("snapshot");
  });

  it.each(["provider_disabled", "provider_authentication", "provider_rate_limit", "provider_timeout", "provider_outage", "provider_malformed_response"])("still creates with a manual species after %s", async code => {
    const h = harness([], msg => { if (msg.type === "smart_plants/species/search") throw { code, message: "Provider unavailable" }; }); const el = await mount(h.hass);
    await toReview(el, "Manual Aloe"); await open(el, "species");
    await fill(el, "Search OpenPlantBook", "Aloe"); await click(el, "Search");
    expect(text(el)).toContain(code); await click(el, "Continue manually"); await fill(el, "Common name", "My species");
    await click(el, "Create plant");
    expect(h.calls.at(-1)).toMatchObject({ species: { provider: "manual", snapshot: { common_name: "My species", attribution: "User supplied" } } });
  });

  it("explains how to set up OpenPlantBook when it is unavailable and never blocks manual creation", async () => {
    const h = harness([]);
    const el = await mount(h.hass, { ...capabilities, providers: [capabilities.providers[0]!, { provider: "openplantbook", available: false, search_supported: true }] });
    await toReview(el, "Offline plant"); await open(el, "species");
    expect(text(el)).toContain("Species search needs OpenPlantBook.");
    expect(root(el).querySelector('a[href="https://open.plantbook.io/apikey/"]')).not.toBeNull();
    expect(root(el).querySelector('a[href="/config/integrations/integration/smart_plants"]')).not.toBeNull();
    expect([...root(el).querySelectorAll("label")].some(label => label.textContent?.includes("Search OpenPlantBook"))).toBe(false);
    await click(el, "Create plant");
    expect(h.calls.map(c => c.type)).toEqual(["smart_plants/wizard/start", "smart_plants/wizard/create"]);
    expect(h.calls.at(-1)).toMatchObject({ species: null });
  });

  it("deduplicates double submission and retries an identical request after a lost response and reconnect", async () => {
    const pending = deferred<unknown>(); let count = 0;
    const h = harness([], msg => { if (msg.type === "smart_plants/wizard/create") { count++; return count === 1 ? pending.promise : { plant: sample }; } return undefined; });
    const el = await mount(h.hass); await fill(el, "Plant name", "Aloe"); await fill(el, "Area", "kitchen"); await click(el, "Next");
    await fill(el, "Soil moisture sensor", "sensor.mock_soil"); await click(el, "Next");
    button(root(el), "Create plant").click(); button(root(el), "Create plant").click(); await settle(el); expect(count).toBe(1);
    pending.reject({ code: "unknown_error", message: "internal error" }); await settle(el);
    expect(text(el)).toContain("The final request is retained unchanged");
    expect(button(root(el), "Back").disabled).toBe(true); expect(labelled(el, "Edit plant").closest("fieldset")?.disabled).toBe(true);
    el.blocked = true; await settle(el); expect(button(root(el), "Retry same creation request").disabled).toBe(true);
    el.blocked = false; await settle(el); await click(el, "Retry same creation request");
    const requests = h.calls.filter(c => c.type === "smart_plants/wizard/create"); expect(requests).toHaveLength(2); expect(requests[1]).toEqual(requests[0]);
    expect(h.calls.filter(c => c.type === "smart_plants/wizard/start")).toHaveLength(1);
    expect(text(el)).toContain(`${sample.name} is ready`);
  });

  it("retains an uncertain creation across reconnect and ignores its late success", async () => {
    const pending = deferred<unknown>(); let creates = 0;
    const h = harness([], msg => msg.type === "smart_plants/wizard/create" && ++creates === 1 ? pending.promise : undefined);
    const el = await mount(h.hass); const created = vi.fn(); el.addEventListener("plant-created", created); await toReview(el); await click(el, "Create plant");
    el.blocked = true; await settle(el); el.blocked = false; await settle(el); pending.resolve({ plant: sample }); await settle(el); expect(created).not.toHaveBeenCalled();
    await click(el, "Retry same creation request"); expect(created).toHaveBeenCalledOnce(); const requests = h.calls.filter(c => c.type === "smart_plants/wizard/create"); expect(requests[0]).toEqual(requests[1]);
  });

  it("ignores a late start result after disconnect and allows a fresh start", async () => {
    const pending = deferred<unknown>(); let starts = 0;
    const h = harness([], msg => msg.type === "smart_plants/wizard/start" && ++starts === 1 ? pending.promise : undefined);
    const el = await mount(h.hass); el.blocked = true; await settle(el); pending.resolve(draft); await settle(el);
    el.blocked = false; await settle(el); expect(button(root(el), "Next").disabled).toBe(true);
    await click(el, "Retry starting draft"); expect(button(root(el), "Next").disabled).toBe(false);
  });

  it("allows a fresh draft after a definite rejection while keeping the entered fields", async () => {
    const h = harness([], msg => { if (msg.type === "smart_plants/wizard/create") throw { code: "invalid_format", message: "draft expired" }; }); const el = await mount(h.hass);
    await toReview(el); await click(el, "Create plant"); await click(el, "Start fresh draft retaining editable fields");
    expect((field(root(el), "Plant name") as HTMLInputElement).value).toBe("My Aloe"); expect(h.calls.filter(c => c.type === "smart_plants/wizard/start")).toHaveLength(2);
  });

  it("ignores late previews after disconnect and requires a new review", async () => {
    const pending = deferred<unknown>(); const h = harness([], msg => msg.type === "smart_plants/wizard/preview" ? pending.promise : undefined); const el = await mount(h.hass);
    await toReview(el, "Aloe"); await open(el, "species"); await fill(el, "Search OpenPlantBook", "Aloe"); await click(el, "Search"); await click(el, "Aloe · Aloe vera");
    el.blocked = true; await settle(el); pending.resolve(preview); await settle(el);
    expect(text(el)).not.toContain("I reviewed and accept");
  });

  it("drops an accepted species when a different search is entered", async () => {
    const h = harness([]); const el = await mount(h.hass); await toReview(el, "Aloe"); await open(el, "species");
    await fill(el, "Search OpenPlantBook", "Aloe"); await click(el, "Search"); await click(el, "Aloe · Aloe vera");
    const accept = root(el).querySelector<HTMLInputElement>('input[type="checkbox"]')!; accept.checked = true; accept.dispatchEvent(new Event("change")); await settle(el);
    await click(el, "Don’t use this species"); await fill(el, "Search OpenPlantBook", "Fern");
    await click(el, "Create plant");
    expect(h.calls.at(-1)).toMatchObject({ species: null }); expect(h.calls.at(-1)).not.toHaveProperty("accepted_preview");
  });

  it("lets users fix incompatible species targets without inferring a value", async () => {
    const h = harness([], msg => msg.type === "smart_plants/wizard/preview" ? { ...preview, snapshot: { ...preview.snapshot, threshold_defaults: { moisture: { min: 40, max: 60 } } } } : undefined);
    const el = await mount(h.hass); await toReview(el, "Aloe"); await open(el, "species");
    await fill(el, "Search OpenPlantBook", "Aloe"); await click(el, "Search"); await click(el, "Aloe · Aloe vera");
    const accept = root(el).querySelector<HTMLInputElement>('input[type="checkbox"]')!; accept.checked = true; accept.dispatchEvent(new Event("change")); await settle(el);
    await click(el, "Create plant"); expect(text(el)).toContain("Check the watering targets");
    await fill(el, "Ideal", "50"); await click(el, "Create plant");
    expect(h.calls.at(-1)).toMatchObject({ moisture: { threshold_overrides: { min: null, target: 50, max: null } } });
  });

  it("checks a photo when it is chosen, shows it with Remove and hands it over after creation", async () => {
    const el = await mount(harness([]).hass); const created = vi.fn(); el.addEventListener("plant-created", created);
    await fill(el, "Plant name", "Photo plant");
    await choosePhoto(el, new File(["not an image"], "notes.png", { type: "image/png" }));
    expect(text(el)).toContain("Image content does not match");
    expect(root(el).querySelector("img")).toBeNull();
    await choosePhoto(el, pngFile());
    expect(root(el).querySelector("img")?.getAttribute("src")).toBe("blob:wizard-photo");
    expect(text(el)).toContain("Uploaded when you create the plant");
    await press(el, "Remove photo"); expect(root(el).querySelector("img")).toBeNull();
    await choosePhoto(el, pngFile()); await click(el, "Next"); await click(el, "Skip for now");
    expect(text(el)).toContain("No area · with photo");
    await click(el, "Create plant");
    expect((created.mock.calls[0]![0] as CustomEvent<{ photo: File }>).detail.photo.name).toBe("image.png");
  });

  it("offers going back to the plants or adding another plant with a fresh draft", async () => {
    const h = harness([]); const el = await mount(h.hass); const close = vi.fn(); const restart = vi.fn();
    el.addEventListener("wizard-close", close); el.addEventListener("wizard-restart", restart);
    await click(el, "Cancel"); expect(close).toHaveBeenCalledOnce();
    await toReview(el); await click(el, "Create plant");
    el.photoStatus = "Selected photo uploaded."; await settle(el); expect(text(el)).toContain("Selected photo uploaded.");
    await click(el, "Add another plant");
    expect(restart).toHaveBeenCalledOnce(); expect(heading(el)).toBe("Name your plant");
    expect((field(root(el), "Plant name") as HTMLInputElement).value).toBe("");
    expect(h.calls.filter(c => c.type === "smart_plants/wizard/start")).toHaveLength(2);
    await toReview(el, "Second"); await click(el, "Create plant"); await click(el, "Back to plants");
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("uses German texts with the plant page's target labels", async () => {
    const h = harness([]); h.hass.language = "de"; const el = await mount(h.hass);
    expect(text(el)).toContain("Schritt 1 von 3 · Pflanze");
    await fill(el, "Pflanzenname", "Basilikum"); await click(el, "Weiter");
    expect(button(root(el), "Vorerst überspringen")).toBeDefined(); await click(el, "Vorerst überspringen");
    await open(el, "species");
    expect(text(el)).toContain("Braucht Wasser unter"); expect(text(el)).toContain("Zu nass über");
    await click(el, "Pflanze erstellen"); expect(text(el)).toContain(`${sample.name} ist bereit`);
  });
});
