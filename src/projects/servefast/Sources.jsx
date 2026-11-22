import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { FRAME, INK, LINE, ORANGE } from "../../theme.js";

// Which feeds the block reads, and the ones you have added yourself.
export default function Sources({ extra = [], onAdd, onRemove, onClose }) {
  const [builtIn, setBuiltIn] = useState(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then((data) => setBuiltIn(data.sources || []))
      .catch(() => setBuiltIn([]));
  }, []);

  function submit(e) {
    e.preventDefault();
    const url = draft.trim();
    if (!/^https?:\/\//i.test(url)) return;
    onAdd(url);
    setDraft("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ backgroundColor: "rgba(43,43,43,0.25)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md h-[85vh] sm:h-auto sm:max-h-[70vh] flex flex-col rounded-t-xl sm:rounded-md bg-white overflow-hidden"
        style={{ border: `1px solid ${FRAME}` }}
        onClick={(e) => e.stopPropagation()}
      >
      <div
        className="shrink-0 flex items-center px-3 h-10 sm:h-7 text-[12px] sm:text-[11.5px] font-bold tracking-[0.07em]"
        style={{ borderBottom: `1px solid ${LINE}`, color: ORANGE }}
      >
        <span className="flex-1">
          SOURCES {builtIn ? `· ${builtIn.length + extra.length}` : ""}
        </span>
        <button onClick={onClose} className="opacity-50 hover:opacity-100" style={{ color: INK }} aria-label="Close">
          <X size={16} className="sm:hidden" />
          <X size={11} className="hidden sm:block" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 content-start">
        {extra.map((url) => (
          <div key={url} className="group flex items-baseline gap-2 py-1.5 sm:py-[2px] text-[14px] sm:text-[12px]" style={{ color: INK }}>
            <span className="truncate flex-1" title={url}>
              {url.replace(/^https?:\/\/(www\.)?/, "")}
            </span>
            <button
              onClick={() => onRemove(url)}
              className="shrink-0 opacity-50 sm:opacity-0 sm:group-hover:opacity-50 hover:!opacity-100"
              aria-label="Remove source"
            >
              <X size={9} />
            </button>
          </div>
        ))}

        {builtIn === null ? (
          <div className="text-[12px] opacity-40" style={{ color: INK }}>
            Loading…
          </div>
        ) : (
          builtIn.map((feed) => (
            <div key={feed.url} className="flex items-baseline gap-2 py-1.5 sm:py-[2px] text-[14px] sm:text-[12px]" style={{ color: INK }}>
              <span className="truncate flex-1" title={feed.url}>
                {feed.source}
              </span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="shrink-0 flex items-center gap-2 px-3 h-12 sm:h-8" style={{ borderTop: `1px solid ${LINE}` }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a feed URL"
          className="flex-1 min-w-0 text-[14px] sm:text-[12px] outline-none bg-transparent placeholder:opacity-35"
          style={{ color: ORANGE }}
        />
        <button type="submit" className="text-[13px] sm:text-[11px] font-bold tracking-[0.07em]" style={{ color: ORANGE }}>
          ADD
        </button>
      </form>
      </div>
    </div>
  );
}
