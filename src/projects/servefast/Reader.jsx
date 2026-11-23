import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ExternalLink } from "lucide-react";
import openStory from "./openStory.js";
import { INK, LINE, ORANGE } from "../../theme.js";
import { sinceLabel } from "./Story.jsx";

// An article, read inside the block. The site's own page cannot be framed -
// news sites forbid it - so the server fetches it and we set the text
// ourselves. Nothing here costs anything: no model is involved.
export default function Reader({ item, onBack, onOpenOut = openStory }) {
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
        {item.source && (
          <span
            className="text-[10px] font-bold uppercase tracking-[0.06em] opacity-45"
            style={{ color: INK }}
          >
            {item.source}
          </span>
        )}
        <button
          onClick={(e) => onOpenOut?.(e, item.url)}
          className="hover:opacity-70"
          style={{ color: ORANGE }}
          aria-label="Open at the source"
          title="Open at the source"
        >
          <ExternalLink size={12} />
        </button>
      </div>

      <div ref={top} className="no-bar flex-1 min-h-0 overflow-y-auto px-4 py-3">
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
          <div className="mt-5">
            <p className="text-[13px] leading-[1.5]" style={{ color: INK }}>
              {state.reason}
            </p>
            <button
              onClick={(e) => onOpenOut?.(e, item.url)}
              className="mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em] hover:opacity-70"
              style={{ color: ORANGE }}
            >
              Read it at the source <ExternalLink size={12} />
            </button>
          </div>
        ) : (
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
            {(state.paragraphs || []).map((p, i) =>
              p.kind === "head" ? (
                <h3
                  key={i}
                  className="mt-5 mb-1 text-[13px] font-bold leading-[1.35]"
                  style={{ color: INK }}
                >
                  {p.text}
                </h3>
              ) : (
                <p key={i} className="mb-3 text-[14px] leading-[1.55]" style={{ color: INK }}>
                  {p.text}
                </p>
              )
            )}
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

// The bottom half of the block, fixed at the halfway line.
function Strip({ item }) {
  return (
    <div className="shrink-0 h-1/2 flex flex-col" style={{ borderTop: `1px solid ${LINE}` }}>
      <div
        className="shrink-0 flex items-center justify-center h-7"
        style={{ borderBottom: `1px solid ${LINE}` }}
      >
        <span
          className="font-bold uppercase tracking-[0.12em] text-[10.5px]"
          style={{ color: ORANGE }}
        >
          Perspective
        </span>
      </div>
      <div className="flex-1 min-h-0" />
    </div>
  );
}
