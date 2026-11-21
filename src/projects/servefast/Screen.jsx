import React from "react";
import { FRAME, INK, MAIN_BG, NAV_BG } from "../../theme.js";

// The working area. Mini modules will live in here, each holding its own
// piece of intel and feeding the others.
export default function Screen() {
  return (
    <div className="h-screen w-full flex" style={{ backgroundColor: MAIN_BG, color: INK }}>
      <div className="flex-1 min-w-0 p-3">
        <div className="h-full w-full rounded-md bg-white" style={{ border: `1px solid ${FRAME}` }} />
      </div>

      <aside
        className="w-72 shrink-0 border-l flex flex-col"
        style={{ backgroundColor: NAV_BG, borderColor: FRAME }}
      >
        <div className="flex-[2] min-h-0 p-3">
          <div className="h-full w-full rounded-md bg-white" style={{ border: `1px solid ${FRAME}` }} />
        </div>
        <div className="flex-1 min-h-0 p-3 border-t" style={{ borderColor: FRAME }}>
          <div className="h-full w-full rounded-md bg-white" style={{ border: `1px solid ${FRAME}` }} />
        </div>
      </aside>
    </div>
  );
}
