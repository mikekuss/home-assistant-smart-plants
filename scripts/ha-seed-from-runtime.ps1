# Regenerate dev/ha-config-seed/ from the currently populated dev/ha-config/.
#
# Use this after:
#   - A Home Assistant version bump (`.storage/` schema shifted).
#   - A Smart Plants schema/model change that alters config_entries or storage.
#   - Any deliberate change to the seeded demo (new demo plants, new dashboard).
#
# Prerequisite: the live rig (ha-up.ps1 -Expose) has been onboarded, Smart
# Plants added, any desired demo data created, and then STOPPED (ha-down.ps1)
# so state has flushed to disk. Running against a live container risks copying
# a half-written .storage/ file.
#
# The seed intentionally excludes runtime state (DB, logs, deps, run lock)
# and refresh tokens so no long-lived credential ships in git. The password
# for the seeded owner (admin / admin) is loopback-only per docker-compose.ha.yml
# and documented in docs/development/local-ha-testing.md.
#
# Files are copied into a staging directory first and checked by
# scripts/seed_guard.py (requires Python 3). The committed seed is only
# replaced when the guard passes; otherwise the script exits non-zero and
# lists every problem.

[CmdletBinding()]
param()
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$Runtime = Join-Path $RepoRoot "dev\ha-config"
$Seed    = Join-Path $RepoRoot "dev\ha-config-seed"

if (-not (Test-Path $Runtime)) { throw "dev/ha-config/ does not exist. Run ha-up.ps1 -Expose, onboard, ha-down.ps1 first." }
if (Test-Path (Join-Path $Runtime ".ha_run.lock")) {
    throw "dev/ha-config/.ha_run.lock present - HA is still running. Stop with ha-down.ps1 first."
}

# .storage keys worth seeding (identity, auth, integration, layout).
$StorageKeep = @(
    "auth",
    "auth_provider.homeassistant",
    "onboarding",
    "person",
    "core.config_entries",
    "core.device_registry",
    "core.entity_registry",
    "core.area_registry",
    "core.uuid",
    "homeassistant.exposed_entities",
    "http",
    "http.auth",
    "lovelace_dashboards",
    "lovelace.map"
)

# The guard is Python so the bash and PowerShell scripts share one tested
# implementation. Prefer the Windows launcher, then python / python3.
$Python = $null
foreach ($candidate in @(@("py", "-3"), @("python"), @("python3"))) {
    if (Get-Command $candidate[0] -ErrorAction SilentlyContinue) {
        $Python = $candidate
        break
    }
}
if (-not $Python) { throw "Python 3 is required to run scripts/seed_guard.py." }

$Staging = Join-Path ([IO.Path]::GetTempPath()) ("ha-seed." + [Guid]::NewGuid().ToString("N"))
$StagingStorage = Join-Path $Staging ".storage"
New-Item -ItemType Directory -Path $StagingStorage | Out-Null

try {
    foreach ($k in $StorageKeep) {
        $src = Join-Path $Runtime ".storage\$k"
        if (Test-Path $src) {
            Copy-Item $src (Join-Path $StagingStorage $k)
        } else {
            Write-Host ("  skip (not present in runtime): " + $k)
        }
    }

    # .HA_VERSION pins the schema level the seed matches; HA refuses to boot a
    # seed newer than the container image.
    $verSrc = Join-Path $Runtime ".HA_VERSION"
    if (Test-Path $verSrc) { Copy-Item $verSrc (Join-Path $Staging ".HA_VERSION") }

    # The guard refuses the seed on any BOM, refresh token, privacy or login
    # problem. Copy-Item keeps every file byte for byte and nothing here
    # re-encodes JSON through PowerShell, so a passing seed is UTF-8 without BOM.
    $pyExe = $Python[0]
    $pyArgs = @($Python | Select-Object -Skip 1) + @("scripts/seed_guard.py", $Staging)
    & $pyExe @pyArgs
    if ($LASTEXITCODE -ne 0) {
        [Console]::Error.WriteLine("Seed NOT written; " + $Seed + " is unchanged.")
        exit 1
    }

    $SeedStorage = Join-Path $Seed ".storage"
    if (Test-Path $SeedStorage) { Remove-Item -Recurse -Force $SeedStorage }
    Copy-Item -Recurse $StagingStorage $SeedStorage
    $verStaged = Join-Path $Staging ".HA_VERSION"
    if (Test-Path $verStaged) { Copy-Item $verStaged (Join-Path $Seed ".HA_VERSION") -Force }
} finally {
    Remove-Item -Recurse -Force $Staging -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Seed regenerated at: $Seed"
Write-Host "Review git diff, then commit."
