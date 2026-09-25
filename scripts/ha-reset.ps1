# Wipe the live HA dev rig's runtime state and start fresh from the seed.
#
# Stops the stack, deletes dev/ha-config/, then re-runs ha-up so the seed
# in dev/ha-config-seed/ is re-copied. You will need to complete
# onboarding again on the next boot (Phase B will change that).
[CmdletBinding()]
param()
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

docker compose -f docker-compose.ha.yml down
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose failed to stop the Smart Plants HA stack; refusing to delete dev state."
}
$Config = Join-Path $RepoRoot "dev\ha-config"
if (Test-Path $Config) {
    Write-Host "Removing $Config ..."
    Remove-Item -Recurse -Force $Config
}
& (Join-Path $PSScriptRoot "ha-up.ps1")
exit $LASTEXITCODE
