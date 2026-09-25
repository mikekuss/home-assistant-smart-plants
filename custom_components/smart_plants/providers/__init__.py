"""Built-in Smart Plants species provider registration."""

from __future__ import annotations

from typing import Any

from custom_components.smart_plants.provider import (
    ManualSpeciesProvider,
    ProviderDescriptor,
    ProviderRegistry,
)

from .openplantbook import OPENPLANTBOOK_DESCRIPTOR

BUILTIN_PROVIDER_DESCRIPTORS: tuple[ProviderDescriptor, ...] = (
    OPENPLANTBOOK_DESCRIPTOR,
)


def provider_descriptors() -> tuple[ProviderDescriptor, ...]:
    """Return the immutable built-in configuration registry."""
    return BUILTIN_PROVIDER_DESCRIPTORS


def build_provider_registry(hass: Any, data: dict[str, Any]) -> ProviderRegistry:
    registry = ProviderRegistry()
    registry.register(ManualSpeciesProvider())
    for descriptor in provider_descriptors():
        provider = descriptor.build(hass, data)
        if provider is not None:
            registry.register(provider)
    return registry
