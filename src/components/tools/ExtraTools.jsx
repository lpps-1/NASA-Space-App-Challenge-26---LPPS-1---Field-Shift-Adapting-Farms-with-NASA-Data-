import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, CloudRain, Droplets, ExternalLink, MessagesSquare, Sun } from "lucide-react";
import FormField, { inputClass } from "@/components/FormField";
import { SCHEMES } from "@/data/landSurveys";
import { CROP_EMOJI } from "@/data/fixtures";
import { useFields, useProfile, useWeather } from "@/hooks/useKisanData";
import { estimateStage } from "@/lib/fieldStage";
import { cropLabel } from "@/lib/cropNames";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

function Box({ label, value, sub, tone }) {
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 break-words font-display text-xl tabular-nums sm:text-2xl", tone)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ───────────────────────── Irrigation planner ───────────────────────── */

// Crop coefficient (share of reference evapotranspiration the crop uses) by growth stage. FAO-56 style, rounded.
const KC = { "Not sown yet": 0, Germination: 0.4, "Vegetative growth": 0.8, Flowering: 1.15, Ripening: 0.7, "Ready to harvest": 0.25, "Growing (orchard)": 0.85 };
const STAGE_OPTIONS = ["Germination", "Vegetative growth", "Flowering", "Ripening"];

/**
 * This week's water balance for one field: what the crop will use (forecast
 * evapotranspiration × stage coefficient) minus the rain that is forecast.
 */
export function IrrigationTool() {
  const { t, lang } = useT();
  const { data: weather } = useWeather();
  const { data: fields = [] } = useFields();
  const [fieldId, setFieldId] = useState("");
  const [manualStage, setManualStage] = useState("Vegetative growth");
  const field = fields.find((f) => f.id === fieldId) || fields[0] || null;
  const est = field ? estimateStage(field) : null;
  const stage = est?.stage && KC[est.stage] != null ? est.stage : manualStage;
  const days = weather?.forecast || [];

  const plan = useMemo(() => {
    if (!days.length) return null;
    const et0 = days.reduce((a, d) => a + (d.et0_mm ?? 4), 0);
    const rain = days.reduce((a, d) => a + (d.rain_mm ?? 0), 0);
    const use = et0 * (KC[stage] ?? 0.8);
    const net = Math.max(0, use - rain * 0.8);
    const rainDay = days.find((d) => (d.rain_mm ?? 0) >= 5 || d.rain >= 60);
    return { et0, rain, use, net, rainDay };
  }, [days, stage]);

  if (!weather || !plan) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;
  const acres = Number(field?.acres) || 1;
  const litres = plan.net * 4047 * acres; // 1 mm over 1 acre = 4,047 litres
  const none = plan.net < 8;
  const dayName = (d) => (d.date ? new Date(d.date + "T12:00:00").toLocaleDateString(lang === "en" ? "en-GB" : "ur-PK", { weekday: "long" }) : t(d.day));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("Field")}>
          <select className={inputClass} value={field?.id || ""} onChange={(e) => setFieldId(e.target.value)} disabled={!fields.length}>
            {!fields.length && <option value="">{t("No fields yet (using 1 acre)")}</option>}
            {fields.map((f) => <option key={f.id} value={f.id}>{cropLabel(f.crop, lang)} · {t(f.name)} ({f.acres} {t("acres")})</option>)}
          </select>
        </FormField>
        <FormField label={t("Crop stage")} hint={est?.stage && KC[est.stage] != null ? t("Worked out from the sowing date.") : t("No sowing date on this field, so choose the stage.")}>
          <select className={inputClass} value={stage} onChange={(e) => setManualStage(e.target.value)} disabled={Boolean(est?.stage && KC[est.stage] != null)}>
            {[...new Set([stage, ...STAGE_OPTIONS])].map((s) => <option key={s} value={s}>{t(s)}</option>)}
          </select>
        </FormField>
      </div>

      <div className={cn("rounded-2xl border p-5", none ? "border-field/50 bg-field/10" : "border-sky-500/40 bg-sky-500/10")}>
        <p className="kisan-label">{t("This week")}</p>
        <p className="mt-1 font-display text-2xl">
          {none ? t("No irrigation needed this week") : t("Give about {mm} mm of water", { mm: Math.round(plan.net) })}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {none
            ? t("Forecast rain and the crop's low water use cover the week.")
            : t("That is about {inches} inches, or {litres} litres for this field.", { inches: (plan.net / 25.4).toFixed(1), litres: Math.round(litres / 1000).toLocaleString() + ",000" })}
          {plan.rainDay && !none && ` ${t("Rain is likely on {day}: irrigate after it, with less.", { day: dayName(plan.rainDay) })}`}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Box label={t("Crop will use")} value={`${Math.round(plan.use)} mm`} sub={t("7 days, {stage}", { stage: t(stage) })} />
        <Box label={t("Rain forecast")} value={`${Math.round(plan.rain)} mm`} sub={t("next 7 days")} tone="text-sky-400" />
        <Box label={t("Evaporation demand")} value={`${Math.round(plan.et0)} mm`} sub={t("reference ET₀")} />
      </div>

      <ol className="grid grid-cols-7 gap-1" aria-label={t("7-day forecast")}>
        {days.map((d, i) => {
          const wet = (d.rain_mm ?? 0) >= 1;
          return (
            <li key={d.date || i} className="flex flex-col items-center gap-1 rounded-xl bg-secondary/40 py-2 text-center">
              <span className="text-[10px] text-muted-foreground">{d.date ? new Date(d.date + "T12:00:00").toLocaleDateString(lang === "en" ? "en-GB" : "ur-PK", { weekday: "short" }) : t(d.day)}</span>
              {wet ? <CloudRain className="h-4 w-4 text-sky-400" aria-hidden="true" /> : <Sun className="h-4 w-4 text-harvest" aria-hidden="true" />}
              <span className="text-[11px] tabular-nums">{wet ? `${Math.round(d.rain_mm)} mm` : `−${Math.round((d.et0_mm ?? 4) * (KC[stage] ?? 0.8))}`}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        <Droplets className="me-1 inline h-3.5 w-3.5" aria-hidden="true" />
        {t("A water balance from the weather forecast: crop use (evaporation demand × stage) minus 80% of forecast rain. It does not know how wet your soil is today. Sandy soil needs smaller, more frequent turns; dig a hand's depth and check before you irrigate.")}
        {weather.sample && ` ${t("Live weather is unavailable, so this uses sample data.")}`}
      </p>
    </div>
  );
}

/* ───────────────────────── Crop problem check ───────────────────────── */

const SYMPTOMS = [
  {
    id: "yellow",
    label: "Leaves turning yellow",
    causes: [
      ["Nitrogen shortage", "Older, lower leaves yellow first and evenly. Common after heavy rain or a missed urea dose."],
      ["Too much water", "Whole plant pale in low, wet patches of the field. Roots cannot breathe in waterlogged soil."],
      ["Zinc or iron shortage", "Young leaves pale between green veins. Common on salty or high-pH soil."],
      ["Yellow rust (wheat)", "Yellow powder in stripes along the leaf that rubs off on your finger. Spreads fast in cool, damp weather."],
    ],
  },
  {
    id: "spots",
    label: "Spots, powder or burnt patches",
    causes: [
      ["Fungal leaf spot or blight", "Brown or black spots, often with a yellow ring, worse after humid days."],
      ["Rust", "Orange, brown or yellow powdery pustules on leaves or stems."],
      ["Bacterial blight", "Water-soaked streaks that turn yellow then dry, common in rice and cotton after storms."],
      ["Spray or fertilizer burn", "Scorched patches a day or two after spraying or top-dressing in hot sun."],
    ],
  },
  {
    id: "curl",
    label: "Leaves curling or crinkled",
    causes: [
      ["Leaf curl virus (cotton, chillies, tomato)", "Upward curling, thick veins, stunted plants. Spread by whitefly."],
      ["Sucking insects", "Aphids, jassids, thrips or whitefly under the leaves; sticky honeydew or sooty mould."],
      ["Weedkiller drift", "Twisted, strap-like new leaves a few days after a neighbour sprayed."],
    ],
  },
  {
    id: "holes",
    label: "Holes, chewed leaves or damaged bolls and grain",
    causes: [
      ["Caterpillars", "Armyworm, bollworm or cutworm: fresh droppings, feeding mostly at night."],
      ["Fall armyworm (maize, corn)", "Ragged holes in the whorl with sawdust-like droppings."],
      ["Borers", "Dead central shoot (\"dead heart\") or holes in the stem or boll."],
    ],
  },
  {
    id: "wilt",
    label: "Wilting or drying plants",
    causes: [
      ["Water shortage", "Leaves droop in the afternoon and recover at night; soil dry a hand's depth down."],
      ["Root rot or wilt disease", "Plants wilt in patches even in moist soil; roots or lower stem are brown inside."],
      ["Termites or root-feeding insects", "Plants pull out easily, roots eaten. Common on sandy, dry fields."],
    ],
  },
  {
    id: "stunted",
    label: "Stunted or patchy growth",
    causes: [
      ["Salty soil", "White crust on the surface, bare patches, burnt leaf tips."],
      ["Hard pan or poor seedbed", "Shallow roots that turn sideways; water stands after irrigation."],
      ["Late sowing or nutrient shortage", "Whole field behind neighbours' fields sown on time."],
    ],
  },
];

/** A guided list of likely causes for what the farmer sees, then a hand-off to Kisan AI with the details filled in. */
export function ProblemTool() {
  const { t, lang } = useT();
  const { data: profile } = useProfile();
  const crops = profile?.crops?.length ? profile.crops : ["Wheat"];
  const [crop, setCrop] = useState(crops[0]);
  const [symptom, setSymptom] = useState("yellow");
  const [note, setNote] = useState("");
  const s = SYMPTOMS.find((x) => x.id === symptom);
  const question = `My ${crop} has this problem: ${s.label.toLowerCase()}${note.trim() ? `. ${note.trim()}` : ""}. What is the most likely cause, how do I confirm it in the field, and what should I do?`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("Crop")}>
        {crops.map((c) => (
          <button key={c} type="button" aria-pressed={crop === c} onClick={() => setCrop(c)} className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-all focus-ring active:scale-95", crop === c ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary/60")}>
            <span aria-hidden="true">{CROP_EMOJI[c] || "🌱"}</span> {cropLabel(c, lang)}
          </button>
        ))}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">{t("What do you see?")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SYMPTOMS.map((x) => (
            <button key={x.id} type="button" aria-pressed={symptom === x.id} onClick={() => setSymptom(x.id)} className={cn("rounded-xl border px-3.5 py-2.5 text-start text-sm transition-all focus-ring active:scale-[0.98]", symptom === x.id ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-secondary/60")}>
              {t(x.label)}
            </button>
          ))}
        </div>
      </div>
      <div key={symptom} className="rise-in">
        <p className="kisan-label">{t("Likely causes to check")}</p>
        <ul className="mt-2 space-y-2">
          {s.causes.map(([name, how]) => (
            <li key={name} className="rounded-2xl bg-secondary/60 p-3.5 text-sm">
              <p className="font-semibold">{t(name)}</p>
              <p className="mt-0.5 text-muted-foreground">{t(how)}</p>
            </li>
          ))}
        </ul>
      </div>
      <FormField label={t("Add details (optional)")}>
        <textarea className={cn(inputClass, "min-h-[72px] resize-y")} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Describe it: which part of the plant, how much of the field, since when")} dir="auto" maxLength={300} />
      </FormField>
      <Link to={`/?q=${encodeURIComponent(question)}`} className="kisan-btn-gold w-full focus-ring">
        <MessagesSquare className="h-4 w-4" aria-hidden="true" /> {t("Ask Kisan AI about this problem")}
      </Link>
      <p className="text-xs text-muted-foreground">{t("A checklist, not a diagnosis. Do not spray on a guess: confirm with your extension officer or a plant clinic, and take a sample plant with you.")}</p>
    </div>
  );
}

/* ───────────────────────── Government schemes ───────────────────────── */

export function SchemesTool() {
  const { t } = useT();
  const { data: profile } = useProfile();
  if (!profile) return null;
  const list = SCHEMES[profile.country === "US" ? "US" : "PK"].filter((s) => s.near(profile));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("Matched to your farm: {acres} acres in {place}.", { acres: profile.land_acres || 0, place: [profile.district, profile.province].filter(Boolean).join(", ") })}
      </p>
      <ul className="space-y-3">
        {list.map((s) => {
          const fits = s.fits(profile);
          return (
            <li key={s.id} className="rounded-2xl border p-4 [border-color:var(--card-line)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-base">{t(s.name)}</p>
                  <p className="text-xs text-muted-foreground">{t(s.by)}</p>
                </div>
                <span className={cn("kisan-chip text-[11px]", fits ? "border-field/50 text-field" : "text-muted-foreground")}>
                  {fits && <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                  {fits ? t("Likely fits your farm") : t("Check if you qualify")}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{t(s.what)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={s.href} target="_blank" rel="noreferrer" className="kisan-btn-ghost px-3 py-1.5 text-xs focus-ring">
                  {t("Official page")} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <Link to={`/?q=${encodeURIComponent(`Explain ${s.name} (${s.by}) for my farm: who qualifies, what documents I need and how to apply.`)}`} className="kisan-btn-ghost px-3 py-1.5 text-xs focus-ring">
                  <MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" /> {t("Ask Kisan AI")}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">{t("Amounts, limits and deadlines change often. This list is a starting point: confirm the current terms on the official page or at the office before you apply. Kisan AI is not connected to these programmes.")}</p>
    </div>
  );
}
