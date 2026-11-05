// Short fades for content that replaces a loading placeholder. They run once,
// on that change only, never on a refresh of content already shown, and not
// at all when the user asked for reduced motion.
export const FADE_MS = 180;

export function reducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function fadeIn(element: Element | null | undefined, duration = FADE_MS): void {
  if (!element || typeof element.animate !== "function" || reducedMotion()) return;
  element.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: "ease-out" });
}
