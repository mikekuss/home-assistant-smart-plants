from __future__ import annotations

import contextlib
import logging
from dataclasses import dataclass
from dataclasses import field as dataclass_field
from typing import TYPE_CHECKING

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.exceptions import ConfigEntryError
from homeassistant.helpers import config_validation as cv

from .const import (
    CONF_PRESERVE_INVENTORY_ON_REMOVAL,
    DEFAULT_PRESERVE_INVENTORY_ON_REMOVAL,
    DOMAIN,
)
from .device import SmartPlantsDeviceReconciler
from .http import async_register as async_register_http
from .images import ensure_images_dir, remove_images_dir
from .manager import SmartPlantsManager
from .panel import (
    async_register_panel,
    async_register_static,
    async_unregister_panel,
)
from .provider import SpeciesProviderService
from .providers import build_provider_registry
from .repairs import MissingSourceRepairMonitor
from .storage import SmartPlantsStorageError, async_remove_storage
from .websocket_api import async_register as async_register_websocket

_LOGGER = logging.getLogger(__name__)


class _MissingLifecycle:
    is_attached = False


_MISSING_LIFECYCLE = _MissingLifecycle()

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.typing import ConfigType

    from .entity import SmartPlantsPlatformLifecycle


@dataclass(slots=True)
class SmartPlantsRuntimeData:
    manager: SmartPlantsManager
    provider_service: SpeciesProviderService | None = None
    repair_monitor: MissingSourceRepairMonitor | None = None
    platform_lifecycles: dict[str, SmartPlantsPlatformLifecycle] = dataclass_field(
        default_factory=dict
    )


type SmartPlantsConfigEntry = ConfigEntry[SmartPlantsRuntimeData]

# Smart Plants is UI-configured (config_flow: true) and takes no YAML.
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

# Forward these three platforms so plant-scoped entities can be
# added and torn down through the standard HA lifecycle. The forward
# runs only AFTER storage is validated and startup reconciliation has
# drained pending operations so a corrupt inventory never authorizes
# an entity add against a plant we could not verify.
PLATFORMS: list[Platform] = [
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.NUMBER,
]


async def _async_unload_platforms(
    hass: HomeAssistant,
    entry: SmartPlantsConfigEntry,
    platforms: list[Platform],
) -> tuple[Platform, ...]:
    """Unload platforms independently so partial success remains observable."""
    all_unloaded = await hass.config_entries.async_unload_platforms(entry, platforms)
    unloaded = tuple(
        platform
        for platform in platforms
        if all_unloaded
        or not entry.runtime_data.platform_lifecycles.get(
            str(platform), _MISSING_LIFECYCLE
        ).is_attached
    )
    for platform in unloaded:
        lifecycle = entry.runtime_data.platform_lifecycles.pop(str(platform), None)
        if lifecycle is not None:
            await lifecycle.async_unload()
    return unloaded


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    # Process-lifetime registration: WebSocket commands and the static
    # route that serves the panel bundle. Both survive entry unload; the
    # handlers themselves reject requests with "integration_not_loaded"
    # when the singleton entry is missing or being torn down.
    async_register_websocket(hass)
    async_register_http(hass)
    await async_register_static(hass)
    await hass.async_add_executor_job(ensure_images_dir, hass)
    return True


async def async_setup_entry(  # noqa: PLR0915
    hass: HomeAssistant, entry: SmartPlantsConfigEntry
) -> bool:
    # Claim the process-level singleton slot synchronously, before the first
    # await, so two concurrent async_setup_entry calls cannot both pass the
    # "already loaded" check and race to install a runtime manager.
    if hass.data.get(DOMAIN) == entry.entry_id:
        # A previous setup may have forwarded some platforms and then failed
        # to tear them down. Ownership is deliberately retained in that case;
        # retry cleanup before replacing the manager those platforms reference.
        existing = getattr(entry, "runtime_data", None)
        if existing is None:
            raise ConfigEntryError("Smart Plants setup cleanup is incomplete")
        unloaded = await _async_unload_platforms(hass, entry, PLATFORMS)
        if len(unloaded) != len(PLATFORMS):
            raise ConfigEntryError("Smart Plants platform cleanup is still incomplete")
        if existing.repair_monitor is not None:
            existing.repair_monitor.stop()
        await existing.manager.async_unload()
        with contextlib.suppress(AttributeError):
            del entry.runtime_data
        hass.data.pop(DOMAIN, None)
    elif DOMAIN in hass.data:
        raise ConfigEntryError("Smart Plants already has a loaded config entry")
    hass.data[DOMAIN] = entry.entry_id

    reconciler = SmartPlantsDeviceReconciler(hass, entry.entry_id)
    manager = SmartPlantsManager(hass, reconciler=reconciler)
    provider_service: SpeciesProviderService | None = None

    manager_loaded = False
    runtime_published = False
    platform_forward_started = False
    panel_registration_started = False
    repair_monitor: MissingSourceRepairMonitor | None = None

    async def _rollback() -> None:  # noqa: PLR0912
        # Reverse the partial setup in the opposite order it was applied so
        # a failure at any step leaves no live manager, no leaked runtime
        # data, no orphan sidebar entry, no live platform entities, and no
        # claimed singleton slot.
        cleanup_error: BaseException | None = None
        if panel_registration_started:
            try:
                async_unregister_panel(hass)
            except BaseException as err:  # noqa: BLE001
                cleanup_error = err
        platforms_clean = not platform_forward_started
        if platform_forward_started:
            # Unload every platform we forwarded before the failure so
            # entity indexes and platform-level subscriptions detach
            # before the manager itself is closed. Ignore the boolean
            # return: on rollback we still want to release the singleton
            # slot even if a platform's own unload complained.
            try:
                unloaded = await _async_unload_platforms(hass, entry, PLATFORMS)
                remaining = [
                    platform for platform in PLATFORMS if platform not in unloaded
                ]
                if remaining:
                    unloaded_retry = await _async_unload_platforms(
                        hass, entry, remaining
                    )
                    unloaded = (*unloaded, *unloaded_retry)
                if len(unloaded) != len(PLATFORMS):
                    cleanup_error = RuntimeError(
                        "Smart Plants platform rollback remained incomplete"
                    )
                else:
                    platforms_clean = True
            except BaseException as err:  # noqa: BLE001
                cleanup_error = cleanup_error or err
        if not platforms_clean:
            # Forwarded platform callbacks may still hold this manager. Keep
            # runtime_data and the singleton claim intact so cleanup can be
            # retried; releasing either would permit two live owners.
            if not runtime_published:
                entry.runtime_data = SmartPlantsRuntimeData(
                    manager=manager, repair_monitor=repair_monitor
                )
            raise cleanup_error or RuntimeError(
                "Smart Plants platform rollback remained incomplete"
            )
        if runtime_published:
            existing = getattr(entry, "runtime_data", None)
            if existing is not None and existing.repair_monitor is not None:
                existing.repair_monitor.stop()
            with contextlib.suppress(AttributeError):
                del entry.runtime_data
        if manager_loaded:
            if provider_service is not None:
                try:
                    await provider_service.async_close()
                except BaseException as err:  # noqa: BLE001
                    cleanup_error = cleanup_error or err
            try:
                await manager.async_unload()
            except BaseException as err:  # noqa: BLE001
                cleanup_error = cleanup_error or err
        if hass.data.get(DOMAIN) == entry.entry_id:
            hass.data.pop(DOMAIN, None)
        if cleanup_error is not None:
            raise cleanup_error

    try:
        await manager.async_load()
        manager_loaded = True
        registry = build_provider_registry(hass, dict(entry.data))

        async def _start_reauth() -> None:
            entry.async_start_reauth(hass)

        provider_service = SpeciesProviderService(
            registry, manager, on_auth_failure=_start_reauth
        )
        # Replay any pending ops/tombstones from a prior crashed run so the
        # device registry catches up idempotently before the panel or any
        # WebSocket handler observes state.
        await manager.async_replay_pending()
        repair_monitor = MissingSourceRepairMonitor(hass, manager)
        entry.runtime_data = SmartPlantsRuntimeData(
            manager=manager,
            provider_service=provider_service,
            repair_monitor=repair_monitor,
        )
        runtime_published = True
        repair_monitor.start()
        # Forward platforms only AFTER validated storage load + replay so
        # a corrupt inventory (which raised in async_load) cannot expose
        # entity handles for plants we could not verify.
        platform_forward_started = True
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
        panel_registration_started = True
        await async_register_panel(hass)
    except SmartPlantsStorageError as err:
        await _rollback()
        raise ConfigEntryError(str(err)) from err
    except BaseException:
        await _rollback()
        raise

    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: SmartPlantsConfigEntry
) -> bool:
    # Unload platforms BEFORE closing the manager so entities have a
    # live manager to unregister themselves from and their subscription
    # unhook runs on the same event loop turn as their removal. If a
    # platform refuses to unload we still tear the manager down so a
    # subsequent reload does not fight the previous runtime.
    unloaded = await _async_unload_platforms(hass, entry, PLATFORMS)
    if len(unloaded) != len(PLATFORMS):
        # HA can report a partial platform unload. Restore any platform that
        # did unload so the still-loaded entry remains coherent and retryable.
        try:
            await hass.config_entries.async_forward_entry_setups(entry, unloaded)
        except Exception:
            _LOGGER.exception(
                "Smart Plants failed to restore partially unloaded platforms"
            )
        return False
    async_unregister_panel(hass)
    runtime_data = entry.runtime_data
    if runtime_data.repair_monitor is not None:
        runtime_data.repair_monitor.stop()
    if runtime_data.provider_service is not None:
        await runtime_data.provider_service.async_close()
    await runtime_data.manager.async_unload()
    if hass.data.get(DOMAIN) == entry.entry_id:
        hass.data.pop(DOMAIN)
    return True


async def async_remove_entry(
    hass: HomeAssistant, entry: SmartPlantsConfigEntry
) -> None:
    preserve = entry.options.get(
        CONF_PRESERVE_INVENTORY_ON_REMOVAL,
        DEFAULT_PRESERVE_INVENTORY_ON_REMOVAL,
    )
    if preserve:
        # Preservation is an opt-in reinstall aid: the inventory file
        # and every referenced image survive so a subsequent
        # re-configuration picks the plants back up unchanged.
        return

    # Default removal deletes the entire image data directory alongside
    # the inventory file so a re-added integration starts with a clean
    # slate and no orphaned images sit on disk forever.
    removed = await hass.async_add_executor_job(remove_images_dir, hass)
    if not removed:
        raise SmartPlantsStorageError("Smart Plants image directory removal failed")
    await async_remove_storage(hass)
