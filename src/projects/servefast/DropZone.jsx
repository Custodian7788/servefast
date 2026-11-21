import React, { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { INK, LINE, ORANGE } from "../../theme.js";

// The narrow panel files are dragged onto.
export default function DropZone({ docs, busy, error, onFiles, onRemove, onClear }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  const words = docs.reduce((sum, d) => sum + (d.words || 0), 0);

  return (
    <div className="h-full flex flex-col">
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
        className="m-2 shrink-0 h-24 flex flex-col items-center justify-center gap-1.5 rounded cursor-pointer transition-colors"
        style={{
          border: `1.5px dashed ${over ? ORANGE : "#E2CCA4"}`,
          backgroundColor: over ? "#FFF3E6" : "rgba(255,255,255,0.45)",
          color: over ? ORANGE : INK,
        }}
      >
        <Upload size={15} className={busy ? "animate-pulse" : ""} />
        <span className="text-[11px] leading-none">{busy ? "Reading…" : "Drop files"}</span>
        <span className="text-[10px] leading-none opacity-50">or click to pick</span>
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
        <div
          className="mx-2 mb-1 px-2 py-1 rounded text-[10px] leading-snug"
          style={{ backgroundColor: "#FBE3DF", color: "#A33427" }}
        >
          {error}
        </div>
      )}

      {docs.length > 0 && (
        <div
          className="px-2.5 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide"
          style={{ color: INK, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}
        >
          <span>
            {docs.length} file{docs.length === 1 ? "" : "s"}
          </span>
          <span className="tabular-nums opacity-50">{words.toLocaleString("en-GB")} words</span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {docs.map((d) => (
          <div
            key={d.id}
            className="group flex items-center gap-1.5 px-2.5 py-1 text-[11px]"
            style={{ color: INK, borderBottom: `1px solid ${LINE}` }}
          >
            <FileText size={11} className="shrink-0 opacity-45" />
            <span className="truncate flex-1" title={d.name}>
              {d.name}
            </span>
            <span className="shrink-0 tabular-nums opacity-45">{d.words}</span>
            <button
              onClick={() => onRemove(d.id)}
              className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100"
              aria-label={`Remove ${d.name}`}
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      {docs.length > 0 && (
        <button
          onClick={onClear}
          className="shrink-0 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-left hover:opacity-70"
          style={{ color: ORANGE, borderTop: `1px solid ${LINE}` }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
