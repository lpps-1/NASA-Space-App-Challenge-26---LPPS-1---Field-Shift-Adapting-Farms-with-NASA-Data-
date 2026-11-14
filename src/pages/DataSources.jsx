import { Bot, BookOpen, CloudSun, ExternalLink, Landmark, Satellite } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAir, useClimate, useKnowledge, useNasa, useProfile, useSoilSurvey, useWeather } from "@/hooks/useKisanData";
import { landSummary, PK_SURVEY_SOURCES } from "@/data/landSurveys";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

const STATUS = {
  live: { label: "Live for your farm", cls: "border-field/50 text-field" },
  loading: { label: "Loading…", cls: "text-muted-foreground" },
  off: { label: "Not reachable right now", cls: "border-alert/50 text-alert" },
  background: { label: "Background figures", cls: "border-harvest/50 text-harvest" },
  planned: { label: "Not connected yet", cls: "text-muted-foreground" },
  ai: { label: "AI-generated", cls: "border-sky-500/50 text-sky-400" },
};

function Source({ name, by, use, status, detail, href }) {
  const { t } = useT();
  const s = STATUS[status];
  return (
    <li className="rounded-2xl border p-4 [border-color:var(--card-line)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-base">{name}</p>
          <p className="text-xs text-muted-foreground">{t(by)}</p>
        </div>
        <span className={cn("kisan-chip text-[11px]", s.cls)}>
          {status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-field soft-pulse" aria-hidden="true" />}
          {t(s.label)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed"><span className="text-muted-foreground">{t("Used for")}: </span>{t(use)}</p>
      {detail && <p className="mt-1.5 rounded-xl bg-secondary/60 px-3 py-2 text-xs tabular-nums" dir="auto">{detail}</p>}
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {t("Source")} <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      )}
    </li>
  );
}

function Group({ icon: Icon, title, intro, children }) {
  const { t } = useT();
  return (
    <section className="kisan-card p-5 sm:p-6">
      <h2 className="flex items-center gap-2.5 font-display text-xl">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        {t(title)}
      </h2>
      {intro && <p className="mt-2 text-sm text-muted-foreground">{t(intro)}</p>}
      <ul className="mt-4 grid gap-3 md:grid-cols-2">{children}</ul>
    </section>
  );
}

/** Every dataset behind the app: which satellite and government sources are used, for what, and whether they are live right now. */
export default function DataSources() {
  const { t } = useT();
  const { data: profile } = useProfile();
  const { data: climate, isLoading: climateLoading } = useClimate();
  const { data: nasa, isLoading: nasaLoading } = useNasa();
  const { data: weather } = useWeather();
  const { data: air } = useAir();
  const { data: usda, isLoading: usdaLoading } = useSoilSurvey();
  const { data: articles = [] } = useKnowledge();
  const us = profile?.country === "US";
  const land = profile ? landSummary(profile, usda) : null;
  const st = (data, loading) => (loading ? "loading" : data ? "live" : "off");
  const guides = articles.filter((a) => a.status === "published");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("Data sources")}
        title={t("Where Kisan AI's numbers come from")}
        description={t("Which satellite and government survey data the app uses, what each one is used for, and what it does not know. Nothing here is hidden behind the advice.")}
      />

      <Group icon={Satellite} title="NASA Earth observation" intro="Climate history and recent conditions come from NASA. They are the evidence behind every rotation score.">
        <Source
          name="NASA POWER: 20-year climate"
          by="NASA Langley Research Center. Built from satellite observations and the MERRA-2 and GEOS models."
          use="Monthly rainfall, daytime highs and night lows, heat days above 40 °C, frost nights and heavy-rain days for the rotation planner."
          status={st(climate, climateLoading)}
          detail={climate ? `${climate.location}: ${climate.period.first_year}–${climate.period.last_year}, ${climate.averages.rain_mm} mm ${t("rain a year")}, ${climate.averages.heat_days} ${t("days above 40 °C")}` : null}
          href="https://power.larc.nasa.gov/"
        />
        <Source
          name="NASA POWER: last 30 days"
          by="NASA Langley Research Center"
          use="Recent rainfall, temperature, sunlight and root-zone soil wetness on the dashboard."
          status={st(nasa, nasaLoading)}
          detail={nasa?.period ? `${nasa.period.start || ""} → ${nasa.period.end || ""}` : null}
          href="https://power.larc.nasa.gov/docs/methodology/"
        />
        <Source
          name="SMAP, GPM, MODIS, Landsat, ECOSTRESS, GRACE-FO"
          by="NASA missions for soil moisture, rainfall, vegetation, field-scale imagery, crop water stress and groundwater"
          use="Not used directly yet. Field-scale soil moisture, vegetation greenness and groundwater trends would sharpen the scores, and are the next step."
          status="planned"
          href="https://www.earthdata.nasa.gov/"
        />
      </Group>

      <Group icon={Landmark} title="Government land and soil surveys" intro="Soil and water-table background from the national surveys of the country your farm is in.">
        {us ? (
          <Source
            name="USDA NRCS Soil Survey (SSURGO)"
            by="United States Department of Agriculture, Natural Resources Conservation Service"
            use="Soil map unit, drainage class, water-table depth, flooding and water-holding capacity at your location. Poor drainage lowers the score of crops that suffer in wet soil."
            status={st(usda, usdaLoading)}
            detail={land?.lines.slice(0, 3).join(" ") || null}
            href="https://websoilsurvey.nrcs.usda.gov/"
          />
        ) : (
          <>
            {PK_SURVEY_SOURCES.slice(0, 2).map((s) => (
              <Source
                key={s.name}
                name={s.name}
                by="Government of Pakistan"
                use={s.what}
                status="background"
                detail={s.name.startsWith("Soil") ? land?.lines[0] : land?.lines[1]}
                href={s.href}
              />
            ))}
            <Source
              name="Usual soil by district"
              by="General guide from Pakistan's agro-ecological zones (Thal and Cholistan sands, rice-belt clays, Indus delta salinity)"
              use="Pre-fills the soil type in farm setup. You can change it, and a soil test always wins."
              status="background"
              detail={profile?.soil_type ? `${t("Your farm")}: ${profile.soil_type}` : null}
            />
            <Source
              name="USDA NRCS Soil Survey (SSURGO)"
              by="United States Department of Agriculture"
              use="Used live for farms in the United States. Choose United States as your country in My farm to see it."
              status="planned"
              href="https://websoilsurvey.nrcs.usda.gov/"
            />
          </>
        )}
      </Group>

      <Group icon={CloudSun} title="Weather and air" intro="Short-term forecasts are not NASA data. They come from open weather models.">
        <Source
          name="Open-Meteo forecast"
          by="Open-Meteo, blending national weather-service models (NOAA GFS, ECMWF, DWD ICON and others)"
          use="The 7-day and hourly forecast, rain chance, wind and evaporation demand for the irrigation planner."
          status={weather ? (weather.sample ? "off" : "live") : "loading"}
          detail={weather && !weather.sample ? `${weather.location}: ${weather.now.temp} °C, ${t(weather.now.condition)}` : null}
          href="https://open-meteo.com/"
        />
        <Source
          name="Open-Meteo air quality"
          by="Copernicus Atmosphere Monitoring Service (CAMS) model, via Open-Meteo"
          use="US AQI, PM2.5 and PM10 on the dashboard, refreshed every 10 minutes."
          status={air ? "live" : "off"}
          detail={air ? `AQI ${air.aqi} (${t(air.label)}), PM2.5 ${air.pm25} µg/m³` : null}
          href="https://open-meteo.com/en/docs/air-quality-api"
        />
      </Group>

      <Group icon={Bot} title="AI and crop figures" intro="Where a number is typical rather than measured, the app says so.">
        <Source
          name="Google Gemini"
          by="Large language model"
          use="Kisan AI's chat answers, speech-to-text and Urdu speech. Answers are AI-generated and can be wrong: check important decisions with your extension officer."
          status="ai"
          href="https://ai.google.dev/"
        />
        <Source
          name="Typical crop figures"
          by="FAO crop-water guidance, PARC and USDA extension values, rounded"
          use="Seasonal water need, nitrogen fixing, residue and heat limits for each crop in the rotation scores. They compare options; they are not a prescription for one field."
          status="background"
          href="https://www.fao.org/land-water/databases-and-software/crop-information/en/"
        />
      </Group>

      <section className="kisan-card p-5 sm:p-6">
        <h2 className="font-display text-xl">{t("What the app does not know")}</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-relaxed md:grid-cols-2">
          {[
            "Your field's real soil test: nitrogen, organic matter, pH and salt are assumed.",
            "The actual condition of your crop. The stage is worked out from the sowing date, and problems are only what you report.",
            "Local market prices, mill or buyer demand, labour and machinery.",
            "Canal turns, tube-well water quality and groundwater depth at your farm.",
          ].map((x) => (
            <li key={x} className="flex gap-2 rounded-xl bg-secondary/60 px-3 py-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-harvest" />{t(x)}</li>
          ))}
        </ul>
      </section>

      {guides.length > 0 && (
        <section className="kisan-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2.5 font-display text-xl"><BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />{t("Farming guides Kisan AI reads")}</h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {guides.map((a) => (
              <li key={a.id} className="rounded-2xl border p-4 [border-color:var(--card-line)]">
                <p className="text-sm font-semibold" dir="auto">{a.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t(a.category)} · {a.updated}</p>
                <p className="mt-2 text-sm text-muted-foreground" dir="auto">{a.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
