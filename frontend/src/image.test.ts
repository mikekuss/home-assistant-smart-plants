import { afterEach, describe, expect, it, vi } from "vitest";
import { IMAGE_UPLOAD_MAX_BYTES, headerSize, imageAccept, prepareImage, validateImage } from "./image.js";
import { pngFile } from "./test-helpers.js";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
// An <img> element that loads with the given size, or fails without one.
function stubImage(size?: { width: number; height: number }) {
  class FakeImage {
    onload: (() => void) | null = null; onerror: (() => void) | null = null; naturalWidth = size?.width ?? 0; naturalHeight = size?.height ?? 0;
    set src(_url: string) { queueMicrotask(() => (size ? this.onload : this.onerror)?.()); }
  }
  vi.stubGlobal("Image", FakeImage);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:photo"); vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
}
const jpegFile = (bytes: number, name = "IMG_0001.jpg") => {
  const data = new Uint8Array(bytes); data.set([0xff, 0xd8, 0xff]);
  return new File([data], name, { type: "image/jpeg" });
};
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
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("private filename and path"); })); stubImage();
    await expect(validateImage(pngFile())).rejects.toThrow("could not be decoded");
  });
  it("decodes with an <img> element when createImageBitmap refuses the photo", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("out of memory"); })); stubImage({ width: 1600, height: 1200 });
    await expect(validateImage(pngFile())).resolves.toEqual({ format: "image/png", bytes: 12, width: 1600, height: 1200 });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
  });
});
describe("scaling photos before upload", () => {
  // Fakes the canvas encoder: `produce` gives the type and byte size of each
  // encoded file from the requested type, quality and canvas size.
  // `fills` records the colour and area of every background fill.
  function canvas(produce: (type: string, quality: number, width: number, height: number) => { type: string; size: number }) {
    const drawImage = vi.fn(); const encoded: [string, number, number][] = []; const canvases = new Set<HTMLCanvasElement>();
    const fills: [string, number, number, number, number][] = [];
    const context = { drawImage, fillStyle: "", fillRect: vi.fn((x: number, y: number, w: number, h: number) => { fills.push([context.fillStyle, x, y, w, h]); }) };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, done: BlobCallback, type?: string, quality?: number) {
      canvases.add(this); encoded.push([type ?? "", quality ?? 0, Math.max(this.width, this.height)]);
      const { type: produced, size } = produce(type ?? "", quality ?? 0, this.width, this.height);
      done(new Blob([new Uint8Array(size)], { type: produced }));
    });
    return { drawImage, encoded, fills, fillRect: context.fillRect, canvases };
  }
  // About 0.6 bytes per pixel at the best quality, like a detailed photo.
  const detailed = () => canvas((type, quality, width, height) => ({ type, size: Math.round(width * height * quality * 0.7) }));
  it("returns a file that already fits unchanged without drawing it", async () => {
    const close = vi.fn(); vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 2048, height: 1536, close }))); const { drawImage } = detailed();
    const file = pngFile(); await expect(prepareImage(file)).resolves.toBe(file);
    expect(drawImage).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledOnce();
  });
  it("passes a photo up to the upload limit through as it is", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1600, height: 1200, close: vi.fn() }))); const { encoded } = detailed();
    const file = jpegFile(IMAGE_UPLOAD_MAX_BYTES); await expect(prepareImage(file)).resolves.toBe(file);
    expect(encoded).toEqual([]);
  });
  it("re-encodes a photo that fits 5 MiB but not the upload limit to at most 950 KB", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1600, height: 1200, close: vi.fn() }))); const { encoded } = detailed();
    const file = jpegFile(1_400_000);
    const result = await prepareImage(file);
    expect(result).not.toBe(file); expect(result.type).toBe("image/webp");
    expect(result.size).toBeGreaterThan(0); expect(result.size).toBeLessThanOrEqual(950 * 1024);
    // 0.85 and 0.75 are still too large; the photo keeps its size.
    expect(encoded).toEqual([["image/webp", 0.85, 1600], ["image/webp", 0.75, 1600], ["image/webp", 0.65, 1600]]);
  });
  it("scales a phone photo to 2048 pixels on the longer side, keeps the aspect ratio and uses the EXIF orientation", async () => {
    const close = vi.fn(); const decode = vi.fn(async () => ({ width: 3000, height: 4000, close })); vi.stubGlobal("createImageBitmap", decode);
    const { drawImage, encoded } = canvas(type => ({ type, size: 1000 }));
    const result = await prepareImage(jpegFile(12));
    expect(decode).toHaveBeenCalledWith(expect.any(File), { imageOrientation: "from-image" });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1536, 2048);
    expect(encoded).toEqual([["image/webp", 0.85, 2048]]); expect(result.name).toBe("IMG_0001.webp"); expect(result.type).toBe("image/webp"); expect(close).toHaveBeenCalledOnce();
  });
  it("lowers the quality first, then the size, until the photo fits", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 8000, height: 6000, close: vi.fn() }))); const { drawImage, encoded } = detailed();
    const result = await prepareImage(jpegFile(12));
    expect(encoded).toEqual([
      ["image/webp", 0.85, 2048], ["image/webp", 0.75, 2048], ["image/webp", 0.65, 2048], ["image/webp", 0.55, 2048],
      ["image/webp", 0.85, 1600], ["image/webp", 0.75, 1600], ["image/webp", 0.65, 1600],
    ]);
    expect(drawImage.mock.calls.map(call => call.slice(3))).toEqual([[2048, 1536], [1600, 1200]]);
    expect(result.size).toBeLessThanOrEqual(IMAGE_UPLOAD_MAX_BYTES);
  });
  it("keeps the transparency of a photo encoded as WebP", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() }))); const { fillRect } = canvas(type => ({ type, size: 1000 }));
    await expect(prepareImage(pngFile())).resolves.toHaveProperty("type", "image/webp");
    expect(fillRect).not.toHaveBeenCalled();
  });
  it("releases the canvas memory once the photo is encoded or refused", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));
    let size = 1000; const { canvases } = canvas(type => ({ type, size }));
    await prepareImage(jpegFile(12));
    size = IMAGE_UPLOAD_MAX_BYTES + 1;
    await expect(prepareImage(jpegFile(12))).rejects.toThrow("couldn't be made small enough to upload");
    expect(canvases.size).toBe(2);
    for (const used of canvases) expect([used.width, used.height]).toEqual([0, 0]);
  });
  it("says the photo couldn't be made small enough when nothing fits", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));
    const { encoded } = canvas(type => ({ type, size: IMAGE_UPLOAD_MAX_BYTES + 1 }));
    await expect(prepareImage(jpegFile(12))).rejects.toThrow("This photo couldn't be made small enough to upload");
    expect(encoded.map(([, quality, longest]) => [quality, longest])).toEqual(
      [2048, 1600, 1280].flatMap(longest => [0.85, 0.75, 0.65, 0.55].map(quality => [quality, longest])));
  });
  it("tries the qualities once for a photo already smaller than the size steps", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1000, height: 800, close: vi.fn() })));
    const { encoded } = canvas(type => ({ type, size: IMAGE_UPLOAD_MAX_BYTES + 1 }));
    await expect(prepareImage(jpegFile(2_000_000))).rejects.toThrow("couldn't be made small enough to upload");
    expect(encoded.map(([, quality, longest]) => [quality, longest])).toEqual([[0.85, 1000], [0.75, 1000], [0.65, 1000], [0.55, 1000]]);
  });
  it("falls back to JPEG for good when the browser returns PNG for WebP", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));
    const { encoded, drawImage, fills, fillRect } = canvas((type, quality) => ({ type: type === "image/webp" ? "image/png" : type, size: quality > 0.8 ? IMAGE_UPLOAD_MAX_BYTES + 1 : 1000 }));
    const result = await prepareImage(pngFile());
    expect(encoded.map(([type, quality]) => [type, quality])).toEqual([["image/webp", 0.85], ["image/jpeg", 0.85], ["image/jpeg", 0.75]]);
    expect(result.name).toBe("image.jpg"); expect(result.type).toBe("image/jpeg");
    // The photo is drawn again on white for JPEG, which has no transparency.
    expect(fills).toEqual([["#fff", 0, 0, 2048, 1536]]); expect(drawImage).toHaveBeenCalledTimes(2);
    expect(fillRect.mock.invocationCallOrder[0]!).toBeGreaterThan(drawImage.mock.invocationCallOrder[0]!);
    expect(fillRect.mock.invocationCallOrder[0]!).toBeLessThan(drawImage.mock.invocationCallOrder[1]!);
  });
  it("goes straight to JPEG where the browser can't encode WebP", async () => {
    vi.resetModules();
    const probe = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,");
    const fresh = await import("./image.js");
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));
    const { encoded, drawImage, fills, fillRect } = canvas((type, quality) => ({ type, size: quality > 0.8 ? IMAGE_UPLOAD_MAX_BYTES + 1 : 1000 }));
    const result = await fresh.prepareImage(pngFile());
    expect(encoded.map(([type]) => type)).toEqual(["image/jpeg", "image/jpeg"]); expect(result.type).toBe("image/jpeg");
    // A transparent PNG gets a white background instead of a black one.
    expect(fills).toEqual([["#fff", 0, 0, 2048, 1536]]); expect(drawImage).toHaveBeenCalledOnce();
    expect(fillRect.mock.invocationCallOrder[0]!).toBeLessThan(drawImage.mock.invocationCallOrder[0]!);
    // The browser is asked once per page.
    await fresh.prepareImage(pngFile());
    expect(probe).toHaveBeenCalledOnce(); expect(probe).toHaveBeenCalledWith("image/webp");
  });
  it("accepts files above 5 MiB for scaling but refuses more than 64 megapixels", async () => {
    const close = vi.fn(); vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 9000, height: 8000, close })));
    await expect(prepareImage(pngFile())).rejects.toThrow("more than 64 megapixels"); expect(close).toHaveBeenCalledOnce();
    const large = new File([new Uint8Array(40 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
    await expect(prepareImage(large)).rejects.toThrow("up to 40 MiB");
  });
  it("scales a photo that createImageBitmap refuses through an <img> element", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("out of memory"); })); stubImage({ width: 8160, height: 6120 });
    const { drawImage } = canvas(type => ({ type, size: 1000 }));
    const result = await prepareImage(jpegFile(12));
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1536); expect(result.type).toBe("image/webp");
  });
});
describe("pixel size from the file header", () => {
  const ascii = (text: string) => [...text].map(c => c.charCodeAt(0));
  const be16 = (n: number) => [n >> 8, n & 255]; const be32 = (n: number) => [n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  const le16 = (n: number) => [n & 255, n >> 8]; const le24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];
  const le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, n >>> 24];
  const file = (bytes: number[], type: string, padding = 0) => new File([new Uint8Array([...bytes, ...new Array<number>(padding).fill(0)])], "photo", { type });
  // EXIF segments, a quantization table and a Huffman table come before the frame header.
  // `beforeFrame` goes right before the frame header's marker.
  const jpeg = (width: number, height: number, sof = 0xc0, exifBytes = 30, exifSegments = 1, beforeFrame: number[] = []) => file([
    0xff, 0xd8, ...Array.from({ length: exifSegments }, () => [0xff, 0xe1, ...be16(exifBytes + 2), ...new Array<number>(exifBytes).fill(0x45)]).flat(),
    0xff, 0xdb, ...be16(4), 0, 0, 0xff, 0xc4, ...be16(4), 0, 0, ...beforeFrame,
    0xff, sof, ...be16(17), 8, ...be16(height), ...be16(width), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
  ], "image/jpeg", 16);
  const png = (width: number, height: number) => file([137, 80, 78, 71, 13, 10, 26, 10, ...be32(13), ...ascii("IHDR"), ...be32(width), ...be32(height), 8, 2, 0, 0, 0], "image/png", 16);
  const riff = (chunk: string, data: number[]) => file([...ascii("RIFF"), ...le32(100), ...ascii("WEBP"), ...ascii(chunk), ...le32(data.length), ...data], "image/webp", 16);
  const vp8 = (width: number, height: number) => riff("VP8 ", [0x10, 0x02, 0x00, 0x9d, 0x01, 0x2a, ...le16(width), ...le16(height)]);
  const vp8l = (width: number, height: number) => riff("VP8L", [0x2f, ...le32((width - 1) | ((height - 1) << 14))]);
  const vp8x = (width: number, height: number) => riff("VP8X", [0x10, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)]);
  it.each([
    ["JPEG baseline", jpeg(4000, 3000)], ["JPEG progressive", jpeg(4000, 3000, 0xc2)], ["JPEG arithmetic", jpeg(4000, 3000, 0xc9)],
    ["PNG", png(4000, 3000)], ["WebP lossy", vp8(4000, 3000)], ["WebP lossless", vp8l(4000, 3000)], ["WebP extended", vp8x(4000, 3000)],
  ])("reads %s", async (_name, photo) => {
    await expect(headerSize(photo, photo.type)).resolves.toEqual({ width: 4000, height: 3000 });
  });
  it.each([
    ["fill bytes", [0xff, 0xff]], ["a restart marker", [0xff, 0xd3]], ["a TEM marker", [0xff, 0x01]],
  ])("skips %s before the JPEG frame header", async (_name, bytes) => {
    await expect(headerSize(jpeg(4000, 3000, 0xc0, 30, 1, bytes), "image/jpeg")).resolves.toEqual({ width: 4000, height: 3000 });
  });
  it("skips fill bytes before the first JPEG segment", async () => {
    const bytes = new Uint8Array(await jpeg(4000, 3000).arrayBuffer());
    const filled = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xff, ...bytes.subarray(2)])], "photo", { type: "image/jpeg" });
    await expect(headerSize(filled, "image/jpeg")).resolves.toEqual({ width: 4000, height: 3000 });
  });
  it("finds the JPEG frame header behind a large EXIF segment", async () => {
    await expect(headerSize(jpeg(8160, 6120, 0xc0, 60_000), "image/jpeg")).resolves.toEqual({ width: 8160, height: 6120 });
  });
  it.each([
    ["no frame header within the first 256 KiB", jpeg(4000, 3000, 0xc0, 65_000, 5)],
    ["garbage after the start marker", file([0xff, 0xd8, 0x12, 0x34, 0x56, 0x78], "image/jpeg", 40)],
    ["a truncated frame header", file([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0x0b], "image/jpeg")],
    ["a scan before any frame header", file([0xff, 0xd8, 0xff, 0xda, 0, 4, 0, 0], "image/jpeg", 40)],
    ["a zero JPEG height", jpeg(4000, 0)],
    ["a truncated PNG", file([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, ...ascii("IHDR"), 0, 0], "image/png")],
    ["a PNG without IHDR first", file([137, 80, 78, 71, 13, 10, 26, 10, ...be32(13), ...ascii("tEXt"), ...be32(1), ...be32(1)], "image/png")],
    ["a lossy WebP without its start code", riff("VP8 ", [0x10, 0x02, 0x00, 0, 0, 0, ...le16(1), ...le16(1)])],
    ["an unknown WebP chunk", riff("ALPH", new Array<number>(10).fill(0))],
  ])("falls back to the decoded size for %s", async (_name, photo) => {
    await expect(headerSize(photo, photo.type)).resolves.toBeNull();
  });
  it("skips HEIC photos", async () => {
    await expect(headerSize(file([0, 0, 0, 24, ...ascii("ftypheic")], "image/heic", 40), "image/heic")).resolves.toBeNull();
  });
  it.each([["JPEG", jpeg(10000, 8000)], ["PNG", png(10000, 8000)], ["WebP lossy", vp8(10000, 8000)], ["WebP lossless", vp8l(10000, 8000)], ["WebP extended", vp8x(10000, 8000)]])(
    "refuses a %s over 64 megapixels before decoding it", async (_name, photo) => {
      const decode = vi.fn(); vi.stubGlobal("createImageBitmap", decode);
      await expect(prepareImage(photo)).rejects.toThrow("more than 64 megapixels");
      expect(decode).not.toHaveBeenCalled();
    });
  it("decodes a photo whose header is within the limit or unreadable, and checks the decoded size", async () => {
    const close = vi.fn(); const decode = vi.fn(async () => ({ width: 9000, height: 8000, close })); vi.stubGlobal("createImageBitmap", decode);
    await expect(prepareImage(jpeg(8000, 8000))).rejects.toThrow("more than 64 megapixels");
    await expect(prepareImage(file([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00], "image/jpeg", 40))).rejects.toThrow("more than 64 megapixels");
    expect(decode).toHaveBeenCalledTimes(2); expect(close).toHaveBeenCalledTimes(2);
  });
});
describe("HEIC photos from an iPhone", () => {
  const ascii = (text: string) => [...text].map(c => c.charCodeAt(0));
  const heicFile = (brand = "heic", type = "image/heic", name = "IMG_0001.HEIC") =>
    new File([new Uint8Array([0, 0, 0, 24, ...ascii("ftyp"), ...ascii(brand), 0, 0, 0, 0])], name, { type });
  function canvas() {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((done: BlobCallback, type?: string) => { done(new Blob([new Uint8Array(100)], { type: type ?? "" })); });
    return drawImage;
  }
  it("always re-encodes a HEIC photo, even one that already fits the upload limits", async () => {
    const close = vi.fn(); vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1200, height: 1600, close }))); const drawImage = canvas();
    const result = await prepareImage(heicFile());
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1200, 1600);
    expect(result.type).toBe("image/webp"); expect(result.name).toBe("IMG_0001.webp"); expect(close).toHaveBeenCalledOnce();
  });
  it.each([["heix", "image/heic", "a.heic"], ["mif1", "image/heif", "a.heif"], ["msf1", "image/heif", "a.heif"], ["heic", "", "IMG_0002.HEIC"], ["mif1", "", "a.heif"]])(
    "accepts brand %s with type %j and name %s", async (brand, type, name) => {
      vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() }))); canvas();
      await expect(prepareImage(heicFile(brand, type, name))).resolves.toBeInstanceOf(File);
    });
  it("says the browser can't read HEIC when decoding fails", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("unsupported"); })); stubImage();
    await expect(prepareImage(heicFile())).rejects.toThrow("This browser can't read HEIC photos");
  });
  it("keeps the generic decode message for other formats", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("unsupported"); })); stubImage();
    await expect(prepareImage(pngFile())).rejects.toThrow("could not be decoded");
  });
  it("rejects HEIC content under another type and other content under a HEIC type before decoding", async () => {
    const decode = vi.fn(); vi.stubGlobal("createImageBitmap", decode);
    await expect(prepareImage(heicFile("heic", "image/jpeg", "a.jpg"))).rejects.toThrow("content does not match");
    await expect(prepareImage(heicFile("avif"))).rejects.toThrow("content does not match");
    await expect(prepareImage(new File([new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0])], "a.heic", { type: "image/heic" }))).rejects.toThrow("content does not match");
    await expect(prepareImage(heicFile("heic", "", "photo.bin"))).rejects.toThrow("up to 40 MiB");
    expect(decode).not.toHaveBeenCalled();
  });
  it("never passes HEIC on to the upload check", async () => {
    await expect(validateImage(heicFile())).rejects.toThrow("JPEG, PNG or WebP image up to 5 MiB");
  });
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15", 5, false],
    ["Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15", 5, false],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15", 5, false],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15", 0, true],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36", 0, true],
  ])("offers HEIC in the file picker for %s with %i touch points: %s", (userAgent, maxTouchPoints, heic) => {
    const accept = imageAccept({ userAgent, maxTouchPoints }).split(",");
    expect(accept).toEqual(expect.arrayContaining(["image/jpeg", "image/png", "image/webp"]));
    expect(accept.includes("image/heic")).toBe(heic); expect(accept.includes(".heic")).toBe(heic);
  });
});
