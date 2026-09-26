import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Lock, Plus, RotateCw, X } from "lucide-react";
import { LINE, INK, ORANGE, MAIN_BG } from "./theme.js";
import { LogoMark } from "./Logo.jsx";

const CHROME = "#EDE3D3";
const CHROME_LINE = "#DFD2BE";

function FrameLabel({ text, href, note }) {
  return (
    <div className="flex items-baseline gap-2 mb-1">
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: INK }}>
        {text}
      </span>
      {note && (
        <span className="text-[10px] tabular-nums opacity-60" style={{ color: INK }}>
          {note}
        </span>
      )}
      <a href={href} target="_blank" rel="noreferrer" className="text-[10px] underline" style={{ color: ORANGE }}>
        open
      </a>
    </div>
  );
}

// Fake browser chrome, so the desktop panel reads as a real window. Back,
// forward and reload drive the iframe's own history.
function BrowserChrome({ name, url, onBack, onForward, onReload }) {
  return (
    <div className="shrink-0" style={{ backgroundColor: CHROME, borderBottom: `1px solid ${CHROME_LINE}` }}>
      <div className="flex items-end gap-1 px-2 pt-1.5">
        <div className="flex gap-1 pb-1.5 pr-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#E0776B" }} />
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#E3B341" }} />
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#8FBF6B" }} />
        </div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-t text-[10px] max-w-[190px]"
          style={{ backgroundColor: MAIN_BG, color: INK }}
        >
          <LogoMark size={10} />
          <span className="truncate">{name}</span>
          <X size={9} className="opacity-50 shrink-0" />
        </div>
        <Plus size={11} className="mb-1.5 opacity-50" style={{ color: INK }} />
      </div>

      <div className="flex items-center gap-1.5 px-2 py-1">
        <button onClick={onBack} className="hover:opacity-60" aria-label="Back">
          <ArrowLeft size={11} style={{ color: INK }} />
        </button>
        <button onClick={onForward} className="hover:opacity-60" aria-label="Forward">
          <ArrowRight size={11} style={{ color: INK }} />
        </button>
        <button onClick={onReload} className="hover:opacity-60" aria-label="Reload">
          <RotateCw size={10} style={{ color: INK }} />
        </button>
        <div
          className="flex-1 min-w-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
          style={{ backgroundColor: MAIN_BG, color: INK }}
        >
          <Lock size={8} className="opacity-50 shrink-0" />
          <span className="truncate opacity-80">{url}</span>
        </div>
      </div>
    </div>
  );
}

export default function Workbench({ base, name }) {
  const deskRef = useRef(null);
  const frameRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [reloads, setReloads] = useState(0);
  const [path, setPath] = useState(`${base}/desktop`);

  // The panel is same-origin, so the address bar can follow the real route,
  // including route changes the app makes without a page load.
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const win = frameRef.current?.contentWindow;
        if (!win) return;
        const next = win.location.pathname + win.location.search;
        setPath((prev) => (prev === next ? prev : next));
      } catch {
        // cross-origin, nothing to read
      }
    }, 300);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = deskRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex gap-4 items-start p-3">
      <section className="flex-1 min-w-0 flex flex-col">
        <FrameLabel text="Desktop" href={`${base}/desktop`} note={width ? `${width}px` : null} />
        <div
          className="flex flex-col rounded-xl overflow-hidden shrink-0"
          style={{ border: `9px solid ${INK}`, height: 798 }}
        >
          <BrowserChrome
            name={name}
            url={`servefast.com${path}`}
            onBack={() => frameRef.current?.contentWindow?.history.back()}
            onForward={() => frameRef.current?.contentWindow?.history.forward()}
            onReload={() => setReloads((n) => n + 1)}
          />
          <div ref={deskRef} className="flex-1 min-h-0">
            <iframe
              key={reloads}
              ref={frameRef}
              title={`${name} desktop`}
              src={`${base}/desktop`}
              className="w-full h-full block"
              style={{ border: 0 }}
            />
          </div>
        </div>
      </section>

      <section className="shrink-0 flex flex-col">
        <FrameLabel text="Mobile" href={`${base}/mobile`} note="390px" />
        <div className="rounded-[34px] p-[9px] shrink-0" style={{ backgroundColor: INK, width: 408, height: 798 }}>
          <div className="relative rounded-[26px] overflow-hidden bg-white" style={{ width: 390, height: 780 }}>
            <iframe
              title={`${name} mobile`}
              src={`${base}/mobile`}
              className="block"
              style={{ width: 390, height: 780, border: 0 }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full"
              style={{ bottom: 6, width: 120, height: 4, backgroundColor: INK, opacity: 0.35 }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
