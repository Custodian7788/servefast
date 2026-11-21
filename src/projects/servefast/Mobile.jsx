import React from "react";
import DropZone from "./DropZone.jsx";
import { useDroppedText, wordCount } from "./useDroppedText.js";
import { INK, LINE, MAIN_BG, NAV_BG } from "../../theme.js";

export default function ServefastMobile() {
  const { doc, busy, error, readFile, clear } = useDroppedText();

  return (
    <div className="h-screen w-full flex flex-col" style={{ backgroundColor: MAIN_BG, color: INK }}>
      <main className="flex-1 min-h-0 overflow-auto p-3">
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

      <div className="h-28 shrink-0 border-t" style={{ backgroundColor: NAV_BG, borderColor: LINE }}>
        <DropZone onFile={readFile} doc={doc} busy={busy} error={error} onClear={clear} />
      </div>
    </div>
  );
}
