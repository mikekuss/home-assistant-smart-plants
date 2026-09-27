import { ENGLISH } from "./localize.js";
import type { Localizer } from "./localize.js";

// Local-only preflight. The server remains authoritative for decoding and sanitization.
export interface ImageInfo { format: string; bytes: number; width: number; height: number }
export async function validateImage(file: File, l: Localizer = ENGLISH): Promise<ImageInfo> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new Error(l.t("image_error.type_or_size"));
  }
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer()); }
  catch { throw new Error(l.t("image_error.unreadable")); }
  const prefix = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const format = prefix(0xff, 0xd8, 0xff) ? "image/jpeg" : prefix(0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10) ? "image/png" :
    prefix(82, 73, 70, 70) && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80 ? "image/webp" : null;
  if (format !== file.type) throw new Error(l.t("image_error.signature"));
  let width: number; let height: number;
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width; height = bitmap.height; bitmap.close();
    } else {
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("decode")); image.src = url; });
        width = image.naturalWidth; height = image.naturalHeight;
      } finally { URL.revokeObjectURL(url); }
    }
  } catch { throw new Error(l.t("image_error.decode")); }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 2048 || height > 2048) throw new Error(l.t("image_error.dimensions"));
  return { format, bytes: file.size, width, height };
}
