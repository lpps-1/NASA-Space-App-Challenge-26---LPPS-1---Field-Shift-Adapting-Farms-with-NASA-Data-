import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import FormField, { inputClass } from "@/components/FormField";
import { TASK_TYPES } from "@/data/fixtures";
import { useEntityMutations, useFields, useIsDemo, useTasks } from "@/hooks/useKisanData";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Monday-first week; names come from the browser in the app language.
const weekdayNames = (locale) => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" }));
const REPEATS = [
  { id: "none", label: "Does not repeat", times: 1, days: 0 },
  { id: "weekly", label: "Every week, 4 times", times: 4, days: 7 },
  { id: "fortnight", label: "Every 2 weeks, 4 times", times: 4, days: 14 },
  { id: "monthly", label: "Every month, 3 times", times: 3, days: 30 },
];
const typeName = (task, t) => (task.type === "custom" && task.label ? task.label : t(TASK_TYPES[task.type]?.label || ""));

export default function Calendar() {
  const { t, lang } = useT();
  const locale = lang === "en" ? "en-GB" : "ur-PK";
  const { data: tasks = [] } = useTasks();
  const { data: fields = [] } = useFields();
  const demo = useIsDemo();
  const ops = useEntityMutations("Task", "tasks");
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState(isoOf(new Date()));
  const [draft, setDraft] = useState({ title: "", type: "irrigation", field: "", label: "", note: "", repeat: "none" });

  const days = useMemo(() => {
    const start = new Date(cursor);
    const offset = (start.getDay() + 6) % 7;
    start.setDate(1 - offset);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);

  const byDate = useMemo(() => tasks.reduce((m, t) => ((m[t.date] ||= []).push(t), m), {}), [tasks]);
  const todayIso = isoOf(new Date());
  const dayTasks = byDate[selected] || [];
  const custom = draft.type === "custom";

  const add = async (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const rule = REPEATS.find((r) => r.id === draft.repeat) || REPEATS[0];
    const { repeat: _r, ...rest } = draft;
    for (let i = 0; i < rule.times; i++) {
      const d = new Date(selected + "T12:00:00");
      d.setDate(d.getDate() + i * rule.days);
      await ops.create.mutateAsync({ ...rest, title: draft.title.trim(), label: custom ? draft.label.trim() : "", note: draft.note.trim(), date: isoOf(d), done: false });
    }
    toast.success(rule.times > 1 ? t("{n} tasks added", { n: rule.times }) : t("Task added"));
    setDraft({ ...draft, title: "", note: "" });
  };

  const shift = (n) => { const d = new Date(cursor); d.setMonth(d.getMonth() + n); setCursor(d); };

  return (
    <>
      <PageHeader eyebrow={t("Calendar")} title={t("Farm calendar")} description={t("Plan irrigation, fertilizer, scouting, harvest and your own custom jobs.")} />
      {demo && (
        <p className="mb-5 rounded-2xl border border-harvest/40 bg-harvest/10 px-4 py-3 text-sm">
          <span className="font-semibold text-harvest">{t("Demo farm.")}</span> {t("These jobs are sample data. A new farm starts with an empty calendar.")}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="kisan-card p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl">{cursor.toLocaleDateString(locale, { month: "long", year: "numeric" })}</h2>
            <div className="flex gap-1">
              <button onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); setSelected(todayIso); }} className="rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-secondary focus-ring">{t("Today")}</button>
              <button onClick={() => shift(-1)} className="rounded-lg p-2 hover:bg-secondary focus-ring" aria-label={t("Previous month")}><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
              <button onClick={() => shift(1)} className="rounded-lg p-2 hover:bg-secondary focus-ring" aria-label={t("Next month")}><ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {weekdayNames(locale).map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const iso = isoOf(d);
              const list = byDate[iso] || [];
              const outside = d.getMonth() !== cursor.getMonth();
              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-start rounded-xl p-1.5 text-sm transition-colors focus-ring sm:aspect-[1.1]",
                    selected === iso ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                    outside && selected !== iso && "text-muted-foreground/50"
                  )}
                  aria-label={`${d.toLocaleDateString(locale)}, ${t("{n} tasks", { n: list.length })}`}
                >
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", iso === todayIso && selected !== iso && "ring-1 ring-accent")}>{d.getDate()}</span>
                  <span className="mt-auto flex gap-0.5">
                    {list.slice(0, 3).map((x) => (
                      <span key={x.id} className={cn("h-1.5 w-1.5 rounded-full", x.done ? "bg-muted-foreground/40" : selected === iso ? "bg-primary-foreground" : x.type === "custom" ? "bg-fuchsia-400" : "bg-accent")} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="kisan-card p-5">
          <h2 className="kisan-label">{new Date(selected + "T00:00").toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}</h2>
          <ul className="mt-4 space-y-2">
            {dayTasks.map((task) => (
              <li key={task.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                <input type="checkbox" checked={task.done} onChange={() => ops.update.mutate({ id: task.id, done: !task.done })} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" aria-label={`${t("Done")}: ${t(task.title)}`} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", task.done && "text-muted-foreground line-through")} dir="auto">{t(task.title)}</p>
                  {task.note && <p className="mt-0.5 text-xs text-muted-foreground" dir="auto">{task.note}</p>}
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px]", TASK_TYPES[task.type]?.tone)}>{typeName(task, t)}</span>
                    {task.field && <span dir="auto">{t(task.field)}</span>}
                  </p>
                </div>
                <button onClick={() => ops.remove.mutate(task.id)} className="p-1 text-muted-foreground hover:text-destructive" aria-label={`${t("Delete")}: ${t(task.title)}`}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {dayTasks.length === 0 && <li className="rounded-xl border border-dashed border-border py-5 text-center text-sm text-muted-foreground">{t("Nothing planned.")}</li>}
          </ul>

          <form onSubmit={add} className="mt-5 space-y-3 border-t border-border pt-5" data-testid="task-form">
            <FormField label={t("Add task")} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={t("e.g. Spray for aphids")} dir="auto" />
            <div>
              <p className="mb-1.5 text-sm font-medium">{t("Kind of job")}</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(TASK_TYPES).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={draft.type === k}
                    onClick={() => setDraft({ ...draft, type: k })}
                    data-testid={`task-type-${k}`}
                    className={cn("rounded-full border px-3 py-1 text-xs transition-all focus-ring active:scale-95", draft.type === k ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary/60")}
                  >
                    {k === "custom" && <Plus className="me-1 inline h-3 w-3" aria-hidden="true" />}
                    {t(v.label)}
                  </button>
                ))}
              </div>
            </div>
            {custom && (
              <FormField label={t("Name your own kind of job")} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder={t("e.g. Vet visit, labour payment, canal turn")} dir="auto" maxLength={30} />
            )}
            <FormField label={t("Field")}>
              <select className={inputClass} value={draft.field} onChange={(e) => setDraft({ ...draft, field: e.target.value })}>
                <option value="">{t("Whole farm")}</option>
                {fields.map((f) => <option key={f.id} value={f.name}>{t(f.name)}</option>)}
              </select>
            </FormField>
            <FormField label={t("Note (optional)")} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder={t("e.g. 1 bag per acre, early morning")} dir="auto" maxLength={120} />
            <FormField label={<span className="inline-flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5" aria-hidden="true" />{t("Repeat")}</span>}>
              <select className={inputClass} value={draft.repeat} onChange={(e) => setDraft({ ...draft, repeat: e.target.value })}>
                {REPEATS.map((r) => <option key={r.id} value={r.id}>{t(r.label)}</option>)}
              </select>
            </FormField>
            <button className="kisan-btn-primary w-full focus-ring" disabled={!draft.title.trim() || (custom && !draft.label.trim())}>
              <Plus className="h-4 w-4" /> {t("Add to {date}", { date: new Date(selected + "T00:00").toLocaleDateString(locale, { day: "numeric", month: "short" }) })}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
