import React, { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { INK, LINE, ORANGE } from "../../theme.js";

// One story. The headline and its age are always on screen; underneath, one
// view at a time - the summary, then what it means for an industry - toggled
// left and right by you. Nothing scrolls: the type gives way instead.
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

function Fitted({ children, max = 13, min = 8.5 }) {
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
      <div ref={inner}>{children}</div>
    </div>
  );
}

export default function Story({ item, view = 0, onView }) {
  const views = [];
  if (item.summary) views.push("Summary");
  if (item.effects?.length) views.push("Perspective");

  const at = views.length ? Math.min(view, views.length - 1) : 0;
  const showing = views[at];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Always on screen */}
      <div className="shrink-0">
        <p className="text-[13px] font-bold leading-[1.3]" style={{ color: INK }}>
          {item.text}
        </p>
        {item.publishedAt && (
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.07em]" style={{ color: ORANGE }}>
            {sinceLabel(item.publishedAt)}
          </div>
        )}
      </div>

      {views.length > 0 && (
        <>
          {/* Which view you are on */}
          <div
            className="shrink-0 mt-2 pt-1.5 flex items-center gap-1.5"
            style={{ borderTop: `1px solid ${LINE}` }}
          >
            <button
              onClick={() => onView(Math.max(at - 1, 0))}
              disabled={at === 0}
              className="disabled:opacity-20 hover:opacity-70"
              style={{ color: ORANGE }}
              aria-label="Previous view"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="flex-1 text-[8.5px] font-bold uppercase tracking-[0.09em]" style={{ color: ORANGE }}>
              {showing}
            </span>
            <button
              onClick={() => onView(Math.min(at + 1, views.length - 1))}
              disabled={at >= views.length - 1}
              className="disabled:opacity-20 hover:opacity-70"
              style={{ color: ORANGE }}
              aria-label="Next view"
            >
              <ChevronRight size={12} />
            </button>
          </div>

          {/* The view itself */}
          <div className="flex-1 min-h-0 mt-1.5">
            <Fitted>
              {showing === "Summary" ? (
                <p className="leading-[1.45] opacity-85" style={{ color: INK }}>
                  {item.summary}
                </p>
              ) : (
                item.effects.map((effect, i) => (
                  <div key={i} className={i ? "mt-2.5" : ""}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: INK }}>
                        {effect.industry}
                      </span>
                      {effect.direction && (
                        <span
                          className="text-[8px] font-bold uppercase tracking-[0.06em] px-1 rounded-sm"
                          style={{
                            color: "#FFFFFF",
                            backgroundColor:
                              effect.direction === "tailwind"
                                ? "#6B9B4B"
                                : effect.direction === "headwind"
                                ? "#C0603A"
                                : "#9A9A9A",
                          }}
                        >
                          {effect.direction}
                        </span>
                      )}
                    </div>
                    <div className="leading-[1.45] opacity-85" style={{ color: INK }}>
                      {effect.consequence}
                    </div>
                    {effect.investing && (
                      <div className="mt-0.5 leading-[1.45]" style={{ color: ORANGE }}>
                        {effect.investing}
                      </div>
                    )}
                  </div>
                ))
              )}
            </Fitted>
          </div>
        </>
      )}
    </div>
  );
}
