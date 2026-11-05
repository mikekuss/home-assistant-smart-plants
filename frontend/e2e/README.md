# Browser and accessibility tests

Run from `frontend/`:

```bash
npm ci
npx playwright install --with-deps chromium
npm run build
npm run test:browser
```

`test:browser` first runs `verify-artifact.mjs`. It checks that the bundles are tracked in Git
and that two production builds are byte-identical to them, so a stale bundle fails. The
browser then compares the served module bytes with the files on disk.

## Harnesses

- `harness.html` loads only the packaged `smart-plants-panel.js`. It doesn't load TypeScript
  sources or run a Vite server.
- `card-harness.html` loads only the packaged card loader, which loads the card next to it.

All Home Assistant WebSocket, registry, provider and image traffic is a synthetic mock in
`harness.js` and `card-harness.js`. Real WebSocket connections and any other network request
fail the test. The mock can return provider errors, malformed responses, disconnects,
conflicts, lost responses and delays.

## Specs

| Spec | Covers |
| --- | --- |
| `panel.spec.ts` | Overview, wizard, plant editing, species provider, photos, conflicts, errors, dialogs |
| `plant-page.spec.ts` | Plant page tabs and header |
| `care-plan.spec.ts` | Care tasks, reading tasks, rest period |
| `snooze.spec.ts` | Snooze dialogs and chips |
| `notifications.spec.ts` | Notifications dialog |
| `automations.spec.ts` | Automations card |
| `card.spec.ts` | Dashboard card |
| `i18n.spec.ts` | German rendering and number and date formats |
| `sensors-a11y.spec.ts`, `diagnostics-a11y.spec.ts` | Accessibility of the Sensors tab and diagnostics |

The tests run in Chromium at 1440 × 1000 (desktop) and 375 × 812 (mobile, with touch).

## Accessibility

`@axe-core/playwright` scans open shadow roots of the bundled components with all rules. There
are no rule exclusions or suppressed violations. Violations and unresolved incomplete checks
fail the test. One axe ambiguity about text in native top-layer dialogs is checked by the test
itself: hit testing, an opaque dialog surface and a contrast of at least 4.5:1. Keyboard tests
cover Tab cycles, Escape, Enter, focus return and visible focus.

The dark scans use synthetic Home Assistant theme tokens, not a real theme.

## Reports

Results are git-ignored. `frontend/playwright-report/` holds the report with axe results and
screenshots. Open it with `npx playwright show-report`. Screenshots are for inspection, not
pixel comparisons.
