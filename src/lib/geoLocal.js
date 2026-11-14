/**
 * Offline fallback for the /api/geo endpoints, computed from the same seed
 * dataset the API serves (db/geo/pakistan.mjs). Response shapes match the API.
 * Loaded on demand only (dynamic import), so it isn't in the main bundle.
 */
import { flattenGeo } from "../../db/geo/pakistan.mjs";

const g = flattenGeo();
const provinceById = new Map(g.provinces.map((p) => [p.id, p]));
const divisionById = new Map(g.divisions.map((d) => [d.id, d]));

const district = (d) => ({
  id: d.id,
  name: d.name,
  headquarters: d.headquarters,
  lat: d.lat,
  lng: d.lng,
  aliases: d.aliases,
  province_id: d.provinceId,
  province: provinceById.get(d.provinceId)?.name,
  division_id: d.divisionId,
  division: divisionById.get(d.divisionId)?.name ?? null,
});

export const listProvinces = () => ({
  provinces: g.provinces.map((p) => ({
    id: p.id,
    name: p.name,
    name_ur: p.nameUr,
    type: p.type,
    capital: p.capital,
    subdivision_label: p.subdivisionLabel,
    aliases: p.aliases,
    district_count: p.districtCount,
  })),
});

export function getProvince(id) {
  const p = provinceById.get(id);
  if (!p) return null;
  const byName = (a, b) => a.name.localeCompare(b.name);
  return {
    province: { id: p.id, name: p.name, name_ur: p.nameUr, type: p.type, capital: p.capital, subdivision_label: p.subdivisionLabel },
    divisions: g.divisions.filter((d) => d.provinceId === id).map(({ id, name }) => ({ id, name })).sort(byName),
    districts: g.districts.filter((d) => d.provinceId === id).map(district).sort(byName),
  };
}

export function getDistrict(id) {
  const d = g.districts.find((x) => x.id === id);
  if (!d) return null;
  return {
    district: {
      ...district(d),
      tehsils: g.tehsils.filter((t) => t.districtId === id).map((t) => ({ id: t.id, name: t.name, kind: t.kind, lat: null, lng: null })),
    },
  };
}

export function searchPlaces(q, limit = 12) {
  const term = q.trim().toLowerCase();
  const hit = (s) => s && (s.toLowerCase().startsWith(term) || s.toLowerCase().includes(" " + term));
  const districts = g.districts
    .filter((d) => hit(d.name) || hit(d.headquarters) || d.aliases.some(hit))
    .map((d) => ({ type: "district", ...district(d) }));
  const tehsils = g.tehsils
    .filter((t) => hit(t.name) && !t.districtId.endsWith("/" + t.id.split("/").pop()))
    .map((t) => ({
    type: t.kind,
    tehsil: t.name,
    tehsil_id: t.id,
    ...district(g.districts.find((d) => d.id === t.districtId)),
  }));
  const exact = (r) => ((r.tehsil || r.name).toLowerCase() === term ? 0 : 1);
  return { results: [...districts, ...tehsils].sort((a, b) => exact(a) - exact(b)).slice(0, limit) };
}

export function nearestDistrict(lat, lng) {
  const rad = (x) => (x * Math.PI) / 180;
  let best = null;
  let bestKm = Infinity;
  for (const d of g.districts) {
    const h = Math.sin(rad(d.lat - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(d.lat)) * Math.sin(rad(d.lng - lng) / 2) ** 2;
    const km = 2 * 6371 * Math.asin(Math.sqrt(h));
    if (km < bestKm) [best, bestKm] = [d, km];
  }
  return { district: best ? { ...district(best), distance_km: Math.round(bestKm) } : null };
}
