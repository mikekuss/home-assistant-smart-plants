#!/usr/bin/env bash
# Tail Home Assistant logs, filtered to Smart Plants by default.
#
# Usage:
#   scripts/ha-logs.sh          # follow smart_plants-only lines
#   scripts/ha-logs.sh --all    # follow every HA log line
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ "${1:-}" == "--all" || "${1:-}" == "-a" ]]; then
  exec docker compose -f docker-compose.ha.yml logs -f homeassistant
fi

docker compose -f docker-compose.ha.yml logs -f homeassistant | grep --line-buffered smart_plants
