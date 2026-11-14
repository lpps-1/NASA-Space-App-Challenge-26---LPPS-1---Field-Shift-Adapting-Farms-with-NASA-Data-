import { Link } from "react-router-dom";
import React from "react";
import { CloudSun, Mic, Sprout } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { useT } from "@/i18n";

const POINTS = [
  { icon: Mic, en: "Speak in Urdu, Punjabi or English" },
  { icon: CloudSun, en: "Live weather for every district of Pakistan" },
  { icon: Sprout, en: "Advice for your own crops and land" },
];

// `icon` is accepted for older callers but no longer drawn.
export default function AuthLayout({ title, subtitle, footer, children }) {
  const { t } = useT();
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="kisan-hero m-3 hidden flex-col justify-between rounded-3xl p-10 lg:flex">
        <div className="relative flex items-center gap-3">
          <BrandMark />
          <div className="leading-tight">
            <p className="font-display text-xl text-white">Kisan AI</p>
            <p className="text-xs text-harvest">Pakistan</p>
          </div>
        </div>
        <div className="relative">
          <h2 className="max-w-md font-display text-3xl leading-tight text-white">
            {t("Ask about your crops, soil and water, in your own language.")}
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: PIcon, en }) => (
              <li key={en} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5">
                  <PIcon className="h-4 w-4 text-harvest" aria-hidden="true" />
                </span>
                <span className="pt-2 text-sm font-medium text-white">{t(en)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/45">{t("Advice is a guide. Confirm doses on the label and with your local agriculture office.")}</p>
      </aside>

      <main className="flex flex-col lg:items-center lg:justify-center lg:px-4 lg:py-10">
        {/* Phones: a compact brand band instead of the side panel. */}
        <div className="kisan-hero m-3 mb-0 px-5 pb-6 pt-5 lg:hidden">
          <div className="relative flex items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <p className="font-display text-lg text-white">Kisan AI</p>
          </div>
          <p className="relative mt-3 text-sm text-white/70">{t("Farming advice in Urdu, Punjabi or English.")}</p>
        </div>
        <div className="w-full max-w-md self-center px-4 py-8 lg:px-0 lg:py-0">
          <div className="mb-6 lg:mb-8">
            <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="kisan-card p-7 sm:p-8">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">{t("Privacy Policy")}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
