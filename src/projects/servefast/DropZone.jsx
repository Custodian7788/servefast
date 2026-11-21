import React, { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { FRAME, INK, ORANGE } from "../../theme.js";

// Files panel: a plus tile to drop on, then the list of what is loaded.
export default function DropZone({ docs, busy, error, onFiles, onRemove, onClear }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  return (
    <div className="h-full flex flex-col gap-3">
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
        className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 rounded-md cursor-pointer transition-colors bg-white"
        style={{
          border: `1px ${over ? "solid" : "dashed"} ${over ? ORANGE : FRAME}`,
          color: over ? ORANGE : INK,
        }}
      >
        <Plus size={22} strokeWidth={1.25} className={busy ? "animate-pulse" : ""} />
        <span className="text-[11px] leading-none opacity-60">{busy ? "Reading…" : "Drop files"}</span>
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
        <div className="shrink-0 text-[10px] leading-snug" style={{ color: "#A33427" }}>
          {error}
        </div>
      )}

      <div className="shrink-0 max-h-32 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          {docs.map((d) => (
            <div key={d.id} className="group flex items-baseline gap-2 py-[3px] text-[11px]" style={{ color: INK }}>
              <span className="flex-1 truncate" title={d.name}>
                {d.name}
              </span>
              <span className="shrink-0 tabular-nums opacity-35">{d.words}</span>
              <button
                onClick={() => onRemove(d.id)}
                className="shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-100"
                aria-label={`Remove ${d.name}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>

        {docs.length > 1 && (
          <button
            onClick={onClear}
            className="shrink-0 self-start mt-1 text-[10px] opacity-40 hover:opacity-80"
            style={{ color: INK }}
          >
            clear all
          </button>
        )}
      </div>
    </div>
  );
}
