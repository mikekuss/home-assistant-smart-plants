import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Browser/axe accessibility matrix for the Sensors tab: assigned sensors, the
// sensor lists per reading and "Several sensors for one reading". Runs desktop and mobile via the Playwright projects.
// Data is synthetic; the harness never touches real HA or providers.

const url = "/frontend/e2e/harness.html";
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function openSensors(page: Page, malformedRole?: string) {
  await page.goto(`${url}?seed`);
  await expect(button(page, "Menu")).toBeVisible();
  if (malformedRole) {
    // Store a corrupt config for one role and push it through a registry refresh.
    // Stored plants hold only configured roles (the PlantView adds defaults), so
    // build the malformed config from the backend default instead of mutating it.
    await page.evaluate(role => {
      const harness = (window as unknown as { __smartPlantsHarness: { plants: { roles: Record<string, unknown> }[]; roleDefaults: Record<string, object>; emit: (event: string) => void } }).__smartPlantsHarness;
      harness.plants[0].roles[role] = { ...harness.roleDefaults[role], aggregation: "median" };
      harness.emit("ready");
    }, malformedRole);
  }
  await button(page, "Office Aloe").click();
  await page.getByRole("tab", { name: "Sensors", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Office Aloe", level: 2, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assigned sensors", exact: true })).toBeVisible();
  const combine = page.getByRole("button", { name: /^Several sensors for one reading/ });
  await combine.click();
  await expect(combine).toHaveAttribute("aria-expanded", "true");
}
async function addSensor(page: Page, reading: string) {
  await button(page, "Add sensor").click();
  const item = page.getByRole("menuitem", { name: reading, exact: true });
  await item.focus(); await item.press("Enter");
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

test("sensors tab: assigned sensors and every reading row render and pass axe", async ({ page }, info) => {
  await openSensors(page);
  await expect(page.locator("smart-plants-panel section", { hasText: "Assigned sensors" })).toContainText("Soil probe");
  for (const label of ["Soil moisture", "Temperature", "Humidity", "Light", "Battery", "Fertilizer level", "Soil temperature", "CO₂"]) {
    await expect(roleRow(page, label).locator("button.source-toggle")).toHaveText("Change");
  }
  await expect(roleRow(page, "Temperature").getByRole("button", { name: "Change how temperature sensors combine", exact: true })).toBeVisible();
  await audit(page, info, "sensors-baseline");
});

test("temperature editor: open, filtered picker, add, save, axe", async ({ page }, info) => {
  await openSensors(page);
  const row = roleRow(page, "Temperature");
  await row.locator("button.source-toggle").click();
  await expect(row.locator("button.source-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(row.locator("button.source-toggle")).toHaveAttribute("aria-controls", "temperature-sources-editor");
  await expect(row.getByRole("combobox", { name: "Combine readings", exact: true })).toHaveValue("average");
  await audit(page, info, "sensors-combine-open");
  await addSensor(page, "Temperature");
  await expect(page.getByRole("heading", { name: "Temperature sensors", exact: true })).toBeFocused();
  const editor = page.locator("smart-plants-panel section.picker div#temperature-sources-editor");
  await expect(editor).toBeVisible();
  // The filtered picker offers the temperature sensor but not a moisture one.
  const picker = editor.getByRole("combobox", { name: "Add air temperature sensor", exact: true });
  const options = await picker.locator("option").allTextContents();
  expect(options.some(o => o.includes("sensor.living_temp"))).toBe(true);
  expect(options.some(o => o.includes("sensor.soil"))).toBe(false);
  await picker.selectOption("sensor.living_temp");
  await audit(page, info, "sensors-editor-open");
  await editor.getByRole("button", { name: "Save temperature sensors", exact: true }).click();
  await expect(page.getByText("Temperature sensors saved.", { exact: true })).toBeVisible();
  await expect(roleRow(page, "Temperature")).toContainText("1 sensor");
  await expect(page.locator("smart-plants-panel section", { hasText: "Assigned sensors" })).toContainText("Living room temperature");
});

test("single active editor: switching with unsaved changes prompts", async ({ page }, info) => {
  await openSensors(page);
  await roleRow(page, "Temperature").locator("button.source-toggle").click();
  const editor = page.locator("smart-plants-panel div#temperature-sources-editor");
  await editor.getByLabel("Not updating after (seconds, 60–604800)", { exact: true }).fill("3600");
  await roleRow(page, "Humidity").locator("button.source-toggle").click();
  const alert = page.locator("smart-plants-panel #detail-panel > div.notice[role='alert']");
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "Keep editing", exact: true })).toBeVisible();
  await expect(alert.getByRole("button", { name: "Discard and switch", exact: true })).toBeVisible();
  await audit(page, info, "sensors-switch-alert");
  await alert.getByRole("button", { name: "Discard and switch", exact: true }).click();
  await expect(page.locator("smart-plants-panel div#humidity-sources-editor")).toBeVisible();
});

test("malformed role: Change refuses fail-closed with a row-scoped alert, axe", async ({ page }, info) => {
  await openSensors(page, "temperature");
  const row = roleRow(page, "Temperature");
  await expect(row).toContainText("Sensor settings could not be read");
  await row.locator("button.source-toggle").click();
  const alert = row.getByRole("alert");
  await expect(alert).toHaveText("Temperature sensor settings are missing or incompatible. Refresh or update before editing; defaults will not be guessed.");
  await expect(page.locator("smart-plants-panel div#temperature-sources-editor")).toHaveCount(0);
  await expect(row.locator("button.source-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(roleRow(page, "Humidity").getByRole("alert")).toHaveCount(0);
  await audit(page, info, "sensors-role-unavailable");
  await roleRow(page, "Humidity").locator("button.source-toggle").click();
  await expect(page.locator("smart-plants-panel div#humidity-sources-editor")).toBeVisible();
  await expect(alert).toHaveCount(0);
});
