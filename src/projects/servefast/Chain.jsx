import React from "react";
import { INK, LINE, ORANGE } from "../../theme.js";

// The industry drawn. One row per segment, in order from the deepest input
// to the end customer: who holds it and by how much, where it sits, the
// tightest link in red, and the segment this story lands in picked out, so
// you can see where the event falls on the map.
//
// Rows rather than columns: six segments across a third of the screen left
// each one too narrow to read.

const CHOKE = "#C0392B";

export default function Chain({ segments = [], here = "" }) {
  if (!segments.length) return null;

  return (
    <div>
      {segments.map((st, i) => {
        const total = st.firms.reduce((n, f) => n + f.share, 0) || 100;
        const landed = here && st.name.toLowerCase() === here.toLowerCase();
        const accent = st.choke ? CHOKE : ORANGE;

        return (
          <div
            key={i}
            className="px-1.5 py-1"
            style={{
              borderTop: i ? `1px solid ${LINE}` : "none",
              backgroundColor: landed ? "#FFF1E3" : "transparent",
              borderLeft: landed ? `2px solid ${ORANGE}` : "2px solid transparent",
            }}
          >
            <div className="flex items-baseline gap-1.5">
              <p
                className="shrink-0 text-[10px] font-bold uppercase tracking-[0.05em] leading-[1.3]"
                style={{ color: st.choke ? CHOKE : INK }}
                title={st.choke ? "The tightest link: supply here is hardest to add" : undefined}
              >
                {st.name}
              </p>
              {st.size && (
                <p className="text-[9px] leading-[1.3] opacity-45 truncate" style={{ color: INK }}>
                  {st.size}
                </p>
              )}
            </div>

            <div className="mt-1 flex items-center gap-2">
              <div
                className="shrink-0 flex h-1.5 overflow-hidden"
                style={{ width: "34%", border: `1px solid ${st.choke ? CHOKE : LINE}` }}
              >
                {st.firms.map((f, k) => (
                  <span
                    key={f.name}
                    title={`${f.name} ${f.share}%`}
                    style={{
                      width: `${(f.share / total) * 100}%`,
                      backgroundColor: accent,
                      opacity: 1 - k * 0.22,
                      borderRight: k < st.firms.length - 1 ? "1px solid #FFFFFF" : "none",
                    }}
                  />
                ))}
              </div>
              <p className="min-w-0 text-[9.5px] leading-[1.3] truncate" style={{ color: INK }}>
                {st.firms.map((f, k) => (
                  <span key={f.name}>
                    {k > 0 && <span className="opacity-30"> · </span>}
                    <span className="tabular-nums font-bold" style={{ color: accent }}>
                      {f.share}
                    </span>
                    <span className="opacity-75"> {f.name}</span>
                  </span>
                ))}
              </p>
            </div>

            {(st.where || st.policy) && (
              <p className="mt-0.5 text-[9px] leading-[1.3] truncate" style={{ color: INK }}>
                {st.where && <span className="opacity-40">{st.where}</span>}
                {st.where && st.policy && <span className="opacity-25"> · </span>}
                {st.policy && (
                  <span style={{ color: CHOKE }} title={st.policy}>
                    {st.policy}
                  </span>
                )}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
