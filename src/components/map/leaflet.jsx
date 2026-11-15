import { createContext, useContext, useEffect, useRef, useState } from "react";
import L from "leaflet";

/**
 * The few map pieces the app needs, written straight on Leaflet (BSD-2-Clause).
 * We don't use react-leaflet: its licence (Hippocratic 2.1) is not an OSI open-source licence,
 * which the Space Apps terms ask for.
 */
const MapCtx = createContext(null);

/** The Leaflet map of the nearest MapContainer. */
export function useMap() {
  const map = useContext(MapCtx);
  if (!map) throw new Error("useMap must be used inside MapContainer");
  return map;
}

/** Creates the map once (later option changes are ignored, as in react-leaflet). Children render after. */
export function MapContainer({ className, children, center, zoom, bounds, ...options }) {
  const el = useRef(null);
  const [map, setMap] = useState(null);
  useEffect(() => {
    const m = L.map(el.current, options);
    if (bounds) m.fitBounds(bounds);
    else m.setView(center, zoom);
    setMap(m);
    return () => m.remove();
  }, []);
  return (
    <div ref={el} className={className}>
      {map && <MapCtx.Provider value={map}>{children}</MapCtx.Provider>}
    </div>
  );
}

/** Adds a Leaflet layer while mounted. `make` builds it; `deps` rebuild it. */
function useLayer(make, deps) {
  const map = useMap();
  useEffect(() => {
    const layer = make().addTo(map);
    return () => layer.remove();
  }, [map, ...deps]);
  return null;
}

const withTooltip = (layer, tooltip, tooltipOptions) => (tooltip != null && tooltip !== "" ? layer.bindTooltip(String(tooltip), tooltipOptions) : layer);

export function GeoJSON({ data, style, interactive = true }) {
  return useLayer(() => L.geoJSON(data, { style, interactive }), [data, JSON.stringify(style), interactive]);
}

export function CircleMarker({ center, radius, pathOptions, tooltip, tooltipOptions }) {
  return useLayer(
    () => withTooltip(L.circleMarker(center, { radius, ...pathOptions }), tooltip, tooltipOptions),
    [center[0], center[1], radius, JSON.stringify(pathOptions), tooltip]
  );
}

export function Rectangle({ bounds, pathOptions, tooltip, tooltipOptions }) {
  return useLayer(
    () => withTooltip(L.rectangle(bounds, pathOptions), tooltip, tooltipOptions),
    [JSON.stringify(bounds), JSON.stringify(pathOptions), tooltip]
  );
}

export function ScaleControl({ position = "bottomleft", imperial = true, metric = true }) {
  const map = useMap();
  useEffect(() => {
    const c = L.control.scale({ position, imperial, metric }).addTo(map);
    return () => c.remove();
  }, [map, position, imperial, metric]);
  return null;
}
