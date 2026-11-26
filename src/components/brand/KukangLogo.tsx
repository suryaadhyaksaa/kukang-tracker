import React, { useId } from "react";

export function KukangLogo({
  compact = false,
  showTagline = false,
  variant = "color",
  size = "md",
}: {
  compact?: boolean;
  showTagline?: boolean;
  variant?: "color" | "white";
  size?: "sm" | "md" | "lg";
}) {
  const maskId = useId();
  const iconDimension =
    size === "lg" ? "h-16 w-16" : size === "sm" ? "h-8 w-8" : "h-10 w-10";

  const goldFill = variant === "white" ? "#FFFFFF" : "#C9A244";
  const redFill = variant === "white" ? "#FFFFFF" : "#A80D0D";

  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className={`relative flex ${iconDimension} shrink-0 items-center justify-center rounded-xl bg-black p-1 border border-[#C9A244]/40 shadow-md shadow-black/70`}
      >
        <svg
          viewBox="0 0 200 200"
          fill="none"
          className="h-full w-full"
          aria-label="Kukang EV Emblem"
        >
          <defs>
            <mask id={maskId}>
              <rect width="200" height="200" fill="white" />
              <ellipse
                cx="79"
                cy="89.5"
                rx="7.2"
                ry="5"
                transform="rotate(-22 79 89.5)"
                fill="black"
              />
              <ellipse
                cx="121"
                cy="89.5"
                rx="7.2"
                ry="5"
                transform="rotate(22 121 89.5)"
                fill="black"
              />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            {/* Bagian Kiri & Bawah (Metallic Gold) */}
            <path
              d="M 59 36.0
                 A 76 76 0 1 0 126 171.4
                 L 126 156.3
                 A 62 62 0 0 1 65 151.5
                 C 60 136, 61 116, 70 106
                 C 76 100, 88 101, 91 93
                 C 94 85, 86 77, 76 79
                 C 62 82, 50 99, 43.7 126
                 A 62 62 0 0 1 59 53.5
                 Z"
              fill={goldFill}
            />
            {/* Bagian Atas & Kanan (Deep Crimson) */}
            <path
              d="M 67 31.5
                 A 76 76 0 0 1 158.9 148
                 L 139.2 148
                 C 141 131, 139 115, 130 106
                 C 124 100, 112 101, 109 93
                 C 106 85, 114 77, 124 79
                 C 138 82, 149 98, 154.8 129
                 A 62 62 0 0 0 67 47.5
                 Z"
              fill={redFill}
            />
          </g>
        </svg>
      </div>

      {!compact && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-heading text-base font-bold tracking-wider text-white">
              KUKANG <span className="text-[#DC2626]">EV</span>
            </span>
            <span className="rounded bg-[#C9A244]/15 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-[#E5B94C] border border-[#C9A244]/40">
              ITERA
            </span>
          </div>
          {showTagline && (
            <span className="text-[11px] tracking-wide text-[#D4AF37]/90">
              Silent Drive, Powerful Impact
            </span>
          )}
        </div>
      )}
    </div>
  );
}