import React, { useEffect, useRef, useState } from "react";
import { RotateCw, Rss } from "lucide-react";
import { FRAME, INK, LINE, MAIN_BG, NAV_BG, ORANGE } from "../../theme.js";
import { makeModule, makePanel } from "./module.js";
import BlockTabs from "./BlockTabs.jsx";
import { Article, Perspective } from "./Reader.jsx";
import { loadModule, saveModule } from "./store.js";

const KEY = "workspace";

// A module is two blocks: the list, and the one that works on it.
const BLOCKS = 2;

// Block names are typed in all sorts of ways. A dropdown reads better with one
// capital at the front and the rest left alone, so acronyms survive.
function sentence(value = "") {
  const text = value.trim();
  if (!text) return "";
  const plain = new Set(["AND", "OR", "THE", "OF", "A", "AN", "IN", "ON", "TO", "FOR", "BY", "WITH"]);
  const words = text
    .split(" ")
    .map((word) =>
      word === word.toUpperCase() && word.length > 1 && !plain.has(word) ? word : word.toLowerCase()
    );
  const first = words[0];
  words[0] = first.charAt(0).toUpperCase() + first.slice(1);
  return words.join(" ");
}

function Card({ children, className = "", style }) {
  return (
    <div className={`rounded-md bg-white overflow-hidden ${className}`} style={{ border: `1px solid ${FRAME}`, ...style }}>
      {children}
    </div>
  );
}

export default function Screen() {
  const [space, setSpace] = useState({ modules: [], currentId: null });
  const [ready, setReady] = useState(false);
  const [justMade, setJustMade] = useState(null);
  const [naming, setNaming] = useState(null);
  const [status, setStatus] = useState({});
  const PER_PAGE = 2;

  // "pulled 12 min ago", in the block's title row.
  function sinceShort(at) {
    if (!at) return "never";
    const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    return hrs < 24 ? `${hrs} hr ago` : `${Math.round(hrs / 24)} d ago`;
  }
  const [focused, setFocused] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    loadModule(KEY).then((saved) => {
      if (saved?.modules?.length) {
        setSpace({
          ...saved,
          modules: saved.modules.map((m) => {
            const panels = (m.panels || []).map((panel) => {
              const old = panel.tabs?.EVENTS;
              if (!old?.length) return panel;
              const { EVENTS, ...rest } = panel.tabs;
              return { ...panel, tabs: { ...rest, t1: [...(rest.t1 || []), ...EVENTS] } };
            });
            // The module is two blocks by design: the list and the one beside
            // it. A module that has lost one gets it back.
            while (panels.length < BLOCKS) panels.push(makePanel());
            return { ...m, panels };
          }),
        });
      } else {
        const first = makeModule();
        while (first.panels.length < BLOCKS) first.panels.push(makePanel());
        setSpace({ modules: [first], currentId: first.id });
      }
      loaded.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (loaded.current) saveModule(KEY, space);
  }, [space]);

  // A module made just now gets the cursor, so the click clearly did something.
  useEffect(() => {
    if (!justMade) return;
    document.querySelector(`input[data-module="${justMade}"]`)?.focus();
    setJustMade(null);
  }, [justMade, space]);

  const module = space.modules.find((m) => m.id === space.currentId) || null;

  // The leftmost block on screen. It lives in the workspace, not in this
  // component, so a refresh puts you back where you were.
  const listPanel = module?.panels?.[0] || null;

  function setReading(id) {
    if (!listPanel) return;
    updatePanel(listPanel.id, (panel) => ({
      ...panel,
      view: { ...(panel.view || {}), readingId: id, frames: [] },
    }));
  }

  function setFrames(frames) {
    if (!listPanel) return;
    updatePanel(listPanel.id, (panel) => ({ ...panel, view: { ...(panel.view || {}), frames } }));
  }
  const openStoryItem =
    (listPanel?.tabs?.t1 || []).find((i) => i.id === listPanel?.view?.readingId) || null;

  if (!ready || !module) return <div className="h-screen w-full" style={{ backgroundColor: MAIN_BG }} />;

  function updateModule(fn) {
    setSpace((s) => ({ ...s, modules: s.modules.map((m) => (m.id === s.currentId ? fn(m) : m)) }));
  }

  function updatePanel(id, fn) {
    updateModule((m) => ({ ...m, panels: m.panels.map((p) => (p.id === id ? fn(p) : p)) }));
  }

  function addPanel() {
    updateModule((m) => ({ ...m, panels: [...m.panels, makePanel()] }));
  }

  return (
    <div className="h-screen w-full flex flex-col" style={{ backgroundColor: MAIN_BG, color: INK }}>
      {/* Modules */}
      <header
        className="shrink-0 h-9 flex items-center gap-1 px-2 sm:px-3 border-b overflow-x-auto"
        style={{ borderColor: FRAME, backgroundColor: NAV_BG }}
      >
        {space.modules.map((m) => {
          const active = m.id === space.currentId;
          return (
            <div
              key={m.id}
              onClick={(e) => {
                setSpace((s) => ({ ...s, currentId: m.id }));
                e.currentTarget.querySelector("input")?.focus();
              }}
              className="group shrink-0 flex items-center gap-1 w-32 sm:w-40 h-6 px-2 rounded cursor-pointer"
              style={{
                backgroundColor: active ? ORANGE : "transparent",
                border: `1px solid ${active ? ORANGE : FRAME}`,
              }}
            >
              <input
                value={m.field}
                data-module={m.id}
                readOnly={!active}
                onChange={(e) => updateModule((mod) => ({ ...mod, field: e.target.value }))}
                onFocus={() => setNaming(m.id)}
                onBlur={() => setNaming((id) => (id === m.id ? null : id))}
                maxLength={18}
                placeholder={naming === m.id ? "" : active ? "NAME IT" : "UNTITLED"}
                className={`flex-1 min-w-0 bg-transparent text-center text-[12px] font-bold tracking-[0.06em] uppercase outline-none ${
                  active ? "cursor-text" : "cursor-pointer"
                }`}
                style={{ color: active ? "#FFFFFF" : INK, caretColor: active ? "#FFFFFF" : INK }}
              />
            </div>
          );
        })}

        <span className="flex-1" />

      </header>

      <div className="flex-1 min-h-0 flex">
      <div className="flex-1 min-w-0 overflow-hidden p-2 sm:p-3">
        {/* Both blocks fill the height, side by side. */}
        <div className="h-full flex">
          {module.panels.map((p, i) => (
            <div key={p.id} className="h-full shrink-0 pr-2 sm:pr-3" style={{ width: `${100 / PER_PAGE}%` }}>
            {i === 1 ? (
              <div className="h-full flex flex-col gap-2 sm:gap-3">
                <Card className="flex flex-col h-[38%]">
                  <Article
                    key={openStoryItem?.id || "none"}
                    item={openStoryItem}
                    onClear={() => setReading(null)}
                  />
                </Card>
                <Card className="flex flex-col flex-1 min-h-0">
                  <Perspective
                    item={openStoryItem}
                    frames={listPanel?.view?.frames || []}
                    onFrames={(frames) => setFrames(frames)}
                  />
                </Card>
              </div>
            ) : (
            <Card className="flex flex-col h-full">
              {/* Only the list block has a header: the feeds, the refresh,
                  and what the last sweep found. The block beside it draws its
                  own. */}
              {i === 0 && (
                <div className="shrink-0 flex items-center gap-2 px-2.5 h-8" style={{ borderBottom: `1px solid ${LINE}` }}>
                    <button
                      onClick={() => status[p.id]?.openSources?.()}
                      className="shrink-0 hover:opacity-70"
                      style={{ color: ORANGE }}
                      aria-label="Sources"
                    >
                      <Rss size={11} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => status[p.id]?.refresh?.()}
                      disabled={status[p.id]?.pulling}
                      className="shrink-0 disabled:opacity-40 hover:opacity-70"
                      style={{ color: ORANGE }}
                      aria-label="Refresh now"
                    >
                      <RotateCw
                        size={11}
                        strokeWidth={2}
                        className={status[p.id]?.pulling ? "animate-spin" : ""}
                      />
                    </button>
                    <span
                      className="shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] opacity-45"
                      style={{ color: INK }}
                    >
                      {status[p.id]?.pulling ? "reading…" : sinceShort(p.lastPull)}
                    </span>
                    {p.lastRead > 0 && (
                      <span className="shrink-0 opacity-25 select-none" style={{ color: INK }}>
                        |
                      </span>
                    )}
                    {p.lastRead > 0 && (
                      <span
                        className="shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] opacity-45"
                        style={{ color: INK }}
                      >
                        {(p.tabs?.t1 || []).length} filtered from {p.lastRead.toLocaleString("en-GB")}
                      </span>
                    )}
                  <span className="flex-1" />
                </div>
              )}
              <BlockTabs
                tabs={p.tabs}
                view={p.view}
                onView={(patch) =>
                  updatePanel(p.id, (panel) => ({ ...panel, view: { ...(panel.view || {}), ...patch } }))
                }
                autoPull={i === 0}
                feeds={p.feeds || []}
                lastPull={p.lastPull}
                read={p.lastRead || 0}
                onPulled={(at, read) => updatePanel(p.id, (panel) => ({ ...panel, lastPull: at, lastRead: read }))}
                onStatus={(info) => setStatus((prev) => (prev[p.id]?.pulling === info.pulling && prev[p.id]?.lastPull === info.lastPull ? prev : { ...prev, [p.id]: info }))}
                onReplace={(tab, list) =>
                  updatePanel(p.id, (panel) => ({
                    ...panel,
                    tabs: { ...(panel.tabs || {}), [tab]: list },
                  }))
                }
                onFeeds={(feeds) => updatePanel(p.id, (panel) => ({ ...panel, feeds }))}
                names={p.tabNames}
                onRename={(tab, name) =>
                  updatePanel(p.id, (panel) => ({
                    ...panel,
                    tabNames: { ...(panel.tabNames || {}), [tab]: name },
                  }))
                }
                onAdd={(tab, item) =>
                  updatePanel(p.id, (panel) => ({
                    ...panel,
                    tabs: { ...(panel.tabs || {}), [tab]: [...((panel.tabs || {})[tab] || []), item] },
                  }))
                }
                onRemove={(tab, itemId) =>
                  updatePanel(p.id, (panel) => ({
                    ...panel,
                    tabs: {
                      ...(panel.tabs || {}),
                      [tab]: ((panel.tabs || {})[tab] || []).filter((item) => item.id !== itemId),
                    },
                  }))
                }
              />
            </Card>
            )}
            </div>
          ))}
        </div>
      </div>

      </div>

    </div>
  );
}

