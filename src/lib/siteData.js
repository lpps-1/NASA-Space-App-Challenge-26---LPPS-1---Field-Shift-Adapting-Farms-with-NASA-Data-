import { landSummary } from "@/data/landSurveys";
import { planRotations, rotationTitle } from "@/lib/rotation";
import { satelliteLine } from "@/lib/satelliteText";

/**
 * The farm's figures as the website shows them (climate card, NASA data card, slope, soil survey,
 * rotation planner), written as a short, tidy summary. Sent with each chat question; Kisan AI reads
 * it through its get_farm_data tool only when a question needs it, so answers match the website
 * and no extra API calls are made.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function buildSiteData({ profile, climate, nasa, terrain, usda, sat, slopeGrid }) {
  if (!profile) return "";
  const out = [];
  const place = [profile.tehsil, profile.district, profile.province].filter(Boolean).join(", ");
  if (place) out.push(`Farm location: ${place}${profile.country === "US" ? ", United States" : ", Pakistan"}.`);

  if (climate?.averages) {
    const a = climate.averages;
    const t = climate.trends_per_decade || {};
    out.push(
      `Rotation page, "Your climate ${climate.period.first_year}–${climate.period.last_year}" (NASA POWER, ${climate.location}): ` +
        `rain a year ${a.rain_mm} mm (${t.rain_mm > 0 ? "+" : ""}${t.rain_mm ?? "?"} mm per decade); days above 40 °C ${a.heat_days} (${t.heat_days > 0 ? "+" : ""}${t.heat_days ?? "?"} per decade); ` +
        `frost nights ${a.frost_days}; very heavy rain days ${a.heavy_rain_days}.`
    );
    const months = (climate.monthly || []).map((m) => `${MONTHS[m.month - 1]} ${m.rain_mm} mm rain, ${m.tmax_c}° high, ${m.tmin_c}° low`);
    if (months.length) out.push(`Average month: ${months.join("; ")}.`);
  }
  if (nasa?.period) {
    out.push(
      `Dashboard, "NASA satellite data" (NASA POWER, ${nasa.location}, ${nasa.period.start} to ${nasa.period.end}): rainfall ${nasa.rain_mm_total} mm; ` +
        `average temperature ${nasa.temp_c_mean} °C (${nasa.temp_c_min_mean}–${nasa.temp_c_max_mean}°); root-zone soil moisture ${nasa.soil_wetness_pct}%; sunlight ${nasa.solar_mean} ${nasa.solar_units}.`
    );
  }
  if (terrain?.elevation_m != null) {
    out.push(`Farm map (NASA SRTM): ${terrain.elevation_m} m above sea level, ${terrain.slope_pct}% slope (${terrain.slope_class}; erosion risk on bare soil ${terrain.erosion_risk}).`);
  }
  const satText = satelliteLine(sat);
  if (satText) out.push(satText);
  if (slopeGrid?.summary) out.push(`Erosion hotspots (NASA SRTM, 150 m grid): ${slopeGrid.summary.high} steep and ${slopeGrid.summary.medium} moderate patches out of ${slopeGrid.summary.cells}, steepest ${slopeGrid.summary.max_slope_pct}%.`);
  const land = landSummary(profile, usda);
  if (land.lines.length) out.push(`Government soil survey (${land.source}): ${land.lines.join(" ")}${land.waterlog ? ` Waterlogging risk used in the scores: ${land.waterlog}.` : ""}`);

  try {
    const plan = planRotations({ profile, climate, land: { ...land, terrain: terrain || null, sat: sat || null, slopeGrid: slopeGrid || null } });
    const row = (s) => `${rotationTitle(s, "en")}: ${s.total}/100 (water ${s.scores.water}, soil ${s.scores.soil}, income ${s.scores.income}, weather safety ${s.scores.risk}; ${s.irrigation_mm} mm irrigation a year; ${s.bare_months.length} bare months)`;
    out.push(`Rotation planner: you grow now ${row(plan.current)}. Top options: ${plan.top.filter((s) => !s.isCurrent).map(row).join("; ")}.`);
    if (plan.statistical) out.push(`20-year statistical check (each year of NASA weather replayed): best is ${plan.statistical.rows.find((r) => r.id === plan.statistical.stat_top)?.crops.join(" → ")}; rank agreement with the planner ${plan.statistical.agreement}.`);
    const effects = plan.current.sat_effects || [];
    if (effects.length) out.push(`Satellite effects on the current rotation's scores: ${effects.map((e) => e.text).join(" ")}`);
  } catch {
    /* not enough answers for the planner yet */
  }
  return out.join("\n");
}
