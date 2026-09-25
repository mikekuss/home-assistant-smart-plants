#!/usr/bin/env bash
# Wipe the live HA dev rig's runtime state and start fresh from the seed.
#
# Stops the stack, deletes dev/ha-config/, then re-runs ha-up so the seed
# in dev/ha-config-seed/ is re-copied. You will need to complete
# onboarding again on the next boot (Phase B will change that).
#
# On Linux hosts HA writes as root inside the container, so removing
# dev/ha-config/ may require sudo.
set -euo pipefail
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

docker compose -f docker-compose.ha.yml down
if [[ -d dev/ha-config ]]; then
  echo "Removing dev/ha-config ..."
  rm -rf dev/ha-config
fi
exec "$repo_root/scripts/ha-up.sh"
