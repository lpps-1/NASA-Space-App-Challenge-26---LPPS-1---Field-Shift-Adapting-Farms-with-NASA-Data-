import { useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ClipboardList, PencilLine, Trash2, X } from "lucide-react";
import { kisan } from "@/api/kisanClient";
import { CropYearStrip } from "@/components/FarmChoices";
import { GOAL_OPTIONS } from "@/data/fixtures";
import { usePlans, useProfile } from "@/hooks/useKisanData";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

const isRtl = (s) => /[؀-ۿ]/.test(s || "");

/**
 * The chat's right panel, like Claude's side panel: the farmer's farm at a glance
 * and the plans they saved from Kisan AI's answers ("Save as plan" under a reply).
 */
export default function PlansPanel({ onClose, className }) {
  const { t, lang } = useT();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: plans = [] } = usePlans();
  const [open, setOpen] = useState(null);
  const sorted = [...plans].sort((a, b) => String(b.created).localeCompare(String(a.created)));
  const goals = (profile?.goals || []).map((id) => GOAL_OPTIONS.find((g) => g.id === id)).filter(Boolean);

  const remove = async (id) => {
    await kisan.entities.Plan.delete(id);
    qc.invalidateQueries({ queryKey: ["plans"] });
    if (open === id) setOpen(null);
  };

  return (
    <aside className={cn("flex flex-col gap-4", className)} aria-label={t("Your plans")}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("Your plans")}</h2>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary focus-ring" aria-label={t("Close")}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {profile && (
        <section className="kisan-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">{t("Your farm")}</p>
            <Link to="/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <PencilLine className="h-3 w-3" /> {t("Edit")}
            </Link>
          </div>
          <div className="mt-3">
            <CropYearStrip rotation={profile.rotation} currentCrops={profile.current_crops} previousCrops={profile.previous_crops} />
          </div>
          {goals.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("Goals")}: {goals.map((g) => (lang === "en" ? g.en : g.ur)).join(lang === "en" ? ", " : "، ")}
            </p>
          )}
        </section>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <ClipboardList className="mb-2 h-5 w-5" aria-hidden="true" />
          {t("No plans yet. Tap \"Save as plan\" under any answer to keep it here.")}
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((p) => {
            const expanded = open === p.id;
            return (
              <li key={p.id} className="kisan-card overflow-hidden">
                <div className="flex items-start gap-1">
                  <button
                    onClick={() => setOpen(expanded ? null : p.id)}
                    className="flex min-w-0 flex-1 items-start gap-2 p-3 text-start focus-ring"
                    aria-expanded={expanded}
                  >
                    <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", !expanded && "-rotate-90 rtl:rotate-90")} />
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm font-medium", isRtl(p.title) && "urdu")} dir="auto">{p.title}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {new Date(p.created).toLocaleDateString(lang === "en" ? "en-GB" : "ur-PK", { day: "numeric", month: "short" })}
                      </span>
                    </span>
                  </button>
                  <button onClick={() => remove(p.id)} className="m-2 rounded-md p-1.5 text-muted-foreground hover:text-alert focus-ring" aria-label={t("Delete plan")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {expanded && (
                  <div dir={isRtl(p.content) ? "rtl" : "ltr"} className={cn("prose-kisan max-h-[50vh] overflow-y-auto border-t px-4 py-3 text-sm [border-color:hsl(var(--edge))]", isRtl(p.content) && "urdu")}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.content}</ReactMarkdown>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
