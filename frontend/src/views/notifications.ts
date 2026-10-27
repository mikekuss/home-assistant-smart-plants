// The "Notifications…" dialog of the plants overview. It lists the
// notification automations made here and opens Home Assistant's automation
// editor prefilled with one preset; the user saves it there.
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { Localizer } from "../localize.js";
import { plantDevice } from "../model.js";
import { DELAY_CHOICES, allPlantsEntityId, buildNotification, delayText, findNotifications, notificationMarker, notifyTargets, openAutomationEditor, targetValue } from "../notifications.js";
import type { FoundNotification, NotificationKind, NotifyTarget } from "../notifications.js";
import { relativeTime } from "../status.js";
import { styles } from "../styles.js";
import { themeFallbacks } from "../components/shared-styles.js";
import { carePlanStyles } from "./care-plan.js";
import type { HADevice, HAEntity, HAState, HomeAssistantLike, PlantRecord } from "../types.js";

type NotifyHass = HomeAssistantLike & { services?: Record<string, Record<string, unknown>> };
interface Draft { kind: NotificationKind; time: string; delayMinutes: number; quiet: boolean; quietFrom: string; quietTo: string; allPlants: boolean; plantIds: ReadonlySet<string>; target: string; error: string }

export class SmartPlantsNotifications extends LitElement {
  static styles = [themeFallbacks, styles, carePlanStyles, css`
    .notify-list { list-style: none; padding: 0; margin: 0; border: 1px solid var(--divider-color, #ddd); border-radius: 12px; }
    .notify-list li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 4px 12px; align-items: center; padding: 10px 14px; margin: 0; }
    .notify-list li + li { border-top: 1px solid var(--divider-color, #ddd); }
    /* A native checkbox drawn like Home Assistant's own switch: a track with a
       thumb that slides to the end when on. It uses the same theme colours, so
       it follows light and dark themes. The input stays native so its label,
       description, Space key and focus ring work as for any checkbox. */
    .notify-list .switch {
      --track: var(--ha-switch-background-color, var(--ha-color-fill-disabled-quiet-resting, var(--secondary-background-color, #f3f3f3)));
      --edge: var(--ha-switch-border-color, var(--ha-color-border-neutral-normal, #989898));
      --thumb: var(--ha-switch-thumb-background-color, var(--ha-color-on-neutral-normal, #5e5e5e));
      appearance: none; -webkit-appearance: none; box-sizing: border-box; flex: none;
      width: 48px; height: 24px; min-height: 24px; margin: 0; border: 1px solid var(--edge); border-radius: 12px; cursor: pointer;
      background: radial-gradient(circle closest-side, var(--thumb) 8.5px, transparent 9px) no-repeat 0 50% / 22px 22px, var(--track);
      transition: background-position 150ms ease, background-color 150ms ease, border-color 150ms ease;
    }
    .notify-list .switch:checked {
      --track: var(--ha-switch-checked-background-color, var(--ha-color-fill-primary-normal-resting, #dff3fc));
      --edge: var(--ha-switch-checked-border-color, var(--ha-color-border-primary-loud, var(--primary-color, #009ac7)));
      --thumb: var(--ha-switch-checked-thumb-background-color, var(--ha-color-on-primary-normal, var(--primary-color, #009ac7)));
      background-position: 100% 50%, 0 0;
    }
    .notify-list .switch:dir(rtl) { background-position: 100% 50%, 0 0; }
    .notify-list .switch:checked:dir(rtl) { background-position: 0 50%, 0 0; }
    .notify-list .switch:disabled { opacity: var(--ha-switch-disabled-opacity, 0.3); cursor: not-allowed; }
    @media (prefers-reduced-motion: reduce) { .notify-list .switch { transition: none; } }
    @media (forced-colors: active) {
      .notify-list .switch { forced-color-adjust: none; --track: Canvas; --edge: CanvasText; --thumb: CanvasText; }
      .notify-list .switch:checked { --edge: Highlight; --thumb: Highlight; }
      .notify-list .switch:disabled { --edge: GrayText; --thumb: GrayText; opacity: 1; }
    }
    .notify-list .row-text, .choice-text { display: flex; flex-direction: column; min-width: 0; }
    .existing { padding: 0; border: 0; margin: 0; background: none; }
    .notify-list a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 8px; }
    .care-dialog h3 { margin: 4px 0 0; font-size: 1rem; }
    .preset { display: flex; flex-direction: column; gap: 8px; }
    .preset-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; padding-inline-start: 34px; }
    .preset-fields .check { grid-column: 1 / -1; }
    .preset-fields .check input, .plant-choices .check input { flex: 0 0 24px; width: 24px; height: 24px; min-height: 24px; }
    .plant-choices { display: flex; flex-direction: column; gap: 4px; padding-inline-start: 34px; }
    .plant-choices .check, .choices .check { margin: 4px 0; }
    .hint { margin: 0; }
    @media (max-width: 600px) { .preset-fields, .plant-choices { padding-inline-start: 0; } .preset-fields { grid-template-columns: 1fr; } }
  `];
  @property({ attribute: false }) public hass?: NotifyHass;
  @property({ attribute: false }) public l!: Localizer;
  @property({ attribute: false }) public plants: PlantRecord[] = [];
  @property({ attribute: false }) public devices: HADevice[] = [];
  @property({ attribute: false }) public entities: HAEntity[] = [];
  @property({ attribute: false }) public states: Record<string, HAState> = {};
  @state() private _draft: Draft = { kind: "daily_report", time: "08:00", delayMinutes: 30, quiet: false, quietFrom: "22:00", quietTo: "07:00", allPlants: true, plantIds: new Set(), target: "", error: "" };
  @state() private _found: FoundNotification[] = [];
  @state() private _toggling: ReadonlySet<string> = new Set();
  private _request = 0;
  private _unsubscribe: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    void this._load();
    const hass = this.hass;
    // Saving in the automation editor reloads automations; read them again then.
    void hass?.connection.subscribeEvents?.(() => void this._load(), "automation_reloaded")
      .then(unsubscribe => { if (this.isConnected && this.hass === hass) this._unsubscribe = unsubscribe; else unsubscribe(); })
      .catch(() => undefined);
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._request++; this._unsubscribe?.(); this._unsubscribe = null;
  }
  protected firstUpdated(): void {
    const dialog = this.shadowRoot?.querySelector("dialog");
    if (dialog && !dialog.open) dialog.showModal();
    this.shadowRoot?.querySelector<HTMLElement>("h2")?.focus();
  }
  // A select's value can only be set once its options exist, which is after
  // the select itself was rendered.
  protected updated(): void {
    const delay = this.shadowRoot?.querySelector<HTMLSelectElement>("#water-delay");
    if (delay) delay.value = String(this._draft.delayMinutes);
    const send = this.shadowRoot?.querySelector<HTMLSelectElement>("#send-to");
    const targets = this._targets();
    if (send) send.value = targetValue(targets.find(item => targetValue(item) === this._draft.target) ?? targets[0]!);
  }
  private async _load(): Promise<void> {
    const hass = this.hass; if (!hass) return;
    const request = ++this._request;
    const automations = Object.keys(this.states).filter(id => id.startsWith("automation.")).sort();
    const found = await findNotifications(hass, automations);
    if (request === this._request) this._found = found;
  }
  private _close(): void {
    this.shadowRoot?.querySelector("dialog")?.close();
    this.dispatchEvent(new CustomEvent("notifications-close"));
  }
  private _trapFocus(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;
    const nodes = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])")];
    const first = nodes[0]; const last = nodes.at(-1); const active = this.shadowRoot?.activeElement;
    if (e.shiftKey && (active === first || active?.matches("#notifications-title"))) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first?.focus(); }
  }
  private _edit(changes: Partial<Draft>): void { this._draft = { ...this._draft, error: "", ...changes }; }
  private _targets(): NotifyTarget[] { return notifyTargets(this.states, this.hass?.services); }
  private _choosable(): { id: string; name: string; deviceId: string }[] {
    return this.plants.map(plant => ({ id: plant.id, name: plant.name, deviceId: plantDevice(plant, this.devices)?.id ?? "" }))
      .filter(plant => plant.deviceId).sort((a, b) => a.name.localeCompare(b.name));
  }
  private _deviceIds(): string[] | null {
    if (this._draft.allPlants) return null;
    return this._choosable().filter(plant => this._draft.plantIds.has(plant.id)).map(plant => plant.deviceId);
  }
  private _open(): void {
    const draft = this._draft; const deviceIds = this._deviceIds();
    if (deviceIds && !deviceIds.length) {
      this._edit({ error: this.l.t("notifications.error_no_plants") });
      void this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLElement>(".plant-choices input")?.focus());
      return;
    }
    const targets = this._targets();
    const target = targets.find(item => targetValue(item) === draft.target) ?? targets[0]!;
    const config = buildNotification({ kind: draft.kind, time: draft.time, delayMinutes: draft.delayMinutes, quiet: draft.kind === "needs_water" && draft.quiet ? { from: draft.quietFrom, to: draft.quietTo } : null, plantDeviceIds: deviceIds, allPlantsEntityId: allPlantsEntityId(this.entities), target }, this.l);
    const l = this.l;
    // The dialog is gone by the time the fallback runs; the panel stays.
    const host = (this.getRootNode() as ShadowRoot).host ?? this;
    const toast = (message: string) => host.dispatchEvent(new CustomEvent("hass-notification", { bubbles: true, composed: true, detail: { message, duration: 8000 } }));
    openAutomationEditor(this, config, () => toast(l.t("notifications.editor_fallback")));
    this._close();
  }
  // Home Assistant's own client-side navigation for a plain click; the dialog
  // closes because the panel is left.
  private _link(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.pushState(null, "", (event.currentTarget as HTMLAnchorElement).getAttribute("href"));
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
    this._close();
  }
  private async _toggle(entityId: string, on: boolean): Promise<void> {
    const hass = this.hass; if (!hass || this._toggling.has(entityId)) return;
    this._toggling = new Set([...this._toggling, entityId]);
    try { await hass.connection.sendMessagePromise({ type: "call_service", domain: "automation", service: on ? "turn_on" : "turn_off", target: { entity_id: entityId } }); }
    catch { this.requestUpdate(); }
    finally { const next = new Set(this._toggling); next.delete(entityId); this._toggling = next; }
  }
  private _renderExisting() {
    const l = this.l;
    const rows = this._found.map(item => ({ ...item, state: this.states[item.entityId] })).filter(item => item.state);
    if (!rows.length) return nothing;
    return html`<section class="existing" aria-labelledby="notifications-existing">
      <h3 id="notifications-existing">${l.t("notifications.existing")}</h3>
      <ul class="notify-list">${rows.map(({ entityId, state }) => {
        const name = typeof state!.attributes.friendly_name === "string" && state!.attributes.friendly_name ? state!.attributes.friendly_name : entityId;
        const last = state!.attributes.last_triggered; const id = state!.attributes.id;
        const sent = typeof last === "string" && last ? l.t("notifications.last_sent", { time: relativeTime(l, last) }) : l.t("notifications.never_sent");
        return html`<li>
          <input class="switch" type="checkbox" role="switch" aria-label=${name} aria-describedby=${`sent-${entityId}`} .checked=${state!.state === "on"} ?disabled=${this._toggling.has(entityId) || state!.state === "unavailable"}
            @change=${(e: Event) => void this._toggle(entityId, (e.target as HTMLInputElement).checked)}>
          <span class="row-text"><span>${name}</span><span class="small muted" id=${`sent-${entityId}`}>${sent}</span></span>
          ${typeof id === "string" && id ? html`<a href=${`/config/automation/edit/${encodeURIComponent(id)}`} @click=${(e: MouseEvent) => this._link(e)} aria-label=${l.t("notifications.edit_label", { name })}>${l.t("notifications.edit")}</a>` : html`<span></span>`}
        </li>`;
      })}</ul></section>`;
  }
  protected render() {
    const l = this.l; const draft = this._draft;
    const targets = this._targets();
    const entities = targets.filter(t => t.kind === "entity"); const services = targets.filter(t => t.kind === "service");
    const selected = targets.find(item => targetValue(item) === draft.target) ?? targets[0]!;
    const plants = this._choosable();
    const deviceIds = this._deviceIds();
    const exists = (!deviceIds || deviceIds.length > 0) && this._found.some(item => item.marker === notificationMarker(draft.kind, deviceIds) && this.states[item.entityId]);
    const option = (target: NotifyTarget, label: string) => html`<option value=${targetValue(target)} ?selected=${targetValue(target) === targetValue(selected)}>${label}</option>`;
    return html`<dialog class="care-dialog notifications-dialog" aria-labelledby="notifications-title" aria-describedby="notifications-intro" @cancel=${(e: Event) => { e.preventDefault(); this._close(); }} @keydown=${(e: KeyboardEvent) => this._trapFocus(e)}>
      <h2 id="notifications-title" tabindex="-1">${l.t("notifications.title")}</h2>
      <div class="dialog-body">
        <p class="muted hint" id="notifications-intro">${l.t("notifications.intro")}</p>
        ${this._renderExisting()}
        <fieldset class="choices"><legend class="field-label">${l.t("notifications.kind")}</legend>
          <div class="preset">
            <label class="check"><input type="radio" name="notification-kind" value="daily_report" .checked=${draft.kind === "daily_report"} aria-describedby="daily-help" @change=${() => this._edit({ kind: "daily_report" })}>
              <span class="choice-text"><span>${l.t("notifications.daily")}</span><span class="small muted" id="daily-help">${l.t("notifications.daily_help")}</span></span></label>
            ${draft.kind === "daily_report" ? html`<div class="preset-fields"><label>${l.t("notifications.daily_time")}<input id="daily-time" type="time" required .value=${draft.time} @change=${(e: Event) => this._edit({ time: (e.target as HTMLInputElement).value || "08:00" })}></label></div>` : nothing}
          </div>
          <div class="preset">
            <label class="check"><input type="radio" name="notification-kind" value="needs_water" .checked=${draft.kind === "needs_water"} @change=${() => this._edit({ kind: "needs_water" })}>
              <span class="choice-text"><span>${l.t("notifications.water")}</span></span></label>
            ${draft.kind === "needs_water" ? html`<div class="preset-fields">
              <label>${l.t("notifications.water_delay")}<select id="water-delay" @change=${(e: Event) => this._edit({ delayMinutes: Number((e.target as HTMLSelectElement).value) })}>
                ${DELAY_CHOICES.map(minutes => html`<option value=${String(minutes)} ?selected=${draft.delayMinutes === minutes}>${delayText(l, minutes)}</option>`)}</select></label>
              <label class="check"><input type="checkbox" .checked=${draft.quiet} aria-describedby="quiet-help" @change=${(e: Event) => this._edit({ quiet: (e.target as HTMLInputElement).checked })}>
                <span class="choice-text"><span>${l.t("notifications.quiet")}</span><span class="small muted" id="quiet-help">${l.t("notifications.quiet_help")}</span></span></label>
              ${draft.quiet ? html`<label>${l.t("notifications.quiet_from")}<input id="quiet-from" type="time" required .value=${draft.quietFrom} @change=${(e: Event) => this._edit({ quietFrom: (e.target as HTMLInputElement).value || "22:00" })}></label>
                <label>${l.t("notifications.quiet_to")}<input id="quiet-to" type="time" required .value=${draft.quietTo} @change=${(e: Event) => this._edit({ quietTo: (e.target as HTMLInputElement).value || "07:00" })}></label>` : nothing}
            </div>` : nothing}
          </div>
        </fieldset>
        <fieldset class="choices"><legend class="field-label">${l.t("notifications.plants")}</legend>
          <label class="check"><input type="radio" name="notification-plants" value="all" .checked=${draft.allPlants} @change=${() => this._edit({ allPlants: true })}><span>${l.t("notifications.plants_all")}</span></label>
          <label class="check"><input type="radio" name="notification-plants" value="choose" .checked=${!draft.allPlants} ?disabled=${!plants.length} @change=${() => this._edit({ allPlants: false })}><span>${l.t("notifications.plants_choose")}</span></label>
          ${!draft.allPlants ? html`<div class="plant-choices">${plants.map(plant => html`<label class="check"><input type="checkbox" .checked=${draft.plantIds.has(plant.id)} aria-invalid=${draft.error ? "true" : "false"} aria-describedby=${draft.error ? "plants-error" : nothing}
              @change=${(e: Event) => { const next = new Set(draft.plantIds); if ((e.target as HTMLInputElement).checked) next.add(plant.id); else next.delete(plant.id); this._edit({ plantIds: next }); }}><span>${plant.name}</span></label>`)}
            ${draft.error ? html`<span class="error-text small" id="plants-error" role="alert">${draft.error}</span>` : nothing}</div>` : nothing}
        </fieldset>
        <label>${l.t("notifications.send_to")}<select id="send-to" @change=${(e: Event) => this._edit({ target: (e.target as HTMLSelectElement).value })}>
          ${entities.length ? html`<optgroup label=${l.t("notifications.group_entities")}>${entities.map(t => option(t, t.kind === "entity" ? t.label : ""))}</optgroup>` : nothing}
          ${services.length ? html`<optgroup label=${l.t("notifications.group_services")}>${services.map(t => option(t, t.kind === "service" ? t.label : ""))}</optgroup>` : nothing}
          ${option({ kind: "persistent" }, l.t("notifications.persistent"))}
        </select></label>
        ${exists ? html`<p class="hint" role="status">${l.t("notifications.exists")}</p>` : nothing}
        <p class="small muted hint">${l.t("notifications.yaml_help")}</p>
        <div class="actions dialog-actions"><span class="spacer"></span>
          <button type="button" @click=${() => this._close()}>${l.t("common.cancel")}</button>
          <button type="button" class="primary" @click=${() => this._open()}>${l.t("notifications.open_editor")}</button></div>
      </div></dialog>`;
  }
}
if (!customElements.get("smart-plants-notifications")) customElements.define("smart-plants-notifications", SmartPlantsNotifications);
declare global { interface HTMLElementTagNameMap { "smart-plants-notifications": SmartPlantsNotifications } }
