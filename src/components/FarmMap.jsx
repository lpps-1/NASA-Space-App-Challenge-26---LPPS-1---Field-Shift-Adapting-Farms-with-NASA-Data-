import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Globe2, LocateFixed, Mountain, Satellite } from "lucide-react";
import { useProfile, useTerrain } from "@/hooks/useKisanData";
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
    name: "Crop greenness (NDVI)",
    mission: "MODIS Terra · 8-day · 250 m",
    what: "Green = growing crops or trees; brown = bare or dry land. Shows which months fields stand bare.",
    url: GIBS("MODIS_Terra_NDVI_8Day", "GoogleMapsCompatible_Level9"),
    max: 9,
  },
  {
    id: "smap",
    name: "Root-zone soil moisture",
    mission: "SMAP Level 4 · daily · 9 km",
    what: "Water in the top metre of soil. Blue = wet, brown = dry. Early sign of drought stress.",
    url: GIBS("SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", "GoogleMapsCompatible_Level6"),
    max: 6,
  },
  {
    id: "rain",
    name: "Rainfall",
    mission: "GPM IMERG · latest day · 10 km",
    what: "Rain falling across the region on the latest day. Brighter = heavier rain.",
    url: GIBS("IMERG_Precipitation_Rate", "GoogleMapsCompatible_Level6"),
    max: 6,
  },
  {
    id: "heat",
    name: "Ground heat",
    mission: "MODIS Terra land-surface temperature · day · 1 km",
    what: "How hot the ground surface is in the daytime. Red = heat stress risk for shallow-rooted crops.",
    url: GIBS("MODIS_Terra_Land_Surface_Temp_Day", "GoogleMapsCompatible_Level7"),
    max: 7,
  },
  {
    id: "landsat",
    name: "Field-scale image",
    mission: "Landsat (Harmonized Landsat Sentinel-2) · 30 m",
    what: "A real-colour satellite photo of the fields. Gaps are cloud or no pass yet.",
    url: GIBS("HLS_L30_Nadir_BRDF_Adjusted_Reflectance", "GoogleMapsCompatible_Level12"),
    max: 12,
  },
  {
    id: "grace",
    name: "Groundwater trend",
    mission: "GRACE / GRACE-FO · monthly · ~300 km (latest map: mid-2022)",
    what: "Change in all water stored underground and on land. Red = less water than usual.",
    url: GIBS("GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI", "GoogleMapsCompatible_Level6"),
    max: 6,
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
    if (target.point) map.flyTo(target.point, 8, { duration: 0.8 });
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
  const [layerId, setLayerId] = useState("ndvi");
  const [opacity, setOpacity] = useState(0.75);
  const layer = NASA_LAYERS.find((l) => l.id === layerId);
  const hasPoint = Number.isFinite(profile?.lat) && Number.isFinite(profile?.lng);
  const { theme } = useTheme();
  const [target, setTarget] = useState(null);
  const home = profile?.country === "US" ? "US" : "PK";
  const start = useMemo(() => (hasPoint ? { center: [profile.lat, profile.lng], zoom: 7 } : { bounds: boundsOf(home) }), [hasPoint, profile?.lat, profile?.lng, home]);
  const base =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
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

      <div className="relative mt-3 h-[26rem] overflow-hidden rounded-xl border [border-color:var(--card-line)] sm:h-[30rem]">
        <MapContainer
          {...(start.bounds ? { bounds: start.bounds } : { center: start.center, zoom: start.zoom })}
          minZoom={2}
          maxZoom={13}
          worldCopyJump
          scrollWheelZoom={false}
          className="h-full w-full bg-secondary"
          attributionControl
        >
          <TileLayer key={base} url={base} attribution="&copy; OpenStreetMap contributors &copy; CARTO" subdomains="abcd" maxZoom={19} />
          <TileLayer key={layer.id} url={layer.url} opacity={opacity} maxNativeZoom={layer.max} maxZoom={19} attribution="NASA GIBS / EOSDIS" />
          {/* Grey out every country the app doesn't cover yet. */}
          <Polygon positions={[WORLD, ...HOLES]} pathOptions={{ stroke: false, fillColor: theme === "dark" ? "#0b1210" : "#6b7280", fillOpacity: 0.82 }} interactive={false} />
          <GeoJSON data={COVERED} style={{ color: "#F2C94C", weight: 1.5, fill: false }} interactive={false} />
          {hasPoint && (
            <CircleMarker center={[profile.lat, profile.lng]} radius={7} pathOptions={{ color: "#F2C94C", weight: 3, fillColor: "#123D2A", fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -6]}>{profile.district || t("Your farm")}</Tooltip>
            </CircleMarker>
          )}
          <FlyTo target={target} />
        </MapContainer>

        {/* Quick views, on top of the map. */}
        <div className="pointer-events-none absolute inset-x-2 top-2 z-[500] flex flex-wrap justify-end gap-1.5">
          {hasPoint && (
            <button type="button" className={cn(viewBtn, "pointer-events-auto")} onClick={() => setTarget({ point: [profile.lat, profile.lng], at: Date.now() })}>
              <LocateFixed className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {t("My farm")}
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
