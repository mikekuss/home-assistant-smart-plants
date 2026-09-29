import { ENGLISH } from "./localize.js";
import type { Localizer } from "./localize.js";

// Local-only preflight. The server remains authoritative for decoding and sanitization.
export interface ImageInfo { format: string; bytes: number; width: number; height: number }
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_DIMENSION = 2048;
// Phone cameras produce photos far above the upload limits. Such files are
// scaled down in the browser before upload; this bounds what is decoded.
export const IMAGE_MAX_INPUT_BYTES = 40 * 1024 * 1024;
const IMAGE_MAX_INPUT_PIXELS = 64_000_000;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

async function sniff(file: File, maxBytes: number, l: Localizer): Promise<string> {
  if (!TYPES.includes(file.type) || file.size === 0 || file.size > maxBytes) {
    throw new Error(l.t(maxBytes > IMAGE_MAX_BYTES ? "image_error.type_or_input_size" : "image_error.type_or_size"));
  }
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer()); }
  catch { throw new Error(l.t("image_error.unreadable")); }
  const prefix = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const format = prefix(0xff, 0xd8, 0xff) ? "image/jpeg" : prefix(0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10) ? "image/png" :
    prefix(82, 73, 70, 70) && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80 ? "image/webp" : null;
  if (format !== file.type) throw new Error(l.t("image_error.signature"));
  return format;
}

async function decode(file: File, l: Localizer): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  try {
    if (typeof createImageBitmap === "function") {
      // Apply the EXIF orientation so portrait phone photos stay upright after scaling.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("decode")); image.src = url; });
      return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => undefined };
    } finally { URL.revokeObjectURL(url); }
  } catch { throw new Error(l.t("image_error.decode")); }
}

const validSize = (width: number, height: number) => Number.isInteger(width) && Number.isInteger(height) && width >= 1 && height >= 1;

export async function validateImage(file: File, l: Localizer = ENGLISH): Promise<ImageInfo> {
  const format = await sniff(file, IMAGE_MAX_BYTES, l);
  const { width, height, release } = await decode(file, l);
  release();
  if (!validSize(width, height) || width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) throw new Error(l.t("image_error.dimensions"));
  return { format, bytes: file.size, width, height };
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => { canvas.toBlob(blob => resolve(blob), type, quality); });
}

// Returns a file that fits the upload limits: the original when it already
// does, otherwise a copy scaled to at most IMAGE_MAX_DIMENSION on its longer
// side and re-encoded (WebP where the browser can encode it, JPEG otherwise).
export async function prepareImage(file: File, l: Localizer = ENGLISH): Promise<File> {
  await sniff(file, IMAGE_MAX_INPUT_BYTES, l);
  const { source, width, height, release } = await decode(file, l);
  try {
    if (!validSize(width, height)) throw new Error(l.t("image_error.decode"));
    if (width * height > IMAGE_MAX_INPUT_PIXELS) throw new Error(l.t("image_error.too_many_pixels"));
    if (width <= IMAGE_MAX_DIMENSION && height <= IMAGE_MAX_DIMENSION && file.size <= IMAGE_MAX_BYTES) return file;
    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error(l.t("image_error.resize"));
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.8, 0.65]) {
      let blob = await encode(canvas, "image/webp", quality);
      // Browsers that cannot encode WebP silently return PNG instead.
      if (blob?.type !== "image/webp") blob = await encode(canvas, "image/jpeg", quality);
      if (!blob || !TYPES.includes(blob.type)) break;
      if (blob.size > 0 && blob.size <= IMAGE_MAX_BYTES) {
        const extension = blob.type === "image/webp" ? "webp" : "jpg";
        return new File([blob], `${file.name.replace(/\.[^.]*$/, "") || "photo"}.${extension}`, { type: blob.type });
      }
    }
    throw new Error(l.t("image_error.resize"));
  } finally { release(); }
}
