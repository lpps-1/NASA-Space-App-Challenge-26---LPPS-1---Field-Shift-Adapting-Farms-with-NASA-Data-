import { Link } from "react-router-dom";
import { ArrowUpRight, Lightbulb } from "lucide-react";
import { useT } from "@/i18n";
import { cropLabel } from "@/lib/cropNames";

export default function Recommendations({ items = [] }) {
  const { t, lang } = useT();
  return (
    <section className="kisan-card p-5 sm:p-6" aria-labelledby="recs-title">
      <div className="flex items-center justify-between">
        <h2 id="recs-title" className="kisan-label">{t("Recommendations for this week")}</h2>
        <Lightbulb className="h-4 w-4 text-highlight" aria-hidden="true" />
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("Add your crops in your profile to get seasonal advice.")}</p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {items.map((r) => (
            <li key={r.id} className="group flex flex-col rounded-xl border bg-background/40 p-4 transition-colors [border-color:hsl(var(--edge))] hover:border-primary/40">
              {r.crop && <span className="mb-2 self-start rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">{cropLabel(r.crop, lang)}</span>}
              <p className="text-sm font-semibold leading-snug">{t(r.title, r.vars)}</p>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground">{t(r.body, r.vars)}</p>
              <Link
                to={`/?q=${encodeURIComponent(r.ask)}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline"
              >
                {t("Ask Kisan AI")} <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">{t("Based on your district forecast, crops and the season. Confirm local dates with your agriculture extension office.")}</p>
    </section>
  );
}
