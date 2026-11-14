import { CROP_DAYS, CROP_SEASON } from "@/data/fixtures";

/**
 * ESTIMATED growth stage from the sowing date and a typical crop duration.
 * Not a measurement: the UI always labels it "Estimated".
 * Returns { stage, day, of } where stage is an English key for t().
 */
export function estimateStage(field, today = new Date()) {
  if (!field?.sown) return null;
  if (CROP_SEASON[field.crop] === "whole" && !CROP_DAYS[field.crop]) return { stage: "Growing (orchard)", day: null, of: null };
  const days = Math.floor((today - new Date(field.sown + "T00:00:00")) / 864e5);
  const of = CROP_DAYS[field.crop] || 120;
  if (days < 0) return { stage: "Not sown yet", day: days, of };
  const f = days / of;
  const stage =
    f < 0.1 ? "Germination" : f < 0.4 ? "Vegetative growth" : f < 0.65 ? "Flowering" : f < 0.95 ? "Ripening" : "Ready to harvest";
  return { stage, day: days, of };
}
