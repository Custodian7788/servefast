import React from "react";
import { LINE, INK } from "./theme.js";

// Shows a project's two real UIs side by side: the desktop route in a wide
// frame, the mobile route inside a phone shell. Both are live, not mockups.
export default function Workbench({ base, name }) {
  return (
    <div className="flex gap-4 items-start p-3">
      <section className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: INK }}>
          Desktop
        </div>
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
        <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: INK }}>
          Mobile
        </div>
        <div
          className="rounded-[34px] p-[9px]"
          style={{ backgroundColor: INK, width: 390 + 18, height: 780 + 18 }}
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
