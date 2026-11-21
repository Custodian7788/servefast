import React, { useRef, useState } from "react";
import { INK, LINE, ORANGE } from "../../theme.js";

// The narrow panel files are dragged onto.
export default function DropZone({ onFile, doc, busy, error, onClear }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setOver(false);
    onFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="h-full flex flex-col gap-2 p-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="flex-1 min-h-0 flex items-center justify-center rounded cursor-pointer text-center px-3"
        style={{
          border: `2px dashed ${over ? ORANGE : LINE}`,
          backgroundColor: over ? "#FFF3E6" : "transparent",
          color: INK,
        }}
      >
        <span className="text-[11px] leading-snug">
          {busy ? "Reading…" : "Drop a file here, or click to pick one"}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.markdown,.csv,.json,.html,text/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {error && (
        <div className="text-[11px]" style={{ color: "#C0392B" }}>
          {error}
        </div>
      )}

      {doc && (
        <div className="text-[11px] flex items-center gap-2" style={{ color: INK }}>
          <span className="truncate flex-1" title={doc.name}>
            {doc.name}
          </span>
          <button onClick={onClear} className="underline shrink-0" style={{ color: ORANGE }}>
            clear
          </button>
        </div>
      )}
    </div>
  );
}
