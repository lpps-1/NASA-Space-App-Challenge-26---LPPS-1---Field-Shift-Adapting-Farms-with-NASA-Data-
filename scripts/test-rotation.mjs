// Checks for the rotation planner (src/lib/rotation.js). Run: npm run test:rotation
import assert from "node:assert/strict";
import { bareMonths, currentStrategy, monthsOf, planRotations, scoreStrategy, STRATEGIES, weightsFromGoals } from "../src/lib/rotation.js";

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

const plan = planRotations({ profile: { current_crops: ["Wheat"], crops: ["Cotton"], goals: ["water", "soil"] }, climate });
console.log("\nSample ranking (water + soil priorities):");
for (const s of plan.ranked.slice(0, 6)) console.log(`  ${String(s.total).padStart(3)}  ${s.crops.join(" → ")}${s.isCurrent ? "  (current)" : ""}  irrigation ${s.irrigation_mm} mm`);
console.log(`\n${passed} rotation checks passed`);
