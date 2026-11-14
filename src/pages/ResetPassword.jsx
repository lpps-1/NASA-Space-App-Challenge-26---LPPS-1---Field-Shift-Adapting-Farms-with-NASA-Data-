import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import AuthLayout from "@/components/AuthLayout";
import FormField, { PrimaryButton } from "@/components/FormField";
import { useAuth } from "@/lib/AuthContext";
import { useT } from "@/i18n";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const { setNewPassword } = useAuth();
  const { t } = useT();
  const mismatch = confirm && pw !== confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    try {
      const { live } = await setNewPassword(pw);
      if (live) {
        toast.success(t("Password updated"), { description: t("You're signed in.") });
        navigate("/");
      } else {
        toast.success(t("Password updated"), { description: t("Sign in with your new password.") });
        navigate("/login");
      }
    } catch (err) {
      toast.error(t("Couldn't update the password"), { description: err?.message || t("Open the reset link again.") });
      setBusy(false);
    }
  };

  return (
    <AuthLayout icon={LockKeyhole} title={t("Choose a new password")}>
      <form onSubmit={submit} className="space-y-4">
        <FormField label={t("New password")} type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <FormField label={t("Confirm password")} type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} hint={mismatch ? t("Passwords don't match") : undefined} autoComplete="new-password" />
        <PrimaryButton disabled={mismatch || busy}>{busy ? t("Saving…") : t("Update password")}</PrimaryButton>
      </form>
    </AuthLayout>
  );
}
