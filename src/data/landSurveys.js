/**
 * Government land and soil survey background used in rotation advice and shown on the Data sources page.
 *
 * United States: live, per field, from the USDA NRCS soil survey (see usdaSoilAt in src/api/live.js).
 * Pakistan: there is no public per-field government soil API, so these are PROVINCE-LEVEL background
 * figures from published government surveys. They are old and coarse on purpose: the app always shows
 * them as background that needs a local soil test, never as a reading of the farmer's own field.
 */
export const PK_SURVEY = {
  punjab: {
    salt_affected_kha: 2667.5,
    waterlogged_note: "About a quarter of the irrigated area has had a severely high water table.",
    waterlog: "moderate",
  },
  sindh: {
    salt_affected_kha: 2109.6,
    waterlogged_note: "About 60% of the irrigated area has had a severely high water table, the worst in the country.",
    waterlog: "high",
  },
  kp: { salt_affected_kha: null, waterlogged_note: "Waterlogging is local, mostly in the Peshawar and Mardan valleys.", waterlog: "low" },
  balochistan: { salt_affected_kha: null, waterlogged_note: "Mostly dry land. Salinity is the bigger problem in the Nasirabad canal area.", waterlog: "low" },
};

export const PK_SURVEY_SOURCES = [
  {
    name: "Soil Survey of Pakistan",
    what: "Salt-affected land by province (reconnaissance soil surveys).",
    href: "https://www.pide.org.pk/pdf/PDR/1998/Volume4/997-1015.pdf",
  },
  {
    name: "WAPDA, SCARP Monitoring Organization",
    what: "Water-table depth surveys of the Indus canal commands (waterlogging).",
    href: "https://www.wapda.gov.pk/",
  },
  {
    name: "Pakistan Meteorological Department",
    what: "National weather service. Local forecasts in the app come from Open-Meteo, which blends global weather models.",
    href: "https://www.pmd.gov.pk/",
  },
];

/** Province name from the profile → key of PK_SURVEY. */
export function pkProvinceKey(province) {
  const p = String(province || "").toLowerCase();
  if (p.startsWith("punjab")) return "punjab";
  if (p.startsWith("sindh")) return "sindh";
  if (p.startsWith("khyber")) return "kp";
  if (p.startsWith("baloch")) return "balochistan";
  return null;
}

/**
 * One plain summary of what the government survey says about the farm's land.
 * `usda` is the live USDA result for US farms (or null). Returns
 * { country, source, lines: [text], waterlog: "low"|"moderate"|"high"|null, salinity: bool, live: bool }.
 */
export function landSummary(profile, usda) {
  if (profile?.country === "US") {
    if (!usda) return { country: "US", source: "USDA NRCS Soil Survey (SSURGO)", lines: [], waterlog: null, salinity: false, live: false };
    const wet = /poorly/i.test(usda.drainage || "") || (usda.water_table_cm != null && usda.water_table_cm < 50) || usda.hydric;
    const somewhat = /somewhat poorly|moderately well/i.test(usda.drainage || "");
    const lines = [
      `Soil map unit: ${usda.map_unit}.`,
      usda.drainage ? `Drainage class: ${usda.drainage}.` : null,
      usda.water_table_cm != null ? `Shallowest water table in a normal year: about ${Math.round(usda.water_table_cm)} cm.` : null,
      usda.water_storage_cm != null ? `Holds about ${usda.water_storage_cm.toFixed(1)} cm of plant-available water in the top metre.` : null,
      usda.flooding && usda.flooding !== "None" ? `Flooding: ${usda.flooding}.` : null,
      usda.capability_class ? `Land capability class ${usda.capability_class} (1 = few limits, 8 = not for crops).` : null,
    ].filter(Boolean);
    return { country: "US", source: usda.source, lines, waterlog: wet ? "high" : somewhat ? "moderate" : "low", salinity: false, live: true, usda };
  }
  const key = pkProvinceKey(profile?.province);
  const row = key ? PK_SURVEY[key] : null;
  const lines = [];
  if (row?.salt_affected_kha) lines.push(`${profile.province}: about ${(row.salt_affected_kha / 1000).toFixed(1)} million hectares mapped as salt-affected (Soil Survey of Pakistan).`);
  if (row?.waterlogged_note) lines.push(`${row.waterlogged_note} (WAPDA water-table surveys).`);
  return {
    country: "PK",
    source: "Soil Survey of Pakistan and WAPDA (province level)",
    lines,
    waterlog: row?.waterlog || null,
    salinity: /saline/i.test(profile?.soil_type || ""),
    live: false,
  };
}

/** Government schemes a farmer may qualify for. Amounts change often, so each card says "check current terms". */
export const SCHEMES = {
  PK: [
    {
      id: "kisan-card",
      name: "CM Punjab Kissan Card",
      by: "Government of Punjab, Bank of Punjab",
      what: "Interest-free credit for seed, fertilizer and pesticide, repaid after harvest. Launched for owners of 1 to 12.5 acres, with a per-acre limit (Rs 30,000 at launch).",
      fits: (p) => String(p.province || "").startsWith("Punjab") && Number(p.land_acres) >= 1 && Number(p.land_acres) <= 12.5,
      near: (p) => String(p.province || "").startsWith("Punjab"),
      href: "https://punjab.gov.pk/node/5690",
    },
    {
      id: "ztbl",
      name: "ZTBL crop production loans",
      by: "Zarai Taraqiati Bank Limited (federal)",
      what: "Seasonal loans for seed, fertilizer and labour, and longer loans for tube wells, tractors and land levelling. Needs a land passbook.",
      fits: (p) => Number(p.land_acres) > 0,
      near: () => true,
      href: "https://www.ztbl.com.pk/",
    },
    {
      id: "soil-test",
      name: "Soil and water testing laboratories",
      by: "Provincial agriculture departments",
      what: "A soil test shows salinity, pH and nutrients, so you buy only the fertilizer and gypsum your field needs.",
      fits: () => true,
      near: () => true,
      href: "https://agripunjab.gov.pk/",
    },
  ],
  US: [
    {
      id: "fsa-operating",
      name: "FSA farm operating loans and microloans",
      by: "USDA Farm Service Agency",
      what: "Loans for seed, fertilizer, equipment and family living costs. Microloans have a simpler application for small and beginning farms.",
      fits: () => true,
      near: () => true,
      href: "https://www.fsa.usda.gov/resources/farm-loan-programs",
    },
    {
      id: "eqip",
      name: "EQIP conservation payments",
      by: "USDA Natural Resources Conservation Service",
      what: "Cost-share for cover crops, no-till, conservation crop rotation, nutrient management and irrigation upgrades.",
      fits: () => true,
      near: () => true,
      href: "https://www.nrcs.usda.gov/programs-initiatives/eqip-environmental-quality-incentives",
    },
    {
      id: "crop-insurance",
      name: "Federal crop insurance",
      by: "USDA Risk Management Agency",
      what: "Yield and revenue cover for most field crops. Cover-crop and rotation rules differ by county, so check before you change a rotation.",
      fits: () => true,
      near: () => true,
      href: "https://www.rma.usda.gov/",
    },
  ],
};
