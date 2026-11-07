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

async function mount(options: { states?: Record<string, HAState>; services?: Record<string, Record<string, unknown>>; language?: string; entities?: unknown[]; callService?: () => Promise<unknown>; related?: string[] } = {}) {
  const h = harness([sample, office], msg => {
    if (msg.type === "search/related" && options.related) return { automation: options.related };
    if (msg.type === "config/entity_registry/list" && options.entities) return options.entities;
    if (msg.type === "automation/config") return { config: CONFIGS[String(msg.entity_id)] ?? {} };
    if (msg.type === "call_service") return options.callService?.() ?? {};
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
// A menu item's own text, without the count in its details slot.
const itemLabel = (item: Element) => [...item.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join("").trim();
const menuItem = (el: SmartPlantsPanel) => root(el).querySelector('ha-dropdown-item[value="notifications"]')!;
const bell = (el: SmartPlantsPanel) => root(el).querySelector<HTMLElement>("ha-icon-button.header-bell");
async function openPlant(el: SmartPlantsPanel, name: string) {
  const card = el.shadowRoot!.querySelector("smart-plants-overview")!;
  [...card.shadowRoot!.querySelectorAll<HTMLElement>("button, a, [role=button]")].find(b => b.textContent?.includes(name))!.click();
  await settle(el);
}
const dialogElement = (el: SmartPlantsPanel) => root(el).querySelector("smart-plants-notifications");
const dialog = (el: SmartPlantsPanel) => dialogElement(el)?.shadowRoot?.querySelector<HTMLDialogElement>("dialog") ?? null;
const pageElement = (el: SmartPlantsPanel) => root(el).querySelector("smart-plants-notifications-page");
const onPage = <T extends Element = HTMLElement>(el: SmartPlantsPanel, selector: string) => [...pageElement(el)!.shadowRoot!.querySelectorAll<T>(selector)];
const pageButton = (el: SmartPlantsPanel, name: string) => onPage<HTMLButtonElement>(el, "button").find(b => b.textContent?.trim() === name)!;
async function openPage(el: SmartPlantsPanel) {
  root(el).querySelector(".panel-appbar ha-dropdown")!.dispatchEvent(new CustomEvent("wa-select", { detail: { item: { value: "notifications" } } }));
  await settle(el); await settle(pageElement(el)!);
}
// The setup dialog opens from the page's Add notification button.
async function openDialog(el: SmartPlantsPanel) {
  await openPage(el);
  (pageButton(el, "Add notification") ?? pageButton(el, "Set one up")).click();
  await settle(el); await settle(dialogElement(el)!); await settle(dialogElement(el)!);
}
const inside = <T extends Element = HTMLElement>(el: SmartPlantsPanel, selector: string) => dialog(el)!.querySelector<T>(selector);
const all = <T extends Element = HTMLElement>(el: SmartPlantsPanel, selector: string) => [...dialog(el)!.querySelectorAll<T>(selector)];
const buttonNamed = (el: SmartPlantsPanel, name: string) => all<HTMLButtonElement>(el, "button").find(b => b.textContent?.trim() === name)!;
async function change(el: SmartPlantsPanel, input: HTMLInputElement | HTMLSelectElement, value?: string) {
  if (input instanceof HTMLInputElement && (input.type === "radio" || input.type === "checkbox")) input.checked = value === undefined ? !input.checked : value === "on";
  else if (value !== undefined) input.value = value;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await settle(dialogElement(el) ?? pageElement(el)!);
}
function captureEditor() {
  const opened: CustomEvent[] = [];
  const handler = (e: Event) => { opened.push(e as CustomEvent); history.pushState(null, "", "/config/automation/edit/new"); };
  window.addEventListener("hass-automation-editor", handler);
  return { opened, stop: () => window.removeEventListener("hass-automation-editor", handler) };
}

describe("notifications page and dialog", () => {
  it("adds one item to the overview menu", async () => {
    const { el } = await mount();
    const items = [...root(el).querySelectorAll("ha-dropdown-item")].map(item => item.getAttribute("value"));
    // Snooze all plants… shows too: the fixture has two active plants.
    expect(items).toEqual(["add-plant", "notifications", "snooze-all", "integration-options", "documentation"]);
    expect(itemLabel(menuItem(el))).toBe("Notifications");
    expect(dialogElement(el)).toBeNull();
    expect(pageElement(el)).toBeNull();
  });
  it("groups the overview menu and shows how many notifications exist", async () => {
    const { el } = await mount();
    const menu = root(el).querySelector(".panel-appbar ha-dropdown")!;
    const order = [...menu.children].filter(child => child.slot !== "trigger").map(child => child.getAttribute("value") ?? child.tagName.toLowerCase());
    expect(order).toEqual(["add-plant", "wa-divider", "notifications", "snooze-all", "wa-divider", "integration-options", "documentation"]);
    const count = menuItem(el).querySelector(".menu-count")!;
    expect(count.getAttribute("slot")).toBe("details");
    expect(count.textContent).toBe("2");
  });
  it("shows no count and no bell without notifications", async () => {
    const { el } = await mount({ states: { "automation.lights": STATES["automation.lights"]! } });
    expect(menuItem(el).querySelector(".menu-count")).toBeNull();
    expect(bell(el)).toBeNull();
  });
  it("shows a bell without a count that opens the Notifications page", async () => {
    const { el } = await mount();
    const button = bell(el)!;
    expect((button as unknown as { label: string }).label).toBe("Notifications, 2 set up");
    expect((button as unknown as { path: string }).path).toMatch(/^M17\.75 21\.16/);
    expect(root(el).querySelector(".bell-count")).toBeNull();
    button.click(); await settle(el); await settle(pageElement(el)!);
    expect(root(el).querySelector("h1")!.textContent).toBe("Notifications");
    expect(location.pathname).toBe("/smart-plants/notifications");
    // Home Assistant hands the new address back as the route.
    el.route = { prefix: "/smart-plants", path: "/notifications" }; await settle(el);
    expect(root(el).querySelector("h1")!.textContent).toBe("Notifications");
    expect(dialogElement(el)).toBeNull();
    // On the page itself the bell and the overview step aside.
    expect(bell(el)).toBeNull();
    expect(root(el).querySelector("smart-plants-overview")!.hidden).toBe(true);
    root(el).querySelector<HTMLElement>(".panel-appbar .back")!.click(); await settle(el);
    expect(pageElement(el)).toBeNull();
    expect(root(el).querySelector("smart-plants-overview")!.hidden).toBe(false);
    expect(location.pathname).toBe("/smart-plants");
  });
  it("opens the Notifications page from its link and leaves it with Back in the browser", async () => {
    const { el } = await mount();
    el.route = { prefix: "/smart-plants", path: "/notifications" };
    await settle(el); await settle(pageElement(el)!);
    expect(root(el).querySelector("h1")!.textContent).toBe("Notifications");
    expect(onPage(el, ".notify-list li")).toHaveLength(2);
    el.route = { prefix: "/smart-plants", path: "" };
    await settle(el);
    expect(pageElement(el)).toBeNull();
    expect(root(el).querySelector("smart-plants-overview")!.hidden).toBe(false);
  });
  it("hides the bell once the last notification is gone", async () => {
    const { el, h } = await mount();
    expect(bell(el)).not.toBeNull();
    const { "automation.daily": _daily, "automation.yaml_water": _water, ...rest } = STATES;
    h.hass = { ...h.hass, states: rest }; el.hass = h.hass; await settle(el);
    expect(bell(el)).toBeNull();
  });
  it("shows what notifications do and offers one when there are none", async () => {
    const { el } = await mount({ states: { "automation.lights": STATES["automation.lights"]! } });
    await openPage(el);
    expect(onPage(el, ".existing")).toHaveLength(0);
    const empty = onPage(el, ".notify-empty")[0]!;
    expect(empty.querySelector("h2")!.textContent).toBe("No notifications yet");
    expect(empty.textContent).toContain("a daily report or a message as soon as a plant needs water");
    const offer = pageButton(el, "Set one up");
    offer.click(); await settle(el); await settle(dialogElement(el)!); await settle(dialogElement(el)!);
    expect(dialog(el)!.open).toBe(true);
    buttonNamed(el, "Cancel").click(); await settle(el);
    expect(pageElement(el)!.shadowRoot!.activeElement).toBe(offer);
  });
  it("shows which plants each notification is for", async () => {
    const water = notificationMarker("needs_water", ["device-plant-2"]);
    const gone = notificationMarker("daily_report", ["device-removed"]);
    const states = { ...STATES,
      "automation.office": state("automation.office", "on", { friendly_name: "Office water", id: "17300000000002" }),
      "automation.gone": state("automation.gone", "on", { friendly_name: "Old report", id: "17300000000003" }) };
    CONFIGS["automation.office"] = { triggers: [{ trigger: "smart_plants.needs_water", id: water, target: { device_id: ["device-plant-2"] } }] };
    CONFIGS["automation.gone"] = { triggers: [{ trigger: "time", at: "08:00:00", id: gone }], conditions: [{ condition: "smart_plants.needs_attention", target: { device_id: ["device-removed"] } }] };
    try {
      const { el } = await mount({ states });
      await openPage(el);
      const covers = Object.fromEntries(onPage(el, ".notify-list li").map(row => [row.querySelector(".row-text span")!.textContent, row.querySelector(".covers")!.textContent]));
      expect(covers).toEqual({ "Smart Plants: daily plant report": "For all plants", "Plant water (YAML)": "For all plants", "Office water": "For Office Aloe", "Old report": "The chosen plants were removed" });
    } finally { delete CONFIGS["automation.office"]; delete CONFIGS["automation.gone"]; }
  });
  it("opens with the daily report, all plants and the first notify entity chosen", async () => {
    const { el } = await mount();
    await openDialog(el);
    expect(dialog(el)!.open).toBe(true);
    expect(dialogElement(el)!.shadowRoot!.activeElement?.id).toBe("notifications-title");
    expect(inside(el, "h2")!.textContent).toBe("New notification");
    expect(inside(el, ".notify-list")).toBeNull();
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
  });
  it("lists the notification automations made here with on/off, last sent and Edit", async () => {
    const { el, h } = await mount();
    await openPage(el);
    const reads = h.calls.filter(call => call.type === "automation/config").map(call => call.entity_id).sort();
    expect(reads).toEqual(["automation.daily", "automation.lights", "automation.yaml_water"]);
    const rows = onPage(el, ".notify-list li");
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
  it("draws each on/off control as a native switch, disabled while it toggles", async () => {
    let finish!: () => void;
    const { el, h } = await mount({ callService: () => new Promise(resolve => { finish = () => resolve({}); }) });
    await openPage(el);
    const [daily, yaml] = onPage(el, ".notify-list li").map(row => row.querySelector<HTMLInputElement>("input.switch")!);
    expect(daily!.type).toBe("checkbox");
    expect(daily!.getAttribute("role")).toBe("switch");
    expect(daily!.getAttribute("aria-label")).toBe("Smart Plants: daily plant report");
    const described = pageElement(el)!.shadowRoot!.getElementById(daily!.getAttribute("aria-describedby")!);
    expect(described!.textContent).toMatch(/^Last sent/);
    expect(daily!.disabled).toBe(false);
    await change(el, daily!, "off");
    expect(daily!.disabled).toBe(true);
    // Another row stays usable, and a second change of the busy row sends nothing.
    expect(yaml!.disabled).toBe(false);
    daily!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(h.calls.filter(call => call.type === "call_service")).toHaveLength(1);
    finish();
    await settle(pageElement(el)!);
    expect(daily!.disabled).toBe(false);
  });
  it("disables the switch of an unavailable automation", async () => {
    const { el } = await mount({ states: { ...STATES, "automation.yaml_water": state("automation.yaml_water", "unavailable", { friendly_name: "Plant water (YAML)" }) } });
    await openPage(el);
    const switches = onPage<HTMLInputElement>(el, ".notify-list input.switch");
    expect(switches.map(s => s.disabled)).toEqual([false, true]);
  });
  it("reads the automations once, again after a reload, and stops listening when the panel goes", async () => {
    const { el, h, subscriptions, unsubscribe } = await mount();
    const reads = () => h.calls.filter(call => call.type === "automation/config").length;
    const before = reads();
    expect(before).toBe(3);
    // Opening the dialog and rendering again use what the panel already read.
    await openDialog(el);
    el.requestUpdate(); await settle(el);
    expect(reads()).toBe(before);
    subscriptions.get("automation_reloaded")!();
    await settle(el); await settle(dialogElement(el)!);
    expect(reads()).toBe(before * 2);
    buttonNamed(el, "Cancel").click();
    await settle(el);
    expect(dialogElement(el)).toBeNull();
    expect(pageElement(el)!.shadowRoot!.activeElement).toBe(pageButton(el, "Add notification"));
    expect(unsubscribe).not.toHaveBeenCalled();
    el.remove();
    expect(unsubscribe).toHaveBeenCalled();
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
  it("names all plants through the All plants entity when Home Assistant has it", async () => {
    const allPlants = { id: "all", entity_id: "binary_sensor.smart_plants_all_plants", device_id: null, unique_id: "smart_plants:all_plants", platform: "smart_plants" };
    const { el } = await mount({ entities: [allPlants] });
    await openDialog(el);
    const editor = captureEditor();
    buttonNamed(el, "Open in automation editor").click();
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    await settle(el);
    editor.stop();
    const data = (editor.opened[0]!.detail as { data: Record<string, unknown> }).data;
    const target = { entity_id: ["binary_sensor.smart_plants_all_plants"] };
    expect((data.triggers as Record<string, unknown>[])[0]!.id).toBe("smart_plants_daily_report");
    expect((data.conditions as Record<string, unknown>[])[0]!.target).toEqual(target);
    expect((data.actions as Record<string, unknown>[])[0]!.target).toEqual(target);
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
    expect(itemLabel(menuItem(el))).toBe("Benachrichtigungen");
    expect((bell(el) as unknown as { label: string }).label).toBe("Benachrichtigungen, 2 eingerichtet");
    await openPage(el);
    expect(root(el).querySelector("h1")!.textContent).toBe("Benachrichtigungen");
    expect(pageElement(el)!.shadowRoot!.textContent).toContain("Deine Benachrichtigungen");
    expect(pageButton(el, "Benachrichtigung hinzufügen")).toBeDefined();
    pageButton(el, "Benachrichtigung hinzufügen").click();
    await settle(el); await settle(dialogElement(el)!); await settle(dialogElement(el)!);
    expect(inside(el, "h2")!.textContent).toBe("Neue Benachrichtigung");
    expect(dialog(el)!.textContent).toContain("Täglicher Pflanzenbericht");
    expect(buttonNamed(el, "Im Automatisierungseditor öffnen")).toBeDefined();
  });
});

describe("notifications from the plant page", () => {
  it("opens the Notifications page from the plant page menu and goes back to the plant", async () => {
    const { el } = await mount();
    await openPlant(el, "Office Aloe");
    expect(itemLabel(menuItem(el))).toBe("Notifications");
    const menu = root(el).querySelector(".panel-appbar ha-dropdown")!;
    const order = [...menu.children].filter(child => child.slot !== "trigger").map(child => child.getAttribute("value") ?? child.tagName.toLowerCase());
    expect(order).toEqual(["notifications", "snooze", "wa-divider", "open-device", "download-diagnostics", "wa-divider", "toggle-monitoring", "retire-plant", "delete-plant"]);
    expect(menu.querySelector('[value="snooze"] ha-icon')!.getAttribute("icon")).toBe("mdi:alarm-snooze");
    await openPage(el);
    expect(root(el).querySelector("h1")!.textContent).toBe("Notifications");
    root(el).querySelector<HTMLElement>(".panel-appbar .back")!.click(); await settle(el);
    expect(root(el).querySelector("h1")!.textContent).toBe("Office Aloe");
  });

  it("offers notifications in the Automations card while the plant has none", async () => {
    const { el } = await mount({ states: {} });
    const card = el.shadowRoot!.querySelector("smart-plants-overview")!;
    [...card.shadowRoot!.querySelectorAll<HTMLElement>("button, a, [role=button]")].find(b => b.textContent?.includes("Office Aloe"))!.click();
    await settle(el);
    const offer = [...root(el).querySelectorAll<HTMLButtonElement>("section[aria-labelledby=automations-heading] button")].find(b => b.textContent?.trim() === "Set up notifications")!;
    offer.focus(); offer.click(); await settle(el); await settle(dialogElement(el)!); await settle(dialogElement(el)!);
    expect(dialog(el)!.open).toBe(true);
    expect(all<HTMLInputElement>(el, ".plant-choices input").map(input => input.checked)).toEqual([false, true]);
    buttonNamed(el, "Cancel").click(); await settle(el);
    expect(root(el).activeElement).toBe(offer);
  });

  it("keeps Set up notifications next to listed automations and marks the notifications", async () => {
    const { el } = await mount({ related: ["automation.daily", "automation.lights"] });
    await openPlant(el, "Office Aloe");
    await settle(el); await settle(el);
    const card = root(el).querySelector("section[aria-labelledby=automations-heading]")!;
    const rows = [...card.querySelectorAll(".rel li")];
    expect(rows.map(row => row.querySelector(".li-title")!.textContent)).toEqual(["Lights", "Smart Plants: daily plant report"]);
    expect(rows.map(row => row.querySelector(".ic ha-icon")!.getAttribute("icon"))).toEqual(["mdi:robot", "mdi:bell-outline"]);
    expect(rows[1]!.querySelector(".li-sub")!.textContent).toMatch(/^Notification · Last ran/);
    expect(rows[0]!.querySelector(".rel-kind")).toBeNull();
    expect([...card.querySelectorAll("button")].some(b => b.textContent?.trim() === "Set up notifications")).toBe(true);
  });

  it("opens the new plant with the dialog from the wizard's confirmation", async () => {
    const { el } = await mount();
    root(el).querySelector("smart-plants-overview")!.dispatchEvent(new CustomEvent("add-plant"));
    await settle(el);
    root(el).querySelector("smart-plants-wizard")!.dispatchEvent(new CustomEvent("wizard-notifications", { detail: { plantId: office.id }, bubbles: true, composed: true }));
    await settle(el); await settle(dialogElement(el)!); await settle(dialogElement(el)!);
    expect(root(el).querySelector("h1")!.textContent).toBe("Office Aloe");
    expect(dialog(el)!.open).toBe(true);
    expect(all<HTMLInputElement>(el, ".plant-choices input").map(input => input.checked)).toEqual([false, true]);
  });

  it("says when a switch could not be changed and shows the automation's state again", async () => {
    const { el } = await mount({ callService: () => Promise.reject({ code: "home_assistant_error", message: "Automation is busy." }) });
    await openPage(el);
    const daily = onPage(el, ".notify-list li")[0]!.querySelector<HTMLInputElement>("input.switch")!;
    await change(el, daily, "off");
    await settle(pageElement(el)!);
    expect(daily.checked).toBe(true);
    const error = onPage(el, ".notify-list li")[0]!.querySelector("[role=alert]");
    expect(error?.textContent).toBe("Smart Plants: daily plant report couldn't be turned off: Automation is busy.");
  });
});
