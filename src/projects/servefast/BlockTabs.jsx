import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { INK, LINE, ORANGE } from "../../theme.js";
import Story, { sinceLabel } from "./Story.jsx";
import Sources from "./Sources.jsx";

// Four tabs per block. They start unnamed - you name them as the block takes
// shape. The first one is the one wired to the feeds.
export const TABS = ["t1", "t2", "t3", "t4"];

// The carve-up people actually track, each one an ETF sector.
export const CATEGORIES = [
  "AI",
  "Autonomous and EV",
  "Biotech and health tech",
  "Clean energy and grid",
  "Cloud and data centres",
  "Cybersecurity",
  "Defence tech",
  "Fintech",
  "Internet and platforms",
  "Robotics and automation",
  "Semiconductors",
  "Software",
  "Space",
];

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
  view,
  onView,
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
  const [pulling, setPulling] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [error, setError] = useState(null);

  // Where you were last looking. Kept in the workspace rather than in this
  // component, so a refresh lands on the same story, the same view and the
  // same industry.
  const where = view || {};
  const index = where.index || 0;
  const reading = Boolean(where.reading);
  const category = where.category || "";
  const layer = where.layer || 0;
  const effectAt = where.effectAt || 0;
  const go = (patch) => onView?.(patch);

  const askedOnce = useRef(false);
  const all = tabs?.[tab] || [];
  const items = category ? all.filter((i) => i.category === category) : all;
  const current = items[Math.min(index, Math.max(items.length - 1, 0))];
  const feedTab = TABS[0];

  async function pull(topUp = false) {
    if (!topUp) setPulling(true);
    setError(null);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ extra: feeds, since: topUp ? lastPull : 0 }),
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
      if (topUp) {
        // Newest on top, nothing lost, no duplicates.
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const kept = all.filter((i) => !i.publishedAt || Date.parse(i.publishedAt) >= dayAgo);
        const seen = new Set(kept.map((i) => i.text));
        const fresh = pulled.filter((e) => !seen.has(e.text));
        if (fresh.length || kept.length !== all.length) {
          onReplace(feedTab, [...fresh, ...kept].slice(0, 60));
        }
        onPulled?.(Date.now(), (data.read || 0) + (read || 0));
      } else if (!pulled.length) {
        setError("Nothing qualified from today's feeds");
      } else {
        onReplace(feedTab, pulled);
        onPulled?.(Date.now(), data.read || 0);
        setTab(feedTab);
        go({ index: 0, layer: 0, effectAt: 0, reading: false });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (!topUp) setPulling(false);
    }
  }

  // A full sweep is the one expensive call, so an open does not set one off
  // unless the block is genuinely out of date.
  const stale = !lastPull || Date.now() - lastPull > 12 * 60 * 60 * 1000;

  useEffect(() => {
    if (!autoPull) return;
    if (!askedOnce.current) {
      askedOnce.current = true;
      if (stale) pull();
    }
    const timer = setInterval(() => {
      if (pulling) return;
      // Nobody is looking, so nothing is spent.
      if (typeof document !== "undefined" && document.hidden) return;
      if (!lastPull || Date.now() - lastPull > 24 * 60 * 60 * 1000) pull();
      else pull(true);
    }, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [autoPull, lastPull, pulling]);

  // The title row shows the state of play and holds the refresh.
  useEffect(() => {
    const refresh = () => {
      const fresh = lastPull && Date.now() - lastPull < 24 * 60 * 60 * 1000;
      pull(Boolean(fresh && all.length));
    };
    onStatus?.({ pulling, lastPull, refresh, openSources: () => setShowSources(true) });
  }, [pulling, lastPull, feeds.length, all.length]);

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
            <Story
            item={current}
            view={layer}
            onView={(n) => go({ layer: n })}
            effectAt={effectAt}
            onEffect={(n) => go({ effectAt: n })}
          />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="shrink-0 px-2 py-1.5" style={{ borderBottom: `1px solid ${LINE}` }}>
              <select
                value={category}
                onChange={(e) => go({ category: e.target.value, index: 0, layer: 0, effectAt: 0 })}
                className="w-full h-6 px-1.5 rounded bg-white text-[11px] outline-none cursor-pointer"
                style={{ border: `1px solid ${LINE}`, color: INK }}
              >
                <option value="">All categories · {all.length}</option>
                {CATEGORIES.map((name) => {
                  const n = all.filter((i) => i.category === name).length;
                  return (
                    <option key={name} value={name} disabled={!n}>
                      {name} · {n}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
            {items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => go({ index: i, layer: 0, effectAt: 0, reading: true })}
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
            {!items.length && (
              <div className="p-3 text-[12px] opacity-40" style={{ color: INK }}>
                Nothing in that category today
              </div>
            )}
            </div>
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
              onClick={() => go({ reading: false })}
              className="flex items-center gap-1 text-[11px] font-bold tracking-[0.07em] hover:opacity-70"
              style={{ color: ORANGE }}
            >
              <List size={12} /> LIST
            </button>
            <span className="flex-1" />
            <button
              onClick={() => go({ index: Math.max(index - 1, 0), layer: 0, effectAt: 0 })}
              disabled={index === 0}
              className="disabled:opacity-20"
              style={{ color: ORANGE }}
              aria-label="Previous story"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => go({ index: Math.min(index + 1, items.length - 1), layer: 0, effectAt: 0 })}
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
