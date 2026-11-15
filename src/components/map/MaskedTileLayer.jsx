import { useEffect, useRef } from "react";
import { useMap } from "@/components/map/leaflet";
import L from "leaflet";
import { clipToCovered, tileTouchesCovered } from "@/components/map/coverMask";
import { loadImage } from "@/components/map/loadImage";

/**
 * A NASA GIBS image layer drawn on canvas tiles and cut to the covered countries (coverMask.js).
 * Tiles that lie wholly outside Pakistan and the United States are never downloaded.
 * `filter` (a canvas filter such as "grayscale(1)") is applied once when a tile is drawn, instead
 * of a CSS filter on the layer, which is slow while the map moves. `mask={false}` draws the whole
 * world (used for the grey country borders).
 */
const MaskedGrid = L.GridLayer.extend({
  createTile(coords, done) {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 256;
    const { url, mask, filter } = this.options;
    if (mask && !tileTouchesCovered(coords)) {
      setTimeout(() => done(null, tile), 0);
      return tile;
    }
    const n = 2 ** coords.z;
    const src = url.replace("{z}", coords.z).replace("{y}", coords.y).replace("{x}", ((coords.x % n) + n) % n);
    // Retries network failures (loadImage.js); a tile with no image is left clear.
    const ac = new AbortController(); // cancelled when the tile leaves the view (tileunload below)
    tile._kisanAbort = ac;
    loadImage(src, { signal: ac.signal })
      .then((img) => {
        if (!img) return;
        const ctx = tile.getContext("2d");
        if (filter && "filter" in ctx) ctx.filter = filter;
        ctx.drawImage(img, 0, 0, 256, 256);
        if (filter && "filter" in ctx) ctx.filter = "none";
        img.close?.();
        if (mask) clipToCovered(ctx, coords);
      })
      .catch(() => {})
      .finally(() => done(null, tile));
    return tile;
  },
});

export default function MaskedTileLayer({ url, opacity = 1, zIndex = 200, maxNativeZoom, minZoom = 0, mask = true, filter = null, attribution }) {
  const map = useMap();
  const ref = useRef(null);
  useEffect(() => {
    const layer = new MaskedGrid({ url, mask, filter, opacity, zIndex, maxNativeZoom, minZoom, maxZoom: 19, attribution, updateWhenZooming: false, keepBuffer: 1, className: "kisan-data-tiles" });
    ref.current = layer;
    // A tile scrolled out of view stops downloading, so it doesn't hold up the visible ones.
    layer.on("tileunload", (e) => e.tile._kisanAbort?.abort());
    layer.addTo(map);
    return () => layer.remove();
    // opacity changes are applied below without rebuilding the tiles
  }, [map, url, mask, filter, zIndex, maxNativeZoom, minZoom, attribution]);
  useEffect(() => {
    ref.current?.setOpacity(opacity);
  }, [opacity]);
  return null;
}
