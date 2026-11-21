import Anthropic from "@anthropic-ai/sdk";
import { FEEDS } from "./feeds.js";

// Pulls a wide set of public feeds, then has Claude keep only the items that
// change the rules, the costs or who supplies whom, rewritten as one factual
// line each. The key never leaves the server.

const MAX_PER_FEED = 12;
const MAX_ITEMS = 320;
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

function recentFirst(items) {
  const cutoff = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
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

const SYSTEM = `You sort raw news into events for an investor's geopolitics file.

An item is an EVENT only if it changes one of three things:
- what is allowed: law, sanction, export control, licence, ruling, treaty
- what something costs: tariff, subsidy, tax, rate, price cap, currency move
- who supplies whom: conflict, route, contract, nationalisation, resource access

Everything else - commentary, polls, personnel gossip, product launches,
sport, crime, weather - is not an event. Most items will not qualify.

An event only counts if you can name a real industry it lands on. If the
industry effect is vague, general ("uncertainty", "sentiment") or you would
have to speculate to state it, drop the item. Most items will not qualify.

For each event you keep, give three things:

1. "headline" - the fact, in one sentence of at most 24 words. What happened
   and who did it. No interpretation, no forecasting, no adjectives of
   significance.
1b. "summary" - two or three sentences, at most 55 words, giving what the item
   actually says: who, what, where, the numbers and dates in it, and what
   happens next if it says so. Use only what is in the item. Never invent
   detail that is not there.
2. "domain" - one of: trade, energy, defence, technology, money, resources.
3. "effects" - one to three industries this lands on, each with the specific
   consequence. Name the industry from ordinary vocabulary (semiconductors,
   shipping, defence primes, utilities, pharmaceuticals, autos, banks, miners,
   airlines, construction, oil and gas, telecoms, insurers, agriculture,
   steel, chemicals, aerospace, grid equipment, data centres, and so on).
   The consequence is one sentence of at most 22 words saying what changes for
   that industry and in which direction: costs, demand, supply, access to a
   market, or who is allowed to sell what. Be concrete about who gains and who
   loses. Never write a consequence that would be true of any news item.

Return JSON only, in this exact shape and nothing else:
{"events":[{"headline":"...","summary":"...","domain":"trade","effects":[{"industry":"semiconductors","consequence":"..."}],"source":"BBC","url":"https://..."}]}

Keep at most 12 events, the most consequential first. If nothing qualifies,
return {"events":[]}.`;

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

    const pulled = (await Promise.all([...FEEDS, ...extra].map(readFeed))).flat();
    const items = dedupe(recentFirst(pulled)).slice(0, MAX_ITEMS);

    if (!items.length) {
      response.status(200).json({ events: [], read: 0 });
      return;
    }

    const publishedByUrl = new Map(items.map((item) => [item.link, item.at]));

    const lines = items
      .map((item, i) => `${i + 1}. [${item.source}] ${item.title}${item.summary ? ` - ${item.summary}` : ""} :: ${item.link}`)
      .join("\n");

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low" },
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
          domain: event.domain || "",
          effects: event.effects.slice(0, 3).map((effect) => ({
            industry: effect.industry || "",
            consequence: effect.consequence || "",
          })),
          source: event.source || "",
          url: event.url || "",
        })),
      read: items.length,
    });
  } catch (error) {
    response.status(500).json({ error: error?.message || "Something went wrong" });
  }
}
