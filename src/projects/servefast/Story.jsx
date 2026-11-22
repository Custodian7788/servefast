import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { INK, LINE, ORANGE } from "../../theme.js";

// One story. Headline and age stay on screen; underneath, one view at a time,
// toggled left and right. In Perspective you step through one industry at a
// time with its own pair of arrows. Two type sizes only: body and label.
const BODY = 14;
const LABEL = 10.5;

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

function Fitted({ children }) {
  const box = useRef(null);
  const inner = useRef(null);

  useEffect(() => {
    const b = box.current;
    const t = inner.current;
    if (!b || !t) return;
    let size = BODY;
    t.style.fontSize = `${size}px`;
    while (size > 10.5 && (t.scrollHeight > b.clientHeight || t.scrollWidth > b.clientWidth)) {
      size -= 0.5;
      t.style.fontSize = `${size}px`;
    }
  });

  return (
    <div ref={box} className="h-full w-full overflow-hidden">
      <div ref={inner} style={{ fontSize: BODY, lineHeight: 1.45 }}>
        {children}
      </div>
    </div>
  );
}

function Toggle({ label, at, of, onBack, onNext }) {
  return (
    <div className="shrink-0 flex items-center justify-center gap-3">
      <button
        onClick={onBack}
        disabled={at === 0}
        className="disabled:opacity-20 hover:opacity-70"
        style={{ color: ORANGE }}
        aria-label="Back"
      >
        <ChevronLeft size={13} />
      </button>
      <span
        className="font-bold uppercase tracking-[0.09em] text-center"
        style={{ color: ORANGE, fontSize: LABEL, minWidth: "9rem" }}
      >
        {label}
        {of > 1 && <span className="ml-1.5 opacity-50 tabular-nums">{at + 1}/{of}</span>}
      </span>
      <button
        onClick={onNext}
        disabled={at >= of - 1}
        className="disabled:opacity-20 hover:opacity-70"
        style={{ color: ORANGE }}
        aria-label="Forward"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

export default function Story({ item, view = 0, onView }) {
  const [effectAt, setEffectAt] = useState(0);

  useEffect(() => {
    setEffectAt(0);
  }, [item.id]);

  const views = [];
  if (item.summary) views.push("Summary");
  if (item.effects?.length) views.push("Perspective");
  if (!views.length) {
    return (
      <div className="h-full w-full flex flex-col">
        <p className="font-bold leading-[1.3]" style={{ color: INK, fontSize: BODY }}>
          {item.text}
        </p>
      </div>
    );
  }

  const at = Math.min(view, views.length - 1);
  const showing = views[at];
  const effects = item.effects || [];
  const effect = effects[Math.min(effectAt, Math.max(effects.length - 1, 0))];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Always on screen */}
      <div className="shrink-0">
        <p className="font-bold leading-[1.35]" style={{ color: INK, fontSize: BODY }}>
          {item.text}
        </p>
        {item.publishedAt && (
          <div
            className="mt-1 font-bold uppercase tracking-[0.07em]"
            style={{ color: ORANGE, fontSize: LABEL }}
          >
            {sinceLabel(item.publishedAt)}
          </div>
        )}
      </div>

      {/* Summary or Perspective */}
      <div className="shrink-0 mt-2 pt-2" style={{ borderTop: `1px solid ${LINE}` }}>
        <Toggle
          label={showing}
          at={at}
          of={views.length}
          onBack={() => onView(Math.max(at - 1, 0))}
          onNext={() => onView(Math.min(at + 1, views.length - 1))}
        />
      </div>

      <div className="flex-1 min-h-0 mt-2">
        <Fitted>
          {showing === "Summary" ? (
            <p className="opacity-85" style={{ color: INK }}>
              {item.summary}
            </p>
          ) : (
            <div>
              <div className="flex items-baseline justify-center gap-1.5">
                <span
                  className="font-bold uppercase tracking-[0.06em]"
                  style={{ color: INK, fontSize: LABEL }}
                >
                  {effect.industry}
                </span>
                {effect.direction && (
                  <span
                    className="font-bold uppercase tracking-[0.06em] px-1 rounded-sm"
                    style={{
                      fontSize: LABEL - 0.5,
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
              <p className="mt-1.5 opacity-85" style={{ color: INK }}>
                {effect.consequence}
              </p>
              {effect.investing && (
                <p className="mt-1.5" style={{ color: ORANGE }}>
                  {effect.investing}
                </p>
              )}
            </div>
          )}
        </Fitted>
      </div>

      {/* One industry at a time */}
      {showing === "Perspective" && effects.length > 1 && (
        <div className="shrink-0 pt-1.5" style={{ borderTop: `1px solid ${LINE}` }}>
          <Toggle
            label="Industry"
            at={Math.min(effectAt, effects.length - 1)}
            of={effects.length}
            onBack={() => setEffectAt((i) => Math.max(i - 1, 0))}
            onNext={() => setEffectAt((i) => Math.min(i + 1, effects.length - 1))}
          />
        </div>
      )}
    </div>
  );
}
