# Smart Plants panel

Source for the Smart Plants sidebar panel and the dashboard card (Lit +
TypeScript). The built bundles are committed in
`custom_components/smart_plants/frontend/` so a HACS install needs no build
step.

## Development

```bash
cd frontend
npm ci
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # vitest
npm run build        # Vite prod build + artifact-layout check
```

`npm run build` emits three bundles into
`custom_components/smart_plants/frontend/` so that a HACS install can
serve them directly:

- `smart-plants-panel.js`: the admin panel (`src/panel.ts`).
- `smart-plants-card.js`: the dashboard card loader (`src/card/loader.ts`).
  Home Assistant loads it in every frontend session, so it stays a few KB.
  It defines `smart-plants-plant-card` and the card picker entry.
- `smart-plants-card-full.js`: the card content (`src/card/plant-card.ts`),
  which the loader imports once a card is on screen.

The `check-artifact` script fails if a bundle is missing after a build, has
an unresolved import, or the loader grows past 10 KB.

The card works for users who aren't administrators, so it uses no Smart
Plants WebSocket command for them. `src/card/plant-state.ts` rebuilds the
plant status from entity states; `tests/fixtures/plant_status_cases.json`
keeps it in line with `plant_status.py`.

The frontend talks to Home Assistant via the WebSocket API defined
in `custom_components/smart_plants/websocket_api.py`
(`smart_plants/plants/{list,create,update,disable,reenable,delete}`) with
the error codes `integration_not_loaded`, `not_found`, `revision_conflict`,
`invalid_format`, `unknown_error`, and `unauthorized`.
