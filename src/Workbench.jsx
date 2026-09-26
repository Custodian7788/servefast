import React from "react";
import { LINE, INK, ORANGE } from "./theme.js";

// Shows a project's two real UIs side by side: the desktop route in a wide
// frame, the mobile route inside a phone shell. Both are the live app, so
// whatever proves out here is what ships.
function FrameLabel({ text, href }) {
  return (
    <div className="flex items-baseline gap-2 mb-1">
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: INK }}>
        {text}
      </span>
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
  return (
    <div className="flex gap-4 items-start p-3">
      <section className="flex-1 min-w-0">
        <FrameLabel text="Desktop" href={`${base}/desktop`} />
        <div className="rounded border overflow-hidden" style={{ borderColor: LINE }}>
          <iframe
            title={`${name} desktop`}
            src={`${base}/desktop`}
            className="w-full block"
            style={{ height: 620, border: 0 }}
          />
        </div>
      </section>

      <section className="shrink-0">
        <FrameLabel text="Mobile" href={`${base}/mobile`} />
        <div
          className="rounded-[34px] p-[9px]"
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
