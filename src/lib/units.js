/**
 * Harvest weight units. Yields are kept in maunds (1 maund = 40 kg) and shown in the unit the
 * farmer picks in Settings → Unit & Region: maund, kg or pounds. "Automatic" shows maunds in
 * Urdu and Punjabi, kg in English (pounds for US farms).
 */
export const YIELD_UNITS = ["auto", "maund", "kg", "lb"];
const KG_PER_MAUND = 40;
const LB_PER_KG = 2.20462;

export function yieldUnit(settings, lang, country) {
  const u = settings?.yield_unit;
  if (u === "maund" || u === "kg" || u === "lb") return u;
  if (lang === "ur" || lang === "pa") return "maund";
  return country === "US" ? "lb" : "kg";
}

/** Converts maunds to the chosen unit. */
export const fromMaunds = (maunds, unit) => (unit === "kg" ? maunds * KG_PER_MAUND : unit === "lb" ? maunds * KG_PER_MAUND * LB_PER_KG : maunds);
/** Converts a value in the chosen unit back to maunds. */
export const toMaunds = (value, unit) => (unit === "kg" ? value / KG_PER_MAUND : unit === "lb" ? value / (KG_PER_MAUND * LB_PER_KG) : value);

/** "2,800 maunds" / "112,000 kg" / "246,917 lb" (translated with t). */
export function formatYield(maunds, unit, t) {
  const v = Math.round(fromMaunds(maunds, unit));
  const n = v.toLocaleString("en-US");
  return unit === "kg" ? t("{n} kg", { n }) : unit === "lb" ? t("{n} lb", { n }) : t("{n} maunds", { n });
}

/** Short unit label: "maund", "kg", "lb". */
export const unitLabel = (unit, t) => (unit === "kg" ? "kg" : unit === "lb" ? "lb" : t("maund"));
