import { CROP_URDU, GOAL_OPTIONS, IRRIGATION_OPTIONS, ROTATION_OPTIONS } from "@/data/fixtures";

/**
 * Farm setup: the questions every farmer answers right after signing in
 * (land, water, crops and rotation, goals). The answers live on the profile
 * and are sent to Kisan AI with every question.
 */

/** Which required answers are still missing. Empty array = setup complete. */
export function missingFarmAnswers(p) {
  if (!p) return ["profile"];
  const missing = [];
  if (!(Number(p.land_acres) > 0)) missing.push("land");
  if (!p.irrigation_methods?.length && !p.irrigation) missing.push("water");
  if (!p.current_crops?.length && !p.rotation) missing.push("crops");
  if (!p.goals?.length) missing.push("goals");
  return missing;
}

/** True when the farmer should be sent to farm setup before using the app. */
export function needsFarmSetup(user, profile) {
  if (!user) return false;
  return user.onboarded === false || missingFarmAnswers(profile).length > 0;
}

/**
 * Keeps the older summary fields in step with the setup answers, so screens and
 * the assistant that read `crops` and `irrigation` keep working.
 */
export function deriveFarmFields(p) {
  const methods = p.irrigation_methods || [];
  const irrigation = methods.length
    ? methods.map((id) => IRRIGATION_OPTIONS.find((o) => o.id === id)?.en || id).join(" + ")
    : p.irrigation || "";
  const rot = ROTATION_OPTIONS.find((r) => r.id === p.rotation);
  const fromRotation = rot ? [rot.rabi, rot.kharif, rot.whole].filter((c) => c && c !== "Orchard") : [];
  const crops = [...new Set([...(p.current_crops || []), ...(p.previous_crops || []), ...fromRotation])];
  return { ...p, irrigation, crops: crops.length ? crops : p.crops || [] };
}

export const rotationOf = (id) => ROTATION_OPTIONS.find((r) => r.id === id) || null;
export const goalOf = (id) => GOAL_OPTIONS.find((g) => g.id === id) || null;
export const cropUrdu = (c) => CROP_URDU[c] || "";

/** Today's season in Pakistan: Rabi (Oct–Mar sowing, winter crops) or Kharif (Apr–Sep). */
export function currentSeason(date = new Date()) {
  const m = date.getMonth(); // 0 = Jan
  return m >= 3 && m <= 8 ? "kharif" : "rabi";
}
