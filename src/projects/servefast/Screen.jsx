import React, { useState } from "react";
import CommandBar from "./CommandBar.jsx";
import DropZone from "./DropZone.jsx";
import ResultWindow from "./ResultWindow.jsx";
import { useDocs } from "./useDocs.js";
import { findPassages } from "./search.js";
import { LINE, MAIN_BG, NAV_BG, INK } from "../../theme.js";

export default function Screen() {
  const { docs, busy, error, addFiles, removeDoc, clearDocs } = useDocs();
  const [results, setResults] = useState([]);
  const [index, setIndex] = useState(0);
  const [ran, setRan] = useState(false);

  function run(query) {
    setResults(findPassages(docs, query));
    setIndex(0);
    setRan(Boolean(query.trim()));
  }

  const empty = !docs.length
    ? "Drop a file on the right to begin."
    : ran
    ? "Nothing in those files matches."
    : "Ask for something in the bar above.";

  return (
    <div
      className="h-screen w-full flex flex-col md:flex-row"
      style={{ backgroundColor: MAIN_BG, color: INK }}
    >
      {/* Tools area */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <CommandBar onRun={run} disabled={!docs.length} />
        <ResultWindow results={results} index={index} setIndex={setIndex} empty={empty} />
      </div>

      <aside
        className="h-40 md:h-auto md:w-72 shrink-0 border-t md:border-t-0 md:border-l"
        style={{ backgroundColor: NAV_BG, borderColor: LINE }}
      >
        <DropZone
          docs={docs}
          busy={busy}
          error={error}
          onFiles={addFiles}
          onRemove={removeDoc}
          onClear={clearDocs}
        />
      </aside>
    </div>
  );
}
