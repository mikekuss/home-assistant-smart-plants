import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Winter values: the hint on a plant in dormant storage, the editor, the
// header chip and the Settings card, in the packaged artifact with synthetic
// data. Office Aloe has a temperature sensor and stands in dormant storage.
interface WinterHarness { messages: Array<Record<string, unknown>>; unexpected: string[] }
type HarnessWindow = { __smartPlantsHarness: WinterHarness };

const url = "/frontend/e2e/harness.html";
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });
const header = (page: Page) => page.locator("smart-plants-panel .header-card");
const dialog = (page: Page) => page.locator("smart-plants-panel dialog.winter-dialog");
const writes = (page: Page) => page.evaluate(() => (window as unknown as HarnessWindow).__smartPlantsHarness.messages.filter(m => m.type === "smart_plants/plants/set_winter_thresholds"));

async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  process.stdout.write(`AXE ${info.project.name}/${name}: ${result.passes.length} rule passes; ${result.violations.length} violations; ${result.incomplete.length} incomplete (${result.incomplete.map(r => r.id).join(", ") || "none"})\n`);
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name}: no horizontal scroll`).toBe(true);
}

test.beforeEach(async ({ page }) => { page.on("pageerror", error => { throw error; }); });
test.afterEach(async ({ page }) => { expect(await page.evaluate(() => (window as unknown as { __smartPlantsHarness?: WinterHarness }).__smartPlantsHarness?.unexpected ?? [])).toEqual([]); });

test("adds winter values from the dormant storage hint and shows the active chip", async ({ page }, info) => {
  await page.clock.setFixedTime(new Date("2026-11-22T12:00:00Z"));
  await page.goto(`${url}?seed&reading&dormant&tz=UTC`);
  await button(page, "Office Aloe").click();
  await expect(header(page)).toBeVisible();
  // The plant needs water in dormant storage and has no winter values yet.
  await expect(header(page).locator(".reason")).toContainText("In dormant storage?");
  await expect(header(page).locator(".winter-chip")).toHaveCount(0);
  await header(page).getByRole("button", { name: "Add winter values" }).click();

  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole("heading", { name: "Winter values for Office Aloe" })).toBeFocused();
  await expect(dialog(page)).toContainText("When: Apply while the placement is dormant storage.");
  await expect(button(page, "Save winter values")).toBeDisabled();
  await audit(page, info, "winter-editor");
  const cold = dialog(page).getByLabel("Too cold below");
  await expect(cold).toHaveValue("10");
  await cold.fill("0");
  await expect(dialog(page)).toContainText("Normally 10 °C");
  await button(page, "Save winter values").click();
  await expect(dialog(page)).toHaveCount(0);
  expect(await writes(page)).toEqual([{ type: "smart_plants/plants/set_winter_thresholds", plant_id: "00000000-0000-4000-8000-000000000001", expected_revision: 1,
    winter_thresholds: { temperature: { cold_threshold_celsius: 0, cold_clear_celsius: 2, hot_threshold_celsius: 35, hot_clear_celsius: 32 } } }]);

  // Winter values apply at once: the chip replaces the hint.
  const chip = header(page).locator(".winter-chip");
  await expect(chip).toHaveText("Winter values · dormant storage");
  await expect(header(page).locator(".reason")).not.toContainText("In dormant storage?");
  await expect(page.locator("smart-plants-panel")).not.toContainText("This plant was changed somewhere else");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-expanded", "true");
  const box = header(page).locator("#winter-box");
  await expect(box).toContainText("Winter values apply while the placement is dormant storage.");
  await expect(box).toContainText("Temperature 0–35 °C instead of 10–35 °C");
  await expect(header(page).locator(".keyreads .winter-range")).toHaveAttribute("title", "Winter value. Normally 10–30 °C.");
  await audit(page, info, "winter-header");

  await tab(page, "Settings").click();
  const card = page.locator("smart-plants-panel .winter-card");
  await expect(card).toContainText("Active now");
  await expect(card).toContainText("Temperature 0–35 °C instead of 10–35 °C");
  await audit(page, info, "winter-settings");
});
