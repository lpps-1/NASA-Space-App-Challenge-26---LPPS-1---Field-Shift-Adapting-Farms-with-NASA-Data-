/**
 * The USUAL soil type around a district in Pakistan, for pre-filling farm setup.
 * A broad, general guide by area (Thal and Cholistan sands, the rice-belt clays,
 * Indus delta salinity, loam elsewhere), not a soil test: the screen says so and
 * the farmer can change it. Returns { soil, area } with an SOIL_OPTIONS id.
 */
const AREAS = [
  { soil: "Sandy", area: "Thal desert", districts: ["Bhakkar", "Layyah", "Khushab", "Mianwali"] },
  { soil: "Sandy", area: "Cholistan", districts: ["Bahawalpur", "Bahawalnagar"] },
  { soil: "Sandy", area: "Thar desert", districts: ["Tharparkar", "Umerkot"] },
  { soil: "Sandy", area: "southern Khyber Pakhtunkhwa", districts: ["Karak", "Lakki Marwat"] },
  { soil: "Sandy", area: "western Balochistan", districts: ["Chagai", "Kharan", "Washuk", "Nushki", "Panjgur", "Kech", "Gwadar", "Awaran"] },
  { soil: "Clay", area: "the Punjab rice belt", districts: ["Sheikhupura", "Gujranwala", "Sialkot", "Narowal", "Hafizabad", "Wazirabad"] },
  { soil: "Clay", area: "the upper Sindh rice belt", districts: ["Larkana", "Kambar Shahdadkot", "Jacobabad", "Shikarpur", "Kashmore", "Dadu"] },
  { soil: "Clay", area: "the Nasirabad plains", districts: ["Nasirabad", "Jaffarabad", "Jhal Magsi", "Sohbatpur", "Usta Muhammad"] },
  { soil: "Saline / kallar", area: "the Indus delta", districts: ["Thatta", "Sujawal", "Badin"] },
];

export function usualSoil(district) {
  if (!district) return null;
  const hit = AREAS.find((a) => a.districts.some((d) => d.toLowerCase() === String(district).toLowerCase()));
  return hit ? { soil: hit.soil, area: hit.area } : { soil: "Loam", area: null };
}
