import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { FRAME, INK, LINE, MAIN_BG, NAV_BG, ORANGE } from "../../theme.js";
import { addClaim, keptOf, makeModule, pendingOf, setClaimStatus } from "./module.js";
import { loadModule, saveModule } from "./store.js";

const KEY = "workspace";
const EMPTY = { modules: [], currentId: null };

function Card({ children, className = "", style }) {
  return (
    <div className={`rounded-md bg-white overflow-hidden ${className}`} style={{ border: `1px solid ${FRAME}`, ...style }}>
      {children}
    </div>
  );
}

function Label({ children, right }) {
  return (
    <div
      className="shrink-0 flex items-center gap-2 px-2.5 h-7 text-[9.5px] font-bold tracking-[0.07em]"
      style={{ borderBottom: `1px solid ${LINE}`, color: ORANGE }}
    >
      <span className="flex-1 truncate">{children}</span>
      {right}
    </div>
  );
}

export default function Screen() {
  const [space, setSpace] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    loadModule(KEY).then((saved) => {
      if (saved && saved.modules?.length) setSpace(saved);
      else {
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
  const step = module?.steps[module.currentStep];
  const pending = step ? pendingOf(step) : [];
  const kept = step ? keptOf(step) : [];
  const current = pending[Math.min(index, Math.max(pending.length - 1, 0))];

  useEffect(() => {
    function onKey(e) {
      if (["TEXTAREA", "INPUT"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, pending.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending.length]);

  if (!ready || !module) return <div className="h-screen w-full" style={{ backgroundColor: MAIN_BG }} />;

  function createModule() {
    const made = makeModule();
    setSpace((s) => ({ modules: [...s.modules, made], currentId: made.id }));
    setIndex(0);
  }

  function updateModule(fn) {
    setSpace((s) => ({ ...s, modules: s.modules.map((m) => (m.id === s.currentId ? fn(m) : m)) }));
  }

  function updateStep(fn) {
    updateModule((m) => ({ ...m, steps: m.steps.map((s, i) => (i === m.currentStep ? fn(s) : s)) }));
  }

  function judge(id, status) {
    updateStep((s) => setClaimStatus(s, id, status));
    setIndex((i) => Math.min(i, Math.max(pending.length - 2, 0)));
  }

  function submitClaim(e) {
    e.preventDefault();
    const text = adding.trim();
    if (!text) return;
    updateStep((s) => addClaim(s, text));
    setAdding("");
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
        className="shrink-0 h-9 flex items-center gap-1 px-3 border-b"
        style={{ borderColor: FRAME, backgroundColor: NAV_BG }}
      >
        {space.modules.map((m) => {
          const active = m.id === space.currentId;
          return (
            <button
              key={m.id}
              onClick={() => {
                setSpace((s) => ({ ...s, currentId: m.id }));
                setIndex(0);
              }}
              className="group flex items-center justify-center gap-1.5 w-40 h-6 px-2 rounded text-[10px] font-bold tracking-[0.06em]"
              style={{
                backgroundColor: active ? ORANGE : "transparent",
                color: active ? "#FFFFFF" : INK,
                border: `1px solid ${active ? ORANGE : FRAME}`,
              }}
            >
              <span className="truncate">{(m.field || "UNTITLED").toUpperCase()}</span>
              <span
                onClick={(e) => closeModule(m.id, e)}
                className="opacity-0 group-hover:opacity-45 hover:!opacity-100"
              >
                <X size={10} />
              </span>
            </button>
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
        <div className="flex-1 min-w-0 p-3 flex flex-col gap-3">
          <Card className="shrink-0">
            <div className="px-4 pt-3 pb-2 flex items-baseline gap-3" style={{ borderBottom: `1px solid ${LINE}` }}>
              <input
                value={module.field}
                onChange={(e) => updateModule((m) => ({ ...m, field: e.target.value }))}
                maxLength={18}
                placeholder="Name this module"
                className="w-44 shrink-0 text-[13px] font-bold outline-none bg-transparent placeholder:opacity-35"
                style={{ color: ORANGE }}
              />
              <input
                value={module.goal}
                onChange={(e) => updateModule((m) => ({ ...m, goal: e.target.value }))}
                placeholder="What do you want to end up with?"
                className="flex-1 min-w-0 text-[11px] outline-none bg-transparent placeholder:opacity-35"
                style={{ color: INK }}
              />
            </div>
            <div className="px-4 py-3">
              <div className="text-[9.5px] font-bold tracking-[0.07em]" style={{ color: ORANGE }}>
                STEP {module.currentStep + 1} OF {module.steps.length}
              </div>
              <input
                value={step.question}
                onChange={(e) => updateStep((s) => ({ ...s, question: e.target.value }))}
                className="w-full mt-0.5 text-[15px] font-bold leading-snug outline-none bg-transparent"
                style={{ color: INK }}
              />
            </div>
          </Card>

          <Card className="flex-1 min-h-0 relative">
            <div className="h-full w-full flex items-center px-16 pt-10 pb-16">
              {current ? (
                <p className="text-[19px] leading-[1.5]">{current.text}</p>
              ) : (
                <p className="w-full text-center text-[12px] opacity-45">
                  Nothing to judge yet. Add what you already believe on the right.
                </p>
              )}
            </div>

            {current && (
              <>
                <button
                  onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                  disabled={index === 0}
                  className="absolute top-1/2 -translate-y-1/2 left-2 p-1 disabled:opacity-15 hover:opacity-60"
                  style={{ color: ORANGE }}
                  aria-label="Previous claim"
                >
                  <ChevronLeft size={24} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setIndex((i) => Math.min(i + 1, pending.length - 1))}
                  disabled={index >= pending.length - 1}
                  className="absolute top-1/2 -translate-y-1/2 right-2 p-1 disabled:opacity-15 hover:opacity-60"
                  style={{ color: ORANGE }}
                  aria-label="Next claim"
                >
                  <ChevronRight size={24} strokeWidth={1.5} />
                </button>

                <div className="absolute left-0 right-0 bottom-0 flex items-center gap-3 px-5 pb-3">
                  <button
                    onClick={() => judge(current.id, "kept")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-[0.07em] text-white"
                    style={{ backgroundColor: ORANGE }}
                  >
                    <Check size={12} strokeWidth={2.5} /> KEEP
                  </button>
                  <button
                    onClick={() => judge(current.id, "binned")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-[0.07em]"
                    style={{ border: `1px solid ${FRAME}`, color: INK }}
                  >
                    <X size={12} strokeWidth={2.5} /> BIN
                  </button>
                  <span className="flex-1" />
                  <span className="text-[11px] tabular-nums font-bold" style={{ color: ORANGE }}>
                    {index + 1} / {pending.length}
                  </span>
                </div>
              </>
            )}
          </Card>
        </div>

        <aside className="w-80 shrink-0 border-l flex flex-col" style={{ backgroundColor: NAV_BG, borderColor: FRAME }}>
          <div className="flex-[2] min-h-0 p-3">
            <Card className="h-full flex flex-col">
              <Label right={<span className="tabular-nums opacity-45">{kept.length}</span>}>YOUR VIEW</Label>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {kept.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] opacity-40 px-4 text-center">
                    What you keep lands here
                  </div>
                ) : (
                  kept.map((c, i) => (
                    <div
                      key={c.id}
                      className="group flex gap-2 px-2.5 py-2 text-[11px] leading-snug"
                      style={{ borderTop: i ? `1px solid ${LINE}` : "none" }}
                    >
                      <span className="flex-1">{c.text}</span>
                      <button
                        onClick={() => updateStep((s) => setClaimStatus(s, c.id, "pending"))}
                        className="shrink-0 h-3 opacity-0 group-hover:opacity-45 hover:!opacity-100"
                        aria-label="Put back"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <form
                onSubmit={submitClaim}
                className="shrink-0 flex items-center gap-1.5 px-2.5 h-8"
                style={{ borderTop: `1px solid ${LINE}` }}
              >
                <Plus size={12} strokeWidth={2} style={{ color: ORANGE }} />
                <input
                  value={adding}
                  onChange={(e) => setAdding(e.target.value)}
                  placeholder="Add something to judge"
                  className="flex-1 min-w-0 text-[11px] outline-none bg-transparent placeholder:opacity-45"
                  style={{ color: ORANGE }}
                />
              </form>
            </Card>
          </div>

          <div className="flex-1 min-h-0 p-3 border-t" style={{ borderColor: FRAME }}>
            <Card className="h-full flex flex-col">
              <Label>{step.outputLabel.toUpperCase()}</Label>
              <textarea
                value={step.output}
                onChange={(e) => updateStep((s) => ({ ...s, output: e.target.value }))}
                placeholder="What this step hands to the next one"
                className="flex-1 min-h-0 w-full resize-none px-3 py-2 text-[12px] leading-snug outline-none placeholder:opacity-45"
                style={{ color: ORANGE }}
              />
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
