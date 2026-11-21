import React, { useEffect, useRef, useState } from "react";
import CommandBar from "./CommandBar.jsx";
import DropZone from "./DropZone.jsx";
import ResultWindow from "./ResultWindow.jsx";
import { useDocs } from "./useDocs.js";
import { findPassages } from "./search.js";
import { LINE, MAIN_BG, NAV_BG, INK, ORANGE } from "../../theme.js";

export default function Screen() {
  const { docs, busy, error, addFiles, removeDoc, clearDocs } = useDocs();
  const [results, setResults] = useState([]);
  const [index, setIndex] = useState(0);
  const [ran, setRan] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  // A file dropped anywhere on the page counts, not only on the dashed box -
  // and the browser never gets to open it in a tab instead.
  useEffect(() => {
    function over(e) {
      e.preventDefault();
    }
    function enter(e) {
      e.preventDefault();
      dragDepth.current += 1;
      if (e.dataTransfer?.types?.includes("Files")) setDragging(true);
    }
    function leave() {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    }
    function drop(e) {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
    }

    window.addEventListener("dragover", over);
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [addFiles]);

  function run(query) {
    setResults(findPassages(docs, query));
    setIndex(0);
    setRan(Boolean(query.trim()));
  }

  const empty = !docs.length
    ? "Drop a file anywhere to begin."
    : ran
    ? "Nothing in those files matches."
    : "Type a command on the right.";

  return (
    <div
      className="relative h-screen w-full flex flex-col md:flex-row"
      style={{ backgroundColor: MAIN_BG, color: INK }}
    >
      {/* Tools area: results only */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <ResultWindow results={results} index={index} setIndex={setIndex} empty={empty} />
      </div>

      {/* Files on top, commands underneath */}
      <aside
        className="h-[60vh] md:h-auto md:w-72 shrink-0 flex flex-col border-t md:border-t-0 md:border-l"
        style={{ backgroundColor: NAV_BG, borderColor: LINE }}
      >
        <div className="flex-1 min-h-0 p-2">
          <DropZone
            docs={docs}
            busy={busy}
            error={error}
            onFiles={addFiles}
            onRemove={removeDoc}
            onClear={clearDocs}
          />
        </div>
        <div className="h-44 shrink-0 border-t" style={{ borderColor: LINE }}>
          <CommandBar onRun={run} disabled={!docs.length} />
        </div>
      </aside>

      {dragging && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center text-[13px] font-bold uppercase tracking-wide pointer-events-none"
          style={{ backgroundColor: "rgba(255,243,230,0.92)", border: `3px dashed ${ORANGE}`, color: ORANGE }}
        >
          Drop to load
        </div>
      )}
    </div>
  );
}
