import React from "react";

export const WASABI = "#7FB539";
const INK = "#332E2A";

// Same square and same escape as the Servefast mark, in wasabi green.
export function WasorbiMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="10.75 12.25 38.5 39" fill="none" aria-hidden="true">
      <mask id="wa-mark-cut">
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
        mask="url(#wa-mark-cut)"
      />
      <ellipse cx="34.75" cy="19.25" rx="9" ry="7" fill={WASABI} />
    </svg>
  );
}

export default function WasorbiLogo() {
  return (
    <span className="inline-flex items-baseline text-2xl font-semibold leading-none" style={{ color: INK, letterSpacing: "-0.005em" }}>
      <span>
        was<span style={{ color: WASABI }}>orbi</span>
      </span>
      <WasorbiMark size={15} />
    </span>
  );
}
