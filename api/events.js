import Anthropic from "@anthropic-ai/sdk";
import { FEEDS } from "./feeds.js";

// Pulls a wide set of public feeds, then has Claude keep only the items that
// change the rules, the costs or who supplies whom, rewritten as one factual
// line each. The key never leaves the server.
//
// Two stages, because sending 600 full items to Opus costs about forty cents a
// sweep and most of them are going to be thrown away:
//   1. Haiku reads the headlines alone and says which numbers are worth it.
//   2. Opus reads only those, in full, and writes the summary and perspective.
// The money is in the second stage, so the first one keeps it small.

const MAX_PER_FEED = 20;
const MAX_ITEMS = 600;
const WINDOW_HOURS = 24;
const KEEP = 20; // events a sweep returns at most

const SIFT_MODEL = "claude-haiku-5-5";
const WRITE_MODEL = "claude-opus-5-5";

// Dollars per million tokens, so a response can say what it just cost.
const PRICES = {
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
  "claude-opus-5-5": { in: 4, out: 20 },
};

function spend(model, usage) {
  const price = PRICES[model];
  if (!price || !usage) return 0;
  return (
    ((usage.input_tokens || 0) * price.in + (usage.output_tokens || 0) * price.out) / 1_000_000
  );
}

function stripTags(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(block, names) {
  for (const name of names) {
    const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
    if (match) return stripTags(match[1]);
  }
  return "";
}

function parseFeed(xml, source) {
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];
  return blocks.slice(0, MAX_PER_FEED).map((block) => {
    const link =
      firstTag(block, ["link"]) ||
      (/<link[^>]*href="([^"]+)"/i.exec(block) || [])[1] ||
      "";
    return {
      source,
      title: firstTag(block, ["title"]),
      summary: firstTag(block, ["description", "summary"]).slice(0, 300),
      published: firstTag(block, ["pubDate", "published", "updated"]),
      link,
    };
  });
}

async function readFeed({ source, url }) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "servefast/1.0 (+https://servefast.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    return parseFeed(await response.text(), source);
  } catch {
    return []; // a feed that is down counts as nothing
  }
}

// On a top-up, an item whose feed gives no usable date is treated as old, not
// as new. Dating it "now" would send it again every fifteen minutes.
function recentFirst(items, sinceMs) {
  const cutoff = sinceMs || Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
  return items
    .map((item) => ({ ...item, at: Date.parse(item.published) || 0 }))
    .filter((item) => (item.at ? item.at >= cutoff : !sinceMs))
    .map((item) => ({ ...item, at: item.at || Date.now() }))
    .sort((a, b) => b.at - a.at);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 70);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const CATEGORIES = [
  "AI",
  "Semiconductors",
  "Software",
  "Cloud and data centres",
  "Cybersecurity",
  "Robotics and automation",
  "Autonomous and EV",
  "Defence tech",
  "Space",
  "Fintech",
  "Biotech and health tech",
  "Clean energy and grid",
  "Internet and platforms",
];

const SIFT = `You are the first pass over a day of raw headlines for an investor
who follows technology industries. You only decide what is worth reading. You
never summarise and you never explain.

KEEP a headline when you can name an industry and say what changes for it:
- rules: law, sanction, export control, licence, ruling, treaty, approval
- money: tariff, subsidy, tax, rate, price move, funding round, contract award
- supply: conflict, route, resource access, plant, capacity, nationalisation
- technology and companies: a product or service reaching a new stage
  (robotaxi approvals and city launches, a model or chip shipping, a drug
  approved, a reactor connected), a big investment, a partnership, a
  management decision that changes what a company sells or where
- demand: a customer, state or sector buying or stopping buying at scale

DROP only what truly has no industry edge: opinion and commentary, polls,
sport, crime, celebrity, weather, personnel gossip, routine index moves,
analyst forecasts, and anything where the only thing you could write is that it
"adds uncertainty" or "may affect sentiment".

Be generous rather than strict: if a headline would make a reader of that
industry stop and read, keep it. Twenty good items is a better day's work than
three perfect ones. Drop near-duplicates of the same event, keeping the
clearest one.

Every kept item must sit in exactly one of these categories:
${CATEGORIES.join(", ")}.
If a headline fits none of them even loosely, drop it.

Return JSON only, nothing else, at most ${KEEP} items, strongest first:
{"keep":[{"n":12,"category":"Autonomous and EV"}]}
"n" is the number printed in front of the headline. If nothing qualifies,
return {"keep":[]}.`;

const WRITE = `You write up news events for an investor who wants to know what
is moving in technology industries. Every item you are given has already been
judged worth keeping, so write up all of them. Keep the category it arrives
with.

For each one, give:

1. "headline" - the fact, in one sentence of at most 24 words. What happened
   and who did it. No forecasting, no adjectives of significance.
2. "summary" - two or three sentences, at most 55 words, of what the item
   actually says: who, what, where, the numbers and dates it gives, and what
   happens next if it says so. Only what is in the item; never invent detail.
3. "effects" - one to three industries it lands on. For each:
   - "industry": ordinary vocabulary, as specific as the item allows -
     "robotaxi operators" beats "technology", "chip equipment makers" beats
     "semiconductors".
   - "direction": "tailwind", "headwind" or "mixed", for companies in it.
   - "consequence": one sentence, at most 22 words, on what actually changes -
     a cost, a volume, a licence, a market opened or closed - and for whom.
   - "investing": one sentence, at most 26 words, on what it means for money
     in that industry: who gains, who loses, how big, how long. Never
     recommend buying or selling, never give a price target, and never write
     something that would be true of any news item.

Return JSON only, in this exact shape and nothing else:
{"events":[{"n":12,"headline":"...","summary":"...","category":"Autonomous and EV","effects":[{"industry":"robotaxi operators","direction":"tailwind","consequence":"...","investing":"..."}]}]}

"n" is the number printed in front of the item, so each write-up can be matched
back. Order them by category so related ones sit together.`;

function readJSON(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON in the answer");
  return JSON.parse(text.slice(start, end + 1));
}

function textOf(message) {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

export default async function handler(request, response) {
  if (request.method !== "POST" && request.method !== "GET") {
    response.status(405).json({ error: "Use GET or POST" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    response.status(500).json({ error: "ANTHROPIC_API_KEY is not set on this project" });
    return;
  }

  try {
    const extra = []
      .concat(request.body?.extra || [])
      .filter((url) => typeof url === "string" && /^https?:\/\//i.test(url))
      .slice(0, 15)
      .map((url) => ({ source: new URL(url).hostname.replace(/^www\./, ""), url }));

    const since = Number(request.body?.since) || 0;
    const topUp = since > 0 && Date.now() - since < WINDOW_HOURS * 60 * 60 * 1000;

    const pulled = (await Promise.all([...FEEDS, ...extra].map(readFeed))).flat();
    const items = dedupe(recentFirst(pulled, topUp ? since : 0)).slice(0, MAX_ITEMS);

    if (!items.length) {
      response.status(200).json({ events: [], read: 0, topUp, cost: 0 });
      return;
    }

    const client = new Anthropic({ apiKey });
    let cost = 0;

    // Stage one: headlines only. This is what makes the whole thing cheap -
    // no descriptions, no links, and the small model.
    const titles = items.map((item, i) => `${i + 1}. [${item.source}] ${item.title}`).join("\n");

    const sifted = await client.messages.create({
      model: SIFT_MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: SIFT,
      messages: [
        { role: "user", content: `Today is ${new Date().toISOString().slice(0, 10)}.\n\n${titles}` },
      ],
    });
    cost += spend(SIFT_MODEL, sifted.usage);

    let keep = [];
    try {
      keep = readJSON(textOf(sifted)).keep || [];
    } catch {
      response.status(502).json({ error: "Could not read the first pass", raw: textOf(sifted).slice(0, 400) });
      return;
    }

    const chosen = keep
      .map((pick) => ({ ...pick, item: items[Number(pick.n) - 1] }))
      .filter((pick) => pick.item && CATEGORIES.includes(pick.category))
      .slice(0, KEEP);

    if (!chosen.length) {
      response.status(200).json({ events: [], read: items.length, topUp, cost });
      return;
    }

    // Stage two: only the chosen few, in full, on the good model.
    const full = chosen
      .map(
        (pick, i) =>
          `${i + 1}. (${pick.category}) [${pick.item.source}] ${pick.item.title}${
            pick.item.summary ? ` - ${pick.item.summary}` : ""
          }`
      )
      .join("\n");

    const written = await client.messages.create({
      model: WRITE_MODEL,
      max_tokens: 12000,
      output_config: { effort: "medium" },
      system: WRITE,
      messages: [
        { role: "user", content: `Today is ${new Date().toISOString().slice(0, 10)}.\n\n${full}` },
      ],
    });
    cost += spend(WRITE_MODEL, written.usage);

    let events = [];
    try {
      events = readJSON(textOf(written)).events || [];
    } catch {
      response.status(502).json({ error: "Could not read the model's answer", raw: textOf(written).slice(0, 400) });
      return;
    }

    const out = events
      .filter((event) => Array.isArray(event.effects) && event.effects.length)
      .map((event, i) => {
        const pick = chosen[Number(event.n) - 1] || chosen[i] || chosen[0];
        return {
          id: `ev-${Date.now()}-${i}`,
          date: new Date().toISOString().slice(0, 10),
          text: event.headline || event.text || "",
          summary: event.summary || "",
          publishedAt: new Date(pick.item.at || Date.now()).toISOString(),
          category: event.category || pick.category || "",
          effects: event.effects.slice(0, 3).map((effect) => ({
            industry: effect.industry || "",
            direction: effect.direction || "",
            consequence: effect.consequence || "",
            investing: effect.investing || "",
          })),
          source: pick.item.source || "",
          url: pick.item.link || "",
        };
      });

    // Shows up in the Vercel log for the call, so a surprise is traceable.
    console.log(
      `events: read ${items.length}, sifted to ${chosen.length}, wrote ${out.length}, cost $${cost.toFixed(4)}${topUp ? " (top-up)" : ""}`
    );

    response.status(200).json({
      events: out,
      read: items.length,
      topUp,
      cost: Number(cost.toFixed(4)),
    });
  } catch (error) {
    response.status(500).json({ error: error?.message || "Something went wrong" });
  }
}
