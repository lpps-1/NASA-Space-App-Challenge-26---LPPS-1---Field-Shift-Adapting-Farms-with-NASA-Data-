/**
 * Rule-based farm alerts and advisories for the dashboard, computed from the
 * live district forecast, the farmer's crops, fields and tasks. These are
 * plain agronomy rules (not AI output); each one links to Kisan AI for a
 * detailed answer.
 */

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Alerts, most severe first. level: "danger" | "warning" | "info". */
export function farmAlerts({ weather, tasks = [], fields = [] }) {
  const out = [];
  const days = weather?.forecast || [];
  const soon = days.slice(0, 4);

  const storm = soon.find((d) => (d.rain_mm ?? 0) >= 15 || d.rain >= 80);
  const rain = storm || soon.find((d) => d.rain >= 55 || (d.rain_mm ?? 0) >= 5);
  if (rain) {
    out.push({
      id: "rain",
      level: storm ? "danger" : "warning",
      title: storm ? `Heavy rain likely ${rain.day}` : `Rain expected ${rain.day}`,
      body: `${rain.rain}% chance${rain.rain_mm != null ? `, about ${rain.rain_mm} mm` : ""}. Hold urea and pesticide sprays until after it${storm ? ", and open field drains so water doesn't stand" : ""}.`,
      ask: `Rain is expected ${rain.day} in ${weather.location}. What should I do on my farm before and after it?`,
    });
  }
  const frost = soon.find((d) => d.lo <= 3);
  if (frost) {
    out.push({
      id: "frost",
      level: frost.lo <= 0 ? "danger" : "warning",
      title: `Frost risk ${frost.day} (low ${frost.lo}°)`,
      body: "Give a light irrigation the evening before to protect young crops and vegetables.",
      ask: `Frost is possible ${frost.day} in ${weather.location}. How do I protect my crops?`,
    });
  }
  const heat = soon.find((d) => d.hi >= 40);
  if (heat) {
    out.push({
      id: "heat",
      level: heat.hi >= 44 ? "danger" : "warning",
      title: `Heat stress ${heat.day} (high ${heat.hi}°)`,
      body: "Irrigate in the evening or early morning and avoid spraying in the afternoon.",
      ask: `It will reach ${heat.hi}° ${heat.day} in ${weather.location}. How do I protect my crops from heat?`,
    });
  }

  const today = todayIso();
  const overdue = tasks.filter((t) => !t.done && t.date < today);
  if (overdue.length) {
    out.push({
      id: "overdue",
      level: "warning",
      title: overdue.length === 1 ? `Overdue: ${overdue[0].title}` : `${overdue.length} farm tasks are overdue`,
      body: overdue.length === 1 ? `Planned for ${overdue[0].field || "your farm"}.` : overdue.map((t) => t.title).slice(0, 3).join(" · "),
      link: "/calendar",
    });
  }

  // Problems the farmer reported in a field (the app never guesses crop health).
  const reported = fields.filter((f) => f.issues?.length);
  for (const f of reported.slice(0, 2)) {
    const issue = f.issues[f.issues.length - 1];
    out.push({
      id: `issue-${f.id}`,
      level: "warning",
      title: `${f.crop} in ${f.name}: you reported a problem`,
      body: issue.note || "Open the field or ask Kisan AI what to do next.",
      ask: `My ${f.crop} in ${f.name} has this problem: ${issue.note || issue.type}. What is the likely cause and what should I do?`,
    });
  }

  if (weather?.sample) {
    out.push({
      id: "sample",
      level: "info",
      title: "Live weather unavailable",
      body: "Showing sample weather. Check your district in your profile, or try again later.",
      link: "/profile",
    });
  }
  const rank = { danger: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/** Up to three seasonal and weather-aware recommendations for the farmer's crops. */
export function recommendations({ weather, profile, fields = [], date = new Date() }) {
  const month = date.getMonth() + 1;
  const crops = new Set([...(profile?.crops || []), ...fields.map((f) => f.crop)].map((c) => String(c).toLowerCase()));
  const has = (c) => crops.has(c);
  const place = profile?.district || weather?.location || "my district";
  const out = [];
  const days = weather?.forecast || [];
  const rainSoon = days.slice(0, 3).some((d) => d.rain >= 50 || (d.rain_mm ?? 0) >= 4);
  const et = days.slice(0, 7).reduce((s, d) => s + (d.et0_mm ?? 0), 0);
  const rainWeek = days.slice(0, 7).reduce((s, d) => s + (d.rain_mm ?? 0), 0);

  if (has("wheat") && (month === 10 || month === 11)) {
    out.push({
      id: "wheat-sowing",
      crop: "Wheat",
      title: "Wheat sowing window is open",
      body: "In the irrigated plains the best window is roughly 1–25 November. Each week of delay after that costs yield, so prepare seed and DAP now.",
      ask: `What is the best wheat sowing date, seed rate and variety for ${place}?`,
    });
  }
  if (has("wheat") && (month === 12 || month === 1)) {
    out.push({
      id: "wheat-first-water",
      crop: "Wheat",
      title: "First irrigation and urea for wheat",
      body: "Give the first irrigation about 20–25 days after sowing, with the first urea split. Check for weeds after the first water.",
      ask: `When should I give the first irrigation and urea to my wheat in ${place}?`,
    });
  }
  if (has("cotton") && month >= 9 && month <= 12) {
    out.push({
      id: "cotton-sticks",
      crop: "Cotton",
      title: "Break the pink bollworm cycle",
      body: "After the final picking, remove and destroy cotton sticks and unopened bolls so the pest doesn't carry over to next season.",
      ask: "How do I clear my cotton field after the last picking to control pink bollworm?",
    });
  }
  if (has("cotton") && month >= 4 && month <= 8) {
    out.push({
      id: "cotton-whitefly",
      crop: "Cotton",
      title: "Scout cotton for whitefly and jassid",
      body: "Check 25 leaves across the field twice a week. Spray only when pest numbers cross the economic threshold.",
      ask: "What is the economic threshold for whitefly in cotton and how do I count it?",
    });
  }
  if (has("sugarcane") && (month >= 10 || month <= 3)) {
    out.push({
      id: "cane-harvest",
      crop: "Sugarcane",
      title: "Plan sugarcane harvest and ratoon",
      body: "Book your mill slot early. After harvest, shave stubble at ground level and gap-fill for a strong ratoon crop.",
      ask: "How should I manage my sugarcane ratoon crop after harvest?",
    });
  }
  if (has("rice") && month >= 6 && month <= 8) {
    out.push({
      id: "rice-transplant",
      crop: "Rice",
      title: "Rice transplanting care",
      body: "Keep 1–2 inches of standing water for the first weeks after transplanting and watch for stem borer.",
      ask: `What should I do in the first month after transplanting rice in ${place}?`,
    });
  }

  if (days.length) {
    if (rainSoon) {
      out.push({
        id: "rain-hold",
        crop: null,
        title: "Skip the next irrigation if the rain arrives",
        body: "Rain is forecast in the next three days. Hold fertilizer and sprays until after it so they aren't washed off.",
        ask: `Rain is forecast in ${place}. Should I delay irrigation, urea or spraying?`,
      });
    } else if (et > 0) {
      const need = Math.max(0, Math.round(et - rainWeek));
      out.push({
        id: "water-balance",
        crop: null,
        title: "Crops will use about {mm} mm of water this week",
        body:
          need > 15
            ? "Expected rain covers only {rain} mm, so plan irrigation according to your crop stage."
            : "Expected rain covers most of it. Check soil moisture before irrigating.",
        vars: { mm: Math.round(et), rain: Math.round(rainWeek) },
        ask: `My crops will use about ${Math.round(et)} mm of water this week in ${place}. How should I plan irrigation?`,
      });
    }
  }
  return out.slice(0, 3);
}
