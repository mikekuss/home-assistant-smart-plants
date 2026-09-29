import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./panel.js";
import type { HomeAssistantLike, PlantRecord } from "./types.js";
import { button, click, harness, settle } from "./test-helpers.js";

const plant: PlantRecord = {
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
  image: {
    id: "img-1",
    content_type: "image/webp",
    width: 100,
    height: 100,
    created_at: "2026-09-05T00:00:00Z",
  },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function hassFor(plants: PlantRecord[]): HomeAssistantLike {
  return harness(plants).hass;
}

async function openDetail(
  plants: PlantRecord[],
): Promise<HTMLElementTagNameMap["smart-plants-panel"]> {
  const element = document.createElement("smart-plants-panel");
  // These tests cover the plant page photo; overview thumbnails have their own tests.
  (element as unknown as { _syncThumbnails(): void })._syncThumbnails = () => undefined;
  element.hass = hassFor(plants);
  document.body.append(element);
  const cardName = () => element.shadowRoot?.querySelector("smart-plants-overview")?.shadowRoot?.querySelector<HTMLElement>(".name");
  await vi.waitFor(() => {
    expect(cardName()).toBeTruthy();
  });
  cardName()!.click();
  await element.updateComplete;
  await click(element, "Plant details");
  return element;
}

describe("SmartPlantsPanel image loading", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["image"], { type: "image/webp" }))));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:photo");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    document.body.replaceChildren();
    await Promise.resolve();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates a blob URL and revokes it when replaced", async () => {
    const element = await openDetail([plant]);
    await vi.waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledOnce();
    });

    const replacement = {
      ...plant,
      revision: 2,
      image: { ...plant.image!, id: "img-2" },
    };
    const internals = element as unknown as {
      _plants: PlantRecord[];
      _syncImage(): void;
      requestUpdate(): void;
    };
    internals._plants = [replacement];
    internals._syncImage();
    internals.requestUpdate();
    await element.updateComplete;

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
    await vi.waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    });
    await element.updateComplete;
  });

  it("revokes a stale response after image replacement", async () => {
    const pending = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(pending.promise);
    const element = await openDetail([plant]);
    const replacement = {
      ...plant,
      revision: 2,
      image: { ...plant.image!, id: "img-2" },
    };
    const internals = element as unknown as {
      _plants: PlantRecord[];
      _syncImage(): void;
      requestUpdate(): void;
    };
    internals._plants = [replacement];
    internals._syncImage();
    internals.requestUpdate();
    await element.updateComplete;

    pending.resolve(new Response(new Blob(["stale"], { type: "image/webp" })));
    await vi.waitFor(() => {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
    });
  });

  it("revokes the active blob URL on disconnect", async () => {
    const element = await openDetail([plant]);
    await vi.waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledOnce();
    });
    element.remove();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
  });

  it("refetches the image when the same element reconnects", async () => {
    const element = await openDetail([plant]);
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce();
    });
    element.remove();
    document.body.append(element);
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("does not request an image when the plant has no image", async () => {
    const element = await openDetail([{ ...plant, image: null }]);
    expect(fetch).not.toHaveBeenCalled();
    expect(element.shadowRoot?.textContent).toContain("No photo yet.");
  });

  it("aborts image fetch and revokes a late response after navigation", async () => {
    const pending = deferred<Response>(); vi.mocked(fetch).mockReturnValueOnce(pending.promise);
    const element = await openDetail([plant]); const signal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal;
    await click(element, "Back to overview"); expect(signal?.aborted).toBe(true);
    pending.resolve(new Response(new Blob(["late"], { type: "image/webp" }))); await settle(element);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo"); expect(element.shadowRoot?.querySelector("img")).toBeNull();
  });

  it("refetches protected images when HA rotates the access token", async () => {
    const element = await openDetail([plant]); await settle(element);
    element.hass = { ...element.hass!, auth: { accessToken: "rotated" } }; await settle(element);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
    expect(fetch).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ headers: { Authorization: "Bearer rotated" } }));
  });

  it("removes an image using the authenticated revision-checked endpoint", async () => {
    let current = plant;
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      if (init?.method === "DELETE") { current = { ...plant, revision: 2, image: null }; return new Response(JSON.stringify({ plant: current })); }
      return new Response(new Blob(["image"], { type: "image/webp" }));
    });
    const element = document.createElement("smart-plants-panel"); element.hass = harness([plant], msg => msg.type === "smart_plants/plants/list" ? { plants: [current] } : undefined).hass;
    document.body.append(element); await settle(element); await click(element, "Aloe"); await click(element, "Plant details");
    await vi.waitFor(() => expect(button(element.shadowRoot!, "Remove photo")).toBeDefined());
    await click(element, "Remove photo");
    expect(fetch).toHaveBeenCalledWith("/api/smart_plants/plants/plt-1/image?expected_revision=1", expect.objectContaining({ method: "DELETE", headers: { Authorization: "Bearer test-token" } }));
    expect(element.shadowRoot?.textContent).toContain("No photo yet."); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
  });

  it("reports a failed authenticated image read and supports retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 401 }));
    const element = await openDetail([plant]); await settle(element);
    expect(element.shadowRoot?.textContent).toContain("Photo could not be loaded"); await click(element, "Retry photo"); await settle(element); expect(element.shadowRoot?.querySelector("img")?.src).toBe("blob:photo");
  });
});
