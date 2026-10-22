import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Browser/axe checks for the Care plan card, the care task editor and the
// Automate sheet. Runs desktop and mobile via the Playwright projects. Data is
// synthetic; the harness never touches real HA.

const url = "/frontend/e2e/harness.html";
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const dialog = (page: Page) => page.locator("smart-plants-panel dialog.care-dialog");
const dialogButton = (page: Page, name: string) => dialog(page).getByRole("button", { name, exact: true });

async function openCare(page: Page) {
  await page.goto(`${url}?seed&care`);
  await expect(button(page, "Menu")).toBeVisible();
  await button(page, "Office Aloe").click();
  await page.getByRole("tab", { name: "Care", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Care plan", exact: true })).toBeVisible();
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

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async route => {
    const target = new URL(route.request().url());
    const allowed = ["/frontend/e2e/harness.html", "/frontend/e2e/harness.js", "/custom_components/smart_plants/frontend/smart-plants-panel.js"];
    if (target.origin === "http://127.0.0.1:4179" && allowed.includes(target.pathname)) await route.continue();
    else throw new Error(`Unmocked browser request: ${target.href}`);
  });
  await page.routeWebSocket("**/*", () => { throw new Error("Real WebSocket IO is forbidden in the care plan harness"); });
  page.on("pageerror", error => { throw error; });
});

test("care plan card shows task states and marks a due task as done", async ({ page }, info) => {
  await openCare(page);
  const plan = page.locator("smart-plants-panel .care-plan");
  await expect(plan).toContainText("Due today");
  await expect(plan).toContainText("Once a year, March–April");
  await audit(page, info, "care-plan");
  await button(page, "Mark Fertilize as done").click();
  await expect(plan).toContainText("In 4 weeks");
  await expect(button(page, "Mark Fertilize as done")).toHaveCount(0);
  await expect(page.locator("smart-plants-panel ul[aria-label='Plant care events']")).toContainText("Fertilizing");
});

test("care task editor is accessible in every step and validates inline", async ({ page }, info) => {
  await openCare(page);
  await button(page, "Add task").click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialogButton(page, "Fertilize Already in the care plan")).toBeDisabled();
  await audit(page, info, "care-task-presets");
  await dialogButton(page, "Custom task Your own name and schedule").click();
  await dialog(page).getByRole("spinbutton", { name: "Every", exact: true }).fill("0");
  await dialogButton(page, "Add task").click();
  await expect(dialog(page)).toContainText("Enter a name for this task.");
  await expect(dialog(page).getByRole("textbox", { name: "Name", exact: true })).toBeFocused();
  await audit(page, info, "care-task-errors");
  await dialogButton(page, "Once a year").click();
  await dialogButton(page, "November").click();
  await dialogButton(page, "February").click();
  await expect(dialogButton(page, "December")).toHaveAttribute("aria-pressed", "true");
  await audit(page, info, "care-task-yearly");
  await dialog(page).getByRole("textbox", { name: "Name", exact: true }).fill("Mist leaves");
  await dialogButton(page, "Add task").click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator("smart-plants-panel .care-plan")).toContainText("Once a year, November–February");
  const created = await page.evaluate(() => (window as unknown as { __smartPlantsHarness: { messages: Record<string, unknown>[] } }).__smartPlantsHarness.messages.find(m => m.type === "smart_plants/care_tasks/create"));
  expect(created).toMatchObject({ task_type: "custom", name: "Mist leaves", schedule: { kind: "yearly", start_month: 11, end_month: 2 } });
});

test("care suggestions are accessible and fill a new task", async ({ page }, info) => {
  await page.goto(`${url}?seed&suggest`);
  await expect(button(page, "Menu")).toBeVisible();
  await button(page, "Office Aloe").click();
  await page.getByRole("tab", { name: "Care", exact: true }).click();
  const plan = page.locator("smart-plants-panel .care-plan");
  await expect(plan).toContainText("They show up as suggestions when you add a task.");
  await plan.getByRole("button", { name: "Add task", exact: true }).click();
  const box = dialog(page).locator(".suggestions");
  await expect(box).toContainText("Suggestions for Aloe vera");
  await expect(box.locator("q.clamped")).toHaveCount(1);
  await audit(page, info, "care-task-suggestions");
  await dialogButton(page, "Show more").click();
  await expect(box.locator("q.clamped")).toHaveCount(0);
  await dialogButton(page, "Add Prune task").click();
  await expect(dialog(page).getByRole("textbox", { name: "Instructions (optional)", exact: true })).toHaveValue(/^Remove dead or damaged leaves/);
  await expect(dialog(page)).toContainText("From OpenPlantBook. Edit the text to make it your own.");
  await audit(page, info, "care-task-from-suggestion");
  await dialogButton(page, "Add task").click();
  await expect(dialog(page)).toHaveCount(0);
  const created = await page.evaluate(() => (window as unknown as { __smartPlantsHarness: { messages: Record<string, unknown>[] } }).__smartPlantsHarness.messages.find(m => m.type === "smart_plants/care_tasks/create"));
  expect(created).toMatchObject({ task_type: "prune", schedule: { kind: "yearly", start_month: 3, end_month: 4 } });
  expect(String((created as { instructions: string }).instructions)).toMatch(/^Remove dead or damaged leaves/);
});

test("rest period editor sets the months and shows the rest row", async ({ page }, info) => {
  await openCare(page);
  await page.locator("smart-plants-panel .care-plan .card-h ha-dropdown").evaluate(menu => menu.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "rest" } } })));
  await expect(dialog(page)).toContainText("Watering alerts are not affected.");
  await dialogButton(page, "Save").click();
  await expect(dialog(page)).toContainText("Pick the rest months.");
  await audit(page, info, "rest-editor-error");
  await dialogButton(page, "November").click();
  await dialogButton(page, "February").click();
  await expect(dialog(page).getByRole("checkbox", { name: "Fertilize", exact: true })).toBeChecked();
  await dialogButton(page, "Save").click();
  await expect(dialog(page)).toHaveCount(0);
  const row = page.locator("smart-plants-panel .care-plan .restline");
  await expect(row).toContainText("Rest period");
  await expect(row.getByRole("img", { name: "Rest months: November–February" })).toBeVisible();
  await audit(page, info, "rest-row");
});

test("due care shows in the plant header and on the overview", async ({ page }, info) => {
  await page.goto(`${url}?seed&care`);
  await expect(button(page, "Menu")).toBeVisible();
  const careTile = page.locator("smart-plants-overview .tile", { hasText: "Care due" });
  await expect(careTile).toContainText("1");
  await expect(page.locator("smart-plants-overview .care")).toContainText("Care: Fertilize");
  await audit(page, info, "overview-care");
  await careTile.click();
  await expect(page.locator("smart-plants-overview article.card")).toHaveCount(1);
  await button(page, "Office Aloe").click();
  await expect(page.getByRole("list", { name: "Care due", exact: true })).toContainText("Fertilize");
  await audit(page, info, "header-care-chips");
});

test("automate sheet lists the task entities", async ({ page }, info) => {
  await openCare(page);
  await page.locator("smart-plants-panel .care-plan ha-dropdown.task-menu").first().evaluate(menu => menu.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "automate" } } })));
  await expect(dialog(page)).toContainText("binary_sensor.office_aloe_fertilize");
  await expect(dialog(page)).toContainText("sensor.office_aloe_fertilize_next_due");
  await expect(dialog(page)).toContainText("binary_sensor.office_aloe_care_due");
  await audit(page, info, "care-automate");
  await dialogButton(page, "Close").click();
  await expect(dialog(page)).toHaveCount(0);
});

// Reading tasks: the plant's balcony sensor reads 9 °C (3 °C with `cold`), and
// OpenPlantBook says the species grows above 5 °C. Mobile runs at 390 px.
async function openReading(page: Page, info: TestInfo, query: string) {
  if (info.project.name === "mobile") await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url}?seed&reading${query}`);
  await expect(button(page, "Menu")).toBeVisible();
  await button(page, "Office Aloe").click();
  await page.getByRole("tab", { name: "Care", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Care plan", exact: true })).toBeVisible();
}
const harnessMessages = (page: Page) => page.evaluate(() => (window as unknown as { __smartPlantsHarness: { messages: Record<string, unknown>[] } }).__smartPlantsHarness.messages);
async function noHorizontalScroll(page: Page) {
  const overflow = await dialog(page).evaluate(element => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("winter protection is added from the OpenPlantBook minimum temperature", async ({ page }, info) => {
  await openReading(page, info, "");
  await page.locator("smart-plants-panel .care-plan").getByRole("button", { name: "Add task", exact: true }).click();
  const box = dialog(page).locator(".suggestions");
  await expect(box).toContainText("OpenPlantBook · minimum temperature");
  await expect(box).toContainText("Grows above 5 °C");
  await expect(dialogButton(page, "Winter protection When it gets cold")).toBeEnabled();
  await audit(page, info, "reading-suggestion");
  await dialogButton(page, "Add winter protection").click();
  await expect(dialogButton(page, "Reading")).toHaveAttribute("aria-pressed", "true");
  await expect(dialog(page).getByRole("combobox", { name: "Reading", exact: true })).toHaveValue("role:temperature");
  await expect(dialog(page).getByRole("textbox", { name: "Value °C", exact: true })).toHaveValue("5");
  await expect(dialog(page)).toContainText("From OpenPlantBook's minimum temperature.");
  await expect(dialog(page).locator(".task-summary")).toContainText("Winter protection · When the temperature is below 5 °C");
  await dialog(page).getByRole("button", { name: /More options/ }).click();
  await dialog(page).getByRole("textbox", { name: "Due again after above °C", exact: true }).fill("3");
  await dialogButton(page, "Add task").click();
  await expect(dialog(page)).toContainText("Enter the value or a higher number.");
  await noHorizontalScroll(page);
  await audit(page, info, "reading-editor-error");
  await dialog(page).getByRole("textbox", { name: "Due again after above °C", exact: true }).fill("8");
  await dialog(page).getByRole("spinbutton", { name: "Only after (optional) h", exact: true }).fill("2");
  await expect(dialog(page).locator(".task-summary")).toContainText("When the temperature is below 5 °C · for 2 h · due again above 8 °C");
  await dialogButton(page, "Add task").click();
  await expect(dialog(page)).toHaveCount(0);
  const created = (await harnessMessages(page)).find(m => m.type === "smart_plants/care_tasks/create");
  expect(created).toMatchObject({ task_type: "winter_protection", name: null, baseline_done_on: null,
    schedule: { kind: "reading", source: { role: "temperature" }, condition: "below", value: 5, unit: "°C", for_minutes: 120, reset_value: 8 } });
  const plan = page.locator("smart-plants-panel .care-plan");
  await expect(plan).toContainText("Below 5 °C · Temperature");
  await expect(plan).toContainText("Not needed · 9 °C");
  await audit(page, info, "reading-row");
});

test("a due reading task is marked done and waits for warmer readings", async ({ page }, info) => {
  await openReading(page, info, "&winter&cold");
  const plan = page.locator("smart-plants-panel .care-plan");
  await expect(plan).toContainText("Due · 3 °C");
  const items = await plan.locator("ha-dropdown.task-menu ha-dropdown-item").evaluateAll(nodes => nodes.map(node => node.getAttribute("value")));
  expect(items).toEqual(["mark_done", "edit", "automate", "delete"]);
  await audit(page, info, "reading-due");
  await button(page, "Mark Winter protection as done").click();
  await expect(plan).toContainText("· still cold");
  await expect(plan).toContainText(/Done \w+ \d+ · still cold/);
  await expect(button(page, "Mark Winter protection as done")).toHaveCount(0);
  await plan.locator("ha-dropdown.task-menu").first().evaluate(menu => menu.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "automate" } } })));
  await expect(dialog(page)).toContainText("binary_sensor.office_aloe_winter_protection");
  await expect(dialog(page)).not.toContainText("Next due date");
});

test("a reading task can follow another sensor in its own unit", async ({ page }, info) => {
  await openReading(page, info, "&winter");
  await page.locator("smart-plants-panel .care-plan ha-dropdown.task-menu").first().evaluate(menu => menu.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "edit" } } })));
  await expect(dialog(page).getByRole("textbox", { name: "Value °C", exact: true })).toHaveValue("5");
  await dialog(page).getByRole("combobox", { name: "Reading", exact: true }).selectOption("other");
  await dialog(page).locator("ha-entity-picker").getByRole("combobox").selectOption("sensor.greenhouse_temp");
  await expect(dialog(page).getByRole("textbox", { name: "Value °F", exact: true })).toHaveValue("41");
  await expect(dialog(page)).toContainText("From OpenPlantBook's minimum temperature.");
  await expect(dialog(page)).toContainText("Greenhouse thermometer");
  await noHorizontalScroll(page);
  await audit(page, info, "reading-other-sensor");
  await dialogButton(page, "Save").click();
  await expect(dialog(page)).toHaveCount(0);
  const updated = (await harnessMessages(page)).find(m => m.type === "smart_plants/care_tasks/update");
  expect(updated).toMatchObject({ schedule: { kind: "reading", source: { entity_id: "sensor.greenhouse_temp" }, condition: "below", value: 41, unit: "°F", for_minutes: 0, reset_value: null } });
  await expect(page.locator("smart-plants-panel .care-plan")).toContainText("Below 41 °F · Greenhouse thermometer");
});
