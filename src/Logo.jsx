import React from "react";

export const BG = "#FFFCF8"; // warm white
export const INK = "#332E2A"; // warm charcoal
export const ORANGE = "#E4762F";

// A square with sharp corners, the sun squeezing out of its top-right corner.
export function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <mask id="sf-mark-cut">
        <rect x="-10" y="-10" width="72" height="72" fill="#fff" />
        <ellipse cx="38" cy="16" rx="12" ry="10" fill="#000" />
      </mask>
      <rect
        x="6"
        y="16"
        width="32"
        height="32"
        stroke={INK}
        strokeWidth="5"
        mask="url(#sf-mark-cut)"
      />
      <ellipse cx="38" cy="16" rx="9" ry="7" fill={ORANGE} />
    </svg>
  );
}

// The mark hugs the final t, just clear of the baseline.
export default function Logo() {
  return (
    <span className="inline-flex items-end text-2xl font-semibold leading-none" style={{ color: INK, letterSpacing: "-0.005em" }}>
      <span>
        serve<span style={{ color: ORANGE }}>fast</span>
      </span>
      <LogoMark size={15} />
    </span>
  );
}
