import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// The overview's Notifications dialog in the packaged artifact with synthetic
// data: it lists the notification automations made here and hands one preset
// to Home Assistant's automation editor. Driven by keyboard only.
interface NotificationsHarness { messages: Array<Record<string, unknown>>; unexpected: string[]; editorRequests: Array<{ data: Record<string, unknown> }> }
type HarnessWindow = { __smartPlantsHarness: NotificationsHarness };

const url = "/frontend/e2e/harness.html";
const menuItem = (page: Page, name: string) => page.getByRole("menuitem", { name, exact: true });
const dialog = (page: Page) => page.locator("smart-plants-panel smart-plants-notifications dialog");
const harness = (page: Page) => page.evaluate(() => (window as unknown as HarnessWindow).__smartPlantsHarness);

async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  process.stdout.write(`AXE ${info.project.name}/${name}: ${result.passes.length} rule passes; ${result.violations.length} violations; ${result.incomplete.length} incomplete (${result.incomplete.map(r => r.id).join(", ") || "none"})\n`);
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name}: no horizontal scroll`).toBe(true);
}
async function openDialog(page: Page, menu: string, item: string) {
  await page.getByRole("button", { name: menu, exact: true }).focus();
  await page.keyboard.press("Enter");
  await menuItem(page, item).focus(); await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
}
// Tab until the focused element matches, failing after a full cycle.
async function tabTo(page: Page, accessibleName: RegExp) {
  for (let i = 0; i < 40; i++) {
    const name = await page.evaluate(() => {
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return active ? (active.getAttribute("aria-label") ?? (active as HTMLInputElement).labels?.[0]?.textContent ?? active.textContent ?? "").trim() : "";
    });
    if (accessibleName.test(name)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Focus never reached ${accessibleName}`);
}

test.beforeEach(async ({ page }, info) => {
  page.on("pageerror", error => { throw error; });
  if (info.project.name === "mobile") await page.setViewportSize({ width: 390, height: 844 });
});
test.afterEach(async ({ page }) => { expect(await page.evaluate(() => (window as unknown as { __smartPlantsHarness?: NotificationsHarness }).__smartPlantsHarness?.unexpected ?? [])).toEqual([]); });

test("adds only a menu item to the overview and opens the editor with a preset", async ({ page }, info) => {
  await page.goto(`${url}?seed&notifications`);
  await expect(page.getByRole("heading", { name: "Smart Plants", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  // The seed has two active plants, so Snooze all plants… shows as well.
  await expect(page.getByRole("menuitem")).toHaveCount(5);
  for (const item of ["Add plant", "Notifications…", "Snooze all plants…", "Integration options", "Documentation"]) await expect(menuItem(page, item)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("smart-plants-panel smart-plants-notifications")).toHaveCount(0);
  expect((await harness(page)).messages.filter(m => m.type === "automation/config")).toEqual([]);

  await openDialog(page, "Menu", "Notifications…");
  await expect(dialog(page).getByRole("heading", { name: "Notifications", exact: true })).toBeFocused();
  const existing = dialog(page).getByRole("region", { name: "Your notifications" });
  await expect(existing.getByRole("listitem")).toHaveCount(1);
  await expect(existing).toContainText("Smart Plants: daily plant report");
  await expect(existing).toContainText("Last sent");
  const toggle = existing.getByRole("switch", { name: "Smart Plants: daily plant report" });
  await expect(toggle).toBeChecked();
  await expect(toggle).toHaveAccessibleDescription(/^Last sent/);
  const edit = existing.getByRole("link", { name: "Edit Smart Plants: daily plant report" });
  await expect(edit).toHaveAttribute("href", "/config/automation/edit/1761000000000");
  // Drawn as a switch track rather than a checkbox, on one row with the name and Edit.
  expect(await toggle.evaluate(e => { const c = getComputedStyle(e); return [c.appearance, c.width, c.height, c.borderRadius]; })).toEqual(["none", "48px", "24px", "12px"]);
  const [switchBox, nameBox, editBox] = await Promise.all([toggle, existing.getByText("Smart Plants: daily plant report", { exact: true }), edit].map(async l => (await l.boundingBox())!));
  expect(switchBox.x + switchBox.width).toBeLessThanOrEqual(nameBox.x);
  expect(nameBox.x + nameBox.width).toBeLessThanOrEqual(editBox.x);
  for (const box of [nameBox, editBox]) expect(Math.abs(box.y + box.height / 2 - (switchBox.y + switchBox.height / 2))).toBeLessThan(box.height);
  await expect(dialog(page).getByRole("radio", { name: /^Daily plant report/ })).toBeChecked();
  await expect(dialog(page).getByRole("status")).toHaveText("You already have this notification.");
  await expect(dialog(page).getByRole("combobox", { name: "Send to" })).toHaveValue("entity:notify.mock_chat");
  await audit(page, info, "notifications-daily");

  // Turn the existing notification off from its switch.
  await tabTo(page, /^Smart Plants: daily plant report$/);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await harness(page)).messages.filter(m => m.type === "call_service")).toEqual([{ type: "call_service", domain: "automation", service: "turn_off", target: { entity_id: "automation.mock_daily_report" } }]);
  await expect(toggle).not.toBeChecked();
  await expect(toggle).toBeEnabled();

  // Switch to the needs-water preset with the arrow keys and turn on quiet hours.
  await tabTo(page, /^Daily plant report/);
  await page.keyboard.press("ArrowDown");
  await expect(dialog(page).getByRole("radio", { name: "Tell me right away when a plant needs water" })).toBeChecked();
  await expect(dialog(page).getByRole("radio", { name: /^Daily plant report/ })).not.toBeChecked();
  await expect(dialog(page).getByRole("combobox", { name: "After" })).toHaveValue("30");
  await tabTo(page, /^Quiet hours/);
  await page.keyboard.press("Space");
  await expect(dialog(page).getByLabel("From", { exact: true })).toHaveValue("22:00");
  await expect(dialog(page).getByLabel("To", { exact: true })).toHaveValue("07:00");
  await tabTo(page, /^Send to/);
  await page.keyboard.press("End");
  await expect(dialog(page).getByRole("combobox", { name: "Send to" })).toHaveValue("persistent");
  await audit(page, info, "notifications-water");

  await tabTo(page, /^Open in automation editor$/);
  await page.keyboard.press("Enter");
  await expect(page.locator("smart-plants-panel smart-plants-notifications")).toHaveCount(0);
  const requests = (await harness(page)).editorRequests;
  expect(requests).toHaveLength(1);
  expect(requests[0]!.data).toEqual({
    alias: "Smart Plants: plant needs water",
    description: "Created in Smart Plants → Notifications. Sends a message when a plant has needed water for 30 minutes. Snoozed plants send theirs when the snooze ends.",
    mode: "queued",
    max: 20,
    triggers: [{ trigger: "smart_plants.needs_water", id: "smart_plants_needs_water", target: { entity_id: ["binary_sensor.smart_plants_all_plants"] }, options: { behavior: "each", for: { minutes: 30 }, include_snoozed: false } }],
    conditions: [{ condition: "not", conditions: [{ condition: "time", after: "22:00:00", before: "07:00:00" }] }],
    actions: [{ action: "persistent_notification.create", data: { title: "{{ trigger.plant }} needs water", message: "Water it when you get a chance.", notification_id: "smart_plants_needs_water_{{ trigger.device_id }}" } }],
  });
  expect(new URL(page.url()).pathname).toBe("/config/automation/edit/new");
});

test("offers notifications only on the overview, not while adding a plant", async ({ page }) => {
  await page.goto(`${url}?seed&notifications`);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await menuItem(page, "Add plant").click();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(menuItem(page, "Back to overview")).toBeVisible();
  await expect(menuItem(page, "Integration options")).toBeVisible();
  await expect(menuItem(page, "Notifications…")).toHaveCount(0);
});

test("keeps focus in the dialog, closes with Escape and returns focus to the menu", async ({ page }) => {
  await page.goto(`${url}?seed&notifications`);
  await openDialog(page, "Menu", "Notifications…");
  // A full Tab cycle stays inside the dialog.
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe("smart-plants-panel");
    expect(await dialog(page).evaluate(d => d.contains((d.getRootNode() as ShadowRoot).activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator("smart-plants-panel smart-plants-notifications")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeFocused();
});

test("chooses plants and asks for at least one", async ({ page }) => {
  await page.goto(`${url}?seed&notifications`);
  await openDialog(page, "Menu", "Notifications…");
  await tabTo(page, /^All plants$/);
  await page.keyboard.press("ArrowDown");
  await expect(dialog(page).getByRole("radio", { name: "Choose plants" })).toBeChecked();
  await tabTo(page, /^Open in automation editor$/);
  await page.keyboard.press("Enter");
  await expect(dialog(page).getByRole("alert")).toHaveText("Choose at least one plant.");
  await page.keyboard.press("Space");
  await expect(dialog(page).getByRole("alert")).toHaveCount(0);
  await tabTo(page, /^Open in automation editor$/);
  await page.keyboard.press("Enter");
  const requests = (await harness(page)).editorRequests;
  const trigger = (requests[0]!.data.triggers as Array<Record<string, unknown>>)[0]!;
  expect(trigger.id).toMatch(/^smart_plants_daily_report_[0-9a-f]{8}$/);
  expect((requests[0]!.data.conditions as Array<Record<string, unknown>>)[0]!.target).toEqual({ device_id: [expect.any(String)] });
});

test("German dialog", async ({ page }, info) => {
  await page.goto(`${url}?seed&notifications&lang=de`);
  await openDialog(page, "Menü", "Benachrichtigungen…");
  await expect(dialog(page).getByRole("heading", { name: "Benachrichtigungen", exact: true })).toBeFocused();
  await expect(dialog(page).getByRole("region", { name: "Deine Benachrichtigungen" })).toContainText("Zuletzt gesendet");
  await expect(dialog(page).getByRole("radio", { name: /^Täglicher Pflanzenbericht/ })).toBeChecked();
  await expect(dialog(page).getByRole("button", { name: "Im Automationseditor öffnen" })).toBeVisible();
  await audit(page, info, "notifications-german");
  await tabTo(page, /^Täglicher Pflanzenbericht/);
  await page.keyboard.press("ArrowDown");
  await tabTo(page, /^Ruhezeit/);
  await page.keyboard.press("Space");
  await expect(dialog(page).getByLabel("Bis", { exact: true })).toHaveValue("07:00");
  await audit(page, info, "notifications-german-water");
});
