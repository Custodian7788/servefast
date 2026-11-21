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
      <mark key={i} style={{ backgroundColor: "#FFD9AF", color: INK, padding: "0 1px" }}>
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

function Arrow({ dir, onClick, disabled }) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 w-10 flex items-center justify-center disabled:opacity-15 hover:opacity-60 transition-opacity"
      style={{ color: INK }}
      aria-label={dir === "left" ? "Previous passage" : "Next passage"}
    >
      <Icon size={26} strokeWidth={1.5} />
    </button>
  );
}

// One passage at a time, always whole, never scrolled. You toggle through them.
export default function ResultWindow({ results, index, setIndex, empty }) {
  const total = results.length;

  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, total - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIndex, total]);

  const current = results[index];

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center gap-1 px-4 py-8">
      <Arrow dir="left" onClick={() => setIndex((i) => Math.max(i - 1, 0))} disabled={!total || index === 0} />

      <div className="flex-1 min-w-0 h-full max-w-3xl flex flex-col gap-2">
        <div
          className="flex-1 min-h-0 rounded-sm bg-white px-12 py-10 flex items-center"
          style={{ border: `1px solid ${LINE}` }}
        >
          {current ? (
            <FitText max={30} min={11}>
              <p className="whitespace-pre-wrap" style={{ color: INK }}>
                {highlight(current.text, current.terms)}
              </p>
            </FitText>
          ) : (
            <div className="w-full text-center text-[12px] opacity-35" style={{ color: INK }}>
              {empty}
            </div>
          )}
        </div>

        <div className="h-4 shrink-0 flex items-baseline justify-between text-[10px]" style={{ color: INK }}>
          <span className="truncate opacity-40">{current ? current.source : ""}</span>
          <span className="tabular-nums shrink-0" style={{ color: total ? ORANGE : "transparent" }}>
            {total ? `${index + 1} / ${total}` : "."}
          </span>
        </div>
      </div>

      <Arrow
        dir="right"
        onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
        disabled={!total || index >= total - 1}
      />
    </div>
  );
}
