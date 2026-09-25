import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Browser/axe accessibility matrix for the generic Sensors section (per-role
// source assignment). Runs desktop and mobile via the Playwright projects.
// Data is synthetic; the harness never touches real HA or providers.

const url = "/frontend/e2e/harness.html";
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function openSensors(page: Page, malformedRole?: string) {
  await page.goto(`${url}?seed`);
  await expect(button(page, "Menu")).toBeVisible();
  if (malformedRole) {
    // Corrupt one role in the synthetic store and push it through a registry refresh.
    await page.evaluate(role => {
      const harness = (window as unknown as { __smartPlantsHarness: { plants: { roles: Record<string, { aggregation: string }> }[]; emit: (event: string) => void } }).__smartPlantsHarness;
      harness.plants[0].roles[role].aggregation = "median";
      harness.emit("ready");
    }, malformedRole);
  }
  await button(page, "Office Aloe").click();
  await button(page, "Sensors").click();
  await expect(page.getByRole("heading", { name: "Office Aloe", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sensors", exact: true })).toBeVisible();
}

async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  process.stdout.write(`AXE ${info.project.name}/${name}: ${result.passes.length} passes; ${result.violations.length} violations; ${result.incomplete.length} incomplete (${result.incomplete.map(r => r.id).join(", ") || "none"})\n`);
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  for (const rule of result.incomplete) expect(rule.id).toBe("color-contrast");
}

const roleRow = (page: Page, label: string) => page.locator(`smart-plants-panel dl.sensors dt:text-is("${label}") + dd`);

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async route => {
    const target = new URL(route.request().url());
    const allowed = ["/frontend/e2e/harness.html", "/frontend/e2e/harness.js", "/custom_components/smart_plants/frontend/smart-plants-panel.js"];
    if (target.origin === "http://127.0.0.1:4179" && allowed.includes(target.pathname)) await route.continue();
    else throw new Error(`Unmocked browser request: ${target.href}`);
  });
  await page.routeWebSocket("**/*", () => { throw new Error("Real WebSocket IO is forbidden in the sensors a11y harness"); });
  page.on("pageerror", error => { throw error; });
});
test.afterEach(async ({ page }) => {
  const unexpected = await page.evaluate(() => (window as unknown as { __smartPlantsHarness?: { unexpected: string[] } }).__smartPlantsHarness?.unexpected ?? []);
  expect(unexpected).toEqual([]);
});

test("sensors section: all seven role rows render and pass axe closed", async ({ page }, info) => {
  await openSensors(page);
  for (const label of ["Air temperature", "Air humidity", "Illuminance", "Battery", "Conductivity", "Soil temperature", "CO₂"]) {
    await expect(roleRow(page, label).getByRole("button", { name: "Edit sources", exact: true })).toBeVisible();
  }
  await audit(page, info, "sensors-baseline");
});

test("temperature editor: open, filtered picker, add, save, axe", async ({ page }, info) => {
  await openSensors(page);
  const row = roleRow(page, "Air temperature");
  const toggle = row.getByRole("button", { name: "Edit sources", exact: true });
  await toggle.click();
  const editor = page.locator("smart-plants-panel div#temperature-sources-editor");
  await expect(editor).toBeVisible();
  await expect(row.locator("button.source-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(row.locator("button.source-toggle")).toHaveAttribute("aria-controls", "temperature-sources-editor");
  // The filtered picker offers the temperature sensor but not a moisture one.
  const picker = editor.getByRole("combobox", { name: "Add air temperature sensor", exact: true });
  const options = await picker.locator("option").allTextContents();
  expect(options.some(o => o.includes("sensor.living_temp"))).toBe(true);
  expect(options.some(o => o.includes("sensor.soil"))).toBe(false);
  await picker.selectOption("sensor.living_temp");
  await audit(page, info, "sensors-editor-open");
  await editor.getByRole("button", { name: "Save air temperature sources", exact: true }).click();
  await expect(page.getByText("Air temperature sources saved.", { exact: true })).toBeVisible();
  await expect(roleRow(page, "Air temperature")).toContainText("1 source");
});

test("single active editor: switching with unsaved changes prompts", async ({ page }, info) => {
  await openSensors(page);
  await roleRow(page, "Air temperature").getByRole("button", { name: "Edit sources", exact: true }).click();
  const editor = page.locator("smart-plants-panel div#temperature-sources-editor");
  await editor.getByLabel("Stale after (seconds, 60–604800)", { exact: true }).fill("3600");
  await roleRow(page, "Air humidity").getByRole("button", { name: "Edit sources", exact: true }).click();
  const alert = page.locator("smart-plants-panel section[aria-labelledby='sensors-heading'] div[role='alert']");
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "Keep editing", exact: true })).toBeVisible();
  await expect(alert.getByRole("button", { name: "Discard and switch", exact: true })).toBeVisible();
  await audit(page, info, "sensors-switch-alert");
  await alert.getByRole("button", { name: "Discard and switch", exact: true }).click();
  await expect(page.locator("smart-plants-panel div#humidity-sources-editor")).toBeVisible();
});

test("malformed role: Edit sources refuses fail-closed with a row-scoped alert, axe", async ({ page }, info) => {
  await openSensors(page, "temperature");
  const row = roleRow(page, "Air temperature");
  await expect(row).toContainText("role data unavailable");
  await row.getByRole("button", { name: "Edit sources", exact: true }).click();
  const alert = row.getByRole("alert");
  await expect(alert).toHaveText("Air temperature source data is missing or incompatible. Refresh or upgrade before editing; defaults will not be guessed.");
  await expect(page.locator("smart-plants-panel div#temperature-sources-editor")).toHaveCount(0);
  await expect(row.locator("button.source-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(roleRow(page, "Air humidity").getByRole("alert")).toHaveCount(0);
  await audit(page, info, "sensors-role-unavailable");
  await roleRow(page, "Air humidity").getByRole("button", { name: "Edit sources", exact: true }).click();
  await expect(page.locator("smart-plants-panel div#humidity-sources-editor")).toBeVisible();
  await expect(alert).toHaveCount(0);
});
