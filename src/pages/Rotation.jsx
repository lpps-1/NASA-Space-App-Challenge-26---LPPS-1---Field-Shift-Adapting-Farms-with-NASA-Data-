import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, ChevronDown, CloudRain, Droplets, Info, Landmark, Layers, MessagesSquare, Satellite, ShieldAlert, Sprout, Thermometer, Trophy, Wheat } from "lucide-react";
import PageHeader from "@/components/PageHeader";

// The map library is large, so it loads only when the map is shown.
const FarmMap = lazy(() => import("@/components/FarmMap"));
import { useClimate, useProfile, useSoilSurvey, useTerrain, useUpdateProfile } from "@/hooks/useKisanData";
import { landSummary } from "@/data/landSurveys";
import { cropName, monthName, monthsOf, planRotations, rotationTitle, weightsFromGoals } from "@/lib/rotation";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

const CROP_YEAR = { PK: [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9], US: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] };
const CROP_COLORS = ["bg-harvest", "bg-field", "bg-sky-500/70", "bg-harvest/50"];
const ask = (q) => `/?q=${encodeURIComponent(q)}`;

const PRIORITIES = [
  { key: "water", label: "Save water", icon: Droplets },
  { key: "soil", label: "Healthier soil", icon: Layers },
  { key: "income", label: "Income", icon: Wheat },
  { key: "risk", label: "Lower weather risk", icon: ShieldAlert },
  { key: "forage", label: "Fodder for animals", icon: Sprout },
];
const ROWS = [
  { key: "water", label: "Water saving", icon: Droplets },
  { key: "soil", label: "Soil health", icon: Layers },
  { key: "income", label: "Income", icon: Wheat },
  { key: "risk", label: "Weather safety", icon: ShieldAlert },
  { key: "forage", label: "Fodder", icon: Sprout },
];
const LEVELS = ["Ignore", "Low", "Medium", "High"];
const tone = (v) => (v >= 70 ? "bg-field" : v >= 45 ? "bg-harvest" : "bg-alert");

/** The question sent to Kisan AI when the farmer wants to talk a rotation through. */
function discussQuestion(s, current) {
  const sc = s.scores;
  const facts = `planner score ${s.total}/100; water ${sc.water}, soil ${sc.soil}, income ${sc.income}, weather safety ${sc.risk}; about ${s.irrigation_mm} mm irrigation a year; bare months: ${s.bare_months.map(monthName).join(", ") || "none"}`;
  if (s.isCurrent) return `I want to discuss my current crop rotation, ${s.crops.join(" → ")} (${facts}). How can I improve it on my farm without changing crops completely?`;
  return `I want to discuss the crop rotation ${s.crops.join(" → ")} from the rotation planner (${facts}). I grow ${current.crops.join(" → ")} now (score ${current.total}/100, about ${current.irrigation_mm} mm irrigation). For my farm, what would I change season by season, what are the risks, and what should I check locally first?`;
}

/** A score in a ring that fills in. */
function Ring({ value, size = 64, best }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="5" className="stroke-secondary" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out", best ? "stroke-harvest" : value >= 60 ? "stroke-field" : value >= 45 ? "stroke-harvest/70" : "stroke-alert")}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="absolute font-display text-lg tabular-nums">{value}</span>
    </span>
  );
}

/** One crop year as 12 cells: which crop is in the field each month, bare months marked. */
function CropYear({ s, lang, order, legend = true }) {
  const { t } = useT();
  const cell = (m) => s.crops.findIndex((c) => monthsOf(c).includes(m));
  return (
    <div>
      <div className="grid grid-cols-12 gap-0.5" dir="ltr">
        {order.map((m) => {
          const i = cell(m);
          const isBare = s.bare_months.includes(m) || i < 0;
          return (
            <div
              key={m}
              title={isBare ? t("{m}: field bare", { m: monthName(m) }) : `${monthName(m)}: ${s.crops[i]}`}
              className={cn("h-3.5 rounded-[3px]", isBare ? "border border-dashed border-alert/60 bg-alert/10" : CROP_COLORS[i % CROP_COLORS.length])}
            />
          );
        })}
      </div>
      {legend && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {s.crops.map((c, i) => (
            <span key={c} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-sm", CROP_COLORS[i % CROP_COLORS.length])} />
              {cropName(c, lang)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, items, tone: cls }) {
  const { t } = useT();
  if (!items?.length) return null;
  return (
    <div>
      <p className={cn("kisan-label", cls)}>{t(title)}</p>
      <ul className="mt-1.5 space-y-1.5 text-sm leading-relaxed">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Side-by-side table: the current rotation and the three best options, one row per measure. */
function CompareTable({ plan, weights, lang, selected, onSelect, order }) {
  const { t } = useT();
  const cols = plan.top;
  const bestTotal = Math.max(...cols.map((s) => s.total));
  const rows = ROWS.filter((r) => r.key !== "forage" || weights.forage > 0);
  const best = (fn, low = false) => {
    const v = cols.map(fn);
    return low ? Math.min(...v) : Math.max(...v);
  };
  return (
    <div className="kisan-card overflow-x-auto p-0" data-testid="compare-table">
      <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-40 p-4 text-start align-bottom"><span className="kisan-label">{t("Measure")}</span></th>
            {cols.map((s, i) => (
              <th key={s.id} className={cn("p-0 align-top font-normal", selected === s.id && "bg-primary/10")}>
                <button type="button" onClick={() => onSelect(s.id)} aria-pressed={selected === s.id} className="flex h-full w-full flex-col items-center justify-start gap-2 p-4 text-center transition-colors hover:bg-secondary/40 focus-ring">
                  <span className={cn("kisan-chip h-6 whitespace-nowrap text-[10px]", s.isCurrent ? "border-harvest/50 text-harvest" : s.total === bestTotal && "border-field/60 text-field")}>
                    {s.isCurrent ? t("Now") : s.total === bestTotal ? <><Trophy className="h-3 w-3" aria-hidden="true" /> {t("Best fit")}</> : t("Option {n}", { n: i })}
                  </span>
                  <Ring value={s.total} best={s.total === bestTotal} />
                  <span className="line-clamp-3 min-h-[3.9em] font-display text-[15px] leading-[1.3]" dir="auto" title={rotationTitle(s, lang)}>{rotationTitle(s, lang)}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const top = best((s) => s.scores[r.key]);
            return (
              <tr key={r.key} className="border-t border-border">
                <th className="p-4 text-start font-normal text-muted-foreground">
                  <span className="flex items-center gap-2"><r.icon className="h-4 w-4" aria-hidden="true" />{t(r.label)}</span>
                </th>
                {cols.map((s) => {
                  const v = s.scores[r.key];
                  return (
                    <td key={s.id} className={cn("px-4 py-3", selected === s.id && "bg-primary/10")}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className={cn("h-full rounded-full transition-all duration-700", tone(v))} style={{ width: `${v}%` }} />
                        </div>
                        <span className={cn("w-7 text-end tabular-nums", v === top && "font-bold text-foreground")}>{v}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="border-t border-border">
            <th className="p-4 text-start font-normal text-muted-foreground">{t("Irrigation a year")}</th>
            {cols.map((s) => (
              <td key={s.id} className={cn("px-4 py-3 text-center tabular-nums", selected === s.id && "bg-primary/10", s.irrigation_mm === best((x) => x.irrigation_mm, true) && "font-bold")}>
                {s.irrigation_mm.toLocaleString()} mm
                {!s.isCurrent && Math.abs(plan.current.irrigation_mm - s.irrigation_mm) >= 30 && (
                  <span className={cn("block text-[11px] font-normal", plan.current.irrigation_mm > s.irrigation_mm ? "text-field" : "text-alert")}>
                    {plan.current.irrigation_mm > s.irrigation_mm ? "−" : "+"}{Math.abs(plan.current.irrigation_mm - s.irrigation_mm)} mm
                  </span>
                )}
              </td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <th className="p-4 text-start font-normal text-muted-foreground">{t("Months the field is bare")}</th>
            {cols.map((s) => (
              <td key={s.id} className={cn("px-4 py-3 text-center tabular-nums", selected === s.id && "bg-primary/10", s.bare_months.length === best((x) => x.bare_months.length, true) && "font-bold")}>
                {s.bare_months.length}
              </td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <th className="p-4 text-start font-normal text-muted-foreground">{t("Field calendar")}</th>
            {cols.map((s) => (
              <td key={s.id} className={cn("px-4 py-3", selected === s.id && "bg-primary/10")}>
                <CropYear s={s} lang={lang} order={order} legend={false} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        {t("Scores are out of 100, higher is better. Calendar: {first} to {last}; dashed red = bare field. Tap a column to see its details.", { first: monthName(order[0]), last: monthName(order[11]) })}
      </p>
    </div>
  );
}

function Details({ s, plan, lang, order, chosen, onChoose }) {
  const { t } = useT();
  return (
    <article className="kisan-card rise-in p-5 sm:p-6" key={s.id} data-testid="rotation-details">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="kisan-label">{s.isCurrent ? t("Your current rotation") : t("Rotation in detail")}</p>
          <h3 className="mt-1 font-display text-2xl leading-snug" dir="auto">{rotationTitle(s, lang)}</h3>
          {s.years > 1 && <p className="mt-1 text-xs text-muted-foreground">{t("A {n}-year rotation; water and income are averaged per year.", { n: s.years })}</p>}
        </div>
        <Ring value={s.total} size={72} />
      </div>
      <div className="mt-4">
        <CropYear s={s} lang={lang} order={order} />
        {s.bare_months.length > 0 && <p className="mt-1 text-[11px] text-alert">{t("Bare: {months}", { months: s.bare_months.map(monthName).join(", ") })}</p>}
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Section title="Why it was suggested" items={s.explain.why} />
        <Section title="Benefits" items={s.explain.benefits} tone="!text-field" />
        <Section title="Evidence" items={s.explain.evidence} />
        <Section title="Risks to check locally" items={s.explain.risks} tone="!text-alert" />
        <div className="md:col-span-2"><Section title="What we don't know" items={s.explain.gaps} /></div>
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link to={ask(discussQuestion(s, plan.current))} className="kisan-btn-gold flex-1 focus-ring" data-testid="discuss-rotation">
          <MessagesSquare className="h-4 w-4" aria-hidden="true" /> {t("Discuss this rotation with Kisan AI")}
        </Link>
        {!s.isCurrent && (
          <button onClick={() => onChoose(s)} className={cn("kisan-btn-ghost focus-ring", chosen && "!border-field !text-field")} data-testid="choose-rotation">
            {chosen ? <><Check className="h-4 w-4" aria-hidden="true" /> {t("This is my plan")}</> : t("Make this my plan")}
          </button>
        )}
      </div>
    </article>
  );
}

/** Monthly rain bars and daytime highs from the 20-year NASA POWER record. */
function ClimatePanel({ climate, scenario, order }) {
  const { t } = useT();
  if (!climate) return null;
  const maxRain = Math.max(...climate.monthly.map((m) => m.rain_mm || 0), 1);
  const a = climate.averages || {};
  const tr = climate.trends_per_decade || {};
  const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
  return (
    <section className="kisan-card p-5 sm:p-6" aria-labelledby="climate-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="climate-title" className="font-display text-xl">
          {t("Your climate, {from}–{to}", { from: climate.period.first_year, to: climate.period.last_year })}
        </h2>
        <a href={climate.source_url} target="_blank" rel="noreferrer" className="kisan-chip text-[11px]"><Satellite className="h-3 w-3" aria-hidden="true" /> NASA POWER</a>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("Average month at {place}. Bars: rain. Numbers: average daytime high.", { place: climate.location })}
      </p>
      <div className="mt-5 grid grid-cols-12 items-end gap-1" dir="ltr" style={{ height: 120 }}>
        {order.map((m) => {
          const d = climate.monthly[m - 1];
          const rain = (d.rain_mm || 0) * (1 + (scenario.rainPct || 0) / 100);
          const hot = (d.tmax_c ?? 0) + (scenario.tempDelta || 0) > 40;
          return (
            <div key={m} className="flex h-full flex-col items-center justify-end gap-1">
              <span className={cn("text-[9px] tabular-nums", hot ? "font-semibold text-alert" : "text-muted-foreground")}>
                {Math.round((d.tmax_c ?? 0) + (scenario.tempDelta || 0))}°
              </span>
              <div className="w-full rounded-t-sm bg-sky-500/60 transition-all duration-500" style={{ height: `${Math.max(2, (rain / maxRain) * 80)}px` }} title={`${Math.round(rain)} mm`} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-12 gap-1 text-center text-[9px] text-muted-foreground" dir="ltr">
        {order.map((m) => <span key={m}>{monthName(m)}</span>)}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t("Rain a year"), `${a.rain_mm} mm`, tr.rain_mm != null ? t("{n} mm per decade", { n: sign(tr.rain_mm) }) : null, CloudRain],
          [t("Days above 40 °C"), a.heat_days, tr.heat_days != null ? t("{n} days per decade", { n: sign(tr.heat_days) }) : null, Thermometer],
          [t("Frost nights"), a.frost_days, null, null],
          [t("Very heavy rain days"), a.heavy_rain_days, null, null],
        ].map(([k, v, sub, Icon]) => (
          <div key={k} className="rounded-xl bg-secondary/60 p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">{Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{k}</dt>
            <dd className="mt-1 font-display text-lg tabular-nums">{v}</dd>
            {sub && <dd className="text-[11px] text-muted-foreground">{sub}</dd>}
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("Satellite and model data for one point in your district (about 50 km wide). A rain gauge or weather station on your farm is more exact. Year-to-year swings are large, so treat trends as rough signals.")}
      </p>
    </section>
  );
}

function Slider({ label, value, min, max, step, onChange, display, icon: Icon }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          {label}
        </span>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">{display}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--primary))]" />
    </label>
  );
}

export default function Rotation() {
  const { t, lang } = useT();
  const { data: profile, isLoading } = useProfile();
  const { data: climate, isLoading: climateLoading } = useClimate();
  const { data: usda, isLoading: soilLoading } = useSoilSurvey();
  const saveProfile = useUpdateProfile();
  const [weights, setWeights] = useState(null);
  const [scenario, setScenario] = useState({ tempDelta: 0, rainPct: 0 });
  const [showAll, setShowAll] = useState(false);
  const [picked, setPicked] = useState(null);
  const w = weights || weightsFromGoals(profile?.goals);
  const { data: terrain } = useTerrain();
  const land = useMemo(() => (profile ? { ...landSummary(profile, usda), terrain: terrain || null } : null), [profile, usda, terrain]);

  const plan = useMemo(() => (profile ? planRotations({ profile, climate, weights: w, scenario, land }) : null), [profile, climate, w, scenario, land]);

  if (isLoading || !plan) return <div className="kisan-card h-96 animate-pulse" />;

  const us = profile.country === "US";
  const order = CROP_YEAR[us ? "US" : "PK"];
  const best = plan.top.find((s) => !s.isCurrent) || plan.current;
  const better = best.total > plan.current.total;
  const selected = plan.top.find((s) => s.id === picked) || best;
  const saved = plan.current.irrigation_mm - best.irrigation_mm;
  const changed = scenario.tempDelta !== 0 || scenario.rainPct !== 0;

  const choose = async (s) => {
    const off = profile.planned_rotation === s.id;
    await saveProfile.mutateAsync({ planned_rotation: off ? "" : s.id, planned_rotation_title: off ? "" : s.crops.join(" → ") });
    toast.success(off ? t("Plan cleared") : t("Saved as your plan. Kisan AI will use it in its advice."));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("Rotation planner")}
        title={t("Compare crop rotations for your farm")}
        description={t(
          "Your current rotation next to the three that best fit your priorities, using 20 years of NASA climate data for {place}, your soil and your water.",
          { place: profile.district || t("your district") },
        )}
      />

      {/* The answer first: what the data suggests, against what the farmer grows now. */}
      <section className="kisan-hero p-6 sm:p-8" data-testid="rotation-hero">
        <p className="kisan-label relative flex items-center gap-2 !text-harvest">
          <Satellite className="h-3.5 w-3.5" aria-hidden="true" />
          {better ? t("Best fit for your farm") : t("Your current rotation already fits best")}
          {changed && <span className="kisan-chip border-white/20 bg-white/10 text-[10px] normal-case tracking-normal text-white">{t("What-if scenario on")}</span>}
        </p>
        <div className="relative mt-4 grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="text-xs text-white/60">{t("You grow now")}</p>
            <p className="mt-1 font-display text-2xl text-white/90" dir="auto">{rotationTitle(plan.current, lang)}</p>
            <p className="mt-1 text-sm text-white/60 tabular-nums">{plan.current.total} / 100</p>
          </div>
          <ArrowRight className="hidden h-6 w-6 text-harvest md:block rtl:rotate-180" aria-hidden="true" />
          <div>
            <p className="text-xs text-white/60">{better ? t("Suggested") : t("Closest alternative")}</p>
            <p className="mt-1 font-display text-3xl text-harvest" dir="auto">{rotationTitle(best, lang)}</p>
            <p className="mt-1 text-sm text-white/80 tabular-nums">{best.total} / 100</p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          {saved > 50 && <span className="kisan-chip border-white/15 bg-white/10 text-white"><Droplets className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />{t("{mm} mm less irrigation a year", { mm: saved })}</span>}
          {best.scores.soil - plan.current.scores.soil >= 5 && <span className="kisan-chip border-white/15 bg-white/10 text-white"><Layers className="h-3.5 w-3.5 text-harvest" aria-hidden="true" />{t("Soil score +{n}", { n: best.scores.soil - plan.current.scores.soil })}</span>}
          {plan.current.bare_months.length - best.bare_months.length > 0 && <span className="kisan-chip border-white/15 bg-white/10 text-white">{t("{n} fewer bare months", { n: plan.current.bare_months.length - best.bare_months.length })}</span>}
          {best.legumes > 0 && <span className="kisan-chip border-white/15 bg-white/10 text-white"><Sprout className="h-3.5 w-3.5 text-harvest" aria-hidden="true" />{t("Adds a nitrogen-fixing crop")}</span>}
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2.5">
          <Link to={ask(discussQuestion(best, plan.current))} className="kisan-btn-gold focus-ring">
            <MessagesSquare className="h-4 w-4" aria-hidden="true" /> {t("Discuss with Kisan AI")}
          </Link>
          <a href="#compare" className="kisan-btn-ghost focus-ring">{t("See the comparison")}</a>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section id="compare" aria-labelledby="compare-title" className="scroll-mt-6">
            <h2 id="compare-title" className="mb-3 font-display text-xl">{t("Side by side")}</h2>
            <CompareTable plan={plan} weights={w} lang={lang} selected={selected.id} onSelect={setPicked} order={order} />
          </section>

          <Details s={selected} plan={plan} lang={lang} order={order} chosen={profile.planned_rotation === selected.id} onChoose={choose} />

          {climateLoading ? <div className="kisan-card h-64 animate-pulse" /> : <ClimatePanel climate={climate} scenario={scenario} order={order} />}
          <Suspense fallback={<div className="kisan-card h-96 animate-pulse" />}>
            <FarmMap />
          </Suspense>
          {!climateLoading && !climate && (
            <p className="kisan-card flex gap-2 p-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t("NASA climate history couldn't be loaded, so the scores use typical values. Set your location in My farm, or try again later.")}
            </p>
          )}

          <section className="kisan-card p-5">
            <button type="button" onClick={() => setShowAll((v) => !v)} className="flex w-full items-center justify-between text-sm font-medium focus-ring" aria-expanded={showAll}>
              {t("All {n} rotations ranked", { n: plan.ranked.length })}
              <ChevronDown className={cn("h-4 w-4 transition-transform", showAll && "rotate-180")} aria-hidden="true" />
            </button>
            {showAll && (
              <ol className="mt-4 divide-y divide-border text-sm">
                {plan.ranked.map((s, i) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0" dir="auto">
                      <span className="me-2 tabular-nums text-muted-foreground">{i + 1}.</span>
                      {rotationTitle(s, lang)}
                      {s.isCurrent && <span className="kisan-chip ms-2 text-[10px]">{t("Now")}</span>}
                      {s.blocked && <span className="ms-2 text-xs text-alert">{t(s.blocked)}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-3 tabular-nums">
                      <span>{s.total} <span className="text-xs text-muted-foreground">· {s.irrigation_mm} mm</span></span>
                      <Link to={ask(discussQuestion(s, plan.current))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-ring" aria-label={`${t("Discuss with Kisan AI")}: ${s.crops.join(" → ")}`}>
                        <MessagesSquare className="h-4 w-4" />
                      </Link>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <section className="kisan-card p-5">
            <h2 className="font-display text-lg">{t("What matters to you")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("Set from your season goals. Move a slider to re-rank.")}</p>
            <div className="mt-4 space-y-4">
              {PRIORITIES.map((p) => (
                <Slider key={p.key} label={t(p.label)} icon={p.icon} min={0} max={3} step={1} value={w[p.key] || 0} display={t(LEVELS[w[p.key] || 0])} onChange={(v) => setWeights({ ...w, [p.key]: v })} />
              ))}
            </div>
          </section>

          <section className="kisan-card p-5">
            <h2 className="font-display text-lg">{t("What if the weather changes?")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("Test each rotation against a hotter or drier future.")}</p>
            <div className="mt-4 space-y-4">
              <Slider label={t("Hotter by")} icon={Thermometer} min={0} max={3} step={0.5} value={scenario.tempDelta} display={`+${scenario.tempDelta} °C`} onChange={(v) => setScenario({ ...scenario, tempDelta: v })} />
              <Slider label={t("Rain change")} icon={CloudRain} min={-40} max={30} step={10} value={scenario.rainPct} display={`${scenario.rainPct > 0 ? "+" : ""}${scenario.rainPct}%`} onChange={(v) => setScenario({ ...scenario, rainPct: v })} />
            </div>
            {changed && <button onClick={() => setScenario({ tempDelta: 0, rainPct: 0 })} className="mt-4 text-xs font-medium text-primary hover:underline focus-ring">{t("Back to today's climate")}</button>}
          </section>

          <section className="kisan-card p-5 text-sm" data-testid="land-survey">
            <h2 className="flex items-center gap-2 font-display text-lg"><Landmark className="h-4 w-4 text-harvest" aria-hidden="true" />{t("Government soil survey")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{land.source}{land.live && <span className="ms-2 rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">{t("Live")}</span>}</p>
            {soilLoading && us && <div className="mt-3 h-16 animate-pulse rounded-xl bg-secondary" />}
            <ul className="mt-3 space-y-1.5 leading-relaxed">
              {land.lines.map((x) => <li key={x}>{x}</li>)}
              {!land.lines.length && !soilLoading && <li className="text-muted-foreground">{us ? t("The USDA soil survey has no data for this point.") : t("No province-level survey figures for this area.")}</li>}
            </ul>
            {land.waterlog && (
              <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-xs">
                {t("Waterlogging risk used in the scores")}: <span className={cn("font-semibold", land.waterlog === "high" ? "text-alert" : land.waterlog === "moderate" ? "text-harvest" : "text-field")}>{t(land.waterlog === "high" ? "High" : land.waterlog === "moderate" ? "Medium" : "Low")}</span>
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {us ? t("Read live for your location. It maps soil types, not this season's condition.") : t("Province-level background from older surveys, not your field. A soil and water test from your district laboratory is the real answer.")}
            </p>
            <Link to="/knowledge" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">{t("All data sources")} <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden="true" /></Link>
          </section>

          <section className="kisan-card p-5 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 text-harvest" aria-hidden="true" />
              {t("This tool supports your judgment")}
            </p>
            <p className="mt-2 text-muted-foreground">
              {t("Scores compare options using typical crop figures and NASA climate data. They don't know your field's soil test, seed, market or labour. Talk to your agriculture extension officer before changing a rotation.")}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
