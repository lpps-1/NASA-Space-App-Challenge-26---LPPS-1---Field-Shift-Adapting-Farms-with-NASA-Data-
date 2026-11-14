import { getDistrict, getProvince, listProvinces, nearestDistrict, searchPlaces } from "../lib/geo.mjs";

/**
 * Pakistan geography API (bundled dataset in db/geo/pakistan.mjs).
 *   GET /api/geo                         provinces & territories with district counts
 *   GET /api/geo/provinces/:id           a province with its divisions and districts
 *   GET /api/geo/districts/:id           a district with its tehsils (id is "province/district")
 *   GET /api/geo/search?q=               districts and tehsils by name, HQ or alias
 *   GET /api/geo/nearest?lat=&lng=       closest district to a coordinate
 */
const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": status === 200 ? "public, max-age=300, s-maxage=3600" : "no-store" },
  });

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const url = new URL(req.url);
  const rest = decodeURIComponent(url.pathname.replace(/^\/api\/geo\/?/, "")).replace(/\/+$/, "");
  try {
    if (!rest) return json({ provinces: await listProvinces() });

    if (rest === "search") {
      const q = url.searchParams.get("q") || "";
      const limit = Math.min(Number(url.searchParams.get("limit")) || 12, 50);
      return json({ results: await searchPlaces(q, limit) });
    }

    if (rest === "nearest") {
      const lat = Number(url.searchParams.get("lat"));
      const lng = Number(url.searchParams.get("lng"));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ error: "lat and lng are required" }, 400);
      return json({ district: await nearestDistrict(lat, lng) });
    }

    const [kind, ...idParts] = rest.split("/");
    const id = idParts.join("/");
    if (kind === "provinces" && id) {
      const data = await getProvince(id);
      return data ? json(data) : json({ error: "Province not found" }, 404);
    }
    if (kind === "districts" && id) {
      const data = await getDistrict(id);
      return data ? json({ district: data }) : json({ error: "District not found" }, 404);
    }
    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("geo api failed", err);
    return json({ error: "The district list is unavailable right now." }, 503);
  }
};

