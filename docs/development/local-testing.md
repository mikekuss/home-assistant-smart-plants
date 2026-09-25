# Local testing on Windows via Docker

Home Assistant depends on `fcntl`, which does not exist on Windows, so
the test suite cannot run natively. This repo ships a small Docker
setup that gives you a Linux Python 3.14 environment with the directly
pinned dev requirements.

## Prerequisites

- Docker Desktop for Windows, running.
- No Python install required on the host.

## First-time build

```powershell
docker compose build test
```

The image installs `requirements-dev.txt` (Home Assistant + pytest +
`pytest-homeassistant-custom-component` + ruff + mypy). The
integration itself is not `pip install`ed — it is loaded via
`PYTHONPATH=/app` from the mounted working tree, so edits on the host
are picked up on the next run with no rebuild.

The image uses Python 3.14. The pinned `homeassistant==2026.7.0` (and
`pyproject.toml`) declare `requires-python = ">=3.14.2"`, so pip
refuses to install HA on 3.13. `pytest-homeassistant-custom-component`
emits a Python 3.14 preview warning during collection; this is
expected and not a test failure.

## Running things

The convenience wrapper forwards any args to the `test` service:

```powershell
# Full pytest suite (default)
./scripts/docker-test.ps1

# A subset
./scripts/docker-test.ps1 pytest -k config_flow -v

# Lint
./scripts/docker-test.ps1 ruff check .
./scripts/docker-test.ps1 ruff format --check .

# Types
./scripts/docker-test.ps1 mypy

# Interactive shell
./scripts/docker-test.ps1 bash
```

Same thing on bash / WSL. Invoke scripts through `bash`; executable bits
are not reliable on every Windows checkout:

```bash
bash scripts/docker-test.sh
bash scripts/docker-test.sh pytest -k config_flow -v
```

Or drive compose directly:

```powershell
docker compose run --rm test pytest -q
```

Compile all backend sources with bytecode directed to the disposable container's
`/tmp`, because the source bind mounts are read-only:

```powershell
docker compose run --rm test python -X pycache_prefix=/tmp/smart-plants-pycache -m compileall -q custom_components tests scripts
```

## Hassfest (HA manifest validator)

Uses the official upstream image, same as the GitHub Action:

```powershell
docker compose run --rm hassfest
```

## HACS validation

```powershell
docker compose run --rm hacs
```

## Cleanup

```powershell
docker compose down
docker image rm smart-plants-test:local
```
