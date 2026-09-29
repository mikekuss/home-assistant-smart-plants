import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Renders the packaged panel for a Home Assistant user whose profile language
// is German and checks key strings and locale-formatted values. English is
// covered by the other specs. Data is synthetic.

const url = "/frontend/e2e/harness.html";
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
});
test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => (window as unknown as { __smartPlantsHarness?: { unexpected: string[] } }).__smartPlantsHarness?.unexpected ?? [])).toEqual([]);
});

async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  for (const rule of result.incomplete) expect(rule.id).toBe("color-contrast");
}

test("German inventory, detail tabs and sensors use the German catalog", async ({ page }, info) => {
  await page.goto(`${url}?seed&lang=de`);
  await expect(button(page, "Menü")).toBeVisible();
  const tiles = page.getByRole("group", { name: "Nach Status filtern" });
  await expect(tiles.getByRole("button")).toHaveText([/3\s*Alle Pflanzen/, /1\s*Braucht Wasser/, /0\s*Probleme/, /1\s*Sensorprobleme/]);
  await expect(page.getByRole("status").filter({ hasText: "3 von 3 Pflanzen" })).toBeVisible();
  const card = page.locator("smart-plants-overview article.card", { hasText: "Office Aloe" });
  await expect(card).toContainText("Braucht Wasser");
  await expect(card).toContainText("Bodenfeuchte 12 % liegt unter dem Minimum von 20 %");
  await expect(page.getByRole("button", { name: "Sortierung: Handlungsbedarf zuerst" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gießen für Office Aloe eintragen" })).toBeVisible();
  await audit(page, info, "german-inventory");

  await button(page, "Office Aloe").click();
  const tabs = page.getByRole("navigation", { name: "Pflanzenbereiche" });
  for (const name of ["Übersicht", "Sensoren", "Pflegeverlauf", "Pflanzendetails", "Diagnose"]) await expect(tabs.getByRole("button", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Zugewiesene Sensoren", exact: true })).toBeVisible();

  await button(page, "Sensoren").click();
  await expect(page.getByRole("heading", { name: "Feuchtekonfiguration", exact: true })).toBeVisible();
  await expect(page.getByText("Wirksame Schwellenwerte: Minimum 20 %", { exact: false })).toBeVisible();
  const sensors = page.locator("smart-plants-panel dl.sensors");
  await expect(sensors.locator("dt").first()).toHaveText("Lufttemperatur");
  await sensors.getByRole("button", { name: "Quellen bearbeiten" }).first().click();
  await expect(button(page, "Quellen für Lufttemperatur speichern")).toBeVisible();
  await audit(page, info, "german-sensors");

  await button(page, "Pflegeverlauf").click();
  await expect(page.getByText("Noch keine Pflege erfasst.")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Pflegeart" })).toContainText("Gießen");
});

test("German diagnostics format thresholds and composite health", async ({ page }, info) => {
  await page.goto(`${url}?diagnostics&lang=de`);
  await button(page, "Diagnostics Plant").click();
  await button(page, "Diagnose").click();
  await expect(page.getByRole("heading", { name: "Gesamtzustand", exact: true })).toBeVisible();
  await expect(page.getByText("78 von 100")).toBeVisible();
  await expect(page.locator("smart-plants-panel dl.overall-health")).toContainText("mittel — mindestens die Hälfte der konfigurierten Rollen ist derzeit verfügbar.");
  await expect(page.getByRole("heading", { name: "Erweiterte Diagnose", exact: true })).toBeVisible();
  await expect(page.getByText("Keine aktiven Probleme.")).toBeVisible();
  const temperature = page.locator('smart-plants-panel dl.diagnostics dt:text-is("Temperaturstress") + dd');
  await expect(temperature).toContainText("kein Problem");
  await expect(temperature.getByRole("list", { name: "Wirksame Schwellenwerte für Temperaturstress" })).toContainText("Kälte-Auslöser: 10 °C");
  await temperature.getByRole("button", { name: "Schwellenwerte bearbeiten" }).click();
  const editor = page.getByRole("group", { name: "Schwellenwerte für Temperaturstress" });
  await editor.getByLabel("Kälte-Auslöser (°C)").fill("10.5");
  await expect(editor).toContainText("Standard 10 °C · wirksam 10,5 °C");
  await editor.getByLabel("Kälte-Auslöser (°C)").fill("30");
  await editor.getByRole("button", { name: "Schwellenwerte speichern" }).click();
  await expect(editor.getByRole("alert")).toContainText("Die wirksamen Schwellenwerte müssen Kälte-Auslöser < Kälte-Aufhebung");
  await audit(page, info, "german-diagnostics");
});

test("German add-plant wizard keeps every step accessible", async ({ page }, info) => {
  await page.goto(`${url}?lang=de`);
  await page.locator("smart-plants-overview").getByRole("button", { name: "Pflanze hinzufügen", exact: true }).click();
  await expect(page.getByText("Schritt 1 von 3 · Pflanze", { exact: true })).toBeVisible();
  await page.getByLabel("Pflanzenname", { exact: true }).fill("Basilikum");
  await page.getByLabel("Bereich", { exact: true }).selectOption("office");
  await audit(page, info, "german-wizard-plant");
  await button(page, "Weiter").click();
  await expect(page.getByRole("heading", { name: "Vorschläge aus Office", exact: true })).toBeVisible();
  await expect(page.getByText("Bodenfeuchte · aktuell 12 %", { exact: true })).toBeVisible();
  await button(page, "Soil probe hinzufügen").click();
  await audit(page, info, "german-wizard-sensors");
  await button(page, "Weiter").click();
  await page.locator("smart-plants-wizard").getByRole("button", { name: /^Art und Gießziele/ }).click();
  await page.locator("smart-plants-wizard").getByRole("button", { name: /^Weitere Details/ }).click();
  for (const label of ["Braucht Wasser unter", "Ideal", "Zu nass über", "Anschaffungsdatum", "Standort", "Kategorie", "Tags"]) await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  await audit(page, info, "german-wizard-review");
  await button(page, "Pflanze erstellen").click();
  await expect(page.getByRole("heading", { name: "Basilikum ist bereit", exact: true })).toBeVisible();
  await expect(button(page, "Weitere Pflanze hinzufügen")).toBeVisible();
  await audit(page, info, "german-wizard-done");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
