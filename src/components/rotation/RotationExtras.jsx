import { toast } from "sonner";
import { Check, FlaskConical, Satellite, Tractor, Store } from "lucide-react";
import { EQUIPMENT, MARKETS, monthName, rotationTitle } from "@/lib/rotation";
import { useUpdateProfile } from "@/hooks/useKisanData";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/** Chips that toggle one value in a list saved on the farm profile. */
function ChipList({ items, value = [], onToggle }) {
  const { t } = useT();
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((x) => {
        const on = value.includes(x.id);
        return (
          <button
            key={x.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(x.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-ring",
              on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary",
            )}
          >
            {on && <Check className="h-3 w-3" aria-hidden="true" />}
            {t(x.label)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * What the farm can actually do: machines or crews it has or can hire, and where it sells.
 * Saved on the profile; the planner flags crops that need a missing machine and adjusts each
 * crop's money for the farmer's markets.
 */
export function FarmLimits({ profile }) {
  const { t } = useT();
  const save = useUpdateProfile();
  const toggle = (key) => async (id) => {
    const cur = profile[key] || [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    await save.mutateAsync({ [key]: next });
    toast.success(t("Saved. Scores updated."));
  };
  return (
    <section className="kisan-card grid gap-6 p-5 sm:p-6 md:grid-cols-2" data-testid="farm-limits">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg"><Tractor className="h-4 w-4 text-harvest" aria-hidden="true" />{t("Machines you have or can hire")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("Crops that need a machine you don't tick are marked as a risk. Leave all empty to skip this check.")}</p>
        <ChipList items={EQUIPMENT} value={profile.equipment || []} onToggle={toggle("equipment")} />
      </div>
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg"><Store className="h-4 w-4 text-harvest" aria-hidden="true" />{t("Where you sell")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("Changes what each crop is worth to you: no sugar mill nearby lowers sugarcane, a company contract raises potato and maize, own animals raise fodder.")}</p>
        <ChipList items={MARKETS} value={profile.markets || []} onToggle={toggle("markets")} />
      </div>
    </section>
  );
}

const SAT_ROWS = [
  { key: "ndvi", label: "Crop greenness now", fmt: (f) => `NDVI ${f.value}`, used: "Shown on the map and to Kisan AI" },
  { key: "ndvi_year", label: "Greenness over 12 months", fmt: (f, t) => `${t("peak")} ${f.peak} · ${t("bare")}: ${f.bare_months.length ? f.bare_months.map(monthName).join(", ") : t("none")}`, used: "Soil score (bare months of your current rotation) and income (yield level)" },
  { key: "soil_moisture", label: "Root-zone soil moisture", fmt: (f) => `${f.value} m³/m³`, used: "Weather-safety score for the crop sown next" },
  { key: "rain_14d", label: "Rain, last 14 days", fmt: (f) => `${f.value} mm`, used: "Shown to Kisan AI for watering advice" },
  { key: "ground_temp", label: "Ground temperature", fmt: (f) => `${f.value} °C`, used: "Weather-safety score at heat-sensitive stages" },
  { key: "groundwater", label: "Groundwater change", fmt: (f) => `${f.value > 0 ? "+" : ""}${f.value} cm`, used: "Water score: thirsty rotations lose more where groundwater has fallen" },
  { key: "land_cover", label: "Land cover at the pin", fmt: (f, t) => t(f.name), used: "Checks the pin is on farmland before using greenness" },
];

/** Every satellite reading at the farm, its date and what it changes in the scores. */
export function SatelliteFeatures({ sat, loading, current, grid }) {
  const { t } = useT();
  return (
    <section className="kisan-card p-5 text-sm sm:p-6" data-testid="satellite-features">
      <h2 className="flex items-center gap-2 font-display text-lg"><Satellite className="h-4 w-4 text-harvest" aria-hidden="true" />{t("Satellite readings in the scores")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("Read at your farm pin from the same NASA images as the map, by turning each pixel's colour back into its value with NASA's colour tables.")}</p>
      {loading && <div className="mt-4 h-40 animate-pulse rounded-xl bg-secondary" />}
      {!loading && !sat && <p className="mt-4 text-muted-foreground">{t("Set your farm's location in My farm to read satellite data at your fields.")}</p>}
      {sat && (
        <ul className="mt-4 divide-y divide-border">
          {SAT_ROWS.map((r) => {
            const f = sat[r.key];
            return (
              <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 py-2.5">
                <span className="font-medium">{t(r.label)}</span>
                <span className="text-end tabular-nums">{f ? r.fmt(f, t) : <span className="text-muted-foreground">{t("No reading (cloud or gap)")}</span>}</span>
                <span className="text-xs text-muted-foreground">{t(r.used)}</span>
                <span className="text-end text-[11px] text-muted-foreground">{f?.date || (f?.from ? `${f.from} – ${f.to}` : "")}</span>
              </li>
            );
          })}
          {grid?.summary && (
            <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 py-2.5">
              <span className="font-medium">{t("Erosion hotspots (SRTM grid)")}</span>
              <span className="text-end tabular-nums">{t("{n} of {m} patches", { n: grid.summary.high + grid.summary.medium, m: grid.summary.cells })}</span>
              <span className="text-xs text-muted-foreground">{t("Weather-safety score when the field stands bare")}</span>
              <span className="text-end text-[11px] text-muted-foreground">150 m</span>
            </li>
          )}
        </ul>
      )}
      {current?.sat_effects?.length > 0 && (
        <div className="mt-4 rounded-xl bg-secondary/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Effect on your current rotation")}</p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
            {current.sat_effects.map((e) => <li key={e.text}>{e.text}</li>)}
          </ul>
        </div>
      )}
      {sat?.groundwater && <p className="mt-3 text-[11px] text-muted-foreground">{t("GRACE groundwater: the newest map NASA GIBS publishes is from mid-2022, so it shows the long-term direction, not this year.")}</p>}
    </section>
  );
}

/** Rule-based ranking next to a 20-year statistical replay, and how far they agree. */
export function MethodsCompared({ statistical, lang }) {
  const { t } = useT();
  if (!statistical) return null;
  const rows = statistical.rows.slice(0, 6);
  const first = rows[0]?.stat;
  return (
    <section className="kisan-card p-5 text-sm sm:p-6" data-testid="methods-compared">
      <h2 className="flex items-center gap-2 font-display text-lg"><FlaskConical className="h-4 w-4 text-harvest" aria-hidden="true" />{t("Two methods compared")}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t("Rule-based: expert crop rules on the 20-year average climate. Statistical: replays each year {a}–{b} of NASA weather at your farm through the rotation and penalises years that go wrong.", { a: first?.first_year, b: first?.last_year })}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="py-2 text-start font-medium">{t("Rotation")}</th>
              <th className="py-2 text-end font-medium">{t("Rules")}</th>
              <th className="py-2 text-end font-medium">{t("20 years")}</th>
              <th className="py-2 text-end font-medium">{t("Worst year")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cn("border-t border-border", r.isCurrent && "bg-harvest/[0.08]")}>
                <td className="py-2 pe-2" dir="auto">{rotationTitle(r, lang)}</td>
                <td className="py-2 text-end tabular-nums">#{r.ruleRank} · {r.rule}</td>
                <td className="py-2 text-end tabular-nums">#{r.statRank} · {r.stat.score}</td>
                <td className="py-2 text-end tabular-nums text-muted-foreground">{r.stat.worst_year} ({r.stat.worst_score})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-xs leading-relaxed">
        {statistical.agreement != null && t("Rank agreement (Spearman): {r}.", { r: statistical.agreement })}{" "}
        {statistical.same_top ? t("Both methods pick the same best rotation.") : t("The methods pick different best rotations: look at the worst year before deciding.")}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {t("No crop-yield records exist for single fields here, so there is nothing honest to train a machine-learning model on. Both methods are open and checkable.")}
      </p>
    </section>
  );
}
