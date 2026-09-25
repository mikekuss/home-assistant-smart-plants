# Tail Home Assistant logs, filtered to Smart Plants by default.
#
# Usage:
#   scripts/ha-logs.ps1          # follow smart_plants-only lines
#   scripts/ha-logs.ps1 -All     # follow every HA log line
[CmdletBinding()]
param(
    [switch]$All
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if ($All) {
    docker compose -f docker-compose.ha.yml logs -f homeassistant
} else {
    docker compose -f docker-compose.ha.yml logs -f homeassistant | Select-String -Pattern "smart_plants"
}
