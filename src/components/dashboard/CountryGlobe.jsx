import { useEffect, useMemo, useRef } from "react";
import { geoArea, geoCentroid, geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import Flag from "@/components/Flag";
import { useT } from "@/i18n";

/** ISO 3166-1 alpha-2 → numeric id used by world-atlas. Add a row when a country is supported. */
const NUMERIC_ID = { PK: "586", US: "840" };
const REDUCED = "(prefers-reduced-motion: reduce)";
const SWAY_DEGREES = 38; // how far the globe turns either side of the farm
const SWAY_SECONDS = 16; // one full back-and-forth

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

const TILT = (-24 * Math.PI) / 180; // slant of the satellite's orbit
const ORBIT_SECONDS = 9;

/** A small flat satellite: a body, two solar panels and an antenna. Drawn along the orbit. */
function drawSatellite(ctx, x, y, u) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(TILT);
  ctx.fillStyle = "#5b8fc7";
  ctx.fillRect(-u * 3, -u * 0.5, u * 1.8, u);
  ctx.fillRect(u * 1.2, -u * 0.5, u * 1.8, u);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = Math.max(0.5, u * 0.12);
  for (const sx of [-u * 2.1, u * 2.1]) {
    ctx.beginPath();
    ctx.moveTo(sx, -u * 0.5);
    ctx.lineTo(sx, u * 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = "#e7ece9";
  ctx.fillRect(-u * 1.1, -u * 0.75, u * 2.2, u * 1.5);
  ctx.strokeStyle = "#e7ece9";
  ctx.lineWidth = Math.max(0.6, u * 0.16);
  ctx.beginPath();
  ctx.moveTo(0, -u * 0.75);
  ctx.lineTo(0, -u * 1.6);
  ctx.stroke();
  ctx.fillStyle = "#F2C94C";
  ctx.beginPath();
  ctx.arc(0, -u * 1.7, u * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const finite = (n) => typeof n === "number" && Number.isFinite(n);

/**
 * A dark globe that spins into view and turns slowly from side to side around the farmer's
 * region. The country is lit in harvest yellow, a pulsing marker with a flag on a pole
 * sits on the farm, a small satellite circles the globe, and the sides fade to black. Pakistan and the US only.
 */
export default function CountryGlobe({ profile, className = "" }) {
  const { lang } = useT();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const pinRef = useRef(null);

  const country = NUMERIC_ID[profile?.country] ? profile.country : "PK";
  const lat = profile?.lat;
  const lng = profile?.lng;

  const target = useMemo(() => {
    const shape = countries.find((c) => String(c.id) === NUMERIC_ID[country]);
    const centre = focusPoint(shape);
    // The farm itself when we know where it is; otherwise the middle of the country.
    const farm = finite(lat) && finite(lng) ? [lng, lat] : null;
    return { shape, centre, farm };
  }, [country, lat, lng]);

  const countryName = useMemo(() => {
    try {
      return new Intl.DisplayNames([lang === "en" ? "en" : "ur"], { type: "region" }).of(country);
    } catch {
      return target.shape.properties.name;
    }
  }, [country, lang, target]);
  const region = [profile?.district, profile?.province].filter(Boolean).join(", ");

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const pin = pinRef.current;
    if (!wrap || !canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const [lon, lt] = target.farm || target.centre;
    const reduced = window.matchMedia?.(REDUCED).matches;
    const projection = geoOrthographic().clipAngle(90);
    const path = geoPath(projection, ctx);
    let width = 0;
    let height = 0;
    let frame = 0;
    let started = 0;

    const draw = (rotation, now) => {
      const r = height * 0.43;
      const cx = width / 2;
      const cy = height / 2;
      projection.translate([cx, cy]).scale(r).rotate(rotation);
      ctx.clearRect(0, 0, width, height);

      // Satellite orbit. Its far half and the satellite (when behind) are drawn first, so the globe covers them.
      const rx = width * 0.47;
      const ry = height * 0.15;
      const theta = reduced ? 0.8 : ((now || 0) / 1000 / ORBIT_SECONDS) * Math.PI * 2 + 0.8;
      const front = Math.sin(theta) > 0;
      const sx = cx + rx * Math.cos(theta) * Math.cos(TILT) - ry * Math.sin(theta) * Math.sin(TILT);
      const sy = cy + rx * Math.cos(theta) * Math.sin(TILT) + ry * Math.sin(theta) * Math.cos(TILT);
      const orbit = (from, to, alpha) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, TILT, from, to);
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      };
      orbit(Math.PI, Math.PI * 2, 0.14);
      if (!front) drawSatellite(ctx, sx, sy, height * 0.027);

      // Ocean: deep green-black so the globe sits inside the hero.
      const ocean = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.2, r * 0.1, cx, cy, r);
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
      ctx.shadowBlur = height * 0.07;
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
      const sides = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
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

      orbit(0, Math.PI, 0.32);
      if (front) drawSatellite(ctx, sx, sy, height * 0.027);

      // Location marker: a dot with two ripples, and the flag pole on top of it.
      const xy = target.farm ? projection(target.farm) : null;
      const facing = target.farm && geoDistance(target.farm, [-rotation[0], -rotation[1]]) < 1.35;
      if (xy && facing) {
        const [x, y] = xy;
        if (!reduced) {
          for (const offset of [0, 0.5]) {
            const phase = (((now || 0) / 2200 + offset) % 1);
            ctx.beginPath();
            ctx.arc(x, y, height * (0.015 + phase * 0.07), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(242,201,76,${0.8 * (1 - phase)})`;
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }
        }
        ctx.beginPath();
        ctx.arc(x, y, height * 0.017, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#123D2A";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        if (pin) {
          pin.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          pin.style.opacity = "1";
        }
      } else if (pin) {
        pin.style.opacity = "0";
      }
    };

    const resting = [-lon, -lt * 0.9];
    const render = (now) => {
      if (!started) started = now;
      const elapsed = now - started;
      const t = Math.min(elapsed / 2400, 1);
      const arriving = 1 - easeOutCubic(t);
      // After arriving the globe turns slowly left and right, so the farm stays in view.
      const turn = t < 1 ? 0 : Math.sin(((elapsed - 2400) / 1000 / SWAY_SECONDS) * Math.PI * 2) * SWAY_DEGREES;
      draw([resting[0] - arriving * 160 + turn, resting[1] - arriving * 12], now);
      frame = requestAnimationFrame(render);
    };

    const resize = () => {
      const box = wrap.getBoundingClientRect();
      width = Math.round(box.width);
      height = Math.round(box.height);
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw(resting, 0);
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
    <figure className={`flex shrink-0 flex-col items-center gap-2 ${className}`} data-testid="country-globe">
      <div ref={wrapRef} className="relative h-[112px] w-[150px] sm:h-[160px] sm:w-[232px] lg:h-[200px] lg:w-[290px]">
        <canvas ref={canvasRef} role="img" aria-label={[region, countryName].filter(Boolean).join(", ")} />
        {/* A flag on a pole planted at the farm; the canvas moves it with the globe. */}
        <div ref={pinRef} className="pointer-events-none absolute left-0 top-0 h-0 w-0 opacity-0" aria-hidden="true">
          <span className="absolute bottom-0 left-0 h-[22px] w-px -translate-x-1/2 bg-white/90" />
          <Flag country={country} className="absolute bottom-[9px] left-0 h-[13px] w-[19px] rounded-[1px]" />
        </div>
      </div>
      <figcaption className="flex flex-col items-center gap-0.5 text-center" dir="auto">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90">
          <Flag country={country} className="h-3.5 w-5 rounded-[2px]" />
          {region || countryName}
        </span>
        {region && <span className="text-[11px] font-semibold uppercase tracking-wider text-white/55">{countryName}</span>}
      </figcaption>
    </figure>
  );
}
