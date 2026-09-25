# Stop the live Home Assistant dev rig. Keeps dev/ha-config/ intact.
[CmdletBinding()]
param()
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
docker compose -f docker-compose.ha.yml -f docker-compose.ha.expose.yml down --remove-orphans
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
