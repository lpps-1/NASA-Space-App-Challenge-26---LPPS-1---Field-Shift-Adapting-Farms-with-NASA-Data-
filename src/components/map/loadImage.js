/**
 * Loads one NASA GIBS map tile as an ImageBitmap, retrying when the network fails.
 *
 * Without this, a tile that failed once (a network blip, a slow mobile connection, GIBS busy) stayed a
 * grey hole until the page was reloaded, and the vegetation layer remembered the failure as "no
 * data" for the whole visit. Here:
 *  - a network error or a server error (5xx, 429) is retried up to 3 times, waiting longer each time;
 *  - while the device is offline it waits for the connection to come back;
 *  - a 4xx answer means GIBS has no image for that tile (outside the data, or not published yet):
 *    it resolves to null at once, without retrying.
 * Resolves to an ImageBitmap (or an <img> where createImageBitmap is missing), or null when GIBS has
 * no image. Rejects when every try failed.
 */
const TRIES = 4;

// GIBS answers over HTTP/1.1, so a browser opens only 6 connections to one host at a time, and the
// map needs about 120 tiles (vegetation alone uses 7 images per tile) at ~1.5 s each: about 30 s of
// queueing (measured 15 Nov). GIBS also serves the same tiles from gibs-a and gibs-b (with CORS), so
// tiles are spread over three hosts. A tile always goes to the same host, so the browser cache works;
// a retry moves to the next host. (gibs-c took over a minute when tested, so it is not used.)
const GIBS_HOST = "https://gibs.earthdata.nasa.gov/";
const HOSTS = ["https://gibs.earthdata.nasa.gov/", "https://gibs-a.earthdata.nasa.gov/", "https://gibs-b.earthdata.nasa.gov/"];
export function spreadHost(url, attempt = 0) {
  if (!url.startsWith(GIBS_HOST)) return url;
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) | 0;
  return HOSTS[(Math.abs(h) + attempt) % HOSTS.length] + url.slice(GIBS_HOST.length);
}
// Some GIBS requests hang for minutes (measured up to 5 min), each holding one of the browser's few
// connections. One try gives up after this long and the retry goes to another host.
const ATTEMPT_MS = 15000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const online = () =>
  typeof navigator === "undefined" || navigator.onLine !== false
    ? Promise.resolve()
    : new Promise((r) => window.addEventListener("online", r, { once: true }));

async function decode(blob) {
  if (typeof createImageBitmap === "function") return createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadImage(url, { signal } = {}) {
  for (let attempt = 0; attempt < TRIES; attempt++) {
    if (signal?.aborted) return null;
    await online();
    const ac = new AbortController();
    const stop = () => ac.abort();
    signal?.addEventListener("abort", stop, { once: true });
    const timer = setTimeout(stop, ATTEMPT_MS);
    try {
      const res = await fetch(spreadHost(url, attempt), { mode: "cors", signal: ac.signal });
      if (res.ok) return await decode(await res.blob());
      if (res.status < 500 && res.status !== 429) return null; // no image for this tile
    } catch {
      if (signal?.aborted) return null; // the tile left the view
      // network error or a hung request: retry below
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", stop);
    }
    if (attempt < TRIES - 1) await wait(1000 * 2 ** attempt + Math.random() * 400);
  }
  // Still failing: reject, so callers don't remember it as "no data" (the next view tries again).
  throw new Error(`Map tile failed to load: ${url}`);
}
