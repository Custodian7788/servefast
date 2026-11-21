import React, { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { FRAME, INK, LINE, MAIN_BG, NAV_BG, ORANGE } from "../../theme.js";
import { makeModule, makePanel } from "./module.js";
import { loadModule, saveModule } from "./store.js";

const KEY = "workspace";

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
  const loaded = useRef(false);

  useEffect(() => {
    loadModule(KEY).then((saved) => {
      if (saved?.modules?.length) {
        setSpace(saved);
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
              onClick={() => setSpace((s) => ({ ...s, currentId: m.id }))}
              className="group shrink-0 flex items-center gap-1 w-32 sm:w-40 h-6 px-2 rounded cursor-pointer"
              style={{
                backgroundColor: active ? ORANGE : "transparent",
                border: `1px solid ${active ? ORANGE : FRAME}`,
              }}
            >
              {active ? (
                <input
                  value={m.field}
                  onChange={(e) => updateModule((mod) => ({ ...mod, field: e.target.value }))}
                  maxLength={18}
                  placeholder="NAME IT"
                  className="flex-1 min-w-0 bg-transparent text-center text-[10px] font-bold tracking-[0.06em] uppercase outline-none placeholder:text-white/60"
                  style={{ color: "#FFFFFF" }}
                />
              ) : (
                <span className="flex-1 truncate text-center text-[10px] font-bold tracking-[0.06em]" style={{ color: INK }}>
                  {(m.field || "UNTITLED").toUpperCase()}
                </span>
              )}
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

      </header>

      <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-3 flex flex-col gap-2 sm:gap-3">
        {/* The grid of screens, added one at a time */}
        <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {module.panels.map((p, i) => (
            <Card key={p.id} className="flex flex-col h-56">
              <div className="shrink-0 flex items-center gap-2 px-2.5 h-7" style={{ borderBottom: `1px solid ${LINE}` }}>
                <span className="text-[9.5px] font-bold tabular-nums opacity-35">{String(i + 1).padStart(2, "0")}</span>
                <input
                  value={p.title}
                  onChange={(e) => updatePanel(p.id, (panel) => ({ ...panel, title: e.target.value }))}
                  placeholder="Name this screen"
                  className="flex-1 min-w-0 text-[9.5px] font-bold tracking-[0.07em] uppercase outline-none bg-transparent placeholder:opacity-35"
                  style={{ color: ORANGE }}
                />
                <button
                  onClick={() => removePanel(p.id)}
                  className="shrink-0 opacity-25 hover:opacity-70"
                  aria-label="Remove screen"
                >
                  <X size={11} />
                </button>
              </div>
              <textarea
                value={p.body}
                onChange={(e) => updatePanel(p.id, (panel) => ({ ...panel, body: e.target.value }))}
                placeholder="What goes in here"
                className="flex-1 min-h-0 w-full resize-none px-3 py-2 text-[12px] leading-[1.5] outline-none placeholder:opacity-35"
                style={{ color: INK }}
              />
            </Card>
          ))}

          <button
            onClick={addPanel}
            className="h-56 rounded-md flex flex-col items-center justify-center gap-2 hover:bg-[#FFF8F2] transition-colors"
            style={{ border: `1px dashed ${FRAME}`, color: ORANGE }}
          >
            <Plus size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-bold tracking-[0.07em]">ADD A SCREEN</span>
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
    </div>
  );
}
