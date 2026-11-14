import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, CalendarDays, CalendarX, Check, ChevronDown, CloudRain, Droplets, Info, Landmark, Layers, MessagesSquare, Satellite, ShieldAlert, Sprout, Thermometer, Trophy, Waves, Wheat } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import InfoTip from "@/components/InfoTip";

// The map library is large, so it loads only when the map is shown.
const FarmMap = lazy(() => import("@/components/FarmMap"));
import { useClimate, useProfile, useSoilSurvey, useTerrain, useUpdateProfile } from "@/hooks/useKisanData";
import { landSummary } from "@/data/landSurveys";
import { cropName, monthName, monthsOf, planRotations, rotationTitle, weightsFromGoals } from "@/lib/rotation";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

const CROP_YEAR = { PK: [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9], US: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] };
const CROP_COLORS = ["bg-harvest", "bg-field", "bg-sky-500/70", "bg-harvest/50"];
const ask = (q) => `/chat?q=${encodeURIComponent(q)}`;

const PRIORITIES = [
  { key: "water", label: "Save water", icon: Droplets },
  { key: "soil", label: "Healthier soil", icon: Layers },
  { key: "income", label: "Income", icon: Wheat },
  { key: "risk", label: "Lower weather risk", icon: ShieldAlert },
  { key: "forage", label: "Fodder for animals", icon: Sprout },
];
const ROWS = [
  { key: "water", label: "Water saving", icon: Droplets, info: "How little irrigation water the crops need over the year, after counting the rain NASA has recorded for your area. A higher score means more water saved." },
  { key: "soil", label: "Soil health", icon: Layers, info: "How well the crops look after the soil: nitrogen-fixing crops, plant residue that feeds the soil, ground that stays covered, and little erosion on sloping land." },
  { key: "income", label: "Income", icon: Wheat, info: "Typical net income per acre for these crops, shown as a relative figure. It does not use today's market prices, so check prices before you decide." },
  { key: "risk", label: "Weather safety", icon: ShieldAlert, info: "How safe the crops are from heat, frost, drought, salty or waterlogged soil and very heavy rain. A higher score means fewer things that could go wrong." },
  { key: "forage", label: "Fodder", icon: Sprout, info: "How much feed the rotation gives for your animals. It only appears when livestock is one of your goals." },
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

function Section({ title, items, tone: cls, className }) {
  const { t } = useT();
  if (!items?.length) return null;
  return (
    <div className={cn("h-full rounded-xl border border-border bg-secondary/30 p-4", className)}>
      <p className={cn("kisan-label", cls)}>{t(title)}</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
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

const GOOD = "text-emerald-600 dark:text-emerald-400";

/** Column look shared by every cell, so the open rotation reads as one continuous band. */
const colBand = (on) => (on ? "border-x border-x-harvest/50 bg-harvest/[0.09]" : "");

/** A change against the rotation the farmer grows now: green when better, red when worse. */
function Delta({ diff, higherIsBetter = true, unit = "" }) {
  if (!diff) return <span className="text-[11px] text-muted-foreground">=</span>;
  const better = higherIsBetter ? diff > 0 : diff < 0;
  return (
    <span className={cn("text-[11px] font-semibold tabular-nums", better ? GOOD : "text-alert")}>
      {diff > 0 ? "+" : "−"}{Math.abs(diff).toLocaleString()}{unit}
    </span>
  );
}

/** The number in a cell. The best value in its row is a solid green pill; everything else is plain. */
function Value({ children, win }) {
  return (
    <span className={cn("inline-flex min-w-[2.5rem] items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 font-display text-[15px] font-semibold tabular-nums", win ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/85")}>
      {win && <Check className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** A row heading in the comparison table: topic icon, name, and an "i" that explains the measure. */
function RowLabel({ icon: Icon, title, info, hint }) {
  const { t } = useT();
  return (
    // The "i" sits at the right edge of the column, so all of them line up in one straight line.
    <span className="flex w-full items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="inline">{t(title)}</span>
        {hint && <span className="mt-0.5 block text-[11px] font-normal opacity-70">{t(hint)}</span>}
      </span>
      <InfoTip label={`${t("What does this mean?")} ${t(title)}`}>{t(info)}</InfoTip>
    </span>
  );
}

/** Side-by-side table: the current rotation and the best options, one row per measure. */
function CompareTable({ plan, weights, lang, selected, onSelect, order }) {
  const { t } = useT();
  const cols = plan.top;
  const cur = plan.current;
  const bestTotal = Math.max(...cols.map((s) => s.total));
  const rows = ROWS.filter((r) => r.key !== "forage" || weights.forage > 0);
  // Highlight a winner only when the options actually differ.
  const winners = (values, low = false) => {
    const top = low ? Math.min(...values) : Math.max(...values);
    return values.map((v) => values.some((x) => x !== top) && v === top);
  };
  const label = "sticky start-0 z-10 border-e border-border bg-card px-3 py-3.5 sm:px-4 text-start align-middle font-normal";
  const cell = "px-3 py-3.5 align-middle";

  return (
    <section className="kisan-card overflow-hidden p-0" data-testid="compare-table" aria-labelledby="compare-title">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <h2 id="compare-title" className="font-display text-lg">{t("Side by side")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("Higher scores are better. Tap a column to open its details below.")}</p>
          <p className="mt-1 text-xs font-medium text-harvest sm:hidden">{t("Swipe sideways to see every option.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5"><span className="inline-flex h-4 w-4 items-center justify-center rounded bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>{t("Best in the row")}</span>
          <span className="inline-flex items-center gap-1.5"><span className={cn("text-xs font-semibold", GOOD)}>+5</span>/<span className="text-xs font-semibold text-alert">−5</span>{t("vs what you grow now")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-harvest/60 bg-harvest/20" />{t("Open below")}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[9rem] sm:w-[11.5rem]" />
            {cols.map((s) => <col key={s.id} />)}
          </colgroup>
          <thead>
            <tr>
              <th className={cn(label, "align-bottom")}>
                <span className="block text-sm font-semibold normal-case tracking-normal text-foreground">{t("Measure")}</span>
                <span className="mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-muted-foreground">{t("Hover the i to learn more")}</span>
              </th>
              {cols.map((s, i) => {
                const on = selected === s.id;
                const isBest = s.total === bestTotal && !s.isCurrent;
                return (
                  <th key={s.id} scope="col" className={cn("border-t-[3px] p-0 align-top font-normal", on ? "border-t-harvest" : "border-t-transparent", colBand(on))}>
                    <button type="button" onClick={() => onSelect(s.id)} aria-pressed={on} className="flex h-full min-h-[13rem] w-full flex-col items-center gap-2.5 px-3 py-4 text-center transition-colors hover:bg-secondary/40 focus-ring">
                      <span className={cn("kisan-chip h-6 whitespace-nowrap text-[10px]", s.isCurrent ? "border-harvest/60 text-harvest" : isBest && "border-primary/60 bg-primary/15 text-emerald-600 dark:text-emerald-400")}>
                        {s.isCurrent ? t("You grow this now") : isBest ? <><Trophy className="h-3 w-3" aria-hidden="true" /> {t("Best fit")}</> : t("Option {n}", { n: i })}
                      </span>
                      <Ring value={s.total} best={s.total === bestTotal} />
                      <span className="line-clamp-3 min-h-[3.9em] font-display text-[15px] leading-[1.3]" dir="auto" title={rotationTitle(s, lang)}>{rotationTitle(s, lang)}</span>
                      <span className={cn("mt-auto text-[11px] font-medium", on ? "text-harvest" : "text-muted-foreground")}>{on ? t("Open below") : t("Tap for details")}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const win = winners(cols.map((s) => s.scores[r.key]));
              return (
                <tr key={r.key} className="border-t border-border">
                  <th scope="row" className={cn(label, "text-muted-foreground")}>
                    <RowLabel icon={r.icon} title={r.label} info={r.info} />
                  </th>
                  {cols.map((s, i) => {
                    const v = s.scores[r.key];
                    return (
                      <td key={s.id} className={cn(cell, colBand(selected === s.id))}>
                        <div className="flex h-7 items-center justify-between gap-2">
                          <Value win={win[i]}>{v}</Value>
                          {!s.isCurrent && <Delta diff={v - cur.scores[r.key]} />}
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                          <div className={cn("h-full rounded-full transition-all duration-700", tone(v))} style={{ width: `${v}%` }} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {[
              { key: "irrigation", label: "Irrigation a year", icon: Waves, info: "How much water the whole rotation needs from canals, tube wells or other irrigation, in millimetres a year. It is the gap between what the crops need and the rain NASA has recorded. Lower is better.", get: (s) => s.irrigation_mm, show: (v) => `${v.toLocaleString()} mm`, unit: "", min: 30 },
              { key: "bare", label: "Months the field is bare", icon: CalendarX, info: "Months of the year when nothing is growing in the field. Bare soil dries out, can wash away and grows weeds, so fewer is better.", get: (s) => s.bare_months.length, show: (v) => String(v), unit: "", min: 1 },
            ].map((m) => {
              const win = winners(cols.map(m.get), true);
              return (
                <tr key={m.key} className="border-t border-border">
                  <th scope="row" className={cn(label, "text-muted-foreground")}>
                    <RowLabel icon={m.icon} title={m.label} info={m.info} hint="Lower is better" />
                  </th>
                  {cols.map((s, i) => {
                    const diff = m.get(s) - m.get(cur);
                    return (
                      <td key={s.id} className={cn(cell, colBand(selected === s.id))}>
                        <div className="flex h-7 items-center justify-between gap-2">
                          <Value win={win[i]}>{m.show(m.get(s))}</Value>
                          {!s.isCurrent && Math.abs(diff) >= m.min && <Delta diff={diff} higherIsBetter={false} unit={m.unit} />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="border-t border-border">
              <th scope="row" className={cn(label, "align-top text-muted-foreground")}>
                <RowLabel icon={CalendarDays} title="Field calendar" info="One year in twelve boxes. Each colour is a crop growing in the field that month. A dashed red box means the field is bare." />
              </th>
              {cols.map((s) => {
                const on = selected === s.id;
                return (
                  <td key={s.id} className={cn("px-3 pb-4 pt-3.5 align-top", colBand(on), on && "border-b-[3px] border-b-harvest")}>
                    <CropYear s={s} lang={lang} order={order} />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
        {t("Scores are out of 100, higher is better. Calendar: {first} to {last}; dashed red = bare field.", { first: monthName(order[0]), last: monthName(order[11]) })}
      </p>
    </section>
  );
}

function Details({ s, plan, lang, order, chosen, onChoose }) {
  const { t } = useT();
  // Two columns; if a block is empty the last one spans the row instead of leaving a hole.
  const blocks = [
    { title: "Why it was suggested", items: s.explain.why },
    { title: "Benefits", items: s.explain.benefits, tone: "!text-emerald-600 dark:!text-emerald-400" },
    { title: "Evidence", items: s.explain.evidence },
    { title: "Risks to check locally", items: s.explain.risks, tone: "!text-alert" },
  ].filter((b) => b.items?.length);
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
      <div className="mt-5 grid items-stretch gap-4 md:grid-cols-2">
        {blocks.map((b, i) => (
          <Section key={b.title} {...b} className={blocks.length % 2 === 1 && i === blocks.length - 1 ? "md:col-span-2" : ""} />
        ))}
        <Section title="What we don't know" items={s.explain.gaps} className="md:col-span-2" />
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link to={ask(discussQuestion(s, plan.current))} className="kisan-btn-gold flex-1 focus-ring" data-testid="discuss-rotation">
          <MessagesSquare className="h-4 w-4" aria-hidden="true" /> {t("Discuss this rotation with Kisan AI")}
        </Link>
        {!s.isCurrent && (
          <button onClick={() => onChoose(s)} className={cn("kisan-btn-ghost focus-ring", chosen && "!border-emerald-500 !text-emerald-600 dark:!text-emerald-400")} data-testid="choose-rotation">
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
        <h2 id="climate-title" className="font-display text-lg">
          {t("Your climate, {from}–{to}", { from: climate.period.first_year, to: climate.period.last_year })}
        </h2>
        <a href={climate.source_url} target="_blank" rel="noreferrer" className="kisan-chip text-[11px]"><Satellite className="h-3 w-3" aria-hidden="true" /> NASA POWER</a>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("Average month at {place}.", { place: climate.location })}
      </p>
      {/* Legend: what the bars and numbers mean. */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground" data-testid="climate-legend">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-2.5 rounded-sm bg-sky-500/60" aria-hidden="true" />{t("Blue bar: average rain that month")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="font-semibold text-foreground">25°</span>{t("average daytime high")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="font-semibold text-alert">42°</span>{t("red: hotter than 40 °C, heat stress")}</span>
      </div>
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
      <dl className="mt-5 grid grid-cols-2 gap-3 2xl:grid-cols-4">
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

      {/* Controls sit right above the table they re-rank: two equal cards on one row. */}
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        <section className="kisan-card p-5 sm:p-6">
          <h2 className="font-display text-lg">{t("What matters to you")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("Set from your season goals. Move a slider to re-rank.")}</p>
          <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {PRIORITIES.map((p) => (
              <Slider key={p.key} label={t(p.label)} icon={p.icon} min={0} max={3} step={1} value={w[p.key] || 0} display={t(LEVELS[w[p.key] || 0])} onChange={(v) => setWeights({ ...w, [p.key]: v })} />
            ))}
          </div>
        </section>

        <section className="kisan-card p-5 sm:p-6">
          <h2 className="font-display text-lg">{t("What if the weather changes?")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("Test each rotation against a hotter or drier future.")}</p>
          <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Slider label={t("Hotter by")} icon={Thermometer} min={0} max={3} step={0.5} value={scenario.tempDelta} display={`+${scenario.tempDelta} °C`} onChange={(v) => setScenario({ ...scenario, tempDelta: v })} />
            <Slider label={t("Rain change")} icon={CloudRain} min={-40} max={30} step={10} value={scenario.rainPct} display={`${scenario.rainPct > 0 ? "+" : ""}${scenario.rainPct}%`} onChange={(v) => setScenario({ ...scenario, rainPct: v })} />
          </div>
          {changed && <button onClick={() => setScenario({ tempDelta: 0, rainPct: 0 })} className="mt-4 text-xs font-medium text-primary hover:underline focus-ring">{t("Back to today's climate")}</button>}
        </section>
      </div>

      <div id="compare" className="scroll-mt-6">
        <CompareTable plan={plan} weights={w} lang={lang} selected={selected.id} onSelect={setPicked} order={order} />
      </div>

      <Details s={selected} plan={plan} lang={lang} order={order} chosen={profile.planned_rotation === selected.id} onChoose={choose} />

      {/* Climate and soil survey: same row, same height. */}
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        {climateLoading ? <div className="kisan-card h-64 animate-pulse" /> : <ClimatePanel climate={climate} scenario={scenario} order={order} />}

        <section className="kisan-card p-5 text-sm sm:p-6" data-testid="land-survey">
          <h2 className="flex items-center gap-2 font-display text-lg"><Landmark className="h-4 w-4 text-harvest" aria-hidden="true" />{t("Government soil survey")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{land.source}{land.live && <span className="ms-2 rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">{t("Live")}</span>}</p>
          {soilLoading && us && <div className="mt-3 h-16 animate-pulse rounded-xl bg-secondary" />}
          <ul className="mt-4 space-y-1.5 leading-relaxed">
            {land.lines.map((x) => <li key={x}>{x}</li>)}
            {!land.lines.length && !soilLoading && <li className="text-muted-foreground">{us ? t("The USDA soil survey has no data for this point.") : t("No province-level survey figures for this area.")}</li>}
          </ul>
          {land.waterlog && (
            <p className="mt-4 rounded-xl bg-secondary/60 px-3 py-2 text-xs">
              {t("Waterlogging risk used in the scores")}: <span className={cn("font-semibold", land.waterlog === "high" ? "text-alert" : land.waterlog === "moderate" ? "text-harvest" : GOOD)}>{t(land.waterlog === "high" ? "High" : land.waterlog === "moderate" ? "Medium" : "Low")}</span>
            </p>
          )}
          <div className="mt-5 border-t pt-4 [border-color:var(--card-line)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("What this means for your farm")}</p>
            <ul className="mt-2 list-disc space-y-1.5 ps-5 text-[13px] leading-relaxed marker:text-muted-foreground">
              {land.waterlog === "high" && <li>{t("A high water table is common here: prefer crops that tolerate wet soil, and keep drains clear before the monsoon.")}</li>}
              {land.waterlog === "moderate" && <li>{t("Waterlogging happens in parts of this area: avoid over-irrigating, and level fields so water doesn't stand.")}</li>}
              {!us && <li>{t("Salt-affected land is widespread here. White crust or patchy germination are warning signs; gypsum and good drainage help.")}</li>}
              {terrain?.elevation_m != null && (
                <li>{t("Your land sits about {m} m above sea level with a {slope}% slope (NASA SRTM), so erosion risk on bare soil is {risk}.", { m: terrain.elevation_m, slope: terrain.slope_pct, risk: t(terrain.erosion_risk) })}</li>
              )}
              <li>{us ? t("A soil test from your county extension office gives exact nutrient and pH values for your field.") : t("For exact figures, get a soil and water test at the Soil and Water Testing Laboratory in your district (Agriculture Department). It is cheap and shows salt, pH and nutrients.")}</li>
            </ul>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {us ? t("Read live for your location. It maps soil types, not this season's condition.") : t("Province-level background from older surveys, not your field. A soil and water test from your district laboratory is the real answer.")}
          </p>
          <Link to="/knowledge" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">{t("All data sources")} <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden="true" /></Link>
        </section>
      </div>

      <Suspense fallback={<div className="kisan-card h-96 animate-pulse" />}>
        <FarmMap />
      </Suspense>
      {!climateLoading && !climate && (
        <p className="kisan-card flex gap-2 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t("NASA climate history couldn't be loaded, so the scores use typical values. Set your location in My farm, or try again later.")}
        </p>
      )}

      <section className="kisan-card overflow-hidden p-0">
        <button type="button" onClick={() => setShowAll((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-start font-display text-lg focus-ring sm:px-6" aria-expanded={showAll}>
          {t("All {n} rotations ranked", { n: plan.ranked.length })}
          <ChevronDown className={cn("h-4 w-4 transition-transform", showAll && "rotate-180")} aria-hidden="true" />
        </button>
        {showAll && (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[560px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-14" />
                <col />
                <col className="w-40" />
                <col className="w-28" />
                <col className="w-14" />
              </colgroup>
              <thead>
                <tr className="bg-secondary/40">
                  <th scope="col" className="kisan-label px-4 py-2.5 text-start font-medium">#</th>
                  <th scope="col" className="kisan-label px-3 py-2.5 text-start font-medium">{t("Rotation")}</th>
                  <th scope="col" className="kisan-label px-3 py-2.5 text-start font-medium">{t("Score")}</th>
                  <th scope="col" className="kisan-label px-3 py-2.5 text-end font-medium">{t("Irrigation a year")}</th>
                  <th scope="col" className="px-3 py-2.5"><span className="sr-only">{t("Discuss with Kisan AI")}</span></th>
                </tr>
              </thead>
              <tbody>
                {plan.ranked.map((s, i) => (
                  <tr key={s.id} className={cn("border-t border-border", s.isCurrent && "bg-harvest/[0.08]")}>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-3" dir="auto">
                      <span className="font-medium">{rotationTitle(s, lang)}</span>
                      {s.isCurrent && <span className="kisan-chip ms-2 text-[10px]">{t("Now")}</span>}
                      {s.blocked && <span className="ms-2 text-xs text-alert">{t(s.blocked)}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 font-display font-semibold tabular-nums">{s.total}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                          <div className={cn("h-full rounded-full", tone(s.total))} style={{ width: `${s.total}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-end tabular-nums text-muted-foreground">{s.irrigation_mm.toLocaleString()} mm</td>
                    <td className="px-3 py-3 text-end">
                      <Link to={ask(discussQuestion(s, plan.current))} className="inline-flex rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-ring" aria-label={`${t("Discuss with Kisan AI")}: ${s.crops.join(" → ")}`}>
                        <MessagesSquare className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="kisan-card flex gap-3 p-5 text-sm sm:p-6">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-harvest" aria-hidden="true" />
        <div>
          <p className="font-medium">{t("This tool supports your judgment")}</p>
          <p className="mt-1 text-muted-foreground">
            {t("Scores compare options using typical crop figures and NASA climate data. They don't know your field's soil test, seed, market or labour. Talk to your agriculture extension officer before changing a rotation.")}
          </p>
        </div>
      </section>
    </div>
  );
}
