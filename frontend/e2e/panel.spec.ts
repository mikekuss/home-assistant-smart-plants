import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { Evaluation, HADevice, HAEntity, HAState, PlantRecord } from "../src/types.js";

// Type-only imports cannot load application source in the browser. All behavior
// below is exercised through accessible controls in the packaged ESM artifact.
interface Harness {
  plants: PlantRecord[];
  messages: Array<Record<string, unknown>>;
  requests: Array<{ method: string; path: string; authorization: string; contentType: string; bytes: number }>;
  unexpected: string[];
  failures: Record<string, string>;
  malformed: Record<string, unknown>;
  entities: HAEntity[];
  devices: HADevice[];
  states: HAState[];
  evaluations: Record<string, Evaluation>;
  providerAvailable: boolean;
  conflictNext: boolean;
  loseCreateResponse: boolean;
  imageFailure: string | null;
  blobsCreated: string[];
  blobsRevoked: string[];
  holdNext: Record<string, boolean>;
  pending: Record<string, unknown>;
  roleDefaults: Record<string, unknown>;
  release(key: string): void;
  emit(event: string): void;
}
declare global { interface Window { __smartPlantsHarness: Harness } }
const url = "/frontend/e2e/harness.html";
test("manual watering history is accessible and survives a refresh", async ({ page }, info) => {
  await detail(page);
  await show(page, "Overview");
  const readings = await page.locator("smart-plants-panel .keyreads").textContent();
  await show(page, "Care");
  await expect(page.getByRole("heading", { name: "Care history" })).toBeVisible();
  await expect(page.getByText("No care recorded yet.")).toBeVisible();
  await button(page, "Log care").last().click();
  await expect(page.getByLabel("Care type")).toBeFocused();
  await page.getByLabel("When (your local time)").fill("2026-01-02T11:15");
  await page.getByLabel("Note (optional)").fill("Watered by hand");
  await button(page, "Record care").click();
  await expect(page.getByText("Watered by hand")).toBeVisible();
  await expect(page.getByText("1 watering event.", { exact: false })).toBeVisible();
  await show(page, "Overview");
  await expect(page.locator("smart-plants-panel .keyreads")).toHaveText(readings!);
  await show(page, "Care");
  await refreshData(page);
  await expect(page.getByText("Watered by hand")).toBeVisible();
  expect(await messages(page, "care/add")).toHaveLength(1);
  await audit(page, info, "care-history");
});
test("care history creates, edits and confirms deletion of other event kinds", async ({ page }, info) => {
  await detail(page, "Office Aloe", "Care"); await button(page, "Log care").last().click();
  await page.getByLabel("Care type").selectOption("fertilizing");
  await page.getByLabel("Product", { exact: true }).fill("Synthetic fertilizer");
  await page.getByLabel("Amount", { exact: true }).fill("12");
  await page.getByLabel("Unit", { exact: true }).selectOption("g");
  await page.getByLabel("When (your local time)").fill("2026-01-02T11:15");
  await button(page, "Record care").click();
  await expect(page.getByText("Synthetic fertilizer")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "0 watering events" })).toBeVisible();
  await audit(page, info, "fertilizing-created");
  await careAction(page, "Fertilizing", "Edit fertilizing");
  await page.getByLabel("Product", { exact: true }).fill("Reviewed fertilizer");
  await button(page, "Save care changes").click();
  await expect(page.getByText("Reviewed fertilizer")).toBeVisible();
  await audit(page, info, "fertilizing-edited");
  await careAction(page, "Fertilizing", "Edit fertilizing");
  await page.getByLabel("Care type").selectOption("pruning");
  await page.getByLabel("Plant part", { exact: true }).fill("leaf tips");
  await button(page, "Save care changes").click();
  await expect(page.getByText("Pruning", { exact: false }).first()).toBeVisible();
  await audit(page, info, "care-kind-changed");
  page.once("dialog", dialog => dialog.accept());
  await careAction(page, "Pruning", "Delete pruning");
  await expect(page.getByText("No care recorded yet.")).toBeVisible();
  expect(await messages(page, "care/add")).toHaveLength(1);
  expect(await messages(page, "care/edit")).toHaveLength(2);
  expect(await messages(page, "care/delete")).toHaveLength(1);
  await audit(page, info, "fertilizing-deleted");
});
test("pruning, repotting and note events have accessible kind-specific forms", async ({ page }, info) => {
  await detail(page, "Office Aloe", "Care"); await button(page, "Log care").last().click();
  const date = page.getByLabel("When (your local time)");
  for (const item of [
    { kind: "pruning", label: "Pruning", fields: { "Plant part": "dry leaves" } },
    { kind: "repotting", label: "Repotting", fields: { Container: "clay pot", "Growing medium": "bark mix" } },
    { kind: "note", label: "Note", fields: { "Note text": "New leaf observed" } },
  ]) {
    await page.getByLabel("Care type").selectOption(item.kind);
    await date.fill("2026-01-02T11:15");
    for (const [label, value] of Object.entries(item.fields)) await page.getByLabel(label, { exact: true }).fill(value);
    await button(page, "Record care").click();
    await expect(page.getByText(item.label, { exact: false }).first()).toBeVisible();
    await audit(page, info, `${item.kind}-history`);
  }
  expect(await messages(page, "care/add")).toHaveLength(3);
});
test("care events with nullable detail fields can be recorded", async ({ page }) => {
  await detail(page, "Office Aloe", "Care"); await button(page, "Log care").last().click();
  const date = page.getByLabel("When (your local time)");
  for (const kind of ["fertilizing", "pruning", "repotting"]) {
    await page.getByLabel("Care type").selectOption(kind);
    await date.fill("2026-01-02T11:15");
    await button(page, "Record care").click();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  const requests = await messages(page, "care/add");
  expect(requests).toHaveLength(3);
  expect(requests[0]?.payload).toEqual({ product: null, amount: null, unit: null, note: null });
  expect(requests[1]?.payload).toEqual({ part: null, note: null });
  expect(requests[2]?.payload).toEqual({ container: null, medium: null, note: null });
});
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ws = (type: string) => `smart_plants/${type}`;
const messages = (page: Page, type: string) => page.evaluate(t => window.__smartPlantsHarness.messages.filter(m => m.type === t), ws(type));
const inventory = (page: Page) => page.evaluate(() => window.__smartPlantsHarness.plants);
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const dialogButton = (page: Page, name: string) => page.getByRole("dialog").getByRole("button", { name, exact: true });
const menuItem = (page: Page, name: string) => page.getByRole("menuitem", { name, exact: true });
async function menuAction(page: Page, name: string) {
  await button(page, "Menu").click();
  const item = menuItem(page, name);
  await item.focus();
  await item.press("Enter");
}
async function addPlant(page: Page) { await menuAction(page, "Add plant"); }
async function backToOverview(page: Page) {
  if (await button(page, "Back").count()) await button(page, "Back").click();
  else await menuAction(page, "Back to overview");
}
const next = (page: Page) => button(page, "Next step").click();
const overview = (page: Page) => page.locator("smart-plants-overview");
const cards = (page: Page) => overview(page).locator("article.card");
const tile = (page: Page, name: string) => overview(page).locator("button.tile").filter({ hasText: name });
async function open(page: Page, seeded = true) {
  await page.goto(`${url}${seeded ? "?seed" : ""}`);
  await expect(button(page, "Menu")).toBeVisible();
  await button(page, "Menu").click();
  await expect(menuItem(page, "Add plant")).toBeEnabled();
  await button(page, "Menu").click();
}
async function refreshData(page: Page) { await page.evaluate(() => window.__smartPlantsHarness.emit("ready")); }
const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });
// Switches plant tab; Settings also opens the name, area and species editors.
async function show(page: Page, name: string) {
  await tab(page, name).click();
  await expect(tab(page, name)).toHaveAttribute("aria-selected", "true");
  if (name !== "Settings") return;
  for (const label of ["Rename", "Change area", "Find species", "Change species"]) {
    const toggle = button(page, label);
    if (await toggle.count()) await toggle.click();
  }
  await expand(page, "More details");
}
// Expands a collapsed section such as "Troubleshooting" or "Other targets".
async function expand(page: Page, name: string) {
  const header = page.getByRole("button", { name: new RegExp(`^${name}`) });
  if (await header.getAttribute("aria-expanded") !== "true") await header.click();
  await expect(header).toHaveAttribute("aria-expanded", "true");
}
// Opens an item of a row or overflow menu by keyboard, as the menu stub needs.
async function choose(page: Page, trigger: string, item: string) {
  await button(page, trigger).click();
  const entry = menuItem(page, item);
  await entry.focus(); await entry.press("Enter");
}
// Row menu of a care entry, found by its kind.
async function careAction(page: Page, kind: string, item: string) {
  await page.getByRole("button", { name: new RegExp(`^Options for ${kind} on`) }).first().click();
  const entry = menuItem(page, item);
  await entry.focus(); await entry.press("Enter");
}
// Soil moisture editors: the sensor list (pick) or how its sensors combine.
async function openMoisture(page: Page, mode: "pick" | "combine") {
  if (mode === "combine") {
    await expand(page, "Several sensors for one reading");
    const toggle = page.locator('smart-plants-panel dl.sensors dt:text-is("Soil moisture") + dd button.source-toggle');
    if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
    return;
  }
  const add = button(page, "Add sensor");
  if (await add.count()) {
    await add.click();
    if (await menuItem(page, "Soil moisture").count()) { await menuItem(page, "Soil moisture").focus(); await menuItem(page, "Soil moisture").press("Enter"); return; }
    await page.keyboard.press("Escape");
  }
  await page.locator("smart-plants-panel li", { hasText: "Soil moisture ·" }).getByRole("button", { name: /^Options for/ }).first().click();
  await menuItem(page, "Change soil moisture sensors").focus(); await menuItem(page, "Change soil moisture sensors").press("Enter");
}
async function detail(page: Page, name = "Office Aloe", section = "Settings") {
  await open(page);
  await button(page, name).click();
  await expect(tab(page, "Overview")).toBeVisible();
  await show(page, section);
}
async function start(page: Page, name = "Manual Aloe") {
  await open(page, false);
  await overview(page).getByRole("button", { name: "Add plant", exact: true }).click();
  await expect(button(page, "Next step")).toBeEnabled();
  await page.getByLabel("Plant name", { exact: true }).fill(name);
}
async function finishManual(page: Page) {
  while (!await button(page, "Confirm and create plant").isVisible()) await next(page);
  await button(page, "Confirm and create plant").click();
  await expect(tab(page, "Overview")).toHaveAttribute("aria-selected", "true");
}
async function photo(page: Page, label: string, width = 160) {
  const data = await page.evaluate(width => {
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = 120;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#426f40"; ctx.fillRect(0, 0, 160, 120);
    return canvas.toDataURL("image/png").split(",")[1];
  }, width);
  await page.getByLabel(label, { exact: true }).setInputFiles({ name: "plant.png", mimeType: "image/png", buffer: Buffer.from(data!, "base64") });
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}
async function audit(page: Page, info: TestInfo, name: string) {
  // Start from the top of the scrolled content so no control is half hidden
  // under its scroll edge, where axe cannot determine the text contrast.
  await page.evaluate(() => document.querySelector("smart-plants-panel")?.shadowRoot?.querySelector("ha-top-app-bar-fixed")?.shadowRoot?.querySelector(".content")?.scrollTo(0, 0));
  const result = await new AxeBuilder({ page }).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  process.stdout.write(`AXE ${info.project.name}/${name}: ${result.passes.length} rule passes; ${result.violations.length} violations; ${result.incomplete.length} incomplete (${result.incomplete.map(r => r.id).join(", ") || "none"})\n`);
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  // Axe compares the stacks *behind* a native top-layer dialog at each text
  // line and can flag different underlying cards as partially obscuring it.
  // Resolve only this exact flag with real hit-testing and WCAG luminance;
  // retain the unmodified axe JSON and separate verification evidence.
  for (const rule of result.incomplete) {
    expect(rule.id).toBe("color-contrast");
    for (const node of rule.nodes) {
      // Only text inside the open modal dialog may be reported this way.
      const [host, selector] = node.target[0] as unknown as [string, string];
      expect(host).toBe("smart-plants-panel");
      expect(node.any).toHaveLength(1);
      expect(node.any[0]!.data.messageKey).toBe("elmPartiallyObscuring");
      const evidence = await page.locator(`smart-plants-panel ${selector}`).and(page.locator("smart-plants-panel dialog p")).first().evaluate(el => {
        const dialog = el.closest("dialog")!;
        const root = el.getRootNode() as ShadowRoot;
        const text = getComputedStyle(el), surface = getComputedStyle(dialog);
        const range = document.createRange(); range.selectNodeContents(el);
        const visible = [...range.getClientRects()].every(r => r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && [r.left + 1, (r.left + r.right) / 2, r.right - 1].every(x => {
          const hit = root.elementFromPoint(x, (r.top + r.bottom) / 2); return hit === el || (hit !== null && el.contains(hit));
        }));
        const luminance = (color: string) => {
          if (!/^rgb\(\d+, \d+, \d+\)$/.test(color)) throw new Error("Opaque RGB colors required for contrast verification");
          const channels = color.match(/\d+/g)!.map(v => Number(v) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
          return channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722;
        };
        const a = luminance(text.color), b = luminance(surface.backgroundColor);
        return { foreground: text.color, background: surface.backgroundColor, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), visible, modal: dialog.matches(":modal"), opacity: [text.opacity, surface.opacity], backgrounds: [text.backgroundImage, surface.backgroundImage], textBackground: text.backgroundColor };
      });
      expect(evidence).toMatchObject({ visible: true, modal: true, opacity: ["1", "1"], backgrounds: ["none", "none"], textBackground: "rgba(0, 0, 0, 0)" });
      expect(evidence.ratio).toBeGreaterThanOrEqual(4.5);
      await info.attach(`contrast-verification-${name}`, { body: JSON.stringify(evidence, null, 2), contentType: "application/json" });
      process.stdout.write(`Verified ${info.project.name}/${name} modal text: ${evidence.ratio.toFixed(2)}:1; unobscured text; 0 unresolved checks\n`);
    }
  }
  await noOverflow(page);
}
async function screenshot(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: !name.includes("dialog") });
  await info.attach(name, { path, contentType: "image/png" });
}

test.beforeEach(async ({ page }) => {
  // Deny every real network destination and every unexpected local endpoint.
  // WS/HTTP application IO is handled by the stateful in-page mock only.
  await page.route("**/*", async route => {
    const target = new URL(route.request().url());
    const allowed = [url, "/frontend/e2e/harness.js", "/custom_components/smart_plants/frontend/smart-plants-panel.js"];
    if (target.origin === "http://127.0.0.1:4179" && allowed.includes(target.pathname)) await route.continue();
    else { throw new Error(`Unmocked browser request: ${target.href}`); }
  });
  await page.routeWebSocket("**/*", () => { throw new Error("Real WebSocket IO is forbidden in the artifact harness"); });
  page.on("pageerror", error => { throw error; });
});
test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => window.__smartPlantsHarness?.unexpected ?? [])).toEqual([]);
  await expect(page.getByText(/PRIVATE_SENTINEL/)).toHaveCount(0);
});

test("browser loads byte-identical packaged artifact with no source imports or external IO", async ({ page }, info) => {
  const response = page.waitForResponse(r => r.url().endsWith("/custom_components/smart_plants/frontend/smart-plants-panel.js"));
  await open(page);
  const served = await (await response).body();
  const packaged = await readFile("../custom_components/smart_plants/frontend/smart-plants-panel.js");
  expect(served.equals(packaged)).toBe(true);
  expect(await page.evaluate(() => customElements.get("smart-plants-panel") !== undefined)).toBe(true);
  const resources = await page.evaluate(() => performance.getEntriesByType("resource").map(e => new URL(e.name).pathname));
  expect(resources).toEqual(["/frontend/e2e/harness.js", "/custom_components/smart_plants/frontend/smart-plants-panel.js"]);
  await info.attach("artifact-identity", { body: JSON.stringify({ bytes: packaged.length, sha256: createHash("sha256").update(packaged).digest("hex"), resources }, null, 2), contentType: "application/json" });
});

test("overview prioritizes plant summaries with compact filters and native-style actions", async ({ page }, info) => {
  await open(page);
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator("smart-plants-panel").evaluate((panel, viewportWidth) => {
      const inset = viewportWidth >= 768 ? 240 : 0;
      panel.style.marginInlineStart = `${inset}px`;
      panel.style.width = `calc(100% - ${inset}px)`;
    }, width);
    const layout = await page.locator("smart-plants-panel").evaluate(panel => {
      const root = panel.shadowRoot!;
      const host = panel.getBoundingClientRect();
      const appBar = root.querySelector("ha-top-app-bar-fixed")!.getBoundingClientRect();
      const header = root.querySelector("ha-top-app-bar-fixed")!.shadowRoot!.querySelector(".top-app-bar")!.getBoundingClientRect();
      const title = root.querySelector(".page-title")!.getBoundingClientRect();
      const content = root.querySelector(".panel-content")!.getBoundingClientRect();
      return { leftInset: header.left - host.left, rightInset: host.right - header.right, barHeight: header.height, titleVisible: title.left >= header.left && title.right <= header.right, contentTop: content.top, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, appBarWidth: appBar.width };
    });
    expect(layout.leftInset, `header left edge at ${width}px`).toBeCloseTo(0, 0);
    expect(layout.rightInset, `header right edge at ${width}px`).toBeCloseTo(0, 0);
    expect(layout.barHeight, `native bar height at ${width}px`).toBe(56);
    expect(layout.titleVisible, `title within native bar at ${width}px`).toBe(true);
    expect(layout.appBarWidth, `app bar width at ${width}px`).toBeCloseTo(width - (width >= 768 ? 240 : 0), 0);
    expect(layout.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(layout.clientWidth);
  }
  await expect(page.getByRole("heading", { name: "Smart Plants", exact: true })).toBeVisible();
  await expect(page.locator("smart-plants-panel ha-top-app-bar-fixed .top-app-bar")).toHaveCSS("border-bottom-style", "solid");
  await expect(overview(page).locator("button.tile")).toHaveText([/3\s*All plants/, /1\s*Needs water/, /0\s*Problems/, /1\s*Sensor issues/]);
  await expect(tile(page, "All plants")).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).first()).toContainText("Needs water");
  await expect(cards(page).first()).toContainText("Soil moisture 12% is below the minimum of 20%");
  await expect(page.locator("smart-plants-panel details")).toHaveCount(0);
  await expect(button(page, "Refresh")).toHaveCount(0);
  await expect(button(page, "Add plant")).toBeVisible();
  await button(page, "Menu").click();
  await expect(menuItem(page, "Add plant")).toBeVisible();
  await expect(menuItem(page, "Integration options")).toBeVisible();
  await expect(menuItem(page, "Documentation")).toBeVisible();
  await page.keyboard.press("Escape");
  await audit(page, info, "overview-prioritized");
  await tile(page, "Needs water").click();
  await expect(tile(page, "Needs water")).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page)).toHaveCount(1);
  await expect(overview(page).getByRole("status")).toHaveText("1 of 3 plants · Needs water");
  await audit(page, info, "overview-filtered");
  await tile(page, "Needs water").click();
  await expect(cards(page)).toHaveCount(3);
  await button(page, "Sort: Needs attention first").click();
  // The open menu covers the cards, so axe cannot measure text behind it; check
  // the menu by role and audit the page again once the choice is applied.
  for (const name of ["Needs attention first", "Name", "Group by area"]) await expect(overview(page).getByRole("menuitem", { name })).toBeVisible();
  await overview(page).getByRole("menuitem", { name: "Group by area" }).focus();
  await overview(page).getByRole("menuitem", { name: "Group by area" }).press("Enter");
  await expect(overview(page).locator("h2.group-heading")).toHaveText([/Garden\s*· 2/, /Office\s*· 1/]);
  await expect(button(page, "Sort: Group by area")).toBeVisible();
  await audit(page, info, "overview-grouped");
  await screenshot(page, info, "overview-grouped");
  const registrations = await page.evaluate(async () => {
    const panel = customElements.get("smart-plants-panel");
    const wizard = customElements.get("smart-plants-wizard");
    await import(`/custom_components/smart_plants/frontend/smart-plants-panel.js?cache-reload=${Date.now()}`);
    return { panelUnchanged: customElements.get("smart-plants-panel") === panel, wizardUnchanged: customElements.get("smart-plants-wizard") === wizard };
  });
  expect(registrations).toEqual({ panelUnchanged: true, wizardUnchanged: true });
});

test("manual creation skips provider preview and retains back navigation", async ({ page }) => {
  await start(page);
  await page.getByLabel("Acquired date", { exact: true }).fill("2026-09-01");
  await page.getByRole("combobox", { name: "Home Assistant area", exact: true }).selectOption("office");
  await page.getByRole("combobox", { name: "Placement", exact: true }).selectOption("indoor");
  await page.getByRole("combobox", { name: "Sun exposure", exact: true }).selectOption("partial_sun");
  await page.getByRole("combobox", { name: "Container", exact: true }).selectOption("true");
  await next(page);
  await page.getByLabel("Common name", { exact: true }).fill("Aloe");
  await page.getByLabel("Scientific name", { exact: true }).fill("Aloe vera");
  await button(page, "Previous step").click();
  await expect(page.getByLabel("Plant name", { exact: true })).toHaveValue("Manual Aloe");
  await expect(page.getByRole("combobox", { name: "Home Assistant area", exact: true })).toHaveValue("office");
  await next(page);
  await expect(page.getByLabel("Scientific name", { exact: true })).toHaveValue("Aloe vera");
  await next(page);
  await expect(page.getByRole("heading", { name: "Moisture sensors", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Add moisture sensor", exact: true }).selectOption("sensor.soil");
  await page.getByRole("combobox", { name: "Add moisture sensor", exact: true }).selectOption("sensor.backup");
  await expect(page.getByText("Currently unavailable", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Main sensor", exact: true }).selectOption("sensor.soil");
  await page.getByRole("combobox", { name: "Combine readings", exact: true }).selectOption("average");
  await page.getByLabel("Not updating after (seconds, 60–604800)", { exact: true }).fill("3600");
  await next(page);
  await page.getByText("Advanced threshold overrides", { exact: true }).click();
  await page.getByLabel("target override (%)", { exact: true }).fill("40");
  await next(page);
  await page.getByLabel("Category", { exact: true }).fill("Succulent");
  await page.getByLabel("Tags (comma-separated)", { exact: true }).fill("sunny, office, sunny");
  await next(page);
  await expect(page.getByRole("heading", { name: "Review and create", exact: true })).toBeVisible();
  expect(await inventory(page)).toHaveLength(0);
  expect(await messages(page, "wizard/create")).toHaveLength(0);
  await button(page, "Confirm and create plant").click();
  await expect(page.getByRole("heading", { name: "Manual Aloe", level: 2, exact: true })).toBeVisible();
  await show(page, "Settings");
  const create = (await messages(page, "wizard/create"))[0]!;
  expect(create).toMatchObject({ confirmed: true, expected_revision: 0, area_id: "office", tags: ["sunny", "office"], acquired_at: "2026-09-01T00:00:00.000Z", moisture: { sources: [{ entity_id: "sensor.soil", registry_id: id(101) }, { entity_id: "sensor.backup", registry_id: id(102) }], primary_entity_id: "sensor.soil", aggregation: "average", stale_after_seconds: 3600, threshold_overrides: { min: null, target: 40, max: null } } });
  expect(create).not.toHaveProperty("accepted_preview");
  expect(create.draft_token).toHaveLength(43);
  const stableId = (await inventory(page))[0]!.id;
  await page.getByLabel("Name", { exact: true }).fill("Edited Aloe");
  await button(page, "Save name").click();
  await expect(page.getByRole("heading", { name: "Edited Aloe", level: 2, exact: true })).toBeVisible();
  await page.getByLabel("Category", { exact: true }).fill("Houseplant");
  await button(page, "Save category and tags").click();
  await expect(button(page, "Save category and tags")).toBeEnabled();
  await page.getByRole("combobox", { name: "Home Assistant area", exact: true }).selectOption("garden");
  await button(page, "Save area").click();
  await expect(page.getByText(/Garden · also sets the device area/)).toBeVisible();
  await page.getByLabel("Common name", { exact: true }).fill("Local variety");
  await button(page, "Save manual species").click();
  await expect(page.getByRole("heading", { name: "Local variety", exact: true })).toBeVisible();
  await button(page, "Reset to defaults").click();
  await button(page, "Save targets").click();
  await expect(button(page, "Save targets")).toBeEnabled();
  const saved = (await inventory(page))[0]!;
  expect(saved).toMatchObject({ id: stableId, name: "Edited Aloe", category: "Houseplant", roles: { moisture: { threshold_overrides: { min: null, target: null, max: null } } } });
  expect(await messages(page, "species/search")).toHaveLength(0);
});

test("wizard provider search is read-only until explicit preview acceptance and final confirmation", async ({ page }) => {
  await start(page, "Provider Aloe"); await next(page);
  await page.getByRole("button", { name: /Search OpenPlantBook/ }).click();
  await page.getByLabel("Search OpenPlantBook (at least 3 characters)", { exact: true }).fill("aloe");
  await button(page, "Search plants").click();
  await button(page, "Aloe vera · Aloe vera").click();
  await expect(page.getByText("target: Not supplied (built-in default applies)", { exact: true })).toBeVisible();
  expect(await inventory(page)).toHaveLength(0);
  await next(page);
  await expect(page.getByRole("alert")).toContainText("Explicitly accept");
  await page.getByLabel("I reviewed and accept this species information").check();
  await next(page); await next(page);
  await expect(page.getByText("Current effective range:", { exact: false })).toBeVisible();
  await page.getByText("Advanced threshold overrides", { exact: true }).click();
  await expect(page.getByText("Default 20% · effective 20%", { exact: true })).toBeVisible();
  await page.getByLabel("target override (%)", { exact: true }).fill("42");
  await next(page); await next(page);
  expect(await inventory(page)).toHaveLength(0);
  await button(page, "Confirm and create plant").click();
  await expect(page.getByRole("heading", { name: "Provider Aloe", level: 2, exact: true })).toBeVisible();
  const sent = (await messages(page, "wizard/create"))[0]!;
  expect(sent).toMatchObject({ accepted_preview: { provider: "openplantbook", operation: "select" }, moisture: { threshold_overrides: { target: 42 } } });
  expect(sent).not.toHaveProperty("species");
  expect((await inventory(page))[0]!.roles!.moisture.threshold_defaults.target).toMatchObject({ value: 35, source: "builtin" });
});

test("existing-plant provider preview, cancel, reviewed apply and refresh preserve overrides", async ({ page }) => {
  await detail(page, "Garden Fern", "Sensors");
  await openMoisture(page, "pick");
  await button(page, "Remove sensor.removed").click();
  await show(page, "Settings");
  await page.getByLabel("Ideal", { exact: true }).fill("42");
  await button(page, "Save targets").click();
  await expect(button(page, "Save targets")).toBeEnabled();
  await page.getByRole("combobox", { name: "Species provider", exact: true }).selectOption("openplantbook");
  await page.getByLabel("Search species", { exact: true }).fill("aloe");
  await button(page, "Search species").click(); await button(page, "Aloe vera · Aloe vera").click();
  await expect(page.getByRole("dialog", { name: "Review species changes" })).toBeVisible();
  const title = page.getByRole("heading", { name: "Review species changes", exact: true });
  await expect(title).toBeFocused();
  expect(await page.getByRole("dialog").evaluate(el => el.scrollTop)).toBe(0);
  await page.keyboard.press("Shift+Tab");
  await expect(button(page, "Accept and apply reviewed species")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("dialog").locator("summary")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(button(page, "Aloe vera · Aloe vera")).toBeFocused();
  await page.keyboard.press("Enter");
  expect((await inventory(page))[1]!.species).toBeNull();
  await dialogButton(page, "Cancel").click();
  expect(await messages(page, "species/apply")).toHaveLength(0);
  await button(page, "Aloe vera · Aloe vera").click();
  await button(page, "Accept and apply reviewed species").click();
  await expect(button(page, "Preview species refresh")).toBeVisible();
  expect((await inventory(page))[1]!.roles!.moisture.threshold_overrides.target).toBe(42);
  expect((await messages(page, "species/apply"))[0]).toMatchObject({ confirmed: true, operation: "select", expected_revision: 2 });
  await button(page, "Preview species refresh").click();
  await button(page, "Accept and apply reviewed species").click();
  await expect(button(page, "Preview species refresh")).toBeEnabled();
  expect((await messages(page, "species/apply"))[1]).toMatchObject({ confirmed: true, operation: "refresh", expected_revision: 3 });
  expect((await inventory(page))[1]!.roles!.moisture.threshold_overrides.target).toBe(42);
});

test("harness PlantView role defaults match the backend-owned fixture", async ({ page }) => {
  await open(page, false);
  const fixture = JSON.parse(await readFile("../tests/fixtures/plant_view_role_defaults.json", "utf8")) as unknown;
  expect(await page.evaluate(() => window.__smartPlantsHarness.roleDefaults)).toEqual(fixture);
});

test("a newly created plant can assign and save non-moisture sources from backend defaults", async ({ page }) => {
  // Regression: new plants persist only roles.moisture. The Sensors section
  // must still open every role editor from the PlantView defaults and save.
  await start(page, "Fresh Basil");
  await finishManual(page);
  const stored = (await inventory(page)).find(p => p.name === "Fresh Basil")!;
  expect(Object.keys(stored.roles!)).toEqual(["moisture"]);
  await show(page, "Sensors");
  await expand(page, "Several sensors for one reading");
  const row = (label: string) => page.locator(`smart-plants-panel dl.sensors dt:text-is("${label}") + dd`);
  for (const label of ["Temperature", "Humidity", "Light", "Battery", "Fertilizer level", "Soil temperature", "CO₂"]) {
    await expect(row(label)).toContainText("No sensors");
    await expect(row(label)).not.toContainText("could not be read");
  }
  await row("Temperature").getByRole("button", { name: "Change how temperature sensors combine", exact: true }).click();
  const combine = page.locator("smart-plants-panel div#temperature-sources-editor");
  await expect(combine.getByRole("combobox", { name: "Combine readings", exact: true })).toHaveValue("average");
  await choose(page, "Add sensor", "Temperature");
  const editor = page.locator("smart-plants-panel section.picker div#temperature-sources-editor");
  await expect(editor).toBeVisible();
  await editor.getByRole("combobox", { name: "Add air temperature sensor", exact: true }).selectOption("sensor.living_temp");
  await editor.getByRole("button", { name: "Save temperature sensors", exact: true }).click();
  await expect(page.getByText("Temperature sensors saved.", { exact: true })).toBeVisible();
  await expect(row("Temperature")).toContainText("1 sensor · Average");
  await expect(page.locator("smart-plants-panel section.sp-card", { hasText: "Assigned sensors" })).toContainText("Living room temperature");
  expect((await messages(page, "roles/set_sources"))[0]).toMatchObject({ plant_id: stored.id, expected_revision: 1, role: "temperature", sources: [{ entity_id: "sensor.living_temp", registry_id: id(104) }] });
  const saved = (await inventory(page)).find(p => p.id === stored.id)!;
  expect(Object.keys(saved.roles!).sort()).toEqual(["moisture", "temperature"]);
  expect(saved.roles!.temperature).toMatchObject({ sources: [{ entity_id: "sensor.living_temp", registry_id: id(104) }], aggregation: "average" });
});

test("UUID rename and successful retained missing-source saves never bind a reused entity ID", async ({ page }) => {
  await detail(page, "Office Aloe", "Sensors");
  await openMoisture(page, "pick");
  await page.evaluate(() => {
    const h = window.__smartPlantsHarness;
    h.entities[0]!.entity_id = "sensor.renamed";
    h.states[0]!.entity_id = "sensor.renamed";
    h.emit("entity_registry_updated");
  });
  await expect(page.getByRole("strong").filter({ hasText: "sensor.renamed" })).toBeVisible();
  await show(page, "Settings");
  await page.getByLabel("Ideal", { exact: true }).fill("40");
  await button(page, "Save targets").click();
  await expect(button(page, "Save targets")).toBeEnabled();
  expect((await messages(page, "moisture/configure"))[0]).toMatchObject({ moisture: { sources: [{ entity_id: "sensor.renamed", registry_id: id(101) }], primary_entity_id: "sensor.renamed" } });
  await page.evaluate(() => {
    const h = window.__smartPlantsHarness;
    h.entities[0]!.id = "00000000-0000-4000-8000-000000000999";
    h.states[0]!.state = "99";
    h.evaluations[h.plants[0]!.id] = { computed_percent: null, health_score: null, needs_water: null, too_wet: null, sensor_stale: true, computed_available: false, reasons: ["Assigned registered source is missing."] };
    h.emit("entity_registry_updated");
  });
  await show(page, "Sensors");
  await expect(page.getByText("Missing registered sensor — replace it or review Repairs.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Home Assistant Repairs" })).toHaveAttribute("href", "/config/repairs");
  await openMoisture(page, "combine");
  await page.getByLabel("Not updating after (seconds, 60–604800)", { exact: true }).fill("3600");
  await show(page, "Settings");
  await page.getByLabel("Ideal", { exact: true }).fill("42");
  await button(page, "Save targets").click();
  await expect(button(page, "Save targets")).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await messages(page, "moisture/configure")).toHaveLength(2);
  expect((await messages(page, "moisture/configure"))[1]).toMatchObject({ expected_revision: 2, moisture: { sources: [{ entity_id: "sensor.renamed", registry_id: id(101) }], primary_entity_id: "sensor.renamed", stale_after_seconds: 3600, threshold_overrides: { min: null, target: 42, max: null } } });
  expect((await inventory(page))[0]).toMatchObject({ revision: 3, roles: { moisture: { sources: [{ entity_id: "sensor.renamed", registry_id: id(101) }], primary_entity_id: "sensor.renamed", stale_after_seconds: 3600, threshold_overrides: { target: 42 } } } });
  await refreshData(page);
  await expect(page.getByLabel("Ideal", { exact: true })).toHaveValue("42");
  await show(page, "Overview");
  await expect(page.getByText("99 %", { exact: true })).toHaveCount(0);
  await show(page, "Sensors");
  await expect(page.getByLabel("Not updating after (seconds, 60–604800)", { exact: true })).toHaveValue("3600");
  await openMoisture(page, "pick");
  await expect(page.getByText("Missing registered sensor — replace it or review Repairs.", { exact: true })).toBeVisible();
  await expect(page.getByText("99 %", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open Home Assistant Repairs" })).toBeVisible();
  await expand(page, "Troubleshooting");
  await expect(page.locator("smart-plants-panel dl.moisture-evaluation")).toContainText("Assigned registered source is missing.");
  await button(page, "Remove sensor.renamed").click();
  await page.getByRole("combobox", { name: "Add moisture sensor", exact: true }).selectOption("sensor.renamed");
  await button(page, "Save soil moisture sensors").click();
  await expect(button(page, "Add sensor")).toBeEnabled();
  expect((await messages(page, "moisture/configure"))[2]).toMatchObject({ expected_revision: 3, moisture: { sources: [{ entity_id: "sensor.renamed", registry_id: id(999) }], primary_entity_id: null } });
});

test("source metadata fallback and explicit unregistered input display availability warnings", async ({ page }) => {
  await detail(page, "Office Aloe", "Sensors");
  await openMoisture(page, "pick");
  const selector = page.getByRole("combobox", { name: "Add moisture sensor", exact: true });
  expect(await selector.locator("option").allTextContents()).not.toEqual(expect.arrayContaining([expect.stringContaining("Metadata-free")]));
  await page.getByLabel("Show all sensors (metadata fallback)").check();
  await selector.selectOption("sensor.metadata_free");
  await expect(page.getByText("Unexpected metadata: evaluation requires numeric 0–100 %", { exact: true })).toBeVisible();
  await page.getByLabel("Assign an unavailable or unregistered sensor", { exact: true }).fill("sensor.offline");
  await page.getByLabel("Assign an unavailable or unregistered sensor", { exact: true }).press("Enter");
  await expect(page.getByText("Unregistered: renames cannot be followed reliably. Currently unavailable", { exact: true })).toBeVisible();
  await button(page, "Save soil moisture sensors").click();
  await expect(button(page, "Add sensor")).toBeEnabled();
  expect((await messages(page, "moisture/configure"))[0]).toMatchObject({ moisture: { sources: [{ entity_id: "sensor.soil", registry_id: id(101) }, { entity_id: "sensor.metadata_free", registry_id: id(103) }, { entity_id: "sensor.offline", registry_id: null }] } });
});

test("invalid thresholds and staleness block writes; inherit restores attributed defaults", async ({ page }) => {
  await detail(page, "Office Aloe");
  await expect(page.getByText("Values come from the species unless you change them.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Needs water below", { exact: true })).toHaveAttribute("placeholder", "20");
  await page.getByLabel("Needs water below", { exact: true }).fill("50");
  await button(page, "Save targets").click();
  await expect(page.getByRole("alert")).toContainText("Effective moisture thresholds");
  expect(await messages(page, "moisture/configure")).toHaveLength(0);
  await page.getByLabel("Needs water below", { exact: true }).fill("");
  await show(page, "Sensors");
  await openMoisture(page, "combine");
  await page.getByLabel("Not updating after (seconds, 60–604800)", { exact: true }).fill("59");
  await button(page, "Save soil moisture sensors").click();
  await expect(page.getByRole("alert")).toContainText("“Not updating after” must be a whole number");
  expect(await messages(page, "moisture/configure")).toHaveLength(0);
  await page.getByLabel("Not updating after (seconds, 60–604800)", { exact: true }).fill("60");
  await show(page, "Settings");
  await page.getByLabel("Ideal", { exact: true }).fill("40");
  await button(page, "Save targets").click();
  await expect(button(page, "Save targets")).toBeEnabled();
  await expect(page.getByText("You set your own values", { exact: false })).toBeVisible();
  await button(page, "Reset to defaults").click();
  await button(page, "Save targets").click();
  await expect(button(page, "Save targets")).toBeEnabled();
  const m = (await inventory(page))[0]!.roles!.moisture;
  expect(m.threshold_overrides).toEqual({ min: null, target: null, max: null });
  expect(m.threshold_defaults.min).toMatchObject({ source: "provider", value: 20 });
});

test("authenticated image upload, decoded display, replacement, navigation and removal revoke blobs", async ({ page }) => {
  await detail(page);
  await photo(page, "Add photo");
  const image = page.getByAltText("Photo of Office Aloe", { exact: true });
  await expect(image).toBeVisible();
  await expect(image).toHaveJSProperty("naturalWidth", 160);
  const first = await image.getAttribute("src");
  await photo(page, "Change photo");
  await expect(image).not.toHaveAttribute("src", first!);
  await expect(image).toHaveJSProperty("naturalWidth", 160);
  expect(await page.evaluate(url => window.__smartPlantsHarness.blobsRevoked.includes(url!), first)).toBe(true);
  const second = await image.getAttribute("src");
  await backToOverview(page);
  expect(await page.evaluate(url => window.__smartPlantsHarness.blobsRevoked.includes(url!), second)).toBe(true);
  await button(page, "Office Aloe").click(); await show(page, "Settings");
  await expect(image).toBeVisible();
  await button(page, "Remove photo").click();
  await expect(page.getByText("No photo yet.", { exact: true })).toBeVisible();
  const requests = await page.evaluate(() => window.__smartPlantsHarness.requests);
  // The GET after the second upload's GET is the overview card thumbnail.
  expect(requests.map(r => r.method)).toEqual(["POST", "GET", "POST", "GET", "GET", "GET", "DELETE"]);
  expect(requests.every(r => r.authorization === "Bearer playwright-token")).toBe(true);
  expect(requests.filter(r => r.method === "POST").every(r => r.contentType === "image/png" && r.bytes > 0)).toBe(true);
  expect(requests.filter(r => r.method !== "GET").map(r => r.path.split("expected_revision=")[1])).toEqual(["1", "2", "3"]);
});

test("image validation and backend errors remain actionable and sanitized", async ({ page }) => {
  await detail(page);
  await page.getByLabel("Add photo", { exact: true }).setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("broken") });
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await page.evaluate(() => window.__smartPlantsHarness.requests)).toHaveLength(0);
  await photo(page, "Add photo", 2049);
  await expect(page.getByRole("alert")).toContainText("2048");
  await page.getByLabel("Add photo", { exact: true }).setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await expect(page.getByRole("alert")).toContainText("5 MiB");
  expect(await page.evaluate(() => window.__smartPlantsHarness.requests)).toHaveLength(0);
  await page.evaluate(() => { window.__smartPlantsHarness.imageFailure = "invalid_format"; });
  await photo(page, "Add photo");
  await expect(page.getByRole("alert")).toContainText("server rejected the input");
  expect((await inventory(page))[0]!.image).toBeNull();
  await page.evaluate(() => { window.__smartPlantsHarness.imageFailure = null; });
  await photo(page, "Add photo");
  await expect(page.getByAltText("Photo of Office Aloe")).toHaveJSProperty("naturalWidth", 160);
});

test("late image reads and uploads cannot replace a newer navigation context", async ({ page }) => {
  await detail(page); await photo(page, "Add photo");
  await expect(page.getByAltText("Photo of Office Aloe")).toHaveJSProperty("naturalWidth", 160);
  await backToOverview(page);
  await page.evaluate(() => { window.__smartPlantsHarness.holdNext["image/GET"] = true; });
  await button(page, "Office Aloe").click(); await show(page, "Settings");
  await expect(page.getByText("Loading photo…", { exact: true })).toBeVisible();
  await backToOverview(page);
  await button(page, "Garden Fern").click(); await show(page, "Settings");
  await page.evaluate(() => window.__smartPlantsHarness.release("image/GET"));
  await expect(page.getByText("No photo yet.", { exact: true })).toBeVisible();
  // Every plant page photo blob is released; only live overview thumbnails remain.
  await expect.poll(() => page.evaluate(() => {
    const h = window.__smartPlantsHarness;
    const panel = document.querySelector("smart-plants-panel") as unknown as { _thumbnails: Record<string, string> };
    const thumbnails = Object.values(panel._thumbnails);
    return h.blobsCreated.filter(url => !thumbnails.includes(url)).every(url => h.blobsRevoked.includes(url));
  })).toBe(true);
  await backToOverview(page); await button(page, "Office Aloe").click(); await show(page, "Settings");
  await expect(page.getByAltText("Photo of Office Aloe")).toHaveJSProperty("naturalWidth", 160);
  await page.evaluate(() => { window.__smartPlantsHarness.holdNext["image/POST"] = true; });
  await photo(page, "Change photo");
  await expect.poll(() => page.evaluate(() => Object.hasOwn(window.__smartPlantsHarness.pending, "image/POST"))).toBe(true);
  await page.evaluate(() => window.__smartPlantsHarness.emit("disconnected"));
  await backToOverview(page); await button(page, "Garden Fern").click(); await show(page, "Settings");
  await page.evaluate(() => window.__smartPlantsHarness.emit("ready"));
  await expect(button(page, "Save name")).toBeEnabled();
  await page.evaluate(() => window.__smartPlantsHarness.release("image/POST"));
  await expect(page.getByRole("heading", { name: "Garden Fern", level: 2, exact: true })).toBeVisible();
  await expect(page.getByText("No photo yet.", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("held creation rejects double submission and late provider preview is ignored after disconnect", async ({ page }) => {
  await start(page); await next(page);
  await page.getByRole("button", { name: /Search OpenPlantBook/ }).click();
  await page.getByLabel("Search OpenPlantBook (at least 3 characters)", { exact: true }).fill("aloe");
  await button(page, "Search plants").click();
  await page.evaluate(() => { window.__smartPlantsHarness.holdNext["smart_plants/wizard/preview"] = true; });
  await button(page, "Aloe vera · Aloe vera").click();
  await expect.poll(() => page.evaluate(() => Object.hasOwn(window.__smartPlantsHarness.pending, "smart_plants/wizard/preview"))).toBe(true);
  await page.evaluate(() => window.__smartPlantsHarness.emit("disconnected"));
  await page.evaluate(() => window.__smartPlantsHarness.emit("ready"));
  await expect(button(page, "Next step")).toBeEnabled();
  await page.evaluate(() => window.__smartPlantsHarness.release("smart_plants/wizard/preview"));
  await expect(page.getByLabel("I reviewed and accept this species information")).toHaveCount(0);
  await button(page, "Enter details manually instead").click();
  for (let i = 0; i < 4; i++) await next(page);
  await page.evaluate(() => { window.__smartPlantsHarness.holdNext["smart_plants/wizard/create"] = true; });
  await button(page, "Confirm and create plant").click();
  await expect(button(page, "Retry same creation request")).toBeDisabled();
  await page.keyboard.press("Enter");
  expect(await messages(page, "wizard/create")).toHaveLength(1);
  await page.evaluate(() => window.__smartPlantsHarness.release("smart_plants/wizard/create"));
  await expect(page.getByRole("heading", { name: "Manual Aloe", level: 2, exact: true })).toBeVisible();
  expect(await inventory(page)).toHaveLength(1);
});

for (const removed of [false, true]) {
  test(`replayed creation preserves a subsequently ${removed ? "removed" : "replaced"} photo`, async ({ page }) => {
    await start(page, "Replay photo plant"); await photo(page, "Optional local photo");
    for (let step = 0; step < 5; step++) await next(page);
    await page.evaluate(() => { window.__smartPlantsHarness.loseCreateResponse = true; });
    await button(page, "Confirm and create plant").click();
    await expect(button(page, "Retry same creation request")).toBeEnabled();
    await backToOverview(page); await refreshData(page);
    await button(page, "Replay photo plant").click(); await show(page, "Settings");
    await photo(page, "Add photo");
    await expect(page.getByAltText("Photo of Replay photo plant")).toHaveJSProperty("naturalWidth", 160);
    if (removed) { await button(page, "Remove photo").click(); await expect(page.getByText("No photo yet.", { exact: true })).toBeVisible(); }
    const current = (await inventory(page))[0]!;
    expect(current.revision).toBe(removed ? 3 : 2);
    const writesBefore = await page.evaluate(() => window.__smartPlantsHarness.requests.filter(r => r.method !== "GET"));
    await backToOverview(page); await addPlant(page);
    await button(page, "Retry same creation request").click();
    await expect(page.getByRole("status").filter({ hasText: "original wizard photo was not uploaded" })).toBeVisible();
    await show(page, "Settings");
    await expect(button(page, "Save name")).toBeEnabled();
    await refreshData(page);
    expect((await inventory(page))[0]).toEqual(current);
    expect(await page.evaluate(() => window.__smartPlantsHarness.requests.filter(r => r.method !== "GET"))).toEqual(writesBefore);
    const requests = await messages(page, "wizard/create"); expect(requests).toHaveLength(2); expect(requests[1]).toEqual(requests[0]);
    if (removed) await expect(page.getByText("No photo yet.", { exact: true })).toBeVisible();
    else await expect(page.getByAltText("Photo of Replay photo plant")).toHaveJSProperty("naturalWidth", 160);
  });
}

for (const withPhoto of [false, true]) {
  test(`hidden committed creation preserves another editor and reconciles inventory, photo=${withPhoto}`, async ({ page }, info) => {
  await open(page); await addPlant(page);
    await page.getByLabel("Plant name", { exact: true }).fill("Background plant");
    if (withPhoto) await photo(page, "Optional local photo");
    for (let step = 0; step < 5; step++) await next(page);
    await page.evaluate(withPhoto => {
      const h = window.__smartPlantsHarness;
      h.holdNext["smart_plants/wizard/create"] = true;
      if (withPhoto) h.holdNext["image/POST"] = true;
    }, withPhoto);
    await button(page, "Confirm and create plant").click();
    await expect.poll(() => page.evaluate(() => Object.hasOwn(window.__smartPlantsHarness.pending, "smart_plants/wizard/create"))).toBe(true);
    await backToOverview(page); await button(page, "Office Aloe").click(); await show(page, "Settings");
    await page.getByLabel("Name", { exact: true }).fill("Unsaved Office name");
    await page.getByLabel("Category", { exact: true }).fill("Unsaved category");
    await page.getByLabel("Name", { exact: true }).focus();
    await page.evaluate(() => window.__smartPlantsHarness.release("smart_plants/wizard/create"));
    await expect(page.locator("smart-plants-wizard")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Office Aloe", level: 2, exact: true })).toBeVisible();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Unsaved Office name");
    await expect(page.getByLabel("Category", { exact: true })).toHaveValue("Unsaved category");
    await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
    if (withPhoto) {
      await expect.poll(() => page.evaluate(() => Object.hasOwn(window.__smartPlantsHarness.pending, "image/POST"))).toBe(true);
      // A late upload must not block or take over the unrelated editor either.
      await expect(button(page, "Save name")).toBeEnabled();
      await page.getByLabel("Name", { exact: true }).fill("Still unsaved during upload");
      await page.evaluate(() => window.__smartPlantsHarness.release("image/POST"));
      await expect(page.getByRole("status").filter({ hasText: "Selected photo uploaded." })).toBeVisible();
      await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Still unsaved during upload");
      await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
      await expect(page.getByLabel("Category", { exact: true })).toHaveValue("Unsaved category");
      const requests = await page.evaluate(() => window.__smartPlantsHarness.requests);
      expect(requests).toHaveLength(1); expect(requests[0]).toMatchObject({ method: "POST", path: `/api/smart_plants/plants/${id(1001)}/image?expected_revision=1` });
    }
    expect(await messages(page, "wizard/create")).toHaveLength(1);
    expect((await inventory(page)).filter(p => p.name === "Background plant")).toHaveLength(1);
    await audit(page, info, `background-create-photo-${withPhoto}`);
    await screenshot(page, info, `background-create-photo-${withPhoto}`);
    await button(page, "Save name").click(); await expect(button(page, "Save name")).toBeEnabled();
    expect((await inventory(page))[0]!.name).toBe(withPhoto ? "Still unsaved during upload" : "Unsaved Office name");
    await expect(page.getByLabel("Category", { exact: true })).toHaveValue("Unsaved category");
    await backToOverview(page); await button(page, "Background plant").click();
    if (withPhoto) await expect(page.getByAltText("Photo of Background plant")).toHaveJSProperty("naturalWidth", 160);
    else { await show(page, "Settings"); await expect(page.getByText("No photo yet.", { exact: true })).toBeVisible(); }
  });
}

test("native area changes require review of a dirty selection without automatic writeback", async ({ page }) => {
  await detail(page);
  await page.getByRole("combobox", { name: "Home Assistant area", exact: true }).selectOption("garden");
  await page.evaluate(() => { const h = window.__smartPlantsHarness; h.devices[0]!.area_id = null; h.emit("device_registry_updated"); });
  await expect(button(page, "I reviewed the native area change")).toBeVisible();
  await expect(button(page, "Save area")).toBeDisabled();
  expect(await messages(page, "plants/set_area")).toHaveLength(0);
  await button(page, "I reviewed the native area change").click();
  await expect(page.getByRole("combobox", { name: "Home Assistant area", exact: true })).toHaveValue("garden");
  await button(page, "Save area").click();
  await expect(page.getByText(/Garden · also sets the device area/)).toBeVisible();
  expect((await messages(page, "plants/set_area"))[0]).toMatchObject({ area_id: "garden", expected_revision: 1 });
});

test("tile filters, search, authoritative detail and native links", async ({ page }) => {
  await open(page);
  await overview(page).getByLabel("Search plants", { exact: true }).fill("succulent");
  await expect(overview(page).getByRole("status")).toHaveText("2 of 3 plants");
  await overview(page).getByLabel("Search plants", { exact: true }).fill("aloe vera");
  await expect(cards(page)).toHaveCount(1);
  await expect(button(page, "Garden Fern")).toHaveCount(0);
  await button(page, "Office Aloe").click();
  await expect(page.locator("smart-plants-panel .keyreads")).toContainText("12%");
  await expect(page.getByRole("link", { name: "Open device" })).toHaveAttribute("href", `/config/devices/device/device-${id(1)}`);
  await expect(page.getByRole("link", { name: "Create automation" })).toHaveAttribute("href", `/config/automation/edit/new?add_automation_element=trigger&target_device_id=device-${id(1)}`);
  await show(page, "Sensors");
  await expand(page, "Troubleshooting");
  await expect(page.getByText("automation.plant_reminder", { exact: true })).toBeVisible();
  await backToOverview(page);
  await expect(overview(page).getByLabel("Search plants", { exact: true })).toHaveValue("aloe vera");
  await tile(page, "Sensor issues").click();
  await expect(overview(page).getByText("No plants match", { exact: true })).toBeVisible();
  await button(page, "Show all plants").click();
  await expect(overview(page).getByLabel("Search plants", { exact: true })).toHaveValue("");
  await tile(page, "Sensor issues").click();
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("No recent data");
  await button(page, "Garden Fern").click();
  await expect(page.locator("smart-plants-panel .readings, smart-plants-panel #detail-panel").getByText("Not updating", { exact: false }).first()).toBeVisible();
  await backToOverview(page);
  await button(page, "Clear filter").click();
  await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).last()).toContainText("Paused");
  await noOverflow(page);
});

test("watering from a card logs now and can be undone from the toast", async ({ page }, info) => {
  await open(page);
  await page.evaluate(() => {
    const w = window as unknown as { __toasts: { message: string; action?: { text: string; action: () => void } }[] };
    w.__toasts = [];
    document.addEventListener("hass-notification", e => w.__toasts.push((e as CustomEvent).detail));
  });
  const card = cards(page).filter({ hasText: "Office Aloe" });
  await expect(card).toContainText("Not watered yet");
  await button(page, "Log watering for Office Aloe").click();
  await expect(card).toContainText("Watered just now");
  const [added] = await messages(page, "care/add_watering");
  expect(added).toMatchObject({ plant_id: id(1), expected_revision: 1, note: null });
  expect(String((added as { occurred_at: string }).occurred_at)).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
  expect((await inventory(page))[0]!.care_events).toHaveLength(1);
  const toast = await page.evaluate(() => { const t = (window as unknown as { __toasts: { message: string; action?: { text: string } }[] }).__toasts[0]!; return { message: t.message, action: t.action?.text }; });
  expect(toast).toEqual({ message: "Watering logged for Office Aloe", action: "Undo" });
  await audit(page, info, "overview-after-watering");
  await page.evaluate(() => (window as unknown as { __toasts: { action: { action: () => void } }[] }).__toasts[0]!.action.action());
  await expect(card).toContainText("Not watered yet");
  expect(await messages(page, "care/delete")).toHaveLength(1);
  expect((await inventory(page))[0]!.care_events).toHaveLength(0);
});

test("revision conflict retains dirty edits and requires explicit review and reapply", async ({ page }) => {
  await detail(page);
  await page.getByLabel("Name", { exact: true }).fill("My local name");
  await page.evaluate(() => { window.__smartPlantsHarness.conflictNext = true; });
  await button(page, "Save name").click();
  await expect(page.getByRole("heading", { name: "Review changes from another session" })).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("My local name");
  await expect(button(page, "Save name")).toBeDisabled();
  expect(await messages(page, "plants/update")).toHaveLength(1);
  await button(page, "I reviewed changes; retain my edits for reapply").click();
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue("Remote category");
  expect((await inventory(page))[0]!.name).toBe("Remote renamed plant");
  await button(page, "Save name").click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("My local name");
  expect((await messages(page, "plants/update")).map(m => m.expected_revision)).toEqual([1, 2]);
});

test("lifecycle and permanent deletion require explicit keyboard-accessible dialog confirmation", async ({ page }) => {
  await detail(page);
  await button(page, "Pause").click();
  await expect(button(page, "Resume")).toBeVisible();
  await show(page, "Overview");
  await expect(page.getByText("Monitoring is paused.", { exact: true })).toBeVisible();
  await show(page, "Settings");
  await button(page, "Resume").click();
  await expect(button(page, "Pause")).toBeVisible();
  const trigger = button(page, "Delete");
  await trigger.focus(); await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Delete Office Aloe?" });
  await expect(dialog).toBeVisible();
  await expect(dialogButton(page, "Cancel")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialogButton(page, "Permanently delete plant")).toBeFocused();
  await page.keyboard.press("Tab"); await expect(dialogButton(page, "Cancel")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  expect(await messages(page, "plants/delete")).toHaveLength(0);
  await page.keyboard.press("Enter"); await dialogButton(page, "Cancel").click();
  expect(await inventory(page)).toHaveLength(3);
  await trigger.click(); await dialogButton(page, "Permanently delete plant").click();
  await expect(button(page, "Office Aloe")).toHaveCount(0);
  await expect(button(page, "Garden Fern")).toBeVisible();
  expect(await messages(page, "plants/delete")).toEqual([{ type: ws("plants/delete"), plant_id: id(1), expected_revision: 3 }]);
});

test("disconnect blocks mutations, revokes image and preserves edits through reconnect", async ({ page }) => {
  await detail(page); await photo(page, "Add photo");
  await expect(page.getByAltText("Photo of Office Aloe")).toBeVisible();
  const src = await page.getByAltText("Photo of Office Aloe").getAttribute("src");
  await page.getByLabel("Name", { exact: true }).fill("Offline edit");
  await page.evaluate(() => window.__smartPlantsHarness.emit("disconnected"));
  await expect(page.getByRole("alert")).toContainText("Disconnected");
  await expect(button(page, "Save name")).toBeDisabled();
  await expect(page.getByAltText("Photo of Office Aloe")).toHaveCount(0);
  expect(await page.evaluate(url => window.__smartPlantsHarness.blobsRevoked.includes(url!), src)).toBe(true);
  await page.evaluate(() => window.__smartPlantsHarness.emit("ready"));
  await expect(button(page, "Save name")).toBeEnabled();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Offline edit");
  await expect(page.getByAltText("Photo of Office Aloe")).toHaveJSProperty("naturalWidth", 160);
  await button(page, "Save name").click();
  await expect(page.getByRole("heading", { name: "Offline edit", level: 2, exact: true })).toBeVisible();
});

test("uncertain committed creation resends identical request after reconnect without duplicates", async ({ page }) => {
  await start(page);
  for (let i = 0; i < 5; i++) await next(page);
  await page.evaluate(() => { window.__smartPlantsHarness.loseCreateResponse = true; });
  await button(page, "Confirm and create plant").click();
  await expect(button(page, "Retry same creation request")).toBeEnabled();
  expect(await inventory(page)).toHaveLength(1);
  await page.evaluate(() => window.__smartPlantsHarness.emit("disconnected"));
  await expect(button(page, "Retry same creation request")).toBeDisabled();
  await page.evaluate(() => window.__smartPlantsHarness.emit("ready"));
  await expect(button(page, "Retry same creation request")).toBeEnabled();
  await button(page, "Retry same creation request").click();
  await expect(page.getByRole("heading", { name: "Manual Aloe", level: 2, exact: true })).toBeVisible();
  const requests = await messages(page, "wizard/create");
  expect(requests).toHaveLength(2); expect(requests[0]).toEqual(requests[1]);
  expect(await inventory(page)).toHaveLength(1);
});

for (const code of ["provider_disabled", "provider_authentication", "provider_rate_limit", "provider_timeout", "provider_outage", "provider_malformed_response"]) {
  test(`manual creation remains available after ${code}`, async ({ page }) => {
    await start(page); await next(page);
    await page.evaluate(code => { window.__smartPlantsHarness.failures["smart_plants/species/search"] = code; }, code);
    await page.getByRole("button", { name: /Search OpenPlantBook/ }).click();
    await page.getByLabel("Search OpenPlantBook (at least 3 characters)", { exact: true }).fill("aloe");
    await button(page, "Search plants").click();
    await expect(page.getByRole("alert")).toContainText(code);
    // The error action and provider form both expose a manual continuation.
    await page.getByRole("button", { name: "Continue manually", exact: true }).first().click();
    await page.getByLabel("Common name", { exact: true }).fill("Offline aloe");
    await finishManual(page);
    expect((await inventory(page))[0]!.species?.provider).toBe("manual");
    expect(await messages(page, "wizard/preview")).toHaveLength(0);
  });
}

test("disabled provider capability supports completely network-free manual creation", async ({ page }) => {
  await open(page, false);
  await page.evaluate(() => { window.__smartPlantsHarness.providerAvailable = false; });
  await refreshData(page);
  await overview(page).getByRole("button", { name: "Add plant", exact: true }).click();
  await page.getByLabel("Plant name", { exact: true }).fill("Offline plant");
  await next(page);
  await expect(page.getByText("OpenPlantBook is not connected", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get OpenPlantBook API credentials" })).toHaveAttribute("href", "https://open.plantbook.io/apikey/");
  await finishManual(page);
  expect(await messages(page, "species/search")).toHaveLength(0);
  expect((await inventory(page))[0]!.species).toBeNull();
});

test("malformed plant, registry, evaluation and API-version responses fail closed and recover", async ({ page }) => {
  await detail(page, "Office Aloe", "Sensors");
  await page.evaluate(() => { window.__smartPlantsHarness.malformed["config/entity_registry/list"] = [{ entity_id: "sensor.bad" }]; });
  await refreshData(page);
  await expect(page.getByRole("alert")).toContainText("Registry/state data unavailable");
  await openMoisture(page, "pick");
  await button(page, "Save soil moisture sensors").click();
  expect(await messages(page, "moisture/configure")).toHaveLength(0);
  await page.evaluate(() => {
    const h = window.__smartPlantsHarness; h.malformed = {};
    h.malformed["smart_plants/moisture/evaluation"] = { evaluation: { computed_available: false, computed_percent: 50, health_score: 100, needs_water: false, too_wet: false, sensor_stale: false, reasons: [] } };
  });
  await refreshData(page);
  await expand(page, "Troubleshooting");
  await expect(page.getByText("No evaluation is available right now.", { exact: true })).toBeVisible();
  await show(page, "Settings");
  await page.evaluate(() => { window.__smartPlantsHarness.malformed["smart_plants/plants/list"] = { plants: [{ name: "PRIVATE_SENTINEL" }] }; });
  await refreshData(page);
  await expect(page.getByRole("alert")).toContainText("response is incompatible");
  await expect(button(page, "Save name")).toBeDisabled();
  await page.evaluate(() => { window.__smartPlantsHarness.malformed = { "smart_plants/panel/info": { api_version: 2, schema_version: 1, providers: [] } }; });
  await refreshData(page);
  await expect(page.getByRole("alert")).toContainText("Panel/API version mismatch");
  await page.evaluate(() => { window.__smartPlantsHarness.malformed = {}; });
  await refreshData(page);
  await expect(button(page, "Save name")).toBeEnabled();
});

test("integration unload and malformed provider preview preserve local state", async ({ page }) => {
  await detail(page);
  await page.getByLabel("Name", { exact: true }).fill("Pending name");
  await page.evaluate(() => { window.__smartPlantsHarness.failures["smart_plants/plants/update"] = "integration_not_loaded"; });
  await button(page, "Save name").click();
  await expect(page.getByRole("alert")).toContainText("Smart Plants is not loaded");
  await expect(button(page, "Save name")).toBeDisabled();
  await page.evaluate(() => { window.__smartPlantsHarness.failures = {}; });
  await refreshData(page);
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Pending name");
  await page.evaluate(() => { window.__smartPlantsHarness.malformed["smart_plants/species/refresh_preview"] = { provider: "openplantbook", snapshot: { common_name: "PRIVATE_SENTINEL" } }; });
  await button(page, "Preview species refresh").click();
  await expect(page.getByRole("alert")).toContainText("response is incompatible");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await messages(page, "species/apply")).toHaveLength(0);
  expect((await inventory(page))[0]!.name).toBe("Office Aloe");
});

test("axe full-rule audit and screenshots cover overview, all seven steps, detail, dialogs and error", async ({ page }, info) => {
  test.setTimeout(120000);
  await open(page, false); await audit(page, info, "empty");
  await overview(page).getByRole("button", { name: "Add plant", exact: true }).click();
  await page.getByLabel("Plant name", { exact: true }).fill("Accessible Aloe");
  await photo(page, "Optional local photo");
  const steps = ["basic", "species-manual", "sources", "thresholds", "taxonomy", "review"];
  for (const [i, name] of steps.entries()) {
    if (i === 2) { await page.getByRole("combobox", { name: "Add moisture sensor", exact: true }).selectOption("sensor.soil"); await page.getByRole("combobox", { name: "Main sensor", exact: true }).selectOption("sensor.soil"); }
    if (i === 4) { await page.getByLabel("Category", { exact: true }).fill("Houseplant"); await page.getByLabel("Tags (comma-separated)", { exact: true }).fill("sunny, office"); }
    await audit(page, info, name);
    await screenshot(page, info, name);
    if (i === 3) {
      await page.getByText("Advanced threshold overrides", { exact: true }).click();
      await audit(page, info, "thresholds-expanded");
    }
    if (i < 5) await next(page);
  }
  await button(page, "Confirm and create plant").click();
  await expect(page.getByAltText("Photo of Accessible Aloe")).toHaveJSProperty("naturalWidth", 160);
  await audit(page, info, "detail-photo"); await screenshot(page, info, "detail-photo");
  await show(page, "Settings");
  await button(page, "Delete").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, info, "delete-dialog"); await screenshot(page, info, "delete-dialog");
  await dialogButton(page, "Cancel").click();
  await page.getByRole("combobox", { name: "Species provider", exact: true }).selectOption("openplantbook");
  await page.getByLabel("Search species", { exact: true }).fill("aloe");
  await button(page, "Search species").click(); await button(page, "Aloe vera · Aloe vera").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, info, "provider-dialog"); await screenshot(page, info, "provider-dialog");
  await dialogButton(page, "Cancel").click();
  await page.evaluate(() => window.__smartPlantsHarness.emit("disconnected"));
  await audit(page, info, "disconnected"); await screenshot(page, info, "disconnected");
  await open(page); await audit(page, info, "populated-overview"); await screenshot(page, info, "populated-overview");
  await button(page, "Garden Fern").click();
  await show(page, "Settings");
  await audit(page, info, "missing-source-detail"); await screenshot(page, info, "missing-source-detail");
  await page.getByLabel("Name", { exact: true }).fill("Pending Fern");
  await page.evaluate(() => { window.__smartPlantsHarness.conflictNext = true; });
  await button(page, "Save name").click();
  await expect(page.getByRole("heading", { name: "Review changes from another session" })).toBeVisible();
  await audit(page, info, "conflict"); await screenshot(page, info, "conflict");

  await start(page, "Reviewed Aloe"); await next(page);
  await page.getByRole("button", { name: /Search OpenPlantBook/ }).click();
  await page.getByLabel("Search OpenPlantBook (at least 3 characters)", { exact: true }).fill("aloe");
  await button(page, "Search plants").click();
  await expect(button(page, "Aloe vera · Aloe vera")).toBeVisible();
  await audit(page, info, "wizard-provider-results"); await screenshot(page, info, "wizard-provider-results");
  await button(page, "Aloe vera · Aloe vera").click();
  await expect(page.getByLabel("I reviewed and accept this species information")).toBeVisible();
  await audit(page, info, "wizard-provider-preview"); await screenshot(page, info, "wizard-provider-preview");
  await page.locator("smart-plants-wizard summary").click();
  await page.getByLabel("I reviewed and accept this species information").check();
  await audit(page, info, "wizard-provider-attribution-expanded");

  // Synthetic dark HA semantic tokens: verify inheritance rather than relying
  // solely on the browser's light fallback. This is not a live HA theme fetch.
  await open(page);
  await page.evaluate(() => {
    for (const [key, value] of Object.entries({ "primary-text-color": "#eeeeee", "secondary-text-color": "#bdbdbd", "card-background-color": "#252525", "secondary-background-color": "#303030", "divider-color": "#666666", "primary-color": "#64b5f6", "text-primary-color": "#121212", "error-color": "#ff8a80" })) document.documentElement.style.setProperty(`--${key}`, value);
    document.body.style.background = "#111111";
  });
  await page.keyboard.press("Tab");
  await button(page, "Menu").focus();
  expect(await button(page, "Menu").evaluate(el => el.matches(":focus-visible"))).toBe(true);
  await audit(page, info, "dark-overview"); await screenshot(page, info, "dark-overview");
  await button(page, "Office Aloe").click();
  await show(page, "Settings");
  await audit(page, info, "dark-detail"); await screenshot(page, info, "dark-detail");
  await button(page, "Preview species refresh").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, info, "dark-provider-dialog"); await screenshot(page, info, "dark-provider-dialog");
});
