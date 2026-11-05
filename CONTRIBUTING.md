# Contributing to Smart Plants

Bug reports, ideas, translations and pull requests are welcome.

- Report bugs and request features in the
  [issue tracker](https://github.com/mikekuss/home-assistant-smart-plants/issues/new/choose).
- Report security problems privately, see [SECURITY.md](SECURITY.md).
- For a larger change, open an issue first so we can agree on the approach.

## Repository layout

| Path | Contents |
| --- | --- |
| `custom_components/smart_plants/` | The integration, the only folder the Marketplace and HACS install. |
| `custom_components/smart_plants/frontend/` | Built panel and card bundles (committed) and third-party licenses. |
| `frontend/` | Panel and card source (Lit and TypeScript), unit tests, browser tests. |
| `tests/` | Backend tests with `pytest-homeassistant-custom-component`. |
| `docs/` | User documentation. `docs/development/` has developer guides. |
| `dev/ha-config-seed/` | Synthetic seed for the local Home Assistant rig. |
| `scripts/` | Docker test stack, layout check and rig helpers. |

## Backend checks

The backend needs Linux with Python 3.14. On Linux, install `requirements-dev.txt` into a
virtual environment and run:

```bash
ruff check . && ruff format --check . && mypy && pytest -q
python scripts/validate_layout.py
```

On Windows and macOS, run the same tools in Docker. You only need Docker Desktop.

```bash
docker compose build test
bash scripts/docker-test.sh                       # pytest
bash scripts/docker-test.sh pytest -k config_flow -v
bash scripts/docker-test.sh ruff check .
bash scripts/docker-test.sh ruff format --check .
bash scripts/docker-test.sh mypy
bash scripts/docker-test.sh bash                  # shell in the container
```

PowerShell users can run `./scripts/docker-test.ps1` with the same arguments. The container
loads the integration from your working tree, so edits need no rebuild. Rebuild the image when
`requirements-dev.txt` changes.

Hassfest and the HACS check also run in Docker:

```bash
docker compose run --rm hassfest
docker compose run --rm hacs
```

## Frontend checks

The frontend needs Node.js 22.

```bash
cd frontend
npm ci && npm run lint && npm run typecheck && npm test
npm run build
npx playwright install --with-deps chromium && npm run test:browser
```

`npm run build` writes three bundles to `custom_components/smart_plants/frontend/`. Commit them
together with any change under `frontend/src/`. CI fails on a stale bundle. Details on the
browser tests are in [frontend/e2e/README.md](frontend/e2e/README.md).

When you add or upgrade a bundled runtime dependency, add its license to
`custom_components/smart_plants/frontend/THIRD_PARTY_LICENSES.txt`. Ask in an issue before you
add a new one.

## Try it in Home Assistant

The repository has a local Home Assistant 2026.8.0 rig with Smart Plants and synthetic
sensors, reachable only from your machine:

```bash
bash scripts/ha-up.sh --expose     # http://localhost:8123, admin / admin
```

Read [Local Home Assistant rig](docs/development/local-ha-testing.md) before you use it.

## Pull request checklist

- Tests cover the change, backend and frontend.
- User-visible strings are in `strings.json`, `translations/en.json` is identical, and
  `translations/de.json` is updated. See [Translations](docs/development/translations.md).
- User-visible changes update `docs/` and add a line under `## [Unreleased]` in
  `CHANGELOG.md` (Added, Changed, Fixed or Removed).
- Storage changes come with a migration and tests.
- No real Home Assistant data, tokens or credentials.
- No code from GPL projects such as the Plant Monitor integration. The project is MIT
  licensed.
- Smart Plants doesn't switch devices. A change that would needs an issue first.

CI runs Ruff, Mypy and Pytest against Home Assistant 2026.8.0, Pytest against the latest
release, the layout check, hassfest, HACS and the frontend checks.

## Releases

A maintainer sets `version` in `custom_components/smart_plants/manifest.json` and publishes a
GitHub release with the same tag, for example `0.16.0`. The Marketplace and HACS install from
GitHub releases.
