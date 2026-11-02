import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Renders the packaged dashboard card on a synthetic dashboard, as an admin
// and as a user without admin rights, at desktop width and at 390 pixels.

const url = "/frontend/e2e/card-harness.html";
interface HarnessRecord { ready?: boolean; fetches: string[]; calls: { service: string; data: { kind?: string }; target: unknown }[]; ws: { type: string }[]; toasts: string[]; moreInfo: string[]; navigations: string[]; picker?: { type: string; name: string }[] }
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

// Every user sees the photo. Only a plant whose stale sensor names a photo is
// requested: Kitchen Basil has none and the paused Balcony Lavender doesn't say.
for (const role of ["admin", "user"] as const) {
  test(`${role} sees the plant photo and no other photo is requested`, async ({ page }) => {
    await open(page, role === "admin" ? "?admin" : "");
    const photo = card(page, "Office Aloe").getByRole("img", { name: "Photo of Office Aloe" });
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(8);
    for (const name of ["Kitchen Basil", "Balcony Lavender"]) await expect(card(page, name).locator("sp-plant-avatar img")).toHaveCount(0);
    expect((await record(page)).fetches).toEqual(["/api/smart_plants/plants/00000000000040008000000000000001/image?v=0000000000004000800000000000a10e"]);
  });
}

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

// Sections are 320 to 500 pixels wide and the card takes half of one: about
// 246 pixels in a wide section, 156 in a narrow one and about 175 on a phone.
for (const [section, widest] of [[500, 250], [320, 160]] as const) {
  test(`a half-width card in a ${section} pixel section fits its content`, async ({ page }, info) => {
    await open(page, `?section=${section}&lang=de`);
    const layout = await page.evaluate(() => [...document.querySelectorAll("smart-plants-plant-card")].flatMap(host => {
      const content = host.shadowRoot!.querySelector("smart-plants-plant-card-content");
      const root = content?.shadowRoot;
      if (!root?.querySelector(".foot")) return [];
      const box = (selector: string) => root.querySelector(selector)?.getBoundingClientRect() ?? null;
      const card = root.querySelector("ha-card")!;
      const edge = card.getBoundingClientRect();
      // Anything past the card's edge, except the clipped text of a shortened line.
      const outside: string[] = [];
      const walk = (scope: ShadowRoot) => {
        for (const element of scope.querySelectorAll("*")) {
          const rect = element.getBoundingClientRect();
          if (rect.width && !element.closest(".subtext") && (rect.right > edge.right + 0.5 || rect.left < edge.left - 0.5)) outside.push(element.tagName.toLowerCase());
          if (element.shadowRoot) walk(element.shadowRoot);
        }
      };
      walk(root);
      const last = root.querySelector<HTMLElement>(".last");
      const reason = root.querySelector<HTMLElement>(".reason");
      const sub = root.querySelector<HTMLElement>(".sub");
      const value = root.querySelector("sp-moisture-bar")?.shadowRoot?.querySelector(".value") ?? null;
      return [{
        width: host.getBoundingClientRect().width,
        overflow: card.scrollWidth - card.clientWidth,
        outside,
        lastHeight: last ? last.getBoundingClientRect().height : null,
        lineHeight: last ? parseFloat(getComputedStyle(last).lineHeight) || 20 : null,
        lastBottom: box(".last")?.bottom ?? null,
        lastRight: box(".last")?.right ?? null,
        lastVisible: last ? [...last.querySelectorAll("span")].filter(span => span.getBoundingClientRect().width > 1).map(span => span.textContent).join("") : null,
        lastTitle: last?.title ?? null,
        reasonLines: reason ? reason.getBoundingClientRect().height / (parseFloat(getComputedStyle(reason).lineHeight) || 18) : null,
        reasonTitle: reason?.title ?? null,
        buttonTop: box(".tonal")!.top,
        buttonLeft: box(".tonal")!.left,
        buttonHeight: box(".tonal")!.height,
        subHeight: sub?.getBoundingClientRect().height ?? null,
        subTitle: sub?.title ?? null,
        valueHeight: value ? value.getBoundingClientRect().height : null,
      }];
    }));
    expect(layout.length).toBeGreaterThan(0);
    const desktop = info.project.name !== "mobile";
    for (const card of layout) {
      if (desktop) expect(card.width).toBeLessThanOrEqual(widest);
      else expect(card.width).toBeLessThanOrEqual(180);
      expect(card.overflow).toBeLessThanOrEqual(0);
      expect(card.outside).toEqual([]);
      expect(card.buttonHeight).toBeGreaterThanOrEqual(36);
      // The last watering is one short line beside or above the button.
      if (card.lastHeight !== null) expect(card.lastHeight).toBeLessThan(card.lineHeight! * 1.6);
      if (card.lastBottom !== null) expect(card.lastBottom <= card.buttonTop || card.lastRight! <= card.buttonLeft).toBe(true);
      if (card.reasonLines !== null) expect(card.reasonLines).toBeLessThan(2.5);
      if (card.subHeight !== null) expect(card.subHeight).toBeLessThan(24);
      if (card.valueHeight !== null) expect(card.valueHeight).toBeLessThan(30);
    }
    expect(layout.map(c => c.subTitle)).toContain("Kitchen · Ocimum basilicum");
    // Only the time is visible; the tooltip and screen readers get the sentence.
    expect(layout.map(c => [c.lastVisible, c.lastTitle])).toContainEqual(["Vorgestern", "Zuletzt gegossen: vorgestern"]);
    expect(layout.map(c => c.reasonTitle)).toContain("Bodenfeuchte 12 % liegt unter dem Minimum von 30 %");
    await expect(card(page, "Office Aloe")).toContainText("Ziel 15–60 %");
    await audit(page, info, `card-section-${section}`);
  });
}

test("the masonry card size follows the card's height", async ({ page }) => {
  test.skip(test.info().project.name === "mobile", "Masonry columns are measured at desktop width.");
  // A masonry column is about 400 pixels wide; one unit is 50 pixels.
  await open(page, "?section=816");
  const sizes = await page.evaluate(() => [...document.querySelectorAll("smart-plants-plant-card")].flatMap(host => {
    const card = host.shadowRoot!.querySelector("smart-plants-plant-card-content")?.shadowRoot?.querySelector("ha-card");
    // Cards with every part shown; a paused plant has no readings to show.
    if (!card?.querySelector(".readings") || !card.querySelector(".foot")) return [];
    // The content's own height: the footer's top margin only fills a taller grid row.
    const height = [...card.children].reduce((sum, child) => {
      const style = getComputedStyle(child);
      return sum + child.getBoundingClientRect().height + (child.classList.contains("foot") ? 0 : parseFloat(style.marginTop)) + parseFloat(style.marginBottom);
    }, 2);
    return [{ units: height / 50, size: (host as unknown as { getCardSize(): number }).getCardSize() }];
  }));
  expect(sizes.length).toBe(2);
  for (const { units, size } of sizes) expect(Math.abs(units - size)).toBeLessThanOrEqual(1);
});

test("the card survives a registry swap after the loader ran", async ({ page }, info) => {
  await open(page, "?swap&admin");
  const after = await record(page) as HarnessRecord & { swapped?: boolean; registry?: string };
  expect(after.swapped).toBe(true);
  expect(after.registry).toBe("found");
  const aloe = card(page, "Office Aloe");
  await expect(aloe).toContainText("Healthy");
  await expect(aloe).toContainText("36%");
  await expect(aloe.locator("sp-moisture-bar")).toBeVisible();
  await aloe.getByRole("button", { name: "Log watering for Office Aloe" }).click();
  await expect(page.locator(".toast", { hasText: "Watering logged for Office Aloe" })).toBeVisible();
  expect(await page.evaluate(() => ["sp-status-chip", "sp-moisture-bar", "sp-reading-chip", "smart-plants-plant-card-content"].filter(name => !window.customElements.get(name)))).toEqual([]);
  await audit(page, info, "card-swap");
});
