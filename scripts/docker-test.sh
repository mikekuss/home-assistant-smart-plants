#!/usr/bin/env bash
# scripts/docker-test.sh
#
# Convenience wrapper around `docker compose run --rm test ...`.
# Default (no args): runs the full pytest suite.
# Any args are forwarded verbatim, so you can do:
#   ./scripts/docker-test.sh                    # pytest -q
#   ./scripts/docker-test.sh pytest -k config   # subset
#   ./scripts/docker-test.sh ruff check .
#   ./scripts/docker-test.sh mypy
#   ./scripts/docker-test.sh bash               # interactive shell

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [ "$#" -eq 0 ]; then
    exec docker compose run --rm test pytest -q
else
    exec docker compose run --rm test "$@"
fi
