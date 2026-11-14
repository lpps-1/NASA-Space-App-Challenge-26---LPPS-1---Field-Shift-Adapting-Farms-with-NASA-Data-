import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck, UserPlus } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import FormField, { PrimaryButton } from "@/components/FormField";
import GoogleButton, { GOOGLE_SIGNIN_ENABLED, OrDivider } from "@/components/GoogleButton";
import { useAuth } from "@/lib/AuthContext";
import { useT } from "@/i18n";

export default function Register() {
  const { t } = useT();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ display_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sentTo, setSentTo] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await register(form);
      if (result?.needsConfirmation) {
        setSentTo(result.email);
        setBusy(false);
      } else navigate("/");
    } catch (err) {
      setError(/already/i.test(err?.message || "") ? t("An account with this email already exists. Sign in instead.") : err?.message || t("Couldn't create the account. Try again."));
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      icon={UserPlus}
      title={t("Create your free account")}
      footer={<>{t("Already have an account?")} <Link to="/login" className="font-medium text-primary hover:underline">{t("Sign in")}</Link></>}
    >
      {sentTo ? (
        <div className="text-center">
          <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <p className="mt-3 font-medium">{t("Check your email")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("We sent a confirmation link to {email}. Open it on this phone to finish signing up.", { email: sentTo })}</p>
        </div>
      ) : (
        <>
          {GOOGLE_SIGNIN_ENABLED && (
            <>
              <GoogleButton label={t("Sign up with Google")} />
              <OrDivider>{t("or with email")}</OrDivider>
            </>
          )}
          <form onSubmit={submit} className="space-y-4">
            <FormField label={t("Your name")} required value={form.display_name} onChange={set("display_name")} placeholder={t("e.g. Muhammad Aslam")} autoComplete="name" dir="auto" maxLength={60} />
            <FormField label={t("Email")} type="email" required value={form.email} onChange={set("email")} placeholder="you@example.pk" autoComplete="username" />
            <FormField label={t("Password")} type="password" required minLength={8} value={form.password} onChange={set("password")} hint={t("At least 8 characters")} autoComplete="new-password" />
            {error && <p role="alert" className="text-sm text-alert">{error}</p>}
            <PrimaryButton disabled={busy}>{busy ? t("Creating account…") : t("Create account")}</PrimaryButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
