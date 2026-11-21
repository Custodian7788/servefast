import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Workbench from "./Workbench.jsx";
import { INK, LINE, MAIN_BG, NAV_BG } from "./theme.js";
import ServefastDesktop from "./projects/servefast/Desktop.jsx";
import ServefastMobile from "./projects/servefast/Mobile.jsx";

function TopBar() {
  return (
    <header
      className="h-8 shrink-0 flex items-center justify-end px-3 border-b"
      style={{ backgroundColor: NAV_BG, borderColor: LINE }}
    >
      <button className="flex items-center gap-1 text-[11px] hover:opacity-70" style={{ color: INK }}>
        alex@servefast.com
        <ChevronDown size={11} />
      </button>
    </header>
  );
}

function Sidebar() {
  return <aside className="w-44 shrink-0 border-r" style={{ backgroundColor: NAV_BG, borderColor: LINE }} />;
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
        path="/"
        element={
          <Shell>
            <Workbench base="/servefast" name="Servefast" />
          </Shell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
