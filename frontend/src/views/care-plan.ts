// Care plan card on the plant's Care tab, the care task editor and the
// Automate… sheet. Pure render functions: the panel owns state and writes.
import { css, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { CARE_TASK_TYPES, FORECAST_HOURS, INTERVAL_UNITS, MAX_CARE_TASKS, MAX_FOR_HOURS, ROLE_UNITS, TASK_ICONS, TASK_INSTRUCTIONS_MAX, TASK_NAME_MAX, careNote, careSuggestions, draftSummary, existingTypes, forecastEntities, forecastMissing, forecastRowValue, forecastShortText, forecastShortUntil, forecastUnit, forecastWindow, inRestPeriod, isForecastDraft, isSourceRole, lastDone, minTemperature, monthName, monthRange, monthsInRange, numericSensor, parseNumber, pickSource, plantReadingRoles, presetDraft, readingSuggestion, readingValue, restSentence, scheduleText, shortDate, sourceName, sourceUnit, taskChip, taskName, winterDraft, winterSourceMissing } from "../care-plan.js";
import type { DraftErrors, ReadingSourceRole, RestDraft, TaskDraft } from "../care-plan.js";
import { isDefined } from "../ha-elements.js";
import type { Localizer } from "../localize.js";
import type { PlantOverview } from "../overview-model.js";
import { readingLabel } from "../status.js";
import type { CareTask, CareTaskType, HAState, HomeAssistantLike, PlantRecord } from "../types.js";

export type TaskAction = "mark_done" | "skip" | "edit" | "automate" | "delete";

export interface CarePlanContext {
  l: Localizer;
  plant: PlantRecord;
  overview: PlantOverview | undefined;
  // Today in the Home Assistant time zone (YYYY-MM-DD).
  today: string;
  timeZone?: string | undefined;
  // Home Assistant states, for the names of sensors that reading tasks follow.
  states?: Record<string, HAState> | undefined;
  disabled: boolean;
  // Tasks with a write in flight.
  pending: ReadonlySet<string>;
  onAdd: () => void;
  onRest: () => void;
  onDone: (task: CareTask) => void;
  onAction: (task: CareTask, action: TaskAction) => void;
}

export function renderCarePlan(ctx: CarePlanContext): TemplateResult {
  const { l, plant } = ctx;
  const tasks = plant.care_tasks ?? [];
  const full = tasks.length >= MAX_CARE_TASKS;
  return html`<section class="sp-card care-plan" aria-labelledby="care-plan-heading">
    <div class="card-h"><h3 id="care-plan-heading">${l.t("care_plan.heading")}</h3>
      <span class="row care-plan-actions">${tasks.length ? html`<button type="button" class="btn text sm" ?disabled=${ctx.disabled || full} title=${full ? l.t("care_plan.full") : ""} @click=${ctx.onAdd}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("care_plan.add_task")}</button>` : nothing}
        <ha-dropdown @wa-select=${(e: CustomEvent<{ item: { value: string } }>) => { if (e.detail.item.value === "rest") ctx.onRest(); }}>
          <button slot="trigger" type="button" class="icon-btn" ?disabled=${ctx.disabled} aria-label=${l.t("care_plan.plan_menu")}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
          <ha-dropdown-item value="rest" ?disabled=${ctx.disabled}>${l.t(plant.rest_period ? "care_plan.rest_edit" : "care_plan.rest_set")}<ha-icon slot="icon" icon="mdi:weather-night"></ha-icon></ha-dropdown-item>
        </ha-dropdown></span></div>
    ${plant.rest_period ? restRow(ctx, plant.rest_period) : nothing}
    ${tasks.length
      ? html`<ul class="list task-list" aria-label=${l.t("care_plan.tasks_label")}>${tasks.map(task => taskRow(ctx, task))}</ul>`
      // Without tasks the plan is a quiet offer, not the tab's main action.
      : html`<div class="card-b"><div class="empty-box"><span>${l.t("care_plan.empty")}</span>
          <button type="button" class="btn tonal sm" ?disabled=${ctx.disabled} @click=${ctx.onAdd}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("care_plan.add_task")}</button></div>
          ${careSuggestions(plant).length || minTemperature(plant) !== null ? html`<p class="small muted care-note"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${l.t("care_plan.empty_suggestions")}</span></p>` : nothing}</div>`}
  </section>`;
}

function restRow(ctx: CarePlanContext, rest: NonNullable<PlantRecord["rest_period"]>): TemplateResult {
  const { l } = ctx;
  const month = Number(ctx.today.slice(5, 7));
  const sentence = restSentence(l, rest, ctx.plant.care_tasks ?? [], ctx.today);
  const range = monthRange(l, rest.start_month, rest.end_month, "short");
  return html`<div class="restline">
    <ha-icon aria-hidden="true" icon="mdi:weather-night"></ha-icon>
    <div class="restline-main"><div class="restline-top"><span class="restline-title">${l.t("care_plan.rest_period")}</span>
        <span class="months" role="img" aria-label=${l.t("care_plan.rest_months_label", { months: monthRange(l, rest.start_month, rest.end_month) })}>${Array.from({ length: 12 }, (_, index) => index + 1).map(m => html`<i class="${inRestPeriod(rest, m) ? "on" : ""} ${m === month ? "now" : ""}">${monthName(l, m, "narrow")}</i>`)}</span>
        <span aria-hidden="true">${range}</span></div>
      <div class="restline-text"><b>${sentence.season}</b> · ${sentence.tasks}</div></div>
    <button type="button" class="btn text sm" ?disabled=${ctx.disabled} aria-label=${l.t("care_plan.rest_edit")} @click=${ctx.onRest}>${l.t("care_plan.edit")}</button>
  </div>`;
}

function taskRow(ctx: CarePlanContext, task: CareTask): TemplateResult {
  const { l } = ctx;
  const name = taskName(l, task);
  const state = ctx.overview?.care.find(item => item.task_id === task.id);
  const chip = state ? taskChip(l, state, task.schedule, ctx.today, { lastDoneAt: task.last_done_at, timeZone: ctx.timeZone }) : null;
  const done = lastDone(task, ctx.timeZone);
  const shortUntil = state ? forecastShortUntil(state, task.schedule, Date.now()) : null;
  const busy = ctx.disabled || ctx.pending.has(task.id);
  // Reading tasks have no Skip: the next reading decides when they are due.
  const actions: [TaskAction, string, string][] = [
    ["mark_done", "care_plan.menu_mark_done", "mdi:check-circle-outline"],
    ...task.schedule.kind === "reading" ? [] : [["skip", "care_plan.menu_skip", "mdi:skip-next-outline"] as [TaskAction, string, string]],
    ["edit", "care_plan.menu_edit", "mdi:pencil-outline"],
    ["automate", "care_plan.menu_automate", "mdi:robot-outline"],
    ["delete", "care_plan.menu_delete", "mdi:delete-outline"],
  ];
  return html`<li class="li task">
    <span class="ic tonal" aria-hidden="true"><ha-icon .icon=${TASK_ICONS[task.type]}></ha-icon></span>
    <span class="li-main"><span class="li-title">${name}</span>
      <span class="li-sub">${scheduleText(l, task.schedule, ctx.plant.rest_period ?? null, ctx.states)} · ${done ? l.t("care_plan.last_done", { date: shortDate(l, done, ctx.today) }) : l.t("care_plan.never_done")}${shortUntil ? html`<br>${forecastShortText(l, shortUntil, ctx.timeZone)}` : nothing}</span></span>
    <span class="task-side">${chip ? html`<span class="cchip tone-${chip.tone}"><ha-icon aria-hidden="true" .icon=${chip.icon}></ha-icon><span>${chip.text}</span></span>` : nothing}
      ${state?.is_due ? html`<button type="button" class="btn tonal sm" ?disabled=${busy} aria-label=${l.t("care_plan.done_label", { name })} @click=${() => ctx.onDone(task)}><ha-icon aria-hidden="true" icon="mdi:check"></ha-icon>${l.t("care_plan.done")}</button>` : nothing}</span>
    <ha-dropdown class="task-menu" @wa-select=${(e: CustomEvent<{ item: { value: string } }>) => ctx.onAction(task, e.detail.item.value as TaskAction)}>
      <button slot="trigger" type="button" class="icon-btn" ?disabled=${busy} aria-label=${l.t("care_plan.task_menu", { name })}><ha-icon aria-hidden="true" icon="mdi:dots-vertical"></ha-icon></button>
      ${actions.map(([value, key, icon]) => html`<ha-dropdown-item value=${value} ?disabled=${busy}>${l.t(key as Parameters<Localizer["t"]>[0])}<ha-icon slot="icon" icon=${icon}></ha-icon></ha-dropdown-item>`)}
    </ha-dropdown>
  </li>`;
}

// ---- Task editor ----

export interface TaskEditorState {
  step: 1 | 2;
  // The task being edited; null while adding.
  taskId: string | null;
  draft: TaskDraft;
  errors: DraftErrors;
  // Error reported by Home Assistant when saving.
  error: string;
  moreOpen: boolean;
  // The suggestion whose care text is shown in full in step 1.
  expanded?: CareTaskType | null;
  // "Any other sensor" is picked for a reading task.
  otherSensor?: boolean;
}

export interface TaskEditorContext {
  l: Localizer;
  plant: PlantRecord;
  // The plant's current readings, shown next to its sensors.
  overview?: PlantOverview | undefined;
  hass?: HomeAssistantLike | undefined;
  // Home Assistant states, for sensors that reading tasks can follow.
  states?: Record<string, HAState> | undefined;
  state: TaskEditorState;
  today: string;
  busy: boolean;
  onPreset: (type: CareTaskType) => void;
  onSuggestion: (type: CareTaskType, text: string) => void;
  // Opens step 2 with a prepared draft, such as winter protection from the
  // species' minimum temperature.
  onDraft: (draft: TaskDraft) => void;
  onEditor: (changes: Partial<TaskEditorState>) => void;
  onExpand: (type: CareTaskType | null) => void;
  onBack: () => void;
  onChange: (changes: Partial<TaskDraft>) => void;
  onMonth: (month: number) => void;
  onToggleMore: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function taskEditorTitle(l: Localizer, state: TaskEditorState): string {
  return l.t(state.taskId ? "care_plan.edit_title" : "care_plan.add_title");
}

export function renderTaskEditor(ctx: TaskEditorContext): TemplateResult {
  return ctx.state.step === 1 ? presetStep(ctx) : detailsStep(ctx);
}

function presetStep(ctx: TaskEditorContext): TemplateResult {
  const { l, plant } = ctx;
  const taken = existingTypes(plant.care_tasks ?? []);
  const suggestions = careSuggestions(plant);
  const minTemp = minTemperature(plant);
  const winter = minTemp === null ? null : winterDraft(plant, ctx.states, l);
  const species = plant.species?.snapshot.latin_name ?? plant.species?.snapshot.common_name ?? "";
  return html`<p class="muted">${l.t("care_plan.add_intro")}</p>
    ${suggestions.length || winter ? html`<section class="suggestions" aria-labelledby="suggestions-heading">
      <h4 id="suggestions-heading"><ha-icon aria-hidden="true" icon="mdi:auto-fix"></ha-icon><span>${l.t("care_plan.suggestions_for")} <i>${species}</i></span></h4>
      ${suggestions.map(({ type, text }) => {
        const name = l.t(`care_task_type.${type}`);
        const long = text.length > NOTE_CLAMP_CHARS;
        const open = ctx.state.expanded === type;
        return html`<div class="suggestion">
          <div class="suggestion-main"><span class="suggestion-source"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon>${l.t("care_plan.suggestion_source", { topic: l.t(type === "fertilize" ? "care_plan.note_fertilization" : "care_plan.note_pruning") })}</span>
            <q class=${long && !open ? "clamped" : ""} id="suggestion-${type}">${text}</q>
            ${long ? html`<button type="button" class="linkbtn" aria-expanded=${open ? "true" : "false"} aria-controls="suggestion-${type}" @click=${() => ctx.onExpand(open ? null : type)}>${l.t(open ? "care_plan.show_less" : "care_plan.show_more")}</button>` : nothing}</div>
          ${taken.has(type) ? html`<span class="small muted">${l.t("care_plan.preset_exists")}</span>`
            : html`<button type="button" class="btn tonal sm" ?disabled=${ctx.busy} @click=${() => ctx.onSuggestion(type, text)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("care_plan.suggestion_add", { name })}</button>`}
        </div>`;
      })}
      ${winter && minTemp !== null ? html`<div class="suggestion">
          <div class="suggestion-main"><span class="suggestion-source"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon>${l.t("care_plan.suggestion_source", { topic: l.t("care_plan.note_min_temperature") })}</span>
            <span class="suggestion-value">${l.t("care_plan.grows_above", { value: readingValue(l, minTemp, "°C") })}</span></div>
          ${taken.has("winter_protection") ? html`<span class="small muted">${l.t("care_plan.preset_exists")}</span>`
            : html`<button type="button" class="btn tonal sm" ?disabled=${ctx.busy} @click=${() => ctx.onDraft(winter)}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("care_plan.suggestion_add_winter")}</button>`}
        </div>` : nothing}</section>
      <span class="field-label">${l.t("care_plan.from_scratch")}</span>` : nothing}
    <div class="presets" role="list">${CARE_TASK_TYPES.map(type => {
      const exists = taken.has(type);
      const needsSource = !exists && type === "winter_protection" && winterSourceMissing(plant, ctx.states, l);
      const description = exists ? l.t("care_plan.preset_exists")
        : type === "custom" ? l.t("care_plan.preset_custom") : type === "winter_protection" ? l.t("care_plan.preset_winter") : scheduleText(l, scheduleOf(presetDraft(type)), plant.rest_period ?? null);
      return html`<div role="listitem"><button type="button" class="preset" ?disabled=${exists || ctx.busy} @click=${() => ctx.onPreset(type)}>
        <span class="ic tonal" aria-hidden="true"><ha-icon .icon=${TASK_ICONS[type]}></ha-icon></span>
        <span class="preset-text"><span class="preset-name">${l.t(`care_task_type.${type}`)}</span><span class="preset-d">${description}</span>
          ${needsSource ? html`<span class="preset-hint">${l.t("care_plan.preset_winter_needs_source")}</span>` : nothing}</span></button></div>`;
    })}</div>
    <div class="actions dialog-actions"><span class="spacer"></span><button type="button" @click=${ctx.onCancel}>${l.t("common.cancel")}</button></div>`;
}

// Care texts longer than this are clamped to three lines with Show more.
const NOTE_CLAMP_CHARS = 160;

// The reading picker, the condition and value, and the OpenPlantBook
// suggestion line of a reading task.
function readingFields(ctx: TaskEditorContext, err: (field: keyof DraftErrors) => string | undefined): TemplateResult {
  const { l, plant, state } = ctx;
  const draft = state.draft; const errors = state.errors; const states = ctx.states;
  const roles: ReadingSourceRole[] = plantReadingRoles(plant);
  // A task can follow a role whose sensors were removed since; keep it listed.
  if (draft.role && isSourceRole(draft.role) && !roles.includes(draft.role)) roles.push(draft.role);
  const forecast = isForecastDraft(draft) ? draft.forecast : null;
  const other = !draft.role && !forecast && (!!draft.entityId || !!state.otherSensor);
  const selected = draft.role ? `role:${draft.role}` : forecast ? `forecast:${forecast}` : other ? "other" : "";
  // The forecast group appears only with a weather entity that has a
  // forecast, or for a task that already reads one.
  const weather = forecastEntities(l, states);
  const showForecast = weather.length > 0 || !!forecast;
  const missing = forecastMissing(draft, states);
  const hours = draft.forecastHours;
  const forecastText = (reading: "low" | "high") => {
    const text = l.t(`care_plan.forecast_row_${reading}`, { window: forecastWindow(l, hours) });
    const current = draft.weatherEntityId ? forecastRowValue(plant, ctx.overview, state.taskId, { entity_id: draft.weatherEntityId, reading, hours }) : null;
    return current ? l.t("care_plan.reading_role_value", { role: text, value: readingValue(l, current.value, current.unit) }) : text;
  };
  // With several weather entities, or one the task reads that is no longer
  // offered, a weather entity picker follows the Reading picker.
  const listed = weather.some(s => s.entity_id === draft.weatherEntityId);
  const forecastGroup = weather.length === 1 && (listed || !forecast) ? l.t("care_plan.reading_group_forecast_entity", { name: sourceName(l, { entity_id: weather[0]!.entity_id }, states) }) : l.t("care_plan.reading_group_forecast");
  const pickForecast = (reading: "low" | "high", entityId: string | null) => {
    if (!entityId) return;
    ctx.onEditor({ otherSensor: false });
    ctx.onChange(pickSource(draft, { forecast: { entity_id: entityId, reading, hours } }, forecastUnit(entityId, states), plant));
  };
  const roleText = (role: ReadingSourceRole) => {
    const value = ctx.overview?.roles[role]?.value;
    return typeof value === "number" ? l.t("care_plan.reading_role_value", { role: readingLabel(l, role), value: readingValue(l, value, ROLE_UNITS[role]) }) : readingLabel(l, role);
  };
  const pick = (value: string) => {
    if (value === "other") { ctx.onEditor({ otherSensor: true }); ctx.onChange(pickSource(draft, null, null, plant)); return; }
    if (value === "forecast:low" || value === "forecast:high") {
      // Keep the chosen weather entity; else the only or first one.
      const keep = draft.weatherEntityId && weather.some(s => s.entity_id === draft.weatherEntityId) ? draft.weatherEntityId : null;
      pickForecast(value === "forecast:low" ? "low" : "high", keep ?? weather[0]?.entity_id ?? draft.weatherEntityId);
      return;
    }
    const role = value.slice(5);
    if (!isSourceRole(role)) return;
    ctx.onEditor({ otherSensor: false });
    ctx.onChange(pickSource(draft, { role }, ROLE_UNITS[role], plant));
  };
  const pickEntity = (entityId: string) => { if (entityId) ctx.onChange(pickSource(draft, { entity_id: entityId }, sourceUnit({ entity_id: entityId }, states), plant)); };
  const unit = draft.readingUnit ?? "";
  const suggestion = readingSuggestion(plant, draft, states);
  const value = parseNumber(draft.value);
  return html`<label>${l.t("care_plan.reading")}<select aria-invalid=${errors.source ? "true" : "false"} aria-describedby=${errors.source ? "task-source-error" : nothing} @change=${(e: Event) => pick((e.target as HTMLSelectElement).value)}>
      <option value="" disabled ?selected=${selected === ""}>${l.t("care_plan.reading_choose")}</option>
      ${roles.length ? html`<optgroup label=${l.t("care_plan.reading_group_plant")}>${roles.map(role => html`<option value="role:${role}" ?selected=${selected === `role:${role}`}>${roleText(role)}</option>`)}</optgroup>` : nothing}
      <optgroup label=${l.t("care_plan.reading_group_other")}><option value="other" ?selected=${selected === "other"}>${l.t("care_plan.reading_other")}</option></optgroup>
      ${showForecast ? html`<optgroup label=${forecastGroup}>${(["low", "high"] as const).map(reading => html`<option value="forecast:${reading}" ?selected=${selected === `forecast:${reading}`}>${forecastText(reading)}</option>`)}</optgroup>` : nothing}</select></label>
    ${other ? entityPicker(ctx, pickEntity) : nothing}
    ${forecast && (weather.length > 1 || !listed) ? weatherPicker(ctx, weather, missing, entityId => pickForecast(forecast, entityId)) : nothing}
    ${errors.source === "care_plan.error_weather_missing" ? nothing : fieldError("task-source-error", err("source"))}
    <div class="grid2">
      <label>${l.t("care_plan.due_when")}<select @change=${(e: Event) => ctx.onChange({ condition: (e.target as HTMLSelectElement).value === "above" ? "above" : "below" })}>
        <option value="below" ?selected=${draft.condition === "below"}>${l.t("care_plan.below")}</option>
        <option value="above" ?selected=${draft.condition === "above"}>${l.t("care_plan.above")}</option></select></label>
      <label>${l.t("care_plan.value")}<span class="suffix-field"><input type="text" inputmode="decimal" required .value=${draft.value} placeholder=${l.t("care_plan.value_placeholder")}
          aria-invalid=${errors.value ? "true" : "false"} aria-describedby=${errors.value ? "task-value-error" : nothing}
          @input=${(e: Event) => ctx.onChange({ value: (e.target as HTMLInputElement).value })}>${unit ? html`<span class="suffix">${unit}</span>` : nothing}</span></label></div>
    ${fieldError("task-value-error", err("value"))}
    ${suggestion === null ? nothing : value === suggestion
      ? html`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${l.t("care_plan.min_temp_applied")}</span></div>`
      : html`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${l.t("care_plan.min_temp_hint", { value: readingValue(l, suggestion, draft.readingUnit ?? "°C") })}</span>
          <button type="button" class="btn text sm" ?disabled=${ctx.busy} aria-label=${l.t("care_plan.min_temp_use_label", { value: readingValue(l, suggestion, draft.readingUnit ?? "°C") })} @click=${() => ctx.onChange({ value: String(suggestion) })}>${l.t("care_plan.min_temp_use")}</button></div>`}`;
}

// The weather entity of a forecast reading, shown when there are several to
// choose from or the chosen one is gone.
function weatherPicker(ctx: TaskEditorContext, weather: HAState[], missing: boolean, pick: (entityId: string) => void): TemplateResult {
  const { l } = ctx; const draft = ctx.state.draft; const states = ctx.states;
  const current = draft.weatherEntityId;
  const listed = !!current && weather.some(s => s.entity_id === current);
  return html`<label>${l.t("care_plan.weather_entity")}<select aria-invalid=${missing ? "true" : "false"} aria-describedby=${missing ? "task-weather-error" : nothing} @change=${(e: Event) => pick((e.target as HTMLSelectElement).value)}>
      ${current && !listed ? html`<option value="" disabled selected>${missing ? current : sourceName(l, { entity_id: current }, states)}</option>` : nothing}
      ${weather.map(s => html`<option value=${s.entity_id} ?selected=${s.entity_id === current}>${sourceName(l, { entity_id: s.entity_id }, states)}</option>`)}</select></label>
    ${missing ? fieldError("task-weather-error", l.t("care_plan.error_weather_missing")) : nothing}`;
}

// "Any other sensor": Home Assistant's entity picker limited to sensors with
// a numeric state, or a plain list when the picker is not available.
function entityPicker(ctx: TaskEditorContext, pick: (entityId: string) => void): TemplateResult {
  const { l } = ctx; const draft = ctx.state.draft; const states = ctx.states;
  const chosen = draft.entityId ? html`<span class="small muted chosen-sensor">${sourceName(l, { entity_id: draft.entityId }, states)} · <code>${draft.entityId}</code></span>` : nothing;
  if (isDefined("ha-entity-picker") && ctx.hass) {
    return html`<ha-entity-picker .hass=${ctx.hass} .label=${l.t("care_plan.reading_sensor")} .placeholder=${l.t("wizard.search_sensors")} .value=${draft.entityId ?? ""} .includeDomains=${["sensor"]}
      .entityFilter=${(s: HAState) => numericSensor(s)} @value-changed=${(e: CustomEvent<{ value?: string }>) => pick(e.detail.value ?? "")}></ha-entity-picker>${chosen}`;
  }
  const sensors = Object.values(states ?? {}).filter(numericSensor).sort((a, b) => sourceName(l, { entity_id: a.entity_id }, states).localeCompare(sourceName(l, { entity_id: b.entity_id }, states)));
  return html`<label>${l.t("care_plan.reading_sensor")}<select @change=${(e: Event) => pick((e.target as HTMLSelectElement).value)}>
    <option value="" disabled ?selected=${!draft.entityId}>${sensors.length ? l.t("care_plan.reading_choose") : l.t("care_plan.reading_no_sensors")}</option>
    ${sensors.map(s => html`<option value=${s.entity_id} ?selected=${s.entity_id === draft.entityId}>${sourceName(l, { entity_id: s.entity_id }, states)}</option>`)}</select></label>`;
}

// More options of a reading task: the "only after" delay (for a forecast,
// the look-ahead instead) and the value the reading must pass before the
// task can be due again.
function readingMore(ctx: TaskEditorContext, err: (field: keyof DraftErrors) => string | undefined): TemplateResult {
  const { l } = ctx; const draft = ctx.state.draft; const errors = ctx.state.errors;
  const unit = draft.readingUnit ?? "";
  const describe = (hint: string, error: boolean, id: string) => error ? `${hint} ${id}` : hint;
  const forecast = isForecastDraft(draft);
  return html`<div id="task-more"><div class="grid2">
      ${forecast ? html`<label>${l.t("care_plan.look_ahead")}<select aria-describedby="task-ahead-hint" @change=${(e: Event) => ctx.onChange({ forecastHours: Number((e.target as HTMLSelectElement).value) })}>
          ${FORECAST_HOURS.map(hours => html`<option value=${hours} ?selected=${draft.forecastHours === hours}>${l.t(`care_plan.look_ahead_${hours}`)}</option>`)}</select></label>`
        : html`<label>${l.t("care_plan.for_hours")}<span class="suffix-field"><input type="number" inputmode="decimal" min="0" max=${MAX_FOR_HOURS} step="any" .value=${draft.forHours}
          aria-invalid=${errors.forHours ? "true" : "false"} aria-describedby=${describe("task-for-hint", !!errors.forHours, "task-for-error")}
          @input=${(e: Event) => ctx.onChange({ forHours: (e.target as HTMLInputElement).value })}><span class="suffix">${l.t("care_plan.hours")}</span></span></label>`}
      <label>${l.t(draft.condition === "below" ? "care_plan.reset_after_above" : "care_plan.reset_after_below")}<span class="suffix-field"><input type="text" inputmode="decimal" .value=${draft.resetValue} placeholder=${draft.value.trim()}
          aria-invalid=${errors.resetValue ? "true" : "false"} aria-describedby=${describe("task-reset-hint", !!errors.resetValue, "task-reset-error")}
          @input=${(e: Event) => ctx.onChange({ resetValue: (e.target as HTMLInputElement).value })}>${unit ? html`<span class="suffix">${unit}</span>` : nothing}</span></label></div>
    ${forecast ? nothing : fieldError("task-for-error", err("forHours"))}${fieldError("task-reset-error", err("resetValue"))}
    ${forecast ? html`<span class="small muted" id="task-ahead-hint">${l.t("care_plan.look_ahead_hint")}</span>` : html`<span class="small muted" id="task-for-hint">${l.t("care_plan.for_hours_hint")}</span>`}
    <span class="small muted" id="task-reset-hint">${l.t("care_plan.reset_hint")}</span></div>`;
}

function scheduleOf(draft: TaskDraft) {
  return draft.mode === "yearly"
    ? { kind: "yearly" as const, start_month: draft.startMonth ?? 1, end_month: draft.endMonth ?? 1 }
    : { kind: "interval" as const, every: Number(draft.every), unit: draft.unit, growing_season_only: draft.growingSeasonOnly };
}

function fieldError(id: string, text: string | undefined) {
  return text ? html`<span class="error-text small" id=${id}>${text}</span>` : nothing;
}

function detailsStep(ctx: TaskEditorContext): TemplateResult {
  const { l, plant, state } = ctx;
  const draft = state.draft; const errors = state.errors;
  const err = (field: keyof DraftErrors) => { const key = errors[field]; return key ? l.t(key) : undefined; };
  const typeName = l.t(`care_task_type.${draft.type}`);
  const custom = draft.type === "custom";
  const rest = plant.rest_period ?? null;
  const selected = draft.startMonth !== null && draft.endMonth !== null ? new Set(monthsInRange(draft.startMonth, draft.endMonth)) : new Set<number>();
  const input = (e: Event) => (e.target as HTMLInputElement).value;
  const note = careNote(plant, draft.type);
  const reading = draft.mode === "reading";
  const moreOpen = state.moreOpen || !!errors.lastDone || !!errors.forHours || !!errors.resetValue;
  return html`${state.error ? html`<p class="error" role="alert">${state.error}</p>` : nothing}
    <div class="task-summary"><ha-icon aria-hidden="true" .icon=${TASK_ICONS[draft.type]}></ha-icon>
      <span><span class="summary-name">${draft.name.trim() || typeName}</span> · ${draftSummary(l, draft, rest, ctx.states)}</span></div>
    <label>${custom ? l.t("care_plan.name") : l.t("care_plan.name_optional")}
      <input type="text" maxlength=${TASK_NAME_MAX} .value=${draft.name} placeholder=${custom ? "" : typeName} ?required=${custom}
        aria-invalid=${errors.name ? "true" : "false"} aria-describedby=${errors.name ? "task-name-error" : nothing}
        @input=${(e: Event) => ctx.onChange({ name: input(e) })}></label>
    ${fieldError("task-name-error", err("name"))}
    <div class="field-group"><span class="field-label" id="task-mode-label">${l.t("care_plan.when_due")}</span>
      <div class="seg" role="group" aria-labelledby="task-mode-label">
        <button type="button" aria-pressed=${draft.mode === "interval" ? "true" : "false"} @click=${() => ctx.onChange({ mode: "interval" })}>${l.t("care_plan.mode_interval")}</button>
        <button type="button" aria-pressed=${draft.mode === "yearly" ? "true" : "false"} @click=${() => ctx.onChange({ mode: "yearly" })}>${l.t("care_plan.mode_yearly")}</button>
        <button type="button" aria-pressed=${reading ? "true" : "false"} @click=${() => ctx.onChange({ mode: "reading" })}>${l.t("care_plan.mode_reading")}</button></div></div>
    ${reading ? readingFields(ctx, err) : draft.mode === "interval" ? html`<div class="grid2">
        <label>${l.t("care_plan.every")}<input type="number" inputmode="numeric" min="1" max="999" step="1" .value=${draft.every}
          aria-invalid=${errors.every ? "true" : "false"} aria-describedby=${errors.every ? "task-every-error" : nothing}
          @input=${(e: Event) => ctx.onChange({ every: input(e) })}></label>
        <label>${l.t("care_plan.unit")}<select .value=${draft.unit} @change=${(e: Event) => ctx.onChange({ unit: (e.target as HTMLSelectElement).value as TaskDraft["unit"] })}>
          ${INTERVAL_UNITS.map(unit => html`<option value=${unit} ?selected=${unit === draft.unit}>${l.t(`care_plan.unit_${unit}`)}</option>`)}</select></label></div>
      ${fieldError("task-every-error", err("every"))}
      ${rest ? html`<div><label class="check"><input type="checkbox" aria-describedby="task-growing-hint" .checked=${draft.growingSeasonOnly} @change=${(e: Event) => ctx.onChange({ growingSeasonOnly: (e.target as HTMLInputElement).checked })}>
        <span>${l.t("care_plan.growing_only")}</span></label>
        <span class="small muted growing-hint" id="task-growing-hint">${l.t("care_plan.growing_only_hint", { months: monthRange(l, rest.start_month, rest.end_month) })}</span></div>` : nothing}`
    : html`<div class="field-group"><span class="field-label" id="task-months-label">${l.t("care_plan.months")}</span>
        <div class="monthpick" role="group" aria-labelledby="task-months-label" aria-describedby=${errors.months ? "task-months-error task-months-hint" : "task-months-hint"}>
          ${Array.from({ length: 12 }, (_, index) => index + 1).map(month => html`<button type="button" aria-pressed=${selected.has(month) ? "true" : "false"} aria-label=${monthName(l, month)} @click=${() => ctx.onMonth(month)}>${monthName(l, month, "short")}</button>`)}</div>
        <span class="small muted" id="task-months-hint">${l.t("care_plan.months_hint")}</span>
        ${fieldError("task-months-error", err("months"))}</div>`}
    <label>${l.t("care_plan.instructions")}<textarea rows=${draft.instructions.length > NOTE_CLAMP_CHARS ? 6 : 3} maxlength=${TASK_INSTRUCTIONS_MAX} .value=${draft.instructions} placeholder=${l.t("care_plan.instructions_placeholder")}
      aria-invalid=${errors.instructions ? "true" : "false"} aria-describedby=${errors.instructions ? "task-instructions-error" : nothing}
      @input=${(e: Event) => ctx.onChange({ instructions: (e.target as HTMLTextAreaElement).value })}></textarea></label>
    ${fieldError("task-instructions-error", err("instructions"))}
    ${note && !draft.instructions.trim() ? html`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${l.t("care_plan.note_hint")}</span>
        <button type="button" class="btn text sm" ?disabled=${ctx.busy} @click=${() => ctx.onChange({ instructions: note })}>${l.t("care_plan.note_use")}</button></div>`
      : note && draft.instructions === note ? html`<div class="note-hint small"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${l.t("care_plan.note_applied")}</span></div>` : nothing}
    <div class="more-options">
      <button type="button" class="btn text sm" aria-expanded=${moreOpen ? "true" : "false"} aria-controls="task-more" @click=${ctx.onToggleMore}>
        <ha-icon aria-hidden="true" icon=${moreOpen ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>${l.t("care_plan.more_options")}${reading && !moreOpen ? html`<span class="more-hint">&nbsp;· ${l.t(isForecastDraft(draft) ? "care_plan.more_options_forecast" : "care_plan.more_options_reading")}</span>` : nothing}</button>
      ${moreOpen && reading ? readingMore(ctx, err) : moreOpen ? html`<div id="task-more"><label>${l.t("care_plan.last_done_field")}
        <input type="date" max=${ctx.today} .value=${draft.lastDone} aria-invalid=${errors.lastDone ? "true" : "false"} aria-describedby="task-last-done-hint${errors.lastDone ? " task-last-done-error" : ""}"
          @input=${(e: Event) => ctx.onChange({ lastDone: input(e) })}></label>
        <span class="small muted" id="task-last-done-hint">${l.t("care_plan.last_done_hint")}</span>${fieldError("task-last-done-error", err("lastDone"))}</div>` : nothing}
    </div>
    <div class="actions dialog-actions">
      ${state.taskId ? html`<button type="button" class="danger-text" ?disabled=${ctx.busy} @click=${ctx.onDelete}>${l.t("care_plan.delete")}</button><span class="spacer"></span>` : html`<button type="button" ?disabled=${ctx.busy} @click=${ctx.onBack}>${l.t("care_plan.back")}</button><span class="spacer"></span>`}
      <button type="button" ?disabled=${ctx.busy} @click=${ctx.onCancel}>${l.t("common.cancel")}</button>
      <button type="button" class="primary" ?disabled=${ctx.busy || forecastMissing(draft, ctx.states)} @click=${ctx.onSave}>${l.t(state.taskId ? "care_plan.save" : "care_plan.add_task")}</button></div>`;
}

// ---- Rest period editor ----

export interface RestEditorContext {
  l: Localizer;
  plant: PlantRecord;
  draft: RestDraft;
  error: string;
  busy: boolean;
  onMonth: (month: number) => void;
  onToggle: (taskId: string, off: boolean) => void;
  onSave: () => void;
  onRemove: () => void;
  onCancel: () => void;
}

export function renderRestEditor(ctx: RestEditorContext): TemplateResult {
  const { l, plant, draft } = ctx;
  const repeating = (plant.care_tasks ?? []).filter(task => task.schedule.kind === "interval");
  const selected = draft.startMonth !== null && draft.endMonth !== null ? new Set(monthsInRange(draft.startMonth, draft.endMonth)) : new Set<number>();
  return html`<p class="muted">${l.t("care_plan.rest_intro")}</p>
    <p class="small muted">${l.t("care_plan.rest_watering")}</p>
    <div class="field-group"><span class="field-label" id="rest-months-label">${l.t("care_plan.rest_months")}</span>
      <div class="monthpick" role="group" aria-labelledby="rest-months-label" aria-describedby=${ctx.error ? "rest-error rest-months-hint" : "rest-months-hint"}>
        ${Array.from({ length: 12 }, (_, index) => index + 1).map(month => html`<button type="button" aria-pressed=${selected.has(month) ? "true" : "false"} aria-label=${monthName(l, month)} @click=${() => ctx.onMonth(month)}>${monthName(l, month, "short")}</button>`)}</div>
      <span class="small muted" id="rest-months-hint">${l.t("care_plan.months_hint")}</span>
      ${ctx.error ? html`<span class="error-text small" id="rest-error">${ctx.error}</span>` : nothing}</div>
    <fieldset class="rest-tasks"><legend class="field-label">${l.t("care_plan.rest_off_heading")}</legend>
      ${repeating.length ? repeating.map(task => html`<div><label class="check"><input type="checkbox" .checked=${draft.off.has(task.id)} aria-describedby="rest-task-${task.id}"
          @change=${(e: Event) => ctx.onToggle(task.id, (e.target as HTMLInputElement).checked)}><span>${taskName(l, task)}</span></label>
          <span class="small muted growing-hint" id="rest-task-${task.id}">${scheduleText(l, task.schedule, null)}</span></div>`)
        : html`<p class="small muted">${l.t("care_plan.rest_no_repeating")}</p>`}
      <p class="small muted">${l.t("care_plan.rest_yearly_note")}</p></fieldset>
    <div class="actions dialog-actions">
      ${plant.rest_period ? html`<button type="button" class="danger-text" ?disabled=${ctx.busy} @click=${ctx.onRemove}>${l.t("care_plan.rest_remove")}</button>` : nothing}<span class="spacer"></span>
      <button type="button" ?disabled=${ctx.busy} @click=${ctx.onCancel}>${l.t("common.cancel")}</button>
      <button type="button" class="primary" ?disabled=${ctx.busy} @click=${ctx.onSave}>${l.t("care_plan.save")}</button></div>`;
}

// ---- Automate… ----

export interface AutomateRow { icon: string; entityId: string | null; description: string; note?: string }
export interface AutomateContext {
  l: Localizer;
  rows: AutomateRow[];
  onCopy: (entityId: string) => void;
  onOpenEditor: () => void;
  onClose: () => void;
}

export function renderAutomate(ctx: AutomateContext): TemplateResult {
  const { l } = ctx;
  return html`<p class="muted">${l.t("care_plan.automate_intro")}</p>
    <ul class="list automate-list">${ctx.rows.map(row => html`<li class="li"><span class="ic tonal" aria-hidden="true"><ha-icon .icon=${row.icon}></ha-icon></span>
      <span class="li-main"><span class="li-title">${row.entityId ? html`<code>${row.entityId}</code>` : l.t("care_plan.automate_missing")}</span>
        <span class="li-sub">${row.description}${row.note ? html`<br>${row.note}` : nothing}</span></span>
      ${row.entityId ? html`<button type="button" class="icon-btn" aria-label=${l.t("care_plan.copy", { entity: row.entityId })} @click=${() => ctx.onCopy(row.entityId as string)}><ha-icon aria-hidden="true" icon="mdi:content-copy"></ha-icon></button>` : html`<span></span>`}</li>`)}</ul>
    <p class="small automate-hint"><ha-icon aria-hidden="true" icon="mdi:lightbulb-outline"></ha-icon><span>${l.t("care_plan.automate_action_before")}<code>smart_plants.log_care</code>${l.t("care_plan.automate_action_after")}</span></p>
    <div class="actions dialog-actions"><span class="spacer"></span><button type="button" @click=${ctx.onClose}>${l.t("care_plan.close")}</button>
      <button type="button" class="primary" @click=${ctx.onOpenEditor}>${l.t("care_plan.open_automation_editor")}</button></div>`;
}

export const carePlanStyles = css`
  .care-plan .task { grid-template-columns: 40px minmax(0, 1fr) auto 40px; }
  .care-plan .task-side { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
  .cchip { display: inline-flex; align-items: center; gap: 4px; min-height: 26px; padding: 2px 10px 2px 7px; border-radius: 13px; font-size: 13px; font-weight: 500; line-height: 1.3; max-width: 100%; }
  .cchip ha-icon { --mdc-icon-size: 16px; }
  .cchip.tone-care { background: color-mix(in srgb, var(--sp-care) 15%, transparent); color: color-mix(in srgb, var(--sp-care) 55%, var(--sp-text)); }
  .cchip.tone-overdue { background: color-mix(in srgb, var(--sp-error) 15%, transparent); color: color-mix(in srgb, var(--sp-error) 55%, var(--sp-text)); }
  .cchip.tone-later, .cchip.tone-resting { background: color-mix(in srgb, var(--sp-text) 7%, transparent); color: color-mix(in srgb, var(--sp-text-secondary) 55%, var(--sp-text)); }
  .cchip.tone-done { background: color-mix(in srgb, var(--sp-success) 15%, transparent); color: color-mix(in srgb, var(--sp-success) 55%, var(--sp-text)); }
  .care-note { display: flex; align-items: center; gap: 6px; }
  .care-plan-actions { gap: 0; }
  .restline { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 4px 10px; align-items: start; padding: 0 8px 12px 16px; font-size: 13px; color: var(--sp-text-secondary); }
  .restline > ha-icon { --mdc-icon-size: 18px; margin-top: 2px; }
  .restline-top { display: flex; align-items: center; gap: 4px 10px; flex-wrap: wrap; }
  .restline-title, .restline-text b { font-weight: 500; color: var(--sp-text); }
  .restline-text { margin-top: 4px; }
  .months { display: inline-flex; gap: 2px; }
  .months i { font-style: normal; width: 18px; height: 18px; border-radius: 4px; display: grid; place-items: center; font-size: 10.5px; background: color-mix(in srgb, var(--sp-text) 7%, transparent); color: color-mix(in srgb, var(--sp-text-secondary) 55%, var(--sp-text)); }
  .months i.on { background: color-mix(in srgb, var(--sp-care) 18%, transparent); color: color-mix(in srgb, var(--sp-care) 55%, var(--sp-text)); font-weight: 500; }
  .months i.now { box-shadow: inset 0 0 0 1.5px var(--sp-text-secondary); }
  .pd .care-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .care-kind { display: flex; flex-direction: column; gap: 2px; margin: 8px 0; }
  .care-note ha-icon { --mdc-icon-size: 18px; color: color-mix(in srgb, var(--sp-care) 55%, var(--sp-text)); }

  dialog.care-dialog { width: min(560px, calc(100vw - 32px)); }
  .care-dialog .dialog-body { display: flex; flex-direction: column; gap: 12px; }
  .care-dialog label { margin: 0; }
  .care-dialog textarea { width: 100%; resize: vertical; max-height: 40vh; overflow-y: auto; }
  .care-dialog .suggestions { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 12px; overflow: hidden; padding: 0; margin: 0; }
  .care-dialog .suggestions h4 { display: flex; align-items: center; gap: 8px; margin: 0; padding: 10px 14px; font-size: 13.5px; font-weight: 500; background: color-mix(in srgb, var(--sp-primary) 10%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
  .care-dialog .suggestions h4 ha-icon { --mdc-icon-size: 18px; }
  .care-dialog .suggestion { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; align-items: start; padding: 12px 14px; }
  .care-dialog .suggestion + .suggestion { border-top: 1px solid var(--divider-color, #e0e0e0); }
  .care-dialog .suggestion-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .care-dialog .suggestion-source { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--sp-text-secondary); }
  .care-dialog .suggestion-source ha-icon, .care-dialog .note-hint ha-icon { --mdc-icon-size: 16px; color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); }
  .care-dialog .suggestion q { font-size: 14px; overflow-wrap: anywhere; }
  .care-dialog .suggestion-value { font-size: 14px; font-weight: 500; }
  .care-dialog .suggestion q.clamped { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden; }
  .care-dialog .linkbtn { align-self: flex-start; padding: 0; min-height: 24px; border: 0; background: none; color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: underline; }
  .care-dialog .note-hint { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; color: var(--sp-text-secondary); margin-top: -4px; }
  .care-dialog .note-hint .btn { margin-inline-start: -4px; }
  .care-dialog .dialog-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
  .care-dialog .dialog-actions .spacer { flex: 1; }
  .care-dialog .error-text { display: block; color: color-mix(in srgb, var(--sp-error) 75%, var(--sp-text)); }
  .care-dialog .danger-text { color: color-mix(in srgb, var(--sp-error) 60%, var(--sp-text)); }
  .care-dialog .presets { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .care-dialog button.preset { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 12px; align-items: center; width: 100%; height: 100%; text-align: start; padding: 10px 12px; border-radius: 12px; background: var(--ha-card-background, var(--sp-card)); }
  .care-dialog button.preset:disabled { opacity: .6; cursor: default; }
  .care-dialog .preset-text { display: flex; flex-direction: column; min-width: 0; }
  .care-dialog .preset-name { font-weight: 500; }
  .care-dialog .preset-d { font-size: 12.5px; color: var(--sp-text-secondary); }
  .care-dialog .preset-hint { margin-top: 2px; font-size: 12px; color: var(--sp-text-secondary); }
  .care-dialog .task-summary { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--sp-text) 6%, transparent); }
  .care-dialog .summary-name { font-weight: 500; }
  .care-dialog .field-group { display: flex; flex-direction: column; gap: 6px; }
  .care-dialog .field-label { font-size: 14px; }
  .care-dialog .seg { display: flex; }
  .care-dialog .seg button { flex: 1; min-height: 40px; }
  .care-dialog .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: start; }
  .care-dialog .monthpick { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 4px; }
  .care-dialog .monthpick button { min-height: 40px; padding: 4px 0; font-size: 12.5px; border-radius: 8px; }
  .care-dialog .monthpick button[aria-pressed="true"], .care-dialog .seg button[aria-pressed="true"] { background: color-mix(in srgb, var(--sp-primary) 14%, transparent); color: color-mix(in srgb, var(--sp-primary) 60%, var(--sp-text)); border-color: transparent; font-weight: 500; }
  .care-dialog .check { align-items: flex-start; }
  .care-dialog .growing-hint { display: block; margin-inline-start: 34px; }
  .care-dialog #task-more { display: flex; flex-direction: column; gap: 4px; }
  .care-dialog .more-options .btn { margin-inline-start: -14px; }
  .care-dialog .more-hint { font-weight: 400; color: var(--sp-text-secondary); }
  .care-dialog #task-more .grid2 { margin-bottom: 4px; }
  .care-dialog .suffix-field { position: relative; display: block; }
  .care-dialog .suffix-field input { width: 100%; padding-inline-end: 56px; }
  .care-dialog .suffix-field .suffix { position: absolute; inset-inline-end: 12px; top: 50%; transform: translateY(-50%); color: var(--sp-text-secondary); pointer-events: none; }
  .care-dialog .chosen-sensor { overflow-wrap: anywhere; }
  .care-dialog .rest-tasks { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .care-dialog .rest-tasks legend { padding: 0; margin-bottom: 6px; }
  .care-dialog .automate-list { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 12px; }
  .care-dialog .automate-hint { display: flex; gap: 8px; align-items: flex-start; }
  @media (max-width: 600px) {
    .care-dialog .presets { grid-template-columns: minmax(0, 1fr); }
    .care-dialog .suggestion { grid-template-columns: minmax(0, 1fr); }
    .care-dialog .monthpick { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .care-dialog #task-more .grid2 { grid-template-columns: minmax(0, 1fr); }
  }
  @container plant (max-width: 700px) {
    .care-plan .task { grid-template-columns: 40px minmax(0, 1fr) 40px; align-items: start; }
    .care-plan .task-side { grid-column: 2 / -1; grid-row: 2; justify-content: flex-start; }
    .care-plan .task-menu { grid-column: 3; grid-row: 1; }
    .restline { grid-template-columns: 20px minmax(0, 1fr); }
    .restline > .btn { grid-column: 2; justify-self: start; margin-inline-start: -12px; }
  }
`;
