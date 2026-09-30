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

// One reading over time: the mean as a line, the spread of each period as a
// faint area, the target range as a band and care events as vertical markers.
// Pointing at the chart, or moving the hidden slider with the keyboard, reads
// out one point below it.
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
    .marker { stroke: var(--sp-info); stroke-width: 1.5; stroke-dasharray: 2 3; }
    .marker-dot { fill: var(--sp-info); }
    .cursor { stroke: color-mix(in srgb, var(--sp-text) 45%, transparent); stroke-width: 1; }
    .cursor-dot { fill: var(--sp-card); stroke: var(--sp-primary); stroke-width: 2; }
    .readout { min-height: 20px; margin-top: 2px; font-size: 13px; font-variant-numeric: tabular-nums; }
    .legend { display: flex; flex-wrap: wrap; gap: 2px 16px; margin-top: 4px; font-size: 12px; color: var(--sp-text-secondary); }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .key { display: inline-block; width: 14px; height: 8px; border-radius: 2px; }
    .key.band { background: color-mix(in srgb, var(--sp-success) 30%, transparent); }
    .key.spread { background: color-mix(in srgb, var(--sp-primary) 30%, transparent); }
    .key.marker { width: 8px; border-radius: 50%; background: var(--sp-info); }
  `];

  @property({ attribute: false }) public points: HistoryPoint[] = [];
  // Time axis in epoch milliseconds.
  @property({ attribute: false }) public start = 0;
  @property({ attribute: false }) public end = 0;
  @property({ attribute: false }) public periodMs = 3_600_000;
  @property() public unit = "";
  @property({ attribute: false }) public band: ChartBand | null = null;
  @property({ attribute: false }) public markers: number[] = [];
  // Sentence describing the whole chart for screen readers.
  @property() public summary = "";
  @property() public bandLabel = "";
  @property() public markerLabel = "";
  @property({ attribute: false }) public l: Localizer = ENGLISH;
  @state() private _width = 600;
  @state() private _active: number | null = null;
  private _observer: ResizeObserver | undefined;

  connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver === "undefined") return;
    this._observer = new ResizeObserver(entries => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      if (width > 0 && width !== this._width) this._width = width;
    });
    this._observer.observe(this);
  }
  disconnectedCallback(): void { this._observer?.disconnect(); this._observer = undefined; super.disconnectedCallback(); }

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("points") && this._active !== null) this._active = null;
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
    const markers = this.markers.filter(t => t >= this.start && t <= this.end);
    const active = this._active !== null ? points[this._active] : undefined;
    const showSpread = points.some(p => p.max - p.min >= 0.1);
    const move = (e: PointerEvent) => { this._active = this._nearest(e.clientX); };
    return html`
      <div class="plot">
        <svg viewBox="0 0 ${width} ${HEIGHT}" role="img" aria-label=${this.summary}
          @pointermove=${move} @pointerdown=${move} @pointerleave=${() => { this._active = null; }}>
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
          ${markers.map(t => svg`<line class="marker" x1=${x(t)} x2=${x(t)} y1=${PAD.top + 6} y2=${bottom}></line><circle class="marker-dot" cx=${x(t)} cy=${PAD.top + 3} r="3.5"></circle>`)}
          ${active ? svg`<line class="cursor" x1=${x(active.t)} x2=${x(active.t)} y1=${PAD.top} y2=${bottom}></line><circle class="cursor-dot" cx=${x(active.t)} cy=${y(active.mean)} r="4"></circle>` : nothing}
        </svg>
        ${points.length ? html`<input class="sr-only" type="range" min="0" max=${points.length - 1} step="1" .value=${String(this._active ?? points.length - 1)}
          aria-label=${l.t("history.point_label")} aria-valuetext=${this._pointText(points[this._active ?? points.length - 1]!)}
          @input=${(e: Event) => { this._active = Number((e.target as HTMLInputElement).value); }} @blur=${() => { this._active = null; }}>` : nothing}
      </div>
      <div class="readout" aria-hidden="true">${active ? this._pointText(active) : nothing}</div>
      <div class="legend">
        ${this.bandLabel ? html`<span><i class="key band"></i>${this.bandLabel}</span>` : nothing}
        ${showSpread ? html`<span><i class="key spread"></i>${l.t("history.legend_spread")}</span>` : nothing}
        ${markers.length && this.markerLabel ? html`<span><i class="key marker"></i>${this.markerLabel}</span>` : nothing}
      </div>`;
  }
}

if (!customElements.get("sp-history-chart")) customElements.define("sp-history-chart", SpHistoryChart);
declare global { interface HTMLElementTagNameMap { "sp-history-chart": SpHistoryChart } }
