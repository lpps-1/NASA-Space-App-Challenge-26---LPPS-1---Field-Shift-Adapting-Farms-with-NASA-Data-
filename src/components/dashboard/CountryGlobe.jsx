import { useEffect, useMemo, useRef } from "react";
import { geoArea, geoCentroid, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { useT } from "@/i18n";

/** ISO 3166-1 alpha-2 → numeric id used by world-atlas. Add a row when a country is supported. */
const NUMERIC_ID = { PK: "586", US: "840" };
const REDUCED = "(prefers-reduced-motion: reduce)";

const countries = feature(world, world.objects.countries).features;
const graticule = geoGraticule10();

/** Centre of the country's biggest landmass, so Alaska/Hawaii don't drag the US out to sea. */
function focusPoint(country) {
  if (country.geometry.type !== "MultiPolygon") return geoCentroid(country);
  let biggest = null;
  let biggestArea = -1;
  for (const coordinates of country.geometry.coordinates) {
    const polygon = { type: "Polygon", coordinates };
    const area = geoArea(polygon);
    if (area > biggestArea) {
      biggest = polygon;
      biggestArea = area;
    }
  }
  return geoCentroid(biggest);
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * A dark globe that spins into view and settles on the farmer's country,
 * which is lit up in harvest yellow while the rest of the world fades into the edges.
 */
export default function CountryGlobe({ country = "PK", className = "" }) {
  const { lang } = useT();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  const target = useMemo(() => {
    const id = NUMERIC_ID[country] || NUMERIC_ID.PK;
    const shape = countries.find((c) => String(c.id) === id);
    return { shape, point: focusPoint(shape) };
  }, [country]);

  const label = useMemo(() => {
    try {
      return new Intl.DisplayNames([lang === "en" ? "en" : "ur"], { type: "region" }).of(NUMERIC_ID[country] ? country : "PK");
    } catch {
      return target.shape.properties.name;
    }
  }, [country, lang, target]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const [lon, lat] = target.point;
    const reduced = window.matchMedia?.(REDUCED).matches;
    const projection = geoOrthographic().clipAngle(90);
    const path = geoPath(projection, ctx);
    let size = 0;
    let frame = 0;
    let started = 0;

    const draw = (rotation) => {
      const r = size / 2 - 3;
      const c = size / 2;
      projection.translate([c, c]).scale(r).rotate(rotation);
      ctx.clearRect(0, 0, size, size);

      // Ocean: deep green-black so the globe sits inside the hero.
      const ocean = ctx.createRadialGradient(c * 0.85, c * 0.8, r * 0.1, c, c, r);
      ocean.addColorStop(0, "#143326");
      ocean.addColorStop(1, "#06140d");
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.fillStyle = ocean;
      ctx.fill();

      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Every other country: dark and quiet.
      ctx.beginPath();
      for (const other of countries) if (other !== target.shape) path(other);
      ctx.fillStyle = "#264537";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // The farmer's country: lit and outlined.
      ctx.save();
      ctx.shadowColor = "rgba(242,201,76,0.85)";
      ctx.shadowBlur = size * 0.07;
      ctx.beginPath();
      path(target.shape);
      ctx.fillStyle = "#F2C94C";
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      path(target.shape);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Dark sides: the globe fades to black toward the edge, keeping the centre in focus.
      const sides = ctx.createRadialGradient(c, c, r * 0.35, c, c, r);
      sides.addColorStop(0, "rgba(0,0,0,0)");
      sides.addColorStop(0.7, "rgba(0,0,0,0.38)");
      sides.addColorStop(1, "rgba(0,0,0,0.88)");
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.fillStyle = sides;
      ctx.fill();

      // Thin atmosphere ring.
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.strokeStyle = "rgba(120,220,170,0.28)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };

    const resting = [-lon, -lat * 0.9];
    const render = (now) => {
      if (!started) started = now;
      const t = Math.min((now - started) / 2400, 1);
      const spin = (1 - easeOutCubic(t)) * 160;
      // After arriving, sway a few degrees so it feels alive without leaving the country.
      const sway = reduced || t < 1 ? 0 : Math.sin((now - started) / 2600) * 2.5;
      draw([resting[0] - spin + sway, resting[1] - (1 - easeOutCubic(t)) * 12]);
      if (!reduced) frame = requestAnimationFrame(render);
    };

    const resize = () => {
      const box = wrap.getBoundingClientRect();
      size = Math.round(Math.min(box.width, box.height));
      if (!size) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw(resting);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    if (!reduced) frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [target]);

  return (
    <figure className={`flex shrink-0 flex-col items-center gap-1.5 ${className}`} data-testid="country-globe">
      <div ref={wrapRef} className="h-[112px] w-[112px] sm:h-[168px] sm:w-[168px]">
        <canvas ref={canvasRef} role="img" aria-label={label} />
      </div>
      <figcaption className="text-[11px] font-semibold uppercase tracking-wider text-white/60" dir="auto">
        {label}
      </figcaption>
    </figure>
  );
}
