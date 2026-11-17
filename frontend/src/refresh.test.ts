import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import type { HAState, HomeAssistantLike } from "./types.js";
import { harness, sample, settle } from "./test-helpers.js";

const REGISTRY_READS = ["config/area_registry/list", "config/entity_registry/list", "config/device_registry/list", "get_states"];
const STATES: Record<string, HAState> = { "sensor.mock_moisture": { entity_id: "sensor.mock_moisture", state: "40", attributes: {}, last_updated: "2026-10-27T08:00:00+00:00" } as HAState };

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

// Mounts the panel and returns its regular refresh, as the panel schedules it.
async function mount(options: { subscribe?: boolean; states?: boolean } = {}) {
  const h = harness([structuredClone(sample)]);
  const listeners = new Map<string, () => void>();
  if (options.subscribe !== false) h.hass.connection.subscribeEvents = (async <T,>(callback: (event: T) => void, event: string) => { listeners.set(event, () => callback({} as T)); return () => undefined; }) as NonNullable<HomeAssistantLike["connection"]["subscribeEvents"]>;
  if (options.states !== false) h.hass.states = STATES;
  const interval = vi.spyOn(window, "setInterval");
  const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
  await settle(el); await settle(el);
  const tick = interval.mock.calls.find(([, delay]) => delay === 30_000)![0] as () => void;
  const types = () => h.calls.map(call => call.type as string);
  return { el, h, listeners, tick, types };
}

describe("regular refresh", () => {
  it("reads the plants every 30 seconds but not the registries or all states", async () => {
    const { el, h, tick, types } = await mount();
    // The first read takes the registries; the states come with hass.
    expect(types()).toEqual(expect.arrayContaining(REGISTRY_READS.slice(0, 3)));
    expect(types()).not.toContain("get_states");
    h.calls.length = 0;
    tick(); await settle(el); await settle(el);
    expect(types()).toEqual(expect.arrayContaining(["smart_plants/panel/info", "smart_plants/plants/list", "smart_plants/plants/overview"]));
    expect(types().filter(type => REGISTRY_READS.includes(type))).toEqual([]);
  });

  it("reads the registries again when one of them changes and after a reconnect", async () => {
    const { el, h, listeners, types } = await mount();
    h.calls.length = 0;
    listeners.get("entity_registry_updated")!(); await settle(el); await settle(el);
    expect(types()).toEqual(expect.arrayContaining(REGISTRY_READS.slice(0, 3)));
    h.calls.length = 0;
    h.events.get("ready")!(); await settle(el); await settle(el);
    expect(types()).toEqual(expect.arrayContaining(REGISTRY_READS.slice(0, 3)));
  });

  it("keeps reading the registries when their events cannot be subscribed", async () => {
    const { el, h, tick, types } = await mount({ subscribe: false, states: false });
    h.calls.length = 0;
    tick(); await settle(el); await settle(el);
    // Without hass.states the states are read too.
    expect(types()).toEqual(expect.arrayContaining(REGISTRY_READS));
  });

  it("skips a hidden tab and reads once it is shown again", async () => {
    const { el, h, tick, types } = await mount();
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    h.calls.length = 0;
    tick(); await settle(el);
    expect(types()).toEqual([]);
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange")); await settle(el); await settle(el);
    expect(types()).toContain("smart_plants/plants/list");
    expect(types().filter(type => REGISTRY_READS.includes(type))).toEqual([]);
    // Once the panel is gone, showing the tab reads nothing.
    el.remove(); h.calls.length = 0;
    document.dispatchEvent(new Event("visibilitychange")); await settle(el);
    expect(types()).toEqual([]);
  });

  it("reads the registries on the next refresh when a newer read replaced a pending one", async () => {
    const { el, h, listeners, tick, types } = await mount();
    h.calls.length = 0;
    // A registry change starts a full read; the regular refresh starts before its registries arrive.
    listeners.get("device_registry_updated")!();
    (el as unknown as { _loading: boolean })._loading = false;
    tick(); await settle(el); await settle(el);
    expect(types().filter(type => type === "config/device_registry/list").length).toBeGreaterThanOrEqual(1);
    h.calls.length = 0;
    tick(); await settle(el); await settle(el);
    expect(types().filter(type => REGISTRY_READS.includes(type))).toEqual([]);
  });
});
