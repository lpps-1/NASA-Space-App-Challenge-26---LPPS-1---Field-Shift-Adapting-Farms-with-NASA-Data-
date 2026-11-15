import { useEffect } from "react";
import { useMap } from "@/components/map/leaflet";
import L from "leaflet";
import { colorTable } from "@/lib/gibsColormaps";
import { clipToCovered, tileTouchesCovered } from "@/components/map/coverMask";
import { loadImage } from "@/components/map/loadImage";

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

// Colour → value tables keyed by one number (r<<16 | g<<8 | b): no string is built per pixel.
const numeric = {};
function numericTable(name) {
  if (!numeric[name]) {
    numeric[name] = new Map();
    for (const [k, v] of colorTable(name)) {
      const [r, g, b] = k.split(",").map(Number);
      numeric[name].set((r << 16) | (g << 8) | b, v);
    }
  }
  return numeric[name];
}

const decoded = new Map(); // url -> Promise<Float32Array | null>
function values(url, table) {
  if (!decoded.has(url)) {
    if (decoded.size > 400) decoded.delete(decoded.keys().next().value);
    const cmap = numericTable(table);
    decoded.set(
      url,
      loadImage(url).then(
        (img) => {
          if (!img) return null; // GIBS has no image for this tile
          try {
            const c = document.createElement("canvas");
            c.width = c.height = 256;
            const g = c.getContext("2d", { willReadFrequently: true });
            g.drawImage(img, 0, 0, 256, 256);
            img.close?.();
            const px = g.getImageData(0, 0, 256, 256).data;
            const out = new Float32Array(256 * 256);
            let lastKey = -1, lastVal = NaN; // neighbouring pixels usually share a colour
            for (let i = 0; i < out.length; i++) {
              if (px[i * 4 + 3] === 0) {
                out[i] = NaN;
                continue;
              }
              const key = (px[i * 4] << 16) | (px[i * 4 + 1] << 8) | px[i * 4 + 2];
              if (key !== lastKey) {
                const v = cmap.get(key);
                lastKey = key;
                lastVal = v == null ? NaN : v;
              }
              out[i] = lastVal;
            }
            return out;
          } catch {
            return null;
          }
        },
        () => {
          // Failed even after retries (network): forget it, so the next tile or view asks again.
          decoded.delete(url);
          return null;
        },
      ),
    );
  }
  return decoded.get(url);
}

/** Source tile + offset for one display tile, when the source has fewer zoom levels. */
function source(layer, time, maxZ, table, { x, y, z }, matrix = maxZ) {
  const zs = Math.min(z, maxZ);
  const f = 2 ** (z - zs);
  const tx = Math.floor(x / f), ty = Math.floor(y / f);
  const url = `${WMTS}/${layer}/default/${time}/GoogleMapsCompatible_Level${matrix}/${zs}/${ty}/${tx}.png`;
  return values(url, table).then((arr) => (arr ? { arr, f, ox: (x % f) * (256 / f), oy: (y % f) * (256 / f) } : null));
}
const at = (s, px, py) => (s ? s.arr[Math.floor(s.oy + py / s.f) * 256 + Math.floor(s.ox + px / s.f)] : NaN);

/** The two images every tile needs (land cover + greenness now): enough for forests and field crops. */
const baseSources = (coords) =>
  Promise.all([
    source("MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual", "default", 8, "landcover", coords),
    source("MODIS_Terra_NDVI_8Day", "default", 9, "ndvi", coords),
  ]);
/**
 * Five monthly images over the last year (for orchards: farmland green all year). They are 1 km
 * data, so they are fetched one zoom level coarser than the screen: a quarter of the downloads.
 */
const monthlySources = (coords) =>
  Promise.all(monthsBack([2, 4, 6, 8, 10]).map((m) => source("MODIS_Terra_L3_NDVI_Monthly", m, Math.min(7, Math.max(3, coords.z - 1)), "ndvi", coords, 7)));

function paint(lc, now, monthly, hidden = new Set()) {
  const img = new ImageData(256, 256);
  const d = img.data;
  if (!lc) return img;
  const mon = (monthly || []).filter(Boolean);
  for (let py = 0; py < 256; py++)
    for (let px = 0; px < 256; px++) {
      const cls = at(lc, px, py);
      if (Number.isNaN(cls)) continue;
      let rgb = null, alpha = 215;
      if (FOREST.has(cls)) rgb = hidden.has("forest") ? null : VEG_COLORS.forest;
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
        if (seen >= 3 && low >= 0.45) rgb = hidden.has("orchard") ? null : VEG_COLORS.orchard;
        else if (!Number.isNaN(g) && g >= 0.3) {
          const k = Math.min(1, (g - 0.3) / 0.45);
          if (hidden.has(k < 0.5 ? "crops_light" : "crops_bright")) continue;
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
    if (!tileTouchesCovered(coords)) {
      setTimeout(() => done(null, tile), 0);
      return tile;
    }
    const hidden = this.options.hidden;
    const draw = (lc, now, monthly) => {
      const ctx = tile.getContext("2d");
      ctx.putImageData(paint(lc, now, monthly, hidden), 0, 0);
      clipToCovered(ctx, coords); // nothing is drawn outside Pakistan and the United States
    };
    // Draw forests and field crops as soon as the first two images arrive; the five monthly
    // images (orchards) refine the same tile when they come in.
    const monthly = monthlySources(coords);
    baseSources(coords)
      .then(([lc, now]) => {
        draw(lc, now, null);
        done(null, tile);
        return monthly.then((mon) => draw(lc, now, mon));
      })
      .catch((e) => done(e, tile));
    return tile;
  },
});

export default function VegetationLayer({ opacity = 1, zIndex = 300, hidden = [] }) {
  const map = useMap();
  useEffect(() => {
    const layer = new VegGrid({ opacity, maxZoom: 19, attribution: "NASA GIBS: MODIS land cover + MODIS NDVI", className: "kisan-data-tiles", zIndex, maxNativeZoom: 9, updateWhenZooming: false, keepBuffer: 1, hidden: new Set(hidden) });
    layer.addTo(map);
    return () => layer.remove();
  }, [map]); // opacity is updated by the effect below without rebuilding the tiles
  useEffect(() => {
    map.eachLayer((l) => l instanceof VegGrid && l.setOpacity(opacity));
  }, [map, opacity]);
  const hiddenKey = [...hidden].sort().join(",");
  useEffect(() => {
    // Source images are cached, so redrawing with classes hidden or shown is quick.
    map.eachLayer((l) => {
      if (l instanceof VegGrid) {
        l.options.hidden = new Set(hiddenKey ? hiddenKey.split(",") : []);
        l.redraw();
      }
    });
  }, [map, hiddenKey]);
  return null;
}
