import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessagesSquare, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import FormField, { PrimaryButton, inputClass } from "@/components/FormField";
import { IrrigationPicker } from "@/components/FarmChoices";
import { cropGroupsFor, GROW_TYPES, IRRIGATION_OPTIONS, SOIL_OPTIONS, TYPICAL_YIELD } from "@/data/fixtures";
import { useEntityMutations, useFields, useProfile } from "@/hooks/useKisanData";
import { useT } from "@/i18n";
import { cropLabel } from "@/lib/cropNames";
import { estimateStage } from "@/lib/fieldStage";
import { cn } from "@/lib/utils";
import { usualSoil } from "@/lib/soil";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * One field ("farm") of the farmer: /fields/:id shows it, /fields/new adds one.
 * The form collects what Kisan AI needs (crop, area, sowing date, water, soil),
 * saves it, and the field then has its own page. Every saved field is sent to
 * Kisan AI with each question, so advice can name the field.
 */
export default function FieldPage() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { t, lang } = useT();
  const { data: fields } = useFields();
  const { data: profile } = useProfile();
  const GROUPS = cropGroupsFor(profile?.country);
  const ops = useEntityMutations("Field", "fields");
  const field = useMemo(() => (fields || []).find((f) => f.id === id), [fields, id]);
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState(null);
  const usual = profile?.country === "US" ? null : usualSoil(profile?.district)?.soil;

  useEffect(() => {
    if (form) return;
    if (isNew && profile)
      setForm({
        name: "",
        group: "crops",
        crop: profile.current_crops?.[0] || "Wheat",
        variety: "",
        acres: "",
        sown: today(),
        irrigation_methods: profile.irrigation_methods || [],
        soil_type: profile.soil_type || usual || "",
        notes: "",
      });
    // A field without its own soil type starts from the farm's soil (or the usual soil for the district).
    else if (field) setForm({ group: Object.keys(GROUPS).find((g) => GROUPS[g].includes(field.crop)) || "crops", ...field, soil_type: field.soil_type || profile?.soil_type || usual || "" });
  }, [isNew, profile, field, form]);

  if (!fields || !form) {
    if (fields && !isNew && !field)
      return (
        <div className="kisan-card p-6">
          <p>{t("This field was not found.")}</p>
          <Link to="/profile" className="mt-3 inline-block text-primary underline">{t("Back to My farm")}</Link>
        </div>
      );
    return <div className="kisan-card h-96 animate-pulse" />;
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const missing = !String(form.name || "").trim() ? t("Give the field a name.") : !(Number(form.acres) > 0) ? t("Add the area in acres.") : null;

  const save = async (e) => {
    e.preventDefault();
    if (missing) return;
    const { group: _g, id: _id, ...rest } = form;
    const data = { ...rest, name: String(form.name).trim(), acres: Number(form.acres), stage: estimateStage(form)?.stage || null };
    if (isNew) {
      const row = await ops.create.mutateAsync({ ...data, health: null });
      toast.success(t("Field saved"));
      navigate(`/fields/${row.id}`, { replace: true });
      setEditing(false);
    } else {
      await ops.update.mutateAsync({ id: field.id, ...data });
      toast.success(t("Field saved"));
      setEditing(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t("Delete this field?"))) return;
    await ops.remove.mutateAsync(field.id);
    toast.success(t("Field deleted"));
    navigate("/profile");
  };

  const back = (
    <Link to="/profile" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("My farm")}
    </Link>
  );

  if (editing)
    return (
      <div className="max-w-2xl">
        {back}
        <h1 className="font-display text-3xl">{isNew ? t("Add a field") : t("Edit field")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("Kisan AI uses these details when it answers questions about this field.")}</p>
        <form onSubmit={save} className="kisan-card mt-6 space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("Field name")} value={form.name} onChange={set("name")} placeholder={t("e.g. North block")} dir="auto" maxLength={50} />
            <FormField label={t("Area (acres)")} type="number" min="0" step="0.5" value={form.acres} onChange={set("acres")} />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">{t("What grows here?")}</legend>
            <div className="mt-2 flex flex-wrap gap-2" role="group">
              {GROW_TYPES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={form.group === g.id}
                  onClick={() => setForm({ ...form, group: g.id, crop: GROUPS[g.id][0] })}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm focus-ring", form.group === g.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary")}
                >
                  {lang === "en" ? g.en : g[lang]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("Crop")}>
              <select className={inputClass} value={form.crop} onChange={set("crop")}>
                {GROUPS[form.group].map((c) => <option key={c} value={c}>{cropLabel(c, lang)}</option>)}
              </select>
            </FormField>
            <FormField label={t("Variety (optional)")} value={form.variety || ""} onChange={set("variety")} placeholder={t("e.g. Akbar-2019")} dir="auto" />
            <FormField label={t("Sowing or planting date")} type="date" value={form.sown || ""} onChange={set("sown")} />
            <FormField label={t("Soil type")}>
              <select className={inputClass} value={form.soil_type || ""} onChange={set("soil_type")}>
                <option value="">{t("Not set")}</option>
                {SOIL_OPTIONS.map((o) => <option key={o.id} value={o.id}>{lang === "en" ? o.id : o.ur}{o.id === usual ? ` · ${t("Usual in your area")}` : ""}</option>)}
              </select>
            </FormField>
          </div>
          <div>
            <span className="block text-sm font-medium">{t("Water for this field")}</span>
            <div className="mt-2">
              <IrrigationPicker value={form.irrigation_methods || []} onChange={(v) => setForm({ ...form, irrigation_methods: v })} />
            </div>
          </div>
          <FormField label={t("Notes (optional)")}>
            <textarea className={cn(inputClass, "min-h-[80px]")} value={form.notes || ""} onChange={set("notes")} dir="auto" maxLength={300} placeholder={t("e.g. Low patch floods after rain")} />
          </FormField>
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton className="sm:w-auto sm:px-6" disabled={!!missing || ops.create.isPending || ops.update.isPending}>
              {t("Save field")}
            </PrimaryButton>
            {!isNew && (
              <button type="button" onClick={() => setEditing(false)} className="kisan-btn-ghost focus-ring">{t("Cancel")}</button>
            )}
            {missing && <span className="text-xs text-muted-foreground">{missing}</span>}
          </div>
        </form>
      </div>
    );

  // View
  const est = estimateStage(field);
  const yieldEst = TYPICAL_YIELD[field.crop] ? Math.round(Number(field.acres) * TYPICAL_YIELD[field.crop]) : null;
  const water = (field.irrigation_methods || []).map((w) => IRRIGATION_OPTIONS.find((o) => o.id === w)).filter(Boolean).map((o) => (lang === "en" ? o.en : o.ur));
  const question = t("Give me advice for my field \"{name}\": {crop}, {acres} acres, sown on {sown}.", { name: field.name, crop: cropLabel(field.crop, lang), acres: field.acres, sown: field.sown || "?" });
  const row = (label, value) => (
    <div className="flex items-baseline justify-between gap-4 border-b py-3 last:border-0 [border-color:hsl(var(--edge))]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-end text-sm font-medium" dir="auto">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="max-w-3xl">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl" dir="auto">{t(field.name)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{cropLabel(field.crop, lang)}{field.variety && field.variety !== "—" ? `, ${field.variety}` : ""} · {t("{n} acres", { n: field.acres })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="kisan-btn-ghost focus-ring"><PencilLine className="h-4 w-4" /> {t("Edit")}</button>
          <button onClick={remove} className="kisan-btn-ghost text-alert focus-ring" aria-label={t("Delete field")}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="kisan-card p-5">
          <h2 className="kisan-label">{t("Details")}</h2>
          <dl className="mt-2">
            {row(t("Crop"), cropLabel(field.crop, lang))}
            {row(t("Area"), t("{n} acres", { n: field.acres }))}
            {row(t("Sowing or planting date"), field.sown)}
            {row(t("Water"), water.join(lang === "en" ? ", " : "، "))}
            {(() => {
              const soil = field.soil_type || profile?.soil_type || usual;
              return row(t("Soil type"), soil ? (lang === "en" ? soil : SOIL_OPTIONS.find((o) => o.id === soil)?.ur) : null);
            })()}
            {field.notes && row(t("Notes"), field.notes)}
          </dl>
        </section>
        <section className="kisan-card p-5">
          <h2 className="kisan-label">{t("Estimates")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("Worked out from the sowing date and typical yields in Pakistan, not measured.")}</p>
          <dl className="mt-2">
            {row(t("Estimated stage"), est ? `${t(est.stage)}${est.day != null && est.day >= 0 ? ` (${t("day {d} of about {n}", { d: est.day, n: est.of })})` : ""}` : null)}
            {row(t("Estimated harvest"), yieldEst ? `${t("{n} maunds", { n: yieldEst.toLocaleString("en-PK") })} \u2068(${((yieldEst * 40) / 1000).toFixed(1)} t)\u2069` : null)}
          </dl>
          <Link to={`/?q=${encodeURIComponent(question)}`} className="kisan-btn-primary mt-5 w-full focus-ring">
            <MessagesSquare className="h-4 w-4" /> {t("Ask Kisan AI about this field")}
          </Link>
        </section>
      </div>
    </div>
  );
}
