import React from "react";

export const BG = "#FFFCF8"; // warm white
export const INK = "#1C1917";
export const ORANGE = "#F26A1B";

// Funnel tile: everything in, one clear thing out.
export function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <rect width="52" height="52" rx="14" fill={ORANGE} />
      <path d="M13 16 H39 L30 27 V38 L22 33 V27 Z" fill={BG} />
    </svg>
  );
}

export default function Logo() {
  return (
    <div className="flex items-center gap-2 leading-none">
      <LogoMark />
      <span className="text-xl font-extrabold tracking-tight" style={{ color: INK }}>
        serve<span style={{ color: ORANGE }}>fast</span>
      </span>
    </div>
  );
}
