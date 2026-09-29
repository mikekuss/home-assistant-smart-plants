import { afterEach, describe, expect, it, vi } from "vitest";
import "./panel.js";
import { SmartPlantsPanel } from "./panel.js";
import { bundleOutdated, loadedBundleVersion } from "./bundle-version.js";
import { api } from "./api.js";
import { capabilities, harness } from "./test-helpers.js";

describe("bundle version", () => {
  it("reads the v query value of the module URL", () => {
    expect(loadedBundleVersion("http://localhost:8123/smart_plants_static/smart-plants-panel.js?v=0.5.0-0123456789abcdef")).toBe("0.5.0-0123456789abcdef");
    expect(loadedBundleVersion("http://localhost:8123/smart_plants_static/smart-plants-panel.js")).toBeNull();
    expect(loadedBundleVersion("http://localhost:8123/smart_plants_static/smart-plants-panel.js?v=")).toBeNull();
    expect(loadedBundleVersion("not a url")).toBeNull();
  });

  it("is outdated only when both versions are known and differ", () => {
    expect(bundleOutdated("0.5.0-aaaa", "0.5.1-bbbb")).toBe(true);
    expect(bundleOutdated("0.5.0-aaaa", "0.5.0-aaaa")).toBe(false);
    expect(bundleOutdated(null, "0.5.1-bbbb")).toBe(false);
    expect(bundleOutdated("0.5.0-aaaa", undefined)).toBe(false);
  });

  it("accepts panel info with or without a bundle version and rejects a malformed one", async () => {
    expect(await api.info(harness([], () => capabilities).hass)).toEqual(capabilities);
    expect((await api.info(harness([], () => ({ ...capabilities, bundle_version: "0.5.1-bbbb" })).hass)).bundle_version).toBe("0.5.1-bbbb");
    await expect(api.info(harness([], () => ({ ...capabilities, bundle_version: 7 })).hass)).rejects.toMatchObject({ code: "version_mismatch" });
  });
});

describe("update banner", () => {
  const original = SmartPlantsPanel.bundleVersion;
  afterEach(() => {
    SmartPlantsPanel.bundleVersion = original;
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  async function mount(running: string | null, served: string | undefined) {
    SmartPlantsPanel.bundleVersion = running;
    const h = harness(undefined, msg => msg.type === "smart_plants/panel/info" ? { ...capabilities, ...(served ? { bundle_version: served } : {}) } : undefined);
    const element = document.createElement("smart-plants-panel");
    element.hass = h.hass;
    document.body.append(element);
    await vi.waitFor(() => expect(h.calls.some(c => c.type === "smart_plants/plants/list")).toBe(true));
    await element.updateComplete;
    return { element, h };
  }
  const banner = (element: Element) => element.shadowRoot?.querySelector(".update-banner");

  it("asks for a reload when Home Assistant serves a newer bundle", async () => {
    const reload = vi.spyOn(SmartPlantsPanel.prototype as unknown as { _reload(): void }, "_reload").mockImplementation(() => undefined);
    const { element } = await mount("0.5.0-aaaa", "0.5.1-bbbb");
    await vi.waitFor(() => expect(banner(element)?.textContent).toContain("Smart Plants was updated"));
    expect(banner(element)?.getAttribute("role")).toBe("status");
    banner(element)!.querySelector("button")!.click();
    expect(reload).toHaveBeenCalledOnce();
  });

  it.each([
    ["matching versions", "0.5.0-aaaa", "0.5.0-aaaa"],
    ["a development build", null, "0.5.0-aaaa"],
    ["an older backend", "0.5.0-aaaa", undefined],
  ] as const)("stays hidden for %s", async (_name, running, served) => {
    const { element } = await mount(running, served);
    await new Promise(resolve => setTimeout(resolve, 20));
    await element.updateComplete;
    expect(banner(element)).toBeNull();
  });
});
