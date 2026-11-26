import React from "react";
import { INK, LINE, ORANGE } from "../../theme.js";

// The industry drawn: its segments left to right from the deepest input to
// the end customer, who holds each and by how much, the tightest link in
// red, and the segment this story lands in outlined so you can see where the
// event sits on the map.

const CHOKE = "#C0392B";

export default function Chain({ segments = [], here = "" }) {
  if (!segments.length) return null;

  return (
    <div className="flex items-stretch gap-1">
      {segments.map((st, i) => {
        const total = st.firms.reduce((n, f) => n + f.share, 0) || 100;
        const landed = here && st.name.toLowerCase() === here.toLowerCase();
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <span
                className="shrink-0 self-start pt-[7px] text-[11px] leading-none opacity-25"
                style={{ color: INK }}
                aria-hidden="true"
              >
                ›
              </span>
            )}
            <div
              className="flex-1 min-w-0 flex flex-col px-1 py-1"
              style={{
                backgroundColor: landed ? "#FFF1E3" : "transparent",
                border: landed ? `1px solid ${ORANGE}` : "1px solid transparent",
              }}
            >
              <p
                className="text-[9.5px] font-bold uppercase tracking-[0.05em] leading-[1.2]"
                style={{ color: st.choke ? CHOKE : INK }}
                title={st.choke ? "The tightest link in the chain" : undefined}
              >
                {st.name}
              </p>
              {st.size && (
                <p className="text-[9px] leading-[1.25] opacity-45" style={{ color: INK }}>
                  {st.size}
                </p>
              )}

              <div
                className="mt-1 flex h-1.5 w-full overflow-hidden"
                style={{ border: `1px solid ${st.choke ? CHOKE : LINE}` }}
              >
                {st.firms.map((f, k) => (
                  <span
                    key={f.name}
                    title={`${f.name} ${f.share}%`}
                    style={{
                      width: `${(f.share / total) * 100}%`,
                      backgroundColor: st.choke ? CHOKE : ORANGE,
                      opacity: 1 - k * 0.22,
                      borderRight: k < st.firms.length - 1 ? "1px solid #FFFFFF" : "none",
                    }}
                  />
                ))}
              </div>

              <div className="mt-1 flex flex-col gap-0.5">
                {st.firms.map((f) => (
                  <p key={f.name} className="text-[9.5px] leading-[1.2]" style={{ color: INK }}>
                    <span className="tabular-nums font-bold" style={{ color: st.choke ? CHOKE : ORANGE }}>
                      {f.share}
                    </span>{" "}
                    <span className="opacity-75">{f.name}</span>
                  </p>
                ))}
              </div>

              {st.where && (
                <p className="mt-1 text-[9px] leading-[1.2] opacity-40" style={{ color: INK }}>
                  {st.where}
                </p>
              )}
              {st.policy && (
                <p
                  className="mt-1 text-[9px] leading-[1.2] font-bold"
                  style={{ color: CHOKE }}
                  title="A rule lands on this segment"
                >
                  {st.policy}
                </p>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
