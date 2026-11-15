import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Rectangle, ScaleControl, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, Eye, EyeOff, Globe2, LocateFixed, Mountain, Plus, Satellite, TriangleAlert, X } from "lucide-react";
import { useProfile, useSlopeGrid, useTerrain } from "@/hooks/useKisanData";
import VegetationLayer from "@/components/map/VegetationLayer";
import MaskedTileLayer from "@/components/map/MaskedTileLayer";
import { useT } from "@/i18n";
import { useTheme } from "@/hooks/useTheme";
import COVERED from "@/data/coveredCountries.json";
import { cn } from "@/lib/utils";
import Flag from "@/components/Flag";

/**
 * The farm on a map with NASA satellite layers on top, from NASA GIBS
 * (Global Imagery Browse Services; open, no key). Each layer shows the most
 * recent image NASA has published. Each layer chip turns its layer on or off; several can be on
 * at once (stacked, the 30 m image at the bottom), with one opacity slider for all.
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
      ["#14534b", "Forest and woodland (MODIS land cover)", "forest"],
      ["#e8891c", "Orchards and fruit trees: farmland green all year", "orchard"],
      ["#cddc39", "Field crops, light: thin, young or ripening", "crops_light"],
      ["#388e3c", "Field crops, bright: dense and growing well", "crops_bright"],
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


const VIEW = {
  // The US outline includes the Aleutian islands across the 180° line, so its own bounds span the
  // whole world. The view button shows the lower 48 states instead.
  US: L.latLngBounds([24.3, -125], [49.5, -66.9]),
};
const boundsOf = (id) => VIEW[id] || L.geoJSON(COVERED.features.find((f) => f.properties.id === id)).getBounds();

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

// Stacking order when several layers are on: the opaque 30 m image at the bottom, vegetation on top.
const STACK = ["landsat", "grace", "heat", "rain", "smap", "ndvi"];
const LAYERS_KEY = "kisan-map-layers";
function savedLayers() {
  try {
    const v = JSON.parse(localStorage.getItem(LAYERS_KEY));
    if (Array.isArray(v)) return v.filter((id) => NASA_LAYERS.some((l) => l.id === id));
  } catch {
    /* storage blocked: use the default */
  }
  return ["ndvi"];
}
function saveLayers(ids) {
  try {
    localStorage.setItem(LAYERS_KEY, JSON.stringify(ids));
  } catch {
    /* not saved: fine */
  }
}

export default function FarmMap({ className }) {
  const { t } = useT();
  const { data: profile } = useProfile();
  const { data: terrain } = useTerrain();
  const { data: slopeGrid } = useSlopeGrid();
  const [hotspots, setHotspots] = useState(false);
  const [layerIds, setLayerIds] = useState(savedLayers);
  const [opacity, setOpacity] = useState(0.75);
  const active = NASA_LAYERS.filter((l) => layerIds.includes(l.id)); // chip order, for the legend
  useEffect(() => saveLayers(layerIds), [layerIds]);
  // Vegetation classes the farmer turned off in the legend (forest, orchard, crops_light, crops_bright).
  const [vegHidden, setVegHidden] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("kisan-map-veg-hidden")) || [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("kisan-map-veg-hidden", JSON.stringify(vegHidden));
    } catch {
      /* not saved: fine */
    }
  }, [vegHidden]);
  const toggleVeg = (id) => setVegHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  // on: true = turn on, false = turn off, undefined = flip.
  const toggleLayer = (id, on) =>
    setLayerIds((ids) => ((on ?? !ids.includes(id)) ? [...new Set([...ids, id])] : ids.filter((x) => x !== id)));
  const hasPoint = Number.isFinite(profile?.lat) && Number.isFinite(profile?.lng);
  const { theme } = useTheme();
  const [target, setTarget] = useState(null);
  const home = profile?.country === "US" ? "US" : "PK";
  const start = useMemo(() => (hasPoint ? { center: [profile.lat, profile.lng], zoom: 7 } : { bounds: boundsOf(home) }), [hasPoint, profile?.lat, profile?.lng, home]);
  // Background map from NASA GIBS too (no key needed, unlike most map services): the daytime Blue
  // Marble with relief in both themes, a little darker in dark mode. (Dark mode used Black Marble,
  // Earth at night: Pakistan's farmland was black and only city lights showed.)
  const base = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg";
  const baseFilter = theme === "dark" ? "brightness(0.72) saturate(0.9)" : null;
  // Place names and borders: the "_15m" versions of these GIBS layers now return empty tiles at every
  // zoom (checked 15 Nov), so the map had no borders or names. The standard versions (to zoom 9) work.
  const labels = GIBS("Reference_Labels", "GoogleMapsCompatible_Level9");
  // No backdrop blur on things that float over the map: blurring a moving map is slow.
  const viewBtn = "inline-flex items-center gap-1.5 rounded-lg bg-card/95 px-2.5 py-1.5 text-xs font-medium shadow-sm hover:bg-card focus-ring";

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
      <p className="mt-1 text-sm text-muted-foreground">{t("Latest NASA satellite maps around your farm. Tap a layer to turn it on or off; several can be on together.")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5" role="group" aria-label={t("Map layer")}>
        {NASA_LAYERS.map((l) => {
          const on = layerIds.includes(l.id);
          return (
            <button
              key={l.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggleLayer(l.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors focus-ring",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
              )}
            >
              {on ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />}
              {t(l.name)}
            </button>
          );
        })}
        {layerIds.length > 0 && (
          <button type="button" onClick={() => setLayerIds([])} className="ms-1 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline focus-ring">
            {t("All off")}
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="relative isolate z-0 h-[26rem] overflow-hidden rounded-xl border [border-color:var(--card-line)] sm:h-[30rem]">
        <MapContainer
          {...(start.bounds ? { bounds: start.bounds } : { center: start.center, zoom: start.zoom })}
          minZoom={3}
          maxZoom={15}
          worldCopyJump
          scrollWheelZoom="center"
          wheelPxPerZoomLevel={120}
          zoomSnap={1}
          preferCanvas
          className="h-full w-full bg-secondary"
          attributionControl
        >
          {/* Every GIBS layer loads through loadImage.js, which retries failed tiles (no grey holes). */}
          <MaskedTileLayer url={base} mask={false} filter={baseFilter} maxNativeZoom={8} zIndex={100} attribution="NASA Blue Marble (GIBS)" />
          {active.map((l) => {
            const z = 200 + STACK.indexOf(l.id) * 10;
            return l.composite ? (
              <VegetationLayer key={l.id} opacity={opacity} zIndex={z} hidden={vegHidden} />
            ) : (
              <MaskedTileLayer key={l.id} url={l.url} opacity={opacity} zIndex={z} maxNativeZoom={l.max} attribution="NASA GIBS / EOSDIS" />
            );
          })}
          {/* Countries the app doesn't cover yet: the base map stays visible with grey borders and no
              satellite data (each data tile is cut to PK + US when it is drawn: coverMask.js). */}
          <MaskedTileLayer url={GIBS("Reference_Features", "GoogleMapsCompatible_Level9")} mask={false} filter="grayscale(1) brightness(1.15)" maxNativeZoom={9} opacity={0.7} zIndex={640} />
          <MaskedTileLayer url={labels} mask={false} maxNativeZoom={9} minZoom={4} opacity={0.9} zIndex={650} />
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
        <div className="pointer-events-none absolute left-14 right-2 top-2 z-[500] flex flex-wrap justify-end gap-1.5">
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
                  toggleLayer("landsat", true); // 30 m image, so the fields show under the slope grid
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
        {/* On wide screens the note sits on the map; on phones it goes under it, clear of the scale bar. */}
        <p className="pointer-events-none absolute bottom-7 start-2 z-[500] hidden max-w-[60%] items-center gap-1.5 rounded-lg bg-card/95 px-2.5 py-1.5 text-[11px] shadow-sm md:flex" data-testid="coverage-note">
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          {t("Kisan AI covers Pakistan and the United States only. Other countries show with grey borders and no satellite data.")}
        </p>
      </div>
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground md:hidden">
          <Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          {t("Kisan AI covers Pakistan and the United States only. Other countries show with grey borders and no satellite data.")}
        </p>
        <aside className="rounded-xl border p-4 text-sm [border-color:var(--card-line)]" aria-label={t("Map legend")} data-testid="map-legend">
          {active.length === 0 && <p className="text-xs text-muted-foreground">{t("No satellite layer is on. Tap a layer above to show it.")}</p>}
          {active.map((layer, i) => (
            <div key={layer.id} className={cn(i > 0 && "mt-5 border-t pt-4 [border-color:var(--card-line)]")}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{t(layer.name)}</p>
                <button type="button" onClick={() => toggleLayer(layer.id, false)} className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-ring" aria-label={t("Turn off {name}", { name: t(layer.name) })}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{layer.mission}</p>
              {layer.legend && (
                <img src={layer.legend} alt={t("NASA colour scale for this layer")} className="mt-3 w-full rounded-md bg-white p-1.5" loading="lazy" />
              )}
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("What the colours mean")}</p>
              <ul className="mt-2 space-y-2">
                {layer.key.map(([color, text, cls]) => {
                  const swatch = <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border border-foreground/20" style={{ background: color === "transparent" ? "repeating-linear-gradient(45deg, transparent 0 3px, hsl(var(--muted-foreground) / 0.4) 3px 4px)" : color }} />;
                  if (!cls || !layer.composite)
                    return (
                      <li key={text} className="flex items-start gap-2.5 text-xs leading-relaxed">
                        {swatch}
                        <span>{t(text)}</span>
                      </li>
                    );
                  const off = vegHidden.includes(cls);
                  return (
                    <li key={text}>
                      <button
                        type="button"
                        aria-pressed={!off}
                        onClick={() => toggleVeg(cls)}
                        title={off ? t("Tap to show on the map") : t("Tap to hide from the map")}
                        className={cn("-mx-1 flex w-full items-start gap-2.5 rounded-md px-1 py-0.5 text-start text-xs leading-relaxed hover:bg-secondary focus-ring", off && "opacity-45")}
                      >
                        {swatch}
                        <span className={cn("flex-1", off && "line-through")}>{t(text)}</span>
                        {off ? <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
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
            <li className="flex items-center gap-2.5"><span className="h-3.5 w-3.5 shrink-0 rounded-sm border border-muted-foreground/70" style={{ background: theme === "dark" ? "#1f252399" : "#a3aaa799" }} />{t("Countries not covered yet: grey borders, no satellite data")}</li>
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">{t("Scroll or use + and − to zoom. The bar in the corner shows distance. Data pixels are coarser than a field, so very close zoom only enlarges them.")}</p>
        </aside>
      </div>
      {!hasPoint && <p className="mt-2 text-xs text-muted-foreground">{t("Set your farm location under My farm to see your farm on the map.")}</p>}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {active.map((layer) => (
            <div key={layer.id}>
              <p className="text-sm font-medium">{t(layer.name)} <span className="text-xs font-normal text-muted-foreground">· {layer.mission}</span></p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t(layer.what)}</p>
            </div>
          ))}
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
