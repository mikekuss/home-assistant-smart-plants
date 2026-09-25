# Start the live Home Assistant dev rig.
#
# Seeds dev/ha-config/ from dev/ha-config-seed/ if empty, then brings up
# docker-compose.ha.yml. Prints the login URL once HA is responding.
[CmdletBinding()]
param(
    [switch]$Foreground,
    [switch]$Expose
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$Config = Join-Path $RepoRoot "dev\ha-config"
$Seed = Join-Path $RepoRoot "dev\ha-config-seed"

if (-not (Test-Path $Config)) {
    Write-Host "Seeding dev/ha-config/ from dev/ha-config-seed/..."
    New-Item -ItemType Directory -Path $Config | Out-Null
    # -Force is required because PowerShell wildcard expansion omits hidden
    # files such as .HA_VERSION and the .storage directory.
    Get-ChildItem -LiteralPath $Seed -Force |
        Where-Object { $_.Name -ne "README.md" } |
        Copy-Item -Destination $Config -Recurse -Force
}

$composeArgs = @("compose", "-f", "docker-compose.ha.yml")
if ($Expose) { $composeArgs += @("-f", "docker-compose.ha.expose.yml") }
$composeArgs += "up"
if (-not $Foreground) { $composeArgs += "-d" }

& docker @composeArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Foreground) { exit 0 }

$Port = if ($env:HA_HOST_PORT) { $env:HA_HOST_PORT } else { "8123" }
$Url = "http://localhost:$Port"
Write-Host "Waiting for Home Assistant at $Url ..."

$Deadline = (Get-Date).AddSeconds(180)
while ((Get-Date) -lt $Deadline) {
    try {
        $r = Invoke-WebRequest -Uri "$Url/manifest.json" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) {
            Write-Host ""
            Write-Host "Home Assistant is up: $Url"
            Write-Host "Log in with the seeded dev owner: admin / admin (loopback-only rig)."
            Write-Host "Smart Plants is already added; regenerate the seed with scripts/ha-seed-from-runtime.ps1 after any HA or schema change."
            exit 0
        }
    } catch {}
    Start-Sleep -Seconds 3
}
Write-Warning "Timed out waiting for HA. Check: scripts/ha-logs.ps1"
exit 1
