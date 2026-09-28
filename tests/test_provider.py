from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any, cast

import aiohttp
import pytest
from custom_components.smart_plants.manager import (
    SmartPlantsManager,
    SmartPlantsRevisionConflictError,
)
from custom_components.smart_plants.models import SpeciesSnapshot
from custom_components.smart_plants.provider import (
    PREVIEW_MAX_AGE,
    ManualSpeciesProvider,
    ProviderAuthenticationError,
    ProviderMalformedResponseError,
    ProviderOutageError,
    ProviderRateLimitError,
    ProviderRegistry,
    ProviderTimeoutError,
    SpeciesProfile,
    SpeciesProviderService,
    SpeciesSearchResult,
)
from custom_components.smart_plants.providers.openplantbook import (
    ATTRIBUTION,
    CACHE_MAX_AGE,
    CACHE_MAX_COUNT,
    RESPONSE_MAX_BYTES,
    OpenPlantBookProvider,
)
from custom_components.smart_plants.storage import SmartPlantsStorageError
from homeassistant.core import HomeAssistant


class FakeResponse:
    def __init__(
        self,
        status: int,
        payload: Any,
        headers: dict[str, str] | None = None,
        *,
        malformed: bool = False,
    ) -> None:
        self.status = status
        self.payload = payload
        self.headers = headers or {}
        self.malformed = malformed
        self.content = self
        self.body = b"{" if malformed else json.dumps(payload).encode()
        self.content_length = len(self.body)

    async def json(self, *, content_type: Any = None) -> Any:
        del content_type
        if self.malformed:
            raise ValueError
        return self.payload

    async def iter_chunked(self, size: int) -> AsyncIterator[bytes]:
        for offset in range(0, len(self.body), size):
            yield self.body[offset : offset + size]

    def release(self) -> None:
        return


class FakeSession:
    def __init__(self, responses: list[Any]) -> None:
        self.responses = responses
        self.calls: list[dict[str, Any]] = []
        self._call_condition = asyncio.Condition()

    async def request(self, method: str, url: str, **kwargs: Any) -> FakeResponse:
        async with self._call_condition:
            self.calls.append({"method": method, "url": url, **kwargs})
            self._call_condition.notify_all()
        response = self.responses.pop(0)
        if isinstance(response, asyncio.Future):
            response = await response
        if isinstance(response, BaseException):
            raise response
        return cast("FakeResponse", response)

    async def wait_for_calls(self, count: int) -> None:
        async with self._call_condition:
            await self._call_condition.wait_for(lambda: len(self.calls) >= count)


def _client(
    responses: list[Any], *, clock: list[float] | None = None
) -> tuple[OpenPlantBookProvider, FakeSession]:
    session = FakeSession(responses)
    client = OpenPlantBookProvider(
        cast("aiohttp.ClientSession", session),
        "client-id",
        "client-secret",
        now=(lambda: clock[0]) if clock else (lambda: 0.0),
    )
    return client, session


def _token() -> FakeResponse:
    return FakeResponse(
        200,
        {"access_token": "access-token", "expires_in": 86400},
    )


def _detail(**changes: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "pid": "aloe vera",
        "display_pid": "Aloe vera",
        "alias": "Aloe",
        "category": "succulent",
        "min_soil_moist": 15,
        "max_soil_moist": 55,
        "watering": "Allow soil to dry.",
        "sunlight": "Bright indirect light.",
        "image_url": "https://example.invalid/not-ingested.jpg",
        "common_names": [],
    }
    payload.update(changes)
    return payload


async def test_complete_search_and_profile_normalization() -> None:
    client, session = _client(
        [
            _token(),
            FakeResponse(
                200,
                {
                    "count": 1,
                    "next": None,
                    "previous": None,
                    "results": [
                        {
                            "pid": "aloe vera",
                            "display_pid": "Aloe vera",
                            "alias": "Aloe",
                            "category": "succulent",
                        }
                    ],
                },
            ),
            FakeResponse(200, _detail()),
        ]
    )
    results = await client.async_search("Aloe", "de-DE", 20)
    profile = await client.async_get_species("aloe vera", "de-DE")
    assert results[0].provider_ref == "aloe vera"
    assert results[0].attribution == ATTRIBUTION
    snapshot = profile.snapshot
    assert snapshot.locale == "de-DE"
    assert snapshot.care_text["watering"] == "Allow soil to dry."
    assert snapshot.threshold_defaults == {"moisture": {"min": 15, "max": 55}}
    assert snapshot.field_sources["moisture_min"] == ATTRIBUTION
    assert snapshot.confidence is None
    assert "image_url" not in snapshot.as_storage()
    assert session.calls[1]["params"]["limit"] == "20"
    assert session.calls[2]["params"] == {"lang": "de-DE", "include": "care"}


async def test_missing_nullable_profile_fields_remain_missing() -> None:
    client, _session = _client(
        [
            _token(),
            FakeResponse(
                200,
                _detail(
                    alias=None,
                    category=None,
                    min_soil_moist=None,
                    max_soil_moist=None,
                    watering=None,
                    sunlight=None,
                ),
            ),
        ]
    )
    snapshot = (await client.async_get_species("aloe vera", "en")).snapshot
    assert snapshot.common_name is None
    assert snapshot.care_text == {}
    assert snapshot.threshold_defaults == {}
    assert "common_name" not in snapshot.field_sources


async def test_cache_hit_expiry_max_and_invalidation() -> None:
    clock = [0.0]
    client, session = _client(
        [
            _token(),
            FakeResponse(200, _detail()),
            FakeResponse(200, _detail(alias="New")),
            FakeResponse(200, _detail(alias="Newest")),
        ],
        clock=clock,
    )
    first = await client.async_get_species("aloe vera", "en")
    assert await client.async_get_species("aloe vera", "en") is first
    assert len(session.calls) == 2
    clock[0] = CACHE_MAX_AGE
    refreshed = await client.async_get_species("aloe vera", "en")
    assert refreshed.snapshot.common_name == "New"
    client.invalidate(provider_ref="aloe vera")
    refreshed = await client.async_get_species("aloe vera", "en")
    assert refreshed.snapshot.common_name == "Newest"
    for index in range(CACHE_MAX_COUNT + 2):
        client._cache_put(("test", index), index)
    assert len(client._cache) == CACHE_MAX_COUNT
    assert ("test", 0) not in client._cache
    client.invalidate()
    assert not client._cache


@pytest.mark.parametrize(
    ("response", "error"),
    [
        (TimeoutError(), ProviderTimeoutError),
        (aiohttp.ClientConnectionError(), ProviderOutageError),
        (FakeResponse(401, {}), ProviderAuthenticationError),
        (FakeResponse(429, {}, {"Retry-After": "42"}), ProviderRateLimitError),
        (FakeResponse(200, {}, malformed=True), ProviderMalformedResponseError),
    ],
)
async def test_typed_network_errors(response: Any, error: type[Exception]) -> None:
    if isinstance(response, BaseException):
        responses: list[Any] = [response]
    elif response.status in (401, 403):
        responses = [_token(), response, _token(), FakeResponse(response.status, {})]
    else:
        responses = [_token(), response]
    client, _session = _client(responses)
    with pytest.raises(error) as raised:
        await client.async_search("Aloe", "en", 20)
    if isinstance(raised.value, ProviderRateLimitError):
        assert raised.value.retry_after == 42
    assert "client-secret" not in str(raised.value)


async def _manager(hass: HomeAssistant) -> SmartPlantsManager:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    return manager


async def test_preview_apply_and_override_preservation(hass: HomeAssistant) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    plant = await manager.async_set_moisture_thresholds(
        plant.id,
        expected_revision=plant.revision,
        moisture_min=20,
        moisture_target=40,
        moisture_max=60,
    )
    client, _session = _client([_token(), FakeResponse(200, _detail())])
    registry = ProviderRegistry()
    registry.register(ManualSpeciesProvider())
    registry.register(client)
    service = SpeciesProviderService(registry, manager)
    preview = await service.async_preview(
        "openplantbook", "aloe vera", "en", plant_id=plant.id
    )
    assert manager.get_plant(plant.id).revision == plant.revision
    with pytest.raises(ValueError, match="confirmed"):
        await service.async_apply(
            plant.id,
            expected_revision=plant.revision,
            preview_token=preview.token,
            provider=preview.provider,
            operation=preview.operation,
            confirmed=False,
        )
    updated = await service.async_apply(
        plant.id,
        expected_revision=plant.revision,
        preview_token=preview.token,
        provider=preview.provider,
        operation=preview.operation,
        confirmed=True,
    )
    assert updated.species is not None
    assert updated.moisture.threshold_overrides == {
        "min": 20,
        "target": 40,
        "max": 60,
    }
    assert updated.moisture.threshold_defaults["min"].source == "provider"
    assert updated.moisture.threshold_defaults["target"].source == "builtin"
    assert updated.revision == plant.revision + 1


async def test_refresh_diff_revision_race_and_outage_preserve_local(
    hass: HomeAssistant,
) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    client, _session = _client(
        [
            _token(),
            FakeResponse(200, _detail()),
            FakeResponse(200, _detail(alias="Updated")),
            aiohttp.ClientConnectionError(),
        ]
    )
    registry = ProviderRegistry()
    registry.register(client)
    service = SpeciesProviderService(registry, manager)
    initial = await service.async_preview(
        "openplantbook", "aloe vera", "en", plant_id=plant.id
    )
    plant = await service.async_apply(
        plant.id,
        expected_revision=plant.revision,
        preview_token=initial.token,
        provider=initial.provider,
        operation=initial.operation,
        confirmed=True,
    )
    assert plant.moisture.threshold_overrides == {
        "min": None,
        "target": None,
        "max": None,
    }
    refresh = await service.async_preview(
        "openplantbook",
        "aloe vera",
        "en",
        plant_id=plant.id,
        force_refresh=True,
    )
    assert refresh.diff["common_name"] == {"before": "Aloe", "after": "Updated"}
    await manager.async_update_plant(
        plant.id, expected_revision=plant.revision, name="Changed"
    )
    with pytest.raises(SmartPlantsRevisionConflictError):
        await service.async_apply(
            plant.id,
            expected_revision=plant.revision,
            preview_token=refresh.token,
            provider=refresh.provider,
            operation=refresh.operation,
            confirmed=True,
        )
    assert refresh.token in service._previews
    accepted = manager.get_plant(plant.id).species
    client.invalidate()
    client._access_token = None
    with pytest.raises(ProviderOutageError):
        await service.async_preview(
            "openplantbook", "aloe vera", "en", plant_id=plant.id
        )
    assert manager.get_plant(plant.id).species == accepted
    assert manager.list_plants()[0].name == "Changed"


async def test_manual_fallback_close_and_strict_storage(hass: HomeAssistant) -> None:
    manager = await _manager(hass)
    registry = ProviderRegistry()
    registry.register(ManualSpeciesProvider())
    service = SpeciesProviderService(registry, manager)
    assert await service.async_search("manual", "Aloe", "en", 20) == ()
    profile = ManualSpeciesProvider.profile(
        common_name="Aloe", latin_name="Aloe vera", category=None
    )
    raw = profile.snapshot.as_storage()
    raw["unexpected"] = "value"
    with pytest.raises(ValueError, match="unsupported key"):
        SpeciesSnapshot.from_storage(raw)
    await service.async_close()
    assert service.diagnostics()["pending_preview_count"] == 0


async def test_concurrent_token_and_exact_search_request_deduplication() -> None:
    client, session = _client(
        [
            _token(),
            FakeResponse(200, {"results": []}),
            FakeResponse(200, {"results": []}),
        ]
    )
    first, second = await asyncio.gather(
        client.async_search("Aloe", "en", 20),
        client.async_search("Aloe", "en", 20),
    )
    assert first == second == ()
    assert len(session.calls) == 2

    await client.async_search("aloe", "en", 20)
    assert len(session.calls) == 3


async def test_concurrent_resource_auth_failures_share_one_fresh_token() -> None:
    client, session = _client(
        [
            _token(),
            FakeResponse(401, {}),
            FakeResponse(403, {}),
            FakeResponse(200, {"access_token": "fresh", "expires_in": 86400}),
            FakeResponse(200, {"results": []}),
            FakeResponse(200, {"results": []}),
        ]
    )
    await asyncio.gather(
        client.async_search("Aloe", "en", 20),
        client.async_search("Agave", "en", 20),
    )
    token_calls = [call for call in session.calls if call["url"].endswith("/token/")]
    assert len(token_calls) == 2
    assert len(session.calls) == 6


async def test_delayed_stale_auth_failure_reuses_installed_fresh_token() -> None:
    loop = asyncio.get_running_loop()
    delayed_stale_response: asyncio.Future[FakeResponse] = loop.create_future()
    client, session = _client(
        [
            _token(),
            delayed_stale_response,
            FakeResponse(401, {}),
            FakeResponse(200, {"access_token": "fresh", "expires_in": 86400}),
            FakeResponse(200, {"results": []}),
            FakeResponse(200, {"results": []}),
        ]
    )

    delayed = asyncio.create_task(client.async_search("Agave", "en", 20))
    await session.wait_for_calls(2)
    assert await client.async_search("Aloe", "en", 20) == ()

    delayed_stale_response.set_result(FakeResponse(401, {}))
    assert await delayed == ()

    token_calls = [call for call in session.calls if call["url"].endswith("/token/")]
    assert len(token_calls) == 2
    assert session.calls[4]["headers"]["Authorization"] == "Bearer fresh"
    assert session.calls[5]["headers"]["Authorization"] == "Bearer fresh"


async def test_force_refresh_cannot_be_overwritten_by_stale_inflight() -> None:
    loop = asyncio.get_running_loop()
    stale_response: asyncio.Future[FakeResponse] = loop.create_future()
    client, session = _client(
        [
            _token(),
            stale_response,
            FakeResponse(200, _detail(alias="Fresh")),
        ]
    )
    stale_task = asyncio.create_task(client.async_get_species("aloe vera", "en"))
    await session.wait_for_calls(2)
    fresh = await client.async_get_species("aloe vera", "en", force_refresh=True)
    stale_response.set_result(FakeResponse(200, _detail(alias="Stale")))
    stale = await stale_task
    assert fresh.snapshot.common_name == "Fresh"
    assert stale.snapshot.common_name == "Stale"
    assert await client.async_get_species("aloe vera", "en") is fresh


async def test_close_cancels_and_drains_inflight_without_caching() -> None:
    loop = asyncio.get_running_loop()
    response: asyncio.Future[FakeResponse] = loop.create_future()
    client, _session = _client([_token(), response])
    request = asyncio.create_task(client.async_get_species("aloe vera", "en"))
    await asyncio.sleep(0)
    await asyncio.sleep(0)
    await client.async_close()
    outcome = (await asyncio.gather(request, return_exceptions=True))[0]
    assert isinstance(outcome, asyncio.CancelledError)
    assert not client._cache
    assert not client._inflight
    assert not client._tasks
    assert client.diagnostics()["closed"] is True


@pytest.mark.parametrize("status", [200, 401, 500])
async def test_every_http_response_is_bounded_before_use(status: int) -> None:
    oversized = FakeResponse(status, {})
    oversized.content_length = RESPONSE_MAX_BYTES + 1
    responses = [oversized] if status == 401 else [_token(), oversized]
    client, _session = _client(responses)
    request = (
        client.async_validate_credentials()
        if status == 401
        else client.async_search("Aloe", "en", 20)
    )
    with pytest.raises(ProviderMalformedResponseError, match="byte limit"):
        await request


@pytest.mark.parametrize(
    "token_payload",
    [
        {"access_token": "x" * 4_097, "expires_in": 86400},
        {"access_token": "token", "expires_in": 31 * 24 * 60 * 60 + 1},
        {"access_token": "token", "expires_in": True},
    ],
)
async def test_token_fields_are_bounded(token_payload: dict[str, Any]) -> None:
    client, _session = _client([FakeResponse(200, token_payload)])
    with pytest.raises(ProviderMalformedResponseError, match="malformed token"):
        await client.async_validate_credentials()


@pytest.mark.parametrize(
    "payload",
    [
        _detail(alias="x" * 101),
        _detail(watering="x" * 4_001),
        _detail(min_soil_moist=0),
    ],
)
async def test_profile_strings_care_and_thresholds_are_bounded(
    payload: dict[str, Any],
) -> None:
    client, _session = _client([_token(), FakeResponse(200, payload)])
    with pytest.raises(ProviderMalformedResponseError):
        await client.async_get_species("aloe vera", "en")


async def test_search_result_list_is_bounded() -> None:
    result = {
        "pid": "aloe vera",
        "display_pid": "Aloe vera",
        "alias": "Aloe",
        "category": "succulent",
    }
    client, _session = _client(
        [_token(), FakeResponse(200, {"results": [result] * 51})]
    )
    with pytest.raises(ProviderMalformedResponseError, match="too many"):
        await client.async_search("Aloe", "en", 50)


def test_snapshot_requires_canonical_locale_and_coherent_attribution() -> None:
    snapshot = ManualSpeciesProvider.profile(
        common_name="Aloe", latin_name="Aloe vera", category=None
    ).snapshot.as_storage()
    snapshot["locale"] = "EN_us"
    with pytest.raises(ValueError, match="canonical"):
        SpeciesSnapshot.from_storage(snapshot)
    snapshot["locale"] = "en-US"
    snapshot["field_sources"]["common_name"] = "another source"
    with pytest.raises(ValueError, match="snapshot attribution"):
        SpeciesSnapshot.from_storage(snapshot)


async def test_preview_binding_failure_retains_token_and_success_is_one_time(
    hass: HomeAssistant,
) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    client, _session = _client([_token(), FakeResponse(200, _detail())])
    registry = ProviderRegistry()
    registry.register(client)
    service = SpeciesProviderService(registry, manager)
    preview = await service.async_preview(
        "openplantbook", "aloe vera", "en", plant_id=plant.id
    )
    with pytest.raises(ValueError, match="provider operation"):
        await service.async_apply(
            plant.id,
            expected_revision=plant.revision,
            preview_token=preview.token,
            provider=preview.provider,
            operation="refresh",
            confirmed=True,
        )
    assert preview.token in service._previews
    attempts = await asyncio.gather(
        *(
            service.async_apply(
                plant.id,
                expected_revision=plant.revision,
                preview_token=preview.token,
                provider=preview.provider,
                operation=preview.operation,
                confirmed=True,
            )
            for _ in range(2)
        ),
        return_exceptions=True,
    )
    successes = [result for result in attempts if not isinstance(result, BaseException)]
    failures = [result for result in attempts if isinstance(result, BaseException)]
    assert len(successes) == 1
    assert successes[0].revision == plant.revision + 1
    assert len(failures) == 1
    assert isinstance(failures[0], ValueError)
    assert "missing or expired" in str(failures[0])


async def test_preview_tokens_expire_and_are_bounded(hass: HomeAssistant) -> None:
    clock = [0.0]
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    client, _session = _client([_token(), FakeResponse(200, _detail())], clock=clock)
    registry = ProviderRegistry()
    registry.register(client)
    service = SpeciesProviderService(registry, manager, now=lambda: clock[0])
    oldest = await service.async_preview(
        "openplantbook", "aloe vera", "en", plant_id=plant.id
    )
    for _ in range(64):
        await service.async_preview(
            "openplantbook", "aloe vera", "en", plant_id=plant.id
        )
    assert len(service._previews) == 64
    assert oldest.token not in service._previews
    newest = next(reversed(service._previews))
    clock[0] = PREVIEW_MAX_AGE
    with pytest.raises(ValueError, match="missing or expired"):
        await service.async_apply(
            plant.id,
            expected_revision=plant.revision,
            preview_token=newest,
            provider="openplantbook",
            operation="select",
            confirmed=True,
        )


async def test_preview_survives_storage_write_failure(
    hass: HomeAssistant, monkeypatch: pytest.MonkeyPatch
) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    client, _session = _client([_token(), FakeResponse(200, _detail())])
    registry = ProviderRegistry()
    registry.register(client)
    service = SpeciesProviderService(registry, manager)
    preview = await service.async_preview(
        "openplantbook", "aloe vera", "en", plant_id=plant.id
    )
    original_save = manager._store.async_save
    attempts = 0

    async def _fail_once(snapshot: Any) -> None:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise SmartPlantsStorageError("write failed")
        await original_save(snapshot)

    monkeypatch.setattr(manager._store, "async_save", _fail_once)
    with pytest.raises(SmartPlantsStorageError, match="write failed"):
        await service.async_apply(
            plant.id,
            expected_revision=plant.revision,
            preview_token=preview.token,
            provider=preview.provider,
            operation=preview.operation,
            confirmed=True,
        )
    assert preview.token in service._previews
    await service.async_apply(
        plant.id,
        expected_revision=plant.revision,
        preview_token=preview.token,
        provider=preview.provider,
        operation=preview.operation,
        confirmed=True,
    )
    assert preview.token not in service._previews


class SyntheticProvider:
    key = "synthetic"

    async def async_search(
        self, query: str, locale: str, limit: int
    ) -> tuple[SpeciesSearchResult, ...]:
        del query, locale, limit
        return (
            SpeciesSearchResult(
                provider=self.key,
                provider_ref="synthetic-ref",
                common_name="Synthetic",
                latin_name="Planta testii",
                category=None,
                attribution="Synthetic test provider",
            ),
        )

    async def async_get_species(
        self, provider_ref: str, locale: str, *, force_refresh: bool = False
    ) -> SpeciesProfile:
        del force_refresh
        attribution = "Synthetic test provider"
        return SpeciesProfile(
            SpeciesSnapshot.from_storage(
                {
                    "provider": self.key,
                    "provider_id": provider_ref,
                    "provider_ref": provider_ref,
                    "fetched_at": "2026-09-10T00:00:00Z",
                    "locale": locale,
                    "source_status": "provider",
                    "attribution": attribution,
                    "common_name": "Synthetic",
                    "latin_name": "Planta testii",
                    "category": None,
                    "confidence": None,
                    "care_text": {},
                    "field_sources": {
                        "common_name": attribution,
                        "latin_name": attribution,
                    },
                    "threshold_defaults": {},
                }
            )
        )

    async def async_close(self) -> None:
        return

    def diagnostics(self) -> dict[str, Any]:
        return {"networked": False}


class MalformedSearchProvider(SyntheticProvider):
    def __init__(self, field: str, value: object) -> None:
        self.field = field
        self.value = value

    async def async_search(
        self, query: str, locale: str, limit: int
    ) -> tuple[SpeciesSearchResult, ...]:
        del query, locale, limit
        values: dict[str, Any] = {
            "provider": self.key,
            "provider_ref": "synthetic-ref",
            "common_name": "Synthetic",
            "latin_name": "Planta testii",
            "category": "test",
            "attribution": "Synthetic test provider",
        }
        values[self.field] = self.value
        return (SpeciesSearchResult(**values),)


@pytest.mark.parametrize(
    "field",
    [
        "provider",
        "provider_ref",
        "common_name",
        "latin_name",
        "category",
        "attribution",
    ],
)
async def test_service_maps_malformed_search_result_fields(
    hass: HomeAssistant, field: str
) -> None:
    manager = await _manager(hass)
    registry = ProviderRegistry()
    registry.register(MalformedSearchProvider(field, 42))
    service = SpeciesProviderService(registry, manager)

    with pytest.raises(ProviderMalformedResponseError):
        await service.async_search("synthetic", "Plant", "en", 5)


async def test_synthetic_provider_search_preview_apply_flow(
    hass: HomeAssistant,
) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Synthetic")
    registry = ProviderRegistry()
    registry.register(SyntheticProvider())
    service = SpeciesProviderService(registry, manager)
    results = await service.async_search("synthetic", "Plant", "en", 5)
    preview = await service.async_preview(
        "synthetic", results[0].provider_ref, "en", plant_id=plant.id
    )
    updated = await service.async_apply(
        plant.id,
        expected_revision=plant.revision,
        preview_token=preview.token,
        provider=preview.provider,
        operation=preview.operation,
        confirmed=True,
    )
    assert updated.species is not None
    assert updated.species.provider == "synthetic"


async def test_accepted_refresh_replaces_omitted_prior_provider_defaults(
    hass: HomeAssistant,
) -> None:
    manager = await _manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    client, _session = _client(
        [
            _token(),
            FakeResponse(200, _detail()),
            FakeResponse(
                200,
                _detail(min_soil_moist=20, max_soil_moist=None),
            ),
        ]
    )
    registry = ProviderRegistry()
    registry.register(client)
    service = SpeciesProviderService(registry, manager)
    initial = await service.async_preview(
        "openplantbook", "aloe vera", "en", plant_id=plant.id
    )
    plant = await service.async_apply(
        plant.id,
        expected_revision=plant.revision,
        preview_token=initial.token,
        provider=initial.provider,
        operation=initial.operation,
        confirmed=True,
    )
    assert plant.moisture.threshold_defaults["max"].source == "provider"
    refresh = await service.async_preview(
        "openplantbook",
        "aloe vera",
        "en",
        plant_id=plant.id,
        force_refresh=True,
    )
    plant = await service.async_apply(
        plant.id,
        expected_revision=plant.revision,
        preview_token=refresh.token,
        provider=refresh.provider,
        operation=refresh.operation,
        confirmed=True,
    )
    assert plant.moisture.threshold_defaults["min"].source == "provider"
    assert plant.moisture.threshold_defaults["min"].value == 20
    assert plant.moisture.threshold_defaults["max"].source == "builtin"
    assert plant.moisture.threshold_defaults["max"].provider is None


class BlockingProvider(SyntheticProvider):
    def __init__(self) -> None:
        self.release = asyncio.Event()

    async def async_search(
        self, query: str, locale: str, limit: int
    ) -> tuple[SpeciesSearchResult, ...]:
        await self.release.wait()
        return await super().async_search(query, locale, limit)

    async def async_close(self) -> None:
        self.release.set()


async def test_service_close_fences_and_drains_inflight_search(
    hass: HomeAssistant,
) -> None:
    manager = await _manager(hass)
    provider = BlockingProvider()
    registry = ProviderRegistry()
    registry.register(provider)
    service = SpeciesProviderService(registry, manager)
    search = asyncio.create_task(service.async_search("synthetic", "Plant", "en", 5))
    await asyncio.sleep(0)
    await service.async_close()
    outcome = (await asyncio.gather(search, return_exceptions=True))[0]
    assert isinstance(outcome, ProviderOutageError)
    assert not service._tasks
    assert service.diagnostics()["pending_preview_count"] == 0
