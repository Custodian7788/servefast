import React, { useState } from "react";
import { INK, LINE } from "../../theme.js";

// Commands are typed here, under the files they act on. Enter runs them.
export default function CommandBar({ onRun, disabled }) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRun(value);
      }}
      className="p-3"
    >
      <textarea
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onRun(value);
          }
        }}
        placeholder={disabled ? "Drop a file first" : "What are you looking for?"}
        className="w-full resize-none rounded-md px-3 py-2 text-[13px] leading-[1.45] outline-none bg-white placeholder:opacity-40"
        style={{ border: `1px solid ${LINE}`, color: INK }}
      />
    </form>
  );
}
