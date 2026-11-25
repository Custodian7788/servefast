import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { readArticle } from "./_article.js";
import { get, set, ready } from "./_kv.js";

// A news article is padded: the same fact three ways, a paragraph of
// background you already have, a quote that says nothing. This hands back the
// story itself in about two hundred words, so the top of the block is a read
// rather than a wall. Written once per article and kept for thirty days.

const MODEL = "claude-sonnet-5-5";
const PRICE = { in: 2, out: 10 };
const TTL_DAYS = 30;

function spend(usage) {
  if (!usage) return 0;
  return (((usage.input_tokens || 0) * PRICE.in + (usage.output_tokens || 0) * PRICE.out) / 1_000_000);
}

const SYSTEM = `You compress one news article for someone who follows
technology industries and has thirty seconds.

Give back the story itself, in at most 200 words, as two or three paragraphs
of plain prose. Not a list, not bullet points, not headings.

Keep: who did what, where, when, the figures, the dates, the names, the
scale, what happens next, and anything the people involved actually said
that carries information.

Drop: the scene-setting opening, background the reader already has, the same
fact said a second way, quotes that only express a feeling, analyst reaction,
and the outlet's own commentary.

Work only from the article in front of you. Never add a fact, a figure or a
date that is not in it. If the article is thin, the summary is short; do not
pad it to reach the limit. Never comment on what the article does not say,
and never mention the text, the source or yourself: no "the article gives no
dates", no "the text provided". Write only what is there.

Write plainly, in full sentences, in the past tense where the event has
happened. No preamble, no "the article says", no closing line about what it
all means.

Return JSON only, in this exact shape and nothing else:
{"summary":"..."}`;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Use POST" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    response.status(500).json({ error: "ANTHROPIC_API_KEY is not set on this project" });
    return;
  }

  const url = request.body?.url || "";
  if (!url) {
    response.status(400).json({ error: "Send a url" });
    return;
  }

  const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 24);
  const key = `sf:sum:v1:${hash}`;

  try {
    if (ready) {
      const kept = await get(key);
      if (kept) {
        response.status(200).json({ ...JSON.parse(kept), cached: true, cost: 0 });
        return;
      }
    }
  } catch {
    // A store that will not answer is not a reason to refuse the summary.
  }

  try {
    // Prefer the body we already hold, fetched or pasted, as api/read.js left
    // it. Only go to the site if we have nothing.
    let body = "";
    if (ready) {
      try {
        const held = await get(`sf:read:${hash}`);
        if (held) {
          body = (JSON.parse(held).paragraphs || []).map((p) => p.text).join("\n\n").slice(0, 16000);
        }
      } catch {
        // Fall through to fetching it.
      }
    }
    if (!body) body = await readArticle(url);

    if (!body || body.length < 400) {
      response.status(200).json({ summary: "", thin: true, cost: 0 });
      return;
    }

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: body }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    let summary = "";
    try {
      summary = String(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)).summary || "").trim();
    } catch {
      response.status(502).json({ error: "Could not read the summary" });
      return;
    }

    const cost = spend(message.usage);

    if (ready && summary) {
      try {
        await set(key, JSON.stringify({ summary }), TTL_DAYS * 24 * 60 * 60);
      } catch {
        // Not worth failing the response over.
      }
    }

    console.log(`summary: ${summary.split(" ").length} words, cost $${cost.toFixed(4)}`);
    response.status(200).json({ summary, cached: false, cost: Number(cost.toFixed(4)) });
  } catch (error) {
    response.status(500).json({ error: error?.message || "Something went wrong" });
  }
}
