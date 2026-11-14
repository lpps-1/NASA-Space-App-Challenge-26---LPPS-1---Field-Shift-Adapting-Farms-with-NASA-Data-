import { cn } from "@/lib/utils";

/**
 * Country flags drawn as SVG. Flag emoji don't show on Windows (they appear as
 * "PK" / "US" letters), so the country picker uses these instead.
 */
function Pakistan() {
  return (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#01411C" />
      <rect width="7.5" height="20" fill="#FFFFFF" />
      {/* Crescent: a white circle with a green circle cut out of it. */}
      <circle cx="19.2" cy="10" r="5.2" fill="#FFFFFF" />
      <circle cx="20.6" cy="8.7" r="4.4" fill="#01411C" />
      {/* Five-pointed star. */}
      <polygon
        fill="#FFFFFF"
        points="22.6,5.9 23.15,7.45 24.8,7.5 23.5,8.5 23.95,10.1 22.6,9.15 21.25,10.1 21.7,8.5 20.4,7.5 22.05,7.45"
        transform="rotate(-38 22.6 8)"
      />
    </svg>
  );
}

function UnitedStates() {
  const stripes = Array.from({ length: 13 }, (_, i) => i);
  return (
    <svg viewBox="0 0 38 20" aria-hidden="true">
      {stripes.map((i) => (
        <rect key={i} y={(i * 20) / 13} width="38" height={20 / 13 + 0.02} fill={i % 2 ? "#FFFFFF" : "#B22234"} />
      ))}
      <rect width="15.2" height={(20 * 7) / 13} fill="#3C3B6E" />
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: r % 2 ? 5 : 6 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={1.3 + c * 2.5 + (r % 2 ? 1.25 : 0)} cy={1.25 + r * 2.4} r="0.55" fill="#FFFFFF" />
        ))
      )}
    </svg>
  );
}

export default function Flag({ country, className }) {
  return (
    <span className={cn("inline-flex h-6 w-9 shrink-0 overflow-hidden rounded-[4px] shadow-[0_0_0_1px_rgb(0_0_0/0.12)] [&>svg]:h-full [&>svg]:w-full", className)}>
      {country === "US" ? <UnitedStates /> : <Pakistan />}
    </span>
  );
}
