// Fails the CI build if the panel bundle is not present at its expected
// HACS install location. The manifest for the integration serves the file
// from custom_components/smart_plants/frontend/smart-plants-panel.js; if
// Vite ever drops that file the panel would silently 404 for every user.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const bundle = fileURLToPath(
  new URL(
    "../../custom_components/smart_plants/frontend/smart-plants-panel.js",
    import.meta.url,
  ),
);

if (!existsSync(bundle)) {
  console.error(
    `Smart Plants panel artifact missing: ${bundle}\n` +
      "Run `npm run build` in frontend/ before shipping.",
  );
  process.exit(1);
}

const stats = statSync(bundle);
if (stats.size === 0) {
  console.error(`Smart Plants panel artifact is empty: ${bundle}`);
  process.exit(1);
}

const source = readFileSync(bundle, "utf8");
const unresolvedImport = /(?:^|[;}])\s*import\s*(?:[({'"]|[\w*])/m;
if (unresolvedImport.test(source)) {
  console.error(`Smart Plants panel artifact contains an unresolved import: ${bundle}`);
  process.exit(1);
}
if (
  !source.includes("customElements.define") ||
  !source.includes("smart-plants-panel")
) {
  console.error(
    "Smart Plants panel artifact does not register smart-plants-panel",
  );
  process.exit(1);
}

try {
  execFileSync(process.execPath, ["--check", bundle], { stdio: "pipe" });
} catch (error) {
  console.error(`Smart Plants panel artifact is not valid JavaScript: ${error}`);
  process.exit(1);
}

// A successful validator should leave concise evidence in local and CI logs.
// eslint-disable-next-line no-console
console.log(
  `Smart Plants panel artifact OK (${stats.size} bytes, self-contained, custom element registered)`,
);
