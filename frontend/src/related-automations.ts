// The automations that act on a plant, for the Automations card on its
// Overview tab. Home Assistant's search finds them by the plant's device and by
// the All plants entity; the rows come from the automations' current states, so
// on/off, names and last runs stay current without a new search. Nothing here
// changes an automation.
import type { Localizer } from "./localize.js";
import { relativeTime } from "./status.js";
import type { HAState } from "./types.js";

// Rows a group shows until its "Show all" button is used.
export const RELATED_LIMIT = 5;

export type AutomationStatus = "on" | "off" | "unavailable";
export interface AutomationRow {
  entityId: string;
  name: string;
  status: AutomationStatus;
  // When it last ran (ISO timestamp), or null when it never ran.
  lastTriggered: string | null;
  // The automation in Home Assistant's editor. Null for one defined in YAML
  // without an id, which the editor can't open.
  editPath: string | null;
}
export interface RelatedAutomations { plant: AutomationRow[]; allPlants: AutomationRow[] }

export function automationRow(state: HAState): AutomationRow {
  const { friendly_name: name, last_triggered: last, id } = state.attributes;
  return {
    entityId: state.entity_id,
    name: typeof name === "string" && name.trim() ? name : state.entity_id,
    // Automations are on or off; any other state means Home Assistant could not
    // set the automation up, for example because of a configuration error.
    status: state.state === "on" ? "on" : state.state === "off" ? "off" : "unavailable",
    lastTriggered: typeof last === "string" && Number.isFinite(Date.parse(last)) ? last : null,
    editPath: typeof id === "string" && id ? `/config/automation/edit/${encodeURIComponent(id)}` : null,
  };
}

// Rows for the IDs each search returned: automations that are on first, then
// off and unavailable ones, each by name. An ID without a state (deleted since
// the search ran) is left out, and an automation both searches found is listed
// only with the plant's own.
export function relatedAutomations(plantIds: readonly string[], allPlantsIds: readonly string[], states: Record<string, HAState>, language: string): RelatedAutomations {
  const order = (a: AutomationRow, b: AutomationRow) => Number(a.status !== "on") - Number(b.status !== "on")
    || a.name.localeCompare(b.name, language, { sensitivity: "base" }) || a.entityId.localeCompare(b.entityId);
  const rows = (ids: readonly string[], skip: ReadonlySet<string>) => [...new Set(ids)]
    .flatMap(id => { const state = states[id]; return state && !skip.has(id) ? [automationRow(state)] : []; })
    .sort(order);
  return { plant: rows(plantIds, new Set()), allPlants: rows(allPlantsIds, new Set(plantIds)) };
}

// The rows a group shows, the first five until it is expanded, and whether
// "Show all" is offered for the rest.
export function capRows(rows: readonly AutomationRow[], expanded: boolean): { shown: readonly AutomationRow[]; more: boolean } {
  const more = !expanded && rows.length > RELATED_LIMIT;
  return { shown: more ? rows.slice(0, RELATED_LIMIT) : rows, more };
}

// The row's second line: when the automation last ran, after "Defined in YAML"
// when the editor can't open it.
export function automationDetail(l: Localizer, row: AutomationRow, now: number = Date.now()): string {
  // A run a moment ahead of this browser's clock reads as now, not as the future.
  const ran = row.lastTriggered ? l.t("automations.last_ran", { time: relativeTime(l, row.lastTriggered, Math.max(now, Date.parse(row.lastTriggered))) }) : l.t("automations.never_ran");
  return row.editPath ? ran : `${l.t("automations.yaml")} · ${ran}`;
}
