import React, { useEffect, useRef, useState } from "react";
import { INK, LINE, ORANGE } from "../../theme.js";
import { sinceLabel } from "./Story.jsx";
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

export default function BlockTabs({
  tabs,
  view,
  onView,
  autoPull = false,
  feeds = [],
  lastPull,
  read = 0,
  onFeeds,
  onReplace,
  onPulled,
  onStatus,
}) {
  const [pulling, setPulling] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [error, setError] = useState(null);

  // Which category you had chosen. Kept in the workspace, so a refresh lands
  // on the same filter.
  const where = view || {};
  const category = where.category || "";
  const go = (patch) => onView?.(patch);

  const askedOnce = useRef(false);
  const all = tabs?.[TABS[0]] || [];
  const items = category ? all.filter((i) => i.category === category) : all;
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
          onReplace(feedTab, [...fresh, ...kept].slice(0, 200));
        }
        onPulled?.(Date.now(), (data.read || 0) + (read || 0));
      } else if (!pulled.length) {
        setError("Nothing qualified from today's feeds");
      } else {
        onReplace(feedTab, pulled);
        onPulled?.(Date.now(), data.read || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (!topUp) setPulling(false);
    }
  }

  // A full sweep is the one call that costs anything, so an open does not set
  // one off unless the block is genuinely out of date.
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

      <div className="flex-1 min-h-0">
        {pulling ? (
          <div
            className="h-full flex items-center justify-center text-[12px] tracking-[0.06em] uppercase"
            style={{ color: ORANGE }}
          >
            <span className="animate-pulse">Working on the feeds. Please wait.</span>
          </div>
        ) : error ? (
          <div
            className="h-full flex items-center justify-center text-center text-[12px] px-3"
            style={{ color: "#A33427" }}
          >
            {error}
          </div>
        ) : !all.length ? (
          <div className="h-full flex items-center justify-center text-[12px] opacity-35" style={{ color: INK }}>
            Nothing here yet
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="shrink-0 px-2 py-1.5" style={{ borderBottom: `1px solid ${LINE}` }}>
              <select
                value={category}
                onChange={(e) => go({ category: e.target.value })}
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

            {/* The headline is the link. Nothing is written by us, so reading
                costs nothing at all. */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {items.map((item, i) => (
                <a
                  key={item.id}
                  href={item.url || undefined}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block px-3 py-2 hover:bg-[#FFF8F2] transition-colors"
                  style={{ borderTop: i ? `1px solid ${LINE}` : "none" }}
                >
                  <span className="block text-[13px] leading-[1.35]" style={{ color: INK }}>
                    {item.text}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em]">
                    {item.publishedAt && (
                      <span className="opacity-60" style={{ color: ORANGE }}>
                        {sinceLabel(item.publishedAt)}
                      </span>
                    )}
                    {item.source && (
                      <>
                        <span className="opacity-25" style={{ color: INK }}>
                          |
                        </span>
                        <span className="opacity-45" style={{ color: INK }}>
                          {item.source}
                        </span>
                      </>
                    )}
                  </span>
                </a>
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
    </div>
  );
}
