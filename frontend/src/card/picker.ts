// The card picker's name and description and the load error, in the loader
// that every dashboard loads. They are copies of plant_card.name,
// plant_card.description and plant_card.load_error, so the loader stays small
// without the full catalogs; a unit test keeps them equal.
interface LoaderText { name: string; description: string; load_error: string }
export const PICKER_TEXT: Readonly<Record<string, LoaderText>> = {
  en: { name: "Smart Plants plant card", description: "One plant with its status, soil moisture, readings and a Watered button.", load_error: "The plant card could not be loaded. Trying again shortly." },
  de: { name: "Smart Plants Pflanzenkarte", description: "Eine Pflanze mit Status, Bodenfeuchte, Messwerten und einer Schaltfläche „Gegossen“.", load_error: "Die Pflanzenkarte konnte nicht geladen werden. Gleich folgt ein neuer Versuch." },
};

export function pickerText(language: string | undefined): LoaderText {
  const base = (language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return PICKER_TEXT[base] ?? PICKER_TEXT.en!;
}
