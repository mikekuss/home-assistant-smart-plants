# Contributing to Smart Plants

Thanks for helping! Bug reports, ideas, translations, and pull requests are all welcome.

- **Bugs and feature requests:** open an [issue](https://github.com/mikekuss/home-assistant-smart-plants/issues/new/choose).
- **Security problems:** report them privately; see [SECURITY.md](SECURITY.md).
- **Larger changes:** open an issue first so we can agree on the approach before you invest time.

## Repository layout

| Path | Contents |
| --- | --- |
| `custom_components/smart_plants/` | The integration. This is the only folder HACS installs. |
| `custom_components/smart_plants/frontend/` | Built panel bundle (committed) and third-party license notices. |
| `frontend/` | Panel source (Lit + TypeScript), unit tests, and browser/accessibility tests. |
| `tests/` | Backend tests (`pytest-homeassistant-custom-component`). |
| `docs/` | User documentation. |
| `docs/development/` | Developer guides for the test containers and the local Home Assistant rig. |
| `dev/ha-config-seed/` | Synthetic, pre-onboarded seed for the local Home Assistant rig. |
| `scripts/` | Helper scripts for the Docker test stack and the local rig. |

## Backend

Home Assistant does not run natively on Windows, so the backend checks run in a Linux container.
You only need Docker; see [docs/development/local-testing.md](docs/development/local-testing.md).

```bash
bash scripts/docker-test.sh                 # pytest
bash scripts/docker-test.sh ruff check .
bash scripts/docker-test.sh ruff format --check .
bash scripts/docker-test.sh mypy
```

PowerShell users can use `./scripts/docker-test.ps1` with the same arguments.
On Linux/macOS with Python 3.14 you can also install `requirements-dev.txt` into a virtual
environment and run the same commands directly.

## Frontend

Requires Node.js 22.

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run build          # writes custom_components/smart_plants/frontend/smart-plants-panel.js
npm run test:browser   # Playwright + axe against the built bundle
```

**Commit the rebuilt bundle** whenever you change anything under `frontend/src/`. CI rebuilds it
and fails if the committed file differs. Browser test details are in
[frontend/e2e/README.md](frontend/e2e/README.md).

If you add or upgrade a runtime (bundled) dependency, update
`custom_components/smart_plants/frontend/THIRD_PARTY_LICENSES.txt`.

## Trying it in a real Home Assistant

The repository ships an isolated, loopback-only Home Assistant 2026.8.0 rig with Smart Plants
pre-installed and synthetic sensors:

```bash
bash scripts/ha-up.sh --expose     # then open http://localhost:8123 (admin / admin)
```

The demo login is for this local rig only. Read
[docs/development/local-ha-testing.md](docs/development/local-ha-testing.md) before you use it,
especially the rules for regenerating the seed.

## Guidelines

- **Never commit real Home Assistant data.** That includes `.storage` files from your own
  instance, tokens, OpenPlantBook credentials, logs, or screenshots that show private information.
- **Licensing:** the project is MIT-licensed. Do not copy code from GPL-licensed projects such as
  the Plant Monitor integration. Learning from their concepts is fine.
- **Translations:** user-visible strings live in `custom_components/smart_plants/strings.json`,
  with translations in `translations/`. Keep `en.json` in sync with `strings.json` and update
  `de.json` if you can. New languages are welcome.
- **Tests:** add or update tests for behavior changes, both backend and frontend.
- **Safety:** Smart Plants detects plant health but does not actuate irrigation. Changes that
  control devices need an issue and discussion first.
- **Docs:** update `docs/` when user-facing behavior changes.

## Releases

Maintainers release by bumping `version` in `custom_components/smart_plants/manifest.json` and
publishing a GitHub release with a matching tag (for example `0.1.0`). HACS uses GitHub releases
for updates.
