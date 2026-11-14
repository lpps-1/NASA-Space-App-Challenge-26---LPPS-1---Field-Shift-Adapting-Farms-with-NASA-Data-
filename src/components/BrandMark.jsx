import { cn } from "@/lib/utils";

/** The Kisan AI leaf mark: forest-green tile, cream stem, harvest-yellow leaves. */
export default function BrandMark({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-10 w-10", className)} aria-hidden="true">
      <defs>
        <linearGradient id="kisan-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1C7A50" />
          <stop offset="1" stopColor="#123D2A" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#kisan-mark)" />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" fill="none" stroke="#151A17" strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M32 50V22" stroke="#F5F4EC" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 34c-8 0-13-5-13-13 8 0 13 5 13 13zM32 28c0-8 5-13 13-13 0 8-5 13-13 13z" fill="#F2C94C" />
    </svg>
  );
}
