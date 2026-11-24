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

const SYSTEM = `You write the Perspective on one news story, for an investor
in technology companies.

The reader has just read the article. They know what happened. Never retell
it and never explain it back. Perspective is the context around the event
that the article does not give: where the industry stands, who the players
are, who this helps and hurts, and when it shows up in money.

You may and should use what you know about how these industries are
structured, who supplies whom, and what has happened before. That is the
whole value: the reader cannot get it from the article. Name companies.
Give a figure when you are sure of it.

Your knowledge has a cutoff and this story is newer than it. Where the last
few months would change the answer and you cannot know them, say so in a
few words rather than guessing.

Six fields, each one short line. No field longer than 28 words. Plain
sentences, no lists inside a field, no preamble, no repeating the label.

1. "industry" - which industry this sits in and the state it is in right
   now: growing, consolidating, under pressure, newly opened by a rule.
2. "companies" - the companies this lands on, named, with a word each on
   why. The one in the story first, then the ones it reaches.
3. "changes" - the mechanism. What is actually different now: a cost, a
   licence, a volume, a customer, a market opened or closed.
4. "winners" - who gains and who loses, by name, and roughly how much it
   matters to each. If it is genuinely even, say so.
5. "timeframe" - when this shows up in anybody's numbers. A quarter, a
   year, a decade. Be specific about which, and whose.
6. "watch" - the next observable thing that tells you it is playing out: a
   filing, an order, a launch, a regulator, a line in a named firm's next
   results. Say roughly when it is due.

Banned, because they say nothing: adds uncertainty, raises questions, may
affect sentiment, remains to be seen, could prove significant, investors
will be watching, time will tell, through sentiment, risks remain. If a
field has no honest answer, write one short sentence saying why rather than
filling it with those.

Never recommend buying or selling and never give a price target.

Return JSON only, in this exact shape and nothing else:
{"industry":"...","companies":"...","changes":"...","winners":"...","timeframe":"...","watch":"..."}`;

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
    // Prefer the body we already hold, whether it was fetched or pasted in
    // by hand. Only go to the site when we have nothing.
    let body = "";
    if (ready && url) {
      try {
        const held = await get(`sf:read:${crypto.createHash("sha256").update(url).digest("hex").slice(0, 24)}`);
        if (held) {
          const parsed = JSON.parse(held);
          body = (parsed.paragraphs || []).map((p) => p.text).join("\n\n").slice(0, 12000);
        }
      } catch {
        // Fall through to fetching it.
      }
    }
    if (!body) body = await readArticle(url);

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

    const FIELDS = ["industry", "companies", "changes", "winners", "timeframe", "watch"];
    const out = { fields: FIELDS.map((key) => ({ key, text: String(written[key] || "").trim() })).filter((f) => f.text) };

    const cost = spend(message.usage);

    if (ready && out.fields.length) {
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
