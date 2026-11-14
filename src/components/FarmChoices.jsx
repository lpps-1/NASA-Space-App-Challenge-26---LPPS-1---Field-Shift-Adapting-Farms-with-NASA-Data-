import {
  Bug,
  CalendarRange,
  Check,
  CloudRain,
  Coins,
  Droplet,
  Droplets,
  Gauge,
  Layers,
  Leaf,
  MapPin,
  Milk,
  Sprout,
  TrendingUp,
  Waves,
  Waypoints,
} from "lucide-react";
import { CROP_EMOJI, CROP_OPTIONS, CROP_SEASON, GOAL_OPTIONS, IRRIGATION_OPTIONS, SOIL_OPTIONS } from "@/data/fixtures";
import { cropUrdu, currentSeason, rotationOf } from "@/lib/farmSetup";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

const ICONS = { Bug, CalendarRange, CloudRain, Coins, Droplet, Droplets, Gauge, Layers, Leaf, Milk, Sprout, TrendingUp, Waves, Waypoints };

/** A large tappable option with an English and an Urdu name. Multi- or single-select via `selected`. */
export function OptionCard({ selected, onClick, icon, en, ur, disabled }) {
  const { lang } = useT();
  const Icon = ICONS[icon];
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex min-h-[60px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-start transition-all focus-ring active:scale-[0.98] disabled:opacity-40",
        selected ? "border-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary))]" : "border-border hover:border-foreground/25 hover:bg-secondary/60"
      )}
    >
      {Icon && (
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block font-medium leading-snug", lang === "en" ? "text-sm" : "text-[15px]")}>{lang === "en" ? en : ur || en}</span>
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  );
}

export function IrrigationPicker({ value = [], onChange }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {IRRIGATION_OPTIONS.map((o) => (
        <OptionCard key={o.id} {...o} selected={value.includes(o.id)} onClick={() => toggle(o.id)} />
      ))}
    </div>
  );
}

export function GoalPicker({ value = [], onChange, max = 3 }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {GOAL_OPTIONS.map((o) => {
        const on = value.includes(o.id);
        return <OptionCard key={o.id} {...o} selected={on} disabled={!on && value.length >= max} onClick={() => toggle(o.id)} />;
      })}
    </div>
  );
}

/** Crop chips with the Urdu name under each. */
export function CropChips({ value = [], onChange, label, max, options = CROP_OPTIONS }) {
  const { lang } = useT();
  const full = max != null && value.length >= max;
  const toggle = (c) => onChange(value.includes(c) ? value.filter((x) => x !== c) : full ? value : [...value, c]);
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5" role="group" aria-label={label}>
      {options.map((c) => {
        const on = value.includes(c);
        return (
          <button
            key={c}
            type="button"
            aria-pressed={on}
            disabled={!on && full}
            onClick={() => toggle(c)}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-sm leading-tight transition-all focus-ring active:scale-95 disabled:opacity-35",
              on ? "border-primary bg-primary/15 shadow-[inset_0_0_0_1px_hsl(var(--primary))] -translate-y-0.5" : "border-border hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-secondary/60"
            )}
          >
            <span className="text-2xl leading-none" aria-hidden="true">{CROP_EMOJI[c] || "🌱"}</span>
            <span className="text-center font-medium">{lang === "en" ? c : cropUrdu(c) || c}</span>
            {on && <Check className="absolute end-1.5 top-1.5 h-3.5 w-3.5 text-primary" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

// The crop year, starting at Rabi sowing. Rabi Oct–Apr, Kharif May–Sep.
const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const MONTH_INDEX = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2]; // calendar month → position in MONTHS

/**
 * The farmer's crop year as two furrowed bands (Rabi, Kharif) with a marker for
 * today. Whole-year crops (sugarcane, orchards, vegetables) fill one band.
 * `tone="hero"` is for the deep-green surfaces.
 */
export function CropYearStrip({ rotation, currentCrops = [], previousCrops = [], tone = "card", className }) {
  const { t, lang } = useT();
  const r = rotationOf(rotation);
  const season = currentSeason();
  const nowPos = MONTH_INDEX[new Date().getMonth()];
  // Without a rotation, place the farmer's crops (now first, then last season) by the season they grow in.
  const crops = [...currentCrops, ...previousCrops];
  const bySeason = (s) => crops.find((c) => CROP_SEASON[c] === s) || null;
  const rabi = r?.rabi || bySeason("rabi");
  const kharif = r?.kharif || bySeason("kharif");
  const whole = r?.whole || (!rabi && !kharif ? bySeason("whole") : null);
  const hero = tone === "hero";
  const empty = !whole && !rabi && !kharif;

  const band = (crop, cls, span, label) => (
    <div
      className={cn("relative flex h-14 flex-col justify-center overflow-hidden rounded-xl px-3", cls)}
      style={{ gridColumn: `span ${span} / span ${span}` }}
    >
      <span className="pointer-events-none absolute inset-0 opacity-60 [background-image:repeating-linear-gradient(90deg,hsl(0_0%_100%/0.10)_0_1px,transparent_1px_9px)]" aria-hidden="true" />
      <span className="relative text-[10px] font-semibold opacity-70">{label}</span>
      <span className="relative flex items-baseline gap-2 truncate">
        <span className="text-sm font-semibold">{crop ? (lang === "en" ? crop : cropUrdu(crop) || crop) : t("Not set")}</span>
      </span>
    </div>
  );

  return (
    <figure className={cn("w-full", className)} aria-label={t("Your crop year")} dir="ltr">
      <div className="relative pt-2">
        <div className={cn("grid grid-cols-12 gap-1", empty && "opacity-50")}>
          {whole
            ? band(whole, "bg-field text-white", 12, t("All year"))
            : (
              <>
                {band(rabi, rabi ? "bg-harvest text-soil" : hero ? "bg-white/10 text-white/60" : "bg-secondary text-muted-foreground", 7, t("Rabi (winter)"))}
                {band(kharif, kharif ? "bg-field text-white" : hero ? "bg-white/10 text-white/60" : "bg-secondary text-muted-foreground", 5, t("Kharif (summer)"))}
              </>
            )}
        </div>
        {/* Today: a small notch above the bands, so it never covers the crop name. */}
        <span
          className={cn("absolute -top-2 h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent", hero ? "border-t-white" : "border-t-foreground")}
          style={{ left: `calc(${((nowPos + 0.5) / 12) * 100}% - 5px)` }}
          aria-hidden="true"
        />
      </div>
      <div className={cn("mt-2 grid grid-cols-12 text-center text-[10px]", hero ? "text-white/50" : "text-muted-foreground")}>
        {MONTHS.map((m, i) => (
          <span key={m} className={cn(i === nowPos && (hero ? "font-semibold text-white" : "font-semibold text-foreground"))}>{m[0]}</span>
        ))}
      </div>
      <figcaption className="sr-only">
        {whole ? `${whole} all year.` : `Rabi: ${rabi || "not set"}. Kharif: ${kharif || "not set"}.`} Today is in {season === "rabi" ? "Rabi" : "Kharif"}.
      </figcaption>
    </figure>
  );
}

/** A compact read-out of the farm's setup answers. Used live during setup and on the dashboard. */
export function FarmFacts({ profile, tone = "card" }) {
  const { t, lang } = useT();
  const sep = lang === "en" ? ", " : "، ";
  const hero = tone === "hero";
  const water = (profile.irrigation_methods || []).map((id) => IRRIGATION_OPTIONS.find((o) => o.id === id)?.[lang === "en" ? "en" : "ur"]).filter(Boolean);
  const goals = (profile.goals || []).map((id) => GOAL_OPTIONS.find((g) => g.id === id)?.[lang === "en" ? "en" : "ur"]).filter(Boolean);
  const place = [profile.village, profile.tehsil, profile.district, profile.country === "US" ? profile.province : null].filter(Boolean).join(", ");
  const muted = hero ? "text-white/55" : "text-muted-foreground";
  const row = (term, value) => (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className={cn("shrink-0 text-xs", muted)}>{term}</dt>
      <dd className={cn("min-w-0 text-end text-sm", value ? "font-medium" : muted)}>{value || "—"}</dd>
    </div>
  );
  return (
    <dl className={cn("divide-y", hero ? "divide-white/10" : "divide-border")}>
      {row(t("Location"), place && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />{place}</span>)}
      {row(t("Land"), Number(profile.land_acres) > 0 ? t("{n} acres", { n: profile.land_acres }) : "")}
      {row(t("Water"), water.join(sep))}
      {row(t("Soil"), profile.soil_type && profile.soil_type !== "Not sure" ? (lang === "en" ? profile.soil_type : SOIL_OPTIONS.find((o) => o.id === profile.soil_type)?.ur) : "")}
      {row(t("In the field now"), (profile.current_crops || []).map((c) => (lang === "en" ? c : cropUrdu(c) || c)).join(sep))}
      {row(t("Goals"), goals.join(sep))}
    </dl>
  );
}
