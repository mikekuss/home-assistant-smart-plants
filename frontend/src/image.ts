import { ENGLISH } from "./localize.js";
import type { Localizer } from "./localize.js";

// Local-only preflight. The server remains authoritative for decoding and sanitization.
export interface ImageInfo { format: string; bytes: number; width: number; height: number }
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_DIMENSION = 2048;
// Reverse proxies in front of Home Assistant often refuse request bodies over
// 1 MB (the NGINX add-on does by default), so every photo upload stays below
// this, even though the server itself accepts up to IMAGE_MAX_BYTES.
export const IMAGE_UPLOAD_MAX_BYTES = 950 * 1024;
// Phone cameras produce photos far above the upload limits. Such files are
// scaled down in the browser before upload; this bounds what is decoded.
export const IMAGE_MAX_INPUT_BYTES = 40 * 1024 * 1024;
const IMAGE_MAX_INPUT_PIXELS = 64_000_000;
// How a photo is made small enough: at each longer-side size in turn, every
// quality from best to smallest until the file fits IMAGE_UPLOAD_MAX_BYTES.
export const UPLOAD_DIMENSIONS = [IMAGE_MAX_DIMENSION, 1600, 1280] as const;
export const UPLOAD_QUALITIES = [0.85, 0.75, 0.65, 0.55] as const;
// JPEG files can carry large EXIF and APP segments before the frame header.
const JPEG_HEADER_BYTES = 256 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
// iPhone photos. Only browsers that decode HEIC (Safari) can use them, and
// prepareImage always re-encodes them, so the backend never receives HEIC.
const HEIC_TYPES = ["image/heic", "image/heif"];
const HEIC_BRANDS = ["heic", "heix", "mif1", "msf1"];
// Without a HEIC codec the OS may report no type, or a generic one, for a .heic file.
const isHeic = (file: File) => HEIC_TYPES.includes(file.type) || ((file.type === "" || file.type === "application/octet-stream") && /\.hei[cf]$/i.test(file.name));
// iPadOS reports itself as a Mac; a touch screen tells them apart.
const isIos = (nav: Pick<Navigator, "userAgent" | "maxTouchPoints">) =>
  /iPhone|iPad|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
// iOS and iPadOS convert a HEIC photo to JPEG when the file input doesn't list HEIC, and
// Safari before 17 can't decode HEIC, so HEIC is only offered on other systems, such as a
// Mac that received iPhone photos. The extensions keep HEIC files selectable where the OS
// has no type for them.
export const imageAccept = (nav: Pick<Navigator, "userAgent" | "maxTouchPoints"> = navigator): string =>
  (isIos(nav) ? TYPES : [...TYPES, ...HEIC_TYPES, ".heic", ".heif"]).join(",");

// Some file pickers report no type or a generic one (WebKit on Windows does for
// .webp), and some systems use the non-standard image/jpg. Such a file is taken
// for what its first bytes say, if that is JPEG, PNG or WebP.
const UNREPORTED_TYPES = ["", "application/octet-stream", "image/jpg"];

// Returns the format the file's first bytes show. A file whose reported type
// is a real image type must match its content.
async function sniff(file: File, maxBytes: number, l: Localizer, allowHeic: boolean): Promise<string> {
  const heic = allowHeic && isHeic(file);
  const unreported = !heic && UNREPORTED_TYPES.includes(file.type);
  if ((!heic && !unreported && !TYPES.includes(file.type)) || file.size === 0 || file.size > maxBytes) {
    throw new Error(l.t(maxBytes > IMAGE_MAX_BYTES ? "image_error.type_or_input_size" : "image_error.type_or_size"));
  }
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer()); }
  catch { throw new Error(l.t("image_error.unreadable")); }
  const prefix = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  const format = prefix(0xff, 0xd8, 0xff) ? "image/jpeg" : prefix(0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10) ? "image/png" :
    prefix(82, 73, 70, 70) && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80 ? "image/webp" :
    ascii(4, 8) === "ftyp" && HEIC_BRANDS.includes(ascii(8, 12)) ? "image/heic" : null;
  const expected = heic ? "image/heic" : unreported ? (format !== null && TYPES.includes(format) ? format : null) : file.type;
  if (format === null || format !== expected) throw new Error(l.t("image_error.signature"));
  return format;
}

// The pixel size the file header declares, read without decoding the image,
// or null when the header can't be read; the size after decoding is checked
// then. EXIF orientation may swap width and height, not their product.
export async function headerSize(file: File, format: string): Promise<{ width: number; height: number } | null> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(format)) return null;
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(await file.slice(0, format === "image/jpeg" ? JPEG_HEADER_BYTES : 30).arrayBuffer()); }
  catch { return null; }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start: number) => String.fromCharCode(...bytes.subarray(start, start + 4));
  const size = (width: number, height: number) => width > 0 && height > 0 ? { width, height } : null;
  if (format === "image/png") {
    return bytes.length >= 24 && ascii(12) === "IHDR" ? size(view.getUint32(16), view.getUint32(20)) : null;
  }
  if (format === "image/webp") {
    if (bytes.length < 30) return null;
    const u24 = (at: number) => view.getUint16(at, true) + (view.getUint8(at + 2) << 16);
    switch (ascii(12)) {
      case "VP8 ": // Lossy: a start code, then 14-bit width and height.
        return bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a ? size(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff) : null;
      case "VP8L": { // Lossless: a signature byte, then width - 1 and height - 1 in 14 bits each.
        if (bytes[20] !== 0x2f) return null;
        const bits = view.getUint32(21, true);
        return size((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
      }
      case "VP8X": // Extended: canvas width - 1 and height - 1 in 24 bits each.
        return size(u24(24) + 1, u24(27) + 1);
      default: return null;
    }
  }
  // JPEG: walk the segments up to the first frame header (SOF0 to SOF15
  // without DHT C4, JPG C8 and DAC CC); it holds height, then width.
  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1]!;
    if (marker === 0xff) { at += 1; continue; } // Fill byte.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { at += 2; continue; } // No length.
    if (marker === 0xd9 || marker === 0xda) return null; // End of image or start of scan.
    const length = view.getUint16(at + 2);
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return at + 9 <= bytes.length ? size(view.getUint16(at + 7), view.getUint16(at + 5)) : null;
    }
    at += 2 + length;
  }
  return null;
}

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(file: File, l: Localizer, heic = false): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      // Apply the EXIF orientation so portrait phone photos stay upright after scaling.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Some phones refuse very large photos here, and older Safari refuses
      // the options argument; an <img> element may still decode the file.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("decode")); image.src = url; });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => undefined };
  } catch { throw new Error(l.t(heic ? "image_error.heic_decode" : "image_error.decode")); }
  finally { URL.revokeObjectURL(url); }
}

const validSize = (width: number, height: number) => Number.isInteger(width) && Number.isInteger(height) && width >= 1 && height >= 1;

export async function validateImage(file: File, l: Localizer = ENGLISH): Promise<ImageInfo> {
  const format = await sniff(file, IMAGE_MAX_BYTES, l, false);
  const { width, height, release } = await decode(file, l);
  release();
  if (!validSize(width, height) || width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) throw new Error(l.t("image_error.dimensions"));
  return { format, bytes: file.size, width, height };
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => { canvas.toBlob(blob => resolve(blob), type, quality); });
}

// Safari can't encode WebP; its canvas returns PNG for it instead. A tiny
// canvas tells once per page, so such browsers go straight to JPEG.
let webpEncoding: boolean | undefined;
function canEncodeWebp(): boolean {
  if (webpEncoding === undefined) {
    try {
      const probe = document.createElement("canvas"); probe.width = 1; probe.height = 1;
      webpEncoding = probe.toDataURL("image/webp").startsWith("data:image/webp");
    } catch { webpEncoding = false; }
  }
  return webpEncoding;
}

// Returns a file that fits IMAGE_UPLOAD_MAX_BYTES and IMAGE_MAX_DIMENSION: the
// original when it already does, otherwise a scaled copy re-encoded as WebP
// (JPEG where the browser can't encode WebP), stepping down through
// UPLOAD_DIMENSIONS and UPLOAD_QUALITIES. HEIC photos are always re-encoded.
export async function prepareImage(file: File, l: Localizer = ENGLISH): Promise<File> {
  const format = await sniff(file, IMAGE_MAX_INPUT_BYTES, l, true);
  const heic = format === "image/heic";
  // Decoding a huge photo can run a phone out of memory, so the size the
  // header declares is checked first.
  const declared = await headerSize(file, format);
  if (declared && declared.width * declared.height > IMAGE_MAX_INPUT_PIXELS) throw new Error(l.t("image_error.too_many_pixels"));
  const { source, width, height, release } = await decode(file, l, heic);
  let canvas: HTMLCanvasElement | undefined;
  try {
    if (!validSize(width, height)) throw new Error(l.t("image_error.decode"));
    if (width * height > IMAGE_MAX_INPUT_PIXELS) throw new Error(l.t("image_error.too_many_pixels"));
    // A file that already fits goes up as it is, so a transparent PNG keeps
    // its transparency here even where the browser can only encode JPEG.
    // The server checks the upload's type against its content, so a file
    // reported without a usable type gets the type its bytes show.
    if (!heic && width <= IMAGE_MAX_DIMENSION && height <= IMAGE_MAX_DIMENSION && file.size <= IMAGE_UPLOAD_MAX_BYTES) {
      return file.type === format ? file : new File([file], file.name, { type: format, lastModified: file.lastModified });
    }
    const target = document.createElement("canvas"); canvas = target;
    let webp = canEncodeWebp(); let drawn = 0;
    for (const longest of UPLOAD_DIMENSIONS) {
      const scale = Math.min(1, longest / Math.max(width, height));
      // A photo already smaller than this step would come out the same again.
      if (Math.max(width, height) * scale === drawn) continue;
      drawn = Math.max(width, height) * scale;
      target.width = Math.max(1, Math.round(width * scale)); target.height = Math.max(1, Math.round(height * scale));
      const context = target.getContext("2d");
      if (!context) throw new Error(l.t("image_error.resize"));
      const draw = () => {
        // JPEG has no transparency, and the transparent parts of a PNG would
        // turn black in it, so a JPEG gets a white background. WebP keeps them.
        if (!webp) { context.fillStyle = "#fff"; context.fillRect(0, 0, target.width, target.height); }
        context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
        context.drawImage(source, 0, 0, target.width, target.height);
      };
      draw();
      for (const quality of UPLOAD_QUALITIES) {
        let blob = webp ? await encode(target, "image/webp", quality) : null;
        // Keep a PNG returned in place of WebP out of the upload.
        if (blob?.type !== "image/webp") {
          if (webp) { webp = false; draw(); }
          blob = await encode(target, "image/jpeg", quality);
        }
        if (!blob || !TYPES.includes(blob.type)) throw new Error(l.t("image_error.resize"));
        if (blob.size > 0 && blob.size <= IMAGE_UPLOAD_MAX_BYTES) {
          const extension = blob.type === "image/webp" ? "webp" : "jpg";
          return new File([blob], `${file.name.replace(/\.[^.]*$/, "") || "photo"}.${extension}`, { type: blob.type });
        }
      }
    }
    throw new Error(l.t("image_error.too_large_to_upload"));
  } finally {
    // Safari on iOS frees a canvas's memory late; a zero size releases it now.
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    release();
  }
}
