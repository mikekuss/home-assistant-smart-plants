import { afterEach, describe, expect, it, vi } from "vitest";
import { validateImage } from "./image.js";
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
