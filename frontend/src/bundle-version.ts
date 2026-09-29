// Home Assistant loads the panel from a module URL whose `v` query value names
// the bundle it serves (manifest version plus a hash of the file). A browser
// keeps a custom element definition until the page reloads, so after an update
// and restart an open tab keeps running the old bundle. Comparing the running
// bundle's own `v` with the one the backend reports tells the panel to ask for
// a reload.

export function loadedBundleVersion(moduleUrl: string): string | null {
  try {
    return new URL(moduleUrl).searchParams.get("v") || null;
  } catch {
    return null;
  }
}

// Only a known running version that differs from a known served version counts;
// development and test builds load without a `v` and never show the banner.
export function bundleOutdated(loaded: string | null, served: string | undefined): boolean {
  return !!loaded && !!served && loaded !== served;
}
