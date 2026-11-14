import { Link } from "react-router-dom";
import { ArrowRight, Mic, MessagesSquare } from "lucide-react";
import { detectLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

const ago = (ts, t, lang) => {
  if (!ts) return "";
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return t("just now");
  if (m < 60) return t("{n} min ago", { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return t("{n} h ago", { n: h });
  return new Date(ts).toLocaleDateString(lang === "en" ? "en-GB" : "ur-PK", { day: "numeric", month: "short" });
};

export default function RecentConversations({ conversations = [] }) {
  const { t, lang } = useT();
  const recent = [...conversations].sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 4);
  return (
    <section className="kisan-card p-5 sm:p-6" aria-labelledby="recent-title">
      <div className="flex items-center justify-between">
        <h2 id="recent-title" className="kisan-label">{t("Recent conversations")}</h2>
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          {t("New chat")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">{t("No conversations yet. Ask Kisan AI your first question.")}</p>
        </div>
      ) : (
        <ul className="mt-3 divide-y">
          {recent.map((c) => {
            const rtl = detectLanguage(c.title || "").script === "arabic";
            const spoken = c.messages?.some((m) => m.voice);
            return (
              <li key={c.id}>
                <Link to={`/?c=${encodeURIComponent(c.id)}`} className="flex items-center gap-3 py-2.5 hover:text-primary focus-ring">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    {spoken ? <Mic className="h-4 w-4" aria-hidden="true" /> : <MessagesSquare className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <span dir="auto" className={cn("min-w-0 flex-1 truncate text-sm", rtl && "urdu text-[15px] leading-[1.9]")}>{c.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{ago(c.updated, t, lang)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
