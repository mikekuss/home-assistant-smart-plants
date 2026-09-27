import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// Build the panel as a single self-contained ES module so HA can serve it
// directly from custom_components/smart_plants/frontend/. Everything is
// inlined (no code-split chunks, no separate CSS file) to keep the HACS
// install artifact-layout check simple.
export default defineConfig({
  build: {
    outDir: fileURLToPath(
      new URL(
        "../custom_components/smart_plants/frontend",
        import.meta.url,
      ),
    ),
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL("./src/panel.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => "smart-plants-panel.js",
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
});
