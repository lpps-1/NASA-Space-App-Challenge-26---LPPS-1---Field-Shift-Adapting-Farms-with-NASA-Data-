import { getDistrict } from "../lib/geo.mjs";

/**
 * NASA POWER agro-climate data for a district (no key needed).
 *   GET /api/nasa?district=punjab/faisalabad   or   ?lat=&lng=
 * Returns the last ~30 days of NASA satellite/model data at the district point:
 * total rainfall, average temperature, sunlight and root-zone soil wetness.
 * Source: NASA Langley Research Center POWER Project (power.larc.nasa.gov), community "AG".
 * POWER data lags real time by a few days, so the window ends 3 days ago.
 */
const PARAMS = ["PRECTOTCORR", "T2M", "T2M_MAX", "T2M_MIN", "ALLSKY_SFC_SW_DWN", "RH2M", "GWETROOT"];
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
const cache = new Map                                    ();

function stats(series = {}) {
  const vals = Object.values(series).filter((v) => typeof v === "number" && v > -900);
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return { sum, mean: sum / vals.length, days: vals.length };
}
const r1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

export default async (req) => {
  const url = new URL(req.url);
  let lat = Number(url.searchParams.get("lat"));
  let lng = Number(url.searchParams.get("lng"));
  let label = (url.searchParams.get("label") || "").slice(0, 80);
  const district = url.searchParams.get("district");
  if (district) {
    const d = await getDistrict(district);
    if (!d) return Response.json({ error: "District not found" }, { status: 404 });
    [lat, lng, label] = [d.lat, d.lng, d.name];
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Response.json({ error: "Pass ?district=<id> or ?lat=&lng=" }, { status: 400 });

  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 6 * 3600e3) return Response.json(hit.value, { headers: { "Cache-Control": "public, max-age=21600" } });

  const end = new Date(Date.now() - 3 * 864e5);
  const start = new Date(end.getTime() - 29 * 864e5);
  const qs = new URLSearchParams({
    parameters: PARAMS.join(","),
    community: "AG",
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    start: ymd(start),
    end: ymd(end),
    format: "JSON",
  });
  try {
    const res = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${qs}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`NASA POWER HTTP ${res.status}`);
    const data = await res.json();
    const p = data?.properties?.parameter || {};
    const units = Object.fromEntries(Object.entries(data?.parameters || {}).map(([k, v]) => [k, v?.units]));
    const rain = stats(p.PRECTOTCORR), t = stats(p.T2M), tmax = stats(p.T2M_MAX), tmin = stats(p.T2M_MIN);
    const sun = stats(p.ALLSKY_SFC_SW_DWN), rh = stats(p.RH2M), soil = stats(p.GWETROOT);
    const value = {
      source: "NASA POWER (Langley Research Center), daily, community AG",
      source_url: "https://power.larc.nasa.gov/",
      location: label || key,
      period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), days: rain?.days ?? t?.days ?? 0 },
      rain_mm_total: r1(rain?.sum),
      temp_c_mean: r1(t?.mean),
      temp_c_max_mean: r1(tmax?.mean),
      temp_c_min_mean: r1(tmin?.mean),
      solar_mean: r1(sun?.mean),
      solar_units: units.ALLSKY_SFC_SW_DWN || "MJ/m^2/day",
      humidity_pct_mean: r1(rh?.mean),
      // GWETROOT is a 0–1 fraction (0 = dry, 1 = saturated): shown as a percentage.
      soil_wetness_pct: soil ? Math.round(soil.mean * 100) : null,
    };
    cache.set(key, { at: Date.now(), value });
    return Response.json(value, { headers: { "Cache-Control": "public, max-age=21600" } });
  } catch (err) {
    console.error("nasa power failed", err?.message);
    return Response.json({ error: "NASA data is unavailable right now." }, { status: 502 });
  }
};

export const config = { path: "/api/nasa" };
