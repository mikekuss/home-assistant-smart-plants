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

# Requires python3 (present in requirements-dev.txt) for the token-stripping
# post-process on the auth blob.
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 required to strip refresh tokens from seeded auth." >&2
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

rm -rf "$seed/.storage"
mkdir -p "$seed/.storage"

for k in "${storage_keep[@]}"; do
  if [[ -f "$runtime/.storage/$k" ]]; then
    cp "$runtime/.storage/$k" "$seed/.storage/$k"
  else
    echo "  skip (not present in runtime): $k"
  fi
done

if [[ -f "$runtime/.HA_VERSION" ]]; then
  cp "$runtime/.HA_VERSION" "$seed/.HA_VERSION"
fi

python3 - <<'PY'
import json, pathlib
p = pathlib.Path("dev/ha-config-seed/.storage/auth")
if p.exists():
    data = json.loads(p.read_text())
    data["data"]["refresh_tokens"] = []
    # The system content user is only reachable through its refresh token,
    # which is stripped above. Drop the user as well (http.auth, which points
    # at the token, is not seeded) so HA creates exactly one on first boot.
    data["data"]["users"] = [
        user
        for user in data["data"]["users"]
        if not (
            user.get("system_generated")
            and user.get("name") == "Home Assistant Content"
        )
    ]
    p.write_text(json.dumps(data, indent=4))
PY

echo
echo "Seed regenerated at: $seed"
echo "Review git diff, then commit."
