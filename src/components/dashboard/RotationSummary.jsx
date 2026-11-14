import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Droplets, Repeat, Satellite } from "lucide-react";
import { useClimate, useProfile, useSoilSurvey } from "@/hooks/useKisanData";
import { landSummary } from "@/data/landSurveys";
import { planRotations, rotationTitle } from "@/lib/rotation";
import { useT } from "@/i18n";

/** The headline of the rotation planner, at the top of the dashboard. */
export default function RotationSummary() {
  const { t, lang } = useT();
  const { data: profile } = useProfile();
  const { data: climate, isLoading } = useClimate();
  const { data: usda } = useSoilSurvey();
  const plan = useMemo(() => (profile ? planRotations({ profile, climate, land: landSummary(profile, usda) }) : null), [profile, climate, usda]);
  if (!plan) return <div className="kisan-card h-28 animate-pulse" />;
  const cur = plan.current;
  const best = plan.top.find((s) => !s.isCurrent);
  const better = best && best.total > cur.total;
  const saved = best ? cur.irrigation_mm - best.irrigation_mm : 0;

  return (
    <section className="kisan-card overflow-hidden p-0" aria-labelledby="rot-sum-title" data-testid="rotation-summary">
      <div className="grid gap-0 md:grid-cols-[1fr_auto_1fr_auto]">
        <div className="p-5">
          <p id="rot-sum-title" className="kisan-label flex items-center gap-2"><Repeat className="h-3.5 w-3.5" aria-hidden="true" /> {t("Your rotation now")}</p>
          <p className="mt-2 font-display text-xl leading-snug" dir="auto">{rotationTitle(cur, lang)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{cur.total}</span> {t("match / 100")} · {t("About {mm} mm irrigation a year", { mm: cur.irrigation_mm.toLocaleString() })}
          </p>
        </div>
        <div className="hidden items-center px-1 text-muted-foreground md:flex"><ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" /></div>
        <div className="border-t border-border bg-primary/5 p-5 md:border-s md:border-t-0">
          <p className="kisan-label flex items-center gap-2 !text-harvest"><Satellite className="h-3.5 w-3.5" aria-hidden="true" /> {better ? t("Best fit from NASA data") : t("Closest alternative")}</p>
          <p className="mt-2 font-display text-xl leading-snug" dir="auto">{best ? rotationTitle(best, lang) : "—"}</p>
          {best && (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{best.total}</span> {t("match / 100")}
              {saved > 50 && <span className="ms-2 inline-flex items-center gap-1 text-sky-400"><Droplets className="h-3 w-3" aria-hidden="true" />{t("{mm} mm less than now", { mm: saved })}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center border-t border-border p-5 md:border-t-0">
          <Link to="/rotation" className="kisan-btn-gold w-full focus-ring md:w-auto">
            {t("Compare rotations")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
      {isLoading && <p className="border-t border-border px-5 py-2 text-[11px] text-muted-foreground">{t("Loading NASA climate history…")}</p>}
    </section>
  );
}
