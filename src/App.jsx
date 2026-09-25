import React, { useState } from "react";
import { ChevronDown, Circle, Square, Triangle } from "lucide-react";
import Logo, { INK, ORANGE } from "./Logo.jsx";

const SIDEBAR = "#FFE9C4";
const TOPBAR = "#FFE9C4";
const LINE = "#F2DCB4";
const MAIN = "#FBF5E9";

// Placeholder sections until the real ones are decided.
const NAV = [
  { id: "a", name: "Navi A", icon: Square },
  { id: "b", name: "Navi B", icon: Circle },
  { id: "c", name: "Navi C", icon: Triangle },
  { id: "d", name: "Navi D", icon: Square },
  { id: "e", name: "Navi E", icon: Circle },
];

function TopBar() {
  return (
    <header
      className="h-8 shrink-0 flex items-center justify-between pl-3 pr-3 border-b"
      style={{ backgroundColor: TOPBAR, borderColor: LINE }}
    >
      <Logo />

      <button className="flex items-center gap-1 text-[11px] hover:opacity-70" style={{ color: INK }}>
        alex@servefast.com
        <ChevronDown size={11} />
      </button>
    </header>
  );
}

function Sidebar({ active, setActive }) {
  return (
    <aside
      className="w-48 shrink-0 border-r"
      style={{ backgroundColor: SIDEBAR, borderColor: LINE }}
    >
      <nav className="py-1">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors"
            style={{ color: active === item.id ? ORANGE : INK }}
          >
            <item.icon size={12} className="shrink-0" />
            <span className="flex-1 text-left">{item.name}</span>
            <ChevronDown size={11} className="opacity-50" />
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default function App() {
  const [active, setActive] = useState("a");
  const current = NAV.find((n) => n.id === active);

  return (
    <div className="h-screen w-full flex flex-col" style={{ backgroundColor: MAIN }}>
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar active={active} setActive={setActive} />
        <main className="flex-1 min-w-0 overflow-auto px-4 py-3">
          <div className="text-[11px]" style={{ color: INK }}>
            <span className="underline">Home</span>
            <span className="opacity-50"> – </span>
            <span className="underline">Servefast</span>
            <span className="opacity-50"> – </span>
            <span className="italic">{current.name}</span>
          </div>
        </main>
      </div>
    </div>
  );
}
