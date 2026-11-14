import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, MessagesSquare, Mic } from "lucide-react";
import DistrictSwitcher from "@/components/dashboard/DistrictSwitcher";
import CountryGlobe from "@/components/dashboard/CountryGlobe";
import { greetingName } from "@/lib/profile";
import { useT } from "@/i18n";

const GREETING = {
  ur: "السلام علیکم",
  pa: "السلام علیکم",
  en: "Hi",
};

/** Personalised greeting hero. The name always comes from the profile's display_name. */
export default function DashboardHeader({ profile }) {
  const name = greetingName(profile);
  const { t, lang } = useT();
  const greeting = GREETING[lang] || GREETING.en;
  const today = new Date().toLocaleDateString(lang === "en" ? "en-GB" : "ur-PK", { weekday: "long", day: "numeric", month: "long" });

  return (
    <header className="kisan-hero rise-in z-10 p-6 sm:p-8">
      {/* Left: date chips, greeting, buttons with the same gap between each. Right: the globe, centred on the whole height. */}
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-stretch sm:justify-between sm:gap-8">
        <div className="flex min-w-0 flex-col justify-between gap-5">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/75">
            <span className="kisan-chip border-white/15 bg-white/5 text-white/85">
              <CalendarDays className="h-3.5 w-3.5 text-harvest" aria-hidden="true" />
              {today}
            </span>
            <DistrictSwitcher profile={profile} />
          </div>

          <div>
            <h1 className="font-display text-[26px] leading-tight sm:text-[32px]">
              <span dir="auto">{greeting}</span>
              <span>{lang === "en" ? "," : "،"}</span>{" "}
              <span dir="auto" data-testid="greeting-name">{name}</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
              {t("Your weather, crops and next jobs in one place. Ask Kisan AI about your crops, soil, water and livestock, typed or spoken.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link to="/" className="kisan-btn-gold focus-ring">
              <MessagesSquare className="h-4 w-4" aria-hidden="true" />
              {t("Ask Kisan AI")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link
              to="/?voice=1"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-ring"
            >
              <Mic className="h-4 w-4 text-harvest" aria-hidden="true" />
              {t("Talk by voice")}
            </Link>
          </div>
        </div>

        <CountryGlobe profile={profile} className="self-center" />
      </div>
    </header>
  );
}
