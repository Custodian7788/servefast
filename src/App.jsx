import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Screen from "./projects/servefast/Screen.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Screen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
