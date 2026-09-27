import { html, nothing } from "lit";
import { builtin, keys, placements, resolveSource, rolePhrase, roleSourceWarning, sourceWarning } from "./model.js";
import type { RoleSourceSpec } from "./model.js";
import { isMessageKey } from "./localize.js";
import type { Localizer } from "./localize.js";
import type { HAArea, HAEntity, HAState, MoistureInput, PlantPlacement, RoleSourceInput, SpeciesPreview, SpeciesSnapshot } from "./types.js";

export const value = (event: Event): string => (event.target as HTMLInputElement).value;
export function textField(label: string, current: string, change: (v: string) => void, type = "text", max = 200) {
  return html`<label>${label}<input type=${type} maxlength=${max} .value=${current} @input=${(e: Event) => change(value(e))}></label>`;
}
export function selectField(l: Localizer, label: string, current: string, options: { value: string; label: string }[], change: (v: string) => void) {
  const visible = current && !options.some(o => o.value === current) ? [...options, { value: current, label: l.t("editor.current_value", { value: current }) }] : options;
  return html`<label>${label}<select .value=${current} @change=${(e: Event) => change(value(e))}>${visible.map(o => html`<option value=${o.value} ?selected=${o.value === current}>${o.label}</option>`)}</select></label>`;
}
// Display labels for stored enumeration values. Unknown future values are shown verbatim.
export function placementLabel(l: Localizer, mode: string): string { const key = `placement.${mode}`; return isMessageKey(key) ? l.t(key) : mode.replaceAll("_", " "); }
export function exposureLabel(l: Localizer, exposure: string): string { const key = `exposure.${exposure}`; return isMessageKey(key) ? l.t(key) : exposure; }
export function rainExposureLabel(l: Localizer, exposure: string): string { const key = `rain_exposure.${exposure}`; return isMessageKey(key) ? l.t(key) : exposure; }
export function aggregationLabel(l: Localizer, aggregation: string): string { const key = `aggregation.${aggregation}`; return isMessageKey(key) ? l.t(key) : aggregation; }
export function thresholdKeyLabel(l: Localizer, key: typeof keys[number]): string { return l.t(`moisture_threshold.${key}`); }
export function areaEditor(l: Localizer, area: string, areas: HAArea[], change: (v: string) => void) {
  return selectField(l, l.t("area.label"), area, [{ value: "", label: l.t("area.none") }, ...(area && !areas.some(a => a.area_id === area) ? [{ value: area, label: l.t("area.missing_option", { area }) }] : []), ...areas.map(a => ({ value: a.area_id, label: a.name }))], change);
}
export function placementEditor(l: Localizer, p: PlantPlacement | null, change: (v: PlantPlacement | null) => void) {
  const patch = (part: Partial<PlantPlacement>) => change({ mode: "indoor", exposure: null, rain_exposure: null, container: null, ...p, ...part });
  const unspecified = l.t("common.not_specified");
  return html`${selectField(l, l.t("placement.label"), p?.mode ?? "", [{ value: "", label: unspecified }, ...placements.map(v => ({ value: v, label: placementLabel(l, v) }))], v => v ? patch({ mode: v }) : change(null))}
    ${p ? html`${selectField(l, l.t("exposure.label"), p.exposure ?? "", ["", "full_sun", "partial_sun", "shade"].map(v => ({ value: v, label: v ? exposureLabel(l, v) : unspecified })), v => patch({ exposure: v || null }))}
    ${selectField(l, l.t("rain_exposure.label"), p.rain_exposure ?? "", ["", "none", "partial", "full"].map(v => ({ value: v, label: v ? rainExposureLabel(l, v) : unspecified })), v => patch({ rain_exposure: v || null }))}
    ${selectField(l, l.t("container.label"), p.container === null ? "" : String(p.container), [{ value: "", label: unspecified }, { value: "true", label: l.t("container.in_container") }, { value: "false", label: l.t("container.in_ground") }], v => patch({ container: v === "" ? null : v === "true" }))}` : nothing}`;
}
function candidateLabel(l: Localizer, id: string, states: Record<string, HAState>): string {
  const state = states[id]; const notSupplied = l.t("sources.not_supplied_lower");
  return l.t("sources.candidate", { name: typeof state?.attributes.friendly_name === "string" ? state.attributes.friendly_name : id, entity_id: id, unit: String(state?.attributes.unit_of_measurement ?? notSupplied), device_class: String(state?.attributes.device_class ?? notSupplied), state: state?.state ?? l.t("sources.unavailable_lower") });
}
// Shared assigned-source list, primary/aggregation/staleness controls for moisture and generic roles.
function sourcesControls<T extends MoistureInput | RoleSourceInput>(l: Localizer, c: T, entities: HAEntity[], states: Record<string, HAState>, all: boolean, setAll: (v: boolean) => void, patch: (part: Partial<T>) => void, intro: string, addLabel: string, placeholder: string, candidates: string[], warning: (s: T["sources"][number]) => string) {
  const notSupplied = l.t("common.not_supplied");
  return html`
    <p>${intro}</p>
    <label class="check"><input type="checkbox" .checked=${all} @change=${(e: Event) => setAll((e.target as HTMLInputElement).checked)}>${l.t("sources.show_all")}</label>
    ${selectField(l, addLabel, "", [{ value: "", label: l.t("sources.choose") }, ...candidates.map(id => ({ value: id, label: candidateLabel(l, id, states) }))], id => {
      if (id && !c.sources.some(s => s.entity_id === id)) patch({ sources: [...c.sources, { entity_id: id, registry_id: entities.find(e => e.entity_id === id)?.id ?? null }] } as Partial<T>);
    })}
    <label>${l.t("sources.assign_unavailable")}<input placeholder=${placeholder} @keydown=${(e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); const input = e.target as HTMLInputElement; const id = input.value.trim(); if (/^sensor\.[a-z0-9_]+$/.test(id) && !c.sources.some(s => s.entity_id === id)) { patch({ sources: [...c.sources, { entity_id: id, registry_id: entities.find(r => r.entity_id === id)?.id ?? null }] } as Partial<T>); input.value = ""; } }
    }}></label><small>${l.t("sources.press_enter")}</small>
    <ul>${c.sources.map(s => {
      const entry = resolveSource(s, entities); const current = s.registry_id && !entry ? undefined : states[entry?.entity_id ?? s.entity_id];
      return html`<li><strong>${entry?.entity_id ?? s.entity_id}</strong><p>${current?.state ?? l.t("sources.unavailable")} ${current?.attributes.unit_of_measurement ?? ""}${s.entity_id === c.primary_entity_id ? l.t("sources.primary_suffix") : ""}</p><p>${l.t("sources.metadata", { device_class: String(current?.attributes.device_class ?? notSupplied), unit: String(current?.attributes.unit_of_measurement ?? notSupplied), registration: entry ? l.t("sources.registered") : l.t("sources.not_registered") })}</p><small>${warning(s)}</small>${entry ? html`<a href="/config/entities/entity/${encodeURIComponent(entry.id)}">${l.t("sources.native_settings")}</a>` : nothing}<button type="button" @click=${() => patch({ sources: c.sources.filter(v => v !== s), primary_entity_id: c.primary_entity_id === s.entity_id ? null : c.primary_entity_id } as Partial<T>)}>${l.t("sources.remove", { entity_id: s.entity_id })}</button></li>`;
    })}</ul>
    ${c.sources.some(s => s.registry_id && !resolveSource(s, entities)) ? html`<a href="/config/repairs">${l.t("sources.open_repairs")}</a>` : nothing}
    ${selectField(l, l.t("sources.primary"), c.primary_entity_id ?? "", [{ value: "", label: l.t("sources.primary_none") }, ...c.sources.map(s => ({ value: s.entity_id, label: resolveSource(s, entities)?.entity_id ?? s.entity_id }))], v => patch({ primary_entity_id: v || null } as Partial<T>))}
    ${selectField(l, l.t("sources.aggregation"), c.aggregation, ["primary", "average", "min", "max"].map(v => ({ value: v, label: aggregationLabel(l, v) })), v => patch({ aggregation: v } as Partial<T>))}
    ${textField(l.t("sources.stale_after"), String(c.stale_after_seconds), v => patch({ stale_after_seconds: Number(v) } as Partial<T>), "number")}`;
}
export function moistureEditor(l: Localizer, m: MoistureInput, defaults: typeof builtin, entities: HAEntity[], states: Record<string, HAState>, all: boolean, setAll: (v: boolean) => void, change: (m: MoistureInput) => void, section: "sources" | "thresholds" | "all" = "all") {
  const patch = (part: Partial<MoistureInput>) => change({ ...m, ...part });
  const candidates = [...new Set([...entities.map(e => e.entity_id), ...Object.keys(states)])].filter(id => id.startsWith("sensor.") && (all || states[id]?.attributes.device_class === "moisture")).sort();
  return html`${section !== "thresholds" ? sourcesControls(l, m, entities, states, all, setAll, patch, l.t("moisture.sources_intro"), l.t("moisture.add_sensor"), "sensor.soil_moisture", candidates, s => sourceWarning(s, entities, states, l)) : nothing}
    ${section !== "sources" ? html`<p>${l.t("moisture.overrides_intro")}</p><div class="grid">${keys.map(k => html`<div>${textField(l.t("moisture.override_label", { key: thresholdKeyLabel(l, k) }), m.threshold_overrides[k] === null ? "" : String(m.threshold_overrides[k]), v => patch({ threshold_overrides: { ...m.threshold_overrides, [k]: v.trim() === "" ? null : Number(v) } }), "number")}<small>${l.t("moisture.default_effective", { default: l.percent(defaults[k]), effective: l.percent(m.threshold_overrides[k] ?? defaults[k]) })}</small><button type="button" @click=${() => patch({ threshold_overrides: { ...m.threshold_overrides, [k]: null } })}>${l.t("moisture.inherit_key", { key: thresholdKeyLabel(l, k) })}</button></div>`)}</div>` : nothing}`;
}
// Generic per-role source editor for the Sensors section. Mirrors the source
// portion of moistureEditor but filters candidates and warns using the role's
// own device_class / accepted units (spec). Threshold editing is separate.
export function roleSourcesEditor(l: Localizer, spec: RoleSourceSpec, c: RoleSourceInput, entities: HAEntity[], states: Record<string, HAState>, all: boolean, setAll: (v: boolean) => void, change: (c: RoleSourceInput) => void) {
  const patch = (part: Partial<RoleSourceInput>) => change({ ...c, ...part });
  const candidates = [...new Set([...entities.map(e => e.entity_id), ...Object.keys(states)])].filter(id => id.startsWith("sensor.") && (all || (states[id]?.attributes.device_class === spec.deviceClass && typeof states[id]?.attributes.unit_of_measurement === "string" && spec.acceptedUnits.includes(states[id]?.attributes.unit_of_measurement as string)))).sort();
  const role = rolePhrase(spec.role, l);
  return sourcesControls(l, c, entities, states, all, setAll, patch, l.t("sources.role_intro", { role }), l.t("sources.add_role_sensor", { role }), `sensor.${spec.role}`, candidates, s => roleSourceWarning(s, entities, states, spec, l));
}
export function snapshotView(l: Localizer, snapshot: SpeciesSnapshot, preview?: SpeciesPreview) {
  const notSupplied = l.t("common.not_supplied");
  const fields: [string, string | null][] = [
    [l.t("snapshot.provider"), snapshot.provider], [l.t("snapshot.reference"), snapshot.provider_ref], [l.t("snapshot.attribution"), snapshot.attribution],
    [l.t("snapshot.fetched"), l.dateTime(snapshot.fetched_at)], [l.t("snapshot.locale"), snapshot.locale], [l.t("snapshot.status"), snapshot.source_status === "manual" || snapshot.source_status === "provider" ? l.t(`snapshot.status_${snapshot.source_status}`) : snapshot.source_status],
    [l.t("snapshot.confidence"), snapshot.confidence === null ? notSupplied : l.number(snapshot.confidence)], [l.t("snapshot.category"), snapshot.category ?? notSupplied],
  ];
  return html`<article><h3>${snapshot.common_name ?? snapshot.latin_name ?? l.t("snapshot.species")}</h3><p><i>${snapshot.latin_name}</i></p>
    <dl>${fields.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
    <h4>${l.t("snapshot.imported_defaults")}</h4>${keys.map(k => html`<p>${thresholdKeyLabel(l, k)}: ${snapshot.threshold_defaults.moisture?.[k] === undefined ? l.t("snapshot.default_not_supplied") : l.number(snapshot.threshold_defaults.moisture[k])}</p>`)}
    ${Object.entries(snapshot.care_text).map(([k, v]) => html`<h4>${k}</h4><p class="prose">${v}</p>`)}
    <details><summary>${l.t("snapshot.field_attribution")}</summary>${Object.entries(snapshot.field_sources).map(([k, v]) => html`<p>${k}: ${v}</p>`)}</details>
    ${preview ? html`<h4>${l.t("snapshot.proposed_changes")}</h4>${Object.entries(preview.diff).map(([k, v]) => html`<p>${k}: ${JSON.stringify(v.before)} → ${JSON.stringify(v.after)}</p>`)}<p>${l.t("snapshot.preview_read_only")}</p>` : nothing}</article>`;
}
