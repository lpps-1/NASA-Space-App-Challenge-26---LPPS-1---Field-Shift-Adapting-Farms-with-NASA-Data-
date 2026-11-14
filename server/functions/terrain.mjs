/**
 * Elevation and slope at the farm from NASA SRTM (Shuttle Radar Topography Mission, 30 m).
 *   GET /api/terrain?lat=&lng=
 * Reads SRTM 30 m through the OpenTopoData public API (no key). The slope is the
 * steepest rise between the farm point and points ~300 m north, south, east and west,
 * so it describes the land around the field, not a single furrow.
 * Returns { elevation_m, slope_pct, slope_class, erosion_risk, source, source_url }.
 */
const cache = new Map();
const STEP_M = 300;

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

