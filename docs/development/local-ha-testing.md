# Isolated Local Home Assistant Testing

This repository includes a browsable Home Assistant 2026.7.0 development instance for manual integration testing. It is separate from the Linux pytest stack in `docker-compose.yml` and must never use live Home Assistant credentials or configuration.

## Security Boundary

- The host port binds only to `127.0.0.1`.
- The base Compose network is internal and has no internet/LAN egress. The `-Expose` / `--expose` flag (required on Docker Desktop, and used by the seed-regeneration steps below) also attaches a normal bridge network: the published port is still bound to `127.0.0.1` only, but the container **does** get outbound internet and LAN access while exposed.
- The integration source is mounted read-only.
- Runtime state lives only under ignored `dev/ha-config/`.
- Authentication IS committed for this rig as a deliberate DX call: `admin` / `admin`, hash in `dev/ha-config-seed/.storage/auth_provider.homeassistant`. This is acceptable **only** because the published port is bound to `127.0.0.1`, so nothing outside this machine can reach the login. Do not reuse this seed against a container that publishes on any non-loopback interface, and do not use these credentials on any real Home Assistant install.
- Do not add real actuators, live tokens, HACS credentials, or real OpenPlantBook credentials.
- Any future provider testing uses a local mock service on the same internal network.

## Start

PowerShell:

```powershell
./scripts/ha-up.ps1
```

Bash or WSL:

```bash
bash scripts/ha-up.sh
```

Open `http://localhost:8123` and log in as `admin` / `admin`. Smart Plants is already added — no onboarding, no config-flow. A different loopback port can be selected with `HA_HOST_PORT`.

On Docker Desktop the internal network above prevents the published port from binding on the host, so `localhost:8123` is unreachable and the start script times out with "Timed out waiting for HA". Pass `-Expose` (PowerShell) or `--expose` (bash) to attach the container to an additional non-internal bridge network:

```powershell
./scripts/ha-up.ps1 -Expose
```

```bash
bash scripts/ha-up.sh --expose
```

The startup script's HTTP readiness message proves only that Home Assistant is serving its frontend. Confirm the Smart Plants config entry is loaded in the UI or logs before using the rig for integration debugging.

## Stop, Reset, And Logs

```powershell
./scripts/ha-logs.ps1
./scripts/ha-down.ps1
./scripts/ha-reset.ps1
```

```bash
bash scripts/ha-logs.sh
bash scripts/ha-down.sh
bash scripts/ha-reset.sh
```

Reset stops the isolated stack before deleting `dev/ha-config/`. The PowerShell script aborts deletion if Docker Compose cannot stop the stack.

## Regenerating the Seed After Upgrades

The pre-onboarded seed at `dev/ha-config-seed/` is version- and schema-locked. It **must** be regenerated in two cases, otherwise clones will boot into a broken or partially migrated state:

1. **Home Assistant version bump.** When the pinned image in `docker-compose.ha.yml` changes, HA may migrate `.storage/` schemas on first boot against the old seed. Regenerate so committed clones start on the new schema directly.
2. **Smart Plants internals change.** Anything touching integration storage — `custom_components/smart_plants/storage.py`, `models.py`, `const.py::DOMAIN`, config-entry `VERSION`/`minor_version`, or entity unique-ID formats — can invalidate the seeded `core.config_entries` / `core.entity_registry` / (future) `.storage/smart_plants.*` blobs. Regenerate so the demo entry matches current code.

Procedure:

```powershell
./scripts/ha-reset.ps1               # wipe dev/ha-config/
./scripts/ha-up.ps1 -Expose          # boot bare rig against the new image / new code
# Complete onboarding manually with admin / admin (any password works locally;
# use admin/admin so the committed seed matches what the docs promise).
# Add Smart Plants under Settings -> Devices & Services. Add any demo data.
# Log out of every session so no refresh token is left (see Seed Guard below).
./scripts/ha-down.ps1                # stop so .storage/ flushes cleanly
./scripts/ha-seed-from-runtime.ps1   # copy curated files back into dev/ha-config-seed/
git status --short dev/ha-config-seed # inspect every candidate file
git diff -- dev/ha-config-seed        # review tracked-file changes
```

Bash: `ha-reset.sh`, `ha-up.sh --expose`, `ha-down.sh`, `ha-seed-from-runtime.sh`.

The regen script curates which `.storage/` keys ship in the seed (identity, auth, integration, layout) and refuses to write a seed whose `.storage/auth` still holds refresh tokens, so no long-lived session token lands in git. If HA adds a new key that belongs in the seed, extend the `StorageKeep` / `storage_keep` list in both scripts.

### Seed Guard

Both regen scripts copy the curated files into a temporary staging directory and run `scripts/seed_guard.py` on it. They need Python 3 (`python3` for bash; `py -3`, `python`, or `python3` for PowerShell). The committed seed is replaced only when the guard passes. Otherwise the script prints `Refusing to write the seed:` with one line per problem, leaves `dev/ha-config-seed/` untouched, and exits non-zero.

The guard only reads the staged files; both scripts copy them byte for byte, so a seed that passes is UTF-8 without BOM. It compares them with the seed committed at `git HEAD` and refuses the seed when:

- Any copied file starts with a UTF-8 byte order mark. Home Assistant 2026.9 and newer cannot decode such a storage file and moves it aside on boot, which loses the pre-onboarded login.
- `auth` contains any refresh token. Tokens are refused, not stripped. Every login creates one, so before `ha-down`, log out of the browser session (and delete any other sessions under Profile -> Security). The refusal names the user and token type of each remaining token so you can find the session that still holds it.
- The owner's password hash in `auth_provider.homeassistant` differs from the committed seed. Onboard with `admin` / `admin` (or reset the owner password to it) before regenerating.
- The `smart_plants` config entry has non-empty `data` or `options`.
- A device in `core.device_registry` (including `deleted_devices`) has `connections` such as MAC addresses, has a serial number, or belongs to an integration that has no config entry in the committed seed.
- `core.area_registry` contains an area that the committed seed does not.

Every other file is copied byte for byte; neither script re-encodes JSON itself. If a deliberate seed change trips the guard (for example a new demo area), add it to the committed seed by hand in a reviewed commit first so it becomes the baseline, or extend the guard with a test in `tests/test_seed_guard.py`.

To check a staging directory by hand, run `python3 scripts/seed_guard.py <dir>`, where `<dir>` has the same layout as `dev/ha-config-seed/` (a `.storage/` folder and optionally `.HA_VERSION`). `--baseline-dir <seed dir>` compares against a directory instead of `git HEAD`. The guard never modifies the directory it checks.

Never broad-stage the seed. Stage only explicit reviewed paths; `.gitignore`
deny-lists every non-allowlisted generated `.storage` key.

## Synthetic Sensors

The committed `dev/ha-config-seed/configuration.yaml` defines synthetic moisture, temperature, and illuminance sensors. They do not connect to physical devices. Extend fixtures only as their corresponding implementation phase begins.

## Version Policy

The minimum-support rig uses the exact `homeassistant/home-assistant:2026.7.0` tag. A separate opt-in latest-supported smoke target may be added later; never replace the minimum target with a floating minor or `stable` tag. **When you bump this tag, also regenerate the seed** (see above).

## Limitations

- Python integration changes require a container restart or config-entry reload where supported.
- Playwright covers the exact production panel artifact against a deterministic mocked Home Assistant contract. A live-HA panel smoke still requires disposable onboarding credentials and manual config-entry setup in this isolated rig; CI must not report that gate as passed.
- HACS installation validation remains separate from this bind-mounted development rig.
- Base images and validator images should eventually be pinned by reviewed digests for fully deterministic clean-machine reproduction.
