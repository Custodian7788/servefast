import React, { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { FRAME, INK, LINE, ORANGE } from "../../theme.js";

// One box: empty it invites a drop, filled it lists what is loaded. Dropping
// or clicking anywhere in it adds more.
export default function DropZone({ docs, busy, error, onFiles, onRemove, onClear }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

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
        className="flex-1 min-h-0 flex flex-col rounded-md cursor-pointer transition-colors bg-white overflow-hidden"
        style={{ border: `1px ${over ? "solid" : "dashed"} ${over ? ORANGE : FRAME}` }}
      >
        {docs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: ORANGE }}>
            <Plus size={22} strokeWidth={1.25} className={busy ? "animate-pulse" : ""} />
            <span className="text-[11px] leading-none opacity-70">{busy ? "Reading…" : "Drop files"}</span>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-auto py-1">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="group flex items-baseline gap-2 px-2.5 py-[3px] text-[11px]"
                  style={{ color: INK }}
                >
                  <span className="flex-1 truncate" title={d.name}>
                    {d.name}
                  </span>
                  <span className="shrink-0 tabular-nums opacity-45">{d.words}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(d.id);
                    }}
                    className="shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100"
                    aria-label={`Remove ${d.name}`}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>

            <div
              className="shrink-0 flex items-center gap-1.5 px-2.5 h-7 text-[10px]"
              style={{ borderTop: `1px dashed ${LINE}`, color: ORANGE }}
            >
              <Plus size={12} strokeWidth={1.5} className={busy ? "animate-pulse" : ""} />
              <span className="flex-1 opacity-70">{busy ? "Reading…" : "Add more"}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="opacity-50 hover:opacity-100"
              >
                clear
              </button>
            </div>
          </>
        )}
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
    </div>
  );
}
