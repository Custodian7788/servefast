import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { FRAME, INK, LINE, MAIN_BG, NAV_BG, ORANGE } from "../../theme.js";
import Setup from "./Setup.jsx";
import { addClaim, keptOf, makeModule, pendingOf, setClaimStatus } from "./module.js";
import { loadModule, saveModule } from "./store.js";

const KEY = "module:current";

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
  const [module, setModule] = useState(null);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    loadModule(KEY).then((saved) => {
      if (saved && saved.steps) setModule(saved);
      loaded.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (loaded.current && module) saveModule(KEY, module);
  }, [module]);

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

  if (!ready) return <div className="h-screen w-full" style={{ backgroundColor: MAIN_BG }} />;
  if (!module) return <Setup onCreate={(seed) => setModule(makeModule(seed))} />;

  function updateStep(fn) {
    setModule((m) => ({
      ...m,
      steps: m.steps.map((s, i) => (i === m.currentStep ? fn(s) : s)),
    }));
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

  return (
    <div className="h-screen w-full flex flex-col" style={{ backgroundColor: MAIN_BG, color: INK }}>
      {/* The funnel itself */}
      <header
        className="shrink-0 h-9 flex items-center gap-1 px-3 border-b"
        style={{ borderColor: FRAME, backgroundColor: NAV_BG }}
      >
        <span className="text-[11px] font-bold truncate max-w-[220px]" title={module.goal}>
          {module.field}
        </span>
        <span className="mx-2 opacity-20">|</span>
        {module.steps.map((s, i) => {
          const active = i === module.currentStep;
          return (
            <button
              key={s.id}
              onClick={() => {
                setModule((m) => ({ ...m, currentStep: i }));
                setIndex(0);
              }}
              className="px-2.5 h-6 rounded text-[10px] font-bold tracking-[0.06em] transition-colors"
              style={{
                backgroundColor: active ? ORANGE : "transparent",
                color: active ? "#FFFFFF" : INK,
                border: `1px solid ${active ? ORANGE : FRAME}`,
              }}
            >
              {i + 1}. {s.title.toUpperCase()}
            </button>
          );
        })}
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* Working area */}
        <div className="flex-1 min-w-0 p-3 flex flex-col gap-3">
          <Card className="shrink-0">
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

        {/* What you have settled, and what this step hands on */}
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
