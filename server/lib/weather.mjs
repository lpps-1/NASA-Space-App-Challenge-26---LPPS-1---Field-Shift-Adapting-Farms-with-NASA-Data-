/**
 * Live weather via Open-Meteo (free, no API key). Used as an AI tool and by
 * /api/weather. Places are resolved against the Pakistan district database
 * first, then Open-Meteo's geocoder for anything not in it.
 */
import { resolvePlace } from "./geo.mjs";

const WMO = {
  0: "clear", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "rime fog",
  51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 61: "light rain", 63: "rain", 65: "heavy rain",
  71: "light snow", 73: "snow", 75: "heavy snow", 80: "rain showers", 81: "heavy showers", 82: "violent showers",
  95: "thunderstorm", 96: "thunderstorm with hail", 99: "severe thunderstorm with hail",
};

export const weatherTool = {
  name: "get_weather",
  description:
    "Get the live current weather and a 7-day forecast (temperature, rain, humidity, wind, reference evapotranspiration ET0) for a place in Pakistan from Open-Meteo. Use it whenever advice depends on weather: irrigation timing, spraying, fertilizer top-dressing, sowing, harvesting, frost or heat stress.",
  input_schema: {
    type: "object",
    properties: {
      place: { type: "string", description: "District, tehsil, city or town name in English, e.g. 'Faisalabad', 'Jaranwala', 'Mirpur Khas', 'Swat'. Every district of Pakistan (all provinces, ICT, GB, AJK) is recognised." },
      province: { type: "string", description: "Optional province to disambiguate, e.g. 'Punjab', 'Sindh'." },
    },
    required: ["place"],
  },
};

async function getJson(url, ms = 7000) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 1) throw err;
    }
  }
}

// Warm-instance cache only (forecasts change slowly). Not used for persistence.
const cache = new Map();
const TTL = 20 * 60 * 1000;

export async function getWeather(input) {
  const key = `${input?.place}|${input?.province}`.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const value = await fetchWeather(input || {});
  if (!value.error) cache.set(key, { at: Date.now(), value });
  return value;
}

async function locate(place, province) {
  const name = String(place || "").replace(/\s+district$/i, "").trim().slice(0, 80);
  if (!name) return { error: "No place given." };
  // 1. Pakistan district/tehsil database (exact coordinates for every district).
  try {
    const hit = await resolvePlace(name, province);
    if (hit) {
      const label = [hit.tehsil, hit.name === hit.tehsil ? null : `${hit.name} District`, hit.province].filter(Boolean).join(", ");
      return { lat: hit.lat, lng: hit.lng, label, district_id: hit.id };
    }
  } catch (err) {
    console.warn("geo lookup failed, falling back to geocoder", err?.message);
  }
  // 2. Open-Meteo geocoder for villages/towns not in the district database.
  const geo = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&countryCode=PK&language=en`
  );
  let results = geo.results || [];
  if (province) {
    const p = province.toLowerCase().slice(0, 5);
    const match = results.filter((r) => (r.admin1 || "").toLowerCase().includes(p));
    if (match.length) results = match;
  }
  const loc = results.sort((a, b) => (b.population || 0) - (a.population || 0))[0];
  if (!loc) return { error: `Could not find "${name}" in Pakistan. Ask the user for the nearest district or city.` };
  return {
    lat: loc.latitude,
    lng: loc.longitude,
    label: `${loc.name}, ${loc.admin2 || ""} ${loc.admin1 || ""}`.replace(/\s+/g, " ").trim(),
  };
}

/** Raw Open-Meteo forecast for a coordinate, in the shape the AI tool returns. */
export async function forecastAt(lat, lng) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    timezone: "Asia/Karachi",
    forecast_days: "7",
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration",
  });
  const w = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  const d = w.daily;
  return {
    source: "Open-Meteo live forecast",
    coordinates: { lat: Number(lat), lng: Number(lng) },
    elevation_m: w.elevation,
    current: {
      time: w.current.time,
      temp_c: w.current.temperature_2m,
      feels_c: w.current.apparent_temperature,
      humidity_pct: w.current.relative_humidity_2m,
      precipitation_mm: w.current.precipitation,
      wind_kmh: w.current.wind_speed_10m,
      code: w.current.weather_code,
      condition: WMO[w.current.weather_code] || `code ${w.current.weather_code}`,
    },
    daily: d.time.map((date, i) => ({
      date,
      code: d.weather_code[i],
      condition: WMO[d.weather_code[i]] || `code ${d.weather_code[i]}`,
      max_c: d.temperature_2m_max[i],
      min_c: d.temperature_2m_min[i],
      rain_mm: d.precipitation_sum[i],
      rain_chance_pct: d.precipitation_probability_max[i],
      wind_max_kmh: d.wind_speed_10m_max[i],
      et0_mm: d.et0_fao_evapotranspiration[i],
    })),
  };
}

async function fetchWeather({ place, province }) {
  try {
    const loc = await locate(place, province);
    if (loc.error) return loc;
    const f = await forecastAt(loc.lat, loc.lng);
    return { ...f, location: loc.label, district_id: loc.district_id };
  } catch (err) {
    return { error: `Weather service unavailable (${err.message}). Tell the user live weather could not be fetched.` };
  }
}
