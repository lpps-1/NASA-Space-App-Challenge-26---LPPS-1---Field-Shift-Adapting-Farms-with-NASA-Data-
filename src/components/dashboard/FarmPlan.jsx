import { Link } from "react-router-dom";
import { MessagesSquare, PencilLine } from "lucide-react";
import { CropYearStrip } from "@/components/FarmChoices";
import { IRRIGATION_OPTIONS } from "@/data/fixtures";
import { goalOf, rotationOf } from "@/lib/farmSetup";
import { useT } from "@/i18n";

const ask = (q) => `/?q=${encodeURIComponent(q)}`;

/** The farmer's setup answers on the dashboard: crop year, water and goals, each one tap from Kisan AI. */
export default function FarmPlan({ profile }) {
  const { t, lang } = useT();
  if (!profile) return <section className="kisan-card h-64 animate-pulse" />;
  const L = (o) => (lang === "en" ? o.en : o.ur);
  const goals = (profile.goals || []).map(goalOf).filter(Boolean);
  const rotation = rotationOf(profile.rotation);
  const water = (profile.irrigation_methods || []).map((id) => IRRIGATION_OPTIONS.find((o) => o.id === id)).filter(Boolean).map(L);
  const planQ = `Make a plan for my farm for the rest of this season. My goals: ${goals.map((g) => g.en).join(", ") || "not set"}.`;

  return (
    <section className="kisan-card p-5 sm:p-6" aria-labelledby="plan-title">
      <div className="flex items-center justify-between">
        <h2 id="plan-title" className="kisan-label">{t("Your farm plan")}</h2>
        <Link to="/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus-ring">
          <PencilLine className="h-3.5 w-3.5" aria-hidden="true" /> {t("Edit")}
        </Link>
      </div>

      <div className="mt-5">
        <CropYearStrip rotation={profile.rotation} currentCrops={profile.current_crops} previousCrops={profile.previous_crops} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {[profile.land_acres ? t("{n} acres", { n: profile.land_acres }) : null, water.join(" + ") || null, rotation && rotation.id !== "other" ? L(rotation) : profile.rotation_note || null]
          .filter(Boolean)
          .join(lang === "en" ? ", " : "، ")}
      </p>

      {goals.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium text-muted-foreground">{t("Goals this season. Tap one to ask Kisan AI how to get there.")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {goals.map((g) => (
              <li key={g.id}>
                <Link
                  to={ask(`How can I reach my goal "${g.en}" on my farm this season?`)}
                  className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary hover:text-primary focus-ring"
                >
                  {L(g)}
                </Link>
              </li>
            ))}
          </ul>
          {profile.goal_note && <p className="mt-3 text-sm text-muted-foreground" dir="auto">“{profile.goal_note}”</p>}
        </div>
      )}

      <Link to={ask(planQ)} className="kisan-btn-ghost mt-5 w-full focus-ring">
        <MessagesSquare className="h-4 w-4" aria-hidden="true" /> {t("Ask Kisan AI for a season plan")}
      </Link>
    </section>
  );
}
