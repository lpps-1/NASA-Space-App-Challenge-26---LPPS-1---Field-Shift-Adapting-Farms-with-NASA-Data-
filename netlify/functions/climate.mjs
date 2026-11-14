import { getDistrict } from "../lib/geo.mjs";

/**
 * Long-term NASA POWER climate for a district, used by the rotation planner.
 *   GET /api/climate?district=punjab/faisalabad   or   ?lat=&lng=
 *
 * Pulls 20 full years of daily NASA POWER data (community AG) and returns:
 *  - a monthly climatology: rain, max/min temperature, root-zone soil wetness
 *  - risk counts per year: heat days (max > 40 °C), frost days (min < 2 °C),
 *    heavy-rain days (> 50 mm)
 *  - per-year totals and simple linear trends (per decade) so the farmer can see
 *    whether heat and rainfall are changing.
 * Source: NASA Langley Research Center POWER Project (power.larc.nasa.gov).
 */
const PARAMS = ["PRECTOTCORR", "T2M_MAX", "T2M_MIN", "GWETROOT"];
const YEARS = 20; // trends need a long window: single wet or hot years (e.g. 2020) swing 10-year slopes a lot
const cache = new Map                                    ();
const r1 = (n) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10) / 10);

/** Least-squares slope of y over x, per unit of x. */
function slope(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den ? num / den : null;
}

export function summarise(p, firstYear, lastYear) {
  const months = Array.from({ length: 12 }, () => ({ rain: 0, tmax: 0, tmin: 0, soil: 0, nT: 0, nS: 0 }));
  const years = {};
  for (let y = firstYear; y <= lastYear; y++) years[y] = { rain: 0, heat: 0, frost: 0, heavy: 0, tmax: 0, nT: 0 };
  const ok = (v) => typeof v === "number" && v > -900;

  for (const day of Object.keys(p.T2M_MAX || {})) {
    const y = Number(day.slice(0, 4));
    const m = Number(day.slice(4, 6)) - 1;
    const yr = years[y];
    if (!yr || m < 0 || m > 11) continue;
    const rain = p.PRECTOTCORR?.[day], tmax = p.T2M_MAX?.[day], tmin = p.T2M_MIN?.[day], soil = p.GWETROOT?.[day];
    if (ok(rain)) {
      months[m].rain += rain;
      yr.rain += rain;
      if (rain > 50) yr.heavy++;
    }
    if (ok(tmax) && ok(tmin)) {
      months[m].tmax += tmax;
      months[m].tmin += tmin;
      months[m].nT++;
      yr.tmax += tmax;
      yr.nT++;
      if (tmax > 40) yr.heat++;
      if (tmin < 2) yr.frost++;
    }
    if (ok(soil)) {
      months[m].soil += soil;
      months[m].nS++;
    }
  }

  const nYears = lastYear - firstYear + 1;
  const monthly = months.map((m, i) => ({
    month: i + 1,
    rain_mm: r1(m.rain / nYears),
    tmax_c: m.nT ? r1(m.tmax / m.nT) : null,
    tmin_c: m.nT ? r1(m.tmin / m.nT) : null,
    soil_wetness_pct: m.nS ? Math.round((m.soil / m.nS) * 100) : null,
  }));
  const yearly = Object.entries(years)
    .filter(([, v]) => v.nT > 300)
    .map(([y, v]) => ({
      year: Number(y),
      rain_mm: Math.round(v.rain),
      heat_days: v.heat,
      frost_days: v.frost,
      heavy_rain_days: v.heavy,
      tmax_mean_c: r1(v.tmax / v.nT),
    }));
  const xs = yearly.map((y) => y.year);
  const avg = (k) => (yearly.length ? yearly.reduce((a, y) => a + (y[k]), 0) / yearly.length : null);
  const per10 = (k) => {
    const s = slope(xs, yearly.map((y) => y[k]));
    return s == null ? null : r1(s * 10);
  };
  return {
    monthly,
    yearly,
    averages: {
      rain_mm: avg("rain_mm") == null ? null : Math.round(avg("rain_mm") ),
      heat_days: r1(avg("heat_days")),
      frost_days: r1(avg("frost_days")),
      heavy_rain_days: r1(avg("heavy_rain_days")),
    },
    trends_per_decade: {
      rain_mm: per10("rain_mm"),
      heat_days: per10("heat_days"),
      tmax_c: per10("tmax_mean_c"),
    },
  };
}

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
  const headers = { "Cache-Control": "public, max-age=86400" };
  if (hit && Date.now() - hit.at < 24 * 3600e3) return Response.json(hit.value, { headers });

  const lastYear = new Date().getUTCFullYear() - 1; // last complete year
  const firstYear = lastYear - YEARS + 1;
  const qs = new URLSearchParams({
    parameters: PARAMS.join(","),
    community: "AG",
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    start: `${firstYear}0101`,
    end: `${lastYear}1231`,
    format: "JSON",
  });
  try {
    const res = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${qs}`, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) throw new Error(`NASA POWER HTTP ${res.status}`);
    const data = await res.json();
    const value = {
      source: "NASA POWER (Langley Research Center), daily, community AG",
      source_url: "https://power.larc.nasa.gov/",
      parameters: PARAMS,
      location: label || key,
      lat,
      lng,
      period: { first_year: firstYear, last_year: lastYear },
      ...summarise(data?.properties?.parameter || {}, firstYear, lastYear),
    };
    cache.set(key, { at: Date.now(), value });
    return Response.json(value, { headers });
  } catch (err) {
    console.error("nasa climate failed", err?.message);
    return Response.json({ error: "NASA climate history is unavailable right now." }, { status: 502 });
  }
};

export const config = { path: "/api/climate" };
