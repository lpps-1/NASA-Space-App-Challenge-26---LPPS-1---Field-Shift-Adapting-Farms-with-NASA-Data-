import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Sprout } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import FormField, { PrimaryButton } from "@/components/FormField";
import GoogleButton, { GOOGLE_SIGNIN_ENABLED, OrDivider } from "@/components/GoogleButton";
import { useAuth } from "@/lib/AuthContext";
import { useT } from "@/i18n";

export default function Login() {
  const { t } = useT();
  const { login, enterDemo, isAuthenticated, authNotice } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ email, password });
      navigate("/");
    } catch (err) {
      setError(/invalid|grant/i.test(err?.message || "") ? t("That email and password don't match. Check them, or reset your password.") : err?.message || t("Couldn't sign in. Try again."));
      setBusy(false);
    }
  };

  const demo = async () => {
    setBusy(true);
    await enterDemo();
    navigate("/");
  };

  return (
    <AuthLayout
      icon={Sprout}
      title={t("Sign in to your farm")}
      footer={<>{t("New to Kisan AI?")} <Link to="/register" className="font-medium text-primary hover:underline">{t("Create an account")}</Link></>}
    >
      {authNotice && <p role="alert" className="mb-4 rounded-xl border border-alert/40 bg-alert/10 px-3.5 py-2.5 text-sm">{authNotice}</p>}
      {GOOGLE_SIGNIN_ENABLED && (
        <>
          <GoogleButton />
          <OrDivider>{t("or with email")}</OrDivider>
        </>
      )}
      <form onSubmit={submit} className="space-y-4">
        <FormField label={t("Email")} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.pk" />
        <FormField label={t("Password")} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">{t("Forgot password?")}</Link>
        </div>
        {error && <p role="alert" className="text-sm text-alert">{error}</p>}
        <PrimaryButton disabled={busy}>{busy ? t("Signing in…") : t("Sign in")}</PrimaryButton>
      </form>
      {/* The demo is what judges open first: a plain solid yellow button, same shape as Sign in,
          no glow or gradient, so it is easy to spot without looking flashy. */}
      <button
        onClick={demo}
        disabled={busy}
        className="group mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5C518] px-4 py-2.5 text-sm font-semibold text-[#14281D] transition-colors hover:bg-[#E6B800] disabled:opacity-60 focus-ring"
      >
        {t("Just looking? Explore the demo farm")}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
      </button>
    </AuthLayout>
  );
}
