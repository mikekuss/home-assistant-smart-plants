import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Deferred browser/axe accessibility matrix for the seven-role threshold-editing
// surface. Every scan runs desktop and mobile via the Playwright projects.
// Data is synthetic; the harness never touches real HA or providers.
// The Window.__smartPlantsHarness augmentation lives in panel.spec.ts; this
// file reads its .unexpected in an evaluate callback via an untyped cast.

const url = "/frontend/e2e/harness.html";
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

interface EditorSpec {
  problemRole: string;
  displayName: string;              // status row heading text
  firstFieldLabel: string;          // first labelled input in editor
  outOfRangeValue: string;          // value guaranteed to fail parseXField range
  otherRole: string;                // second editor to exercise cross-editor switch
  otherFieldLabel: string;
}
const EDITORS: EditorSpec[] = [
  { problemRole: "temperature_stress", displayName: "Temperature stress", firstFieldLabel: "Cold trigger (°C)", outOfRangeValue: "999", otherRole: "humidity_stress", otherFieldLabel: "Dry trigger (%)" },
  { problemRole: "humidity_stress", displayName: "Humidity stress", firstFieldLabel: "Dry trigger (%)", outOfRangeValue: "150", otherRole: "temperature_stress", otherFieldLabel: "Cold trigger (°C)" },
  { problemRole: "conductivity_stress", displayName: "Conductivity stress", firstFieldLabel: "Low trigger (µS/cm)", outOfRangeValue: "99999", otherRole: "co2_stress", otherFieldLabel: "High trigger (ppm)" },
  { problemRole: "co2_stress", displayName: "CO2 stress", firstFieldLabel: "High trigger (ppm)", outOfRangeValue: "99999", otherRole: "low_light", otherFieldLabel: "Target (lx)" },
  { problemRole: "soil_temperature_stress", displayName: "Soil temperature stress", firstFieldLabel: "Cold trigger (°C)", outOfRangeValue: "999", otherRole: "low_battery", otherFieldLabel: "Low trigger (%)" },
  { problemRole: "low_battery", displayName: "Low battery", firstFieldLabel: "Low trigger (%)", outOfRangeValue: "150", otherRole: "low_light", otherFieldLabel: "Target (lx)" },
  { problemRole: "low_light", displayName: "Low light", firstFieldLabel: "Target (lx)", outOfRangeValue: "999999", otherRole: "temperature_stress", otherFieldLabel: "Cold trigger (°C)" },
];

async function openDiagnostics(page: Page) {
  await page.goto(`${url}?diagnostics`);
  await expect(button(page, "Menu")).toBeVisible();
  await button(page, "Diagnostics Plant").click();
  await button(page, "Diagnostics").click();
  await expect(page.getByRole("heading", { name: "Diagnostics Plant", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Advanced diagnostics", exact: true })).toBeVisible();
}

async function audit(page: Page, info: TestInfo, name: string) {
  // Scanning the whole detail view covers the diagnostics section plus its
  // parents while avoiding shadow-DOM include-selector limitations in AxeBuilder.
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  process.stdout.write(`AXE ${info.project.name}/${name}: ${result.passes.length} passes; ${result.violations.length} violations; ${result.incomplete.length} incomplete (${result.incomplete.map(r => r.id).join(", ") || "none"})\n`);
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  for (const rule of result.incomplete) {
    // Only the same modal-dialog color-contrast partial-obscuring pattern that
    // panel.spec.ts documents is accepted (unrelated to threshold editing here).
    expect(rule.id).toBe("color-contrast");
  }
}

async function toggleEditor(page: Page, roleLabel: string) {
  const container = page.locator(`smart-plants-panel dl.diagnostics dt:text-is("${roleLabel}") + dd`);
  const toggle = container.getByRole("button", { name: "Edit thresholds", exact: true });
  await expect(toggle).toBeVisible();
  await toggle.click();
}

async function closeIfOpen(page: Page, roleLabel: string) {
  // The toggle button becomes labelled "Cancel" while an editor is open;
  // clicking it closes the editor without ambiguity with the actions row.
  const toggle = page.locator(`smart-plants-panel dl.diagnostics dt:text-is("${roleLabel}") + dd button.threshold-toggle`);
  if (await toggle.getAttribute("aria-expanded") === "true") await toggle.click();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async route => {
    const target = new URL(route.request().url());
    const allowed = ["/frontend/e2e/harness.html", "/frontend/e2e/harness.js", "/custom_components/smart_plants/frontend/smart-plants-panel.js"];
    if (target.origin === "http://127.0.0.1:4179" && allowed.includes(target.pathname)) await route.continue();
    else { throw new Error(`Unmocked browser request: ${target.href}`); }
  });
  await page.routeWebSocket("**/*", () => { throw new Error("Real WebSocket IO is forbidden in the diagnostics a11y harness"); });
  page.on("pageerror", error => { throw error; });
});
test.afterEach(async ({ page }) => {
  const unexpected = await page.evaluate(() => (window as unknown as { __smartPlantsHarness?: { unexpected: string[] } }).__smartPlantsHarness?.unexpected ?? []);
  expect(unexpected).toEqual([]);
});

test("read-only diagnostics baseline: all seven rows editable-closed pass axe", async ({ page }, info) => {
  await openDiagnostics(page);
  for (const spec of EDITORS) {
    const row = page.locator(`smart-plants-panel dl.diagnostics dt:text-is("${spec.displayName}") + dd`);
    await expect(row.getByRole("button", { name: "Edit thresholds", exact: true })).toBeVisible();
    await expect(row.getByRole("group")).toHaveCount(0);
  }
  await audit(page, info, "diagnostics-baseline");
});

for (const spec of EDITORS) {
  test(`editor for ${spec.problemRole}: open, edit, inline validation error, axe scan`, async ({ page }, info) => {
    await openDiagnostics(page);
    await toggleEditor(page, spec.displayName);
    const editor = page.locator(`smart-plants-panel div#${spec.problemRole}-editor`);
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute("role", "group");
    // Toggle carries aria-expanded=true and controls the editor id.
    const toggle = page.locator(`smart-plants-panel dl.diagnostics dt:text-is("${spec.displayName}") + dd button.threshold-toggle`);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAttribute("aria-controls", `${spec.problemRole}-editor`);
    // Edit a field to a value that fails parse/range and press Save to surface inline error.
    const field = editor.getByLabel(spec.firstFieldLabel, { exact: true });
    await field.fill(spec.outOfRangeValue);
    await editor.getByRole("button", { name: "Save thresholds", exact: true }).click();
    const err = editor.getByRole("alert");
    await expect(err).toBeVisible();
    await expect(err).toContainText("Effective thresholds must satisfy");
    // Keyboard reach: per-field Inherit button and Save primary must be tabbable.
    const inherit = editor.getByRole("button", { name: "Inherit", exact: true }).first();
    await expect(inherit).toBeVisible();
    await inherit.focus();
    await expect(inherit).toBeFocused();
    const save = editor.getByRole("button", { name: "Save thresholds", exact: true });
    await save.focus();
    await expect(save).toBeFocused();
    await audit(page, info, `editor-${spec.problemRole}`);
  });
}

test("cross-editor unsaved-changes alert: keyboard reachable, discard-and-switch and keep-editing outcomes", async ({ page }, info) => {
  await openDiagnostics(page);
  const first = EDITORS[0]!;   // temperature_stress
  const second = EDITORS[1]!;  // humidity_stress
  await toggleEditor(page, first.displayName);
  const firstEditor = page.locator(`smart-plants-panel div#${first.problemRole}-editor`);
  await firstEditor.getByLabel(first.firstFieldLabel, { exact: true }).fill("11.5");
  // Try to open the second editor — the shared alert must appear.
  const secondToggle = page.locator(`smart-plants-panel dl.diagnostics dt:text-is("${second.displayName}") + dd button.threshold-toggle`);
  await secondToggle.click();
  const alert = page.locator("smart-plants-panel p.threshold-switch-alert");
  await expect(alert).toBeVisible();
  await expect(alert).toHaveAttribute("role", "alert");
  // Panel renders role names with underscores → spaces, lowercased.
  await expect(alert).toContainText(first.problemRole.replace(/_/g, " "));
  await expect(alert).toContainText(second.problemRole.replace(/_/g, " "));
  // Both actions must be keyboard reachable.
  const keepEditing = alert.getByRole("button", { name: "Keep editing", exact: true });
  const discard = alert.getByRole("button", { name: "Discard and switch", exact: true });
  await keepEditing.focus();
  await expect(keepEditing).toBeFocused();
  await discard.focus();
  await expect(discard).toBeFocused();
  // Axe scan while the switch alert is visible.
  await audit(page, info, "cross-editor-alert");
  // Keep editing dismisses the alert and preserves the current editor.
  await keepEditing.click();
  await expect(alert).toHaveCount(0);
  await expect(firstEditor).toBeVisible();
  await expect(firstEditor.getByLabel(first.firstFieldLabel, { exact: true })).toHaveValue("11.5");
  // Re-open the second toggle — alert reappears — then choose Discard and switch.
  await secondToggle.click();
  await expect(alert).toBeVisible();
  await alert.getByRole("button", { name: "Discard and switch", exact: true }).click();
  await expect(alert).toHaveCount(0);
  await expect(firstEditor).toHaveCount(0);
  const secondEditor = page.locator(`smart-plants-panel div#${second.problemRole}-editor`);
  await expect(secondEditor).toBeVisible();
  await expect(secondEditor.getByLabel(second.firstFieldLabel, { exact: true })).toHaveValue("");
  // Editing surface remains axe-clean after the switch.
  await audit(page, info, "cross-editor-after-discard");
  await closeIfOpen(page, second.displayName);
});

test("overall health composite section renders and passes axe", async ({ page }, info) => {
  await openDiagnostics(page);
  const heading = page.getByRole("heading", { name: "Overall health", exact: true });
  await expect(heading).toBeVisible();
  const section = page.locator("smart-plants-panel section[aria-labelledby='overall-health-heading']");
  await expect(section).toBeVisible();
  // Diagnostics seed reports composite 78 with medium confidence.
  const status = section.locator("p[role='status']");
  await expect(status).toContainText("78 out of 100");
  await expect(section).toContainText("medium");
  await expect(section).toContainText("Temperature");
  await expect(section).toContainText("Humidity");
  // Configured-but-unavailable: illuminance. Battery is excluded from the
  // composite entirely (device health), so it never appears here.
  await expect(section).toContainText("Illuminance");
  // Heading is a focusable landmark via keyboard-reachable focus order.
  await heading.focus();
  await status.focus();
  await audit(page, info, "overall-health");
});

test("toggle button focus and keyboard behavior for every editor row", async ({ page }, info) => {
  await openDiagnostics(page);
  for (const spec of EDITORS) {
    const toggle = page.locator(`smart-plants-panel dl.diagnostics dt:text-is("${spec.displayName}") + dd button.threshold-toggle`);
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await closeIfOpen(page, spec.displayName);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
  await audit(page, info, "toggle-keyboard");
});
