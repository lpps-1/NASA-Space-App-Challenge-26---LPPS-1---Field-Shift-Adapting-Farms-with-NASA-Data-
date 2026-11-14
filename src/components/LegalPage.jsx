import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import SiteFooter from "@/components/SiteFooter";
import { cn } from "@/lib/utils";

/**
 * Shared layout for the policy pages: a slim top bar, a title block with the date and a
 * short summary, an "On this page" list that follows the reader, and numbered sections.
 * `sections` = [{ id, title, body }].
 */
export default function LegalPage({ eyebrow, title, updated, summary, sections, related }) {
  const { hash } = useLocation();
  const [current, setCurrent] = useState(sections[0]?.id);

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo({ top: 0 });
  }, [hash]);

  // Highlight the section being read.
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (seen[0]) setCurrent(seen[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur [border-color:var(--card-line)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <BrandMark className="h-7 w-7" />
            <span className="text-[15px] font-semibold">Kisan AI</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> Back to the app
          </Link>
        </div>
      </header>

      <div className="border-b [border-color:var(--card-line)]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary dark:text-harvest">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>
          {summary && <p className="mt-6 max-w-2xl text-[17px] leading-8 text-foreground/85">{summary}</p>}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden lg:block" aria-label="On this page">
          <div className="sticky top-20">
            <p className="text-xs font-semibold text-foreground">On this page</p>
            <ol className="mt-3 space-y-0.5 border-s [border-color:var(--card-line)]">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={cn(
                      "-ms-px block border-s-2 py-1.5 ps-3 text-sm transition-colors",
                      current === s.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
            {related && (
              <div className="mt-8 space-y-1.5 text-sm">
                <p className="text-xs font-semibold text-foreground">Related</p>
                {related.map(([label, to]) => (
                  <Link key={to} to={to} className="block text-muted-foreground hover:text-foreground">{label}</Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <main className="max-w-3xl">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-b py-8 first:pt-0 last:border-b-0 [border-color:var(--card-line)]">
              <h2 className="flex items-baseline gap-3 text-xl font-semibold tracking-tight">
                <span className="text-sm font-medium tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h2>
              <div className="legal-body mt-4 space-y-4 text-[15px] leading-7 text-foreground/85">{s.body}</div>
            </section>
          ))}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
