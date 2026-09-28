import { describe, expect, it } from "vitest";
import { isDefined, whenElementsDefined } from "./ha-elements.js";
import type { ElementRegistry } from "./ha-elements.js";

function fakeRegistry(initial: string[]): ElementRegistry & { define(tag: string): void } {
  const defined = new Set(initial);
  const waiting = new Map<string, (() => void)[]>();
  return {
    get: (tag: string) => defined.has(tag) ? (class extends HTMLElement {}) : undefined,
    whenDefined: (tag: string) => defined.has(tag) ? Promise.resolve(class extends HTMLElement {}) : new Promise(resolve => waiting.set(tag, [...(waiting.get(tag) ?? []), () => resolve(class extends HTMLElement {})])),
    define(tag: string) { defined.add(tag); for (const resolve of waiting.get(tag) ?? []) resolve(); waiting.delete(tag); },
  } as ElementRegistry & { define(tag: string): void };
}

describe("Home Assistant element availability", () => {
  it("reports whether an element is registered", () => {
    const registry = fakeRegistry(["ha-card"]);
    expect(isDefined("ha-card", registry)).toBe(true);
    expect(isDefined("ha-alert", registry)).toBe(false);
  });
  it("resolves as soon as every element is defined", async () => {
    const registry = fakeRegistry(["ha-card"]);
    const result = whenElementsDefined(["ha-card", "ha-alert"], 10_000, registry);
    registry.define("ha-alert");
    expect(await result).toEqual({ "ha-card": true, "ha-alert": true });
  });
  it("reports missing elements after the timeout instead of rejecting", async () => {
    const registry = fakeRegistry(["ha-card"]);
    expect(await whenElementsDefined(["ha-card", "ha-tab-group"], 10, registry)).toEqual({ "ha-card": true, "ha-tab-group": false });
  });
});
