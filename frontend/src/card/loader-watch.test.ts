import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The loader starts its registry watcher when the module runs, so each test
// imports a fresh copy of the module while fake timers are installed.
type Registry = Pick<CustomElementRegistry, "get" | "define">;
type Loader = typeof import("./loader.js");

const native = window.customElements;
const setRegistry = (registry: Registry) => Object.defineProperty(window, "customElements", { value: registry, configurable: true, writable: true });
function fakeRegistry(): { registry: Registry; defined: Map<string, CustomElementConstructor> } {
  const defined = new Map<string, CustomElementConstructor>();
  const registry = {
    get: (name: string) => defined.get(name),
    define: (name: string, cls: CustomElementConstructor) => { defined.set(name, cls); },
  } as Registry;
  return { registry, defined };
}
async function freshLoader(): Promise<Loader> {
  vi.resetModules();
  return import("./loader.js");
}

describe("registry watcher", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setRegistry(native);
  });

  it("defines the card in a swapped registry and stops", async () => {
    const loader = await freshLoader();
    expect(vi.getTimerCount()).toBe(1);
    const { registry, defined } = fakeRegistry();
    setRegistry(registry);
    vi.advanceTimersByTime(loader.REGISTRY_WATCH.intervalMs);
    expect(defined.get(loader.CARD_TYPE)).toBe(loader.SmartPlantsPlantCard);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops looking after the timeout", async () => {
    const loader = await freshLoader();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(loader.REGISTRY_WATCH.timeoutMs + loader.REGISTRY_WATCH.intervalMs);
    expect(vi.getTimerCount()).toBe(0);
    const { registry, defined } = fakeRegistry();
    setRegistry(registry);
    vi.advanceTimersByTime(loader.REGISTRY_WATCH.intervalMs * 10);
    expect(defined.size).toBe(0);
  });

  it("stops when the window is gone", async () => {
    const loader = await freshLoader();
    expect(vi.getTimerCount()).toBe(1);
    vi.stubGlobal("window", undefined);
    expect(() => vi.advanceTimersByTime(loader.REGISTRY_WATCH.intervalMs)).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});
