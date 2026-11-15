import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import { useT } from "@/i18n";
import { cropLabel } from "@/lib/cropNames";
import { estimateStage } from "@/lib/fieldStage";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import FormField, { PrimaryButton, inputClass } from "@/components/FormField";
import { cropGroupsFor, MAX_CROP_PICKS, SOIL_OPTIONS } from "@/data/fixtures";
import { CropChips, GoalPicker, IrrigationPicker } from "@/components/FarmChoices";
import { deriveFarmFields } from "@/lib/farmSetup";
import { usualSoil } from "@/lib/soil";
import LocationPicker from "@/components/LocationPicker";
import { useFields, useProfile, useUpdateProfile } from "@/hooks/useKisanData";

// Farm details the farmer edits here. Name, email and phone are account details: they live in Settings → Account.
// A country switch on this page is saved at once, so the dashboard, rotation planner, map and
// Kisan AI all follow it. Each country keeps its own place and crops (profile.by_country), so
// switching back restores them; the first switch starts from a typical farm the farmer can change.
const COUNTRY_KEYS = ["province", "province_id", "division", "division_id", "district", "district_id", "tehsil", "lat", "lng", "village",
  "current_crops", "previous_crops", "grow_types", "rotation", "crops", "soil_type", "planned_rotation", "planned_rotation_title"];
const COUNTRY_START = {
  PK: { province: "Punjab", province_id: "punjab", division: "Faisalabad", division_id: "punjab:faisalabad", district: "Faisalabad", district_id: "punjab/faisalabad", tehsil: null, lat: 31.4504, lng: 73.135,
    village: "", current_crops: ["Wheat"], previous_crops: ["Cotton"], grow_types: [], rotation: "", crops: ["Wheat", "Cotton"], soil_type: "Loam", planned_rotation: "", planned_rotation_title: "" },
  US: { province: "Iowa", province_id: null, division: null, division_id: null, district: "Story County", district_id: null, tehsil: "Ames", lat: 42.0347, lng: -93.6199,
    village: "", current_crops: ["Corn"], previous_crops: ["Soybean"], grow_types: [], rotation: "", crops: ["Corn", "Soybean"], soil_type: "Loam", planned_rotation: "", planned_rotation_title: "" },
};

const EDITABLE = ["country", "farm_name", "village", "preferred_language", "land_acres", "irrigation", "irrigation_methods", "soil_type", "crops",
  "current_crops", "previous_crops", "rotation", "rotation_note", "goals", "goal_note",
  "province", "province_id", "division", "division_id", "district", "district_id", "tehsil", "lat", "lng"];

export default function Profile() {
  const { data: profile } = useProfile();
  const { data: fields = [] } = useFields();
  const save = useUpdateProfile();
  const { t, lang } = useT();
  const [form, setForm] = useState(null);
  useEffect(() => { if (profile && !form) setForm(profile); }, [profile, form]);
  const merge = useCallback((patch) => setForm((prev) => ({ ...prev, ...patch })), []);
  if (!form) return <div className="kisan-card h-96 animate-pulse" />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Crop choices follow the country (corn and soybean for US farms, not cotton and sugarcane).
  const cropOptions = Object.values(cropGroupsFor(form.country)).flat();

  const switchCountry = async (id) => {
    const from = form.country === "US" ? "US" : "PK";
    const stash = { ...(form.by_country || {}), [from]: Object.fromEntries(COUNTRY_KEYS.map((k) => [k, form[k] ?? null])) };
    const saved = await save.mutateAsync({ ...(stash[id] || COUNTRY_START[id]), country: id, by_country: stash });
    setForm(saved);
    const place = [saved.tehsil, saved.district, saved.province].filter(Boolean).join(", ");
    toast.success(t("Country changed to {country}. The whole app now uses {place}. Set your own place and crops below.", { country: id === "US" ? t("United States") : t("Pakistan"), place }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const derived = deriveFarmFields(form);
    const patch = Object.fromEntries(EDITABLE.filter((k) => k in derived).map((k) => [k, derived[k]]));
    patch.farm_name = String(form.farm_name || "").trim().replace(/\s+/g, " ");
    patch.land_acres = Number(form.land_acres) || 0;
    const saved = await save.mutateAsync(patch);
    setForm(saved);
    toast.success(t("Farm profile saved"));
  };


  return (
    <>
      <PageHeader eyebrow={t("My farm")} title={t("Your farm")} description={t("Kisan AI uses these details to tailor advice to your land, crops and district. Your name, email and phone are in Settings.")} />
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={submit} className="kisan-card space-y-8 p-6 sm:p-8 lg:col-span-3">
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold">{t("Farm and location")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("Farm name")}
              value={form.farm_name || ""}
              onChange={set("farm_name")}
              placeholder={t("e.g. Aslam Farm")}
              dir="auto"
              maxLength={60}
              className="sm:col-span-2"
              data-testid="farm-name-input"
            />
            <LocationPicker value={form} onChange={merge} onCountryChange={switchCountry} className="sm:col-span-2" />
            <FormField label={t("Village / Chak")} value={form.village} onChange={set("village")} />
            <FormField label={t("Total land (acres)")} type="number" step="0.5" value={form.land_acres} onChange={set("land_acres")} />
            <FormField label={t("Soil type")}>
              <select className={inputClass} value={form.soil_type || ""} onChange={set("soil_type")}>
                <option value="">{t("Not set")}</option>
                {SOIL_OPTIONS.map((o) => <option key={o.id} value={o.id}>{lang === "en" ? o.id : o.ur}{form.country !== "US" && o.id === usualSoil(form.district)?.soil ? ` · ${t("Usual in your area")}` : ""}</option>)}
              </select>
            </FormField>
          </div>
          </fieldset>
          <fieldset className="space-y-2 border-t pt-6 [border-color:var(--card-line)]">
            <legend className="sr-only">{t("Water sources")}</legend>
            <span className="block text-base font-semibold">{t("Water sources")}</span>
            <IrrigationPicker value={form.irrigation_methods || []} onChange={(v) => merge({ irrigation_methods: v })} />
          </fieldset>
          <fieldset className="space-y-5 border-t pt-6 [border-color:var(--card-line)]">
            <legend className="sr-only">{t("Crops")}</legend>
            <span className="block text-base font-semibold">{t("Crops")}</span>
          <div className="space-y-2">
            <span className="block text-sm font-medium">{t("In your fields now")}</span>
            <CropChips label="Crops in the field now" max={MAX_CROP_PICKS} options={cropOptions} value={form.current_crops || []} onChange={(v) => merge({ current_crops: v })} />
          </div>
          <div className="space-y-2">
            <span className="block text-sm font-medium">{t("Last season")}</span>
            <CropChips label="Crops last season" max={MAX_CROP_PICKS} options={cropOptions} value={form.previous_crops || []} onChange={(v) => merge({ previous_crops: v })} />
          </div>
          </fieldset>
          <div className="space-y-2 border-t pt-6 [border-color:var(--card-line)]">
            <span className="block text-base font-semibold">{t("Goals this season (up to 3)")}</span>
            <GoalPicker value={form.goals || []} onChange={(v) => merge({ goals: v })} />
            <FormField label={t("Anything specific?")} value={form.goal_note || ""} onChange={set("goal_note")} dir="auto" maxLength={240} />
          </div>
          <PrimaryButton className="sm:w-auto sm:px-6" disabled={save.isPending} data-testid="save-profile">{save.isPending ? t("Saving…") : t("Save profile")}</PrimaryButton>
        </form>

        <section className="kisan-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="kisan-label">{t("Your fields")}</h2>
            <Link to="/fields/new" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 focus-ring">
              <Plus className="h-3.5 w-3.5" /> {t("Add field")}
            </Link>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("Open a field to see its details and estimates, edit it, or ask Kisan AI about it.")}</p>
          <ul className="mt-4 space-y-2">
            {fields.map((f) => {
              const est = estimateStage(f);
              return (
                <li key={f.id}>
                  <Link to={`/fields/${f.id}`} className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-primary/50 hover:bg-secondary/40 focus-ring [border-color:hsl(var(--edge))]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" dir="auto">{t(f.name)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {cropLabel(f.crop, lang)}, {t("{n} acres", { n: f.acres })}
                        {est ? `, ${t("est.")} ${t(est.stage)}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
            {fields.length === 0 && (
              <li className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{t("No fields yet.")}</li>
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
