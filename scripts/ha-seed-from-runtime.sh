#!/usr/bin/env bash
# Regenerate dev/ha-config-seed/ from the currently populated dev/ha-config/.
#
# Use this after:
#   - A Home Assistant version bump (`.storage/` schema shifted).
#   - A Smart Plants schema/model change that alters config_entries or storage.
#   - Any deliberate change to the seeded demo (new demo plants, new dashboard).
#
# Prerequisite: the live rig (ha-up.sh --expose) has been onboarded, Smart
# Plants added, any desired demo data created, and then STOPPED (ha-down.sh)
# so state has flushed to disk. Running against a live container risks copying
# a half-written .storage/ file.
#
# The seed intentionally excludes runtime state (DB, logs, deps, run lock)
# and refresh tokens so no long-lived credential ships in git. The password
# for the seeded owner (admin / admin) is loopback-only per docker-compose.ha.yml
# and documented in docs/development/local-ha-testing.md.
#
# Files are copied into a staging directory first and checked by
# scripts/seed_guard.py. The committed seed is only replaced when the guard
# passes; otherwise the script exits non-zero and lists every problem.
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

runtime="dev/ha-config"
seed="dev/ha-config-seed"

if [[ ! -d "$runtime" ]]; then
  echo "dev/ha-config/ does not exist. Run ha-up.sh --expose, onboard, ha-down.sh first." >&2
  exit 1
fi
# HA never deletes .ha_run.lock (it holds an flock on it), so the file's
# presence says nothing; check the rig container instead.
if [[ -n "$(docker ps -q --filter name=^smart-plants-ha$)" ]]; then
  echo "The smart-plants-ha container is still running. Stop with ha-down.sh first." >&2
  exit 1
fi

# Requires python3 (present in requirements-dev.txt) for the seed guard, which
# validates the staged files.
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 required to run scripts/seed_guard.py." >&2
  exit 1
fi

storage_keep=(
  auth
  auth_provider.homeassistant
  onboarding
  person
  core.config_entries
  core.device_registry
  core.entity_registry
  core.area_registry
  core.uuid
  homeassistant.exposed_entities
  http
  lovelace_dashboards
  lovelace.map
)

staging=$(mktemp -d "${TMPDIR:-/tmp}/ha-seed.XXXXXX")
trap 'rm -rf "$staging"' EXIT
mkdir -p "$staging/.storage"

for k in "${storage_keep[@]}"; do
  if [[ -f "$runtime/.storage/$k" ]]; then
    cp "$runtime/.storage/$k" "$staging/.storage/$k"
  else
    echo "  skip (not present in runtime): $k"
  fi
done

if [[ -f "$runtime/.HA_VERSION" ]]; then
  cp "$runtime/.HA_VERSION" "$staging/.HA_VERSION"
fi

# Refuses the seed on any BOM, refresh token, privacy or login problem. Files
# are copied byte for byte, so a passing seed is UTF-8 without BOM. The
# committed seed stays untouched when it fails.
if ! python3 scripts/seed_guard.py --drop-content-user "$staging"; then
  echo "Seed NOT written; $seed is unchanged." >&2
  exit 1
fi

rm -rf "$seed/.storage"
cp -R "$staging/.storage" "$seed/.storage"
if [[ -f "$staging/.HA_VERSION" ]]; then
  cp "$staging/.HA_VERSION" "$seed/.HA_VERSION"
fi

echo
echo "Seed regenerated at: $seed"
echo "Review git diff, then commit."
