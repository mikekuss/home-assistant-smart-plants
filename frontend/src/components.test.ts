import { afterEach, describe, expect, it } from "vitest";
import "./components/index.js";
import { createLocalizer } from "./localize.js";
import type { LitElement } from "lit";

const de = createLocalizer({ language: "de" });

type ComponentTag = "sp-status-chip" | "sp-moisture-bar" | "sp-reading-chip" | "sp-plant-avatar" | "sp-empty-state" | "sp-history-chart";
async function mount<K extends ComponentTag>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}): Promise<HTMLElementTagNameMap[K]> {
  const element = document.createElement(tag);
  Object.assign(element, props);
  document.body.append(element);
  await element.updateComplete;
  return element;
}
const text = (element: LitElement) => element.shadowRoot!.textContent!.replace(/\s+/g, " ").trim();
const icon = (element: LitElement) => element.shadowRoot!.querySelector("ha-icon") as (HTMLElement & { icon?: string }) | null;

afterEach(() => { document.body.replaceChildren(); });

describe("sp-status-chip", () => {
  it("shows icon and text for the status", async () => {
    const chip = await mount("sp-status-chip", { status: "needs_water" });
    expect(text(chip)).toBe("Needs water");
    expect(icon(chip)?.icon).toBe("mdi:water-alert");
    expect(icon(chip)?.getAttribute("aria-hidden")).toBe("true");
    expect(chip.getAttribute("status")).toBe("needs_water");
    expect(chip.style.getPropertyValue("--sp-status")).toBe("var(--sp-warning)");
  });
  it("names a specific problem and counts further issues for screen readers", async () => {
    const chip = await mount("sp-status-chip", { status: "problem", label: "Too little light", more: 1 });
    expect(chip.shadowRoot!.querySelector(".label")!.textContent).toBe("Too little light");
    expect(chip.shadowRoot!.querySelector("[aria-hidden='true']:not(ha-icon)")!.textContent).toBe("+1");
    expect(chip.shadowRoot!.querySelector(".sr-only")!.textContent).toBe("and 1 more");
  });
  it("mutes the grey statuses and localizes labels", async () => {
    const chip = await mount("sp-status-chip", { status: "stale", l: de });
    expect(text(chip)).toBe("Keine aktuellen Daten");
    expect(chip.hasAttribute("muted")).toBe(true);
    chip.status = "healthy"; await chip.updateComplete;
    expect(chip.hasAttribute("muted")).toBe(false);
    expect(text(chip)).toBe("Gesund");
  });
});

describe("sp-moisture-bar", () => {
  it("draws the target band, target tick and value with a sentence label", async () => {
    const bar = await mount("sp-moisture-bar", { value: 34, range: { min: 60, target: 70, max: 85 }, state: "low" });
    const track = bar.shadowRoot!.querySelector(".track")!;
    expect(track.getAttribute("role")).toBe("img");
    expect(track.getAttribute("aria-label")).toBe("Soil moisture 34%, target range 60–85%");
    expect((bar.shadowRoot!.querySelector(".band") as HTMLElement).style.left).toBe("60%");
    expect((bar.shadowRoot!.querySelector(".band") as HTMLElement).style.width).toBe("25%");
    expect((bar.shadowRoot!.querySelector(".tick") as HTMLElement).style.left).toBe("70%");
    expect(bar.shadowRoot!.querySelector(".dot")!.classList.contains("low")).toBe(true);
    expect(text(bar)).toContain("Target 60–85%");
    expect(text(bar)).toContain("Dry");
  });
  it("greys out a stale reading and shows its age", async () => {
    const bar = await mount("sp-moisture-bar", { value: 31, range: { min: 15, target: 25, max: 60 }, state: "stale", lastReported: "2026-09-28T03:00:00Z", now: Date.parse("2026-09-28T12:00:00Z") });
    expect(bar.hasAttribute("dimmed")).toBe(true);
    expect(text(bar)).toContain("Last update 9 hours ago");
  });
  it("handles a missing value and a missing range", async () => {
    const bar = await mount("sp-moisture-bar", { value: null, range: null, state: "unavailable" });
    expect(bar.shadowRoot!.querySelector(".track")!.getAttribute("aria-label")).toBe("Soil moisture has no current value");
    expect(bar.shadowRoot!.querySelector(".dot")).toBeNull();
    expect(bar.shadowRoot!.querySelector(".band")).toBeNull();
  });
  it("keeps the dot inside the track at the extremes", async () => {
    const bar = await mount("sp-moisture-bar", { value: 100, range: { min: 30, target: 45, max: 60 } });
    expect((bar.shadowRoot!.querySelector(".dot") as HTMLElement).style.left).toBe("98%");
  });
  it("localizes the label", async () => {
    const bar = await mount("sp-moisture-bar", { value: 34, range: { min: 60, target: 70, max: 85 }, l: de });
    expect(bar.shadowRoot!.querySelector(".track")!.getAttribute("aria-label")).toBe("Bodenfeuchte 34 %, Zielbereich 60–85 %");
  });
});

describe("sp-reading-chip", () => {
  it("shows the value with the role icon and names the role for screen readers", async () => {
    const chip = await mount("sp-reading-chip", { role: "temperature", value: 22.4, unit: "°C", range: { min: 18, max: 28 } });
    expect(text(chip)).toBe("Temperature 22.4 °C");
    expect(icon(chip)?.icon).toBe("mdi:thermometer");
    expect(chip.shadowRoot!.querySelector(".chip")!.getAttribute("title")).toBe("Temperature: 18–28 °C");
  });
  it("marks an out-of-range reading", async () => {
    const chip = await mount("sp-reading-chip", { role: "illuminance", value: 120, unit: "lx", state: "low", range: { min: 500, max: null } });
    expect(chip.getAttribute("state")).toBe("low");
    expect(text(chip)).toContain("outside the target At least 500 lx");
  });
  it("marks a stale reading and a missing value", async () => {
    const chip = await mount("sp-reading-chip", { role: "battery", value: null, unit: "%", state: "stale" });
    expect(text(chip)).toContain("No value");
    expect(text(chip)).toContain("not updating");
  });
});

describe("sp-plant-avatar", () => {
  it("shows the photo with a descriptive alt text", async () => {
    const avatar = await mount("sp-plant-avatar", { src: "blob:photo", name: "Basil" });
    const img = avatar.shadowRoot!.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("blob:photo");
    expect(img.getAttribute("alt")).toBe("Photo of Basil");
  });
  it("reports a photo that cannot be displayed", async () => {
    const avatar = await mount("sp-plant-avatar", { src: "blob:broken", name: "Basil" });
    let fired = 0; document.body.addEventListener("photo-error", () => fired++);
    avatar.shadowRoot!.querySelector("img")!.dispatchEvent(new Event("error"));
    expect(fired).toBe(1);
  });
  it("falls back to a decorative plant icon", async () => {
    const avatar = await mount("sp-plant-avatar", { name: "Aloe", size: "large" });
    expect(avatar.shadowRoot!.querySelector("img")).toBeNull();
    expect(icon(avatar)?.getAttribute("icon")).toBe("mdi:sprout");
    expect(icon(avatar)?.getAttribute("aria-hidden")).toBe("true");
    expect(avatar.getAttribute("size")).toBe("large");
  });
});

describe("sp-empty-state", () => {
  it("renders heading, text and actions", async () => {
    const empty = await mount("sp-empty-state", { heading: "No plants yet" });
    empty.innerHTML = `Add a plant.<button slot="actions">Add plant</button>`;
    await empty.updateComplete;
    expect(empty.shadowRoot!.querySelector("h2")!.textContent).toBe("No plants yet");
    const slots = [...empty.shadowRoot!.querySelectorAll("slot")];
    expect(slots.map(slot => slot.name)).toEqual(["", "actions"]);
    expect(empty.shadowRoot!.querySelector(".art")!.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("sp-history-chart", () => {
  const HOUR = 3_600_000;
  const end = Date.parse("2026-09-28T12:00:00Z");
  const at = (hoursAgo: number, mean: number, spread = 1) => ({ t: end - hoursAgo * HOUR, mean, min: mean - spread, max: mean + spread });
  const points = [at(30, 50), at(29, 49), at(28, 48), at(10, 66), at(9, 65), at(8, 64)];
  const props = { points, start: end - 48 * HOUR, end, periodMs: HOUR, unit: "%", band: { min: 30, max: 70, target: 45 }, markers: [end - 11 * HOUR, end - 100 * HOUR], summary: "Soil moisture, last 7 days", bandLabel: "Target: 30–70%", markerLabel: "Watering logged" };

  it("draws the line with gaps, the target band and markers inside the time range", async () => {
    const chart = await mount("sp-history-chart", props);
    const root = chart.shadowRoot!;
    expect(root.querySelector("svg")!.getAttribute("role")).toBe("img");
    expect(root.querySelector("svg")!.getAttribute("aria-label")).toBe("Soil moisture, last 7 days");
    expect(root.querySelectorAll("path.line")).toHaveLength(2);
    expect(root.querySelectorAll("path.spread")).toHaveLength(2);
    expect(root.querySelectorAll("rect.band")).toHaveLength(1);
    expect(root.querySelectorAll("line.limit")).toHaveLength(3);
    expect(root.querySelectorAll("line.marker")).toHaveLength(1);
    expect(text(chart)).toContain("Target: 30–70%");
    expect(text(chart)).toContain("Watering logged");
    expect(text(chart)).toContain("Lowest to highest value");
  });
  it("reads out a point from the keyboard slider and clears it on blur", async () => {
    const chart = await mount("sp-history-chart", props);
    const slider = chart.shadowRoot!.querySelector<HTMLInputElement>("input[type=range]")!;
    expect(slider.getAttribute("aria-label")).toBe("Point in time");
    expect(slider.max).toBe("5");
    expect(slider.getAttribute("aria-valuetext")).toMatch(/: 64% \(63–65%\)$/);
    slider.value = "0"; slider.dispatchEvent(new Event("input")); await chart.updateComplete;
    expect(slider.getAttribute("aria-valuetext")).toMatch(/: 50% \(49–51%\)$/);
    expect(chart.shadowRoot!.querySelector(".readout")!.textContent).toMatch(/: 50% \(49–51%\)$/);
    expect(chart.shadowRoot!.querySelectorAll(".cursor")).toHaveLength(1);
    slider.dispatchEvent(new Event("blur")); await chart.updateComplete;
    expect(chart.shadowRoot!.querySelectorAll(".cursor")).toHaveLength(0);
  });
  it("omits the spread and the slider when there is nothing to show", async () => {
    const flat = await mount("sp-history-chart", { ...props, points: [at(3, 21, 0), at(2, 21, 0)], unit: "°C", band: null, markers: [], bandLabel: "", l: de });
    expect(flat.shadowRoot!.querySelectorAll("path.spread")).toHaveLength(0);
    expect(flat.shadowRoot!.querySelectorAll("rect.band")).toHaveLength(0);
    expect(flat.shadowRoot!.querySelector("input")!.getAttribute("aria-label")).toBe("Zeitpunkt");
    expect(flat.shadowRoot!.querySelector("input")!.getAttribute("aria-valuetext")).toMatch(/: 21 °C$/);
    const empty = await mount("sp-history-chart", { ...props, points: [] });
    expect(empty.shadowRoot!.querySelector("input")).toBeNull();
    expect(empty.shadowRoot!.querySelectorAll("path.line")).toHaveLength(0);
  });
});
