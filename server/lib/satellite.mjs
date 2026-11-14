import { decode } from "fast-png";
import { valueOf } from "../../src/lib/gibsColormaps.js";

/**
 * Satellite readings at the farm, as numbers, from the same NASA GIBS images the map shows.
 *
 * GIBS paints every data value in a fixed colour and publishes the colour table, so the pixel
 * over the farm can be turned back into its value (src/lib/gibsColormaps.js). For each layer
 * the 3 × 3 pixels around the farm are read and the median is kept, so one odd pixel does not
 * decide the result. Clouds and gaps read as "no data" and are skipped, never guessed.
 *
 * These numbers feed the rotation scores (src/lib/rotation.js) and Kisan AI's farm data.
 */
const WMTS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
const TIMEOUT_MS = 8000;

export const SAT_LAYERS = {
  ndvi: { layer: "MODIS_Terra_NDVI_8Day", z: 9, table: "ndvi", what: "MODIS Terra NDVI, 8-day, 250 m" },
  ndviMonthly: { layer: "MODIS_Terra_L3_NDVI_Monthly", z: 7, table: "ndvi", what: "MODIS Terra NDVI, monthly, 1 km" },
  smap: { layer: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", z: 6, table: "smap", what: "SMAP Level 4 root-zone soil moisture, daily, 9 km" },
  rain: { layer: "IMERG_Precipitation_Rate", z: 6, table: "rain", what: "GPM IMERG precipitation rate, daily, 10 km" },
  lst: { layer: "MODIS_Terra_Land_Surface_Temp_Day", z: 7, table: "lst", what: "MODIS Terra land-surface temperature (day), 1 km" },
  grace: { layer: "GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI", z: 6, table: "grace", what: "GRACE / GRACE-FO water storage anomaly, monthly, ~300 km" },
  landcover: { layer: "MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual", z: 8, table: "landcover", what: "MODIS land cover (IGBP classes), yearly, 500 m" },
};

export const IGBP = {
  1: "evergreen needleleaf forest", 2: "evergreen broadleaf forest", 3: "deciduous needleleaf forest", 4: "deciduous broadleaf forest", 5: "mixed forest",
  6: "closed shrubland", 7: "open shrubland", 8: "woody savanna", 9: "savanna", 10: "grassland", 11: "permanent wetland", 12: "cropland",
  13: "urban / built-up", 14: "cropland and natural vegetation mosaic", 15: "snow and ice", 16: "barren / desert", 17: "water",
};

const tiles = new Map(); // url -> Promise<{img, time}>
const MAX_TILES = 300;

function pixelOf(lat, lng, z) {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  return { tx: Math.floor(x), ty: Math.floor(y), px: Math.floor((x - Math.floor(x)) * 256), py: Math.floor((y - Math.floor(y)) * 256) };
}

function loadTile(url) {
  if (!tiles.has(url)) {
    if (tiles.size > MAX_TILES) tiles.delete(tiles.keys().next().value);
    const p = fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      .then(async (res) => {
        if (!res.ok) return null;
        const img = decode(new Uint8Array(await res.arrayBuffer()));
        return { img, time: (res.headers.get("layer-time-actual") || "").slice(0, 10) || null };
      })
      .catch(() => null);
    p.then((v) => v || tiles.delete(url)); // don't keep failures
    tiles.set(url, p);
  }
  return tiles.get(url);
}

function rgbAt(img, x, y) {
  const i = y * img.width + x;
  if (img.palette) {
    const c = img.palette[img.data[i]];
    return c ? [c[0], c[1], c[2], c[3] ?? 255] : null;
  }
  const ch = img.channels;
  return [img.data[i * ch], img.data[i * ch + 1], img.data[i * ch + 2], ch === 4 ? img.data[i * ch + 3] : 255];
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * Reads one layer at a point. `time` is a date (YYYY-MM-DD) or "default" (the latest image).
 * Returns { value, date } or null. Land cover returns the most common class instead of a median.
 */
export async function sample(key, lat, lng, time = "default", radius = 1) {
  const L = SAT_LAYERS[key];
  const { tx, ty, px, py } = pixelOf(lat, lng, L.z);
  const url = `${WMTS}/${L.layer}/default/${time}/GoogleMapsCompatible_Level${L.z}/${L.z}/${ty}/${tx}.png`;
  const t = await loadTile(url);
  if (!t) return null;
  const vals = [];
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      const x = px + dx, y = py + dy;
      if (x < 0 || y < 0 || x >= t.img.width || y >= t.img.height) continue;
      const c = rgbAt(t.img, x, y);
      if (!c) continue;
      const v = valueOf(L.table, c[0], c[1], c[2]);
      if (v != null) vals.push(v);
    }
  if (!vals.length) return null;
  if (L.table === "landcover") {
    const counts = vals.reduce((a, v) => ((a[v] = (a[v] || 0) + 1), a), {});
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    return { value: Number(top), date: t.time };
  }
  return { value: median(vals), date: t.time, n: vals.length };
}

const ymd = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => ymd(new Date(Date.now() - n * 86400e3));
const r = (v, k = 2) => (v == null ? null : Math.round(v * 10 ** k) / 10 ** k);

/** The last 12 complete months, oldest first, as YYYY-MM-01. */
function lastMonths(n = 12) {
  const out = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = n; i >= 1; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push(ymd(m));
  }
  return out;
}

const cache = new Map();

/**
 * Every satellite reading used by the app, for one farm point.
 * Returns features with value, unit, date and source, plus the derived signals the scores use.
 */
export async function satelliteFeatures(lat, lng) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 6 * 3600e3) return hit.value;

  const months = lastMonths(12);
  const rainDays = Array.from({ length: 14 }, (_, i) => daysAgo(i + 1));
  const lstDays = Array.from({ length: 8 }, (_, i) => daysAgo(i));
  const [ndvi, smap, grace, landcover, monthly, rain, lst] = await Promise.all([
    sample("ndvi", lat, lng),
    sample("smap", lat, lng),
    sample("grace", lat, lng),
    sample("landcover", lat, lng, "default", 2),
    Promise.all(months.map((m) => sample("ndviMonthly", lat, lng, m))),
    Promise.all(rainDays.map((d) => sample("rain", lat, lng, d, 0))),
    (async () => {
      for (const d of lstDays) {
        const s = await sample("lst", lat, lng, d);
        if (s) return s;
      }
      return null;
    })(),
  ]);

  // NDVI through the year: which months the land stood bare, how green it got, and whether it
  // stays green all year (orchards and forests do; field crops drop between seasons).
  const series = months.map((m, i) => ({ month: Number(m.slice(5, 7)), year: Number(m.slice(0, 4)), ndvi: r(monthly[i]?.value, 2) }));
  const known = series.filter((s) => s.ndvi != null);
  const bareMonths = known.filter((s) => s.ndvi < 0.25).map((s) => s.month);
  const peak = known.length ? Math.max(...known.map((s) => s.ndvi)) : null;
  const low = known.length ? Math.min(...known.map((s) => s.ndvi)) : null;

  // Rain: daily mean rate (mm/h) × 24 = mm that day; days with no image are left out.
  const rainKnown = rain.filter(Boolean);
  const rain14 = rainKnown.length >= 7 ? r((rainKnown.reduce((a, s) => a + s.value, 0) * 24 * 14) / rainKnown.length, 0) : null;

  const lc = landcover?.value ?? null;
  const value = {
    point: { lat: r(lat, 3), lng: r(lng, 3) },
    ndvi: ndvi ? { value: r(ndvi.value, 2), date: ndvi.date, source: SAT_LAYERS.ndvi.what } : null,
    ndvi_year: known.length >= 6
      ? { months: series, bare_months: bareMonths, peak: r(peak, 2), low: r(low, 2), evergreen: low >= 0.4, source: SAT_LAYERS.ndviMonthly.what }
      : null,
    soil_moisture: smap ? { value: r(smap.value, 3), unit: "m³/m³", date: smap.date, source: SAT_LAYERS.smap.what } : null,
    rain_14d: rain14 != null ? { value: rain14, unit: "mm", days: rainKnown.length, from: rainDays.at(-1), to: rainDays[0], source: SAT_LAYERS.rain.what } : null,
    ground_temp: lst ? { value: r(lst.value - 273.15, 1), unit: "°C", date: lst.date, source: SAT_LAYERS.lst.what } : null,
    groundwater: grace ? { value: r(grace.value, 1), unit: "cm", date: grace.date, source: SAT_LAYERS.grace.what, note: "Latest GRACE map in NASA GIBS is from mid-2022." } : null,
    land_cover: lc != null ? { class: lc, name: IGBP[lc] || "unknown", date: landcover.date, source: SAT_LAYERS.landcover.what } : null,
    fetched_at: new Date().toISOString(),
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
