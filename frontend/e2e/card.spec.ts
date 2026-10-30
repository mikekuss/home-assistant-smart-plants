import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Renders the packaged dashboard card on a synthetic dashboard, as an admin
// and as a user without admin rights, at desktop width and at 390 pixels.

const url = "/frontend/e2e/card-harness.html";
interface HarnessRecord { ready?: boolean; calls: { service: string; data: { kind?: string }; target: unknown }[]; ws: { type: string }[]; toasts: string[]; moreInfo: string[]; navigations: string[]; picker?: { type: string; name: string }[] }
const record = (page: Page) => page.evaluate(() => (window as unknown as { __cardHarness: HarnessRecord }).__cardHarness);
const card = (page: Page, name: string) => page.locator("smart-plants-plant-card", { hasText: name });

test.beforeEach(async ({ page }, info) => {
  page.on("pageerror", error => { throw error; });
  if (info.project.name === "mobile") await page.setViewportSize({ width: 390, height: 844 });
});

async function open(page: Page, query = "") {
  await page.goto(`${url}${query}`);
  await expect.poll(async () => (await record(page)).ready).toBe(true);
  await expect(page.locator("smart-plants-plant-card sp-status-chip")).toHaveCount(3);
}

async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).include("#section").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  for (const rule of result.incomplete) expect(rule.id).toBe("color-contrast");
}

test("admin sees the plants, opens one in the panel and undoes a watering", async ({ page }, info) => {
  await open(page, "?admin");
  const aloe = card(page, "Office Aloe");
  await expect(aloe).toContainText("Office · Aloe vera");
  await expect(aloe).toContainText("Soil moisture");
  await expect(aloe).toContainText("36%");
  await expect(aloe).toContainText("Target 15–60%");
  await expect(aloe).toContainText("21.5 °C");
  await expect(aloe).toContainText("Watered 2 days ago");
  const basil = card(page, "Kitchen Basil");
  await expect(basil).toContainText("Needs water");
  await expect(basil).toContainText("Snoozed until");
  await expect(basil).toContainText("Soil moisture 12% is below the minimum of 30%");
  await expect(basil).toContainText("Care due");
  const lavender = card(page, "Balcony Lavender");
  await expect(lavender).toContainText("Paused");
  await expect(lavender).toContainText("Monitoring is paused");
  await expect(lavender.getByRole("button", { name: "Log watering for Balcony Lavender" })).toBeDisabled();
  await expect(page.locator("smart-plants-plant-card").getByRole("alert")).toContainText("Plant not found");
  await audit(page, info, "card-admin");

  await basil.getByRole("button", { name: "Log watering for Kitchen Basil" }).click();
  const toast = page.locator(".toast", { hasText: "Watering logged for Kitchen Basil" });
  await expect(toast).toBeVisible();
  await expect(basil).toContainText("Watered just now");
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".toast", { hasText: "Watering removed for Kitchen Basil" })).toBeVisible();
  const after = await record(page);
  expect(after.calls).toEqual([expect.objectContaining({ service: "log_care", data: expect.objectContaining({ kind: "watering" }), target: { device_id: "device-kitchen-basil" } })]);
  // One history read before logging, one for Undo, then the delete.
  expect(after.ws.map(m => m.type)).toEqual(["smart_plants/care/list", "smart_plants/care/list", "smart_plants/care/delete"]);

  await aloe.getByRole("button", { name: "Office Aloe", exact: true }).click();
  expect((await record(page)).navigations).toEqual(["/smart-plants/plant/00000000000040008000000000000001"]);
});

test("other users get more-info and a toast without Undo", async ({ page }, info) => {
  await open(page);
  const aloe = card(page, "Office Aloe");
  await audit(page, info, "card-user");
  await aloe.getByRole("button", { name: "Office Aloe", exact: true }).click();
  expect((await record(page)).moreInfo).toEqual(["sensor.office_aloe_moisture"]);
  await aloe.getByRole("button", { name: "Log watering for Office Aloe" }).click();
  const toast = page.locator(".toast", { hasText: "Watering logged for Office Aloe" });
  await expect(toast).toBeVisible();
  await expect(toast.getByRole("button")).toHaveCount(0);
  const after = await record(page);
  expect(after.ws).toEqual([]);
  expect(after.navigations).toEqual([]);
});

test("a refused watering says the user may not log care", async ({ page }) => {
  await open(page, "?refuse&lang=de");
  await card(page, "Office Aloe").getByRole("button", { name: "Gießen für Office Aloe eintragen" }).click();
  await expect(page.locator(".toast", { hasText: "Du darfst keine Pflege eintragen" })).toBeVisible();
  await expect(card(page, "Kitchen Basil")).toContainText("Braucht Wasser");
});

test("without a card only the small loader is fetched", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", request => { if (request.url().endsWith(".js") || request.url().includes(".js?")) scripts.push(new URL(request.url()).pathname); });
  await page.goto(`${url}?empty`);
  await expect.poll(async () => (await record(page)).ready).toBe(true);
  expect(scripts).toContain("/custom_components/smart_plants/frontend/smart-plants-card.js");
  expect(scripts).not.toContain("/custom_components/smart_plants/frontend/smart-plants-card-full.js");
  expect((await record(page)).picker).toEqual([expect.objectContaining({ type: "smart-plants-plant-card", name: "Smart Plants plant card" })]);
  await expect(page.locator("smart-plants-plant-card")).toHaveCount(0);
});
