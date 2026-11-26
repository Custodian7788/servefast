import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { readArticle } from "./_article.js";
import { get, set, ready } from "./_kv.js";
import { recordRead } from "./_map.js";

// Where one story sits on the industry profile.
//
// The profile is the standing map, built once per industry and reused by
// every story in it. This is the thin layer on top: which segment the event
// lands in, where the company sits in that segment, and what the event does
// to that position. Small, cheap, and written against a structure the reader
// already has in front of them.

const MODEL = "claude-sonnet-5-5";
const PRICE = { in: 2, out: 10 };
const TTL_DAYS = 30;

function spend(usage) {
  if (!usage) return 0;
  return (((usage.input_tokens || 0) * PRICE.in + (usage.output_tokens || 0) * PRICE.out) / 1_000_000);
}

function keyFor(url, title, question = "") {
  const seed = `${url || title || ""}::${question}`.trim().toLowerCase();
  return `sf:story:v8:${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
}

const SYSTEM = `You place one news story on an industry map the reader
already has in front of them.

You are given the industry profile - its segments, who holds them, the
chokepoint - and the story. The reader has read both. Never retell the
article and never repeat the profile back to them. Say only where this event
lands on that map and what it moves.

Give back:

1. "segment" - the name of the segment from the profile that this story
   lands in, copied character for character from the list you are given. If
   it genuinely sits between two, pick the one it moves most.
2. "company" - the company the story turns on, named.
3. "position" - 30 to 45 words on where that company actually sits in that
   segment: its share or rank, what it depends on from the segments either
   side of it, and what it has that the others do not.
4. "move" - 40 to 60 words on what this event does to that position. Does it
   harden the hold, loosen it, move the chokepoint, or change who the
   customer is? Name who gains and who loses by it. If the honest answer is
   that the position does not move, say so plainly in one sentence: that is
   a useful answer and a common one.
5. "lean" - at most 14 words on which way this market is moving now, in
   plain words: "share drifting to China", "capacity tight into 2027".

Use what you know about how the industry is structured and what has happened
before. Give figures you are sure of. Your knowledge has a cutoff and the
story is newer, so where the last few months would change the answer, say so
in a clause and carry on.

Banned, because they say nothing: adds uncertainty, raises questions, may
affect sentiment, remains to be seen, could prove significant, investors
will be watching, time will tell. Never recommend buying or selling and
never give a price target.

Return JSON only, in this exact shape and nothing else:
{"segment":"Advanced packaging","company":"Nvidia","position":"...","move":"...","lean":"..."}`;

const FOLLOW_UP = `You answer one follow-up question about a news story and
the industry behind it, for an investor in technology companies.

You are given the industry profile, the story, what has already been
established, and the question. Answer the question they asked. Never retell
the article, and never repeat something already established: they are asking
because they want to go further than that.

Use what you know about how the industry is structured, who supplies whom
and what has happened before. Name companies. Give figures you are sure of.
Where the answer turns on the last few months and your knowledge stops
before then, say so in a few words rather than guessing.

Answer in up to five short fields, each a label and one line of at most 30
words. Labels are any short noun phrase, in sentence case, chosen to suit
the question. Fewer is better: one good field beats five padded ones.

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

  const { url = "", title = "", source = "", category = "", question = "", profile = null } =
    request.body || {};

  if (!title) {
    response.status(400).json({ error: "Send at least a title" });
    return;
  }

  const asked = String(question).trim().slice(0, 300);
  const prior = []
    .concat(request.body?.prior || [])
    .filter((line) => typeof line === "string")
    .join("\n")
    .slice(0, 4000);

  const key = keyFor(url, title, asked ? `${prior}||${asked}` : "");

  try {
    if (ready) {
      const kept = await get(key);
      if (kept) {
        response.status(200).json({ ...JSON.parse(kept), cached: true, cost: 0 });
        return;
      }
    }
  } catch {
    // A store that will not answer is not a reason to refuse the story.
  }

  try {
    // Prefer the body we already hold, fetched or pasted. Only go to the
    // site when we have nothing.
    let body = "";
    if (ready && url) {
      try {
        const held = await get(`sf:read:v2:${crypto.createHash("sha256").update(url).digest("hex").slice(0, 24)}`);
        if (held) {
          body = (JSON.parse(held).paragraphs || []).map((p) => p.text).join("\n\n").slice(0, 12000);
        }
      } catch {
        // Fall through to fetching it.
      }
    }
    if (!body) body = await readArticle(url);

    // The map this answer is written against.
    const map = profile
      ? [
          `Industry: ${profile.master}`,
          profile.size ? `Size: ${profile.size}` : "",
          profile.shape ? `Shape: ${profile.shape}` : "",
          "Segments:",
          ...(profile.segments || []).map(
            (s) =>
              `- ${s.name}${s.size ? ` (${s.size})` : ""}: ${(s.firms || [])
                .map((f) => `${f.name} ${f.share}%`)
                .join(", ")}${s.where ? ` | ${s.where}` : ""}${s.choke ? " | CHOKEPOINT" : ""}${
                s.policy ? ` | policy: ${s.policy}` : ""
              }`
          ),
        ]
          .filter(Boolean)
          .join("\n")
      : "";

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
            map ? `\nThe industry profile:\n${map}` : `Category: ${category || "unfiled"}`,
            `\nOutlet: ${source || "unknown"}`,
            `Headline: ${title}`,
            body ? `\nArticle:\n${body}` : "\nNo article body could be fetched.",
            prior ? `\nAlready established:\n${prior}` : "",
            asked ? `\nThe reader asks: ${asked}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
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
      response.status(502).json({ error: "Could not read the answer", raw: text.slice(0, 300) });
      return;
    }

    const out = asked
      ? {
          question: asked,
          fields: (written.fields || [])
            .slice(0, 5)
            .map((f) => ({ label: String(f.label || "").trim(), text: String(f.text || "").trim() }))
            .filter((f) => f.text),
        }
      : {
          segment: String(written.segment || "").trim(),
          company: String(written.company || "").trim(),
          lean: String(written.lean || "").trim(),
          fields: [
            written.position && { label: "Where it sits", text: String(written.position).trim() },
            written.move && { label: "What this moves", text: String(written.move).trim() },
          ].filter((f) => f && f.text),
        };

    const cost = spend(message.usage);

    if (ready && out.fields.length) {
      try {
        await set(key, JSON.stringify(out), TTL_DAYS * 24 * 60 * 60);
      } catch {
        // Not worth failing the response over.
      }
    }

    // The map is the by-product of a first read, not of looking again.
    if (!asked && profile?.master) {
      await recordRead({
        market: profile.master,
        category: category || profile.master,
        lean: out.lean,
        players: out.company ? [out.company] : [],
        story: { title, url, source },
      });
    }

    console.log(
      `story: ${out.segment || "follow-up"}, ${body ? "article" : "headline only"}, cost $${cost.toFixed(4)}`
    );
    response.status(200).json({ ...out, cached: false, cost: Number(cost.toFixed(4)) });
  } catch (error) {
    response.status(500).json({ error: error?.message || "Something went wrong" });
  }
}
