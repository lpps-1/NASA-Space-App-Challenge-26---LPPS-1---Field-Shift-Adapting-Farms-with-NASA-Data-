import BrandMark from "@/components/BrandMark";
import { UI_LANGS, useT } from "@/i18n";

/**
 * The very first screen on a new device: pick English, Urdu or Punjabi.
 * Everything after it (sign-in, farm setup, the whole app) uses that language.
 * It can be changed later in Settings.
 */
export default function LanguageGate({ children }) {
  const { chosen, setLang } = useT();
  if (chosen) return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10" dir="ltr">
      <div className="w-full max-w-md text-center">
        <BrandMark className="mx-auto h-12 w-12" />
        <h1 className="mt-6 font-display text-2xl">Choose your language</h1>
        <p className="urdu mt-2 text-xl leading-[2] text-muted-foreground" dir="rtl">اپنی زبان چنیں</p>
        <p className="urdu text-xl leading-[2] text-muted-foreground" dir="rtl">اپنی بولی چُنو</p>
        <ul className="mt-8 space-y-3">
          {UI_LANGS.map((l) => (
            <li key={l.code}>
              <button
                onClick={() => setLang(l.code)}
                className="flex w-full items-center justify-between rounded-lg border bg-card px-5 py-4 text-start transition-colors hover:border-primary hover:bg-primary/5 focus-ring [border-color:hsl(var(--edge))]"
                data-testid={`lang-${l.code}`}
              >
                <span className={l.code === "en" ? "text-lg font-semibold" : "urdu text-2xl leading-[1.9]"} dir={l.dir}>
                  {l.native}
                </span>
                <span className="text-sm text-muted-foreground">{l.code === "en" ? "" : l.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">You can change this later in Settings.</p>
      </div>
    </main>
  );
}
