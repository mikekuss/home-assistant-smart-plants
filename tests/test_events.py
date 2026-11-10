"""Manager event payloads and subscription semantics."""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import patch

import pytest
from custom_components.smart_plants.events import (
    PlantAddedEvent,
    PlantDeletedEvent,
    PlantEvent,
    PlantLifecycleChangedEvent,
    PlantUpdatedEvent,
)
from custom_components.smart_plants.manager import SmartPlantsManager
from custom_components.smart_plants.storage import SmartPlantsStorageError
from homeassistant.core import HomeAssistant


async def _loaded_manager(hass: HomeAssistant) -> SmartPlantsManager:
    manager = SmartPlantsManager(hass)
    await manager.async_load()
    return manager


class _Recorder:
    def __init__(self) -> None:
        self.events: list[PlantEvent] = []

    def __call__(self, event: PlantEvent) -> None:
        self.events.append(event)


async def test_create_dispatches_plant_added(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    recorder = _Recorder()
    manager.subscribe(recorder)

    plant = await manager.async_create_plant(name="Aloe")

    assert len(recorder.events) == 1
    event = recorder.events[0]
    assert isinstance(event, PlantAddedEvent)
    assert event.kind == "plant_added"
    assert event.plant == plant


async def test_update_dispatches_plant_updated_with_previous(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    recorder = _Recorder()
    manager.subscribe(recorder)

    updated = await manager.async_update_plant(
        plant.id, expected_revision=1, name="Aloe Vera"
    )

    assert [type(e) for e in recorder.events] == [PlantUpdatedEvent]
    event = recorder.events[0]
    assert isinstance(event, PlantUpdatedEvent)
    assert event.plant == updated
    assert event.previous == plant


async def test_update_noop_does_not_dispatch(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    recorder = _Recorder()
    manager.subscribe(recorder)

    await manager.async_update_plant(plant.id, expected_revision=1)
    assert recorder.events == []


async def test_disable_and_reenable_dispatch_lifecycle_events(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    recorder = _Recorder()
    manager.subscribe(recorder)

    disabled = await manager.async_disable_plant(plant.id, expected_revision=1)
    reenabled = await manager.async_reenable_plant(plant.id, expected_revision=2)

    assert [type(e) for e in recorder.events] == [
        PlantLifecycleChangedEvent,
        PlantLifecycleChangedEvent,
    ]
    first, second = recorder.events
    assert isinstance(first, PlantLifecycleChangedEvent)
    assert first.plant == disabled
    assert first.previous_state == "active"
    assert isinstance(second, PlantLifecycleChangedEvent)
    assert second.plant == reenabled
    assert second.previous_state == "disabled"


async def test_lifecycle_noop_does_not_dispatch(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    await manager.async_disable_plant(plant.id, expected_revision=1)
    recorder = _Recorder()
    manager.subscribe(recorder)

    await manager.async_disable_plant(plant.id, expected_revision=2)
    assert recorder.events == []


async def test_delete_dispatches_plant_deleted(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    recorder = _Recorder()
    manager.subscribe(recorder)

    await manager.async_delete_plant(plant.id, expected_revision=1)

    assert [type(e) for e in recorder.events] == [PlantDeletedEvent]
    event = recorder.events[0]
    assert isinstance(event, PlantDeletedEvent)
    assert event.plant_id == plant.id
    assert event.previous == plant


async def test_events_are_frozen(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    recorder = _Recorder()
    manager.subscribe(recorder)
    await manager.async_create_plant(name="Aloe")

    event = recorder.events[0]
    assert isinstance(event, PlantAddedEvent)
    with pytest.raises((AttributeError, TypeError)):
        event.plant = event.plant  # type: ignore[misc]


async def test_unsubscribe_stops_delivery(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    recorder = _Recorder()
    unsub = manager.subscribe(recorder)
    await manager.async_create_plant(name="A")
    unsub()
    await manager.async_create_plant(name="B")

    assert len(recorder.events) == 1


async def test_repeated_unsubscribe_is_safe(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    recorder = _Recorder()
    unsub = manager.subscribe(recorder)
    unsub()
    unsub()  # must not raise
    await manager.async_create_plant(name="A")
    assert recorder.events == []


async def test_two_subscriptions_of_same_callback_are_independent(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    recorder = _Recorder()
    unsub_a = manager.subscribe(recorder)
    manager.subscribe(recorder)

    await manager.async_create_plant(name="A")
    assert len(recorder.events) == 2

    unsub_a()
    await manager.async_create_plant(name="B")
    assert len(recorder.events) == 3


async def test_subscriber_exception_does_not_break_others(
    hass: HomeAssistant, caplog: pytest.LogCaptureFixture
) -> None:
    manager = await _loaded_manager(hass)
    recorder = _Recorder()

    def _boom(_event: PlantEvent) -> None:
        raise RuntimeError("subscriber failed")

    manager.subscribe(_boom)
    manager.subscribe(recorder)

    await manager.async_create_plant(name="A")

    assert len(recorder.events) == 1
    assert any(
        "Smart Plants event subscriber raised" in record.message
        for record in caplog.records
    )


async def test_required_subscriber_failure_cannot_fail_committed_mutation(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)

    def fail(_event: PlantEvent) -> None:
        raise RuntimeError("required callback failed")

    manager.subscribe_required(fail)
    plant = await manager.async_create_plant(name="Aloe")
    assert manager.get_plant(plant.id) == plant


async def test_concurrent_dispatch_keeps_controller_event_order(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    entered = asyncio.Event()
    release = asyncio.Event()
    observed: list[tuple[int, int]] = []

    async def observe(event: PlantEvent) -> None:
        if not isinstance(event, PlantUpdatedEvent):
            return
        controller = manager.get_moisture_controller(plant.id)
        assert controller is not None
        observed.append((event.plant.revision, controller.config.moisture_min))
        if len(observed) == 1:
            entered.set()
            await release.wait()

    manager.subscribe(observe)
    first = asyncio.create_task(
        manager.async_set_moisture_thresholds(
            plant.id,
            expected_revision=1,
            moisture_min=20,
            moisture_target=40,
            moisture_max=60,
        )
    )
    await entered.wait()
    second = asyncio.create_task(
        manager.async_set_moisture_thresholds(
            plant.id,
            expected_revision=2,
            moisture_min=25,
            moisture_target=45,
            moisture_max=65,
        )
    )
    await asyncio.sleep(0)
    release.set()
    await asyncio.gather(first, second)
    assert observed == [(2, 20), (3, 25)]


async def test_async_subscriber_is_awaited_in_order(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    trace: list[str] = []

    async def first(_event: PlantEvent) -> None:
        await asyncio.sleep(0)
        trace.append("first")

    def second(_event: PlantEvent) -> None:
        trace.append("second")

    manager.subscribe(first)
    manager.subscribe(second)

    await manager.async_create_plant(name="A")
    assert trace == ["first", "second"]


async def test_subscribe_during_dispatch_skips_current_event(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    recorder = _Recorder()

    def resubscribe(_event: PlantEvent) -> None:
        manager.subscribe(recorder)

    manager.subscribe(resubscribe)

    await manager.async_create_plant(name="A")
    assert recorder.events == []

    await manager.async_create_plant(name="B")
    # ``resubscribe`` fires each time; each call adds a fresh
    # subscription. Recorder gets one hit per already-registered
    # subscription visible when B is dispatched — exactly one.
    assert len(recorder.events) == 1


async def test_unsubscribe_from_within_dispatch_is_safe(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    recorder = _Recorder()

    unsub: list[Any] = []

    def self_unsub(_event: PlantEvent) -> None:
        unsub[0]()

    unsub.append(manager.subscribe(self_unsub))
    manager.subscribe(recorder)

    await manager.async_create_plant(name="A")
    await manager.async_create_plant(name="B")
    # recorder receives both events; self_unsub only the first.
    assert len(recorder.events) == 2


async def test_event_fires_only_after_durable_publish(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    recorder = _Recorder()
    manager.subscribe(recorder)

    # Patch the store to fail: the mutation itself must raise and no
    # event may be dispatched for a snapshot that never landed.
    with (
        patch.object(manager._store, "async_save", side_effect=OSError("disk full")),
        pytest.raises(SmartPlantsStorageError),
    ):
        await manager.async_create_plant(name="Ghost")

    assert recorder.events == []


def _rename(name: str) -> Any:
    return lambda current: current.with_next_revision(name=name)


async def test_cancelled_batch_still_delivers_every_committed_event(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    first = await manager.async_create_plant(name="Aloe")
    second = await manager.async_create_plant(name="Fern")
    entered = asyncio.Event()
    release = asyncio.Event()
    delivered: list[str] = []

    async def slow(event: PlantEvent) -> None:
        if isinstance(event, PlantUpdatedEvent) and event.plant.name == "Aloe 2":
            entered.set()
            await release.wait()

    def record(event: PlantEvent) -> None:
        if isinstance(event, PlantUpdatedEvent):
            delivered.append(event.plant.name)

    unsubscribe = manager.subscribe(slow)
    manager.subscribe(record)
    batch = asyncio.create_task(
        manager.async_apply_plant_changes(
            [(first.id, _rename("Aloe 2")), (second.id, _rename("Fern 2"))]
        )
    )
    await entered.wait()
    batch.cancel()
    with pytest.raises(asyncio.CancelledError):
        await batch

    # Both changes are durable even though the caller went away.
    assert manager.get_plant(first.id).name == "Aloe 2"
    assert manager.get_plant(second.id).name == "Fern 2"
    unsubscribe()
    release.set()

    async with asyncio.timeout(5):
        await manager.async_apply_plant_changes([(first.id, _rename("Aloe 3"))])
    assert delivered == ["Aloe 2", "Fern 2", "Aloe 3"]
    async with asyncio.timeout(5):
        await manager.async_unload()


async def test_cancelled_wait_for_an_earlier_event_still_delivers(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    plant = await manager.async_create_plant(name="Aloe")
    entered = asyncio.Event()
    release = asyncio.Event()
    delivered: list[str] = []

    async def slow(event: PlantEvent) -> None:
        if isinstance(event, PlantUpdatedEvent) and event.plant.name == "Aloe 2":
            entered.set()
            await release.wait()

    def record(event: PlantEvent) -> None:
        if isinstance(event, PlantUpdatedEvent):
            delivered.append(event.plant.name)

    manager.subscribe(slow)
    manager.subscribe(record)
    earlier = asyncio.create_task(
        manager.async_apply_plant_changes([(plant.id, _rename("Aloe 2"))])
    )
    await entered.wait()
    waiting = asyncio.create_task(
        manager.async_apply_plant_changes([(plant.id, _rename("Aloe 3"))])
    )
    for _ in range(5):
        await asyncio.sleep(0)
    assert manager.get_plant(plant.id).name == "Aloe 3"
    waiting.cancel()
    with pytest.raises(asyncio.CancelledError):
        await waiting
    release.set()

    async with asyncio.timeout(5):
        await earlier
        await manager.async_apply_plant_changes([(plant.id, _rename("Aloe 4"))])
    assert delivered == ["Aloe 2", "Aloe 3", "Aloe 4"]


async def test_subscriber_cancellation_does_not_cancel_the_mutation(
    hass: HomeAssistant, caplog: pytest.LogCaptureFixture
) -> None:
    manager = await _loaded_manager(hass)
    recorder = _Recorder()

    async def cancelled(_event: PlantEvent) -> None:
        raise asyncio.CancelledError

    manager.subscribe(cancelled)
    manager.subscribe(recorder)

    async with asyncio.timeout(5):
        plant = await manager.async_create_plant(name="Aloe")
        await manager.async_apply_plant_changes([(plant.id, _rename("Aloe 2"))])
    assert [type(event) for event in recorder.events] == [
        PlantAddedEvent,
        PlantUpdatedEvent,
    ]
    assert "subscriber was cancelled" in caplog.text


async def test_subscriber_can_write_while_handling_an_event(
    hass: HomeAssistant,
) -> None:
    manager = await _loaded_manager(hass)
    recorder = _Recorder()

    async def follow_up(event: PlantEvent) -> None:
        if isinstance(event, PlantAddedEvent) and event.plant.name == "Aloe":
            await manager.async_create_plant(name="Fern")
            await manager.async_apply_plant_changes(
                [(event.plant.id, _rename("Aloe 2"))]
            )

    manager.subscribe(follow_up)
    manager.subscribe(recorder)

    async with asyncio.timeout(5):
        await manager.async_create_plant(name="Aloe")
        await manager.async_create_plant(name="Ivy")
    names = [
        event.plant.name
        for event in recorder.events
        if isinstance(event, (PlantAddedEvent, PlantUpdatedEvent))
    ]
    # The nested writes are delivered while the subscriber handles the outer
    # event, so they reach later subscribers first; the next write follows.
    assert names == ["Fern", "Aloe 2", "Aloe", "Ivy"]


async def test_unload_waits_for_a_running_delivery(hass: HomeAssistant) -> None:
    manager = await _loaded_manager(hass)
    entered = asyncio.Event()
    release = asyncio.Event()
    finished: list[str] = []

    async def slow(event: PlantEvent) -> None:
        if isinstance(event, PlantAddedEvent):
            entered.set()
            await release.wait()
            finished.append(event.plant.name)

    manager.subscribe(slow)
    create = asyncio.create_task(manager.async_create_plant(name="Aloe"))
    await entered.wait()
    unload = asyncio.create_task(manager.async_unload())
    for _ in range(5):
        await asyncio.sleep(0)
    assert not unload.done()
    release.set()
    async with asyncio.timeout(5):
        await unload
        await create
    assert finished == ["Aloe"]
