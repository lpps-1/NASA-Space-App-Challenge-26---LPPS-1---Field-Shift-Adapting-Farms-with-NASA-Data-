import nasaHandler from "../functions/nasa.mjs";
import climateHandler from "../functions/climate.mjs";
import terrainHandler from "../functions/terrain.mjs";
import { landSummary } from "../../src/data/landSurveys.js";
import { usdaSoilAt } from "../../src/api/live.js";

/**
 * The farm's own data, fetched on the server before Kisan AI answers, so the answer is
 * grounded in the same NASA and government sources the app shows (not the model's general
 * knowledge): NASA POWER (last 30 days and 20-year climate), NASA SRTM (elevation, slope),
 * and the government soil survey (USDA live for US farms, Soil Survey of Pakistan / WAPDA
 * province background for Pakistan). Each source has a short time limit; a slow or failed
 * source is reported as missing instead of holding up the answer.
 */
const LIMIT_MS = 7000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const withTimeout = (p, ms = LIMIT_MS) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
const call = async (handler, path) => {
  const res = await handler(new Request(`http://local${path}`));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
const where = (p) => (p.district_id && p.country !== "US" ? `district=${encodeURIComponent(p.district_id)}` : `lat=${p.lat}&lng=${p.lng}`);

export async function farmEvidence(profile) {
  const p = profile || {};
  const hasPoint = Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
  if (!hasPoint && !p.district_id) return null;
  const q = where(p);

  const [recent, climate, terrain, usda] = await Promise.allSettled([
    withTimeout(call(nasaHandler, `/api/nasa?${q}`)),
    withTimeout(call(climateHandler, `/api/climate?${q}`), 9000),
    hasPoint ? withTimeout(call(terrainHandler, `/api/terrain?lat=${p.lat}&lng=${p.lng}`)) : Promise.reject(new Error("no point")),
    p.country === "US" && hasPoint ? withTimeout(usdaSoilAt(Number(p.lat), Number(p.lng))) : Promise.resolve(null),
  ]);
  const ok = (r) => (r.status === "fulfilled" ? r.value : null);
  const lines = [];
  const missing = [];

  const n = ok(recent);
  if (n?.period) {
    lines.push(
      `- NASA POWER, last ${n.period.days} days (${n.period.start} to ${n.period.end}) at ${n.location}: rainfall ${n.rain_mm_total ?? "?"} mm in total; ` +
        `average temperature ${n.temp_c_mean ?? "?"} °C (nights ${n.temp_c_min_mean ?? "?"}, days ${n.temp_c_max_mean ?? "?"}); ` +
        `root-zone soil wetness ${n.soil_wetness_pct ?? "?"}% (0 = dry, 100 = saturated); humidity ${n.humidity_pct_mean ?? "?"}%.`
    );
  } else missing.push("NASA POWER last 30 days");

  const c = ok(climate);
  if (c?.averages) {
    const wet = [...(c.monthly || [])].sort((a, b) => (b.rain_mm || 0) - (a.rain_mm || 0)).slice(0, 3).map((m) => `${MONTHS[m.month - 1]} ${m.rain_mm} mm`);
    const hot = (c.monthly || []).filter((m) => m.tmax_c >= 38).map((m) => `${MONTHS[m.month - 1]} ${m.tmax_c} °C`);
    const cold = (c.monthly || []).filter((m) => m.tmin_c != null && m.tmin_c <= 5).map((m) => `${MONTHS[m.month - 1]} ${m.tmin_c} °C`);
    const t = c.trends_per_decade || {};
    lines.push(
      `- NASA POWER 20-year climate ${c.period.first_year}–${c.period.last_year} at ${c.location}: about ${c.averages.rain_mm} mm rain a year (wettest months: ${wet.join(", ")}); ` +
        `${c.averages.heat_days} days a year above 40 °C; ${c.averages.frost_days} frost nights a year (below 2 °C); ${c.averages.heavy_rain_days} heavy-rain days (over 50 mm). ` +
        (hot.length ? `Hot months (average highs): ${hot.join(", ")}. ` : "") +
        (cold.length ? `Cold months (average lows): ${cold.join(", ")}. ` : "") +
        `Trend per decade: rain ${t.rain_mm ?? "?"} mm, days above 40 °C ${t.heat_days ?? "?"}, average high ${t.tmax_c ?? "?"} °C (years vary a lot; a rough signal).`
    );
  } else missing.push("NASA POWER 20-year climate");

  const s = ok(terrain);
  if (s?.elevation_m != null) lines.push(`- NASA SRTM: about ${s.elevation_m} m above sea level, slope about ${s.slope_pct}% around the farm (${s.slope_class}; erosion risk on bare soil: ${s.erosion_risk}).`);
  else if (hasPoint) missing.push("NASA SRTM elevation");

  const land = landSummary(p, ok(usda));
  if (land.lines.length) lines.push(`- ${land.live ? "USDA NRCS soil survey (live, at the farm)" : land.source}: ${land.lines.join(" ")}`);
  else missing.push(p.country === "US" ? "USDA soil survey" : "government soil survey for this province");

  return { lines, missing };
}

/** The block added to Kisan AI's instructions for this turn. */
export function evidenceBlock(ev) {
  if (!ev) {
    return `## Farm data\nThe farmer's location is not set, so no NASA or government data could be loaded. For questions that depend on local weather, climate or soil, say that setting the farm location under My farm lets you use NASA data for their exact area, and give only general guidance.`;
  }
  return [
    "## Farm data (fetched live for this answer from the same sources the app shows)",
    ...ev.lines,
    ev.missing.length ? `- Not available right now: ${ev.missing.join(", ")}.` : "",
    "",
    "How to use it:",
    "- When the answer depends on the farm's weather, rain, heat, frost, soil moisture, soil, water table or slope, base it on the numbers above and name the source in plain words (for example \"NASA's 20 years of climate data for your district shows…\" or \"the government soil survey for Punjab says…\").",
    "- Never invent local figures. If a needed dataset is missing, say so briefly and give general guidance.",
    "- Use general farming knowledge only for practices (seed rates, spray timing, varieties), and keep it consistent with the data above.",
    "- For the forecast (next days), call get_weather.",
  ]
    .filter(Boolean)
    .join("\n");
}
