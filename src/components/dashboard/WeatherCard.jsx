import { useMemo, useState } from "react";
import { Cloud, CloudRain, CloudSun, Leaf, Sun } from "lucide-react";
import { useAir, useHourly, useSettings, useUpdateSettings } from "@/hooks/useKisanData";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

const AQI_TONE = {
  good: "bg-emerald-500/15 text-emerald-500",
  moderate: "bg-yellow-500/15 text-yellow-500",
  sensitive: "bg-orange-500/15 text-orange-500",
  unhealthy: "bg-red-500/15 text-red-500",
  "very-unhealthy": "bg-purple-500/15 text-purple-400",
  hazardous: "bg-rose-600/20 text-rose-400",
};
const ICONS = { sun: Sun, haze: CloudSun, cloud: Cloud, rain: CloudRain };
const TABS = [
  { id: "temp", label: "Temperature", stroke: "hsl(var(--harvest))" },
  { id: "rain", label: "Rain chance", stroke: "rgb(56 189 248)" },
  { id: "wind", label: "Wind", stroke: "rgb(148 163 184)" },
];

/** Day name in the app language (from the forecast date when there is one). */
const dayName = (d, t, lang, long = false) =>
  d.date ? new Date(d.date + "T12:00:00").toLocaleDateString(lang === "en" ? "en-GB" : "ur-PK", { weekday: long ? "long" : "short" }) : t(d.day);

/** Plain farm advice from the forecast (°C), in the app language. Mirrors advise() in netlify/functions/weather.mjs. */
function adviceFor(days, t, lang) {
  const name = (d) => dayName(d, t, lang);
  const rain = days.slice(0, 4).find((d) => d.rain >= 50 || (d.rain_mm ?? 0) >= 5);
  const frost = days.find((d) => d.lo <= 3);
  const heat = days.find((d) => d.hi >= 40);
  if (rain) return t("Rain likely {day} ({pct}% chance). Hold urea top-dressing and pesticide sprays until after it, and skip an irrigation if the rain arrives.", { day: name(rain), pct: rain.rain });
  if (frost) return t("Frost risk {day} (low {t}°). Give a light irrigation the evening before to protect young crops and vegetables.", { day: name(frost), t: frost.lo });
  if (heat) return t("Heat stress {day} (high {t}°). Irrigate in the evening or early morning and avoid spraying in the afternoon.", { day: name(heat), t: heat.hi });
  return t("No rain is likely in the next few days. Follow your normal irrigation schedule and use the dry spell for spraying or fertilizer.");
}

/** A smooth curve through the points, and the same curve closed down to the baseline. */
function curve(pts, base) {
  const line = pts.reduce((d, p, i, a) => (i === 0 ? `M${p.x},${p.y}` : `${d} C${(a[i - 1].x + p.x) / 2},${a[i - 1].y} ${(a[i - 1].x + p.x) / 2},${p.y} ${p.x},${p.y}`), "");
  return { line, area: `${line} L${pts[pts.length - 1].x},${base} L${pts[0].x},${base} Z` };
}

/** Eight points, three hours apart: the rest of today, or the whole of a later day. */
function HourChart({ hours, tab, unit }) {
  const W = 640, H = 150, TOP = 34, BOTTOM = 112;
  const values = hours.map((h) => (tab === "temp" ? (unit === "f" ? (h.temp * 9) / 5 + 32 : h.temp) : tab === "rain" ? h.rain : unit === "f" ? h.wind * 0.621 : h.wind));
  const lo = tab === "rain" ? 0 : Math.min(...values);
  const hi = tab === "rain" ? 100 : Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => ({ x: 34 + (i * (W - 68)) / (values.length - 1), y: BOTTOM - ((v - lo) / span) * (BOTTOM - TOP), v }));
  const { line, area } = curve(pts, H - 14);
  const color = TABS.find((x) => x.id === tab).stroke;
  const suffix = tab === "temp" ? "°" : tab === "rain" ? "%" : "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={tab} dir="ltr">
      <defs>
        <linearGradient id="wx-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.38" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="wx-path" d={area} style={{ d: `path("${area}")` }} fill="url(#wx-fill)" />
      <path className="wx-path" d={line} style={{ d: `path("${line}")` }} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i} style={{ transform: `translateY(${p.y}px)`, transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)" }}>
          <circle cx={p.x} cy="0" r="3" fill={color} />
          <text x={p.x} y="-10" textAnchor="middle" className="fill-foreground text-[13px] font-semibold tabular-nums">{Math.round(p.v)}{suffix}</text>
        </g>
      ))}
      {hours.map((h, i) => (
        <text key={h.time} x={pts[i].x} y={H - 1} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">{h.time.slice(11, 16)}</text>
      ))}
    </svg>
  );
}

export default function WeatherCard({ weather }) {
  const { t, lang } = useT();
  const { data: settings } = useSettings();
  const saveSettings = useUpdateSettings();
  const { data: hourly = [] } = useHourly();
  const { data: liveAir, dataUpdatedAt: airAt } = useAir();
  const [tab, setTab] = useState("temp");
  const [day, setDay] = useState(0);

  const unit = settings?.temp_unit === "f" ? "f" : "c";
  const T = (c) => (c == null ? c : unit === "f" ? Math.round((c * 9) / 5 + 32) : Math.round(c));
  const rawForecast = weather?.forecast || [];

  const hours = useMemo(() => {
    if (!hourly.length) return [];
    const date = rawForecast[day]?.date;
    let start = 0;
    if (day === 0 || !date) {
      const now = Date.now();
      start = Math.max(0, hourly.findIndex((h) => new Date(h.time).getTime() >= now - 30 * 60 * 1000));
    } else start = Math.max(0, hourly.findIndex((h) => h.time.startsWith(date)));
    const out = [];
    for (let i = 0; i < 8; i++) if (hourly[start + i * 3]) out.push(hourly[start + i * 3]);
    return out.length === 8 ? out : [];
  }, [hourly, day, rawForecast]);

  if (!weather) return <div className="kisan-card h-72 animate-pulse" />;
  const { now: rawNow, location } = weather;
  const air = liveAir || weather.air;
  const advisory = weather.sample ? t("Live weather is unavailable right now, so this is sample data. Pick your district in your profile to get the local forecast.") : adviceFor(rawForecast, t, lang);
  const forecast = rawForecast.map((d) => ({ ...d, hi: T(d.hi), lo: T(d.lo) }));
  const sel = forecast[day] || forecast[0];
  // Today shows the current reading; another day shows that day's high.
  const big = day === 0 ? T(rawNow.temp) : sel?.hi;
  const BigIcon = ICONS[sel?.icon] || CloudSun;
  const wind = unit === "f" ? `${Math.round(rawNow.wind * 0.621)} mph` : `${rawNow.wind} km/h`;

  return (
    <section className="kisan-card p-5 sm:p-6" aria-labelledby="weather-title" data-testid="weather-card">
      <p id="weather-title" className="kisan-label">
        {t("Weather in")} <span data-testid="weather-location" dir="auto">{location}</span>
        {weather.sample ? (
          <span className="ms-2 rounded bg-alert/10 px-1.5 py-0.5 text-[11px] font-medium text-alert">{t("Sample")}</span>
        ) : (
          <span className="ms-2 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{t("Live")}</span>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4" dir="ltr">
        <div className="flex items-center gap-3">
          <BigIcon className={cn("h-14 w-14", sel?.icon === "rain" ? "text-sky-400" : "text-harvest")} aria-hidden="true" />
          <div className="flex items-start">
            <span key={`${big}-${unit}`} className="rise-in font-display text-[60px] font-medium leading-none tracking-tight tabular-nums" data-testid="weather-temp">{big}</span>
            <div className="ms-1.5 mt-1.5 flex items-center text-lg" role="group" aria-label={t("Temperature unit")}>
              {["c", "f"].map((u, i) => (
                <span key={u} className="flex items-center">
                  {i > 0 && <span className="mx-1.5 h-4 w-px bg-border" aria-hidden="true" />}
                  <button
                    type="button"
                    aria-pressed={unit === u}
                    onClick={() => saveSettings.mutate({ temp_unit: u })}
                    data-testid={`unit-${u}`}
                    className={cn("rounded px-0.5 font-medium transition-colors focus-ring", unit === u ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground")}
                  >
                    °{u.toUpperCase()}
                  </button>
                </span>
              ))}
            </div>
          </div>
          <dl className="ms-3 hidden space-y-0.5 text-xs text-muted-foreground sm:block">
            <div><dt className="inline">{t("Rain chance")}: </dt><dd className="inline tabular-nums text-foreground/90">{sel?.rain ?? rawNow.rain_chance}%</dd></div>
            <div><dt className="inline">{t("Humidity")}: </dt><dd className="inline tabular-nums text-foreground/90">{rawNow.humidity}%</dd></div>
            <div><dt className="inline">{t("Wind")}: </dt><dd className="inline tabular-nums text-foreground/90">{wind}</dd></div>
          </dl>
        </div>
        <div className="text-end" dir={lang === "en" ? "ltr" : "rtl"}>
          <p className="font-display text-xl">{day === 0 ? t("Now") : dayName(sel, t, lang, true)}</p>
          <p className="text-sm text-muted-foreground">{day === 0 ? t(rawNow.condition) : `${sel.hi}° / ${sel.lo}°`}</p>
          {day === 0 && rawNow.feels != null && <p className="text-xs text-muted-foreground">{t("Feels like {n}°", { n: T(rawNow.feels) })}</p>}
        </div>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:hidden">
        <div><dt className="inline">{t("Rain chance")}: </dt><dd className="inline text-foreground/90">{sel?.rain ?? rawNow.rain_chance}%</dd></div>
        <div><dt className="inline">{t("Humidity")}: </dt><dd className="inline text-foreground/90">{rawNow.humidity}%</dd></div>
        <div><dt className="inline">{t("Wind")}: </dt><dd className="inline text-foreground/90" dir="ltr">{wind}</dd></div>
      </dl>

      {hours.length > 0 && (
        <>
          <div className="mt-5 flex gap-5 border-b border-border text-sm" role="tablist">
            {TABS.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={tab === x.id}
                onClick={() => setTab(x.id)}
                data-testid={`wx-tab-${x.id}`}
                className={cn("-mb-px border-b-2 pb-2 transition-colors focus-ring", tab === x.id ? "border-harvest font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                {t(x.label)}
              </button>
            ))}
          </div>
          <HourChart hours={hours} tab={tab} unit={unit} />
        </>
      )}

      <ol className="mt-4 grid grid-cols-7 gap-1" aria-label={t("7-day forecast")}>
        {forecast.map((d, i) => {
          const Icon = ICONS[d.icon] || Sun;
          return (
            <li key={d.date || d.day}>
              <button
                type="button"
                onClick={() => setDay(i)}
                aria-pressed={day === i}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-all focus-ring",
                  day === i ? "border-white/15 bg-secondary shadow-sm" : "border-transparent hover:bg-secondary/50"
                )}
              >
                <span className={cn("text-[11px]", day === i ? "font-semibold text-foreground" : "text-muted-foreground")}>{i === 0 ? t("Today") : dayName(d, t, lang)}</span>
                <Icon className={d.icon === "rain" ? "h-5 w-5 text-sky-400" : "h-5 w-5 text-harvest"} aria-hidden="true" />
                <span className="text-xs tabular-nums"><span className="font-semibold">{d.hi}°</span> <span className="text-muted-foreground">{d.lo}°</span></span>
                {d.rain >= 30 && <span className="text-[10px] font-medium tabular-nums text-sky-400">{d.rain}%</span>}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs" data-testid="aqi">
        <Leaf className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">{t("Air quality")}</span>
        {air ? (
          <>
            <span className={cn("rounded-full px-2.5 py-1 font-semibold tabular-nums", AQI_TONE[air.level])}>AQI {air.aqi} · {t(air.label)}</span>
            {air.pm25 != null && <span className="text-muted-foreground" dir="ltr">PM2.5 {air.pm25} µg/m³</span>}
            {airAt > 0 && <span className="text-muted-foreground">· {t("updated {time}", { time: new Date(airAt).toLocaleTimeString(lang === "en" ? "en-GB" : "ur-PK", { hour: "2-digit", minute: "2-digit" }) })}</span>}
            {air.aqi > 150 && <span className="w-full text-muted-foreground">{t("Smog: wear a mask in the field and avoid burning crop residue.")}</span>}
          </>
        ) : (
          <span className="text-muted-foreground">{t("unavailable")}</span>
        )}
      </div>

      {advisory && (
        <p className="mt-4 rounded-xl border-s-[3px] border-accent bg-accent/10 px-3.5 py-3 text-[13px] leading-relaxed text-foreground/90">
          <span className="font-semibold text-highlight">{t("Advice")}: </span>
          {advisory}
        </p>
      )}
    </section>
  );
}
