import React from "react";

export const BG = "#FFFCF8"; // warm white
export const INK = "#332E2A"; // warm charcoal
export const ORANGE = "#E4762F";

// Square with sharp corners, the sun squeezing out of the top-right.
// The frame thickens inward, so the outer size stays put.
export function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <mask id="sf-mark-cut">
        <rect x="-10" y="-10" width="72" height="72" fill="#fff" />
        <ellipse cx="34.75" cy="19.25" rx="12" ry="10" fill="#000" />
      </mask>
      <rect
        x="9.25"
        y="19.25"
        width="25.5"
        height="25.5"
        stroke={INK}
        strokeWidth="13"
        mask="url(#sf-mark-cut)"
      />
      <ellipse cx="34.75" cy="19.25" rx="9" ry="7" fill={ORANGE} />
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
