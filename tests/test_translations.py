"""
Consistency checks for the integration's translation files.

English is the source: ``strings.json`` holds the strings and
``translations/en.json`` must carry the same content. Other languages may leave
keys out, because Home Assistant falls back to English per key, but they must
not add keys English lacks or change the placeholders a string uses.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pytest

INTEGRATION = (
    Path(__file__).resolve().parent.parent / "custom_components" / "smart_plants"
)
STRINGS_PATH = INTEGRATION / "strings.json"
TRANSLATIONS = INTEGRATION / "translations"
TRANSLATION_FILES = sorted(TRANSLATIONS.glob("*.json"))
OTHER_LANGUAGES = [path for path in TRANSLATION_FILES if path.stem != "en"]

# Languages whose translation must cover every English key.
COMPLETE_LANGUAGES = ("de",)

PLACEHOLDER = re.compile(r"\{(\w+)\}")
# Home Assistant resolves `[%key:...]` references only when it builds its own
# core translations; in a custom integration the marker would reach the UI as
# literal text.
REFERENCE = re.compile(r"\[%key:[^\]]*\]")


def _load(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(data, dict)
    return data


def _flatten(data: dict[str, Any], prefix: str = "") -> dict[str, str]:
    flat: dict[str, str] = {}
    for key, value in data.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            flat.update(_flatten(value, path))
        else:
            assert isinstance(value, str), f"{path} is not a string"
            flat[path] = value
    return flat


def _placeholders(text: str) -> list[str]:
    return sorted(PLACEHOLDER.findall(text))


ENGLISH = _flatten(_load(TRANSLATIONS / "en.json"))


def test_english_matches_strings() -> None:
    assert _load(TRANSLATIONS / "en.json") == _load(STRINGS_PATH)


def test_translation_files_found() -> None:
    names = [path.name for path in TRANSLATION_FILES]
    assert "en.json" in names
    for language in COMPLETE_LANGUAGES:
        assert f"{language}.json" in names


@pytest.mark.parametrize("path", OTHER_LANGUAGES, ids=lambda path: path.name)
def test_no_keys_beyond_english(path: Path) -> None:
    extra = sorted(set(_flatten(_load(path))) - set(ENGLISH))
    assert extra == [], f"{path.name} has keys English lacks"


@pytest.mark.parametrize("path", OTHER_LANGUAGES, ids=lambda path: path.name)
def test_placeholders_match_english(path: Path) -> None:
    mismatched = {
        key: (_placeholders(text), _placeholders(ENGLISH[key]))
        for key, text in _flatten(_load(path)).items()
        if key in ENGLISH and _placeholders(text) != _placeholders(ENGLISH[key])
    }
    assert mismatched == {}, f"{path.name} placeholders differ from English"


@pytest.mark.parametrize(
    "path", [STRINGS_PATH, *TRANSLATION_FILES], ids=lambda path: path.name
)
def test_no_unresolved_references(path: Path) -> None:
    markers = {
        key: text
        for key, text in _flatten(_load(path)).items()
        if REFERENCE.search(text)
    }
    assert markers == {}, f"{path.name} contains [%key:...] references"


@pytest.mark.parametrize("path", OTHER_LANGUAGES, ids=lambda path: path.name)
def test_no_empty_strings(path: Path) -> None:
    empty = sorted(
        key for key, text in _flatten(_load(path)).items() if not text.strip()
    )
    assert empty == [], f"{path.name} has empty strings"


@pytest.mark.parametrize("language", COMPLETE_LANGUAGES)
def test_complete_languages_cover_english(language: str) -> None:
    missing = sorted(
        set(ENGLISH) - set(_flatten(_load(TRANSLATIONS / f"{language}.json")))
    )
    assert missing == [], f"{language}.json is missing keys"
