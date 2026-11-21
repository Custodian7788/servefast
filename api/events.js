import Anthropic from "@anthropic-ai/sdk";
import { FEEDS } from "./feeds.js";

// Pulls a wide set of public feeds, then has Claude keep only the items that
// change the rules, the costs or who supplies whom, rewritten as one factual
// line each. The key never leaves the server.

const MAX_PER_FEED = 12;
const MAX_ITEMS = 220;
const WINDOW_HOURS = 36;

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

For each event you keep, write ONE factual sentence of at most 28 words. State
what happened and who did it. No interpretation, no forecasting, no adjectives
of significance. Name a domain from: trade, energy, defence, technology, money,
resources.

Then name the industries it bears on: one to three, from the ordinary
vocabulary of industries (semiconductors, shipping, defence primes, utilities,
pharmaceuticals, autos, banks, miners, airlines, construction, retail, oil and
gas, telecoms, insurers, agriculture, steel, chemicals, aerospace, grid
equipment, data centres). Only industries the event actually touches - if it
touches none, leave the list empty.

Return JSON only, in this exact shape and nothing else:
{"events":[{"text":"...","domain":"trade","industries":["semiconductors"],"source":"BBC","url":"https://..."}]}

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
    const pulled = (await Promise.all(FEEDS.map(readFeed))).flat();
    const items = dedupe(recentFirst(pulled)).slice(0, MAX_ITEMS);

    if (!items.length) {
      response.status(200).json({ events: [], read: 0 });
      return;
    }

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
      events: events.map((event, i) => ({
        id: `ev-${Date.now()}-${i}`,
        date: new Date().toISOString().slice(0, 10),
        text: event.text,
        domain: event.domain || "",
        industries: Array.isArray(event.industries) ? event.industries.slice(0, 3) : [],
        source: event.source || "",
        url: event.url || "",
      })),
      read: items.length,
    });
  } catch (error) {
    response.status(500).json({ error: error?.message || "Something went wrong" });
  }
}
