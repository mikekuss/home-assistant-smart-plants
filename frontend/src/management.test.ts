import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import type { SmartPlantsWizard } from "./wizard.js";
import { button, capabilities, click, deferred, field, fill, harness, overviewOf, panelText, pngFile, preview, role, sample, settle, snapshot } from "./test-helpers.js";
import type { HAEntity, HAState, HomeAssistantLike, PlantRecord } from "./types.js";

async function mount(hass: HomeAssistantLike): Promise<SmartPlantsPanel> {
  const el = new SmartPlantsPanel(); el.hass = hass; document.body.append(el); await settle(el); return el;
}
// Opens the plant's Settings tab with the name, area and species editors open.
async function detail(hass: HomeAssistantLike, section = "Settings"): Promise<SmartPlantsPanel> {
  const el = await mount(hass); await click(el, "Aloe"); await click(el, section);
  if (section === "Settings") {
    for (const name of ["Rename", "Change area", "Find species", "Change species"]) {
      const target = [...el.shadowRoot!.querySelectorAll("button")].find(b => b.textContent?.trim() === name);
      if (target) { target.click(); await settle(el); }
    }
  }
  return el;
}
// The dialog's Cancel button; the Settings rows have their own Cancel buttons.
function dialogCancel(el: SmartPlantsPanel): HTMLButtonElement { return el.shadowRoot!.querySelector<HTMLButtonElement>("dialog .actions button")!; }
async function cancelDialog(el: SmartPlantsPanel): Promise<void> { dialogCancel(el).click(); await settle(el); }
// Opens the soil moisture sensor list (pick) or how its sensors combine.
async function openMoisture(el: SmartPlantsPanel, mode: "pick" | "combine"): Promise<void> {
  if (mode === "combine") {
    if (el.shadowRoot!.querySelector("dl.sensors #moisture-sources-editor")) return;
    const toggle = [...el.shadowRoot!.querySelectorAll("dl.sensors dt")].find(d => d.textContent === "Soil moisture")!.nextElementSibling!.querySelector<HTMLButtonElement>("button.source-toggle")!;
    toggle.click(); await settle(el); return;
  }
  const add = el.shadowRoot!.querySelector("ha-dropdown.add-sensor");
  if (add && [...add.querySelectorAll("ha-dropdown-item")].some(i => i.getAttribute("value") === "moisture")) {
    add.dispatchEvent(new CustomEvent("wa-select", { bubbles: true, composed: true, detail: { item: { value: "moisture" } } })); await settle(el);
  } else await click(el, "Change soil moisture sensors");
}
const entity: HAEntity = { id: "uuid-1", entity_id: "sensor.soil", device_id: "source-device", unique_id: "soil", platform: "test" };
const sourceState: HAState = { entity_id: "sensor.soil", state: "28", attributes: { device_class: "moisture", unit_of_measurement: "%", friendly_name: "Soil probe" }, last_updated: "2026-09-10T00:00:00Z" };

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(function (this: HTMLDialogElement) { this.open = true; });
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (this: HTMLDialogElement) { this.open = false; });
});
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("overview and lifecycle", () => {
  it.each([false, true])("replayed creation never uploads its original photo after a later photo change, removed=%s", async removed => {
    let created: PlantRecord | null = null; let attempts = 0;
    const h = harness([sample], msg => {
      if (msg.type === "smart_plants/plants/list") return { plants: created ? [sample, created] : [sample] };
      if (msg.type === "smart_plants/wizard/create") {
        if (++attempts === 1) { created = { ...structuredClone(sample), id: "replayed", name: "Replayed plant" }; throw { code: "unknown_error" }; }
        return { plant: created };
      }
      return undefined;
    });
    const fetch = vi.fn(async (_input: string, _init: RequestInit) => new Response(new Blob(["stored-webp"], { type: "image/webp" })));
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:stored-photo"); vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1, height: 1, close: vi.fn() })));
    const el = await mount(h.hass); await click(el, "Add plant");
    const wizard = el.shadowRoot!.querySelector<SmartPlantsWizard>("smart-plants-wizard")!; await settle(wizard);
    await fill(wizard, "Plant name", "Replayed plant");
    const input = wizard.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { value: [pngFile()] }); input.dispatchEvent(new Event("change")); await settle(wizard); await settle(wizard);
    await click(wizard, "Next"); await click(wizard, "Skip for now");
    await click(wizard, "Create plant"); await click(el, "Back to overview");
    // Another admin replaces the photo, then optionally removes it. A null
    // image at revision 3 must not be mistaken for a pristine new plant.
    created = { ...structuredClone(sample), id: "replayed", name: "Replayed plant", revision: removed ? 3 : 2, image: removed ? null : { id: "newer-photo", content_type: "image/webp", width: 1, height: 1, created_at: sample.created_at } };
    const before = structuredClone(created);
    await click(el, "Refresh"); await click(el, "Add plant"); await settle(wizard);
    await click(wizard, "Retry same creation request"); await settle(el); await settle(el);
    const requests = h.calls.filter(c => c.type === "smart_plants/wizard/create"); expect(requests).toHaveLength(2); expect(requests[1]).toEqual(requests[0]);
    expect(created).toEqual(before);
    expect(fetch.mock.calls.every(([, init]) => init.method === "GET")).toBe(true);
    // The confirmation reports that the original photo was deliberately skipped.
    expect(panelText(el)).toContain("Replayed plant is ready");
    expect(panelText(el)).toContain("original wizard photo was not uploaded");
    expect(panelText(el)).toContain("explicitly upload a photo if wanted");
    await click(wizard, "Back to plants"); await click(el, "Replayed plant");
    const avatar = el.shadowRoot!.querySelector("sp-plant-avatar")!; await settle(avatar as unknown as SmartPlantsPanel);
    if (removed) expect(avatar.shadowRoot!.querySelector("img")).toBeNull();
    else expect(avatar.shadowRoot!.querySelector("img")?.getAttribute("src")).toBe("blob:stored-photo");
  });
  it.each([false, true])("hidden committed wizard completion preserves another editor, photo=%s", async withPhoto => {
    const pending = deferred<unknown>(); const upload = deferred<Response>();
    let plants = [structuredClone(sample)];
    const created = { ...structuredClone(sample), id: "created-plant", name: "Created plant" };
    const h = harness(plants, msg => {
      if (msg.type === "smart_plants/plants/list") return { plants };
      if (msg.type === "smart_plants/wizard/create") return pending.promise;
      return undefined;
    });
    const fetch = vi.fn(() => upload.promise); vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1, height: 1, close: vi.fn() })));
    const el = await mount(h.hass); await click(el, "Add plant");
    const wizard = el.shadowRoot!.querySelector<SmartPlantsWizard>("smart-plants-wizard")!; await settle(wizard);
    await fill(wizard, "Plant name", "Created plant");
    if (withPhoto) {
      const input = wizard.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(input, "files", { value: [pngFile()] }); input.dispatchEvent(new Event("change")); await settle(wizard); await settle(wizard);
    }
    await click(wizard, "Next"); await click(wizard, "Skip for now");
    await click(wizard, "Create plant");
    await click(el, "Back to overview"); await click(el, "Aloe"); await click(el, "Settings"); await click(el, "Rename");
    await fill(el, "Name", "Unsaved name"); await fill(el, "Category", "Unsaved category");
    field(el.shadowRoot!, "Name").focus();
    plants = [...plants, created]; pending.resolve({ plant: created }); await settle(wizard); await settle(el);
    expect(field(el.shadowRoot!, "Name").value).toBe("Unsaved name"); expect(field(el.shadowRoot!, "Category").value).toBe("Unsaved category");
    expect(el.shadowRoot!.activeElement).toBe(field(el.shadowRoot!, "Name"));
    expect(el.shadowRoot!.querySelector("smart-plants-wizard")).toBeNull();
    expect(h.calls.filter(c => c.type === "smart_plants/wizard/create")).toHaveLength(1);
    if (withPhoto) {
      expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0]).toEqual([`/api/smart_plants/plants/${created.id}/image?expected_revision=1`, expect.objectContaining({ method: "POST" })]);
      const uploaded = { ...created, revision: 2, image: { id: "new-photo", content_type: "image/webp", width: 1, height: 1, created_at: sample.created_at } };
      plants = [plants[0]!, uploaded]; upload.resolve(Response.json({ plant: uploaded })); await settle(el); await settle(el);
      expect(field(el.shadowRoot!, "Name").value).toBe("Unsaved name"); expect(field(el.shadowRoot!, "Category").value).toBe("Unsaved category");
      expect(el.shadowRoot!.activeElement).toBe(field(el.shadowRoot!, "Name"));
    } else expect(fetch).not.toHaveBeenCalled();
    await click(el, "Back to overview"); expect(button(el.shadowRoot!, "Created plant")).toBeDefined();
  });
  it("shows loading, deliberate empty state, and first-plant action", async () => {
    const pending = deferred<unknown>(); const h = harness([], msg => msg.type === "smart_plants/plants/list" ? pending.promise : undefined); const el = await mount(h.hass);
    expect(panelText(el)).toContain("Loading plants"); pending.resolve({ plants: [] }); await settle(el); await settle(overviewOf(el));
    expect(panelText(el)).toContain("No plants yet"); expect(overviewOf(el).shadowRoot!.querySelector<HTMLButtonElement>("button.filled")!.disabled).toBe(false);
  });
  it.each(["api_version", "schema_version"])("fails closed on %s mismatch and recovers on refresh", async key => {
    let mismatch = true;
    const h = harness([], msg => msg.type === "smart_plants/panel/info" && mismatch ? { ...capabilities, [key]: 2 } : undefined); const el = await mount(h.hass);
    expect(el.shadowRoot?.textContent).toContain("version mismatch"); expect(button(el.shadowRoot!, "Add plant").disabled).toBe(true); expect(h.calls.some(c => c.type === "smart_plants/plants/list")).toBe(false);
    mismatch = false; await click(el, "Refresh"); expect(button(el.shadowRoot!, "Add plant").disabled).toBe(false);
  });
  it("does not issue admin calls for a non-admin", async () => {
    const h = harness(); h.hass.user = { is_admin: false }; const el = await mount(h.hass);
    expect(el.shadowRoot?.textContent).toContain("requires an admin"); expect(h.send).not.toHaveBeenCalled();
  });
  it("handles integration unload and connection ready without losing a retained wizard", async () => {
    const h = harness([]); const el = await mount(h.hass); await click(el, "Add plant");
    const wizard = el.shadowRoot!.querySelector("smart-plants-wizard")! as import("./wizard.js").SmartPlantsWizard;
    await fill(wizard, "Plant name", "Retained Aloe"); h.events.get("disconnected")!(); await settle(el);
    expect(el.shadowRoot?.textContent).toContain("Disconnected"); h.events.get("ready")!(); await settle(el);
    expect(field(wizard.shadowRoot!, "Plant name").value).toBe("Retained Aloe");
    await click(el, "Back to overview"); await click(el, "Add plant");
    expect(el.shadowRoot!.querySelector("smart-plants-wizard")).toBe(wizard); expect(h.calls.filter(c => c.type === "smart_plants/wizard/start")).toHaveLength(1);
  });
  it("confirms a foreground creation in the wizard, then starts over with a fresh draft", async () => {
    const created = { ...structuredClone(sample), id: "created-plant", name: "Created plant" };
    let plants = [structuredClone(sample)];
    const h = harness(plants, msg => {
      if (msg.type === "smart_plants/plants/list") return { plants };
      if (msg.type === "smart_plants/wizard/create") { plants = [...plants, created]; return { plant: created }; }
      return undefined;
    });
    const el = await mount(h.hass); await click(el, "Add plant");
    const wizard = el.shadowRoot!.querySelector<SmartPlantsWizard>("smart-plants-wizard")!; await settle(wizard);
    await fill(wizard, "Plant name", "Created plant"); await click(wizard, "Next"); await click(wizard, "Skip for now"); await click(wizard, "Create plant"); await settle(el);
    expect(panelText(el)).toContain("Created plant is ready");
    expect(el.shadowRoot!.querySelector("smart-plants-wizard")).toBe(wizard);
    // The panel's own creation notice stays out of the confirmation.
    expect(el.shadowRoot!.querySelector(".notice")).toBeNull();
    await click(wizard, "Back to plants");
    expect(el.shadowRoot!.querySelector("smart-plants-wizard")).toBeNull();
    expect(button(el.shadowRoot!, "Created plant")).toBeDefined();
    expect(panelText(el)).not.toContain("Created plant created.");
    await click(el, "Add plant");
    const next = el.shadowRoot!.querySelector<SmartPlantsWizard>("smart-plants-wizard")!; await settle(next);
    expect(next).not.toBe(wizard); expect(field(next.shadowRoot!, "Plant name").value).toBe("");
    await fill(next, "Plant name", "Abandoned"); await click(next, "Cancel");
    expect(el.shadowRoot!.querySelector("smart-plants-wizard")).toBeNull();
    expect(h.calls.filter(c => c.type === "smart_plants/wizard/start")).toHaveLength(2);
    expect(h.calls.filter(c => c.type === "smart_plants/wizard/create")).toHaveLength(1);
  });
  it("opens the new plant's page from the confirmation", async () => {
    const created = { ...structuredClone(sample), id: "created", name: "Created plant" };
    let plants = [structuredClone(sample)];
    const h = harness(plants, msg => {
      if (msg.type === "smart_plants/plants/list") return { plants };
      if (msg.type === "smart_plants/wizard/create") { plants = [...plants, created]; return { plant: created }; }
      return undefined;
    });
    const el = await mount(h.hass); await click(el, "Add plant");
    const wizard = el.shadowRoot!.querySelector<SmartPlantsWizard>("smart-plants-wizard")!; await settle(wizard);
    await fill(wizard, "Plant name", "Created plant"); await click(wizard, "Next"); await click(wizard, "Skip for now"); await click(wizard, "Create plant"); await settle(el);
    await click(wizard, "Open plant"); await settle(el);
    expect(el.shadowRoot!.querySelector("smart-plants-wizard")).toBeNull();
    expect(el.shadowRoot!.querySelector("sp-plant-avatar")).not.toBeNull();
    expect([...el.shadowRoot!.querySelectorAll("h1, h2, [role=heading]")].some(h => h.textContent?.trim() === "Created plant")).toBe(true);
  });
  it("shows unload errors and blocks all writes until refresh succeeds", async () => {
    let unloaded = false; const h = harness([sample], msg => { if (unloaded && msg.type === "smart_plants/panel/info") throw { code: "integration_not_loaded", message: "unloaded" }; }); const el = await detail(h.hass);
    unloaded = true; await click(el, "Refresh"); expect(el.shadowRoot?.textContent).toContain("not loaded"); expect(button(el.shadowRoot!, "Save name").closest("fieldset")?.disabled).toBe(true);
    unloaded = false; await click(el, "Refresh"); expect(button(el.shadowRoot!, "Save name").closest("fieldset")?.disabled).toBe(false);
  });
  it("ignores stale refresh results after a connection replacement", async () => {
    const pending = deferred<unknown>(); const old = harness([], msg => msg.type === "smart_plants/plants/list" ? pending.promise : undefined); const el = await mount(old.hass);
    el.hass = harness([sample]).hass; await settle(el); pending.resolve({ plants: [{ ...sample, name: "Stale plant" }] }); await settle(el);
    expect(button(el.shadowRoot!, "Aloe")).toBeDefined(); expect(el.shadowRoot?.textContent).not.toContain("Stale plant");
  });
});

describe("detail saves and conflict review", () => {
  it("releases a pending editor when the plant is deleted elsewhere and ignores its late save", async () => {
    const pending = deferred<unknown>(); let deleted = false;
    const h = harness([sample], msg => msg.type === "smart_plants/plants/update" ? pending.promise : msg.type === "smart_plants/plants/list" ? { plants: deleted ? [] : [sample] } : undefined);
    const el = await detail(h.hass); await fill(el, "Name", "Pending"); await click(el, "Save name"); deleted = true; h.events.get("ready")!(); await settle(el);
    expect(el.shadowRoot?.textContent).toContain("deleted in another session"); expect(button(el.shadowRoot!, "Back to overview").disabled).toBe(false);
    pending.resolve({ plant: { ...sample, revision: 2, name: "Late" } }); await settle(el); await click(el, "Back to overview"); await settle(overviewOf(el)); expect(panelText(el)).toContain("No plants yet");
  });
  it("adopts canonical saved values and provider names while retaining unrelated pending edits", async () => {
    let plant = structuredClone(sample);
    const h = harness([plant], msg => {
      if (msg.type === "smart_plants/plants/list") return { plants: [plant] };
      if (msg.type === "smart_plants/plants/update") { plant = { ...plant, revision: 2, name: "Trimmed" }; return { plant }; }
      if (msg.type === "smart_plants/species/apply") { plant = { ...plant, revision: 3, species: { provider: "openplantbook", snapshot } }; return { plant }; }
      return undefined;
    });
    const el = await detail(h.hass); await fill(el, "Name", "  Trimmed  "); await fill(el, "Category", "pending category"); await click(el, "Save name");
    expect(field(el.shadowRoot!, "Name").value).toBe("Trimmed"); expect(field(el.shadowRoot!, "Category").value).toBe("pending category");
    await fill(el, "Species provider", "openplantbook"); await fill(el, "Search species", "Aloe"); await click(el, "Search species"); await click(el, "Aloe · Aloe vera"); await click(el, "Accept and apply reviewed species");
    expect(field(el.shadowRoot!, "Common name").value).toBe("Aloe"); expect(field(el.shadowRoot!, "Scientific name").value).toBe("Aloe vera"); expect(field(el.shadowRoot!, "Category").value).toBe("pending category");
  });
  it("updates untouched native area but requires review of a dirty selection", async () => {
    let area = "kitchen";
    const h = harness([sample], msg => msg.type === "config/device_registry/list" ? [{ id: "device", area_id: area, identifiers: [["smart_plants", sample.id]] }] : undefined);
    const el = await detail(h.hass); area = "garden"; await click(el, "Refresh"); expect(field(el.shadowRoot!, "Home Assistant area").value).toBe("garden");
    await fill(el, "Home Assistant area", ""); area = "kitchen"; await click(el, "Refresh"); expect(field(el.shadowRoot!, "Home Assistant area").value).toBe("");
    expect(button(el.shadowRoot!, "Save area").disabled).toBe(true); await click(el, "Use current native area"); expect(field(el.shadowRoot!, "Home Assistant area").value).toBe("kitchen");
  });
  it("saves thresholds and staleness retaining the exact missing UUID pair despite entity ID reuse", async () => {
    const missing = { entity_id: "sensor.soil", registry_id: "gone" };
    let plant = { ...sample, roles: { moisture: { ...role, sources: [missing], primary_entity_id: "sensor.soil" } } };
    const h = harness([plant], msg => {
      if (msg.type === "config/entity_registry/list") return [entity];
      if (msg.type === "get_states") return [{ entity_id: "sensor.soil", state: "99", attributes: { unit_of_measurement: "%", device_class: "moisture" }, last_updated: sample.created_at }];
      if (msg.type === "smart_plants/plants/list") return { plants: [plant] };
      if (msg.type === "smart_plants/moisture/evaluation") return { evaluation: { computed_percent: null, health_score: null, needs_water: null, too_wet: null, sensor_stale: true, computed_available: false, reasons: ["Assigned registered source is missing."] } };
      if (msg.type === "smart_plants/moisture/configure") {
        expect(msg).toMatchObject({ expected_revision: 1, moisture: { sources: [missing], primary_entity_id: "sensor.soil", stale_after_seconds: 3600, threshold_overrides: { min: null, target: 40, max: null } } });
        plant = { ...plant, revision: 2, roles: { moisture: { ...plant.roles.moisture, stale_after_seconds: 3600, threshold_overrides: { min: null, target: 40, max: null } } } };
        return { plant };
      }
      return undefined;
    });
    const el = await detail(h.hass, "Sensors");
    await openMoisture(el, "combine"); await fill(el, "Not updating after (seconds, 60–604800)", "3600");
    await click(el, "Settings"); await fill(el, "Ideal", "40"); await click(el, "Save targets");
    expect(h.calls.filter(c => c.type === "smart_plants/moisture/configure")).toHaveLength(1);
    expect(plant.roles.moisture.sources).toEqual([missing]); expect(plant.revision).toBe(2);
    expect(el.shadowRoot?.textContent).toContain("Saved."); expect(el.shadowRoot?.querySelector('[role="alert"]')).toBeNull();
    await click(el, "Refresh");
    expect(field(el.shadowRoot!, "Ideal").value).toBe("40");
    await click(el, "Sensors"); await openMoisture(el, "combine");
    expect(field(el.shadowRoot!, "Not updating after (seconds, 60–604800)").value).toBe("3600");
    await openMoisture(el, "pick");
    expect(el.shadowRoot?.textContent).toContain("Missing registered sensor");
    expect(el.shadowRoot?.querySelector('a[href="/config/repairs"]')).not.toBeNull();
    // Troubleshooting shows the evaluation that found no current reading.
    expect(el.shadowRoot?.querySelector("dl.moisture-evaluation")?.textContent).toContain("Assigned registered source is missing.");
    await click(el, "Overview");
    expect(el.shadowRoot?.textContent).not.toContain("99 %");
  });
  it("ignores old mutation results after reconnect and preserves the newer conflict for review", async () => {
    const pending = deferred<unknown>(); let current = sample;
    const h = harness([sample], msg => msg.type === "smart_plants/plants/update" ? pending.promise : msg.type === "smart_plants/plants/list" ? { plants: [current] } : undefined);
    const el = await detail(h.hass); await fill(el, "Name", "Pending"); await click(el, "Save name");
    h.events.get("disconnected")!(); current = { ...sample, revision: 3, name: "Newest" }; h.events.get("ready")!(); await settle(el);
    pending.resolve({ plant: { ...sample, revision: 2, name: "Old response" } }); await settle(el);
    expect(el.shadowRoot?.textContent).toContain("Newest"); expect(el.shadowRoot?.textContent).not.toContain("Old response"); expect(field(el.shadowRoot!, "Name").value).toBe("Pending");
  });
  it("saves identity, taxonomy and native area independently with revisions", async () => {
    const h = harness(); const el = await detail(h.hass);
    await fill(el, "Name", "Renamed"); await fill(el, "Placement", "balcony"); await click(el, "Save placement and date");
    expect(h.calls.find(c => c.type === "smart_plants/plants/update")).toEqual({ type: "smart_plants/plants/update", plant_id: sample.id, expected_revision: 1, name: "Renamed", acquired_at: null, placement: { mode: "balcony", exposure: null, rain_exposure: null, container: null } });
    await fill(el, "Category", "succulent"); await fill(el, "Tags (comma-separated)", "pot, pot, terrace"); await click(el, "Save category and tags");
    expect(h.calls.filter(c => c.type === "smart_plants/plants/update").at(-1)).toEqual({ type: "smart_plants/plants/update", plant_id: sample.id, expected_revision: 1, category: "succulent", tags: ["pot", "terrace"] });
    await fill(el, "Home Assistant area", "garden"); await click(el, "Save area");
    expect(h.calls.find(c => c.type === "smart_plants/plants/set_area")).toEqual({ type: "smart_plants/plants/set_area", plant_id: sample.id, expected_revision: 1, area_id: "garden" });
    expect(h.calls.filter(c => c.type === "smart_plants/plants/update").every(c => !("area_id" in c))).toBe(true);
  });
  it("refreshes conflicts, explains changed fields, retains dirty fields and requires explicit review/reapply", async () => {
    let plant = structuredClone(sample); let conflict = true; const writes: Record<string, unknown>[] = [];
    const h = harness([sample], msg => {
      if (msg.type === "smart_plants/plants/list") return { plants: [plant] };
      if (msg.type === "smart_plants/plants/update") { writes.push(msg); if (conflict) { plant = { ...plant, revision: 2, name: "Other name", category: "Other category" }; throw { code: "revision_conflict", message: "stale" }; } plant = { ...plant, revision: 3, name: String(msg.name) }; return { plant }; }
      return undefined;
    }); const el = await detail(h.hass); await fill(el, "Name", "My edited name"); await click(el, "Save name");
    expect(el.shadowRoot?.textContent).toContain("Other name"); expect(el.shadowRoot?.textContent).toContain("Other category");
    expect(field(el.shadowRoot!, "Name").value).toBe("My edited name"); expect(writes).toHaveLength(1);
    expect(button(el.shadowRoot!, "Save name").closest("fieldset")?.disabled).toBe(true);
    await click(el, "I reviewed changes; retain my edits for reapply"); expect(writes).toHaveLength(1);
    expect(field(el.shadowRoot!, "Name").value).toBe("My edited name"); expect(field(el.shadowRoot!, "Category").value).toBe("Other category");
    conflict = false; await click(el, "Save name"); expect(writes[1]).toMatchObject({ expected_revision: 2, name: "My edited name" });
  });
  it("surfaces native registry area changes without writing them back", async () => {
    let area = "kitchen";
    const h = harness([sample], msg => msg.type === "config/device_registry/list" ? [{ id: "device", area_id: area, identifiers: [["smart_plants", sample.id]] }] : undefined); const el = await detail(h.hass);
    expect(field(el.shadowRoot!, "Home Assistant area").value).toBe("kitchen"); area = "garden"; await click(el, "Refresh");
    expect(el.shadowRoot?.textContent).toContain("Garden · also sets the device area"); expect(el.shadowRoot?.textContent).toContain("area changed"); expect(h.calls.some(c => c.type === "smart_plants/plants/set_area")).toBe(false);
  });
  it("fails closed for absent or malformed optional moisture roles", async () => {
    for (const roles of [undefined, { moisture: null }, { moisture: { ...role, threshold_overrides: { min: false, target: null, max: null } } }]) {
      const plant = { ...sample, roles } as unknown as PlantRecord; const el = await detail(harness([plant]).hass);
      expect(el.shadowRoot?.textContent).toContain("missing or incompatible"); expect([...el.shadowRoot!.querySelectorAll("button")].some(b => b.textContent?.includes("Save targets"))).toBe(false);
      await click(el, "Sensors");
      const toggle = [...el.shadowRoot!.querySelectorAll("dl.sensors dt")].find(d => d.textContent === "Soil moisture")!.nextElementSibling!.querySelector<HTMLButtonElement>("button.source-toggle")!;
      expect(toggle.disabled).toBe(true); el.remove();
    }
  });
  it("provides filtered/all sensor selection, metadata warnings, explicit primary and an atomic payload", async () => {
    const h = harness([sample], msg => {
      if (msg.type === "config/entity_registry/list") return [entity, { ...entity, id: "uuid-2", entity_id: "sensor.odd", unique_id: "odd" }];
      if (msg.type === "get_states") return [sourceState, { ...sourceState, entity_id: "sensor.odd", state: "unavailable", attributes: {} }];
      return undefined;
    }); const el = await detail(h.hass, "Sensors"); await openMoisture(el, "pick");
    const options = () => [...(field(el.shadowRoot!, "Add moisture sensor") as HTMLSelectElement).options].map(o => o.value);
    expect(options()).toContain("sensor.soil"); expect(options()).not.toContain("sensor.odd");
    const all = field(el.shadowRoot!, "Show all sensors (metadata fallback)") as HTMLInputElement; all.checked = true; all.dispatchEvent(new Event("change")); await settle(el); expect(options()).toContain("sensor.odd");
    await fill(el, "Add moisture sensor", "sensor.odd"); expect(el.shadowRoot?.textContent).toContain("Unexpected metadata");
    await fill(el, "Add moisture sensor", "sensor.soil");
    await openMoisture(el, "combine"); expect(field(el.shadowRoot!, "Main sensor").value).toBe("");
    await fill(el, "Main sensor", "sensor.soil"); await fill(el, "Combine readings", "average"); await fill(el, "Not updating after (seconds, 60–604800)", "3600");
    await click(el, "Settings"); await fill(el, "Ideal", "40"); await click(el, "Save targets");
    expect(h.calls.find(c => c.type === "smart_plants/moisture/configure")).toEqual({ type: "smart_plants/moisture/configure", plant_id: sample.id, expected_revision: 1, moisture: { sources: [{ entity_id: "sensor.odd", registry_id: "uuid-2" }, { entity_id: "sensor.soil", registry_id: "uuid-1" }], primary_entity_id: "sensor.soil", aggregation: "average", stale_after_seconds: 3600, threshold_overrides: { min: null, target: 40, max: null } } });
  });
  it("preserves removed UUID identity despite reused entity ID and links repairs; renames resolve by UUID", async () => {
    const plant = { ...sample, roles: { moisture: { ...role, sources: [{ entity_id: "sensor.soil", registry_id: "gone" }, { entity_id: "sensor.old", registry_id: "uuid-renamed" }], primary_entity_id: "sensor.old" } } };
    const h = harness([plant], msg => msg.type === "config/entity_registry/list" ? [entity, { ...entity, id: "uuid-renamed", entity_id: "sensor.renamed" }] : undefined); const el = await detail(h.hass, "Sensors"); await openMoisture(el, "pick");
    expect(el.shadowRoot?.textContent).toContain("Missing registered sensor"); expect(el.shadowRoot?.querySelector('a[href="/config/repairs"]')).not.toBeNull(); expect(el.shadowRoot?.textContent).toContain("sensor.renamed");
    await click(el, "Remove sensor.soil"); await click(el, "Save soil moisture sensors");
    expect(h.calls.find(c => c.type === "smart_plants/moisture/configure")).toMatchObject({ moisture: { sources: [{ entity_id: "sensor.renamed", registry_id: "uuid-renamed" }], primary_entity_id: "sensor.renamed" } });
  });
  it("validates atomic threshold edits and explicit null inheritance", async () => {
    const h = harness(); const el = await detail(h.hass);
    await fill(el, "Needs water below", "40"); await click(el, "Save targets"); expect(el.shadowRoot?.textContent).toContain("Effective moisture thresholds"); expect(h.calls.some(c => c.type === "smart_plants/moisture/configure")).toBe(false);
    await click(el, "Reset to defaults"); expect(field(el.shadowRoot!, "Needs water below").value).toBe(""); await click(el, "Save targets"); expect(h.calls.find(c => c.type === "smart_plants/moisture/configure")).toMatchObject({ moisture: { threshold_overrides: { min: null, target: null, max: null } } });
  });
});

describe("reviewed species and accessible destructive actions", () => {
  it("keeps focus inside an invalidated dialog and restores the asynchronous preview trigger", async () => {
    let plant = { ...sample, species: { provider: "openplantbook", snapshot } };
    const h = harness([plant], msg => msg.type === "smart_plants/plants/list" ? { plants: [plant] } : undefined);
    const el = await detail(h.hass); const trigger = button(el.shadowRoot!, "Preview species refresh"); trigger.focus(); await click(el, "Preview species refresh");
    button(el.shadowRoot!, "Accept and apply reviewed species").focus(); plant = { ...plant, revision: 2 }; h.events.get("ready")!(); await settle(el);
    expect(el.shadowRoot?.activeElement).toBe(dialogCancel(el)); await cancelDialog(el);
    // Conflict disables the original trigger, so a subsequent review is required.
    await click(el, "I reviewed changes; retain my edits for reapply"); trigger.focus(); await click(el, "Preview species refresh"); await cancelDialog(el); expect(el.shadowRoot?.activeElement).toBe(trigger);
  });
  it("shows durable attribution offline and previews refresh nonmutating before explicit apply", async () => {
    const h = harness([{ ...sample, species: { provider: "openplantbook", snapshot } }]); const el = await detail(h.hass);
    expect(el.shadowRoot?.textContent).toContain("OpenPlantBook"); expect(el.shadowRoot?.textContent).toContain("Let soil dry");
    await click(el, "Preview species refresh"); expect(el.shadowRoot?.querySelector("dialog")?.open).toBe(true); expect(el.shadowRoot?.querySelector("img")).toBeNull(); expect(h.calls.some(c => c.type === "smart_plants/species/apply")).toBe(false);
    expect(el.shadowRoot?.activeElement?.textContent?.trim()).toBe("Review species changes"); await click(el, "Accept and apply reviewed species");
    expect(h.calls.find(c => c.type === "smart_plants/species/apply")).toEqual({ type: "smart_plants/species/apply", plant_id: sample.id, expected_revision: 1, preview_token: preview.preview_token, provider: "openplantbook", operation: "refresh", confirmed: true });
  });
  it("contains dialog keyboard focus, handles Escape/cancel and restores the trigger", async () => {
    const h = harness(); const el = await detail(h.hass); const trigger = button(el.shadowRoot!, "Delete"); trigger.focus(); await click(el, "Delete");
    const dialog = el.shadowRoot!.querySelector("dialog")!; const cancel = dialogCancel(el); const confirm = button(el.shadowRoot!, "Permanently delete plant");
    expect(el.shadowRoot?.activeElement).toBe(cancel); cancel.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true })); expect(el.shadowRoot?.activeElement).toBe(confirm);
    confirm.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })); expect(el.shadowRoot?.activeElement).toBe(cancel);
    dialog.dispatchEvent(new Event("cancel", { cancelable: true })); await settle(el); expect(el.shadowRoot?.querySelector("dialog")).toBeNull(); expect(el.shadowRoot?.activeElement).toBe(trigger); expect(h.calls.some(c => c.type === "smart_plants/plants/delete")).toBe(false);
  });
  it("deletes only after native dialog confirmation and supports disable and re-enable", async () => {
    let plant = sample; let deleted = false;
    const h = harness([sample], msg => {
      if (msg.type === "smart_plants/plants/list") return { plants: deleted ? [] : [plant] };
      if (msg.type === "smart_plants/plants/disable") { plant = { ...plant, revision: 2, lifecycle_state: "disabled" }; return { plant }; }
      if (msg.type === "smart_plants/plants/reenable") { plant = { ...plant, revision: 3, lifecycle_state: "active" }; return { plant }; }
      if (msg.type === "smart_plants/plants/delete") { deleted = true; return {}; }
      return undefined;
    }); const el = await detail(h.hass); await click(el, "Pause"); await click(el, "Resume"); await click(el, "Delete plant"); await click(el, "Permanently delete plant");
    expect(h.calls.find(c => c.type === "smart_plants/plants/delete")).toMatchObject({ expected_revision: 3 }); await settle(overviewOf(el)); expect(panelText(el)).toContain("No plants yet");
  });
  it("invalidates a species preview on revision change and never applies a stale token", async () => {
    let plant = { ...sample, species: { provider: "openplantbook", snapshot } };
    const h = harness([plant], msg => msg.type === "smart_plants/plants/list" ? { plants: [plant] } : undefined); const el = await detail(h.hass); await click(el, "Preview species refresh");
    plant = { ...plant, revision: 2 }; h.events.get("ready")!(); await settle(el);
    expect(button(el.shadowRoot!, "Accept and apply reviewed species").disabled).toBe(true); expect(h.calls.some(c => c.type === "smart_plants/species/apply")).toBe(false);
  });
});

describe("local image validation and mutation", () => {
  it("ignores a late upload after reconnect instead of replacing newer image metadata", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() })));
    const pending = deferred<Response>(); vi.stubGlobal("fetch", vi.fn(() => pending.promise)); let plant = sample;
    const h = harness([sample], msg => msg.type === "smart_plants/plants/list" ? { plants: [plant] } : undefined); const el = await detail(h.hass);
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!; Object.defineProperty(input, "files", { value: [pngFile()] }); input.dispatchEvent(new Event("change")); await settle(el);
    h.events.get("disconnected")!(); plant = { ...sample, revision: 3, name: "Newer plant" }; h.events.get("ready")!(); await settle(el);
    pending.resolve(new Response(JSON.stringify({ plant: { ...sample, revision: 2, name: "Old upload result" } }))); await settle(el);
    expect(el.shadowRoot?.textContent).toContain("Newer plant"); expect(el.shadowRoot?.textContent).not.toContain("Old upload result");
  });
  it.each([new File(["x"], "bad.gif", { type: "image/gif" }), new File([], "empty.png", { type: "image/png" }), new File([new Uint8Array(40 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" })])("rejects invalid local file $name before upload", async file => {
    vi.stubGlobal("fetch", vi.fn()); const el = await detail(harness().hass); const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!; Object.defineProperty(input, "files", { value: [file] }); input.dispatchEvent(new Event("change")); await settle(el);
    expect(el.shadowRoot?.textContent).toContain("nonempty JPEG, PNG or WebP"); expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects images too large to scale down and closes the decoded bitmap", async () => {
    const close = vi.fn(); vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 10000, height: 7000, close }))); vi.stubGlobal("fetch", vi.fn());
    const el = await detail(harness().hass); const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!; Object.defineProperty(input, "files", { value: [pngFile()] }); input.dispatchEvent(new Event("change")); await settle(el);
    expect(close).toHaveBeenCalledOnce(); expect(el.shadowRoot?.textContent).toContain("more than 64 megapixels"); expect(fetch).not.toHaveBeenCalled();
  });
  it("uploads authenticated validated bytes and surfaces backend validation errors", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() })));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { code: "invalid_format", message: "Image decoding rejected" } }), { status: 400 })));
    const el = await detail(harness().hass); const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!; const file = pngFile(); Object.defineProperty(input, "files", { value: [file] }); input.dispatchEvent(new Event("change")); await settle(el);
    expect(fetch).toHaveBeenCalledWith(`/api/smart_plants/plants/${sample.id}/image?expected_revision=1`, expect.objectContaining({ method: "POST", body: file, headers: { Authorization: "Bearer test-token", "Content-Type": "image/png" } })); expect(el.shadowRoot?.textContent).toContain("Images must be valid"); expect(el.shadowRoot?.textContent).not.toContain("Image decoding rejected");
  });
});
