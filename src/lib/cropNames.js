import { CROP_URDU } from "@/data/fixtures";

/** A crop's name in the app language (Urdu script for Urdu and Punjabi). */
export const cropLabel = (crop, lang) => (lang && lang !== "en" && CROP_URDU[crop]) || crop;
