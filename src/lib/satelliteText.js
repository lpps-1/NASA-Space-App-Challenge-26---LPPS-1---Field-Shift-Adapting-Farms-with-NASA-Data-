// No "@/" imports here: the server (server/lib/farmData.mjs) imports this file too.

/** Satellite readings at the farm (server/lib/satellite.mjs), one line for Kisan AI. */
export function satelliteLine(sat) {
  if (!sat) return null;
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = [];
  if (sat.ndvi) parts.push(`crop greenness now NDVI ${sat.ndvi.value} (MODIS, ${sat.ndvi.date})`);
  if (sat.ndvi_year) parts.push(`over the last 12 months NDVI peaked at ${sat.ndvi_year.peak}, lowest ${sat.ndvi_year.low}; bare months (NDVI under 0.25): ${sat.ndvi_year.bare_months.map((m) => MON[m - 1]).join(", ") || "none"}`);
  if (sat.soil_moisture) parts.push(`root-zone soil moisture ${sat.soil_moisture.value} m³/m³ (SMAP, ${sat.soil_moisture.date}; under 0.15 is dry, over 0.35 is wet)`);
  if (sat.rain_14d) parts.push(`rain in the last 14 days about ${sat.rain_14d.value} mm (GPM IMERG)`);
  if (sat.ground_temp) parts.push(`daytime ground temperature ${sat.ground_temp.value} °C (MODIS, ${sat.ground_temp.date})`);
  if (sat.groundwater) parts.push(`groundwater storage ${sat.groundwater.value} cm against normal (GRACE, ${sat.groundwater.date}, the newest map available)`);
  if (sat.land_cover) parts.push(`land cover at the pin: ${sat.land_cover.name} (MODIS ${String(sat.land_cover.date || "").slice(0, 4)})`);
  return parts.length ? `Satellite readings at the farm (NASA GIBS, read pixel by pixel): ${parts.join("; ")}.` : null;
}
