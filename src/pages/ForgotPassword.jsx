import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, MailCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthContext";
import FormField, { PrimaryButton } from "@/components/FormField";
import { useT } from "@/i18n";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [live, setLive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { requestPasswordReset } = useAuth();
  const { t } = useT();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await requestPasswordReset(email);
      setLive(r.live);
      setSent(true);
    } catch (err) {
      setError(err?.message || t("Couldn't send the link. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      icon={KeyRound}
      title={t("Reset password")}
      subtitle={t("We'll send you a link to choose a new one")}
      footer={<Link to="/login" className="font-medium text-primary hover:underline">{t("Back to sign in")}</Link>}
    >
      {sent ? (
        <div className="text-center">
          <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm">{t("If an account exists for {email}, a reset link is on its way.", { email })}</p>
          {live ? (
            <p className="mt-2 text-xs text-muted-foreground">{t("Open the link on this phone. It signs you in and lets you choose a new password.")}</p>
          ) : (
            <Link to="/reset-password" className="mt-4 inline-block text-xs text-muted-foreground underline">{t("Open the reset screen (demo)")}</Link>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <FormField label={t("Email")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.pk" />
          {error && <p role="alert" className="text-sm text-alert">{error}</p>}
          <PrimaryButton disabled={busy}>{busy ? t("Sending…") : t("Send reset link")}</PrimaryButton>
        </form>
      )}
    </AuthLayout>
  );
}
