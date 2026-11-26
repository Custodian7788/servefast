import React, { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { INK, LINE, ORANGE } from "../../theme.js";

// Where the reading has been landing. Nothing is filed by hand: every first
// industry read adds its market here, so this fills itself as you work and
// says which markets the news keeps hitting and which way they lean.
export default function MapBlock({ tick = 0 }) {
  const [state, setState] = useState({ loading: true });
  const [open, setOpen] = useState(null);

  function load() {
    setState({ loading: true });
    fetch("/api/map")
      .then((r) => r.json())
      .then((data) => setState({ loading: false, markets: data.markets || [] }))
      .catch(() => setState({ loading: false, markets: [] }));
  }

  useEffect(load, [tick]);

  const markets = state.markets || [];
  const seen = markets.reduce((n, m) => n + m.count, 0);

  return (
    <div className="h-full flex flex-col">
      <div
        className="shrink-0 flex items-center gap-2 px-2.5 h-7"
        style={{ borderBottom: `1px solid ${LINE}` }}
      >
        <span
          className="leading-none font-bold uppercase tracking-[0.12em] text-[10.5px]"
          style={{ color: ORANGE }}
        >
          Map
        </span>
        <button
          type="button"
          onClick={load}
          className="hover:opacity-70"
          style={{ color: ORANGE }}
          aria-label="Refresh the map"
        >
          <RotateCw size={10} strokeWidth={2} className={state.loading ? "animate-spin" : ""} />
        </button>
        <span className="flex-1" />
        {markets.length > 0 && (
          <span
            className="text-[9px] font-bold uppercase tracking-[0.05em] tabular-nums opacity-45"
            style={{ color: INK }}
          >
            {markets.length} markets · {seen} reads
          </span>
        )}
      </div>

      <div className="no-bar flex-1 min-h-0 overflow-y-auto">
        {state.loading ? null : !markets.length ? (
          <p className="p-3 text-[11.5px] leading-[1.6] opacity-35" style={{ color: INK }}>
            Press Industry on a story and the market it names appears here
          </p>
        ) : (
          markets.map((m, i) => {
            const showing = open === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setOpen(showing ? null : m.key)}
                className="block w-full text-left px-2 py-1.5 transition-colors hover:bg-[#FFF8F2]"
                style={{ borderTop: i ? `1px solid ${LINE}` : "none" }}
              >
                <span className="flex items-baseline gap-1.5">
                  <span
                    className="shrink-0 text-[10px] font-bold tabular-nums"
                    style={{ color: ORANGE }}
                  >
                    {m.count}
                  </span>
                  <span className="text-[12px] leading-[1.25] font-bold" style={{ color: INK }}>
                    {m.label}
                  </span>
                </span>

                {m.lean && (
                  <span className="mt-0.5 block text-[11px] leading-[1.35] opacity-70" style={{ color: INK }}>
                    {m.lean}
                  </span>
                )}

                {showing && (
                  <span className="mt-1.5 block">
                    {m.companies.length > 0 && (
                      <span className="flex flex-wrap gap-1">
                        {m.companies.map((c) => (
                          <span
                            key={c.name}
                            className="px-1 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.04em]"
                            style={{ color: ORANGE, border: `1px solid ${LINE}` }}
                          >
                            {c.name}
                            {c.seen > 1 ? ` ${c.seen}` : ""}
                          </span>
                        ))}
                      </span>
                    )}
                    {m.stories.length > 0 && (
                      <span className="mt-1.5 block">
                        {m.stories.slice(0, 5).map((s) => (
                          <span
                            key={s.url || s.title}
                            className="block text-[10.5px] leading-[1.35] opacity-55"
                            style={{ color: INK }}
                          >
                            {s.title}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
