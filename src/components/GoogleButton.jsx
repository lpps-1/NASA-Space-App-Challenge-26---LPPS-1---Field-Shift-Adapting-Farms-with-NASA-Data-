import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useT } from "@/i18n";

/**
 * Google sign-in needs Netlify Identity, which isn't available on the Vercel deploy.
 * It stays hidden unless VITE_ENABLE_GOOGLE_SIGNIN=true is set at build time.
 */
export const GOOGLE_SIGNIN_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_SIGNIN === "true";

/** "Continue with Google" (Netlify Identity → Google). Follows Google's button guidelines: white surface, the G mark, plain label. */
export default function GoogleButton({ label }) {
  const { t } = useT();
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      await loginWithGoogle(); // navigates away on success
    } catch (err) {
      toast.error(t("Google sign-in isn't available"), { description: err.message });
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="flex w-full items-center justify-center gap-3 rounded-md border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-[#f7f8f8] active:translate-y-px disabled:opacity-70 focus-ring"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      {busy ? t("Opening Google…") : label || t("Continue with Google")}
    </button>
  );
}

export function OrDivider({ children = "or" }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> {children} <span className="h-px flex-1 bg-border" />
    </div>
  );
}
