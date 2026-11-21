import React, { useState } from "react";
import { FRAME, INK, MAIN_BG, ORANGE } from "../../theme.js";

// Step one of any module: say what you want to learn and what you want out
// of it. Everything the module does afterwards hangs off these two answers.
export default function Setup({ onCreate, onCancel }) {
  const [field, setField] = useState("");
  const [goal, setGoal] = useState("");

  const ready = field.trim() && goal.trim();

  return (
    <div className="h-screen w-full flex items-center justify-center p-6" style={{ backgroundColor: MAIN_BG, color: INK }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onCreate({ field: field.trim(), goal: goal.trim() });
        }}
        className="w-full max-w-xl rounded-md bg-white px-7 py-7"
        style={{ border: `1px solid ${FRAME}` }}
      >
        <div className="text-[9.5px] font-bold tracking-[0.07em]" style={{ color: ORANGE }}>
          NEW MODULE
        </div>

        <label className="block mt-5">
          <span className="block text-[12px] font-bold">What do you want to learn?</span>
          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            autoFocus
            placeholder="Investing"
            className="mt-1.5 w-full rounded px-3 py-2 text-[14px] outline-none placeholder:opacity-35"
            style={{ border: `1px solid ${FRAME}`, color: ORANGE }}
          />
        </label>

        <label className="block mt-4">
          <span className="block text-[12px] font-bold">What do you want to end up with?</span>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            placeholder="A shortlist of companies I would actually buy, and the reasons why"
            className="mt-1.5 w-full resize-none rounded px-3 py-2 text-[14px] leading-snug outline-none placeholder:opacity-35"
            style={{ border: `1px solid ${FRAME}`, color: ORANGE }}
          />
        </label>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={!ready}
            className="px-4 py-2 rounded text-[10px] font-bold tracking-[0.07em] text-white disabled:opacity-25"
            style={{ backgroundColor: ORANGE }}
          >
            BUILD THE FUNNEL
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="text-[10px] opacity-45 hover:opacity-80"
              style={{ color: INK }}
            >
              cancel
            </button>
          ) : (
            <span className="text-[10px] opacity-45">You can change every step afterwards</span>
          )}
        </div>
      </form>
    </div>
  );
}
