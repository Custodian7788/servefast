import React, { useState } from "react";
import { INK, LINE, ORANGE } from "../../theme.js";

// The one place commands are typed, across the top of the tools area.
export default function CommandBar({ onRun, disabled }) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRun(value);
      }}
      className="shrink-0 px-4 pt-4"
    >
      <div className="flex items-center gap-2 rounded bg-white px-3" style={{ border: `2px solid ${LINE}` }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={disabled ? "Drop a file first" : "Give me all passages where I mention…"}
          className="flex-1 min-w-0 h-11 text-[13px] outline-none bg-transparent"
          style={{ color: INK }}
        />
        <button
          type="submit"
          className="text-[11px] font-bold uppercase tracking-wide shrink-0"
          style={{ color: ORANGE }}
        >
          Run
        </button>
      </div>
    </form>
  );
}
