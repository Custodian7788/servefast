import React from "react";

const TEAL = "#0C9499";
const CREAM = "#FFE9C4";

// Mark: a teal tile with a speed chevron cut out of it, trailed by two motion bars.
export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={TEAL} />
      <path d="M13.5 8 L23 16 L13.5 24 Z" fill={CREAM} />
      <rect x="6" y="12" width="5" height="2.5" rx="1.25" fill={CREAM} opacity="0.85" />
      <rect x="8" y="17.5" width="3" height="2.5" rx="1.25" fill={CREAM} opacity="0.55" />
    </svg>
  );
}

export default function Logo() {
  return (
    <div className="flex items-center gap-2 leading-none">
      <LogoMark />
      <span className="text-xl font-extrabold" style={{ color: TEAL, letterSpacing: "0.02em" }}>
        SERVEFAST<span className="text-neutral-400">.</span>
      </span>
    </div>
  );
}
