import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, LogOut, MapPin } from "lucide-react";
import FormField, { inputClass, Required } from "@/components/FormField";
import { CROP_CYCLE_OPTIONS, cropGroupsFor, GROW_TYPES, MAX_CROP_PICKS, SOIL_OPTIONS } from "@/data/fixtures";
import { cropLabel } from "@/lib/cropNames";
import LocationPicker from "@/components/LocationPicker";
import BrandMark from "@/components/BrandMark";
import { CropChips, CropYearStrip, FarmFacts, GoalPicker, IrrigationPicker } from "@/components/FarmChoices";
import { useEntityMutations, useFields, useProfile, useUpdateProfile, useUpdateSettings } from "@/hooks/useKisanData";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/AuthContext";
import { deriveFarmFields } from "@/lib/farmSetup";
import { usualSoil, usualSoilUS } from "@/lib/soil";
import { useQuery } from "@tanstack/react-query";
import { kisan } from "@/api/kisanClient";
import { cn } from "@/lib/utils";

/**
 * Farm setup, shown right after sign-in until the farmer has answered the
 * required questions (see needsFarmSetup in src/lib/farmSetup.js).
 * The app language is chosen before this, on first open (LanguageGate).
 */
const STEPS = [
  { key: "you", title: "First, what should we call you?" },
  { key: "place", title: "Where is your farm?" },
  { key: "land", title: "Your land and water" },
  { key: "crops", title: "What do you grow?" },
  { key: "goals", title: "What do you want from this season?" },
];

const ACRE_PRESETS = { PK: [1, 2.5, 5, 12.5, 25, 50], US: [40, 80, 160, 320, 640, 1000] };
const GROW_ART = { crops: "🌾", vegetables: "🥬", fruits: "🍎" };
/** Set when setup finishes; the app then shows the "best rotation for your farm" card once. */
export const ROTATION_WELCOME_KEY = "kisan-rotation-welcome";

function Question({ title, hint, required, children }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">{title}{required && <Required />}</legend>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

const chip = (on) =>
  cn(
    "rounded-full border px-3.5 py-1.5 text-sm transition-all focus-ring active:scale-95",
    on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground/30 hover:bg-secondary/60"
  );

export default function Onboarding() {
  const navigate = useNavigate();
  const { t, lang } = useT();
  const { updateUser, logout } = useAuth();
  const { data: profile } = useProfile();
  const { data: fields } = useFields();
  const fieldOps = useEntityMutations("Field", "fields");
  const saveSettings = useUpdateSettings();
  const save = useUpdateProfile();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(null);
  const [soilTouched, setSoilTouched] = useState(false);
  const set = useCallback((patch) => setForm((prev) => ({ ...(prev || profile), ...patch })), [profile]);
  const f = form || profile;
  const country = f?.country === "US" ? "US" : "PK";
  const groups = cropGroupsFor(country);

  // Fill in the usual soil for the farmer's district, until they choose one themselves.
  // US farms: the USDA soil survey at the farm point names the soil (e.g. "Webster clay loam").
  const { data: usSurvey } = useQuery({
    queryKey: ["soil-survey", "US", f?.lat ?? null, f?.lng ?? null],
    queryFn: () => kisan.services.getSoilSurvey({ country: "US", lat: f.lat, lng: f.lng }),
    enabled: country === "US" && Number.isFinite(f?.lat) && Number.isFinite(f?.lng),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const usual = country === "PK" ? usualSoil(f?.district) : usualSoilUS(usSurvey);
  useEffect(() => {
    if (f && usual && !soilTouched && f.soil_type !== usual.soil) set({ soil_type: usual.soil });
  }, [f, usual, soilTouched, set]);

  if (!f) return <div className="min-h-screen bg-background" />;

  // Farmers set up before this question existed: work it out from their crops. New farmers start on "Crops".
  const saved = f.grow_types?.length ? f.grow_types : Object.keys(groups).filter((g) => (f.current_crops || []).some((c) => groups[g].includes(c)));
  const growTypes = saved.length ? saved : ["crops"];
  const cropOptions = growTypes.flatMap((g) => groups[g] || []);
  const soilName = (id) => (lang === "en" ? id : SOIL_OPTIONS.find((o) => o.id === id)?.ur || id);

  // Acres under each crop now. Crops grow side by side on different plots, so we ask, never split the land evenly.
  // With one crop, it starts as the whole farm.
  const land = Number(f.land_acres) || 0;
  const acresOf = (c) => {
    const v = f.crop_acres?.[c];
    if (v != null && v !== "") return v;
    return (f.current_crops || []).length === 1 ? land : "";
  };
  const setAcres = (c, v) => set({ crop_acres: { ...(f.crop_acres || {}), [c]: v } });
  const usedAcres = (f.current_crops || []).reduce((sum, c) => sum + (Number(acresOf(c)) || 0), 0);

  const blocker = {
    you: !String(f.display_name || "").trim() && t("Add your name to continue."),
    place: !(f.district && Number.isFinite(f.lat)) && (country === "US" ? t("Search for your nearest town to continue.") : t("Pick your district to continue.")),
    land: !(Number(f.land_acres) > 0)
      ? t("Add how many acres you farm.")
      : !(f.irrigation_methods || []).length && t("Pick at least one water source."),
    crops: !(f.current_crops || []).length
      ? t("Pick what's in your fields now.")
      : (f.current_crops || []).some((c) => !(Number(acresOf(c)) > 0)) && t("Add the acres for each crop."),
    goals: !(f.goals || []).length && t("Pick at least one goal."),
  }[STEPS[step].key];

  const last = step === STEPS.length - 1;

  const finish = async () => {
    const { user_id: _id, email: _email, ...patch } = deriveFarmFields({ ...f, grow_types: growTypes });
    await save.mutateAsync({
      ...patch,
      crop_acres: Object.fromEntries((f.current_crops || []).map((c) => [c, Number(acresOf(c)) || 0])),
      country,
      display_name: String(f.display_name || "").trim().replace(/\s+/g, " "),
      land_acres: Number(f.land_acres) || 0,
      preferred_language: lang,
      language: lang,
      farm_setup_at: new Date().toISOString(),
    });
    // One field per crop in the ground, so the dashboard has something real to show. The farmer adds sowing dates there.
    // Each crop gets its own field with the acres the farmer gave for it.
    const crops = f.current_crops || [];
    if (!(fields || []).length && crops.length) {
      for (const crop of crops) {
        const acres = Math.round((Number(acresOf(crop)) || 0) * 10) / 10;
        await fieldOps.create.mutateAsync({ name: `${crop} field`, crop, acres, sown: "", variety: "", soil_type: f.soil_type || "" });
      }
    }
    if (country === "US") saveSettings.mutate({ temp_unit: "f" });
    try {
      sessionStorage.setItem(ROTATION_WELCOME_KEY, "1");
    } catch {
      /* private mode: the card is simply skipped */
    }
    updateUser({ onboarded: true });
    navigate("/dashboard", { replace: true });
  };

  const next = () => {
    if (blocker) return;
    if (last) finish();
    else {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
    }
  };

  const toggleGrow = (id) => {
    const nextTypes = growTypes.includes(id) ? growTypes.filter((x) => x !== id) : [...growTypes, id];
    if (!nextTypes.length) return; // always keep one group open
    const allowed = new Set(nextTypes.flatMap((g) => groups[g] || []));
    set({
      grow_types: nextTypes,
      current_crops: (f.current_crops || []).filter((c) => allowed.has(c)),
      previous_crops: (f.previous_crops || []).filter((c) => allowed.has(c)),
    });
  };

  const s = STEPS[step];
  const answered = [f.display_name, f.district, Number(f.land_acres) > 0, (f.current_crops || []).length, (f.goals || []).length].filter(Boolean).length;

  return (
    // In Urdu and Punjabi the page is right-to-left, so the farm card sits on the right.
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(340px,420px)_1fr]" data-testid="onboarding">
      {/* The farm card fills in as the farmer answers. */}
      <aside className="kisan-hero m-3 hidden flex-col rounded-[22px] p-8 lg:sticky lg:top-3 lg:flex lg:h-[calc(100vh-1.5rem)]" data-testid="farm-card">
        <div className="relative flex items-center gap-3">
          <BrandMark />
          <p className="font-display text-xl text-white">{t("Kisan AI")}</p>
        </div>
        <div className="relative mt-auto">
          <p className="text-sm text-white/60">{t("Your farm")}</p>
          <p className="mt-1 truncate font-display text-3xl text-white" dir="auto">
            {String(f.display_name || "").trim() || t("Kisan")}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-harvest transition-all duration-500" style={{ width: `${(answered / 5) * 100}%` }} />
            </div>
            <span className="text-xs tabular-nums text-white/70">{answered}/5</span>
          </div>
          <div className="mt-6">
            <CropYearStrip rotation={f.rotation} currentCrops={f.current_crops} previousCrops={f.previous_crops} tone="hero" />
          </div>
          <div className="mt-6 text-white">
            <FarmFacts profile={f} tone="hero" />
          </div>
          <p className="mt-6 text-xs leading-relaxed text-white/50">
            {t("Kisan AI uses these answers in every reply, so its advice fits your land, water and season. You can change them later under My farm.")}
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-4 px-4 pt-4 sm:px-8 lg:px-12 lg:pt-8">
          <div className="flex items-center gap-2 lg:hidden">
            <BrandMark className="h-8 w-8" />
            <span className="font-display text-base">{t("Kisan AI")}</span>
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">{t("Farm setup")}</p>
          <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground focus-ring">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> {t("Sign out")}
          </button>
        </header>

        <div className="flex-1 px-4 pb-32 pt-6 sm:px-8 lg:px-12 lg:pt-10">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center gap-3">
              <p className="text-xs font-medium text-muted-foreground">{t("Step {n} of {total}", { n: step + 1, total: STEPS.length })}</p>
              <ol className="flex flex-1 gap-1.5" aria-label={t("Progress")}>
                {STEPS.map((x, i) => (
                  <li key={x.key} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-500", i <= step ? "bg-primary" : "bg-muted")}>
                    <span className="sr-only">{t(x.title)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div key={step} className="rise-in">
              <h1 className="mt-6 font-display text-3xl leading-tight sm:text-4xl">{t(s.title)}</h1>
              <p className="mt-2 text-xs text-muted-foreground">
                <Required /> {t("marks a question you must answer.")}
              </p>

              <div className="mt-7 space-y-8">
                {s.key === "you" && (
                  <FormField
                    label={t("Your name")}
                    required
                    value={f.display_name || ""}
                    onChange={(e) => set({ display_name: e.target.value })}
                    placeholder={t("e.g. Muhammad Aslam")}
                    autoComplete="name"
                    dir="auto"
                    maxLength={60}
                    hint={t("Shown on your dashboard. You can change it later.")}
                  />
                )}

                {s.key === "place" && (
                  <div className="space-y-5">
                    <p className="text-sm text-muted-foreground">{t("Kisan AI uses your location for local weather, NASA climate history, soil and sowing dates.")}</p>
                    <LocationPicker value={f} onChange={set} />
                    <FormField
                      label={country === "US" ? t("Farm name or road (optional)") : t("Village or chak (optional)")}
                      value={f.village || ""}
                      onChange={(e) => set({ village: e.target.value })}
                      placeholder={country === "US" ? t("e.g. Miller Farm, County Road 12") : t("e.g. Chak 208 RB")}
                      dir="auto"
                    />
                  </div>
                )}

                {s.key === "land" && (
                  <>
                    <Question required title={t("How many acres do you farm?")} hint={country === "US" ? t("Owned and rented together.") : t("Owned and rented together. 1 acre = 8 kanal.")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          inputMode="decimal"
                          aria-label={t("Acres")}
                          className={cn(inputClass, "w-32 text-lg font-semibold")}
                          value={Number(f.land_acres) > 0 ? f.land_acres : ""}
                          placeholder="0"
                          onChange={(e) => set({ land_acres: e.target.value === "" ? 0 : Number(e.target.value) })}
                        />
                        <span className="me-2 text-sm text-muted-foreground">{t("acres")}</span>
                        {ACRE_PRESETS[country].map((a) => (
                          <button key={a} type="button" onClick={() => set({ land_acres: a })} className={cn(chip(Number(f.land_acres) === a), "tabular-nums")}>
                            {a}
                          </button>
                        ))}
                      </div>
                    </Question>
                    <Question required title={t("Where does your water come from?")} hint={t("Pick all that apply.")}>
                      <IrrigationPicker value={f.irrigation_methods || []} onChange={(v) => set({ irrigation_methods: v })} />
                    </Question>
                    <Question title={t("Soil type")}>
                      {usual && (
                        <p className="flex items-start gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          <span>
                            {usual.area
                              ? t("Usual soil in {district} ({area}): {soil}. We've selected it for you; change it if your field is different.", { district: f.district, area: t(usual.area), soil: soilName(usual.soil) })
                              : t("Usual soil in {district}: {soil}. We've selected it for you; change it if your field is different.", { district: f.district, soil: soilName(usual.soil) })}
                          </span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {SOIL_OPTIONS.map((o) => {
                          const on = f.soil_type === o.id;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => {
                                setSoilTouched(true);
                                set({ soil_type: on ? "" : o.id });
                              }}
                              className={cn(chip(on), "inline-flex items-center gap-1.5")}
                              data-testid={`soil-${o.id}`}
                            >
                              {usual?.soil === o.id && <MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
                              {lang === "en" ? (country === "US" ? o.id.replace(" / kallar", "") : o.id) : o.ur}
                              {usual?.soil === o.id && (
                                <span className={cn("rounded-full px-1.5 text-[10px] font-semibold", on ? "bg-primary-foreground/20" : "bg-primary/15 text-primary")}>{t("Usual in your area")}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {country === "US"
                          ? t("Kisan AI also looks up the USDA soil survey for your location. A soil test tells you exactly.")
                          : t("A general guide for your area. A soil test tells you exactly.")}
                      </p>
                    </Question>
                  </>
                )}

                {s.key === "crops" && (
                  <>
                    <Question title={t("Show me")} hint={t("Tap to add or remove a group.")}>
                      <div className="grid grid-cols-3 gap-2.5">
                        {GROW_TYPES.map((g) => {
                          const on = growTypes.includes(g.id);
                          const picked = (f.current_crops || []).filter((c) => groups[g.id].includes(c)).length;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleGrow(g.id)}
                              className={cn(
                                "relative flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 transition-all focus-ring active:scale-95",
                                on ? "border-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary))]" : "border-border opacity-70 hover:opacity-100"
                              )}
                            >
                              <span className="text-3xl leading-none" aria-hidden="true">{GROW_ART[g.id]}</span>
                              <span className="text-sm font-semibold">{lang === "en" ? g.en : g[lang]}</span>
                              <span className="text-[11px] text-muted-foreground">{t("{n} to choose from", { n: groups[g.id].length })}</span>
                              {on && <Check className="absolute end-2 top-2 h-4 w-4 text-primary" aria-hidden="true" />}
                              {picked > 0 && <span className="absolute start-2 top-2 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{picked}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </Question>
                    <Question required title={t("What is in your fields right now?")} hint={t("Pick up to {n}.", { n: MAX_CROP_PICKS })}>
                      <CropChips label={t("Crops in the field now")} options={cropOptions} max={MAX_CROP_PICKS} value={f.current_crops || []} onChange={(v) => set({ current_crops: v })} />
                    </Question>
                    {(f.current_crops || []).length > 0 && (
                      <Question
                        required
                        title={t("How many acres is each crop on?")}
                        hint={t("Most farms grow crops side by side on different plots. Enter the acres for each crop now.")}
                      >
                        <ul className="divide-y rounded-2xl border [border-color:var(--card-line)]" data-testid="crop-acres">
                          {(f.current_crops || []).map((c) => (
                            <li key={c} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                              <span className="min-w-[6rem] flex-1 text-sm font-medium">{cropLabel(c, lang)}</span>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                inputMode="decimal"
                                aria-label={t("Acres of {crop}", { crop: cropLabel(c, lang) })}
                                className={cn(inputClass, "w-24 text-end tabular-nums")}
                                value={acresOf(c)}
                                placeholder="0"
                                onChange={(e) => setAcres(c, e.target.value === "" ? "" : Number(e.target.value))}
                              />
                              <span className="text-xs text-muted-foreground">{t("acres")}</span>
                              {land > 0 && (
                                <span className="flex gap-1">
                                  {[0.25, 0.5, 1].map((share) => {
                                    const v = Math.round(land * share * 10) / 10;
                                    return (
                                      <button key={share} type="button" onClick={() => setAcres(c, v)} className={cn(chip(Number(acresOf(c)) === v), "px-2.5 py-1 text-xs")}>
                                        {share === 1 ? t("All") : share === 0.5 ? "½" : "¼"}
                                      </button>
                                    );
                                  })}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                        {land > 0 && (
                          <p className={cn("text-xs", usedAcres > land ? "text-highlight" : "text-muted-foreground")} aria-live="polite">
                            {usedAcres > land
                              ? t("{used} of {land} acres. That's more than your land: fine if two crops share a field (intercropping); otherwise check the numbers.", { used: Math.round(usedAcres * 10) / 10, land })
                              : t("{used} of {land} acres under crops now. The rest counts as empty or resting land.", { used: Math.round(usedAcres * 10) / 10, land })}
                          </p>
                        )}
                      </Question>
                    )}
                    <Question title={t("How often does the crop on a field change?")} hint={t("Helps Kisan AI plan your rotation at the right pace.")}>
                      <div className="flex flex-wrap gap-2" data-testid="crop-cycle">
                        {CROP_CYCLE_OPTIONS.map((o) => (
                          <button key={o.id} type="button" aria-pressed={f.crop_cycle === o.id} onClick={() => set({ crop_cycle: f.crop_cycle === o.id ? "" : o.id })} className={chip(f.crop_cycle === o.id)}>
                            {lang === "en" ? o.en : o.ur}
                          </button>
                        ))}
                      </div>
                    </Question>
                    <Question title={t("What did you grow last season?")} hint={t("Pick up to {n}. Helps Kisan AI plan around soil, pests and leftover fertilizer.", { n: MAX_CROP_PICKS })}>
                      <CropChips label={t("Crops last season")} options={cropOptions} max={MAX_CROP_PICKS} value={f.previous_crops || []} onChange={(v) => set({ previous_crops: v })} />
                    </Question>
                    <div className="kisan-card p-4">
                      <p className="kisan-label mb-3">{t("Your crop year so far")}</p>
                      <CropYearStrip rotation={f.rotation} currentCrops={f.current_crops} previousCrops={f.previous_crops} />
                    </div>
                  </>
                )}

                {s.key === "goals" && (
                  <>
                    <Question required title={t("Pick up to 3 goals")} hint={t("Kisan AI ranks crop rotations by these, so pick what matters most.")}>
                      <GoalPicker value={f.goals || []} onChange={(v) => set({ goals: v })} />
                    </Question>
                    <FormField label={t("Anything specific? (optional)")}>
                      <textarea
                        className={cn(inputClass, "min-h-[84px] resize-y")}
                        value={f.goal_note || ""}
                        onChange={(e) => set({ goal_note: e.target.value })}
                        placeholder={country === "US" ? t("e.g. Cut nitrogen cost on 160 acres of corn") : t("e.g. Get 50 maunds of wheat per acre")}
                        dir="auto"
                        maxLength={240}
                      />
                    </FormField>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="sticky bottom-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="kisan-btn-ghost focus-ring" aria-label={t("Back")}>
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> <span className="hidden sm:inline">{t("Back")}</span>
              </button>
            )}
            <p className="flex-1 text-xs text-muted-foreground" aria-live="polite">{blocker || ""}</p>
            <button onClick={next} disabled={Boolean(blocker) || save.isPending} className="kisan-btn-primary focus-ring" data-testid="setup-next">
              {last ? (save.isPending ? t("Saving…") : t("Save and see my best rotation")) : t("Continue")}
              {!last && <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
