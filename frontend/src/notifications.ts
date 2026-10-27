// Notification setup: builds the automation Home Assistant's own editor opens
// prefilled, lists the places a message can go, and finds the automations made
// this way. Nothing here saves an automation; the user does that in the editor.
import type { Localizer } from "./localize.js";
import type { HAState, HomeAssistantLike } from "./types.js";

export type NotificationKind = "daily_report" | "needs_water";
export type NotifyTarget =
  | { kind: "entity"; entityId: string; label: string }
  | { kind: "service"; service: string; label: string }
  | { kind: "persistent" };

export interface NotificationInput {
  kind: NotificationKind;
  // "HH:MM" in Home Assistant's time zone.
  time: string;
  delayMinutes: number;
  quiet: { from: string; to: string } | null;
  // Plant device ids, or null for all plants (including plants added later).
  plantDeviceIds: string[] | null;
  target: NotifyTarget;
}

export type AutomationConfig = Record<string, unknown>;

export const DELAY_CHOICES = [0, 15, 30, 60, 120] as const;
export const MARKER_PREFIX = "smart_plants_";
const REPORT_INCLUDE = ["needs_water", "problems", "care_tasks"];
// Services every notify integration registers next to the per-target ones.
const GENERIC_NOTIFY_SERVICES = new Set(["send_message", "notify", "persistent_notification"]);

// SHA-256 as lowercase hex. WebCrypto is only available in secure contexts,
// and Home Assistant is often opened over plain http on the local network.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
export function sha256Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const length = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(length); data.set(bytes); data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(length - 8, Math.floor(bytes.length / 0x20000000)); view.setUint32(length - 4, bytes.length * 8);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = w[i - 16]! + s0 + w[i - 7]! + s1;
    }
    let [a, b, c, d, e, f, g, hh] = [...h] as [number, number, number, number, number, number, number, number];
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i]! + w[i]!) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((value, i) => { h[i] = h[i]! + value; });
  }
  return [...h].map(x => x.toString(16).padStart(8, "0")).join("");
}

// The first trigger's id marks an automation made here. Home Assistant's
// editor replaces a prefilled automation id on save but keeps trigger ids.
// Chosen plants add a short hash of their sorted device ids, so the same
// choice gives the same marker and the dialog can tell it already exists.
export function notificationMarker(kind: NotificationKind, plantDeviceIds: string[] | null): string {
  const base = `${MARKER_PREFIX}${kind}`;
  if (!plantDeviceIds) return base;
  return `${base}_${sha256Hex([...plantDeviceIds].sort().join(",")).slice(0, 8)}`;
}

const seconds = (time: string) => `${time.slice(0, 5)}:00`;
const duration = (minutes: number): Record<string, number> => minutes % 60 === 0 ? { hours: minutes / 60 } : { minutes };
export function delayText(l: Localizer, minutes: number): string {
  if (minutes === 0) return l.t("notifications.delay_none");
  const hours = minutes % 60 === 0;
  return new Intl.NumberFormat(l.language, { style: "unit", unit: hours ? "hour" : "minute", unitDisplay: "long" }).format(hours ? minutes / 60 : minutes);
}

function sendStep(target: NotifyTarget, kind: NotificationKind, title: string, message: string): AutomationConfig {
  switch (target.kind) {
    case "entity": return { action: "notify.send_message", target: { entity_id: target.entityId }, data: { title, message } };
    case "service": return { action: `notify.${target.service}`, data: { title, message } };
    // One id per plant for needs water, so a second plant's message does not
    // replace the first; the daily report replaces yesterday's on purpose.
    case "persistent": return { action: "persistent_notification.create", data: { title, message, notification_id: kind === "needs_water" ? `${MARKER_PREFIX}${kind}_{{ trigger.device_id }}` : `${MARKER_PREFIX}${kind}` } };
  }
}

// The automation for one preset. Texts are taken from the panel language now
// and stay as they are in the saved automation.
export function buildNotification(input: NotificationInput, l: Localizer): AutomationConfig {
  const id = notificationMarker(input.kind, input.plantDeviceIds);
  const target = input.plantDeviceIds ? { target: { device_id: [...input.plantDeviceIds].sort() } } : {};
  if (input.kind === "daily_report") {
    return {
      alias: l.t("notifications.alias_daily"),
      description: l.t("notifications.description_daily"),
      mode: "single",
      triggers: [{ trigger: "time", at: seconds(input.time), id }],
      conditions: [{ condition: "smart_plants.needs_attention", ...target, options: { include: [...REPORT_INCLUDE], include_snoozed: false } }],
      actions: [
        { action: "smart_plants.get_report", ...target, data: { include: [...REPORT_INCLUDE], include_snoozed: false }, response_variable: "report" },
        sendStep(input.target, input.kind, "{{ report.title }}", "{{ report.message }}"),
      ],
    };
  }
  return {
    alias: l.t("notifications.alias_water"),
    description: input.delayMinutes ? l.t("notifications.description_water", { delay: delayText(l, input.delayMinutes) }) : l.t("notifications.description_water_now"),
    mode: "queued",
    max: 20,
    triggers: [{ trigger: "smart_plants.needs_water", id, ...target, options: { behavior: "each", ...(input.delayMinutes ? { for: duration(input.delayMinutes) } : {}), include_snoozed: false } }],
    conditions: input.quiet ? [{ condition: "not", conditions: [{ condition: "time", after: seconds(input.quiet.from), before: seconds(input.quiet.to) }] }] : [],
    actions: [sendStep(input.target, input.kind, l.t("notifications.msg_water_title", { plant: "{{ trigger.plant }}" }), l.t("notifications.msg_water_body"))],
  };
}

// Where a message can go: notify entities first, then legacy notify services,
// then Home Assistant's own notification, which always works.
export function notifyTargets(states: Record<string, HAState>, services: Record<string, Record<string, unknown>> | undefined): NotifyTarget[] {
  const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label);
  const entities = Object.values(states).filter(s => s.entity_id.startsWith("notify."))
    .map(s => ({ kind: "entity" as const, entityId: s.entity_id, label: typeof s.attributes.friendly_name === "string" && s.attributes.friendly_name ? s.attributes.friendly_name : s.entity_id }))
    .sort(byLabel);
  const legacy = Object.keys(services?.notify ?? {}).filter(service => !GENERIC_NOTIFY_SERVICES.has(service))
    .map(service => ({ kind: "service" as const, service, label: service }))
    .sort(byLabel);
  return [...entities, ...legacy, { kind: "persistent" }];
}
export function targetValue(target: NotifyTarget): string {
  return target.kind === "entity" ? `entity:${target.entityId}` : target.kind === "service" ? `service:${target.service}` : "persistent";
}

export interface FoundNotification { entityId: string; marker: string }
// The marker of an automation config made here, from any of its trigger ids.
export function configMarker(config: unknown): string | null {
  if (!config || typeof config !== "object") return null;
  const raw = (config as { triggers?: unknown; trigger?: unknown }).triggers ?? (config as { trigger?: unknown }).trigger;
  const triggers = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const trigger of triggers) {
    const id = trigger && typeof trigger === "object" ? (trigger as { id?: unknown }).id : undefined;
    if (typeof id === "string" && id.startsWith(MARKER_PREFIX)) return id;
  }
  return null;
}
// Reads every automation's config, a few at a time, and keeps the ones made here.
// An automation that can't be read (removed meanwhile, YAML errors) is skipped.
export async function findNotifications(hass: HomeAssistantLike, entityIds: string[], concurrency = 8): Promise<FoundNotification[]> {
  const found: (FoundNotification | null)[] = new Array<FoundNotification | null>(entityIds.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < entityIds.length) {
      const index = next++; const entityId = entityIds[index]!;
      try {
        const result = await hass.connection.sendMessagePromise<{ config?: unknown }>({ type: "automation/config", entity_id: entityId });
        const marker = configMarker(result?.config);
        if (marker) found[index] = { entityId, marker };
      } catch { /* skipped */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, entityIds.length) }, worker));
  return found.filter((item): item is FoundNotification => item !== null);
}

// Hands the config to Home Assistant's automation editor. The frontend's root
// element handles this event; when nothing does (an older or customized
// frontend), the URL stays the same and the editor is opened empty instead.
export function openAutomationEditor(source: HTMLElement, config: AutomationConfig, onFallback: () => void): void {
  const before = location.href;
  source.dispatchEvent(new CustomEvent("hass-automation-editor", { detail: { data: config }, bubbles: true, composed: true }));
  requestAnimationFrame(() => {
    if (location.href !== before) return;
    history.pushState(null, "", "/config/automation/edit/new");
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
    onFallback();
  });
}
