// Fail the browser gate if the tracked HACS runtime is stale or nondeterministic.
// Rebuild explicitly with `npm run build` after an intentional source change.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const builds = [
  { mode: "panel", path: "../custom_components/smart_plants/frontend/smart-plants-panel.js" },
  { mode: "card", path: "../custom_components/smart_plants/frontend/smart-plants-card.js" },
  { mode: "card-full", path: "../custom_components/smart_plants/frontend/smart-plants-card-full.js" },
];
const before = new Map();
for (const { path } of builds) {
  execFileSync("git", ["ls-files", "--error-unmatch", path], { cwd, stdio: "pipe" });
  before.set(path, readFileSync(new URL(`../${path}`, import.meta.url)));
}
for (let build = 1; build <= 2; build++) {
  for (const { mode } of builds) execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--mode", mode], { cwd, stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/check-artifact.mjs"], { cwd, stdio: "pipe" });
  for (const { path } of builds) {
    assert.ok(before.get(path).equals(readFileSync(new URL(`../${path}`, import.meta.url))), `Production artifact ${path} differs after rebuild ${build}. Run npm run build, review the artifact, then rerun browser tests.`);
  }
}
const artifacts = builds.map(({ path }) => ({ artifact: path, bytes: before.get(path).length, sha256: createHash("sha256").update(before.get(path)).digest("hex") }));
process.stdout.write(`${JSON.stringify({ tracked: true, identicalRebuilds: 2, artifacts }, null, 2)}\n`);
