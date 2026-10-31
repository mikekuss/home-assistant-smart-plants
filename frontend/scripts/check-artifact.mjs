// Fails the CI build if a bundle is not present at its expected HACS install
// location. The integration serves the panel from
// custom_components/smart_plants/frontend/smart-plants-panel.js and loads the
// dashboard card loader from smart-plants-card.js on every dashboard; the
// loader imports smart-plants-card-full.js next to it. If Vite ever dropped one
// of these files, the panel or the card would silently 404 for every user.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

// `dynamicImports` is how many `import(` calls the bundle may contain: only
// the loader imports the card content, everything else is self-contained.
const BUNDLES = [
  { file: "smart-plants-panel.js", element: "smart-plants-panel", dynamicImports: 0 },
  { file: "smart-plants-card.js", element: "smart-plants-plant-card", dynamicImports: 1 },
  { file: "smart-plants-card-full.js", element: "smart-plants-plant-card-content", dynamicImports: 0 },
];
// The loader runs in every frontend session, so it must stay small.
const LOADER_MAX_BYTES = 10_000;

const staticImport = /(?:^|[;}])\s*import\s*(?:[{'"]|[\w*])/m;
const dynamicImport = /\bimport\s*\(/g;
const evidence = [];

for (const { file, element, dynamicImports } of BUNDLES) {
  const bundle = fileURLToPath(new URL(`../../custom_components/smart_plants/frontend/${file}`, import.meta.url));
  if (!existsSync(bundle)) {
    console.error(`Smart Plants artifact missing: ${bundle}\nRun \`npm run build\` in frontend/ before shipping.`);
    process.exit(1);
  }
  const stats = statSync(bundle);
  if (stats.size === 0) {
    console.error(`Smart Plants artifact is empty: ${bundle}`);
    process.exit(1);
  }
  const source = readFileSync(bundle, "utf8");
  if (staticImport.test(source) || (source.match(dynamicImport)?.length ?? 0) !== dynamicImports) {
    console.error(`Smart Plants artifact contains an unresolved import: ${bundle}`);
    process.exit(1);
  }
  if (!source.includes("customElements.define") || !source.includes(element)) {
    console.error(`Smart Plants artifact ${file} does not register ${element}`);
    process.exit(1);
  }
  if (file === "smart-plants-card.js" && stats.size > LOADER_MAX_BYTES) {
    console.error(`Smart Plants card loader is ${stats.size} bytes; keep it under ${LOADER_MAX_BYTES}`);
    process.exit(1);
  }
  try {
    execFileSync(process.execPath, ["--check", bundle], { stdio: "pipe" });
  } catch (error) {
    console.error(`Smart Plants artifact ${file} is not valid JavaScript: ${error}`);
    process.exit(1);
  }
  evidence.push(`${file} ${stats.size} bytes`);
}

// A successful validator should leave concise evidence in local and CI logs.
// eslint-disable-next-line no-console
console.log(`Smart Plants artifacts OK (${evidence.join(", ")}; self-contained, custom elements registered)`);
