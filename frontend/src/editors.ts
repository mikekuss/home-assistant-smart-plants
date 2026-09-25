import { html, nothing } from "lit";
import { builtin, keys, placements, resolveSource, roleSourceWarning, sourceWarning } from "./model.js";
import type { RoleSourceSpec } from "./model.js";
import type { HAArea, HAEntity, HAState, MoistureInput, PlantPlacement, RoleSourceInput, SpeciesPreview, SpeciesSnapshot } from "./types.js";

export const value = (event: Event): string => (event.target as HTMLInputElement).value;
export function textField(label: string, current: string, change: (v: string) => void, type = "text", max = 200) {
  return html`<label>${label}<input type=${type} maxlength=${max} .value=${current} @input=${(e: Event) => change(value(e))}></label>`;
}
export function selectField(label: string, current: string, options: { value: string; label: string }[], change: (v: string) => void) {
  const visible = current && !options.some(o => o.value === current) ? [...options, { value: current, label: `${current} (current value)` }] : options;
  return html`<label>${label}<select .value=${current} @change=${(e: Event) => change(value(e))}>${visible.map(o => html`<option value=${o.value} ?selected=${o.value === current}>${o.label}</option>`)}</select></label>`;
}
export function areaEditor(area: string, areas: HAArea[], change: (v: string) => void) {
  return selectField("Home Assistant area", area, [{ value: "", label: "No area" }, ...(area && !areas.some(a => a.area_id === area) ? [{ value: area, label: `${area} (missing area — select a current area before saving)` }] : []), ...areas.map(a => ({ value: a.area_id, label: a.name }))], change);
}
export function placementEditor(p: PlantPlacement | null, change: (v: PlantPlacement | null) => void) {
  const patch = (part: Partial<PlantPlacement>) => change({ mode: "indoor", exposure: null, rain_exposure: null, container: null, ...p, ...part });
  return html`${selectField("Placement", p?.mode ?? "", [{ value: "", label: "Not specified" }, ...placements.map(v => ({ value: v, label: v.replaceAll("_", " ") }))], v => v ? patch({ mode: v }) : change(null))}
    ${p ? html`${selectField("Sun exposure", p.exposure ?? "", ["", "full_sun", "partial_sun", "shade"].map(v => ({ value: v, label: v || "Not specified" })), v => patch({ exposure: v || null }))}
    ${selectField("Rain exposure", p.rain_exposure ?? "", ["", "none", "partial", "full"].map(v => ({ value: v, label: v || "Not specified" })), v => patch({ rain_exposure: v || null }))}
    ${selectField("Container", p.container === null ? "" : String(p.container), [{ value: "", label: "Not specified" }, { value: "true", label: "In a container" }, { value: "false", label: "In the ground" }], v => patch({ container: v === "" ? null : v === "true" }))}` : nothing}`;
}
export function moistureEditor(m: MoistureInput, defaults: typeof builtin, entities: HAEntity[], states: Record<string, HAState>, all: boolean, setAll: (v: boolean) => void, change: (m: MoistureInput) => void, section: "sources" | "thresholds" | "all" = "all") {
  const patch = (part: Partial<MoistureInput>) => change({ ...m, ...part });
  const candidates = [...new Set([...entities.map(e => e.entity_id), ...Object.keys(states)])].filter(id => id.startsWith("sensor.") && (all || states[id]?.attributes.device_class === "moisture")).sort();
  return html`${section !== "thresholds" ? html`
    <p>Assign up to 32 sources. Primary never falls back automatically. Unavailable sensors can be assigned.</p>
    <label class="check"><input type="checkbox" .checked=${all} @change=${(e: Event) => setAll((e.target as HTMLInputElement).checked)}>Show all sensors (metadata fallback)</label>
    ${selectField("Add moisture sensor", "", [{ value: "", label: "Choose a sensor" }, ...candidates.map(id => ({ value: id, label: `${typeof states[id]?.attributes.friendly_name === "string" ? states[id]?.attributes.friendly_name : id} · ${id} · unit: ${states[id]?.attributes.unit_of_measurement ?? "not supplied"} · class: ${states[id]?.attributes.device_class ?? "not supplied"} · ${states[id]?.state ?? "unavailable"}` }))], id => {
      if (id && !m.sources.some(s => s.entity_id === id)) patch({ sources: [...m.sources, { entity_id: id, registry_id: entities.find(e => e.entity_id === id)?.id ?? null }] });
    })}
    <label>Assign an unavailable or unregistered sensor<input placeholder="sensor.soil_moisture" @keydown=${(e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); const input = e.target as HTMLInputElement; const id = input.value.trim(); if (/^sensor\.[a-z0-9_]+$/.test(id) && !m.sources.some(s => s.entity_id === id)) { patch({ sources: [...m.sources, { entity_id: id, registry_id: entities.find(r => r.entity_id === id)?.id ?? null }] }); input.value = ""; } }
    }}></label><small>Press Enter to add an entity ID.</small>
    <ul>${m.sources.map(s => {
      const entry = resolveSource(s, entities); const current = s.registry_id && !entry ? undefined : states[entry?.entity_id ?? s.entity_id];
      return html`<li><strong>${entry?.entity_id ?? s.entity_id}</strong><p>${current?.state ?? "Unavailable"} ${current?.attributes.unit_of_measurement ?? ""}${s.entity_id === m.primary_entity_id ? " · Primary" : ""}</p><p>Device class: ${current?.attributes.device_class ?? "Not supplied"} · Unit: ${current?.attributes.unit_of_measurement ?? "Not supplied"} · ${entry ? "Registered" : "Not in registry"}</p><small>${sourceWarning(s, entities, states)}</small>${entry ? html`<a href="/config/entities/entity/${encodeURIComponent(entry.id)}">Native sensor settings</a>` : nothing}<button type="button" @click=${() => patch({ sources: m.sources.filter(v => v !== s), primary_entity_id: m.primary_entity_id === s.entity_id ? null : m.primary_entity_id })}>Remove ${s.entity_id}</button></li>`;
    })}</ul>
    ${m.sources.some(s => s.registry_id && !resolveSource(s, entities)) ? html`<a href="/config/repairs">Open Home Assistant Repairs</a>` : nothing}
    ${selectField("Primary sensor", m.primary_entity_id ?? "", [{ value: "", label: "None (primary aggregation unavailable)" }, ...m.sources.map(s => ({ value: s.entity_id, label: resolveSource(s, entities)?.entity_id ?? s.entity_id }))], v => patch({ primary_entity_id: v || null }))}
    ${selectField("Aggregation", m.aggregation, ["primary", "average", "min", "max"].map(v => ({ value: v, label: v })), v => patch({ aggregation: v as MoistureInput["aggregation"] }))}
    ${textField("Stale after (seconds, 60–604800)", String(m.stale_after_seconds), v => patch({ stale_after_seconds: Number(v) }), "number")}` : nothing}
    ${section !== "sources" ? html`<p>Blank overrides explicitly inherit defaults. Save applies the complete configuration atomically.</p><div class="grid">${keys.map(k => html`<div>${textField(`${k} override (%)`, m.threshold_overrides[k] === null ? "" : String(m.threshold_overrides[k]), v => patch({ threshold_overrides: { ...m.threshold_overrides, [k]: v.trim() === "" ? null : Number(v) } }), "number")}<small>Default ${defaults[k]}% · effective ${m.threshold_overrides[k] ?? defaults[k]}%</small><button type="button" @click=${() => patch({ threshold_overrides: { ...m.threshold_overrides, [k]: null } })}>Inherit ${k}</button></div>`)}</div>` : nothing}`;
}
// Generic per-role source editor for the Sensors section. Mirrors the source
// portion of moistureEditor but filters candidates and warns using the role's
// own device_class / accepted units (spec). Threshold editing is separate.
export function roleSourcesEditor(spec: RoleSourceSpec, c: RoleSourceInput, entities: HAEntity[], states: Record<string, HAState>, all: boolean, setAll: (v: boolean) => void, change: (c: RoleSourceInput) => void) {
  const patch = (part: Partial<RoleSourceInput>) => change({ ...c, ...part });
  const candidates = [...new Set([...entities.map(e => e.entity_id), ...Object.keys(states)])].filter(id => id.startsWith("sensor.") && (all || (states[id]?.attributes.device_class === spec.deviceClass && typeof states[id]?.attributes.unit_of_measurement === "string" && spec.acceptedUnits.includes(states[id]?.attributes.unit_of_measurement as string)))).sort();
  return html`
    <p>Assign up to 32 ${spec.label.toLowerCase()} sources. Primary never falls back automatically. Unavailable sensors can be assigned.</p>
    <label class="check"><input type="checkbox" .checked=${all} @change=${(e: Event) => setAll((e.target as HTMLInputElement).checked)}>Show all sensors (metadata fallback)</label>
    ${selectField(`Add ${spec.label.toLowerCase()} sensor`, "", [{ value: "", label: "Choose a sensor" }, ...candidates.map(id => ({ value: id, label: `${typeof states[id]?.attributes.friendly_name === "string" ? states[id]?.attributes.friendly_name : id} · ${id} · unit: ${states[id]?.attributes.unit_of_measurement ?? "not supplied"} · class: ${states[id]?.attributes.device_class ?? "not supplied"} · ${states[id]?.state ?? "unavailable"}` }))], id => {
      if (id && !c.sources.some(s => s.entity_id === id)) patch({ sources: [...c.sources, { entity_id: id, registry_id: entities.find(e => e.entity_id === id)?.id ?? null }] });
    })}
    <label>Assign an unavailable or unregistered sensor<input placeholder="sensor.${spec.role}" @keydown=${(e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); const input = e.target as HTMLInputElement; const id = input.value.trim(); if (/^sensor\.[a-z0-9_]+$/.test(id) && !c.sources.some(s => s.entity_id === id)) { patch({ sources: [...c.sources, { entity_id: id, registry_id: entities.find(r => r.entity_id === id)?.id ?? null }] }); input.value = ""; } }
    }}></label><small>Press Enter to add an entity ID.</small>
    <ul>${c.sources.map(s => {
      const entry = resolveSource(s, entities); const current = s.registry_id && !entry ? undefined : states[entry?.entity_id ?? s.entity_id];
      return html`<li><strong>${entry?.entity_id ?? s.entity_id}</strong><p>${current?.state ?? "Unavailable"} ${current?.attributes.unit_of_measurement ?? ""}${s.entity_id === c.primary_entity_id ? " · Primary" : ""}</p><p>Device class: ${current?.attributes.device_class ?? "Not supplied"} · Unit: ${current?.attributes.unit_of_measurement ?? "Not supplied"} · ${entry ? "Registered" : "Not in registry"}</p><small>${roleSourceWarning(s, entities, states, spec)}</small>${entry ? html`<a href="/config/entities/entity/${encodeURIComponent(entry.id)}">Native sensor settings</a>` : nothing}<button type="button" @click=${() => patch({ sources: c.sources.filter(v => v !== s), primary_entity_id: c.primary_entity_id === s.entity_id ? null : c.primary_entity_id })}>Remove ${s.entity_id}</button></li>`;
    })}</ul>
    ${c.sources.some(s => s.registry_id && !resolveSource(s, entities)) ? html`<a href="/config/repairs">Open Home Assistant Repairs</a>` : nothing}
    ${selectField("Primary sensor", c.primary_entity_id ?? "", [{ value: "", label: "None (primary aggregation unavailable)" }, ...c.sources.map(s => ({ value: s.entity_id, label: resolveSource(s, entities)?.entity_id ?? s.entity_id }))], v => patch({ primary_entity_id: v || null }))}
    ${selectField("Aggregation", c.aggregation, ["primary", "average", "min", "max"].map(v => ({ value: v, label: v })), v => patch({ aggregation: v as RoleSourceInput["aggregation"] }))}
    ${textField("Stale after (seconds, 60–604800)", String(c.stale_after_seconds), v => patch({ stale_after_seconds: Number(v) }), "number")}`;
}
export function snapshotView(snapshot: SpeciesSnapshot, preview?: SpeciesPreview) {
  return html`<article><h3>${snapshot.common_name ?? snapshot.latin_name ?? "Species"}</h3><p><i>${snapshot.latin_name}</i></p>
    <dl>${Object.entries({ Provider: snapshot.provider, Reference: snapshot.provider_ref, Attribution: snapshot.attribution, Fetched: snapshot.fetched_at, Locale: snapshot.locale, Status: snapshot.source_status, Confidence: snapshot.confidence ?? "Not supplied", Category: snapshot.category ?? "Not supplied" }).map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
    <h4>Imported moisture defaults</h4>${keys.map(k => html`<p>${k}: ${snapshot.threshold_defaults.moisture?.[k] ?? "Not supplied (built-in default applies)"}</p>`)}
    ${Object.entries(snapshot.care_text).map(([k, v]) => html`<h4>${k}</h4><p class="prose">${v}</p>`)}
    <details><summary>Field attribution</summary>${Object.entries(snapshot.field_sources).map(([k, v]) => html`<p>${k}: ${v}</p>`)}</details>
    ${preview ? html`<h4>Proposed changes</h4>${Object.entries(preview.diff).map(([k, v]) => html`<p>${k}: ${JSON.stringify(v.before)} → ${JSON.stringify(v.after)}</p>`)}<p>Preview is read-only. Local overrides are preserved. No remote images are loaded.</p>` : nothing}</article>`;
}
