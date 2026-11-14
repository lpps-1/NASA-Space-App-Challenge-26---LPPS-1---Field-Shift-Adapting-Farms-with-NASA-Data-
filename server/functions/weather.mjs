import { getDistrict } from "../lib/geo.mjs";
import { forecastAt } from "../lib/weather.mjs";

/**
 * Dashboard weather for a district from the bundled Pakistan district dataset.
 *   GET /api/weather?district=punjab/faisalabad[&tehsil=Jaranwala]
 *   GET /api/weather?lat=31.45&lng=73.13&label=Faisalabad
 * Returns { location, district_id, coordinates, now, forecast[7], advisory, air, source }.
 * `air` = current air quality (US AQI, PM2.5, PM10) from the Open-Meteo Air Quality API, or null.
 */

/** US AQI bands (EPA). */
function aqiBand(aqi) {
  if (aqi <= 50) return { level: "good", label: "Good" };
  if (aqi <= 100) return { level: "moderate", label: "Moderate" };
  if (aqi <= 150) return { level: "sensitive", label: "Unhealthy for sensitive groups" };
  if (aqi <= 200) return { level: "unhealthy", label: "Unhealthy" };
  if (aqi <= 300) return { level: "very-unhealthy", label: "Very unhealthy" };
  return { level: "hazardous", label: "Hazardous" };
}

async function airAt(lat, lng) {
  try {
    const params = new URLSearchParams({ latitude: String(lat), longitude: String(lng), current: "us_aqi,pm2_5,pm10", timezone: "Asia/Karachi" });
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const c = (await res.json()).current;
    if (c?.us_aqi == null) return null;
    const aqi = Math.round(c.us_aqi);
    return { aqi, ...aqiBand(aqi), pm25: c.pm2_5 != null ? Math.round(c.pm2_5) : null, pm10: c.pm10 != null ? Math.round(c.pm10) : null, source: "Open-Meteo Air Quality" };
  } catch {
    return null;
  }
}
const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

function icon(code) {
  if (code >= 51) return "rain";
  if (code === 45 || code === 48) return "haze";
  if (code === 2 || code === 3) return "cloud";
  if (code === 1) return "haze";
  return "sun";
}

function advise(days) {
  const rain = days.slice(0, 4).find((d) => d.rain_chance_pct >= 50 || d.rain_mm >= 5);
  const heat = days.find((d) => d.max_c >= 40);
  const frost = days.find((d) => d.min_c <= 3);
  const wind = days.slice(0, 3).find((d) => d.wind_max_kmh >= 35);
  const name = (d) => DAY.format(new Date(d.date + "T00:00Z"));
  if (rain)
    return `Rain likely ${name(rain)} (${rain.rain_chance_pct}% chance, ~${rain.rain_mm} mm). Hold urea top-dressing and pesticide sprays until after it, and skip an irrigation if the rain arrives.`;
  if (frost) return `Frost risk ${name(frost)} (low ${frost.min_c}°). Give a light irrigation the evening before to protect young crops and vegetables.`;
  if (heat) return `Heat stress ${name(heat)} (high ${heat.max_c}°). Irrigate in the evening or early morning and avoid spraying in the afternoon.`;
  if (wind) return `Strong wind ${name(wind)} (up to ${wind.wind_max_kmh} km/h). Postpone spraying to avoid drift.`;
  return "No rain expected in the next few days. Follow your normal irrigation schedule and use the dry spell for spraying or fertilizer.";
}

/** District from the bundled Pakistan dataset (db/geo/pakistan.mjs). */
async function findDistrict(id) {
  try {
    return await getDistrict(id);
  } catch (err) {
    console.warn("district db lookup failed, using bundled dataset", err?.message);
    const local = await import("../../src/lib/geoLocal.js");
    return local.getDistrict(id)?.district ?? null;
  }
}

export default async (req) => {
  const url = new URL(req.url);
  try {
    let lat = Number(url.searchParams.get("lat"));
    let lng = Number(url.searchParams.get("lng"));
    let label = (url.searchParams.get("label") || "").slice(0, 80);
    let districtId = null;
    const district = url.searchParams.get("district");
    if (district) {
      const d = await findDistrict(district);
      if (!d) return Response.json({ error: "District not found" }, { status: 404 });
      const tehsilName = url.searchParams.get("tehsil");
      const t = tehsilName ? d.tehsils.find((x) => x.name.toLowerCase() === tehsilName.toLowerCase()) : null;
      lat = t?.lat ?? d.lat;
      lng = t?.lng ?? d.lng;
      // Tehsils without their own coordinates use the district headquarters point.
      label = t?.lat != null ? `${t.name}, ${d.name}` : d.name;
      districtId = d.id;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      return Response.json({ error: "Pass ?district=<id> or ?lat=&lng=" }, { status: 400 });

    const [f, air] = await Promise.all([forecastAt(lat, lng), airAt(lat, lng)]);
    const today = f.daily[0];
    return Response.json(
      {
        source: f.source,
        location: label || `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
        district_id: districtId,
        coordinates: f.coordinates,
        now: {
          temp: Math.round(f.current.temp_c),
          feels: Math.round(f.current.feels_c),
          condition: f.current.condition.replace(/^./, (c) => c.toUpperCase()),
          humidity: f.current.humidity_pct,
          wind: Math.round(f.current.wind_kmh),
          rain_chance: today?.rain_chance_pct ?? 0,
        },
        forecast: f.daily.map((d) => ({
          day: DAY.format(new Date(d.date + "T00:00Z")),
          date: d.date,
          hi: Math.round(d.max_c),
          lo: Math.round(d.min_c),
          icon: icon(d.code),
          rain: d.rain_chance_pct ?? 0,
          rain_mm: d.rain_mm,
          et0_mm: d.et0_mm,
        })),
        advisory: advise(f.daily),
        air,
      },
      { headers: { "Cache-Control": "public, max-age=600, s-maxage=1200" } }
    );
  } catch (err) {
    console.error("weather failed", err);
    return Response.json({ error: "Live weather is unavailable right now." }, { status: 502 });
  }
};

