// A photo download that failed is tried again on a later update, after a wait
// that starts here and doubles each time (30 s, 1, 2, 4 min), with this many
// attempts in all until the connection to Home Assistant comes back. The
// dashboard card and the panel overview thumbnails share these limits.
export const PHOTO_RETRY_FIRST_MS = 30_000;
export const PHOTO_MAX_ATTEMPTS = 5;

// When the next attempt may start after `attempts` failed ones, or null when
// none is left.
export function photoRetryAt(attempts: number, now = Date.now()): number | null {
  if (attempts >= PHOTO_MAX_ATTEMPTS) return null;
  return now + PHOTO_RETRY_FIRST_MS * 2 ** (attempts - 1);
}
