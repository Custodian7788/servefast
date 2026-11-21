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
      className="h-full p-2"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onRun(value);
          }
        }}
        placeholder={disabled ? "Drop a file first" : "Every passage where I mention the invoice"}
        className="h-full w-full resize-none rounded px-2 py-1.5 text-[12px] leading-snug outline-none bg-white"
        style={{ border: `1.5px solid ${LINE}`, color: INK }}
      />
    </form>
  );
}
