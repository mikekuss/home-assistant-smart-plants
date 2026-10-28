// @vitest-environment node
import { spawn, type ChildProcess } from "node:child_process";
import { request } from "node:http";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./serve-harness.mjs", import.meta.url));
const harness = "/frontend/e2e/harness.html";

let server: ChildProcess;
let port: number;

const freePort = () => new Promise<number>((done, fail) => {
  const probe = createServer().once("error", fail).listen(0, "127.0.0.1", () => {
    const address = probe.address();
    probe.close(() => done(typeof address === "object" && address ? address.port : 0));
  });
});

const get = (path: string, host = `127.0.0.1:${port}`) => new Promise<number>((done, fail) => {
  const req = request({ host: "127.0.0.1", port, path, headers: { Host: host } }, response => {
    response.resume();
    done(response.statusCode ?? 0);
  });
  req.on("error", fail);
  req.end();
});

beforeAll(async () => {
  port = await freePort();
  server = spawn(process.execPath, [script], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await get(harness);
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  throw new Error("serve-harness did not start");
});

afterAll(() => {
  server.kill();
});

describe("serve-harness", () => {
  it("serves the files the browser tests load", async () => {
    expect(await get(harness)).toBe(200);
    expect(await get("/frontend/e2e/harness.js")).toBe(200);
    expect(await get("/custom_components/smart_plants/frontend/smart-plants-panel.js?cache-reload=1")).toBe(200);
  });

  it("returns 404 for any other repository file", async () => {
    expect(await get("/README.md")).toBe(404);
    expect(await get("/frontend/package.json")).toBe(404);
    expect(await get("/frontend/e2e/panel.spec.ts")).toBe(404);
    expect(await get("/frontend/e2e/../package.json")).toBe(404);
  });

  it("rejects an unexpected Host header", async () => {
    expect(await get(harness, `rebind.example.test:${port}`)).toBe(421);
    expect(await get(harness, "127.0.0.1")).toBe(421);
    expect(await get(harness, `localhost:${port}`)).toBe(200);
  });

  it("returns 400 for a malformed path and keeps running", async () => {
    expect(await get("/%")).toBe(400);
    expect(await get(harness)).toBe(200);
  });
});
