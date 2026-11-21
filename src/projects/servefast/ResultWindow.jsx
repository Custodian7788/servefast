import React, { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FitText from "./FitText.jsx";
import { INK, LINE, ORANGE } from "../../theme.js";

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
      <mark key={i} style={{ backgroundColor: "#FFE1C2", color: INK }}>
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
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, total - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIndex, total]);

  const current = results[index];

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-full max-h-[560px] flex flex-col">
        <div className="flex-1 min-h-0 rounded bg-white p-5" style={{ border: `2px solid ${LINE}` }}>
          {current ? (
            <FitText>
              <p className="whitespace-pre-wrap" style={{ color: INK }}>
                {highlight(current.text, current.terms)}
              </p>
            </FitText>
          ) : (
            <div
              className="h-full flex items-center justify-center text-[12px] opacity-45"
              style={{ color: INK }}
            >
              {empty}
            </div>
          )}
        </div>

        <div className="h-8 shrink-0 flex items-center justify-between text-[11px]" style={{ color: INK }}>
          <span className="truncate opacity-60">{current ? current.source : ""}</span>
          <span className="flex items-center gap-2">
            <button
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              disabled={!total || index === 0}
              className="disabled:opacity-25"
              aria-label="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="tabular-nums" style={{ color: total ? ORANGE : INK }}>
              {total ? `${index + 1} / ${total}` : "0"}
            </span>
            <button
              onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
              disabled={!total || index >= total - 1}
              className="disabled:opacity-25"
              aria-label="Next"
            >
              <ChevronRight size={16} />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
