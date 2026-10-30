import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import { harness, sample, settle } from "./test-helpers.js";

// The dashboard card links admins to /smart-plants/plant/<plant_id>; Home
// Assistant hands the panel the part after its URL as `route`.
async function mount(path: string) {
  history.replaceState(null, "", `/smart-plants${path}`);
  const el = new SmartPlantsPanel();
  el.hass = harness([structuredClone(sample)]).hass;
  el.route = { prefix: "/smart-plants", path };
  document.body.append(el);
  await settle(el); await settle(el);
  return el;
}
const heading = (el: SmartPlantsPanel) => el.shadowRoot!.querySelector("h1")?.textContent?.trim();

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); history.replaceState(null, "", "/"); });

describe("panel deep link", () => {
  it("opens the plant the route names", async () => {
    const el = await mount(`/plant/${sample.id}`);
    expect(heading(el)).toBe("Aloe");
    expect(el.shadowRoot!.querySelector("#tab-overview")?.getAttribute("aria-selected")).toBe("true");
  });
  it("opens the sensors tab", async () => {
    const el = await mount(`/plant/${sample.id}/sensors`);
    expect(el.shadowRoot!.querySelector("#tab-sensors")?.getAttribute("aria-selected")).toBe("true");
  });
  it("stays on the overview for an unknown plant and clears the link", async () => {
    const changed = vi.fn();
    window.addEventListener("location-changed", changed);
    const el = await mount("/plant/unknown");
    window.removeEventListener("location-changed", changed);
    expect(el.shadowRoot!.querySelector("smart-plants-overview")?.hidden).toBe(false);
    expect(location.pathname).toBe("/smart-plants");
    expect(changed).toHaveBeenCalledOnce();
  });
  it("follows a link once and clears it when the plant is left", async () => {
    const el = await mount(`/plant/${sample.id}`);
    // A Home Assistant update hands over a new route object with the same path.
    el.route = { prefix: "/smart-plants", path: `/plant/${sample.id}` };
    await settle(el);
    (el as unknown as { _show(view: { kind: "list" }): void })._show({ kind: "list" });
    await settle(el);
    expect(location.pathname).toBe("/smart-plants");
    el.route = { prefix: "/smart-plants", path: "" };
    await settle(el);
    expect(el.shadowRoot!.querySelector("smart-plants-overview")?.hidden).toBe(false);
    // The same link opens the plant again.
    el.route = { prefix: "/smart-plants", path: `/plant/${sample.id}` };
    await settle(el); await settle(el);
    expect(heading(el)).toBe("Aloe");
  });
});
