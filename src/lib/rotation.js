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
export function scoreStrategy(strategy, { climate, farm = {}, scenario = {} } = {}) {
  const tempDelta = Number(scenario.tempDelta) || 0;
  const rainFactor = 1 + (Number(scenario.rainPct) || 0) / 100;
  const monthly = climate?.monthly || [];
  const mon = (m) => monthly[m - 1] || {};
  const crops = strategy.crops.filter((c) => CROPS[c]);
  const info = crops.map((c) => ({ name: c, ...CROPS[c], months: monthsOf(c) }));
  const families = new Set(info.map((c) => c.family));
  const bare = strategy.bare || bareMonths(crops);
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
  risk = clamp(risk);

  // ---- Income and forage (relative).
  const incomeRaw = info.reduce((a, c) => a + c.income, 0) / years;
  const income = clamp((incomeRaw / (us ? 3 : 6)) * 100);
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
    scores: { water: Math.round(water), soil: Math.round(soilScore), risk: Math.round(risk), income: Math.round(income), forage: Math.round(forage) },
    risks,
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
  evidence.push(us ? "Crop water needs, nitrogen fixing and residue values are typical US figures (USDA / FAO)." : "Crop water needs, nitrogen fixing and residue values are typical figures for Pakistan's plains (FAO / PARC).");

  gaps.push(`Weather is from one NASA point for the ${us ? "area" : "district"} (about 50 km), not your exact field.`);
  if (land && !land.live) gaps.push(us ? "The USDA soil survey couldn't be loaded for this point, so drainage is assumed to be average." : "Government soil figures are for the whole province and decades old, not for your field.");
  gaps.push("There's no soil test for your field: nitrogen, organic matter and salt levels are assumed.");
  gaps.push("Market prices and the mill or buyer near you aren't included; check local demand before switching.");
  if (s.note) gaps.push(s.note);

  return { why, benefits, evidence, gaps, risks: s.risks.map((r) => r.text) };
}

/**
 * Ranks every candidate for the farm. Returns { current, ranked, top } where
 * `top` is the current rotation plus the best three alternatives.
 */
export function planRotations({ profile = {}, climate = null, weights, scenario = {}, land = null } = {}) {
  const w = weights || weightsFromGoals(profile.goals);
  const farm = { soil_type: profile.soil_type, irrigation_methods: profile.irrigation_methods, goals: profile.goals, land: land || {} };
  const cur = currentStrategy(profile);
  const candidates = strategiesFor(profile.country);
  const pool = candidates.some((s) => s.id === cur.id) ? candidates : [cur, ...candidates];
  const scored = pool.map((s) => {
    const r = scoreStrategy(s, { climate, farm, scenario });
    return { ...r, total: r.blocked ? Math.min(overall(r.scores, w), 25) : overall(r.scores, w), isCurrent: s.id === cur.id };
  });
  const current = scored.find((s) => s.isCurrent);
  for (const s of scored) s.explain = explain(s, current, climate, land);
  const ranked = [...scored].sort((a, b) => b.total - a.total);
  const alternatives = ranked.filter((s) => !s.isCurrent && !s.blocked).slice(0, 3);
  return { current, ranked, top: [current, ...alternatives], weights: w };
}
