import React from "react";
import { INK, LINE, ORANGE } from "../../theme.js";

// The industry read, drawn. Stages left to right from the deepest input to
// the end customer; under each, who holds it and how much; marked where the
// chain is actually constrained and where policy lands on it.
//
// Drawn from the same answer as the prose above it, so the two cannot
// disagree.

const CHOKE = "#C0392B";

export default function Chain({ stages = [] }) {
  if (!stages.length) return null;

  return (
    <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
      <div className="flex items-stretch gap-1">
        {stages.map((st, i) => {
          const total = st.firms.reduce((n, f) => n + f.share, 0) || 100;
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <span
                  className="shrink-0 self-start text-[11px] leading-none pt-[9px] opacity-30"
                  style={{ color: INK }}
                  aria-hidden="true"
                >
                  ›
                </span>
              )}
              <div className="flex-1 min-w-0 flex flex-col">
                <p
                  className="text-[9.5px] font-bold uppercase tracking-[0.05em] leading-[1.25]"
                  style={{ color: st.choke ? CHOKE : INK }}
                  title={st.choke ? "The binding constraint on the whole chain" : undefined}
                >
                  {st.name}
                  {st.choke ? " ·" : ""}
                </p>

                {/* Who holds this stage, as a share of it. */}
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
                  <p className="mt-1 text-[9px] leading-[1.25] opacity-40" style={{ color: INK }}>
                    {st.where}
                  </p>
                )}

                {st.policy && (
                  <p
                    className="mt-1 text-[9px] leading-[1.25] font-bold"
                    style={{ color: CHOKE }}
                    title="A rule lands on this stage"
                  >
                    {st.policy}
                  </p>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <p className="mt-2 text-[9px] uppercase tracking-[0.06em] opacity-35" style={{ color: INK }}>
        Red marks the binding constraint and where policy lands. Shares are estimates.
      </p>
    </div>
  );
}
