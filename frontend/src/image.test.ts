import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareImage, validateImage } from "./image.js";
import { pngFile } from "./test-helpers.js";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("local image preflight", () => {
  it("rejects a MIME-spoofed image before decoding", async () => {
    const decode = vi.fn(); vi.stubGlobal("createImageBitmap", decode);
    await expect(validateImage(new File(["<svg></svg>"], "fake.png", { type: "image/png" }))).rejects.toThrow("content does not match");
    expect(decode).not.toHaveBeenCalled();
  });
  it.each([NaN, Infinity, 0, 2049, 0.5])("rejects invalid decoded dimension %s and releases the bitmap", async width => {
    const close = vi.fn(); vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width, height: 100, close })));
    await expect(validateImage(pngFile())).rejects.toThrow("dimensions"); expect(close).toHaveBeenCalledOnce();
  });
  it("accepts the boundary and releases decoded image resources", async () => {
    const close = vi.fn(); vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 2048, height: 2048, close })));
    await expect(validateImage(pngFile())).resolves.toEqual({ format: "image/png", bytes: 12, width: 2048, height: 2048 }); expect(close).toHaveBeenCalledOnce();
  });
  it("sanitizes browser decoder errors", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("private filename and path"); }));
    await expect(validateImage(pngFile())).rejects.toThrow("could not be decoded");
  });
});
describe("scaling large photos before upload", () => {
  function canvas(types: string[], size = 1000) {
    const drawImage = vi.fn(); const encoded: [string, number][] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, done: BlobCallback, type?: string, quality?: number) {
      encoded.push([type ?? "", quality ?? 0]); const produced = types.shift() ?? "image/png";
      done(new Blob([new Uint8Array(size)], { type: produced }));
    });
    return { drawImage, encoded };
  }
  it("returns a file that already fits unchanged without drawing it", async () => {
    const close = vi.fn(); vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 2048, height: 1536, close }))); const { drawImage } = canvas([]);
    const file = pngFile(); await expect(prepareImage(file)).resolves.toBe(file);
    expect(drawImage).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledOnce();
  });
  it("scales a phone photo to 2048 pixels on the longer side, keeps the aspect ratio and uses the EXIF orientation", async () => {
    const close = vi.fn(); const decode = vi.fn(async () => ({ width: 3000, height: 4000, close })); vi.stubGlobal("createImageBitmap", decode);
    const { drawImage, encoded } = canvas(["image/webp"]);
    const result = await prepareImage(new File([new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0])], "IMG_0001.jpg", { type: "image/jpeg" }));
    expect(decode).toHaveBeenCalledWith(expect.any(File), { imageOrientation: "from-image" });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1536, 2048);
    expect(encoded).toEqual([["image/webp", 0.9]]); expect(result.name).toBe("IMG_0001.webp"); expect(result.type).toBe("image/webp"); expect(close).toHaveBeenCalledOnce();
  });
  it("falls back to JPEG when the browser cannot encode WebP", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));
    const { encoded } = canvas(["image/png", "image/jpeg"]);
    const result = await prepareImage(pngFile());
    expect(encoded.map(([type]) => type)).toEqual(["image/webp", "image/jpeg"]); expect(result.name).toBe("image.jpg"); expect(result.type).toBe("image/jpeg");
  });
  it("accepts files above 5 MiB for scaling but refuses more than 64 megapixels", async () => {
    const close = vi.fn(); vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 9000, height: 8000, close })));
    await expect(prepareImage(pngFile())).rejects.toThrow("more than 64 megapixels"); expect(close).toHaveBeenCalledOnce();
    const large = new File([new Uint8Array(40 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
    await expect(prepareImage(large)).rejects.toThrow("up to 40 MiB");
  });
  it("lowers the quality until the result fits and reports when it never does", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));
    const { encoded } = canvas(["image/webp", "image/webp", "image/webp"], 6 * 1024 * 1024);
    await expect(prepareImage(pngFile())).rejects.toThrow("could not be scaled down");
    expect(encoded.map(([, quality]) => quality)).toEqual([0.9, 0.8, 0.65]);
  });
});
