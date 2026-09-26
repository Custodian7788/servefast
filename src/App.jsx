import React from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Logo from "./Logo.jsx";
import Workbench from "./Workbench.jsx";
import { INK, LINE, MAIN_BG, NAV_BG, ORANGE } from "./theme.js";
import ServefastDesktop from "./projects/servefast/Desktop.jsx";
import ServefastMobile from "./projects/servefast/Mobile.jsx";
import WasorbiDesktop from "./projects/wasorbi/Desktop.jsx";
import WasorbiMobile from "./projects/wasorbi/Mobile.jsx";

const PROJECTS = [
  { slug: "servefast", name: "Servefast" },
  { slug: "wasorbi", name: "Wasorbi" },
];

function TopBar() {
  return (
    <header
      className="h-8 shrink-0 flex items-center justify-between px-3 border-b"
      style={{ backgroundColor: NAV_BG, borderColor: LINE }}
    >
      <Logo />
      <button className="flex items-center gap-1 text-[11px] hover:opacity-70" style={{ color: INK }}>
        alex@servefast.com
        <ChevronDown size={11} />
      </button>
    </header>
  );
}

function Sidebar() {
  return (
    <aside className="w-44 shrink-0 border-r" style={{ backgroundColor: NAV_BG, borderColor: LINE }}>
      <nav className="py-1">
        {PROJECTS.map((p) => (
          <NavLink
            key={p.slug}
            to={`/${p.slug}`}
            className="w-full flex items-center px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide"
            style={({ isActive }) => ({ color: isActive ? ORANGE : INK })}
          >
            {p.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function Shell({ children }) {
  const { pathname } = useLocation();
  const current = PROJECTS.find((p) => pathname.startsWith(`/${p.slug}`));

  return (
    <div className="h-screen w-full flex flex-col" style={{ backgroundColor: MAIN_BG }}>
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="px-3 pt-2 text-[11px]" style={{ color: INK }}>
            <span className="underline">Home</span>
            {current && (
              <>
                <span className="opacity-50"> – </span>
                <span className="italic">{current.name}</span>
              </>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Raw project screens, loaded inside the workbench frames. */}
      <Route path="/servefast/desktop" element={<ServefastDesktop />} />
      <Route path="/servefast/mobile" element={<ServefastMobile />} />
      <Route path="/wasorbi/desktop" element={<WasorbiDesktop />} />
      <Route path="/wasorbi/mobile" element={<WasorbiMobile />} />

      <Route
        path="/servefast"
        element={
          <Shell>
            <Workbench base="/servefast" name="Servefast" />
          </Shell>
        }
      />
      <Route
        path="/wasorbi"
        element={
          <Shell>
            <Workbench base="/wasorbi" name="Wasorbi" />
          </Shell>
        }
      />
      <Route path="*" element={<Navigate to="/servefast" replace />} />
    </Routes>
  );
}
