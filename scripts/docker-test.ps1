# scripts/docker-test.ps1
#
# Convenience wrapper around `docker compose run --rm test ...`.
# Default (no args): runs the full pytest suite.
# Any args are forwarded verbatim, so you can do:
#   ./scripts/docker-test.ps1                    # pytest -q
#   ./scripts/docker-test.ps1 pytest -k config   # subset
#   ./scripts/docker-test.ps1 ruff check .
#   ./scripts/docker-test.ps1 mypy
#   ./scripts/docker-test.ps1 bash               # interactive shell

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if ($args.Count -eq 0) {
    & docker compose run --rm test pytest -q
} else {
    & docker compose run --rm test @args
}

exit $LASTEXITCODE
