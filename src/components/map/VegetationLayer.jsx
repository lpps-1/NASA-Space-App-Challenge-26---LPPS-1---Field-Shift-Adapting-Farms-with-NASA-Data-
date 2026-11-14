import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { colorTable } from "@/lib/gibsColormaps";

/**
 * "Vegetation types" map layer: forests, field crops and orchards in different colours, and
 * nothing painted over bare ground, desert, water or towns.
 *
 * Plain NDVI paints any green surface the same green, so a forest and a wheat field look alike.
 * This layer combines three NASA GIBS products pixel by pixel in the browser:
 *   - MODIS land cover (IGBP, yearly, 500 m): forest classes, cropland, towns, water, desert.
 *   - MODIS NDVI 8-day (250 m): how green each pixel is now.
 *   - MODIS NDVI monthly (1 km), five months spread over the last year: the lowest value.
 * Rules:
 *   forest / woodland classes (IGBP 1–5, 8)            → Forest (dark blue-green)
 *   farmland (IGBP 12, 14) green all year (min ≥ 0.45) → Orchards and fruit trees (amber)
 *   farmland with NDVI now ≥ 0.3                      → Field crops (light to bright green by NDVI)
 *   everything else (bare, desert, water, towns, thin grass and scrub) → left clear
 * Orchards (citrus, mango, dates, guava) keep their leaves all year, while wheat, rice, cotton
 * and maize fields drop to bare soil between seasons; that is what separates them.
 */
const WMTS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
const FOREST = new Set([1, 2, 3, 4, 5, 8]);
const FARM = new Set([12, 14]);
export const VEG_COLORS = { forest: [20, 83, 75], orchard: [232, 137, 28], cropLow: [205, 220, 57], cropHigh: [56, 142, 60] };

const monthsBack = (list) => {
  const d = new Date();
  return list.map((n) => {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, 1));
    return m.toISOString().slice(0, 10);
  });
};

const decoded = new Map(); // url -> Promise<Float32Array | null>
function values(url, table) {
  if (!decoded.has(url)) {
    if (decoded.size > 400) decoded.delete(decoded.keys().next().value);
    const cmap = colorTable(table);
    decoded.set(
      url,
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const c = document.createElement("canvas");
            c.width = c.height = 256;
            const g = c.getContext("2d", { willReadFrequently: true });
            g.drawImage(img, 0, 0, 256, 256);
            const px = g.getImageData(0, 0, 256, 256).data;
            const out = new Float32Array(256 * 256);
            for (let i = 0; i < out.length; i++) {
              const a = px[i * 4 + 3];
              const v = a === 0 ? undefined : cmap.get(`${px[i * 4]},${px[i * 4 + 1]},${px[i * 4 + 2]}`);
              out[i] = v == null ? NaN : v;
            }
            resolve(out);
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      }),
    );
  }
  return decoded.get(url);
}

/** Source tile + offset for one display tile, when the source has fewer zoom levels. */
function source(layer, time, maxZ, table, { x, y, z }) {
  const zs = Math.min(z, maxZ);
  const f = 2 ** (z - zs);
  const tx = Math.floor(x / f), ty = Math.floor(y / f);
  const url = `${WMTS}/${layer}/default/${time}/GoogleMapsCompatible_Level${maxZ}/${zs}/${ty}/${tx}.png`;
  return values(url, table).then((arr) => (arr ? { arr, f, ox: (x % f) * (256 / f), oy: (y % f) * (256 / f) } : null));
}
const at = (s, px, py) => (s ? s.arr[Math.floor(s.oy + py / s.f) * 256 + Math.floor(s.ox + px / s.f)] : NaN);

async function compose(coords) {
  const months = monthsBack([2, 4, 6, 8, 10]);
  const [lc, now, ...monthly] = await Promise.all([
    source("MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual", "default", 8, "landcover", coords),
    source("MODIS_Terra_NDVI_8Day", "default", 9, "ndvi", coords),
    ...months.map((m) => source("MODIS_Terra_L3_NDVI_Monthly", m, 7, "ndvi", coords)),
  ]);
  const img = new ImageData(256, 256);
  const d = img.data;
  if (!lc) return img;
  const mon = monthly.filter(Boolean);
  for (let py = 0; py < 256; py++)
    for (let px = 0; px < 256; px++) {
      const cls = at(lc, px, py);
      if (Number.isNaN(cls)) continue;
      let rgb = null, alpha = 215;
      if (FOREST.has(cls)) rgb = VEG_COLORS.forest;
      else if (FARM.has(cls)) {
        let low = Infinity, seen = 0;
        for (const s of mon) {
          const v = at(s, px, py);
          if (!Number.isNaN(v)) {
            seen++;
            if (v < low) low = v;
          }
        }
        const g = at(now, px, py);
        if (seen >= 3 && low >= 0.45) rgb = VEG_COLORS.orchard;
        else if (!Number.isNaN(g) && g >= 0.3) {
          const k = Math.min(1, (g - 0.3) / 0.45);
          rgb = VEG_COLORS.cropLow.map((c, i) => Math.round(c + (VEG_COLORS.cropHigh[i] - c) * k));
          alpha = 150 + Math.round(k * 80);
        }
      }
      if (!rgb) continue;
      const i = (py * 256 + px) * 4;
      d[i] = rgb[0];
      d[i + 1] = rgb[1];
      d[i + 2] = rgb[2];
      d[i + 3] = alpha;
    }
  return img;
}

const VegGrid = L.GridLayer.extend({
  createTile(coords, done) {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 256;
    compose(coords)
      .then((img) => {
        tile.getContext("2d").putImageData(img, 0, 0);
        done(null, tile);
      })
      .catch((e) => done(e, tile));
    return tile;
  },
});

export default function VegetationLayer({ opacity = 1 }) {
  const map = useMap();
  useEffect(() => {
    const layer = new VegGrid({ opacity, maxZoom: 19, attribution: "NASA GIBS: MODIS land cover + MODIS NDVI", className: "kisan-data-tiles", zIndex: 300 });
    layer.addTo(map);
    return () => layer.remove();
  }, [map]); // opacity is updated by the effect below without rebuilding the tiles
  useEffect(() => {
    map.eachLayer((l) => l instanceof VegGrid && l.setOpacity(opacity));
  }, [map, opacity]);
  return null;
}
