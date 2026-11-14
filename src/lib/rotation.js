/**
 * Crop-rotation planner: scores rotation strategies for a farm using
 * NASA POWER long-term climate (/api/climate), the farm profile (soil, water,
 * current crops) and the farmer's priorities.
 *
 * Pure functions, no imports: the page, the assistant and scripts/test-rotation.mjs
 * all use the same logic. Numbers are typical values for Pakistan's plains and are
 * meant for comparing options, not for exact field recommendations.
 */

/**
 * Per-crop facts. Months are 1–12. `water` is crop water need for the season (mm).
 * `nfix`: legume that fixes nitrogen. `om`: residue / organic-matter return (0–3).
 * `heatMax`: daily max (°C) above which flowering/grain-fill suffers.
 * `frost`: hurt by frost. `drought`: tolerance 0–2. `forage`: fodder value 0–2.
 * `income`: typical net income per acre, relative 0–3. `salt`: salinity tolerance 0–2.
 */
export const CROPS = {
  Wheat: { ur: "گندم", family: "cereal", sow: 11, harvest: 4, water: 450, om: 2, heatMax: 34, heatMonths: [3, 4], drought: 1, forage: 1, income: 2, salt: 1, deepRoot: false },
  Chickpea: { ur: "چنا", family: "legume", sow: 10, harvest: 3, water: 250, nfix: true, om: 1, heatMax: 32, heatMonths: [2, 3], frost: true, drought: 2, forage: 0, income: 2, salt: 0, deepRoot: true },
  Lentil: { ur: "مسور", family: "legume", sow: 11, harvest: 3, water: 250, nfix: true, om: 1, heatMax: 32, heatMonths: [2, 3], drought: 2, forage: 0, income: 2, salt: 0, deepRoot: false },
  Mustard: { ur: "سرسوں", family: "brassica", sow: 10, harvest: 3, water: 300, om: 1, heatMax: 32, heatMonths: [2, 3], frost: true, drought: 1, forage: 0, income: 2, salt: 1, deepRoot: true },
  Berseem: { ur: "برسیم", family: "legume", sow: 10, harvest: 4, water: 650, nfix: true, om: 2, heatMax: 35, heatMonths: [4], drought: 0, forage: 2, income: 1, salt: 1, deepRoot: false },
  Potato: { ur: "آلو", family: "solanum", sow: 10, harvest: 1, water: 500, om: 0, heatMax: 30, heatMonths: [10], frost: true, drought: 0, forage: 0, income: 3, salt: 0, deepRoot: false },
  Cotton: { ur: "کپاس", family: "malvaceae", sow: 5, harvest: 11, water: 900, om: 0, heatMax: 45, heatMonths: [6, 7], drought: 1, forage: 0, income: 2, salt: 2, deepRoot: true },
  Rice: { ur: "چاول", family: "cereal", sow: 7, harvest: 10, water: 1300, om: 1, heatMax: 38, heatMonths: [8, 9], drought: 0, forage: 0, income: 3, salt: 1, deepRoot: false, puddled: true },
  Maize: { ur: "مکئی", family: "cereal", sow: 7, harvest: 10, water: 550, om: 3, heatMax: 38, heatMonths: [8, 9], drought: 1, forage: 1, income: 2, salt: 0, deepRoot: true },
  Mungbean: { ur: "مونگ", family: "legume", sow: 4, harvest: 6, water: 300, nfix: true, om: 1, heatMax: 42, heatMonths: [5, 6], drought: 2, forage: 1, income: 2, salt: 0, deepRoot: false },
  Sorghum: { ur: "چری (جوار)", family: "cereal", sow: 6, harvest: 9, water: 450, om: 2, heatMax: 44, heatMonths: [7, 8], drought: 2, forage: 2, income: 1, salt: 1, deepRoot: true },
  Sesame: { ur: "تل", family: "pedaliaceae", sow: 6, harvest: 9, water: 300, om: 0, heatMax: 42, heatMonths: [7, 8], drought: 2, forage: 0, income: 2, salt: 0, deepRoot: true },
  Sesbania: { ur: "ڈھینچا (سبز کھاد)", family: "legume", sow: 5, harvest: 6, water: 250, nfix: true, om: 3, heatMax: 46, heatMonths: [5, 6], drought: 1, forage: 0, income: 0, salt: 2, deepRoot: true, greenManure: true },
  Sugarcane: { ur: "گنا", family: "cereal", sow: 2, harvest: 1, water: 1800, om: 1, heatMax: 45, heatMonths: [5, 6], drought: 0, forage: 1, income: 3, salt: 1, deepRoot: true, allYear: true },
  // United States field crops (typical Corn Belt / Plains / South timings).
  Corn: { ur: "مکئی", family: "cereal", sow: 5, harvest: 10, water: 550, om: 3, heatMax: 35, heatMonths: [7], drought: 1, forage: 1, income: 3, salt: 0, deepRoot: true, wet: 0 },
  Soybean: { ur: "سویابین", family: "legume", sow: 5, harvest: 10, water: 500, nfix: true, om: 1, heatMax: 35, heatMonths: [8], drought: 1, forage: 0, income: 2, salt: 0, deepRoot: false },
  "Winter wheat": { ur: "سرمائی گندم", family: "cereal", sow: 10, harvest: 6, water: 450, om: 2, heatMax: 32, heatMonths: [5, 6], drought: 1, forage: 1, income: 2, salt: 1, deepRoot: false },
  "Grain sorghum": { ur: "جوار", family: "cereal", sow: 5, harvest: 10, water: 450, om: 2, heatMax: 40, heatMonths: [7, 8], drought: 2, forage: 1, income: 2, salt: 1, deepRoot: true },
  "Upland cotton": { ur: "کپاس", family: "malvaceae", sow: 5, harvest: 10, water: 700, om: 0, heatMax: 40, heatMonths: [7, 8], drought: 1, forage: 0, income: 3, salt: 2, deepRoot: true, wet: 0 },
  "Rye cover crop": { ur: "رائی (ڈھانپنے والی فصل)", family: "cover", sow: 10, harvest: 4, water: 150, om: 3, heatMax: 40, heatMonths: [], drought: 2, forage: 1, income: 0, salt: 1, deepRoot: true, cover: true, wet: 2 },
  Alfalfa: { ur: "لوسرن", family: "legume", sow: 4, harvest: 3, water: 900, nfix: true, om: 2, heatMax: 40, heatMonths: [7], drought: 1, forage: 2, income: 2, salt: 1, deepRoot: true, allYear: true, wet: 0 },
};

// How each Pakistani crop copes with a high water table (0 = suffers, 1 = average, 2 = tolerates). Default 1.
Object.assign(CROPS.Chickpea, { wet: 0 });
Object.assign(CROPS.Lentil, { wet: 0 });
Object.assign(CROPS.Mustard, { wet: 0 });
Object.assign(CROPS.Potato, { wet: 0 });
Object.assign(CROPS.Cotton, { wet: 0 });
Object.assign(CROPS.Maize, { wet: 0 });
Object.assign(CROPS.Rice, { wet: 2 });
Object.assign(CROPS.Sesbania, { wet: 2 });
Object.assign(CROPS.Berseem, { wet: 2 });

/**
 * Typical money per acre for one crop, used for the income score: yield, farm-gate price and
 * growing cost. Pakistan in rupees (yield in maunds of 40 kg, price per maund), United States in
 * US dollars (yield in bushels, tons or pounds as noted, price per that unit). Approximate
 * November 2026 figures from government support prices and market reports; local prices differ,
 * so the page shows them and treats them as typical, not exact.
 */
export const MARKET = {
  PK: {
    asOf: "November 2026",
    currency: "Rs",
    crops: {
      Wheat: { yield: 32, unit: "maund", price: 3500, cost: 75000 },
      Rice: { yield: 40, unit: "maund", price: 4300, cost: 110000 },
      Cotton: { yield: 20, unit: "maund", price: 8500, cost: 120000 },
      Maize: { yield: 80, unit: "maund", price: 2300, cost: 120000 },
      Sugarcane: { yield: 700, unit: "maund", price: 425, cost: 190000 },
      Potato: { yield: 350, unit: "maund", price: 1500, cost: 380000 },
      Chickpea: { yield: 12, unit: "maund", price: 9000, cost: 45000 },
      Lentil: { yield: 10, unit: "maund", price: 10000, cost: 45000 },
      Mustard: { yield: 15, unit: "maund", price: 6000, cost: 45000 },
      Mungbean: { yield: 10, unit: "maund", price: 9000, cost: 45000 },
      Sesame: { yield: 8, unit: "maund", price: 11000, cost: 40000 },
      Berseem: { yield: 1, unit: "acre of green fodder", price: 100000, cost: 50000 },
      Sorghum: { yield: 1, unit: "acre of green fodder", price: 70000, cost: 35000 },
      Sesbania: { yield: 0, unit: "green manure", price: 0, cost: 10000 },
    },
    full: 250000, // margin per acre a year that scores 100
  },
  US: {
    asOf: "November 2026",
    currency: "$",
    crops: {
      Corn: { yield: 180, unit: "bu", price: 4.2, cost: 600 },
      Soybean: { yield: 52, unit: "bu", price: 10.2, cost: 380 },
      "Winter wheat": { yield: 50, unit: "bu", price: 5.5, cost: 230 },
      "Grain sorghum": { yield: 75, unit: "bu", price: 4, cost: 250 },
      "Upland cotton": { yield: 850, unit: "lb", price: 0.68, cost: 520 },
      "Rye cover crop": { yield: 0, unit: "cover crop", price: 0, cost: 40 },
      Alfalfa: { yield: 4, unit: "ton of hay", price: 200, cost: 550 },
    },
    full: 250,
  },
};

/**
 * Machines (or hired crews) each crop really needs. The farmer ticks what they have or can hire
 * (profile.equipment); a crop that needs something missing is flagged and scored down.
 */
export const EQUIPMENT = [
  { id: "tractor", label: "Tractor" },
  { id: "seed_drill", label: "Seed drill or planter" },
  { id: "combine", label: "Combine harvester (own or hired)" },
  { id: "transplanting", label: "Rice transplanting crew or machine" },
  { id: "cotton_picking", label: "Cotton pickers (crew or machine)" },
  { id: "potato_digger", label: "Potato digger and cold store access" },
  { id: "baler", label: "Baler or fodder chopper" },
];
export const CROP_NEEDS = {
  Wheat: ["combine"],
  Rice: ["transplanting", "combine"],
  Cotton: ["cotton_picking"],
  Potato: ["potato_digger", "tractor"],
  Sugarcane: ["tractor"],
  Maize: ["tractor"],
  Corn: ["seed_drill", "combine"],
  Soybean: ["seed_drill", "combine"],
  "Winter wheat": ["seed_drill", "combine"],
  "Grain sorghum": ["seed_drill", "combine"],
  "Upland cotton": ["cotton_picking"],
  Alfalfa: ["baler"],
};

/** Where the farmer sells (profile.markets). Changes the money a crop is worth to this farm. */
export const MARKETS = [
  { id: "mandi", label: "Grain market (mandi / elevator)" },
  { id: "sugar_mill", label: "Sugar mill nearby" },
  { id: "contract", label: "Contract with a company (seed, potato, maize)" },
  { id: "livestock", label: "Feed my own animals" },
  { id: "home", label: "Food for my household" },
];

/** Money per acre for one crop on this farm, after the farmer's market choices. */
export function cropMargin(crop, country, markets = []) {
  const table = MARKET[country === "US" ? "US" : "PK"];
  const m = table.crops[crop];
  if (!m) return null;
  let price = m.price;
  const notes = [];
  const set = new Set(markets || []);
  if (set.size) {
    if (crop === "Sugarcane" && !set.has("sugar_mill")) {
      price *= 0.75;
      notes.push("No sugar mill nearby: cane loses about a quarter of its value to transport and middlemen.");
    }
    if (set.has("contract") && ["Potato", "Maize", "Corn"].includes(crop)) {
      price *= 1.1;
      notes.push(`A company contract usually pays about 10% more for ${crop.toLowerCase()} and takes the whole crop.`);
    }
    if (set.has("livestock") && ["Berseem", "Sorghum", "Alfalfa"].includes(crop)) {
      price *= 1.3;
      notes.push(`${crop} fed to your own animals saves buying fodder, worth more than selling it.`);
    }
    if (set.has("home") && ["Wheat", "Winter wheat"].includes(crop)) {
      price *= 1.05;
      notes.push("Wheat for the household saves buying flour.");
    }
  }
  return { ...m, crop, price, revenue: Math.round(m.yield * price), margin: Math.round(m.yield * price - m.cost), notes };
}

/** Candidate rotations (one crop year, Rabi then Kharif). `id`s match ROTATION_OPTIONS where they exist. */
export const STRATEGIES = [
  { id: "wheat-cotton", crops: ["Wheat", "Cotton"] },
  { id: "wheat-rice", crops: ["Wheat", "Rice"] },
  { id: "wheat-maize", crops: ["Wheat", "Maize"] },
  { id: "wheat-fodder", crops: ["Wheat", "Sorghum"] },
  { id: "potato-maize", crops: ["Potato", "Maize"] },
  { id: "sugarcane", crops: ["Sugarcane"] },
  { id: "wheat-mungbean-maize", crops: ["Wheat", "Mungbean", "Maize"] },
  { id: "wheat-mungbean-cotton", crops: ["Wheat", "Mungbean", "Cotton"], note: "Mungbean only fits if cotton is sown late (June)." },
  { id: "wheat-sesbania-rice", crops: ["Wheat", "Sesbania", "Rice"] },
  { id: "chickpea-maize", crops: ["Chickpea", "Maize"] },
  { id: "mustard-cotton", crops: ["Mustard", "Cotton"] },
  { id: "berseem-maize", crops: ["Berseem", "Maize"] },
  { id: "lentil-sesame", crops: ["Lentil", "Sesame"] },
  { id: "chickpea-sorghum", crops: ["Chickpea", "Sorghum"] },
  // United States. `years` = length of the rotation; water and income are averaged per year.
  { id: "corn-corn", region: "US", crops: ["Corn"], years: 1 },
  { id: "corn-soybean", region: "US", crops: ["Corn", "Soybean"], years: 2 },
  { id: "corn-rye-soybean", region: "US", crops: ["Corn", "Rye cover crop", "Soybean"], years: 2, note: "Rye must be killed 1 to 2 weeks before planting; check your crop-insurance cover-crop rules." },
  { id: "corn-soybean-wheat", region: "US", crops: ["Corn", "Soybean", "Winter wheat"], years: 3, bare: [11, 12, 1, 2] },
  { id: "wheat-soybean-double", region: "US", crops: ["Winter wheat", "Soybean"], years: 1, bare: [], note: "Double-crop soybean is planted straight after wheat harvest in June; it needs a long enough season." },
  { id: "sorghum-soybean", region: "US", crops: ["Grain sorghum", "Soybean"], years: 2 },
  { id: "cotton-corn", region: "US", crops: ["Upland cotton", "Corn"], years: 2 },
  { id: "alfalfa-corn", region: "US", crops: ["Alfalfa", "Corn"], years: 4, bare: [], note: "Three years of alfalfa, then corn, which uses the nitrogen alfalfa leaves behind." },
];

/** Rotations offered in a country ("PK" default, "US"). */
export const strategiesFor = (country) => STRATEGIES.filter((s) => (s.region || "PK") === (country === "US" ? "US" : "PK"));

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Months (1–12) a crop is in the field, sow through harvest, wrapping the year end. */
export function monthsOf(crop) {
  const c = CROPS[crop];
  if (!c) return [];
  if (c.allYear) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const out = [];
  for (let m = c.sow; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === c.harvest) break;
  }
  return out;
}

/** Months with nothing growing in a rotation: the bare-field windows. */
export function bareMonths(crops) {
  const covered = new Set(crops.flatMap(monthsOf));
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((m) => !covered.has(m));
}

const SEASON_OF = (crop) => {
  const s = CROPS[crop]?.sow;
  if (crop === "Sugarcane") return "whole";
  return s >= 9 || s <= 1 ? "rabi" : "kharif";
};

/** Works out the farmer's current rotation from the profile (rotation id, or crops in the field). */
export function currentStrategy(profile = {}) {
  const byId = STRATEGIES.find((s) => s.id === profile.rotation);
  const crops = [...(profile.current_crops || []), ...(profile.previous_crops || []), ...(profile.crops || [])].filter((c) => CROPS[c]);
  if (profile.country === "US") {
    const mine = [...new Set(crops)];
    const pool = strategiesFor("US");
    const exact = pool.find((s) => s.crops.length === mine.length && s.crops.every((c) => mine.includes(c)));
    if (exact) return exact;
    if (!mine.length) return pool.find((s) => s.id === "corn-soybean");
    const picked = mine.slice(0, 2);
    return { id: picked.join("-").toLowerCase().replace(/\s+/g, "-"), region: "US", crops: picked, years: picked.length };
  }
  if (byId) return byId;
  if (crops.includes("Sugarcane") && crops.length === 1) return STRATEGIES.find((s) => s.id === "sugarcane");
  const rabi = crops.find((c) => SEASON_OF(c) === "rabi") || "Wheat";
  const kharif = crops.find((c) => SEASON_OF(c) === "kharif") || "Cotton";
  const id = `${rabi}-${kharif}`.toLowerCase();
  return STRATEGIES.find((s) => s.crops.join("-") === `${rabi}-${kharif}`) || { id, crops: [rabi, kharif] };
}

/** Default priority weights (0–3) from the farmer's season goals. */
export function weightsFromGoals(goals = []) {
  const g = new Set(goals);
  return {
    water: g.has("water") ? 3 : 1,
    soil: g.has("soil") || g.has("organic") ? 3 : 1,
    income: g.has("yield") || g.has("cost") ? 3 : g.has("livestock") ? 2 : 1,
    risk: g.has("pests") ? 3 : 2,
    forage: g.has("livestock") ? 2 : 0,
  };
}

/**
 * Scores one rotation.
 * climate: /api/climate response (monthly climatology + averages + trends), or null.
 * farm: { soil_type, irrigation_methods, goals }.
 * scenario: { tempDelta (°C), rainPct (% change) }.
 */
export function scoreStrategy(strategy, { climate, farm = {}, scenario = {}, observed = null } = {}) {
  const tempDelta = Number(scenario.tempDelta) || 0;
  const rainFactor = 1 + (Number(scenario.rainPct) || 0) / 100;
  const monthly = climate?.monthly || [];
  const mon = (m) => monthly[m - 1] || {};
  const crops = strategy.crops.filter((c) => CROPS[c]);
  const info = crops.map((c) => ({ name: c, ...CROPS[c], months: monthsOf(c) }));
  const families = new Set(info.map((c) => c.family));
  // Satellite readings (server/lib/satellite.mjs). `effects` records what each one changed, for the page.
  const sat = farm.land?.sat || null;
  const effects = [];
  // For the rotation the farmer grows now, the months the satellite actually saw bare ground
  // (MODIS NDVI below 0.25 over the last 12 months) replace the crop calendar's guess.
  const seenBare = observed && observed.known >= 9 ? observed.bare_months : null;
  const bare = seenBare || strategy.bare || bareMonths(crops);
  if (seenBare) effects.push({ source: "MODIS NDVI, last 12 months", score: "soil", text: `The satellite saw this field bare in ${seenBare.length ? seenBare.map(monthName).join(", ") : "no month"} (greenness below 0.25); used instead of the crop calendar.` });
  const us = strategy.region === "US";
  const years = strategy.years || 1;
  const land = farm.land || {};
  const methods = farm.irrigation_methods || [];
  const rainfedOnly = methods.length > 0 && methods.every((m) => m === "rainfed");
  const soil = farm.soil_type || "";

  // ---- Water: crop need minus effective rain (70 % of rain in the crop's months), more ET when hotter.
  let need = 0, rainUsed = 0;
  for (const c of info) {
    const rain = c.months.reduce((a, m) => a + (mon(m).rain_mm || 0), 0) * rainFactor * 0.7;
    const cropNeed = c.water * (1 + 0.04 * tempDelta);
    need += cropNeed;
    rainUsed += Math.min(rain, cropNeed);
    c.deficit = Math.max(0, cropNeed - rain);
  }
  need /= years;
  rainUsed /= years;
  const irrigation = Math.max(0, need - rainUsed);
  let water = clamp(100 - ((irrigation - 150) / 1500) * 100);
  if (soil === "Sandy" && info.some((c) => c.puddled)) water -= 10; // flooded rice leaks through sandy soil
  // GRACE: where the water stored underground has fallen, every extra mm pumped from a tube well
  // costs more and lowers the water table further, so thirsty rotations lose more points.
  const gw = sat?.groundwater?.value;
  if (gw != null && gw <= -5 && !rainfedOnly && irrigation > 200) {
    const pen = Math.round(Math.min(15, ((irrigation - 200) / 100) * (Math.abs(gw) / 10)));
    if (pen > 0) {
      water -= pen;
      effects.push({ source: "GRACE groundwater", score: "water", delta: -pen, text: `Water stored underground here is ${Math.abs(gw)} cm below normal (GRACE, ${sat.groundwater.date}); this rotation pumps about ${Math.round(irrigation)} mm a year, so ${pen} water points less.` });
    }
  }

  // ---- Soil health: legumes, residue, deep roots, diversity; penalties for bare months and puddling.
  const legumes = info.filter((c) => c.nfix).length;
  let soilScore =
    35 +
    legumes * 14 +
    info.reduce((a, c) => a + c.om, 0) * 5 +
    info.filter((c) => c.deepRoot).length * 3 +
    (families.size - 1) * 7 -
    bare.length * 4 -
    (info.some((c) => c.puddled) ? 15 : 0) -
    (info.some((c) => c.name === "Potato") ? 5 : 0) -
    (crops.length === 1 ? 10 : 0);
  soilScore = clamp(soilScore);

  // ---- Climate risk: heat at the sensitive stage, frost, drought without irrigation, salinity, heavy rain.
  const risks = [];
  let risk = 100;
  for (const c of info) {
    const hot = c.heatMonths.filter((m) => (mon(m).tmax_c ?? -99) + tempDelta > c.heatMax);
    if (hot.length) {
      const worst = Math.max(...hot.map((m) => (mon(m).tmax_c ?? 0) + tempDelta - c.heatMax));
      risk -= Math.min(25, 8 + worst * 3);
      risks.push({ crop: c.name, kind: "heat", months: hot, text: `${c.name}: average daytime highs pass ${c.heatMax} °C in ${hot.map(monthName).join(", ")}, when the crop is flowering or filling grain.` });
    }
    if (c.frost && (climate?.averages?.frost_days ?? 0) > 5 && c.months.some((m) => m === 12 || m === 1)) {
      risk -= 8;
      risks.push({ crop: c.name, kind: "frost", text: `${c.name}: about ${climate.averages.frost_days} frost nights a year here; frost at flowering can damage the crop.` });
    }
    if (rainfedOnly && (monthly.length ? c.deficit > 150 : c.water > 400) && c.drought < 2) {
      risk -= 15;
      risks.push({ crop: c.name, kind: "water", text: `${c.name} needs about ${c.water} mm of water${monthly.length ? `, about ${Math.round(c.deficit)} mm more than the rain gives,` : ""} and you farm without irrigation.` });
    }
    if (soil === "Saline / kallar" && c.salt === 0) {
      risk -= 10;
      risks.push({ crop: c.name, kind: "salt", text: `${c.name} handles salty${us ? "" : " (kallar)"} soil poorly.` });
    }
    if (land.waterlog === "high" && c.wet === 0) {
      risk -= 8;
      risks.push({ crop: c.name, kind: "waterlog", text: `${c.name} suffers in waterlogged soil, and the ${us ? "USDA soil survey shows poor drainage or a shallow water table on this land" : "government water-table surveys show a high water table in this province"}.` });
    }
  }
  // SMAP and MODIS heat: conditions in the field right now, for the crop sown next.
  const nowMonth = new Date().getMonth() + 1;
  const ahead = (m) => (m - nowMonth + 12) % 12;
  const next = info.filter((c) => !c.allYear && ahead(c.sow) <= 2).sort((a, b) => ahead(a.sow) - ahead(b.sow))[0];
  const sm = sat?.soil_moisture?.value;
  if (next && sm != null) {
    if (sm < 0.15 && next.drought < 2) {
      risk -= 6;
      effects.push({ source: "SMAP soil moisture", score: "risk", delta: -6, text: `SMAP shows a dry root zone now (${sm} m³/m³): ${next.name}, sown next, needs a watering before sowing (rauni) to come up well.` });
      risks.push({ crop: next.name, kind: "water", text: `The soil is dry now (NASA SMAP ${sm} m³/m³): water before sowing ${next.name}.` });
    } else if (sm > 0.4 && next.wet === 0) {
      risk -= 5;
      effects.push({ source: "SMAP soil moisture", score: "risk", delta: -5, text: `SMAP shows wet soil now (${sm} m³/m³): ${next.name}, sown next, suffers in wet soil.` });
      risks.push({ crop: next.name, kind: "waterlog", text: `The soil is very wet now (NASA SMAP ${sm} m³/m³): ${next.name} may rot or yellow if sown before it drains.` });
    }
  }
  const lst = sat?.ground_temp?.value;
  if (lst != null && lst >= 38) {
    for (const c of info.filter((x) => x.heatMonths.includes(nowMonth))) {
      risk -= 5;
      effects.push({ source: "MODIS ground heat", score: "risk", delta: -5, text: `The ground reads ${lst} °C (MODIS, ${sat.ground_temp.date}) while ${c.name} is at its heat-sensitive stage.` });
    }
  }
  // Farm equipment: a crop that needs a machine or crew the farmer can't get.
  const kit = farm.equipment;
  if (Array.isArray(kit) && kit.length) {
    for (const c of info) {
      const missing = (CROP_NEEDS[c.name] || []).filter((n) => !kit.includes(n));
      if (missing.length) {
        risk -= 8;
        const names = missing.map((id) => (EQUIPMENT.find((e) => e.id === id)?.label || id).toLowerCase());
        risks.push({ crop: c.name, kind: "equipment", text: `${c.name} needs: ${names.join("; ")}. You said you don't have or can't hire it.` });
      }
    }
  }
  const heavy = climate?.averages?.heavy_rain_days ?? 0;
  if (heavy >= 1 && info.some((c) => c.name === "Mungbean" || c.name === "Sesame")) {
    risk -= 5;
    risks.push({ kind: "rain", text: `About ${heavy} very heavy rain days (over 50 mm) a year: early monsoon rain can damage mungbean or sesame at harvest.` });
  }
  // Pest carry-over: the same crop family twice a year keeps pests and diseases going.
  const familyCounts = info.reduce((a, c) => ((a[c.family] = (a[c.family] || 0) + 1), a), {});
  if (Object.values(familyCounts).some((n) => n > 1) || (crops.length === 1 && !info[0]?.allYear) || (crops.length === 1 && !us)) {
    risk -= 6;
    risks.push({ kind: "pest", text: "Mostly one crop family, so pests and diseases carry over from season to season." });
  }
  if (crops.includes("Cotton")) risks.push({ crop: "Cotton", kind: "pest", text: "Pink bollworm and whitefly carry over unless cotton sticks are destroyed after picking." });
  if (crops.includes("Maize")) risks.push({ crop: "Maize", kind: "pest", text: "Watch for fall armyworm in maize." });
  if (strategy.id === "corn-corn") risks.push({ crop: "Corn", kind: "pest", text: "Corn after corn builds up corn rootworm and leaf diseases, and usually yields less than corn after soybean." });
  // Erosion: on sloping land (NASA SRTM), months with bare soil let rain wash the topsoil away.
  // With the 150 m slope grid (erosion hotspots), the share of sloping patches decides it.
  const slope = land.terrain?.slope_pct;
  const grid = land.slopeGrid?.summary;
  const hotShare = grid ? (grid.high + grid.medium * 0.5) / Math.max(1, grid.cells) : null;
  if (hotShare != null && hotShare >= 0.1 && bare.length >= 2) {
    const pen = Math.round(Math.min(12, 4 + hotShare * 20));
    risk -= pen;
    risks.push({ kind: "erosion", text: `${grid.high + grid.medium} of the ${grid.cells} patches around the farm slope 3% or more (NASA SRTM, up to ${grid.max_slope_pct}%), and the field is bare for ${bare.length} months: rain can wash topsoil off those patches. Keep stubble or a cover crop on them.` });
    effects.push({ source: "SRTM slope grid", score: "risk", delta: -pen, text: `Erosion hotspots cover about ${Math.round(hotShare * 100)}% of the land around the farm.` });
  } else if (hotShare == null && slope != null && slope >= 3 && bare.length >= 2) {
    risk -= slope >= 8 ? 10 : 5;
    risks.push({ kind: "erosion", text: `The land slopes about ${slope}% (NASA SRTM), and the field is bare for ${bare.length} months: heavy rain can wash topsoil away. Keep stubble or a cover crop on it.` });
  }
  risk = clamp(risk);

  // ---- Income: typical money per acre a year (MARKET), after the farmer's market choices,
  // scaled by how green this land gets at its peak (MODIS NDVI): weak land yields less.
  const margins = info.map((c) => cropMargin(c.name, us ? "US" : "PK", farm.markets)).filter(Boolean);
  const marginRaw = margins.length === info.length ? margins.reduce((a, m) => a + m.margin, 0) / years : null;
  const peak = sat?.ndvi_year?.peak;
  const cropland = [10, 12, 14].includes(sat?.land_cover?.class);
  const vigour = peak != null && cropland ? Math.max(0.8, Math.min(1.1, 0.8 + (peak - 0.45) * 0.8)) : 1;
  if (vigour !== 1) effects.push({ source: "MODIS NDVI peak", score: "income", text: `This land's greenest month reached NDVI ${peak}, so expected yields are taken as ${Math.round(vigour * 100)}% of typical.` });
  const marginPerAcre = marginRaw == null ? null : Math.round(marginRaw * vigour);
  const income =
    marginPerAcre != null
      ? clamp((marginPerAcre / MARKET[us ? "US" : "PK"].full) * 100)
      : clamp((info.reduce((a, c) => a + c.income, 0) / years / (us ? 3 : 6)) * 100);
  const forage = clamp((info.reduce((a, c) => a + c.forage, 0) / 3) * 100);

  return {
    id: strategy.id,
    crops,
    region: us ? "US" : "PK",
    years,
    note: strategy.note || null,
    bare_months: bare,
    irrigation_mm: Math.round(irrigation),
    crop_water_mm: Math.round(need),
    rain_used_mm: Math.round(rainUsed),
    legumes,
    families: families.size,
    scores: { water: Math.round(clamp(water)), soil: Math.round(soilScore), risk: Math.round(risk), income: Math.round(income), forage: Math.round(forage) },
    risks,
    margin_per_acre: marginPerAcre,
    margins,
    sat_effects: effects,
    blocked: rainfedOnly && irrigation > 450 && (monthly.length > 0 || !us) ? "Needs much more water than rain gives, and you don't have irrigation." : null,
  };
}

/** "Wheat → Mungbean → Maize", in the app language. */
export const cropName = (c, lang) => (lang === "en" || !lang ? c : CROPS[c]?.ur || c);
export const rotationTitle = (s, lang) => (s?.crops || []).map((c) => cropName(c, lang)).join(" → ");

/** Weighted overall score (0–100) for the farmer's priorities. */
export function overall(scores, weights) {
  const keys = ["water", "soil", "income", "risk", "forage"];
  const total = keys.reduce((a, k) => a + (weights[k] || 0), 0) || 1;
  return Math.round(keys.reduce((a, k) => a + (scores[k] || 0) * (weights[k] || 0), 0) / total);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthName = (m) => MONTHS[(m - 1 + 12) % 12];

/** Plain-language explanation for one scored strategy compared with the current one. */
export function explain(s, current, climate, land) {
  const why = [], benefits = [], evidence = [], gaps = [];
  const us = s.region === "US";
  const legumeCrops = s.crops.filter((c) => CROPS[c].nfix);
  const dWater = current ? current.irrigation_mm - s.irrigation_mm : 0;

  if (current && s.id !== current.id) {
    if (dWater > 50) why.push(`Needs about ${dWater} mm less irrigation a year than your current rotation.`);
    if (s.scores.soil - current.scores.soil >= 10) why.push("Builds soil faster than your current rotation.");
    if (s.scores.risk - current.scores.risk >= 10) why.push("Less exposed to heat and other weather risks on this farm.");
    if (s.bare_months.length < current.bare_months.length) why.push(`Leaves the field bare for fewer months (${s.bare_months.length} vs ${current.bare_months.length}).`);
    if (s.scores.income - current.scores.income >= 10) why.push("Likely to earn more per acre.");
  } else {
    why.push("This is what you grow now, shown as the baseline to compare against.");
  }

  if (legumeCrops.length) benefits.push(`${legumeCrops.join(" and ")} fix${legumeCrops.length === 1 ? "es" : ""} nitrogen from the air, roughly 15–30 kg N per acre, so the next crop needs less ${us ? "nitrogen fertilizer" : "urea"}.`);
  if (s.crops.some((c) => CROPS[c].cover)) benefits.push("The rye cover crop holds soil and nitrogen over winter and feeds soil life; it is not harvested.");
  if (s.crops.some((c) => CROPS[c].greenManure)) benefits.push("Sesbania is ploughed in as green manure: it adds organic matter and helps loosen salty or compact soil.");
  if (s.crops.some((c) => CROPS[c].om >= 2)) benefits.push("High-residue crops return organic matter when the stubble is kept in the field rather than burned.");
  if (s.crops.some((c) => CROPS[c].deepRoot)) benefits.push("Deep-rooting crops break hard pans and help water soak in.");
  if (s.families >= 3) benefits.push("Three different crop families in one year break pest and disease cycles.");
  if (s.scores.forage >= 60) benefits.push("Good fodder for livestock.");
  if (s.bare_months.length === 0) benefits.push("The soil is covered all year, which cuts erosion and weed growth.");

  if (climate?.period) {
    const rainYear = climate.averages?.rain_mm;
    evidence.push(`NASA POWER ${climate.period.first_year}–${climate.period.last_year}: about ${rainYear} mm rain a year at ${climate.location}. Rain covers about ${s.rain_used_mm} of the ${s.crop_water_mm} mm this rotation needs.`);
    const t = climate.trends_per_decade || {};
    if (t.heat_days != null)
      evidence.push(
        `Days above 40 °C: about ${climate.averages.heat_days} a year; the ${climate.period.last_year - climate.period.first_year + 1}-year trend is ${t.heat_days > 0 ? "+" : ""}${t.heat_days} days per decade (years vary a lot, so treat this as a rough signal).`,
      );
  } else {
    evidence.push(`NASA climate history couldn't be loaded, so water and heat use typical values for ${us ? "the Corn Belt" : "Punjab"}.`);
  }
  for (const line of land?.lines || []) evidence.push(`${land.live ? "USDA soil survey" : "Government survey"}: ${line}`);
  if (land?.terrain) evidence.push(`NASA SRTM elevation: about ${land.terrain.elevation_m} m above sea level with a ${land.terrain.slope_pct}% slope around the farm (${land.terrain.erosion_risk} erosion risk when the soil is bare).`);
  evidence.push(us ? "Crop water needs, nitrogen fixing and residue values are typical US figures (USDA / FAO)." : "Crop water needs, nitrogen fixing and residue values are typical figures for Pakistan's plains (FAO / PARC).");

  gaps.push(`Weather is from one NASA point for the ${us ? "area" : "district"} (about 50 km), not your exact field.`);
  if (land && !land.live) gaps.push(us ? "The USDA soil survey couldn't be loaded for this point, so drainage is assumed to be average." : "Government soil figures are for the whole province and decades old, not for your field.");
  gaps.push("There's no soil test for your field: nitrogen, organic matter and salt levels are assumed.");
  if (s.margin_per_acre != null) {
    const mk = MARKET[us ? "US" : "PK"];
    const money = (v) => (us ? `$${(Math.round(v * 100) / 100).toLocaleString("en-US")}` : `Rs ${Math.round(v).toLocaleString("en-US")}`);
    evidence.push(`Income uses typical ${mk.asOf} prices (${s.margins.map((m) => `${m.crop} ${money(m.price)} per ${m.unit}`).join(", ")}): about ${money(s.margin_per_acre)} per acre a year after growing costs.`);
    for (const m of s.margins) for (const n of m.notes) benefits.push(n);
    gaps.push("Prices are typical figures, not today's rate at your market; check before switching.");
  } else gaps.push("Market prices and the mill or buyer near you aren't included; check local demand before switching.");
  for (const e of s.sat_effects || []) evidence.push(`${e.source}: ${e.text}`);
  if (s.note) gaps.push(s.note);

  return { why, benefits, evidence, gaps, risks: s.risks.map((r) => r.text) };
}

/**
 * Ranks every candidate for the farm. Returns { current, ranked, top } where
 * `top` is the current rotation plus the best three alternatives.
 */
export function planRotations({ profile = {}, climate = null, weights, scenario = {}, land = null } = {}) {
  const w = weights || weightsFromGoals(profile.goals);
  const farm = { soil_type: profile.soil_type, irrigation_methods: profile.irrigation_methods, goals: profile.goals, land: land || {}, equipment: profile.equipment, markets: profile.markets };
  const yr = land?.sat?.ndvi_year;
  const observed = yr && [10, 12, 14].includes(land.sat.land_cover?.class) ? { bare_months: yr.bare_months, known: yr.months.filter((m) => m.ndvi != null).length } : null;
  const cur = currentStrategy(profile);
  const candidates = strategiesFor(profile.country);
  const pool = candidates.some((s) => s.id === cur.id) ? candidates : [cur, ...candidates];
  const scored = pool.map((s) => {
    const r = scoreStrategy(s, { climate, farm, scenario, observed: s.id === cur.id ? observed : null });
    return { ...r, total: r.blocked ? Math.min(overall(r.scores, w), 25) : overall(r.scores, w), isCurrent: s.id === cur.id };
  });
  const current = scored.find((s) => s.isCurrent);
  for (const s of scored) s.explain = explain(s, current, climate, land);
  const ranked = [...scored].sort((a, b) => b.total - a.total);
  const alternatives = ranked.filter((s) => !s.isCurrent && !s.blocked).slice(0, 3);
  const statistical = compareMethods(ranked, pool, climate, farm, scenario);
  return { current, ranked, top: [current, ...alternatives], weights: w, statistical };
}

/**
 * Second method, statistical: replays each of the last 20 years of NASA POWER weather at the
 * farm through a rotation (that year's rain and heat, month by month) and scores every year on
 * water and weather risk. The result is the average year minus half the spread between years,
 * so a rotation that does well on average but fails in dry or hot years ranks lower.
 * The rule-based score uses the 20-year average climate in one pass. Both rankings are shown
 * side by side so the farmer (or a judge) can see where the two approaches agree.
 */
export function historicalCheck(strategy, climate, farm = {}, scenario = {}) {
  const years = (climate?.yearly || []).filter((y) => Array.isArray(y.month_rain_mm) && Array.isArray(y.month_tmax_c));
  if (years.length < 8) return null;
  const tempDelta = Number(scenario.tempDelta) || 0;
  const rainFactor = 1 + (Number(scenario.rainPct) || 0) / 100;
  const info = strategy.crops.filter((c) => CROPS[c]).map((c) => ({ name: c, ...CROPS[c], months: monthsOf(c) }));
  const nYears = strategy.years || 1;
  const methods = farm.irrigation_methods || [];
  const rainfedOnly = methods.length > 0 && methods.every((m) => m === "rainfed");
  const perYear = years.map((y) => {
    let need = 0, used = 0, hits = 0;
    for (const c of info) {
      const rain = c.months.reduce((a, m) => a + (y.month_rain_mm[m - 1] || 0), 0) * rainFactor * 0.7;
      const cropNeed = c.water * (1 + 0.04 * tempDelta);
      need += cropNeed;
      used += Math.min(rain, cropNeed);
      if (rainfedOnly && cropNeed - rain > 150 && c.drought < 2) hits += 1.5; // a dry year without irrigation
      for (const m of c.heatMonths) if ((y.month_tmax_c[m - 1] ?? -99) + tempDelta > c.heatMax) hits++;
    }
    const irrigation = Math.max(0, (need - used) / nYears);
    const water = clamp(100 - ((irrigation - 150) / 1500) * 100);
    const weather = clamp(100 - hits * 15);
    return { year: y.year, irrigation_mm: Math.round(irrigation), score: (water + weather) / 2, bad: hits > 0 };
  });
  const mean = perYear.reduce((a, y) => a + y.score, 0) / perYear.length;
  const sd = Math.sqrt(perYear.reduce((a, y) => a + (y.score - mean) ** 2, 0) / perYear.length);
  const worst = perYear.reduce((a, y) => (y.score < a.score ? y : a), perYear[0]);
  return {
    years: perYear.length,
    first_year: years[0].year,
    last_year: years.at(-1).year,
    score: Math.round(clamp(mean - sd / 2)),
    mean: Math.round(mean),
    spread: Math.round(sd),
    worst_year: worst.year,
    worst_score: Math.round(worst.score),
    bad_years: perYear.filter((y) => y.bad).length,
  };
}

/** Spearman rank correlation of two equal-length lists of scores (1 = same order, -1 = reversed). */
function spearman(a, b) {
  const n = a.length;
  if (n < 3) return null;
  const rank = (xs) => {
    const r = Array(n);
    xs.map((v, i) => [v, i]).sort((p, q) => q[0] - p[0]).forEach(([, i], k) => (r[i] = k + 1));
    return r;
  };
  const ra = rank(a), rb = rank(b);
  const d2 = ra.reduce((s, r, i) => s + (r - rb[i]) ** 2, 0);
  return Math.round((1 - (6 * d2) / (n * (n * n - 1))) * 100) / 100;
}

function compareMethods(ranked, pool, climate, farm, scenario) {
  const rows = ranked
    .filter((r) => !r.blocked)
    .map((r) => ({ id: r.id, crops: r.crops, rule: r.total, isCurrent: r.isCurrent, stat: historicalCheck(pool.find((s) => s.id === r.id) || r, climate, farm, scenario) }))
    .filter((r) => r.stat);
  if (rows.length < 3) return null;
  const statOrder = [...rows].sort((a, b) => b.stat.score - a.stat.score);
  rows.forEach((r, i) => {
    r.ruleRank = i + 1;
    r.statRank = statOrder.indexOf(r) + 1;
  });
  return {
    rows,
    agreement: spearman(rows.map((r) => r.rule), rows.map((r) => r.stat.score)),
    same_top: rows[0].id === statOrder[0].id,
    stat_top: statOrder[0].id,
  };
}
