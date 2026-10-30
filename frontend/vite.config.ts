import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// Three bundles, each a single self-contained ES module that HA serves directly
// from custom_components/smart_plants/frontend/: the admin panel (the default
// build), the dashboard card's small loader that every dashboard loads
// (`--mode card`) and the card content it imports on demand
// (`--mode card-full`). Everything else is inlined (no code-split chunks, no
// separate CSS file) to keep the HACS install artifact-layout check simple.
const ENTRIES: Record<string, { entry: string; file: string }> = {
  panel: { entry: "./src/panel.ts", file: "smart-plants-panel.js" },
  card: { entry: "./src/card/loader.ts", file: "smart-plants-card.js" },
  "card-full": { entry: "./src/card/plant-card.ts", file: "smart-plants-card-full.js" },
};

export default defineConfig(({ mode }) => {
  const bundle = ENTRIES[mode] ?? ENTRIES.panel!;
  return {
    build: {
      outDir: fileURLToPath(
        new URL(
          "../custom_components/smart_plants/frontend",
          import.meta.url,
        ),
      ),
      emptyOutDir: false,
      lib: {
        entry: fileURLToPath(new URL(bundle.entry, import.meta.url)),
        formats: ["es"],
        fileName: () => bundle.file,
      },
      rolldownOptions: {
        output: {
          codeSplitting: false,
          // Keep the @license headers of bundled dependencies (lit) in the
          // artifact; Vite strips legal comments by default when minifying.
          comments: { legal: true },
        },
      },
      target: "es2020",
      sourcemap: false,
      minify: "oxc",
    },
  };
});
