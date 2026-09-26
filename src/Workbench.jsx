import React, { useEffect, useRef, useState } from "react";
import { LINE, INK, ORANGE } from "./theme.js";

// A project's two real UIs, side by side. The desktop panel is treated as the
// browser window itself, so building inside it is building the real thing.
function FrameLabel({ text, href, note }) {
  return (
    <div className="flex items-baseline gap-2 mb-1">
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: INK }}>
        {text}
      </span>
      {note && (
        <span className="text-[10px] tabular-nums opacity-60" style={{ color: INK }}>
          {note}
        </span>
      )}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-[10px] underline"
        style={{ color: ORANGE }}
      >
        open
      </a>
    </div>
  );
}

export default function Workbench({ base, name }) {
  const deskRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = deskRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="h-full flex gap-4 items-stretch p-3">
      <section className="flex-1 min-w-0 flex flex-col">
        <FrameLabel text="Desktop" href={`${base}/desktop`} note={width ? `${width}px` : null} />
        <div
          ref={deskRef}
          className="flex-1 min-h-0 rounded border overflow-hidden"
          style={{ borderColor: LINE }}
        >
          <iframe
            title={`${name} desktop`}
            src={`${base}/desktop`}
            className="w-full h-full block"
            style={{ border: 0 }}
          />
        </div>
      </section>

      <section className="shrink-0 flex flex-col">
        <FrameLabel text="Mobile" href={`${base}/mobile`} note="390px" />
        <div
          className="rounded-[34px] p-[9px] shrink-0"
          style={{ backgroundColor: INK, width: 408, height: 798 }}
        >
          <div className="relative rounded-[26px] overflow-hidden bg-white" style={{ width: 390, height: 780 }}>
            <iframe
              title={`${name} mobile`}
              src={`${base}/mobile`}
              className="block"
              style={{ width: 390, height: 780, border: 0 }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full"
              style={{ bottom: 6, width: 120, height: 4, backgroundColor: INK, opacity: 0.35 }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
