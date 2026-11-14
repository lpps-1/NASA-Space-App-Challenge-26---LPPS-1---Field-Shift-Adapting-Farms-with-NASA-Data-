import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import FormField, { PrimaryButton, inputClass } from "@/components/FormField";
import { CROP_OPTIONS } from "@/data/fixtures";
import { useEntityMutations, useKnowledge } from "@/hooks/useKisanData";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Crop calendar", "Pest & disease", "Fertilizer", "Crop care", "Market", "Government schemes"];
const EMPTY = { title: "", category: CATEGORIES[0], crops: [], language: "en", status: "draft", body: "" };

export default function KnowledgeAdmin() {
  const { data: articles = [] } = useKnowledge();
  const ops = useEntityMutations("KnowledgeArticle", "knowledge");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(
    () => articles.filter((a) => (a.title + a.body + a.category).toLowerCase().includes(q.toLowerCase())),
    [articles, q]
  );

  const save = async (e) => {
    e.preventDefault();
    const data = { ...editing, updated: new Date().toISOString().slice(0, 10) };
    if (editing.id) await ops.update.mutateAsync(data);
    else await ops.create.mutateAsync(data);
    toast.success(editing.id ? "Article updated" : "Article added");
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Knowledge base"
        description="Verified agronomy content Kisan AI uses to answer farmers."
        action={
          <button onClick={() => setEditing(EMPTY)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground focus-ring">
            <Plus className="h-4 w-4" /> New article
          </button>
        }
      />

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles" className={cn(inputClass, "pl-10")} aria-label="Search articles" />
      </div>

      <div className="kisan-card overflow-hidden">
        <ul className="divide-y divide-border">
          {filtered.map((a) => (
            <li key={a.id}>
              <button onClick={() => setEditing(a)} className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-secondary/50 focus-ring">
                <div className="min-w-0 flex-1">
                  <p dir="auto" className={cn("font-medium", a.language === "ur" && "urdu")}>{a.title}</p>
                  <p dir="auto" className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{a.body}</p>
                  <p className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-full bg-secondary px-2 py-0.5">{a.category}</span>
                    {a.crops.map((c) => <span key={c} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{c}</span>)}
                  </p>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <span className={cn("rounded-full px-2 py-0.5", a.status === "published" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent")}>{a.status}</span>
                  <p className="mt-2">{a.updated}</p>
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted-foreground">No articles match.</li>}
        </ul>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Edit article">
          <form onSubmit={save} className="kisan-card rise-in max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-b-none p-6 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{editing.id ? "Edit article" : "New article"}</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <FormField label="Title" required dir="auto" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Category">
                <select className={inputClass} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Language">
                <select className={inputClass} value={editing.language} onChange={(e) => setEditing({ ...editing, language: e.target.value })}>
                  <option value="en">English</option><option value="ur">Urdu</option><option value="pa">Punjabi</option>
                </select>
              </FormField>
              <FormField label="Status">
                <select className={inputClass} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option value="draft">Draft</option><option value="published">Published</option>
                </select>
              </FormField>
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium">Crops</span>
              <div className="flex flex-wrap gap-1.5">
                {CROP_OPTIONS.map((c) => {
                  const on = editing.crops.includes(c);
                  return (
                    <button key={c} type="button" aria-pressed={on}
                      onClick={() => setEditing({ ...editing, crops: on ? editing.crops.filter((x) => x !== c) : [...editing.crops, c] })}
                      className={on ? "rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground" : "rounded-full border border-border px-2.5 py-1 text-xs hover:bg-secondary"}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            <FormField label="Content">
              <textarea dir="auto" required rows={6} className={inputClass} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            </FormField>
            <div className="flex gap-3">
              {editing.id && (
                <button type="button" onClick={() => { ops.remove.mutate(editing.id); setEditing(null); }} className="rounded-xl border border-destructive/40 px-4 text-sm text-destructive hover:bg-destructive/10">
                  Delete
                </button>
              )}
              <PrimaryButton>Save article</PrimaryButton>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
