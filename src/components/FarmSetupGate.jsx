import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/hooks/useKisanData";
import { needsFarmSetup } from "@/lib/farmSetup";

/** Sends a signed-in farmer to farm setup until the required farm questions are answered. */
export default function FarmSetupGate() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  if (isLoading || !profile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }
  if (needsFarmSetup(user, profile)) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
