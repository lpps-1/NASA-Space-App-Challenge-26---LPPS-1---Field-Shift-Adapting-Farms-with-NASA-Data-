/**
 * Farmer identity helpers.
 *
 * The display name is its own field and is never derived from the email
 * address or account id. If a farmer has not set a name yet, the UI shows a
 * neutral "Kisan" instead of the email username.
 */

export const FALLBACK_NAME = "Kisan";

/** The saved display name, or "" when the farmer hasn't set one. */
export function displayNameOf(profile) {
  const name = profile?.display_name ?? profile?.full_name ?? "";
  return typeof name === "string" ? name.trim() : "";
}

/** "Muhammad Aslam" → "MA"; "محمد اسلم" → "م ا". Empty name → "K". */
export function initialsOf(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "K";
  const letters = (words.length > 1 ? [words[0], words[words.length - 1]] : [words[0]]).map((w) => [...w][0]);
  const arabic = /[؀-ۿ]/.test(letters.join(""));
  return arabic ? letters.join(" ") : letters.join("").toUpperCase();
}

/** First name for greetings ("Muhammad Aslam" → "Muhammad Aslam" if short, else first word). */
export function greetingName(profile) {
  const name = displayNameOf(profile);
  if (!name) return FALLBACK_NAME;
  return name.length <= 18 ? name : name.split(/\s+/)[0];
}

/**
 * Normalises a profile record so identity fields stay separate and in sync:
 * display_name (canonical) ↔ full_name (legacy alias), avatar_initials from the
 * name, preferred_language ↔ language.
 */
export function normalizeProfile(p) {
  if (!p) return p;
  const display_name = displayNameOf(p);
  const preferred_language = p.preferred_language || p.language || "ur";
  return {
    ...p,
    display_name,
    full_name: display_name,
    avatar_initials: initialsOf(display_name),
    preferred_language,
    language: preferred_language,
  };
}

/** Applies a patch, keeping legacy aliases from overriding the canonical field. */
export function mergeProfile(prev, patch) {
  const next = { ...prev, ...patch };
  if ("display_name" in patch) next.full_name = patch.display_name;
  else if ("full_name" in patch) next.display_name = patch.full_name;
  if ("preferred_language" in patch) next.language = patch.preferred_language;
  else if ("language" in patch) next.preferred_language = patch.language;
  // Identity is owned by the account, not by profile edits.
  if (prev?.user_id) next.user_id = prev.user_id;
  if (prev?.email) next.email = prev.email;
  return normalizeProfile(next);
}
