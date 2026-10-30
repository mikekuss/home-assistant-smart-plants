// The card picker's name and description, in the loader that every dashboard
// loads. They are copies of plant_card.name and plant_card.description, so the
// loader stays small without the full catalogs; a unit test keeps them equal.
export const PICKER_TEXT: Readonly<Record<string, { name: string; description: string }>> = {
  en: { name: "Smart Plants plant card", description: "One plant with its status, soil moisture, readings and a Watered button." },
  de: { name: "Smart Plants Pflanzenkarte", description: "Eine Pflanze mit Status, Bodenfeuchte, Messwerten und einer Schaltfläche „Gegossen“." },
};

export function pickerText(language: string | undefined): { name: string; description: string } {
  const base = (language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return PICKER_TEXT[base] ?? PICKER_TEXT.en!;
}
