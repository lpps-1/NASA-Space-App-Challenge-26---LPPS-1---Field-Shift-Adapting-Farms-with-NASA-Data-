import { flattenGeo } from "../../db/geo/pakistan.mjs";

/**
 * Pakistan's administrative geography (provinces, divisions, districts, tehsils),
 * served from the reviewed dataset in db/geo/pakistan.mjs. It is bundled with
 * the functions, so no database is needed. To change districts or tehsils,
 * edit that file and redeploy.
 *
 * Response shapes match the earlier Netlify Database version, so /api/geo,
 * /api/weather and the assistant's weather tool are unchanged.
 */














const g = flattenGeo();
const provinceById = new Map(g.provinces.map((p) => [p.id, p]));
const divisionById = new Map(g.divisions.map((d) => [d.id, d]));
const byName = (a, b) => a.name.localeCompare(b.name);

const toDistrict = (d) => ({
  id: d.id,
  name: d.name,
  headquarters: d.headquarters,
  lat: d.lat,
  lng: d.lng,
  aliases: d.aliases || [],
  province_id: d.provinceId,
  province: (provinceById.get(d.provinceId))?.name,
  division_id: d.divisionId ?? null,
  division: (divisionById.get(d.divisionId))?.name ?? null,
});

const DISTRICTS = g.districts.map(toDistrict);
const districtById = new Map(DISTRICTS.map((d) => [d.id, d]));
const lower = (s) => String(s || "").toLowerCase();

export async function listProvinces() {
  return [...g.provinces]
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((p) => ({
      id: p.id,
      name: p.name,
      name_ur: p.nameUr,
      type: p.type,
      capital: p.capital,
      subdivision_label: p.subdivisionLabel,
      aliases: p.aliases,
      district_count: p.districtCount,
    }));
}

export async function getProvince(id) {
  const p = provinceById.get(id);
  if (!p) return null;
  return {
    province: { id: p.id, name: p.name, name_ur: p.nameUr, type: p.type, capital: p.capital, subdivision_label: p.subdivisionLabel },
    divisions: g.divisions.filter((d) => d.provinceId === id).map(({ id, name }) => ({ id, name })).sort(byName),
    districts: DISTRICTS.filter((d) => d.province_id === id).sort(byName),
  };
}

export async function getDistrict(id) {
  const d = districtById.get(id);
  if (!d) return null;
  const tehsils = g.tehsils
    .filter((t) => t.districtId === id)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((t) => ({ id: t.id, name: t.name, kind: t.kind, lat: t.lat ?? null, lng: t.lng ?? null }));
  return { ...d, tehsils };
}

/** Name search over districts (name, HQ, aliases) and tehsils. */
export async function searchPlaces(q, limit = 12) {
  const term = lower(q).trim().slice(0, 60);
  if (!term) return [];
  const hit = (s) => {
    const v = lower(s);
    return v.startsWith(term) || v.includes(" " + term);
  };
  const districts = DISTRICTS.filter((d) => hit(d.name) || lower(d.headquarters).startsWith(term) || d.aliases.some((a) => lower(a).startsWith(term)))
    .sort(byName)
    .slice(0, limit)
    .map((d) => ({ type: "district", ...d }));
  const tehsils = g.tehsils
    .filter((t) => hit(t.name))
    .map((t) => ({ t, parent: districtById.get(t.districtId) }))
    // A tehsil named like its district (e.g. Karak in Karak) is already listed.
    .filter(({ t, parent }) => parent && lower(t.name) !== lower(parent.name))
    .sort((a, b) => byName(a.t, b.t))
    .slice(0, limit)
    .map(({ t, parent }) => ({ type: t.kind, tehsil: t.name, tehsil_id: t.id, ...parent }));
  const exact = (r) => (lower(r.tehsil || r.name) === term ? 0 : 1);
  return [...districts, ...tehsils].sort((a, b) => exact(a) - exact(b)).slice(0, limit);
}

const toRad = (x) => (x * Math.PI) / 180;
function km(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Closest district headquarters to a coordinate (for "use my location"). */
export async function nearestDistrict(lat, lng) {
  let best = null;
  let bestKm = Infinity;
  for (const d of DISTRICTS) {
    const dist = km(lat, lng, d.lat, d.lng);
    if (dist < bestKm) [best, bestKm] = [d, dist];
  }
  return best ? { ...(best), distance_km: Math.round(bestKm) } : null;
}

/**
 * Resolves a free-text place (district, HQ town, alias or tehsil) to coordinates.
 * Returns null when nothing matches, so callers can fall back to a geocoder.
 */
export async function resolvePlace(place, province) {
  const name = lower(place.replace(/\s+(district|tehsil|taluka)$/i, "").trim());
  if (!name) return null;
  const prov = lower(province).slice(0, 20);
  const inProvince = (d) => {
    if (!prov) return true;
    const p = provinceById.get(d.province_id);
    return lower(p?.name).includes(prov) || (p?.aliases || []).some((a) => lower(a) === prov);
  };
  const district = DISTRICTS.find(
    (d) => inProvince(d) && (lower(d.name) === name || lower(d.headquarters) === name || d.aliases.some((a) => lower(a) === name))
  );
  if (district) return { ...district, matched: "district"          };
  const t = g.tehsils.find((x) => lower(x.name) === name && districtById.get(x.districtId) && inProvince(districtById.get(x.districtId) ));
  if (!t) return null;
  const parent = districtById.get(t.districtId) ;
  return { ...parent, tehsil: t.name, lat: t.lat ?? parent.lat, lng: t.lng ?? parent.lng, matched: "tehsil"          };
}
