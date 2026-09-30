import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import type { Evaluation, PlantRecord } from "../src/types.js";

// The plant page: header, tabs, quick actions and the collapsed sections, in
// the packaged artifact with synthetic data.
interface PlantHarness { plants: PlantRecord[]; messages: Array<Record<string, unknown>>; evaluations: Record<string, Evaluation>; unexpected: string[]; emit(event: string): void }
type HarnessWindow = { __smartPlantsHarness: PlantHarness };

const url = "/frontend/e2e/harness.html";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });
const menuItem = (page: Page, name: string) => page.getByRole("menuitem", { name, exact: true });
const header = (page: Page) => page.locator("smart-plants-panel .header-card");
const messages = (page: Page, type: string) => page.evaluate(t => (window as unknown as HarnessWindow).__smartPlantsHarness.messages.filter(m => m.type === t), `smart_plants/${type}`);

async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  process.stdout.write(`AXE ${info.project.name}/${name}: ${result.passes.length} rule passes; ${result.violations.length} violations; ${result.incomplete.length} incomplete (${result.incomplete.map(r => r.id).join(", ") || "none"})\n`);
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name}: no horizontal scroll`).toBe(true);
}
async function openPlant(page: Page, name: string, query = "?seed") {
  await page.goto(`${url}${query}`);
  await button(page, name).click();
  await expect(tab(page, "Overview")).toHaveAttribute("aria-selected", "true");
}
async function expand(page: Page, name: string) {
  const toggle = page.getByRole("button", { name: new RegExp(`^${name}`) });
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}
async function menu(page: Page, item: string) {
  await button(page, "Menu").click();
  await menuItem(page, item).focus(); await menuItem(page, item).press("Enter");
}
async function setEvaluation(page: Page, plant: number, evaluation: Partial<Evaluation>) {
  await page.evaluate(([plantId, patch]) => {
    const h = (window as unknown as HarnessWindow).__smartPlantsHarness;
    h.evaluations[plantId as string] = { computed_percent: 40, health_score: 90, needs_water: false, too_wet: false, sensor_stale: false, computed_available: true, reasons: [], ...(patch as object) };
    h.emit("ready");
  }, [id(plant), evaluation] as const);
}

test.beforeEach(async ({ page }) => { page.on("pageerror", error => { throw error; }); });
test.afterEach(async ({ page }) => { expect(await page.evaluate(() => (window as unknown as { __smartPlantsHarness?: PlantHarness }).__smartPlantsHarness?.unexpected ?? [])).toEqual([]); });

test("the header names each status with its reason and the key readings", async ({ page }, info) => {
  await openPlant(page, "Office Aloe");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Office Aloe");
  await expect(header(page).getByRole("heading", { name: "Office Aloe", level: 2 })).toBeVisible();
  await expect(header(page)).toContainText("Office");
  await expect(header(page)).toContainText("Aloe vera");
  await expect(header(page).locator("sp-status-chip")).toContainText("Needs water");
  await expect(header(page)).toContainText("Soil moisture 12% is below the minimum of 20%");
  await expect(header(page).getByRole("list", { name: "Key readings" })).toContainText("20–60%");
  await audit(page, info, "header-needs-water");
  await setEvaluation(page, 1, { computed_percent: 70, too_wet: true });
  await expect(header(page).locator("sp-status-chip")).toContainText("Too wet");
  await expect(header(page)).toContainText("Soil moisture 70% is above the maximum of 60%");
  await audit(page, info, "header-too-wet");
  await setEvaluation(page, 1, {});
  await expect(header(page).locator("sp-status-chip")).toContainText("Healthy");
  await expect(header(page)).toContainText("All readings are within target.");
  await audit(page, info, "header-healthy");
  await button(page, "Back").click();
  await button(page, "Garden Fern").click();
  await expect(header(page).locator("sp-status-chip")).toContainText("No recent data");
  await expect(header(page)).toContainText("No species");
  await audit(page, info, "header-stale");
  await button(page, "Back").click();
  await button(page, "Resting Cactus").click();
  await expect(header(page).locator("sp-status-chip")).toContainText("Paused");
  await expect(header(page)).toContainText("Monitoring is paused.");
  await audit(page, info, "header-paused");
});

test("tabs follow the keyboard and every tab passes axe", async ({ page }, info) => {
  await openPlant(page, "Office Aloe");
  await expect(page.getByRole("tab")).toHaveText(["Overview", "Sensors", "Care", "Settings"]);
  const readings = page.locator("smart-plants-panel section", { hasText: "Readings" }).first();
  await expect(readings).toContainText("Soil probe");
  await expect(readings).toContainText("Too low");
  await expect(readings).not.toContainText("sensor.soil");
  await expect(page.locator("smart-plants-panel dl.about")).toContainText("From OpenPlantBook");
  await audit(page, info, "tab-overview");
  await tab(page, "Overview").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Sensors")).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, "Sensors")).toBeFocused();
  await expect(page.getByRole("tabpanel", { name: "Sensors" })).toContainText("Assigned sensors");
  await expand(page, "Several sensors for one reading");
  await expand(page, "Troubleshooting");
  await expect(page.locator("smart-plants-panel dl.entity-ids")).toContainText("sensor.soil");
  await audit(page, info, "tab-sensors-expanded");
  await page.keyboard.press("Shift+Tab");
  await tab(page, "Sensors").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Care")).toHaveAttribute("aria-selected", "true");
  await button(page, "Log care").last().click();
  await expect(page.getByLabel("Care type")).toBeFocused();
  await audit(page, info, "tab-care-form");
  await tab(page, "Settings").click();
  await expand(page, "Other targets");
  await expand(page, "More details");
  await expect(page.getByLabel("Needs water below", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Too wet above", { exact: true })).toBeVisible();
  await audit(page, info, "tab-settings-expanded");
});

test("Watered in the header logs a watering and keeps the page editable", async ({ page }, info) => {
  await openPlant(page, "Office Aloe");
  await page.evaluate(() => {
    const w = window as unknown as { __toasts: string[] }; w.__toasts = [];
    document.addEventListener("hass-notification", e => w.__toasts.push((e as CustomEvent<{ message: string }>).detail.message));
  });
  await header(page).getByRole("button", { name: "Watered", exact: true }).click();
  await expect(page.locator("smart-plants-panel section", { hasText: "Recent care" })).toContainText("Watered");
  expect(await messages(page, "care/add_watering")).toHaveLength(1);
  expect(await page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts)).toEqual(["Watering logged for Office Aloe"]);
  await expect(page.getByRole("heading", { name: "Review changes from another session" })).toHaveCount(0);
  await tab(page, "Care").click();
  await expect(page.getByRole("status").filter({ hasText: "1 watering event." })).toBeVisible();
  await audit(page, info, "care-after-header-watering");
});

test("a stopped moisture sensor raises an alert on the Sensors tab", async ({ page }, info) => {
  await openPlant(page, "Garden Fern");
  await tab(page, "Sensors").click();
  const alert = page.locator("smart-plants-panel .stale-alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Missing sensor is not reporting.");
  await expect(alert).toContainText("Check the sensor's battery or connection.");
  await audit(page, info, "sensors-stale-alert");
});

test("the overflow menu opens the device, downloads diagnostics and pauses monitoring", async ({ page }) => {
  await openPlant(page, "Office Aloe");
  const download = page.waitForEvent("download");
  await menu(page, "Download diagnostics");
  const file = await download;
  expect(file.suggestedFilename()).toBe(`smart-plants-${id(1)}-diagnostics.json`);
  const text = await (await file.createReadStream()).toArray().then(chunks => Buffer.concat(chunks).toString("utf8"));
  expect(JSON.parse(text)).toMatchObject({ plant: { id: id(1) }, device_id: `device-${id(1)}` });
  expect(text).not.toContain("Office Aloe");
  await menu(page, "Pause monitoring");
  await expect(header(page).locator("sp-status-chip")).toContainText("Paused");
  expect(await messages(page, "plants/disable")).toHaveLength(1);
  await menu(page, "Resume monitoring");
  expect(await messages(page, "plants/reenable")).toHaveLength(1);
  await menu(page, "Open device");
  await expect.poll(() => page.evaluate(() => location.pathname)).toBe(`/config/devices/device/device-${id(1)}`);
});

test("the history card charts soil moisture with its target range, waterings and drying rate", async ({ page }, info) => {
  await openPlant(page, "Office Aloe", "?seed&history");
  const card = page.locator("smart-plants-panel .history-card");
  await expect(card.getByRole("heading", { name: "History" })).toBeVisible();
  await expect(card.getByRole("img", { name: /^Soil moisture, last 7 days: from 24% to 40%, lowest / })).toBeVisible();
  await expect(card).toContainText("Target: 20–60%");
  await expect(card).toContainText("Watering logged");
  await expect(card.locator("sp-history-chart line.marker")).toHaveCount(1);
  await expect(card.locator(".history-rate")).toHaveText(/Dropping about 2\.9% per day since the last watering\. At this rate it reaches the minimum of 20% in about 7 days\./);
  await expect(card.getByRole("group", { name: "Reading" })).toHaveCount(0);
  await audit(page, info, "history-chart");

  const slider = card.getByRole("slider", { name: "Point in time" });
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(slider).toHaveAttribute("aria-valuetext", /: 24% \(23\.4–24\.6%\)$/);
  await expect(card.locator("sp-history-chart .readout")).toHaveText(/: 24% \(23\.4–24\.6%\)$/);
  await expect(card.locator("sp-history-chart .cursor")).toHaveCount(1);
  await audit(page, info, "history-chart-readout");

  await card.getByRole("button", { name: "1 year", exact: true }).click();
  await expect(card.getByRole("button", { name: "1 year", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("img", { name: /^Soil moisture, last year: from 40% to 40%/ })).toBeVisible();
  await expect(card.locator(".history-rate")).toHaveCount(0);
  const requests = await page.evaluate(() => (window as unknown as HarnessWindow).__smartPlantsHarness.messages.filter(m => m.type === "recorder/statistics_during_period"));
  expect(requests.map(m => [m.statistic_ids, m.period])).toEqual([[["sensor.office_aloe_soil_moisture"], "hour"], [["sensor.office_aloe_soil_moisture"], "day"]]);

  await page.evaluate(() => {
    const w = window as unknown as { __moreInfo: unknown[] }; w.__moreInfo = [];
    document.addEventListener("hass-more-info", e => w.__moreInfo.push((e as CustomEvent).detail));
  });
  await card.getByRole("button", { name: "Open in Home Assistant", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __moreInfo: unknown[] }).__moreInfo)).toEqual([{ entityId: "sensor.office_aloe_soil_moisture" }]);
});

test("the history card explains a missing recorder and stays out of plants without a sensor of their own", async ({ page }, info) => {
  await openPlant(page, "Office Aloe");
  await expect(page.locator("smart-plants-panel .history-card")).toHaveCount(0);
  await page.goto(`${url}?seed&history`);
  await page.evaluate(() => { (window as unknown as { __smartPlantsHarness: { failures: Record<string, string> } }).__smartPlantsHarness.failures["recorder/statistics_during_period"] = "unknown_command"; });
  await button(page, "Office Aloe").click();
  const card = page.locator("smart-plants-panel .history-card");
  await expect(card).toContainText("History is not available because Home Assistant's Recorder is not running.");
  await expect(card.getByRole("button", { name: "Open in Home Assistant" })).toHaveCount(0);
  await audit(page, info, "history-unavailable");
});
