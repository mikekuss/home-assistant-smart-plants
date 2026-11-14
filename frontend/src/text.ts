// Text limits count Unicode code points, as the backend does. JavaScript's
// `length` counts UTF-16 units, so a character outside the Basic Multilingual
// Plane (most emoji) would count twice and a valid stored text would look too
// long to the panel.
export function charCount(value: string): number {
  let count = 0;
  for (const _char of value) count++;
  return count;
}

// Whether `value` has at most `max` characters. A UTF-16 length within the
// limit is always within it; one over twice the limit never is.
export const withinChars = (value: string, max: number): boolean => value.length <= max || (value.length <= max * 2 && charCount(value) <= max);

// The first `max` characters of `value`, never splitting a character.
export const sliceChars = (value: string, max: number): string => charCount(value) <= max ? value : Array.from(value).slice(0, max).join("");

// A native `maxlength` counts UTF-16 units. Twice the character limit lets
// every text the backend accepts be typed or kept; the save checks count
// characters and name the limit.
export const inputMaxLength = (max: number): number => max * 2;

// The longest species search the backend accepts, in characters.
export const SPECIES_QUERY_MAX = 100;
