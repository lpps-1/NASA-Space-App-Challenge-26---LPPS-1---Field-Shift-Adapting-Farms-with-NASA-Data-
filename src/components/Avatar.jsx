import { cn } from "@/lib/utils";
import { displayNameOf, initialsOf } from "@/lib/profile";

/** Farmer avatar with initials from the saved display name (never from the email). */
export default function Avatar({ profile, className }) {
  const name = displayNameOf(profile);
  const initials = profile?.avatar_initials && name ? profile.avatar_initials : initialsOf(name);
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-accent text-xs font-bold tracking-wide text-accent-foreground ring-1 ring-outline/70",
        /[؀-ۿ]/.test(initials) && "urdu text-[11px] leading-none",
        className
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
