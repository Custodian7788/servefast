import React, { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { FRAME, INK, LINE, MAIN_BG, NAV_BG, ORANGE } from "../../theme.js";
import { makeModule, makePanel } from "./module.js";
import BlockTabs from "./BlockTabs.jsx";
import { loadModule, saveModule } from "./store.js";

const KEY = "workspace";

// What a block can be made to do. Nothing behind these yet.
const FUNCTIONS = [
  "CHART",
  "CHECKLIST",
  "COMPARISON",
  "QUESTIONS",
  "RESEARCH",
  "SHORTLIST",
  "SOURCES",
  "SUMMARY",
  "TIMELINE",
];

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
  const [confirming, setConfirming] = useState(null);
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
    updateModule((m) => ({ ...m, panels: m.panels.filter((p) => p.id !== id) }));
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
                className={`flex-1 min-w-0 bg-transparent text-center text-[10px] font-bold tracking-[0.06em] uppercase outline-none ${
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
      </header>

      <div className="flex-1 min-h-0 flex">
      <div className="flex-1 min-w-0 overflow-auto p-2 sm:p-3 flex flex-col gap-2 sm:gap-3">
        {/* The grid of screens, added one at a time */}
        <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {module.panels.map((p, i) => (
            <Card key={p.id} className="flex flex-col h-56">
              <div className="shrink-0 flex items-center gap-2 px-2.5 h-7" style={{ borderBottom: `1px solid ${LINE}` }}>
                <span className="text-[9.5px] font-bold tabular-nums opacity-35">{String(i + 1).padStart(2, "0")}</span>
                <input
                  value={p.title}
                  onChange={(e) => updatePanel(p.id, (panel) => ({ ...panel, title: e.target.value }))}
                  placeholder="Name this block"
                  className="flex-1 min-w-0 text-[9.5px] font-bold tracking-[0.07em] uppercase outline-none bg-transparent placeholder:opacity-35"
                  style={{ color: ORANGE }}
                />
                {confirming === p.id ? (
                  <span className="shrink-0 flex items-center gap-1.5 text-[9px] font-bold tracking-[0.06em]">
                    <span style={{ color: INK }}>DELETE?</span>
                    <button
                      onClick={() => {
                        removePanel(p.id);
                        setConfirming(null);
                      }}
                      style={{ color: "#A33427" }}
                    >
                      YES
                    </button>
                    <button onClick={() => setConfirming(null)} style={{ color: INK }} className="opacity-50">
                      NO
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirming(p.id)}
                    className="shrink-0 opacity-25 hover:opacity-70"
                    aria-label="Remove block"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
              <BlockTabs
                tabs={p.tabs}
                autoPull={i === 0}
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
          ))}

          <button
            onClick={addPanel}
            className="h-56 rounded-md flex flex-col items-center justify-center gap-2 hover:bg-[#FFF8F2] transition-colors"
            style={{ border: `1px dashed ${FRAME}`, color: ORANGE }}
          >
            <Plus size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-bold tracking-[0.07em]">ADD A BLOCK</span>
          </button>
        </div>

        {/* Where it all lands */}
        <Card className="shrink-0 mt-auto flex flex-col" style={{ borderColor: ORANGE }}>
          <div
            className="shrink-0 flex items-center px-2.5 h-7 text-[9.5px] font-bold tracking-[0.07em]"
            style={{ borderBottom: `1px solid ${LINE}`, color: ORANGE }}
          >
            OUTPUT
          </div>
          <textarea
            value={module.output}
            onChange={(e) => updateModule((m) => ({ ...m, output: e.target.value }))}
            className="w-full h-28 resize-none px-3 py-2 text-[12px] leading-[1.5] outline-none placeholder:opacity-35"
            style={{ color: INK }}
          />
        </Card>
      </div>

      {/* Reserved for building modules. Nothing behind it yet. */}
      <aside
        className="w-72 shrink-0 border-l hidden md:flex flex-col p-3"
        style={{ borderColor: FRAME, backgroundColor: NAV_BG }}
      >
        <Card className="flex-1 min-h-0 flex flex-col">
          <div
            className="shrink-0 flex items-center px-2.5 h-7 text-[9.5px] font-bold tracking-[0.07em]"
            style={{ borderBottom: `1px solid ${LINE}`, color: ORANGE }}
          >
            BLOCK BUILDER
          </div>

          <div className="shrink-0 p-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>
            <select
              value={building || ""}
              onChange={(e) => {
                setBuilding(e.target.value);
                const picked = module.panels.find((panel) => panel.id === e.target.value);
                setFn(picked?.kind || "");
              }}
              className="w-full h-7 px-2 rounded bg-white text-[11px] outline-none cursor-pointer"
              style={{ border: `1px solid ${FRAME}`, color: INK }}
            >
              <option value="">Pick a block</option>
              {module.panels.map((panel, i) => (
                <option key={panel.id} value={panel.id}>
                  {String(i + 1).padStart(2, "0")} {panel.title || "Untitled"}
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
              className="mt-2 w-full h-7 px-2 rounded bg-white text-[11px] outline-none cursor-pointer disabled:opacity-35 disabled:cursor-default"
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
    </div>
  );
}
