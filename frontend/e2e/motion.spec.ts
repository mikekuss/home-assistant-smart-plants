import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Loading placeholders and fades in the packaged artifact: placeholders take
// the place of the content so nothing jumps when it arrives, fades run only
// when content replaces a placeholder, and reduced motion turns them off.
test.use({ reducedMotion: "no-preference" });

const url = "/frontend/e2e/harness.html";
const cardUrl = "/frontend/e2e/card-harness.html";

// Sum of the layout shifts since the page loaded, including those right after a click.
const recordShifts = (page: Page) => page.addInitScript(() => {
  const w = window as unknown as { __shifts: number[] };
  w.__shifts = [];
  new PerformanceObserver(list => { for (const entry of list.getEntries()) w.__shifts.push((entry as unknown as { value: number }).value); }).observe({ type: "layout-shift", buffered: true });
});
const shiftSince = (page: Page, from: number) => page.evaluate(n => (window as unknown as { __shifts: number[] }).__shifts.slice(n).reduce((sum, value) => sum + value, 0), from);
const shiftCount = (page: Page) => page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts.length);
const release = (page: Page, key: string) => page.evaluate(k => (window as unknown as { __smartPlantsHarness: { release(key: string): void } }).__smartPlantsHarness.release(k), key);
const hold = (page: Page, key: string) => page.evaluate(k => { (window as unknown as { __smartPlantsHarness: { holdNext: Record<string, boolean> } }).__smartPlantsHarness.holdNext[k] = true; }, key);
// document.getAnimations() leaves out shadow trees, so every shadow root is asked.
const running = (page: Page) => page.evaluate(() => {
  const roots: (Document | ShadowRoot)[] = [document];
  for (let i = 0; i < roots.length; i++) for (const element of roots[i]!.querySelectorAll("*")) if (element.shadowRoot) roots.push(element.shadowRoot);
  return roots.flatMap(root => root.getAnimations()).filter(animation => animation.playState === "running").length;
});
const overview = (page: Page) => page.locator("smart-plants-overview");
const placeholders = (page: Page) => overview(page).locator(".grid[aria-hidden=true] .card");
const historyCard = (page: Page) => page.locator(".history-card");
const height = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())?.height ?? 0;

async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  process.stdout.write(`AXE ${info.project.name}/${name}: ${result.passes.length} rule passes; ${result.violations.length} violations; ${result.incomplete.length} incomplete (${result.incomplete.map(r => r.id).join(", ") || "none"})\n`);
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
}

test("the overview holds its layout while the status loads", async ({ page }, info) => {
  await recordShifts(page);
  await page.goto(`${url}?seed&hold=smart_plants/plants/overview`);
  await expect(placeholders(page)).toHaveCount(3);
  await expect(overview(page).getByRole("status")).toHaveText("Loading plants…");
  // No counts or cards that the status would change a moment later.
  await expect(overview(page).getByRole("button", { name: "Office Aloe", exact: true })).toHaveCount(0);
  await expect(overview(page).getByRole("searchbox", { name: "Search plants" })).toBeEnabled();
  expect(await running(page)).toBeGreaterThan(0);
  await audit(page, info, "overview-placeholders");
  const before = await shiftCount(page);
  await release(page, "smart_plants/plants/overview");
  await expect(overview(page).getByRole("button", { name: "Office Aloe", exact: true })).toBeVisible();
  await expect(placeholders(page)).toHaveCount(0);
  await page.waitForTimeout(400);
  expect(await shiftSince(page, before)).toBeLessThan(0.03);
  // The fades are over and nothing pulses any more.
  expect(await running(page)).toBe(0);
});

test("the regular refresh does not animate", async ({ page }) => {
  await page.goto(`${url}?seed&history&care`);
  await expect(overview(page).getByRole("button", { name: "Office Aloe", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Office Aloe", exact: true }).click();
  await expect(page.locator(".history-card sp-history-chart")).toBeVisible();
  await page.waitForTimeout(400);
  expect(await running(page)).toBe(0);
  await page.evaluate(async () => { await (document.querySelector("smart-plants-panel") as unknown as { _refresh(showLoading: boolean): Promise<void> })._refresh(false); });
  await page.waitForTimeout(50);
  expect(await running(page)).toBe(0);
  await page.getByRole("button", { name: "Back" }).click();
  await page.evaluate(async () => { await (document.querySelector("smart-plants-panel") as unknown as { _refresh(showLoading: boolean): Promise<void> })._refresh(false); });
  await page.waitForTimeout(50);
  expect(await running(page)).toBe(0);
});

test("reduced motion turns off the pulse and the fades", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${url}?seed&hold=smart_plants/plants/overview`);
  await expect(placeholders(page)).toHaveCount(3);
  expect(await running(page)).toBe(0);
  await release(page, "smart_plants/plants/overview");
  await expect(overview(page).getByRole("button", { name: "Office Aloe", exact: true })).toBeVisible();
  expect(await running(page)).toBe(0);
});

test("the history card keeps its height while a chart loads", async ({ page }, info) => {
  await page.goto(`${url}?seed&history&hold=recorder/statistics_during_period`);
  await page.getByRole("button", { name: "Office Aloe", exact: true }).click();
  await expect(page.locator(".history-skeleton")).toBeVisible();
  await expect(historyCard(page).getByRole("status")).toHaveText("Loading history…");
  await audit(page, info, "history-placeholder");
  const loading = await height(page, ".history-card");
  await release(page, "recorder/statistics_during_period");
  await expect(page.locator(".history-card sp-history-chart")).toBeVisible();
  const ready = await height(page, ".history-card");
  expect(Math.abs(ready - loading)).toBeLessThanOrEqual(8);
  // Another range keeps the previous chart, dimmed, until the new one is there.
  await hold(page, "recorder/statistics_during_period");
  await historyCard(page).getByRole("button", { name: "30 days" }).click();
  await expect(page.locator(".history-plot.stale")).toBeVisible();
  expect(await height(page, ".history-card")).toBe(ready);
  await release(page, "recorder/statistics_during_period");
  await expect(page.locator(".history-plot.stale")).toHaveCount(0);
  await expect(page.locator(".history-plot")).toHaveCSS("opacity", "1");
});

test("a dashboard card holds its place until its content is loaded", async ({ page }) => {
  let resume: () => void = () => {};
  const loaded = new Promise<void>(resolve => { resume = resolve; });
  await page.route(/smart-plants-card-full\.js/, async route => { await loaded; await route.continue(); });
  await page.goto(`${cardUrl}?admin&section=400`);
  const cards = page.locator("smart-plants-plant-card");
  await expect(cards).toHaveCount(4);
  for (const box of await cards.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(300);
  resume();
  await expect(page.locator("smart-plants-plant-card sp-status-chip")).toHaveCount(3);
  await expect(page.locator("smart-plants-plant-card .placeholder")).toHaveCount(0);
});
