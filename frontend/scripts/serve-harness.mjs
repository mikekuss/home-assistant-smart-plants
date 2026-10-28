import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.PORT ?? 4179);
const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
// Only the files the browser tests load. Everything else in the checkout,
// including git-ignored local files, stays unreachable.
const files = new Set([
  "/frontend/e2e/harness.html",
  "/frontend/e2e/harness.js",
  "/custom_components/smart_plants/frontend/smart-plants-panel.js",
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

createServer((request, response) => {
  if (!hosts.has(request.headers.host ?? "")) {
    response.writeHead(421).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://local").pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (!files.has(pathname)) {
    response.writeHead(404).end();
    return;
  }
  const file = resolve(root, `.${pathname}`);
  response.writeHead(200, {
    "Content-Type": types[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(file).on("error", () => response.destroy()).pipe(response);
}).listen(port, "127.0.0.1");
