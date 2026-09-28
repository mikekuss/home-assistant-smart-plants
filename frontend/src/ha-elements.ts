// Home Assistant registers its frontend elements when a custom panel loads,
// but they are not a stable public API: a release can rename, lazy-load or
// drop one. Views ask here before relying on an element and render plain
// markup when it is missing, so the panel never breaks on a missing element.

export const HA_ELEMENTS = [
  "ha-card",
  "ha-button",
  "ha-icon",
  "ha-icon-button",
  "ha-svg-icon",
  "ha-state-icon",
  "ha-tab-group",
  "ha-tab-group-tab",
  "ha-area-picker",
  "ha-entity-picker",
  "ha-selector",
  "ha-alert",
  "ha-expansion-panel",
  "ha-assist-chip",
  "ha-filter-chip",
  "ha-dropdown",
  "ha-dropdown-item",
  "ha-relative-time",
  "ha-spinner",
] as const;
export type HaElement = typeof HA_ELEMENTS[number];

export type ElementRegistry = Pick<CustomElementRegistry, "get" | "whenDefined">;

export function isDefined(tag: HaElement, registry: ElementRegistry = customElements): boolean {
  return registry.get(tag) !== undefined;
}

// Resolves once every tag is defined or the timeout passes, reporting which
// tags are available. Never rejects.
export async function whenElementsDefined(
  tags: readonly HaElement[] = HA_ELEMENTS,
  timeoutMs = 3000,
  registry: ElementRegistry = customElements,
): Promise<Record<HaElement, boolean>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>(resolve => { timer = setTimeout(resolve, timeoutMs); });
  await Promise.race([Promise.all(tags.map(tag => registry.whenDefined(tag))), timeout]);
  clearTimeout(timer);
  return Object.fromEntries(tags.map(tag => [tag, isDefined(tag, registry)])) as Record<HaElement, boolean>;
}
