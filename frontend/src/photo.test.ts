import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./panel.js";
import "./components/sp-plant-photo.js";
import type { SpPlantPhoto } from "./components/sp-plant-photo.js";
import { api, parsePhotoMeta } from "./api.js";
import { PhotoQueue } from "./photo-queue.js";
import { deferred, harness, manualVisibility, settle } from "./test-helpers.js";
import type { PlantRecord } from "./types.js";

// A ThumbHash of a small synthetic leaf picture.
const HASH = "b9gVDYT4V2eGeXd7hXeIeQd5hG+4";
const hex = (n: number) => n.toString(16).padStart(32, "0");
const blob = (text = "image") => new Blob([text], { type: "image/webp" });
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); await new Promise(resolve => setTimeout(resolve, 0)); };

afterEach(async () => {
  document.body.replaceChildren();
  await flush();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("photo previews from the plant lists", () => {
  it("keeps valid ThumbHashes by image id and drops anything else", () => {
    expect(parsePhotoMeta({
      [hex(1)]: { thumbhash: HASH, extra: 1 },
      [hex(2)]: { thumbhash: "not base64!" },
      [hex(3)]: { thumbhash: "A".repeat(65) },
      [hex(4)]: { thumbhash: 7 },
      [hex(5)]: null,
      "img-1": { thumbhash: HASH },
      [hex(0xabc).toUpperCase()]: { thumbhash: HASH },
    })).toEqual({ [hex(1)]: { thumbhash: HASH } });
    for (const value of [undefined, null, "x", [], 3]) expect(parsePhotoMeta(value)).toEqual({});
  });

  it("come with the plant list and the retired plants", async () => {
    const meta = { [hex(1)]: { thumbhash: HASH } };
    const h = harness([], msg => msg.type === "smart_plants/plants/list" ? { plants: [], photo_meta: { ...meta, bad: {} } } : { plants: [], photo_meta: meta });
    expect((await api.listWithArchive(h.hass)).photoMeta).toEqual(meta);
    expect((await api.archiveList(h.hass)).photoMeta).toEqual(meta);
    const bare = harness([], () => ({ plants: [] }));
    expect((await api.listWithArchive(bare.hass)).photoMeta).toEqual({});
    expect((await api.list(bare.hass))).toEqual([]);
  });

  it("asks for a smaller copy of the photo when a size is given", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(blob())));
    await api.fetchImage(harness().hass, "plt-1", hex(9), undefined, "thumb");
    await api.fetchImage(harness().hass, "plt-1", hex(9), undefined, "thumb2x");
    await api.fetchImage(harness().hass, "plt-1", hex(9));
    expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).toEqual([
      `/api/smart_plants/plants/plt-1/image?v=${hex(9)}&size=thumb`,
      `/api/smart_plants/plants/plt-1/image?v=${hex(9)}&size=thumb2x`,
      `/api/smart_plants/plants/plt-1/image?v=${hex(9)}`,
    ]);
  });
});

describe("the photo queue", () => {
  it("runs four photos at a time and starts the next one as soon as one is done", async () => {
    const queue = new PhotoQueue(); const started: number[] = [];
    const jobs = Array.from({ length: 6 }, () => deferred<string>());
    const results = jobs.map((job, i) => queue.run(() => { started.push(i); return job.promise; }, new AbortController().signal));
    expect(started).toEqual([0, 1, 2, 3]);
    expect([queue.running, queue.waiting]).toEqual([4, 2]);
    jobs[2]!.resolve("two"); await flush();
    expect(started).toEqual([0, 1, 2, 3, 4]);
    await expect(results[2]).resolves.toBe("two");
    const failed = expect(results[0]).rejects.toThrow("failed");
    jobs[0]!.reject(new Error("failed")); await flush();
    expect(started).toEqual([0, 1, 2, 3, 4, 5]);
    await failed;
  });

  it("frees the slot of a running photo at once when it is cancelled, or when its task throws", async () => {
    const queue = new PhotoQueue(1); const started: string[] = [];
    const running = new AbortController();
    const cancelled = queue.run(() => { started.push("first"); return new Promise<void>(() => undefined); }, running.signal);
    const second = queue.run(async () => { started.push("second"); }, new AbortController().signal);
    expect([queue.running, queue.waiting]).toEqual([1, 1]);
    // The request never answers; cancelling it still lets the next one start.
    running.abort(); await flush();
    expect(started).toEqual(["first", "second"]);
    await second;
    expect(queue.running).toBe(0);
    void cancelled;
    const thrown = queue.run(() => { throw new Error("broken"); }, new AbortController().signal);
    await expect(thrown).rejects.toThrow("broken");
    await flush();
    expect(queue.running).toBe(0);
    await queue.run(async () => { started.push("third"); }, new AbortController().signal);
    expect(started).toEqual(["first", "second", "third"]);
  });

  it("puts the page's own photo first and drops a photo cancelled before its turn", async () => {
    const queue = new PhotoQueue(1); const started: string[] = [];
    const first = deferred<void>();
    void queue.run(() => { started.push("card 1"); return first.promise; }, new AbortController().signal);
    const cancelled = new AbortController();
    const dropped = queue.run(async () => { started.push("card 2"); }, cancelled.signal);
    void queue.run(async () => { started.push("card 3"); }, new AbortController().signal);
    void queue.run(async () => { started.push("page"); }, new AbortController().signal, true);
    cancelled.abort();
    await expect(dropped).rejects.toMatchObject({ name: "AbortError" });
    first.resolve(); await flush();
    expect(started).toEqual(["card 1", "page", "card 3"]);
    const late = new AbortController(); late.abort();
    await expect(queue.run(async () => { started.push("late"); }, late.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(started).not.toContain("late");
  });
});

describe("sp-plant-photo", () => {
  let urls: string[];
  beforeEach(() => {
    urls = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation(() => { const url = `blob:photo-${urls.length + 1}`; urls.push(url); return url; });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  async function mount(props: Partial<SpPlantPhoto>): Promise<SpPlantPhoto> {
    const element = document.createElement("sp-plant-photo");
    Object.assign(element, { name: "Basil", ...props });
    document.body.append(element); await element.updateComplete; await flush();
    return element;
  }
  const tile = (element: SpPlantPhoto) => element.shadowRoot!.querySelector<HTMLElement>(".tile")!;
  const img = (element: SpPlantPhoto) => element.shadowRoot!.querySelector("img");
  // The browser finished loading and decoding the photo.
  async function load(element: SpPlantPhoto): Promise<void> { img(element)!.dispatchEvent(new Event("load")); await flush(); }

  it("asks for its photo only once it comes near the screen", async () => {
    const screen = manualVisibility();
    const wanted: string[] = []; document.addEventListener("photo-wanted", e => wanted.push((e as CustomEvent<{ photoId: string }>).detail.photoId));
    const element = await mount({ photoId: hex(1) });
    expect(wanted).toEqual([]);
    screen.show(element); await flush();
    expect(wanted).toEqual([hex(1)]);
    // A new photo of the same plant on screen is asked for at once.
    element.photoId = hex(2); await element.updateComplete; await flush();
    expect(wanted).toEqual([hex(1), hex(2)]);
    expect(screen.observed()).toBe(0);
  });

  it("shows the plant icon without a photo and watches nothing", async () => {
    const screen = manualVisibility();
    const element = await mount({ photoId: null });
    expect(element.shadowRoot!.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:sprout");
    expect(img(element)).toBeNull();
    expect(screen.observed()).toBe(0);
  });

  // happy-dom drops the blurred SVG image itself as a background value (a
  // browser test checks it); its average colour and the cover size show which
  // stage of the preview is painted.
  it("shows the blurred preview in the photo's colours while the photo loads", async () => {
    const screen = manualVisibility();
    const element = await mount({ photoId: hex(3), thumbhash: HASH });
    // The average colour at once, without the plant icon.
    expect(tile(element).style.backgroundColor).toBe("#b8ccb6");
    expect(tile(element).style.backgroundSize).toBe("");
    expect(element.shadowRoot!.querySelector("ha-icon")).toBeNull();
    screen.show(element); await flush();
    expect(tile(element).style.backgroundSize).toBe("cover");
    element.photo = blob(); await element.updateComplete; await flush();
    // lazy-ease keeps the preview under the photo until it is displayed.
    expect(img(element)?.getAttribute("src")).toBe("blob:photo-1");
    expect(img(element)?.getAttribute("alt")).toBe("Photo of Basil");
    expect([tile(element).style.backgroundColor, tile(element).style.backgroundSize]).toEqual(["#b8ccb6", "cover"]);
    expect(tile(element).dataset.state).toBe("loading");
    await load(element); await new Promise(resolve => setTimeout(resolve, 200));
    expect(tile(element).dataset.state).toBe("loaded");
    expect([tile(element).style.backgroundColor, tile(element).style.backgroundSize]).toEqual(["", ""]);
  });

  it("does not load the photo again when it is drawn again", async () => {
    const element = await mount({ photoId: hex(4), photo: blob() });
    expect(urls).toEqual(["blob:photo-1"]);
    await load(element);
    element.requestUpdate(); await element.updateComplete; await flush();
    element.name = "Basil"; element.thumbhash = HASH; await element.updateComplete; await flush();
    // The same photo downloaded again (after a new access token) changes nothing.
    element.photo = blob("again"); await element.updateComplete; await flush();
    expect(urls).toEqual(["blob:photo-1"]);
    expect(img(element)?.getAttribute("src")).toBe("blob:photo-1");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("revokes the old photo as soon as a new one takes its place", async () => {
    const element = await mount({ photoId: hex(5), photo: blob() });
    await load(element);
    Object.assign(element, { photoId: hex(6), photo: blob("new") }); await element.updateComplete; await flush();
    expect(urls).toEqual(["blob:photo-1", "blob:photo-2"]);
    expect(img(element)?.getAttribute("src")).toBe("blob:photo-2");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
    await load(element);
    expect(tile(element).dataset.state).toBe("loaded");
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith("blob:photo-2");
  });

  it("asks for its photo again when the view drops it while it is on screen", async () => {
    const screen = manualVisibility();
    const wanted: string[] = []; document.addEventListener("photo-wanted", e => wanted.push((e as CustomEvent<{ photoId: string }>).detail.photoId));
    const element = await mount({ photoId: hex(11) });
    screen.show(element); await flush();
    element.photo = blob(); await element.updateComplete; await flush();
    expect(wanted).toEqual([hex(11)]);
    element.photo = null; await element.updateComplete; await flush();
    expect(wanted).toEqual([hex(11), hex(11)]);
    // Without a photo given, a redraw asks nothing more.
    element.requestUpdate(); await element.updateComplete; await flush();
    expect(wanted).toHaveLength(2);
  });

  it("goes back to the preview when its photo is taken away", async () => {
    const element = await mount({ photoId: hex(7), photo: blob(), thumbhash: HASH });
    element.photo = null; await element.updateComplete; await flush();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
    expect(img(element)).toBeNull();
    expect(tile(element).style.backgroundColor).not.toBe("");
    element.photoId = null; await element.updateComplete; await flush();
    expect(tile(element).style.backgroundColor).toBe("");
    expect(element.shadowRoot!.querySelector("ha-icon")).not.toBeNull();
  });

  it("lets go of its photo when it leaves the page, but not when it only moves", async () => {
    const element = await mount({ photoId: hex(8), photo: blob() });
    const other = document.createElement("div"); document.body.append(other);
    other.append(element); await flush();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(urls).toHaveLength(1);
    element.remove(); await flush();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
    // Back on the page it makes a new object URL from the same download.
    document.body.append(element); await flush();
    expect(urls).toEqual(["blob:photo-1", "blob:photo-2"]);
    expect(img(element)?.getAttribute("src")).toBe("blob:photo-2");
  });

  it("reports a photo that downloaded but cannot be displayed", async () => {
    const element = await mount({ photoId: hex(10), photo: blob() });
    let fired = 0; document.addEventListener("photo-error", () => fired++);
    img(element)!.dispatchEvent(new Event("error")); await flush();
    expect(fired).toBe(1);
  });
});

describe("the plant list photos", () => {
  const plants: PlantRecord[] = Array.from({ length: 6 }, (_, i) => ({
    id: `plt-${i + 1}`, revision: 1, name: `Plant ${i + 1}`, created_at: "2026-09-05T00:00:00Z", lifecycle_state: "active", acquired_at: null, species: null,
    placement: null, tags: [], category: null, image: { id: hex(100 + i), content_type: "image/webp", width: 100, height: 100, created_at: "2026-09-05T00:00:00Z" },
  }));
  const imageCalls = () => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("/image?"));

  async function open(list: PlantRecord[], meta: Record<string, { thumbhash: string }> = {}) {
    const rig = harness(list, msg => msg.type === "smart_plants/plants/list" ? { plants: list, photo_meta: meta } : undefined);
    const element = document.createElement("smart-plants-panel");
    element.hass = rig.hass; document.body.append(element);
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector("smart-plants-overview")?.shadowRoot?.querySelectorAll("sp-plant-photo")).toHaveLength(list.length));
    await settle(element);
    return element;
  }
  const photos = (panel: HTMLElement) => [...panel.shadowRoot!.querySelector("smart-plants-overview")!.shadowRoot!.querySelectorAll("sp-plant-photo")];

  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:card");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  it("are fetched as small copies only for the cards that come near the screen", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(blob())));
    const screen = manualVisibility();
    const panel = await open(plants.slice(0, 2), { [hex(100)]: { thumbhash: HASH } });
    expect(imageCalls()).toHaveLength(0);
    const [first, second] = photos(panel) as SpPlantPhoto[];
    expect([first!.thumbhash, second!.thumbhash]).toEqual([HASH, null]);
    screen.show(first!);
    await vi.waitFor(() => expect(imageCalls()).toHaveLength(1));
    expect(String(imageCalls()[0]![0])).toBe(`/api/smart_plants/plants/plt-1/image?v=${hex(100)}&size=thumb`);
    await vi.waitFor(() => expect(first!.shadowRoot!.querySelector("img")?.getAttribute("src")).toBe("blob:card"));
    expect(second!.shadowRoot!.querySelector("img")).toBeNull();
    // A refresh of the list keeps the loaded photo and fetches nothing more.
    await (panel as unknown as { _refresh(): Promise<void> })._refresh(); await settle(panel);
    expect(imageCalls()).toHaveLength(1);
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it("load at most four at a time and stop when a plant is opened", async () => {
    const responses: ReturnType<typeof deferred<Response>>[] = [];
    vi.stubGlobal("fetch", vi.fn(() => { const response = deferred<Response>(); responses.push(response); return response.promise; }));
    const screen = manualVisibility();
    const panel = await open(plants);
    screen.showAll();
    await vi.waitFor(() => expect(imageCalls()).toHaveLength(4));
    await settle(panel);
    expect(imageCalls()).toHaveLength(4);
    responses[0]!.resolve(new Response(blob()));
    await vi.waitFor(() => expect(imageCalls()).toHaveLength(5));
    const running = imageCalls().slice(1).map(([, init]) => init!.signal!);
    expect(running.some(signal => signal.aborted)).toBe(false);
    // The plant page cancels the card photos still loading or waiting and
    // gets its own, larger photo.
    (panel.shadowRoot!.querySelector("smart-plants-overview")!.shadowRoot!.querySelector<HTMLButtonElement>(".name"))!.click();
    await settle(panel);
    await vi.waitFor(() => expect(running.every(signal => signal.aborted)).toBe(true));
    await vi.waitFor(() => expect(imageCalls()).toHaveLength(6));
    expect(String(imageCalls()[5]![0])).toMatch(/&size=thumb2x$/);
    await flush();
    expect(imageCalls()).toHaveLength(6);
  });

  it("load once the connection is back for cards that came near the screen meanwhile", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(blob())));
    const screen = manualVisibility();
    const rig = harness(plants.slice(0, 1));
    const element = document.createElement("smart-plants-panel");
    element.hass = rig.hass; document.body.append(element);
    await vi.waitFor(() => expect(photos(element)).toHaveLength(1)); await settle(element);
    rig.events.get("disconnected")!(); await settle(element);
    screen.show(photos(element)[0]!); await flush();
    expect(imageCalls()).toHaveLength(0);
    rig.events.get("ready")!();
    await vi.waitFor(() => expect(imageCalls()).toHaveLength(1));
    await vi.waitFor(() => expect(photos(element)[0]!.shadowRoot!.querySelector("img")?.getAttribute("src")).toBe("blob:card"));
  });

  it("load again after Home Assistant hands over a new connection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(blob())));
    const screen = manualVisibility();
    const element = await open(plants.slice(0, 1));
    screen.showAll();
    await vi.waitFor(() => expect(photos(element)[0]!.shadowRoot!.querySelector("img")).not.toBeNull());
    expect(imageCalls()).toHaveLength(1);
    element.hass = { ...element.hass!, connection: harness(plants.slice(0, 1)).hass.connection };
    await vi.waitFor(() => expect(imageCalls()).toHaveLength(2));
    await vi.waitFor(() => expect(photos(element)[0]!.shadowRoot!.querySelector("img")).not.toBeNull());
  });

  it("are not downloaded again for a new access token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(blob())));
    const screen = manualVisibility();
    const element = await open(plants.slice(0, 2));
    screen.showAll();
    await vi.waitFor(() => expect(imageCalls()).toHaveLength(2));
    await vi.waitFor(() => expect(Object.keys((element as unknown as { _thumbnails: object })._thumbnails)).toHaveLength(2));
    element.hass = { ...element.hass!, auth: { accessToken: "rotated" } }; await settle(element);
    await (element as unknown as { _refresh(): Promise<void> })._refresh(); await settle(element);
    expect(imageCalls()).toHaveLength(2);
    expect(photos(element).every(photo => photo.shadowRoot!.querySelector("img"))).toBe(true);
  });
});
