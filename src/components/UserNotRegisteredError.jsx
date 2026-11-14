import { ShieldAlert } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/lib/AuthContext';
import { useT } from "@/i18n";

export default function UserNotRegisteredError() {
  const { t } = useT();
  const { logout } = useAuth();
  return (
    <AuthLayout icon={ShieldAlert} title={t("Access pending")} subtitle={t("Your account isn't registered for Kisan AI yet.")}>
      <p className="text-sm text-muted-foreground">{t("Contact your administrator, or sign in with a different account.")}</p>
      <button onClick={logout} className="mt-6 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground focus-ring">
        Sign in again
      </button>
    </AuthLayout>
  );
}
