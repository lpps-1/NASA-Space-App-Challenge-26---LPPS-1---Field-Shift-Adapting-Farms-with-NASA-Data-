import { Satellite } from "lucide-react";
import { useT } from "@/i18n";

/** NASA POWER satellite and model data for the farmer's district, last ~30 days. */
export default function NasaData({ nasa }) {
  const { t, lang } = useT();
  const fmt = (iso) => new Date(iso + "T00:00:00").toLocaleDateString(lang === "en" ? "en-GB" : "ur-PK", { day: "numeric", month: "short" });
  return (
    <section className="kisan-card p-5 sm:p-6" aria-labelledby="nasa-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="nasa-title" className="kisan-label">{t("NASA satellite data")}</h2>
        <Satellite className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      {nasa ? (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("{place}, {from} to {to} ({n} days)", { place: nasa.location, from: fmt(nasa.period.start), to: fmt(nasa.period.end), n: nasa.period.days })}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("Rainfall, total")}</dt>
              <dd className="font-semibold tabular-nums">{nasa.rain_mm_total ?? "—"} mm</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Average temperature")}</dt>
              <dd className="font-semibold tabular-nums">
                {nasa.temp_c_mean ?? "—"}°C
                {nasa.temp_c_min_mean != null && <span className="ms-1 text-xs font-normal text-muted-foreground">({nasa.temp_c_min_mean}–{nasa.temp_c_max_mean}°)</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Root-zone soil moisture")}</dt>
              <dd className="font-semibold tabular-nums">{nasa.soil_wetness_pct != null ? `${nasa.soil_wetness_pct}%` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Sunlight, daily average")}</dt>
              <dd className="font-semibold tabular-nums">
                {nasa.solar_mean ?? "—"} <span className="text-xs font-normal text-muted-foreground">{nasa.solar_units?.replace("^2", "²")}</span>
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("Source")}:{" "}
            <a href={nasa.source_url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
              NASA POWER
            </a>
            , {t("Langley Research Center. Soil moisture is 0% when dry, 100% when saturated.")}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("NASA data loads on the live site once your district is set under My farm.")}
        </p>
      )}
    </section>
  );
}
