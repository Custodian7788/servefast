import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { get, set, ready } from "./_kv.js";

// The profile of one master industry, built once and reused by every story
// that lands in it. Same structure every time, which is the point: the shape
// is what gets learned, not any one write-up.
//
// Thirteen of these cover the whole list, so the first story in a category
// pays for it and the rest are free.

const MODEL = "claude-sonnet-5-5";
const PRICE = { in: 2, out: 10 };
const TTL_DAYS = 45;

function spend(usage) {
  if (!usage) return 0;
  return (((usage.input_tokens || 0) * PRICE.in + (usage.output_tokens || 0) * PRICE.out) / 1_000_000);
}

const SYSTEM = `You write the standing profile of one industry, for an
investor in technology companies. It is not about any news story. It is the
map of the industry that every story in it will be read against, so it must
be structural and durable, not topical.

Give back:

1. "master" - the industry as it should be headed. Use the name you are
   given unless it is plainly wrong.
2. "size" - what the industry is worth globally, with the year, and how fast
   it is growing. One line, at most 25 words. Say plainly when a figure is
   an estimate or a range, and give the range.
3. "shape" - 60 to 80 words on how the industry is actually organised: what
   the value chain is, where the money concentrates along it, how
   concentrated the whole thing is, and what the industry as a whole depends
   on from outside itself.
4. "segments" - four to six segments that together make up the industry,
   ordered from the deepest input to the end customer. These are the parts
   someone would track separately. For each:
   - "name": two or three words.
   - "size": what that segment is worth, with a year, in at most eight
     words, or "" if you are not reasonably sure. Never invent a number to
     fill the field and never add a parenthetical caveat here.
   - "firms": the firms holding it, at most four, biggest first, each with
     "share" as a whole number percent of that segment. Estimates are
     expected; make them add to about 100 and do not imply precision you do
     not have.
   - "where": the countries or regions it physically sits in, at most four,
     named plainly and nothing else.
   - "choke": true for the one segment where supply is hardest to add and
     which therefore constrains the whole industry. Exactly one segment
     carries this, two at the very most.
   - "policy": at most six words, only where a rule, licence, control or
     tariff lands on that segment, naming who imposes it. "US licences on
     tools to China". No dates, no parentheses, no history. Leave it out
     everywhere else.
5. "watch" - 25 words at most on what would change this picture: the shift
   that would move the concentration or break the chokepoint.

Use what you know about how this industry is structured, who supplies whom
and what has happened. Name real firms. Your knowledge has a cutoff, so where
a figure may have moved recently, say so in a clause rather than stating it
flatly.

Banned, because they say nothing: rapidly evolving, dynamic landscape,
increasingly important, poised for growth, adds uncertainty, remains to be
seen. Never recommend buying or selling and never give a price target.

Return JSON only, in this exact shape and nothing else:
{"master":"Semiconductors","size":"...","shape":"...","segments":[{"name":"...","size":"...","firms":[{"name":"...","share":50}],"where":"...","choke":true,"policy":"..."}],"watch":"..."}`;

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

  const master = String(request.body?.master || "").trim();
  if (!master) {
    response.status(400).json({ error: "Send a master industry" });
    return;
  }

  const key = `sf:industry:v2:${crypto.createHash("sha256").update(master.toLowerCase()).digest("hex").slice(0, 20)}`;

  try {
    if (ready && !request.body?.rebuild) {
      const kept = await get(key);
      if (kept) {
        response.status(200).json({ ...JSON.parse(kept), cached: true, cost: 0 });
        return;
      }
    }
  } catch {
    // A store that will not answer is not a reason to refuse the profile.
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      output_config: { effort: "medium" },
      system: SYSTEM,
      messages: [
        { role: "user", content: `Today is ${new Date().toISOString().slice(0, 10)}.\n\nThe industry: ${master}` },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    let got;
    try {
      got = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    } catch {
      response.status(502).json({ error: "Could not read the profile" });
      return;
    }

    const out = {
      master: String(got.master || master).trim(),
      size: String(got.size || "").trim(),
      shape: String(got.shape || "").trim(),
      watch: String(got.watch || "").trim(),
      builtAt: Date.now(),
      segments: (got.segments || []).slice(0, 6).map((st) => ({
        name: String(st.name || "").trim(),
        size: String(st.size || "").trim(),
        where: String(st.where || "").trim(),
        choke: Boolean(st.choke),
        policy: String(st.policy || "").trim(),
        firms: (st.firms || [])
          .slice(0, 4)
          .map((f) => ({
            name: String(f.name || "").trim(),
            share: Math.max(0, Math.min(100, Math.round(Number(f.share) || 0))),
          }))
          .filter((f) => f.name),
      })).filter((st) => st.name),
    };

    const cost = spend(message.usage);

    if (ready && out.segments.length) {
      try {
        await set(key, JSON.stringify(out), TTL_DAYS * 24 * 60 * 60);
      } catch {
        // Not worth failing the response over.
      }
    }

    console.log(`industry: ${out.master}, ${out.segments.length} segments, cost $${cost.toFixed(4)}`);
    response.status(200).json({ ...out, cached: false, cost: Number(cost.toFixed(4)) });
  } catch (error) {
    response.status(500).json({ error: error?.message || "Something went wrong" });
  }
}
