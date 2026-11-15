import COVERED from "@/data/coveredCountries.json";

/**
 * Keeps satellite data inside the countries the app covers (Pakistan and the United States).
 *
 * Each map tile is cut to the country outlines once, when it is drawn on its canvas. Nothing is
 * clipped while the map moves, so dragging and zooming stay smooth. (An earlier version clipped
 * the whole data pane with a CSS clip-path of about 6,300 points, which the browser had to redo
 * on every frame of a drag.)
 */

// Outlines in Web-Mercator "world" units (0..1 on both axes), with a bounding box per ring.
const mercX = (lng) => (lng + 180) / 360;
const mercY = (lat) => {
  const s = Math.sin((Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};
const RINGS = COVERED.features.flatMap((f) => {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  return polys.map((poly) => {
    const pts = new Float64Array(poly[0].length * 2);
    let u0 = 1, u1 = 0, v0 = 1, v1 = 0;
    poly[0].forEach(([lng, lat], i) => {
      const u = mercX(lng), v = mercY(lat);
      pts[i * 2] = u;
      pts[i * 2 + 1] = v;
      if (u < u0) u0 = u;
      if (u > u1) u1 = u;
      if (v < v0) v0 = v;
      if (v > v1) v1 = v;
    });
    return { pts, u0, u1, v0, v1 };
  });
});

function ringsFor({ x, y, z }) {
  const n = 2 ** z;
  const xw = ((x % n) + n) % n;
  const a = xw / n, b = (xw + 1) / n, c = y / n, d = (y + 1) / n;
  return { n, xw, rings: RINGS.filter((r) => r.u0 < b && r.u1 > a && r.v0 < d && r.v1 > c) };
}

/** True when any part of the tile lies inside a covered country (by bounding box). */
export const tileTouchesCovered = (coords) => ringsFor(coords).rings.length > 0;

/** Erases everything on the tile's canvas that lies outside the covered countries. */
export function clipToCovered(ctx, coords, size = 256) {
  const { n, xw, rings } = ringsFor(coords);
  if (!rings.length) {
    ctx.clearRect(0, 0, size, size);
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  for (const { pts } of rings) {
    for (let i = 0; i < pts.length; i += 2) {
      const px = (pts[i] * n - xw) * size, py = (pts[i + 1] * n - coords.y) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}
