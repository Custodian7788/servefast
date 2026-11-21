import React from "react";
import DropZone from "./DropZone.jsx";
import { useDroppedText, wordCount } from "./useDroppedText.js";
import { INK, LINE, MAIN_BG, NAV_BG } from "../../theme.js";

export default function ServefastDesktop() {
  const { doc, busy, error, readFile, clear } = useDroppedText();

  return (
    <div className="h-screen w-full flex" style={{ backgroundColor: MAIN_BG, color: INK }}>
      {/* Main area: where the carved-up version will be presented. */}
      <main className="flex-1 min-w-0 overflow-auto p-4">
        {doc ? (
          <>
            <div className="text-[10px] uppercase tracking-wide opacity-60 mb-2">
              {doc.name} · {wordCount(doc.text)} words
            </div>
            <pre className="text-[12px] leading-relaxed whitespace-pre-wrap font-sans">{doc.text}</pre>
          </>
        ) : (
          <div className="text-[12px] opacity-50">Nothing loaded yet.</div>
        )}
      </main>

      <aside
        className="w-64 shrink-0 border-l"
        style={{ backgroundColor: NAV_BG, borderColor: LINE }}
      >
        <DropZone onFile={readFile} doc={doc} busy={busy} error={error} onClear={clear} />
      </aside>
    </div>
  );
}
