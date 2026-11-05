import { describe, expect, it } from "vitest";
import { ICON_PREFIX, LOGO_PATH, SIDEBAR_ICON, registerSidebarIcon } from "./sidebar-icon.js";
import "./loader.js";

describe("sidebar icon", () => {
  it("is registered by the always-loaded card module", async () => {
    const sets = (window as unknown as { customIcons?: Record<string, { getIcon(name: string): Promise<{ path: string }> }> }).customIcons;
    expect(SIDEBAR_ICON).toBe("smart-plants:logo");
    expect((await sets![ICON_PREFIX]!.getIcon("logo")).path).toBe(LOGO_PATH);
  });

  it("returns an empty path for unknown names", async () => {
    const target: { customIcons?: Record<string, { getIcon(name: string): Promise<{ path: string }> }> } = {};
    registerSidebarIcon(target);
    expect((await target.customIcons![ICON_PREFIX]!.getIcon("other")).path).toBe("");
  });

  it("keeps other icon sets and an earlier registration", async () => {
    const earlier = { getIcon: async () => ({ path: "M0 0Z" }) };
    const other = { getIcon: async () => ({ path: "M1 1Z" }) };
    const target = { customIcons: { [ICON_PREFIX]: earlier, other } };
    registerSidebarIcon(target);
    expect(target.customIcons[ICON_PREFIX]).toBe(earlier);
    expect(target.customIcons.other).toBe(other);
  });

  it("is a single path on the 24 px grid", () => {
    expect(LOGO_PATH).toMatch(/^M[\d.\sCLQZM]+Z$/);
    const numbers = LOGO_PATH.match(/\d+(\.\d+)?/g)!.map(Number);
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(24);
  });
});
