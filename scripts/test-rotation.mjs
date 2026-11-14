// Checks for the rotation planner (src/lib/rotation.js). Run: npm run test:rotation
import assert from "node:assert/strict";
import { bareMonths, currentStrategy, monthsOf, planRotations, scoreStrategy, STRATEGIES, weightsFromGoals } from "../src/lib/rotation.js";
import { hasRotationRule, localizeRotation } from "../src/lib/rotationText.js";

// Faisalabad-like climatology (NASA POWER, rounded): rain mm/month, max and min °C.
const RAIN = [14, 22, 30, 22, 20, 35, 95, 90, 45, 8, 4, 10];
const TMAX = [19, 22, 27, 34, 39, 40, 37, 36, 35, 32, 26, 21];
const TMIN = [5, 8, 13, 19, 24, 27, 28, 27, 25, 18, 11, 6];
const climate = {
  location: "Faisalabad",
  period: { first_year: 2016, last_year: 2025 },
  monthly: RAIN.map((r, i) => ({ month: i + 1, rain_mm: r, tmax_c: TMAX[i], tmin_c: TMIN[i], soil_wetness_pct: 30 })),
  averages: { rain_mm: 395, heat_days: 28, frost_days: 3, heavy_rain_days: 1.2 },
  trends_per_decade: { rain_mm: -20, heat_days: 4, tmax_c: 0.3 },
};

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log("ok -", name);
};

test("crop months wrap the year end", () => {
  assert.deepEqual(monthsOf("Wheat"), [11, 12, 1, 2, 3, 4]);
  assert.deepEqual(monthsOf("Cotton"), [5, 6, 7, 8, 9, 10, 11]);
});

test("bare months are found", () => {
  assert.deepEqual(bareMonths(["Wheat", "Maize"]), [5, 6]);
  assert.deepEqual(bareMonths(["Wheat", "Mungbean", "Maize"]), []);
});

test("current rotation comes from the rotation id, then from crops", () => {
  assert.equal(currentStrategy({ rotation: "wheat-rice" }).id, "wheat-rice");
  assert.equal(currentStrategy({ current_crops: ["Wheat", "Sugarcane"], crops: ["Cotton"] }).id, "wheat-cotton");
  assert.equal(currentStrategy({}).id, "wheat-cotton");
});

test("rice needs far more irrigation than mungbean-maize", () => {
  const rice = scoreStrategy(STRATEGIES.find((s) => s.id === "wheat-rice"), { climate });
  const mung = scoreStrategy(STRATEGIES.find((s) => s.id === "wheat-mungbean-maize"), { climate });
  assert.ok(rice.irrigation_mm > mung.irrigation_mm + 300, `${rice.irrigation_mm} vs ${mung.irrigation_mm}`);
  assert.ok(mung.scores.soil > rice.scores.soil);
});

test("hotter, drier scenario needs more water", () => {
  const s = STRATEGIES.find((x) => x.id === "wheat-cotton");
  const base = scoreStrategy(s, { climate });
  const hot = scoreStrategy(s, { climate, scenario: { tempDelta: 2, rainPct: -20 } });
  assert.ok(hot.irrigation_mm > base.irrigation_mm);
  assert.ok(hot.scores.risk <= base.scores.risk);
});

test("rain-fed farms block thirsty rotations", () => {
  const r = scoreStrategy(STRATEGIES.find((x) => x.id === "wheat-rice"), { climate, farm: { irrigation_methods: ["rainfed"] } });
  assert.ok(r.blocked);
});

// ---- Satellite readings, machines, markets, statistical check (Nov 2026).
const sat = {
  groundwater: { value: -20, date: "2022-07-01" },
  soil_moisture: { value: 0.3, date: "2026-11-10" },
  land_cover: { class: 12, name: "cropland" },
  ndvi_year: { peak: 0.7, low: 0.2, bare_months: [5, 6], months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, ndvi: 0.5 })) },
};
const irrigated = { irrigation_methods: ["canal", "tubewell"] };

test("GRACE: falling groundwater costs thirsty rotations more water points", () => {
  const score = (id, land) => scoreStrategy(STRATEGIES.find((s) => s.id === id), { climate, farm: { ...irrigated, land } });
  const riceDrop = score("wheat-rice", {}).scores.water - score("wheat-rice", { sat }).scores.water;
  const lentilDrop = score("lentil-sesame", {}).scores.water - score("lentil-sesame", { sat }).scores.water;
  assert.ok(riceDrop > lentilDrop, `rice drop ${riceDrop} vs lentil ${lentilDrop}`);
  assert.ok(score("wheat-rice", { sat }).sat_effects.some((e) => e.source === "GRACE groundwater"));
});

test("missing machine is a risk; no machines ticked skips the check", () => {
  const s = STRATEGIES.find((x) => x.id === "wheat-cotton");
  const none = scoreStrategy(s, { climate, farm: { ...irrigated } });
  const lack = scoreStrategy(s, { climate, farm: { ...irrigated, equipment: ["tractor"] } });
  assert.ok(lack.scores.risk < none.scores.risk);
  assert.ok(lack.risks.some((r) => r.kind === "equipment"));
});

test("no sugar mill nearby lowers sugarcane income", () => {
  const s = STRATEGIES.find((x) => x.id === "sugarcane");
  const mill = scoreStrategy(s, { climate, farm: { ...irrigated, markets: ["sugar_mill"] } });
  const noMill = scoreStrategy(s, { climate, farm: { ...irrigated, markets: ["mandi"] } });
  assert.ok(noMill.margin_per_acre < mill.margin_per_acre);
});

test("satellite-observed bare months replace the calendar for the current rotation", () => {
  const p = planRotations({ profile: { current_crops: ["Wheat", "Cotton"], ...irrigated }, climate, land: { sat } });
  assert.deepEqual(p.current.bare_months, [5, 6]);
});

test("20-year statistical check ranks rotations and reports agreement", () => {
  const yearly = Array.from({ length: 20 }, (_, i) => ({
    year: 2006 + i,
    month_rain_mm: RAIN.map((r) => Math.round(r * (0.6 + ((i * 7) % 9) / 10))),
    month_tmax_c: TMAX.map((t) => t + (i % 4 === 0 ? 2 : 0)),
  }));
  const p = planRotations({ profile: { current_crops: ["Wheat", "Rice"], ...irrigated }, climate: { ...climate, yearly } });
  assert.ok(p.statistical, "statistical comparison present");
  assert.ok(p.statistical.rows.length >= 3);
  assert.ok(p.statistical.agreement >= -1 && p.statistical.agreement <= 1);
  assert.equal(planRotations({ profile: { current_crops: ["Wheat", "Rice"] }, climate }).statistical, null);
});

test("plan returns current + 3 alternatives with explanations", () => {
  const plan = planRotations({ profile: { current_crops: ["Wheat"], crops: ["Cotton"], goals: ["water", "soil"], soil_type: "Loam", irrigation_methods: ["canal", "tubewell"] }, climate });
  assert.equal(plan.top.length, 4);
  assert.ok(plan.top[0].isCurrent);
  assert.equal(new Set(plan.top.map((s) => s.id)).size, 4);
  for (const s of plan.top) {
    for (const k of ["why", "benefits", "evidence", "gaps", "risks"]) assert.ok(Array.isArray(s.explain[k]), k);
    assert.ok(s.explain.gaps.length >= 3);
  }
  // With water + soil priorities, the best alternative should beat wheat-cotton.
  assert.ok(plan.top[1].total > plan.current.total);
});

test("works without NASA data", () => {
  const plan = planRotations({ profile: {}, climate: null });
  assert.equal(plan.top.length, 4);
  assert.match(plan.top[0].explain.evidence[0], /couldn't be loaded/);
});

test("goal weights", () => {
  assert.equal(weightsFromGoals(["water"]).water, 3);
  assert.equal(weightsFromGoals(["livestock"]).forage, 2);
});

test("every planner sentence for a Pakistan farm has an Urdu/Punjabi rule", () => {
  const dry = { ...sat, soil_moisture: { value: 0.1, date: "2026-11-10" }, ground_temp: { value: 41, date: "2026-11-10" } };
  const farms = [
    { current_crops: ["Wheat", "Cotton"], ...irrigated, equipment: ["tractor"], markets: ["mandi", "contract", "livestock", "home"] },
    { current_crops: ["Wheat", "Rice"], irrigation_methods: ["rainfed"], soil_type: "Saline / kallar", province: "Sindh" },
    { current_crops: ["Sugarcane"], ...irrigated, markets: ["mandi"] },
  ];
  const lands = [
    { sat: dry, terrain: { elevation_m: 183, slope_pct: 4, erosion_risk: "medium" }, lines: ["Punjab: about 2.7 million hectares mapped as salt-affected (Soil Survey of Pakistan)."], waterlog: "high", live: false },
    { sat: { ...sat, soil_moisture: { value: 0.45, date: "2026-11-10" } }, slopeGrid: { summary: { cells: 49, high: 6, medium: 10, low: 33, max_slope_pct: 11 } }, lines: [], waterlog: "high", live: false },
    {},
  ];
  const missing = new Set();
  farms.forEach((profile, i) => {
    for (const cl of [climate, null]) {
      const p = planRotations({ profile, climate: cl, land: lands[i] });
      for (const s of p.ranked) {
        const e = s.explain;
        for (const x of [...e.why, ...e.benefits, ...e.evidence, ...e.risks, ...e.gaps, ...(s.sat_effects || []).map((y) => y.text)]) {
          if (typeof x === "string" && !hasRotationRule(x)) missing.add(x);
        }
      }
    }
  });
  assert.deepEqual([...missing], []);
  assert.match(localizeRotation("Good fodder for livestock.", "pa"), /ڈنگراں/);
  assert.equal(localizeRotation("Good fodder for livestock.", "en"), "Good fodder for livestock.");
});

const plan = planRotations({ profile: { current_crops: ["Wheat"], crops: ["Cotton"], goals: ["water", "soil"] }, climate });
console.log("\nSample ranking (water + soil priorities):");
for (const s of plan.ranked.slice(0, 6)) console.log(`  ${String(s.total).padStart(3)}  ${s.crops.join(" → ")}${s.isCurrent ? "  (current)" : ""}  irrigation ${s.irrigation_mm} mm`);
console.log(`\n${passed} rotation checks passed`);
