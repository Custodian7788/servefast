import React, { useState } from "react";
import { LayoutGrid, Search, Layers, Database, Settings } from "lucide-react";

const MAIN_BG = "#FBF5E9"; // very light beige
const CREAM = "#FFE9C4";
const TEAL = "#0C9499";

// Placeholder nav — renamed once the real sections are decided.
const NAV = [
  { id: "navi1", name: "Navi 1", icon: LayoutGrid },
  { id: "navi2", name: "Navi 2", icon: Search },
  { id: "navi3", name: "Navi 3", icon: Layers },
  { id: "navi4", name: "Navi 4", icon: Database },
  { id: "navi5", name: "Navi 5", icon: Settings },
];

export default function App() {
  const [active, setActive] = useState("navi1");

  return (
    <div className="min-h-screen w-full flex">
      {/* Left sidebar */}
      <aside className="shrink-0 w-56 border-r-2 border-neutral-200 flex flex-col min-h-screen" style={{ backgroundColor: CREAM }}>
        {/* Logo */}
        <div className="shrink-0 px-4 py-5 border-b border-neutral-200 leading-none">
          <span className="block text-2xl font-extrabold" style={{ color: TEAL, letterSpacing: "0.02em" }}>
            SERVEFAST<span className="text-neutral-400">.</span>
          </span>
        </div>

        <nav className="flex-1 py-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                active === item.id ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <item.icon size={14} className="shrink-0" />
              <span className="flex-1 text-left truncate">{item.name}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <main className="flex-1" style={{ backgroundColor: MAIN_BG }} />
    </div>
  );
}
