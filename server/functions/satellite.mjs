import { satelliteFeatures } from "../lib/satellite.mjs";

/**
 * Satellite readings at the farm as numbers (NDVI, 12 months of NDVI, SMAP root-zone soil
 * moisture, 14 days of GPM IMERG rain, MODIS ground temperature, GRACE groundwater, MODIS land
 * cover), decoded from NASA GIBS images with GIBS's own colour tables.
 *   GET /api/satellite?lat=&lng=
 */
export default async (req) => {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85) {
    return Response.json({ error: "Pass ?lat=&lng=" }, { status: 400 });
  }
  try {
    const value = await satelliteFeatures(lat, lng);
    return Response.json(value, { headers: { "Cache-Control": "public, max-age=21600" } });
  } catch (err) {
    console.error("satellite failed", err?.message);
    return Response.json({ error: "Satellite readings are unavailable right now." }, { status: 502 });
  }
};
