# CLAUDE.md

Guidance for AI coding agents (Claude Code and similar) working in this repository.

**Local maintainer rules:** if a file named `AGENTS.md` exists in the repository root, read it
before doing anything else. It is git-ignored, exists only in the maintainer's local checkout,
and takes precedence over this file. Cloud and CI sessions will not have it; this file is
written so they can work safely without it.

## Project

Smart Plants (`smart_plants`) is a Home Assistant custom integration, distributed through HACS,
that manages plants as long-lived Home Assistant devices. Users create plants in a Lit sidebar
panel, optionally pick an OpenPlantBook species, assign existing sensors to roles (soil moisture,
temperature, humidity, illuminance, conductivity, soil temperature, CO2, battery), log care, and
use the resulting entities in native automations. It detects plant health but never actuates
devices. MIT license. Minimum Home Assistant: 2026.8.0.

## This repository is public

Everything you commit, every commit message, and every pull request is public forever.

- Never commit secrets: API keys, OpenPlantBook credentials, Home Assistant tokens, passwords,
  private keys, webhook URLs, `.env` files, `secrets.yaml`. Tests use obviously fake values
  such as `test-client-id`.
- Never commit real Home Assistant data: `.storage` files from a real instance, recorder
  databases, logs, backups, real entity IDs, device names, serials, MAC addresses, IPs,
  hostnames, coordinates, or person names. Fixtures are synthetic: generic plant names
  ("Aloe", "Office Aloe"), generic areas ("Kitchen", "Living Room"), `sensor.mock_*` entity
  IDs, loopback URLs.
- Never commit personal data or absolute local paths (`C:\Users\...`, `/home/...`,
  `/Users/...`).
- Public text (code comments, docs, UI strings, commit messages, PR descriptions) describes the
  change for a public reader. Do not refer to private notes, planning documents, or internal
  process terms such as phases, checkpoints, or reviewer finding IDs. If a comment needs the
  reasoning, write the reasoning itself.
- Do not add files at the repository root. Do not commit screenshots or other images unless the
  task explicitly asks for them (brand icons and `docs/images/` only).
- Do not copy code from GPL projects (notably the Plant Monitor integration). Do not add GPL,
  AGPL, LGPL, or SSPL dependencies.

## Git workflow

- Work on a feature branch created from the current `main` and open a pull request against
  `main`. Never push to `main` directly, never force-push shared branches, and never create
  tags, releases, or change repository settings. The maintainer merges.
- **Commit identity.** In sessions started by the maintainer (@mikekuss), set the identity
  before the first commit:
  ```bash
  git config user.name "Mike Kuss"
  git config user.email "7545798+mikekuss@users.noreply.github.com"
  ```
  Other contributors use their own identity. Never author or commit as `noreply@anthropic.com`;
  that address belongs only in a `Co-Authored-By:` trailer.
- Commit messages: imperative subject, a body that explains why, no session links or local
  paths.
- Before committing, review `git status` and the staged diff line by line. Stage explicit paths.

## Where things live

| Path | Contents |
| --- | --- |
| `custom_components/smart_plants/` | The integration; the only folder HACS installs. Everything needed at runtime lives here. |
| `custom_components/smart_plants/frontend/` | Built panel bundle (committed) and `THIRD_PARTY_LICENSES.txt`. |
| `frontend/` | Panel source (Lit + TypeScript), unit tests, Playwright + axe browser tests. |
| `tests/` | Backend tests (`pytest-homeassistant-custom-component`), synthetic data only. |
| `docs/` | User documentation; `docs/development/` has developer guides. |
| `dev/ha-config-seed/` | Synthetic seed for the local Home Assistant rig. Do not modify unless the task says so. |
| `scripts/` | Docker test stack and local rig helpers. |

## Quality gates

Run the gates that apply before you open or update a pull request, and report the results with
counts in the PR description. If you could not run a gate, say so.

Backend (Linux with Python 3.14; on Windows/macOS use `bash scripts/docker-test.sh <command>`):

```bash
python -m pip install -r requirements-dev.txt
ruff check . && ruff format --check . && mypy && pytest -q
python scripts/validate_layout.py
```

Frontend (Node.js 22):

```bash
cd frontend
npm ci && npm run lint && npm run typecheck && npm test
npm run build          # rewrites custom_components/smart_plants/frontend/smart-plants-panel.js
npx playwright install --with-deps chromium && npm run test:browser
```

CI runs the same checks plus hassfest and the HACS action.

## Rules that keep the release healthy

- Any change under `frontend/src/` requires `npm run build`, and the rebuilt
  `smart-plants-panel.js` must be committed in the same commit. CI fails on a stale bundle.
- Adding or upgrading a bundled runtime dependency requires updating `THIRD_PARTY_LICENSES.txt`
  with its full license text. Ask before adding a new runtime dependency.
- `manifest.json` requirements must be packages Home Assistant core already ships, with a lower
  bound only (`>=`). An exact pin breaks setup as soon as Home Assistant moves to a newer
  version. `tests/test_manifest.py` enforces this.
- `manifest.json` `version` equals the release tag, without a `v` prefix (for example `0.1.1`).
  Do not bump versions unless the task is a release.
- User-visible strings go into `strings.json`; keep `translations/en.json` identical in content
  and update `translations/de.json` (German with proper umlauts).
- User-visible behavior changes update the relevant `docs/*.md` page and add a line under
  `## [Unreleased]` in `CHANGELOG.md` (Added / Changed / Fixed / Removed). Docs describe what
  the code actually does.
- Storage or model changes need a migration and tests. Diagnostics must never include
  credentials or tokens; new diagnostics fields need redaction and a test. Logs must not contain
  credentials or full provider responses.

## Design principles

- Each plant is a stable, long-lived object; sensor entities are replaceable inputs.
- OpenPlantBook is an optional species provider, not the source of truth.
- Prefer Home Assistant native entities and integration-level trigger/condition platforms over
  template logic.
- Keep health detection separate from irrigation. Any future actuation needs safe defaults
  (cooldowns, maximum runtime, explicit user confirmation) and prior discussion in an issue.
- Avoid entity explosion: optional entities should be created lazily or disabled by default.
