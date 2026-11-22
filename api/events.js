import Anthropic from "@anthropic-ai/sdk";
import { FEEDS } from "./feeds.js";

// Pulls a wide set of public feeds, then has Claude keep only the items that
// change the rules, the costs or who supplies whom, rewritten as one factual
// line each. The key never leaves the server.

const MAX_PER_FEED = 20;
const MAX_ITEMS = 600;
const WINDOW_HOURS = 24;

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

function recentFirst(items, sinceMs) {
  const cutoff = sinceMs || Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
  return items
    .map((item) => ({ ...item, at: Date.parse(item.published) || Date.now() }))
    .filter((item) => item.at >= cutoff)
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

const SYSTEM = `You sort raw news into events for an investor who wants to
know what is moving in industries - geopolitics, policy, technology, companies.

KEEP anything where you can name an industry and say what changes for it:
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
analyst forecasts, and anything where the only thing you could write is that
it "adds uncertainty" or "may affect sentiment".

Be generous rather than strict: if an item would make a reader of that
industry stop and read, keep it. Twenty good items is a better day's work than
three perfect ones.

For each event you keep, give:

1. "headline" - the fact, in one sentence of at most 24 words. What happened
   and who did it. No forecasting, no adjectives of significance.
2. "summary" - two or three sentences, at most 55 words, of what the item
   actually says: who, what, where, the numbers and dates it gives, and what
   happens next if it says so. Only what is in the item; never invent detail.
3. "category" - exactly one of these, the closest fit:
   AI, Semiconductors, Software, Cloud and data centres, Cybersecurity,
   Robotics and automation, Autonomous and EV, Defence tech, Space, Fintech,
   Biotech and health tech, Clean energy and grid, Internet and platforms.
   If an item fits none of them even loosely, drop the item.
4. "effects" - one to three industries it lands on. For each:
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
{"events":[{"headline":"...","summary":"...","category":"Autonomous and EV","effects":[{"industry":"robotaxi operators","direction":"tailwind","consequence":"...","investing":"..."}],"source":"BBC","url":"https://..."}]}

Keep up to 20 events. Order them by category so related ones sit together, the
strongest first within each category. If nothing qualifies at all, return
{"events":[]}.`;

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
      response.status(200).json({ events: [], read: 0, topUp });
      return;
    }

    const publishedByUrl = new Map(items.map((item) => [item.link, item.at]));

    const lines = items
      .map((item, i) => `${i + 1}. [${item.source}] ${item.title}${item.summary ? ` - ${item.summary}` : ""} :: ${item.link}`)
      .join("\n");

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      // A full sweep earns the better model; a 15 minute top-up does not.
      model: topUp ? "claude-haiku-5-5" : "claude-opus-5-5",
      max_tokens: topUp ? 8000 : 16000,
      output_config: { effort: topUp ? "low" : "medium" },
      system: SYSTEM,
      messages: [{ role: "user", content: `Today is ${new Date().toISOString().slice(0, 10)}.\n\n${lines}` }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    let events = [];
    try {
      const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      events = JSON.parse(json).events || [];
    } catch {
      response.status(502).json({ error: "Could not read the model's answer", raw: text.slice(0, 400) });
      return;
    }

    response.status(200).json({
      events: events
        .filter((event) => Array.isArray(event.effects) && event.effects.length)
        .map((event, i) => ({
          id: `ev-${Date.now()}-${i}`,
          date: new Date().toISOString().slice(0, 10),
          text: event.headline || event.text || "",
          summary: event.summary || "",
          publishedAt: new Date(publishedByUrl.get(event.url) || Date.now()).toISOString(),
          category: event.category || "",
          effects: event.effects.slice(0, 3).map((effect) => ({
            industry: effect.industry || "",
            direction: effect.direction || "",
            consequence: effect.consequence || "",
            investing: effect.investing || "",
          })),
          source: event.source || "",
          url: event.url || "",
        })),
      read: items.length,
      topUp,
    });
  } catch (error) {
    response.status(500).json({ error: error?.message || "Something went wrong" });
  }
}
