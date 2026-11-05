# Smart Plants frontend

Source of the Smart Plants panel and dashboard card, in Lit and TypeScript. The built bundles
are committed in `custom_components/smart_plants/frontend/`, so an install needs no build.

```bash
npm ci
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest
npm run build        # Vite build and artifact check
npm run test:browser # Playwright and axe, see e2e/README.md
```

`npm run build` writes three bundles:

| Bundle | Source | Contents |
| --- | --- | --- |
| `smart-plants-panel.js` | `src/panel.ts` | The admin panel. |
| `smart-plants-card.js` | `src/card/loader.ts` | The card loader. Home Assistant loads it in every session, so it stays under 10 KB. It defines `smart-plants-plant-card` and the picker entry. |
| `smart-plants-card-full.js` | `src/card/plant-card.ts` | The card itself, loaded when a card is on screen. |

The artifact check fails when a bundle is missing, has an unresolved import, or the loader
grows past 10 KB.

The panel talks to the WebSocket commands in
`custom_components/smart_plants/websocket_api.py`. They are internal and admin-only. The card
must work for every user, so it builds the plant status from entity states in
`src/card/plant-state.ts`. `tests/fixtures/plant_status_cases.json` keeps it in line with
`plant_status.py`.
