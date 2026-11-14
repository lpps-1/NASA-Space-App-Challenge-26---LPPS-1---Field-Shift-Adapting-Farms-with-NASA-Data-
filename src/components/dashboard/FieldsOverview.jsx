import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CalendarPlus, CheckCircle2, MessagesSquare, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { CROP_DAYS, CROP_EMOJI, TYPICAL_YIELD } from "@/data/fixtures";
import { inputClass } from "@/components/FormField";
import { useEntityMutations } from "@/hooks/useKisanData";
import { useT } from "@/i18n";
import { cropLabel } from "@/lib/cropNames";
import { estimateStage } from "@/lib/fieldStage";
import { cn } from "@/lib/utils";

/** Estimated harvest in maunds (40 kg), from acres × a typical Pakistani yield for the crop. */
const estimate = (f) => (TYPICAL_YIELD[f.crop] ? Math.round(Number(f.acres || 0) * TYPICAL_YIELD[f.crop]) : null);
const STAGES = ["Germination", "Vegetative growth", "Flowering", "Ripening", "Ready to harvest"];
const STAGE_AT = [0, 0.1, 0.4, 0.65, 0.95];
export const ISSUE_TYPES = [
  { id: "pest", label: "Insects or pests" },
  { id: "disease", label: "Spots, rust or rot" },
  { id: "yellow", label: "Yellow or pale leaves" },
  { id: "wilt", label: "Wilting or dry patches" },
  { id: "weeds", label: "Weeds" },
  { id: "other", label: "Something else" },
];
const issueLabel = (id) => ISSUE_TYPES.find((x) => x.id === id)?.label || "Something else";
const fmtDate = (iso, lang, opts = { day: "numeric", month: "short", year: "numeric" }) => new Date(iso + "T12:00:00").toLocaleDateString(lang === "en" ? "en-GB" : "ur-PK", opts);

/** The farmer tells Kisan AI what they see in a field. Saved on the field and sent with every question. */
function ReportProblem({ field, onClose }) {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const { update } = useEntityMutations("Field", "fields");
  const [type, setType] = useState("pest");
  const [note, setNote] = useState("");

  const save = async (thenAsk) => {
    const issue = { id: Math.random().toString(36).slice(2, 9), type, note: note.trim(), date: new Date().toISOString().slice(0, 10) };
    await update.mutateAsync({ id: field.id, issues: [...(field.issues || []), issue] });
    toast.success(t("Saved. Kisan AI will keep this in mind."));
    onClose();
    if (thenAsk) {
      const stage = estimateStage(field)?.stage;
      navigate(`/?q=${encodeURIComponent(`My ${field.crop} in ${field.name}${stage ? ` (${stage} stage)` : ""} has a problem: ${issueLabel(type)}${note.trim() ? `. ${note.trim()}` : ""}. What is the likely cause and what should I do?`)}`);
    }
  };

  return (
    <div className="kisan-fade fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="rp-title">
      <div className="kisan-sheet kisan-card w-full max-w-md p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="kisan-label">{cropLabel(field.crop, lang)} · {t(field.name)}</p>
            <h2 id="rp-title" className="mt-1 font-display text-xl">{t("What do you see in this field?")}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary focus-ring" aria-label={t("Close")}><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {ISSUE_TYPES.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={type === x.id}
              onClick={() => setType(x.id)}
              className={cn("rounded-xl border px-3 py-2.5 text-start text-sm transition-all focus-ring active:scale-[0.98]", type === x.id ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-secondary/60")}
            >
              {t(x.label)}
            </button>
          ))}
        </div>
        <textarea
          className={cn(inputClass, "mt-3 min-h-[84px] resize-y")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("Describe it: which part of the plant, how much of the field, since when")}
          dir="auto"
          maxLength={300}
          aria-label={t("Details")}
        />
        <p className="mt-2 text-xs text-muted-foreground">{t("The app cannot see your crop. What you report here makes Kisan AI's answers more exact.")}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button onClick={() => save(true)} className="kisan-btn-gold flex-1 focus-ring">
            <MessagesSquare className="h-4 w-4" aria-hidden="true" /> {t("Save and ask Kisan AI")}
          </button>
          <button onClick={() => save(false)} className="kisan-btn-ghost focus-ring">{t("Just save")}</button>
        </div>
      </div>
    </div>
  );
}

function FieldCard({ f, demo, onReport }) {
  const { t, lang } = useT();
  const { update } = useEntityMutations("Field", "fields");
  const est = estimateStage(f);
  const days = CROP_DAYS[f.crop];
  const pct = est?.day != null && est.of ? Math.max(0, Math.min(1, est.day / est.of)) : null;
  const harvest = f.sown && days ? new Date(new Date(f.sown + "T12:00:00").getTime() + days * 864e5) : null;
  const maunds = estimate(f);
  const issues = f.issues || [];
  const resolve = (id) => update.mutate({ id: f.id, issues: issues.filter((x) => x.id !== id) });

  const harvestLabel = harvest ? `${t("Harvest")} ~${harvest.toLocaleDateString(lang === "en" ? "en-GB" : "ur-PK", { month: "short", year: "numeric" })}` : t("Harvest");

  // Six rows on a shared grid (subgrid), so each row starts at the same height in every card:
  // name · sowing date · season progress · typical harvest · warnings · report button.
  return (
    <li className="row-span-6 grid grid-rows-subgrid gap-3 rounded-2xl border bg-background/40 p-4 [border-color:var(--card-line)]">
      <Link to={`/fields/${f.id}`} className="group flex items-center gap-2.5 focus-ring">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl" aria-hidden="true">{CROP_EMOJI[f.crop] || "🌱"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold group-hover:text-primary">{cropLabel(f.crop, lang)}</span>
          <span className="block truncate text-xs text-muted-foreground" dir="auto">{t(f.name)}{f.variety ? `, ${f.variety}` : ""}</span>
        </span>
        <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">{t("{n} acres", { n: f.acres })}</span>
      </Link>

      {/* Row 2: when it was sown, or a button to add the date. */}
      {f.sown ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {demo ? t("Sown about") : t("Sown")} <span className="font-medium text-foreground">{fmtDate(f.sown, lang)}</span>
          {est?.day != null && est.day >= 0 && <> · {est.day > est.of ? t("day {d}, past the usual {n}", { d: est.day, n: est.of }) : t("day {d} of about {n}", { d: est.day, n: est.of })}</>}
        </p>
      ) : (
        <Link to={`/fields/${f.id}`} className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-harvest/60 px-3 py-2 text-xs font-medium text-highlight hover:bg-harvest/10 focus-ring" data-testid="add-sowing-date">
          <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden="true" /> <span>{t("Add the sowing date to see the crop stage")}</span>
        </Link>
      )}

      {/* Row 3: season progress. */}
      <div data-testid="season-progress">
        <div className="flex items-baseline justify-between gap-2 text-[11px]">
          <span className="whitespace-nowrap text-muted-foreground">{t("Season progress")}</span>
          <span className="truncate font-semibold text-foreground">{est ? t(est.stage) : "—"}</span>
        </div>
        <div className="relative mt-1.5 h-2 rounded-full bg-muted" dir="ltr" title={t("How far the crop is from sowing to harvest, estimated from the sowing date")}>
          {pct != null && <div className="kisan-grow h-full rounded-full bg-gradient-to-r from-field to-harvest" style={{ width: `${Math.max(4, pct * 100)}%` }} />}
          {STAGE_AT.slice(1).map((at) => (
            <span key={at} className="absolute top-0 h-2 w-px bg-background/80" style={{ left: `${at * 100}%` }} aria-hidden="true" />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" dir="ltr">
          <span>{t("Sowing")}</span>
          <span>{harvestLabel}</span>
        </div>
      </div>

      {/* Row 4: typical harvest. */}
      <p className="text-xs text-muted-foreground">
        {t("Typical harvest")}:{" "}
        <span className="font-semibold tabular-nums text-foreground">{maunds != null && f.sown ? t("{n} maunds", { n: maunds.toLocaleString("en-PK") }) : "—"}</span>
      </p>

      {/* Row 5: warnings, with a heading even when there are none. */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Warnings")}</p>
        {issues.length ? (
          <ul className="mt-1.5 space-y-1.5">
            {issues.map((x) => (
              <li key={x.id} className="flex items-start gap-2 rounded-xl bg-alert/10 px-2.5 py-2 text-xs">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-alert" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{t(issueLabel(x.type))}</span>
                  {x.note && <span className="block text-muted-foreground" dir="auto">{x.note}</span>}
                </span>
                <button onClick={() => resolve(x.id)} className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background/60 hover:text-foreground focus-ring">{t("Solved")}</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 flex items-center gap-2 rounded-xl bg-secondary/50 px-2.5 py-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /> {t("No problems reported")}
          </p>
        )}
      </div>

      {/* Row 6: a real button, same place in every card. */}
      <button
        onClick={() => onReport(f)}
        className="inline-flex w-full items-center justify-center gap-1.5 self-end rounded-xl border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-ring [border-color:var(--card-line)]"
        data-testid="report-problem"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-alert" aria-hidden="true" /> {t("Report a problem")}
      </button>
    </li>
  );
}

/**
 * The farmer's fields: when each was sown, how far through its season it is
 * (worked out from the sowing date), and any problems the farmer has reported.
 * Nothing here is measured in the field, and the card says so.
 */
export default function FieldsOverview({ fields = [], demo = false }) {
  const { t } = useT();
  const [reporting, setReporting] = useState(null);
  const total = fields.reduce((s, f) => s + Number(f.acres || 0), 0);
  return (
    <section className="kisan-card p-5 sm:p-6" aria-labelledby="fields-title" data-testid="fields-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="fields-title" className="kisan-label">
          {t("Crops & fields")}
          {demo && <span className="ms-2 rounded bg-harvest/15 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-harvest">{t("Demo data")}</span>}
        </h2>
        <Link to="/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          {t("{n} acres", { n: Math.round(total * 10) / 10 })} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {demo
          ? t("Sample fields for the demo. Sowing dates are approximate, so each stage is an estimate from the date, not a field measurement.")
          : t("The stage is worked out from your sowing date, not measured in the field. Report anything you see so Kisan AI can be more exact.")}
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map((f) => <FieldCard key={f.id} f={f} demo={demo} onReport={setReporting} />)}
        {fields.length === 0 && (
          <li className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            {t("No fields yet.")} <Link to="/fields/new" className="font-medium text-primary hover:underline">{t("Add your first field")}</Link>
          </li>
        )}
      </ul>
      {fields.length > 0 && (
        <Link to="/fields/new" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-ring">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {t("Add a field")}
        </Link>
      )}
      {reporting && <ReportProblem field={reporting} onClose={() => setReporting(null)} />}
    </section>
  );
}
