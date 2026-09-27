import React from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Logo from "./Logo.jsx";
import Workbench from "./Workbench.jsx";
import { INK, LINE, MAIN_BG, NAV_BG, ORANGE } from "./theme.js";
import ServefastDesktop from "./projects/servefast/Desktop.jsx";
import ServefastMobile from "./projects/servefast/Mobile.jsx";

const PROJECTS = [
  { slug: "servefast", name: "Servefast" },
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
  return (
    <div className="h-screen w-full flex flex-col" style={{ backgroundColor: MAIN_BG }}>
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
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

      <Route
        path="/servefast"
        element={
          <Shell>
            <Workbench base="/servefast" name="Servefast" />
          </Shell>
        }
      />
      <Route path="*" element={<Navigate to="/servefast" replace />} />
    </Routes>
  );
}
