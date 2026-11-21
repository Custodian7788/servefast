import React, { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FitText from "./FitText.jsx";
import { FRAME, INK, ORANGE } from "../../theme.js";

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
      className={`absolute top-1/2 -translate-y-1/2 ${dir === "left" ? "left-2" : "right-2"} p-1 disabled:opacity-15 hover:opacity-60 transition-opacity`}
      style={{ color: ORANGE }}
      aria-label={dir === "left" ? "Previous passage" : "Next passage"}
    >
      <Icon size={24} strokeWidth={1.5} />
    </button>
  );
}

function shortDate(value) {
  if (!value) return "";
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return "";
  return when
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

function tidyAddress(value) {
  if (!value) return "";
  const first = value.split(",")[0].trim();
  const named = /^(.*?)[<(]/.exec(first);
  return (named ? named[1] : first).replace(/["']/g, "").trim() || first;
}

// What the passage came from, along the foot of the card.
function SourceLine({ hit, index, total }) {
  const meta = hit.doc?.meta;
  const title = meta?.subject || hit.source;
  const bits = [
    meta?.from ? `from ${tidyAddress(meta.from)}` : null,
    shortDate(meta?.date),
    meta?.subject ? hit.source : null,
    `passage ${hit.place} of ${hit.of}`,
  ].filter(Boolean);

  return (
    <div className="absolute left-0 right-0 bottom-0 px-5 pb-3 pt-6 pointer-events-none">
      <div className="flex items-end justify-between gap-4" style={{ color: INK }}>
        <div className="min-w-0">
          <div className="truncate text-[11px] font-bold" title={title}>
            {title}
          </div>
          <div className="truncate text-[10px] opacity-45">{bits.join("  ·  ")}</div>
        </div>
        <div className="shrink-0 text-[11px] tabular-nums font-bold" style={{ color: ORANGE }}>
          {index + 1} / {total}
        </div>
      </div>
    </div>
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
    <div className="flex-1 min-h-0 p-3">
      <div
        className="relative h-full w-full rounded-md bg-white overflow-hidden"
        style={{ border: `1px solid ${FRAME}` }}
      >
        <div className="h-full w-full flex items-center px-16 pt-12 pb-20">
          {current ? (
            <FitText max={30} min={11}>
              <p className="whitespace-pre-wrap" style={{ color: INK }}>
                {highlight(current.text, current.terms)}
              </p>
            </FitText>
          ) : (
            <div className="w-full text-center text-[12px] opacity-45" style={{ color: INK }}>
              {empty}
            </div>
          )}
        </div>

        <Arrow dir="left" onClick={() => setIndex((i) => Math.max(i - 1, 0))} disabled={!total || index === 0} />
        <Arrow
          dir="right"
          onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
          disabled={!total || index >= total - 1}
        />

        {current && <SourceLine hit={current} index={index} total={total} />}
      </div>
    </div>
  );
}
