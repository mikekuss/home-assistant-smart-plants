# Local Home Assistant rig

The repository includes a Home Assistant 2026.8.0 instance for manual testing. It's separate
from the pytest stack in `docker-compose.yml`. Never use it with a real Home Assistant
configuration or real credentials.

## Security

- The port binds to `127.0.0.1` only.
- The base network is internal, without internet or LAN access. `--expose` (`-Expose` in
  PowerShell) adds a bridge network. The port stays on `127.0.0.1`, but the container then has
  outbound internet and LAN access.
- The integration source is mounted read-only. Runtime state lives in the git-ignored
  `dev/ha-config/`.
- The seed contains the login `admin` / `admin`. That's acceptable only because the port is
  loopback-only. Never publish the port on another interface, and never use this login
  elsewhere.
- Don't add real devices, tokens, HACS credentials or OpenPlantBook credentials.

## Start and stop

```bash
bash scripts/ha-up.sh --expose
```

Open `http://localhost:8123` and sign in as `admin` / `admin`. Smart Plants is already set up.
`HA_HOST_PORT` selects another port. Docker Desktop needs `--expose`, otherwise the port isn't
reachable and the script stops with "Timed out waiting for HA".

The ready message only means Home Assistant serves its frontend. Check that the Smart Plants
entry is loaded before you debug.

| Task | Bash | PowerShell |
| --- | --- | --- |
| Start | `bash scripts/ha-up.sh --expose` | `./scripts/ha-up.ps1 -Expose` |
| Logs | `bash scripts/ha-logs.sh` | `./scripts/ha-logs.ps1` |
| Stop | `bash scripts/ha-down.sh` | `./scripts/ha-down.ps1` |
| Reset | `bash scripts/ha-reset.sh` | `./scripts/ha-reset.ps1` |

Reset stops the stack, then deletes `dev/ha-config/`. Backend changes need a container restart.
The rig's time zone defaults to `Europe/Berlin` (`TZ` in `docker-compose.ha.yml`).

## Regenerate the seed

The seed in `dev/ha-config-seed/` matches one Home Assistant version and one storage schema.
Regenerate it when:

- the Home Assistant image in `docker-compose.ha.yml` changes, or
- Smart Plants storage, the config entry version or entity unique IDs change.

```bash
bash scripts/ha-reset.sh
bash scripts/ha-up.sh --expose
# Onboard as admin / admin, add Smart Plants, add demo data,
# then sign out of every session so no refresh token is left.
bash scripts/ha-down.sh
bash scripts/ha-seed-from-runtime.sh
git status --short dev/ha-config-seed
git diff -- dev/ha-config-seed
```

PowerShell has the same scripts with `.ps1`. The scripts copy a curated list of `.storage` keys
into a staging folder and run `scripts/seed_guard.py` on it. They need Python 3 and refuse to
run while the `smart-plants-ha` container runs. To ship a new storage key, add it to
`StorageKeep` / `storage_keep` in both scripts.

### Seed guard

The scripts pass `--drop-content-user`, which removes Home Assistant's system content user, its
refresh token and `http.auth` from the staged files. The guard then compares the staged seed
with the one at `git HEAD` and refuses it when:

- a file starts with a UTF-8 byte order mark,
- `auth` contains a refresh token (sign out of every session, including those under
  **Profile > Security**),
- `http.auth` is present,
- the owner's password hash differs from the committed one,
- the `smart_plants` config entry has `data` or `options`,
- a device has connections such as MAC addresses, a serial number, or belongs to an
  integration without a config entry in the seed,
- an area is new.

On refusal the script prints `Refusing to write the seed:` with one line per problem and
leaves the seed alone. For a deliberate change, such as a new demo area, commit it to the seed
by hand first, or extend the guard with a test in `tests/test_seed_guard.py`.

To check a folder by hand, run `python3 scripts/seed_guard.py <dir>`. `--baseline-dir <dir>`
compares with a folder instead of `git HEAD`.

Stage seed files by explicit path only. `.gitignore` blocks every `.storage` key that isn't on
the allowlist.

## Notes

- The seed's `configuration.yaml` defines synthetic moisture, temperature and illuminance
  sensors.
- The rig uses the exact `homeassistant/home-assistant:2026.8.0` tag. Keep an exact tag and
  regenerate the seed when you change it.
- The Playwright tests use a mock of the Home Assistant WebSocket API, not this rig.
