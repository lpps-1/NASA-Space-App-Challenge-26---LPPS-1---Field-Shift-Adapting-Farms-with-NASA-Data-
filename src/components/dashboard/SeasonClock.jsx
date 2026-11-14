import { useEffect, useState } from "react";
import { Satellite } from "lucide-react";
import { CROP_SEASON } from "@/data/fixtures";
import { cropUrdu, currentSeason, rotationOf } from "@/lib/farmSetup";
import { useT } from "@/i18n";

/**
 * Season clock: the farmer's crop year as a dial. The winter and summer crops are arcs,
 * a hand sweeps to today's date, and a NASA satellite slowly circles the dial (the data
 * behind the app comes from satellites like it). Starts at October, like the crop year.
 */
const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const SIZE = 240;
const C = SIZE / 2;
const R = 84; // crop arcs
const R_ORBIT = 108;

const polar = (deg, r) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const arc = (from, to, r) => {
  const [x1, y1] = polar(from, r);
  const [x2, y2] = polar(to, r);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

export default function SeasonClock({ profile }) {
  const { t, lang } = useT();
  const r = rotationOf(profile?.rotation);
  const crops = [...(profile?.current_crops || []), ...(profile?.previous_crops || [])];
  const bySeason = (s) => crops.find((c) => CROP_SEASON[c] === s) || null;
  const winter = r?.rabi || bySeason("rabi");
  const summer = r?.kharif || bySeason("kharif");
  const name = (c) => (c ? (lang === "en" ? c : cropUrdu(c) || c) : t("Not set"));

  // Position in the crop year (October = 0°), with the day of the month.
  const now = new Date();
  const monthPos = (now.getMonth() + 3) % 12;
  const dayFrac = (now.getDate() - 1) / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = ((monthPos + dayFrac) / 12) * 360;
  const season = currentSeason();

  // The hand sweeps from the top to today when the card appears.
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAngle(today));
    return () => cancelAnimationFrame(id);
  }, [today]);

  const winterEnd = (7 / 12) * 360; // Oct–Apr
  const [hx, hy] = polar(0, R - 22);

  return (
    <section className="kisan-card p-5 sm:p-6" aria-labelledby="season-clock-title" data-testid="season-clock">
      <div className="flex items-center justify-between gap-3">
        <h2 id="season-clock-title" className="kisan-label">{t("Season clock")}</h2>
        <Satellite className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="relative mx-auto mt-3 aspect-square w-full max-w-[260px]" dir="ltr">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label={t("Your crop year as a clock, with today marked")}>
          {/* Satellite orbit */}
          <circle cx={C} cy={C} r={R_ORBIT} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeDasharray="2 5" />
          <g className="season-orbit" style={{ transformOrigin: `${C}px ${C}px` }}>
            <g transform={`translate(${C} ${C - R_ORBIT})`}>
              <circle r="9" fill="hsl(var(--primary))" fillOpacity="0.18" className="soft-pulse" />
              <rect x="-2.5" y="-2.5" width="5" height="5" rx="1" fill="hsl(var(--harvest))" />
              <rect x="-9" y="-1.5" width="5" height="3" fill="hsl(var(--primary))" />
              <rect x="4" y="-1.5" width="5" height="3" fill="hsl(var(--primary))" />
            </g>
          </g>

          {/* Month ticks and labels */}
          {MONTHS.map((m, i) => {
            const deg = (i / 12) * 360;
            const [x1, y1] = polar(deg, R + 9);
            const [x2, y2] = polar(deg, R + 13);
            const [lx, ly] = polar(deg + 15, R + 21);
            return (
              <g key={m}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity="0.3" />
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" fontSize="8.5" fontWeight={i === monthPos ? 700 : 400}>
                  {m[0]}
                </text>
              </g>
            );
          })}

          {/* Track and the two seasons */}
          <circle cx={C} cy={C} r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
          <path d={arc(1.5, winterEnd - 1.5, R)} fill="none" stroke="hsl(var(--harvest))" strokeWidth="14" strokeLinecap="round" pathLength="1" className="season-arc" opacity={winter ? 1 : 0.35} />
          <path d={arc(winterEnd + 1.5, 358.5, R)} fill="none" stroke="hsl(var(--field))" strokeWidth="14" strokeLinecap="round" pathLength="1" className="season-arc season-arc-2" opacity={summer ? 1 : 0.35} />

          {/* Today's hand */}
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${C}px ${C}px`, transition: "transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <line x1={C} y1={C} x2={hx} y2={hy} stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
            <circle cx={C} cy={C - R} r="6" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2" />
          </g>
          <circle cx={C} cy={C} r="4" fill="hsl(var(--foreground))" />
        </svg>

        {/* Centre read-out */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-14 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Today")}</p>
          <p className="text-sm font-semibold">{t(season === "rabi" ? "Winter season" : "Summer season")}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-secondary/50 px-3 py-2">
          <dt className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-harvest" />{t("Winter season")}</dt>
          <dd className="mt-0.5 font-semibold" dir="auto">{name(winter)}</dd>
        </div>
        <div className="rounded-xl bg-secondary/50 px-3 py-2">
          <dt className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-field" />{t("Summer season")}</dt>
          <dd className="mt-0.5 font-semibold" dir="auto">{name(summer)}</dd>
        </div>
      </dl>
    </section>
  );
}
