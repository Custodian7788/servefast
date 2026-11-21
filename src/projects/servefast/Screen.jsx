import React from "react";
import DropZone from "./DropZone.jsx";
import { useDroppedText, wordCount } from "./useDroppedText.js";
import { INK, LINE, MAIN_BG, NAV_BG } from "../../theme.js";

// The whole app: a main area, and a narrower panel for dropping files.
// Side by side on a wide screen, stacked on a narrow one.
export default function Screen() {
  const { doc, busy, error, readFile, clear } = useDroppedText();

  return (
    <div
      className="h-screen w-full flex flex-col md:flex-row"
      style={{ backgroundColor: MAIN_BG, color: INK }}
    >
      <main className="flex-1 min-h-0 min-w-0 overflow-auto p-4">
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
        className="h-32 md:h-auto md:w-72 shrink-0 border-t md:border-t-0 md:border-l"
        style={{ backgroundColor: NAV_BG, borderColor: LINE }}
      >
        <DropZone onFile={readFile} doc={doc} busy={busy} error={error} onClear={clear} />
      </aside>
    </div>
  );
}
