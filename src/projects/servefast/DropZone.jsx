import React, { useRef, useState } from "react";
import { X } from "lucide-react";
import { INK, LINE, ORANGE } from "../../theme.js";

// The narrow panel files are dragged onto.
export default function DropZone({ docs, busy, error, onFiles, onRemove, onClear }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  return (
    <div className="h-full flex flex-col gap-2 p-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="shrink-0 h-24 flex items-center justify-center rounded cursor-pointer text-center px-3"
        style={{
          border: `2px dashed ${over ? ORANGE : LINE}`,
          backgroundColor: over ? "#FFF3E6" : "transparent",
          color: INK,
        }}
      >
        <span className="text-[11px] leading-snug">
          {busy ? "Reading…" : "Drop files here, or click to pick"}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".msg,.eml,.txt,.md,.markdown,.csv,.json,.html,text/*"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      {error && (
        <div className="text-[11px]" style={{ color: "#C0392B" }}>
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center gap-1 py-0.5 text-[11px]" style={{ color: INK }}>
            <span className="truncate flex-1" title={d.name}>
              {d.name}
            </span>
            <span className="shrink-0 tabular-nums opacity-50">{d.words}w</span>
            <button onClick={() => onRemove(d.id)} className="shrink-0 opacity-50 hover:opacity-100" aria-label="Remove">
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      {docs.length > 1 && (
        <button onClick={onClear} className="shrink-0 text-[11px] underline self-start" style={{ color: ORANGE }}>
          clear all
        </button>
      )}
    </div>
  );
}
