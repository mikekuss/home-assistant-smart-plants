import { css } from "lit";

// Fallbacks match Home Assistant's default theme so components stay readable
// outside Home Assistant (tests, harness) and when a theme omits a variable.
export const themeFallbacks = css`
  :host {
    --sp-success: var(--success-color, #4caf50);
    --sp-warning: var(--warning-color, #ff9800);
    --sp-info: var(--info-color, #039be5);
    --sp-error: var(--error-color, #db4437);
    --sp-disabled: var(--disabled-text-color, #bdbdbd);
    --sp-text: var(--primary-text-color, #212121);
    --sp-text-secondary: var(--secondary-text-color, #727272);
    --sp-primary: var(--primary-color, #009ac7);
    --sp-card: var(--card-background-color, #fff);
    /* Care reminders have their own colour, apart from the watering palette. */
    --sp-care: var(--purple-color, #8f5bd1);
  }
`;

// An info icon that opens a short explanation below it: native <details>, so
// it works with the keyboard and screen readers without any state.
export const infoTip = css`
  details.info-tip { margin: 0; }
  details.info-tip > summary { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 4px; margin: -6px -4px; border-radius: 8px; cursor: pointer; color: var(--sp-text); font-size: 13px; list-style: none; }
  details.info-tip > summary::-webkit-details-marker { display: none; }
  details.info-tip > summary::marker { content: ""; }
  details.info-tip > summary:hover { background: color-mix(in srgb, var(--sp-text) 6%, transparent); }
  details.info-tip > summary:focus-visible { outline: 2px solid var(--sp-primary); outline-offset: 0; }
  details.info-tip > summary ha-icon { --mdc-icon-size: 18px; color: var(--sp-primary); }
  details.info-tip > p { margin: 4px 0 0; font-size: 13px; line-height: 1.4; color: var(--sp-text-secondary); }
`;

export const srOnly = css`
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
`;

// Status colour variable for a theme colour name used by STATUS_META.
export function statusColorVar(themeVariable: string): string {
  switch (themeVariable) {
    case "--success-color": return "var(--sp-success)";
    case "--warning-color": return "var(--sp-warning)";
    case "--info-color": return "var(--sp-info)";
    case "--error-color": return "var(--sp-error)";
    default: return "var(--sp-disabled)";
  }
}

// Loading placeholders in the shape of the content they stand for, so the
// layout does not move when the data arrives. They pulse gently; with reduced
// motion they stay still.
export const skeletonStyles = css`
  .sk { display: block; background: color-mix(in srgb, var(--primary-text-color, #212121) 8%, transparent); border-radius: 6px;
    animation: sp-pulse 1.4s ease-in-out infinite alternate; }
  .sk.line { height: 12px; }
  .sk.round { border-radius: 50%; }
  @keyframes sp-pulse { from { opacity: 1; } to { opacity: .55; } }
  @media (prefers-reduced-motion: reduce) { .sk { animation: none; } }
`;
