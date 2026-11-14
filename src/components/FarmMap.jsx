import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Polygon, Rectangle, ScaleControl, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Globe2, LocateFixed, Mountain, Satellite, TriangleAlert } from "lucide-react";
import { useProfile, useSlopeGrid, useTerrain } from "@/hooks/useKisanData";
import VegetationLayer from "@/components/map/VegetationLayer";
import { useT } from "@/i18n";
import { useTheme } from "@/hooks/useTheme";
import COVERED from "@/data/coveredCountries.json";
import { cn } from "@/lib/utils";
import Flag from "@/components/Flag";

/**
 * The farm on a map with NASA satellite layers on top, from NASA GIBS
 * (Global Imagery Browse Services; open, no key). Each layer shows the most
 * recent image NASA has published. One layer at a time, with an opacity slider.
 */
const GIBS = (layer, matrix) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/default/${matrix}/{z}/{y}/{x}.png`;

export const NASA_LAYERS = [
  {
    id: "ndvi",
    name: "Vegetation types",
    mission: "MODIS land cover + MODIS NDVI · 250 m – 1 km",
    what: "Forests, field crops and orchards in different colours. Bare ground, desert, water and towns are left clear. Orchards are farmland that stays green all year; field crops go bare between seasons.",
    composite: true,
    max: 9,
    legend: null,
    key: [
      ["#14534b", "Forest and woodland (MODIS land cover)"],
      ["#e8891c", "Orchards and fruit trees: farmland green all year"],
      ["#cddc39", "Field crops, light: thin, young or ripening"],
      ["#388e3c", "Field crops, bright: dense and growing well"],
      ["transparent", "Clear: bare soil, desert, water, towns"],
    ],
  },
  {
    id: "smap",
    name: "Root-zone soil moisture",
    mission: "SMAP Level 4 · daily · 9 km",
    what: "Water in the top metre of soil. Blue = wet, brown = dry. Early sign of drought stress.",
    url: GIBS("SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", "GoogleMapsCompatible_Level6"),
    max: 6,
    legend: "https://gibs.earthdata.nasa.gov/legends/SMAP_Analyzed_Soil_Moisture_H.svg",
    key: [["#c8a165", "Tan / yellow: dry soil, crops may need water"], ["#5fb36b", "Green: moist soil"], ["#2b6cb0", "Blue: wet or waterlogged soil"]],
  },
  {
    id: "rain",
    name: "Rainfall",
    mission: "GPM IMERG · latest day · 10 km",
    what: "Rain falling across the region on the latest day. Brighter = heavier rain.",
    url: GIBS("IMERG_Precipitation_Rate", "GoogleMapsCompatible_Level6"),
    max: 6,
    legend: "https://gibs.earthdata.nasa.gov/legends/GPM_Precipitation_Rate_H.svg",
    key: [["#9ecae1", "Light blue: light rain"], ["#41ab5d", "Green / yellow: moderate rain"], ["#e34a33", "Orange / red: heavy rain"], ["transparent", "No colour: no rain on the latest day"]],
  },
  {
    id: "heat",
    name: "Ground heat",
    mission: "MODIS Terra land-surface temperature · day · 1 km",
    what: "How hot the ground surface is in the daytime. Red = heat stress risk for shallow-rooted crops.",
    url: GIBS("MODIS_Terra_Land_Surface_Temp_Day", "GoogleMapsCompatible_Level7"),
    max: 7,
    legend: "https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg",
    key: [["#3b6fb6", "Blue: cool ground"], ["#f2c94c", "Yellow / orange: warm ground"], ["#c0392b", "Red: hot ground, heat-stress risk"], ["transparent", "Gaps: clouds hid the ground"]],
  },
  {
    id: "landsat",
    name: "Field-scale image",
    mission: "Landsat (Harmonized Landsat Sentinel-2) · 30 m",
    what: "A real-colour satellite photo of the fields. Gaps are cloud or no pass yet.",
    url: GIBS("HLS_L30_Nadir_BRDF_Adjusted_Reflectance", "GoogleMapsCompatible_Level12"),
    max: 12,
    legend: null,
    key: [["#3d8b3d", "Green: crops, trees, grass"], ["#a67c52", "Brown: bare soil, dry fields"], ["#ffffff", "White: clouds or haze"], ["transparent", "Gaps: no satellite pass yet"]],
  },
  {
    id: "grace",
    name: "Groundwater trend",
    mission: "GRACE / GRACE-FO · monthly · ~300 km (latest map: mid-2022)",
    what: "Change in all water stored underground and on land. Red = less water than usual.",
    url: GIBS("GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI", "GoogleMapsCompatible_Level6"),
    max: 6,
    legend: "https://gibs.earthdata.nasa.gov/legends/GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI_H.svg",
    key: [["#b2182b", "Red: less water stored than usual (groundwater falling)"], ["#f7f7f7", "White: about normal"], ["#2166ac", "Blue: more water stored than usual"]],
  },
];


// Only Pakistan and the United States are covered: everything else is greyed out with a mask
// (the whole world as one polygon, with the two countries cut out as holes).
const swap = (ring) => ring.map(([lng, lat]) => [lat, lng]);
const HOLES = COVERED.features.flatMap((f) =>
  f.geometry.type === "Polygon" ? [swap(f.geometry.coordinates[0])] : f.geometry.coordinates.map((poly) => swap(poly[0]))
);
const WORLD = [
  [-89.9, -360],
  [89.9, -360],
  [89.9, 360],
  [-89.9, 360],
];
const boundsOf = (id) => L.geoJSON(COVERED.features.find((f) => f.properties.id === id)).getBounds();

/** Moves the map when a view button is pressed. */
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    if (target.point) map.flyTo(target.point, target.zoom || 8, { duration: 0.8 });
    else map.flyToBounds(target.bounds, { padding: [20, 20], duration: 0.8 });
  }, [target, map]);
  return null;
}

const SLOPE_TEXT = {
  flat: "Flat land",
  gentle: "Gentle slope",
  moderate: "Moderate slope",
  steep: "Steep slope",
};

export default function FarmMap({ className }) {
  const { t } = useT();
  const { data: profile } = useProfile();
  const { data: terrain } = useTerrain();
  const { data: slopeGrid } = useSlopeGrid();
  const [hotspots, setHotspots] = useState(false);
  const [layerId, setLayerId] = useState("ndvi");
  const [opacity, setOpacity] = useState(0.75);
  const layer = NASA_LAYERS.find((l) => l.id === layerId);
  const hasPoint = Number.isFinite(profile?.lat) && Number.isFinite(profile?.lng);
  const { theme } = useTheme();
  const [target, setTarget] = useState(null);
  const home = profile?.country === "US" ? "US" : "PK";
  const start = useMemo(() => (hasPoint ? { center: [profile.lat, profile.lng], zoom: 7 } : { bounds: boundsOf(home) }), [hasPoint, profile?.lat, profile?.lng, home]);
  // Background maps from NASA GIBS too (no key needed, unlike most map services):
  // Blue Marble relief in light mode, Black Marble (Earth at night) in dark mode.
  const base =
    theme === "dark"
      ? "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png"
      : "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg";
  const labels = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Reference_Labels_15m/default/default/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png";
  const viewBtn = "inline-flex items-center gap-1.5 rounded-lg bg-card/90 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur hover:bg-card focus-ring";

  return (
    <section className={cn("kisan-card p-5 sm:p-6", className)} aria-labelledby="farm-map-title" data-testid="farm-map">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="farm-map-title" className="flex items-center gap-2 font-display text-xl">
          <Satellite className="h-5 w-5 text-primary" aria-hidden="true" /> {t("Your farm from space")}
        </h2>
        {terrain && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="terrain">
            <Mountain className="h-3.5 w-3.5" aria-hidden="true" />
            {t("{m} m above sea level", { m: terrain.elevation_m })} · {t(SLOPE_TEXT[terrain.slope_class] || "")} ({terrain.slope_pct}%) · NASA SRTM
          </p>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("Latest NASA satellite maps around your farm. Pick a layer.")}</p>

      <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("Map layer")}>
        {NASA_LAYERS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={l.id === layerId}
            onClick={() => setLayerId(l.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors focus-ring",
              l.id === layerId ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
            )}
          >
            {t(l.name)}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="relative h-[26rem] overflow-hidden rounded-xl border [border-color:var(--card-line)] sm:h-[30rem]">
        <MapContainer
          {...(start.bounds ? { bounds: start.bounds } : { center: start.center, zoom: start.zoom })}
          minZoom={3}
          maxZoom={15}
          worldCopyJump
          scrollWheelZoom="center"
          wheelPxPerZoomLevel={120}
          zoomSnap={1}
          className="h-full w-full bg-secondary"
          attributionControl
        >
          <TileLayer key={base} url={base} maxNativeZoom={8} maxZoom={19} attribution="NASA Blue Marble / Black Marble (GIBS)" />
          {layer.composite ? (
            <VegetationLayer key="veg" opacity={opacity} />
          ) : (
            <TileLayer key={layer.id} url={layer.url} opacity={opacity} maxNativeZoom={layer.max} maxZoom={19} attribution="NASA GIBS / EOSDIS" className="kisan-data-tiles" />
          )}
          {/* Grey out every country the app doesn't cover yet. */}
          <Polygon positions={[WORLD, ...HOLES]} pathOptions={{ stroke: false, fillColor: theme === "dark" ? "#1f2523" : "#a3aaa7", fillOpacity: 1 }} interactive={false} />
          <TileLayer url={labels} maxNativeZoom={13} maxZoom={19} minZoom={4} opacity={0.85} zIndex={650} />
          <GeoJSON data={COVERED} style={{ color: "#F2C94C", weight: 1.5, fill: false }} interactive={false} />
          {hasPoint && (
            <CircleMarker center={[profile.lat, profile.lng]} radius={7} pathOptions={{ color: "#F2C94C", weight: 3, fillColor: "#123D2A", fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -6]}>{profile.district || t("Your farm")}</Tooltip>
            </CircleMarker>
          )}
          {/* Erosion hotspots: slope of each 150 m patch around the farm (NASA SRTM). */}
          {hotspots &&
            slopeGrid?.cells.map((c) => {
              const dLat = slopeGrid.step_m / 2 / 111320;
              const dLng = slopeGrid.step_m / 2 / (111320 * Math.cos((c.lat * Math.PI) / 180));
              const color = c.erosion_risk === "high" ? "#d64545" : c.erosion_risk === "medium" ? "#f2a33a" : "#5fb36b";
              return (
                <Rectangle
                  key={`${c.lat},${c.lng}`}
                  bounds={[[c.lat - dLat, c.lng - dLng], [c.lat + dLat, c.lng + dLng]]}
                  pathOptions={{ color, weight: 0.5, fillColor: color, fillOpacity: c.erosion_risk === "low" ? 0.15 : 0.55 }}
                >
                  <Tooltip>{t("Slope {s}% · erosion risk {r}", { s: c.slope_pct, r: t(c.erosion_risk) })}</Tooltip>
                </Rectangle>
              );
            })}
          <FlyTo target={target} />
          {/* Map scale (like Google Maps): metric and miles. */}
          <ScaleControl position="bottomright" imperial metric />
        </MapContainer>

        {/* Quick views, on top of the map. */}
        <div className="pointer-events-none absolute inset-x-2 top-2 z-[500] flex flex-wrap justify-end gap-1.5">
          {hasPoint && (
            <button type="button" className={cn(viewBtn, "pointer-events-auto")} onClick={() => setTarget({ point: [profile.lat, profile.lng], at: Date.now() })}>
              <LocateFixed className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {t("My farm")}
            </button>
          )}
          {hasPoint && slopeGrid?.cells?.length > 0 && (
            <button
              type="button"
              aria-pressed={hotspots}
              className={cn(viewBtn, "pointer-events-auto", hotspots && "ring-2 ring-harvest")}
              onClick={() => {
                setHotspots((v) => !v);
                if (!hotspots) {
                  setTarget({ point: [profile.lat, profile.lng], zoom: 14, at: Date.now() });
                  setLayerId("landsat"); // 30 m image, so the fields show under the slope grid
                }
              }}
            >
              <TriangleAlert className="h-3.5 w-3.5 text-harvest" aria-hidden="true" /> {t("Erosion hotspots")}
            </button>
          )}
          <button type="button" className={cn(viewBtn, "pointer-events-auto")} onClick={() => setTarget({ bounds: boundsOf("PK"), at: Date.now() })}>
            <Flag country="PK" className="h-3 w-4" /> {t("Pakistan")}
          </button>
          <button type="button" className={cn(viewBtn, "pointer-events-auto")} onClick={() => setTarget({ bounds: boundsOf("US"), at: Date.now() })}>
            <Flag country="US" className="h-3 w-4" /> {t("United States")}
          </button>
        </div>
        <p className="pointer-events-none absolute bottom-2 start-2 z-[500] flex items-center gap-1.5 rounded-lg bg-card/90 px-2.5 py-1.5 text-[11px] shadow-sm backdrop-blur" data-testid="coverage-note">
          <Globe2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {t("Kisan AI covers Pakistan and the United States only. Other countries are greyed out.")}
        </p>
      </div>
        <aside className="rounded-xl border p-4 text-sm [border-color:var(--card-line)]" aria-label={t("Map legend")} data-testid="map-legend">
          <p className="font-semibold">{t(layer.name)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{layer.mission}</p>
          {layer.legend && (
            <img src={layer.legend} alt={t("NASA colour scale for this layer")} className="mt-3 w-full rounded-md bg-white p-1.5" loading="lazy" />
          )}
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("What the colours mean")}</p>
          <ul className="mt-2 space-y-2">
            {layer.key.map(([color, text]) => (
              <li key={text} className="flex items-start gap-2.5 text-xs leading-relaxed">
                <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border border-foreground/20" style={{ background: color === "transparent" ? "repeating-linear-gradient(45deg, transparent 0 3px, hsl(var(--muted-foreground) / 0.4) 3px 4px)" : color }} />
                <span>{t(text)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("On the map")}</p>
          <ul className="mt-2 space-y-2 text-xs">
            <li className="flex items-center gap-2.5"><span className="h-3.5 w-3.5 rounded-full border-[3px] border-harvest bg-forest" />{t("Your farm")}</li>
            <li className="flex items-center gap-2.5"><span className="h-0.5 w-3.5 bg-harvest" />{t("Pakistan and United States border")}</li>
            {hotspots && (
              <>
                <li className="flex items-center gap-2.5"><span className="h-3.5 w-3.5 rounded-sm bg-[#d64545]" />{t("Erosion hotspot: slope 8% or more")}</li>
                <li className="flex items-center gap-2.5"><span className="h-3.5 w-3.5 rounded-sm bg-[#f2a33a]" />{t("Some erosion risk: slope 3–8%")}</li>
                <li className="flex items-center gap-2.5"><span className="h-3.5 w-3.5 rounded-sm bg-[#5fb36b]/40" />{t("Flat or gentle: under 3%")}</li>
              </>
            )}
            <li className="flex items-center gap-2.5"><span className="h-3.5 w-3.5 rounded-sm bg-[#1f2523] dark:bg-[#1f2523]" style={{ background: theme === "dark" ? "#1f2523" : "#a3aaa7" }} />{t("Countries not covered yet")}</li>
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">{t("Scroll or use + and − to zoom. The bar in the corner shows distance. Data pixels are coarser than a field, so very close zoom only enlarges them.")}</p>
        </aside>
      </div>
      {!hasPoint && <p className="mt-2 text-xs text-muted-foreground">{t("Set your farm location under My farm to see your farm on the map.")}</p>}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t(layer.name)} <span className="text-xs font-normal text-muted-foreground">· {layer.mission}</span></p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t(layer.what)}</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t("Layer strength")}
          <input type="range" min="0.2" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-28 accent-[hsl(var(--primary))]" />
        </label>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {t("Satellite maps cover a wide area: one pixel is often bigger than a field. They show the pattern around your farm, not a measurement of your own field.")}
      </p>
    </section>
  );
}
