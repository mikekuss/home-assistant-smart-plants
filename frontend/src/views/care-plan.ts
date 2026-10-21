// Care plan card on the plant's Care tab, the care task editor and the
// Automate… sheet. Pure render functions: the panel owns state and writes.
import { css, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { CARE_TASK_TYPES, INTERVAL_UNITS, MAX_CARE_TASKS, TASK_ICONS, TASK_INSTRUCTIONS_MAX, TASK_NAME_MAX, careNote, careSuggestions, draftSummary, existingTypes, inRestPeriod, lastDone, monthName, monthRange, monthsInRange, presetDraft, restSentence, scheduleText, shortDate, taskChip, taskName } from "../care-plan.js";
import type { DraftErrors, RestDraft, TaskDraft } from "../care-plan.js";
import type { Localizer } from "../localize.js";
import type { PlantOverview } from "../overview-model.js";
import type { CareTask, CareTaskType, PlantRecord } from "../types.js";

export type TaskAction = "mark_done" | "skip" | "edit" | "automate" | "delete";

export interface CarePlanContext {
  l: Localizer;
  plant: PlantRecord;
  overview: PlantOverview | undefined;
  // Today in the Home Assistant time zone (YYYY-MM-DD).
  today: string;
  timeZone?: string | undefined;
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
      : html`<div class="card-b"><p class="muted">${l.t("care_plan.empty")}</p>
          ${careSuggestions(plant).length ? html`<p class="small muted care-note"><ha-icon aria-hidden="true" icon="mdi:book-open-variant"></ha-icon><span>${l.t("care_plan.empty_suggestions")}</span></p>` : nothing}
          <div><button type="button" class="btn filled" ?disabled=${ctx.disabled} @click=${ctx.onAdd}><ha-icon aria-hidden="true" icon="mdi:plus"></ha-icon>${l.t("care_plan.add_task")}</button></div></div>`}
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
  const chip = state ? taskChip(l, state, task.schedule, ctx.today) : null;
  const done = lastDone(task, ctx.timeZone);
  const busy = ctx.disabled || ctx.pending.has(task.id);
  const actions: [TaskAction, string, string][] = [
    ["mark_done", "care_plan.menu_mark_done", "mdi:check-circle-outline"],
    ["skip", "care_plan.menu_skip", "mdi:skip-next-outline"],
    ["edit", "care_plan.menu_edit", "mdi:pencil-outline"],
    ["automate", "care_plan.menu_automate", "mdi:robot-outline"],
    ["delete", "care_plan.menu_delete", "mdi:delete-outline"],
  ];
  return html`<li class="li task">
    <span class="ic tonal" aria-hidden="true"><ha-icon .icon=${TASK_ICONS[task.type]}></ha-icon></span>
    <span class="li-main"><span class="li-title">${name}</span>
      <span class="li-sub">${scheduleText(l, task.schedule, ctx.plant.rest_period ?? null)} · ${done ? l.t("care_plan.last_done", { date: shortDate(l, done, ctx.today) }) : l.t("care_plan.never_done")}</span></span>
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
}

export interface TaskEditorContext {
  l: Localizer;
  plant: PlantRecord;
  state: TaskEditorState;
  today: string;
  busy: boolean;
  onPreset: (type: CareTaskType) => void;
  onSuggestion: (type: CareTaskType, text: string) => void;
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
  const species = plant.species?.snapshot.latin_name ?? plant.species?.snapshot.common_name ?? "";
  return html`<p class="muted">${l.t("care_plan.add_intro")}</p>
    ${suggestions.length ? html`<section class="suggestions" aria-labelledby="suggestions-heading">
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
      })}</section>
      <span class="field-label">${l.t("care_plan.from_scratch")}</span>` : nothing}
    <div class="presets" role="list">${CARE_TASK_TYPES.map(type => {
      const exists = taken.has(type);
      const description = exists ? l.t("care_plan.preset_exists")
        : type === "custom" ? l.t("care_plan.preset_custom") : scheduleText(l, scheduleOf(presetDraft(type)), plant.rest_period ?? null);
      return html`<div role="listitem"><button type="button" class="preset" ?disabled=${exists || ctx.busy} @click=${() => ctx.onPreset(type)}>
        <span class="ic tonal" aria-hidden="true"><ha-icon .icon=${TASK_ICONS[type]}></ha-icon></span>
        <span class="preset-text"><span class="preset-name">${l.t(`care_task_type.${type}`)}</span><span class="preset-d">${description}</span></span></button></div>`;
    })}</div>
    <div class="actions dialog-actions"><span class="spacer"></span><button type="button" @click=${ctx.onCancel}>${l.t("common.cancel")}</button></div>`;
}

// Care texts longer than this are clamped to three lines with Show more.
const NOTE_CLAMP_CHARS = 160;

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
  return html`${state.error ? html`<p class="error" role="alert">${state.error}</p>` : nothing}
    <div class="task-summary"><ha-icon aria-hidden="true" .icon=${TASK_ICONS[draft.type]}></ha-icon>
      <span><span class="summary-name">${draft.name.trim() || typeName}</span> · ${draftSummary(l, draft, rest)}</span></div>
    <label>${custom ? l.t("care_plan.name") : l.t("care_plan.name_optional")}
      <input type="text" maxlength=${TASK_NAME_MAX} .value=${draft.name} placeholder=${custom ? "" : typeName} ?required=${custom}
        aria-invalid=${errors.name ? "true" : "false"} aria-describedby=${errors.name ? "task-name-error" : nothing}
        @input=${(e: Event) => ctx.onChange({ name: input(e) })}></label>
    ${fieldError("task-name-error", err("name"))}
    <div class="field-group"><span class="field-label" id="task-mode-label">${l.t("care_plan.when_due")}</span>
      <div class="seg" role="group" aria-labelledby="task-mode-label">
        <button type="button" aria-pressed=${draft.mode === "interval" ? "true" : "false"} @click=${() => ctx.onChange({ mode: "interval" })}>${l.t("care_plan.mode_interval")}</button>
        <button type="button" aria-pressed=${draft.mode === "yearly" ? "true" : "false"} @click=${() => ctx.onChange({ mode: "yearly" })}>${l.t("care_plan.mode_yearly")}</button></div></div>
    ${draft.mode === "interval" ? html`<div class="grid2">
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
      <button type="button" class="btn text sm" aria-expanded=${state.moreOpen || errors.lastDone ? "true" : "false"} aria-controls="task-more" @click=${ctx.onToggleMore}>
        <ha-icon aria-hidden="true" icon=${state.moreOpen || errors.lastDone ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>${l.t("care_plan.more_options")}</button>
      ${state.moreOpen || errors.lastDone ? html`<div id="task-more"><label>${l.t("care_plan.last_done_field")}
        <input type="date" max=${ctx.today} .value=${draft.lastDone} aria-invalid=${errors.lastDone ? "true" : "false"} aria-describedby="task-last-done-hint${errors.lastDone ? " task-last-done-error" : ""}"
          @input=${(e: Event) => ctx.onChange({ lastDone: input(e) })}></label>
        <span class="small muted" id="task-last-done-hint">${l.t("care_plan.last_done_hint")}</span>${fieldError("task-last-done-error", err("lastDone"))}</div>` : nothing}
    </div>
    <div class="actions dialog-actions">
      ${state.taskId ? html`<button type="button" class="danger-text" ?disabled=${ctx.busy} @click=${ctx.onDelete}>${l.t("care_plan.delete")}</button><span class="spacer"></span>` : html`<button type="button" ?disabled=${ctx.busy} @click=${ctx.onBack}>${l.t("care_plan.back")}</button><span class="spacer"></span>`}
      <button type="button" ?disabled=${ctx.busy} @click=${ctx.onCancel}>${l.t("common.cancel")}</button>
      <button type="button" class="primary" ?disabled=${ctx.busy} @click=${ctx.onSave}>${l.t(state.taskId ? "care_plan.save" : "care_plan.add_task")}</button></div>`;
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
  .care-dialog .rest-tasks { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .care-dialog .rest-tasks legend { padding: 0; margin-bottom: 6px; }
  .care-dialog .automate-list { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 12px; }
  .care-dialog .automate-hint { display: flex; gap: 8px; align-items: flex-start; }
  @media (max-width: 600px) {
    .care-dialog .presets { grid-template-columns: minmax(0, 1fr); }
    .care-dialog .suggestion { grid-template-columns: minmax(0, 1fr); }
    .care-dialog .monthpick { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  }
  @container plant (max-width: 700px) {
    .care-plan .task { grid-template-columns: 40px minmax(0, 1fr) 40px; align-items: start; }
    .care-plan .task-side { grid-column: 2; grid-row: 2; justify-content: flex-start; }
    .care-plan .task-menu { grid-column: 3; grid-row: 1; }
    .restline { grid-template-columns: 20px minmax(0, 1fr); }
    .restline > .btn { grid-column: 2; justify-self: start; margin-inline-start: -12px; }
  }
`;
