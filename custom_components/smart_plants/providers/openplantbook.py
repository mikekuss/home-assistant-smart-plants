"""Direct OpenPlantBook API client using Home Assistant's shared session."""

from __future__ import annotations

import asyncio
import json
import time
from collections import OrderedDict
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass
from typing import Any, cast
from urllib.parse import quote

import aiohttp
from custom_components.smart_plants.const import (
    CONF_OPENPLANTBOOK_CLIENT_ID,
    CONF_OPENPLANTBOOK_CLIENT_SECRET,
    CONF_OPENPLANTBOOK_ENABLED,
)
from custom_components.smart_plants.models import SpeciesSnapshot
from custom_components.smart_plants.provider import (
    ProviderAuthenticationError,
    ProviderDescriptor,
    ProviderError,
    ProviderMalformedResponseError,
    ProviderNotFoundError,
    ProviderOutageError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    SpeciesProfile,
    SpeciesSearchResult,
)
from custom_components.smart_plants.storage import _utcnow_iso
from homeassistant.helpers.aiohttp_client import async_get_clientsession

BASE_URL = "https://open.plantbook.io"
ATTRIBUTION = "OpenPlantBook (https://open.plantbook.io/)"
CONNECT_TIMEOUT = 5
TOTAL_TIMEOUT = 15
CACHE_MAX_AGE = 60 * 60
CACHE_MAX_COUNT = 128
HTTP_NOT_FOUND = 404
HTTP_RATE_LIMITED = 429
HTTP_SERVER_ERROR = 500
HTTP_SUCCESS_MIN = 200
HTTP_SUCCESS_MAX = 300
PERCENT_MAX = 100
API_SHORT_TEXT_MAX = 100
API_CARE_TEXT_MAX = 4_000
ACCESS_TOKEN_MAX_LENGTH = 4_096
ACCESS_TOKEN_MAX_AGE = 31 * 24 * 60 * 60
CLIENT_ID_MAX_LENGTH = 500
CLIENT_SECRET_MAX_LENGTH = 4_096
RESPONSE_MAX_BYTES = 256 * 1024
MAX_PROVIDER_RESULTS = 50


@dataclass(frozen=True, slots=True)
class _CacheItem:
    created: float
    value: Any


class OpenPlantBookProvider:
    key = "openplantbook"

    def __init__(
        self,
        session: aiohttp.ClientSession,
        client_id: str,
        client_secret: str,
        *,
        now: Callable[[], float] = time.monotonic,
    ) -> None:
        self._session = session
        self._client_id = client_id
        self._client_secret = client_secret
        self._now = now
        self._cache: OrderedDict[tuple[Any, ...], _CacheItem] = OrderedDict()
        self._access_token: str | None = None
        self._token_expires_at = 0.0
        self._token_generation = 0
        self._token_task: asyncio.Task[str] | None = None
        self._cache_generation = 0
        self._inflight: dict[tuple[Any, ...], asyncio.Task[Any]] = {}
        self._tasks: set[asyncio.Task[Any]] = set()
        self._closed = False
        self._timeout = aiohttp.ClientTimeout(
            total=TOTAL_TIMEOUT, connect=CONNECT_TIMEOUT
        )

    async def async_validate_credentials(self) -> None:
        await self._async_token(force=True)

    async def async_search(
        self, query: str, locale: str, limit: int
    ) -> tuple[SpeciesSearchResult, ...]:
        key = ("search", query, locale, limit)
        cached = self._cache_get(key)
        if cached is not None:
            return cast("tuple[SpeciesSearchResult, ...]", cached)

        async def _load() -> tuple[SpeciesSearchResult, ...]:
            payload, _headers = await self._request_json(
                "GET",
                "/api/v1/plant/search",
                params={"alias": query, "limit": str(limit), "offset": "0"},
            )
            if not isinstance(payload, dict) or not isinstance(
                payload.get("results"), list
            ):
                raise ProviderMalformedResponseError(
                    "provider returned malformed search data"
                )
            if len(payload["results"]) > MAX_PROVIDER_RESULTS:
                raise ProviderMalformedResponseError(
                    "provider returned too many search results"
                )
            results: list[SpeciesSearchResult] = []
            for item in payload["results"]:
                if not isinstance(item, dict):
                    raise ProviderMalformedResponseError(
                        "provider returned malformed search data"
                    )
                pid = _required_short(item.get("pid"), "search provider_ref")
                latin = _required_short(item.get("display_pid"), "search latin name")
                alias = _optional_short(item.get("alias"), "search common name")
                category = _optional_short(item.get("category"), "search category")
                results.append(
                    SpeciesSearchResult(
                        provider=self.key,
                        provider_ref=pid,
                        common_name=alias,
                        latin_name=latin,
                        category=category,
                        attribution=ATTRIBUTION,
                    )
                )
            return tuple(results[:limit])

        return cast(
            "tuple[SpeciesSearchResult, ...]", await self._async_cached(key, _load)
        )

    async def async_get_species(
        self, provider_ref: str, locale: str, *, force_refresh: bool = False
    ) -> SpeciesProfile:
        key = ("detail", provider_ref, locale)
        if force_refresh:
            self.invalidate(provider_ref=provider_ref)
        else:
            cached = self._cache_get(key)
            if cached is not None:
                return cast("SpeciesProfile", cached)

        async def _load() -> SpeciesProfile:
            payload, _headers = await self._request_json(
                "GET",
                f"/api/v1/plant/detail/{quote(provider_ref, safe='')}/",
                params={"lang": locale, "include": "care"},
            )
            profile = _normalize_profile(payload, locale)
            if profile.snapshot.provider_ref != provider_ref:
                raise ProviderMalformedResponseError(
                    "provider returned the wrong species"
                )
            return profile

        return cast("SpeciesProfile", await self._async_cached(key, _load))

    def invalidate(self, *, provider_ref: str | None = None) -> None:
        self._cache_generation += 1
        if provider_ref is None:
            self._inflight.clear()
        else:
            for key in tuple(self._inflight):
                if key[0] == "detail" and key[1] == provider_ref:
                    self._inflight.pop(key, None)
        if provider_ref is None:
            self._cache.clear()
            return
        for key in tuple(self._cache):
            if key[0] == "detail" and key[1] == provider_ref:
                self._cache.pop(key, None)

    async def async_close(self) -> None:
        self._closed = True
        self._cache_generation += 1
        self._token_generation += 1
        self._cache.clear()
        self._access_token = None
        tasks = [*self._tasks]
        if self._token_task is not None:
            tasks.append(self._token_task)
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._inflight.clear()
        self._token_task = None
        self._client_id = ""
        self._client_secret = ""

    def diagnostics(self) -> Mapping[str, Any]:
        return {
            "configured": bool(self._client_id and self._client_secret),
            "networked": True,
            "cache_count": len(self._cache),
            "token_cached": self._access_token is not None,
            "closed": self._closed,
        }

    async def _async_token(self, *, force: bool = False) -> str:
        if self._closed:
            raise ProviderOutageError("provider client is closed")
        now = self._now()
        if not force and self._access_token and now < self._token_expires_at:
            return self._access_token
        if force and self._access_token is not None:
            self._token_generation += 1
            self._access_token = None
            self._token_expires_at = 0
        task = self._token_task
        if task is None:
            generation = self._token_generation
            task = asyncio.create_task(self._async_fetch_token(generation))
            self._tasks.add(task)
            task.add_done_callback(self._tasks.discard)
            self._token_task = task
        try:
            return await asyncio.shield(task)
        finally:
            if task.done() and self._token_task is task:
                self._token_task = None

    async def _async_fetch_token(self, generation: int) -> str:
        payload, _headers = await self._request_once(
            "POST",
            "/api/v1/token/",
            authenticated=False,
            data={
                "grant_type": "client_credentials",
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "scope": "read",
            },
        )
        if not isinstance(payload, dict):
            raise ProviderMalformedResponseError("provider returned a malformed token")
        token = payload.get("access_token")
        expires = payload.get("expires_in")
        if (
            not isinstance(token, str)
            or not token
            or len(token) > ACCESS_TOKEN_MAX_LENGTH
            or isinstance(expires, bool)
            or not isinstance(expires, int)
            or expires <= 0
            or expires > ACCESS_TOKEN_MAX_AGE
        ):
            raise ProviderMalformedResponseError("provider returned a malformed token")
        if self._closed or generation != self._token_generation:
            raise ProviderOutageError("provider client is closed or invalidated")
        self._access_token = token
        self._token_expires_at = self._now() + max(0, expires - 60)
        return token

    async def _request_json(
        self,
        method: str,
        path: str,
        *,
        authenticated: bool = True,
        params: Mapping[str, str] | None = None,
        data: Mapping[str, str] | None = None,
    ) -> tuple[Any, Mapping[str, str]]:
        if not authenticated:
            return await self._request_once(
                method, path, authenticated=False, params=params, data=data
            )
        token = await self._async_token()
        try:
            return await self._request_once(
                method, path, token=token, params=params, data=data
            )
        except ProviderAuthenticationError:
            self._invalidate_token(token)
            fresh_token = await self._async_token()
            return await self._request_once(
                method, path, token=fresh_token, params=params, data=data
            )

    async def _request_once(  # noqa: PLR0913
        self,
        method: str,
        path: str,
        *,
        authenticated: bool = True,
        token: str | None = None,
        params: Mapping[str, str] | None = None,
        data: Mapping[str, str] | None = None,
    ) -> tuple[Any, Mapping[str, str]]:
        if self._closed:
            raise ProviderOutageError("provider client is closed")
        headers: dict[str, str] = {"Accept": "application/json"}
        if authenticated:
            headers["Authorization"] = f"Bearer {token}"
        try:
            response = await self._session.request(
                method,
                f"{BASE_URL}{path}",
                params=params,
                data=data,
                headers=headers,
                timeout=self._timeout,
            )
        except TimeoutError as err:
            raise ProviderTimeoutError("provider request timed out") from err
        except aiohttp.ClientError as err:
            raise ProviderOutageError("provider is unavailable") from err
        try:
            body = await _read_bounded(response)
            if response.status in (400, 401, 403) and (
                not authenticated or response.status in (401, 403)
            ):
                raise ProviderAuthenticationError("provider authentication failed")
            if response.status == HTTP_NOT_FOUND:
                raise ProviderNotFoundError("species was not found")
            if response.status == HTTP_RATE_LIMITED:
                raise ProviderRateLimitError(_retry_after(response.headers))
            if response.status >= HTTP_SERVER_ERROR:
                raise ProviderOutageError("provider is unavailable")
            if not HTTP_SUCCESS_MIN <= response.status < HTTP_SUCCESS_MAX:
                raise ProviderMalformedResponseError("provider rejected the request")
            try:
                payload = json.loads(body.decode("utf-8"))
            except (
                UnicodeDecodeError,
                ValueError,
                RecursionError,
                aiohttp.ClientError,
            ) as err:
                raise ProviderMalformedResponseError(
                    "provider returned malformed JSON"
                ) from err
            return payload, response.headers
        finally:
            response.release()

    def _cache_get(self, key: tuple[Any, ...]) -> Any | None:
        item = self._cache.get(key)
        if item is None:
            return None
        if self._now() - item.created >= CACHE_MAX_AGE:
            self._cache.pop(key, None)
            return None
        self._cache.move_to_end(key)
        return item.value

    def _cache_put(self, key: tuple[Any, ...], value: Any) -> None:
        if self._closed:
            return
        self._cache[key] = _CacheItem(self._now(), value)
        self._cache.move_to_end(key)
        while len(self._cache) > CACHE_MAX_COUNT:
            self._cache.popitem(last=False)

    async def _async_cached(
        self, key: tuple[Any, ...], loader: Callable[[], Awaitable[Any]]
    ) -> Any:
        if self._closed:
            raise ProviderOutageError("provider client is closed")
        task = self._inflight.get(key)
        if task is None:
            generation = self._cache_generation

            async def _load_and_cache() -> Any:
                value = await loader()
                if not self._closed and generation == self._cache_generation:
                    self._cache_put(key, value)
                return value

            task = asyncio.create_task(_load_and_cache())
            self._tasks.add(task)
            task.add_done_callback(self._tasks.discard)
            self._inflight[key] = task
        try:
            return await asyncio.shield(task)
        finally:
            if task.done() and self._inflight.get(key) is task:
                self._inflight.pop(key, None)

    def _invalidate_token(self, token: str) -> None:
        if self._access_token == token:
            self._token_generation += 1
            self._access_token = None
            self._token_expires_at = 0


def _normalize_profile(payload: Any, locale: str) -> SpeciesProfile:
    if not isinstance(payload, dict):
        raise ProviderMalformedResponseError("provider returned malformed species data")
    pid = _required_short(payload.get("pid"), "species provider_ref")
    latin = _required_short(payload.get("display_pid"), "species latin name")
    optional: dict[str, str | None] = {}
    for key in ("alias", "category"):
        value = payload.get(key)
        optional[key] = _optional_short(value, f"species {key}")
    care: dict[str, str] = {}
    for key in ("watering", "sunlight", "soil", "pruning", "fertilization"):
        value = payload.get(key)
        if value is not None:
            if (
                not isinstance(value, str)
                or not value
                or len(value) > API_CARE_TEXT_MAX
            ):
                raise ProviderMalformedResponseError(
                    "provider returned malformed species data"
                )
            care[key] = value
    thresholds: dict[str, int] = {}
    for source, target in (("min_soil_moist", "min"), ("max_soil_moist", "max")):
        value = payload.get(source)
        if value is not None:
            if (
                isinstance(value, bool)
                or not isinstance(value, int)
                or not 0 < value < PERCENT_MAX
            ):
                raise ProviderMalformedResponseError(
                    "provider returned invalid moisture thresholds"
                )
            thresholds[target] = value
    fields = {
        key: ATTRIBUTION
        for key, value in {
            "common_name": optional["alias"],
            "latin_name": latin,
            "category": optional["category"],
            **care,
            **{f"moisture_{key}": value for key, value in thresholds.items()},
        }.items()
        if value is not None
    }
    snapshot = SpeciesSnapshot(
        provider="openplantbook",
        provider_id=pid,
        provider_ref=pid,
        fetched_at=_utcnow_iso(),
        locale=locale,
        source_status="provider",
        attribution=ATTRIBUTION,
        common_name=optional["alias"],
        latin_name=latin,
        category=optional["category"],
        confidence=None,
        care_text=care,
        field_sources=fields,
        threshold_defaults={"moisture": thresholds} if thresholds else {},
    )
    try:
        snapshot = SpeciesSnapshot.from_storage(snapshot.as_storage())
    except ValueError as err:
        raise ProviderMalformedResponseError(
            "provider returned oversized species data"
        ) from err
    return SpeciesProfile(snapshot)


def _required_short(value: object, field_name: str) -> str:
    if (
        not isinstance(value, str)
        or not value
        or value != value.strip()
        or len(value) > API_SHORT_TEXT_MAX
    ):
        raise ProviderMalformedResponseError(f"provider returned invalid {field_name}")
    return value


def _optional_short(value: object, field_name: str) -> str | None:
    if value is None:
        return None
    return _required_short(value, field_name)


async def _read_bounded(response: Any) -> bytes:
    content_length = response.content_length
    if content_length is not None and content_length > RESPONSE_MAX_BYTES:
        raise ProviderMalformedResponseError(
            "provider response exceeded the byte limit"
        )
    body = bytearray()
    async for chunk in response.content.iter_chunked(16 * 1024):
        body.extend(chunk)
        if len(body) > RESPONSE_MAX_BYTES:
            raise ProviderMalformedResponseError(
                "provider response exceeded the byte limit"
            )
    return bytes(body)


def _retry_after(headers: Mapping[str, str]) -> int | None:
    value = headers.get("Retry-After")
    if value is None:
        return None
    try:
        parsed = int(value)
    except ValueError:
        return None
    return parsed if 0 <= parsed <= ACCESS_TOKEN_MAX_AGE else None


def _normalize_config(data: Mapping[str, Any]) -> dict[str, Any]:
    return {
        CONF_OPENPLANTBOOK_ENABLED: data.get(CONF_OPENPLANTBOOK_ENABLED) is True,
        CONF_OPENPLANTBOOK_CLIENT_ID: _normalize_credential(
            data.get(CONF_OPENPLANTBOOK_CLIENT_ID)
        ),
        CONF_OPENPLANTBOOK_CLIENT_SECRET: _normalize_credential(
            data.get(CONF_OPENPLANTBOOK_CLIENT_SECRET)
        ),
    }


def _normalize_credential(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""


def _build_provider(hass: Any, data: Mapping[str, Any]) -> OpenPlantBookProvider | None:
    normalized = _normalize_config(data)
    if not normalized[CONF_OPENPLANTBOOK_ENABLED]:
        return None
    if (
        len(normalized[CONF_OPENPLANTBOOK_CLIENT_ID]) > CLIENT_ID_MAX_LENGTH
        or len(normalized[CONF_OPENPLANTBOOK_CLIENT_SECRET]) > CLIENT_SECRET_MAX_LENGTH
    ):
        return None
    client_id = normalized[CONF_OPENPLANTBOOK_CLIENT_ID]
    client_secret = normalized[CONF_OPENPLANTBOOK_CLIENT_SECRET]
    if not client_id or not client_secret:
        return None
    return OpenPlantBookProvider(
        async_get_clientsession(hass), client_id, client_secret
    )


async def _validate_config(hass: Any, data: Mapping[str, Any]) -> str | None:
    normalized = _normalize_config(data)
    if not normalized[CONF_OPENPLANTBOOK_ENABLED]:
        return None
    if (
        len(normalized[CONF_OPENPLANTBOOK_CLIENT_ID]) > CLIENT_ID_MAX_LENGTH
        or len(normalized[CONF_OPENPLANTBOOK_CLIENT_SECRET]) > CLIENT_SECRET_MAX_LENGTH
    ):
        return "credentials_invalid"
    client = _build_provider(hass, normalized)
    if client is None:
        return "credentials_required"
    try:
        await client.async_validate_credentials()
    except ProviderAuthenticationError:
        return "invalid_auth"
    except ProviderError:
        return "cannot_connect"
    finally:
        await client.async_close()
    return None


OPENPLANTBOOK_DESCRIPTOR = ProviderDescriptor(
    key="openplantbook",
    config_keys=(
        CONF_OPENPLANTBOOK_ENABLED,
        CONF_OPENPLANTBOOK_CLIENT_ID,
        CONF_OPENPLANTBOOK_CLIENT_SECRET,
    ),
    secret_keys=frozenset({CONF_OPENPLANTBOOK_CLIENT_SECRET}),
    boolean_keys=frozenset({CONF_OPENPLANTBOOK_ENABLED}),
    normalize_config=_normalize_config,
    validate_config=_validate_config,
    build=_build_provider,
)
