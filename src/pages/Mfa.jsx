import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { PrimaryButton } from "@/components/FormField";
import { useT } from "@/i18n";

export default function Mfa() {
  const { t } = useT();
  const navigate = useNavigate();
  const [digits, setDigits] = useState(Array(6).fill(""));
  const refs = useRef([]);

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  return (
    <AuthLayout icon={ShieldCheck} title={t("Verify it's you")} subtitle={t("Enter the 6-digit code we sent to your phone")}>
      <form onSubmit={(e) => { e.preventDefault(); navigate("/"); }} className="space-y-6">
        <div className="flex justify-between gap-2" dir="ltr">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={d}
              inputMode="numeric"
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => e.key === "Backspace" && !d && i > 0 && refs.current[i - 1]?.focus()}
              className="h-12 w-11 rounded-xl border border-input bg-background text-center text-lg font-semibold focus-ring"
            />
          ))}
        </div>
        <PrimaryButton disabled={digits.some((d) => !d)}>{t("Verify")}</PrimaryButton>
        <p className="text-center text-xs text-muted-foreground">{t("Didn't get it?")} <button type="button" className="text-primary hover:underline">{t("Resend code")}</button></p>
      </form>
    </AuthLayout>
  );
}
