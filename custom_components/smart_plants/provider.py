"""Provider-neutral species contracts and reviewed-apply orchestration."""

from __future__ import annotations

import asyncio
import re
import secrets
import time
from collections import OrderedDict
from collections.abc import Awaitable, Callable, Mapping, Sequence
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import TYPE_CHECKING, Any, Literal, Protocol

from .models import PlantRecord, PlantSpecies, SpeciesSnapshot
from .storage import _utcnow_iso

if TYPE_CHECKING:
    from .manager import SmartPlantsManager

LOCALE_PATTERN = re.compile(r"^[a-zA-Z]{2}(?:[_-][a-zA-Z]{2})?$")
MAX_QUERY_LENGTH = 100
MIN_QUERY_LENGTH = 3
MAX_PROVIDER_REF_LENGTH = 100
MAX_SEARCH_FIELD_LENGTH = 500
MAX_SEARCH_RESULTS = 50
MAX_PREVIEWS = 64
PREVIEW_MAX_AGE = 10 * 60
PreviewOperation = Literal["select", "refresh"]


class ProviderError(Exception):
    """Safe base error for external provider failures."""


class ProviderDisabledError(ProviderError):
    pass


class ProviderAuthenticationError(ProviderError):
    pass


class ProviderRateLimitError(ProviderError):
    def __init__(self, retry_after: int | None = None) -> None:
        super().__init__("provider rate limit exceeded")
        self.retry_after = retry_after


class ProviderTimeoutError(ProviderError):
    pass


class ProviderOutageError(ProviderError):
    pass


class ProviderMalformedResponseError(ProviderError):
    pass


class ProviderNotFoundError(ProviderError):
    pass


@dataclass(frozen=True, slots=True)
class SpeciesSearchResult:
    provider: str
    provider_ref: str
    common_name: str | None
    latin_name: str
    category: str | None
    attribution: str


@dataclass(frozen=True, slots=True)
class SpeciesProfile:
    snapshot: SpeciesSnapshot


@dataclass(frozen=True, slots=True)
class SpeciesPreview:
    token: str
    provider: str
    operation: PreviewOperation
    profile: SpeciesProfile
    diff: Mapping[str, Mapping[str, Any]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "diff",
            MappingProxyType(
                {key: MappingProxyType(dict(value)) for key, value in self.diff.items()}
            ),
        )


class PlantSpeciesProvider(Protocol):
    key: str

    async def async_search(
        self, query: str, locale: str, limit: int
    ) -> tuple[SpeciesSearchResult, ...]: ...

    async def async_get_species(
        self, provider_ref: str, locale: str, *, force_refresh: bool = False
    ) -> SpeciesProfile: ...

    async def async_close(self) -> None: ...

    def diagnostics(self) -> Mapping[str, Any]: ...


@dataclass(frozen=True, slots=True)
class ProviderDescriptor:
    """Registration metadata for provider setup and configuration."""

    key: str
    config_keys: Sequence[str]
    secret_keys: frozenset[str]
    boolean_keys: frozenset[str]
    normalize_config: Callable[[Mapping[str, Any]], dict[str, Any]]
    validate_config: Callable[[Any, Mapping[str, Any]], Awaitable[str | None]]
    build: Callable[[Any, Mapping[str, Any]], PlantSpeciesProvider | None]


class ManualSpeciesProvider:
    """First-class local provider; it performs no discovery or networking."""

    key = "manual"

    async def async_search(
        self, query: str, locale: str, limit: int
    ) -> tuple[SpeciesSearchResult, ...]:
        del query, locale, limit
        return ()

    async def async_get_species(
        self, provider_ref: str, locale: str, *, force_refresh: bool = False
    ) -> SpeciesProfile:
        del provider_ref, locale, force_refresh
        raise ProviderNotFoundError("manual species are supplied locally")

    async def async_close(self) -> None:
        return

    def diagnostics(self) -> Mapping[str, Any]:
        return {"configured": True, "networked": False}

    @staticmethod
    def profile(
        *,
        common_name: str | None,
        latin_name: str | None,
        category: str | None,
        locale: str = "und",
    ) -> SpeciesProfile:
        attribution = "User supplied"
        fields = {
            key: attribution
            for key, value in {
                "common_name": common_name,
                "latin_name": latin_name,
                "category": category,
            }.items()
            if value is not None
        }
        return SpeciesProfile(
            SpeciesSnapshot(
                provider="manual",
                provider_id=None,
                provider_ref=None,
                fetched_at=_utcnow_iso(),
                locale=locale,
                source_status="manual",
                attribution=attribution,
                common_name=common_name,
                latin_name=latin_name,
                category=category,
                field_sources=fields,
            )
        )


class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, PlantSpeciesProvider] = {}

    def register(self, provider: PlantSpeciesProvider) -> None:
        if provider.key in self._providers:
            raise ValueError(f"provider {provider.key!r} is already registered")
        self._providers[provider.key] = provider

    def get(self, key: str) -> PlantSpeciesProvider:
        try:
            return self._providers[key]
        except KeyError as err:
            raise ProviderDisabledError("provider is not configured") from err

    def diagnostics(self) -> dict[str, Mapping[str, Any]]:
        return {
            key: provider.diagnostics() for key, provider in self._providers.items()
        }

    def availability(self) -> list[dict[str, Any]]:
        """Allowlisted registration metadata, never provider diagnostics or secrets."""
        from .providers import provider_descriptors  # noqa: PLC0415

        keys = {"manual", *self._providers, *(d.key for d in provider_descriptors())}
        return [
            {
                "provider": key,
                "available": key in self._providers,
                "search_supported": key != "manual",
            }
            for key in sorted(keys)
        ]

    async def async_close(self) -> None:
        for provider in self._providers.values():
            await provider.async_close()
        self._providers.clear()


@dataclass(frozen=True, slots=True)
class _PendingPreview:
    profile: SpeciesProfile
    plant_id: str
    revision: int
    provider: str
    operation: PreviewOperation
    created: float


class SpeciesProviderService:
    """Bounded previews and explicit, revision-checked provider application."""

    def __init__(
        self,
        registry: ProviderRegistry,
        manager: SmartPlantsManager,
        *,
        on_auth_failure: Callable[[], Awaitable[None]] | None = None,
        now: Callable[[], float] = time.monotonic,
    ) -> None:
        self._registry = registry
        self._manager = manager
        self._previews: OrderedDict[str, _PendingPreview] = OrderedDict()
        self._on_auth_failure = on_auth_failure
        self._now = now
        self._preview_lock = asyncio.Lock()
        self._tasks: set[asyncio.Task[Any]] = set()
        self._closed = False

    async def async_search(
        self, provider: str, query: str, locale: str, limit: int
    ) -> tuple[SpeciesSearchResult, ...]:
        task = self._begin_operation()
        try:
            query = validate_query(query)
            locale = validate_locale(locale)
            limit = validate_limit(limit)
            results = await self._registry.get(provider).async_search(
                query, locale, limit
            )
            self._raise_if_closed()
            if not isinstance(results, (list, tuple)) or len(results) > limit:
                raise ProviderMalformedResponseError(
                    "provider returned too many search results"
                )
            for result in results:
                _validate_search_result(result, provider)
            return tuple(results)
        except ProviderAuthenticationError:
            await self._notify_auth_failure()
            raise
        finally:
            self._end_operation(task)

    async def async_preview(
        self,
        provider: str,
        provider_ref: str,
        locale: str,
        *,
        plant_id: str,
        force_refresh: bool = False,
        _draft: tuple[str, str] | None = None,
    ) -> SpeciesPreview:
        task = self._begin_operation()
        try:
            provider_ref = validate_provider_ref(provider_ref)
            locale = validate_locale(locale)
            if _draft is None:
                reviewed = self._manager.get_plant(plant_id)
                reviewed_revision = reviewed.revision
                reviewed_snapshot = (
                    reviewed.species.snapshot if reviewed.species is not None else None
                )
            else:
                plant_id = self._manager.require_wizard_draft(*_draft)
                reviewed_revision = 0
                reviewed_snapshot = None
            operation: PreviewOperation = "refresh" if force_refresh else "select"
            profile = await self._registry.get(provider).async_get_species(
                provider_ref, locale, force_refresh=force_refresh
            )
            profile = _validate_profile(profile, provider, provider_ref)
        except ProviderAuthenticationError:
            await self._notify_auth_failure()
            raise
        finally:
            self._end_operation(task)
        token = secrets.token_urlsafe(32)
        async with self._preview_lock:
            self._raise_if_closed()
            if _draft is not None:
                self._manager.require_wizard_draft(*_draft)
            self._expire_previews()
            self._previews[token] = _PendingPreview(
                profile=profile,
                plant_id=plant_id,
                revision=reviewed_revision,
                provider=provider,
                operation=operation,
                created=self._now(),
            )
            while len(self._previews) > MAX_PREVIEWS:
                self._previews.popitem(last=False)
        diff: Mapping[str, Mapping[str, Any]] = {}
        diff = _snapshot_diff(reviewed_snapshot, profile.snapshot)
        return SpeciesPreview(
            token=token,
            provider=provider,
            operation=operation,
            profile=profile,
            diff=diff,
        )

    def panel_info(self) -> dict[str, Any]:
        self._raise_if_wizard_unavailable()
        return {
            "api_version": 1,
            "schema_version": 1,
            "providers": self._registry.availability(),
        }

    def _raise_if_wizard_unavailable(self) -> None:
        from .manager import SmartPlantsManagerUnavailableError  # noqa: PLC0415

        if self._closed or not self._manager.available:
            raise SmartPlantsManagerUnavailableError

    async def async_wizard_preview(  # noqa: PLR0913
        self,
        draft_id: str,
        draft_token: str,
        *,
        expected_revision: int,
        provider: str,
        provider_ref: str,
        locale: str,
    ) -> SpeciesPreview:
        self._raise_if_wizard_unavailable()
        _validate_draft_revision(expected_revision)
        return await self.async_preview(
            provider,
            provider_ref,
            locale,
            plant_id="",
            _draft=(draft_id, draft_token),
        )

    async def async_wizard_create(  # noqa: PLR0913
        self,
        draft_id: str,
        draft_token: str,
        *,
        expected_revision: int,
        confirmed: bool,
        moisture: Mapping[str, Any],
        accepted_preview: Mapping[str, Any] | None = None,
        roles: Mapping[str, Any] | None = None,
        **fields: Any,
    ) -> PlantRecord:
        """Confirm once; the durable plant identity is the creation receipt."""
        self._raise_if_wizard_unavailable()
        _validate_draft_revision(expected_revision)
        if confirmed is not True:
            raise ValueError("plant creation must be explicitly confirmed")
        async with self._preview_lock:
            self._raise_if_wizard_unavailable()
            existing = await self._manager.async_wizard_result(draft_id, draft_token)
            if existing is not None:
                return existing
            identity = self._manager.require_wizard_draft(draft_id, draft_token)
            self._expire_previews()
            pending = None
            if accepted_preview is not None:
                if fields.get("species") is not None:
                    raise ValueError("choose manual species or an accepted preview")
                if set(accepted_preview) != {"preview_token", "provider", "operation"}:
                    raise ValueError("invalid accepted preview")
                pending = self._previews.get(accepted_preview["preview_token"])
                if pending is None:
                    raise ValueError("preview is missing or expired")
                if pending.plant_id != identity or pending.revision != 0:
                    raise ValueError("preview is not bound to this draft revision")
                if (
                    pending.provider != accepted_preview["provider"]
                    or pending.operation != accepted_preview["operation"]
                    or pending.operation != "select"
                    or pending.profile.snapshot.provider != pending.provider
                ):
                    raise ValueError("preview is not bound to this provider operation")
                fields["species"] = PlantSpecies(
                    provider=pending.provider, snapshot=pending.profile.snapshot
                )
            plant = await self._manager.async_create_plant(
                **fields,
                _wizard=(draft_id, draft_token),
                _moisture=moisture,
                _roles=roles,
                _accepted_provider=pending is not None,
            )
            if accepted_preview is not None:
                self._previews.pop(accepted_preview["preview_token"], None)
            return plant

    async def async_apply(  # noqa: PLR0913
        self,
        plant_id: str,
        *,
        expected_revision: int,
        preview_token: str,
        provider: str,
        operation: PreviewOperation,
        confirmed: bool,
    ) -> Any:
        if not confirmed:
            raise ValueError("provider data must be explicitly confirmed")
        async with self._preview_lock:
            self._raise_if_closed()
            self._expire_previews()
            pending = self._previews.get(preview_token)
            if pending is None:
                raise ValueError("preview is missing or expired")
            if pending.plant_id != plant_id or pending.revision != expected_revision:
                raise ValueError("preview is not bound to this plant revision")
            if pending.provider != provider or pending.operation != operation:
                raise ValueError("preview is not bound to this provider operation")
            if pending.provider != pending.profile.snapshot.provider:
                raise ValueError("preview provider binding is invalid")
            plant = await self._manager.async_apply_species_snapshot(
                plant_id,
                expected_revision=expected_revision,
                species=PlantSpecies(
                    provider=pending.provider, snapshot=pending.profile.snapshot
                ),
            )
            self._previews.pop(preview_token, None)
            return plant

    def diagnostics(self) -> Mapping[str, Any]:
        return {
            "providers": self._registry.diagnostics(),
            "pending_preview_count": len(self._previews),
        }

    async def async_close(self) -> None:
        async with self._preview_lock:
            self._closed = True
            self._previews.clear()
        await self._registry.async_close()
        tasks = [task for task in self._tasks if task is not asyncio.current_task()]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._tasks.clear()

    async def _notify_auth_failure(self) -> None:
        if self._on_auth_failure is not None:
            await self._on_auth_failure()

    def _expire_previews(self) -> None:
        cutoff = self._now() - PREVIEW_MAX_AGE
        while self._previews:
            token, preview = next(iter(self._previews.items()))
            if preview.created > cutoff:
                break
            self._previews.pop(token)

    def _raise_if_closed(self) -> None:
        if self._closed:
            raise ProviderOutageError("provider service is closed")

    def _begin_operation(self) -> asyncio.Task[Any] | None:
        self._raise_if_closed()
        task = asyncio.current_task()
        if task is not None:
            self._tasks.add(task)
        return task

    def _end_operation(self, task: asyncio.Task[Any] | None) -> None:
        if task is not None:
            self._tasks.discard(task)


def _validate_draft_revision(value: int) -> None:
    if type(value) is not int or value != 0:
        raise ValueError("draft expected_revision must be zero")


def validate_locale(value: str) -> str:
    if not isinstance(value, str) or not LOCALE_PATTERN.fullmatch(value):
        raise ValueError("locale must be an ISO 639-1 code with optional region")
    language, *region = value.replace("_", "-").split("-")
    return language.lower() + (f"-{region[0].upper()}" if region else "")


def validate_query(value: str) -> str:
    if not isinstance(value, str) or value != value.strip():
        raise ValueError("query must be a string without surrounding whitespace")
    if not MIN_QUERY_LENGTH <= len(value) <= MAX_QUERY_LENGTH:
        raise ValueError("query must contain between 3 and 100 characters")
    return value


def validate_provider_ref(value: str) -> str:
    if (
        not isinstance(value, str)
        or value != value.strip()
        or not value
        or len(value) > MAX_PROVIDER_REF_LENGTH
    ):
        raise ValueError("provider_ref is invalid")
    return value


def validate_limit(value: int) -> int:
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or not 1 <= value <= MAX_SEARCH_RESULTS
    ):
        raise ValueError("limit must be an integer between 1 and 50")
    return value


def validate_operation(value: str) -> PreviewOperation:
    if value == "select":
        return "select"
    if value == "refresh":
        return "refresh"
    raise ValueError("operation must be select or refresh")


def _validate_search_result(result: object, provider: str) -> None:
    if (
        not isinstance(result, SpeciesSearchResult)
        or not isinstance(result.provider, str)
        or result.provider != provider
    ):
        raise ProviderMalformedResponseError("provider returned an invalid identity")
    try:
        validate_provider_ref(result.provider_ref)
    except ValueError as err:
        raise ProviderMalformedResponseError(
            "provider returned an invalid reference"
        ) from err
    for value in (result.common_name, result.category):
        if value is not None and (
            not isinstance(value, str)
            or not value
            or value != value.strip()
            or len(value) > MAX_SEARCH_FIELD_LENGTH
        ):
            raise ProviderMalformedResponseError(
                "provider returned oversized search data"
            )
    if (
        not isinstance(result.latin_name, str)
        or not result.latin_name
        or result.latin_name != result.latin_name.strip()
        or len(result.latin_name) > MAX_SEARCH_FIELD_LENGTH
    ):
        raise ProviderMalformedResponseError("provider returned oversized search data")
    if (
        not isinstance(result.attribution, str)
        or not result.attribution
        or result.attribution != result.attribution.strip()
        or len(result.attribution) > MAX_SEARCH_FIELD_LENGTH
    ):
        raise ProviderMalformedResponseError("provider attribution is invalid")


def _validate_profile(
    profile: object, provider: str, provider_ref: str
) -> SpeciesProfile:
    if not isinstance(profile, SpeciesProfile):
        raise ProviderMalformedResponseError("provider returned an invalid profile")
    try:
        snapshot = SpeciesSnapshot.from_storage(profile.snapshot.as_storage())
    except (AttributeError, ValueError) as err:
        raise ProviderMalformedResponseError(
            "provider returned an invalid profile"
        ) from err
    if snapshot.provider != provider or snapshot.provider_ref != provider_ref:
        raise ProviderMalformedResponseError("provider returned an invalid identity")
    return SpeciesProfile(snapshot)


def _snapshot_diff(
    old: SpeciesSnapshot | None, new: SpeciesSnapshot
) -> Mapping[str, Mapping[str, Any]]:
    before = old.as_storage() if old is not None else {}
    after = new.as_storage()
    ignored = {"fetched_at"}
    return {
        key: {"before": before.get(key), "after": value}
        for key, value in after.items()
        if key not in ignored and before.get(key) != value
    }
