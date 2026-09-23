import React from "react";

export const BG = "#FFFCF8"; // warm white
export const INK = "#332E2A"; // warm charcoal
export const ORANGE = "#E4762F";

export default function Logo() {
  return (
    <span className="text-2xl font-semibold leading-none" style={{ color: INK, letterSpacing: "-0.005em" }}>
      serve<span style={{ color: ORANGE }}>fast</span>
    </span>
  );
}
