import { lazy, Suspense } from "react";
import { Bot, BookOpen, CloudSun, ExternalLink, Landmark, Satellite } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAir, useClimate, useKnowledge, useNasa, useProfile, useSatellite, useSlopeGrid, useSoilSurvey, useTerrain, useWeather } from "@/hooks/useKisanData";

const FarmMap = lazy(() => import("@/components/FarmMap"));
import { landSummary, PK_SURVEY_SOURCES } from "@/data/landSurveys";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

const STATUS = {
  live: { label: "Live for your farm", cls: "border-field/50 text-field" },
  loading: { label: "Loading…", cls: "text-muted-foreground" },
  off: { label: "Not reachable right now", cls: "border-alert/50 text-alert" },
  background: { label: "Background figures", cls: "border-harvest/50 text-harvest" },
  map: { label: "On your farm map", cls: "border-sky-500/50 text-sky-600 dark:text-sky-400" },
  scores: { label: "Map + in the scores", cls: "border-field/50 text-field" },
  reference: { label: "Reference, not connected yet", cls: "text-muted-foreground" },
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
  const { data: terrain, isLoading: terrainLoading } = useTerrain();
  const { data: sat, isLoading: satLoading } = useSatellite();
  const { data: grid } = useSlopeGrid();
  const satStatus = satLoading ? "loading" : sat ? "scores" : "map";
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

      <Suspense fallback={<div className="kisan-card h-96 animate-pulse" />}>
        <FarmMap />
      </Suspense>

      <Group icon={Satellite} title="NASA Earth observation" intro="The datasets named in the NASA challenge. Climate history, slope and the satellite readings at your farm pin all feed the rotation scores; the map shows the same images around your farm.">
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
          name="SRTM: elevation and slope"
          by="NASA Shuttle Radar Topography Mission, 30 m"
          use="Height and slope of the land around your farm, and a 150 m slope grid that marks erosion hotspots on the map. Rotations that leave sloping patches bare get an erosion warning and a lower risk score."
          status={st(terrain, terrainLoading)}
          detail={terrain ? `${terrain.elevation_m} m, ${terrain.slope_pct}% ${t("slope")} (${t(terrain.erosion_risk)} ${t("erosion risk")})${grid?.summary ? ` · ${grid.summary.high + grid.summary.medium}/${grid.summary.cells} ${t("patches slope 3% or more")}` : ""}` : null}
          href="https://www.earthdata.nasa.gov/data/instruments/srtm"
        />
        <Source
          name="SMAP: soil moisture"
          by="NASA Soil Moisture Active Passive, Level 4 root zone, 9 km"
          use="Water in the top metre of soil, read at your farm. Dry soil before sowing lowers the weather-safety score of the crop sown next."
          status={satStatus}
          detail={sat?.soil_moisture ? `${sat.soil_moisture.value} m³/m³ · ${sat.soil_moisture.date}` : null}
          href="https://smap.jpl.nasa.gov/"
        />
        <Source
          name="GPM IMERG: rainfall"
          by="NASA Global Precipitation Measurement, 10 km"
          use="Rain over the last 14 days at your farm (and the latest day on the map). Kisan AI uses it for watering advice."
          status={satStatus}
          detail={sat?.rain_14d ? `${sat.rain_14d.value} mm · ${sat.rain_14d.from} → ${sat.rain_14d.to}` : null}
          href="https://gpm.nasa.gov/data/imerg"
        />
        <Source
          name="MODIS: greenness (NDVI), land cover and ground heat"
          by="NASA Terra satellite, 250 m to 1 km"
          use="Which months your land stood bare (soil score), how green it gets at its peak (expected yield), ground heat at heat-sensitive stages (risk score), and the Vegetation types map that tells forests, field crops and orchards apart."
          status={satStatus}
          detail={sat?.ndvi_year ? `NDVI ${sat.ndvi?.value ?? "?"} · ${t("peak")} ${sat.ndvi_year.peak} · ${sat.land_cover ? t(sat.land_cover.name) : ""}` : null}
          href="https://modis.gsfc.nasa.gov/"
        />
        <Source
          name="Landsat (HLS): field-scale image"
          by="NASA / USGS Harmonized Landsat Sentinel-2, 30 m"
          use="A real-colour satellite image of the fields around your farm."
          status="map"
          href="https://www.earthdata.nasa.gov/data/projects/hls"
        />
        <Source
          name="GRACE / GRACE-FO: groundwater trend"
          by="NASA and German gravity missions, monthly, about 300 km"
          use="Whether water stored underground in your region has risen or fallen. Where it has fallen, rotations that need a lot of tube-well water lose water points. The newest map NASA GIBS publishes is from mid-2022, so it shows the long-term direction, not this year."
          status={satStatus}
          detail={sat?.groundwater ? `${sat.groundwater.value > 0 ? "+" : ""}${sat.groundwater.value} cm · ${sat.groundwater.date}` : null}
          href="https://grace.jpl.nasa.gov/"
        />
        <Source
          name="ECOSTRESS, NLDAS / GLDAS"
          by="NASA crop-water-stress and land-data models"
          use="Not integrated. ECOSTRESS (70 m evaporation and plant water stress) is not published as NASA GIBS map tiles and needs an Earthdata login to download, so the app does not use it. MODIS ground temperature (1 km) stands in for heat stress, at much coarser detail."
          status="planned"
          href="https://ecostress.jpl.nasa.gov/"
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
              name="Agricultural Census of Pakistan"
              by="Pakistan Bureau of Statistics"
              use="Farm sizes, area under each crop by district and how land is irrigated. Background for typical farms in your district."
              status="reference"
              href="https://www.pbs.gov.pk/"
            />
            <Source
              name="Crop Reporting Service and Economic Survey"
              by="Punjab Agriculture Department; Ministry of Finance, Government of Pakistan"
              use="Crop area, yield and sowing figures by district and season. Used to check the typical crop figures."
              status="reference"
              href="https://www.finance.gov.pk/"
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
        {us && (
          <>
            <Source
              name="Cropland Data Layer (CropScape)"
              by="USDA National Agricultural Statistics Service, 30 m, yearly"
              use="Which crop grew on each field in past years: the real rotations around your farm."
              status="reference"
              href="https://nassgeodata.gmu.edu/CropScape/"
            />
            <Source
              name="PRISM climate, NLCD land cover, NAIP imagery"
              by="Oregon State University; USGS; USDA Farm Service Agency"
              use="Local climate normals and frost dates, land cover near the field, and 1 m aerial photos."
              status="reference"
              href="https://prism.oregonstate.edu/"
            />
            <Source
              name="USDA Ag Data Commons"
              by="United States Department of Agriculture"
              use="Open research datasets on soils, crops and field management."
              status="reference"
              href="https://agdatacommons.nal.usda.gov/"
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
            "Today's price at your market. Income uses typical prices; machinery and where you sell count only if you tick them on the Rotation page.",
            "ECOSTRESS plant water stress: not integrated. MODIS ground heat stands in at 1 km.",
            "This year's groundwater: the newest GRACE map in NASA GIBS is from mid-2022.",
            "A trained AI model for the scores. There are no yield records for single fields to train one honestly, so the scores are open crop rules, checked against a replay of 20 years of NASA weather.",
            "Your exact field: satellite pixels are 250 m to 9 km, bigger than most fields.",
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
