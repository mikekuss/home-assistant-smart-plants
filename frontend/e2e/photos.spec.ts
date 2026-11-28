import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Plant photos in the packaged artifact: the plant list loads small copies as
// the cards come into view, a few at a time, with a blurred preview until a
// photo is there; the plant page loads the larger copy.
interface PhotoHarness {
  requests: Array<{ method: string; path: string }>;
  unexpected: string[];
  imageMaxInFlight: number;
  pending: Record<string, unknown>;
  release(key: string): void;
}
type HarnessWindow = { __smartPlantsHarness: PhotoHarness };

const url = "/frontend/e2e/harness.html";
const harness = (page: Page) => page.evaluate(() => (window as unknown as HarnessWindow).__smartPlantsHarness);
const photoGets = async (page: Page) => (await harness(page)).requests.filter(r => r.method === "GET").map(r => r.path);
const card = (page: Page, name: string) => page.locator("smart-plants-overview article.card").filter({ has: page.getByRole("button", { name, exact: true }) });

async function audit(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page }).analyze();
  const path = info.outputPath(`axe-${name}.json`);
  await writeFile(path, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, { path, contentType: "application/json" });
  process.stdout.write(`AXE ${info.project.name}/${name}: ${result.passes.length} rule passes; ${result.violations.length} violations; ${result.incomplete.length} incomplete (${result.incomplete.map(r => r.id).join(", ") || "none"})\n`);
  expect(result.violations, `${name}: ${JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
}

test.beforeEach(async ({ page }) => { page.on("pageerror", error => { throw error; }); });
test.afterEach(async ({ page }) => { expect((await harness(page)).unexpected).toEqual([]); });

test("plant photos load as they come into view, as small copies with a blurred preview", async ({ page }, info) => {
  // A short window, so that most of the 13 photos start well below it.
  await page.setViewportSize({ width: 600, height: 500 });
  await page.goto(`${url}?seed&photos&hold=image/GET`);
  await expect(card(page, "Garden Fern")).toBeVisible();
  // The first download is held: its card shows the blurred ThumbHash preview
  // and no image yet.
  await expect.poll(() => page.evaluate(() => Object.hasOwn((window as unknown as HarnessWindow).__smartPlantsHarness.pending, "image/GET"))).toBe(true);
  const previews = () => page.evaluate(() => [...document.querySelector("smart-plants-panel")!.shadowRoot!.querySelector("smart-plants-overview")!.shadowRoot!.querySelectorAll("sp-plant-photo")]
    .filter(photo => !photo.shadowRoot!.querySelector("img") && photo.shadowRoot!.querySelector<HTMLElement>(".tile")!.style.backgroundImage.includes("data:image/svg+xml")).length);
  await expect.poll(previews).toBeGreaterThan(0);
  await page.evaluate(() => (window as unknown as HarnessWindow).__smartPlantsHarness.release("image/GET"));
  const fern = card(page, "Garden Fern").getByAltText("Photo of Garden Fern", { exact: true });
  await expect(fern).toHaveJSProperty("naturalWidth", 160);
  // Only the cards near the window asked for their photos, each the small copy
  // of the current photo.
  await expect.poll(async () => (await photoGets(page)).length).toBeGreaterThan(1);
  const nearby = await photoGets(page);
  expect(nearby.length).toBeLessThan(13);
  expect(nearby.every(path => /\/image\?v=[0-9a-f]{32}&size=thumb$/.test(path))).toBe(true);
  await audit(page, info, "photo-list");
  // Further down, the rest follow, never more than four at a time.
  for (let n = 1; n <= 12; n++) await card(page, `Shelf Fern ${n}`).scrollIntoViewIfNeeded();
  await expect(card(page, "Shelf Fern 12").getByAltText("Photo of Shelf Fern 12", { exact: true })).toHaveJSProperty("naturalWidth", 160);
  await expect.poll(async () => (await photoGets(page)).length).toBe(13);
  expect((await harness(page)).imageMaxInFlight).toBeLessThanOrEqual(4);
  // The plant page asks for the larger copy for its header photo.
  await page.getByRole("button", { name: "Garden Fern", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Garden Fern", level: 2, exact: true })).toBeVisible();
  await expect(page.getByAltText("Photo of Garden Fern", { exact: true })).toHaveJSProperty("naturalWidth", 160);
  expect((await photoGets(page)).at(-1)).toMatch(/&size=thumb2x$/);
  // Back on the list, the photos already loaded stay without a new download.
  const before = (await photoGets(page)).length;
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(fern).toHaveJSProperty("naturalWidth", 160);
  expect((await photoGets(page)).length).toBe(before);
});
