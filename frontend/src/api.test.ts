// Unit tests for the WebSocket client wrapper. The transport itself lives
// on hass.connection and is mocked; we check the message shape we send and
// the error mapping we do on the way back.

import { describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api.js";
import type { HomeAssistantLike, PlantRecord } from "./types.js";
import { snapshot } from "./test-helpers.js";

function fakeHass(
  responder: (msg: Record<string, unknown>) => unknown | Promise<unknown>,
): HomeAssistantLike {
  return {
    connection: {
      sendMessagePromise: vi.fn(async (msg) => {
        const out = await responder(msg);
        return out as never;
      }),
    },
  };
}

const samplePlant: PlantRecord = {
  id: "plt-1",
  revision: 1,
  name: "Aloe",
  created_at: "2026-09-05T00:00:00Z",
  lifecycle_state: "active",
  acquired_at: null,
  species: null,
  placement: null,
  tags: [],
  category: null,
  image: null,
};

describe("api.list", () => {
  it("sends the frozen command and unwraps plants", async () => {
    const captured: Record<string, unknown>[] = [];
    const hass = fakeHass((msg) => {
      captured.push(msg);
      return { plants: [samplePlant] };
    });
    const result = await api.list(hass);
    expect(captured).toEqual([{ type: "smart_plants/plants/list" }]);
    expect(result).toEqual([samplePlant]);
  });
});

describe("api.create", () => {
  it("passes input fields on the create command", async () => {
    const captured: Record<string, unknown>[] = [];
    const hass = fakeHass((msg) => {
      captured.push(msg);
      return { plant: samplePlant };
    });
    const result = await api.create(hass, {
      name: "Aloe",
      tags: ["kitchen"],
      category: null,
    });
    expect(captured[0]).toEqual({
      type: "smart_plants/plants/create",
      name: "Aloe",
      tags: ["kitchen"],
      category: null,
    });
    expect(result).toEqual(samplePlant);
  });
});

describe("species provider api", () => {
  it("wraps bounded search, preview, and explicit apply commands", async () => {
    const captured: Record<string, unknown>[] = [];
    const hass = fakeHass((msg) => {
      captured.push(msg);
      if (msg["type"] === "smart_plants/species/search") {
        return { results: [] };
      }
      if (msg["type"] === "smart_plants/species/preview") {
        return {
          preview_token: "a".repeat(64),
          provider: "openplantbook",
          operation: "select",
          snapshot: { ...snapshot, provider_ref: "aloe vera" },
          diff: {},
        };
      }
      return { plant: samplePlant };
    });
    await api.searchSpecies(hass, "openplantbook", "Aloe", "en", 20);
    const preview = await api.previewSpecies(
      hass,
      "openplantbook",
      "aloe vera",
      "en",
      "plt-1",
    );
    await api.applySpecies(
      hass,
      "plt-1",
      1,
      preview.preview_token,
      "openplantbook",
      "select",
    );
    expect(captured).toEqual([
      {
        type: "smart_plants/species/search",
        provider: "openplantbook",
        query: "Aloe",
        locale: "en",
        limit: 20,
      },
      {
        type: "smart_plants/species/preview",
        provider: "openplantbook",
        provider_ref: "aloe vera",
        locale: "en",
        plant_id: "plt-1",
      },
      {
        type: "smart_plants/species/apply",
        plant_id: "plt-1",
        expected_revision: 1,
        preview_token: "a".repeat(64),
        provider: "openplantbook",
        operation: "select",
        confirmed: true,
      },
    ]);
  });
});

describe("api error mapping", () => {
  it("maps backend error codes into ApiError.code", async () => {
    const hass = fakeHass(() => {
      // HA's connection rejects with { error: { code, message } }.
      throw { error: { code: "revision_conflict", message: "stale" } };
    });
    await expect(
      api.update(hass, {
        plant_id: "plt-1",
        expected_revision: 1,
        name: "Aloe Vera",
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      code: "revision_conflict",
    });
  });

  it("falls back to unknown_error for unstructured throws", async () => {
    const hass = fakeHass(() => {
      throw new Error("boom");
    });
    await expect(api.list(hass)).rejects.toBeInstanceOf(ApiError);
    await expect(api.list(hass)).rejects.toMatchObject({
      code: "unknown_error",
    });
  });
});

describe("api.fetchImage", () => {
  it("fetches the image with the HA access token", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () => new Response(new Blob(["image"], { type: "image/webp" }))) as never;
    try {
      const hass = {
        ...fakeHass(() => ({})),
        auth: { accessToken: "secret-token" },
      };
      await api.fetchImage(hass, "a b/c");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/smart_plants/plants/a%20b%2Fc/image",
        expect.objectContaining({
          method: "GET",
          headers: { Authorization: "Bearer secret-token" },
        }),
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("api.uploadImage", () => {
  it("posts the file and returns the unwrapped plant", async () => {
    const originalFetch = global.fetch;
    const calls: { url: string; init: RequestInit }[] = [];
    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init: init ?? {} });
      return new Response(JSON.stringify({ plant: samplePlant }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as never;
    try {
      const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", {
        type: "image/jpeg",
      });
      const hass = fakeHass(() => ({}));
      const result = await api.uploadImage(hass, "plt-1", 2, file);
      expect(calls[0]?.url).toBe(
        "/api/smart_plants/plants/plt-1/image?expected_revision=2",
      );
      expect(calls[0]?.init.method).toBe("POST");
      expect(result).toEqual(samplePlant);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("maps backend error envelopes into ApiError.code", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: { code: "invalid_format", message: "bad mime" },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }) as never;
    try {
      const file = new File([new Uint8Array([1])], "photo.jpg", {
        type: "image/jpeg",
      });
      const hass = fakeHass(() => ({}));
      await expect(
        api.uploadImage(hass, "plt-1", 2, file),
      ).rejects.toMatchObject({
        name: "ApiError",
        code: "invalid_format",
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("api.delete", () => {
  it("sends plant_id + expected_revision", async () => {
    const captured: Record<string, unknown>[] = [];
    const hass = fakeHass((msg) => {
      captured.push(msg);
      return {};
    });
    await api.delete(hass, "plt-1", 4);
    expect(captured[0]).toEqual({
      type: "smart_plants/plants/delete",
      plant_id: "plt-1",
      expected_revision: 4,
    });
  });
});
