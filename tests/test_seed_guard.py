from __future__ import annotations

import importlib.util
import json
import sys
from collections.abc import Callable
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

GUARD_PATH = Path(__file__).resolve().parent.parent / "scripts" / "seed_guard.py"
OWNER_HASH = "dGVzdC1vd25lci1oYXNo"
OTHER_HASH = "dGVzdC1vdGhlci1oYXNo"
Seed = dict[str, dict[str, Any]]


def _load_guard() -> ModuleType:
    spec = importlib.util.spec_from_file_location("seed_guard", GUARD_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    # dataclasses resolve their module through sys.modules.
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


guard = _load_guard()


def _device(entry_id: str, **extra: Any) -> dict[str, Any]:
    return {
        "id": f"device-{entry_id}",
        "name": "Mock Device",
        "config_entries": [entry_id],
        "connections": [],
        "serial_number": None,
        **extra,
    }


def _seed() -> Seed:
    return {
        "auth": {
            "users": [
                {"id": "system-user", "is_owner": False},
                {"id": "owner-user", "is_owner": True},
            ],
            "credentials": [
                {
                    "user_id": "owner-user",
                    "auth_provider_type": "homeassistant",
                    "data": {"username": "admin"},
                }
            ],
            "refresh_tokens": [],
        },
        "auth_provider.homeassistant": {
            "users": [{"username": "admin", "password": OWNER_HASH}]
        },
        "core.config_entries": {
            "entries": [
                {"entry_id": "sun-entry", "domain": "sun", "data": {}, "options": {}},
                {
                    "entry_id": "plants-entry",
                    "domain": "smart_plants",
                    "data": {},
                    "options": {},
                },
            ]
        },
        "core.device_registry": {
            "devices": [_device("sun-entry")],
            "deleted_devices": [],
        },
        "core.area_registry": {"areas": [{"id": "kitchen", "name": "Kitchen"}]},
    }


def _write(root: Path, seed: Seed) -> Path:
    storage = root / ".storage"
    storage.mkdir(parents=True)
    for name, data in seed.items():
        document = {"version": 1, "key": name, "data": data}
        (storage / name).write_text(json.dumps(document), encoding="utf-8")
    (root / ".HA_VERSION").write_text("2026.7.0", encoding="utf-8")
    return storage


@pytest.fixture
def baseline(tmp_path: Path) -> Any:
    storage = _write(tmp_path / "baseline", _seed())
    return guard.load_baseline(guard.directory_reader(storage))


def _add_refresh_token(seed: Seed) -> None:
    seed["auth"]["refresh_tokens"].append({"id": "mock-token", "token": "fake"})


def _change_owner_hash(seed: Seed) -> None:
    seed["auth_provider.homeassistant"]["users"][0]["password"] = OTHER_HASH


def _set_smart_plants_data(seed: Seed) -> None:
    seed["core.config_entries"]["entries"][1]["data"] = {"client_id": "test-id"}


def _set_smart_plants_options(seed: Seed) -> None:
    seed["core.config_entries"]["entries"][1]["options"] = {"key": "value"}


def _add_connection(seed: Seed) -> None:
    seed["core.device_registry"]["devices"][0]["connections"] = [
        ["mac", "00:00:5e:00:53:01"]
    ]


def _add_serial(seed: Seed) -> None:
    seed["core.device_registry"]["devices"][0]["serial_number"] = "MOCK-0001"


def _add_deleted_device_connection(seed: Seed) -> None:
    seed["core.device_registry"]["deleted_devices"].append(
        _device("sun-entry", connections=[["mac", "00:00:5e:00:53:02"]])
    )


def _add_new_integration_device(seed: Seed) -> None:
    seed["core.config_entries"]["entries"].append(
        {"entry_id": "hue-entry", "domain": "hue", "data": {}, "options": {}}
    )
    seed["core.device_registry"]["devices"].append(_device("hue-entry"))


def _add_area(seed: Seed) -> None:
    seed["core.area_registry"]["areas"].append({"id": "garage", "name": "Garage"})


def test_unchanged_seed_passes(tmp_path: Path, baseline: Any) -> None:
    storage = _write(tmp_path / "staging", _seed())
    assert guard.check_seed(storage, baseline) == []


def test_smart_plants_devices_are_allowed(tmp_path: Path, baseline: Any) -> None:
    seed = _seed()
    seed["core.device_registry"]["devices"].append(_device("plants-entry"))
    storage = _write(tmp_path / "staging", seed)
    assert guard.check_seed(storage, baseline) == []


@pytest.mark.parametrize(
    ("mutate", "expected"),
    [
        (_add_refresh_token, "refresh token"),
        (_change_owner_hash, "password hash differs"),
        (_set_smart_plants_data, "non-empty data"),
        (_set_smart_plants_options, "non-empty options"),
        (_add_connection, "has connections"),
        (_add_serial, "serial number"),
        (_add_deleted_device_connection, "deleted_devices"),
        (_add_new_integration_device, "new integration 'hue'"),
        (_add_area, "new area 'garage'"),
    ],
)
def test_unsafe_seed_is_refused(
    tmp_path: Path,
    baseline: Any,
    mutate: Callable[[Seed], None],
    expected: str,
) -> None:
    seed = _seed()
    mutate(seed)
    storage = _write(tmp_path / "staging", seed)
    problems = guard.check_seed(storage, baseline)
    assert len(problems) == 1
    assert expected in problems[0]


def test_bom_is_refused(tmp_path: Path, baseline: Any) -> None:
    storage = _write(tmp_path / "staging", _seed())
    path = storage / "core.area_registry"
    path.write_bytes(guard.UTF8_BOM + path.read_bytes())
    problems = guard.check_seed(storage, baseline)
    assert problems[0] == "core.area_registry: starts with a UTF-8 byte order mark"


def test_main_strips_tokens_and_writes_utf8_without_bom(tmp_path: Path) -> None:
    _write(tmp_path / "baseline", _seed())
    seed = _seed()
    _add_refresh_token(seed)
    storage = _write(tmp_path / "staging", seed)

    exit_code = guard.main(
        [str(tmp_path / "staging"), "--baseline-dir", str(tmp_path / "baseline")]
    )

    assert exit_code == 0
    raw = (storage / "auth").read_bytes()
    assert not raw.startswith(guard.UTF8_BOM)
    assert b"\r\n" not in raw
    assert json.loads(raw.decode("utf-8"))["data"]["refresh_tokens"] == []


def test_main_refuses_bom_before_rewriting(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    _write(tmp_path / "baseline", _seed())
    storage = _write(tmp_path / "staging", _seed())
    auth = storage / "auth"
    auth.write_bytes(guard.UTF8_BOM + auth.read_bytes())

    exit_code = guard.main(
        [str(tmp_path / "staging"), "--baseline-dir", str(tmp_path / "baseline")]
    )

    assert exit_code == 1
    assert auth.read_bytes().startswith(guard.UTF8_BOM)
    assert ".storage/auth: starts with a UTF-8 byte order mark" in (
        capsys.readouterr().err
    )


def test_main_refuses_unsafe_seed(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    _write(tmp_path / "baseline", _seed())
    seed = _seed()
    _add_area(seed)
    _write(tmp_path / "staging", seed)

    exit_code = guard.main(
        [str(tmp_path / "staging"), "--baseline-dir", str(tmp_path / "baseline")]
    )

    assert exit_code == 1
    assert "Refusing to write the seed" in capsys.readouterr().err


def test_committed_seed_passes_the_guard() -> None:
    seed_dir = GUARD_PATH.parent.parent / "dev" / "ha-config-seed"
    read = guard.directory_reader(seed_dir / ".storage")
    baseline = guard.load_baseline(read)
    assert guard.files_with_bom(seed_dir) == []
    assert guard.check_seed(seed_dir / ".storage", baseline) == []
