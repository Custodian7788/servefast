import React, { useState } from "react";
import { INK, LINE, ORANGE } from "../../theme.js";

// Commands are typed here, under the files they act on.
export default function CommandBar({ onRun, disabled }) {
  const [value, setValue] = useState("");

  function submit(e) {
    e.preventDefault();
    onRun(value);
  }

  return (
    <form onSubmit={submit} className="h-full flex flex-col p-2 gap-1.5">
      <div
        className="px-0.5 text-[10px] font-bold uppercase tracking-wide"
        style={{ color: INK }}
      >
        Command
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) submit(e);
        }}
        placeholder={disabled ? "Drop a file first" : "Every passage where I mention the invoice"}
        className="flex-1 min-h-0 resize-none rounded px-2 py-1.5 text-[12px] leading-snug outline-none bg-white"
        style={{ border: `1.5px solid ${LINE}`, color: INK }}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] opacity-45" style={{ color: INK }}>
          "quotes" for exact
        </span>
        <button
          type="submit"
          className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: ORANGE }}
        >
          Run
        </button>
      </div>
    </form>
  );
}
