import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Droplets, Layers, Satellite, X } from "lucide-react";
import { useClimate, useProfile, useSoilSurvey } from "@/hooks/useKisanData";
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
  const loading = open && (climateLoading || soilLoading || !profile);

  const plan = useMemo(() => {
    if (!open || !profile || loading) return null;
    return planRotations({ profile, climate, land: landSummary(profile, usda) });
  }, [open, profile, climate, usda, loading]);

  const close = () => {
    try {
      sessionStorage.removeItem(ROTATION_WELCOME_KEY);
    } catch {
      /* ignore */
    }
    setOpen(false);
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
    <div className="kisan-fade fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="rw-title" data-testid="rotation-welcome">
      <div className="kisan-sheet kisan-card relative w-full max-w-lg overflow-hidden p-0">
        <div className="kisan-hero relative p-6 text-white">
          <button onClick={close} className="absolute end-3 top-3 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white focus-ring" aria-label={t("Close")}>
            <X className="h-4 w-4" />
          </button>
          <p className="kisan-label flex items-center gap-2 !text-harvest">
            <Satellite className="h-3.5 w-3.5" aria-hidden="true" /> {t("From your answers and satellite data")}
          </p>
          <h2 id="rw-title" className="mt-2 font-display text-2xl leading-tight">
            {loading ? t("Working out your best rotation…") : keepCurrent ? t("Your current rotation already fits best") : t("The best rotation for your farm")}
          </h2>
          {pick && (
            <p className="mt-3 font-display text-3xl text-harvest" dir="auto">{rotationTitle(pick, lang)}</p>
          )}
        </div>

        <div className="space-y-4 p-6">
          {loading && (
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-secondary" />
              <p className="pt-2 text-xs text-muted-foreground">{t("Reading 20 years of NASA climate data for {place}…", { place: profile?.district || "" })}</p>
            </div>
          )}
          {pick && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-secondary/60 p-3">
                  <p className="font-display text-2xl tabular-nums">{pick.total}</p>
                  <p className="text-[11px] text-muted-foreground">{t("match / 100")}</p>
                </div>
                <div className="rounded-2xl bg-secondary/60 p-3">
                  <p className="flex items-center justify-center gap-1 font-display text-2xl tabular-nums"><Droplets className="h-4 w-4 text-sky-400" aria-hidden="true" />{pick.scores.water}</p>
                  <p className="text-[11px] text-muted-foreground">{t("Water")}</p>
                </div>
                <div className="rounded-2xl bg-secondary/60 p-3">
                  <p className="flex items-center justify-center gap-1 font-display text-2xl tabular-nums"><Layers className="h-4 w-4 text-harvest" aria-hidden="true" />{pick.scores.soil}</p>
                  <p className="text-[11px] text-muted-foreground">{t("Soil")}</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm leading-relaxed">
                {!keepCurrent && cur && (
                  <li>{t("You grow {current} now ({score}/100).", { current: rotationTitle(cur, lang), score: cur.total })}</li>
                )}
                {!keepCurrent && saved > 50 && <li>{t("Needs about {mm} mm less irrigation a year than your current rotation.", { mm: saved })}</li>}
                {(pick.explain.why.slice(0, keepCurrent ? 1 : 2)).map((x, i) => <li key={i}>{t(x)}</li>)}
              </ul>
              <p className="text-xs text-muted-foreground">
                {climate
                  ? t("Based on NASA POWER climate history {from}–{to}, your soil, water and goals. It supports your judgment; it does not replace it.", { from: climate.period.first_year, to: climate.period.last_year })
                  : t("Based on your soil, water and goals. NASA climate history could not be loaded just now, so typical values were used.")}
              </p>
            </>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => {
                close();
                navigate("/rotation");
              }}
              className="kisan-btn-gold flex-1 focus-ring"
              data-testid="rotation-welcome-view"
            >
              {t("View details")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </button>
            <button onClick={close} className="kisan-btn-ghost focus-ring">{t("Later")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
