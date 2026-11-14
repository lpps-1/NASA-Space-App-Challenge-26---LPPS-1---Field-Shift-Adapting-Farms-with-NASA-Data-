import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Droplets, FlaskConical, Landmark, ScanLine, Wheat } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import FormField, { inputClass } from "@/components/FormField";
import { FALLBACK_RATES, FERTILIZER_GUIDE, INPUT_PRICES, INPUT_PRICES_AS_OF, SEED_PRICES, TOOL_REGIONS, TOOLS, US_INPUT_PRICES_USD, US_SEED_PRICES_USD } from "@/data/fixtures";
import Flag from "@/components/Flag";
import { useProfile, useSettings, useUpdateSettings } from "@/hooks/useKisanData";
import { SchemesTool } from "@/components/tools/ExtraTools";
import { fromMaunds, toMaunds, unitLabel, yieldUnit } from "@/lib/units";
import { cn } from "@/lib/utils";
import { cropLabel } from "@/lib/cropNames";
import { useT } from "@/i18n";

const ICONS = { FlaskConical, Wheat, Droplets, Calculator, ScanLine, Landmark };
// Being finished: shown as "Soon" and not clickable yet.
const SOON = new Set(["irrigation", "disease"]);
const CROPS = Object.keys(FERTILIZER_GUIDE);
const CURRENCIES = [
  { id: "PKR", label: "PKR (Rs)" },
  { id: "USD", label: "USD ($)" },
  { id: "EUR", label: "EUR (€)" },
];

/** Live Rs-per-unit rates for USD and EUR (open.er-api.com, free, no key), with backup values. */
function useRates() {
  return useQuery({
    queryKey: ["fx-rates"],
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/PKR", { signal: AbortSignal.timeout(6000) });
        const data = await res.json();
        if (data?.result !== "success" || !data.rates?.USD || !data.rates?.EUR) throw new Error("bad rates");
        return { PKR: 1, USD: 1 / data.rates.USD, EUR: 1 / data.rates.EUR, live: true, updated: data.time_last_update_utc?.slice(5, 16) };
      } catch {
        return { ...FALLBACK_RATES, live: false };
      }
    },
  });
}

/** Money helpers for one currency. Amounts are kept in rupees and converted for display. */
function money(currency, rates) {
  const per = rates?.[currency] || FALLBACK_RATES[currency] || 1;
  const symbol = { PKR: "Rs ", USD: "$", EUR: "€" }[currency];
  return {
    currency,
    symbol: symbol.trim(),
    fromRs: (rs) => rs / per,
    toRs: (v) => v * per,
    fmt: (rs) => {
      const v = rs / per;
      return `${symbol}${v.toLocaleString("en-US", { maximumFractionDigits: currency === "PKR" ? 0 : v < 100 ? 2 : 0 })}`;
    },
  };
}

function Result({ label, value, sub }) {
  return (
    <div className="min-w-0 rounded-md bg-secondary/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-display text-xl tabular-nums sm:text-2xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** An amount typed in the chosen currency, stored in rupees. */
function MoneyField({ label, rs, onChange, m, step }) {
  const shown = Math.round(m.fromRs(rs) * 100) / 100;
  return (
    <FormField
      label={`${label} (${m.symbol})`}
      type="number"
      min="0"
      step={step || (m.currency === "PKR" ? 10 : 0.01)}
      value={Number.isFinite(shown) ? shown : 0}
      onChange={(e) => onChange(m.toRs(Number(e.target.value) || 0))}
    />
  );
}

function CropAcreInputs({ crop, setCrop, acres, setAcres }) {
  const { t, lang } = useT();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label={t("Crop")}>
        <select className={inputClass} value={crop} onChange={(e) => setCrop(e.target.value)}>
          {CROPS.map((c) => <option key={c} value={c}>{cropLabel(c, lang)}</option>)}
        </select>
      </FormField>
      <FormField label={t("Area (acres)")} type="number" min="0" step="0.5" value={acres} onChange={(e) => setAcres(Number(e.target.value))} />
    </div>
  );
}

function ToolPanel({ id, m, regionName, avg, seedAvg, country }) {
  const { t, lang } = useT();
  const [crop, setCrop] = useState("Wheat");
  const [acres, setAcres] = useState(6);
  const [yieldMaunds, setYield] = useState(45);
  const [salePrice, setSalePrice] = useState(3500); // Rs per 40 kg
  const [seedPrices, setSeedPrices] = useState(seedAvg); // Rs per kg, per crop
  const { data: settings } = useSettings();
  const saveSettings = useUpdateSettings();
  const own = settings?.input_prices || {};
  const hasOwn = ["urea", "dap", "sop"].some((k) => Number(own[k]) > 0);
  const setOwn = (k, v) => saveSettings.mutate({ input_prices: { ...own, [k]: v } });
  const g = FERTILIZER_GUIDE[crop];
  const rs = m.fmt;

  const fert = useMemo(() => {
    const urea = g.urea * acres, dap = g.dap * acres, sop = g.sop * acres;
    const price = (k) => (Number(own[k]) > 0 ? Number(own[k]) : avg[k]);
    return { urea, dap, sop, cost: urea * price("urea") + dap * price("dap") + sop * price("sop") };
  }, [g, acres, own, avg]);

  if (id === "loan") return <SchemesTool country={country} />;
  const unit = yieldUnit(settings, lang, country);

  if (id === "fertilizer") {
    const rows = [
      { key: "urea", label: t("Urea"), bags: fert.urea, per: g.urea },
      { key: "dap", label: "DAP", bags: fert.dap, per: g.dap },
      { key: "sop", label: "SOP", bags: fert.sop, per: g.sop },
    ];
    const avgCost = rows.reduce((a2, r) => a2 + r.bags * avg[r.key], 0);
    return (
      <>
        <CropAcreInputs {...{ crop, setCrop, acres, setAcres }} />
        <div className="mt-5 overflow-x-auto rounded-2xl border [border-color:var(--card-line)]">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-start text-xs text-muted-foreground">
                <th className="p-3 text-start font-medium">{t("Fertilizer")}</th>
                <th className="p-3 text-start font-medium">{t("Bags needed")}</th>
                <th className="p-3 text-start font-medium">{t("Average price")}</th>
                <th className="p-3 text-start font-medium">{t("Your price per bag")} ({m.symbol})</th>
                <th className="p-3 text-end font-medium">{t("Cost")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const mine = Number(own[r.key]) > 0 ? Number(own[r.key]) : null;
                const price = mine ?? avg[r.key];
                const diff = mine != null ? mine - avg[r.key] : 0;
                return (
                  <tr key={r.key} className="border-t border-border">
                    <td className="p-3 font-medium">{r.label}</td>
                    <td className="p-3 tabular-nums">{t("{n} bags", { n: r.bags })}<span className="block text-[11px] text-muted-foreground">{t("{n} per acre", { n: r.per })}</span></td>
                    <td className="p-3 tabular-nums text-muted-foreground">{rs(avg[r.key])}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        step={m.currency === "PKR" ? 50 : 0.5}
                        className={cn(inputClass, "w-28 py-1.5")}
                        value={mine != null ? Math.round(m.fromRs(mine) * 100) / 100 : ""}
                        placeholder={String(Math.round(m.fromRs(avg[r.key]) * 100) / 100)}
                        aria-label={`${t("Your price per bag")}: ${r.label}`}
                        data-testid={`own-price-${r.key}`}
                        onChange={(e) => setOwn(r.key, e.target.value === "" ? null : m.toRs(Number(e.target.value)))}
                      />
                      {diff !== 0 && <span className={cn("mt-0.5 block text-[11px]", diff > 0 ? "text-alert" : "text-field")}>{diff > 0 ? t("{price} above average", { price: rs(diff) }) : t("{price} below average", { price: rs(-diff) })}</span>}
                    </td>
                    <td className="p-3 text-end font-semibold tabular-nums">{rs(r.bags * price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Result label={t("Your cost")} value={rs(fert.cost)} sub={hasOwn ? t("with the prices you entered") : t("at average prices")} />
          <Result label={t("At average prices")} value={rs(avgCost)} sub={t("Average dealer price, {date}", { date: INPUT_PRICES_AS_OF })} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("Average prices are typical dealer rates in Pakistan and are reviewed by hand, not a live market feed. Enter what your own dealer charges and it is saved for next time.")}{" "}
          {t("General doses for {region}. A soil test and your local extension office give the exact dose for your field.", { region: t(regionName) })}
        </p>
      </>
    );
  }

  if (id === "seed")
    return (
      <>
        <CropAcreInputs {...{ crop, setCrop, acres, setAcres }} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <MoneyField label={t("Seed price per kg")} rs={seedPrices[crop]} m={m} onChange={(v) => setSeedPrices({ ...seedPrices, [crop]: v })} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Result label={t("Seed needed")} value={`${(g.seed_kg * acres).toLocaleString()} kg`} sub={t("{n} kg per acre", { n: g.seed_kg })} />
          <Result label={t("Bags (50 kg)")} value={Math.ceil((g.seed_kg * acres) / 50)} />
          <Result label={t("Seed cost")} value={rs(g.seed_kg * acres * seedPrices[crop])} sub={t("{price} per kg", { price: rs(seedPrices[crop]) })} />
          <Result label={t("Cost per acre")} value={rs(g.seed_kg * seedPrices[crop])} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("Typical seed price in {region}. Change it to your dealer's price.", { region: t(regionName) })}</p>
      </>
    );

  if (id === "profit") {
    const price = salePrice;
    const income = yieldMaunds * price * acres;
    const cost = fert.cost + 35000 * acres;
    return (
      <>
        <CropAcreInputs {...{ crop, setCrop, acres, setAcres }} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField
            label={t("Expected yield ({unit} per acre)", { unit: unitLabel(unit, t) })}
            type="number"
            min="0"
            value={Math.round(fromMaunds(yieldMaunds, unit) * 10) / 10}
            onChange={(e) => setYield(toMaunds(Number(e.target.value), unit))}
          />
          <MoneyField label={t("Your expected sale price per {unit}", { unit: unitLabel(unit, t) })} rs={Math.round(salePrice / fromMaunds(1, unit))} m={m} onChange={(v) => setSalePrice(v * fromMaunds(1, unit))} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Result label={t("Income")} value={rs(income)} sub={t("at {price} per {unit}", { price: rs(price / fromMaunds(1, unit)), unit: unitLabel(unit, t) })} />
          <Result label={t("Input cost")} value={rs(cost)} sub={t("fertilizer + {price} per acre other costs", { price: rs(35000) })} />
          <Result label={t("Profit")} value={rs(income - cost)} />
        </div>
      </>
    );
  }
  return null;
}

const regionId0 = (r) => r || "punjab";

/** The farmer's province from their profile, as a calculator region id. */
function regionFromProfile(p) {
  const name = String(p?.province || "").toLowerCase();
  if (!name) return "punjab";
  return TOOL_REGIONS.find((r) => r.id !== "intl" && name.startsWith(r.name.toLowerCase().slice(0, 5)))?.id || "punjab";
}

export default function Tools() {
  const { t } = useT();
  const [active, setActive] = useState("fertilizer");
  const usesMoney = ["fertilizer", "seed", "profit"].includes(active);
  const tool = TOOLS.find((x) => x.id === active);
  const { data: profile } = useProfile();
  const { data: rates } = useRates();
  const [region, setRegion] = useState(null);
  const [currency, setCurrency] = useState("PKR");
  useEffect(() => {
    if (profile && region == null) {
      setRegion(profile.country === "US" ? "intl" : regionFromProfile(profile));
      if (profile.country === "US") setCurrency("USD");
    }
  }, [profile, region]);
  // Country for the calculators: Pakistan or the United States. It sets the regions, the prices and the currency.
  const country = regionId0(region) === "intl" ? "US" : "PK";
  const setCountry = (c) => {
    if (c === country) return;
    setRegion(c === "US" ? "intl" : regionFromProfile(profile?.country === "US" ? null : profile));
    setCurrency(c === "US" ? "USD" : "PKR");
  };
  const usdRs = rates?.USD || FALLBACK_RATES.USD;
  const avg = useMemo(
    () => (country === "US" ? Object.fromEntries(Object.entries(US_INPUT_PRICES_USD).map(([k, v]) => [k, v * usdRs])) : INPUT_PRICES),
    [country, usdRs]
  );
  const seedAvg = useMemo(
    () => (country === "US" ? Object.fromEntries(Object.entries(US_SEED_PRICES_USD).map(([k, v]) => [k, v * usdRs])) : SEED_PRICES),
    [country, usdRs]
  );
  const regionId = region || "punjab";
  const regionName = TOOL_REGIONS.find((r) => r.id === regionId)?.name;
  const m = money(currency, rates);
  const changeRegion = (id) => {
    setRegion(id);
    if (id === "intl" && currency === "PKR") setCurrency("USD");
  };

  return (
    <>
      <PageHeader eyebrow={t("Tools")} title={t("Farm calculators")} description={t("Quick answers for the decisions you make every season.")} />
      <div className="mb-8 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("Country")} data-testid="tools-country">
        <span className="me-1 text-sm text-muted-foreground">{t("Country")}:</span>
        {[
          ["PK", t("Pakistan")],
          ["US", t("United States")],
        ].map(([c, label]) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={country === c}
            onClick={() => setCountry(c)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors focus-ring",
              country === c ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-secondary"
            )}
          >
            <Flag country={c} className="h-4 w-6" /> {label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">{country === "US" ? t("US dollars and typical US prices") : t("Rupees and typical Pakistani prices")}</span>
      </div>
      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ul className="grid content-start gap-1 self-start sm:grid-cols-2 lg:sticky lg:top-6 lg:grid-cols-1">
          {/* Ready tools first; the ones still being built ("Soon") at the bottom, switched off. */}
          {[...TOOLS.filter((x) => !SOON.has(x.id) && !x.soon), ...TOOLS.filter((x) => SOON.has(x.id) || x.soon)].map((x0) => {
            const x = SOON.has(x0.id) ? { ...x0, soon: true } : x0;
            const Icon = ICONS[x.icon];
            return (
              <li key={x.id}>
                <button
                  disabled={x.soon}
                  onClick={() => setActive(x.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start transition-colors focus-ring disabled:opacity-55",
                    active === x.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", active === x.id ? "text-primary" : "")} aria-hidden="true" />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {t(x.name)}
                      {x.soon && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">{t("Soon")}</span>}
                    </span>
                    <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">{t(x.description)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <section className="kisan-card rise-in min-w-0 p-6 sm:p-8" key={active}>
          <h2 className="text-xl font-semibold tracking-tight">{t(tool.name)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t(tool.description)}</p>
          <div className={cn("mb-6 mt-5 grid gap-4 border-b pb-5 sm:grid-cols-2 [border-color:hsl(var(--edge))]", !usesMoney && "hidden")}>
            <FormField label={t("Region")}>
              <select className={inputClass} value={regionId} onChange={(e) => changeRegion(e.target.value)}>
                {TOOL_REGIONS.filter((r) => (country === "US" ? r.id === "intl" : r.id !== "intl")).map((r) => <option key={r.id} value={r.id}>{t(r.name)}</option>)}
              </select>
            </FormField>
            <FormField label={t("Currency")}>
              <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </FormField>
            {currency !== "PKR" && (
              <p className="text-xs text-muted-foreground sm:col-span-2" dir="auto">
                1 {currency} = Rs {Math.round(rates?.[currency] || FALLBACK_RATES[currency])}{" "}
                {rates?.live ? t("(live rate, {date})", { date: rates.updated }) : t("(approximate rate, live rates unavailable)")}
              </p>
            )}
          </div>
          {!usesMoney && <div className="mt-5" />}
          <ToolPanel key={`${active}-${country}`} id={active} m={m} regionName={regionName} avg={avg} seedAvg={seedAvg} country={country} />
        </section>
      </div>
    </>
  );
}
