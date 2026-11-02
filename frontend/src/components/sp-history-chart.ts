import { LitElement, css, html, nothing, svg } from "lit";
import { property, state } from "lit/decorators.js";
import { ENGLISH } from "../localize.js";
import type { Localizer } from "../localize.js";
import { segments, timeTicks, valueScale } from "../history-model.js";
import type { HistoryPoint } from "../history-model.js";
import { formatValue } from "../status.js";
import { srOnly, themeFallbacks } from "./shared-styles.js";

const HEIGHT = 200;
const PAD = { top: 10, right: 12, bottom: 24, left: 46 };

export interface ChartBand { min: number | null; max: number | null; target: number | null }
// A kind of event marked on the chart, with its legend text and colour.
export interface ChartMarkerGroup { key: string; label: string; color: string }
export interface ChartMarker { t: number; group: string }
// A button offered for a pinned point; "point-action" carries its key.
export interface ChartAction { key: string; label: string }

// One reading over time: the mean as a line, the spread of each period as a
// faint area, the target range as a band and care events as vertical markers,
// one colour per group.
// Pointing at the chart, or moving the hidden slider with the keyboard, reads
// out one point below it. Clicking the chart, or pressing Enter on the slider,
// pins that point until Escape, a click outside or a click on the same point;
// with actions set, a pinned point offers a button for each that fires
// "point-action" with the point's time and the action's key.
export class SpHistoryChart extends LitElement {
  static styles = [themeFallbacks, srOnly, css`
    :host { display: block; color: var(--sp-text); }
    .plot { position: relative; border-radius: 4px; }
    .plot:focus-within { outline: 2px solid var(--sp-primary); outline-offset: 2px; }
    svg { display: block; width: 100%; height: ${HEIGHT}px; touch-action: pan-y; }
    text { font-size: 11px; fill: var(--sp-text-secondary); font-variant-numeric: tabular-nums; }
    .grid { stroke: color-mix(in srgb, var(--sp-text) 12%, transparent); stroke-width: 1; }
    .band { fill: color-mix(in srgb, var(--sp-success) 14%, transparent); }
    .limit { stroke: color-mix(in srgb, var(--sp-success) 60%, var(--sp-text)); stroke-width: 1; opacity: .7; }
    .target { stroke-dasharray: 4 4; }
    .spread { fill: color-mix(in srgb, var(--sp-primary) 16%, transparent); }
    .line { fill: none; stroke: var(--sp-primary); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .marker { stroke-width: 1.5; stroke-dasharray: 2 3; }
    .cursor { stroke: color-mix(in srgb, var(--sp-text) 45%, transparent); stroke-width: 1; }
    .cursor-dot { fill: var(--sp-card); stroke: var(--sp-primary); stroke-width: 2; }
    .readout-row { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 12px; min-height: 28px; margin-top: 2px; }
    .readout { font-size: 13px; font-variant-numeric: tabular-nums; }
    .action { padding: 2px 6px; border: 0; border-radius: 4px; background: none; color: var(--sp-primary); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
    .action:hover { background: color-mix(in srgb, var(--sp-primary) 10%, transparent); }
    .action:focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 1px; }
    .legend { display: flex; flex-wrap: wrap; gap: 2px 16px; margin-top: 4px; font-size: 12px; color: var(--sp-text-secondary); }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .key { display: inline-block; width: 14px; height: 8px; border-radius: 2px; }
    .key.band { background: color-mix(in srgb, var(--sp-success) 30%, transparent); }
    .key.spread { background: color-mix(in srgb, var(--sp-primary) 30%, transparent); }
    .key.marker { width: 8px; border-radius: 50%; }
  `];

  @property({ attribute: false }) public points: HistoryPoint[] = [];
  // Time axis in epoch milliseconds.
  @property({ attribute: false }) public start = 0;
  @property({ attribute: false }) public end = 0;
  @property({ attribute: false }) public periodMs = 3_600_000;
  @property() public unit = "";
  @property({ attribute: false }) public band: ChartBand | null = null;
  @property({ attribute: false }) public markers: readonly ChartMarker[] = [];
  // Groups in legend order; markers of a group not listed are not drawn.
  @property({ attribute: false }) public markerGroups: readonly ChartMarkerGroup[] = [];
  // Sentence describing the whole chart for screen readers.
  @property() public summary = "";
  @property() public bandLabel = "";
  // Buttons offered for a pinned point; none when empty.
  @property({ attribute: false }) public actions: readonly ChartAction[] = [];
  @property({ attribute: false }) public l: Localizer = ENGLISH;
  @state() private _width = 600;
  @state() private _active: number | null = null;
  @state() private _pinned = false;
  private _observer: ResizeObserver | undefined;
  private readonly _outside = (e: Event) => { if (this._pinned && !e.composedPath().includes(this)) this._unpin(); };

  connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver === "undefined") return;
    this._observer = new ResizeObserver(entries => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      if (width > 0 && width !== this._width) this._width = width;
    });
    this._observer.observe(this);
  }
  disconnectedCallback(): void { this._observer?.disconnect(); this._observer = undefined; document.removeEventListener("pointerdown", this._outside); super.disconnectedCallback(); }

  // The panel hands over a new array on every Home Assistant update, often with
  // the same buckets and only a fresher live value, so the point read out stays
  // until the series itself changes: another range, reading or set of buckets.
  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (this._active === null) return;
    const before = changed.get("points") as HistoryPoint[] | undefined;
    const replaced = changed.has("points") && (!before || before.length !== this.points.length || before[0]?.t !== this.points[0]?.t);
    if (replaced || changed.has("periodMs") || changed.has("unit") || this._active >= this.points.length) { this._active = null; this._unpin(); }
  }

  private _pin(index: number | null): void {
    this._active = index;
    this._pinned = index !== null;
    if (this._pinned) document.addEventListener("pointerdown", this._outside);
  }
  private _unpin(): void {
    this._pinned = false;
    document.removeEventListener("pointerdown", this._outside);
  }

  private _pointText(point: HistoryPoint): string {
    const l = this.l;
    const value = (v: number) => formatValue(l, Math.round(v * 10) / 10, this.unit);
    const time = l.dateTime(new Date(point.t).toISOString());
    const spread = point.max - point.min >= 0.1;
    return spread ? l.t("history.point_spread", { time, value: value(point.mean), min: l.number(Math.round(point.min * 10) / 10), max: value(point.max) })
      : l.t("history.point", { time, value: value(point.mean) });
  }

  private _nearest(clientX: number): number | null {
    const box = this.shadowRoot?.querySelector("svg")?.getBoundingClientRect();
    if (!box || !box.width || !this.points.length) return null;
    const inner = box.width - PAD.left - PAD.right;
    const t = this.start + ((clientX - box.left - PAD.left) / inner) * (this.end - this.start);
    let best = 0;
    for (let i = 1; i < this.points.length; i++) if (Math.abs(this.points[i]!.t - t) < Math.abs(this.points[best]!.t - t)) best = i;
    return best;
  }

  private _fire(t: number, key: string): void {
    this._unpin();
    this.dispatchEvent(new CustomEvent<{ t: number; key: string }>("point-action", { detail: { t, key }, bubbles: true, composed: true }));
  }

  protected render() {
    const l = this.l; const points = this.points;
    const width = Math.max(this._width, 240); const inner = width - PAD.left - PAD.right; const bottom = HEIGHT - PAD.bottom;
    const band = this.band;
    const scale = valueScale(points, [band?.min, band?.max, band?.target], this.unit);
    const span = Math.max(this.end - this.start, 1);
    const x = (t: number) => PAD.left + ((t - this.start) / span) * inner;
    const y = (v: number) => bottom - ((Math.min(scale.max, Math.max(scale.min, v)) - scale.min) / (scale.max - scale.min)) * (bottom - PAD.top);
    const at = (t: number, v: number) => `${x(t).toFixed(1)} ${y(v).toFixed(1)}`;
    const runs = segments(points, this.periodMs);
    const visible = (v: number | null | undefined): v is number => v !== null && v !== undefined && v >= scale.min && v <= scale.max;
    // The band reaches the chart edge on a side without a bound or with one outside the axis.
    const bandTop = band && (band.min !== null || band.max !== null) ? y(band.max ?? scale.max) : null;
    const bandBottom = band && (band.min !== null || band.max !== null) ? y(band.min ?? scale.min) : null;
    const compact = scale.max >= 10000;
    const allTicks = timeTicks(this.start, this.end, l.language);
    const every = Math.max(1, Math.ceil((allTicks.length * 52) / inner));
    const ticks = allTicks.filter((_, index) => (allTicks.length - 1 - index) % every === 0);
    const groups = new Map(this.markerGroups.map(group => [group.key, group]));
    const markers = this.markers.filter(m => m.t >= this.start && m.t <= this.end && groups.has(m.group));
    const shown = this.markerGroups.filter(group => markers.some(m => m.group === group.key));
    const active = this._active !== null ? points[this._active] : undefined;
    const showSpread = points.some(p => p.max - p.min >= 0.1);
    const move = (e: PointerEvent) => { if (!this._pinned) this._active = this._nearest(e.clientX); };
    const down = (e: PointerEvent) => {
      const index = this._nearest(e.clientX);
      if (this._pinned && index === this._active) { this._unpin(); return; }
      this._pin(index);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Enter" && points.length) { e.preventDefault(); this._pin(this._active ?? points.length - 1); }
      else if (e.key === "Escape" && this._pinned) { e.stopPropagation(); this._unpin(); }
    };
    const actions = this._pinned && active ? this.actions : [];
    return html`
      <div class="plot" @keydown=${key}>
        <svg viewBox="0 0 ${width} ${HEIGHT}" role="img" aria-label=${this.summary}
          @pointermove=${move} @pointerdown=${down} @pointerleave=${() => { if (!this._pinned) this._active = null; }}>
          ${bandTop !== null && bandBottom !== null && bandBottom > bandTop ? svg`<rect class="band" x=${PAD.left} y=${bandTop} width=${inner} height=${bandBottom - bandTop}></rect>` : nothing}
          ${scale.ticks.map(tick => svg`<line class="grid" x1=${PAD.left} x2=${width - PAD.right} y1=${y(tick)} y2=${y(tick)}></line>
            <text x=${PAD.left - 6} y=${y(tick) + 4} text-anchor="end">${l.number(tick, compact ? { notation: "compact" } : {})}</text>`)}
          ${[band?.min, band?.max].filter(visible).map(limit => svg`<line class="limit" x1=${PAD.left} x2=${width - PAD.right} y1=${y(limit)} y2=${y(limit)}></line>`)}
          ${visible(band?.target) ? svg`<line class="limit target" x1=${PAD.left} x2=${width - PAD.right} y1=${y(band!.target!)} y2=${y(band!.target!)}></line>` : nothing}
          ${ticks.map(tick => svg`<text x=${x(tick.t)} y=${HEIGHT - 6} text-anchor="middle">${tick.label}</text>`)}
          ${showSpread ? runs.filter(run => run.length > 1).map(run => svg`<path class="spread" d=${`M${run.map(p => at(p.t, p.max)).join("L")}L${[...run].reverse().map(p => at(p.t, p.min)).join("L")}Z`}></path>`) : nothing}
          ${runs.map(run => run.length > 1
            ? svg`<path class="line" d=${`M${run.map(p => at(p.t, p.mean)).join("L")}`}></path>`
            : svg`<circle class="marker-dot" style="fill: var(--sp-primary)" cx=${x(run[0]!.t)} cy=${y(run[0]!.mean)} r="2"></circle>`)}
          ${markers.map(m => { const group = groups.get(m.group)!; return svg`<g><title>${group.label}: ${l.dateTime(new Date(m.t).toISOString())}</title><line class="marker" style=${`stroke: ${group.color}`} x1=${x(m.t)} x2=${x(m.t)} y1=${PAD.top + 6} y2=${bottom}></line><circle class="marker-dot" style=${`fill: ${group.color}`} cx=${x(m.t)} cy=${PAD.top + 3} r="3.5"></circle></g>`; })}
          ${active ? svg`<line class="cursor" x1=${x(active.t)} x2=${x(active.t)} y1=${PAD.top} y2=${bottom}></line><circle class="cursor-dot" cx=${x(active.t)} cy=${y(active.mean)} r="4"></circle>` : nothing}
        </svg>
        ${points.length ? html`<input class="sr-only" type="range" min="0" max=${points.length - 1} step="1" .value=${String(this._active ?? points.length - 1)}
          aria-label=${l.t("history.point_label")} aria-valuetext=${this._pointText(points[this._active ?? points.length - 1]!)}
          @input=${(e: Event) => { this._active = Number((e.target as HTMLInputElement).value); }} @blur=${() => { if (!this._pinned) this._active = null; }}>` : nothing}
      </div>
      <div class="readout-row" @keydown=${(e: KeyboardEvent) => { if (e.key === "Escape" && this._pinned) { e.stopPropagation(); this._unpin(); } }}>
        <span class="readout" aria-hidden="true">${active ? this._pointText(active) : nothing}</span>
        ${actions.map(action => html`<button type="button" class="action" @click=${() => this._fire(active!.t, action.key)}>${action.label}</button>`)}
      </div>
      <div class="legend">
        ${this.bandLabel ? html`<span><i class="key band"></i>${this.bandLabel}</span>` : nothing}
        ${showSpread ? html`<span><i class="key spread"></i>${l.t("history.legend_spread")}</span>` : nothing}
        ${shown.map(group => html`<span><i class="key marker" style=${`background: ${group.color}`}></i>${group.label}</span>`)}
      </div>`;
  }
}

if (!customElements.get("sp-history-chart")) customElements.define("sp-history-chart", SpHistoryChart);
declare global { interface HTMLElementTagNameMap { "sp-history-chart": SpHistoryChart } }
