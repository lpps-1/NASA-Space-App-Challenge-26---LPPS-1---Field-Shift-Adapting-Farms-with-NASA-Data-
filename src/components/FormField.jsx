import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm transition-colors placeholder:text-muted-foreground/70 hover:border-foreground/25 disabled:cursor-not-allowed disabled:opacity-70 focus-ring";

/** A red star for questions that must be answered. */
export function Required() {
  return <span className="ms-0.5 font-semibold text-red-500" aria-hidden="true">*</span>;
}

export default function FormField({ label, hint, className, children, required, ...props }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium">{label}{required && <Required />}</span>
      {children || <input className={inputClass} {...props} />}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function PrimaryButton({ className, children, ...props }) {
  return (
    <button
      className={cn(
        "kisan-btn-primary w-full focus-ring",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
