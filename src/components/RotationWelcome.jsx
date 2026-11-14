import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Droplets, Layers, Satellite, X } from "lucide-react";
import { useClimate, useProfile, useSoilSurvey, useTerrain } from "@/hooks/useKisanData";
import { landSummary } from "@/data/landSurveys";
import { planRotations, rotationTitle } from "@/lib/rotation";
import { ROTATION_WELCOME_KEY } from "@/pages/Onboarding";
import { useT } from "@/i18n";

/**
 * Shown once, right after farm setup: the rotation that best fits the answers the
 * farmer just gave, worked out from NASA climate history and the soil survey.
 */
export default function RotationWelcome() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(ROTATION_WELCOME_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { data: profile } = useProfile();
  const { data: climate, isLoading: climateLoading } = useClimate();
  const { data: usda, isLoading: soilLoading } = useSoilSurvey();
  const { data: terrain } = useTerrain();
  const loading = open && (climateLoading || soilLoading || !profile);

  const plan = useMemo(() => {
    if (!open || !profile || loading) return null;
    return planRotations({ profile, climate, land: { ...landSummary(profile, usda), terrain: terrain || null } });
  }, [open, profile, climate, usda, terrain, loading]);

  // Play the closing animation, then remove the dialog.
  const [closing, setClosing] = useState(false);
  const close = (then) => {
    if (closing) return;
    try {
      sessionStorage.removeItem(ROTATION_WELCOME_KEY);
    } catch {
      /* ignore */
    }
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      if (typeof then === "function") then();
    }, 160);
  };

  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  if (!open) return null;
  const best = plan?.top.find((s) => !s.isCurrent) || null;
  const cur = plan?.current;
  const keepCurrent = best && cur && cur.total >= best.total;
  const pick = keepCurrent ? cur : best;
  const saved = best && cur ? cur.irrigation_mm - best.irrigation_mm : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="rw-title" data-testid="rotation-welcome">
      <div className="kisan-overlay absolute inset-0 bg-black/50" data-closing={closing || undefined} onClick={() => close()} />
      <div className="kisan-dialog relative w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-2xl [border-color:var(--card-line)]" data-closing={closing || undefined}>
        <button onClick={() => close()} className="absolute end-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring" aria-label={t("Close")}>
          <X className="h-4 w-4" />
        </button>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Satellite className="h-3.5 w-3.5" aria-hidden="true" /> {t("From your answers and satellite data")}
        </p>
        <h2 id="rw-title" className="mt-2 pe-8 text-lg font-semibold leading-snug">
          {loading ? t("Working out your best rotation…") : keepCurrent ? t("Your current rotation already fits best") : t("The best rotation for your farm")}
        </h2>

        {loading && (
          <div className="mt-4 space-y-2">
            <div className="h-6 w-2/3 animate-pulse rounded-md bg-secondary" />
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-secondary" />
            <p className="pt-1 text-xs text-muted-foreground">{t("Reading 20 years of NASA climate data for {place}…", { place: profile?.district || "" })}</p>
          </div>
        )}

        {pick && (
          <>
            <p className="mt-1 font-display text-2xl text-primary dark:text-harvest" dir="auto">{rotationTitle(pick, lang)}</p>
            <dl className="mt-4 flex divide-x rounded-xl border text-center rtl:divide-x-reverse [border-color:var(--card-line)]">
              <div className="flex-1 py-2.5">
                <dd className="text-lg font-semibold tabular-nums">{pick.total}</dd>
                <dt className="text-[11px] text-muted-foreground">{t("match / 100")}</dt>
              </div>
              <div className="flex-1 py-2.5">
                <dd className="flex items-center justify-center gap-1 text-lg font-semibold tabular-nums"><Droplets className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />{pick.scores.water}</dd>
                <dt className="text-[11px] text-muted-foreground">{t("Water")}</dt>
              </div>
              <div className="flex-1 py-2.5">
                <dd className="flex items-center justify-center gap-1 text-lg font-semibold tabular-nums"><Layers className="h-3.5 w-3.5 text-highlight" aria-hidden="true" />{pick.scores.soil}</dd>
                <dt className="text-[11px] text-muted-foreground">{t("Soil")}</dt>
              </div>
            </dl>
            <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-foreground/90">
              {!keepCurrent && cur && <li>{t("You grow {current} now ({score}/100).", { current: rotationTitle(cur, lang), score: cur.total })}</li>}
              {!keepCurrent && saved > 50 && <li>{t("Needs about {mm} mm less irrigation a year than your current rotation.", { mm: saved })}</li>}
              {pick.explain.why.slice(0, keepCurrent ? 1 : 2).map((x, i) => <li key={i}>{t(x)}</li>)}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {climate
                ? t("Based on NASA POWER climate history {from}–{to}, your soil, water and goals. It supports your judgment; it does not replace it.", { from: climate.period.first_year, to: climate.period.last_year })
                : t("Based on your soil, water and goals. NASA climate history could not be loaded just now, so typical values were used.")}
            </p>
          </>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={() => close()} className="kisan-btn-ghost focus-ring">{t("Later")}</button>
          <button onClick={() => close(() => navigate("/rotation"))} className="kisan-btn-primary focus-ring" data-testid="rotation-welcome-view">
            {t("View details")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
