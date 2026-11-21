import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, RotateCw, X } from "lucide-react";
import { INK, LINE, ORANGE } from "../../theme.js";

export const TABS = ["EVENTS", "FORCES", "EXPOSURE", "FOCUS"];

// Shrinks an item until it fits its box: nothing inside a block ever scrolls.
function Fitted({ children }) {
  const box = useRef(null);
  const text = useRef(null);

  useEffect(() => {
    const b = box.current;
    const t = text.current;
    if (!b || !t) return;
    let size = 13;
    t.style.fontSize = `${size}px`;
    while (size > 8 && (t.scrollHeight > b.clientHeight || t.scrollWidth > b.clientWidth)) {
      size -= 0.5;
      t.style.fontSize = `${size}px`;
    }
  });

  return (
    <div ref={box} className="h-full w-full overflow-hidden flex items-center">
      <div ref={text} className="w-full leading-[1.45]" style={{ color: INK }}>
        {children}
      </div>
    </div>
  );
}

export default function BlockTabs({ tabs, onAdd, onRemove }) {
  const [tab, setTab] = useState(TABS[0]);
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState(null);

  // EVENTS fills itself from the feeds, through the server route that holds
  // the key. Everything else is typed in.
  async function pull() {
    setPulling(true);
    setError(null);
    try {
      const response = await fetch("/api/events");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "That did not work");
      const pulled = data.events || [];
      pulled.forEach((event) => onAdd("EVENTS", event));
      if (!pulled.length) {
        setError("Nothing qualified from today's feeds");
      } else {
        // Land on the first of what just arrived, so the pull is visible.
        setTab("EVENTS");
        setIndex(items.length);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPulling(false);
    }
  }

  const items = tabs?.[tab] || [];
  const current = items[Math.min(index, Math.max(items.length - 1, 0))];

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAdd(tab, { id: `i-${Date.now()}`, date: new Date().toISOString().slice(0, 10), text });
    setDraft("");
    setAdding(false);
    setIndex(items.length);
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Tabs */}
      <div className="shrink-0 flex items-stretch h-6" style={{ borderBottom: `1px solid ${LINE}` }}>
        {TABS.map((name) => {
          const on = name === tab;
          return (
            <button
              key={name}
              onClick={() => {
                setTab(name);
                setIndex(0);
                setAdding(false);
              }}
              className="flex-1 min-w-0 text-[8.5px] font-bold tracking-[0.06em] truncate"
              style={{
                color: on ? "#FFFFFF" : INK,
                backgroundColor: on ? ORANGE : "transparent",
                borderRight: `1px solid ${LINE}`,
              }}
            >
              {name}
            </button>
          );
        })}
        {tab === "EVENTS" && (
          <button
            onClick={pull}
            disabled={pulling}
            className="shrink-0 w-6 flex items-center justify-center disabled:opacity-40"
            style={{ color: ORANGE }}
            aria-label="Pull today's events"
          >
            <RotateCw size={10} strokeWidth={2} className={pulling ? "animate-spin" : ""} />
          </button>
        )}
        <button
          onClick={() => setAdding((a) => !a)}
          className="shrink-0 w-6 flex items-center justify-center"
          style={{ color: ORANGE }}
          aria-label={`Add to ${tab}`}
        >
          <Plus size={11} strokeWidth={2} />
        </button>
      </div>

      {/* One item at a time */}
      <div className="flex-1 min-h-0 px-3 py-2">
        {adding ? (
          <form onSubmit={submit} className="h-full flex items-start">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) submit(e);
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder={tab === "EVENTS" ? "What happened, factually" : "Add to this tab"}
              className="h-full w-full resize-none text-[12px] leading-[1.45] outline-none placeholder:opacity-35"
              style={{ color: INK }}
            />
          </form>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-center text-[10px] px-2" style={{ color: "#A33427" }}>
            {error}
          </div>
        ) : current ? (
          <Fitted>
            {tab === "EVENTS" && (
              <span className="mr-1.5 text-[9px] font-bold tabular-nums align-top" style={{ color: ORANGE }}>
                {current.date?.slice(5).replace("-", " ")}
              </span>
            )}
            {current.text}
            {current.effects?.length > 0 && (
              <span className="block mt-2.5">
                {current.effects.map((effect, i) => (
                  <span key={i} className="block mt-1">
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.06em]" style={{ color: ORANGE }}>
                      {effect.industry}
                    </span>
                    <span className="ml-1.5 text-[11px] opacity-75">{effect.consequence}</span>
                  </span>
                ))}
              </span>
            )}
          </Fitted>
        ) : (
          <div className="h-full flex items-center justify-center text-[10px] opacity-35" style={{ color: INK }}>
            Nothing in {tab.toLowerCase()} yet
          </div>
        )}
      </div>

      {/* Move through them */}
      <div className="shrink-0 flex items-center gap-2 px-2 h-6" style={{ borderTop: `1px solid ${LINE}` }}>
        <button
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={!items.length || index === 0}
          className="disabled:opacity-20"
          style={{ color: ORANGE }}
          aria-label="Previous"
        >
          <ChevronLeft size={13} />
        </button>
        <button
          onClick={() => setIndex((i) => Math.min(i + 1, items.length - 1))}
          disabled={!items.length || index >= items.length - 1}
          className="disabled:opacity-20"
          style={{ color: ORANGE }}
          aria-label="Next"
        >
          <ChevronRight size={13} />
        </button>
        <span className="flex-1" />
        {current && (
          <button
            onClick={() => {
              onRemove(tab, current.id);
              setIndex(0);
            }}
            className="opacity-30 hover:opacity-80"
            style={{ color: INK }}
            aria-label="Remove item"
          >
            <X size={11} />
          </button>
        )}
        <span className="text-[9px] tabular-nums font-bold" style={{ color: items.length ? ORANGE : "transparent" }}>
          {items.length ? `${index + 1}/${items.length}` : "."}
        </span>
      </div>
    </div>
  );
}
