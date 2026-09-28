# Smart Plants panel

Source for the Smart Plants sidebar panel (Lit + TypeScript). The built bundle
is committed at `custom_components/smart_plants/frontend/smart-plants-panel.js`
so a HACS install needs no build step.

## Development

```bash
cd frontend
npm ci
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # vitest
npm run build        # Vite prod build + artifact-layout check
```

`npm run build` emits `smart-plants-panel.js` into
`custom_components/smart_plants/frontend/` so that a HACS install can
serve it directly. The `check-artifact` script fails if the bundle is
missing after a build.

The frontend talks to Home Assistant via the WebSocket API defined
in `custom_components/smart_plants/websocket_api.py`
(`smart_plants/plants/{list,create,update,disable,reenable,delete}`) with
the error codes `integration_not_loaded`, `not_found`, `revision_conflict`,
`invalid_format`, `unknown_error`, and `unauthorized`.
