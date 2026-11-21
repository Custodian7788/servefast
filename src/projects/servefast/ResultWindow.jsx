import React, { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FitText from "./FitText.jsx";
import { INK, LINE, ORANGE } from "../../theme.js";

const CARD = "#FFFFFF";
const HEAD = "#FBF0DC";

// Marks the asked-for words inside a passage, without touching the rest.
function highlight(text, terms) {
  if (!terms || !terms.length) return text;

  const lower = text.toLowerCase();
  const spans = [];
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(term, from);
      if (at === -1) break;
      spans.push([at, at + term.length]);
      from = at + term.length;
    }
  }
  if (!spans.length) return text;

  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([...span]);
  }

  const out = [];
  let cursor = 0;
  merged.forEach(([start, end], i) => {
    if (start > cursor) out.push(text.slice(cursor, start));
    out.push(
      <mark key={i} style={{ backgroundColor: "#FFE1C2", color: INK, padding: "0 2px", borderRadius: 2 }}>
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

// One passage at a time, always whole, never scrolled. You toggle through them.
export default function ResultWindow({ results, index, setIndex, empty }) {
  const total = results.length;

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, total - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIndex, total]);

  const current = results[index];

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-5">
      <div
        className="w-full max-w-3xl h-full max-h-[620px] flex flex-col rounded overflow-hidden"
        style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}
      >
        <div
          className="shrink-0 flex items-center gap-2 px-3 h-7 text-[9px] font-bold uppercase tracking-[0.08em]"
          style={{ backgroundColor: HEAD, borderBottom: `1px solid ${LINE}`, color: INK }}
        >
          <span className="flex-1 truncate normal-case font-normal text-[10px] opacity-60">
            {current ? current.source : ""}
          </span>
          <span className="tabular-nums" style={{ color: total ? ORANGE : INK }}>
            {total ? `${index + 1} of ${total}` : "No results"}
          </span>
        </div>

        <div className="flex-1 min-h-0 px-8 py-7">
          {current ? (
            <FitText>
              <p className="whitespace-pre-wrap" style={{ color: INK }}>
                {highlight(current.text, current.terms)}
              </p>
            </FitText>
          ) : (
            <div className="h-full flex items-center justify-center text-[12px] opacity-40" style={{ color: INK }}>
              {empty}
            </div>
          )}
        </div>

        <div
          className="shrink-0 flex items-center justify-center gap-6 h-9"
          style={{ backgroundColor: HEAD, borderTop: `1px solid ${LINE}`, color: INK }}
        >
          <button
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={!total || index === 0}
            className="disabled:opacity-20 hover:opacity-60"
            aria-label="Previous passage"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[10px] uppercase tracking-[0.08em] opacity-45">Toggle</span>
          <button
            onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
            disabled={!total || index >= total - 1}
            className="disabled:opacity-20 hover:opacity-60"
            aria-label="Next passage"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
