// Run: node scripts/test-map.mjs
// Checks the map tile loader (src/components/map/loadImage.js) against a fake network: failed tiles
// are retried, missing tiles are not, hung requests give up and move host, and tiles are spread over
// the GIBS hosts.
import assert from "node:assert/strict";

// Speed up the loader's waits (retry back-off, 15 s per-try limit) so the tests take a second.
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, Math.min(ms, 50), ...a);
globalThis.createImageBitmap = async (blob) => ({ bitmap: true, size: blob.size });

const { loadImage, spreadHost } = await import("../src/components/map/loadImage.js");
const URL0 = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/X/default/default/GoogleMapsCompatible_Level8/7/52/89.png";

let calls = [];
const ok = () => ({ ok: true, status: 200, blob: async () => new Blob(["png"]) });
const status = (s) => ({ ok: false, status: s, blob: async () => new Blob([]) });
function network(answers) {
  calls = [];
  let i = 0;
  globalThis.fetch = (url, { signal } = {}) => {
    calls.push(url);
    const a = answers[Math.min(i++, answers.length - 1)];
    if (a === "hang")
      return new Promise((_, reject) => signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    if (a === "neterr") return Promise.reject(new TypeError("Failed to fetch"));
    return Promise.resolve(a);
  };
}

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failures++;
    console.log(`✗ ${name}\n   ${err.message}`);
  }
}

await check("a tile that loads is returned at once", async () => {
  network([ok()]);
  assert.ok(await loadImage(URL0));
  assert.equal(calls.length, 1);
});

await check("a network error is retried, on another host", async () => {
  network(["neterr", "neterr", ok()]);
  assert.ok(await loadImage(URL0));
  assert.equal(calls.length, 3);
  assert.equal(new Set(calls.map((u) => new URL(u).host)).size, 3, "retries should move host");
});

await check("a server error (503) is retried", async () => {
  network([status(503), ok()]);
  assert.ok(await loadImage(URL0));
  assert.equal(calls.length, 2);
});

await check("a missing tile (404) is not retried and gives null", async () => {
  network([status(404)]);
  assert.equal(await loadImage(URL0), null);
  assert.equal(calls.length, 1);
});

await check("a hung request gives up and the retry succeeds", async () => {
  network(["hang", ok()]);
  assert.ok(await loadImage(URL0));
  assert.equal(calls.length, 2);
});

await check("a tile that never loads rejects (so it isn't remembered as 'no data')", async () => {
  network(["neterr"]);
  await assert.rejects(loadImage(URL0));
  assert.equal(calls.length, 4);
});

await check("a tile that left the view stops downloading", async () => {
  network(["hang"]);
  const ac = new AbortController();
  const p = loadImage(URL0, { signal: ac.signal });
  ac.abort();
  assert.equal(await p, null);
  assert.equal(calls.length, 1);
});

await check("tiles are spread over the three GIBS hosts, the same tile always on the same host", () => {
  const hosts = new Set();
  for (let x = 0; x < 60; x++) hosts.add(new URL(spreadHost(URL0.replace("/89.png", `/${x}.png`))).host);
  assert.deepEqual([...hosts].sort(), ["gibs-a.earthdata.nasa.gov", "gibs-b.earthdata.nasa.gov", "gibs.earthdata.nasa.gov"]);
  assert.equal(spreadHost(URL0), spreadHost(URL0));
  assert.equal(spreadHost("https://example.com/a.png"), "https://example.com/a.png");
});

if (failures) {
  console.log(`\n${failures} map check(s) failed`);
  process.exit(1);
}
console.log("\nAll map checks passed");
process.exit(0);
