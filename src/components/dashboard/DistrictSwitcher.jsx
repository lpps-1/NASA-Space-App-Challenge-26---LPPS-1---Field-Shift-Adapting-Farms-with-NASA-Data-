import { useEffect, useRef, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { toast } from "sonner";
import { locationPatch, PlaceSearch, usLocationPatch, USPlaceSearch } from "@/components/LocationPicker";
import { useUpdateProfile } from "@/hooks/useKisanData";
import { useT } from "@/i18n";

/**
 * Quick district change from the dashboard. Writes only the location fields
 * (see locationPatch), so the farmer's name, email and other details are untouched.
 */
export default function DistrictSwitcher({ profile }) {
  const [open, setOpen] = useState(false);
  const { t } = useT();
  const save = useUpdateProfile();
  const box = useRef(null);
  const location = [profile?.tehsil, profile?.district, profile?.province].filter(Boolean).join(", ");

  useEffect(() => {
    if (!open) return;
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const pick = async (r) => {
    setOpen(false);
    try {
      await save.mutateAsync(locationPatch(r, r.tehsil || null));
      toast.success(t("Weather now shows {place}", { place: `${r.tehsil ? `${r.tehsil}, ` : ""}${r.name}` }));
    } catch {
      toast.error(t("Couldn't change the district. Please try again."));
    }
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="kisan-chip border-white/15 bg-white/5 text-white/85 transition-colors hover:bg-white/10 focus-ring"
        data-testid="district-switcher"
      >
        <MapPin className="h-3.5 w-3.5 text-harvest" aria-hidden="true" />
        {location || t("Choose your district")}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
      </button>
      {open && (
        <div className="kisan-card absolute start-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-3rem))] p-4 text-foreground">
          {profile?.country === "US" ? (
            <USPlaceSearch
              autoFocus
              label={t("Change location")}
              onPick={async (r) => {
                setOpen(false);
                await save.mutateAsync(usLocationPatch(r));
                toast.success(t("Weather now shows {place}", { place: `${r.name}, ${r.state}` }));
              }}
            />
          ) : (
            <PlaceSearch label={t("Change district or tehsil")} onPick={pick} autoFocus />
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">{t("Updates the weather and advice. Your name and account stay the same.")}</p>
        </div>
      )}
    </div>
  );
}
