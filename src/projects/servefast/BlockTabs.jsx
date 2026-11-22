import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { INK, LINE, ORANGE } from "../../theme.js";
import Story, { sinceLabel } from "./Story.jsx";
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

export default function BlockTabs({
  tabs,
  names = {},
  autoPull = false,
  feeds = [],
  lastPull,
  read = 0,
  onAdd,
  onRemove,
  onRename,
  onFeeds,
  onReplace,
  onPulled,
  onStatus,
}) {
  const [tab, setTab] = useState(TABS[0]);
  const [index, setIndex] = useState(0);
  const [reading, setReading] = useState(false);
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
        onPulled?.(Date.now(), data.read || 0);
        setTab(feedTab);
        setIndex(0);
        setLayer(0);
        setReading(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPulling(false);
    }
  }

  const stale = !lastPull || Date.now() - lastPull > 60 * 60 * 1000;

  useEffect(() => {
    if (!autoPull) return;
    if (!askedOnce.current) {
      askedOnce.current = true;
      if (stale) pull();
    }
    const timer = setInterval(() => {
      if (!pulling && (!lastPull || Date.now() - lastPull > 60 * 60 * 1000)) pull();
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [autoPull, lastPull, pulling]);

  // The title row shows the state of play and holds the refresh.
  useEffect(() => {
    onStatus?.({ pulling, lastPull, refresh: pull, openSources: () => setShowSources(true) });
  }, [pulling, lastPull, feeds.length]);

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
      {/* The list, or the story you picked */}
      <div className="flex-1 min-h-0">
        {pulling ? (
          <div className="h-full flex items-center justify-center text-[12px] tracking-[0.06em] uppercase" style={{ color: ORANGE }}>
            <span className="animate-pulse">Working on the feeds. Please wait.</span>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-center text-[12px] px-3" style={{ color: "#A33427" }}>
            {error}
          </div>
        ) : !items.length ? (
          <div className="h-full flex items-center justify-center text-[12px] opacity-35" style={{ color: INK }}>
            Nothing here yet
          </div>
        ) : reading && current ? (
          <div className="h-full px-3 py-2">
            <Story item={current} view={layer} onView={setLayer} />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => {
                  setIndex(i);
                  setLayer(0);
                  setReading(true);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#FFF8F2] transition-colors"
                style={{ borderTop: i ? `1px solid ${LINE}` : "none" }}
              >
                <span className="block text-[13px] leading-[1.35]" style={{ color: INK }}>
                  {item.text}
                </span>
                {item.publishedAt && (
                  <span
                    className="block mt-0.5 text-[10px] font-bold uppercase tracking-[0.06em] opacity-60"
                    style={{ color: ORANGE }}
                  >
                    {sinceLabel(item.publishedAt)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Where you are, while reading */}
      <div
        className={`shrink-0 flex items-center gap-2 px-2 ${reading ? "h-7" : "h-0 overflow-hidden"}`}
        style={{ borderTop: reading ? `1px solid ${LINE}` : "none" }}
      >
        {reading ? (
          <>
            <button
              onClick={() => setReading(false)}
              className="flex items-center gap-1 text-[11px] font-bold tracking-[0.07em] hover:opacity-70"
              style={{ color: ORANGE }}
            >
              <List size={12} /> LIST
            </button>
            <span className="flex-1" />
            <button
              onClick={() => {
                setLayer(0);
                setIndex((i) => Math.max(i - 1, 0));
              }}
              disabled={index === 0}
              className="disabled:opacity-20"
              style={{ color: ORANGE }}
              aria-label="Previous story"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => {
                setLayer(0);
                setIndex((i) => Math.min(i + 1, items.length - 1));
              }}
              disabled={index >= items.length - 1}
              className="disabled:opacity-20"
              style={{ color: ORANGE }}
              aria-label="Next story"
            >
              <ChevronRight size={14} />
            </button>
            <span className="text-[11px] tabular-nums font-bold" style={{ color: ORANGE }}>
              {index + 1}/{items.length}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
