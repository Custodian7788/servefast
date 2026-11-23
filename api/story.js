import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { readArticle } from "./_article.js";
import { get, set, ready } from "./_kv.js";

// Writes up one story, and only when someone opens it.
//
// The list is free. This is the part that costs, so it is paid for once: the
// write-up is kept under a hash of the story's link, and opening it again is
// a store read. Cost is reported back so the app can show it.

const MODEL = "claude-sonnet-5-5";
const PRICE = { in: 2, out: 10 };
const TTL_DAYS = 30;

function spend(usage) {
  if (!usage) return 0;
  return (
    ((usage.input_tokens || 0) * PRICE.in + (usage.output_tokens || 0) * PRICE.out) / 1_000_000
  );
}

function keyFor(url, title) {
  const seed = (url || title || "").trim().toLowerCase();
  return `sf:story:${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
}

const SYSTEM = `You write up one news story for an investor who wants to know
what is moving in technology industries, and what it means for money.

You are given a headline, the outlet, usually the article itself, and the
industry category it was filed under. Work only from what you are given. Never
invent a figure, a quote, a date or a name.

You do not retell the story. The reader has the article right above you. You
write only the part they cannot get by reading it: what it does to business.

Give back:

1. "relates" - at most 70 words of plain prose, answering one question: how
   does this story relate to business, industry and companies? Name the
   companies it lands on and say through what - an order, a cost, a licence,
   a market opened or closed, a competitor helped or hurt. If the connection
   is thin, say so plainly rather than inflating it. No preamble, no "this
   story shows that", start with the substance.
2. "effects" - one to three industries the story lands on. For each:
- "industry": ordinary vocabulary, as specific as the story allows -
  "robotaxi operators" beats "technology", "chip equipment makers" beats
  "semiconductors".
- "direction": "tailwind", "headwind" or "mixed", for companies in it.
- "consequence": one sentence, at most 22 words, on what actually changes -
  a cost, a volume, a licence, a market opened or closed - and for whom.
- "investing": one sentence, at most 26 words, on what it means for money in
  that industry: who gains, who loses, how big, how long. Name the companies
  the story puts in the firing line. Never recommend buying or selling, never
  give a price target, and never write something that would be true of any
  news item.

Return JSON only, in this exact shape and nothing else:
{"relates":"...","effects":[{"industry":"...","direction":"tailwind","consequence":"...","investing":"..."}]}`;

function readJSON(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON in the answer");
  return JSON.parse(text.slice(start, end + 1));
}

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

  const { url = "", title = "", source = "", category = "" } = request.body || {};
  if (!title) {
    response.status(400).json({ error: "Send at least a title" });
    return;
  }

  const key = keyFor(url, title);

  try {
    if (ready) {
      const kept = await get(key);
      if (kept) {
        const parsed = JSON.parse(kept);
        response.status(200).json({ ...parsed, cached: true, cost: 0 });
        return;
      }
    }
  } catch {
    // A store that will not answer is not a reason to refuse the story.
  }

  try {
    const body = await readArticle(url);

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            `Today is ${new Date().toISOString().slice(0, 10)}.`,
            `Category: ${category || "unfiled"}`,
            `Outlet: ${source || "unknown"}`,
            `Headline: ${title}`,
            body ? `\nArticle:\n${body}` : "\nNo article body could be fetched.",
          ].join("\n"),
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    let written;
    try {
      written = readJSON(text);
    } catch {
      response.status(502).json({ error: "Could not read the write-up", raw: text.slice(0, 300) });
      return;
    }

    const out = {
      relates: written.relates || "",
      effects: (written.effects || []).slice(0, 3).map((effect) => ({
        industry: effect.industry || "",
        direction: effect.direction || "",
        consequence: effect.consequence || "",
        investing: effect.investing || "",
      })),
    };

    const cost = spend(message.usage);

    if (ready && (out.relates || out.effects.length)) {
      // Paid for once. Every later open is a store read.
      try {
        await set(key, JSON.stringify(out), TTL_DAYS * 24 * 60 * 60);
      } catch {
        // Not worth failing the response over.
      }
    }

    console.log(`story: ${body ? "article" : "headline only"}, cost $${cost.toFixed(4)} - ${title.slice(0, 60)}`);

    response.status(200).json({ ...out, cached: false, cost: Number(cost.toFixed(4)) });
  } catch (error) {
    response.status(500).json({ error: error?.message || "Something went wrong" });
  }
}
