import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, LocateFixed, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import FormField, { inputClass, Required } from "@/components/FormField";
import { kisan } from "@/api/kisanClient";
import { COUNTRIES } from "@/data/fixtures";
import Flag from "@/components/Flag";
import { useGeoDistrict, useGeoProvince, useGeoProvinces, useGeoSearch, useUSSearch } from "@/hooks/useKisanData";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

const norm = (s) => String(s || "").trim().toLowerCase();

/** Profile fields written by the picker. */
export function locationPatch(d, tehsil = null) {
  if (!d) return { district: "", district_id: null, division: null, division_id: null, tehsil: null, lat: null, lng: null };
  return {
    country: "PK",
    province: d.province,
    province_id: d.province_id,
    division: d.division,
    division_id: d.division_id,
    district: d.name,
    district_id: d.id,
    tehsil,
    lat: d.lat,
    lng: d.lng,
  };
}

/** The same fields for a place in the United States (state → county → nearest town). */
export function usLocationPatch(r) {
  return {
    country: "US",
    province: r.state,
    province_id: null,
    division: null,
    division_id: null,
    district: r.county ? (/ county$/i.test(r.county) ? r.county : `${r.county} County`) : r.name,
    district_id: null,
    tehsil: r.county && r.name !== r.county ? r.name : null,
    lat: r.lat,
    lng: r.lng,
  };
}

const placeLine = (v) => [v.tehsil, v.district, v.province].filter(Boolean).join(", ");

/**
 * Country, then the place inside it.
 * Pakistan: province → division → district → tehsil from the district database, with search and "use my location".
 * United States: search for the nearest town; the state and county come with it.
 * `value` is the profile (or any object with the fields from locationPatch); `onChange(patch)` receives the fields to merge.
 */
export default function LocationPicker({ value, onChange, className }) {
  const { t, lang } = useT();
  const country = value.country === "US" ? "US" : "PK";
  const done = useRef(null);
  const [flash, setFlash] = useState(0);

  // Show the farmer that the place was saved: bring the green card into view and pulse it.
  const confirm = (patch) => {
    onChange(patch);
    setFlash((n) => n + 1);
    requestAnimationFrame(() => setTimeout(() => done.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60));
  };

  const setCountry = (id) => {
    if (id === country) return;
    onChange({ ...locationPatch(null), country: id, province: "", province_id: null, village: "", current_crops: [], previous_crops: [], grow_types: [], rotation: "" });
  };

  const hasPlace = Boolean(value.district) && Number.isFinite(value.lat);

  return (
    <div className={cn("grid gap-5", className)}>
      <fieldset className="col-span-full">
        <legend className="mb-2 text-sm font-medium">{t("Country")}<Required /></legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {COUNTRIES.map((c) => {
            const on = country === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCountry(c.id)}
                data-testid={`country-${c.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-start transition-all focus-ring active:scale-[0.98]",
                  on ? "border-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary))]" : "border-border hover:border-foreground/25 hover:bg-secondary/60"
                )}
              >
                <Flag country={c.id} className="h-7 w-10" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{lang === "en" ? c.en : c.ur}</span>
                  <span className="block text-xs text-muted-foreground">{t(c.note)}</span>
                </span>
                {on && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground" data-testid="country-note">
          {t("Only Pakistan and the United States for now: with the time we had for this project, we started with these two countries. More will follow.")}
        </p>
      </fieldset>

      <div className="col-span-full">
        {country === "PK" ? <PakistanPicker value={value} onChange={onChange} confirm={confirm} /> : <USPicker value={value} confirm={confirm} />}
      </div>

      <div
        ref={done}
        key={flash}
        aria-live="polite"
        data-testid="location-set"
        className={cn(
          "col-span-full flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors",
          hasPlace ? "border-primary/60 bg-primary/10" : "border-dashed border-border text-muted-foreground",
          hasPlace && flash > 0 && "kisan-pop"
        )}
      >
        {hasPlace ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> : <MapPin className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
        <div className="min-w-0">
          {hasPlace ? (
            <>
              <p className="font-semibold">{t("Farm location set")}: <span dir="auto">{placeLine(value)}</span></p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("Weather and NASA climate will use this point")} <span dir="ltr">({Math.abs(value.lat).toFixed(2)}°{value.lat >= 0 ? "N" : "S"}, {Math.abs(value.lng).toFixed(2)}°{value.lng >= 0 ? "E" : "W"})</span>.
              </p>
            </>
          ) : (
            <p>{t("No location yet. Search above, use your location, or pick from the lists.")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PakistanPicker({ value, onChange, confirm }) {
  const { t } = useT();
  const { data: provinces = [], isLoading: loadingProvinces } = useGeoProvinces();
  const { data: provinceData } = useGeoProvince(value.province_id);
  const { data: district } = useGeoDistrict(value.district_id);
  const [divisionFilter, setDivisionFilter] = useState("");
  const [locating, setLocating] = useState(false);

  const divisions = provinceData?.divisions || [];
  const districts = provinceData?.districts || [];
  const tehsils = district?.tehsils || [];
  const currentProvince = provinces.find((p) => p.id === value.province_id);
  const subLabel = t(currentProvince?.subdivision_label === "taluka" ? "Taluka" : currentProvince?.subdivision_label === "zone" ? "Zone" : "Tehsil");

  // Profiles saved before the district database existed only hold names.
  // Match them to database ids once the reference data has loaded.
  useEffect(() => {
    if (value.province_id || !value.province || !provinces.length) return;
    const n = norm(value.province);
    const p = provinces.find((x) => norm(x.name) === n || x.aliases?.some((a) => norm(a) === n));
    if (p) onChange({ province: p.name, province_id: p.id });
  }, [value.province, value.province_id, provinces, onChange]);

  useEffect(() => {
    if (value.district_id || !value.district || !districts.length) return;
    const n = norm(value.district);
    const d = districts.find((x) => norm(x.name) === n || norm(x.headquarters) === n || x.aliases?.some((a) => norm(a) === n));
    if (d) onChange(locationPatch(d, value.tehsil || null));
  }, [value.district, value.district_id, value.tehsil, districts, onChange]);

  const grouped = useMemo(() => {
    const list = divisionFilter ? districts.filter((d) => d.division_id === divisionFilter) : districts;
    if (!divisions.length || divisionFilter) return [{ id: null, name: null, items: list }];
    return divisions
      .map((dv) => ({ ...dv, items: list.filter((d) => d.division_id === dv.id) }))
      .filter((g) => g.items.length);
  }, [districts, divisions, divisionFilter]);

  const pickProvince = (id) => {
    const p = provinces.find((x) => x.id === id);
    setDivisionFilter("");
    onChange({ province: p?.name || "", province_id: id || null, ...locationPatch(null) });
  };

  const pickDistrict = (id) => confirm(locationPatch(districts.find((d) => d.id === id), null));

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error(t("This browser can't share its location."));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const d = await kisan.services.geo.nearest(coords.latitude, coords.longitude);
          if (!d || d.distance_km > 150) throw new Error(t("You seem to be outside Pakistan."));
          setDivisionFilter("");
          confirm(locationPatch(d, null));
          toast.success(t("Nearest district: {name}, {province}", { name: d.name, province: d.province }));
        } catch (err) {
          toast.error(err.message || t("Couldn't find your district."));
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error(t("Location permission was denied. Choose your district from the list instead."));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <PlaceSearch
          className="flex-1"
          onPick={(r) => {
            setDivisionFilter("");
            confirm(locationPatch(r, r.tehsil || null));
            toast.success(t("Location set: {place}", { place: `${r.tehsil ? `${r.tehsil}, ` : ""}${r.name}` }));
          }}
        />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3.5 py-2.5 text-sm hover:bg-secondary disabled:opacity-60 focus-ring"
        >
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
          {locating ? t("Locating…") : t("Use my location")}
        </button>
      </div>

      <p className="-mb-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> {t("or pick step by step")} <span className="h-px flex-1 bg-border" />
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("Province / territory")} required hint={t("The largest region, such as Punjab or Sindh.")}>
          <select className={inputClass} value={value.province_id || ""} onChange={(e) => pickProvince(e.target.value)} disabled={loadingProvinces}>
            <option value="" disabled>{loadingProvinces ? t("Loading…") : t("Select province")}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.district_count})</option>
            ))}
          </select>
        </FormField>

        {divisions.length > 0 && (
          <FormField label={t("Division")} hint={t("A group of neighbouring districts. Optional: it only shortens the district list.")}>
            <select className={inputClass} value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)}>
              <option value="">{t("All divisions")}</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FormField>
        )}

        <FormField label={t("District")} required hint={t("Your zila. Weather, soil and sowing dates are matched to it.")}>
          <select className={inputClass} value={value.district_id || ""} onChange={(e) => pickDistrict(e.target.value)} disabled={!value.province_id || !districts.length}>
            <option value="" disabled>{!value.province_id ? t("Select province first") : districts.length ? t("Select district") : t("Loading…")}</option>
            {grouped.map((g) =>
              g.name ? (
                <optgroup key={g.id} label={t("{name} Division", { name: g.name })}>
                  {g.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </optgroup>
              ) : (
                g.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
              )
            )}
            {value.district_id && !districts.some((d) => d.id === value.district_id) && <option value={value.district_id}>{value.district}</option>}
          </select>
        </FormField>

        <FormField label={subLabel} hint={t("A part of your district, usually named after its main town. Optional: it makes the weather more local.")}>
          {tehsils.length ? (
            <select className={inputClass} value={value.tehsil || ""} onChange={(e) => onChange({ tehsil: e.target.value || null })}>
              <option value="">{t("Whole district")}</option>
              {tehsils.map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
            </select>
          ) : (
            <input className={inputClass} value={value.tehsil || ""} placeholder={value.district_id ? t("{label} (optional)", { label: subLabel }) : t("Select district first")}
              disabled={!value.district_id} onChange={(e) => onChange({ tehsil: e.target.value || null })} />
          )}
        </FormField>
      </div>
    </div>
  );
}

function USPicker({ value, confirm }) {
  const { t } = useT();
  return (
    <div className="grid gap-3">
      <USPlaceSearch
        required
        onPick={(r) => {
          confirm(usLocationPatch(r));
          toast.success(t("Location set: {place}", { place: `${r.name}, ${r.state}` }));
        }}
      />
      <p className="text-xs text-muted-foreground">
        {t("Type the town nearest your farm. The state and county are filled in for you, and the USDA soil survey is looked up for that point.")}
      </p>
      {value.district && (
        <dl className="grid grid-cols-3 gap-2 text-sm">
          {[[t("State"), value.province], [t("County"), value.district], [t("Nearest town"), value.tehsil || "—"]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-secondary/60 px-3 py-2">
              <dt className="text-[11px] text-muted-foreground">{k}</dt>
              <dd className="truncate font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Search box for towns in the United States (Open-Meteo place search). */
export function USPlaceSearch({ onPick, className, label, autoFocus = false, required = false }) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data: results = [], isFetching } = useUSSearch(q);
  const box = useRef(null);
  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const show = open && q.trim().length >= 2;
  const choose = (r) => {
    onPick(r);
    setQ("");
    setOpen(false);
  };
  return (
    <div ref={box} className={cn("relative", className)}>
      <FormField label={label || t("Nearest town or city")} required={required}>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            className={cn(inputClass, "ps-9")}
            value={q}
            placeholder={t("e.g. Ames, Fresno, Lubbock")}
            autoFocus={autoFocus}
            data-testid="us-search"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && show && results[0]) {
                e.preventDefault();
                choose(results[0]);
              }
            }}
          />
        </div>
      </FormField>
      {show && (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 text-sm shadow-lg">
          {results.length === 0 && <li className="px-3 py-2 text-muted-foreground">{isFetching ? t("Searching…") : t("No town found. Try another spelling.")}</li>}
          {results.map((r) => (
            <li
              key={r.id}
              role="option"
              aria-selected="false"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(r);
              }}
              className="cursor-pointer rounded-lg px-3 py-2 hover:bg-secondary"
            >
              <span className="font-medium">{r.name}</span>
              <span className="ms-2 text-xs text-muted-foreground">{[r.county && (/ county$/i.test(r.county) ? r.county : `${r.county} County`), r.state].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PlaceSearch({ onPick, className, label, autoFocus = false }) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { data: results = [], isFetching } = useGeoSearch(q);
  const box = useRef(null);

  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (r) => {
    onPick(r);
    setQ("");
    setOpen(false);
  };

  const show = open && q.trim().length >= 2;
  return (
    <div ref={box} className={cn("relative", className)}>
      <FormField label={label || t("Find your district or tehsil")}>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            className={cn(inputClass, "ps-9")}
            value={q}
            placeholder={t("e.g. Jaranwala, Mithi, Swat, Skardu")}
            autoFocus={autoFocus}
            role="combobox"
            aria-expanded={show}
            aria-controls="place-results"
            aria-autocomplete="list"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (!show || !results.length) return;
              if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(a + 1, results.length - 1)));
              else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
              else if (e.key === "Enter") (e.preventDefault(), choose(results[active]));
              else if (e.key === "Escape") setOpen(false);
            }}
          />
        </div>
      </FormField>
      {show && (
        <ul id="place-results" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 text-sm shadow-lg">
          {results.length === 0 && (
            <li className="px-3 py-2 text-muted-foreground">{isFetching ? t("Searching…") : t("No district or tehsil found. Try another spelling.")}</li>
          )}
          {results.map((r, i) => (
            <li
              key={(r.tehsil_id || r.id) + i}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => (e.preventDefault(), choose(r))}
              onMouseEnter={() => setActive(i)}
              className={cn("cursor-pointer rounded-lg px-3 py-2", i === active && "bg-secondary")}
            >
              <span className="font-medium">{r.tehsil || r.name}</span>
              <span className="ms-2 text-xs text-muted-foreground">
                {r.tehsil ? `${t(r.type)} · ${t("{name} District", { name: r.name })}` : t("District")}
                {r.division ? ` · ${t("{name} Division", { name: r.division })}` : ""} · {r.province}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
