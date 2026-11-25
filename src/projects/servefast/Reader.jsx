import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import openStory from "./openStory.js";
import { FRAME, INK, LINE, NAV_BG, ORANGE } from "../../theme.js";
import { sinceLabel } from "./Story.jsx";

// An article, read inside the block. The site's own page cannot be framed -
// news sites forbid it - so the server fetches it and we set the text
// ourselves. Nothing here costs anything: no model is involved.
// Half the sites refuse to be read, so when one does you paste the article
// in yourself. It is kept against that story, so it is there next time and
// Perspective works from it.
function Paste({ item, onSaved }) {
  const [text, setText] = useState("");

  function save(value) {
    if (value.trim().length < 80) return;
    fetch("/api/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: item.url, text: value }),
    })
      .then((r) => r.json())
      .then((data) => onSaved(data))
      .catch(() => {});
  }

  return (
    <div className="mt-4 pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${LINE}` }}>
      <button
        type="button"
        onClick={(e) => openStory(e, item.url)}
        className="self-start flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-[#FFF3E8]"
        style={{ color: ORANGE, border: `1px solid ${ORANGE}` }}
      >
        Open the original <ExternalLink size={12} />
      </button>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          save(e.target.value);
        }}
        className="no-bar w-full h-48 p-2 text-[13px] leading-[1.5] outline-none resize-none"
        style={{ border: `1px solid ${LINE}`, color: INK }}
      />
    </div>
  );
}

export default function Reader({ item, onBack, onClear, onOpenOut = openStory }) {
  const [state, setState] = useState({ loading: true });
  const top = useRef(null);

  useEffect(() => {
    if (!item?.url) {
      setState({ loading: false });
      return undefined;
    }
    let alive = true;
    setState({ loading: true });
    top.current?.scrollTo({ top: 0 });

    fetch("/api/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: item.url }),
    })
      .then((r) => r.json())
      .then((data) => alive && setState({ loading: false, ...data }))
      .catch(() => alive && setState({ loading: false, blocked: true, reason: "That site did not answer" }));

    return () => {
      alive = false;
    };
  }, [item?.id, item?.url]);

  // Nothing picked yet. The block waits rather than showing a broken shell.
  if (!item) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center">
        <p className="text-[12px] leading-[1.6] opacity-35" style={{ color: INK }}>
          Pick a headline on the left and it opens here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className="shrink-0 flex items-center gap-2 px-2.5 h-7"
        style={{ borderBottom: `1px solid ${LINE}` }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.09em] hover:opacity-70"
            style={{ color: ORANGE }}
          >
            <ChevronLeft size={12} /> List
          </button>
        )}
        <span className="flex-1" />
        {/* The original, then Clear. Same colour, same gap, same height. */}
        <button
          onClick={(e) => onOpenOut?.(e, item.url)}
          className="flex items-center h-5 hover:opacity-70"
          style={{ color: ORANGE, transform: "translateY(-1px)" }}
          aria-label="Open the original"
          title="Open the original"
        >
          <ExternalLink size={12} />
        </button>
        <button
          onClick={() => onClear?.()}
          className="flex items-center h-5 text-[10px] font-bold uppercase tracking-[0.09em] hover:opacity-70"
          style={{ color: ORANGE }}
          title="Clear this article"
        >
          Clear
        </button>
      </div>

      <div ref={top} className="no-bar flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-8">
        <h2 className="text-[15px] font-bold leading-[1.3]" style={{ color: INK }}>
          {state.title && state.title.length > item.text.length ? state.title : item.text}
        </h2>
        {item.publishedAt && (
          <p
            className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.07em]"
            style={{ color: ORANGE }}
          >
            {sinceLabel(item.publishedAt)}
            {state.words ? ` · ${state.words.toLocaleString("en-GB")} words` : ""}
          </p>
        )}

        {state.loading ? (
          <p className="mt-6 text-[12px] uppercase tracking-[0.06em] animate-pulse" style={{ color: ORANGE }}>
            Fetching the article
          </p>
        ) : state.blocked ? (
          <Paste item={item} onSaved={(data) => setState({ loading: false, ...data })} />
        ) : (
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
            <p className="text-[14px] leading-[1.55]" style={{ color: INK }}>
              {(state.paragraphs || []).map((p) => p.text).join(" ")}
            </p>
            <button
              onClick={(e) => onOpenOut?.(e, item.url)}
              className="mt-2 mb-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em] opacity-60 hover:opacity-100"
              style={{ color: ORANGE }}
            >
              Open the original <ExternalLink size={11} />
            </button>
          </div>
        )}
      </div>

      <Strip item={item} />
    </div>
  );
}

// The bottom half of the block. Each answer is a table of its own; asking a
// question pushes a new one on and slides the last one left, so the whole
// chain stays there to step back through.
function Strip({ item }) {
  const [frames, setFrames] = useState([]);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    setFrames([]);
    setAt(0);
    setQuestion("");
    setBusy(false);
  }, [item?.id]);

  // What has been said so far, so a question can build on it.
  function sofar() {
    return frames.flatMap((f) => [
      f.question ? `Q: ${f.question}` : "Opening read:",
      ...(f.fields || []).map((x) => `${x.label}: ${x.text}`),
    ]);
  }

  function ask(asked) {
    if (busy || !item) return;
    setBusy(true);
    const prior = sofar();
    fetch("/api/story", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: item.url,
        title: item.text,
        source: item.source,
        category: item.category,
        question: asked || "",
        prior,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setBusy(false);
        if (!data.fields?.length) return;
        setFrames((list) => {
          const next = [...list, { question: asked || "", fields: data.fields }];
          setAt(next.length - 1);
          return next;
        });
        setQuestion("");
      })
      .catch(() => setBusy(false));
  }

  const frame = frames[at];

  return (
    <div className="shrink-0 h-[62%] flex flex-col" style={{ borderTop: `2px solid ${FRAME}` }}>
      <div
        className="shrink-0 flex items-center gap-2 px-2.5 h-7"
        style={{ borderBottom: `2px solid ${FRAME}`, backgroundColor: NAV_BG }}
      >
        <button
          type="button"
          onClick={() => setAt((i) => Math.max(i - 1, 0))}
          disabled={at === 0}
          className="disabled:opacity-20 hover:opacity-70"
          style={{ color: ORANGE }}
          aria-label="Back"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="flex-1 flex items-center justify-center">
          <button
            type="button"
            onClick={() => ask("")}
            disabled={!item || busy || frames.length > 0}
            className="flex items-center leading-none font-bold uppercase tracking-[0.12em] text-[10.5px] enabled:hover:opacity-70 disabled:cursor-default"
            style={{ color: ORANGE }}
          >
            {frame?.question ? frame.question : "Perspective"}
            {frames.length > 1 && (
              <span className="ml-1.5 opacity-50 tabular-nums">
                {at + 1}/{frames.length}
              </span>
            )}
          </button>
        </span>
        <button
          type="button"
          onClick={() => setAt((i) => Math.min(i + 1, frames.length - 1))}
          disabled={at >= frames.length - 1}
          className="disabled:opacity-20 hover:opacity-70"
          style={{ color: ORANGE }}
          aria-label="Forward"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="no-bar w-[68%] min-w-0 overflow-y-auto px-3 py-1">
          {!item ? null : busy && !frames.length ? (
            <p className="mt-2 text-[11px] uppercase tracking-[0.06em] animate-pulse" style={{ color: ORANGE }}>
              Working it out
            </p>
          ) : !frame ? null : (
            <table className="w-full border-collapse">
              <tbody>
                {frame.fields.map((f, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${LINE}` }}>
                    <td
                      className="align-top py-1.5 pr-2 text-[10px] font-bold uppercase tracking-[0.07em]"
                      style={{ color: ORANGE, width: "30%" }}
                    >
                      {f.label}
                    </td>
                    <td className="align-top py-1.5 text-[12.5px] leading-[1.45]" style={{ color: INK }}>
                      {f.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="w-[32%] min-w-0 flex flex-col gap-2 p-2.5" style={{ borderLeft: `2px solid ${FRAME}` }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (question.trim()) ask(question.trim());
              }
            }}
            placeholder={frames.length ? "Ask about this" : ""}
            disabled={!frames.length || busy}
            className="no-bar flex-1 min-h-0 w-full p-2 text-[12.5px] leading-[1.45] outline-none resize-none disabled:opacity-40"
            style={{ border: `1px solid ${LINE}`, color: INK }}
          />
          <button
            type="button"
            onClick={() => question.trim() && ask(question.trim())}
            disabled={!question.trim() || busy}
            className="self-stretch px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors enabled:hover:bg-[#FFF3E8] disabled:opacity-25"
            style={{ color: ORANGE, border: `1px solid ${ORANGE}` }}
          >
            {busy ? "Working" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
