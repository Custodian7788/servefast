import React, { useEffect, useRef, useState } from "react";
import { INK, LINE, ORANGE } from "../../theme.js";

// One story, revealed a layer at a time: headline, then the summary, then
// what it means for an industry. Nothing scrolls - the type gives way instead.
export function sinceLabel(iso) {
  const then = Date.parse(iso);
  if (!then) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function Fitted({ children, max = 15, min = 8.5 }) {
  const box = useRef(null);
  const inner = useRef(null);

  useEffect(() => {
    const b = box.current;
    const t = inner.current;
    if (!b || !t) return;
    let size = max;
    t.style.fontSize = `${size}px`;
    while (size > min && (t.scrollHeight > b.clientHeight || t.scrollWidth > b.clientWidth)) {
      size -= 0.5;
      t.style.fontSize = `${size}px`;
    }
  });

  return (
    <div ref={box} className="h-full w-full overflow-hidden">
      <div ref={inner} style={{ fontSize: max }}>
        {children}
      </div>
    </div>
  );
}

export const LAYERS = ["Headline", "Summary", "Perspective"];

export default function Story({ item, layer, onLayer }) {
  const hasSummary = Boolean(item.summary);
  const hasPerspective = Boolean(item.effects?.length);

  // Only offer the layers this story actually has, so a step never lands on
  // an empty one. Stories pulled before summaries existed go straight to
  // perspective.
  const steps = [
    hasSummary ? { label: "Summary", show: 1 } : null,
    hasPerspective ? { label: "Perspective", show: 2 } : null,
  ].filter(Boolean);
  const at = steps.findIndex((step) => step.show > layer);
  const next = at === -1 ? null : steps[at];

  return (
    <Fitted>
      {/* Headline, always */}
      <p className="font-bold leading-[1.3]" style={{ color: INK }}>
        {item.text}
        {item.publishedAt && (
          <span className="ml-2 align-baseline text-[9px] font-bold uppercase tracking-[0.06em] whitespace-nowrap" style={{ color: ORANGE }}>
            {sinceLabel(item.publishedAt)}
          </span>
        )}
      </p>

      {/* What the story says */}
      {layer >= 1 && hasSummary && (
        <p
          className="mt-2.5 pt-2.5 leading-[1.45] opacity-80"
          style={{ color: INK, fontSize: "0.82em", borderTop: `1px solid ${LINE}` }}
        >
          {item.summary}
        </p>
      )}

      {/* What it means */}
      {layer >= 2 && hasPerspective && (
        <div className="mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${LINE}` }}>
          <div className="text-[8.5px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: ORANGE }}>
            Perspective
          </div>
          {item.effects.map((effect, i) => (
            <div key={i} className="mt-1 leading-[1.4]" style={{ fontSize: "0.82em" }}>
              <span className="font-bold uppercase tracking-[0.05em]" style={{ color: INK }}>
                {effect.industry}
              </span>
              <span className="mx-1.5 opacity-30" style={{ color: INK }}>
                —
              </span>
              <span className="opacity-80" style={{ color: INK }}>
                {effect.consequence}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Where you are in the story */}
      {steps.length > 0 && (
        <button
          onClick={() => onLayer(next ? next.show : 0)}
          className="mt-3 text-[9px] font-bold uppercase tracking-[0.08em] hover:opacity-70"
          style={{ color: ORANGE }}
        >
          {next ? next.label : "Collapse"}
        </button>
      )}
    </Fitted>
  );
}
