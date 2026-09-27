"""
Privacy and integrity guard for regenerating ``dev/ha-config-seed/``.

``ha-seed-from-runtime.sh`` and ``ha-seed-from-runtime.ps1`` copy the curated
``.storage`` files of the local Home Assistant rig into a staging directory and
then run::

    python scripts/seed_guard.py STAGING_DIR

The guard strips refresh tokens from the staged ``auth`` store, writes it back
as UTF-8 without a byte order mark, and validates the staged files against the
currently committed seed (read from ``git show HEAD:``). It exits non-zero and
lists every problem when the staged seed:

- has any file that starts with a UTF-8 byte order mark (Home Assistant 2026.9
  and newer refuse to decode such a storage file and discard it);
- has any refresh token in ``auth``;
- has an owner password hash that differs from the committed seed, so the
  documented ``admin`` / ``admin`` login would no longer work;
- has a ``smart_plants`` config entry with non-empty ``data`` or ``options``;
- has devices (active or deleted) with ``connections`` such as MAC addresses,
  with a serial number, or from an integration that the committed seed does
  not already contain;
- has areas that the committed seed does not already contain.

The scripts only replace the committed seed when the guard passes.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = "dev/ha-config-seed"
UTF8_BOM = b"\xef\xbb\xbf"
SMART_PLANTS_DOMAIN = "smart_plants"

AUTH = "auth"
AUTH_PROVIDER = "auth_provider.homeassistant"
CONFIG_ENTRIES = "core.config_entries"
DEVICE_REGISTRY = "core.device_registry"
AREA_REGISTRY = "core.area_registry"


class SeedError(Exception):
    """A seed file is missing or cannot be interpreted."""


@dataclass(frozen=True)
class Baseline:
    """Facts about the committed seed that a regenerated seed must keep."""

    owner_password_hash: str
    integrations: frozenset[str]
    area_ids: frozenset[str]


def _decode(name: str, raw: bytes | None) -> Any:
    if raw is None:
        raise SeedError(f"{name}: file is missing")
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as err:
        raise SeedError(f"{name}: not valid UTF-8 JSON ({err})") from err


def _data(name: str, read: Callable[[str], bytes | None]) -> dict[str, Any]:
    document = _decode(name, read(name))
    if not isinstance(document, dict) or not isinstance(document.get("data"), dict):
        raise SeedError(f"{name}: missing top-level 'data' object")
    data: dict[str, Any] = document["data"]
    return data


def owner_password_hash(read: Callable[[str], bytes | None]) -> str:
    """Return the Home Assistant auth provider password hash of the owner."""
    auth = _data(AUTH, read)
    owners = [user["id"] for user in auth.get("users", []) if user.get("is_owner")]
    if len(owners) != 1:
        raise SeedError(f"{AUTH}: expected exactly one owner, found {len(owners)}")
    usernames = [
        cred.get("data", {}).get("username")
        for cred in auth.get("credentials", [])
        if cred.get("user_id") == owners[0]
        and cred.get("auth_provider_type") == "homeassistant"
    ]
    if len(usernames) != 1 or not usernames[0]:
        raise SeedError(f"{AUTH}: owner has no single homeassistant credential")
    provider = _data(AUTH_PROVIDER, read)
    hashes = [
        user.get("password")
        for user in provider.get("users", [])
        if user.get("username") == usernames[0]
    ]
    if len(hashes) != 1 or not isinstance(hashes[0], str):
        raise SeedError(f"{AUTH_PROVIDER}: no password hash for the owner")
    return hashes[0]


def _entry_domains(read: Callable[[str], bytes | None]) -> dict[str, str]:
    entries = _data(CONFIG_ENTRIES, read).get("entries", [])
    return {entry["entry_id"]: entry["domain"] for entry in entries}


def load_baseline(read: Callable[[str], bytes | None]) -> Baseline:
    """Collect the facts a regenerated seed is compared against."""
    domains = _entry_domains(read)
    areas = _data(AREA_REGISTRY, read).get("areas", [])
    return Baseline(
        owner_password_hash=owner_password_hash(read),
        integrations=frozenset(domains.values()),
        area_ids=frozenset(area["id"] for area in areas),
    )


def directory_reader(storage_dir: Path) -> Callable[[str], bytes | None]:
    """Read ``.storage`` keys from a directory on disk."""

    def read(name: str) -> bytes | None:
        path = storage_dir / name
        return path.read_bytes() if path.is_file() else None

    return read


def git_head_reader(repo_root: Path) -> Callable[[str], bytes | None]:
    """Read ``.storage`` keys of the seed committed at ``HEAD``."""

    def read(name: str) -> bytes | None:
        result = subprocess.run(  # noqa: S603
            ["git", "show", f"HEAD:{SEED_PATH}/.storage/{name}"],  # noqa: S607
            cwd=repo_root,
            capture_output=True,
            check=False,
        )
        return result.stdout if result.returncode == 0 else None

    return read


def files_with_bom(root: Path) -> list[str]:
    """Return every file below ``root`` that starts with a UTF-8 BOM."""
    return sorted(
        path.relative_to(root).as_posix()
        for path in root.rglob("*")
        if path.is_file() and path.read_bytes().startswith(UTF8_BOM)
    )


def write_json(path: Path, document: Any) -> None:
    """Write JSON as UTF-8 without BOM and with LF line endings."""
    path.write_bytes((json.dumps(document, indent=4) + "\n").encode("utf-8"))


def strip_refresh_tokens(storage_dir: Path) -> None:
    """Remove every refresh token from the staged ``auth`` store."""
    path = storage_dir / AUTH
    document = _decode(AUTH, path.read_bytes() if path.is_file() else None)
    document["data"]["refresh_tokens"] = []
    write_json(path, document)


def _check_devices(
    read: Callable[[str], bytes | None], baseline: Baseline
) -> list[str]:
    problems: list[str] = []
    domains = _entry_domains(read)
    registry = _data(DEVICE_REGISTRY, read)
    devices = [
        (kind, device)
        for kind in ("devices", "deleted_devices")
        for device in registry.get(kind, [])
    ]
    for kind, device in devices:
        label = f"{DEVICE_REGISTRY}: {kind} {device.get('id')} ({device.get('name')})"
        if device.get("connections"):
            problems.append(f"{label} has connections (for example MAC addresses)")
        if device.get("serial_number"):
            problems.append(f"{label} has a serial number")
        entry_ids = device.get("config_entries") or []
        if not entry_ids:
            problems.append(f"{label} has no config entry")
        for entry_id in entry_ids:
            domain = domains.get(entry_id)
            if domain is None:
                problems.append(f"{label} references unknown config entry {entry_id}")
            elif domain not in baseline.integrations:
                problems.append(f"{label} belongs to new integration '{domain}'")
    return problems


def check_seed(storage_dir: Path, baseline: Baseline) -> list[str]:
    """Return every reason the staged ``.storage`` must not become the seed."""
    problems = [
        f"{name}: starts with a UTF-8 byte order mark"
        for name in files_with_bom(storage_dir)
    ]
    read = directory_reader(storage_dir)
    checks: list[Callable[[], list[str]]] = [
        lambda: _check_auth(read, baseline),
        lambda: _check_smart_plants_entry(read),
        lambda: _check_devices(read, baseline),
        lambda: _check_areas(read, baseline),
    ]
    for check in checks:
        try:
            problems.extend(check())
        except (SeedError, KeyError, TypeError, AttributeError) as err:
            problems.append(str(err) if isinstance(err, SeedError) else repr(err))
    return problems


def _check_auth(read: Callable[[str], bytes | None], baseline: Baseline) -> list[str]:
    problems: list[str] = []
    tokens = _data(AUTH, read).get("refresh_tokens")
    if tokens:
        problems.append(f"{AUTH}: contains {len(tokens)} refresh token(s)")
    if owner_password_hash(read) != baseline.owner_password_hash:
        problems.append(
            f"{AUTH_PROVIDER}: owner password hash differs from the committed seed "
            "(reset the owner password to admin / admin before regenerating)"
        )
    return problems


def _check_smart_plants_entry(read: Callable[[str], bytes | None]) -> list[str]:
    return [
        f"{CONFIG_ENTRIES}: {SMART_PLANTS_DOMAIN} entry {entry['entry_id']} "
        f"has non-empty {field}"
        for entry in _data(CONFIG_ENTRIES, read).get("entries", [])
        if entry.get("domain") == SMART_PLANTS_DOMAIN
        for field in ("data", "options")
        if entry.get(field)
    ]


def _check_areas(read: Callable[[str], bytes | None], baseline: Baseline) -> list[str]:
    return [
        f"{AREA_REGISTRY}: new area '{area.get('id')}' ({area.get('name')})"
        for area in _data(AREA_REGISTRY, read).get("areas", [])
        if area.get("id") not in baseline.area_ids
    ]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("staging", type=Path, help="staged seed directory")
    parser.add_argument(
        "--baseline-dir",
        type=Path,
        help="seed directory to compare against (default: the seed at git HEAD)",
    )
    args = parser.parse_args(argv)
    staging: Path = args.staging
    storage_dir = staging / ".storage"

    try:
        read_baseline = (
            directory_reader(args.baseline_dir / ".storage")
            if args.baseline_dir
            else git_head_reader(REPO_ROOT)
        )
        baseline = load_baseline(read_baseline)
    except SeedError as err:
        print(f"Cannot read the committed seed: {err}", file=sys.stderr)
        return 2

    # A BOM is refused on the files exactly as copied from the runtime, before
    # anything is rewritten, so the guard never silently repairs one.
    problems = [
        f"{name}: starts with a UTF-8 byte order mark"
        for name in files_with_bom(staging)
    ]
    if not problems:
        try:
            strip_refresh_tokens(storage_dir)
        except (SeedError, KeyError, TypeError) as err:
            problems.append(f"{AUTH}: cannot strip refresh tokens ({err!r})")
        else:
            problems = check_seed(storage_dir, baseline)

    if problems:
        print("Refusing to write the seed:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
