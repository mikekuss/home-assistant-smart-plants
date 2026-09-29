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
  await expect(page.getByRole("tab")).toHaveText(["Übersicht", "Sensoren", "Pflege", "Einstellungen"]);
  await expect(page.locator("smart-plants-panel .header-card sp-status-chip")).toContainText("Braucht Wasser");
  await expect(page.locator("smart-plants-panel .header-card")).toContainText("Bodenfeuchte 12 % liegt unter dem Minimum von 20 %");
  await expect(page.getByRole("heading", { name: "Messwerte", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gegossen", exact: true })).toBeVisible();
  await audit(page, info, "german-overview");

  await page.getByRole("tab", { name: "Sensoren", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Zugewiesene Sensoren", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Mehrere Sensoren für einen Messwert/ }).click();
  const sensors = page.locator("smart-plants-panel dl.sensors");
  await expect(sensors.locator("dt").first()).toHaveText("Bodenfeuchte");
  await page.getByRole("button", { name: "Kombination der Sensoren für Temperatur ändern", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Messwerte kombinieren", exact: true })).toBeVisible();
  await expect(button(page, "Sensoren für Temperatur speichern")).toBeVisible();
  await page.getByRole("button", { name: /^Fehlerbehebung/ }).click();
  await audit(page, info, "german-sensors");

  await page.getByRole("tab", { name: "Pflege", exact: true }).click();
  await expect(page.getByText("Noch keine Pflege erfasst.")).toBeVisible();
  await button(page, "Pflege eintragen").last().click();
  await expect(page.getByRole("combobox", { name: "Pflegeart" })).toContainText("Gießen");
  await audit(page, info, "german-care");

  await page.getByRole("tab", { name: "Einstellungen", exact: true }).click();
  for (const label of ["Braucht Wasser unter", "Ideal", "Zu nass über"]) await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Weitere Details/ }).click();
  await expect(page.getByRole("tabpanel").getByText("Überwachung pausieren", { exact: true })).toBeVisible();
  await expect(button(page, "Pausieren")).toBeVisible();
  await audit(page, info, "german-settings");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("German diagnostics format thresholds and composite health", async ({ page }, info) => {
  await page.goto(`${url}?diagnostics&lang=de`);
  await button(page, "Diagnostics Plant").click();
  await page.getByRole("tab", { name: "Sensoren", exact: true }).click();
  await page.getByRole("button", { name: /^Fehlerbehebung/ }).click();
  await expect(page.getByRole("heading", { name: "Gesamtzustand", exact: true })).toBeVisible();
  await expect(page.getByText("78 von 100")).toBeVisible();
  await expect(page.locator("smart-plants-panel dl.overall-health")).toContainText("mittel — mindestens die Hälfte der konfigurierten Rollen ist derzeit verfügbar.");
  await expect(page.getByRole("heading", { name: "Problemprüfungen", exact: true })).toBeVisible();
  await expect(page.getByText("Keine aktiven Probleme.")).toBeVisible();
  await expect(page.locator('smart-plants-panel dl.diagnostics dt:text-is("Temperaturstress") + dd')).toContainText("kein Problem");
  await page.getByRole("tab", { name: "Einstellungen", exact: true }).click();
  await page.getByRole("button", { name: /^Weitere Zielwerte/ }).click();
  const temperature = page.locator('smart-plants-panel dl.other-targets dt:text-is("Temperaturstress") + dd');
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
