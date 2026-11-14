import { CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/** The week's rain prediction: chance of rain per day, from the district forecast. */
const dayName = (d, t, lang) =>
  d.date ? new Date(d.date + "T12:00:00").toLocaleDateString(lang === "en" ? "en-GB" : "ur-PK", { weekday: "short" }) : t(d.day);

export default function RainOutlook({ weather }) {
  const { t, lang } = useT();
  if (!weather) return <section className="kisan-card h-64 animate-pulse" />;
  const days = weather.forecast || [];
  const wettest = days.reduce((a, d) => ((d.rain ?? 0) > (a?.rain ?? -1) ? d : a), null);
  const summary =
    !wettest || (wettest.rain ?? 0) < 20
      ? t("No rain expected this week.")
      : t("Highest chance of rain: {day} ({pct}%).", { day: wettest === days[0] ? t("Today") : dayName(wettest, t, lang), pct: wettest.rain });

  return (
    <section className="kisan-card p-5 sm:p-6" aria-labelledby="rain-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="rain-title" className="kisan-label">{t("Chance of rain")}</h2>
        <CloudRain className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
      </div>
      <p className="mt-2 text-sm">{summary}</p>
      <ul className="mt-4 space-y-2" aria-label={t("Chance of rain")}>
        {days.map((d, i) => {
          const pct = Math.max(0, Math.min(100, d.rain ?? 0));
          return (
            <li key={d.date || d.day} className="grid grid-cols-[3rem_1fr_3.25rem] items-center gap-3 text-sm">
              <span className={cn(i === 0 ? "font-semibold" : "text-muted-foreground")}>{i === 0 ? t("Today") : dayName(d, t, lang)}</span>
              <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span className={cn("block h-full rounded-full", pct >= 50 ? "bg-sky-600 dark:bg-sky-400" : "bg-sky-600/45 dark:bg-sky-400/50")} style={{ width: `${pct}%` }} />
              </span>
              <span className="text-end tabular-nums">
                {pct}%{d.rain_mm ? <span className="block text-[11px] text-muted-foreground">{d.rain_mm} mm</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {weather.sample && <p className="mt-3 text-xs text-muted-foreground">{t("Sample forecast. Pick your district under My farm for the real one.")}</p>}
    </section>
  );
}
