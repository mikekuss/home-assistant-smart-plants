"""
Privacy and integrity guard for regenerating ``dev/ha-config-seed/``.

``ha-seed-from-runtime.sh`` and ``ha-seed-from-runtime.ps1`` copy the curated
``.storage`` files of the local Home Assistant rig into a staging directory and
then run::

    python scripts/seed_guard.py --drop-content-user STAGING_DIR

The guard only reads the staged files; they are copied byte for byte from the
runtime, so a staged seed that passes is already UTF-8 without a byte order
mark. The one exception is ``--drop-content-user``, which the scripts pass: it
first removes Home Assistant's system "Home Assistant Content" user and its
system refresh token from the staged ``auth`` and deletes the staged
``http.auth`` that points at that token. The token cannot be logged out, and
Home Assistant creates a new content user on first boot when none is linked.

The guard validates the staged files against the currently committed seed
(read from ``git show HEAD:``), exits non-zero, and lists every problem when
the staged seed:

- has any file that starts with a UTF-8 byte order mark (Home Assistant 2026.9
  and newer refuse to decode such a storage file and discard it);
- has any refresh token in ``auth`` (they are refused, not stripped, so a
  session token from the runtime never passes through the guard);
- contains ``http.auth``, which only links the content user's refresh token;
- has an owner password hash that differs from the committed seed, so the
  documented ``admin`` / ``admin`` login would no longer work;
- has a ``smart_plants`` config entry with non-empty ``data`` or ``options``;
- has devices (active or deleted) with ``connections`` such as MAC addresses,
  with a serial number, or from an integration that the committed seed does
  not already contain (both the ``config_entries`` list of Home Assistant
  2026.7 and the single ``config_entry_id`` of 2026.8 and newer are read);
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
HTTP_AUTH = "http.auth"
CONTENT_USER_NAME = "Home Assistant Content"


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


def drop_content_user(seed_dir: Path) -> list[str]:
    """
    Remove the system content user and its system token from a staged seed.

    Home Assistant links this user to the signing of content URLs through
    ``http.auth``. Its refresh token cannot be logged out, so it would always
    trip the refresh token check. Only users that are system generated and
    carry the content user name are removed, together with their ``system``
    tokens; any other token stays and is refused by the guard.
    """
    removed: list[str] = []
    storage = seed_dir / ".storage"
    auth_path = storage / AUTH
    if auth_path.is_file():
        document = _decode(AUTH, auth_path.read_bytes())
        auth = document["data"]
        dropped = {
            user["id"]
            for user in auth.get("users", [])
            if user.get("system_generated") and user.get("name") == CONTENT_USER_NAME
        }
        if dropped:
            auth["users"] = [u for u in auth["users"] if u["id"] not in dropped]
            auth["refresh_tokens"] = [
                token
                for token in auth.get("refresh_tokens", [])
                if not (
                    token.get("user_id") in dropped
                    and token.get("token_type") == "system"
                )
            ]
            text = json.dumps(document, indent=2, ensure_ascii=False)
            auth_path.write_bytes(text.encode("utf-8"))
            removed.append(f"{AUTH}: removed {len(dropped)} system content user(s)")
    http_auth_path = storage / HTTP_AUTH
    if http_auth_path.is_file():
        http_auth_path.unlink()
        removed.append(f"{HTTP_AUTH}: removed")
    return removed


def files_with_bom(root: Path) -> list[str]:
    """Return every file below ``root`` that starts with a UTF-8 BOM."""
    return sorted(
        path.relative_to(root).as_posix()
        for path in root.rglob("*")
        if path.is_file() and path.read_bytes().startswith(UTF8_BOM)
    )


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
        # Home Assistant 2026.8 stores one config_entry_id per device instead
        # of a config_entries list.
        entry_ids = device.get("config_entries") or (
            [device["config_entry_id"]] if device.get("config_entry_id") else []
        )
        if not entry_ids:
            problems.append(f"{label} has no config entry")
        for entry_id in entry_ids:
            domain = domains.get(entry_id)
            if domain is None:
                problems.append(f"{label} references unknown config entry {entry_id}")
            elif domain not in baseline.integrations:
                problems.append(f"{label} belongs to new integration '{domain}'")
    return problems


def check_seed(seed_dir: Path, baseline: Baseline) -> list[str]:
    """Return every reason the staged seed directory must not become the seed."""
    problems = [
        f"{name}: starts with a UTF-8 byte order mark"
        for name in files_with_bom(seed_dir)
    ]
    if (seed_dir / ".storage" / HTTP_AUTH).is_file():
        problems.append(
            f"{HTTP_AUTH}: links the content user's refresh token and must not be "
            "seeded (run with --drop-content-user)"
        )
    read = directory_reader(seed_dir / ".storage")
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
    auth = _data(AUTH, read)
    names = {user.get("id"): user.get("name") for user in auth.get("users", [])}
    tokens = auth.get("refresh_tokens") or []
    if tokens:
        owners = ", ".join(
            f"{names.get(token.get('user_id'), 'unknown user')} "
            f"({token.get('token_type', 'unknown type')})"
            for token in tokens
        )
        problems.append(
            f"{AUTH}: contains {len(tokens)} refresh token(s) for {owners}; "
            "log out of every session before stopping the rig"
        )
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
    parser.add_argument(
        "--drop-content-user",
        action="store_true",
        help="remove the system content user, its token and http.auth first",
    )
    args = parser.parse_args(argv)
    staging: Path = args.staging

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

    if args.drop_content_user:
        for change in drop_content_user(staging):
            print(f"  {change}")

    problems = check_seed(staging, baseline)
    if problems:
        print("Refusing to write the seed:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
