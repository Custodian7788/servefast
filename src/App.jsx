import React from "react";
import Logo, { BG } from "./Logo.jsx";

export default function App() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: BG }}>
      <header className="px-5 py-4">
        <Logo />
      </header>
    </div>
  );
}
