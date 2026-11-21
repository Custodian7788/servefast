import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { INK, LINE, ORANGE } from "../../theme.js";

const CARD = "#FFFFFF";
const HEAD = "#FBF0DC";

// Files panel: a drop card on top, then a plain table of what is loaded.
export default function DropZone({ docs, busy, error, onFiles, onRemove, onClear }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  const words = docs.reduce((sum, d) => sum + (d.words || 0), 0);

  return (
    <div className="h-full flex flex-col gap-2">
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
        className="shrink-0 h-20 flex flex-col items-center justify-center gap-1 rounded cursor-pointer transition-colors"
        style={{
          backgroundColor: over ? "#FFF3E6" : CARD,
          border: `1px solid ${over ? ORANGE : LINE}`,
          outline: `1px dashed ${over ? ORANGE : "#E6D5B6"}`,
          outlineOffset: "-5px",
          color: over ? ORANGE : INK,
        }}
      >
        <Upload size={14} className={busy ? "animate-pulse" : ""} />
        <span className="text-[11px] leading-none">{busy ? "Reading…" : "Drop files"}</span>
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
          className="shrink-0 px-2 py-1 rounded text-[10px] leading-snug"
          style={{ backgroundColor: "#FBE3DF", border: "1px solid #EFC9C2", color: "#A33427" }}
        >
          {error}
        </div>
      )}

      <div
        className="flex-1 min-h-0 flex flex-col rounded overflow-hidden"
        style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}
      >
        <div
          className="shrink-0 flex items-center gap-2 px-2 h-6 text-[9px] font-bold uppercase tracking-[0.08em]"
          style={{ backgroundColor: HEAD, borderBottom: `1px solid ${LINE}`, color: INK }}
        >
          <span className="flex-1">File</span>
          <span className="w-10 text-right">Words</span>
          <span className="w-3 text-right">
            {docs.length > 0 && (
              <button onClick={onClear} title="Clear all" className="hover:opacity-100 opacity-45">
                <X size={10} />
              </button>
            )}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {docs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[10px] opacity-40" style={{ color: INK }}>
              No files yet
            </div>
          ) : (
            docs.map((d) => (
              <div
                key={d.id}
                className="group flex items-center gap-2 px-2 h-6 text-[11px]"
                style={{ color: INK, borderBottom: `1px solid ${HEAD}` }}
              >
                <span className="flex-1 truncate" title={d.name}>
                  {d.name}
                </span>
                <span className="w-10 text-right tabular-nums opacity-55">{d.words}</span>
                <span className="w-3 text-right">
                  <button
                    onClick={() => onRemove(d.id)}
                    className="opacity-0 group-hover:opacity-50 hover:!opacity-100"
                    aria-label={`Remove ${d.name}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>

        {docs.length > 0 && (
          <div
            className="shrink-0 flex items-center gap-2 px-2 h-6 text-[10px]"
            style={{ backgroundColor: HEAD, borderTop: `1px solid ${LINE}`, color: INK }}
          >
            <span className="flex-1">
              {docs.length} file{docs.length === 1 ? "" : "s"}
            </span>
            <span className="w-10 text-right tabular-nums font-bold">{words.toLocaleString("en-GB")}</span>
            <span className="w-3" />
          </div>
        )}
      </div>
    </div>
  );
}
