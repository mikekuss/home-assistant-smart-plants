#!/usr/bin/env bash
# Start the live Home Assistant dev rig.
#
# Seeds dev/ha-config/ from dev/ha-config-seed/ if empty, then brings up
# docker-compose.ha.yml. Prints the login URL once HA is responding.
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

foreground=0
expose=0
for arg in "$@"; do
  case "$arg" in
    --foreground|-f) foreground=1 ;;
    --expose)        expose=1 ;;
  esac
done

compose_files=(-f docker-compose.ha.yml)
if [[ $expose -eq 1 ]]; then
  compose_files+=(-f docker-compose.ha.expose.yml)
fi

if [[ ! -d dev/ha-config ]]; then
  echo "Seeding dev/ha-config/ from dev/ha-config-seed/..."
  mkdir -p dev/ha-config
  # find includes hidden .HA_VERSION/.storage entries unlike shell globs.
  find dev/ha-config-seed -mindepth 1 -maxdepth 1 ! -name README.md -exec cp -r {} dev/ha-config/ \;
fi

if [[ $foreground -eq 1 ]]; then
  exec docker compose "${compose_files[@]}" up
fi

docker compose "${compose_files[@]}" up -d

port=${HA_HOST_PORT:-8123}
url="http://localhost:${port}"
echo "Waiting for Home Assistant at ${url} ..."

deadline=$(( $(date +%s) + 180 ))
while [[ $(date +%s) -lt $deadline ]]; do
  if curl -fsS "${url}/manifest.json" >/dev/null 2>&1; then
    echo
    echo "Home Assistant is up: ${url}"
    echo "Log in with the seeded dev owner: admin / admin (loopback-only rig)."
    echo "Smart Plants is already added; regenerate the seed with scripts/ha-seed-from-runtime.sh after any HA or schema change."
    exit 0
  fi
  sleep 3
done

echo "Timed out waiting for HA. Check: scripts/ha-logs.sh" >&2
exit 1
