// Fail the browser gate if the tracked HACS runtime is stale or nondeterministic.
// Rebuild explicitly with `npm run build` after an intentional source change.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const path = "../custom_components/smart_plants/frontend/smart-plants-panel.js";
const artifact = new URL(`../${path}`, import.meta.url);
execFileSync("git", ["ls-files", "--error-unmatch", path], { cwd, stdio: "pipe" });
const before = readFileSync(artifact);
for (let build = 1; build <= 2; build++) {
  execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], { cwd, stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/check-artifact.mjs"], { cwd, stdio: "pipe" });
  assert.ok(before.equals(readFileSync(artifact)), `Production artifact differs after rebuild ${build}. Run npm run build, review the artifact, then rerun browser tests.`);
}
process.stdout.write(`${JSON.stringify({ artifact: path, tracked: true, identicalRebuilds: 2, bytes: before.length, sha256: createHash("sha256").update(before).digest("hex") }, null, 2)}\n`);
