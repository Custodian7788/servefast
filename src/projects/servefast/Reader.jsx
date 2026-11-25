import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import openStory from "./openStory.js";
import { INK, LINE, ORANGE } from "../../theme.js";
import { sinceLabel } from "./Story.jsx";

// Two boxes side by side with the list: the article, and the perspective on
// it. The article half costs nothing - the server fetches the page and we set
// the text. The perspective half runs only when its header is pressed.

// Half the sites refuse to be read, so when one does you paste the article in
// yourself. It is kept against that story, so it is there next time and the
// perspective works from it.
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

export function Article({ item, onClear, onOpenOut = openStory }) {
  const [state, setState] = useState({ loading: true });
  const [brief, setBrief] = useState({ idle: true });
  const [long, setLong] = useState(false);
  const top = useRef(null);

  // The article itself is padded. This is the read.
  function summarise() {
    setBrief({ loading: true });
    fetch("/api/summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: item.url }),
    })
      .then((r) => r.json())
      .then((data) => setBrief(data.short ? { short: data.short, full: data.full } : { failed: true }))
      .catch(() => setBrief({ failed: true }));
  }

  useEffect(() => {
    if (!item?.url) {
      setState({ loading: false });
      return undefined;
    }
    let alive = true;
    setState({ loading: true });
    setBrief({ idle: true });
    setLong(false);
    top.current?.scrollTo({ top: 0 });

    fetch("/api/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: item.url }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setState({ loading: false, ...data });
        if (!data.blocked) summarise();
      })
      .catch(() => alive && setState({ loading: false, blocked: true, reason: "That site did not answer" }));

    return () => {
      alive = false;
    };
  }, [item?.id, item?.url]);

  if (!item) {
    return (
      <div className="h-full min-h-[70px] flex items-center justify-center px-6 text-center">
        <p className="text-[12px] leading-[1.6] opacity-35" style={{ color: INK }}>
          Pick a headline on the left and it opens here
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex flex-col">
      <div
        className="shrink-0 flex items-center gap-2 px-2.5 h-7"
        style={{ borderBottom: `1px solid ${LINE}` }}
      >
        <span className="flex-1" />
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

      <div ref={top} className="no-bar min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        <h2 className="text-[15px] font-bold leading-[1.3]" style={{ color: INK }}>
          {state.title && state.title.length > item.text.length ? state.title : item.text}
        </h2>
        {item.publishedAt && (
          <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.07em]" style={{ color: ORANGE }}>
            {sinceLabel(item.publishedAt)}
            {state.words ? ` · ${state.words.toLocaleString("en-GB")} words` : ""}
          </p>
        )}

        {state.loading ? (
          <p className="mt-6 text-[12px] uppercase tracking-[0.06em] animate-pulse" style={{ color: ORANGE }}>
            Fetching the article
          </p>
        ) : state.blocked ? (
          <Paste
            item={item}
            onSaved={(data) => setState({ loading: false, ...data })}
          />
        ) : (
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
            {brief.loading ? (
              <p className="text-[12px] uppercase tracking-[0.06em] animate-pulse" style={{ color: ORANGE }}>
                Reading it for you
              </p>
            ) : brief.short ? (
              <>
                <p className="text-[14px] leading-[1.55] whitespace-pre-line" style={{ color: INK }}>
                  {long && brief.full ? brief.full : brief.short}
                </p>
                {brief.full && brief.full !== brief.short && (
                  <button
                    type="button"
                    onClick={() => setLong((v) => !v)}
                    className="mt-2 text-[10px] font-bold uppercase tracking-[0.09em] hover:opacity-70"
                    style={{ color: ORANGE }}
                  >
                    {long ? "Shorter" : "Longer"}
                  </button>
                )}
              </>
            ) : brief.idle ? (
              <button
                type="button"
                onClick={summarise}
                className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-[#FFF3E8]"
                style={{ color: ORANGE, border: `1px solid ${ORANGE}` }}
              >
                Read it for me
              </button>
            ) : (
              <p className="text-[14px] leading-[1.55]" style={{ color: INK }}>
                {(state.paragraphs || []).map((p) => p.text).join(" ")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Stage one is two things: where the industry stands and where the companies
// stand. Each name is a button, and pressing it is stage two. Every answer
// arrives as its own frame on top of the last, so nothing is overwritten and
// the chain can be stepped back through. Frames live in the workspace, so a
// refresh keeps them and only Clear empties them.
export function Perspective({ item, frames = [], onFrames }) {
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");

  // A new frame is always the one you want to be looking at.
  useEffect(() => {
    setAt(Math.max(frames.length - 1, 0));
  }, [frames.length]);

  useEffect(() => {
    setQuestion("");
    setBusy(false);
  }, [item?.id]);

  function sofar() {
    return frames.flatMap((f) => [
      f.question ? `Q: ${f.question}` : "Opening read:",
      ...(f.fields || []).map((x) => `${x.name ? `${x.name} - ` : ""}${x.text}`),
    ]);
  }

  function ask(asked) {
    if (busy || !item) return;
    setBusy(true);
    fetch("/api/story", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: item.url,
        title: item.text,
        source: item.source,
        category: item.category,
        question: asked || "",
        prior: sofar(),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setBusy(false);
        if (!data.fields?.length) return;
        onFrames?.([...frames, { question: asked || "", fields: data.fields }]);
        setQuestion("");
      })
      .catch(() => setBusy(false));
  }

  const frame = frames[Math.min(at, Math.max(frames.length - 1, 0))];

  return (
    <div className="h-full flex flex-col">
      <div
        className="shrink-0 flex items-center gap-2 px-2.5 h-7"
        style={{ borderBottom: `1px solid ${LINE}` }}
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
        <span className="flex-1 flex items-center justify-center min-w-0">
          <button
            type="button"
            onClick={() => ask("")}
            disabled={!item || busy || frames.length > 0}
            className="flex items-center leading-none font-bold uppercase tracking-[0.12em] text-[10.5px] truncate enabled:hover:opacity-70 disabled:cursor-default"
            style={{ color: ORANGE }}
          >
            {frame?.question || "Perspective"}
            {frames.length > 1 && (
              <span className="ml-1.5 shrink-0 opacity-50 tabular-nums">
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
        <div className="no-bar w-[68%] min-w-0 overflow-y-auto px-3 py-2.5">
          {!item ? null : busy && !frames.length ? (
            <p className="text-[11px] uppercase tracking-[0.06em] animate-pulse" style={{ color: ORANGE }}>
              Working it out
            </p>
          ) : !frame ? null : (
            <div className="flex flex-col gap-3">
              {frame.fields.map((f, i) => (
                <div key={i}>
                  {f.name ? (
                    <button
                      type="button"
                      onClick={() => ask(`Give me the detail on ${f.name}`)}
                      disabled={busy}
                      className="mb-1 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.07em] transition-colors enabled:hover:bg-[#FFF3E8]"
                      style={{ color: ORANGE, border: `1px solid ${ORANGE}` }}
                    >
                      {f.name}
                    </button>
                  ) : (
                    <p
                      className="mb-1 text-[10px] font-bold uppercase tracking-[0.07em]"
                      style={{ color: ORANGE }}
                    >
                      {f.label}
                    </p>
                  )}
                  <p className="text-[13px] leading-[1.5]" style={{ color: INK }}>
                    {f.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-[32%] min-w-0 flex flex-col gap-2 p-2.5" style={{ borderLeft: `1px solid ${LINE}` }}>
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
