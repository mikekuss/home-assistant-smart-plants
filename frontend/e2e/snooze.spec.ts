import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import type { PlantRecord } from "../src/types.js";

// Snoozing a plant's alerts from the plant header, in the packaged artifact
// with synthetic data. The clock is pinned so the end dates read the same on
// every run; Home Assistant's time zone is UTC.
interface SnoozeHarness { plants: PlantRecord[]; messages: Array<Record<string, unknown>>; unexpected: string[]; conflictNext: boolean }
type HarnessWindow = { __smartPlantsHarness: SnoozeHarness };

const url = "/frontend/e2e/harness.html";
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
const menuItem = (page: Page, name: string) => page.getByRole("menuitem", { name, exact: true });
const header = (page: Page) => page.locator("smart-plants-panel .header-card");
const dialog = (page: Page) => page.locator("smart-plants-panel dialog.snooze-dialog");
const snoozes = (page: Page) => page.evaluate(() => (window as unknown as HarnessWindow).__smartPlantsHarness.messages.filter(m => m.type === "smart_plants/plants/snooze"));

async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  process.stdout.write(`AXE ${info.project.name}/${name}: ${result.passes.length} rule passes; ${result.violations.length} violations; ${result.incomplete.length} incomplete (${result.incomplete.map(r => r.id).join(", ") || "none"})\n`);
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name}: no horizontal scroll`).toBe(true);
}
async function openPlant(page: Page, query = "?seed&tz=UTC") {
  await page.clock.setFixedTime(new Date("2026-10-24T12:00:00Z"));
  await page.goto(`${url}${query}`);
  await button(page, "Office Aloe").click();
  await expect(header(page)).toBeVisible();
}
async function menu(page: Page, item: string) {
  await button(page, /^(Menu|Menü)$/).click();
  await menuItem(page, item).focus(); await menuItem(page, item).press("Enter");
}

test.beforeEach(async ({ page }) => { page.on("pageerror", error => { throw error; }); });
test.afterEach(async ({ page }) => { expect(await page.evaluate(() => (window as unknown as { __smartPlantsHarness?: SnoozeHarness }).__smartPlantsHarness?.unexpected ?? [])).toEqual([]); });

test("snoozes a plant for a week from the header menu and resumes it", async ({ page }, info) => {
  await openPlant(page);
  await expect(header(page).locator("sp-snooze-chip")).toHaveCount(0);
  await menu(page, "Snooze alerts…");
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole("heading", { name: "Snooze alerts for Office Aloe" })).toBeFocused();
  await expect(dialog(page).getByRole("radio", { name: /^1 day/ })).toBeChecked();
  await expect(dialog(page)).toContainText("Until Sun, Oct 25");
  await audit(page, info, "snooze-dialog");
  await dialog(page).getByRole("radio", { name: /^1 week/ }).check();
  await dialog(page).getByRole("button", { name: "Snooze", exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(header(page).locator("sp-snooze-chip")).toHaveText("Snoozed until Sat, Oct 31");
  // The status stays as it is; a snooze only mutes alerts.
  await expect(header(page).locator("sp-status-chip")).toContainText("Needs water");
  expect(await snoozes(page)).toEqual([{ type: "smart_plants/plants/snooze", plant_id: "00000000-0000-4000-8000-000000000001", expected_revision: 1, until: "2026-10-31T23:59:59+00:00" }]);
  await audit(page, info, "snooze-header");
  await button(page, "Menu").click();
  await expect(menuItem(page, "Change snooze…")).toBeVisible();
  await page.keyboard.press("Escape");
  await button(page, "Resume alerts for Office Aloe").click();
  await expect(header(page).locator("sp-snooze-chip")).toHaveCount(0);
  expect((await snoozes(page)).at(-1)).toMatchObject({ expected_revision: 2, until: null });
});

test("snoozes until a picked day and explains a day out of range", async ({ page }) => {
  await openPlant(page);
  await menu(page, "Snooze alerts…");
  await dialog(page).getByRole("radio", { name: "Until date…" }).check();
  const date = dialog(page).getByLabel("Last snoozed day");
  await expect(date).toHaveAttribute("min", "2026-10-25");
  await expect(date).toHaveAttribute("max", "2027-10-24");
  await date.fill("2028-01-01");
  await dialog(page).getByRole("button", { name: "Snooze", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toHaveText("Choose a day from tomorrow up to one year from today.");
  await expect(date).toBeFocused();
  expect(await snoozes(page)).toEqual([]);
  await date.fill("2026-12-24");
  await dialog(page).getByRole("button", { name: "Snooze", exact: true }).click();
  await expect(header(page).locator("sp-snooze-chip")).toHaveText("Snoozed until Thu, Dec 24");
  expect((await snoozes(page)).at(-1)!.until).toBe("2026-12-24T23:59:59+00:00");
});

test("a snoozed plant shows the grey chip on its overview card and leaves the counts", async ({ page }, info) => {
  await page.clock.setFixedTime(new Date("2026-10-24T12:00:00Z"));
  await page.goto(`${url}?seed&snoozed&tz=UTC`);
  const card = page.locator("smart-plants-overview article.card").filter({ hasText: "Office Aloe" });
  await expect(card.locator("sp-snooze-chip")).toHaveText("Snoozed until Fri, Oct 30");
  await expect(card.locator("sp-status-chip")).toContainText("Needs water");
  await expect(card.getByRole("button", { name: /Resume/ })).toHaveCount(0);
  await expect(page.locator("smart-plants-overview article.card sp-snooze-chip")).toHaveCount(1);
  // The card keeps its real status, but the Needs water tile leaves the snoozed plant out.
  await expect(page.getByRole("button", { name: /Needs water/ })).toContainText("0");
  await audit(page, info, "snooze-overview");
});

test("a snooze can be changed, and the dialog and chip read in German", async ({ page }, info) => {
  await openPlant(page, "?seed&snoozed&tz=UTC&lang=de");
  await expect(header(page).locator("sp-snooze-chip")).toHaveText("Stummgeschaltet bis Fr., 30. Okt.");
  await expect(button(page, "Hinweise für Office Aloe fortsetzen")).toBeVisible();
  await menu(page, "Stummschaltung ändern…");
  await expect(dialog(page).getByRole("heading", { name: "Stummschaltung für Office Aloe ändern" })).toBeVisible();
  await expect(dialog(page)).toContainText("Stummgeschaltet bis Fr., 30. Okt.");
  await expect(dialog(page).getByRole("radio", { name: "Bis Datum…" })).toBeChecked();
  await expect(dialog(page).getByLabel("Letzter stummgeschalteter Tag")).toHaveValue("2026-10-30");
  await audit(page, info, "snooze-dialog-de");
  await dialog(page).getByRole("radio", { name: /^2 Wochen/ }).check();
  await dialog(page).getByRole("button", { name: "Stummschalten", exact: true }).click();
  await expect(header(page).locator("sp-snooze-chip")).toHaveText("Stummgeschaltet bis Sa., 7. Nov.");
});

// Snooze all plants from the overview menu. The seed has two active plants
// and one paused plant.
type Toast = { message: string; action?: { text: string; action: () => void } };
const cardChips = (page: Page) => page.locator("smart-plants-overview article.card sp-snooze-chip");
const bulk = (page: Page) => page.evaluate(() => (window as unknown as HarnessWindow).__smartPlantsHarness.messages.filter(m => m.type === "smart_plants/plants/snooze_many" || m.type === "smart_plants/plants/restore_snoozes"));
const lastToast = (page: Page) => page.evaluate(() => { const t = (window as unknown as { __toasts: Toast[] }).__toasts.at(-1); return t ? { message: t.message, action: t.action?.text } : null; });
async function openOverview(page: Page, query = "?seed&tz=UTC") {
  await page.clock.setFixedTime(new Date("2026-10-24T12:00:00Z"));
  await page.goto(`${url}${query}`);
  await page.evaluate(() => {
    const w = window as unknown as { __toasts: Toast[] }; w.__toasts = [];
    document.addEventListener("hass-notification", e => w.__toasts.push((e as CustomEvent<Toast>).detail));
  });
  await expect(page.locator("smart-plants-overview article.card")).toHaveCount(3);
}

test("snoozes all plants from the overview menu and undoes it", async ({ page }, info) => {
  await openOverview(page);
  await menu(page, "Snooze all plants…");
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole("heading", { name: "Snooze all plants" })).toBeFocused();
  await expect(dialog(page).locator(".snooze-summary")).toHaveText("Snoozes 2 plants. Paused plants are left out.");
  await expect(dialog(page).getByRole("button", { name: "Resume all" })).toHaveCount(0);
  await audit(page, info, "snooze-all-dialog");
  await dialog(page).getByRole("radio", { name: /^1 week/ }).check();
  await dialog(page).getByRole("button", { name: "Snooze", exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(cardChips(page)).toHaveText(["Snoozed until Sat, Oct 31", "Snoozed until Sat, Oct 31"]);
  expect(await bulk(page)).toEqual([{ type: "smart_plants/plants/snooze_many", until: "2026-10-31T23:59:59+00:00" }]);
  expect(await lastToast(page)).toEqual({ message: "2 plants snoozed until Sat, Oct 31", action: "Undo" });
  await page.evaluate(() => (window as unknown as { __toasts: Toast[] }).__toasts.at(-1)!.action!.action());
  await expect(cardChips(page)).toHaveCount(0);
  expect((await bulk(page)).at(-1)!.type).toBe("smart_plants/plants/restore_snoozes");
  expect(await lastToast(page)).toEqual({ message: "Previous snoozes restored" });
});

test("keeps a later end and resumes every snooze", async ({ page }, info) => {
  await openOverview(page, "?seed&snoozed&tz=UTC");
  await menu(page, "Snooze all plants…");
  await expect(dialog(page).locator(".snooze-summary")).toHaveText("Snoozes 1 plant. Paused plants are left out. 1 plant already snoozed longer keeps its end.");
  const resume = dialog(page).getByRole("button", { name: "Resume all" });
  await expect(resume).toHaveAccessibleDescription("Ends the snooze of 1 plant.");
  await audit(page, info, "snooze-all-dialog-snoozed");
  await dialog(page).getByRole("button", { name: "Snooze", exact: true }).click();
  await expect(cardChips(page)).toHaveText(["Snoozed until Sun, Oct 25", "Snoozed until Fri, Oct 30"]);
  expect(await lastToast(page)).toEqual({ message: "1 plant snoozed until Sun, Oct 25", action: "Undo" });
  await menu(page, "Snooze all plants…");
  await expect(dialog(page).getByRole("button", { name: "Resume all" })).toHaveAccessibleDescription("Ends the snooze of 2 plants.");
  await dialog(page).getByRole("button", { name: "Resume all" }).click();
  await expect(cardChips(page)).toHaveCount(0);
  expect((await bulk(page)).at(-1)).toEqual({ type: "smart_plants/plants/snooze_many", until: null });
  expect(await lastToast(page)).toEqual({ message: "Alerts resumed for 2 plants", action: "Undo" });
});

test("a refused save shows the error and changes no plant", async ({ page }) => {
  await openOverview(page);
  await page.evaluate(() => { (window as unknown as { __smartPlantsHarness: { failures: Record<string, string> } }).__smartPlantsHarness.failures["smart_plants/plants/snooze_many"] = "unknown_error"; });
  await menu(page, "Snooze all plants…");
  await dialog(page).getByRole("button", { name: "Snooze", exact: true }).click();
  await expect(page.locator("smart-plants-panel p.error[role=alert]")).toBeVisible();
  await expect(page.locator("smart-plants-panel p.error[role=alert]")).not.toContainText("PRIVATE_SENTINEL");
  await expect(cardChips(page)).toHaveCount(0);
  expect(await lastToast(page)).toBeNull();
});

test("the Snooze all plants dialog reads in German", async ({ page }, info) => {
  await openOverview(page, "?seed&tz=UTC&lang=de");
  await menu(page, "Alle Pflanzen stummschalten…");
  await expect(dialog(page).getByRole("heading", { name: "Alle Pflanzen stummschalten" })).toBeVisible();
  await expect(dialog(page).locator(".snooze-summary")).toHaveText("Schaltet 2 Pflanzen stumm. Pausierte Pflanzen bleiben außen vor.");
  await audit(page, info, "snooze-all-dialog-de");
});

test("a plant changed elsewhere reports the conflict instead of snoozing", async ({ page }) => {
  await openPlant(page);
  await menu(page, "Snooze alerts…");
  await page.evaluate(() => { (window as unknown as HarnessWindow).__smartPlantsHarness.conflictNext = true; });
  await dialog(page).getByRole("button", { name: "Snooze", exact: true }).click();
  await expect(page.locator("smart-plants-panel p.error[role=alert]")).toContainText("This plant was changed somewhere else.");
  await expect(header(page).locator("sp-snooze-chip")).toHaveCount(0);
});
