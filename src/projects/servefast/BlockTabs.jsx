import React, { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { INK, LINE, ORANGE } from "../../theme.js";
import { sinceLabel } from "./Story.jsx";
import Sources from "./Sources.jsx";

// Four tabs per block. They start unnamed - you name them as the block takes
// shape. The first one is the one wired to the feeds.
export const TABS = ["t1", "t2", "t3", "t4"];

// How far back the list reaches, and how often it refreshes itself.
export const HOURS = 12;

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
  const readingId = where.readingId || null;
  const go = (patch) => onView?.(patch);

  // The list has no scrollbar. It moves one headline at a time on the two
  // buttons, and says where in the chain you are.
  const listRef = useRef(null);
  const [at, setAt] = useState({ first: 0, end: false, cut: Infinity, part: 0 });

  // A headline half off the bottom edge is worse than a gap, so the first row
  // that does not fit whole is hidden along with everything under it.
  function measure() {
    const box = listRef.current;
    if (!box) return;
    const rows = Array.from(box.children);
    const top = box.scrollTop;
    const bottom = top + box.clientHeight;

    let first = rows.findIndex((row) => row.offsetTop >= top - 2);
    if (first < 0) first = Math.max(rows.length - 1, 0);

    let cut = rows.findIndex((row, i) => i >= first && row.offsetTop + row.offsetHeight > bottom + 2);
    if (cut < 0) cut = rows.length;
    // Never hide everything: a row taller than the block still shows.
    if (cut <= first) cut = first + 1;

    const room = box.scrollHeight - box.clientHeight;
    setAt({
      first,
      cut,
      end: bottom >= box.scrollHeight - 2,
      part: room > 0 ? Math.min(Math.max(top / room, 0), 1) : 0,
    });
  }

  function step(direction) {
    const box = listRef.current;
    if (!box) return;
    const rows = Array.from(box.children);
    const top = box.scrollTop;
    const next =
      direction > 0
        ? rows.find((row) => row.offsetTop > top + 2)
        : [...rows].reverse().find((row) => row.offsetTop < top - 2);
    box.scrollTo({ top: next ? next.offsetTop : 0, behavior: "smooth" });
  }

  // A new list, or a new filter, starts at the top.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
    setAt({ first: 0, end: false, cut: Infinity, part: 0 });
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [category, tabs?.[TABS[0]]?.length]);

  // A block that changes size changes how many rows fit whole.
  useEffect(() => {
    const box = listRef.current;
    if (!box || typeof ResizeObserver === "undefined") return undefined;
    const watch = new ResizeObserver(() => measure());
    watch.observe(box);
    return () => watch.disconnect();
  }, []);

  const askedOnce = useRef(false);
  const feedTab = TABS[0];
  const all = tabs?.[feedTab] || [];
  const items = category ? all.filter((i) => i.category === category) : all;

  // A sweep costs under a cent, so there is nothing clever to do: read the
  // feeds, keep the last twelve hours, replace the list.
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
        setError("Nothing qualified from the last twelve hours");
      } else {
        onReplace(feedTab, pulled);
        onPulled?.(Date.now(), data.read || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPulling(false);
    }
  }

  const stale = !lastPull || Date.now() - lastPull > HOURS * 60 * 60 * 1000;

  useEffect(() => {
    if (!autoPull) return;
    if (!askedOnce.current) {
      askedOnce.current = true;
      if (stale) pull();
    }
    // Checks often, pulls twice a day. A tab left open overnight wakes up
    // with the morning's list rather than yesterday's.
    const timer = setInterval(() => {
      if (pulling) return;
      if (typeof document !== "undefined" && document.hidden) return;
      if (!lastPull || Date.now() - lastPull > HOURS * 60 * 60 * 1000) pull();
    }, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [autoPull, lastPull, pulling]);

  // The title row shows the state of play and holds the refresh.
  useEffect(() => {
    onStatus?.({ pulling, lastPull, refresh: pull, openSources: () => setShowSources(true) });
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

            {/* Where you are in the chain, and the two steps. */}
            <div
              className="shrink-0 flex items-center gap-2 px-2 h-7"
              style={{ borderBottom: `1px solid ${LINE}` }}
            >
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={at.first === 0}
                className="disabled:opacity-20 hover:opacity-70"
                style={{ color: ORANGE }}
                aria-label="Up one"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                disabled={at.end}
                className="disabled:opacity-20 hover:opacity-70"
                style={{ color: ORANGE }}
                aria-label="Down one"
              >
                <ChevronDown size={14} />
              </button>

              {at.first > 0 && (
                <button
                  type="button"
                  onClick={() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                  className="shrink-0 text-[10px] font-bold uppercase tracking-[0.09em] hover:opacity-70"
                  style={{ color: ORANGE }}
                >
                  Top
                </button>
              )}

              {/* The line is a track: click along it to jump. */}
              <button
                type="button"
                aria-label="Jump through the list"
                onClick={(e) => {
                  const box = listRef.current;
                  if (!box) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const part = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                  box.scrollTo({ top: part * (box.scrollHeight - box.clientHeight), behavior: "smooth" });
                }}
                className="group flex-1 h-5 flex items-center"
              >
                <span
                  className="block w-full rounded-full overflow-hidden"
                  style={{ height: 3, backgroundColor: LINE }}
                >
                  <span
                    className="block h-full rounded-full transition-[width] duration-200"
                    style={{ backgroundColor: ORANGE, width: `${Math.round(at.part * 100)}%` }}
                  />
                </span>
              </button>

              <span
                className="shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] tabular-nums opacity-45"
                style={{ color: INK }}
              >
                {Math.min(at.first + 1, items.length)} of {items.length}
              </span>
            </div>

            {/* Nothing is written by us, so reading costs nothing at all. */}
            <div
              ref={listRef}
              onScroll={measure}
              className="no-bar relative flex-1 min-h-0 overflow-y-auto"
            >
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go({ readingId: item.id })}
                  className="block w-full text-left px-3 py-2 hover:bg-[#FFF8F2] transition-colors"
                  style={{
                    borderTop: i ? `1px solid ${LINE}` : "none",
                    visibility: i >= at.cut ? "hidden" : "visible",
                  }}
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
    </div>
  );
}
