import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { createLocalizer, ENGLISH } from "./localize.js";
import { allPlantsEntityId, buildNotification, configMarker, findNotifications, notificationMarker, notifyTargets, openAutomationEditor, sha256Hex } from "./notifications.js";
import type { NotificationInput } from "./notifications.js";
import type { HAEntity, HAState, HomeAssistantLike } from "./types.js";

const DE = createLocalizer({ language: "de" });
const DEVICES = ["0123456789abcdef0123456789abcdef", "fedcba9876543210fedcba9876543210"];
const state = (entity_id: string, attributes: Record<string, unknown> = {}, value = "on"): HAState => ({ entity_id, state: value, attributes, last_updated: "2026-10-27T08:00:00+00:00" } as HAState);
const daily: NotificationInput = { kind: "daily_report", time: "08:00", delayMinutes: 30, quiet: null, plantDeviceIds: null, allPlantsEntityId: null, target: { kind: "entity", entityId: "notify.mock_chat", label: "Mock chat" } };
const water: NotificationInput = { kind: "needs_water", time: "08:00", delayMinutes: 30, quiet: { from: "22:00", to: "07:00" }, plantDeviceIds: [DEVICES[1]!, DEVICES[0]!], allPlantsEntityId: null, target: { kind: "service", service: "mobile_app_mock_phone", label: "mobile_app_mock_phone" } };

// The two example automations shared with the backend tests, which validate
// them against the real trigger, condition and action platforms.
const FIXTURES = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/notification_automations");
const fixture = (name: string) => parse(readFileSync(resolve(FIXTURES, `${name}.yaml`), "utf8")) as Record<string, unknown>;
const GOLDEN_DAILY = fixture("daily_report");
const GOLDEN_WATER = fixture("needs_water");
// The example uses a placeholder hash; the real one depends on the device ids.
const withMarker = (config: Record<string, unknown>, id: string) => ({ ...config, triggers: (config.triggers as Record<string, unknown>[]).map((t, i) => i === 0 ? { ...t, id } : t) });

afterEach(() => { vi.restoreAllMocks(); });

describe("SHA-256", () => {
  it("matches the standard test vectors and Node's implementation", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
    for (const text of ["Gieß", "x".repeat(55), "x".repeat(56), "x".repeat(64), "y".repeat(200), DEVICES.join(",")]) {
      expect(sha256Hex(text)).toBe(createHash("sha256").update(text).digest("hex"));
    }
  });
});

describe("notification marker", () => {
  it("is the preset alone for all plants and adds a hash of the sorted device ids for chosen ones", () => {
    expect(notificationMarker("daily_report", null)).toBe("smart_plants_daily_report");
    expect(notificationMarker("needs_water", null)).toBe("smart_plants_needs_water");
    const hash = createHash("sha256").update(DEVICES.join(",")).digest("hex").slice(0, 8);
    expect(notificationMarker("needs_water", DEVICES)).toBe(`smart_plants_needs_water_${hash}`);
    expect(notificationMarker("needs_water", [...DEVICES].reverse())).toBe(`smart_plants_needs_water_${hash}`);
    expect(notificationMarker("daily_report", [DEVICES[0]!])).toMatch(/^smart_plants_daily_report_[0-9a-f]{8}$/);
  });
});

describe("automation config", () => {
  it("builds the daily report for all plants exactly like the shared example", () => {
    expect(buildNotification(daily, ENGLISH)).toEqual(GOLDEN_DAILY);
  });
  it("builds the needs-water message for chosen plants with quiet hours exactly like the shared example", () => {
    const config = buildNotification(water, ENGLISH);
    expect(config).toEqual(withMarker(GOLDEN_WATER, notificationMarker("needs_water", DEVICES)));
  });
  it("names all plants through the All plants entity in the trigger, condition and action", () => {
    const allPlants = "binary_sensor.smart_plants_all_plants";
    const target = { entity_id: [allPlants] };
    const report = buildNotification({ ...daily, allPlantsEntityId: allPlants }, ENGLISH);
    expect(report.triggers).toEqual([{ trigger: "time", at: "08:00:00", id: "smart_plants_daily_report" }]);
    expect((report.conditions as Record<string, unknown>[])[0]!.target).toEqual(target);
    expect((report.actions as Record<string, unknown>[])[0]!.target).toEqual(target);
    const config = buildNotification({ ...water, plantDeviceIds: null, allPlantsEntityId: allPlants }, ENGLISH);
    expect((config.triggers as Record<string, unknown>[])[0]).toEqual({ trigger: "smart_plants.needs_water", id: "smart_plants_needs_water", target, options: { behavior: "each", for: { minutes: 30 }, include_snoozed: false } });
    // Chosen plants keep their device target.
    expect((buildNotification({ ...water, allPlantsEntityId: allPlants }, ENGLISH).triggers as Record<string, unknown>[])[0]!.target).toEqual({ device_id: DEVICES });
  });
  it("finds the All plants entity by unique id and leaves it out when it is missing or disabled", () => {
    const entry = (entity_id: string, extra: Partial<HAEntity> = {}): HAEntity => ({ id: entity_id, entity_id, device_id: null, unique_id: "smart_plants:all_plants", platform: "smart_plants", ...extra });
    expect(allPlantsEntityId([entry("binary_sensor.renamed_all_plants")])).toBe("binary_sensor.renamed_all_plants");
    expect(allPlantsEntityId([entry("binary_sensor.smart_plants_all_plants", { disabled_by: "user" })])).toBeNull();
    expect(allPlantsEntityId([entry("binary_sensor.other", { platform: "template" })])).toBeNull();
    expect(allPlantsEntityId([])).toBeNull();
  });
  it("targets chosen plants in the report condition and action", () => {
    const config = buildNotification({ ...daily, plantDeviceIds: [DEVICES[1]!, DEVICES[0]!] }, ENGLISH);
    const target = { device_id: DEVICES };
    expect((config.triggers as unknown[])[0]).toEqual({ trigger: "time", at: "08:00:00", id: notificationMarker("daily_report", DEVICES) });
    expect((config.conditions as Record<string, unknown>[])[0]!.target).toEqual(target);
    expect((config.actions as Record<string, unknown>[])[0]!.target).toEqual(target);
  });
  it("sends to each kind of target", () => {
    const send = (target: NotificationInput["target"], kind: NotificationInput["kind"] = "daily_report") => (buildNotification({ ...daily, kind, target }, ENGLISH).actions as unknown[]).at(-1);
    expect(send({ kind: "service", service: "mobile_app_mock_phone", label: "x" })).toEqual({ action: "notify.mobile_app_mock_phone", data: { title: "{{ report.title }}", message: "{{ report.message }}" } });
    expect(send({ kind: "persistent" })).toEqual({ action: "persistent_notification.create", data: { title: "{{ report.title }}", message: "{{ report.message }}", notification_id: "smart_plants_daily_report" } });
    expect(send({ kind: "persistent" }, "needs_water")).toEqual({ action: "persistent_notification.create", data: { title: "{{ trigger.plant }} needs water", message: "Water it when you get a chance.", notification_id: "smart_plants_needs_water_{{ trigger.device_id }}" } });
    expect(send({ kind: "entity", entityId: "notify.mock_chat", label: "x" }, "needs_water")).toEqual({ action: "notify.send_message", target: { entity_id: "notify.mock_chat" }, data: { title: "{{ trigger.plant }} needs water", message: "Water it when you get a chance." } });
  });
  it("gives each plant its own Home Assistant notification for needs water and keeps one daily report", () => {
    const id = (kind: NotificationInput["kind"]) => {
      const send = (buildNotification({ ...daily, kind, target: { kind: "persistent" } }, ENGLISH).actions as Array<{ data: Record<string, unknown> }>).at(-1)!;
      return send.data.notification_id;
    };
    expect(id("needs_water")).toBe("smart_plants_needs_water_{{ trigger.device_id }}");
    expect(id("daily_report")).toBe("smart_plants_daily_report");
  });
  it("leaves out quiet hours, the target and the delay when they are not set", () => {
    const config = buildNotification({ ...water, quiet: null, plantDeviceIds: null, delayMinutes: 0 }, ENGLISH);
    expect(config.conditions).toEqual([]);
    expect(config.triggers).toEqual([{ trigger: "smart_plants.needs_water", id: "smart_plants_needs_water", options: { behavior: "each", include_snoozed: false } }]);
    expect(config.description).toBe("Created in Smart Plants → Notifications. Sends a message when a plant needs water. Snoozed plants send theirs when the snooze ends.");
  });
  it("writes whole hours as hours and names the delay in the description", () => {
    const config = buildNotification({ ...water, delayMinutes: 120 }, ENGLISH);
    expect(((config.triggers as Record<string, unknown>[])[0]!.options as Record<string, unknown>).for).toEqual({ hours: 2 });
    expect(config.description).toContain("for 2 hours.");
    expect(buildNotification({ ...water, delayMinutes: 60 }, DE).description).toContain("seit 1 Stunde Wasser braucht");
    expect(buildNotification({ ...water, delayMinutes: 15 }, ENGLISH).description).toContain("for 15 minutes.");
    expect(buildNotification({ ...daily, time: "21:30" }, ENGLISH).triggers).toEqual([{ trigger: "time", at: "21:30:00", id: "smart_plants_daily_report" }]);
  });
  it("uses the German texts in German", () => {
    const report = buildNotification(daily, DE);
    expect(report.alias).toBe("Smart Plants: täglicher Pflanzenbericht");
    expect(report.description).toBe("Erstellt in Smart Plants → Benachrichtigungen. Schickt eine kurze Liste der Pflanzen, die Wasser brauchen, Probleme oder fällige Pflegeaufgaben haben.");
    const config = buildNotification(water, DE);
    expect(config.alias).toBe("Smart Plants: Pflanze braucht Wasser");
    expect(config.description).toBe("Erstellt in Smart Plants → Benachrichtigungen. Schickt eine Nachricht, wenn eine Pflanze seit 30 Minuten Wasser braucht. Stummgeschaltete Pflanzen melden sich, wenn die Stummschaltung endet.");
    expect((config.actions as unknown[])[0]).toEqual({ action: "notify.mobile_app_mock_phone", data: { title: "{{ trigger.plant }} braucht Wasser", message: "Gieß sie, wenn du dazu kommst." } });
  });
});

describe("notify targets", () => {
  it("lists notify entities, then legacy services, then Home Assistant's notification", () => {
    const states = { "notify.mock_mail": state("notify.mock_mail", { friendly_name: "Mail" }, "unknown"), "notify.mock_chat": state("notify.mock_chat", { friendly_name: "Chat" }, "unknown"), "notify.bare": state("notify.bare", {}, "unknown"), "sensor.mock_soil": state("sensor.mock_soil") };
    const services = { notify: { send_message: {}, notify: {}, persistent_notification: {}, mobile_app_mock_tablet: {}, mobile_app_mock_phone: {} }, light: { turn_on: {} } };
    expect(notifyTargets(states, services)).toEqual([
      { kind: "entity", entityId: "notify.mock_chat", label: "Chat" },
      { kind: "entity", entityId: "notify.mock_mail", label: "Mail" },
      { kind: "entity", entityId: "notify.bare", label: "notify.bare" },
      { kind: "service", service: "mobile_app_mock_phone", label: "mobile_app_mock_phone" },
      { kind: "service", service: "mobile_app_mock_tablet", label: "mobile_app_mock_tablet" },
      { kind: "persistent" },
    ]);
  });
  it("always offers Home Assistant's notification", () => {
    expect(notifyTargets({}, undefined)).toEqual([{ kind: "persistent" }]);
    expect(notifyTargets({}, { notify: { send_message: {}, notify: {}, persistent_notification: {} } })).toEqual([{ kind: "persistent" }]);
  });
});

describe("finding notification automations", () => {
  it("keeps automations with a Smart Plants trigger id", () => {
    expect(configMarker({ triggers: [{ trigger: "time", id: "morning" }, { trigger: "state", id: "smart_plants_needs_water_1a2b3c4d" }] })).toBe("smart_plants_needs_water_1a2b3c4d");
    expect(configMarker({ trigger: [{ platform: "time", id: "smart_plants_daily_report" }] })).toBe("smart_plants_daily_report");
    expect(configMarker({ trigger: { platform: "time", id: "smart_plants_daily_report" } })).toBe("smart_plants_daily_report");
    expect(configMarker({ triggers: [{ trigger: "time", id: "plants_daily" }, { trigger: "time" }] })).toBeNull();
    expect(configMarker({ triggers: [{ trigger: "time", id: 5 }] })).toBeNull();
    expect(configMarker(null)).toBeNull();
  });
  it("reads at most eight configs at a time and skips the ones that fail", async () => {
    let running = 0; let peak = 0;
    const ids = Array.from({ length: 20 }, (_, i) => `automation.mock_${i}`);
    const send = vi.fn(async (msg: Record<string, unknown>) => {
      running++; peak = Math.max(peak, running);
      await new Promise(resolve => setTimeout(resolve, 1));
      running--;
      const index = Number(String(msg.entity_id).split("_").at(-1));
      if (index === 3) throw new Error("not found");
      return { config: { triggers: [{ trigger: "time", id: index % 2 ? "smart_plants_daily_report" : "other" }] } } as never;
    });
    const hass: HomeAssistantLike = { connection: { sendMessagePromise: send } };
    const found = await findNotifications(hass, ids);
    expect(peak).toBe(8);
    expect(send).toHaveBeenCalledTimes(20);
    expect(send).toHaveBeenCalledWith({ type: "automation/config", entity_id: "automation.mock_1" });
    expect(found.map(item => item.entityId)).toEqual(["automation.mock_1", "automation.mock_5", "automation.mock_7", "automation.mock_9", "automation.mock_11", "automation.mock_13", "automation.mock_15", "automation.mock_17", "automation.mock_19"]);
    expect(await findNotifications(hass, [])).toEqual([]);
  });
});

describe("opening the automation editor", () => {
  it("hands the config to Home Assistant with an event that leaves the shadow root", async () => {
    const host = document.createElement("div"); document.body.append(host);
    const root = host.attachShadow({ mode: "open" }); const source = document.createElement("button"); root.append(source);
    const received: CustomEvent[] = [];
    const handler = (e: Event) => { received.push(e as CustomEvent); history.pushState(null, "", "/config/automation/edit/new"); };
    window.addEventListener("hass-automation-editor", handler);
    const fallback = vi.fn();
    openAutomationEditor(source, { alias: "x" }, fallback);
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    window.removeEventListener("hass-automation-editor", handler);
    expect(received).toHaveLength(1);
    expect(received[0]!.bubbles && received[0]!.composed).toBe(true);
    expect(received[0]!.detail).toEqual({ data: { alias: "x" } });
    expect(fallback).not.toHaveBeenCalled();
    host.remove(); history.replaceState(null, "", "/");
  });
  it("opens an empty editor when nothing handles the event", async () => {
    history.replaceState(null, "", "/smart-plants");
    const changed = vi.fn(); window.addEventListener("location-changed", changed);
    const fallback = vi.fn();
    openAutomationEditor(document.body, { alias: "x" }, fallback);
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    window.removeEventListener("location-changed", changed);
    expect(location.pathname).toBe("/config/automation/edit/new");
    expect(changed).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(1);
    history.replaceState(null, "", "/");
  });
});
