import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ClipboardList, Plus } from "lucide-react";
import { TASK_TYPES } from "@/data/fixtures";
import { inputClass } from "@/components/FormField";
import { useEntityMutations } from "@/hooks/useKisanData";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmt = (iso, t, lang) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(iso + "T00:00") - start) / 86400000);
  if (diff === 0) return t("Today");
  if (diff === 1) return t("Tomorrow");
  return new Date(iso + "T00:00").toLocaleDateString(lang === "en" ? "en-GB" : "ur-PK", { day: "numeric", month: "short" });
};

/** The farmer's own upcoming jobs. Empty for a new farm; the demo farm comes with sample jobs. */
export default function TodayTasks({ tasks = [], demo = false }) {
  const { update, create } = useEntityMutations("Task", "tasks");
  const { t: tr, lang } = useT();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: "", date: isoOf(new Date()), type: "irrigation" });
  const upcoming = tasks.filter((t) => !t.done).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

  const add = async (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    await create.mutateAsync({ ...draft, title: draft.title.trim(), field: "", done: false });
    setDraft({ ...draft, title: "" });
    setAdding(false);
  };

  return (
    <section className="kisan-card p-5 sm:p-6" aria-labelledby="tasks-title" data-testid="tasks-card">
      <div className="flex items-center justify-between gap-2">
        <h2 id="tasks-title" className="kisan-label">
          {tr("Next on the farm")}
          {demo && <span className="ms-2 rounded bg-harvest/15 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-harvest">{tr("Demo data")}</span>}
        </h2>
        <Link to="/calendar" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          {tr("Calendar")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      {upcoming.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {upcoming.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <button
                onClick={() => update.mutate({ id: t.id, done: true })}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-transparent hover:border-primary hover:text-primary focus-ring"
                aria-label={tr("Mark \"{task}\" done", { task: tr(t.title) })}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" dir="auto">{tr(t.title)}</p>
                {t.field && <p className="text-xs text-muted-foreground" dir="auto">{tr(t.field)}</p>}
              </div>
              <div className="text-end">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", TASK_TYPES[t.type]?.tone)}>{t.type === "custom" && t.label ? t.label : tr(TASK_TYPES[t.type]?.label || "")}</span>
                <p className="mt-1 text-[11px] text-muted-foreground">{fmt(t.date, tr, lang)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {upcoming.length === 0 && !adding && (
        <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-7 text-center">
          <ClipboardList className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium">{tr("No jobs planned yet")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tr("Add irrigation, fertilizer, spraying or anything else you need to remember.")}</p>
        </div>
      )}

      {adding ? (
        <form onSubmit={add} className="mt-4 space-y-2">
          <input autoFocus className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={tr("e.g. Spray for aphids")} dir="auto" aria-label={tr("Add task")} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className={inputClass} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} aria-label={tr("Date")} />
            <select className={inputClass} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} aria-label={tr("Task type")}>
              {Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{tr(v.label)}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="kisan-btn-primary flex-1 focus-ring" disabled={!draft.title.trim()}>{tr("Save task")}</button>
            <button type="button" onClick={() => setAdding(false)} className="kisan-btn-ghost focus-ring">{tr("Cancel")}</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="kisan-btn-ghost mt-4 w-full focus-ring" data-testid="add-task">
          <Plus className="h-4 w-4" aria-hidden="true" /> {tr("Add task")}
        </button>
      )}
    </section>
  );
}
