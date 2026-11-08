import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Retiring a plant, the Retired plants page and Restore, in the packaged
// artifact with synthetic data.
interface ArchiveHarness { messages: Array<Record<string, unknown>>; unexpected: string[]; archived: unknown[] }
type HarnessWindow = { __smartPlantsHarness: ArchiveHarness };

const url = "/frontend/e2e/harness.html";
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
const menuItem = (page: Page, name: string | RegExp) => page.getByRole("menuitem", typeof name === "string" ? { name, exact: true } : { name });
const archive = (page: Page) => page.locator("smart-plants-archive");
const messages = (page: Page, type: string) => page.evaluate(t => (window as unknown as HarnessWindow).__smartPlantsHarness.messages.filter(m => m.type === t), type);

async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  process.stdout.write(`AXE ${info.project.name}/${name}: ${result.passes.length} rule passes; ${result.violations.length} violations; ${result.incomplete.length} incomplete (${result.incomplete.map(r => r.id).join(", ") || "none"})\n`);
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name}: no horizontal scroll`).toBe(true);
}
// The plant's own actions sit in the ⋮ menu of the plant's top card.
async function plantMenu(page: Page, item: string) {
  await button(page, /^(More actions for|Weitere Aktionen für) /).click();
  await menuItem(page, item).focus(); await menuItem(page, item).press("Enter");
}
async function menu(page: Page, item: string | RegExp) {
  await button(page, /^(Menu|Menü)$/).click();
  await menuItem(page, item).focus(); await menuItem(page, item).press("Enter");
}

test.beforeEach(async ({ page }) => { page.on("pageerror", error => { throw error; }); });
test.afterEach(async ({ page }) => { expect(await page.evaluate(() => (window as unknown as { __smartPlantsHarness?: ArchiveHarness }).__smartPlantsHarness?.unexpected ?? [])).toEqual([]); });

test("retires a plant, shows it under Retired plants and restores it", async ({ page }, info) => {
  await page.clock.setFixedTime(new Date("2026-11-02T10:00:00Z"));
  await page.goto(`${url}?seed&tz=UTC`);
  await button(page, /^(Menu|Menü)$/).click();
  await expect(menuItem(page, /^Retired plants/)).toHaveCount(0);
  await page.keyboard.press("Escape");

  await button(page, "Office Aloe").click();
  await plantMenu(page, "Retire plant…");
  const dialog = page.locator("smart-plants-panel dialog");
  await expect(dialog.getByRole("heading", { name: "Retire Office Aloe?" })).toBeVisible();
  await expect(dialog).toContainText("its sensors become free for another plant");
  await audit(page, info, "retire-dialog");
  await dialog.getByRole("button", { name: "Retire", exact: true }).click();
  await expect.poll(async () => (await messages(page, "smart_plants/plants/archive")).length).toBe(1);
  await expect(button(page, "Office Aloe")).toHaveCount(0);

  await menu(page, /^Retired plants 1$/);
  await expect(page.locator("smart-plants-panel h1")).toHaveText("Retired plants");
  const row = archive(page).getByRole("button", { name: /Office Aloe/ });
  await expect(row).toBeVisible();
  await audit(page, info, "retired-list");
  await row.click();
  await expect(archive(page).getByRole("heading", { name: "Office Aloe" })).toBeVisible();
  await expect(archive(page)).toContainText("Monitored for");
  await expect(archive(page)).toContainText("Retired");
  await audit(page, info, "retired-plant");

  await archive(page).getByRole("button", { name: "Restore", exact: true }).click();
  const restore = archive(page).locator("dialog");
  await expect(restore.getByRole("heading", { name: "Restore Office Aloe?" })).toBeVisible();
  await audit(page, info, "restore-dialog");
  await restore.getByRole("button", { name: "Restore", exact: true }).click();
  await expect.poll(async () => (await messages(page, "smart_plants/archive/restore")).length).toBe(1);
  await expect(page.locator("smart-plants-panel h1")).toHaveText("Office Aloe");
});

test("deletes a retired plant for good from its page", async ({ page }, info) => {
  await page.goto(`${url}?seed&tz=UTC`);
  await button(page, "Office Aloe").click();
  await plantMenu(page, "Delete plant");
  const dialog = page.locator("smart-plants-panel dialog");
  await dialog.getByRole("button", { name: "Retire instead" }).click();
  await dialog.getByRole("button", { name: "Retire", exact: true }).click();
  await expect.poll(async () => (await messages(page, "smart_plants/plants/archive")).length).toBe(1);
  expect(await messages(page, "smart_plants/plants/delete")).toEqual([]);

  await menu(page, /^Retired plants 1$/);
  await archive(page).getByRole("button", { name: /Office Aloe/ }).click();
  await archive(page).getByRole("button", { name: "Delete for good" }).click();
  const confirm = archive(page).locator("dialog");
  await expect(confirm.getByRole("heading", { name: "Delete Office Aloe for good?" })).toBeVisible();
  await audit(page, info, "delete-retired-dialog");
  await confirm.getByRole("button", { name: "Delete for good" }).click();
  await expect.poll(async () => (await messages(page, "smart_plants/archive/delete")).length).toBe(1);
  await expect(archive(page)).toHaveCount(0);
});
