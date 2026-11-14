import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { openSettings } from "@/lib/settingsDialog";

/** Old /settings links: open the Settings popup over the dashboard. */
export default function OpenSettings() {
  useEffect(() => openSettings(), []);
  return <Navigate to="/dashboard" replace />;
}
