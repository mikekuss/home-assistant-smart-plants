import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsWizard } from "./wizard.js";
import { button, capabilities, click, deferred, draft, field, fill, harness, pngFile, preview, sample, settle } from "./test-helpers.js";
import type { HomeAssistantLike } from "./types.js";

async function mount(hass: HomeAssistantLike): Promise<SmartPlantsWizard> {
  const element = new SmartPlantsWizard(); element.hass = hass; element.capabilities = capabilities;
  document.body.append(element); await settle(element); return element;
}
async function review(element: SmartPlantsWizard): Promise<void> {
  await fill(element, "Plant name", "My Aloe");
  for (let step = 0; step < 5; step++) await click(element, "Next step");
}
async function chooseOpenPlantBook(element: SmartPlantsWizard): Promise<void> {
  const option = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>("button.choice-card")]
    .find(candidate => candidate.textContent?.includes("Search OpenPlantBook"));
  expect(option).toBeDefined(); option!.click(); await settle(element);
}
async function openAdvancedThresholds(element: SmartPlantsWizard): Promise<void> {
  const summary = [...element.shadowRoot!.querySelectorAll("summary")]
    .find(candidate => candidate.textContent?.trim() === "Advanced threshold overrides");
  expect(summary).toBeDefined(); summary!.click(); await settle(element);
}
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("retained seven-step creation wizard", () => {
  it("reviews the actual image metadata, scientific-only species and complete placement", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 640, height: 480, close: vi.fn() })));
    const el = await mount(harness([]).hass); await fill(el, "Plant name", "Photo plant"); await fill(el, "Placement", "balcony"); await fill(el, "Sun exposure", "shade"); await fill(el, "Rain exposure", "partial"); await fill(el, "Container", "true");
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!; Object.defineProperty(input, "files", { value: [pngFile()] }); input.dispatchEvent(new Event("change")); await settle(el);
    await click(el, "Next step"); await fill(el, "Scientific name", "Aloe vera"); for (let i = 0; i < 4; i++) await click(el, "Next step");
    expect(el.shadowRoot?.textContent).toContain("Aloe vera"); expect(el.shadowRoot?.textContent).toContain("shade / partial"); expect(el.shadowRoot?.textContent).toContain("In a container"); expect(el.shadowRoot?.textContent).toContain("640 × 480 pixels · 12 bytes");
    for (let i = 0; i < 5; i++) await click(el, "Previous step"); await click(el, "Remove selected photo"); expect(el.shadowRoot?.textContent).not.toContain("Selected: image.png");
  });
  it("ignores a late start result after disconnect and allows a fresh start", async () => {
    const pending = deferred<unknown>(); let starts = 0;
    const h = harness([], msg => msg.type === "smart_plants/wizard/start" && ++starts === 1 ? pending.promise : undefined);
    const el = await mount(h.hass); el.blocked = true; await settle(el); pending.resolve(draft); await settle(el);
    el.blocked = false; await settle(el); expect(button(el.shadowRoot!, "Next step").disabled).toBe(true);
    await click(el, "Retry starting draft"); expect(button(el.shadowRoot!, "Next step").disabled).toBe(false);
  });
  it("retains an uncertain creation across reconnect and ignores its late success", async () => {
    const pending = deferred<unknown>(); let creates = 0;
    const h = harness([], msg => msg.type === "smart_plants/wizard/create" && ++creates === 1 ? pending.promise : undefined);
    const el = await mount(h.hass); const created = vi.fn(); el.addEventListener("plant-created", created); await review(el); await click(el, "Confirm and create plant");
    el.blocked = true; await settle(el); el.blocked = false; await settle(el); pending.resolve({ plant: sample }); await settle(el); expect(created).not.toHaveBeenCalled();
    await click(el, "Retry same creation request"); expect(created).toHaveBeenCalledOnce(); const requests = h.calls.filter(c => c.type === "smart_plants/wizard/create"); expect(requests[0]).toEqual(requests[1]);
  });
  it("creates a manual sensor-free plant only after final confirmation, with exact v1 fields", async () => {
    const h = harness([]); const el = await mount(h.hass); const created = vi.fn(); el.addEventListener("plant-created", created);
    await review(el);
    expect(h.calls.map(c => c.type)).toEqual(["smart_plants/wizard/start"]);
    expect(el.shadowRoot?.querySelector('[aria-current="step"]')?.textContent).toContain("6");
    await click(el, "Confirm and create plant");
    expect(h.calls.at(-1)).toEqual({ type: "smart_plants/wizard/create", draft_id: draft.draft_id, draft_token: draft.draft_token, expected_revision: 0, confirmed: true, name: "My Aloe", acquired_at: null, area_id: null, placement: null, category: null, tags: [], moisture: { sources: [], primary_entity_id: null, aggregation: "primary", stale_after_seconds: 21600, threshold_overrides: { min: null, target: null, max: null } }, species: null });
    expect(created).toHaveBeenCalledOnce();
    expect(el.shadowRoot?.textContent).not.toContain(draft.draft_token);
  });
  it("retains basic info, taxonomy and moisture overrides on back navigation and focuses the step heading", async () => {
    const el = await mount(harness([]).hass);
    await fill(el, "Plant name", "Fern"); await click(el, "Next step"); await click(el, "Previous step");
    expect(field(el.shadowRoot!, "Plant name").value).toBe("Fern");
    expect(el.shadowRoot?.activeElement?.tagName).toBe("H2");
    for (let i = 0; i < 3; i++) await click(el, "Next step");
    await openAdvancedThresholds(el); await fill(el, "target override (%)", "40"); await click(el, "Next step"); await fill(el, "Tags (comma-separated)", "patio, patio, edible"); await click(el, "Next step");
    expect(el.shadowRoot?.textContent).toContain("target: 40% (override)");
    expect(el.shadowRoot?.textContent).toContain("patio, edible");
    await click(el, "Previous step"); expect(field(el.shadowRoot!, "Tags (comma-separated)").value).toBe("patio, patio, edible");
  });
  it("blocks empty names and invalid complete threshold combinations without mutation", async () => {
    const h = harness([]); const el = await mount(h.hass);
    await click(el, "Next step"); expect(el.shadowRoot?.textContent).toContain("Enter a plant name");
    await fill(el, "Plant name", "Aloe"); for (let i = 0; i < 3; i++) await click(el, "Next step");
    await openAdvancedThresholds(el); await fill(el, "target override (%)", "10"); await click(el, "Next step");
    expect(el.shadowRoot?.textContent).toContain("Effective moisture thresholds");
    expect(h.calls).toHaveLength(1);
    await click(el, "Inherit target"); await click(el, "Next step"); expect(el.shadowRoot?.querySelector("h2")?.textContent).toBe("Category and tags");
  });
  it("requires explicit provider acceptance and sends only the bound token, never a client snapshot", async () => {
    const h = harness([]); const el = await mount(h.hass);
    await fill(el, "Plant name", "Aloe"); await click(el, "Next step"); await chooseOpenPlantBook(el); await fill(el, "Search OpenPlantBook (at least 3 characters)", "Aloe"); await click(el, "Search plants"); await click(el, "Aloe · Aloe vera");
    expect(el.shadowRoot?.textContent).toContain("Not supplied (built-in default applies)"); expect(el.shadowRoot?.querySelector("img")).toBeNull();
    await click(el, "Next step"); expect(el.shadowRoot?.textContent).toContain("Explicitly accept");
    const accept = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!; accept.checked = true; accept.dispatchEvent(new Event("change")); await settle(el);
    for (let i = 0; i < 4; i++) await click(el, "Next step"); await click(el, "Confirm and create plant");
    expect(h.calls.at(-1)).toMatchObject({ accepted_preview: { preview_token: preview.preview_token, provider: "openplantbook", operation: "select" }, moisture: { threshold_overrides: { min: null, target: null, max: null } } });
    expect(h.calls.at(-1)).not.toHaveProperty("species"); expect(h.calls.at(-1)).not.toHaveProperty("snapshot");
    expect(h.calls.find(c => c.type === "smart_plants/wizard/preview")).toEqual({ type: "smart_plants/wizard/preview", draft_id: draft.draft_id, draft_token: draft.draft_token, expected_revision: 0, provider: "openplantbook", provider_ref: "aloe", locale: "en" });
  });
  it.each(["provider_disabled", "provider_authentication", "provider_rate_limit", "provider_timeout", "provider_outage", "provider_malformed_response"])("supports manual fallback after %s", async code => {
    const h = harness([], msg => { if (msg.type === "smart_plants/species/search") throw { code, message: "Provider unavailable" }; }); const el = await mount(h.hass);
    await fill(el, "Plant name", "Manual Aloe"); await click(el, "Next step"); await chooseOpenPlantBook(el); await fill(el, "Search OpenPlantBook (at least 3 characters)", "Aloe"); await click(el, "Search plants");
    expect(el.shadowRoot?.textContent).toContain(code); await click(el, "Continue manually"); await fill(el, "Common name", "My species");
    for (let i = 0; i < 4; i++) await click(el, "Next step"); await click(el, "Confirm and create plant");
    expect(h.calls.at(-1)).toMatchObject({ species: { provider: "manual", snapshot: { common_name: "My species", attribution: "User supplied" } } });
  });
  it("deduplicates double submission and retries an identical final request after lost response and reconnect", async () => {
    const pending = deferred<unknown>(); let count = 0;
    const h = harness([], msg => { if (msg.type === "smart_plants/wizard/create") { count++; return count === 1 ? pending.promise : { plant: sample }; } return undefined; }); const el = await mount(h.hass); await review(el);
    button(el.shadowRoot!, "Confirm and create plant").click(); button(el.shadowRoot!, "Confirm and create plant").click(); await settle(el); expect(count).toBe(1);
    pending.reject({ code: "unknown_error", message: "internal error" }); await settle(el);
    el.blocked = true; await settle(el); expect(button(el.shadowRoot!, "Retry same creation request").disabled).toBe(true);
    el.blocked = false; await settle(el); await click(el, "Retry same creation request");
    const requests = h.calls.filter(c => c.type === "smart_plants/wizard/create"); expect(requests).toHaveLength(2); expect(requests[1]).toEqual(requests[0]); expect(h.calls.filter(c => c.type === "smart_plants/wizard/start")).toHaveLength(1);
  });
  it("allows a fresh draft after a definite invalid/expired rejection while retaining editable fields", async () => {
    const h = harness([], msg => { if (msg.type === "smart_plants/wizard/create") throw { code: "invalid_format", message: "draft expired" }; }); const el = await mount(h.hass); await review(el); await click(el, "Confirm and create plant"); await click(el, "Start fresh draft retaining editable fields");
    expect(field(el.shadowRoot!, "Plant name").value).toBe("My Aloe"); expect(h.calls.filter(c => c.type === "smart_plants/wizard/start")).toHaveLength(2);
  });
  it("ignores late previews after disconnect and requires new review", async () => {
    const pending = deferred<unknown>(); const h = harness([], msg => msg.type === "smart_plants/wizard/preview" ? pending.promise : undefined); const el = await mount(h.hass);
    await fill(el, "Plant name", "Aloe"); await click(el, "Next step"); await chooseOpenPlantBook(el); await fill(el, "Search OpenPlantBook (at least 3 characters)", "Aloe"); await click(el, "Search plants"); await click(el, "Aloe · Aloe vera");
    el.blocked = true; await settle(el); pending.resolve(preview); await settle(el);
    expect(el.shadowRoot?.textContent).not.toContain("I reviewed and accept");
  });

  it("lets users reach threshold editing to fix incompatible provider defaults without inferring a target", async () => {
    const h = harness([], msg => msg.type === "smart_plants/wizard/preview" ? { ...preview, snapshot: { ...preview.snapshot, threshold_defaults: { moisture: { min: 40, max: 60 } } } } : undefined);
    const el = await mount(h.hass); await fill(el, "Plant name", "Aloe"); await click(el, "Next step"); await chooseOpenPlantBook(el); await fill(el, "Search OpenPlantBook (at least 3 characters)", "Aloe"); await click(el, "Search plants"); await click(el, "Aloe · Aloe vera");
    const accept = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!; accept.checked = true; accept.dispatchEvent(new Event("change")); await settle(el);
    await click(el, "Next step"); await click(el, "Next step"); expect(el.shadowRoot?.querySelector("h2")?.textContent).toBe("Moisture thresholds");
    await click(el, "Next step"); expect(el.shadowRoot?.textContent).toContain("Effective moisture thresholds");
    await el.shadowRoot!.querySelector("summary")!.click(); await settle(el);
    await fill(el, "target override (%)", "50"); await click(el, "Next step"); await click(el, "Next step"); await click(el, "Confirm and create plant");
    expect(h.calls.at(-1)).toMatchObject({ moisture: { threshold_overrides: { min: null, target: 50, max: null } } });
  });

  it("invalidates an accepted preview when a different species search is entered", async () => {
    const el = await mount(harness([]).hass); await fill(el, "Plant name", "Aloe"); await click(el, "Next step"); await chooseOpenPlantBook(el); await fill(el, "Search OpenPlantBook (at least 3 characters)", "Aloe"); await click(el, "Search plants"); await click(el, "Aloe · Aloe vera");
    const accept = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!; accept.checked = true; accept.dispatchEvent(new Event("change")); await settle(el); await click(el, "Previous step"); await fill(el, "Search OpenPlantBook (at least 3 characters)", "Fern"); await click(el, "Next step");
    expect(el.shadowRoot?.textContent).toContain("Choose a species result"); expect(el.shadowRoot?.querySelector("h2")?.textContent).toBe("Species and care");
  });
});
