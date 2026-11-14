import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AtSign, ChevronRight, Plus } from "lucide-react";
import { useT } from "@/i18n";
import { cropLabel } from "@/lib/cropNames";
import { estimateStage } from "@/lib/fieldStage";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import FormField, { PrimaryButton, inputClass } from "@/components/FormField";
import { MAX_CROP_PICKS, SOIL_OPTIONS } from "@/data/fixtures";
import { CropChips, GoalPicker, IrrigationPicker } from "@/components/FarmChoices";
import { deriveFarmFields } from "@/lib/farmSetup";
import LocationPicker from "@/components/LocationPicker";
import { useFields, useProfile, useUpdateProfile } from "@/hooks/useKisanData";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/AuthContext";
import { FALLBACK_NAME, initialsOf } from "@/lib/profile";

// Fields the farmer edits here. Identity (user_id, email) is owned by the account.
const EDITABLE = ["display_name", "phone", "village", "preferred_language", "land_acres", "irrigation", "irrigation_methods", "soil_type", "crops",
  "current_crops", "previous_crops", "rotation", "rotation_note", "goals", "goal_note",
  "province", "province_id", "division", "division_id", "district", "district_id", "tehsil", "lat", "lng"];

export default function Profile() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: fields = [] } = useFields();
  const save = useUpdateProfile();
  const { t, lang } = useT();
  const [form, setForm] = useState(null);
  useEffect(() => { if (profile && !form) setForm(profile); }, [profile, form]);
  const merge = useCallback((patch) => setForm((prev) => ({ ...prev, ...patch })), []);
  if (!form) return <div className="kisan-card h-96 animate-pulse" />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const derived = deriveFarmFields(form);
    const patch = Object.fromEntries(EDITABLE.filter((k) => k in derived).map((k) => [k, derived[k]]));
    patch.display_name = String(form.display_name || "").trim().replace(/\s+/g, " ");
    patch.land_acres = Number(form.land_acres) || 0;
    const saved = await save.mutateAsync(patch);
    setForm(saved);
    toast.success(t("Farm profile saved"));
  };
  const previewName = String(form.display_name || "").trim();


  return (
    <>
      <PageHeader eyebrow={t("My farm")} title={t("Farmer profile")} description={t("Kisan AI uses these details to tailor advice to your land, crops and district.")} />
      <section className="kisan-hero rise-in mb-6 flex flex-wrap items-center gap-4 p-5 sm:p-6" aria-label={t("Account")}>
        <Avatar profile={{ display_name: previewName }} className="relative h-14 w-14 text-lg" />
        <div className="relative min-w-0 flex-1">
          <p className="truncate font-display text-2xl" dir="auto" data-testid="profile-name">{previewName || FALLBACK_NAME}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-white/70" data-testid="profile-email">
            <AtSign className="h-3.5 w-3.5 text-harvest" aria-hidden="true" />
            {user?.email || profile.email}
          </p>
        </div>
        <dl className="relative grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-white/60">
          <dt>{t("Initials")}</dt>
          <dd className="font-semibold text-white" data-testid="profile-initials">{initialsOf(previewName)}</dd>
        </dl>
      </section>
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={submit} className="kisan-card space-y-4 p-6 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("Display name")}
              value={form.display_name || ""}
              onChange={set("display_name")}
              placeholder={t("e.g. Muhammad Aslam")}
              autoComplete="name"
              dir="auto"
              maxLength={60}
              hint={t("Shown on your dashboard and used by Kisan AI.")}
              data-testid="display-name-input"
            />
            <FormField label={t("Email (sign-in)")} value={user?.email || profile.email || ""} readOnly disabled hint={t("Your account identifier. Changing your name never changes it.")} />
            <FormField label={t("Phone")} value={form.phone || ""} onChange={set("phone")} />
            <LocationPicker value={form} onChange={merge} className="sm:col-span-2" />
            <FormField label={t("Village / Chak")} value={form.village} onChange={set("village")} />
            <FormField label={t("Total land (acres)")} type="number" step="0.5" value={form.land_acres} onChange={set("land_acres")} />
            <FormField label={t("Soil type")}>
              <select className={inputClass} value={form.soil_type || ""} onChange={set("soil_type")}>
                <option value="">{t("Not set")}</option>
                {SOIL_OPTIONS.map((o) => <option key={o.id} value={o.id}>{lang === "en" ? o.id : o.ur}</option>)}
              </select>
            </FormField>
          </div>
          <div className="space-y-2">
            <span className="block text-sm font-medium">{t("Water sources")}</span>
            <IrrigationPicker value={form.irrigation_methods || []} onChange={(v) => merge({ irrigation_methods: v })} />
          </div>
          <div className="space-y-2">
            <span className="block text-sm font-medium">{t("In your fields now")}</span>
            <CropChips label="Crops in the field now" max={MAX_CROP_PICKS} value={form.current_crops || []} onChange={(v) => merge({ current_crops: v })} />
          </div>
          <div className="space-y-2">
            <span className="block text-sm font-medium">{t("Last season")}</span>
            <CropChips label="Crops last season" max={MAX_CROP_PICKS} value={form.previous_crops || []} onChange={(v) => merge({ previous_crops: v })} />
          </div>
          <div className="space-y-2">
            <span className="block text-sm font-medium">{t("Goals this season (up to 3)")}</span>
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
