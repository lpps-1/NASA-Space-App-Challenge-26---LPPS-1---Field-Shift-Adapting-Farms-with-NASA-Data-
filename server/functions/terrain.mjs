/**
 * Elevation and slope at the farm from NASA SRTM (Shuttle Radar Topography Mission, 30 m).
 *   GET /api/terrain?lat=&lng=
 * Reads SRTM 30 m through the OpenTopoData public API (no key). The slope is the
 * steepest rise between the farm point and points ~300 m north, south, east and west,
 * so it describes the land around the field, not a single furrow.
 * Returns { elevation_m, slope_pct, slope_class, erosion_risk, source, source_url }.
 *
 *   GET /api/terrain?lat=&lng=&grid=1
 * Erosion hotspots: a 9 × 9 grid of SRTM heights 150 m apart (about 1.2 km square around the
 * farm). Each of the 7 × 7 inner points gets its own slope (from its four neighbours), so the
 * map can show which parts of the land slope enough to lose soil when left bare.
 * Returns { step_m, cells: [{ lat, lng, elevation_m, slope_pct, erosion_risk }], summary }.
 */
const cache = new Map();
const STEP_M = 300;
const GRID_N = 9;
const GRID_STEP_M = 150;

async function slopeGrid(lat, lng) {
  const dLat = GRID_STEP_M / 111320;
  const dLng = GRID_STEP_M / (111320 * Math.cos((lat * Math.PI) / 180));
  const half = (GRID_N - 1) / 2;
  const pts = [];
  for (let i = 0; i < GRID_N; i++) for (let j = 0; j < GRID_N; j++) pts.push([lat + (half - i) * dLat, lng + (j - half) * dLng]);
  const res = await fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${pts.map(([a, b]) => `${a.toFixed(5)},${b.toFixed(5)}`).join("|")}`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`SRTM HTTP ${res.status}`);
  const z = ((await res.json()).results || []).map((r) => (typeof r.elevation === "number" ? r.elevation : null));
  if (z.length !== pts.length) throw new Error("SRTM grid incomplete");
  const at = (i, j) => z[i * GRID_N + j];
  const cells = [];
  for (let i = 1; i < GRID_N - 1; i++)
    for (let j = 1; j < GRID_N - 1; j++) {
      const [n, s, e, w, c] = [at(i - 1, j), at(i + 1, j), at(i, j + 1), at(i, j - 1), at(i, j)];
      if ([n, s, e, w, c].some((v) => v == null)) continue;
      const gx = (e - w) / (2 * GRID_STEP_M), gy = (n - s) / (2 * GRID_STEP_M);
      const slope = Math.round(Math.hypot(gx, gy) * 1000) / 10;
      const [la, ln] = pts[i * GRID_N + j];
      cells.push({ lat: Math.round(la * 1e5) / 1e5, lng: Math.round(ln * 1e5) / 1e5, elevation_m: Math.round(c), slope_pct: slope, erosion_risk: slopeClass(slope).erosion_risk });
    }
  const count = (k) => cells.filter((c) => c.erosion_risk === k).length;
  return {
    step_m: GRID_STEP_M,
    half_size_m: Math.round(((GRID_N - 3) / 2 + 0.5) * GRID_STEP_M),
    cells,
    summary: { cells: cells.length, high: count("high"), medium: count("medium"), low: count("low"), max_slope_pct: cells.length ? Math.max(...cells.map((c) => c.slope_pct)) : null },
    source: "NASA SRTM 30 m (Shuttle Radar Topography Mission), via OpenTopoData",
  };
}

export function slopeClass(pct) {
  if (pct == null) return null;
  if (pct < 1) return { slope_class: "flat", erosion_risk: "low" };
  if (pct < 3) return { slope_class: "gentle", erosion_risk: "low" };
  if (pct < 8) return { slope_class: "moderate", erosion_risk: "medium" };
  return { slope_class: "steep", erosion_risk: "high" };
}

export default async (req) => {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 60) {
    return Response.json({ error: "Pass ?lat=&lng= (SRTM covers 60°S to 60°N)" }, { status: 400 });
  }
  if (url.searchParams.get("grid")) {
    const gkey = `grid:${lat.toFixed(4)},${lng.toFixed(4)}`;
    try {
      const value = cache.get(gkey) || (await slopeGrid(lat, lng));
      cache.set(gkey, value);
      return Response.json(value, { headers: { "Cache-Control": "public, max-age=604800" } });
    } catch (err) {
      console.error("terrain grid failed", err?.message);
      return Response.json({ error: "Elevation data is unavailable right now." }, { status: 502 });
    }
  }
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit) return Response.json(hit, { headers: { "Cache-Control": "public, max-age=604800" } });

  const dLat = STEP_M / 111320;
  const dLng = STEP_M / (111320 * Math.cos((lat * Math.PI) / 180));
  const pts = [
    [lat, lng],
    [lat + dLat, lng],
    [lat - dLat, lng],
    [lat, lng + dLng],
    [lat, lng - dLng],
  ];
  try {
    const res = await fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${pts.map(([a, b]) => `${a.toFixed(5)},${b.toFixed(5)}`).join("|")}`, {
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) throw new Error(`SRTM HTTP ${res.status}`);
    const data = await res.json();
    const z = (data.results || []).map((r) => (typeof r.elevation === "number" ? r.elevation : null));
    if (z[0] == null) throw new Error("No SRTM elevation here");
    const rises = z.slice(1).filter((v) => v != null).map((v) => Math.abs(v - z[0]));
    const slope = rises.length ? Math.round((Math.max(...rises) / STEP_M) * 1000) / 10 : null;
    const value = {
      elevation_m: Math.round(z[0]),
      slope_pct: slope,
      ...slopeClass(slope),
      source: "NASA SRTM 30 m (Shuttle Radar Topography Mission), via OpenTopoData",
      source_url: "https://www.earthdata.nasa.gov/data/instruments/srtm",
    };
    cache.set(key, value);
    return Response.json(value, { headers: { "Cache-Control": "public, max-age=604800" } });
  } catch (err) {
    console.error("terrain failed", err?.message);
    return Response.json({ error: "Elevation data is unavailable right now." }, { status: 502 });
  }
};

