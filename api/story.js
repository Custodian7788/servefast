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

function keyFor(url, title, question = "") {
  const seed = `${url || title || ""}::${question}`.trim().toLowerCase();
  // Bump the version when the shape of what we store changes, so entries
  // written by an older build are simply ignored rather than half-read.
  return `sf:story:v3:${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
}

const SYSTEM = `You write the opening read on one news story, for an
investor in technology companies.

The reader has just read the article. They know what happened. Never retell
it and never explain it back. You give the context around the event that the
article does not: where the industry stands, and where each company stands.

Two things only.

ONE, the industry. Name it as a market, not as a category: "HBM memory",
"robotaxi operations", "EDA software", "defence electronics". Then up to 45
words on where that market is right now: who leads it, how concentrated it
is, what is growing or shrinking, what the constraint is.

TWO, the companies. Between one and four, the ones this story genuinely
reaches, most affected first. For each, up to 35 words on where that company
stands in that market: its position, what it depends on, what this event
does to it. Not what the article said about it.

Use what you know about how these industries are structured, who supplies
whom and what has happened before. Give figures and dates you are sure of.
Where the answer turns on the last few months and your knowledge stops
before then, say so in a few words rather than guessing.

Banned, because they say nothing: adds uncertainty, raises questions, may
affect sentiment, remains to be seen, could prove significant, investors
will be watching, time will tell. Never recommend buying or selling and
never give a price target.

Return JSON only, in this exact shape and nothing else:
{"industry":{"name":"HBM memory","text":"..."},"companies":[{"name":"SK Hynix","text":"..."}]}`;

const FOLLOW_UP = `You answer one follow-up question about a news story, for
an investor in technology companies.

You are given the story, what has already been established, and the
reader's question. Answer the question they asked, not the one you would
rather answer. Never retell the article, and never repeat a line that is
already in what has been established: they are asking because they want to
go deeper than that.

Use what you know about how these industries are structured, who supplies
whom and what has happened before. Name companies. Give figures you are
sure of. Where the answer turns on the last few months and your knowledge
stops before then, say so in a few words rather than guessing.

Answer in up to six short fields, each a label and one line of at most 28
words. Choose labels that suit the question: any short noun phrase, in
sentence case. Use fewer fields if fewer will do. One good field beats six
padded ones.

Banned, because they say nothing: adds uncertainty, raises questions, may
affect sentiment, remains to be seen, could prove significant, investors
will be watching, time will tell. If you do not know, say what would settle
it instead.

Never recommend buying or selling and never give a price target.

Return JSON only, in this exact shape and nothing else:
{"fields":[{"label":"Short label","text":"..."}]}`;
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

  const { url = "", title = "", source = "", category = "", question = "" } = request.body || {};
  const asked = String(question).trim().slice(0, 300);
  // Every answer so far in this chain, so each question can build on the last
  // and "tell me more about the winners" knows which winners.
  const prior = []
    .concat(request.body?.prior || [])
    .filter((line) => typeof line === "string")
    .join("\n")
    .slice(0, 4000);
  if (!title) {
    response.status(400).json({ error: "Send at least a title" });
    return;
  }

  // A question only means the same thing after the same chain, so the chain
  // is part of what identifies the answer.
  const key = keyFor(url, title, asked ? `${prior}||${asked}` : "");

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
        const held = await get(`sf:read:v2:${crypto.createHash("sha256").update(url).digest("hex").slice(0, 24)}`);
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
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: asked ? FOLLOW_UP : SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            `Today is ${new Date().toISOString().slice(0, 10)}.`,
            `Category: ${category || "unfiled"}`,
            `Outlet: ${source || "unknown"}`,
            `Headline: ${title}`,
            body ? `\nArticle:\n${body}` : "\nNo article body could be fetched.",
            // What has already been said, so "tell me more about the winners"
            // knows which winners, however deep the chain goes.
            prior ? `\nAlready established:\n${prior}` : "",
            asked ? `\nThe reader asks: ${asked}` : "",
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

    // The opening read names its industry and its companies, and those names
    // are what stage two is pressed on. An answer to a question labels its
    // own rows instead, because the question decides what is worth a row.
    const out = asked
      ? {
          question: asked,
          fields: (written.fields || [])
            .slice(0, 6)
            .map((f) => ({ label: String(f.label || "").trim(), text: String(f.text || "").trim() }))
            .filter((f) => f.text),
        }
      : {
          fields: [
            written.industry?.text && {
              label: "Industry",
              name: String(written.industry.name || "").trim(),
              text: String(written.industry.text).trim(),
            },
            ...(written.companies || []).slice(0, 4).map((c) => ({
              label: "Company",
              name: String(c.name || "").trim(),
              text: String(c.text || "").trim(),
            })),
          ].filter((f) => f && f.text),
        };

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
