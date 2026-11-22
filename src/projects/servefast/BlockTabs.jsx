import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { INK, LINE, ORANGE } from "../../theme.js";
import Story from "./Story.jsx";
import Sources from "./Sources.jsx";

// Four tabs per block. They start unnamed - you name them as the block takes
// shape. The first one is the one wired to the feeds.
export const TABS = ["t1", "t2", "t3", "t4"];

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

export default function BlockTabs({ tabs, names = {}, autoPull = false, feeds = [], onAdd, onRemove, onRename, onFeeds, onReplace }) {
  const [tab, setTab] = useState(TABS[0]);
  const [index, setIndex] = useState(0);
  const [layer, setLayer] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [error, setError] = useState(null);

  const askedOnce = useRef(false);
  const items = tabs?.[tab] || [];
  const current = items[Math.min(index, Math.max(items.length - 1, 0))];
  const feedTab = TABS[0];

  async function pull() {
    setPulling(true);
    setError(null);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ extra: feeds }),
      });
      const body = await response.text();
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        throw new Error("The feed service is not reachable from here");
      }
      if (!response.ok) throw new Error(data.error || "That did not work");
      const pulled = data.events || [];
      if (!pulled.length) {
        setError("Nothing qualified from today's feeds");
      } else {
        onReplace(feedTab, pulled);
        setTab(feedTab);
        setIndex(0);
        setLayer(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPulling(false);
    }
  }

  // Nothing stored yet: bring today's in without being asked.
  useEffect(() => {
    if (askedOnce.current) return;
    askedOnce.current = true;
    if (autoPull && !(tabs?.[TABS[0]] || []).length) pull();
  }, []);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {showSources && (
        <Sources
          extra={feeds}
          onAdd={(url) => onFeeds([...feeds, url])}
          onRemove={(url) => onFeeds(feeds.filter((f) => f !== url))}
          onClose={() => setShowSources(false)}
        />
      )}
      {/* One item at a time */}
      <div className="flex-1 min-h-0 px-3 py-2">
        {pulling ? (
          <div className="h-full flex items-center justify-center text-[12px] tracking-[0.06em] uppercase" style={{ color: ORANGE }}>
            <span className="animate-pulse">Reading the feeds…</span>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-center text-[12px] px-2" style={{ color: "#A33427" }}>
            {error}
          </div>
        ) : current ? (
          <Story item={current} view={layer} onView={setLayer} />
        ) : (
          <div className="h-full flex items-center justify-center text-[12px] opacity-35" style={{ color: INK }}>
            Nothing here yet
          </div>
        )}
      </div>

      {/* Move through them */}
      <div className="shrink-0 flex items-center gap-2 px-2 h-6" style={{ borderTop: `1px solid ${LINE}` }}>
        <button
          onClick={() => {
            setLayer(0);
            setIndex((i) => Math.max(i - 1, 0));
          }}
          disabled={!items.length || index === 0}
          className="disabled:opacity-20"
          style={{ color: ORANGE }}
          aria-label="Previous"
        >
          <ChevronLeft size={13} />
        </button>
        <button
          onClick={() => {
            setLayer(0);
            setIndex((i) => Math.min(i + 1, items.length - 1));
          }}
          disabled={!items.length || index >= items.length - 1}
          className="disabled:opacity-20"
          style={{ color: ORANGE }}
          aria-label="Next"
        >
          <ChevronRight size={13} />
        </button>
        <span className="flex-1" />
        <button
          onClick={() => setShowSources(true)}
          className="text-[11px] font-bold tracking-[0.07em] hover:opacity-70"
          style={{ color: ORANGE }}
        >
          SOURCES
        </button>
        <button
          onClick={pull}
          disabled={pulling}
          className="disabled:opacity-40"
          style={{ color: ORANGE }}
          aria-label="Pull today's events"
        >
          <RotateCw size={10} strokeWidth={2} className={pulling ? "animate-spin" : ""} />
        </button>
        <span className="text-[11px] tabular-nums font-bold" style={{ color: items.length ? ORANGE : "transparent" }}>
          {items.length ? `${index + 1}/${items.length}` : "."}
        </span>
      </div>
    </div>
  );
}
