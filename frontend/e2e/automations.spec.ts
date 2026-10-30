import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// The Automations card on a plant's Overview tab in the packaged artifact with
// synthetic data: the automations Home Assistant's search finds for the plant,
// then those for all plants, each row a link to Home Assistant's editor.
const url = "/frontend/e2e/harness.html";
const card = (page: Page, name = "Automations") => page.getByRole("region", { name, exact: true });

async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  process.stdout.write(`AXE ${info.project.name}/${name}: ${result.passes.length} rule passes; ${result.violations.length} violations; ${result.incomplete.length} incomplete (${result.incomplete.map(r => r.id).join(", ") || "none"})\n`);
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name}: no horizontal scroll`).toBe(true);
}
async function openPlant(page: Page, query: string) {
  await page.goto(`${url}${query}`);
  await page.getByRole("button", { name: "Office Aloe", exact: true }).click();
}

test.beforeEach(async ({ page }) => { page.on("pageerror", error => { throw error; }); });
test.afterEach(async ({ page }) => { expect(await page.evaluate(() => (window as unknown as { __smartPlantsHarness?: { unexpected: string[] } }).__smartPlantsHarness?.unexpected ?? [])).toEqual([]); });

test("the Automations card lists the plant's automations and those for all plants", async ({ page }, info) => {
  await openPlant(page, "?seed&automations");
  const own = card(page).getByRole("list", { name: "Automations", exact: true });
  const rows = own.getByRole("listitem");
  await expect(rows.locator(".li-title")).toHaveText(["Grow light on dark days", "Low battery in plant sensors", "Morning plant summary", "Old watering helper", "Water reminder for Office Aloe"]);
  await expect(rows.locator(".li-sub")).toHaveText(["Last ran yesterday", "Never ran", "Last ran 20 minutes ago", "Defined in YAML · Last ran 3 days ago", "Last ran 2 hours ago"]);
  // The automation from YAML without an id can't open in the editor.
  await expect(own.getByRole("link")).toHaveCount(4);
  await expect(own.getByRole("link", { name: /^Water reminder for Office Aloe/ })).toHaveAttribute("href", "/config/automation/edit/1761000000101");
  const allPlants = card(page).getByRole("list", { name: "For all plants", exact: true });
  await expect(allPlants.getByRole("listitem").locator(".li-title")).toHaveText(["Smart Plants: plant needs water"]);
  await expect(card(page)).toContainText("Automations that only use a template, the plant's area or a sensor assigned to the plant aren't listed.");
  await expect(card(page)).not.toContainText("Pick Smart Plants triggers");
  await expect(card(page).getByRole("link", { name: "Create automation", exact: true })).toBeVisible();
  await audit(page, info, "automations-card");

  for (const link of await card(page).getByRole("link").all()) { await link.focus(); await expect(link).toBeFocused(); }
  const showAll = card(page).getByRole("button", { name: "Show all (7)", exact: true });
  await showAll.focus(); await page.keyboard.press("Enter");
  await expect(rows).toHaveCount(7);
  await expect(showAll).toHaveCount(0);
  const holiday = own.getByRole("link", { name: /^Holiday watering check/ });
  await expect(holiday).toBeFocused();
  // The state is a word in the chip, not a colour alone.
  await expect(holiday.locator(".cchip")).toHaveText("Off");
  await expect(own.getByRole("link", { name: /^Mist on dry air/ }).locator(".cchip")).toHaveText("Unavailable");
  await audit(page, info, "automations-card-expanded");

  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => location.pathname)).toBe("/config/automation/edit/1761000000103");
});

test("the Automations card keeps its intro text without automations and speaks German", async ({ page }, info) => {
  await openPlant(page, "?seed");
  await expect(card(page)).toContainText("Pick Smart Plants triggers such as “Plant needs water” in the automation editor");
  await expect(card(page).getByRole("list")).toHaveCount(0);
  await expect(card(page).getByRole("link", { name: "Open device", exact: true })).toBeVisible();

  await openPlant(page, "?seed&automations&lang=de");
  const german = card(page, "Automatisierungen");
  await expect(german.getByRole("list", { name: "Automatisierungen", exact: true }).getByRole("listitem").locator(".li-sub")).toHaveText(["Zuletzt ausgeführt gestern", "Noch nie ausgeführt", "Zuletzt ausgeführt vor 20 Minuten", "In YAML definiert · Zuletzt ausgeführt vor 3 Tagen", "Zuletzt ausgeführt vor 2 Stunden"]);
  await expect(german.getByRole("list", { name: "Für alle Pflanzen", exact: true })).toContainText("Smart Plants: plant needs water");
  await expect(german).toContainText("werden nicht aufgeführt.");
  await german.getByRole("button", { name: "Alle anzeigen (7)", exact: true }).click();
  await expect(german.getByRole("link", { name: /^Holiday watering check/ }).locator(".cchip")).toHaveText("Aus");
  await expect(german.getByRole("link", { name: /^Mist on dry air/ }).locator(".cchip")).toHaveText("Nicht verfügbar");
  await audit(page, info, "automations-card-german");
});
