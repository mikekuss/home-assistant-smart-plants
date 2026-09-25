#!/usr/bin/env bash
# Stop the live Home Assistant dev rig. Keeps dev/ha-config/ intact.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
exec docker compose -f docker-compose.ha.yml -f docker-compose.ha.expose.yml down --remove-orphans
