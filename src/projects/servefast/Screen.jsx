import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, RotateCw, Rss, X } from "lucide-react";
import { FRAME, INK, LINE, MAIN_BG, NAV_BG, ORANGE } from "../../theme.js";
import { makeModule, makePanel } from "./module.js";
import BlockTabs from "./BlockTabs.jsx";
import { loadModule, saveModule } from "./store.js";

const KEY = "workspace";

// What a block can be made to do. Nothing behind these yet.
const FUNCTIONS = [
  "Chart",
  "Checklist",
  "Comparison",
  "Questions",
  "Research",
  "Shortlist",
  "Sources",
  "Summary",
  "Timeline",
];

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
  const [confirmDelete, setConfirmDelete] = useState(null);
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
  const [building, setBuilding] = useState(null);
  const [fn, setFn] = useState(null);
  const [focused, setFocused] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    loadModule(KEY).then((saved) => {
      if (saved?.modules?.length) {
        setSpace({
          ...saved,
          modules: saved.modules.map((m) => ({
            ...m,
            panels: (m.panels || []).map((panel) => {
              const old = panel.tabs?.EVENTS;
              if (!old?.length) return panel;
              const { EVENTS, ...rest } = panel.tabs;
              return { ...panel, tabs: { ...rest, t1: [...(rest.t1 || []), ...EVENTS] } };
            }),
          })),
        });
      } else {
        const first = makeModule();
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
  // One extra slot for the ADD A BLOCK tile at the end.
  const maxSlot = Math.max((module?.panels.length || 0) + 1 - PER_PAGE, 0);

  // The leftmost block on screen. It lives in the workspace, not in this
  // component, so a refresh puts you back where you were.
  const slot = Math.min(space.slot || 0, maxSlot);
  function setSlot(next) {
    setSpace((s) => {
      const at = typeof next === "function" ? next(s.slot || 0) : next;
      return { ...s, slot: Math.max(0, at) };
    });
  }
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

  function removePanel(id) {
    // Never leave the module with nothing in it, and never leave the paging
    // sitting past the end.
    const left = module.panels.filter((p) => p.id !== id);
    const panels = left.length ? left : [makePanel()];
    const ceiling = Math.max(panels.length + 1 - PER_PAGE, 0);
    setSpace((s) => ({
      ...s,
      slot: Math.min(s.slot || 0, ceiling),
      modules: s.modules.map((m) => (m.id === s.currentId ? { ...m, panels } : m)),
    }));
    setStatus((prev) => {
      const { [id]: gone, ...rest } = prev;
      return rest;
    });
    setConfirmDelete(null);
  }

  function createModule() {
    const made = makeModule();
    setSpace((s) => ({ modules: [...s.modules, made], currentId: made.id }));
    setJustMade(made.id);
  }

  function closeModule(id, e) {
    e.stopPropagation();
    setSpace((s) => {
      const left = s.modules.filter((m) => m.id !== id);
      return { modules: left, currentId: s.currentId === id ? left[0]?.id ?? null : s.currentId };
    });
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
              <span
                onClick={(e) => closeModule(m.id, e)}
                className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100"
                style={{ color: active ? "#FFFFFF" : INK }}
              >
                <X size={10} />
              </span>
            </div>
          );
        })}

        <button
          onClick={createModule}
          className="px-2 flex items-center hover:opacity-70"
          style={{ color: ORANGE }}
          aria-label="New module"
        >
          <Plus size={14} strokeWidth={2} />
        </button>

        <span className="flex-1" />

        {/* Where you are across the blocks */}
        <div className="shrink-0 flex items-center gap-2 pr-1">
          <button
            onClick={() => setSlot((n) => Math.max(n - 1, 0))}
            disabled={slot === 0}
            className="disabled:opacity-20 hover:opacity-70"
            style={{ color: ORANGE }}
            aria-label="Blocks left"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="flex items-center gap-1">
            {module.panels.map((p, i) => {
              const here = i >= slot && i < slot + PER_PAGE;
              return (
                <button
                  key={p.id}
                  onClick={() => setSlot(Math.min(i, maxSlot))}
                  title={p.title || `Block ${i + 1}`}
                  className="flex items-center justify-center rounded-sm text-[9px] font-bold tabular-nums transition-colors"
                  style={{
                    width: 16,
                    height: 16,
                    color: here ? "#FFFFFF" : INK,
                    backgroundColor: here ? ORANGE : "transparent",
                    border: `1px solid ${here ? ORANGE : FRAME}`,
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </span>
          <button
            onClick={() => setSlot((n) => Math.min(n + 1, maxSlot))}
            disabled={slot >= maxSlot}
            className="disabled:opacity-20 hover:opacity-70"
            style={{ color: ORANGE }}
            aria-label="Blocks right"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
      <div className="flex-1 min-w-0 overflow-hidden p-2 sm:p-3">
        {/* Blocks fill the height; the view shifts sideways one block at a time */}
        <div
          className="h-full flex transition-transform duration-300"
          style={{ transform: `translateX(-${slot * (100 / PER_PAGE)}%)` }}
        >
          {module.panels.map((p, i) => (
            <div key={p.id} className="h-full shrink-0 pr-2 sm:pr-3" style={{ width: `${100 / PER_PAGE}%` }}>
            <Card className="flex flex-col h-full">
              <div className="shrink-0 flex items-center gap-2 px-2.5 h-8" style={{ borderBottom: `1px solid ${LINE}` }}>
                <span className="shrink-0 text-[11.5px] font-bold tabular-nums opacity-35">
                  {i + 1}
                </span>
                <input
                  value={p.title}
                  onChange={(e) => updatePanel(p.id, (panel) => ({ ...panel, title: e.target.value }))}
                  placeholder="Name this block"
                  className="shrink-0 text-[11.5px] font-bold tracking-[0.07em] uppercase outline-none bg-transparent placeholder:opacity-35"
                  style={{
                    color: ORANGE,
                    width: `${Math.max((p.title || "Name this block").length, 6)}ch`,
                    maxWidth: "60%",
                  }}
                />
                {i === 0 && (
                  <>
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
                  </>
                )}
                <span className="flex-1" />
                {/* Deleting a block is a big deal, so it asks first. */}
                <button
                  onClick={() => setConfirmDelete(p.id)}
                  className="shrink-0 flex items-center justify-center rounded-full transition-colors hover:bg-[#C0392B] hover:text-white"
                  style={{ width: 16, height: 16, border: "1.5px solid #C0392B", color: "#C0392B" }}
                  aria-label="Remove block"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
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
            </div>
          ))}

          <div className="h-full shrink-0 pr-2 sm:pr-3" style={{ width: `${100 / PER_PAGE}%` }}>
            <button
              onClick={() => {
                addPanel();
                setSlot(module.panels.length + 2 - PER_PAGE);
              }}
              className="w-full h-full rounded-md flex flex-col items-center justify-center gap-2 hover:bg-[#FFF8F2] transition-colors"
              style={{ border: `1px dashed ${FRAME}`, color: ORANGE }}
            >
              <Plus size={20} strokeWidth={1.5} />
              <span className="text-[12px] font-bold tracking-[0.07em]">ADD A BLOCK</span>
            </button>
          </div>
        </div>

      </div>

      {/* Reserved for building modules. Nothing behind it yet. */}
      <aside
        className="w-72 shrink-0 border-l hidden md:flex flex-col p-3"
        style={{ borderColor: FRAME, backgroundColor: NAV_BG }}
      >
        <Card className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 p-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>
            <select
              value={building || ""}
              onChange={(e) => {
                setBuilding(e.target.value);
                const picked = module.panels.find((panel) => panel.id === e.target.value);
                setFn(picked?.kind || "");
              }}
              className="w-full h-7 px-2 rounded bg-white text-[13px] outline-none cursor-pointer"
              style={{ border: `1px solid ${FRAME}`, color: INK }}
            >
              <option value="">Pick a block</option>
              {module.panels.map((panel, i) => (
                <option key={panel.id} value={panel.id}>
                  {i + 1} {sentence(panel.title) || "Untitled"}
                </option>
              ))}
            </select>

            {/* What that block does. Placeholder until the functions exist. */}
            <select
              value={fn || ""}
              onChange={(e) => {
                setFn(e.target.value);
                if (building) {
                  updatePanel(building, (panel) => ({ ...panel, kind: e.target.value }));
                }
              }}
              disabled={!building}
              className="mt-2 w-full h-7 px-2 rounded bg-white text-[13px] outline-none cursor-pointer disabled:opacity-35 disabled:cursor-default"
              style={{ border: `1px solid ${FRAME}`, color: INK }}
            >
              <option value="">Select functionality</option>
              {FUNCTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-h-0" />
        </Card>
      </aside>
      </div>

      {confirmDelete && (
        <Confirm
          onYes={() => removePanel(confirmDelete)}
          onNo={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// Asked before a block goes. Square corners, one framed card, two buttons of
// equal width, Escape and the backdrop both meaning no.
function Confirm({ onYes, onNo }) {
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") onNo();
      if (e.key === "Enter") onYes();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onYes, onNo]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: "rgba(43,43,43,0.28)" }}
      onClick={onNo}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[320px] bg-white"
        style={{ border: `2px solid ${FRAME}`, boxShadow: "0 10px 30px rgba(43,43,43,0.18)" }}
      >
        <p className="px-5 pt-5 pb-4 text-[13px] leading-[1.5] text-center" style={{ color: INK }}>
          Are you sure you would like to delete this block?
        </p>
        <div className="flex" style={{ borderTop: `1px solid ${FRAME}` }}>
          <button
            onClick={onNo}
            className="flex-1 h-10 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-[#FFF3E8]"
            style={{ color: INK, borderRight: `1px solid ${FRAME}` }}
          >
            No
          </button>
          <button
            onClick={onYes}
            autoFocus
            className="flex-1 h-10 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-[#C0392B] hover:text-white"
            style={{ color: "#C0392B" }}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
