import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartPlantsPanel } from "./panel.js";
import { notificationMarker } from "./notifications.js";
import type { HAState, PlantRecord } from "./types.js";
import { harness, sample, settle } from "./test-helpers.js";

const office: PlantRecord = { ...sample, id: "plant-2", name: "Office Aloe" };
const state = (entity_id: string, value: string, attributes: Record<string, unknown> = {}): HAState => ({ entity_id, state: value, attributes, last_updated: "2026-10-27T08:00:00+00:00" } as HAState);
const STATES: Record<string, HAState> = {
  "automation.daily": state("automation.daily", "on", { friendly_name: "Smart Plants: daily plant report", id: "1730000000000", last_triggered: "2026-10-27T06:00:00+00:00" }),
  "automation.yaml_water": state("automation.yaml_water", "off", { friendly_name: "Plant water (YAML)" }),
  "automation.lights": state("automation.lights", "on", { friendly_name: "Lights", id: "1730000000001" }),
  "notify.mock_chat": state("notify.mock_chat", "unknown", { friendly_name: "Mock chat" }),
};
const CONFIGS: Record<string, unknown> = {
  "automation.daily": { triggers: [{ trigger: "time", at: "08:00:00", id: "smart_plants_daily_report" }] },
  "automation.yaml_water": { trigger: [{ platform: "smart_plants.needs_water", id: "smart_plants_needs_water" }] },
  "automation.lights": { triggers: [{ trigger: "sun", event: "sunset" }] },
};

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); history.replaceState(null, "", "/"); });

async function mount(options: { states?: Record<string, HAState>; services?: Record<string, Record<string, unknown>>; language?: string } = {}) {
  const h = harness([sample, office], msg => {
    if (msg.type === "automation/config") return { config: CONFIGS[String(msg.entity_id)] ?? {} };
    if (msg.type === "call_service") return {};
    return undefined;
  });
  const subscriptions = new Map<string, () => void>();
  const unsubscribe = vi.fn();
  h.hass.connection.subscribeEvents = async <T,>(callback: (event: T) => void, event: string) => { subscriptions.set(event, () => callback({} as T)); return unsubscribe; };
  h.hass.states = options.states ?? STATES;
  if (options.language) h.hass.language = options.language;
  Object.assign(h.hass, { services: options.services ?? { notify: { send_message: {}, mobile_app_mock_phone: {} } } });
  const el = new SmartPlantsPanel(); el.hass = h.hass; document.body.append(el);
  await settle(el);
  return { el, h, subscriptions, unsubscribe };
}
const root = (el: SmartPlantsPanel) => el.shadowRoot!;
const dialogElement = (el: SmartPlantsPanel) => root(el).querySelector("smart-plants-notifications");
const dialog = (el: SmartPlantsPanel) => dialogElement(el)?.shadowRoot?.querySelector<HTMLDialogElement>("dialog") ?? null;
async function openDialog(el: SmartPlantsPanel) {
  root(el).querySelector(".panel-appbar ha-dropdown")!.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "notifications" } } }));
  await settle(el); await settle(dialogElement(el)!); await settle(dialogElement(el)!);
}
const inside = <T extends Element = HTMLElement>(el: SmartPlantsPanel, selector: string) => dialog(el)!.querySelector<T>(selector);
const all = <T extends Element = HTMLElement>(el: SmartPlantsPanel, selector: string) => [...dialog(el)!.querySelectorAll<T>(selector)];
const buttonNamed = (el: SmartPlantsPanel, name: string) => all<HTMLButtonElement>(el, "button").find(b => b.textContent?.trim() === name)!;
async function change(el: SmartPlantsPanel, input: HTMLInputElement | HTMLSelectElement, value?: string) {
  if (input instanceof HTMLInputElement && (input.type === "radio" || input.type === "checkbox")) input.checked = value === undefined ? !input.checked : value === "on";
  else if (value !== undefined) input.value = value;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await settle(dialogElement(el)!);
}
function captureEditor() {
  const opened: CustomEvent[] = [];
  const handler = (e: Event) => { opened.push(e as CustomEvent); history.pushState(null, "", "/config/automation/edit/new"); };
  window.addEventListener("hass-automation-editor", handler);
  return { opened, stop: () => window.removeEventListener("hass-automation-editor", handler) };
}

describe("notifications dialog", () => {
  it("adds one item to the overview menu and none to the plant page menu", async () => {
    const { el } = await mount();
    const items = [...root(el).querySelectorAll("ha-dropdown-item")].map(item => item.getAttribute("value"));
    expect(items).toEqual(["add-plant", "notifications", "integration-options", "documentation"]);
    expect(root(el).querySelector('ha-dropdown-item[value="notifications"]')!.textContent?.trim()).toBe("Notifications…");
    expect(dialogElement(el)).toBeNull();
  });
  it("opens with the daily report, all plants and the first notify entity chosen", async () => {
    const { el } = await mount();
    await openDialog(el);
    expect(dialog(el)!.open).toBe(true);
    expect(dialogElement(el)!.shadowRoot!.activeElement?.id).toBe("notifications-title");
    expect(inside(el, "h2")!.textContent).toBe("Notifications");
    expect(inside<HTMLInputElement>(el, 'input[name=notification-kind][value="daily_report"]')!.checked).toBe(true);
    expect(inside<HTMLInputElement>(el, "#daily-time")!.value).toBe("08:00");
    expect(inside(el, "#water-delay")).toBeNull();
    expect(inside<HTMLInputElement>(el, 'input[name=notification-plants][value="all"]')!.checked).toBe(true);
    const send = inside<HTMLSelectElement>(el, "#send-to")!;
    expect(send.value).toBe("entity:notify.mock_chat");
    expect([...send.querySelectorAll("optgroup")].map(g => g.label)).toEqual(["Notification entities", "Notification services"]);
    expect([...send.options].map(o => o.textContent?.trim())).toEqual(["Mock chat", "mobile_app_mock_phone", "Home Assistant notification"]);
  });
  it("defaults to Home Assistant's notification when nothing else exists", async () => {
    const { el } = await mount({ states: {}, services: {} });
    await openDialog(el);
    const send = inside<HTMLSelectElement>(el, "#send-to")!;
    expect(send.value).toBe("persistent");
    expect(send.querySelectorAll("optgroup")).toHaveLength(0);
    expect(inside(el, ".existing")).toBeNull();
  });
  it("lists the notification automations made here with on/off, last sent and Edit", async () => {
    const { el, h } = await mount();
    await openDialog(el);
    const reads = h.calls.filter(call => call.type === "automation/config").map(call => call.entity_id).sort();
    expect(reads).toEqual(["automation.daily", "automation.lights", "automation.yaml_water"]);
    const rows = all(el, ".notify-list li");
    expect(rows.map(row => row.querySelector(".row-text span")!.textContent)).toEqual(["Smart Plants: daily plant report", "Plant water (YAML)"]);
    expect(rows[0]!.textContent).toMatch(/Last sent/);
    expect(rows[1]!.textContent).toContain("Not sent yet");
    expect(rows[0]!.querySelector("a")!.getAttribute("href")).toBe("/config/automation/edit/1730000000000");
    // Automations kept in YAML files have no editor id.
    expect(rows[1]!.querySelector("a")).toBeNull();
    const switches = rows.map(row => row.querySelector<HTMLInputElement>("input[role=switch]")!);
    expect(switches.map(s => s.checked)).toEqual([true, false]);
    await change(el, switches[0]!, "off");
    await change(el, switches[1]!, "on");
    expect(h.calls.filter(call => call.type === "call_service")).toEqual([
      { type: "call_service", domain: "automation", service: "turn_off", target: { entity_id: "automation.daily" } },
      { type: "call_service", domain: "automation", service: "turn_on", target: { entity_id: "automation.yaml_water" } },
    ]);
  });
  it("reads the automations again after a reload and stops listening when closed", async () => {
    const { el, h, subscriptions, unsubscribe } = await mount();
    await openDialog(el);
    const before = h.calls.filter(call => call.type === "automation/config").length;
    subscriptions.get("automation_reloaded")!();
    await settle(dialogElement(el)!);
    expect(h.calls.filter(call => call.type === "automation/config").length).toBe(before * 2);
    buttonNamed(el, "Cancel").click();
    await settle(el);
    expect(dialogElement(el)).toBeNull();
    expect(unsubscribe).toHaveBeenCalled();
    expect(root(el).activeElement).toBe(root(el).querySelector(".panel-appbar ha-dropdown [slot=trigger]"));
  });
  it("lets exactly one preset be chosen and shows its own fields", async () => {
    const { el } = await mount();
    await openDialog(el);
    await change(el, inside<HTMLInputElement>(el, 'input[name=notification-kind][value="needs_water"]')!, "on");
    const radios = all<HTMLInputElement>(el, "input[name=notification-kind]");
    expect(radios.filter(r => r.checked).map(r => r.value)).toEqual(["needs_water"]);
    expect(inside(el, "#daily-time")).toBeNull();
    const delay = inside<HTMLSelectElement>(el, "#water-delay")!;
    expect(delay.value).toBe("30");
    expect([...delay.options].map(o => o.textContent)).toEqual(["Right away", "15 minutes", "30 minutes", "1 hour", "2 hours"]);
    expect(inside(el, "#quiet-from")).toBeNull();
    await change(el, all<HTMLInputElement>(el, ".preset-fields input[type=checkbox]")[0]!, "on");
    expect(inside<HTMLInputElement>(el, "#quiet-from")!.value).toBe("22:00");
    expect(inside<HTMLInputElement>(el, "#quiet-to")!.value).toBe("07:00");
  });
  it("opens Home Assistant's editor with the built automation and closes", async () => {
    const { el } = await mount();
    await openDialog(el);
    const editor = captureEditor();
    await change(el, inside<HTMLInputElement>(el, 'input[name=notification-kind][value="needs_water"]')!, "on");
    await change(el, inside<HTMLSelectElement>(el, "#water-delay")!, "60");
    await change(el, all<HTMLInputElement>(el, ".preset-fields input[type=checkbox]")[0]!, "on");
    await change(el, inside<HTMLInputElement>(el, "#quiet-from")!, "23:00");
    await change(el, inside<HTMLSelectElement>(el, "#send-to")!, "service:mobile_app_mock_phone");
    buttonNamed(el, "Open in automation editor").click();
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    await settle(el);
    editor.stop();
    expect(editor.opened).toHaveLength(1);
    const event = editor.opened[0]!;
    expect(event.bubbles && event.composed).toBe(true);
    const data = (event.detail as { data: Record<string, unknown> }).data;
    expect(data.alias).toBe("Smart Plants: plant needs water");
    expect(data.triggers).toEqual([{ trigger: "smart_plants.needs_water", id: "smart_plants_needs_water", options: { behavior: "each", for: { hours: 1 }, include_snoozed: false } }]);
    expect(data.conditions).toEqual([{ condition: "not", conditions: [{ condition: "time", after: "23:00:00", before: "07:00:00" }] }]);
    expect(data.actions).toEqual([{ action: "notify.mobile_app_mock_phone", data: { title: "{{ trigger.plant }} needs water", message: "Water it when you get a chance." } }]);
    expect(dialogElement(el)).toBeNull();
  });
  it("targets the chosen plants and asks for at least one", async () => {
    const { el } = await mount();
    await openDialog(el);
    await change(el, inside<HTMLInputElement>(el, 'input[name=notification-plants][value="choose"]')!, "on");
    const boxes = all<HTMLInputElement>(el, ".plant-choices input");
    expect(all(el, ".plant-choices label").map(l => l.textContent?.trim())).toEqual(["Aloe", "Office Aloe"]);
    const editor = captureEditor();
    buttonNamed(el, "Open in automation editor").click();
    await settle(dialogElement(el)!);
    expect(inside(el, "#plants-error")!.textContent).toBe("Choose at least one plant.");
    expect(dialogElement(el)!.shadowRoot!.activeElement).toBe(boxes[0]);
    await change(el, all<HTMLInputElement>(el, ".plant-choices input")[1]!, "on");
    expect(inside(el, "#plants-error")).toBeNull();
    buttonNamed(el, "Open in automation editor").click();
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    editor.stop();
    const data = (editor.opened[0]!.detail as { data: Record<string, unknown> }).data;
    const marker = notificationMarker("daily_report", ["device-plant-2"]);
    expect(data.triggers).toEqual([{ trigger: "time", at: "08:00:00", id: marker }]);
    expect((data.conditions as Record<string, unknown>[])[0]!.target).toEqual({ device_id: ["device-plant-2"] });
  });
  it("says when the same notification already exists", async () => {
    const { el } = await mount();
    await openDialog(el);
    expect(inside(el, "[role=status]")!.textContent).toBe("You already have this notification.");
    await change(el, inside<HTMLInputElement>(el, 'input[name=notification-plants][value="choose"]')!, "on");
    await change(el, all<HTMLInputElement>(el, ".plant-choices input")[0]!, "on");
    expect(inside(el, "[role=status]")).toBeNull();
    // Creating another one is still allowed.
    expect(buttonNamed(el, "Open in automation editor").disabled).toBe(false);
  });
  it("opens an empty editor and explains why when Home Assistant doesn't take the automation", async () => {
    const { el } = await mount();
    const toasts: string[] = [];
    el.addEventListener("hass-notification", e => toasts.push((e as CustomEvent<{ message: string }>).detail.message));
    await openDialog(el);
    buttonNamed(el, "Open in automation editor").click();
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    expect(location.pathname).toBe("/config/automation/edit/new");
    expect(toasts).toEqual(["The automation editor couldn't be filled in. Add the Smart Plants trigger and a notify action yourself."]);
  });
  it("shows German texts", async () => {
    const { el } = await mount({ language: "de" });
    expect(root(el).querySelector('ha-dropdown-item[value="notifications"]')!.textContent?.trim()).toBe("Benachrichtigungen…");
    await openDialog(el);
    expect(inside(el, "h2")!.textContent).toBe("Benachrichtigungen");
    expect(dialog(el)!.textContent).toContain("Täglicher Pflanzenbericht");
    expect(dialog(el)!.textContent).toContain("Deine Benachrichtigungen");
    expect(buttonNamed(el, "Im Automationseditor öffnen")).toBeDefined();
  });
});
