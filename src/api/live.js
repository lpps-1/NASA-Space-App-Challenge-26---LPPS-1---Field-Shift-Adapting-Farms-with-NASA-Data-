/**
 * Free public data services the browser can call directly (all send CORS headers, none needs a key).
 * Pages never import this file: they go through kisan.services in src/api/kisanClient.js.
 *
 *  - Open-Meteo forecast, hourly forecast, air quality and place search
 *  - USDA NRCS Soil Data Access (the SSURGO soil survey of the United States)
 */
const get = async (url, ms = 9000) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const CONDITIONS = [
  [0, "Clear sky"], [1, "Mainly clear"], [2, "Partly cloudy"], [3, "Overcast"], [48, "Fog"], [57, "Drizzle"],
  [67, "Rain"], [77, "Snow"], [82, "Rain showers"], [86, "Snow showers"], [99, "Thunderstorm"],
];
const conditionOf = (code) => (CONDITIONS.find(([max]) => code <= max) || CONDITIONS[0])[1];
const iconOf = (code) => (code >= 51 ? "rain" : code === 45 || code === 48 || code === 1 ? "haze" : code === 2 || code === 3 ? "cloud" : "sun");
const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

/** US AQI bands (EPA). */
export function aqiBand(aqi) {
  if (aqi <= 50) return { level: "good", label: "Good" };
  if (aqi <= 100) return { level: "moderate", label: "Moderate" };
  if (aqi <= 150) return { level: "sensitive", label: "Unhealthy for sensitive groups" };
  if (aqi <= 200) return { level: "unhealthy", label: "Unhealthy" };
  if (aqi <= 300) return { level: "very-unhealthy", label: "Very unhealthy" };
  return { level: "hazardous", label: "Hazardous" };
}

/** Current air quality at a point, or null. */
export async function airAt(lat, lng) {
  try {
    const c = (await get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10&timezone=auto`, 7000)).current;
    if (c?.us_aqi == null) return null;
    const aqi = Math.round(c.us_aqi);
    return { aqi, ...aqiBand(aqi), pm25: c.pm2_5 != null ? Math.round(c.pm2_5) : null, pm10: c.pm10 != null ? Math.round(c.pm10) : null, time: c.time, source: "Open-Meteo Air Quality" };
  } catch {
    return null;
  }
}

/** Same shape as /api/weather, straight from Open-Meteo. Used when the app's own weather service can't be reached. */
export async function weatherAt(lat, lng, label) {
  const qs = new URLSearchParams({
    latitude: String(lat), longitude: String(lng), timezone: "auto", forecast_days: "7",
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,et0_fao_evapotranspiration",
  });
  const [f, air] = await Promise.all([get(`https://api.open-meteo.com/v1/forecast?${qs}`), airAt(lat, lng)]);
  const d = f.daily;
  return {
    source: "Open-Meteo",
    location: label || `${Number(lat).toFixed(2)}, ${Number(lng).toFixed(2)}`,
    coordinates: { lat: f.latitude, lng: f.longitude },
    now: {
      temp: Math.round(f.current.temperature_2m),
      feels: Math.round(f.current.apparent_temperature),
      condition: conditionOf(f.current.weather_code),
      humidity: f.current.relative_humidity_2m,
      wind: Math.round(f.current.wind_speed_10m),
      rain_chance: d.precipitation_probability_max?.[0] ?? 0,
    },
    forecast: d.time.map((date, i) => ({
      day: DAY.format(new Date(date + "T00:00Z")),
      date,
      hi: Math.round(d.temperature_2m_max[i]),
      lo: Math.round(d.temperature_2m_min[i]),
      icon: iconOf(d.weather_code[i]),
      rain: d.precipitation_probability_max?.[i] ?? 0,
      rain_mm: d.precipitation_sum?.[i] ?? 0,
      et0_mm: d.et0_fao_evapotranspiration?.[i] ?? null,
    })),
    air,
  };
}

/** Hour-by-hour temperature (°C), rain chance (%) and wind (km/h) for the next 7 days. */
export async function hourlyAt(lat, lng) {
  const f = await get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation_probability,wind_speed_10m&forecast_days=7&timezone=auto`);
  const h = f.hourly;
  return h.time.map((time, i) => ({ time, temp: h.temperature_2m[i], rain: h.precipitation_probability[i] ?? 0, wind: h.wind_speed_10m[i] }));
}

/** Towns and counties in the United States by name. */
export async function searchUS(q) {
  const data = await get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&countryCode=US&language=en`, 7000);
  return (data.results || [])
    .filter((r) => r.country_code === "US")
    .map((r) => ({ id: r.id, name: r.name, county: r.admin2 || "", state: r.admin1 || "", lat: r.latitude, lng: r.longitude }));
}

/**
 * The USDA NRCS soil survey (SSURGO) map unit at a point in the United States:
 * soil name, drainage class, flooding, water-table depth, water-holding capacity.
 * Returns null outside the surveyed area.
 */
export async function usdaSoilAt(lat, lng) {
  const query =
    "SELECT TOP 1 mu.muname, c.compname, c.comppct_r, c.drainagecl, c.hydricrating, c.taxorder, ma.aws0100wta, ma.wtdepannmin, ma.flodfreqdcd, ma.niccdcd " +
    "FROM mapunit mu INNER JOIN component c ON c.mukey = mu.mukey LEFT JOIN muaggatt ma ON ma.mukey = mu.mukey " +
    `WHERE mu.mukey IN (SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point(${Number(lng)} ${Number(lat)})')) ORDER BY c.comppct_r DESC`;
  const res = await fetch("https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format: "JSON", query }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const row = (await res.json()).Table?.[0];
  if (!row) return null;
  const [muname, compname, pct, drainage, hydric, order, aws, wt, flood, capability] = row;
  const num = (v) => (v == null || v === "" ? null : Number(v));
  return {
    source: "USDA NRCS Soil Survey (SSURGO)",
    map_unit: muname,
    series: compname,
    share_pct: num(pct),
    drainage: drainage || null,
    hydric: hydric === "Yes",
    soil_order: order || null,
    water_storage_cm: num(aws), // available water storage, top 100 cm
    water_table_cm: num(wt), // shallowest yearly depth to the water table
    flooding: flood || null,
    capability_class: capability || null, // 1 (few limits) … 8
  };
}
