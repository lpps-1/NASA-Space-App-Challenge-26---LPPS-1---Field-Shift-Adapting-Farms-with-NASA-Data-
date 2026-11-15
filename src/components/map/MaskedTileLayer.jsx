import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { clipToCovered, tileTouchesCovered } from "@/components/map/coverMask";

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
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctx = tile.getContext("2d");
      if (filter && "filter" in ctx) ctx.filter = filter;
      ctx.drawImage(img, 0, 0, 256, 256);
      if (filter && "filter" in ctx) ctx.filter = "none";
      if (mask) clipToCovered(ctx, coords);
      done(null, tile);
    };
    img.onerror = () => done(null, tile); // no image for this tile (outside the data): leave it clear
    img.src = url.replace("{z}", coords.z).replace("{y}", coords.y).replace("{x}", ((coords.x % n) + n) % n);
    return tile;
  },
});

export default function MaskedTileLayer({ url, opacity = 1, zIndex = 200, maxNativeZoom, minZoom = 0, mask = true, filter = null, attribution }) {
  const map = useMap();
  const ref = useRef(null);
  useEffect(() => {
    const layer = new MaskedGrid({ url, mask, filter, opacity, zIndex, maxNativeZoom, minZoom, maxZoom: 19, attribution, updateWhenZooming: false, keepBuffer: 1, className: "kisan-data-tiles" });
    ref.current = layer;
    layer.addTo(map);
    return () => layer.remove();
    // opacity changes are applied below without rebuilding the tiles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, url, mask, filter, zIndex, maxNativeZoom, minZoom, attribution]);
  useEffect(() => {
    ref.current?.setOpacity(opacity);
  }, [opacity]);
  return null;
}
