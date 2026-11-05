## What does this change?

<!-- Short description and the motivation. Link related issues, e.g. "Fixes #123". -->

## Checklist

- [ ] Backend checks pass (`ruff check .`, `ruff format --check .`, `mypy`, `pytest`, `python scripts/validate_layout.py`)
- [ ] If `frontend/` changed: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:browser` pass, and the rebuilt bundles (`smart-plants-panel.js`, `smart-plants-card.js`, `smart-plants-card-full.js`) are committed
- [ ] User-facing changes update `docs/`, the translations (`strings.json`, `translations/`) and `CHANGELOG.md` under `## [Unreleased]`
- [ ] No real Home Assistant data, tokens or credentials are included
