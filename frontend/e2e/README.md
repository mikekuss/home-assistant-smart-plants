# Production browser and accessibility gates

Run from `frontend/`:

```text
npm ci
npx playwright install chromium
npm run build
npm run lint
npm run typecheck
npm test
npm run test:browser
```

`test:browser` first verifies that the runtime artifact is Git-tracked and that
two production rebuilds are byte-identical to the artifact being qualified. It
fails for stale source/artifact pairs. The browser additionally compares the
served module bytes with the on-disk package and records its SHA-256.

The harness imports only
`custom_components/smart_plants/frontend/smart-plants-panel.js`. It does not
import application TypeScript or run a Vite source server. All HA WebSocket,
registry, provider and image IO is synthetic. Browser requests are restricted
to the harness HTML/JS and packaged module; real WebSocket connections and all
other network requests fail the test. Native HA links are checked without
navigating to a real HA instance.

## Mock contract

- Complete immutable-on-response plant/species snapshots, including exactly
  populated `field_sources`, attributed defaults, and explicit null overrides.
- UUID draft IDs and 43-character draft capabilities; confirmed, idempotent
  creation and optimistic mutation revisions.
- Native device areas, source registry UUIDs, rename/removal/reused-ID scenarios,
  absent metadata and unavailable sensor states. Atomic configure accepts exact
  preexisting missing UUID/entity-ID pairs while rejecting new or changed missing
  pairs and existing-UUID/entity-ID mismatches.
- Authoritative evaluation fixtures, with **all four computed outputs null**
  when `computed_available` is false. The mock does not duplicate the evaluator.
- Genuine browser-decoded PNG uploads and locally generated, decodable WebP
  image responses with `image/webp` MIME type; synthetic bearer authentication.
- Controllable provider errors, malformed responses, disconnect/ready/registry
  events, conflicts, lost creation responses and deliberately delayed responses.

## Browser matrix

Every scenario runs in Chromium at **1440 × 1000 desktop** and **375 × 812 mobile**
(mobile and touch emulation). There are 31 scenarios per viewport:

- Exact packaged artifact loading and network isolation.
- Complete seven-step manual creation/back-navigation and independent section
  editing, including area, placement, taxonomy, species, sensors and thresholds.
- Provider search/preview, explicit wizard acceptance, reviewed existing-plant
  apply and refresh, preservation of overrides, absent provider target.
- UUID rename, successful threshold/staleness saves retaining the missing original
  UUID despite a reused entity ID, persistent unavailability and explicit replacement.
- All-sensor metadata fallback and explicit unavailable/unregistered assignment.
- Threshold/staleness validation, atomic writes and clear-to-inherit.
- Image upload/display/replace/remove, auth/revisions, decoded dimensions,
  oversized/malformed files, backend validation, blob revocation and late IO.
- Double-submit prevention, lost committed-create response and identical retry.
- Replayed creation preserves a subsequently replaced or intentionally removed
  photo: no automatic image write, revision change or original-photo restoration.
- Hidden committed creation with/without a photo: parent navigation context,
  unchanged editor/focus/dirty fields, background photo completion, and inventory
  reconciliation without navigation or duplicate creation.
- Native area review, combined filters, unavailable detail and native links.
- Conflict refresh, dirty-field retention and explicit review/reapply.
- Disable/re-enable, cancellation, explicit permanent delete and dialog keyboard
  focus containment/restoration, including provider-heading initial focus.
- Disconnect/reconnect, unloaded integration, malformed registry/inventory/
  evaluation/version/provider responses and sanitized error messages.
- Six provider error cases plus provider-disabled capability: manual creation
  remains available without remote dependency.
- Full-rule axe audits, overflow checks and screenshots.
- German rendering (`?lang=de`): inventory, detail tabs, sensors, care, diagnostics,
  locale-formatted thresholds and validation messages, with axe audits.

## Accessibility and screenshot evidence

`@axe-core/playwright` **4.13.0**, using **axe-core 4.13.0**, scans open shadow
roots in the actual bundled components. No rule exclusions, disabled rules,
best-practice exclusions or violation suppressions are used. Violations and
unresolved incomplete checks fail the gate. Axe's native top-layer dialog stack
ambiguity is verified narrowly for `dialog > p`: actual text-line hit testing,
opaque dialog surface, no background images, full visibility and WCAG luminance
contrast of at least 4.5:1. Raw axe results remain unchanged and separate
`contrast-verification-delete-dialog` evidence is attached. Axe 4.10 and 4.13
both report this ambiguity.

Each viewport has 23 scans:

1. Empty inventory
2–8. All seven manual wizard steps
9. Detail with decoded local image
10. Delete dialog
11. Provider review dialog
12. Disconnected detail
13. Populated inventory
14. Missing-source detail
15. Conflict review
16. Wizard provider search results
17. Wizard provider preview
18. Expanded field attribution and explicit acceptance
19–21. Overview, detail and provider dialog with synthetic dark HA semantic tokens
22–23. Background creation completion preserving another editor, with/without photo

The light scans exercise CSS fallbacks. The dark scans exercise explicit
synthetic HA semantic-token inheritance, not a downloaded or live HA theme.
Keyboard checks additionally cover Tab/Shift+Tab cycles, Escape, Enter, restored
trigger focus, initial review heading visibility and visible focus outlines.

Generated evidence (Git-ignored):

- `frontend/playwright-report/index.html`: complete test report with attachments.
- `frontend/test-results/panel-axe-full-rule-audit--f1ce0-ps-detail-dialogs-and-error-{desktop,mobile}/axe-*.json`:
  full axe results, including version, rules, nodes and zero-result categories.
- PNGs in those directories plus the `panel-hidden-committed-cre-*` result
  directories: 21 screenshots per viewport, 42 total. Dialogs are
  viewport screenshots; other screens are full-page. Screenshots are inspection
  evidence rather than pixel-baseline assertions.
- Artifact identity JSON attached to the first scenario for each viewport.

Open the report with `npx playwright show-report` from `frontend/`.
